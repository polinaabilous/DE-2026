# Business models and metrics: commerce, SaaS, marketplace, product, operations

*Companion to `business-metrics-models.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, pandas 3.0.6 (only to load the generated data), Windows 11 (64-bit). SQL is DuckDB’s PostgreSQL-flavoured dialect. Where interviews ask, lessons add notes for SQL Server (T-SQL), Microsoft Fabric Warehouse (T-SQL), and Spark SQL; that other-dialect syntax is reference only and was not executed. Every DuckDB query in this document ran while it was built, and the result under it is the real result. The data is synthetic and deterministic: `make_leafy.py` (lesson 3, source in the last slide) rebuilds exactly the same warehouse on any machine.

**Series:** this is deck 1 of 3 on business metrics. Deck 2, *Metric design*, teaches how to write each spec-card field (population, grain, time window and time zone, attribution, exclusions, missing and late data, zero denominators, maturity) and the rules for ratios and metric systems; deck 3, *Diagnosing metric changes*, explains moves in these metrics and ends with the weekly-business-review lab. All three use the same Leafy warehouse and clean base; lessons 4–5 of this deck summarise what you need from deck 2.

**Prerequisites:** the SQL windows deck (window functions, `QUALIFY`), the dimensional-modelling deck (grain, facts and dimensions, additive and semi-additive measures), and “SQL correctness: joins, grain, NULLs, and aggregation” (fan-out, NULL logic, weighted ratios, `FILTER`, integer division). This deck builds on them and does not re-teach them. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common metric, product-sense and analytics-engineering interview patterns (research done in October 2026: active users and DAU/MAU SQL, retention, funnels, SaaS churn and NRR, marketplace take rate). All questions are original and use the Leafy data.

**Additions beyond the original brief** are marked *(added)*: funnel definitions: step order and conversion windows; cohort retention and maturity; percentiles and stock-vs-flow metrics for operations.

## Contents

1. [Business models and metrics: commerce, SaaS, marketplace, product, operations](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and dialect](#slide-2)
3. [The running example: the Leafy metrics warehouse](#slide-3)
4. [How to read the spec cards in this deck](#slide-4)
5. [The clean base every query reads](#slide-5)
6. [Commerce: net sales and average order value](#slide-6)
7. [SaaS: MRR and its movements](#slide-7)
8. [SaaS: churn, GRR, and NRR](#slide-8)
9. [Marketplace: GMV, net revenue, and take rate](#slide-9)
10. [Marketplace: liquidity and sell-through](#slide-10)
11. [Product: DAU, WAU, MAU, and stickiness](#slide-11)
12. [Product: funnel definitions](#slide-12)
13. [Product: retention cohorts and maturity](#slide-13)
14. [Operations: on-time delivery and percentiles](#slide-14)
15. [Operations: ticket backlog, a stock not a flow](#slide-15)
16. [Bug clinic: believable business-metric bugs](#slide-16)
17. [Interview questions and model answers](#slide-17)
18. [Exercises 1–2 · operations and marketplace](#slide-18)
19. [Exercises 3–4 · cohorts and churn](#slide-19)
20. [Cheat sheet](#slide-20)
21. [Glossary](#slide-21)
22. [Recap and practice plan](#slide-22)
23. [References and how this deck was tested](#slide-23)
24. [Appendix: the Leafy data generator (spoilers for the WBR lab)](#slide-24)
25. [Appendix A · Hints](#appendix-a)
26. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Business models and metrics: commerce, SaaS, marketplace, product, operations

**

Every business model has a handful of headline numbers: net sales and AOV, MRR and churn, GMV and take rate, active users and retention, on-time rate and backlog. Interviewers expect you to know them, and teams expect you to compute them correctly. This deck works through each one on the same small warehouse: a written definition (a **metric spec card**) first, then the query, then the traps.

- **Start here:** setup, the Leafy warehouse, how to read a spec card, and the clean base every query reads.
- **Part A, commerce and SaaS:** net sales and average order value, MRR and its bridge, logo churn, GRR and NRR.
- **Part B, marketplace:** GMV, net revenue, take rate, liquidity and sell-through.
- **Part C, product:** DAU, WAU, MAU and stickiness, funnel definitions, retention cohorts and maturity.
- **Part D, operations:** on-time delivery and percentiles, ticket backlog (a stock, not a flow).
- **Practice:** a bug clinic, interview questions with model answers, and 4 exercises.

This is deck 1 of 3 in the business-metrics series. Deck 2, *Metric design*, teaches how to write each spec-card field and the rules for ratios and metric systems; deck 3, *Diagnosing metric changes*, explains moves in these metrics. Every query ran in DuckDB while the deck was built; the result under each query is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Every company runs on a few headline numbers, and which numbers depends on how it makes money: a shop watches net sales and order value, a subscription business watches MRR and churn, a marketplace watches GMV and take rate, an app watches active users and retention, and operations watch on-time rates and queues. Analytics and data engineers are expected to know these metrics by name, to compute them from raw tables without the classic mistakes, and to say which variant a dashboard shows. This deck works through each family on one warehouse, with a spec card and an executed query per metric.

#### Where you will use it

- Building the first trading, subscription, or engagement dashboard for a team.
- Monthly reviews: MRR bridges, churn, cohort tables, seller performance.
- Answering “what’s our churn / take rate / DAU?” for a stakeholder or an investor deck.
- Operations reporting: SLA rates by carrier or seller, backlog for staffing.
- Interviews for product, growth, and analytics-engineering roles.

#### What goes wrong without it

- GMV reported as revenue in a board deck.
- Churn inflated by new subscribers who were never in the starting cohort.
- DAUs summed into a “weekly” number that counts regulars seven times.
- Immature cohorts or parcels in transit shown as failures.
- A backlog summed over days, sending staff to the wrong queue.

#### Who expects you to know it

- Analytics engineers: build the metric tables behind every business dashboard.
- Data analysts: compute and explain these numbers weekly.
- Product and finance partners: rely on the definitions you publish.
- Interviewers: DAU/MAU SQL, retention, churn and NRR, and take rate are standard questions.

> **On the job:** You join a company that sells plants, runs a paid membership, and hosts third-party sellers. In your first month you are asked for a trading table, an MRR bridge, a seller take-rate report, a retention cohort chart, and an on-time delivery dashboard. Each needs a different metric family, and each has a classic trap. This deck is that first month, compressed.

> **The main idea:** each business model has a small set of headline metrics with well-known traps; knowing both is the baseline for analytics work and interviews.

*Read more:* [Stripe: subscription analytics (MRR, churn)](https://docs.stripe.com/billing/subscriptions/analytics), [Google Analytics: active users](https://support.google.com/analytics/answer/12253918), [Mixpanel: retention](https://docs.mixpanel.com/docs/reports/retention).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Selling your own goods | Net sales, AOV (lesson 6) | Say which amount and which orders; AOV is a ratio of sums. |
| Recurring subscriptions | MRR bridge, logo churn, GRR, NRR (lessons 7–8) | Stock vs flows; starting-cohort denominators. |
| A platform for other sellers | GMV, net revenue, take rate, sell-through (lessons 9–10) | Volume is not revenue; liquidity needs maturity. |
| An app or website | DAU/WAU/MAU, funnels, retention (lessons 11–13) | Distinct counts over windows; cohort maturity. |
| Fulfilment and support | On-time rate, percentiles, backlog (lessons 14–15) | Decided populations; percentiles from raw data; stocks don’t add. |
| A finance-reported figure (booked revenue, cash) | Finance’s definition, reconciled | Revenue recognition and closed months belong to Finance (*Metric design* deck). |

#### How interviews test it

- “Write SQL for DAU and MAU” / “month-over-month retained users”.
- “What’s our churn? Can NRR exceed 100 %?”
- “GMV went up but revenue didn’t. Why?”
- “Which seller is worst at delivering?” (rates with the right population, p95 from raw data).

#### Where it sits in your learning path

- Builds on SQL correctness (fan-out, NULLs, weighted ratios, `FILTER`) and the dimensional-modelling deck (additive and semi-additive measures).
- Next: deck 2, *Metric design*, teaches how to write every spec-card field and the ratio and metric-system rules behind these examples.
- Then deck 3, *Diagnosing metric changes*, explains moves in these metrics with metric trees, mix shift, and a weekly-business-review lab.

> **The main idea:** reach for the metric family that matches how the business makes money, and check its classic trap before you publish a number.

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

Leafy, the plant shop from the Python and dbt decks, has grown. It sells its own plants (**commerce**), runs a paid **Leafy Plus** membership (**SaaS**), lets third-party sellers list rare plants for a commission (**marketplace**), has a website and two apps (**product**), and ships parcels and answers tickets (**operations**). One script, `make_leafy.py`, generates about eight weeks of deterministic data: same seed, same rows, on every machine. Its source is the last slide of this deck; it also contains the answers to the weekly-business-review lab in the *Diagnosing metric changes* deck, so read it after that lab.

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
| Bots: crawler user agents, and a scraper that pretends to be a browser | `events` | the bot flag in the clean base (5) |
| Leafy staff and QA test accounts that browse and place orders | `users.is_internal`, `is_test` | the `customers` view (5) |
| The same event delivered twice (same `event_id`) | `events` | de-duplication in `clean_events` (5) |
| NULL keys: anonymous visitors, tickets without an order, unknown country | `events.user_id`, `tickets.order_id`, `users.country` | active users count signed-in people only (11) |
| App events that arrive hours or days late | `events.received_at_utc` | the active-user spec: recent days restate (11) |
| A daylight-saving change (Sunday 8 March) and orders near midnight UTC | all `_utc` columns | the `local_ts` macro (5) |
| A day with zero sessions on one platform | `events` | `NULLIF` on every denominator (10) |
| Refunds that land weeks after the order, in a later month | `refunds` | “maturing” weeks in net sales (6) |
| An incomplete current period, immature trials, parcels still in transit | everywhere | maturity rules (10, 13, 14) |

Why each trap matters, and how to choose a policy for it, is the subject of the *Metric design* deck. Here the policies are applied once in the clean base (lesson 5), so the worked examples can focus on the business metrics.

> **On the job:** Real warehouses look like this: several source systems, each with its own clock, keys, and quirks. Your first week on an analytics team is usually spent learning exactly this table of traps for your company’s data, then writing it down so the next person doesn’t rediscover it.

> **The main idea:** one deterministic dataset with every common metric trap planted. The clean base handles each trap once, so every worked example starts from trustworthy rows.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-4"></a>
## 4. How to read the spec cards in this deck

*Start here · the definition comes before the query*

Every metric in this deck starts with a **metric spec card**: a short, structured definition that records each decision that would otherwise hide inside a query. A **metric** is a number computed by a precise, repeatable rule from data, used to make a decision; the card is that rule in words. Coming from C#: the card is the interface contract and XML doc comment of a number, and the SQL is its implementation.

#### The fields you will see

| Field | Question it answers |
|---|---|
| Name and one-line definition | What is it, in one sentence a stakeholder would agree with? |
| Business decision | Which decision changes if this number moves? |
| Owner | Who approves a change to the definition, and who answers questions? |
| Population | Which units are eligible to be counted at all (the denominator)? |
| Grain (event or entity) | What is one counted unit? What is one output row? |
| Numerator / denominator | What is counted on top, and what is it divided by? The numerator is a subset of the denominator. |
| Distinct keys | Which key removes duplicates for each count? |
| Time window and time zone | Which period, which calendar, which clock? Half-open intervals `[start, end)`. |
| Attribution date | Which timestamp places a unit in a period (order date, refund date, promise date)? |
| Exclusions and bot policy | Which rows never count (staff, QA, bots, cancelled), and why? |
| Missing data | What happens to NULL keys and late rows? |
| Zero denominator | What is shown when the denominator is 0? (NULL, never 0 %.) |
| Observation limits / maturity | When is a period or cohort complete enough to report? |

#### How to read a card

- Read the **population** and **numerator / denominator** first: they decide most of the number.
- Then the **time** fields: every period in this deck is a Chicago calendar day, week, or month, with half-open intervals.
- A card names only the fields that matter for that metric; the rest follow the shared clean base (next lesson).
- If a field is unfamiliar, the *Metric design* deck has one lesson per field with executed examples: population, grain, attribution date, exclusions, missing and late data, zero denominators, and maturity.

> **On the job:** In real teams these cards live next to the code: in dbt model YAML, a semantic-layer file, or a dashboard description. When two numbers disagree, comparing their cards field by field finds the difference faster than comparing SQL.

> **The main idea:** a spec card is the definition; the query implements it. Read the population, the numerator and denominator, and the time fields first.

*Read more:* [dbt: metrics overview](https://docs.getdbt.com/docs/build/metrics-overview), [Power BI: semantic models](https://learn.microsoft.com/en-us/power-bi/connect-data/service-datasets-understand).

---

<a id="slide-5"></a>
## 5. The clean base every query reads

*Start here · one macro and seven views, written once*

The traps listed in lesson 3 are handled once, in a thin **base layer** of views, so every metric in this deck differs only in what it counts, never in how it cleans. First a DuckDB **macro** (a named, reusable SQL expression, like an inline function) converts a UTC timestamp to Leafy’s business time zone, America/Chicago, using the IANA zone name so daylight saving is handled:

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

> **On the job:** This is the job of an analytics engineer in one slide: encode business rules once, test them, and give analysts clean building blocks. In dbt these views would be staging and intermediate models (dbt fundamentals deck).

> **The main idea:** every metric in this deck reads the same tested base views; the lessons only decide what to count.

*Read more:* [DuckDB: CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones).

---

<a id="slide-6"></a>
## 6. Commerce: net sales and average order value

*Part A · commerce · one spec card, one query*

Commerce metrics start from orders. **Gross sales** is list price × quantity; **net sales** subtracts discounts and refunds; **average order value** (AOV) divides a sales amount by the number of orders. Each “amount” word hides a choice, so the card states it.

#### Spec card: net sales and AOV

| Field | Metric spec card |
|---|---|
| **Definition** | **Net sales**: first-party item sales after discounts and refunds. **AOV** (average order value): net items ÷ orders. |
| **Decision** | Weekly trading review: promotions, pricing, stock. Owner: Head of Commerce. |
| **Population** | Completed first-party orders (`seller_id = 1`) by customers. |
| **Grain** | Unit: an order (`order_id`). Output: one row per Chicago week. |
| **Numerator / denominator** | AOV = Σ (items − discount) ÷ COUNT(orders). Shipping and tax excluded. |
| **Attribution** | Order placed time; refunds attributed to the order’s week (restates). |
| **Exclusions** | Cancelled orders, staff and QA accounts (base views). |
| **Maturity** | Refunds arrive up to ~30 days later: the last 4 weeks are marked “maturing”. |
| **Caveats** | AOV is before refunds, so a refund changes net sales but not AOV. |

#### Weekly first-party trading table

```sql
WITH o AS (
    SELECT * FROM clean_orders
    WHERE is_first_party AND order_date < DATE '2026-03-23'     -- complete weeks only
), r AS (
    SELECT order_id, SUM(amount) AS refunded FROM clean_refunds GROUP BY order_id
)
SELECT date_trunc('week', o.order_date)::DATE           AS week,
       COUNT(*)                                          AS orders,
       SUM(o.items_amount)                               AS items,
       SUM(o.discount_amount)                            AS discounts,
       COALESCE(SUM(r.refunded), 0)                      AS refunds_to_date,
       SUM(o.net_items) - refunds_to_date                AS net_sales,
       ROUND(SUM(o.net_items) / COUNT(*), 2)             AS aov,
       week >= DATE '2026-02-23'                         AS maturing
