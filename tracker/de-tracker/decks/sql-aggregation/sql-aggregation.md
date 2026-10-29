# SQL aggregation: counts, subtotals, pivots, and percentiles

*Companion to `sql-aggregation.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package, CPython 3.12.10, Windows 11). Queries are written in PostgreSQL-flavoured standard SQL; DuckDB-only syntax is labelled, and lessons have dialect notes for PostgreSQL, SQL Server (T-SQL), Spark SQL, Snowflake, and BigQuery. Every SQL query in this document was executed in DuckDB while it was built, and the result shown under it is the real result. Other-dialect syntax appears only in the dialect tables and was not executed. Timing figures are labelled as measured on the build machine; yours will differ.

**Prerequisites:** the *Window functions* deck (its six-row `orders` table is reused here) and the dimensional modeling decks (grain, fan-out, bridge tables). This deck is one half of the former SQL correctness deck; the other half is *SQL correctness: joins, grain, and NULLs*. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note. The exercises follow common SQL interview patterns (fan-out, outer-join filters, NOT IN with NULL, as-of joins, conditional aggregation, subtotals, pivots, percentiles), researched in October 2026.

**Additions beyond the original brief** are marked *(added)*: WHERE vs HAVING vs QUALIFY with deterministic tie-breakers; integer division and NULLIF in ratios; distinct counts and percentiles are not additive; a grain-first interview routine; a dialect cheat sheet.

## Contents

1. [SQL aggregation: counts, subtotals, pivots, percentiles](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, engine, and dialect](#slide-2)
3. [The SQL lab: six orders and their neighbours](#slide-3)
4. [Five words that prevent most wrong totals](#slide-4)
5. [COUNT(*), COUNT(column), COUNT(DISTINCT …)](#slide-5)
6. [Conditional aggregation with CASE](#slide-6)
7. [The FILTER clause, and why not WHERE](#slide-7)
8. [WHERE, HAVING, QUALIFY: filter at the right stage](#slide-8)
9. [Weighted ratios: ratio of sums, not average of ratios](#slide-9)
10. [UNION vs UNION ALL, and columns matched by position](#slide-10)
11. [INTERSECT, EXCEPT, and EXCEPT ALL for diffs](#slide-11)
12. [GROUPING SETS, ROLLUP, and CUBE](#slide-12)
13. [GROUPING() and GROUPING_ID: label every level](#slide-13)
14. [Pivot: rows to columns](#slide-14)
15. [Unpivot: columns to rows, and the NULLs it drops](#slide-15)
16. [Percentiles and medians: continuous vs discrete](#slide-16)
17. [Approximate distinct counts: measured trade-offs](#slide-17)
18. [Distinct counts don’t add up](#slide-18)
19. [A grain-first routine for SQL interviews](#slide-19)
20. [Bug clinic: believable queries, wrong answers](#slide-20)
21. [Exercises 1–3: aggregation](#slide-21)
22. [Cheat sheet](#slide-22)
23. [Dialect cheat sheet](#slide-23)
24. [Glossary](#slide-24)
25. [Recap: what to remember](#slide-25)
26. [References and how this deck was tested](#slide-26)
27. [Appendix A · Hints](#appendix-a)
28. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. SQL aggregation: counts, subtotals, pivots, percentiles

**

GROUP BY is easy; the right aggregate at the right level is not. This deck covers the aggregation tools interviewers and finance teams care about, with a believable wrong query, its real result, and the fix for each.

Every query in this deck ran in DuckDB while the deck was built. The result under each query is the real result.

- **Part A · counting and filtering:** COUNT variants, CASE, FILTER, WHERE vs HAVING vs QUALIFY. Several filtered totals in one pass, at the right stage
- **Part B · ratios and sets:** Weighted ratios, UNION vs UNION ALL, INTERSECT and EXCEPT. Ratio of sums, and set operations that keep duplicates
- **Part C · reporting shapes:** GROUPING SETS, ROLLUP, CUBE, GROUPING(), pivot, unpivot. Subtotals you can label, columns you can reconcile
- **Part D · distributions:** Percentiles, approximate distinct, non-additive counts. Then an interview routine, bug clinic and 3 exercises

**Additions beyond the brief** (marked (added)): WHERE vs HAVING vs QUALIFY with deterministic tie-breakers; integer division and NULLIF in ratios; distinct counts and percentiles are not additive; a grain-first interview routine; a dialect cheat sheet.

**Part of a split series.** This deck is one lesson of the former “SQL correctness: joins, grain, NULLs, and aggregation” deck. Sibling deck: *SQL correctness: joins, grain, and NULLs*. Both reuse the same lab tables, so lesson 3 appears in each.

**Companion:** the Markdown version (Markdown ↗) has the same lessons; hints and solutions are in its appendices. Use Contents to jump, Read for article mode.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Reports are aggregates: counts, rates, subtotals, medians, unique users. Each has a trap that returns a plausible wrong number: a COUNT that counts the wrong thing, an average of ratios, a subtotal row summed again, daily unique users added into a monthly figure. This deck gives you the tools and the rules to get them right.

#### Where you will use it

- KPI and finance reports with several filtered totals per row.
- Subtotal and grand-total reports (ROLLUP) and pivoted exports.
- Product metrics: medians, p95 latency, daily and monthly active users.

#### What goes wrong without it

- Rates that disagree with finance because ratios were averaged.
- A grand total counted twice because subtotal rows were summed.
- Monthly active users 2–3× too high because daily counts were added.

#### Who expects you to know it

- Data engineers and BI developers who define metrics.
- Interviewers: conditional aggregation, pivots and percentiles are frequent medium-level questions.

> **On the job:** Finance asks for revenue by region with subtotals and a grand total, plus the share of card payments. You write one GROUP BY ROLLUP with GROUPING() labels and a ratio of sums, and reconcile the grand total with the source before sending it.

> **The main idea:** the right aggregate at the right level, with labelled subtotals and recomputed non-additive measures, is what makes reports reconcile.

*Read more:* [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [DuckDB: GROUPING SETS, ROLLUP, CUBE](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Several filtered totals side by side | SUM(CASE …) or FILTER (WHERE …) | One pass, no extra joins |
| Subtotals and a grand total | GROUPING SETS / ROLLUP + GROUPING() | Labelled levels, no double counting |
| Overall rate or average price | SUM(num) / NULLIF(SUM(den), 0) | Average of ratios weights rows wrongly |
| Median or p95 | percentile_cont / percentile_disc | Averages hide skew; percentiles are not additive |
| Unique users at scale, approximate is fine | approx_count_distinct / HLL sketches | Fast and mergeable; never for reconciled totals |

#### How interviews test it

- “Count orders and orders over 40 per customer in one query.”
- “Pivot revenue per product into columns” and “now add a total row”.
- “Median order value per region”: cont vs disc?
- “Why can’t I add daily active users to get monthly?”

#### Where it sits in your learning path

- Builds on: SQL correctness: joins, grain, and NULLs.
- Next: time-based analysis (cohorts, retention, funnels) and business metrics.
- Later: semantic layers, where every measure declares how it aggregates.

> **The main idea:** pick the aggregate by the question, compute it at the right level, and recompute anything that is not additive.

---

<a id="slide-2"></a>
## 2. Set up, engine, and dialect

*Start here · DuckDB from Python, PostgreSQL-flavoured SQL*

| Item | Detail |
|---|---|
| Tested engine | **DuckDB 1.5.6** (Python package) on CPython 3.12.10, Windows 11. DuckDB is an embedded analytical database: it runs inside your Python process, with no server. |
| Dialect | **PostgreSQL-flavoured standard SQL.** DuckDB follows PostgreSQL closely. DuckDB-only syntax (`SEMI JOIN`, `ASOF JOIN`, `PIVOT`, `QUALIFY`, `UNION BY NAME`) is labelled where used. |
| Dialect notes | Each lesson ends with notes for PostgreSQL, SQL Server (T-SQL), Spark SQL, Snowflake, and BigQuery where they differ. That syntax is reference only and was not executed. |
| How results were produced | The build script runs every query in DuckDB and prints the real result under it. If any query fails, returns a result different from the numbers in the text, or returns several rows without `ORDER BY`, the build reports a failure. This deck built with **0 failures**. |
| Display | `NULL` is shown as `NULL`. Long decimals are shown with up to 10 significant digits. Timings are labelled as measured on the build machine. |

#### Run the lab yourself

```text
# Windows (PowerShell); on macOS/Linux use: source .venv/bin/activate
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb
```

Then open a DuckDB connection in Python and paste the lab script from the next slide. You can also use the DuckDB command-line client.

#### Check it

```python
import duckdb
con = duckdb.connect()          # in-memory database
print(duckdb.__version__)
print(con.sql("SELECT 1 + 1 AS two").fetchall())
```

Output:

```text
1.5.6
[(2,)]
```

> **On the job:** DuckDB is a good scratchpad for interview practice and for testing warehouse SQL logic locally. Most of the logic in this deck transfers unchanged to Postgres, Snowflake, BigQuery, Databricks, or Fabric; the dialect notes cover the differences.

> **The main idea:** every claim in this deck comes from a query that ran. Do the same when you practise: tiny tables, predict the answer, then run it.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: PostgreSQL compatibility](https://duckdb.org/docs/stable/sql/dialect/postgresql_compatibility), [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html).

---

<a id="slide-3"></a>
## 3. The SQL lab: six orders and their neighbours

*Start here · reuse the six orders, add the tables around them*

The six `orders` rows are the same ones used in the window-functions deck. Around them are small tables with deliberate traps: some orders have several items or payments, one order has no payment, one customer has no orders, one region is unknown (`NULL`), and one support ticket has no order.

**Create script**

```sql
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer VARCHAR, order_date DATE, amount INTEGER);
INSERT INTO orders VALUES
  (1, 'Maya', '2026-01-03', 25), (2, 'Maya', '2026-01-05', 40), (3, 'Leo', '2026-01-05', 40),
  (4, 'Maya', '2026-01-09', 15), (5, 'Leo',  '2026-01-10', 60), (6, 'Ana', '2026-01-10', 40);

CREATE TABLE customers (customer VARCHAR PRIMARY KEY, region VARCHAR);
INSERT INTO customers VALUES ('Maya', 'West'), ('Leo', 'East'), ('Ana', NULL), ('Zoe', 'West');

CREATE TABLE order_items (order_id INTEGER, line_no INTEGER, sku VARCHAR, qty INTEGER, unit_price INTEGER,
                          PRIMARY KEY (order_id, line_no));
INSERT INTO order_items VALUES
  (1, 1, 'MUG', 1, 25),
  (2, 1, 'MUG', 1, 25), (2, 2, 'TEA', 1, 15),
  (3, 1, 'TEA', 1, 15), (3, 2, 'SPOON', 5, 5),
  (4, 1, 'TEA', 1, 15),
  (5, 1, 'KIT', 1, 45), (5, 2, 'TEA', 1, 15),
  (6, 1, 'MUG', 1, 25), (6, 2, 'TEA', 1, 15);

CREATE TABLE payments (payment_id INTEGER PRIMARY KEY, order_id INTEGER, paid_on DATE, method VARCHAR, amount INTEGER);
INSERT INTO payments VALUES
  (101, 1, '2026-01-03', 'card', 25), (102, 2, '2026-01-05', 'card', 30), (103, 2, '2026-01-06', 'gift_card', 10),
  (104, 3, '2026-01-05', 'card', 40), (105, 4, '2026-01-09', NULL, 15),  (106, 5, '2026-01-11', 'card', 60);

CREATE TABLE support_tickets (ticket_id INTEGER PRIMARY KEY, order_id INTEGER);   -- 902 is a general question
INSERT INTO support_tickets VALUES (901, 2), (902, NULL), (903, 5);

