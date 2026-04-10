import {
  AboutInfo,
  ChargingProfile,
  Config,
  ConfigUpdateResponse,
  Connector,
  DiagnosticsStatus,
  FirmwareStatus,
  HealthStatus,
  LocalAuthEntry,
  LocalAuthList,
  Reservation,
  StoppedSession,
  Session,
  OcppConfigKey,
  StandardResponse,
  StatusSnapshot,
  TimelineResponse,
} from './types';
import {
  normalizeConfig,
  normalizeDiagnosticsStatus,
  normalizeFirmwareStatus,
  normalizeOcppConfigKeys,
  normalizeStoppedSession,
} from './api-normalizers';
import { logger } from './logger';

const BASE_URL = 'http://localhost:8080/api/v1';
const ROOT_URL = 'http://localhost:8080';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response, url: string): Promise<T> {
  let data: any;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText };
    }
  }

  await logger.restResponse(url, response.status, data);

  if (!response.ok) {
    throw new APIError(response.status, data?.message || JSON.stringify(data));
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
  // Health & About
  async getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>(`${ROOT_URL}/health`);
  },

  async getAbout(): Promise<AboutInfo> {
    return request<AboutInfo>(`${BASE_URL}/about`);
  },

  // Status
  async getStatus(): Promise<StatusSnapshot> {
    return request<StatusSnapshot>(`${BASE_URL}/status`);
  },

  // Connectors
  async getConnectors(): Promise<Connector[]> {
    return request<Connector[]>(`${BASE_URL}/connectors`);
  },

  async getConnector(id: number): Promise<Connector> {
    return request<Connector>(`${BASE_URL}/connectors/${id}`);
  },

  async createConnector(params: Pick<Connector, 'voltage' | 'current' | 'phase'>): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async updateConnector(id: number, params: Partial<Pick<Connector, 'voltage' | 'current' | 'phase'>>): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async deleteConnector(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}`, {
      method: 'DELETE',
    });
  },

  // Connector Actions
  async plugIn(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/plug_in`, { method: 'POST' });
  },

  async unplug(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/unplug`, { method: 'POST' });
  },

  async suspendEV(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/suspend_ev`, { method: 'POST' });
  },

  async resumeCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/resume_charging`, { method: 'POST' });
  },

  async startCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/start-charging`, { method: 'POST' });
  },

  async stopCharging(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/stop-charging`, { method: 'POST' });
  },

  async setRFID(id: number, rfidTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/rfid?rfid_tag=${encodeURIComponent(rfidTag)}`, {
      method: 'PUT',
    });
  },

  async clearRFID(id: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/connectors/${id}/rfid`, { method: 'DELETE' });
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    return request<Session[]>(`${BASE_URL}/sessions`);
  },

  async startSession(connectorId: number, maxEnergy: number, idTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector_id: connectorId, max_energy: maxEnergy, id_tag: idTag }),
    });
  },

  async stopAllSessions(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/sessions/stop`, { method: 'POST' });
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

  // Configuration
  async getConfig(): Promise<Config> {
    return normalizeConfig(await request<unknown>(`${BASE_URL}/config`));
  },

  async updateConfig(config: Partial<Config>): Promise<ConfigUpdateResponse> {
    return request<ConfigUpdateResponse>(`${BASE_URL}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  async saveConfig(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/config/save`, { method: 'POST' });
  },

  // Reservations
  async getReservations(): Promise<Reservation[]> {
    return request<Reservation[]>(`${BASE_URL}/reservations`);
  },

  async createReservation(reservation: Reservation): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservation),
    });
  },

  async cancelReservation(reservationId: number): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/reservations/${reservationId}`, {
      method: 'DELETE',
    });
  },

  // Timeline
  async getTimeline(params: {
    limit?: number;
    offset?: number;
    source?: string;
    direction?: string;
    event_type?: string;
    action?: string;
    search?: string;
    connector_id?: number;
    transaction_id?: number;
  } = {}): Promise<TimelineResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, value.toString());
    });
    return request<TimelineResponse>(`${BASE_URL}/timeline?${query.toString()}`);
  },

  async clearTimeline(): Promise<void> {
    return request<void>(`${BASE_URL}/timeline`, { method: 'DELETE' });
  },

  async getTimelineCount(): Promise<{ count: number }> {
    return request<{ count: number }>(`${BASE_URL}/timeline/count`);
  },

  // Local Authorization List
  async getLocalAuthList(): Promise<LocalAuthList> {
    return request<LocalAuthList>(`${BASE_URL}/local-auth-list`);
  },

  async getLocalAuthEntry(idTag: string): Promise<LocalAuthEntry> {
    return request<LocalAuthEntry>(`${BASE_URL}/local-auth-list/${encodeURIComponent(idTag)}`);
  },

  async updateLocalAuthList(params: {
    list_version: number;
    update_type: 'Full' | 'Differential';
    entries: { id_tag: string; status: string; expiry_date?: string; parent_id_tag?: string }[];
  }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/local-auth-list`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async deleteLocalAuthEntry(idTag: string): Promise<void> {
    return request<void>(`${BASE_URL}/local-auth-list/${encodeURIComponent(idTag)}`, {
      method: 'DELETE',
    });
  },

  async clearLocalAuthList(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/local-auth-list`, { method: 'DELETE' });
  },

  // Firmware & Diagnostics
  async getFirmwareStatus(): Promise<FirmwareStatus> {
    return normalizeFirmwareStatus(await request<unknown>(`${BASE_URL}/firmware/status`));
  },

  async triggerFirmwareUpdate(params: { location: string; retrieve_date: string }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/firmware/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async cancelFirmwareUpdate(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/firmware/cancel`, { method: 'POST' });
  },

  async getDiagnosticsStatus(): Promise<DiagnosticsStatus> {
    return normalizeDiagnosticsStatus(await request<unknown>(`${BASE_URL}/diagnostics/status`));
  },

  async triggerDiagnosticsUpload(params: { location: string; retries: number; retry_interval: number }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/diagnostics/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async cancelDiagnosticsUpload(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/diagnostics/cancel`, { method: 'POST' });
  },

  // Charging Profiles
  async getChargingProfiles(): Promise<ChargingProfile[]> {
    return request<ChargingProfile[]>(`${BASE_URL}/charging-profiles`);
  },

  async getChargingProfile(profileId: number, connectorId?: number): Promise<ChargingProfile> {
    const query = connectorId ? `?connector_id=${connectorId}` : '';
    return request<ChargingProfile>(`${BASE_URL}/charging-profiles/${profileId}${query}`);
  },

  async createChargingProfile(params: { connector_id: number; profile: any }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/charging-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async deleteChargingProfiles(params: { profile_id?: number; connector_id?: number; purpose?: string } = {}): Promise<StandardResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, value.toString());
    });
    return request<StandardResponse>(`${BASE_URL}/charging-profiles?${query.toString()}`, {
      method: 'DELETE',
    });
  },

  async getCompositeSchedule(connectorId: number, duration: number): Promise<{ periods: any[] }> {
    return request<{ periods: any[] }>(`${BASE_URL}/charging-profiles/composite-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector_id: connectorId, duration }),
    });
  },

  // OCPP Control
  async getOCPPConfigKeys(): Promise<OcppConfigKey[]> {
    return normalizeOcppConfigKeys(await request<unknown>(`${BASE_URL}/ocpp/config-keys`));
  },

  async updateOCPPConfigKey(key: string, value: string): Promise<void> {
    return request<void>(`${BASE_URL}/ocpp/config-keys`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  },

  async ocppAuthorize(idTag: string): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_tag: idTag }),
    });
  },

  async ocppHeartbeat(): Promise<void> {
    return request<void>(`${BASE_URL}/ocpp/heartbeat`, { method: 'POST' });
  },

  async ocppRawStatusNotification(params: { connector_id: number; error_code: string; status: string }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/status-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async ocppRawMeterValues(params: { connector_id: number; transaction_id: number }): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/meter-values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async ocppRawDataTransfer(params: { vendor_id: string; message_id: string; data: string }): Promise<{ status: string; data?: string }> {
    return request<{ status: string; data?: string }>(`${BASE_URL}/ocpp/raw/data-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async ocppRawStartTransaction(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/start-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async ocppRawStopTransaction(): Promise<StandardResponse> {
    return request<StandardResponse>(`${BASE_URL}/ocpp/raw/stop-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
