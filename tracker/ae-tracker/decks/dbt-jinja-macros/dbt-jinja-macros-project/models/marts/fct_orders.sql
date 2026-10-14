-- fct_orders: one row per order (a purchase event with a valid amount).
-- Grain: order_id. Measures: amount. Foreign keys to dim_date, dim_customer, dim_product.
with purchases as (

    select * from {{ ref('int_purchases') }}

),

customers as (

    select customer_key, customer_id from {{ ref('dim_customer') }}

),

products as (

    select product_key, product_id from {{ ref('dim_product') }}

)

select
    purchases.order_id,
    cast(strftime(purchases.order_date_utc, '%Y%m%d') as integer) as date_key,
    coalesce(customers.customer_key, md5('-1'))                     as customer_key,
    coalesce(products.product_key, md5('-1'))                       as product_key,
    purchases.ordered_at_utc,
    purchases.amount
from purchases
left join customers on purchases.customer_id = customers.customer_id
left join products  on purchases.product_id  = products.product_id
