-- Singular test: purchase-like events whose amount text could not be parsed.
-- Any returned row is a failure;
-- severity 'warn' reports it without failing the run.
{{ config(severity='warn') }}

select
    event_id,
    event_type,
    amount_raw
from {{ ref('stg_events') }}
where
    amount_raw is not null
    and amount is null
