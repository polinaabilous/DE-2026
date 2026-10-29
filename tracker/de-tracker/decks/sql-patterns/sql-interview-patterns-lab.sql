-- Advanced SQL interview patterns: independent miniature datasets.
-- Run in a fresh scratch connection (PostgreSQL-style; verified in DuckDB 1.5.6).
-- DuckDB: duckdb :memory: < tracker/de-tracker/decks/sql-patterns/sql-interview-patterns-lab.sql
-- PostgreSQL: psql YOUR_SCRATCH_DB -v ON_ERROR_STOP=1 -f tracker/de-tracker/decks/sql-patterns/sql-interview-patterns-lab.sql
-- All created tables are TEMPORARY. ROLLBACK removes this lab's transaction state.
-- Timestamps are simple wall-clock examples; production time-zone rules must be explicit.
BEGIN;

CREATE TEMP TABLE users AS
SELECT * FROM (VALUES (1),(2),(3),(4)) AS t(user_id);

CREATE TEMP TABLE orders AS
SELECT * FROM (VALUES
 (1,1,50, TIMESTAMP '2026-01-01 09:00:00','paid'),
 (2,1,80, TIMESTAMP '2026-01-02 09:00:00','paid'),
 (3,1,20, TIMESTAMP '2026-01-02 09:00:00','refunded'),
 (4,2,120,TIMESTAMP '2026-01-03 09:00:00','paid'),
 (5,2,40, TIMESTAMP '2026-01-04 09:00:00','paid'),
 (6,3,60, TIMESTAMP '2026-01-04 09:00:00','paid')
) AS t(order_id,user_id,amount,order_ts,status);

CREATE TEMP TABLE order_items AS
SELECT * FROM (VALUES (1,20),(1,30)) AS t(order_id,line_amount);
CREATE TEMP TABLE order_payments AS
SELECT * FROM (VALUES (1,25),(1,25)) AS t(order_id,paid_amount);

CREATE TEMP TABLE employees AS
SELECT * FROM (VALUES
 (1,NULL,'A',100),(2,1,'A',100),(3,1,'A',90),
 (4,2,'A',80),(5,4,'B',70),(6,5,'B',60)
) AS t(employee_id,manager_id,department,salary);

CREATE TEMP TABLE product_spend AS
SELECT * FROM (VALUES
 ('A',1,50),('A',1,50),('A',2,80),('A',3,80),('A',4,10),('B',5,25)
) AS t(category,product_id,spend);

CREATE TEMP TABLE daily_metrics AS
SELECT * FROM (VALUES
 (DATE '2026-01-01',10),(DATE '2026-01-02',20),(DATE '2026-01-05',50)
) AS t(day,value);

CREATE TEMP TABLE activity AS
SELECT * FROM (VALUES
 (1,DATE '2026-01-01'),(1,DATE '2026-01-01'),(1,DATE '2026-01-02'),
 (1,DATE '2026-01-03'),(1,DATE '2026-01-05'),
 (2,DATE '2026-01-01'),(2,DATE '2026-01-03'),(2,DATE '2026-01-04'),
 (3,DATE '2026-01-04')
) AS t(user_id,activity_date);

CREATE TEMP TABLE events AS
SELECT * FROM (VALUES
 (1,1,TIMESTAMP '2026-01-01 10:00:00','signup'),
 (1,2,TIMESTAMP '2026-01-01 10:10:00','browse'),
 (1,3,TIMESTAMP '2026-01-01 10:20:00','purchase'),
 (1,4,TIMESTAMP '2026-01-01 10:20:00','purchase'),
 (1,5,TIMESTAMP '2026-01-01 10:50:00','browse'),
 (1,6,TIMESTAMP '2026-01-01 11:21:00','browse'),
 (2,7,TIMESTAMP '2026-01-02 09:00:00','purchase'),
 (2,8,TIMESTAMP '2026-01-02 10:00:00','signup'),
 (2,9,TIMESTAMP '2026-01-02 10:10:00','browse'),
 (3,10,TIMESTAMP '2026-01-03 12:00:00','signup')
) AS t(user_id,event_id,event_ts,event_type);

