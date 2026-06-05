import { For } from "solid-js";
import { toasts, dismissToast } from "../store/toast";
import { X } from "lucide-solid";
import { cn } from "../lib/cn";

export function ToastContainer() {
  return (
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <For each={toasts()}>
        {(toast) => (
          <div
            class={cn(
              "flex items-start gap-2 px-4 py-3 rounded-lg border text-xs font-medium shadow-lg backdrop-blur-sm animate-[slideIn_0.2s_ease-out]",
              toast.type === "success" && "bg-accent-teal/10 border-accent-teal/30 text-accent-teal",
              toast.type === "error" && "bg-red-500/10 border-red-500/30 text-red-400",
              toast.type === "info" && "bg-blue-500/10 border-blue-500/30 text-blue-400"
            )}
          >
            <span class="flex-1 break-words">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              class="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </For>
    </div>
  );
}
