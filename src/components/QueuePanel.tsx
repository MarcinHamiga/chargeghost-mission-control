import { createResource, Show, For } from "solid-js";
import { api, getActiveStation } from "../lib/api";
import { addToast } from "../store/toast";
import { requestConfirm } from "../store/confirm";
import { Layers, Droplets, Trash2, Inbox, ListX } from "lucide-solid";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import type { DeadLetterEntry } from "../lib/types";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function QueuePanel() {
  const activeId = () => getActiveStation();

  const [queueStatus, { refetch: refetchQueueStatus }] = createResource(activeId, (id) =>
    api.fleet.getQueueStatus(id),
  );
  const [deadLetter, { refetch: refetchDeadLetter }] = createResource(activeId, (id) =>
    api.fleet.getDeadLetter(id),
  );

  const refreshAll = () => {
    refetchQueueStatus();
    refetchDeadLetter();
  };

  const handleDrain = async () => {
    const id = activeId();
    if (!id) return;
    try {
      const res = await api.fleet.drainQueue(id);
      addToast(res.success ? "success" : "error", res.message || "Queue drain requested");
      refreshAll();
    } catch (e: any) {
      addToast("error", `Failed to drain queue: ${e.message || e}`);
    }
  };

  const handleClear = async () => {
    const id = activeId();
    if (!id) return;
    const confirmed = await requestConfirm("Clear the message queue? Queued messages will be discarded.");
    if (!confirmed) return;
    try {
      const res = await api.fleet.clearQueue(id);
      addToast(res.success ? "success" : "error", res.message || "Queue cleared");
      refreshAll();
    } catch (e: any) {
      addToast("error", `Failed to clear queue: ${e.message || e}`);
    }
  };

  const handleClearDeadLetter = async () => {
    const id = activeId();
    if (!id) return;
    const confirmed = await requestConfirm("Clear the dead-letter queue? These entries cannot be recovered.");
    if (!confirmed) return;
    try {
      const res = await api.fleet.clearDeadLetter(id);
      addToast(res.success ? "success" : "error", res.message || "Dead-letter queue cleared");
      refreshAll();
    } catch (e: any) {
      addToast("error", `Failed to clear dead-letter queue: ${e.message || e}`);
    }
  };

  return (
    <Show
      when={activeId()}
      fallback={
        <Panel>
          <PanelHeader icon={<Layers size={15} class="text-accent-teal" />} title="Queue" />
          <div class="p-5">
            <p class="text-xs text-text-muted">No active station selected.</p>
          </div>
        </Panel>
      }
    >
      <div class="space-y-4">
        <Panel>
          <PanelHeader
            icon={<Layers size={15} class="text-accent-teal" />}
            title="Queue"
            aside={
              <div class="flex gap-2">
                <Button variant="ghost" size="sm" icon={<Droplets size={12} />} onClick={handleDrain}>
                  Drain
                </Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={12} />} onClick={handleClear}>
                  Clear
                </Button>
              </div>
            }
          />
          <div class="p-5">
            <Show
              when={queueStatus()}
              fallback={<p class="text-xs text-text-muted">Loading…</p>}
            >
              {(status) => (
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 rounded-lg border border-border-default bg-surface-1">
                    <div class="text-[11px] text-text-muted uppercase tracking-wide">Depth</div>
                    <div class="text-xl font-semibold text-text-primary font-mono mt-1">{status().depth}</div>
                  </div>
                  <div class="p-3 rounded-lg border border-border-default bg-surface-1">
                    <div class="text-[11px] text-text-muted uppercase tracking-wide">Dropped</div>
                    <div class="text-xl font-semibold text-text-primary font-mono mt-1">{status().dropped}</div>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            icon={<Inbox size={15} class="text-accent-teal" />}
            title="Dead letter"
            aside={
              <Button variant="danger" size="sm" icon={<ListX size={12} />} onClick={handleClearDeadLetter}>
                Clear dead-letter
              </Button>
            }
          />
          <div class="p-5">
            <Show
              when={deadLetter()}
              fallback={<p class="text-xs text-text-muted">Loading…</p>}
            >
              {(entries) => (
                <Show
                  when={entries().length > 0}
                  fallback={<p class="text-xs text-text-muted">No dead-letter entries.</p>}
                >
                  <div class="space-y-2">
                    <For each={entries()}>
                      {(entry: DeadLetterEntry) => (
                        <div class="p-3 rounded-lg border border-border-default bg-surface-1 text-xs space-y-1.5">
                          <div class="flex justify-between items-center">
                            <span class="font-mono font-semibold text-text-primary">{entry.message.type}</span>
                            <span class="text-text-muted">{formatTimestamp(entry.moved_at)}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-text-muted">ID</span>
                            <span class="font-mono text-text-secondary">{entry.message.id}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-text-muted">Reason</span>
                            <span class="text-text-secondary">{entry.reason}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-text-muted">Retries</span>
                            <span class="font-mono text-text-secondary">
                              {entry.message.retry_count}/{entry.message.max_retries}
                            </span>
                          </div>
                          <Show when={entry.message.last_error}>
                            <div class="flex justify-between gap-2">
                              <span class="text-text-muted shrink-0">Last error</span>
                              <span class="text-critical text-right break-all">{entry.message.last_error}</span>
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              )}
            </Show>
          </div>
        </Panel>
      </div>
    </Show>
  );
}
