export const runtimeConfigPayload = {
  connection_url: "wss://localhost:3000/CP_1",
  ocpp_id: "CP_1",
  charge_point_model: "ChargeGhostV1",
  charge_point_vendor: "ChargeGhost",
  connectors: [{ voltage: 230, current: 32, phase: 1 }],
  skip_tls_verify: false,
  log_mode: "shallow",
  multi_evse_mode: false,
  ev_battery_capacity: 55,
  ocpp_version: "1.6",
  persist_message_queue: false,
  rfid_tag: null,
  ignored_version: "v0.2.0",
  connector_type: "cType2",
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
  Status: "Idle",
  Location: null,
  RetrieveDate: null,
  FileName: null,
  FileHash: null,
};

export const runtimeFirmwareArtifactPayload = {
  Status: "Downloading",
  Location: "https://example.com/firmware.bin",
  RetrieveDate: "2026-04-10T10:00:00Z",
  FileName: "firmware.bin",
  FileHash: "abc123",
};

export const runtimeDiagnosticsPayload = {
  Status: "Idle",
  Location: null,
};

export const runtimeOcppKeyPayload = [
  {
    key: "ConnectionTimeOut",
    value: "30",
    readonly: false,
    type: "int",
  },
];
