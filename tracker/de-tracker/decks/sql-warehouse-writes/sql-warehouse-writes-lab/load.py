"""load.py: load Leafy order-change batches into DuckDB, safely re-runnable.

    python load.py --db leafy_dw.duckdb data/batch_1.csv data/batch_2.csv
    python load.py --db leafy_dw.duckdb data/batch_2.csv --force     # re-apply a loaded batch
    python load.py --db leafy_dw.duckdb --reconcile                  # compare with a full rebuild
"""
import argparse
import re
import sys
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
SQL = HERE / "sql"
STEPS = ["02_stage.sql", "03_affected.sql", "04_merge_orders.sql", "05_refresh_daily_sales.sql"]


def run_file(con, name):
    """Run every statement of a SQL file; return the result of the last one."""
    return con.execute((SQL / name).read_text(encoding="utf-8")).fetchall()


def connect(db):
    con = duckdb.connect(str(db))
    run_file(con, "01_schema.sql")
    return con


def load_batch(con, path, force=False):
    path = Path(path)
    batch_id = int(re.search(r"batch_(\d+)", path.name).group(1))
    con.execute("BEGIN TRANSACTION")
    try:
        if not force and con.execute("SELECT count(*) FROM load_log WHERE batch_id = ?",
                                     [batch_id]).fetchone()[0]:
            con.execute("ROLLBACK")
            return f"{path.name}: skipped (already loaded; use --force to re-apply)"
        con.execute(f"SET VARIABLE batch_id = {batch_id}")
        con.execute("SET VARIABLE batch_file = '" + str(path).replace("'", "''") + "'")
        run_file(con, "02_stage.sql")
        run_file(con, "03_affected.sql")
        merged = run_file(con, "04_merge_orders.sql")[0][0]
        run_file(con, "05_refresh_daily_sales.sql")
        rows, bad = con.execute("SELECT count(*), count(*) FILTER (WHERE order_id IS NULL) "
                                "FROM stg_raw").fetchone()
        days = con.execute("SELECT count(*) FROM affected").fetchone()[0]
        con.execute("DELETE FROM load_log WHERE batch_id = ?", [batch_id])
        con.execute("INSERT INTO load_log VALUES (?, ?, ?, ?, ?)",
                    [batch_id, path.name, rows, merged, days])
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    return (f"{path.name}: {rows} rows ({bad} quarantined), {merged} merged, "
            f"{days} days refreshed")


def reconcile(con, data_dir=HERE / "data"):
    pattern = str(Path(data_dir) / "batch_*.csv").replace("'", "''")
    con.execute("SET VARIABLE all_files = '" + pattern + "'")
    return run_file(con, "90_reconcile.sql")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("files", nargs="*", help="batch files to load, in the order given")
    ap.add_argument("--db", default="leafy_dw.duckdb")
    ap.add_argument("--force", action="store_true", help="re-apply batches already in load_log")
    ap.add_argument("--reconcile", action="store_true", help="compare with a full rebuild")
    a = ap.parse_args(argv)
    con = connect(a.db)
    for f in a.files:
        print(load_batch(con, f, a.force))
    if a.reconcile:
        rows = reconcile(con)
        for table, extra, missing in rows:
            print(f"reconcile {table:<16} only in table: {extra}   only in rebuild: {missing}")
        if any(extra or missing for _, extra, missing in rows):
            print("RECONCILE FAILED")
            return 1
        print("RECONCILE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
