export type ConnectorStatus =
  | 'Available'
  | 'Preparing'
  | 'Charging'
  | 'SuspendedEV'
  | 'SuspendedEVSE'
  | 'Finishing'
  | 'Reserved'
  | 'Unavailable'
  | 'Faulted';

export interface StandardResponse {
  success: boolean;
  message: string;
  details?: any;
}

export interface HealthStatus {
  status: 'ok';
}

export interface AboutInfo {
  version: string;
  description: string;
  ocpp_versions: string[];
  features: string[];
  license: string;
  copyright: string;
}

export interface Connector {
  id: number;
  status: ConnectorStatus;
  voltage: number;
  current: number;
  phase: 1 | 3;
  is_plugged_in: boolean;
  id_tag: string | null;
}

export interface ConfigConnector {
  voltage: number;
  current: number;
  phase: 1 | 3;
}

export type ConfigLogMode = 'debug' | 'info' | 'warn' | 'error';
export type OcppVersion = '1.6' | '2.0.1';

export interface Config {
  connection_url: string;
  ocpp_id: string;
  ocpp_password?: string | null;
  charge_point_model: string;
  charge_point_vendor: string;
  connectors?: ConfigConnector[];
  security_profile?: number;
  skip_tls_verify: boolean;
  tls_ca_path?: string | null;
  tls_client_cert_path?: string | null;
  tls_client_key_path?: string | null;
  log_mode: ConfigLogMode;
  multi_evse_mode: boolean;
  ev_battery_capacity: number;
  ocpp_version: OcppVersion;
  persist_message_queue: boolean;
  rfid_tag: string | null;
  ignored_version?: string;
  connector_type?: string;
}

export interface Session {
  transaction_id: number;
  connector_id: number;
  energy_charged_wh: number;
  state_of_charge: number;
  start_time: string; // ISO8601
  id_tag: string | null;
  is_charging: boolean;
}

export interface EnergyMeter {
  reading_wh: number;
  is_charging: boolean;
}

export interface PendingRemoteStart {
  connector_id: number;
  transaction_id: number;
  id_tag: string | null;
  expiry: string;
}

export interface StatusSnapshot {
  ocpp_connected: boolean;
  uptime_seconds?: number;
  connectors: Connector[];
  active_sessions: Session[];
  energy_meters: Record<string, EnergyMeter>;
  reservations?: Reservation[];
  pending_remote_starts?: PendingRemoteStart[];
}

export type ConfigUpdateAction = "no-op" | "applied" | "restart_required";

export interface ConfigUpdateResponse extends StandardResponse {
  action: ConfigUpdateAction;
  changed_fields: string[];
}

export interface SessionStartOptions {
  id_tag?: string;
  timeout_seconds?: number;
}

export interface StopAllSessionsDetails {
  stopped_count?: number;
}

export interface StoppedSession {
  transaction_id: number;
  connector_id: number;
  energy_charged_wh: number;
  meter_stop: number;
  reason: string;
  id_tag: string | null;
}

export interface Reservation {
  reservation_id: number;
  connector_id: number;
  id_tag: string;
  expiry_date: string; // ISO8601
  parent_id_tag: string | null;
}

export interface ChargingSchedulePeriod {
  start_period: number;
  limit: number;
  number_phases?: number;
}

export interface ChargingProfile {
  profile_id: number;
  connector_id: number;
  purpose: "ChargePointMaxProfile" | "TxDefaultProfile" | "TxProfile";
  stack_level: number;
  charging_profile_kind: "Absolute" | "Recurring" | "Relative";
  charging_rate_unit?: "W" | "A";
  schedule_period: ChargingSchedulePeriod[];
}

export type LocalAuthStatus =
  | "Accepted"
  | "Blocked"
  | "Expired"
  | "Invalid"
  | "ConcurrentTx";

export interface LocalAuthEntry {
  id_tag: string;
  authorization_status: LocalAuthStatus;
  expiry_date: string | null;
  is_expired: boolean;
  parent_id_tag?: string | null;
}

export interface LocalAuthPutEntry {
  IDTag: string;
  Status: string;
  Expiry?: string;
  ParentIDTag?: string;
  Delete?: boolean;
}

export interface OcppStatus {
  version: string;
  connected: boolean;
  connectedAt?: string;
  disconnectedAt?: string;
  lastMessageAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  reconnectCount: number;
  upSince: string;
  csmsUrl: string;
  ocppId: string;
  lastHeartbeatAt?: string;
  lastHeartbeatRttMs?: number;
  heartbeatSuccesses: number;
  heartbeatFailures: number;
  queueDepth?: number;
  queueExhausted?: number;
  queueDropped?: number;
  drainInProgress?: boolean;
}

export type ConnectorAvailability = "Operative" | "Inoperative";

export interface LocalAuthList {
  version: number;
  entry_count: number;
  max_entries: number;
  enabled: boolean;
  entries: LocalAuthEntry[];
}

export interface TimelineEvent {
  event_id: string;
  timestamp: string; // ISO8601
  source: string;
  direction: string;
  event_type: string;
  action: string;
  message_id: string;
  connector_id: number | null;
  transaction_id: number | null;
  level: string;
  summary: string;
  payload: any;
  correlation_key: string | null;
  tags: string[];
}

export interface TimelineResponse {
  events: TimelineEvent[];
  total: number;
}

export type FirmwareStatusValue =
  | 'Idle'
  | 'Downloading'
  | 'Downloaded'
  | 'Installing'
  | 'Installed'
  | 'InstallationFailed';

export interface FirmwareStatus {
  status: FirmwareStatusValue;
  location?: string | null;
  retrieve_date?: string | null;
  file_name?: string | null;
  file_hash?: string | null;
}

export type DiagnosticsStatusValue = 'Idle' | 'Uploading' | 'Uploaded' | 'UploadFailed';

export interface DiagnosticsStatus {
  status: DiagnosticsStatusValue;
  location?: string | null;
}

export interface OcppConfigKey {
  key: string;
  value: string;
  readonly: boolean;
  type?: string;
}
