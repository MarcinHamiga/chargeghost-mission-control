# ChargeGhost Mission Control

ChargeGhost Mission Control is the desktop frontend for [ChargeGhost Core](https://github.com/MarcinHamiga/chargeghost-core).

This repository contains the Tauri + Solid.js UI only. The simulation engine and OCPP engine live in ChargeGhost Core.

## What It Does

Mission Control is the operator console for ChargeGhost Core. It provides live visibility into charger state and a set of controls for driving the simulator, inspecting OCPP traffic, and changing runtime configuration.

The app currently exposes 5 main user-facing areas:

- Dashboard with live telemetry, connection status, and quick actions
- EVSE Simulator for connector, session, reservation, profile, firmware, and diagnostics controls
- OCPP Logs for timeline browsing and filtering
- Fault Injection for recovery and error-path testing
- Settings for charge point, OCPP, and local authorization data

In total, the frontend covers 30+ ChargeGhost-Core actions and API endpoints across those areas.

## Important

- Working simulation and OCPP engines are included only in release builds.
- For development, you must provide your own engine builds or download them from the [ChargeGhost-Core releases](https://github.com/MarcinHamiga/chargeghost-core/releases).
- The app expects the core binary as a Tauri sidecar named `chargeghost-core`.

## Requirements

- Node.js and Bun
- Rust toolchain
- A `chargeghost-core` binary placed in `src-tauri/bin/`

## Development

```bash
bun install
bun run tauri dev
```

If you only want the frontend in the browser:

```bash
bun run dev
```

## Build

```bash
bun run build
bun run tauri build
```

## Available Scripts

- `bun run dev` - start the Vite dev server
- `bun run build` - build the frontend
- `bun run tauri dev` - run the desktop app in development mode
- `bun run tauri build` - build the desktop app for release
- `bun test` - run tests
- `bun run typecheck` - run TypeScript type checking

## Notes

- The UI talks to the core over HTTP and WebSocket.
- If the sidecar is missing, the desktop app will not be able to start the simulator.
