# Metric design: define the number before writing SQL

*Companion to `metric-design.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, pandas 3.0.6 (only to load the generated data), Windows 11 (64-bit). SQL is DuckDB’s PostgreSQL-flavoured dialect. Where interviews ask, lessons add notes for SQL Server (T-SQL), Microsoft Fabric Warehouse (T-SQL), and Spark SQL; that other-dialect syntax is reference only and was not executed. Every DuckDB query in this document ran while it was built, and the result under it is the real result. The data is synthetic and deterministic: `make_leafy.py` (lesson 3, source in the last slide) rebuilds exactly the same warehouse on any machine.

**Series:** this is deck 2 of 3 on business metrics. Deck 1, *Business models and metrics*, works through commerce, SaaS, marketplace, product, and operations metrics with spec cards; deck 3, *Diagnosing metric changes*, covers Simpson’s paradox and mix shift, the “metric dropped” root-cause workflow, and the weekly-business-review lab. All three use the same Leafy warehouse and clean base.

**Prerequisites:** the SQL windows deck (window functions, `QUALIFY`), the dimensional-modelling deck (grain, facts and dimensions, additive and semi-additive measures), and “SQL correctness: joins, grain, NULLs, and aggregation” (fan-out, NULL logic, weighted ratios, `FILTER`, integer division). This deck builds on them and does not re-teach them. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common metric, product-sense and analytics-engineering interview patterns (research done in October 2026: metric-definition cases, ratio traps, north star and guardrails, reconciliation with finance). All questions are original and use the Leafy data.

**Additions beyond the original brief** are marked *(added)*: a clarifying-question routine for vague requests; attribution dates and restated history (refunds that land later); late-arriving data and “as known at” numbers; Goodhart’s law and A/B-test guardrail metrics; metric definitions as code (semantic layers); governance, certified metrics, and reconciling with finance; dialect notes for metric SQL (T-SQL, Fabric Warehouse, Spark SQL).

## Contents

1. [Metric design: define the number before writing SQL](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and dialect](#slide-2)
3. [The running example: the Leafy metrics warehouse](#slide-3)
4. [One request, six numbers](#slide-4)
5. [The metric spec card](#slide-5)
6. [A routine for vague requests: ask before you count](#slide-6)
7. [Business decision and population: who is in the denominator?](#slide-7)
8. [Grain and distinct keys: conversion of what?](#slide-8)
9. [Numerator and denominator: build both from the same rows](#slide-9)
10. [Time window and time zone: whose midnight?](#slide-10)
11. [Attribution date: which timestamp puts a number in a period?](#slide-11)
12. [Exclusions, bot policy, and duplicates](#slide-12)
13. [Missing data and late-arriving events](#slide-13)
14. [Zero denominators and integer division](#slide-14)
15. [Observation limits and maturity](#slide-15)
16. [One clean base: write each policy once](#slide-16)
17. [Average of ratios vs ratio of sums](#slide-17)
18. [Re-aggregation: store numerator and denominator](#slide-18)
19. [North star and guardrail metrics](#slide-19)
20. [Leading and lagging, input and output metrics](#slide-20)
21. [Metric trees: decompose a number into its drivers](#slide-21)
22. [Goodhart’s law, gaming, and A/B-test guardrails](#slide-22)
23. [Metric definitions as code: semantic layers](#slide-23)
24. [Governance, certified metrics, and reconciling with Finance](#slide-24)
25. [Recognise the metric question](#slide-25)
26. [Bug clinic: believable metric-definition bugs](#slide-26)
27. [Interview questions and model answers](#slide-27)
28. [Exercises 1–3 · warm-ups](#slide-28)
29. [Exercises 4–5 · vague requests](#slide-29)
30. [Exercise 6 · stretch](#slide-30)
31. [Cheat sheet](#slide-31)
32. [Dialect cheat sheet](#slide-32)
33. [Glossary](#slide-33)
34. [Recap and practice plan](#slide-34)
35. [References and how this deck was tested](#slide-35)
36. [Appendix: the Leafy data generator (spoilers for the WBR lab)](#slide-36)
37. [Appendix A · Hints](#appendix-a)
38. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Metric design: define the number before writing SQL

**

“What’s our conversion rate?” has a dozen correct answers. They differ in who is counted, what one row means, which clock and time zone decide the day, what is excluded, and what happens when data is missing, late, or not mature yet. This deck teaches you to write those choices down as a **metric spec card**, implement the card in SQL that you can test, and combine metrics into a system: a north star, guardrails, and a metric tree.

- **Start here:** setup, the Leafy warehouse, one request with six answers.
- **Part A, the spec:** business decision, population, grain, numerator and denominator, distinct keys, time window and time zone, attribution date, exclusions, bot policy, missing and late data, zero denominators, observation limits and maturity, and one clean base layer.
- **Part B, ratios:** average of ratios vs ratio of sums, re-aggregation from stored components.
- **Part C, metric systems:** north star and guardrails, leading and lagging indicators, input and output metrics, metric trees, Goodhart’s law, metric definitions as code, governance and reconciliation with finance, interview patterns.
- **Practice:** a bug clinic, interview questions with model answers, and 6 exercises.

This is deck 2 of 3 in the business-metrics series. Deck 1, *Business models and metrics*, works through commerce, SaaS, marketplace, product, and operations metrics; deck 3, *Diagnosing metric changes*, covers Simpson’s paradox, the root-cause workflow, and the weekly-business-review lab. Every query ran in DuckDB while the deck was built; the result under each query is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Every dashboard, experiment, and leadership review rests on a few numbers. If “conversion”, “active users”, or “revenue” mean different things to different people, the company argues about numbers instead of acting on them, or acts on the wrong ones. The SQL is rarely the hard part: deciding **who is counted, what one row means, which clock decides the day, and what to do with missing, late, and immature data** is. This deck teaches you to make those decisions explicitly, write them down as a spec card, implement them in tested SQL, and connect metrics into a system of north star, guardrails, and drivers.

#### Where you will use it

- Turning a stakeholder’s “can you get me X?” into a definition and a query.
- Building the shared base views and component tables that every dashboard reads.
- Choosing a north star and guardrails for a team or an experiment.
- Moving metric logic into a semantic layer with owners and versions.
- Reconciling product numbers with Finance at month end.

#### What goes wrong without it

- Two dashboards show different “conversion” and nobody trusts either.
- A bot wave or a staff test inflates traffic, and a team celebrates.
- An immature cohort looks like a collapse; a fire drill starts on Monday.
- Averaged ratios mislead a board deck.
- A target gets gamed because nobody watches a counter-metric.

#### Who expects you to know it

- Analytics engineers: own metric definitions, base layers, and semantic layers.
- Data analysts and data scientists: define metrics daily and defend them in reviews.
- Data engineers: build the pipelines whose timestamps, keys, and late data decide the numbers.
- Interviewers: “define a metric” and “pick a north star” appear in most analytics loops.

> **On the job:** Your first ticket on an analytics team: “The CEO wants weekly active users and conversion on the leadership dashboard by Friday.” A strong answer is a one-page spec for each metric, agreed with the CEO’s chief of staff on Tuesday, SQL over a tested base layer on Wednesday, and a dashboard with a definition link on Thursday, before anyone has argued about a number.

> **The main idea:** metrics are definitions first and SQL second; the people who can write the definition down are the people whose numbers get trusted.

*Read more:* [Amplitude: the North Star metric](https://amplitude.com/blog/product-north-star-metric), [dbt Semantic Layer](https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-sl), [dbt: metrics overview](https://docs.getdbt.com/docs/build/metrics-overview).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A stakeholder asks for a number in business words | Clarifying routine + spec card (lessons 5–6) | Turns a vague ask into a choice between concrete readings. |
| A rate or average across days, segments, or sellers | Ratio of sums from stored components (lessons 17–18) | Means of ratios are wrong at every grain but one. |
| A cohort or recent period looks bad | Maturity and observation limits (lesson 15) | Recent cohorts haven’t had time to reach the outcome. |
| Setting team goals or experiment success | North star + guardrails (lessons 19, 22) | Targets get gamed unless a counter-metric watches them. |
| Explaining what drives a top-line number | Metric tree (lesson 21) | An exact formula of drivers shows which team can move what. |
| A one-off exploratory question for yourself | Not a full spec card | A quick query with stated assumptions is enough; formalise only what others will reuse. |
| A finance-reported figure (booked revenue, cash) | Use Finance’s definition; reconcile, don’t re-derive (lesson 24) | Accounting rules (revenue recognition, closed months) belong to Finance. |

#### How interviews test it

- “How would you measure success for feature X?” (decision first, population, unit, window, a guardrail).
- “Here are per-store CTRs; what is the overall CTR?” (ratio of sums).
- “Pick a north star for this product” (customer value, leading, hard to game, guardrails).
- “Your number doesn’t match Finance” (reconciliation bridge, governance).
- Follow-ups on time zones, bots, late data, and “this week so far” (the spec fields of Part A).

#### Where it sits in your learning path

- Builds on the SQL windows deck (window functions, `QUALIFY`) and SQL correctness (fan-out, NULLs, weighted ratios, `FILTER`).
- Uses the dimensional-modelling deck’s grain and additivity, and the dbt decks’ layered models.
- Deck 1 (Business models and metrics) shows worked spec cards per business model; deck 3 (Diagnosing metric changes) uses these definitions to explain moves.

> **The main idea:** reach for a spec card whenever a number will be reused by someone else; skip the ceremony for one-off exploration.

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

Note the first trap already: in DuckDB `/` always returns a decimal result and `//` is integer division. In SQL Server and Fabric Warehouse, `7 / 2` on integers is **3** (lesson 14).

> **On the job:** Metric SQL is usually written once in a warehouse (Fabric, Snowflake, Databricks, BigQuery) and read by many dashboards. DuckDB is a fast local scratchpad to prototype a definition on a sample and to unit-test edge cases before you port it.

