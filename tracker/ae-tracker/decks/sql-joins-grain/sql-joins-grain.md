# SQL correctness: joins, grain, and NULLs

*Companion to `sql-joins-grain.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package, CPython 3.12.10, Windows 11). Queries are written in PostgreSQL-flavoured standard SQL; DuckDB-only syntax is labelled, and lessons have dialect notes for PostgreSQL, SQL Server (T-SQL), Spark SQL, Snowflake, and BigQuery. Every SQL query in this document was executed in DuckDB while it was built, and the result shown under it is the real result. Other-dialect syntax appears only in the dialect tables and was not executed. Timing figures are labelled as measured on the build machine; yours will differ.

**Prerequisites:** the *Window functions* deck (its six-row `orders` table is reused here) and the dimensional modeling decks (grain, fan-out, bridge tables). This deck is one half of the former SQL correctness deck; the other half is *SQL aggregation*. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note. The exercises follow common SQL interview patterns (fan-out, outer-join filters, NOT IN with NULL, as-of joins, conditional aggregation, subtotals, pivots, percentiles), researched in October 2026.

**Additions beyond the original brief** are marked *(added)*: grain tests before and after joins; DISTINCT as a bandage (SUM(DISTINCT)); NULL-safe join keys and change detection; a reconciliation toolkit (control totals, EXCEPT ALL diffs); a grain-first interview routine; a dialect cheat sheet.

## Contents

1. [SQL correctness: joins, grain, and NULLs](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, engine, and dialect](#slide-2)
3. [The SQL lab: six orders and their neighbours](#slide-3)
4. [Five words that prevent most wrong totals](#slide-4)
5. [Join cardinality: predict the row count](#slide-5)
6. [Fan-out: a one-to-many join inflates sums](#slide-6)
7. [Two children of one parent: the multiplication trap](#slide-7)
8. [Pre-aggregate to the grain, then prove it](#slide-8)
9. [DISTINCT is a bandage, not a fix](#slide-9)
10. [Outer joins: ON filters matches, WHERE filters rows](#slide-10)
11. [Semi-joins: “has at least one”, without duplicates](#slide-11)
12. [Anti-joins: “has none”](#slide-12)
13. [EXISTS vs IN vs NOT IN: the NULL trap](#slide-13)
14. [Three-valued logic: true, false, and unknown](#slide-14)
15. [NULLs in filters and CASE: the missing third group](#slide-15)
16. [NULLs in join keys, GROUP BY, and set operations](#slide-16)
17. [NULLs in aggregates and in ORDER BY](#slide-17)
18. [Self-joins: pairs within one table](#slide-18)
19. [Range joins and half-open intervals](#slide-19)
20. [As-of joins: the latest value known at the time](#slide-20)
21. [A reconciliation toolkit](#slide-21)
22. [A grain-first routine for SQL interviews](#slide-22)
23. [Bug clinic: believable queries, wrong answers](#slide-23)
24. [Exercises 1–5: joins, NULLs, and as-of](#slide-24)
25. [Lab: reconcile revenue that several joins inflate](#slide-25)
26. [Lab: the naive model, and where the extra money comes from](#slide-26)
27. [Lab step 1: pre-aggregate to order grain](#slide-27)
28. [Lab step 2: filter with a semi-join](#slide-28)
29. [Lab step 3: weight the bridge](#slide-29)
30. [Lab step 4: sign off against the control totals](#slide-30)
31. [Cheat sheet](#slide-31)
32. [Dialect cheat sheet](#slide-32)
33. [Glossary](#slide-33)
34. [Recap: what to remember](#slide-34)
35. [References and how this deck was tested](#slide-35)
36. [Appendix A · Hints](#appendix-a)
37. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. SQL correctness: joins, grain, and NULLs

**

The most expensive SQL bugs do not raise errors. A join quietly doubles revenue. A `NOT IN` quietly returns nothing. A filter quietly turns an outer join into an inner join. This deck shows each trap with a believable query, its wrong result, the reason, and the fix.

Every query in this deck ran in DuckDB while the deck was built. The result under each query is the real result.

- **Part A · joins and grain:** Cardinality, fan-out, pre-aggregation, outer-join filters, semi and anti joins, NOT IN. Know how many rows a join returns before you run it
- **Part B · NULLs:** Three-valued logic, NULL-safe comparison, NULLs in joins, aggregates, and sorting. Unknown is not false, and not equal to itself
- **Part C · joins beyond equality:** Self-joins, range joins, as-of joins. Match rows by intervals and “latest known value”
- **Part D · verify and practise:** Reconciliation toolkit, interview routine, bug clinic, 5 exercises, 4-step lab. Several joins inflate revenue until you fix them

**Additions beyond the brief** (marked (added)): grain tests before and after joins; DISTINCT as a bandage (SUM(DISTINCT)); NULL-safe join keys and change detection; a reconciliation toolkit (control totals, EXCEPT ALL diffs); a grain-first interview routine; a dialect cheat sheet.

**Part of a split series.** This deck is one lesson of the former “SQL correctness: joins, grain, NULLs, and aggregation” deck. Sibling deck: *SQL aggregation*. Both reuse the same lab tables, so lesson 3 appears in each.

**Companion:** the Markdown version (Markdown ↗) has the same lessons; hints and solutions are in its appendices. Use Contents to jump, Read for article mode.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

The most dangerous SQL bugs do not raise errors: they return believable numbers that are wrong. A join that fans out, a filter that turns an outer join into an inner join, a NOT IN that meets a NULL. Data engineers own the tables that every dashboard sums, so they are expected to catch these before anyone else does.

#### Where you will use it

- Building marts and dbt models that join facts to dimensions and child tables.
- Reconciling a warehouse model with finance, an ERP, or a payment provider.
- Reviewing pull requests: “what is the grain of this join?”.

#### What goes wrong without it

- Revenue doubled by a one-to-many join, reported for weeks.
- Customers with no orders silently vanish from a “per customer” report.
- “Has none” queries that return nothing because of one NULL.

#### Who expects you to know it

- Data and analytics engineers, BI developers, and the finance teams that consume their tables.
- Interviewers: fan-out, NOT IN with NULL, and LEFT JOIN filters are classic trick questions.

> **On the job:** A classic escalation: “the dashboard shows $1.2M but finance says $370K”. The fix is almost never in the dashboard; it is a join at the wrong grain. This deck’s reconciliation lab rehearses exactly that investigation.

> **The main idea:** correct joins, grain and NULL handling are what make numbers trustworthy; reconciliation is how you prove it.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [PostgreSQL: EXISTS, IN, NOT IN](https://www.postgresql.org/docs/current/functions-subquery.html).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Measures from a parent plus a 1:N child | Pre-aggregate the child to the parent key | Prevents fan-out |
| “Customers who have / never …” | Semi-join EXISTS / anti-join NOT EXISTS | No duplicates; NULL-safe |
| Keep every row of one side, filter the other | Condition in LEFT JOIN … ON | WHERE would drop the unmatched rows |
| Value valid at the time of an event | As-of join or half-open range join | No leakage, no fan-out |
| Comparing nullable columns | IS [NOT] DISTINCT FROM | = returns unknown on NULL |

#### How interviews test it

- “Why is this total too high?” (find the fan-out).
- “Why does NOT IN return nothing here?”
- “Customers with no orders in January” (LEFT JOIN filter placement or anti-join).
- Interviewers listen for you to state the grain before writing the join.

#### Where it sits in your learning path

- Builds on: Window functions, Classic SQL patterns, dimensional modeling (grain, bridges).
- Next: SQL aggregation (conditional aggregation, subtotals, pivots, percentiles).
- Later: the same checks as dbt tests and data-quality rules.

> **The main idea:** state the grain first, join on unique keys, use semi/anti joins for existence, handle NULLs explicitly, and reconcile every total to a control.

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
## 5. Join cardinality: predict the row count

*Joins and grain · how many rows will this join return?*

A join pairs each left row with every right row that matches. So the output has, for each left row, as many rows as it has matches. An **inner join** keeps only matched pairs. A **left outer join** also keeps unmatched left rows, padding the right side with NULLs. A **cross join** pairs every row with every row.

#### Row counts, measured

```sql
SELECT 1 AS step, 'customers' AS input, COUNT(*) AS row_count FROM customers
UNION ALL SELECT 2, 'orders', COUNT(*) FROM orders
UNION ALL SELECT 3, 'customers JOIN orders', COUNT(*)
          FROM customers c JOIN orders o ON o.customer = c.customer
UNION ALL SELECT 4, 'customers LEFT JOIN orders', COUNT(*)
          FROM customers c LEFT JOIN orders o ON o.customer = c.customer
UNION ALL SELECT 5, 'orders JOIN order_items', COUNT(*)
          FROM orders o JOIN order_items i ON i.order_id = o.order_id
UNION ALL SELECT 6, 'customers CROSS JOIN orders', COUNT(*) FROM customers CROSS JOIN orders
ORDER BY step;
```

Result (6 rows):

| step | input | row_count |
|---|---|---|
| 1 | customers | 4 |
| 2 | orders | 6 |
| 3 | customers JOIN orders | 6 |
| 4 | customers LEFT JOIN orders | 7 |
| 5 | orders JOIN order_items | 10 |
| 6 | customers CROSS JOIN orders | 24 |

Zoe has no orders: the inner join drops her, the left join keeps her (7 rows). Each order has 1 or 2 items, so the join to items grows from 6 to 10 rows.

#### Is the join key unique on the other side?

```sql
SELECT 'orders.order_id' AS candidate_key, COUNT(*) AS row_count, COUNT(DISTINCT order_id) AS distinct_values FROM orders
UNION ALL SELECT 'order_items.order_id', COUNT(*), COUNT(DISTINCT order_id) FROM order_items
UNION ALL SELECT 'order_items.(order_id, line_no)', COUNT(*), COUNT(DISTINCT (order_id, line_no)) FROM order_items
UNION ALL SELECT 'payments.order_id', COUNT(*), COUNT(DISTINCT order_id) FROM payments
ORDER BY candidate_key;
```

Result (4 rows):

| candidate_key | row_count | distinct_values |
|---|---|---|
| order_items.(order_id, line_no) | 10 | 10 |
| order_items.order_id | 10 | 6 |
| orders.order_id | 6 | 6 |
| payments.order_id | 6 | 5 |

If the key you join on is unique on the right side (a **many-to-one** join), left rows are never repeated. `order_id` is unique in `orders` but not in `order_items` or `payments`. Joining to those repeats orders.

> **On the job:** Before joining to a new table, run the “row count vs distinct key” check above. It takes seconds and answers the most important question: will this join repeat my rows? In dbt this is a `unique` test on the key; in Spark it is `df.groupBy(key).count().filter("count > 1")`.

> **The main idea:** rows out = sum over left rows of max(matches, 1 if outer). If the right-side key is not unique, your left rows will repeat.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-6"></a>
## 6. Fan-out: a one-to-many join inflates sums

*Joins and grain · “revenue and item count per customer”*

**Question:** show revenue and number of items per customer. The amount lives on `orders`; the items live on `order_items`. A single join and a single `GROUP BY` looks natural.

#### ✗ Believable, but wrong

```sql
SELECT o.customer,
       SUM(o.amount)    AS revenue,
       COUNT(i.line_no) AS items
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
GROUP BY o.customer
ORDER BY o.customer;
```

Result (3 rows):

| customer | revenue | items |
|---|---|---|
| Ana | 80 | 2 |
| Leo | 200 | 4 |
| Maya | 120 | 4 |

Revenue adds to **400**, not 220. Every order amount was summed once per item line.

#### ✓ Fixed

```sql
WITH items_per_order AS (      -- one row per order
    SELECT order_id, COUNT(*) AS items
    FROM order_items
    GROUP BY order_id
)
SELECT o.customer,
       SUM(o.amount) AS revenue,
       SUM(i.items)  AS items
FROM orders o
JOIN items_per_order i ON i.order_id = o.order_id
GROUP BY o.customer
ORDER BY o.customer;
```

Result (3 rows):

| customer | revenue | items |
|---|---|---|
| Ana | 40 | 2 |
| Leo | 100 | 4 |
| Maya | 80 | 4 |

Aggregate the many side to the grain of `orders` first. Now the join is one-to-one and nothing repeats.

#### Why

After the join, the grain is *one row per order line*. `o.amount` is an order-level measure, so it appears once per line: order 2 (two lines) contributes 40 + 40. `COUNT(i.line_no)` is correct because items *are* at line grain. Rule: **only sum a measure at its own grain.**

#### Another valid fix

Sum a line-level measure instead: `SUM(i.qty * i.unit_price)` is correct after this join, because it lives at line grain. Pick the measure whose grain matches the rows you are summing.

> **On the job:** Fan-out is the classic “numbers are too high” incident: a new join to a detail table (lines, payments, events, tags) is added to an existing report. In dimensional models it is why measures live on facts at a declared grain, and why you join facts to dimensions many-to-one.

> **The main idea:** after any join, re-state the grain. A measure from the “one” side of a one-to-many join is repeated and must not be summed.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html).

---

<a id="slide-7"></a>
## 7. Two children of one parent: the multiplication trap

*Joins and grain · items × payments per order*

**Question:** per customer, show item revenue and amount paid. Both child tables join to `orders` on `order_id`. Joining both at once pairs every item of an order with every payment of that order. This many-to-many pattern is often called a **chasm trap**.

#### ✗ Believable, but wrong

```sql
SELECT o.customer,
       SUM(i.qty * i.unit_price) AS item_revenue,
       SUM(p.amount)             AS paid
FROM orders o
JOIN order_items i   ON i.order_id = o.order_id
LEFT JOIN payments p ON p.order_id = o.order_id
GROUP BY o.customer
ORDER BY o.customer;
```

Result (3 rows):

| customer | item_revenue | paid |
|---|---|---|
| Ana | 40 | NULL |
| Leo | 100 | 200 |
| Maya | 120 | 120 |

Leo’s revenue looks right (100), so a quick check passes. His payments are doubled, Maya’s revenue and payments are both inflated, and Ana’s paid is NULL, not 0.

#### ✓ Fixed

```sql
WITH items AS (
    SELECT order_id, SUM(qty * unit_price) AS item_revenue
    FROM order_items GROUP BY order_id
), paid AS (
    SELECT order_id, SUM(amount) AS paid
    FROM payments GROUP BY order_id
)
SELECT o.customer,
       SUM(i.item_revenue)       AS item_revenue,
       COALESCE(SUM(p.paid), 0)  AS paid
