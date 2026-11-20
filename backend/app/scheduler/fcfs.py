"""First-Come, First-Served scheduling.

Processes are ordered by arrival time, with ties broken by their original input
index (a stable sort). Each process runs to completion. Whenever the CPU is idle
because the next process has not arrived yet, an IDLE segment fills the gap.
"""

from collections.abc import Sequence

from .models import IDLE_PID, GanttSegment, Process


def schedule(processes: Sequence[Process]) -> list[GanttSegment]:
    """Return the chronological FCFS schedule for ``processes``.

    Sorting key: ``(arrival, original input index)``. The clock jumps forward
    over idle gaps and no process is split into multiple segments.
    """
    ordered = sorted(enumerate(processes), key=lambda item: (item[1].arrival, item[0]))

    clock = 0
    segments: list[GanttSegment] = []
    for _, process in ordered:
        if clock < process.arrival:
            segments.append(GanttSegment(pid=IDLE_PID, start=clock, end=process.arrival))
            clock = process.arrival
        end = clock + process.burst
        segments.append(GanttSegment(pid=process.pid, start=clock, end=end))
        clock = end
    return segments