FROM o LEFT JOIN r USING (order_id)
GROUP BY week
ORDER BY week;
```

Result (8 rows):

| week | orders | items | discounts | refunds_to_date | net_sales | aov | maturing |
|---|---|---|---|---|---|---|---|
| 2026-01-26 | 140 | 8030.62 | 95.00 | 643.43 | 7292.19 | 56.68 | false |
| 2026-02-02 | 142 | 9153.02 | 135.35 | 360.46 | 8657.21 | 63.5 | false |
| 2026-02-09 | 164 | 10085.07 | 193.20 | 445.91 | 9445.96 | 60.32 | false |
| 2026-02-16 | 152 | 8560.11 | 111.10 | 398.81 | 8050.20 | 55.59 | false |
| 2026-02-23 | 162 | 9966.83 | 156.85 | 470.02 | 9339.96 | 60.56 | true |
| 2026-03-02 | 147 | 8385.57 | 112.10 | 198.97 | 8074.50 | 56.28 | true |
| 2026-03-09 | 173 | 10720.31 | 246.55 | 234.08 | 10239.68 | 60.54 | true |
| 2026-03-16 | 141 | 8949.61 | 166.75 | 0.00 | 8782.86 | 62.29 | true |

AOV is a ratio of sums: Σ net items ÷ orders for the week, not an average of daily AOVs (Metric design deck: “Average of ratios vs ratio of sums”).

#### “AOV in February” four ways

```sql
SELECT ROUND(AVG(items_amount + shipping_amount), 2)  AS aov_incl_shipping,
       ROUND(AVG(items_amount), 2)                    AS aov_list_price,
       ROUND(AVG(net_items), 2)                       AS aov_after_discounts,
       ROUND(SUM(net_items - COALESCE(r.refunded, 0)) / COUNT(*), 2) AS aov_after_refunds
FROM clean_orders o
LEFT JOIN (SELECT order_id, SUM(amount) AS refunded FROM clean_refunds GROUP BY order_id) r USING (order_id)
WHERE is_first_party AND order_date >= DATE '2026-02-01' AND order_date < DATE '2026-03-01';
```

Result (1 row):

| aov_incl_shipping | aov_list_price | aov_after_discounts | aov_after_refunds |
|---|---|---|---|
| 64.77 | 61.47 | 60.55 | 57.66 |

A spread of several dollars from one word. Marketing tools often include shipping; finance excludes it; refunds lower AOV only if you choose to subtract them. The card picks one.

#### Reading the table

- The `maturing` flag marks weeks whose refunds are still arriving (Metric design deck: “Observation limits and maturity”): their net sales will fall a little.
- Discounts are a cost of the promotion. A promotion that lifts orders but cuts AOV can still lose money: show both, not just orders.
- First-party only: third-party sales are not Leafy’s revenue (lesson 9).

> **On the job:** A weekly trading table like this is the first thing an e-commerce analytics team builds and the first number leaders quote. Expect questions such as “why did AOV drop?”: decompose into mix (which products), discounts, and basket size (items per order) before guessing.

> **The main idea:** write down which amount (list, after discounts, after refunds, with or without shipping) and which orders count; AOV is total amount ÷ orders over the period, never an average of averages.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-7"></a>
## 7. SaaS: MRR and its movements

*Part A · SaaS · Leafy Plus in February*

A subscription business reports **stock** (how much recurring revenue exists now) and **flows** (what changed it). **MRR** is the stock. The **MRR bridge** (or MRR movements) splits the change between two snapshots into new, expansion, contraction, and churn, and must add up exactly.

#### Spec card: MRR and movements

| Field | Metric spec card |
|---|---|
| **Definition** | **MRR** (monthly recurring revenue): the normalised monthly value of active paid subscriptions at a point in time. Annual plans count as price ÷ 12. |
| **Decision** | Monthly growth review and forecasting. Owner: Plus product lead with Finance. |
| **Population** | Paid Leafy Plus periods; free staff plans excluded. |
| **Grain** | Snapshot: one value per date. Movements: one row per subscriber per month. |
| **Time** | Snapshots at 00:00 on the 1st of each month (Chicago calendar dates). |
| **Movements** | **New** (0 → x), **expansion** (x → more), **contraction** (x → less, still paying), **churn** (x → 0). |
| **Caveats** | Snapshot comparison misses people who join and leave within one month; reactivations count as new. |

#### February MRR bridge

```sql
WITH snap AS (                            -- MRR per subscriber at two dates
    SELECT d.snapshot, p.user_id, SUM(p.mrr) AS mrr
    FROM (VALUES (DATE '2026-02-01', 'start'), (DATE '2026-03-01', 'end')) d(day, snapshot)
    JOIN plus_periods p
      ON p.valid_from <= d.day AND (p.valid_to IS NULL OR p.valid_to > d.day)
    WHERE p.plan <> 'staff'
    GROUP BY d.snapshot, p.user_id
), per_user AS (
    SELECT user_id,
           COALESCE(SUM(mrr) FILTER (WHERE snapshot = 'start'), 0) AS mrr_start,
           COALESCE(SUM(mrr) FILTER (WHERE snapshot = 'end'), 0)   AS mrr_end
    FROM snap GROUP BY user_id
)
SELECT SUM(mrr_start)                                                    AS start_mrr,
       COALESCE(SUM(mrr_end) FILTER (WHERE mrr_start = 0), 0)            AS new_mrr,
       COALESCE(SUM(mrr_end - mrr_start)
                FILTER (WHERE mrr_start > 0 AND mrr_end > mrr_start), 0) AS expansion,
       COALESCE(SUM(mrr_start - mrr_end)
                FILTER (WHERE mrr_end > 0 AND mrr_end < mrr_start), 0)   AS contraction,
       COALESCE(SUM(mrr_start) FILTER (WHERE mrr_end = 0), 0)            AS churned_mrr,
       SUM(mrr_end)                                                      AS end_mrr,
       start_mrr + new_mrr + expansion - contraction - churned_mrr = end_mrr AS reconciles
