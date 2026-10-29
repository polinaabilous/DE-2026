# Intake: 30-day repeat-customer rate for spring campaign planning

**Requester:** Marketing lead · **Received:** 2026-03-02 · **Priority:** P1

> Hey! Can you build me a dashboard on how our repeat customers are doing? Ideally real-time, by channel, region, product and campaign. Need it ASAP for the spring campaign planning, thanks!!

## Question
What share of new Leafy customers place a second completed order within 30 days of their first, by first-order month and acquisition channel?

## Decision it supports
At the spring planning meeting on 2026-03-12 the Marketing lead decides whether to fund the "second plant" email series. If the 30-day repeat rate of new web customers is below 40%, the series is funded; otherwise the money goes to paid search.

## Grain
One row per cohort month (America/Chicago) per acquisition channel. Population: customers whose first completed order falls in that month; staff accounts and guest checkouts excluded. Definition: `definition-repeat-customer.md`.

## Deadline
2026-03-11 17:00 America/Chicago: the table goes into the pre-read for the 2026-03-12 meeting.

## Owner
Builds it: data engineer. Owns the definition: analytics lead. Signs off: Marketing lead.

## Acceptance criteria
- On the fixture `data/leafy_orders.csv`, the January 2026 cohort has 6 new customers, 3 repeat: 50.0%.
- An order placed 2026-02-01 03:30 UTC belongs to the January cohort (months are cut in America/Chicago).
- A second order exactly 30 x 24 hours after the first does not count: the window is [first order, first order + 30 days).
- Staff accounts, guest checkouts and cancelled orders never count, as a first order or as a repeat.
- `python acceptance.py` prints PASS on every line.

## Out of scope
- Live refresh: the decision is made once, so the daily 06:00 Chicago refresh is enough.
- Region, product and campaign breakdowns: phase 2, after 2026-03-12, if the meeting asks for them.
- A dashboard: v1 is a table in the pre-read; a dashboard follows only if the metric is reused.

## Data sources
`orders` (order service, loaded daily at 05:00 Chicago) and `customers.is_staff`. Guest checkouts have no `customer_id`. Orders from the new web shop (live since 2026-02-01) arrive in a separate monthly export.

## Open questions
- Does a refund within 30 days cancel a repeat? (Marketing lead, by 2026-03-04)
