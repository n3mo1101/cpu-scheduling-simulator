# CPU Scheduling Simulator (Python/FastAPI version)

A full-stack CPU scheduling simulator for First-Come, First-Served (FCFS) and non-preemptive Shortest Job First (SJF). Enter processes in the browser or upload a CSV or JSON file, run a simulation, and inspect a proportional Gantt chart, per-process timing metrics, and CPU averages.

The scheduling engine is pure Python with no web imports. The API is FastAPI with Pydantic validation, and the frontend is React, TypeScript, and Tailwind CSS.

## Features

- FCFS and non-preemptive SJF scheduling
- Up to 100 processes per run
- PID, arrival time, burst time, and reserved priority input
- Two-column dark interface: a 440 px input panel and a fluid results panel
- Compact process table with a count stepper, add row, and remove row controls
- Segmented FCFS and SJF picker with a description of the selected policy
- Gantt chart with proportional segment widths, a ticked time axis, hover intervals, idle hatching, and per-PID colours
- Per-process completion, turnaround, waiting, and response times
- Average waiting time and average turnaround time, rounded to two decimals
- Total simulated time
- CSV and JSON drag-and-drop upload with specific parse errors and a 1 MB limit
- Backend validation with row-specific messages shown inline and in a summary banner
- Backend status chip, loading state, unreachable-server message, and responsive layout
- Ctrl + Enter (or Cmd + Enter) to run a simulation

## Tech stack

| Layer | Tools |
| --- | --- |
| Backend | Python 3.11+, FastAPI, Pydantic v2, Uvicorn |
| Scheduling core | Python standard library only (dataclasses, typing) |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend tests | pytest, httpx, FastAPI TestClient |
| Frontend tests | Vitest, jsdom |
| Linting | Ruff, TypeScript strict mode |

## Project structure

```
cpu-scheduling-simulator/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app, CORS, routes, error handler
│   │   ├── schemas.py           Request/response models and validation
│   │   └── scheduler/
│   │       ├── __init__.py      Algorithm registry and run_algorithm
│   │       ├── models.py        Dataclasses for processes and results
│   │       ├── metrics.py       CT, TAT, WT, RT, and averages
│   │       ├── fcfs.py
│   │       └── sjf.py
│   ├── tests/
│   │   └── test.py              Consolidated backend test suite
│   ├── requirements.txt
│   └── pyproject.toml           Ruff and pytest configuration
├── frontend/
│   └── src/
│       ├── api/client.ts        Fetch wrapper for POST /api/simulate
│       ├── types/index.ts       Shared request, response, and form types
│       ├── utils/parseUpload.ts CSV and JSON parsing
│       ├── utils/parseUpload.test.ts
│       ├── components/          Form, chart, table, metrics, and banner
│       ├── App.tsx
│       └── main.tsx
├── sample_data/
│   ├── sample.csv
│   └── sample.json
└── README.md
```

## Setup

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- npm

### Backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS or Linux:

```bash
source .venv/bin/activate
```

Install dependencies and start the development server:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

- Health check: `http://localhost:8000/api/health`
- Interactive API docs: `http://localhost:8000/docs`

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:8000`, and the backend also enables CORS for `http://localhost:5173`.

## Running the tests

Backend, from `backend/` with the virtual environment active:

```bash
pytest
```

The full backend suite lives in `backend/tests/test.py`. It covers the metrics, both algorithms, the verification dataset, tie-breaks, idle gaps, non-preemption, the API success paths, and every validation rule.

Frontend, from `frontend/`:

```bash
npm test
npm run typecheck
```

Linting, from `backend/`:

```bash
ruff check .
ruff format --check .
```

## Usage

1. Choose FCFS or SJF from the segmented algorithm control. The line below it describes the selected policy.
2. Set the process count with the − and + stepper, or use "Add process" and the row remove button. Existing row data is kept. The limit is 1 to 100 processes.
3. Enter a PID, arrival time, burst time, and priority for each row. PIDs are suggested as P1, P2, and so on, but can be edited. Priority uses a dashed, dimmed field because it is reserved.
4. Optionally drop a CSV or JSON file on the upload zone, browse for one, or click "Load sample data".
5. Click "Run simulation", or press Ctrl + Enter (Cmd + Enter on macOS).
6. Review the Gantt chart, the three-cell metrics strip, and the per-process results table.

The input rows, Gantt blocks, legend, and results table share one colour per PID. Hover or focus a Gantt block to read its interval, such as "P3 ran from 8 to 16 (8 units)".

Priority is collected and validated, but neither algorithm uses it.

The "Clear all" button resets the form to one empty process row and removes any results, errors, and notices. The selected algorithm is kept.

The header shows a backend status chip: checking, connected, or offline. It is checked on load, when the window regains focus, and after each simulation attempt.

## API contract

### `GET /api/health`

Response:

```json
{ "status": "ok" }
```

### `POST /api/simulate`

Request:

```json
{
  "algorithm": "fcfs",
  "processes": [
    { "pid": "P1", "arrival": 0, "burst": 5, "priority": 2 }
  ]
}
```

`algorithm` must be `"fcfs"` or `"sjf"`. `priority` is optional and defaults to `0`.

