import { Show, type JSX } from "solid-js";
import { cn } from "../../lib/cn";

interface PanelProps {
  class?: string;
  children: JSX.Element;
}

/** Primary container surface. */
export function Panel(props: PanelProps) {
  return <div class={cn("panel", props.class)}>{props.children}</div>;
}

interface PanelHeaderProps {
  title: JSX.Element;
  icon?: JSX.Element;
  /** Trailing content, e.g. a legend or toggle. */
  aside?: JSX.Element;
  class?: string;
}

export function PanelHeader(props: PanelHeaderProps) {
  return (
    <div
      class={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border-default",
        props.class,
      )}
    >
      <h4 class="flex items-center gap-2 text-[13.5px] font-semibold tracking-[-0.01em] m-0">
        <Show when={props.icon}>
          <span class="flex items-center">{props.icon}</span>
        </Show>
        {props.title}
      </h4>
      <Show when={props.aside}>
        <div class="text-xs text-text-secondary">{props.aside}</div>
      </Show>
    </div>
  );
}
