import { createResource, createSignal, Show } from "solid-js";
import { api } from "../lib/api";
import { fleetState } from "../store/fleet";
import { addToast } from "../store/toast";
import { requestConfirm } from "../store/confirm";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Server, RefreshCw } from "lucide-solid";

const display = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  const trimmed = value.trim();
  return trimmed.length === 0 ? "—" : trimmed;
};

function InfoRow(props: { label: string; value: string | null | undefined }) {
  return (
    <div class="flex items-center justify-between gap-4 py-1.5">
      <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">{props.label}</span>
      <span class="text-xs font-mono text-text-primary text-right truncate">{display(props.value)}</span>
    </div>
  );
}

export function DeviceInfoPanel() {
  const activeId = () => fleetState.activeStationId ?? api.getActiveStation();
  const [config, { refetch }] = createResource(activeId, () => api.getConfig());
  const [reconnecting, setReconnecting] = createSignal(false);

  const handleReconnect = async () => {
    const id = activeId();
    if (!id) return;
    const confirmed = await requestConfirm(
      "This fully restarts the station's OCPP connection and drops the active socket. Continue?",
    );
    if (!confirmed) return;

    setReconnecting(true);
    try {
      const result = await api.fleet.reconnectStation(id);
      addToast(result.success ? "success" : "error", result.message || "OCPP reconnect requested");
      refetch();
    } catch (e: any) {
      addToast("error", `Failed to reconnect OCPP: ${e.message || e}`);
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Device Info"
        icon={<Server size={14} />}
        aside={
          <Button
            variant="subtle"
            size="sm"
            icon={<RefreshCw size={13} class={reconnecting() ? "animate-spin" : undefined} />}
            disabled={!activeId() || reconnecting()}
            onClick={handleReconnect}
          >
            Reconnect OCPP
          </Button>
        }
      />
      <div class="px-4 py-3">
        <Show
          when={activeId()}
          fallback={<div class="text-xs text-text-secondary py-2">No active station selected.</div>}
        >
          <Show
            when={config()}
            fallback={<div class="text-xs text-text-secondary py-2">Loading device info…</div>}
          >
            {(cfg) => (
              <div class="flex flex-col divide-y divide-border-default">
                <InfoRow label="Model" value={cfg().charge_point_model} />
                <InfoRow label="Vendor" value={cfg().charge_point_vendor} />
                <InfoRow label="Serial" value={cfg().charge_point_serial} />
                <InfoRow label="Firmware" value={cfg().firmware_version} />
                <InfoRow label="Modem ICCID" value={cfg().modem_iccid} />
                <InfoRow label="Modem IMSI" value={cfg().modem_imsi} />
                <InfoRow label="OCPP ID" value={cfg().ocpp_id} />
                <InfoRow label="OCPP Version" value={cfg().ocpp_version} />
                <InfoRow label="Connection URL" value={cfg().connection_url} />
              </div>
            )}
          </Show>
        </Show>
      </div>
    </Panel>
  );
}