FROM per_user;
```

Result (1 row):

| start_mrr | new_mrr | expansion | contraction | churned_mrr | end_mrr | reconciles |
|---|---|---|---|---|---|---|
| 858.00 | 334.00 | 54.00 | 18.00 | 39.00 | 1189.00 | true |

The final column is a built-in test: start + new + expansion − contraction − churn = end. If it ever says false, a subscriber was classified twice or not at all.

#### MRR is not cash

An annual plan is paid up front ($96), but contributes $8 MRR every month. Finance’s cash and revenue-recognition numbers will differ from MRR by design. Say “MRR” only for the normalised recurring value, never for money received.

#### Coming from C#

This is an event-sourced aggregate: `plus_periods` is a history table (like an SCD type 2 dimension from the dimensional-modelling deck), and a snapshot is “replay to date *d*”. The bridge is a diff of two replays, classified per key.

> **On the job:** Subscription teams review the MRR bridge monthly, and investors ask for it. Analytics engineers usually build it as a monthly snapshot table (one row per subscriber per month) so every movement is traceable to a person and a plan change.

> **The main idea:** MRR is a point-in-time stock; explain its change with a bridge of new, expansion, contraction, and churn that reconciles exactly, and keep it separate from cash.

*Read more:* [Stripe: subscription analytics (MRR, churn)](https://docs.stripe.com/billing/subscriptions/analytics), [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/).

---

<a id="slide-8"></a>
## 8. SaaS: churn, GRR, and NRR

*Part A · SaaS · “What’s our churn rate?”*

**Churn** is the share of customers (or revenue) lost in a period. **Logo churn** counts customers (“logos”); **revenue churn** counts MRR. **Gross revenue retention** (GRR) is the share of starting MRR kept, ignoring growth; **net revenue retention** (NRR) also adds expansion, so it can exceed 100 %. All three use the *starting* cohort as the population: new customers of the month are excluded.

#### Spec card: monthly logo churn

| Field | Metric spec card |
|---|---|
| **Definition** | **Logo churn**: share of subscribers paying at the start of the month who are not paying at its end. |
| **Decision** | Retention programme and forecasting. Owner: Plus product lead. |
| **Population (denominator)** | Paying subscribers at 00:00 on the 1st. *New subscribers of the month are not in it.* |
| **Numerator** | Those of them with no paid plan at 00:00 on the 1st of next month. Plan changes are not churn. |
| **Distinct key** | `user_id` (one person can have several plan periods). |
| **Companions** | **GRR** = (start − churn − contraction) ÷ start MRR. **NRR** = (start − churn − contraction + expansion) ÷ start MRR. |
| **Maturity** | A month is reportable once it has ended. |

#### February, start-of-month cohort

```sql
WITH snap AS (
    SELECT d.snapshot, p.user_id, SUM(p.mrr) AS mrr
    FROM (VALUES (DATE '2026-02-01', 'start'), (DATE '2026-03-01', 'end')) d(day, snapshot)
    JOIN plus_periods p
      ON p.valid_from <= d.day AND (p.valid_to IS NULL OR p.valid_to > d.day)
    WHERE p.plan <> 'staff'
    GROUP BY d.snapshot, p.user_id
), u AS (
    SELECT user_id,
           COALESCE(SUM(mrr) FILTER (WHERE snapshot = 'start'), 0) AS s,
           COALESCE(SUM(mrr) FILTER (WHERE snapshot = 'end'), 0)   AS e
    FROM snap GROUP BY user_id
)
SELECT COUNT(*) FILTER (WHERE s > 0)                         AS subscribers_at_start,
       COUNT(*) FILTER (WHERE s > 0 AND e = 0)               AS churned,
       ROUND(churned / subscribers_at_start, 4)              AS logo_churn,
       ROUND(SUM(s - e) FILTER (WHERE s > 0 AND e < s) / SUM(s), 4)   AS gross_mrr_churn,
       ROUND(1 - gross_mrr_churn, 4)                         AS grr,
       ROUND(SUM(e) FILTER (WHERE s > 0) / SUM(s), 4)        AS nrr
FROM u;
```

Result (1 row):

| subscribers_at_start | churned | logo_churn | gross_mrr_churn | grr | nrr |
|---|---|---|---|---|---|
| 88 | 3 | 0.0341 | 0.0664 | 0.9336 | 0.9965 |

Revenue churn is higher than logo churn here: a downgrade loses MRR without losing a logo, and a lost premium member costs almost two monthly ones.

#### A second reading of “churn rate”

```sql
WITH cancels AS (           -- periods that ended in February with no follow-on plan
    SELECT p.user_id
    FROM plus_periods p
    WHERE p.plan <> 'staff' AND p.valid_to >= DATE '2026-02-01' AND p.valid_to < DATE '2026-03-01'
      AND NOT EXISTS (SELECT 1 FROM plus_periods n
                      WHERE n.user_id = p.user_id AND n.valid_from = p.valid_to)
), counts AS (
    SELECT (SELECT COUNT(DISTINCT user_id) FROM plus_periods
            WHERE plan <> 'staff' AND valid_from <= DATE '2026-02-01'
              AND (valid_to IS NULL OR valid_to > DATE '2026-02-01')) AS at_start,
           (SELECT COUNT(DISTINCT user_id) FROM plus_periods
            WHERE plan <> 'staff' AND valid_from <= DATE '2026-03-01'
              AND (valid_to IS NULL OR valid_to > DATE '2026-03-01')) AS at_end,
           (SELECT COUNT(*) FROM cancels)                            AS cancellations
)
SELECT cancellations, at_start, at_end,
       ROUND(cancellations / at_start, 4)                 AS churn_vs_start,
       ROUND(cancellations / ((at_start + at_end) / 2), 4) AS churn_vs_average
FROM counts;
```

Result (1 row):

| cancellations | at_start | at_end | churn_vs_start | churn_vs_average |
|---|---|---|---|---|
| 3 | 88 | 122 | 0.0341 | 0.0286 |

“Cancellations ÷ average subscribers” is common in finance decks. With fast growth, the average is far above the starting count, so this reading looks lower. Neither is wrong; mixing them across months is.

#### Interview traps

- Counting new subscribers who cancel in their first month in the numerator but not the denominator (rate inflated).
- Treating a downgrade or plan switch as churn: the person is still paying.
- Including new MRR in NRR: NRR is about existing customers only.
- Annual subscribers can’t churn until renewal: a high annual share makes monthly churn look low. Report churn by plan.

> **On the job:** “What’s our churn?” is asked in every SaaS company, and finance, product, and customer success each have a favourite formula. The analytics engineer’s job is to publish each formula under its own name (logo churn, gross MRR churn, NRR) with the denominator in the definition.

> **The main idea:** churn needs a starting population, a unit (logos or MRR), and a rule for plan changes. Name each variant and never compare rates computed with different denominators.

*Read more:* [Stripe: subscription analytics (MRR, churn)](https://docs.stripe.com/billing/subscriptions/analytics), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter).

---

<a id="slide-9"></a>
## 9. Marketplace: GMV, net revenue, and take rate

*Part B · marketplace · February*

A marketplace sells other people’s goods. Its headline volume, **GMV**, is not its revenue. Its revenue is the **take rate** × third-party GMV, plus any first-party sales. Investors and interviewers check that you never call GMV “revenue”.

#### Spec card: GMV, net revenue, take rate

| Field | Metric spec card |
|---|---|
| **Definitions** | **GMV** (gross merchandise value): list value of everything sold on the platform, first and third party. **Net revenue**: what Leafy keeps: first-party net sales plus commissions on third-party sales. **Take rate**: commission revenue ÷ third-party GMV. |
| **Decision** | Marketplace health and pricing of commissions. Owner: Marketplace lead and Finance. |
| **Population** | Completed customer orders, all sellers (base view `clean_orders`). |
| **Grain** | Unit: order. Output: per seller type, per month. |
| **Attribution** | Order date; commission on refunded value is reversed (restates). |
| **Caveats** | GMV is not revenue. Third-party GMV belongs to the seller; only the commission is Leafy’s. |

#### February by seller type

```sql
WITH r AS (SELECT order_id, SUM(amount) AS refunded FROM clean_refunds GROUP BY order_id),
o AS (
    SELECT CASE WHEN is_first_party THEN '1P Leafy' ELSE '3P sellers' END AS seller_type,
           items_amount,
           net_items - COALESCE(refunded, 0) AS net_sales,
           CASE WHEN is_first_party THEN net_items - COALESCE(refunded, 0)
                ELSE (net_items - COALESCE(refunded, 0)) * commission_rate END AS leafy_revenue
    FROM clean_orders LEFT JOIN r USING (order_id)
    WHERE order_date >= DATE '2026-02-01' AND order_date < DATE '2026-03-01'
)
SELECT COALESCE(seller_type, 'all sellers')                AS seller_type,
       SUM(items_amount)                                  AS gmv,
       SUM(net_sales)                                     AS net_sales,
       ROUND(SUM(leafy_revenue), 2)                       AS leafy_net_revenue,
       ROUND(SUM(leafy_revenue) / SUM(items_amount), 4)   AS revenue_to_gmv
FROM o
GROUP BY ROLLUP (seller_type)
ORDER BY GROUPING(seller_type), seller_type;
```

Result (3 rows):

| seller_type | gmv | net_sales | leafy_net_revenue | revenue_to_gmv |
|---|---|---|---|---|
| 1P Leafy | 38602.91 | 36208.64 | 36208.64 | 0.938 |
| 3P sellers | 26681.52 | 24249.02 | 3434.76 | 0.1287 |
| all sellers | 65284.43 | 60457.66 | 39643.40 | 0.6072 |

The 3P row’s `revenue_to_gmv` is the **take rate**: a ratio of sums over all third-party orders, so big sellers weigh more. The blended “all sellers” ratio mixes two business models and is rarely meaningful on its own.

#### Three GMV definitions you will meet

| Name | Formula | Used by |
|---|---|---|
| Gross GMV | Σ list price × quantity | Marketplace headlines |
| GMV after discounts | Σ (items − discounts) | Many dashboards; check which one |
| Net GMV | after discounts, cancellations, and refunds | Finance, seller payouts |

#### What else to watch

- Take rate by seller, then overall as Σ commission ÷ Σ GMV (exercise 2).
- Commission rate (contract) ≠ take rate (achieved): refunds, promotions paid by Leafy, and fees move it.
- Guardrail: seller retention. Raising commissions lifts take rate until sellers leave (Metric design deck: “North star and guardrail metrics”).

> **On the job:** Marketplace teams (Etsy, Uber, Airbnb style) review GMV, take rate, and net revenue together. A common real task: a seller dashboard that shows GMV to sellers and net revenue to finance from the same order rows, so the two never disagree on volume.

> **The main idea:** GMV measures volume, net revenue measures what you keep, and take rate links them. Compute take rate as Σ commission ÷ Σ third-party GMV, never as an average of seller rates.

*Read more:* [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-10"></a>
## 10. Marketplace: liquidity and sell-through

*Part B · marketplace · is supply meeting demand?*

**Liquidity** is how reliably the two sides of a marketplace find each other. On the supply side, the usual metric is **sell-through**: the share of listings that sell within a fixed window. On the demand side it is, for example, the share of searches that return an available item. Both are cohort metrics, so maturity matters.

#### Spec card: 14-day sell-through

| Field | Metric spec card |
|---|---|
| **Definition** | **14-day sell-through**: share of third-party listings that sell within 14 days of being listed. |
| **Decision** | Is supply finding buyers? Which sellers need help or pricing advice? Owner: Marketplace lead. |
| **Population** | Listings by active third-party sellers. |
| **Grain** | Unit: listing. Output: per listing week (cohort) and per seller. |
| **Numerator / denominator** | Listings sold ≤ 14 × 24 h after listing ÷ listings in the cohort. |
| **Maturity** | A listing is mature 14 days after it was listed. Immature listings are excluded, not counted as unsold. |
| **Zero denominator** | A seller with no mature listings shows NULL. |

#### By listing week

```sql
WITH l AS (
    SELECT l.*, s.seller_name,
           local_ts(listed_at_utc)::DATE                                    AS listed_date,
           sold_at_utc IS NOT NULL
             AND sold_at_utc <= listed_at_utc + INTERVAL 14 DAY             AS sold_14d,
           listed_at_utc + INTERVAL 14 DAY <= (SELECT loaded_at_utc FROM load_info) AS mature
    FROM listings l JOIN sellers s USING (seller_id)
)
SELECT date_trunc('week', listed_date)::DATE                         AS listing_week,
       COUNT(*)                                                      AS listings,
       COUNT(*) FILTER (WHERE mature)                                AS mature_listings,
       ROUND(COUNT(*) FILTER (WHERE sold_14d AND mature)
             / NULLIF(mature_listings, 0), 3)                        AS sell_through_14d,
       ROUND(COUNT(*) FILTER (WHERE sold_14d) / COUNT(*), 3)         AS naive_rate
