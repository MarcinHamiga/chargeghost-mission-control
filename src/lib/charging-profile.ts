import type { ChargingProfile, ChargingSchedulePeriod } from "./types";

export type ChargingProfileInput = {
  profile_id: number;
  connector_id: number;
  purpose: ChargingProfile["purpose"];
  stack_level: number;
  charging_profile_kind: ChargingProfile["charging_profile_kind"];
  charging_rate_unit?: "W" | "A";
  schedule_period: ChargingSchedulePeriod[];
};

export function buildChargingProfilePayload(profile: ChargingProfileInput) {
  return {
    ProfileID: profile.profile_id,
    ConnectorID: profile.connector_id,
    StackLevel: profile.stack_level,
    Purpose: profile.purpose,
    Kind: profile.charging_profile_kind,
    Schedule: {
      ChargingRateUnit: profile.charging_rate_unit ?? "W",
      Periods: profile.schedule_period.map((period) => ({
        StartPeriod: period.start_period,
        Limit: period.limit,
        ...(period.number_phases !== undefined ? { NumberPhases: period.number_phases } : {}),
      })),
    },
  };
}