> **The main idea:** one local engine, one deterministic data file, every result executed. Practise metric definitions the same way: small data, predicted answer, then the query.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: numeric operators (/ and //)](https://duckdb.org/docs/stable/sql/functions/numeric), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-3"></a>
## 3. The running example: the Leafy metrics warehouse

*Start here · one small warehouse, five kinds of business*

Leafy, the plant shop from the Python and dbt decks, has grown. It sells its own plants (**commerce**), runs a paid **Leafy Plus** membership (**SaaS**), lets third-party sellers list rare plants for a commission (**marketplace**), has a website and two apps (**product**), and ships parcels and answers tickets (**operations**). One script, `make_leafy.py`, generates about eight weeks of deterministic data: same seed, same rows, on every machine. Its source is the last slide of this deck. It also contains the answers to the weekly-business-review lab in the *Diagnosing metric changes* deck, so read it after that lab.

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

| Trap planted in the data | Where | Lesson |
|---|---|---|
| Bots: crawler user agents, and a scraper that pretends to be a browser | `events` | 12 |
| Leafy staff and QA test accounts that browse and place orders | `users.is_internal`, `is_test` | 7, 12 |
| The same event delivered twice (same `event_id`) | `events` | 9, 12 |
| NULL keys: anonymous visitors, tickets without an order, unknown country | `events.user_id`, `tickets.order_id`, `users.country` | 13 |
| App events that arrive hours or days late | `events.received_at_utc` | 13 |
| A daylight-saving change (Sunday 8 March) and orders near midnight UTC | all `_utc` columns | 10 |
| A day with zero sessions on one platform | `events` | 14 |
| Refunds that land weeks after the order, in a later month | `refunds` | 11 |
| An incomplete current period, immature trials, parcels still in transit | everywhere | 15 |

> **On the job:** Real warehouses look like this: several source systems, each with its own clock, keys, and quirks. Your first week on an analytics team is usually spent learning exactly this table of traps for your company’s data, then writing it down so the next person doesn’t rediscover it.

> **The main idea:** one deterministic dataset with every common metric trap planted. Each lesson shows how one trap changes a number, and the spec field that controls it.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-4"></a>
## 4. One request, six numbers

*Start here · “How many orders did we have last week?”*

A sales manager asks on Wednesday 25 March: *“How many orders did we have last week?”* Six analysts could write six reasonable queries. All of them run. They disagree.

```sql
WITH o AS (
    SELECT o.*, u.is_internal, u.is_test,
           (placed_at_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago' AS placed_at_local
    FROM orders o JOIN users u USING (user_id)
)
SELECT 1 AS reading, 'all order rows, UTC week'            AS definition,
       COUNT(*) FILTER (WHERE placed_at_utc >= '2026-03-16' AND placed_at_utc < '2026-03-23') AS orders
FROM o
UNION ALL
SELECT 2, 'all order rows, Chicago week',
       COUNT(*) FILTER (WHERE placed_at_local >= '2026-03-16' AND placed_at_local < '2026-03-23') FROM o
UNION ALL
SELECT 3, 'Chicago week, completed only',
       COUNT(*) FILTER (WHERE placed_at_local >= '2026-03-16' AND placed_at_local < '2026-03-23'
                          AND status = 'completed') FROM o
UNION ALL
SELECT 4, 'Chicago week, completed, no staff or test accounts',
       COUNT(*) FILTER (WHERE placed_at_local >= '2026-03-16' AND placed_at_local < '2026-03-23'
                          AND status = 'completed' AND NOT is_internal AND NOT is_test) FROM o
UNION ALL
SELECT 5, 'last 7 × 24 hours before the load, completed, customers',
       COUNT(*) FILTER (WHERE placed_at_utc >= TIMESTAMP '2026-03-25 15:00' - INTERVAL 7 DAY
                          AND status = 'completed' AND NOT is_internal AND NOT is_test) FROM o
UNION ALL
SELECT 6, '“purchase” events in the Chicago week (raw event table)',
       (SELECT COUNT(*) FROM events
        WHERE event_name = 'purchase'
          AND (event_at_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago' >= '2026-03-16'
          AND (event_at_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago' <  '2026-03-23')
ORDER BY reading;
```

Result (6 rows):

| reading | definition | orders |
|---|---|---|
| 1 | all order rows, UTC week | 245 |
| 2 | all order rows, Chicago week | 243 |
| 3 | Chicago week, completed only | 235 |
| 4 | Chicago week, completed, no staff or test accounts | 224 |
| 5 | last 7 × 24 hours before the load, completed, customers | 256 |
| 6 | “purchase” events in the Chicago week (raw event table) | 244 |

#### What changed between readings

- **1 → 2, time zone:** the week starts at midnight in Chicago, not midnight UTC. Orders placed on Sunday evening in Chicago are Monday in UTC.
- **2 → 3, status:** cancelled orders are rows, but are they orders?
- **3 → 4, population:** staff and QA accounts place real-looking orders.
- **4 → 5, window:** “last week” as a calendar week vs the last 168 hours.
- **6, source and grain:** purchase *events* include duplicate deliveries and miss late ones; the order service is the system of record for orders.

#### The point of this deck

None of these queries is “wrong SQL”. Each answers a different question. The bug is upstream: the question was never defined. The fix is a written definition, agreed with the person who asked, *before* anyone writes SQL.

That definition is a **metric**: a number computed by a precise, repeatable rule from data, used to make a decision. The written rule is its **metric specification** (spec). Lesson 5 gives you the template.

#### A helper used from now on

*SQL · DuckDB macro*

```sql
CREATE OR REPLACE MACRO local_ts(ts_utc) AS
    (ts_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago';
```

Reading 2 converted every UTC timestamp to Chicago wall-clock time with a double `AT TIME ZONE`. A DuckDB **macro** is a named, reusable SQL expression (like an inline function), so later queries can write `local_ts(placed_at_utc)`. Lesson 10 explains why the conversion is written this way and how other engines spell it.

#### Check it

```sql
SELECT TIMESTAMP '2026-03-16 03:30' AS placed_at_utc,
       local_ts(TIMESTAMP '2026-03-16 03:30') AS placed_at_local;
```

Result (1 row):

| placed_at_utc | placed_at_local |
|---|---|
| 2026-03-16T03:30:00 | 2026-03-15T22:30:00 |

03:30 UTC on Monday is 22:30 on Sunday in Chicago: the order belongs to the *previous* business week.

> **On the job:** This is the most common source of “the dashboard is wrong” tickets: two teams compute the same name with different rules. Analytics engineers are often hired precisely to stop this, by owning shared definitions in one place (lessons 23–24).

> **The main idea:** a metric name is not a definition. Before writing SQL, pin down the time zone, status, population, window, and source of truth, and agree them with the person who asked.

*Read more:* [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro).

---

<a id="slide-5"></a>
## 5. The metric spec card

*Part A · the template you fill in before writing SQL*

A **metric spec card** is a short, structured definition of one metric. Each field forces one decision that otherwise hides inside a query. Coming from C#: it is the interface contract and XML doc comment of a number. The SQL is the implementation; the card is what callers rely on.

| Field | Question it answers | Example: Leafy session conversion rate |
|---|---|---|
| Name and one-line definition | What is it, in one sentence a stakeholder would agree with? | *Session conversion rate*: share of customer sessions that end in a purchase. |
| Business decision | Which decision changes if this number moves? What would you do differently? | Weekly: keep or roll back checkout changes; spot broken app releases. |
| Owner | Who approves a change to the definition, and who answers questions? | Growth analytics lead; definition reviewed with Product. |
| Population | Which units are eligible to be counted at all? | Sessions on web, iOS, Android by people, not by Leafy staff or QA. |
| Grain (event or entity) | What is one counted unit? What is one output row? | Unit: a session. Output: one row per Chicago day × platform. |
| Numerator | What is counted on top? | Sessions in the population with ≥ 1 `purchase` event. |
| Denominator | What is it divided by? (Numerator must be a subset.) | All sessions in the population. |
| Distinct keys | Which key removes duplicates for each count? | `session_id`; events de-duplicated on `event_id`. |
| Time window and time zone | Which period, which calendar, which clock? | Calendar day or week (Mon–Sun), America/Chicago, half-open `[start, end)`. |
| Attribution date | Which timestamp places a unit in a period? | The session’s first event time. |
| Exclusions | Which rows are removed, and why? | Staff (`is_internal`) and QA (`is_test`) accounts. |
| Bot policy | How are non-human visits detected and removed? | User-agent list and a behaviour rule (≥ 30 product views in one session). |
| Missing-data policy | What happens to NULL keys and late rows? | Anonymous sessions kept; late events included when they arrive; numbers restate. |
| Zero-denominator rule | What is shown when the denominator is 0? | NULL, displayed as “–”, never 0 %. |
| Observation limits / maturity | When is a period complete enough to report? | Only complete Chicago days; the current day is hidden. |
| Refresh and latency | How often is it computed, how fresh is the data? | Daily at 06:00 Chicago; app events can arrive up to 60 h late. |
| Known caveats | What should every reader know? | Not comparable with the old UTC-based dashboard before March 2026. |

#### A blank card to copy

```text
METRIC SPEC: <name>
Definition (one sentence):
Business decision:                       Owner:
Population:
Grain (unit counted / output row):
Numerator:                               Denominator:
Distinct keys:
Time window, time zone, attribution date:
Exclusions:                              Bot policy:
Missing data and late rows:              Zero denominator:
Observation limits / maturity:           Refresh and latency:
Known caveats:                           Version / last changed:
```

#### How to use it

- Fill it in **with** the person who asked, in their words, before writing SQL.
- Write the SQL so each field maps to one visible clause: population → `WHERE`, distinct keys → `COUNT(DISTINCT …)`, zero denominator → `NULLIF`.
- Store the card next to the code (dbt model YAML, a semantic-layer file, or the dashboard’s description). Lesson 23 shows metrics as code.
- Version it: changing any field changes the metric. Note the date, so old charts can be explained.

> **On the job:** Teams call this a metric definition, KPI dictionary entry, or metric contract. Mature data teams review it like code. In interviews, sketching even half of these fields out loud before you write SQL is what separates a senior answer from a junior one.

> **The main idea:** a metric is a decision plus a precise counting rule. Seventeen short fields capture that rule; each one is a place where two reasonable analysts would otherwise disagree.

*Read more:* [dbt: metrics overview](https://docs.getdbt.com/docs/build/metrics-overview), [dbt: semantic models](https://docs.getdbt.com/docs/build/semantic-models), [Power BI: semantic models](https://learn.microsoft.com/en-us/power-bi/connect-data/service-datasets-understand).

---

<a id="slide-6"></a>
## 6. A routine for vague requests: ask before you count

*Part A · “How big is Leafy Plus now?” (added)*

Stakeholders ask in business words; the metric needs counting rules. The fastest way to close the gap is a short, repeatable routine. You don’t interrogate the person; you **propose a default and show the alternatives with numbers**, so they can choose in one reply.

1. **Restate the decision** (why do you need it?): “Is this for the board deck, a pricing decision, or capacity planning?” The decision picks the definition.
2. **Name the unit** (count what?): Members, trials, revenue? People or accounts? One row per what?
3. **Pin the population and exclusions** (who counts?): Staff comps? Trials? Paused accounts? Test accounts?
4. **Pin time** (when, which clock?): “Now” = as of when? Month start, month end, average over the month? Which time zone?
5. **Show 2–3 readings with numbers** (propose, don’t ask): Run the plausible definitions and put the numbers side by side.
6. **Write the spec and confirm** (one message): Paste the card, get a “yes”, then build and test.

#### Same ask, five readings

```sql
WITH params AS (SELECT DATE '2026-03-25' AS as_of)
SELECT 1 AS reading, 'paying members today (no staff)' AS definition,
       COUNT(DISTINCT user_id)::VARCHAR AS value
FROM plus_periods, params
WHERE valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of) AND plan <> 'staff'
UNION ALL
SELECT 2, 'paying members + people in a free trial today',
       ((SELECT COUNT(DISTINCT user_id) FROM plus_periods, params
        WHERE valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of) AND plan <> 'staff')
     + (SELECT COUNT(*) FROM plus_trials, params WHERE trial_start <= as_of AND trial_end > as_of)
       )::VARCHAR
UNION ALL
SELECT 3, 'members incl. free staff accounts',
       COUNT(DISTINCT user_id)::VARCHAR
FROM plus_periods, params
WHERE valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of)
UNION ALL
SELECT 4, 'monthly recurring revenue today, USD',
       printf('$%.2f', SUM(mrr))
FROM plus_periods, params
WHERE valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of)
UNION ALL
SELECT 5, 'paying members on 1 March (month start)',
       COUNT(DISTINCT user_id)::VARCHAR
FROM plus_periods
WHERE valid_from <= DATE '2026-03-01' AND (valid_to IS NULL OR valid_to > DATE '2026-03-01') AND plan <> 'staff'
ORDER BY reading;
```

Result (5 rows):

| reading | definition | value |
|---|---|---|
| 1 | paying members today (no staff) | 157 |
| 2 | paying members + people in a free trial today | 204 |
| 3 | members incl. free staff accounts | 163 |
| 4 | monthly recurring revenue today, USD | $1547.00 |
| 5 | paying members on 1 March (month start) | 122 |

Five honest answers. Leafy Plus launched in October 2025 and is growing fast, so the *date* matters as much as the unit (readings 1 and 5). A board deck wants paying members at a fixed date; pricing wants MRR (reading 4); support capacity wants everyone with access, including trials and staff (readings 2 and 3).

#### A reply that closes the loop

> “By ‘size’ I suggest *paying Leafy Plus members as of the end of each month, excluding free staff accounts*. Today that is reading 1. If you need revenue instead, MRR is reading 4. Trials are separate (reading 2 minus 1). OK to go with members?”

Short, numeric, and it names the exclusions. The person answers in seconds, and the spec card fills itself in.

> **On the job:** In interviews, “define a metric” and “a stakeholder asks for X” questions are graded mostly on this step. Say the clarifying questions out loud, state your assumption, and move on; don’t wait for perfect answers.

> **The main idea:** turn a vague ask into a choice between a few concrete, numbered readings. People can’t answer “what do you mean by size?”, but they can pick one of three numbers.

*Read more:* [Stripe: subscription analytics (MRR, churn)](https://docs.stripe.com/billing/subscriptions/analytics), [dbt: metrics overview](https://docs.getdbt.com/docs/build/metrics-overview).

---

<a id="slide-7"></a>
## 7. Business decision and population: who is in the denominator?

*Part A · “What share of our customers bought in February?”*

The **business decision** is the action the metric informs. Write it first, because it chooses everything else. The **population** is the set of units eligible to be counted: the denominator. Change the population and the same numerator gives a different rate.

```sql
WITH customers AS (
    SELECT user_id, local_ts(signup_at_utc) AS signup_local
    FROM users WHERE NOT is_internal AND NOT is_test
), feb_buyers AS (            -- completed an order in February, Chicago time
    SELECT DISTINCT user_id FROM orders
    WHERE status = 'completed'
      AND local_ts(placed_at_utc) >= '2026-02-01' AND local_ts(placed_at_utc) < '2026-03-01'
), feb_visitors AS (          -- signed-in activity in February
    SELECT DISTINCT user_id FROM events
    WHERE user_id IS NOT NULL
      AND local_ts(event_at_utc) >= '2026-02-01' AND local_ts(event_at_utc) < '2026-03-01'
), populations AS (
    SELECT 1 AS k, 'accounts that existed on 1 February' AS population, user_id
    FROM customers WHERE signup_local < '2026-02-01'
    UNION ALL
    SELECT 2, 'accounts that visited in February', user_id
    FROM customers WHERE user_id IN (SELECT user_id FROM feb_visitors)
    UNION ALL
    SELECT 3, 'accounts created in February', user_id
    FROM customers WHERE signup_local >= '2026-02-01' AND signup_local < '2026-03-01'
)
SELECT k, population,
       COUNT(*)                                                        AS denominator,
       COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM feb_buyers)) AS numerator,
       ROUND(numerator / denominator, 3)                               AS buyer_rate
FROM populations
GROUP BY k, population
ORDER BY k;
```

Result (3 rows):

| k | population | denominator | numerator | buyer_rate |
|---|---|---|---|---|
| 1 | accounts that existed on 1 February | 957 | 398 | 0.416 |
| 2 | accounts that visited in February | 1099 | 567 | 0.516 |
| 3 | accounts created in February | 334 | 169 | 0.506 |

#### Three decisions, three populations

| Decision | Population that fits |
|---|---|
| Plan a win-back email to lapsed customers | Accounts that existed on 1 Feb (reading 1): includes people who never came back. |
| Judge the shopping experience | Accounts that visited (reading 2): only people who had a chance to buy. |
| Judge sign-up quality from a February campaign | Accounts created in February (reading 3), ideally with a fixed time to buy (Business models and metrics deck: “Product: retention cohorts and maturity”). |

#### What to notice

- The numerator (February buyers) is filtered by the population too: a rate is “buyers *within* this population”.
- Staff and QA accounts are removed in every reading: that is an **exclusion** (lesson 12), applied before the population is chosen.
- DuckDB lets the `buyer_rate` expression reuse the aliases `numerator` and `denominator` from the same `SELECT`. Most engines don’t; repeat the expressions there.

> **On the job:** “Rate of what, out of whom?” is the single most useful review question for any percentage on a dashboard. A **vanity metric** is one that looks good but drives no decision (total sign-ups ever, for example). Asking for the decision first filters those out.

> **The main idea:** the population is the denominator. Choose it from the decision, write it down, and apply the same population to the numerator.

*Read more:* [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro).

---

<a id="slide-8"></a>
## 8. Grain and distinct keys: conversion of what?

*Part A · event grain, entity grain, and the key that de-duplicates*

**Grain** (from the dimensional-modelling deck) is what one row represents. A metric has two grains: the **unit** it counts and the **output row** (per day, per platform…). Raw data usually sits at **event grain** (one row per thing that happened); most business questions are about an **entity** (a session, a user, an order). The **distinct key** is the column whose distinct values define the unit: `session_id`, `user_id`, `order_id`.

#### “Conversion rate”, week of 9 March, four grains

```sql
WITH e AS (
    SELECT * FROM events
    WHERE local_ts(event_at_utc) >= '2026-03-09' AND local_ts(event_at_utc) < '2026-03-16'
), s AS (                                    -- one row per session
    SELECT session_id, MAX(user_id) AS user_id,
           BOOL_OR(event_name = 'purchase') AS purchased
    FROM e GROUP BY session_id
)
SELECT 1 AS k, 'event' AS grain, 'purchase events / session_start events' AS rule,
       (SELECT COUNT(*) FILTER (WHERE event_name = 'purchase') FROM e)      AS numerator,
       (SELECT COUNT(*) FILTER (WHERE event_name = 'session_start') FROM e) AS denominator
UNION ALL
SELECT 2, 'session', 'sessions with a purchase / sessions',
       COUNT(*) FILTER (WHERE purchased), COUNT(*) FROM s
UNION ALL
SELECT 3, 'user', 'users who purchased / signed-in users with a session',
       COUNT(DISTINCT user_id) FILTER (WHERE purchased), COUNT(DISTINCT user_id) FROM s
UNION ALL
SELECT 4, 'order', 'completed orders / sessions',
       (SELECT COUNT(*) FROM orders WHERE status = 'completed'
          AND local_ts(placed_at_utc) >= '2026-03-09' AND local_ts(placed_at_utc) < '2026-03-16'),
       COUNT(*) FROM s
ORDER BY k;
```

Result (4 rows):

| k | grain | rule | numerator | denominator |
|---|---|---|---|---|
| 1 | event | purchase events / session_start events | 307 | 2166 |
| 2 | session | sessions with a purchase / sessions | 300 | 2120 |
| 3 | user | users who purchased / signed-in users with a session | 248 | 742 |
| 4 | order | completed orders / sessions | 290 | 2120 |

Same week, four rates from about 14 % to 33 %. **Event** grain counts duplicate deliveries on both sides. **User** grain is far higher: a person with five visits and one purchase counts as converted once, and anonymous visitors are not in the denominator at all. **Order** grain switches source: the order service has no duplicates and drops cancelled orders, so it is lower.

#### Who disappears at user grain?

```sql
SELECT COUNT(*)                                   AS sessions,
       COUNT(*) FILTER (WHERE user_id IS NULL)    AS anonymous_sessions,
       COUNT(user_id)                             AS sessions_with_user,
       COUNT(DISTINCT user_id)                    AS distinct_users
FROM (SELECT session_id, MAX(user_id) AS user_id FROM events
      WHERE local_ts(event_at_utc) >= '2026-03-09' AND local_ts(event_at_utc) < '2026-03-16'
      GROUP BY session_id);
```

Result (1 row):

| sessions | anonymous_sessions | sessions_with_user | distinct_users |
|---|---|---|---|
| 2120 | 629 | 1491 | 742 |

Anonymous visitors have no `user_id`. `COUNT(DISTINCT user_id)` silently skips NULLs, so a user-grain rate covers signed-in people only. That belongs in the spec’s population field, not in a footnote nobody reads.

#### Choosing the grain

- **Session** grain: “is the shopping flow working?” (product, UX, release checks).
- **User** grain: “do people eventually buy?” (marketing, lifecycle). Needs a window per user (Business models and metrics deck: “Product: funnel definitions”).
- **Order** or **event** grain: volumes and capacity, not conversion.

#### Coming from C#

Think of `COUNT(DISTINCT key)` as `.Select(x => x.Key).Distinct().Count()`, which also drops nulls only if you filter them. SQL drops NULL keys automatically, so the population shrinks without warning.

> **On the job:** When two dashboards disagree on “conversion”, compare grains first. In practice the product team’s number is session grain from events and marketing’s is user grain from the CRM, and both are right for their decision.

> **The main idea:** name the counted unit and its distinct key in the spec. Event-grain counts measure volume; entity-grain counts measure people or visits, and NULL keys silently leave the population.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/).

---

<a id="slide-9"></a>
## 9. Numerator and denominator: build both from the same rows

*Part A · the numerator must be a subset of the denominator*

The **numerator** is what you count on top; the **denominator** is what you divide by. For a rate (a share between 0 and 1) the numerator must be a *subset* of the denominator: same population, same window, same distinct key. The safest way to guarantee that is to build one table at the unit’s grain with a flag per outcome, then count with `FILTER` (introduced in the SQL correctness deck).

#### ✗ Believable, but wrong

```sql
SELECT ROUND(COUNT(*) FILTER (WHERE event_name = 'purchase')
             / COUNT(DISTINCT session_id), 4) AS conversion
FROM events
WHERE local_ts(event_at_utc) >= '2026-03-09'
  AND local_ts(event_at_utc) <  '2026-03-16';
```

Result (1 row):

| conversion |
|---|
| 0.1448 |

Counts purchase *events* over distinct *sessions*: two different units. A duplicated purchase delivery adds 1 to the top but nothing to the bottom.

#### ✓ Fixed

```sql
WITH sessions AS (                 -- one row per session
    SELECT session_id,
           BOOL_OR(event_name = 'purchase') AS purchased
    FROM events
    WHERE local_ts(event_at_utc) >= '2026-03-09'
      AND local_ts(event_at_utc) <  '2026-03-16'
    GROUP BY session_id
)
SELECT COUNT(*) FILTER (WHERE purchased) AS numerator,
       COUNT(*)                          AS denominator,
       ROUND(numerator / denominator, 4) AS conversion
FROM sessions;
```

Result (1 row):

| numerator | denominator | conversion |
|---|---|---|
| 300 | 2120 | 0.1415 |

Both counts come from the same session rows. The numerator is a filter of the denominator, so it can never exceed it.

#### Test the invariants

```sql
WITH s AS (
    SELECT session_id,
           MIN(local_ts(event_at_utc))::DATE AS day,
           COUNT(*) FILTER (WHERE event_name = 'purchase') AS purchase_events,
           BOOL_OR(event_name = 'purchase')                AS purchased
    FROM events GROUP BY session_id
)
SELECT COUNT(*) FILTER (WHERE purchase_events > 1)                        AS sessions_with_2plus_purchase_events,
       COUNT(*) FILTER (WHERE purchased) <= COUNT(*)                       AS subset_test_passes,
       COUNT(*) = COUNT(DISTINCT session_id)                               AS one_row_per_session
FROM s;
```

Result (1 row):

| sessions_with_2plus_purchase_events | subset_test_passes | one_row_per_session |
|---|---|---|
| 41 | true | true |

Duplicates exist (sessions with two purchase events), yet the session-grain rate is safe from them. Two checks belong in every rate pipeline: the unit table is unique on its key, and numerator ≤ denominator.

#### Other ways numerator and denominator drift apart

- Numerator from the order service, denominator from web analytics: different exclusions, clocks, and outages.
- Numerator attributed to the purchase day, denominator to the visit day (a session crossing midnight).
- A filter added to the numerator CTE but not to the denominator CTE during a later change.

> **On the job:** A rate above 100 % on a dashboard, or one that jumps when a source is late, is almost always this bug. dbt users add an expression test such as `numerator <= denominator` on the metric model so it fails in CI, not in a meeting.

> **The main idea:** compute numerator and denominator from one table at the unit’s grain, and count the numerator as a filter of the denominator’s rows. Then test numerator ≤ denominator.

*Read more:* [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-10"></a>
## 10. Time window and time zone: whose midnight?

*Part A · calendar periods, half-open intervals, and daylight saving*

A **time window** is the period a metric covers: a calendar day, week, or month, or a rolling window such as the last 7 days. Calendar periods start at *local* midnight in the business’s **time zone**. Use **half-open intervals**, `ts >= start AND ts < end`, so every instant belongs to exactly one period (`BETWEEN` includes both ends and double-counts midnight).

#### How the conversion works

Columns are plain `TIMESTAMP` values that *mean* UTC. `ts AT TIME ZONE 'UTC'` turns one into a `TIMESTAMPTZ` (an absolute instant). `… AT TIME ZONE 'America/Chicago'` turns that instant into Chicago wall-clock time. The IANA zone name knows every daylight-saving rule; a fixed offset such as −6 hours does not.

```sql
SELECT d::DATE AS chicago_day,
       (epoch(LEAD(d) OVER (ORDER BY d) AT TIME ZONE 'America/Chicago')
        - epoch(d AT TIME ZONE 'America/Chicago')) / 3600 AS hours_in_day
FROM (SELECT UNNEST(generate_series(TIMESTAMP '2026-03-07', TIMESTAMP '2026-03-10', INTERVAL 1 DAY)) AS d)
QUALIFY hours_in_day IS NOT NULL
ORDER BY chicago_day;
```

Result (3 rows):

| chicago_day | hours_in_day |
|---|---|
| 2026-03-07 | 24 |
| 2026-03-08 | 23 |
| 2026-03-09 | 24 |

Sunday 8 March 2026 had 23 hours in Chicago (clocks jumped from 02:00 to 03:00). Hourly averages and “per day” denominators must use real day lengths.

#### The fixed-offset bug

```sql
SELECT COUNT(*) FILTER (WHERE placed_at_utc::DATE <> local_ts(placed_at_utc)::DATE)
                                   AS wrong_day_if_utc_date,
       COUNT(*) FILTER (WHERE (placed_at_utc - INTERVAL 6 HOUR)::DATE <> local_ts(placed_at_utc)::DATE)
                                   AS wrong_day_if_fixed_minus_6h,
       MIN(local_ts(placed_at_utc)) FILTER (WHERE (placed_at_utc - INTERVAL 6 HOUR)::DATE
                                                  <> local_ts(placed_at_utc)::DATE) AS first_wrong_order_local
FROM orders;
```

Result (1 row):

| wrong_day_if_utc_date | wrong_day_if_fixed_minus_6h | first_wrong_order_local |
|---|---|---|
| 521 | 25 | 2026-03-09T00:22:55 |

Before 8 March, Chicago is UTC−6 and the shortcut works. After it, Chicago is UTC−5, and every order between 00:00 and 01:00 local lands on the previous day. Plain UTC dates are wrong for hundreds of orders.

```sql
SELECT 'UTC month' AS calendar,
       SUM(items_amount - discount_amount) AS feb_net_items
FROM orders
WHERE status = 'completed' AND placed_at_utc >= '2026-02-01' AND placed_at_utc < '2026-03-01'
UNION ALL
SELECT 'Chicago month',
       SUM(items_amount - discount_amount)
FROM orders
WHERE status = 'completed'
  AND local_ts(placed_at_utc) >= '2026-02-01' AND local_ts(placed_at_utc) < '2026-03-01'
ORDER BY calendar;
```

Result (2 rows):

| calendar | feb_net_items |
|---|---|
| Chicago month | 65630.64 |
| UTC month | 65477.26 |

The same February, two calendars: orders on the evening of 28 February in Chicago are 1 March in UTC.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB, PostgreSQL | `(ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'` on a UTC `TIMESTAMP`. In DuckDB time-zone support comes from the ICU extension, bundled with the Python package. |
| SQL Server, Azure SQL | `ts AT TIME ZONE 'UTC' AT TIME ZONE 'Central Standard Time'`. Uses *Windows* zone names (see `sys.time_zone_info`); the name covers both CST and CDT. Returns `datetimeoffset`. |
| Fabric Warehouse | Same T-SQL syntax, but `datetimeoffset` can’t be stored in a table: store UTC in `datetime2` and convert at query time, casting the result back to `datetime2`. |
| Spark SQL | `from_utc_timestamp(ts, 'America/Chicago')`; also set `spark.sql.session.timeZone` deliberately, because it changes how timestamps print and parse. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### Rules for the spec

- Store and join in UTC; convert once, in one shared function or column (`local_ts` here).
- Name the zone with an IANA name, never “CST” or −6.
- State the week start (Monday here; `date_trunc('week', …)` in DuckDB is ISO, Monday).
- Say whether “last 7 days” means 7 calendar days or 168 hours, and whether today is included.

> **On the job:** Time-zone bugs surface twice a year (daylight saving) and at every month end. Finance closes the books on local calendar months; product analytics tools often default to UTC or the browser’s zone. Agreeing one business time zone, and testing a DST day, prevents a monthly reconciliation fight.

> **The main idea:** periods are local, storage is UTC. Convert with an IANA zone name, use half-open intervals, and test a daylight-saving day and a month-end boundary.

*Read more:* [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [DuckDB: TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz), [T-SQL: AT TIME ZONE](https://learn.microsoft.com/en-us/sql/t-sql/queries/at-time-zone-transact-sql), [IANA time zone database](https://www.iana.org/time-zones).

---

<a id="slide-11"></a>
## 11. Attribution date: which timestamp puts a number in a period?

*Part A · refunds that land in a later month (added)*

Most metrics combine facts that happen at different times. A refund belongs to an order placed weeks earlier. The **attribution date** is the timestamp that decides which period a fact counts in. Pick it deliberately; it decides whether past numbers **restate** (change after they were first reported).

#### February net sales, three attributions

```sql
WITH customer_orders AS (
    SELECT o.*, local_ts(o.placed_at_utc) AS placed_at_local
    FROM orders o JOIN users u USING (user_id)
    WHERE o.status = 'completed' AND NOT u.is_internal AND NOT u.is_test
), feb_orders AS (
    SELECT order_id, items_amount - discount_amount AS net_items
    FROM customer_orders
    WHERE placed_at_local >= '2026-02-01' AND placed_at_local < '2026-03-01'
), customer_refunds AS (
    SELECT r.*, local_ts(r.refunded_at_utc) AS refunded_at_local
    FROM refunds r JOIN customer_orders USING (order_id)
)
SELECT 1 AS reading, 'by order date, as reported on Sun 1 Mar 08:00' AS attribution,
       (SELECT SUM(net_items) FROM feb_orders)
     - (SELECT SUM(amount) FROM customer_refunds JOIN feb_orders USING (order_id)
        WHERE refunded_at_utc <= TIMESTAMP '2026-03-01 14:00')        AS feb_net_sales
UNION ALL
SELECT 2, 'by order date, restated on Wed 25 Mar',
       (SELECT SUM(net_items) FROM feb_orders)
     - (SELECT SUM(amount) FROM customer_refunds JOIN feb_orders USING (order_id))
UNION ALL
SELECT 3, 'refunds booked in the month they were paid',
       (SELECT SUM(net_items) FROM feb_orders)
     - (SELECT SUM(amount) FROM customer_refunds
        WHERE refunded_at_local >= '2026-02-01' AND refunded_at_local < '2026-03-01')
ORDER BY reading;
```

Result (3 rows):

| reading | attribution | feb_net_sales |
|---|---|---|
| 1 | by order date, as reported on Sun 1 Mar 08:00 | 62170.81 |
| 2 | by order date, restated on Wed 25 Mar | 60457.66 |
| 3 | refunds booked in the month they were paid | 61429.62 |

Readings 1 and 2 answer “how much did February’s *orders* end up being worth?”. The answer keeps changing for about a month as refunds arrive. Reading 3 answers “how much money moved in February?”. It is fixed once February ends, but mixes refunds of January orders with February sales.

#### Why the numbers move

```sql
SELECT COUNT(*)                                                  AS refunds_for_feb_orders,
       COUNT(*) FILTER (WHERE local_ts(r.refunded_at_utc) >= '2026-03-01') AS paid_in_march,
       ROUND(MEDIAN(date_diff('day', o.placed_at_utc, r.refunded_at_utc)), 1) AS median_days_after_order
FROM refunds r JOIN orders o USING (order_id)
WHERE local_ts(o.placed_at_utc) >= '2026-02-01' AND local_ts(o.placed_at_utc) < '2026-03-01';
```

Result (1 row):

| refunds_for_feb_orders | paid_in_march | median_days_after_order |
|---|---|---|
| 77 | 42 | 16 |

Refunds for February orders keep arriving in March. A chart by order date will show February drifting down for weeks: not a bug, but it must be expected and explained.

| Decision | Attribution date |
|---|---|
| Product or merchandising quality | Order date; restate, and show a “still maturing” marker (lesson 15) |
| Cash, accounting, the monthly close | Date the money moved (refund date); never restate |
| Marketing campaign performance | Click or session date of the campaign touch |
| Delivery performance | Promised date or delivery date, not order date (Business models and metrics deck: “Operations: on-time delivery and percentiles”) |

> **On the job:** Finance usually books a refund when it is paid, while product teams attribute it to the original order. Both are correct, and they disagree every month. Writing the attribution date and the restatement policy (“numbers for the last 30 days may change”) on the spec card ends that recurring argument (lesson 24 reconciles the two).

> **The main idea:** every fact has several timestamps. The spec names the one that places it in a period, and says whether published history may restate.

*Read more:* [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [Stripe: subscription analytics (MRR, churn)](https://docs.stripe.com/billing/subscriptions/analytics).

---

<a id="slide-12"></a>
## 12. Exclusions, bot policy, and duplicates

*Part A · which rows never count, and how you decide*

**Exclusions** are rows removed from every metric for a stated reason: staff and QA accounts, cancelled orders, test stores. A **bot policy** is the rule that separates non-human traffic. Two layers are standard: a **user-agent** list (the browser identification string; industry lists such as the IAB/ABC spiders and bots list exist), plus a **behaviour rule** for bots that pretend to be browsers. **Duplicates** come from at-least-once delivery: the same event sent twice with the same `event_id`.

```sql
WITH s AS (                             -- one row per session, complete weeks only
    SELECT session_id, ANY_VALUE(user_agent) AS user_agent, MAX(user_id) AS user_id,
           COUNT(*) FILTER (WHERE event_name = 'view_product') AS product_views,
           BOOL_OR(event_name = 'purchase')                   AS purchased
    FROM events
    WHERE local_ts(event_at_utc) >= '2026-01-26' AND local_ts(event_at_utc) < '2026-03-23'
    GROUP BY session_id
), classified AS (
    SELECT s.*,
           CASE WHEN regexp_matches(user_agent, '(?i)bot|crawler|spider|headless|python-requests')
                     THEN '1 crawler user agent'
                WHEN product_views >= 30 THEN '2 bot behaviour: 30+ product views'
                WHEN u.is_internal OR u.is_test THEN '3 staff or QA account'
                ELSE '4 customer' END AS session_class
    FROM s LEFT JOIN users u USING (user_id)
)
SELECT COALESCE(session_class, 'all sessions, no policy') AS session_class,
       COUNT(*)                          AS sessions,
       COUNT(*) FILTER (WHERE purchased) AS with_purchase,
       ROUND(with_purchase / sessions, 4) AS conversion
FROM classified
GROUP BY ROLLUP (classified.session_class)
ORDER BY GROUPING(classified.session_class), session_class;
```

Result (5 rows):

| session_class | sessions | with_purchase | conversion |
|---|---|---|---|
| 1 crawler user agent | 2380 | 0 | 0 |
| 2 bot behaviour: 30+ product views | 120 | 0 | 0 |
| 3 staff or QA account | 360 | 73 | 0.2028 |
| 4 customer | 14851 | 2166 | 0.1458 |
| all sessions, no policy | 17711 | 2239 | 0.1264 |

Bots are about one session in seven and never buy, so they drag conversion down; staff sessions do the opposite. The last row is what you get with no policy at all. Rules are applied in order, so each session gets exactly one class.

#### What the web user agents look like

```sql
SELECT user_agent,
       COUNT(DISTINCT session_id)                                  AS sessions,
       MAX(n_views)                                                AS max_views_in_a_session
FROM (SELECT session_id, ANY_VALUE(user_agent) AS user_agent,
             COUNT(*) FILTER (WHERE event_name = 'view_product') AS n_views
      FROM events WHERE platform = 'web' GROUP BY session_id)
GROUP BY user_agent
ORDER BY sessions DESC;
```

Result (4 rows):

| user_agent | sessions | max_views_in_a_session |
|---|---|---|
| Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0 | 7753 | 83 |
| python-requests/2.32.3 | 839 | 27 |
| Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) | 817 | 28 |
| Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/138.0 | 784 | 28 |

Three crawler strings are easy. The fourth class is not: a scraper with a normal Chrome user agent, found only because it viewed 40–80 products in one visit. Humans here never exceed 4.

#### Duplicates: keep the first delivery

```sql
SELECT COUNT(*)                                   AS event_rows,
       COUNT(DISTINCT event_id)                   AS distinct_events,
       event_rows - distinct_events               AS duplicate_rows
FROM events;
```

Result (1 row):

| event_rows | distinct_events | duplicate_rows |
|---|---|---|
| 110096 | 107987 | 2109 |

```sql
SELECT COUNT(*) AS rows_after_dedup
FROM (SELECT * FROM events
      QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at_utc) = 1);
```

Result (1 row):

| rows_after_dedup |
|---|
| 107987 |

`QUALIFY` filters on a window function (SQL windows deck). Partition by the event’s own key, order by arrival, keep row 1.

> **On the job:** Bot rules drift: new crawlers appear, and scrapers adapt. Keep the rule in one shared model, log how many sessions each rule removed per day, and alert on spikes. A sudden jump in “sessions” with flat orders is usually a bot, not a marketing win.

> **The main idea:** write exclusions and the bot policy as explicit, ordered rules in one place; report how many rows each rule removes, and de-duplicate on the event’s own key before counting anything.

*Read more:* [IAB/ABC spiders and bots list](https://www.iab.com/guidelines/iab-abc-international-spiders-bots-list/), [DuckDB: regular expressions](https://duckdb.org/docs/stable/sql/functions/regular_expressions), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify).

---

<a id="slide-13"></a>
## 13. Missing data and late-arriving events

*Part A · NULL keys, unknown buckets, and “as known at” (added)*

A **missing-data policy** says what happens to rows with NULL keys and to data that has not arrived yet. Two rules cover most cases: keep rows with unknown attributes in an explicit **Unknown** bucket so totals still reconcile, and decide whether numbers are **as known at** a fixed time or **restated** as late rows arrive.

#### NULL attributes: an Unknown bucket keeps totals honest

```sql
SELECT CASE WHEN GROUPING(country) = 1 THEN 'All countries' ELSE country END AS country,
       COUNT(*)                            AS orders,
       SUM(net_items)                      AS net_items
FROM (SELECT COALESCE(u.country, 'Unknown') AS country,
             o.items_amount - o.discount_amount AS net_items
      FROM orders o JOIN users u USING (user_id)
      WHERE o.status = 'completed' AND NOT u.is_internal AND NOT u.is_test)
GROUP BY ROLLUP (country)
ORDER BY GROUPING(country), country;
```

Result (4 rows):

| country | orders | net_items |
|---|---|---|
| CA | 414 | 24901.37 |
| US | 1634 | 97395.19 |
| Unknown | 120 | 7318.66 |
| All countries | 2168 | 129615.22 |

With an inner join to a country table, or a `WHERE country IS NOT NULL`, the Unknown orders would vanish and countries would no longer add up to the total. NULL foreign keys behave the same way:

```sql
SELECT COUNT(*) AS tickets, COUNT(order_id) AS with_order, COUNT(*) - COUNT(order_id) AS without_order
FROM tickets;
```

Result (1 row):

| tickets | with_order | without_order |
|---|---|---|
| 316 | 38 | 278 |

A ticket with no order is a general question, not an error. An inner join from tickets to orders drops it; a left join keeps it.

#### Late events: what the dashboard knew, and when

```sql
SELECT platform,
       ROUND(100 * AVG((received_at_utc - event_at_utc > INTERVAL 1 HOUR)::INT), 1) AS pct_over_1h_late,
       ROUND(quantile_cont(epoch(received_at_utc - event_at_utc) / 3600, 0.99), 1) AS p99_delay_hours,
       ROUND(MAX(epoch(received_at_utc - event_at_utc)) / 3600, 1)               AS max_delay_hours
FROM events
GROUP BY platform
ORDER BY platform;
```

Result (3 rows):

| platform | pct_over_1h_late | p99_delay_hours | max_delay_hours |
|---|---|---|---|
| android | 6.7 | 52 | 60 |
| ios | 7 | 52.3 | 60 |
| web | 0 | 0.1 | 0.2 |

```sql
WITH sunday AS (                 -- events that happened on Sunday 22 March, Chicago time
    SELECT * FROM events
    WHERE local_ts(event_at_utc)::DATE = DATE '2026-03-22'
      AND user_id IS NOT NULL                                  -- signed-in visits only
), snapshots AS (
    SELECT 'Mon 23 Mar 08:00' AS as_known_at, * FROM sunday
    WHERE received_at_utc <= TIMESTAMP '2026-03-23 13:00'     -- 08:00 CDT
    UNION ALL
    SELECT 'Wed 25 Mar 10:00', * FROM sunday
)
SELECT platform, as_known_at,
       COUNT(DISTINCT session_id)                                     AS sessions,
       COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'purchase') AS purchasing_sessions,
       ROUND(purchasing_sessions / sessions, 4)                       AS conversion
FROM snapshots
GROUP BY platform, as_known_at
ORDER BY platform, as_known_at;
```

Result (6 rows):

| platform | as_known_at | sessions | purchasing_sessions | conversion |
|---|---|---|---|---|
| android | Mon 23 Mar 08:00 | 77 | 3 | 0.039 |
| android | Wed 25 Mar 10:00 | 77 | 4 | 0.0519 |
| ios | Mon 23 Mar 08:00 | 59 | 16 | 0.2712 |
| ios | Wed 25 Mar 10:00 | 59 | 18 | 0.3051 |
| web | Mon 23 Mar 08:00 | 111 | 19 | 0.1712 |
| web | Wed 25 Mar 10:00 | 111 | 19 | 0.1712 |

A **late-arriving event** reaches the warehouse long after it happened (phones queue events while offline). The web is instant; apps send about 1 in 15 events more than an hour late. Monday’s report for Sunday was missing app activity, so app numbers for Sunday changed by Wednesday, while web did not.

#### Policy options

| Option | Use when |
|---|---|
| **Restate**: always recompute with all data received | Analysis, trend charts. Say “last 3 days may change”. |
| **As known at**: filter `received_at <= cutoff` | Reproducing a report exactly; audits; comparing what you knew then. |
| **Wait for maturity**: hide days younger than the p99 delay | Alerting and weekly reviews (lesson 15). |

#### In the spec

- Name the arrival timestamp (`received_at_utc`) next to the event timestamp.
- Measure lateness per source (the table above) and choose the maturity delay from it.
- Never silently drop NULL keys; give them a bucket and a count.

> **On the job:** “Yesterday’s numbers changed” is a weekly support question for every data team with mobile or IoT sources. Storing both timestamps lets you answer it with a query instead of an apology, and lets you reproduce last Monday’s report byte for byte.

> **The main idea:** keep unknowns in a visible bucket, store both event time and arrival time, and choose explicitly between restating numbers and reporting them as known at a cutoff.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones).

---

<a id="slide-14"></a>
## 14. Zero denominators and integer division

*Part A · the day Android had no sessions*

A **zero denominator** happens whenever a segment had no eligible units: a platform outage, a new country, a seller with no orders this week. The spec must say what to show: usually **NULL** (“no data”, displayed as “–”), never 0 % (which claims everyone failed). On Tuesday 3 March the Android app was down all day.

#### Without a date spine, the day disappears

```sql
SELECT day, COUNT(*) AS sessions
FROM (SELECT session_id, MIN(local_ts(event_at_utc))::DATE AS day
      FROM events WHERE platform = 'android' GROUP BY session_id)
WHERE day BETWEEN DATE '2026-03-01' AND DATE '2026-03-05'
GROUP BY day
ORDER BY day;
```

Result (4 rows):

| day | sessions |
|---|---|
| 2026-03-01 | 86 |
| 2026-03-02 | 68 |
| 2026-03-04 | 78 |
| 2026-03-05 | 83 |

No sessions means no rows, so 3 March is missing, and a line chart quietly draws straight from 2 to 4 March. A **date spine** (a table with one row per calendar day) makes the gap visible.

#### With a spine: choose NULL, explicitly

```sql
WITH android_sessions AS (
    SELECT session_id,
           MIN(local_ts(event_at_utc))::DATE AS day,
           BOOL_OR(event_name = 'purchase')   AS purchased
    FROM events
    WHERE platform = 'android'
    GROUP BY session_id
), daily AS (
    SELECT day, COUNT(*) AS sessions, COUNT(*) FILTER (WHERE purchased) AS purchases
    FROM android_sessions GROUP BY day
), days AS (                                   -- a date spine: one row per calendar day
    SELECT UNNEST(generate_series(DATE '2026-03-01', DATE '2026-03-05', INTERVAL 1 DAY))::DATE AS day
)
SELECT day,
       COALESCE(sessions, 0)                                        AS sessions,
       COALESCE(purchases, 0)                                       AS purchases,
       COALESCE(purchases, 0) / COALESCE(sessions, 0)               AS plain_division,
       ROUND(COALESCE(purchases, 0) / NULLIF(COALESCE(sessions, 0), 0), 4) AS with_nullif
FROM days LEFT JOIN daily USING (day)
ORDER BY day;
```

Result (5 rows):

| day | sessions | purchases | plain_division | with_nullif |
|---|---|---|---|---|
| 2026-03-01 | 86 | 11 | 0.1279069767 | 0.1279 |
| 2026-03-02 | 68 | 17 | 0.25 | 0.25 |
| 2026-03-03 | 0 | 0 | nan | NULL |
| 2026-03-04 | 78 | 9 | 0.1153846154 | 0.1154 |
| 2026-03-05 | 83 | 15 | 0.1807228916 | 0.1807 |

`0 / 0` in DuckDB returns NaN (not a number) and `5 / 0` returns infinity: no error, just a value that poisons averages and sums. `NULLIF(sessions, 0)` turns a zero denominator into NULL, and any division by NULL is NULL.

#### Integer division

```sql
SELECT 1 / 2                 AS duckdb_slash,
       1 // 2                AS integer_division,
       1 * 1.0 / 2           AS portable_decimal,
       5 // 0                AS int_div_by_zero,
       5 / 0                 AS slash_by_zero;
```

Result (1 row):

| duckdb_slash | integer_division | portable_decimal | int_div_by_zero | slash_by_zero |
|---|---|---|---|---|
| 0.5 | 0 | 0.5 | NULL | inf |

DuckDB’s `/` always returns a decimal result. In **SQL Server, Fabric Warehouse, and PostgreSQL**, `1 / 2` on integers is **0**, so `COUNT(…) / COUNT(*)` is 0 for every rate below 100 %. Multiply by `1.0` or `CAST` one side to a decimal.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB | `/` decimal; `x / 0` gives ±inf or NaN; `//` integer division, NULL on zero. |
| SQL Server, Fabric Warehouse | Integer `/` truncates; division by zero is error 8134. Use `x * 1.0 / NULLIF(y, 0)`. |
| Spark SQL | `/` returns double or decimal. With ANSI mode on (default from Spark 4.0) division by zero raises `DIVIDE_BY_ZERO`; with it off (Spark 3.5, e.g. Fabric Runtime 1.3) it returns NULL. `try_divide(x, y)` returns NULL either way. |
| Power BI (DAX) | `DIVIDE(n, d)` returns BLANK on zero; the `/` operator returns infinity or an error. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Zero denominators show up in every per-segment table: conversion by country on launch day, refund rate per seller with no sales, on-time rate on a holiday. Writing the rule in the spec (“NULL, shown as –, excluded from averages”) prevents both crashes in strict engines and fake 0 % or NaN values in lenient ones.

> **The main idea:** guard every division with NULLIF, make one side a decimal, and use a date spine so empty periods become visible NULLs instead of missing rows.

*Read more:* [DuckDB: numeric operators (/ and //)](https://duckdb.org/docs/stable/sql/functions/numeric), [T-SQL: NULLIF](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/nullif-transact-sql), [T-SQL: / (divide)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/divide-transact-sql), [Spark SQL: ANSI compliance](https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html), [DAX: DIVIDE](https://learn.microsoft.com/en-us/dax/divide-function-dax).

---

<a id="slide-15"></a>
## 15. Observation limits and maturity

*Part A · incomplete periods and outcomes that haven’t happened yet*

An **observation limit** is the edge of what the data can show: the data ends now, so the current period is incomplete, and recent units have not had time to reach their outcome. Statisticians call the second case **right-censoring**: the outcome may still happen after the data ends. A period or cohort is **mature** when every unit in it has had the full outcome window.

#### Trap 1: comparing an incomplete month

```sql
WITH o AS (
    SELECT local_ts(placed_at_utc) AS t, items_amount - discount_amount AS net
    FROM orders JOIN users USING (user_id)
    WHERE status = 'completed' AND NOT is_internal AND NOT is_test
)
SELECT 1 AS k, 'February, whole month'              AS period,
       SUM(net) FILTER (WHERE t >= '2026-02-01' AND t < '2026-03-01') AS net_sales FROM o
UNION ALL
SELECT 2, 'March so far (load: Wed 25, 10:00)',
       SUM(net) FILTER (WHERE t >= '2026-03-01') FROM o
UNION ALL
SELECT 3, 'February 1–24 (like-for-like days)',
       SUM(net) FILTER (WHERE t >= '2026-02-01' AND t < '2026-02-25') FROM o
UNION ALL
SELECT 4, 'March 1–24 (complete days only)',
       SUM(net) FILTER (WHERE t >= '2026-03-01' AND t < '2026-03-25') FROM o
ORDER BY k;
```

Result (4 rows):

| k | period | net_sales |
|---|---|---|
| 1 | February, whole month | 64294.38 |
| 2 | March so far (load: Wed 25, 10:00) | 54159.91 |
| 3 | February 1–24 (like-for-like days) | 54737.93 |
| 4 | March 1–24 (complete days only) | 53109.53 |

“March is down sharply on February!” compares 24 days and 10 hours with 28 days. Compare like-for-like days (readings 3 and 4), or a daily run-rate over complete days only. The same trap hits “this week so far” on a Wednesday.

#### Trap 2: outcomes still in progress

```sql
SELECT date_trunc('week', t.trial_start)::DATE        AS trial_week,
       COUNT(*)                                         AS trials,
       COUNT(p.user_id)                                 AS converted,
       ROUND(converted / trials, 3)                     AS naive_rate,
       MAX(t.trial_end) <= DATE '2026-03-25'            AS mature,
       CASE WHEN mature THEN naive_rate END             AS reportable_rate
FROM plus_trials t
LEFT JOIN (SELECT DISTINCT user_id FROM plus_periods WHERE plan <> 'staff') p USING (user_id)
WHERE t.trial_start >= DATE '2026-01-26'
GROUP BY trial_week
ORDER BY trial_week;
```

Result (9 rows):

| trial_week | trials | converted | naive_rate | mature | reportable_rate |
|---|---|---|---|---|---|
| 2026-01-26 | 20 | 8 | 0.4 | true | 0.4 |
| 2026-02-02 | 26 | 12 | 0.462 | true | 0.462 |
| 2026-02-09 | 23 | 12 | 0.522 | true | 0.522 |
| 2026-02-16 | 23 | 11 | 0.478 | true | 0.478 |
| 2026-02-23 | 24 | 11 | 0.458 | true | 0.458 |
| 2026-03-02 | 24 | 12 | 0.5 | true | 0.5 |
| 2026-03-09 | 28 | 7 | 0.25 | false | NULL |
| 2026-03-16 | 24 | 0 | 0 | false | NULL |
| 2026-03-23 | 11 | 0 | 0 | false | NULL |

A trial lasts 14 days. Trials that started in the last two weeks can’t have converted yet, so their naive rate falls toward 0: a fake collapse. Only mature cohorts get a reportable rate; immature ones are shown as “maturing”, not as a number.

#### Where the same limit appears

- Delivery on-time rate: parcels still in transit (Business models and metrics deck: “Operations: on-time delivery and percentiles”).
- Retention: week-4 retention for a cohort that is two weeks old (Business models and metrics deck: “Product: retention cohorts and maturity”).
- Refund rate: refunds for recent orders have not arrived yet (lesson 11).
- Marketplace liquidity: listings younger than the sell-through window (Business models and metrics deck: “Marketplace: liquidity and sell-through”).
- The start of the data, too: January 2026 starts on the 26th here, so January totals are partial (**left-censoring**).

#### In the spec

- State the outcome window (“converts within 14 days of trial start”).
- State the maturity rule (“report a cohort only when its last member’s window has closed”).
- For periods, report complete periods only, or label partial ones and compare like-for-like.

> **On the job:** Immature cohorts are the most common cause of a “sudden drop” in a conversion, retention, or SLA chart on the right-hand edge. Experienced analysts look at the last data point of every chart and ask “is that period complete, and is that cohort mature?” before reading the trend.

> **The main idea:** every metric has an outcome window. Report a period or cohort only once it is complete and mature; otherwise label it as partial and compare like-for-like.

*Read more:* [Censoring (statistics)](https://en.wikipedia.org/wiki/Censoring_%28statistics%29), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [Mixpanel: retention](https://docs.mixpanel.com/docs/reports/retention).

---

<a id="slide-16"></a>
## 16. One clean base: write each policy once

*Part A · exclusions, bots, duplicates, time zone, and maturity as shared views*

Lessons 7–15 each added a rule. Repeating them in every query guarantees drift. Put them in a thin **base layer** of views that every metric reads: one place for the time zone, the de-duplication, the bot rule, the exclusions, and the load watermark. In dbt these would be staging and intermediate models (dbt deck); here they are plain DuckDB views.

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

#### Design notes

- `sessions` keeps bots and staff, flagged. `customer_sessions` filters them. Keeping the flags lets you count what each rule removed.
- `clean_orders` carries both `items_amount` and `net_items`, so GMV and net sales come from the same rows (Business models and metrics deck: “Marketplace: GMV, net revenue, and take rate”).
- `load_info.current_day` is today in Chicago: always incomplete. Reports filter `< current_day`.
- From here on, every lesson reads these views; so do the other two decks of the series.

> **On the job:** This is the job of an analytics engineer in one slide: encode business rules once, test them, and give analysts clean, documented building blocks. When the bot rule changes, one view changes and every metric moves together, with a changelog entry.

> **The main idea:** policies belong in a shared, tested base layer, not in each metric query. Metrics then differ only in what they count, never in how they clean.

*Read more:* [DuckDB: CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro).

---

<a id="slide-17"></a>
## 17. Average of ratios vs ratio of sums

*Part B · “What was February’s conversion rate?”*

The SQL correctness deck showed that an overall ratio must be Σ numerator ÷ Σ denominator. Metrics make this trap more tempting, because ratios are often pre-computed per day or per segment and then “averaged up” in a BI tool. The **average of ratios** gives every row equal weight; the **ratio of sums** weights each row by its denominator. They are equal only when every denominator is the same.

#### Daily conversion, averaged two ways

```sql
WITH daily AS (                      -- February, one row per Chicago day
    SELECT session_date AS day,
           COUNT(*)                          AS sessions,
           COUNT(*) FILTER (WHERE purchased) AS purchases
    FROM customer_sessions
    WHERE session_date >= DATE '2026-02-01' AND session_date < DATE '2026-03-01'
    GROUP BY day
)
SELECT ROUND(AVG(purchases / sessions), 4)                          AS average_of_daily_rates,
       ROUND(SUM(purchases) / SUM(sessions), 4)                     AS ratio_of_sums,
       ROUND(SUM(purchases / sessions * sessions) / SUM(sessions), 4) AS daily_rates_weighted_by_sessions
FROM daily;
```

Result (1 row):

| average_of_daily_rates | ratio_of_sums | daily_rates_weighted_by_sessions |
|---|---|---|
| 0.1538 | 0.1535 | 0.1535 |

Averaging 28 daily rates treats a quiet Tuesday like a busy Saturday. The gap is small here because Leafy’s daily traffic is fairly even; it grows with uneven denominators (right). Weighting each daily rate by its sessions gives back exactly the ratio of sums: the ratio of sums *is* the denominator-weighted average.

#### Refund rate by seller

```sql
WITH per_seller AS (                 -- February orders; refunds known to date
    SELECT s.seller_name,
           COUNT(*)           AS orders,
           COUNT(r.order_id)  AS refunded_orders
    FROM clean_orders o
    JOIN sellers s USING (seller_id)
    LEFT JOIN (SELECT DISTINCT order_id FROM clean_refunds) r USING (order_id)
    WHERE o.order_date >= DATE '2026-02-01' AND o.order_date < DATE '2026-03-01'
    GROUP BY s.seller_name
)
SELECT 1 AS k, seller_name, orders, refunded_orders,
       ROUND(refunded_orders / orders, 3)                 AS refund_rate
FROM per_seller
UNION ALL
SELECT 2, 'mean of the 7 seller rates', NULL, NULL, ROUND(AVG(refunded_orders / orders), 3)
FROM per_seller
UNION ALL
SELECT 3, 'all orders: ratio of sums', SUM(orders), SUM(refunded_orders),
       ROUND(SUM(refunded_orders) / SUM(orders), 3)
FROM per_seller
ORDER BY k, orders DESC;
```

Result (9 rows):

| k | seller_name | orders | refunded_orders | refund_rate |
|---|---|---|---|---|
| 1 | Leafy | 628 | 43 | 0.068 |
| 1 | Fern & Co | 129 | 7 | 0.054 |
| 1 | Cactus Club | 87 | 4 | 0.046 |
| 1 | Bonsai Barn | 74 | 5 | 0.068 |
| 1 | Moss Market | 62 | 10 | 0.161 |
| 1 | Rare Roots | 52 | 2 | 0.038 |
| 1 | Orchid Hub | 32 | 4 | 0.125 |
| 2 | mean of the 7 seller rates | NULL | NULL | 0.08 |
| 3 | all orders: ratio of sums | 1064 | 75 | 0.07 |

Small sellers move the plain mean as much as Leafy itself does, with ten times fewer orders. The two numbers answer different questions: “what share of orders get refunded?” (ratio of sums) vs “how does the typical seller do?” (mean of seller rates).

#### When the mean of ratios is the right answer

- The question is about the *typical unit*: the median seller’s refund rate, the average customer’s on-time experience.
- Then name it so: “mean seller refund rate”, and consider the median, which small units can’t drag around.
- Everything else (“our refund rate”, “our conversion”) is a ratio of sums.

#### Spot it in a review

- `AVG(rate)` over rows that already hold a rate.
- A BI visual set to “average” on a percentage column.
- A weekly number computed as the mean of seven daily numbers.

> **On the job:** Interviewers love this trap (“the overall CTR is the average of store CTRs, right?”). On the job it hides in semantic models: a pre-computed `conversion_rate` column that a report averages. The cure is in the next lesson: ship the numerator and the denominator, not the ratio.

> **The main idea:** an overall rate is Σ numerator ÷ Σ denominator, which equals the denominator-weighted mean of segment rates. A plain mean of rates answers a different question; label it if you mean it.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/).

---

<a id="slide-18"></a>
## 18. Re-aggregation: store numerator and denominator

*Part B · roll up across days, weeks, and platforms from components*

**Re-aggregation** means computing a metric at a coarser grain from a finer one: days to weeks, platforms to all platforms. A ratio can only be re-aggregated from its **components**. So the table behind a dashboard should store the numerator and the denominator (both additive), and divide only at the very end, at whatever grain the reader asks for.

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

#### Any grain, from the same components

```sql
SELECT date_trunc('week', day)::DATE                AS week,
       COALESCE(platform, 'all platforms')            AS platform_label,
       SUM(sessions)                                  AS sessions,
       SUM(purchases)                                 AS purchases,
       ROUND(SUM(purchases) / SUM(sessions), 4)       AS conversion
FROM conversion_daily
WHERE day >= DATE '2026-03-02' AND day < DATE '2026-03-16'
GROUP BY GROUPING SETS ((week, platform), (week))
ORDER BY week, GROUPING(platform), platform;
```

Result (8 rows):

| week | platform_label | sessions | purchases | conversion |
|---|---|---|---|---|
| 2026-03-02 | android | 494 | 75 | 0.1518 |
| 2026-03-02 | ios | 455 | 75 | 0.1648 |
| 2026-03-02 | web | 883 | 137 | 0.1552 |
| 2026-03-02 | all platforms | 1832 | 287 | 0.1567 |
| 2026-03-09 | android | 561 | 69 | 0.123 |
| 2026-03-09 | ios | 478 | 71 | 0.1485 |
| 2026-03-09 | web | 896 | 148 | 0.1652 |
| 2026-03-09 | all platforms | 1935 | 288 | 0.1488 |

One `GROUPING SETS` query (SQL correctness deck) returns per-platform and all-platform rows; every rate is Σ purchases ÷ Σ sessions at its own grain.

#### Believable, but wrong

```sql
WITH platform_week AS (
    SELECT platform, SUM(purchases) / SUM(sessions) AS rate
    FROM conversion_daily
    WHERE day >= DATE '2026-03-09' AND day < DATE '2026-03-16'
    GROUP BY platform
)
SELECT ROUND(AVG(rate), 4) AS mean_of_platform_rates
FROM platform_week;
```

Result (1 row):

| mean_of_platform_rates |
|---|
| 0.1456 |

The mean of three platform rates for the week of 9 March is not the all-platform rate in the table on the left: web has about half the sessions but counts for one third.

| Measure type | Leafy examples | Rolls up by | Store |
|---|---|---|---|
| **Additive** | sessions, orders, net sales, tickets opened | sum over every dimension, including time | the value |
| **Semi-additive** | MRR, ticket backlog, open listings | sum across segments; end-of-period (or average) over time | the snapshot value per period |
| **Non-additive: ratios** | conversion, AOV, take rate, on-time rate | Σ numerator ÷ Σ denominator | numerator and denominator |
| **Non-additive: distinct counts** | DAU, WAU, buyers | recount from the key | key-level rows (or a sketch) |
| **Non-additive: percentiles** | p50/p95 delivery days | recompute from raw values | raw values (or a histogram or sketch) |

> **On the job:** In Power BI, Fabric semantic models, or a dbt Semantic Layer, this is the difference between a measure defined as `DIVIDE(SUM(purchases), SUM(sessions))` (correct at every grain) and a stored ratio column with “average” aggregation (wrong at every grain but one). Semantic-layer ratio metrics take a numerator and a denominator for exactly this reason (lesson 23).

> **The main idea:** keep ratios as two additive columns and divide at query time. Then any grain, slice, or roll-up gives the right answer from the same table.

*Read more:* [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/), [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [dbt: ratio metrics](https://docs.getdbt.com/docs/build/ratio), [DAX: DIVIDE](https://learn.microsoft.com/en-us/dax/divide-function-dax).

---

<a id="slide-19"></a>
## 19. North star and guardrail metrics

*Part C · one number to aim at, a few to protect*

A **north star metric** (NSM) is the one number a company or team optimises because it best captures the value customers get, and it predicts long-term results. **Guardrail metrics** (also called counter-metrics) are numbers that must not get worse while you push the north star: they catch “wins” that hurt customers or the business.

#### Choosing Leafy’s north star

| Candidate | Customer value? | Leading? | Hard to game? |
|---|---|---|---|
| GMV | partly: spend, not satisfaction | no, it is the outcome | no: discounts buy GMV |
| DAU | activity, not value | yes | no: notifications buy visits |
| Orders | partly | somewhat | no: split baskets, coupons |
| **Weekly buyers who received an on-time delivery** | yes: a plant arrived when promised | yes: predicts repeat purchase | harder: needs a real order and real delivery |

The choice is a judgement, made with leadership; the analytics job is to define it precisely and show how it behaves.

#### North star with three guardrails, weekly

```sql
WITH deliveries AS (
    SELECT o.user_id, o.order_id, s.promised_date,
           local_ts(s.delivered_at_utc)::DATE AS delivered_date
    FROM clean_orders o JOIN shipments s USING (order_id)
), weeks AS (
    SELECT UNNEST(generate_series(DATE '2026-02-02', DATE '2026-03-16', INTERVAL 7 DAY))::DATE AS week
)
SELECT w.week,
       (SELECT COUNT(DISTINCT user_id) FROM deliveries
        WHERE delivered_date >= w.week AND delivered_date < w.week + 7
          AND delivered_date <= promised_date)                                  AS north_star_buyers,
       (SELECT ROUND(COUNT(*) FILTER (WHERE delivered_date <= promised_date) / COUNT(*), 3)
        FROM deliveries
        WHERE promised_date >= w.week AND promised_date < w.week + 7)           AS g_on_time_rate,
       (SELECT ROUND(COUNT(DISTINCT r.order_id) / COUNT(DISTINCT o.order_id), 3)
        FROM clean_orders o LEFT JOIN clean_refunds r USING (order_id)
        WHERE o.order_date >= w.week AND o.order_date < w.week + 7)            AS g_refund_rate,
       (SELECT ROUND(100 * COUNT(*) / (SELECT COUNT(*) FROM clean_orders
                                       WHERE order_date >= w.week AND order_date < w.week + 7), 1)
        FROM tickets
        WHERE local_ts(opened_at_utc)::DATE >= w.week
          AND local_ts(opened_at_utc)::DATE < w.week + 7)                      AS g_tickets_per_100_orders
FROM weeks w
ORDER BY w.week;
```

Result (7 rows):

| week | north_star_buyers | g_on_time_rate | g_refund_rate | g_tickets_per_100_orders |
|---|---|---|---|---|
| 2026-02-02 | 184 | 0.967 | 0.061 | 11.8 |
| 2026-02-09 | 195 | 0.973 | 0.068 | 11 |
| 2026-02-16 | 190 | 0.934 | 0.069 | 11.6 |
| 2026-02-23 | 203 | 0.957 | 0.07 | 16.4 |
| 2026-03-02 | 207 | 0.95 | 0.054 | 10.5 |
| 2026-03-09 | 226 | 0.959 | 0.032 | 13.3 |
| 2026-03-16 | 215 | 0.953 | 0.004 | 27.2 |

Guardrails: on-time rate (promise week), refund rate (order week; recent weeks still maturing, lesson 11), and support tickets per 100 orders. If a promotion lifts the north star while refunds or tickets jump, it is not a win.

#### Rules of thumb

- One north star per team or product, with a written spec card like any other metric.
- Two to four guardrails, each covering a different way to “win badly”: quality, cost, customer pain, the other side of a marketplace.
- Set guardrail thresholds in advance (“refund rate must not rise by more than 1 point”).
- Review the NSM definition yearly; strategy changes, and so should the number.

#### Spec notes for this north star

- Unit: buyer (`user_id`), distinct per week.
- Attribution: delivery week, so it lags orders by a few days.
- Maturity: a week is final once parcels promised in it are delivered or overdue.

> **On the job:** Interviews ask “what would be the north star for X, and what guardrails?” Answer with the value the customer gets, why it leads revenue, how it can be gamed, and which guardrails catch that. Then define it precisely: unit, window, and exclusions, exactly like this deck’s spec cards.

> **The main idea:** pick one north star that measures customer value and leads revenue, then protect it with a few guardrails that catch the ways it can be gamed.

*Read more:* [Amplitude: the North Star metric](https://amplitude.com/blog/product-north-star-metric), [Goodhart’s law](https://en.wikipedia.org/wiki/Goodhart%27s_law).

---

<a id="slide-20"></a>
## 20. Leading and lagging, input and output metrics

*Part C · which numbers move first, and which ones you can move*

A **lagging indicator** reports an outcome after it happened (revenue, churn, refunds). A **leading indicator** moves earlier and predicts it (trial starts before MRR, late parcels before complaints). A related split: an **input metric** is something a team can act on directly (listings added, parcels shipped within 24 hours); an **output metric** is the result those inputs produce (GMV, retention).

#### Do late parcels lead support tickets?

```sql
WITH late AS (              -- parcels that missed their promise, by promised date
    SELECT s.promised_date AS day, COUNT(*) AS late_parcels
    FROM clean_orders o JOIN shipments s USING (order_id)
    WHERE COALESCE(local_ts(s.delivered_at_utc)::DATE, (SELECT current_day FROM load_info))
          > s.promised_date
    GROUP BY s.promised_date
), tick AS (                               -- delivery tickets, by day opened
    SELECT local_ts(opened_at_utc)::DATE AS day, COUNT(*) AS delivery_tickets
    FROM tickets WHERE category = 'delivery' GROUP BY day
), daily AS (
    SELECT d.day, COALESCE(late_parcels, 0) AS late_parcels, COALESCE(delivery_tickets, 0) AS tickets
    FROM (SELECT UNNEST(generate_series(DATE '2026-02-02', DATE '2026-03-20', INTERVAL 1 DAY))::DATE AS day) d
    LEFT JOIN late USING (day) LEFT JOIN tick USING (day)
)
SELECT k AS lag_days,
       ROUND(corr(a.late_parcels, b.tickets), 3) AS correlation
FROM (SELECT UNNEST(range(0, 5)) AS k) lags
JOIN daily a ON TRUE
JOIN daily b ON b.day = a.day + lags.k::INTEGER
GROUP BY k
ORDER BY k;
```

Result (5 rows):

| lag_days | correlation |
|---|---|
| 0 | 0.041 |
| 1 | 0.292 |
| 2 | 0.278 |
| 3 | 0.038 |
| 4 | 0.126 |

Correlation between late parcels on day *d* and delivery tickets on day *d + k*. It peaks a day or two later: customers wait a day, then write. So the on-time rate is a leading indicator for the support load, which in turn leads churn. Correlation alone doesn’t prove cause; here the mechanism (late parcel → complaint) makes the reading credible.

#### Leafy’s chains

| Input (act on) | Leading output | Lagging output |
|---|---|---|
| Ship within 24 h; carrier choice | on-time delivery rate | tickets → repeat purchase → churn |
| Trial onboarding emails | trial starts, day-3 activity | trial conversion → MRR |
| Seller onboarding, pricing advice | new listings, sell-through | third-party GMV, take revenue |
| Checkout speed, app releases | checkout → purchase step rate | orders, net sales |

> **On the job:** Weekly business reviews show both kinds on purpose: teams are held accountable for inputs they control, while leadership watches outputs. When an input moves and its output doesn’t (after the expected lag), the assumed link is wrong, and that is a finding worth reporting.

> **The main idea:** manage with inputs and leading indicators because they move early and are actionable; judge with lagging outputs. Measure the lag between them instead of assuming it.

*Read more:* [Amplitude: leading vs lagging indicators](https://amplitude.com/blog/map-your-metrics), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-21"></a>
## 21. Metric trees: decompose a number into its drivers

*Part C · revenue = traffic × conversion × AOV*

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

Conversion here is orders ÷ sessions (order grain, lesson 8), so the identity is exact. Pick tree nodes that multiply back to the top; otherwise the tree explains only part of the change.

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

<a id="slide-22"></a>
## 22. Goodhart’s law, gaming, and A/B-test guardrails

*Part C · when a measure becomes a target (added)*

**Goodhart’s law**: when a measure becomes a target, it ceases to be a good measure. People optimise the number, not the thing it stood for. The defence is a counter-metric for every target, and spec cards precise enough that “improving” the number by redefinition shows up as a version change.

| Target at Leafy | How it gets gamed | Counter-metric (guardrail) |
|---|---|---|
| Tickets closed within 24 h | Close without solving; customer re-opens | Re-open rate; satisfaction score |
| On-time delivery rate | Promise 9 days instead of 6 | Median promised days; conversion at checkout |
| Session conversion | Count fewer sessions (aggressive bot rule) | Orders and net sales per visitor; rule-change log |
| Take rate | Raise commissions | Seller churn; sell-through (Business models and metrics deck: “Marketplace: liquidity and sell-through”) |
| DAU | More push notifications | Notification opt-outs; week-4 retention |

#### A/B tests: primary, guardrail, and trust metrics

An **A/B test** randomly splits users between a control and a treatment and compares metrics. Its **primary metric** decides success; **guardrail metrics** must not degrade (refund rate, page load time, unsubscribes); **trust metrics** check that the experiment itself is valid. The classic trust check is **sample ratio mismatch** (SRM): a 50/50 split that isn’t 50/50 means assignment or logging is broken, and no result can be trusted.

```sql
WITH assignment(variant, users) AS (VALUES ('control', 10240), ('treatment', 9710)),
e AS (SELECT variant, users, SUM(users) OVER () / 2 AS expected FROM assignment),
c AS (SELECT *, SUM((users - expected) ^ 2 / expected) OVER () AS chi_square FROM e)
SELECT variant, users, expected, ROUND(chi_square, 2) AS chi_square,
       chi_square > 10.83 AS srm_alarm_p_lt_0_001
FROM c
ORDER BY variant;
```

Result (2 rows):

| variant | users | expected | chi_square | srm_alarm_p_lt_0_001 |
|---|---|---|---|---|
| control | 10240 | 9975 | 14.08 | true |
| treatment | 9710 | 9975 | 14.08 | true |

A chi-square statistic above 10.83 (one degree of freedom) has p < 0.001: a 51/49 split on 20,000 users is an alarm, not noise. Illustrative counts.

#### Rules that keep metrics honest

- Pair every target with a counter-metric owned by someone else.
- Freeze metric definitions during an experiment or target period; changes get a new version.
- Set guardrail thresholds before the test starts, not after seeing results.
- Check SRM and data quality before reading any experiment metric.

> **On the job:** Experimentation platforms (Microsoft ExP, Optimizely, Statsig, Eppo) compute guardrails automatically, but they read metric definitions from the warehouse or semantic layer, so the spec card is upstream of every experiment decision. Analytics engineers are often asked to certify those definitions.

> **The main idea:** every target invites gaming: pair it with a counter-metric, version its definition, and in experiments check trust (SRM) and guardrails before celebrating the primary metric.

*Read more:* [Goodhart’s law](https://en.wikipedia.org/wiki/Goodhart%27s_law), [Microsoft Experimentation Platform (ExP)](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/).

---

<a id="slide-23"></a>
## 23. Metric definitions as code: semantic layers

*Part C · write the definition once, query it everywhere (added)*

A **semantic layer** stores metric definitions (measures, dimensions, joins) as code in one place, and generates the SQL for any grain or filter a tool asks for. Every dashboard, notebook, and AI assistant then gets the same number. Examples: the **dbt Semantic Layer** (powered by MetricFlow), and **Power BI / Fabric semantic models** with DAX measures.

#### The idea in 30 lines of Python (executed)

```python
from dataclasses import dataclass
import duckdb

con = duckdb.connect("leafy.duckdb")       # the Leafy warehouse with the base views

@dataclass(frozen=True)
class RatioMetric:
    """A spec card that can render its own SQL: one definition, many grains."""
    name: str
    description: str
    owner: str
    source: str          # a base view at the unit's grain (lesson 16)
    numerator: str       # additive expression per row
    denominator: str     # additive expression per row
    time_column: str

    def sql(self, grain: str, start: str, end: str) -> str:
        return (f"SELECT date_trunc('{grain}', {self.time_column})::DATE AS period,\n"
                f"       SUM({self.numerator}) AS numerator, SUM({self.denominator}) AS denominator,\n"
                f"       ROUND(numerator / NULLIF(denominator, 0), 4) AS {self.name}\n"
                f"FROM {self.source}\n"
                f"WHERE {self.time_column} >= DATE '{start}' AND {self.time_column} < DATE '{end}'\n"
                f"GROUP BY period ORDER BY period")

session_conversion = RatioMetric(
    name="session_conversion", description="Share of customer sessions with a purchase",
    owner="Growth analytics", source="customer_sessions",
    numerator="purchased::INT", denominator="1", time_column="session_date")

query = session_conversion.sql("week", "2026-03-02", "2026-03-23")
print(query)
for period, num, den, rate in con.execute(query).fetchall():
    print(period, num, den, rate)
```

Output:

```text
SELECT date_trunc('week', session_date)::DATE AS period,
       SUM(purchased::INT) AS numerator, SUM(1) AS denominator,
       ROUND(numerator / NULLIF(denominator, 0), 4) AS session_conversion
FROM customer_sessions
WHERE session_date >= DATE '2026-03-02' AND session_date < DATE '2026-03-23'
GROUP BY period ORDER BY period
2026-03-02 287 1832 0.1567
2026-03-09 288 1935 0.1488
2026-03-16 232 2006 0.1157
```

The spec card becomes a data structure; the SQL is generated from it, so the numerator, denominator, and zero-denominator rule can’t drift between reports. Real semantic layers add joins, dimensions, time spines, caching, and access control.

#### The same metric in a semantic layer (not executed here)

dbt 1.12-style YAML, following the dbt documentation for simple and ratio metrics; this deck has no dbt project, so it was not run:

```yaml
models:
  - name: customer_sessions
    semantic_model:
      enabled: true
    # entities, dimensions, and the time spine are omitted here: see the dbt docs
    metrics:
      - name: sessions
        type: simple
        agg: count
        expr: session_id
      - name: purchasing_sessions
        type: simple
        agg: sum_boolean
        expr: purchased
      - name: session_conversion
        label: Session conversion rate
        description: Share of customer sessions with a purchase (spec card, lesson 5)
        type: ratio
        numerator: purchasing_sessions
        denominator: sessions
```

And as a Power BI / Fabric semantic-model measure over the component table from lesson 18:

```dax
Session conversion :=
DIVIDE ( SUM ( conversion_daily[purchases] ), SUM ( conversion_daily[sessions] ) )
```

Both store a **numerator and a denominator** and divide at query time, which is exactly lesson 18’s rule.

> **On the job:** Moving metric logic out of individual dashboards into a semantic layer is a common analytics-engineering project. It turns the spec card into a reviewed pull request, makes “which revenue?” a lookup instead of a meeting, and lets new tools (including LLM assistants) query certified metrics instead of guessing SQL.

> **The main idea:** store metric definitions as versioned code with numerator, denominator, and rules, and let a semantic layer generate the SQL; then every consumer gets the same number at every grain.

*Read more:* [dbt Semantic Layer](https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-sl), [dbt: about MetricFlow](https://docs.getdbt.com/docs/build/about-metricflow), [dbt: ratio metrics](https://docs.getdbt.com/docs/build/ratio), [Power BI: semantic models](https://learn.microsoft.com/en-us/power-bi/connect-data/service-datasets-understand), [Fabric: semantic models](https://learn.microsoft.com/en-us/fabric/data-warehouse/semantic-models).

---

<a id="slide-24"></a>
## 24. Governance, certified metrics, and reconciling with Finance

*Part C · “your revenue doesn’t match Finance’s” (added)*

Product dashboards and Finance will report different “revenue” for the same month, and both can be right. **Reconciliation** explains the gap with a **bridge** (a reconciliation waterfall): start from one number, change one rule at a time, and land exactly on the other. **Metric governance** is the process that keeps definitions owned, reviewed, versioned, and trusted.

#### Finance’s view, from their rules

*SQL · Finance's ledger (their rules)*

```sql
CREATE OR REPLACE VIEW finance_ledger AS      -- how Finance books first-party revenue
SELECT 'sale' AS entry, o.order_id, o.placed_at_utc AS booked_at_utc,
       o.items_amount - o.discount_amount + o.shipping_amount AS amount
FROM orders o JOIN users u USING (user_id)
WHERE o.status = 'completed' AND o.seller_id = 1 AND NOT u.is_test
UNION ALL
SELECT 'refund', r.order_id, r.refunded_at_utc, -r.amount
FROM refunds r JOIN orders o USING (order_id) JOIN users u USING (user_id)
WHERE o.status = 'completed' AND o.seller_id = 1 AND NOT u.is_test;
```

```sql
SELECT SUM(amount) AS finance_feb_first_party_revenue
FROM finance_ledger
WHERE booked_at_utc >= TIMESTAMP '2026-02-01' AND booked_at_utc < TIMESTAMP '2026-03-01';
```

Result (1 row):

| finance_feb_first_party_revenue |
|---|
| 39553.34 |

#### The bridge: one rule per step

```sql
WITH o AS (                          -- completed first-party orders, QA excluded
    SELECT o.order_id, o.placed_at_utc, local_ts(o.placed_at_utc) AS placed_local,
           o.items_amount - o.discount_amount AS net_items, o.shipping_amount, u.is_internal AS staff
    FROM orders o JOIN users u USING (user_id)
    WHERE o.status = 'completed' AND o.seller_id = 1 AND NOT u.is_test
), r AS (
    SELECT r.amount, r.refunded_at_utc, local_ts(r.refunded_at_utc) AS refunded_local, o.*
    FROM refunds r JOIN o USING (order_id)
), steps AS (
    SELECT 0 AS step, 'Dashboard: Chicago month, refunds by order, no shipping, no staff' AS rule,
           (SELECT SUM(net_items) FROM o WHERE NOT staff
              AND placed_local >= '2026-02-01' AND placed_local < '2026-03-01')
         - (SELECT SUM(amount) FROM r WHERE NOT staff
              AND placed_local >= '2026-02-01' AND placed_local < '2026-03-01') AS value
    UNION ALL
    SELECT 1, 'Book refunds in the month they were paid',
           (SELECT SUM(net_items) FROM o WHERE NOT staff
              AND placed_local >= '2026-02-01' AND placed_local < '2026-03-01')
         - (SELECT SUM(amount) FROM r WHERE NOT staff
              AND refunded_local >= '2026-02-01' AND refunded_local < '2026-03-01')
    UNION ALL
    SELECT 2, 'Use the UTC calendar month',
           (SELECT SUM(net_items) FROM o WHERE NOT staff
              AND placed_at_utc >= '2026-02-01' AND placed_at_utc < '2026-03-01')
         - (SELECT SUM(amount) FROM r WHERE NOT staff
              AND refunded_at_utc >= '2026-02-01' AND refunded_at_utc < '2026-03-01')
    UNION ALL
    SELECT 3, 'Add shipping charged to customers',
           (SELECT SUM(net_items + shipping_amount) FROM o WHERE NOT staff
              AND placed_at_utc >= '2026-02-01' AND placed_at_utc < '2026-03-01')
         - (SELECT SUM(amount) FROM r WHERE NOT staff
              AND refunded_at_utc >= '2026-02-01' AND refunded_at_utc < '2026-03-01')
    UNION ALL
    SELECT 4, 'Include staff purchases (real, paid orders)',
           (SELECT SUM(net_items + shipping_amount) FROM o
              WHERE placed_at_utc >= '2026-02-01' AND placed_at_utc < '2026-03-01')
         - (SELECT SUM(amount) FROM r
              WHERE refunded_at_utc >= '2026-02-01' AND refunded_at_utc < '2026-03-01')
)
SELECT step, rule, value, value - LAG(value) OVER (ORDER BY step) AS change
FROM steps
ORDER BY step;
```

Result (5 rows):

| step | rule | value | change |
|---|---|---|---|
| 0 | Dashboard: Chicago month, refunds by order, no shipping, no staff | 36208.64 | NULL |
| 1 | Book refunds in the month they were paid | 36371.44 | 162.80 |
| 2 | Use the UTC calendar month | 36506.74 | 135.30 |
| 3 | Add shipping charged to customers | 38570.89 | 2064.15 |
| 4 | Include staff purchases (real, paid orders) | 39553.34 | 982.45 |

Every step is one line on the two spec cards. The last step equals Finance’s ledger exactly (the build asserts it), so the whole gap is explained: no “unexplained difference” row. Shipping and staff purchases are the big items; refund timing and the time zone are small but real, which is exactly what a “close enough” comparison would hide.

#### What governance looks like

- **Owner** and **steward** for every metric; one place to ask.
- **Certified** metrics: Power BI and Fabric let admin-designated reviewers mark semantic models and reports as *Promoted* or *Certified*; dbt marks metrics through owners, groups, and access levels.
- **Change control**: definition changes go through review, get a version and a changelog entry, and old charts are annotated.
- **Deprecation**: duplicate metrics are retired with a migration window, not deleted overnight.
- **Tests**: grain, reconciliation to a control total, and freshness checks run in the pipeline.

#### Talking to Finance

- Never “fix” your number to match theirs; publish both, with names that say what they are (“net sales, order view” vs “booked revenue”).
- Agree the bridge once, automate it, and alert when the unexplained remainder is not zero.
- Finance’s month is usually closed and never restated; product views restate. Say which one a chart is.

> **On the job:** “Why doesn’t your revenue match Finance?” is one of the most common escalations an analytics engineer handles, and a frequent behavioural interview question. Having a bridge query ready, with each rule traced to a spec field, turns a week of email into a ten-minute review.

> **The main idea:** different revenue numbers are usually different rules, not bugs. Reconcile with a step-by-step bridge that lands exactly, and govern metrics with owners, certification, versions, and tests.

*Read more:* [Fabric: endorsement (promoted, certified)](https://learn.microsoft.com/en-us/fabric/governance/endorsement-overview), [dbt: metrics overview](https://docs.getdbt.com/docs/build/metrics-overview), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-25"></a>
## 25. Recognise the metric question

*Part C · interview signals and your first move*

Metric interviews reuse a small set of patterns. Recognising the pattern tells you what the interviewer is grading and which lesson (in this deck or a sibling deck) to draw on. In every pattern, the first move is to state the definition out loud.

| If you hear… | It tests… | Your first move | Where |
|---|---|---|---|
| “How would you measure X?” / “Define success for feature Y” | Metric definition from a decision | Ask the decision; propose a spec with population, unit, window; name a guardrail | lessons 5–7, 19 |
| “Metric X dropped 15 %, why?” | Structured diagnosis | Clarify and validate data first, then tree, then segments | lesson 21; *Diagnosing metric changes* deck |
| “Write SQL for DAU/MAU” / “retained users month over month” | Distinct counts over windows | Define active; distinct per window; no adding DAUs | *Business models and metrics* deck (active users, retention) |
| “Conversion from view to purchase within 7 days” | Funnel definition | Unit, step order, window, denominator | *Business models and metrics* deck (funnels) |
| “Overall CTR from per-store CTRs”, “average of averages” | Ratio aggregation | Σ num ÷ Σ den; mention Simpson and mix | lessons 17–18; Simpson: *Diagnosing metric changes* deck |
| “Pick the north star for product Z” | Product judgement | Customer value, leading, hard to game, plus guardrails | lessons 19–20 |
| “What’s our churn?”, “MRR bridge” | SaaS definitions | Starting cohort, logos vs MRR, plan changes | *Business models and metrics* deck (SaaS) |
| “GMV went up but revenue didn’t” | Marketplace economics | GMV vs net revenue, take rate as ratio of sums | *Business models and metrics* deck (marketplace) |
| “Your number doesn’t match Finance” | Reconciliation and governance | Bridge one rule at a time; publish both | lesson 24 |
| Follow-ups: “what about time zones / bots / late data / this week so far?” | Data-quality instincts | Name the spec field and the fix | lessons 10–15 |

> **On the job:** The same patterns structure real work: a new dashboard request is pattern 1, an alert is pattern 2, a quarterly review is patterns 6 and 9. Keeping the spec card template open while you answer, in interviews and in Slack, is the habit that makes all of them easier.

> **The main idea:** recognise the pattern, state the definition first, and reach for the matching tool: spec card, metric tree, ratio of sums, cohort with maturity, or reconciliation bridge.

*Read more:* [SQLPad: investigating a metric drop (practice)](https://sqlpad.io/tutorial/data-analyst-case-interview-investigate-metric-drop/), [DataLemur: active user retention (practice)](https://datalemur.com/questions/user-retention).

---

<a id="slide-26"></a>
## 26. Bug clinic: believable metric-definition bugs

*Practice · symptom → cause → fix*

Each bug below shipped in a real-looking dashboard: the query runs, the number is plausible, and it is wrong. Read the symptom, find the cause in the query, then check the fix.

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

**Cause:** `COALESCE(rate, 0)` turned “no sessions” into “nobody bought”, hiding an outage as a conversion crisis. **Fix:** keep NULL for a zero denominator and show it as “–” (lesson 14).

#### 2 · “After the SQL Server port, every conversion is 0”

*SQL · believable, but wrong*

```sql
SELECT platform, purchases // sessions AS conversion   -- what T-SQL's / does to integers
FROM conversion_daily WHERE day = DATE '2026-03-10'
ORDER BY platform;
```

Result (3 rows):

| platform | conversion |
|---|---|
| android | 0 |
| ios | 0 |
| web | 0 |

*SQL · fixed*

```sql
SELECT platform, ROUND(purchases * 1.0 / NULLIF(sessions, 0), 4) AS conversion
FROM conversion_daily WHERE day = DATE '2026-03-10'
ORDER BY platform;
```

Result (3 rows):

| platform | conversion |
|---|---|
| android | 0.0857 |
| ios | 0.1017 |
| web | 0.1638 |

**Cause:** integer ÷ integer truncates in T-SQL, Fabric Warehouse, and PostgreSQL (shown here with DuckDB’s `//`, which behaves the same). **Fix:** multiply by `1.0` or `CAST`, and guard with `NULLIF` (lesson 14).

#### 3 · “Last week had fewer orders than the daily chart adds up to”

*SQL · believable, but wrong*

```sql
SELECT COUNT(*) AS orders
FROM clean_orders
WHERE placed_at_local BETWEEN '2026-03-09' AND '2026-03-15';
```

Result (1 row):

| orders |
|---|
| 233 |

*SQL · fixed*

```sql
SELECT COUNT(*) AS orders
FROM clean_orders
WHERE placed_at_local >= '2026-03-09' AND placed_at_local < '2026-03-16';
```

Result (1 row):

| orders |
|---|
| 278 |

**Cause:** `BETWEEN '2026-03-09' AND '2026-03-15'` on a timestamp stops at Sunday 00:00, dropping almost all of Sunday. **Fix:** half-open interval ending at the next Monday (lesson 10).

#### Not a bug: “last month’s number changed”

February net sales by order date fell between 1 March and 25 March. That is restatement: refunds for February orders arrived in March (lesson 11). The fix is a label (“restates for 30 days”) and, if needed, an “as reported” snapshot, not a code change.

#### The pattern behind them

- Missing data converted into a misleading value (0, NaN) instead of NULL.
- Engine differences (integer division, time zones) when a definition is ported.
- Time boundaries that are inclusive on both ends or in the wrong zone.
- Ratios averaged instead of re-aggregated from components (lessons 17–18), and distinct counts summed (the *Business models and metrics* deck’s bug clinic).

#### A review checklist

Ask these five questions of every metric query before it ships: Are any ratios averaged? Any distinct counts summed? Any `COALESCE` to 0 on a rate? Any `BETWEEN` on timestamps? Which time zone?

> **On the job:** A short checklist built from these bugs catches most metric defects in code review. Paste it into the pull-request template of the repository that holds your metric SQL or semantic-layer definitions.

> **The main idea:** most metric-definition bugs come from hiding missing data, porting across engines, fuzzy time boundaries, or re-aggregating non-additive numbers. Check those first.

---

<a id="slide-27"></a>
## 27. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

These are the metric-design questions that came up most often in the interview research behind this series (metric definition, ratio traps, north star, reconciliation). Answer aloud in about a minute, then open the model answer. Questions on worked SaaS and product metrics are in the *Business models and metrics* deck; “metric dropped” questions are in the *Diagnosing metric changes* deck.

<details><summary>“We have conversion per store. What is our overall conversion?” · *checks: ratio of sums vs average of ratios; Simpson’s paradox*</summary>

**Model answer (about 60 seconds):** The overall rate is total conversions divided by total visits across stores, which equals each store’s rate weighted by its visits. A plain average of store rates gives a tiny store the same weight as the biggest one, so it answers a different question: the typical store. Ideally the table stores numerators and denominators so we can re-aggregate at any level, and I’d label a mean of rates if someone really needs it.

**Likely follow-up:** “Every store’s conversion improved, but the overall rate fell. How?” → Mix shift (Simpson’s paradox): traffic moved toward lower-converting stores. I’d split the change into a rate effect and a mix effect to show it (the *Diagnosing metric changes* deck walks through it).

</details>

<details><summary>“Choose a north star metric for a two-sided marketplace, and its guardrails.” · *checks: customer value, leading behaviour, gaming resistance, both sides of the market*</summary>

**Model answer (about 60 seconds):** I’d pick a metric that captures value delivered to both sides: for a plant marketplace, weekly buyers who received an on-time order, or successful transactions per week. It leads revenue because satisfied buyers return, and it is harder to game than GMV, which discounts can inflate. Guardrails: refund rate and support contacts for buyer experience, seller retention and sell-through for the supply side, and take rate or contribution margin so we don’t buy growth at a loss. I’d write a spec card for each and set thresholds in advance.

**Likely follow-up:** “How could your north star be gamed?” → By lengthening delivery promises so more orders are “on time”: guard it with median promised days and checkout conversion.

</details>

<details><summary>“Your revenue number doesn’t match Finance’s. What do you do?” · *checks: reconciliation, governance, communication*</summary>

**Model answer (about 60 seconds):** I wouldn’t assume either is wrong. I’d list both definitions side by side: time zone and calendar, attribution date for refunds, whether shipping and tax are in, which orders and accounts are included, and when each is computed. Then I’d build a bridge: start from my number, change one rule at a time, and check that the last step equals Finance’s number exactly. If an unexplained remainder is left, that is a data issue to chase. Finally I’d publish both under distinct names, with owners, in a governed place such as a semantic layer, and automate the bridge as a recurring test.

**Likely follow-up:** “Who decides which number is “right”?” → Neither: each serves a decision. Finance owns booked revenue; product owns its operational metric. Governance makes the names and definitions explicit so nobody compares them blindly.

</details>

> **The main idea:** every strong answer starts with the definition and the decision, states the denominator, and names a counter-metric.

---

<a id="slide-28"></a>
## 28. Exercises 1–3 · warm-ups

*Exercises · one concept each*

Exercises use the Leafy warehouse (lesson 3) and the clean views from lesson 16. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · Daily orders on Leafy’s calendar (find the bug)

**Pattern:** time zones and DST · **Format:** find and fix the bug · **Target time:** about 8 minutes.

A colleague reports completed orders per Chicago day with this query. For which days between Sunday 8 and Saturday 14 March is it wrong, why, and what is the fix? Expected property: your fixed counts agree with Python’s `zoneinfo` conversion of the same timestamps (fix only the time bug; keep the colleague’s population).

*SQL · the colleague’s query*

```sql
SELECT (placed_at_utc - INTERVAL 6 HOUR)::DATE AS day, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
  AND (placed_at_utc - INTERVAL 6 HOUR)::DATE BETWEEN DATE '2026-03-08' AND DATE '2026-03-14'
GROUP BY day
ORDER BY day;
```

Result (7 rows):

| day | orders |
|---|---|
| 2026-03-08 | 53 |
| 2026-03-09 | 31 |
| 2026-03-10 | 33 |
| 2026-03-11 | 39 |
| 2026-03-12 | 39 |
| 2026-03-13 | 52 |
| 2026-03-14 | 49 |

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Predict before you run: sums of distinct counts and means of rates

**Pattern:** non-additive metrics · **Format:** predict the output · **Target time:** about 5 minutes.

For the week Monday 9 – Sunday 15 March, before running anything, predict: (a) is the sum of the seven daily DAUs larger than, equal to, or smaller than the week’s WAU? (b) Is the mean of the seven daily session-conversion rates equal to the week’s conversion (Σ purchases ÷ Σ sessions)? Then verify with SQL over `customer_sessions`.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Android conversion with a date spine and a zero day

**Pattern:** zero denominators, date spines · **Format:** write the query · **Target time:** about 8 minutes.

Return Android session conversion for each day Sunday 1 – Saturday 7 March: 7 rows, columns `day, sessions, purchases, conversion`. 3 March (outage) must show 0 sessions and a NULL conversion. Then compute the conversion for the whole 7 days from the same rows.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

---

<a id="slide-29"></a>
## 29. Exercises 4–5 · vague requests

*Exercises · stakeholder ambiguity*

Exercises use the Leafy warehouse (lesson 3) and the clean views from lesson 16. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 4 · “How many active users do we have?”

**Pattern:** define a metric from a vague ask · **Format:** clarifying questions, spec, then SQL · **Target time:** about 15 minutes.

On Wednesday 25 March the CMO writes: *“How many active users do we have? Need it for the board slide.”* (1) List at least five clarifying questions. (2) Write a short spec with the definition you would propose. (3) Compute it, plus two alternative readings you would show alongside. Expected properties: your weekly number is a distinct count of people for a complete Chicago week, and MAU ≥ WAU ≥ the largest DAU in the week.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · “What’s our conversion rate last month?”

**Pattern:** stakeholder ambiguity, grain and numerator/denominator · **Format:** questions, spec, SQL with three readings · **Target time:** about 15 minutes.

The Head of Growth asks for “our conversion rate last month” (February 2026). Write the clarifying questions, choose a definition, and compute it together with two other plausible readings: (a) session conversion over customer sessions, (b) user conversion: February buyers ÷ signed-in customers who visited in February, and (c) the naive event ratio (purchase events ÷ session_start events on raw events). Expected properties: every reading is between 0 and 1; numerator ≤ denominator for (a) and (b); user conversion is higher than session conversion.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

---

<a id="slide-30"></a>
## 30. Exercise 6 · stretch

*Exercises · design*

Exercises use the Leafy warehouse (lesson 3) and the clean views from lesson 16. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 6 · A north star and guardrails for Leafy Plus

**Pattern:** north star and guardrails · **Format:** small design task plus a query · **Target time:** about 15 minutes.

Propose a north star for the Leafy Plus team with two or three guardrails, give each a one-line spec, then compute the north star weekly for the complete weeks 2 February – 16 March. Expected properties: 7 weekly values; the north star never exceeds the number of paying members at the end of that week.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

---

<a id="slide-31"></a>
## 31. Cheat sheet

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

| Task | DuckDB pattern | Lesson |
|---|---|---|
| UTC → business time | `(ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'` | 10 |
| A calendar week | `t >= DATE '2026-03-16' AND t < DATE '2026-03-23'` (half-open) | 10 |
| De-duplicate deliveries | `QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at) = 1` | 12 |
| A rate with numerator ⊆ denominator | unit-grain table with flags; `COUNT(*) FILTER (WHERE flag) / COUNT(*)` | 9 |
| Zero denominator | `num * 1.0 / NULLIF(den, 0)` | 14 |
| Show empty days | date spine: `UNNEST(generate_series(d1, d2, INTERVAL 1 DAY))` + `LEFT JOIN` | 14 |
| As known at a cutoff | `WHERE received_at_utc <= cutoff` | 13 |
| Maturity mask | `CASE WHEN cohort_end + window <= load THEN rate END` | 15 |
| Overall rate | `SUM(num) / SUM(den)`, never `AVG(rate)` | 17–18 |
| Many grains at once | `GROUP BY GROUPING SETS ((week, platform), (week))` | 18 |
| Driver shares in a tree | `LN(x₂ / x₁) / LN(total₂ / total₁)` | 21 |

> **On the job:** Keep the 17 fields and the question list next to you during stakeholder conversations and interviews; keep the pattern table next to you when writing the SQL.

> **The main idea:** define with the card, implement with the patterns, test with the invariants (unique keys, numerator ≤ denominator, reconciliation to a control total).

---

<a id="slide-32"></a>
## 32. Dialect cheat sheet

*Reference · the same metric SQL in four engines (added)*

| Need | DuckDB | SQL Server / Fabric Warehouse | Spark SQL |
|---|---|---|---|
| Decimal division | `/` (always decimal) | `x * 1.0 / y` (int ÷ int truncates) | `/` (double or decimal) |
| Divide by zero | inf or NaN; `NULLIF` | error 8134; `NULLIF` | ANSI on (Spark 4.0 default): error; off: NULL; `try_divide` |
| UTC → Chicago | `(ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'` | `ts AT TIME ZONE 'UTC' AT TIME ZONE 'Central Standard Time'`; Fabric: no `datetimeoffset` columns | `from_utc_timestamp(ts, 'America/Chicago')` |
| Filtered aggregate | `COUNT(*) FILTER (WHERE …)` | `SUM(CASE WHEN … THEN 1 ELSE 0 END)` | `COUNT(*) FILTER (WHERE …)` or `count_if` |
| Distinct count in a window | `COUNT(DISTINCT x) OVER (…)` | not allowed: spine join | not allowed: `size(collect_set(x)) OVER (…)` |
| Percentile | `quantile_cont(x, p)` | `PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY x) OVER (…)`; Fabric also `QUANTILE`, `MEDIAN` | `percentile(x, p)`, `percentile_approx` |
| Filter on a window | `QUALIFY` | SQL Server: subquery; Fabric Warehouse: `QUALIFY` | Databricks SQL: `QUALIFY`; otherwise a subquery |
| Date spine | `generate_series` | calendar table, `GENERATE_SERIES` (SQL Server 2022) | `sequence()` + `explode` |

*Other-engine syntax is reference only and was not executed in this deck; check the linked documentation for your version.*

> **On the job:** Metric definitions often move between engines: prototyped in DuckDB or a notebook, deployed to a Fabric Warehouse or Databricks. Re-test the zero-denominator, integer-division, and time-zone cases after every port; those are the three that silently change numbers.

> **The main idea:** the definition is portable; the syntax for division, time zones, windows, and percentiles is not. Port with tests.

*Read more:* [T-SQL: / (divide)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/divide-transact-sql), [T-SQL: AT TIME ZONE](https://learn.microsoft.com/en-us/sql/t-sql/queries/at-time-zone-transact-sql), [T-SQL: OVER clause (no DISTINCT)](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-over-clause-transact-sql), [Fabric Warehouse: T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area), [Spark SQL: ANSI compliance](https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html), [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html).

---

<a id="slide-33"></a>
## 33. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| A/B test | A randomised comparison of a control and a treatment group on predefined metrics. |
| Additive / semi-additive / non-additive | Can be summed over every dimension / over all but time / not at all (ratios, distinct counts, percentiles). |
| AOV | Average order value: a sales amount ÷ number of orders, over the same orders. |
| As known at | A number computed only from data that had arrived by a cutoff time. |
| Attribution date | The timestamp that places a fact in a period (order date, refund date, promise date). |
| Bot policy | The written rule that identifies non-human traffic (user-agent list plus behaviour rules). |
| Bridge (reconciliation) | A step-by-step explanation from one number to another, one rule per step, ending exactly on the target. |
| Business decision | The action a metric informs; written first on the spec card. |
| Censoring (right, left) | Outcomes not yet observed because data ends (right) or starts (left) mid-way. |
| Certified metric | A definition reviewed and endorsed by an owner; Power BI and Fabric mark models as Promoted or Certified. |
| Churn (logo, revenue) | Share of starting customers (logos) or starting MRR lost in a period. |
| Component table | A table that stores numerators and denominators (additive parts) instead of ratios. |
| Counter-metric / guardrail | A metric that must not degrade while another is optimised. |
| Date spine | A table with one row per calendar date, used to show empty periods. |
| Denominator / numerator | What a rate divides by / what it counts on top; the numerator is a subset of the denominator. |
| Distinct key | The column whose distinct values define the counted unit. |
| Event grain / entity grain | One row per thing that happened / one row per session, user, order. |
| Exclusions | Rows removed from every metric for a stated reason (staff, QA, cancelled). |
| GMV | Gross merchandise value: list value of everything sold on a platform. |
| Goodhart’s law | When a measure becomes a target, it ceases to be a good measure. |
| Half-open interval | `start ≤ t < end`; every instant belongs to exactly one period. |
| Input / output metric | Something a team can act on directly / the result those inputs produce. |
| Late-arriving event | An event that reaches the warehouse long after it happened. |
| Leading / lagging indicator | Moves before / after the outcome it relates to. |
| Maturity | A period or cohort is mature when every unit has had its full outcome window. |
| Metric | A number computed by a precise, repeatable rule from data, used to make a decision. |
| Metric spec card | A short structured definition of a metric: the fields in lesson 5. |
| Metric tree | An exact formula of an output metric in terms of drivers, broken down level by level. |
| Mix effect / rate effect | Change in a blended rate caused by changing weights / by changing segment rates. |
| MRR, MRR bridge | Monthly recurring revenue at a point in time; its change split into new, expansion, contraction, churn. |
| North star metric | The one metric a team optimises because it best captures customer value and leads results. |
| Observation limit | The edge of what the data can show: incomplete periods and outcomes not yet observed. |
| Population | The set of units eligible to be counted: the denominator. |
| Re-aggregation | Computing a metric at a coarser grain from a finer one. |
| Restatement | A published number changing later because new data arrived. |
| Semantic layer | Metric definitions stored as code, generating SQL for any grain (dbt Semantic Layer, Power BI semantic models). |
| Simpson’s paradox | A trend in every segment reverses in the total because the mix changed. |
| SRM | Sample ratio mismatch: an experiment’s split differs from the design, so results can’t be trusted. |
| Take rate | Marketplace revenue ÷ third-party GMV, as a ratio of sums. |
| Time window | The period a metric covers: a calendar period or a rolling window. |
| Vanity metric | A number that looks good but informs no decision. |
| Zero denominator | A segment with no eligible units; its rate is NULL, not 0. |

> **The main idea:** if a term on a dashboard is not in a glossary like this one, with a spec card behind it, it is not yet a metric.

---

<a id="slide-34"></a>
## 34. Recap and practice plan

*Reference · what to remember*

1. A metric is a decision plus a precise counting rule. Write the spec card before the SQL, with the person who asked.
2. Population is the denominator; the numerator is a filter of the same rows at the same grain and distinct key.
3. Periods are local, storage is UTC; use IANA zones and half-open intervals; test a DST day and a month end.
4. Name the attribution date and whether history restates; store arrival time to answer “as known at”.
5. Exclusions, bot rules, and de-duplication live once, in a tested base layer.
6. Zero denominators give NULL; integer division and divide-by-zero differ between engines.
7. Report only complete periods and mature cohorts; mask the rest.
8. Store numerators and denominators; overall rates are ratios of sums; distinct counts and percentiles are recomputed, never added or averaged.
9. North star plus guardrails; inputs and leading indicators to manage, lagging outputs to judge; trees to explain moves.
10. Govern metrics as code with owners, versions, certification, and reconciliation bridges.

#### Practice plan (one week)

- Day 1: redo exercises 1–3 from memory; write the spec card for a metric at your current job.
- Day 2: exercises 4–5 aloud, as if in an interview, with a timer.
- Day 3: exercise 6; then the three interview answers aloud.
- Day 4: port exercises 1 and 3 to T-SQL or Spark SQL with the dialect cheat sheet, and re-test the edge cases.
- Day 5: pick one metric from a dashboard you use and fill all 17 spec-card fields; note every field nobody had decided.

#### Further practice

- [DataLemur: active user retention](https://datalemur.com/questions/user-retention) (SQL screen practice on distinct counts and windows).
- [SQLPad: investigating a metric drop](https://sqlpad.io/tutorial/data-analyst-case-interview-investigate-metric-drop/) (case structure; the *Diagnosing metric changes* deck covers it).
- Pick any public company’s quarterly report and write spec cards for two of its KPIs: you will find the definitions in footnotes.

> **The main idea:** define first, then build from a clean base with components, then combine metrics into a system you can govern. Deck 3 (Diagnosing metric changes) uses all of it to explain moves.

---

<a id="slide-35"></a>
## 35. References and how this deck was tested

*References · official documentation and what to read there*

| Source | What to read there |
|---|---|
| [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz) | `AT TIME ZONE`, ICU, how session time zones affect display. |
| [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [FILTER](https://duckdb.org/docs/stable/sql/query_syntax/filter) | `COUNT(DISTINCT)`, `quantile_cont`, `median`, `corr`, filtered aggregates. |
| [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify) | Frames with `RANGE … INTERVAL`, distinct window aggregates. |
| [DuckDB: GROUPING SETS](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view) | Multi-grain roll-ups, reusable expressions, the base layer. |
| [DuckDB: numeric operators](https://duckdb.org/docs/stable/sql/functions/numeric) | `/` vs `//`, division by zero. |
| [T-SQL: AT TIME ZONE](https://learn.microsoft.com/en-us/sql/t-sql/queries/at-time-zone-transact-sql), [divide](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/divide-transact-sql), [NULLIF](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/nullif-transact-sql), [OVER](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-over-clause-transact-sql) | Windows zone names, integer division, the no-DISTINCT-in-OVER limitation. |
| [Fabric Warehouse: T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area) | What Fabric Warehouse supports (QUALIFY, MEDIAN, QUANTILE) and what it doesn’t. |
| [Spark SQL: ANSI compliance](https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html), [built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html) | Division-by-zero behaviour, `try_divide`, `percentile`, `from_utc_timestamp`. |
| [dbt Semantic Layer](https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-sl), [MetricFlow](https://docs.getdbt.com/docs/build/about-metricflow), [ratio metrics](https://docs.getdbt.com/docs/build/ratio) | Metrics as code: simple, ratio, derived, cumulative metrics; time spines. |
| [Power BI semantic models](https://learn.microsoft.com/en-us/power-bi/connect-data/service-datasets-understand), [DAX DIVIDE](https://learn.microsoft.com/en-us/dax/divide-function-dax), [Fabric endorsement](https://learn.microsoft.com/en-us/fabric/governance/endorsement-overview) | Measures, safe division, promoted and certified content. |
| [Kimball: additive, semi-additive, non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/) | Why ratios and balances need special roll-up rules. |
| [Amplitude: north star metric](https://amplitude.com/blog/product-north-star-metric), [leading vs lagging](https://amplitude.com/blog/map-your-metrics) | North star selection and metric trees in practice. |
| [IAB/ABC spiders and bots list](https://www.iab.com/guidelines/iab-abc-international-spiders-bots-list/) | The industry list behind user-agent bot rules. |
| [Microsoft ExP](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/), [Goodhart’s law](https://en.wikipedia.org/wiki/Goodhart%27s_law), [Simpson’s paradox](https://en.wikipedia.org/wiki/Simpson%27s_paradox), [censoring](https://en.wikipedia.org/wiki/Censoring_%28statistics%29) | Experiment guardrails and SRM; the statistics behind traps in this series. |
| [IANA time zone database](https://www.iana.org/time-zones), [Python zoneinfo](https://docs.python.org/3/library/zoneinfo.html) | Where daylight-saving rules come from; why Windows needs `tzdata`. |

**How this deck was tested:** DuckDB 1.5.6 on CPython 3.12.10 (pandas 3.0.6 for loading), Windows 11. Every DuckDB query and Python block ran during the build; the build fails on any error, unexpected result, or unordered multi-row result. T-SQL, Fabric Warehouse, Spark SQL, dbt YAML, and DAX snippets are reference only. Interview patterns were researched in October 2026; all questions are original.

> **The main idea:** official documentation for the syntax, the spec card for the meaning: you need both for every metric.

---

<a id="slide-36"></a>
## 36. Appendix: the Leafy data generator (spoilers for the WBR lab)

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
### Hint 1 · Daily orders on Leafy’s calendar (find the bug)

Chicago is UTC−6 only until the daylight-saving change on 8 March. Which orders does a fixed offset put on the wrong day after that? Use the `local_ts` macro.

<a id="hint-2"></a>
### Hint 2 · Predict before you run: sums of distinct counts and means of rates

(a) Who is counted more than once in a sum of days? (b) When are a plain mean and a weighted mean equal?

<a id="hint-3"></a>
### Hint 3 · Android conversion with a date spine and a zero day

Generate the days first, then `LEFT JOIN` the per-day components from `conversion_daily` (lesson 18); `COALESCE` the counts, `NULLIF` the denominator.

<a id="hint-4"></a>
### Hint 4 · “How many active users do we have?”

Use the spec-card fields: decision, unit, “active” action, window, exclusions, maturity. A board slide wants a stable, complete period. The active-user lesson in the *Business models and metrics* deck has the SQL shape.

<a id="hint-5"></a>
### Hint 5 · “What’s our conversion rate last month?”

The unit decides the number (lesson 8). Build (a) and (b) from the base views, (c) from `events`, and keep February in Chicago time.

<a id="hint-6"></a>
### Hint 6 · A north star and guardrails for Leafy Plus

Ask what value a member gets (perks used when shopping), make it a weekly distinct count of people, and pick guardrails that catch “wins” bought with discounts or churn.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Daily orders on Leafy’s calendar (find the bug)

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

def per_day(day_expr):
    return dict(con.execute(f"""
        SELECT {day_expr} AS day, COUNT(*) FROM orders
        WHERE status = 'completed'
          AND {day_expr} BETWEEN DATE '2026-03-08' AND DATE '2026-03-14'
        GROUP BY day""").fetchall())

wrong = per_day("(placed_at_utc - INTERVAL 6 HOUR)::DATE")
fixed = per_day("local_ts(placed_at_utc)::DATE")
for day in sorted(fixed):
    flag = "  <- differs" if wrong.get(day) != fixed[day] else ""
    print(day, "fixed", fixed[day], "colleague", wrong.get(day), flag)

differs = [d for d in fixed if wrong.get(d) != fixed[d]]
assert differs, "expected at least one wrong day"
assert all(str(d) >= "2026-03-08" for d in differs)
# independent check: convert the same UTC timestamps with Python's zoneinfo
from collections import Counter
from datetime import timezone
from zoneinfo import ZoneInfo
chicago = ZoneInfo("America/Chicago")
utc_times = [t for (t,) in con.execute("SELECT placed_at_utc FROM orders WHERE status = 'completed'").fetchall()]
py_days = Counter(t.replace(tzinfo=timezone.utc).astimezone(chicago).date() for t in utc_times)
assert all(fixed[d] == py_days[d] for d in fixed)
print("days that were wrong:", [str(d) for d in sorted(differs)])
```

Output:

```text
2026-03-08 fixed 51 colleague 53   <- differs
2026-03-09 fixed 32 colleague 31   <- differs
2026-03-10 fixed 33 colleague 33 
2026-03-11 fixed 38 colleague 39   <- differs
2026-03-12 fixed 40 colleague 39   <- differs
2026-03-13 fixed 49 colleague 52   <- differs
2026-03-14 fixed 53 colleague 49   <- differs
days that were wrong: ['2026-03-08', '2026-03-09', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14']
```

**Why it works.** From 8 March Chicago is UTC−5, so orders placed between 00:00 and 01:00 local time are pushed to the previous day by the fixed −6 h offset; on most days a few orders move from one day to the day before. `local_ts` uses the IANA zone, which knows the switch. **Common wrong answer:** “use UTC dates”, which is wrong for every order placed after 18:00 or 19:00 local time. **Interviewer follow-up:** “What about the 23-hour day?” → day-level counts are fine, but per-hour averages for 8 March must divide by 23, not 24 (lesson 10).

<a id="solution-2"></a>
### Solution 2 · Predict before you run: sums of distinct counts and means of rates

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

week = "session_date BETWEEN DATE '2026-03-09' AND DATE '2026-03-15'"
sum_dau, wau = con.execute(f"""
    SELECT (SELECT SUM(n) FROM (SELECT COUNT(DISTINCT user_id) AS n FROM customer_sessions
                                WHERE {week} AND user_id IS NOT NULL GROUP BY session_date)),
           COUNT(DISTINCT user_id)
    FROM customer_sessions WHERE {week} AND user_id IS NOT NULL""").fetchone()
mean_rate, weekly_rate = con.execute(f"""
    SELECT AVG(p / s), SUM(p) / SUM(s)
    FROM (SELECT session_date, COUNT(*) FILTER (WHERE purchased) AS p, COUNT(*) AS s
          FROM customer_sessions WHERE {week} GROUP BY session_date)""").fetchone()
print("sum of daily DAU", sum_dau, "| WAU", wau)
print(f"mean of daily rates {mean_rate:.4f} | weekly rate {weekly_rate:.4f}")
assert sum_dau > wau
assert abs(mean_rate - weekly_rate) > 1e-6
```

Output:

```text
sum of daily DAU 1254 | WAU 733
mean of daily rates 0.1489 | weekly rate 0.1488
```

**Why.** (a) Anyone active on several days is counted once per day in the sum but once in WAU, so the sum is larger whenever anyone comes back. (b) The weekly rate weights each day by its sessions; the plain mean weights days equally. They are equal only if every day has the same number of sessions (or the same rate). Here the gap is tiny because Leafy’s daily traffic is even; across uneven segments, such as sellers (the take-rate exercise in the *Business models and metrics* deck), it is large. **Common wrong answer:** “they’re close, so it doesn’t matter”: with uneven days or segments the gap can be large and even flip trends (Simpson’s paradox, *Diagnosing metric changes* deck). **Interviewer follow-up:** “Can the mean of rates ever be the right number?” → yes, for “the typical day/store”; name it so.

<a id="solution-3"></a>
### Solution 3 · Android conversion with a date spine and a zero day

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

rows = con.execute("""
    SELECT d.day,
           COALESCE(c.sessions, 0)  AS sessions,
           COALESCE(c.purchases, 0) AS purchases,
           ROUND(COALESCE(c.purchases, 0) / NULLIF(COALESCE(c.sessions, 0), 0), 4) AS conversion
    FROM (SELECT UNNEST(generate_series(DATE '2026-03-01', DATE '2026-03-07', INTERVAL 1 DAY))::DATE AS day) d
    LEFT JOIN conversion_daily c ON c.day = d.day AND c.platform = 'android'
    ORDER BY d.day""").fetchall()
for r in rows:
    print(*r)
week_rate = sum(r[2] for r in rows) / sum(r[1] for r in rows)
print(f"7-day conversion from components: {week_rate:.4f}")

assert len(rows) == 7
outage = [r for r in rows if str(r[0]) == "2026-03-03"][0]
assert outage[1] == 0 and outage[3] is None
assert all(r[3] is not None for r in rows if r[1] > 0)
```

Output:

```text
2026-03-01 86 11 0.1279
2026-03-02 68 17 0.25
2026-03-03 0 0 None
2026-03-04 78 9 0.1154
2026-03-05 83 15 0.1807
2026-03-06 72 7 0.0972
2026-03-07 100 12 0.12
7-day conversion from components: 0.1458
```

**Why it works.** The spine guarantees one row per day, so the outage is visible instead of missing; `NULLIF` turns the zero denominator into NULL, so the day has no rate rather than a fake 0 % or NaN. The 7-day rate is Σ purchases ÷ Σ sessions over the same rows; the zero day simply adds nothing. **Common wrong answer:** `COALESCE(conversion, 0)`, which reports the outage as 0 % conversion (bug clinic 1). **Interviewer follow-up:** “Run this in SQL Server” → replace the spine with a calendar table or recursive CTE, and write `purchases * 1.0 / NULLIF(sessions, 0)` to avoid integer division.

<a id="solution-4"></a>
### Solution 4 · “How many active users do we have?”

- **Clarifying questions:** What will the board decide or compare with this (growth trend, a target)? Active means what: any visit, a purchase, a Plus login? People or accounts/devices; do anonymous visitors count? Which window: day, week, 28 days, or month, and which week? Include Plus members only or all customers? Staff, test, and bots excluded, I assume? Compared with what: last week, last quarter? Does it need to match a number shown before?
- **Proposed spec:** “Weekly active customers (WAU): distinct signed-in customers with at least one customer session (no bots, staff, or QA) in the last complete Chicago week, Mon 16 – Sun 22 March. Alternatives shown: average DAU that week and 28-day MAU ending Sunday. Anonymous visitors excluded (can’t count people). Restates by under 1 % for late app events.”

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

wau, avg_dau, max_dau = con.execute("""
    WITH ud AS (SELECT DISTINCT session_date AS day, user_id FROM customer_sessions
                WHERE user_id IS NOT NULL
                  AND session_date BETWEEN DATE '2026-03-16' AND DATE '2026-03-22')
    SELECT COUNT(DISTINCT user_id),
           (SELECT ROUND(AVG(n), 1) FROM (SELECT COUNT(*) AS n FROM ud GROUP BY day)),
           (SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM ud GROUP BY day))
    FROM ud""").fetchone()
mau = con.execute("""
    SELECT COUNT(DISTINCT user_id) FROM customer_sessions
    WHERE user_id IS NOT NULL
      AND session_date BETWEEN DATE '2026-03-22' - 27 AND DATE '2026-03-22'""").fetchone()[0]
print("WAU, week of 16 March:", wau)
print("average DAU that week:", avg_dau, "| 28-day MAU ending 22 March:", mau)

# cross-check WAU with plain Python sets
people = {u for (u,) in con.execute("""SELECT user_id FROM customer_sessions WHERE user_id IS NOT NULL
                 AND session_date BETWEEN DATE '2026-03-16' AND DATE '2026-03-22'""").fetchall()}
assert len(people) == wau
assert mau >= wau >= max_dau
```

Output:

```text
WAU, week of 16 March: 763
average DAU that week: 184.6 | 28-day MAU ending 22 March: 1300
```

**Why it works.** The answer is a definition plus a number, with two context numbers so the board sees scale (daily vs monthly). The week is complete and the population excludes non-humans and staff. **Common wrong answer:** “Total registered users” (a stock of accounts, not activity) or “this week so far” on a Wednesday. **Interviewer follow-up:** “Marketing wants anonymous visitors included” → report “weekly visitors (sessions or devices)” as a separate metric; never mix people and devices in one count.

<a id="solution-5"></a>
### Solution 5 · “What’s our conversion rate last month?”

- **Questions:** conversion of what (sessions, people, sign-ups)? To what (any purchase, first purchase, Plus)? All platforms or one? Same session, or within N days? Bots and staff excluded? February in which time zone? Compared with which period?
- **Chosen spec:** session conversion = customer sessions in February (Chicago) with a purchase ÷ customer sessions; reported with user conversion as context because the decision (marketing budget) is about people.

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

feb = "BETWEEN DATE '2026-02-01' AND DATE '2026-02-28'"
s_num, s_den = con.execute(f"""SELECT COUNT(*) FILTER (WHERE purchased), COUNT(*)
                               FROM customer_sessions WHERE session_date {feb}""").fetchone()
u_num, u_den = con.execute(f"""
    SELECT COUNT(DISTINCT user_id) FILTER (WHERE user_id IN
               (SELECT user_id FROM clean_orders WHERE order_date {feb})),
           COUNT(DISTINCT user_id)
    FROM customer_sessions WHERE session_date {feb} AND user_id IS NOT NULL""").fetchone()
e_num, e_den = con.execute(f"""
    SELECT COUNT(*) FILTER (WHERE event_name = 'purchase'), COUNT(*) FILTER (WHERE event_name = 'session_start')
    FROM events WHERE local_ts(event_at_utc)::DATE {feb}""").fetchone()
readings = {"a) session": (s_num, s_den), "b) user": (u_num, u_den), "c) raw events": (e_num, e_den)}
for name, (n, d) in readings.items():
    print(f"{name:<14} {n:>5} / {d:>6} = {n / d:.4f}")

assert s_num <= s_den and u_num <= u_den
assert all(0 < n / d < 1 for n, d in readings.values())
assert u_num / u_den > s_num / s_den
```

Output:

```text
a) session      1119 /   7292 = 0.1535
b) user          567 /   1099 = 0.5159
c) raw events   1176 /   8202 = 0.1434
```

**Why it works.** Each reading has one unit on both sides and the same February window. The raw event ratio mixes bots, staff, and duplicates, so it is lower and not a definition anyone should publish. **Common wrong answer:** orders ÷ all users (a population that includes people who never visited), or purchase events ÷ distinct sessions (mixed units, lesson 9). **Interviewer follow-up:** “Now within 7 days of first visit” → a user funnel with a window and maturity (funnels, *Business models and metrics* deck): February cohorts are mature by 7 March.

<a id="solution-6"></a>
### Solution 6 · A north star and guardrails for Leafy Plus

- **North star:** weekly engaged members = paying Plus members (at the week’s end, no staff) who had at least one customer session that week. Leading for renewal; hard to inflate without real use.
- **Guardrails:** monthly logo churn (*Business models and metrics* deck); mature trial conversion (lesson 15); refund rate of members’ orders (a perk can’t be abused).

```python
import duckdb
con = duckdb.connect("leafy.duckdb")

rows = con.execute("""
    WITH weeks AS (SELECT UNNEST(generate_series(DATE '2026-02-02', DATE '2026-03-16', INTERVAL 7 DAY))::DATE AS week),
    members AS (
        SELECT w.week, p.user_id
        FROM weeks w JOIN plus_periods p
          ON p.valid_from <= w.week + 7 AND (p.valid_to IS NULL OR p.valid_to > w.week + 7)
        WHERE p.plan <> 'staff'
    )
    SELECT m.week,
           COUNT(DISTINCT m.user_id)                                             AS paying_members,
           COUNT(DISTINCT m.user_id) FILTER (WHERE m.user_id IN (
               SELECT user_id FROM customer_sessions
               WHERE session_date >= m.week AND session_date < m.week + 7))      AS engaged_members
    FROM members m
    GROUP BY m.week
    ORDER BY m.week""").fetchall()
for r in rows:
    print(*r)
assert len(rows) == 7
assert all(0 < r[2] <= r[1] for r in rows)
```

Output:

```text
2026-02-02 93 41
2026-02-09 102 45
2026-02-16 113 56
2026-02-23 123 61
2026-03-02 134 57
2026-03-09 145 58
2026-03-16 152 70
```

**Why it works.** The metric measures members actually using the product, which predicts renewal better than the member count, and it can’t be raised by discounting sign-ups alone. Guardrails watch the two easy ways to “win”: buying members who churn, and perks that cost more than they earn. **Common wrong answer:** MRR as the north star: it is an output that lags and can be pushed by annual-plan discounts. **Interviewer follow-up:** “Engagement could be gamed with emails” → require a session with a product view or purchase, and watch email unsubscribes as a guardrail.
