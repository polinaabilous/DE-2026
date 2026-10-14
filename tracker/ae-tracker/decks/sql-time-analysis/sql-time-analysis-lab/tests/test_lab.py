"""Tests for the lab: the SQL must match the hand calculation in README.md and an independent Python implementation."""
import csv
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

LAB = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LAB))
import run_lab  # noqa: E402

CHICAGO = ZoneInfo("America/Chicago")
LOADED_AT = datetime(2026, 4, 20, 15, 0)
LAST_COMPLETE = date(2026, 3, 1)

# Derived by hand in README.md ("Check it by hand").
EXPECTED_MATRIX = [
    (date(2026, 1, 1), 4, 100.0, 50.0, 50.0, None),
    (date(2026, 2, 1), 3, 100.0, 33.3, None, None),
    (date(2026, 3, 1), 2, 100.0, None, None, None),
]
EXPECTED_FUNNEL = {"viewed": 5, "carted": 4, "purchased": 2}
EXPECTED_CONVERTED = {1, 8}


@pytest.fixture(scope="module")
def con():
    return run_lab.build()


def month_of(ts_utc):
    local = ts_utc.replace(tzinfo=timezone.utc).astimezone(CHICAGO)
    return date(local.year, local.month, 1)


def months_between(a, b):
    return (b.year - a.year) * 12 + (b.month - a.month)


def read_events():
    with open(LAB / "data" / "events.csv", newline="", encoding="utf-8") as f:
        rows = {(r["event_id"], r["user_id"], r["event_name"], r["event_at_utc"]) for r in csv.DictReader(f)}
    return [(int(u), name, datetime.fromisoformat(ts)) for _, u, name, ts in rows if u]


def python_matrix():
    months = defaultdict(set)
    for user, _, ts in read_events():
        months[user].add(month_of(ts))
    cohort = {u: min(ms) for u, ms in months.items()}
    out = []
    for c in sorted({m for m in cohort.values() if m <= LAST_COMPLETE}):
        members = [u for u, m in cohort.items() if m == c]
        row = [c, len(members)]
        for age in range(4):
            if months_between(c, LAST_COMPLETE) < age:
                row.append(None)
            else:
                active = sum(1 for u in members if any(months_between(c, m) == age for m in months[u]))
                row.append(round(100.0 * active / len(members), 1))
        out.append(tuple(row))
    return out


def python_funnel():
    lo = datetime(2026, 3, 1, tzinfo=CHICAGO).astimezone(timezone.utc).replace(tzinfo=None)
    hi = datetime(2026, 4, 1, tzinfo=CHICAGO).astimezone(timezone.utc).replace(tzinfo=None)
    by_user = defaultdict(list)
    for user, name, ts in read_events():
        by_user[user].append((ts, name))
    result = {}
    for user, evs in by_user.items():
        views = sorted(ts for ts, n in evs if n == "view_product" and lo <= ts < hi)
        if not views:
            continue
        t1 = views[0]
        end = t1 + timedelta(days=7)
        t2 = min((ts for ts, n in evs if n == "add_to_cart" and t1 <= ts <= end), default=None)
        t3 = None if t2 is None else min((ts for ts, n in evs if n == "purchase" and t2 <= ts <= end), default=None)
        result[user] = (t1, t2, t3)
    return result


def test_matrix_matches_hand_calculation(con):
    assert [tuple(r) for r in con.sql(run_lab.MATRIX).fetchall()] == EXPECTED_MATRIX


def test_matrix_matches_python_reference(con):
    assert [tuple(r) for r in con.sql(run_lab.MATRIX).fetchall()] == python_matrix()


def test_month_zero_is_the_whole_cohort(con):
    bad = con.sql("SELECT * FROM cohort_cells WHERE month_number = 0 AND active_users <> cohort_size").fetchall()
    assert bad == []


def test_censored_cells_are_null_not_zero(con):
    rows = con.sql("""SELECT cohort_month, month_number, active_users FROM cohort_cells
                      WHERE cohort_month + to_months(month_number) > DATE '2026-03-01'""").fetchall()
    assert rows and all(active is None for _, _, active in rows)


def test_user_4_belongs_to_january_in_chicago_time(con):
    assert con.sql("SELECT cohort_month FROM cohorts WHERE user_id = 4").fetchone()[0] == date(2026, 1, 1)


def test_funnel_counts(con):
    viewed, carted, purchased = con.sql("SELECT viewed, carted, purchased FROM funnel_summary").fetchone()
    assert {"viewed": viewed, "carted": carted, "purchased": purchased} == EXPECTED_FUNNEL


def test_funnel_matches_python_reference(con):
    sql = {u: (t1, t2, t3) for u, t1, t2, t3, _ in con.sql(run_lab.FUNNEL_USERS).fetchall()}
    assert sql == python_funnel()
    assert {u for u, (_, _, t3) in sql.items() if t3} == EXPECTED_CONVERTED


def test_every_entry_is_mature(con):
    assert con.sql("SELECT all_entries_mature FROM funnel_summary").fetchone()[0] is True
