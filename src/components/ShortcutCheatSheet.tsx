import { For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Keyboard, X } from "lucide-solid";
import { cn } from "../lib/cn";
import { Kbd } from "./ui/Kbd";
import { NAV_ITEMS } from "./nav";
import { cheatSheetOpen, toggleCheatSheet, density, toggleDensity } from "../store/ui";

interface Shortcut {
  keys: string[];
  label: string;
}

const ACTION_SHORTCUTS: Shortcut[] = [
  { keys: ["S"], label: "Start / Stop charging" },
  { keys: ["U"], label: "Suspend / Resume EV" },
  { keys: ["P"], label: "Plug in / Unplug" },
];

const GENERAL_SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["?"], label: "Toggle this cheat-sheet" },
  { keys: ["Esc"], label: "Close palette / dialogs" },
];

function Row(props: { shortcut: Shortcut }) {
  return (
    <div class="flex items-center justify-between gap-4 px-1 py-1.5">
      <span class="text-[13px] text-text-secondary">{props.shortcut.label}</span>
      <span class="flex items-center gap-1 shrink-0">
        <For each={props.shortcut.keys}>{(k) => <Kbd>{k}</Kbd>}</For>
      </span>
    </div>
  );
}

function Section(props: { title: string; children: any }) {
  return (
    <div>
      <div class="px-1 pb-1 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-text-muted">
        {props.title}
      </div>
      <div class="divide-y divide-border-default/50">{props.children}</div>
    </div>
  );
}

/** Keyboard shortcut reference — opened with `?`, closed with Esc. */
export function ShortcutCheatSheet() {
  return (
    <Show when={cheatSheetOpen()}>
      <Portal>
        <div
          class="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] bg-bg-main/55 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleCheatSheet(false);
          }}
        >
          <div
            class="w-[560px] max-w-[90vw] bg-surface-2 border border-border-bright rounded-[13px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
            style={{ animation: "cg-pop 0.14s ease-out" }}
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <h3 class="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary m-0">
                <Keyboard size={16} class="text-accent-teal" />
                Keyboard shortcuts
              </h3>
              <button
                type="button"
                onClick={() => toggleCheatSheet(false)}
                class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                title="Close  (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            <div class="grid grid-cols-2 gap-x-8 gap-y-5 px-5 py-4">
              <Section title="Navigation">
                <For each={NAV_ITEMS}>
                  {(item) => <Row shortcut={{ keys: ["⌘", String(item.shortcut)], label: item.label }} />}
                </For>
              </Section>

              <div class="space-y-5">
                <Section title="Operate stage">
                  <For each={ACTION_SHORTCUTS}>{(s) => <Row shortcut={s} />}</For>
                </Section>
                <Section title="General">
                  <For each={GENERAL_SHORTCUTS}>{(s) => <Row shortcut={s} />}</For>
                </Section>
              </div>
            </div>

            {/* Density control */}
            <div class="flex items-center justify-between px-5 py-3 border-t border-border-default bg-surface-1/50">
              <span class="text-[12px] text-text-secondary">Interface density</span>
              <div class="flex items-center gap-1 p-1 rounded-lg bg-surface-1 border border-border-default">
                <For each={["comfortable", "compact"] as const}>
                  {(mode) => (
                    <button
                      type="button"
                      onClick={() => { if (density() !== mode) toggleDensity(); }}
                      class={cn(
                        "px-3 py-1 rounded-md text-[12px] font-medium capitalize transition-colors",
                        density() === mode
                          ? "bg-accent-teal/12 text-accent-teal"
                          : "text-text-secondary hover:text-text-primary hover:bg-white/5",
                      )}
                    >
                      {mode}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
