# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

ChargeGhost Mission Control — a Tauri desktop app for monitoring and controlling an EV charger simulator (`chargeghost-core`). The frontend is Solid.js + TypeScript; the backend is Rust (Tauri shell). The core simulator runs as a sidecar binary spawned by Tauri at startup.

## Commands

```bash
# Frontend dev server (port 1420)
bun run dev

# Full Tauri app (compiles Rust + launches window with embedded frontend)
bun run tauri dev

# Production build
bun run tauri build

# Frontend-only build
bun run build
```

No test runner or linter is currently configured.

## Architecture

### Runtime Model

Tauri spawns `chargeghost-core` as a sidecar process (`src-tauri/src/lib.rs`). The frontend communicates with the core over HTTP (`localhost:8080/api/v1`) and WebSocket (`localhost:8080/ws`). Tauri itself only bridges logging (`log_to_terminal` command) and manages the sidecar lifecycle — all charger logic lives in the sidecar.

### Frontend Layers

- **State** — Solid.js stores in `src/store/`. `simulator.ts` holds the main snapshot, selected connector, and connection status. `toast.ts` manages notifications. No external state library — pure Solid.js `createStore`/`createSignal`.
- **API client** — `src/lib/api.ts`, a class-based singleton (`api`) wrapping fetch calls to the sidecar REST API. Custom `APIError` class. All endpoints documented in `REST_API.md`.
- **WebSocket** — `src/hooks/useWebSocket.ts` establishes a WS connection for real-time state snapshots. Falls back to REST polling (2s) when WS is disconnected. Auto-reconnects with 2s delay.
- **Components** — `src/components/`. Tab-based UI: dashboard, simulator (`SimulatorView.tsx` is the largest), OCPP logs, fault injection, settings. Connector-centric — most views operate on a single selected connector.
- **Types** — `src/lib/types.ts` defines 40+ interfaces matching the sidecar API schema.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. Utility composition with `clsx` + `tailwind-merge`. Icons from `lucide-solid`.

### Key Config

- `src-tauri/tauri.conf.json` — window size (800×600), CSP allows `localhost:8080`, sidecar binary bundling
- `vite.config.ts` — Solid.js + Tailwind plugins, HMR on port 1421
- TypeScript strict mode, ES2020 target, JSX preserved for Solid

## Important Patterns

- The app entry is `src/index.tsx` → `src/example.tsx` (misleading name — this is the main `App` component).
- Chart.js is used for telemetry (`TelemetryChart.tsx`) with `date-fns` adapter.
- Frontend logging goes through Tauri's `invoke("log_to_terminal")` in `src/lib/logger.ts`.
- The sidecar binary must exist at `src-tauri/bin/` for `tauri dev` to work.
