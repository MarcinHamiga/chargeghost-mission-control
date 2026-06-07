import type { ConnectionStatus } from "../store/simulator";

/** Must stay in sync with --color-accent-teal in index.css */
export const BRAND_ACCENT = "#00ffcc";
export const BRAND_ACCENT_RGB = "0, 255, 204";

export const LOGO_SRC = "/chargeghost-icon.svg";
export const APP_TITLE = "ChargeGhost Mission Control";

export function getStartupStatus(
  connectionStatus: ConnectionStatus,
  hasSnapshot: boolean,
): string {
  if (hasSnapshot) return "";
  if (connectionStatus === "connecting") return "Connecting to simulator…";
  if (connectionStatus === "connected") return "Loading status…";
  return "Starting…";
}
