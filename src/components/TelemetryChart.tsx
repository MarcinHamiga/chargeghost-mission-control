import { onMount, onCleanup, createEffect } from "solid-js";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import "chartjs-adapter-date-fns";
import {
  TIME_WINDOW_MS,
  getConnectorTelemetry,
  getRevision,
} from "../store/telemetry";

interface TelemetryChartProps {
  connectorId: number;
  label: string;
  color?: string;
}

function updateScaleWindow(chart: Chart<"line">, now: number) {
  const xScale = chart.options.scales?.x;
  if (!xScale) return;
  xScale.min = now - TIME_WINDOW_MS;
  xScale.max = now;
}

function updateYScaleMax(chart: Chart<"line">, maxValue: number) {
  const yScale = chart.options.scales?.y;
  if (!yScale) return;

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const normalized = maxValue / magnitude;
  let multiplier: number;
  if (normalized <= 1.2) multiplier = 1.2;
  else if (normalized <= 2) multiplier = 2;
  else if (normalized <= 5) multiplier = 5;
  else multiplier = 10;

  yScale.max = multiplier * magnitude;
}

function buildChartConfig(
  label: string,
  color: string,
  data: { x: number; y: number }[],
): ChartConfiguration<"line"> {
  const now = Date.now();
  return {
    type: "line",
    data: {
      datasets: [
        {
          label,
          data,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          parsing: false,
          normalized: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            stepSize: 15,
            displayFormats: {
              second: "HH:mm:ss",
            },
          },
          grid: {
            color: "#27272a",
          },
          ticks: {
            color: "#52525b",
            font: {
              family: "monospace",
              size: 10,
            },
          },
          min: now - TIME_WINDOW_MS,
          max: now,
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "#27272a",
          },
          ticks: {
            color: "#52525b",
            font: {
              family: "monospace",
              size: 10,
            },
            callback(value) {
              const n = Number(value);
              return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
    },
  };
}

export const TelemetryChart = (props: TelemetryChartProps) => {
  let canvasRef!: HTMLCanvasElement;
  let chartInstance: Chart<"line"> | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const syncChartFromStore = () => {
    if (!chartInstance) return;

    const telemetry = getConnectorTelemetry(props.connectorId);
    const history = telemetry.points;
    const now = Date.now();

    chartInstance.data.datasets[0].data = history;
    chartInstance.data.datasets[0].label = props.label;
    chartInstance.data.datasets[0].borderColor = props.color || "#3b82f6";
    updateScaleWindow(chartInstance, now);

    const maxVal = Math.max(...history.map((d) => d.y), 100);
    updateYScaleMax(chartInstance, maxVal);

    chartInstance.update("none");
  };

  onMount(() => {
    const color = props.color || "#3b82f6";
    const initialData = getConnectorTelemetry(props.connectorId).points;
    chartInstance = new Chart(
      canvasRef,
      buildChartConfig(props.label, color, initialData),
    );

    syncChartFromStore();

    intervalId = setInterval(() => {
      if (chartInstance) {
        updateScaleWindow(chartInstance, Date.now());
        chartInstance.update("none");
      }
    }, 1000);
  });

  onCleanup(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    chartInstance?.destroy();
    chartInstance = null;
  });

  createEffect(() => {
    props.connectorId;
    props.label;
    props.color;
    getRevision();
    syncChartFromStore();
  });

  const currentValueW = () => {
    getRevision();
    return getConnectorTelemetry(props.connectorId).currentValueW;
  };

  const hasSamples = () => {
    getRevision();
    return getConnectorTelemetry(props.connectorId).points.length > 0;
  };

  return (
    <div class="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 backdrop-blur-sm h-full flex flex-col">
      <div class="flex justify-between items-center mb-3">
        <div class="flex flex-col">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{props.label}</h3>
          <div class="h-1 w-8 rounded-full mt-1" style={{ "background-color": props.color || "#3b82f6" }}></div>
        </div>
        <span class="text-sm font-mono text-zinc-200">
          {hasSamples() ? `${currentValueW().toFixed(1)} W` : "---"}
        </span>
      </div>
      <div class="relative flex-1 w-full min-h-[100px]">
        <canvas ref={canvasRef} class="absolute inset-0 w-full h-full"></canvas>
      </div>
    </div>
  );
};
