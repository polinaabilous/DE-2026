-- 03_affected.sql: the order dates this batch can change (new and old), read BEFORE the merge
CREATE OR REPLACE TEMP TABLE affected AS
SELECT order_date FROM stg
UNION
SELECT t.order_date
FROM fct_orders AS t
JOIN stg AS s USING (order_id);
