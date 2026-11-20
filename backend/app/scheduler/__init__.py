"""Public entry point for the scheduling engine.

The API layer only calls :func:`run_algorithm`. Adding an algorithm requires a
new module that returns Gantt segments plus one line in ``ALGORITHMS``.
"""

from collections.abc import Callable, Sequence

from . import fcfs, sjf
from .metrics import summarize
from .models import (
    IDLE_PID,
    Averages,
    GanttSegment,
    Process,
    ProcessResult,
    SimulationResult,
)

Algorithm = Callable[[Sequence[Process]], list[GanttSegment]]

ALGORITHMS: dict[str, Algorithm] = {
    "fcfs": fcfs.schedule,
    "sjf": sjf.schedule,
}

__all__ = [
    "ALGORITHMS",
    "IDLE_PID",
    "Algorithm",
    "Averages",
    "GanttSegment",
    "Process",
    "ProcessResult",
    "SimulationResult",
    "UnknownAlgorithmError",
    "run_algorithm",
]


class UnknownAlgorithmError(ValueError):
    """Raised when an algorithm name is not present in the registry."""


def run_algorithm(name: str, processes: Sequence[Process]) -> SimulationResult:
    """Run the named algorithm and return a complete simulation result.

    Args:
        name: Registry key, currently ``"fcfs"`` or ``"sjf"``.
        processes: Validated processes in their original input order.

    Raises:
        UnknownAlgorithmError: If ``name`` is not registered.
    """
    try:
        algorithm = ALGORITHMS[name]
    except KeyError as exc:
        raise UnknownAlgorithmError(f"Unsupported algorithm: {name}") from exc

    gantt = algorithm(processes)
    return summarize(name, processes, gantt)
