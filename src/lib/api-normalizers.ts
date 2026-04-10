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

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid or missing ${field} in API response`);
  }
  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid or missing ${field} in API response`);
  }
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid or missing ${field} in API response`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeConnector(payload: unknown): ConfigConnector {
  const p = asRecord(payload);
  return {
    voltage: requireNumber(p.voltage, "connectors[].voltage"),
    current: requireNumber(p.current, "connectors[].current"),
    phase: p.phase === 3 ? 3 : 1,
  };
}

export function normalizeConfig(payload: unknown): ConfigResponse {
  const p = asRecord(payload);
  return {
    connection_url: requireString(p.connection_url, "connection_url"),
    ocpp_id: requireString(p.ocpp_id, "ocpp_id"),
    ocpp_password: p.ocpp_password ?? null,
    charge_point_model: requireString(p.charge_point_model, "charge_point_model"),
    charge_point_vendor: requireString(p.charge_point_vendor, "charge_point_vendor"),
    connectors: Array.isArray(p.connectors) ? p.connectors.map(normalizeConnector) : undefined,
    skip_tls_verify: requireBoolean(p.skip_tls_verify, "skip_tls_verify"),
    log_mode: requireString(p.log_mode, "log_mode"),
    multi_evse_mode: requireBoolean(p.multi_evse_mode, "multi_evse_mode"),
    ev_battery_capacity: requireNumber(p.ev_battery_capacity, "ev_battery_capacity"),
    ocpp_version: requireString(p.ocpp_version, "ocpp_version"),
    persist_message_queue: requireBoolean(p.persist_message_queue, "persist_message_queue"),
    rfid_tag: p.rfid_tag ?? null,
    ignored_version: typeof p.ignored_version === "string" ? p.ignored_version : undefined,
    connector_type: typeof p.connector_type === "string" ? p.connector_type : undefined,
  };
}

export function normalizeStoppedSession(payload: unknown): StoppedSession {
  const p = asRecord(payload);
  return {
    transaction_id: requireNumber(p.transaction_id, "transaction_id"),
    connector_id: requireNumber(p.connector_id, "connector_id"),
    energy_charged_wh: requireNumber(p.energy_charged_wh, "energy_charged_wh"),
    meter_stop: requireNumber(p.meter_stop, "meter_stop"),
    reason: requireString(p.reason, "reason"),
    id_tag: p.id_tag ?? null,
  };
}

export function normalizeFirmwareStatus(payload: unknown): FirmwareStatus {
  const p = asRecord(payload);
  return {
    status: requireString(p.status ?? p.Status, "status"),
    current_version: optionalString(p.current_version ?? p.CurrentVersion),
    target_version: optionalString(p.target_version ?? p.TargetVersion),
    progress: optionalNumber(p.progress ?? p.Progress),
    error: optionalString(p.error ?? p.Error) ?? null,
    location: optionalString(p.location ?? p.Location) ?? null,
    retrieve_date: optionalString(p.retrieve_date ?? p.RetrieveDate) ?? null,
    file_name: optionalString(p.file_name ?? p.FileName) ?? null,
    file_hash: optionalString(p.file_hash ?? p.FileHash) ?? null,
  };
}

export function normalizeDiagnosticsStatus(payload: unknown): DiagnosticsStatus {
  const p = asRecord(payload);
  return {
    status: requireString(p.status ?? p.Status, "status"),
    progress: optionalNumber(p.progress ?? p.Progress),
    error: optionalString(p.error ?? p.Error) ?? null,
    location: optionalString(p.location ?? p.Location) ?? null,
  };
}

export function normalizeOcppConfigKeys(payload: unknown): OcppConfigKey[] {
  if (!Array.isArray(payload)) return [];

  return payload.map((entry) => {
    const p = asRecord(entry);
    return {
      key: requireString(p.key, "key"),
      value: requireString(p.value, "value"),
      readonly: requireBoolean(p.readonly, "readonly"),
      supported: typeof p.supported === "boolean" ? p.supported : undefined,
      type: typeof p.type === "string" ? p.type : undefined,
    };
  });
}
