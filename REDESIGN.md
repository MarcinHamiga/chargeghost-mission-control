# ChargeGhost Mission Control — Frontend Redesign Spec

> **Companion visual mockup:** an interactive prototype of the Operate stage, OCPP
> Timeline, design tokens, and roadmap is published as a Claude Artifact. This document
> is the implementation reference: it maps the redesign onto the actual `src/` layers.

**Goal.** Rebuild the view layer so Mission Control feels like a native macOS desktop app
rather than a responsive website in a window — while keeping ChargeGhost's teal
(`#00FFCC`) ghost-and-bolt identity intact. Desktop only; no mobile breakpoints.

**Non-goal.** This is a **view-layer redesign**. The data layer stays: `src/lib/api.ts`,
`src/lib/types.ts`, `src/store/*`, `src/hooks/useWebSocket.ts`, `useTelemetrySampler.ts`,
and the normalizers/tests are kept as-is. If a change touches them, it's called out.

---

## 1. Principles

1. **Read at a glance, act at a keystroke.** Live state (V, A, kW, kWh, SoC, CSMS link)
   is always visible as instrument readouts. The three actions that run ~90% of sessions —
   **Plug, Start, Stop** — are one keystroke each.
2. **Native, not responsive.** Frameless window, custom titlebar, command palette, real
   menu bar, global shortcuts, resizable + persisted panes. Delete all `md:`/`sm:`
   breakpoint logic — it's dead weight on a fixed desktop target.
3. **The connector is the subject.** Nearly every action targets one connector. A
   persistent selector at the top of the stage fixes context; the whole screen reflects
   the selected connector. This already exists as `state.selectedConnectorId` — lean into it.

---

## 2. Information architecture

Current 5 tabs mix a monitoring dashboard, a 1,090-line "everything" `SimulatorView`, and
a Fault panel inlined directly in `src/example.tsx`. Restructure by job-to-be-done:

| Today | → | Redesign |
|---|---|---|
| Dashboard (+ Simulator overlap) | → | **Operate** — connector-centric stage: monitor + drive one connector in one place |
| EVSE Simulator (1,090 LOC, 9 stacked sections) | → | **Connectors** — topology & detail; Reservations / Profiles / Firmware become focused sub-tabs, not one endless scroll |
| OCPP Logs | → | **OCPP Timeline** — same data, dense table, live tail, correlation, errors-only toggle |
| Fault Injection (inlined in shell) | → | **Fault Lab** — real component, scenario presets, per-connector faults, one-click recovery |
| Settings | → | **Settings** — demoted to bottom of rail; OCPP link health moves to the titlebar |

Nav model: a **56px icon rail** (not a text sidebar), tooltips on hover, `⌘1`–`⌘5` to jump.
Global status leaves the sidebar footer and moves to the **titlebar**.

---

## 3. Design tokens

Replace the `@theme` block in `src/index.css`. The identity change: neon `#00FFCC` becomes
a **signal reserved for live/energized state**; a calmer teal and green-biased neutrals
carry structure, so the accent *means something* when it glows. Also update
`BRAND_ACCENT` in `src/lib/brand.ts` (keep `#00ffcc`) and the splash `#0a0c10` → new ground.

```css
@theme {
  /* Ground + surface ramp — near-black, cool teal bias (chosen, not neutral grey) */
  --color-ground:    #070b0e;   /* window base            (was --bg-main #0a0c10) */
  --color-surface-1: #0c1217;   /* rail, panels           */
  --color-surface-2: #121b21;   /* raised panels          */
  --color-surface-3: #18232b;   /* cards, inputs          */
  --color-surface-4: #1e2b33;   /* hover / active fills    */

  --color-line:        #24323b; /* borders                */
  --color-line-bright: #35474f; /* strong borders, kbd    */

  /* Teal — split into two roles */
  --color-teal:      #00ffcc;   /* LIVE only: charging, active power, primary CTA */
  --color-teal-calm: #17bda0;   /* structure, links, calm accents (text-safe)     */
  --color-teal-deep: #0b4a41;   /* teal borders on dark                            */

  /* Neutrals, green-biased so they read chosen */
  --color-text:   #e8f1ed;
  --color-text-2: #899a93;
  --color-text-3: #5a6a64;

  /* Semantic — distinct from the accent hue */
  --color-available: #46c98a;
  --color-warn:      #f4b13a;   /* SuspendedEV/EVSE, warnings */
  --color-critical:  #ff5d67;   /* Faulted, errors           */
  --color-info:      #5aa8ff;   /* inbound RX protocol dir    */
  --color-reserved:  #9d8cff;

  /* Native system faces — zero webfont payload, instant native texture */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, monospace;
}
```

