-- S2b: daily active users per local day (America/Chicago), 7-9 March 2026
WITH latest AS (
    SELECT *
    FROM events
    QUALIFY row_number() OVER (PARTITION BY event_id ORDER BY ingested_at DESC) = 1
)
SELECT (event_ts AT TIME ZONE 'America/Chicago')::DATE AS local_day,
       count(DISTINCT user_id) AS dau            -- COUNT(DISTINCT) ignores NULL user_id
FROM latest
WHERE event_ts IS NOT NULL
  AND (event_ts AT TIME ZONE 'America/Chicago')::DATE BETWEEN DATE '2026-03-07' AND DATE '2026-03-09'
GROUP BY local_day
ORDER BY local_day;