CREATE TEMP TABLE payment_events AS
SELECT * FROM (VALUES
 (1,1,1,100,TIMESTAMP '2026-01-01 00:00:00'),
 (2,1,1,100,TIMESTAMP '2026-01-01 00:08:00'),
 (3,1,1,100,TIMESTAMP '2026-01-01 00:16:00'),
 (4,1,1,100,TIMESTAMP '2026-01-01 00:40:00'),
 (5,1,1,200,TIMESTAMP '2026-01-01 00:41:00')
) AS t(payment_id,merchant_id,card_id,amount,paid_at);

CREATE TEMP TABLE required_categories AS
SELECT * FROM (VALUES ('A'),('B'),('C')) AS t(category);
CREATE TEMP TABLE purchases AS
SELECT * FROM (VALUES
 (1,'A'),(1,'A'),(1,'B'),(1,'C'),(2,'A'),(2,'B'),(2,'D')
) AS t(user_id,category);

CREATE TEMP TABLE basket_items AS
SELECT * FROM (VALUES
 (1,'A'),(1,'A'),(1,'B'),(2,'A'),(2,'C'),(3,'A'),(3,'B')
) AS t(basket_id,product_id);
CREATE TEMP TABLE snapshot_a AS
SELECT * FROM (VALUES (1),(1),(2)) AS t(user_id);
CREATE TEMP TABLE snapshot_b AS
SELECT * FROM (VALUES (2),(3),(NULL)) AS t(user_id);
CREATE TEMP TABLE search_frequency AS
SELECT * FROM (VALUES (1,1),(2,3),(3,2)) AS t(value,frequency);

CREATE TEMP TABLE product_catalog AS
SELECT * FROM (VALUES (1),(2),(3)) AS t(product_id);
CREATE TEMP TABLE price_history AS
SELECT * FROM (VALUES
 (1,TIMESTAMP '2026-01-01',10,1),
 (1,TIMESTAMP '2026-01-03',20,2),
 (1,TIMESTAMP '2026-01-05',30,3),
 (2,TIMESTAMP '2026-01-02',7,4)
) AS t(product_id,effective_at,price,change_id);
CREATE TEMP TABLE product_facts AS
SELECT * FROM (VALUES
 (1,1,TIMESTAMP '2026-01-02'),(2,1,TIMESTAMP '2026-01-03'),
 (3,3,TIMESTAMP '2026-01-02')
) AS t(fact_id,product_id,event_at);
CREATE TEMP TABLE intervals AS
SELECT * FROM (VALUES (1,1,10),(2,2,3),(3,9,12),(4,20,21),(5,21,22))
 AS t(interval_id,start_at,end_at);

CREATE TEMP TABLE cdc_events AS
SELECT * FROM (VALUES
 (1,1,TIMESTAMP '2026-01-01',1,'I',10),
 (1,2,TIMESTAMP '2026-01-02',2,'D',NULL),
 (1,1,TIMESTAMP '2026-01-03',3,'I',10),
 (2,2,TIMESTAMP '2026-01-02',4,'I',20),
 (2,3,TIMESTAMP '2026-01-03',5,'U',50)
) AS t(entity_id,source_seq,ingested_at,event_id,operation,amount);
CREATE TEMP TABLE edges AS
SELECT * FROM (VALUES (1,2),(2,3),(3,1),(1,3)) AS t(src,dst);


-- EXAMPLE: anti_join
-- Expected: user 4. For “has a paid order”, replace `NOT EXISTS` with `EXISTS`.
SELECT u.user_id
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.user_id
    AND o.status = 'paid'
)
ORDER BY u.user_id;

-- EXAMPLE: fanout_safe
-- Expected: order 1 → item total 50, paid total 50; a raw join would report 100 for each.
WITH items AS (
  SELECT order_id, SUM(line_amount) AS item_total
  FROM order_items GROUP BY order_id
), payments AS (
  SELECT order_id, SUM(paid_amount) AS paid_total
  FROM order_payments GROUP BY order_id
)
SELECT o.order_id, i.item_total, p.paid_total
FROM orders o
LEFT JOIN items i ON i.order_id = o.order_id
LEFT JOIN payments p ON p.order_id = o.order_id
WHERE o.order_id = 1;

