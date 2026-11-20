"""Comprehensive backend test suite.

Covers the scheduling engine, metric calculations, the scheduler registry, and
every API validation rule. Everything lives in this single module by request.
"""

from pathlib import Path
from typing import Any

import pytest
from app.main import app
from app.scheduler import Process, UnknownAlgorithmError, run_algorithm
from app.scheduler.models import IDLE_PID
from fastapi.testclient import TestClient

client = TestClient(app)

VERIFICATION = [
    Process("P1", 0, 5, 1),
    Process("P2", 1, 3, 2),
    Process("P3", 2, 8, 3),
    Process("P4", 3, 6, 4),
]

VERIFICATION_JSON = [
    {"pid": "P1", "arrival": 0, "burst": 5, "priority": 1},
    {"pid": "P2", "arrival": 1, "burst": 3, "priority": 2},
    {"pid": "P3", "arrival": 2, "burst": 8, "priority": 3},
    {"pid": "P4", "arrival": 3, "burst": 6, "priority": 4},
]


def gantt_tuples(result: Any) -> list[tuple[str, int, int]]:
    """Convert Gantt segments to comparable tuples."""
    return [(segment.pid, segment.start, segment.end) for segment in result.gantt]


def results_by_pid(result: Any) -> dict[str, Any]:
    """Index per-process results by PID."""
    return {item.pid: item for item in result.results}


def post_simulate(algorithm: str, processes: list[dict[str, Any]]) -> Any:
    """Send a simulate request with the given algorithm and process rows."""
    return client.post(
        "/api/simulate",
        json={"algorithm": algorithm, "processes": processes},
    )


def single_process(**overrides: Any) -> dict[str, Any]:
    """Build one valid process payload, allowing field overrides."""
    row: dict[str, Any] = {"pid": "P1", "arrival": 0, "burst": 1, "priority": 0}
    row.update(overrides)
    return row


def assert_single_error(response: Any, *, row: int | None, field: str | None, message: str) -> None:
    """Assert a 422 response contains exactly the expected flat error."""
    assert response.status_code == 422
    assert response.json() == {"errors": [{"row": row, "field": field, "message": message}]}


class TestMetrics:
    """Metric formulas, averaging, ordering, and scheduler isolation."""

    def test_single_result_formula(self) -> None:
        from app.scheduler.metrics import build_result

        result = build_result(Process("P1", 2, 3, 1), start=5)
        assert (result.completion, result.turnaround) == (8, 6)
        assert (result.waiting, result.response) == (3, 3)
        assert result.pid == "P1"
        assert result.arrival == 2
        assert result.burst == 3
        assert result.priority == 1

    def test_response_equals_waiting_for_non_preemptive(self) -> None:
        for algorithm in ("fcfs", "sjf"):
            result = run_algorithm(algorithm, VERIFICATION)
            for item in result.results:
                assert item.response == item.waiting

    def test_averages_are_rounded_to_two_decimals(self) -> None:
        processes = [Process("P1", 0, 1), Process("P2", 0, 2), Process("P3", 0, 4)]
        result = run_algorithm("fcfs", processes)
        waiting = [item.waiting for item in result.results]
        assert waiting == [0, 1, 3]
        assert result.averages.waiting == 1.33
        assert result.averages.turnaround == 3.67
        assert result.total_time == 7

    def test_results_follow_input_order(self) -> None:
        shuffled = [VERIFICATION[3], VERIFICATION[0], VERIFICATION[2], VERIFICATION[1]]
        result = run_algorithm("fcfs", shuffled)
        assert [item.pid for item in result.results] == ["P4", "P1", "P3", "P2"]

    def test_unknown_algorithm_raises(self) -> None:
        with pytest.raises(UnknownAlgorithmError):
            run_algorithm("round_robin", VERIFICATION)

    def test_scheduler_package_has_no_web_imports(self) -> None:
        scheduler_dir = Path(__file__).resolve().parents[1] / "app" / "scheduler"
        for path in scheduler_dir.glob("*.py"):
            source = path.read_text(encoding="utf-8").lower()
            assert "fastapi" not in source, path.name
            assert "pydantic" not in source, path.name


