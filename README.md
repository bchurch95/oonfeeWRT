# oonfeeWRT

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/logo-dark.svg" />
  <img src="docs/public/logo-light.svg" alt="oonfeeWRT orbit mark" width="64" height="64" />
</picture>

Self-hosted, UniFi-inspired management for stock OpenWrt.

[![Release][release-badge]][release-url]
[![CI][ci-badge]][ci-url]
[![License][license-badge]][license-url]
[![Documentation][docs-badge]][docs-url]
[![Go Version][go-badge]][go-version]
[![Node Version][node-badge]][node-version]

[release-badge]: https://img.shields.io/github/v/release/aiden0rchad/oonfeeWRT?style=flat&label=Release
[ci-badge]: https://img.shields.io/github/actions/workflow/status/aiden0rchad/oonfeeWRT/ci.yml?style=flat&label=CI
[license-badge]: https://img.shields.io/github/license/aiden0rchad/oonfeeWRT?style=flat&label=License
[docs-badge]: https://img.shields.io/badge/docs-docs%20site-2a78d6?style=flat&label=Documentation
[go-badge]: https://img.shields.io/badge/Go-1.26.6-00ADD8?style=flat&logo=go
[node-badge]: https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=nodedotjs

**[Explore the complete documentation →][docs-url]**
Capabilities, guided setup, safe configuration, operations, security,
troubleshooting, and engineering reference—with full-text search and light/dark
themes.

---

<div align="center">
  <img src="docs/public/screenshots/dashboard-overview-dark.jpg" alt="oonfeeWRT Dashboard" width="800" />
  <p><em>Fleet health, Internet observations, and topology with dedicated workspaces in the sidebar</em></p>
</div>

---

oonfeeWRT is a controller, not firmware. It runs on your server, NAS, mini-PC,
or Mac and manages OpenWrt devices through their existing interfaces. Your
routers stay on stock OpenWrt and continue to work with LuCI.

**Docker is optional.** Run the standalone binary directly on a supported
64-bit Linux or macOS host, or use the container/Compose setup. The controller
does not need a dedicated machine and is not installed on the managed routers.

---

## 🌟 What it provides

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>📊 Dashboard</strong><br/>Fleet health, WAN reachability, topology</td>
      <td align="center"><strong>📈 Statistics</strong><br/>WAN, system, interface, radio rollups</td>
      <td align="center"><strong>🛡️ Configuration</strong><br/>Preview & Apply with rollback protection</td>
      <td align="center"><strong>🔐 Security</strong><br/>Role-based accounts, encrypted backups</td>
    </tr>
    <tr>
      <td align="center"><strong>📱 Devices</strong><br/>Adoption, health monitoring, telemetry</td>
      <td align="center"><strong>📡 Radios</strong><br/>Channel planning, RF tools, inventory</td>
      <td align="center"><strong>👥 Clients</strong><br/>Inventory, observability, policies</td>
      <td align="center"><strong>📜 Audit</strong><br/>Logs, diagnostics, backup & restore</td>
    </tr>
  </table>
</div>

---

## 🛠️ Installation

oonfeeWRT supports two equivalent ways to run the controller:

| Method | Supported hosts | Notes |
|--------|----------------|-------|
| 🚀 **Standalone binary** | `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64` | No Docker required; UI embedded in binary |
| 🐳 **Container/Compose** | `linux/amd64`, `linux/arm64` | NAS, mini-PC, SBC, Docker Desktop |

### Requirements

A controller host must be able to reach each router's management address over
SSH plus the selected HTTP or HTTPS `/ubus` endpoint. Remote sites need an
existing routed management network or VPN.

- **Minimum**: OpenWrt 21.02+ with SSH, `rpcd`, `uhttpd`, `/ubus` handler
- **Recommended**: OpenWrt 24.10 or 25.12
- **Hardware**: 64-bit host, 1 GB RAM, 2 GB free storage

A 64-bit host with 1 GB of RAM and 2 GB of free storage is a practical starting
point. The controller's engineering envelope is at most 256 MB steady-state RSS
at 25 devices, 2% of one modern CPU core for an idle fleet, and 2 GB of disk at
the full 13-month retention depth.

---

### 📦 Run the standalone binary

