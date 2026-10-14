# Design: 30-day repeat-customer rate (v1)

**Author:** Analytics engineer · **Reviewers:** Analytics lead, Marketing lead · **Status:** Approved · **Updated:** 2026-03-04

## Context
Marketing decides on 2026-03-12 whether to fund a "second plant" email series (`intake-repeat-customers.md`). No table answers "do new customers come back?" today. Two ad-hoc queries in the team disagree: one cuts months at midnight UTC, the other counts cancelled orders.

## Goals
- One table: 30-day repeat rate by cohort month and acquisition channel, January 2025 to the newest mature cohort, in the pre-read by 2026-03-11 17:00 Chicago.
- One written definition (`definition-repeat-customer.md`) that replaces both ad-hoc queries.
- Acceptance checks that anyone can run on the fixture in under a minute.

## Non-goals
- Live refresh; region, product and campaign breakdowns (phase 2).
- Attributing repeats to campaigns.
- A dashboard.

## Proposal
Two dbt models over the existing `stg_orders` and `stg_customers`:
- `int_customer_first_order`: one row per customer, with the first completed order time in Chicago, the cohort month and the acquisition channel (the channel of that order).
- `mart_repeat_rate_monthly`: one row per cohort month per channel, with `new_customers`, `repeat_customers` and `repeat_rate`. The mart stores both counts so the rate can be re-aggregated across channels as a ratio of sums.

Cohorts younger than 30 days are filtered out in the mart. The models refresh in the daily dbt run at 06:00 Chicago.

## Alternatives considered
- Do nothing and reuse an ad-hoc query: rejected; one counts cancelled orders and the other uses UTC months.
- Compute it in the BI tool: rejected; the logic would be hidden from tests and from other teams.
- A full customer-lifetime model: rejected for v1; too large for the deadline and not needed for this decision.

## Risks and mitigations
- New web shop orders arrive in a monthly export: the fixture lets us validate the logic first; the status update flags any delay.
- Refund policy (open question, answered 2026-03-04: ignore refunds in v1): the definition says so explicitly.

## Test and rollout plan
- dbt tests: `unique` and `not_null` on (cohort_month, channel); `repeat_customers <= new_customers`.
- `python acceptance.py` on the fixture: every check PASS.
- The analytics lead reviews the PR; the Marketing lead compares two cohorts with her spreadsheet.
- Ship to the `marts` schema; the ad-hoc queries get a deprecation note that links here.

## Open questions
- Should phase 2 split by first-order product category? (Marketing lead, after 2026-03-12)