class TestFCFS:
    """First-Come, First-Served behavior."""

    def test_verification_dataset(self) -> None:
        result = run_algorithm("fcfs", VERIFICATION)
        assert gantt_tuples(result) == [
            ("P1", 0, 5),
            ("P2", 5, 8),
            ("P3", 8, 16),
            ("P4", 16, 22),
        ]
        assert [item.completion for item in result.results] == [5, 8, 16, 22]
        assert [item.turnaround for item in result.results] == [5, 7, 14, 19]
        assert [item.waiting for item in result.results] == [0, 4, 6, 13]
        assert [item.response for item in result.results] == [0, 4, 6, 13]
        assert result.averages.waiting == 5.75
        assert result.averages.turnaround == 11.25
        assert result.total_time == 22

    def test_idle_gaps(self) -> None:
        processes = [Process("P1", 2, 3), Process("P2", 10, 2)]
        result = run_algorithm("fcfs", processes)
        assert gantt_tuples(result) == [
            (IDLE_PID, 0, 2),
            ("P1", 2, 5),
            (IDLE_PID, 5, 10),
            ("P2", 10, 12),
        ]
        assert [item.waiting for item in result.results] == [0, 0]
        assert result.averages.turnaround == 2.5
        assert result.total_time == 12

    def test_single_process(self) -> None:
        result = run_algorithm("fcfs", [Process("Solo", 5, 4)])
        assert gantt_tuples(result) == [(IDLE_PID, 0, 5), ("Solo", 5, 9)]
        item = result.results[0]
        assert (item.waiting, item.response, item.turnaround) == (0, 0, 4)

    def test_all_arrive_at_zero_follows_input_order(self) -> None:
        processes = [Process("P1", 0, 5), Process("P2", 0, 1), Process("P3", 0, 3)]
        result = run_algorithm("fcfs", processes)
        assert gantt_tuples(result) == [("P1", 0, 5), ("P2", 5, 6), ("P3", 6, 9)]

    def test_unsorted_input_scheduling_is_stable(self) -> None:
        shuffled = [VERIFICATION[2], VERIFICATION[0], VERIFICATION[3], VERIFICATION[1]]
        ordered = run_algorithm("fcfs", VERIFICATION)
        mixed = run_algorithm("fcfs", shuffled)
        assert gantt_tuples(ordered) == gantt_tuples(mixed)
        assert [item.pid for item in mixed.results] == ["P3", "P1", "P4", "P2"]
        assert mixed.averages == ordered.averages

    def test_never_emits_zero_length_segments(self) -> None:
        result = run_algorithm("fcfs", [Process("P1", 0, 2), Process("P2", 2, 2)])
        assert all(segment.end > segment.start for segment in result.gantt)


class TestSJF:
    """Non-preemptive Shortest Job First behavior."""

    def test_verification_dataset(self) -> None:
        result = run_algorithm("sjf", VERIFICATION)
        assert gantt_tuples(result) == [
            ("P1", 0, 5),
            ("P2", 5, 8),
            ("P4", 8, 14),
            ("P3", 14, 22),
        ]
        assert [item.completion for item in result.results] == [5, 8, 22, 14]
        assert [item.turnaround for item in result.results] == [5, 7, 20, 11]
        assert [item.waiting for item in result.results] == [0, 4, 12, 5]
        assert [item.response for item in result.results] == [0, 4, 12, 5]
        assert result.averages.waiting == 5.25
        assert result.averages.turnaround == 10.75
        assert result.total_time == 22

    def test_idle_at_start(self) -> None:
        processes = [Process("P1", 2, 3), Process("P2", 10, 2)]
        result = run_algorithm("sjf", processes)
        assert gantt_tuples(result) == [
            (IDLE_PID, 0, 2),
            ("P1", 2, 5),
            (IDLE_PID, 5, 10),
            ("P2", 10, 12),
        ]
        assert [item.waiting for item in result.results] == [0, 0]
        assert result.averages.turnaround == 2.5

    def test_tie_break_by_arrival_then_input_order(self) -> None:
        processes = [
            Process("P1", 0, 4),
            Process("P2", 1, 2),
            Process("P3", 1, 2),
        ]
        result = run_algorithm("sjf", processes)
        assert gantt_tuples(result) == [("P1", 0, 4), ("P2", 4, 6), ("P3", 6, 8)]

    def test_tie_break_identical_arrival_and_burst_uses_input_order(self) -> None:
        processes = [
            Process("P1", 0, 3),
            Process("P2", 0, 3),
            Process("P3", 0, 3),
        ]
        result = run_algorithm("sjf", processes)
        assert gantt_tuples(result) == [("P1", 0, 3), ("P2", 3, 6), ("P3", 6, 9)]

    def test_all_arrive_at_zero_sorts_by_burst(self) -> None:
        processes = [Process("P1", 0, 5), Process("P2", 0, 2), Process("P3", 0, 1)]
        result = run_algorithm("sjf", processes)
        assert gantt_tuples(result) == [("P3", 0, 1), ("P2", 1, 3), ("P1", 3, 8)]

    def test_diverges_from_fcfs(self) -> None:
        fcfs_order = [segment.pid for segment in run_algorithm("fcfs", VERIFICATION).gantt]
        sjf_order = [segment.pid for segment in run_algorithm("sjf", VERIFICATION).gantt]
        assert fcfs_order == ["P1", "P2", "P3", "P4"]
        assert sjf_order == ["P1", "P2", "P4", "P3"]

    def test_short_job_does_not_preempt_running_process(self) -> None:
        processes = [Process("Long", 0, 10), Process("Short", 1, 1)]
        result = run_algorithm("sjf", processes)
        assert gantt_tuples(result) == [("Long", 0, 10), ("Short", 10, 11)]
        assert results_by_pid(result)["Short"].waiting == 9

    def test_unsorted_input_scheduling_is_stable(self) -> None:
        shuffled = [VERIFICATION[1], VERIFICATION[3], VERIFICATION[0], VERIFICATION[2]]
        ordered = run_algorithm("sjf", VERIFICATION)
        mixed = run_algorithm("sjf", shuffled)
        assert gantt_tuples(ordered) == gantt_tuples(mixed)
        assert [item.pid for item in mixed.results] == ["P2", "P4", "P1", "P3"]
        assert mixed.averages == ordered.averages

    def test_response_equals_waiting(self) -> None:
        result = run_algorithm("sjf", VERIFICATION)
        assert all(item.response == item.waiting for item in result.results)


