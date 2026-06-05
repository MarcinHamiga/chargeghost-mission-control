import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { ChevronDown, Check } from "lucide-solid";
import { cn } from "../lib/cn";

export type SelectOption<T extends string | number = string> = {
  value: T;
  label: string;
};

type SelectProps<T extends string | number = string> = {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  class?: string;
  menuClass?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Select<T extends string | number = string>(props: SelectProps<T>) {
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const selectedLabel = () => {
    const opt = props.options.find((o) => o.value === props.value);
    return opt?.label ?? String(props.value);
  };

  const close = () => setOpen(false);

  const select = (value: T) => {
    props.onChange(value);
    close();
  };

  onMount(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  return (
    <div ref={containerRef!} class={cn("relative", props.class)}>
      <button
        type="button"
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={props["aria-label"]}
        onClick={() => !props.disabled && setOpen((prev) => !prev)}
        class={cn(
          "w-full flex items-center justify-between gap-2",
          "bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs text-left text-text-primary",
          "hover:border-text-muted/50 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          open() && "border-accent-teal/50 ring-1 ring-accent-teal/30",
        )}
      >
        <span class="truncate">{selectedLabel()}</span>
        <ChevronDown
          size={14}
          class={cn("shrink-0 text-text-muted transition-transform", open() && "rotate-180")}
        />
      </button>

      <Show when={open()}>
        <ul
          role="listbox"
          class={cn(
            "absolute z-50 mt-1 w-full min-w-full max-h-60 overflow-y-auto custom-scrollbar",
            "bg-bg-card border border-border-default rounded-lg shadow-xl py-1",
            props.menuClass,
          )}
        >
          <For each={props.options}>
            {(option) => {
              const isSelected = () => option.value === props.value;
              return (
                <li role="option" aria-selected={isSelected()}>
                  <button
                    type="button"
                    onClick={() => select(option.value)}
                    class={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left",
                      "hover:bg-white/5 transition-colors",
                      isSelected()
                        ? "bg-accent-teal/10 text-accent-teal"
                        : "text-text-primary",
                    )}
                  >
                    <span class="truncate">{option.label}</span>
                    <Show when={isSelected()}>
                      <Check size={12} class="shrink-0 text-accent-teal" />
                    </Show>
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
}