CREATE TABLE tier_history (customer VARCHAR, tier VARCHAR, valid_from DATE);
INSERT INTO tier_history VALUES
  ('Maya', 'Silver', '2025-12-01'), ('Maya', 'Gold', '2026-01-05'),
  ('Leo', 'Silver', '2026-01-06'), ('Ana', 'Bronze', '2025-11-20');

CREATE TABLE promo_periods (promo VARCHAR, start_date DATE, end_date DATE);   -- end_date is exclusive
INSERT INTO promo_periods VALUES ('NEWYEAR', '2026-01-01', '2026-01-05'), ('WINTER', '2026-01-05', '2026-02-01');

CREATE TABLE targets (customer VARCHAR, jan INTEGER, feb INTEGER, mar INTEGER);   -- NULL = not set yet
INSERT INTO targets VALUES ('Maya', 80, 90, 100), ('Leo', 100, NULL, 120), ('Ana', 40, 40, NULL);
```

**orders**

```sql
SELECT * FROM orders ORDER BY order_id;
```

Result (6 rows):

| order_id | customer | order_date | amount |
|---|---|---|---|
| 1 | Maya | 2026-01-03 | 25 |
| 2 | Maya | 2026-01-05 | 40 |
| 3 | Leo | 2026-01-05 | 40 |
| 4 | Maya | 2026-01-09 | 15 |
| 5 | Leo | 2026-01-10 | 60 |
| 6 | Ana | 2026-01-10 | 40 |

**customers**

```sql
SELECT * FROM customers ORDER BY customer;
```

Result (4 rows):

| customer | region |
|---|---|
| Ana | NULL |
| Leo | East |
| Maya | West |
| Zoe | West |

**order_items**

```sql
SELECT * FROM order_items ORDER BY order_id, line_no;
```

Result (10 rows):

| order_id | line_no | sku | qty | unit_price |
|---|---|---|---|---|
| 1 | 1 | MUG | 1 | 25 |
| 2 | 1 | MUG | 1 | 25 |
| 2 | 2 | TEA | 1 | 15 |
| 3 | 1 | TEA | 1 | 15 |
| 3 | 2 | SPOON | 5 | 5 |
| 4 | 1 | TEA | 1 | 15 |
| 5 | 1 | KIT | 1 | 45 |
| 5 | 2 | TEA | 1 | 15 |
| 6 | 1 | MUG | 1 | 25 |
| 6 | 2 | TEA | 1 | 15 |

**payments**

```sql
SELECT * FROM payments ORDER BY payment_id;
```

Result (6 rows):

| payment_id | order_id | paid_on | method | amount |
|---|---|---|---|---|
| 101 | 1 | 2026-01-03 | card | 25 |
| 102 | 2 | 2026-01-05 | card | 30 |
| 103 | 2 | 2026-01-06 | gift_card | 10 |
| 104 | 3 | 2026-01-05 | card | 40 |
| 105 | 4 | 2026-01-09 | NULL | 15 |
| 106 | 5 | 2026-01-11 | card | 60 |

**the rest**

```sql
SELECT * FROM support_tickets ORDER BY ticket_id;
```

Result (3 rows):

| ticket_id | order_id |
|---|---|
| 901 | 2 |
| 902 | NULL |
| 903 | 5 |

```sql
SELECT * FROM tier_history ORDER BY customer, valid_from;
```

Result (4 rows):

| customer | tier | valid_from |
|---|---|---|
| Ana | Bronze | 2025-11-20 |
| Leo | Silver | 2026-01-06 |
| Maya | Silver | 2025-12-01 |
| Maya | Gold | 2026-01-05 |

```sql
SELECT * FROM promo_periods ORDER BY start_date;
```

Result (2 rows):

| promo | start_date | end_date |
|---|---|---|
| NEWYEAR | 2026-01-01 | 2026-01-05 |
| WINTER | 2026-01-05 | 2026-02-01 |

```sql
SELECT * FROM targets ORDER BY customer;
```

Result (3 rows):

| customer | jan | feb | mar |
|---|---|---|---|
| Ana | 40 | 40 | NULL |
| Leo | 100 | NULL | 120 |
| Maya | 80 | 90 | 100 |

#### Numbers to keep in mind

Order revenue: Maya 25 + 40 + 15 = **80**, Leo 40 + 60 = **100**, Ana **40**, total **220**. Items add up to each order amount exactly. Payments total **180**: order 2 is paid in two parts and order 6 is unpaid.

#### Why so small?

Every wrong answer in this deck can be checked by hand. That is the point: a **counterexample** is a small input that proves a query wrong. In interviews and code reviews, inventing one is faster than arguing.

> **The main idea:** keep a tiny, tricky dataset: duplicates on the many side, a missing child, a NULL, and an orphan. Most SQL bugs show up on four rows.

---

<a id="slide-4"></a>
## 4. Five words that prevent most wrong totals

*Start here · grain, key, cardinality, fan-out, control total*

| Term | Meaning | In the lab |
|---|---|---|
| **Grain** | What one row represents. Say it as “one row per …”. | `orders`: one row per order. `order_items`: one row per order line. `payments`: one row per payment. |
| **Key** | Columns whose values are unique per row at that grain. A **foreign key** is a column that points to another table’s key. | `order_items` key is `(order_id, line_no)`; its `order_id` is a foreign key to `orders`. |
| **Cardinality** | How many rows on each side can match: one-to-one (1:1), one-to-many (1:N), many-to-many (N:M). | orders → order_items is 1:N. customers → orders is 1:N. order_items ↔ payments (through order_id) is N:M. |
| **Fan-out** | A join that repeats rows from one side, once per match on the other. Measures on the repeated side then get counted several times. | Joining orders to items repeats order 2’s amount twice. |
| **Control total** | A trusted total from the source (row count, sum of amounts) that every downstream result must reconcile to. | Revenue = 220. Payments = 180. |

#### How each lesson works

- **Question:** a realistic business question.
- **Believable, but wrong:** a query a competent person might write, and its real result.
- **Why:** the rule it broke.
- **Fixed:** a correct query and its real result.
- **Dialect notes** and an **On the job** note.

#### The one habit

Before writing a join, say the grain of every input and the grain you want out. Before trusting a result, compare it to a control total.

> **On the job:** Data engineers own the tables that dashboards and finance reports sum. A fan-out bug in a shared model can double a KPI for every consumer at once. Teams protect themselves with grain tests (dbt `unique` tests, for example) and reconciliation checks in the pipeline.

> **The main idea:** grain first, then keys, then cardinality. If you can state those three, you can predict a join’s row count and spot fan-out before it happens.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-5"></a>
## 5. COUNT(*), COUNT(column), COUNT(DISTINCT …)

*Aggregation · three different questions*

| Expression | Counts | Typical question |
|---|---|---|
| `COUNT(*)` | Rows, including rows full of NULLs | How many rows are in this group? |
| `COUNT(col)` | Rows where `col` is not NULL | How many matched / filled-in rows? |
| `COUNT(DISTINCT col)` | Distinct non-NULL values | How many different customers / days? |
| `COUNT(1)` | Same as `COUNT(*)` | No speed difference in modern engines |

#### ✗ Believable, but wrong

```sql
SELECT c.customer, COUNT(*) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer = c.customer
GROUP BY c.customer
ORDER BY c.customer;
```

Result (4 rows):

| customer | orders |
|---|---|
| Ana | 1 |
| Leo | 2 |
| Maya | 3 |
| Zoe | 1 |

Zoe has one order? No: the left join produced one row for her, full of NULLs, and `COUNT(*)` counted it.

#### ✓ Fixed

```sql
SELECT c.customer,
       COUNT(o.order_id)            AS orders,
       COUNT(DISTINCT o.order_date) AS order_days
FROM customers c
LEFT JOIN orders o ON o.customer = c.customer
GROUP BY c.customer
ORDER BY c.customer;
```

Result (4 rows):

| customer | orders | order_days |
|---|---|---|
| Ana | 1 | 1 |
| Leo | 2 | 2 |
| Maya | 3 | 3 |
| Zoe | 0 | 0 |

Count the right table’s key. `COUNT` never returns NULL, so Zoe gets an honest 0.

#### COUNT(DISTINCT) ignores NULL too

```sql
SELECT COUNT(*)                                   AS payment_rows,
       COUNT(DISTINCT method)                     AS methods,
       COUNT(DISTINCT COALESCE(method, '(none)')) AS methods_incl_missing
FROM payments;
```

Result (1 row):

| payment_rows | methods | methods_incl_missing |
|---|---|---|
| 6 | 2 | 3 |

If “missing” is a category you need to report, make it a value first.

#### In practice

> **On the job:** Data-quality dashboards often show `COUNT(*)` next to `COUNT(col)` for each important column: the difference is the NULL count. After a left join, `COUNT(right.key)` is the match count, a quick way to measure how many facts found their dimension row.

> **The main idea:** after an outer join, count the optional table’s key, not *. COUNT(DISTINCT) skips NULLs; decide if “missing” should count as a value.

*Read more:* [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-6"></a>
## 6. Conditional aggregation with CASE

*Aggregation · several filtered totals in one pass*

**Conditional aggregation** puts a `CASE` expression inside an aggregate, so one `GROUP BY` can produce several filtered totals side by side. **Question:** per customer, how many orders, and how many of them were 40 or more?

#### ✗ Believable, but wrong

```sql
SELECT customer,
       COUNT(*) AS orders,
       COUNT(CASE WHEN amount >= 40 THEN 1 ELSE 0 END) AS big_orders
FROM orders
GROUP BY customer
ORDER BY customer;
```

Result (3 rows):

| customer | orders | big_orders |
|---|---|---|
| Ana | 1 | 1 |
| Leo | 2 | 2 |
| Maya | 3 | 3 |

Maya has one order of 40+, not three. `COUNT` counts the 0s too: 0 is not NULL.

#### ✓ Fixed

```sql
SELECT customer,
       COUNT(*) AS orders,
       SUM(CASE WHEN amount >= 40 THEN 1 ELSE 0 END)      AS big_orders,
       COUNT(CASE WHEN amount >= 40 THEN 1 END)           AS big_orders_too,
       SUM(CASE WHEN amount >= 40 THEN amount ELSE 0 END) AS big_revenue
FROM orders
GROUP BY customer
ORDER BY customer;
```

Result (3 rows):

| customer | orders | big_orders | big_orders_too | big_revenue |
|---|---|---|---|---|
| Ana | 1 | 1 | 1 | 40 |
| Leo | 2 | 2 | 2 | 100 |
| Maya | 3 | 1 | 1 | 40 |

Either `SUM(… THEN 1 ELSE 0)` or `COUNT(… THEN 1 END)` (no ELSE, so non-matches are NULL and skipped).

#### Patterns

| Goal | Expression |
|---|---|
| count matching rows | `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` |
| sum matching amounts | `SUM(CASE WHEN cond THEN amount ELSE 0 END)` |
| distinct matching keys | `COUNT(DISTINCT CASE WHEN cond THEN customer END)` |
| share of rows | `AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)` |
| portable pivot | one CASE column per category (lesson 14) |

#### ELSE 0 or ELSE NULL?

For `SUM`, `ELSE 0` returns 0 for a group with no matches; no ELSE returns NULL. For `COUNT` and `AVG`, `ELSE 0` changes the answer, as the wrong query shows. Choose per function.

> **On the job:** Conditional aggregation is how wide reporting tables are built in one scan: revenue by channel, orders by status, events by type. It works in every SQL engine, which makes it the portable alternative to `FILTER` and `PIVOT`.

> **The main idea:** COUNT counts non-NULLs, so a CASE inside COUNT must produce NULL, not 0, for non-matches. SUM(CASE … 1 ELSE 0) is the safest form.

*Read more:* [PostgreSQL: CASE, COALESCE, NULLIF](https://www.postgresql.org/docs/current/functions-conditional.html), [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [DuckDB: CASE](https://duckdb.org/docs/stable/sql/expressions/case).

---

<a id="slide-7"></a>
## 7. The FILTER clause, and why not WHERE

*Aggregation · “total revenue and revenue from orders over 40”*

`aggregate(…) FILTER (WHERE cond)` is standard SQL for “aggregate only the rows where cond is true”. It does what `CASE` does, more readably. The common mistake is to put the condition in the query’s `WHERE`, which filters *every* column.

#### ✗ Believable, but wrong

```sql
SELECT customer,
       SUM(amount) AS revenue,
       SUM(amount) AS revenue_over_40
