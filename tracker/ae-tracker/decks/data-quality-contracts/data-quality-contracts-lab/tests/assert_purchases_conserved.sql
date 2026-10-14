-- Row conservation: every purchase event in staging becomes an order in fct_orders,
-- or is rejected for a known reason (an amount that does not parse). Returns a row if not.
with purchases as (
    select count(*) as n from {{ ref('stg_events') }} where event_type = 'purchase'
),
rejected as (
    select count(*) as n from {{ ref('stg_events') }} where event_type = 'purchase' and amount is null
),
orders as (
    select count(*) as n from {{ ref('fct_orders') }}
)
select purchases.n as purchases, orders.n as orders, rejected.n as rejected,
       purchases.n - orders.n - rejected.n as unaccounted
from purchases, orders, rejected
where purchases.n <> orders.n + rejected.n
