import { createSignal, For, Show, type JSX } from "solid-js";
import { Cpu, Zap, Calendar, Layers, HardDriveUpload } from "lucide-solid";
import { cn } from "../lib/cn";
import { ConnectorsPanel } from "./connectors/ConnectorsPanel";
import { ReservationsPanel } from "./connectors/ReservationsPanel";
import { ProfilesPanel } from "./connectors/ProfilesPanel";
import { FirmwarePanel } from "./connectors/FirmwarePanel";

type SubTab = "connectors" | "reservations" | "profiles" | "firmware";

const SUB_TABS: { id: SubTab; label: string; icon: (p: { size: number }) => JSX.Element }[] = [
  { id: "connectors", label: "Connectors", icon: Zap },
  { id: "reservations", label: "Reservations", icon: Calendar },
  { id: "profiles", label: "Profiles", icon: Layers },
  { id: "firmware", label: "Firmware & Diagnostics", icon: HardDriveUpload },
];

export function SimulatorView() {
  const [tab, setTab] = createSignal<SubTab>("connectors");

  return (
    <div class="flex flex-col h-full min-h-0 gap-4">
      {/* Header + sub-tabs */}
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <h2 class="text-[15px] font-semibold flex items-center gap-2 tracking-[-0.01em]">
          <Cpu size={18} class="text-accent-teal" />
          EVSE Simulator
        </h2>

        <div class="flex items-center gap-1 p-1 rounded-xl bg-surface-1 border border-border-default">
          <For each={SUB_TABS}>
            {(t) => (
              <button
                onClick={() => setTab(t.id)}
                class={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  tab() === t.id
                    ? "bg-accent-teal/12 text-accent-teal"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5",
                )}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Active panel */}
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
        <Show when={tab() === "connectors"}>
          <ConnectorsPanel />
        </Show>
        <Show when={tab() === "reservations"}>
          <ReservationsPanel />
        </Show>
        <Show when={tab() === "profiles"}>
          <ProfilesPanel />
        </Show>
        <Show when={tab() === "firmware"}>
          <FirmwarePanel />
        </Show>
      </div>
    </div>
  );
}
