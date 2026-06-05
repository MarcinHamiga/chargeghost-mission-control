import { createSignal } from "solid-js";

export type ConfirmRequest = {
  message: string;
  resolve: (confirmed: boolean) => void;
};

const [pending, setPending] = createSignal<ConfirmRequest | null>(null);

export function requestConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    setPending({ message, resolve });
  });
}

export function answerConfirm(confirmed: boolean) {
  const current = pending();
  if (current) {
    current.resolve(confirmed);
    setPending(null);
  }
}

export { pending as confirmPending };
