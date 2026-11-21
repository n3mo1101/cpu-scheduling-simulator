/** Segmented algorithm picker with a description of the selected policy. */

import type { Algorithm } from "../types";

const OPTIONS: Array<{ value: Algorithm; label: string }> = [
  { value: "fcfs", label: "FCFS" },
  { value: "sjf", label: "SJF" },
];

const DESCRIPTIONS: Record<Algorithm, string> = {
  fcfs: "Runs each process in arrival order, first come, first served.",
  sjf: "Runs the shortest available job next, without preemption.",
};

interface AlgorithmSelectProps {
  algorithm: Algorithm;
  error: string | null;
  disabled: boolean;
  onChange: (algorithm: Algorithm) => void;
}

/** Choose the scheduling algorithm from a two-option segmented control. */
export default function AlgorithmSelect({
  algorithm,
  error,
  disabled,
  onChange,
}: AlgorithmSelectProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span id="algorithm-label" className="text-xs font-medium text-muted">
          Algorithm
        </span>
        {error && (
          <span id="algorithm-error" className="text-xs text-error">
            {error}
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby="algorithm-label"
        className="flex gap-1 rounded-[10px] border border-line-soft bg-field p-1"
      >
        {OPTIONS.map((option) => {
          const selected = option.value === algorithm;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "bg-raised text-ink shadow-[inset_0_0_0_1px_#30363D]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-faint">{DESCRIPTIONS[algorithm]}</p>
    </div>
  );
}
