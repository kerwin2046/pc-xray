# Architecture

This document describes how PC·XRAY is put together and why. Read it before
making structural changes.

## Design goals

1. **Truthfulness.** Every number shown is read from the machine. Where a value
   has to be estimated, the estimate is flagged in the data model
   (`MemoryModule.sizeEstimated`) and surfaced in the interface.
2. **Local-first.** No database, no accounts, no outbound requests. The server
   binds to the loopback interface.
3. **A hard server boundary.** Code that touches `/sys` or `systeminformation`
   must never be reachable from the browser bundle.
4. **Layers over folders.** Directory structure encodes an acyclic dependency
   graph, not a filing convention.

## Layer graph

```
          ┌─────────────┐
          │  src/app    │  routing, RSC entry, HTTP handlers
          └──────┬──────┘
         ┌───────┴────────┐
         ▼                ▼
 ┌──────────────┐  ┌──────────────┐
 │ src/features │  │  src/server  │  collectors (server-only)
 └──────┬───────┘  └──────┬───────┘
        └────────┬────────┘
                 ▼
          ┌─────────────┐
          │  src/lib    │  pure domain logic
          └──────┬──────┘
                 ▼
          ┌─────────────┐
          │  src/i18n   │  locale config and strings
          └──────┬──────┘
                 ▼
          ┌─────────────┐
          │ src/types   │  shared type definitions
          └─────────────┘
```

Edges point downward only. The rule that matters most: **`src/features` must
never import `src/server`.** The feature layer runs in the browser; the server
layer reads sysfs. They meet only in `src/app`, which passes collected data
down as props or serves it over HTTP.

`src/types` has no imports at all, which is what keeps the graph acyclic — every
layer can name the same `MachineInfo` and `LiveStats` shapes without depending
on each other.

## Directory map

```
src/
├── app/                              Routing layer — thin by design
│   ├── api/
│   │   ├── live/route.ts             GET /api/live      (no-store)
│   │   └── machine/route.ts          GET /api/machine   (60 s cache)
│   ├── globals.css
│   ├── layout.tsx                    <html lang> from the resolved locale
│   └── page.tsx                      Collects, resolves locale, renders the feature
│
├── features/
│   └── xray/                         The single product feature
│       ├── index.ts                  Public surface (XRayApp only)
│       ├── XRayApp.tsx               State owner: selection, view modes, locale
│       ├── hooks/
│       │   └── useLiveStats.ts       2 s poll, 60-sample ring buffer
│       └── components/
│           ├── panels/               2D overlay: Overview, LiveHud, Toolbar, DetailPanel
│           └── scene/                3D scene
│               ├── SceneCanvas.tsx   Canvas, camera, lighting, environment
│               ├── SceneContext.tsx  Scene-wide state without prop drilling
│               ├── Part.tsx          Selection, hover, heat-tinted materials
│               ├── Label.tsx         Billboarded callouts
│               ├── colors.ts         Schematic and realistic palettes, heat ramp
│               ├── models/           One file per physical component
│               └── primitives/       Reusable geometry, instancing, canvas textures
│
├── server/
│   └── hardware/                     Server-only. Never imported by features.
│       ├── machine.ts                Static inventory, memoised for 60 s
│       ├── live.ts                   Sampled telemetry, never cached
│       └── linux.ts                  CPU topology, hwmon, DDR5 SPD decoding
│
├── lib/
│   ├── format.ts                     Byte, hertz, percent, temperature formatting
│   └── hardware/
│       ├── parts.ts                  MachineInfo + LiveStats → part detail views
│       └── insights.ts               Whole-machine diagnostic rules
│
├── i18n/
│   ├── config.ts                     Locales, default, cookie name, BCP 47 tags
│   ├── server.ts                     Resolve locale from ?lang= then cookie
│   ├── ui.ts                         Interface chrome strings
│   └── detail.ts                     Part explanations and diagnostics
│
└── types/
    └── hardware.ts                   MachineInfo, LiveStats, and their members
```

## Data flow

### Static inventory

```
/sys + systeminformation
   → server/hardware/linux.ts        parse CPU topology, SPD EEPROM
   → server/hardware/machine.ts      normalise into MachineInfo, memoise 60 s
   → app/page.tsx                    server-render with the data already present
   → features/xray/XRayApp.tsx       held as React state
```

The page is server-rendered with inventory already in hand, so there is no
loading state for the machine description. `getMachineInfo()` memoises the
in-flight promise, so a page load and a concurrent `GET /api/machine` share one
collection pass.

### Live telemetry