FROM l
WHERE listed_date >= DATE '2026-01-26'
GROUP BY listing_week
ORDER BY listing_week;
```

Result (9 rows):

| listing_week | listings | mature_listings | sell_through_14d | naive_rate |
|---|---|---|---|---|
| 2026-01-26 | 26 | 26 | 0.769 | 0.769 |
| 2026-02-02 | 31 | 31 | 0.387 | 0.387 |
| 2026-02-09 | 28 | 28 | 0.536 | 0.536 |
| 2026-02-16 | 30 | 30 | 0.667 | 0.667 |
| 2026-02-23 | 26 | 26 | 0.538 | 0.538 |
| 2026-03-02 | 36 | 36 | 0.583 | 0.583 |
| 2026-03-09 | 35 | 13 | 0.462 | 0.514 |
| 2026-03-16 | 29 | 0 | NULL | 0.31 |
| 2026-03-23 | 16 | 0 | NULL | 0.125 |

The naive rate (all listings, sold within 14 days *so far*) mixes finished and unfinished windows: the newest week looks terrible only because its listings are days old, and recent weeks keep moving every day as more listings sell or age out. The spec’s rate uses mature listings only and is NULL when none are mature yet.

#### By seller

```sql
SELECT s.seller_name,
       COUNT(*) FILTER (WHERE listed_at_utc + INTERVAL 14 DAY <= TIMESTAMP '2026-03-25 15:00') AS mature_listings,
       ROUND(COUNT(*) FILTER (WHERE listed_at_utc + INTERVAL 14 DAY <= TIMESTAMP '2026-03-25 15:00'
                                AND sold_at_utc <= listed_at_utc + INTERVAL 14 DAY)
             / NULLIF(mature_listings, 0), 3)                           AS sell_through_14d
FROM listings l JOIN sellers s USING (seller_id)
GROUP BY s.seller_name
ORDER BY sell_through_14d DESC NULLS LAST, s.seller_name;
```

Result (6 rows):

| seller_name | mature_listings | sell_through_14d |
|---|---|---|
| Moss Market | 38 | 0.658 |
| Fern & Co | 78 | 0.628 |
| Bonsai Barn | 41 | 0.585 |
| Cactus Club | 47 | 0.574 |
| Orchid Hub | 24 | 0.542 |
| Rare Roots | 16 | 0.125 |

#### Reading it

- One seller’s low sell-through is a pricing or assortment problem for that seller, not a marketplace trend.
- Report both sides: a marketplace can have great sell-through because supply is too thin (buyers find nothing).
- Time-to-sell percentiles (median days to sale) complement the rate; they need the same maturity rule.

> **On the job:** Marketplace analysts watch liquidity weekly, by category and region, because it predicts churn on both sides: sellers whose items don’t sell leave, and buyers who find nothing leave. Rates per seller usually feed a seller-success dashboard and outreach list.

> **The main idea:** liquidity metrics are cohort rates with a window. Count a listing only when its window has closed, and report supply and demand sides together.

*Read more:* [Censoring (statistics)](https://en.wikipedia.org/wiki/Censoring_%28statistics%29), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter).

---

<a id="slide-11"></a>
## 11. Product: DAU, WAU, MAU, and stickiness

*Part C · product · active users are a distinct count over a window*

**Active users** count distinct people who did something meaningful in a window. The meaningful action and the window are the definition; Google Analytics, for example, documents its own. Because they are **distinct counts**, active users are not additive: seven DAUs do not add up to a WAU.

#### Spec card: active users

| Field | Metric spec card |
|---|---|
| **Definition** | **Active user**: a signed-in customer with at least one customer session (no bots, no staff) in the window. **DAU**, **WAU**, **MAU**: distinct active users in the day, the 7 days, and the 28 days ending on a date. |
| **Decision** | Is engagement growing? Is a release hurting usage? Owner: Product analytics. |
| **Distinct key** | `user_id`. Anonymous visitors cannot be counted as people (caveat). |
| **Window** | Rolling windows ending on each Chicago date, inclusive: 1, 7, 28 days. 28 (not 30) keeps four of each weekday. |
| **Ratio** | **Stickiness** = DAU ÷ MAU: the share of monthly users who show up on a given day. |
| **Maturity** | Only complete days; app events up to 60 h late, so the last 3 days restate. |

#### Portable SQL: a date spine joined to user-days

```sql
WITH user_days AS (                    -- one row per user per active day
    SELECT DISTINCT session_date AS day, user_id
    FROM customer_sessions WHERE user_id IS NOT NULL
), days AS (
    SELECT UNNEST(generate_series(DATE '2026-03-09', DATE '2026-03-15', INTERVAL 1 DAY))::DATE AS day
)
SELECT d.day,
       COUNT(DISTINCT u.user_id) FILTER (WHERE u.day = d.day)      AS dau,
       COUNT(DISTINCT u.user_id) FILTER (WHERE u.day > d.day - 7)  AS wau,
       COUNT(DISTINCT u.user_id)                                   AS mau_28d,
       ROUND(dau / mau_28d, 3)                                     AS stickiness
FROM days d
JOIN user_days u ON u.day <= d.day AND u.day > d.day - 28           -- the widest window
GROUP BY d.day
ORDER BY d.day;
```

Result (7 rows):

| day | dau | wau | mau_28d | stickiness |
|---|---|---|---|---|
| 2026-03-09 | 180 | 680 | 1169 | 0.154 |
| 2026-03-10 | 152 | 690 | 1175 | 0.129 |
| 2026-03-11 | 172 | 705 | 1194 | 0.144 |
| 2026-03-12 | 169 | 722 | 1197 | 0.141 |
| 2026-03-13 | 160 | 721 | 1199 | 0.133 |
| 2026-03-14 | 221 | 724 | 1209 | 0.183 |
| 2026-03-15 | 200 | 733 | 1229 | 0.163 |

One join covers the widest window (28 days); `FILTER` narrows it for WAU and DAU. This shape works in every engine.

#### DuckDB shortcut: COUNT(DISTINCT) in a window

```sql
WITH user_days AS (
    SELECT DISTINCT session_date AS day, user_id
    FROM customer_sessions WHERE user_id IS NOT NULL
)
SELECT day, ANY_VALUE(wau) AS wau
FROM (SELECT day,
             COUNT(DISTINCT user_id) OVER (
                 ORDER BY day RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW) AS wau
      FROM user_days)
WHERE day BETWEEN DATE '2026-03-09' AND DATE '2026-03-15'
GROUP BY day
ORDER BY day;
```

Result (7 rows):

| day | wau |
|---|---|
| 2026-03-09 | 680 |
| 2026-03-10 | 690 |
| 2026-03-11 | 705 |
| 2026-03-12 | 722 |
| 2026-03-13 | 721 |
| 2026-03-14 | 724 |
| 2026-03-15 | 733 |

Same WAU values (the build asserts it). **SQL Server, Fabric Warehouse, and Spark SQL do not allow `DISTINCT` inside a window aggregate**; use the spine join, or in Spark `size(collect_set(user_id) OVER w)`.

#### Distinct counts don’t add

```sql
WITH user_days AS (
    SELECT DISTINCT session_date AS day, user_id FROM customer_sessions
    WHERE user_id IS NOT NULL AND session_date BETWEEN DATE '2026-03-09' AND DATE '2026-03-15'
)
SELECT (SELECT SUM(n) FROM (SELECT COUNT(*) AS n FROM user_days GROUP BY day)) AS sum_of_7_daus,
       COUNT(DISTINCT user_id)                                               AS wau_15_march
FROM user_days;
```

Result (1 row):

| sum_of_7_daus | wau_15_march |
|---|---|
| 1254 | 733 |

Regular users appear on several days, so the sum of daily DAUs overstates weekly users. Store user-day rows (or sketches, SQL correctness deck) and recount for each window.

> **On the job:** DAU/MAU is a classic SQL screen question and a standard engagement chart. The follow-ups are always definitional: what counts as active (opening the app? a purchase?), are anonymous visitors in, why 28 days, and how late mobile data affects yesterday’s DAU.

> **The main idea:** active users = distinct people doing a defined action in a rolling window. Recount distinct users per window; never add or average DAUs into a WAU.

*Read more:* [Google Analytics: active users](https://support.google.com/analytics/answer/12253918), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [T-SQL: OVER clause (no DISTINCT)](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-over-clause-transact-sql), [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html).

---

<a id="slide-12"></a>
## 12. Product: funnel definitions

*Part C · product · step order, step rates, and the conversion window (added)*

A **funnel** is a sequence of steps toward a goal, and its metrics are the share of units reaching each step. Three choices define it: **step order** (must steps happen in sequence, or just happen at all?), **rate base** (from the previous step, or from the first?), and the **conversion window** (how long a unit has to complete the funnel).

#### Session funnel, week of 9 March: any order vs strict order

```sql
WITH steps AS (                          -- first time each step happened, per session
    SELECT session_id,
           MIN(event_at_local) FILTER (WHERE event_name = 'view_product')   AS t_view,
           MIN(event_at_local) FILTER (WHERE event_name = 'add_to_cart')    AS t_cart,
           MIN(event_at_local) FILTER (WHERE event_name = 'checkout_start') AS t_checkout,
           MIN(event_at_local) FILTER (WHERE event_name = 'purchase')       AS t_purchase
    FROM clean_events
    WHERE session_id IN (SELECT session_id FROM customer_sessions
                         WHERE session_date BETWEEN DATE '2026-03-09' AND DATE '2026-03-15')
    GROUP BY session_id
), f AS (
    SELECT COUNT(t_view) AS a1, COUNT(t_cart) AS a2, COUNT(t_checkout) AS a3, COUNT(t_purchase) AS a4,
           COUNT(t_view)                                               AS s1,
           COUNT(*) FILTER (WHERE t_cart > t_view)                     AS s2,
           COUNT(*) FILTER (WHERE t_checkout > t_cart AND t_cart > t_view) AS s3,
           COUNT(*) FILTER (WHERE t_purchase > t_checkout AND t_checkout > t_cart
                              AND t_cart > t_view)                     AS s4
    FROM steps
)
SELECT k, step, any_order, strict_order,
       ROUND(strict_order / LAG(strict_order) OVER (ORDER BY k), 3)          AS step_rate,
       ROUND(strict_order / FIRST_VALUE(strict_order) OVER (ORDER BY k), 3)  AS from_first_step
FROM (SELECT 1 AS k, 'view product' AS step, a1 AS any_order, s1 AS strict_order FROM f
      UNION ALL SELECT 2, 'add to cart', a2, s2 FROM f
      UNION ALL SELECT 3, 'start checkout', a3, s3 FROM f
      UNION ALL SELECT 4, 'purchase', a4, s4 FROM f)
