import { describe, expect, it } from "vitest";
import {
  runtimeDeadLetterPayload,
  runtimeOperationPayload,
  runtimeOperationResponsePayload,
  runtimeQueueStatusPayload,
  runtimeStationSnapshotPayload,
} from "./api-contract-fixtures";
import {
  normalizeDeadLetter,
  normalizeOperation,
  normalizeOperationResponse,
  normalizeOperations,
  normalizeQueueStatus,
  normalizeStationSnapshot,
  normalizeStationSnapshots,
} from "../api-normalizers";

describe("fleet normalizers", () => {
  it("normalizes a station snapshot", () => {
    expect(normalizeStationSnapshot(runtimeStationSnapshotPayload)).toEqual({
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
    });
  });

  it("falls back to safe defaults for a malformed station snapshot", () => {
    expect(normalizeStationSnapshot({})).toMatchObject({
      station_id: "",
      enabled: false,
      lifecycle_state: "configured",
      ocpp_version: "1.6",
      connected: false,
      last_error: null,
      restart_required: false,
    });
  });

  it("normalizes a WS-only 'not_running' lifecycle state", () => {
    expect(normalizeStationSnapshot({ ...runtimeStationSnapshotPayload, lifecycle_state: "not_running" }))
      .toMatchObject({ lifecycle_state: "not_running" });
  });

  it("normalizes an array of station snapshots and rejects non-arrays", () => {
    expect(normalizeStationSnapshots([runtimeStationSnapshotPayload])).toHaveLength(1);
    expect(normalizeStationSnapshots(null)).toEqual([]);
    expect(normalizeStationSnapshots(undefined)).toEqual([]);
  });

  it("normalizes an operation", () => {
    expect(normalizeOperation(runtimeOperationPayload)).toEqual({
      id: "op-1",
      type: "restart",
      station_id: "station-1",
      state: "running",
      started_at: "2026-07-04T10:00:00Z",
      ended_at: undefined,
      error: undefined,
    });
  });

  it("normalizes a bare array of operations", () => {
    expect(normalizeOperations([runtimeOperationPayload])).toHaveLength(1);
    expect(normalizeOperations(null)).toEqual([]);
  });

  it("normalizes an operation response, including its embedded snapshot", () => {
    const result = normalizeOperationResponse(runtimeOperationResponsePayload);
    expect(result.success).toBe(true);
    expect(result.operation_id).toBe("op-1");
    expect(result.snapshot).toMatchObject({ station_id: "station-1", lifecycle_state: "running" });
  });

  it("normalizes queue status and never fabricates a ratio for cap", () => {
    expect(normalizeQueueStatus(runtimeQueueStatusPayload)).toEqual({
      depth: 3,
      dropped: 1,
      cap: 0,
    });
  });

  it("normalizes dead-letter entries", () => {
    const result = normalizeDeadLetter(runtimeDeadLetterPayload);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      moved_at: "2026-07-04T10:05:00Z",
      reason: "max_retries_exceeded",
    });
    expect(result[0].message).toMatchObject({
      id: "msg-1",
      type: "StatusNotification",
      retry_count: 5,
      max_retries: 5,
      last_error: "timeout",
      idempotency_key: "idem-1",
    });
  });

  it("treats a null dead-letter payload as an empty list", () => {
    expect(normalizeDeadLetter(null)).toEqual([]);
    expect(normalizeDeadLetter(undefined)).toEqual([]);
  });
});
