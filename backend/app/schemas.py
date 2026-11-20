"""Pydantic request/response models and request validation.

All value rules from the specification live here, never in the scheduling
engine. Pydantic errors are later flattened by :func:`format_validation_errors`
into the UI-friendly ``{"errors": [...]}`` shape.
"""

from typing import Any, Literal, cast

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from .scheduler.models import IDLE_PID

Algorithm = Literal["fcfs", "sjf"]

MAX_PROCESSES = 100
MAX_TIME = 100_000
MAX_PID_LENGTH = 20

_FIELD_LABELS = {
    "pid": "Process ID",
    "arrival": "Arrival time",
    "burst": "Burst time",
    "priority": "Priority",
    "algorithm": "Algorithm",
    "processes": "Processes",
}

_MISSING_MESSAGES = {
    "pid": "Process ID is required.",
    "arrival": "Arrival time is required.",
    "burst": "Burst time is required.",
    "priority": "Priority must be a whole number.",
    "algorithm": "Algorithm must be 'fcfs' or 'sjf'.",
    "processes": "At least one process is required.",
}

_CUSTOM_ERROR_TYPES = {
    "missing_value",
    "invalid_integer",
    "invalid_pid",
    "invalid_value",
    "duplicate_pid",
}


def _strict_integer(value: Any, label: str, *, optional: bool = False) -> int:
    """Accept only JSON integers, explicitly rejecting bools, floats, and strings."""
    if value is None:
        if optional:
            raise PydanticCustomError(
                "invalid_integer", "{label} must be a whole number.", {"label": label}
            )
        raise PydanticCustomError("missing_value", "{label} is required.", {"label": label})
    if isinstance(value, bool) or isinstance(value, float) or not isinstance(value, int):
        raise PydanticCustomError(
            "invalid_integer", "{label} must be a whole number.", {"label": label}
        )
    return value


class ProcessIn(BaseModel):
    """One process supplied by the client, before scheduling."""

    pid: str
    arrival: int
    burst: int
    priority: int = 0

    @field_validator("pid", mode="before")
    @classmethod
    def _validate_pid(cls, value: Any) -> str:
        if value is None:
            raise PydanticCustomError("missing_value", "Process ID is required.")
        if not isinstance(value, str):
            raise PydanticCustomError("invalid_pid", "Process ID must be text.")

        cleaned = value.strip()
        if not cleaned:
            raise PydanticCustomError("missing_value", "Process ID is required.")
        if len(cleaned) > MAX_PID_LENGTH:
            raise PydanticCustomError(
                "invalid_pid",
                "Process ID cannot be longer than 20 characters.",
            )
        if cleaned.upper() == IDLE_PID:
            raise PydanticCustomError(
                "invalid_pid",
                "Process ID cannot be 'IDLE' because it is reserved for idle time.",
            )
        return cleaned

    @field_validator("arrival", mode="before")
    @classmethod
    def _validate_arrival(cls, value: Any) -> int:
        number = _strict_integer(value, "Arrival time")
        if number < 0:
            raise PydanticCustomError("invalid_value", "Arrival time cannot be negative.")
        if number > MAX_TIME:
            raise PydanticCustomError("invalid_value", "Arrival time cannot exceed 100000.")
        return number

    @field_validator("burst", mode="before")
    @classmethod
    def _validate_burst(cls, value: Any) -> int:
        number = _strict_integer(value, "Burst time")
        if number < 1:
            raise PydanticCustomError("invalid_value", "Burst time must be greater than 0.")
        if number > MAX_TIME:
            raise PydanticCustomError("invalid_value", "Burst time cannot exceed 100000.")
        return number

    @field_validator("priority", mode="before")
    @classmethod
    def _validate_priority(cls, value: Any) -> int:
        number = _strict_integer(value, "Priority", optional=True)
        if number < 0:
            raise PydanticCustomError("invalid_value", "Priority cannot be negative.")
        return number


