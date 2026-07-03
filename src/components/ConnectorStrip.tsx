import { For, Show } from "solid-js";
import { Zap, Plug } from "lucide-solid";
import { state, setState } from "../store/simulator";
import { cn } from "../lib/cn";
import { statusPresentation } from "../lib/connector-status";

/** Horizontal strip of connector cards — the management-view selector. */
export function ConnectorStrip() {
  const connectors = () => [...(state.snapshot?.connectors || [])].sort((a, b) => a.id - b.id);

  return (
    <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
      <For each={connectors()}>
        {(connector) => {
          const p = () => statusPresentation(connector.status);
          const selected = () => state.selectedConnectorId === connector.id;
          return (
            <button
              onClick={() => setState("selectedConnectorId", connector.id)}
              class={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all border shrink-0 min-w-44",
                selected()
                  ? "border-accent-teal/60 ring-1 ring-accent-teal/25 bg-accent-teal/[0.06]"
                  : "border-border-default bg-surface-2 hover:bg-surface-3 hover:border-border-bright",
              )}
            >
              <div class={cn("p-1.5 rounded-lg", p().bg, p().text)}>
                <Zap size={16} class={cn(p().live && "fill-current animate-pulse")} />
              </div>

              <div class="space-y-0.5 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-xs tracking-[-0.01em] text-text-primary">Connector {connector.id}</span>
                  <Show when={connector.is_plugged_in}>
                    <Plug size={11} class="text-accent-teal shrink-0" />
                  </Show>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class={cn("w-1.5 h-1.5 rounded-full shrink-0", p().dot, p().live && "shadow-[0_0_7px_var(--color-accent-teal)]")} />
                  <span class="text-[11px] text-text-secondary leading-none truncate">{connector.status}</span>
                </div>
              </div>
            </button>
          );
        }}
      </For>
    </div>
  );
}
