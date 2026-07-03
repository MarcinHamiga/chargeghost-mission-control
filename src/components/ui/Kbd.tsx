import { cn } from "../../lib/cn";
import type { JSX } from "solid-js";

interface KbdProps {
  children: JSX.Element;
  class?: string;
  /** Muted variant for use on a colored (e.g. primary) background. */
  onColor?: boolean;
}

/** A keyboard-hint chip, e.g. ⌘K or a single-letter accelerator. */
export function Kbd(props: KbdProps) {
  return (
    <kbd
      class={cn(
        "inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded-[5px] font-mono text-[10.5px] leading-none border border-b-2",
        props.onColor
          ? "border-black/20 bg-black/10 text-current"
          : "border-border-bright bg-surface-2 text-text-secondary",
        props.class,
      )}
    >
      {props.children}
    </kbd>
  );
}
