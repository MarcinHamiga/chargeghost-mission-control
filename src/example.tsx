import { createSignal, createResource, For, Show, Switch, Match, onMount } from "solid-js";
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
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-solid";
import { cn } from "./lib/cn";
import { BRAND_ACCENT_RGB } from "./lib/brand";
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
import { ConfirmDialog } from "./components/ConfirmDialog";
import { addToast } from "./store/toast";

const SIDEBAR_COLLAPSED_KEY = "cg-sidebar-collapsed";

export default function MissionControl() {
  useWebSocket();
  const [activeTab, setActiveTab] = createSignal("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const [configInfo] = createResource(() => api.getConfig().catch(() => null));
  const [aboutInfo] = createResource(() => api.getAbout().catch(() => null));
  const [faultAuthTag, setFaultAuthTag] = createSignal("TestTag001");

  onMount(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setSidebarCollapsed(true);
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const sidebarItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "simulator", icon: Cpu, label: "EVSE Simulator" },
    { id: "ocpp", icon: Terminal, label: "OCPP Logs" },
    { id: "faults", icon: ShieldAlert, label: "Fault Injection" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const instanceId = () => configInfo()?.ocpp_id || "---";

  const currentConnector = () => state.snapshot?.connectors.find((c) => c.id === state.selectedConnectorId);
  const energyMeter = () => state.snapshot?.energy_meters[state.selectedConnectorId.toString()];

  const actualPowerW = () => {
    const meter = energyMeter();
    const conn = currentConnector();
    if (!meter || !conn) return 0;
    return meter.is_charging ? conn.voltage * conn.current : 0;
  };

  const telemetryStats = () => [
    { label: "Voltage", value: currentConnector() ? `${currentConnector()!.voltage.toFixed(1)} V` : "---", icon: Zap },
    { label: "Current", value: currentConnector() ? `${currentConnector()!.current.toFixed(1)} A` : "---", icon: Activity },
    { label: "Power", value: currentConnector() ? `${(actualPowerW() / 1000).toFixed(2)} kW` : "---", icon: Zap },
    { label: "Energy", value: energyMeter() ? `${(energyMeter()!.reading_wh / 1000).toFixed(2)} kWh` : "---", icon: Activity },
  ];

  const bridgeStatusLabel = () => {
    if (state.connectionStatus === "connected") {
      return state.sidecarHealthy ? "Bridge · healthy" : "Bridge · WebSocket";
    }
    if (state.connectionStatus === "connecting") return "Bridge · connecting";
    return "Bridge · REST fallback";
  };

  const ocppStatusLabel = () =>
    state.snapshot?.ocpp_connected ? "CSMS · connected" : "CSMS · disconnected";

  return (
    <div class="flex h-screen bg-bg-main overflow-hidden text-sm">
      <ToastContainer />
      <ConfirmDialog />

      <aside
        class={cn(
          "border-r border-border-default flex flex-col bg-bg-secondary/50 shrink-0 transition-[width] duration-200",
          sidebarCollapsed() ? "w-14 p-2" : "w-52 p-3",
        )}
      >
        <div class={cn("flex items-center mb-4", sidebarCollapsed() ? "justify-center" : "gap-2 px-1")}>
          <div class="bg-accent-teal rounded-lg p-1.5 shrink-0">
            <Zap size={20} class="text-bg-main fill-current" />
          </div>
          <Show when={!sidebarCollapsed()}>
            <span class="font-bold text-base tracking-tight truncate">ChargeGhost</span>
          </Show>
        </div>

        <nav class="flex-1 space-y-1">
          <For each={sidebarItems}>
            {(item) => (
              <button
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                class={cn(
                  "sidebar-item w-full",
                  sidebarCollapsed() && "justify-center px-2",
                  activeTab() === item.id && "active",
                )}
              >
                <item.icon size={18} class="shrink-0" />
                <Show when={!sidebarCollapsed()}>
                  <span class="truncate">{item.label}</span>
                </Show>
              </button>
            )}
          </For>
        </nav>

        <div class="mt-auto space-y-2">
          <Show when={aboutInfo() && !sidebarCollapsed()}>
            <div class="px-1 pb-1 text-xs text-text-muted font-mono truncate">
              v{aboutInfo()!.version} · OCPP {aboutInfo()!.ocpp_versions.join(", ")}
            </div>
          </Show>

          <div
            class={cn(
              "glass-card border-none text-xs transition-colors",
              sidebarCollapsed() ? "p-2" : "p-3",
              state.connectionStatus === "connected" && state.snapshot?.ocpp_connected
                ? "bg-accent-teal/5 text-accent-teal/90"
                : "bg-red-500/5 text-red-400/90",
            )}
          >
            <Show
              when={!sidebarCollapsed()}
              fallback={
                <div class="flex flex-col items-center gap-1.5" title={`${bridgeStatusLabel()} · ${ocppStatusLabel()}`}>
                  <div
                    class={cn(
                      "w-2 h-2 rounded-full",
                      state.connectionStatus === "connected"
                        ? "bg-accent-teal"
                        : "bg-red-500 animate-pulse",
                    )}
                    style={{
                      "box-shadow":
                        state.connectionStatus === "connected"
                          ? `0 0 8px rgba(${BRAND_ACCENT_RGB}, 0.6)`
                          : undefined,
                    }}
                  />
                  <Wifi size={12} class={state.snapshot?.ocpp_connected ? "text-accent-teal" : "text-red-500"} />
                </div>
              }
            >
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div
                    class={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      state.connectionStatus === "connected"
                        ? "bg-accent-teal"
                        : "bg-red-500 animate-pulse",
                    )}
                    style={{
                      "box-shadow":
                        state.connectionStatus === "connected"
                          ? `0 0 8px rgba(${BRAND_ACCENT_RGB}, 0.6)`
                          : undefined,
                    }}
                  />
                  <span class="font-medium truncate">{bridgeStatusLabel()}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Wifi size={12} class={cn("shrink-0", state.snapshot?.ocpp_connected ? "text-accent-teal" : "text-red-500")} />
                  <span class="truncate">{ocppStatusLabel()}</span>
                </div>
                <Show when={state.snapshot?.uptime_seconds !== undefined}>
                  <p class="text-xs opacity-70 font-mono">
                    Uptime {Math.floor(state.snapshot!.uptime_seconds! / 60)}m
                  </p>
                </Show>
                <Show when={(state.snapshot?.pending_remote_starts?.length ?? 0) > 0}>
                  <p class="text-xs text-blue-300">
                    {state.snapshot!.pending_remote_starts!.length} pending remote start(s)
                  </p>
                </Show>
              </div>
            </Show>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed() ? "Expand sidebar" : "Collapse sidebar"}
            class={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border-default",
              "text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-xs",
            )}
          >
            {sidebarCollapsed() ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            <Show when={!sidebarCollapsed()}>Collapse</Show>
          </button>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-linear-to-b from-bg-main to-bg-secondary min-w-0">
        <Show
          when={state.snapshot}
          fallback={
            <div class="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <RefreshCw size={48} class="animate-spin text-accent-teal" />
              <p class="text-lg font-medium animate-pulse">Initializing Mission Control...</p>
            </div>
          }
        >
          <Switch>
            <Match when={activeTab() === "dashboard"}>
              <header class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5">
                <div>
                  <h1 class="text-xl md:text-2xl font-bold mb-1 tracking-tight">Mission Control</h1>
                  <p class="text-text-secondary text-xs">
                    <span class="text-accent-teal font-mono mr-2">INSTANCE</span>
                    {instanceId()}
                  </p>
                </div>
                <ConnectorStrip />
              </header>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <For each={telemetryStats()}>
                  {(stat) => (
                    <div class="glass-card p-3 group hover:border-accent-teal/30 transition-all">
                      <div class="flex justify-between items-start mb-1">
                        <span class="text-text-secondary text-xs font-bold uppercase tracking-widest">{stat.label}</span>
                        <stat.icon size={14} class="text-text-muted group-hover:text-accent-teal" />
                      </div>
                      <span class="text-lg font-bold tracking-tight font-mono">{stat.value}</span>
                    </div>
                  )}
                </For>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <section class="md:col-span-3 glass-card p-4 md:p-5 relative overflow-hidden flex flex-col">
                  <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-bold flex items-center gap-2">
                      <Activity size={18} class="text-accent-teal" />
                      Power Delivery Profile
                    </h2>
                    <span class="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span class="w-2 h-2 rounded-full bg-accent-teal" />
                      Active Power (W)
                    </span>
                  </div>
                  <div class="flex-1 min-h-[220px] md:min-h-[260px]">
                    <TelemetryChart
                      connectorId={state.selectedConnectorId}
                      label={`Connector ${state.selectedConnectorId} Power`}
                      color="#14b8a6"
                    />
                  </div>
                </section>

                <div class="md:col-span-1">
                  <ActionPanel />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-2">
                  <OCPPStream />
                </div>

                <div class="glass-card p-5 flex flex-col justify-between">
                  <div>
                    <h3 class="font-bold mb-3 flex items-center gap-2 text-sm">
                      <ShieldAlert size={16} class="text-red-500" />
                      Fault Scenarios
                    </h3>
                    <p class="text-xs text-text-muted mb-3">
                      Shortcuts to the fault injection panel.
                    </p>
                    <div class="space-y-2">
                      <button
                        onClick={() => setActiveTab("faults")}
                        class="w-full text-left px-3 py-2 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-xs text-red-200"
                      >
                        EV communication error
                      </button>
                      <button
                        onClick={() => setActiveTab("faults")}
                        class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200"
                      >
                        High temperature cutoff
                      </button>
                      <button
                        onClick={() => setActiveTab("faults")}
                        class="w-full text-left px-3 py-2 rounded border border-border-default hover:border-text-muted transition-colors text-xs"
                      >
                        Grid overvoltage
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("faults")}
                    class="mt-6 w-full py-2 flex items-center justify-center gap-2 text-xs font-bold border border-border-default rounded-lg hover:bg-white/5"
                  >
                    <ArrowUpRight size={14} />
                    Open Fault Injection
                  </button>
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
              <div class="space-y-5">
                <h2 class="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert size={22} class="text-red-500" />
                  Fault Injection
                </h2>
                <p class="text-xs text-text-muted">
                  Simulate fault conditions on the charge point to test OCPP error handling and recovery.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div class="glass-card p-5 space-y-3">
                    <h3 class="font-bold text-sm text-red-400">Connector Faults</h3>
                    <div class="space-y-2">
                      <For each={[...(state.snapshot?.connectors || [])].sort((a, b) => a.id - b.id)}>
                        {(connector) => (
                          <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-main/50">
                            <span class="text-xs">Connector {connector.id}</span>
                            <div class="flex gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.updateConnector(connector.id, { voltage: 0, current: 0 });
                                    setState("snapshot", await api.getStatus());
                                    addToast("success", `Connector ${connector.id}: zero output`);
                                  } catch (e: any) {
                                    addToast("error", e.message || "Failed");
                                  }
                                }}
                                class="px-2 py-1 rounded text-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Zero Output
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await api.updateConnector(connector.id, { voltage: 265 });
                                    setState("snapshot", await api.getStatus());
                                    addToast("success", `Connector ${connector.id}: overvoltage`);
                                  } catch (e: any) {
                                    addToast("error", e.message || "Failed");
                                  }
                                }}
                                class="px-2 py-1 rounded text-xs border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-colors"
                              >
                                Overvoltage
                              </button>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="glass-card p-5 space-y-3">
                    <h3 class="font-bold text-sm text-orange-400">Session Control</h3>
                    <button
                      onClick={async () => {
                        try {
                          await api.stopAllSessions();
                          setState("snapshot", await api.getStatus());
                          addToast("success", "All sessions stopped");
                        } catch (e: any) {
                          addToast("error", e.message || "Failed");
                        }
                      }}
                      class="w-full text-left px-3 py-2 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-xs text-red-200"
                    >
                      Emergency Stop All Sessions
                    </button>
                    <For each={state.snapshot?.connectors.filter((c) => c.status === "Charging") || []}>
                      {(connector) => (
                        <button
                          onClick={async () => {
                            try {
                              await api.suspendEV(connector.id);
                              setState("snapshot", await api.getStatus());
                              addToast("success", `Connector ${connector.id} suspended`);
                            } catch (e: any) {
                              addToast("error", e.message || "Failed");
                            }
                          }}
                          class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200"
                        >
                          Suspend EV on Connector {connector.id}
                        </button>
                      )}
                    </For>
                  </div>

                  <div class="glass-card p-5 space-y-3">
                    <h3 class="font-bold text-sm text-blue-400">OCPP Actions</h3>
                    <button
                      onClick={async () => {
                        try {
                          await api.ocppHeartbeat();
                          addToast("success", "Heartbeat sent");
                        } catch (e: any) {
                          addToast("error", e.message || "Heartbeat failed");
                        }
                      }}
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
                        onClick={async () => {
                          try {
                            await api.ocppAuthorize(faultAuthTag());
                            addToast("success", `Authorization sent for ${faultAuthTag()}`);
                          } catch (e: any) {
                            addToast("error", e.message || "Authorize failed");
                          }
                        }}
                        disabled={!faultAuthTag()}
                        class="px-3 py-2 rounded border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-xs text-blue-200 disabled:opacity-50"
                      >
                        Authorize
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await api.triggerFirmwareUpdate({
                            location: "https://example.com/fw.bin",
                            retrieve_date: new Date().toISOString(),
                          });
                          addToast("success", "Firmware update triggered");
                        } catch (e: any) {
                          addToast("error", e.message || "Failed");
                        }
                      }}
                      class="w-full text-left px-3 py-2 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-xs text-orange-200"
                    >
                      Trigger Firmware Update
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.triggerDiagnosticsUpload({
                            location: "https://example.com/diag",
                            retries: 3,
                            retry_interval: 10,
                          });
                          addToast("success", "Diagnostics upload triggered");
                        } catch (e: any) {
                          addToast("error", e.message || "Failed");
                        }
                      }}
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
