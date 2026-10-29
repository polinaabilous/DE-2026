# Diagnosing metric changes: trees, mix shift, and the weekly business review

*Companion to `metric-diagnosis.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, pandas 3.0.6 (only to load the generated data), Windows 11 (64-bit). SQL is DuckDB’s PostgreSQL-flavoured dialect. Where interviews ask, lessons add notes for SQL Server (T-SQL), Microsoft Fabric Warehouse (T-SQL), and Spark SQL; that other-dialect syntax is reference only and was not executed. Every DuckDB query in this document ran while it was built, and the result under it is the real result. The data is synthetic and deterministic: `make_leafy.py` (lesson 3, source in the last slide) rebuilds exactly the same warehouse on any machine.

**Series:** this is deck 3 of 3 on business metrics. Deck 1, *Business models and metrics*, defines the commerce, SaaS, marketplace, product, and operations metrics that move here; deck 2, *Metric design*, defines the spec-card fields, ratio rules, and metric trees this deck relies on (the metric-tree lesson is repeated here as lesson 5 so the workflow is self-contained). All three use the same Leafy warehouse and clean base.

**Prerequisites:** the SQL windows deck (window functions, `QUALIFY`), the dimensional-modelling deck (grain, facts and dimensions, additive and semi-additive measures), and “SQL correctness: joins, grain, NULLs, and aggregation” (fan-out, NULL logic, weighted ratios, `FILTER`, integer division). This deck builds on them and does not re-teach them. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common metric, product-sense and data-engineering interview patterns (research done in October 2026: “metric dropped X %” cases, mix shift and Simpson’s paradox, data validation before explanation, weekly-review write-ups). All questions are original and use the Leafy data.

**Additions beyond the original brief** are marked *(added)*: Simpson’s paradox and mix shift; the “metric dropped X%” root-cause workflow.

## Contents

1. [Diagnosing metric changes: trees, mix shift, and the weekly business review](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and dialect](#slide-2)
3. [The running example: the Leafy metrics warehouse](#slide-3)
4. [The clean base every query reads](#slide-4)
5. [Metric trees: decompose a number into its drivers](#slide-5)
6. [Simpson’s paradox and mix shift](#slide-6)
7. [“The metric dropped X %”: a root-cause workflow](#slide-7)
8. [Lab: Leafy’s weekly business review](#slide-8)
9. [Lab step 1: write the specs before the SQL](#slide-9)
10. [Lab step 2: components over the clean base](#slide-10)
11. [Lab step 3: tests that fail loudly](#slide-11)
12. [Lab step 4: the WBR table](#slide-12)
13. [Lab step 5: explain the drop with the metric tree](#slide-13)
14. [Bug clinic: believable diagnosis mistakes](#slide-14)
15. [Interview questions and model answers](#slide-15)
16. [Exercises 1–2 · investigate and extend the WBR](#slide-16)
17. [Cheat sheet](#slide-17)
18. [Glossary](#slide-18)
19. [Recap and practice plan](#slide-19)
20. [References and how this deck was tested](#slide-20)
21. [Appendix: the Leafy data generator (lab spoilers)](#slide-21)
22. [Appendix A · Hints](#appendix-a)
23. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Diagnosing metric changes: trees, mix shift, and the weekly business review

**

Every week some metric moves, and someone asks why. A good answer separates data issues from real changes, finds the driver and the segment that moved, confirms the cause with an independent source, sizes the impact, and fits in five lines. This deck teaches that workflow on the Leafy warehouse, then you run it end to end in a weekly business review.

- **Start here:** setup, the Leafy warehouse, and the clean base that applies every data policy once.
- **Part A, locate and explain:** metric trees and driver shares, Simpson’s paradox and mix shift, and the “metric dropped X %” root-cause workflow.
- **Lab, Leafy’s weekly business review:** specs, component views, tests that fail loudly, the WBR table, and a drill-down with a five-line write-up.
- **Practice:** a bug clinic, interview questions with model answers, and 2 exercises.

This is deck 3 of 3 in the business-metrics series. Deck 1, *Business models and metrics*, defines the metrics that move here; deck 2, *Metric design*, defines the spec-card fields, ratio rules, and metric trees this deck relies on. Every query ran in DuckDB while the deck was built; the result under each query is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Metrics move every week, and every move gets the same question: why? Most moves are not what they seem. Some are data issues (a late partition, a bot wave, a changed definition, an incomplete week); some are mix shifts that look like product failures; a few are real changes that need action today. Analysts and data engineers are expected to tell these apart quickly, with evidence, and to write the answer so a busy leader can act on it. This deck gives you a repeatable workflow and practises it on a realistic weekly business review.

#### Where you will use it

- Weekly and monthly business reviews: explaining what moved and why.
- Alerts on dashboards and data-quality monitors: real change or pipeline problem?
- Release and experiment follow-ups: did the launch move the metric, or the mix?
- Incident write-ups that size the impact of an outage on orders and revenue.
- Analytics interviews: the “metric dropped X %” case.

#### What goes wrong without it

- A fire drill over a drop that was an incomplete week or late mobile data.
- A product team blamed for a conversion fall that was pure mix shift.
- A bot wave celebrated as a marketing win.
- A tracking bug reported as an outage, or an outage dismissed as a tracking bug.
- A two-page analysis nobody reads, instead of five lines that lead to an action.

#### Who expects you to know it

- Data engineers and analysts: own the numbers in the weekly review.
- Data engineers: are asked first whether “the data is broken”.
- Product, growth, and operations leads: act on your explanation.
- Interviewers: “metric dropped, walk me through it” appears in most analytics loops.

> **On the job:** Monday, 09:30: net sales are down by close to a fifth week on week and the leadership review starts at 10:00. You check that the data is complete and the definitions unchanged, walk the metric tree to orders per session, see Android carrying the drop, find app 5.3 released on Monday, confirm it with checkout support tickets, size the lost orders, and post five lines with a recommendation. That is the lab at the end of this deck.

> **The main idea:** a move is a hypothesis until you have ruled out data issues, located the driver and segment, and confirmed the cause independently.

*Read more:* [SQLPad: investigating a metric drop (practice)](https://sqlpad.io/tutorial/data-analyst-case-interview-investigate-metric-drop/), [Amplitude: leading vs lagging indicators](https://amplitude.com/blog/map-your-metrics), [Simpson’s paradox](https://en.wikipedia.org/wiki/Simpson%27s_paradox).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A top-line number moved | Metric tree and driver shares (lesson 5) | Says which driver moved before you look for causes. |
| A blended rate moved | Rate vs mix split by segment (lesson 6) | Mix shifts look like product failures in a single number. |
| Any unexplained move, or an alert | The root-cause workflow (lesson 7) | Validates data first, then locates, explains, sizes, and recommends. |
| The weekly leadership review | WBR components, tests, table, drill-down (lab) | A fixed routine that is ready before the meeting. |
| A move inside normal noise | Not a full investigation | Compare with weeks of history first; don’t explain noise. |
| An A/B test result | The experiment analysis (trust checks, guardrails) | Randomisation answers “why” better than observational drill-downs. |

#### How interviews test it

- “DAU dropped 15 % last week; walk me through it” (clarify, validate data, decompose, segment).
- “Every store’s conversion improved but the total fell. How?” (Simpson’s paradox, mix).
- “How would you tell a tracking bug from a real outage?” (an independent system).
- “Summarise your findings for the CEO” (what moved, why, evidence, impact, action).

#### Where it sits in your learning path

- Uses deck 1’s metrics (*Business models and metrics*) and deck 2’s definitions, ratio rules, and metric trees (*Metric design*).
- Builds on SQL correctness (weighted ratios, `FILTER`) and window functions for the rate/mix split.
- Next in your plan: statistics essentials and experimentation, which answer “is this move real?” with confidence intervals and controlled tests.

> **The main idea:** reach for the full workflow when a move is outside normal noise and someone will act on the answer; otherwise compare with history and move on.

---

<a id="slide-2"></a>
## 2. Set up, versions, and dialect

*Start here · DuckDB from Python, one small warehouse file*

| Item | Detail |
|---|---|
| Tested engine | **DuckDB 1.5.6** (Python package) on **CPython 3.12.10**, Windows 11. pandas 3.0.6 is used only to bulk-load the generated rows. DuckDB is an embedded analytical database: it runs inside your Python process, with no server. |
| Dialect | DuckDB’s PostgreSQL-flavoured SQL. DuckDB-only conveniences (`QUALIFY`, `GROUP BY ALL`, `//`, `CREATE MACRO`) are labelled where used. |
| Other engines | Lessons add notes for **SQL Server (T-SQL)**, **Fabric Warehouse** (T-SQL, with its own limits), and **Spark SQL** (Fabric and Databricks notebooks) where they behave differently: integer division, divide-by-zero, `AT TIME ZONE`, `COUNT(DISTINCT)` in windows, percentiles. That syntax is reference only and was not executed. |
| Minimum versions | DuckDB 1.1 or newer for every query here (`FILTER`, `QUALIFY`, time zones through the bundled ICU extension). Python 3.9+ for `zoneinfo`; on Windows also install `tzdata`, because Windows ships no IANA time-zone files. |
| How results were produced | The build runs every query and prints the real result. A query that fails, returns an unexpected result, or returns several rows without `ORDER BY` is a build failure. This deck built with **0 failures**. |

#### Create the environment

```text
# Windows (PowerShell); on macOS/Linux: source .venv/bin/activate
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb pandas tzdata
python make_leafy.py          # builds leafy.duckdb (next slide)
```

#### Check it

```python
import sys, duckdb, pandas
print("Python", sys.version.split()[0])
print("DuckDB", duckdb.__version__, "· pandas", pandas.__version__)
print(duckdb.sql("SELECT 7 / 2 AS slash, 7 // 2 AS int_div").fetchall())
```

Output:

```text
Python 3.12.10
DuckDB 1.5.6 · pandas 3.0.6
[(3.5, 3)]
```

Note the first trap already: in DuckDB `/` always returns a decimal result and `//` is integer division. In SQL Server and Fabric Warehouse, `7 / 2` on integers is **3** (Metric design deck: “Zero denominators and integer division”).

> **On the job:** Metric SQL is usually written once in a warehouse (Fabric, Snowflake, Databricks, BigQuery) and read by many dashboards. DuckDB is a fast local scratchpad to prototype a definition on a sample and to unit-test edge cases before you port it.

