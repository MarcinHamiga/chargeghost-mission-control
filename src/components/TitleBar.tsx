import { Show } from "solid-js";
import { Wifi, Zap } from "lucide-solid";
import { cn } from "../lib/cn";
import { state } from "../store/simulator";
import { togglePalette } from "../store/ui";
import { ChargeGhostLogo } from "./ChargeGhostLogo";
import { Kbd } from "./ui/Kbd";
import { APP_VERSION, APP_VERSION_LABEL } from "../lib/brand";

interface TitleBarProps {
  instanceId: string;
  ocppVersion?: string;
}

interface VitalProps {
  live?: boolean;
  warn?: boolean;
  label: string;
  value?: string;
  icon?: "wifi";
}

function Vital(props: VitalProps) {
  return (
    <span
      class={cn(
        "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border font-mono text-[11px]",
        props.live
          ? "text-accent-teal border-teal-deep bg-accent-teal/5"
          : props.warn
            ? "text-warn border-warn/25 bg-warn/5"
            : "text-text-secondary border-border-default bg-surface-1",
      )}
      title={props.value ? `${props.label} · ${props.value}` : props.label}
    >
      <Show
        when={props.icon === "wifi"}
        fallback={
          <span
            class={cn(
              "w-1.5 h-1.5 rounded-full",
              props.live
                ? "bg-accent-teal shadow-[0_0_8px_var(--color-accent-teal)]"
                : props.warn
                  ? "bg-warn animate-pulse"
                  : "bg-text-muted",
            )}
          />
        }
      >
        <Wifi size={11} />
      </Show>
      <Show when={props.value} fallback={props.label}>
        <span class="text-text-muted">{props.label}</span>
        <span>{props.value}</span>
      </Show>
    </span>
  );
}

/**
 * Frameless-window titlebar. Carries the app identity and always-visible
 * global health (CSMS link, bridge, OCPP version, uptime). Draggable.
 */
export function TitleBar(props: TitleBarProps) {
  const bridgeLive = () =>
    state.connectionStatus === "connected" && state.sidecarHealthy;
  const bridgeConnecting = () => state.connectionStatus === "connecting";
  const csmsLive = () => !!state.snapshot?.ocpp_connected;

  const uptime = () => {
    const s = state.snapshot?.uptime_seconds;
    if (s === undefined) return undefined;
    if (s < 60) return `${Math.floor(s)}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <header
      data-tauri-drag-region
      class="h-11 shrink-0 flex items-center gap-3 pl-[80px] pr-3 bg-linear-to-b from-[#0f171d] to-[#0b1116] border-b border-border-default"
    >
      <div
        data-tauri-drag-region
        class="flex items-center gap-2 text-[12.5px] font-semibold text-text-secondary pointer-events-none"
      >
        <ChargeGhostLogo size={16} />
        <span class="text-text-primary">ChargeGhost</span>
        <span
          class="font-mono text-[10px] font-semibold leading-none px-1.5 py-1 rounded-md bg-accent-teal/10 text-accent-teal border border-teal-deep tracking-tight"
          title={`ChargeGhost Mission Control ${APP_VERSION}`}
        >
          {APP_VERSION_LABEL}
        </span>
        <span class="text-text-muted">·</span>
        <span class="font-mono text-text-muted">{props.instanceId}</span>
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <Vital
          live={csmsLive()}
          label="CSMS"
          icon="wifi"
        />
        <Vital
          live={bridgeLive()}
          warn={bridgeConnecting()}
          label="Bridge"
        />
        <Show when={props.ocppVersion}>
          <Vital label="OCPP" value={props.ocppVersion} />
        </Show>
        <Show when={uptime()}>
          <Vital label="↑" value={uptime()} />
        </Show>
        <Show when={(state.snapshot?.pending_remote_starts?.length ?? 0) > 0}>
          <Vital
            warn
            label="pending"
            value={String(state.snapshot!.pending_remote_starts!.length)}
          />
        </Show>
        <button
          type="button"
          onClick={() => togglePalette(true)}
          title="Command palette"
          class="inline-flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded-full border border-border-bright bg-surface-2 text-text-secondary hover:text-accent-teal hover:border-teal-deep transition-colors"
        >
          <Zap size={11} />
          <Kbd>⌘K</Kbd>
        </button>
      </div>
    </header>
  );
}
