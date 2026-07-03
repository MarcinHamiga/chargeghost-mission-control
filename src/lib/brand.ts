import type { ConnectionStatus } from "../store/simulator";

/** Must stay in sync with --color-accent-teal in index.css */
export const BRAND_ACCENT = "#00ffcc";
export const BRAND_ACCENT_RGB = "0, 255, 204";

export const LOGO_SRC = "/chargeghost-icon.svg";
export const APP_TITLE = "ChargeGhost Mission Control";

/** Full semantic app version, e.g. "1.0.0" (injected from package.json). */
export const APP_VERSION = __APP_VERSION__;

/** Short release label for branding, e.g. "v1.0". */
export const APP_VERSION_LABEL = `v${APP_VERSION.split(".").slice(0, 2).join(".")}`;

export function getStartupStatus(
  connectionStatus: ConnectionStatus,
  hasSnapshot: boolean,
): string {
  if (hasSnapshot) return "";
  if (connectionStatus === "connecting") return "Connecting to simulator…";
  if (connectionStatus === "connected") return "Loading status…";
  return "Starting…";
}
