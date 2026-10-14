WITH first_view AS (                         -- cohort: each customer's first product view
    SELECT customer, ts FROM customer_stream
    WHERE activity = 'viewed_product' AND activity_occurrence = 1 AND customer IS NOT NULL
)
SELECT v.customer, v.ts AS first_view_at,
       min(o.ts) AS first_order_after,                       -- "first after", within 7 days
       min(o.ts) IS NOT NULL AS converted_7d
FROM first_view AS v
LEFT JOIN customer_stream AS o
       ON o.customer = v.customer AND o.activity = 'completed_order'
      AND o.ts >= v.ts AND o.ts < v.ts + INTERVAL 7 DAY
GROUP BY v.customer, v.ts
ORDER BY v.customer;
