"""pytest tests for the lab: run from the lab folder with  python -m pytest -q"""
import sys
from pathlib import Path

import pytest

LAB = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LAB))
import load  # noqa: E402

DATA = LAB / "data"
ALL = [DATA / f"batch_{i}.csv" for i in (1, 2, 3, 4)]


@pytest.fixture
def con(tmp_path):
    c = load.connect(tmp_path / "test.duckdb")
    yield c
    c.close()


def fingerprint(con):
    return con.execute("""SELECT
        (SELECT md5(string_agg(f::VARCHAR, ',' ORDER BY f::VARCHAR)) FROM fct_orders f),
        (SELECT md5(string_agg(a::VARCHAR, ',' ORDER BY a::VARCHAR)) FROM agg_daily_sales a),
        (SELECT count(*) FROM quarantine)""").fetchone()


def load_all(con, files, force=False):
    for f in files:
        load.load_batch(con, f, force=force)


def test_final_tables(con):
    load_all(con, ALL)
    assert con.execute("SELECT count(*), count(*) FILTER (WHERE is_deleted) FROM fct_orders").fetchone() == (9, 1)
    assert con.execute("SELECT order_id, count(*) FROM fct_orders GROUP BY 1 HAVING count(*) > 1").fetchall() == []
    rows = con.execute("SELECT order_date::VARCHAR, orders, revenue::VARCHAR FROM agg_daily_sales ORDER BY 1").fetchall()
    assert rows == [("2026-03-01", 3, "80.00"), ("2026-03-02", 1, "60.00"), ("2026-03-03", 2, "51.00")]


def test_rerun_changes_nothing(con):
    load_all(con, ALL)
    before = fingerprint(con)
    load_all(con, [ALL[1], ALL[3]], force=True)          # retry batches 2 and 4
    assert fingerprint(con) == before


def test_second_run_is_skipped_by_the_log(con):
    load_all(con, ALL)
    assert "skipped" in load.load_batch(con, ALL[0])


def test_late_and_out_of_order_changes(con):
    load_all(con, ALL)
    q = "SELECT status, change_seq, is_deleted FROM fct_orders WHERE order_id = ?"
    assert con.execute(q, [107]).fetchone() == ("refunded", 17, False)   # stale 'shipped' ignored
    assert con.execute(q, [105]).fetchone() == ("placed", 10, True)      # not resurrected
    assert con.execute(q, [109]).fetchone() == ("placed", 15, False)     # late insert arrived


def test_any_order_gives_the_same_tables(con, tmp_path):
    load_all(con, ALL)
    other = load.connect(tmp_path / "reverse.duckdb")
    load_all(other, list(reversed(ALL)))
    assert fingerprint(other) == fingerprint(con)
    other.close()


def test_reconcile_passes_and_catches_drift(con):
    load_all(con, ALL)
    assert all(extra == missing == 0 for _, extra, missing in load.reconcile(con))
    con.execute("UPDATE fct_orders SET amount = 99 WHERE order_id = 101")   # simulate drift
    assert any(extra or missing for _, extra, missing in load.reconcile(con))


def test_failed_batch_leaves_no_trace(con, monkeypatch):
    load_all(con, ALL[:1])
    before = fingerprint(con)
    real = load.run_file

    def failing(c, name):
        if name == "05_refresh_daily_sales.sql":
            raise RuntimeError("simulated crash after the merge")
        return real(c, name)

    monkeypatch.setattr(load, "run_file", failing)
    with pytest.raises(RuntimeError):
        load.load_batch(con, ALL[1])
    assert fingerprint(con) == before
    assert con.execute("SELECT count(*) FROM load_log WHERE batch_id = 2").fetchone()[0] == 0
