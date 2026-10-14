-- stg_payments: settled payments from the payment provider, typed. Grain: one row per payment_id.
select
    payment_id,
    order_id,
    lower(type)                                   as payment_type,     -- charge | refund
    cast(amount_usd as decimal(10, 2))             as amount_usd,       -- refunds are negative
    currency,
    cast(captured_at_utc as timestamp)             as captured_at_utc,
    cast(cast(captured_at_utc as timestamp) as date) as captured_date_utc,
    _batch_date
from {{ source('payments_raw', 'payments') }}
