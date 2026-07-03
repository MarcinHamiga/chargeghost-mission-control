import { createResource, createEffect, Show, Switch, Match } from "solid-js";
import { state } from "./store/simulator";
import { activeView, density } from "./store/ui";
import { api } from "./lib/api";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTelemetrySampler } from "./hooks/useTelemetrySampler";
import { useHotkeys } from "./hooks/useHotkeys";
import { useNativeNotifications } from "./hooks/useNativeNotifications";
import { TitleBar } from "./components/TitleBar";
import { NavRail } from "./components/NavRail";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutCheatSheet } from "./components/ShortcutCheatSheet";
import { OperateView } from "./components/OperateView";
import { SimulatorView } from "./components/SimulatorView";
import { OCPPLogsView } from "./components/OCPPLogsView";
import { FaultLab } from "./components/FaultLab";
import { SettingsPanel } from "./components/SettingsPanel";
import { ToastContainer } from "./components/ToastContainer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { SplashScreen } from "./components/SplashScreen";

export default function MissionControl() {
  useWebSocket();
  useTelemetrySampler();
  useHotkeys();
  useNativeNotifications();

  // Reflect the density preference on the document root so the CSS override
  // (html[data-density="compact"]) can retune spacing globally.
  createEffect(() => {
    document.documentElement.dataset.density = density();
  });

  const [configInfo] = createResource(() => api.getConfig().catch(() => null));
  const [aboutInfo] = createResource(() => api.getAbout().catch(() => null));

  const instanceId = () => configInfo()?.ocpp_id || "—";
  const ocppVersion = () => configInfo()?.ocpp_version;

  return (
    <Show when={state.snapshot} fallback={<SplashScreen />}>
      <div class="flex flex-col h-screen bg-bg-main overflow-hidden text-sm">
        <ToastContainer />
        <ConfirmDialog />
        <CommandPalette />
        <ShortcutCheatSheet />

        <TitleBar instanceId={instanceId()} ocppVersion={ocppVersion()} />

        <div class="flex flex-1 min-h-0">
          <NavRail version={aboutInfo()?.version} />

          <main class="flex-1 overflow-y-auto custom-scrollbar min-w-0 p-4 md:p-6 bg-linear-to-b from-bg-main to-bg-secondary">
            <Switch>
              <Match when={activeView() === "operate"}>
                <OperateView />
              </Match>
              <Match when={activeView() === "connectors"}>
                <SimulatorView />
              </Match>
              <Match when={activeView() === "ocpp"}>
                <OCPPLogsView />
              </Match>
              <Match when={activeView() === "faults"}>
                <FaultLab />
              </Match>
              <Match when={activeView() === "settings"}>
                <SettingsPanel />
              </Match>
            </Switch>
          </main>
        </div>
      </div>
    </Show>
  );
}
