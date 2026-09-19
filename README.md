# oonfeeWRT

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/logo-dark.svg" />
  <img src="docs/public/logo-light.svg" alt="oonfeeWRT orbit mark" width="96" height="96" />
</picture>

**Self-hosted, UniFi-inspired management for stock OpenWrt**

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

---

<p align="center">
  <img src="docs/public/screenshots/dashboard-overview-dark.jpg" alt="oonfeeWRT Dashboard" width="800" />
</p>

---

## 🚀 Quick Start

| 🐳 **Docker** | 🚀 **Binary** | 🏗️ **Build** |
|-------------|-------------|-------------|
| `docker compose up -d` | `./oonfeewrtd` | `make build` |
| [Instructions][docs-install] | [Download][release-url] | `./setup.sh --build` |

---

## ✨ What it does

oonfeeWRT manages OpenWrt routers through their existing interfaces—no firmware flashing required.

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>📊 Dashboard</strong><br/>Fleet health, topology, Internet</td>
      <td align="center"><strong>📈 Statistics</strong><br/>Traffic, ICMP, interface history</td>
      <td align="center"><strong>🛡️ Preview & Apply</strong><br/>Safe config with rollback</td>
      <td align="center"><strong>🔐 Security</strong><br/>RBAC, encrypted backups</td>
    </tr>
    <tr>
      <td align="center"><strong>📱 Devices</strong><br/>Adoption, health, telemetry</td>
      <td align="center"><strong>📡 Radios</strong><br/>Channel planning, RF tools</td>
      <td align="center"><strong>👥 Clients</strong><br/>Inventory, policies, observability</td>
      <td align="center"><strong>📜 Audit</strong><br/>Logs, diagnostics, restore</td>
    </tr>
  </table>
</div>

---

## 🎯 Why oonfeeWRT?

| Feature | oonfeeWRT | Cloud Services |
|---------|-----------|----------------|
| **Self-hosted** | ✅ | ❌ |
| **OpenWrt native** | ✅ | Limited |
| **No firmware flash** | ✅ | Often required |
| **Privacy-first** | ✅ | ❌ |
| **Rollback protection** | ✅ | Variable |
| **Air-gapped sites** | ✅ | ❌ |
| **Zero vendor lock** | ✅ | ❌ |

---

## 📚 Documentation

**[Explore the complete documentation site →][docs-url]**

- [Getting started][docs-install] — Installation and first adoption
- [Visual tour][docs-vt] — Screen-by-screen walkthrough
- [Installation guide][docs-install] — Binary, Docker, upgrades
- [Release notes][docs-rel] — Version history
- [Architecture][docs-arch] — Security and design
- [Hardware validation][docs-validate] — Supported devices
- [Feature parity][docs-parity] — Capabilities matrix
- [Roadmap][docs-roadmap] — Future plans

---

## 🧪 Validation

- **Hardware**: Linksys WRT3200ACM, TP-Link Archer C6 v2 (OpenWrt 25.12.5)
- **Additional**: Cudy M3000 v2/MT7981 Filogic (read-only)
- **Status**: End-to-end validation on physical devices

---

## 🛠️ Installation

### 🐳 Docker Compose

```bash
install -d -m 0700 oonfeewrt
cd oonfeewrt
umask 077

curl --fail --location \
  --output docker-compose.yml \
  https://raw.githubusercontent.com/aiden0rchad/oonfeeWRT/v0.1.8/deploy/docker-compose.yml

head -c 32 /dev/urandom | base64 > passphrase
sudo chown 65532:65532 passphrase
sudo chmod 600 passphrase

printf '%s\n' \
  'OONFEE_VERSION=v0.1.8' \
  'OONFEE_HTTP_BIND=127.0.0.1' > .env
chmod 600 .env

docker compose up -d
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080)

### 🚀 Standalone Binary

```bash
install -d -m 0700 "$PWD/data"
./oonfeewrtd -data-dir "$PWD/data" -listen 127.0.0.1:8080
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080)

### 🏗️ Build from Source

```bash
./setup.sh --build
./oonfeewrtd -data-dir "$PWD/.run" -listen 127.0.0.1:8080
```

---

## 🔐 Safety Model

- **Rollback protection**: Every Apply uses OpenWrt's rollback window
- **Ownership tags**: Only controller-created sections are modified
- **Explicit review**: RF scans, speed tests, capability installs require approval
- **Monitor-only mode**: Exclude devices from configuration changes
- **Encrypted backups**: Separate passphrase, never stored

---

## 🛡️ First Adoption

1. **Set router password** (if needed):
   ```bash
   ssh -t root@ROUTER_IP passwd
   ```

2. **Add device** in Devices → enter address or use discovery

3. **Choose mode**: Managed or Monitor only

4. **Review payload** → Approve creates scoped login and ACL

5. **Preview config** → Apply only after explicit approval

---

## 📊 Preview

<div align="center">
  <img src="docs/public/screenshots/dashboard-overview-dark.jpg" alt="Dashboard" width="400" />
  <img src="docs/public/screenshots/statistics-internet-dark.jpg" alt="Statistics" width="400" />
</div>
<div align="center">
  <img src="docs/public/screenshots/accounts-manage-dark.jpg" alt="Accounts" width="400" />
  <img src="docs/public/screenshots/devices-inventory-dark.jpg" alt="Devices" width="400" />
</div>

[Explore the visual tour][docs-vt] for detailed screenshots.

---

## 🔄 Upgrades

### From v0.1.6 or v0.1.7

