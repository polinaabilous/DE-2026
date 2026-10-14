# Lab: load Leafy’s order changes safely

Part of the deck *SQL warehouse writes: MERGE, idempotent loads and incremental patterns* (slides 24–25).
Everything runs offline in DuckDB (1.4 or later, for `MERGE`).

## The task

Four daily extract files in `data/` contain changed orders from Leafy’s shop database
(`change_seq, op, order_id, customer_id, order_date, status, amount, updated_at`; `op` is
`I`, `U` or `D`). Load them into two warehouse tables so that the load is safe to re-run:

- `fct_orders`: one row per order; deletes kept as tombstones (`is_deleted`).
- `agg_daily_sales`: one row per `order_date` with orders and revenue (excluding cancelled,
  refunded and deleted orders).

The files contain the traps from the deck: two versions of one order in a batch, an exact
duplicate, a NULL key, a hard delete, a late-arriving order for an old date, and changes that
arrive after newer ones.

## Files

| Path | What it is |
|---|---|
| `data/batch_1.csv` … `batch_4.csv`, `data/batches.csv` | the four extracts and their extract times |
| `sql/01_schema.sql` | tables (`CREATE TABLE IF NOT EXISTS`) |
| `sql/02_stage.sql` | read one file, quarantine NULL keys, keep the newest row per order |
| `sql/03_affected.sql` | order dates the batch can change (new and old) |
| `sql/04_merge_orders.sql` | `MERGE` with a version guard and tombstones |
| `sql/05_refresh_daily_sales.sql` | delete+insert of the affected days |
| `sql/90_reconcile.sql` | full rebuild from every file, and the comparison |
| `load.py` | the CLI: one transaction per batch, a `load_log`, `--force`, `--reconcile` |
| `tests/test_lab.py` | pytest: re-runs, order independence, late data, reconcile, rollback |

## Run it

```text
python -m pip install "duckdb>=1.4" pytest
python load.py --db leafy_dw.duckdb data/batch_1.csv data/batch_2.csv data/batch_3.csv data/batch_4.csv
python load.py --db leafy_dw.duckdb data/batch_2.csv --force
python load.py --db leafy_dw.duckdb --reconcile
python -m pytest -q
```

## Expected results

- After all four batches: 9 orders in `fct_orders` (one tombstone: 105), order 107 `refunded`,
  order 109 present.
- `agg_daily_sales`: 2026-03-01 → 3 orders, 80.00; 2026-03-02 → 1, 60.00; 2026-03-03 → 2, 51.00.
- Re-running any batch with `--force` changes 0 rows; `--reconcile` prints `RECONCILE OK`.
- All 7 tests pass.

## Stretch goals

1. Add a `first_seen_at` column that the MERGE sets on insert and never overwrites.
2. Add a check that fails the batch when more than 10 % of its rows are quarantined.
3. Port `04_merge_orders.sql` to T-SQL for Fabric Warehouse (no `DO NOTHING`: move the guard
   into each `WHEN MATCHED` branch).

`leafy_dw.duckdb` is created on the first run; delete it to start again.
