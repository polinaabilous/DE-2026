{% test row_count_between(model, min_rows=1, max_rows=none) %}
{#- Fails when the model has fewer than min_rows or more than max_rows rows. -#}
select row_count
from (select count(*) as row_count from {{ model }}) as counted
where row_count < {{ min_rows }}
{%- if max_rows is not none %}
    or row_count > {{ max_rows }}
{%- endif %}
{% endtest %}
