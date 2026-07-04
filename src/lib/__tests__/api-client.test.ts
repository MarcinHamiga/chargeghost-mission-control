import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../logger", () => ({
  logger: {
    restRequest: vi.fn(),
    restResponse: vi.fn(),
  },
}));
import {
  runtimeChargingProfileGetPayload,
  runtimeChargingProfilePostPayload,
  runtimeLocalAuthPutPayload,
  runtimeSessionStartPayload,
} from "./api-contract-fixtures";
import { api } from "../api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes the config payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
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
      }),
    );

    await expect(api.getConfig()).resolves.toMatchObject({
      ocpp_id: "CP_1",
      rfid_tag: null,
      log_mode: "info", // "shallow" maps to "info"
    });
  });

  it("sends only writable config fields on PATCH", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        action: "applied",
        changed_fields: ["log_mode"],
        message: "unchanged",
      }),
    );

    await api.updateConfig({
      log_mode: "debug",
      connection_url: "ws://csms.example.com/ocpp",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/config",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_mode: "debug",
          connection_url: "ws://csms.example.com/ocpp",
        }),
      }),
    );
  });

  it("strips connectors from the config PATCH body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        action: "applied",
        changed_fields: ["log_mode"],
        message: "unchanged",
      }),
    );

    await api.updateConfig({
      log_mode: "debug",
      connectors: [{ voltage: 230, current: 32, phase: 1 }],
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).not.toHaveProperty("connectors");
    expect(body).toEqual({ log_mode: "debug" });
  });

  it("requires a connector id when fetching a single charging profile", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(runtimeChargingProfileGetPayload),
    );

    await expect(api.getChargingProfile(10, 1)).resolves.toMatchObject({
      profile_id: 10,
      connector_id: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/charging-profiles/10?connector_id=1",
      expect.any(Object),
    );
  });

  it("normalizes the stopped session payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        transaction_id: -1,
        connector_id: 1,
        energy_charged_wh: 76.0533333333341,
        meter_stop: 76.0533333333341,
        reason: "user_requested",
        id_tag: null,
      }),
    );

    await expect(api.getLastStoppedSession()).resolves.toMatchObject({
      transaction_id: -1,
      meter_stop: 76.0533333333341,
      reason: "user_requested",
    });
  });

  it("uses the documented session info endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));

    await api.getSessionInfo();
    await api.getSessionByConnector(7);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8080/api/v1/sessions/info", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8080/api/v1/sessions/7", expect.any(Object));
  });

  it("starts a session without max_energy", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, message: "Session started" }),
    );

    await api.startSession(1, { id_tag: "RFID001", timeout_seconds: 30 });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/sessions/start",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(runtimeSessionStartPayload),
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).not.toHaveProperty("max_energy");
  });

  it("passes timeout_seconds to start-charging", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, message: "ok" }),
    );

    await api.startCharging(2, 45);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/connectors/2/start-charging?timeout_seconds=45",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends snake_case local auth PUT entries", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, message: "ok" }),
    );

    await api.updateLocalAuthList(runtimeLocalAuthPutPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/local-auth-list",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(runtimeLocalAuthPutPayload),
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.entries[0]).toHaveProperty("id_tag");
    expect(body.entries[0]).not.toHaveProperty("IDTag");
  });

  it("posts charging profiles in engine.ChargingProfile shape", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, message: "installed" }),
    );

    await api.createChargingProfile({
      connector_id: 1,
      profile: {
        profile_id: 10,
        connector_id: 1,
        purpose: "TxDefaultProfile",
        stack_level: 0,
        charging_profile_kind: "Absolute",
        charging_rate_unit: "W",
        schedule_period: [
          { start_period: 0, limit: 7400 },
          { start_period: 3600, limit: 11000 },
        ],
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/charging-profiles",
      expect.objectContaining({
        body: JSON.stringify(runtimeChargingProfilePostPayload),
      }),
    );
  });

  it("fetches OCPP link status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        version: "1.6",
        connected: true,
        reconnectCount: 0,
        upSince: "2025-04-09T11:00:00Z",
        csmsUrl: "wss://csms.example.com/ocpp",
        ocppId: "CP_1",
        heartbeatSuccesses: 1,
        heartbeatFailures: 0,
      }),
    );

    await expect(api.getOcppStatus()).resolves.toMatchObject({
      connected: true,
      csmsUrl: "wss://csms.example.com/ocpp",
    });
  });

  it("sets connector availability", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, message: "scheduled" }, 202),
    );

    await api.setConnectorAvailability(1, "Inoperative");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/connectors/1/availability",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ type: "Inoperative" }),
      }),
    );
  });

  it("uses the documented timeline count endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ count: 250 }));

    await expect(api.getTimelineCount()).resolves.toEqual({ count: 250 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/timeline/count",
      expect.any(Object),
    );
  });

  it("normalizes firmware and diagnostics status payloads", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          status: "Downloading",
          location: "https://example.com/firmware.bin",
          retrieve_date: "2026-04-10T10:00:00Z",
          file_name: "firmware.bin",
          file_hash: "abc123",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "Uploading",
          location: "https://example.com/diagnostics",
        }),
      );

    await expect(api.getFirmwareStatus()).resolves.toMatchObject({
      status: "Downloading",
      file_name: "firmware.bin",
    });
    await expect(api.getDiagnosticsStatus()).resolves.toMatchObject({
      status: "Uploading",
      location: "https://example.com/diagnostics",
    });
  });

  it("preserves OCPP config key metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        { key: "ConnectionTimeOut", value: "30", readonly: false, type: "int" },
      ]),
    );

    await expect(api.getOCPPConfigKeys()).resolves.toEqual([
      { key: "ConnectionTimeOut", value: "30", readonly: false, type: "int" },
    ]);
  });

  it("supports raw OCPP requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ status: "Accepted", data: '{"result":"ok"}' }),
    );

    await expect(
      api.ocppRawDataTransfer({ vendor_id: "com.example", message_id: "CustomMessage", data: "{\"key\":\"value\"}" }),
    ).resolves.toEqual({ status: "Accepted", data: '{"result":"ok"}' });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/ocpp/raw/data-transfer",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: "com.example",
          message_id: "CustomMessage",
          data: "{\"key\":\"value\"}",
        }),
      }),
    );
  });

  it.each([
    [
      "status notification",
      () => api.ocppRawStatusNotification({ connector_id: 1, error_code: "NoError", status: "Available" }),
      "http://localhost:8080/api/v1/ocpp/raw/status-notification",
      { connector_id: 1, error_code: "NoError", status: "Available" },
    ],
    [
      "meter values",
      () => api.ocppRawMeterValues({ connector_id: 1, transaction_id: 1001 }),
      "http://localhost:8080/api/v1/ocpp/raw/meter-values",
      { connector_id: 1, transaction_id: 1001 },
    ],
    [
      "start transaction",
      () =>
        api.ocppRawStartTransaction({
          connector_id: 1,
          id_tag: "RFID001",
          meter_start: 12500,
        }),
      "http://localhost:8080/api/v1/ocpp/raw/start-transaction",
      { connector_id: 1, id_tag: "RFID001", meter_start: 12500 },
    ],
    [
      "stop transaction",
      () =>
        api.ocppRawStopTransaction({
          transaction_id: 1001,
          reason: "Local",
        }),
      "http://localhost:8080/api/v1/ocpp/raw/stop-transaction",
      { transaction_id: 1001, reason: "Local" },
    ],
  ])("posts the raw OCPP %s endpoint", async (_label, requestFn, url, body) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ success: true, message: "ok" }));

    await expect((requestFn as () => Promise<unknown>)()).resolves.toEqual({ success: true, message: "ok" });

    expect(fetchMock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  });
});