```bash
# Create data directory
install -d -m 0700 "$PWD/data"

# Download and run
./oonfeewrtd -data-dir "$PWD/data" -listen 127.0.0.1:8080

# First start creates controller passphrase
# Open http://127.0.0.1:8080 and create your owner account
```

For unattended startup, use `-passphrase-file` with a mode-`0600` file.

---

### 🐳 Run with Docker Compose

```bash
# Create working directory
install -d -m 0700 oonfeewrt
cd oonfeewrt
umask 077

# Download Compose file (use v0.1.8 for v0.1.8 release)
curl --fail --location \
  --output docker-compose.yml \
  https://raw.githubusercontent.com/aiden0rchad/oonfeeWRT/v0.1.8/deploy/docker-compose.yml

# Create secure passphrase
head -c 32 /dev/urandom | base64 > passphrase
sudo chown 65532:65532 passphrase
sudo chmod 600 passphrase

# Optional: Custom network bind
printf '%s\n' \
  'OONFEE_VERSION=v0.1.8' \
  'OONFEE_HTTP_BIND=127.0.0.1' > .env
chmod 600 .env

# Start
docker compose up -d

# Open http://127.0.0.1:8080
```

**Important**: The HTTP listener has no native TLS. Keep it on loopback or an
isolated management network, and use a trusted reverse proxy for remote access.

The `passphrase` file unlocks the controller keyring and is not your owner
account password. Back it up with the controller state and keep both private.

`docker compose down -v` deletes the named data volume.

---

## 🔍 Preview

Real dark-mode screenshots captured while preparing the v0.1.8 interface.

<div align="center">
  <img src="docs/public/screenshots/dashboard-overview-dark.jpg" alt="Dashboard" width="400" />
  <img src="docs/public/screenshots/statistics-internet-dark.jpg" alt="Statistics" width="400" />
  <p><em>Fleet health and Internet observations with detailed statistics</em></p>
</div>

<div align="center">
  <img src="docs/public/screenshots/accounts-manage-dark.jpg" alt="Accounts" width="400" />
  <img src="docs/public/screenshots/devices-inventory-dark.jpg" alt="Devices" width="400" />
  <p><em>Dedicated Accounts workspace and device inventory management</em></p>
</div>

[Explore the visual tour and illustrated guides][docs-url] for a screen-by-screen
walkthrough and the capture dates and evidence limits.

---

## 📊 Feature comparison

oonfeeWRT focuses on what matters for real-world OpenWrt deployments:

| Capability | oonfeeWRT | Cloud services |
|------------|-----------|----------------|
| **Self-hosted** | ✅ | ❌ |
| **OpenWrt native** | ✅ | Limited |
| **No firmware flash** | ✅ | Often required |
| **Privacy-first** | ✅ | ❌ |
| **Rollback protection** | ✅ | Variable |
| **Air-gapped sites** | ✅ | ❌ |
| **Zero vendor lock** | ✅ | ❌ |

---

## 🔐 Safety model

- **Apply uses `uci.apply`** with a rollback window, then confirms only after
  the controller can read the expected state
- **Ownership tags** restrict ordinary writes and cleanup to controller-created
  sections
- **Explicit review** required for RF scans, speed tests, capability installation
- **Monitor-only mode** excludes devices from desired configuration changes
- **Encrypted backups** with separate passphrase that's never stored
- **No automatic changes**—router writes only happen after explicit Preview + Apply

---

## 🛡️ First adoption

1. **Set a router root password** (if not already):

   ```bash
   ROUTER_ADDRESS=192.0.168.1
   ssh -t root@"$ROUTER_ADDRESS" passwd
   ```

2. **In Devices**, add the router by address or run discovery scan

3. **Inspect capabilities** and choose **Managed** or **Monitor only**

4. **Review controller-access payload**—Approve creates scoped login and ACL

5. **Preview configuration** before Apply—router changes only happen after explicit approval

Monitor-only devices receive the distinct read-only `oonfeewrt-monitor` ACL
and are excluded from desired/site configuration changes.

---

## 🔄 Upgrade to v0.1.8

v0.1.6, v0.1.7, and v0.1.8 use **schema 25**. Upgrading from v0.1.6 or v0.1.7
adds no schema migration.

### From v0.1.6 or v0.1.7

