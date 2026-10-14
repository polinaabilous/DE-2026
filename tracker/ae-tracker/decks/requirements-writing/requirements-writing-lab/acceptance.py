"""acceptance: run the intake's acceptance criteria for the 30-day repeat-customer rate.

Usage:
    python acceptance.py [data/leafy_orders.csv]

Each check prints PASS or FAIL. Exit code 0 only when every check passes.
"""
import sys

import duckdb

CUSTOMERS_SQL = """
WITH orders AS (
    SELECT order_id, customer_id, status, channel, is_staff,
           (placed_at_utc::TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago' AS placed_local
    FROM read_csv(?, header = true, types = {'is_staff': 'BOOLEAN'})
),
eligible AS (   -- population: completed orders by known, non-staff customers
    SELECT * FROM orders
    WHERE status = 'completed' AND customer_id IS NOT NULL AND NOT is_staff
),
firsts AS (     -- the first completed order (Chicago time) defines the cohort
    SELECT customer_id, placed_local AS first_at, channel AS first_channel
    FROM eligible
    QUALIFY row_number() OVER (PARTITION BY customer_id ORDER BY placed_local, order_id) = 1
)
SELECT f.customer_id,
       date_trunc('month', f.first_at)::DATE::VARCHAR AS cohort_month,
       f.first_channel,
       EXISTS (SELECT 1 FROM eligible e
               WHERE e.customer_id = f.customer_id
                 AND e.placed_local > f.first_at
                 AND e.placed_local < f.first_at + INTERVAL 30 DAY) AS is_repeat
FROM firsts f
ORDER BY f.customer_id
"""

RATE_SQL = """
SELECT cohort_month, count(*) AS new_customers, count(*) FILTER (WHERE is_repeat) AS repeat_customers,
       round(100.0 * repeat_customers / new_customers, 1) AS repeat_rate_pct
FROM customers GROUP BY ALL ORDER BY cohort_month
"""


def build(path):
    con = duckdb.connect()
    con.execute("SET TimeZone = 'UTC'")
    con.execute("CREATE TABLE customers AS " + CUSTOMERS_SQL, [path])
    return con


def main(argv):
    con = build(argv[0] if argv else 'data/leafy_orders.csv')
    cust = {c: (m, ch, r) for c, m, ch, r in con.execute("SELECT * FROM customers").fetchall()}
    rate = {m: (n, r, p) for m, n, r, p in con.execute(RATE_SQL).fetchall()}
    checks = [
        ('January 2026 cohort: 6 new customers, 3 repeat, 50.0%', rate.get('2026-01-01') == (6, 3, 50.0)),
        ('February 2026 cohort: 2 new customers, 1 repeat, 50.0%', rate.get('2026-02-01') == (2, 1, 50.0)),
        ('C07 (first order 2026-02-01 03:30 UTC) is in the January cohort', cust['C07'][0] == '2026-01-01'),
        ('C02 (second order exactly 30 x 24 h later) is not a repeat', cust['C02'][2] is False),
        ('C04 (second order cancelled) is not a repeat', cust['C04'][2] is False),
        ('staff C06 and guest orders are not customers', 'C06' not in cust and None not in cust),
    ]
    for name, ok in checks:
        print(('PASS ' if ok else 'FAIL ') + name)
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
