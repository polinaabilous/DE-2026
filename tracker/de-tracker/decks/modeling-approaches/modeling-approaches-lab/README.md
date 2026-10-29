# Lab: one question, five models, one test suite

Companion lab for the deck *Modeling approaches: star, One Big Table, Data Vault, Activity Schema and Inmon*
(slides 22–23).

**Task.** Leafy (a plant shop) landed six files from two sources in two batches (`data/`). Build the same question,
*March 2026 revenue by customer segment at the time of the order and product category*, as five models:

1. an **Inmon-style 3NF** integration layer (`sql/01_inmon_3nf.sql`),
2. a **Kimball star** with an SCD2 customer dimension (`sql/02_star.sql`),
3. a **One Big Table** built from the star (`sql/03_obt.sql`),
4. a **Data Vault** (hubs, links, satellites) loaded batch by batch, with an information mart (`sql/04`–`06`),
5. an **Activity Schema** stream (`sql/07_stream.sql`),

then prove they all return the hand-checked answer, push one change through all five, and write a one-page
OBT-vs-star decision (`templates/obt-vs-star-decision.md`). Everything is offline, synthetic and deterministic.
All timestamps are UTC.

## Run it

```text
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest
python run_lab.py
python -m pytest -q
```

Tested with DuckDB 1.5.6 and pytest on CPython 3.12.10 (Windows 11). DuckDB 1.1 or newer is needed
(`SET VARIABLE`, `ASOF JOIN`, JSON functions).

## Check it by hand first

| Order | Placed (UTC) | Customer -> segment at order | Lines -> category: revenue |
|---|---|---|---|
| O-1001 | 2 Mar 10:15 | C-001 -> hobbyist | Tropical 30.00, Tools 12.00 |
| O-1002 | 8 Mar 14:00 | C-002 -> **hobbyist** (pro only from 20 Mar) | Succulent 16.00 |
| O-1003 | 9 Mar 18:30 | guest -> unknown | Tropical 15.00 |
| O-1004 | 12 Mar 09:00 | C-003 -> pro | Tropical 60.00, Succulent 20.00 |
| O-1005 | 14 Mar 20:45 | C-004 -> hobbyist | Succulent 20.00 |
| O-1006 | 15 Mar 23:50 (arrived in batch 2) | C-001 -> hobbyist | Tropical 30.00 |
| O-1007 | 25 Mar 11:00 | C-002 -> **pro** | Tropical 30.00, Succulent 24.00, Tools 12.00 |
| O-1008 | 27 Mar 16:20 | C-005 -> pro | Succulent 8.00 |
| O-1009 | 30 Mar 08:10 | C-003 -> pro (moved city on 28 Mar) | Tropical 15.00 |

Totals: hobbyist 108.00, pro 169.00, unknown 15.00 (292.00). Shipping (37.50) is order-level and not revenue.
Q3: C-001, C-002, C-003 and C-005 ordered within 7 days of their first product view; C-004 did not.

Traps in the data: the CRM writes keys as `" c-001"` and `"C-002 "` (normalize before matching or hashing);
C-006 exists only in the CRM; O-1003 is a guest order; O-1006 was placed on 15 March but landed in batch 2;
event E06 was delivered twice; Ben's segment change happened on 20 March but the warehouse learned it on 1 April.

## Expected output of `python run_lab.py`

```text
Q1: March revenue by segment at order time and category (star)
segment_at_order  category   revenue
hobbyist          Succulent  36.00
hobbyist          Tools      12.00
hobbyist          Tropical   60.00
pro               Succulent  52.00
pro               Tools      12.00
pro               Tropical   105.00
unknown           Tropical   15.00

All five models agree: True - inmon_3nf, star, obt, vault, stream

Q3: first product view -> order within 7 days (activity stream)
customer  first_view_at        first_order_after    converted_7d
C-001     2026-03-01 09:00:00  2026-03-02 10:15:00  True
C-002     2026-03-07 13:00:00  2026-03-08 14:00:00  True
C-003     2026-03-11 08:00:00  2026-03-12 09:00:00  True
C-004     2026-03-05 12:00:00  NULL                 False
C-005     2026-03-26 15:00:00  2026-03-27 16:20:00  True

Tables and rows stored per model
model      tables  rows_stored
inmon_3nf  6       43
obt        1       13
star       5       45
stream     1       38
vault      10      81
```

## Files

- `sql/00_staging.sql`: one cleaned model per landed file (silver).
- `sql/01_inmon_3nf.sql`: `edw_customer`, `edw_customer_profile` (history), `edw_product_category`, `edw_product`,
  `edw_sales_order`, `edw_sales_order_line`.
- `sql/02_star.sql`: `dim_customer` (SCD2 + unknown member), `dim_product`, `fct_order_line`, `fct_order`,
  `fct_product_view`.
- `sql/03_obt.sql`: `obt_order_lines` with `segment_at_order` (as-was) and `segment_current` (as-is).
- `sql/04_vault_ddl.sql`, `sql/05_vault_load.sql`: 3 hubs, 2 links, 5 satellites; the load reads
  `getvariable('load_ts')` and is safe to replay. `sql/06_vault_mart.sql`: the information mart view.
- `sql/07_stream.sql`: `customer_stream` with `updated_segment`, `viewed_product`, `completed_order`, `ordered_item`.
- `sql/questions/`: Q1 per model and Q3 on the stream.
- `tests/test_lab.py`: 11 tests.

## Definition of done

- [ ] Your hand answer is written down before you run anything.
- [ ] `python run_lab.py` prints the same numbers and "All five models agree: True".
- [ ] `python -m pytest -q` passes (11 tests).
- [ ] The change request (deck slide 23) is implemented in all five models, with one new test per model.
- [ ] A one-page decision (`templates/obt-vs-star-decision.md`) is filled in for one real consumer.

## Stretch

- Replace `updated_at` with `load_ts` in the vault's ASOF join and explain every number that moves.
- Add `shipping_fee` to `obt_order_lines` and watch `test_shipping_is_summed_at_order_grain` explain the fan-out.
- Write Q3 against the star (`fct_product_view` and `fct_order`) and compare its length with the stream version.
- Add a point-in-time (PIT) table for `hub_customer` with one row per customer per day of March, and rewrite the
  vault mart to use equi-joins.

## In your portfolio (Fuel Smart)

Fuel Smart has two stable public sources, so it needs no Data Vault: staging and intermediate models in silver, a star
(`fct_recipe_ingredient`, `fct_review`, `dim_recipe`, `dim_food`) in gold, and `mart_recipe_nutrition` as an
OBT-style serving table for the dashboard. Fill the decision template for that mart and keep a reconciliation test
(row count and summed nutrients equal to the star) next to it.
