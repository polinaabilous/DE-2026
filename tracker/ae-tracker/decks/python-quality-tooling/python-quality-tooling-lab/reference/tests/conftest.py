"""Fixtures shared by every test below this folder (pytest finds them; no import needed)."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

FIXTURES = Path(__file__).parent / "fixtures"

EventFactory = Callable[..., str]


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    """Folder with the sample files: tests/fixtures next to this conftest."""
    return FIXTURES


@pytest.fixture(scope="session")
def day_lines(fixtures_dir: Path) -> tuple[str, ...]:
    """The 2026-03-08 sample day, read once per run. A tuple, so no test can mutate it."""
    text = (fixtures_dir / "orders_2026-03-08.jsonl").read_text(encoding="utf-8")
    return tuple(text.splitlines())


@pytest.fixture
def make_event() -> EventFactory:
    """Factory fixture: returns a function that builds one valid JSON line per call."""
    counter = iter(range(1, 1000))

    def make(*, drop: tuple[str, ...] = (), **overrides: Any) -> str:
        event: dict[str, Any] = {
            "event_id": f"T-{next(counter):03d}",
            "order_id": "O-9001",
            "customer_id": "C-01",
            "event_type": "order_placed",
            "amount": "12.00",
            "currency": "USD",
            "occurred_at": "2026-03-08T12:00:00Z",
            "items": [{"sku": "PLT-101", "qty": 1, "unit_price": "12.00"}],
        }
        event.update(overrides)
        return json.dumps({k: v for k, v in event.items() if k not in drop})

    return make
