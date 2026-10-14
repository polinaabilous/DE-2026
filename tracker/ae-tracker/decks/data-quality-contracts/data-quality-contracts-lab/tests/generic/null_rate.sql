{% test null_rate(model, column_name) %}
{#- Returns ONE row: the percentage of NULLs in the column, rounded up to a whole number.
    The thresholds live in YAML: fail_calc reads null_pct, warn_if / error_if compare it. -#}
select cast(ceil(100.0 * count(*) filter (where {{ column_name }} is null)
                 / nullif(count(*), 0)) as integer) as null_pct
from {{ model }}
{% endtest %}
