import { createResource, For, onCleanup, Show } from "solid-js";
import { api } from "../lib/api";
import { Terminal } from "lucide-solid";
import { cn } from "../lib/cn";

export function OCPPStream() {
  const [events, { refetch }] = createResource(() => api.getTimeline({ limit: 20 }));

  const interval = setInterval(() => {
    refetch();
  }, 3000);

  onCleanup(() => clearInterval(interval));

  return (
    <div class="glass-card p-6 h-full flex flex-col">
      <h3 class="font-bold mb-4 flex items-center gap-2">
        <Terminal size={18} class="text-text-muted" />
        OCPP Stream
      </h3>
      <div class="space-y-3 font-mono text-xs overflow-y-auto flex-1 pr-2 custom-scrollbar min-h-32">
        <For each={events()?.events}>
          {(event) => {
            const isSent = event.direction === "outbound";
            return (
              <div class={cn(
                "flex gap-3 pl-3 border-l-2 transition-opacity",
                isSent ? "border-accent-teal text-text-primary/80" : "border-blue-500 text-blue-400"
              )}>
                <span class="text-text-muted shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span class={cn(
                  "font-bold shrink-0 uppercase",
                  isSent ? "text-accent-teal" : "text-blue-500"
                )}>
                  [{isSent ? "SENT" : "RECV"}]
                </span>
                <span class="break-all">
                  <span class="font-bold mr-1">{event.action}</span>
                  <span class="opacity-70">{event.summary || JSON.stringify(event.payload)}</span>
                </span>
              </div>
            );
          }}
        </For>
        <Show when={events() && events()?.events.length === 0}>
            <div class="text-text-muted italic opacity-50 py-4 text-center">No recent events</div>
        </Show>
      </div>
    </div>
  );
}
