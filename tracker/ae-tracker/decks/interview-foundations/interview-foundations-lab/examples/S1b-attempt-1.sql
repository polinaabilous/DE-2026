-- first attempt at S1b, typed in 12 minutes
SELECT city,
       date_trunc('month', placed_at_utc)::DATE AS month,
       sum(amount) AS revenue
FROM orders
WHERE status = 'completed'
  AND placed_at_utc >= TIMESTAMPTZ '2026-02-01 00:00:00+00'
  AND placed_at_utc <  TIMESTAMPTZ '2026-04-01 00:00:00+00'
GROUP BY city, month
ORDER BY city, month;
