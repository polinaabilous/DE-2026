"""Unit tests for the pure core: lines in, results out."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from leafy_ingest.core import (
    BatchResult,
    Rejected,
    TooManyRejectsError,
    check_reject_rate,
    parse_line,
    validate_lines,
)

EXPECTED_BAD_REASONS = [
    "missing:customer_id",
    "greater_than_equal:amount",
    "timezone_aware:occurred_at",
    "json_invalid:record",
    "value_error:record",
    "literal_error:event_type",
    "decimal_max_places:amount",
    "string_pattern_mismatch:items.0.sku",
    "model_type:record",
    "literal_error:currency",
]


def test_sample_day_counts(day_lines: tuple[str, ...]) -> None:
    result = validate_lines(day_lines)
    assert (len(result.valid), len(result.rejected), result.duplicates) == (12, 2, 1)
    assert result.lines_read == 15  # the blank line is skipped, not counted


def test_sample_day_reject_reasons(day_lines: tuple[str, ...]) -> None:
    rejected = validate_lines(day_lines).rejected
    assert [(r.line_no, r.reason) for r in rejected] == [
        (8, "missing:customer_id"),
        (14, "timezone_aware:occurred_at"),
    ]


def test_every_bad_line_gets_its_reason(fixtures_dir: Path) -> None:
    lines = (fixtures_dir / "bad_lines.jsonl").read_text(encoding="utf-8").splitlines()
    result = validate_lines(lines)
    assert result.valid == []
    assert [r.reason for r in result.rejected] == EXPECTED_BAD_REASONS


def test_first_copy_of_a_duplicate_wins(make_event: Any) -> None:
    first = make_event(event_id="E-1", amount="12.00")
    later = make_event(event_id="E-1", event_type="order_paid", items=[])
    result = validate_lines([first, later])
    assert [e.event_type for e in result.valid] == ["order_placed"]
    assert result.duplicates == 1


def test_raw_text_is_truncated_in_quarantine() -> None:
    rejected = parse_line(7, "x" * 1000, raw_limit=50)
    assert isinstance(rejected, Rejected)
    assert (rejected.line_no, len(rejected.raw)) == (7, 50)


def test_empty_input_has_zero_reject_rate() -> None:
    assert validate_lines([]).reject_rate == 0.0


@pytest.mark.parametrize(("limit", "fails"), [(0.10, True), (0.134, False), (0.25, False)])
def test_reject_rate_limit(day_lines: tuple[str, ...], limit: float, fails: bool) -> None:
    result = validate_lines(day_lines)  # 2 of 15 = 13.3 %
    if fails:
        with pytest.raises(TooManyRejectsError, match="2 of 15 lines rejected"):
            check_reject_rate(result, limit)
    else:
        check_reject_rate(result, limit)


def test_batch_result_defaults_are_independent() -> None:
    a, b = BatchResult(), BatchResult()
    a.rejected.append(Rejected(1, "r", "d", "raw"))
    assert b.rejected == []
    assert json.dumps(a.reject_rate) == "1.0"
