import { splitProps, Show, type JSX } from "solid-js";
import { cn } from "../../lib/cn";
import { Kbd } from "./Kbd";

type Variant = "primary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Optional keyboard-accelerator hint rendered on the trailing edge. */
  kbd?: string;
  /** Leading icon element. */
  icon?: JSX.Element;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-linear-to-b from-accent-teal to-[#00d9ad] text-[#042a24] border-[#00e6b8] hover:brightness-105 shadow-[0_6px_20px_-8px_rgba(0,255,204,0.5)]",
  ghost:
    "bg-surface-1 border-border-default text-text-secondary hover:text-text-primary hover:bg-white/5",
  subtle:
    "bg-surface-3 border-border-bright text-text-primary hover:bg-surface-4",
  danger:
    "bg-critical/6 border-critical/28 text-critical hover:bg-critical/12",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-2 rounded-lg",
  md: "px-3.5 py-2.5 text-[13px] gap-2.5 rounded-[9px]",
};

/** Shared button primitive — replaces the repeated ad-hoc className strings. */
export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "kbd",
    "icon",
    "class",
    "children",
  ]);
  const variant = () => local.variant ?? "ghost";
  return (
    <button
      {...rest}
      class={cn(
        "inline-flex items-center font-semibold border transition-all whitespace-nowrap",
        "disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none",
        SIZES[local.size ?? "md"],
        VARIANTS[variant()],
        local.class,
      )}
    >
      <Show when={local.icon}>
        <span class="shrink-0 flex items-center">{local.icon}</span>
      </Show>
      <span class="flex-1 text-left">{local.children}</span>
      <Show when={local.kbd}>
        <Kbd onColor={variant() === "primary"}>{local.kbd}</Kbd>
      </Show>
    </button>
  );
}
