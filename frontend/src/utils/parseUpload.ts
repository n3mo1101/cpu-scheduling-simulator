/**
 * CSV and JSON upload parsing.
 *
 * This module only checks file structure and value types. Range, uniqueness,
 * and reserved PID rules stay in the backend, which remains the source of
 * truth for validation.
 */

import type { ProcessRow } from "../types";

/** Maximum accepted upload size in bytes. */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

const REQUIRED_COLUMNS = ["pid", "arrival", "burst"] as const;
const NUMERIC_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** A specific, user-facing upload problem. */
export class UploadParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadParseError";
  }
}

function parseNumericCell(value: string, field: string, line: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new UploadParseError(`Row ${line}: missing value for '${field}'.`);
  }
  if (!NUMERIC_PATTERN.test(trimmed)) {
    throw new UploadParseError(`Row ${line}: '${field}' must be a number.`);
  }
  return trimmed;
}

function splitCsvLine(line: string, lineNumber: number): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (inQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  if (inQuotes) {
    throw new UploadParseError(`Row ${lineNumber}: unterminated quoted value.`);
  }

  cells.push(current);
  return cells;
}

/** Parse a CSV file with a `pid,arrival,burst` header and optional `priority`. */
export function parseCsv(text: string): ProcessRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  const records = lines
    .map((raw, index) => ({ raw, line: index + 1 }))
    .filter((record) => record.raw.trim() !== "");

  if (records.length === 0) {
    throw new UploadParseError("The file is empty.");
  }

  const header = splitCsvLine(records[0].raw, records[0].line).map((cell) =>
    cell.trim().toLowerCase(),
  );

  if (new Set(header).size !== header.length) {
    throw new UploadParseError("The header contains duplicate columns.");
  }

  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) {
      throw new UploadParseError(`Missing required column: ${column}.`);
    }
  }

  const columnIndex = (name: string): number => header.indexOf(name);

  const rows: ProcessRow[] = [];
  for (const record of records.slice(1)) {
    const cells = splitCsvLine(record.raw, record.line);

    if (
      cells.length > header.length &&
      cells.slice(header.length).some((cell) => cell.trim() !== "")
    ) {
      throw new UploadParseError(
        `Row ${record.line}: expected ${header.length} columns but found ${cells.length}.`,
      );
    }

    const cellAt = (name: string): string => {
      const index = columnIndex(name);
      if (index < 0 || index >= cells.length) {
        return "";
      }
      return cells[index];
    };

    const pid = cellAt("pid").trim();
    if (!pid) {
      throw new UploadParseError(`Row ${record.line}: missing value for 'pid'.`);
    }

    const arrival = parseNumericCell(cellAt("arrival"), "arrival", record.line);
    const burst = parseNumericCell(cellAt("burst"), "burst", record.line);

    const priorityIndex = columnIndex("priority");
    const rawPriority = cellAt("priority");
    const priority =
      priorityIndex >= 0 && rawPriority.trim()
        ? parseNumericCell(rawPriority, "priority", record.line)
        : "0";

    rows.push({ pid, arrival, burst, priority });
  }

  if (rows.length === 0) {
    throw new UploadParseError("The file does not contain any process rows.");
  }

  return rows;
}

function parseJsonItem(value: unknown, itemNumber: number): ProcessRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UploadParseError(
      `Item ${itemNumber}: expected an object with pid, arrival, and burst.`,
    );
  }

  const record = value as Record<string, unknown>;

  const rawPid = record.pid;
  if (rawPid === undefined || rawPid === null) {
    throw new UploadParseError(`Item ${itemNumber}: missing value for 'pid'.`);
  }
  if (typeof rawPid !== "string") {
    throw new UploadParseError(`Item ${itemNumber}: 'pid' must be text.`);
  }
  const pid = rawPid.trim();
  if (!pid) {
    throw new UploadParseError(`Item ${itemNumber}: missing value for 'pid'.`);
  }

  const numericValue = (field: "arrival" | "burst"): string => {
    const raw = record[field];
    if (raw === undefined || raw === null) {
      throw new UploadParseError(`Item ${itemNumber}: missing value for '${field}'.`);
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new UploadParseError(`Item ${itemNumber}: '${field}' must be a number.`);
    }
    return String(raw);
  };

  const arrival = numericValue("arrival");
  const burst = numericValue("burst");

  const rawPriority = record.priority;
  let priority = "0";
  if (rawPriority !== undefined && rawPriority !== null) {
    if (typeof rawPriority !== "number" || !Number.isFinite(rawPriority)) {
      throw new UploadParseError(`Item ${itemNumber}: 'priority' must be a number.`);
    }
    priority = String(rawPriority);
  }

  return { pid, arrival, burst, priority };
}

/** Parse a JSON array of `{pid, arrival, burst, priority?}` objects. */
export function parseJson(text: string): ProcessRow[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new UploadParseError("File is not valid JSON.");
  }

  if (!Array.isArray(data)) {
    throw new UploadParseError("The JSON file must contain an array of process objects.");
  }
  if (data.length === 0) {
    throw new UploadParseError("The file does not contain any process rows.");
  }

  return data.map((item, index) => parseJsonItem(item, index + 1));
}

/** Validate the file type and size, then parse it by extension. */
export async function parseUploadFile(file: File): Promise<ProcessRow[]> {
  const name = file.name.toLowerCase();

  if (!name.endsWith(".csv") && !name.endsWith(".json")) {
    throw new UploadParseError("Unsupported file type. Upload a .csv or .json file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadParseError("File is too large. The maximum size is 1 MB.");
  }

  const text = await file.text();
  return name.endsWith(".csv") ? parseCsv(text) : parseJson(text);
}
