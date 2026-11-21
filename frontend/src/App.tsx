/** Application shell: two-column input and results layout. */

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiNetworkError,
  ApiServerError,
  ApiValidationError,
  checkHealth,
  simulate,
} from "./api/client";
import AlgorithmSelect from "./components/AlgorithmSelect";
import ErrorBanner from "./components/ErrorBanner";
import FileUpload from "./components/FileUpload";
import GanttChart from "./components/GanttChart";
import MetricsCards from "./components/MetricsCards";
import ProcessForm from "./components/ProcessForm";
import ResultsTable from "./components/ResultsTable";
import StatusChip from "./components/StatusChip";
import type {
  Algorithm,
  ApiErrorItem,
  BackendStatus,
  ProcessInput,
  ProcessRow,
  SimulateResponse,
} from "./types";
import { parseUploadFile, UploadParseError } from "./utils/parseUpload";

const INITIAL_ROWS: ProcessRow[] = Array.from({ length: 4 }, (_, index) => ({
  pid: `P${index + 1}`,
  arrival: "0",
  burst: "",
  priority: "0",
}));

const SAMPLE_ROWS: ProcessRow[] = [
  { pid: "P1", arrival: "0", burst: "5", priority: "1" },
  { pid: "P2", arrival: "1", burst: "3", priority: "2" },
  { pid: "P3", arrival: "2", burst: "8", priority: "3" },
  { pid: "P4", arrival: "3", burst: "6", priority: "4" },
];

const ALGORITHM_LABELS: Record<Algorithm, string> = {
  fcfs: "First-Come, First-Served",
  sjf: "Shortest Job First",
};

function nextPid(rows: ProcessRow[]): string {
  const used = new Set(rows.map((row) => row.pid.trim().toUpperCase()));
  let number = rows.length + 1;
  while (used.has(`P${number}`)) {
    number += 1;
  }
  return `P${number}`;
}

function resizeRows(rows: ProcessRow[], count: number): ProcessRow[] {
  if (count <= rows.length) {
    return rows.slice(0, count);
  }

  const next = [...rows];
  while (next.length < count) {
    next.push({ pid: nextPid(next), arrival: "0", burst: "", priority: "0" });
  }
  return next;
}

function emptyRow(): ProcessRow {
  return { pid: "P1", arrival: "", burst: "", priority: "" };
}

function validateRows(rows: ProcessRow[]): ApiErrorItem[] {
  const issues: ApiErrorItem[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    if (!row.pid.trim()) {
      issues.push({ row: rowNumber, field: "pid", message: "Process ID is required." });
    }

    const checkNumber = (field: "arrival" | "burst", label: string) => {
      const value = row[field].trim();
      if (!value) {
        issues.push({ row: rowNumber, field, message: `${label} is required.` });
      } else if (!Number.isFinite(Number(value))) {
        issues.push({ row: rowNumber, field, message: `${label} must be a number.` });
      }
    };

    checkNumber("arrival", "Arrival time");
    checkNumber("burst", "Burst time");

    const priority = row.priority.trim();
    if (priority && !Number.isFinite(Number(priority))) {
      issues.push({ row: rowNumber, field: "priority", message: "Priority must be a number." });
    }
  });

  return issues;
}

