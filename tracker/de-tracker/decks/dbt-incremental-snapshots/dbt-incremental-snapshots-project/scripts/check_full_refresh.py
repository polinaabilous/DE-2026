"""check_full_refresh.py: is an incremental table equal to a full rebuild of the same model?

    python scripts/check_full_refresh.py fct_reviews

1. `dbt compile --full-refresh` renders the model with is_incremental() = false (the full SELECT);
2. that SELECT and the existing table are compared in both directions with EXCEPT, plus row counts.
Exit code 0 if they are equivalent, 1 if not. Read-only: nothing is rebuilt.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import duckdb

model = sys.argv[1]
dbt = shutil.which("dbt", path=str(Path(sys.executable).parent)) or "dbt"
subprocess.run([dbt, "compile", "--select", model, "--full-refresh", "--quiet"], check=True, stdout=subprocess.DEVNULL)
manifest = json.loads(Path("target/manifest.json").read_text(encoding="utf-8"))
node = next(n for n in manifest["nodes"].values() if n["resource_type"] == "model" and n["name"] == model)
full_sql, table = node["compiled_code"], node["relation_name"]

with duckdb.connect("leafy.duckdb", read_only=True) as con:
    n_table = con.sql(f"select count(*) from {table}").fetchone()[0]
    n_full = con.sql(f"select count(*) from ({full_sql})").fetchone()[0]
    only_table = con.sql(f"select * from {table} except select * from ({full_sql})")
    only_full = con.sql(f"select * from ({full_sql}) except select * from {table}")
    a, b = len(only_table.fetchall()), len(only_full.fetchall())
    print(f"{model}: incremental table {n_table} rows, full rebuild {n_full} rows")
    print(f"only in the incremental table: {a} rows")
    if a:
        print(only_table)
    print(f"only in a full rebuild: {b} rows")
    if b:
        print(only_full)
    ok = a == 0 and b == 0 and n_table == n_full
    print("EQUIVALENT" if ok else "DIFFERENT")
sys.exit(0 if ok else 1)
