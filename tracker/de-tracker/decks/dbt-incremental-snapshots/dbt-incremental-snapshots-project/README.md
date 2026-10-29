# Leafy: incremental models, snapshots and tests (dbt + DuckDB)

The finished project of the deck *dbt incremental models, snapshots and unit tests* (dbt series, gap deck).
It starts from `dbt-jinja-macros-project` and adds:

- `fct_reviews`: an incremental model (merge on `review_id`) with a 3-day look-back window
  (`review_lookback_days` in `dbt_project.yml`) so late and edited reviews are merged, not lost;
- `supplier_products_snapshot`: an SCD2 snapshot of the supplier catalogue (check strategy,
  `hard_deletes: new_record`, far-future `dbt_valid_to` for current rows) and `dim_supplier_product` on top;
- three unit tests (dedupe order, the incremental look-back boundary, rating conversion);
- data tests with thresholds, `where` and `store_failures`, dbt_utils and dbt_expectations tests,
  and a singular test (one current version per barcode).

Tested with dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), Python 3.12.10, on Windows 11.

## Run it (the lab)

    python -m venv .venv
    .venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
    python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0
    $env:DBT_PROFILES_DIR = (Get-Location).Path      # use profiles.yml in this folder
    python scripts/load_raw.py                       # website events from the earlier decks
    dbt deps                                         # dbt_utils, dbt_expectations (+ dbt_date)
    python scripts/load_day.py 2026-03-02            # day 1 of reviews and the supplier extract
    dbt build --exclude-resource-type unit_test      # first build: tables must exist before unit tests
    python scripts/replay.py 2026-03-03 2026-03-05 build   # days 2-4: land files, dbt build
    dbt build                                        # a rerun of day 4 changes nothing
    python scripts/check_full_refresh.py fct_reviews # expect: EQUIVALENT

Keep the folder path short on Windows: `dbt deps` unpacks packages several folders deep.

## Expected results (day 4, 2026-03-05)

- `Done. PASS=58 WARN=3 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=61`. The three warnings are expected: event e7 has
  amount "abc" (earlier decks), review r5 has no rating, and review r7 is by customer u6, who is missing
  from the CRM seed (stored in `main_dbt_test__audit`).
- `fct_reviews`: 9 rows, average rating 3.75; includes the late review r9.
- `supplier_products_snapshot`: 7 rows; `dim_supplier_product`: 3 live products, B200 discontinued.
- `python scripts/load_day.py 2026-03-06` lands r10, a week late: the 3-day window misses it and
  `check_full_refresh.py` reports DIFFERENT (exercise 4 of the deck shows the repair).

## Layout

- `models/staging`: views; `stg_reviews` dedupes deliveries (latest edit wins) and converts ratings
- `models/marts`: `fct_reviews` (incremental), `dim_supplier_product` (SCD2), plus the earlier star schema
- `snapshots`: `supplier_products.yml`; `tests`: singular tests; `macros`: `to_utc`
- `scripts`: `load_day.py` (land files up to a day), `replay.py` (day-by-day runs),
  `check_full_refresh.py` (incremental table vs a full rebuild)
