import {
  AboutInfo,
  ChargingProfile,
  Config,
  ConfigUpdateResponse,
  Connector,
  ConnectorAvailability,
  DiagnosticsStatus,
  FirmwareStatus,
  HealthStatus,
  LocalAuthEntry,
  LocalAuthList,
  LocalAuthPutEntry,
  OcppConfigKey,
  OcppStatus,
  Reservation,
  Session,
  SessionStartOptions,
  StandardResponse,
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
  normalizeDiagnosticsStatus,
  normalizeFirmwareStatus,
  normalizeLocalAuthEntry,
  normalizeLocalAuthList,
  normalizeOcppConfigKeys,
  normalizeOcppStatus,
  normalizeStatusSnapshot,
  normalizeStoppedSession,
} from "./api-normalizers";
import { APIError } from "./http";
import { logger } from "./logger";

export { APIError, readDetails } from "./http";

const BASE_URL = "http://localhost:8080/api/v1";
const ROOT_URL = "http://localhost:8080";

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

export const api = {
  async getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>(`${ROOT_URL}/health`);
  },

  async getAbout(): Promise<AboutInfo> {
    return request<AboutInfo>(`${BASE_URL}/about`);
  },

  async getStatus(): Promise<StatusSnapshot> {
    return normalizeStatusSnapshot(await request<unknown>(`${BASE_URL}/status`));
  },

  async getConnectors(): Promise<Connector[]> {
    return request<Connector[]>(`${BASE_URL}/connectors`);
  },

  async getConnector(id: number): Promise<Connector> {
    return request<Connector>(`${BASE_URL}/connectors/${id}`);
  },

  async createConnector(params: Pick<Connector, "voltage" | "current" | "phase">): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async updateConnector(
    id: number,
    params: Partial<Pick<Connector, "voltage" | "current" | "phase">>,
  ): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async deleteConnector(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}`, {
      method: "DELETE",
    });
  },

  async setConnectorAvailability(id: number, type: ConnectorAvailability): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  },

  async plugIn(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/plug_in`, { method: "POST" });
  },

  async unplug(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/unplug`, { method: "POST" });
  },

  async suspendEV(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/suspend_ev`, { method: "POST" });
  },

  async resumeCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/resume_charging`, { method: "POST" });
  },

  async startCharging(id: number, timeoutSeconds?: number): Promise<StandardResponse> {
    const query =
      timeoutSeconds !== undefined ? `?timeout_seconds=${encodeURIComponent(String(timeoutSeconds))}` : "";
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/start-charging${query}`, {
      method: "POST",
    });
  },

  async stopCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/stop-charging`, { method: "POST" });
  },

  async setRFID(id: number, rfidTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(
      `${BASE_URL}/connectors/${id}/rfid?rfid_tag=${encodeURIComponent(rfidTag)}`,
      { method: "PUT" },
    );
  },

  async clearRFID(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/rfid`, { method: "DELETE" });
  },

  async getSessions(): Promise<Session[]> {
    return request<Session[]>(`${BASE_URL}/sessions`);
  },

  async startSession(connectorId: number, options: SessionStartOptions = {}): Promise<StandardResponse> {
    const body: Record<string, unknown> = { connector_id: connectorId };
    if (options.id_tag !== undefined) body.id_tag = options.id_tag;
    if (options.timeout_seconds !== undefined) body.timeout_seconds = options.timeout_seconds;
    return request<StandardResponse>(`${BASE_URL}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async stopAllSessions(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/sessions/stop`, { method: "POST" });
  },

  async getLastStoppedSession(): Promise<StoppedSession> {
    return normalizeStoppedSession(await request<unknown>(`${BASE_URL}/sessions/last-stopped`));
  },

  async getActiveSession(connectorId: number): Promise<Session> {
    return request<Session>(`${BASE_URL}/sessions/active?connector_id=${connectorId}`);
  },

  async getSessionInfo(): Promise<Session[]> {
    return request<Session[]>(`${BASE_URL}/sessions/info`);
  },

  async getSessionByConnector(connectorId: number): Promise<Session> {
    return request<Session>(`${BASE_URL}/sessions/${connectorId}`);
  },

  async getConfig(): Promise<Config> {
    return normalizeConfig(await request<unknown>(`${BASE_URL}/config`));
  },

  async updateConfig(config: Partial<Config>): Promise<ConfigUpdateResponse> {
    return normalizeConfigUpdateResponse(
      await request<unknown>(`${BASE_URL}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      }),
    );
  },

  async saveConfig(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/config/save`, { method: "POST" });
  },

  async getReservations(): Promise<Reservation[]> {
    return request<Reservation[]>(`${BASE_URL}/reservations`);
  },

  async createReservation(reservation: Reservation): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservation),
    });
  },

  async cancelReservation(reservationId: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/reservations/${reservationId}`, {
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
    return request<TimelineResponse>(`${BASE_URL}/timeline?${query.toString()}`);
  },

  async clearTimeline(): Promise<void> {
    return request<void>(`${BASE_URL}/timeline`, { method: "DELETE" });
  },

  async getTimelineCount(): Promise<{ count: number }> {
    return request<{ count: number }>(`${BASE_URL}/timeline/count`);
  },

  async getLocalAuthList(): Promise<LocalAuthList> {
    return normalizeLocalAuthList(await request<unknown>(`${BASE_URL}/local-auth-list`));
  },

  async getLocalAuthEntry(idTag: string): Promise<LocalAuthEntry> {
    return normalizeLocalAuthEntry(
      await request<unknown>(`${BASE_URL}/local-auth-list/${encodeURIComponent(idTag)}`),
    );
  },

  async updateLocalAuthList(params: {
    list_version: number;
    update_type: "Full" | "Differential";
    entries: LocalAuthPutEntry[];
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/local-auth-list`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async deleteLocalAuthEntry(idTag: string): Promise<void> {
    return request<void>(`${BASE_URL}/local-auth-list/${encodeURIComponent(idTag)}`, {
      method: "DELETE",
    });
  },

  async clearLocalAuthList(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/local-auth-list`, { method: "DELETE" });
  },

  async getFirmwareStatus(): Promise<FirmwareStatus> {
    return normalizeFirmwareStatus(await request<unknown>(`${BASE_URL}/firmware/status`));
  },

  async triggerFirmwareUpdate(params: { location: string; retrieve_date: string }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/firmware/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async cancelFirmwareUpdate(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/firmware/cancel`, { method: "POST" });
  },

  async getDiagnosticsStatus(): Promise<DiagnosticsStatus> {
    return normalizeDiagnosticsStatus(await request<unknown>(`${BASE_URL}/diagnostics/status`));
  },

  async triggerDiagnosticsUpload(params: {
    location: string;
    retries: number;
    retry_interval: number;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/diagnostics/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async cancelDiagnosticsUpload(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/diagnostics/cancel`, { method: "POST" });
  },

  async getChargingProfiles(): Promise<ChargingProfile[]> {
    return normalizeChargingProfiles(await request<unknown>(`${BASE_URL}/charging-profiles`));
  },

  async getChargingProfile(profileId: number, connectorId?: number): Promise<ChargingProfile> {
    const query = connectorId ? `?connector_id=${connectorId}` : "";
    return normalizeChargingProfile(
      await request<unknown>(`${BASE_URL}/charging-profiles/${profileId}${query}`),
    );
  },

  async createChargingProfile(params: {
    connector_id: number;
    profile: ChargingProfileInput;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/charging-profiles`, {
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
    return request<StandardResponse>(`${BASE_URL}/charging-profiles?${query.toString()}`, {
      method: "DELETE",
    });
  },

  async getCompositeSchedule(
    connectorId: number,
    duration: number,
  ): Promise<{ periods: ChargingProfile["schedule_period"] }> {
    return normalizeCompositeSchedule(
      await request<unknown>(`${BASE_URL}/charging-profiles/composite-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector_id: connectorId, duration }),
      }),
    );
  },

  async getOcppStatus(): Promise<OcppStatus> {
    return normalizeOcppStatus(await request<unknown>(`${BASE_URL}/ocpp/status`));
  },

  async getOCPPConfigKeys(): Promise<OcppConfigKey[]> {
    return normalizeOcppConfigKeys(await request<unknown>(`${BASE_URL}/ocpp/config-keys`));
  },

  async updateOCPPConfigKey(key: string, value: string): Promise<void> {
    return request<void>(`${BASE_URL}/ocpp/config-keys`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  },

  async ocppAuthorize(idTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_tag: idTag }),
    });
  },

  async ocppHeartbeat(): Promise<void> {
    return request<void>(`${BASE_URL}/ocpp/heartbeat`, { method: "POST" });
  },

  async ocppRawStatusNotification(params: {
    connector_id: number;
    error_code: string;
    status: string;
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/status-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async ocppRawMeterValues(params: { connector_id: number; transaction_id: number }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/meter-values`, {
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
    return request<{ status: string; data?: string }>(`${BASE_URL}/ocpp/raw/data-transfer`, {
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
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/start-transaction`, {
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
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/stop-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },
};
