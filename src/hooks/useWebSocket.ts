import { onCleanup, onMount, createEffect } from "solid-js";
import { state, setState } from "../store/simulator";
import { StatusSnapshot } from "../lib/types";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

export function useWebSocket() {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const applySnapshot = (snapshot: StatusSnapshot) => {
    setState("snapshot", snapshot);
    // Auto-select first valid connector if current selection is invalid
    if (snapshot.connectors.length > 0) {
      const ids = snapshot.connectors.map((c) => c.id);
      if (!ids.includes(state.selectedConnectorId)) {
        setState("selectedConnectorId", snapshot.connectors.sort((a, b) => a.id - b.id)[0].id);
      }
    }
  };

  const connect = () => {
    setState("connectionStatus", "connecting");

    if (ws) {
      ws.close();
    }

    ws = new WebSocket("ws://localhost:8080/ws");

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
        await logger.wsMessage('RECEIVED', message);
        if (message.type === "state_snapshot" || message.type === "tick") {
          applySnapshot(message.data as StatusSnapshot);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
        await logger.wsMessage('RECEIVED', { raw: event.data, error: 'Parse failure' });
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
        const snapshot = await api.getStatus();
        applySnapshot(snapshot);
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

  // Only poll as fallback when WebSocket is disconnected
  createEffect(() => {
    if (state.connectionStatus === "connected") {
      stopPolling();
    } else {
      startPolling();
    }
  });

  onMount(() => {
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
