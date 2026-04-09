import { state } from "../store/simulator";
import { api } from "../lib/api";
import { 
  Plug, 
  Play, 
  Square, 
  Pause,
  CircleOff
} from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function ActionPanel() {
  const [loading, setLoading] = createSignal<string | null>(null);

  const connectorId = () => state.selectedConnectorId;
  
  const handleAction = async (name: string, action: () => Promise<any>) => {
    setLoading(name);
    try {
      await action();
    } catch (e) {
      console.error(`Action ${name} failed`, e);
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
          onClick={() => handleAction("unplug", () => api.unplug(connectorId()))}
          disabled={loading() !== null || !currentConnector()?.is_plugged_in}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-default hover:bg-white/5 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CircleOff size={14} />
          Unplug
        </button>
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
