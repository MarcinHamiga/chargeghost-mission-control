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

export interface ConfigResponse {
  connection_url: string;
  ocpp_id: string;
  ocpp_password?: string | null;
  charge_point_model: string;
  charge_point_vendor: string;
  connectors?: ConfigConnector[];
  skip_tls_verify: boolean;
  log_mode: string;
  multi_evse_mode: boolean;
  ev_battery_capacity: number;
  ocpp_version: string;
  persist_message_queue: boolean;
  rfid_tag: string | null;
  ignored_version?: string;
  connector_type?: string;
}

export type Config = ConfigResponse;

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

export interface StatusSnapshot {
  ocpp_connected: boolean;
  uptime_seconds?: number;
  connectors: Connector[];
  active_sessions: Session[];
  energy_meters: Record<string, EnergyMeter>;
}

export interface ConfigUpdateResponse extends StandardResponse {
  action: 'no-op' | 'bridge_restart_required' | 'runtime_rebuild_required' | 'rejected';
  changed_fields: string[];
}

export interface StoppedSession {
  transaction_id: number;
  connector_id: number;
  energy_charged_wh: number;
  meter_stop: number | null;
  reason: string | null;
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
  purpose: 'ChargePointMaxProfile' | 'TxDefaultProfile' | 'TxProfile';
  stack_level: number;
  charging_profile_kind: 'Absolute' | 'Recurring' | 'Relative';
  schedule_period: ChargingSchedulePeriod[];
}

export interface LocalAuthEntry {
  id_tag: string;
  status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid';
  expiry_date: string | null;
  parent_id_tag: string | null;
}

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
  status: string;
  current_version?: string | null;
  target_version?: string | null;
  progress?: number;
  error?: string | null;
  location?: string | null;
  retrieve_date?: string | null;
  file_name?: string | null;
  file_hash?: string | null;
}

export type DiagnosticsStatusValue = 'Idle' | 'Uploading' | 'Uploaded' | 'UploadFailed';

export interface DiagnosticsStatus {
  status: string;
  progress?: number;
  error?: string | null;
  location?: string | null;
}

export interface OcppConfigKey {
  key: string;
  value: string;
  readonly: boolean;
  supported?: boolean;
  type?: string;
}
