import { For, Show } from "solid-js";
import { Plus } from "lucide-solid";
import { cn } from "../lib/cn";
import { state, setState } from "../store/simulator";
import { statusPresentation } from "../lib/connector-status";
import { setActiveView } from "../store/ui";

/** Persistent connector context for the Operate stage — a segmented control. */
export function ConnectorSelector() {
  const connectors = () =>
    [...(state.snapshot?.connectors || [])].sort((a, b) => a.id - b.id);

  return (
    <div class="flex items-center gap-2.5 flex-wrap">
      <div class="flex gap-1 bg-surface-1 border border-border-default rounded-[10px] p-1">
        <For each={connectors()}>
          {(connector) => {
            const p = () => statusPresentation(connector.status);
            const selected = () => state.selectedConnectorId === connector.id;
            return (
              <button
                type="button"
                onClick={() => setState("selectedConnectorId", connector.id)}
                aria-pressed={selected()}
                class={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-[7px] text-[12.5px] font-medium transition-colors",
                  selected()
                    ? "bg-surface-3 text-text-primary shadow-[inset_0_0_0_1px_var(--color-border-bright)]"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <span
                  class={cn(
                    "w-[7px] h-[7px] rounded-full",
                    p().dot,
                    p().live && "shadow-[0_0_7px_var(--color-accent-teal)]",
                  )}
                />
                Connector {connector.id}
                <Show when={connector.is_plugged_in}>
                  <span class="text-[10px] text-text-muted">◗</span>
                </Show>
              </button>
            );
          }}
        </For>
      </div>

      <button
        type="button"
        onClick={() => setActiveView("connectors")}
        class="ml-auto inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary border border-border-default hover:border-border-bright bg-surface-1 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Plus size={13} />
        Add connector
      </button>
    </div>
  );
}
