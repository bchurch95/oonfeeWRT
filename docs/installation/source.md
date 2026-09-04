# Build from source

Build the controller (embedded web UI plus the static `oonfeewrtd` binary) from
a source checkout. The release toolchain is **Go 1.26.6** and **Node.js 22**,
the same pins used by `deploy/Dockerfile` and CI.

> **Outcome:** A Debian/Ubuntu host has every prerequisite installed, `make check` passes, and `make build` produces a working `oonfeewrtd` binary — including the host tools the Firmware Builder's OpenWrt image builder needs.

## Prerequisites

- A 64-bit `linux/amd64` or `linux/arm64` Debian or Ubuntu host.
- `apt-get` and `root` or `sudo`.
- Outbound network access (to fetch the official Go and Node tarballs and apt packages).

`setup.sh` is the single entry point: it installs the base toolchain
(`git`, `make`, `curl`, `ca-certificates`, `tar`, `xz-utils`, `file`, `bzip2`,
`wget`), the OpenWrt image-builder dependencies (`build-essential` for
`gcc`/`g++`, `gawk`, `unzip`, and `python3-setuptools` which supplies the
`distutils` module removed from Python 3.12+), and the exact Go and Node
versions from official HTTPS tarballs.

## 1. Install the prerequisites

From a source checkout:

```sh
./setup.sh
```

`make setup` is equivalent. The script is idempotent — re-running it skips
components already at the correct version — and ends by printing the resolved
toolchain and confirming every required tool is present.

To build in the same step:

```sh
./setup.sh --build
```

## 2. Run the local release gates

```sh
make check
```

This runs `go mod verify`, `go mod tidy -diff`, the full Go and UI test suites,
`go vet`, the UI asset budget check, and the repository secret scan.

## 3. Build the binary

```sh
make build
```

This installs UI dependencies, builds and embeds the UI, then compiles
`oonfeewrtd` as a static, `CGO_ENABLED=0` binary.

Run it:

```sh
./oonfeewrtd -data-dir "$PWD/.run" -listen 127.0.0.1:8080
```

For unattended startup, add `-passphrase-file` pointing at a mode-`0600` file.
The daemon rejects passphrases supplied through environment variables.

## Firmware Builder prerequisites

The Firmware Builder downloads and runs the official OpenWrt image builder on
the controller host. That image builder performs a host prerequisite check that
is a hard failure (its `FORCE=1` does not override it), so these host tools must
exist on the controller — `setup.sh` installs them:

| Tool | Why the image builder needs it |
|---|---|
| `gawk` | GNU `awk` floating-point comparisons (mawk is not sufficient) |
| `unzip` | unpacking feeds and sources |
| `python3-setuptools` | provides the `distutils` module removed in Python 3.12+ |
| `build-essential` | `gcc`/`g++` to build the `mkhash` host tool |

If you recreate or reimage the controller host, re-run `./setup.sh` to restore
these before using the Firmware Builder.

## Next steps

- [Run the standalone binary](binary.md)
- [Run with Docker Compose](docker.md)
- [Add trusted HTTPS](reverse-proxy.md)