ORDER BY k;
```

Result (4 rows):

| k | step | any_order | strict_order | step_rate | from_first_step |
|---|---|---|---|---|---|
| 1 | view product | 1655 | 1655 | NULL | 1 |
| 2 | add to cart | 603 | 548 | 0.331 | 0.331 |
| 3 | start checkout | 380 | 339 | 0.619 | 0.205 |
| 4 | purchase | 288 | 253 | 0.746 | 0.153 |

Leafy’s home page has a “quick add” button: some carts have no product view before them. An any-order funnel counts them at “add to cart” although they skipped “view product”, so its step-to-step rates mix two different journeys. A strict funnel requires each step after the previous one. Product tools such as Mixpanel default to strict order with a window.

#### User funnel: the window changes the answer

```sql
WITH first_view AS (        -- each user's first product view in the week
    SELECT s.user_id, MIN(e.event_at_local) AS t_view
    FROM clean_events e JOIN customer_sessions s USING (session_id)
    WHERE e.event_name = 'view_product' AND s.user_id IS NOT NULL
      AND s.session_date BETWEEN DATE '2026-03-09' AND DATE '2026-03-15'
    GROUP BY s.user_id
), first_purchase_after AS (
    SELECT v.user_id, v.t_view, MIN(e.event_at_local) AS t_purchase
    FROM first_view v
    LEFT JOIN clean_events e
           ON e.user_id = v.user_id AND e.event_name = 'purchase' AND e.event_at_local > v.t_view
    GROUP BY v.user_id, v.t_view
)
SELECT COUNT(*)                                                                  AS users_who_viewed,
       ROUND(COUNT(*) FILTER (WHERE t_purchase <= t_view + INTERVAL 1 HOUR) / COUNT(*), 3) AS within_1h,
       ROUND(COUNT(*) FILTER (WHERE t_purchase <= t_view + INTERVAL 1 DAY)  / COUNT(*), 3) AS within_1d,
       ROUND(COUNT(*) FILTER (WHERE t_purchase <= t_view + INTERVAL 7 DAY)  / COUNT(*), 3) AS within_7d
FROM first_purchase_after;
```

Result (1 row):

| users_who_viewed | within_1h | within_1d | within_7d |
|---|---|---|---|
| 680 | 0.206 | 0.24 | 0.39 |

Starting from each user’s first product view that week, “converted” depends entirely on the window. The cohort is mature: the last first-view was on 15 March, more than 7 days before the load.

#### In the spec

- Unit (session or user) and the entry step.
- Strict or any order; whether repeated steps reset the clock.
- Window (same session, 1 hour, 7 days) and the maturity rule that follows from it.
- Rate base: step-to-step for diagnosing a step; first-step for overall conversion.

#### Coming from C#

A strict funnel is a tiny state machine per unit: advance only when the next expected event arrives, in time order. The SQL above takes each step’s *first* timestamp and compares them, which is enough for “did they reach step k in order”. Repeated attempts need window functions (SQL windows deck).

> **On the job:** Funnel queries are a staple of product interviews (“view → cart → purchase within 7 days”) and of release monitoring. When a step rate drops, the step-to-step view tells you *where*; the window and order rules tell you whether it is real or an artefact of the definition.

> **The main idea:** a funnel is defined by its unit, step order, rate base, and window. Write all four down; changing any one of them changes every number in the funnel.

*Read more:* [Mixpanel: funnels](https://docs.mixpanel.com/docs/reports/funnels/funnels-overview), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-13"></a>
## 13. Product: retention cohorts and maturity

*Part C · product · do new customers come back? (added)*

A **cohort** is a group of units that started at the same time, such as everyone who signed up in one week. **Retention** is the share of a cohort still active N periods later. Cohort tables are the clearest way to see whether newer customers behave better or worse than older ones, as long as immature cells are not shown as zeros.

#### Spec card: week-N retention

| Field | Metric spec card |
|---|---|
| **Definition** | **Week-N retention**: share of a sign-up cohort with at least one customer session in calendar week N after the sign-up week. |
| **Cohort** | Customers grouped by Chicago sign-up week (week 0). |
| **Distinct key** | `user_id`. |
| **Maturity** | Week N of a cohort is shown only when that calendar week is complete. Otherwise NULL (“maturing”), never 0. |
| **Variant** | **Unbounded** retention (“active in week N *or later*”) is higher and never falls as data grows older; name it if you use it. |

#### Cohort table with maturity masking

```sql
WITH cohorts AS (
    SELECT user_id, date_trunc('week', signup_at_local)::DATE AS cohort_week
    FROM customers WHERE signup_at_local >= DATE '2026-01-26'
), active_weeks AS (
    SELECT DISTINCT user_id, date_trunc('week', session_date)::DATE AS active_week
    FROM customer_sessions WHERE user_id IS NOT NULL
), cur AS (SELECT date_trunc('week', current_day)::DATE AS current_week FROM load_info)
SELECT c.cohort_week,
       COUNT(DISTINCT c.user_id) AS cohort_size,
       CASE WHEN c.cohort_week + 7 < current_week THEN ROUND(COUNT(DISTINCT a.user_id)
            FILTER (WHERE a.active_week = c.cohort_week + 7) / cohort_size, 3) END  AS week_1,
       CASE WHEN c.cohort_week + 14 < current_week THEN ROUND(COUNT(DISTINCT a.user_id)
            FILTER (WHERE a.active_week = c.cohort_week + 14) / cohort_size, 3) END AS week_2,
       CASE WHEN c.cohort_week + 28 < current_week THEN ROUND(COUNT(DISTINCT a.user_id)
            FILTER (WHERE a.active_week = c.cohort_week + 28) / cohort_size, 3) END AS week_4
FROM cohorts c
CROSS JOIN cur
LEFT JOIN active_weeks a USING (user_id)
GROUP BY c.cohort_week, current_week
ORDER BY c.cohort_week;
```

Result (9 rows):

| cohort_week | cohort_size | week_1 | week_2 | week_4 |
|---|---|---|---|---|
| 2026-01-26 | 82 | 0.683 | 0.634 | 0.549 |
| 2026-02-02 | 78 | 0.615 | 0.667 | 0.5 |
| 2026-02-09 | 80 | 0.625 | 0.55 | 0.525 |
| 2026-02-16 | 82 | 0.707 | 0.695 | 0.598 |
| 2026-02-23 | 94 | 0.702 | 0.617 | NULL |
| 2026-03-02 | 70 | 0.743 | 0.586 | NULL |
| 2026-03-09 | 88 | 0.602 | NULL | NULL |
| 2026-03-16 | 78 | NULL | NULL | NULL |
| 2026-03-23 | 26 | NULL | NULL | NULL |

Diagonal NULLs are the observation limit: the week-4 cell for a cohort that signed up three weeks ago doesn’t exist yet. A table that showed 0 there would announce a retention collapse every single week.

#### Reading a cohort table

- Read **down** a column to compare cohorts at the same age (is week-1 retention improving?).
- Read **across** a row to see one cohort decay.
- Weight overall retention by cohort size (Σ retained ÷ Σ cohort), not the average of the cells (Metric design deck: “Average of ratios vs ratio of sums”).

#### Common variants

- Daily cohorts with day-1, day-7, day-30 retention (consumer apps).
- Revenue retention per cohort (SaaS NRR by start month, lesson 8).
- “Month-over-month retained users”: active this month and last month, a frequent SQL screen question (exercise 3).

> **On the job:** Retention is the metric most product and growth teams care about, because acquisition without retention just refills a leaking bucket. Building a cohort model with explicit maturity is a common first project for an analytics engineer in a product company.

> **The main idea:** retention is a cohort metric: fix the cohort, the activity definition, and the period, and mask every cell whose period hasn’t finished.

*Read more:* [Mixpanel: retention](https://docs.mixpanel.com/docs/reports/retention), [Censoring (statistics)](https://en.wikipedia.org/wiki/Censoring_%28statistics%29), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-14"></a>
## 14. Operations: on-time delivery and percentiles

*Part D · operations · fulfilment SLA (added)*

An **SLA** (service-level agreement) is a promise with a deadline, such as “delivered within 6 days”. Its metric is the share of units that met the promise. Speed itself is described with **percentiles**: the p50 (median) is the typical parcel, the p95 is the slow tail that customers complain about. Means hide the tail.

#### Spec card: on-time delivery

| Field | Metric spec card |
|---|---|
| **Definition** | **On-time delivery rate**: share of parcels delivered on or before the promised date (Chicago). |
| **Decision** | Carrier and seller performance; customer promise. Owner: Operations lead. |
| **Population** | Shipped customer orders whose promised date has passed (the outcome is decided). |
| **Attribution** | The promised date’s week: when the outcome became due. |
| **Missing data** | Still in transit after the promised date = **late** (it can’t be on time any more). Still in transit before it = not yet decided, excluded. |
| **Companion** | **Delivery time** p50 and p95 in days from order to delivery, for delivered parcels; labelled “delivered only”. |

#### By promise week

```sql
WITH p AS (
    SELECT o.order_id, o.placed_at_local, o.seller_id, s.promised_date,
           local_ts(s.delivered_at_utc)                                     AS delivered_at_local,
           s.promised_date < (SELECT current_day FROM load_info)            AS decided,
           delivered_at_local::DATE <= s.promised_date                      AS on_time
    FROM clean_orders o JOIN shipments s USING (order_id)
)
SELECT date_trunc('week', promised_date)::DATE                                   AS promise_week,
       COUNT(*) FILTER (WHERE decided)                                           AS decided,
       COUNT(*) FILTER (WHERE decided AND delivered_at_local IS NULL)            AS late_in_transit,
       ROUND(COUNT(*) FILTER (WHERE decided AND on_time)
             / NULLIF(COUNT(*) FILTER (WHERE decided), 0), 3)                    AS on_time_rate,
       ROUND(AVG(on_time::INT), 3)                                               AS naive_delivered_only,
       ROUND(quantile_cont(date_diff('hour', placed_at_local, delivered_at_local) / 24, 0.5), 1)  AS p50_days,
       ROUND(quantile_cont(date_diff('hour', placed_at_local, delivered_at_local) / 24, 0.95), 1) AS p95_days
FROM p
WHERE promised_date >= DATE '2026-02-02' AND promised_date < DATE '2026-03-30'
GROUP BY promise_week
ORDER BY promise_week;
```

Result (8 rows):

| promise_week | decided | late_in_transit | on_time_rate | naive_delivered_only | p50_days | p95_days |
|---|---|---|---|---|---|---|
| 2026-02-02 | 240 | 0 | 0.967 | 0.967 | 4 | 6.2 |
| 2026-02-09 | 263 | 0 | 0.973 | 0.973 | 4.1 | 6 |
| 2026-02-16 | 257 | 2 | 0.934 | 0.941 | 4.1 | 6.5 |
| 2026-02-23 | 280 | 0 | 0.957 | 0.957 | 4 | 6.3 |
| 2026-03-02 | 259 | 2 | 0.95 | 0.957 | 4.1 | 6.5 |
| 2026-03-09 | 266 | 2 | 0.959 | 0.966 | 4 | 6 |
| 2026-03-16 | 278 | 1 | 0.953 | 0.957 | 3.9 | 6.3 |
| 2026-03-23 | 55 | 0 | 1 | 1 | 3.5 | 5.9 |

In the newest promise weeks, parcels still travelling past their date count as late, and the delivered-only rate is flattering: the fast parcels arrive first, so the slow ones are missing from the sample. The same bias shrinks recent p95s: that column is only trustworthy once the week is mature.

#### Percentiles don’t average

```sql
WITH d AS (
    SELECT o.order_date,
           date_diff('hour', o.placed_at_local, local_ts(s.delivered_at_utc)) / 24 AS days
    FROM clean_orders o JOIN shipments s USING (order_id)
    WHERE s.delivered_at_utc IS NOT NULL
      AND o.order_date BETWEEN DATE '2026-03-02' AND DATE '2026-03-08'
)
SELECT ROUND(quantile_cont(days, 0.95), 2)                                    AS weekly_p95,
       ROUND((SELECT AVG(p95) FROM (SELECT quantile_cont(days, 0.95) AS p95
                                    FROM d GROUP BY order_date)), 2)         AS average_of_daily_p95,
       ROUND(AVG(days), 2)                                                    AS mean_days
