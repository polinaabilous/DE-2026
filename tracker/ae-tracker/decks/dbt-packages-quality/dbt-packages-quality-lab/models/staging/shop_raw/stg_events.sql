-- stg_events: cleaned, typed and deduplicated website events.
-- Grain: one row per event_id.
with source as (

    select * from {{ source('shop_raw', 'events') }}

),

cleaned as (

    select
        event_id,
        nullif(lower(trim(user_id)), '') as customer_id,
        lower(trim(event_type)) as event_type,
        {{ to_utc('ts') }} as event_at_utc,
        try_cast(trim(amount) as decimal(10, 2)) as amount,
        amount as amount_raw,
        upper(trim(product_id)) as product_id,
        _source_file
    from source

),

deduplicated as (

    select *
    from cleaned
    qualify row_number() over (
        partition by event_id
        order by _source_file desc       -- the latest delivery wins
    ) = 1

)

select * from deduplicated
