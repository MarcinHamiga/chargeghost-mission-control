import { createSignal } from "solid-js";

export interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const [toasts, setToasts] = createSignal<Toast[]>([]);
let nextId = 0;

export function addToast(type: Toast["type"], message: string, durationMs = 4000) {
  const id = nextId++;
  setToasts((prev) => [...prev, { id, type, message }]);
  setTimeout(() => dismissToast(id), durationMs);
}

export function dismissToast(id: number) {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

export { toasts };
