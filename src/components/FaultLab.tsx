import { createSignal, For, Show } from "solid-js";
import {
  ShieldAlert,
  ZapOff,
  Thermometer,
  Activity,
  RotateCcw,
  Radio,
  KeyRound,
  Download,
  Upload,
} from "lucide-solid";
import { state, setState } from "../store/simulator";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { requestConfirm } from "../store/confirm";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { StatePill } from "./ui/StatePill";
import type { Connector } from "../lib/types";

/**
 * Fault Lab — simulate fault conditions to exercise the charge point's OCPP
 * error handling and recovery paths.
 */
export function FaultLab() {
  const [authTag, setAuthTag] = createSignal("TestTag001");

  const connectors = () =>
    [...(state.snapshot?.connectors || [])].sort((a, b) => a.id - b.id);
  const targetId = () => state.selectedConnectorId;

  const act = async (label: string, fn: () => Promise<unknown>, refresh = true) => {
    try {
      await fn();
      if (refresh) setState("snapshot", await api.getStatus());
      addToast("success", label);
    } catch (e: unknown) {
      addToast("error", e instanceof Error ? e.message : `${label} failed`);
    }
  };

  const zeroOutput = (id: number) =>
    act(`Connector ${id}: zero output`, () =>
      api.updateConnector(id, { voltage: 0, current: 0 }),
    );
  const overvoltage = (id: number) =>
    act(`Connector ${id}: overvoltage`, () =>
      api.updateConnector(id, { voltage: 265 }),
    );
  const overTemp = (id: number) =>
    act(`Connector ${id}: thermal throttle`, () =>
      api.updateConnector(id, { current: 0 }),
    );
  const recover = (id: number) =>
    act(`Connector ${id}: restored to nominal`, () =>
      api.updateConnector(id, { voltage: 230, current: 32 }),
    );

  const SCENARIOS = [
    {
      key: "comm",
      label: "EV communication error",
      desc: "Drops voltage & current to zero on the selected connector.",
      icon: ZapOff,
      tone: "critical" as const,
      run: () => zeroOutput(targetId()),
    },
    {
      key: "temp",
      label: "High-temperature cutoff",
      desc: "Simulates a thermal derate — current falls to zero.",
      icon: Thermometer,
      tone: "warn" as const,
      run: () => overTemp(targetId()),
    },
    {
      key: "grid",
      label: "Grid overvoltage",
      desc: "Pushes the connector to 265 V to trip protection.",
      icon: Activity,
      tone: "warn" as const,
      run: () => overvoltage(targetId()),
    },
  ];

  return (
    <div class="max-w-[1200px] mx-auto flex flex-col gap-5">
      <div>
        <h1 class="text-xl font-bold flex items-center gap-2.5 tracking-[-0.02em]">
          <ShieldAlert size={22} class="text-critical" />
          Fault Lab
        </h1>
        <p class="text-sm text-text-secondary mt-1.5 max-w-2xl">
          Inject fault conditions to test OCPP error handling and recovery. Scenario
          presets target <span class="font-mono text-text-primary">Connector {targetId()}</span>{" "}
          — switch the target from the Operate stage.
        </p>
      </div>

      {/* Scenario presets */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <For each={SCENARIOS}>
          {(s) => (
            <button
              type="button"
              onClick={s.run}
              class="panel text-left p-4 hover:border-border-bright transition-colors group"
            >
              <div
                class="w-9 h-9 rounded-[9px] grid place-items-center mb-3 border"
                classList={{
                  "text-critical border-critical/25 bg-critical/8": s.tone === "critical",
                  "text-warn border-warn/25 bg-warn/8": s.tone === "warn",
                }}
              >
                <s.icon size={18} />
              </div>
              <div class="font-semibold text-sm">{s.label}</div>
              <p class="text-xs text-text-secondary mt-1">{s.desc}</p>
            </button>
          )}
        </For>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Per-connector faults */}
        <Panel>
          <PanelHeader title="Per-connector faults" />
          <div class="p-3 space-y-2">
            <For each={connectors()}>
              {(c: Connector) => (
                <div class="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border-default bg-bg-main/40">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-xs font-medium">C{c.id}</span>
                    <StatePill status={c.status} />
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => zeroOutput(c.id)}
                      class="px-2 py-1 rounded text-[11px] border border-critical/25 text-critical hover:bg-critical/10 transition-colors"
                    >
                      Zero
                    </button>
                    <button
                      type="button"
                      onClick={() => overvoltage(c.id)}
                      class="px-2 py-1 rounded text-[11px] border border-warn/25 text-warn hover:bg-warn/10 transition-colors"
                    >
                      +V
                    </button>
                    <button
                      type="button"
                      onClick={() => recover(c.id)}
                      title="Restore to nominal"
                      class="px-2 py-1 rounded text-[11px] border border-available/25 text-available hover:bg-available/10 transition-colors inline-flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Recover
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Panel>

        {/* Session control */}
        <Panel>
          <PanelHeader title="Session control" />
          <div class="p-3 space-y-2">
            <Button
              variant="danger"
              class="w-full"
              onClick={async () => {
                if (await requestConfirm("Stop all active charging sessions?")) {
                  act("All sessions stopped", () => api.stopAllSessions());
                }
              }}
            >
              Emergency stop all sessions
            </Button>
            <For each={connectors().filter((c) => c.status === "Charging")}>
              {(c) => (
                <Button
                  variant="ghost"
                  class="w-full"
                  onClick={() =>
                    act(`Connector ${c.id} suspended`, () => api.suspendEV(c.id))
                  }
                >
                  Suspend EV · Connector {c.id}
                </Button>
              )}
            </For>
            <Show when={connectors().filter((c) => c.status === "Charging").length === 0}>
              <p class="text-xs text-text-muted px-1 py-2">No connectors are charging.</p>
            </Show>
          </div>
        </Panel>

        {/* OCPP actions */}
        <Panel>
          <PanelHeader title="OCPP actions" />
          <div class="p-3 space-y-2">
            <Button
              variant="ghost"
              class="w-full"
              icon={<Radio size={15} class="text-info" />}
              onClick={() => act("Heartbeat sent", () => api.ocppHeartbeat(), false)}
            >
              Send manual heartbeat
            </Button>
            <div class="flex gap-2">
              <input
                type="text"
                value={authTag()}
                onInput={(e) => setAuthTag(e.currentTarget.value)}
                placeholder="ID Tag"
                class="flex-1 min-w-0 bg-bg-main border border-border-default rounded px-2 py-2 text-xs font-mono focus:border-info/50 focus:outline-none"
              />
              <button
                type="button"
                disabled={!authTag()}
                onClick={() =>
                  act(`Authorize sent · ${authTag()}`, () => api.ocppAuthorize(authTag()), false)
                }
                class="px-3 rounded border border-info/25 text-info text-xs hover:bg-info/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <KeyRound size={13} /> Authorize
              </button>
            </div>
            <Button
              variant="ghost"
              class="w-full"
              icon={<Download size={15} class="text-warn" />}
              onClick={() =>
                act(
                  "Firmware update triggered",
                  () =>
                    api.triggerFirmwareUpdate({
                      location: "https://example.com/fw.bin",
                      retrieve_date: new Date().toISOString(),
                    }),
                  false,
                )
              }
            >
              Trigger firmware update
            </Button>
            <Button
              variant="ghost"
              class="w-full"
              icon={<Upload size={15} class="text-text-secondary" />}
              onClick={() =>
                act(
                  "Diagnostics upload triggered",
                  () =>
                    api.triggerDiagnosticsUpload({
                      location: "https://example.com/diag",
                      retries: 3,
                      retry_interval: 10,
                    }),
                  false,
                )
              }
            >
              Trigger diagnostics upload
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
