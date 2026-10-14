{% test volume_vs_trailing(model, batch_column, lookback=3) %}
{#- Returns ONE row: the newest batch's row count as a percentage of the average of the
    previous `lookback` batches. The bands live in YAML (fail_calc + warn_if / error_if). -#}
with batches as (
    select {{ batch_column }} as batch, count(*) as row_count
    from {{ model }}
    group by 1
),
ranked as (
    select *, row_number() over (order by batch desc) as recency
    from batches
)
select
    newest.batch,
    newest.row_count,
    round(avg(previous.row_count), 1)                                           as trailing_avg,
    cast(round(100.0 * newest.row_count / avg(previous.row_count)) as integer) as pct_of_trailing
from ranked as newest
join ranked as previous on previous.recency between 2 and {{ lookback + 1 }}
where newest.recency = 1
group by newest.batch, newest.row_count
{% endtest %}
