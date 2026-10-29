{{
    config(
        materialized='incremental',
        unique_key='review_id',
        incremental_strategy='merge'
    )
}}
-- fct_reviews: one row per review (grain: review_id), the latest version of each review.
-- Each run re-reads a look-back window, so late and edited reviews are merged, not lost.
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from {{ ref('stg_reviews') }}
{% if is_incremental() %}
where updated_at_utc >= (
    -- coalesce: an existing but empty table (dbt run --empty) must not filter everything out
    select coalesce(max(updated_at_utc), timestamp '1900-01-01') - interval {{ var('review_lookback_days', 3) }} day
    from {{ this }}
)
{% endif %}
