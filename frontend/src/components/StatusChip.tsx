/** Backend connection status pill for the header. */

import type { BackendStatus } from "../types";

const LABELS: Record<BackendStatus, string> = {
  checking: "Checking backend",
  online: "Backend connected",
  offline: "Backend offline",
};

const DOT_CLASSES: Record<BackendStatus, string> = {
  checking: "bg-warning",
  online: "bg-success",
  offline: "bg-error",
};

interface StatusChipProps {
  status: BackendStatus;
}

/** Show whether the API answered its last health check. */
export default function StatusChip({ status }: StatusChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line-soft bg-raised px-3 py-1.5 text-xs font-medium text-muted">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[status]} ${
          status === "checking" ? "animate-pulse" : ""
        }`}
      />
      {LABELS[status]}
    </span>
  );
}
