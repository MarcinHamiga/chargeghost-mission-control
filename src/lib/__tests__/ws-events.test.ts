import { describe, expect, it } from "vitest";
import { createStore } from "solid-js/store";
import type { SimulatorStore } from "../../store/simulator";
import type { StatusSnapshot } from "../types";
import { handleWebSocketEvent } from "../ws-events";

function makeSnapshot(overrides: Partial<StatusSnapshot> = {}): StatusSnapshot {
  return {
    ocpp_connected: true,
    connectors: [],
    active_sessions: [],
    energy_meters: {},
    ...overrides,
  };
}

function makeStore(snapshot: StatusSnapshot | null) {
  return createStore<SimulatorStore>({
    snapshot,
    selectedConnectorId: 1,
    connectionStatus: "connected",
    sidecarHealthy: true,
    wsInvalidation: {
      firmware: 0,
      diagnostics: 0,
      chargingProfiles: 0,
      ocppKeys: 0,
    },
  });
}

describe("handleWebSocketEvent - charging_state_changed", () => {
  it("updates is_charging to true on the matching active session when charging_state is Charging", () => {
    const [state, setState] = makeStore(
      makeSnapshot({
        active_sessions: [
          {
            transaction_id: 42,
            connector_id: 1,
            energy_charged_wh: 100,
            state_of_charge: 50,
            start_time: "2026-07-03T00:00:00Z",
            id_tag: "TAG1",
            is_charging: false,
          },
        ],
      }),
    );

    handleWebSocketEvent(
      "charging_state_changed",
      { connector_id: 1, charging_state: "Charging" },
      setState,
    );

    expect(state.snapshot?.active_sessions[0].is_charging).toBe(true);
  });

  it("updates is_charging to false on the matching active session when charging_state is SuspendedEV", () => {
    const [state, setState] = makeStore(
      makeSnapshot({
        active_sessions: [
          {
            transaction_id: 42,
            connector_id: 1,
            energy_charged_wh: 100,
            state_of_charge: 50,
            start_time: "2026-07-03T00:00:00Z",
            id_tag: "TAG1",
            is_charging: true,
          },
        ],
      }),
    );

    handleWebSocketEvent(
      "charging_state_changed",
      { connector_id: 1, charging_state: "SuspendedEV" },
      setState,
    );

    expect(state.snapshot?.active_sessions[0].is_charging).toBe(false);
  });

  it("is a no-op when no session exists for the given connector", () => {
    const [state, setState] = makeStore(
      makeSnapshot({
        active_sessions: [
          {
            transaction_id: 42,
            connector_id: 2,
            energy_charged_wh: 100,
            state_of_charge: 50,
            start_time: "2026-07-03T00:00:00Z",
            id_tag: "TAG1",
            is_charging: false,
          },
        ],
      }),
    );

    handleWebSocketEvent(
      "charging_state_changed",
      { connector_id: 1, charging_state: "Charging" },
      setState,
    );

    expect(state.snapshot?.active_sessions).toHaveLength(1);
    expect(state.snapshot?.active_sessions[0]).toMatchObject({
      connector_id: 2,
      is_charging: false,
    });
  });

  it("does not create a new session when no session exists at all", () => {
    const [state, setState] = makeStore(makeSnapshot({ active_sessions: [] }));

    handleWebSocketEvent(
      "charging_state_changed",
      { connector_id: 1, charging_state: "Charging" },
      setState,
    );

    expect(state.snapshot?.active_sessions).toHaveLength(0);
  });
});
