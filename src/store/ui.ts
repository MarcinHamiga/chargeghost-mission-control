import { createSignal } from "solid-js";

export type ViewId =
  | "operate"
  | "connectors"
  | "ocpp"
  | "faults"
  | "settings";

const ACTIVE_VIEW_KEY = "cg-active-view";
const DENSITY_KEY = "cg-density";

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  return (localStorage.getItem(key) as T) || fallback;
}

const [activeView, setActiveViewSignal] = createSignal<ViewId>(
  readStored<ViewId>(ACTIVE_VIEW_KEY, "operate"),
);
const [paletteOpen, setPaletteOpen] = createSignal(false);
const [density, setDensitySignal] = createSignal<"comfortable" | "compact">(
  readStored(DENSITY_KEY, "comfortable"),
);

export { activeView, paletteOpen, density };

export function setActiveView(view: ViewId) {
  setActiveViewSignal(view);
  try {
    localStorage.setItem(ACTIVE_VIEW_KEY, view);
  } catch {
    /* ignore */
  }
  setPaletteOpen(false);
}

export function togglePalette(open?: boolean) {
  setPaletteOpen((prev) => (open === undefined ? !prev : open));
}

export function toggleDensity() {
  setDensitySignal((prev) => {
    const next = prev === "comfortable" ? "compact" : "comfortable";
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      /* ignore */
    }
    return next;
  });
}