FROM orders o
LEFT JOIN items i ON i.order_id = o.order_id
LEFT JOIN paid  p ON p.order_id = o.order_id
GROUP BY o.customer
ORDER BY o.customer;
```

Result (3 rows):

| customer | item_revenue | paid |
|---|---|---|
| Ana | 40 | 0 |
| Leo | 100 | 100 |
| Maya | 80 | 80 |

Each child is collapsed to one row per order before joining. Totals: 220 revenue, 180 paid.

#### Why: count the rows per order

```sql
SELECT o.order_id,
       COUNT(DISTINCT i.line_no)    AS item_rows,
       COUNT(DISTINCT p.payment_id) AS payment_rows,
       COUNT(*)                     AS joined_rows
FROM orders o
JOIN order_items i     ON i.order_id = o.order_id
LEFT JOIN payments p   ON p.order_id = o.order_id
GROUP BY o.order_id
ORDER BY o.order_id;
```

Result (6 rows):

| order_id | item_rows | payment_rows | joined_rows |
|---|---|---|---|
| 1 | 1 | 1 | 1 |
| 2 | 2 | 2 | 4 |
| 3 | 2 | 1 | 2 |
| 4 | 1 | 1 | 1 |
| 5 | 2 | 1 | 2 |
| 6 | 2 | 0 | 2 |

Order 2 has 2 items and 2 payments, so 4 joined rows: every item is counted twice and every payment twice. Leo was “right” only because each of his orders has one payment.

#### The general rule

Joining one parent to two independent children gives *items × payments* rows per parent. No measure in that result is at a meaningful grain. Never sum across two 1:N branches in one join.

> **On the job:** This is the most common reason a finance dashboard disagrees with the ledger: orders joined to lines *and* payments (or shipments, refunds, tags) in one model. The fix is always the same: one CTE per child, aggregated to the shared key, then join.

> **The main idea:** if two tables both have many rows per key, aggregate each one to that key first. Then join one-to-one.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-8"></a>
## 8. Pre-aggregate to the grain, then prove it

*Joins and grain · a repeatable pattern and its tests (added)*

1. **State the output grain** (one row per …): e.g. one row per order. Write it as a comment above the query.
2. **Aggregate each child** (GROUP BY the output key): One CTE per detail table, grouped by the key of the output grain.
3. **Join on unique keys** (many-to-one or one-to-one): Every join should match at most one row on the right.
4. **Test the grain** (COUNT(*) = COUNT(DISTINCT key)): If the key repeats, a join fanned out.
5. **Reconcile** (compare to control totals): Sum each measure and compare to the source table’s total.

```sql
WITH items AS (SELECT order_id, SUM(qty * unit_price) AS item_revenue FROM order_items GROUP BY order_id),
     paid  AS (SELECT order_id, SUM(amount) AS paid FROM payments GROUP BY order_id),
     order_grain AS (                 -- one row per order
    SELECT o.order_id, o.amount, i.item_revenue, COALESCE(p.paid, 0) AS paid
    FROM orders o
    LEFT JOIN items i ON i.order_id = o.order_id
    LEFT JOIN paid  p ON p.order_id = o.order_id
)
SELECT COUNT(*)                          AS row_count,
       COUNT(DISTINCT order_id)          AS distinct_orders,
       SUM(item_revenue)                 AS item_revenue,
       (SELECT SUM(amount) FROM orders)  AS revenue_control,
       SUM(paid)                         AS paid,
       (SELECT SUM(amount) FROM payments) AS paid_control
FROM order_grain;
```

Result (1 row):

| row_count | distinct_orders | item_revenue | revenue_control | paid | paid_control |
|---|---|---|---|---|---|
| 6 | 6 | 220 | 220 | 180 | 180 |

#### What a failing test looks like

Run the same test on the wrong query from the previous slide (joined rows, not order grain): 12 rows but only 6 distinct orders, item revenue 260, payments 320. Each number disagrees with its control total, so the bug is caught before anyone reads a dashboard.

#### Pre-aggregate or not?

Pre-aggregation is also faster: it shrinks the detail tables before the join. Modern optimizers sometimes do it for you, but correctness must not depend on that.

> **On the job:** In a dbt project this pattern is a model per grain plus `unique` and `not_null` tests on the key and a reconciliation test (for example `dbt_utils.equality` or a custom “sum matches source” test). In Spark it is `groupBy` before `join`.

> **The main idea:** a model is correct at a grain only if you can prove it: key unique, measures equal to control totals. Make both checks part of the pipeline, not a one-off.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-9"></a>
## 9. DISTINCT is a bandage, not a fix

*Joins and grain · SUM(DISTINCT) and SELECT DISTINCT after a fan-out (added)*

Once people notice duplicates after a join, the quick reflex is to add `DISTINCT`. It removes duplicate *values*, not duplicate *rows of the same entity*. Three orders share the amount 40.

#### ✗ Believable, but wrong

```sql
SELECT SUM(DISTINCT o.amount) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.order_id;
```

Result (1 row):

| revenue |
|---|
| 140 |

25 + 40 + 15 + 60 = **140**. Orders 2, 3, and 6 all have amount 40, so two real orders vanished.

#### ✓ Fixed

```sql
WITH one_row_per_order AS (
    SELECT DISTINCT o.order_id, o.amount      -- the key makes rows distinct
    FROM orders o
    JOIN order_items i ON i.order_id = o.order_id
)
SELECT SUM(amount) AS revenue
FROM one_row_per_order;
```

Result (1 row):

| revenue |
|---|
| 220 |

If you must deduplicate, deduplicate on the key. Better: don’t create the duplicates (pre-aggregate, or use a semi-join, lesson 11).

#### When DISTINCT is fine

`COUNT(DISTINCT o.customer)` after the join is correct: it counts distinct *entities* by their key. The danger is applying DISTINCT to *measures* (amounts, quantities), where equal values are different facts.

#### Code-review signal

SELECT DISTINCT at the top of a big query, or SUM(DISTINCT …) anywhere, means “someone saw duplicates and hid them”. Ask where the duplicates came from.

> **On the job:** DISTINCT also costs a sort or hash over the whole result. On large tables, “fixing” fan-out with DISTINCT is both wrong and slow. The real fix (aggregate first) is usually faster.

> **The main idea:** DISTINCT on a measure deletes legitimate equal values. Deduplicate by key, or better, avoid creating duplicates in the first place.

*Read more:* [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-10"></a>
## 10. Outer joins: ON filters matches, WHERE filters rows

*Joins and grain · “every customer, with revenue since 10 January”*

A **preserved** table is the side an outer join keeps in full (the left side of a `LEFT JOIN`). The other side is **optional**. The engine evaluates `ON` while joining and `WHERE` afterwards. After the join, an unmatched customer has `NULL` in every order column, and `NULL >= date` is not true, so `WHERE` drops that customer.

**Filter on the optional side**

#### ✗ Believable, but wrong

```sql
SELECT c.customer,
       COALESCE(SUM(o.amount), 0) AS late_revenue
FROM customers c
LEFT JOIN orders o ON o.customer = c.customer
WHERE o.order_date >= DATE '2026-01-10'
GROUP BY c.customer
ORDER BY c.customer;
```

Result (2 rows):

| customer | late_revenue |
|---|---|
| Ana | 40 |
| Leo | 60 |

Maya and Zoe disappeared. The `LEFT JOIN` kept them, then `WHERE` removed them.

#### ✓ Fixed

```sql
SELECT c.customer,
       COALESCE(SUM(o.amount), 0) AS late_revenue
FROM customers c
LEFT JOIN orders o
       ON o.customer = c.customer
      AND o.order_date >= DATE '2026-01-10'
GROUP BY c.customer
ORDER BY c.customer;
```

Result (4 rows):

| customer | late_revenue |
|---|---|
| Ana | 40 |
| Leo | 60 |
| Maya | 0 |
| Zoe | 0 |

A condition on the *optional* table belongs in `ON`. It limits which orders match; customers stay.

**Filter on the preserved side**

#### ✗ Believable, but wrong

```sql
SELECT c.customer, c.region,
       COUNT(o.order_id) AS orders
FROM customers c
LEFT JOIN orders o
       ON o.customer = c.customer
      AND c.region = 'West'
GROUP BY c.customer, c.region
ORDER BY c.customer;
```

Result (4 rows):

| customer | region | orders |
|---|---|---|
| Ana | NULL | 0 |
| Leo | East | 0 |
| Maya | West | 3 |
| Zoe | West | 0 |

Goal: West customers only. But every customer is still there; Leo even shows 0 orders, which is false.

#### ✓ Fixed

```sql
SELECT c.customer, c.region,
       COUNT(o.order_id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer = c.customer
WHERE c.region = 'West'
GROUP BY c.customer, c.region
ORDER BY c.customer;
```

Result (2 rows):

| customer | region | orders |
|---|---|---|
| Maya | West | 3 |
| Zoe | West | 0 |

A condition on the *preserved* table belongs in `WHERE`.

#### Rule of thumb

| Condition is about… | Put it in | Because |
|---|---|---|
| the optional table (right side of LEFT JOIN) | `ON` | In WHERE it turns the outer join into an inner join |
| the preserved table (left side) | `WHERE` | In ON it does not remove rows; it only blocks matches |
| “no match at all” (anti-join) | `WHERE right.key IS NULL` | The deliberate exception; lesson 12 |

#### Code-review signal

LEFT JOIN x … WHERE x.col = … is almost always a bug or a disguised inner join. If an inner join is what you mean, write `JOIN`, so the next reader knows.

> **On the job:** Reports that must list every customer, product, or day (including zeros) are built from a complete “spine” table left-joined to facts. One misplaced filter silently removes the zero rows, and nobody notices that 300 inactive stores are missing from the denominator.

> **The main idea:** in an outer join, conditions on the optional side go in ON; conditions on the preserved side go in WHERE.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from), [DuckDB: WHERE](https://duckdb.org/docs/stable/sql/query_syntax/where).

---

<a id="slide-11"></a>
## 11. Semi-joins: “has at least one”, without duplicates

*Joins and grain · EXISTS, IN, and SEMI JOIN*

**Question:** which customers placed an order of 40 or more? A **semi-join** returns each left row that has *at least one* match, once, with only the left table’s columns. It is a filter, not a join that adds rows.

#### ✗ Believable, but wrong

```sql
SELECT c.customer, c.region
FROM customers c
JOIN orders o ON o.customer = c.customer
WHERE o.amount >= 40
ORDER BY c.customer;
```

Result (4 rows):

| customer | region |
|---|---|
| Ana | NULL |
| Leo | East |
| Leo | East |
| Maya | West |

Leo appears twice (orders 3 and 5). Count “big-order customers per region” on top of this and East is double-counted.

#### ✓ Fixed

**EXISTS**

```sql
SELECT c.customer, c.region
FROM customers c
WHERE EXISTS (SELECT 1
              FROM orders o
              WHERE o.customer = c.customer
                AND o.amount >= 40)
ORDER BY c.customer;
```

Result (3 rows):

| customer | region |
|---|---|
| Ana | NULL |
| Leo | East |
| Maya | West |

**IN**

```sql
SELECT customer, region
FROM customers
WHERE customer IN (SELECT customer FROM orders WHERE amount >= 40)
ORDER BY customer;
```

Result (3 rows):

| customer | region |
|---|---|
| Ana | NULL |
| Leo | East |
| Maya | West |

**SEMI JOIN (DuckDB)**

```sql
SELECT c.customer, c.region
FROM customers c
SEMI JOIN orders o
       ON o.customer = c.customer AND o.amount >= 40
ORDER BY c.customer;
```

Result (3 rows):

| customer | region |
|---|---|
| Ana | NULL |
| Leo | East |
| Maya | West |

A **correlated subquery** refers to the outer row (`o.customer = c.customer`). `EXISTS` stops at the first match.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL, SQL Server, Snowflake, BigQuery | `EXISTS` or `IN`; the optimizer plans both as a semi-join. |
| Spark SQL / Databricks | `LEFT SEMI JOIN` (also `EXISTS`/`IN`). |
| DuckDB | `SEMI JOIN` (shown), plus `EXISTS`/`IN`. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### In practice

> **On the job:** Semi-joins answer “active customers”, “products that sold this week”, “orders with at least one shipment”. Use them whenever the other table is only a filter. They cannot fan out, so they are safe to add to a model without changing its grain.

> **The main idea:** if the second table only decides which rows to keep, use EXISTS/IN (a semi-join), not JOIN. A semi-join can never repeat rows.

*Read more:* [PostgreSQL: EXISTS, IN, NOT IN](https://www.postgresql.org/docs/current/functions-subquery.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from), [DuckDB: subqueries](https://duckdb.org/docs/stable/sql/expressions/subqueries), [Spark SQL: joins (LEFT SEMI, LEFT ANTI)](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html).

---

<a id="slide-12"></a>
## 12. Anti-joins: “has none”

*Joins and grain · NOT EXISTS, LEFT JOIN … IS NULL, ANTI JOIN, EXCEPT*

**Question:** which customers did *not* order on 10 January? An **anti-join** returns each left row that has *no* match. The left-join version is easy to get wrong because it combines the previous two lessons.

#### ✗ Believable, but wrong

```sql
SELECT c.customer
FROM customers c
LEFT JOIN orders o ON o.customer = c.customer
WHERE o.order_date = DATE '2026-01-10'
  AND o.order_id IS NULL
ORDER BY c.customer;
```

Result (0 rows):

| customer |
|---|

Zero rows. `WHERE` keeps only rows *with* a 10 January order, then asks for rows with *no* order. Both can’t be true.

#### ✓ Fixed

```sql
SELECT c.customer
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer = c.customer
      AND o.order_date = DATE '2026-01-10')
