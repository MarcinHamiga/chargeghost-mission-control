import type {
  Config,
  ConfigConnector,
  ConfigLogMode,
  DiagnosticsStatus,
  DiagnosticsStatusValue,
  FirmwareStatus,
  FirmwareStatusValue,
  OcppConfigKey,
  OcppVersion,
  StoppedSession,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function readString(value: unknown, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const CONFIG_LOG_MODES: ConfigLogMode[] = ["debug", "info", "warn", "error"];

function normalizeLogMode(value: unknown): ConfigLogMode {
  if (typeof value !== "string") return "info";
  const v = value.trim().toLowerCase();
  if (v === "shallow") return "info";
  return CONFIG_LOG_MODES.includes(v as ConfigLogMode) ? (v as ConfigLogMode) : "info";
}

function normalizeOcppVersion(value: unknown): OcppVersion {
  return typeof value === "string" && value.trim() === "2.0.1" ? "2.0.1" : "1.6";
}

const FIRMWARE_STATUS_MAP: Record<string, FirmwareStatusValue> = {
  idle: "Idle",
  downloading: "Downloading",
  downloaded: "Downloaded",
  installing: "Installing",
  installed: "Installed",
  installationfailed: "InstallationFailed",
};

function normalizeFirmwareStatusValue(value: unknown): FirmwareStatusValue {
  if (typeof value !== "string") return "Idle";
  return FIRMWARE_STATUS_MAP[value.trim().toLowerCase()] ?? "Idle";
}

const DIAGNOSTICS_STATUS_MAP: Record<string, DiagnosticsStatusValue> = {
  idle: "Idle",
  uploading: "Uploading",
  uploaded: "Uploaded",
  uploadfailed: "UploadFailed",
};

function normalizeDiagnosticsStatusValue(value: unknown): DiagnosticsStatusValue {
  if (typeof value !== "string") return "Idle";
  return DIAGNOSTICS_STATUS_MAP[value.trim().toLowerCase()] ?? "Idle";
}

function normalizeConnector(payload: unknown): ConfigConnector {
  const p = asRecord(payload);
  const phase = readNumber(p.phase, 1);
  return {
    voltage: readNumber(p.voltage),
    current: readNumber(p.current),
    phase: phase === 1 || phase === 3 ? phase : 1,
  };
}

export function normalizeConfig(payload: unknown): Config {
  const p = asRecord(payload);
  return {
    connection_url: readString(p.connection_url),
    ocpp_id: readString(p.ocpp_id),
    ocpp_password: p.ocpp_password === null ? null : optionalString(p.ocpp_password) ?? undefined,
    charge_point_model: readString(p.charge_point_model),
    charge_point_vendor: readString(p.charge_point_vendor),
    connectors: Array.isArray(p.connectors) ? p.connectors.map(normalizeConnector) : undefined,
    skip_tls_verify: readBoolean(p.skip_tls_verify),
    log_mode: normalizeLogMode(p.log_mode),
    multi_evse_mode: readBoolean(p.multi_evse_mode),
    ev_battery_capacity: readNumber(p.ev_battery_capacity),
    ocpp_version: normalizeOcppVersion(p.ocpp_version),
    persist_message_queue: readBoolean(p.persist_message_queue),
    rfid_tag: optionalString(p.rfid_tag),
    ignored_version: typeof p.ignored_version === "string" ? p.ignored_version : undefined,
    connector_type: typeof p.connector_type === "string" ? p.connector_type : undefined,
  };
}

export function normalizeStoppedSession(payload: unknown): StoppedSession {
  const p = asRecord(payload);
  return {
    transaction_id: readNumber(p.transaction_id, -1),
    connector_id: readNumber(p.connector_id),
    energy_charged_wh: readNumber(p.energy_charged_wh),
    meter_stop: readNumber(p.meter_stop),
    reason: readString(p.reason),
    id_tag: optionalString(p.id_tag),
  };
}

export function normalizeFirmwareStatus(payload: unknown): FirmwareStatus {
  const p = asRecord(payload);
  return {
    status: normalizeFirmwareStatusValue(p.status ?? p.Status),
    current_version: optionalString(p.current_version ?? p.CurrentVersion) ?? undefined,
    target_version: optionalString(p.target_version ?? p.TargetVersion) ?? undefined,
    progress: optionalNumber(p.progress ?? p.Progress),
    error: optionalString(p.error ?? p.Error),
    location: optionalString(p.location ?? p.Location),
    retrieve_date: optionalString(p.retrieve_date ?? p.RetrieveDate),
    file_name: optionalString(p.file_name ?? p.FileName),
    file_hash: optionalString(p.file_hash ?? p.FileHash),
  };
}

export function normalizeDiagnosticsStatus(payload: unknown): DiagnosticsStatus {
  const p = asRecord(payload);
  return {
    status: normalizeDiagnosticsStatusValue(p.status ?? p.Status),
    progress: optionalNumber(p.progress ?? p.Progress),
    error: optionalString(p.error ?? p.Error),
    location: optionalString(p.location ?? p.Location),
  };
}

export function normalizeOcppConfigKeys(payload: unknown): OcppConfigKey[] {
  if (!Array.isArray(payload)) return [];

  return payload.map((entry) => {
    const p = asRecord(entry);
    return {
      key: readString(p.key),
      value: readString(p.value),
      readonly: readBoolean(p.readonly),
      supported: typeof p.supported === "boolean" ? p.supported : undefined,
      type: typeof p.type === "string" ? p.type : undefined,
    };
  });
}
