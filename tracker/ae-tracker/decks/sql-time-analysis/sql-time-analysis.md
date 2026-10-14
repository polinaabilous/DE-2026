# SQL time analysis: date spines, time zones, cohorts and funnels

*Companion to `sql-time-analysis.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engines and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, pandas 3.0.6 (only for cross-checks), Windows 11 (64-bit); dbt-core 1.12.5 with dbt-duckdb 1.11.0 and dbt_utils 1.4.1 for lesson 6. SQL is DuckDB’s PostgreSQL-flavoured dialect. Every DuckDB query and dbt command in this document ran while it was built, and the result under it is the real result. **PostgreSQL, SQL Server / Fabric Warehouse (T-SQL), Spark SQL, Snowflake, and BigQuery snippets were not executed** (no server, Java, or cloud account on the build machine); each is labelled as reference only. The data is synthetic and deterministic: `make_leafy_time.py` (lesson 3) rebuilds exactly the same file on any machine.

**Scope (a gap deck):** it teaches only what earlier decks leave out. Running totals and period-over-period with `LAG` are in *Window functions* (slides 14–15); the recursive calendar is in *Query structure: recursion and clean SQL* (slide 4); funnel definitions and weekly retention with maturity masking are in *Business models and metrics* (slides 12–13); the business time-zone policy is in *Metric design* (slide 10); the contents of a date dimension are in *Dimension tables* (slides 10–11). This deck builds on them with one-line recaps and cross-references. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common time-analysis interview patterns (research done in October 2026: filling gaps with a spine, week-over-week with missing weeks, monthly retention and cohort matrices, ordered funnels with a conversion window, time zones and daylight saving). All questions are original and use the Leafy data.

**Lab:** [`sql-time-analysis-lab/`](sql-time-analysis-lab/README.md) next to this file holds a tiny hand-checkable fixture, the SQL, a runner, and pytest tests (slides 18–19).

**Additions beyond the original brief** are marked *(added)*: dense panels (spine × entity) and when to fill with NULL instead of zero; ROWS vs RANGE frames over gappy data; TIMESTAMP vs TIMESTAMPTZ and the session time zone trap; nonexistent and ambiguous local times (engines disagree); per-user time zones; a hand-checkable lab with pytest and an independent Python check; the MetricFlow time spine in dbt; dialect notes for spines and time zones (PostgreSQL, T-SQL / Fabric, Spark SQL, Snowflake, BigQuery); “In your portfolio” notes for Fuel Smart.

## Contents

1. [SQL time analysis: date spines, time zones, cohorts and funnels](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was executed](#slide-2)
3. [The running example: Leafy events and orders over half a year](#slide-3)
4. [Date spines with generate_series and range](#slide-4)
5. [A calendar table in SQL](#slide-5)
6. [dbt_utils.date_spine: the same spine as a dbt model](#slide-6)
7. [Dense panels: a spine for every entity](#slide-7)
8. [Week-over-week when some weeks have no rows](#slide-8)
9. [Rolling averages over gaps: ROWS vs RANGE](#slide-9)
10. [TIMESTAMP vs TIMESTAMPTZ: store UTC, convert at the edge](#slide-10)
11. [Local day boundaries and daylight saving](#slide-11)
12. [DST edge cases and per-user time zones](#slide-12)
13. [Monthly cohorts from raw events](#slide-13)
14. [The cohort matrix: triangle, censoring, bounded vs unbounded](#slide-14)
15. [An ordered funnel with a per-user 7-day window](#slide-15)
16. [Funnel edge cases: ties, attempts, windows, maturity](#slide-16)
17. [Interview patterns: recognise the time question](#slide-17)
18. [Lab: a cohort matrix and a funnel you can check by hand](#slide-18)
19. [Lab steps: the SQL, the run, and the tests](#slide-19)
20. [Bug clinic: believable time-analysis bugs](#slide-20)
21. [Interview questions and model answers](#slide-21)
22. [Exercises 1–5 · spines, time zones, period over period](#slide-22)
23. [Exercises 6–10 · cohorts, funnels, and a take-home](#slide-23)
24. [Cheat sheet](#slide-24)
25. [Glossary](#slide-25)
26. [Recap and practice plan](#slide-26)
27. [References and how this deck was tested](#slide-27)
28. [Appendix A · Hints](#appendix-a)
29. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. SQL time analysis: date spines, time zones, cohorts and funnels

**

Time is the column every metric uses, and the one that breaks it most quietly. Earlier decks taught `LAG`, a recursive calendar, funnel and retention definitions, and the business time-zone policy. This deck fills the gaps between them, so that you can fill the calendar, pick the right midnight, and build cohort matrices and funnels that hold up in an interview and in production.

- **Part A, spines:** `generate_series` and `range`, a calendar table in SQL, `dbt_utils.date_spine` in a real dbt project, dense panels (spine × entity).
- **Part B, period over period:** week-over-week when some weeks have no rows, ROWS vs RANGE frames over gaps.
- **Part C, time zones:** `TIMESTAMP` vs `TIMESTAMPTZ` and the session time zone, converting at the edge, local day boundaries and daylight saving, nonexistent and ambiguous local times, per-user zones.
- **Part D, cohorts and funnels:** a monthly cohort retention matrix from raw events (the triangle, bounded vs unbounded, censoring) and an ordered 3-step funnel with a per-user 7-day window.
- **Practice:** a hand-checkable lab, a bug clinic, 8 interview questions with model answers, and 10 exercises.

Every query ran in DuckDB while this deck was built; the result under each query is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Almost every number an analytics team publishes is “something per period”: orders per day, revenue per week, retention per cohort month, conversion within 7 days. SQL makes the easy version easy and the correct version subtle. `GROUP BY` silently skips periods with no rows, `LAG` then compares with the wrong week, a timestamp without its time zone puts evening orders on the wrong day, and a cohort table shows zeros for months that have not happened yet. This deck teaches the small set of techniques that remove those errors: spines and calendars, explicit time zones, and cohort and funnel queries with their windows and censoring written down.

#### Where you will use it

- Daily and weekly metric models in dbt that feed dashboards and weekly business reviews.
- Calendar dimensions and the time spine a semantic layer needs.
- Retention and cohort models for product and growth teams.
- Funnel and conversion models (view → cart → purchase, sign-up → activation).
- Any pipeline that turns UTC event timestamps into local business days.

#### What goes wrong without it

- Charts skip zero days; rolling averages and week-over-week compare the wrong periods.
- Evening orders land on tomorrow; daylight-saving days have 23 or 25 hours and nobody notices.
- The same query returns different numbers on two laptops because the session time zone differs.
- Newest cohorts “collapse” in every report because unobserved months show as 0 %.
- Funnels count purchases that happened before the first view.

#### Who expects you to know it

- Analytics engineers: calendar and spine models, cohort and funnel marts.
- Data engineers: storing timestamps correctly and converting them once.
- Product and growth analysts who read retention and conversion every week.
- Interviewers: retention, funnels, and “fill the missing days” are among the most common SQL screen questions.

> **On the job:** A typical ticket: “The weekly workshop dashboard shows +100 % growth some weeks and nothing in others, and the retention chart says the May cohort is terrible.” A strong answer finds the missing weeks (no spine), the compare-with-the-wrong-week bug (LAG on sparse rows), and the unobserved cells shown as zeros (censoring); then rebuilds the models on a calendar, with the business time zone applied once and immature cells masked.

> **The main idea:** time-based metrics need every period to exist, one agreed midnight, and an honest treatment of periods that have not finished. Without those, correct-looking SQL gives wrong trends.

*Read more:* [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [dbt_utils on dbt Hub](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/), [Mixpanel: retention](https://docs.mixpanel.com/docs/reports/retention).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A per-period chart or table where some periods may be empty | A date spine + `LEFT JOIN` (lessons 4, 7) | Empty periods become explicit rows with 0 or NULL. |
| Many models need week starts, month starts, local-day bounds | A calendar table built once (lessons 5–6) | One definition of every calendar attribute. |
| Week-over-week, month-over-month | Fill periods first, then `LAG` (lesson 8) | `LAG` counts rows, not weeks. |
| Timestamps from several systems or countries | Store UTC; convert with an IANA zone at the edge (lessons 10–12) | One instant, one stored value; local views on demand. |
| “Do customers come back?” | A cohort matrix with censoring (lessons 13–14) | Fair comparison of cohorts at the same age. |
| “How many get from step 1 to step 3 within 7 days?” | An ordered funnel with a per-user window (lessons 15–16) | Order and window are part of the definition. |
| A one-off count where gaps cannot matter (a single total) | Not a spine: a plain aggregate | Extra machinery adds nothing. |
| Event-sequence questions beyond three steps or with loops | Not hand-written SQL: a product-analytics tool or `MATCH_RECOGNIZE` where available | Path analysis is easier in tools built for it. |

#### How interviews test it

- “Show daily revenue including days with no sales” or “7-day rolling average” (spine first).
- “Week-over-week growth” with a follow-up “what if a week has no data?”.
- “Monthly retention cohort table from an events table” (first-activity cohort, month index, distinct users, pivot).
- “Users who did A, then B, then C within 7 days” (ordered funnel, window, maturity).
- “How do you store timestamps? What is the difference between TIMESTAMP and TIMESTAMPTZ?”

#### Where it sits in your learning path

- Builds on *Window functions* (LAG, frames), *Query structure* (recursive calendar), *Business models and metrics* (funnel and retention definitions), and *Metric design* (time window and time zone in the spec).
- Feeds the dbt decks (calendar and spine models, the semantic-layer time spine) and the Fuel Smart portfolio (reviews per month, reviewer cohorts).

> **The main idea:** reach for a spine whenever periods can be empty, convert time zones once with a named zone, and treat cohorts and funnels as definitions with a window and an observation limit.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was executed

*Start here · DuckDB from Python, plus a small dbt project*

| Item | Detail |
|---|---|
| Tested engine | **DuckDB 1.5.6** (Python package) on **CPython 3.12.10**, Windows 11. pandas 3.0.6 is used only for independent cross-checks in the exercises. The DuckDB Python client needs `pytz` to return `TIMESTAMPTZ` values to Python. |
| dbt (lesson 6 only) | **dbt-core** with the **dbt-duckdb** adapter and the **dbt_utils 1.4.1** package, in a separate virtual environment (versions in the Markdown intro and on the references slide). `dbt deps` downloads the package from dbt Hub, so that one step needs a network connection. |
| Dialect | DuckDB’s PostgreSQL-flavoured SQL. Time-zone support comes from DuckDB’s ICU extension, which the Python package bundles. Reference notes for PostgreSQL, SQL Server / Fabric Warehouse (T-SQL), Spark SQL, Snowflake, and BigQuery are **not executed** (no server, Java, or cloud account on the build machine) and are labelled so. |
| Minimum versions | DuckDB 1.1+ for every query here; dbt-core 1.8+ with dbt_utils 1.x for `date_spine`. On Windows install `tzdata` for Python’s `zoneinfo`, because Windows ships no IANA time-zone files. |
| How results were produced | The build runs every query and prints the real result. A query that fails, returns an unexpected result, or returns several rows without `ORDER BY` is a build failure. This deck built with **0 failures**. |

#### Create the environments

```text
# Windows (PowerShell); on macOS/Linux: source .venv/bin/activate
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb pandas pytz tzdata pytest
python make_leafy_time.py      # builds leafy_time.duckdb (next slide)

# lesson 6 only: a second environment for dbt
python -m venv .venv-dbt
.venv-dbt\Scripts\Activate.ps1
python -m pip install dbt-core dbt-duckdb
```

#### Check it

```python
import sys, duckdb
print("Python", sys.version.split()[0], "· DuckDB", duckdb.__version__)
con = duckdb.connect()
con.execute("SET TimeZone = 'UTC'")
print(con.sql("SELECT current_setting('TimeZone') AS tz").fetchall())
```

Output:

```text
Python 3.12.10 · DuckDB 1.5.6
[('UTC',)]
```

Every connection in this deck starts with `SET TimeZone = 'UTC'`. Lesson 10 shows what changes when you forget it: the DuckDB Python client otherwise uses your computer’s time zone.

> **On the job:** Time logic is usually written once, in a staging or intermediate model, and reused by every dashboard. Prototyping it in DuckDB on a small file, with a daylight-saving day and a month end in the data, is the fastest way to catch the bugs this deck is about before they reach the warehouse.

> **The main idea:** one local engine, one deterministic data file, one fixed session time zone. Every result in the deck is reproducible on any machine.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [dbt-duckdb setup](https://docs.getdbt.com/docs/core/connect-data-platform/duckdb-setup).

---

<a id="slide-3"></a>
## 3. The running example: Leafy events and orders over half a year

*Start here · one small file with the time traps planted*

Leafy, the plant shop from earlier decks, sells plants, pots, and occasional plant-care workshops. One script, `make_leafy_time.py`, generates the data used in every lesson and exercise: about five and a half months of visitors, events, and orders. Same seed, same rows, on every machine. It ships in the lab folder next to this deck.

Output:

```text
$ python sql-time-analysis-lab/make_leafy_time.py
users 352 rows
events 1628 rows
orders 264 rows
```

#### Tables and their grain

```sql
SELECT 'users' AS table_name, 'one row per account' AS grain, count(*) AS row_count FROM users
UNION ALL SELECT 'events', 'one row per event delivery', count(*) FROM events
UNION ALL SELECT 'orders', 'one row per order', count(*) FROM orders
ORDER BY row_count DESC;
```

Result (3 rows):

| table_name | grain | row_count |
|---|---|---|
| events | one row per event delivery | 1628 |
| users | one row per account | 352 |
| orders | one row per order | 264 |

`events.event_name` is `view_product`, `add_to_cart`, or `purchase`. `users.home_tz` is the visitor’s IANA time zone; `orders.category` is `plants`, `pots`, or `workshop`.

#### Facts you need from day one

- Every timestamp is a plain `TIMESTAMP` that **means UTC**; such columns end in `_utc`.
- Leafy’s business calendar is **America/Chicago**, Monday weeks. Visitors are also in New York, Los Angeles, and London.
- Data starts on **Thursday 1 January 2026**. It was loaded on **Wednesday 17 June 2026 at 15:00 UTC** (10:00 in Chicago), so June and the current week are incomplete on purpose (`load_info`).
- Daylight saving began in the US on **Sunday 8 March 2026** (a 23-hour day in Chicago) and in the UK on Sunday 29 March.

#### Planted users for the funnel lessons

```sql
SELECT user_id, event_name, event_at_utc
FROM events
WHERE user_id IN (901, 902, 903)
ORDER BY user_id, event_at_utc;
```

Result (10 rows):

| user_id | event_name | event_at_utc |
|---|---|---|
| 901 | view_product | 2026-05-04 15:00:00 |
| 901 | add_to_cart | 2026-05-04 15:06:00 |
| 901 | purchase | 2026-05-11 16:00:00 |
| 902 | purchase | 2026-05-05 18:00:00 |
| 902 | view_product | 2026-05-07 14:00:00 |
| 902 | add_to_cart | 2026-05-07 14:03:00 |
| 903 | view_product | 2026-05-02 13:00:00 |
| 903 | view_product | 2026-05-20 19:00:00 |
| 903 | add_to_cart | 2026-05-20 19:04:00 |
| 903 | purchase | 2026-05-21 12:00:00 |

901 buys 7 days and 1 hour after viewing; 902 buys *before* viewing; 903 views twice, 18 days apart, and converts on the second try. 904 (not shown) adds to cart in the same second as the view.

#### Traps planted in the data

| Trap | Lesson |
|---|---|
| Days and weeks with no orders at all (workshops sell rarely) | 4, 7, 8 |
| Orders near midnight, and the 23-hour DST day | 10, 11 |
| Visitors in four time zones | 12 |
| The same event delivered twice (same `event_id`) | 13, 15 |
| Anonymous events with a NULL `user_id` | 13, 15 |
| A half-observed last month: cohorts not yet mature | 14, 16 |
| Purchases before views, ties, repeat attempts, the 7-day boundary | 15, 16 |

> **On the job:** Real event data looks like this: several clocks (device, server, warehouse), duplicates from retries, anonymous traffic, and a load that stops mid-period. Writing down the traps for your own company’s data is a typical first-week task, and it is exactly what an interviewer probes when they ask “what could go wrong with this query?”.

> **The main idea:** one deterministic file with every common time trap planted. Each lesson shows how one trap changes a number, and the SQL that controls it.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [IANA time zone database](https://www.iana.org/time-zones).

---

<a id="slide-4"></a>
## 4. Date spines with generate_series and range

*Part A · how do I get one row for every day, even empty ones?*

A **date spine** is a table with exactly one row per period (day, week, month) between two bounds, with no gaps. You put it on the left of a `LEFT JOIN` so that periods with no facts still appear. *Query structure: recursion and clean SQL* (slide 4) built one with a recursive CTE; DuckDB and PostgreSQL have **set-returning functions** (functions that return many rows) that do it in one line.

#### Inclusive or exclusive end?

```sql
SELECT 'generate_series' AS fn, count(*) AS n_rows,
       min(d)::DATE AS first_day, max(d)::DATE AS last_day, any_value(typeof(d)) AS returns
