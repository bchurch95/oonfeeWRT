#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper to build oonfeeWRT pre-deployment images
# Usage: ./build.sh <target-tarball> <profile>

TARGET_TARBALL="${1:-}"
PROFILE="${2:-Linksys_WRT3200ACM}"

if [[ -z "$TARGET_TARBALL" ]]; then
  echo "Usage: $0 <imagebuilder-tarball> [profile]" >&2
  exit 1
fi

DIR=$(basename "$TARGET_TARBALL" .tar.bz2)
tar xf "$TARGET_TARBALL"
cd "$DIR"

PACKAGES="rpcd rpcd-mod-file rpcd-mod-iwinfo rpcd-mod-luci uhttpd uhttpd-mod-ubus lldpd nlbwmon vnstat2 dropbear"

make image PROFILE="$PROFILE" \
  PACKAGES="$PACKAGES" \
  FILES="../files" \
  CONFIG_FILE="../openwrt.config"

echo "Build complete. Images in bin/targets/"
