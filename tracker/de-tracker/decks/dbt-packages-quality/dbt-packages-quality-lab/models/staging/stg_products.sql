-- stg_products: one row per product, from the catalogue seed.
select
    upper(trim(product_id)) as product_id,
    product_name,
    category,
    list_price
from {{ ref('products') }}