```bash
# Preserve verified backup
# Replace controller, keep same data volume
# Refresh browser
# No automatic router changes
```

### From v0.1.5

Export and verify portable backup first.

---

## 🧪 Current Limitations

- Hardware validation: WRT3200ACM, Archer C6 v2 (OpenWrt 25.12.5)
- Three-or-more-AP fan-out, mesh backhaul, wireless uplink unverified
- Speed test: controller through Cloudflare (15 MiB, 30s max)
- No native TLS, cloud remote access, multi-WAN, manual WAN selection
- Optional LLDP may install official-feed packages

See [hardware validation][docs-validate] and [parity matrix][docs-parity] for details.

---

## 🛠️ Build from Source

```bash
# Install prerequisites (Debian/Ubuntu)
./setup.sh --build

# Verify toolchain
make check
make build

# Run
./oonfeewrtd -data-dir "$PWD/.run" -listen 127.0.0.1:8080
```

---

## 🤝 Support Development

[![Buy Me a Coffee][bmac-badge]][bmac-url]

[bmac-badge]: https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=aiden0rchad&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff
[bmac-url]: https://buymeacoffee.com/aiden0rchad

---

## 📄 License

Apache License 2.0. See [LICENSE][license-url], [NOTICE][notice-url], [THIRD_PARTY_LICENSES][third-party-url].

---

## 🤖 AI Transparency

AI coding tools have been used substantially during development. CI runs Go tests, `go vet`, race detector, `govulncheck`, UI tests, OSV scans, release smoke tests, and secret scans.

Hardware behavior is checked against physical OpenWrt devices. Known coverage gaps are published above.

oonfeeWRT has not received an independent security audit or penetration test. Start with non-critical hardware, keep backups, review every proposed router change, and report unexpected behavior.

---

## 🤝 Community

<div align="center">
  <a href="https://github.com/aiden0rchad/oonfeeWRT/issues"><img src="https://img.shields.io/github/issues/aiden0rchad/oonfeeWRT?style=flat&label=Issues" /></a>
  <a href="https://github.com/aiden0rchad/oonfeeWRT/pulls"><img src="https://img.shields.io/github/issues-pr/aiden0rchad/oonfeeWRT?style=flat&label=PRs" /></a>
  <a href="https://github.com/aiden0rchad/oonfeeWRT/stargazers"><img src="https://img.shields.io/github/stars/aiden0rchad/oonfeeWRT?style=flat&label=Stars" /></a>
  <a href="https://github.com/aiden0rchad/oonfeeWRT/forks"><img src="https://img.shields.io/github/forks/aiden0rchad/oonfeeWRT?style=flat&label=Forks" /></a>
</div>

---

## 🎯 Contributing

We welcome contributions! Here's how to get started:

1. **Report issues** — Found a bug? Open an issue with steps to reproduce
2. **Feature requests** — Suggest new features with clear use cases
3. **PRs** — Fix bugs, add features, improve docs
4. **Testing** — Help validate on different hardware

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/oonfeeWRT.git
cd oonfeeWRT

# Install dependencies
./setup.sh --build

# Run tests
make test

# Build
make build
```

### Code Style
- Follow existing Go patterns
- Use descriptive commit messages
- Add tests for new features
- Update documentation as needed

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Connection refused** | Check router SSH/rpcd/uhttpd services are running |
| **Adoption fails** | Ensure OpenWrt 21.02+ with required packages |
| **Configuration fails** | Review Preview carefully before Apply |
| **Backup restore fails** | Verify backup integrity and version compatibility |

### Getting Help

- Check [troubleshooting][docs-install] in documentation
- Search [GitHub issues][issues-url]
- Open a new issue with your setup details

---

## 📋 Version Compatibility

| Controller | OpenWrt | Status |
|-----------|---------|--------|
| v0.1.8 | 24.10, 25.12 | ✅ Validated |
| v0.1.7 | 24.10, 25.12 | ✅ Validated |
| v0.1.6 | 24.10, 25.12 | ✅ Validated |
| v0.1.5 | 24.10 | ✅ Validated |
| v0.1.4 | 24.10 | ✅ Validated |
| v0.1.3 | 24.10 | ✅ Validated |

**Minimum**: OpenWrt 21.02 (read-only inspection)  
**Recommended**: OpenWrt 24.10 or 25.12 (full validation)

---

## 📬 Support

Report issues on GitHub. Reach out via the documentation site.

---

<p align="center">
  <img src="docs/public/social-card.svg" alt="oonfeeWRT" width="200" />
</p>

---

<p align="center">
  <em>oonfeeWRT is a new project. Start with non-critical hardware, keep backups, review every proposed router change, and report unexpected behavior.</em>
</p>

[docs-url]: https://aiden0rchad.github.io/oonfeeWRT/
[docs-install]: https://aiden0rchad.github.io/oonfeeWRT/getting-started/installation/
[docs-vt]: https://aiden0rchad.github.io/oonfeeWRT/getting-started/visual-tour/
[docs-rel]: docs/releases/
[docs-arch]: docs/ARCHITECTURE.md
[docs-validate]: docs/FRESH-START-VALIDATION.md
[docs-parity]: docs/PARITY-MATRIX.md
[docs-roadmap]: docs/ROADMAP.md
[issues-url]: https://github.com/aiden0rchad/oonfeeWRT/issues
[license-url]: LICENSE
[notice-url]: NOTICE
[third-party-url]: third_party/THIRD_PARTY_LICENSES
[release-url]: https://github.com/aiden0rchad/oonfeeWRT/releases
