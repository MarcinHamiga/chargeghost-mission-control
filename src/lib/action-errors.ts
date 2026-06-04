import { APIError, authRejectedMessage } from "./http";

export function formatActionError(actionName: string, error: unknown): string {
  if (error instanceof APIError) {
    if (error.status === 403) {
      if (actionName === "startSession") return authRejectedMessage("session");
      if (actionName === "start") return authRejectedMessage("charging");
    }
    if (error.status === 409) return error.message;
    if (error.status === 503) return error.message;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function actionSuccessToast(actionName: string, response?: { message?: string }): string {
  if (response?.message) return response.message;
  return `${actionName} succeeded`;
}
