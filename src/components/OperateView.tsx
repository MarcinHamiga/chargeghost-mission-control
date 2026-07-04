import { Show } from "solid-js";
import { Activity, Plug, PlugZap } from "lucide-solid";
import { state } from "../store/simulator";
import { getConnectorTelemetry, getRevision } from "../store/telemetry";
import { BRAND_ACCENT } from "../lib/brand";
import { cn } from "../lib/cn";
import { statusPresentation } from "../lib/connector-status";
import { ConnectorSelector } from "./ConnectorSelector";
import { ActionRail } from "./ActionRail";
import { TelemetryChart } from "./TelemetryChart";
import { OCPPStream } from "./OCPPStream";
import { Gauge } from "./ui/Gauge";
import { Panel, PanelHeader } from "./ui/Panel";

/** The default stage: monitor + drive the selected connector in one place. */
export function OperateView() {
  const connectorId = () => state.selectedConnectorId;
  const connector = () =>
    state.snapshot?.connectors.find((c) => c.id === connectorId());
  const energyMeter = () =>
    state.snapshot?.energy_meters[connectorId().toString()];
  const session = () =>
    state.snapshot?.active_sessions.find((s) => s.connector_id === connectorId());

  const powerKw = () => {
    getRevision();
    return getConnectorTelemetry(connectorId()).currentValueW / 1000;
  };
  const soc = () => session()?.state_of_charge;

  const fmt = (n: number | undefined, digits: number) =>
    n === undefined ? "—" : n.toFixed(digits);

  return (
    <div class="max-w-[1200px] mx-auto flex flex-col gap-4">
      <ConnectorSelector />

      {/* Selected connector status */}
      <Show when={connector()}>
        {(c) => {
          const p = () => statusPresentation(c().status);
          return (
            <div class="flex items-center gap-3 flex-wrap">
              <span
                class={cn(
                  "inline-flex items-center gap-2 h-8 pl-2.5 pr-3.5 rounded-full border font-semibold text-[13px]",
                  p().bg,
                  p().border,
                  p().text,
                )}
              >
                <span
                  class={cn(
                    "w-2 h-2 rounded-full",
                    p().dot,
                    p().live && "shadow-[0_0_7px_var(--color-accent-teal)] animate-pulse",
                  )}
                />
                {c().status}
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <Show
                  when={c().is_plugged_in}
                  fallback={
                    <>
                      <Plug size={13} class="text-text-muted" />
                      Cable disconnected
                    </>
                  }
                >
                  <PlugZap size={13} class="text-accent-teal" />
                  Cable connected
                </Show>
              </span>
              <Show when={c().id_tag}>
                <span class="text-xs text-text-muted font-mono">
                  Tag {c().id_tag}
                </span>
              </Show>
            </div>
          );
        }}
      </Show>

      {/* Instrument gauges */}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Gauge label="Voltage" value={fmt(connector()?.voltage, 1)} unit="V" />
        <Gauge label="Current" value={fmt(connector()?.current, 1)} unit="A" />
        <Gauge label="Power" hot value={fmt(powerKw(), 2)} unit="kW" />
        <Gauge
          label="Energy"
          value={fmt(energyMeter() ? energyMeter()!.reading_wh / 1000 : undefined, 2)}
          unit="kWh"
        />
        <Gauge
          label="State of charge"
          value={soc() === undefined ? "—" : Math.round(soc()!).toString()}
          unit="%"
          spark={
            <Show when={soc() !== undefined}>
              <svg viewBox="0 0 120 20" preserveAspectRatio="none" class="w-full h-full">
                <rect
                  x="0"
                  y="14"
                  width={Math.max(0, Math.min(100, soc()!)) * 1.2}
                  height="6"
                  fill="rgba(0,255,204,0.35)"
                />
              </svg>
            </Show>
          }
        />
      </div>

      {/* Chart + action rail */}
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_236px] gap-3.5">
        <Panel class="flex flex-col">
          <PanelHeader
            icon={<Activity size={15} class="text-accent-teal" />}
            title={<>Power delivery · Connector {connectorId()}</>}
            aside={
              <span class="inline-flex items-center gap-1.5 font-mono">
                <span class="w-2 h-2 rounded-full bg-accent-teal shadow-[0_0_7px_var(--color-accent-teal)]" />
                Active power (W) · 60s
              </span>
            }
          />
          <div class="flex-1 min-h-[240px] p-2">
            <TelemetryChart
              connectorId={connectorId()}
              label={`Connector ${connectorId()} Power`}
              color={BRAND_ACCENT}
            />
          </div>
        </Panel>

        <ActionRail />
      </div>

      {/* Live protocol traffic */}
      <OCPPStream />
    </div>
  );
}
