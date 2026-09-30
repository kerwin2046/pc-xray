# Contributing to PC·XRAY

Thanks for taking the time to contribute. This document explains how to get the
project running, how the code is organised, and what we expect from a pull
request.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

```bash
git clone https://github.com/kerwin2046/pc-xray.git
cd pc-xray
corepack enable          # provides the pinned pnpm version
pnpm install
pnpm dev                 # http://127.0.0.1:3000
```

Requirements:

- Node.js >= 22.13 (see [`.nvmrc`](.nvmrc))
- pnpm 11 (pinned via the `packageManager` field; `corepack enable` is enough)
- Linux for the full feature set. macOS and Windows build and run, but several
  collectors degrade to estimates — see [Platform support](README.md#platform-support).

## Project layout

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before making structural
changes. The short version:

| Path           | Layer                      | May import from                              |
| -------------- | -------------------------- | -------------------------------------------- |
| `src/app`      | Routing (thin)             | `features`, `server`, `i18n`, `lib`, `types` |
| `src/features` | Feature UI and composition | `lib`, `i18n`, `types`                       |
| `src/server`   | Server-only collectors     | `lib`, `types`                               |
| `src/lib`      | Pure domain logic          | `i18n`, `types`                              |
| `src/i18n`     | Locale config and strings  | `types`                                      |
| `src/types`    | Shared type definitions    | nothing                                      |

Dependencies point downward only. In particular, nothing outside `src/server`
and `src/app` may import `src/server/**`, because those modules touch `/sys`
and `systeminformation` and must never reach the browser bundle.

## Development workflow

1. Create a branch off `main`.
2. Make your change, keeping commits focused.
3. Run the full check suite locally:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

4. Open a pull request using the template. CI runs the same three commands on
   Node 20 and 22; a red build will block the merge.

## Coding standards

- **TypeScript strict mode.** No `any`, no non-null assertions to silence the
  compiler. Model absent hardware data as `null` and handle it in the UI.
- **Naming.** `PascalCase.tsx` for React components, `camelCase.ts` for
  everything else, `index.ts` barrels for a directory's public surface.
- **Imports.** Use the `@/` alias to cross layers; use relative paths within a
  feature. Never import through a barrel from inside the same directory — that
  creates a cycle.
- **Comments.** Explain constraints and intent that the code cannot express
  (a hardware quirk, a unit conversion, a sysfs path that only exists on some
  kernels). Do not narrate what the next line does.
- **Units.** Keep raw units in the data layer (bytes, MHz, MT/s, °C, mWh) and
  format only at the presentation boundary via `src/lib/format.ts`.

## Adding hardware support

Collectors live in `src/server/hardware/`:

- `machine.ts` — static inventory, cached for 60 seconds.
- `live.ts` — sampled telemetry, never cached.
- `linux.ts` — Linux-specific parsing (CPU topology, hwmon, DDR5 SPD).

When you add a field:

1. Extend the type in `src/types/hardware.ts`. Make it nullable unless every
   supported platform can provide it.
2. Populate it in the collector, with a fallback for platforms that cannot.
3. Surface it in `src/lib/hardware/parts.ts` and add strings for **both**
   locales in `src/i18n/detail.ts`.

Never read anything that identifies the machine or its owner. See
[Privacy](README.md#privacy) for the boundary we hold.

## Internationalisation

English is the default and the source of truth. Every user-visible string lives
in `src/i18n/ui.ts` (interface chrome) or `src/i18n/detail.ts` (part
explanations and diagnostics), keyed by locale. A pull request that adds an
English string without its Chinese counterpart will be asked for changes.

## Reporting bugs

Open an issue with the bug template. A sanitised snapshot (`pnpm snapshot`)
attached to the issue is the single most useful thing you can provide — it
contains no serial numbers, MAC addresses, IP addresses, or UUIDs. Review it
before posting; it does include your hostname and disk model names.

## Security

Do not open a public issue for security problems. Follow
[SECURITY.md](SECURITY.md) instead.
