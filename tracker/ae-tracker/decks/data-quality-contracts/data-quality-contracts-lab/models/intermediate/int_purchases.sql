-- int_purchases: purchase events that can be counted as orders.
-- Ephemeral (folder default): never built, inlined as a CTE where referenced.
select
    event_id                    as order_id,
    customer_id,
    product_id,
    event_at_utc                as ordered_at_utc,
    cast(event_at_utc as date)  as order_date_utc,
    amount
from {{ ref('stg_events') }}
where event_type = 'purchase'
  and amount is not null       -- e7 ("abc") is excluded; a test reports it
