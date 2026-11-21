/** Compact process table with a count stepper and per-row controls. */

import type { ApiErrorItem, ProcessRow } from "../types";
import { processColor } from "../utils/colors";

type ProcessField = keyof ProcessRow;

const MIN_PROCESSES = 1;
const MAX_PROCESSES = 100;

const FIELD_LABELS: Record<string, string> = {
  pid: "Process ID",
  arrival: "Arrival time",
  burst: "Burst time",
  priority: "Priority",
};

interface CellProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  inputMode: "text" | "numeric";
  errors: string[];
  describedBy?: string;
  disabled: boolean;
  dimmed?: boolean;
  onChange: (value: string) => void;
}

function Cell({
  id,
  label,
  value,
  placeholder,
  inputMode,
  errors,
  describedBy,
  disabled,
  dimmed = false,
  onChange,
}: CellProps) {
  const hasError = errors.length > 0;

  return (
    <input
      id={id}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      disabled={disabled}
      aria-invalid={hasError}
      aria-describedby={hasError ? describedBy : undefined}
      onChange={(event) => onChange(event.target.value)}
      className={`h-9 w-full min-w-0 rounded-lg border bg-field px-2 text-sm tabular-nums outline-none transition-colors placeholder:text-faint/70 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        hasError
          ? "border-error/80 text-ink focus:border-error focus:ring-error/25"
          : dimmed
            ? "border-dashed border-line-strong text-faint focus:border-line-strong focus:ring-primary/20"
            : "border-line-soft text-ink focus:border-primary/70 focus:ring-primary/20"
      }`}
    />
  );
}

interface StepperProps {
  count: number;
  disabled: boolean;
  onChange: (count: number) => void;
}

function Stepper({ count, disabled, onChange }: StepperProps) {
  const stepClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-line-soft bg-field text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Remove one process"
        disabled={disabled || count <= MIN_PROCESSES}
        onClick={() => onChange(count - 1)}
        className={stepClass}
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span className="min-w-5 text-center text-sm font-medium tabular-nums text-ink">
        {count}
      </span>
      <button
        type="button"
        aria-label="Add one process"
        disabled={disabled || count >= MAX_PROCESSES}
        onClick={() => onChange(count + 1)}
        className={stepClass}
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <path
            d="M6 2v8M2 6h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

interface ProcessFormProps {
  rows: ProcessRow[];
  errors: ApiErrorItem[];
  disabled: boolean;
  onChange: (index: number, field: ProcessField, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onCountChange: (count: number) => void;
}

/** Render one editable table row per process, plus add, remove, and count controls. */
export default function ProcessForm({
  rows,
  errors,
  disabled,
  onChange,
  onAdd,
  onRemove,
  onCountChange,
}: ProcessFormProps) {
  const messagesFor = (row: number, field: ProcessField | null): string[] =>
    errors
      .filter((error) => error.row === row && error.field === field)
      .map((error) => error.message);

  const fields: Array<{
    field: ProcessField;
    placeholder: string;
    inputMode: "text" | "numeric";
    dimmed?: boolean;
  }> = [
    { field: "pid", placeholder: "P", inputMode: "text" },
    { field: "arrival", placeholder: "0", inputMode: "numeric" },
    { field: "burst", placeholder: "1", inputMode: "numeric" },
    { field: "priority", placeholder: "0", inputMode: "numeric", dimmed: true },
  ];

  return (
    <section aria-labelledby="processes-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 id="processes-heading" className="text-sm font-semibold text-ink">
            Processes
          </h2>
          <p className="mt-0.5 text-xs text-faint">
            Priority is reserved and not used by FCFS or SJF.
          </p>
        </div>
        <Stepper count={rows.length} disabled={disabled} onChange={onCountChange} />
      </div>

      <div className="grid grid-cols-[8px_minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_26px] items-center gap-x-1.5 px-0.5">
        <span aria-hidden="true" />
        {["PID", "Arrival", "Burst", "Priority"].map((label) => (
          <span key={label} className="text-[11px] font-medium uppercase tracking-wide text-faint">
            {label}
          </span>
        ))}
        <span aria-hidden="true" />

        {rows.map((row, index) => {
          const rowNumber = index + 1;
          const rowErrorId = `row-${index}-error`;
          const rowMessages = fields.flatMap(({ field }) => messagesFor(rowNumber, field));
          const extraMessages = messagesFor(rowNumber, null);
          const messages = [...rowMessages, ...extraMessages];

          return (
            <div key={index} className="contents">
              <span
                aria-hidden="true"
                className="h-2 w-2 justify-self-center rounded-full"
                style={{ backgroundColor: processColor(index) }}
              />

              {fields.map(({ field, placeholder, inputMode, dimmed }) => (
                <Cell
                  key={field}
                  id={`${field}-${index}`}
                  label={`${FIELD_LABELS[field]} for process ${rowNumber}`}
                  value={row[field]}
                  placeholder={field === "pid" ? `${placeholder}${rowNumber}` : placeholder}
                  inputMode={inputMode}
                  errors={messagesFor(rowNumber, field)}
                  describedBy={rowErrorId}
                  disabled={disabled}
                  dimmed={dimmed}
                  onChange={(value) => onChange(index, field, value)}
                />
              ))}

              <button
                type="button"
                aria-label={`Remove process ${rowNumber}`}
                disabled={disabled || rows.length <= MIN_PROCESSES}
                onClick={() => onRemove(index)}
                className="flex h-7 w-7 items-center justify-center justify-self-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {messages.length > 0 && (
                <p
                  id={rowErrorId}
                  role="alert"
                  className="col-span-6 pb-1 text-xs leading-snug text-error"
                >
                  Row {rowNumber}: {messages.join(" ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || rows.length >= MAX_PROCESSES}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-xs font-medium text-muted transition-colors hover:border-primary/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <path
            d="M6 2v8M2 6h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Add process
      </button>
    </section>
  );
}
