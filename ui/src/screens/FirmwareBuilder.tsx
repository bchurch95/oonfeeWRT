import { useState } from "react";
import { Card, Button } from "../components/ui";

export default function FirmwareBuilder() {
  const [building, setBuilding] = useState(false);
  const [log, setLog] = useState<string>("");

  const startBuild = async () => {
    setBuilding(true);
    setLog("Starting OpenWrt Image Builder...\n");
    // Placeholder – in production this would call a backend job API
    setTimeout(() => {
      setLog((l) => l + "Downloaded Image Builder\nmake image completed\nArtifacts ready for download");
      setBuilding(false);
    }, 2000);
  };

  const flash = () => {
    alert("Flashing requires direct device access. Use the Image Builder artifacts and flash via web UI or serial.");
  };

  return (
    <Card title="OpenWrt Pre-deployment Builder">
      <p>
        Build lab firmware with the packages oonfeeWRT expects: rpcd, rpcd-mod-file, rpcd-mod-iwinfo, rpcd-mod-luci, uhttpd, uhttpd-mod-ubus, lldpd, nlbwmon.
      </p>
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
