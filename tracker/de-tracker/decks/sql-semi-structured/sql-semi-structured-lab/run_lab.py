"""run_lab.py: build the lab views in DuckDB from sql/*.sql and print the results."""
import os
from pathlib import Path

import duckdb

LAB = Path(__file__).resolve().parent


def build(con):
    for path in sorted((LAB / "sql").glob("*.sql")):
        con.execute(path.read_text(encoding="utf-8"))


def show(con, title, query):
    rel = con.sql(query)
    rows = [["NULL" if v is None else str(v) for v in row] for row in rel.fetchall()]
    widths = [max(len(c), *(len(r[i]) for r in rows)) for i, c in enumerate(rel.columns)]
    print("\n== " + title)
    print("  ".join(c.ljust(w) for c, w in zip(rel.columns, widths)))
    for r in rows:
        print("  ".join(v.ljust(w) for v, w in zip(r, widths)))


def main():
    os.chdir(LAB)                      # the SQL reads data/... relative to the lab folder
    con = duckdb.connect()
    build(con)
    show(con, "coverage", "SELECT ingredients_state, products FROM ingredient_coverage ORDER BY 1")
    show(con, "nutrient values that are not numbers", "SELECT * FROM nutrient_issues ORDER BY ALL")
    show(con, "top ingredients by distinct products",
         "SELECT * FROM products_per_ingredient ORDER BY products DESC, ingredient_id LIMIT 6")


if __name__ == "__main__":
    main()
