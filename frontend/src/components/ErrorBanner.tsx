/** Dark summary banner for backend validation, network, and notice messages. */

import { NETWORK_ERROR_MESSAGE } from "../api/client";
import type { ApiErrorItem } from "../types";

const FIELD_LABELS: Record<string, string> = {
  pid: "Process ID",
  arrival: "Arrival time",
  burst: "Burst time",
  priority: "Priority",
  algorithm: "Algorithm",
  processes: "Processes",
};

function describe(error: ApiErrorItem): string {
  if (error.row === null) {
    return error.message;
  }
  if (!error.field) {
    return `Row ${error.row}: ${error.message}`;
  }
  return `Row ${error.row} (${FIELD_LABELS[error.field] ?? error.field}): ${error.message}`;
}

interface ErrorBannerProps {
  errors: ApiErrorItem[];
  notice: string | null;
}

/** Render a success notice and/or a summary of problems above the results. */
export default function ErrorBanner({ errors, notice }: ErrorBannerProps) {
  if (errors.length === 0 && !notice) {
    return null;
  }

  const networkOnly =
    errors.length > 0 &&
    errors.every((error) => error.row === null && error.message === NETWORK_ERROR_MESSAGE);

  const title = networkOnly
    ? "Server unreachable"
    : errors.length === 1
      ? "1 problem to fix"
      : `${errors.length} problems to fix`;

  return (
    <div className="space-y-3" aria-live="polite">
      {notice && (
        <div
          role="status"
          className="rounded-[10px] border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success"
        >
          {notice}
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          className={`rounded-[10px] border px-4 py-3 text-sm ${
            networkOnly
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-error/40 bg-error/10 text-error"
          }`}
        >
          <p className="flex items-center gap-2 font-medium">
            <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 4.75v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.8" fill="currentColor" />
            </svg>
            {title}
          </p>

          {networkOnly ? (
            <p className="mt-1.5 pl-6 text-xs leading-relaxed opacity-90">
              {errors[0]?.message}
            </p>
          ) : (
            <ul className="mt-2 space-y-1 pl-6 text-xs leading-relaxed">
              {errors.map((error, index) => (
                <li key={`${error.row ?? "request"}-${error.field ?? "row"}-${index}`}>
                  {describe(error)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
