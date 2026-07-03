import { createSignal, createResource, createEffect, For, Show } from "solid-js";
import { api } from "../../lib/api";
import { state, setState } from "../../store/simulator";
import { addToast } from "../../store/toast";
import { requestConfirm } from "../../store/confirm";
import {
  Plus, Trash2, Battery, Zap, User, BarChart3, Layers, Pencil, Check, X, Power,
} from "lucide-solid";
import { cn } from "../../lib/cn";
import { ConnectorStrip } from "../ConnectorStrip";
import { Select } from "../Select";
import { Panel, PanelHeader } from "../ui/Panel";
import { Button } from "../ui/Button";
import { StatePill } from "../ui/StatePill";
import { Field, inputClass } from "../ui/Field";
import { PHASE_OPTIONS } from "../../lib/select-options";

export function ConnectorsPanel() {
  const refreshState = async () => setState("snapshot", await api.getStatus());

  const [lastStopped, { refetch: refetchLastStopped }] = createResource(() => api.getLastStoppedSession().catch(() => null));
  const [allSessions, { refetch: refetchSessions }] = createResource(() => api.getSessions().catch(() => []));
  const [showSessionHistory, setShowSessionHistory] = createSignal(false);

  const [addingConnector, setAddingConnector] = createSignal(false);
  const [newVoltage, setNewVoltage] = createSignal(230);
  const [newCurrent, setNewCurrent] = createSignal(32);
  const [newPhase, setNewPhase] = createSignal<1 | 3>(1);

  const [editingConnector, setEditingConnector] = createSignal(false);
  const [editVoltage, setEditVoltage] = createSignal(0);
  const [editCurrent, setEditCurrent] = createSignal(0);
  const [editPhase, setEditPhase] = createSignal<1 | 3>(1);

  const currentConnector = () => state.snapshot?.connectors.find((c) => c.id === state.selectedConnectorId);
  const connectorSession = () => state.snapshot?.active_sessions.find((s) => s.connector_id === state.selectedConnectorId);
  const energyMeter = () => state.snapshot?.energy_meters[state.selectedConnectorId.toString()];

  // Close editing form when connector selection changes.
  createEffect(() => {
    state.selectedConnectorId;
    setEditingConnector(false);
  });

  const validNew = () => newVoltage() >= 120 && newVoltage() <= 1000 && newCurrent() >= 1 && newCurrent() <= 500;
  const validEdit = () => editVoltage() >= 120 && editVoltage() <= 1000 && editCurrent() >= 1 && editCurrent() <= 500;

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
    if (!(await requestConfirm(`Delete connector ${id}?`))) return;
    try {
      await api.deleteConnector(id);
      await refreshState();
      addToast("success", `Connector ${id} deleted`);
    } catch (e: any) {
      addToast("error", `Failed to delete connector: ${e.message || e}`);
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
      await api.updateConnector(c.id, { voltage: editVoltage(), current: editCurrent(), phase: editPhase() });
      await refreshState();
      setEditingConnector(false);
      addToast("success", `Connector ${c.id} updated`);
    } catch (e: any) {
      addToast("error", `Failed to update connector: ${e.message || e}`);
    }
  };

  const handleSetAvailability = async (type: "Operative" | "Inoperative") => {
    try {
      const result = await api.setConnectorAvailability(state.selectedConnectorId, type);
      await refreshState();
      addToast("info", result.message || `Availability set to ${type}`);
    } catch (e: unknown) {
      addToast("error", e instanceof Error ? e.message : String(e));
    }
  };

  const stat = (label: string, value: any, unit?: string) => (
    <div class="space-y-1">
      <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">{label}</span>
      <p class="text-lg font-mono font-semibold text-text-primary tnum">
        {value}
        <Show when={unit}>
          <span class="text-xs text-text-muted ml-1">{unit}</span>
        </Show>
      </p>
    </div>
  );

  return (
    <div class="space-y-4">
      {/* Fleet header + add */}
      <div class="flex items-center justify-between">
        <h3 class="text-[13px] font-semibold text-text-secondary flex items-center gap-2">
          <Zap size={15} class="text-accent-teal" />
          {state.snapshot?.connectors.length ?? 0} connector{(state.snapshot?.connectors.length ?? 0) === 1 ? "" : "s"}
        </h3>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setAddingConnector(!addingConnector())}>
          Add connector
        </Button>
      </div>

      {/* Add form */}
      <Show when={addingConnector()}>
        <Panel class="p-4">
          <div class="flex flex-wrap items-end gap-4">
            <Field label="Voltage (V)" hint="120–1000">
              <input type="number" min={120} max={1000} value={newVoltage()} onInput={(e) => setNewVoltage(Number(e.currentTarget.value))} class={cn(inputClass, "w-24")} />
            </Field>
            <Field label="Current (A)" hint="1–500">
              <input type="number" min={1} max={500} value={newCurrent()} onInput={(e) => setNewCurrent(Number(e.currentTarget.value))} class={cn(inputClass, "w-24")} />
            </Field>
            <Field label="Phase">
              <Select value={newPhase()} options={PHASE_OPTIONS} onChange={setNewPhase} aria-label="Connector phase" class="w-28" />
            </Field>
            <Button variant="primary" size="sm" onClick={handleAddConnector} disabled={!validNew()}>Create</Button>
            <Button variant="ghost" size="sm" onClick={() => setAddingConnector(false)}>Cancel</Button>
          </div>
        </Panel>
      </Show>

      {/* Connector strip */}
      <ConnectorStrip />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connector detail */}
        <Show when={currentConnector()}>
          {(connector) => (
            <Panel class="lg:col-span-2">
              <PanelHeader
                icon={<Zap size={15} class="text-accent-teal" />}
                title={`Connector ${connector().id}`}
                aside={
                  <div class="flex items-center gap-2">
                    <StatePill status={connector().status} />
                    <button onClick={() => handleSetAvailability("Inoperative")} class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-warn/30 text-warn hover:bg-warn/10 transition-colors" title="Set inoperative">
                      <Power size={11} /> Inoperative
                    </button>
                    <button onClick={() => handleSetAvailability("Operative")} class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-available/30 text-available hover:bg-available/10 transition-colors" title="Set operative">
                      <Power size={11} /> Operative
                    </button>
                    <Show when={!editingConnector()}>
                      <button onClick={startEditingConnector} class="p-1.5 rounded-lg border border-accent-teal/25 text-accent-teal hover:bg-accent-teal/10 transition-colors" title="Edit connector">
                        <Pencil size={12} />
                      </button>
                    </Show>
                    <button onClick={() => handleDeleteConnector(connector().id)} class="p-1.5 rounded-lg border border-critical/25 text-critical hover:bg-critical/10 transition-colors" title="Delete connector">
                      <Trash2 size={12} />
                    </button>
                  </div>
                }
              />
              <div class="p-5">
                <Show
                  when={editingConnector()}
                  fallback={
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stat("Voltage", connector().voltage.toFixed(1), "V")}
                      {stat("Current", connector().current.toFixed(1), "A")}
                      {stat("Phase", `${connector().phase}φ`)}
                      {stat("Plugged in", connector().is_plugged_in ? "Yes" : "No")}
                    </div>
                  }
                >
                  <div class="flex flex-wrap items-end gap-4">
                    <Field label="Voltage (V)" hint="120–1000">
                      <input type="number" min={120} max={1000} value={editVoltage()} onInput={(e) => setEditVoltage(Number(e.currentTarget.value))}
                        class={cn(inputClass, "w-28", (editVoltage() < 120 || editVoltage() > 1000) && "border-critical/50 focus:border-critical")} />
                    </Field>
                    <Field label="Current (A)" hint="1–500">
                      <input type="number" min={1} max={500} value={editCurrent()} onInput={(e) => setEditCurrent(Number(e.currentTarget.value))}
                        class={cn(inputClass, "w-28", (editCurrent() < 1 || editCurrent() > 500) && "border-critical/50 focus:border-critical")} />
                    </Field>
                    <Field label="Phase">
                      <Select value={editPhase()} options={PHASE_OPTIONS} onChange={setEditPhase} aria-label="Connector phase" class="w-28" />
                    </Field>
                    <button onClick={handleUpdateConnector} disabled={!validEdit()} class="p-2.5 rounded-lg bg-accent-teal text-[#042a24] hover:brightness-105 transition disabled:opacity-45 disabled:cursor-not-allowed" title="Save">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingConnector(false)} class="p-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-white/5 transition" title="Cancel">
                      <X size={14} />
                    </button>
                  </div>
                </Show>

                <Show when={connector().id_tag}>
                  <div class="mt-4 pt-4 border-t border-border-default flex items-center gap-2 text-xs text-text-secondary">
                    <User size={12} />
                    RFID tag: <span class="font-mono text-accent-teal">{connector().id_tag}</span>
                  </div>
                </Show>
              </div>
            </Panel>
          )}
        </Show>

        {/* Active session */}
        <Show when={connectorSession()}>
          {(session) => (
            <Panel>
              <PanelHeader icon={<Battery size={15} class="text-accent-teal" />} title="Active session" />
              <div class="p-5 space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stat("Transaction", `#${session().transaction_id}`)}
                  {stat("Energy", (session().energy_charged_wh / 1000).toFixed(2), "kWh")}
                  {stat("SoC", `${session().state_of_charge.toFixed(1)}%`)}
                  {stat("Started", new Date(session().start_time).toLocaleTimeString([], { hour12: false }))}
                </div>
                <div class="w-full h-2 bg-bg-main rounded-full overflow-hidden">
                  <div class="h-full bg-accent-teal rounded-full transition-all duration-1000 shadow-[0_0_10px_var(--color-accent-teal)]" style={{ width: `${session().state_of_charge}%` }} />
                </div>
              </div>
            </Panel>
          )}
        </Show>

        {/* Energy meter */}
        <Show when={energyMeter()}>
          {(meter) => (
            <Panel>
              <PanelHeader icon={<BarChart3 size={15} class="text-accent-teal" />} title="Energy meter" />
              <div class="p-5 grid grid-cols-2 gap-4">
                {stat("Meter reading", (meter().reading_wh / 1000).toFixed(3), "kWh")}
                {stat("State", meter().is_charging ? "Charging" : "Idle")}
              </div>
            </Panel>
          )}
        </Show>
      </div>

      {/* Session history */}
      <Panel>
        <PanelHeader
          icon={<Layers size={15} class="text-text-muted" />}
          title="Session history"
          aside={
            <button onClick={() => { setShowSessionHistory(!showSessionHistory()); refetchSessions(); refetchLastStopped(); }} class="text-xs text-accent-teal hover:text-accent-teal-hover">
              {showSessionHistory() ? "Hide" : "Show all"}
            </button>
          }
        />
        <div class="p-5 space-y-3">
          <Show when={lastStopped()}>
            {(session) => {
              const s = session();
              if (!s) return null;
              return (
                <div class="p-3 rounded-lg border border-border-default bg-bg-main/50">
                  <div class="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-2">Last completed session</div>
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div><span class="text-text-muted">Tx #</span> <span class="font-mono font-semibold text-text-primary">{s.transaction_id}</span></div>
                    <div><span class="text-text-muted">Connector</span> <span class="font-mono font-semibold text-text-primary">{s.connector_id}</span></div>
                    <div><span class="text-text-muted">Energy</span> <span class="font-mono font-semibold text-text-primary">{(s.energy_charged_wh / 1000).toFixed(2)} kWh</span></div>
                    <div><span class="text-text-muted">Meter stop</span> <span class="font-mono font-semibold text-text-primary">{s.meter_stop !== null ? `${(s.meter_stop / 1000).toFixed(2)} kWh` : "N/A"}</span></div>
                    <div><span class="text-text-muted">Reason</span> <span class="font-mono font-semibold text-text-primary">{s.reason ?? "Unknown"}</span></div>
                  </div>
                </div>
              );
            }}
          </Show>

          <Show when={!lastStopped() && !showSessionHistory()}>
            <p class="text-xs text-text-muted italic">No completed sessions yet</p>
          </Show>

          <Show when={showSessionHistory()}>
            <Show when={allSessions() && allSessions()!.length > 0} fallback={<p class="text-xs text-text-muted italic">No sessions found</p>}>
              <div class="space-y-2">
                <For each={allSessions()}>
                  {(session) => (
                    <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-main/50 text-xs">
                      <div class="flex items-center gap-4">
                        <span class="font-mono text-text-muted">#{session.transaction_id}</span>
                        <span class="text-text-secondary">Conn {session.connector_id}</span>
                        <span class="font-mono text-text-primary">{(session.energy_charged_wh / 1000).toFixed(2)} kWh</span>
                        <span class="text-text-muted">{session.state_of_charge.toFixed(1)}%</span>
                      </div>
                      <span class={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", session.is_charging ? "bg-accent-teal/10 text-accent-teal" : "bg-surface-3 text-text-muted")}>
                        {session.is_charging ? "Active" : "Stopped"}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </Panel>
    </div>
  );
}
