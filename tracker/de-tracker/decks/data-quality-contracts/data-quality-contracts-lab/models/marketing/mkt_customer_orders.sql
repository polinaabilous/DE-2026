-- mkt_customer_orders: orders and revenue per customer for the marketing dashboard.
-- Owned by marketing. Pinned to fct_orders v1 until it migrates (by the v1 deprecation date).
select
    c.customer_id,
    c.city,
    count(*)        as orders,
    sum(o.amount)   as revenue_usd
from {{ ref('fct_orders', v=1) }} as o
join {{ ref('dim_customer') }} as c using (customer_key)
group by c.customer_id, c.city
