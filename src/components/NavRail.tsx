import { For, Show } from "solid-js";
import { Info } from "lucide-solid";
import { cn } from "../lib/cn";
import { NAV_ITEMS } from "./nav";
import { activeView, setActiveView, togglePalette } from "../store/ui";

interface NavRailProps {
  version?: string;
}

/** Slim icon rail — the primary navigation. Tooltips on hover, ⌘1–5 to jump. */
export function NavRail(props: NavRailProps) {
  return (
    <nav class="w-14 shrink-0 flex flex-col items-center gap-1.5 py-3 bg-surface-1 border-r border-border-default">
      <button
        type="button"
        onClick={() => togglePalette(true)}
        title="Command palette  (⌘K)"
        class="w-[34px] h-[34px] mb-2 grid place-items-center rounded-[9px] border border-dashed border-border-bright text-text-muted hover:text-accent-teal hover:border-teal-deep transition-colors font-mono text-[11px]"
      >
        ⌘K
      </button>

      <For each={NAV_ITEMS}>
        {(item) => (
          <button
            type="button"
            onClick={() => setActiveView(item.id)}
            title={`${item.label}  (⌘${item.shortcut})`}
            aria-current={activeView() === item.id ? "page" : undefined}
            class={cn(
              "relative w-[38px] h-[38px] grid place-items-center rounded-[10px] transition-colors",
              activeView() === item.id
                ? "text-accent-teal bg-accent-teal/8"
                : "text-text-muted hover:text-text-primary hover:bg-white/5",
            )}
          >
            <Show when={activeView() === item.id}>
              <span class="absolute -left-3 top-2 bottom-2 w-[2.5px] rounded-full bg-accent-teal shadow-[0_0_8px_var(--color-accent-teal)]" />
            </Show>
            <item.icon size={19} />
          </button>
        )}
      </For>

      <div class="flex-1" />

      <Show when={props.version}>
        <div
          title={`v${props.version}`}
          class="w-[34px] h-[34px] grid place-items-center rounded-[9px] text-text-muted"
        >
          <Info size={16} />
        </div>
      </Show>
    </nav>
  );
}
