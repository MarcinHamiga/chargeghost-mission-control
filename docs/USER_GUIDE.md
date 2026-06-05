# ChargeGhost Mission Control — User Guide

ChargeGhost Mission Control is a desktop application for monitoring and controlling an **EV charger simulator** (`chargeghost-core`). Use it to run charging sessions, inspect OCPP traffic, inject faults, and configure how the simulated charge point connects to a Central System (CSMS).

The app does not implement charger logic itself. It launches the simulator as a background process and talks to it over HTTP and WebSocket on `localhost:8080`.

---

## Table of contents

1. [Getting started](#getting-started)
2. [Application layout](#application-layout)
3. [Dashboard](#dashboard)
4. [EVSE Simulator](#evse-simulator)
5. [OCPP Logs](#ocpp-logs)
6. [Fault Injection](#fault-injection)
7. [Settings](#settings)
8. [Common workflows](#common-workflows)
9. [Status indicators and connectivity](#status-indicators-and-connectivity)
10. [Notifications and confirmations](#notifications-and-confirmations)
11. [Troubleshooting](#troubleshooting)
12. [Glossary](#glossary)

---

## Getting started

### Requirements

- A built or bundled copy of **ChargeGhost Mission Control** (Tauri desktop app), or a development environment with [Bun](https://bun.sh), Rust, and the Tauri CLI for local builds.
- The **chargeghost-core** sidecar binary bundled with the app (included automatically when you run `bun run tauri dev` or install a release build).

### Launching the app

**Desktop (recommended):**

```bash
bun run tauri dev    # development
bun run tauri build  # production installer
```

When the window opens, the sidecar starts automatically. The main view shows *Initializing Mission Control…* until the first status snapshot arrives.

**Frontend only (limited):**

```bash
bun run dev
```

This runs the UI on port 1420 but **does not** start the simulator. Most features will not work without the sidecar on port 8080.

### First-time setup

1. Open **Settings** and set your **OCPP Connection URL** and **Charge Point ID** to match your CSMS.
2. Choose **OCPP Version** (1.6 or 2.0.1) and security options as required by your backend.
3. Click **Save Changes**. Some fields apply immediately; connection-related changes may require restarting the sidecar process.
4. Confirm **CSMS · connected** in the sidebar status card once the charge point registers with your central system.

---

## Application layout

### Sidebar

The left sidebar provides navigation and system status:

| Item | Purpose |
|------|---------|
| **Dashboard** | Live telemetry, power chart, quick actions, OCPP stream preview |
| **EVSE Simulator** | Full connector management, sessions, reservations, profiles |
| **OCPP Logs** | Searchable, filterable OCPP message timeline |
| **Fault Injection** | Simulate faults and trigger OCPP maintenance actions |
| **Settings** | Charge point configuration, OCPP keys, local auth list |

At the bottom of the sidebar:

- **Version** — app version and supported OCPP versions
- **Bridge status** — connection between Mission Control and the sidecar
- **CSMS status** — whether the simulator is connected to the central system
- **Uptime** — how long the sidecar has been running
- **Pending remote starts** — count of queued remote-start requests (when applicable)
- **Collapse** — toggle a compact sidebar (preference is saved in the browser storage)

### Connector selection

Most views are **connector-centric**. Use the **connector strip** (horizontal row of connector cards) to choose which EVSE you are operating on. The selected connector is highlighted with a teal border.

Each connector card shows:

- Connector number and OCPP status (e.g. Available, Charging, Faulted)
- A teal dot when the cable is **plugged in**
- A pulsing icon while **charging**

---

## Dashboard

The Dashboard is the primary operational view for day-to-day simulation.

### Header

- **INSTANCE** — the configured OCPP charge point ID (`ocpp_id`)
- **Connector strip** — switch between connectors

### Telemetry cards

Four live metrics for the **selected connector**:

| Metric | Description |
|--------|-------------|
| **Voltage** | Output voltage (V) |
| **Current** | Output current (A) |
| **Power** | Delivered power (kW), derived from telemetry sampling |
| **Energy** | Cumulative meter reading (kWh) |

### Power Delivery Profile chart

A rolling **60-second** line chart of active power (watts) for the selected connector. The window scrolls forward in real time as new samples arrive.

### Simulation Actions panel

Quick controls for the selected connector (same actions as on the EVSE Simulator tab):

| Action | Description |
|--------|-------------|
| **Plug In** | Simulate connecting a vehicle (required before charging) |
| **Start Charging** | Begin a transaction using the default RFID tag from config |
| **Stop Charging** | End the active transaction |
| **Suspend EV** | Pause charging (EV-side suspend) |
| **Resume Charging** | Resume after suspend |
| **Unplug** | Disconnect the vehicle |
| **Set Connector RFID** | Assign an ID tag to this connector |
| **Start Session** | Start a full session (with optional ID tag and timeout) |

**Notes:**

- **Start Charging** uses `config.rfid_tag`, not the per-connector RFID tag.
- **Start timeout** (optional): if the connector is unplugged, the start can be queued until plug-in or the timeout expires.
- **Start Session** uses `ev_battery_capacity` from config for state-of-charge simulation. You can override the ID tag and set a session timeout.

Buttons are disabled when the action is not valid for the current connector state (e.g. you cannot start charging if already charging or unplugged).

### OCPP Stream

A live feed of the **20 most recent** OCPP timeline events, refreshed every 3 seconds:

- **SENT** (teal) — outbound messages from the charge point
- **RECV** (blue) — inbound messages from the CSMS

For full search, filters, and pagination, use the **OCPP Logs** tab.

### Fault Scenarios shortcuts

Links that jump to the **Fault Injection** tab for common test scenarios.

---

## EVSE Simulator

The EVSE Simulator tab provides detailed control over hardware simulation, sessions, and OCPP-adjacent features.

### Connectors

**Add Connector** creates a new EVSE with:

- Voltage: 120–1000 V
- Current: 1–500 A
- Phase: 1-phase or 3-phase

For each connector you can:

- View status, voltage, current, phase, and plug-in state
- Set **Operative** / **Inoperative** availability
- **Edit** electrical parameters
- **Delete** the connector (confirmation required)

### Active session

When charging, a panel shows:

- Transaction ID
- Energy delivered (kWh)
- State of charge (%)
- Session start time
- SoC progress bar

### Energy meter

Per-connector meter reading and whether metering is active.

### Session history

- **Last completed session** — transaction ID, connector, energy, meter stop, stop reason
- **Show** — expand to list all sessions (active and stopped)

### Reservations

Create OCPP-style reservations with:

- Reservation ID, connector ID, ID tag, expiry date
- Optional parent ID tag

Active reservations can be cancelled from the list.

### Charging profiles

Manage **SetChargingProfile** schedules:

- Create profiles with purpose (ChargePointMaxProfile, TxDefaultProfile, TxProfile), kind (Absolute, Recurring, Relative), rate unit (W or A), stack level, and one or more schedule periods
- **Composite** viewer — query the effective schedule for a connector over a duration (seconds)
- Delete individual profiles

### Firmware and diagnostics

Simulate OCPP firmware update and diagnostics upload flows:

- **Firmware** — provide a download URL and retrieve date; monitor status and progress; cancel while active
- **Diagnostics** — provide upload URL, retries, and retry interval; monitor progress; cancel while active

The **Simulation Actions** panel on the right mirrors the Dashboard actions for the selected connector.

---

## OCPP Logs

The OCPP Logs tab is a full **message timeline** for debugging CSMS integration.

### Toolbar

- **Event count** — events on current page vs total in store
- **Refresh** — reload the current page
- **Clear** — delete all timeline events (confirmation required)

### Filters

Combine any of:

- **Search** — free-text search
- **Source** — OCPP Adapter, CSMS, or all
- **Direction** — Inbound, Outbound, or all
- **Event type** — free-text filter
- **Action** — OCPP action name (BootNotification, Heartbeat, StartTransaction, etc.)
- **Connector ID** / **Transaction ID** — numeric filters

Results are paginated (50 events per page).

### Event details

Click a row to expand the full JSON payload and correlation key.

The list auto-refreshes every 3 seconds.

---

## Fault Injection

Use this tab to stress-test error handling and OCPP edge cases. Actions take effect immediately on the simulator and may generate OCPP status or error notifications toward the CSMS.

### Connector faults

Per connector:

- **Zero Output** — set voltage and current to 0
- **Overvoltage** — set voltage to 265 V

### Session control

- **Emergency Stop All Sessions** — stop every active session
- **Suspend EV** — shown for each connector currently charging

### OCPP actions

- **Send Manual Heartbeat** — force a Heartbeat toward the CSMS
- **Authorize** — send an Authorize request with a custom ID tag
- **Trigger Firmware Update** — example URL-based update (for protocol testing)
- **Trigger Diagnostics Upload** — example diagnostics upload

These maintenance triggers use placeholder URLs suitable for protocol testing; configure real URLs on the EVSE Simulator tab for detailed control.

---

## Settings

### Charge point settings

| Setting | Purpose |
|---------|---------|
| **OCPP Connection URL** | WebSocket URL of the CSMS |
| **Charge Point ID** | OCPP identity (`ocpp_id`) |
| **OCPP Password** | Authentication password if required |
| **Security Profile** | OCPP security profile (0–2) |
| **Charge Point Model / Vendor** | BootNotification metadata |
| **Default RFID Tag** | Used by Start Charging and as session default |
| **EV Battery Capacity** | kWh used for SoC simulation |
| **OCPP Version** | 1.6 or 2.0.1 |
| **TLS paths** | CA, client cert, and key file paths |
| **Log Level** | debug, info, warn, error |
| **Skip TLS Verification** | Disable TLS certificate verification (testing only) |
| **Multi-EVSE Mode** | Enable multi-connector EVSE behavior |
| **Persist Message Queue** | Persist offline OCPP message queue |

Click **Save Changes** to apply edits. The UI reports whether changes were applied immediately or need a process restart (e.g. connection URL, TLS, OCPP version).

**Startup Connectors** (read-only) shows connectors defined in the on-disk config at launch. Runtime connectors added in the Simulator tab are managed separately.

### OCPP link health

Detailed CSMS connection metrics when available:

- OCPP version, connected state, round-trip time
- Reconnect count, heartbeat success/failure counts
- Message queue depth

Use **Refresh** to update. If the health endpoint is unavailable, rely on the sidebar **CSMS · connected** indicator.

### OCPP configuration keys

Browse and edit CSMS-managed configuration keys:

- **RW** keys are editable (click value, Enter to save, Escape to cancel)
- **RO** keys are read-only

### Local authorization list

Manage offline authorization entries:

- View enabled state, version, and entry count
- **Add Entry** — ID tag, status (Accepted, Blocked, Expired, Invalid, ConcurrentTx), optional expiry
- **Delete** individual entries or **Clear All**

---

## Common workflows

### Basic local charging session

1. Select a connector on the Dashboard.
2. Click **Plug In**.
3. Click **Start Charging** (uses default RFID from Settings) or **Start Session** with a custom tag.
4. Watch telemetry and the power chart update.
5. Click **Stop Charging**, then **Unplug**.

### Test remote start from CSMS

1. Configure the connection URL and charge point ID in Settings; ensure **CSMS · connected**.
2. Send **RemoteStartTransaction** from your CSMS.
3. If the connector is unplugged, Mission Control may show **pending remote start(s)** in the sidebar.
4. **Plug In** within the CSMS timeout to accept the remote start.

### Inspect OCPP during a session

1. Keep the Dashboard **OCPP Stream** visible for a quick view, or open **OCPP Logs**.
2. Filter by action (e.g. `MeterValues`, `StartTransaction`) or transaction ID.
3. Expand rows to inspect payloads.

### Simulate a fault

1. Start a charging session.
2. Open **Fault Injection** → **Zero Output** or **Overvoltage** on the connector.
3. Observe connector status and OCPP **StatusNotification** / error handling on the CSMS.
4. Restore normal parameters by editing the connector on the EVSE Simulator tab.

### Configure charging limits

1. Open **EVSE Simulator** → **Charging Profiles** → **Add**.
2. Define schedule periods and limits.
3. Use **Composite** to verify the effective schedule.
4. Confirm **SetChargingProfile** / **MeterValues** behavior in OCPP Logs.

---

## Status indicators and connectivity

Mission Control uses two layers of connectivity:

### Bridge (Mission Control ↔ sidecar)

| Indicator | Meaning |
|-----------|---------|
| **Bridge · healthy** | WebSocket connected; sidecar health check OK |
| **Bridge · WebSocket** | WebSocket connected |
| **Bridge · connecting** | Establishing WebSocket |
| **Bridge · REST fallback** | WebSocket down; status polled every 2 seconds |

The WebSocket reconnects automatically every 2 seconds after a disconnect.

### CSMS (sidecar ↔ central system)

| Indicator | Meaning |
|-----------|---------|
| **CSMS · connected** | Simulator registered with the central system |
| **CSMS · disconnected** | No active CSMS connection |

Sidebar coloring: teal when both bridge and CSMS are healthy; red tint when either is down.

---

## Notifications and confirmations

### Toasts

Short-lived messages appear for action results:

- **Success** — action completed (e.g. charging started, config saved)
- **Error** — API or validation failure with a short description
- **Info** — neutral updates (e.g. availability changed)

### Confirm dialogs

Destructive actions ask for confirmation:

- Delete connector
- Clear OCPP timeline
- Clear local auth list

Click **Confirm** or **Cancel**, or click outside the dialog to cancel.

---

## Troubleshooting

### Stuck on “Initializing Mission Control…”

- Ensure the sidecar is running (launch via `bun run tauri dev`, not frontend-only `bun run dev`).
- Verify nothing else is blocking port **8080**.
- Check that `chargeghost-core` exists in the app bundle (`src-tauri/bin/` for development).

### CSMS · disconnected

- Verify **OCPP Connection URL** and **Charge Point ID** in Settings.
- Check TLS settings and certificates for secure profiles.
- Confirm the CSMS is reachable and accepts the configured OCPP version.
- Some connection changes require restarting the sidecar after save.

### Actions disabled or failing

- Check connector state: plug in before starting; only stop/suspend while charging.
- Read the toast error message — it often reflects OCPP rejection (e.g. invalid state transition).
- Refresh status via navigation or wait for the next WebSocket snapshot.

### OCPP Logs empty

- No traffic until the charge point connects and sessions occur.
- Clear filters if events exist but are hidden.
- Timeline is separate from the live stream — use **Refresh** after external activity.

### Chart shows flat zero

- Power updates when the connector is delivering energy (typically while charging).
- Ensure the correct connector is selected.

---

## Glossary

| Term | Definition |
|------|------------|
| **CSMS** | Central System Management System — the OCPP backend |
| **EVSE** | Electric Vehicle Supply Equipment — a charge point connector |
| **OCPP** | Open Charge Point Protocol |
| **ID tag / RFID tag** | Token used to authorize a charging session |
| **Transaction** | An OCPP charging session with a unique transaction ID |
| **Sidecar** | The `chargeghost-core` simulator process spawned by the desktop app |
| **Bridge** | The HTTP/WebSocket link between Mission Control and the sidecar |
| **SoC** | State of charge — simulated battery percentage during a session |
| **Charging profile** | OCPP schedule that limits power or current over time |

---

## Related documentation

- [REST_API.md](../REST_API.md) — HTTP API reference for the sidecar (for integrators and advanced users)
- [README.md](../README.md) — project overview and development setup
