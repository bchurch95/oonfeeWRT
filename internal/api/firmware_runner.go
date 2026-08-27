package api

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"
)

type firmwareJob struct {
	ID        string    `json:"job_id"`
	Target    string    `json:"target"`
	Profile   string    `json:"profile"`
	Status    string    `json:"status"` // queued, running, done, error
	Log       []string  `json:"log"`
	Artifacts []string  `json:"artifacts"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	fwMu   sync.Mutex
	fwJobs = make(map[string]*firmwareJob)
)

func newFirmwareJob(target, profile string) *firmwareJob {
	id := fmt.Sprintf("fw-%d", time.Now().UnixNano())
	job := &firmwareJob{
		ID:        id,
		Target:    target,
		Profile:   profile,
		Status:    "queued",
		Log:       []string{fmt.Sprintf("Job %s queued for %s/%s", id, target, profile)},
		CreatedAt: time.Now(),
	}
	fwMu.Lock()
	fwJobs[id] = job
	fwMu.Unlock()
	return job
}

// runFirmwareBuild executes the Image Builder build script asynchronously.
// It is a template – adapt paths and environment to your server.
func runFirmwareBuild(ctx context.Context, job *firmwareJob) {
	job.Status = "running"
	job.Log = append(job.Log, "Starting Image Builder...")

	// Paths – adapt to your server layout
	baseDir := "deploy/openwrt-imagebuilder"
	version := "25.05"
	target := job.Target
	profile := job.Profile

	// Build directory
	buildDir := fmt.Sprintf("%s/openwrt-imagebuilder-%s-%s.Linux-x86_64", baseDir, version, target)
	tarball := fmt.Sprintf("%s/openwrt-imagebuilder-%s-%s.Linux-x86_64.tar.bz2", baseDir, version, target)

	// Ensure Image Builder is present
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		job.Log = append(job.Log, fmt.Sprintf("Downloading Image Builder for %s...", target))
		downloadURL := fmt.Sprintf("https://downloads.openwrt.org/releases/%s/targets/%s/openwrt-imagebuilder-%s-%s.Linux-x86_64.tar.bz2", version, target, version, target)
		cmd := exec.CommandContext(ctx, "bash", "-c", fmt.Sprintf("cd %s && wget -q %s -O %s && tar xf %s", baseDir, downloadURL, tarball, tarball))
		if out, err := cmd.CombinedOutput(); err != nil {
			job.Status = "error"
			job.Log = append(job.Log, fmt.Sprintf("Download failed: %v", err))
			job.Log = append(job.Log, string(out))
			return
		}
	}

	packages := "rpcd rpcd-mod-file rpcd-mod-iwinfo rpcd-mod-luci uhttpd uhttpd-mod-ubus lldpd nlbwmon vnstat2 dropbear"
	cmd := exec.CommandContext(ctx, "bash", "-c",
		fmt.Sprintf("cd %s && make image PROFILE=%s PACKAGES=\"%s\" FILES=\"../files\" CONFIG_FILE=\"../openwrt.config\"", buildDir, profile, packages))

	out, err := cmd.CombinedOutput()
	if err != nil {
		job.Status = "error"
		job.Log = append(job.Log, fmt.Sprintf("Build failed: %v", err))
		job.Log = append(job.Log, string(out))
		return
	}
	job.Status = "done"
	job.Log = append(job.Log, "Build completed successfully")
	job.Log = append(job.Log, string(out))

	// Collect artifacts
	artifactDir := fmt.Sprintf("%s/bin/targets/%s", buildDir, target)
	entries, _ := os.ReadDir(artifactDir)
	for _, e := range entries {
		if !e.IsDir() {
			job.Artifacts = append(job.Artifacts, e.Name())
		}
	}
}