-- EXAMPLE: group_benchmark
-- Expected: employees 1, 2, and 5. A correlated scalar subquery or a join to department aggregates is also valid. A global `AVG(salary)` subquery solves a different question.
WITH scored AS (
  SELECT employee_id, department, salary,
    AVG(salary) OVER (
      PARTITION BY department
    ) AS department_avg
  FROM employees
)
SELECT employee_id, department, salary
FROM scored
WHERE salary > department_avg
ORDER BY employee_id;

-- EXAMPLE: top_distinct
-- Expected: employees 1, 2, 3, 5, 6. For exactly two employees, use `ROW_NUMBER` with `ORDER BY salary DESC, employee_id`.
WITH ranked AS (
  SELECT employee_id, department, salary,
    DENSE_RANK() OVER (
      PARTITION BY department ORDER BY salary DESC
    ) AS salary_rank
  FROM employees
)
SELECT employee_id, salary, salary_rank
FROM ranked WHERE salary_rank <= 2
ORDER BY employee_id;

-- EXAMPLE: aggregate_rank
-- Expected: category A → products 1 (100), 2 (80), 3 (80); B → product 5 (25). This authored variant includes ties in the top two distinct revenue levels.
WITH totals AS (
  SELECT category, product_id, SUM(spend) AS revenue
  FROM product_spend GROUP BY category, product_id
), ranked AS (
  SELECT *, DENSE_RANK() OVER (
    PARTITION BY category ORDER BY revenue DESC
  ) AS revenue_rank FROM totals
)
SELECT category, product_id, revenue
FROM ranked WHERE revenue_rank <= 2
ORDER BY category, product_id;

-- EXAMPLE: latest_order
-- Expected: users 1/2/3 → orders 3/5/6. For the third event, order ascending and filter `rn = 3`; users with fewer than three rows disappear.
WITH numbered AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY order_ts DESC, order_id DESC
  ) AS rn
  FROM orders
)
SELECT user_id, order_id, amount
FROM numbered WHERE rn = 1
ORDER BY user_id;