> **The main idea:** one local engine, one deterministic data file, every result executed. Practise metric definitions the same way: small data, predicted answer, then the query.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: numeric operators (/ and //)](https://duckdb.org/docs/stable/sql/functions/numeric), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-3"></a>
## 3. The running example: the Leafy metrics warehouse

*Start here · one small warehouse, five kinds of business*

Leafy, the plant shop from the Python and dbt decks, has grown. It sells its own plants (**commerce**), runs a paid **Leafy Plus** membership (**SaaS**), lets third-party sellers list rare plants for a commission (**marketplace**), has a website and two apps (**product**), and ships parcels and answers tickets (**operations**). One script, `make_leafy.py`, generates about eight weeks of deterministic data: same seed, same rows, on every machine. Its source is the last slide of this deck; don’t read it before the lab (lessons 8–13), because it contains the answers.

Output:

```text
$ python make_leafy.py
users          1,578 rows
events       110,096 rows
sellers            7 rows
orders         2,353 rows
refunds          116 rows
shipments      2,221 rows
tickets          316 rows
listings         311 rows
plus_trials      396 rows
plus_periods     207 rows
```

#### Tables and their grain

```sql
SELECT 'events' AS table_name, 'one row per event delivery' AS grain, COUNT(*) AS row_count FROM events
UNION ALL SELECT 'users',        'one row per account',               COUNT(*) FROM users
UNION ALL SELECT 'orders',       'one row per order',                 COUNT(*) FROM orders
UNION ALL SELECT 'refunds',      'one row per refund',                COUNT(*) FROM refunds
UNION ALL SELECT 'sellers',      'one row per seller (1 = Leafy)',    COUNT(*) FROM sellers
UNION ALL SELECT 'listings',     'one row per third-party listing',   COUNT(*) FROM listings
UNION ALL SELECT 'shipments',    'one row per shipped order',         COUNT(*) FROM shipments
UNION ALL SELECT 'tickets',      'one row per support ticket',        COUNT(*) FROM tickets
UNION ALL SELECT 'plus_trials',  'one row per Leafy Plus trial',      COUNT(*) FROM plus_trials
UNION ALL SELECT 'plus_periods', 'one row per subscription plan period', COUNT(*) FROM plus_periods
ORDER BY row_count DESC;
```

Result (10 rows):

| table_name | grain | row_count |
|---|---|---|
| events | one row per event delivery | 110096 |
| orders | one row per order | 2353 |
| shipments | one row per shipped order | 2221 |
| users | one row per account | 1578 |
| plus_trials | one row per Leafy Plus trial | 396 |
| tickets | one row per support ticket | 316 |
| listings | one row per third-party listing | 311 |
| plus_periods | one row per subscription plan period | 207 |
| refunds | one row per refund | 116 |
| sellers | one row per seller (1 = Leafy) | 7 |

#### Facts you need from day one

- All timestamps are stored in **UTC**, in columns ending `_utc`. Leafy’s business days and weeks are in **America/Chicago** (Central time).
- Data starts on **Monday 26 January 2026** and was loaded on **Wednesday 25 March 2026 at 10:00 Chicago time**: the current week and month are incomplete on purpose.
- `events.received_at_utc` is when the warehouse received an event; `event_at_utc` is when it happened on the device.
- `orders` comes from the order service, not from events. Amounts are in USD: `items_amount` (list price × quantity), `discount_amount`, `shipping_amount`.
- Seller 1 is Leafy itself (**first party**); sellers 2–7 are **third-party** sellers who pay Leafy a commission.

| Trap planted in the data | Where | Handled in this deck by |
|---|---|---|
| Bots: crawler user agents, and a scraper that pretends to be a browser | `events` | the bot flag in the clean base (4); the lab’s red herring (13) |
| Leafy staff and QA test accounts that browse and place orders | `users.is_internal`, `is_test` | the `customers` view (4) |
| The same event delivered twice (same `event_id`) | `events` | de-duplication in `clean_events` (4) |
| NULL keys: anonymous visitors, tickets without an order, unknown country | `events.user_id`, `tickets.order_id`, `users.country` | signed-in DAU in the workflow (7) |
| App events that arrive hours or days late | `events.received_at_utc` | the lateness test in the lab (11) |
| A daylight-saving change (Sunday 8 March) and orders near midnight UTC | all `_utc` columns | the `local_ts` macro (4) |
| A day with zero sessions on one platform | `events` | the root-cause workflow (7) and bug clinic |
| Refunds that land weeks after the order, in a later month | `refunds` | WBR net sales before refunds (9) |
| An incomplete current period, immature trials, parcels still in transit | everywhere | complete weeks only in the lab (8, 11) |

How to choose a policy for each trap is the subject of the *Metric design* deck. Here the policies are applied once in the clean base (lesson 4), because the first step of every investigation is ruling out data issues.

> **On the job:** Real warehouses look like this: several source systems, each with its own clock, keys, and quirks. Your first week on an analytics team is usually spent learning exactly this table of traps for your company’s data, then writing it down so the next person doesn’t rediscover it.

> **The main idea:** one deterministic dataset with every common metric trap planted. The clean base handles each trap once, so a move you investigate is a real move or a known data issue, not a cleaning accident.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-4"></a>
## 4. The clean base every query reads

*Start here · one macro, seven views, and a component table, written once*

The traps listed in lesson 3 are handled once, in a thin **base layer** of views, so a number that moves in this deck moved in the data, not because two queries cleaned differently. First a DuckDB **macro** (a named, reusable SQL expression, like an inline function) converts a UTC timestamp to Leafy’s business time zone, America/Chicago, using the IANA zone name so daylight saving is handled:

#### The time-zone helper

*SQL · DuckDB macro*

```sql
CREATE OR REPLACE MACRO local_ts(ts_utc) AS
    (ts_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago';
```

```sql
SELECT TIMESTAMP '2026-03-16 03:30' AS placed_at_utc,
       local_ts(TIMESTAMP '2026-03-16 03:30') AS placed_at_local;
```

Result (1 row):

| placed_at_utc | placed_at_local |
|---|---|
| 2026-03-16T03:30:00 | 2026-03-15T22:30:00 |

03:30 UTC on Monday is 22:30 on Sunday in Chicago: the order belongs to the previous business week.

#### What each view guarantees

- `customers`: staff and QA accounts excluded.
- `clean_events`: one row per `event_id` (the first delivery), with local time.
- `sessions`: one row per session with flags; `is_bot` combines a user-agent list with a behaviour rule (30+ product views).
- `customer_sessions`: sessions without bots and staff: the population for product metrics.
- `clean_orders` / `clean_refunds`: completed customer orders and their refunds, with local dates.
- `load_info`: the load watermark; `current_day` is incomplete, so reports stop the day before.
- `conversion_daily`: sessions and purchases per day and platform: additive components, so any rate can be re-aggregated.

*SQL · base.sql*

```sql
CREATE OR REPLACE VIEW customers AS                 -- exclusions: no staff, no QA
SELECT user_id, local_ts(signup_at_utc) AS signup_at_local, country
FROM users WHERE NOT is_internal AND NOT is_test;

CREATE OR REPLACE VIEW clean_events AS              -- duplicates removed, local time added
SELECT *, local_ts(event_at_utc) AS event_at_local
FROM events
QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at_utc) = 1;

CREATE OR REPLACE VIEW sessions AS                  -- one row per session, with flags
SELECT s.*, s.started_at_local::DATE AS session_date,
       regexp_matches(s.user_agent, '(?i)bot|crawler|spider|headless|python-requests')
         OR s.product_views >= 30                    AS is_bot,
       COALESCE(u.is_internal OR u.is_test, FALSE)   AS is_internal
FROM (SELECT session_id,
             ANY_VALUE(platform)   AS platform,
             ANY_VALUE(user_agent) AS user_agent,
             MAX(user_id)          AS user_id,
             MIN(event_at_local)   AS started_at_local,
             COUNT(*) FILTER (WHERE event_name = 'view_product') AS product_views,
             BOOL_OR(event_name = 'add_to_cart')    AS added_to_cart,
             BOOL_OR(event_name = 'checkout_start') AS started_checkout,
             BOOL_OR(event_name = 'purchase')       AS purchased
      FROM clean_events GROUP BY session_id) s
LEFT JOIN users u USING (user_id);

CREATE OR REPLACE VIEW customer_sessions AS         -- the population for product metrics
SELECT * FROM sessions WHERE NOT is_bot AND NOT is_internal;

CREATE OR REPLACE VIEW clean_orders AS              -- completed customer orders
SELECT o.order_id, o.user_id, o.session_id, o.platform, o.seller_id,
       local_ts(o.placed_at_utc)         AS placed_at_local,
       local_ts(o.placed_at_utc)::DATE   AS order_date,
       o.items_amount, o.discount_amount, o.shipping_amount,
       o.items_amount - o.discount_amount AS net_items,
       s.is_first_party, s.commission_rate
FROM orders o
JOIN customers c USING (user_id)
JOIN sellers s USING (seller_id)
WHERE o.status = 'completed';

CREATE OR REPLACE VIEW clean_refunds AS             -- refunds of those orders
SELECT r.refund_id, r.order_id, r.amount,
       local_ts(r.refunded_at_utc)       AS refunded_at_local,
       local_ts(r.refunded_at_utc)::DATE AS refund_date
FROM refunds r JOIN clean_orders USING (order_id);

CREATE OR REPLACE VIEW load_info AS                 -- observation limit: the newest data
SELECT MAX(received_at_utc)                   AS loaded_at_utc,
       local_ts(MAX(received_at_utc))::DATE   AS current_day     -- incomplete; report days before it
FROM events;
```

*SQL · a component table*

```sql
CREATE OR REPLACE TABLE conversion_daily AS   -- components, not ratios
SELECT session_date                       AS day,
       platform,
       COUNT(*)                           AS sessions,
       COUNT(*) FILTER (WHERE purchased)  AS purchases
FROM customer_sessions
WHERE session_date < (SELECT current_day FROM load_info)
GROUP BY session_date, platform;
```

#### Tests on the base

```sql
SELECT (SELECT COUNT(*) = COUNT(DISTINCT session_id) FROM sessions)      AS sessions_unique,
       (SELECT COUNT(*) = COUNT(DISTINCT event_id) FROM clean_events)        AS events_unique,
       (SELECT COUNT(*) = COUNT(DISTINCT order_id) FROM clean_orders)        AS orders_unique,
       (SELECT COUNT(*) FROM sessions WHERE platform IS NULL)                AS sessions_without_platform,
       (SELECT current_day FROM load_info)                                   AS current_day;
```

Result (1 row):

| sessions_unique | events_unique | orders_unique | sessions_without_platform | current_day |
|---|---|---|---|---|
| true | true | true | 0 | 2026-03-25 |

```sql
SELECT 'sessions' AS view_name, COUNT(*) AS row_count FROM sessions
UNION ALL SELECT 'customer_sessions', COUNT(*) FROM customer_sessions
UNION ALL SELECT 'clean_orders', COUNT(*) FROM clean_orders
UNION ALL SELECT 'clean_refunds', COUNT(*) FROM clean_refunds
UNION ALL SELECT 'customers', COUNT(*) FROM customers
ORDER BY view_name;
```

Result (5 rows):

| view_name | row_count |
|---|---|
| clean_orders | 2168 |
| clean_refunds | 114 |
| customer_sessions | 15677 |
| customers | 1569 |
| sessions | 18624 |

#### Where the policies come from

Each view encodes one spec-card policy: exclusions, the bot rule, de-duplication, the business time zone, and the observation limit. The *Metric design* deck derives each policy step by step and shows how much each one changes the numbers.

> **On the job:** This is the job of an data engineer in one slide: encode business rules once, test them, and give analysts clean building blocks. In dbt these views would be staging and intermediate models (dbt fundamentals deck).

> **The main idea:** every query in this deck reads the same tested base views, so an investigation starts from trusted rows; the lessons decide where to look.

*Read more:* [DuckDB: CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones).

---

<a id="slide-5"></a>
## 5. Metric trees: decompose a number into its drivers

*Part A · revenue = traffic × conversion × AOV*

A **metric tree** writes an output metric as an exact formula of its drivers, then breaks each driver down again. **Multiplicative** nodes (sessions × conversion × AOV) say *why* a number moved; **additive** nodes (web + iOS + Android) say *where*. Because the formula is an identity, the tree always reconciles to the top number.

```text
net sales  =  sessions  ×  conversion  ×  AOV
              │             │              └─ AOV = items per order × net price per item      (basket split)
              │             └─ conversion = view → cart → checkout → purchase step rates    (funnel split)
              └─ sessions = web + iOS + Android = new + returning                          (additive split)
```

#### The tree holds exactly, every week

```sql
WITH s AS (
    SELECT date_trunc('week', session_date)::DATE AS week, COUNT(*) AS sessions
    FROM customer_sessions GROUP BY week
), o AS (
    SELECT date_trunc('week', order_date)::DATE AS week, COUNT(*) AS orders, SUM(net_items) AS net_sales
    FROM clean_orders GROUP BY week
), t AS (
    SELECT week, sessions, orders / sessions AS conversion, net_sales / orders AS aov, net_sales
    FROM s JOIN o USING (week)
    WHERE week IN (DATE '2026-02-09', DATE '2026-02-16')
)
SELECT week, sessions, ROUND(conversion, 4) AS conversion, ROUND(aov, 2) AS aov, net_sales,
       ABS(sessions * conversion * aov - net_sales) < 0.01 AS tree_holds
FROM t
ORDER BY week;
```

Result (2 rows):

| week | sessions | conversion | aov | net_sales | tree_holds |
|---|---|---|---|---|---|
| 2026-02-09 | 1803 | 0.1459 | 61.53 | 16182.56 | true |
| 2026-02-16 | 1856 | 0.1487 | 54.42 | 15019.57 | true |

Conversion here is orders ÷ sessions (order grain, the Metric design deck (“Grain and distinct keys: conversion of what?”)), so the identity is exact. Pick tree nodes that multiply back to the top; otherwise the tree explains only part of the change.

#### Which driver moved? Log shares

```sql
WITH s AS (
    SELECT date_trunc('week', session_date)::DATE AS week, COUNT(*) AS sessions
    FROM customer_sessions GROUP BY week
), o AS (
    SELECT date_trunc('week', order_date)::DATE AS week, COUNT(*) AS orders, SUM(net_items) AS net_sales
    FROM clean_orders GROUP BY week
), t AS (
    SELECT week, sessions, orders / sessions AS conversion, net_sales / orders AS aov,
           net_sales::DOUBLE AS net_sales
    FROM s JOIN o USING (week)
), p AS (                                   -- the two weeks side by side
    SELECT a.sessions AS s1, b.sessions AS s2, a.conversion AS c1, b.conversion AS c2,
           a.aov AS a1, b.aov AS a2, a.net_sales AS r1, b.net_sales AS r2
    FROM t a JOIN t b ON a.week = DATE '2026-02-09' AND b.week = DATE '2026-02-16'
)
SELECT 1 AS k, 'sessions' AS driver, ROUND(100 * (s2 / s1 - 1), 1) AS change_pct,
       ROUND(LN(s2 / s1) / LN(r2 / r1), 2) AS share_of_change FROM p
UNION ALL SELECT 2, 'conversion', ROUND(100 * (c2 / c1 - 1), 1), ROUND(LN(c2 / c1) / LN(r2 / r1), 2) FROM p
UNION ALL SELECT 3, 'AOV',        ROUND(100 * (a2 / a1 - 1), 1), ROUND(LN(a2 / a1) / LN(r2 / r1), 2) FROM p
UNION ALL SELECT 4, 'net sales',  ROUND(100 * (r2 / r1 - 1), 1), 1.0 FROM p
ORDER BY k;
```

Result (4 rows):

| k | driver | change_pct | share_of_change |
|---|---|---|---|
| 1 | sessions | 2.9 | -0.39 |
| 2 | conversion | 1.9 | -0.26 |
| 3 | AOV | -11.6 | 1.65 |
| 4 | net sales | -7.2 | 1 |

For a product, ln(R₂/R₁) = ln(S₂/S₁) + ln(C₂/C₁) + ln(A₂/A₁), so each driver’s log change divided by the total is its share of the move, and the shares add to 1. This week-on-week dip was entirely **AOV**: its share is above 1 because traffic and conversion rose and offset part of it. Next step: go down the AOV branch (basket size, price, mix) instead of debugging checkout.

#### Building a tree for a new metric

- Start from the output metric’s spec card.
- Split multiplicatively into rate × volume terms that a team owns.
- Split each node additively by the segments you usually slice by.
- Check the identity with a query like the one above before you trust any decomposition.

#### Trees in other domains

- SaaS: MRR = paying customers × ARPA (average revenue per account); customers = previous + new − churned.
- Marketplace: net revenue = GMV × take rate; GMV = buyers × orders per buyer × AOV.
- Operations: tickets = orders × contact rate; contact rate split by reason.

> **On the job:** Metric trees are how good weekly reviews are organised and how “metric dropped” investigations start: walk down the tree to the node that moved, then segment it. Many teams draw the tree on the dashboard itself so each owner sees how their input metric reaches the top line.

> **The main idea:** decompose an output metric into an exact formula of drivers (multiplicative for why, additive for where), verify the identity, then follow the branch that actually moved.

*Read more:* [Amplitude: leading vs lagging indicators](https://amplitude.com/blog/map-your-metrics), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-6"></a>
## 6. Simpson’s paradox and mix shift

*Part A · every channel improved, and the total fell (added)*

**Simpson’s paradox**: a trend that holds in every segment reverses in the total. It happens when the **mix** (each segment’s share of the denominator) shifts toward segments with lower rates. In this what-if, a paid campaign floods the website with new visitors, who convert less than app users. The numbers are illustrative, inline in the query.

#### The paradox

```sql
WITH t(period, channel, sessions, purchases) AS (VALUES
    ('before', 'web', 2000, 300), ('before', 'app', 6000, 1500),
    ('after',  'web', 8000, 1280), ('after',  'app', 2000,  520)
)
SELECT COALESCE(channel, 'overall')                       AS channel,
       ROUND(SUM(purchases) FILTER (WHERE period = 'before')
           / SUM(sessions)  FILTER (WHERE period = 'before'), 3) AS rate_before,
       ROUND(SUM(purchases) FILTER (WHERE period = 'after')
           / SUM(sessions)  FILTER (WHERE period = 'after'), 3)  AS rate_after
FROM t
GROUP BY ROLLUP (channel)
ORDER BY GROUPING(channel), channel;
```

Result (3 rows):

| channel | rate_before | rate_after |
|---|---|---|
| app | 0.25 | 0.26 |
| web | 0.15 | 0.16 |
| overall | 0.225 | 0.18 |

Web and app conversion both rose by a point. Overall conversion fell by 4.5 points, because the share of sessions on web went from 25 % to 80 %.

#### Split the change: rate effect + mix effect

```sql
WITH t(period, channel, sessions, purchases) AS (VALUES
    ('before', 'web', 2000, 300), ('before', 'app', 6000, 1500),
    ('after',  'web', 8000, 1280), ('after',  'app', 2000,  520)
), s AS (                                  -- share of sessions (mix) and rate per channel
    SELECT period, channel,
           sessions / SUM(sessions) OVER (PARTITION BY period) AS mix,
           purchases / sessions                                AS rate
    FROM t
), w AS (
    SELECT channel,
           MAX(mix)  FILTER (WHERE period = 'before') AS m1, MAX(mix)  FILTER (WHERE period = 'after') AS m2,
           MAX(rate) FILTER (WHERE period = 'before') AS r1, MAX(rate) FILTER (WHERE period = 'after') AS r2
    FROM s GROUP BY channel
)
SELECT ROUND(SUM(m2 * r2) - SUM(m1 * r1), 4)              AS total_change,
       ROUND(SUM((r2 - r1) * (m1 + m2) / 2), 4)            AS rate_effect,
       ROUND(SUM((m2 - m1) * (r1 + r2) / 2), 4)            AS mix_effect
FROM w;
```

Result (1 row):

| total_change | rate_effect | mix_effect |
|---|---|---|
| -0.045 | 0.01 | -0.055 |

The **rate effect** is how much the total would move if only segment rates changed; the **mix effect** is how much it moves because weights changed. Using average weights and rates for each term makes them add up exactly to the total change (the build asserts it).

#### How to use it

- When a blended rate moves, always segment by the obvious mix drivers: platform, channel, new vs returning, country.
- Report rate and mix effects separately: “conversion fell 4.5 points, entirely from mix; every channel improved”.
- Choose the segmentation for the decision; with the wrong segments a mix effect can hide inside a “rate” effect.

#### Coming from C#

It is the same arithmetic as a weighted average whose weights changed: `Σ wᵢ·rᵢ` moves when either `w` or `r` moves. Nothing is paradoxical once the weights are visible; it only looks paradoxical in a single blended number.

> **On the job:** Mix shift explains a large share of “our conversion dropped” escalations: a new traffic source, a marketing push to a new country, a holiday changing device mix. Splitting rate from mix in the first hour of an investigation saves days of debugging a product that did not break.

> **The main idea:** a blended rate moves when segment rates move or when the mix moves. Segment by the likely drivers and report rate and mix effects separately before blaming the product.

*Read more:* [Simpson’s paradox](https://en.wikipedia.org/wiki/Simpson%27s_paradox), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-7"></a>
## 7. “The metric dropped X %”: a root-cause workflow

*Part A · “DAU fell on Tuesday 3 March. Why?” (added)*

“Metric X dropped, investigate” is the most common open-ended analytics interview case and a weekly event on the job. A structured workflow beats guessing: confirm the definition, confirm the data, locate the drop, then explain it.

1. **Clarify** (which metric, which comparison?): Exact definition; versus what (yesterday, same weekday last week, forecast)? How big is normal noise?
2. **Validate the data** (is it real?): Pipeline ran? Late or missing partitions? Definition, tracking, or bot rule changed? Incomplete period?
3. **Decompose** (walk the metric tree): Which multiplicative driver moved (volume, rate, value)?
4. **Segment** (where?): Platform, country, channel, new vs returning, app version: is it everywhere or in one slice? Mix or rate?
5. **Hypothesise and test** (why?): Releases, outages, campaigns, holidays, competitors. Test each against an independent source.
6. **Recommend** (so what?): Size the impact, propose the action, say how you will monitor recovery.

#### Segment: one platform went to zero

```sql
SELECT session_date AS day,
       COUNT(DISTINCT user_id)                                     AS dau,
       COUNT(DISTINCT user_id) FILTER (WHERE platform = 'web')     AS web,
       COUNT(DISTINCT user_id) FILTER (WHERE platform = 'ios')     AS ios,
       COUNT(DISTINCT user_id) FILTER (WHERE platform = 'android') AS android
FROM customer_sessions
WHERE user_id IS NOT NULL
  AND session_date IN (DATE '2026-02-24', DATE '2026-03-02', DATE '2026-03-03', DATE '2026-03-04')
GROUP BY session_date
ORDER BY day;
```

Result (4 rows):

| day | dau | web | ios | android |
|---|---|---|---|---|
| 2026-02-24 | 156 | 77 | 44 | 54 |
| 2026-03-02 | 155 | 86 | 41 | 49 |
| 2026-03-03 | 125 | 83 | 46 | 0 |
| 2026-03-04 | 172 | 83 | 51 | 51 |

Compared with the same weekday a week earlier and the days around it, web and iOS are normal; Android is exactly 0. A real drop in behaviour is rarely exactly zero; zero points at an outage or a broken pipe.

#### Tracking bug or real outage? Ask an independent system

```sql
SELECT order_date AS day,
       COUNT(*) FILTER (WHERE platform = 'android') AS android_orders,
       COUNT(*) FILTER (WHERE platform <> 'android') AS other_orders
FROM clean_orders
WHERE order_date BETWEEN DATE '2026-03-02' AND DATE '2026-03-04'
GROUP BY order_date
ORDER BY day;
```

Result (3 rows):

| day | android_orders | other_orders |
|---|---|---|
| 2026-03-02 | 17 | 25 |
| 2026-03-03 | 0 | 28 |
| 2026-03-04 | 9 | 25 |

```sql
SELECT platform,
       COUNT(*) FILTER (WHERE local_ts(event_at_utc)::DATE = DATE '2026-03-03')   AS events_on_3_march,
       COUNT(*) FILTER (WHERE local_ts(received_at_utc)::DATE = DATE '2026-03-03') AS events_received_3_march
FROM events
GROUP BY platform
ORDER BY platform;
```

Result (3 rows):

| platform | events_on_3_march | events_received_3_march |
|---|---|---|
| android | 0 | 25 |
| ios | 249 | 250 |
| web | 820 | 820 |

The order service (a different system from event tracking) also has no Android orders that day. The event pipeline was healthy: it kept receiving late Android events from earlier days on 3 March, but none that happened on 3 March. So the app was really down, not just its analytics. Had orders been normal with zero events, the cause would have been tracking.

> **On the job:** Write the conclusion like an incident note: “DAU fell for one day by about a fifth; cause: Android app outage on 3 March (no sessions, no orders, confirmed by the order service); impact ≈ one day of Android orders; no lasting effect, recovered on 4 March; the outage now has an annotation on the DAU chart.” Interviewers grade the structure and the data-validation step as much as the answer.

> **The main idea:** before explaining a drop, prove it is real; then walk the metric tree, segment until the drop is localised, and confirm the cause with an independent source.

*Read more:* [SQLPad: investigating a metric drop (practice)](https://sqlpad.io/tutorial/data-analyst-case-interview-investigate-metric-drop/), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter).

---

<a id="slide-8"></a>
## 8. Lab: Leafy’s weekly business review

*Lab · Leafy’s weekly business review · the brief*

It is Monday 23 March. Leafy’s leadership meets at 10:00 for the **weekly business review** (WBR): a one-page table of key metrics, this week vs last week, plus an explanation of anything that moved. You own the numbers. Below are the notes people sent you on Friday, in their own words. Time budget: about 90 minutes, offline, with the warehouse from lesson 3 and the base views from lesson 4.

#### Stakeholder notes

- **CEO:** “How did we do last week? Sales and orders vs the week before, please.”
- **Product lead:** “Is the shopping flow healthy? I want conversion.”
- **Head of Commerce:** “What is AOV doing?”
- **Operations:** “Are we delivering on time?”
- **Support:** “How bad is the ticket queue?”
- **Plus PM:** “How many paying Plus members do we have, and MRR?”

#### Deliverables

- **Step 1:** a spec card per metric (a compact table is fine).
- **Step 2:** SQL views over the base layer: additive components first, ratios at the end.
- **Step 3:** sanity and reconciliation tests that fail loudly (Python `assert`).
- **Step 4:** the WBR table: last week, this week, week-over-week (WoW) change.
- **Step 5:** a metric-tree drill-down explaining the biggest move, and a five-line write-up.

Rules: compare complete Chicago weeks only (Mon 9–Sun 15 vs Mon 16–Sun 22 March); use the data as loaded (restated, the Metric design deck (“Missing data and late-arriving events”)); every number must trace to a spec field.

> **On the job:** A WBR is a real ritual at many companies (Amazon popularised the format). The data engineer’s part is exactly this lab: stable definitions, components that reconcile, and a first explanation of what moved, ready before the meeting rather than during it.

> **The main idea:** a WBR is a small set of spec’d metrics, computed from one clean base, compared week over week, with the biggest move explained.

---

<a id="slide-9"></a>
## 9. Lab step 1: write the specs before the SQL

*Lab · Leafy’s weekly business review · step 1*

Turn each note into a compact spec card. Try it yourself first: decision, population, unit, numerator and denominator, window, attribution, and special rules. Then open the reference version.

<details><summary>Reference specs (open after your attempt)</summary>

| Metric | Unit and population | Numerator ÷ denominator | Window and attribution | Special rules |
|---|---|---|---|---|
| **Net sales** | Completed customer orders, all sellers | Σ (items − discounts) | Chicago order week | Before refunds (they mature later; tracked separately). Shipping excluded. |
| **Orders** | same | COUNT(order_id) | Chicago order week | From the order service, not purchase events. |
| **Session conversion** | Customer sessions (no bots, no staff) | sessions with a purchase ÷ sessions | Chicago week of session start | Zero sessions → NULL. |
| **AOV** | Completed customer orders | net sales ÷ orders | Chicago order week | Ratio of weekly sums. |
| **On-time delivery** | Shipped customer orders with a passed promise date | delivered ≤ promised ÷ decided | Chicago promise week | In transit after the promise = late. |
| **Ticket backlog** | All tickets | open tickets at Sunday 24:00 (stock); tickets opened (flow) | Chicago week | Stock: end-of-week value, never summed over days. |
| **Plus members, MRR** | Paid Leafy Plus periods, no staff | distinct paying members; Σ MRR | Snapshot at the end of the week (Monday 00:00) | Annual plans at price ÷ 12. |

Two choices worth defending in the meeting: net sales are *before* refunds because last week’s refunds have not arrived yet (Metric design deck: “Attribution date: which timestamp puts a number in a period?”), and conversion is session-grain because the product lead asked about the shopping flow, not about people (Metric design deck: “Grain and distinct keys: conversion of what?”).

</details>

> **On the job:** Sending this table to the six stakeholders on Friday (“this is what you will see on Monday; reply if anything is off”) is the cheapest way to avoid a definitional argument in the meeting itself.

> **The main idea:** write the specs first and share them; the SQL then becomes a translation exercise rather than a guessing game.

---

<a id="slide-10"></a>
## 10. Lab step 2: components over the clean base

*Lab · Leafy’s weekly business review · step 2*

Implement the specs as views. Keep every view **additive** (counts and sums by week and platform) so any ratio can be computed at any grain later (Metric design deck: “Re-aggregation: store numerator and denominator”). The week boundaries come from `load_info`, so next Monday the same SQL produces next week’s review.

<details><summary>Reference views (open after your attempt)</summary>

*SQL · wbr.sql*

```sql
CREATE OR REPLACE VIEW wbr_weeks AS              -- the two complete weeks before the load
SELECT date_trunc('week', current_day)::DATE - 14 AS last_week,
       date_trunc('week', current_day)::DATE - 7  AS this_week
FROM load_info;

CREATE OR REPLACE VIEW wbr_commerce AS           -- additive components per week x platform
WITH s AS (
    SELECT date_trunc('week', session_date)::DATE AS week, platform,
           COUNT(*) AS sessions, COUNT(*) FILTER (WHERE purchased) AS purchasing_sessions
    FROM customer_sessions GROUP BY ALL
), o AS (
    SELECT date_trunc('week', order_date)::DATE AS week, platform,
           COUNT(*) AS orders, SUM(net_items) AS net_sales
    FROM clean_orders GROUP BY ALL
)
SELECT week, platform,
       COALESCE(sessions, 0) AS sessions, COALESCE(purchasing_sessions, 0) AS purchasing_sessions,
       COALESCE(orders, 0)   AS orders,   COALESCE(net_sales, 0)           AS net_sales
FROM s FULL JOIN o USING (week, platform);

CREATE OR REPLACE VIEW wbr_delivery AS           -- by promise week, decided parcels only
SELECT date_trunc('week', s.promised_date)::DATE AS week,
       COUNT(*) AS decided,
       COUNT(*) FILTER (WHERE local_ts(s.delivered_at_utc)::DATE <= s.promised_date) AS on_time
FROM clean_orders o JOIN shipments s USING (order_id)
WHERE s.promised_date < (SELECT current_day FROM load_info)
GROUP BY ALL;

CREATE OR REPLACE VIEW wbr_support AS            -- flow (opened) and stock (backlog at week end)
SELECT w.week,
       COUNT(*) FILTER (WHERE local_ts(t.opened_at_utc) >= w.week
                          AND local_ts(t.opened_at_utc) <  w.week + 7)            AS opened,
       COUNT(*) FILTER (WHERE local_ts(t.opened_at_utc) < w.week + 7
                          AND (t.closed_at_utc IS NULL
                               OR local_ts(t.closed_at_utc) >= w.week + 7))       AS backlog_at_week_end
FROM (SELECT UNNEST([last_week, this_week]) AS week FROM wbr_weeks) w
CROSS JOIN tickets t
GROUP BY w.week;

CREATE OR REPLACE VIEW wbr_plus AS               -- snapshot at Monday 00:00 after each week
SELECT w.week,
       COUNT(DISTINCT p.user_id) AS paying_members,
       SUM(p.mrr)                AS mrr
FROM (SELECT UNNEST([last_week, this_week]) AS week FROM wbr_weeks) w
JOIN plus_periods p
  ON p.valid_from <= w.week + 7 AND (p.valid_to IS NULL OR p.valid_to > w.week + 7)
WHERE p.plan <> 'staff'
GROUP BY w.week;
```

One week of the commerce component view:

```sql
SELECT * FROM wbr_commerce
WHERE week = (SELECT this_week FROM wbr_weeks)
ORDER BY platform;
```

Result (3 rows):

| week | platform | sessions | purchasing_sessions | orders | net_sales |
|---|---|---|---|---|---|
| 2026-03-16 | android | 579 | 24 | 23 | 1203.55 |
| 2026-03-16 | ios | 507 | 84 | 81 | 5190.11 |
| 2026-03-16 | web | 920 | 124 | 120 | 7275.67 |

</details>

#### Why these shapes

- `FULL JOIN` of sessions and orders keeps a platform that had orders but no sessions (or the reverse) instead of dropping it.
- Delivery is attributed to the promise week, and only decided parcels count (Business models and metrics deck: “Operations: on-time delivery and percentiles”).
- Support stores a flow and a stock side by side, each with its own roll-up rule (Business models and metrics deck: “Operations: ticket backlog, a stock not a flow”).
- Plus is a snapshot, so it is computed at one instant per week, not summed.

#### Coming from C#

Think of these views as pure functions over the base layer: no state, no side effects, deterministic for a given load. The WBR query in step 4 is just composition.

> **On the job:** In a dbt project these would be models in a `marts/wbr` folder with tests, or metrics in a semantic layer (Metric design deck: “Metric definitions as code: semantic layers”). The point is the same: the meeting reads from definitions that exist outside anyone’s notebook.

> **The main idea:** build the WBR from additive component views anchored to the load watermark; ratios and comparisons come last.

*Read more:* [DuckDB: CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view), [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets).

---

<a id="slide-11"></a>
## 11. Lab step 3: tests that fail loudly

*Lab · Leafy’s weekly business review · step 3*

Before anyone sees a number, prove four things: the weeks are complete, the components reconcile to the base layer, every numerator is within its denominator, and late data won’t move the result materially. Write them as `assert` statements so a broken pipeline stops the review instead of misleading it.

<details><summary>Reference tests (open after your attempt)</summary>

```python
import duckdb
con = duckdb.connect("leafy.duckdb")
q = lambda sql: con.execute(sql).fetchone()
last_week, this_week = q("SELECT last_week, this_week FROM wbr_weeks")
current_week = q("SELECT date_trunc('week', current_day)::DATE FROM load_info")[0]

# 1. both weeks are complete
assert this_week < current_week, "this_week is still in progress"

for week in (last_week, this_week):
    # 2. components reconcile to the base views (no row lost in the FULL JOIN)
    wbr = q(f"SELECT SUM(orders), SUM(net_sales), SUM(sessions) FROM wbr_commerce WHERE week = DATE '{week}'")
    base = q(f"""SELECT (SELECT COUNT(*) FROM clean_orders WHERE date_trunc('week', order_date) = DATE '{week}'),
                        (SELECT SUM(net_items) FROM clean_orders WHERE date_trunc('week', order_date) = DATE '{week}'),
                        (SELECT COUNT(*) FROM customer_sessions WHERE date_trunc('week', session_date) = DATE '{week}')""")
    assert wbr == base, (week, wbr, base)
    # 3. numerators never exceed denominators
    bad = q(f"""SELECT COUNT(*) FROM wbr_commerce WHERE week = DATE '{week}'
                AND purchasing_sessions > sessions""")[0]
    assert bad == 0
    on_time, decided = q(f"SELECT on_time, decided FROM wbr_delivery WHERE week = DATE '{week}'")
    assert 0 <= on_time <= decided

# 4. late data: how much did this week change after Monday 08:00 (13:00 UTC)?
then_, now_ = q("""SELECT COUNT(*) FILTER (WHERE received_at_utc <= TIMESTAMP '2026-03-23 13:00'), COUNT(*)
                   FROM events WHERE local_ts(event_at_utc) >= DATE '2026-03-16'
                                 AND local_ts(event_at_utc) <  DATE '2026-03-23'""")
late_share = 1 - then_ / now_
assert late_share < 0.01, late_share
print("weeks:", last_week, "and", this_week)
print(f"events for this week that arrived after Monday 08:00: {late_share:.2%}")
print("all checks passed")
```

Output:

```text
weeks: 2026-03-09 and 2026-03-16
events for this week that arrived after Monday 08:00: 0.16%
all checks passed
```

</details>

#### What each test protects

| Test | Protects against |
|---|---|
| Weeks complete | Comparing a partial week (Metric design deck: “Observation limits and maturity”) |
| Components = base | Rows lost in joins; filters applied twice or not at all |
| Numerator ≤ denominator | Mismatched populations or duplicates (Metric design deck: “Numerator and denominator: build both from the same rows”) |
| Late share small | A Monday number that changes by Wednesday (Metric design deck: “Missing data and late-arriving events”) |

#### Make them permanent

In production these become dbt tests or pipeline checks that run before the dashboard refreshes, with an alert to the owner. The WBR deck then shows a “data checks passed” line, which is often the first thing an experienced exec looks for.

> **On the job:** Reconciliation tests are the cheapest insurance an analytics team can buy. The first time one fails before a leadership meeting, rather than during it, it pays for itself.

> **The main idea:** test completeness, reconciliation, ratio invariants, and lateness before you publish; a WBR without tests is an opinion.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="slide-12"></a>
## 12. Lab step 4: the WBR table

*Lab · Leafy’s weekly business review · step 4 · week of 16 March vs week of 9 March*

Pivot the components into one table: metric, last week, this week, week-over-week change. Ratios are computed here, from weekly sums, never averaged from days.

<details><summary>Reference query and result (open after your attempt)</summary>

```sql
WITH w AS (SELECT * FROM wbr_weeks),
c AS (
    SELECT week, SUM(sessions) AS sessions, SUM(purchasing_sessions) AS purch,
           SUM(orders) AS orders, SUM(net_sales) AS net_sales
    FROM wbr_commerce GROUP BY week
),
m AS (                                         -- one row per metric and week
    SELECT week, 1 AS k, 'Net sales, $' AS metric, net_sales::DOUBLE AS value FROM c
    UNION ALL SELECT week, 2, 'Orders', orders FROM c
    UNION ALL SELECT week, 3, 'Session conversion', purch / NULLIF(sessions, 0) FROM c
    UNION ALL SELECT week, 4, 'AOV, $', net_sales / NULLIF(orders, 0) FROM c
    UNION ALL SELECT week, 5, 'On-time delivery', on_time / NULLIF(decided, 0) FROM wbr_delivery
    UNION ALL SELECT week, 6, 'Tickets opened', opened FROM wbr_support
    UNION ALL SELECT week, 7, 'Ticket backlog at week end', backlog_at_week_end FROM wbr_support
    UNION ALL SELECT week, 8, 'Plus paying members', paying_members FROM wbr_plus
    UNION ALL SELECT week, 9, 'Plus MRR, $', mrr FROM wbr_plus
)
SELECT k, metric,
       ROUND(MAX(value) FILTER (WHERE week = w.last_week), 4) AS week_of_9_mar,
       ROUND(MAX(value) FILTER (WHERE week = w.this_week), 4) AS week_of_16_mar,
       ROUND(100 * (week_of_16_mar / week_of_9_mar - 1), 1)   AS wow_pct
FROM m CROSS JOIN w
GROUP BY k, metric
ORDER BY k;
```

Result (9 rows):

| k | metric | week_of_9_mar | week_of_16_mar | wow_pct |
|---|---|---|---|---|
| 1 | Net sales, $ | 16616.72 | 13669.33 | -17.7 |
| 2 | Orders | 278 | 224 | -19.4 |
| 3 | Session conversion | 0.1488 | 0.1157 | -22.2 |
| 4 | AOV, $ | 59.7724 | 61.0238 | 2.1 |
| 5 | On-time delivery | 0.9586 | 0.9532 | -0.6 |
| 6 | Tickets opened | 37 | 61 | 64.9 |
| 7 | Ticket backlog at week end | 5 | 19 | 280 |
| 8 | Plus paying members | 145 | 152 | 4.8 |
| 9 | Plus MRR, $ | 1418 | 1497 | 5.6 |

For ratios, the WoW column is a *relative* change; in the meeting also say the absolute change in points (“conversion fell from 14.9 % to 11.6 %, 3.3 points”).

</details>

#### What stands out

- Net sales and orders fell by close to a fifth while AOV was flat: the drop is in the number of orders, not their value.
- Session conversion fell while sessions rose: people came, but fewer bought.
- Tickets opened rose by about two thirds and the backlog nearly quadrupled: a guardrail is flashing at the same time.
- Delivery and Plus look healthy: the problem is not fulfilment or subscriptions.

#### Presentation rules

- Same order of metrics every week; same decimals.
- Ratios as percentages with points of change; money with thousands separators.
- Flag maturing numbers (none here: both weeks are complete and refunds are excluded by design).

> **On the job:** Amazon-style WBRs put exactly this table on page one, then a short narrative for anything outside its normal range. The narrative is the next step.

> **The main idea:** one table, fixed order, weekly sums divided at the end, absolute and relative change. Then explain the biggest move.

*Read more:* [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter).

---

<a id="slide-13"></a>
## 13. Lab step 5: explain the drop with the metric tree

*Lab · Leafy’s weekly business review · step 5 · why did net sales fall?*

Walk the tree from lesson 5, then segment the branch that moved (lesson 7), then confirm with an independent source. Try it before opening the reference analysis.

<details><summary>Reference drill-down (open after your attempt)</summary>

#### 1 · Which driver?

```sql
WITH t AS (
    SELECT week, SUM(sessions) AS s, SUM(orders) / SUM(sessions) AS c,
           SUM(net_sales) / SUM(orders) AS a, SUM(net_sales)::DOUBLE AS r
    FROM wbr_commerce GROUP BY week
), p AS (
    SELECT a.s AS s1, b.s AS s2, a.c AS c1, b.c AS c2, a.a AS a1, b.a AS a2, a.r AS r1, b.r AS r2
    FROM t a JOIN t b ON a.week = (SELECT last_week FROM wbr_weeks)
                     AND b.week = (SELECT this_week FROM wbr_weeks)
)
SELECT 1 AS k, 'sessions' AS driver, ROUND(100 * (s2 / s1 - 1), 1) AS change_pct,
       ROUND(LN(s2 / s1) / LN(r2 / r1), 2) AS share_of_change FROM p
UNION ALL SELECT 2, 'orders per session', ROUND(100 * (c2 / c1 - 1), 1), ROUND(LN(c2 / c1) / LN(r2 / r1), 2) FROM p
UNION ALL SELECT 3, 'AOV', ROUND(100 * (a2 / a1 - 1), 1), ROUND(LN(a2 / a1) / LN(r2 / r1), 2) FROM p
ORDER BY k;
```

Result (3 rows):

| k | driver | change_pct | share_of_change |
|---|---|---|---|
| 1 | sessions | 3.7 | -0.18 |
| 2 | orders per session | -22.3 | 1.29 |
| 3 | AOV | 2.1 | -0.11 |

Orders per session explains all of the drop (share above 1, because sessions and AOV rose slightly).

#### 2 · Where? Rate vs mix by platform

```sql
WITH x AS (
    SELECT platform,
           SUM(purchasing_sessions) FILTER (WHERE week = (SELECT last_week FROM wbr_weeks)) AS p1,
           SUM(sessions)            FILTER (WHERE week = (SELECT last_week FROM wbr_weeks)) AS s1,
           SUM(purchasing_sessions) FILTER (WHERE week = (SELECT this_week FROM wbr_weeks)) AS p2,
           SUM(sessions)            FILTER (WHERE week = (SELECT this_week FROM wbr_weeks)) AS s2
    FROM wbr_commerce GROUP BY platform
), y AS (
    SELECT platform, p1 / s1 AS r1, p2 / s2 AS r2,
           s1 / SUM(s1) OVER () AS m1, s2 / SUM(s2) OVER () AS m2
    FROM x
)
SELECT platform,
       ROUND(r1, 3)                               AS conv_last_week,
       ROUND(r2, 3)                               AS conv_this_week,
       ROUND((r2 - r1) * (m1 + m2) / 2, 4)        AS rate_effect,
       ROUND((m2 - m1) * (r1 + r2) / 2, 4)        AS mix_effect
FROM y
ORDER BY rate_effect;
```

Result (3 rows):

| platform | conv_last_week | conv_this_week | rate_effect | mix_effect |
|---|---|---|---|---|
| android | 0.123 | 0.041 | -0.0236 | -0.0001 |
| web | 0.165 | 0.135 | -0.014 | -0.0007 |
| ios | 0.149 | 0.166 | 0.0043 | 0.0009 |

The mix barely moved, so this is a rate problem. Android carries most of the rate effect; web also dipped. Is web’s dip unusual? Compare with history.

#### 3 · Signal or noise? Eight weeks of history

```sql
SELECT week,
       ROUND(SUM(purchasing_sessions) FILTER (WHERE platform = 'web')     / SUM(sessions) FILTER (WHERE platform = 'web'), 3)     AS web,
       ROUND(SUM(purchasing_sessions) FILTER (WHERE platform = 'ios')     / SUM(sessions) FILTER (WHERE platform = 'ios'), 3)     AS ios,
       ROUND(SUM(purchasing_sessions) FILTER (WHERE platform = 'android') / SUM(sessions) FILTER (WHERE platform = 'android'), 3) AS android
FROM wbr_commerce
WHERE week BETWEEN DATE '2026-01-26' AND (SELECT this_week FROM wbr_weeks)
GROUP BY week
ORDER BY week;
```

Result (8 rows):

| week | web | ios | android |
|---|---|---|---|
| 2026-01-26 | 0.144 | 0.142 | 0.133 |
| 2026-02-02 | 0.148 | 0.16 | 0.16 |
| 2026-02-09 | 0.159 | 0.138 | 0.158 |
| 2026-02-16 | 0.164 | 0.144 | 0.154 |
| 2026-02-23 | 0.139 | 0.155 | 0.148 |
| 2026-03-02 | 0.155 | 0.165 | 0.152 |
| 2026-03-09 | 0.165 | 0.149 | 0.123 |
| 2026-03-16 | 0.135 | 0.166 | 0.041 |

Web’s week is at the low end of its normal range (it was similar on 23 February). Android fell to about a third of its worst previous week: that is the signal.

#### 4 · Which step, and what changed?

```sql
SELECT CASE WHEN session_date < DATE '2026-03-16' THEN 'week of 9 Mar' ELSE 'week of 16 Mar' END AS week,
       ANY_VALUE(user_agent) FILTER (WHERE session_date >= DATE '2026-03-16')     AS app_version_seen,
       ROUND(COUNT(*) FILTER (WHERE started_checkout) / COUNT(*), 3)               AS reach_checkout,
       ROUND(COUNT(*) FILTER (WHERE purchased) / COUNT(*) FILTER (WHERE started_checkout), 3) AS checkout_to_purchase
FROM customer_sessions
WHERE platform = 'android' AND session_date BETWEEN DATE '2026-03-09' AND DATE '2026-03-22'
GROUP BY ALL
ORDER BY week DESC;
```

Result (2 rows):

| week | app_version_seen | reach_checkout | checkout_to_purchase |
|---|---|---|---|
| week of 9 Mar | NULL | 0.18 | 0.683 |
| week of 16 Mar | LeafyApp/5.3 (Android 16) | 0.221 | 0.188 |

Android sessions still reach checkout, but most no longer complete it, and every Android session this week runs app 5.3, released on Monday 16 March.

#### 5 · Independent confirmation and impact

```sql
SELECT category,
       COUNT(*) FILTER (WHERE local_ts(opened_at_utc)::DATE BETWEEN DATE '2026-03-09' AND DATE '2026-03-15') AS week_of_9_mar,
       COUNT(*) FILTER (WHERE local_ts(opened_at_utc)::DATE BETWEEN DATE '2026-03-16' AND DATE '2026-03-22') AS week_of_16_mar
FROM tickets
GROUP BY category
ORDER BY week_of_16_mar - week_of_9_mar DESC;
```

Result (4 rows):

| category | week_of_9_mar | week_of_16_mar |
|---|---|---|
| checkout | 7 | 34 |
| delivery | 5 | 7 |
| account | 6 | 5 |
| product | 19 | 15 |

Checkout tickets jumped in the same week: customers are telling the same story through a different system.

```sql
WITH a AS (                                     -- Android, one row per week
    SELECT week, SUM(orders) / SUM(sessions) AS orders_per_session, SUM(sessions) AS sessions,
           SUM(orders) AS orders, SUM(net_sales) / SUM(orders) AS aov
    FROM wbr_commerce WHERE platform = 'android' GROUP BY week
), normal AS (                                -- median of the seven weeks before
    SELECT median(orders_per_session) AS rate FROM a
    WHERE week BETWEEN DATE '2026-01-26' AND (SELECT last_week FROM wbr_weeks)
)
SELECT ROUND(normal.rate, 3)                         AS normal_orders_per_session,
       a.sessions,
       a.orders                                      AS actual_orders,
       ROUND(a.sessions * normal.rate)::INT          AS expected_orders,
       expected_orders - actual_orders               AS lost_orders,
       ROUND(lost_orders * a.aov, -2)::INT           AS lost_net_sales_approx
FROM a CROSS JOIN normal
WHERE a.week = (SELECT this_week FROM wbr_weeks);
```

Result (1 row):

| normal_orders_per_session | sessions | actual_orders | expected_orders | lost_orders | lost_net_sales_approx |
|---|---|---|---|---|---|
| 0.145 | 579 | 23 | 84 | 61 | 3200 |

Impact: Android sessions × Android’s normal orders per session (median of the previous seven weeks), minus actual orders.

#### 6 · The red herring

```sql
SELECT date_trunc('week', session_date)::DATE AS week,
       COUNT(*)                                                   AS all_sessions,
       COUNT(*) FILTER (WHERE NOT is_bot AND NOT is_internal)     AS customer_sessions,
       ROUND(COUNT(*) FILTER (WHERE purchased) / COUNT(*), 4)     AS naive_conversion
FROM sessions
WHERE session_date BETWEEN DATE '2026-03-09' AND DATE '2026-03-22'
GROUP BY week
ORDER BY week;
```

Result (2 rows):

| week | all_sessions | customer_sessions | naive_conversion |
|---|---|---|---|
| 2026-03-09 | 2120 | 1935 | 0.142 |
| 2026-03-16 | 3571 | 2006 | 0.068 |

A dashboard on raw sessions would show a traffic spike (a scraper and a crawler wave) and a much larger conversion fall. The base layer removed both, so the analysis is not confused by them.

> **Net sales -18 % WoW, orders -19 %, AOV flat.** Cause: Android checkout completion collapsed after app 5.3 shipped on Mon 16 March; iOS normal, web at the low end of its usual range. Evidence: Android checkout→purchase fell from about 68 % to 19 %; checkout tickets rose from 7 to 34. Impact: about 61 lost orders (≈ $3,200 net sales) in one week. Ask: hotfix or roll back 5.3 today; we will track Android checkout→purchase daily. Note: a bot wave inflated raw traffic; excluded by policy, no business impact.

The write-up has five parts: what moved, why, evidence, impact, action.

</details>

> **On the job:** This is the “metric dropped” interview case and the Monday-morning reality in one exercise. Interviewers and executives look for the same things: a data check first, a decomposition, a localised cause confirmed by an independent source, a sized impact, and a recommendation.

> **The main idea:** explain a move by walking the tree to the driver, segmenting to the slice, confirming with an independent system, and ending with impact and action.

*Read more:* [SQLPad: investigating a metric drop (practice)](https://sqlpad.io/tutorial/data-analyst-case-interview-investigate-metric-drop/), [Amplitude: leading vs lagging indicators](https://amplitude.com/blog/map-your-metrics).

---

<a id="slide-14"></a>
## 14. Bug clinic: believable diagnosis mistakes

*Practice · symptom → cause → fix*

Most wrong explanations of a metric move come from skipping a step of the workflow. The first case is shown with SQL; the table collects the others from the lessons and the lab of this deck.

#### 1 · “Android conversion was 0 % on 3 March”

*SQL · believable, but wrong*

```sql
SELECT d.day, COALESCE(c.purchases / c.sessions, 0) AS android_conversion
FROM (SELECT UNNEST(generate_series(DATE '2026-03-02', DATE '2026-03-04', INTERVAL 1 DAY))::DATE AS day) d
LEFT JOIN conversion_daily c ON c.day = d.day AND c.platform = 'android'
ORDER BY d.day;
```

Result (3 rows):

| day | android_conversion |
|---|---|
| 2026-03-02 | 0.25 |
| 2026-03-03 | 0 |
| 2026-03-04 | 0.1153846154 |

*SQL · fixed*

```sql
SELECT d.day, ROUND(c.purchases / NULLIF(c.sessions, 0), 4) AS android_conversion
FROM (SELECT UNNEST(generate_series(DATE '2026-03-02', DATE '2026-03-04', INTERVAL 1 DAY))::DATE AS day) d
LEFT JOIN conversion_daily c ON c.day = d.day AND c.platform = 'android'
ORDER BY d.day;
```

Result (3 rows):

| day | android_conversion |
|---|---|
| 2026-03-02 | 0.25 |
| 2026-03-03 | NULL |
| 2026-03-04 | 0.1154 |

**Cause:** `COALESCE(rate, 0)` turned “no sessions” into “nobody bought”, hiding an outage as a conversion crisis. **Fix:** keep NULL for a zero denominator and show it as “–”; then the investigation asks the right question: why were there no sessions (lesson 7)?

#### Not a bug: “last month’s number changed”

February net sales by order date fell between 1 March and 25 March. That is restatement: refunds for February orders arrived in March (attribution dates, *Metric design* deck). The fix is a label (“restates for 30 days”) and, if needed, an “as reported” snapshot, not an investigation.

> **On the job:** Before opening an investigation, check the chart’s definition for restatement, maturity, and late data. Many “the number changed” tickets close at this step, before any analysis.

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 2 | Overall conversion fell the week a campaign launched, yet every channel was flat or up | Mix shift toward a lower-converting channel (Simpson’s paradox) | Split the change into rate and mix effects before blaming the product | 6 |
| 3 | A week-on-week “drop” reported on a Wednesday | An incomplete week compared with a complete one | Compare complete periods only; assert it in a test | 8, 11 |
| 4 | Monday’s app numbers for Sunday changed by Wednesday | Late-arriving app events | Measure lateness; report as known at a cutoff or wait for maturity | 11 |
| 5 | A traffic spike with flat orders is celebrated | A bot or scraper wave in raw sessions | Read customer sessions from the clean base; log what the bot rule removed | 4, 13 |
| 6 | A tracking bug is reported as an outage (or the reverse) | The cause was “confirmed” with the same event stream that moved | Confirm with an independent system: orders, support tickets | 7 |
| 7 | The team debugs checkout while the drop was in order value | The metric tree was skipped | Walk the tree first; follow the driver whose share of the change is largest | 5 |
| 8 | Driver shares don’t add up to the total change | Tree nodes that don’t multiply back to the top number | Check the identity with a query before decomposing | 5 |

> **On the job:** Interviewers grade “metric dropped” answers on these steps as much as on the final cause: data validation, a decomposition, segmentation with rate versus mix, an independent confirmation, and a sized impact.

> **The main idea:** most wrong explanations skip a step: validate the data, walk the tree, split rate from mix, and confirm with an independent source before you explain.

---

<a id="slide-15"></a>
## 15. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

“Metric X dropped, what do you do?” is the most common open-ended analytics interview case in the research behind this series, and “why might these numbers be wrong?” is its usual companion. Answer aloud in about a minute, then open the model answer. Metric-definition and SaaS questions are in the other two decks of the series.

<details><summary>“Conversion dropped 10 % last week. What do you do?” · *checks: structure, data validation before explanation, decomposition, segmentation*</summary>

**Model answer (about 60 seconds):** Clarify the metric and the comparison: which conversion, session or user grain, last week vs the week before, and how big normal weekly noise is. Then make sure the drop is real: did pipelines run, did tracking, the bot rule, or the definition change, is the week complete, is late data missing? Next decompose: conversion is purchases over sessions, so did purchases fall or sessions rise, for example with a bot wave or a new low-intent campaign? Then segment by platform, app version, country, channel, and new vs returning, and split rate from mix effects. Form hypotheses, such as a release on that platform, test them against an independent source like order or support data, size the impact, and recommend an action and monitoring.

**Likely follow-up:** “It’s only Android, starting Monday. What next?” → Check Android app versions and release dates, the funnel step where it breaks, error logs, and support tickets; estimate lost orders against Android’s normal rate; recommend a rollback or hotfix.

</details>

<details><summary>“It is Monday at 9:00. Why might last week’s numbers be wrong?” · *checks: observation limits, late data, time zones, exclusions*</summary>

**Model answer (about 60 seconds):** Several reasons. Late-arriving events: mobile apps upload offline events hours or days later, so Sunday is incomplete. Time zones: a UTC-based job may cut the week at the wrong midnight, or a fixed offset breaks after a daylight-saving change. Maturity: refunds, deliveries, and trial conversions for last week haven’t happened yet. Exclusions: a bot wave or test traffic may not be filtered yet. And the current week must never be compared with a full week. I’d check the arrival-time distribution, report complete and mature periods only, and label anything still maturing.

**Likely follow-up:** “How would you make Monday’s report reproducible later?” → Store arrival timestamps and filter “received at or before Monday 08:00” for an as-known-at snapshot, or persist the published table.

</details>

> **The main idea:** strong answers validate the data before explaining, then decompose, segment, confirm, size, and recommend.

---

<a id="slide-16"></a>
## 16. Exercises 1–2 · investigate and extend the WBR

*Exercises · debugging and a take-home*

Exercises use the Leafy warehouse (lesson 3) and the clean views from lesson 4. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · The ticket backlog nearly quadrupled. Real, and why?

**Pattern:** “metric moved, investigate”, stock vs flow · **Format:** debug a business number · **Target time:** about 20 minutes.

Support says the backlog at the end of the week of 16 March was nearly four times the previous week’s (lab step 4). Show whether this comes from more tickets opened (inflow) or slower closing (outflow), which category drove it, and connect it to another metric. Expected properties: your decomposition explains the whole change in backlog; one category accounts for most of the extra inflow.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Take-home: add refund rate to the WBR

**Pattern:** a full metric from spec to tested view · **Format:** take-home tied to the lab · **Target time:** 30–45 minutes.

The CFO wants “refund rate” in the weekly review. (1) Write the spec card: unit, numerator, denominator, attribution, maturity. (2) Create a view `wbr_refunds` with one row per order week: net sales, refunded amount to date, refund rate, and a `mature` flag (week end + 30 days ≤ load). (3) Test it: the view’s refunded total over all weeks equals the refunds in `clean_refunds`; refund rate is between 0 and 1; only mature weeks get a reportable rate.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

---

<a id="slide-17"></a>
## 17. Cheat sheet

*Reference · the deck on one page*

#### Spec card: the 17 fields

- Name and definition · business decision · owner
- Population · grain (unit and output row) · distinct keys
- Numerator · denominator (numerator ⊆ denominator)
- Time window and time zone · attribution date
- Exclusions · bot policy · missing and late data
- Zero-denominator rule · observation limits and maturity
- Refresh and latency · known caveats · version

#### Questions for any vague ask

- What decision will this change?
- Count what (unit), out of whom (population)?
- Which window, which time zone, which date attributes a row?
- Who is excluded (staff, test, bots)?
- What about late, missing, or immature data?
- Here are 2–3 readings with numbers: which one?

| Task | DuckDB pattern | Where |
|---|---|---|
| Zero denominator | `num * 1.0 / NULLIF(den, 0)` | Metric design deck |
| Show empty days | date spine: `UNNEST(generate_series(d1, d2, INTERVAL 1 DAY))` + `LEFT JOIN` | Metric design deck |
| As known at a cutoff | `WHERE received_at_utc <= cutoff` | Metric design deck |
| Maturity mask | `CASE WHEN cohort_end + window <= load THEN rate END` | Metric design deck |
| Overall rate | `SUM(num) / SUM(den)`, never `AVG(rate)` | Metric design deck |
| Rate vs mix effect | `Σ (r₂ − r₁)(m₁ + m₂)/2` and `Σ (m₂ − m₁)(r₁ + r₂)/2` | 6 |
| Driver shares in a tree | `LN(x₂ / x₁) / LN(total₂ / total₁)` | 5 |
| Stock roll-up | end-of-period value; check start + in − out = end | Business models and metrics deck |

> **On the job:** Keep the 17 fields and the question list next to you during stakeholder conversations and interviews; keep the pattern table next to you when writing the SQL.

> **The main idea:** define with the card, implement with the patterns, test with the invariants (unique keys, numerator ≤ denominator, reconciliation to a control total).

---

<a id="slide-18"></a>
## 18. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Additive / semi-additive / non-additive | Can be summed over every dimension / over all but time / not at all (ratios, distinct counts, percentiles). |
| AOV | Average order value: a sales amount ÷ number of orders, over the same orders. |
| As known at | A number computed only from data that had arrived by a cutoff time. |
| Backlog | Open items at a point in time; a stock. |
| Bot policy | The written rule that identifies non-human traffic (user-agent list plus behaviour rules). |
| Bridge (reconciliation) | A step-by-step explanation from one number to another, one rule per step, ending exactly on the target. |
| Censoring (right, left) | Outcomes not yet observed because data ends (right) or starts (left) mid-way. |
| Component table | A table that stores numerators and denominators (additive parts) instead of ratios. |
| Counter-metric / guardrail | A metric that must not degrade while another is optimised. |
| Date spine | A table with one row per calendar date, used to show empty periods. |
| Denominator / numerator | What a rate divides by / what it counts on top; the numerator is a subset of the denominator. |
| Exclusions | Rows removed from every metric for a stated reason (staff, QA, cancelled). |
| Flow / stock | Quantity during a period (adds over time) / level at a point in time (does not). |
| Late-arriving event | An event that reaches the warehouse long after it happened. |
| Maturity | A period or cohort is mature when every unit has had its full outcome window. |
| Metric | A number computed by a precise, repeatable rule from data, used to make a decision. |
| Metric tree | An exact formula of an output metric in terms of drivers, broken down level by level. |
| Mix effect / rate effect | Change in a blended rate caused by changing weights / by changing segment rates. |
| MRR, MRR bridge | Monthly recurring revenue at a point in time; its change split into new, expansion, contraction, churn. |
| Observation limit | The edge of what the data can show: incomplete periods and outcomes not yet observed. |
| Population | The set of units eligible to be counted: the denominator. |
| Restatement | A published number changing later because new data arrived. |
| Simpson’s paradox | A trend in every segment reverses in the total because the mix changed. |
| Time window | The period a metric covers: a calendar period or a rolling window. |
| Zero denominator | A segment with no eligible units; its rate is NULL, not 0. |

> **The main idea:** if a term on a dashboard is not in a glossary like this one, with a spec card behind it, it is not yet a metric.

---

<a id="slide-19"></a>
## 19. Recap and practice plan

*Reference · what to remember*

1. Before explaining a move, prove it is real: pipelines ran, definitions and bot rules unchanged, periods complete, late data accounted for.
2. Walk the metric tree to the driver that moved; log shares say how much each driver explains and add to 1.
3. Segment the moving driver until the change is localised; split rate effects from mix effects.
4. A blended rate can fall while every segment improves (Simpson’s paradox): look at the weights.
5. Confirm the cause with an independent system (order service, support tickets), not with the same events again.
6. Size the impact against a normal baseline and end with an action and how you will monitor recovery.
7. A WBR is a fixed set of spec’d metrics from one clean base, with tests that fail loudly before the meeting.
8. Write the answer in three to five lines: what moved, why, evidence, impact, action.

#### Practice plan (one week)

- Day 1: redo lessons 5–7 from memory: draw Leafy’s tree, repeat the rate/mix split, recite the six workflow steps.
- Day 2: the lab end to end in 90 minutes; write the five-line summary.
- Day 3: exercise 1 without hints; then explain the backlog change aloud in three sentences.
- Day 4: exercise 2 (the take-home) and its reconciliation test.
- Day 5: the two interview answers aloud, then one metric-drop case from the practice link below.

#### Further practice

- [SQLPad: investigating a metric drop](https://sqlpad.io/tutorial/data-analyst-case-interview-investigate-metric-drop/) (case structure; compare with lesson 7 and the lab).
- Take any chart that moved at work last month and write the three-sentence answer: what moved, why, and what to do.

> **The main idea:** validate, decompose, segment, confirm, size, and recommend: that order turns “the number dropped” into a decision.

---

<a id="slide-20"></a>
## 20. References and how this deck was tested

*References · official documentation and what to read there*

| Source | What to read there |
|---|---|
| [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz) | `AT TIME ZONE`, ICU, how session time zones affect display. |
| [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [FILTER](https://duckdb.org/docs/stable/sql/query_syntax/filter) | `COUNT(DISTINCT)`, `quantile_cont`, `median`, `corr`, filtered aggregates. |
| [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view) | Multi-grain roll-ups, reusable expressions, the base layer. |
| [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/) | Why ratios and balances need special roll-up rules. |
| [Amplitude: north star metric](https://amplitude.com/blog/product-north-star-metric), [leading vs lagging](https://amplitude.com/blog/map-your-metrics) | North star selection and metric trees in practice. |

**How this deck was tested:** DuckDB 1.5.6 on CPython 3.12.10 (pandas 3.0.6 for loading), Windows 11. Every DuckDB query and Python block ran during the build; the build fails on any error, unexpected result, or unordered multi-row result. T-SQL, Fabric Warehouse, Spark SQL, dbt YAML, and DAX snippets are reference only. Interview patterns were researched in October 2026; all questions are original.

> **The main idea:** official documentation for the syntax, the spec card for the meaning: you need both for every metric.

---

<a id="slide-21"></a>
## 21. Appendix: the Leafy data generator (lab spoilers)

*Reference · make_leafy.py, the full source*

This script built `leafy.duckdb` for every query in the deck (lesson 3 ran it). It is deterministic: one seed per table, fixed dates, no network. Read it after the lab: the constants near the top are the answers to several exercises. Run it with `python make_leafy.py` in the environment from lesson 2.

```python
"""make_leafy.py: build leafy.duckdb, the Leafy metrics warehouse used in this deck.

Deterministic: the same seed gives the same rows on every machine. All timestamps are stored in UTC
(columns ending in _utc); Leafy's business time zone is America/Chicago. Data is loaded up to
AS_OF_UTC, a Wednesday morning, so the current week and month are incomplete on purpose.
"""
import datetime as dt
import math
import random
from zoneinfo import ZoneInfo

import duckdb
import pandas as pd

SEED = 2026
CHI, UTC = ZoneInfo("America/Chicago"), ZoneInfo("UTC")
FIRST_DAY = dt.date(2026, 1, 26)                     # a Monday
AS_OF_UTC = dt.datetime(2026, 3, 25, 15, 0)          # Wed 25 Mar 2026, 10:00 in Chicago
ANDROID_OUTAGE = dt.date(2026, 3, 3)                 # app down all day: zero Android sessions
ANDROID_RELEASE = dt.date(2026, 3, 16)               # app 5.3 ships with a checkout bug
SCRAPER_DAYS = (dt.date(2026, 3, 16), dt.date(2026, 3, 22))
rng = random.Random(SEED)


def day_bounds_utc(d):
    """UTC start and end of a Chicago calendar day (23 or 25 hours long on DST days)."""
    start = dt.datetime(d.year, d.month, d.day, tzinfo=CHI).astimezone(UTC)
    nxt = d + dt.timedelta(days=1)
    end = dt.datetime(nxt.year, nxt.month, nxt.day, tzinfo=CHI).astimezone(UTC)
    return start.replace(tzinfo=None), end.replace(tzinfo=None)


def local_date(ts_utc):
    return ts_utc.replace(tzinfo=UTC).astimezone(CHI).date()


def days(a, b):
    while a <= b:
        yield a
        a += dt.timedelta(days=1)


# ---------- users ----------
users = []
for uid in range(1, 901):                            # existing customers
    signup = dt.datetime(2025, 10, 1) + dt.timedelta(minutes=rng.randrange(0, 117 * 1440))
    users.append(dict(user_id=uid, signup_at_utc=signup))
uid = 901
for d in days(FIRST_DAY, dt.date(2026, 3, 24)):      # about 12 new sign-ups a day
    lo, hi = day_bounds_utc(d)
    for _ in range(rng.choice([8, 10, 12, 12, 14, 16])):
        users.append(dict(user_id=uid, signup_at_utc=lo + (hi - lo) * rng.random()))
        uid += 1
for u in users:
    u["country"] = rng.choices(["US", "CA", None], [80, 15, 5])[0]
    u["is_internal"] = u["user_id"] <= 6                 # Leafy staff
    u["is_test"] = 7 <= u["user_id"] <= 9                # QA accounts
    u["weight"] = rng.lognormvariate(0, 1.0)             # how often this person visits
    u["signup_at_utc"] = u["signup_at_utc"].replace(microsecond=0)
customers = [u for u in users if not (u["is_internal"] or u["is_test"])]

PRICES = [12.99, 18.50, 24.00, 29.99, 36.00, 44.50, 58.00, 74.99]
SELLERS = [(1, "Leafy", True, None, "2020-01-01"), (2, "Fern & Co", False, 0.15, "2025-03-01"),
           (3, "Cactus Club", False, 0.15, "2025-06-15"), (4, "Bonsai Barn", False, 0.12, "2025-09-01"),
           (5, "Moss Market", False, 0.15, "2025-11-20"), (6, "Orchid Hub", False, 0.10, "2026-01-10"),
           (7, "Rare Roots", False, 0.15, "2026-02-01")]
UA = {"web": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0",
      "ios": "LeafyApp/5.2 (iOS 19.1)", "android": "LeafyApp/5.2 (Android 16)"}
BOT_UA = ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          "python-requests/2.32.3", "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/138.0"]

events, orders, sess_no, ev_no = [], [], 0, 0
checkout_failures = []                                  # (time, platform) for support tickets


def add_event(session_id, user_id, anon_id, name, ts, platform, ua):
    global ev_no
    ev_no += 1
    if platform == "web":
        recv = ts + dt.timedelta(seconds=rng.randint(2, 30))
    elif rng.random() < 0.07:                           # phone was offline: arrives hours later
        recv = ts + dt.timedelta(hours=rng.randint(6, 60))
    else:
        recv = ts + dt.timedelta(seconds=rng.randint(5, 120))
    row = dict(event_id="e%06d" % ev_no, session_id=session_id, user_id=user_id, anon_id=anon_id,
               event_name=name, platform=platform, user_agent=ua, event_at_utc=ts, received_at_utc=recv)
    if recv <= AS_OF_UTC:
        events.append(row)
        if rng.random() < 0.02:                          # at-least-once delivery: a duplicate copy
            events.append(dict(row, received_at_utc=recv + dt.timedelta(minutes=rng.randint(1, 10))))


def basket():
    items = sum(rng.choice(PRICES) for _ in range(rng.choice([1, 1, 1, 2, 2, 3])))
    disc = round(items * 0.10, 2) if rng.random() < 0.18 else 0.0
    ship = 0.0 if items >= 50 else 6.95
    return round(items, 2), disc, ship


def session(start, platform, user, kind="human", signup=False):
    """One visit. kind: human, bot (crawler user agent), scraper (browser user agent, bot behaviour)."""
    global sess_no
    sess_no += 1
    sid = "s%05d" % sess_no
    uid_ = user["user_id"] if user else None
    anon = None if user else "a%05d" % rng.randrange(100000)
    ua = UA[platform]
    if platform == "android" and local_date(start) >= ANDROID_RELEASE:
        ua = "LeafyApp/5.3 (Android 16)"
    if kind == "bot":
        ua = rng.choice(BOT_UA)
    t = start
    add_event(sid, uid_, anon, "session_start", t, platform, ua)
    if signup:
        t += dt.timedelta(seconds=rng.randint(30, 180))
        add_event(sid, uid_, anon, "sign_up", t, platform, ua)
    if kind in ("bot", "scraper"):
        for _ in range(rng.randint(5, 25) if kind == "bot" else rng.randint(40, 80)):
            t += dt.timedelta(seconds=rng.randint(2, 9))
            add_event(sid, uid_, anon, "view_product", t, platform, ua)
        return
    quick_add = False
    if rng.random() >= 0.85:
        if not user or rng.random() >= 0.3:
            return
        quick_add = True                                # "quick add" from the home page: no product view
    for _ in range(0 if quick_add else rng.randint(1, 4)):
        t += dt.timedelta(seconds=rng.randint(20, 240))
        add_event(sid, uid_, anon, "view_product", t, platform, ua)
    if not quick_add and rng.random() >= (0.38 if user else 0.20):
        return
    t += dt.timedelta(seconds=rng.randint(20, 300))
    add_event(sid, uid_, anon, "add_to_cart", t, platform, ua)
    if not user or rng.random() >= 0.72:
        return
    t += dt.timedelta(seconds=rng.randint(30, 600))
    add_event(sid, uid_, anon, "checkout_start", t, platform, ua)
    buggy = platform == "android" and local_date(t) >= ANDROID_RELEASE
    if rng.random() >= (0.20 if buggy else 0.78):
        checkout_failures.append((t, platform))
        return
    t += dt.timedelta(seconds=rng.randint(30, 300))
    if t > AS_OF_UTC:
        return
    add_event(sid, uid_, anon, "purchase", t, platform, ua)
    items, disc, ship = basket()
    test = user["is_test"]
    seller = 1 if test or rng.random() < 0.6 else rng.choices([2, 3, 4, 5, 6, 7], [30, 20, 15, 15, 10, 10])[0]
    orders.append(dict(order_id=10001 + len(orders), user_id=uid_, session_id=sid, platform=platform,
                       seller_id=seller, placed_at_utc=t.replace(microsecond=0),
                       status="cancelled" if rng.random() < 0.04 else "completed",
                       items_amount=1.00 if test else items, discount_amount=0.0 if test else disc,
                       shipping_amount=0.0 if test else ship))


BASE = {"web": 100, "ios": 55, "android": 65}
for d in days(FIRST_DAY, local_date(AS_OF_UTC)):
    lo, hi = day_bounds_utc(d)
    hi = min(hi, AS_OF_UTC)
    age = (d - FIRST_DAY).days
    eligible = [u for u in customers if u["signup_at_utc"] < lo]
    w = [u["weight"] * (0.6 + 1.6 * math.exp(-(lo - u["signup_at_utc"]).days / 12)) for u in eligible]
    for platform, base in BASE.items():
        if platform == "android" and d == ANDROID_OUTAGE:
            continue
        n = round(base * (1.25 if d.weekday() >= 5 else 1.0) * (1 + 0.003 * age) * rng.uniform(0.9, 1.1))
        for _ in range(n):
            start = lo + (hi - lo) * rng.random()
            user = rng.choices(eligible, w)[0] if rng.random() < 0.72 else None
            session(start.replace(microsecond=0), platform, user)
    for u in users:                                     # every sign-up happens in a session
        if lo <= u["signup_at_utc"] < hi and not (u["is_internal"] or u["is_test"]):
            platform = rng.choice(["web", "web", "ios", "android"])
            if not (platform == "android" and d == ANDROID_OUTAGE):
                session(u["signup_at_utc"] - dt.timedelta(minutes=2), platform, u, signup=True)
    if d.weekday() < 5:                                  # staff and QA use production too
        for u in users[:9]:
            session(lo + (hi - lo) * rng.uniform(0.3, 0.7), "web", u)
    n_bots = 20 + (180 if SCRAPER_DAYS[0] <= d <= SCRAPER_DAYS[1] else 0)
    for _ in range(n_bots):
        session(lo + (hi - lo) * rng.random(), "web", None, kind="bot")
    if dt.date(2026, 3, 17) <= d <= dt.date(2026, 3, 19):
        for _ in range(40):
            session(lo + (hi - lo) * rng.random(), "web", None, kind="scraper")

# ---------- refunds (often in a later period than the order) ----------
rng = random.Random(SEED + 1)                           # one random stream per table
refunds = []
for o in orders:
    if o["status"] == "completed" and o["items_amount"] > 1 and rng.random() < 0.07:
        at = o["placed_at_utc"] + dt.timedelta(days=rng.randint(3, 30), minutes=rng.randrange(1440))
        if at <= AS_OF_UTC:
            full = rng.random() < 0.7
            refunds.append(dict(refund_id=len(refunds) + 1, order_id=o["order_id"], refunded_at_utc=at,
                                amount=round(o["items_amount"] - o["discount_amount"], 2) if full
                                else round((o["items_amount"] - o["discount_amount"]) / 2, 2)))

# ---------- shipments ----------
rng = random.Random(SEED + 2)
shipments, late_promises = [], []
for o in orders:
    u = users[o["user_id"] - 1]
    if o["status"] != "completed" or u["is_test"]:
        continue
    slow = o["seller_id"] == 7
    shipped = o["placed_at_utc"] + dt.timedelta(hours=rng.randint(24, 96) if slow else rng.randint(6, 48))
    delivered = shipped + dt.timedelta(hours=rng.randint(20, 110) + (48 if rng.random() < 0.08 else 0))
    promised = local_date(o["placed_at_utc"]) + dt.timedelta(days=6)
    if rng.random() < 0.004:
        delivered = None                                 # lost in transit
    shipments.append(dict(order_id=o["order_id"], carrier=rng.choice(["UPS", "USPS"]),
                          shipped_at_utc=shipped if shipped <= AS_OF_UTC else None,
                          delivered_at_utc=delivered if delivered and delivered <= AS_OF_UTC else None,
                          promised_date=promised))
    if delivered and local_date(delivered) > promised:
        late_promises.append((o["order_id"], promised))

# ---------- support tickets ----------
rng = random.Random(SEED + 3)
tickets = []


def ticket(opened, order_id, category):
    closed = opened + dt.timedelta(hours=rng.randint(1, 72))
    if opened <= AS_OF_UTC:
        tickets.append(dict(ticket_id=len(tickets) + 1, order_id=order_id, category=category,
                            opened_at_utc=opened.replace(microsecond=0),
                            closed_at_utc=closed.replace(microsecond=0) if closed <= AS_OF_UTC else None))


for d in days(FIRST_DAY, local_date(AS_OF_UTC)):
    lo, hi = day_bounds_utc(d)
    for _ in range(rng.randint(2, 5)):
        ticket(lo + (hi - lo) * rng.random(), None, rng.choice(["account", "product", "product"]))
for order_id, promised in late_promises:               # late parcels create tickets a day or two later
    if rng.random() < 0.5:
        lo, hi = day_bounds_utc(promised + dt.timedelta(days=rng.randint(1, 2)))
        ticket(lo + (hi - lo) * rng.random(), order_id, "delivery")
for t, platform in checkout_failures:
    if rng.random() < (0.30 if platform == "android" and local_date(t) >= ANDROID_RELEASE else 0.05):
        ticket(t + dt.timedelta(minutes=rng.randint(5, 240)), None, "checkout")

# ---------- marketplace listings (third-party supply) ----------
rng = random.Random(SEED + 4)
listings = []
for d in days(dt.date(2026, 1, 12), local_date(AS_OF_UTC)):
    lo, hi = day_bounds_utc(d)
    for _ in range(rng.randint(3, 6)):
        seller = rng.choices([2, 3, 4, 5, 6, 7], [30, 20, 15, 15, 10, 10])[0]
        if d < dt.date.fromisoformat(SELLERS[seller - 1][4]):
            continue
        listed = (lo + (hi - lo) * rng.random()).replace(microsecond=0)
        sold = None
        if rng.random() < (0.35 if seller == 7 else 0.65):
            sold = listed + dt.timedelta(hours=rng.expovariate(1 / (14 * 24 if seller == 7 else 6 * 24)))
            sold = sold.replace(microsecond=0) if sold <= AS_OF_UTC else None
        listings.append(dict(listing_id=len(listings) + 1, seller_id=seller, listed_at_utc=listed,
                             price=rng.choice(PRICES) * (3 if seller == 7 else 1), sold_at_utc=sold))

# ---------- Leafy Plus subscriptions (SaaS) ----------
rng = random.Random(SEED + 5)
PLANS = {"monthly": 9.00, "annual": 8.00, "premium": 15.00, "staff": 0.00}
trials, periods = [], []


def add_period(user_id, plan, start, end):
    periods.append(dict(user_id=user_id, plan=plan, mrr=PLANS[plan], valid_from=start, valid_to=end))


for u in users[:6]:                                      # staff get Plus for free
    add_period(u["user_id"], "staff", dt.date(2025, 10, 1), None)
as_of_day = local_date(AS_OF_UTC)
for d in days(dt.date(2025, 10, 6), dt.date(2026, 3, 24)):
    pool = [u for u in customers if local_date(u["signup_at_utc"]) <= d]
    for _ in range(rng.choice([3, 4, 5, 6] if d >= FIRST_DAY else [1, 2, 3, 3])):
        u = rng.choice(pool)
        if any(t["user_id"] == u["user_id"] for t in trials):
            continue
        end = d + dt.timedelta(days=14)
        trials.append(dict(user_id=u["user_id"], trial_start=d, trial_end=end))
        if end > as_of_day or rng.random() >= 0.45:
            continue                                     # still in trial, or did not convert
        plan = rng.choices(["monthly", "annual", "premium"], [65, 25, 10])[0]
        period_start = renewal = end
        while True:
            nxt = renewal + dt.timedelta(days=365 if plan == "annual" else 30)
            if nxt > as_of_day:
                add_period(u["user_id"], plan, period_start, None)
                break
            r = rng.random()
            if plan != "annual" and r < 0.07:            # cancels at renewal
                add_period(u["user_id"], plan, period_start, nxt)
                break
            if plan == "monthly" and r < 0.17:           # upgrades
                add_period(u["user_id"], plan, period_start, nxt)
                plan, period_start = "premium", nxt
            elif plan == "premium" and r < 0.13:         # downgrades
                add_period(u["user_id"], plan, period_start, nxt)
                plan, period_start = "monthly", nxt
            renewal = nxt                                # renews (same plan or the new one)

# ---------- load into DuckDB ----------
DDL = """
CREATE TABLE users (user_id INTEGER PRIMARY KEY, signup_at_utc TIMESTAMP, country VARCHAR,
                    is_internal BOOLEAN, is_test BOOLEAN);
CREATE TABLE events (event_id VARCHAR, session_id VARCHAR, user_id INTEGER, anon_id VARCHAR,
                     event_name VARCHAR, platform VARCHAR, user_agent VARCHAR,
                     event_at_utc TIMESTAMP, received_at_utc TIMESTAMP);
CREATE TABLE sellers (seller_id INTEGER PRIMARY KEY, seller_name VARCHAR, is_first_party BOOLEAN,
                      commission_rate DECIMAL(4,2), joined_on DATE);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, user_id INTEGER, session_id VARCHAR, platform VARCHAR,
                     seller_id INTEGER, placed_at_utc TIMESTAMP, status VARCHAR,
                     items_amount DECIMAL(10,2), discount_amount DECIMAL(10,2), shipping_amount DECIMAL(10,2));
CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY, order_id INTEGER, refunded_at_utc TIMESTAMP,
                      amount DECIMAL(10,2));
CREATE TABLE shipments (order_id INTEGER PRIMARY KEY, carrier VARCHAR, shipped_at_utc TIMESTAMP,
                        delivered_at_utc TIMESTAMP, promised_date DATE);
CREATE TABLE tickets (ticket_id INTEGER PRIMARY KEY, order_id INTEGER, category VARCHAR,
                      opened_at_utc TIMESTAMP, closed_at_utc TIMESTAMP);
CREATE TABLE listings (listing_id INTEGER PRIMARY KEY, seller_id INTEGER, listed_at_utc TIMESTAMP,
                       price DECIMAL(10,2), sold_at_utc TIMESTAMP);
CREATE TABLE plus_trials (user_id INTEGER, trial_start DATE, trial_end DATE);
CREATE TABLE plus_periods (user_id INTEGER, plan VARCHAR, mrr DECIMAL(10,2), valid_from DATE, valid_to DATE);
"""
TABLES = {
    "users": pd.DataFrame(users).drop(columns="weight"),
    "events": pd.DataFrame(sorted(events, key=lambda e: (e["received_at_utc"], e["event_id"]))),
    "sellers": pd.DataFrame(SELLERS, columns=["seller_id", "seller_name", "is_first_party", "commission_rate", "joined_on"]),
    "orders": pd.DataFrame(orders), "refunds": pd.DataFrame(refunds), "shipments": pd.DataFrame(shipments),
    "tickets": pd.DataFrame(tickets), "listings": pd.DataFrame(listings),
    "plus_trials": pd.DataFrame(trials), "plus_periods": pd.DataFrame(periods),
}
with duckdb.connect("leafy.duckdb") as con:
    for name in TABLES:
        con.execute("DROP TABLE IF EXISTS " + name)
    con.execute(DDL)
    for name, df in TABLES.items():
        con.register("df", df)
        con.execute(f"INSERT INTO {name} SELECT * FROM df")
        con.unregister("df")
    for name in TABLES:
        print(f"{name:<13}{con.sql('SELECT COUNT(*) FROM ' + name).fetchone()[0]:>7,} rows")
```

> **On the job:** Synthetic, seeded data with deliberately planted traps is also how data teams test metric pipelines: a fixture where you know the right answer (a known outage day, a known duplicate rate) turns metric logic into unit-testable code.

> **The main idea:** a small generator with known traps is the best way to test metric definitions, in a course and in a real pipeline.

*Read more:* [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · The ticket backlog nearly quadrupled. Real, and why?

Backlog is a stock: end = start + opened − closed. Compute the three flows for each week, then break opened tickets down by category, and look at the Android funnel from the lab.

<a id="hint-2"></a>
### Hint 2 · Take-home: add refund rate to the WBR

Attribute refunds to the order’s week (attribution dates, *Metric design* deck), sum them to order level before joining, and reuse the maturity pattern (observation limits, *Metric design* deck).

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · The ticket backlog nearly quadrupled. Real, and why?

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

def backlog_at(ts):
    return con.execute(f"""SELECT COUNT(*) FROM tickets WHERE local_ts(opened_at_utc) < TIMESTAMP '{ts}'
                           AND (closed_at_utc IS NULL OR local_ts(closed_at_utc) >= TIMESTAMP '{ts}')""").fetchone()[0]

def flows(start, end):
    return con.execute(f"""
        SELECT COUNT(*) FILTER (WHERE local_ts(opened_at_utc) >= TIMESTAMP '{start}' AND local_ts(opened_at_utc) < TIMESTAMP '{end}'),
               COUNT(*) FILTER (WHERE local_ts(closed_at_utc) >= TIMESTAMP '{start}' AND local_ts(closed_at_utc) < TIMESTAMP '{end}')
        FROM tickets""").fetchone()

for start, end in [("2026-03-09", "2026-03-16"), ("2026-03-16", "2026-03-23")]:
    b0, b1 = backlog_at(start), backlog_at(end)
    opened, closed = flows(start, end)
    print(f"week {start}: start {b0} + opened {opened} - closed {closed} = end {b1}")
    assert b0 + opened - closed == b1                    # the stock identity holds

by_cat = con.execute("""
    SELECT category,
           COUNT(*) FILTER (WHERE local_ts(opened_at_utc)::DATE BETWEEN DATE '2026-03-16' AND DATE '2026-03-22')
         - COUNT(*) FILTER (WHERE local_ts(opened_at_utc)::DATE BETWEEN DATE '2026-03-09' AND DATE '2026-03-15') AS extra
    FROM tickets GROUP BY category ORDER BY extra DESC""").fetchall()
print("extra tickets opened by category:", by_cat)
total_extra = sum(x for _, x in by_cat)
assert by_cat[0][0] == "checkout" and by_cat[0][1] > 0.5 * total_extra
```

Output:

```text
week 2026-03-09: start 5 + opened 37 - closed 37 = end 5
week 2026-03-16: start 5 + opened 61 - closed 47 = end 19
extra tickets opened by category: [('checkout', 27), ('delivery', 2), ('account', -1), ('product', -4)]
```

**Why it works.** The stock identity splits the backlog change into inflow and outflow exactly. Inflow rose, and almost all the extra tickets are checkout problems, which matches the Android checkout collapse after app 5.3 (lab step 5): one root cause, visible in a guardrail and in the funnel. **Common wrong answer:** summing daily backlogs (the ticket-backlog lesson in the *Business models and metrics* deck) or blaming the support team’s speed without checking inflow. **Interviewer follow-up:** “How would you have caught it earlier?” → a daily alert on checkout→purchase by platform and app version, with tickets per 100 orders as a guardrail.

<a id="solution-2"></a>
### Solution 2 · Take-home: add refund rate to the WBR

| Field | Spec: refund rate |
|---|---|
| **Definition** | Refund rate: refunded amount ÷ net sales of the orders placed in the week. |
| **Unit and attribution** | Order; refunds attributed to the order’s Chicago week (restates). |
| **Maturity** | 30 days after the week ends; earlier weeks are “maturing” and get no reportable rate. |
| **Zero denominator** | NULL. |

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

con.execute("""
    CREATE OR REPLACE VIEW wbr_refunds AS
    WITH r AS (SELECT order_id, SUM(amount) AS refunded FROM clean_refunds GROUP BY order_id),
    w AS (
        SELECT date_trunc('week', o.order_date)::DATE AS week,
               SUM(o.net_items)                       AS net_sales,
               COALESCE(SUM(r.refunded), 0)           AS refunded_to_date
        FROM clean_orders o LEFT JOIN r USING (order_id)
        GROUP BY 1
    )
    SELECT w.*,
           ROUND(refunded_to_date / NULLIF(net_sales, 0), 4)                 AS refund_rate,
           w.week + 7 + 30 <= l.current_day                                  AS mature,
           CASE WHEN w.week + 7 + 30 <= l.current_day
                THEN ROUND(refunded_to_date / NULLIF(net_sales, 0), 4) END   AS reportable_rate
    FROM w CROSS JOIN load_info l""")
rows = con.execute("SELECT * FROM wbr_refunds ORDER BY week").fetchall()
for r in rows:
    print(*r)

view_total = sum(r[2] for r in rows)
base_total = con.execute("SELECT SUM(amount) FROM clean_refunds").fetchone()[0]
assert view_total == base_total
assert all(0 <= r[3] <= 1 for r in rows)
assert all((r[5] is None) != r[4] for r in rows)
```

Output:

```text
2026-01-26 13853.75 1003.38 0.0724 True 0.0724
2026-02-02 16519.50 1067.40 0.0646 True 0.0646
2026-02-09 16182.56 1018.01 0.0629 True 0.0629
2026-02-16 15019.57 741.70 0.0494 True 0.0494
2026-02-23 15989.79 796.41 0.0498 False None
2026-03-02 16434.70 722.35 0.044 False None
2026-03-09 16616.72 439.95 0.0265 False None
2026-03-16 13669.33 100.98 0.0074 False None
2026-03-23 5329.30 0.00 0.0 False None
```

**Why it works.** Pre-aggregating refunds per order keeps the join one-to-one (no fan-out when an order has two refunds), and the reconciliation assert proves no refund was lost or double-counted. The maturity flag stops the newest weeks from showing a falsely low rate. **Common wrong answer:** refunds booked in the week they were paid divided by that week’s sales: a cash ratio mixing different orders. **Interviewer follow-up:** “Finance wants refunds by refund date” → add that as a second, separately named metric and reconcile the two with a bridge (governance, *Metric design* deck).
