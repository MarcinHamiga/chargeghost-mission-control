import { createSignal, For, Show, onMount, onCleanup, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
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

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function Select<T extends string | number = string>(props: SelectProps<T>) {
  const [open, setOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal<MenuPosition | null>(null);
  let containerRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLUListElement | undefined;

  const updateMenuPosition = () => {
    if (!buttonRef) return;
    const rect = buttonRef.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const selectedLabel = () => {
    const opt = props.options.find((o) => o.value === props.value);
    return opt?.label ?? String(props.value);
  };

  const close = () => setOpen(false);

  const select = (value: T) => {
    props.onChange(value);
    close();
  };

  createEffect(() => {
    if (!open()) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    const reposition = () => updateMenuPosition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    onCleanup(() => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    });
  });

  onMount(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef?.contains(target) || menuRef?.contains(target)) return;
      close();
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
        ref={buttonRef!}
        type="button"
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={props["aria-label"]}
        onClick={() => {
          if (props.disabled) return;
          if (open()) {
            close();
            return;
          }
          updateMenuPosition();
          setOpen(true);
        }}
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

      <Show when={open() && menuPosition()}>
        {(position) => (
          <Portal>
            <ul
              ref={menuRef!}
              role="listbox"
              style={{
                top: `${position().top}px`,
                left: `${position().left}px`,
                width: `${position().width}px`,
              }}
              class={cn(
                "fixed z-50 max-h-60 overflow-y-auto custom-scrollbar",
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
          </Portal>
        )}
      </Show>
    </div>
  );
}
