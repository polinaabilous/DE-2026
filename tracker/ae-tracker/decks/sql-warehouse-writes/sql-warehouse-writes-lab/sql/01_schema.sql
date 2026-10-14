-- 01_schema.sql: the warehouse tables (safe to run every time)
CREATE TABLE IF NOT EXISTS fct_orders (
    order_id    INTEGER,          -- grain: one row per order
    customer_id INTEGER,
    order_date  DATE,
    status      VARCHAR,
    amount      DECIMAL(10,2),
    updated_at  TIMESTAMP,
    change_seq  BIGINT,           -- the version used by the guard
    is_deleted  BOOLEAN           -- soft delete (tombstone)
);
CREATE TABLE IF NOT EXISTS agg_daily_sales (
    order_date DATE,              -- partition
    orders     INTEGER,
    revenue    DECIMAL(12,2)
);
CREATE TABLE IF NOT EXISTS quarantine (
    batch_id   INTEGER,
    change_seq BIGINT,
    reason     VARCHAR,
    raw        VARCHAR
);
CREATE TABLE IF NOT EXISTS load_log (
    batch_id      INTEGER,
    file_name     VARCHAR,
    rows_in_file  INTEGER,
    rows_merged   INTEGER,
    days_refreshed INTEGER
);
