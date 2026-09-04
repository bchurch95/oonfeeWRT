#!/bin/sh
# setup.sh — one-shot bootstrap of every prerequisite to build, run, and
# firmware-build oonfeeWRT on a Debian/Ubuntu host.
#
# Usage:
#   ./setup.sh              install all prerequisites, then verify
#   ./setup.sh --build      ... and then run `make build`
#   curl -fsSL <raw-url>/setup.sh | sh      (run while inside the repo root)
#
# What it installs
#   base toolchain : git make curl ca-certificates tar xz-utils file bzip2 wget
#   image-builder  : build-essential (gcc/g++) gawk unzip python3 python3-setuptools
#   Go             : the exact version pinned in go.mod (official tarball)
#   Node.js + npm  : latest LTS of the pinned major line (official tarball)
#
# The Go and Node installs are official HTTPS tarballs, so the exact toolchain
# matches deploy/Dockerfile and CI regardless of the distro's package versions.
# Idempotent: components already at the right version are skipped, so re-running
# is safe. Requires Linux (amd64/arm64), apt-get, and root or sudo.
set -eu

# ------------------------------------------------------------------ helpers ---
say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  ok\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  warn:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m  error:\033[0m %s\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------- config ---
NODE_MAJOR=22        # matches CI (setup-node node-version: 22) and deploy/Dockerfile
GO_FALLBACK=1.26.6   # used only if go.mod has no parseable toolchain line
PREFIX=/usr/local

# Locate the repo root (works for ./setup.sh and for `curl | sh` from the root).
case "${0:-}" in
  */*) cd -- "$(dirname -- "$0")" || exit 1 ;;
esac
[ -f go.mod ] || die "go.mod not found in $(pwd). Run setup.sh from the repo root."

# Derive the Go version from go.mod's toolchain line, else fall back.
GO_VERSION=$(sed -n 's/^toolchain[[:space:]]*go//p' go.mod | head -n1 | tr -d '[:space:]')
[ -n "${GO_VERSION}" ] || GO_VERSION="${GO_FALLBACK}"

# ------------------------------------------------------------------- detect ---
[ "$(uname -s)" = "Linux" ] || \
  die "this script targets Linux; on another OS install Go ${GO_VERSION} and Node ${NODE_MAJOR} manually"
case "$(uname -m)" in
  x86_64)         GOARCH=amd64 ;;
  aarch64|arm64)  GOARCH=arm64 ;;
  *) die "unsupported architecture: $(uname -m)" ;;
esac
# Node tarballs use x64/arm64 naming; Go uses amd64/arm64.
case "$GOARCH" in
  amd64) NODEARCH=x64 ;;
  arm64) NODEARCH=arm64 ;;
esac
command -v apt-get >/dev/null 2>&1 || die "apt-get not found (this script targets Debian/Ubuntu)"

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else
  command -v sudo >/dev/null 2>&1 || die "need root or sudo to install packages"
  SUDO="sudo"
fi

# --------------------------------------------- 1. system packages via apt -----
say "1/4 system packages: base toolchain + OpenWrt image-builder prerequisites"
$SUDO apt-get update -qq
$SUDO apt-get install -y -qq --no-install-recommends \
    git make curl ca-certificates tar xz-utils file bzip2 wget \
    build-essential gawk unzip \
    python3 python3-setuptools

# -------------------------------------------------------------- 2. Go ---------
if command -v go >/dev/null 2>&1 && [ "$(go env GOVERSION 2>/dev/null | sed 's/^go//')" = "$GO_VERSION" ]; then
  ok "Go $(go env GOVERSION) already present"
else
  say "2/4 installing Go ${GO_VERSION} (${GOARCH}) from the official tarball"
  t=$(mktemp)
  curl -fsSL -o "$t" "https://go.dev/dl/go${GO_VERSION}.linux-${GOARCH}.tar.gz" \
    || { rm -f "$t"; die "failed to download Go ${GO_VERSION} (${GOARCH}) tarball"; }
  $SUDO rm -rf "${PREFIX}/go"
  $SUDO tar -C "${PREFIX}" -xzf "$t"
  rm -f "$t"
  $SUDO ln -sf "${PREFIX}/go/bin/go"    "${PREFIX}/bin/go"
  $SUDO ln -sf "${PREFIX}/go/bin/gofmt" "${PREFIX}/bin/gofmt"
  ok "Go ${GO_VERSION} -> ${PREFIX}/go"
fi

# ------------------------------------------------------------ 3. Node ---------
if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/^v//; s/\..*//')" = "$NODE_MAJOR" ]; then
  ok "Node $(node -v) already present"
else
  say "3/4 installing Node.js ${NODE_MAJOR}.x (latest LTS) from the official tarball"
  # latest-v<MAJOR>.x/ is a stable alias to the newest <MAJOR>.x; its SHASUMS256
  # manifest names the exact tarball (node-v<ver>-linux-<arch>...), so parse ver
  # from there rather than a version file that the dist layout does not provide.
  nver=$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" 2>/dev/null \
    | grep -oE "node-v[0-9]+\.[0-9]+\.[0-9]+-linux" | head -n1 \
    | sed 's/^node-v//; s/-linux$//') || true
  [ -n "$nver" ] || die "could not determine latest Node ${NODE_MAJOR}.x version (network reachable?)"
  say "    latest Node ${NODE_MAJOR}.x is v${nver}"
  t=$(mktemp); td=$(mktemp -d)
  curl -fsSL -o "$t" "https://nodejs.org/dist/v${nver}/node-v${nver}-linux-${NODEARCH}.tar.xz" \
    || { rm -rf "$t" "$td"; die "failed to download Node v${nver} (${NODEARCH}) tarball"; }
  tar -C "$td" -xJf "$t"
  $SUDO rm -rf "${PREFIX}/node"
  $SUDO mv "$td/node-v${nver}-linux-${NODEARCH}" "${PREFIX}/node"
  rm -rf "$t" "$td"
  $SUDO ln -sf "${PREFIX}/node/bin/node" "${PREFIX}/bin/node"
  $SUDO ln -sf "${PREFIX}/node/bin/npm"  "${PREFIX}/bin/npm"
  $SUDO ln -sf "${PREFIX}/node/bin/npx"  "${PREFIX}/bin/npx"
  ok "Node v${nver} -> ${PREFIX}/node"
fi

# ------------------------------------------------- 4. verify + summary --------
say "4/4 verifying"
v_go=$(    command -v go   >/dev/null 2>&1 && go version | head -n1            || echo "MISSING")
v_node=$(  command -v node >/dev/null 2>&1 && node -v                            || echo "MISSING")
v_npm=$(   command -v npm  >/dev/null 2>&1 && npm -v                             || echo "MISSING")
v_gawk=$(  command -v gawk >/dev/null 2>&1 && gawk --version | head -n1         || echo "MISSING")
v_unzip=$( command -v unzip >/dev/null 2>&1 && unzip -v 2>/dev/null | head -n1  || echo "MISSING")
v_cc=$(    command -v gcc  >/dev/null 2>&1 && gcc --version | head -n1          || echo "MISSING")
v_dist=$(  python3 -c "import distutils; print('distutils importable (via python3-setuptools)')" 2>/dev/null || echo "MISSING")

printf '\n'
printf '  %-10s %s\n' "go"        "$v_go"
printf '  %-10s %s\n' "node"      "$v_node"
printf '  %-10s %s\n' "npm"       "$v_npm"
printf '  %-10s %s\n' "gawk"      "$v_gawk"
printf '  %-10s %s\n' "unzip"     "$v_unzip"
printf '  %-10s %s\n' "gcc"       "$v_cc"
printf '  %-10s %s\n' "distutils" "$v_dist"
printf '\n'

for need in go node npm gawk unzip gcc; do
  command -v "$need" >/dev/null 2>&1 || die "required tool '$need' is missing after setup"
done
python3 -c "import distutils" 2>/dev/null || die "python3 distutils is missing after setup"
ok "all prerequisites satisfied"

printf '\nNext:\n'
printf '  make check    run the full local gate (Go + UI tests, vet, budgets)\n'
printf '  make build    build the embedded UI + oonfeewrtd binary\n'

# Optional: build right away.
if [ "${1:-}" = "--build" ]; then
  say "building (make build)"
  make build
  ok "build complete"
fi
