import { createStore } from "solid-js/store";
import { StationSnapshot } from "../lib/types";
import { api } from "../lib/api";

export interface FleetStore {
  stations: StationSnapshot[];
  activeStationId: string | null;
  defaultStationId: string | null;
  loading: boolean;
  error: string | null;
}

export const [fleetState, setFleetState] = createStore<FleetStore>({
  stations: [],
  activeStationId: null,
  defaultStationId: null,
  loading: false,
  error: null,
});

export function setActiveStationId(id: string): void {
  api.setActiveStation(id);
  setFleetState("activeStationId", id);
}
