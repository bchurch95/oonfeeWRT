package api

import (
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// FirmwareProfileInfo defines a supported hardware profile preset.
type FirmwareProfileInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Target      string `json:"target"`
	Profile     string `json:"profile"`
	Description string `json:"description"`
	FlashGuide  string `json:"flash_guide"`
}

// DefaultFirmwareProfiles returns known validated hardware presets.
func DefaultFirmwareProfiles() []FirmwareProfileInfo {
	return []FirmwareProfileInfo{
		{
			ID:          "aerohive_hiveap-330",
			Name:        "Aerohive HiveAP-330",
			Target:      "mpc85xx/p1020",
			Profile:     "aerohive_hiveap-330",
			Description: "PowerPC dual-radio enterprise AP with Gigabit Ethernet",
			FlashGuide:  "Boot into U-Boot via serial/network, configure TFTP server IP, and use 'tftpboot' or sysupgrade to flash the generated sysupgrade image.",
		},
		{
			ID:          "meraki_mr42",
			Name:        "Cisco Meraki MR42",
			Target:      "ipq806x/generic",
			Profile:     "meraki_mr42",
			Description: "Qualcomm IPQ8068 3x3:3 802.11ac Wave 2 Enterprise AP with BLE",
			FlashGuide:  "Requires U-Boot serial console access to flash OpenWrt initramfs/sysupgrade kernel image to dual boot partitions.",
		},
		{
			ID:          "meraki_mr33",
			Name:        "Cisco Meraki MR33",
			Target:      "ipq40xx/generic",
			Profile:     "meraki_mr33",
			Description: "Qualcomm IPQ4029 2x2:2 802.11ac Wave 2 Enterprise AP",
			FlashGuide:  "Boot via U-Boot TFTP recovery or serial console, flash kernel and rootfs sysupgrade images.",
		},
		{
			ID:          "tplink_archer-c6-v2",
			Name:        "TP-Link Archer C6 v2",
			Target:      "ath79/generic",
			Profile:     "tplink_archer-c6-v2",
			Description: "Qualcomm Atheros QCA9563 dual-band router",
			FlashGuide:  "Flash via vendor firmware web upgrade using factory image, or use TFTP recovery at 192.168.0.66.",
		},
		{
			ID:          "linksys_wrt3200acm",
			Name:        "Linksys WRT3200ACM",
			Target:      "mvebu/cortexa9",
			Profile:     "linksys_wrt3200acm",
			Description: "Marvell Armada 385 dual-core gigabit wireless router",
			FlashGuide:  "Flash factory.img from Linksys stock Web UI or sysupgrade.bin from existing OpenWrt / LuCI.",
		},
		{
			ID:          "belkin_rt3200",
			Name:        "Belkin RT3200 / Linksys E8450",
			Target:      "mediatek/mt7622",
			Profile:     "belkin_rt3200",
			Description: "MediaTek MT7622 dual-core Wi-Fi 6 AX3200 router",
			FlashGuide:  "Install openwrt-ubi-installer.bin from vendor firmware, then flash sysupgrade.bin.",
		},
		{
			ID:          "netgear_r7800",
			Name:        "Netgear Nighthawk X4S R7800",
			Target:      "ipq806x/generic",
			Profile:     "netgear_r7800",
			Description: "Qualcomm IPQ8065 dual-core 802.11ac Wave 2 router",
			FlashGuide:  "Flash .img from Netgear Web UI or TFTP recovery mode, or sysupgrade from OpenWrt.",
		},
	}
}

// FirmwareBuildRequest is the payload for triggering an Image Builder job.
type FirmwareBuildRequest struct {
	Target  string `json:"target"`
	Profile string `json:"profile"`
	Threads int    `json:"threads,omitempty"`
}

// FirmwareBuildResponse is a minimal job acknowledgement.
type FirmwareBuildResponse struct {
	JobID   string `json:"job_id"`
	Status  string `json:"status"`
	Threads int    `json:"threads"`
}

// handleFirmwareProfiles returns the list of available hardware presets.
func (s *Server) handleFirmwareProfiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	resp := map[string]any{
		"profiles": DefaultFirmwareProfiles(),
		"num_cpu":  runtime.NumCPU(),
		"version":  "23.05.5",
	}
	writeJSON(w, http.StatusOK, resp)
}

// handleFirmwareBuild triggers a multi-threaded OpenWrt Image Builder build.
func (s *Server) handleFirmwareBuild(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req FirmwareBuildRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Target == "" {
		req.Target = "mpc85xx/p1020"
	}
	if req.Profile == "" {
		req.Profile = "aerohive_hiveap-330"
	}
	threads := req.Threads
	if threads <= 0 {
		threads = runtime.NumCPU()
	}

	job := newFirmwareJob(req.Target, req.Profile, threads)
	resp := FirmwareBuildResponse{
		JobID:   job.ID,
		Status:  job.Status,
		Threads: job.Threads,
	}
	go runFirmwareBuild(job)

	writeJSON(w, http.StatusOK, resp)
}

// handleFirmwareJob returns job status and logs for polling.
func (s *Server) handleFirmwareJob(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeErr(w, http.StatusBadRequest, "missing job id")
		return
	}
	job, ok := getJobSnapshot(id)
	if !ok {
		writeErr(w, http.StatusNotFound, "job not found")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

// handleFirmwareDownload streams a generated artifact file.
func (s *Server) handleFirmwareDownload(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	fileName := r.URL.Query().Get("file")
	if id == "" || fileName == "" {
		writeErr(w, http.StatusBadRequest, "missing id or file parameter")
		return
	}

	job, ok := getJobSnapshot(id)
	if !ok {
		writeErr(w, http.StatusNotFound, "job not found")
		return
	}

	// Security: ensure fileName is just a base filename without directory traversal
	cleanName := filepath.Base(fileName)
	if cleanName != fileName || strings.Contains(fileName, "..") {
		writeErr(w, http.StatusBadRequest, "invalid file name")
		return
	}

	// Check if file is in job's artifact directory
	filePath := filepath.Join(job.ArtifactDir, cleanName)
	info, err := os.Stat(filePath)
	if err != nil || info.IsDir() {
		writeErr(w, http.StatusNotFound, "artifact not found")
		return
	}

	w.Header().Set("Content-Disposition", "attachment; filename=\""+cleanName+"\"")
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeFile(w, r, filePath)
}
