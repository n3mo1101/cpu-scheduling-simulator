/** Shared request, response, error, and form types. */

export type Algorithm = "fcfs" | "sjf";

export interface ProcessInput {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
}

export interface SimulateRequest {
  algorithm: Algorithm;
  processes: ProcessInput[];
}

export interface GanttSegment {
  pid: string;
  start: number;
  end: number;
}

export interface ProcessResult {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
  completion: number;
  turnaround: number;
  waiting: number;
  response: number;
}

export interface Averages {
  waiting: number;
  turnaround: number;
}

export interface SimulateResponse {
  algorithm: Algorithm;
  gantt: GanttSegment[];
  results: ProcessResult[];
  averages: Averages;
  total_time: number;
}

export interface ApiErrorItem {
  row: number | null;
  field: string | null;
  message: string;
}

/** One editable form row. Values stay as strings so typing is never blocked. */
export interface ProcessRow {
  pid: string;
  arrival: string;
  burst: string;
  priority: string;
}
