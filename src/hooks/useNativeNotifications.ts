import { createEffect, onMount } from "solid-js";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { state } from "../store/simulator";

/** True only inside the Tauri webview — the plugin is a no-op in a plain browser. */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Minimal, proxy-free snapshot of the fields we diff between updates. */
interface Signature {
  ocpp: boolean;
  connectors: { id: number; status: string }[];
}

function signatureOf(snapshot: NonNullable<typeof state.snapshot>): Signature {
  return {
    ocpp: !!snapshot.ocpp_connected,
    connectors: snapshot.connectors.map((c) => ({ id: c.id, status: c.status })),
  };
}

async function notify(title: string, body: string) {
  try {
    sendNotification({ title, body });
  } catch {
    /* plugin unavailable — ignore */
  }
}

/**
 * Surfaces OS notifications for events the operator would want to know about
 * while the window is in the background: OCPP link up/down, charging
 * start/stop, and faults. Suppressed while the window is focused (the UI
 * already shows those), and entirely inert outside the Tauri runtime.
 */
export function useNativeNotifications() {
  if (!isTauri()) return;

  let prev: Signature | null = null;
  let granted = false;

  onMount(async () => {
    try {
      granted = await isPermissionGranted();
      if (!granted) granted = (await requestPermission()) === "granted";
    } catch {
      granted = false;
    }
  });

  createEffect(() => {
    const snapshot = state.snapshot;
    if (!snapshot) return;

    const sig = signatureOf(snapshot);
    const previous = prev;
    prev = sig;

    // First snapshot establishes a baseline; never alert while focused or
    // before the user has granted permission.
    if (!previous || !granted) return;
    if (typeof document !== "undefined" && document.hasFocus()) return;

    if (sig.ocpp !== previous.ocpp) {
      notify(
        "OCPP link",
        sig.ocpp ? "Connected to the central system" : "Disconnected from the central system",
      );
    }

    for (const c of sig.connectors) {
      const before = previous.connectors.find((p) => p.id === c.id);
      if (!before || before.status === c.status) continue;

      if (c.status === "Charging") {
        notify(`Connector ${c.id}`, "Charging started");
      } else if (c.status === "Faulted") {
        notify(`Connector ${c.id}`, "Fault detected — needs attention");
      } else if (before.status === "Charging" && c.status !== "SuspendedEV") {
        notify(`Connector ${c.id}`, "Charging stopped");
      }
    }
  });
}
