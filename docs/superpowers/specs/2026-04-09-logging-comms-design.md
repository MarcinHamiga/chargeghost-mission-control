# Design: Communication Logging (REST & WebSocket)

Add detailed, structured logging of communications between the frontend and the sidecar to improve developer experience and debugging of API interactions.

## 1. Objectives
- Centralize all communication logging in a dedicated utility.
- Log every REST request (URL, method, headers, body).
- Log every REST response (status code, body, errors).
- Log incoming and outgoing WebSocket messages with payload inspection.
- Use structured browser DevTools logging (`console.groupCollapsed`) to keep the console clean but informative.

## 2. Architecture

### 2.1 Logger Utility (`src/lib/logger.ts`)
A new singleton utility responsible for all logging output.
- **Methods:**
  - `restRequest(url: string, options?: RequestInit)`: Logs initiating fetch requests.
  - `restResponse(url: string, status: number, data: any)`: Logs successful or error responses.
  - `wsMessage(direction: 'SENT' | 'RECEIVED', message: any)`: Logs WebSocket frames.

### 2.2 API Layer Updates (`src/lib/api.ts`)
- The `api` object's internal helper `handleResponse` will be updated to call `logger.restResponse`.
- Every `fetch` call will be prefaced with a call to `logger.restRequest`.
- To avoid duplication, `fetch` calls should be wrapped in a small private helper `request<T>(...)`.

### 2.3 WebSocket Hook Updates (`src/hooks/useWebSocket.ts`)
- In the `onmessage` handler, incoming data will be logged via `logger.wsMessage('RECEIVED', ...)`.
- Any future outgoing messages will also be logged via `logger.wsMessage('SENT', ...)`.

## 3. Data Flow

### REST Flow:
1. `api.getConnectors()` called.
2. `logger.restRequest()` logs intent.
3. `fetch()` performs request.
4. `handleResponse()` receives result.
5. `logger.restResponse()` logs status and payload.
6. Original caller receives data.

### WebSocket Flow:
1. Sidecar sends message.
2. `ws.onmessage` triggered in `useWebSocket`.
3. `logger.wsMessage('RECEIVED', ...)` logs the parsed message.
4. `applySnapshot()` updates the UI state.

## 4. Error Handling
- Errors in `api.ts` (e.g., non-2xx status codes or fetch failures) must be logged by the `logger` with a clear indication of failure.
- Malformed JSON in WebSocket messages must log the raw string if parsing fails.

## 5. Testing
- Manual verification in the browser DevTools console while interacting with the application.
- Verify that request bodies are visible for POST/PUT requests.
- Verify that error responses include the error message/body.
