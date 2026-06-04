import type {
  ChargingProfile,
  ChargingSchedulePeriod,
  Config,
  ConfigConnector,
  ConfigLogMode,
  ConfigUpdateResponse,
  DiagnosticsStatus,
  DiagnosticsStatusValue,
  FirmwareStatus,
  FirmwareStatusValue,
  LocalAuthEntry,
  LocalAuthList,
  LocalAuthStatus,
  OcppConfigKey,
  OcppStatus,
  OcppVersion,
  PendingRemoteStart,
  Reservation,
  StatusSnapshot,
  StoppedSession,
} from "./types";
import { normalizeConfigUpdateAction } from "./http";

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
    security_profile: optionalNumber(p.security_profile),
    skip_tls_verify: readBoolean(p.skip_tls_verify),
    tls_ca_path: optionalString(p.tls_ca_path),
    tls_client_cert_path: optionalString(p.tls_client_cert_path),
    tls_client_key_path: optionalString(p.tls_client_key_path),
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

export function normalizeConfigUpdateResponse(payload: unknown): ConfigUpdateResponse {
  const p = asRecord(payload);
  return {
    success: readBoolean(p.success, true),
    message: readString(p.message),
    details: p.details,
    action: normalizeConfigUpdateAction(p.action),
    changed_fields: Array.isArray(p.changed_fields)
      ? p.changed_fields.filter((f): f is string => typeof f === "string")
      : [],
  };
}

const LOCAL_AUTH_STATUSES: LocalAuthStatus[] = [
  "Accepted",
  "Blocked",
  "Expired",
  "Invalid",
  "ConcurrentTx",
];

function normalizeLocalAuthStatus(value: unknown): LocalAuthStatus {
  if (typeof value !== "string") return "Invalid";
  const match = LOCAL_AUTH_STATUSES.find((s) => s.toLowerCase() === value.toLowerCase());
  return match ?? "Invalid";
}

export function normalizeLocalAuthEntry(payload: unknown): LocalAuthEntry {
  const p = asRecord(payload);
  const idTag = readString(p.id_tag ?? p.IDTag);
  const authorizationStatus = normalizeLocalAuthStatus(
    p.authorization_status ?? p.Status ?? p.status,
  );
  const expiry = optionalString(p.expiry_date ?? p.Expiry);
  return {
    id_tag: idTag,
    authorization_status: authorizationStatus,
    expiry_date: expiry,
    is_expired: readBoolean(p.is_expired, false),
    parent_id_tag: optionalString(p.parent_id_tag ?? p.ParentIDTag),
  };
}

export function normalizeLocalAuthList(payload: unknown): LocalAuthList {
  const p = asRecord(payload);
  return {
    version: readNumber(p.version),
    entry_count: readNumber(p.entry_count),
    max_entries: readNumber(p.max_entries),
    enabled: readBoolean(p.enabled),
    entries: Array.isArray(p.entries) ? p.entries.map(normalizeLocalAuthEntry) : [],
  };
}

function normalizeSchedulePeriod(payload: unknown): ChargingSchedulePeriod {
  const p = asRecord(payload);
  const period: ChargingSchedulePeriod = {
    start_period: readNumber(p.start_period ?? p.StartPeriod),
    limit: readNumber(p.limit ?? p.Limit),
  };
  const phases = p.number_phases ?? p.NumberPhases;
  if (typeof phases === "number") period.number_phases = phases;
  return period;
}

export function normalizeChargingProfile(payload: unknown): ChargingProfile {
  const p = asRecord(payload);
  const schedule = asRecord(p.Schedule ?? p.schedule);
  const periodsRaw = schedule.Periods ?? schedule.periods ?? p.schedule_period;
  const periods = Array.isArray(periodsRaw) ? periodsRaw.map(normalizeSchedulePeriod) : [];
  const unit = schedule.ChargingRateUnit ?? schedule.charging_rate_unit;
  return {
    profile_id: readNumber(p.profile_id ?? p.ProfileID),
    connector_id: readNumber(p.connector_id ?? p.ConnectorID),
    purpose: readString(p.purpose ?? p.Purpose, "TxDefaultProfile") as ChargingProfile["purpose"],
    stack_level: readNumber(p.stack_level ?? p.StackLevel),
    charging_profile_kind: readString(p.charging_profile_kind ?? p.Kind, "Absolute") as ChargingProfile["charging_profile_kind"],
    charging_rate_unit:
      unit === "A" || unit === "W" ? unit : undefined,
    schedule_period: periods,
  };
}

