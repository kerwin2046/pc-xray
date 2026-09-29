<div align="center">

# PC·XRAY

**See inside your computer.**

Reads your machine's real hardware and renders it as an interactive 3D cutaway —
every CPU core, memory module, SSD, heat pipe, and battery cell. Click any part
to learn what it is, what it's rated for, and what it's doing right now.

[![CI](https://github.com/kerwin2046/pc-xray/actions/workflows/ci.yml/badge.svg)](https://github.com/kerwin2046/pc-xray/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

English · [简体中文](README.zh-CN.md)

</div>

---

## What it is

Most hardware tools give you a table of numbers. PC·XRAY gives you the machine.

It reads the same data those tools read — CPU topology from sysfs, DDR5 details
straight off the SPD EEPROM, temperatures from hwmon — and then builds a
physically arranged 3D model from it. Sixteen cores means sixteen cores on the
die, laid out by class. Two DIMMs means two sticks in their sockets, with the
right number of DRAM packages on each. The fan spins at the RPM your fan is
actually spinning at.

Then it explains itself. Click the CPU and you get a plain-language account of
why your P-cores and E-cores exist and which ones are busy. Click the memory and
you get the dual-channel bandwidth arithmetic worked out. Click the battery and
you get its real health against its design capacity.

It runs entirely on your own machine, binds to loopback only, and never phones
home.

## Highlights

**Real data, not a mock-up.** Core count, core classes, cache sizes, module
density, disk firmware revisions, battery cycle count — all read from the
hardware. Values that must be estimated are labelled as estimates.

**Live telemetry.** Refreshes every 2 seconds: per-core load and frequency,
per-core temperature, memory pressure, fan RPM, battery state. Core brightness
tracks load; the fan spins at its measured speed.

**Two visual styles.** A clean schematic mode, and a realistic mode (`V`) with
PBR materials, procedurally generated PCB silkscreen, memory gold fingers and
DRAM markings, and SSD, battery, and Wi-Fi labels printed with your actual
hardware strings.

**Exploded view** (`E`) separates the layers and splits the SoC into its compute,
graphics, and I/O tiles.

**Thermal view** (`T`) recolours every part by its live temperature.

**Plain-language explanations** generated from your data, not canned text:
big.LITTLE core division, channel bandwidth, battery wear, thermal headroom.

**Whole-machine diagnostics.** Memory pressure, swap usage, CPU temperature,
single- versus dual-channel, battery ageing, disk capacity.

**Snapshots.** Export your machine as JSON and import someone else's to inspect
it. Snapshots carry no serial numbers, MAC addresses, IP addresses, or UUIDs.

**Bilingual.** English by default, Chinese one click away, switched instantly
without a reload.

## Quick start

**Requirements:** Node.js >= 20.9, pnpm 11, a WebGL2-capable browser.

```bash
git clone https://github.com/kerwin2046/pc-xray.git
cd pc-xray
corepack enable
pnpm install
pnpm dev
```

Open <http://127.0.0.1:3000>.

The dev and production servers bind to `127.0.0.1`, so your hardware details are
never exposed to the local network.

## Usage

### Keyboard

| Key   | Action                           |
| ----- | -------------------------------- |
| `V`   | Toggle realistic materials       |
| `E`   | Toggle exploded view             |
| `T`   | Toggle thermal view              |
| `L`   | Toggle labels                    |
| `R`   | Reset camera and clear selection |
| `Esc` | Clear selection                  |

Drag to orbit, scroll to zoom, click a part to select it.

### Deep links

Every view is addressable, so you can link someone straight to what you're
talking about:

```
/?part=cpu&exploded=1&heat=1&labels=0&style=real&lang=en
```

| Parameter  | Values                                                                          | Default           |
| ---------- | ------------------------------------------------------------------------------- | ----------------- |
| `part`     | `board` `cpu` `gpu` `ram-0` `ssd-0` `battery` `cooling` `wifi` `display` `input` | none selected     |
| `exploded` | `1`                                                                             | off               |
| `heat`     | `1`                                                                             | off               |
| `labels`   | `0` to hide                                                                     | shown             |
| `style`    | `real`                                                                          | schematic         |
| `lang`     | `en` `zh`                                                                       | cookie, else `en` |

`lang` takes precedence over the saved `pcx-locale` cookie.

### Snapshots

```bash
pnpm snapshot                 # writes snapshot.json
pnpm snapshot my-laptop.json  # or a path of your choosing
```

You can also export from the toolbar. Import a snapshot to view another
machine's hardware in full 3D; live polling switches off while you do, and the
toolbar shows which snapshot you're looking at.

## HTTP API

Both endpoints are local, unauthenticated, and return JSON.

| Endpoint       | Description                      | Caching          |
| -------------- | -------------------------------- | ---------------- |
| `/api/machine` | Static inventory (`MachineInfo`) | 60 s server-side |
| `/api/live`    | Sampled telemetry (`LiveStats`)  | `no-store`       |

Response shapes are defined in [`src/types/hardware.ts`](src/types/hardware.ts).

## How it reads your hardware

`systeminformation` provides the cross-platform baseline. On Linux, PC·XRAY
reads considerably deeper — all from world-readable paths, with **no root
required**:

- **CPU topology** from `/sys/devices/cpu_core` and `/sys/devices/cpu_atom`,
  which is how P, E, and LP-E cores are told apart and mapped to logical CPUs.
- **Memory details** decoded from the SPD EEPROM exposed by the `spd5118`
  driver: DDR generation, speed grade, die density, and I/O width per module.
- **Sensors** from `hwmon`: per-core and package temperature, SSD and Wi-Fi
  temperature, fan RPM.

## Platform support

| Platform | Status                 | Notes                                                  |
| -------- | ---------------------- | ------------------------------------------------------ |
| Linux    | Fully supported        | Core classes, SPD memory details, full sensor coverage |
| macOS    | Runs, reduced fidelity | No core classification, no SPD data, limited sensors   |
| Windows  | Runs, reduced fidelity | No core classification, no SPD data, limited sensors   |

On non-Linux platforms the interface degrades honestly: missing values are shown
as unavailable rather than guessed, and estimated ones are marked.

The 3D layout is a representative laptop arrangement. **Component counts and
specifications are real; physical positions are illustrative**, not a
reproduction of your specific chassis.

## Privacy

Identifying data is excluded at the point of collection, not stripped after the
fact. The collector requests an explicit list of fields from
`systeminformation`, and serial numbers, MAC addresses, IP addresses, and
hardware UUIDs are never among them. Virtual and container network interfaces
are filtered out by name.

What a snapshot **does** include: your OS hostname, distribution, kernel
version, and disk model names. Glance over it before sharing publicly.

Nothing is sent anywhere. There is no telemetry, no analytics, and no outbound
request of any kind.

## Scripts

| Command          | Description                               |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Development server on `127.0.0.1:3000`    |
| `pnpm build`     | Production build                          |
| `pnpm start`     | Serve the production build on `127.0.0.1` |
| `pnpm typecheck` | `tsc --noEmit`                            |
| `pnpm lint`      | ESLint                                    |
| `pnpm snapshot`  | Write a hardware snapshot to JSON         |

## Tech stack

Next.js 16 (App Router, React Server Components) · React 19 · TypeScript 5 in
strict mode · React Three Fiber 9 and drei 10 on three.js · Tailwind CSS 4 ·
`systeminformation` plus custom Linux sysfs collectors.

## Project structure

```
src/
├── app/          Routing layer: pages and API routes (thin by design)
├── features/     Feature modules — currently the single xray feature
├── server/       Server-only hardware collectors; never bundled for the browser
├── lib/          Pure domain logic and formatting
├── i18n/         Locale configuration and all user-visible strings
└── types/        Shared type definitions, imported by everything
```

Dependencies flow downward only, and `src/features` may never import
`src/server`. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
layer graph, data flow, and the reasoning behind each decision.

## Contributing

Contributions are welcome — particularly hardware reports from machines we
haven't seen. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md), and please read
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before making structural changes.

For security issues, follow [`SECURITY.md`](SECURITY.md) rather than opening a
public issue.

## License

[MIT](LICENSE) © kerwin2046
