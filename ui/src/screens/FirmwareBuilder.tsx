import { useState, useEffect, useRef } from "react";
import { Card, Button, Banner } from "../components/ui";

interface ProfilePreset {
  id: string;
  name: string;
  target: string;
  profile: string;
  description: string;
  flash_guide: string;
}

interface BuildJob {
  job_id: string;
  target: string;
  profile: string;
  threads: number;
  status: "queued" | "running" | "done" | "error";
  log: string[];
  artifacts?: string[];
  created_at: string;
  updated_at: string;
}

const FALLBACK_PROFILES: ProfilePreset[] = [
  {
    id: "aerohive_hiveap-330",
    name: "Aerohive HiveAP-330",
    target: "mpc85xx/p1020",
    profile: "aerohive_hiveap-330",
    description: "PowerPC dual-radio enterprise AP with Gigabit Ethernet",
    flash_guide: "1. Connect serial console (9600 8N1).\n2. Interrupt U-Boot.\n3. Set IP: setenv ipaddr 192.168.1.1; setenv serverip 192.168.1.100\n4. TFTP flash sysupgrade image: tftpboot 0x1000000 <image.bin>; bootm 0x1000000 or sysupgrade from OpenWrt.",
  },
  {
    id: "meraki_mr42",
    name: "Cisco Meraki MR42",
    target: "ipq806x/generic",
    profile: "meraki_mr42",
    description: "Qualcomm IPQ8068 3x3:3 802.11ac Wave 2 Enterprise AP with BLE",
    flash_guide: "1. Access UART serial console (115200 8N1).\n2. Interrupt bootloader.\n3. Load OpenWrt kernel/sysupgrade image into boot partition.\n4. Use sysupgrade -n from OpenWrt recovery or flash via tftp.",
  },
  {
    id: "meraki_mr33",
    name: "Cisco Meraki MR33",
    target: "ipq40xx/generic",
    profile: "meraki_mr33",
    description: "Qualcomm IPQ4029 2x2:2 802.11ac Wave 2 Enterprise AP",
    flash_guide: "1. Connect UART serial console.\n2. Boot initramfs recovery image via TFTP.\n3. Flash sysupgrade image via sysupgrade /tmp/image.bin.",
  },
  {
    id: "tplink_archer-c6-v2",
    name: "TP-Link Archer C6 v2",
    target: "ath79/generic",
    profile: "tplink_archer-c6-v2",
    description: "Qualcomm Atheros QCA9563 dual-band router",
    flash_guide: "1. Rename factory image to ArcherC6v2_tp_recovery.bin\n2. Set TFTP server IP to 192.168.0.66\n3. Power on router with reset button held for 5s to trigger TFTP recovery.",
  },
  {
    id: "linksys_wrt3200acm",
    name: "Linksys WRT3200ACM",
    target: "mvebu/cortexa9",
    profile: "linksys_wrt3200acm",
    description: "Marvell Armada 385 dual-core gigabit wireless router",
    flash_guide: "Flash factory.img via stock Linksys Web UI under Connectivity -> Manual Firmware Update, or sysupgrade.bin from OpenWrt.",
  },
  {
    id: "belkin_rt3200",
    name: "Belkin RT3200 / Linksys E8450",
    target: "mediatek/mt7622",
    profile: "belkin_rt3200",
    description: "MediaTek MT7622 dual-core Wi-Fi 6 AX3200 router",
    flash_guide: "1. Flash openwrt-ubi-installer.bin from vendor firmware UI.\n2. Reboot into OpenWrt initramfs.\n3. Flash sysupgrade.bin.",
  },
  {
    id: "netgear_r7800",
    name: "Netgear Nighthawk X4S R7800",
    target: "ipq806x/generic",
    profile: "netgear_r7800",
    description: "Qualcomm IPQ8065 dual-core 802.11ac Wave 2 router",
    flash_guide: "Flash .img from Netgear Web UI or TFTP recovery mode (hold reset until power LED flashes orange), or sysupgrade from OpenWrt.",
  },
];

