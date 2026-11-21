/** Per-process timing metrics in input order, grouped by input and computed values. */

import type { SimulateResponse } from "../types";
import { processColor } from "../utils/colors";

const INPUT_COLUMNS = ["PID", "Arrival", "Burst", "Priority"];
const COMPUTED_COLUMNS = ["Completion", "Turnaround", "Waiting", "Response"];

interface ResultsTableProps {
  result: SimulateResponse;
}

/** Render one row per process with grouped columns and colour-coded PIDs. */
export default function ResultsTable({ result }: ResultsTableProps) {
  return (
    <section
      aria-labelledby="results-table-heading"
      className="rounded-[14px] border border-line-soft bg-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pb-3 pt-4 sm:px-5">
        <h2 id="results-table-heading" className="text-sm font-semibold text-ink">
          Results by process
        </h2>
        <p className="text-[11px] text-faint">Rows stay in input order, not execution order.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-y border-line-soft bg-raised/60 text-[11px] uppercase tracking-wide text-faint">
              <th scope="colgroup" colSpan={4} className="px-4 py-1.5 text-left font-medium sm:px-5">
                Input
              </th>
              <th
                scope="colgroup"
                colSpan={4}
                className="border-l-2 border-line-strong px-4 py-1.5 text-right font-medium sm:px-5"
              >
                Computed
              </th>
            </tr>
            <tr className="border-b border-line-soft text-[11px] text-muted">
              {INPUT_COLUMNS.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`whitespace-nowrap py-2 font-medium ${
                    index === 0
                      ? "px-4 text-left sm:px-5"
                      : index === 3
                        ? "pl-3 pr-4 text-right sm:pr-5"
                        : "px-3 text-right"
                  }`}
                >
                  {column}
                </th>
              ))}
              {COMPUTED_COLUMNS.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`whitespace-nowrap py-2 font-medium ${
                    index === 0
                      ? "border-l-2 border-line-strong pl-4 pr-3 text-right sm:pl-5"
                      : index === COMPUTED_COLUMNS.length - 1
                        ? "pl-3 pr-4 text-right sm:pr-5"
                        : "px-3 text-right"
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft/70">
            {result.results.map((item, index) => (
              <tr key={item.pid} className="transition-colors hover:bg-raised/40">
                <th scope="row" className="px-4 py-2 text-left font-medium text-ink sm:px-5">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: processColor(index) }}
                    />
                    {item.pid}
                  </span>
                </th>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{item.arrival}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{item.burst}</td>
                <td className="py-2 pl-3 pr-4 text-right tabular-nums text-faint sm:pr-5">
                  {item.priority}
                </td>
                <td className="border-l-2 border-line-strong py-2 pl-4 pr-3 text-right tabular-nums text-ink sm:pl-5">
                  {item.completion}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{item.turnaround}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{item.waiting}</td>
                <td className="py-2 pl-3 pr-4 text-right tabular-nums text-muted sm:pr-5">
                  {item.response}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-4 py-3 text-[11px] text-faint sm:px-5">
        Response equals waiting for both algorithms because neither one preempts a running
        process.
      </p>
    </section>
  );
}
