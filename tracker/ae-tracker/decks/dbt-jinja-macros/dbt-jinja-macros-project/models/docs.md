{% docs fct_orders %}
**Orders fact.** One row per purchase event with a parseable amount.

- **Grain:** `order_id` (the purchase `event_id`), tested with `unique` and `not_null`.
- **Excluded:** purchases whose amount text cannot be parsed; the
  `assert_no_unparseable_amounts` test warns about each one.
- **Unknown members:** a missing or unknown customer or product maps to the
  dimension row with natural key `-1`.
- **Time:** `ordered_at_utc` and `date_key` are in UTC.
{% enddocs %}
