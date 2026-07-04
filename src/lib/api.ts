import {
  AboutInfo,
  ChargingProfile,
  Config,
  ConfigUpdateResponse,
  Connector,
  ConnectorAvailability,
  CreateStationRequest,
  DeadLetterEntry,
  DiagnosticsStatus,
  FirmwareStatus,
  HealthStatus,
  LocalAuthEntry,
  LocalAuthList,
  LocalAuthPutEntry,
  LocalAuthUpdateResponse,
  OcppConfigKey,
  OcppStatus,
  Operation,
  OperationResponse,
  PatchStationConfigRequest,
  PatchStationResponse,
  QueueStatus,
  Reservation,
  Session,
  SessionStartOptions,
  StandardResponse,
  StationSnapshot,
  StatusSnapshot,
  StoppedSession,
  TimelineResponse,
} from "./types";
import { buildChargingProfilePayload, type ChargingProfileInput } from "./charging-profile";
import {
  normalizeChargingProfile,
  normalizeChargingProfiles,
  normalizeCompositeSchedule,
  normalizeConfig,
  normalizeConfigUpdateResponse,
  normalizeDeadLetter,
  normalizeDiagnosticsStatus,
  normalizeFirmwareStatus,
  normalizeLocalAuthEntry,
  normalizeLocalAuthList,
  normalizeLocalAuthUpdateResponse,
  normalizeOcppConfigKeys,
  normalizeOcppStatus,
  normalizeOperation,
  normalizeOperationResponse,
  normalizeOperations,
  normalizeQueueStatus,
  normalizeStationSnapshot,
  normalizeStationSnapshots,
  normalizeStatusSnapshot,
  normalizeStoppedSession,
} from "./api-normalizers";
import { APIError } from "./http";
import { logger } from "./logger";

export { APIError, readDetails } from "./http";

const BASE_URL = "http://localhost:8080/api/v1";
const ROOT_URL = "http://localhost:8080";

let activeStationId: string | null = null;

export function setActiveStation(id: string): void {
  activeStationId = id;
}

export function getActiveStation(): string | null {
  return activeStationId;
}

function stationBase(): string {
  return activeStationId ? `${BASE_URL}/stations/${activeStationId}` : BASE_URL;
}

async function handleResponse<T>(response: Response, url: string): Promise<T> {
  let data: unknown;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText };
    }
  }

  await logger.restResponse(url, response.status, data);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as StandardResponse).message)
        : JSON.stringify(data);
    throw new APIError(response.status, message, data as StandardResponse | undefined);
  }

  return data as T;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  await logger.restRequest(url, options);
  try {
    const response = await fetch(url, options);
    return handleResponse<T>(response, url);
  } catch (error) {
    if (!(error instanceof APIError)) {
      console.error(`[REST Network Error] ${url}`, error);
    }
    throw error;
  }
}

function stationUrl(id: string, path: string): string {
  return `${BASE_URL}/stations/${encodeURIComponent(id)}${path}`;
}

async function lifecycleAction(id: string, action: string): Promise<OperationResponse> {
  return normalizeOperationResponse(
    await request<unknown>(stationUrl(id, `/${action}`), { method: "POST" }),
  );
}