/** Root component for the simulator. */
export default function App() {
  const [rows, setRows] = useState<ProcessRow[]>(INITIAL_ROWS);
  const [algorithm, setAlgorithm] = useState<Algorithm>("fcfs");
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [errors, setErrors] = useState<ApiErrorItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const online = await checkHealth();
      if (!cancelled) {
        setBackendStatus(online ? "online" : "offline");
      }
    };

    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleRowChange = (index: number, field: keyof ProcessRow, value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
    setErrors((current) =>
      current.filter((error) => !(error.row === index + 1 && error.field === field)),
    );
    setUploadError(null);
  };

  const handleCountChange = (count: number) => {
    const nextCount = Math.min(100, Math.max(1, count));
    setRows((current) => resizeRows(current, nextCount));
    setErrors([]);
    setNotice(null);
    setUploadError(null);
  };

  const handleAdd = () => {
    setRows((current) =>
      current.length >= 100
        ? current
        : [...current, { pid: nextPid(current), arrival: "0", burst: "", priority: "0" }],
    );
    setErrors([]);
    setNotice(null);
    setUploadError(null);
  };

  const handleRemove = (index: number) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
    setErrors([]);
    setNotice(null);
    setUploadError(null);
  };

  const handleLoadSample = () => {
    setRows(SAMPLE_ROWS.map((row) => ({ ...row })));
    setErrors([]);
    setUploadError(null);
    setResult(null);
    setNotice("Sample data loaded. Review the rows, then run the simulation.");
  };

  const handleClear = () => {
    setRows([emptyRow()]);
    setErrors([]);
    setUploadError(null);
    setResult(null);
    setNotice(null);
  };

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseUploadFile(file);
      setRows(parsed);
      setErrors([]);
      setUploadError(null);
      setResult(null);
      setNotice(
        `Loaded ${parsed.length} process${parsed.length === 1 ? "" : "es"} from ${file.name}. Review the rows, then run the simulation.`,
      );
    } catch (error) {
      setNotice(null);
      setUploadError(
        error instanceof UploadParseError ? error.message : "Could not read the selected file.",
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    const issues = validateRows(rows);
    setErrors(issues);
    setNotice(null);
    if (issues.length > 0) {
      return;
    }

    const processes: ProcessInput[] = rows.map((row) => ({
      pid: row.pid.trim(),
      arrival: Number(row.arrival),
      burst: Number(row.burst),
      priority: row.priority.trim() === "" ? 0 : Number(row.priority),
    }));

    setLoading(true);
    setResult(null);

    try {
      const response = await simulate({ algorithm, processes });
      setResult(response);
      setBackendStatus("online");
    } catch (error) {
      if (error instanceof ApiValidationError) {
        setErrors(error.errors);
        setBackendStatus("online");
      } else if (error instanceof ApiNetworkError) {
        setErrors([{ row: null, field: null, message: error.message }]);
        setBackendStatus("offline");
      } else if (error instanceof ApiServerError) {
        setErrors([{ row: null, field: null, message: error.message }]);
        setBackendStatus("online");
      } else {
        setErrors([
          {
            row: null,
            field: null,
            message: "An unexpected error occurred. Please try again.",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const algorithmError =
    errors.find((error) => error.row === null && error.field === "algorithm")?.message ?? null;

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-raised focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>

      <header className="border-b border-line-soft">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <h1 className="display-type text-xl font-semibold text-ink sm:text-2xl">
              CPU scheduling simulator
            </h1>
            <p className="mt-0.5 text-xs text-muted sm:text-sm">
              Compare FCFS and non-preemptive SJF on the same process set.
            </p>
          </div>
          <StatusChip status={backendStatus} />
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-[1320px] space-y-5 px-4 py-6 sm:px-6 sm:py-8"
      >
        <ErrorBanner errors={errors} notice={notice} />

        <div className="grid items-start gap-7 lg:grid-cols-[440px_minmax(0,1fr)]">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="overflow-hidden rounded-[14px] border border-line-soft bg-panel lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-3rem)] lg:flex-col"
          >
            <div className="space-y-5 p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <AlgorithmSelect
                algorithm={algorithm}
                error={algorithmError}
                disabled={loading}
                onChange={setAlgorithm}
              />

              <div className="h-px bg-line-soft" aria-hidden="true" />

              <ProcessForm
                rows={rows}
                errors={errors}
                disabled={loading}
                onChange={handleRowChange}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onCountChange={handleCountChange}
              />

              <div className="h-px bg-line-soft" aria-hidden="true" />

              <FileUpload
                disabled={loading}
                error={uploadError}
                onFile={handleFile}
                onLoadSample={handleLoadSample}
                onClear={handleClear}
              />
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-line-soft p-4 sm:px-5">
              <p className="hidden shrink-0 items-center gap-1 text-[11px] text-faint sm:flex">
                <kbd className="rounded border border-line-strong bg-field px-1.5 py-0.5 font-sans text-[10px] text-muted">
                  Ctrl
                </kbd>
                <span aria-hidden="true">+</span>
                <kbd className="rounded border border-line-strong bg-field px-1.5 py-0.5 font-sans text-[10px] text-muted">
                  Enter
                </kbd>
              </p>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-[#05070a] transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#05070a]/30 border-t-[#05070a]"
                  />
                )}
                {loading ? "Running simulation" : "Run simulation"}
              </button>
            </div>
          </form>

          <section aria-labelledby="results-heading" className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="results-heading" className="display-type text-lg font-semibold text-ink">
                  Results
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {result
                    ? `${result.results.length} process${
                        result.results.length === 1 ? "" : "es"
                      }, ${result.total_time} time units`
                    : "Run a simulation to populate the timeline and table."}
                </p>
              </div>
              {result && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {ALGORITHM_LABELS[result.algorithm]}
                </span>
              )}
            </div>

            {result ? (
              <>
                <GanttChart result={result} />
                <MetricsCards result={result} />
                <ResultsTable result={result} />
              </>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-line-strong bg-panel/60 px-6 py-12 text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-faint"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  aria-hidden="true"
                >
                  <path d="M4 19h16M6 16V9m4 7V5m4 11v-4m4 4V7" strokeLinecap="round" />
                </svg>
                <p className="max-w-xs text-sm text-muted">
                  The Gantt chart, metrics, and per-process results appear here after a run.
                </p>
                <p className="text-xs text-faint">
                  New here? Load the sample data, then run the simulation.
                </p>
              </div>
            )}

            <p role="status" className="sr-only">
              {loading ? "Running the simulation." : result ? "Simulation complete." : ""}
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-[1320px] px-4 py-5 text-xs text-faint sm:px-6">
          CPU scheduling simulator. FastAPI, React, TypeScript, and Tailwind CSS.
        </div>
      </footer>
    </div>
  );
}
