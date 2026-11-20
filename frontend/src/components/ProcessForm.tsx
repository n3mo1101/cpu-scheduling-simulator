/** Process count and the editable process rows. */

import type { ApiErrorItem, ProcessRow } from "../types";

type ProcessField = keyof ProcessRow;

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  type: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  errors: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}

function InputField({
  id,
  label,
  value,
  type,
  min,
  max,
  step,
  placeholder,
  errors,
  disabled,
  onChange,
}: InputFieldProps) {
  const hasError = errors.length > 0;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-md border px-2.5 py-2 text-sm shadow-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
          hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
        }`}
      />
      {hasError && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

interface ProcessFormProps {
  rows: ProcessRow[];
  errors: ApiErrorItem[];
  disabled: boolean;
  onChange: (index: number, field: ProcessField, value: string) => void;
}

/** Render one labelled, editable card per process. */
export default function ProcessForm({ rows, errors, disabled, onChange }: ProcessFormProps) {
  const messagesFor = (row: number, field: ProcessField | null): string[] =>
    errors
      .filter((error) => error.row === row && error.field === field)
      .map((error) => error.message);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Processes</h2>
        <p className="text-xs text-slate-500">
          Priority is reserved and is not used by FCFS or SJF.
        </p>
      </div>

      {rows.map((row, index) => {
        const rowNumber = index + 1;
        const rowErrors = messagesFor(rowNumber, null);

        return (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {rowNumber}
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Process {rowNumber}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InputField
                id={`pid-${index}`}
                label="Process ID"
                value={row.pid}
                type="text"
                placeholder={`P${rowNumber}`}
                errors={messagesFor(rowNumber, "pid")}
                disabled={disabled}
                onChange={(value) => onChange(index, "pid", value)}
              />
              <InputField
                id={`arrival-${index}`}
                label="Arrival time"
                value={row.arrival}
                type="number"
                min={0}
                step={1}
                placeholder="0"
                errors={messagesFor(rowNumber, "arrival")}
                disabled={disabled}
                onChange={(value) => onChange(index, "arrival", value)}
              />
              <InputField
                id={`burst-${index}`}
                label="Burst time"
                value={row.burst}
                type="number"
                min={1}
                step={1}
                placeholder="1"
                errors={messagesFor(rowNumber, "burst")}
                disabled={disabled}
                onChange={(value) => onChange(index, "burst", value)}
              />
              <InputField
                id={`priority-${index}`}
                label="Priority (reserved, not used by FCFS/SJF)"
                value={row.priority}
                type="number"
                min={0}
                step={1}
                placeholder="0"
                errors={messagesFor(rowNumber, "priority")}
                disabled={disabled}
                onChange={(value) => onChange(index, "priority", value)}
              />
            </div>

            {rowErrors.length > 0 && (
              <p className="mt-2 text-xs text-red-700">{rowErrors.join(" ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
