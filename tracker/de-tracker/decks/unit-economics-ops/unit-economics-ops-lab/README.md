# Lab: Leafy Box channel and operations scorecards

Companion lab for the deck *Unit economics and operations metrics: LTV, CAC, payback, MTTR and SLAs*
(`../unit-economics-ops.html`, lessons 4–13). Time: about 1.5–2 hours. Everything runs offline.

You are the data engineer at Leafy. Two requests landed on the same Monday:

1. **Marketing:** "Which acquisition channel should get more budget next quarter?"
2. **Operations:** "Give me one scorecard for the warehouse and the checkout: how often things break,
   how fast we fix them, whether we keep our SLAs, and how many boxes we ship."

Your job is to turn the Leafy Box data into two scorecards, prove them with tests, and write a
five-sentence recommendation.

## Files

| File | What it is |
|---|---|
| `make_data.py` | Deterministic generator: writes `data/*.csv` and `leafy_box.duckdb` (same rows on every machine) |
| `scorecard.py` | **Your file.** Four functions to implement; each returns plain dicts |
| `tests/test_scorecard.py` | Property tests plus a few values pinned by the fixed seed |
| `conftest.py` | Adds the `--impl` option and builds the database if it is missing |
| `reference/scorecard_solution.py` | A reference solution. Open it only after your own attempt |

## Setup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest
python make_data.py
python -m pytest -q --impl reference   # all 6 tests pass against the reference
python -m pytest -q                    # all 6 fail until you implement scorecard.py
```

Tested with DuckDB 1.5.6, pytest 9.1.1 and CPython 3.12 on Windows 11. Any DuckDB 1.1+ and Python 3.10+ should work.

## Steps

1. **Explore (10 min).** Open the database (`duckdb.connect('leafy_box.duckdb')`) and list each table's grain.
   Find the traps: failed payment attempts, test customers, brand spend with no channel, a merged duplicate
   incident, two open incidents, an asset with no incidents, closed Sundays.
2. **Channel scorecard (40 min).** Implement `channel_scorecard`: CAC per paid channel; MRR and ARPA in March 2026;
   CM % of recurring boxes; monthly churn; formula LTV; cohort LTV at 6 and 12 months over mature cohorts only;
   LTV12/CAC; payback months (first month where cohort LTV ≥ CAC). The exact definitions are in the docstring at
   the top of `scorecard.py` and on the deck's spec cards (lessons 4–8).
3. **Ops scorecard (25 min).** Implement `ops_scorecard`: one row per asset (keep the zero-failure asset) with
   failures, open incidents, MTTR (mean and median, started → mitigated), MTBF, availability, and SLA attainment
   (open tickets past target count as breaches).
4. **Checkout SLO (15 min).** Implement `checkout_slo`: monthly availability of `web_checkout` with outages clipped to
   month boundaries, error budget used, and whether the 99.5 % SLO was met.
5. **Warehouse flow (15 min).** Implement `flow_scorecard`: boxes shipped in March, boxes per working day,
   boxes per labour hour (ratio of sums), average cycle time, and a Little's law check
   (arrival rate × average cycle time vs WIP measured hourly).
6. **Recommend (10 min).** Write five sentences for the marketing lead and the operations lead. Name one channel to
   grow, one to fix or cap, one too young to judge, and the single ops metric that most needs attention, with the
   number and its caveat (cohort size, open tickets).

## Checking your work

`python -m pytest -q` must report `6 passed`. The tests check definitions (CAC = spend ÷ customers, availability =
MTBF ÷ (MTBF + MTTR), Little's law within 5 %) and a few values that the fixed seed makes exact.

## Stretch

- Add a discounted, 36-month capped formula LTV column (deck lesson 6) and compare it with `ltv_12m`.
- Split MTTR into hands-on time and waiting time for the conveyor's spare-part outage.
- Port one scorecard to a dbt model with a `not_null` and an `accepted_range` test on `availability`.
