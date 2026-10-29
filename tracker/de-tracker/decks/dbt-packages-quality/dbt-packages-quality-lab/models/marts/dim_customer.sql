-- dim_customer: one row per customer, plus one unknown member.
-- customer_key is a surrogate key: a hash of the natural key customer_id.
with customers as (

    select * from {{ ref('stg_customers') }}

),

unknown_member as (

    select
        '-1' as customer_id,
        'Unknown customer' as customer_name,
        'Unknown' as city,
        cast(null as date) as signup_date

),

unioned as (

    select
        customer_id,
        customer_name,
        city,
        signup_date
    from customers
    union all
    select
        customer_id,
        customer_name,
        city,
        signup_date
    from unknown_member

)

select
    {{ dbt_utils.generate_surrogate_key(['customer_id']) }} as customer_key,
    customer_id,
    customer_name,
    city,
    signup_date
from unioned
