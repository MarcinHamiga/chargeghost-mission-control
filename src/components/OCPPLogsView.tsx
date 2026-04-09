import { createSignal, createResource, For, Show, onCleanup } from "solid-js";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { Terminal, Search, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-solid";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function OCPPLogsView() {
  const [search, setSearch] = createSignal("");
  const [sourceFilter, setSourceFilter] = createSignal<string>("");
  const [actionFilter, setActionFilter] = createSignal<string>("");
  const [connectorIdFilter, setConnectorIdFilter] = createSignal<string>("");
  const [transactionIdFilter, setTransactionIdFilter] = createSignal<string>("");
  const [page, setPage] = createSignal(0);
  const PAGE_SIZE = 50;

  const queryParams = () => ({
    limit: PAGE_SIZE,
    offset: page() * PAGE_SIZE,
    ...(search() ? { search: search() } : {}),
    ...(sourceFilter() ? { source: sourceFilter() } : {}),
    ...(actionFilter() ? { action: actionFilter() } : {}),
    ...(connectorIdFilter() ? { connector_id: Number(connectorIdFilter()) } : {}),
    ...(transactionIdFilter() ? { transaction_id: Number(transactionIdFilter()) } : {}),
  });

  const [timeline, { refetch }] = createResource(queryParams, (params) => api.getTimeline(params));

  const interval = setInterval(() => refetch(), 3000);
  onCleanup(() => clearInterval(interval));

  const totalPages = () => {
    const total = timeline()?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  };

  const handleClear = async () => {
    if (!confirm("Clear all timeline events?")) return;
    try {
      await api.clearTimeline();
      setPage(0);
      refetch();
      addToast("success", "Timeline cleared");
    } catch (e: any) {
      addToast("error", `Failed to clear timeline: ${e.message || e}`);
    }
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <Terminal size={22} class="text-accent-teal" />
          OCPP Message Log
        </h2>
        <div class="flex items-center gap-2">
          <Show when={timeline()}>
            <span class="text-[10px] text-text-muted font-mono">{timeline()!.total} events</span>
          </Show>
          <button onClick={() => refetch()} class="p-2 rounded-lg border border-border-default hover:bg-white/5 transition-colors">
            <RefreshCw size={14} class={timeline.loading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleClear} class="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div class="glass-card p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <div class="relative flex-1 min-w-48">
            <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search events..."
              value={search()}
              onInput={(e) => { setSearch(e.currentTarget.value); setPage(0); }}
              class="w-full bg-bg-main border border-border-default rounded-lg pl-9 pr-3 py-2 text-xs focus:border-accent-teal/50 focus:outline-none transition-colors"
            />
          </div>
          <select
            value={sourceFilter()}
            onChange={(e) => { setSourceFilter(e.currentTarget.value); setPage(0); }}
            class="bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs focus:border-accent-teal/50 focus:outline-none"
          >
            <option value="">All Sources</option>
            <option value="ocpp_adapter">OCPP Adapter</option>
            <option value="csms">CSMS</option>
          </select>
          <select
            value={actionFilter()}
            onChange={(e) => { setActionFilter(e.currentTarget.value); setPage(0); }}
            class="bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs focus:border-accent-teal/50 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="BootNotification">BootNotification</option>
            <option value="Heartbeat">Heartbeat</option>
            <option value="StatusNotification">StatusNotification</option>
            <option value="Authorize">Authorize</option>
            <option value="StartTransaction">StartTransaction</option>
            <option value="StopTransaction">StopTransaction</option>
            <option value="MeterValues">MeterValues</option>
            <option value="RemoteStartTransaction">RemoteStartTransaction</option>
            <option value="RemoteStopTransaction">RemoteStopTransaction</option>
            <option value="ChangeConfiguration">ChangeConfiguration</option>
            <option value="GetConfiguration">GetConfiguration</option>
            <option value="Reset">Reset</option>
            <option value="SetChargingProfile">SetChargingProfile</option>
            <option value="ClearChargingProfile">ClearChargingProfile</option>
            <option value="TriggerMessage">TriggerMessage</option>
            <option value="FirmwareStatusNotification">FirmwareStatusNotification</option>
            <option value="DiagnosticsStatusNotification">DiagnosticsStatusNotification</option>
          </select>
          <input
            type="number"
            placeholder="Connector ID"
            value={connectorIdFilter()}
            onInput={(e) => { setConnectorIdFilter(e.currentTarget.value); setPage(0); }}
            class="w-28 bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Transaction ID"
            value={transactionIdFilter()}
            onInput={(e) => { setTransactionIdFilter(e.currentTarget.value); setPage(0); }}
            class="w-32 bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Event List */}
      <div class="glass-card overflow-hidden">
        <div class="grid grid-cols-[120px_60px_180px_1fr] gap-0 text-[10px] font-bold uppercase tracking-widest text-text-muted bg-bg-secondary/50 px-4 py-2 border-b border-border-default">
          <span>Timestamp</span>
          <span>Dir</span>
          <span>Action</span>
          <span>Details</span>
        </div>

        <div class="divide-y divide-border-default max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar">
          <For each={timeline()?.events} fallback={
            <Show when={!timeline.loading}>
              <div class="px-4 py-12 text-center text-text-muted text-xs italic">No events match your filters</div>
            </Show>
          }>
            {(event) => {
              const isSent = event.direction === "outbound";
              return (
                <div class="grid grid-cols-[120px_60px_180px_1fr] gap-0 px-4 py-2.5 text-xs items-start hover:bg-white/[0.02] font-mono">
                  <span class="text-text-muted">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as any)}
                  </span>
                  <span class={cn(
                    "font-bold text-[10px] uppercase",
                    isSent ? "text-accent-teal" : "text-blue-500"
                  )}>
                    {isSent ? "SENT" : "RECV"}
                  </span>
                  <span class="font-bold text-text-primary truncate pr-2">{event.action || event.event_type}</span>
                  <span class="text-text-muted truncate" title={JSON.stringify(event.payload)}>
                    {event.summary || JSON.stringify(event.payload)}
                  </span>
                </div>
              );
            }}
          </For>

          <Show when={timeline.loading}>
            <div class="px-4 py-8 text-center text-text-muted text-xs">
              <RefreshCw size={16} class="animate-spin mx-auto" />
            </div>
          </Show>
        </div>
      </div>

      {/* Pagination */}
      <Show when={totalPages() > 1}>
        <div class="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page() === 0}
            class="p-2 rounded-lg border border-border-default hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>
          <span class="text-xs text-text-muted font-mono">
            Page {page() + 1} / {totalPages()}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
            disabled={page() >= totalPages() - 1}
            class="p-2 rounded-lg border border-border-default hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </Show>
    </div>
  );
}
