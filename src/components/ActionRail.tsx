import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { Plug, CircleOff, Play, Square, Pause, RotateCcw, CreditCard, X } from "lucide-solid";
import { state, setState } from "../store/simulator";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { actionSuccessToast, formatActionError } from "../lib/action-errors";
import { Button } from "./ui/Button";
import { cn } from "../lib/cn";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * The Operate stage's docked action rail: state-aware primary actions for the
 * selected connector, each on a single-key accelerator (P / S / U).
 */
export function ActionRail() {
  const [loading, setLoading] = createSignal<string | null>(null);
  const [showRfid, setShowRfid] = createSignal(false);
  const [rfidInput, setRfidInput] = createSignal("");

  const connectorId = () => state.selectedConnectorId;
  const connector = () =>
    state.snapshot?.connectors.find((c) => c.id === connectorId());

  const isPlugged = () => !!connector()?.is_plugged_in;
  const isCharging = () => connector()?.status === "Charging";
  const isSuspended = () => connector()?.status === "SuspendedEV";

  const run = async (name: string, action: () => Promise<{ message?: string } | void>) => {
    if (loading()) return;
    setLoading(name);
    try {
      const result = await action();
      setState("snapshot", await api.getStatus());
      addToast("success", actionSuccessToast(name, result ?? undefined));
    } catch (e: unknown) {
      addToast("error", `${name} failed: ${formatActionError(name, e)}`);
    } finally {
      setLoading(null);
    }
  };

  const togglePlug = () =>
    isPlugged()
      ? run("unplug", () => api.unplug(connectorId()))
      : run("plugIn", () => api.plugIn(connectorId()));

  const toggleCharge = () =>
    isCharging()
      ? run("stop", () => api.stopCharging(connectorId()))
      : run("start", () => api.startCharging(connectorId()));

  const toggleSuspend = () =>
    isSuspended()
      ? run("resume", () => api.resumeCharging(connectorId()))
      : run("suspend", () => api.suspendEV(connectorId()));

  // Single-key accelerators — active only while the Operate stage is mounted.
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    const k = e.key.toLowerCase();
    if (k === "p") { e.preventDefault(); togglePlug(); }
    else if (k === "s") { e.preventDefault(); if (isPlugged() || isCharging()) toggleCharge(); }
    else if (k === "u") { e.preventDefault(); if (isCharging() || isSuspended()) toggleSuspend(); }
  };
  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return (
    <div class="panel flex flex-col gap-2.5 p-3.5">
      <div class="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-text-muted">
        Session · Connector {connectorId()}
      </div>

      <Button
        variant={isCharging() ? "danger" : "primary"}
        disabled={!!loading() || (!isCharging() && !isPlugged())}
        onClick={toggleCharge}
        kbd="S"
        icon={
          isCharging()
            ? <Square size={15} />
            : <Play size={15} fill="currentColor" />
        }
      >
        {isCharging() ? "Stop charging" : "Start charging"}
      </Button>

      <Button
        variant="subtle"
        disabled={!!loading() || (!isCharging() && !isSuspended())}
        onClick={toggleSuspend}
        kbd="U"
        icon={isSuspended() ? <RotateCcw size={15} /> : <Pause size={15} />}
      >
        {isSuspended() ? "Resume charging" : "Suspend EV"}
      </Button>

      <div class="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-text-muted mt-1.5">
        Connector
      </div>

      <Button
        variant="ghost"
        disabled={!!loading()}
        onClick={togglePlug}
        kbd="P"
        icon={isPlugged() ? <CircleOff size={15} /> : <Plug size={15} />}
      >
        {isPlugged() ? "Unplug" : "Plug in"}
      </Button>

      <Button
        variant="ghost"
        onClick={() => setShowRfid((v) => !v)}
        icon={<CreditCard size={15} class={cn(connector()?.id_tag && "text-accent-teal")} />}
      >
        {connector()?.id_tag ? `RFID · ${connector()!.id_tag}` : "Set RFID tag"}
      </Button>

      <Show when={showRfid()}>
        <div class="rounded-lg border border-border-default bg-bg-main/50 p-2 space-y-2">
          <div class="flex gap-2">
            <input
              type="text"
              value={rfidInput()}
              onInput={(e) => setRfidInput(e.currentTarget.value)}
              placeholder="Connector RFID tag…"
              class="flex-1 bg-bg-main border border-border-default rounded px-2 py-1.5 text-[11px] font-mono focus:border-accent-teal/50 focus:outline-none"
            />
            <button
              type="button"
              disabled={!rfidInput() || !!loading()}
              onClick={() =>
                run("setRfid", async () => {
                  await api.setRFID(connectorId(), rfidInput());
                  setShowRfid(false);
                  setRfidInput("");
                })
              }
              class="px-2.5 rounded bg-accent-teal text-bg-main text-xs font-bold hover:brightness-105 disabled:opacity-50"
            >
              Set
            </button>
          </div>
          <Show when={connector()?.id_tag}>
            <button
              type="button"
              disabled={!!loading()}
              onClick={() =>
                run("clearRfid", async () => {
                  await api.clearRFID(connectorId());
                  setShowRfid(false);
                })
              }
              class="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded border border-critical/25 text-critical text-xs hover:bg-critical/10 transition-colors disabled:opacity-50"
            >
              <X size={11} /> Clear RFID
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
