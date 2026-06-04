import { createStore } from "solid-js/store";
import { StatusSnapshot } from "../lib/types";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface SimulatorStore {
  snapshot: StatusSnapshot | null;
  selectedConnectorId: number;
  connectionStatus: ConnectionStatus;
  sidecarHealthy: boolean;
  wsInvalidation: {
    firmware: number;
    diagnostics: number;
    chargingProfiles: number;
    ocppKeys: number;
  };
}

export const [state, setState] = createStore<SimulatorStore>({
  snapshot: null,
  selectedConnectorId: 1,
  connectionStatus: "disconnected",
  sidecarHealthy: false,
  wsInvalidation: {
    firmware: 0,
    diagnostics: 0,
    chargingProfiles: 0,
    ocppKeys: 0,
  },
});
