import { For, Show } from "solid-js";
import { Zap } from "lucide-solid";
import { state, setState } from "../store/simulator";
import { cn } from "../lib/cn";
import { BRAND_ACCENT_RGB } from "../lib/brand";

export function ConnectorStrip() {
  const connectors = () => [...(state.snapshot?.connectors || [])].sort((a, b) => a.id - b.id);

  return (
    <div class="flex gap-2 overflow-x-auto pb-2">
      <For each={connectors()}>
        {(connector) => (
          <button
            onClick={() => setState("selectedConnectorId", connector.id)}
            class={cn(
              "flex items-center gap-3 px-4 py-3 glass-card text-left transition-all border shrink-0 min-w-40",
              state.selectedConnectorId === connector.id
                ? "border-accent-teal ring-1 ring-accent-teal/30 bg-accent-teal/5"
                : "hover:border-text-muted/30"
            )}
          >
            <div class={cn(
              "p-1.5 rounded-lg",
              connector.status === "Charging" ? "bg-accent-teal/10 text-accent-teal" : 
              connector.status === "Faulted" ? "bg-red-500/10 text-red-500" :
              "bg-white/5 text-text-muted"
            )}>
              <Zap size={16} class={cn(connector.status === "Charging" && "fill-current animate-pulse")} />
            </div>
            
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs uppercase tracking-tighter">Connector {connector.id}</span>
                <Show when={connector.is_plugged_in}>
                    <div
                      class="w-1.5 h-1.5 rounded-full bg-accent-teal"
                      style={{ "box-shadow": `0 0 8px rgba(${BRAND_ACCENT_RGB}, 0.6)` }}
                      title="Plugged In"
                    />
                </Show>
              </div>
              <p class="text-xs text-text-secondary leading-none">
                {connector.status}
              </p>
            </div>
          </button>
        )}
      </For>
    </div>
  );
}