ORDER BY c.customer;
```

Result (2 rows):

| customer |
|---|
| Maya |
| Zoe |

`NOT EXISTS` states the intent directly and handles NULLs safely (next lesson).

#### Alternatives

**LEFT JOIN … IS NULL**

```sql
SELECT c.customer
FROM customers c
LEFT JOIN orders o
       ON o.customer = c.customer
      AND o.order_date = DATE '2026-01-10'
WHERE o.order_id IS NULL          -- test the join key
ORDER BY c.customer;
```

Result (2 rows):

| customer |
|---|
| Maya |
| Zoe |

**ANTI JOIN (DuckDB)**

```sql
SELECT c.customer
FROM customers c
ANTI JOIN orders o
       ON o.customer = c.customer
      AND o.order_date = DATE '2026-01-10'
ORDER BY c.customer;
```

Result (2 rows):

| customer |
|---|
| Maya |
| Zoe |

**EXCEPT**

```sql
SELECT customer FROM customers
EXCEPT
SELECT customer FROM orders WHERE order_date = DATE '2026-01-10'
ORDER BY customer;
```

Result (2 rows):

| customer |
|---|
| Maya |
| Zoe |

`EXCEPT` compares whole rows and removes duplicates, so it only fits when you need just the key columns.

#### Notes

#### Dialects

| Engine | Syntax and behaviour |
|---|---|
| Spark SQL / Databricks | `LEFT ANTI JOIN` |
| DuckDB | `ANTI JOIN` (shown) |
| Snowflake | `EXCEPT` or its alias `MINUS` |
| All engines | `NOT EXISTS` works everywhere and is the safest default |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Anti-joins find gaps: orders without payment, events without a matching user (orphans), source rows missing from the target after a load. A daily “orphan check” anti-join is one of the cheapest data-quality tests you can add.

> **The main idea:** for “has none”, write NOT EXISTS. If you use LEFT JOIN … IS NULL, put every match condition in ON and test the right table’s key for NULL.

*Read more:* [PostgreSQL: EXISTS, IN, NOT IN](https://www.postgresql.org/docs/current/functions-subquery.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from), [Spark SQL: joins (LEFT SEMI, LEFT ANTI)](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html).

---

<a id="slide-13"></a>
## 13. EXISTS vs IN vs NOT IN: the NULL trap

*Joins and grain · one NULL in a subquery empties the result*

**Question:** which orders have no support ticket? Ticket 902 is a general question, so its `order_id` is `NULL`. That single NULL breaks `NOT IN`.

#### ✗ Believable, but wrong

```sql
SELECT order_id, customer
FROM orders
WHERE order_id NOT IN (SELECT order_id FROM support_tickets)
ORDER BY order_id;
```

Result (0 rows):

| order_id | customer |
|---|---|

Zero rows, and no error. Yesterday, before ticket 902 existed, the same query returned four rows.

#### ✓ Fixed

```sql
SELECT o.order_id, o.customer
FROM orders o
WHERE NOT EXISTS (SELECT 1
                  FROM support_tickets t
                  WHERE t.order_id = o.order_id)
ORDER BY o.order_id;
```

Result (4 rows):

| order_id | customer |
|---|---|
| 1 | Maya |
| 3 | Leo |
| 4 | Maya |
| 6 | Ana |

Or keep `NOT IN` and add `WHERE order_id IS NOT NULL` inside the subquery.

#### Why: NOT IN expands to AND of <>

```sql
SELECT 1 NOT IN (2, 5, NULL)            AS not_in,
       1 <> 2 AND 1 <> 5 AND 1 <> NULL AS expanded,
       2 IN (2, 5, NULL)                AS in_match,
       1 IN (2, 5, NULL)                AS in_no_match;
```

Result (1 row):

| not_in | expanded | in_match | in_no_match |
|---|---|---|---|
| NULL | NULL | true | NULL |

`1 <> NULL` is unknown, so the whole `AND` chain can never be true. `IN` is an `OR` chain: a real match makes it true, so `IN` is safe. `EXISTS` only returns true or false, never unknown.

#### Summary

| Form | If the subquery contains NULL | Safe? |
|---|---|---|
| `EXISTS` / `NOT EXISTS` | Unaffected | Yes |
| `IN` | Matches still found; non-matches become unknown (filtered out anyway) | Yes, in WHERE |
| `NOT IN` | Every row becomes unknown or false → no rows | **No** |
| `NULL NOT IN (…)` on the left | Unknown → that row is dropped | No |

Same behaviour in PostgreSQL, SQL Server (default `ANSI_NULLS ON`), Spark, Snowflake, BigQuery, and DuckDB: it is standard SQL.

> **On the job:** This bug appears months after deployment, the day the first NULL arrives upstream. Lint for `NOT IN (SELECT …)` in code review and replace it with `NOT EXISTS`. Optimizers also plan `NOT EXISTS` as a plain anti-join; nullable `NOT IN` needs extra NULL handling.

> **The main idea:** never use NOT IN with a subquery. Write NOT EXISTS. IN and EXISTS are interchangeable for positive filters.

*Read more:* [PostgreSQL: EXISTS, IN, NOT IN](https://www.postgresql.org/docs/current/functions-subquery.html), [DuckDB: subqueries](https://duckdb.org/docs/stable/sql/expressions/subqueries), [SQL Server: IN](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/in-transact-sql), [Spark SQL: NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html).

---

<a id="slide-14"></a>
## 14. Three-valued logic: true, false, and unknown

*NULLs · the truth table behind every NULL bug*

`NULL` means “value unknown or missing”. Any comparison with NULL is neither true nor false but **unknown** (SQL represents it as a NULL boolean). This is **three-valued logic**. `WHERE`, `ON`, and `HAVING` keep a row only when the condition is *true*.

#### The full truth table (run in DuckDB)

```sql
SELECT a, b,
       a AND b AS a_and_b,
       a OR b  AS a_or_b,
       NOT a   AS not_a,
       a = b   AS a_eq_b
FROM (VALUES (TRUE), (FALSE), (NULL)) x(a)
CROSS JOIN (VALUES (TRUE), (FALSE), (NULL)) y(b)
ORDER BY a DESC NULLS LAST, b DESC NULLS LAST;
```

Result (9 rows):

| a | b | a_and_b | a_or_b | not_a | a_eq_b |
|---|---|---|---|---|---|
| true | true | true | true | false | true |
| true | false | false | true | false | false |
| true | NULL | NULL | true | false | NULL |
| false | true | false | true | true | false |
| false | false | false | false | true | true |
| false | NULL | false | NULL | true | NULL |
| NULL | true | NULL | true | NULL | NULL |
| NULL | false | false | NULL | NULL | NULL |
| NULL | NULL | NULL | NULL | NULL | NULL |

#### Read it like this

- **Unknown AND false = false.** One false side decides it.
- **Unknown OR true = true.** One true side decides it.
- **NOT unknown = unknown.** Negating does not rescue a NULL; that is why both `x = 1` and `NOT (x = 1)` drop NULL rows.
- **NULL = NULL is unknown**, not true.

```sql
SELECT NULL = NULL                   AS eq,
       NULL IS NULL                   AS is_null,
       NULL IS NOT DISTINCT FROM NULL AS null_safe_eq,
       1 IS DISTINCT FROM NULL        AS null_safe_ne;
```

Result (1 row):

| eq | is_null | null_safe_eq | null_safe_ne |
|---|---|---|---|
| NULL | true | true | true |

`IS [NOT] DISTINCT FROM` is the **null-safe** comparison: it treats two NULLs as equal and never returns unknown.

> **On the job:** When a filtered count looks too small, check how many rows have NULL in the filtered column: `COUNT(*) - COUNT(col)`. Note that `CHECK` constraints are the opposite of `WHERE`: a check that evaluates to unknown *passes*, so `CHECK (amount > 0)` still accepts NULL amounts unless the column is `NOT NULL`.

> **The main idea:** WHERE keeps only true. Anything compared with NULL is unknown, and unknown is filtered out exactly like false.

*Read more:* [PostgreSQL: logical operators](https://www.postgresql.org/docs/current/functions-logical.html), [PostgreSQL: comparison operators and IS DISTINCT FROM](https://www.postgresql.org/docs/current/functions-comparison.html), [DuckDB: logical operators](https://duckdb.org/docs/stable/sql/expressions/logical_operators), [DuckDB: NULL values](https://duckdb.org/docs/stable/sql/data_types/nulls), [Spark SQL: NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html).

---

<a id="slide-15"></a>
## 15. NULLs in filters and CASE: the missing third group

*NULLs · “customers outside the West”*

**Question:** list customers who are not in the West region. Ana’s region is unknown. Most business users would want her on the list, flagged.

#### ✗ Believable, but wrong

```sql
SELECT customer, region
FROM customers
WHERE region <> 'West'
ORDER BY customer;
```

Result (1 row):

| customer | region |
|---|---|
| Leo | East |

Ana is missing. `NULL <> 'West'` is unknown.

#### ✓ Fixed

```sql
SELECT customer, region
FROM customers
WHERE region IS DISTINCT FROM 'West'
ORDER BY customer;
```

Result (2 rows):

| customer | region |
|---|---|
| Ana | NULL |
| Leo | East |

Or `WHERE region <> 'West' OR region IS NULL`, which works in every engine.

#### CASE goes the other way

```sql
SELECT customer, region,
       CASE WHEN region = 'West'  THEN 'West' ELSE 'Not West' END AS label_a,
       CASE WHEN region <> 'West' THEN 'Not West' ELSE 'West' END AS label_b,
       CASE WHEN region IS NULL   THEN 'Unknown'
            WHEN region = 'West'  THEN 'West'
            ELSE 'Not West' END                                   AS label_fixed
FROM customers
ORDER BY customer;
```

Result (4 rows):

| customer | region | label_a | label_b | label_fixed |
|---|---|---|---|---|
| Ana | NULL | Not West | West | Unknown |
| Leo | East | Not West | Not West | Not West |
| Maya | West | West | West | West |
| Zoe | West | West | West | West |

`WHERE` drops unknown rows, but `CASE` sends them to `ELSE`. So two “equivalent” labels disagree on Ana. Handle NULL in its own branch first.

#### Dialects

#### Null-safe comparison

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL, DuckDB, Snowflake, BigQuery | `IS [NOT] DISTINCT FROM` |
| SQL Server | `IS [NOT] DISTINCT FROM` from SQL Server 2022; before that, null-safe equality is `(a = b OR (a IS NULL AND b IS NULL))` |
| Spark SQL | `<=>` null-safe equality, and `IS [NOT] DISTINCT FROM` |
| Snowflake | also `EQUAL_NULL(a, b)` |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Status filters such as `WHERE status <> 'cancelled'` silently drop rows whose status has not been set yet. In a pipeline, that is revenue that never reaches the report. Decide explicitly what unknown means and write it in the query.

> **The main idea:** every filter on a nullable column has three outcomes. Decide where unknown goes, write it explicitly, and check that WHERE and CASE agree.

*Read more:* [PostgreSQL: comparison operators and IS DISTINCT FROM](https://www.postgresql.org/docs/current/functions-comparison.html), [PostgreSQL: CASE, COALESCE, NULLIF](https://www.postgresql.org/docs/current/functions-conditional.html), [DuckDB: comparison operators](https://duckdb.org/docs/stable/sql/expressions/comparison_operators), [DuckDB: CASE](https://duckdb.org/docs/stable/sql/expressions/case), [SQL Server: IS [NOT] DISTINCT FROM](https://learn.microsoft.com/en-us/sql/t-sql/queries/is-distinct-from-transact-sql).

---

<a id="slide-16"></a>
## 16. NULLs in join keys, GROUP BY, and set operations

*NULLs · change detection with a nullable column (added)*

**Question:** which customers changed since yesterday’s snapshot? Only Zoe moved (East → West). Comparing every column with `=` also flags Ana, whose region is NULL on both days.

#### ✗ Believable, but wrong

```sql
WITH yesterday AS (
    SELECT * FROM (VALUES ('Maya', 'West'), ('Leo', 'East'), ('Ana', NULL), ('Zoe', 'East'))
           AS v(customer, region)
)
SELECT t.customer, t.region AS region_today
FROM customers t
LEFT JOIN yesterday y
       ON y.customer = t.customer
      AND y.region = t.region
WHERE y.customer IS NULL
ORDER BY t.customer;
```

Result (2 rows):

| customer | region_today |
|---|---|
| Ana | NULL |
| Zoe | West |

Ana is reported as changed every single day, because `NULL = NULL` is not true.

#### ✓ Fixed

```sql
WITH yesterday AS (
    SELECT * FROM (VALUES ('Maya', 'West'), ('Leo', 'East'), ('Ana', NULL), ('Zoe', 'East'))
           AS v(customer, region)
)
SELECT t.customer, t.region AS region_today
FROM customers t
LEFT JOIN yesterday y
       ON y.customer = t.customer
      AND y.region IS NOT DISTINCT FROM t.region
