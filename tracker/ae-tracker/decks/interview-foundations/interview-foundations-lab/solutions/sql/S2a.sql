-- S2a: users who added to cart but never purchased, after keeping the latest copy of each event
WITH latest AS (
    SELECT *
    FROM events
    QUALIFY row_number() OVER (PARTITION BY event_id ORDER BY ingested_at DESC) = 1
)
SELECT DISTINCT a.user_id
FROM latest AS a
WHERE a.event_type = 'add_to_cart'
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM latest AS p
      WHERE p.user_id = a.user_id AND p.event_type = 'purchase')
ORDER BY a.user_id;
