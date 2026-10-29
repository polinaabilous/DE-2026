-- 90_reconcile.sql: rebuild both tables from every batch file and count differences
CREATE OR REPLACE TEMP TABLE all_changes AS
FROM read_csv(getvariable('all_files'), header = true,
     columns = {'change_seq': 'BIGINT', 'op': 'VARCHAR', 'order_id': 'INTEGER',
            'customer_id': 'INTEGER', 'order_date': 'DATE', 'status': 'VARCHAR',
            'amount': 'DECIMAL(10,2)', 'updated_at': 'TIMESTAMP'});

CREATE OR REPLACE TEMP TABLE fct_rebuild AS
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq,
       op = 'D' AS is_deleted
FROM all_changes
WHERE order_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1;

CREATE OR REPLACE TEMP TABLE agg_rebuild AS
SELECT order_date, count(*) AS orders, sum(amount)::DECIMAL(12,2) AS revenue
FROM fct_rebuild
WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
GROUP BY order_date;

SELECT 'fct_orders' AS table_name,
       (SELECT count(*) FROM (FROM fct_orders EXCEPT FROM fct_rebuild)) AS only_in_table,
       (SELECT count(*) FROM (FROM fct_rebuild EXCEPT FROM fct_orders)) AS only_in_rebuild
UNION ALL
SELECT 'agg_daily_sales',
       (SELECT count(*) FROM (FROM agg_daily_sales EXCEPT FROM agg_rebuild)),
       (SELECT count(*) FROM (FROM agg_rebuild EXCEPT FROM agg_daily_sales))
ORDER BY table_name;
