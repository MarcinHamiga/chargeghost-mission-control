import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import {
  Users,
  Plus,
  Play,
  Square,
  RotateCcw,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Trash2,
  Radio,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-solid";
import { fleetState, setFleetState, setActiveStationId } from "../store/fleet";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { requestConfirm } from "../store/confirm";
import { formatActionError } from "../lib/action-errors";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Field, inputClass } from "./ui/Field";
import { Select } from "./Select";
import { cn } from "../lib/cn";
import type { LifecycleState, Operation, OcppVersion, OperationResponse } from "../lib/types";

const OCPP_VERSION_OPTIONS = [
  { value: "1.6" as OcppVersion, label: "OCPP 1.6" },
  { value: "2.0.1" as OcppVersion, label: "OCPP 2.0.1" },
];

const LIFECYCLE_PRESENTATION: Record<LifecycleState, { text: string; bg: string; border: string; dot: string }> = {
  running: {
    text: "text-accent-teal",
    bg: "bg-accent-teal/8",
    border: "border-accent-teal/25",
    dot: "bg-accent-teal",
  },
  configured: {
    text: "text-text-secondary",
    bg: "bg-white/5",
    border: "border-border-bright",
    dot: "bg-text-muted",
  },
  starting: {
    text: "text-warn",
    bg: "bg-warn/10",
    border: "border-warn/25",
    dot: "bg-warn",
  },
  stopping: {
    text: "text-warn",
    bg: "bg-warn/10",
    border: "border-warn/25",
    dot: "bg-warn",
  },
  stopped: {
    text: "text-text-muted",
    bg: "bg-white/5",
    border: "border-border-bright",
    dot: "bg-text-muted",
  },
  failed: {
    text: "text-critical",
    bg: "bg-critical/10",
    border: "border-critical/30",
    dot: "bg-critical",
  },
  disabled: {
    text: "text-text-muted",
    bg: "bg-white/5",
    border: "border-border-bright",
    dot: "bg-text-muted",
  },
  not_running: {
    text: "text-text-muted",
    bg: "bg-white/5",
    border: "border-border-bright",
    dot: "bg-text-muted",
  },
};

function LifecycleBadge(props: { state: LifecycleState }) {
  const p = () => LIFECYCLE_PRESENTATION[props.state] ?? LIFECYCLE_PRESENTATION.stopped;
  return (
    <span
      class={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        p().bg,
        p().border,
        p().text,
      )}
    >
      <span
        class={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          p().dot,
          props.state === "running" && "shadow-[0_0_7px_var(--color-accent-teal)]",
          (props.state === "starting" || props.state === "stopping") && "animate-pulse",
        )}
      />
      {props.state}
    </span>
  );
}

interface NewStationForm {
  id: string;
  ocpp_id: string;
  connection_url: string;
  ocpp_version: OcppVersion;
  enabled: boolean;
  start: boolean;
  save: boolean;
  ocpp_password: string;
}

const emptyForm: NewStationForm = {
  id: "",
  ocpp_id: "",
  connection_url: "",
  ocpp_version: "1.6",
  enabled: true,
  start: true,
  save: true,
  ocpp_password: "",
};

