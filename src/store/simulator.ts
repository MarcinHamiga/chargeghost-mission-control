import { createStore } from "solid-js/store";
import { StatusSnapshot } from "../lib/types";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface SimulatorStore {
  snapshot: StatusSnapshot | null;
  selectedConnectorId: number;
  connectionStatus: ConnectionStatus;
}

export const [state, setState] = createStore<SimulatorStore>({
  snapshot: null,
  selectedConnectorId: 1,
  connectionStatus: "disconnected",
});
