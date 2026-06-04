import type { StandardResponse } from "./types";

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: StandardResponse,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function readDetails<T>(response: StandardResponse | undefined): T | undefined {
  if (!response?.details || typeof response.details !== "object") return undefined;
  return response.details as T;
}

export type ConfigUpdateAction = "no-op" | "applied" | "restart_required";

const LEGACY_CONFIG_ACTIONS: Record<string, ConfigUpdateAction> = {
  bridge_restart_required: "restart_required",
  runtime_rebuild_required: "restart_required",
};

export function normalizeConfigUpdateAction(action: unknown): ConfigUpdateAction {
  if (typeof action !== "string") return "no-op";
  if (action === "no-op" || action === "applied" || action === "restart_required") {
    return action;
  }
  if (action === "rejected") return "no-op";
  return LEGACY_CONFIG_ACTIONS[action] ?? "no-op";
}

export function authRejectedMessage(context: "session" | "charging"): string {
  return context === "session"
    ? "Session start rejected: ID tag not authorized (offline local auth list)."
    : "Start charging rejected: config.rfid_tag not authorized (offline local auth list).";
}

export function conflictMessage(context: string): string {
  return `Conflict: ${context}`;
}

export function bridgeUnavailableMessage(): string {
  return "OCPP bridge is not connected or not configured.";
}
