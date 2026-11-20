/** Average waiting/turnaround and total time cards. */

import type { SimulateResponse } from "../types";

interface MetricsCardsProps {
  result: SimulateResponse;
}

/** Show the aggregate CPU metrics for a completed simulation. */
export default function MetricsCards({ result }: MetricsCardsProps) {
  const cards = [
    {
      label: "Average waiting time",
      value: result.averages.waiting.toFixed(2),
      detail: "Mean time processes spent waiting.",
    },
    {
      label: "Average turnaround time",
      value: result.averages.turnaround.toFixed(2),
      detail: "Mean time from arrival to completion.",
    },
    {
      label: "Total time",
      value: String(result.total_time),
      detail: "End of the final CPU segment.",
    },
  ];

  return (
    <section aria-label="CPU metrics" className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{card.value}</p>
          <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
        </div>
      ))}
    </section>
  );
}
