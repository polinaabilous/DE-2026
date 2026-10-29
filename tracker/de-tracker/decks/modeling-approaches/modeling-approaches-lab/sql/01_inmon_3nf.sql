-- 01_inmon_3nf.sql: an Inmon-style integration layer. Each fact is stored once (3NF),
-- both sources are integrated, and history is kept. Marts are derived from it.
CREATE OR REPLACE TABLE edw_customer AS          -- one row per customer, from BOTH sources
SELECT customer_id, s.name, c.email, c.loyalty_tier
FROM (SELECT DISTINCT customer_id, name FROM stg_shop_customers) AS s
FULL JOIN stg_crm_contacts AS c USING (customer_id);

CREATE OR REPLACE TABLE edw_customer_profile AS  -- history: one row per version
SELECT customer_id, city, segment, updated_at AS valid_from,
       lead(updated_at, 1, TIMESTAMP '9999-12-31') OVER (PARTITION BY customer_id ORDER BY updated_at) AS valid_to
FROM (SELECT DISTINCT customer_id, city, segment, updated_at FROM stg_shop_customers);

CREATE OR REPLACE TABLE edw_product_category AS
SELECT row_number() OVER (ORDER BY category) AS category_id, category AS category_name
FROM (SELECT DISTINCT category FROM stg_products);

CREATE OR REPLACE TABLE edw_product AS           -- category stored once, referenced by id
SELECT p.product_id, p.name, c.category_id
FROM stg_products AS p JOIN edw_product_category AS c ON c.category_name = p.category;

CREATE OR REPLACE TABLE edw_sales_order AS
SELECT order_id, customer_id, ordered_at, shipping_fee FROM stg_orders;

CREATE OR REPLACE TABLE edw_sales_order_line AS
SELECT order_id, line_no, product_id, quantity, unit_price FROM stg_order_lines;
