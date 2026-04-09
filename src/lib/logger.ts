import { invoke } from "@tauri-apps/api/core";

async function terminalLog(label: string, data: any, metadata?: string) {
  let message = `[${label}]`;
  if (metadata) message += ` ${metadata}`;
  
  if (data !== undefined && data !== null) {
    try {
      message += `\nPayload: ${JSON.stringify(data, null, 2)}`;
    } catch {
      message += `\nPayload: ${data}`;
    }
  }
  
  try {
    await invoke("log_to_terminal", { message });
  } catch (e) {
    // If invoke fails (e.g. not in tauri environment), fallback to console for visibility
    console.error("Failed to log to terminal", e);
    console.log(message);
  }
}

export const logger = {
  restRequest: async (url: string, options: RequestInit = {}) => {
    const label = `REST Request ${options.method || 'GET'}`;
    let body = null;
    if (options.body) {
      try {
        body = JSON.parse(options.body as string);
      } catch {
        body = options.body;
      }
    }
    await terminalLog(label, body, url);
  },

  restResponse: async (url: string, status: number, data: any) => {
    const isError = status >= 400;
    const label = isError ? 'REST Error' : 'REST Response';
    await terminalLog(label, data, `${status} ${url}`);
  },

  wsMessage: async (direction: 'SENT' | 'RECEIVED', message: any) => {
    const type = message?.type ? `: ${message.type}` : '';
    const label = `WS ${direction}${type}`;
    await terminalLog(label, message);
  }
};
