-- 00_staging.sql: typed, cleaned copies of the landed files (silver). One model per source file.
CREATE OR REPLACE TABLE stg_shop_customers AS
SELECT upper(trim(customer_id)) AS customer_id, name, city, segment, updated_at, _loaded_at
FROM read_csv('data/shop_customers.csv', header = true,
     columns = {'customer_id': 'VARCHAR', 'name': 'VARCHAR', 'city': 'VARCHAR', 'segment': 'VARCHAR',
                'updated_at': 'TIMESTAMP', '_loaded_at': 'TIMESTAMP'});

CREATE OR REPLACE TABLE stg_crm_contacts AS
SELECT upper(trim(customer_ref)) AS customer_id,      -- ' c-001' and 'C-001 ' are the same customer
       email, loyalty_tier, _loaded_at
FROM read_csv('data/crm_contacts.csv', header = true,
     columns = {'customer_ref': 'VARCHAR', 'email': 'VARCHAR', 'loyalty_tier': 'VARCHAR',
                '_loaded_at': 'TIMESTAMP'});

CREATE OR REPLACE TABLE stg_products AS
SELECT product_id, name, category, _loaded_at
FROM read_csv('data/products.csv', header = true,
     columns = {'product_id': 'VARCHAR', 'name': 'VARCHAR', 'category': 'VARCHAR',
                '_loaded_at': 'TIMESTAMP'});

CREATE OR REPLACE TABLE stg_orders AS
SELECT order_id, customer_id, ordered_at, shipping_fee, _loaded_at     -- customer_id NULL = guest checkout
FROM read_csv('data/orders.csv', header = true,
     columns = {'order_id': 'VARCHAR', 'customer_id': 'VARCHAR', 'ordered_at': 'TIMESTAMP',
                'shipping_fee': 'DECIMAL(10,2)', '_loaded_at': 'TIMESTAMP'});

CREATE OR REPLACE TABLE stg_order_lines AS
SELECT order_id, line_no, product_id, quantity, unit_price, _loaded_at
FROM read_csv('data/order_lines.csv', header = true,
     columns = {'order_id': 'VARCHAR', 'line_no': 'INTEGER', 'product_id': 'VARCHAR',
                'quantity': 'INTEGER', 'unit_price': 'DECIMAL(10,2)', '_loaded_at': 'TIMESTAMP'});

CREATE OR REPLACE TABLE stg_web_events AS
SELECT event_id, customer_id, anonymous_id, event_name, product_id, event_at, _loaded_at
FROM read_csv('data/web_events.csv', header = true,
     columns = {'event_id': 'VARCHAR', 'customer_id': 'VARCHAR', 'anonymous_id': 'VARCHAR',
                'event_name': 'VARCHAR', 'product_id': 'VARCHAR', 'event_at': 'TIMESTAMP',
                '_loaded_at': 'TIMESTAMP'})
QUALIFY row_number() OVER (PARTITION BY event_id ORDER BY _loaded_at) = 1;   -- E06 was delivered twice
