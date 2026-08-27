# OpenWrt Image Builder for oonfeeWRT pre-deployment

This directory contains a reproducible Image Builder setup for lab routers used to validate oonfeeWRT.

## Targets validated in docs/FRESH-START-VALIDATION.md
* Linksys WRT3200ACM – ramips/mt7621
* TP-Link Archer C6 v2 – ath79

## Quick start

```bash
cd deploy/openwrt-imagebuilder
# Download matching Image Builder
wget https://downloads.openwrt.org/releases/25.05/targets/ramips/mt7621/openwrt-imagebuilder-25.05-ramips-mt7621.Linux-x86_64.tar.bz2
tar xf openwrt-imagebuilder-25.05-ramips-mt7621.Linux-x86_64.tar.bz2
cd openwrt-imagebuilder-25.05-ramips-mt7621

# Build for WRT3200ACM
make image PROFILE=Linksys_WRT3200ACM \
  PACKAGES="rpcd rpcd-mod-file rpcd-mod-iwinfo rpcd-mod-luci uhttpd uhttpd-mod-ubus lldpd nlbwmon vnstat2" \
  FILES=../files \
  CONFIG_FILE=../openwrt.config
```

## Files layout
* `files/etc/config/` – UCI defaults that make adoption smoother
* `files/etc/` – system tweaks
* `root/` – scripts run on first boot

The built images are in `bin/targets/...` inside the Image Builder directory.

## CI note
Add a GitHub Actions job that downloads the Image Builder, runs `make image` with the above packages, and uploads the `.bin` artifacts for the two validated targets.
