# Security Policy

## Supported versions

PC·XRAY is pre-1.0. Only the latest commit on `main` receives security fixes.

## Threat model

PC·XRAY is a **local-first, single-user tool**. It reads hardware inventory and
sensor data from the machine it runs on and renders it in a browser. It has no
database, no authentication, no user accounts, and makes no outbound network
requests.

The security properties we intend to hold:

- **The dev and production servers bind to `127.0.0.1` only.** The `dev` and
  `start` scripts pass `-H 127.0.0.1`, so hardware details are not reachable
  from the local network.
- **No identifying data is collected.** Serial numbers, MAC addresses, IP
  addresses, and hardware UUIDs are excluded at the collector by field
  selection, not stripped afterwards. See `src/server/hardware/machine.ts`.
- **No elevated privileges are required.** All Linux collectors read
  world-readable paths under `/sys`. The application must never need `root`.
- **No telemetry.** Nothing leaves the machine.

Things that are explicitly **not** protected:

- The `/api/machine` and `/api/live` endpoints are unauthenticated. Anyone who
  can reach the port can read your hardware inventory. If you deliberately bind
  the server to a routable address, you accept that exposure.
- An imported snapshot is treated as untrusted display data and is shape-checked
  before use, but it is not schema-validated field by field.

## Reporting a vulnerability

Please report privately through GitHub's
[security advisory form](https://github.com/kerwin2046/pc-xray/security/advisories/new).
If that is unavailable, email <chenyilong916002@gmail.com> with
`PC-XRAY SECURITY` in the subject line.

Include the affected version or commit, the impact, and reproduction steps.

We aim to acknowledge a report within 5 days and to ship a fix or a mitigation
plan within 30 days. Please give us that window before disclosing publicly. We
are happy to credit you in the advisory unless you prefer otherwise.

## Scope

In scope: privilege escalation, reading files outside the documented collector
paths, command injection in the collectors, unintended network exposure, and
code execution via a crafted snapshot import.

Out of scope: results that require the user to have already bound the server to
a public interface, denial of service from deliberately malformed local sysfs
data, and issues in upstream dependencies that have no PC·XRAY-specific impact
(report those upstream).