class TestHealth:
    """Health endpoint."""

    def test_health(self) -> None:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestSimulateSuccess:
    """Successful API responses with exact verification values."""

    def test_fcfs_success(self) -> None:
        response = post_simulate("fcfs", VERIFICATION_JSON)
        assert response.status_code == 200
        assert response.json() == {
            "algorithm": "fcfs",
            "gantt": [
                {"pid": "P1", "start": 0, "end": 5},
                {"pid": "P2", "start": 5, "end": 8},
                {"pid": "P3", "start": 8, "end": 16},
                {"pid": "P4", "start": 16, "end": 22},
            ],
            "results": [
                {
                    "pid": "P1",
                    "arrival": 0,
                    "burst": 5,
                    "priority": 1,
                    "completion": 5,
                    "turnaround": 5,
                    "waiting": 0,
                    "response": 0,
                },
                {
                    "pid": "P2",
                    "arrival": 1,
                    "burst": 3,
                    "priority": 2,
                    "completion": 8,
                    "turnaround": 7,
                    "waiting": 4,
                    "response": 4,
                },
                {
                    "pid": "P3",
                    "arrival": 2,
                    "burst": 8,
                    "priority": 3,
                    "completion": 16,
                    "turnaround": 14,
                    "waiting": 6,
                    "response": 6,
                },
                {
                    "pid": "P4",
                    "arrival": 3,
                    "burst": 6,
                    "priority": 4,
                    "completion": 22,
                    "turnaround": 19,
                    "waiting": 13,
                    "response": 13,
                },
            ],
            "averages": {"waiting": 5.75, "turnaround": 11.25},
            "total_time": 22,
        }

    def test_sjf_success(self) -> None:
        response = post_simulate("sjf", VERIFICATION_JSON)
        assert response.status_code == 200
        body = response.json()
        assert body["algorithm"] == "sjf"
        assert body["gantt"] == [
            {"pid": "P1", "start": 0, "end": 5},
            {"pid": "P2", "start": 5, "end": 8},
            {"pid": "P4", "start": 8, "end": 14},
            {"pid": "P3", "start": 14, "end": 22},
        ]
        assert [item["completion"] for item in body["results"]] == [5, 8, 22, 14]
        assert [item["turnaround"] for item in body["results"]] == [5, 7, 20, 11]
        assert [item["waiting"] for item in body["results"]] == [0, 4, 12, 5]
        assert [item["response"] for item in body["results"]] == [0, 4, 12, 5]
        assert body["averages"] == {"waiting": 5.25, "turnaround": 10.75}
        assert body["total_time"] == 22

    def test_priority_is_optional_and_defaults_to_zero(self) -> None:
        response = post_simulate(
            "fcfs",
            [
                {"pid": "P1", "arrival": 0, "burst": 2},
                {"pid": "P2", "arrival": 0, "burst": 1},
            ],
        )
        assert response.status_code == 200
        assert [item["priority"] for item in response.json()["results"]] == [0, 0]

    def test_priority_does_not_affect_scheduling(self) -> None:
        low = post_simulate(
            "fcfs",
            [
                {"pid": "P1", "arrival": 0, "burst": 5, "priority": 1},
                {"pid": "P2", "arrival": 0, "burst": 2, "priority": 9},
            ],
        ).json()
        high = post_simulate(
            "fcfs",
            [
                {"pid": "P1", "arrival": 0, "burst": 5, "priority": 9},
                {"pid": "P2", "arrival": 0, "burst": 2, "priority": 1},
            ],
        ).json()
        assert low["gantt"] == high["gantt"]
        scheduling_fields = (
            "pid",
            "arrival",
            "burst",
            "completion",
            "turnaround",
            "waiting",
            "response",
        )
        low_metrics = [{key: item[key] for key in scheduling_fields} for item in low["results"]]
        high_metrics = [{key: item[key] for key in scheduling_fields} for item in high["results"]]
        assert low_metrics == high_metrics

    def test_pid_is_trimmed(self) -> None:
        response = post_simulate("fcfs", [single_process(pid="  P1  ")])
        assert response.status_code == 200
        assert response.json()["results"][0]["pid"] == "P1"

    def test_idle_segment_is_returned_by_the_api(self) -> None:
        response = post_simulate(
            "sjf",
            [
                {"pid": "P1", "arrival": 2, "burst": 3},
                {"pid": "P2", "arrival": 10, "burst": 2},
            ],
        )
        assert response.status_code == 200
        assert response.json()["gantt"][0] == {"pid": "IDLE", "start": 0, "end": 2}
        assert response.json()["total_time"] == 12


