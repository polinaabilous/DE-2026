-- rec_daily_revenue: revenue in fct_orders vs charges settled by the payment provider.
-- Grain: one row per UTC day. unexplained_usd must be 0 (tests/assert_revenue_reconciles.sql).
with orders as (
    select date_key, count(*) as orders, sum(amount_usd) as orders_usd
    from {{ ref('fct_orders') }}
    group by date_key
),
charges as (
    select cast(strftime(captured_date_utc, '%Y%m%d') as integer) as date_key,
           count(*) as charges, sum(amount_usd) as charges_usd
    from {{ ref('stg_payments') }}
    where payment_type = 'charge'                     -- refunds are reconciled separately
    group by 1
),
known as (                                            -- documented, explained differences
    select cast(strftime(p.captured_date_utc, '%Y%m%d') as integer) as date_key,
           sum(k.amount_usd) as known_usd
    from {{ ref('known_differences') }} as k
    join {{ ref('stg_payments') }} as p on p.order_id = k.order_id and p.payment_type = 'charge'
    group by 1
)
select
    coalesce(o.date_key, c.date_key)                                       as date_key,
    coalesce(o.orders, 0)                                                  as orders,
    coalesce(c.charges, 0)                                                 as charges,
    coalesce(o.orders_usd, 0)                                              as orders_usd,
    coalesce(c.charges_usd, 0)                                             as charges_usd,
    coalesce(k.known_usd, 0)                                               as known_usd,
    coalesce(c.charges_usd, 0) - coalesce(o.orders_usd, 0) - coalesce(k.known_usd, 0) as unexplained_usd
from orders as o
full outer join charges as c on o.date_key = c.date_key       -- a day missing on either side shows up
left join known as k on k.date_key = coalesce(o.date_key, c.date_key)
