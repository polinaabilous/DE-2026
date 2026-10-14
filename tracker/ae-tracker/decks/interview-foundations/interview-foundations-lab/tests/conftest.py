import importlib
import os
from pathlib import Path

import pytest

DATA = Path(__file__).resolve().parent.parent / "data"


def impl(module):
    """Import your session module, or the reference one when PRACTICE_IMPL=solutions."""
    package = "solutions.python" if os.environ.get("PRACTICE_IMPL") == "solutions" else "python_sessions"
    return importlib.import_module(package + "." + module)


@pytest.fixture
def event_lines():
    return (DATA / "events.jsonl").read_text(encoding="utf-8").splitlines()
