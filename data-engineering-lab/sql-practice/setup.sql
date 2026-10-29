-- Tables and sample data for the SQL interview patterns lab.
-- Run once in a new database; these tables persist after closing DuckDB.
-- From the DE 2026 folder:
--   duckdb data-engineering-lab/sql-practice/practice.duckdb
-- Then at the DuckDB prompt:
--   .read data-engineering-lab/sql-practice/setup.sql

BEGIN;

CREATE TABLE users AS
SELECT * FROM (VALUES (1),(2),(3),(4)) AS t(user_id);

CREATE TABLE orders AS
SELECT * FROM (VALUES
 (1,1,50, TIMESTAMP '2026-01-01 09:00:00','paid'),
 (2,1,80, TIMESTAMP '2026-01-02 09:00:00','paid'),
 (3,1,20, TIMESTAMP '2026-01-02 09:00:00','refunded'),
 (4,2,120,TIMESTAMP '2026-01-03 09:00:00','paid'),
 (5,2,40, TIMESTAMP '2026-01-04 09:00:00','paid'),
 (6,3,60, TIMESTAMP '2026-01-04 09:00:00','paid')
) AS t(order_id,user_id,amount,order_ts,status);

CREATE TABLE order_items AS
SELECT * FROM (VALUES (1,20),(1,30)) AS t(order_id,line_amount);
CREATE TABLE order_payments AS
SELECT * FROM (VALUES (1,25),(1,25)) AS t(order_id,paid_amount);

CREATE TABLE employees AS
SELECT * FROM (VALUES
 (1,NULL,'A',100),(2,1,'A',100),(3,1,'A',90),
 (4,2,'A',80),(5,4,'B',70),(6,5,'B',60)
) AS t(employee_id,manager_id,department,salary);

CREATE TABLE product_spend AS
SELECT * FROM (VALUES
 ('A',1,50),('A',1,50),('A',2,80),('A',3,80),('A',4,10),('B',5,25)
) AS t(category,product_id,spend);

CREATE TABLE daily_metrics AS
SELECT * FROM (VALUES
 (DATE '2026-01-01',10),(DATE '2026-01-02',20),(DATE '2026-01-05',50)
) AS t(day,value);

CREATE TABLE activity AS
SELECT * FROM (VALUES
 (1,DATE '2026-01-01'),(1,DATE '2026-01-01'),(1,DATE '2026-01-02'),
 (1,DATE '2026-01-03'),(1,DATE '2026-01-05'),
 (2,DATE '2026-01-01'),(2,DATE '2026-01-03'),(2,DATE '2026-01-04'),
 (3,DATE '2026-01-04')
) AS t(user_id,activity_date);

CREATE TABLE events AS
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

CREATE TABLE payment_events AS
SELECT * FROM (VALUES
 (1,1,1,100,TIMESTAMP '2026-01-01 00:00:00'),
 (2,1,1,100,TIMESTAMP '2026-01-01 00:08:00'),
 (3,1,1,100,TIMESTAMP '2026-01-01 00:16:00'),
 (4,1,1,100,TIMESTAMP '2026-01-01 00:40:00'),
 (5,1,1,200,TIMESTAMP '2026-01-01 00:41:00')
) AS t(payment_id,merchant_id,card_id,amount,paid_at);

CREATE TABLE required_categories AS
SELECT * FROM (VALUES ('A'),('B'),('C')) AS t(category);
CREATE TABLE purchases AS
SELECT * FROM (VALUES
 (1,'A'),(1,'A'),(1,'B'),(1,'C'),(2,'A'),(2,'B'),(2,'D')
) AS t(user_id,category);

CREATE TABLE basket_items AS
SELECT * FROM (VALUES
 (1,'A'),(1,'A'),(1,'B'),(2,'A'),(2,'C'),(3,'A'),(3,'B')
) AS t(basket_id,product_id);
CREATE TABLE snapshot_a AS
SELECT * FROM (VALUES (1),(1),(2)) AS t(user_id);
CREATE TABLE snapshot_b AS
SELECT * FROM (VALUES (2),(3),(NULL)) AS t(user_id);
CREATE TABLE search_frequency AS
SELECT * FROM (VALUES (1,1),(2,3),(3,2)) AS t(value,frequency);

CREATE TABLE product_catalog AS
SELECT * FROM (VALUES (1),(2),(3)) AS t(product_id);
CREATE TABLE price_history AS
SELECT * FROM (VALUES
 (1,TIMESTAMP '2026-01-01',10,1),
 (1,TIMESTAMP '2026-01-03',20,2),
 (1,TIMESTAMP '2026-01-05',30,3),
 (2,TIMESTAMP '2026-01-02',7,4)
) AS t(product_id,effective_at,price,change_id);
CREATE TABLE product_facts AS
SELECT * FROM (VALUES
 (1,1,TIMESTAMP '2026-01-02'),(2,1,TIMESTAMP '2026-01-03'),
 (3,3,TIMESTAMP '2026-01-02')
) AS t(fact_id,product_id,event_at);
CREATE TABLE intervals AS
SELECT * FROM (VALUES (1,1,10),(2,2,3),(3,9,12),(4,20,21),(5,21,22))
 AS t(interval_id,start_at,end_at);

CREATE TABLE cdc_events AS
SELECT * FROM (VALUES
 (1,1,TIMESTAMP '2026-01-01',1,'I',10),
 (1,2,TIMESTAMP '2026-01-02',2,'D',NULL),
 (1,1,TIMESTAMP '2026-01-03',3,'I',10),
 (2,2,TIMESTAMP '2026-01-02',4,'I',20),
 (2,3,TIMESTAMP '2026-01-03',5,'U',50)
) AS t(entity_id,source_seq,ingested_at,event_id,operation,amount);
CREATE TABLE edges AS
SELECT * FROM (VALUES (1,2),(2,3),(3,1),(1,3)) AS t(src,dst);

COMMIT;