class SimulateRequest(BaseModel):
    """Request body for ``POST /api/simulate``."""

    algorithm: Algorithm
    processes: list[ProcessIn] = Field(min_length=1, max_length=MAX_PROCESSES)

    @model_validator(mode="after")
    def _validate_unique_pids(self) -> "SimulateRequest":
        """Reject duplicate PIDs case-insensitively, reporting the later row."""
        seen: set[str] = set()
        for index, process in enumerate(self.processes):
            key = process.pid.casefold()
            if key in seen:
                raise PydanticCustomError(
                    "duplicate_pid",
                    "Duplicate process ID '{pid}'. Process IDs must be unique (case-insensitive).",
                    {"pid": process.pid, "row": index + 1, "field": "pid"},
                )
            seen.add(key)
        return self


class GanttSegmentOut(BaseModel):
    """One Gantt segment in API responses."""

    model_config = ConfigDict(from_attributes=True)

    pid: str
    start: int
    end: int


class ProcessResultOut(BaseModel):
    """Per-process metrics in API responses."""

    model_config = ConfigDict(from_attributes=True)

    pid: str
    arrival: int
    burst: int
    priority: int
    completion: int
    turnaround: int
    waiting: int
    response: int


class AveragesOut(BaseModel):
    """Average metrics in API responses."""

    model_config = ConfigDict(from_attributes=True)

    waiting: float
    turnaround: float


class SimulateResponse(BaseModel):
    """Successful response body for ``POST /api/simulate``."""

    model_config = ConfigDict(from_attributes=True)

    algorithm: Algorithm
    gantt: list[GanttSegmentOut]
    results: list[ProcessResultOut]
    averages: AveragesOut
    total_time: int


def _message_for(error: dict[str, Any], row: int | None, field: str | None) -> str:
    """Turn one raw Pydantic error into a short, human-readable sentence."""
    error_type = str(error.get("type", ""))
    if error_type in _CUSTOM_ERROR_TYPES:
        return str(error.get("msg", "This value is invalid."))

    if error_type == "missing":
        return _MISSING_MESSAGES.get(field or "", "This value is required.")
    if error_type == "literal_error" and field == "algorithm":
        return "Algorithm must be 'fcfs' or 'sjf'."
    if error_type in {"too_short", "too_long"} and field == "processes":
        return (
            "At least one process is required."
            if error_type == "too_short"
            else ("At most 100 processes are allowed.")
        )
    if error_type in {"json_invalid", "json_type"}:
        return "Request body is not valid JSON."
    if field == "processes":
        return "Processes must be a list of process objects."
    if error_type == "string_type" and field == "pid":
        return "Process ID must be text."
    if error_type in {"model_type", "model_attributes_type"} and row is not None:
        return f"Process {row} must be a JSON object."
    if field in {"arrival", "burst", "priority"}:
        return f"{_FIELD_LABELS[field]} must be a whole number."
    if field:
        return f"{_FIELD_LABELS.get(field, field.capitalize())} is invalid."
    return "Request body is invalid."


def format_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flatten Pydantic errors into ``{"row", "field", "message"}`` objects.

    ``row`` is the 1-based process index and is null for request-level errors.
    Duplicate PID errors carry their row and field in the error context because
    they are produced by a model-level validator.
    """
    formatted: list[dict[str, Any]] = []

    for error in errors:
        location = tuple(error.get("loc", ()))
        context = cast(dict[str, Any], error.get("ctx") or {})

        row: int | None = None
        field: str | None = None
        if (
            len(location) >= 3
            and location[0] == "body"
            and location[1] == "processes"
            and isinstance(location[2], int)
        ):
            row = location[2] + 1
            if len(location) >= 4 and isinstance(location[3], str):
                field = location[3]
        elif len(location) >= 2 and location[0] == "body" and isinstance(location[1], str):
            field = location[1]

        if "row" in context:
            row = int(context["row"])
        if "field" in context:
            field = str(context["field"])

        formatted.append(
            {
                "row": row,
                "field": field,
                "message": _message_for(error, row, field),
            }
        )

    return formatted
