/** Proportional Gantt chart built from absolutely positioned divs. */

import type { SimulateResponse } from "../types";

const PALETTE = [
  "#1d4ed8",
  "#047857",
  "#b45309",
  "#6d28d9",
  "#b91c1c",
  "#0e7490",
  "#4d7c0f",
  "#be185d",
  "#4338ca",
  "#a16207",
];

function stableColor(pid: string): string {
  let hash = 0;
  for (const character of pid) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

interface GanttChartProps {
  result: SimulateResponse;
}

/** Render the CPU timeline, including idle gaps, with proportional widths. */
export default function GanttChart({ result }: GanttChartProps) {
  const total = Math.max(result.total_time, 1);
  const minWidth = Math.max(560, result.gantt.length * 96);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Gantt chart</h2>
      <p className="mt-1 text-sm text-slate-500">
        Segment widths are proportional to their duration. Idle gaps appear as hatched
        blocks.
      </p>

      <div className="mt-4 overflow-x-auto">
        <div style={{ minWidth: `${minWidth}px` }}>
          <div className="relative h-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
            {result.gantt.map((segment, index) => {
              const idle = segment.pid === "IDLE";
              const left = (segment.start / total) * 100;
              const width = ((segment.end - segment.start) / total) * 100;

              return (
                <div
                  key={`${segment.pid}-${segment.start}-${index}`}
                  title={`${idle ? "Idle" : segment.pid}: ${segment.start} -> ${segment.end}`}
                  className={`absolute inset-y-0 flex items-center justify-center overflow-hidden border-r border-white/70 text-sm font-semibold ${
                    idle ? "hatch-idle text-slate-700" : "text-white"
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: idle ? undefined : stableColor(segment.pid),
                  }}
                >
                  <span className="truncate px-1">{idle ? "Idle" : segment.pid}</span>
                </div>
              );
            })}
          </div>

          <div className="relative mt-2 h-5 text-xs text-slate-500">
            {result.gantt.map((segment, index) => (
              <span
                key={`start-${segment.pid}-${segment.start}-${index}`}
                className="absolute top-0"
                style={{ left: `${(segment.start / total) * 100}%` }}
              >
                {segment.start}
              </span>
            ))}
            <span className="absolute right-0 top-0 font-medium text-slate-700">
              {result.total_time}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
