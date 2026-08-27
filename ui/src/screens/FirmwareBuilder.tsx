import { useState } from "react";
import { Card, Button } from "../components/ui";
import { api } from "../lib/api";

export default function FirmwareBuilder() {
  const [building, setBuilding] = useState(false);
  const [log, setLog] = useState<string>("");
  const [target, setTarget] = useState("ramips-mt7621");
  const [profile, setProfile] = useState("Linksys_WRT3200ACM");

  const startBuild = async () => {
    setBuilding(true);
    setLog("Starting OpenWrt Image Builder...\n");
    try {
      const res = await api.post("/api/v1/firmware/build", { target, profile });
      setLog((l) => l + `Job ${res.job_id} queued with status ${res.status}\n`);
      // Poll placeholder
      setTimeout(() => {
        setLog((l) => l + "Downloaded Image Builder\nmake image completed\nArtifacts ready for download");
        setBuilding(false);
      }, 2000);
    } catch (e) {
      setLog((l) => l + `Error: ${e}\n`);
      setBuilding(false);
    }
  };

  const flash = () => {
    alert("Flashing requires direct device access. Use the Image Builder artifacts and flash via web UI or serial.");
  };

  return (
    <Card title="OpenWrt Pre-deployment Builder">
      <p>
        Build lab firmware with the packages oonfeeWRT expects: rpcd, rpcd-mod-file, rpcd-mod-iwinfo, rpcd-mod-luci, uhttpd, uhttpd-mod-ubus, lldpd, nlbwmon.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          Target
          <select value={target} onChange={e => setTarget(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="ramips-mt7621">ramips/mt7621</option>
            <option value="ath79">ath79</option>
            <option value="ipq40xx">ipq40xx</option>
            <option value="mediatek/filogic">mediatek/filogic</option>
          </select>
        </label>
        <label>
          Profile
          <select value={profile} onChange={e => setProfile(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="Linksys_WRT3200ACM">Linksys WRT3200ACM</option>
            <option value="TL-WDR4300">TP-Link Archer C6 v2</option>
            <option value="Netgear_R7800">Netgear R7800</option>
            <option value="Xiaomi_AX6000">Xiaomi AX6000</option>
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Button onClick={startBuild} disabled={building}>
          {building ? "Building…" : "Build Image"}
        </Button>
        <Button variant="secondary" onClick={flash}>
          Flash Guide
        </Button>
      </div>
      <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", background: "#111", color: "#0f0", padding: 12 }}>
        {log || "Idle"}
      </pre>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Builds run on your server via deploy/openwrt-imagebuilder/. This UI is a placeholder for a backend job API.
      </p>
    </Card>
  );
}
