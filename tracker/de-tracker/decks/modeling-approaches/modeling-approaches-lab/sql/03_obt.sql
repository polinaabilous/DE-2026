-- 03_obt.sql: One Big Table at the fact's grain, built FROM the star (a serving projection).
CREATE OR REPLACE TABLE obt_order_lines AS
SELECT f.order_id, f.line_no, f.ordered_at, f.quantity, f.unit_price, f.line_revenue,
       c.customer_id, c.name AS customer_name, c.city AS city_at_order,
       c.segment AS segment_at_order,                        -- as-was (SCD2 version at order time)
       coalesce(cur.segment, 'unknown') AS segment_current,  -- as-is (frozen at build time!)
       c.loyalty_tier,
       p.product_id, p.product_name, p.category
FROM fct_order_line AS f
JOIN dim_customer   AS c   USING (customer_sk)
LEFT JOIN dim_customer AS cur ON cur.customer_id = c.customer_id AND cur.is_current
                             AND c.customer_sk <> -1
JOIN dim_product    AS p   USING (product_sk);
