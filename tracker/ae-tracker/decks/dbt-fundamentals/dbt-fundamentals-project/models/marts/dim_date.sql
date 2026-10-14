-- dim_date: one row per calendar day between two project variables.
with days as (

    select cast(range as date) as date_day
    from range(
        date '{{ var("dim_date_start") }}',
        date '{{ var("dim_date_end") }}' + interval 1 day,
        interval 1 day
    )

)

select
    cast(strftime(date_day, '%Y%m%d') as integer) as date_key,
    date_day,
    dayname(date_day)                             as day_name,
    isodow(date_day) in (6, 7)                    as is_weekend
from days
