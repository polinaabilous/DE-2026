"""load_day.py: the EL step for this deck. Land everything that had arrived by DAY (bronze).

    python scripts/load_day.py 2026-03-04

raw.reviews           = every daily review file up to DAY (text columns, as delivered),
                        with _source_file and _loaded_at (the file landed at 23:00 UTC that day)
raw.supplier_products = the latest full catalogue extract up to DAY (the supplier overwrites it)
"""
import sys
from pathlib import Path
import duckdb

day = sys.argv[1]
reviews = sorted(p.as_posix() for p in Path("data/raw/reviews").glob("reviews_*.jsonl") if p.stem[-10:] <= day)
feeds = sorted(p.as_posix() for p in Path("data/raw/supplier").glob("products_*.jsonl") if p.stem[-10:] <= day)

with duckdb.connect("leafy.duckdb") as con:
    con.execute("create schema if not exists raw")
    con.execute(rf"""
        create or replace table raw.reviews as
        select * exclude (filename),
               parse_filename(filename) as _source_file,
               cast(regexp_extract(filename, '(\d{{4}}-\d{{2}}-\d{{2}})', 1) as date) + interval 23 hour as _loaded_at
        from read_json({reviews}, format = 'newline_delimited', filename = true,
                       columns = {{review_id: 'VARCHAR', product_id: 'VARCHAR', user_id: 'VARCHAR',
                                  rating: 'VARCHAR', rating_scale: 'VARCHAR', body: 'VARCHAR',
                                  submitted_at: 'VARCHAR', edited_at: 'VARCHAR'}})
    """)
    con.execute(f"""
        create or replace table raw.supplier_products as
        select * from read_json('{feeds[-1]}', format = 'newline_delimited',
                                columns = {{barcode: 'VARCHAR', product_name: 'VARCHAR', brand: 'VARCHAR',
                                           label: 'VARCHAR', npk: 'VARCHAR', last_modified_at: 'TIMESTAMP'}})
    """)
    n_rev = con.sql("select count(*) from raw.reviews").fetchone()[0]
    n_sup = con.sql("select count(*) from raw.supplier_products").fetchone()[0]
    print(f"{day}: raw.reviews {n_rev} rows from {len(reviews)} files; "
          f"raw.supplier_products {n_sup} rows from {Path(feeds[-1]).name}")
