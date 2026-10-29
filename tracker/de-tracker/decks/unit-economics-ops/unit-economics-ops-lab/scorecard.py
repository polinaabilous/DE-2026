"""Leafy Box scorecards: your implementation.

Fill in the four functions. Each returns plain Python dicts so the tests can check them.
Run the tests against your file:       python -m pytest -q
Run them against the reference:        python -m pytest -q --impl reference
Print your scorecards:                  python scorecard.py

Definitions (the spec cards are in the deck, lessons 4-12):
- Only paid billing rows of non-test customers count. Contribution = revenue - refund - product, shipping, payment costs.
- CAC = all spend of the channel / all non-test customers of the channel (Jan 2025 - Mar 2026). Paid channels only.
- MRR and ARPA: list price of paid boxes billed in March 2026 (sum and average).
- CM % : contribution / net revenue of recurring boxes (month_index > 0) billed from October 2025.
- Monthly churn: share of paid boxes billed Sep 2025 - Feb 2026 with no paid box in the next month.
- Cohort LTV at month k: cumulative contribution up to month_index k / customers acquired, over cohorts
  (channel x signup month) that have reached month k by March 2026.
- Payback months: first k with cohort LTV >= CAC, plus 1 (None if not reached).
- Ops: Q1 2026 (2,160 hours), merged duplicate tickets excluded, downtime = started -> mitigated
  (or the 1 April cut-off), SLA clock = detected -> resolved, open tickets past target are breaches.
"""
import os

import duckdb

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, 'leafy_box.duckdb')


def connect(path=DB):
    return duckdb.connect(path)


def channel_scorecard(con):
    """Return one dict per paid channel with keys:
    channel, new_customers, spend, cac, mrr, arpa, cm_pct, monthly_churn,
    formula_ltv, ltv_6m, ltv_12m, ltv12_to_cac, payback_months.
    Round money to 2 decimals, cm_pct and monthly_churn to 4."""
    raise NotImplementedError('step 2 of the README')


def ops_scorecard(con):
    """Return one dict per asset (all six, including any with zero incidents) with keys:
    asset_name, failures, open_incidents, mttr_recover_h, median_recover_h, mtbf_h, availability, sla_attainment.
    Use None where a value is undefined (no failures, no eligible tickets)."""
    raise NotImplementedError('step 3 of the README')


def checkout_slo(con, slo=0.995):
    """Return one dict per month (Jan, Feb, Mar 2026) for web_checkout with keys:
    month, availability, budget_used, slo_met. Clip outages to month boundaries."""
    raise NotImplementedError('step 4 of the README')


def flow_scorecard(con):
    """Return one dict for March 2026 with keys:
    boxes_shipped, per_working_day, boxes_per_labour_hour, avg_cycle_h, little_wip, measured_wip."""
    raise NotImplementedError('step 5 of the README')


if __name__ == '__main__':
    c = connect()
    for fn in (channel_scorecard, ops_scorecard, checkout_slo, flow_scorecard):
        print(fn.__name__, fn(c))