WHERE y.customer IS NULL
ORDER BY t.customer;
```

Result (1 row):

| customer | region_today |
|---|---|
| Zoe | West |

```sql
WITH yesterday AS (
    SELECT * FROM (VALUES ('Maya', 'West'), ('Leo', 'East'), ('Ana', NULL), ('Zoe', 'East'))
           AS v(customer, region)
)
SELECT customer, region FROM customers
EXCEPT
SELECT customer, region FROM yesterday
ORDER BY customer;
```

Result (1 row):

| customer | region |
|---|---|
| Zoe | West |

Set operations treat NULLs as equal, so `EXCEPT` gets it right too.

#### Where are two NULLs “the same”?

| Operation | NULL vs NULL |
|---|---|
| `=` in `WHERE`, `ON`, `CASE` | Unknown (not equal) |
| `GROUP BY`, `DISTINCT`, `PARTITION BY` | Same group |
| `UNION`, `INTERSECT`, `EXCEPT` | Equal |
| `UNIQUE` constraint | PostgreSQL, DuckDB: many NULLs allowed. SQL Server unique index: only one NULL. |

```sql
SELECT region, COUNT(*) AS customers
FROM customers
GROUP BY region
ORDER BY region NULLS FIRST;
```

Result (3 rows):

| region | customers |
|---|---|
| NULL | 1 |
| East | 1 |
| West | 2 |

#### In practice

> **On the job:** Change detection (slowly changing dimensions, `MERGE` statements, CDC comparisons) compares many columns between a source and a target. Use `IS DISTINCT FROM` for every nullable column, or compare a hash of the row. Otherwise every row with a NULL looks changed on every run, which creates endless new SCD2 versions.

Some engines can’t use a hash join on `IS NOT DISTINCT FROM` keys. An alternative is to join on `COALESCE(col, '~none~')` with a sentinel value that cannot occur in the data.

> **The main idea:** joins never match NULL to NULL, but GROUP BY and set operations do. For nullable comparison columns, use IS NOT DISTINCT FROM or EXCEPT.

*Read more:* [PostgreSQL: comparison operators and IS DISTINCT FROM](https://www.postgresql.org/docs/current/functions-comparison.html), [DuckDB: comparison operators](https://duckdb.org/docs/stable/sql/expressions/comparison_operators), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops), [Spark SQL: NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html).

---

<a id="slide-17"></a>
## 17. NULLs in aggregates and in ORDER BY

*NULLs · what SUM, AVG, COUNT, and sorting do with unknowns*

Aggregate functions skip NULL inputs (except `COUNT(*)`, which counts rows). Over zero rows, or only NULLs, `SUM`, `AVG`, `MIN`, and `MAX` return NULL, not 0.

#### Skipping NULLs

```sql
SELECT COUNT(*)               AS payment_rows,
       COUNT(method)          AS with_method,
       COUNT(DISTINCT method) AS distinct_methods,
       SUM(amount)            AS paid,
       (SELECT SUM(amount) FROM payments WHERE order_id = 6) AS paid_for_order_6
FROM payments;
```

Result (1 row):

| payment_rows | with_method | distinct_methods | paid | paid_for_order_6 |
|---|---|---|---|---|
| 6 | 5 | 2 | 180 | NULL |

Order 6 has no payments, so its sum is NULL. Use `COALESCE(SUM(amount), 0)` when 0 is the honest answer.

#### AVG: which denominator?

```sql
WITH ratings(order_id, stars) AS (
    VALUES (1, 5), (2, NULL), (3, 4), (4, NULL), (5, 2)
)
SELECT AVG(stars)              AS avg_of_rated,
       AVG(COALESCE(stars, 0)) AS nulls_as_zero,
       COUNT(stars)            AS rated_orders,
       COUNT(*)                AS all_orders
FROM ratings;
```

Result (1 row):

| avg_of_rated | nulls_as_zero | rated_orders | all_orders |
|---|---|---|---|
| 3.666666667 | 2.2 | 3 | 5 |

3.67 is the average among rated orders. 2.2 pretends unrated orders scored zero stars, which is false. Neither is “the” average: report the denominator with it.

#### Sorting NULLs

```sql
SELECT customer, region
FROM customers
ORDER BY region DESC, customer;
```

Result (4 rows):

| customer | region |
|---|---|
| Maya | West |
| Zoe | West |
| Leo | East |
| Ana | NULL |

DuckDB puts NULLs last by default, for both `ASC` and `DESC`. PostgreSQL would put Ana *first* here. Write `NULLS FIRST` or `NULLS LAST` when order matters.

#### Default NULL order

| Engine | Syntax and behaviour |
|---|---|
| DuckDB | NULLS LAST for ASC and DESC (setting `default_null_order`) |
| PostgreSQL, Snowflake | NULLs sort as larger than any value: last in ASC, first in DESC |
| SQL Server | NULLs sort as smaller: first in ASC, last in DESC; no `NULLS FIRST/LAST` syntax, use `ORDER BY CASE WHEN col IS NULL THEN 1 ELSE 0 END, col` |
| Spark SQL, BigQuery | First in ASC, last in DESC; `NULLS FIRST/LAST` supported |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** “Top 10 by revenue DESC” in PostgreSQL or Snowflake returns NULL-revenue rows first, and the same query in DuckDB does not. When you port SQL between engines, or compare outputs during a migration, NULL ordering and `LIMIT` are a common source of mismatches.

> **The main idea:** aggregates ignore NULLs; empty sums are NULL; AVG’s denominator is the non-NULL count. Never rely on the default NULL sort order.

*Read more:* [PostgreSQL: aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html), [PostgreSQL: sorting rows and NULLS FIRST/LAST](https://www.postgresql.org/docs/current/queries-order.html), [DuckDB: ORDER BY and NULL order](https://duckdb.org/docs/stable/sql/query_syntax/orderby), [SQL Server: ORDER BY](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql), [Spark SQL: ORDER BY](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-orderby.html).

---

<a id="slide-18"></a>
## 18. Self-joins: pairs within one table

*Beyond equality · “repeat orders within 7 days”*

A **self-join** joins a table to itself under two aliases, so each row can be compared with other rows of the same table. **Question:** list every pair of orders by the same customer placed within 7 days of each other.

#### ✗ Believable, but wrong

```sql
SELECT a.customer,
       a.order_id AS first_order,
       b.order_id AS later_order
FROM orders a
JOIN orders b ON b.customer = a.customer
WHERE b.order_date - a.order_date <= 7
ORDER BY a.customer, first_order, later_order;
```

Result (14 rows):

| customer | first_order | later_order |
|---|---|---|
| Ana | 6 | 6 |
| Leo | 3 | 3 |
| Leo | 3 | 5 |
| Leo | 5 | 3 |
| Leo | 5 | 5 |
| Maya | 1 | 1 |
| Maya | 1 | 2 |
| Maya | 1 | 4 |
| Maya | 2 | 1 |
| Maya | 2 | 2 |
| Maya | 2 | 4 |
| Maya | 4 | 1 |
| Maya | 4 | 2 |
| Maya | 4 | 4 |

14 “pairs” for 4 real ones. Every order pairs with itself (0 days), and every pair appears twice, once backwards (a negative gap is also ≤ 7).

#### ✓ Fixed

```sql
SELECT a.customer,
       a.order_id AS first_order,
       b.order_id AS later_order,
       b.order_date - a.order_date AS days_apart
FROM orders a
JOIN orders b
  ON  b.customer = a.customer
  AND b.order_id > a.order_id            -- each pair once, no self-pairs
  AND b.order_date - a.order_date BETWEEN 0 AND 7
ORDER BY a.customer, first_order, later_order;
```

Result (4 rows):

| customer | first_order | later_order | days_apart |
|---|---|---|---|
| Leo | 3 | 5 | 5 |
| Maya | 1 | 2 | 2 |
| Maya | 1 | 4 | 6 |
| Maya | 2 | 4 | 4 |

`b.order_id > a.order_id` removes self-pairs and mirror pairs. It relies on IDs increasing over time; otherwise compare `(order_date, order_id)`.

#### Row growth

A customer with *n* orders produces *n*² rows in an unrestricted self-join: Maya’s 3 orders give 9. On real data (a customer with 10,000 events) that is 100 million rows. Always restrict the pairing (ordering condition, time window) inside `ON`.

#### Self-join or window?

For “the previous/next row” questions, `LAG`/`LEAD` (window-functions deck) read each row once and avoid the pair explosion. Self-joins remain the right tool for “all pairs within a window”, hierarchies (employee → manager), and comparing two versions of the same table.

> **On the job:** Self-joins show up in fraud and duplicate detection (“two payments with the same card within 60 seconds”), in sessionisation checks, and in SCD validation (“no two versions of a customer overlap in time”).

> **The main idea:** in a self-join, decide whether pairs are ordered and whether a row may pair with itself, and say so in ON. Otherwise you get n² rows and double-counted pairs.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-19"></a>
## 19. Range joins and half-open intervals

*Beyond equality · “revenue per promotion period”*

A **range join** matches rows by an inequality, for example “order date falls inside a period”. Periods are safest as **half-open intervals** `[start, end)`: the start is included, the end is not, so adjacent periods share a boundary without overlapping. Here, `end_date` is exclusive: NEWYEAR ends where WINTER starts.

#### ✗ Believable, but wrong

```sql
SELECT p.promo, SUM(o.amount) AS revenue
FROM orders o
JOIN promo_periods p
  ON o.order_date BETWEEN p.start_date AND p.end_date
GROUP BY p.promo
ORDER BY p.promo;
```

Result (2 rows):

| promo | revenue |
|---|---|
| NEWYEAR | 105 |
| WINTER | 195 |

Total 300, not 220. `BETWEEN` includes both ends, so the two orders of 5 January match both periods.

#### ✓ Fixed

```sql
SELECT p.promo, SUM(o.amount) AS revenue
FROM orders o
JOIN promo_periods p
  ON  o.order_date >= p.start_date
  AND o.order_date <  p.end_date
GROUP BY p.promo
ORDER BY p.promo;
```

Result (2 rows):

| promo | revenue |
|---|---|
| NEWYEAR | 25 |
| WINTER | 195 |

`>= start AND < end`. Each date falls in exactly one period. Total 220.

#### Test it: matches per row, and overlaps

```sql
SELECT o.order_id, COUNT(p.promo) AS matching_periods
FROM orders o
LEFT JOIN promo_periods p
  ON o.order_date BETWEEN p.start_date AND p.end_date
GROUP BY o.order_id
ORDER BY o.order_id;
```

Result (6 rows):

| order_id | matching_periods |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | 2 |
| 4 | 1 |
| 5 | 1 |
| 6 | 1 |

```sql
SELECT a.promo AS period_a, b.promo AS period_b
FROM promo_periods a
JOIN promo_periods b
  ON  a.promo < b.promo
  AND a.start_date < b.end_date      -- standard overlap test
  AND b.start_date < a.end_date      -- for half-open intervals
ORDER BY period_a, period_b;
```

Result (0 rows):

| period_a | period_b |
|---|---|

Every fact row should match exactly one period, and no two periods should overlap. Zero rows from the overlap check is the passing result.

#### Why half-open

- With timestamps, `BETWEEN '2026-01-01' AND '2026-01-31'` misses everything after midnight on the 31st. `>= '2026-01-01' AND < '2026-02-01'` does not.
- The next period’s start is the previous period’s end: no gaps, no overlaps, no “minus one day/second” arithmetic.
- Range joins can’t use a plain hash join. DuckDB uses special range-join algorithms; large range joins in Spark often need bucketing or a Databricks range-join hint.

> **On the job:** Range joins appear with slowly changing dimensions (`valid_from`/`valid_to`), price lists, campaigns, fiscal calendars, and IP-range lookups. A one-day overlap in an SCD table doubles every fact on that day.

> **The main idea:** store periods as [start, end) and join with >= start AND < end. Then test: every fact matches one period, and no periods overlap.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from), [PostgreSQL: comparison operators and IS DISTINCT FROM](https://www.postgresql.org/docs/current/functions-comparison.html).

---

<a id="slide-20"></a>
## 20. As-of joins: the latest value known at the time

*Beyond equality · “the customer’s tier when each order was placed”*

An **as-of join** matches each row to the most recent row on the other side whose timestamp is at or before it. `tier_history` stores only the date each tier started (`valid_from`), which is common for event-style history tables. An open-ended range join matches *every* earlier tier, not just the latest.

#### ✗ Believable, but wrong

```sql
SELECT o.order_id, o.customer, o.order_date, t.tier
FROM orders o
LEFT JOIN tier_history t
       ON t.customer = o.customer
      AND t.valid_from <= o.order_date
ORDER BY o.order_id, t.valid_from;
```

Result (8 rows):

| order_id | customer | order_date | tier |
|---|---|---|---|
| 1 | Maya | 2026-01-03 | Silver |
| 2 | Maya | 2026-01-05 | Silver |
| 2 | Maya | 2026-01-05 | Gold |
| 3 | Leo | 2026-01-05 | NULL |
| 4 | Maya | 2026-01-09 | Silver |
| 4 | Maya | 2026-01-09 | Gold |
| 5 | Leo | 2026-01-10 | Silver |
| 6 | Ana | 2026-01-10 | Bronze |

8 rows from 6 orders. Orders 2 and 4 match both Silver and Gold, so any revenue-by-tier report double-counts them. Order 3 has no tier yet (Leo became Silver on 6 January): NULL is correct there.

#### ✓ Fixed

**ASOF JOIN (DuckDB)**

```sql
SELECT o.order_id, o.customer, o.order_date, t.tier
FROM orders o
ASOF LEFT JOIN tier_history t
       ON t.customer = o.customer
      AND o.order_date >= t.valid_from
ORDER BY o.order_id;
```

Result (6 rows):

| order_id | customer | order_date | tier |
|---|---|---|---|
| 1 | Maya | 2026-01-03 | Silver |
| 2 | Maya | 2026-01-05 | Gold |
| 3 | Leo | 2026-01-05 | NULL |
| 4 | Maya | 2026-01-09 | Gold |
| 5 | Leo | 2026-01-10 | Silver |
| 6 | Ana | 2026-01-10 | Bronze |

**LATERAL … LIMIT 1**

```sql
SELECT o.order_id, o.customer, o.order_date, t.tier
FROM orders o
LEFT JOIN LATERAL (
    SELECT h.tier
    FROM tier_history h
    WHERE h.customer = o.customer
      AND h.valid_from <= o.order_date
    ORDER BY h.valid_from DESC
    LIMIT 1
) t ON TRUE
ORDER BY o.order_id;
```

Result (6 rows):

| order_id | customer | order_date | tier |
|---|---|---|---|
| 1 | Maya | 2026-01-03 | Silver |
| 2 | Maya | 2026-01-05 | Gold |
| 3 | Leo | 2026-01-05 | NULL |
| 4 | Maya | 2026-01-09 | Gold |
| 5 | Leo | 2026-01-10 | Silver |
| 6 | Ana | 2026-01-10 | Bronze |

**LEAD → valid_to, range join**

```sql
WITH tiers AS (
    SELECT customer, tier, valid_from,
           LEAD(valid_from, 1, DATE '9999-12-31')
               OVER (PARTITION BY customer ORDER BY valid_from) AS valid_to
    FROM tier_history
)
SELECT o.order_id, o.customer, o.order_date, t.tier
FROM orders o
LEFT JOIN tiers t
       ON t.customer = o.customer
      AND o.order_date >= t.valid_from
      AND o.order_date <  t.valid_to
