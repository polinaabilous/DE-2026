"""Build the lab models in an in-memory DuckDB database and print the cohort matrix and the funnel."""
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
SQL_FILES = ["01_staging.sql", "02_cohort_matrix.sql", "03_funnel.sql"]

MATRIX = """PIVOT (SELECT cohort_month, cohort_size, 'm' || month_number AS age, retention_pct
       FROM cohort_cells)
ON age USING first(retention_pct)
GROUP BY cohort_month, cohort_size
ORDER BY cohort_month"""
FUNNEL_USERS = "SELECT user_id, t1, t2, t3, mature FROM funnel_users ORDER BY user_id"
FUNNEL = "SELECT * FROM funnel_summary"


def build():
    con = duckdb.connect()
    con.execute("SET TimeZone = 'UTC'")
    con.execute(f"SET file_search_path = '{HERE.as_posix()}'")     # data/events.csv is read relative to the lab
    for name in SQL_FILES:
        con.execute((HERE / "sql" / name).read_text(encoding="utf-8"))
    return con


def show(con, title, sql):
    rel = con.sql(sql)
    rows = [["NULL" if v is None else str(v) for v in r] for r in rel.fetchall()]
    cols = rel.columns
    widths = [max(len(c), *(len(r[i]) for r in rows)) for i, c in enumerate(cols)]
    print(title)
    print("  ".join(c.ljust(w) for c, w in zip(cols, widths)))
    for r in rows:
        print("  ".join(v.ljust(w) for v, w in zip(r, widths)))
    print()


if __name__ == "__main__":
    con = build()
    show(con, "Cohort matrix (% of cohort active, Chicago months, NULL = not observed yet)", MATRIX)
    show(con, "Funnel per user (March entries)", FUNNEL_USERS)
    show(con, "Funnel summary", FUNNEL)
