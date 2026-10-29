-- dim_date: one row per calendar day between two project variables.
-- dbt_utils.date_spine generates the days.
-- Its end date is exclusive, so add one day.
with days as (

    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('" ~ var("dim_date_start") ~ "' as date)",
        end_date="(cast('" ~ var("dim_date_end") ~ "' as date) + interval 1 day)"
    ) }}

)

select
    cast(strftime(date_day, '%Y%m%d') as integer) as date_key,
    cast(date_day as date) as date_day,
    dayname(date_day) as day_name,
    isodow(date_day) in (6, 7) as is_weekend
from days