ORDER BY o.order_id;
```

Result (6 rows):

| order_id | customer | order_date | tier |
|---|---|---|---|
| 1 | Maya | 2026-01-03 | Silver |
| 2 | Maya | 2026-01-05 | Gold |
| 3 | Leo | 2026-01-05 | NULL |
| 4 | Maya | 2026-01-09 | Gold |
| 5 | Leo | 2026-01-10 | Silver |
| 6 | Ana | 2026-01-10 | Bronze |

All three return one row per order. The `LEAD` version turns history into half-open intervals (previous lesson) and works in every engine.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB | `ASOF [LEFT] JOIN … ON key = key AND a.ts >= b.ts` (shown) |
| Snowflake | `ASOF JOIN t MATCH_CONDITION (o.order_date >= t.valid_from) ON t.customer = o.customer` |
| SQL Server | `OUTER APPLY (SELECT TOP (1) tier FROM tier_history h WHERE … ORDER BY valid_from DESC) t` |
| PostgreSQL | `LEFT JOIN LATERAL (… ORDER BY valid_from DESC LIMIT 1) t ON TRUE` (shown) |
| Spark SQL, BigQuery | No as-of join in SQL: derive `valid_to` with `LEAD` and range-join (shown) |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

#### In practice

> **On the job:** As-of joins attach the exchange rate, price, customer tier, or sensor calibration that was valid at event time. Using the *current* value instead (a plain join to the latest row) silently rewrites history: last year’s orders get today’s tier. In finance and ML feature pipelines that is called **leakage** when future information leaks into past rows.

> **The main idea:** for “value at that time”, use an as-of join or build [valid_from, valid_to) intervals. A bare valid_from <= event_date join fans out.

*Read more:* [DuckDB: ASOF JOIN guide](https://duckdb.org/docs/stable/guides/sql_features/asof_join), [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from), [Snowflake: ASOF JOIN](https://docs.snowflake.com/en/sql-reference/constructs/asof-join), [SQL Server: FROM, APPLY](https://learn.microsoft.com/en-us/sql/t-sql/queries/from-transact-sql), [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html).

---

<a id="slide-21"></a>
## 21. A reconciliation toolkit

*Verify · prove a result before anyone reads it (added)*

**Reconciliation** means proving that a derived table agrees with its source: same rows, same totals, at the stated grain. A **full outer join** keeps unmatched rows from *both* sides, which makes it the natural tool for comparing two tables key by key. Here a revenue-by-customer report was built with the fan-out bug from lesson 6.

```sql
WITH report AS (            -- built with the lesson-6 fan-out bug
    SELECT o.customer, SUM(o.amount) AS revenue
    FROM orders o
    JOIN order_items i ON i.order_id = o.order_id
    GROUP BY o.customer
), source AS (
    SELECT customer, SUM(amount) AS revenue
    FROM orders
    GROUP BY customer
)
SELECT COALESCE(s.customer, r.customer)                AS customer,
       s.revenue                                       AS source_revenue,
       r.revenue                                       AS report_revenue,
       COALESCE(r.revenue, 0) - COALESCE(s.revenue, 0) AS difference
FROM source s
FULL OUTER JOIN report r ON r.customer = s.customer
WHERE s.revenue IS DISTINCT FROM r.revenue
ORDER BY customer;
```

Result (3 rows):

| customer | source_revenue | report_revenue | difference |
|---|---|---|---|
| Ana | 40 | 80 | 40 |
| Leo | 100 | 200 | 100 |
| Maya | 80 | 120 | 40 |

#### The checks, cheapest first

| Check | Query shape | Catches |
|---|---|---|
| Row count | `COUNT(*)` source vs target | Lost or duplicated rows (mostly) |
| Control totals | `SUM(measure)` per layer | Fan-out, filters, lost rows |
| Grain / key uniqueness | `COUNT(*) = COUNT(DISTINCT key)` | Fan-out at the output grain |
| Orphans | `NOT EXISTS` to the parent / dimension | Missing dimension rows, broken keys |
| Per-key diff | `FULL OUTER JOIN … WHERE a IS DISTINCT FROM b` | Which keys disagree, and by how much |
| Row diff | two-way `EXCEPT ALL` | Offsetting errors that totals hide (the *SQL aggregation* deck) |

#### Practical rules

- Compare at the **same grain and filters**: same date range, same status rules, same currency.
- Use `IS DISTINCT FROM` so a NULL on one side counts as a difference.
- Decide tolerances up front: 0 for money, a small % for approximate metrics.
- Record results in a table with a run timestamp, so drift is visible over time.

> **On the job:** Mature pipelines run these checks on every load and fail the run (or alert) when a check fails. dbt tests, Great Expectations, and Fabric/Databricks data-quality rules are all ways of scheduling these same queries.

> **The main idea:** totals tell you something is wrong; per-key diffs tell you where. Run both, at the same grain, as part of the pipeline.

*Read more:* [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [PostgreSQL: UNION, INTERSECT, EXCEPT](https://www.postgresql.org/docs/current/queries-union.html), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops), [PostgreSQL: comparison operators and IS DISTINCT FROM](https://www.postgresql.org/docs/current/functions-comparison.html).

---

<a id="slide-22"></a>
## 22. A grain-first routine for SQL interviews

*Verify · say it out loud, then write it (added)*

1. **Restate the output** (one row per …): “So the result is one row per customer per month, with revenue and order count?”
2. **Name each table’s grain and key** (and NULLable columns): “orders is one row per order; payments can have several per order; region can be NULL.”
3. **Predict each join** (1:1, N:1, 1:N, N:M): Any 1:N join before an aggregate is a fan-out risk: pre-aggregate or semi-join.
4. **Write CTEs per grain** (aggregate, then join): One CTE per detail table at the output key; join on unique keys.
5. **Ask the NULL questions** (outer joins, NOT IN, CASE, COUNT): Where do unknowns go? Which COUNT? Which denominator?
6. **Test on a counterexample** (two children, a tie, a NULL): Walk 3–4 rows through the query by hand, then state how you would reconcile it.

| If you hear… | Reach for… | Lesson |
|---|---|---|
| “customers who have / ever …” | Semi-join: `EXISTS` / `IN` | 11 |
| “never / without / missing” | Anti-join: `NOT EXISTS` | 12–13 |
| “including those with zero” | Spine table + `LEFT JOIN`, condition in `ON`, `COUNT(right.key)` | 10, aggregation deck |
| “at the time of” / “as of” | As-of join or `[valid_from, valid_to)` | 19–20 |

> **On the job:** Interviewers for data-engineering roles care less about clever syntax than about whether you notice grain and NULLs unprompted. Saying “orders to payments is one-to-many, so I’ll aggregate payments first” before writing the join is often the moment that earns the hire signal.

> **The main idea:** state the grain, predict every join’s cardinality, aggregate before joining, ask where NULLs go, and test on a tiny counterexample.

---

<a id="slide-23"></a>
## 23. Bug clinic: believable queries, wrong answers

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | Revenue too high after adding a join | Fan-out: a 1:N join repeats parent measures | Pre-aggregate the child; sum measures at their own grain | 6, 8 |
| 2 | Two measures both inflated, one customer looks right | Two 1:N children joined at once (items × payments) | One CTE per child at the shared key | 7 |
| 3 | Totals too low after a “dedupe” | `SUM(DISTINCT)` / `UNION` removed equal legitimate values | Deduplicate by key; `UNION ALL` | 9, aggregation deck |
| 4 | Zero rows / missing zero rows | Condition on the optional table in `WHERE` | Move it to `ON` | 10 |
| 5 | Customers listed twice | Join used as a filter | `EXISTS` / `IN` / semi-join | 11 |
| 6 | “Has none” query returns nothing | `NOT IN` with a NULL; anti-join filter in WHERE | `NOT EXISTS`; conditions in ON | 12, 13 |
| 7 | Rows silently missing from a filter | `col <> x` on a nullable column | `IS DISTINCT FROM` or explicit `OR col IS NULL` | 14, 15 |
| 8 | Every row with a NULL looks “changed” | `=` on nullable columns in change detection | `IS NOT DISTINCT FROM`, `EXCEPT`, or row hashes | 16 |
| 9 | Average too high or too low | NULLs excluded (or turned into 0) silently | Choose the denominator; report it | 17 |
| 10 | Pairs doubled; n² rows | Self-join without ordering condition | `b.id > a.id`; restrict in ON | 18 |
| 11 | Boundary day counted twice | `BETWEEN` on adjacent periods | Half-open `>= start AND < end` | 19 |
| 12 | Historic rows show today’s attribute, or fan out | Plain or open-ended join to history | As-of join or `[valid_from, valid_to)` | 20 |
| 13 | Totals match but data is wrong | Offsetting missing + duplicate rows | Two-way `EXCEPT ALL` / per-key diff | aggregation deck, 21 |

> **On the job:** None of these raise an error. They are found by reconciliation checks, grain tests, and reviewers who ask “what is the grain?” and “what happens with NULL?”. Bring this table to your next code review.

> **The main idea:** silent SQL bugs come from three places: grain (fan-out, mixed levels), NULLs (unknown is not false), and set semantics (DISTINCT, UNION, position).

---

<a id="slide-24"></a>
## 24. Exercises 1–5: joins, NULLs, and as-of

*Exercises · fan-out, outer joins, NOT IN, three groups, as-of*

All exercises use the lab tables from lesson 3. Write your query, then compare with the expected result shown. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B. Every solution ran during the build and matched the expected result.

### Exercise 1 · Revenue, lines, and units without fan-out

Per customer, return `revenue` (from `orders.amount`), `item_lines` (number of rows in `order_items`), and `units` (sum of `qty`). Revenue must add up to 220.

Result (3 rows):

| customer | revenue | item_lines | units |
|---|---|---|---|
| Ana | 40 | 2 | 2 |
| Leo | 100 | 4 | 8 |
| Maya | 80 | 4 | 4 |

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Every customer, with payments and zeros

Return every customer, including Zoe (no orders) and Ana (order not paid), with the number of payments and the amount paid. Show 0, not NULL.

Result (4 rows):

| customer | payments | paid |
|---|---|---|
| Ana | 0 | 0 |
| Leo | 2 | 100 |
| Maya | 4 | 80 |
| Zoe | 0 | 0 |

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Customers who never opened a ticket

Tickets link to orders, and orders link to customers. List customers who have never opened a ticket about any of their orders. A colleague wrote the query below. Explain its result, then write a correct one.

```sql
SELECT customer
FROM customers
WHERE customer NOT IN (SELECT o.customer
                       FROM support_tickets t
                       LEFT JOIN orders o ON o.order_id = t.order_id)
ORDER BY customer;
```

Result (0 rows):

| customer |
|---|

Result (2 rows):

| customer |
|---|
| Ana |
| Zoe |

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Three groups, not two

Group payments into `card`, `other`, and `unknown` (method is NULL), with the count and amount of each. The three amounts must add up to 180. Then explain why `WHERE method <> 'card'` would report only 10 for “non-card” payments.

Result (3 rows):

| method_group | payments | paid |
|---|---|---|
| card | 4 | 155 |
| other | 1 | 10 |
| unknown | 1 | 15 |

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Revenue by tier at the time of the order

Using `tier_history`, report orders and revenue by the tier each customer had *on the order date*. Orders placed before the customer had any tier go to `No tier`. Revenue must add up to 220 and orders to 6.

Result (4 rows):

| tier | orders | revenue |
|---|---|---|
| Bronze | 1 | 40 |
| Gold | 2 | 55 |
| No tier | 1 | 40 |
| Silver | 2 | 85 |

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

> **The main idea:** in every solution, the totals reconcile to the lab’s control totals (220 revenue, 180 paid, 6 orders). Make that check a habit.

---

<a id="slide-25"></a>
## 25. Lab: reconcile revenue that several joins inflate

*Reconciliation lab · the brief, the schema, and finance’s control totals*

Finance sends five **control totals** for February. Your job is to build a model that matches them, starting from a query that a busy colleague wrote, which overstates almost everything. Use a fresh DuckDB database for the lab: the table names repeat the earlier ones but the data is new. The lab is four steps, exercises 6–9; each one builds on the previous one.

**Create script**

```sql
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer VARCHAR, order_date DATE);
INSERT INTO orders VALUES
  (101, 'Maya', '2026-02-02'), (102, 'Leo', '2026-02-02'), (103, 'Ana', '2026-02-03'),
  (104, 'Maya', '2026-02-04'), (105, 'Zoe', '2026-02-05'), (106, 'Leo', '2026-02-06');

CREATE TABLE order_lines (order_id INTEGER, line_no INTEGER, sku VARCHAR, qty INTEGER,
                          unit_price DECIMAL(10, 2), PRIMARY KEY (order_id, line_no));
INSERT INTO order_lines VALUES
  (101, 1, 'TEA', 2, 10.00), (101, 2, 'MUG', 1, 30.00),
  (102, 1, 'KIT', 1, 80.00),
  (103, 1, 'TEA', 3, 10.00), (103, 2, 'MUG', 1, 30.00), (103, 3, 'SPOON', 2, 5.00),
  (104, 1, 'MUG', 2, 30.00),
  (105, 1, 'KIT', 1, 80.00), (105, 2, 'TEA', 1, 10.00),
  (106, 1, 'SPOON', 4, 5.00);

CREATE TABLE payments (payment_id VARCHAR PRIMARY KEY, order_id INTEGER, paid_on DATE, amount DECIMAL(10, 2));
INSERT INTO payments VALUES
  ('P1', 101, '2026-02-02', 50.00),
  ('P2', 102, '2026-02-02', 50.00), ('P3', 102, '2026-02-03', 30.00),     -- split payment
  ('P4', 103, '2026-02-03', 70.00),
  ('P5', 104, '2026-02-04', 20.00), ('P6', 104, '2026-03-04', 20.00), ('P7', 104, '2026-04-04', 20.00),  -- instalments
  ('P8', 105, '2026-02-05', 90.00);                                        -- 106 not paid yet

