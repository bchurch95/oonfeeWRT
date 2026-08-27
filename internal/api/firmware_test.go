package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestFirmwareProfilesEndpoint(t *testing.T) {
	srv := &Server{}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/firmware/profiles", nil)
	w := httptest.NewRecorder()

	srv.handleFirmwareProfiles(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", w.Code, http.StatusOK, w.Body.String())
	}

	var resp struct {
		Profiles []FirmwareProfileInfo `json:"profiles"`
		NumCPU   int                   `json:"num_cpu"`
		Version  string                `json:"version"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.Profiles) == 0 {
		t.Fatal("expected profiles list to be populated")
	}
	if resp.NumCPU <= 0 {
		t.Fatalf("expected num_cpu > 0, got %d", resp.NumCPU)
	}

	// Verify Aerohive AP330 and Meraki MR42 are present
	foundAerohive, foundMeraki := false, false
	for _, p := range resp.Profiles {
		if p.ID == "aerohive_hiveap-330" {
			foundAerohive = true
		}
		if p.ID == "meraki_mr42" {
			foundMeraki = true
		}
	}
	if !foundAerohive {
		t.Error("missing aerohive_hiveap-330 preset")
	}
	if !foundMeraki {
		t.Error("missing meraki_mr42 preset")
	}
}

func TestFirmwareBuildAndJobLifecycle(t *testing.T) {
	srv := &Server{}

	body, _ := json.Marshal(FirmwareBuildRequest{
		Target:  "mpc85xx/p1020",
		Profile: "aerohive_hiveap-330",
		Threads: 4,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/firmware/build", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	srv.handleFirmwareBuild(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("build status=%d want=%d body=%s", w.Code, http.StatusOK, w.Body.String())
	}

	var buildResp FirmwareBuildResponse
	if err := json.Unmarshal(w.Body.Bytes(), &buildResp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if buildResp.JobID == "" {
		t.Fatal("expected non-empty job ID")
	}
	if buildResp.Threads != 4 {
		t.Fatalf("expected 4 threads, got %d", buildResp.Threads)
	}

	// Poll job
	pollReq := httptest.NewRequest(http.MethodGet, "/api/v1/firmware/jobs?id="+buildResp.JobID, nil)
	pollW := httptest.NewRecorder()
	srv.handleFirmwareJob(pollW, pollReq)
	if pollW.Code != http.StatusOK {
		t.Fatalf("poll status=%d want=%d body=%s", pollW.Code, http.StatusOK, pollW.Body.String())
	}
}

func TestFirmwareDownloadArtifacts(t *testing.T) {
	srv := &Server{}
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "openwrt-test.bin")
	_ = os.WriteFile(testFile, []byte("firmware-image-content"), 0600)

	job := &firmwareJob{
		ID:          "fw-test-download",
		ArtifactDir: tmpDir,
		Artifacts:   []string{"openwrt-test.bin"},
	}
	fwMu.Lock()
	fwJobs[job.ID] = job
	fwMu.Unlock()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/firmware/download?id="+job.ID+"&file=openwrt-test.bin", nil)
	w := httptest.NewRecorder()
	srv.handleFirmwareDownload(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("download status=%d want=%d body=%s", w.Code, http.StatusOK, w.Body.String())
	}
	if w.Body.String() != "firmware-image-content" {
		t.Fatalf("unexpected content: %q", w.Body.String())
	}
}
