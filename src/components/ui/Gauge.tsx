import { Show, type JSX } from "solid-js";
import { cn } from "../../lib/cn";

interface GaugeProps {
  label: string;
  /** The formatted numeric reading (e.g. "7.34"). */
  value: JSX.Element;
  unit?: string;
  /** Highlight the value in the live teal (for the "hot" reading, e.g. power). */
  hot?: boolean;
  /** Optional sparkline / mini-visual pinned to the bottom of the card. */
  spark?: JSX.Element;
  class?: string;
}

/** An instrument readout: label + tabular-mono value + unit. */
export function Gauge(props: GaugeProps) {
  return (
    <div
      class={cn(
        "panel relative overflow-hidden px-3.5 py-3",
        props.class,
      )}
    >
      <div class="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-text-muted">
        {props.label}
      </div>
      <div
        class={cn(
          "font-mono tnum text-[23px] font-semibold tracking-[-0.02em] mt-1.5",
          props.hot ? "text-accent-teal" : "text-text-primary",
        )}
      >
        {props.value}
        <Show when={props.unit}>
          <span class="text-xs text-text-muted ml-1">{props.unit}</span>
        </Show>
      </div>
      <Show when={props.spark}>
        <div class="absolute inset-x-0 bottom-0 h-5 opacity-60">{props.spark}</div>
      </Show>
    </div>
  );
}