export const fleet = {
  async listStations(): Promise<StationSnapshot[]> {
    return normalizeStationSnapshots(await request<unknown>(`${BASE_URL}/stations`));
  },

  async createStation(body: CreateStationRequest): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/stations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async deleteStation(
    id: string,
    opts: {
      force?: boolean;
      delete_state?: boolean;
      clear_password?: boolean;
      new_default_id?: string;
    } = {},
  ): Promise<StandardResponse> {
    const query = new URLSearchParams();
    Object.entries(opts).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    const qs = query.toString();
    return request<StandardResponse>(`${BASE_URL}/stations/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`, {
      method: "DELETE",
    });
  },

  async getStationStatus(id: string): Promise<StationSnapshot> {
    return normalizeStationSnapshot(await request<unknown>(stationUrl(id, "/status")));
  },

  async patchStationConfig(id: string, body: PatchStationConfigRequest): Promise<PatchStationResponse> {
    return request<PatchStationResponse>(stationUrl(id, "/config"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async startStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "start");
  },

  async stopStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "stop");
  },

  async restartStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "restart");
  },

  async enableStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "enable");
  },

  async disableStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "disable");
  },

  async reloadStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "reload");
  },

  async persistStation(id: string): Promise<OperationResponse> {
    return lifecycleAction(id, "persist");
  },

  async reconnectStation(id: string): Promise<OperationResponse> {
    return normalizeOperationResponse(
      await request<unknown>(stationUrl(id, "/ocpp/reconnect"), { method: "POST" }),
    );
  },

  async getFleetStatus(): Promise<{ stations: StationSnapshot[] }> {
    const data = await request<{ stations: unknown }>(`${BASE_URL}/fleet/status`);
    return { stations: normalizeStationSnapshots(data.stations) };
  },

  async getFleetConfig(): Promise<{ config: unknown }> {
    return request<{ config: unknown }>(`${BASE_URL}/fleet/config`);
  },

  async saveFleetConfig(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/fleet/config/save`, { method: "POST" });
  },

  async reloadFleet(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/fleet/reload`, { method: "POST" });
  },

  async listOperations(): Promise<Operation[]> {
    return normalizeOperations(await request<unknown>(`${BASE_URL}/fleet/operations`));
  },

  async getOperation(id: string): Promise<Operation> {
    return normalizeOperation(await request<unknown>(`${BASE_URL}/fleet/operations/${encodeURIComponent(id)}`));
  },

  async getQueueStatus(id: string): Promise<QueueStatus> {
    return normalizeQueueStatus(await request<unknown>(stationUrl(id, "/queue/status")));
  },

  async drainQueue(id: string): Promise<StandardResponse> {
    return request<StandardResponse>(stationUrl(id, "/queue/drain"), { method: "POST" });
  },

  async clearQueue(id: string): Promise<StandardResponse> {
    return request<StandardResponse>(stationUrl(id, "/queue/clear"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
  },

  async getDeadLetter(id: string): Promise<DeadLetterEntry[]> {
    return normalizeDeadLetter(await request<unknown>(stationUrl(id, "/queue/dead-letter")));
  },

  async clearDeadLetter(id: string): Promise<StandardResponse> {
    return request<StandardResponse>(stationUrl(id, "/queue/dead-letter"), { method: "DELETE" });
  },

  async setOcppPassword(id: string, password: string): Promise<StandardResponse> {
    return request<StandardResponse>(stationUrl(id, "/credentials/ocpp-password"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  },

  async clearOcppPassword(id: string): Promise<StandardResponse> {
    return request<StandardResponse>(stationUrl(id, "/credentials/ocpp-password"), { method: "DELETE" });
  },

  async verifyCredentials(id: string): Promise<StandardResponse> {
    return request<StandardResponse>(stationUrl(id, "/credentials/test"), { method: "POST" });
  },
};

export const api = {
  setActiveStation,
  getActiveStation,

  async getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>(`${ROOT_URL}/health`);
  },

  async getAbout(): Promise<AboutInfo> {
    return request<AboutInfo>(`${stationBase()}/about`);
  },

  async getStatus(): Promise<StatusSnapshot> {
    return normalizeStatusSnapshot(await request<unknown>(`${stationBase()}/status`));
  },

  async createConnector(params: Pick<Connector, "voltage" | "current" | "phase">): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async updateConnector(
    id: number,
    params: Partial<Pick<Connector, "voltage" | "current" | "phase">>,
  ): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async deleteConnector(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}`, {
      method: "DELETE",
    });
  },

  async setConnectorAvailability(id: number, type: ConnectorAvailability): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  },

  async plugIn(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/plug_in`, { method: "POST" });
  },

  async unplug(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/unplug`, { method: "POST" });
  },

  async suspendEV(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/suspend_ev`, { method: "POST" });
  },

  async resumeCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/resume_charging`, { method: "POST" });
  },

  async startCharging(id: number, timeoutSeconds?: number): Promise<StandardResponse> {
    const query =
      timeoutSeconds !== undefined ? `?timeout_seconds=${encodeURIComponent(String(timeoutSeconds))}` : "";
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/start-charging${query}`, {
      method: "POST",
    });
  },

  async stopCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/stop-charging`, { method: "POST" });
  },

  async setRFID(id: number, rfidTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(
      `${stationBase()}/connectors/${id}/rfid?rfid_tag=${encodeURIComponent(rfidTag)}`,
      { method: "PUT" },
    );
  },

  async clearRFID(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/connectors/${id}/rfid`, { method: "DELETE" });
  },

  async getSessions(): Promise<Session[]> {
    return request<Session[]>(`${stationBase()}/sessions`);
  },

  async startSession(connectorId: number, options: SessionStartOptions = {}): Promise<StandardResponse> {
    const body: Record<string, unknown> = { connector_id: connectorId };
    if (options.id_tag !== undefined) body.id_tag = options.id_tag;
    if (options.timeout_seconds !== undefined) body.timeout_seconds = options.timeout_seconds;
    return request<StandardResponse>(`${stationBase()}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async stopAllSessions(): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/sessions/stop`, { method: "POST" });
  },

  async getLastStoppedSession(): Promise<StoppedSession> {
    return normalizeStoppedSession(await request<unknown>(`${stationBase()}/sessions/last-stopped`));
  },

  async getSessionInfo(): Promise<Session[]> {
    return request<Session[]>(`${stationBase()}/sessions/info`);
  },

  async getSessionByConnector(connectorId: number): Promise<Session> {
    return request<Session>(`${stationBase()}/sessions/${connectorId}`);
  },

  async getConfig(): Promise<Config> {
    return normalizeConfig(await request<unknown>(`${stationBase()}/config`));
  },

  async updateConfig(config: Partial<Config>): Promise<ConfigUpdateResponse> {
    const { connectors: _connectors, ...body } = config;
    return normalizeConfigUpdateResponse(
      await request<unknown>(`${stationBase()}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  },

  async saveConfig(): Promise<StandardResponse> {
    // Config-save persists the global config file (all stations); it is a
    // fleet-level op. The station-scoped /stations/{id}/config/save route
    // deliberately returns 400, so target the unscoped endpoint.
    return request<StandardResponse>(`${BASE_URL}/config/save`, { method: "POST" });
  },

  async getReservations(): Promise<Reservation[]> {
    return request<Reservation[]>(`${stationBase()}/reservations`);
  },

  async createReservation(reservation: Reservation): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservation),
    });
  },

  async cancelReservation(reservationId: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/reservations/${reservationId}`, {
      method: "DELETE",
    });
  },

  async getTimeline(
    params: {
      limit?: number;
      offset?: number;
      source?: string;
      direction?: string;
      event_type?: string;
      action?: string;
      search?: string;
      connector_id?: number;
      transaction_id?: number;
    } = {},
  ): Promise<TimelineResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, value.toString());
    });
    return request<TimelineResponse>(`${stationBase()}/timeline?${query.toString()}`);
  },

  async clearTimeline(): Promise<void> {
    return request<void>(`${stationBase()}/timeline`, { method: "DELETE" });
  },

  async getTimelineCount(): Promise<{ count: number }> {
    return request<{ count: number }>(`${stationBase()}/timeline/count`);
  },

  async getLocalAuthList(): Promise<LocalAuthList> {
    return normalizeLocalAuthList(await request<unknown>(`${stationBase()}/local-auth-list`));
  },

  async getLocalAuthEntry(idTag: string): Promise<LocalAuthEntry> {
    return normalizeLocalAuthEntry(
      await request<unknown>(`${stationBase()}/local-auth-list/${encodeURIComponent(idTag)}`),
    );
  },

  async updateLocalAuthList(params: {
    list_version: number;
    update_type: "Full" | "Differential";
    entries: LocalAuthPutEntry[];
  }): Promise<LocalAuthUpdateResponse> {
    return normalizeLocalAuthUpdateResponse(
      await request<unknown>(`${stationBase()}/local-auth-list`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }),
    );
  },

  async deleteLocalAuthEntry(idTag: string): Promise<void> {
    return request<void>(`${stationBase()}/local-auth-list/${encodeURIComponent(idTag)}`, {
      method: "DELETE",
    });
  },

  async clearLocalAuthList(): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/local-auth-list`, { method: "DELETE" });
  },

  async getFirmwareStatus(): Promise<FirmwareStatus> {
    return normalizeFirmwareStatus(await request<unknown>(`${stationBase()}/firmware/status`));
  },

  async triggerFirmwareUpdate(params: { location: string; retrieve_date: string }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/firmware/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async cancelFirmwareUpdate(): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/firmware/cancel`, { method: "POST" });
  },

  async getDiagnosticsStatus(): Promise<DiagnosticsStatus> {
    return normalizeDiagnosticsStatus(await request<unknown>(`${stationBase()}/diagnostics/status`));
  },

  async triggerDiagnosticsUpload(params: {
    location: string;
    retries: number;
    retry_interval: number;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/diagnostics/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async cancelDiagnosticsUpload(): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/diagnostics/cancel`, { method: "POST" });
  },

  async getChargingProfiles(): Promise<ChargingProfile[]> {
    return normalizeChargingProfiles(await request<unknown>(`${stationBase()}/charging-profiles`));
  },

  async getChargingProfile(profileId: number, connectorId: number): Promise<ChargingProfile> {
    return normalizeChargingProfile(
      await request<unknown>(`${stationBase()}/charging-profiles/${profileId}?connector_id=${connectorId}`),
    );
  },

  async createChargingProfile(params: {
    connector_id: number;
    profile: ChargingProfileInput;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/charging-profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connector_id: params.connector_id,
        profile: buildChargingProfilePayload(params.profile),
      }),
    });
  },

  async deleteChargingProfiles(
    params: { profile_id?: number; connector_id?: number; purpose?: string } = {},
  ): Promise<StandardResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, value.toString());
    });
    return request<StandardResponse>(`${stationBase()}/charging-profiles?${query.toString()}`, {
      method: "DELETE",
    });
  },

  async getCompositeSchedule(
    connectorId: number,
    duration: number,
  ): Promise<{ periods: ChargingProfile["schedule_period"] }> {
    return normalizeCompositeSchedule(
      await request<unknown>(`${stationBase()}/charging-profiles/composite-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector_id: connectorId, duration }),
      }),
    );
  },

  async getOcppStatus(): Promise<OcppStatus> {
    return normalizeOcppStatus(await request<unknown>(`${stationBase()}/ocpp/status`));
  },

  async getOCPPConfigKeys(): Promise<OcppConfigKey[]> {
    return normalizeOcppConfigKeys(await request<unknown>(`${stationBase()}/ocpp/config-keys`));
  },

  async updateOCPPConfigKey(key: string, value: string): Promise<void> {
    return request<void>(`${stationBase()}/ocpp/config-keys`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  },

  async ocppAuthorize(idTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/ocpp/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_tag: idTag }),
    });
  },

  async ocppHeartbeat(): Promise<void> {
    return request<void>(`${stationBase()}/ocpp/heartbeat`, { method: "POST" });
  },

  async ocppRawStatusNotification(params: {
    connector_id: number;
    error_code: string;
    status: string;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/ocpp/raw/status-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async ocppRawMeterValues(params: { connector_id: number; transaction_id: number }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/ocpp/raw/meter-values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async ocppRawDataTransfer(params: {
    vendor_id: string;
    message_id: string;
    data: string;
  }): Promise<{ status: string; data?: string }> {
    return request<{ status: string; data?: string }>(`${stationBase()}/ocpp/raw/data-transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async ocppRawStartTransaction(params: {
    connector_id: number;
    id_tag: string;
    meter_start?: number;
    timestamp?: string;
    reservation_id?: number;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/ocpp/raw/start-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async ocppRawStopTransaction(params: {
    transaction_id: number;
    reason: string;
    meter_stop?: number;
    timestamp?: string;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${stationBase()}/ocpp/raw/stop-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  fleet,
};


