import type { Connector, EnergyMeter } from "./types";

export interface PowerSampleState {
  readingWh: number;
  timestamp: number;
}

export function computePowerW(
  connector: Connector,
  meter: EnergyMeter | undefined,
  prevSample: PowerSampleState | null,
  now = Date.now(),
): number {
  if (!meter) return 0;

  if (meter.is_charging && prevSample !== null) {
    const dtHours = (now - prevSample.timestamp) / 3_600_000;
    if (dtHours > 0) {
      const dWh = meter.reading_wh - prevSample.readingWh;
      return Math.max(0, dWh / dtHours);
    }
    return 0;
  }

  if (meter.is_charging) {
    return connector.voltage * connector.current;
  }

  return 0;
}
