import { createSignal, createResource, For, Show, Switch, Match } from "solid-js";
import {
  Zap,
  Activity,
  Settings,
  LayoutDashboard,
  Terminal,
  ShieldAlert,
  ArrowUpRight,
  Wifi,
  Cpu,
  RefreshCw
} from "lucide-solid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { state, setState } from "./store/simulator";
import { api } from "./lib/api";
import { TelemetryChart } from "./components/TelemetryChart";
import { ConnectorStrip } from "./components/ConnectorStrip";
import { ActionPanel } from "./components/ActionPanel";
import { OCPPStream } from "./components/OCPPStream";
import { OCPPLogsView } from "./components/OCPPLogsView";
import { SimulatorView } from "./components/SimulatorView";
import { SettingsPanel } from "./components/SettingsPanel";
import { useWebSocket } from "./hooks/useWebSocket";
import { ToastContainer } from "./components/ToastContainer";
import { addToast } from "./store/toast";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MissionControl() {
  useWebSocket();
  const [activeTab, setActiveTab] = createSignal("dashboard");
  const [configInfo] = createResource(() => api.getConfig().catch(() => null));
  const [aboutInfo] = createResource(() => api.getAbout().catch(() => null));
  const [faultAuthTag, setFaultAuthTag] = createSignal("TestTag001");

  const sidebarItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "simulator", icon: Cpu, label: "EVSE Simulator" },
    { id: "ocpp", icon: Terminal, label: "OCPP Logs" },
    { id: "faults", icon: ShieldAlert, label: "Fault Injection" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const instanceId = () => configInfo()?.ocpp_id || "---";

  const currentConnector = () => state.snapshot?.connectors.find(c => c.id === state.selectedConnectorId);
  const energyMeter = () => state.snapshot?.energy_meters[state.selectedConnectorId.toString()];

  const actualPowerW = () => {
    const meter = energyMeter();
    const conn = currentConnector();
    if (!meter || !conn) return 0;
    // Show configured max when charging, 0 when idle
    return meter.is_charging ? conn.voltage * conn.current : 0;
  };

  const telemetryStats = () => [
    { label: "Voltage", value: currentConnector() ? `${currentConnector()!.voltage.toFixed(1)} V` : "---", icon: Zap },
    { label: "Current", value: currentConnector() ? `${currentConnector()!.current.toFixed(1)} A` : "---", icon: Activity },
    { label: "Power", value: currentConnector() ? `${(actualPowerW() / 1000).toFixed(2)} kW` : "---", icon: Zap },
    { label: "Energy", value: energyMeter() ? `${(energyMeter()!.reading_wh / 1000).toFixed(2)} kWh` : "---", icon: Activity },
  ];

  return (
    <div class="flex h-screen bg-bg-main overflow-hidden text-sm">
      <ToastContainer />
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
            <Show when={aboutInfo()}>
              <div class="px-2 pb-2 text-[10px] text-text-muted font-mono">
                v{aboutInfo()!.version} · OCPP {aboutInfo()!.ocpp_versions.join(", ")}
              </div>
            </Show>
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
                {state.connectionStatus === "connected"
                  ? state.sidecarHealthy
                    ? "Real-time link · sidecar healthy"
                    : "WebSocket active"
                  : state.connectionStatus === "connecting"
                    ? "Connecting..."
                    : "Searching for simulator (REST fallback)"}
              </p>
              <Show when={state.snapshot?.uptime_seconds !== undefined}>
                <p class="text-[10px] opacity-60 font-mono mt-1">
                  Engine uptime: {Math.floor(state.snapshot!.uptime_seconds! / 60)}m
                </p>
              </Show>
            </div>

            <div class={cn(
                "p-4 glass-card border-none text-xs transition-colors",
                state.snapshot?.ocpp_connected ? "bg-accent-teal/5 text-accent-teal/80" : "bg-red-500/5 text-red-500/80"
            )}>
              <div class="flex items-center gap-2 mb-1">
                <Wifi size={14} class={state.snapshot?.ocpp_connected ? "text-accent-teal" : "text-red-500"} />
                <span class="font-medium">OCPP CSMS</span>
              </div>
              <p class="text-[10px] opacity-70">
                {state.snapshot?.ocpp_connected ? "Connected to central system" : "Disconnected from CSMS"}
              </p>
              <p class="text-[9px] opacity-50 mt-1">Link detail: Settings → OCPP Link Health</p>
            </div>

            <Show when={(state.snapshot?.pending_remote_starts?.length ?? 0) > 0}>
              <div class="p-4 glass-card border-none text-xs bg-blue-500/5 text-blue-200/90">
                <p class="font-medium mb-1">Pending remote starts</p>
                <For each={state.snapshot!.pending_remote_starts!}>
                  {(pending) => (
                    <p class="text-[10px] font-mono opacity-80">
                      C{pending.connector_id} · {pending.id_tag} · until {new Date(pending.expiry).toLocaleTimeString()}
                    </p>
                  )}
                </For>
              </div>
            </Show>
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
          <Switch>
            <Match when={activeTab() === "dashboard"}>
              {/* Header */}
              <header class="flex justify-between items-start mb-8">
                <div>
                  <h1 class="text-2xl font-bold mb-1 uppercase tracking-tight">Mission Control</h1>
                  <p class="text-text-secondary">
                      <span class="text-accent-teal font-mono mr-2">INSTANCE:</span>
                      {instanceId()}
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
                              <button onClick={() => setActiveTab("faults")} class="w-full text-left px-3 py-2 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-xs text-red-200">
                                  EV Communication Error
                              </button>
                              <button onClick={() => setActiveTab("faults")} class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200">
                                  High Temperature Cutoff
                              </button>
                              <button onClick={() => setActiveTab("faults")} class="w-full text-left px-3 py-2 rounded border border-border-default hover:border-text-muted transition-colors text-xs">
                                  Grid Overvoltage
                              </button>
                          </div>
                      </div>
                      <div class="mt-8">
                           <button onClick={() => setActiveTab("faults")} class="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold border border-border-default rounded-lg hover:bg-white/5">
                              <ArrowUpRight size={14} />
                              Open Fault Designer
                          </button>
                      </div>
                  </div>
              </div>
            </Match>

            <Match when={activeTab() === "simulator"}>
              <SimulatorView />
            </Match>

            <Match when={activeTab() === "ocpp"}>
              <OCPPLogsView />
            </Match>

            <Match when={activeTab() === "faults"}>
              <div class="space-y-6">
                <h2 class="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert size={22} class="text-red-500" />
                  Fault Injection
                </h2>
                <p class="text-xs text-text-muted">Simulate fault conditions on the charge point to test OCPP error handling and recovery.</p>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div class="glass-card p-6 space-y-3">
                    <h3 class="font-bold text-sm text-red-400">Connector Faults</h3>
                    <div class="space-y-2">
                      <For each={[...(state.snapshot?.connectors || [])].sort((a, b) => a.id - b.id)}>
                        {(connector) => (
                          <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-main/50">
                            <span class="text-xs">Connector {connector.id}</span>
                            <div class="flex gap-2">
                              <button
                                onClick={async () => {
                                  try { await api.updateConnector(connector.id, { voltage: 0, current: 0 }); setState("snapshot", await api.getStatus()); addToast("success", `Connector ${connector.id}: zero output`); } catch (e: any) { addToast("error", e.message || "Failed"); }
                                }}
                                class="px-2 py-1 rounded text-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Zero Output
                              </button>
                              <button
                                onClick={async () => {
                                  try { await api.updateConnector(connector.id, { voltage: 265 }); setState("snapshot", await api.getStatus()); addToast("success", `Connector ${connector.id}: overvoltage`); } catch (e: any) { addToast("error", e.message || "Failed"); }
                                }}
                                class="px-2 py-1 rounded text-[10px] border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-colors"
                              >
                                Overvoltage
                              </button>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="glass-card p-6 space-y-3">
                    <h3 class="font-bold text-sm text-orange-400">Session Control</h3>
                    <button
                      onClick={async () => { try { await api.stopAllSessions(); setState("snapshot", await api.getStatus()); addToast("success", "All sessions stopped"); } catch (e: any) { addToast("error", e.message || "Failed"); } }}
                      class="w-full text-left px-3 py-2 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-xs text-red-200"
                    >
                      Emergency Stop All Sessions
                    </button>
                    <For each={state.snapshot?.connectors.filter(c => c.status === "Charging") || []}>
                      {(connector) => (
                        <button
                          onClick={async () => { try { await api.suspendEV(connector.id); setState("snapshot", await api.getStatus()); addToast("success", `Connector ${connector.id} suspended`); } catch (e: any) { addToast("error", e.message || "Failed"); } }}
                          class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200"
                        >
                          Suspend EV on Connector {connector.id}
                        </button>
                      )}
                    </For>
                  </div>

                  <div class="glass-card p-6 space-y-3">
                    <h3 class="font-bold text-sm text-blue-400">OCPP Actions</h3>
                    <button
                      onClick={async () => { try { await api.ocppHeartbeat(); addToast("success", "Heartbeat sent"); } catch (e: any) { addToast("error", e.message || "Heartbeat failed"); } }}
                      class="w-full text-left px-3 py-2 rounded border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-xs text-blue-200"
                    >
                      Send Manual Heartbeat
                    </button>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        value={faultAuthTag()}
                        onInput={(e) => setFaultAuthTag(e.currentTarget.value)}
                        placeholder="ID Tag"
                        class="flex-1 bg-bg-main border border-blue-500/20 rounded px-2 py-2 text-xs font-mono focus:border-blue-500/50 focus:outline-none"
                      />
                      <button
                        onClick={async () => { try { await api.ocppAuthorize(faultAuthTag()); addToast("success", `Authorization sent for ${faultAuthTag()}`); } catch (e: any) { addToast("error", e.message || "Authorize failed"); } }}
                        disabled={!faultAuthTag()}
                        class="px-3 py-2 rounded border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-xs text-blue-200 disabled:opacity-50"
                      >
                        Authorize
                      </button>
                    </div>
                    <button
                      onClick={async () => { try { await api.triggerFirmwareUpdate({ location: "https://example.com/fw.bin", retrieve_date: new Date().toISOString() }); addToast("success", "Firmware update triggered"); } catch (e: any) { addToast("error", e.message || "Failed"); } }}
                      class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200"
                    >
                      Trigger Firmware Update
                    </button>
                    <button
                      onClick={async () => { try { await api.triggerDiagnosticsUpload({ location: "https://example.com/diag", retries: 3, retry_interval: 10 }); addToast("success", "Diagnostics upload triggered"); } catch (e: any) { addToast("error", e.message || "Failed"); } }}
                      class="w-full text-left px-3 py-2 rounded border border-border-default hover:border-text-muted hover:bg-white/5 transition-colors text-xs"
                    >
                      Trigger Diagnostics Upload
                    </button>
                  </div>
                </div>
              </div>
            </Match>

            <Match when={activeTab() === "settings"}>
              <SettingsPanel />
            </Match>
          </Switch>
        </Show>
      </main>
    </div>
  );
}
