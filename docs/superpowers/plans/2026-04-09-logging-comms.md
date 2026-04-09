# Communication Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add detailed, structured logging for REST and WebSocket communications between the frontend and the sidecar.

**Architecture:** Centralized `Logger` utility in `src/lib/logger.ts` using `console.groupCollapsed` for structured DevTools output. Updated `api.ts` and `useWebSocket.ts` to consume this utility.

**Tech Stack:** SolidJS, TypeScript, Browser Console API.

---

### Task 1: Create Logger Utility

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: Create the logger utility file**

```typescript
export const logger = {
  restRequest: (url: string, options: RequestInit = {}) => {
    console.groupCollapsed(`%c[REST Request] %c${options.method || 'GET'} %c${url}`, 'color: #3b82f6; font-weight: bold;', 'color: #10b981;', 'color: #6b7280; font-weight: normal;');
    if (options.body) {
      try {
        console.log('Body:', JSON.parse(options.body as string));
      } catch {
        console.log('Body:', options.body);
      }
    }
    if (options.headers) console.log('Headers:', options.headers);
    console.groupEnd();
  },

  restResponse: (url: string, status: number, data: any) => {
    const isError = status >= 400;
    const color = isError ? '#ef4444' : '#10b981';
    const label = isError ? 'Error' : 'Response';
    console.groupCollapsed(`%c[REST ${label}] %c${status} %c${url}`, `color: ${color}; font-weight: bold;`, `color: ${color};`, 'color: #6b7280; font-weight: normal;');
    console.log('Data:', data);
    console.groupEnd();
  },

  wsMessage: (direction: 'SENT' | 'RECEIVED', message: any) => {
    const color = direction === 'SENT' ? '#8b5cf6' : '#f59e0b';
    const label = `[WS ${direction}]`;
    const type = message?.type ? `: ${message.type}` : '';
    console.groupCollapsed(`%c${label}%c${type}`, `color: ${color}; font-weight: bold;`, 'color: #6b7280; font-weight: normal;');
    console.log('Payload:', message);
    console.groupEnd();
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/logger.ts
git commit -m "feat: add logger utility for structured comms logging"
```

### Task 2: Integrate Logger into REST API

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Import logger and add `request` helper**

```typescript
import { logger } from './logger';

// Inside src/lib/api.ts, replace handleResponse and use a new request helper
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  logger.restRequest(url, options);
  try {
    const response = await fetch(url, options);
    const data = await handleResponse<T>(response, url);
    return data;
  } catch (error) {
    // handleResponse already logs errors, but if fetch fails entirely (network):
    if (!(error instanceof APIError)) {
       console.error(`[REST Network Error] ${url}`, error);
    }
    throw error;
  }
}

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

  logger.restResponse(url, response.status, data);

  if (!response.ok) {
    throw new APIError(response.status, data.message || JSON.stringify(data));
  }

  return data as T;
}
```

- [ ] **Step 2: Update all `api` methods to use `request` helper**
(This is a batch update for all fetch calls in `api.ts`)

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: integrate logger into REST API layer"
```

### Task 3: Integrate Logger into WebSocket Hook

**Files:**
- Modify: `src/hooks/useWebSocket.ts`

- [ ] **Step 1: Import logger and log incoming messages**

```typescript
import { logger } from "../lib/logger";

// Inside ws.onmessage
ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    logger.wsMessage('RECEIVED', message);
    if (message.type === "state_snapshot") {
      applySnapshot(message.data as StatusSnapshot);
    }
  } catch (e) {
    console.error("Failed to parse WebSocket message", e);
    logger.wsMessage('RECEIVED', { raw: event.data, error: 'Parse failure' });
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWebSocket.ts
git commit -m "feat: log incoming WebSocket messages"
```

### Task 4: Verification

- [ ] **Step 1: Manual verification**
1. Open browser DevTools.
2. Refresh the app.
3. Observe `[WS RECEIVED]` groups for the initial snapshot.
4. Perform an action (e.g., Plug In a connector).
5. Observe `[REST Request] POST ...` and `[REST Response] 200 ...`.
6. Verify body contents are logged correctly.
