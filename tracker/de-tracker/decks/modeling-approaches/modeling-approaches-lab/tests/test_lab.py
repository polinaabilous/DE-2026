"""Lab tests: every model answers the same question with the same hand-checked numbers."""
import sys
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from run_lab import LOADS, MODELS, build, load_vault_batch, question  # noqa: E402

D = Decimal
HAND_ANSWER = [                       # worked out by hand from data/*.csv (README, "Check it by hand first")
    ("hobbyist", "Succulent", D("36.00")), ("hobbyist", "Tools", D("12.00")), ("hobbyist", "Tropical", D("60.00")),
    ("pro", "Succulent", D("52.00")), ("pro", "Tools", D("12.00")), ("pro", "Tropical", D("105.00")),
    ("unknown", "Tropical", D("15.00")),
]


@pytest.fixture(scope="module")
def con():
    return build()


@pytest.mark.parametrize("model", MODELS)
def test_q1_matches_hand_answer(con, model):
    assert question(con, f"q1_{model}").fetchall() == HAND_ANSWER


def test_obt_keeps_the_fact_grain(con):
    fact = con.sql("SELECT count(*), sum(line_revenue) FROM fct_order_line").fetchone()
    obt = con.sql("SELECT count(*), sum(line_revenue) FROM obt_order_lines").fetchone()
    assert fact == obt == (13, D("292.00"))


def test_shipping_is_summed_at_order_grain(con):
    right = con.sql("SELECT sum(shipping_fee) FROM fct_order").fetchone()[0]
    wrong = con.sql("""SELECT sum(o.shipping_fee) FROM fct_order_line AS l
                       JOIN fct_order AS o USING (order_id)""").fetchone()[0]
    assert right == D("37.50") and wrong == D("42.50")      # the fan-out the OBT avoids by leaving shipping out


def test_as_was_and_as_is_differ_only_for_the_customer_who_changed(con):
    rows = con.sql("""SELECT customer_id, order_id, segment_at_order, segment_current FROM obt_order_lines
                      WHERE segment_at_order <> segment_current ORDER BY order_id""").fetchall()
    assert rows == [("C-002", "O-1002", "hobbyist", "pro")]


def test_vault_reload_is_idempotent(con):
    tables = [r[0] for r in con.sql("""SELECT table_name FROM duckdb_tables()
                                       WHERE regexp_matches(table_name, '^(hub|link|sat)_')""").fetchall()]
    count = lambda: {t: con.sql(f"SELECT count(*) FROM {t}").fetchone()[0] for t in tables}  # noqa: E731
    before = count()
    load_vault_batch(con, LOADS[-1])                          # replay the last batch
    assert count() == before


def test_vault_hub_has_one_row_per_normalized_key(con):
    keys = [r[0] for r in con.sql("SELECT customer_id FROM hub_customer ORDER BY customer_id").fetchall()]
    assert keys == ["<unknown>", "C-001", "C-002", "C-003", "C-004", "C-005", "C-006"]


def test_stream_funnel_first_view_to_order_within_7_days(con):
    rows = question(con, "q3_stream").fetchall()
    assert [(r[0], r[3]) for r in rows] == [("C-001", True), ("C-002", True), ("C-003", True),
                                            ("C-004", False), ("C-005", True)]