FROM d;
```

Result (1 row):

| weekly_p95 | average_of_daily_p95 | mean_days |
|---|---|---|
| 6.2 | 6.12 | 4.09 |

A weekly p95 must be computed from the week’s individual parcels. The average of daily p95s is a different, meaningless number. Store raw durations (or a histogram or sketch) and recompute per period, as with distinct counts.

#### Dialect notes

| Engine | Percentile syntax |
|---|---|
| DuckDB | `quantile_cont(x, 0.95)`, `median(x)`, approximate `approx_quantile` |
| SQL Server | `PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY x) OVER (PARTITION BY …)`: a window function only |
| Fabric Warehouse | T-SQL form above, plus aggregate `MEDIAN`, `QUANTILE`, `APPROX_QUANTILE` (surface-area page) |
| Spark SQL | `percentile(x, 0.95)` exact, `percentile_approx(x, 0.95)` |

> **On the job:** Operations dashboards live on on-time rates and p95s per carrier, warehouse, and seller. Two mistakes reach production repeatedly: excluding parcels still in transit (rates look better than reality) and averaging p95s across warehouses (the number has no meaning).

> **The main idea:** an SLA rate needs a decided population (promise passed) and a rule for parcels still in flight; speed needs percentiles computed from raw durations, never averaged.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [T-SQL: PERCENTILE_CONT](https://learn.microsoft.com/en-us/sql/t-sql/functions/percentile-cont-transact-sql), [Fabric Warehouse: T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area), [Censoring (statistics)](https://en.wikipedia.org/wiki/Censoring_%28statistics%29).

---

<a id="slide-15"></a>
## 15. Operations: ticket backlog, a stock not a flow

*Part D · operations · support desk*

A **flow** metric counts things that happen during a period (tickets opened, tickets closed); flows add up across days. A **stock** metric is a level at a point in time (open tickets at end of day, MRR, inventory); stocks are **semi-additive** (dimensional-modelling deck): you can add them across queues, but not across time. The **backlog** is a stock.

#### Daily flows and the end-of-day backlog

```sql
WITH t AS (
    SELECT ticket_id, local_ts(opened_at_utc) AS opened, local_ts(closed_at_utc) AS closed
    FROM tickets
), days AS (
    SELECT UNNEST(generate_series(DATE '2026-03-09', DATE '2026-03-15', INTERVAL 1 DAY))::DATE AS day
)
SELECT d.day,
       COUNT(*) FILTER (WHERE t.opened::DATE = d.day)                       AS opened,
       COUNT(*) FILTER (WHERE t.closed::DATE = d.day)                       AS closed,
       COUNT(*) FILTER (WHERE t.opened < d.day + 1
                          AND (t.closed IS NULL OR t.closed >= d.day + 1))  AS backlog_end_of_day
FROM days d CROSS JOIN t
GROUP BY d.day
ORDER BY d.day;
```

Result (7 rows):

| day | opened | closed | backlog_end_of_day |
|---|---|---|---|
| 2026-03-09 | 5 | 2 | 8 |
| 2026-03-10 | 7 | 8 | 7 |
| 2026-03-11 | 6 | 2 | 11 |
| 2026-03-12 | 4 | 6 | 9 |
| 2026-03-13 | 7 | 4 | 12 |
| 2026-03-14 | 4 | 6 | 10 |
| 2026-03-15 | 4 | 9 | 5 |

Check the identity on any two consecutive days: backlog today = backlog yesterday + opened − closed. If it fails, tickets are being reopened, merged, or deleted, and the spec needs a rule for that.

#### Rolling the week up

```sql
WITH t AS (
    SELECT local_ts(opened_at_utc) AS opened, local_ts(closed_at_utc) AS closed FROM tickets
), daily AS (
    SELECT d.day,
           COUNT(*) FILTER (WHERE t.opened::DATE = d.day) AS opened,
           COUNT(*) FILTER (WHERE t.opened < d.day + 1
                              AND (t.closed IS NULL OR t.closed >= d.day + 1)) AS backlog
    FROM (SELECT UNNEST(generate_series(DATE '2026-03-09', DATE '2026-03-15', INTERVAL 1 DAY))::DATE AS day) d
    CROSS JOIN t
    GROUP BY d.day
)
SELECT SUM(opened)                                     AS opened_in_week,
       SUM(backlog)                                    AS sum_of_daily_backlog,
       ROUND(AVG(backlog), 1)                          AS average_backlog,
       ARG_MAX(backlog, day)                           AS backlog_end_of_week
FROM daily;
```

Result (1 row):

| opened_in_week | sum_of_daily_backlog | average_backlog | backlog_end_of_week |
|---|---|---|---|
| 37 | 62 | 8.9 | 5 |

“Opened in the week” is a sum. The backlog for the week is its *end-of-week* value (or the average, if the decision is staffing). The sum of daily backlogs counts the same open ticket seven times.

#### In the spec

- Say whether it is a stock or a flow, and how it rolls up over time (end of period, average, or max).
- Define the snapshot time (end of day, Chicago).
- For durations such as time to resolve, use only closed tickets and label it, or use a censoring-aware method: open tickets are the slow ones.

#### Coming from C#

A stock is like a running balance computed with `Aggregate` over a stream of +1 (opened) and −1 (closed) events. You would never sum the running balance across iterations, and the same rule applies to the SQL table.

> **On the job:** Support, warehouse, and incident teams staff from backlog and age-of-backlog metrics. A backlog chart that sums days, or a weekly “average resolution time” that ignores still-open tickets, sends people to the wrong queue.

> **The main idea:** flows add over time; stocks don’t. Roll a stock up with its end-of-period value (or a stated average), and check stock = previous stock + inflow − outflow.

*Read more:* [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-16"></a>
## 16. Bug clinic: believable business-metric bugs

*Practice · symptom → cause → fix*

Each bug below ships in real dashboards: the query runs, the number is plausible, and it is wrong. The first one is shown with SQL; the table collects the traps from the lessons of this deck in symptom → cause → fix form, so you can recognise them in a review.

#### 1 · “Our DAU is higher than the product analytics tool’s”

*SQL · believable, but wrong*

```sql
SELECT SUM(dau) AS dau
FROM (SELECT platform, COUNT(DISTINCT user_id) AS dau
      FROM customer_sessions
      WHERE session_date = DATE '2026-03-14'
        AND user_id IS NOT NULL
      GROUP BY platform);
