#!/bin/sh
# First-boot tweaks for oonfeeWRT lab routers
# Runs via /etc/rc.local or Image Builder's post-build hook

# Ensure rpcd is enabled
uci set rpcd.main.enabled='1'
uci commit rpcd

# Enable uhttpd ubus handler
uci set uhttpd.main.ubus_prefix='/ubus'
uci commit uhttpd
/etc/init.d/uhttpd enable

# Log marker for probe
logger -t oonfeewrt "predeploy image booted"

exit 0
