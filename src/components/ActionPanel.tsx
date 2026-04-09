import { state, setState } from "../store/simulator";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import {
  Plug,
  Play,
  Square,
  Pause,
  CircleOff,
  RotateCcw,
  CreditCard,
  X,
  Zap
} from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function ActionPanel() {
  const [loading, setLoading] = createSignal<string | null>(null);
  const [rfidInput, setRfidInput] = createSignal("");
  const [showRfid, setShowRfid] = createSignal(false);
  const [showStartSession, setShowStartSession] = createSignal(false);
  const [sessionMaxEnergy, setSessionMaxEnergy] = createSignal(50000);
  const [sessionIdTag, setSessionIdTag] = createSignal("");

  const connectorId = () => state.selectedConnectorId;

  const handleAction = async (name: string, action: () => Promise<any>) => {
    setLoading(name);
    try {
      await action();
      const snapshot = await api.getStatus();
      setState("snapshot", snapshot);
      addToast("success", `${name} succeeded`);
    } catch (e: any) {
      addToast("error", `${name} failed: ${e.message || e}`);
    } finally {
      setLoading(null);
    }
  };

  const currentConnector = () => state.snapshot?.connectors.find(c => c.id === connectorId());

  return (
    <div class="glass-card p-6 h-full flex flex-col">
      <h3 class="font-bold mb-4 flex items-center gap-2">
        <Play size={18} class="text-accent-teal" />
        Simulation Actions
      </h3>
      
      <div class="grid grid-cols-1 gap-2 flex-1">
        <button 
          onClick={() => handleAction("plugIn", () => api.plugIn(connectorId()))}
          disabled={loading() !== null || currentConnector()?.is_plugged_in}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-default hover:bg-white/5 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plug size={14} class={cn(currentConnector()?.is_plugged_in && "text-accent-teal")} />
          Plug In
        </button>

        <button 
          onClick={() => handleAction("start", () => api.startCharging(connectorId()))}
          disabled={loading() !== null || currentConnector()?.status === "Charging" || !currentConnector()?.is_plugged_in}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-accent-teal/30 bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={14} fill="currentColor" />
          Start Charging
        </button>

        <button 
          onClick={() => handleAction("stop", () => api.stopCharging(connectorId()))}
          disabled={loading() !== null || currentConnector()?.status !== "Charging"}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Square size={14} fill="currentColor" />
          Stop Charging
        </button>

        <button 
          onClick={() => handleAction("suspend", () => api.suspendEV(connectorId()))}
          disabled={loading() !== null || currentConnector()?.status !== "Charging"}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-default hover:bg-white/5 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Pause size={14} fill="currentColor" />
          Suspend EV
        </button>

        <button
          onClick={() => handleAction("resume", () => api.resumeCharging(connectorId()))}
          disabled={loading() !== null || currentConnector()?.status !== "SuspendedEV"}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-accent-teal/30 bg-accent-teal/5 hover:bg-accent-teal/10 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={14} />
          Resume Charging
        </button>

        <button
          onClick={() => handleAction("unplug", () => api.unplug(connectorId()))}
          disabled={loading() !== null || !currentConnector()?.is_plugged_in}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-default hover:bg-white/5 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CircleOff size={14} />
          Unplug
        </button>

        {/* Divider */}
        <div class="border-t border-border-default my-1" />

        {/* RFID Controls */}
        <button
          onClick={() => setShowRfid(!showRfid())}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-default hover:bg-white/5 transition-all text-xs font-medium"
        >
          <CreditCard size={14} class={cn(currentConnector()?.id_tag && "text-accent-teal")} />
          {currentConnector()?.id_tag ? `RFID: ${currentConnector()!.id_tag}` : "Set RFID Tag"}
        </button>

        <Show when={showRfid()}>
          <div class="p-2 rounded-lg border border-border-default bg-bg-main/50 space-y-2">
            <div class="flex gap-2">
              <input
                type="text"
                value={rfidInput()}
                onInput={(e) => setRfidInput(e.currentTarget.value)}
                placeholder="RFID tag..."
                class="flex-1 bg-bg-main border border-border-default rounded px-2 py-1.5 text-[10px] font-mono focus:border-accent-teal/50 focus:outline-none"
              />
              <button
                onClick={() => handleAction("setRfid", async () => { await api.setRFID(connectorId(), rfidInput()); setShowRfid(false); })}
                disabled={!rfidInput() || loading() !== null}
                class="px-2 py-1 rounded bg-accent-teal text-bg-main text-[10px] font-bold hover:bg-accent-teal/90 disabled:opacity-50"
              >
                Set
              </button>
            </div>
            <Show when={currentConnector()?.id_tag}>
              <button
                onClick={() => handleAction("clearRfid", async () => { await api.clearRFID(connectorId()); setShowRfid(false); })}
                disabled={loading() !== null}
                class="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded border border-red-500/20 text-red-400 text-[10px] hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <X size={10} />
                Clear RFID
              </button>
            </Show>
          </div>
        </Show>

        {/* Start Session */}
        <button
          onClick={() => setShowStartSession(!showStartSession())}
          disabled={!currentConnector()?.is_plugged_in || currentConnector()?.status === "Charging"}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-xs font-medium text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap size={14} />
          Start Session
        </button>

        <Show when={showStartSession()}>
          <div class="p-2 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
            <div class="space-y-1">
              <label class="text-[9px] font-bold uppercase tracking-widest text-text-muted">Max Energy (Wh)</label>
              <input type="number" value={sessionMaxEnergy()} onInput={(e) => setSessionMaxEnergy(Number(e.currentTarget.value))}
                class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-[10px] font-mono focus:border-accent-teal/50 focus:outline-none" />
            </div>
            <div class="space-y-1">
              <label class="text-[9px] font-bold uppercase tracking-widest text-text-muted">ID Tag (optional)</label>
              <input type="text" value={sessionIdTag()} onInput={(e) => setSessionIdTag(e.currentTarget.value)} placeholder="e.g. Tag001"
                class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-[10px] font-mono focus:border-accent-teal/50 focus:outline-none" />
            </div>
            <button
              onClick={() => handleAction("startSession", async () => {
                await api.startSession(connectorId(), sessionMaxEnergy(), sessionIdTag() || undefined);
                setShowStartSession(false);
              })}
              disabled={loading() !== null}
              class="w-full px-2 py-1.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              Start Session
            </button>
          </div>
        </Show>
      </div>

      <div class="mt-4 pt-4 border-t border-border-default">
         <div class="flex items-center justify-between text-[10px] text-text-muted uppercase tracking-widest font-bold">
            <span>Selected</span>
            <span class="text-accent-teal">Connector {connectorId()}</span>
         </div>
      </div>
    </div>
  );
}
