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
    profile_id: profile.profile_id,
    connector_id: profile.connector_id,
    stack_level: profile.stack_level,
    purpose: profile.purpose,
    kind: profile.charging_profile_kind,
    schedule: {
      charging_rate_unit: profile.charging_rate_unit ?? "W",
      periods: profile.schedule_period.map((period) => ({
        start_period: period.start_period,
        limit: period.limit,
        ...(period.number_phases !== undefined ? { number_phases: period.number_phases } : {}),
      })),
    },
  };
}
