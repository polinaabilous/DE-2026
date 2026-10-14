{#- safe_divide: numerator / denominator, or on_zero when the denominator is 0 or NULL.
    numerator, denominator: SQL expressions as strings, for example 'purchase_events'. -#}
{% macro safe_divide(numerator, denominator, decimals=2, on_zero="null") -%}
    case
        when ({{ denominator }}) is null or ({{ denominator }}) = 0 then {{ on_zero }}
        else round(cast({{ numerator }} as double) / ({{ denominator }}), {{ decimals }})
    end
{%- endmacro %}