CREATE TABLE shipments (shipment_id VARCHAR PRIMARY KEY, order_id INTEGER, shipped_on DATE);
INSERT INTO shipments VALUES
  ('S1', 101, '2026-02-03'), ('S2', 102, '2026-02-03'), ('S3', 102, '2026-02-05'),   -- split shipment
  ('S4', 103, '2026-02-04'), ('S5', 105, '2026-02-06'), ('S6', 105, '2026-02-07');   -- 104, 106 not shipped

CREATE TABLE promotions (promo_code VARCHAR PRIMARY KEY, name VARCHAR);
INSERT INTO promotions VALUES ('WELCOME', 'First-order discount'), ('FREESHIP', 'Free shipping'), ('BUNDLE', 'Bundle deal');

CREATE TABLE order_promotions (order_id INTEGER, promo_code VARCHAR, weight DECIMAL(4, 2),   -- bridge
                               PRIMARY KEY (order_id, promo_code));
INSERT INTO order_promotions VALUES
  (101, 'WELCOME', 1.00),
  (102, 'FREESHIP', 0.50), (102, 'BUNDLE', 0.50),
  (103, 'WELCOME', 0.60), (103, 'BUNDLE', 0.40),
  (105, 'BUNDLE', 1.00);

CREATE TABLE controls (metric_no INTEGER, metric VARCHAR, control_total DECIMAL(10, 2));   -- from finance
INSERT INTO controls VALUES
  (1, 'booked revenue', 370.00), (2, 'cash collected', 350.00), (3, 'shipped revenue', 290.00),
  (4, 'promotion-allocated revenue', 370.00), (5, 'outstanding balance', 20.00);
```

**orders**

```sql
SELECT * FROM orders ORDER BY order_id;
```

Result (6 rows):

| order_id | customer | order_date |
|---|---|---|
| 101 | Maya | 2026-02-02 |
| 102 | Leo | 2026-02-02 |
| 103 | Ana | 2026-02-03 |
| 104 | Maya | 2026-02-04 |
| 105 | Zoe | 2026-02-05 |
| 106 | Leo | 2026-02-06 |

**order_lines**

```sql
SELECT * FROM order_lines ORDER BY order_id, line_no;
```

Result (10 rows):

| order_id | line_no | sku | qty | unit_price |
|---|---|---|---|---|
| 101 | 1 | TEA | 2 | 10.00 |
| 101 | 2 | MUG | 1 | 30.00 |
| 102 | 1 | KIT | 1 | 80.00 |
| 103 | 1 | TEA | 3 | 10.00 |
| 103 | 2 | MUG | 1 | 30.00 |
| 103 | 3 | SPOON | 2 | 5.00 |
| 104 | 1 | MUG | 2 | 30.00 |
| 105 | 1 | KIT | 1 | 80.00 |
| 105 | 2 | TEA | 1 | 10.00 |
| 106 | 1 | SPOON | 4 | 5.00 |

**payments**

```sql
SELECT * FROM payments ORDER BY payment_id;
```

Result (8 rows):

| payment_id | order_id | paid_on | amount |
|---|---|---|---|
| P1 | 101 | 2026-02-02 | 50.00 |
| P2 | 102 | 2026-02-02 | 50.00 |
| P3 | 102 | 2026-02-03 | 30.00 |
| P4 | 103 | 2026-02-03 | 70.00 |
| P5 | 104 | 2026-02-04 | 20.00 |
| P6 | 104 | 2026-03-04 | 20.00 |
| P7 | 104 | 2026-04-04 | 20.00 |
| P8 | 105 | 2026-02-05 | 90.00 |

**shipments**

```sql
SELECT * FROM shipments ORDER BY shipment_id;
```

Result (6 rows):

| shipment_id | order_id | shipped_on |
|---|---|---|
| S1 | 101 | 2026-02-03 |
| S2 | 102 | 2026-02-03 |
| S3 | 102 | 2026-02-05 |
| S4 | 103 | 2026-02-04 |
| S5 | 105 | 2026-02-06 |
| S6 | 105 | 2026-02-07 |

**promotions (bridge)**

```sql
SELECT * FROM order_promotions ORDER BY order_id, promo_code;
```

Result (6 rows):

| order_id | promo_code | weight |
|---|---|---|
| 101 | WELCOME | 1.00 |
| 102 | BUNDLE | 0.50 |
| 102 | FREESHIP | 0.50 |
| 103 | BUNDLE | 0.40 |
| 103 | WELCOME | 0.60 |
| 105 | BUNDLE | 1.00 |

```sql
SELECT * FROM promotions ORDER BY promo_code;
```

Result (3 rows):

| promo_code | name |
|---|---|
| BUNDLE | Bundle deal |
| FREESHIP | Free shipping |
| WELCOME | First-order discount |

**controls**

```sql
SELECT * FROM controls ORDER BY metric_no;
```

Result (5 rows):

| metric_no | metric | control_total |
|---|---|---|
| 1 | booked revenue | 370.00 |
| 2 | cash collected | 350.00 |
| 3 | shipped revenue | 290.00 |
| 4 | promotion-allocated revenue | 370.00 |
| 5 | outstanding balance | 20.00 |

#### Grain of each table

| Table | One row per … | Rows per order |
|---|---|---|
| `orders` | order | 1 |
| `order_lines` | order line | 1–3 |
| `payments` | payment (split payments, instalments) | 0–3 |
| `shipments` | shipment (split shipments) | 0–2 |
| `order_promotions` | order × promotion: a **bridge table** with an allocation `weight` | 0–2 |
| `controls` | metric | — |

#### Definitions from finance

- **Booked revenue**: sum of `qty × unit_price` over all order lines.
- **Cash collected**: sum of all payments.
- **Shipped revenue**: booked revenue of orders with at least one shipment.
- **Promotion-allocated revenue**: each order’s revenue split across its promotions by `weight` (weights per order sum to 1); orders without a promotion go to `(no promotion)`. It must add back to booked revenue.
- **Outstanding balance**: booked revenue minus cash collected.

> **On the job:** This is a miniature month-end close. Real versions compare a warehouse model to the ERP or payment provider, with the same moves: find each table’s grain, aggregate to a shared key, filter with semi-joins, and allocate many-to-many relationships with weights.

> **The main idea:** a reconciliation starts with definitions and grains, not with a join. Write down what one row of every table means before touching SQL.

---

<a id="slide-26"></a>
## 26. Lab: the naive model, and where the extra money comes from

*Reconciliation lab · one query, four joins, three wrong totals*

The colleague’s query joins everything to `orders` once and sums. It runs, it looks reasonable, and every total is wrong.

```sql
SELECT COUNT(*)                                   AS joined_rows,
       SUM(l.qty * l.unit_price)                  AS revenue,
       SUM(p.amount)                              AS cash,
       SUM(CASE WHEN s.shipment_id IS NOT NULL
                THEN l.qty * l.unit_price END)    AS shipped_revenue
FROM orders o
JOIN order_lines l           ON l.order_id = o.order_id
LEFT JOIN payments p         ON p.order_id = o.order_id
LEFT JOIN shipments s        ON s.order_id = o.order_id
LEFT JOIN order_promotions op ON op.order_id = o.order_id;
```

Result (1 row):

| joined_rows | revenue | cash | shipped_revenue |
|---|---|---|---|
| 24 | 1210.00 | 1260.00 | 1010.00 |

| Metric | Control | Naive | Over by |
|---|---|---|---|
| booked revenue | 370.00 | 1210.00 | 3.3× |
| cash collected | 350.00 | 1260.00 | 3.6× |
| shipped revenue | 290.00 | 1010.00 | 3.5× |

**Diagnose:** count the rows each child table contributes per order.

```sql
SELECT o.order_id,
       (SELECT COUNT(*) FROM order_lines l      WHERE l.order_id = o.order_id)  AS line_rows,
       (SELECT COUNT(*) FROM payments p         WHERE p.order_id = o.order_id)  AS payment_rows,
       (SELECT COUNT(*) FROM shipments s        WHERE s.order_id = o.order_id)  AS shipment_rows,
       (SELECT COUNT(*) FROM order_promotions x WHERE x.order_id = o.order_id)  AS promo_rows
FROM orders o
ORDER BY o.order_id;
```

Result (6 rows):

| order_id | line_rows | payment_rows | shipment_rows | promo_rows |
|---|---|---|---|---|
| 101 | 2 | 1 | 1 | 1 |
| 102 | 1 | 2 | 2 | 2 |
| 103 | 3 | 1 | 1 | 2 |
| 104 | 1 | 3 | 0 | 0 |
| 105 | 2 | 1 | 2 | 1 |
| 106 | 1 | 0 | 0 | 0 |

#### Read the diagnosis

Joined rows per order = lines × max(payments, 1) × max(shipments, 1) × max(promotions, 1). Order 102 has 1 × 2 × 2 × 2 = **8** rows, so its 80.00 of revenue is counted 8 times (640.00). Order 104 has three instalments, so its revenue is tripled. Order 106 has no payment, so its row carries a NULL payment.

#### The pattern

Each child table is a separate one-to-many branch from `orders`, which is the multiplication trap from lesson 7, four times over. Only `order_lines` carries revenue, so it is the only table that may be joined at detail level for revenue; every other branch must be aggregated or used as a filter.

> **The main idea:** multiply the rows per key across every 1:N branch; that product is the inflation factor. The fix is to stop joining branches at the detail level.

---

<a id="slide-27"></a>
## 27. Lab step 1: pre-aggregate to order grain

*Reconciliation lab · exercise 6*

### Exercise 6 · Lab step 1: an order-grain summary

Create a view `order_summary` with exactly one row per order: `order_id, customer, revenue, paid, shipments, promotions, balance` (balance = revenue − paid). Use 0, not NULL. Then prove the grain and reconcile: 6 rows, 6 distinct orders, revenue 370.00, paid 350.00, balance 20.00.

Result (6 rows):

| order_id | customer | revenue | paid | shipments | promotions | balance |
|---|---|---|---|---|---|---|
| 101 | Maya | 50.00 | 50.00 | 1 | 1 | 0.00 |
| 102 | Leo | 80.00 | 80.00 | 2 | 2 | 0.00 |
| 103 | Ana | 70.00 | 70.00 | 1 | 2 | 0.00 |
| 104 | Maya | 60.00 | 60.00 | 0 | 0 | 0.00 |
| 105 | Zoe | 90.00 | 90.00 | 2 | 1 | 0.00 |
| 106 | Leo | 20.00 | 0.00 | 0 | 0 | 20.00 |

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

> **The main idea:** one CTE per child, grouped to the order key, then one-to-one joins. Prove the grain with a distinct-key count and the sums with control totals.

---

<a id="slide-28"></a>
## 28. Lab step 2: filter with a semi-join

*Reconciliation lab · exercise 7*

### Exercise 7 · Lab step 2: shipped revenue with a semi-join

Compute **shipped revenue**: booked revenue of orders with at least one shipment. Finance says 290.00. The obvious query below joins `shipments` and reports 460.00. Explain the difference, then write a query that returns 4 shipped orders and 290.00. Finally, show that shipped plus unshipped revenue equals booked revenue.

```sql
SELECT COUNT(*) AS rows_after_join, SUM(os.revenue) AS shipped_revenue
FROM order_summary os
JOIN shipments s ON s.order_id = os.order_id;
```

Result (1 row):

| rows_after_join | shipped_revenue |
|---|---|
| 6 | 460.00 |

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

> **The main idea:** when a table only decides whether an order qualifies, use EXISTS. Then prove the split adds back to the total.

---

<a id="slide-29"></a>
## 29. Lab step 3: weight the bridge

*Reconciliation lab · exercise 8*

### Exercise 8 · Lab step 3: allocate revenue through the bridge

Report revenue by promotion. Orders 102 and 103 have two promotions each, so a plain join counts their revenue once per promotion: the version below adds up to 520.00, not 370.00. Use the bridge table’s `weight` to allocate each order’s revenue, send orders without a promotion to `(no promotion)`, and first check that every order’s weights sum to 1.

```sql
SELECT COALESCE(op.promo_code, '(no promotion)') AS promo_code,
       SUM(os.revenue)                          AS revenue
