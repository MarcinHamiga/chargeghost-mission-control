import { createSignal, For, Show } from "solid-js";
import { 
  Zap, 
  Activity, 
  Settings, 
  LayoutDashboard, 
  Terminal, 
  ShieldAlert, 
  Play, 
  Plus,
  ArrowUpRight,
  Wifi,
  Cpu
} from "lucide-solid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MissionControl() {
  const [activeTab, setActiveTab] = createSignal("dashboard");
  const [chargingStatus, setChargingStatus] = createSignal("Charging");

  const sidebarItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "simulator", icon: Cpu, label: "EVSE Simulator" },
    { id: "ocpp", icon: Terminal, label: "OCPP Logs" },
    { id: "faults", icon: ShieldAlert, label: "Fault Injection" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const telemetryData = [
    { label: "Voltage", value: "238.4 V", trend: "+0.2" },
    { label: "Current", value: "31.8 A", trend: "-0.5" },
    { label: "Power", value: "7.58 kW", trend: "+0.1" },
    { label: "Temp", value: "34.2 °C", trend: "+1.2" },
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

        <div class="mt-auto p-4 glass-card border-none bg-accent-teal/5 text-accent-teal/80 text-xs">
          <div class="flex items-center gap-2 mb-1">
            <Wifi size={14} />
            <span class="font-medium">OCPP Central System</span>
          </div>
          <p class="text-[10px] opacity-70">Connected: ws://localhost:8887</p>
        </div>
      </aside>

      {/* Main Content */}
      <main class="flex-1 overflow-y-auto p-8 bg-linear-to-b from-bg-main to-bg-secondary">
        {/* Header */}
        <header class="flex justify-between items-start mb-8">
          <div>
            <h1 class="text-2xl font-bold mb-1">Mission Control</h1>
            <p class="text-text-secondary">Simulator instance: CG-EVSE-001</p>
          </div>
          <div class="flex gap-3">
            <button class="flex items-center gap-2 px-4 py-2 bg-accent-teal text-bg-main font-bold rounded-lg hover:bg-accent-teal-hover transition-colors">
              <Play size={16} fill="currentColor" />
              Start Session
            </button>
            <button class="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default rounded-lg hover:bg-white/5 transition-colors">
              <Plus size={16} />
              New Scenario
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <For each={telemetryData}>
            {(stat) => (
              <div class="glass-card p-4 group hover:border-accent-teal/30 transition-all">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-text-secondary text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                  <Activity size={14} class="text-text-muted group-hover:text-accent-teal" />
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-xl font-bold tracking-tight">{stat.value}</span>
                  <span class={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    stat.trend.startsWith("+") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Real-time Telemetry Visualization */}
        <section class="glass-card p-6 mb-8 relative overflow-hidden">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <Activity size={20} class="text-accent-teal" />
              Power Delivery Profile
            </h2>
            <div class="flex gap-2">
                <span class="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span class="w-2 h-2 rounded-full bg-accent-teal"></span> Active Power
                </span>
                <span class="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span class="w-2 h-2 rounded-full bg-blue-500"></span> Current limit
                </span>
            </div>
          </div>
          
          <div class="h-48 w-full flex items-end gap-1 px-2 group">
            <For each={Array.from({length: 40})}>
              {(_, i) => (
                <div 
                  class="flex-1 bg-accent-teal/20 rounded-t-sm transition-all duration-500 hover:bg-accent-teal"
                  style={{ 
                    height: `${20 + Math.sin(i() * 0.5) * 40 + Math.random() * 30}%`,
                    "transition-delay": `${i() * 20}ms`
                  }}
                ></div>
              )}
            </For>
            
            {/* Hover tooltip simulation */}
            <div class="absolute inset-0 bg-linear-to-t from-bg-card/20 to-transparent pointer-events-none"></div>
          </div>
        </section>

        {/* Secondary Grid */}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 glass-card p-6">
                <h3 class="font-bold mb-4 flex items-center gap-2">
                    <Terminal size={18} class="text-text-muted" />
                    OCPP Stream
                </h3>
                <div class="space-y-3 font-mono text-[11px]">
                    <div class="flex gap-3 text-green-500">
                        <span class="text-text-muted shrink-0">12:04:22</span>
                        <span class="font-bold shrink-0">[SENT]</span>
                        <span>BootNotification {"{chargePointVendor: 'ChargeGhost', model: 'MissionControl'}"}</span>
                    </div>
                    <div class="flex gap-3 text-blue-400">
                        <span class="text-text-muted shrink-0">12:04:23</span>
                        <span class="font-bold shrink-0">[RECV]</span>
                        <span>BootNotificationResponse {"{status: 'Accepted', currentTime: '2026-04-09T12:04:23Z'}"}</span>
                    </div>
                    <div class="flex gap-3 text-text-primary/60 border-l-2 border-accent-teal pl-3 ml-2">
                        <span class="text-text-muted shrink-0">12:04:45</span>
                        <span class="font-bold shrink-0">[SENT]</span>
                        <span>StatusNotification {"{connectorId: 1, errorCode: 'NoError', status: 'Charging'}"}</span>
                    </div>
                </div>
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
      </main>
    </div>
  );
}