-- EXAMPLE: running_share
-- Expected: user 1 running amounts → 50, 130, 150. All statuses are intentionally included here; this is an arithmetic illustration, not recognized revenue.
SELECT order_id, user_id, amount,
  SUM(amount) OVER (
    PARTITION BY user_id ORDER BY order_ts, order_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_amount,
  ROUND(100.0 * amount / NULLIF(
    SUM(amount) OVER (PARTITION BY user_id), 0
  ), 2) AS pct_of_user_amount
FROM orders
ORDER BY user_id, order_ts, order_id;

-- EXAMPLE: rolling_frames
-- Expected: row average 26.67; range average 50.00. A zero-filled Jan 3–5 calendar average would be 16.67.
SELECT day, value,
  ROUND(AVG(value) OVER (
    ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ), 2) AS last_three_rows,
  ROUND(AVG(value) OVER (
    ORDER BY day RANGE BETWEEN INTERVAL '2 days' PRECEDING
                          AND CURRENT ROW
  ), 2) AS observed_days_in_range
FROM daily_metrics ORDER BY day;

-- EXAMPLE: date_spine
-- Expected: Jan 3/4 fill with zero; Jan 5 average = 16.67. Early dates use partial windows; suppress them if the contract requires complete three-day windows.
WITH calendar AS (
  SELECT CAST(d AS DATE) AS day
  FROM generate_series(DATE '2026-01-01', DATE '2026-01-05',
                       INTERVAL '1 day') AS s(d)
), dense AS (
  SELECT c.day, COALESCE(m.value, 0) AS value
  FROM calendar c LEFT JOIN daily_metrics m ON m.day = c.day
)
SELECT day, value, ROUND(AVG(value) OVER (
  ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
), 2) AS three_day_avg
FROM dense ORDER BY day;

-- EXAMPLE: adjacent_change
-- Expected: Jan 2 → 100%; Jan 5 → NULL because Jan 4 is absent. For months, use month-start values and month arithmetic; month numbers alone mix years.
WITH previous AS (
  SELECT day, value,
    LAG(day) OVER (ORDER BY day) AS previous_day,
    LAG(value) OVER (ORDER BY day) AS previous_value
  FROM daily_metrics
)
SELECT day, CASE WHEN day = previous_day + 1
  THEN ROUND(100.0 * (value - previous_value)
             / NULLIF(previous_value, 0), 2)
END AS day_growth_pct
FROM previous ORDER BY day;

-- EXAMPLE: streaks
-- Expected: user 1, Jan 1–3, three days. As date and row number each increase by one, their difference stays constant within an island.
WITH days AS (
  SELECT DISTINCT user_id, activity_date FROM activity
), labeled AS (
  SELECT *, activity_date - CAST(ROW_NUMBER() OVER (
    PARTITION BY user_id ORDER BY activity_date
  ) AS INTEGER) AS island_key
  FROM days
)
SELECT user_id, MIN(activity_date) AS start_day,
       MAX(activity_date) AS end_day, COUNT(*) AS streak_days
FROM labeled GROUP BY user_id, island_key
HAVING COUNT(*) >= 3
ORDER BY user_id, start_day;

-- EXAMPLE: sessions
-- Expected: user 1’s exactly-30-minute gap stays in the session; the later 31-minute gap starts session 2. This lab uses 30 minutes; the linked practice question uses 60.
WITH previous AS (
  SELECT *, LAG(event_ts) OVER (
    PARTITION BY user_id ORDER BY event_ts, event_id
  ) AS previous_ts FROM events
), boundaries AS (
  SELECT *, CASE WHEN previous_ts IS NULL OR
    event_ts - previous_ts > INTERVAL '30 minutes'
    THEN 1 ELSE 0 END AS new_session FROM previous
)
SELECT user_id, event_id,
  SUM(new_session) OVER (
    PARTITION BY user_id ORDER BY event_ts, event_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS session_id
FROM boundaries ORDER BY user_id, event_ts, event_id;

-- EXAMPLE: repeat_payments
-- Expected: 2 repeated payments for one matching sequence at 00:00, 00:08, 00:16. Each later row has a matching predecessor within ten minutes.
WITH previous AS (
  SELECT *, LAG(paid_at) OVER (
    PARTITION BY merchant_id, card_id, amount
    ORDER BY paid_at, payment_id
  ) AS previous_at FROM payment_events
)
SELECT COUNT(*) AS repeated_payments
FROM previous
WHERE paid_at - previous_at <= INTERVAL '10 minutes';

-- EXAMPLE: day_one_retention
-- Expected: 0.50. Observation is complete through Jan 4; the user first seen Jan 4 lacks a complete next day and is excluded. “First seen” means first in the supplied history.
WITH days AS (
  SELECT DISTINCT user_id, activity_date FROM activity
), first_seen AS (
  SELECT user_id, MIN(activity_date) AS first_day
  FROM days GROUP BY user_id
), eligible AS (
  SELECT * FROM first_seen
  WHERE first_day < DATE '2026-01-04'
)
SELECT ROUND(1.0 * COUNT(*) FILTER (WHERE EXISTS (
  SELECT 1 FROM days d WHERE d.user_id = e.user_id
    AND d.activity_date = e.first_day + 1
)) / NULLIF(COUNT(*), 0), 2) AS d1_retention
FROM eligible e;

-- EXAMPLE: ordered_funnel
-- Expected: user 1 converts; user 2’s purchase before signup does not count. User 3’s follow-up window is incomplete and is excluded.
WITH starts AS (
  SELECT user_id, MIN(event_ts) AS signup_at
  FROM events WHERE event_type = 'signup' GROUP BY user_id
), eligible AS (
  SELECT * FROM starts
  WHERE signup_at + INTERVAL '1 day' <= TIMESTAMP '2026-01-04'
)
SELECT user_id, signup_at,
  (SELECT MIN(p.event_ts) FROM events p
   WHERE p.user_id = s.user_id AND p.event_type = 'purchase'
     AND p.event_ts > s.signup_at
     AND p.event_ts <= s.signup_at + INTERVAL '1 day'
  ) AS purchase_at
FROM eligible s ORDER BY user_id;

-- EXAMPLE: all_requirements
-- Expected: user 1. Duplicate purchases and extra categories do not create false coverage. Another valid strategy counts distinct matched required categories and compares with the requirement count.
SELECT u.user_id
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM required_categories r
  WHERE NOT EXISTS (
    SELECT 1 FROM purchases p
    WHERE p.user_id = u.user_id AND p.category = r.category
  )
)
ORDER BY u.user_id;

-- EXAMPLE: conditional_rate
-- Expected: user 1 → 2/3 = 0.67; user 4 → zero orders and NULL rate. `COUNT(*)` would count the null-extended user-4 join row.
SELECT u.user_id,
  COUNT(o.order_id) AS orders,
  COUNT(o.order_id) FILTER (WHERE o.status = 'paid') AS paid_orders,
  ROUND(1.0 * COUNT(o.order_id) FILTER (WHERE o.status = 'paid')
    / NULLIF(COUNT(o.order_id), 0), 2) AS paid_order_rate
FROM users u LEFT JOIN orders o ON o.user_id = u.user_id
GROUP BY u.user_id ORDER BY u.user_id;

-- EXAMPLE: count_histogram
-- Expected: buckets 0, 1, 2, 3 each contain one user. Here the user population includes people with no orders; an orders-only input would omit bucket zero.
WITH user_counts AS (
  SELECT u.user_id, COUNT(o.order_id) AS order_count
  FROM users u LEFT JOIN orders o ON o.user_id = u.user_id
  GROUP BY u.user_id
)
SELECT order_count, COUNT(*) AS users_in_bucket
FROM user_counts GROUP BY order_count ORDER BY order_count;

-- EXAMPLE: fixed_pivot
-- Expected: user 1 → paid 130, refunded 20. Only users present in orders appear; start with the users relation if every user must appear.
SELECT user_id,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)
    AS paid_amount,
  COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)
    AS refunded_amount