class TestValidation:
    """Every request validation rule, with row numbers and readable messages."""

    def test_empty_process_list(self) -> None:
        response = post_simulate("fcfs", [])
        assert_single_error(
            response,
            row=None,
            field="processes",
            message="At least one process is required.",
        )

    def test_missing_process_list(self) -> None:
        response = client.post("/api/simulate", json={"algorithm": "fcfs"})
        assert_single_error(
            response,
            row=None,
            field="processes",
            message="At least one process is required.",
        )

    def test_process_list_has_wrong_type(self) -> None:
        response = client.post(
            "/api/simulate",
            json={"algorithm": "fcfs", "processes": "P1"},
        )
        assert_single_error(
            response,
            row=None,
            field="processes",
            message="Processes must be a list of process objects.",
        )

    def test_process_item_is_not_an_object(self) -> None:
        response = post_simulate("fcfs", ["P1"])
        assert_single_error(
            response,
            row=1,
            field=None,
            message="Process 1 must be a JSON object.",
        )

    def test_missing_pid(self) -> None:
        row = single_process()
        del row["pid"]
        assert_single_error(
            post_simulate("fcfs", [row]),
            row=1,
            field="pid",
            message="Process ID is required.",
        )

    def test_missing_arrival(self) -> None:
        row = single_process()
        del row["arrival"]
        assert_single_error(
            post_simulate("fcfs", [row]),
            row=1,
            field="arrival",
            message="Arrival time is required.",
        )

    def test_missing_burst(self) -> None:
        row = single_process()
        del row["burst"]
        assert_single_error(
            post_simulate("fcfs", [row]),
            row=1,
            field="burst",
            message="Burst time is required.",
        )

    def test_missing_algorithm(self) -> None:
        response = client.post("/api/simulate", json={"processes": [single_process()]})
        assert_single_error(
            response,
            row=None,
            field="algorithm",
            message="Algorithm must be 'fcfs' or 'sjf'.",
        )

    def test_unknown_algorithm(self) -> None:
        response = post_simulate("priority", [single_process()])
        assert_single_error(
            response,
            row=None,
            field="algorithm",
            message="Algorithm must be 'fcfs' or 'sjf'.",
        )

    def test_null_algorithm(self) -> None:
        response = client.post(
            "/api/simulate",
            json={"algorithm": None, "processes": [single_process()]},
        )
        assert_single_error(
            response,
            row=None,
            field="algorithm",
            message="Algorithm must be 'fcfs' or 'sjf'.",
        )

    def test_negative_arrival(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival=-1)]),
            row=1,
            field="arrival",
            message="Arrival time cannot be negative.",
        )

    def test_arrival_too_large(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival=100001)]),
            row=1,
            field="arrival",
            message="Arrival time cannot exceed 100000.",
        )

    def test_arrival_float_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival=1.5)]),
            row=1,
            field="arrival",
            message="Arrival time must be a whole number.",
        )

    def test_arrival_integral_float_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival=5.0)]),
            row=1,
            field="arrival",
            message="Arrival time must be a whole number.",
        )

    def test_arrival_string_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival="5")]),
            row=1,
            field="arrival",
            message="Arrival time must be a whole number.",
        )

    def test_arrival_null_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival=None)]),
            row=1,
            field="arrival",
            message="Arrival time is required.",
        )

    def test_arrival_boolean_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(arrival=True)]),
            row=1,
            field="arrival",
            message="Arrival time must be a whole number.",
        )

    def test_burst_zero(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(burst=0)]),
            row=1,
            field="burst",
            message="Burst time must be greater than 0.",
        )

    def test_burst_float_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(burst=2.5)]),
            row=1,
            field="burst",
            message="Burst time must be a whole number.",
        )

    def test_burst_too_large(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(burst=100001)]),
            row=1,
            field="burst",
            message="Burst time cannot exceed 100000.",
        )

    def test_negative_priority(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(priority=-1)]),
            row=1,
            field="priority",
            message="Priority cannot be negative.",
        )

    def test_priority_float_is_rejected(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(priority=1.5)]),
            row=1,
            field="priority",
            message="Priority must be a whole number.",
        )

    def test_duplicate_pid_is_reported_on_later_row(self) -> None:
        response = post_simulate(
            "fcfs",
            [
                {"pid": "P1", "arrival": 0, "burst": 1},
                {"pid": "p1", "arrival": 0, "burst": 1},
            ],
        )
        assert_single_error(
            response,
            row=2,
            field="pid",
            message=("Duplicate process ID 'p1'. Process IDs must be unique (case-insensitive)."),
        )

    def test_idle_pid_is_reserved(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(pid="IDLE")]),
            row=1,
            field="pid",
            message="Process ID cannot be 'IDLE' because it is reserved for idle time.",
        )

    def test_idle_pid_is_reserved_case_insensitively(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(pid="idle")]),
            row=1,
            field="pid",
            message="Process ID cannot be 'IDLE' because it is reserved for idle time.",
        )

    def test_blank_pid(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(pid="   ")]),
            row=1,
            field="pid",
            message="Process ID is required.",
        )

    def test_pid_too_long(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(pid="P123456789012345678901")]),
            row=1,
            field="pid",
            message="Process ID cannot be longer than 20 characters.",
        )

    def test_pid_must_be_text(self) -> None:
        assert_single_error(
            post_simulate("fcfs", [single_process(pid=5)]),
            row=1,
            field="pid",
            message="Process ID must be text.",
        )

    def test_more_than_100_processes(self) -> None:
        rows = [{"pid": f"P{index}", "arrival": 0, "burst": 1} for index in range(1, 102)]
        assert_single_error(
            post_simulate("fcfs", rows),
            row=None,
            field="processes",
            message="At most 100 processes are allowed.",
        )

    def test_multiple_errors_report_each_row(self) -> None:
        response = post_simulate(
            "fcfs",
            [
                {"pid": "P1", "arrival": 0, "burst": 0},
                {"pid": "P2", "arrival": -3, "burst": 2},
            ],
        )
        assert response.status_code == 422
        assert response.json() == {
            "errors": [
                {
                    "row": 1,
                    "field": "burst",
                    "message": "Burst time must be greater than 0.",
                },
                {
                    "row": 2,
                    "field": "arrival",
                    "message": "Arrival time cannot be negative.",
                },
            ]
        }

    def test_malformed_json(self) -> None:
        response = client.post(
            "/api/simulate",
            content=b'{"algorithm": "fcfs", "processes": [',
            headers={"Content-Type": "application/json"},
        )
        assert_single_error(
            response,
            row=None,
            field=None,
            message="Request body is not valid JSON.",
        )