FROM orders
WHERE amount > 40
GROUP BY customer
ORDER BY customer;
```

Result (1 row):

| customer | revenue | revenue_over_40 |
|---|---|---|
| Leo | 60 | 60 |

Maya and Ana vanished, and Leo’s total revenue shrank from 100 to 60.

#### ✓ Fixed

```sql
SELECT customer,
       SUM(amount)                                          AS revenue,
       COALESCE(SUM(amount) FILTER (WHERE amount > 40), 0) AS revenue_over_40,
       COUNT(*) FILTER (WHERE amount > 40)                  AS orders_over_40
FROM orders
GROUP BY customer
ORDER BY customer;
```

Result (3 rows):

| customer | revenue | revenue_over_40 | orders_over_40 |
|---|---|---|---|
| Ana | 40 | 0 | 0 |
| Leo | 100 | 60 | 1 |
| Maya | 80 | 0 | 0 |

Each aggregate gets its own filter. `SUM … FILTER` over no rows is NULL, hence `COALESCE`; `COUNT` returns 0.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL, DuckDB, SQLite | `SUM(x) FILTER (WHERE cond)` |
| Spark SQL / Databricks | `FILTER (WHERE …)` supported; also `count_if(cond)` |
| SQL Server | No FILTER: `SUM(CASE WHEN cond THEN x ELSE 0 END)` |
| Snowflake | No FILTER: `SUM(IFF(cond, x, 0))`, `COUNT_IF(cond)` |
| BigQuery | No FILTER: `SUM(IF(cond, x, 0))`, `COUNTIF(cond)` |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### In practice

> **On the job:** When a metric definition says “revenue from returning customers” and another column in the same table says “total revenue”, both must come from the same set of rows. FILTER (or CASE) keeps them in one query with one denominator; separate WHERE-filtered queries joined back together are slower and easier to get out of sync.

> **The main idea:** WHERE filters rows for every column; FILTER (or CASE) filters rows for one aggregate. Use FILTER in Postgres/DuckDB/Spark, CASE elsewhere.

*Read more:* [PostgreSQL: aggregate expressions and FILTER](https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [Spark SQL: built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html).

---

<a id="slide-8"></a>
## 8. WHERE, HAVING, QUALIFY: filter at the right stage

*Aggregation · logical order and deterministic tie-breakers (added)*

SQL clauses run in a fixed logical order: `FROM/JOIN → WHERE → GROUP BY → HAVING → window functions → QUALIFY → SELECT → DISTINCT → ORDER BY → LIMIT`. Each filter can only see what exists at its stage. `WHERE` filters rows, `HAVING` filters groups, and `QUALIFY` filters on window-function results.

#### Wrong stage: errors (good) …

```sql
SELECT customer, SUM(amount) AS revenue
FROM orders
WHERE SUM(amount) >= 80
GROUP BY customer;
```

Error (expected):

```text
BinderException: Binder Error: WHERE clause cannot contain aggregates!
```

```sql
SELECT customer, SUM(amount) AS revenue
FROM orders
GROUP BY customer
HAVING SUM(amount) >= 80
ORDER BY customer;
```

Result (2 rows):

| customer | revenue |
|---|---|
| Leo | 100 |
| Maya | 80 |

#### … and silently arbitrary results (bad)

```sql
SELECT order_date, order_id, amount
FROM orders
QUALIFY ROW_NUMBER() OVER (PARTITION BY order_date
                           ORDER BY amount DESC) = 1
ORDER BY order_date;
```

Result (4 rows):

| order_date | order_id | amount |
|---|---|---|
| 2026-01-03 | 1 | 25 |
| 2026-01-05 | 2 | 40 |
| 2026-01-09 | 4 | 15 |
| 2026-01-10 | 5 | 60 |

“Largest order per day.” On 5 January, orders 2 and 3 both have 40. This run returned one of them; the SQL standard does not say which, and another run, engine version, or thread count may pick the other.

```sql
SELECT order_date, order_id, amount
FROM orders
QUALIFY ROW_NUMBER() OVER (PARTITION BY order_date
                           ORDER BY amount DESC, order_id) = 1
ORDER BY order_date;
```

Result (4 rows):

| order_date | order_id | amount |
|---|---|---|
| 2026-01-03 | 1 | 25 |
| 2026-01-05 | 2 | 40 |
| 2026-01-09 | 4 | 15 |
| 2026-01-10 | 5 | 60 |

A unique tie-breaker (`order_id`) makes the result deterministic.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB, Snowflake, BigQuery, Databricks | `QUALIFY` supported |
| PostgreSQL, SQL Server, Apache Spark SQL 3.x | No QUALIFY: compute the window in a CTE or subquery, then filter with WHERE |
| All engines | Aggregates are not allowed in WHERE; window functions are not allowed in WHERE or HAVING |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### In practice

> **On the job:** Deduplication with `ROW_NUMBER() … = 1` runs in almost every ingestion pipeline. Without a unique tie-breaker, two loads of the same data can keep different rows, so downstream tables change even though the source did not. Always end the window `ORDER BY` with a unique column, such as an ingestion timestamp plus a key.

> **The main idea:** filter rows in WHERE, groups in HAVING, window results in QUALIFY (or an outer query). Any “pick one row” logic needs a unique tie-breaker.

*Read more:* [DuckDB: WHERE](https://duckdb.org/docs/stable/sql/query_syntax/where), [DuckDB: HAVING](https://duckdb.org/docs/stable/sql/query_syntax/having), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [Snowflake: QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify), [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html).

---

<a id="slide-9"></a>
## 9. Weighted ratios: ratio of sums, not average of ratios

*Aggregation · AOV, coverage, and integer division*

A **ratio metric** is a numerator divided by a denominator, such as average order value (AOV = revenue ÷ orders) or payment coverage (paid ÷ revenue). Averaging per-group ratios gives every group the same weight, regardless of its size. The overall ratio must be computed from overall sums.

#### ✗ Believable, but wrong

```sql
WITH per_customer AS (
    SELECT customer,
           SUM(amount) * 1.0 / COUNT(*) AS aov
    FROM orders
    GROUP BY customer
)
SELECT ROUND(AVG(aov), 2) AS overall_aov
FROM per_customer;
```

Result (1 row):

| overall_aov |
|---|
| 38.89 |

(26.67 + 50 + 40) ÷ 3. Ana’s single order counts as much as Maya’s three.

```sql
WITH per_customer AS (
    SELECT o.customer,
           COALESCE(SUM(p.paid), 0) * 1.0 / SUM(o.amount) AS coverage
    FROM orders o
    LEFT JOIN (SELECT order_id, SUM(amount) AS paid
               FROM payments GROUP BY order_id) p
           ON p.order_id = o.order_id
    GROUP BY o.customer
)
SELECT ROUND(AVG(coverage), 3) AS payment_coverage
FROM per_customer;
```

Result (1 row):

| payment_coverage |
|---|
| 0.667 |

#### ✓ Fixed

```sql
SELECT ROUND(SUM(amount) * 1.0 / COUNT(*), 2) AS overall_aov
FROM orders;
```

Result (1 row):

| overall_aov |
|---|
| 36.67 |

220 ÷ 6. Equivalently, weight each customer’s AOV by their order count.

```sql
SELECT ROUND((SELECT SUM(amount) FROM payments) * 1.0
             / (SELECT SUM(amount) FROM orders), 3) AS payment_coverage;
```

Result (1 row):

| payment_coverage |
|---|
| 0.818 |

180 ÷ 220. The average of ratios (0.667) understates coverage because Ana’s small unpaid order weighs a third.

#### Integer division and divide-by-zero (added)

```sql
SELECT 180 / 220                AS duckdb_slash,
       180 // 220               AS integer_division,
       ROUND(180 * 1.0 / 220, 3) AS decimal_division,
       180 / NULLIF(0, 0)       AS guarded_by_nullif;
```

Result (1 row):

| duckdb_slash | integer_division | decimal_division | guarded_by_nullif |
|---|---|---|---|
| 0.8181818182 | 0 | 0.818 | NULL |

In **PostgreSQL and SQL Server**, `180 / 220` on integers is **0**, like DuckDB’s `//`. DuckDB’s `/` returns a double; Snowflake returns a decimal, BigQuery and Spark a double. Multiply by `1.0` or `CAST` to be portable. Division by zero is an error in PostgreSQL and SQL Server (and `inf` in DuckDB), so wrap the denominator in `NULLIF(x, 0)`.

#### Rules for ratio metrics

- Store and aggregate the **numerator and denominator**, not the ratio. Divide at the very end.
- A ratio column in a table is **non-additive**: you can’t sum or average it across rows (dimensional-modelling deck).
- When you must average ratios (e.g. “typical customer”), say so in the metric name: “mean per-customer AOV”.

> **On the job:** Conversion rate, click-through rate, margin %, on-time delivery %: every one is a weighted ratio. BI tools that average a pre-computed ratio column by default are a classic source of “the dashboard disagrees with finance”. Ship numerator and denominator columns so the tool can sum both.

> **The main idea:** an overall ratio is SUM(numerator) / SUM(denominator). Averaging per-group ratios answers a different question. Guard integer division and zero denominators.

