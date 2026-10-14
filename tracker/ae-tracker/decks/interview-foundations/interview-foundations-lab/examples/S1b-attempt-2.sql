-- second attempt at S1b, after saying the edge cases aloud
WITH deduped AS (SELECT DISTINCT * FROM orders),
completed AS (
    SELECT city,
           date_trunc('month', placed_at_utc AT TIME ZONE 'America/Chicago')::DATE AS month,
           amount
    FROM deduped
    WHERE status = 'completed'
),
spine AS (
    SELECT c.city, m.month
    FROM (SELECT DISTINCT city FROM orders) AS c
    CROSS JOIN (VALUES (DATE '2026-02-01'), (DATE '2026-03-01')) AS m(month)
)
SELECT s.city, s.month, coalesce(sum(c.amount), 0) AS revenue
FROM spine AS s
LEFT JOIN completed AS c USING (city, month)
GROUP BY s.city, s.month
ORDER BY s.city, s.month;
