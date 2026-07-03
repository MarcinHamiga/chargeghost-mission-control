import { createResource, For, onCleanup, Show } from "solid-js";
import { api } from "../lib/api";
import { Terminal } from "lucide-solid";
import { cn } from "../lib/cn";
import { Panel, PanelHeader } from "./ui/Panel";

export function OCPPStream() {
  const [events, { refetch }] = createResource(() => api.getTimeline({ limit: 20 }));

  const interval = setInterval(() => {
    refetch();
  }, 3000);

  onCleanup(() => clearInterval(interval));

  return (
    <Panel>
      <PanelHeader
        icon={<Terminal size={15} class="text-info" />}
        title="Live OCPP traffic"
        aside={<span class="font-mono text-text-muted">tailing · newest first</span>}
      />
      <div class="p-1.5 font-mono text-[11.5px] max-h-72 overflow-y-auto custom-scrollbar">
        <For each={events()?.events}>
          {(event) => {
            const isSent = event.direction === "outbound";
            return (
              <div class="grid grid-cols-[76px_46px_1fr] gap-3 items-baseline px-2 py-1.5 rounded odd:bg-white/[0.015]">
                <span class="text-text-muted tnum">
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span
                  class={cn(
                    "font-semibold text-[10px] tracking-wide",
                    isSent ? "text-teal-calm" : "text-info",
                  )}
                >
                  {isSent ? "TX ▸" : "◂ RX"}
                </span>
                <span class="break-all min-w-0">
                  <span class="text-text-primary mr-1.5">{event.action}</span>
                  <span class="text-text-muted">
                    {event.summary || JSON.stringify(event.payload)}
                  </span>
                </span>
              </div>
            );
          }}
        </For>
        <Show when={events() && events()?.events.length === 0}>
          <div class="text-text-muted italic opacity-60 py-6 text-center">
            No recent events
          </div>
        </Show>
      </div>
    </Panel>
  );
}
