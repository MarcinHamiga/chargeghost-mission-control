import {
  Zap,
  Cpu,
  Terminal,
  ShieldAlert,
  Settings,
  type LucideProps,
} from "lucide-solid";
import type { Component } from "solid-js";
import type { ViewId } from "../store/ui";

export interface NavItem {
  id: ViewId;
  label: string;
  /** 1-based index → ⌘{n} accelerator. */
  shortcut: number;
  icon: Component<LucideProps>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "operate", label: "Operate", shortcut: 1, icon: Zap },
  { id: "connectors", label: "Connectors", shortcut: 2, icon: Cpu },
  { id: "ocpp", label: "OCPP Timeline", shortcut: 3, icon: Terminal },
  { id: "faults", label: "Fault Lab", shortcut: 4, icon: ShieldAlert },
  { id: "settings", label: "Settings", shortcut: 5, icon: Settings },
];