FROM generate_series(DATE '2026-03-01', DATE '2026-03-31', INTERVAL 1 DAY) AS t(d)
UNION ALL
SELECT 'range', count(*), min(d)::DATE, max(d)::DATE, any_value(typeof(d))
FROM range(DATE '2026-03-01', DATE '2026-03-31', INTERVAL 1 DAY) AS t(d)
ORDER BY fn;
```

Result (2 rows):

| fn | n_rows | first_day | last_day | returns |
|---|---|---|---|---|
| generate_series | 31 | 2026-03-01 | 2026-03-31 | TIMESTAMP |
| range | 30 | 2026-03-01 | 2026-03-30 | TIMESTAMP |

`generate_series` **includes** the end; `range` **excludes** it, like Python’s `range`. With dates and an interval, both return `TIMESTAMP`: cast to `DATE` before joining to a date column. Used as a scalar (`SELECT generate_series(…)`) they return a list; `unnest` turns it into rows.

#### A helper for Chicago days

*SQL · DuckDB macro*

```sql
CREATE OR REPLACE MACRO chicago(ts_utc) AS
    (ts_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago';
```

As in *Metric design* (slide 10): a UTC `TIMESTAMP` becomes Chicago wall-clock time with a double `AT TIME ZONE`. A DuckDB **macro** names that expression; lesson 10 explains each half. Daily metrics below use Chicago days.

#### The bounds are part of the definition

```sql
WITH daily AS (                 -- workshop orders per Chicago day: only days that have rows
    SELECT chicago(placed_at_utc)::DATE AS order_day, count(*) AS orders
    FROM orders
    WHERE category = 'workshop'
    GROUP BY ALL
), from_data AS (                   -- spine bounds taken from the filtered data
    SELECT unnest(generate_series(min(order_day), max(order_day), INTERVAL 1 DAY))::DATE AS order_day
    FROM daily
), from_calendar AS (               -- spine bounds from the reporting period: 1 Jan to the last complete day
    SELECT d::DATE AS order_day
    FROM generate_series(DATE '2026-01-01', DATE '2026-06-16', INTERVAL 1 DAY) AS t(d)
)
SELECT 'GROUP BY only' AS method, count(*) AS days, sum(orders) AS orders,
       round(avg(orders), 3) AS avg_per_day
FROM daily
UNION ALL
SELECT 'spine: min..max of the data', count(*), sum(coalesce(orders, 0)), round(avg(coalesce(orders, 0)), 3)
FROM from_data LEFT JOIN daily USING (order_day)
UNION ALL
SELECT 'spine: 1 Jan..16 Jun', count(*), sum(coalesce(orders, 0)), round(avg(coalesce(orders, 0)), 3)
FROM from_calendar LEFT JOIN daily USING (order_day)
ORDER BY days;
```

Result (3 rows):

| method | days | orders | avg_per_day |
|---|---|---|---|
| GROUP BY only | 10 | 10 | 1 |
| spine: min..max of the data | 113 | 10 | 0.088 |
| spine: 1 Jan..16 Jun | 167 | 10 | 0.06 |

Workshops sold 10 tickets, each on a different day. `GROUP BY` alone returns only those 10 days, so “average per day” is 1. A spine whose bounds come from the *filtered data* starts on the first workshop sale (24 February) and misses every empty day before it: 0.088. Bounds from the reporting period (1 January to the last *complete* day; the load stopped at 10:00 on 17 June) give the honest 0.06 per day.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL | `generate_series(timestamp, timestamp, interval)`, end inclusive, as a table function. |
| SQL Server 2022+ / Azure SQL | `GENERATE_SERIES(0, n)` returns integers only; add them with `DATEADD(day, value, @start)`. Older versions: a numbers table or recursive CTE. Check Fabric Warehouse’s surface-area page before relying on it. |
| Spark SQL | `explode(sequence(DATE'2026-01-01', DATE'2026-06-16', INTERVAL 1 DAY))`, end inclusive. |
| Snowflake | `TABLE(GENERATOR(ROWCOUNT => n))` with `ROW_NUMBER()` and `DATEADD`; `SEQ4()` can leave gaps, so use `ROW_NUMBER()`. |
| BigQuery | `UNNEST(GENERATE_DATE_ARRAY('2026-01-01', '2026-06-16'))`, end inclusive. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Spines sit under almost every daily metric model: revenue per day, sign-ups per week, tickets per hour. In code review, the first question about a spine is “where do the bounds come from?”. The answer should be the reporting calendar (or a calendar table), not `min`/`max` of the filtered facts, and it should stop at the last complete period.

> **The main idea:** generate a spine from the reporting period, not from the data you are filling, then LEFT JOIN the facts and fill only additive counts with zero.

*Read more:* [DuckDB: list functions (range, generate_series)](https://duckdb.org/docs/stable/sql/functions/list), [PostgreSQL: generate_series](https://www.postgresql.org/docs/current/functions-srf.html), [T-SQL: GENERATE_SERIES](https://learn.microsoft.com/en-us/sql/t-sql/functions/generate-series-transact-sql), [BigQuery: GENERATE_DATE_ARRAY](https://cloud.google.com/bigquery/docs/reference/standard-sql/array_functions).

---

<a id="slide-5"></a>
## 5. A calendar table in SQL

*Part A · how do I build every calendar attribute once?*

A **calendar table** (a date dimension) is a spine with the attributes reports need: week start, ISO week, month start, days in month, flags. *Dimension tables* (slides 10–11) covers what it should contain and why; here you generate one in DuckDB, executed, with two columns that most calendars forget: the **UTC bounds of each local day**.

*SQL · build once*

```sql
CREATE OR REPLACE TABLE calendar AS
SELECT d::DATE                                  AS date_day,
       isodow(d)                                AS iso_dow,        -- 1 = Monday … 7 = Sunday
       dayname(d)                               AS day_name,
       isodow(d) >= 6                           AS is_weekend,
       date_trunc('week', d)::DATE              AS week_start,     -- ISO weeks start on Monday
       isoyear(d)                               AS iso_year,
       weekofyear(d)                            AS iso_week,
       date_trunc('month', d)::DATE             AS month_start,
       day(last_day(d))                         AS days_in_month,
       quarter(d)                               AS quarter,
       (d AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC'                  AS utc_start,
       ((d + INTERVAL 1 DAY) AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC' AS utc_end,
       date_diff('hour', utc_start, utc_end)    AS hours_in_day
FROM range(DATE '2025-12-29', DATE '2027-01-04', INTERVAL 1 DAY) AS t(d);
```

#### Six interesting days

```sql
SELECT date_day, day_name, week_start, iso_year, iso_week, month_start,
       utc_start, utc_end, hours_in_day
FROM calendar
WHERE date_day IN (DATE '2026-01-01', DATE '2026-03-07', DATE '2026-03-08',
                   DATE '2026-11-01', DATE '2026-12-31', DATE '2027-01-03')
ORDER BY date_day;
```

Result (6 rows):

| date_day | day_name | week_start | iso_year | iso_week | month_start | utc_start | utc_end | hours_in_day |
|---|---|---|---|---|---|---|---|---|
| 2026-01-01 | Thursday | 2025-12-29 | 2026 | 1 | 2026-01-01 | 2026-01-01 06:00:00 | 2026-01-02 06:00:00 | 24 |
| 2026-03-07 | Saturday | 2026-03-02 | 2026 | 10 | 2026-03-01 | 2026-03-07 06:00:00 | 2026-03-08 06:00:00 | 24 |
| 2026-03-08 | Sunday | 2026-03-02 | 2026 | 10 | 2026-03-01 | 2026-03-08 06:00:00 | 2026-03-09 05:00:00 | 23 |
| 2026-11-01 | Sunday | 2026-10-26 | 2026 | 44 | 2026-11-01 | 2026-11-01 05:00:00 | 2026-11-02 06:00:00 | 25 |
| 2026-12-31 | Thursday | 2026-12-28 | 2026 | 53 | 2026-12-01 | 2026-12-31 06:00:00 | 2027-01-01 06:00:00 | 24 |
| 2027-01-03 | Sunday | 2026-12-28 | 2026 | 53 | 2027-01-01 | 2027-01-03 06:00:00 | 2027-01-04 06:00:00 | 24 |

#### Read it carefully

- `utc_start` / `utc_end`: the Chicago day expressed as a UTC range. Facts stored in UTC can join to it with `ts >= utc_start AND ts < utc_end` (lesson 11).
- 8 March 2026 has **23** hours in Chicago (clocks jump forward); 1 November has **25**.
- 1 January 2026 belongs to ISO week 1 of 2026 (it is a Thursday), but 3 January 2027 is still ISO week 53 of **2026**: group ISO weeks by `iso_year`, never by calendar `year`.
- DuckDB reuses column aliases inside the same `SELECT` (`hours_in_day` uses `utc_start`); most engines do not, so repeat the expression there.

#### Test it like a model

```sql
SELECT count(*) AS days, count(DISTINCT date_day) AS distinct_days,
       count(DISTINCT week_start) AS weeks, max(iso_week) AS max_iso_week_2026,
       sum(hours_in_day) / 24 AS days_by_hours
FROM calendar
WHERE iso_year = 2026;
```

Result (1 row):

| days | distinct_days | weeks | max_iso_week_2026 | days_by_hours |
|---|---|---|---|---|
| 371 | 371 | 53 | 53 | 371 |

One row per day, no duplicates, 53 ISO weeks in ISO year 2026, and the hours add up to whole days: the 23-hour and 25-hour days cancel out over the year.

#### Coming from C#

This is `Enumerable.Range(0, n).Select(i => start.AddDays(i))` plus `ISOWeek.GetWeekOfYear` and `TimeZoneInfo.ConvertTimeToUtc`, but computed once in the warehouse, stored, and joined, instead of recomputed in every query or report.

Sunday-start weeks: `date_trunc('week', d + INTERVAL 1 DAY) - INTERVAL 1 DAY`. Fiscal periods and holidays are columns you add from a business-maintained list.

> **On the job:** Most warehouses have one `dim_date` or `dim_calendar` model that every mart joins to. Adding local-day UTC bounds and `hours_in_day` to it lets every daily model in a multi-region company use the same midnight, and makes the daylight-saving days visible in the data instead of in an incident.

> **The main idea:** build the calendar once, with ISO week and year, month starts, and each local day’s UTC bounds, then test it like any other model.

*Read more:* [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [DuckDB: date part functions](https://duckdb.org/docs/stable/sql/functions/datepart), [ISO week date](https://en.wikipedia.org/wiki/ISO_week_date).

---

<a id="slide-6"></a>
## 6. dbt_utils.date_spine: the same spine as a dbt model

*Part A · how do I build the spine in a dbt project?*

In a dbt project you rarely write `generate_series` by hand, because the SQL must run on every warehouse the project targets. The **dbt_utils** package (a library of macros listed in `packages.yml` and installed with `dbt deps`) has `date_spine(datepart, start_date, end_date)`, which compiles to portable SQL for the current adapter. Everything on this slide ran in a real dbt-duckdb project.

#### The project files

```yaml
# d/packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.4.1
```

```sql
# d/models/dim_calendar.sql
{{ config(materialized='table') }}

with spine as (
    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('2025-12-29' as date)",
        end_date="cast('2027-01-04' as date)"
    ) }}
)

select
    cast(date_day as date)                      as date_day,
    isodow(date_day)                            as iso_dow,
    cast(date_trunc('week', date_day) as date)  as week_start,
    isoyear(date_day)                           as iso_year,
    weekofyear(date_day)                        as iso_week,
    cast(date_trunc('month', date_day) as date) as month_start
from spine
```

```yaml
# d/models/dim_calendar.yml
models:
  - name: dim_calendar
    columns:
      - name: date_day
        data_tests:
          - unique
          - not_null
          - dbt_utils.sequential_values:
              arguments:
                interval: 1
                datepart: day
