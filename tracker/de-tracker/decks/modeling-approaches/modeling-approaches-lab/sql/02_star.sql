-- 02_star.sql: a Kimball star for sales (gold). SCD2 customer dimension, line-grain fact.
CREATE OR REPLACE TABLE dim_customer AS
WITH versions AS (
    SELECT DISTINCT customer_id, name, city, segment, updated_at FROM stg_shop_customers
)
SELECT row_number() OVER (ORDER BY v.customer_id, v.updated_at) AS customer_sk,
       v.customer_id, v.name, v.city, v.segment, c.email, c.loyalty_tier,
       v.updated_at AS valid_from,
       lead(v.updated_at, 1, TIMESTAMP '9999-12-31')
           OVER (PARTITION BY v.customer_id ORDER BY v.updated_at) AS valid_to,
       valid_to = TIMESTAMP '9999-12-31' AS is_current
FROM versions AS v
LEFT JOIN stg_crm_contacts AS c USING (customer_id)
UNION ALL                                                  -- the unknown member for guest orders
SELECT -1, 'unknown', 'unknown', 'unknown', 'unknown', NULL, NULL,
       TIMESTAMP '1900-01-01', TIMESTAMP '9999-12-31', true;

CREATE OR REPLACE TABLE dim_product AS
SELECT row_number() OVER (ORDER BY product_id) AS product_sk, product_id, name AS product_name, category
FROM stg_products;

CREATE OR REPLACE TABLE fct_order_line AS          -- grain: one row per order line
SELECT l.order_id, l.line_no,                                 -- order_id is a degenerate dimension
       coalesce(c.customer_sk, -1) AS customer_sk,            -- the version valid at order time
       p.product_sk, o.ordered_at, l.quantity, l.unit_price,
       l.quantity * l.unit_price AS line_revenue
FROM stg_order_lines AS l
JOIN stg_orders AS o USING (order_id)
LEFT JOIN dim_customer AS c
       ON c.customer_id = o.customer_id
      AND o.ordered_at >= c.valid_from AND o.ordered_at < c.valid_to
JOIN dim_product AS p USING (product_id);

CREATE OR REPLACE TABLE fct_order AS               -- grain: one row per order
SELECT o.order_id, coalesce(c.customer_sk, -1) AS customer_sk, o.ordered_at, o.shipping_fee
FROM stg_orders AS o
LEFT JOIN dim_customer AS c
       ON c.customer_id = o.customer_id
      AND o.ordered_at >= c.valid_from AND o.ordered_at < c.valid_to;

CREATE OR REPLACE TABLE fct_product_view AS        -- grain: one row per product view
SELECT e.event_id, coalesce(c.customer_sk, -1) AS customer_sk, p.product_sk, e.event_at AS viewed_at
FROM stg_web_events AS e
LEFT JOIN dim_customer AS c
       ON c.customer_id = e.customer_id
      AND e.event_at >= c.valid_from AND e.event_at < c.valid_to
JOIN dim_product AS p USING (product_id)
WHERE e.event_name = 'viewed_product';
