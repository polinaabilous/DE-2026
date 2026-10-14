# Definition: 30-day repeat customer

## Definition
A 30-day repeat customer is a new customer who places at least one more completed order in the 30 days that start at their first completed order.

## Includes
- Customers with a `customer_id` whose first completed order is in the cohort month.
- Second orders on any channel, of any amount.

## Excludes
- Staff accounts (`customers.is_staff = true`): they test the shop.
- Guest checkouts (no `customer_id`): their orders cannot be linked.
- Cancelled orders, as a first order and as a repeat order.

## Unit
A customer (`customer_id`), counted once per cohort.

## Time
Cohort month: calendar month of the first completed order in America/Chicago (ADR-0001). Repeat window: the half-open interval [first order time, first order time + 30 x 24 hours). Cohorts younger than 30 days are not reported.

## Source
`orders` from the order service (system of record); `customers` for `is_staff`.

## Owner
Analytics lead.

## Examples
- Example: first order 2026-01-22 11:00, second order 2026-01-27 11:00 (Chicago): a repeat.
- Non-example: second order exactly 30 x 24 hours after the first: not a repeat, because the end of the window is excluded.
- Non-example: second order cancelled: not a repeat.
