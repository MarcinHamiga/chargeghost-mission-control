import { onCleanup, onMount } from "solid-js";
import { setState } from "../store/simulator";
import { StatusSnapshot } from "../lib/types";

export function useWebSocket() {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

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

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "state_snapshot") {
          setState("snapshot", message.data as StatusSnapshot);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
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

  onMount(() => {
    connect();
  });

  onCleanup(() => {
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
