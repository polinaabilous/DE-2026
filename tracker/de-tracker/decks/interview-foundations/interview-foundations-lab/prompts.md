# Practice prompts: two SQL sessions, two Python sessions, one case

## Session rules (the same for every session)

1. **No AI, no search for the answer.** Official docs for syntax are fine (DuckDB, Python). AI is allowed *after* the self-review, to generate variants or to review your explanation, never to solve.
2. **Time box:** about 45 minutes for two SQL or two Python problems; 30 minutes for the case. Start a timer; write the actual minutes in the log.
3. **Talk aloud the whole time** (record yourself if you can; the recording stays out of Git). Use the think-aloud loop: restate, examples, edge cases, approach and complexity, code, test, follow-up.
4. **Self-review before reading any solution:** score the rubric (`templates/rubric.md`), log each mistake with a one-line rule (`practice.py log-mistake`), then log the session (`practice.py log-session`).

The data is in `data/`: `orders.csv` (21 rows), `customers.csv` (12 rows), `events.jsonl` (20 lines). Every edge case in it is deliberate.

## SQL session 1 (S1a + S1b, about 45 minutes)

Write each query in `attempts/S1a.sql` and `attempts/S1b.sql`, then run `python check_sql.py S1a attempts/S1a.sql`. The views `orders`, `customers` and `events` are created for you (DuckDB SQL; timestamps are `TIMESTAMPTZ`; the session time zone is UTC).

**S1a: latest completed order per customer.** Return `customer_id, order_id, placed_at_utc, amount`: one row per customer with at least one completed order, showing their most recent completed order. If two orders share a timestamp, the higher `order_id` wins. Guest orders (no `customer_id`) are not customers. Pattern: dedupe / latest row per group. Target: 15 minutes.

**S1b: completed revenue per city per month.** Return `city, month, revenue`: one row per city per month for February and March 2026, months in **America/Chicago** local time, `month` as the first day of the month, `revenue` = sum of completed order amounts, and 0 when a city had no completed orders that month. The file may contain replayed duplicate rows; count each order once. Pattern: spine + left join, local-time bucketing. Target: 25 minutes.

## SQL session 2 (S2a + S2b, about 45 minutes)

Each event can arrive more than once. Keep, for each `event_id`, only the copy with the latest `ingested_at` before you answer.

**S2a: carted but never purchased.** Return `user_id`: users with at least one `add_to_cart` event and no `purchase` event. Pattern: anti-join after dedupe. Target: 15 minutes.

**S2b: daily active users in local time.** Return `local_day, dau` for 7, 8 and 9 March 2026, where a day is a calendar day in America/Chicago and `dau` counts distinct users with any event that day. Events without a user do not count. Pattern: distinct count per local day across a daylight-saving change. Target: 20 minutes.

## Python session P1 (about 45 minutes): `python_sessions/p1.py`

Standard library only (no pandas). Implement `parse_events` and `count_by_type` as their docstrings describe, then run `python -m pytest -q tests/test_p1.py`. Pattern: parse and validate, group and count with a deterministic sort.

## Python session P2 (about 45 minutes): `python_sessions/p2.py`

Implement `dedupe_latest` (latest `ingested_at` wins; on a tie, the later line wins) and `daily_active_users` (distinct users per local date, default America/Chicago). Run `python -m pytest -q tests/test_p2.py`. Pattern: dedupe by key with a tie-breaker, local-time bucketing.

## The case (about 30 minutes): your portfolio question

Read the prompt at the top of `solutions/case/fuel-smart-case.md` **only** (stop at the first heading), fill in `templates/case-card.md` aloud, give your three-sentence answer, and record it. Then score `templates/rubric-case.json`, compare with the model answer, and log the session with the feedback you wrote.

## What next

Repeat a weak pattern 1, 3 and 7 days after the mistake (`practice.py due --on <date>`). Keep one short session per week while you build the portfolio. Harder timed sets come in the timed SQL & Python interview lesson.
