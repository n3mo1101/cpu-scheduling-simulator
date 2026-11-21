/** Proportional Gantt chart with a legend, time axis, and interval readout. */

import { useState } from "react";
import type { GanttSegment, SimulateResponse } from "../types";
import { processColor } from "../utils/colors";

interface GanttChartProps {
  result: SimulateResponse;
}

interface Block {
  segment: GanttSegment;
  index: number;
  color: string | null;
  duration: number;
}

const MIN_BLOCK_WIDTH = 44;

function describe(segment: GanttSegment): string {
  if (segment.pid === "IDLE") {
    return `Idle from ${segment.start} to ${segment.end} (${segment.end - segment.start} units)`;
  }
  return `${segment.pid} ran from ${segment.start} to ${segment.end} (${
    segment.end - segment.start
  } units)`;
}

/** Render the CPU timeline with proportional blocks and idle gaps. */
export default function GanttChart({ result }: GanttChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const order = new Map(result.results.map((item, index) => [item.pid, index]));

  const blocks: Block[] = result.gantt.map((segment, index) => ({
    segment,
    index,
    color: segment.pid === "IDLE" ? null : processColor(order.get(segment.pid) ?? 0),
    duration: Math.max(segment.end - segment.start, 1),
  }));

  const active = activeIndex === null ? null : result.gantt[activeIndex] ?? null;

  const legend = result.results.map((item, index) => ({
    key: item.pid,
    label: item.pid,
    color: processColor(index),
  }));

  return (
    <section
      aria-labelledby="gantt-heading"
      className="rounded-[14px] border border-line-soft bg-panel p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="gantt-heading" className="text-sm font-semibold text-ink">
            Gantt chart
          </h2>
          <p className="mt-0.5 text-xs text-faint">
            CPU timeline, proportional to each interval.
          </p>
        </div>

        <ul aria-label="Process legend" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legend.map((entry) => (
            <li key={entry.key} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-[11px] text-muted">
            <span aria-hidden="true" className="hatch-idle h-2 w-2 rounded-[2px]" />
            Idle
          </li>
        </ul>
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-xs tabular-nums text-muted">
        {active ? (
          describe(active)
        ) : (
          <span className="text-faint">Hover a block to see its interval.</span>
        )}
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-full">
          <div className="flex h-12 overflow-hidden rounded-lg ring-1 ring-line-soft">
            {blocks.map((block) => {
              const { segment } = block;
              const idle = block.color === null;

              return (
                <button
                  key={`${segment.pid}-${segment.start}-${block.index}`}
                  type="button"
                  aria-label={describe(segment)}
                  onMouseEnter={() => setActiveIndex(block.index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(block.index)}
                  onBlur={() => setActiveIndex(null)}
                  className={`flex h-full items-center justify-center overflow-hidden border-r border-panel/80 text-xs font-medium transition-[filter] last:border-r-0 hover:brightness-110 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 ${
                    idle ? "hatch-idle text-muted" : "text-[#05070a]"
                  }`}
                  style={{
                    flexGrow: block.duration,
                    flexBasis: 0,
                    minWidth: `${MIN_BLOCK_WIDTH}px`,
                    backgroundColor: block.color ?? undefined,
                  }}
                >
                  <span className="truncate px-1.5">{idle ? "Idle" : segment.pid}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 flex h-5">
            {blocks.map((block, index) => (
              <div
                key={`axis-${block.segment.pid}-${block.segment.start}-${block.index}`}
                className="relative"
                style={{
                  flexGrow: block.duration,
                  flexBasis: 0,
                  minWidth: `${MIN_BLOCK_WIDTH}px`,
                }}
              >
                {index === 0 && (
                  <span className="absolute left-0 top-0 text-[10px] tabular-nums text-faint">
                    0
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-1.5 w-px bg-line-strong"
                />
                <span className="absolute right-0 top-0 pr-1 text-[10px] tabular-nums text-faint">
                  {block.segment.end}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
