"""FastAPI application for the CPU scheduling simulator.

Exposes a health check and the single simulation endpoint. Validation errors
are converted into a flat, UI-friendly body with one entry per problem.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .scheduler import Process, UnknownAlgorithmError, run_algorithm
from .schemas import SimulateRequest, SimulateResponse, format_validation_errors

app = FastAPI(
    title="CPU Scheduling Simulator API",
    description="FCFS and non-preemptive SJF scheduling with a Gantt schedule and metrics.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ALGORITHM_ERROR = {
    "errors": [
        {
            "row": None,
            "field": "algorithm",
            "message": "Algorithm must be 'fcfs' or 'sjf'.",
        }
    ]
}


@app.get("/api/health")
def health() -> dict[str, str]:
    """Return a simple liveness response."""
    return {"status": "ok"}


@app.post("/api/simulate", response_model=SimulateResponse)
def simulate(payload: SimulateRequest) -> SimulateResponse | JSONResponse:
    """Validate the processes, run the chosen algorithm, and return metrics."""
    processes = [
        Process(pid=item.pid, arrival=item.arrival, burst=item.burst, priority=item.priority)
        for item in payload.processes
    ]

    try:
        result = run_algorithm(payload.algorithm, processes)
    except UnknownAlgorithmError:
        return JSONResponse(status_code=422, content=_ALGORITHM_ERROR)

    return SimulateResponse.model_validate(result)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation errors into the flat error format."""
    return JSONResponse(status_code=422, content={"errors": format_validation_errors(exc.errors())})
