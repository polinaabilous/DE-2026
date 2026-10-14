-- dim_product: one row per product, plus one unknown member.
with products as (

    select * from {{ ref('stg_products') }}

),

unioned as (

    select
        product_id,
        product_name,
        category,
        list_price
    from products
    union all
    select
        '-1' as product_id,
        'Unknown product' as product_name,
        'Unknown' as category,
        cast(null as decimal(10, 2)) as list_price

)

select
    {{ dbt_utils.generate_surrogate_key(['product_id']) }} as product_key,
    product_id,
    product_name,
    category,
    list_price
from unioned
