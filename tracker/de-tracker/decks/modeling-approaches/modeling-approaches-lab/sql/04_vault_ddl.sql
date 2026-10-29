-- 04_vault_ddl.sql: a raw Data Vault for Leafy. Hubs = business keys, links = relationships,
-- satellites = descriptive history. Every table is insert-only.
CREATE TABLE IF NOT EXISTS hub_customer (
    customer_hk VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL,
    load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS hub_product (
    product_hk VARCHAR PRIMARY KEY, product_id VARCHAR NOT NULL,
    load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS hub_order (
    order_hk VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL,
    load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS link_order_customer (
    order_customer_hk VARCHAR PRIMARY KEY, order_hk VARCHAR NOT NULL, customer_hk VARCHAR NOT NULL,
    load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS link_order_line (
    order_line_hk VARCHAR PRIMARY KEY, order_hk VARCHAR NOT NULL, product_hk VARCHAR NOT NULL,
    line_no INTEGER NOT NULL, load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS sat_customer_shop (
    customer_hk VARCHAR, load_ts TIMESTAMP, hashdiff VARCHAR NOT NULL,
    name VARCHAR, city VARCHAR, segment VARCHAR, updated_at TIMESTAMP, record_source VARCHAR,
    PRIMARY KEY (customer_hk, load_ts));
CREATE TABLE IF NOT EXISTS sat_customer_crm (
    customer_hk VARCHAR, load_ts TIMESTAMP, hashdiff VARCHAR NOT NULL,
    email VARCHAR, loyalty_tier VARCHAR, record_source VARCHAR,
    PRIMARY KEY (customer_hk, load_ts));
CREATE TABLE IF NOT EXISTS sat_product (
    product_hk VARCHAR, load_ts TIMESTAMP, hashdiff VARCHAR NOT NULL,
    name VARCHAR, category VARCHAR, record_source VARCHAR, PRIMARY KEY (product_hk, load_ts));
CREATE TABLE IF NOT EXISTS sat_order (
    order_hk VARCHAR, load_ts TIMESTAMP, hashdiff VARCHAR NOT NULL,
    ordered_at TIMESTAMP, shipping_fee DECIMAL(10,2), record_source VARCHAR,
    PRIMARY KEY (order_hk, load_ts));
CREATE TABLE IF NOT EXISTS sat_order_line (
    order_line_hk VARCHAR, load_ts TIMESTAMP, hashdiff VARCHAR NOT NULL,
    quantity INTEGER, unit_price DECIMAL(10,2), record_source VARCHAR,
    PRIMARY KEY (order_line_hk, load_ts));
-- the ghost record: guest orders link to it instead of a NULL key
INSERT INTO hub_customer
SELECT '00000000000000000000000000000000', '<unknown>', TIMESTAMP '1900-01-01', 'system'
WHERE NOT EXISTS (SELECT 1 FROM hub_customer WHERE customer_hk = '00000000000000000000000000000000');
