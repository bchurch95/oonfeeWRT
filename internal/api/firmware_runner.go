package api

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type firmwareJob struct {
	ID          string    `json:"job_id"`
	Target      string    `json:"target"`
	Profile     string    `json:"profile"`
	Threads     int       `json:"threads"`
	Status      string    `json:"status"` // queued, running, done, error
	Log         []string  `json:"log"`
	Artifacts   []string  `json:"artifacts"`
	ArtifactDir string    `json:"artifact_dir,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

var (
	fwMu   sync.Mutex
	fwJobs = make(map[string]*firmwareJob)
)

func newFirmwareJob(target, profile string, threads int) *firmwareJob {
	id := fmt.Sprintf("fw-%d", time.Now().UnixNano())
	job := &firmwareJob{
		ID:        id,
		Target:    target,
		Profile:   profile,
		Threads:   threads,
		Status:    "queued",
		Log:       []string{fmt.Sprintf("Job %s queued for target=%s profile=%s (parallel threads=%d)", id, target, profile, threads)},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	fwMu.Lock()
	fwJobs[id] = job
	fwMu.Unlock()
	return job
}

func appendJobLog(job *firmwareJob, lines ...string) {
	fwMu.Lock()
	defer fwMu.Unlock()
	for _, l := range lines {
		l = strings.TrimRight(l, "\r\n")
		if l != "" {
			job.Log = append(job.Log, l)
		}
	}
	job.UpdatedAt = time.Now()
}

func setJobStatus(job *firmwareJob, status string) {
	fwMu.Lock()
	defer fwMu.Unlock()
	job.Status = status
	job.UpdatedAt = time.Now()
}

// locateImageBuilderBase returns the absolute path to deploy/openwrt-imagebuilder
func locateImageBuilderBase() string {
	candidates := []string{
		"/home/ben/oonfeeWRT/deploy/openwrt-imagebuilder",
		"deploy/openwrt-imagebuilder",
		"../deploy/openwrt-imagebuilder",
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			abs, err := filepath.Abs(c)
			if err == nil {
				return abs
			}
			return c
		}
	}
	return "/home/ben/oonfeeWRT/deploy/openwrt-imagebuilder"
}

// runFirmwareBuild executes the multi-threaded OpenWrt Image Builder build asynchronously.
func runFirmwareBuild(job *firmwareJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Minute)
	defer cancel()

	setJobStatus(job, "running")
	appendJobLog(job, fmt.Sprintf("Starting multi-threaded OpenWrt Image Builder (using %d CPU threads)...", job.Threads))

	baseDir := locateImageBuilderBase()
	version := "23.05.5"

	// Parse target and subtarget
	rawTarget := strings.TrimSpace(job.Target)
	var targetSubpath, targetDirName string
	if strings.Contains(rawTarget, "/") {
		parts := strings.SplitN(rawTarget, "/", 2)
		targetSubpath = fmt.Sprintf("%s/%s", parts[0], parts[1])
		targetDirName = fmt.Sprintf("%s-%s", parts[0], parts[1])
	} else if strings.Contains(rawTarget, "-") {
		parts := strings.SplitN(rawTarget, "-", 2)
		targetSubpath = fmt.Sprintf("%s/%s", parts[0], parts[1])
		targetDirName = fmt.Sprintf("%s-%s", parts[0], parts[1])
	} else {
		targetSubpath = fmt.Sprintf("%s/generic", rawTarget)
		targetDirName = fmt.Sprintf("%s-generic", rawTarget)
	}

	buildDir := filepath.Join(baseDir, fmt.Sprintf("openwrt-imagebuilder-%s-%s.Linux-x86_64", version, targetDirName))
	tarball := filepath.Join(baseDir, fmt.Sprintf("openwrt-imagebuilder-%s-%s.Linux-x86_64.tar.xz", version, targetDirName))

	// Ensure Image Builder is downloaded and extracted
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		downloadURL := fmt.Sprintf("https://downloads.openwrt.org/releases/%s/targets/%s/openwrt-imagebuilder-%s-%s.Linux-x86_64.tar.xz",
			version, targetSubpath, version, targetDirName)
		appendJobLog(job, fmt.Sprintf("Downloading OpenWrt Image Builder from %s...", downloadURL))

		dlCmd := fmt.Sprintf("wget -c -q '%s' -O '%s' && tar -xf '%s' -C '%s'",
			downloadURL, tarball, tarball, baseDir)
		cmd := exec.CommandContext(ctx, "bash", "-c", dlCmd)
		cmd.Env = append(os.Environ(), "PATH=/home/ben/.local/bin:/usr/local/bin:/usr/bin:/bin:"+os.Getenv("PATH"))
		if out, err := cmd.CombinedOutput(); err != nil {
			setJobStatus(job, "error")
			appendJobLog(job, fmt.Sprintf("Failed to download or extract Image Builder: %v", err), string(out))
			return
		}
		appendJobLog(job, "Image Builder archive extracted successfully.")
	}

	filesDir := filepath.Join(baseDir, "files")
	configFile := filepath.Join(baseDir, "openwrt.config")
	packages := "rpcd rpcd-mod-file rpcd-mod-iwinfo rpcd-mod-luci uhttpd uhttpd-mod-ubus lldpd nlbwmon vnstat2 dropbear"

	appendJobLog(job, fmt.Sprintf("Building firmware image for profile '%s' with %d parallel threads...", job.Profile, job.Threads))

	makeCmdStr := fmt.Sprintf(
		"cd '%s' && make -j%d image PROFILE='%s' PACKAGES='%s' FILES='%s' CONFIG_FILE='%s' FORCE=1",
		buildDir, job.Threads, job.Profile, packages, filesDir, configFile,
	)

	cmd := exec.CommandContext(ctx, "bash", "-c", makeCmdStr)
	cmd.Env = append(os.Environ(), "PATH=/home/ben/.local/bin:/usr/local/bin:/usr/bin:/bin:"+os.Getenv("PATH"))

	out, err := cmd.CombinedOutput()
	if err != nil {
		setJobStatus(job, "error")
		appendJobLog(job, fmt.Sprintf("Build failed with error: %v", err))
		appendJobLog(job, string(out))
		return
	}

	appendJobLog(job, "Build completed successfully!")
	outLines := strings.Split(string(out), "\n")
	// Append summary lines of the make output
	if len(outLines) > 30 {
		appendJobLog(job, outLines[len(outLines)-30:]...)
	} else {
		appendJobLog(job, outLines...)
	}

	// Locate generated artifacts
	artifactDir := filepath.Join(buildDir, "bin", "targets", targetSubpath)
	if _, err := os.Stat(artifactDir); err == nil {
		fwMu.Lock()
		job.ArtifactDir = artifactDir
		entries, _ := os.ReadDir(artifactDir)
		for _, e := range entries {
			if !e.IsDir() {
				job.Artifacts = append(job.Artifacts, e.Name())
			}
		}
		fwMu.Unlock()
		appendJobLog(job, fmt.Sprintf("Found %d artifact(s) in %s", len(job.Artifacts), artifactDir))
	}

	setJobStatus(job, "done")
}
