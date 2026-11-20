"""Domain models shared by the scheduling engine and the API layer.

The models are plain frozen dataclasses so the scheduling package stays free of
web framework dependencies.
"""

from dataclasses import dataclass

IDLE_PID = "IDLE"


@dataclass(frozen=True)
class Process:
    """A single process competing for the CPU.

    Attributes:
        pid: Unique, human readable process identifier.
        arrival: Arrival time in whole time units, zero or greater.
        burst: CPU burst length in whole time units, at least one.
        priority: Reserved priority value. FCFS and SJF do not use it.
    """

    pid: str
    arrival: int
    burst: int
    priority: int = 0


@dataclass(frozen=True)
class GanttSegment:
    """One contiguous interval of CPU execution for a process or for idle time."""

    pid: str
    start: int
    end: int


@dataclass(frozen=True)
class ProcessResult:
    """Per-process scheduling metrics in the original input order."""

    pid: str
    arrival: int
    burst: int
    priority: int
    completion: int
    turnaround: int
    waiting: int
    response: int


@dataclass(frozen=True)
class Averages:
    """Average waiting and turnaround times, rounded to two decimals."""

    waiting: float
    turnaround: float


@dataclass(frozen=True)
class SimulationResult:
    """Complete result of one scheduling run."""

    algorithm: str
    gantt: list[GanttSegment]
    results: list[ProcessResult]
    averages: Averages
    total_time: int
