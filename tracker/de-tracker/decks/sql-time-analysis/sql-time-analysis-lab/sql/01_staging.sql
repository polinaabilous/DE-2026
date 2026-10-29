-- 01_staging.sql: de-duplicated events of known users, the business time zone, and the lab parameters.
CREATE OR REPLACE MACRO chicago(ts_utc) AS
    (ts_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago';

CREATE OR REPLACE TABLE stg_events AS
SELECT DISTINCT event_id, user_id, event_name, event_at_utc     -- event 8 was delivered twice
FROM read_csv('data/events.csv', header = true,
              columns = {'event_id': 'INTEGER', 'user_id': 'INTEGER',
                         'event_name': 'VARCHAR', 'event_at_utc': 'TIMESTAMP'})
WHERE user_id IS NOT NULL;                                         -- anonymous rows cannot be followed

CREATE OR REPLACE TABLE lab_params AS
SELECT TIMESTAMP '2026-04-20 15:00'  AS loaded_at_utc,         -- 10:00 in Chicago
       DATE '2026-03-01'             AS last_complete_month,   -- April is still running
       DATE '2026-03-01'             AS funnel_month;          -- entries: first product view in March
