package api

import (
	"context"
	"fmt"
	"io"
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

func getJobSnapshot(id string) (firmwareJob, bool) {
	fwMu.Lock()
	defer fwMu.Unlock()
	job, ok := fwJobs[id]
	if !ok {
		return firmwareJob{}, false
	}
	cp := *job
	cp.Log = append([]string(nil), job.Log...)
	cp.Artifacts = append([]string(nil), job.Artifacts...)
	return cp, true
}

// locateImageBuilderBase returns the absolute path to deploy/openwrt-imagebuilder
func locateImageBuilderBase() string {
	if env := os.Getenv("OONFEEWRT_IMAGEBUILDER_DIR"); env != "" {
		if abs, err := filepath.Abs(env); err == nil {
			return abs
		}
		return env
	}

	candidates := []string{
		"deploy/openwrt-imagebuilder",
		"../deploy/openwrt-imagebuilder",
		"../../deploy/openwrt-imagebuilder",
		"../../../deploy/openwrt-imagebuilder",
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

	// Search upwards from current working directory
	if cwd, err := os.Getwd(); err == nil {
		dir := cwd
		for i := 0; i < 6; i++ {
			target := filepath.Join(dir, "deploy", "openwrt-imagebuilder")
			if info, err := os.Stat(target); err == nil && info.IsDir() {
				return target
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}

	fallback := filepath.Join(os.TempDir(), "oonfeewrt-imagebuilder")
	_ = os.MkdirAll(fallback, 0755)
	return fallback
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
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			cmd.Env = append(os.Environ(), fmt.Sprintf("PATH=%s/.local/bin:/usr/local/bin:/usr/bin:/bin:%s", home, os.Getenv("PATH")))
		} else {
			cmd.Env = append(os.Environ(), "PATH=/usr/local/bin:/usr/bin:/bin:"+os.Getenv("PATH"))
		}
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
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		cmd.Env = append(os.Environ(), fmt.Sprintf("PATH=%s/.local/bin:/usr/local/bin:/usr/bin:/bin:%s", home, os.Getenv("PATH")))
	} else {
		cmd.Env = append(os.Environ(), "PATH=/usr/local/bin:/usr/bin:/bin:"+os.Getenv("PATH"))
	}

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

	// Locate generated artifacts and preserve them per model
	artifactDir := filepath.Join(buildDir, "bin", "targets", targetSubpath)
	if _, err := os.Stat(artifactDir); err == nil {
		persistDir := filepath.Join(baseDir, "artifacts", filepath.Base(job.Profile))
		// Clean and replace existing artifacts for this specific model
		_ = os.RemoveAll(persistDir)
		_ = os.MkdirAll(persistDir, 0755)

		var artifacts []string
		entries, _ := os.ReadDir(artifactDir)
		for _, e := range entries {
			if !e.IsDir() {
				srcFile := filepath.Join(artifactDir, e.Name())
				// Preserve profile-specific images and common companion files
				if strings.Contains(e.Name(), job.Profile) || e.Name() == "sha256sums" || e.Name() == "profiles.json" || strings.HasSuffix(e.Name(), ".manifest") {
					dstFile := filepath.Join(persistDir, e.Name())
					if err := copyFirmwareFile(srcFile, dstFile); err == nil {
						artifacts = append(artifacts, e.Name())
					}
				}
			}
		}

		fwMu.Lock()
		job.ArtifactDir = persistDir
		job.Artifacts = artifacts
		job.UpdatedAt = time.Now()
		fwMu.Unlock()
		appendJobLog(job, fmt.Sprintf("Preserved %d compiled image artifact(s) for model '%s' in %s", len(artifacts), job.Profile, persistDir))
	}

	setJobStatus(job, "done")
}

func copyFirmwareFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}