```

Result (1 row):

| dau |
|---|
| 247 |

*SQL · fixed*

```sql
SELECT COUNT(DISTINCT user_id) AS dau
FROM customer_sessions
WHERE session_date = DATE '2026-03-14' AND user_id IS NOT NULL;
```

Result (1 row):

| dau |
|---|
| 221 |

**Cause:** DAU was computed per platform and then summed. People who used two platforms that day are counted twice. **Fix:** count distinct users over the whole population; distinct counts never add (lesson 11).

#### The pattern behind them

- Distinct counts, ratios, and percentiles re-aggregated as if they were sums.
- Immature cohorts or undecided units counted as failures.
- Populations that differ between numerator and denominator.
- Volume (GMV) reported as if it were revenue.

> **On the job:** A five-question review checklist catches most of these: Is any distinct count or percentile summed or averaged? Is the population the starting cohort? Are immature units excluded? Is a stock rolled up by its end value? Is this volume or revenue?

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 2 | Churn jumps in a fast-growing month | New subscribers who cancel in their first month are in the numerator but not the denominator | Population = subscribers paying at the start of the month | 8 |
| 3 | A downgrade shows up as churn | Any MRR decrease treated as a lost customer | Churn = no paid plan at the end; a downgrade is contraction | 7, 8 |
| 4 | The blended take rate differs from Finance’s | Mean of seller take rates, so a small seller weighs as much as a large one | Σ commission ÷ Σ third-party GMV | 9 |
| 5 | The newest listing week’s sell-through looks terrible | Listings younger than 14 days counted as unsold | Count only mature listings; NULL when none are mature | 10 |
| 6 | Step rates in the funnel look inconsistent | Any-order funnel mixes journeys that skipped a step | Strict order with a window, step-to-step and first-step rates | 12 |
| 7 | Every cohort’s week-4 retention “collapses” on the right edge | Cells whose week hasn’t finished shown as 0 | Mask immature cells as NULL (“maturing”) | 13 |
| 8 | On-time rate improves while a carrier gets slower | Only delivered parcels counted; overdue parcels in transit disappear | Decided population: in transit after the promise = late | 14 |
| 9 | The weekly p95 delivery time is “the average of the daily p95s” | Percentiles averaged | Recompute from raw durations per period | 14 |
| 10 | Weekly backlog several times the real queue | Daily backlog (a stock) summed over the week | End-of-period value; check start + opened − closed = end | 15 |

> **On the job:** Most of these bugs never fail a test: the numbers look reasonable. They are caught by a reviewer who asks for the spec card and checks the population, the unit, and the roll-up rule against it.

> **The main idea:** most business-metric bugs come from re-aggregating non-additive numbers, counting immature units as failures, or mismatched populations. Check those first.

---

<a id="slide-17"></a>
## 17. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

These are the business-metric questions that came up most often in the interview research behind this series (active users, DAU/MAU SQL, SaaS churn and NRR). Answer aloud in about a minute, then open the model answer. Metric-definition and north-star questions are in the *Metric design* deck; “metric dropped” questions are in the *Diagnosing metric changes* deck.

<details><summary>“How would you define “active users” for our app?” · *checks: decision first, a precise unit and window, exclusions, awareness of trade-offs*</summary>

**Model answer (about 60 seconds):** First I’d ask what decision it supports, for example tracking engagement after releases. Then I’d define the unit: a signed-in person, because anonymous visitors can’t be counted as people reliably. “Active” should be a meaningful action, say at least one real session, not a background app refresh or a push-notification open. Window: DAU, WAU, and a 28-day MAU ending on each local business day, so weekdays balance. Exclude bots, staff, and test accounts. Because these are distinct counts, I’d recount per window rather than add days. I’d add stickiness, DAU ÷ MAU, and note that the last two or three days restate because mobile events arrive late.

**Likely follow-up:** “DAU went up 20 % after we added push notifications. Is that good?” → Not necessarily: notifications buy opens, not value. I’d check a counter-metric such as week-4 retention, opt-outs, and orders per active user before calling it a win (Goodhart).

</details>

<details><summary>“How do you calculate churn? Can net revenue retention exceed 100 %?” · *checks: starting-cohort denominator, logos vs revenue, plan changes*</summary>

**Model answer (about 60 seconds):** Logo churn for a month is the number of customers paying at the start who are not paying at the end, divided by customers paying at the start. New customers of the month are not in the denominator, and plan changes are not churn. Revenue churn uses MRR instead and usually includes downgrades. Gross revenue retention is starting MRR minus churn and contraction, over starting MRR, so it is at most 100 %. Net revenue retention adds expansion from the same customers, so yes, it can exceed 100 % when upgrades outweigh losses. New-customer MRR never enters NRR.

**Likely follow-up:** “Most of our customers are on annual plans. Does monthly churn still make sense?” → Annual customers can only churn at renewal, so monthly logo churn understates risk; report churn by plan and renewal cohort, or annualised.

</details>

<details><summary>“Write DAU and MAU in SQL. Why can’t I sum DAU to get MAU?” · *checks: distinct counts over windows, portable SQL*</summary>

**Model answer (about 60 seconds):** DAU is COUNT(DISTINCT user_id) per day over qualifying activity. For a rolling MAU I join a date spine to user-day rows where the activity date is within the 28 days ending on each spine date, and count distinct users per spine date. Summing DAUs counts a regular user once per day they were active, so it overstates monthly users; distinct counts are non-additive and must be recounted per window, or approximated with mergeable sketches like HyperLogLog.

**Likely follow-up:** “Your engine doesn’t allow COUNT(DISTINCT …) OVER (…). Now what?” → Use the spine join (works everywhere), or in Spark size(collect_set(user_id)) over a window; T-SQL and Fabric Warehouse need the join.

</details>

> **The main idea:** SaaS, product, and SQL questions all reward the same habit: state the population, the unit, and the window before you give a number.

---

<a id="slide-18"></a>
## 18. Exercises 1–2 · operations and marketplace

*Exercises · interview-level*

Exercises use the Leafy warehouse (lesson 3) and the clean views from lesson 5. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · On-time rate and p95 by seller

**Pattern:** SLA rates, percentiles, censoring · **Format:** write the query · **Target time:** about 12 minutes.

Operations asks which seller is worst at delivering. For parcels with a promised date in February, return per seller: decided parcels, on-time rate (in transit after the promise counts as late), and p95 days from order to delivery for delivered parcels. Expected properties: one row per seller; rates between 0 and 1; the worst seller identified.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Take rate by seller and overall

**Pattern:** ratio of sums, marketplace economics · **Format:** write the query and explain the trade-off · **Target time:** about 10 minutes.

For February third-party orders, return each seller’s GMV (list value), commission revenue (commission rate × net value after discounts and refunds), and take rate (commission ÷ GMV). Then the overall third-party take rate. Expected properties: overall = Σ commission ÷ Σ GMV; it differs from the mean of seller take rates; every seller’s take rate ≤ its contract commission rate.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

---

<a id="slide-19"></a>
## 19. Exercises 3–4 · cohorts and churn

*Exercises · interview-level*

Exercises use the Leafy warehouse (lesson 3) and the clean views from lesson 5. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 3 · Week-over-week retained users

**Pattern:** retention self-join (a classic SQL screen) · **Format:** write the query · **Target time:** about 15 minutes.

For each complete week from 2 February to 16 March, return: active customers (signed in, at least one customer session), retained customers (active this week *and* the previous week), and retention = retained ÷ active in the previous week. Expected properties: 7 rows; retained ≤ both active counts; retention between 0 and 1.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · “What’s our monthly churn?”

**Pattern:** SaaS churn definitions · **Format:** write the query, defend the denominator · **Target time:** about 15 minutes.

Compute Leafy Plus logo churn and gross MRR churn for December 2025, January 2026, and February 2026 (start-of-month cohort, staff excluded, plan changes not churn). Expected properties: 3 rows; churned ≤ subscribers at start; February matches lesson 8.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

---

<a id="slide-20"></a>
## 20. Cheat sheet

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
| UTC → business time | `(ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'` | Metric design deck |
| A calendar week | `t >= DATE '2026-03-16' AND t < DATE '2026-03-23'` (half-open) | Metric design deck |
| Zero denominator | `num * 1.0 / NULLIF(den, 0)` | Metric design deck |
| Show empty days | date spine: `UNNEST(generate_series(d1, d2, INTERVAL 1 DAY))` + `LEFT JOIN` | Metric design deck |
| Maturity mask | `CASE WHEN cohort_end + window <= load THEN rate END` | 10, 13 |
| Rolling distinct users (portable) | spine `JOIN` user-days `ON u.day > d.day - 28 AND u.day <= d.day` | 11 |
| Overall rate | `SUM(num) / SUM(den)`, never `AVG(rate)` | Metric design deck |
| MRR bridge | start + new + expansion − contraction − churn = end | 7 |
| Stock roll-up | end-of-period value; check start + in − out = end | 15 |
| Percentiles | `quantile_cont(x, 0.95)` from raw values; never average them | 14 |

> **On the job:** Keep the 17 fields and the question list next to you during stakeholder conversations and interviews; keep the pattern table next to you when writing the SQL.

> **The main idea:** define with the card, implement with the patterns, test with the invariants (unique keys, numerator ≤ denominator, reconciliation to a control total).

---

<a id="slide-21"></a>
## 21. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Active user | A distinct person who performed a defined action in a window (DAU, WAU, MAU). |
| Additive / semi-additive / non-additive | Can be summed over every dimension / over all but time / not at all (ratios, distinct counts, percentiles). |
| AOV | Average order value: a sales amount ÷ number of orders, over the same orders. |
| Attribution date | The timestamp that places a fact in a period (order date, refund date, promise date). |
| Backlog | Open items at a point in time; a stock. |
| Bot policy | The written rule that identifies non-human traffic (user-agent list plus behaviour rules). |
| Censoring (right, left) | Outcomes not yet observed because data ends (right) or starts (left) mid-way. |
| Churn (logo, revenue) | Share of starting customers (logos) or starting MRR lost in a period. |
| Cohort | Units that started at the same time, tracked together. |
| Conversion window | How long a unit has to complete a funnel. |
| Counter-metric / guardrail | A metric that must not degrade while another is optimised. |
| Date spine | A table with one row per calendar date, used to show empty periods. |
| Denominator / numerator | What a rate divides by / what it counts on top; the numerator is a subset of the denominator. |
| Distinct key | The column whose distinct values define the counted unit. |
| Event grain / entity grain | One row per thing that happened / one row per session, user, order. |
| Exclusions | Rows removed from every metric for a stated reason (staff, QA, cancelled). |
| Flow / stock | Quantity during a period (adds over time) / level at a point in time (does not). |
| Funnel | A sequence of steps toward a goal and the share of units reaching each. |
| GMV | Gross merchandise value: list value of everything sold on a platform. |
| GRR / NRR | Gross / net revenue retention: share of starting MRR kept without / with expansion. |
| Late-arriving event | An event that reaches the warehouse long after it happened. |
| Liquidity, sell-through | How reliably supply meets demand; share of listings sold within a window. |
| Maturity | A period or cohort is mature when every unit has had its full outcome window. |
| Metric | A number computed by a precise, repeatable rule from data, used to make a decision. |
| Metric spec card | A short structured definition of a metric: the fields in lesson 4. |
| MRR, MRR bridge | Monthly recurring revenue at a point in time; its change split into new, expansion, contraction, churn. |
| Observation limit | The edge of what the data can show: incomplete periods and outcomes not yet observed. |
| Percentile (p50, p95) | The value below which 50 % / 95 % of observations fall. |
| Population | The set of units eligible to be counted: the denominator. |
| Retention | Share of a cohort still active N periods later. |
| SLA | Service-level agreement: a promise with a deadline, measured as the share of units meeting it. |
| Stickiness | DAU ÷ MAU. |
| Take rate | Marketplace revenue ÷ third-party GMV, as a ratio of sums. |
| Time window | The period a metric covers: a calendar period or a rolling window. |
| Zero denominator | A segment with no eligible units; its rate is NULL, not 0. |

> **The main idea:** if a term on a dashboard is not in a glossary like this one, with a spec card behind it, it is not yet a metric.

---

<a id="slide-22"></a>
## 22. Recap and practice plan

*Reference · what to remember*

1. Every worked metric starts from a spec card: decision, population, unit, numerator and denominator, window, exclusions, maturity.
2. Commerce: say which amount (list, after discounts, after refunds, with or without shipping); AOV is total amount ÷ orders, never an average of averages.
3. SaaS: MRR is a stock; explain its change with a bridge that reconciles exactly; churn needs a starting cohort and a unit (logos or MRR).
4. Marketplace: GMV is volume, net revenue is what you keep, take rate links them as Σ commission ÷ Σ GMV.
5. Liquidity, retention, and SLA rates are cohort rates: count a unit only when its window has closed.
6. Active users are distinct counts over a window; recount per window, never add DAUs.
7. Funnels are defined by unit, step order, rate base, and window.
8. Speed is a percentile from raw durations; a backlog is a stock rolled up by its end-of-period value.

#### Practice plan (one week)

- Day 1: rebuild the spec cards of lessons 6–8 from memory; compare with the deck.
- Day 2: exercises 1–2 (operations and marketplace) in DuckDB.
- Day 3: exercises 3–4 (retention and churn), then port one to T-SQL or Spark SQL.
- Day 4: the three interview answers aloud, with a timer.
- Day 5: pick the business model closest to your job and write its five headline metrics as spec cards.

#### Further practice

- [DataLemur: active user retention](https://datalemur.com/questions/user-retention) (SQL screen practice; compare with exercise 3).
- [Stripe: subscription analytics](https://docs.stripe.com/billing/subscriptions/analytics) (one vendor’s MRR and churn definitions; compare with lessons 7–8).
- Pick any public company’s quarterly report and write spec cards for two of its KPIs: you will find the definitions in footnotes.

> **The main idea:** each business model has a handful of headline metrics; each one is a spec card plus a query over the clean base. Deck 2 (Metric design) teaches how to write the cards.

---

<a id="slide-23"></a>
## 23. References and how this deck was tested

*References · official documentation and what to read there*

| Source | What to read there |
|---|---|
| [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz) | `AT TIME ZONE`, ICU, how session time zones affect display. |
| [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [FILTER](https://duckdb.org/docs/stable/sql/query_syntax/filter) | `COUNT(DISTINCT)`, `quantile_cont`, `median`, `corr`, filtered aggregates. |
| [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify) | Frames with `RANGE … INTERVAL`, distinct window aggregates. |
| [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view) | Multi-grain roll-ups, reusable expressions, the base layer. |
| [Fabric Warehouse: T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area) | What Fabric Warehouse supports (QUALIFY, MEDIAN, QUANTILE) and what it doesn’t. |
| [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/) | Why ratios and balances need special roll-up rules. |
| [Stripe: subscription analytics](https://docs.stripe.com/billing/subscriptions/analytics) | One vendor’s published MRR and churn definitions: compare with lessons 7–8. |
| [Google Analytics: active users](https://support.google.com/analytics/answer/12253918), [Mixpanel: funnels](https://docs.mixpanel.com/docs/reports/funnels/funnels-overview), [retention](https://docs.mixpanel.com/docs/reports/retention) | How product tools define active users, funnel order and windows, retention. |

**How this deck was tested:** DuckDB 1.5.6 on CPython 3.12.10 (pandas 3.0.6 for loading), Windows 11. Every DuckDB query and Python block ran during the build; the build fails on any error, unexpected result, or unordered multi-row result. T-SQL, Fabric Warehouse, Spark SQL, dbt YAML, and DAX snippets are reference only. Interview patterns were researched in October 2026; all questions are original.

> **The main idea:** official documentation for the syntax, the spec card for the meaning: you need both for every metric.

---

<a id="slide-24"></a>
## 24. Appendix: the Leafy data generator (spoilers for the WBR lab)

*Reference · make_leafy.py, the full source*

This script built `leafy.duckdb` for every query in the deck (lesson 3 ran it). It is deterministic: one seed per table, fixed dates, no network. Read it after the weekly-business-review lab in the *Diagnosing metric changes* deck: the constants near the top are the answers to that lab and to several exercises. Run it with `python make_leafy.py` in the environment from lesson 2.

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
### Hint 1 · On-time rate and p95 by seller

Join `clean_orders` to `shipments` and `sellers`. February promises are all decided by the load date. Percentiles: `quantile_cont`.

<a id="hint-2"></a>
### Hint 2 · Take rate by seller and overall

Aggregate refunds to order level first (one row per order), then to seller level. Lesson 9 has the revenue formula.

<a id="hint-3"></a>
### Hint 3 · Week-over-week retained users

Reduce to one row per (user, week) first. Then join that set to itself on the same user and week = previous week + 7 days. Use date arithmetic, not week numbers, so year boundaries work.

<a id="hint-4"></a>
### Hint 4 · “What’s our monthly churn?”

Generate the three month starts, take a snapshot of MRR per user at the start and at the next month start (lesson 7), then classify each user.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · On-time rate and p95 by seller

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

rows = con.execute("""
    SELECT s.seller_name,
           COUNT(*)                                                                   AS decided,
           ROUND(COUNT(*) FILTER (WHERE local_ts(sh.delivered_at_utc)::DATE <= sh.promised_date)
                 / COUNT(*), 3)                                                      AS on_time_rate,
           ROUND(quantile_cont(date_diff('hour', o.placed_at_local,
                                         local_ts(sh.delivered_at_utc)) / 24, 0.95), 1) AS p95_days
    FROM clean_orders o
    JOIN shipments sh USING (order_id)
    JOIN sellers s USING (seller_id)
    WHERE sh.promised_date BETWEEN DATE '2026-02-01' AND DATE '2026-02-28'
    GROUP BY s.seller_name
    ORDER BY on_time_rate, s.seller_name""").fetchall()
for r in rows:
    print(*r)
assert len(rows) == len({r[0] for r in rows}) == 7
assert all(0 <= r[2] <= 1 for r in rows)
worst = rows[0][0]
print("worst on-time rate:", worst)
assert worst == "Rare Roots"
```

Output:

```text
Rare Roots 48 0.771 7.6
Orchid Hub 35 0.914 6.8
Bonsai Barn 73 0.932 6.4
Moss Market 62 0.935 6.4
Leafy 598 0.965 6.0
Cactus Club 81 0.975 5.7
Fern & Co 137 1.0 5.8
worst on-time rate: Rare Roots
```

**Why it works.** The denominator is every parcel whose promise has passed, so a lost or stuck parcel lowers the rate instead of disappearing; p95 is computed from each seller’s raw durations. Rare Roots ships later than other sellers, which shows in both columns. **Common wrong answer:** on-time over delivered parcels only, which flatters exactly the slowest sellers, or averaging daily p95s. **Interviewer follow-up:** “Seller Orchid Hub has few parcels; is its rate reliable?” → show the count next to the rate and consider a minimum volume or a confidence interval before ranking.

<a id="solution-2"></a>
### Solution 2 · Take rate by seller and overall

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

rows = con.execute("""
    WITH r AS (SELECT order_id, SUM(amount) AS refunded FROM clean_refunds GROUP BY order_id)
    SELECT s.seller_name, s.commission_rate,
           SUM(o.items_amount)                                              AS gmv,
           SUM((o.net_items - COALESCE(r.refunded, 0)) * o.commission_rate) AS commission
    FROM clean_orders o JOIN sellers s USING (seller_id) LEFT JOIN r USING (order_id)
    WHERE NOT o.is_first_party AND o.order_date BETWEEN DATE '2026-02-01' AND DATE '2026-02-28'
    GROUP BY s.seller_name, s.commission_rate
    ORDER BY gmv DESC""").fetchall()
for name, contract, gmv, commission in rows:
    print(f"{name:<12} contract {float(contract):.2f}  GMV {gmv:>9}  take rate {commission / gmv:.4f}")
overall = sum(r[3] for r in rows) / sum(r[2] for r in rows)
mean_of_rates = sum(r[3] / r[2] for r in rows) / len(rows)
print(f"overall take rate {overall:.4f} | mean of seller rates {mean_of_rates:.4f}")

assert abs(overall - mean_of_rates) > 1e-4
assert all(r[3] / r[2] <= r[1] for r in rows)
```

Output:

```text
Fern & Co    contract 0.15  GMV   7700.79  take rate 0.1416
Cactus Club  contract 0.15  GMV   5081.00  take rate 0.1394
Bonsai Barn  contract 0.12  GMV   4416.61  take rate 0.1148
Moss Market  contract 0.15  GMV   4233.58  take rate 0.1219
Rare Roots   contract 0.15  GMV   3230.75  take rate 0.1423
Orchid Hub   contract 0.10  GMV   2018.79  take rate 0.0755
overall take rate 0.1287 | mean of seller rates 0.1226
```

**Why it works.** The overall take rate is what Leafy actually earns per dollar of third-party GMV, so it weights sellers by GMV. Take rates sit below contract rates because commission is charged on value after discounts and refunds while GMV is list value. **Common wrong answer:** the mean of seller take rates, which lets Orchid Hub (low volume, 10 %) count as much as Fern & Co. **Interviewer follow-up:** “Leafy runs a promotion it pays for itself; what happens to take rate?” → GMV stays at list value, Leafy’s net revenue drops, so the achieved take rate falls even though no contract changed.

<a id="solution-3"></a>
### Solution 3 · Week-over-week retained users

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

rows = con.execute("""
    WITH uw AS (SELECT DISTINCT user_id, date_trunc('week', session_date)::DATE AS week
                FROM customer_sessions WHERE user_id IS NOT NULL),
    act AS (SELECT week, COUNT(*) AS active FROM uw GROUP BY week)
    SELECT cur.week,
           a.active                                  AS active,
           prev_a.active                             AS active_prev_week,
           COUNT(p.user_id)                          AS retained,
           ROUND(COUNT(p.user_id) / prev_a.active, 3) AS retention
    FROM uw cur
    JOIN act a       ON a.week = cur.week
    JOIN act prev_a  ON prev_a.week = cur.week - 7
    LEFT JOIN uw p   ON p.user_id = cur.user_id AND p.week = cur.week - 7
    WHERE cur.week BETWEEN DATE '2026-02-02' AND DATE '2026-03-16'
    GROUP BY cur.week, a.active, prev_a.active
    ORDER BY cur.week""").fetchall()
for r in rows:
    print(*r)
assert len(rows) == 7
assert all(r[3] <= r[1] and r[3] <= r[2] and 0 < r[4] < 1 for r in rows)
```

Output:

```text
2026-02-02 556 546 353 0.647
2026-02-09 582 556 350 0.629
2026-02-16 631 582 379 0.651
2026-02-23 666 631 380 0.602
2026-03-02 668 666 388 0.583
2026-03-09 733 668 412 0.617
2026-03-16 763 733 446 0.608
```

**Why it works.** One row per user-week makes the self-join one-to-one, so each retained person is counted once; the previous-week join uses date arithmetic. Restricting to complete weeks keeps the last row mature. **Common wrong answer:** joining raw sessions to raw sessions, which multiplies rows for frequent users (fan-out, SQL correctness deck), or using `week_number - 1`, which breaks in the first week of a year. **Interviewer follow-up:** “Do it by month” → same shape with `date_trunc('month', …)` and `+ INTERVAL 1 MONTH`; mention that March is incomplete here.

<a id="solution-4"></a>
### Solution 4 · “What’s our monthly churn?”

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

rows = con.execute("""
    WITH months AS (SELECT * FROM (VALUES (DATE '2025-12-01'), (DATE '2026-01-01'), (DATE '2026-02-01')) m(month_start)),
    snap AS (
        SELECT m.month_start, p.user_id,
               SUM(p.mrr) FILTER (WHERE p.valid_from <= m.month_start
                    AND (p.valid_to IS NULL OR p.valid_to > m.month_start))                     AS s,
               SUM(p.mrr) FILTER (WHERE p.valid_from <= m.month_start + INTERVAL 1 MONTH
                    AND (p.valid_to IS NULL OR p.valid_to > m.month_start + INTERVAL 1 MONTH)) AS e
        FROM months m CROSS JOIN plus_periods p
        WHERE p.plan <> 'staff'
        GROUP BY m.month_start, p.user_id
    )
    SELECT month_start,
           COUNT(*) FILTER (WHERE s > 0)                                 AS subscribers_at_start,
           COUNT(*) FILTER (WHERE s > 0 AND COALESCE(e, 0) = 0)          AS churned,
           ROUND(churned / subscribers_at_start, 4)                      AS logo_churn,
           ROUND(COALESCE(SUM(s - COALESCE(e, 0)) FILTER (WHERE s > 0 AND COALESCE(e, 0) < s), 0) / SUM(s), 4) AS gross_mrr_churn
    FROM snap
    GROUP BY month_start
    ORDER BY month_start""").fetchall()
for r in rows:
    print(*r)
lesson8 = con.execute("""                       -- lesson 8's query, for February
    WITH snap AS (SELECT d.snapshot, p.user_id
                  FROM (VALUES (DATE '2026-02-01', 'start'), (DATE '2026-03-01', 'end')) d(day, snapshot)
                  JOIN plus_periods p ON p.valid_from <= d.day AND (p.valid_to IS NULL OR p.valid_to > d.day)
                  WHERE p.plan <> 'staff')
    SELECT ROUND(COUNT(DISTINCT user_id) FILTER (WHERE snapshot = 'start' AND user_id NOT IN
                     (SELECT user_id FROM snap WHERE snapshot = 'end'))
                 / COUNT(DISTINCT user_id) FILTER (WHERE snapshot = 'start'), 4) FROM snap""").fetchone()[0]
feb = rows[-1]
assert len(rows) == 3 and all(r[2] <= r[1] for r in rows)
assert str(feb[0]) == "2026-02-01" and feb[3] == lesson8
```

Output:

```text
2025-12-01 31 0 0.0 0.0
2026-01-01 60 1 0.0167 0.0366
2026-02-01 88 3 0.0341 0.0664
```

**Why it works.** Each month uses only customers paying at its start, so new customers of the month can’t inflate the numerator, and a plan change keeps MRR above zero, so it is not churn. Gross MRR churn includes downgrades, so it can be higher than logo churn. **Common wrong answer:** cancellations ÷ subscribers at month end (denominator includes people who couldn’t have churned yet). **Interviewer follow-up:** “Why is December’s base so small?” → Leafy Plus launched in October; small bases make rates noisy, so show counts next to rates.
