# API alignment tracker

Endpoint coverage vs [REST_API.md](../REST_API.md). Status: **wired** (client + UI), **client** (API only), **deferred**.

| Endpoint | Status | UI |
|----------|--------|-----|
| `GET /health` | wired | Sidebar (sidecar healthy on mount) |
| `GET /api/v1/status` | wired | WebSocket + REST fallback |
| `PUT …/availability` | wired | EVSE Simulator connector detail |
| `POST …/start-charging` | wired | Action panel (+ `timeout_seconds`) |
| `POST /sessions/start` | wired | Action panel (no `max_energy`) |
| `GET /ocpp/status` | wired | Settings → OCPP Link Health |
| `PUT /local-auth-list` | wired | Settings (PascalCase entries) |
| Charging profiles POST/GET | wired | EVSE Simulator (PascalCase wire format) |
| OCPP raw start/stop | client | Fault tab (deferred dedicated form) |
| WebSocket granular events | wired | `useWebSocket` + `ws-events.ts` |

**Intentional UX notes**

- Start charging uses `config.rfid_tag`, not connector RFID.
- `ev_battery_capacity` is kWh in config and REST.
- Local bridge (WS `:8080`) vs OCPP CSMS (`ocpp_connected` / `GET /ocpp/status`) are shown separately.
