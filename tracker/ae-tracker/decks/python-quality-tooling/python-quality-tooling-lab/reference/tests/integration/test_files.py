"""The file reader on real files: one parametrized fixture, two line-ending styles."""

from __future__ import annotations

from pathlib import Path

import pytest

from leafy_ingest.core import validate_lines
from leafy_ingest.files import read_lines

pytestmark = pytest.mark.integration


@pytest.fixture(params=["\n", "\r\n"], ids=["LF", "CRLF"])
def day_file(request: pytest.FixtureRequest, tmp_path: Path, day_lines: tuple[str, ...]) -> Path:
    """Every test that uses this fixture runs twice: once per line ending."""
    path = tmp_path / "day.jsonl"
    path.write_bytes((request.param.join(day_lines) + request.param).encode("utf-8"))
    return path


def test_reader_handles_both_line_endings(day_file: Path) -> None:
    result = validate_lines(read_lines(day_file))
    assert (len(result.valid), len(result.rejected), result.duplicates) == (12, 2, 1)
