import { createSignal, createResource, createMemo, For, Show, onCleanup } from "solid-js";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import {
  Terminal,
  Search,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Play,
  Pause,
  TriangleAlert,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from "lucide-solid";
import { cn } from "../lib/cn";
import { requestConfirm } from "../store/confirm";
import { Select } from "./Select";
import { Panel } from "./ui/Panel";
import { Kbd } from "./ui/Kbd";
import type { TimelineEvent } from "../lib/types";
import { OCPP_ACTION_OPTIONS, OCPP_DIRECTION_OPTIONS, OCPP_SOURCE_OPTIONS } from "../lib/select-options";

const PAGE_SIZE = 50;

const ERROR_LEVELS = new Set(["error", "warn", "warning", "critical", "fatal"]);
const isErrorEvent = (e: TimelineEvent) =>
  ERROR_LEVELS.has((e.level || "").toLowerCase()) ||
  e.tags?.some((t) => ERROR_LEVELS.has(t.toLowerCase()));

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  } as any);

export function OCPPLogsView() {
  const [search, setSearch] = createSignal("");
  const [sourceFilter, setSourceFilter] = createSignal("");
  const [directionFilter, setDirectionFilter] = createSignal("");
  const [eventTypeFilter, setEventTypeFilter] = createSignal("");
  const [actionFilter, setActionFilter] = createSignal("");
  const [connectorIdFilter, setConnectorIdFilter] = createSignal("");
  const [transactionIdFilter, setTransactionIdFilter] = createSignal("");
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [hoverCorr, setHoverCorr] = createSignal<string | null>(null);
  const [page, setPage] = createSignal(0);
  const [liveTail, setLiveTail] = createSignal(true);
  const [errorsOnly, setErrorsOnly] = createSignal(false);
  const [showFilters, setShowFilters] = createSignal(false);

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

  // Live tail: poll only while enabled and viewing the newest page.
  const interval = setInterval(() => {
    if (liveTail() && page() === 0) refetch();
  }, 2000);
  onCleanup(() => clearInterval(interval));

  const activeFilterCount = () =>
    [
      search(),
      sourceFilter(),
      directionFilter(),
      eventTypeFilter(),
      actionFilter(),
      connectorIdFilter(),
      transactionIdFilter(),
    ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setSourceFilter("");
    setDirectionFilter("");
    setEventTypeFilter("");
    setActionFilter("");
    setConnectorIdFilter("");
    setTransactionIdFilter("");
    setPage(0);
  };

  const events = createMemo(() => {
    const list = timeline()?.events ?? [];
    return errorsOnly() ? list.filter(isErrorEvent) : list;
  });

  const totalPages = () => Math.max(1, Math.ceil((timeline()?.total ?? 0) / PAGE_SIZE));

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

  const inputCls =
    "bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-teal/50 focus:outline-none transition-colors";

  return (
    <div class="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-[15px] font-semibold flex items-center gap-2 tracking-[-0.01em]">
          <Terminal size={18} class="text-accent-teal" />
          OCPP Timeline
          <span class="text-xs text-text-muted font-mono font-normal tnum">
            {events().length} shown · {timelineCount()?.count ?? 0} total
          </span>
        </h2>

        <div class="flex items-center gap-1.5">
          {/* Live tail */}
          <button
            onClick={() => { const next = !liveTail(); setLiveTail(next); if (next) { setPage(0); refetch(); } }}
            class={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              liveTail()
                ? "border-accent-teal/40 bg-accent-teal/10 text-accent-teal"
                : "border-border-default text-text-secondary hover:bg-white/5",
            )}
            title={liveTail() ? "Live tail on — pauses when you page back" : "Live tail off"}
          >
            {liveTail() ? <Play size={12} class="fill-current" /> : <Pause size={12} />}
            <span
              class={cn(
                "w-1.5 h-1.5 rounded-full",
                liveTail() ? "bg-accent-teal shadow-[0_0_7px_var(--color-accent-teal)] animate-pulse" : "bg-text-muted",
              )}
            />
            Live
          </button>

          {/* Errors only */}
          <button
            onClick={() => setErrorsOnly((v) => !v)}
            class={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              errorsOnly()
                ? "border-critical/40 bg-critical/10 text-critical"
                : "border-border-default text-text-secondary hover:bg-white/5",
            )}
            title="Show only warnings & errors"
          >
            <TriangleAlert size={12} />
            Errors
          </button>

          {/* Filters */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            class={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              showFilters() || activeFilterCount()
                ? "border-accent-teal/40 bg-accent-teal/10 text-accent-teal"
                : "border-border-default text-text-secondary hover:bg-white/5",
            )}
          >
            <SlidersHorizontal size={12} />
            Filters
            <Show when={activeFilterCount()}>
              <span class="min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full bg-accent-teal text-[#042a24] text-[10px] font-bold tnum">
                {activeFilterCount()}
              </span>
            </Show>
          </button>

          <div class="w-px h-5 bg-border-default mx-0.5" />

          <button
            onClick={() => refetch()}
            class="p-2 rounded-lg border border-border-default text-text-secondary hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} class={timeline.loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleClear}
            class="p-2 rounded-lg border border-critical/25 text-critical hover:bg-critical/10 transition-colors"
            title="Clear timeline"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Filter drawer */}
      <Show when={showFilters()}>
        <Panel class="p-3">
          <div class="flex flex-wrap gap-2 items-center">
            <div class="relative flex-1 min-w-52">
              <Search size={13} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search summary, payload, message id…"
                value={search()}
                onInput={(e) => { setSearch(e.currentTarget.value); setPage(0); }}
                class={cn(inputCls, "w-full pl-9 font-sans")}
              />
            </div>
            <Select value={sourceFilter()} options={OCPP_SOURCE_OPTIONS} onChange={(v) => { setSourceFilter(v); setPage(0); }} aria-label="Filter by source" class="min-w-[9rem]" />
            <Select value={directionFilter()} options={OCPP_DIRECTION_OPTIONS} onChange={(v) => { setDirectionFilter(v); setPage(0); }} aria-label="Filter by direction" class="min-w-[9rem]" />
            <Select value={actionFilter()} options={OCPP_ACTION_OPTIONS} onChange={(v) => { setActionFilter(v); setPage(0); }} aria-label="Filter by OCPP action" class="min-w-[10rem]" menuClass="min-w-[14rem]" />
            <input type="text" placeholder="Event type" value={eventTypeFilter()} onInput={(e) => { setEventTypeFilter(e.currentTarget.value); setPage(0); }} class={cn(inputCls, "w-32")} />
            <input type="number" placeholder="Conn ID" value={connectorIdFilter()} onInput={(e) => { setConnectorIdFilter(e.currentTarget.value); setPage(0); }} class={cn(inputCls, "w-24")} />
            <input type="number" placeholder="Tx ID" value={transactionIdFilter()} onInput={(e) => { setTransactionIdFilter(e.currentTarget.value); setPage(0); }} class={cn(inputCls, "w-24")} />
            <Show when={activeFilterCount()}>
              <button onClick={clearFilters} class="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-critical hover:bg-critical/10 transition-colors">
                <X size={12} /> Clear
              </button>
            </Show>
          </div>
        </Panel>
      </Show>

      {/* Timeline table */}
      <Panel class="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div class="grid grid-cols-[7.5rem_4rem_minmax(9rem,13rem)_5.5rem_1fr] gap-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted bg-surface-2/60 px-4 py-2 border-b border-border-default shrink-0">
          <span>Time</span>
          <span>Dir</span>
          <span>Action</span>
          <span>Conn · Tx</span>
          <span>Summary</span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-border-default/60">
          <For
            each={events()}
            fallback={
              <Show when={!timeline.loading}>
                <div class="px-4 py-16 text-center text-text-muted text-xs italic">
                  {errorsOnly() ? "No warnings or errors in view" : "No events match your filters"}
                </div>
              </Show>
            }
          >
            {(event) => {
              const isSent = event.direction === "outbound";
              const expanded = () => expandedId() === event.event_id;
              const err = isErrorEvent(event);
              const corrMatch = () => !!event.correlation_key && hoverCorr() === event.correlation_key;
              return (
                <div
                  class="font-mono"
                  onMouseEnter={() => setHoverCorr(event.correlation_key)}
                  onMouseLeave={() => setHoverCorr(null)}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded() ? null : event.event_id)}
                    class={cn(
                      "w-full grid grid-cols-[7.5rem_4rem_minmax(9rem,13rem)_5.5rem_1fr] gap-0 px-4 py-2 text-xs items-center text-left transition-colors",
                      corrMatch() ? "bg-accent-teal/[0.06]" : "hover:bg-white/[0.025]",
                      err && "bg-critical/[0.04]",
                    )}
                  >
                    <span class="text-text-muted tnum">{fmtTime(event.timestamp)}</span>
                    <span
                      class={cn(
                        "inline-flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wide",
                        isSent ? "text-teal-calm" : "text-info",
                      )}
                    >
                      {isSent ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                      {isSent ? "TX" : "RX"}
                    </span>
                    <span class={cn("font-semibold truncate pr-2", err ? "text-critical" : "text-text-primary")}>
                      {event.action || event.event_type}
                    </span>
                    <span class="text-text-muted tnum truncate pr-2">
                      {event.connector_id != null ? `#${event.connector_id}` : "—"}
                      {event.transaction_id != null ? ` · ${event.transaction_id}` : ""}
                    </span>
                    <span class="text-text-secondary truncate flex items-center gap-2">
                      <Show when={err}>
                        <TriangleAlert size={11} class="text-critical shrink-0" />
                      </Show>
                      <span class="truncate">{event.summary || JSON.stringify(event.payload)}</span>
                      <Show when={event.correlation_key}>
                        <span class="text-[10px] text-text-muted/70 shrink-0" title="correlation key">
                          ⇄ {event.correlation_key!.slice(0, 8)}
                        </span>
                      </Show>
                    </span>
                  </button>

                  <Show when={expanded()}>
                    <div class="px-4 pb-3 pt-1 text-xs space-y-2 bg-surface-1/40">
                      <div class="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-text-muted">
                        <span>source: <span class="text-text-secondary">{event.source}</span></span>
                        <span>event: <span class="text-text-secondary">{event.event_type}</span></span>
                        <Show when={event.message_id}>
                          <span>msg id: <span class="text-text-secondary">{event.message_id}</span></span>
                        </Show>
                        <Show when={event.correlation_key}>
                          <span>correlation: <span class="text-teal-calm">{event.correlation_key}</span></span>
                        </Show>
                        <Show when={event.level}>
                          <span>level: <span class={err ? "text-critical" : "text-text-secondary"}>{event.level}</span></span>
                        </Show>
                        <Show when={event.tags?.length}>
                          <span>tags: <span class="text-text-secondary">{event.tags.join(", ")}</span></span>
                        </Show>
                      </div>
                      <pre class="max-h-64 overflow-auto custom-scrollbar bg-bg-main/80 p-3 rounded-lg border border-border-default text-[11px] leading-relaxed text-text-secondary">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>

          <Show when={timeline.loading && !events().length}>
            <div class="px-4 py-10 text-center text-text-muted">
              <RefreshCw size={16} class="animate-spin mx-auto" />
            </div>
          </Show>
        </div>

        {/* Footer: pagination */}
        <Show when={totalPages() > 1}>
          <div class="flex items-center justify-between gap-4 px-4 py-2 border-t border-border-default bg-surface-2/40 shrink-0">
            <span class="text-[11px] text-text-muted">
              <Show when={liveTail() && page() === 0} fallback="Paged view — live tail paused">
                Live tail active
              </Show>
            </span>
            <div class="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page() === 0}
                class="p-1.5 rounded-lg border border-border-default text-text-secondary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} />
              </button>
              <span class="text-[11px] text-text-secondary font-mono tnum">
                Page {page() + 1} / {totalPages()}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
                disabled={page() >= totalPages() - 1}
                class="p-1.5 rounded-lg border border-border-default text-text-secondary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </Show>

        {/* Hint bar */}
        <div class="flex items-center gap-3 px-4 py-1.5 border-t border-border-default text-[10.5px] text-text-muted shrink-0">
          <span class="flex items-center gap-1"><Kbd>click</Kbd> row to expand payload</span>
          <span class="flex items-center gap-1">hover to trace <span class="text-teal-calm">⇄ correlated</span> messages</span>
        </div>
      </Panel>
    </div>
  );
}