*Read more:* [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [PostgreSQL: math operators](https://www.postgresql.org/docs/current/functions-math.html), [DuckDB: numeric operators (/ and //)](https://duckdb.org/docs/stable/sql/functions/numeric), [SQL Server: division operator](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/divide-transact-sql), [PostgreSQL: CASE, COALESCE, NULLIF](https://www.postgresql.org/docs/current/functions-conditional.html).

---

<a id="slide-10"></a>
## 10. UNION vs UNION ALL, and columns matched by position

*Aggregation · set operations · “all sales from two channels”*

**Set operations** combine the rows of two queries with the same number of columns. `UNION ALL` appends. `UNION` appends *and removes duplicate rows*. **Question:** total revenue across the web and store channels (orders 1–3 and 4–6, as two sources).

#### ✗ Believable, but wrong

```sql
WITH web   AS (SELECT * FROM orders WHERE order_id <= 3),   -- orders 1-3
     store AS (SELECT * FROM orders WHERE order_id >  3)    -- orders 4-6
SELECT SUM(amount) AS revenue
FROM (SELECT order_date, amount FROM web
      UNION
      SELECT order_date, amount FROM store) AS all_sales;
```

Result (1 row):

| revenue |
|---|
| 180 |

180, not 220. Orders 2 and 3 are both (2026-01-05, 40). Without the key, they look like one duplicate row, and `UNION` deleted one.

#### ✓ Fixed

```sql
WITH web   AS (SELECT * FROM orders WHERE order_id <= 3),   -- orders 1-3
     store AS (SELECT * FROM orders WHERE order_id >  3)    -- orders 4-6
SELECT SUM(amount) AS revenue
FROM (SELECT order_date, amount FROM web
      UNION ALL
      SELECT order_date, amount FROM store) AS all_sales;
```

Result (1 row):

| revenue |
|---|
| 220 |

`UNION ALL` keeps every row, and is faster: no sort or hash to find duplicates.

#### Second trap: columns match by position, not name

**By position (wrong)**

```sql
WITH web   AS (SELECT order_id, amount FROM orders WHERE order_id <= 3),
     store AS (SELECT amount, order_id FROM orders WHERE order_id >  3)  -- other column order
SELECT order_id, amount FROM web
UNION ALL
SELECT * FROM store
ORDER BY order_id;
```

Result (6 rows):

| order_id | amount |
|---|---|
| 1 | 25 |
| 2 | 40 |
| 3 | 40 |
| 15 | 4 |
| 40 | 6 |
| 60 | 5 |

The second branch lists `amount, order_id`. Both are integers, so there is no error: amounts became order IDs.

**BY NAME (fixed)**

```sql
WITH web   AS (SELECT order_id, amount FROM orders WHERE order_id <= 3),
     store AS (SELECT amount, order_id FROM orders WHERE order_id >  3)
SELECT * FROM web
UNION ALL BY NAME          -- DuckDB: match columns by name
SELECT * FROM store
ORDER BY order_id;
```

Result (6 rows):

| order_id | amount |
|---|---|
| 1 | 25 |
| 2 | 40 |
| 3 | 40 |
| 4 | 15 |
| 5 | 60 |
| 6 | 40 |

Portable fix: list the same columns in the same order in every branch. Never `SELECT *` into a set operation.

#### Rules and dialects

- Default to `UNION ALL`. Use `UNION` only when you *want* deduplication, and say why in a comment.
- Output column names come from the first branch.
- NULLs are treated as equal when removing duplicates (the *SQL correctness: joins, grain, and NULLs* deck).

#### Dialects

| Engine | Syntax and behaviour |
|---|---|
| BigQuery | Requires `UNION ALL` or `UNION DISTINCT` explicitly |
| DuckDB, Snowflake | `UNION [ALL] BY NAME` matches by column name |
| Spark | DataFrame `unionByName`; SQL matches by position |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Unioning daily extracts, regional shards, or old and new systems during a migration is routine. A `UNION` that quietly deduplicates legitimate repeated rows (two identical refunds, two equal payments) is a classic “why is the total short?” bug.

> **The main idea:** use UNION ALL unless you mean “remove duplicates”, and line columns up explicitly. Set operations match by position.

*Read more:* [PostgreSQL: UNION, INTERSECT, EXCEPT](https://www.postgresql.org/docs/current/queries-union.html), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops), [Snowflake: set operators and UNION BY NAME](https://docs.snowflake.com/en/sql-reference/operators-query).

---

<a id="slide-11"></a>
## 11. INTERSECT, EXCEPT, and EXCEPT ALL for diffs

*Aggregation · set operations · when control totals lie*

`INTERSECT` returns rows present in both inputs; `EXCEPT` returns rows of the first input that are not in the second. The `ALL` versions respect duplicates: a row appearing twice on the left and once on the right survives once. **Scenario:** a load lost order 6 and loaded order 2 twice. Both orders have amount 40.

#### Control totals match…

```sql
WITH target AS (                          -- a load that went wrong
    SELECT * FROM orders WHERE order_id <> 6     -- order 6 missing
    UNION ALL
    SELECT * FROM orders WHERE order_id = 2      -- order 2 loaded twice
)
SELECT 'source' AS side, COUNT(*) AS row_count, SUM(amount) AS revenue FROM orders
UNION ALL
SELECT 'target', COUNT(*), SUM(amount) FROM target
ORDER BY side;
```

Result (2 rows):

| side | row_count | revenue |
|---|---|---|
| source | 6 | 220 |
| target | 6 | 220 |

Same row count, same revenue. A reconciliation based only on counts and sums passes. Yet two rows are wrong.

#### …but the rows do not

#### ✗ EXCEPT

```sql
WITH target AS (                          -- a load that went wrong
    SELECT * FROM orders WHERE order_id <> 6     -- order 6 missing
    UNION ALL
    SELECT * FROM orders WHERE order_id = 2      -- order 2 loaded twice
)
SELECT * FROM orders EXCEPT SELECT * FROM target
UNION ALL
(SELECT * FROM target EXCEPT SELECT * FROM orders)
ORDER BY order_id;
```

Result (1 row):

| order_id | customer | order_date | amount |
|---|---|---|---|
| 6 | Ana | 2026-01-10 | 40 |

Plain `EXCEPT` deduplicates, so it misses the extra copy of order 2.

#### ✓ EXCEPT ALL, both ways

```sql
WITH target AS (                          -- a load that went wrong
    SELECT * FROM orders WHERE order_id <> 6     -- order 6 missing
    UNION ALL
    SELECT * FROM orders WHERE order_id = 2      -- order 2 loaded twice
)
SELECT 'missing in target' AS issue, *
FROM (SELECT * FROM orders EXCEPT ALL SELECT * FROM target)
UNION ALL
SELECT 'extra in target', *
FROM (SELECT * FROM target EXCEPT ALL SELECT * FROM orders)
ORDER BY issue, order_id;
```

Result (2 rows):

| issue | order_id | customer | order_date | amount |
|---|---|---|---|---|
| extra in target | 2 | Maya | 2026-01-05 | 40 |
| missing in target | 6 | Ana | 2026-01-10 | 40 |

Both directions, with `ALL`, find both problems.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL, DuckDB, Spark SQL | `EXCEPT ALL`, `INTERSECT ALL` supported |
| SQL Server, Snowflake | Distinct only (Snowflake also spells it `MINUS`); for duplicate-aware diffs, compare `GROUP BY` counts per row |
| BigQuery | `EXCEPT DISTINCT` / `INTERSECT DISTINCT` only |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### In practice

> **On the job:** A full row diff (both directions) is the gold-standard test when you rewrite a pipeline, migrate engines, or refactor a model: run old and new side by side and require zero rows. On big tables, diff a key plus a row hash rather than every column, and compare per-key counts to catch duplicates in engines without `EXCEPT ALL`.

> **The main idea:** equal counts and sums don’t prove equal data. A two-way EXCEPT ALL (or a per-key count comparison) catches missing and duplicated rows that totals hide.

*Read more:* [PostgreSQL: UNION, INTERSECT, EXCEPT](https://www.postgresql.org/docs/current/queries-union.html), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops), [SQL Server: EXCEPT and INTERSECT](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/set-operators-except-and-intersect-transact-sql).

---

<a id="slide-12"></a>
## 12. GROUPING SETS, ROLLUP, and CUBE

*Aggregation · several GROUP BYs in one query*

`GROUPING SETS` runs several groupings in one query and stacks the results. `ROLLUP (a, b)` is shorthand for the sets `(a, b), (a), ()`: detail, subtotals, and a grand total. `CUBE (a, b)` means every combination: `(a, b), (a), (b), ()`. In a subtotal row, the rolled-up column is shown as `NULL`. That is the trap: Ana’s region is *really* NULL.

#### ✗ Believable, but wrong

```sql
SELECT c.region, SUM(o.amount) AS revenue
FROM orders o
JOIN customers c ON c.customer = o.customer
GROUP BY ROLLUP (c.region)
ORDER BY c.region NULLS LAST, revenue;
```

Result (4 rows):

| region | revenue |
|---|---|
| East | 100 |
| West | 80 |
| NULL | 40 |
| NULL | 220 |

Two rows say `NULL`. Which is the grand total and which is “region unknown”? A BI tool that hides NULL-labelled rows as totals drops Ana; one that treats them as data double-counts.

#### ✓ Fixed

```sql
SELECT CASE WHEN GROUPING(c.region) = 1 THEN 'All regions'
            ELSE COALESCE(c.region, 'Unknown') END AS region,
       SUM(o.amount)      AS revenue,
       GROUPING(c.region) AS is_total
FROM orders o
JOIN customers c ON c.customer = o.customer
GROUP BY ROLLUP (c.region)
ORDER BY is_total, region;
```

Result (4 rows):

| region | revenue | is_total |
|---|---|---|
| East | 100 | 0 |
| Unknown | 40 | 0 |
| West | 80 | 0 |
| All regions | 220 | 1 |

`GROUPING(col)` is 1 when the row is a subtotal over `col` and 0 when `col` is a real grouping value (even a real NULL).

#### What each shorthand expands to

| You write | Grouping sets | Rows here |
|---|---|---|
| `GROUP BY region, customer` | (region, customer) | 3 |
| `ROLLUP (region, customer)` | (region, customer), (region), () | 3 + 3 + 1 = 7 |
| `CUBE (region, customer)` | (region, customer), (region), (customer), () | 3 + 3 + 3 + 1 = 10 |
| `GROUPING SETS ((region), (customer))` | exactly those two | 3 + 3 = 6 |

```sql
SELECT 'rollup' AS kind, COUNT(*) AS result_rows
FROM (SELECT c.region, o.customer, SUM(o.amount) AS revenue
      FROM orders o
      JOIN customers c ON c.customer = o.customer
      GROUP BY ROLLUP (c.region, o.customer))
UNION ALL
SELECT 'cube', COUNT(*)
FROM (SELECT c.region, o.customer, SUM(o.amount) AS revenue
      FROM orders o
      JOIN customers c ON c.customer = o.customer
      GROUP BY CUBE (c.region, o.customer))
ORDER BY kind DESC;
```

Result (2 rows):

| kind | result_rows |
|---|---|
| rollup | 7 |
| cube | 10 |

#### Dialects and practice

Same syntax in PostgreSQL, SQL Server, Snowflake, Spark SQL, BigQuery, and DuckDB; SQL Server and MySQL also accept the older `GROUP BY a, b WITH ROLLUP`.

> **On the job:** Finance-style reports (detail rows, subtotals, a total line) and OLAP cube feeds are built with ROLLUP and CUBE. Computing them in one scan is faster than `UNION ALL` of several `GROUP BY` queries. Always ship a level marker column so consumers can tell totals from data.

> **The main idea:** ROLLUP and CUBE mark subtotals with NULL, which collides with real NULLs. Label rows with GROUPING(), never with IS NULL.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: GROUPING SETS, ROLLUP, CUBE](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [SQL Server: GROUP BY, ROLLUP, CUBE](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql).

---

<a id="slide-13"></a>
## 13. GROUPING() and GROUPING_ID: label every level

*Aggregation · and never sum a report that contains subtotals*

`GROUPING_ID(a, b)` packs the `GROUPING()` flags into one number, reading the columns as bits from left to right: here region is worth 2 and customer is worth 1. So 0 = detail, 1 = customer rolled up (region subtotal), 3 = both rolled up (grand total).

```sql
SELECT c.region, o.customer,
       SUM(o.amount)                      AS revenue,
       GROUPING_ID(c.region, o.customer)  AS gid,
       CASE GROUPING_ID(c.region, o.customer)
            WHEN 0 THEN 'customer'
            WHEN 1 THEN 'region subtotal'
            WHEN 3 THEN 'grand total' END AS level
FROM orders o
JOIN customers c ON c.customer = o.customer
GROUP BY ROLLUP (c.region, o.customer)
ORDER BY gid, c.region NULLS LAST, o.customer;
```

Result (7 rows):

| region | customer | revenue | gid | level |
|---|---|---|---|---|
| East | Leo | 100 | 0 | customer |
| West | Maya | 80 | 0 | customer |
| NULL | Ana | 40 | 0 | customer |
| East | NULL | 100 | 1 | region subtotal |
| West | NULL | 80 | 1 | region subtotal |
| NULL | NULL | 40 | 1 | region subtotal |
| NULL | NULL | 220 | 3 | grand total |

#### ✗ Believable, but wrong

```sql
WITH report AS (
    SELECT c.region, o.customer,
           SUM(o.amount)                      AS revenue,
           GROUPING_ID(c.region, o.customer)  AS gid,
           CASE GROUPING_ID(c.region, o.customer)
                WHEN 0 THEN 'customer'
                WHEN 1 THEN 'region subtotal'
                WHEN 3 THEN 'grand total' END AS level
    FROM orders o
    JOIN customers c ON c.customer = o.customer
    GROUP BY ROLLUP (c.region, o.customer)
)
SELECT SUM(revenue) AS total_revenue
FROM report;
```

Result (1 row):

| total_revenue |
|---|
| 660 |

660: every order counted three times (detail, region subtotal, grand total). This happens when someone loads a ROLLUP output into a table and a BI tool sums it.

#### ✓ Fixed

```sql
WITH report AS (
    SELECT c.region, o.customer,
           SUM(o.amount)                      AS revenue,
           GROUPING_ID(c.region, o.customer)  AS gid,
           CASE GROUPING_ID(c.region, o.customer)
                WHEN 0 THEN 'customer'
                WHEN 1 THEN 'region subtotal'
                WHEN 3 THEN 'grand total' END AS level
    FROM orders o
    JOIN customers c ON c.customer = o.customer
    GROUP BY ROLLUP (c.region, o.customer)
)
SELECT SUM(revenue) AS total_revenue
FROM report
WHERE gid = 0;               -- detail rows only
```

Result (1 row):

| total_revenue |
|---|
| 220 |

Filter on the level marker. Better still, don’t store subtotals in tables that others aggregate; compute them in the report.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| SQL Server, Snowflake, DuckDB | `GROUPING(col)` and `GROUPING_ID(col, …)` |
| PostgreSQL | `GROUPING(a, b)` with several arguments returns the same bitmask; there is no `GROUPING_ID` |
| Spark SQL | `grouping(col)` and `grouping_id(cols…)` |
| All | Bit order: the *last* argument is the lowest bit |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### In practice

> **On the job:** If a table contains a mix of grains (detail plus subtotals), it needs a level column, and every consumer must filter on it. Most data-modelling guidance says: don’t build such tables at all; keep facts at one grain and let the BI layer roll up. Know both, because you will inherit the mixed kind.

> **The main idea:** GROUPING_ID tells you exactly which level each row is. A result with subtotals has mixed grain: never sum it without filtering to one level.

*Read more:* [PostgreSQL: GROUPING()](https://www.postgresql.org/docs/current/functions-aggregate.html#FUNCTIONS-GROUPING-TABLE), [DuckDB: GROUPING SETS, ROLLUP, CUBE](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [SQL Server: GROUPING](https://learn.microsoft.com/en-us/sql/t-sql/functions/grouping-transact-sql), [SQL Server: GROUPING_ID](https://learn.microsoft.com/en-us/sql/t-sql/functions/grouping-id-transact-sql).

---

<a id="slide-14"></a>
## 14. Pivot: rows to columns

*Aggregation · revenue per customer per product*

To **pivot** is to turn the values of one column (`sku`) into separate columns, aggregating as you go. Two traps: missing combinations come out as `NULL`, not 0, and the list of columns is fixed when the query is written.

#### ✗ Believable, but wrong

```sql
WITH sales AS (
    SELECT o.customer, i.sku, i.qty * i.unit_price AS revenue
    FROM orders o
    JOIN order_items i ON i.order_id = o.order_id
)
SELECT customer, KIT, MUG, SPOON, TEA,
       KIT + MUG + SPOON + TEA AS total
FROM sales
PIVOT (SUM(revenue) FOR sku IN ('KIT', 'MUG', 'SPOON', 'TEA'))
ORDER BY customer;
```

Result (3 rows):

| customer | KIT | MUG | SPOON | TEA | total |
|---|---|---|---|---|---|
| Ana | NULL | 25 | NULL | 15 | NULL |
| Leo | 45 | NULL | 25 | 30 | NULL |
| Maya | NULL | 50 | NULL | 30 | NULL |

Every total is NULL: each customer has at least one product they never bought, and `x + NULL` is NULL.

#### ✓ Fixed

```sql
SELECT o.customer,
       SUM(CASE WHEN i.sku = 'KIT'   THEN i.qty * i.unit_price ELSE 0 END) AS kit,
       SUM(CASE WHEN i.sku = 'MUG'   THEN i.qty * i.unit_price ELSE 0 END) AS mug,
       SUM(CASE WHEN i.sku = 'SPOON' THEN i.qty * i.unit_price ELSE 0 END) AS spoon,
       SUM(CASE WHEN i.sku = 'TEA'   THEN i.qty * i.unit_price ELSE 0 END) AS tea,
       SUM(i.qty * i.unit_price)                                           AS total
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
GROUP BY o.customer
ORDER BY o.customer;
```

Result (3 rows):

| customer | kit | mug | spoon | tea | total |
|---|---|---|---|---|---|
| Ana | 0 | 25 | 0 | 15 | 40 |
| Leo | 45 | 0 | 25 | 30 | 100 |
| Maya | 0 | 50 | 0 | 30 | 80 |

Conditional aggregation (lesson 6) is the portable pivot. `ELSE 0` gives zeros, and `total` is computed from the rows, not from the columns, so it still reconciles if a product is missing from the list.

#### Third trap: unlisted values vanish

```sql
WITH sales AS (
    SELECT o.customer, i.sku, i.qty * i.unit_price AS revenue
    FROM orders o
    JOIN order_items i ON i.order_id = o.order_id
)
SELECT customer, KIT, MUG, TEA,
       COALESCE(KIT, 0) + COALESCE(MUG, 0) + COALESCE(TEA, 0) AS pivot_total
FROM sales
PIVOT (SUM(revenue) FOR sku IN ('KIT', 'MUG', 'TEA'))   -- SPOON forgotten
ORDER BY customer;
```

Result (3 rows):

| customer | KIT | MUG | TEA | pivot_total |
|---|---|---|---|---|
| Ana | NULL | 25 | 15 | 40 |
| Leo | 45 | NULL | 30 | 75 |
| Maya | NULL | 50 | 30 | 80 |

Leo’s spoons (25) silently disappear. DuckDB can also pivot without an `IN` list (`PIVOT sales ON sku USING SUM(revenue)`), creating one column per value it finds: a new SKU tomorrow becomes a new column, and downstream code breaks. Pin the list, and reconcile the pivot total to the unpivoted total.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB | `PIVOT sales ON sku [IN (…)] USING SUM(revenue) GROUP BY customer`, or the standard form shown |
| SQL Server | `… PIVOT (SUM(revenue) FOR sku IN ([KIT], [MUG])) AS p`; static list, dynamic needs dynamic SQL |
| Snowflake | `PIVOT (SUM(revenue) FOR sku IN (ANY ORDER BY sku)) DEFAULT ON NULL (0)` |
| Spark SQL, BigQuery | `PIVOT (SUM(revenue) FOR sku IN ('KIT', 'MUG'))` |
| PostgreSQL | No PIVOT: conditional aggregation or `FILTER`, or `crosstab()` from the tablefunc extension |
| All PIVOTs | Group by every input column not named in the pivot, so select only the columns you need first |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Pivots feed reports, ML feature tables (one column per event type), and spreadsheet-style exports. In pipelines, prefer keeping data long (one row per customer and product) and pivoting at the edge, where a missing or new category is visible.

> **The main idea:** pivoted cells are NULL where no rows exist, and unlisted values are dropped. Use conditional aggregation with ELSE 0, pin the column list, and check the total.

*Read more:* [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [SQL Server: PIVOT and UNPIVOT](https://learn.microsoft.com/en-us/sql/t-sql/queries/from-using-pivot-and-unpivot), [Snowflake: PIVOT](https://docs.snowflake.com/en/sql-reference/constructs/pivot), [Spark SQL: PIVOT](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-pivot.html), [PostgreSQL: tablefunc crosstab](https://www.postgresql.org/docs/current/tablefunc.html).

---

<a id="slide-15"></a>
## 15. Unpivot: columns to rows, and the NULLs it drops

*Aggregation · “which customer-months have no target yet?”*

To **unpivot** is the reverse of pivot: turn columns (`jan`, `feb`, `mar`) into rows of `(month, value)`. Long data is easier to join, filter, and aggregate. The trap: `UNPIVOT` drops NULL values by default in most engines.

#### ✗ Believable, but wrong

```sql
SELECT customer, month, target
FROM targets
UNPIVOT (target FOR month IN (jan, feb, mar))
WHERE target IS NULL
ORDER BY customer, month;
```

Result (0 rows):

| customer | month | target |
|---|---|---|

Zero rows: the NULL targets were removed before `WHERE` could see them. The same mistake makes “months per customer” come out as 2 instead of 3.

#### ✓ Fixed

```sql
SELECT customer, month, target
FROM targets
UNPIVOT INCLUDE NULLS (target FOR month IN (jan, feb, mar))
WHERE target IS NULL
ORDER BY customer, month;
```

Result (2 rows):

| customer | month | target |
|---|---|---|
| Ana | mar | NULL |
| Leo | feb | NULL |

`INCLUDE NULLS` keeps every cell.

#### Portable: a lateral VALUES list

```sql
SELECT t.customer, v.month_no, v.month, v.target
FROM targets t
CROSS JOIN LATERAL (VALUES (1, 'jan', t.jan),
                           (2, 'feb', t.feb),
                           (3, 'mar', t.mar)) AS v(month_no, month, target)
ORDER BY t.customer, v.month_no;
```

Result (9 rows):

| customer | month_no | month | target |
|---|---|---|---|
| Ana | 1 | jan | 40 |
| Ana | 2 | feb | 40 |
| Ana | 3 | mar | NULL |
| Leo | 1 | jan | 100 |
| Leo | 2 | feb | NULL |
| Leo | 3 | mar | 120 |
| Maya | 1 | jan | 80 |
| Maya | 2 | feb | 90 |
| Maya | 3 | mar | 100 |

Works in PostgreSQL and DuckDB; SQL Server writes it as `CROSS APPLY (VALUES …)`. It keeps NULLs and lets you add a sort key (`month_no`). A `UNION ALL` of one `SELECT` per column also works everywhere.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB | `UNPIVOT [INCLUDE NULLS] (value FOR name IN (…))`, or `UNPIVOT t ON cols INTO NAME … VALUE …` |
| SQL Server | `UNPIVOT` always drops NULLs; use `CROSS APPLY (VALUES …)` to keep them |
| Snowflake, Spark SQL, BigQuery | `UNPIVOT [INCLUDE \| EXCLUDE NULLS]`, default EXCLUDE |
| PostgreSQL | No UNPIVOT: `CROSS JOIN LATERAL (VALUES …)` or UNION ALL |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Spreadsheets, budgets, and survey exports arrive wide (one column per month or question). The first step of loading them is usually an unpivot. If NULL means “not answered” or “not set”, dropping it loses information you need for completeness checks.

> **The main idea:** unpivot to get long, joinable data, but say INCLUDE NULLS (or use LATERAL VALUES) when a missing value is information.

*Read more:* [DuckDB: UNPIVOT](https://duckdb.org/docs/stable/sql/statements/unpivot), [SQL Server: PIVOT and UNPIVOT](https://learn.microsoft.com/en-us/sql/t-sql/queries/from-using-pivot-and-unpivot), [Snowflake: UNPIVOT](https://docs.snowflake.com/en/sql-reference/constructs/unpivot), [Spark SQL: UNPIVOT](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-unpivot.html), [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html).

---

<a id="slide-16"></a>
## 16. Percentiles and medians: continuous vs discrete

*Aggregation · percentile_cont, percentile_disc, and why medians don’t average*

The **p-th percentile** is the value below which a share p of the data falls; the median is the 50th. `percentile_cont` (continuous) interpolates between the two nearest values, so it can return a value that never occurred. `percentile_disc` (discrete) returns an actual value: the first one whose cumulative share reaches p. Sorted amounts: 15, 25, 40, 40, 40, 60.

```sql
SELECT ROUND(AVG(amount), 2) AS mean,
       MEDIAN(amount)                                     AS median,
       percentile_cont(0.25) WITHIN GROUP (ORDER BY amount) AS p25_cont,
       percentile_disc(0.25) WITHIN GROUP (ORDER BY amount) AS p25_disc,
       percentile_cont(0.90) WITHIN GROUP (ORDER BY amount) AS p90_cont,
       percentile_disc(0.90) WITHIN GROUP (ORDER BY amount) AS p90_disc
FROM orders;
```

Result (1 row):

| mean | median | p25_cont | p25_disc | p90_cont | p90_disc |
|---|---|---|---|---|---|
| 36.67 | 40 | 28.75 | 25 | 50 | 60 |

#### ✗ Believable, but wrong: combine medians

```sql
WITH per_customer AS (
    SELECT customer, MEDIAN(amount) AS median_amount
    FROM orders
    GROUP BY customer
)
SELECT ROUND(AVG(median_amount), 2) AS avg_of_medians
FROM per_customer;
```

Result (1 row):

| avg_of_medians |
|---|
| 38.33 |

Averaging pre-computed medians (25, 50, 40) does not give the overall median. The same goes for averaging daily p95 latencies into a monthly p95.

#### ✓ Fixed

```sql
SELECT MEDIAN(amount) AS overall_median
FROM orders;
```

Result (1 row):

| overall_median |
|---|
| 40 |

Percentiles are **non-additive**: compute them from the raw rows of the whole population, or from a mergeable sketch (next lessons).

#### Which one?

- **cont** for smooth statistics (latency, durations). “p90 = 50” here, though no order was 50.
- **disc** when the answer must be a real observed value (a price point, a threshold to look up).
- With few rows the two differ a lot; with millions they converge.
- Mean 36.67 vs median 40: the mean is pulled by small orders. Report both for skewed data.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL, Snowflake, DuckDB | `percentile_cont(p) WITHIN GROUP (ORDER BY x)` as an aggregate; DuckDB also `median`, `quantile_cont`, `quantile_disc` |
| SQL Server | `PERCENTILE_CONT`/`DISC` only as window functions (`… OVER (PARTITION BY g)`); 2022+: `APPROX_PERCENTILE_CONT` as an aggregate |
| BigQuery | `PERCENTILE_CONT` is window-only; aggregate with `APPROX_QUANTILES(x, 100)[OFFSET(90)]` |
| Spark SQL | `percentile(x, 0.9)` (exact, interpolated), `percentile_approx(x, 0.9)` |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** SLAs and performance reports use p50/p95/p99 because means hide tail latency. Pipelines that store only daily percentiles cannot produce correct weekly ones later; keep raw data, histograms, or sketches if you will need other periods.

> **The main idea:** percentile_cont interpolates, percentile_disc picks a real value. Percentiles of percentiles are wrong: recompute from rows or merge sketches.

*Read more:* [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [SQL Server: PERCENTILE_CONT](https://learn.microsoft.com/en-us/sql/t-sql/functions/percentile-cont-transact-sql), [BigQuery: approximate aggregate functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions), [Spark SQL: built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html).

---

<a id="slide-17"></a>
## 17. Approximate distinct counts: measured trade-offs

*Aggregation · COUNT(DISTINCT) vs HyperLogLog on 5 million rows*

Exact `COUNT(DISTINCT x)` must remember every distinct value it has seen: memory grows with the number of distinct values. **HyperLogLog** (HLL) is a **sketch**: a small fixed-size summary, built from hashes of the values, that estimates the distinct count. `approx_count_distinct` uses it. The same idea exists for percentiles (t-digest behind `approx_quantile`).

```sql
CREATE TABLE events AS
SELECT i                                        AS event_id,
       hash(i) % 2000000                        AS user_id,     -- deterministic pseudo-random
       DATE '2026-01-01' + CAST(i % 30 AS INTEGER) AS event_day,
       (hash(i + 7) % 100000) / 100.0           AS amount       -- 0.00 to 999.99
FROM range(5000000) AS t(i);
```

`hash(i)` gives a repeatable pseudo-random user for each row, so every build produces the same data: 5,000,000 events, about 1.84 million distinct users, 30 days. The Python below times both queries on that table.

```python
import time, statistics
# con: the DuckDB connection that holds the events table above (threads set to 1)

def timed(sql, runs=5):
    """Run a single-value query several times; return its value and the median seconds."""
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        value = con.execute(sql).fetchone()[0]
        times.append(time.perf_counter() - t0)
    return value, statistics.median(times)

exact, t_exact = timed("SELECT COUNT(DISTINCT user_id) FROM events")
approx, t_approx = timed("SELECT approx_count_distinct(user_id) FROM events")
print(f"rows                          {con.sql('SELECT COUNT(*) FROM events').fetchone()[0]:>12,}")
print(f"COUNT(DISTINCT user_id)       {exact:>12,}   median {t_exact * 1000:7.1f} ms")
print(f"approx_count_distinct(user_id){approx:>12,}   median {t_approx * 1000:7.1f} ms")
print(f"relative error {(approx - exact) / exact:+.2%}, speed-up {t_exact / t_approx:.1f}x")

daily = con.sql("""SELECT event_day, COUNT(DISTINCT user_id), approx_count_distinct(user_id)
                   FROM events GROUP BY event_day ORDER BY event_day""").fetchall()
errors = [abs(a - e) / e for _, e, a in daily]
print(f"per-day error over {len(daily)} days: mean {statistics.mean(errors):.2%}, max {max(errors):.2%}")

q_exact, tq_exact = timed("SELECT quantile_cont(amount, 0.95) FROM events")
q_approx, tq_approx = timed("SELECT approx_quantile(amount, 0.95) FROM events")
print(f"p95 exact {q_exact:.2f} in {tq_exact * 1000:.1f} ms, approx {q_approx:.2f} in {tq_approx * 1000:.1f} ms")
```

Output (measured on the build machine, single thread; timings vary per run):

```text
rows                             5,000,000
COUNT(DISTINCT user_id)          1,836,025   median   461.7 ms
approx_count_distinct(user_id)   1,793,438   median    59.1 ms
relative error -2.32%, speed-up 7.8x
per-day error over 30 days: mean 9.90%, max 30.90%
p95 exact 950.07 in 178.5 ms, approx 949.92 in 384.3 ms
```

#### Reading the measurement

- **Overall:** the estimate was 2.3% too low, and in this run it was 8× faster than the exact count. The bigger win on a cluster is memory and network: each worker sends a few kilobytes of sketch instead of its full set of distinct values.
- **Per group the error was much larger:** across the 30 daily groups the mean error was 9.9% and the worst 30.9%. Sketch accuracy depends on the implementation’s precision, so measure it on your data before trusting it for a metric.
- **Approximate is not always faster:** here, single-threaded on one machine, `approx_quantile` was slower than the exact `quantile_cont` (384 vs 178 ms), while both p95 values agreed closely. Sketches pay off mostly in memory and in distributed engines.
- Never use approximate counts for billing, reconciliation, or anything compared to an exact source. Your timings will differ.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB | `approx_count_distinct(x)`, `approx_quantile(x, p)` |
| Spark SQL | `approx_count_distinct(x, rsd)` (rsd = max relative standard deviation), `percentile_approx` |
| Snowflake | `APPROX_COUNT_DISTINCT` / `HLL`, `APPROX_PERCENTILE` |
| BigQuery | `APPROX_COUNT_DISTINCT`, `APPROX_QUANTILES`, `HLL_COUNT.*` |
| SQL Server | `APPROX_COUNT_DISTINCT` (2019+), `APPROX_PERCENTILE_CONT` (2022+) |
| PostgreSQL | None built in; extensions such as postgresql-hll |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Product analytics (“daily active users” over billions of events) routinely uses HLL. The interview answer: approximate when the number is for trend-reading and exact cost is high; exact when money, compliance, or reconciliation depend on it; and always label approximate metrics.

> **The main idea:** approx_count_distinct trades accuracy for less memory and time; measure the error on your data. Use it for exploration and large-scale trend metrics, never for reconciled totals.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [Snowflake: APPROX_COUNT_DISTINCT](https://docs.snowflake.com/en/sql-reference/functions/approx_count_distinct), [BigQuery: approximate aggregate functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions), [SQL Server: APPROX_COUNT_DISTINCT](https://learn.microsoft.com/en-us/sql/t-sql/functions/approx-count-distinct-transact-sql), [SQL Server: APPROX_PERCENTILE_CONT](https://learn.microsoft.com/en-us/sql/t-sql/functions/approx-percentile-cont-transact-sql), [Snowflake: APPROX_PERCENTILE](https://docs.snowflake.com/en/sql-reference/functions/approx_percentile).

---

<a id="slide-18"></a>
## 18. Distinct counts don’t add up

*Aggregation · daily users ≠ monthly users, and how sketches help (added)*

A **non-additive** measure can’t be summed across a dimension. Distinct counts are the classic case: a customer active on three days is one customer for the month, not three.

#### ✗ Believable, but wrong

```sql
WITH daily AS (
    SELECT order_date, COUNT(DISTINCT customer) AS customers
    FROM orders
    GROUP BY order_date
)
SELECT SUM(customers) AS january_customers
FROM daily;
```

Result (1 row):

| january_customers |
|---|
| 6 |

6 “customers” in January. Maya is counted on three days, Leo on two.

#### ✓ Fixed

```sql
SELECT COUNT(DISTINCT customer) AS january_customers
FROM orders
WHERE order_date >= DATE '2026-01-01'
  AND order_date <  DATE '2026-02-01';
```

Result (1 row):

| january_customers |
|---|
| 3 |

Recount from the rows for the period you want.

#### At scale: the same error, measured

```sql
SELECT (SELECT SUM(daily_users)
        FROM (SELECT COUNT(DISTINCT user_id) AS daily_users
              FROM events GROUP BY event_day)) AS sum_of_daily_distinct,
       (SELECT COUNT(DISTINCT user_id) FROM events) AS monthly_distinct;
```

Result (1 row):

| sum_of_daily_distinct | monthly_distinct |
|---|---|
| 4796775 | 1836025 |

On the 5-million-row table, summing daily distinct users overstates the monthly figure by about 2.6 times.

#### Mergeable sketches

Exact daily distinct counts can’t be combined, but HLL sketches can: store one sketch per day, then merge sketches for any week or month and estimate from the merged sketch.

#### Sketch functions

| Engine | Syntax and behaviour |
|---|---|
| Snowflake | `HLL_ACCUMULATE` → `HLL_COMBINE` → `HLL_ESTIMATE` |
| BigQuery | `HLL_COUNT.INIT` → `HLL_COUNT.MERGE` / `EXTRACT` |
| Spark 3.5+ / Databricks | `hll_sketch_agg` → `hll_union_agg` → `hll_sketch_estimate` |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** “Monthly active users” tables built by summing a daily-active-users table are a common bug in analytics layers. Model distinct counts as non-additive: store the keys (or a sketch) at the finest grain, and recompute for every period instead of rolling up.

> **The main idea:** never sum distinct counts across days, regions, or products. Recompute from rows, or store mergeable sketches.

*Read more:* [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [Snowflake: HLL](https://docs.snowflake.com/en/sql-reference/functions/hll), [BigQuery: HyperLogLog++ functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions), [Spark SQL: built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html).

---

<a id="slide-19"></a>
## 19. A grain-first routine for SQL interviews

*Verify · say it out loud, then write it (added)*

1. **Restate the output** (one row per …): “So the result is one row per customer per month, with revenue and order count?”
2. **Name each table’s grain and key** (and NULLable columns): “orders is one row per order; payments can have several per order; region can be NULL.”
3. **Predict each join** (1:1, N:1, 1:N, N:M): Any 1:N join before an aggregate is a fan-out risk: pre-aggregate or semi-join.
4. **Write CTEs per grain** (aggregate, then join): One CTE per detail table at the output key; join on unique keys.
5. **Ask the NULL questions** (outer joins, NOT IN, CASE, COUNT): Where do unknowns go? Which COUNT? Which denominator?
6. **Test on a counterexample** (two children, a tie, a NULL): Walk 3–4 rows through the query by hand, then state how you would reconcile it.

| If you hear… | Reach for… | Lesson |
|---|---|---|
| “including those with zero” | Spine table + `LEFT JOIN`, condition in `ON`, `COUNT(right.key)` | joins deck, 5 |
| “and also the total / subtotal” | `ROLLUP` / `GROUPING SETS` + `GROUPING()` | 12–13 |
| “rate / share / average per” | Ratio of sums; `NULLIF` on the denominator | 9 |
| “X and Y side by side” | Conditional aggregation / `FILTER` / pivot | 6–7, 14 |
| “unique users per week and month” | Recompute `COUNT(DISTINCT)` per period (non-additive) | 18 |
| “median / p95” | `percentile_cont` / `disc`; never average them | 16 |

> **On the job:** Interviewers for data-engineering roles care less about clever syntax than about whether you notice grain and NULLs unprompted. Saying “orders to payments is one-to-many, so I’ll aggregate payments first” before writing the join is often the moment that earns the hire signal.

> **The main idea:** state the grain, predict every join’s cardinality, aggregate before joining, ask where NULLs go, and test on a tiny counterexample.

---

<a id="slide-20"></a>
## 20. Bug clinic: believable queries, wrong answers

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | Totals too low after a “dedupe” | `SUM(DISTINCT)` / `UNION` removed equal legitimate values | Deduplicate by key; `UNION ALL` | joins deck, 10 |
| 2 | Customers with no orders show 1 | `COUNT(*)` after `LEFT JOIN` | `COUNT(right.key)` | 5 |
| 3 | Conditional count equals the total | `COUNT(CASE … ELSE 0 END)` | `SUM(… ELSE 0)` or no ELSE | 6 |
| 4 | Other columns shrink when adding a filter | Filter in WHERE instead of on one aggregate | `FILTER (WHERE …)` / CASE | 7 |
| 5 | Different rows kept on each run | `ROW_NUMBER` without a unique tie-breaker | Add a unique key to the window ORDER BY | 8 |
| 6 | Rate disagrees with finance | Average of ratios; integer division | Ratio of sums; `* 1.0`; `NULLIF` | 9 |
| 7 | Values in the wrong columns | Set operation matched by position | Explicit column lists; `BY NAME` | 10 |
| 8 | Totals match but data is wrong | Offsetting missing + duplicate rows | Two-way `EXCEPT ALL` / per-key diff | 11, joins deck |
| 9 | Grand total appears as a region; report sum is triple | Subtotal NULLs; mixed-grain output summed | `GROUPING()` labels; filter to one level | 12, 13 |
| 10 | Pivot totals NULL; a category vanished | NULL + x; value not in the pivot list | ELSE 0; pin the list; reconcile totals | 14 |
| 11 | Missing values never found after unpivot | UNPIVOT drops NULLs by default | `INCLUDE NULLS` / LATERAL VALUES | 15 |
| 12 | Monthly users 2–3× too high | Summed daily distinct counts or averaged percentiles | Recompute per period; mergeable sketches | 16–18 |

> **On the job:** None of these raise an error. They are found by reconciliation checks, grain tests, and reviewers who ask “what is the grain?” and “what happens with NULL?”. Bring this table to your next code review.

> **The main idea:** silent SQL bugs come from three places: grain (fan-out, mixed levels), NULLs (unknown is not false), and set semantics (DISTINCT, UNION, position).

---

<a id="slide-21"></a>
## 21. Exercises 1–3: aggregation

*Exercises · FILTER, ratios, ROLLUP, pivot, percentiles*

All exercises use the lab tables from lesson 3. Write your query, then compare with the expected result shown. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B. Every solution ran during the build and matched the expected result.

### Exercise 1 · Card share per customer and overall

For each customer with payments, show amount paid, amount paid by card, and `card_share` = card ÷ paid (3 decimals). Add an `All customers` row whose share is computed correctly for the whole population, in the same query. Then explain why it is not the average of the two customer shares.

Result (3 rows):

| customer | paid | card_paid | card_share |
|---|---|---|---|
| Leo | 100 | 100 | 1 |
| Maya | 80 | 55 | 0.688 |
| All customers | 180 | 155 | 0.861 |

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · A pivot that reconciles

Show units sold per region (NULL region labelled `Unknown`) with one column per SKU (`kit, mug, spoon, tea`) and a `total_units` column. Use 0 where nothing was sold. The grand total of `total_units` must equal `SUM(qty)` of `order_items` (14).

Result (3 rows):

| region | kit | mug | spoon | tea | total_units |
|---|---|---|---|---|---|
| East | 1 | 0 | 5 | 2 | 8 |
| Unknown | 0 | 1 | 0 | 1 | 2 |
| West | 0 | 2 | 0 | 2 | 4 |

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Medians by region, and the overall median

Per region (NULL → `Unknown`) and for `All regions`, show the number of orders, the continuous median amount, and the discrete 90th percentile. Then explain why the overall median is not the average of the three regional medians.

Result (4 rows):

| region | orders | median_amount | p90_disc |
|---|---|---|---|
| East | 2 | 50 | 60 |
| Unknown | 1 | 40 | 40 |
| West | 3 | 25 | 40 |
| All regions | 6 | 40 | 60 |

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

> **The main idea:** label totals with GROUPING(), divide sums rather than averaging ratios, and reconcile pivots to an unpivoted control total.

---

<a id="slide-22"></a>
## 22. Cheat sheet

*Reference · the deck on one page*

#### Aggregation

| Need | Write |
|---|---|
| conditional count | `SUM(CASE WHEN c THEN 1 ELSE 0 END)` |
| filtered aggregate | `SUM(x) FILTER (WHERE c)` (else CASE) |
| filter groups / windows | `HAVING` / `QUALIFY` (or outer WHERE) |
| pick one row per group | `ROW_NUMBER() OVER (… ORDER BY x, unique_key) = 1` |
| overall rate | `SUM(num) * 1.0 / NULLIF(SUM(den), 0)` |
| combine sources | `UNION ALL` with explicit column lists |
| subtotals | `GROUP BY ROLLUP (…)` + `GROUPING()` labels |
| pivot | `SUM(CASE WHEN k = 'a' THEN x ELSE 0 END) AS a` |
| unpivot keeping NULLs | `UNPIVOT INCLUDE NULLS` / `LATERAL (VALUES …)` |
| median / p90 | `percentile_cont(p) WITHIN GROUP (ORDER BY x)`; `_disc` for real values |
| fast distinct estimate | `approx_count_distinct(x)`; never for reconciled totals |

#### Verify

| Check | Pass when |
|---|---|
| row count | source = target |
| control totals | sums equal per measure |
| grain | `COUNT(*) = COUNT(DISTINCT key)` |
| row diff | two-way `EXCEPT ALL` returns 0 rows |
| non-additive measures | recomputed per period, never summed |
| subtotal rows | `GROUPING()` flags filtered before summing |

> **The main idea:** aggregate at the right stage, recompute non-additive measures per level, and label every subtotal.

---

<a id="slide-23"></a>
## 23. Dialect cheat sheet

*Reference · the same idea in six engines (added)*

| Feature | DuckDB | PostgreSQL | SQL Server | Spark SQL | Snowflake | BigQuery |
|---|---|---|---|---|---|---|
| Aggregate `FILTER` | yes | yes | no (CASE) | yes | no (IFF, COUNT_IF) | no (IF, COUNTIF) |
| `QUALIFY` | yes | no | no | Databricks: yes | yes | yes |
| PIVOT | yes (dynamic or listed) | no (CASE, crosstab) | yes (static list) | yes | yes (`ANY`, `DEFAULT ON NULL`) | yes |
| UNPIVOT keeps NULLs? | `INCLUDE NULLS` | no UNPIVOT (LATERAL VALUES) | never (CROSS APPLY VALUES) | `INCLUDE NULLS` | `INCLUDE NULLS` | `INCLUDE NULLS` |
| `GROUPING_ID` | yes | `GROUPING(a, b)` bitmask | yes | `grouping_id()` | yes | — |
| `EXCEPT ALL` | yes | yes | no | yes | no | no (DISTINCT only) |
| `int / int` | double (`//` integer) | integer | integer | double | decimal | double |
| Exact percentile aggregate | `percentile_cont … WITHIN GROUP`, `median` | same | window only (OVER) | `percentile()` | same, `MEDIAN` | window only |
| Approximate distinct | `approx_count_distinct` | extension | `APPROX_COUNT_DISTINCT` | `approx_count_distinct` | `APPROX_COUNT_DISTINCT` | `APPROX_COUNT_DISTINCT` |
| Mergeable HLL sketches | — | extension | — | `hll_sketch_agg` (3.5+) | `HLL_ACCUMULATE` / `COMBINE` | `HLL_COUNT.*` |
| Set op by column name | `UNION [ALL] BY NAME` | no | no | DataFrame `unionByName` | `UNION [ALL] BY NAME` | — |

*Reference only: only the DuckDB column was executed in this build. Engine features change between versions; check the linked documentation for your version. “—” means no built-in equivalent that this deck relies on.*

> **The main idea:** the logic is the same everywhere; only spelling differs. When porting, check NULL order, integer division, FILTER, and QUALIFY first.

*Read more:* [DuckDB: PostgreSQL compatibility](https://duckdb.org/docs/stable/sql/dialect/postgresql_compatibility), [PostgreSQL: sorting rows and NULLS FIRST/LAST](https://www.postgresql.org/docs/current/queries-order.html), [SQL Server: ORDER BY](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql), [Spark SQL: NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html), [Snowflake: QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify), [BigQuery: query syntax (PIVOT, UNPIVOT, QUALIFY)](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax).

---

<a id="slide-24"></a>
## 24. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Grain | What one row of a table or result represents (“one row per order line”) |
| Key / foreign key | Columns unique per row at the grain / a column pointing to another table’s key |
| Fan-out | A join repeating rows of one side once per match on the other, inflating its measures |
| Control total | A trusted total from the source that derived results must match |
| Counterexample | A small input that proves a query wrong |
| NULL | A missing or unknown value |
| Conditional aggregation | An aggregate over a CASE expression, giving several filtered totals in one pass |
| FILTER clause | `agg(x) FILTER (WHERE c)`: aggregate only rows where c is true |
| Logical query order | FROM → WHERE → GROUP BY → HAVING → windows → QUALIFY → SELECT → DISTINCT → ORDER BY → LIMIT |
| QUALIFY | A clause that filters rows on window-function results |
| Tie-breaker | A unique column added to ORDER BY so the result is deterministic |
| Ratio metric / weighted ratio | Numerator ÷ denominator; overall value is SUM(num) ÷ SUM(den) |
| Additive / non-additive measure | Can / can’t be summed across a dimension (distinct counts, ratios, percentiles can’t) |
| Set operation | UNION [ALL], INTERSECT [ALL], EXCEPT [ALL]: combine whole rows of two queries |
| GROUPING SETS / ROLLUP / CUBE | Several groupings in one query / hierarchy of subtotals / all combinations |
| GROUPING() / GROUPING_ID | 1 if a column is rolled up in this row / all GROUPING flags packed into one number |
| Mixed grain | A result holding rows at several levels (detail plus subtotals) |
| Pivot / unpivot | Turn values of a column into columns / turn columns into rows |
| Schema drift | The set of columns changing over time, e.g. a new pivot value creating a new column |
| Percentile; median | Value below which a share p of the data falls; the 50th percentile |
| percentile_cont / percentile_disc | Interpolated value / an actual value from the data |
| Sketch | A small, fixed-size summary that estimates a statistic and can often be merged |
| HyperLogLog (HLL) | A sketch for approximate distinct counts |
| t-digest | A sketch for approximate percentiles |
| Reconciliation | Proving a derived result agrees with its source at a stated grain |
| Embedded database | A database that runs inside your process (DuckDB, SQLite) |

---

<a id="slide-25"></a>
## 25. Recap: what to remember

*Reference · recap and practice plan*

1. **Count deliberately.** COUNT(*) counts rows, COUNT(col) skips NULLs, COUNT(DISTINCT) counts values; after a LEFT JOIN count the right key.
2. **Several totals in one pass** with SUM(CASE … ELSE 0) or FILTER (WHERE …).
3. **Filters have a stage.** Rows → WHERE. Groups → HAVING. Windows → QUALIFY. Add a unique tie-breaker.
4. **Ratios:** SUM(num) ÷ SUM(den), never the average of row ratios; NULLIF on denominators; watch integer division.
5. **Set operations:** UNION ALL unless you mean to remove duplicates; match columns by name, not position.
6. **Subtotals:** GROUPING SETS / ROLLUP / CUBE with GROUPING() labels; never sum a report that contains subtotals.
7. **Non-additive measures** (distinct counts, ratios, percentiles) are recomputed per level, or merged as sketches.

#### Practise this week

- Redo exercises 1–3 from a blank editor, without hints.
- Rewrite one report query you own with FILTER or CASE instead of several subqueries.
- Find a dashboard that sums distinct users across days, and explain why it is wrong.
- Explain PERCENTILE_CONT vs PERCENTILE_DISC out loud in under a minute.

#### How this connects

This deck builds on *SQL correctness: joins, grain, and NULLs*: aggregates are only right when the rows feeding them are at the right grain. The same ideas reappear in metric definitions (business metrics) and in semantic layers, where each measure declares how it aggregates.

> **The main idea:** aggregates are only as right as the rows and the level they run on: filter at the right stage, divide sums, and never add up what is not additive.

---

<a id="slide-26"></a>
## 26. References and how this deck was tested

*References · official documentation*

- **DuckDB:** [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: WHERE](https://duckdb.org/docs/stable/sql/query_syntax/where), [DuckDB: HAVING](https://duckdb.org/docs/stable/sql/query_syntax/having), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops), [DuckDB: GROUPING SETS, ROLLUP, CUBE](https://duckdb.org/docs/stable/sql/query_syntax/grouping_sets), [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [DuckDB: UNPIVOT](https://duckdb.org/docs/stable/sql/statements/unpivot), [DuckDB: numeric operators (/ and //)](https://duckdb.org/docs/stable/sql/functions/numeric), [DuckDB: CASE](https://duckdb.org/docs/stable/sql/expressions/case), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).
- **PostgreSQL:** [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [PostgreSQL: aggregate expressions and FILTER](https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES), [PostgreSQL: GROUPING()](https://www.postgresql.org/docs/current/functions-aggregate.html#FUNCTIONS-GROUPING-TABLE), [PostgreSQL: UNION, INTERSECT, EXCEPT](https://www.postgresql.org/docs/current/queries-union.html), [PostgreSQL: CASE, COALESCE, NULLIF](https://www.postgresql.org/docs/current/functions-conditional.html), [PostgreSQL: math operators](https://www.postgresql.org/docs/current/functions-math.html), [PostgreSQL: tablefunc crosstab](https://www.postgresql.org/docs/current/tablefunc.html).
- **SQL Server (T-SQL):** [SQL Server: GROUP BY, ROLLUP, CUBE](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql), [SQL Server: GROUPING](https://learn.microsoft.com/en-us/sql/t-sql/functions/grouping-transact-sql), [SQL Server: GROUPING_ID](https://learn.microsoft.com/en-us/sql/t-sql/functions/grouping-id-transact-sql), [SQL Server: PIVOT and UNPIVOT](https://learn.microsoft.com/en-us/sql/t-sql/queries/from-using-pivot-and-unpivot), [SQL Server: EXCEPT and INTERSECT](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/set-operators-except-and-intersect-transact-sql), [SQL Server: division operator](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/divide-transact-sql), [SQL Server: PERCENTILE_CONT](https://learn.microsoft.com/en-us/sql/t-sql/functions/percentile-cont-transact-sql), [SQL Server: APPROX_COUNT_DISTINCT](https://learn.microsoft.com/en-us/sql/t-sql/functions/approx-count-distinct-transact-sql), [SQL Server: APPROX_PERCENTILE_CONT](https://learn.microsoft.com/en-us/sql/t-sql/functions/approx-percentile-cont-transact-sql).
- **Spark SQL:** [Spark SQL: PIVOT](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-pivot.html), [Spark SQL: UNPIVOT](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-unpivot.html), [Spark SQL: built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html).
- **Snowflake:** [Snowflake: QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify), [Snowflake: set operators and UNION BY NAME](https://docs.snowflake.com/en/sql-reference/operators-query), [Snowflake: PIVOT](https://docs.snowflake.com/en/sql-reference/constructs/pivot), [Snowflake: UNPIVOT](https://docs.snowflake.com/en/sql-reference/constructs/unpivot), [Snowflake: APPROX_COUNT_DISTINCT](https://docs.snowflake.com/en/sql-reference/functions/approx_count_distinct), [Snowflake: HLL](https://docs.snowflake.com/en/sql-reference/functions/hll), [Snowflake: APPROX_PERCENTILE](https://docs.snowflake.com/en/sql-reference/functions/approx_percentile).
- **BigQuery:** [BigQuery: query syntax (PIVOT, UNPIVOT, QUALIFY)](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax), [BigQuery: approximate aggregate functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions), [BigQuery: HyperLogLog++ functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions).

**Testing:** built with DuckDB 1.5.6 (Python package) on CPython 3.12.10, Windows 11. This deck and the joins deck come from one build that ran every query of both. The 5-million-row timings ran single-threaded on the build machine and are labelled as measurements. Every SQL block, including exercise prompts and solutions, was executed by the build script against an in-memory DuckDB database; the tables under the queries are the real results. The build compares each result with the numbers stated in the text and fails on any mismatch, any unexpected error, or any multi-row result without `ORDER BY`; it finished with 0 failures. Syntax for other engines appears only in dialect notes and was not executed.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Card share per customer and overall

`GROUP BY ROLLUP (customer)` gives a total row; label it with `GROUPING()`. Use `FILTER` (or `CASE`) for the card amount, `* 1.0` and `NULLIF` for the division.

<a id="hint-2"></a>
### Hint 2 · A pivot that reconciles

Start from `order_items` (the grain of `qty`) and join up to region: both joins are many-to-one, so no fan-out. One `SUM(CASE … ELSE 0 END)` per SKU.

<a id="hint-3"></a>
### Hint 3 · Medians by region, and the overall median

Ordered-set aggregates work with `ROLLUP` like any other aggregate. Label the total row with `GROUPING()`, so it can’t be confused with the real NULL region.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution query below was executed in DuckDB during the build, and its result was checked against the expected rows or totals.

<a id="solution-1"></a>
### Solution 1 · Card share per customer and overall

```sql
SELECT CASE WHEN GROUPING(o.customer) = 1 THEN 'All customers'
            ELSE o.customer END                           AS customer,
       SUM(p.amount)                                      AS paid,
       COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'card'), 0) AS card_paid,
       ROUND(COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'card'), 0) * 1.0
             / NULLIF(SUM(p.amount), 0), 3)               AS card_share
FROM payments p
JOIN orders o ON o.order_id = p.order_id
GROUP BY ROLLUP (o.customer)
ORDER BY GROUPING(o.customer), customer;
```

Result (3 rows):

| customer | paid | card_paid | card_share |
|---|---|---|---|
| Leo | 100 | 100 | 1 |
| Maya | 80 | 55 | 0.688 |
| All customers | 180 | 155 | 0.861 |

**Why it works.** The total row divides the sums (155 ÷ 180 = 0.861), a ratio of sums (lesson 9). The average of the customer shares, (1 + 0.688) ÷ 2 = 0.844, would weight Maya’s 80 the same as Leo’s 100. Maya’s payment 105 has no method: it counts in `paid` but not in `card_paid`, which is the honest treatment of an unknown method. In SQL Server, replace FILTER with `SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END)`.

<a id="solution-2"></a>
### Solution 2 · A pivot that reconciles

```sql
SELECT COALESCE(c.region, 'Unknown')                       AS region,
       SUM(CASE WHEN i.sku = 'KIT'   THEN i.qty ELSE 0 END)   AS kit,
       SUM(CASE WHEN i.sku = 'MUG'   THEN i.qty ELSE 0 END)   AS mug,
       SUM(CASE WHEN i.sku = 'SPOON' THEN i.qty ELSE 0 END)   AS spoon,
       SUM(CASE WHEN i.sku = 'TEA'   THEN i.qty ELSE 0 END)   AS tea,
       SUM(i.qty)                                             AS total_units
FROM order_items i
JOIN orders o    ON o.order_id = i.order_id
JOIN customers c ON c.customer = o.customer
GROUP BY COALESCE(c.region, 'Unknown')
ORDER BY region;
```

Result (3 rows):

| region | kit | mug | spoon | tea | total_units |
|---|---|---|---|---|---|
| East | 1 | 0 | 5 | 2 | 8 |
| Unknown | 0 | 1 | 0 | 1 | 2 |
| West | 0 | 2 | 0 | 2 | 4 |

```sql
SELECT SUM(qty) AS control_units FROM order_items;
```

Result (1 row):

| control_units |
|---|
| 14 |

**Why it works.** Joining from the line table *up* to orders and customers is many-to-one, so each line is counted once. `ELSE 0` turns empty cells into zeros, and `total_units` sums the rows rather than adding the pivot columns, so a SKU missing from the list would show up as a gap between the columns and the total: 8 + 2 + 4 = 14. A DuckDB `PIVOT … USING SUM(qty)` would give NULLs instead of zeros (lesson 14).

<a id="solution-3"></a>
### Solution 3 · Medians by region, and the overall median

```sql
SELECT CASE WHEN GROUPING(c.region) = 1 THEN 'All regions'
            ELSE COALESCE(c.region, 'Unknown') END              AS region,
       COUNT(*)                                                 AS orders,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY o.amount)    AS median_amount,
       percentile_disc(0.9) WITHIN GROUP (ORDER BY o.amount)    AS p90_disc
FROM orders o
JOIN customers c ON c.customer = o.customer
GROUP BY ROLLUP (c.region)
ORDER BY GROUPING(c.region), region;
```

Result (4 rows):

| region | orders | median_amount | p90_disc |
|---|---|---|---|
| East | 2 | 50 | 60 |
| Unknown | 1 | 40 | 40 |
| West | 3 | 25 | 40 |
| All regions | 6 | 40 | 60 |

**Why it works.** The All-regions row is computed from all six rows: sorted amounts 15, 25, 40, 40, 40, 60 give a median of 40. Averaging the regional medians, (50 + 40 + 25) ÷ 3 = 38.33, ignores how many orders each region has and how they are spread; percentiles are non-additive (lesson 16). `p90_disc` is always an actual order amount; `percentile_cont(0.9)` on East would interpolate to 58. In SQL Server, percentiles need `OVER (PARTITION BY …)` and cannot be combined with ROLLUP directly.
