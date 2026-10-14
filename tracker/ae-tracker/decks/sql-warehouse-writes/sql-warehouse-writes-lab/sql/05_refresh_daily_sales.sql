-- 05_refresh_daily_sales.sql: replace the affected days, recomputed from the fact
DELETE FROM agg_daily_sales
WHERE order_date IN (SELECT order_date FROM affected);

INSERT INTO agg_daily_sales
SELECT order_date, count(*) AS orders, sum(amount) AS revenue
FROM fct_orders
WHERE NOT is_deleted
  AND status NOT IN ('cancelled', 'refunded')
  AND order_date IN (SELECT order_date FROM affected)
GROUP BY order_date;
