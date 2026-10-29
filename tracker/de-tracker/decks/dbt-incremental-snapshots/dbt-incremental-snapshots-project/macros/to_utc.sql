{% macro to_utc(column_name) -%}
    timezone('UTC', cast({{ column_name }} as timestamptz))
{%- endmacro %}
