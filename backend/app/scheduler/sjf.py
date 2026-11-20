"""Shortest Job First scheduling, non-preemptive.

At every decision point the scheduler considers every unfinished process that
has already arrived and picks the one with the smallest burst. Ties are broken,
in order, by earlier arrival time and then by original input index. Once a
process starts it is never interrupted. If no process has arrived, an IDLE
segment spans the gap to the earliest next arrival.
"""

from collections.abc import Sequence

from .models import IDLE_PID, GanttSegment, Process


def schedule(processes: Sequence[Process]) -> list[GanttSegment]:
    """Return the chronological non-preemptive SJF schedule for ``processes``."""
    remaining = list(enumerate(processes))
    finished: set[int] = set()

    clock = 0
    segments: list[GanttSegment] = []
    while len(finished) < len(remaining):
        available = [
            (process.burst, process.arrival, index)
            for index, process in remaining
            if index not in finished and process.arrival <= clock
        ]

        if not available:
            next_arrival = min(
                process.arrival for index, process in remaining if index not in finished
            )
            segments.append(GanttSegment(pid=IDLE_PID, start=clock, end=next_arrival))
            clock = next_arrival
            continue

        _, _, chosen_index = min(available)
        process = processes[chosen_index]
        end = clock + process.burst
        segments.append(GanttSegment(pid=process.pid, start=clock, end=end))
        finished.add(chosen_index)
        clock = end

    return segments