FROM order_summary os
LEFT JOIN order_promotions op ON op.order_id = os.order_id
GROUP BY ALL
ORDER BY promo_code;
```

Result (4 rows):

| promo_code | revenue |
|---|---|
| (no promotion) | 80.00 |
| BUNDLE | 240.00 |
| FREESHIP | 80.00 |
| WELCOME | 120.00 |

Result (4 rows):

| promo_code | allocated_revenue |
|---|---|
| (no promotion) | 80.00 |
| BUNDLE | 158.00 |
| FREESHIP | 40.00 |
| WELCOME | 92.00 |

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

> **The main idea:** a bridge join is a deliberate fan-out; allocation weights that sum to 1 per parent make it additive again. Test the weights before trusting the split.

---

<a id="slide-30"></a>
## 30. Lab step 4: sign off against the control totals

*Reconciliation lab · exercise 9*

### Exercise 9 · Lab step 4: the reconciliation report

Write one query that produces finance’s sign-off table: for each row of `controls`, the control total, the naive model’s figure (the colleague’s naive query and the unweighted promotion join), the fixed model’s figure (from `order_summary` and the weighted bridge), and a `PASS`/`FAIL` status comparing the fixed figure with the control. Every status must be PASS.

Result (5 rows):

| metric | control_total | naive_total | fixed_total | status |
|---|---|---|---|---|
| booked revenue | 370.00 | 1210.00 | 370.00 | PASS |
| cash collected | 350.00 | 1260.00 | 350.00 | PASS |
| shipped revenue | 290.00 | 1010.00 | 290.00 | PASS |
| promotion-allocated revenue | 370.00 | 520.00 | 370.00 | PASS |
| outstanding balance | 20.00 | -50.00 | 20.00 | PASS |

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

> **The main idea:** a reconciliation report puts control, before, and after side by side, driven from the list of controls. When every row says PASS, the model is ready to publish.

---

<a id="slide-31"></a>
## 31. Cheat sheet

*Reference · the deck on one page*

#### Joins and grain

| Need | Write |
|---|---|
| will this join repeat rows? | `COUNT(*)` vs `COUNT(DISTINCT key)` on the right table |
| measures from two child tables | one CTE per child, `GROUP BY` parent key, then join |
| prove the grain | `COUNT(*) = COUNT(DISTINCT key)` + control totals |
| filter the optional side | condition in `LEFT JOIN … ON` |
| “has at least one” | `WHERE EXISTS (SELECT 1 …)` / `IN` |
| “has none” | `WHERE NOT EXISTS (…)`; never `NOT IN (subquery)` |
| pairs in one table | self-join with `b.id > a.id` in ON |
| period lookup | `>= start AND < end` (half-open) |
| value at that time | `ASOF JOIN` / `LATERAL … LIMIT 1` / `LEAD` → valid_to |

#### NULLs

| Need | Write |
|---|---|
| test for NULL | `IS NULL`, never `= NULL` |
| “not X”, keeping unknowns | `col IS DISTINCT FROM 'X'` |
| null-safe equality / join | `a IS NOT DISTINCT FROM b` |
| CASE on nullable column | `WHEN col IS NULL THEN …` first |
| count matches after LEFT JOIN | `COUNT(right.key)` |
| 0 instead of NULL | `COALESCE(SUM(x), 0)` |
| predictable sort | `ORDER BY col NULLS LAST, key` |
| row diff with NULLs | `EXCEPT ALL` both ways |

#### Verify

| Check | Pass when |
|---|---|
| row count | source = target |
| control totals | sums equal per measure |
| grain | `COUNT(*) = COUNT(DISTINCT key)` |
| orphans | `NOT EXISTS` to parent returns 0 rows |
| interval overlaps | overlap self-join returns 0 rows |
| bridge weights | `HAVING SUM(weight) <> 1` returns 0 rows |
| per-key diff | `FULL JOIN … WHERE a IS DISTINCT FROM b` returns 0 rows |
| row diff | two-way `EXCEPT ALL` returns 0 rows |

> **The main idea:** grain first, NULLs second, and a reconciliation check before anything is published.

---

<a id="slide-32"></a>
## 32. Dialect cheat sheet

*Reference · the same idea in six engines (added)*

| Feature | DuckDB | PostgreSQL | SQL Server | Spark SQL | Snowflake | BigQuery |
|---|---|---|---|---|---|---|
| Semi / anti join keyword | `SEMI JOIN`, `ANTI JOIN` | EXISTS / NOT EXISTS | EXISTS / NOT EXISTS | `LEFT SEMI`, `LEFT ANTI` | EXISTS / NOT EXISTS | EXISTS / NOT EXISTS |
| Null-safe equality | `IS NOT DISTINCT FROM` | same | same (2022+) | same, or `<=>` | same, or `EQUAL_NULL` | same |
| Default NULL order | last (ASC and DESC) | last ASC, first DESC | first ASC, last DESC | first ASC, last DESC | last ASC, first DESC | first ASC, last DESC |
| `NULLS FIRST/LAST` | yes | yes | no (use CASE) | yes | yes | yes |
| As-of join | `ASOF JOIN` | LATERAL … LIMIT 1 | OUTER APPLY … TOP 1 | LEAD + range join | `ASOF JOIN … MATCH_CONDITION` | LEAD + range join |
| `EXCEPT ALL` | yes | yes | no | yes | no | no (DISTINCT only) |

*Reference only: only the DuckDB column was executed in this build. Engine features change between versions; check the linked documentation for your version. “—” means no built-in equivalent that this deck relies on.*

> **The main idea:** the logic is the same everywhere; only spelling differs. When porting, check NULL order, integer division, FILTER, and QUALIFY first.

*Read more:* [DuckDB: PostgreSQL compatibility](https://duckdb.org/docs/stable/sql/dialect/postgresql_compatibility), [PostgreSQL: sorting rows and NULLS FIRST/LAST](https://www.postgresql.org/docs/current/queries-order.html), [SQL Server: ORDER BY](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql), [Spark SQL: NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html), [Snowflake: QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify), [BigQuery: query syntax (PIVOT, UNPIVOT, QUALIFY)](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax).

---

<a id="slide-33"></a>
## 33. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Grain | What one row of a table or result represents (“one row per order line”) |
| Key / foreign key | Columns unique per row at the grain / a column pointing to another table’s key |
| Cardinality (1:1, 1:N, N:M) | How many rows on each side of a relationship can match |
| Fan-out | A join repeating rows of one side once per match on the other, inflating its measures |
| Chasm trap | Joining one parent to two independent 1:N children, multiplying their rows |
| Control total | A trusted total from the source that derived results must match |
| Pre-aggregation | Aggregating a detail table to the join key before joining |
| Counterexample | A small input that proves a query wrong |
| Inner / left outer / full outer / cross join | Matched pairs only / plus unmatched left rows / plus unmatched rows of both sides / every pair |
| Preserved / optional table | The side an outer join keeps in full / the side padded with NULLs |
| Spine table | A complete list of keys (customers, days) left-joined to facts so zero rows survive |
| Semi-join | Keep left rows with at least one match, once, left columns only (EXISTS, IN) |
| Anti-join | Keep left rows with no match (NOT EXISTS) |
| Correlated subquery | A subquery that refers to the current row of the outer query |
| Orphan | A row whose foreign key matches no parent row |
| NULL | A missing or unknown value |
| Three-valued logic | Conditions evaluate to true, false, or unknown; WHERE keeps only true |
| Null-safe comparison | `IS [NOT] DISTINCT FROM`: treats two NULLs as equal, never returns unknown |
| Self-join | Joining a table to itself under two aliases |
| Range join | A join on inequalities, such as a date inside a period |
| Half-open interval | [start, end): start included, end excluded |
| As-of join | Match each row to the latest row on the other side at or before its time |
| LATERAL / APPLY | A subquery in FROM that can refer to columns of earlier tables, evaluated per row |
| Leakage | Using information from after the event time when describing the event |
| Bridge table | A table resolving a many-to-many relationship, often with allocation weights |
| Allocation weight | The share of a parent’s measure assigned to each bridge row; sums to 1 per parent |
| Reconciliation | Proving a derived result agrees with its source at a stated grain |
| Embedded database | A database that runs inside your process (DuckDB, SQLite) |

---

<a id="slide-34"></a>
## 34. Recap: what to remember

*Reference · recap and practice plan*

1. **Grain first.** Say “one row per …” for every input and the output. Sum a measure only at its own grain.
2. **Predict every join.** A non-unique key on the right repeats left rows. Two 1:N branches multiply. Pre-aggregate, then join one-to-one.
3. **Filters have a place.** Optional side → ON. Preserved side → WHERE.
4. **Use semi- and anti-joins for “has / has none”.** EXISTS and NOT EXISTS. Never NOT IN with a subquery.
5. **NULL is unknown.** Comparisons give unknown; WHERE drops it; CASE sends it to ELSE; joins never match it; GROUP BY and set operations do.
6. **Match by time correctly.** Half-open intervals for periods; as-of joins for “value at that time”.
7. **Reconcile before you publish.** Row counts, control totals, grain tests, and a two-way EXCEPT ALL. Equal totals alone prove nothing.

#### Practise this week

- Redo exercises 3 and 6–9 from a blank editor, without hints.
- Take one real query you own and write down the grain and key of every table it joins.
- Add a grain test and one control-total check to a pipeline you maintain.
- Explain the chasm trap and NOT IN with NULL out loud, in under a minute each.

#### How this connects

The window-functions deck gave you row-level tools; the dimensional modeling decks gave you grain, facts, dimensions, and bridges. This deck is where they meet. Next: the *SQL aggregation* deck (conditional aggregation, subtotals, pivots, percentiles), then the same checks at pipeline scale in dbt tests.

> **The main idea:** most wrong numbers come from grain, NULLs, or join semantics. Ask about all three before you trust a query, and prove the answer with a reconciliation.

---

<a id="slide-35"></a>
## 35. References and how this deck was tested

*References · official documentation*

- **DuckDB:** [DuckDB: FROM and JOIN (semi, anti, lateral, ASOF)](https://duckdb.org/docs/stable/sql/query_syntax/from), [DuckDB: ASOF JOIN guide](https://duckdb.org/docs/stable/guides/sql_features/asof_join), [DuckDB: NULL values](https://duckdb.org/docs/stable/sql/data_types/nulls), [DuckDB: comparison operators](https://duckdb.org/docs/stable/sql/expressions/comparison_operators), [DuckDB: subqueries](https://duckdb.org/docs/stable/sql/expressions/subqueries), [DuckDB: ORDER BY and NULL order](https://duckdb.org/docs/stable/sql/query_syntax/orderby), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops), [DuckDB: PostgreSQL compatibility](https://duckdb.org/docs/stable/sql/dialect/postgresql_compatibility), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).
- **PostgreSQL:** [PostgreSQL: table expressions, joins, LATERAL, GROUPING SETS](https://www.postgresql.org/docs/current/queries-table-expressions.html), [PostgreSQL: EXISTS, IN, NOT IN](https://www.postgresql.org/docs/current/functions-subquery.html), [PostgreSQL: comparison operators and IS DISTINCT FROM](https://www.postgresql.org/docs/current/functions-comparison.html), [PostgreSQL: logical operators](https://www.postgresql.org/docs/current/functions-logical.html), [PostgreSQL: sorting rows and NULLS FIRST/LAST](https://www.postgresql.org/docs/current/queries-order.html), [PostgreSQL: CASE, COALESCE, NULLIF](https://www.postgresql.org/docs/current/functions-conditional.html).
- **SQL Server (T-SQL):** [SQL Server: FROM, APPLY](https://learn.microsoft.com/en-us/sql/t-sql/queries/from-transact-sql), [SQL Server: IN](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/in-transact-sql), [SQL Server: IS [NOT] DISTINCT FROM](https://learn.microsoft.com/en-us/sql/t-sql/queries/is-distinct-from-transact-sql), [SQL Server: ORDER BY](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql).
- **Spark SQL:** [Spark SQL: joins (LEFT SEMI, LEFT ANTI)](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html), [Spark SQL: NULL semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html), [Spark SQL: ORDER BY](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-orderby.html).
- **Snowflake:** [Snowflake: ASOF JOIN](https://docs.snowflake.com/en/sql-reference/constructs/asof-join), [Snowflake: QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify).
- **BigQuery:** [BigQuery: query syntax (PIVOT, UNPIVOT, QUALIFY)](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax).

**Testing:** built with DuckDB 1.5.6 (Python package) on CPython 3.12.10, Windows 11. This deck and the SQL aggregation deck come from one build that ran every query of both. Every SQL block, including exercise prompts and solutions, was executed by the build script against an in-memory DuckDB database; the tables under the queries are the real results. The build compares each result with the numbers stated in the text and fails on any mismatch, any unexpected error, or any multi-row result without `ORDER BY`; it finished with 0 failures. Syntax for other engines appears only in dialect notes and was not executed.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Revenue, lines, and units without fan-out

`amount` is at order grain; `qty` and line counts are at line grain. Bring the line-level numbers up to order grain in a CTE, then join one-to-one.

<a id="hint-2"></a>
### Hint 2 · Every customer, with payments and zeros

Start from `customers` and use two left joins. Count a column from `payments`, not `*`. Wrap the sum in `COALESCE`.

<a id="hint-3"></a>
### Hint 3 · Customers who never opened a ticket

Run the subquery on its own: ticket 902 has no order, so the left join gives a NULL `customer`. What does `NOT IN` do with a NULL in its list?

<a id="hint-4"></a>
### Hint 4 · Three groups, not two

Test for NULL in the *first* `WHEN`. A `CASE` without that branch would put NULLs into `ELSE`.

<a id="hint-5"></a>
### Hint 5 · Revenue by tier at the time of the order

An open-ended `valid_from <= order_date` join gives 8 rows (lesson 20). Use `ASOF LEFT JOIN`, or derive `valid_to` with `LEAD` and use a half-open range join.

<a id="hint-6"></a>
### Hint 6 · Lab step 1: an order-grain summary

One CTE per child table, each grouped by `order_id`, then `orders` LEFT JOIN each CTE. Every join is now one-to-one. Use `COALESCE` for orders that have no rows in a child table.

<a id="hint-7"></a>
### Hint 7 · Lab step 2: shipped revenue with a semi-join

Orders 102 and 105 were shipped in two parts. Is `shipments` here a source of measures, or only a filter? (Lesson 11.)

<a id="hint-8"></a>
### Hint 8 · Lab step 3: allocate revenue through the bridge

Multiply `revenue × weight` per bridge row before summing. For orders with no bridge row, the left join gives a NULL weight: treat it as 1. The weight check is a `GROUP BY order_id HAVING SUM(weight) <> 1` that should return no rows.

<a id="hint-9"></a>
### Hint 9 · Lab step 4: the reconciliation report

Compute each model’s numbers in its own CTE (one row each), turn them into rows with `UNION ALL` keyed by `metric_no`, and `LEFT JOIN` from `controls` so a missing metric would show up as FAIL rather than vanish.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution query below was executed in DuckDB during the build, and its result was checked against the expected rows or totals.

<a id="solution-1"></a>
### Solution 1 · Revenue, lines, and units without fan-out

```sql
WITH lines AS (                        -- one row per order
    SELECT order_id,
           COUNT(*) AS item_lines,
           SUM(qty) AS units
    FROM order_items
    GROUP BY order_id
)
SELECT o.customer,
       SUM(o.amount)     AS revenue,
       SUM(l.item_lines) AS item_lines,
       SUM(l.units)      AS units
FROM orders o
JOIN lines l ON l.order_id = o.order_id
GROUP BY o.customer
ORDER BY o.customer;
```

Result (3 rows):

| customer | revenue | item_lines | units |
|---|---|---|---|
| Ana | 40 | 2 | 2 |
| Leo | 100 | 4 | 8 |
| Maya | 80 | 4 | 4 |

**Why it works.** The CTE has one row per `order_id`, so the join cannot repeat orders. Summing `o.amount` directly after joining `order_items` would give 400 (lesson 6). Check: 40 + 100 + 80 = 220, and 2 + 8 + 4 = 14 units = `SUM(qty)` of the whole table.

<a id="solution-2"></a>
### Solution 2 · Every customer, with payments and zeros

```sql
SELECT c.customer,
       COUNT(p.payment_id)        AS payments,
       COALESCE(SUM(p.amount), 0) AS paid