```bash
# Preserve verified backup and matching recovery unit
# Replace controller with verified release
# Keep same data volume and runtime passphrase
# Refresh browser

# No router changes happen automatically
```

### From v0.1.5

Export and verify a portable backup first. v0.1.8 runs migrations from schema 23
to 24 for persistent alert state, then schema 25 for encrypted AdGuard Home settings.

---

## 📚 Documentation

- [Documentation site — capabilities, setup, guides][docs-url]
- [Installation, upgrades, TLS, recovery][docs-install]
- [v0.1.8 release notes][docs-rel-v018]
- [v0.1.7 release notes][docs-rel-v017]
- [v0.1.6 release notes][docs-rel-v016]
- [Architecture and security][docs-arch]
- [Hardware validation][docs-validate]
- [Feature parity matrix][docs-parity]
- [Roadmap][docs-roadmap]

---

## 🧪 Current limitations

- Hardware validation covers Linksys WRT3200ACM and TP-Link Archer C6 v2 on OpenWrt 25.12.5
- Read-only inspection additionally confirmed on Cudy M3000 v2/MT7981 Filogic
- Three-or-more-AP fan-out, real mesh backhaul, wireless uplink remain unverified
- Speed test runs from controller through Cloudflare (15 MiB, 30 seconds max)
- Native TLS, cloud remote access, multi-WAN, manual WAN selection not in v0.1.8
- Optional LLDP may install official-feed packages; adoption never installs packages

Detailed hardware evidence and known gaps are in
[fresh-start validation][docs-validate] and [parity matrix][docs-parity].

---

## 🛠️ Build from source

Go 1.26.6 and Node.js 22 are the release toolchain.

```bash
# Install prerequisites (Debian/Ubuntu)
./setup.sh --build

# Or verify toolchain without building
make check
make build

# Run
./oonfeewrtd -data-dir "$PWD/.run" -listen 127.0.0.1:8080
```

oonfeeWRT rejects passphrases supplied through environment variables.

---

## ❤️ Support development

If oonfeeWRT is useful to you, you can support future development, hands-on
testing across more OpenWrt hardware, and careful release validation.

[![Buy Me a Coffee][bmac-badge]][bmac-url]

[bmac-badge]: https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=aiden0rchad&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff
[bmac-url]: https://buymeacoffee.com/aiden0rchad

---

## 📄 License

Apache License 2.0. See [LICENSE][license-url], [NOTICE][notice-url], and
[THIRD_PARTY_LICENSES][third-party-url]. Every release archive and container
image includes the same notices.

---

## 🤖 AI transparency

AI coding tools have been used substantially during development to help draft
and iterate on implementation code, tests, debugging, and documentation. The
maintainer supplies the product direction, networking architecture, security
boundaries, hardware knowledge, review, and final decisions, and remains
responsible for what the project ships.

AI output is not treated as evidence that the software is correct or secure.
CI runs Go tests, `go vet`, the race detector, `govulncheck`, UI unit and browser
tests, OSV dependency scans, release smoke tests, and repository/history secret
scans. Hardware behavior is checked separately against physical OpenWrt devices
and the known coverage gaps are published above.

oonfeeWRT has not received an independent security audit or third-party
penetration test. It is a new project: start with non-critical hardware, keep
backups, review every proposed router change, and report unexpected behavior.

---

## 📬 Support

Report issues on GitHub or reach out via the documentation site.

---

<p align="center">
  <img src="docs/public/social-card.svg" alt="oonfeeWRT" width="200" />
</p>

[docs-url]: https://aiden0rchad.github.io/oonfeeWRT/
[docs-install]: https://aiden0rchad.github.io/oonfeeWRT/getting-started/installation/
[docs-rel-v018]: docs/releases/v0.1.8.md
[docs-rel-v017]: docs/releases/v0.1.7.md
[docs-rel-v016]: docs/releases/v0.1.6.md
[docs-arch]: docs/ARCHITECTURE.md
[docs-validate]: docs/FRESH-START-VALIDATION.md
[docs-parity]: docs/PARITY-MATRIX.md
[docs-roadmap]: docs/ROADMAP.md
[license-url]: LICENSE
[notice-url]: NOTICE
[third-party-url]: third_party/THIRD_PARTY_LICENSES