```

`dbt_project.yml` names the project; `profiles.yml` points dbt-duckdb at a local file. The test `dbt_utils.sequential_values` fails if any day is missing or repeated.

#### Install, build, check

Terminal (output trimmed):

```text
$ dbt deps --profiles-dir .
Installing dbt-labs/dbt_utils
Installed from version 1.4.1
Up to date!
```

Terminal (output trimmed):

```text
$ dbt build --profiles-dir .
1 of 4 START sql table model main.dim_calendar ................................. [RUN]
1 of 4 OK created sql table model main.dim_calendar ............................ [OK in x.xxs]
2 of 4 START test dbt_utils_sequential_values_dim_calendar_date_day__day__1 .... [RUN]
2 of 4 PASS dbt_utils_sequential_values_dim_calendar_date_day__day__1 .......... [PASS in x.xxs]
3 of 4 START test not_null_dim_calendar_date_day ............................... [RUN]
3 of 4 PASS not_null_dim_calendar_date_day ..................................... [PASS in x.xxs]
4 of 4 START test unique_dim_calendar_date_day ................................. [RUN]
4 of 4 PASS unique_dim_calendar_date_day ....................................... [PASS in x.xxs]
Completed successfully
Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4
```

Terminal (output trimmed):

```text
$ dbt show --profiles-dir . --inline "select count(*) as days, max(date_day) as last_day from {{ ref('dim_calendar') }}"
Previewing inline node:
| days |   last_day |
| ---- | ---------- |
|  371 | 2027-01-03 |
```

#### What dbt generated (excerpt)

```sql
-- target/compiled/leafy_dates/models/dim_calendar.sql (generated by dbt)
…
    with p as (
        select 0 as generated_number union all select 1
    ), unioned as (
    select
…
    where generated_number <= 371
…
all_periods as (
    select (
    (cast('2025-12-29' as date) + cast(row_number() over (order by generated_number) - 1 as bigint) * interval 1 day)
    ) as date_day
    from rawdata
),
filtered as (
    select *
    from all_periods
    where date_day <= cast('2027-01-04' as date)
)
select * from filtered
…
```

#### Read the compiled SQL

- **The end date is exclusive.** `end_date = 2027-01-04` gives a last day of 3 January: the generator makes only as many numbers as there are days *between* the dates (371), so the final `<=` filter never sees the end date. Off-by-one here silently drops the last day of the year.
- It builds numbers by cross-joining a two-row table with itself (powers of two), then adds `n − 1` days to the start: no recursion, no engine-specific function, so it runs on Snowflake, BigQuery, Databricks, Fabric, and DuckDB alike.
- On DuckDB the output column `date_day` is a `TIMESTAMP` (date + interval), so the model casts it to `DATE`.
- Materialise it as a **table**: it is small and joined everywhere.

**Added beyond the brief:** the dbt Semantic Layer (MetricFlow) needs a **time spine** model like this one, declared in YAML with its standard granularity column; cumulative metrics and filling empty periods depend on it.

> **On the job:** “How do you build a calendar in dbt?” is a frequent analytics-engineering interview question. A good answer names `dbt_utils.date_spine` (end exclusive), materialises it as a table, adds calendar attributes and the business time zone’s day bounds in the same model, tests it for gaps, and registers it as the semantic layer’s time spine.

> **The main idea:** in dbt, generate the spine with dbt_utils.date_spine (end date exclusive), cast its output, materialise it as a table, and test it for gaps.

*Read more:* [dbt_utils README (date_spine)](https://github.com/dbt-labs/dbt-utils), [dbt: packages](https://docs.getdbt.com/docs/build/packages), [dbt: MetricFlow time spine](https://docs.getdbt.com/docs/build/metricflow-time-spine), [dbt show](https://docs.getdbt.com/reference/commands/show).

---

<a id="slide-7"></a>
## 7. Dense panels: a spine for every entity

*Part A · how do I fill gaps per category, store, or product? (added)*

A **dense panel** has one row per period *per entity*: every day × every category, every week × every store. Build it with a `CROSS JOIN` of the spine and the entity list, then `LEFT JOIN` the facts. A **sparse** table has rows only where something happened. Per-entity `LAG`, running totals, and charts need the dense form.

#### Four days × three categories

```sql
WITH days AS (
    SELECT date_day FROM calendar
    WHERE date_day BETWEEN DATE '2026-06-08' AND DATE '2026-06-11'
), categories AS (                       -- from the product catalogue, not from the facts
    SELECT * FROM (VALUES ('plants'), ('pots'), ('workshop')) AS c(category)
), daily AS (
    SELECT chicago(placed_at_utc)::DATE AS date_day, category,
           count(*) AS orders, sum(amount) AS revenue
    FROM orders
    GROUP BY ALL
)
SELECT d.date_day, c.category,
       coalesce(x.orders, 0)          AS orders,          -- additive: no orders = 0
       coalesce(x.revenue, 0)         AS revenue,
       round(x.revenue / x.orders, 2) AS avg_order_value  -- a ratio: no orders = undefined
FROM days AS d
CROSS JOIN categories AS c
LEFT JOIN daily AS x USING (date_day, category)
ORDER BY d.date_day, c.category;
```

Result (12 rows):

| date_day | category | orders | revenue | avg_order_value |
|---|---|---|---|---|
| 2026-06-08 | plants | 1 | 32.00 | 32 |
| 2026-06-08 | pots | 1 | 9.00 | 9 |
| 2026-06-08 | workshop | 0 | 0.00 | NULL |
| 2026-06-09 | plants | 3 | 70.00 | 23.33 |
| 2026-06-09 | pots | 2 | 24.00 | 12 |
| 2026-06-09 | workshop | 0 | 0.00 | NULL |
| 2026-06-10 | plants | 4 | 101.00 | 25.25 |
| 2026-06-10 | pots | 1 | 12.00 | 12 |
| 2026-06-10 | workshop | 0 | 0.00 | NULL |
| 2026-06-11 | plants | 1 | 14.00 | 14 |
| 2026-06-11 | pots | 1 | 9.00 | 9 |
| 2026-06-11 | workshop | 0 | 0.00 | NULL |

#### Zero or NULL?

- **Additive** measures (counts, sums) become **0**: no orders really means zero orders.
- **Ratios and averages** stay **NULL**: average order value on a day without orders is undefined, not $0. Filling it with 0 drags every weekly average down.
- **Missing data** is not zero: if the load for a day failed, a filled 0 hides an incident. Keep a load log and mark such days NULL (lesson 8).
- Take the entity list from a **dimension** (the product catalogue), not from the facts, or an entity with no sales at all disappears.

#### The WHERE trap

```sql
WITH days AS (
    SELECT date_day FROM calendar
    WHERE date_day BETWEEN DATE '2026-04-01' AND DATE '2026-06-16'
), daily AS (
    SELECT chicago(placed_at_utc)::DATE AS date_day, category, count(*) AS orders
    FROM orders
    GROUP BY ALL
)
SELECT 'filter in WHERE, after the LEFT JOIN' AS where_the_filter_is, count(*) AS day_rows
FROM days LEFT JOIN daily USING (date_day)
WHERE daily.category = 'workshop'
UNION ALL
SELECT 'filter inside the joined subquery', count(*)
FROM days LEFT JOIN (SELECT * FROM daily WHERE category = 'workshop') AS w USING (date_day)
ORDER BY day_rows;
```

Result (2 rows):

| where_the_filter_is | day_rows |
|---|---|
| filter in WHERE, after the LEFT JOIN | 9 |
| filter inside the joined subquery | 77 |

Filtering the fact side in `WHERE` after a `LEFT JOIN` removes every filled row and turns the outer join back into an inner join. Put the filter inside the joined subquery (or in the `ON` clause). *SQL correctness: joins, grain, and NULLs* covers this trap in general.

#### Size it before you build it

A panel has *periods × entities* rows: 365 days × 20,000 products is 7.3 million rows, mostly zeros. Densify only what you chart or compare (categories, stores, top products), or keep the fact table sparse and let the BI tool fill gaps at query time.

**In your portfolio:** for Fuel Smart, reviews per recipe per month is a panel. Densify months × recipe *categories*, not months × 5,000 recipes.

> **On the job:** Dense panels feed per-store dashboards, per-product forecasts, and anomaly detection, all of which assume every period exists for every entity. A reviewer will ask two questions: which measures were filled with zero (only additive ones), and where the entity list comes from (a dimension).

> **The main idea:** CROSS JOIN the spine with the entity list from a dimension, LEFT JOIN the facts, fill additive measures with 0, and leave ratios NULL.

*Read more:* [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-8"></a>
## 8. Week-over-week when some weeks have no rows

*Part B · why does LAG compare with the wrong week?*

*Window functions* (slide 15) computes period-over-period as “aggregate per period, then `LAG`”. That is correct only when every period has a row. `LAG` returns the previous **row**, not the previous **week**, so on a sparse weekly table it silently compares with whatever week last had data.

#### ✗ LAG on sparse weekly rows

```sql
WITH weekly AS (                    -- only weeks that had a workshop order
    SELECT date_trunc('week', chicago(placed_at_utc))::DATE AS week_start,
           count(*) AS orders
    FROM orders
    WHERE category = 'workshop'
    GROUP BY ALL
)
SELECT week_start, orders,
       LAG(week_start) OVER w AS compared_with,
       LAG(orders)     OVER w AS prev_orders
FROM weekly
WINDOW w AS (ORDER BY week_start)
QUALIFY week_start BETWEEN DATE '2026-04-13' AND DATE '2026-06-08'
ORDER BY week_start;
```

Result (6 rows):

| week_start | orders | compared_with | prev_orders |
|---|---|---|---|
| 2026-04-20 | 1 | 2026-03-30 | 1 |
| 2026-04-27 | 1 | 2026-04-20 | 1 |
| 2026-05-04 | 2 | 2026-04-27 | 1 |
| 2026-05-11 | 1 | 2026-05-04 | 2 |
| 2026-05-25 | 1 | 2026-05-11 | 1 |
| 2026-06-01 | 1 | 2026-05-25 | 1 |

The week of 20 April is compared with 30 March, three weeks earlier; 25 May is compared with 11 May. A dashboard built on this shows smooth growth while two weeks had no workshop sales at all.

#### ✓ Fill the weeks first, then LAG

```sql
WITH weeks AS (                     -- complete Chicago weeks from the calendar
    SELECT DISTINCT week_start FROM calendar
    WHERE week_start BETWEEN DATE '2026-04-06' AND DATE '2026-06-08'
), weekly AS (
    SELECT date_trunc('week', chicago(placed_at_utc))::DATE AS week_start,
           count(*) AS orders
    FROM orders
    WHERE category = 'workshop'
    GROUP BY ALL
), filled AS (
    SELECT week_start, coalesce(weekly.orders, 0) AS orders
    FROM weeks LEFT JOIN weekly USING (week_start)
)
SELECT week_start, orders,
       LAG(orders) OVER w                                           AS prev_orders,
       orders - LAG(orders) OVER w                                  AS wow_change,
       round(100.0 * (orders - LAG(orders) OVER w)
             / NULLIF(LAG(orders) OVER w, 0), 1)                    AS wow_pct
FROM filled
WINDOW w AS (ORDER BY week_start)
QUALIFY week_start >= DATE '2026-04-13'
ORDER BY week_start;
```

Result (9 rows):

| week_start | orders | prev_orders | wow_change | wow_pct |
|---|---|---|---|---|
| 2026-04-13 | 0 | 0 | 0 | NULL |
| 2026-04-20 | 1 | 0 | 1 | NULL |
| 2026-04-27 | 1 | 1 | 0 | 0 |
| 2026-05-04 | 2 | 1 | 1 | 100 |
| 2026-05-11 | 1 | 2 | -1 | -50 |
| 2026-05-18 | 0 | 1 | -1 | -100 |
| 2026-05-25 | 1 | 0 | 1 | NULL |
| 2026-06-01 | 1 | 1 | 0 | 0 |
| 2026-06-08 | 0 | 1 | -1 | -100 |

With the calendar’s weeks on the left, empty weeks are explicit zeros and `LAG` is the previous week again. Growth from zero is `NULL`, not infinity: `NULLIF` stops the division, and the absolute change (+1) is the more honest number for small counts.

#### Alternative: join on the period key

```sql
WITH weekly AS (
    SELECT date_trunc('week', chicago(placed_at_utc))::DATE AS week_start, count(*) AS orders
    FROM orders WHERE category = 'workshop' GROUP BY ALL
)
SELECT c.week_start,
       coalesce(cur.orders, 0)  AS orders,
       coalesce(prev.orders, 0) AS prev_orders
FROM (SELECT DISTINCT week_start FROM calendar
      WHERE week_start BETWEEN DATE '2026-05-11' AND DATE '2026-06-08') AS c
LEFT JOIN weekly AS cur  ON cur.week_start  = c.week_start
LEFT JOIN weekly AS prev ON prev.week_start = c.week_start - INTERVAL 7 DAY
ORDER BY c.week_start;
```

Result (5 rows):

| week_start | orders | prev_orders |
|---|---|---|
| 2026-05-11 | 1 | 2 |
| 2026-05-18 | 0 | 1 |
| 2026-05-25 | 1 | 0 |
| 2026-06-01 | 1 | 1 |
| 2026-06-08 | 0 | 1 |

Joining the previous period by its *key* (`week_start − 7 days`) cannot pick the wrong week, even without filling. It is also how you do year-over-year: `month_start − INTERVAL 1 YEAR`, instead of `LAG(…, 12)`, which needs all 12 months to exist.

#### Three more rules

- **Exclude the incomplete current period.** The week of 15 June had only Monday to Wednesday morning when the data was loaded; comparing it with a full week shows a fake drop (*Metric design*, slide 15).
- **Zero is not “no data”.** If the order feed failed for a day, filling that week with 0 hides an incident. Join a load log and return `NULL` for weeks with a missing load day.
- **Per segment:** densify segment × week (lesson 7), then `LAG … OVER (PARTITION BY segment ORDER BY week_start)`.

> **On the job:** Weekly business reviews are full of week-over-week arrows. When one looks surprising, check two things before anyone investigates the business: are empty weeks present as rows, and is the latest week complete? Interviewers ask the same follow-up: “what if a week has no sales?”.

> **The main idea:** LAG counts rows, not periods: fill the periods from a calendar (or join the previous period by its key) before computing any period-over-period change.

*Read more:* [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-9"></a>
## 9. Rolling averages over gaps: ROWS vs RANGE

*Part B · is a “7-day average” really over 7 days? (added)*

A window **frame** (*Window functions*, slide 6) chooses which rows feed each calculation. `ROWS BETWEEN 6 PRECEDING` means “the 6 previous *rows*”; `RANGE BETWEEN INTERVAL 6 DAYS PRECEDING` means “rows whose *date* is within the last 6 days”. On a dense spine they agree. On sparse data they do not, and neither average is the 7-day average.

```sql
WITH daily AS (                     -- sparse: only days with orders
    SELECT chicago(placed_at_utc)::DATE AS date_day, count(*) AS orders
    FROM orders GROUP BY ALL
), sparse AS (
    SELECT date_day,
           round(avg(orders) OVER (ORDER BY date_day
                 ROWS  BETWEEN 6 PRECEDING AND CURRENT ROW), 2)            AS rows_on_sparse,
           round(avg(orders) OVER (ORDER BY date_day
                 RANGE BETWEEN INTERVAL 6 DAYS PRECEDING AND CURRENT ROW), 2) AS range_avg_on_sparse,
           round(sum(orders) OVER (ORDER BY date_day
                 RANGE BETWEEN INTERVAL 6 DAYS PRECEDING AND CURRENT ROW) / 7, 2) AS range_sum_div_7
    FROM daily
), filled AS (                      -- dense: one row per calendar day
    SELECT c.date_day, coalesce(d.orders, 0) AS orders,
           round(avg(coalesce(d.orders, 0)) OVER (ORDER BY c.date_day
                 ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2)             AS rows_on_filled
    FROM calendar AS c LEFT JOIN daily AS d USING (date_day)
    WHERE c.date_day BETWEEN DATE '2026-01-01' AND DATE '2026-06-16'
)
SELECT f.date_day, f.orders, s.rows_on_sparse, s.range_avg_on_sparse,
       s.range_sum_div_7, f.rows_on_filled
FROM filled AS f LEFT JOIN sparse AS s USING (date_day)
WHERE f.date_day BETWEEN DATE '2026-02-02' AND DATE '2026-02-09'
ORDER BY f.date_day;
```

Result (8 rows):

| date_day | orders | rows_on_sparse | range_avg_on_sparse | range_sum_div_7 | rows_on_filled |
|---|---|---|---|---|---|
| 2026-02-02 | 0 | NULL | NULL | NULL | 0.71 |
| 2026-02-03 | 0 | NULL | NULL | NULL | 0.57 |
| 2026-02-04 | 1 | 1.14 | 1.33 | 0.57 | 0.57 |
| 2026-02-05 | 0 | NULL | NULL | NULL | 0.43 |
| 2026-02-06 | 3 | 1.43 | 2 | 0.57 | 0.57 |
| 2026-02-07 | 0 | NULL | NULL | NULL | 0.57 |
| 2026-02-08 | 2 | 1.57 | 2 | 0.86 | 0.86 |
| 2026-02-09 | 2 | 1.71 | 2 | 1.14 | 1.14 |

#### Read the columns

- `rows_on_sparse`: on 6 February the 7 rows reach back to 26 January. Wrong window.
- `range_avg_on_sparse`: the right days, but `avg` divides by the number of days *that had orders*, so empty days raise the average instead of lowering it. Wrong denominator.
- `range_sum_div_7`: a 7-day sum divided by 7 is right, but only on days that exist in the sparse table (2, 3, 5, and 7 February are missing).
- `rows_on_filled`: fill the days first, then any frame is right, on every day. This is the answer.

#### Edges and choices

- **The first 6 days** of the spine have short windows. Return `NULL` until `count(*) OVER w = 7`, or start the spine 6 days before the reporting period.
- **“Last 7 days” vs “last 168 hours”**: a frame over calendar days is not the same as a rolling 7 × 24-hour window on timestamps (and DST days have 23 or 25 hours).
- **Engines:** RANGE with an interval works in DuckDB, PostgreSQL 11+, Spark SQL, Snowflake, and BigQuery (on a numeric key such as `UNIX_DATE`). T-SQL supports `RANGE` only with `UNBOUNDED` / `CURRENT ROW`, so fill the days and use `ROWS`.

> **On the job:** “7-day rolling average” is on most operational dashboards (orders, tickets, sign-ups) and is a classic screen question. The interviewer’s follow-up is always the same: “what if some days have no rows?”. Answer: densify with a spine first, then a ROWS frame; or a RANGE sum divided by the window length, and say why AVG over RANGE is wrong.

> **The main idea:** on gappy data, ROWS counts the wrong days and AVG over RANGE uses the wrong denominator; fill the days first, then any frame gives the true rolling average.

*Read more:* [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [DuckDB: INTERVAL](https://duckdb.org/docs/stable/sql/data_types/interval).

---

<a id="slide-10"></a>
## 10. TIMESTAMP vs TIMESTAMPTZ: store UTC, convert at the edge

*Part C · what does a timestamp actually mean, and who decides its day?*

*Metric design* (slide 10) set the policy: periods are local, storage is UTC, convert with an IANA zone name. This lesson is the SQL underneath. A **TIMESTAMP** (without time zone) is a wall-clock reading with no zone attached: it means whatever your convention says (at Leafy, UTC). A **TIMESTAMPTZ** (with time zone) is an absolute **instant**; it is stored as UTC, but every display, cast to `DATE`, and `date_trunc` uses the **session time zone** (`SET TimeZone`).

#### One instant, four readings

```sql
SELECT TIMESTAMP '2026-03-09 03:30'                              AS stored_utc,
       TIMESTAMP '2026-03-09 03:30' AT TIME ZONE 'UTC'                      AS the_instant,
       (TIMESTAMP '2026-03-09 03:30' AT TIME ZONE 'UTC')
                                    AT TIME ZONE 'America/Chicago'          AS chicago_clock,
       TIMESTAMP '2026-03-09 03:30' AT TIME ZONE 'America/Chicago'          AS wrong_way_round;
```

Result (1 row):

| stored_utc | the_instant | chicago_clock | wrong_way_round |
|---|---|---|---|
| 2026-03-09 03:30:00 | 2026-03-09 03:30:00+00:00 | 2026-03-08 22:30:00 | 2026-03-09 08:30:00+00:00 |

- `TIMESTAMP AT TIME ZONE z` reads the wall clock *as if it were in z* and returns an instant (`TIMESTAMPTZ`).
- `TIMESTAMPTZ AT TIME ZONE z` returns the wall clock *in z* (`TIMESTAMP`).
- So UTC → Chicago is two steps: say it is UTC, then ask for Chicago. Doing only the second step (`wrong_way_round`) treats 03:30 as Chicago time and moves it five hours the wrong way.

#### The session time-zone trap

```python
import duckdb

for zone in ["UTC", "America/Chicago"]:           # two analysts, two laptops, one file
    con = duckdb.connect("leafy_time.duckdb")
    con.execute(f"SET TimeZone = '{zone}'")
    wrong_day, total = con.sql("""
        SELECT count(*) FILTER (WHERE (placed_at_utc AT TIME ZONE 'UTC')::DATE   -- the session decides
                                      <> chicago(placed_at_utc)::DATE),          -- the query decides
               count(*)
        FROM orders""").fetchone()
    print(f"session {zone:<16} orders whose day differs from the Chicago day: {wrong_day} of {total}")
```

Output:

```text
session UTC              orders whose day differs from the Chicago day: 76 of 264
session America/Chicago  orders whose day differs from the Chicago day: 0 of 264
```

The same file and the same SQL give different answers on two machines, because casting a `TIMESTAMPTZ` to `DATE` uses the session’s zone. The DuckDB Python client defaults to the computer’s zone; BI tools and notebooks each have their own setting. Writing the zone in the query (the `chicago()` macro) makes the answer the same everywhere.

#### Convert at the edge

- **Store** every event as UTC: either `TIMESTAMP` with a `_utc` suffix, or `TIMESTAMPTZ`. Never store local times of past events without their zone.
- **Compute** joins, ordering, durations, and windows in UTC: “7 days after the view” is 168 hours, whatever the clocks did.
- **Convert** to a local wall clock once, at the *edge*: in the mart column that defines the local day (`order_date_local`), or in the presentation layer, always with an explicit IANA zone.
- **Pin the session**: `SET TimeZone = 'UTC'` in every connection, dbt profile, and BI data source, so nothing depends on a laptop’s settings.

#### Coming from C#

`TIMESTAMP` is a `DateTime` with `Kind = Unspecified`; `TIMESTAMPTZ` is closest to `DateTimeOffset` normalised to UTC (it does not remember the original offset). `AT TIME ZONE` plays the role of `TimeZoneInfo.ConvertTime`. The rule you know from .NET (store `DateTime.UtcNow`, convert for display) is the same rule here.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL | Same as DuckDB: `timestamp` is a wall clock; `timestamptz` an instant shown in the session `TimeZone`. |
| Snowflake | `TIMESTAMP_NTZ` (wall clock), `TIMESTAMP_LTZ` (instant, session zone), `TIMESTAMP_TZ` (instant + offset). Plain `TIMESTAMP` maps to one of them via `TIMESTAMP_TYPE_MAPPING` (default NTZ). Convert with `CONVERT_TIMEZONE`. |
| BigQuery | `TIMESTAMP` is an instant (UTC); `DATETIME` is a wall clock. `DATE(ts, 'America/Chicago')` gives the local day. |
| Spark SQL | `TIMESTAMP` is an instant shown in `spark.sql.session.timeZone`; `TIMESTAMP_NTZ` (Spark 3.4+) is a wall clock. Convert with `from_utc_timestamp`. |
| SQL Server / Fabric Warehouse | `datetime2` is a wall clock; `datetimeoffset` keeps the offset, but Fabric Warehouse cannot store it: keep UTC in `datetime2` and convert with `AT TIME ZONE` (Windows zone names) at query time. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Asked as “how would you store timestamps for a global shop?”, the strong answer is: UTC instants everywhere, the business zone applied once in a named column or macro, sessions pinned to UTC, and future local appointments stored as local time plus zone (lesson 12). Then name the trap you have seen: two reports disagreeing because their session zones differ.

> **The main idea:** a TIMESTAMPTZ is an instant whose day depends on the session; store UTC, compute in UTC, and convert once, explicitly, at the edge.

*Read more:* [DuckDB: timestamp types](https://duckdb.org/docs/stable/sql/data_types/timestamp), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [DuckDB: configuration (TimeZone)](https://duckdb.org/docs/stable/configuration/overview), [PostgreSQL: date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html), [Snowflake: CONVERT_TIMEZONE](https://docs.snowflake.com/en/sql-reference/functions/convert_timezone).

---

<a id="slide-11"></a>
## 11. Local day boundaries and daylight saving

*Part C · which UTC rows belong to one Chicago day?*

A **local day boundary** is local midnight expressed as a UTC instant. One Chicago day is the half-open UTC range `[utc_start, utc_end)`; usually 24 hours long, but 23 on the spring-forward day and 25 on the fall-back day. Instead of converting every stored row to local time, convert the two boundaries once (the calendar did it in lesson 5) and compare the untouched UTC column with them.

#### Orders per Chicago day around the DST change

```sql
SELECT c.date_day, c.utc_start, c.utc_end, c.hours_in_day,
       count(o.order_id)                            AS orders,
       round(count(o.order_id) / c.hours_in_day, 3) AS orders_per_hour
FROM calendar AS c
LEFT JOIN orders AS o
       ON o.placed_at_utc >= c.utc_start AND o.placed_at_utc < c.utc_end
WHERE c.date_day BETWEEN DATE '2026-03-06' AND DATE '2026-03-10'
GROUP BY c.date_day, c.utc_start, c.utc_end, c.hours_in_day
ORDER BY c.date_day;
```

Result (5 rows):

| date_day | utc_start | utc_end | hours_in_day | orders | orders_per_hour |
|---|---|---|---|---|---|
| 2026-03-06 | 2026-03-06 06:00:00 | 2026-03-07 06:00:00 | 24 | 3 | 0.125 |
| 2026-03-07 | 2026-03-07 06:00:00 | 2026-03-08 06:00:00 | 24 | 1 | 0.042 |
| 2026-03-08 | 2026-03-08 06:00:00 | 2026-03-09 05:00:00 | 23 | 1 | 0.043 |
| 2026-03-09 | 2026-03-09 05:00:00 | 2026-03-10 05:00:00 | 24 | 1 | 0.042 |
| 2026-03-10 | 2026-03-10 05:00:00 | 2026-03-11 05:00:00 | 24 | 0 | 0 |

8 March has 23 hours. A per-day count is still right; a per-*hour* rate or a staffing model that assumes 24 hours is off by about 4 %. On 1 November the error goes the other way.

#### Two methods, same answer

```sql
WITH by_bounds AS (               -- convert the two boundaries once per day
    SELECT c.date_day, count(o.order_id) AS orders
    FROM calendar AS c
    LEFT JOIN orders AS o ON o.placed_at_utc >= c.utc_start AND o.placed_at_utc < c.utc_end
    WHERE c.date_day BETWEEN DATE '2026-01-01' AND DATE '2026-06-16'
    GROUP BY ALL
), by_rows AS (                         -- convert every row
    SELECT chicago(placed_at_utc)::DATE AS date_day, count(*) AS orders
    FROM orders GROUP BY ALL
)
SELECT count(*) AS days_compared,
       count(*) FILTER (WHERE b.orders <> coalesce(r.orders, 0)) AS days_that_differ
FROM by_bounds AS b LEFT JOIN by_rows AS r USING (date_day);
```

Result (1 row):

| days_compared | days_that_differ |
|---|---|
| 167 | 0 |

Every day from 1 January to 16 June matches. The boundary method leaves `placed_at_utc` untouched, so a warehouse can still prune partitions or clusters on the stored UTC date. One local day spans *two* UTC dates (06:00 to 06:00), so a filter on the UTC date alone would cut it in half.

#### An hourly spine on the DST day

```sql
SELECT 'local hours 00:00..23:00 (naive)' AS hourly_spine, count(*) AS hours,
       count(*) FILTER (WHERE h::TIME = TIME '02:00') AS rows_at_0200
FROM generate_series(TIMESTAMP '2026-03-08 00:00', TIMESTAMP '2026-03-08 23:00', INTERVAL 1 HOUR) AS t(h)
UNION ALL
SELECT 'UTC hours of the Chicago day, shown local', count(*),
       count(*) FILTER (WHERE chicago(h)::TIME = TIME '02:00')
FROM generate_series(TIMESTAMP '2026-03-08 06:00', TIMESTAMP '2026-03-09 04:00', INTERVAL 1 HOUR) AS t(h)
ORDER BY hours;
```

Result (2 rows):

| hourly_spine | hours | rows_at_0200 |
|---|---|---|
| UTC hours of the Chicago day, shown local | 23 | 0 |
| local hours 00:00..23:00 (naive) | 24 | 1 |

Generating local wall-clock hours produces 02:00 on 8 March, an hour that never happened in Chicago, and 24 rows for a 23-hour day. Generate the spine in UTC from `utc_start` to `utc_end`, then convert each hour for display.

#### Rules that prevent DST bugs

- Filter local periods with `ts >= utc_start AND ts < utc_end`, never `BETWEEN` (it includes both midnights).
- Divide by `hours_in_day`, not 24, for hourly rates.
- Spines finer than a day (hours, 15 minutes) are generated in UTC.
- Test one spring-forward day, one fall-back day, and a month end in every time-based model.

> **On the job:** Hourly staffing, delivery SLAs, and “orders per hour” dashboards break twice a year. A calendar with UTC bounds and `hours_in_day` turns that into a data question, not an incident. It also keeps the big fact table’s UTC column usable for partition pruning in Fabric, Snowflake, BigQuery, or Databricks.

> **The main idea:** turn local days into UTC ranges once (in the calendar), compare the stored UTC column with them, and remember that DST days have 23 or 25 hours.

*Read more:* [DuckDB: TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [PostgreSQL: date/time functions (AT TIME ZONE)](https://www.postgresql.org/docs/current/functions-datetime.html).

---

<a id="slide-12"></a>
## 12. DST edge cases and per-user time zones

*Part C · local → UTC, and “local to whom?” (added)*

Converting UTC to local is always unambiguous. Converting *local to UTC* is not: on spring-forward day a range of local times is a **nonexistent local time** (the clock skips it), and on fall-back day a range is an **ambiguous local time** (the clock shows it twice). You meet this whenever a local time is *entered* rather than recorded: a workshop scheduled for 02:30, store opening hours, a user’s reminder time.

#### DuckDB’s choice

```sql
SELECT local_time, local_time AT TIME ZONE 'America/Chicago' AS duckdb_instant
FROM (VALUES (TIMESTAMP '2026-03-08 01:30'),     -- normal
             (TIMESTAMP '2026-03-08 02:30'),     -- never happened (spring forward)
             (TIMESTAMP '2026-11-01 01:30'))     -- happened twice (fall back)
     AS t(local_time)
ORDER BY local_time;
```

Result (3 rows):

| local_time | duckdb_instant |
|---|---|
| 2026-03-08 01:30:00 | 2026-03-08 07:30:00+00:00 |
| 2026-03-08 02:30:00 | 2026-03-08 08:30:00+00:00 |
| 2026-11-01 01:30:00 | 2026-11-01 07:30:00+00:00 |

02:30 on 8 March is moved forward to 03:30 CDT (08:30 UTC). 01:30 on 1 November is read as the *second* occurrence, CST (07:30 UTC).

#### Python’s choice

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

chicago = ZoneInfo("America/Chicago")
for wall in ["2026-03-08 02:30", "2026-11-01 01:30"]:
    for fold in (0, 1):                      # fold=0: first occurrence, fold=1: second
        local = datetime.fromisoformat(wall).replace(tzinfo=chicago, fold=fold)
        print(wall, "fold", fold, "->", local.astimezone(timezone.utc).strftime("%H:%M UTC"))
```

Output:

```text
2026-03-08 02:30 fold 0 -> 08:30 UTC
2026-03-08 02:30 fold 1 -> 07:30 UTC
2026-11-01 01:30 fold 0 -> 06:30 UTC
2026-11-01 01:30 fold 1 -> 07:30 UTC
```

Python’s `zoneinfo` uses `fold` to choose; the default (0) is the *first* occurrence, 06:30 UTC. **DuckDB and Python disagree by an hour** on the ambiguous time, and other engines have their own rules. Decide the rule yourself and test it.

#### Local to whom?

```sql
SELECT u.home_tz,
       count(*)                                                              AS orders,
       count(*) FILTER (WHERE hour(chicago(o.placed_at_utc)) >= 21)          AS after_9pm_chicago_time,
       count(*) FILTER (WHERE hour((o.placed_at_utc AT TIME ZONE 'UTC')
                                    AT TIME ZONE u.home_tz) >= 21)           AS after_9pm_own_time
FROM orders AS o
JOIN users AS u USING (user_id)
GROUP BY ALL
ORDER BY orders DESC;
```

Result (4 rows):

| home_tz | orders | after_9pm_chicago_time | after_9pm_own_time |
|---|---|---|---|
| America/Chicago | 189 | 36 | 36 |
| America/New_York | 31 | 5 | 3 |
| America/Los_Angeles | 24 | 5 | 1 |
| Europe/London | 20 | 0 | 2 |

“Late-evening orders” depends on whose evening. London customers who order at 21:00 their time appear as mid-afternoon in Chicago time; Los Angeles customers are the reverse. Behavioural questions (when do people shop, local-day active users) use each user’s zone, looked up from `users.home_tz` with `AT TIME ZONE` on a column; finance and operations questions use the business zone.

#### Rules

- **Past events:** store the UTC instant. Keep the user’s zone in a separate column if local behaviour matters.
- **Future local events** (appointments, opening hours): store local wall time *plus* the IANA zone, and compute UTC when needed, because time-zone rules can change before the date arrives.
- **Gaps and overlaps:** choose a rule (shift forward; first occurrence) and test both DST days.
- **Offsets between zones move:** the US changed clocks on 8 March and the UK on 29 March 2026, so for three weeks London was 5 hours ahead of Chicago instead of 6.

> **On the job:** Scheduling, notifications, and “local-day” metrics for international users are where time-zone bugs reach customers: a reminder sent an hour late, a booking that disappears on DST night. In a design interview, saying “future local times are stored as wall time plus zone, and we tested both DST days” marks real experience.

> **The main idea:** local-to-UTC conversion can skip or repeat an hour, and engines resolve it differently; store future local times with their zone, and choose per question whether “local” means the business’s zone or the user’s.

*Read more:* [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [Python datetime (fold)](https://docs.python.org/3/library/datetime.html), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html), [W3C: working with time zones](https://www.w3.org/TR/timezone/), [IANA time zone database](https://www.iana.org/time-zones).

---

<a id="slide-13"></a>
## 13. Monthly cohorts from raw events

*Part D · how do I turn an event log into cohort × age counts?*

*Business models and metrics* (slide 13) defined cohorts and retention and showed a weekly table built from a clean sessions model. Interviews and new projects usually start one step earlier, from a raw **event log**. The recipe has three steps: (1) reduce events to one row per user per active month; (2) give each user a **cohort month**, the month of their first activity; (3) compute each activity’s **cohort age** (`month_number`): whole months between the cohort month and the activity month.

*SQL · three views*

```sql
CREATE OR REPLACE VIEW user_months AS        -- one row per user per active Chicago month
SELECT DISTINCT user_id,
       date_trunc('month', chicago(event_at_utc))::DATE AS activity_month
FROM events
WHERE user_id IS NOT NULL;

CREATE OR REPLACE VIEW cohorts AS            -- cohort = month of the first event
SELECT user_id, min(activity_month) AS cohort_month
FROM user_months
GROUP BY user_id;

CREATE OR REPLACE VIEW cohort_long AS        -- long format: one row per cohort and age
SELECT c.cohort_month,
       date_diff('month', c.cohort_month, m.activity_month) AS month_number,
       count(*)                                              AS active_users
FROM cohorts AS c
JOIN user_months AS m USING (user_id)
GROUP BY ALL;
```

#### The January cohort, in long format

```sql
SELECT cohort_month, month_number, active_users
FROM cohort_long
WHERE cohort_month = DATE '2026-01-01'
ORDER BY month_number;
```

Result (6 rows):

| cohort_month | month_number | active_users |
|---|---|---|
| 2026-01-01 | 0 | 60 |
| 2026-01-01 | 1 | 33 |
| 2026-01-01 | 2 | 18 |
| 2026-01-01 | 3 | 21 |
| 2026-01-01 | 4 | 18 |
| 2026-01-01 | 5 | 12 |

Month 0 is the whole cohort (everyone was active in their first month). The long format, one row per cohort and age, is the shape to store and test; the wide matrix (next lesson) is for people.

#### Why distinct users, not rows

```sql
SELECT count(*) AS event_rows,
       count(DISTINCT event_id) AS distinct_events,
       count(*) FILTER (WHERE user_id IS NULL) AS anonymous,
       (SELECT count(*) FROM user_months) AS user_months
FROM events;
```

Result (1 row):

| event_rows | distinct_events | anonymous | user_months |
|---|---|---|---|
| 1628 | 1616 | 40 | 728 |

The event log has duplicate deliveries (same `event_id`), anonymous rows, and many events per user per month: the January cohort alone has 72 events in February from 33 users. Retention counts **users**. Reducing to `user_months` with `DISTINCT` before counting makes every later step safe.

#### Details that change the numbers

- **Which month?** Chicago months via `chicago()`. A UTC month moves evening activity on the last day of the month into the next cohort.
- `date_diff('month', a, b)` counts month *boundaries* crossed: 31 January → 1 February is 1. That is right here because both sides are month starts.
- **Anonymous events** (`user_id IS NULL`) cannot be followed over time: excluded, and say so.
- **First activity vs sign-up:** if a sign-up table exists, define the cohort from it and say which; the two differ for users who browsed before signing up.

#### Coming from C#

This is a `GroupBy(e => (e.UserId, Month(e.At)))` to get `user_months`, then a dictionary of each user’s first month, then a second `GroupBy` on `(cohortMonth, monthNumber)` with `Count()`. SQL expresses the same three passes as three views that you can test one at a time.

> **On the job:** A cohort model is a common first deliverable for an analytics engineer at a product company. Store it long (cohort, age, users) with its cohort sizes, test that month 0 equals the cohort size, and let the BI tool pivot it. Practice: the DataLemur “active user retention” question is the month-1 slice of this model.

> **The main idea:** cohorts from raw events: dedupe to user × month, take the first month as the cohort, compute the age in months, and count distinct users per cohort and age.

*Read more:* [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [Mixpanel: retention](https://docs.mixpanel.com/docs/reports/retention), [DataLemur: active user retention (practice)](https://datalemur.com/questions/user-retention).

---

<a id="slide-14"></a>
## 14. The cohort matrix: triangle, censoring, bounded vs unbounded

*Part D · how do I pivot it without lying about recent cohorts?*

A **cohort matrix** has one row per cohort and one column per age; each cell is the share of the cohort active at that age. Because recent cohorts have lived fewer months, the observed cells form a **triangle**. The cells below the diagonal are **censored** (right-censoring: the outcome may still happen after the data ends), so they must be `NULL`, never 0 %.

#### Step 1: every cell, with censoring

*SQL · cells with censoring*

```sql
CREATE OR REPLACE VIEW cohort_cells AS
WITH sizes AS (
    SELECT cohort_month, count(*) AS cohort_size
    FROM cohorts
    WHERE cohort_month <= DATE '2026-05-01'          -- June is still recruiting: not a cohort yet
    GROUP BY ALL
), grid AS (                                          -- a spine of cohort × age
    SELECT s.cohort_month, s.cohort_size, n.month_number,
           s.cohort_month + to_months(n.month_number) AS activity_month
    FROM sizes AS s CROSS JOIN range(0, 6) AS n(month_number)
), cells AS (
    SELECT g.cohort_month, g.cohort_size, g.month_number,
           CASE WHEN g.activity_month <= DATE '2026-05-01'      -- observed and complete
                THEN coalesce(l.active_users, 0) END AS active_users      -- NULL = not observed yet
    FROM grid AS g
    LEFT JOIN cohort_long AS l USING (cohort_month, month_number)
)
SELECT *, round(100.0 * active_users / cohort_size, 1) AS retention_pct
FROM cells;
```

A spine again: `CROSS JOIN` each cohort with ages 0–5 so that a cell with zero active users still exists (it becomes 0). Cells whose month is after May, the last *complete* month, become `NULL`. June is excluded as a cohort because it is still gaining members.

#### Step 2: pivot for people

```sql
PIVOT (SELECT cohort_month, cohort_size, 'm' || month_number AS age, retention_pct
       FROM cohort_cells)
ON age USING first(retention_pct)
GROUP BY cohort_month, cohort_size
ORDER BY cohort_month;
```

Result (5 rows):

| cohort_month | cohort_size | m0 | m1 | m2 | m3 | m4 | m5 |
|---|---|---|---|---|---|---|---|
| 2026-01-01 | 60 | 100 | 55 | 30 | 35 | 30 | NULL |
| 2026-02-01 | 54 | 100 | 63 | 48.1 | 38.9 | NULL | NULL |
| 2026-03-01 | 66 | 100 | 53 | 37.9 | NULL | NULL | NULL |
| 2026-04-01 | 60 | 100 | 61.7 | NULL | NULL | NULL | NULL |
| 2026-05-01 | 76 | 100 | NULL | NULL | NULL | NULL | NULL |

Read **down** a column to compare cohorts at the same age, **across** a row to watch one cohort decay. The empty lower-right triangle is honest: May’s month-1 retention is unknown until June ends, not zero.

#### Bounded or unbounded?

```sql
WITH flags AS (
    SELECT c.user_id, c.cohort_month,
           bool_or(m.activity_month =  c.cohort_month + INTERVAL 1 MONTH) AS active_in_m1,
           bool_or(m.activity_month >= c.cohort_month + INTERVAL 1 MONTH) AS active_m1_or_later
    FROM cohorts AS c
    JOIN user_months AS m USING (user_id)
    WHERE m.activity_month <= DATE '2026-05-01'
    GROUP BY ALL
)
SELECT cohort_month,
       round(100.0 * count(*) FILTER (WHERE active_in_m1) / count(*), 1)       AS bounded_m1,
       round(100.0 * count(*) FILTER (WHERE active_m1_or_later) / count(*), 1) AS unbounded_m1,
       date_diff('month', cohort_month, DATE '2026-05-01')             AS later_months_seen
FROM flags
WHERE cohort_month < DATE '2026-05-01'
GROUP BY ALL
ORDER BY cohort_month;
```

Result (4 rows):

| cohort_month | bounded_m1 | unbounded_m1 | later_months_seen |
|---|---|---|---|
| 2026-01-01 | 55 | 85 | 4 |
| 2026-02-01 | 63 | 90.7 | 3 |
| 2026-03-01 | 53 | 68.2 | 2 |
| 2026-04-01 | 61.7 | 61.7 | 1 |

**Bounded** (classic) retention: active *in* month N. **Unbounded** retention: active in month N *or any later month*; it is always higher. But it depends on how many later months you could see: January had four, April only one (so for April both numbers are equal). Unbounded numbers are comparable across cohorts only with a fixed horizon (for example “within 3 months”).

#### Rules for the matrix

- Store it long; pivot only in the last step (DuckDB `PIVOT`, or `max(…) FILTER (WHERE month_number = k)` in any engine).
- Censored cells are `NULL`; a partial current month is either excluded or labelled “month to date”.
- Overall month-1 retention across cohorts is Σ retained ÷ Σ cohort sizes, not the average of the cells (*Metric design*, slide 17).
- Name the variant in the title: “bounded monthly retention, Chicago months, cohort = first event”.

> **On the job:** Retention matrices drive product reviews and investor decks. The most common production bug is a censored cell shown as 0 %, which makes every new cohort look like a disaster; the second is mixing bounded and unbounded definitions between two dashboards. Build the grid with a spine, mask by the observation limit, and say which variant you report.

> **The main idea:** build every cohort × age cell from a spine, mask cells beyond the last complete period as NULL, pivot last, and name whether retention is bounded or unbounded.

*Read more:* [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [Censoring (statistics)](https://en.wikipedia.org/wiki/Censoring_%28statistics%29).

---

<a id="slide-15"></a>
## 15. An ordered funnel with a per-user 7-day window

*Part D · who viewed, then carted, then bought, within 7 days?*

*Business models and metrics* (slide 12) defined funnels by unit, order, rate base, and window. Here is the full SQL for the most-asked version: an **ordered funnel** per user with a **conversion window** anchored at the **entry event** (the first step). Each step must happen at or after the previous step and no later than 7 days (168 hours, measured in UTC) after the entry.

*SQL · the funnel, one row per user*

```sql
CREATE OR REPLACE VIEW funnel_may AS
WITH ev AS (                                   -- one row per event, known users only
    SELECT DISTINCT event_id, user_id, event_name, event_at_utc
    FROM events WHERE user_id IS NOT NULL
), entry AS (                                  -- step 1: first product view in May (Chicago)
    SELECT user_id, min(event_at_utc) AS t1
    FROM ev
    WHERE event_name = 'view_product'
      AND event_at_utc >= (SELECT utc_start FROM calendar WHERE date_day = DATE '2026-05-01')
      AND event_at_utc <  (SELECT utc_start FROM calendar WHERE date_day = DATE '2026-06-01')
    GROUP BY user_id
), step2 AS (                                  -- first cart at or after t1, within 7 days of t1
    SELECT n.user_id, n.t1, min(e.event_at_utc) AS t2
    FROM entry AS n
    LEFT JOIN ev AS e
           ON e.user_id = n.user_id AND e.event_name = 'add_to_cart'
          AND e.event_at_utc >= n.t1 AND e.event_at_utc <= n.t1 + INTERVAL 7 DAY
    GROUP BY ALL
)                                              -- step 3: first purchase at or after t2, within 7 days of t1
SELECT s.user_id, s.t1, s.t2, min(e.event_at_utc) AS t3
FROM step2 AS s
LEFT JOIN ev AS e
       ON e.user_id = s.user_id AND e.event_name = 'purchase'
      AND e.event_at_utc >= s.t2 AND e.event_at_utc <= s.t1 + INTERVAL 7 DAY
GROUP BY ALL;
```

#### The May funnel

```sql
SELECT count(*)  AS viewed,
       count(t2) AS carted,
       count(t3) AS purchased,
       round(count(t2) / count(*), 3)  AS view_to_cart,
       round(count(t3) / count(t2), 3) AS cart_to_purchase,
       round(count(t3) / count(*), 3)  AS overall
FROM funnel_may;
```

Result (1 row):

| viewed | carted | purchased | view_to_cart | cart_to_purchase | overall |
|---|---|---|---|---|---|
| 156 | 68 | 34 | 0.436 | 0.5 | 0.218 |

Step rates use the previous step as the base; `overall` uses the entry. All timestamps stay in UTC; only the entry period (May) is a Chicago calendar range, taken from the calendar’s `utc_start`.

#### Believable, but wrong: first time of each step

```sql
WITH per_user AS (                     -- first time of each step, any order, no window
    SELECT user_id,
           min(event_at_utc) FILTER (WHERE event_name = 'view_product') AS first_view,
           min(event_at_utc) FILTER (WHERE event_name = 'add_to_cart')  AS first_cart,
           min(event_at_utc) FILTER (WHERE event_name = 'purchase')     AS first_purchase
    FROM events WHERE user_id IS NOT NULL
    GROUP BY user_id
)
SELECT count(*) AS viewed, count(first_cart) AS carted, count(first_purchase) AS purchased
FROM per_user
WHERE user_id IN (SELECT user_id FROM funnel_may);
```

Result (1 row):

| viewed | carted | purchased |
|---|---|---|
| 156 | 121 | 94 |

Taking each user’s first-ever cart and purchase, with no order and no window, counts more purchasers: anything the same users ever bought, before the view or weeks later.

#### The planted users

```sql
SELECT user_id, t1, t2, t3, t3 IS NOT NULL AS converted
FROM funnel_may
WHERE user_id BETWEEN 901 AND 904
ORDER BY user_id;
```

Result (4 rows):

| user_id | t1 | t2 | t3 | converted |
|---|---|---|---|---|
| 901 | 2026-05-04 15:00:00 | 2026-05-04 15:06:00 | NULL | false |
| 902 | 2026-05-07 14:00:00 | 2026-05-07 14:03:00 | NULL | false |
| 903 | 2026-05-02 13:00:00 | NULL | NULL | false |
| 904 | 2026-05-12 17:00:00 | 2026-05-12 17:00:00 | 2026-05-12 17:09:00 | true |

#### What the funnel decided

- **901** bought 7 days and 1 hour after the view: outside the window, not converted.
- **902** bought on 5 May, *before* the 7 May view: a purchase must come after the cart, so not converted. The naive query counts them.
- **903** entered on 2 May and did nothing; their second visit (20 May) converted, but this funnel follows the *first* entry only (lesson 16).
- **904** carted in the same second as the view: `>=` counts it. With `>` it would be lost (lesson 16).

> **On the job:** “Users who viewed a product and purchased within 7 days” is one of the most frequent product-analytics interview questions, and a weekly growth-team metric. The structure (entry, then each step as the first matching event after the previous step, inside the window) scales to any number of steps and maps directly to a dbt model with one row per user.

> **The main idea:** anchor the funnel at the entry event, find each next step as the first matching event after the previous step, and bound every step by the window measured from the entry.

*Read more:* [Mixpanel: funnels](https://docs.mixpanel.com/docs/reports/funnels/funnels-overview), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: INTERVAL](https://duckdb.org/docs/stable/sql/data_types/interval).

---

<a id="slide-16"></a>
## 16. Funnel edge cases: ties, attempts, windows, maturity

*Part D · which choices change the conversion rate?*

Every funnel hides four decisions. Write them in the metric spec, because each one changes the number: **tie handling** (may two steps share a timestamp?), the **window anchor** (from the entry, or restarting at each step?), **attempts** (only the first entry, or any entry?), and **maturity** (has every entry had the full 7 days?).

#### Same data, four definitions

```sql
WITH ev AS (
    SELECT DISTINCT event_id, user_id, event_name, event_at_utc FROM events WHERE user_id IS NOT NULL
), may AS (SELECT (SELECT utc_start FROM calendar WHERE date_day = DATE '2026-05-01') AS lo,
                  (SELECT utc_start FROM calendar WHERE date_day = DATE '2026-06-01') AS hi
), attempts AS (                               -- every May product view is a possible entry
    SELECT user_id, event_at_utc AS t1,
           row_number() OVER (PARTITION BY user_id ORDER BY event_at_utc) AS attempt
    FROM ev, may
    WHERE event_name = 'view_product' AND event_at_utc >= lo AND event_at_utc < hi
), s AS (
    SELECT a.*,
           (SELECT min(event_at_utc) FROM ev e WHERE e.user_id = a.user_id AND e.event_name = 'add_to_cart'
              AND e.event_at_utc >= a.t1 AND e.event_at_utc <= a.t1 + INTERVAL 7 DAY) AS t2,
           (SELECT min(event_at_utc) FROM ev e WHERE e.user_id = a.user_id AND e.event_name = 'add_to_cart'
              AND e.event_at_utc >  a.t1 AND e.event_at_utc <= a.t1 + INTERVAL 7 DAY) AS t2_strict
    FROM attempts AS a
), f AS (
    SELECT s.*,
           (SELECT min(event_at_utc) FROM ev e WHERE e.user_id = s.user_id AND e.event_name = 'purchase'
              AND e.event_at_utc >= s.t2 AND e.event_at_utc <= s.t1 + INTERVAL 7 DAY) AS t3,
           (SELECT min(event_at_utc) FROM ev e WHERE e.user_id = s.user_id AND e.event_name = 'purchase'
              AND e.event_at_utc >  s.t2_strict AND e.event_at_utc <= s.t1 + INTERVAL 7 DAY) AS t3_strict,
           (SELECT min(event_at_utc) FROM ev e WHERE e.user_id = s.user_id AND e.event_name = 'purchase'
              AND e.event_at_utc >= s.t2 AND e.event_at_utc <= s.t2 + INTERVAL 7 DAY) AS t3_from_cart
    FROM s
)
SELECT 1 AS k, 'first entry, ties allowed, window from entry (lesson 15)' AS definition,
       count(*) FILTER (WHERE attempt = 1) AS users,
       count(*) FILTER (WHERE attempt = 1 AND t3 IS NOT NULL) AS converted FROM f
UNION ALL SELECT 2, 'strict order: ties not allowed',
       count(*) FILTER (WHERE attempt = 1), count(*) FILTER (WHERE attempt = 1 AND t3_strict IS NOT NULL) FROM f
UNION ALL SELECT 3, 'window restarts at each step (7 days from the cart)',
       count(*) FILTER (WHERE attempt = 1), count(*) FILTER (WHERE attempt = 1 AND t3_from_cart IS NOT NULL) FROM f
UNION ALL SELECT 4, 'any May entry may convert (every attempt)',
       count(DISTINCT user_id), count(DISTINCT user_id) FILTER (WHERE t3 IS NOT NULL) FROM f
ORDER BY k;
```

Result (4 rows):

| k | definition | users | converted |
|---|---|---|---|
| 1 | first entry, ties allowed, window from entry (lesson 15) | 156 | 34 |
| 2 | strict order: ties not allowed | 156 | 32 |
| 3 | window restarts at each step (7 days from the cart) | 156 | 35 |
| 4 | any May entry may convert (every attempt) | 156 | 45 |

One row per definition, all on May entries. Strict ordering loses same-second events such as user 904 (SDKs often batch events with one timestamp). Restarting the window at the cart lets slower buyers in. Counting every attempt rescues users like 903, who converted on a later visit; it answers “did May visitors buy within 7 days of *some* view?”, a different question.

#### Maturity: the last weeks are not finished

```sql
WITH entries AS (                   -- first view per user and Chicago week, May to mid-June
    SELECT user_id, date_trunc('week', chicago(min(event_at_utc)))::DATE AS entry_week,
           min(event_at_utc) AS t1
    FROM events
    WHERE event_name = 'view_product' AND user_id IS NOT NULL
      AND event_at_utc >= TIMESTAMP '2026-05-25 05:00'
    GROUP BY user_id
), conv AS (
    SELECT n.entry_week, n.user_id,
           bool_or(e.event_name = 'purchase' AND e.event_at_utc > n.t1
                   AND e.event_at_utc <= n.t1 + INTERVAL 7 DAY) AS bought_within_7d
    FROM entries AS n LEFT JOIN events AS e USING (user_id)
    GROUP BY ALL
)
SELECT entry_week, count(*) AS entered,
       round(count(*) FILTER (WHERE bought_within_7d) / count(*), 3) AS naive_rate,
       entry_week + INTERVAL 14 DAY <= chicago(any_value(l.loaded_at_utc))    AS mature,
       CASE WHEN mature THEN naive_rate END AS reportable_rate
FROM conv CROSS JOIN load_info AS l
GROUP BY entry_week
ORDER BY entry_week;
```

Result (4 rows):

| entry_week | entered | naive_rate | mature | reportable_rate |
|---|---|---|---|---|
| 2026-05-25 | 46 | 0.304 | true | 0.304 |
| 2026-06-01 | 56 | 0.304 | true | 0.304 |
| 2026-06-08 | 46 | 0.326 | false | NULL |
| 2026-06-15 | 13 | 0.154 | false | NULL |

An entry is **mature** when its full 7-day window has passed before the data load. Entries in the weeks of 8 and 15 June have not all had 7 days yet, so their rates can only rise as the data matures (the week of 15 June shows 0.154). Mask it, exactly like the censored cohort cells. The rule here is conservative: the week end plus 7 days must be before the load.

#### Choose and write down

| Decision | Default to suggest |
|---|---|
| Ties | `>=` (same-second events are common), with a stable tiebreaker if order matters |
| Window anchor | From the entry event; state the length in hours if DST could matter |
| Attempts | First entry in the period; use “any attempt” only when the question is about visits |
| Maturity | Report only entries whose window closed before the load; show the rest as “maturing” |
| Units | Known users; anonymous traffic needs a device or session funnel instead |

> **On the job:** When a product manager says “conversion dropped last week”, check maturity first: an immature week always looks worse. When two teams’ funnels disagree, compare these four decisions before comparing SQL. Interviewers love the follow-ups “what if two events have the same timestamp?” and “what if the user enters twice?”.

> **The main idea:** ties, the window anchor, attempts, and maturity are part of the funnel definition; choose each one explicitly and mask immature entry periods.

*Read more:* [Mixpanel: funnels](https://docs.mixpanel.com/docs/reports/funnels/funnels-overview), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [Censoring (statistics)](https://en.wikipedia.org/wiki/Censoring_%28statistics%29).

---

<a id="slide-17"></a>
## 17. Interview patterns: recognise the time question

*Part D · which technique does this question want?*

Time-analysis interview questions are recognisable from a few signal words. Name the technique, then the trap you will avoid, before writing SQL: it shows the interviewer you know where the bodies are buried.

| If the question says… | Reach for | Say this trap out loud |
|---|---|---|
| “including days with no sales”, “every day”, “fill the gaps” | Spine from the reporting period + `LEFT JOIN` + `coalesce(…, 0)` (lesson 4) | Bounds from the calendar, not from the data; ratios stay NULL. |
| “per store / per product per day” | Spine × entity panel (lesson 7) | Entity list from a dimension; filter in the join, not in WHERE. |
| “week-over-week”, “month-over-month”, “year-over-year” | Fill periods, then `LAG`, or join on `period − 1` (lesson 8) | LAG counts rows; exclude the incomplete current period. |
| “7-day rolling average” | Fill days, then `ROWS 6 PRECEDING` (lesson 9) | ROWS on sparse data; AVG over RANGE has the wrong denominator. |
| “per day in the customer’s / business’s time zone” | `AT TIME ZONE` with an IANA name, or calendar UTC bounds (lessons 10–12) | Session time zone; DST days have 23/25 hours. |
| “retention”, “cohort”, “came back in month N” | user × month dedupe, first month, `date_diff`, distinct users (lessons 13–14) | Censored cells are NULL; bounded vs unbounded. |
| “did A then B then C within N days” | Entry + ordered steps bounded by the window (lessons 15–16) | Order, ties, attempts, maturity. |
| “active this month and last month” | Self-join or `EXISTS` on `month − 1` (lesson 13) | Distinct users; months with no activity. |

#### A five-step routine for any time question

1. **Grain and period:** per user? per day? which week start?
2. **Clock and zone:** which timestamp, which time zone, half-open bounds.
3. **Spine:** must empty periods appear? What are the bounds?
4. **Definition:** window, order, ties, cohort rule, bounded or unbounded.
5. **Observation limit:** which periods or cohorts are incomplete, and how are they shown?

#### What “senior” sounds like

Juniors write a query that runs. Seniors state the definition first (“I’ll treat the cohort as the first event’s Chicago month and mask months after May”), then write SQL in testable steps (user_months, cohorts, cells, pivot), then name one test (“month 0 equals the cohort size”). Practise saying the routine aloud with the exercises at the end of the deck.

> **On the job:** These eight patterns cover most SQL rounds for analytics-engineer and product-analyst roles that touch time: they appear in public question banks (DataLemur, StrataScratch, LeetCode database problems) and in take-home tasks. The same routine is how you review a colleague’s time-based model.

> **The main idea:** recognise the pattern from its signal words, name the trap before you write SQL, and state the definition (zone, bounds, window, censoring) as part of the answer.

---

<a id="slide-18"></a>
## 18. Lab: a cohort matrix and a funnel you can check by hand

*Lab · the task, the data, and the plan*

**Task:** from a tiny raw event log, build (1) a **monthly cohort retention matrix** in Chicago months with censored cells, and (2) a **3-step ordered funnel** (view → cart → purchase) with a per-user 7-day window for users whose first product view was in March. The data is small enough to compute every number on paper first, then prove the SQL matches. About an hour, fully offline.

The data was loaded on **20 April 2026 at 15:00 UTC**, so March is the last complete month. Every trap from the lessons is planted once: a duplicate delivery (event 8), an anonymous row (26), an event at 23:30 on the last evening of a month in Chicago that is already the next month in UTC (users 4 and 9), a purchase before the view (user 5), a purchase 30 minutes outside the window (user 2), and a same-second cart (user 8).

#### The whole event log, per user, in Chicago time

```sql
SELECT user_id,
       string_agg(event_id || ' ' || replace(event_name, '_product', '') || ' ' ||
                  strftime(chicago(event_at_utc), '%d %b %H:%M'), ' · '
                  ORDER BY event_at_utc, event_id) AS events_in_chicago_time
FROM read_csv('sql-time-analysis-lab/data/events.csv', header = true,
              columns = {'event_id': 'INTEGER', 'user_id': 'INTEGER',
                         'event_name': 'VARCHAR', 'event_at_utc': 'TIMESTAMP'})
GROUP BY user_id
ORDER BY user_id NULLS LAST;
```

Result (11 rows):

| user_id | events_in_chicago_time |
|---|---|
| 1 | 1 view 05 Jan 10:00 · 2 view 10 Feb 12:00 · 3 view 03 Mar 09:00 · 4 add_to_cart 03 Mar 09:05 · 5 purchase 04 Mar 04:00 |
| 2 | 6 view 12 Jan 14:00 · 7 view 10 Mar 09:00 · 8 add_to_cart 12 Mar 04:00 · 8 add_to_cart 12 Mar 04:00 · 9 purchase 17 Mar 09:30 |
| 3 | 10 view 20 Jan 07:00 |
| 4 | 11 view 31 Jan 23:30 · 12 view 14 Feb 11:00 |
| 5 | 13 view 03 Feb 09:00 · 14 purchase 02 Mar 10:00 · 15 view 05 Mar 09:00 · 16 add_to_cart 05 Mar 09:10 |
| 6 | 17 view 20 Feb 13:00 · 18 view 08 Apr 13:00 |
| 7 | 19 view 25 Feb 15:00 |
| 8 | 20 view 20 Mar 17:00 · 21 add_to_cart 20 Mar 17:00 · 22 purchase 21 Mar 08:00 · 23 view 15 Apr 11:00 |
| 9 | 24 view 31 Mar 23:30 |
| 10 | 25 view 10 Apr 07:00 |
| NULL | 26 view 15 Mar 07:00 |

#### The lab folder

```text
sql-time-analysis-lab/
├── README.md                    task, hand calculation, expected output, definition of done
├── data/events.csv              27 rows: 10 users, Jan-Apr 2026, UTC timestamps
├── sql/01_staging.sql           dedupe, drop anonymous rows, lab parameters
├── sql/02_cohort_matrix.sql     user_months, cohorts, cohort_long, cohort_cells (censored)
├── sql/03_funnel.sql            funnel_users, funnel_summary (7-day ordered funnel)
├── run_lab.py                   builds everything in DuckDB and prints the results
├── tests/test_lab.py            pytest: hand-calculated answers + an independent Python check
└── make_leafy_time.py           the larger lesson dataset (lesson 3), for the exercises
```

Start with [the lab README](sql-time-analysis-lab/README.md). From inside the folder: `python run_lab.py`, then `python -m pytest -q`.

1. **Step 1** (by hand): Assign each user a Chicago cohort month and list active months; mark the funnel steps per user. Write down the expected matrix and funnel.
2. **Step 2** (staging): Dedupe, drop anonymous rows, set the load time and the last complete month (01_staging.sql).
3. **Step 3** (cohort matrix): user_months → cohorts → cohort_long → a cohort × age spine with censoring → PIVOT (02).
4. **Step 4** (funnel): Entry = first March view; first cart and first purchase inside the 7-day window, in order (03).
5. **Step 5** (prove it): pytest compares the SQL with your hand calculation and with an independent Python implementation.

> **On the job:** In your portfolio: Fuel Smart has dated Food.com reviews. The same two models answer “do reviewers come back in later months?” (reviewer cohorts by first-review month) and “of users who viewed a recipe, how many reviewed it within 7 days?”. Start with a fixture this small, check it by hand, and keep the tests when you scale to the real reviews.

> **The main idea:** a time-analysis model is trustworthy when a fixture small enough to compute by hand, with every trap planted once, gives exactly the numbers you predicted.

*Read more:* [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [pytest documentation](https://docs.pytest.org/en/stable/).

---

<a id="slide-19"></a>
## 19. Lab steps: the SQL, the run, and the tests

*Lab · three files, one runner, eight tests*

#### Step 2 · staging

```sql
# sql-time-analysis-lab/sql/01_staging.sql
-- 01_staging.sql: de-duplicated events of known users, the business time zone, and the lab parameters.
CREATE OR REPLACE MACRO chicago(ts_utc) AS
    (ts_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago';

CREATE OR REPLACE TABLE stg_events AS
SELECT DISTINCT event_id, user_id, event_name, event_at_utc     -- event 8 was delivered twice
FROM read_csv('data/events.csv', header = true,
              columns = {'event_id': 'INTEGER', 'user_id': 'INTEGER',
                         'event_name': 'VARCHAR', 'event_at_utc': 'TIMESTAMP'})
WHERE user_id IS NOT NULL;                                         -- anonymous rows cannot be followed

CREATE OR REPLACE TABLE lab_params AS
SELECT TIMESTAMP '2026-04-20 15:00'  AS loaded_at_utc,         -- 10:00 in Chicago
       DATE '2026-03-01'             AS last_complete_month,   -- April is still running
       DATE '2026-03-01'             AS funnel_month;          -- entries: first product view in March
```

#### Step 3 · cohort matrix

```sql
# sql-time-analysis-lab/sql/02_cohort_matrix.sql
-- 02_cohort_matrix.sql: monthly cohorts (Chicago months) from raw events, censored after the last complete month.
CREATE OR REPLACE VIEW user_months AS
SELECT DISTINCT user_id, date_trunc('month', chicago(event_at_utc))::DATE AS activity_month
FROM stg_events;

CREATE OR REPLACE VIEW cohorts AS
SELECT user_id, min(activity_month) AS cohort_month
FROM user_months
GROUP BY user_id;

CREATE OR REPLACE VIEW cohort_long AS
SELECT c.cohort_month,
       date_diff('month', c.cohort_month, m.activity_month) AS month_number,
       count(*)                                              AS active_users
FROM cohorts AS c
JOIN user_months AS m USING (user_id)
GROUP BY ALL;

CREATE OR REPLACE VIEW cohort_cells AS
WITH p AS (
    SELECT last_complete_month AS lcm FROM lab_params
), sizes AS (                                    -- complete cohorts only
    SELECT cohort_month, count(*) AS cohort_size
    FROM cohorts, p
    WHERE cohort_month <= p.lcm
    GROUP BY cohort_month
), grid AS (                                     -- spine: every cohort x age 0..3
    SELECT s.cohort_month, s.cohort_size, n.month_number,
           s.cohort_month + to_months(n.month_number) AS activity_month
    FROM sizes AS s CROSS JOIN range(0, 4) AS n(month_number)
), cells AS (
    SELECT g.cohort_month, g.cohort_size, g.month_number,
           CASE WHEN g.activity_month <= p.lcm
                THEN coalesce(l.active_users, 0) END AS active_users   -- NULL = censored
    FROM grid AS g
    CROSS JOIN p
    LEFT JOIN cohort_long AS l USING (cohort_month, month_number)
)
SELECT *, round(100.0 * active_users / cohort_size, 1) AS retention_pct
FROM cells;
```

#### Step 4 · funnel

```sql
# sql-time-analysis-lab/sql/03_funnel.sql
-- 03_funnel.sql: view -> cart -> purchase, each step at or after the previous one,
-- all within 7 days (168 hours) of the user's first product view in the funnel month (Chicago).
CREATE OR REPLACE VIEW funnel_users AS
WITH p AS (
    SELECT (funnel_month::TIMESTAMP AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC'            AS lo,
           ((funnel_month + INTERVAL 1 MONTH) AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC' AS hi,
           loaded_at_utc
    FROM lab_params
), entry AS (
    SELECT e.user_id, min(e.event_at_utc) AS t1, any_value(p.loaded_at_utc) AS loaded_at_utc
    FROM stg_events AS e, p
    WHERE e.event_name = 'view_product' AND e.event_at_utc >= p.lo AND e.event_at_utc < p.hi
    GROUP BY e.user_id
), step2 AS (
    SELECT n.user_id, n.t1, n.loaded_at_utc, min(e.event_at_utc) AS t2
    FROM entry AS n
    LEFT JOIN stg_events AS e
           ON e.user_id = n.user_id AND e.event_name = 'add_to_cart'
          AND e.event_at_utc >= n.t1 AND e.event_at_utc <= n.t1 + INTERVAL 7 DAY
    GROUP BY ALL
)
SELECT s.user_id, s.t1, s.t2, min(e.event_at_utc) AS t3,
       s.t1 + INTERVAL 7 DAY <= s.loaded_at_utc AS mature
FROM step2 AS s
LEFT JOIN stg_events AS e
       ON e.user_id = s.user_id AND e.event_name = 'purchase'
      AND e.event_at_utc >= s.t2 AND e.event_at_utc <= s.t1 + INTERVAL 7 DAY
GROUP BY ALL;

CREATE OR REPLACE VIEW funnel_summary AS
SELECT count(*)                         AS viewed,
       count(t2)                        AS carted,
       count(t3)                        AS purchased,
       round(count(t2) / count(*), 3)   AS view_to_cart,
       round(count(t3) / count(t2), 3)  AS cart_to_purchase,
       round(count(t3) / count(*), 3)   AS overall,
       bool_and(mature)                 AS all_entries_mature
FROM funnel_users;
```

#### Run it

Output:

```text
$ python sql-time-analysis-lab/run_lab.py
Cohort matrix (% of cohort active, Chicago months, NULL = not observed yet)
cohort_month  cohort_size  m0     m1    m2    m3  
2026-01-01    4            100.0  50.0  50.0  NULL
2026-02-01    3            100.0  33.3  NULL  NULL
2026-03-01    2            100.0  NULL  NULL  NULL

Funnel per user (March entries)
user_id  t1                   t2                   t3                   mature
1        2026-03-03 15:00:00  2026-03-03 15:05:00  2026-03-04 10:00:00  True  
2        2026-03-10 14:00:00  2026-03-12 09:00:00  NULL                 True  
5        2026-03-05 15:00:00  2026-03-05 15:10:00  NULL                 True  
8        2026-03-20 22:00:00  2026-03-20 22:00:00  2026-03-21 13:00:00  True  
9        2026-04-01 04:30:00  NULL                 NULL                 True  

Funnel summary
viewed  carted  purchased  view_to_cart  cart_to_purchase  overall  all_entries_mature
5       4       2          0.8           0.5               0.4      True              
```

Check against your hand calculation: January has 4 users because user 4’s first view (23:30 on 31 January in Chicago) is still January; 2 of them were active in February (users 1 and 4) and 2 in March (users 1 and 2). Of the 5 March entries, user 2 bought 30 minutes too late and user 5 bought before viewing, so 2 converted.

#### Test it

Terminal (timing measured on the build machine):

```text
$ python -m pytest -q -p no:cacheprovider
........                                                                 [100%]
8 passed in 0.31s
```

Test code: `sql-time-analysis-lab/tests/test_lab.py`. Two tests pin the hand-calculated answers; two compare with an independent Python implementation (`zoneinfo`, sets, plain loops); the rest check month 0 = cohort size, censored cells are NULL, user 4’s cohort, and maturity.

#### Definition of done

- ☐ Your hand-calculated matrix and funnel are written down before you run anything.
- ☐ `python run_lab.py` prints exactly those numbers.
- ☐ Censored cells are NULL; June-like incomplete cohorts are excluded.
- ☐ The funnel counts 5 → 4 → 2 and says why users 2 and 5 did not convert.
- ☐ `python -m pytest -q` passes: 8 tests.

#### Stretch

- Add an **unbounded** month-1 column and explain why January’s is higher.
- Change `>=` to `>` in the funnel: which user drops out, and which test catches it?
- Move the load time to 5 April: which cells and funnel entries become censored or immature?
- Port `02_cohort_matrix.sql` to your warehouse dialect using the dialect notes from lessons 4 and 10.

> **On the job:** This is a complete, reviewable story for a portfolio or a take-home: a fixture with planted traps, three small SQL models in dependency order, an expected answer derived by hand, and tests that check the SQL against both the hand answer and an independent implementation. Put the README’s “check it by hand” table in your write-up.

> **The main idea:** write the expected numbers first, then the SQL, then tests that pin both the hand answer and an independent implementation.

*Read more:* [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [pytest documentation](https://docs.pytest.org/en/stable/).

---

<a id="slide-20"></a>
## 20. Bug clinic: believable time-analysis bugs

*Practice · symptom → cause → fix*

Each bug below ran in a real report somewhere: the query works, the numbers look plausible, and they are wrong. Learn to recognise the *symptom*, because that is what you will see first.

| Symptom | Cause | Fix | Lesson |
|---|---|---|---|
| “Average orders per day” is suspiciously high for a slow category | Spine bounds from `min`/`max` of the filtered data, or no spine at all | Bounds from the reporting calendar, to the last complete day | 4 |
| The calendar model is missing 31 December | `dbt_utils.date_spine` end date is exclusive | Pass the day *after* the last day you need; test for gaps | 6 |
| Per-category chart loses all its zero days after adding a filter | `WHERE fact.col = …` after a `LEFT JOIN` | Filter inside the joined subquery or in `ON` | 7 |
| Week-over-week jumps +250 % after a quiet week | `LAG` over sparse rows compares with an older week | Fill weeks from the calendar, then `LAG`; or join on `week − 7` | 8 |
| “7-day average” rises on days with no sales | `AVG` over a `RANGE` frame divides by days that had rows | Fill days, then `ROWS`; or sum ÷ 7 | 9 |
| Two analysts get different daily totals from the same SQL | `TIMESTAMPTZ` cast to `DATE` uses each session’s zone | Pin `TimeZone = UTC`; convert explicitly with an IANA zone | 10 |
| Monthly totals never match Finance | `date_trunc` on UTC timestamps: evening orders on the last day move month | Truncate the local timestamp (`chicago(ts)`) | 10 |
| Hourly chart shows a 02:00 bar on DST Sunday | Hourly spine generated in local wall-clock time | Generate hours in UTC between the day’s UTC bounds | 11 |
| Retention looks huge in month 1 | `count(*)` of events instead of distinct users | Dedupe to user × month first | 13 |
| The newest cohort “collapsed” to 0 % | Censored cells filled with 0 | Censored cells stay NULL; spine + observation limit | 14 |
| Funnel conversion is far above the product tool’s number | First time of each step, no order, no window | Ordered steps inside the window from the entry | 15 |
| Last week’s conversion “dropped” | Entries whose 7-day window has not closed | Mask immature entry periods | 16 |

#### Executed: the UTC month bug

```sql
SELECT 'UTC month'     AS calendar,
       count(*) FILTER (WHERE date_trunc('month', placed_at_utc) = DATE '2026-04-01') AS april_orders
FROM orders
UNION ALL
SELECT 'Chicago month',
       count(*) FILTER (WHERE date_trunc('month', chicago(placed_at_utc)) = DATE '2026-04-01')
FROM orders
ORDER BY calendar;
```

Result (2 rows):

| calendar | april_orders |
|---|---|
| Chicago month | 44 |
| UTC month | 43 |

Orders placed on the evening of 31 March in Chicago are 1 April in UTC; orders on the evening of 30 April are 1 May. Finance closes the books on local months, so the UTC number never reconciles.

#### Executed: censored cells filled with zero

```sql
SELECT cohort_month,
       max(retention_pct)            FILTER (WHERE month_number = 1) AS m1_honest,
       coalesce(max(retention_pct)   FILTER (WHERE month_number = 1), 0) AS m1_filled_with_zero
FROM cohort_cells
WHERE cohort_month >= DATE '2026-03-01'
GROUP BY cohort_month
ORDER BY cohort_month;
```

Result (3 rows):

| cohort_month | m1_honest | m1_filled_with_zero |
|---|---|---|
| 2026-03-01 | 53 | 53 |
| 2026-04-01 | 61.7 | 61.7 |
| 2026-05-01 | NULL | 0 |

May’s month-1 cell is unknown until June ends. `coalesce(…, 0)` turns “not yet observed” into “nobody came back”, the most common way a retention chart lies.

> **On the job:** In code review, scan time-based SQL for five things: where the spine bounds come from, every `LAG` over an aggregate, every `date_trunc` or `::DATE` on a timestamp (which zone?), every `coalesce(…, 0)` (is it additive, is it observed?), and the window in every funnel. Most bugs in this table are caught by one of those five questions.

> **The main idea:** time bugs hide behind plausible numbers; check spine bounds, LAG over sparse rows, the zone of every truncation, zeros that should be NULL, and funnel order and windows.

---

<a id="slide-21"></a>
## 21. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

Say each answer aloud in about a minute before opening it. The questions follow the research for this deck (October 2026): spine and gap-filling questions, week-over-week with missing weeks, retention cohorts, funnels with windows, and time zones are the most frequent time-analysis topics in analytics-engineering and product-analytics SQL rounds.

<details><summary>“Show daily revenue for the last 30 days, including days with no orders.” · checks: a date spine, the bounds, and zero vs NULL</summary>

**Model answer (about 60 s):** I would generate one row per day for the 30 days, from a calendar table or `generate_series`, put it on the left of a `LEFT JOIN` to the daily aggregate, and `coalesce` revenue to 0, because revenue is additive. The bounds come from the reporting period, ending at the last complete day in the business time zone, not from `min`/`max` of the data, which would drop empty days at the edges. Averages such as order value would stay NULL on empty days.

**Likely follow-up:** “And per store?” → Cross-join the spine with the store dimension, then left-join the facts; filter stores in the join, not in WHERE.

</details>

<details><summary>“Compute week-over-week growth. What if some weeks have no sales?” · checks: that LAG works on rows, not periods</summary>

**Model answer (about 60 s):** Aggregate per week, then `LAG`. But `LAG` returns the previous row, so if a week is missing it compares with an older week. I fill the weeks from a calendar first, so empty weeks are 0, then compute the change; growth from 0 is NULL via `NULLIF`, and I would also show the absolute change. Alternatively I join the previous week by key, `week_start − 7 days`, which cannot pick the wrong week. I exclude the current, incomplete week.

**Likely follow-up:** “Year-over-year?” → Join on `month_start − INTERVAL 1 YEAR` rather than `LAG(…, 12)`, which assumes all 12 months exist.

</details>

<details><summary>“Build a monthly retention cohort table from this events table.” · checks: the three-step recipe and censoring</summary>

**Model answer (about 60 s):** Three steps. First, dedupe to one row per user per active month, in the business time zone. Second, the cohort month is each user’s first active month. Third, the age is the number of months between cohort month and activity month, and I count distinct users per cohort and age, divided by the cohort size. I build a cohort × age grid so zero cells exist, mark cells after the last complete month as NULL, store it long, and pivot only for display.

**Likely follow-up:** “Why do the latest cohorts look worse?” → Right-censoring: their later months have not happened yet. Those cells must be NULL, and partial months excluded or labelled.

</details>

<details><summary>“What is the difference between bounded and unbounded retention?” · checks: definitions and how censoring affects each</summary>

**Model answer (about 60 s):** Bounded retention counts users active *in* month N; unbounded counts users active in month N *or any later month*, so it is always at least as high and never rises with N. Unbounded depends on how much later data you can see, so older cohorts get an advantage; I compare it across cohorts only with a fixed horizon. I name the variant on the chart.

**Likely follow-up:** “Which would you put in a board deck?” → Bounded monthly retention with censored cells masked, plus a weighted average across cohorts (Σ retained ÷ Σ cohort).

</details>

<details><summary>“How many users viewed a product, added to cart, and purchased within 7 days?” · checks: order, window anchor, ties, maturity</summary>

**Model answer (about 60 s):** I anchor on each user’s first product view in the period. Step two is the first cart at or after that view and within 7 days of it; step three is the first purchase at or after the cart and still within 7 days of the view. The window is 168 hours in UTC. I count users at each step and report step and overall rates, excluding users whose 7 days have not passed yet.

**Likely follow-up:** “What if two events have the same timestamp, or the user enters twice?” → Ties: allow `>=` or add a tiebreaker, and say which. Repeat entries: first entry by default; “any attempt” answers a different question.

</details>

<details><summary>“How should we store timestamps? TIMESTAMP or TIMESTAMPTZ?” · checks: UTC storage, convert at the edge, session zones</summary>

**Model answer (about 60 s):** Store instants in UTC: either `TIMESTAMPTZ`, or `TIMESTAMP` with a `_utc` convention where the platform cannot store zones (Fabric Warehouse). Compute in UTC, convert to local once at the edge with an IANA zone name, and pin every session to UTC, because `TIMESTAMPTZ` to `DATE` uses the session zone. Future local appointments are the exception: store local time plus zone.

**Likely follow-up:** “What about daylight saving?” → Local days are 23 or 25 hours twice a year; filter by UTC bounds of the local day and test both DST days. Local-to-UTC can be nonexistent or ambiguous.

</details>

<details><summary>“Count orders per local day efficiently on a huge table partitioned by UTC date.” · checks: convert boundaries, not rows</summary>

**Model answer (about 60 s):** Convert the boundaries, not the column: compute each local day’s UTC start and end once (a calendar table holds them), and filter with `placed_at_utc >= utc_start AND placed_at_utc < utc_end`. The stored column stays untouched, so the engine can prune partitions; one local day touches two UTC dates. Converting every row first works but prevents pruning.

**Likely follow-up:** “And by each customer’s own time zone?” → Join the customer’s IANA zone and convert per row with `AT TIME ZONE` on a column; pruning then needs a widened UTC range (±14 hours).

</details>

<details><summary>“How do you build a calendar table in dbt?” · checks: dbt_utils.date_spine and what to add</summary>

**Model answer (about 60 s):** With `dbt_utils.date_spine`, day grain, a start date and an end date (exclusive), materialised as a table. On top I add week start, ISO week and year, month start, flags, fiscal periods, and the business time zone’s day bounds. I test it with `unique`, `not_null`, and a gap test such as `dbt_utils.sequential_values`, and register it as the semantic layer’s time spine.

**Likely follow-up:** “Why not a recursive CTE?” → It works, but date_spine compiles to portable SQL for every adapter, and recursion limits differ between engines.

</details>

> **On the job:** In a live round, the definition is half the score. Before writing SQL, say the period, the time zone, the spine bounds, the window, and the observation limit. Interviewers often stop you after that and move to the follow-up, because that is what they were checking.

> **The main idea:** every time question is a definition question first: state the period, zone, bounds, window, and censoring, then write the SQL in small testable steps.

---

<a id="slide-22"></a>
## 22. Exercises 1–5 · spines, time zones, period over period

*Exercises · warm-ups and first interview tasks*

Exercises use `leafy_time.duckdb` (lesson 3; rebuild it with `make_leafy_time.py` from the lab folder). Each solution opens it with the session time zone set to UTC and (re)creates the `chicago()` macro from lesson 4; exercises 8 and 9 also use the views from lessons 13–15, and exercise 10 uses the lab. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · A Monday-week spine

Return one row per Leafy week (ISO, Monday start) from the week that contains Sunday 1 February 2026 up to and including the week of Monday 2 March 2026, with `week_start` and `week_end` (the Sunday). Pattern: date spine. Target time: about 5 minutes. Expected output:

Result (6 rows):

| week_start | week_end |
|---|---|
| 2026-01-26 | 2026-02-01 |
| 2026-02-02 | 2026-02-08 |
| 2026-02-09 | 2026-02-15 |
| 2026-02-16 | 2026-02-22 |
| 2026-02-23 | 2026-03-01 |
| 2026-03-02 | 2026-03-08 |

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Predict the output: one instant, two sessions

Predict both columns for each session before running anything. Pattern: TIMESTAMPTZ and the session time zone. Target time: about 5 minutes.

```sql
-- run once with SET TimeZone = 'UTC', once with SET TimeZone = 'America/Chicago'
SELECT ts::DATE AS day, date_trunc('month', ts)::DATE AS month
FROM (SELECT TIMESTAMPTZ '2026-03-01 04:30:00+00' AS ts);
```

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Orders per Chicago day without converting the column

For 7, 8 and 9 March 2026 (Chicago days), return the day, its length in hours, and its number of orders. Do not apply any function to `orders.placed_at_utc`: compute each day’s UTC bounds instead. Pattern: local day boundaries, DST. Target time: about 8 minutes. Expected output:

Result (3 rows):

| day | hours | orders |
|---|---|---|
| 2026-03-07 | 24 | 1 |
| 2026-03-08 | 23 | 1 |
| 2026-03-09 | 24 | 1 |

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Find and fix: the +247 % week

A dashboard shows pots revenue jumping 247 % in the week of 16 February. Here is its query and its real output. Find **three** problems and fix them. Pattern: week-over-week with missing weeks. Target time: about 10 minutes.

*SQL · as found*

```sql
WITH weekly AS (
    SELECT date_trunc('week', chicago(placed_at_utc))::DATE AS week_start, sum(amount) AS revenue
    FROM orders WHERE category = 'pots' GROUP BY ALL
)
SELECT week_start, revenue,
       round(100.0 * (revenue - LAG(revenue) OVER (ORDER BY week_start))
             / LAG(revenue) OVER (ORDER BY week_start), 1) AS wow_pct
FROM weekly
WHERE week_start BETWEEN DATE '2026-01-05' AND DATE '2026-03-02'
ORDER BY week_start;
```

Result (7 rows):

| week_start | revenue | wow_pct |
|---|---|---|
| 2026-01-05 | 19.00 | NULL |
| 2026-01-19 | 24.00 | 26.3 |
| 2026-01-26 | 31.00 | 29.2 |
| 2026-02-02 | 19.00 | -38.7 |
| 2026-02-16 | 66.00 | 247.4 |
| 2026-02-23 | 43.00 | -34.8 |
| 2026-03-02 | 38.00 | -11.6 |

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · A true 7-day rolling average

Return the 7-day rolling average of daily revenue (Chicago days, all categories) for each day from 1 to 14 March 2026. Days without orders count as 0, and the first days of March must include late-February days in their window. Pattern: rolling window over gaps. Target time: about 10 minutes. Expected output (first and last rows checked in the solution):

Result (14 rows):

| day | revenue | revenue_7d_avg |
|---|---|---|
| 2026-03-01 | 12.00 | 31.29 |
| 2026-03-02 | 37.00 | 32 |
| 2026-03-03 | 18.00 | 23.14 |
| 2026-03-04 | 32.00 | 26 |
| 2026-03-05 | 0.00 | 26 |
| 2026-03-06 | 95.00 | 32.29 |
| 2026-03-07 | 18.00 | 30.29 |
| 2026-03-08 | 19.00 | 31.29 |
| 2026-03-09 | 12.00 | 27.71 |
| 2026-03-10 | 0.00 | 25.14 |
| 2026-03-11 | 18.00 | 23.14 |
| 2026-03-12 | 24.00 | 26.57 |
| 2026-03-13 | 0.00 | 13 |
| 2026-03-14 | 45.00 | 16.86 |

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

> **The main idea:** spine first, zone explicit, frames on dense data: most time-series answers are these three moves in the right order.

---

<a id="slide-23"></a>
## 23. Exercises 6–10 · cohorts, funnels, and a take-home

*Exercises · interview-level and stretch*

Exercises use `leafy_time.duckdb` (lesson 3; rebuild it with `make_leafy_time.py` from the lab folder). Each solution opens it with the session time zone set to UTC and (re)creates the `chicago()` macro from lesson 4; exercises 8 and 9 also use the views from lessons 13–15, and exercise 10 uses the lab. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 6 · Repeat-purchase cohorts from the orders table

Build a monthly **repeat-purchase** matrix: cohort = Chicago month of a customer’s first order; cell = % of the cohort that placed an order in month 1, 2, 3 after it. Use only `orders`. Cohorts from January to May; cells after May are not observed yet and must be `NULL`. Pattern: cohort matrix with censoring. Target time: about 15 minutes. Expected output:

Result (5 rows):

| cohort_month | customers | m1 | m2 | m3 |
|---|---|---|---|---|
| 2026-01-01 | 26 | 19.2 | 11.5 | 3.8 |
| 2026-02-01 | 29 | 6.9 | 17.2 | 17.2 |
| 2026-03-01 | 24 | 8.3 | 8.3 | NULL |
| 2026-04-01 | 32 | 28.1 | NULL | NULL |
| 2026-05-01 | 48 | NULL | NULL | NULL |

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · The April funnel, checked against Python

Users whose first product view in **April** (Chicago time) starts the funnel. Count how many then added to cart and purchased, in that order, within 7 days (168 hours) of that first view. Ties count; duplicates and anonymous events do not. Pattern: ordered funnel with a conversion window. Target time: about 15 minutes. Expected output:

Result (1 row):

| viewed | carted | purchased | overall |
|---|---|---|---|
| 137 | 58 | 30 | 0.219 |

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Find the bug: more buyers than the product tool

This May funnel looks careful (an entry, steps after the entry, “within 7 days”, buyers must have carted) but reports more purchasers than lesson 15’s 34. Find the two bugs, name a planted user it wrongly counts, and fix it. Pattern: funnel window and order. Target time: about 10 minutes.

*SQL · as found*

```sql
WITH ev AS (
    SELECT DISTINCT event_id, user_id, event_name, event_at_utc FROM events WHERE user_id IS NOT NULL
), entry AS (
    SELECT user_id, min(event_at_utc) AS t1 FROM ev
    WHERE event_name = 'view_product'
      AND chicago(event_at_utc) >= TIMESTAMP '2026-05-01' AND chicago(event_at_utc) < TIMESTAMP '2026-06-01'
    GROUP BY user_id
), flags AS (
    SELECT n.user_id,
           bool_or(e.event_name = 'add_to_cart') AS carted,
           bool_or(e.event_name = 'purchase')    AS purchased
    FROM entry AS n JOIN ev AS e USING (user_id)
    WHERE e.event_at_utc >= n.t1
      AND date_diff('day', n.t1::DATE, e.event_at_utc::DATE) <= 7     -- "within 7 days"
    GROUP BY n.user_id
)
SELECT count(*) AS viewed,
       count(*) FILTER (WHERE carted) AS carted,
       count(*) FILTER (WHERE carted AND purchased) AS purchased
FROM flags;
```

Result (1 row):

| viewed | carted | purchased |
|---|---|---|
| 156 | 69 | 36 |

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Explain the trade-off: which month-2 retention goes in the board deck?

Product wants to show “month-2 retention improved from the January cohort to the March cohort”. Compute bounded and unbounded month-2 retention for both cohorts (data observed to the end of May), then decide which definition is fair for that comparison and why. Pattern: bounded vs unbounded, censoring. Target time: about 10 minutes, mostly talking.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Take-home: extend the lab with unbounded retention

In the lab (slides 18–19), add a view `unbounded_m1`: per complete cohort, the % of users active in month 1 *or any later observed month* (still censored after March). First compute the answer by hand from the lab README’s table, then write the SQL and a test. Pattern: take-home cohort extension. Target time: about 20 minutes. Expected (by hand): January 75.0, February 33.3, March NULL.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** cohorts and funnels are definitions first: dedupe, anchor, order, window, and observation limit, each one stated and tested.

---

<a id="slide-24"></a>
## 24. Cheat sheet

*Reference · the deck on one page*

| Task | DuckDB | Remember |
|---|---|---|
| Day spine, end included | `generate_series(DATE '2026-01-01', DATE '2026-06-16', INTERVAL 1 DAY)` | Returns TIMESTAMP: cast to DATE |
| Day spine, end excluded | `range(start, end, INTERVAL 1 DAY)` | Like Python’s `range` |
| Spine from columns | `unnest(generate_series(lo, hi, INTERVAL 1 DAY))` | Scalar form returns a list |
| Spine in dbt | `dbt_utils.date_spine("day", start, end)` | End exclusive; cast `date_day` |
| Week start (Monday) | `date_trunc('week', d)` | Group ISO weeks by `isoyear` |
| Dense panel | `spine CROSS JOIN entities LEFT JOIN facts` | Entities from a dimension |
| Fill gaps | `coalesce(sum_measure, 0)` | Ratios stay NULL; missing loads stay NULL |
| Previous period | `LAG(x) OVER (ORDER BY period)` on a filled spine | Or join on `period − 1` |
| Growth | `(x − prev) / NULLIF(prev, 0)` | Growth from 0 is undefined |
| Rolling 7 days | `avg(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` | Only on a filled spine |
| UTC → local wall clock | `(ts_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'` | IANA name, never “CST” or −6 |
| Local midnight → UTC | `(d AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC'` | Store as `utc_start`/`utc_end` |
| One local day | `ts >= utc_start AND ts < utc_end` | Half-open; 23/25-hour DST days |
| Pin the session | `SET TimeZone = 'UTC'` | TIMESTAMPTZ casts use the session zone |
| User’s own zone | `(ts AT TIME ZONE 'UTC') AT TIME ZONE u.home_tz` | Behaviour: user zone; finance: business zone |
| Cohort age | `date_diff('month', cohort_month, activity_month)` | Counts month boundaries |
| Cohort grid | `cohorts CROSS JOIN range(0, n)` + `CASE WHEN observed` | Censored = NULL, never 0 |
| Pivot | `PIVOT … ON age USING first(pct)` or `max(pct) FILTER (WHERE k = 1)` | Store long, pivot last |
| Funnel step | `min(ts) … ts >= prev_step AND ts <= t1 + INTERVAL 7 DAY` | Order, ties, window, maturity |

#### Dialect cheat sheet

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL | `generate_series` (inclusive); `AT TIME ZONE` as in DuckDB; `timestamptz` uses the session `TimeZone`. |
| SQL Server / Fabric Warehouse | `GENERATE_SERIES` (integers, SQL Server 2022+) + `DATEADD`; `AT TIME ZONE 'Central Standard Time'` (Windows names); `DATETRUNC` (2022+); no `RANGE` with intervals. |
| Spark SQL | `explode(sequence(start, end, INTERVAL 1 DAY))`; `from_utc_timestamp(ts, 'America/Chicago')`; `spark.sql.session.timeZone`. |
| Snowflake | `GENERATOR` + `ROW_NUMBER()` + `DATEADD`; `CONVERT_TIMEZONE('UTC', 'America/Chicago', ts)`; NTZ/LTZ/TZ types. |
| BigQuery | `UNNEST(GENERATE_DATE_ARRAY(a, b))`; `DATE(ts, 'America/Chicago')`; `TIMESTAMP` = instant, `DATETIME` = wall clock. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **The main idea:** spine, zone, frame, censor, order: five habits that make time-based SQL correct.

---

<a id="slide-25"></a>
## 25. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Ambiguous local time | A local wall-clock time that happens twice, when clocks go back (01:30 on 1 November in Chicago). |
| Bounded retention | Share of a cohort active *in* period N. |
| Calendar table | A date dimension: one row per day with week, month, ISO, fiscal, and time-zone attributes, built once. |
| Censored cell (right-censoring) | A cohort cell whose period has not finished or not happened yet; shown as NULL. |
| Cohort | A group of users who started in the same period (here: the month of their first event). |
| Cohort age (month_number) | Whole periods between the cohort period and the activity period. |
| Cohort matrix | Cohorts as rows, ages as columns, retention in the cells; observed cells form a triangle. |
| Conversion window | The time allowed to complete a funnel, measured from the entry event. |
| Convert at the edge | Keep storage and computation in UTC; convert to local time once, in the final model or presentation layer. |
| Date spine | A table with exactly one row per period between two bounds, used on the left of a LEFT JOIN. |
| Dense panel | One row per period per entity (day × category), built with CROSS JOIN; the opposite of a sparse table. |
| Entry event | The first step of a funnel, which anchors the window. |
| Frame (ROWS / RANGE) | The rows a window function uses: ROWS counts rows, RANGE uses the ORDER BY value (for example the last 6 days). |
| Local day boundary | Local midnight expressed as a UTC instant; one local day is `[utc_start, utc_end)`. |
| Macro (DuckDB) | A named, reusable SQL expression, like an inline function. |
| Maturity | An entry or cohort is mature when its whole outcome window lies before the data load. |
| Nonexistent local time | A local wall-clock time skipped when clocks go forward (02:30 on 8 March in Chicago). |
| Ordered funnel | A funnel in which each step must happen at or after the previous one. |
| Session time zone | The connection setting (`SET TimeZone`) that decides how TIMESTAMPTZ values are displayed, truncated, and cast. |
| Set-returning function | A function that returns many rows, such as `generate_series` or `range`. |
| TIMESTAMP | A wall-clock date and time with no zone; its meaning (here UTC) is a convention. |
| TIMESTAMPTZ | An absolute instant, stored as UTC and shown in the session time zone. |
| Time spine (MetricFlow) | The calendar model the dbt Semantic Layer uses to fill periods and compute cumulative metrics. |
| Unbounded retention | Share of a cohort active in period N or any later observed period. |

---

<a id="slide-26"></a>
## 26. Recap and practice plan

*Reference · what to remember*

1. A **date spine** comes from the reporting calendar, not from the data: `generate_series`/`range` in SQL, `dbt_utils.date_spine` (end exclusive) in dbt.
2. A **calendar table** built once carries week, ISO, month, and each local day’s **UTC bounds** and **hours**.
3. **Dense panels** (spine × entities) fill additive measures with 0; ratios, unobserved, and unloaded periods stay NULL.
4. **LAG counts rows**: fill periods first, or join the previous period by key; exclude incomplete periods.
5. On gappy data, **ROWS** picks the wrong days and **AVG over RANGE** the wrong denominator: densify first.
6. **TIMESTAMPTZ** casts use the session zone: store UTC, pin sessions to UTC, convert once at the edge with an IANA name.
7. Filter local days by their **UTC bounds**; DST days have 23 and 25 hours; local → UTC can be nonexistent or ambiguous.
8. **Cohorts from raw events**: dedupe to user × month, first month, age, distinct users; a grid with censored cells as NULL; bounded vs unbounded.
9. **Funnels**: entry, ordered steps, window from the entry, ties, attempts, and maturity, all stated in the spec.

#### Practice plan

1. Day 1: lessons 4–9 and exercises 1, 4, 5.
2. Day 2: lessons 10–12 and exercises 2, 3; test a DST day in a model of your own.
3. Day 3: lessons 13–17 and exercises 6–9; say the interview answers aloud.
4. Day 4: the lab, then exercise 10; then apply the same models to Fuel Smart reviews.

#### Where to go next

- *Business models and metrics* and *Metric design*: put these queries behind metric spec cards.
- The dbt decks: turn the calendar, cohort, and funnel queries into tested models.
- *Diagnosing metric changes*: when a time series moves, how to find out why.

> **The main idea:** every time-based number needs complete periods, one explicit midnight, and an honest observation limit; the techniques in this deck provide all three.

---

<a id="slide-27"></a>
## 27. References and how this deck was tested

*References · official documentation and what to read there*

| Source | What to read there |
|---|---|
| [DuckDB: list functions](https://duckdb.org/docs/stable/sql/functions/list) | `range` and `generate_series`: inclusive and exclusive ends, table and scalar forms. |
| [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [date parts](https://duckdb.org/docs/stable/sql/functions/datepart) | `date_trunc`, `date_diff`, `isodow`, `weekofyear`, `last_day`. |
| [DuckDB: timestamp types](https://duckdb.org/docs/stable/sql/data_types/timestamp), [time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz) | TIMESTAMP vs TIMESTAMPTZ, ICU time zones, `AT TIME ZONE`, the `TimeZone` setting. |
| [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions) | Frames: `ROWS`, `RANGE` with intervals, `QUALIFY`. |
| [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [FILTER](https://duckdb.org/docs/stable/sql/query_syntax/filter) | Pivoting the long cohort table; conditional aggregates. |
| [dbt_utils README](https://github.com/dbt-labs/dbt-utils), [MetricFlow time spine](https://docs.getdbt.com/docs/build/metricflow-time-spine) | `date_spine` arguments; `sequential_values`; the semantic layer’s time spine. |
| [PostgreSQL: generate_series](https://www.postgresql.org/docs/current/functions-srf.html), [AT TIME ZONE](https://www.postgresql.org/docs/current/functions-datetime.html) | The reference behaviour DuckDB follows. |
| [T-SQL: GENERATE_SERIES](https://learn.microsoft.com/en-us/sql/t-sql/functions/generate-series-transact-sql), [AT TIME ZONE](https://learn.microsoft.com/en-us/sql/t-sql/queries/at-time-zone-transact-sql), [Fabric T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area) | SQL Server and Fabric Warehouse equivalents and limits. |
| [Spark SQL functions](https://spark.apache.org/docs/latest/api/sql/index.html), [Snowflake GENERATOR](https://docs.snowflake.com/en/sql-reference/functions/generator), [BigQuery arrays](https://cloud.google.com/bigquery/docs/reference/standard-sql/array_functions) | `sequence`/`explode`, `GENERATOR`, `GENERATE_DATE_ARRAY`. |
| [IANA time zone database](https://www.iana.org/time-zones), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html), [datetime fold](https://docs.python.org/3/library/datetime.html) | Zone names and rules; how Python resolves ambiguous times. |
| [Mixpanel: retention](https://docs.mixpanel.com/docs/reports/retention), [funnels](https://docs.mixpanel.com/docs/reports/funnels/funnels-overview), [censoring](https://en.wikipedia.org/wiki/Censoring_%28statistics%29) | How product tools define retention and funnel windows; the statistics term. |
| [DataLemur: active user retention](https://datalemur.com/questions/user-retention) | Further practice for the month-over-month retention pattern. |

| How this deck was tested | Detail |
|---|---|
| Engines | DuckDB 1.5.6 (Python package), CPython 3.12.10, pandas 3.0.6; dbt-core 1.12.5 with dbt-duckdb 1.11.0 and dbt_utils 1.4.1; pytest for the lab. Windows 11 (64-bit). |
| Executed | Every DuckDB query, every Python block, the dbt commands, the lab runner, and the lab tests ran during the build; the build fails on any error or unexpected result. |
| Not executed | PostgreSQL, T-SQL / Fabric Warehouse, Spark SQL, Snowflake, and BigQuery syntax in the dialect notes (no server, Java, or cloud account on the build machine). |
| Data | Synthetic and deterministic: `make_leafy_time.py` (seeded) for lessons and exercises; a hand-written 27-row fixture for the lab. |
| Interview research | October 2026: public question banks and interview guides (DataLemur, StrataScratch, LeetCode database problems, funnel and cohort interview write-ups). Questions in this deck are original. |

> **The main idea:** official documentation for every function used, plus a record of exactly what ran and what is reference only.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · A Monday-week spine

Find the Monday of the week that contains the start date first (`date_trunc`), then step by 7 days. Is the end of `generate_series` inclusive?

<a id="hint-2"></a>
### Hint 2 · Predict the output: one instant, two sessions

What is 04:30 UTC on 1 March in Chicago, and which offset applies on that date (before or after 8 March)?

<a id="hint-3"></a>
### Hint 3 · Orders per Chicago day without converting the column

Local midnight → UTC is `(local_ts AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC'`. Use a half-open range.

<a id="hint-4"></a>
### Hint 4 · Find and fix: the +247 % week

Count the rows: how many weeks are there between 5 January and 2 March? Which week does the first row compare with? What happens after a week with zero revenue?

<a id="hint-5"></a>
### Hint 5 · A true 7-day rolling average

Spine first, starting 6 days before 1 March; then a `ROWS` frame; filter the visible days after the window has run.

<a id="hint-6"></a>
### Hint 6 · Repeat-purchase cohorts from the orders table

Same three steps as lesson 13 (dedupe to customer × month, first month, age), then a cohort × age grid with an observation limit. Pivot with `max(…) FILTER (WHERE k = …)`.

<a id="hint-7"></a>
### Hint 7 · The April funnel, checked against Python

Entry, then step 2 as the first cart in `[t1, t1 + 7 days]`, then step 3 as the first purchase in `[t2, t1 + 7 days]`. Every comparison stays in UTC; only the April filter is local.

<a id="hint-8"></a>
### Hint 8 · Find the bug: more buyers than the product tool

What does `date_diff('day', …)` on two dates measure, compared with 168 hours? Is the purchase ever compared with the cart?

<a id="hint-9"></a>
### Hint 9 · Explain the trade-off: which month-2 retention goes in the board deck?

How many months after month 2 can you observe for each cohort? What does that do to “month 2 or later”?

<a id="hint-10"></a>
### Hint 10 · Take-home: extend the lab with unbounded retention

January: who is active in February *or* March? March: is any month after March observed?

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · A Monday-week spine

```python
weeks = q("""SELECT d::DATE AS week_start, (d + INTERVAL 6 DAY)::DATE AS week_end
FROM generate_series(date_trunc('week', DATE '2026-02-01'), DATE '2026-03-02', INTERVAL 7 DAY) AS t(d)
ORDER BY week_start""")
for start, end in weeks:
    print(start, "to", end)

from datetime import date
assert len(weeks) == 6
assert weeks[0][0] == date(2026, 1, 26) and weeks[-1][0] == date(2026, 3, 2)
assert all(start.isoweekday() == 1 and end.isoweekday() == 7 for start, end in weeks)
```

Output:

```text
2026-01-26 to 2026-02-01
2026-02-02 to 2026-02-08
2026-02-09 to 2026-02-15
2026-02-16 to 2026-02-22
2026-02-23 to 2026-03-01
2026-03-02 to 2026-03-08
```

`date_trunc('week', …)` returns the ISO Monday, so the spine lines up with `date_trunc('week', order_ts)` on the fact side; `generate_series` includes its end, so the week of 2 March is in. **Common wrong answer:** starting the series at 1 February itself, which produces Sunday-to-Saturday “weeks” that never match the weekly aggregate in a join. **Interviewer follow-up:** “Weeks start on Sunday.” Shift by a day: `date_trunc('week', d + INTERVAL 1 DAY) - INTERVAL 1 DAY`, and do the same on the fact side; in dbt, `dbt_utils.date_spine(datepart="week", …)`.

<a id="solution-2"></a>
### Solution 2 · Predict the output: one instant, two sessions

```python
import duckdb
from datetime import date

out = {}
for zone in ["UTC", "America/Chicago"]:
    c = duckdb.connect()
    c.execute(f"SET TimeZone = '{zone}'")
    out[zone] = c.sql("""SELECT ts::DATE AS day, date_trunc('month', ts)::DATE AS month
                         FROM (SELECT TIMESTAMPTZ '2026-03-01 04:30:00+00' AS ts)""").fetchone()
    print(f"{zone:<16}", out[zone])

assert out["UTC"] == (date(2026, 3, 1), date(2026, 3, 1))
assert out["America/Chicago"] == (date(2026, 2, 28), date(2026, 2, 1))
```

Output:

```text
UTC              (datetime.date(2026, 3, 1), datetime.date(2026, 3, 1))
America/Chicago  (datetime.date(2026, 2, 28), datetime.date(2026, 2, 1))
```

04:30 UTC on 1 March is 22:30 on 28 February in Chicago (still CST, UTC−6), so in a Chicago session the instant belongs to February: day *and* month change. **Common wrong answer:** “the value says +00, so it stays 1 March.” A `TIMESTAMPTZ` does not remember the offset you typed; it is an instant, and every cast uses the session zone. **Interviewer follow-up:** “Make it return the same answer everywhere.” Convert explicitly: `(ts AT TIME ZONE 'America/Chicago')::DATE`, and pin the session to UTC in every tool.

<a id="solution-3"></a>
### Solution 3 · Orders per Chicago day without converting the column

```python
rows = q("""WITH days AS (
    SELECT d::DATE AS day,
           (d AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC'                  AS lo,
           ((d + INTERVAL 1 DAY) AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC' AS hi
    FROM generate_series(DATE '2026-03-07', DATE '2026-03-09', INTERVAL 1 DAY) AS t(d)
)
SELECT day, date_diff('hour', lo, hi) AS hours, count(o.order_id) AS orders
FROM days
LEFT JOIN orders AS o ON o.placed_at_utc >= lo AND o.placed_at_utc < hi
GROUP BY day, lo, hi
ORDER BY day""")
for r in rows:
    print(r)

by_conversion = dict(q("SELECT chicago(placed_at_utc)::DATE, count(*) FROM orders GROUP BY 1"))
assert [hours for _, hours, _ in rows] == [24, 23, 24]
assert all(orders == by_conversion.get(day, 0) for day, _, orders in rows)
```

Output:

```text
(datetime.date(2026, 3, 7), 24, 1)
(datetime.date(2026, 3, 8), 23, 1)
(datetime.date(2026, 3, 9), 24, 1)
```

The bounds are computed once per day and the stored column is compared with them, so a warehouse can prune by the UTC column. 8 March is 23 hours long. The assertion checks the result against the row-by-row conversion. **Common wrong answer:** `WHERE placed_at_utc::DATE = '2026-03-08'`, a UTC day that is 18:00 on 7 March to 18:00 on 8 March in Chicago. **Interviewer follow-up:** “Now for a whole year, fast.” Precompute `utc_start`/`utc_end` in the calendar table (lesson 5) and range-join.

<a id="solution-4"></a>
### Solution 4 · Find and fix: the +247 % week

```python
fixed = q("""WITH weeks AS (
    SELECT d::DATE AS week_start
    FROM generate_series(DATE '2025-12-29', DATE '2026-03-02', INTERVAL 7 DAY) AS t(d)
), weekly AS (
    SELECT date_trunc('week', chicago(placed_at_utc))::DATE AS week_start, sum(amount) AS revenue
    FROM orders WHERE category = 'pots' GROUP BY ALL
), filled AS (
    SELECT week_start, coalesce(weekly.revenue, 0) AS revenue
    FROM weeks LEFT JOIN weekly USING (week_start)
)
SELECT week_start, revenue,
       LAG(revenue) OVER w AS prev_revenue,
       round(100.0 * (revenue - LAG(revenue) OVER w) / NULLIF(LAG(revenue) OVER w, 0), 1) AS wow_pct
FROM filled
WINDOW w AS (ORDER BY week_start)
QUALIFY week_start >= DATE '2026-01-05'
ORDER BY week_start""")
for r in fixed:
    print(r)

from datetime import date
weeks = [r[0] for r in fixed]
assert len(fixed) == 9 and weeks[0] == date(2026, 1, 5)
assert all((b - a).days == 7 for a, b in zip(weeks, weeks[1:]))        # no week skipped
row = {r[0]: r for r in fixed}
assert row[date(2026, 2, 9)][1] == 0 and row[date(2026, 2, 16)][3] is None   # growth from 0 is undefined
assert row[date(2026, 1, 5)][2] == 28                                   # compared with the week of 29 Dec
```

Output:

```text
(datetime.date(2026, 1, 5), Decimal('19.00'), Decimal('28.00'), -32.1)
(datetime.date(2026, 1, 12), Decimal('0.00'), Decimal('19.00'), -100.0)
(datetime.date(2026, 1, 19), Decimal('24.00'), Decimal('0.00'), None)
(datetime.date(2026, 1, 26), Decimal('31.00'), Decimal('24.00'), 29.2)
(datetime.date(2026, 2, 2), Decimal('19.00'), Decimal('31.00'), -38.7)
(datetime.date(2026, 2, 9), Decimal('0.00'), Decimal('19.00'), -100.0)
(datetime.date(2026, 2, 16), Decimal('66.00'), Decimal('0.00'), None)
(datetime.date(2026, 2, 23), Decimal('43.00'), Decimal('66.00'), -34.8)
(datetime.date(2026, 3, 2), Decimal('38.00'), Decimal('43.00'), -11.6)
```

(1) **Missing weeks** (12 January, 9 February) have no rows, so `LAG` compares 16 February with 2 February. (2) **Division by zero** is waiting: once weeks are filled, the previous week can be 0, so `NULLIF` is needed. (3) **`WHERE` runs before the window**, so the first visible week (5 January) has no previous value; use `QUALIFY` (or filter in an outer query) and start the spine one week earlier. **Common wrong answer:** fixing only the `NULLIF`; the comparison is still with the wrong week. **Interviewer follow-up:** “Show it per category.” Cross-join the weeks with the category list, then `PARTITION BY category`.

<a id="solution-5"></a>
### Solution 5 · A true 7-day rolling average

```python
import pandas as pd
rows = q("""WITH daily AS (
    SELECT chicago(placed_at_utc)::DATE AS day, sum(amount) AS revenue
    FROM orders GROUP BY ALL
), spine AS (
    SELECT d::DATE AS day
    FROM generate_series(DATE '2026-02-23', DATE '2026-03-14', INTERVAL 1 DAY) AS t(d)
)
SELECT s.day, coalesce(d.revenue, 0) AS revenue,
       round(avg(coalesce(d.revenue, 0)) OVER (ORDER BY s.day
             ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS revenue_7d_avg
FROM spine AS s LEFT JOIN daily AS d USING (day)
QUALIFY s.day >= DATE '2026-03-01'
ORDER BY s.day""")
print(rows[0], rows[-1], sep="\n")

# independent check: pandas over a complete daily index
orders = con.sql("SELECT chicago(placed_at_utc)::DATE AS day, amount FROM orders").df()
daily = orders.groupby("day")["amount"].sum().astype(float)
daily.index = pd.to_datetime(daily.index)
full = daily.reindex(pd.date_range("2026-02-23", "2026-03-14", freq="D"), fill_value=0.0)
expected = full.rolling(7).mean().loc["2026-03-01":].round(2).tolist()
assert [float(r[2]) for r in rows] == expected
```

Output:

```text
(datetime.date(2026, 3, 1), Decimal('12.00'), 31.29)
(datetime.date(2026, 3, 14), Decimal('45.00'), 16.86)
```

The spine makes every day a row, so `ROWS BETWEEN 6 PRECEDING` is exactly 7 calendar days and the denominator is 7. Starting the spine on 23 February gives 1 March a full window. pandas over a reindexed daily series gives the same numbers. **Common wrong answer:** `AVG … RANGE BETWEEN INTERVAL 6 DAYS PRECEDING` on the sparse daily table: right days, wrong denominator (lesson 9). **Interviewer follow-up:** “The table has 2 billion rows.” Aggregate to days first (a few hundred rows), then densify and window; never window the raw facts.

<a id="solution-6"></a>
### Solution 6 · Repeat-purchase cohorts from the orders table

```python
from collections import defaultdict
from datetime import date

rows = q("""WITH buyer_months AS (                  -- one row per customer per month with an order
    SELECT DISTINCT user_id, date_trunc('month', chicago(placed_at_utc))::DATE AS m
    FROM orders
), cohorts AS (
    SELECT user_id, min(m) AS cohort_month FROM buyer_months GROUP BY user_id
), sizes AS (
    SELECT cohort_month, count(*) AS customers FROM cohorts
    WHERE cohort_month <= DATE '2026-05-01' GROUP BY ALL
), cells AS (
    SELECT s.cohort_month, s.customers, n.k,
           CASE WHEN s.cohort_month + to_months(n.k) <= DATE '2026-05-01' THEN
                (SELECT count(*) FROM cohorts AS c JOIN buyer_months AS b USING (user_id)
                 WHERE c.cohort_month = s.cohort_month AND b.m = s.cohort_month + to_months(n.k))
           END AS buyers
    FROM sizes AS s CROSS JOIN range(0, 4) AS n(k)
)
SELECT cohort_month, customers,
       max(round(100.0 * buyers / customers, 1)) FILTER (WHERE k = 1) AS m1,
       max(round(100.0 * buyers / customers, 1)) FILTER (WHERE k = 2) AS m2,
       max(round(100.0 * buyers / customers, 1)) FILTER (WHERE k = 3) AS m3
FROM cells
GROUP BY cohort_month, customers
ORDER BY cohort_month""")
for r in rows:
    print(r)

# independent check in plain Python
months = defaultdict(set)
for user, m in q("SELECT user_id, date_trunc('month', chicago(placed_at_utc))::DATE FROM orders"):
    months[user].add(m)
cohort = {u: min(ms) for u, ms in months.items()}
age = lambda a, b: (b.year - a.year) * 12 + b.month - a.month
expected = []
for c in sorted(m for m in set(cohort.values()) if m <= date(2026, 5, 1)):
    members = [u for u, m in cohort.items() if m == c]
    cells = []
    for k in (1, 2, 3):
        if age(c, date(2026, 5, 1)) < k:
            cells.append(None)
        else:
            n = sum(1 for u in members if any(age(c, m) == k for m in months[u]))
            cells.append(round(100.0 * n / len(members), 1))
    expected.append((c, len(members), *cells))
assert [tuple(r) for r in rows] == expected
```

Output:

```text
(datetime.date(2026, 1, 1), 26, 19.2, 11.5, 3.8)
(datetime.date(2026, 2, 1), 29, 6.9, 17.2, 17.2)
(datetime.date(2026, 3, 1), 24, 8.3, 8.3, None)
(datetime.date(2026, 4, 1), 32, 28.1, None, None)
(datetime.date(2026, 5, 1), 48, None, None, None)
```

The grid (`CROSS JOIN range(0, 4)`) guarantees a cell exists even when no customer came back, and the `CASE` masks unobserved months, so May’s month 1 is `NULL`, not 0 %. Repeat-purchase rates are much lower than visit retention: buying again is a stronger signal than coming back. **Common wrong answer:** pivoting `cohort_long` directly, so a zero cell and an unobserved cell both come out as NULL, or `coalesce` turns both into 0. **Interviewer follow-up:** “Use revenue instead of customers.” Sum each cohort’s revenue per age and divide by month-0 revenue: net revenue retention by cohort.

<a id="solution-7"></a>
### Solution 7 · The April funnel, checked against Python

```python
from collections import defaultdict
from datetime import timedelta

viewed, carted, purchased, overall = q("""WITH ev AS (
    SELECT DISTINCT event_id, user_id, event_name, event_at_utc FROM events WHERE user_id IS NOT NULL
), entry AS (
    SELECT user_id, min(event_at_utc) AS t1
    FROM ev
    WHERE event_name = 'view_product'
      AND chicago(event_at_utc) >= TIMESTAMP '2026-04-01'
      AND chicago(event_at_utc) <  TIMESTAMP '2026-05-01'
    GROUP BY user_id
), step2 AS (
    SELECT n.user_id, n.t1, min(e.event_at_utc) AS t2
    FROM entry AS n LEFT JOIN ev AS e
      ON e.user_id = n.user_id AND e.event_name = 'add_to_cart'
     AND e.event_at_utc >= n.t1 AND e.event_at_utc <= n.t1 + INTERVAL 7 DAY
    GROUP BY ALL
), step3 AS (
    SELECT s.user_id, s.t1, s.t2, min(e.event_at_utc) AS t3
    FROM step2 AS s LEFT JOIN ev AS e
      ON e.user_id = s.user_id AND e.event_name = 'purchase'
     AND e.event_at_utc >= s.t2 AND e.event_at_utc <= s.t1 + INTERVAL 7 DAY
    GROUP BY ALL
)
SELECT count(*) AS viewed, count(t2) AS carted, count(t3) AS purchased,
       round(count(t3) / count(*), 3) AS overall
FROM step3""")[0]
print(viewed, carted, purchased, overall)

# independent check in plain Python
events = q("""SELECT DISTINCT event_id, user_id, event_name, event_at_utc, chicago(event_at_utc)
              FROM events WHERE user_id IS NOT NULL""")
by_user = defaultdict(list)
for _, user, name, ts, local in events:
    by_user[user].append((ts, name, local))
counts = [0, 0, 0]
for evs in by_user.values():
    views = sorted(ts for ts, n, local in evs if n == "view_product" and local.month == 4)
    if not views:
        continue
    t1 = views[0]
    end = t1 + timedelta(days=7)
    t2 = min((ts for ts, n, _ in evs if n == "add_to_cart" and t1 <= ts <= end), default=None)
    t3 = t2 and min((ts for ts, n, _ in evs if n == "purchase" and t2 <= ts <= end), default=None)
    counts = [counts[0] + 1, counts[1] + (t2 is not None), counts[2] + bool(t3)]
assert [viewed, carted, purchased] == counts
```

Output:

```text
137 58 30 0.219
```

The structure is lesson 15’s, with the entry month moved; the Python version walks each user’s events with the same rules and agrees. Filtering April on `chicago(event_at_utc)` is fine for a small table; on a large one, compare the stored UTC column with the month’s UTC bounds instead (lesson 11). **Common wrong answer:** `datediff('day', view_date, purchase_date) <= 7` on dates: that allows up to 7 days and 23 hours, and ignores the cart step’s order. **Interviewer follow-up:** “Report it weekly for a trend.” Group entries by entry week on a week spine, and mask weeks whose 7-day window has not closed (lesson 16).

<a id="solution-8"></a>
### Solution 8 · Find the bug: more buyers than the product tool

```python
buggy = q("""WITH ev AS (
    SELECT DISTINCT event_id, user_id, event_name, event_at_utc FROM events WHERE user_id IS NOT NULL
), entry AS (
    SELECT user_id, min(event_at_utc) AS t1 FROM ev
    WHERE event_name = 'view_product'
      AND chicago(event_at_utc) >= TIMESTAMP '2026-05-01' AND chicago(event_at_utc) < TIMESTAMP '2026-06-01'
    GROUP BY user_id
), flags AS (
    SELECT n.user_id,
           bool_or(e.event_name = 'add_to_cart') AS carted,
           bool_or(e.event_name = 'purchase')    AS purchased
    FROM entry AS n JOIN ev AS e USING (user_id)
    WHERE e.event_at_utc >= n.t1
      AND date_diff('day', n.t1::DATE, e.event_at_utc::DATE) <= 7     -- "within 7 days"
    GROUP BY n.user_id
)
SELECT count(*) AS viewed,
       count(*) FILTER (WHERE carted) AS carted,
       count(*) FILTER (WHERE carted AND purchased) AS purchased
FROM flags""")[0]
fixed = q("SELECT count(*), count(t2), count(t3) FROM funnel_may")[0]     # lesson 15's view
print("buggy", buggy, " fixed", fixed)

extra = q("""WITH ev AS (
    SELECT DISTINCT event_id, user_id, event_name, event_at_utc FROM events WHERE user_id IS NOT NULL
), entry AS (
    SELECT user_id, min(event_at_utc) AS t1 FROM ev
    WHERE event_name = 'view_product'
      AND chicago(event_at_utc) >= TIMESTAMP '2026-05-01' AND chicago(event_at_utc) < TIMESTAMP '2026-06-01'
    GROUP BY user_id
), flags AS (
    SELECT n.user_id,
           bool_or(e.event_name = 'add_to_cart') AS carted,
           bool_or(e.event_name = 'purchase')    AS purchased
    FROM entry AS n JOIN ev AS e USING (user_id)
    WHERE e.event_at_utc >= n.t1
      AND date_diff('day', n.t1::DATE, e.event_at_utc::DATE) <= 7     -- "within 7 days"
    GROUP BY n.user_id
)
SELECT user_id FROM flags
WHERE carted AND purchased
  AND user_id NOT IN (SELECT user_id FROM funnel_may WHERE t3 IS NOT NULL)
ORDER BY user_id""")
print(len(extra), "users counted wrongly, including planted", [u for (u,) in extra if u > 900])
assert buggy[0] == fixed[0] and buggy[2] - fixed[2] == len(extra) > 0
assert (901,) in extra
```

Output:

```text
buggy (156, 69, 36)  fixed (156, 68, 34)
2 users counted wrongly, including planted [901]
```

(1) **Day difference instead of elapsed time:** `date_diff('day', …)` on dates counts calendar-day boundaries, so “≤ 7” allows up to 7 days and 23:59 hours, on UTC dates. User 901 bought 7 days and 1 hour after the view and is counted. (2) **No order between cart and purchase:** the flags only say both happened after the entry, so a purchase before the cart also counts. The fix (lesson 15) finds the first cart `t2` in `[t1, t1 + 7 days]` and requires the purchase in `[t2, t1 + 7 days]`, using an `INTERVAL` on timestamps. **Common wrong answer:** changing `<= 7` to `< 7`; that now drops purchases 6 days and 1 hour later and still ignores order. **Interviewer follow-up:** “Make it N steps.” Chain the pattern: each step is the first matching event at or after the previous step’s time, all bounded by the entry window.

<a id="solution-9"></a>
### Solution 9 · Explain the trade-off: which month-2 retention goes in the board deck?

```python
rows = q("""WITH flags AS (
    SELECT c.user_id, c.cohort_month,
           bool_or(m.activity_month =  c.cohort_month + INTERVAL 2 MONTH) AS in_m2,
           bool_or(m.activity_month >= c.cohort_month + INTERVAL 2 MONTH) AS m2_or_later
    FROM cohorts AS c JOIN user_months AS m USING (user_id)
    WHERE c.cohort_month IN (DATE '2026-01-01', DATE '2026-03-01')
      AND m.activity_month <= DATE '2026-05-01'
    GROUP BY ALL
)
SELECT cohort_month,
       round(100.0 * count(*) FILTER (WHERE in_m2) / count(*), 1)       AS bounded_m2,
       round(100.0 * count(*) FILTER (WHERE m2_or_later) / count(*), 1) AS unbounded_m2
FROM flags
GROUP BY cohort_month
ORDER BY cohort_month""")
for r in rows:
    print(r)
(jan, jan_b, jan_u), (mar, mar_b, mar_u) = rows
assert jan_u > jan_b          # January can still be seen in March, April, May
assert mar_u == mar_b         # March's month 2 is May: nothing after it is observed yet
```

Output:

```text
(datetime.date(2026, 1, 1), 30.0, 66.7)
(datetime.date(2026, 3, 1), 37.9, 37.9)
```

Only **bounded** retention is fair here. January’s unbounded number counts activity in months 2, 3 and 4; March’s can only count month 2, because nothing after May is observed. Comparing them would make January look better purely because it is older. Use bounded month-2 retention, or unbounded with a fixed horizon (“active in months 2–4”) once every cohort has that horizon. **Common wrong answer:** choosing unbounded “because it is higher and smoother”. **Interviewer follow-up:** “One number for all cohorts?” A weighted average of bounded month-2 retention over mature cohorts only (Σ retained ÷ Σ cohort size).

<a id="solution-10"></a>
### Solution 10 · Take-home: extend the lab with unbounded retention

```python
import sys
sys.path.insert(0, "sql-time-analysis-lab")
import run_lab

lab = run_lab.build()
lab.execute("""CREATE OR REPLACE VIEW unbounded_m1 AS
WITH p AS (SELECT last_complete_month AS lcm FROM lab_params),
sizes AS (SELECT cohort_month, cohort_size FROM cohort_cells WHERE month_number = 0),
later AS (                               -- users active in month 1 or any later observed month
    SELECT co.cohort_month, count(DISTINCT um.user_id) AS users
    FROM cohorts AS co JOIN user_months AS um USING (user_id), p
    WHERE um.activity_month >= co.cohort_month + INTERVAL 1 MONTH
      AND um.activity_month <= p.lcm
    GROUP BY ALL
)
SELECT s.cohort_month,
       CASE WHEN s.cohort_month + INTERVAL 1 MONTH <= (SELECT lcm FROM p)
            THEN round(100.0 * coalesce(l.users, 0) / s.cohort_size, 1) END AS unbounded_m1_pct
FROM sizes AS s LEFT JOIN later AS l USING (cohort_month);""")
rows = lab.sql("SELECT cohort_month, unbounded_m1_pct FROM unbounded_m1 ORDER BY cohort_month").fetchall()
for r in rows:
    print(r)
assert [pct for _, pct in rows] == [75.0, 33.3, None]
```

Output:

```text
(datetime.date(2026, 1, 1), 75.0)
(datetime.date(2026, 2, 1), 33.3)
(datetime.date(2026, 3, 1), None)
```

January: users 1 (Feb, Mar), 2 (Mar), and 4 (Feb) are active in month 1 or later, so 3 of 4 = 75 %, higher than the bounded 50 % because user 2 skipped February. February: only March is observable after it, so unbounded equals bounded (33.3 %). March: April is not complete, so the cell is censored. Add the assertion as a pytest test next to the others. **Common wrong answer:** forgetting the observation limit, so user 6’s April visit lifts February to 66.7 % although April is incomplete. **Interviewer follow-up:** “Make the horizon fixed.” Replace “or later” with “within months 1–2” and censor cohorts that have not had two later months yet.
