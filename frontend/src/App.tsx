/** Application shell: form state, upload handling, API calls, and results. */

import { useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ApiNetworkError,
  ApiServerError,
  ApiValidationError,
  simulate,
} from "./api/client";
import AlgorithmSelect from "./components/AlgorithmSelect";
import ErrorBanner from "./components/ErrorBanner";
import FileUpload from "./components/FileUpload";
import GanttChart from "./components/GanttChart";
import MetricsCards from "./components/MetricsCards";
import ProcessForm from "./components/ProcessForm";
import ResultsTable from "./components/ResultsTable";
import type { Algorithm, ApiErrorItem, ProcessInput, ProcessRow, SimulateResponse } from "./types";
import { parseUploadFile, UploadParseError } from "./utils/parseUpload";

const INITIAL_ROWS: ProcessRow[] = Array.from({ length: 3 }, (_, index) => ({
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
  sjf: "Shortest Job First (non-preemptive)",
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

function emptyRow(index: number): ProcessRow {
  return { pid: `P${index + 1}`, arrival: "", burst: "", priority: "0" };
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
  const [countText, setCountText] = useState(String(INITIAL_ROWS.length));
  const [algorithm, setAlgorithm] = useState<Algorithm>("fcfs");
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [errors, setErrors] = useState<ApiErrorItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const commitCount = () => {
    const count = Number(countText);

    if (Number.isInteger(count) && count >= 1 && count <= 100) {
      setRows((current) => resizeRows(current, count));
      setErrors((current) => current.filter((error) => error.row === null || error.row <= count));
      setCountText(String(count));
      return;
    }

    setCountText(String(rows.length));
  };

  const handleCountKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitCount();
    }
  };

  const handleRowChange = (index: number, field: keyof ProcessRow, value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
    setErrors((current) =>
      current.filter((error) => !(error.row === index + 1 && error.field === field)),
    );
  };

  const handleLoadSample = () => {
    setRows(SAMPLE_ROWS.map((row) => ({ ...row })));
    setCountText(String(SAMPLE_ROWS.length));
    setErrors([]);
    setResult(null);
    setNotice("Sample data loaded. Review the rows, then run the simulation.");
  };

  const handleClear = () => {
    setRows([emptyRow(0)]);
    setCountText("1");
    setErrors([]);
    setResult(null);
    setNotice(null);
  };

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseUploadFile(file);
      setRows(parsed);
      setCountText(String(parsed.length));
      setErrors([]);
      setResult(null);
      setNotice(
        `Loaded ${parsed.length} process${parsed.length === 1 ? "" : "es"} from ${file.name}. Review the rows, then run the simulation.`,
      );
    } catch (error) {
      setNotice(null);
      setResult(null);
      setErrors([
        {
          row: null,
          field: null,
          message:
            error instanceof UploadParseError
              ? error.message
              : "Could not read the selected file.",
        },
      ]);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
    } catch (error) {
      if (error instanceof ApiValidationError) {
        setErrors(error.errors);
      } else if (error instanceof ApiNetworkError || error instanceof ApiServerError) {
        setErrors([{ row: null, field: null, message: error.message }]);
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            CPU Scheduling Simulator
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Enter processes, choose FCFS or non-preemptive SJF, and review the Gantt chart
            and timing metrics.
          </p>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <ErrorBanner errors={errors} notice={notice} />

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AlgorithmSelect
              algorithm={algorithm}
              error={algorithmError}
              disabled={loading}
              onChange={setAlgorithm}
            />

            <div>
              <label
                htmlFor="process-count"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Number of processes (1-100)
              </label>
              <input
                id="process-count"
                type="number"
                min={1}
                max={100}
                step={1}
                value={countText}
                disabled={loading}
                onChange={(event) => setCountText(event.target.value)}
                onBlur={commitCount}
                onKeyDown={handleCountKeyDown}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                Applies when you press Enter or leave the field. Existing row data is kept.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-4">
            <FileUpload disabled={loading} onFile={handleFile} />
            <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={loading}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Load sample data
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear
            </button>
          </div>

          <ProcessForm
            rows={rows}
            errors={errors}
            disabled={loading}
            onChange={handleRowChange}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              The backend validates every value and returns row-specific messages.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {loading ? "Running..." : "Run simulation"}
            </button>
          </div>
        </form>

        <p role="status" className="sr-only">
          {loading ? "Running the simulation." : result ? "Simulation complete." : ""}
        </p>

        {result && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-900">Results</h2>
              <p className="text-sm text-slate-500">{ALGORITHM_LABELS[result.algorithm]}</p>
            </div>
            <MetricsCards result={result} />
            <GanttChart result={result} />
            <ResultsTable result={result} />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500 sm:px-6">
          CPU Scheduling Simulator. Built with FastAPI, React, TypeScript, and Tailwind CSS.
        </div>
      </footer>
    </div>
  );
}
