-- 02_cohort_matrix.sql: monthly cohorts (Chicago months) from raw events, censored after the last complete month.
CREATE OR REPLACE VIEW user_months AS
SELECT DISTINCT user_id, date_trunc('month', chicago(event_at_utc))::DATE AS activity_month
FROM stg_events;

CREATE OR REPLACE VIEW cohorts AS
SELECT user_id, min(activity_month) AS cohort_month
FROM user_months
GROUP BY user_id;

CREATE OR REPLACE VIEW cohort_long AS
SELECT c.cohort_month,
       date_diff('month', c.cohort_month, m.activity_month) AS month_number,
       count(*)                                              AS active_users
FROM cohorts AS c
JOIN user_months AS m USING (user_id)
GROUP BY ALL;

CREATE OR REPLACE VIEW cohort_cells AS
WITH p AS (
    SELECT last_complete_month AS lcm FROM lab_params
), sizes AS (                                    -- complete cohorts only
    SELECT cohort_month, count(*) AS cohort_size
    FROM cohorts, p
    WHERE cohort_month <= p.lcm
    GROUP BY cohort_month
), grid AS (                                     -- spine: every cohort x age 0..3
    SELECT s.cohort_month, s.cohort_size, n.month_number,
           s.cohort_month + to_months(n.month_number) AS activity_month
    FROM sizes AS s CROSS JOIN range(0, 4) AS n(month_number)
), cells AS (
    SELECT g.cohort_month, g.cohort_size, g.month_number,
           CASE WHEN g.activity_month <= p.lcm
                THEN coalesce(l.active_users, 0) END AS active_users   -- NULL = censored
    FROM grid AS g
    CROSS JOIN p
    LEFT JOIN cohort_long AS l USING (cohort_month, month_number)
)
SELECT *, round(100.0 * active_users / cohort_size, 1) AS retention_pct
FROM cells;
