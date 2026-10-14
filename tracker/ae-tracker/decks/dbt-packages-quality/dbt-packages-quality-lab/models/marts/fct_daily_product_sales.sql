-- fct_daily_product_sales: one row per UTC order date and product.
-- Grain: (date_key, product_key). Measures: orders, revenue.
with orders as (

    select * from {{ ref('fct_orders') }}

)

select
    {{ dbt_utils.generate_surrogate_key(['date_key', 'product_key']) }}
        as daily_product_sales_key,
    date_key,
    product_key,
    count(*) as orders,
    sum(amount) as revenue
from orders
group by 2, 3
