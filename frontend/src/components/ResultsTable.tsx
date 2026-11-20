/** Per-process timing metrics in input order. */

import type { SimulateResponse } from "../types";

const COLUMNS = [
  "PID",
  "Arrival",
  "Burst",
  "Completion",
  "Turnaround",
  "Waiting",
  "Response",
];

interface ResultsTableProps {
  result: SimulateResponse;
}

/** Render one row per process, in the original input order. */
export default function ResultsTable({ result }: ResultsTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Results by process</h2>
      <p className="mt-1 text-sm text-slate-500">
        Rows stay in the original input order, not the execution order.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.results.map((item) => (
              <tr key={item.pid} className="odd:bg-white even:bg-slate-50/60">
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-900">
                  {item.pid}
                </th>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.arrival}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.burst}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.completion}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.turnaround}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.waiting}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
