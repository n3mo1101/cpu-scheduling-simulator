# Conclusions

## 1. Which algorithm performed best?

SJF performed best on the verification dataset (`sample_data/`).

| Algorithm | Avg. Waiting Time | Avg. Turnaround Time |
| --- | --- | --- |
| FCFS | 5.75 | 11.25 |
| SJF | 5.25 | 10.75 |

SJF picks the shortest ready job each time, so short jobs stop waiting behind long ones. P4 (burst 6) runs before P3 (burst 8), which lowers the total waiting time. Turnaround time includes waiting time, so it drops by the same amount.

## 2. How does arrival time affect fairness and efficiency?

Arrival time decides which processes are in the ready queue when the CPU becomes free.

- **FCFS** only looks at arrival order, so it is fair in order but can be inefficient. A long job that arrives first makes everything behind it wait.
- **SJF** only chooses among processes that have already arrived. A late-arriving short job cannot jump ahead of a running process, because SJF is non-preemptive.

**Example (verification dataset):** At time 8, P3 (arrived at 2) and P4 (arrived at 3) are both waiting. FCFS runs P3 first. SJF runs P4 first because its burst is shorter. P4 waits 5 instead of 13, but P3 waits 12 instead of 6. SJF is more efficient overall but less fair to the long job.

**Idle example:** P1 arrives at 2 and P2 arrives at 10. Both algorithms leave the CPU idle from 0 to 2 and from 5 to 10, because arrival time can leave the CPU with nothing to run.

## 3. Which algorithm was the most challenging to implement?

SJF was harder than FCFS. FCFS only needs a sort by arrival time. SJF has to decide again after every process finishes:

- Which processes have arrived by the current clock time?
- Which of them has the smallest burst?
- How are ties broken (earlier arrival first, then input order)?
- What happens when no process has arrived yet (an IDLE gap)?

Getting these decisions right, while keeping results in the original input order, was the hardest part.

## 4. What would I add to improve the simulator?

- More algorithms: Round Robin, Shortest Remaining Time First (SRTF), and Priority scheduling (priority is already collected)
- Side-by-side comparison of two algorithms on the same input
- Step-by-step animation of the CPU running
- Extra metrics such as CPU utilization and throughput

## 5. How does simulation help me understand real operating systems?

1. **Scheduling is a trade-off.** SJF gave a better average, but it made P3 wait longer. Real operating systems balance efficiency, fairness, and starvation.
2. In FCFS, one long process delays all the others (the convoy effect). This shows why real schedulers do not rely on arrival order alone.
3. he CPU can sit idle when no process has arrived, which the Gantt chart makes visible.
4. Response time equals waiting time in both of our algorithms because nothing can interrupt a running process.