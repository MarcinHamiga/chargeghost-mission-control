import { describe, expect, it } from "vitest";
import {
  runtimeConfigPayload,
  runtimeDiagnosticsPayload,
  runtimeFirmwarePayload,
  runtimeLastStoppedPayload,
  runtimeOcppKeyPayload,
} from "./api-contract-fixtures";

describe("api normalizers", () => {
  it("normalizes stopped session payloads", async () => {
    // Intentional red test: this module is not implemented yet.
    // @ts-expect-error missing until Task 3
    const { normalizeStoppedSession } = await import("../api-normalizers");

    expect(normalizeStoppedSession(runtimeLastStoppedPayload)).toMatchObject({
      transaction_id: -1,
      connector_id: 1,
      meter_stop: 76.0533333333341,
      reason: "user_requested",
    });
  });

  it("normalizes runtime config payloads without dropping nullable RFID", async () => {
    // Intentional red test: this module is not implemented yet.
    // @ts-expect-error missing until Task 3
    const { normalizeConfig } = await import("../api-normalizers");

    expect(normalizeConfig(runtimeConfigPayload)).toMatchObject({
      ocpp_id: "CP_1",
      log_mode: "shallow",
      rfid_tag: null,
    });
  });

  it("normalizes firmware status from PascalCase fields", async () => {
    // Intentional red test: this module is not implemented yet.
    // @ts-expect-error missing until Task 3
    const { normalizeFirmwareStatus } = await import("../api-normalizers");

    expect(normalizeFirmwareStatus(runtimeFirmwarePayload).status).toBe("Idle");
  });

  it("normalizes diagnostics status from PascalCase fields", async () => {
    // Intentional red test: this module is not implemented yet.
    // @ts-expect-error missing until Task 3
    const { normalizeDiagnosticsStatus } = await import("../api-normalizers");

    expect(normalizeDiagnosticsStatus(runtimeDiagnosticsPayload).status).toBe("Idle");
  });

  it("preserves OCPP key type metadata", async () => {
    // Intentional red test: this module is not implemented yet.
    // @ts-expect-error missing until Task 3
    const { normalizeOcppConfigKeys } = await import("../api-normalizers");

    expect(normalizeOcppConfigKeys(runtimeOcppKeyPayload)[0]).toMatchObject({
      key: "ConnectionTimeOut",
      type: "int",
    });
  });
});
