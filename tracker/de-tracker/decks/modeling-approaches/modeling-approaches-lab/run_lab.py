"""Build the five Leafy sales models in an in-memory DuckDB database and compare their answers.

Usage (inside this folder):  python run_lab.py
Import:                      from run_lab import build; con = build()
"""
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
SQL = HERE / "sql"
LOADS = ["2026-03-16 06:00:00", "2026-04-01 06:00:00"]      # the two landed batches
MODELS = ["inmon_3nf", "star", "obt", "vault", "stream"]
TABLE_GROUPS = {                                             # which stored tables belong to which model
    "inmon_3nf": "table_name LIKE 'edw\\_%' ESCAPE '\\'",
    "star": "table_name LIKE 'dim\\_%' ESCAPE '\\' OR table_name LIKE 'fct\\_%' ESCAPE '\\'",
    "obt": "table_name LIKE 'obt\\_%' ESCAPE '\\'",
    "vault": "regexp_matches(table_name, '^(hub|link|sat)_')",
    "stream": "table_name LIKE '%\\_stream' ESCAPE '\\'",
}


def run_file(con, name):
    con.execute((SQL / name).read_text(encoding="utf-8"))


def load_vault_batch(con, load_ts):
    """Load one landed batch into the raw vault. Safe to re-run: unchanged rows are skipped."""
    con.execute(f"SET VARIABLE load_ts = TIMESTAMP '{load_ts}'")
    run_file(con, "05_vault_load.sql")


def build():
    con = duckdb.connect()
    con.execute("SET TimeZone = 'UTC'")
    con.execute(f"SET file_search_path = '{HERE.as_posix()}'")   # data/*.csv resolve relative to the lab
    for name in ["00_staging.sql", "01_inmon_3nf.sql", "02_star.sql", "03_obt.sql", "04_vault_ddl.sql"]:
        run_file(con, name)
    for load_ts in LOADS:
        load_vault_batch(con, load_ts)
    run_file(con, "06_vault_mart.sql")
    run_file(con, "07_stream.sql")
    return con


def question(con, name):
    return con.sql((SQL / "questions" / f"{name}.sql").read_text(encoding="utf-8"))


def storage(con):
    """Tables and stored rows per model."""
    parts = [f"""SELECT '{m}' AS model, count(*) AS tables, sum(estimated_size) AS rows_stored
                 FROM duckdb_tables() WHERE {cond}""" for m, cond in TABLE_GROUPS.items()]
    return con.sql(" UNION ALL ".join(parts) + " ORDER BY model")


def show(title, rel):
    rows = [["NULL" if v is None else str(v) for v in r] for r in rel.fetchall()]
    cols = rel.columns
    widths = [max(len(c), *(len(r[i]) for r in rows)) for i, c in enumerate(cols)]
    print(title)
    print("  ".join(c.ljust(w) for c, w in zip(cols, widths)).rstrip())
    for r in rows:
        print("  ".join(v.ljust(w) for v, w in zip(r, widths)).rstrip())
    print()


if __name__ == "__main__":
    con = build()
    answers = {m: question(con, f"q1_{m}").fetchall() for m in MODELS}
    show("Q1: March revenue by segment at order time and category (star)", question(con, "q1_star"))
    print("All five models agree:", all(answers[m] == answers["star"] for m in MODELS), "-", ", ".join(MODELS))
    print()
    show("Q3: first product view -> order within 7 days (activity stream)", question(con, "q3_stream"))
    show("Tables and rows stored per model", storage(con))
