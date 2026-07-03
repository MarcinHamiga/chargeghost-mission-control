import { cn } from "../../lib/cn";
import { statusPresentation } from "../../lib/connector-status";
import type { ConnectorStatus } from "../../lib/types";

interface StatePillProps {
  status: ConnectorStatus;
  class?: string;
  /** Hide the label and render just the dot (for tight spaces). */
  dotOnly?: boolean;
}

/** Connector status as a pill — the one place status → color is decided. */
export function StatePill(props: StatePillProps) {
  const p = () => statusPresentation(props.status);
  return (
    <span
      class={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        props.dotOnly ? "p-0 border-0 bg-transparent" : "px-2.5 py-1 text-xs",
        !props.dotOnly && p().bg,
        !props.dotOnly && p().border,
        !props.dotOnly && p().text,
        props.class,
      )}
      title={props.status}
    >
      <span
        class={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          p().dot,
          p().live && "shadow-[0_0_7px_var(--color-accent-teal)]",
        )}
      />
      {!props.dotOnly && props.status}
    </span>
  );
}
