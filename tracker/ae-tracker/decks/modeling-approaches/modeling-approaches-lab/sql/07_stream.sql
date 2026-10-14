-- 07_stream.sql: an Activity Schema stream for the customer entity: one row per activity,
-- one table for everything, features in JSON.
CREATE OR REPLACE TABLE customer_stream AS
WITH segment_versions AS (                                   -- profile snapshots -> change activities
    SELECT DISTINCT customer_id, segment, updated_at FROM stg_shop_customers
), segment_changes AS (
    SELECT * FROM segment_versions
    QUALIFY segment IS DISTINCT FROM lag(segment) OVER (PARTITION BY customer_id ORDER BY updated_at)
), activities AS (
    SELECT 'seg-' || customer_id || '-' || strftime(updated_at, '%Y%m%d%H%M') AS activity_id,
           updated_at AS ts, customer_id AS customer, NULL AS anonymous_customer_id,
           'updated_segment' AS activity, json_object('segment', segment) AS feature_json,
           NULL::DECIMAL(10,2) AS revenue_impact
    FROM segment_changes
    UNION ALL
    SELECT event_id, event_at, customer_id, anonymous_id, 'viewed_product',
           json_object('product_id', product_id), NULL
    FROM stg_web_events WHERE event_name = 'viewed_product'
    UNION ALL
    SELECT order_id, ordered_at, customer_id,
           CASE WHEN customer_id IS NULL THEN 'guest-' || order_id END, 'completed_order',
           json_object('shipping_fee', shipping_fee), NULL
    FROM stg_orders
    UNION ALL
    SELECT l.order_id || '-' || l.line_no, o.ordered_at, o.customer_id,
           CASE WHEN o.customer_id IS NULL THEN 'guest-' || o.order_id END, 'ordered_item',
           json_object('order_id', l.order_id, 'product_id', l.product_id, 'quantity', l.quantity),
           l.quantity * l.unit_price
    FROM stg_order_lines AS l JOIN stg_orders AS o USING (order_id)
)
SELECT *,
       row_number() OVER w AS activity_occurrence,          -- 1 = the first time
       lead(ts) OVER w     AS activity_repeated_at          -- when it happened next
FROM activities
WINDOW w AS (PARTITION BY coalesce(customer, anonymous_customer_id), activity ORDER BY ts, activity_id);