/** Fleet dashboard — list, control, and provision stations across the sidecar. */
export function FleetView() {
  const [busyId, setBusyId] = createSignal<string | null>(null);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [form, setForm] = createSignal<NewStationForm>({ ...emptyForm });
  const [creating, setCreating] = createSignal(false);
  const [opsOpen, setOpsOpen] = createSignal(false);
  const [operations, setOperations] = createSignal<Operation[]>([]);

  const refreshStations = async () => {
    try {
      const { stations } = await api.fleet.getFleetStatus();
      setFleetState("stations", stations);
      setFleetState("error", null);
    } catch (e) {
      setFleetState("error", e instanceof Error ? e.message : "Failed to load fleet status");
    }
  };

  const refreshOperations = async () => {
    try {
      setOperations(await api.fleet.listOperations());
    } catch {
      /* non-fatal — operations panel is best-effort */
    }
  };

  const refreshAll = () => Promise.all([refreshStations(), refreshOperations()]);

  onMount(() => {
    setFleetState("loading", true);
    refreshAll().finally(() => setFleetState("loading", false));

    const interval = setInterval(refreshAll, 2000);
    onCleanup(() => clearInterval(interval));
  });

  const applySnapshot = (resp: OperationResponse) => {
    setFleetState("stations", (stations) =>
      stations.map((s) => (s.station_id === resp.snapshot.station_id ? resp.snapshot : s)),
    );
  };

  const runAction = async (
    id: string,
    label: string,
    fn: () => Promise<OperationResponse>,
  ) => {
    setBusyId(id);
    try {
      const resp = await fn();
      applySnapshot(resp);
      addToast("success", resp.message || `${label} succeeded`);
    } catch (e) {
      addToast("error", formatActionError(label, e));
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = (id: string) => runAction(id, "start", () => api.fleet.startStation(id));
  const handleStop = async (id: string) => {
    if (!(await requestConfirm(`Stop station "${id}"? Active sessions will be interrupted.`))) return;
    runAction(id, "stop", () => api.fleet.stopStation(id));
  };
  const handleRestart = async (id: string) => {
    if (!(await requestConfirm(`Restart station "${id}"? This will briefly disconnect it.`))) return;
    runAction(id, "restart", () => api.fleet.restartStation(id));
  };
  const handleEnable = (id: string) => runAction(id, "enable", () => api.fleet.enableStation(id));
  const handleDisable = async (id: string) => {
    if (!(await requestConfirm(`Disable station "${id}"?`))) return;
    runAction(id, "disable", () => api.fleet.disableStation(id));
  };
  const handleReload = (id: string) => runAction(id, "reload", () => api.fleet.reloadStation(id));
  const handlePersist = (id: string) => runAction(id, "persist", () => api.fleet.persistStation(id));

  const handleDelete = async (id: string) => {
    if (!(await requestConfirm(`Delete station "${id}"? This cannot be undone.`))) return;
    setBusyId(id);
    try {
      const resp = await api.fleet.deleteStation(id);
      addToast("success", resp.message || "Station deleted");
      await refreshStations();
    } catch (e) {
      addToast("error", formatActionError("delete", e));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetActive = (id: string) => {
    setActiveStationId(id);
    addToast("info", `Active station set to "${id}"`);
  };

  const updateForm = <K extends keyof NewStationForm>(key: K, value: NewStationForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const f = form();
    if (!f.id.trim() || !f.ocpp_id.trim() || !f.connection_url.trim()) {
      addToast("error", "Station id, OCPP id, and connection URL are required");
      return;
    }
    setCreating(true);
    try {
      const resp = await api.fleet.createStation({
        id: f.id.trim(),
        ocpp_id: f.ocpp_id.trim(),
        connection_url: f.connection_url.trim(),
        ocpp_version: f.ocpp_version,
        enabled: f.enabled,
        connectors: [{ voltage: 230, current: 32, phase: 1 }],
        start: f.start,
        save: f.save,
        ...(f.ocpp_password.trim() ? { ocpp_password: f.ocpp_password.trim() } : {}),
      });
      addToast("success", resp.message || "Station created");
      setForm({ ...emptyForm });
      setShowAddForm(false);
      await refreshStations();
    } catch (e2) {
      addToast("error", formatActionError("create station", e2));
    } finally {
      setCreating(false);
    }
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  return (
    <div class="max-w-[1200px] mx-auto flex flex-col gap-4">
      <Panel class="flex flex-col">
        <PanelHeader
          icon={<Users size={15} class="text-accent-teal" />}
          title={<>Fleet · {fleetState.stations.length} station{fleetState.stations.length === 1 ? "" : "s"}</>}
          aside={
            <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setShowAddForm((v) => !v)}>
              Add station
            </Button>
          }
        />

        <Show when={showAddForm()}>
          <form onSubmit={handleCreate} class="p-4 border-b border-border-default grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Station ID">
              <input
                class={inputClass}
                placeholder="station-2"
                value={form().id}
                onInput={(e) => updateForm("id", e.currentTarget.value)}
              />
            </Field>
            <Field label="OCPP ID">
              <input
                class={inputClass}
                placeholder="CP-002"
                value={form().ocpp_id}
                onInput={(e) => updateForm("ocpp_id", e.currentTarget.value)}
              />
            </Field>
            <Field label="Connection URL" class="md:col-span-1">
              <input
                class={inputClass}
                placeholder="ws://localhost:9000/ocpp"
                value={form().connection_url}
                onInput={(e) => updateForm("connection_url", e.currentTarget.value)}
              />
            </Field>
            <Field label="OCPP version">
              <Select
                value={form().ocpp_version}
                options={OCPP_VERSION_OPTIONS}
                onChange={(v) => updateForm("ocpp_version", v)}
                aria-label="OCPP version"
              />
            </Field>
            <Field label="OCPP password" hint="optional">
              <input
                type="password"
                class={inputClass}
                placeholder="(keyring/env)"
                value={form().ocpp_password}
                onInput={(e) => updateForm("ocpp_password", e.currentTarget.value)}
              />
            </Field>
            <div class="flex items-end gap-4 md:col-span-1">
              <label class="flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={form().enabled}
                  onChange={(e) => updateForm("enabled", e.currentTarget.checked)}
                />
                Enabled
              </label>
              <label class="flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={form().start}
                  onChange={(e) => updateForm("start", e.currentTarget.checked)}
                />
                Start
              </label>
              <label class="flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={form().save}
                  onChange={(e) => updateForm("save", e.currentTarget.checked)}
                />
                Save
              </label>
            </div>
            <div class="md:col-span-3 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={creating()}>
                {creating() ? "Creating…" : "Create station"}
              </Button>
            </div>
          </form>
        </Show>

        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border-default text-text-muted uppercase tracking-wide text-[10px]">
                <th class="text-left font-semibold px-4 py-2">Station</th>
                <th class="text-left font-semibold px-3 py-2">Lifecycle</th>
                <th class="text-left font-semibold px-3 py-2">Link</th>
                <th class="text-right font-semibold px-3 py-2">Connectors</th>
                <th class="text-right font-semibold px-3 py-2">Sessions</th>
                <th class="text-right font-semibold px-3 py-2">Queue</th>
                <th class="text-left font-semibold px-3 py-2">Flags</th>
                <th class="text-right font-semibold px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={fleetState.stations}>
                {(station) => {
                  const isActive = () => fleetState.activeStationId === station.station_id;
                  const isBusy = () => busyId() === station.station_id;
                  return (
                    <tr
                      class={cn(
                        "border-b border-border-default/60 last:border-0 hover:bg-white/[0.02] transition-colors",
                        isActive() && "bg-accent-teal/5",
                      )}
                    >
                      <td class="px-4 py-2.5">
                        <div class="flex items-center gap-2">
                          <Show when={isActive()}>
                            <span
                              class="w-1.5 h-1.5 rounded-full bg-accent-teal shadow-[0_0_7px_var(--color-accent-teal)] shrink-0"
                              title="Active station"
                            />
                          </Show>
                          <div class="flex flex-col">
                            <span class="font-semibold text-text-primary">{station.ocpp_id}</span>
                            <span class="font-mono text-[10px] text-text-muted">{station.station_id}</span>
                          </div>
                        </div>
                        <Show when={station.last_error}>
                          <div class="mt-1 flex items-center gap-1 text-critical text-[10.5px]">
                            <AlertTriangle size={10} class="shrink-0" />
                            <span class="truncate max-w-[220px]" title={station.last_error ?? undefined}>
                              {station.last_error}
                            </span>
                          </div>
                        </Show>
                      </td>
                      <td class="px-3 py-2.5">
                        <LifecycleBadge state={station.lifecycle_state} />
                      </td>
                      <td class="px-3 py-2.5">
                        <span
                          class={cn(
                            "inline-flex items-center gap-1",
                            station.connected ? "text-accent-teal" : "text-text-muted",
                          )}
                          title={station.connected ? "Connected" : "Disconnected"}
                        >
                          <Show when={station.connected} fallback={<WifiOff size={13} />}>
                            <Wifi size={13} />
                          </Show>
                        </span>
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono">{station.connector_count}</td>
                      <td class="px-3 py-2.5 text-right font-mono">{station.active_session_count}</td>
                      <td class="px-3 py-2.5 text-right font-mono">{station.queue_depth}</td>
                      <td class="px-3 py-2.5">
                        <div class="flex items-center gap-1.5">
                          <Show when={!station.enabled}>
                            <span class="text-[10px] px-1.5 py-0.5 rounded border border-border-bright text-text-muted">
                              disabled
                            </span>
                          </Show>
                          <Show when={station.restart_required}>
                            <span class="text-[10px] px-1.5 py-0.5 rounded border border-warn/25 bg-warn/10 text-warn">
                              restart required
                            </span>
                          </Show>
                        </div>
                      </td>
                      <td class="px-4 py-2.5">
                        <div class="flex items-center justify-end gap-1">
                          <Show when={!isActive()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              class="!px-2 !py-1"
                              disabled={isBusy()}
                              title="Set active station"
                              onClick={() => handleSetActive(station.station_id)}
                            >
                              <Radio size={13} />
                            </Button>
                          </Show>
                          <Button
                            size="sm"
                            variant="ghost"
                            class="!px-2 !py-1"
                            disabled={isBusy()}
                            title="Start"
                            onClick={() => handleStart(station.station_id)}
                          >
                            <Play size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            class="!px-2 !py-1"
                            disabled={isBusy()}
                            title="Stop"
                            onClick={() => handleStop(station.station_id)}
                          >
                            <Square size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            class="!px-2 !py-1"
                            disabled={isBusy()}
                            title="Restart"
                            onClick={() => handleRestart(station.station_id)}
                          >
                            <RotateCcw size={13} />
                          </Button>
                          <Show
                            when={station.enabled}
                            fallback={
                              <Button
                                size="sm"
                                variant="ghost"
                                class="!px-2 !py-1"
                                disabled={isBusy()}
                                title="Enable"
                                onClick={() => handleEnable(station.station_id)}
                              >
                                <Power size={13} />
                              </Button>
                            }
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              class="!px-2 !py-1"
                              disabled={isBusy()}
                              title="Disable"
                              onClick={() => handleDisable(station.station_id)}
                            >
                              <PowerOff size={13} />
                            </Button>
                          </Show>
                          <Button
                            size="sm"
                            variant="ghost"
                            class="!px-2 !py-1"
                            disabled={isBusy()}
                            title="Reload config"
                            onClick={() => handleReload(station.station_id)}
                          >
                            <RefreshCw size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            class="!px-2 !py-1"
                            disabled={isBusy()}
                            title="Persist"
                            onClick={() => handlePersist(station.station_id)}
                          >
                            <Save size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            class="!px-2 !py-1"
                            disabled={isBusy()}
                            title="Delete station"
                            onClick={() => handleDelete(station.station_id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
              <Show when={fleetState.stations.length === 0 && !fleetState.loading}>
                <tr>
                  <td colSpan={8} class="px-4 py-8 text-center text-text-muted">
                    No stations found.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel class="flex flex-col">
        <button
          type="button"
          onClick={() => setOpsOpen((v) => !v)}
          class="w-full flex items-center justify-between px-4 py-3 border-b border-border-default text-left"
        >
          <h4 class="flex items-center gap-2 text-[13.5px] font-semibold tracking-[-0.01em] m-0">
            <Show when={opsOpen()} fallback={<ChevronRight size={14} class="text-text-muted" />}>
              <ChevronDown size={14} class="text-text-muted" />
            </Show>
            Operations
            <span class="text-text-muted font-normal">({operations().length})</span>
          </h4>
        </button>
        <Show when={opsOpen()}>
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-border-default text-text-muted uppercase tracking-wide text-[10px]">
                  <th class="text-left font-semibold px-4 py-2">Type</th>
                  <th class="text-left font-semibold px-3 py-2">Station</th>
                  <th class="text-left font-semibold px-3 py-2">State</th>
                  <th class="text-left font-semibold px-3 py-2">Started</th>
                  <th class="text-left font-semibold px-3 py-2">Ended</th>
                  <th class="text-left font-semibold px-4 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                <For each={operations()}>
                  {(op) => (
                    <tr class="border-b border-border-default/60 last:border-0">
                      <td class="px-4 py-2 font-medium">{op.type}</td>
                      <td class="px-3 py-2 font-mono text-text-muted">{op.station_id ?? "—"}</td>
                      <td class="px-3 py-2">{op.state}</td>
                      <td class="px-3 py-2 text-text-muted">{fmtTime(op.started_at)}</td>
                      <td class="px-3 py-2 text-text-muted">{fmtTime(op.ended_at)}</td>
                      <td class="px-4 py-2 text-critical truncate max-w-[240px]" title={op.error}>
                        {op.error ?? "—"}
                      </td>
                    </tr>
                  )}
                </For>
                <Show when={operations().length === 0}>
                  <tr>
                    <td colSpan={6} class="px-4 py-6 text-center text-text-muted">
                      No recent operations.
                    </td>
                  </tr>
                </Show>
              </tbody>
            </table>
          </div>
        </Show>
      </Panel>
    </div>
  );
}
