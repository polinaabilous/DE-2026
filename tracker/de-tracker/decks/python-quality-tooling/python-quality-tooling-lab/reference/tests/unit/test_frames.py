"""Unit tests for the pandera batch contract."""

from __future__ import annotations

import pandera.errors
import pytest

from leafy_ingest.core import validate_lines
from leafy_ingest.frames import to_frame, validate_frame


def test_sample_day_frame_passes(day_lines: tuple[str, ...]) -> None:
    frame = validate_frame(to_frame(validate_lines(day_lines).valid))
    assert len(frame) == 12
    assert frame["amount_cents"].sum() == 25_00 * 3 + 31_50 * 2 + 42_00 * 2 + 12_00 * 2
    e006 = frame.loc[frame["event_id"] == "E-006"]
    assert e006["occurred_at_utc"].item() == "2026-03-08T13:00:00Z"  # +01:00 normalised to UTC


def test_two_placed_events_for_one_order_fail(day_lines: tuple[str, ...]) -> None:
    frame = to_frame(validate_lines(day_lines).valid)
    frame.loc[frame["event_id"] == "E-005", "order_id"] = "O-1001"  # now O-1001 is placed twice
    with pytest.raises(pandera.errors.SchemaErrors) as info:
        validate_frame(frame)
    assert "one_placed_event_per_order" in set(info.value.failure_cases["check"])


def test_lazy_validation_reports_every_failure(day_lines: tuple[str, ...]) -> None:
    frame = to_frame(validate_lines(day_lines).valid)
    frame.loc[0, "amount_cents"] = -1
    frame.loc[1, "business_date"] = "08/03/2026"
    frame["extra"] = "x"
    with pytest.raises(pandera.errors.SchemaErrors) as info:
        validate_frame(frame)
    checks = set(info.value.failure_cases["check"])
    assert {"greater_than_or_equal_to(0)", "column_in_schema"} <= checks
    assert any(c.startswith("str_matches") for c in checks)
