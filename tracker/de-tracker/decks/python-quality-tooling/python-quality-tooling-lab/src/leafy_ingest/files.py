"""Imperative shell: the only module that touches the file system."""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pandas as pd

from leafy_ingest.core import Rejected


def read_lines(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\n")


def write_outputs(
    out_dir: Path, frame: pd.DataFrame, rejected: list[Rejected], manifest: dict[str, Any]
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    frame.to_csv(out_dir / "order_events.csv", index=False, lineterminator="\n")
    with (out_dir / "quarantine.jsonl").open("w", encoding="utf-8", newline="\n") as f:
        for r in rejected:
            f.write(json.dumps(asdict(r), sort_keys=True) + "\n")
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
