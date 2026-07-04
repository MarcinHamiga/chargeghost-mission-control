export const runtimeConfigPayload = {
  connection_url: "wss://localhost:3000/CP_1",
  ocpp_id: "CP_1",
  charge_point_model: "ChargeGhostV1",
  charge_point_vendor: "ChargeGhost",
  connectors: [{ voltage: 230, current: 32, phase: 1 }],
  security_profile: 2,
  skip_tls_verify: false,
  tls_ca_path: "/etc/ssl/certs/csms-ca.pem",
  tls_client_cert_path: null,
  tls_client_key_path: null,
  log_mode: "shallow",
  multi_evse_mode: false,
  ev_battery_capacity: 55,
  ocpp_version: "1.6",
  persist_message_queue: false,
  rfid_tag: null,
  ignored_version: "v0.2.0",
  connector_type: "cType2",
};

export const runtimeStatusPayload = {
  ocpp_connected: true,
  uptime_seconds: 3612.5,
  connectors: [
    {
      id: 1,
      status: "Available",
      voltage: 230,
      current: 32,
      phase: 3,
      is_plugged_in: false,
      id_tag: null,
    },
  ],
  active_sessions: [],
  energy_meters: { "1": { reading_wh: 0, is_charging: false } },
  reservations: [],
  pending_remote_starts: [
    {
      connector_id: 2,
      transaction_id: -1,
      id_tag: "RFID002",
      expiry: "2025-04-09T12:35:30Z",
    },
  ],
};

export const runtimeSessionStartPayload = {
  connector_id: 1,
  id_tag: "RFID001",
  timeout_seconds: 30,
};

export const runtimeConfigPatchResponse = {
  success: true,
  action: "restart_required",
  changed_fields: ["connection_url"],
  message: "Configuration updated in memory. Restart the process to apply startup-only changes.",
};

export const runtimeChargingProfilePostPayload = {
  connector_id: 1,
  profile: {
    profile_id: 10,
    connector_id: 1,
    stack_level: 0,
    purpose: "TxDefaultProfile",
    kind: "Absolute",
    schedule: {
      charging_rate_unit: "W",
      periods: [
        { start_period: 0, limit: 7400 },
        { start_period: 3600, limit: 11000 },
      ],
    },
  },
};

export const runtimeChargingProfileGetPayload = {
  profile_id: 10,
  connector_id: 1,
  stack_level: 0,
  purpose: "TxDefaultProfile",
  kind: "Absolute",
  schedule: {
    charging_rate_unit: "W",
    periods: [{ start_period: 0, limit: 7400 }],
  },
};

export const runtimeCompositeSchedulePayload = {
  periods: [
    { start_period: 0, limit: 7400 },
    { start_period: 3600, limit: 11000 },
  ],
};

export const runtimeLocalAuthListPayload = {
  version: 3,
  entry_count: 1,
  max_entries: 100,
  enabled: true,
  entries: [
    {
      id_tag: "RFID001",
      authorization_status: "Accepted",
      expiry_date: "2025-12-31T23:59:59Z",
      is_expired: false,
    },
  ],
};

export const runtimeLocalAuthPutPayload = {
  list_version: 4,
  update_type: "Differential" as const,
  entries: [
    {
      id_tag: "RFID001",
      status: "Accepted",
      expiry: "2025-12-31T23:59:59Z",
      parent_id_tag: "GROUP001",
    },
  ],
};

export const runtimeOcppStatusPayload = {
  version: "1.6",
  connected: true,
  connectedAt: "2025-04-09T12:00:00Z",
  reconnectCount: 2,
  upSince: "2025-04-09T11:00:00Z",
  csmsUrl: "wss://csms.example.com/ocpp/CP_1",
  ocppId: "CP_1",
  lastHeartbeatAt: "2025-04-09T12:34:00Z",
  lastHeartbeatRttMs: 84,
  heartbeatSuccesses: 17,
  heartbeatFailures: 1,
};

export const runtimeLastStoppedPayload = {
  transaction_id: -1,
  connector_id: 1,
  energy_charged_wh: 76.0533333333341,
  meter_stop: 76.0533333333341,
  reason: "user_requested",
  id_tag: null,
};

export const runtimeFirmwarePayload = {
  status: "Idle",
  location: null,
  retrieve_date: null,
  file_name: null,
  file_hash: null,
};

export const runtimeFirmwareArtifactPayload = {
  status: "Downloading",
  location: "https://example.com/firmware.bin",
  retrieve_date: "2026-04-10T10:00:00Z",
  file_name: "firmware.bin",
  file_hash: "abc123",
};

export const runtimeDiagnosticsPayload = {
  status: "Idle",
  location: null,
};

export const runtimeOcppKeyPayload = [
  {
    key: "ConnectionTimeOut",
    value: "30",
    readonly: false,
    type: "int",
  },
];

export const runtimeLocalAuthEntryPayload = {
  id_tag: "RFID001",
  authorization_status: "Accepted",
  expiry_date: "2025-12-31T23:59:59Z",
  is_expired: false,
  parent_id_tag: null,
};

export const runtimeStationSnapshotPayload = {
  station_id: "station-1",
  ocpp_id: "CP_1",
  enabled: true,
  lifecycle_state: "running",
  ocpp_version: "1.6",
  connection_url: "wss://localhost:3000/CP_1",
  connected: true,
  connector_count: 2,
  active_session_count: 1,
  queue_depth: 0,
  last_error: null,
  restart_required: false,
  uptime_seconds: 120.5,
};

export const runtimeOperationPayload = {
  id: "op-1",
  type: "restart",
  station_id: "station-1",
  state: "running",
  started_at: "2026-07-04T10:00:00Z",
};

export const runtimeOperationResponsePayload = {
  success: true,
  operation_id: "op-1",
  message: "Restart initiated",
  scope: "station",
  snapshot: runtimeStationSnapshotPayload,
};

export const runtimeQueueStatusPayload = {
  depth: 3,
  dropped: 1,
  cap: 0,
};

export const runtimeDeadLetterPayload = [
  {
    moved_at: "2026-07-04T10:05:00Z",
    reason: "max_retries_exceeded",
    message: {
      id: "msg-1",
      type: "StatusNotification",
      payload: { connector_id: 1, status: "Available" },
      created_at: "2026-07-04T10:00:00Z",
      last_attempt_at: "2026-07-04T10:04:00Z",
      retry_count: 5,
      max_retries: 5,
      last_error: "timeout",
      idempotency_key: "idem-1",
    },
  },
];
