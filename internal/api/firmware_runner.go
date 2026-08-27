package api

import (
	"context"
	"encoding/json"
	"fmt"
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

	// Example command – replace with your actual build wrapper
	cmd := exec.CommandContext(ctx, "bash", "-c",
		"cd deploy/openwrt-imagebuilder && ./build.sh openwrt-imagebuilder-25.05-ramips-mt7621.Linux-x86_64.tar.bz2 Linksys_WRT3200ACM")

	// Capture output
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
}