FROM orders GROUP BY user_id ORDER BY user_id;

-- EXAMPLE: frequent_pairs
-- Expected: A–B in two baskets. The duplicate A line in one basket does not count twice.
WITH basket_products AS (
  SELECT DISTINCT basket_id, product_id FROM basket_items
)
SELECT a.product_id AS product_a, b.product_id AS product_b,
       COUNT(*) AS baskets_together
FROM basket_products a JOIN basket_products b
  ON a.basket_id = b.basket_id AND a.product_id < b.product_id
GROUP BY a.product_id, b.product_id
HAVING COUNT(*) >= 2
ORDER BY product_a, product_b;

-- EXAMPLE: set_difference
-- Expected: user 1. EXCEPT compares the selected columns and removes duplicates by default. If you select changing payload columns too, an unchanged key can appear as a difference.
SELECT user_id FROM snapshot_a
EXCEPT
SELECT user_id FROM snapshot_b
ORDER BY user_id;

-- EXAMPLE: weighted_median
-- Expected: counts (1→1, 2→3, 3→2) represent [1,2,2,2,3,3]; median = 2. Lower/upper middle positions fall into one or two value buckets.
WITH cumulative AS (
  SELECT value, frequency,
    SUM(frequency) OVER () AS n,
    SUM(frequency) OVER (ORDER BY value
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS upto
  FROM search_frequency WHERE frequency > 0
)
SELECT AVG(1.0 * value) AS median
FROM cumulative
WHERE upto >= FLOOR((n + 1) / 2.0)
  AND upto - frequency < FLOOR((n + 2) / 2.0);

-- EXAMPLE: asof_lookup
-- Expected: product 1 → 20; product 2 → 7; product 3 → NULL. LATERAL permits the inner relation to depend on the current product.
SELECT p.product_id, h.price
FROM product_catalog p
LEFT JOIN LATERAL (
  SELECT price FROM price_history h
  WHERE h.product_id = p.product_id
    AND h.effective_at <= TIMESTAMP '2026-01-03'
  ORDER BY h.effective_at DESC, h.change_id DESC
  LIMIT 1
) h ON TRUE
ORDER BY p.product_id;

-- EXAMPLE: temporal_join
-- Expected: product-1 facts before/on Jan 3 → prices 10/20. The boundary belongs to the new version exactly once.
WITH versions AS (
  SELECT product_id, effective_at, price,
    LEAD(effective_at) OVER (
      PARTITION BY product_id ORDER BY effective_at
    ) AS valid_to
  FROM price_history
)
SELECT f.fact_id, v.price
FROM product_facts f LEFT JOIN versions v
  ON v.product_id = f.product_id
 AND f.event_at >= v.effective_at
 AND (f.event_at < v.valid_to OR v.valid_to IS NULL)
ORDER BY f.fact_id;

-- EXAMPLE: merge_intervals
-- Expected: [1,12), [20,22). This rule merges touching intervals too; use `>=` rather than `>` to separate touching half-open intervals. Add PARTITION BY for separate resources.
WITH previous AS (
  SELECT *, MAX(end_at) OVER (
    ORDER BY start_at, interval_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
  ) AS previous_max_end FROM intervals
), marked AS (
  SELECT *, CASE WHEN previous_max_end IS NULL OR
    start_at > previous_max_end THEN 1 ELSE 0 END AS new_group
  FROM previous
), labeled AS (
  SELECT *, SUM(new_group) OVER (
    ORDER BY start_at, interval_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS grp FROM marked
)
SELECT MIN(start_at) AS start_at, MAX(end_at) AS end_at
FROM labeled GROUP BY grp ORDER BY start_at;

-- EXAMPLE: cdc_latest
-- Expected: only entity 2 at amount 50. Entity 1’s newer source event is a delete; an older insert arriving later must not resurrect it.
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY entity_id
    ORDER BY source_seq DESC, ingested_at DESC, event_id DESC
  ) AS rn FROM cdc_events
)
SELECT entity_id, amount
FROM ranked WHERE rn = 1 AND operation <> 'D'
ORDER BY entity_id;

