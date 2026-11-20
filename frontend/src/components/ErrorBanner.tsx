/** Summary banner for validation, network, upload, and success messages. */

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
  const location =
    error.row === null
      ? ""
      : error.field
        ? `Row ${error.row} (${FIELD_LABELS[error.field] ?? error.field})`
        : `Row ${error.row}`;

  return location ? `${location}: ${error.message}` : error.message;
}

interface ErrorBannerProps {
  errors: ApiErrorItem[];
  notice: string | null;
}

/** Render a success notice and/or a list of errors above the results. */
export default function ErrorBanner({ errors, notice }: ErrorBannerProps) {
  if (errors.length === 0 && !notice) {
    return null;
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error, index) => (
              <li key={`${error.row ?? "request"}-${error.field ?? "row"}-${index}`}>
                {describe(error)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
