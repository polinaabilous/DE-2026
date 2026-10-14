"""replay.py: replay the week. For each day: land that day's files, then run one dbt command.

    python scripts/replay.py 2026-03-02 2026-03-05 run --select fct_reviews_naive
"""
import shutil
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

# the dbt executable of this virtual environment (falls back to dbt on PATH)
DBT = shutil.which("dbt", path=str(Path(sys.executable).parent)) or "dbt"

start, end, *dbt_args = sys.argv[1:]
day, last = date.fromisoformat(start), date.fromisoformat(end)
while day <= last:
    subprocess.run([sys.executable, "scripts/load_day.py", day.isoformat()], check=True, capture_output=True)
    result = subprocess.run([DBT, *dbt_args, "--quiet"])        # --quiet: dbt prints errors only
    print(f"{day}: files landed; dbt {' '.join(dbt_args)} -> {'ok' if result.returncode == 0 else 'FAILED'}", flush=True)
    if result.returncode != 0:
        sys.exit(1)
    day += timedelta(days=1)
