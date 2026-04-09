import { createSignal, For, Show } from "solid-js";
import { 
  Zap, 
  Activity, 
  Settings, 
  LayoutDashboard, 
  Terminal, 
  ShieldAlert, 
  Play, 
  ArrowUpRight,
  Wifi,
  Cpu,
  RefreshCw
} from "lucide-solid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { state } from "./store/simulator";
import { TelemetryChart } from "./components/TelemetryChart";
import { ConnectorStrip } from "./components/ConnectorStrip";
import { ActionPanel } from "./components/ActionPanel";
import { OCPPStream } from "./components/OCPPStream";
import { useWebSocket } from "./hooks/useWebSocket";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MissionControl() {
  useWebSocket();
  const [activeTab, setActiveTab] = createSignal("dashboard");

  const sidebarItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "simulator", icon: Cpu, label: "EVSE Simulator" },
    { id: "ocpp", icon: Terminal, label: "OCPP Logs" },
    { id: "faults", icon: ShieldAlert, label: "Fault Injection" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const currentConnector = () => state.snapshot?.connectors.find(c => c.id === state.selectedConnectorId);
  const energyMeter = () => state.snapshot?.energy_meters[state.selectedConnectorId.toString()];

  const telemetryStats = () => [
    { label: "Voltage", value: currentConnector() ? `${currentConnector()!.voltage.toFixed(1)} V` : "---", icon: Zap },
    { label: "Current", value: currentConnector() ? `${currentConnector()!.current.toFixed(1)} A` : "---", icon: Activity },
    { label: "Power", value: currentConnector() ? `${((currentConnector()!.voltage * currentConnector()!.current) / 1000).toFixed(2)} kW` : "---", icon: Zap },
    { label: "Energy", value: energyMeter() ? `${(energyMeter()!.reading_wh / 1000).toFixed(2)} kWh` : "---", icon: Activity },
  ];

  return (
    <div class="flex h-screen bg-bg-main overflow-hidden text-sm">
      {/* Sidebar */}
      <aside class="w-64 border-r border-border-default flex flex-col p-4 bg-bg-secondary/50">
        <div class="flex items-center gap-2 mb-8 px-2">
          <div class="bg-accent-teal rounded-lg p-1.5">
            <Zap size={20} class="text-bg-main fill-current" />
          </div>
          <span class="font-bold text-lg tracking-tight">ChargeGhost</span>
        </div>

        <nav class="flex-1 space-y-1">
          <For each={sidebarItems}>
            {(item) => (
              <button
                onClick={() => setActiveTab(item.id)}
                class={cn(
                  "sidebar-item w-full",
                  activeTab() === item.id && "active"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            )}
          </For>
        </nav>

        <div class="mt-auto space-y-2">
            <div class={cn(
                "p-4 glass-card border-none text-xs transition-colors",
                state.connectionStatus === "connected" ? "bg-accent-teal/5 text-accent-teal/80" : "bg-red-500/5 text-red-500/80"
            )}>
              <div class="flex items-center gap-2 mb-1">
                <div class={cn(
                    "w-2 h-2 rounded-full",
                    state.connectionStatus === "connected" ? "bg-accent-teal shadow-[0_0_8px_rgba(20,184,166,0.6)]" : "bg-red-500 animate-pulse"
                )}></div>
                <span class="font-medium">Simulator Bridge</span>
              </div>
              <p class="text-[10px] opacity-70">
                {state.connectionStatus === "connected" ? "Real-time Link Active" : 
                 state.connectionStatus === "connecting" ? "Connecting..." : "Searching for Simulator..."}
              </p>
            </div>

            <div class={cn(
                "p-4 glass-card border-none text-xs transition-colors",
                state.snapshot?.ocpp_connected ? "bg-accent-teal/5 text-accent-teal/80" : "bg-red-500/5 text-red-500/80"
            )}>
              <div class="flex items-center gap-2 mb-1">
                <Wifi size={14} class={state.snapshot?.ocpp_connected ? "text-accent-teal" : "text-red-500"} />
                <span class="font-medium">OCPP Central System</span>
              </div>
              <p class="text-[10px] opacity-70">
                {state.snapshot?.ocpp_connected ? "Connected to Backend" : "Disconnected from Backend"}
              </p>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main class="flex-1 overflow-y-auto p-8 bg-linear-to-b from-bg-main to-bg-secondary">
        <Show when={state.snapshot} fallback={
            <div class="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                <RefreshCw size={48} class="animate-spin text-accent-teal" />
                <p class="text-lg font-medium animate-pulse">Initializing Mission Control...</p>
            </div>
        }>
            {/* Header */}
            <header class="flex justify-between items-start mb-8">
              <div>
                <h1 class="text-2xl font-bold mb-1 uppercase tracking-tight">Mission Control</h1>
                <p class="text-text-secondary">
                    <span class="text-accent-teal font-mono mr-2">INSTANCE:</span>
                    CG-EVSE-001
                </p>
              </div>
              <div class="flex gap-3">
                <ConnectorStrip />
              </div>
            </header>

            {/* Dashboard Grid */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <For each={telemetryStats()}>
                {(stat) => (
                  <div class="glass-card p-4 group hover:border-accent-teal/30 transition-all">
                    <div class="flex justify-between items-start mb-2">
                      <span class="text-text-secondary text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                      <stat.icon size={14} class="text-text-muted group-hover:text-accent-teal" />
                    </div>
                    <div class="flex items-baseline gap-2">
                      <span class="text-xl font-bold tracking-tight font-mono">{stat.value}</span>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Real-time Telemetry Visualization & Actions */}
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <section class="lg:col-span-3 glass-card p-6 relative overflow-hidden flex flex-col">
                  <div class="flex justify-between items-center mb-6">
                    <h2 class="text-lg font-bold flex items-center gap-2">
                      <Activity size={20} class="text-accent-teal" />
                      Power Delivery Profile
                    </h2>
                    <div class="flex gap-4">
                        <span class="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span class="w-2 h-2 rounded-full bg-accent-teal"></span> Active Power (W)
                        </span>
                    </div>
                  </div>
                  
                  <div class="flex-1 min-h-[300px]">
                    <TelemetryChart connectorId={state.selectedConnectorId} label={`Connector ${state.selectedConnectorId} Power`} color="#14b8a6" />
                  </div>
                </section>

                <div class="lg:col-span-1">
                    <ActionPanel />
                </div>
            </div>

            {/* Secondary Grid */}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <OCPPStream />
                </div>

                <div class="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 class="font-bold mb-4 flex items-center gap-2">
                            <ShieldAlert size={18} class="text-red-500" />
                            Quick Fault Injection
                        </h3>
                        <div class="space-y-2">
                            <button class="w-full text-left px-3 py-2 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-xs text-red-200">
                                EV Communication Error
                            </button>
                            <button class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200">
                                High Temperature Cutoff
                            </button>
                            <button class="w-full text-left px-3 py-2 rounded border border-border-default hover:border-text-muted transition-colors text-xs">
                                Grid Overvoltage
                            </button>
                        </div>
                    </div>
                    <div class="mt-8">
                         <button class="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold border border-border-default rounded-lg hover:bg-white/5">
                            <ArrowUpRight size={14} />
                            Open Fault Designer
                        </button>
                    </div>
                </div>
            </div>
        </Show>
      </main>
    </div>
  );
}