**Type rules.** Headings SF Pro 650–800 with `-0.02em` tracking. All numeric readouts,
IDs, timestamps use `--font-mono` with `font-variant-numeric: tabular-nums` so live values
don't jitter as digits change. Uppercase labels get `+0.12em` letter-spacing.

**Connector status → pill.** Encode state in *form and color*, not color alone:
`Charging` teal-live (glows) · `Available` green · `SuspendedEV/EVSE` amber ·
`Faulted` critical · `Reserved` violet · `Unavailable/Preparing/Finishing` muted.

**Motion.** Purposeful only: live dot + chart endpoint pulse; panes ease on resize;
palette springs in. Everything behind `@media (prefers-reduced-motion: reduce)`.

---

## 4. Component library (new `src/components/ui/`)

Extract shared primitives to kill the ad-hoc `className` soup (the codebase repeats button
and pill class strings dozens of times):

- **`Button`** — variants: `primary` (teal gradient), `ghost`, `danger`; optional `kbd` hint slot.
- **`Panel`** / **`PanelHeader`** — replaces the `.glass-card` pattern; solid surfaces, less blur.
- **`StatePill`** — connector status; single source of truth for status→color mapping
  (currently duplicated in `SimulatorView.tsx`, `ConnectorStrip.tsx`, `example.tsx`).
- **`Gauge`** — instrument readout (label + mono value + unit + optional sparkline).
- **`Kbd`** — keyboard hint chip.
- **`Select`** — keep the existing portal-based `Select.tsx`, restyle to tokens.

---

## 5. Screen specs

### 5.1 Shell (`src/example.tsx` → rename intent to `App`)
- **Frameless window** (`decorations: false` in `tauri.conf.json`), custom **titlebar**:
  traffic-light inset (macOS), app name + `ocpp_id`, and a right-aligned **live vitals
  cluster** (CSMS link, bridge health, OCPP version, uptime) fed by `state` +
  `state.snapshot.ocpp_connected`. Add `data-tauri-drag-region` for window dragging.
- **Icon rail** replaces the collapsible text sidebar. Drop `SIDEBAR_COLLAPSED_KEY` logic.
- Move the bridge/CSMS status card out of the sidebar footer into the titlebar.

### 5.2 Operate (new default; replaces Dashboard)
- Persistent **connector selector** (segmented control) bound to `selectedConnectorId`.
- **Gauge row:** Voltage, Current, Power, Energy, SoC — from `currentConnector()`,
  `energyMeter()`, `getConnectorTelemetry()`, and `active_sessions` SoC.
- **Telemetry chart** (keep Chart.js / `TelemetryChart.tsx`, restyle): area fill under the
  teal line, faint grid, glowing endpoint dot.
- **Action rail:** state-aware buttons with single-key shortcuts — `P` plug/unplug,
  `S` start/stop, `U` suspend/resume. Availability driven by `connector.status` +
  `is_plugged_in` (mirror the rules already in `ActionPanel.tsx`).
- **Live OCPP stream** panel (reuse `OCPPStream.tsx`, restyle to the mono table).

### 5.3 Connectors (splits `SimulatorView.tsx`, 1,090 LOC)
Break the single scroll into a sub-tab set, each its own file:
`ConnectorsView` (topology + detail/edit), `ReservationsView`, `ChargingProfilesView`,
`FirmwareDiagnosticsView`. Shared state stays in `store/simulator.ts`; the WS invalidation
counters (`wsInvalidation.firmware` etc.) already scope refetches — keep them.

