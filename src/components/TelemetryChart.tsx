import { createMemo, createEffect, createSignal, For, onCleanup } from "solid-js";
import { state } from "../store/simulator";

interface TelemetryChartProps {
  connectorId: number;
  label: string;
  color?: string;
}

export const TelemetryChart = (props: TelemetryChartProps) => {
  const [history, setHistory] = createSignal<number[]>([]);
  const MAX_POINTS = 40;

  createEffect(() => {
    const snapshot = state.snapshot;
    if (!snapshot) return;

    const connector = snapshot.connectors.find((c) => c.id === props.connectorId);
    if (!connector) return;

    // We'll track active power (W) = voltage * current
    const value = connector.voltage * connector.current;

    setHistory((prev) => {
      const next = [...prev, value];
      if (next.length > MAX_POINTS) {
        return next.slice(next.length - MAX_POINTS);
      }
      return next;
    });
  });

  const pathData = createMemo(() => {
    const data = history();
    if (data.length < 2) return "";

    const width = 300;
    const height = 100;
    const max = Math.max(...data, 1); // Avoid division by zero
    const min = 0; // Baseline at 0

    const points = data.map((v, i) => {
      const x = (i / (MAX_POINTS - 1)) * width;
      const y = height - ((v - min) / (max - min)) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  });

  const gridLines = [25, 50, 75];

  return (
    <div class="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 backdrop-blur-sm">
      <div class="flex justify-between items-center mb-3">
        <div class="flex flex-col">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{props.label}</h3>
          <div class="h-1 w-8 rounded-full mt-1" style={{ "background-color": props.color || "#3b82f6" }}></div>
        </div>
        <span class="text-sm font-mono text-zinc-200">
          {history().length > 0 ? `${history()[history().length - 1].toFixed(1)} W` : "---"}
        </span>
      </div>
      <div class="relative h-24 w-full">
        <svg
          viewBox="0 0 300 100"
          preserveAspectRatio="none"
          class="w-full h-full"
        >
          {/* Horizontal Grid lines */}
          <For each={gridLines}>
            {(y) => (
              <line x1="0" y1={y} x2="300" y2={y} stroke="#27272a" stroke-width="0.5" />
            )}
          </For>
          
          {/* Vertical Grid lines (time) */}
          <For each={[75, 150, 225]}>
            {(x) => (
              <line x1={x} y1="0" x2={x} y2="100" stroke="#27272a" stroke-width="0.5" />
            )}
          </For>

          <path
            d={pathData()}
            fill="none"
            stroke={props.color || "#3b82f6"}
            stroke-width="2"
            stroke-linejoin="round"
            class="transition-all duration-1000 ease-linear"
          />
        </svg>
      </div>
    </div>
  );
};
