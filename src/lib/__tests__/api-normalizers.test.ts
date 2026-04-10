import { describe, expect, it } from "vitest";
import {
  runtimeConfigPayload,
  runtimeDiagnosticsPayload,
  runtimeFirmwareArtifactPayload,
  runtimeFirmwarePayload,
  runtimeLastStoppedPayload,
  runtimeOcppKeyPayload,
} from "./api-contract-fixtures";
import {
  normalizeConfig,
  normalizeDiagnosticsStatus,
  normalizeFirmwareStatus,
  normalizeOcppConfigKeys,
  normalizeStoppedSession,
} from "../api-normalizers";

describe("api normalizers", () => {
  it("normalizes stopped session payloads", () => {
    expect(normalizeStoppedSession(runtimeLastStoppedPayload)).toMatchObject({
      transaction_id: -1,
      connector_id: 1,
      meter_stop: 76.0533333333341,
      reason: "user_requested",
    });
  });

  it("normalizes runtime config payloads, mapping shallow log_mode to info", () => {
    const result = normalizeConfig(runtimeConfigPayload);
    expect(result).toMatchObject({
      ocpp_id: "CP_1",
      log_mode: "info",
      rfid_tag: null,
      ocpp_version: "1.6",
    });
  });

  it("normalizes firmware status from PascalCase fields", () => {
    expect(normalizeFirmwareStatus(runtimeFirmwarePayload)).toMatchObject({
      status: "Idle",
      file_name: null,
    });
  });

  it("preserves firmware file names without collapsing them into versions", () => {
    expect(normalizeFirmwareStatus(runtimeFirmwareArtifactPayload)).toMatchObject({
      status: "Downloading",
      file_name: "firmware.bin",
      current_version: undefined,
    });
  });

  it("normalizes diagnostics status from PascalCase fields", () => {
    expect(normalizeDiagnosticsStatus(runtimeDiagnosticsPayload).status).toBe("Idle");
  });

  it("preserves OCPP key type metadata", () => {
    expect(normalizeOcppConfigKeys(runtimeOcppKeyPayload)[0]).toMatchObject({
      key: "ConnectionTimeOut",
      type: "int",
    });
  });
});

describe("api normalizers — error paths", () => {
  it("returns defaults for completely empty config payload", () => {
    const result = normalizeConfig({});
    expect(result.connection_url).toBe("");
    expect(result.ocpp_id).toBe("");
    expect(result.log_mode).toBe("info");
    expect(result.ocpp_version).toBe("1.6");
    expect(result.skip_tls_verify).toBe(false);
    expect(result.ev_battery_capacity).toBe(0);
  });

  it("returns defaults for null input", () => {
    const result = normalizeConfig(null);
    expect(result.connection_url).toBe("");
    expect(result.log_mode).toBe("info");
  });

  it("returns defaults for undefined input", () => {
    const result = normalizeStoppedSession(undefined);
    expect(result.transaction_id).toBe(-1);
    expect(result.connector_id).toBe(0);
    expect(result.reason).toBe("");
    expect(result.id_tag).toBeNull();
  });

  it("defaults firmware status to Idle for unrecognized values", () => {
    const result = normalizeFirmwareStatus({ Status: "SomethingNew" });
    expect(result.status).toBe("Idle");
  });

  it("defaults firmware status to Idle for non-string values", () => {
    const result = normalizeFirmwareStatus({ status: 42 });
    expect(result.status).toBe("Idle");
  });

  it("defaults diagnostics status to Idle for unrecognized values", () => {
    const result = normalizeDiagnosticsStatus({ Status: "BogusStatus" });
    expect(result.status).toBe("Idle");
  });

  it("returns empty array for non-array OCPP config keys input", () => {
    expect(normalizeOcppConfigKeys("not an array")).toEqual([]);
    expect(normalizeOcppConfigKeys(null)).toEqual([]);
    expect(normalizeOcppConfigKeys(42)).toEqual([]);
  });

  it("defaults connector phase to 1 for invalid phase values", () => {
    const result = normalizeConfig({
      connection_url: "ws://test",
      ocpp_id: "CP_1",
      charge_point_model: "M",
      charge_point_vendor: "V",
      connectors: [{ voltage: 230, current: 32, phase: 2 }],
      skip_tls_verify: false,
      log_mode: "debug",
      multi_evse_mode: false,
      ev_battery_capacity: 50,
      ocpp_version: "1.6",
      persist_message_queue: false,
      rfid_tag: null,
    });
    expect(result.connectors![0].phase).toBe(1);
  });

  it("allows phase 3 for connectors", () => {
    const result = normalizeConfig({
      connection_url: "ws://test",
      ocpp_id: "CP_1",
      charge_point_model: "M",
      charge_point_vendor: "V",
      connectors: [{ voltage: 400, current: 32, phase: 3 }],
      skip_tls_verify: false,
      log_mode: "debug",
      multi_evse_mode: false,
      ev_battery_capacity: 50,
      ocpp_version: "1.6",
      persist_message_queue: false,
      rfid_tag: null,
    });
    expect(result.connectors![0].phase).toBe(3);
  });

  it("defaults log_mode for unknown values", () => {
    const result = normalizeConfig({ ...runtimeConfigPayload, log_mode: "trace" });
    expect(result.log_mode).toBe("info");
  });

  it("normalizes ocpp_version 2.0.1", () => {
    const result = normalizeConfig({ ...runtimeConfigPayload, ocpp_version: "2.0.1" });
    expect(result.ocpp_version).toBe("2.0.1");
  });

  it("defaults ocpp_version for unknown values", () => {
    const result = normalizeConfig({ ...runtimeConfigPayload, ocpp_version: "3.0" });
    expect(result.ocpp_version).toBe("1.6");
  });
});
