import type { SetStoreFunction } from "solid-js/store";
import type { SimulatorStore } from "../store/simulator";
import type { ConnectorStatus, Reservation, Session, StatusSnapshot } from "./types";
import { addToast } from "../store/toast";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function patchConnector(
  setState: SetStoreFunction<SimulatorStore>,
  connectorId: number,
  patch: Partial<StatusSnapshot["connectors"][number]>,
) {
  setState("snapshot", "connectors", (c) => c.id === connectorId, (prev) => ({ ...prev, ...patch }));
}

function upsertSession(
  setState: SetStoreFunction<SimulatorStore>,
  connectorId: number,
  session: Partial<Session> & { connector_id: number },
) {
  setState("snapshot", (prev) => {
    if (!prev) return prev;
    const sessions = [...prev.active_sessions];
    const idx = sessions.findIndex((s) => s.connector_id === connectorId);
    const merged: Session = {
      transaction_id: session.transaction_id ?? (idx >= 0 ? sessions[idx].transaction_id : -1),
      connector_id: connectorId,
      energy_charged_wh: session.energy_charged_wh ?? (idx >= 0 ? sessions[idx].energy_charged_wh : 0),
      state_of_charge: session.state_of_charge ?? (idx >= 0 ? sessions[idx].state_of_charge : 0),
      start_time: session.start_time ?? (idx >= 0 ? sessions[idx].start_time : new Date().toISOString()),
      id_tag: session.id_tag !== undefined ? session.id_tag : idx >= 0 ? sessions[idx].id_tag : null,
      is_charging: session.is_charging ?? (idx >= 0 ? sessions[idx].is_charging : true),
    };
    if (idx >= 0) sessions[idx] = merged;
    else sessions.push(merged);
    return { ...prev, active_sessions: sessions };
  });
}

function removeSession(setState: SetStoreFunction<SimulatorStore>, connectorId: number) {
  setState("snapshot", "active_sessions", (sessions) =>
    sessions.filter((s) => s.connector_id !== connectorId),
  );
}

function bumpInvalidation(
  setState: SetStoreFunction<SimulatorStore>,
  key: keyof SimulatorStore["wsInvalidation"],
) {
  setState("wsInvalidation", key, (n) => n + 1);
}

export function handleWebSocketEvent(
  type: string,
  data: unknown,
  setState: SetStoreFunction<SimulatorStore>,
  options: { refetchStatus?: () => Promise<void> } = {},
) {
  const d = asRecord(data);

  switch (type) {
    case "connector_status_changed": {
      const id = readNumber(d.connector_id);
      patchConnector(setState, id, {
        status: readString(d.status, "Available") as ConnectorStatus,
        ...(typeof d.is_plugged_in === "boolean" ? { is_plugged_in: d.is_plugged_in } : {}),
      });
      break;
    }
    case "connector_plug_changed":
      patchConnector(setState, readNumber(d.connector_id), {
        is_plugged_in: readBoolean(d.is_plugged_in),
      });
      break;
    case "connector_id_tag_changed":
      patchConnector(setState, readNumber(d.connector_id), {
        id_tag: d.id_tag === null || typeof d.id_tag === "string" ? d.id_tag : null,
      });
      break;
    case "connector_params_changed":
      patchConnector(setState, readNumber(d.connector_id), {
        voltage: readNumber(d.voltage),
        current: readNumber(d.current),
        phase: d.phase === 3 ? 3 : 1,
      });
      break;
    case "session_started":
      upsertSession(setState, readNumber(d.connector_id), {
        connector_id: readNumber(d.connector_id),
        transaction_id: readNumber(d.transaction_id, -1),
        id_tag: typeof d.id_tag === "string" ? d.id_tag : null,
        is_charging: true,
      });
      break;
    case "transaction_id_changed": {
      const connectorId = readNumber(d.connector_id);
      setState("snapshot", "active_sessions", (s) => s.connector_id === connectorId, "transaction_id", readNumber(d.transaction_id));
      break;
    }
    case "session_stopped":
      removeSession(setState, readNumber(d.connector_id));
      break;
    case "reservation_changed":
      void options.refetchStatus?.();
      break;
    case "connection_state_changed":
      setState("snapshot", "ocpp_connected", readBoolean(d.connected));
      break;
    case "ocpp_connected":
      setState("snapshot", "ocpp_connected", true);
      addToast("success", "OCPP CSMS connected");
      break;
    case "ocpp_disconnected":
      setState("snapshot", "ocpp_connected", false);
      addToast("error", `OCPP CSMS disconnected${d.reason ? `: ${d.reason}` : ""}`);
      break;
    case "ocpp_reconnected":
      setState("snapshot", "ocpp_connected", true);
      addToast("info", `OCPP CSMS reconnected (count: ${readNumber(d.reconnectCount)})`);
      break;
    case "ocpp_queue_overflow":
      addToast(
        "error",
        `OCPP queue overflow: ${readString(d.description, "command")} (depth ${readNumber(d.queueDepth)}/${readNumber(d.queueCap)})`,
      );
      break;
    case "display_message_set":
      addToast("info", `Display: ${readString(d.text, readString(d.id, "message"))}`);
      break;
    case "cost_updated":
      addToast("info", `Cost updated for tx ${readNumber(d.transaction_id)}: ${readNumber(d.total_cost)}`);
      break;
    case "firmware_status_changed":
      bumpInvalidation(setState, "firmware");
      break;
    case "diagnostics_status_changed":
      bumpInvalidation(setState, "diagnostics");
      break;
    case "ocpp_config_key_changed":
    case "ocpp_variable_changed":
      bumpInvalidation(setState, "ocppKeys");
      break;
    case "charging_profile_changed":
      bumpInvalidation(setState, "chargingProfiles");
      break;
    default:
      break;
  }
}

export function patchReservationsFromSnapshot(
  setState: SetStoreFunction<SimulatorStore>,
  reservations: Reservation[] | undefined,
) {
  if (reservations !== undefined) {
    setState("snapshot", "reservations", reservations);
  }
}
