-- stg_reviews: product reviews, cleaned, typed and deduplicated. Grain: one row per review_id.
with source as (

    select * from {{ source('shop_raw', 'reviews') }}

),

cleaned as (

    select
        review_id,
        upper(trim(product_id))                           as product_id,
        nullif(lower(trim(user_id)), '')                  as customer_id,
        try_cast(rating as integer)                       as rating_raw,
        coalesce(try_cast(rating_scale as integer), 5)    as rating_scale,
        body,
        {{ to_utc('submitted_at') }}                       as submitted_at_utc,
        {{ to_utc('coalesce(edited_at, submitted_at)') }}  as updated_at_utc,
        _loaded_at,
        _source_file
    from source

),

rated as (

    select
        *,
        case    -- the old app sent ratings out of 10; convert to 1-5, half away from zero
            when rating_scale = 10 and rating_raw between 1 and 10 then cast(round(rating_raw / 2) as integer)
            when rating_scale = 5  and rating_raw between 1 and 5  then rating_raw
        end as rating
    from cleaned

),

deduplicated as (

    select *
    from rated
    qualify row_number() over (
        partition by review_id
        order by updated_at_utc desc, _loaded_at desc   -- latest edit wins; then the latest delivery
    ) = 1

)

select
    review_id, product_id, customer_id, rating, rating_raw, rating_scale, body,
    submitted_at_utc, updated_at_utc, _loaded_at, _source_file
from deduplicated
