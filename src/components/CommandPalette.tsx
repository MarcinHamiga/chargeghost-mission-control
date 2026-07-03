import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Search, CornerDownLeft } from "lucide-solid";
import { cn } from "../lib/cn";
import { state, setState } from "../store/simulator";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { actionSuccessToast, formatActionError } from "../lib/action-errors";
import { NAV_ITEMS } from "./nav";
import {
  paletteOpen,
  togglePalette,
  setActiveView,
  type ViewId,
} from "../store/ui";

interface Command {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  shortcut?: string;
  run: () => void;
}

async function runAction(
  name: string,
  action: () => Promise<{ message?: string } | void>,
) {
  try {
    const result = await action();
    setState("snapshot", await api.getStatus());
    addToast("success", actionSuccessToast(name, result ?? undefined));
  } catch (e: unknown) {
    addToast("error", `${name} failed: ${formatActionError(name, e)}`);
  }
}

/** ⌘K command palette — every action, connector jump, and view, one search away. */
export function CommandPalette() {
  const [query, setQuery] = createSignal("");
  const [selected, setSelected] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  // Reset + focus whenever the palette opens.
  createEffect(() => {
    if (paletteOpen()) {
      setQuery("");
      setSelected(0);
      queueMicrotask(() => inputRef?.focus());
    }
  });

  const commands = createMemo<Command[]>(() => {
    const cid = state.selectedConnectorId;
    const connector = state.snapshot?.connectors.find((c) => c.id === cid);
    const connectors = [...(state.snapshot?.connectors || [])].sort(
      (a, b) => a.id - b.id,
    );
    const list: Command[] = [];

    // Context actions for the selected connector.
    if (connector) {
      if (connector.status === "Charging") {
        list.push({
          id: "stop",
          group: `Actions · Connector ${cid}`,
          label: "Stop charging",
          keywords: "stop halt end",
          run: () => runAction("stop", () => api.stopCharging(cid)),
        });
        list.push({
          id: "suspend",
          group: `Actions · Connector ${cid}`,
          label: "Suspend EV",
          run: () => runAction("suspend", () => api.suspendEV(cid)),
        });
      } else if (connector.is_plugged_in) {
        list.push({
          id: "start",
          group: `Actions · Connector ${cid}`,
          label: "Start charging",
          keywords: "start begin charge",
          run: () => runAction("start", () => api.startCharging(cid)),
        });
      }
      if (connector.status === "SuspendedEV") {
        list.push({
          id: "resume",
          group: `Actions · Connector ${cid}`,
          label: "Resume charging",
          run: () => runAction("resume", () => api.resumeCharging(cid)),
        });
      }
      list.push({
        id: "plug",
        group: `Actions · Connector ${cid}`,
        label: connector.is_plugged_in ? "Unplug" : "Plug in",
        run: () =>
          runAction(
            connector.is_plugged_in ? "unplug" : "plugIn",
            () =>
              connector.is_plugged_in ? api.unplug(cid) : api.plugIn(cid),
          ),
      });
    }

    // Jump to a connector.
    for (const c of connectors) {
      if (c.id === cid) continue;
      list.push({
        id: `jump-${c.id}`,
        group: "Jump to connector",
        label: `Connector ${c.id} · ${c.status}`,
        keywords: `connector ${c.id}`,
        run: () => {
          setState("selectedConnectorId", c.id);
          setActiveView("operate");
        },
      });
    }

    // Navigate to a view.
    for (const item of NAV_ITEMS) {
      list.push({
        id: `nav-${item.id}`,
        group: "Go to",
        label: item.label,
        keywords: "view navigate open",
        shortcut: `⌘${item.shortcut}`,
        run: () => setActiveView(item.id as ViewId),
      });
    }

    return list;
  });

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    const all = commands();
    if (!q) return all;
    return all.filter((c) =>
      `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  });

  // Keep selection in range as the list changes.
  createEffect(() => {
    const n = filtered().length;
    if (selected() >= n) setSelected(Math.max(0, n - 1));
  });

  const onKeyDown = (e: KeyboardEvent) => {
    const items = filtered();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = items[selected()];
      if (cmd) {
        togglePalette(false);
        cmd.run();
      }
    } else if (e.key === "Escape") {
      togglePalette(false);
    }
  };

  // Group the filtered list, preserving first-seen order.
  const grouped = createMemo(() => {
    const groups: { name: string; items: { cmd: Command; index: number }[] }[] = [];
    filtered().forEach((cmd, index) => {
      let g = groups.find((x) => x.name === cmd.group);
      if (!g) {
        g = { name: cmd.group, items: [] };
        groups.push(g);
      }
      g.items.push({ cmd, index });
    });
    return groups;
  });

  return (
    <Show when={paletteOpen()}>
      <Portal>
        <div
          class="fixed inset-0 z-[200] flex items-start justify-center pt-[14vh] bg-bg-main/55 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) togglePalette(false);
          }}
        >
          <div
            class="w-[540px] max-w-[88vw] bg-surface-2 border border-border-bright rounded-[13px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
            style={{ animation: "cg-pop 0.14s ease-out" }}
          >
            <div class="flex items-center gap-3 px-4 py-3.5 border-b border-border-default">
              <Search size={17} class="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a command, connector, or view…"
                class="flex-1 bg-transparent border-0 text-[15px] text-text-primary outline-none placeholder:text-text-muted"
                spellcheck={false}
                autocomplete="off"
              />
              <kbd class="font-mono text-[10.5px] text-text-muted border border-border-bright rounded px-1.5 py-0.5">
                esc
              </kbd>
            </div>

            <div class="max-h-[52vh] overflow-y-auto custom-scrollbar py-2">
              <Show
                when={filtered().length > 0}
                fallback={
                  <div class="px-4 py-8 text-center text-sm text-text-muted">
                    No matches for “{query()}”
                  </div>
                }
              >
                <For each={grouped()}>
                  {(group) => (
                    <div class="px-2 pb-1.5">
                      <div class="px-2.5 pt-2 pb-1 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-text-muted">
                        {group.name}
                      </div>
                      <For each={group.items}>
                        {(row) => (
                          <button
                            type="button"
                            onMouseEnter={() => setSelected(row.index)}
                            onClick={() => {
                              togglePalette(false);
                              row.cmd.run();
                            }}
                            class={cn(
                              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] text-left transition-colors",
                              selected() === row.index
                                ? "bg-accent-teal/10 text-text-primary"
                                : "text-text-secondary",
                            )}
                          >
                            <span class="flex-1 truncate">{row.cmd.label}</span>
                            <Show when={row.cmd.shortcut}>
                              <kbd class="font-mono text-[10.5px] text-text-muted border border-border-bright rounded px-1.5 py-0.5">
                                {row.cmd.shortcut}
                              </kbd>
                            </Show>
                            <Show when={selected() === row.index}>
                              <CornerDownLeft size={13} class="text-accent-teal" />
                            </Show>
                          </button>
                        )}
                      </For>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
