import { createSignal } from "solid-js";

export const TIME_WINDOW_MS = 60_000;
const TRIM_BUFFER_MS = 2_000;

export interface TelemetryPoint {
  x: number;
  y: number;
}

export interface ConnectorTelemetry {
  points: TelemetryPoint[];
  lastReadingWh: number | null;
  lastTimestamp: number | null;
  currentValueW: number;
}

const EMPTY_TELEMETRY: ConnectorTelemetry = {
  points: [],
  lastReadingWh: null,
  lastTimestamp: null,
  currentValueW: 0,
};

const buffers = new Map<number, ConnectorTelemetry>();
const [revision, setRevision] = createSignal(0);

function ensureBuffer(connectorId: number): ConnectorTelemetry {
  let buf = buffers.get(connectorId);
  if (!buf) {
    buf = {
      points: [],
      lastReadingWh: null,
      lastTimestamp: null,
      currentValueW: 0,
    };
    buffers.set(connectorId, buf);
  }
  return buf;
}

export function getRevision(): number {
  return revision();
}

export function getConnectorTelemetry(connectorId: number): ConnectorTelemetry {
  return buffers.get(connectorId) ?? EMPTY_TELEMETRY;
}

export function appendTelemetryPoint(connectorId: number, value: number, now: number): void {
  const buf = ensureBuffer(connectorId);
  buf.currentValueW = value;
  buf.points.push({ x: now, y: value });

  const cutoff = now - TIME_WINDOW_MS - TRIM_BUFFER_MS;
  while (buf.points.length > 0 && buf.points[0].x < cutoff) {
    buf.points.shift();
  }

  setRevision((r) => r + 1);
}

export function updateSamplerState(
  connectorId: number,
  readingWh: number | null,
  timestamp: number | null,
): void {
  const buf = ensureBuffer(connectorId);
  buf.lastReadingWh = readingWh;
  buf.lastTimestamp = timestamp;
}

export function clearConnectorTelemetry(connectorId: number): void {
  buffers.delete(connectorId);
  setRevision((r) => r + 1);
}
