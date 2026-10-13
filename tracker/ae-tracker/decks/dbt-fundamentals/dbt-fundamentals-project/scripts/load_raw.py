"""load_raw.py: the EL step. Land the raw JSONL files in DuckDB unchanged, as text (bronze)."""
import duckdb

with duckdb.connect("leafy.duckdb") as con:
    con.execute("create schema if not exists raw")
    con.execute("""
        create or replace table raw.events as
        select * exclude (filename), parse_filename(filename) as _source_file
        from read_json('data/raw/events_*.jsonl', format = 'newline_delimited', filename = true,
                       columns = {event_id: 'VARCHAR', user_id: 'VARCHAR', event_type: 'VARCHAR',
                                  ts: 'VARCHAR', amount: 'VARCHAR', product_id: 'VARCHAR'})
    """)
    for file, n in con.sql("select _source_file, count(*) from raw.events group by 1 order by 1").fetchall():
        print(f"{file}: {n} rows")
    print("total:", con.sql("select count(*) from raw.events").fetchone()[0])
