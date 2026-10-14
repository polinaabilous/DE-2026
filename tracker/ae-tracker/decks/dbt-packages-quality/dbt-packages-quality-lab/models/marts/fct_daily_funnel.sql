{{ config(tags=["funnel"]) }}
-- fct_daily_funnel: one row per UTC day with event counts by type.
-- A periodic snapshot fact (grain: date).
-- Event types come from a project variable.
with counts as (

    select
        cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer)
            as date_key,
        {%- for event_type in var("funnel_event_types") %}
            count(*) filter (where event_type = '{{ event_type }}')
                as {{ event_type }}_events,
        {%- endfor %}
        count(distinct customer_id) as active_customers
    from {{ ref("stg_events") }}
    group by 1

)

select
    *,
    {{ safe_divide('purchase_events', 'page_view_events') }}
        as purchases_per_page_view
from counts
