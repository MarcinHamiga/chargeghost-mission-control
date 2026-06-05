import { createSignal, createResource, For, Show, onCleanup } from "solid-js";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { Terminal, Search, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-solid";
import { cn } from "../lib/cn";
import { requestConfirm } from "../store/confirm";
import { Select } from "./Select";
import { OCPP_ACTION_OPTIONS, OCPP_DIRECTION_OPTIONS, OCPP_SOURCE_OPTIONS } from "../lib/select-options";

export function OCPPLogsView() {
  const [search, setSearch] = createSignal("");
  const [sourceFilter, setSourceFilter] = createSignal<string>("");
  const [directionFilter, setDirectionFilter] = createSignal<string>("");
  const [eventTypeFilter, setEventTypeFilter] = createSignal<string>("");
  const [actionFilter, setActionFilter] = createSignal<string>("");
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [connectorIdFilter, setConnectorIdFilter] = createSignal<string>("");
  const [transactionIdFilter, setTransactionIdFilter] = createSignal<string>("");
  const [page, setPage] = createSignal(0);
  const PAGE_SIZE = 50;

  const queryParams = () => ({
    limit: PAGE_SIZE,
    offset: page() * PAGE_SIZE,
    ...(search() ? { search: search() } : {}),
    ...(sourceFilter() ? { source: sourceFilter() } : {}),
    ...(directionFilter() ? { direction: directionFilter() } : {}),
    ...(eventTypeFilter() ? { event_type: eventTypeFilter() } : {}),
    ...(actionFilter() ? { action: actionFilter() } : {}),
    ...(connectorIdFilter() ? { connector_id: Number(connectorIdFilter()) } : {}),
    ...(transactionIdFilter() ? { transaction_id: Number(transactionIdFilter()) } : {}),
  });

  const [timeline, { refetch }] = createResource(queryParams, (params) => api.getTimeline(params));
  const [timelineCount] = createResource(() => api.getTimelineCount().catch(() => ({ count: 0 })));

  const interval = setInterval(() => refetch(), 3000);
  onCleanup(() => clearInterval(interval));

  const totalPages = () => {
    const total = timeline()?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  };

  const handleClear = async () => {
    if (!(await requestConfirm("Clear all timeline events?"))) return;
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
          <Show when={timelineCount()}>
            <span class="text-xs text-text-muted font-mono">
              {timeline()?.total ?? 0} shown · {timelineCount()!.count} total
            </span>
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
          <Select
            value={sourceFilter()}
            options={OCPP_SOURCE_OPTIONS}
            onChange={(value) => { setSourceFilter(value); setPage(0); }}
            aria-label="Filter by source"
            class="min-w-[9rem]"
          />
          <Select
            value={directionFilter()}
            options={OCPP_DIRECTION_OPTIONS}
            onChange={(value) => { setDirectionFilter(value); setPage(0); }}
            aria-label="Filter by direction"
            class="min-w-[9rem]"
          />
          <input
            type="text"
            placeholder="Event type"
            value={eventTypeFilter()}
            onInput={(e) => { setEventTypeFilter(e.currentTarget.value); setPage(0); }}
            class="w-32 bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none"
          />
          <Select
            value={actionFilter()}
            options={OCPP_ACTION_OPTIONS}
            onChange={(value) => { setActionFilter(value); setPage(0); }}
            aria-label="Filter by OCPP action"
            class="min-w-[10rem]"
            menuClass="min-w-[14rem]"
          />
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
        <div class="grid grid-cols-[minmax(5rem,7.5rem)_3.5rem_minmax(6rem,11rem)_1fr] gap-0 text-xs font-bold uppercase tracking-widest text-text-muted bg-bg-secondary/50 px-4 py-2 border-b border-border-default">
          <span>Timestamp</span>
          <span>Dir</span>
          <span>Action</span>
          <span>Details</span>
        </div>

        <div class="divide-y divide-border-default max-h-[min(70vh,calc(100vh-16rem))] overflow-y-auto custom-scrollbar">
          <For each={timeline()?.events} fallback={
            <Show when={!timeline.loading}>
              <div class="px-4 py-12 text-center text-text-muted text-xs italic">No events match your filters</div>
            </Show>
          }>
            {(event) => {
              const isSent = event.direction === "outbound";
              const expanded = expandedId() === event.event_id;
              return (
                <div class="font-mono">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : event.event_id)}
                    class="w-full grid grid-cols-[minmax(5rem,7.5rem)_3.5rem_minmax(6rem,11rem)_1fr] gap-0 px-4 py-2.5 text-xs items-start hover:bg-white/[0.02] text-left"
                  >
                    <span class="text-text-muted">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as any)}
                    </span>
                    <span class={cn(
                      "font-bold text-xs uppercase",
                      isSent ? "text-accent-teal" : "text-blue-500"
                    )}>
                      {isSent ? "SENT" : "RECV"}
                    </span>
                    <span class="font-bold text-text-primary truncate pr-2">{event.action || event.event_type}</span>
                    <span class="text-text-muted truncate">
                      {event.summary || JSON.stringify(event.payload)}
                      <Show when={event.level || event.tags?.length}>
                        <span class="ml-2 text-xs opacity-60">
                          {event.level}{event.tags?.length ? ` · ${event.tags.join(",")}` : ""}
                        </span>
                      </Show>
                    </span>
                  </button>
                  <Show when={expanded}>
                    <div class="px-4 pb-3 text-xs text-text-muted space-y-1">
                      <Show when={event.correlation_key}>
                        <p>correlation: {event.correlation_key}</p>
                      </Show>
                      <pre class="max-h-40 overflow-auto bg-bg-main/80 p-2 rounded border border-border-default">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  </Show>
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
