import type { ConnectorStatus } from "./types";

/**
 * Single source of truth for how a connector status is presented.
 * State is encoded in form + color: `live` states glow the signature teal,
 * everything else uses a semantic hue distinct from the accent.
 */
export interface StatusPresentation {
  /** Whether this is an energized/active state (drives the teal glow). */
  live: boolean;
  /** Tailwind text color class for the label/dot. */
  text: string;
  /** Tailwind background tint class for a pill. */
  bg: string;
  /** Tailwind border class for a pill. */
  border: string;
  /** Tailwind background class for the status dot. */
  dot: string;
}

const PRESET = {
  charging: {
    live: true,
    text: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/25",
    dot: "bg-accent-teal",
  },
  available: {
    live: false,
    text: "text-available",
    bg: "bg-available/10",
    border: "border-available/25",
    dot: "bg-available",
  },
  warn: {
    live: false,
    text: "text-warn",
    bg: "bg-warn/10",
    border: "border-warn/25",
    dot: "bg-warn",
  },
  critical: {
    live: false,
    text: "text-critical",
    bg: "bg-critical/10",
    border: "border-critical/30",
    dot: "bg-critical",
  },
  reserved: {
    live: false,
    text: "text-reserved",
    bg: "bg-reserved/10",
    border: "border-reserved/25",
    dot: "bg-reserved",
  },
  muted: {
    live: false,
    text: "text-text-muted",
    bg: "bg-white/5",
    border: "border-border-bright",
    dot: "bg-text-muted",
  },
} satisfies Record<string, StatusPresentation>;

const MAP: Record<ConnectorStatus, StatusPresentation> = {
  Charging: PRESET.charging,
  Available: PRESET.available,
  SuspendedEV: PRESET.warn,
  SuspendedEVSE: PRESET.warn,
  Faulted: PRESET.critical,
  Reserved: PRESET.reserved,
  Preparing: PRESET.muted,
  Finishing: PRESET.muted,
  Unavailable: PRESET.muted,
};

export function statusPresentation(status: ConnectorStatus): StatusPresentation {
  return MAP[status] ?? PRESET.muted;
}
