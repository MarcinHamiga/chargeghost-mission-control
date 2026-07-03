import { onCleanup, onMount } from "solid-js";
import { NAV_ITEMS } from "../components/nav";
import {
  setActiveView,
  togglePalette,
  paletteOpen,
  toggleCheatSheet,
  cheatSheetOpen,
} from "../store/ui";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Global keyboard shortcuts:
 *   ⌘K / Ctrl-K  — command palette
 *   ⌘1…⌘5        — jump to view
 *   ?            — keyboard shortcut cheat-sheet
 *   Esc          — close the palette / cheat-sheet
 * View-local single-key actions (P/S/U) are owned by the Operate stage.
 */
export function useHotkeys() {
  const onKey = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      togglePalette();
      return;
    }

    if (e.key === "Escape") {
      if (cheatSheetOpen()) {
        toggleCheatSheet(false);
        return;
      }
      if (paletteOpen()) {
        togglePalette(false);
        return;
      }
    }

    // "?" (Shift+/) toggles the shortcut cheat-sheet — but not while typing.
    if (e.key === "?" && !mod && !isTypingTarget(e.target)) {
      e.preventDefault();
      toggleCheatSheet();
      return;
    }

    if (mod && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
      const item = NAV_ITEMS.find((n) => n.shortcut === Number(e.key));
      if (item) {
        e.preventDefault();
        setActiveView(item.id);
      }
      return;
    }

    // Leave everything else (including plain typing) untouched.
  };

  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => window.removeEventListener("keydown", onKey));
}
