import { type JSX, Show } from "solid-js";
import { cn } from "../../lib/cn";

/** Shared input styling — mono, dark ground, teal focus ring. */
export const inputClass =
  "bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-teal/50 focus:outline-none transition-colors";

interface FieldProps {
  label: JSX.Element;
  hint?: JSX.Element;
  class?: string;
  children: JSX.Element;
}

/** Labelled form field — uppercase micro-label above a control. */
export function Field(props: FieldProps) {
  return (
    <label class={cn("flex flex-col gap-1", props.class)}>
      <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {props.label}
        <Show when={props.hint}>
          <span class="ml-1 font-normal normal-case tracking-normal text-text-muted/70">{props.hint}</span>
        </Show>
      </span>
      {props.children}
    </label>
  );
}
