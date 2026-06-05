import { createEffect } from "solid-js";
import { state } from "../store/simulator";
import { computePowerW } from "../lib/power";
import {
  appendTelemetryPoint,
  getConnectorTelemetry,
  updateSamplerState,
} from "../store/telemetry";

export function useTelemetrySampler() {
  createEffect(() => {
    const snapshot = state.snapshot;
    if (!snapshot) return;

    const now = Date.now();

    for (const connector of snapshot.connectors) {
      const meter = snapshot.energy_meters[connector.id.toString()];
      const telemetry = getConnectorTelemetry(connector.id);

      const prevSample =
        telemetry.lastReadingWh !== null && telemetry.lastTimestamp !== null
          ? { readingWh: telemetry.lastReadingWh, timestamp: telemetry.lastTimestamp }
          : null;

      const value = computePowerW(connector, meter, prevSample, now);
      appendTelemetryPoint(connector.id, value, now);

      if (meter) {
        updateSamplerState(connector.id, meter.reading_wh, now);
      }
    }
  });
}
