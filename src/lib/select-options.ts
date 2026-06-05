import type { SelectOption } from "../components/Select";

export const OCPP_SOURCE_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "All Sources" },
  { value: "ocpp_adapter", label: "OCPP Adapter" },
  { value: "csms", label: "CSMS" },
];

export const OCPP_DIRECTION_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "All Directions" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

export const OCPP_ACTION_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "All Actions" },
  { value: "BootNotification", label: "BootNotification" },
  { value: "Heartbeat", label: "Heartbeat" },
  { value: "StatusNotification", label: "StatusNotification" },
  { value: "Authorize", label: "Authorize" },
  { value: "StartTransaction", label: "StartTransaction" },
  { value: "StopTransaction", label: "StopTransaction" },
  { value: "MeterValues", label: "MeterValues" },
  { value: "RemoteStartTransaction", label: "RemoteStartTransaction" },
  { value: "RemoteStopTransaction", label: "RemoteStopTransaction" },
  { value: "ChangeConfiguration", label: "ChangeConfiguration" },
  { value: "GetConfiguration", label: "GetConfiguration" },
  { value: "Reset", label: "Reset" },
  { value: "SetChargingProfile", label: "SetChargingProfile" },
  { value: "ClearChargingProfile", label: "ClearChargingProfile" },
  { value: "TriggerMessage", label: "TriggerMessage" },
  { value: "FirmwareStatusNotification", label: "FirmwareStatusNotification" },
  { value: "DiagnosticsStatusNotification", label: "DiagnosticsStatusNotification" },
];

export const PHASE_OPTIONS: readonly SelectOption<1 | 3>[] = [
  { value: 1, label: "1-Phase" },
  { value: 3, label: "3-Phase" },
];

export const PROFILE_PURPOSE_OPTIONS: readonly SelectOption[] = [
  { value: "ChargePointMaxProfile", label: "ChargePointMaxProfile" },
  { value: "TxDefaultProfile", label: "TxDefaultProfile" },
  { value: "TxProfile", label: "TxProfile" },
];

export const PROFILE_KIND_OPTIONS: readonly SelectOption[] = [
  { value: "Absolute", label: "Absolute" },
  { value: "Recurring", label: "Recurring" },
  { value: "Relative", label: "Relative" },
];

export const PROFILE_RATE_UNIT_OPTIONS: readonly SelectOption<"W" | "A">[] = [
  { value: "W", label: "Watts (W)" },
  { value: "A", label: "Amps (A)" },
];

export const AUTH_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "Accepted", label: "Accepted" },
  { value: "Blocked", label: "Blocked" },
  { value: "Expired", label: "Expired" },
  { value: "Invalid", label: "Invalid" },
  { value: "ConcurrentTx", label: "ConcurrentTx" },
];

export function toSelectOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}
