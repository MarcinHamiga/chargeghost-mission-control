import { Show } from "solid-js";
import { answerConfirm, confirmPending } from "../store/confirm";
import { cn } from "../lib/cn";

export function ConfirmDialog() {
  return (
    <Show when={confirmPending()}>
      {(request) => (
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            class="absolute inset-0 bg-bg-main/80 backdrop-blur-sm"
            aria-label="Cancel"
            onClick={() => answerConfirm(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            class="relative glass-card p-6 max-w-md w-full shadow-xl"
          >
            <h2 id="confirm-dialog-title" class="text-sm font-bold mb-2">
              Confirm action
            </h2>
            <p class="text-xs text-text-secondary mb-6">{request().message}</p>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => answerConfirm(false)}
                class={cn(
                  "px-4 py-2 rounded-lg border border-border-default text-xs",
                  "hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-accent-teal/50",
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => answerConfirm(true)}
                class={cn(
                  "px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold",
                  "hover:bg-red-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50",
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}
