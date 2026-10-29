-- Revenue must match the payment provider's charges every day, after documented differences.
select date_key, orders, charges, orders_usd, charges_usd, known_usd, unexplained_usd
from {{ ref('rec_daily_revenue') }}
where abs(unexplained_usd) > 0.01
