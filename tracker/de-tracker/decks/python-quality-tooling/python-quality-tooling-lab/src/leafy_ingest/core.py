"""Pure core: text lines in, valid events and rejects out. No files, no clock, no env."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field

from pydantic import ValidationError

from leafy_ingest.models import OrderEvent


@dataclass(frozen=True)
class Rejected:
    line_no: int
    reason: str
    detail: str
    raw: str


@dataclass
class BatchResult:
    valid: list[OrderEvent] = field(default_factory=list)
    rejected: list[Rejected] = field(default_factory=list)
    duplicates: int = 0

    @property
    def lines_read(self) -> int:
        return len(self.valid) + len(self.rejected) + self.duplicates

    @property
    def reject_rate(self) -> float:
        return len(self.rejected) / self.lines_read if self.lines_read else 0.0


class TooManyRejectsError(Exception):
    """The share of rejected lines suggests a format change upstream."""


def reason_of(error: ValidationError) -> tuple[str, str]:
    """First error -> ('type:location', message). Location 'record' = a whole-model rule."""
    first = error.errors(include_url=False)[0]
    where = ".".join(str(part) for part in first["loc"]) or "record"
    return f"{first['type']}:{where}", first["msg"]


def parse_line(line_no: int, line: str, raw_limit: int = 500) -> OrderEvent | Rejected:
    try:
        return OrderEvent.model_validate_json(line)
    except ValidationError as error:
        reason, detail = reason_of(error)
        return Rejected(line_no, reason, detail, line[:raw_limit])


def validate_lines(lines: Iterable[str]) -> BatchResult:
    """Validate every non-blank line; keep the first copy of each event_id."""
    result = BatchResult()
    seen: set[str] = set()
    for line_no, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        parsed = parse_line(line_no, line)
        if isinstance(parsed, Rejected):
            result.rejected.append(parsed)
        elif parsed.event_id in seen:
            result.duplicates += 1
        else:
            seen.add(parsed.event_id)
            result.valid.append(parsed)
    return result


def check_reject_rate(result: BatchResult, limit: float) -> None:
    if result.reject_rate > limit:
        raise TooManyRejectsError(
            f"{len(result.rejected)} of {result.lines_read} lines rejected "
            f"({result.reject_rate:.0%} > limit {limit:.0%})"
        )