FROM customers c
LEFT JOIN orders o   ON o.customer = c.customer
LEFT JOIN payments p ON p.order_id = o.order_id
GROUP BY c.customer
ORDER BY c.customer;
```

Result (4 rows):

| customer | payments | paid |
|---|---|---|
| Ana | 0 | 0 |
| Leo | 2 | 100 |
| Maya | 4 | 80 |
| Zoe | 0 | 0 |

**Why it works.** Joining customers → orders → payments does fan out, but only measures from the *lowest* table (payments) are aggregated, so nothing is double-counted. `COUNT(*)` would give Zoe and Ana 1 (the *SQL aggregation* deck). Any filter on orders or payments, such as a date range, must go in the `ON` clauses, or Zoe and Ana disappear (lesson 10).

<a id="solution-3"></a>
### Solution 3 · Customers who never opened a ticket

```sql
SELECT c.customer
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM support_tickets t
    JOIN orders o ON o.order_id = t.order_id
    WHERE o.customer = c.customer
)
ORDER BY c.customer;
```

Result (2 rows):

| customer |
|---|
| Ana |
| Zoe |

**Why it works.** The colleague’s subquery returns `Maya, NULL, Leo`. `'Ana' NOT IN ('Maya', NULL, 'Leo')` is unknown, so every row is dropped (lesson 13). `NOT EXISTS` asks “is there a ticket for one of this customer’s orders?”, which is true or false, never unknown. The inner join inside the subquery also ignores ticket 902, which belongs to no customer.

<a id="solution-4"></a>
### Solution 4 · Three groups, not two

```sql
SELECT CASE WHEN method IS NULL   THEN 'unknown'
            WHEN method = 'card'    THEN 'card'
            ELSE 'other' END        AS method_group,
       COUNT(*)                     AS payments,
       SUM(amount)                  AS paid
FROM payments
GROUP BY method_group
ORDER BY method_group;
```

Result (3 rows):

| method_group | payments | paid |
|---|---|---|
| card | 4 | 155 |
| other | 1 | 10 |
| unknown | 1 | 15 |

```sql
SELECT SUM(amount) AS non_card_paid
FROM payments
WHERE method <> 'card';
```

Result (1 row):

| non_card_paid |
|---|
| 10 |

**Why it works.** Handling NULL explicitly makes the three groups cover every row: 155 + 10 + 15 = 180. The `WHERE` version returns 10 because `NULL <> 'card'` is unknown, so payment 105 is excluded from both “card” and “not card” (lessons 14–15). DuckDB lets `GROUP BY` use the alias `method_group`; in SQL Server repeat the `CASE` expression.

<a id="solution-5"></a>
### Solution 5 · Revenue by tier at the time of the order

```sql
SELECT COALESCE(t.tier, 'No tier') AS tier,
       COUNT(*)                     AS orders,
       SUM(o.amount)                AS revenue
FROM orders o
ASOF LEFT JOIN tier_history t
       ON t.customer = o.customer
      AND o.order_date >= t.valid_from
GROUP BY ALL
ORDER BY tier;
```

Result (4 rows):

| tier | orders | revenue |
|---|---|---|
| Bronze | 1 | 40 |
| Gold | 2 | 55 |
| No tier | 1 | 40 |
| Silver | 2 | 85 |

```sql
WITH tiers AS (
    SELECT customer, tier, valid_from,
           LEAD(valid_from, 1, DATE '9999-12-31')
               OVER (PARTITION BY customer ORDER BY valid_from) AS valid_to
    FROM tier_history
)
SELECT COALESCE(t.tier, 'No tier') AS tier, COUNT(*) AS orders, SUM(o.amount) AS revenue
FROM orders o
LEFT JOIN tiers t
       ON t.customer = o.customer
      AND o.order_date >= t.valid_from AND o.order_date < t.valid_to
GROUP BY COALESCE(t.tier, 'No tier')
ORDER BY tier;
```

Result (4 rows):

| tier | orders | revenue |
|---|---|---|
| Bronze | 1 | 40 |
| Gold | 2 | 55 |
| No tier | 1 | 40 |
| Silver | 2 | 85 |

**Why it works.** Each order gets at most one tier row, so revenue is not duplicated: 40 + 55 + 40 + 85 = 220. Maya’s order 2 on 5 January is Gold because her Gold tier starts that day (`>=`). Leo’s order 3 on 5 January predates his Silver tier (6 January), so it lands in `No tier`. The portable version works in PostgreSQL, SQL Server, Spark, and BigQuery. `GROUP BY ALL` (DuckDB, Snowflake, Databricks) groups by every non-aggregated column.

<a id="solution-6"></a>
### Solution 6 · Lab step 1: an order-grain summary

```sql
CREATE OR REPLACE VIEW order_summary AS        -- one row per order
WITH revenue AS (
    SELECT order_id, SUM(qty * unit_price) AS revenue
    FROM order_lines GROUP BY order_id
), paid AS (
    SELECT order_id, SUM(amount) AS paid
    FROM payments GROUP BY order_id
), shipped AS (
    SELECT order_id, COUNT(*) AS shipments
    FROM shipments GROUP BY order_id
), promos AS (
    SELECT order_id, COUNT(*) AS promotions
    FROM order_promotions GROUP BY order_id
)
SELECT o.order_id, o.customer,
       COALESCE(r.revenue, 0)                          AS revenue,
       COALESCE(p.paid, 0)                             AS paid,
       COALESCE(s.shipments, 0)                        AS shipments,
       COALESCE(x.promotions, 0)                       AS promotions,
       COALESCE(r.revenue, 0) - COALESCE(p.paid, 0)    AS balance
FROM orders o
LEFT JOIN revenue r ON r.order_id = o.order_id
LEFT JOIN paid    p ON p.order_id = o.order_id
LEFT JOIN shipped s ON s.order_id = o.order_id
LEFT JOIN promos  x ON x.order_id = o.order_id;

SELECT * FROM order_summary ORDER BY order_id;
```

Result (6 rows):

| order_id | customer | revenue | paid | shipments | promotions | balance |
|---|---|---|---|---|---|---|
| 101 | Maya | 50.00 | 50.00 | 1 | 1 | 0.00 |
| 102 | Leo | 80.00 | 80.00 | 2 | 2 | 0.00 |
| 103 | Ana | 70.00 | 70.00 | 1 | 2 | 0.00 |
| 104 | Maya | 60.00 | 60.00 | 0 | 0 | 0.00 |
| 105 | Zoe | 90.00 | 90.00 | 2 | 1 | 0.00 |
| 106 | Leo | 20.00 | 0.00 | 0 | 0 | 20.00 |

```sql
SELECT COUNT(*)                 AS row_count,
       COUNT(DISTINCT order_id) AS distinct_orders,
       SUM(revenue)             AS revenue,
       SUM(paid)                AS paid,
       SUM(balance)             AS balance
FROM order_summary;
```

Result (1 row):

| row_count | distinct_orders | revenue | paid | balance |
|---|---|---|---|---|
| 6 | 6 | 370.00 | 350.00 | 20.00 |

**Why it works.** Each CTE collapses a one-to-many branch to one row per order before the join, so nothing multiplies (lessons 7–8). Left joins keep orders 104 and 106, which have no shipment, payment, or promotion. The test query is the grain test from lesson 8: `COUNT(*) = COUNT(DISTINCT order_id)`, and the sums match finance’s booked revenue (370.00), cash (350.00), and outstanding balance (20.00, all from order 106).

<a id="solution-7"></a>
### Solution 7 · Lab step 2: shipped revenue with a semi-join

```sql
SELECT COUNT(*)     AS shipped_orders,
       SUM(revenue) AS shipped_revenue
FROM order_summary os
WHERE EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = os.order_id);
```

Result (1 row):

| shipped_orders | shipped_revenue |
|---|---|
| 4 | 290.00 |

```sql
SELECT SUM(revenue) FILTER (WHERE shipments > 0)  AS shipped_revenue,
       SUM(revenue) FILTER (WHERE shipments = 0)  AS unshipped_revenue,
       SUM(revenue)                               AS booked_revenue
FROM order_summary;
```

Result (1 row):

| shipped_revenue | unshipped_revenue | booked_revenue |
|---|---|---|
| 290.00 | 80.00 | 370.00 |

**Why it works.** The join returns one row per shipment, so the revenue of 102 and 105 is counted twice: 290.00 + 80.00 + 90.00 = 460.00. `EXISTS` is a semi-join: it keeps each order once if it has any shipment. Because `order_summary` already carries a shipment count, a `FILTER` on it gives the same answer without touching `shipments` again, and the split 290.00 + 80.00 = 370.00 proves nothing was lost or double-counted.

<a id="solution-8"></a>
### Solution 8 · Lab step 3: allocate revenue through the bridge

```sql
SELECT order_id, SUM(weight) AS total_weight
FROM order_promotions
GROUP BY order_id
HAVING SUM(weight) <> 1
ORDER BY order_id;
```

Result (0 rows):

| order_id | total_weight |
|---|---|

```sql
WITH allocated AS (
    SELECT COALESCE(op.promo_code, '(no promotion)')   AS promo_code,
           os.revenue * COALESCE(op.weight, 1)         AS revenue
    FROM order_summary os
    LEFT JOIN order_promotions op ON op.order_id = os.order_id
)
SELECT promo_code,
       CAST(SUM(revenue) AS DECIMAL(10, 2)) AS allocated_revenue
FROM allocated
GROUP BY promo_code
ORDER BY promo_code;
```

Result (4 rows):

| promo_code | allocated_revenue |
|---|---|
| (no promotion) | 80.00 |
| BUNDLE | 158.00 |
| FREESHIP | 40.00 |
| WELCOME | 92.00 |

```sql
SELECT SUM(revenue * COALESCE(weight, 1)) AS allocated_total
FROM order_summary os
LEFT JOIN order_promotions op ON op.order_id = os.order_id;
```

Result (1 row):

| allocated_total |
|---|
| 370.0000 |

**Why it works.** A **bridge table** resolves a many-to-many relationship (orders ↔ promotions). Joining through it fans out, by design. The weights undo the fan-out: each order’s rows carry weights that sum to 1, so the order’s revenue is split, not copied (dimensional-modelling deck). WELCOME = 50.00 + 0.6 × 70.00 = 92.00; BUNDLE = 0.5 × 80.00 + 0.4 × 70.00 + 90.00 = 158.00; FREESHIP = 0.5 × 80.00 = 40.00; no promotion = 60.00 + 20.00 = 80.00. Total 370.00. The extra decimal places in the check come from multiplying two decimals; the report casts back to 2 places.

<a id="solution-9"></a>
### Solution 9 · Lab step 4: the reconciliation report

```sql
WITH naive AS (                          -- the colleague's naive model
    SELECT SUM(l.qty * l.unit_price) AS revenue,
           SUM(p.amount)             AS cash,
           SUM(CASE WHEN s.shipment_id IS NOT NULL THEN l.qty * l.unit_price END) AS shipped
    FROM orders o
    JOIN order_lines l            ON l.order_id = o.order_id
    LEFT JOIN payments p          ON p.order_id = o.order_id
    LEFT JOIN shipments s         ON s.order_id = o.order_id
    LEFT JOIN order_promotions op ON op.order_id = o.order_id
), naive_promo AS (                    -- unweighted bridge join
    SELECT SUM(os.revenue) AS revenue
    FROM order_summary os
    LEFT JOIN order_promotions op ON op.order_id = os.order_id
), fixed AS (                          -- the reconciled model (exercises 6-8)
    SELECT SUM(revenue)                                AS revenue,
           SUM(paid)                                   AS cash,
           SUM(revenue) FILTER (WHERE shipments > 0)   AS shipped,
           SUM(balance)                                AS balance
    FROM order_summary
), fixed_promo AS (
    SELECT SUM(os.revenue * COALESCE(op.weight, 1)) AS revenue
    FROM order_summary os
    LEFT JOIN order_promotions op ON op.order_id = os.order_id
), model AS (
    SELECT 1 AS metric_no, n.revenue AS naive_total, f.revenue AS fixed_total FROM naive n, fixed f
    UNION ALL SELECT 2, n.cash, f.cash FROM naive n, fixed f
    UNION ALL SELECT 3, n.shipped, f.shipped FROM naive n, fixed f
    UNION ALL SELECT 4, np.revenue, fp.revenue FROM naive_promo np, fixed_promo fp
    UNION ALL SELECT 5, n.revenue - n.cash, f.balance FROM naive n, fixed f
)
SELECT c.metric,
       c.control_total,
       CAST(m.naive_total AS DECIMAL(10, 2)) AS naive_total,
       CAST(m.fixed_total AS DECIMAL(10, 2)) AS fixed_total,
       CASE WHEN m.fixed_total = c.control_total THEN 'PASS' ELSE 'FAIL' END AS status
FROM controls c
LEFT JOIN model m ON m.metric_no = c.metric_no
ORDER BY c.metric_no;
```

Result (5 rows):

| metric | control_total | naive_total | fixed_total | status |
|---|---|---|---|---|
| booked revenue | 370.00 | 1210.00 | 370.00 | PASS |
| cash collected | 350.00 | 1260.00 | 350.00 | PASS |
| shipped revenue | 290.00 | 1010.00 | 290.00 | PASS |
| promotion-allocated revenue | 370.00 | 520.00 | 370.00 | PASS |
| outstanding balance | 20.00 | -50.00 | 20.00 | PASS |

**Why it works.** The fixed model only ever sums measures at their own grain: revenue and payments at order grain, shipments as a filter (semi-join), and promotions through weights. The naive column documents how far off the original was, which is useful evidence in a code review or incident write-up. Driving the report from `controls` with a `LEFT JOIN` means a forgotten metric shows up as a FAIL row instead of silently disappearing (lesson 10). Note the naive outstanding balance is *negative*: payments were inflated even more than revenue. In production, schedule this query after each load and fail the pipeline on any FAIL.
