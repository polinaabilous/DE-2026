"""Tests for the lab: the linter catches every planted problem, and the model redesign passes."""
import importlib

import pytest

from chartkit import contrast_ratio, fmt_change, fmt_money, headline, q
from dashlint import lint


def results(module):
    fig, meta = importlib.import_module(module).build()
    return {name: ok for name, ok, _ in lint(fig, meta)}, meta


def test_before_dashboard_fails_every_automated_check():
    res, _ = results("before_dashboard")
    assert sorted(k for k, ok in res.items() if ok) == []


def test_model_redesign_passes_every_automated_check():
    res, _ = results("solutions.redesign_solution")
    assert sorted(k for k, ok in res.items() if not ok) == []


def test_headline_agrees_with_the_data():
    _, meta = results("solutions.redesign_solution")
    (n0,), (n1,) = q("""SELECT SUM(net_sales) FROM 'data/weekly_platform.csv' WHERE days_in_data = 7
                        GROUP BY week_start ORDER BY week_start DESC LIMIT 2""")[::-1]
    assert meta["headline"] == headline("Net sales", n1, n0)
    assert fmt_money(n1) in meta["headline"]


@pytest.mark.parametrize("x, text", [(17428.16, "$17.4K"), (999_950, "$1.0M"), (-640.4, "-$640"), (0, "$0")])
def test_fmt_money(x, text):
    assert fmt_money(x) == text


def test_change_and_contrast():
    assert fmt_change(0.1236, 0.1493, "points") == "▼2.6 pts"
    assert round(contrast_ratio("black", "white"), 1) == 21.0
    assert contrast_ratio("#b0b0b0") < 4.5 <= contrast_ratio("#56605a")
