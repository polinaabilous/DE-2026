"""Integration tests: the real CLI, real files in tmp_path, a fixed clock."""

from __future__ import annotations

import csv
import json
from collections.abc import Callable
from pathlib import Path

import pytest

from leafy_ingest.cli import main, utc_now

RunCli = Callable[[Path], tuple[int, Path]]

pytestmark = pytest.mark.integration


def test_sample_day_end_to_end(
    run_cli: RunCli, fixtures_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code, out = run_cli(fixtures_dir / "orders_2026-03-08.jsonl")
    assert code == 0
    assert capsys.readouterr().out == "12 valid, 2 rejected, 1 duplicates -> out\n"
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    assert manifest == {
        "source": "orders_2026-03-08.jsonl",
        "run_at_utc": "2026-03-09T06:00:00Z",
        "lines_read": 15,
        "valid": 12,
        "rejected": 2,
        "duplicates": 1,
    }
    with (out / "order_events.csv").open(encoding="utf-8", newline="") as f:
        assert len(list(csv.DictReader(f))) == 12
    quarantine = (out / "quarantine.jsonl").read_text(encoding="utf-8").splitlines()
    reasons = [json.loads(line)["reason"] for line in quarantine]
    assert reasons == ["missing:customer_id", "timezone_aware:occurred_at"]


def test_reject_limit_from_environment(
    run_cli: RunCli, fixtures_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LEAFY_MAX_REJECT_RATE", "0.05")
    code, out = run_cli(fixtures_dir / "orders_2026-03-08.jsonl")
    assert code == 2
    assert not out.exists()  # nothing is published when the batch is refused


def test_missing_input_file(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main([str(tmp_path / "nope.jsonl"), "--out", str(tmp_path)]) == 1
    assert "no such file: nope.jsonl" in capsys.readouterr().out


def test_real_clock_is_utc() -> None:
    assert utc_now().utcoffset() is not None