-- EXAMPLE: hierarchy
-- Expected: 1 at depth 0; 2/3 at 1; 4 at 2; 5 at 3; 6 at 4. Filter `depth > 0` to omit the anchor.
WITH RECURSIVE team(employee_id, depth) AS (
  SELECT employee_id, 0 FROM employees WHERE employee_id = 1
  UNION ALL
  SELECT e.employee_id, t.depth + 1
  FROM team t JOIN employees e ON e.manager_id = t.employee_id
  WHERE t.depth < 10
)
SELECT employee_id, depth FROM team ORDER BY depth, employee_id;

-- EXAMPLE: reachability
-- Expected: 1, 2, 3 despite the edge 3→1. UNION deduplicates the complete single-column node state.
WITH RECURSIVE reachable(node) AS (
  SELECT 1
  UNION
  SELECT e.dst FROM reachable r JOIN edges e ON e.src = r.node
)
SELECT node FROM reachable ORDER BY node;

-- EXAMPLE: simple_paths
-- Expected: [1], [1,2], [1,3], [1,2,3]. The cycle-closing node is rejected. PostgreSQL also supports a CYCLE clause; array/concatenation syntax and recursion restrictions vary across engines.
WITH RECURSIVE walk(node, depth, path) AS (
  SELECT 1, 0, ARRAY[1]
  UNION ALL
  SELECT e.dst, w.depth + 1, w.path || ARRAY[e.dst]
  FROM walk w JOIN edges e ON e.src = w.node
  WHERE NOT (e.dst = ANY(w.path)) AND w.depth < 10
)
SELECT node, depth, path FROM walk ORDER BY depth, path;

ROLLBACK;
