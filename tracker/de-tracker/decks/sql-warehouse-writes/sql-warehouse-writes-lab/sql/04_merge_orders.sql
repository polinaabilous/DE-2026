-- 04_merge_orders.sql: upsert with a version guard and tombstones
MERGE INTO fct_orders AS t
USING stg AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING   -- stale or already applied
WHEN MATCHED AND s.op = 'D' THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = true
WHEN MATCHED THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN                                           -- a delete we never saw: tombstone
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D');
