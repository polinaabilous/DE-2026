-- dim_product: one row per product, plus one unknown member.
with products as (

    select * from {{ ref('stg_products') }}

),

unioned as (

    select product_id, product_name, category, list_price from products
    union all
    select '-1', 'Unknown product', 'Unknown', cast(null as decimal(10, 2))

)

select
    md5(product_id) as product_key,
    product_id,
    product_name,
    category,
    list_price
from unioned