### 5.4 OCPP Timeline (`OCPPLogsView.tsx`)
Dense mono table, **virtualized rows** (timeline grows unbounded), inline expandable
payload, request/response **correlation** via `correlation_key`, **live tail** toggle
(pin newest), sticky filter bar, and a single **Errors-only** toggle instead of four
separate filter fields. Resizable pane + focus mode (hide chrome).

### 5.5 Fault Lab (promote out of `example.tsx`)
Real component. **Scenario presets** (EV comm error, high-temp cutoff, grid overvoltage)
as first-class cards, per-connector fault buttons, and a **one-click recovery** so you can
verify the charger's OCPP error handling and return to a clean state.

### 5.6 Settings (`SettingsPanel.tsx`)
Keep functionality; restyle to tokens. Link health leaves this panel (now in titlebar).
Group: Charge Point · OCPP config keys · Local Auth List · TLS.

---

## 6. Native desktop features

| Feature | Implementation notes |
|---|---|
| Custom titlebar + drag | `decorations: false`; `data-tauri-drag-region`; render traffic-lights or use macOS `titleBarStyle: overlay` |
| Command palette (`⌘K`) | New `CommandPalette.tsx` overlay; fuzzy list of actions + connector jumps + view nav + fault presets, scoped to `selectedConnectorId` |
| Native menu bar | Tauri `Menu` in `src-tauri/src/lib.rs`; emit events → Solid handlers; accelerators mirror in-app shortcuts |
| Global + local shortcuts | Central `useHotkeys` hook: `⌘1–5` views, `P/S/U` actions, `⌘K` palette, `?` cheat-sheet, `⌘F` focus timeline filter |
| Persisted window/pane state | `tauri-plugin-window-state`; split positions in `localStorage` |
| Native notifications | `@tauri-apps/plugin-notification` for session ended / connector faulted / OCPP disconnected when window is backgrounded (in-app toasts stay for foreground) |
| Density + focus modes | `data-density="compact|comfortable"` on root; focus mode maximizes the timeline |

---

## 7. Keyboard map

```
⌘K            Command palette              ⌘1  Operate        P   Plug / Unplug
⌘F            Focus timeline filter        ⌘2  Connectors     S   Start / Stop
?             Shortcut cheat-sheet         ⌘3  OCPP Timeline  U   Suspend / Resume
Esc           Close palette / overlay      ⌘4  Fault Lab      ↵   Confirm in palette
⌘,            Settings                     ⌘5  Settings       ⌘⌥F Focus mode
```

---

## 8. Roadmap (incremental — app stays working at every step)

- **Phase 0 — Foundation (~½ day):** new `@theme` tokens, system font stack + tabular-nums,
  extract `ui/` primitives (Button, Panel, StatePill, Gauge, Kbd).
- **Phase 1 — Shell (~1–2 days):** frameless window + custom titlebar w/ live vitals, icon
  rail, `⌘1–5`, persisted window state, native menu bar.
- **Phase 2 — Operate stage (~2 days):** connector selector, gauge row, restyled chart,
  action rail w/ single-key shortcuts, live stream, state-aware actions.
- **Phase 3 — Command palette (~1–2 days):** `⌘K` fuzzy palette (context-aware) + native
  notifications.
- **Phase 4 — Break up the giant (~2–3 days):** split `SimulatorView`, promote Fault Lab,
  dense virtualized OCPP Timeline w/ correlation + resizable pane + focus mode.
- **Phase 5 — Polish (~1 day):** density toggle, motion pass, empty/error/loading states,
  shortcut cheat-sheet. Optional i18n catalog extraction (nice-to-have, non-blocking).

**i18n** is intentionally deferred to Phase 5 and optional: extract user-facing strings into
a simple catalog if desired, but it is not a blocker for any earlier phase.
