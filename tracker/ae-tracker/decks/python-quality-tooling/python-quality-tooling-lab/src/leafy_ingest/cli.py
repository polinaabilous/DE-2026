"""Command line: python -m leafy_ingest.cli INPUT --out DIR."""

from __future__ import annotations

import argparse
import os
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path

from leafy_ingest.core import TooManyRejectsError, check_reject_rate, validate_lines
from leafy_ingest.files import read_lines, write_outputs
from leafy_ingest.frames import to_frame, validate_frame

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


def max_reject_rate() -> float:
    return float(os.environ.get("LEAFY_MAX_REJECT_RATE", "0.25"))


def main(argv: Sequence[str] | None = None, clock: Clock = utc_now) -> int:
    parser = argparse.ArgumentParser(prog="leafy-ingest")
    parser.add_argument("input", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)

    if not args.input.is_file():
        print(f"error: no such file: {args.input.name}")
        return 1
    result = validate_lines(read_lines(args.input))
    try:
        check_reject_rate(result, max_reject_rate())
    except TooManyRejectsError as error:
        print(f"error: {error}")
        return 2
    frame = validate_frame(to_frame(result.valid))
    manifest = {
        "source": args.input.name,
        "run_at_utc": clock().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "lines_read": result.lines_read,
        "valid": len(result.valid),
        "rejected": len(result.rejected),
        "duplicates": result.duplicates,
    }
    write_outputs(args.out, frame, result.rejected, manifest)
    print(
        f"{len(result.valid)} valid, {len(result.rejected)} rejected, "
        f"{result.duplicates} duplicates -> {args.out.name}"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
