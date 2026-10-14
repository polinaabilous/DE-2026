-- 03_funnel.sql: view -> cart -> purchase, each step at or after the previous one,
-- all within 7 days (168 hours) of the user's first product view in the funnel month (Chicago).
CREATE OR REPLACE VIEW funnel_users AS
WITH p AS (
    SELECT (funnel_month::TIMESTAMP AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC'            AS lo,
           ((funnel_month + INTERVAL 1 MONTH) AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC' AS hi,
           loaded_at_utc
    FROM lab_params
), entry AS (
    SELECT e.user_id, min(e.event_at_utc) AS t1, any_value(p.loaded_at_utc) AS loaded_at_utc
    FROM stg_events AS e, p
    WHERE e.event_name = 'view_product' AND e.event_at_utc >= p.lo AND e.event_at_utc < p.hi
    GROUP BY e.user_id
), step2 AS (
    SELECT n.user_id, n.t1, n.loaded_at_utc, min(e.event_at_utc) AS t2
    FROM entry AS n
    LEFT JOIN stg_events AS e
           ON e.user_id = n.user_id AND e.event_name = 'add_to_cart'
          AND e.event_at_utc >= n.t1 AND e.event_at_utc <= n.t1 + INTERVAL 7 DAY
    GROUP BY ALL
)
SELECT s.user_id, s.t1, s.t2, min(e.event_at_utc) AS t3,
       s.t1 + INTERVAL 7 DAY <= s.loaded_at_utc AS mature
FROM step2 AS s
LEFT JOIN stg_events AS e
       ON e.user_id = s.user_id AND e.event_name = 'purchase'
      AND e.event_at_utc >= s.t2 AND e.event_at_utc <= s.t1 + INTERVAL 7 DAY
GROUP BY ALL;

CREATE OR REPLACE VIEW funnel_summary AS
SELECT count(*)                         AS viewed,
       count(t2)                        AS carted,
       count(t3)                        AS purchased,
       round(count(t2) / count(*), 3)   AS view_to_cart,
       round(count(t3) / count(t2), 3)  AS cart_to_purchase,
       round(count(t3) / count(*), 3)   AS overall,
       bool_and(mature)                 AS all_entries_mature
FROM funnel_users;
