# Add 30-day repeat-customer rate mart for spring campaign planning

## What and why
Adds `int_customer_first_order` and `mart_repeat_rate_monthly` (one row per cohort month per channel) so Marketing can decide on the "second plant" email series on 2026-03-12. Implements `definition-repeat-customer.md` and `design-repeat-customers.md`; follows ADR-0001 (Chicago business days).

## How it was validated
- `python acceptance.py`: 6 of 6 checks PASS on the fixture (January 2026 cohort: 6 new, 3 repeat, 50.0%).
- New dbt tests: `unique` and `not_null` on (cohort_month, channel); `repeat_customers <= new_customers`.
- `python doclint.py auto examples`: the definition, design doc and ADR pass.

## Impact on existing models and consumers
New models only; no existing column or grain changes. The two ad-hoc queries in the shared folder get a deprecation note that points here. Their January 2026 numbers will not match this mart, by design: months are now cut in Chicago time and cancelled orders are excluded.

## Rollback
Revert this PR. Nothing reads the new models yet.

## Checklist
- [x] Tests added or updated, and passing
- [x] Descriptions and docs updated
- [x] Downstream owners told (Marketing lead, analytics lead)
