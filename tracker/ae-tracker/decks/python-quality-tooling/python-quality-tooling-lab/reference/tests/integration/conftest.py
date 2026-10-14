"""Fixtures only the integration tests need: a fixed clock and a CLI runner."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

import pytest

from leafy_ingest.cli import main

RunCli = Callable[[Path], tuple[int, Path]]


@pytest.fixture
def fixed_clock() -> Callable[[], datetime]:
    """A clock that always says 2026-03-09 06:00 UTC."""
    return lambda: datetime(2026, 3, 9, 6, 0, tzinfo=UTC)


@pytest.fixture
def run_cli(tmp_path: Path, fixed_clock: Callable[[], datetime]) -> RunCli:
    """Factory: run the CLI on a file, writing into tmp_path/out; returns (exit code, out)."""

    def run(input_path: Path) -> tuple[int, Path]:
        out = tmp_path / "out"
        return main([str(input_path), "--out", str(out)], clock=fixed_clock), out

    return run
