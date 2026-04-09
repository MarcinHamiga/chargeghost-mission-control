import { onMount, onCleanup, createEffect, createSignal } from "solid-js";
import { state } from "../store/simulator";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";

interface TelemetryChartProps {
  connectorId: number;
  label: string;
  color?: string;
}

export const TelemetryChart = (props: TelemetryChartProps) => {
  let canvasRef!: HTMLCanvasElement;
  let chartInstance: Chart | null = null;
  const TIME_WINDOW_MS = 60_000; // 60 seconds
  const MAX_POINTS = 60;

  const [currentValue, setCurrentValue] = createSignal<number | null>(null);

  let history: { x: number; y: number }[] = [];
  let lastReadingWh: number | null = null;
  let lastTimestamp: number | null = null;

  onMount(() => {
    const config: any = {
      type: "line",
      data: {
        datasets: [
          {
            label: props.label,
            data: history,
            borderColor: props.color || "#3b82f6",
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0, // Disable animation to prevent lag with real-time updates
        },
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
            min: Date.now() - TIME_WINDOW_MS,
            max: Date.now(),
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
              callback: function (value: number) {
                return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
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

    chartInstance = new Chart(canvasRef, config);

    // To continuously slide the x-axis even if no new data points arrive,
    // we can use a small interval to update the chart's x-scale min/max.
    const intervalId = setInterval(() => {
      if (chartInstance) {
        const now = Date.now();
        chartInstance.options.scales.x.min = now - TIME_WINDOW_MS;
        chartInstance.options.scales.x.max = now;
        chartInstance.update('none'); // Update without animation
      }
    }, 1000);

    onCleanup(() => {
      clearInterval(intervalId);
      chartInstance?.destroy();
    });
  });

  createEffect(() => {
    const snapshot = state.snapshot;
    if (!snapshot) return;

    const connector = snapshot.connectors.find((c) => c.id === props.connectorId);
    if (!connector) return;

    const meter = snapshot.energy_meters[props.connectorId.toString()];
    let value: number;
    const now = Date.now();

    if (meter && meter.is_charging && lastReadingWh !== null && lastTimestamp !== null) {
      const dtHours = (now - lastTimestamp) / 3_600_000;
      if (dtHours > 0) {
        const dWh = meter.reading_wh - lastReadingWh;
        value = Math.max(0, dWh / dtHours);
      } else {
        value = 0;
      }
    } else if (meter && meter.is_charging) {
      value = connector.voltage * connector.current;
    } else {
      value = 0;
    }

    if (meter) {
      lastReadingWh = meter.reading_wh;
      lastTimestamp = now;
    }

    // Add new data point
    history.push({ x: now, y: value });
    setCurrentValue(value);

    // Keep only points within the window + small buffer
    const cutoff = now - TIME_WINDOW_MS - 2000;
    while (history.length > 0 && history[0].x < cutoff) {
      history.shift();
    }

    // Update the chart dataset
    if (chartInstance) {
      chartInstance.data.datasets[0].data = history;
      chartInstance.options.scales.x.min = now - TIME_WINDOW_MS;
      chartInstance.options.scales.x.max = now;

      // Adjust max Y dynamically rounded to sensible values
      const maxVal = Math.max(...history.map((d) => d.y), 100);
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
      const normalized = maxVal / magnitude;
      let multiplier;
      if (normalized <= 1.2) multiplier = 1.2;
      else if (normalized <= 2) multiplier = 2;
      else if (normalized <= 5) multiplier = 5;
      else multiplier = 10;
      chartInstance.options.scales.y.max = multiplier * magnitude;

      chartInstance.update('none');
    }
  });

  return (
    <div class="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 backdrop-blur-sm h-full flex flex-col">
      <div class="flex justify-between items-center mb-3">
        <div class="flex flex-col">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{props.label}</h3>
          <div class="h-1 w-8 rounded-full mt-1" style={{ "background-color": props.color || "#3b82f6" }}></div>
        </div>
        <span class="text-sm font-mono text-zinc-200">
          {currentValue() !== null ? `${currentValue()!.toFixed(1)} W` : "---"}
        </span>
      </div>
      <div class="relative flex-1 w-full min-h-[100px]">
        <canvas ref={canvasRef} class="absolute inset-0 w-full h-full"></canvas>
      </div>
    </div>
  );
};
