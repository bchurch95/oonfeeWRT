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
	var req FirmwareBuildRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Target == "" {
		req.Target = "ramips-mt7621"
	}
	if req.Profile == "" {
		req.Profile = "Linksys_WRT3200ACM"
	}
	job := newFirmwareJob(req.Target, req.Profile)
	go runFirmwareBuild(r.Context(), job)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(FirmwareBuildResponse{
		JobID:  job.ID,
		Status: job.Status,
	})
}
