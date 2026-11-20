"""Metric calculations for a completed, non-preemptive schedule.

Completion, turnaround, waiting, and response times are derived from the start
time of each process, which is exactly the first time it received the CPU.
"""

from collections.abc import Sequence

from .models import IDLE_PID, Averages, GanttSegment, Process, ProcessResult, SimulationResult


def build_result(process: Process, start: int) -> ProcessResult:
    """Build the metrics for one process that first started at ``start``.

    For a non-preemptive algorithm the process runs to completion without
    interruption, so:
        completion = start + burst
        turnaround = completion - arrival
        waiting = turnaround - burst
        response = start - arrival
    """
    completion = start + process.burst
    turnaround = completion - process.arrival
    waiting = turnaround - process.burst
    response = start - process.arrival
    return ProcessResult(
        pid=process.pid,
        arrival=process.arrival,
        burst=process.burst,
        priority=process.priority,
        completion=completion,
        turnaround=turnaround,
        waiting=waiting,
        response=response,
    )


def summarize(
    algorithm: str,
    processes: Sequence[Process],
    gantt: Sequence[GanttSegment],
) -> SimulationResult:
    """Combine a Gantt schedule with per-process metrics and averages.

    Results follow the original input order. Averages are rounded to two
    decimals and are zero when there are no processes. ``total_time`` is the
    end of the last Gantt segment.
    """
    first_start = {segment.pid: segment.start for segment in gantt if segment.pid != IDLE_PID}
    results = [build_result(process, first_start[process.pid]) for process in processes]

    count = len(results)
    average_waiting = round(sum(item.waiting for item in results) / count, 2) if count else 0.0
    average_turnaround = (
        round(sum(item.turnaround for item in results) / count, 2) if count else 0.0
    )
    total_time = gantt[-1].end if gantt else 0

    return SimulationResult(
        algorithm=algorithm,
        gantt=list(gantt),
        results=results,
        averages=Averages(waiting=average_waiting, turnaround=average_turnaround),
        total_time=total_time,
    )
