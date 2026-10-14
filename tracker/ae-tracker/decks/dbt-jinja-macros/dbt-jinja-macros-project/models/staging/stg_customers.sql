-- stg_customers: one row per customer, from the CRM seed.
select
    lower(trim(customer_id)) as customer_id,
    customer_name,
    city,
    signup_date
from {{ ref('customers') }}
