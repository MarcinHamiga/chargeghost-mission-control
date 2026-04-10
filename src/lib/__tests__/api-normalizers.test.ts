import { describe, expect, it } from "vitest";
import {
  runtimeConfigPayload,
  runtimeDiagnosticsPayload,
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

  it("normalizes runtime config payloads without dropping nullable RFID", () => {
    expect(normalizeConfig(runtimeConfigPayload)).toMatchObject({
      ocpp_id: "CP_1",
      log_mode: "shallow",
      rfid_tag: null,
    });
  });

  it("normalizes firmware status from PascalCase fields", () => {
    expect(normalizeFirmwareStatus(runtimeFirmwarePayload).status).toBe("Idle");
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
