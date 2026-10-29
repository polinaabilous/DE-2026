-- 02_stage.sql: read one batch file, quarantine broken rows, keep the newest row per key
CREATE OR REPLACE TEMP TABLE stg_raw AS
SELECT getvariable('batch_id') AS batch_id, *
FROM read_csv(getvariable('batch_file'), header = true,
     columns = {'change_seq': 'BIGINT', 'op': 'VARCHAR', 'order_id': 'INTEGER',
            'customer_id': 'INTEGER', 'order_date': 'DATE', 'status': 'VARCHAR',
            'amount': 'DECIMAL(10,2)', 'updated_at': 'TIMESTAMP'});

DELETE FROM quarantine WHERE batch_id = getvariable('batch_id');   -- re-runnable
INSERT INTO quarantine
SELECT batch_id, change_seq, 'order_id is NULL', r::VARCHAR
FROM stg_raw AS r
WHERE order_id IS NULL;

CREATE OR REPLACE TEMP TABLE stg AS
SELECT *
FROM stg_raw
WHERE order_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1;
