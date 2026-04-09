import {
  AboutInfo,
  Config,
  ConfigUpdateResponse,
  Connector,
  DiagnosticsStatus,
  FirmwareStatus,
  HealthStatus,
  Session,
  StandardResponse,
  StatusSnapshot,
  TimelineResponse,
} from './types';

const BASE_URL = 'http://localhost:8080/api/v1';
const ROOT_URL = 'http://localhost:8080';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.message || JSON.stringify(errorBody);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(`API Error ${response.status}: ${errorDetail}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export const api = {
  // Health & About
  async getHealth(): Promise<HealthStatus> {
    const response = await fetch(`${ROOT_URL}/health`);
    return handleResponse<HealthStatus>(response);
  },

  async getAbout(): Promise<AboutInfo> {
    const response = await fetch(`${ROOT_URL}/api/about`);
    return handleResponse<AboutInfo>(response);
  },

  // Status
  async getStatus(): Promise<StatusSnapshot> {
    const response = await fetch(`${BASE_URL}/status`);
    return handleResponse<StatusSnapshot>(response);
  },

  // Connectors
  async getConnectors(): Promise<Connector[]> {
    const response = await fetch(`${BASE_URL}/connectors`);
    return handleResponse<Connector[]>(response);
  },

  async getConnector(id: number): Promise<Connector> {
    const response = await fetch(`${BASE_URL}/connectors/${id}`);
    return handleResponse<Connector>(response);
  },

  async updateConnector(id: number, params: Partial<Pick<Connector, 'voltage' | 'current' | 'phase'>>): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<StandardResponse>(response);
  },

  async deleteConnector(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<StandardResponse>(response);
  },

  // Connector Actions
  async plugIn(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/plug_in`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async unplug(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/unplug`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async suspendEV(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/suspend_ev`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async resumeCharging(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/resume_charging`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async startCharging(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/start-charging`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async stopCharging(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/stop-charging`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async setRFID(id: number, rfidTag: string): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/rfid?rfid_tag=${encodeURIComponent(rfidTag)}`, {
      method: 'PUT',
    });
    return handleResponse<StandardResponse>(response);
  },

  async clearRFID(id: number): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/connectors/${id}/rfid`, { method: 'DELETE' });
    return handleResponse<StandardResponse>(response);
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    const response = await fetch(`${BASE_URL}/sessions`);
    return handleResponse<Session[]>(response);
  },

  async startSession(connectorId: number, maxEnergy: number, idTag?: string): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector_id: connectorId, max_energy: maxEnergy, id_tag: idTag }),
    });
    return handleResponse<StandardResponse>(response);
  },

  async stopAllSessions(): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/sessions/stop`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
  },

  async getLastStoppedSession(): Promise<Session> {
    const response = await fetch(`${BASE_URL}/sessions/last-stopped`);
    return handleResponse<Session>(response);
  },

  // Configuration
  async getConfig(): Promise<Config> {
    const response = await fetch(`${BASE_URL}/config`);
    return handleResponse<Config>(response);
  },

  async updateConfig(config: Partial<Config>): Promise<ConfigUpdateResponse> {
    const response = await fetch(`${BASE_URL}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<ConfigUpdateResponse>(response);
  },

  async saveConfig(): Promise<StandardResponse> {
    const response = await fetch(`${BASE_URL}/config/save`, { method: 'POST' });
    return handleResponse<StandardResponse>(response);
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
    const response = await fetch(`${BASE_URL}/timeline?${query.toString()}`);
    return handleResponse<TimelineResponse>(response);
  },

  // Firmware & Diagnostics
  async getFirmwareStatus(): Promise<FirmwareStatus> {
    const response = await fetch(`${BASE_URL}/firmware/status`);
    return handleResponse<FirmwareStatus>(response);
  },

  async getDiagnosticsStatus(): Promise<DiagnosticsStatus> {
    const response = await fetch(`${BASE_URL}/diagnostics/status`);
    return handleResponse<DiagnosticsStatus>(response);
  },
};