export function normalizeChargingProfiles(payload: unknown): ChargingProfile[] {
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeChargingProfile);
}

export function normalizeCompositeSchedule(payload: unknown): { periods: ChargingSchedulePeriod[] } {
  const p = asRecord(payload);
  const periodsRaw = p.periods ?? p.Periods;
  return {
    periods: Array.isArray(periodsRaw) ? periodsRaw.map(normalizeSchedulePeriod) : [],
  };
}

function normalizeReservation(payload: unknown): Reservation {
  const p = asRecord(payload);
  return {
    reservation_id: readNumber(p.reservation_id),
    connector_id: readNumber(p.connector_id),
    id_tag: readString(p.id_tag),
    expiry_date: readString(p.expiry_date),
    parent_id_tag: optionalString(p.parent_id_tag),
  };
}

function normalizePendingRemoteStart(payload: unknown): PendingRemoteStart {
  const p = asRecord(payload);
  return {
    connector_id: readNumber(p.connector_id),
    transaction_id: readNumber(p.transaction_id),
    id_tag: readString(p.id_tag),
    expiry: readString(p.expiry),
  };
}

export function normalizeStatusSnapshot(payload: unknown): StatusSnapshot {
  const p = asRecord(payload);
  return {
    ocpp_connected: readBoolean(p.ocpp_connected),
    uptime_seconds: optionalNumber(p.uptime_seconds),
    connectors: Array.isArray(p.connectors) ? (p.connectors as StatusSnapshot["connectors"]) : [],
    active_sessions: Array.isArray(p.active_sessions)
      ? (p.active_sessions as StatusSnapshot["active_sessions"])
      : [],
    energy_meters: (typeof p.energy_meters === "object" && p.energy_meters !== null
      ? p.energy_meters
      : {}) as StatusSnapshot["energy_meters"],
    reservations: Array.isArray(p.reservations) ? p.reservations.map(normalizeReservation) : undefined,
    pending_remote_starts: Array.isArray(p.pending_remote_starts)
      ? p.pending_remote_starts.map(normalizePendingRemoteStart)
      : undefined,
  };
}

export function normalizeOcppStatus(payload: unknown): OcppStatus {
  const p = asRecord(payload);
  return {
    version: readString(p.version),
    connected: readBoolean(p.connected),
    connectedAt: optionalString(p.connectedAt) ?? undefined,
    disconnectedAt: optionalString(p.disconnectedAt) ?? undefined,
    lastMessageAt: optionalString(p.lastMessageAt) ?? undefined,
    lastError: optionalString(p.lastError) ?? undefined,
    lastErrorAt: optionalString(p.lastErrorAt) ?? undefined,
    reconnectCount: readNumber(p.reconnectCount),
    upSince: readString(p.upSince),
    csmsUrl: readString(p.csmsUrl),
    ocppId: readString(p.ocppId),
    lastHeartbeatAt: optionalString(p.lastHeartbeatAt) ?? undefined,
    lastHeartbeatRttMs: optionalNumber(p.lastHeartbeatRttMs),
    heartbeatSuccesses: readNumber(p.heartbeatSuccesses),
    heartbeatFailures: readNumber(p.heartbeatFailures),
    queueDepth: optionalNumber(p.queueDepth),
    queueExhausted: optionalNumber(p.queueExhausted),
    queueDropped: optionalNumber(p.queueDropped),
    drainInProgress: typeof p.drainInProgress === "boolean" ? p.drainInProgress : undefined,
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