```
useLiveStats  ──poll every 2 s──▶  GET /api/live
                                     → server/hardware/live.ts
                                     → readHwmon / readModuleTemps
                                   ◀── LiveStats
   → SceneContext → per-part materials (core brightness, fan RPM, heat tint)
   → LiveHud (60-sample history sparkline)
```

Live data is deliberately separate from static inventory: it changes on a
different timescale, must never be cached, and must keep working when the user
is viewing an imported snapshot — in which case polling is switched off
entirely via the `enabled` flag.

### Derivation

`lib/hardware/parts.ts` and `lib/hardware/insights.ts` are pure functions of
`(MachineInfo, LiveStats | null, Locale)`. They contain the interesting domain
logic — core-class explanations, dual-channel bandwidth arithmetic, battery
health, thermal thresholds — and no React. That makes the reasoning testable
and keeps components declarative.

## Key decisions

### One file per physical component

`scene/models/` holds `Board`, `RamStick`, `Ssd`, `WifiCard`, `Battery`,
`Cooling`, `Soc`, `Shell`, and `Laptop`. Each owns both its schematic and its
realistic representation, so the two never drift apart, and a contributor adding
a component touches exactly one file plus the barrel.

`Laptop.tsx` is the assembly: it computes the layout, decides where each
component sits, and defines the camera framing for each part.

### Two visual styles, one geometry

Every model branches on `realistic` from scene context. The schematic style uses
flat palette colours and emissive glow; the realistic style adds PBR materials,
procedurally drawn canvas textures (silkscreen, stickers, DRAM markings), and
extra detail meshes. Both read the same real hardware data, so switching styles
never changes what is being reported.

### Deterministic procedural detail

`primitives/geometry.ts` exposes a seeded mulberry32 PRNG. Every scattered SMD
part, trace, and blade position is derived from a fixed seed, so detail is
stable across re-renders and identical between sessions.

### Instancing

`primitives/Scatter.tsx` renders hundreds of small boxes — capacitors,
resistors, heatsink fins, fan blades, keycaps — through a single instanced draw
call. This is what keeps the realistic style affordable on integrated graphics.

### Texture lifetime

Canvas textures and extruded geometries are GPU resources. `useDispose` ties
their lifetime to the component that created them, which matters because
stickers are regenerated whenever the underlying hardware values change.

### Locale resolution order

`?lang=` wins over the `pcx-locale` cookie, which wins over the English default.
The query parameter makes deep links shareable across users with different saved
preferences; the cookie makes the choice stick; English is the fallback so a
first-time visitor with no cookie gets a predictable result.

Switching locale on the client does not refetch — all strings for both locales
are already in the bundle, keyed by locale. This trades a small bundle increase
for instant switching and no locale-specific route segments.

## Platform strategy

`systeminformation` provides the cross-platform baseline.
`server/hardware/linux.ts` layers on what only Linux exposes:

| Capability                | Source                                  | Elsewhere           |
| ------------------------- | --------------------------------------- | ------------------- |
| P / E / LP-E core classes | `/sys/devices/cpu_{core,atom}`          | Heuristic fallback  |
| Per-core temperature      | `hwmon` `coretemp` / `k10temp`          | Package temp only   |
| DDR5 module details       | `spd5118` SPD EEPROM (no root required) | Total size estimate |
| Fan RPM, SSD, Wi-Fi temps | `hwmon`                                 | Usually unavailable |

Every Linux-only field is typed nullable, and the interface renders the absence
rather than guessing. `fallbackCores()` in `machine.ts` reconstructs a plausible
topology from core counts when `/sys` parsing yields nothing.

## Privacy boundary

Identifying data is excluded at the point of collection, not stripped
afterwards. `machine.ts` passes an explicit field selection to
`systeminformation.get()`; serial numbers, MAC addresses, IP addresses, and
hardware UUIDs are simply never requested. Virtual and container interfaces are
filtered out by name. Snapshots are therefore safe to share by construction —
with the caveat that the OS hostname and disk model names are included.

## Extending

- **New component in the 3D model** — add `scene/models/YourPart.tsx`, export it
  from `scene/models/index.ts`, place it in `Laptop.tsx`, add a `PartId` and a
  detail builder in `lib/hardware/parts.ts`, add strings to `i18n/detail.ts`.
- **New sensor** — extend `LiveStats` in `types/hardware.ts`, read it in
  `server/hardware/live.ts` (nullable), consume it in a model or in `LiveHud`.
- **New locale** — add the code to `LOCALES` and `LOCALE_TAG` in
  `i18n/config.ts`, then fill in `ui.ts` and `detail.ts`. Both are typed as
  `Record<Locale, …>`, so the compiler lists everything you still owe.
