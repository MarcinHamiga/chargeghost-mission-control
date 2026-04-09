import { createSignal, createResource, createEffect, For, Show, onCleanup } from "solid-js";
import { api } from "../lib/api";
import { state, setState } from "../store/simulator";
import { addToast } from "../store/toast";
import {
  Cpu, Plus, Trash2, Battery, Zap,
  User, Calendar, BarChart3, Layers, Pencil, Check, X,
  Upload, Download, XCircle, Eye
} from "lucide-solid";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ConnectorStrip } from "./ConnectorStrip";
import { ActionPanel } from "./ActionPanel";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function SimulatorView() {
  const refreshState = async () => {
    const snapshot = await api.getStatus();
    setState("snapshot", snapshot);
  };

  const [profiles, { refetch: refetchProfiles }] = createResource(() => api.getChargingProfiles());
  const [reservations, { refetch: refetchReservations }] = createResource(() => api.getReservations());
  const [firmware, { refetch: refetchFirmware }] = createResource(() => api.getFirmwareStatus());
  const [diagnostics, { refetch: refetchDiagnostics }] = createResource(() => api.getDiagnosticsStatus());
  const [lastStopped, { refetch: refetchLastStopped }] = createResource(() => api.getLastStoppedSession().catch(() => null));
  const [allSessions, { refetch: refetchSessions }] = createResource(() => api.getSessions().catch(() => []));
  const [showSessionHistory, setShowSessionHistory] = createSignal(false);

  const [addingConnector, setAddingConnector] = createSignal(false);
  const [newVoltage, setNewVoltage] = createSignal(230);
  const [newCurrent, setNewCurrent] = createSignal(32);
  const [newPhase, setNewPhase] = createSignal<1 | 3>(1);

  // Connector editing
  const [editingConnector, setEditingConnector] = createSignal(false);
  const [editVoltage, setEditVoltage] = createSignal(0);
  const [editCurrent, setEditCurrent] = createSignal(0);
  const [editPhase, setEditPhase] = createSignal<1 | 3>(1);

  // Reservation creation
  const [addingReservation, setAddingReservation] = createSignal(false);
  const [resConnectorId, setResConnectorId] = createSignal(1);
  const [resIdTag, setResIdTag] = createSignal("");
  const [resExpiryDate, setResExpiryDate] = createSignal("");
  const [resParentIdTag, setResParentIdTag] = createSignal("");
  const [resReservationId, setResReservationId] = createSignal(1);

  // Charging profile creation
  const [addingProfile, setAddingProfile] = createSignal(false);
  const [profileConnectorId, setProfileConnectorId] = createSignal(1);
  const [profilePurpose, setProfilePurpose] = createSignal<string>("TxDefaultProfile");
  const [profileStackLevel, setProfileStackLevel] = createSignal(0);
  const [profileKind, setProfileKind] = createSignal<string>("Absolute");
  const [profilePeriods, setProfilePeriods] = createSignal<{ start_period: number; limit: number; number_phases?: number }[]>([{ start_period: 0, limit: 32 }]);

  // Composite schedule
  const [compositeConnectorId, setCompositeConnectorId] = createSignal(1);
  const [compositeDuration, setCompositeDuration] = createSignal(3600);
  const [compositeResult, setCompositeResult] = createSignal<any>(null);
  const [showComposite, setShowComposite] = createSignal(false);

  // Firmware
  const [fwLocation, setFwLocation] = createSignal("");
  const [fwRetrieveDate, setFwRetrieveDate] = createSignal("");
  const [showFwForm, setShowFwForm] = createSignal(false);

  // Diagnostics
  const [diagLocation, setDiagLocation] = createSignal("");
  const [diagRetries, setDiagRetries] = createSignal(3);
  const [diagRetryInterval, setDiagRetryInterval] = createSignal(10);
  const [showDiagForm, setShowDiagForm] = createSignal(false);

  const handleAddConnector = async () => {
    try {
      await api.createConnector({ voltage: newVoltage(), current: newCurrent(), phase: newPhase() });
      await refreshState();
      setAddingConnector(false);
      addToast("success", "Connector created");
    } catch (e: any) {
      addToast("error", `Failed to add connector: ${e.message || e}`);
    }
  };

  const handleDeleteConnector = async (id: number) => {
    if (!confirm(`Delete connector ${id}?`)) return;
    try {
      await api.deleteConnector(id);
      await refreshState();
      addToast("success", `Connector ${id} deleted`);
    } catch (e: any) {
      addToast("error", `Failed to delete connector: ${e.message || e}`);
    }
  };

  const handleCancelReservation = async (id: number) => {
    try {
      await api.cancelReservation(id);
      refetchReservations();
      addToast("success", "Reservation cancelled");
    } catch (e: any) {
      addToast("error", `Failed to cancel reservation: ${e.message || e}`);
    }
  };

  const startEditingConnector = () => {
    const c = currentConnector();
    if (!c) return;
    setEditVoltage(c.voltage);
    setEditCurrent(c.current);
    setEditPhase(c.phase);
    setEditingConnector(true);
  };

  const handleUpdateConnector = async () => {
    const c = currentConnector();
    if (!c) return;
    try {
      await api.updateConnector(c.id, {
        voltage: editVoltage(),
        current: editCurrent(),
        phase: editPhase(),
      });
      await refreshState();
      setEditingConnector(false);
      addToast("success", `Connector ${c.id} updated`);
    } catch (e: any) {
      addToast("error", `Failed to update connector: ${e.message || e}`);
    }
  };

  const handleCreateReservation = async () => {
    try {
      await api.createReservation({
        reservation_id: resReservationId(),
        connector_id: resConnectorId(),
        id_tag: resIdTag(),
        expiry_date: new Date(resExpiryDate()).toISOString(),
        parent_id_tag: resParentIdTag() || null,
      });
      setAddingReservation(false);
      setResIdTag("");
      setResExpiryDate("");
      setResParentIdTag("");
      refetchReservations();
      addToast("success", "Reservation created");
    } catch (e: any) {
      addToast("error", `Failed to create reservation: ${e.message || e}`);
    }
  };

  const handleCreateProfile = async () => {
    try {
      await api.createChargingProfile({
        connector_id: profileConnectorId(),
        profile: {
          profile_id: Date.now() % 100000,
          connector_id: profileConnectorId(),
          purpose: profilePurpose(),
          stack_level: profileStackLevel(),
          charging_profile_kind: profileKind(),
          schedule_period: profilePeriods(),
        },
      });
      setAddingProfile(false);
      refetchProfiles();
      addToast("success", "Charging profile created");
    } catch (e: any) {
      addToast("error", `Failed to create charging profile: ${e.message || e}`);
    }
  };

  const handleDeleteProfile = async (profileId: number, connectorId?: number) => {
    try {
      await api.deleteChargingProfiles({ profile_id: profileId, connector_id: connectorId });
      refetchProfiles();
      addToast("success", `Profile #${profileId} deleted`);
    } catch (e: any) {
      addToast("error", `Failed to delete charging profile: ${e.message || e}`);
    }
  };

  const handleGetCompositeSchedule = async () => {
    try {
      const result = await api.getCompositeSchedule(compositeConnectorId(), compositeDuration());
      setCompositeResult(result);
      setShowComposite(true);
    } catch (e: any) {
      addToast("error", `Failed to get composite schedule: ${e.message || e}`);
    }
  };

  const handleTriggerFirmware = async () => {
    try {
      await api.triggerFirmwareUpdate({
        location: fwLocation(),
        retrieve_date: fwRetrieveDate() ? new Date(fwRetrieveDate()).toISOString() : new Date().toISOString(),
      });
      setShowFwForm(false);
      refetchFirmware();
      addToast("success", "Firmware update triggered");
    } catch (e: any) {
      addToast("error", `Failed to trigger firmware update: ${e.message || e}`);
    }
  };

  const handleCancelFirmware = async () => {
    try {
      await api.cancelFirmwareUpdate();
      refetchFirmware();
      addToast("info", "Firmware update cancelled");
    } catch (e: any) {
      addToast("error", `Failed to cancel firmware update: ${e.message || e}`);
    }
  };

  const handleTriggerDiagnostics = async () => {
    try {
      await api.triggerDiagnosticsUpload({
        location: diagLocation(),
        retries: diagRetries(),
        retry_interval: diagRetryInterval(),
      });
      setShowDiagForm(false);
      refetchDiagnostics();
      addToast("success", "Diagnostics upload triggered");
    } catch (e: any) {
      addToast("error", `Failed to trigger diagnostics upload: ${e.message || e}`);
    }
  };

  const handleCancelDiagnostics = async () => {
    try {
      await api.cancelDiagnosticsUpload();
      refetchDiagnostics();
      addToast("info", "Diagnostics upload cancelled");
    } catch (e: any) {
      addToast("error", `Failed to cancel diagnostics upload: ${e.message || e}`);
    }
  };

  // Auto-refresh firmware/diagnostics when active
  const fwDiagInterval = setInterval(() => {
    if (firmware()?.status && firmware()!.status !== "Idle") refetchFirmware();
    if (diagnostics()?.status && diagnostics()!.status !== "Idle") refetchDiagnostics();
  }, 3000);
  onCleanup(() => clearInterval(fwDiagInterval));

  // Close editing form when connector selection changes
  createEffect(() => {
    state.selectedConnectorId; // track
    setEditingConnector(false);
  });

  const currentConnector = () => state.snapshot?.connectors.find(c => c.id === state.selectedConnectorId);
  const connectorSession = () => state.snapshot?.active_sessions.find(s => s.connector_id === state.selectedConnectorId);
  const energyMeter = () => state.snapshot?.energy_meters[state.selectedConnectorId.toString()];

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <Cpu size={22} class="text-accent-teal" />
          EVSE Simulator
        </h2>
        <button
          onClick={() => setAddingConnector(!addingConnector())}
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-xs font-bold hover:bg-accent-teal/20 transition-all"
        >
          <Plus size={14} />
          Add Connector
        </button>
      </div>

      {/* Add Connector Form */}
      <Show when={addingConnector()}>
        <div class="glass-card p-4">
          <div class="flex items-end gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Voltage (V) <span class="font-normal text-text-muted">120–1000</span></label>
              <input
                type="number"
                min={120}
                max={1000}
                value={newVoltage()}
                onInput={(e) => setNewVoltage(Number(e.currentTarget.value))}
                class="w-24 bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Current (A) <span class="font-normal text-text-muted">1–500</span></label>
              <input
                type="number"
                min={1}
                max={500}
                value={newCurrent()}
                onInput={(e) => setNewCurrent(Number(e.currentTarget.value))}
                class="w-24 bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Phase</label>
              <select
                value={newPhase()}
                onChange={(e) => setNewPhase(Number(e.currentTarget.value) as 1 | 3)}
                class="bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs focus:border-accent-teal/50 focus:outline-none"
              >
                <option value={1}>1-Phase</option>
                <option value={3}>3-Phase</option>
              </select>
            </div>
            <button
              onClick={handleAddConnector}
              disabled={newVoltage() < 120 || newVoltage() > 1000 || newCurrent() < 1 || newCurrent() > 500}
              class="px-4 py-2 rounded-lg bg-accent-teal text-bg-main text-xs font-bold hover:bg-accent-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => setAddingConnector(false)}
              class="px-4 py-2 rounded-lg border border-border-default text-xs hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Show>

      {/* Connector Strip */}
      <ConnectorStrip />

      {/* Main Grid: Selected Connector Detail + Actions */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connector Detail */}
        <div class="lg:col-span-2 space-y-4">
          <Show when={currentConnector()}>
            {(connector) => (
              <div class="glass-card p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-sm flex items-center gap-2">
                    <Zap size={16} class="text-accent-teal" />
                    Connector {connector().id} Detail
                  </h3>
                  <div class="flex items-center gap-2">
                    <span class={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      connector().status === "Charging" ? "bg-accent-teal/10 text-accent-teal" :
                      connector().status === "Faulted" ? "bg-red-500/10 text-red-400" :
                      connector().status === "Available" ? "bg-green-500/10 text-green-400" :
                      "bg-yellow-500/10 text-yellow-400"
                    )}>
                      {connector().status}
                    </span>
                    <Show when={!editingConnector()}>
                      <button
                        onClick={startEditingConnector}
                        class="p-1.5 rounded border border-accent-teal/20 text-accent-teal hover:bg-accent-teal/10 transition-colors"
                        title="Edit connector"
                      >
                        <Pencil size={12} />
                      </button>
                    </Show>
                    <button
                      onClick={() => handleDeleteConnector(connector().id)}
                      class="p-1.5 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete connector"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <Show when={editingConnector()} fallback={
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-1">
                      <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Voltage</span>
                      <p class="text-lg font-mono font-bold">{connector().voltage.toFixed(1)} <span class="text-xs text-text-muted">V</span></p>
                    </div>
                    <div class="space-y-1">
                      <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Current</span>
                      <p class="text-lg font-mono font-bold">{connector().current.toFixed(1)} <span class="text-xs text-text-muted">A</span></p>
                    </div>
                    <div class="space-y-1">
                      <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Phase</span>
                      <p class="text-lg font-mono font-bold">{connector().phase}<span class="text-xs text-text-muted">φ</span></p>
                    </div>
                    <div class="space-y-1">
                      <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Plugged In</span>
                      <p class="text-lg font-mono font-bold">{connector().is_plugged_in ? "Yes" : "No"}</p>
                    </div>
                  </div>
                }>
                  <div class="flex items-end gap-4">
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Voltage (V) <span class="font-normal text-text-muted">120–1000</span></label>
                      <input
                        type="number"
                        min={120}
                        max={1000}
                        value={editVoltage()}
                        onInput={(e) => setEditVoltage(Number(e.currentTarget.value))}
                        class={cn(
                          "w-28 bg-bg-main border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none",
                          editVoltage() < 120 || editVoltage() > 1000
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-border-default focus:border-accent-teal/50"
                        )}
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Current (A) <span class="font-normal text-text-muted">1–500</span></label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={editCurrent()}
                        onInput={(e) => setEditCurrent(Number(e.currentTarget.value))}
                        class={cn(
                          "w-28 bg-bg-main border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none",
                          editCurrent() < 1 || editCurrent() > 500
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-border-default focus:border-accent-teal/50"
                        )}
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Phase</label>
                      <select
                        value={editPhase()}
                        onChange={(e) => setEditPhase(Number(e.currentTarget.value) as 1 | 3)}
                        class="bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs focus:border-accent-teal/50 focus:outline-none"
                      >
                        <option value={1}>1-Phase</option>
                        <option value={3}>3-Phase</option>
                      </select>
                    </div>
                    <button
                      onClick={handleUpdateConnector}
                      disabled={editVoltage() < 120 || editVoltage() > 1000 || editCurrent() < 1 || editCurrent() > 500}
                      class="p-2 rounded-lg bg-accent-teal text-bg-main hover:bg-accent-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingConnector(false)}
                      class="p-2 rounded-lg border border-border-default hover:bg-white/5 transition-colors"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </Show>

                <Show when={connector().id_tag}>
                  <div class="mt-4 pt-4 border-t border-border-default flex items-center gap-2 text-xs text-text-secondary">
                    <User size={12} />
                    RFID Tag: <span class="font-mono text-accent-teal">{connector().id_tag}</span>
                  </div>
                </Show>
              </div>
            )}
          </Show>

          {/* Active Session for this connector */}
          <Show when={connectorSession()}>
            {(session) => (
              <div class="glass-card p-6">
                <h3 class="font-bold text-sm flex items-center gap-2 mb-4">
                  <Battery size={16} class="text-accent-teal" />
                  Active Session
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Transaction ID</span>
                    <p class="text-sm font-mono font-bold">#{session().transaction_id}</p>
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Energy Charged</span>
                    <p class="text-sm font-mono font-bold">{(session().energy_charged_wh / 1000).toFixed(2)} <span class="text-[10px] text-text-muted">kWh</span></p>
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">SoC</span>
                    <p class="text-sm font-mono font-bold">{session().state_of_charge}%</p>
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Started</span>
                    <p class="text-sm font-mono font-bold">{new Date(session().start_time).toLocaleTimeString([], { hour12: false })}</p>
                  </div>
                </div>

                {/* SoC Progress Bar */}
                <div class="mt-4">
                  <div class="w-full h-2 bg-bg-main rounded-full overflow-hidden">
                    <div
                      class="h-full bg-accent-teal rounded-full transition-all duration-1000"
                      style={{ width: `${session().state_of_charge}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Show>

          {/* Energy Meter */}
          <Show when={energyMeter()}>
            {(meter) => (
              <div class="glass-card p-6">
                <h3 class="font-bold text-sm flex items-center gap-2 mb-4">
                  <BarChart3 size={16} class="text-accent-teal" />
                  Energy Meter
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Meter Reading</span>
                    <p class="text-lg font-mono font-bold">{(meter().reading_wh / 1000).toFixed(3)} <span class="text-xs text-text-muted">kWh</span></p>
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Charging</span>
                    <p class="text-lg font-mono font-bold">{meter().is_charging ? "Active" : "Idle"}</p>
                  </div>
                </div>
              </div>
            )}
          </Show>

          {/* Session History */}
          <div class="glass-card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2">
                <Layers size={16} class="text-text-muted" />
                Session History
              </h3>
              <button
                onClick={() => { setShowSessionHistory(!showSessionHistory()); refetchSessions(); refetchLastStopped(); }}
                class="text-[10px] text-accent-teal hover:text-accent-teal/80"
              >
                {showSessionHistory() ? "Hide" : "Show"}
              </button>
            </div>

            <Show when={lastStopped()}>
              {(session) => (
                <div class="p-3 rounded-lg border border-border-default bg-bg-main/50 mb-3">
                  <div class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Last Completed Session</div>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span class="text-text-muted">Tx #</span> <span class="font-mono font-bold">{session().transaction_id}</span></div>
                    <div><span class="text-text-muted">Connector</span> <span class="font-mono font-bold">{session().connector_id}</span></div>
                    <div><span class="text-text-muted">Energy</span> <span class="font-mono font-bold">{(session().energy_charged_wh / 1000).toFixed(2)} kWh</span></div>
                    <div><span class="text-text-muted">SoC</span> <span class="font-mono font-bold">{session().state_of_charge}%</span></div>
                  </div>
                </div>
              )}
            </Show>

            <Show when={!lastStopped() && !showSessionHistory()}>
              <p class="text-xs text-text-muted italic">No completed sessions yet</p>
            </Show>

            <Show when={showSessionHistory()}>
              <Show when={allSessions() && allSessions()!.length > 0} fallback={
                <p class="text-xs text-text-muted italic">No sessions found</p>
              }>
                <div class="space-y-2">
                  <For each={allSessions()}>
                    {(session) => (
                      <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-main/50 text-xs">
                        <div class="flex items-center gap-4">
                          <span class="font-mono text-text-muted">#{session.transaction_id}</span>
                          <span>Conn {session.connector_id}</span>
                          <span class="font-mono">{(session.energy_charged_wh / 1000).toFixed(2)} kWh</span>
                          <span class="text-text-muted">{session.state_of_charge}%</span>
                        </div>
                        <span class={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                          session.is_charging ? "bg-accent-teal/10 text-accent-teal" : "bg-zinc-700/50 text-text-muted"
                        )}>
                          {session.is_charging ? "Active" : "Stopped"}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </div>

        {/* Action Panel */}
        <div>
          <ActionPanel />
        </div>
      </div>

      {/* Reservations */}
      <div class="glass-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-sm flex items-center gap-2">
            <Calendar size={16} class="text-text-muted" />
            Reservations
            <Show when={reservations()}>
              <span class="text-[10px] font-normal text-text-muted">({reservations()!.length})</span>
            </Show>
          </h3>
          <button
            onClick={() => setAddingReservation(!addingReservation())}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-[10px] font-bold hover:bg-accent-teal/20 transition-all"
          >
            <Plus size={12} />
            Add Reservation
          </button>
        </div>

        <Show when={addingReservation()}>
          <div class="p-4 rounded-lg border border-accent-teal/20 bg-accent-teal/5 mb-4">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Reservation ID</label>
                <input type="number" value={resReservationId()} onInput={(e) => setResReservationId(Number(e.currentTarget.value))}
                  class="w-full bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Connector ID</label>
                <input type="number" value={resConnectorId()} onInput={(e) => setResConnectorId(Number(e.currentTarget.value))}
                  class="w-full bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">ID Tag</label>
                <input type="text" value={resIdTag()} onInput={(e) => setResIdTag(e.currentTarget.value)} placeholder="e.g. Tag001"
                  class="w-full bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Expiry Date</label>
                <input type="datetime-local" value={resExpiryDate()} onInput={(e) => setResExpiryDate(e.currentTarget.value)}
                  class="w-full bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
              </div>
              <div class="flex gap-2">
                <button onClick={handleCreateReservation} disabled={!resIdTag() || !resExpiryDate()}
                  class="px-3 py-2 rounded-lg bg-accent-teal text-bg-main text-xs font-bold hover:bg-accent-teal/90 transition-colors disabled:opacity-50">
                  Create
                </button>
                <button onClick={() => setAddingReservation(false)}
                  class="px-3 py-2 rounded-lg border border-border-default text-xs hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
            <div class="mt-2">
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Parent ID Tag (optional)</label>
                <input type="text" value={resParentIdTag()} onInput={(e) => setResParentIdTag(e.currentTarget.value)} placeholder="optional"
                  class="w-48 bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
              </div>
            </div>
          </div>
        </Show>

        <Show when={reservations() && reservations()!.length > 0} fallback={
          <p class="text-xs text-text-muted italic">No active reservations</p>
        }>
          <div class="space-y-2">
            <For each={reservations()}>
              {(res) => (
                <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-main/50">
                  <div class="flex items-center gap-4 text-xs">
                    <span class="font-mono text-text-muted">#{res.reservation_id}</span>
                    <span>Connector {res.connector_id}</span>
                    <span class="font-mono text-accent-teal">{res.id_tag}</span>
                    <span class="text-text-muted">Expires: {new Date(res.expiry_date).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleCancelReservation(res.reservation_id)}
                    class="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Charging Profiles + Firmware/Diagnostics */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charging Profiles */}
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-sm flex items-center gap-2">
              <Layers size={16} class="text-text-muted" />
              Charging Profiles
              <Show when={profiles()}>
                <span class="text-[10px] font-normal text-text-muted">({profiles()!.length})</span>
              </Show>
            </h3>
            <div class="flex gap-2">
              <button
                onClick={() => setShowComposite(!showComposite())}
                class="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-border-default text-text-secondary hover:bg-white/5 transition-colors"
              >
                <Eye size={10} />
                Composite
              </button>
              <button
                onClick={() => setAddingProfile(!addingProfile())}
                class="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent-teal/10 border border-accent-teal/30 text-accent-teal font-bold hover:bg-accent-teal/20 transition-all"
              >
                <Plus size={10} />
                Add
              </button>
            </div>
          </div>

          {/* Composite Schedule Viewer */}
          <Show when={showComposite()}>
            <div class="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 mb-4">
              <div class="flex items-end gap-3 mb-3">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Connector ID</label>
                  <input type="number" value={compositeConnectorId()} onInput={(e) => setCompositeConnectorId(Number(e.currentTarget.value))}
                    class="w-20 bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Duration (s)</label>
                  <input type="number" value={compositeDuration()} onInput={(e) => setCompositeDuration(Number(e.currentTarget.value))}
                    class="w-24 bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <button onClick={handleGetCompositeSchedule}
                  class="px-3 py-1.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-colors">
                  Get Schedule
                </button>
              </div>
              <Show when={compositeResult()}>
                <div class="text-[10px] font-mono text-text-secondary max-h-32 overflow-y-auto custom-scrollbar">
                  <pre>{JSON.stringify(compositeResult(), null, 2)}</pre>
                </div>
              </Show>
            </div>
          </Show>

          {/* Create Profile Form */}
          <Show when={addingProfile()}>
            <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 mb-4 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Connector ID</label>
                  <input type="number" value={profileConnectorId()} onInput={(e) => setProfileConnectorId(Number(e.currentTarget.value))}
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Stack Level</label>
                  <input type="number" value={profileStackLevel()} onInput={(e) => setProfileStackLevel(Number(e.currentTarget.value))}
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Purpose</label>
                  <select value={profilePurpose()} onChange={(e) => setProfilePurpose(e.currentTarget.value)}
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs focus:border-accent-teal/50 focus:outline-none">
                    <option value="ChargePointMaxProfile">ChargePointMaxProfile</option>
                    <option value="TxDefaultProfile">TxDefaultProfile</option>
                    <option value="TxProfile">TxProfile</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Kind</label>
                  <select value={profileKind()} onChange={(e) => setProfileKind(e.currentTarget.value)}
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs focus:border-accent-teal/50 focus:outline-none">
                    <option value="Absolute">Absolute</option>
                    <option value="Recurring">Recurring</option>
                    <option value="Relative">Relative</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-1">Schedule Periods</label>
                <For each={profilePeriods()}>
                  {(period, idx) => (
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-[10px] text-text-muted w-6">#{idx() + 1}</span>
                      <input type="number" value={period.start_period} placeholder="Start (s)"
                        onInput={(e) => {
                          const p = [...profilePeriods()];
                          p[idx()] = { ...p[idx()], start_period: Number(e.currentTarget.value) };
                          setProfilePeriods(p);
                        }}
                        class="w-20 bg-bg-main border border-border-default rounded px-2 py-1 text-[10px] font-mono focus:border-accent-teal/50 focus:outline-none" />
                      <input type="number" value={period.limit} placeholder="Limit (A)"
                        onInput={(e) => {
                          const p = [...profilePeriods()];
                          p[idx()] = { ...p[idx()], limit: Number(e.currentTarget.value) };
                          setProfilePeriods(p);
                        }}
                        class="w-20 bg-bg-main border border-border-default rounded px-2 py-1 text-[10px] font-mono focus:border-accent-teal/50 focus:outline-none" />
                      <button onClick={() => setProfilePeriods(profilePeriods().filter((_, i) => i !== idx()))}
                        class="text-red-400 hover:text-red-300"><Trash2 size={10} /></button>
                    </div>
                  )}
                </For>
                <button onClick={() => setProfilePeriods([...profilePeriods(), { start_period: 0, limit: 32 }])}
                  class="text-[10px] text-accent-teal hover:text-accent-teal/80 mt-1">+ Add Period</button>
              </div>
              <div class="flex gap-2">
                <button onClick={handleCreateProfile}
                  class="px-3 py-1.5 rounded bg-accent-teal text-bg-main text-[10px] font-bold hover:bg-accent-teal/90 transition-colors">
                  Create Profile
                </button>
                <button onClick={() => setAddingProfile(false)}
                  class="px-3 py-1.5 rounded border border-border-default text-[10px] hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </Show>

          <Show when={profiles() && profiles()!.length > 0} fallback={
            <p class="text-xs text-text-muted italic">No charging profiles configured</p>
          }>
            <div class="space-y-2">
              <For each={profiles()}>
                {(profile) => (
                  <div class="p-3 rounded-lg border border-border-default bg-bg-main/50 text-xs">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold">Profile #{profile.profile_id}</span>
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-accent-teal/10 text-accent-teal">{profile.purpose}</span>
                        <button
                          onClick={() => handleDeleteProfile(profile.profile_id, profile.connector_id)}
                          class="text-red-400 hover:text-red-300 p-0.5"
                          title="Delete profile"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <div class="text-text-muted">
                      Connector {profile.connector_id} · Stack Level {profile.stack_level} · {profile.charging_profile_kind}
                    </div>
                    <Show when={profile.schedule_period.length > 0}>
                      <div class="mt-2 text-[10px] text-text-muted">
                        {profile.schedule_period.length} schedule period(s), max limit: {Math.max(...profile.schedule_period.map(p => p.limit))}A
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Firmware & Diagnostics */}
        <div class="space-y-4">
          <div class="glass-card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2">
                <Upload size={16} class="text-text-muted" />
                Firmware
              </h3>
              <div class="flex gap-2">
                <Show when={firmware()?.status !== "Idle"}>
                  <button onClick={handleCancelFirmware}
                    class="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
                    <XCircle size={10} />
                    Cancel
                  </button>
                </Show>
                <button onClick={() => setShowFwForm(!showFwForm())}
                  class="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent-teal/10 border border-accent-teal/30 text-accent-teal font-bold hover:bg-accent-teal/20 transition-all">
                  <Upload size={10} />
                  Update
                </button>
              </div>
            </div>

            <Show when={showFwForm()}>
              <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 mb-4 space-y-2">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Firmware Location URL</label>
                  <input type="text" value={fwLocation()} onInput={(e) => setFwLocation(e.currentTarget.value)} placeholder="https://example.com/firmware.bin"
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Retrieve Date</label>
                  <input type="datetime-local" value={fwRetrieveDate()} onInput={(e) => setFwRetrieveDate(e.currentTarget.value)}
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <div class="flex gap-2">
                  <button onClick={handleTriggerFirmware} disabled={!fwLocation()}
                    class="px-3 py-1.5 rounded bg-accent-teal text-bg-main text-[10px] font-bold hover:bg-accent-teal/90 transition-colors disabled:opacity-50">
                    Trigger Update
                  </button>
                  <button onClick={() => setShowFwForm(false)}
                    class="px-3 py-1.5 rounded border border-border-default text-[10px] hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </Show>

            <Show when={firmware()} fallback={<p class="text-xs text-text-muted">Loading...</p>}>
              {(fw) => (
                <div class="space-y-2 text-xs">
                  <div class="flex justify-between">
                    <span class="text-text-muted">Status</span>
                    <span class="font-mono font-bold">{fw().status}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-text-muted">Version</span>
                    <span class="font-mono">{fw().current_version}</span>
                  </div>
                  <Show when={fw().target_version}>
                    <div class="flex justify-between">
                      <span class="text-text-muted">Target</span>
                      <span class="font-mono">{fw().target_version}</span>
                    </div>
                  </Show>
                  <Show when={fw().status !== "Idle"}>
                    <div class="w-full h-1.5 bg-bg-main rounded-full overflow-hidden mt-2">
                      <div class="h-full bg-accent-teal rounded-full transition-all" style={{ width: `${fw().progress}%` }} />
                    </div>
                  </Show>
                  <Show when={fw().error}>
                    <p class="text-red-400 text-[10px]">{fw().error}</p>
                  </Show>
                </div>
              )}
            </Show>
          </div>

          <div class="glass-card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm flex items-center gap-2">
                <Download size={16} class="text-text-muted" />
                Diagnostics
              </h3>
              <div class="flex gap-2">
                <Show when={diagnostics()?.status !== "Idle"}>
                  <button onClick={handleCancelDiagnostics}
                    class="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
                    <XCircle size={10} />
                    Cancel
                  </button>
                </Show>
                <button onClick={() => setShowDiagForm(!showDiagForm())}
                  class="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent-teal/10 border border-accent-teal/30 text-accent-teal font-bold hover:bg-accent-teal/20 transition-all">
                  <Upload size={10} />
                  Upload
                </button>
              </div>
            </div>

            <Show when={showDiagForm()}>
              <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 mb-4 space-y-2">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Upload Location URL</label>
                  <input type="text" value={diagLocation()} onInput={(e) => setDiagLocation(e.currentTarget.value)} placeholder="https://example.com/diagnostics"
                    class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Retries</label>
                    <input type="number" value={diagRetries()} onInput={(e) => setDiagRetries(Number(e.currentTarget.value))}
                      class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Retry Interval (s)</label>
                    <input type="number" value={diagRetryInterval()} onInput={(e) => setDiagRetryInterval(Number(e.currentTarget.value))}
                      class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                  </div>
                </div>
                <div class="flex gap-2">
                  <button onClick={handleTriggerDiagnostics} disabled={!diagLocation()}
                    class="px-3 py-1.5 rounded bg-accent-teal text-bg-main text-[10px] font-bold hover:bg-accent-teal/90 transition-colors disabled:opacity-50">
                    Trigger Upload
                  </button>
                  <button onClick={() => setShowDiagForm(false)}
                    class="px-3 py-1.5 rounded border border-border-default text-[10px] hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </Show>

            <Show when={diagnostics()} fallback={<p class="text-xs text-text-muted">Loading...</p>}>
              {(diag) => (
                <div class="space-y-2 text-xs">
                  <div class="flex justify-between">
                    <span class="text-text-muted">Status</span>
                    <span class="font-mono font-bold">{diag().status}</span>
                  </div>
                  <Show when={diag().status !== "Idle"}>
                    <div class="w-full h-1.5 bg-bg-main rounded-full overflow-hidden mt-2">
                      <div class="h-full bg-accent-teal rounded-full transition-all" style={{ width: `${diag().progress}%` }} />
                    </div>
                  </Show>
                  <Show when={diag().error}>
                    <p class="text-red-400 text-[10px]">{diag().error}</p>
                  </Show>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