Success response, HTTP 200:

```json
{
  "algorithm": "fcfs",
  "gantt": [{ "pid": "P1", "start": 0, "end": 5 }],
  "results": [
    {
      "pid": "P1",
      "arrival": 0,
      "burst": 5,
      "priority": 2,
      "completion": 5,
      "turnaround": 5,
      "waiting": 0,
      "response": 0
    }
  ],
  "averages": { "waiting": 0.0, "turnaround": 5.0 },
  "total_time": 5
}
```

Gantt segments are chronological. Results stay in the original input order.

Validation errors return HTTP 422 with a flat list:

```json
{
  "errors": [
    { "row": 3, "field": "burst", "message": "Burst time must be greater than 0." },
    { "row": null, "field": "algorithm", "message": "Algorithm must be 'fcfs' or 'sjf'." }
  ]
}
```

`row` is the 1-based process index, or `null` for request-level errors.

### Validation rules

- `processes` must contain 1 to 100 entries.
- `pid` is required, trimmed, 1 to 20 characters, unique case-insensitively, and cannot be `IDLE` in any case.
- `arrival` is a required integer from 0 to 100000.
- `burst` is a required integer from 1 to 100000.
- `priority` is optional and defaults to 0, but must be an integer of 0 or more when provided.
- JSON floats, strings, booleans, and nulls are rejected for integer fields, including integral floats such as `5.0`.
- Duplicate PIDs are reported on the later row.

## Upload formats

Both sample files in `sample_data/` contain the verification dataset and can be uploaded from the UI.

### CSV

The header is required. `priority` is optional. Whitespace is trimmed and blank lines are ignored.

```csv
pid,arrival,burst,priority
P1,0,5,1
P2,1,3,2
P3,2,8,3
P4,3,6,4
```

### JSON

A JSON array of objects:

```json
[
  { "pid": "P1", "arrival": 0, "burst": 5, "priority": 1 },
  { "pid": "P2", "arrival": 1, "burst": 3, "priority": 2 }
]
```

Upload rules:

- Only `.csv` and `.json` files are accepted.
- The maximum file size is 1 MB.
- A successful upload fills the form rows and does not run the simulation automatically.
- Every bad row is reported. Bad rows are never skipped silently.
- Parse errors include a specific location, such as `Row 3: missing value for 'burst'.` or `Item 2: 'arrival' must be a number.`
- CSV error rows use physical file line numbers. JSON errors use the 1-based array item number.
- The parser checks structure and value types only. The backend enforces ranges, uniqueness, and reserved names.

## Scheduling rules

### Metrics

- Completion Time (CT): the time the process finishes.
- Turnaround Time (TAT): CT minus arrival time.
- Waiting Time (WT): TAT minus burst time.
- Response Time (RT): first CPU start minus arrival time.
- Averages are rounded to two decimals.
- Response time equals waiting time for both algorithms because neither algorithm preempts a running process, but both values are returned and displayed.

### FCFS

Processes are sorted by arrival time, with ties broken by original input index. Each process runs to completion. If the CPU is idle because the next process has not arrived, an `IDLE` segment fills the gap.

### SJF, non-preemptive

At each decision point, the scheduler considers unfinished processes with arrival time less than or equal to the current clock and picks the smallest burst. Ties are broken, in order, by earlier arrival time and then by original input index. A running process is never interrupted. If no process has arrived, an `IDLE` segment spans the gap to the earliest next arrival.

Zero-length segments are never emitted. Consecutive segments belong to different processes because neither algorithm preempts.

## Verification dataset

| PID | Arrival | Burst | Priority |
| --- | --- | --- | --- |
| P1 | 0 | 5 | 1 |
| P2 | 1 | 3 | 2 |
| P3 | 2 | 8 | 3 |
| P4 | 3 | 6 | 4 |

FCFS results:

- Gantt: P1 0-5, P2 5-8, P3 8-16, P4 16-22
- Completion: P1 5, P2 8, P3 16, P4 22
- Waiting: P1 0, P2 4, P3 6, P4 13
- Average waiting: 5.75
- Average turnaround: 11.25

SJF results:

- Gantt: P1 0-5, P2 5-8, P4 8-14, P3 14-22
- Completion: P1 5, P2 8, P3 22, P4 14
- Waiting: P1 0, P2 4, P3 12, P4 5
- Average waiting: 5.25
- Average turnaround: 10.75

Idle gap example: P1 with arrival 2 and burst 3, P2 with arrival 10 and burst 2 produces `IDLE 0-2, P1 2-5, IDLE 5-10, P2 10-12` for both algorithms.

## Screenshots

Screenshots of the input form, Gantt chart, results table, and validation messages will be added here.

## Implementation notes

- The backend test suite is intentionally consolidated into one file, `backend/tests/test.py`, as requested. Pytest is configured with `python_files = ["test.py"]`.
- Integer fields accept JSON integers only. Integral floats such as `5.0` are rejected to keep the rule unambiguous.
- The scheduler package does not import FastAPI or Pydantic. `run_algorithm(name, processes)` is the only entry point used by the API, and algorithms are registered in a dictionary.
