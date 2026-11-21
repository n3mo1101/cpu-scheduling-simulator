/** Single metrics strip with the three aggregate CPU numbers. */

import type { SimulateResponse } from "../types";

interface MetricsCardsProps {
  result: SimulateResponse;
}

/** Show average waiting, average turnaround, and total time in one strip. */
export default function MetricsCards({ result }: MetricsCardsProps) {
  const cells = [
    {
      label: "Avg waiting",
      value: result.averages.waiting.toFixed(2),
      caption: "Σ waiting ÷ processes",
      shortCaption: "Σ wait ÷ n",
    },
    {
      label: "Avg turnaround",
      value: result.averages.turnaround.toFixed(2),
      caption: "Σ turnaround ÷ processes",
      shortCaption: "Σ turn ÷ n",
    },
    {
      label: "Total time",
      value: String(result.total_time),
      caption: "End of last segment",
      shortCaption: "End of timeline",
    },
  ];

  return (
    <section
      aria-label="CPU metrics"
      className="grid grid-cols-3 divide-x divide-line-soft rounded-[14px] border border-line-soft bg-panel"
    >
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0 px-3 py-4 sm:px-5">
          <p className="mt-1 truncate text-[11px] font-medium text-muted sm:text-xs">{cell.label}</p>
          <p className="display-type mt-1 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
            {cell.value}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-faint sm:text-[11px]">
            <span className="sm:hidden">{cell.shortCaption}</span>
            <span className="hidden sm:inline">{cell.caption}</span>
          </p>
        </div>
      ))}
    </section>
  );
}
