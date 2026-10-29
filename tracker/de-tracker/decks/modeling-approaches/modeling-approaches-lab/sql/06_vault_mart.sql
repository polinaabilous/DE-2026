-- 06_vault_mart.sql: an information mart on top of the vault. The vault is for loading and
-- history; people query marts like this one.
CREATE OR REPLACE VIEW vault_sales_lines AS
WITH order_now AS (                                   -- latest satellite row per order
    SELECT * FROM sat_order
    QUALIFY row_number() OVER (PARTITION BY order_hk ORDER BY load_ts DESC) = 1
), line_now AS (
    SELECT * FROM sat_order_line
    QUALIFY row_number() OVER (PARTITION BY order_line_hk ORDER BY load_ts DESC) = 1
), product_now AS (
    SELECT * FROM sat_product
    QUALIFY row_number() OVER (PARTITION BY product_hk ORDER BY load_ts DESC) = 1
)
SELECT ho.order_id, ll.line_no, o.ordered_at, loc.customer_hk, hp.product_id, pn.category,
       ln.quantity * ln.unit_price AS line_revenue
FROM hub_order           AS ho
JOIN order_now           AS o   ON o.order_hk = ho.order_hk
JOIN link_order_customer AS loc ON loc.order_hk = ho.order_hk
JOIN link_order_line     AS ll  ON ll.order_hk = ho.order_hk
JOIN line_now            AS ln  ON ln.order_line_hk = ll.order_line_hk
JOIN hub_product         AS hp  ON hp.product_hk = ll.product_hk
JOIN product_now         AS pn  ON pn.product_hk = hp.product_hk;
