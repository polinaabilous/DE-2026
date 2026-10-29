# Lab: a cohort matrix and a funnel you can check by hand

Companion lab for the deck *SQL time analysis: date spines, time zones, cohorts and funnels* (slides 18–19).

**Task.** From a tiny raw event log (`data/events.csv`), build:

1. a **monthly cohort retention matrix** in Chicago months (cohort = month of the first event), with cells after the
   last complete month shown as NULL (censored), and
2. a **3-step ordered funnel** (view → cart → purchase) for users whose first product view was in March (Chicago time):
   each step at or after the previous one, all within 7 days (168 hours) of that first view.

Everything is offline and synthetic. Timestamps in the CSV are UTC. Leafy's business time zone is `America/Chicago`.
The data was loaded on 20 April 2026 at 15:00 UTC, so **March is the last complete month**.

## Run it

```text
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest tzdata
python run_lab.py
python -m pytest -q
```

Tested with DuckDB 1.5.6 and pytest on CPython 3.12.10 (Windows 11). `tzdata` is needed on Windows for
Python's `zoneinfo`, which the tests use for an independent check.

## Check it by hand first

| User | Events (Chicago time) | Cohort | Active months | March funnel |
|---|---|---|---|---|
| 1 | views 5 Jan, 10 Feb, 3 Mar 09:00; cart 09:05; buys 4 Mar | Jan | Jan, Feb, Mar | view → cart → purchase ✓ |
| 2 | views 12 Jan, 10 Mar 09:00; cart 12 Mar; buys 17 Mar 09:30 | Jan | Jan, Mar | view → cart; purchase 7 days + 30 min after the view ✗ |
| 3 | views 20 Jan | Jan | Jan | — |
| 4 | views **31 Jan 23:30** (1 Feb in UTC), 14 Feb | **Jan** | Jan, Feb | — |
| 5 | views 3 Feb; buys 2 Mar; views 5 Mar; cart 5 Mar | Feb | Feb, Mar | view → cart; purchase was *before* the view ✗ |
| 6 | views 20 Feb, 8 Apr | Feb | Feb, Apr | — |
| 7 | views 25 Feb | Feb | Feb | — |
| 8 | views 20 Mar 17:00; cart same second; buys 21 Mar; views 15 Apr | Mar | Mar, Apr | view → cart (tie allowed) → purchase ✓ |
| 9 | views **31 Mar 23:30** (1 Apr in UTC) | **Mar** | Mar | view only |
| 10 | views 10 Apr | Apr (incomplete, excluded) | Apr | — |

Event 8 appears twice in the file (a duplicate delivery) and event 26 has no user (anonymous): both are removed in staging.

Expected cohort matrix (% of cohort active; NULL = not observed yet, because April is not complete):

| cohort_month | cohort_size | m0 | m1 | m2 | m3 |
|---|---|---|---|---|---|
| 2026-01-01 | 4 | 100.0 | 50.0 (users 1, 4) | 50.0 (users 1, 2) | NULL |
| 2026-02-01 | 3 | 100.0 | 33.3 (user 5) | NULL | NULL |
| 2026-03-01 | 2 | 100.0 | NULL | NULL | NULL |

Expected funnel: 5 viewed (users 1, 2, 5, 8, 9) → 4 carted (1, 2, 5, 8) → 2 purchased (1, 8); view→cart 0.8,
cart→purchase 0.5, overall 0.4. Every entry is mature (the last one, 31 March, closed its window on 8 April).

## Expected output of `python run_lab.py`

```text
Cohort matrix (% of cohort active, Chicago months, NULL = not observed yet)
cohort_month  cohort_size  m0     m1    m2    m3  
2026-01-01    4            100.0  50.0  50.0  NULL
2026-02-01    3            100.0  33.3  NULL  NULL
2026-03-01    2            100.0  NULL  NULL  NULL

Funnel per user (March entries)
user_id  t1                   t2                   t3                   mature
1        2026-03-03 15:00:00  2026-03-03 15:05:00  2026-03-04 10:00:00  True  
2        2026-03-10 14:00:00  2026-03-12 09:00:00  NULL                 True  
5        2026-03-05 15:00:00  2026-03-05 15:10:00  NULL                 True  
8        2026-03-20 22:00:00  2026-03-20 22:00:00  2026-03-21 13:00:00  True  
9        2026-04-01 04:30:00  NULL                 NULL                 True  

Funnel summary
viewed  carted  purchased  view_to_cart  cart_to_purchase  overall  all_entries_mature
5       4       2          0.8           0.5               0.4      True              
```

## Files

- `sql/01_staging.sql`: de-duplicated events of known users; the `chicago()` macro; `lab_params` (load time, last
  complete month, funnel month).
- `sql/02_cohort_matrix.sql`: `user_months` → `cohorts` → `cohort_long` → `cohort_cells` (a cohort × age spine with
  censoring). `run_lab.py` pivots it.
- `sql/03_funnel.sql`: `funnel_users` (one row per entering user with `t1`, `t2`, `t3`, `mature`) and `funnel_summary`.
- `tests/test_lab.py`: 8 pytest tests (hand answers, an independent Python implementation, month 0, censoring, the
  Chicago-month trap, maturity).
- `make_leafy_time.py`: generates `leafy_time.duckdb`, the larger dataset used in the deck's lessons and exercises
  (`python make_leafy_time.py`).

## Definition of done

- [ ] Your hand-calculated matrix and funnel are written down before you run anything.
- [ ] `python run_lab.py` prints exactly those numbers.
- [ ] Censored cells are NULL; incomplete cohorts are excluded.
- [ ] The funnel counts 5 → 4 → 2, and you can say why users 2 and 5 did not convert.
- [ ] `python -m pytest -q` passes (8 tests).

## Stretch

- Add an unbounded month-1 column (active in month 1 or later) and explain why January's is higher than bounded.
- Change `>=` to `>` in the funnel: which user drops out, and which test catches it?
- Move the load time to 5 April: which cells and funnel entries become censored or immature?
- Port `02_cohort_matrix.sql` to your warehouse's dialect.

## In your portfolio (Fuel Smart)

Food.com reviews are dated. The same models answer "do reviewers come back in later months?" (reviewer cohorts by
first-review month) and "of users who viewed a recipe, how many reviewed it within 7 days?". Start from a fixture this
small, check it by hand, and keep these tests when you scale up.
