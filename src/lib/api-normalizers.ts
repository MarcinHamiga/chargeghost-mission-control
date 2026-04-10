import type {
  ConfigConnector,
  ConfigResponse,
  DiagnosticsStatus,
  FirmwareStatus,
  OcppConfigKey,
  StoppedSession,
} from "./types";

function asRecord(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null ? (value as Record<string, any>) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeConnector(payload: unknown): ConfigConnector {
  const p = asRecord(payload);
  return {
    voltage: asNumber(p.voltage),
    current: asNumber(p.current),
    phase: p.phase === 3 ? 3 : 1,
  };
}

export function normalizeConfig(payload: unknown): ConfigResponse {
  const p = asRecord(payload);
  return {
    connection_url: asString(p.connection_url),
    ocpp_id: asString(p.ocpp_id),
    ocpp_password: p.ocpp_password ?? null,
    charge_point_model: asString(p.charge_point_model),
    charge_point_vendor: asString(p.charge_point_vendor),
    connectors: Array.isArray(p.connectors) ? p.connectors.map(normalizeConnector) : undefined,
    skip_tls_verify: Boolean(p.skip_tls_verify),
    log_mode: asString(p.log_mode),
    multi_evse_mode: Boolean(p.multi_evse_mode),
    ev_battery_capacity: asNumber(p.ev_battery_capacity),
    ocpp_version: asString(p.ocpp_version, "1.6"),
    persist_message_queue: Boolean(p.persist_message_queue),
    rfid_tag: p.rfid_tag ?? null,
    ignored_version: typeof p.ignored_version === "string" ? p.ignored_version : undefined,
    connector_type: typeof p.connector_type === "string" ? p.connector_type : undefined,
  };
}

export function normalizeStoppedSession(payload: unknown): StoppedSession {
  const p = asRecord(payload);
  return {
    transaction_id: asNumber(p.transaction_id),
    connector_id: asNumber(p.connector_id),
    energy_charged_wh: asNumber(p.energy_charged_wh),
    meter_stop: typeof p.meter_stop === "number" ? p.meter_stop : null,
    reason: typeof p.reason === "string" ? p.reason : null,
    id_tag: p.id_tag ?? null,
  };
}

export function normalizeFirmwareStatus(payload: unknown): FirmwareStatus {
  const p = asRecord(payload);
  const status = asString(p.status ?? p.Status, "Idle");
  return {
    status,
    current_version: p.current_version ?? p.CurrentVersion ?? p.FileName ?? null,
    target_version: p.target_version ?? p.TargetVersion ?? null,
    progress: p.progress ?? p.Progress ?? 0,
    error: p.error ?? p.Error ?? null,
    location: p.location ?? p.Location ?? null,
    retrieve_date: p.retrieve_date ?? p.RetrieveDate ?? null,
    file_name: p.file_name ?? p.FileName ?? null,
    file_hash: p.file_hash ?? p.FileHash ?? null,
  };
}

export function normalizeDiagnosticsStatus(payload: unknown): DiagnosticsStatus {
  const p = asRecord(payload);
  return {
    status: asString(p.status ?? p.Status, "Idle"),
    progress: p.progress ?? p.Progress ?? 0,
    error: p.error ?? p.Error ?? null,
    location: p.location ?? p.Location ?? null,
  };
}

export function normalizeOcppConfigKeys(payload: unknown): OcppConfigKey[] {
  if (!Array.isArray(payload)) return [];

  return payload.map((entry) => {
    const p = asRecord(entry);
    return {
      key: asString(p.key),
      value: asString(p.value),
      readonly: Boolean(p.readonly),
      supported: typeof p.supported === "boolean" ? p.supported : undefined,
      type: typeof p.type === "string" ? p.type : undefined,
    };
  });
}