export default function FirmwareBuilder() {
  const [profiles, setProfiles] = useState<ProfilePreset[]>(FALLBACK_PROFILES);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("aerohive_hiveap-330");
  const [target, setTarget] = useState("mpc85xx/p1020");
  const [profile, setProfile] = useState("aerohive_hiveap-330");
  const [threads, setThreads] = useState<number>(20);
  const [numCPU, setNumCPU] = useState<number>(20);
  const [building, setBuilding] = useState(false);
  const [job, setJob] = useState<BuildJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showFlashGuide, setShowFlashGuide] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Load profiles on mount
  useEffect(() => {
    fetch("/api/v1/firmware/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.profiles && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
          if (data.num_cpu) {
            setNumCPU(data.num_cpu);
            setThreads(data.num_cpu);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Sync target/profile on preset change
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === "custom") return;
    const found = profiles.find((p) => p.id === presetId);
    if (found) {
      setTarget(found.target);
      setProfile(found.profile);
    }
  };

  const selectedPreset = profiles.find((p) => p.id === selectedPresetId);

  // Poll job status
  const startPolling = (jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/firmware/jobs?id=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data: BuildJob = await res.json();
        setJob(data);
        if (data.status === "done" || data.status === "error") {
          setBuilding(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [job?.log]);

  const handleStartBuild = async () => {
    setErrorMsg("");
    setBuilding(true);
    setJob({
      job_id: "initiating...",
      target,
      profile,
      threads,
      status: "queued",
      log: ["Initiating multi-threaded build job..."],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      const res = await fetch("/api/v1/firmware/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, profile, threads }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Build request failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      startPolling(data.job_id);
    } catch (e: any) {
      setErrorMsg(e?.message || String(e));
      setBuilding(false);
    }
  };

  const statusBadgeColor = () => {
    switch (job?.status) {
      case "running":
        return "#3b82f6";
      case "done":
        return "#10b981";
      case "error":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="OpenWrt Pre-deployment Firmware Builder">
        <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: 13 }}>
          Build production and lab OpenWrt images with pre-configured telemetry, ubus, and discovery packages
          (<code>rpcd</code>, <code>rpcd-mod-iwinfo</code>, <code>uhttpd-mod-ubus</code>, <code>lldpd</code>, <code>nlbwmon</code>, <code>vnstat2</code>).
        </p>

        {errorMsg && (
          <div style={{ marginBottom: 14 }}>
            <Banner tone="critical">{errorMsg}</Banner>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 16 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Hardware Device Preset
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetSelect(e.target.value)}
              disabled={building}
              style={{
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-0)",
                color: "var(--text-primary)",
              }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.target})
                </option>
              ))}
              <option value="custom">-- Custom Target / Profile --</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
            OpenWrt Target Path
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={building || selectedPresetId !== "custom"}
              placeholder="e.g. mpc85xx/p1020"
              style={{
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-0)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Profile Name
            <input
              type="text"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              disabled={building || selectedPresetId !== "custom"}
              placeholder="e.g. aerohive_hiveap-330"
              style={{
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-0)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Parallel Build Threads ({threads} of {numCPU} CPU cores)
            <input
              type="number"
              min={1}
              max={numCPU * 2 || 32}
              value={threads}
              onChange={(e) => setThreads(Math.max(1, Number(e.target.value)))}
              disabled={building}
              style={{
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-0)",
                color: "var(--text-primary)",
              }}
            />
          </label>
        </div>

        {selectedPreset && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
            <strong>Device Details:</strong> {selectedPreset.description}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button onClick={handleStartBuild} disabled={building}>
            {building ? "Building Image in Parallel…" : "Build Firmware Image"}
          </Button>

          <Button kind="default" onClick={() => setShowFlashGuide(!showFlashGuide)}>
            {showFlashGuide ? "Hide Flash Guide" : "Hardware Flash Guide"}
          </Button>

          {job && (
            <span
              style={{
                marginLeft: "auto",
                padding: "3px 8px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                background: statusBadgeColor(),
                textTransform: "uppercase",
              }}
            >
              {job.status} {job.threads ? `(${job.threads} threads)` : ""}
            </span>
          )}
        </div>

        {showFlashGuide && selectedPreset && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--surface-0)",
              fontSize: 12,
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>
              Flashing Instructions for {selectedPreset.name}:
            </strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {selectedPreset.flash_guide}
            </pre>
          </div>
        )}
      </Card>

      {job && (
        <Card title={`Build Console Output – ${job.profile} (${job.job_id})`}>
          <div
            style={{
              background: "#0d1117",
              color: "#58a6ff",
              fontFamily: "monospace",
              fontSize: 12,
              padding: 12,
              borderRadius: 6,
              maxHeight: 380,
              overflowY: "auto",
              border: "1px solid #30363d",
            }}
          >
            {job.log && job.log.map((line, idx) => (
              <div key={idx} style={{ lineHeight: 1.4, color: line.includes("failed") || line.includes("Error") ? "#f85149" : line.includes("successfully") ? "#3fb950" : "#c9d1d9" }}>
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {job.artifacts && job.artifacts.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                Generated Artifacts (Ready for Download):
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {job.artifacts.map((file) => (
                  <a
                    key={file}
                    href={`/api/v1/firmware/download?id=${encodeURIComponent(job.job_id)}&file=${encodeURIComponent(file)}`}
                    download={file}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 4,
                      background: file.endsWith(".bin") || file.endsWith(".img") ? "#238636" : "var(--surface-2)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    ⬇ {file}
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
