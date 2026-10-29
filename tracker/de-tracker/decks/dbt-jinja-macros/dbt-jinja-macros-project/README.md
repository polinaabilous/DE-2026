# Leafy: a small dbt + DuckDB project, refactored with Jinja

The reproducible project from the deck *dbt Jinja and macros* (dbt series, deck 2 of 2).
It starts from `dbt-fundamentals-project` (deck 1) and adds a Jinja loop
(`fct_daily_funnel`, driven by the `funnel_event_types` variable) and a macro (`to_utc`).
Raw plant-shop events (JSON Lines) become a tested star schema: `fct_orders`,
`fct_daily_funnel`, `dim_customer`, `dim_product`, `dim_date`.

Tested with dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), Python 3.12.

## Run it

    python -m venv .venv
    .venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
    python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0
    python scripts/load_raw.py            # EL: land data/raw/*.jsonl in raw.events
    dbt debug                             # uses profiles.yml in this folder
    dbt build                             # expect: PASS=41 WARN=1 ERROR=0 SKIP=0
    dbt docs generate                     # target/index.html, manifest.json, catalog.json
    dbt docs serve                        # optional, interactive: http://localhost:8080

Run every command from this folder. The DuckDB file `leafy.duckdb` is created here.

## Expected results

- `fct_orders`: 7 rows, total amount 175.99; 2 orders on the unknown customer.
- The one warning is `assert_no_unparseable_amounts` (event e7, amount "abc").

## Layout

- `models/staging`: views; one per source table (rename, cast, clean, dedupe)
- `models/intermediate`: ephemeral building blocks
- `models/marts`: tables at a declared grain (facts and dimensions)
- `seeds`: customers and products; `tests`: singular tests; `macros`: `to_utc`
