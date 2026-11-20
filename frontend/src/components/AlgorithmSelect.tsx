/** Algorithm dropdown for FCFS and non-preemptive SJF. */

import type { Algorithm } from "../types";

interface AlgorithmSelectProps {
  algorithm: Algorithm;
  error: string | null;
  disabled: boolean;
  onChange: (algorithm: Algorithm) => void;
}

/** Choose the scheduling algorithm. */
export default function AlgorithmSelect({
  algorithm,
  error,
  disabled,
  onChange,
}: AlgorithmSelectProps) {
  return (
    <div>
      <label htmlFor="algorithm" className="mb-1 block text-sm font-medium text-slate-700">
        Algorithm
      </label>
      <select
        id="algorithm"
        value={algorithm}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={error ? "algorithm-error" : undefined}
        onChange={(event) => onChange(event.target.value as Algorithm)}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
        }`}
      >
        <option value="fcfs">First-Come, First-Served (FCFS)</option>
        <option value="sjf">Shortest Job First (SJF), non-preemptive</option>
      </select>
      {error && (
        <p id="algorithm-error" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
