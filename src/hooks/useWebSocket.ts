import { onCleanup, onMount, createEffect } from "solid-js";
import { state, setState } from "../store/simulator";
import { StatusSnapshot } from "../lib/types";
import { api, getActiveStation } from "../lib/api";
import { normalizeStatusSnapshot } from "../lib/api-normalizers";
import { handleWebSocketEvent } from "../lib/ws-events";
import { logger } from "../lib/logger";
import { fleetState, setFleetState } from "../store/fleet";

export function useWebSocket() {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const applySnapshot = (snapshot: StatusSnapshot) => {
    setState("snapshot", snapshot);
    if (snapshot.connectors.length > 0) {
      const ids = snapshot.connectors.map((c) => c.id);
      if (!ids.includes(state.selectedConnectorId)) {
        setState("selectedConnectorId", snapshot.connectors.sort((a, b) => a.id - b.id)[0].id);
      }
    }
  };

  const refetchStatus = async () => {
    try {
      applySnapshot(await api.getStatus());
    } catch {
      // ignore
    }
  };

  const connect = () => {
    setState("connectionStatus", "connecting");

    // Detach handlers before closing so a deliberate reconnect (e.g. the
    // active station changed) doesn't fire the old socket's onclose and
    // schedule a spurious reconnect.
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }

    const stationId = getActiveStation();
    const url = stationId
      ? `ws://localhost:8080/ws?station_id=${encodeURIComponent(stationId)}`
      : "ws://localhost:8080/ws";
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setState("connectionStatus", "connected");
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await logger.wsMessage("RECEIVED", message);
        const type = message.type as string;
        if (type === "state_snapshot" || type === "tick") {
          if (!getActiveStation()) {
            const stationId = typeof message.station_id === "string" ? message.station_id : "";
            if (stationId) {
              api.setActiveStation(stationId);
              setFleetState("activeStationId", stationId);
              setFleetState("defaultStationId", stationId);
            }
          }
          applySnapshot(normalizeStatusSnapshot(message.data));
          return;
        }
        handleWebSocketEvent(type, message.data, setState, { refetchStatus });
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
        await logger.wsMessage("RECEIVED", { raw: event.data, error: "Parse failure" });
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setState("connectionStatus", "disconnected");
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout) return;
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, 2000);
  };

  const startPolling = () => {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      try {
        applySnapshot(await api.getStatus());
      } catch {
        // ignore — next poll or reconnect will pick it up
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  createEffect(() => {
    if (state.connectionStatus === "connected") {
      stopPolling();
    } else {
      startPolling();
    }
  });

  onMount(() => {
    void api
      .getHealth()
      .then(() => setState("sidecarHealthy", true))
      .catch(() => setState("sidecarHealthy", false));
  });

  // Connect on mount and reconnect whenever the active station changes so the
  // live stream always follows the station the rest of the app is scoped to.
  createEffect(() => {
    fleetState.activeStationId;
    connect();
  });

  onCleanup(() => {
    stopPolling();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
  });
}
