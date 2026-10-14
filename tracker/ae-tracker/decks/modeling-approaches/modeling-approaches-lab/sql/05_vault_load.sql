-- 05_vault_load.sql: load ONE batch, the rows landed at getvariable('load_ts').
-- Run: SET VARIABLE load_ts = TIMESTAMP '...'; then this file. Re-running a batch inserts nothing.
INSERT INTO hub_customer                     -- new business keys only, from every source
SELECT md5(customer_id), customer_id, getvariable('load_ts'), min(record_source)
FROM (SELECT customer_id, 'shop' AS record_source FROM stg_shop_customers
      WHERE _loaded_at = getvariable('load_ts')
      UNION ALL
      SELECT customer_id, 'crm' FROM stg_crm_contacts
      WHERE _loaded_at = getvariable('load_ts')
      UNION ALL
      SELECT customer_id, 'shop' FROM stg_orders
      WHERE _loaded_at = getvariable('load_ts') AND customer_id IS NOT NULL) AS src
WHERE md5(customer_id) NOT IN (SELECT customer_hk FROM hub_customer)
GROUP BY customer_id;

INSERT INTO hub_product
SELECT DISTINCT md5(product_id), product_id, getvariable('load_ts'), 'shop'
FROM stg_products
WHERE _loaded_at = getvariable('load_ts')
  AND md5(product_id) NOT IN (SELECT product_hk FROM hub_product);

INSERT INTO hub_order
SELECT DISTINCT md5(order_id), order_id, getvariable('load_ts'), 'shop'
FROM stg_orders
WHERE _loaded_at = getvariable('load_ts')
  AND md5(order_id) NOT IN (SELECT order_hk FROM hub_order);

INSERT INTO link_order_customer
SELECT DISTINCT md5(concat_ws('||', order_id, coalesce(customer_id, '<unknown>'))),
       md5(order_id),
       coalesce(md5(customer_id), '00000000000000000000000000000000'),     -- guest order -> ghost key
       getvariable('load_ts'), 'shop'
FROM stg_orders
WHERE _loaded_at = getvariable('load_ts')
  AND md5(concat_ws('||', order_id, coalesce(customer_id, '<unknown>')))
      NOT IN (SELECT order_customer_hk FROM link_order_customer);

INSERT INTO link_order_line
SELECT DISTINCT md5(concat_ws('||', order_id, line_no, product_id)),
       md5(order_id), md5(product_id), line_no, getvariable('load_ts'), 'shop'
FROM stg_order_lines
WHERE _loaded_at = getvariable('load_ts')
  AND md5(concat_ws('||', order_id, line_no, product_id))
      NOT IN (SELECT order_line_hk FROM link_order_line);

INSERT INTO sat_customer_shop                -- a new row only when the hashdiff changed
WITH incoming AS (
    SELECT DISTINCT md5(customer_id) AS customer_hk, getvariable('load_ts') AS load_ts,
           md5(concat_ws('||', coalesce(name, ''), coalesce(city, ''), coalesce(segment, ''),
                         coalesce(CAST(updated_at AS VARCHAR), ''))) AS hashdiff,
           name, city, segment, updated_at, 'shop' AS record_source
    FROM stg_shop_customers
    WHERE _loaded_at = getvariable('load_ts')
), latest AS (
    SELECT customer_hk, hashdiff FROM sat_customer_shop
    QUALIFY row_number() OVER (PARTITION BY customer_hk ORDER BY load_ts DESC) = 1
)
SELECT i.* FROM incoming AS i
LEFT JOIN latest AS l USING (customer_hk)
WHERE l.hashdiff IS DISTINCT FROM i.hashdiff;

INSERT INTO sat_customer_crm
WITH incoming AS (
    SELECT DISTINCT md5(customer_id) AS customer_hk, getvariable('load_ts') AS load_ts,
           md5(concat_ws('||', coalesce(email, ''), coalesce(loyalty_tier, ''))) AS hashdiff,
           email, loyalty_tier, 'crm' AS record_source
    FROM stg_crm_contacts WHERE _loaded_at = getvariable('load_ts')
), latest AS (
    SELECT customer_hk, hashdiff FROM sat_customer_crm
    QUALIFY row_number() OVER (PARTITION BY customer_hk ORDER BY load_ts DESC) = 1
)
SELECT i.* FROM incoming AS i LEFT JOIN latest AS l USING (customer_hk)
WHERE l.hashdiff IS DISTINCT FROM i.hashdiff;

INSERT INTO sat_product
WITH incoming AS (
    SELECT DISTINCT md5(product_id) AS product_hk, getvariable('load_ts') AS load_ts,
           md5(concat_ws('||', coalesce(name, ''), coalesce(category, ''))) AS hashdiff,
           name, category, 'shop' AS record_source
    FROM stg_products WHERE _loaded_at = getvariable('load_ts')
), latest AS (
    SELECT product_hk, hashdiff FROM sat_product
    QUALIFY row_number() OVER (PARTITION BY product_hk ORDER BY load_ts DESC) = 1
)
SELECT i.* FROM incoming AS i LEFT JOIN latest AS l USING (product_hk)
WHERE l.hashdiff IS DISTINCT FROM i.hashdiff;

INSERT INTO sat_order
WITH incoming AS (
    SELECT DISTINCT md5(order_id) AS order_hk, getvariable('load_ts') AS load_ts,
           md5(concat_ws('||', coalesce(CAST(ordered_at AS VARCHAR), ''),
                         coalesce(CAST(shipping_fee AS VARCHAR), ''))) AS hashdiff,
           ordered_at, shipping_fee, 'shop' AS record_source
    FROM stg_orders WHERE _loaded_at = getvariable('load_ts')
), latest AS (
    SELECT order_hk, hashdiff FROM sat_order
    QUALIFY row_number() OVER (PARTITION BY order_hk ORDER BY load_ts DESC) = 1
)
SELECT i.* FROM incoming AS i LEFT JOIN latest AS l USING (order_hk)
WHERE l.hashdiff IS DISTINCT FROM i.hashdiff;

INSERT INTO sat_order_line
WITH incoming AS (
    SELECT DISTINCT md5(concat_ws('||', order_id, line_no, product_id)) AS order_line_hk,
           getvariable('load_ts') AS load_ts,
           md5(concat_ws('||', coalesce(CAST(quantity AS VARCHAR), ''),
                         coalesce(CAST(unit_price AS VARCHAR), ''))) AS hashdiff,
           quantity, unit_price, 'shop' AS record_source
    FROM stg_order_lines WHERE _loaded_at = getvariable('load_ts')
), latest AS (
    SELECT order_line_hk, hashdiff FROM sat_order_line
    QUALIFY row_number() OVER (PARTITION BY order_line_hk ORDER BY load_ts DESC) = 1
)
SELECT i.* FROM incoming AS i LEFT JOIN latest AS l USING (order_line_hk)
WHERE l.hashdiff IS DISTINCT FROM i.hashdiff;
