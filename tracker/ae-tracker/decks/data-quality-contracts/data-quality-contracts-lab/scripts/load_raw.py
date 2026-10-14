"""load_raw.py: the EL step (bronze). Land the raw files in DuckDB unchanged, as text.

    python scripts/load_raw.py                         # everything in data/raw; newest file landed 1 hour ago
    python scripts/load_raw.py --through 2026-03-04    # replay: only the files up to that day
    python scripts/load_raw.py --lag-hours 30          # pretend the newest file landed 30 hours ago
    python scripts/load_raw.py --incident truncated    # also land data/incidents/truncated/ (day 2026-03-08)

raw.events    one row per delivered web event, as sent by the web app
raw.payments  one row per payment in the payment provider's daily settlement files
Both get _source_file, _batch_date (the delivery day in the file name) and _loaded_at.

_loaded_at is when a file landed. Here it is simulated relative to the clock so freshness checks give
the same result on any day: the newest file landed --lag-hours ago, each earlier one 24 hours before.
"""
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
import duckdb

EVENT_COLUMNS = {"event_id": "VARCHAR", "user_id": "VARCHAR", "event_type": "VARCHAR",
                 "ts": "VARCHAR", "amount": "VARCHAR", "product_id": "VARCHAR",
                 "amount_cents": "VARCHAR", "app_version": "VARCHAR"}   # app 2.0 (2026-03-08)

ap = argparse.ArgumentParser()
ap.add_argument("--through", default="9999-12-31", help="last delivery day to land (YYYY-MM-DD)")
ap.add_argument("--lag-hours", type=float, default=1.0, help="hours since the newest file landed")
ap.add_argument("--incident", help="folder under data/incidents/ to land as well")
a = ap.parse_args()


def files(pattern):
    """Files for one source, keyed by delivery day; an incident file replaces the normal one for its day."""
    found = {p.stem[-10:]: p for p in Path("data/raw").glob(pattern)}
    if a.incident:
        found.update({p.stem[-10:]: p for p in Path("data/incidents", a.incident).glob(pattern)})
    return [found[d].as_posix() for d in sorted(found) if d <= a.through]


events, payments = files("events_*.jsonl"), files("payments/settlement_*.csv")
newest = max(Path(f).stem[-10:] for f in events + payments)
landed = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=a.lag_hours)
META = rf"""parse_filename(filename) as _source_file,
            cast(regexp_extract(filename, '(\d{{4}}-\d{{2}}-\d{{2}})', 1) as date) as _batch_date"""
LOADED = f"timestamp '{landed:%Y-%m-%d %H:%M:%S}' - to_days(cast(date '{newest}' - _batch_date as integer))"

with duckdb.connect("leafy.duckdb") as con:
    con.execute("create schema if not exists raw")
    con.execute(f"""
        create or replace table raw.events as
        select *, {LOADED} as _loaded_at from (
            select * exclude (filename), {META}
            from read_json({events}, format = 'newline_delimited', filename = true, columns = {EVENT_COLUMNS}))""")
    con.execute(f"""
        create or replace table raw.payments as
        select *, {LOADED} as _loaded_at from (
            select * exclude (filename), {META}
            from read_csv({payments}, header = true, all_varchar = true, filename = true))""")
    for table in ("events", "payments"):
        n, files_, last = con.sql(f"select count(*), count(distinct _source_file), max(_batch_date) from raw.{table}").fetchone()
        print(f"raw.{table:<9} {n:>3} rows from {files_} files, newest delivery {last}")
    print(f"newest files landed {a.lag_hours:g} h ago" + (f" (incident: {a.incident})" if a.incident else ""))
