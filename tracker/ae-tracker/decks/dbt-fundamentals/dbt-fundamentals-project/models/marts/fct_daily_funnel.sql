{{ config(tags=["funnel"]) }}
-- fct_daily_funnel: one row per UTC day with event counts by type.
-- A periodic snapshot fact (grain: date).
select
    cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer) as date_key,
    count(*) filter (where event_type = 'page_view')   as page_view_events,
    count(*) filter (where event_type = 'add_to_cart') as add_to_cart_events,
    count(*) filter (where event_type = 'purchase')    as purchase_events,
    count(*) filter (where event_type = 'refund')      as refund_events,
    count(distinct customer_id) as active_customers
from {{ ref("stg_events") }}
group by 1
