package api

import (
	"net/http"
)

// FirmwareBuildRequest is the payload for triggering an Image Builder job.
type FirmwareBuildRequest struct {
	Target  string `json:"target"`
	Profile string `json:"profile"`
}

// FirmwareBuildResponse is a minimal job acknowledgement.
type FirmwareBuildResponse struct {
	JobID string `json:"job_id"`
	Status string `json:"status"`
}

// handleFirmwareBuild is a placeholder for the pre-deployment Image Builder API.
// In production this would enqueue a build job on the host server and stream logs.
func (s *Server) handleFirmwareBuild(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// TODO: parse request, validate target/profile, enqueue build job
	// For now return a stub response so the UI can call the endpoint without 404.
	resp := FirmwareBuildResponse{
		JobID:  "demo-job-001",
		Status: "queued",
	}
	w.Header().Set("Content-Type", "application/json")
	// Simple JSON response
	_, _ = w.Write([]byte(`{"job_id":"demo-job-001","status":"queued"}`))
}
