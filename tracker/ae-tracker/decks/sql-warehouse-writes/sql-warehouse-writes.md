# SQL warehouse writes: MERGE, idempotent loads and incremental patterns

*Companion to `sql-warehouse-writes.html`: same lessons, same numbering, same statements and results. Hints and solutions are in Appendices A and B.*

**Tested engines and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, Windows 11 (64-bit); PostgreSQL 18.3 running in PGlite 0.5.8 (PostgreSQL compiled to WebAssembly, run by Node.js) for the PostgreSQL lessons; pytest for the lab. SQL is DuckDB’s PostgreSQL-flavoured dialect; `MERGE INTO` needs DuckDB 1.4 or later. Every DuckDB and PostgreSQL statement in this document ran while it was built, and the result under it is the real result. **T-SQL (SQL Server / Fabric Warehouse), Snowflake, BigQuery, and Spark SQL / Delta Lake snippets were not executed** (no server, Java, or cloud account on the build machine); each is labelled as reference only.

**Scope:** this is the SQL side of warehouse writes. The dbt side (the `incremental` materialization, `is_incremental()`, `unique_key`, the five dbt strategies, microbatch, snapshots) is in *dbt incremental models, snapshots and unit tests*; this deck cross-references it instead of repeating it. It builds on *SQL correctness: joins, grain, and NULLs* (grain, anti-joins, `IS DISTINCT FROM`), *Classic SQL patterns* (keep the latest row per key), *Window functions* (`ROW_NUMBER`, `QUALIFY`), and *Python files, generators, and practical data scripts* (transactions, idempotent loads, a load log). SCD Type 2 history is only mentioned: it is taught in the dimensional-modeling and dbt snapshot decks. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common warehouse-write interview patterns (research done in October 2026: write a MERGE from staging, “what happens if the job runs twice?”, duplicates in the batch, merge vs delete+insert vs partition overwrite, watermarks and late data, out-of-order updates, verifying a load). All questions are original and use the Leafy data.

**Lab:** [`sql-warehouse-writes-lab/`](sql-warehouse-writes-lab/README.md) next to this file holds the four batch files, the SQL, a loader CLI, and pytest tests (slides 24–25).

**Additions beyond the original brief** are marked *(added)*: PostgreSQL MERGE and INSERT … ON CONFLICT executed in a real PostgreSQL engine (PGlite), not just shown; how each engine treats duplicate source rows (DuckDB updates twice; PostgreSQL, T-SQL, Snowflake, BigQuery, Delta raise an error); WHEN NOT MATCHED BY SOURCE, and why it is dangerous with an incremental batch; change detection with IS DISTINCT FROM (no-op updates); what breaks idempotency: increments, now(), sequences; transactions and a load log (batch ledger); static vs dynamic partition overwrite, and the MERGE ON FALSE trick; the high-water mark with a lookback window, and watermarking on arrival time; tombstones (soft deletes) so late updates cannot resurrect deleted rows; order-independent loads proved by replaying batches in reverse; dialect notes for T-SQL / Fabric Warehouse, Snowflake, BigQuery, Spark / Delta; “In your portfolio” notes for Fuel Smart.

## Contents

1. [SQL warehouse writes: MERGE, idempotent loads and incremental patterns](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was executed](#slide-2)
3. [The running example: Leafy’s order change feed](#slide-3)
4. [Why INSERT is not a load: run it twice](#slide-4)
5. [MERGE: one statement that reconciles a batch with a table](#slide-5)
6. [The delete branch: hard deletes, soft deletes, and clause order](#slide-6)
7. [WHEN NOT MATCHED BY SOURCE: powerful with snapshots, destructive with batches](#slide-7)
8. [Change detection: update only what really changed](#slide-8)
9. [MERGE across engines: PostgreSQL executed, the rest compared](#slide-9)
10. [Duplicate source rows: what each engine does](#slide-10)
11. [De-duplicate the source before MERGE](#slide-11)
12. [Prove it: run the load twice, compare fingerprints](#slide-12)
13. [What breaks idempotency](#slide-13)
14. [All or nothing: transactions and a load log](#slide-14)
15. [Delete+insert by key](#slide-15)
16. [Delete+insert by date partition: refresh only the days that changed](#slide-16)
17. [insert_overwrite: replace partitions without matching rows](#slide-17)
18. [Merge, delete+insert, or insert_overwrite: choose and justify](#slide-18)
19. [Incremental loads: the high-water mark](#slide-19)
20. [Late-arriving data: a lookback window, or watermark on arrival](#slide-20)
21. [Late-arriving updates: a version guard and tombstones](#slide-21)
22. [Late-arriving facts: refresh the partitions the data belongs to](#slide-22)
23. [Reconcile: the incremental table must equal a full rebuild](#slide-23)
24. [Lab: load four days of Leafy orders safely](#slide-24)
25. [Lab: run it, re-run it, reconcile, test](#slide-25)
26. [Bug clinic: believable write bugs](#slide-26)
27. [Interview questions and model answers](#slide-27)
28. [Exercises 1–2: upsert and de-duplicate](#slide-28)
29. [Exercises 3–4: idempotency and three branches](#slide-29)
30. [Exercises 5–6: partitions and out-of-order changes](#slide-30)
31. [Exercises 7–8: choose a strategy, size a lookback](#slide-31)
32. [Exercises 9–10: a load test and a scoped snapshot sync](#slide-32)
33. [Cheat sheet](#slide-33)
34. [Glossary](#slide-34)
35. [Recap and practice plan](#slide-35)
36. [References and how this deck was tested](#slide-36)
37. [Appendix A · Hints](#appendix-a)
38. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. SQL warehouse writes: MERGE, idempotent loads and incremental patterns

**

Write every load as if it will run twice, because one day it will. Earlier decks taught you to *read* data correctly: grain, joins, windows, the latest row per key. This deck is about *writing* it: turning a batch of changed rows into a correct warehouse table, and keeping it correct when the job runs twice, out of order, or three days late.

- **Part A, MERGE:** insert, update and delete branches; `WHEN NOT MATCHED BY SOURCE`; change detection; dialect differences (PostgreSQL executed).
- **Part B, safe to re-run:** duplicate source rows and what each engine does with them; de-duplicating the batch before `MERGE`; proving a load is idempotent; what breaks idempotency; transactions and a load log.
- **Part C, partitions:** delete+insert by key and by date partition; `insert_overwrite` (static vs dynamic); choosing merge vs delete+insert vs insert_overwrite.
- **Part D, incremental and late:** the high-water mark and its lookback window; out-of-order updates with a version guard and tombstones; late-arriving facts; reconciling with a full rebuild.
- **Practice:** a lab with a loader CLI and pytest tests, a bug clinic, 8 interview questions with model answers, and 10 exercises.

Every DuckDB and PostgreSQL statement ran while this deck was built; the result under each statement is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Reading data wrong gives you one wrong number. Writing it wrong gives you a wrong *table*, and every dashboard, model, and export built on it inherits the error until somebody notices. Warehouse loads run on schedules, fail halfway, get retried, receive the same rows twice, and receive yesterday’s rows tomorrow. This deck teaches the small set of write patterns that keep a table correct through all of that: `MERGE` with explicit branches, a de-duplicated source, loads that give the same result when re-run, partition replacement, and deliberate handling of late data, plus the check that proves it: the incremental table equals a full rebuild.

#### Where you will use it

- Loading staging data into fact and dimension tables (the “L” and much of the “T” in ELT).
- Applying a change feed (CDC) from an operational database to the warehouse.
- Refreshing daily aggregates and marts by date partition.
- Backfills and re-runs after an incident.
- Every dbt incremental model: dbt generates exactly these statements.

#### What goes wrong without it

- A retried job doubles revenue: the same rows are appended twice.
- “The MERGE statement attempted to UPDATE or DELETE the same row more than once” at 3 a.m.
- A late, older update overwrites a newer one and a refunded order shows as shipped.
- A deleted order comes back to life; a partition overwrite wipes a month of data.
- A watermark silently skips rows that arrived late, and nobody can say how many.

#### Who expects you to know it

- Data engineers: they own the loads, the retries, and the backfills.
- Analytics engineers: incremental models, snapshots, and their tests.
- On-call engineers who must re-run a failed job without making it worse.
- Interviewers: “write a MERGE from staging” and “what happens if it runs twice?” are standard questions.

> **On the job:** A typical ticket: “Revenue for 1 March went up by 15 € three days after the day closed, the refund for order 107 disappeared yesterday, and last night’s retry created duplicates.” A strong answer explains each symptom (a late-arriving order, an out-of-order update overwriting a newer one, an append without a key), fixes the load with a de-duplicated, version-guarded MERGE plus a partition refresh, and proves the fix by comparing the table with a full rebuild.

> **The main idea:** a load is correct only if it is correct when it runs twice, out of order, and late; MERGE, de-duplication, partition replacement, and a rebuild comparison make that true and provable.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [dbt: incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [Microsoft DP-700 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Rows change or repeat, and each has a key | `MERGE` with a de-duplicated source (lessons 5–11) | Updates in place; inserts new keys; re-runs change nothing. |
| The source sends deletes | A delete branch, usually a soft delete (lessons 6, 21) | Keeps a tombstone that late updates cannot overwrite. |
| The engine has no MERGE, or batches are large and keyed | Delete+insert by key in one transaction (lesson 15) | Two simple statements; same result as an upsert. |
| Facts or aggregates partitioned by date; changes confined to a few days | Delete+insert by partition, or `insert_overwrite` (lessons 16–17) | Replace whole days; no per-row matching. |
| Huge table, only new rows matter | A high-water mark plus a lookback window (lessons 19–20) | Reads only recent changes; overlap is safe because the write is idempotent. |
| Immutable events delivered exactly once | Not MERGE: plain append | Nothing to match; MERGE adds cost. |
| Small table or logic over all history | Not incremental: rebuild the table | Simplest correct answer; nothing to drift. |
| You need every past version of a row | Not an upsert: SCD Type 2 / snapshots | An upsert keeps only the current version. |

#### How interviews test it

- “Write a MERGE that loads staging into the target” (keys, branches, delete handling).
- “What happens if this job runs twice? Make it idempotent.”
- “The MERGE fails with a duplicate-row error. Why, and how do you fix it?”
- “MERGE, delete+insert, or partition overwrite: which and why?”
- “How do you handle late-arriving data in an incremental load?”

#### Where it sits in your learning path

- Builds on *SQL correctness* (grain, anti-joins, `IS DISTINCT FROM`), *Classic SQL patterns* (latest row per key), *Window functions* (`ROW_NUMBER`, `QUALIFY`), and *Python files and streams* (transactions, load logs).
- Pairs with *dbt incremental models, snapshots and unit tests*, which teaches the dbt side of the same strategies, and feeds the Fuel Smart portfolio loads.

> **The main idea:** reach for MERGE when keyed rows change or repeat, for partition replacement when changes are confined to whole days, for append only when rows are immutable and arrive once, and for a full rebuild when the table is small.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was executed

*Start here · DuckDB from Python, plus PostgreSQL in Node*

| Item | Detail |
|---|---|
| Tested engine | **DuckDB 1.5.6** (Python package) on **CPython 3.12.10**, Windows 11. Every lesson, exercise, and the lab use it. |
| Executed, PostgreSQL | **PostgreSQL 18.3** in **PGlite 0.5.8**: the real PostgreSQL server compiled to WebAssembly and run by Node.js. Used on the dialect and duplicate-row slides. Optional: skip it and read the results on the slides. |
| Minimum versions | `MERGE INTO` arrived in **DuckDB 1.4**; `INSERT … ON CONFLICT` works in older versions. PostgreSQL has `MERGE` since 15; `WHEN NOT MATCHED BY SOURCE` and `RETURNING merge_action()` since 17. |
| Not executed | T-SQL (SQL Server, Fabric Warehouse), Snowflake, BigQuery, and Spark SQL / Delta Lake snippets: no server, Java, or cloud account on the build machine. Each is labelled *not executed* and has no output. |
| How results were produced | The build runs every statement and prints the real result. A statement that fails unexpectedly, returns an unexpected result, or returns several rows without `ORDER BY` is a build failure. This deck built with **0 failures**. |

#### Create the environment

```text
# Windows (PowerShell); on macOS/Linux: source .venv/bin/activate
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install "duckdb>=1.4" pytest

# optional: real PostgreSQL without a server (needs Node.js)
npm install @electric-sql/pglite
```

#### Check it

```python
import sys, duckdb
print("Python", sys.version.split()[0], "· DuckDB", duckdb.__version__)
con = duckdb.connect()
con.execute("CREATE TABLE t (id INTEGER, v VARCHAR)")
print(con.execute("""MERGE INTO t USING (SELECT 1 AS id, 'a' AS v) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT VALUES (s.id, s.v)""").fetchall())
```

Output:

```text
Python 3.12.10 · DuckDB 1.5.6
[(1,)]
```

`MERGE` returns the number of rows it changed. If this line raises a parser error, your DuckDB is older than 1.4.

*SQL · PostgreSQL (PGlite)*

```sql
SELECT current_setting('server_version') AS server_version;
```

Result (1 row):

| server_version |
|---|
| 18.3 |

> **On the job:** Write logic usually runs inside a scheduled job (Airflow, Fabric pipelines, dbt, a cron script) against a cloud warehouse you cannot freely experiment on. Prototyping the exact `MERGE` on a laptop engine, with the edge cases from production planted in a few rows, is the cheapest way to catch the bugs this deck is about.

> **The main idea:** one local engine, four small batch files, and a real PostgreSQL for comparison; every result in the deck is reproducible on any machine.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [PGlite documentation](https://pglite.dev/docs/).

---

<a id="slide-3"></a>
## 3. The running example: Leafy’s order change feed

*Start here · four daily files, every write trap planted*

Leafy, the plant shop from earlier decks, runs its web shop on an operational database. Every day at noon an extract job writes the order rows that changed since the last extract to a CSV file: one row per **change**, with an operation code `op` (`I` insert, `U` update, `D` delete), the source’s change time `updated_at`, and `change_seq`, a number the source increases with every change. A feed like this is called a **change feed**; when it comes from the database log it is **change data capture (CDC)**.

Your job is the warehouse side: keep `fct_orders` at **one row per order** (its **grain**), and keep a daily sales aggregate correct. The four files ship in the lab folder (`sql-warehouse-writes-lab/data`); the statement below reads all of them into one table, `raw_changes`, with the batch number taken from the file name.

*SQL · load the four batch files*

```sql
CREATE OR REPLACE TABLE raw_changes AS
SELECT regexp_extract(filename, 'batch_([0-9]+)', 1)::INTEGER AS batch_id, * EXCLUDE (filename)
FROM read_csv('sql-warehouse-writes-lab/data/batch_*.csv', header = true, filename = true,
     columns = {'change_seq': 'BIGINT', 'op': 'VARCHAR', 'order_id': 'INTEGER',
                'customer_id': 'INTEGER', 'order_date': 'DATE', 'status': 'VARCHAR',
                'amount': 'DECIMAL(10,2)', 'updated_at': 'TIMESTAMP'});
```

#### Four batches

```sql
SELECT batch_id, count(*) AS row_count,
       count(DISTINCT order_id) AS distinct_orders,
       min(change_seq) AS min_seq, max(change_seq) AS max_seq
FROM raw_changes
GROUP BY batch_id
ORDER BY batch_id;
```

Result (4 rows):

| batch_id | row_count | distinct_orders | min_seq | max_seq |
|---|---|---|---|---|
| 1 | 8 | 5 | 1 | 7 |
| 2 | 5 | 5 | 9 | 13 |
| 3 | 3 | 3 | 16 | 18 |
| 4 | 4 | 4 | 8 | 19 |

Batch 1 has 8 rows but only 5 orders, plus one row with no order at all. Batch 4 contains change numbers 8, 14, and 15: rows that happened days ago and arrive late.

#### Traps planted in the data

| Trap | Rows | Lesson |
|---|---|---|
| Two versions of one order in one batch | 102: seq 2 and 4 | 10, 11 |
| An exact duplicate (the extract retried) | 104: seq 5 twice | 10, 11 |
| A row with a NULL key | seq 7 | 11 |
| A hard delete in the source | 105: seq 10 | 6, 21 |
| A late-arriving fact (old order date) | 108: placed 1 March, sent 4 March | 22 |
| Out-of-order updates | 107: seq 14 after 17; 105: seq 8 after its delete | 21 |
| A late row the watermark skips | 109: seq 15 | 19, 20 |

#### Batch 1 in full

```sql
SELECT change_seq, op, order_id, order_date, status, amount, updated_at
FROM raw_changes
WHERE batch_id = 1
ORDER BY change_seq, order_id;
```

Result (8 rows):

| change_seq | op | order_id | order_date | status | amount | updated_at |
|---|---|---|---|---|---|---|
| 1 | I | 101 | 2026-03-01 | placed | 25.00 | 2026-03-01 10:00:00 |
| 2 | I | 102 | 2026-03-01 | placed | 40.00 | 2026-03-01 11:30:00 |
| 3 | I | 103 | 2026-03-01 | placed | 18.50 | 2026-03-01 14:00:00 |
| 4 | U | 102 | 2026-03-01 | shipped | 40.00 | 2026-03-01 18:00:00 |
| 5 | I | 104 | 2026-03-02 | placed | 60.00 | 2026-03-02 09:15:00 |
| 5 | I | 104 | 2026-03-02 | placed | 60.00 | 2026-03-02 09:15:00 |
| 6 | I | 105 | 2026-03-02 | placed | 12.00 | 2026-03-02 10:00:00 |
| 7 | I | NULL | 2026-03-02 | placed | 99.00 | 2026-03-02 11:00:00 |

#### What the warehouse held after day 1

*SQL · the target after day 1*

```sql
CREATE TABLE day1_state (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date  DATE,
    status      VARCHAR,
    amount      DECIMAL(10,2),
    updated_at  TIMESTAMP,
    change_seq  BIGINT,
    is_deleted  BOOLEAN DEFAULT false
);
INSERT INTO day1_state VALUES
  (101, 1, '2026-03-01', 'placed',  25.00, '2026-03-01 10:00', 1, false),
  (102, 2, '2026-03-01', 'shipped', 40.00, '2026-03-01 18:00', 4, false),
  (103, 3, '2026-03-01', 'placed',  18.50, '2026-03-01 14:00', 3, false),
  (104, 1, '2026-03-02', 'placed',  60.00, '2026-03-02 09:15', 5, false),
  (105, 4, '2026-03-02', 'placed',  12.00, '2026-03-02 10:00', 6, false);
```

This is the correct result of loading batch 1: one row per order, the newest version of 102, the duplicate collapsed, the NULL-key row kept out. Part A starts from this state; lesson 11 builds it from batch 1 and proves it is identical.

> **On the job:** Real change feeds look like this: retries produce exact duplicates, a busy row changes twice between extracts, replication lag delivers rows days late, and a few rows are broken. Listing the traps for your own feed (with the row counts) is a typical first task when you inherit a pipeline, and the first thing an interviewer probes with “what could go wrong with this load?”.

> **The main idea:** one change feed with every common write trap planted; each lesson shows how one trap changes the target table and the SQL that controls it.

*Read more:* [DuckDB: CSV import](https://duckdb.org/docs/stable/data/csv/overview), [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into).

---

<a id="slide-4"></a>
## 4. Why INSERT is not a load: run it twice

*Part A · what goes wrong when the same batch arrives twice*

The simplest load is an `INSERT … SELECT` from the batch into the target. It works exactly once. Jobs are retried after timeouts, re-run after incidents, and backfilled, so the real question about any load is what the table looks like after it runs *twice*.

#### ✗ Append the batch, then retry

```sql
CREATE OR REPLACE TABLE orders_append AS FROM day1_state;

INSERT INTO orders_append      -- the nightly job loads batch 2 ...
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq, false FROM raw_changes WHERE batch_id = 2;
INSERT INTO orders_append      -- ... and the scheduler retries it after a timeout
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq, false FROM raw_changes WHERE batch_id = 2;

SELECT order_id, count(*) AS copies,
       string_agg(status, ' → ' ORDER BY change_seq) AS versions
FROM orders_append
GROUP BY order_id
ORDER BY order_id;
```

Result (7 rows):

| order_id | copies | versions |
|---|---|---|
| 101 | 3 | placed → shipped → shipped |
| 102 | 1 | shipped |
| 103 | 3 | placed → cancelled → cancelled |
| 104 | 1 | placed |
| 105 | 3 | placed → placed → placed |
| 106 | 2 | placed → placed |
| 107 | 2 | placed → placed |

Orders 101, 103, and 105 now have three rows: the day-1 version and two copies of the batch-2 change. Every sum over this table is wrong, and the delete for 105 became one more row.

#### With a primary key: a loud failure instead

```sql
CREATE OR REPLACE TEMP TABLE orders_pk (order_id INTEGER PRIMARY KEY, status VARCHAR);
INSERT INTO orders_pk SELECT order_id, status FROM day1_state;
INSERT INTO orders_pk SELECT order_id, status FROM raw_changes WHERE batch_id = 2;
```

Error (expected):

```text
ConstraintException: Constraint Error: Duplicate key "order_id: 103" violates primary key constraint.
```

A **primary key** constraint stops the duplicates, but the job now fails instead of updating 101 and 103. Neither outcome is a usable load. Most cloud warehouses (Snowflake, BigQuery, Fabric Warehouse) do not even enforce primary keys, so you get the silent version.

Three terms for the rest of the deck. The **target** is the table you write to (`fct_orders`); the **source** is the batch you write from (here a staging table or query over `raw_changes`). An **upsert** updates the target row when the key already exists and inserts it when it does not. A load is **idempotent** (or **re-runnable**) when running it twice leaves the target exactly as running it once.

**Coming from C#:** an append is `list.Add(order)`; a primary key is `dict.Add(key, order)`, which throws on a repeat; an upsert is `dict[key] = order`, which you can call any number of times with the same result.

> **On the job:** “What happens if this job runs twice?” is the first question to ask about any load in code review, and a standard interview question. An append is acceptable only for immutable events that are guaranteed to arrive once, and those guarantees are rarer than they look.

> **The main idea:** an append duplicates on every retry and a key turns the retry into a failure; a warehouse load must be an upsert keyed on the grain.

*Read more:* [DuckDB: INSERT (ON CONFLICT)](https://duckdb.org/docs/stable/sql/statements/insert), [DuckDB: constraints](https://duckdb.org/docs/stable/sql/constraints).

---

<a id="slide-5"></a>
## 5. MERGE: one statement that reconciles a batch with a table

*Part A · the anatomy of an upsert*

**MERGE** joins the source to the target on a match condition and, for every source row, runs the first `WHEN` branch that applies: `WHEN MATCHED` when a target row has the same key, `WHEN NOT MATCHED` when none does. It is an upsert (and, next lesson, a delete) in one atomic statement. DuckDB has it since 1.4; PostgreSQL since 15; SQL Server, Fabric Warehouse, Snowflake, BigQuery, and Delta Lake all have it.

#### Load batch 2 (inserts and updates)

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;   -- start from the day-1 state

MERGE INTO fct_orders AS t                       -- the target
USING (SELECT * FROM raw_changes
       WHERE batch_id = 2 AND op <> 'D') AS s     -- the source (deletes: next lesson)
ON t.order_id = s.order_id                        -- match on the key (the grain)
WHEN MATCHED THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED THEN INSERT
    (order_id, customer_id, order_date, status, amount, updated_at, change_seq, is_deleted)
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false)
RETURNING merge_action, order_id, status;
```

Result (rows sorted for display) (4 rows):

| merge_action | order_id | status |
|---|---|---|
| INSERT | 106 | placed |
| INSERT | 107 | placed |
| UPDATE | 101 | shipped |
| UPDATE | 103 | cancelled |

`RETURNING merge_action` reports what happened to each row: two updates, two inserts. Without `RETURNING`, `MERGE` returns the count of changed rows.

#### The target afterwards

```sql
SELECT order_id, status, amount, change_seq
FROM fct_orders
ORDER BY order_id;
```

Result (7 rows):

| order_id | status | amount | change_seq |
|---|---|---|---|
| 101 | shipped | 25.00 | 13 |
| 102 | shipped | 40.00 | 4 |
| 103 | cancelled | 18.50 | 9 |
| 104 | placed | 60.00 | 5 |
| 105 | placed | 12.00 | 6 |
| 106 | placed | 33.00 | 11 |
| 107 | placed | 27.00 | 12 |

| Clause | What it decides |
|---|---|
| `MERGE INTO t` | the one table that is written |
| `USING s` | any table, view, or subquery; should have one row per key |
| `ON` | the key that defines the grain; nothing else |
| `WHEN MATCHED` | the key exists: update (or delete) |
| `WHEN NOT MATCHED` | a new key: insert |

**Coming from C#:** picture a loop over the source rows with `if (target.TryGetValue(key, out var row)) Update(row); else Insert(newRow);`, except that the engine does it as one set-based join and commits it all or nothing.

**Pitfall:** the `ON` condition must be exactly the key. Adding a non-key column (`AND t.status = s.status`) makes every changed row “not matched”, so changes are inserted as new rows: the duplicates come back through the side door.

> **On the job:** Most warehouse fact and dimension loads are a MERGE from a staging table keyed on the table’s grain. dbt’s `merge` incremental strategy generates exactly this statement (see *dbt incremental models, snapshots and unit tests*, lesson 6), so reading the generated SQL is a daily debugging skill.

> **The main idea:** MERGE matches source to target on the key and runs one branch per source row: update when matched, insert when not.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html).

---

<a id="slide-6"></a>
## 6. The delete branch: hard deletes, soft deletes, and clause order

*Part A · I write MERGE with insert / update / delete branches*

Batch 2 says order 105 was deleted in the shop (`op = 'D'`). A `MERGE` can act on that with a **conditional branch**: `WHEN MATCHED AND <condition> THEN …`. Branches are tried top to bottom and the **first branch whose condition is true wins**, so specific branches go before general ones.

#### Hard delete: remove the row

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;   -- start from the day-1 state

MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 2) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN DELETE           -- conditional branch first
WHEN MATCHED THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT       -- never insert a deleted order
    (order_id, customer_id, order_date, status, amount, updated_at, change_seq, is_deleted)
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false)
RETURNING merge_action, order_id, status;
```

Result (rows sorted for display) (5 rows):

| merge_action | order_id | status |
|---|---|---|
| DELETE | 105 | placed |
| INSERT | 106 | placed |
| INSERT | 107 | placed |
| UPDATE | 101 | shipped |
| UPDATE | 103 | cancelled |

The `NOT MATCHED` branch also needs `AND s.op <> 'D'`: a delete for an order the warehouse never saw must not insert it.

#### Soft delete: keep a tombstone

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;   -- start from the day-1 state

MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 2) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN UPDATE           -- soft delete: keep a tombstone
    SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT
    (order_id, customer_id, order_date, status, amount, updated_at, change_seq, is_deleted)
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false);

SELECT order_id, status, change_seq, is_deleted
FROM fct_orders
WHERE order_id IN (103, 105)
ORDER BY order_id;
```

Result (2 rows):

| order_id | status | change_seq | is_deleted |
|---|---|---|---|
| 103 | cancelled | 9 | false |
| 105 | placed | 10 | true |

A **hard delete** removes the row. A **soft delete** keeps it with `is_deleted = true`; that kept row is a **tombstone**. Reports read a view with `WHERE NOT is_deleted`. Lesson 21 shows why the tombstone matters: without it, a late update can bring the order back.

#### ✗ First match wins: a guard before the delete branch

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;   -- start from the day-1 state

MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 2) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq > t.change_seq THEN  -- also true for the delete row!
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op = 'D' THEN DELETE             -- never reached for 105
RETURNING merge_action, order_id, status;
```

Result (rows sorted for display) (3 rows):

| merge_action | order_id | status |
|---|---|---|
| UPDATE | 101 | shipped |
| UPDATE | 103 | cancelled |
| UPDATE | 105 | placed |

#### ✓ Clause order across engines

#### Engines disagree on an unconditional branch placed first

```sql
CREATE OR REPLACE TABLE t AS FROM (VALUES (1, 'a'), (2, 'b')) AS x(id, v);
CREATE OR REPLACE TABLE s AS FROM (VALUES (1, 'U'), (2, 'D')) AS x(id, op);
MERGE INTO t USING s ON t.id = s.id
WHEN MATCHED THEN UPDATE SET v = 'updated'
WHEN MATCHED AND s.op = 'D' THEN DELETE
RETURNING merge_action, id;
```

Result (rows sorted for display) (2 rows):

| merge_action | id |
|---|---|
| DELETE | 2 |
| UPDATE | 1 |

DuckDB 1.5.6 quietly evaluates the unconditional branch last. PostgreSQL rejects the same statement:

*SQL · PostgreSQL (executed in PGlite)*

```sql
MERGE INTO t USING s ON t.id = s.id
WHEN MATCHED THEN UPDATE SET v = 'updated'
WHEN MATCHED AND s.op = 'D' THEN DELETE;
```

Error (expected):

```text
ERROR: unreachable WHEN clause specified after unconditional WHEN clause
```

Snowflake also rejects it as unreachable; T-SQL allows two `WHEN MATCHED` branches only if the first has a condition. Do not rely on any of this: write the order you mean.

In the left card, the delete row for 105 has a newer `change_seq`, so the update branch matches first and the delete never runs: 105 stays alive with the deleted row’s values. Put `op = 'D'` branches first, or add `AND s.op <> 'D'` to the update branch.

> **On the job:** Prefer soft deletes in the warehouse: they keep an audit trail, let downstream incremental models see that a row was deleted (a hard-deleted row simply vanishes from their input), and protect against late updates. Hard-delete only when a legal requirement (for example a GDPR erasure request) says the data must be gone, and then delete in every layer.

> **The main idea:** delete branches are conditional MATCHED branches; put them first, never insert a delete, and prefer a soft-delete tombstone.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html), [Snowflake: MERGE](https://docs.snowflake.com/en/sql-reference/sql/merge).

---

<a id="slide-7"></a>
## 7. WHEN NOT MATCHED BY SOURCE: powerful with snapshots, destructive with batches

*Part A · the branch for target rows the source does not mention (added)*

`WHEN NOT MATCHED BY SOURCE` fires for *target* rows that no source row matched. (Plain `WHEN NOT MATCHED` is short for `WHEN NOT MATCHED BY TARGET`: source rows with no target row.) It turns a `MERGE` into a full synchronisation, which is right only when the source is a **full snapshot** (every row that should exist) and badly wrong when it is an **incremental batch** (only the rows that changed).

#### ✗ Wrong: batch 2 is only the changes

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;   -- start from the day-1 state

MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 2 AND op <> 'D') AS s
ON t.order_id = s.order_id
WHEN MATCHED THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED THEN INSERT
    (order_id, customer_id, order_date, status, amount, updated_at, change_seq, is_deleted)
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false)
WHEN NOT MATCHED BY SOURCE THEN DELETE            -- "not in the batch"
RETURNING merge_action, order_id;
```

Result (rows sorted for display) (7 rows):

| merge_action | order_id |
|---|---|
| DELETE | 102 |
| DELETE | 104 |
| DELETE | 105 |
| INSERT | 106 |
| INSERT | 107 |
| UPDATE | 101 |
| UPDATE | 103 |

#### ✓ Fixed

#### Right: the source is a full snapshot

```sql
CREATE OR REPLACE TABLE dim_product AS FROM (VALUES
    ('FERN-01', 'Boston fern',    18.50, true),
    ('POT-01',  'Terracotta pot',  9.00, true),
    ('POT-02',  'Glazed pot',     14.00, true),
    ('MON-01',  'Monstera',       32.00, true)) AS v(sku, name, price, is_active);
CREATE OR REPLACE TABLE catalog_snapshot AS FROM (VALUES     -- today's FULL catalog
    ('FERN-01', 'Boston fern',    19.50),
    ('POT-01',  'Terracotta pot',  9.00),
    ('MON-01',  'Monstera',       32.00),
    ('CAC-01',  'Cactus trio',    21.00)) AS v(sku, name, price);

MERGE INTO dim_product AS t
USING catalog_snapshot AS s
ON t.sku = s.sku
WHEN MATCHED THEN UPDATE SET name = s.name, price = s.price, is_active = true
WHEN NOT MATCHED THEN INSERT VALUES (s.sku, s.name, s.price, true)
WHEN NOT MATCHED BY SOURCE AND t.is_active THEN UPDATE SET is_active = false;

SELECT * FROM dim_product ORDER BY sku;
```

Result (5 rows):

| sku | name | price | is_active |
|---|---|---|---|
| CAC-01 | Cactus trio | 21.00 | true |
| FERN-01 | Boston fern | 19.50 | true |
| MON-01 | Monstera | 32.00 | true |
| POT-01 | Terracotta pot | 9.00 | true |
| POT-02 | Glazed pot | 14.00 | false |

POT-02 is missing from today’s full catalog, so it is deactivated (a soft delete); CAC-01 is new. The `AND t.is_active` condition avoids rewriting rows that are already inactive. (On the build machine, DuckDB 1.5.6 crashed when `RETURNING` was added to a `BY SOURCE … UPDATE`, so the result is read back with a `SELECT`.)

On the left, orders 102 and 104 did not change on day 2, so they are not in the batch, and the branch deleted them. (105 is deleted too, but only by accident: the batch excluded its delete row.) The statement is perfectly valid SQL; the bug is the assumption about the source.

**Pitfall:** even with a real snapshot, an empty or truncated file (a failed extract) would deactivate everything. Check the snapshot’s row count against yesterday’s before running this branch, and fail the job if it drops sharply. Exercise 10 scopes the branch to one partition: `WHEN NOT MATCHED BY SOURCE AND t.order_date = …`.

**In your portfolio:** a monthly USDA FoodData Central Branded Foods release is a full snapshot, so foods missing from it can be soft-deleted with this branch; an Open Food Facts delta file is a batch of changes, so it must not use it.

> **On the job:** Use this branch for small reference data that arrives as a complete file every day: product catalogs, store lists, exchange-rate tables, user-role mappings. For change feeds, deletes must arrive as explicit rows (`op = 'D'`), as in lesson 6. Support differs: DuckDB 1.4+, PostgreSQL 17+, SQL Server / Fabric, BigQuery, and Delta Lake have the branch; Snowflake does not.

> **The main idea:** NOT MATCHED BY SOURCE means “missing from the source”; that equals “deleted” only when the source is a complete snapshot.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html), [BigQuery: DML (MERGE)](https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax).

---

<a id="slide-8"></a>
## 8. Change detection: update only what really changed

*Part A · conditional updates and NULL-safe comparison (added)*

An unconditional `WHEN MATCHED THEN UPDATE` rewrites every matched row, even when nothing changed. The table ends up the same, but the engine did the work, and on lakehouse formats (Delta, Iceberg) every rewritten row means a rewritten file. **Change detection** adds a condition so only rows whose values differ are updated.

#### Re-running batch 2: 4 rows “changed”

```sql
MERGE INTO fct_orders AS t                       -- lesson 5's MERGE already ran;
USING (SELECT * FROM raw_changes                  -- run the same statement again
       WHERE batch_id = 2 AND op <> 'D') AS s
ON t.order_id = s.order_id
WHEN MATCHED THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED THEN INSERT
    (order_id, customer_id, order_date, status, amount, updated_at, change_seq, is_deleted)
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false);
```

Result (1 row):

| Count |
|---|
| 4 |

#### With change detection: 0 rows changed

```sql
MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes
       WHERE batch_id = 2 AND op <> 'D') AS s
ON t.order_id = s.order_id
WHEN MATCHED AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED THEN INSERT
    (order_id, customer_id, order_date, status, amount, updated_at, change_seq, is_deleted)
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false);
```

Result (1 row):

| Count |
|---|
| 0 |

`(a, b) IS DISTINCT FROM (c, d)` compares the whole tuple and treats two NULLs as equal. Same table, no writes, and the row count now tells the truth: a re-run changed nothing.

#### Why not `<>`?

```sql
CREATE OR REPLACE TABLE price_t AS FROM (VALUES ('FERN-01', NULL::DECIMAL(10,2))) AS v(sku, price);
CREATE OR REPLACE TABLE price_s AS FROM (VALUES ('FERN-01', 19.50::DECIMAL(10,2))) AS v(sku, price);

SELECT (SELECT count(*) FROM price_t t JOIN price_s s USING (sku)
        WHERE t.price <> s.price)                AS changed_by_not_equal,
       (SELECT count(*) FROM price_t t JOIN price_s s USING (sku)
        WHERE t.price IS DISTINCT FROM s.price)  AS changed_by_is_distinct;
```

Result (1 row):

| changed_by_not_equal | changed_by_is_distinct |
|---|---|
| 0 | 1 |

`NULL <> 19.50` is unknown, not true, so the row that gained a price is never updated. This is the three-valued-logic trap from *SQL correctness: joins, grain, and NULLs*; `IS DISTINCT FROM` is the NULL-safe comparison.

#### Many columns: a row hash

With 40 columns, teams store a **row hash**: `md5(…)` over the business columns, computed in staging, compared in the `WHEN MATCHED AND t.row_hash <> s.row_hash` branch.

**Pitfall:** build the hashed string so that NULLs and column boundaries survive. `concat_ws('|', 'a', NULL, 'b')` and `concat_ws('|', 'a', 'b', NULL)` are both `a|b`: coalesce each column to a marker such as `'∅'` first.

> **On the job:** Change detection pays off three times: fewer writes on large targets, an honest “rows changed” metric in the load log (a re-run should report 0), and correct audit columns such as `_updated_at`, which downstream incremental models use as their watermark. If every run touches every row, every downstream model reprocesses everything.

> **The main idea:** add AND (target columns) IS DISTINCT FROM (source columns) to the update branch, so a re-run reports and writes nothing.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [DuckDB: comparison operators (IS DISTINCT FROM)](https://duckdb.org/docs/stable/sql/expressions/comparison_operators).

---

<a id="slide-9"></a>
## 9. MERGE across engines: PostgreSQL executed, the rest compared

*Part A · the same upsert in the dialects interviews ask about (added)*

The `MERGE` skeleton is standard SQL; the details differ. PostgreSQL 18.3 runs below for real (PGlite), with the same five changes from batch 2 and a primary key on the target. `RETURNING` has no `ORDER BY`, so to sort the report the statement goes into a CTE; and `merge_action()` is a function there, a column in DuckDB.

#### PostgreSQL: MERGE with all three branches

*SQL · PostgreSQL (executed in PGlite)*

```sql
WITH m AS (
    MERGE INTO fct_orders AS t
    USING stg AS s
    ON t.order_id = s.order_id
    WHEN MATCHED AND s.op = 'D' THEN DELETE
    WHEN MATCHED THEN
        UPDATE SET status = s.status, amount = s.amount, change_seq = s.change_seq
    WHEN NOT MATCHED AND s.op <> 'D' THEN
        INSERT VALUES (s.order_id, s.status, s.amount, s.change_seq)
    RETURNING merge_action() AS action, t.order_id, t.status
)
SELECT * FROM m ORDER BY order_id;
```

Result (5 rows):

| action | order_id | status |
|---|---|---|
| UPDATE | 101 | shipped |
| UPDATE | 103 | cancelled |
| DELETE | 105 | placed |
| INSERT | 106 | placed |
| INSERT | 107 | placed |

#### PostgreSQL’s older upsert: INSERT … ON CONFLICT

*SQL · PostgreSQL (executed in PGlite)*

```sql
WITH u AS (
    INSERT INTO fct_orders AS t (order_id, status, amount, change_seq)
    SELECT order_id, status, amount, change_seq FROM stg WHERE op <> 'D'
    ON CONFLICT (order_id) DO UPDATE
        SET status = excluded.status, amount = excluded.amount, change_seq = excluded.change_seq
        WHERE (t.status, t.amount) IS DISTINCT FROM (excluded.status, excluded.amount)
    RETURNING t.order_id, t.status, (xmax = 0) AS inserted
)
SELECT * FROM u ORDER BY order_id;
```

Result (4 rows):

| order_id | status | inserted |
|---|---|---|
| 101 | shipped | false |
| 103 | cancelled | false |
| 106 | placed | true |
| 107 | placed | true |

`ON CONFLICT` needs a unique index on the key and cannot delete. `excluded` is the row that failed to insert; `xmax = 0` is a PostgreSQL idiom for “this row was inserted”. DuckDB supports the same `ON CONFLICT` syntax.

#### T-SQL: reference, not executed

*T-SQL (SQL Server, Fabric Warehouse) (reference, not executed):*

```sql
MERGE INTO dbo.fct_orders AS t
USING stg.order_changes AS s
    ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET t.status = s.status, t.amount = s.amount
WHEN NOT MATCHED BY TARGET AND s.op <> 'D' THEN
    INSERT (order_id, status, amount) VALUES (s.order_id, s.status, s.amount)
OUTPUT $action, inserted.order_id;   -- the semicolon is mandatory
```

#### Spark SQL / Delta Lake: reference, not executed

*Spark SQL / Delta Lake (reference, not executed):*

```sql
MERGE INTO fct_orders AS t
USING order_changes AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT *
```

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| DuckDB 1.4+ | Full `MERGE`, `BY SOURCE`, `RETURNING merge_action`, `UPDATE`/`INSERT` without a column list when using `USING (key)`. Also `INSERT … ON CONFLICT` and `INSERT OR REPLACE`. |
| PostgreSQL 15+ (17+) | `MERGE` (15); `BY SOURCE` and `RETURNING merge_action()` (17); `ON CONFLICT` (9.5) for single-table upserts. |
| SQL Server / Fabric Warehouse | `MERGE` with `BY TARGET`/`BY SOURCE`, `OUTPUT $action`; terminating semicolon required; generally available in Fabric Warehouse. |
| Snowflake | `MERGE` without `BY SOURCE`; `UPDATE ALL BY NAME`, `INSERT ALL BY NAME`; duplicate matches raise an error by default. |
| BigQuery | `MERGE` with `BY SOURCE`, `INSERT ROW`; DML is billed per bytes scanned, so prune the target by partition in `ON`. |
| Spark SQL / Delta Lake | `MERGE INTO` with `UPDATE SET *`, `INSERT *`, `BY SOURCE` (Delta 2.3+); one source row per target row. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Interviews often ask for the upsert “in the warehouse you know”. Know one dialect cold (for this series: DuckDB/PostgreSQL syntax plus T-SQL for Fabric), and know the three differences that bite: whether `BY SOURCE` exists, how the engine treats duplicate source rows (next lesson), and whether primary keys are enforced.

> **The main idea:** the MERGE skeleton is portable; BY SOURCE support, RETURNING/OUTPUT, and duplicate handling are not, so check them per engine.

*Read more:* [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html), [PostgreSQL: INSERT … ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html), [T-SQL: MERGE](https://learn.microsoft.com/en-us/sql/t-sql/statements/merge-transact-sql), [Fabric Warehouse: T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area), [Snowflake: MERGE](https://docs.snowflake.com/en/sql-reference/sql/merge), [BigQuery: DML (MERGE)](https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax), [Delta Lake: upsert with MERGE](https://docs.delta.io/latest/delta-update.html).

---

<a id="slide-10"></a>
## 10. Duplicate source rows: what each engine does

*Part B · the batch has two rows for one key (added)*

`MERGE` assumes the source has **at most one row per key**. Batch 1 breaks that twice: order 102 changed twice before the extract (two versions), and the extract was retried so 104 appears twice (an **exact duplicate**). What happens next depends on the engine, and none of the outcomes is what you want.

#### DuckDB: one target row updated twice

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;

MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes
       WHERE batch_id = 1 AND order_id = 102) AS s   -- two versions of order 102
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET status = s.status, change_seq = s.change_seq;
```

Result (1 row):

| Count |
|---|
| 2 |

```sql
SELECT count(*) AS rows_for_102,
       bool_and(change_seq IN (2, 4)) AS is_one_of_the_two_versions
FROM fct_orders
WHERE order_id = 102;
```

Result (1 row):

| rows_for_102 | is_one_of_the_two_versions |
|---|---|
| 1 | true |

Two updates for one row, and which version wins is *not defined*: the result can be the older `placed` version, silently undoing the shipment.

#### DuckDB: duplicates inserted

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state WHERE false;   -- empty target, same columns

MERGE INTO fct_orders AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 1 AND order_id IS NOT NULL) AS s
ON t.order_id = s.order_id
WHEN NOT MATCHED THEN INSERT
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false);

SELECT order_id, count(*) AS row_count
FROM fct_orders
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;
```

Result (2 rows):

| order_id | row_count |
|---|---|
| 102 | 2 |
| 104 | 2 |

Into an empty target (no primary key, like a warehouse table), both versions of 102 and both copies of 104 are inserted. The grain is broken on the very first load.

#### PostgreSQL: the statement fails

*SQL · PostgreSQL (executed in PGlite)*

```sql
MERGE INTO fct_orders AS t
USING (VALUES (2, 102, 'placed'), (4, 102, 'shipped')) AS s(change_seq, order_id, status)
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET status = s.status, change_seq = s.change_seq;
```

Error (expected):

```text
ERROR: MERGE command cannot affect row a second time
```

PostgreSQL 18.3 refuses to update one row twice in a `MERGE`, and the whole statement rolls back.

#### Other engines (reference, not executed)

| Engine | Duplicate matches on update/delete |
|---|---|
| SQL Server / Fabric Warehouse | Error: “The MERGE statement attempted to UPDATE or DELETE the same row more than once.” |
| Snowflake | Error by default (`ERROR_ON_NONDETERMINISTIC_MERGE`); if switched off, an undefined row wins. Duplicate *inserts* are not checked. |
| BigQuery | Error: a target row may match at most one source row. |
| Spark / Delta Lake | Error: multiple source rows matched the same target row. |

So the same bug is a 3 a.m. failure on one platform and silent corruption on another. The only portable fix is to make the source unique on the key *before* the `MERGE`: next lesson.

> **On the job:** “Our MERGE started failing with a duplicate-row error” is one of the most common load incidents, usually after an upstream change starts sending two versions of a row (an extra join in staging, a retried extract, a CDC feed that now includes intermediate updates). The fix is never to switch the error off; it is to de-duplicate deliberately and add a uniqueness test on the staging key.

> **The main idea:** MERGE needs one source row per key; with duplicates DuckDB updates twice or inserts twice, most other engines raise an error.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html), [Snowflake: MERGE](https://docs.snowflake.com/en/sql-reference/sql/merge), [T-SQL: MERGE](https://learn.microsoft.com/en-us/sql/t-sql/statements/merge-transact-sql).

---

<a id="slide-11"></a>
## 11. De-duplicate the source before MERGE

*Part B · I de-duplicate the source before MERGE*

The recipe has three steps, and the order matters. **1. Quarantine** rows that cannot be loaded (here a NULL key): move them to a side table with a reason, so they are counted and fixed instead of silently lost. **2. Pick one row per key** with `ROW_NUMBER()` over the key, newest first. **3. Test** that the result is unique before writing. Step 2 is the “keep the latest row” pattern from *Classic SQL patterns*, written with `QUALIFY` from *Window functions*.

#### Steps 1 and 2 as reusable SQL

*SQL · keep broken rows, do not drop them*

```sql
CREATE OR REPLACE TABLE quarantine AS
SELECT *, 'order_id is NULL' AS reason
FROM raw_changes
WHERE batch_id = 1 AND order_id IS NULL;
```

*SQL · a reusable de-duplicated batch (table macro)*

```sql
CREATE OR REPLACE MACRO batch_latest(b) AS TABLE
SELECT *
FROM raw_changes
WHERE batch_id = b
  AND order_id IS NOT NULL                       -- broken keys go to quarantine instead
QUALIFY row_number() OVER (PARTITION BY order_id
                           ORDER BY change_seq DESC) = 1;
```

A DuckDB **table macro** is a parameterised view: `batch_latest(1)` returns batch 1, de-duplicated. In dbt this would be a staging model; in T-SQL an inline table-valued function.

#### Why DISTINCT is not enough

```sql
SELECT 'raw rows, NULL key removed' AS step, count(*) AS row_count
FROM raw_changes WHERE batch_id = 1 AND order_id IS NOT NULL
UNION ALL
SELECT 'SELECT DISTINCT *', count(*)
FROM (SELECT DISTINCT * FROM raw_changes WHERE batch_id = 1 AND order_id IS NOT NULL)
UNION ALL
SELECT 'latest row per key (batch_latest)', count(*) FROM batch_latest(1)
ORDER BY row_count DESC;
```

Result (3 rows):

| step | row_count |
|---|---|
| raw rows, NULL key removed | 7 |
| SELECT DISTINCT * | 6 |
| latest row per key (batch_latest) | 5 |

`DISTINCT` removes the exact duplicate of 104 but keeps both versions of 102, because they differ. Only “one row per key, newest first” fixes both.

#### Step 3: the uniqueness test (must return no rows)

```sql
SELECT order_id, count(*) AS n
FROM batch_latest(1)
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;
```

Result (0 rows):

| order_id | n |
|---|---|


#### Load batch 1 and compare with the day-1 state

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state WHERE false;   -- empty target, same columns

MERGE INTO fct_orders AS t
USING batch_latest(1) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);

SELECT (SELECT count(*) FROM (FROM fct_orders EXCEPT FROM day1_state)) AS only_in_load,
       (SELECT count(*) FROM (FROM day1_state EXCEPT FROM fct_orders)) AS only_in_day1_state;
```

Result (1 row):

| only_in_load | only_in_day1_state |
|---|---|
| 0 | 0 |

The `MERGE` uses `batch_latest(1)`, a soft-delete branch, and change detection. `EXCEPT` both ways returns 0 and 0: loading batch 1 from scratch produces exactly the table Part A started from.

**Pitfalls.** The `ORDER BY` inside the window must be *total*: ordering by `updated_at` alone ties when two versions share a timestamp, and then the winner is random. Order by a version number, or add tie-breakers (`updated_at DESC, _loaded_at DESC, file_line DESC`). `RANK()` instead of `ROW_NUMBER()` keeps ties, so duplicates survive.

> **On the job:** Every production MERGE source should be a de-duplicated staging relation with a uniqueness test on its key (in dbt: a `unique` test on the staging model). When the test fails, the load stops before the target is touched, which is exactly where you want a duplicate to be caught.

> **The main idea:** quarantine broken keys, keep the newest row per key with ROW_NUMBER and a total ordering, test uniqueness, then MERGE.

*Read more:* [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [DuckDB: set operations (EXCEPT)](https://duckdb.org/docs/stable/sql/query_syntax/setops).

---

<a id="slide-12"></a>
## 12. Prove it: run the load twice, compare fingerprints

*Part B · my loads are safe to re-run (idempotent)*

“Idempotent” is a claim; prove it. A **fingerprint** of a table is its row count plus a hash over all rows in a fixed order: two tables with the same fingerprint have the same content. Run the load, take the fingerprint, run the *same* load again, take it again. If anything differs, the load is not re-runnable.

*SQL · a table fingerprint (row count + hash of every row)*

```sql
CREATE OR REPLACE MACRO fingerprint(tbl) AS TABLE
SELECT count(*) AS row_count,
       md5(string_agg(r::VARCHAR, chr(10) ORDER BY r::VARCHAR)) AS fingerprint
FROM query_table(tbl) AS r;
```

#### Run 1

```sql
MERGE INTO fct_orders AS t
USING batch_latest(2) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);
```

Result (first run of batch 2) (1 row):

| Count |
|---|
| 5 |

```sql
SELECT * FROM fingerprint('fct_orders');
```

Result (after the first run) (1 row):

| row_count | fingerprint |
|---|---|
| 7 | c48cc64f73d80b14f31fc0c52ab29fce |

#### Run 2 (the retry)

```sql
MERGE INTO fct_orders AS t
USING batch_latest(2) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);
```

Result (second run of batch 2) (1 row):

| Count |
|---|
| 0 |

```sql
SELECT * FROM fingerprint('fct_orders');
```

Result (after the second run) (1 row):

| row_count | fingerprint |
|---|---|
| 7 | c48cc64f73d80b14f31fc0c52ab29fce |

Run 1 changed 5 rows (two updates, one soft delete, two inserts). Run 2 changed **0** rows and the fingerprint is identical: `c48cc64f73d8…`. The change-detection conditions from lesson 8 are what make run 2 report 0 instead of rewriting rows with the same values.

#### What makes this load idempotent

- An upsert keyed on the grain, not an append.
- A source that is a pure function of the batch: same file in, same rows out.
- Every value written comes from the source, never from the clock or a counter.
- Deletes are explicit rows, not “missing from the batch”.

#### Coming from C#

It is the same property you want from an HTTP `PUT` handler or a message consumer with at-least-once delivery: processing the same message twice must leave the same state. The fingerprint is the integration test that proves it.

> **On the job:** Put this check into the pipeline’s tests: load a fixture batch, fingerprint, load it again, assert equal. The lab does exactly that with pytest. In production, the same idea is a scheduled job that compares row counts and checksums of the incremental table against a periodic full rebuild (lesson 23).

> **The main idea:** an idempotency claim is proved by loading the same batch twice and getting the same fingerprint, with the second run changing zero rows.

*Read more:* [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into).

---

<a id="slide-13"></a>
## 13. What breaks idempotency

*Part B · the usual suspects in a load that “cannot run twice” (added)*

A MERGE keyed on the grain is not automatically idempotent. Anything in the statement that depends on *the current state of the target*, *the clock*, or *a counter* changes the result on a second run.

#### ✗ Incrementing: SET n = n + s.new

```sql
CREATE OR REPLACE TABLE customer_stats AS
SELECT customer_id, count(*) AS lifetime_orders
FROM day1_state GROUP BY customer_id;

-- run twice: once by the scheduler, once by the retry
MERGE INTO customer_stats AS t
USING (SELECT customer_id, count(*) AS new_orders
       FROM raw_changes WHERE batch_id = 2 AND op = 'I'
       GROUP BY customer_id) AS s
ON t.customer_id = s.customer_id
WHEN MATCHED THEN UPDATE SET lifetime_orders = t.lifetime_orders + s.new_orders
WHEN NOT MATCHED THEN INSERT VALUES (s.customer_id, s.new_orders);
MERGE INTO customer_stats AS t
USING (SELECT customer_id, count(*) AS new_orders
       FROM raw_changes WHERE batch_id = 2 AND op = 'I'
       GROUP BY customer_id) AS s
ON t.customer_id = s.customer_id
WHEN MATCHED THEN UPDATE SET lifetime_orders = t.lifetime_orders + s.new_orders
WHEN NOT MATCHED THEN INSERT VALUES (s.customer_id, s.new_orders);

SELECT * FROM customer_stats WHERE customer_id IN (2, 4, 5) ORDER BY customer_id;
```

Result (3 rows):

| customer_id | lifetime_orders |
|---|---|
| 2 | 3 |
| 4 | 1 |
| 5 | 2 |

#### ✓ Recompute from the source of truth

```sql
MERGE INTO customer_stats AS t
USING (SELECT c.customer_id, count(f.order_id) AS lifetime_orders   -- recompute, do not add
       FROM (SELECT DISTINCT customer_id FROM batch_latest(2)) AS c     -- customers the batch touched
       LEFT JOIN fct_orders AS f
              ON f.customer_id = c.customer_id AND NOT f.is_deleted
       GROUP BY c.customer_id) AS s
ON t.customer_id = s.customer_id
WHEN MATCHED AND t.lifetime_orders <> s.lifetime_orders
    THEN UPDATE SET lifetime_orders = s.lifetime_orders
WHEN NOT MATCHED THEN INSERT VALUES (s.customer_id, s.lifetime_orders);

SELECT * FROM customer_stats WHERE customer_id IN (2, 4, 5) ORDER BY customer_id;
```

Result (3 rows):

| customer_id | lifetime_orders |
|---|---|
| 2 | 2 |
| 4 | 0 |
| 5 | 1 |

On the left, the retry double-counted customers 2 and 5, and the deleted order 105 was never subtracted from customer 4. Recomputing the total from the fact table for the customers the batch touched gives the same answer however many times it runs: customer 2 has orders 102 and 107, customer 4 has none left, customer 5 has 106. The `LEFT JOIN` from the touched customers keeps customer 4 with a count of 0.

#### The clock: `now()` in a load

```python
def load(con, loaded_at_sql):
    con.execute("CREATE OR REPLACE TABLE t AS SELECT order_id, status, "
                + loaded_at_sql + " AS _loaded_at FROM raw_changes WHERE batch_id = 2")
    return con.execute("SELECT md5(string_agg(t::VARCHAR, ',' ORDER BY order_id)) FROM t").fetchone()[0]

import time
for label, expr in [("now()", "now()"),
                    ("batch time", "TIMESTAMP '2026-03-03 12:00:00'")]:
    first = load(con, expr)
    time.sleep(0.01)
    second = load(con, expr)
    print(f"_loaded_at = {label:<10} identical after a re-run: {first == second}")
```

Output:

```text
_loaded_at = now()      identical after a re-run: False
_loaded_at = batch time identical after a re-run: True
```

A `_loaded_at = now()` column makes every re-run produce a different table, and downstream models that use it as a watermark reprocess everything. Stamp rows with the **batch’s** time, passed in as a parameter.

#### The full list

| Breaks idempotency | Use instead |
|---|---|
| `SET n = n + s.delta` | recompute from the fact, or store deltas as rows |
| `now()`, `current_date - 1` in the load | the batch’s **logical date**, passed in |
| New surrogate keys on every insert (sequences) | keys looked up from a key map, or hashed from the business key |
| Append to a history table without a key | MERGE on (key, version) or a unique test |
| Deletes inferred from “missing in batch” | explicit delete rows, or a full snapshot (lesson 7) |

> **On the job:** Schedulers such as Airflow give each run a **logical date** (the period the run is *for*, not when it happens to execute), so a re-run of “2 March” next week loads 2 March again. Pass that date into the SQL; never compute “yesterday” inside the load. The surrogate-key point connects to *Dimension tables*: a re-run that mints new keys orphans every fact row that pointed at the old ones.

> **The main idea:** keep the clock, counters, and read-modify-write arithmetic out of loads: every written value must be a function of the batch and the logical date.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [DuckDB: UPDATE](https://duckdb.org/docs/stable/sql/statements/update).

---

<a id="slide-14"></a>
## 14. All or nothing: transactions and a load log

*Part B · a load that fails halfway must leave nothing behind (added)*

A real load is several statements: quarantine, MERGE the fact, refresh an aggregate, record the batch. If the job dies between two of them, the tables disagree. A **transaction** groups statements so they commit together or not at all (**atomic**): `BEGIN`, the statements, then `COMMIT`, or `ROLLBACK` on any error. A **load log** (or batch ledger) records which batches were applied, so the job can skip them, report them, and refuse to apply them twice by accident.

```python
con.execute("""CREATE OR REPLACE MACRO batch_latest(b) AS TABLE
SELECT *
FROM raw_changes
WHERE batch_id = b
  AND order_id IS NOT NULL                       -- broken keys go to quarantine instead
QUALIFY row_number() OVER (PARTITION BY order_id
                           ORDER BY change_seq DESC) = 1;""")
con.execute("CREATE TABLE fct_orders AS SELECT order_id, customer_id, order_date, status, amount, "
            "updated_at, change_seq, false AS is_deleted FROM raw_changes WHERE false")
con.execute("CREATE TABLE load_log (batch_id INTEGER PRIMARY KEY, rows_changed INTEGER)")
MERGE = """MERGE INTO fct_orders AS t
USING batch_latest({b}) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);"""

def load_batch(con, b, crash=False):
    con.execute("BEGIN TRANSACTION")
    try:
        if con.execute("SELECT count(*) FROM load_log WHERE batch_id = ?", [b]).fetchone()[0]:
            con.execute("ROLLBACK")
            return "skipped: already in load_log"
        n = con.execute(MERGE.format(b=b)).fetchone()[0]
        if crash:
            raise RuntimeError("connection lost before the aggregate refresh")
        con.execute("INSERT INTO load_log VALUES (?, ?)", [b, n])
        con.execute("COMMIT")
        return f"committed: {n} rows changed"
    except Exception as e:
        con.execute("ROLLBACK")
        return f"rolled back ({e})"

rows = lambda: con.execute("SELECT count(*) FROM fct_orders").fetchone()[0]
print("batch 1          ->", load_batch(con, 1), "| rows:", rows())
print("batch 2 (crash)  ->", load_batch(con, 2, crash=True), "| rows:", rows())
print("batch 2 (rerun)  ->", load_batch(con, 2), "| rows:", rows())
print("batch 2 (again)  ->", load_batch(con, 2), "| rows:", rows())
print(con.execute("SELECT * FROM load_log ORDER BY batch_id").fetchall())
```

Output:

```text
batch 1          -> committed: 5 rows changed | rows: 5
batch 2 (crash)  -> rolled back (connection lost before the aggregate refresh) | rows: 5
batch 2 (rerun)  -> committed: 5 rows changed | rows: 7
batch 2 (again)  -> skipped: already in load_log | rows: 7
[(1, 5), (2, 5)]
```

The crash happened *after* the MERGE had changed 5 rows, yet the row count stayed at 5: the rollback undid the MERGE. The re-run applied batch 2 once, and the third call was skipped by the log. This is the pattern from *Python files, generators, and practical data scripts* (“Transactions: all or nothing”, “Idempotent loads and a load log”), now with a MERGE inside.

#### Engine support (reference)

| Engine | Multi-statement transaction |
|---|---|
| DuckDB, PostgreSQL, SQL Server, Fabric Warehouse | Yes: `BEGIN` … `COMMIT` |
| Snowflake, BigQuery | Yes (BigQuery: multi-statement transactions in a script or session) |
| Spark / Delta Lake | One statement = one transaction: prefer a single MERGE, or `replaceWhere` for partitions |

#### Pitfall: the log is not the safety net

The log and the data may live in different systems (a log table in Postgres, data in a lake). Then a crash can commit one and not the other. Keep the write itself idempotent, so that “re-run when in doubt” is always safe, and treat the log as bookkeeping.

> **On the job:** Ask two questions about every scheduled load: “if it dies after statement N, what do the tables look like?” and “can I re-run it blindly?”. A transaction answers the first, idempotent statements answer the second, and the load log turns incidents into a list of batch ids to re-run.

> **The main idea:** wrap the statements of one batch in a transaction, record the batch in a load log, and keep every statement idempotent anyway.

*Read more:* [DuckDB: transactions](https://duckdb.org/docs/stable/sql/statements/transactions), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="slide-15"></a>
## 15. Delete+insert by key

*Part C · the upsert without MERGE*

**Delete+insert** replaces rows in two statements: delete every target row whose key is in the batch, then insert the whole batch. For a de-duplicated batch the result is the same as a `MERGE` that updates matched keys and inserts new ones, and it works on every engine, including those without `MERGE`. It is also dbt’s `delete+insert` strategy (see *dbt incremental models, snapshots and unit tests*, lesson 6).

#### The statements

*SQL · delete+insert by key, batch 2 (batches 1 and 3 run the same statement)*

```sql
BEGIN TRANSACTION;
DELETE FROM fct_di                                -- 1. remove every key in the batch
WHERE order_id IN (SELECT order_id FROM batch_latest(2));
INSERT INTO fct_di                            -- 2. insert the batch's version
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq,
       op = 'D' AS is_deleted
FROM batch_latest(2);
COMMIT;
```

Deletes are rows like any other: the `D` row is inserted with `is_deleted = true`, a full tombstone.

#### Proof: same table as “latest row per key”

*SQL · expected: the latest row per order over batches 1–3*

```sql
CREATE OR REPLACE VIEW latest_after_3 AS
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq,
       op = 'D' AS is_deleted
FROM raw_changes
WHERE batch_id <= 3 AND order_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1;
```

```sql
SELECT (SELECT count(*) FROM (FROM fct_di EXCEPT FROM latest_after_3)) AS only_in_di,
       (SELECT count(*) FROM (FROM latest_after_3 EXCEPT FROM fct_di)) AS only_in_expected,
       (SELECT count(*) FROM fct_di) AS row_count;
```

Result (1 row):

| only_in_di | only_in_expected | row_count |
|---|---|---|
| 0 | 0 | 8 |

After batches 1, 2, 3 the table equals the latest version of every order over those batches: 0 rows differ either way, 8 orders (101–108).

#### ✗ Two statements, no transaction, a crash in between

```sql
CREATE OR REPLACE TABLE fct_crash AS FROM fct_di;
DELETE FROM fct_crash                              -- statement 1 ran ...
WHERE order_id IN (SELECT order_id FROM batch_latest(3));
-- ... and the job died here, outside a transaction
SELECT count(*) AS rows_left, (SELECT count(*) FROM fct_di) AS rows_before
FROM fct_crash;
```

Result (1 row):

| rows_left | rows_before |
|---|---|
| 5 | 8 |

#### ✓ Always in one transaction

Inside `BEGIN TRANSACTION … COMMIT` the two statements commit together; a crash between them rolls the delete back. On Spark / Delta Lake, where each statement is its own transaction, use one `MERGE` or `INSERT … REPLACE WHERE` instead.

|  | MERGE | Delete+insert |
|---|---|---|
| Statements | one | two (needs a transaction) |
| Keeps target-only columns (e.g. `first_seen_at`) | yes: update only some columns | no: the row is replaced |
| Duplicates in the batch | error or double update (lesson 10) | silently inserted twice |
| Version guard, change detection | conditions on branches | must be applied to the batch first |
| Typical speed | per-row matching | bulk delete + bulk insert; often faster for large batches on columnar engines |

> **On the job:** Delete+insert is common on platforms where MERGE arrived late or is slow, in hand-written ELT scripts, and as dbt’s default for DuckDB and PostgreSQL adapters when a `unique_key` is set. The two rules that keep it safe are the same as for MERGE: a de-duplicated batch and one transaction.

> **The main idea:** delete the batch’s keys, insert the batch, in one transaction; same result as an upsert, but it replaces whole rows and inserts duplicates silently.

*Read more:* [DuckDB: DELETE](https://duckdb.org/docs/stable/sql/statements/delete), [DuckDB: transactions](https://duckdb.org/docs/stable/sql/statements/transactions), [dbt: incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy).

---

<a id="slide-16"></a>
## 16. Delete+insert by date partition: refresh only the days that changed

*Part C · replace whole partitions of an aggregate*

An aggregate such as `agg_daily_sales` (one row per day) has no natural key to upsert from a change batch: a single changed order changes its day’s totals. The standard answer is to treat each day as a **partition** (a slice of the table identified by a column value, here `order_date`), find the partitions the batch touches, and **replace them completely**: delete those days, then insert them again, recomputed from the fact.

#### Before

*SQL · the fact and its daily aggregate after day 1*

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;
CREATE OR REPLACE TABLE agg_daily_sales AS
SELECT order_date, count(*) AS orders, sum(amount) AS revenue
FROM fct_orders
WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
GROUP BY order_date;
```

```sql
SELECT * FROM agg_daily_sales ORDER BY order_date;
```

Result (after day 1) (2 rows):

| order_date | orders | revenue |
|---|---|---|
| 2026-03-01 | 3 | 83.50 |
| 2026-03-02 | 2 | 72.00 |

#### Rules for “affected”

- Take dates from the **changed rows**, never from the load date: batch 3 delivers an order dated three days earlier (lesson 22).
- Include the **old** date of every changed row: an order moved from 1 to 2 March changes both days. Read it from the target *before* the MERGE.
- Recompute each partition from the fact table, not from the batch, so the result does not depend on what the batch happened to contain.

#### The batch-2 refresh, in one transaction

```sql
BEGIN TRANSACTION;

CREATE OR REPLACE TEMP TABLE affected AS          -- 1. partitions the batch touches:
SELECT order_date FROM batch_latest(2)            --    the new dates ...
UNION
SELECT t.order_date                               --    ... and the old date of every changed row
FROM fct_orders AS t JOIN batch_latest(2) AS s USING (order_id);

MERGE INTO fct_orders AS t
USING batch_latest(2) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);   -- 2. the fact

DELETE FROM agg_daily_sales                       -- 3. drop the affected partitions
WHERE order_date IN (SELECT order_date FROM affected);
INSERT INTO agg_daily_sales                       -- 4. rebuild them from the fact
SELECT order_date, count(*) AS orders, sum(amount) AS revenue
FROM fct_orders
WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
  AND order_date IN (SELECT order_date FROM affected)
GROUP BY order_date;

COMMIT;

SELECT * FROM agg_daily_sales ORDER BY order_date;
```

Result (after batch 2) (3 rows):

| order_date | orders | revenue |
|---|---|---|
| 2026-03-01 | 2 | 65.00 |
| 2026-03-02 | 1 | 60.00 |
| 2026-03-03 | 2 | 60.00 |

#### Proof

*SQL · the refreshed aggregate equals a full recompute*

```sql
SELECT count(*) AS rows_that_differ
FROM (FROM agg_daily_sales
      EXCEPT
      SELECT order_date, count(*) AS orders, sum(amount) AS revenue
      FROM fct_orders
      WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
      GROUP BY order_date);
```

Result (1 row):

| rows_that_differ |
|---|
| 0 |

1 March lost order 103 (cancelled) and kept 101 and 102; 2 March lost 105 (deleted); 3 March appeared with 106 and 107. Re-running the transaction gives the same table, because every step recomputes instead of adding.

> **On the job:** Partition refresh is how most daily marts, KPI tables, and snapshot-by-day tables are maintained: “rebuild the last N days” or “rebuild the days in this batch”. On partitioned warehouse tables (BigQuery, Delta, Fabric) deleting whole partitions is cheap, which is why the pattern scales to billions of rows.

> **The main idea:** for aggregates, find the partitions the batch touches (new and old dates), delete them, and recompute them from the fact, all in one transaction.

*Read more:* [DuckDB: DELETE](https://duckdb.org/docs/stable/sql/statements/delete), [DuckDB: INSERT (ON CONFLICT)](https://duckdb.org/docs/stable/sql/statements/insert), [DuckDB: transactions](https://duckdb.org/docs/stable/sql/statements/transactions).

---

<a id="slide-17"></a>
## 17. insert_overwrite: replace partitions without matching rows

*Part C · static vs dynamic overwrite (added)*

**insert_overwrite** writes the query result for some partitions and throws away whatever those partitions held before: no keys, no row matching. It is how Spark, Hive, and BigQuery users refresh large partitioned tables, and a dbt strategy on those adapters. There are two modes, and confusing them is a classic data-loss incident. **Static overwrite** replaces the whole table (or the partitions named in the statement). **Dynamic overwrite** replaces only the partitions present in the new data.

#### Static overwrite of files wipes every partition

```python
import os
os.makedirs("lake", exist_ok=True)
con.execute("""CREATE TABLE agg AS FROM (VALUES
    (DATE '2026-03-01', 2, 65.00), (DATE '2026-03-02', 1, 60.00),
    (DATE '2026-03-03', 2, 60.00)) AS v(order_date, orders, revenue)""")
con.execute("COPY agg TO 'lake/agg_daily_sales' (FORMAT parquet, PARTITION_BY (order_date))")
files = lambda: sorted(d for d in os.listdir("lake/agg_daily_sales")
                       if os.listdir(os.path.join("lake/agg_daily_sales", d)))
print("before:", files())

# rewrite one day with OVERWRITE: the whole directory is replaced
con.execute("""COPY (SELECT DATE '2026-03-03' AS order_date, 1 AS orders, 33.00 AS revenue)
               TO 'lake/agg_daily_sales' (FORMAT parquet, PARTITION_BY (order_date), OVERWRITE)""")
print("after: ", files())
```

Output:

```text
before: ['order_date=2026-03-01', 'order_date=2026-03-02', 'order_date=2026-03-03']
after:  ['order_date=2026-03-03']
```

DuckDB’s `OVERWRITE` option on a partitioned `COPY` replaces the whole target directory: two of the three days are gone. Spark’s default `partitionOverwriteMode = static` behaves the same way for a table.

#### Dynamic overwrite in one statement: MERGE ON FALSE

```sql
CREATE OR REPLACE TEMP TABLE affected AS     -- batch 3 is already merged into fct_orders
SELECT DISTINCT order_date FROM batch_latest(3);

MERGE INTO agg_daily_sales AS t
USING (SELECT order_date, count(*) AS orders, sum(amount) AS revenue
       FROM fct_orders
       WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
         AND order_date IN (SELECT order_date FROM affected)
       GROUP BY order_date) AS s
ON false                                                -- never match a row
WHEN NOT MATCHED BY SOURCE
     AND t.order_date IN (SELECT order_date FROM affected) THEN DELETE
WHEN NOT MATCHED THEN INSERT VALUES (s.order_date, s.orders, s.revenue);

SELECT * FROM agg_daily_sales ORDER BY order_date;
```

Result (after batch 3) (3 rows):

| order_date | orders | revenue |
|---|---|---|
| 2026-03-01 | 3 | 80.00 |
| 2026-03-02 | 1 | 60.00 |
| 2026-03-03 | 1 | 33.00 |

Batch 3 (already merged into `fct_orders`) touches all three days: order 108 joins 1 March, 104 ships, 107 is refunded. With `ON false` nothing matches, so every new row is inserted and every old row of an affected partition is deleted by the `BY SOURCE` branch, in one atomic statement. dbt-bigquery generates the same shape for `insert_overwrite`.

#### ✗ The empty-partition trap

```sql
CREATE OR REPLACE TABLE f AS FROM (VALUES
    (1, DATE '2026-03-01', 'placed', 10.00), (2, DATE '2026-03-02', 'placed', 20.00)) AS v(id, d, status, amount);
CREATE OR REPLACE TABLE daily AS
SELECT d, sum(amount) AS revenue FROM f WHERE status <> 'cancelled' GROUP BY d;

UPDATE f SET status = 'cancelled' WHERE id = 2;       -- the only order of 2 March is cancelled

-- "dynamic overwrite": replace the partitions that appear in the new OUTPUT
MERGE INTO daily AS t
USING (SELECT d, sum(amount) AS revenue FROM f WHERE status <> 'cancelled' GROUP BY d) AS s
ON false
WHEN NOT MATCHED BY SOURCE AND t.d IN (SELECT d FROM f WHERE status <> 'cancelled') THEN DELETE
WHEN NOT MATCHED THEN INSERT VALUES (s.d, s.revenue);

SELECT * FROM daily ORDER BY d;
```

Result (2 rows):

| d | revenue |
|---|---|
| 2026-03-01 | 10.00 |
| 2026-03-02 | 20.00 |

Cancelling the only order of 2 March removes that day from the output, so “partitions in the output” does not include 2 March and its stale 20.00 survives. Take the partition list from the **changes** (as `affected` above), not from the output.

#### Reference, not executed

*Spark SQL (reference, not executed):*

```sql
SET spark.sql.sources.partitionOverwriteMode = dynamic;
INSERT OVERWRITE TABLE agg_daily_sales PARTITION (order_date)
SELECT count(*) AS orders, sum(amount) AS revenue, order_date
FROM fct_orders
WHERE order_date IN (SELECT order_date FROM affected) AND NOT is_deleted
GROUP BY order_date;
```

Delta Lake: `INSERT INTO t REPLACE WHERE order_date >= …`. Snowflake: `INSERT OVERWRITE INTO t` truncates the *whole* table. Fabric Warehouse: delete+insert in a transaction.

> **On the job:** Use insert_overwrite for very large, date-partitioned facts and aggregates where changes are confined to recent days and recomputing a day is cheaper than matching keys. Before the first run in production, check which mode the platform defaults to; a static overwrite run “for one day” is a well-known way to lose a table.

> **The main idea:** insert_overwrite replaces partitions instead of rows; make it dynamic, take the partition list from the changes, and make it atomic.

*Read more:* [DuckDB: partitioned writes](https://duckdb.org/docs/stable/data/partitioning/partitioned_writes), [Spark SQL: INSERT (OVERWRITE)](https://spark.apache.org/docs/latest/sql-ref-syntax-dml-insert-table.html), [BigQuery: DML (MERGE)](https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax), [Snowflake: INSERT (OVERWRITE)](https://docs.snowflake.com/en/sql-reference/sql/insert).

---

<a id="slide-18"></a>
## 18. Merge, delete+insert, or insert_overwrite: choose and justify

*Part C · I can choose merge vs delete+insert vs insert_overwrite and justify it*

| Strategy | Unit replaced | Needs | Choose when | Watch out for |
|---|---|---|---|---|
| **Append** | nothing (adds rows) | immutable rows, delivered once | event logs with a dedupe guarantee upstream | every retry duplicates (lesson 4) |
| **MERGE** | a row, by key | a unique key; de-duplicated batch | rows change or repeat; deletes as rows; keep some target columns | duplicates in the batch; cost of matching on huge targets |
| **Delete+insert by key** | a row, by key | a unique key; a transaction | no MERGE, or large batches on columnar engines | replaces whole rows; duplicates inserted silently |
| **Delete+insert by partition** | a partition | a partition column; a transaction | aggregates; facts where a day is recomputed as a whole | the affected list (old dates, late dates) |
| **insert_overwrite** | a partition | a partitioned table; dynamic mode | very large date-partitioned tables on Spark/BigQuery | static mode wipes data; empty partitions survive |
| **Full rebuild** | the table | the full source | small tables, logic over all history, after a logic change | runtime and cost as data grows |

#### Measured on the build machine: 1 M rows, a 100 k batch

```python
import time
con.execute("SET threads = 4")
con.execute("""CREATE TABLE target AS SELECT i AS id, i % 97 AS v, 'x' AS pad
               FROM range(1000000) t(i)""")
con.execute("""CREATE TABLE batch AS SELECT i AS id, -1 AS v, 'y' AS pad
               FROM range(950000, 1050000) t(i)""")        # 50k updates + 50k inserts

def timed(label, sql):
    con.execute("CREATE OR REPLACE TABLE t AS FROM target")
    start = time.perf_counter()
    con.execute(sql)
    ms = (time.perf_counter() - start) * 1000
    return label, ms, con.execute("SELECT count(*), sum(v) FROM t").fetchone()

results = [
    timed("MERGE", """MERGE INTO t USING batch AS s ON t.id = s.id
        WHEN MATCHED THEN UPDATE SET v = s.v, pad = s.pad
        WHEN NOT MATCHED THEN INSERT VALUES (s.id, s.v, s.pad)"""),
    timed("delete+insert", """BEGIN; DELETE FROM t WHERE id IN (SELECT id FROM batch);
        INSERT INTO t SELECT * FROM batch; COMMIT"""),
    timed("full rebuild", """CREATE OR REPLACE TABLE t AS
        FROM target WHERE id NOT IN (SELECT id FROM batch) UNION ALL FROM batch"""),
]
assert len({r[2] for r in results}) == 1            # all three give the same table
for label, ms, (n, s) in results:
    print(f"{label:<14} {ms:8.1f} ms   rows={n:,}")
```

Output (timings measured on the build machine; they vary run to run):

```text
MERGE              30.7 ms   rows=1,050,000
delete+insert      29.1 ms   rows=1,050,000
full rebuild       51.5 ms   rows=1,050,000
```

All three produce the same table. On DuckDB at this size the differences are small; the order changes with engine, table format, and how selective the batch is. The decision is about *correctness* first (grain, deletes, partitions), then cost.

#### Saying it in an interview

A justification names four things: **the grain and key**, **how rows change** (immutable, updated, deleted, late), **the physical layout** (partitioned by date? how big?), and **the engine**. For example:

> “fct_orders is one row per order and orders change for weeks after they are placed, so I upsert with MERGE on order_id from a de-duplicated staging batch. agg_daily_sales is recomputed per day, so I delete+insert the affected order dates in the same transaction. I would only use insert_overwrite on a large partitioned table, in dynamic mode.”

> **On the job:** The same choice appears in dbt as `incremental_strategy` (*dbt incremental models, snapshots and unit tests*, lesson 7 has the dbt-side table). When reviewing a model, check that the strategy matches how the data changes: an `append` on mutable orders or a `merge` on a daily aggregate are both design bugs.

> **The main idea:** choose by unit of change: rows with a key → MERGE (or delete+insert); whole days → partition replacement; immutable once-only rows → append; small or logic-heavy → rebuild.

*Read more:* [dbt: incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [DuckDB: partitioned writes](https://duckdb.org/docs/stable/data/partitioning/partitioned_writes).

---

<a id="slide-19"></a>
## 19. Incremental loads: the high-water mark

*Part D · read only what changed since last time*

Re-reading the whole source every night stops scaling at some point. An **incremental load** reads only rows that changed since the previous run. The usual way to know where the previous run stopped is a **high-water mark** (or **watermark**): the largest change timestamp (or sequence number) already loaded, kept in a small control table and moved forward only after the load commits.

*SQL · simulate the source: each change becomes visible when it was extracted*

```sql
CREATE OR REPLACE TABLE batches AS
FROM read_csv('sql-warehouse-writes-lab/data/batches.csv');
CREATE OR REPLACE TABLE src_changes AS            -- the shop's change table, as the source sees it
SELECT r.* EXCLUDE (batch_id), b.extracted_at AS visible_at
FROM raw_changes AS r JOIN batches AS b USING (batch_id);
```

Below, the source is queried four times, once per day at noon, the way an extract job would. Each run reads rows with `updated_at` above the watermark, de-duplicates them, merges them, and moves the watermark to the newest `updated_at` it has seen.

```python
con.execute("""CREATE TABLE batches AS FROM read_csv('sql-warehouse-writes-lab/data/batches.csv')""")
con.execute("""CREATE TABLE src_changes AS SELECT r.* EXCLUDE (batch_id), b.extracted_at AS visible_at
               FROM raw_changes AS r JOIN batches AS b USING (batch_id)""")
con.execute("CREATE TABLE fct_orders AS SELECT order_id, customer_id, order_date, status, amount, "
            "updated_at, change_seq, false AS is_deleted FROM src_changes WHERE false")
con.execute("CREATE TABLE etl_watermark (high_water TIMESTAMP)")
con.execute("INSERT INTO etl_watermark VALUES ('1970-01-01')")
MERGE = """MERGE INTO fct_orders AS t
USING stg AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);"""

def run(now, lookback="0 days", column="updated_at"):
    con.execute("BEGIN TRANSACTION")
    hw = con.execute("SELECT high_water FROM etl_watermark").fetchone()[0]
    con.execute(f"""CREATE OR REPLACE TEMP TABLE stg AS
        SELECT * FROM src_changes
        WHERE visible_at <= TIMESTAMP '{now}'                 -- what exists right now
          AND {column} > TIMESTAMP '{hw}' - INTERVAL '{lookback}'
          AND order_id IS NOT NULL
        QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1""")
    read = con.execute("SELECT count(*) FROM stg").fetchone()[0]
    con.execute(MERGE)
    con.execute(f"UPDATE etl_watermark SET high_water = (SELECT max({column}) FROM src_changes "
                f"WHERE visible_at <= TIMESTAMP '{now}')")       # moved only on success
    con.execute("COMMIT")
    new = con.execute("SELECT high_water FROM etl_watermark").fetchone()[0]
    print(f"run at {now}: orders read = {read}, watermark -> {new}")

def missing():
    return [r[0] for r in con.execute("""SELECT DISTINCT order_id FROM src_changes
        WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT order_id FROM fct_orders)
        ORDER BY 1""").fetchall()]

for now in ["2026-03-02 12:00", "2026-03-03 12:00", "2026-03-04 12:00", "2026-03-05 12:00"]:
    run(now)
print("orders in the source but not in the target:", missing())
assert missing() == [109]
```

Output:

```text
run at 2026-03-02 12:00: orders read = 5, watermark -> 2026-03-02 11:00:00
run at 2026-03-03 12:00: orders read = 5, watermark -> 2026-03-03 10:00:00
run at 2026-03-04 12:00: orders read = 3, watermark -> 2026-03-04 11:00:00
run at 2026-03-05 12:00: orders read = 1, watermark -> 2026-03-05 08:00:00
orders in the source but not in the target: [109]
```

Four clean runs, no errors, and order 109 is missing. Its change happened at 23:50 on 3 March, but replication lag made it visible only on 5 March, when the watermark had already moved to 11:00 on 4 March. `updated_at > watermark` will never be true for it again: the row is lost silently. This is **late-arriving data**: a row that becomes visible after rows that changed later than it did.

#### Choosing the watermark column

- A **monotonic sequence** from the source (log sequence number, `change_seq`) is best: no ties, no clock skew.
- `updated_at` is common and fragile: long transactions commit after later ones, clocks differ between servers.
- Use `>=` rather than `>` if several rows can share the boundary timestamp; the idempotent MERGE makes re-reading them harmless.

#### Coming from C#

It is the continuation token of a paged API or the offset of a message-queue consumer: you persist “how far I got” and resume from there. The same rule applies: commit the offset only after the work it covers is committed, or a crash skips data.

> **On the job:** Every incremental extract has a watermark somewhere: an Airflow variable, a control table in the warehouse, the max of a column in the target (what dbt’s `is_incremental()` filter usually reads; see *dbt incremental models, snapshots and unit tests*, lesson 8). When you inherit one, ask which column it uses and what happens to rows that arrive late; the honest answer is often “they are lost”.

> **The main idea:** a watermark makes loads incremental; on a change timestamp it silently skips rows that become visible late.

*Read more:* [Microsoft DP-700 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700), [dbt: incremental models](https://docs.getdbt.com/docs/build/incremental-models), [DuckDB: transactions](https://duckdb.org/docs/stable/sql/statements/transactions).

---

<a id="slide-20"></a>
## 20. Late-arriving data: a lookback window, or watermark on arrival

*Part D · read a little more than you need, on purpose*

Two fixes, both standard. A **lookback window** (or overlap) subtracts a fixed interval from the watermark on every run, so each run re-reads the recent past. Rows that were already loaded come back and the idempotent MERGE turns them into no-ops; rows that arrived late are picked up. To size the window, measure how late changes really arrive:

```sql
SELECT change_seq, order_id, updated_at, visible_at,
       visible_at - updated_at AS visible_after
FROM src_changes
ORDER BY visible_after DESC, change_seq
LIMIT 4;
```

Result (4 rows):

| change_seq | order_id | updated_at | visible_at | visible_after |
|---|---|---|---|---|
| 8 | 105 | 2026-03-02 16:00:00 | 2026-03-05 12:00:00 | 2 days, 20:00:00 |
| 14 | 107 | 2026-03-03 20:00:00 | 2026-03-05 12:00:00 | 1 day, 16:00:00 |
| 15 | 109 | 2026-03-03 23:50:00 | 2026-03-05 12:00:00 | 1 day, 12:10:00 |
| 1 | 101 | 2026-03-01 10:00:00 | 2026-03-02 12:00:00 | 1 day, 2:00:00 |

#### Fix 1: lookback of 3 days

```python
con.execute("""CREATE TABLE batches AS FROM read_csv('sql-warehouse-writes-lab/data/batches.csv')""")
con.execute("""CREATE TABLE src_changes AS SELECT r.* EXCLUDE (batch_id), b.extracted_at AS visible_at
               FROM raw_changes AS r JOIN batches AS b USING (batch_id)""")
con.execute("CREATE TABLE fct_orders AS SELECT order_id, customer_id, order_date, status, amount, "
            "updated_at, change_seq, false AS is_deleted FROM src_changes WHERE false")
con.execute("CREATE TABLE etl_watermark (high_water TIMESTAMP)")
con.execute("INSERT INTO etl_watermark VALUES ('1970-01-01')")
MERGE = """MERGE INTO fct_orders AS t
USING stg AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);"""

def run(now, lookback="0 days", column="updated_at"):
    con.execute("BEGIN TRANSACTION")
    hw = con.execute("SELECT high_water FROM etl_watermark").fetchone()[0]
    con.execute(f"""CREATE OR REPLACE TEMP TABLE stg AS
        SELECT * FROM src_changes
        WHERE visible_at <= TIMESTAMP '{now}'                 -- what exists right now
          AND {column} > TIMESTAMP '{hw}' - INTERVAL '{lookback}'
          AND order_id IS NOT NULL
        QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1""")
    read = con.execute("SELECT count(*) FROM stg").fetchone()[0]
    con.execute(MERGE)
    con.execute(f"UPDATE etl_watermark SET high_water = (SELECT max({column}) FROM src_changes "
                f"WHERE visible_at <= TIMESTAMP '{now}')")       # moved only on success
    con.execute("COMMIT")
    new = con.execute("SELECT high_water FROM etl_watermark").fetchone()[0]
    print(f"run at {now}: orders read = {read}, watermark -> {new}")

def missing():
    return [r[0] for r in con.execute("""SELECT DISTINCT order_id FROM src_changes
        WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT order_id FROM fct_orders)
        ORDER BY 1""").fetchall()]

for now in ["2026-03-02 12:00", "2026-03-03 12:00", "2026-03-04 12:00", "2026-03-05 12:00"]:
    run(now, lookback="3 days")
print("missing:", missing())
print("order 107 now:", con.execute("SELECT status, change_seq FROM fct_orders WHERE order_id = 107").fetchone())
assert missing() == []
```

Output:

```text
run at 2026-03-02 12:00: orders read = 5, watermark -> 2026-03-02 11:00:00
run at 2026-03-03 12:00: orders read = 7, watermark -> 2026-03-03 10:00:00
run at 2026-03-04 12:00: orders read = 8, watermark -> 2026-03-04 11:00:00
run at 2026-03-05 12:00: orders read = 9, watermark -> 2026-03-05 08:00:00
missing: []
order 107 now: ('refunded', 17)
```

109 is found. The cost is re-reading three days on every run, which is why the window is sized from measured lag (the longest here is 2 days 20 hours) plus a margin, and monitored.

#### Fix 2: watermark on arrival time

```python
con.execute("""CREATE TABLE batches AS FROM read_csv('sql-warehouse-writes-lab/data/batches.csv')""")
con.execute("""CREATE TABLE src_changes AS SELECT r.* EXCLUDE (batch_id), b.extracted_at AS visible_at
               FROM raw_changes AS r JOIN batches AS b USING (batch_id)""")
con.execute("CREATE TABLE fct_orders AS SELECT order_id, customer_id, order_date, status, amount, "
            "updated_at, change_seq, false AS is_deleted FROM src_changes WHERE false")
con.execute("CREATE TABLE etl_watermark (high_water TIMESTAMP)")
con.execute("INSERT INTO etl_watermark VALUES ('1970-01-01')")
MERGE = """MERGE INTO fct_orders AS t
USING stg AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);"""

def run(now, lookback="0 days", column="updated_at"):
    con.execute("BEGIN TRANSACTION")
    hw = con.execute("SELECT high_water FROM etl_watermark").fetchone()[0]
    con.execute(f"""CREATE OR REPLACE TEMP TABLE stg AS
        SELECT * FROM src_changes
        WHERE visible_at <= TIMESTAMP '{now}'                 -- what exists right now
          AND {column} > TIMESTAMP '{hw}' - INTERVAL '{lookback}'
          AND order_id IS NOT NULL
        QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1""")
    read = con.execute("SELECT count(*) FROM stg").fetchone()[0]
    con.execute(MERGE)
    con.execute(f"UPDATE etl_watermark SET high_water = (SELECT max({column}) FROM src_changes "
                f"WHERE visible_at <= TIMESTAMP '{now}')")       # moved only on success
    con.execute("COMMIT")
    new = con.execute("SELECT high_water FROM etl_watermark").fetchone()[0]
    print(f"run at {now}: orders read = {read}, watermark -> {new}")

def missing():
    return [r[0] for r in con.execute("""SELECT DISTINCT order_id FROM src_changes
        WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT order_id FROM fct_orders)
        ORDER BY 1""").fetchall()]

for now in ["2026-03-02 12:00", "2026-03-03 12:00", "2026-03-04 12:00", "2026-03-05 12:00"]:
    run(now, column="visible_at")
print("missing:", missing())
print("order 107 now:", con.execute("SELECT status, change_seq FROM fct_orders WHERE order_id = 107").fetchone())
assert missing() == []
```

Output:

```text
run at 2026-03-02 12:00: orders read = 5, watermark -> 2026-03-02 12:00:00
run at 2026-03-03 12:00: orders read = 5, watermark -> 2026-03-03 12:00:00
run at 2026-03-04 12:00: orders read = 3, watermark -> 2026-03-04 12:00:00
run at 2026-03-05 12:00: orders read = 4, watermark -> 2026-03-05 12:00:00
missing: []
order 107 now: ('shipped', 14)
```

If you control a column that records when a row *arrived* (a landing timestamp, an ingestion sequence, a file’s load time), watermark on that. Arrival is monotonic by construction, so nothing can be late relative to it.

**Now compare order 107** in the two fixes. Its stale change 14 (`shipped`) became visible on 5 March, after the newer change 17 (`refunded`) had been loaded. The arrival watermark read exactly the late rows and the MERGE applied the stale one: 107 regressed to `shipped`. The lookback happened to re-read change 17 in the same window, so de-duplication kept the newer row. That is luck, not design: reading late rows is half the job, and applying them in the right order is the other half (next lesson).

> **On the job:** dbt’s incremental models usually filter with `where updated_at > (select max(updated_at) from {{ this }}) - interval '3 days'`, and microbatch has a `lookback` setting; both are this lesson in config form (*dbt incremental models, snapshots and unit tests*, lessons 9 and 12). Alert when observed lag approaches the window, because a lag bigger than the window brings the silent loss back.

> **The main idea:** re-read a measured lookback window (or watermark on arrival time) so late rows are picked up; idempotent writes make the overlap free of side effects.

*Read more:* [dbt: incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Microsoft DP-700 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700), [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into).

---

<a id="slide-21"></a>
## 21. Late-arriving updates: a version guard and tombstones

*Part D · an older change must never overwrite a newer one*

Batch 4 delivers two **out-of-order** changes: 107 `shipped` (change 14), older than the `refunded` (change 17) already loaded; and 105 `placed` (change 8), older than its delete (change 10). A MERGE that applies whatever arrives last lets the past overwrite the present. The fix is a **version guard**: update a row only if the incoming version is newer than the stored one.

```sql
SELECT 'no guard, soft delete' AS load, order_id, status, change_seq, is_deleted
FROM fct_v1 WHERE order_id IN (105, 107)
UNION ALL
SELECT 'no guard, hard delete', order_id, status, change_seq, is_deleted
FROM fct_hard WHERE order_id IN (105, 107)
UNION ALL
SELECT 'version guard (merge_v2)', order_id, status, change_seq, is_deleted
FROM fct_v2 WHERE order_id IN (105, 107)
ORDER BY load, order_id;
```

Result (6 rows):

| load | order_id | status | change_seq | is_deleted |
|---|---|---|---|---|
| no guard, hard delete | 105 | placed | 8 | false |
| no guard, hard delete | 107 | shipped | 14 | false |
| no guard, soft delete | 105 | placed | 8 | true |
| no guard, soft delete | 107 | shipped | 14 | false |
| version guard (merge_v2) | 105 | placed | 10 | true |
| version guard (merge_v2) | 107 | refunded | 17 | false |

Without a guard, 107 regresses from refunded to shipped in both variants (a refund vanishes from the books). With a hard delete, 105 is **resurrected**: the delete left nothing behind, so the late update looks like a new order and is inserted. With a soft delete but no guard, 105 stays deleted but its tombstone is overwritten with older values. Only the guarded load keeps both rows right.

#### The final load statement (used from here on, and in the lab)

```sql
MERGE INTO fct_orders AS t
USING batch_latest(b) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING   -- stale or already applied
WHEN MATCHED AND s.op = 'D' THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = true
WHEN MATCHED THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN                                           -- a delete we never saw: tombstone
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D');
```

#### How it works

- `WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING`: stale or already applied; first, so nothing below can fire for it.
- A delete stores the full row as a **tombstone** (`is_deleted = true`, its `change_seq`), so later-arriving older changes have something to lose against.
- A delete for an order the warehouse never saw is inserted as a tombstone, so if its older insert arrives later it is ignored.
- Result: the final table no longer depends on the order in which batches arrive (lesson 23 proves it by replaying them backwards).

T-SQL and Snowflake have no `DO NOTHING`: put `AND s.change_seq > t.change_seq` on every `MATCHED` branch instead.

> **On the job:** Out-of-order delivery is normal in CDC pipelines (parallel partitions, retries, backfills replayed on top of live data) and in event streams. The guard needs a trustworthy version: a source sequence or log position is best; `updated_at` works if ties are impossible; the time *you* loaded the row is not a version at all.

> **The main idea:** guard every update with “incoming version is newer” and keep deletes as tombstones; then late, older changes cannot regress or resurrect rows.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [Delta Lake: upsert with MERGE](https://docs.delta.io/latest/delta-update.html), [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html).

---

<a id="slide-22"></a>
## 22. Late-arriving facts: refresh the partitions the data belongs to

*Part D · an order placed on 1 March, delivered on 4 March*

A **late-arriving fact** is a fact row whose business date is older than the batch that delivers it. Order 108 was taken at a market stall on 1 March and typed in on 4 March. The fact MERGE handles it without any special code (it is just a new key). The *aggregate* is where it goes wrong, if the job decides which partitions to refresh from the calendar instead of from the data.

#### Batch 3

```sql
SELECT order_id, order_date, updated_at, change_seq
FROM batch_latest(3)
ORDER BY order_id;
```

Result (3 rows):

| order_id | order_date | updated_at | change_seq |
|---|---|---|---|
| 104 | 2026-03-02 | 2026-03-04 11:00:00 | 18 |
| 107 | 2026-03-03 | 2026-03-04 10:00:00 | 17 |
| 108 | 2026-03-01 | 2026-03-04 09:00:00 | 16 |

#### Why it is late

`order_date` is 1 March, `updated_at` is 4 March. Any rule of the form “refresh the latest day” or “refresh the batch’s logical date” misses it.

#### ✗ Refresh “yesterday”

```sql
CREATE OR REPLACE TABLE agg_wrong AS FROM agg_daily_sales;
-- "refresh yesterday": batch 3 runs on 4 March, so rebuild 3 March only
DELETE FROM agg_wrong WHERE order_date = DATE '2026-03-03';
INSERT INTO agg_wrong
SELECT order_date, count(*) AS orders, sum(amount) AS revenue
FROM fct_orders
WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
  AND order_date = DATE '2026-03-03'
GROUP BY order_date;

SELECT order_date, orders, revenue FROM agg_wrong ORDER BY order_date;
```

Result (3 rows):

| order_date | orders | revenue |
|---|---|---|
| 2026-03-01 | 2 | 65.00 |
| 2026-03-02 | 1 | 60.00 |
| 2026-03-03 | 1 | 33.00 |

#### ✓ Refresh the dates in the changes

```sql
DELETE FROM agg_daily_sales
WHERE order_date IN (SELECT order_date FROM batch_latest(3));   -- dates from the changes
INSERT INTO agg_daily_sales
SELECT order_date, count(*) AS orders, sum(amount) AS revenue
FROM fct_orders
WHERE NOT is_deleted AND status NOT IN ('cancelled', 'refunded')
  AND order_date IN (SELECT order_date FROM batch_latest(3))
GROUP BY order_date;

SELECT order_date, orders, revenue FROM agg_daily_sales ORDER BY order_date;
```

Result (3 rows):

| order_date | orders | revenue |
|---|---|---|
| 2026-03-01 | 3 | 80.00 |
| 2026-03-02 | 1 | 60.00 |
| 2026-03-03 | 1 | 33.00 |

1 March now has 3 orders and 80.00, which equals a full recompute.

#### Bounded alternative

Some teams rebuild a fixed window every run (“the last 7 days”). It is simple and catches most late facts, but anything older than the window is missed, so pair it with a check of `max(updated_at - order_date)` per batch.

#### Closed periods

Finance may have closed February. A late February order then becomes an **adjustment** in the current period, or the closed month is restated with a note. That is a business decision; the load must at least surface the late row, never drop it.

> **On the job:** Late facts are why yesterday’s dashboard number changes today. Write it down in the metric spec (*Metric design*): which periods can still change, for how long, and how restatements are communicated. In a dimensional model, the mirror case is a fact that arrives *before* its dimension row; that is the unknown-member pattern from *Dimension tables*.

> **The main idea:** derive the partitions to refresh from the business dates in the changed rows, not from the run date; late facts then land in the right day.

*Read more:* [DuckDB: DELETE](https://duckdb.org/docs/stable/sql/statements/delete), [DuckDB: INSERT (ON CONFLICT)](https://duckdb.org/docs/stable/sql/statements/insert), [dbt: incremental models](https://docs.getdbt.com/docs/build/incremental-models).

---

<a id="slide-23"></a>
## 23. Reconcile: the incremental table must equal a full rebuild

*Part D · the test that proves all of the above*

An incremental table is an optimisation of a simpler definition: “the latest version of every order”. A **full rebuild** computes that definition directly from all history. If the incremental load is correct, the two tables are identical, whatever order the batches arrived in and however often they were retried. This comparison is the strongest test a load can have.

*SQL · the full rebuild: latest change per order over all history*

```sql
CREATE OR REPLACE TABLE fct_orders_rebuild AS
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq,
       op = 'D' AS is_deleted
FROM raw_changes
WHERE order_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1;
```

#### Same content, three histories

```sql
SELECT 'full rebuild' AS table_name, * FROM fingerprint('fct_orders_rebuild')
UNION ALL SELECT 'batches 1,2,2,3,4,4', * FROM fingerprint('fct_fwd')
UNION ALL SELECT 'batches 4,3,2,1',     * FROM fingerprint('fct_rev')
ORDER BY table_name;
```

Result (3 rows):

| table_name | row_count | fingerprint |
|---|---|---|
| batches 1,2,2,3,4,4 | 9 | 20ffa1e09cc4c8a0b4e4018add8d990e |
| batches 4,3,2,1 | 9 | 20ffa1e09cc4c8a0b4e4018add8d990e |
| full rebuild | 9 | 20ffa1e09cc4c8a0b4e4018add8d990e |

The forward replay includes a retried batch 2 and batch 4, the reverse replay applies the newest batch first. All three fingerprints match: the guarded MERGE is idempotent *and* order-independent.

#### What a failed reconciliation looks like

```sql
SELECT coalesce(i.order_id, r.order_id) AS order_id,
       CASE WHEN i.order_id IS NULL THEN 'missing in incremental'
            WHEN r.order_id IS NULL THEN 'extra in incremental'
            ELSE 'values differ' END AS problem,
       i.status AS incremental_status, r.status AS rebuild_status,
       i.change_seq AS incremental_seq, r.change_seq AS rebuild_seq
FROM fct_v1 AS i
FULL OUTER JOIN fct_orders_rebuild AS r USING (order_id)
WHERE i.order_id IS NULL OR r.order_id IS NULL
   OR (i.status, i.amount, i.is_deleted, i.change_seq)
      IS DISTINCT FROM (r.status, r.amount, r.is_deleted, r.change_seq)
ORDER BY order_id;
```

Result (2 rows):

| order_id | problem | incremental_status | rebuild_status | incremental_seq | rebuild_seq |
|---|---|---|---|---|---|
| 105 | values differ | placed | placed | 8 | 10 |
| 107 | values differ | shipped | refunded | 14 | 17 |

The same comparison against the unguarded load from lesson 21 names the broken keys and the columns that differ: exactly the two out-of-order changes. In production this report is what you attach to the incident.

> **On the job:** Schedule this comparison: weekly on the full table, or daily on the last N partitions, as a dbt test or a pipeline step that fails on any difference. dbt’s `audit_helper` package generates the same comparison (*dbt incremental models, snapshots and unit tests*, lesson 10). For huge tables, compare per-partition counts and checksums first and drill into rows only where they differ.

> **The main idea:** prove an incremental load by comparing it with a full rebuild, after retries and after out-of-order replays; the differences, if any, name the broken keys.

*Read more:* [DuckDB: set operations (EXCEPT)](https://duckdb.org/docs/stable/sql/query_syntax/setops), [DuckDB: CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [dbt: incremental models](https://docs.getdbt.com/docs/build/incremental-models).

---

<a id="slide-24"></a>
## 24. Lab: load four days of Leafy orders safely

*Lab · staging → MERGE → partition refresh → reconcile*

Build a small, production-shaped loader for the four batch files: every batch in one transaction, a de-duplicated stage, the guarded `MERGE` from lesson 21, a partition refresh of the daily aggregate, a load log, and a reconciliation against a full rebuild. The finished version is in [ 1 ](sql-warehouse-writes-lab/README.md) next to this deck; try writing the SQL files yourself first, using only the brief below and the lessons. Plan about an hour.

#### The brief

- **Input:** `data/batch_1.csv` … `batch_4.csv` (the files from slide 3).
- **Targets:** `fct_orders` (one row per order, deletes as tombstones) and `agg_daily_sales` (one row per order date: orders and revenue, excluding cancelled, refunded, and deleted orders).
- **Rules:** NULL keys go to `quarantine`; a re-run of any batch changes nothing; batches may arrive in any order; a failure leaves no trace.
- **Done when:** the expected results below hold, `--reconcile` reports 0 differences, and all tests pass.

#### Files

| Path | Role |
|---|---|
| `sql/01_schema.sql` | tables, `CREATE TABLE IF NOT EXISTS` |
| `sql/02_stage.sql` | read, quarantine, newest row per key |
| `sql/03_affected.sql` | dates to refresh, new and old |
| `sql/04_merge_orders.sql` | guarded MERGE with tombstones |
| `sql/05_refresh_daily_sales.sql` | delete+insert by date |
| `sql/90_reconcile.sql` | full rebuild and comparison |
| `load.py`, `tests/test_lab.py` | CLI with load log; 7 pytest tests |

#### Stage and de-duplicate

```sql
# sql-warehouse-writes-lab/sql/02_stage.sql
-- 02_stage.sql: read one batch file, quarantine broken rows, keep the newest row per key
CREATE OR REPLACE TEMP TABLE stg_raw AS
SELECT getvariable('batch_id') AS batch_id, *
FROM read_csv(getvariable('batch_file'), header = true,
     columns = {'change_seq': 'BIGINT', 'op': 'VARCHAR', 'order_id': 'INTEGER',
            'customer_id': 'INTEGER', 'order_date': 'DATE', 'status': 'VARCHAR',
            'amount': 'DECIMAL(10,2)', 'updated_at': 'TIMESTAMP'});

DELETE FROM quarantine WHERE batch_id = getvariable('batch_id');   -- re-runnable
INSERT INTO quarantine
SELECT batch_id, change_seq, 'order_id is NULL', r::VARCHAR
FROM stg_raw AS r
WHERE order_id IS NULL;

CREATE OR REPLACE TEMP TABLE stg AS
SELECT *
FROM stg_raw
WHERE order_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1;
```

#### The guarded MERGE

```sql
# sql-warehouse-writes-lab/sql/04_merge_orders.sql
-- 04_merge_orders.sql: upsert with a version guard and tombstones
MERGE INTO fct_orders AS t
USING stg AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING   -- stale or already applied
WHEN MATCHED AND s.op = 'D' THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = true
WHEN MATCHED THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN                                           -- a delete we never saw: tombstone
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D');
```

#### The loader’s core

`load.py`, simplified (the full file is in the lab folder):

```python
def load_batch(con, path, force=False):
    batch_id = int(re.search(r"batch_(\d+)", path.name).group(1))
    con.execute("BEGIN TRANSACTION")
    try:
        if not force and already_in_load_log(batch_id):      # skip unless --force
            con.execute("ROLLBACK"); return "skipped"
        set_variables(batch_id, path)                        # SET VARIABLE batch_id, batch_file
        run_file(con, "02_stage.sql")                        # stage, quarantine, de-duplicate
        run_file(con, "03_affected.sql")                     # dates to refresh (before the merge)
        merged = run_file(con, "04_merge_orders.sql")[0][0]  # guarded MERGE
        run_file(con, "05_refresh_daily_sales.sql")          # delete+insert the affected days
        replace_load_log_row(batch_id, merged)
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")                              # nothing half-written
        raise
```

#### Expected results

- After batches 1–4: 9 orders in `fct_orders`, one tombstone (105); 107 is `refunded`; 109 is present.
- `agg_daily_sales`: 2026-03-01 → 3 orders, 80.00; 2026-03-02 → 1, 60.00; 2026-03-03 → 2, 51.00.
- Batch 1 quarantines 1 row; re-running any batch with `--force` merges 0 rows.
- Loading the batches in reverse order gives the same tables; `--reconcile` prints `RECONCILE OK`.

**In your portfolio:** Fuel Smart’s Open Food Facts table is de-duplicated by barcode with a quarantine table, and USDA Branded Foods is re-released monthly. Load each release with this lab’s shape: newest row per barcode or `fdc_id` (Open Food Facts has `last_modified_t` for the guard), a guarded MERGE, a partition refresh of any per-day or per-month marts, and a reconciliation test in CI on small synthetic files with the real columns, never live downloads.

> **On the job:** This is the shape of most hand-built warehouse loaders (and of what dbt does for you): stage, validate, de-duplicate, merge, refresh dependants, log, and verify. Being able to explain each step and its failure mode is exactly what a take-home pipeline exercise is scored on.

> **The main idea:** a safe loader is a transaction around stage → de-duplicate → guarded MERGE → partition refresh → log, plus a reconciliation you can run any time.

*Read more:* [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into), [DuckDB: SET VARIABLE](https://duckdb.org/docs/stable/sql/statements/set_variable), [DuckDB: transactions](https://duckdb.org/docs/stable/sql/statements/transactions), [pytest documentation](https://docs.pytest.org/en/stable/).

---

<a id="slide-25"></a>
## 25. Lab: run it, re-run it, reconcile, test

*Lab · prove the load is idempotent, order-independent, and correct*

All commands below ran in the lab folder during the build; the outputs are real.

#### 1 · Load the four days

Terminal:

```text
$ python load.py --db leafy_dw.duckdb data/batch_1.csv data/batch_2.csv data/batch_3.csv data/batch_4.csv
batch_1.csv: 8 rows (1 quarantined), 5 merged, 2 days refreshed
batch_2.csv: 5 rows (0 quarantined), 5 merged, 3 days refreshed
batch_3.csv: 3 rows (0 quarantined), 3 merged, 3 days refreshed
batch_4.csv: 4 rows (0 quarantined), 2 merged, 2 days refreshed
```

Batch 4 merged only 2 of its 4 rows: the stale changes for 105 and 107 hit the version guard. Batch 2 refreshed 3 days, batch 4 only 2.

#### 2 · Run batch 2 again

Terminal:

```text
$ python load.py --db leafy_dw.duckdb data/batch_2.csv
batch_2.csv: skipped (already loaded; use --force to re-apply)
```

The load log skips it.

Terminal:

```text
$ python load.py --db leafy_dw.duckdb data/batch_2.csv data/batch_4.csv --force
batch_2.csv: 5 rows (0 quarantined), 0 merged, 3 days refreshed
batch_4.csv: 4 rows (0 quarantined), 0 merged, 2 days refreshed
```

Forced re-runs merge 0 rows. The aggregate days are still rebuilt (cheap, and the result is identical).

#### 3 · Reconcile and look

Terminal:

```text
$ python load.py --db leafy_dw.duckdb --reconcile
reconcile agg_daily_sales  only in table: 0   only in rebuild: 0
reconcile fct_orders       only in table: 0   only in rebuild: 0
RECONCILE OK
```

```python
import duckdb
dw = duckdb.connect("sql-warehouse-writes-lab/leafy_dw.duckdb", read_only=True)
for row in dw.execute("SELECT order_date, orders, revenue FROM agg_daily_sales ORDER BY 1").fetchall():
    print(row[0], row[1], row[2])
print(dw.execute("SELECT batch_id, rows_in_file, rows_merged, days_refreshed FROM load_log ORDER BY 1").fetchall())
dw.close()
```

Output:

```text
2026-03-01 3 80.00
2026-03-02 1 60.00
2026-03-03 2 51.00
[(1, 8, 5, 2), (2, 5, 0, 3), (3, 3, 3, 3), (4, 4, 0, 2)]
```

The load log keeps the latest run of each batch, so batches 2 and 4 now show 0 rows merged.

#### 4 · The tests

Two of the seven tests in `tests/test_lab.py`:

```python
def test_rerun_changes_nothing(con):
    load_all(con, ALL)
    before = fingerprint(con)
    load_all(con, [ALL[1], ALL[3]], force=True)          # retry batches 2 and 4
    assert fingerprint(con) == before

def test_any_order_gives_the_same_tables(con, tmp_path):
    load_all(con, ALL)
    other = load.connect(tmp_path / "reverse.duckdb")
    load_all(other, list(reversed(ALL)))
    assert fingerprint(other) == fingerprint(con)
```

Terminal (timing measured on the build machine):

```text
$ python -m pytest -q
.......                                                                  [100%]
7 passed in 3.37s
```

> **On the job:** Run the same four steps after any change to a load: load a fixture history, re-run part of it, reconcile, run the tests. In CI the tests take seconds; in production, the reconcile step on recent partitions is the alarm that catches the bugs tests did not imagine.

> **The main idea:** the lab proves the four properties a load needs: correct results, no change on re-run, no dependence on arrival order, and no trace after a failure.

*Read more:* [pytest documentation](https://docs.pytest.org/en/stable/), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="slide-26"></a>
## 26. Bug clinic: believable write bugs

*Practice · symptom → cause → fix*

Every bug below produces a table that looks plausible. Learn the *symptom*, because that is what reaches you first, usually as “the numbers changed”.

| Symptom | Cause | Fix | Lesson |
|---|---|---|---|
| Revenue doubled after last night’s retry | `INSERT … SELECT` append | MERGE (or delete+insert) on the grain key | 4 |
| Changed rows appear twice, unchanged rows once | a non-key column in `ON` | `ON` = the key, nothing else | 5 |
| A deleted order is still active | unconditional or guard branch before the delete branch | conditional branches first | 6 |
| Unchanged rows vanished | `NOT MATCHED BY SOURCE` with an incremental batch | only with full snapshots, scoped | 7 |
| Every run “updates” the whole table | no change detection | `AND (…) IS DISTINCT FROM (…)` | 8 |
| “Same row more than once” error, or random winner | duplicates in the batch | `ROW_NUMBER` newest per key, unique test | 10–11 |
| Rows with a NULL key multiply on every run | NULL never equals NULL in `ON` | quarantine NULL keys before the MERGE | 11 |
| Counters double after a retry | `SET n = n + s.delta` | recompute from the fact | 13 |
| Table half-updated after a crash | statements outside a transaction | one transaction per batch | 14–15 |
| A month of data disappeared | static partition overwrite | dynamic mode; partitions from the changes | 17 |
| Cancelled day still shows revenue | partitions taken from the output | partitions taken from the changes | 17 |
| Some rows never arrive in the warehouse | watermark on `updated_at`, late rows | lookback window, or watermark on arrival | 19–20 |
| A refund disappeared; a deleted order is back | out-of-order changes, no guard, hard delete | version guard and tombstones | 21 |
| An old day’s revenue is wrong | partitions chosen by run date | dates from the changed rows | 22 |

#### Executed: a non-key column in ON

```sql
CREATE OR REPLACE TABLE fct_orders AS FROM day1_state;
MERGE INTO fct_orders AS t
USING batch_latest(2) AS s
ON t.order_id = s.order_id AND t.status = s.status     -- a non-key column in ON
WHEN MATCHED THEN UPDATE SET amount = s.amount
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT
    VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
            s.updated_at, s.change_seq, false);
SELECT order_id, count(*) AS row_count FROM fct_orders
GROUP BY order_id HAVING count(*) > 1 ORDER BY order_id;
```

Result (2 rows):

| order_id | row_count |
|---|---|
| 101 | 2 |
| 103 | 2 |

101 and 103 changed status, so `t.status = s.status` no longer matches and the new versions are inserted next to the old ones.

#### Executed: NULL keys multiply

```sql
CREATE OR REPLACE TABLE fct_null AS FROM day1_state WHERE false;
-- loaded twice, with no quarantine step
MERGE INTO fct_null AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 1 AND change_seq = 7) AS s
ON t.order_id = s.order_id
WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.customer_id, s.order_date,
     s.status, s.amount, s.updated_at, s.change_seq, false);
MERGE INTO fct_null AS t
USING (SELECT * FROM raw_changes WHERE batch_id = 1 AND change_seq = 7) AS s
ON t.order_id = s.order_id
WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.customer_id, s.order_date,
     s.status, s.amount, s.updated_at, s.change_seq, false);
SELECT count(*) AS rows_with_null_key FROM fct_null WHERE order_id IS NULL;
```

Result (1 row):

| rows_with_null_key |
|---|
| 2 |

`NULL = NULL` is unknown, so the NULL-key row is “not matched” on every run and inserted again. A `not_null` test on the staging key, or the quarantine step, stops it.

> **On the job:** In code review of any load, check five things: what is in `ON`, the order of the `WHEN` branches, where the source is de-duplicated, what makes a re-run a no-op, and where the partition list comes from. Most rows in this table are caught by one of those five questions.

> **The main idea:** write bugs hide behind plausible tables: check the ON key, branch order, de-duplication, re-run behaviour, and the source of the partition list.

---

<a id="slide-27"></a>
## 27. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

Say each answer aloud in about a minute before opening it. The questions follow the research for this deck (October 2026): write an upsert from staging, idempotency and retries, duplicates in the batch, choosing a write strategy, late data and watermarks, out-of-order updates, deletes, and verifying a load are the most frequent warehouse-write topics in data-engineering and analytics-engineering interviews.

<details><summary>“Write a MERGE that loads this staging table into the target.” · checks: key, branches, deletes, de-duplication</summary>

**Model answer (about 60 s):** First I state the grain: one row per order, key `order_id`. I de-duplicate the staging rows to the newest per key with `ROW_NUMBER` and quarantine NULL keys. Then `MERGE INTO target USING deduped ON key`: a `WHEN MATCHED AND op = 'D'` branch first (a soft delete), then `WHEN MATCHED` with change detection to update, and `WHEN NOT MATCHED AND op <> 'D'` to insert. I would add a version guard if changes can arrive out of order, and run it in a transaction with whatever depends on it.

**Likely follow-up:** “The engine has no MERGE.” → Delete the batch’s keys and insert the batch in one transaction, or `INSERT … ON CONFLICT DO UPDATE` in PostgreSQL.

</details>

<details><summary>“What happens if this job runs twice? How do you make it idempotent?” · checks: that you test it, not just claim it</summary>

**Model answer (about 60 s):** An append would duplicate everything, so the write must be an upsert or a partition replacement keyed on the grain. Every value written must come from the batch and the run’s logical date, never from `now()` or `n = n + delta`. Then I prove it: load a fixture batch, fingerprint the table, load it again, and assert the fingerprint is unchanged and the second run changed zero rows. A load log lets the job skip applied batches, but the write stays idempotent anyway.

**Likely follow-up:** “And if it fails halfway?” → One transaction per batch, so a failure rolls back everything; then a blind re-run is safe.

</details>

<details><summary>“Your MERGE fails with ‘attempted to UPDATE or DELETE the same row more than once’. Why?” · checks: duplicate source rows and a deterministic fix</summary>

**Model answer (about 60 s):** The source has more than one row for some key, so one target row matches several source rows and the engine refuses to pick one. SQL Server, Snowflake, BigQuery, PostgreSQL, and Delta raise an error; DuckDB updates twice with an undefined winner. I find the keys with `GROUP BY key HAVING count(*) > 1`, find out why (a retried extract, two versions in one batch, a fan-out join in staging), and de-duplicate with `ROW_NUMBER() OVER (PARTITION BY key ORDER BY version DESC)` with a total ordering. Then a uniqueness test on staging.

**Likely follow-up:** “Could you just turn the error off?” → In Snowflake you can, and you get a random winner. Never: fix the source.

</details>

<details><summary>“MERGE, delete+insert, or insert_overwrite: which would you use?” · checks: a justified choice tied to how the data changes</summary>

**Model answer (about 60 s):** It depends on the unit of change. Rows with a key that change or repeat: `MERGE`, which also lets me keep target-only columns and handle deletes as branches. If the engine lacks MERGE or large batches are faster as bulk operations: delete+insert by key, in a transaction. Aggregates or facts recomputed per day: delete+insert by partition, or `insert_overwrite` on Spark/BigQuery in dynamic mode, with the partition list taken from the changed rows. Small tables: a full rebuild.

**Likely follow-up:** “What is the risk with insert_overwrite?” → Static mode replaces the whole table; dynamic mode leaves partitions that disappear from the output untouched.

</details>

<details><summary>“How do you handle late-arriving data in an incremental load?” · checks: watermark limits, lookback, partitions</summary>

**Model answer (about 60 s):** A watermark on `updated_at` skips rows that become visible after the watermark has moved. I measure how late rows arrive and re-read a lookback window bigger than that lag, which is safe because the MERGE is idempotent; or I watermark on an arrival timestamp I control. For aggregates, late facts belong to old dates, so I refresh the partitions of the changed rows’ business dates, not the run date. And I alert when observed lag approaches the window.

**Likely follow-up:** “What if the business has closed that month?” → Then the late row becomes an adjustment in an open period or a documented restatement; the load must surface it, never drop it.

</details>

<details><summary>“An older update arrives after a newer one. What happens?” · checks: version guards and tombstones</summary>

**Model answer (about 60 s):** A plain MERGE applies whatever arrives last, so the older version overwrites the newer one: a refunded order goes back to shipped. I add a version guard: update only `WHEN s.version > t.version`, using a source sequence or log position rather than a timestamp if possible. For deletes I keep a tombstone with the delete’s version; otherwise a late older update looks like a new row and resurrects the order. With both, the result no longer depends on arrival order.

**Likely follow-up:** “How would you test that?” → Replay the batches in reverse order and compare with the in-order result and a full rebuild.

</details>

<details><summary>“How do you handle deletes from the source?” · checks: explicit deletes vs snapshots, soft vs hard</summary>

**Model answer (about 60 s):** If the source sends delete events (CDC `op = D`), a conditional `WHEN MATCHED` branch applies them, usually as a soft delete with `is_deleted`, so downstream models see the change and late updates cannot resurrect the row. If the source sends full snapshots, `WHEN NOT MATCHED BY SOURCE` marks missing rows, after a sanity check that the snapshot is complete. If the source does neither, deletes are invisible and need a periodic full comparison. Hard deletes only when legally required, in every layer.

**Likely follow-up:** “Why not NOT MATCHED BY SOURCE for the daily batch?” → The batch only has changed rows; everything else would be deleted.

</details>

<details><summary>“How do you know an incremental pipeline is correct?” · checks: reconciliation, not hope</summary>

**Model answer (about 60 s):** I compare it with the simple definition it optimises: a full rebuild from all history. Same row count, `EXCEPT` both ways empty, equal checksums; for big tables per partition first. In tests I load fixture batches, re-run some, replay them in another order, and assert the tables equal the rebuild. In production I schedule the comparison on recent partitions and fail loudly on any difference.

**Likely follow-up:** “The rebuild is too expensive.” → Compare per-partition counts and checksums, rebuild only a sample of partitions, and run the full comparison weekly.

</details>

> **On the job:** Start every write question with the grain and the key, then say how rows change (updated? deleted? late? out of order?). Interviewers often stop you right there and move to the follow-up, because the grain and the change pattern decide everything else.

> **The main idea:** every write question is answered by the grain, the key, how rows change, and how you prove the result: name those first, then write the statement.

---

<a id="slide-28"></a>
## 28. Exercises 1–2: upsert and de-duplicate

*Exercises · warm-ups*

Every solution starts from a fresh in-memory DuckDB connection `con` with `raw_changes` loaded from the four batch files (the statement on slide 3), and a helper `q(sql)` that returns rows. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · Upsert a price list

Leafy’s `products(sku, name, price)` holds FERN-01 18.50, POT-01 9.00, MON-01 32.00. Today’s `price_updates` has FERN-01 19.50, POT-01 9.00 (unchanged), and a new CAC-01 “Cactus trio” 21.00. Write one statement that leaves the table as CAC-01 21.00, FERN-01 19.50, MON-01 32.00, POT-01 9.00, **reports exactly 2 changed rows**, and reports 0 when run again. Pattern: MERGE upsert with change detection. Target time: about 5 minutes.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Predict the output: which row survives?

A batch has five rows: order 201 at change 30 (`placed`, 10:00), change 31 (`shipped`, 10:05) twice (an exact duplicate); order 202 at change 32 (`placed`, 11:00) and change 33 (`cancelled`, also 11:00). Predict the rows kept by **(A)** `QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1`, **(B)** the same ordered by `change_seq DESC`, and **(C)** B with `rank()` instead of `row_number()`. Pattern: de-duplicate the source; ties. Target time: about 5 minutes.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

> **The main idea:** a correct upsert reports zero changes on a re-run, and a de-duplication needs a total ordering.

---

<a id="slide-29"></a>
## 29. Exercises 3–4: idempotency and three branches

*Exercises · warm-up and interview level*

Every solution starts from a fresh in-memory DuckDB connection `con` with `raw_changes` loaded from the four batch files (the statement on slide 3), and a helper `q(sql)` that returns rows. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 3 · Make a stock update re-runnable

`stock(sku, on_hand)` holds FERN-01 10 and POT-01 4. Today’s `deliveries(delivery_id, sku, qty)`: D-1 FERN-01 5, D-2 POT-01 6. The job runs `MERGE … UPDATE SET on_hand = t.on_hand + s.qty`, and the scheduler retries it once. Predict `on_hand` afterwards, then redesign the load so the retry changes nothing (expected: FERN-01 15, POT-01 10). Pattern: idempotency breakers. Target time: about 10 minutes.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Three branches from a CDC batch

`dim_customer(customer_id, city, is_deleted)` holds 1 Lisbon, 2 Porto, 3 Faro (none deleted). A de-duplicated CDC batch `cdc(change_seq, op, customer_id, city)` has: 50 U 2 Braga; 51 D 3 Faro; 52 I 4 Lisbon; 53 D 9 Porto (a customer the warehouse never saw). Write one MERGE that soft-deletes, updates, and inserts. Expected: 1 Lisbon false, 2 Braga false, 3 Faro true, 4 Lisbon false; no row for 9; 3 rows changed. Pattern: MERGE with insert / update / delete branches. Target time: about 10 minutes.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

> **The main idea:** store facts and derive totals, and order MERGE branches from the most specific to the least.

---

<a id="slide-30"></a>
## 30. Exercises 5–6: partitions and out-of-order changes

*Exercises · interview level*

Every solution starts from a fresh in-memory DuckDB connection `con` with `raw_changes` loaded from the four batch files (the statement on slide 3), and a helper `q(sql)` that returns rows. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 5 · Find the bug: an order changed its date

`fct(order_id, order_date, amount)`: 110 on 1 March 20.00, 111 on 1 March 30.00, 112 on 2 March 40.00; `agg(order_date, orders, revenue)` is built from it. A correction batch moves 110 to 2 March. The job below runs, and 1 March still shows 2 orders and 50.00. Find the bug and fix it so `agg` becomes 1 March → 1, 30.00 and 2 March → 2, 60.00. Pattern: delete+insert by partition. Target time: about 10 minutes.

```sql
MERGE INTO fct AS t USING batch AS s ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET order_date = s.order_date, amount = s.amount;

CREATE OR REPLACE TEMP TABLE affected AS
SELECT DISTINCT t.order_date FROM fct AS t JOIN batch AS s USING (order_id);

DELETE FROM agg WHERE order_date IN (SELECT order_date FROM affected);
INSERT INTO agg
SELECT order_date, count(*), sum(amount) FROM fct
WHERE order_date IN (SELECT order_date FROM affected) GROUP BY order_date;
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · A version guard without DO NOTHING

Load Leafy’s batch 4 into `fct_orders` after batches 1–3, on an engine without `DO NOTHING` (T-SQL, Snowflake). Start from the state after batch 3 (built in the solution with lesson 21’s statement). Expected for orders 105, 106, 107, 109: (placed, 10, deleted), (shipped, 19), (refunded, 17), (placed, 15), and exactly 2 rows changed. Pattern: late-arriving, out-of-order updates. Target time: about 12 minutes.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

> **The main idea:** affected partitions include the old dates, read before the merge; a version guard belongs on every matched branch.

---

<a id="slide-31"></a>
## 31. Exercises 7–8: choose a strategy, size a lookback

*Exercises · interview level*

Every solution starts from a fresh in-memory DuckDB connection `con` with `raw_changes` loaded from the four batch files (the statement on slide 3), and a helper `q(sql)` that returns rows. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 7 · Choose the strategy and justify it

For each table, choose append, MERGE, delete+insert by partition, insert_overwrite, or full rebuild, and give the one-sentence justification you would say in an interview. (a) Web events with a unique `event_id`, never updated, delivered *at least once*. (b) Orders from CDC with updates, deletes, and late changes. (c) Three years of daily revenue per store in BigQuery, partitioned by day; orders arrive up to 3 days late. (d) A 300-row currency table, fully re-exported every day. Then prove the tricky one, (a), in code. Pattern: choose and justify. Target time: about 10 minutes.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · How long must the lookback be?

Re-run lesson 19’s four daily extracts with the *guarded* load (`merge_v2`) and a lookback of 0, 1, 2, and 3 days. For each, report whether the final `fct_orders` equals the full rebuild. Expected: 0 days fails, 1 day and more pass. Then explain why you would still configure 3 days. Pattern: watermark with lookback; late data. Target time: about 15 minutes.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

> **The main idea:** justify a strategy by the unit of change, and size a lookback from measured lag, not from today’s test.

---

<a id="slide-32"></a>
## 32. Exercises 9–10: a load test and a scoped snapshot sync

*Exercises · take-home and stretch*

Every solution starts from a fresh in-memory DuckDB connection `con` with `raw_changes` loaded from the four batch files (the statement on slide 3), and a helper `q(sql)` that returns rows. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 9 · Take-home: a reusable load test

Write `check_load(statement, batches)` that returns two booleans: **idempotent** (loading every batch twice gives the same table as loading each once) and **order-independent** (loading the batches in reverse gives the same table). Run it on lesson 11’s `merge_v1` and lesson 21’s `merge_v2`. Expected: v1 → (True, False); v2 → (True, True). Pattern: prove idempotency; this is the core of the lab’s tests. Target time: about 15 minutes.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Stretch: sync one day from a complete snapshot

The market-stall till sends, once a day, the *complete* list of that day’s orders. `fct(order_id, order_date, status, is_deleted)` holds 101, 102, 103 on 1 March and 104 on 2 March. The 1 March snapshot contains 101 shipped, 102 shipped, 108 placed (103 is gone). Write a MERGE that updates, inserts, and soft-deletes for 1 March only, and refuses an empty snapshot. Expected: 103 deleted, 104 untouched, 108 inserted. Pattern: NOT MATCHED BY SOURCE, scoped. Target time: about 15 minutes.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** prove idempotency and order independence with fingerprints, and scope NOT MATCHED BY SOURCE to what the snapshot covers.

---

<a id="slide-33"></a>
## 33. Cheat sheet

*Reference · the deck on one page*

| Task | DuckDB | Remember |
|---|---|---|
| Upsert | `MERGE INTO t USING s ON t.k = s.k WHEN MATCHED THEN UPDATE SET … WHEN NOT MATCHED THEN INSERT …` | `ON` = the grain key only |
| Delete branch | `WHEN MATCHED AND s.op = 'D' THEN DELETE` (or `UPDATE SET is_deleted = true`) | conditional branches first; never insert a delete |
| Full sync from a snapshot | `WHEN NOT MATCHED BY SOURCE [AND scope] THEN …` | snapshots only; check the file is complete |
| Skip no-op updates | `WHEN MATCHED AND (t.a, t.b) IS DISTINCT FROM (s.a, s.b)` | NULL-safe; re-run reports 0 |
| Report actions | `RETURNING merge_action, …` (PostgreSQL: `merge_action()`) | no `ORDER BY`: wrap in a CTE in PostgreSQL |
| De-duplicate the batch | `QUALIFY row_number() OVER (PARTITION BY k ORDER BY version DESC) = 1` | total ordering; quarantine NULL keys |
| Test uniqueness | `SELECT k FROM s GROUP BY k HAVING count(*) > 1` | must return nothing |
| Prove idempotency | fingerprint (count + `md5(string_agg(r::VARCHAR …))`) before and after a re-run | second run changes 0 rows |
| Atomic batch | `BEGIN TRANSACTION; … COMMIT;` / `ROLLBACK` | plus a load log; still idempotent |
| Delete+insert by key | `DELETE … WHERE k IN (SELECT k FROM s); INSERT … FROM s;` | one transaction; de-duplicated batch |
| Refresh partitions | affected = new dates ∪ old dates; `DELETE … IN affected; INSERT … GROUP BY` | read old dates before the MERGE |
| Partition overwrite, one statement | `MERGE … ON false WHEN NOT MATCHED BY SOURCE AND t.p IN affected THEN DELETE WHEN NOT MATCHED THEN INSERT …` | partitions from the changes, not the output |
| Incremental extract | `WHERE col > high_water - INTERVAL '3 days'` | move the watermark after commit |
| Version guard | `WHEN MATCHED AND s.v <= t.v THEN DO NOTHING` | T-SQL/Snowflake: guard on every branch |
| Unseen delete | `WHEN NOT MATCHED THEN INSERT … (s.op = 'D')` | tombstone keeps loads order-independent |
| Reconcile | `(FROM inc EXCEPT FROM rebuild)` and the reverse | both must be empty |

#### Dialect cheat sheet

| Engine | Syntax and behaviour |
|---|---|
| PostgreSQL 15+/17+ | `MERGE`; `BY SOURCE` and `RETURNING merge_action()` from 17; `INSERT … ON CONFLICT (k) DO UPDATE SET … WHERE …`. Executed in this deck. |
| SQL Server / Fabric Warehouse | `MERGE … WHEN NOT MATCHED BY TARGET / BY SOURCE … OUTPUT $action;` semicolon required; errors on duplicate matches; no `DO NOTHING`. |
| Snowflake | `MERGE` with matched / not matched only; `UPDATE ALL BY NAME`; duplicate matches error by default; `INSERT OVERWRITE` replaces the whole table. |
| BigQuery | `MERGE` with `BY SOURCE`; prune with partition filters in `ON`; dbt `insert_overwrite` = `MERGE … ON FALSE`. |
| Spark / Delta Lake | `MERGE INTO … UPDATE SET * / INSERT *`; `INSERT OVERWRITE … PARTITION` with `partitionOverwriteMode = dynamic`; `REPLACE WHERE`. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **The main idea:** key, de-duplicate, guard, transact, prove: five habits that make a warehouse write safe.

---

<a id="slide-34"></a>
## 34. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Atomic | All statements of a unit take effect together, or none do. |
| Change data capture (CDC) | A change feed read from the source database’s log; each row is an insert, update, or delete with a position. |
| Change detection | A condition on the update branch so only rows whose values differ are rewritten. |
| Change feed | A stream or batch of changed rows, each with an operation code and a version. |
| Conditional branch | `WHEN MATCHED AND <condition>`: a MERGE branch that applies only when its condition is true; the first true branch wins. |
| Delete+insert | Replace rows (by key) or partitions by deleting them and inserting the new version, in one transaction. |
| Exact duplicate | Two source rows identical in every column, typically from a retry. |
| Fingerprint | Row count plus a hash over all rows in a fixed order; equal fingerprints mean equal content. |
| Full rebuild | Recompute a table from all history; the reference an incremental table must equal. |
| Full snapshot | A source that contains every row that should exist, so “missing” means “deleted”. |
| Grain | What one row of a table represents (here: one order); defines the key. |
| Hard delete / soft delete | Remove the row / keep it with `is_deleted = true`. |
| High-water mark (watermark) | The largest change timestamp or sequence already loaded, stored in a control table. |
| Idempotent (re-runnable) | Running the load twice leaves the target as running it once. |
| Incremental batch | A source with only the rows that changed since the last extract. |
| Incremental load | A load that reads only changes since the previous run. |
| insert_overwrite (static / dynamic) | Replace partitions with new data; static replaces the whole table or named partitions, dynamic only partitions present in the new data. |
| Late-arriving data | Rows that become visible after rows that changed later than they did. |
| Late-arriving fact | A fact whose business date is older than the batch that delivers it. |
| Load log (batch ledger) | A table recording which batches were applied, with counts. |
| Logical date | The period a scheduled run is for, passed into the load instead of reading the clock. |
| Lookback window | An interval subtracted from the watermark so each run re-reads the recent past. |
| MERGE | One statement that matches a source to a target on a key and inserts, updates, or deletes per row. |
| NOT MATCHED BY SOURCE | The MERGE branch for target rows that no source row matched. |
| Out-of-order change | A change that arrives after a newer change to the same row. |
| Partition | A slice of a table identified by a column value, such as one `order_date`. |
| Primary key | A declared unique, not-null key; enforced in DuckDB and PostgreSQL, usually not in cloud warehouses. |
| Quarantine | A side table for rows that cannot be loaded, with a reason. |
| Reconciliation | Comparing a table with an independent computation of the same data (here a full rebuild). |
| Row hash | A hash of a row’s business columns, used for change detection. |
| Source / target | The batch you write from / the table you write to. |
| Table macro | A DuckDB parameterised query used like a table: `batch_latest(2)`. |
| Tombstone | The row kept for a soft delete, with the delete’s version. |
| Transaction | A group of statements committed or rolled back together. |
| Upsert | Update the row if the key exists, insert it otherwise. |
| Version guard | A condition that applies a change only if its version is newer than the stored one. |

---

<a id="slide-35"></a>
## 35. Recap and practice plan

*Reference · what to remember*

1. An append is not a load: a retry duplicates it. Write an **upsert keyed on the grain**.
2. **MERGE** = `ON key` + branches; conditional branches first; never insert a delete; prefer **soft deletes**.
3. **NOT MATCHED BY SOURCE** means “missing from the source”: right for full snapshots (scoped), wrong for incremental batches.
4. **De-duplicate the source** before MERGE: quarantine NULL keys, newest row per key with a total ordering, test uniqueness.
5. **Prove idempotency**: same batch twice → same fingerprint, 0 rows changed. Keep the clock and `n = n + x` out of loads.
6. One **transaction** per batch, plus a **load log**; the write stays idempotent anyway.
7. **Delete+insert** by key or by partition; **insert_overwrite** in dynamic mode with partitions from the changes; choose by the unit of change.
8. A **watermark** skips late rows: add a measured **lookback** or watermark on arrival.
9. A **version guard** and **tombstones** make loads immune to out-of-order changes; late facts refresh their own dates.
10. **Reconcile** with a full rebuild after retries and reverse replays: that is the proof.

#### Practice plan

1. Day 1: lessons 4–9 and exercises 1, 4; type the MERGE from memory.
2. Day 2: lessons 10–14 and exercises 2, 3, 9.
3. Day 3: lessons 15–18 and exercises 5, 7; say the strategy justification aloud.
4. Day 4: lessons 19–23 and exercises 6, 8, 10; then the lab and its tests.

#### Where to go next

- *dbt incremental models, snapshots and unit tests*: the same strategies as dbt config, microbatch, and SCD2 snapshots.
- *Dimension tables* and the dimensional-modeling project: surrogate keys, SCD Type 2, unknown members.
- Fuel Smart: load product and nutrient refreshes with the lab’s pattern and a reconciliation test in CI.

> **The main idea:** a warehouse write is correct when it is keyed, de-duplicated, guarded, atomic, and proven equal to a rebuild, however often and in whatever order it runs.

---

<a id="slide-36"></a>
## 36. References and how this deck was tested

*References · official documentation and what to read there*

| Source | What to read there |
|---|---|
| [DuckDB: MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into) | Branches, `BY SOURCE`, `RETURNING merge_action`, `DO NOTHING`, `USING (key)` shorthand. |
| [DuckDB: INSERT](https://duckdb.org/docs/stable/sql/statements/insert), [DELETE](https://duckdb.org/docs/stable/sql/statements/delete), [UPDATE](https://duckdb.org/docs/stable/sql/statements/update) | `ON CONFLICT`, `INSERT OR REPLACE`, `BY NAME`; deletes and updates with subqueries. |
| [DuckDB: transactions](https://duckdb.org/docs/stable/sql/statements/transactions), [constraints](https://duckdb.org/docs/stable/sql/constraints) | `BEGIN`/`COMMIT`/`ROLLBACK`; primary keys and their limits. |
| [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [CREATE MACRO](https://duckdb.org/docs/stable/sql/statements/create_macro), [SET VARIABLE](https://duckdb.org/docs/stable/sql/statements/set_variable) | De-duplication, table macros, variables used by the lab. |
| [DuckDB: partitioned writes](https://duckdb.org/docs/stable/data/partitioning/partitioned_writes) | `PARTITION_BY`, `OVERWRITE`, `OVERWRITE_OR_IGNORE`, `APPEND`. |
| [PostgreSQL: MERGE](https://www.postgresql.org/docs/current/sql-merge.html), [INSERT … ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html) | The reference semantics: duplicate matches, branch order, `RETURNING`. |
| [T-SQL: MERGE](https://learn.microsoft.com/en-us/sql/t-sql/statements/merge-transact-sql), [Fabric Warehouse surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area) | SQL Server and Fabric syntax, `OUTPUT $action`, limits. |
| [Snowflake: MERGE](https://docs.snowflake.com/en/sql-reference/sql/merge), [INSERT OVERWRITE](https://docs.snowflake.com/en/sql-reference/sql/insert) | Nondeterministic merges, `ALL BY NAME`, whole-table overwrite. |
| [BigQuery: DML](https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax), [Delta Lake MERGE](https://docs.delta.io/latest/delta-update.html), [Spark INSERT OVERWRITE](https://spark.apache.org/docs/latest/sql-ref-syntax-dml-insert-table.html) | `BY SOURCE`, schema evolution in MERGE, static vs dynamic partition overwrite. |
| [dbt: incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [incremental models](https://docs.getdbt.com/docs/build/incremental-models) | The same patterns as dbt configuration; per-adapter support. |
| [Microsoft DP-700 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700) | Full vs incremental loads, watermarks, late and duplicate data in Fabric. |
| [PGlite](https://pglite.dev/docs/), [pytest](https://docs.pytest.org/en/stable/) | Running PostgreSQL in Node.js; the lab’s test runner. |
| [DataDriven: SQL upsert](https://datadriven.io/sql/upsert) | Further practice for upsert and MERGE questions. |

| How this deck was tested | Detail |
|---|---|
| Engines | DuckDB 1.5.6 (Python package), CPython 3.12.10, Windows 11 (64-bit); PostgreSQL 18.3 in PGlite 0.5.8 on Node.js; pytest for the lab. |
| Executed | Every DuckDB statement, every PostgreSQL statement, every Python block, the lab CLI runs, and the lab’s 7 tests ran during the build; the build fails on any error, unexpected result, or unordered multi-row result. |
| Not executed | T-SQL (SQL Server, Fabric Warehouse), Snowflake, BigQuery, and Spark SQL / Delta Lake snippets and behaviour notes (no server, Java, or cloud account on the build machine). |
| Engine note | On the build machine, DuckDB 1.5.6 crashed when `RETURNING` was combined with a `WHEN NOT MATCHED BY SOURCE … THEN UPDATE` branch; lesson 7 reads the result with a `SELECT` instead. |
| Data | Four hand-written batch files (20 change rows) with every trap planted; deterministic, no downloads. Timings are labelled as measured on the build machine. |
| Interview research | October 2026: public question banks and guides (DataDriven, Interview Query, data-engineering blogs), the Microsoft DP-700 study guide, vendor MERGE documentation, and candidate write-ups. Questions in this deck are original. |

> **The main idea:** official documentation for every statement used, plus a record of exactly what ran and what is reference only.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Upsert a price list

Two branches, matched and not matched. What condition keeps POT-01 from being counted?

<a id="hint-2"></a>
### Hint 2 · Predict the output: which row survives?

Look for keys where the ORDER BY does not separate the rows. What does `rank()` do with ties?

<a id="hint-3"></a>
### Hint 3 · Make a stock update re-runnable

Store what happened (deliveries, keyed by `delivery_id`) and derive the balance, instead of adding to the balance.

<a id="hint-4"></a>
### Hint 4 · Three branches from a CDC batch

Order the `WHEN` branches from most specific to least. Which branch must also look at `op`?

<a id="hint-5"></a>
### Hint 5 · Find the bug: an order changed its date

Which dates does an order that moved affect? When is the target’s old value still readable?

<a id="hint-6"></a>
### Hint 6 · A version guard without DO NOTHING

Every `MATCHED` branch gets `AND s.change_seq > t.change_seq`. What should `NOT MATCHED` do with a delete?

<a id="hint-7"></a>
### Hint 7 · Choose the strategy and justify it

“At least once” means the same event can arrive twice. Does a plain append survive that?

<a id="hint-8"></a>
### Hint 8 · How long must the lookback be?

Write one function that runs the four extracts for a given lookback and returns the number of rows that differ from the rebuild (`EXCEPT` both ways).

<a id="hint-9"></a>
### Hint 9 · Take-home: a reusable load test

Build each table from empty, fingerprint it with `md5(string_agg(row::VARCHAR …))`, and compare fingerprints.

<a id="hint-10"></a>
### Hint 10 · Stretch: sync one day from a complete snapshot

Scope the `BY SOURCE` branch with a condition on `t.order_date`. What should happen before the MERGE if the file is empty?

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Upsert a price list

```python
con.execute("""CREATE TABLE products AS SELECT sku, name, price::DECIMAL(10,2) AS price
    FROM (VALUES ('FERN-01', 'Boston fern', 18.50), ('POT-01', 'Terracotta pot', 9.00),
                 ('MON-01', 'Monstera', 32.00)) AS v(sku, name, price)""")
con.execute("""CREATE TABLE price_updates AS SELECT sku, name, price::DECIMAL(10,2) AS price
    FROM (VALUES ('FERN-01', 'Boston fern', 19.50), ('POT-01', 'Terracotta pot', 9.00),
                 ('CAC-01', 'Cactus trio', 21.00)) AS v(sku, name, price)""")
UPSERT = """MERGE INTO products AS t
USING price_updates AS s
ON t.sku = s.sku
WHEN MATCHED AND (t.name, t.price) IS DISTINCT FROM (s.name, s.price)
    THEN UPDATE SET name = s.name, price = s.price
WHEN NOT MATCHED THEN INSERT VALUES (s.sku, s.name, s.price)"""
first, second = q(UPSERT)[0][0], q(UPSERT)[0][0]
rows = [(sku, str(price)) for sku, price in q("SELECT sku, price FROM products ORDER BY sku")]
print("changed:", first, "then", second)
print(rows)
assert (first, second) == (2, 0)
assert rows == [("CAC-01", "21.00"), ("FERN-01", "19.50"), ("MON-01", "32.00"), ("POT-01", "9.00")]
```

Output:

```text
changed: 2 then 0
[('CAC-01', '21.00'), ('FERN-01', '19.50'), ('MON-01', '32.00'), ('POT-01', '9.00')]
```

The `MATCHED` branch updates only when the tuple differs (NULL-safe), so POT-01 is not rewritten and the second run changes nothing. **Common wrong answer:** an unconditional `WHEN MATCHED THEN UPDATE`: the table is right, but it reports 3 changes, and 2 again on every re-run. **Interviewer follow-up:** “Products that are missing from today’s file should be deactivated.” Only if the file is a full catalog: add `WHEN NOT MATCHED BY SOURCE AND t.is_active THEN UPDATE SET is_active = false` (lesson 7) after checking the file is complete.

<a id="solution-2"></a>
### Solution 2 · Predict the output: which row survives?

```python
con.execute("""CREATE TABLE b AS FROM (VALUES
    (30, 201, 'placed',    TIMESTAMP '2026-03-06 10:00'),
    (31, 201, 'shipped',   TIMESTAMP '2026-03-06 10:05'),
    (31, 201, 'shipped',   TIMESTAMP '2026-03-06 10:05'),
    (32, 202, 'placed',    TIMESTAMP '2026-03-06 11:00'),
    (33, 202, 'cancelled', TIMESTAMP '2026-03-06 11:00')) AS v(change_seq, order_id, status, updated_at)""")
pick = lambda fn, order: q(f"""SELECT order_id, status FROM b
    QUALIFY {fn}() OVER (PARTITION BY order_id ORDER BY {order}) = 1 ORDER BY order_id, status""")
a = pick("row_number", "updated_at DESC")
b = pick("row_number", "change_seq DESC")
c = pick("rank", "change_seq DESC")
print("B:", b)
print("C:", c)
assert a[0] == (201, "shipped") and a[1][1] in {"placed", "cancelled"}   # 202 is a coin toss
assert b == [(201, "shipped"), (202, "cancelled")]
assert c == [(201, "shipped"), (201, "shipped"), (202, "cancelled")]
```

Output:

```text
B: [(201, 'shipped'), (202, 'cancelled')]
C: [(201, 'shipped'), (201, 'shipped'), (202, 'cancelled')]
```

(A) keeps 201 `shipped`, but for 202 both rows share 11:00, so the winner is *undefined*: it can change between runs. (B) is deterministic because `change_seq` is unique per change. (C) keeps both copies of the exact duplicate because they tie at rank 1. **Common wrong answer:** “A returns cancelled because it is listed last”: SQL has no row order unless you specify one. **Interviewer follow-up:** “There is no sequence column.” Add tie-breakers that are unique in practice (`updated_at DESC, _loaded_at DESC, _file_row DESC`), and test that the de-duplicated batch is unique on the key.

<a id="solution-3"></a>
### Solution 3 · Make a stock update re-runnable

```python
con.execute("CREATE TABLE stock AS FROM (VALUES ('FERN-01', 10), ('POT-01', 4)) AS v(sku, on_hand)")
con.execute("""CREATE TABLE deliveries AS FROM (VALUES ('D-1', 'FERN-01', 5), ('D-2', 'POT-01', 6))
               AS v(delivery_id, sku, qty)""")
NAIVE = """MERGE INTO stock AS t USING deliveries AS s ON t.sku = s.sku
           WHEN MATCHED THEN UPDATE SET on_hand = t.on_hand + s.qty"""
con.execute(NAIVE); con.execute(NAIVE)                         # job + retry
print("naive:", q("SELECT * FROM stock ORDER BY sku"))

con.execute("CREATE TABLE opening AS FROM (VALUES ('FERN-01', 10), ('POT-01', 4)) AS v(sku, qty)")
con.execute("CREATE TABLE fct_deliveries (delivery_id VARCHAR, sku VARCHAR, qty INTEGER)")
LOAD = """MERGE INTO fct_deliveries AS t USING deliveries AS s ON t.delivery_id = s.delivery_id
          WHEN NOT MATCHED THEN INSERT VALUES (s.delivery_id, s.sku, s.qty)"""
con.execute(LOAD); con.execute(LOAD)                           # job + retry
fixed = q("""SELECT o.sku, o.qty + coalesce(sum(d.qty), 0) AS on_hand
             FROM opening AS o LEFT JOIN fct_deliveries AS d USING (sku)
             GROUP BY o.sku, o.qty ORDER BY o.sku""")
print("fixed:", fixed)
assert q("SELECT * FROM stock ORDER BY sku") == [("FERN-01", 20), ("POT-01", 16)]
assert fixed == [("FERN-01", 15), ("POT-01", 10)]
```

Output:

```text
naive: [('FERN-01', 20), ('POT-01', 16)]
fixed: [('FERN-01', 15), ('POT-01', 10)]
```

The naive job adds every delivery twice (20 and 16). Recording deliveries as rows keyed by `delivery_id` makes the retry a no-op (an insert-only MERGE), and the balance is derived, so it is always consistent with the facts. **Common wrong answer:** “use a load log so it never runs twice”: helpful, but a crash between the update and the log write still double-counts. **Interviewer follow-up:** “The balance table is huge; we cannot re-sum history.” Keep a daily snapshot of balances and recompute only from the last snapshot, or MERGE the per-SKU sum of the batch’s *new* deliveries, which you know because the insert-only MERGE tells you which rows were new (`RETURNING`).

<a id="solution-4"></a>
### Solution 4 · Three branches from a CDC batch

```python
con.execute("""CREATE TABLE dim_customer AS FROM (VALUES (1, 'Lisbon', false),
    (2, 'Porto', false), (3, 'Faro', false)) AS v(customer_id, city, is_deleted)""")
con.execute("""CREATE TABLE cdc AS FROM (VALUES (50, 'U', 2, 'Braga'), (51, 'D', 3, 'Faro'),
    (52, 'I', 4, 'Lisbon'), (53, 'D', 9, 'Porto')) AS v(change_seq, op, customer_id, city)""")
changed = q("""MERGE INTO dim_customer AS t
USING cdc AS s
ON t.customer_id = s.customer_id
WHEN MATCHED AND s.op = 'D' THEN UPDATE SET is_deleted = true
WHEN MATCHED THEN UPDATE SET city = s.city, is_deleted = false
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT VALUES (s.customer_id, s.city, false)""")[0][0]
rows = q("SELECT * FROM dim_customer ORDER BY customer_id")
print(changed, rows)
assert changed == 3
assert rows == [(1, "Lisbon", False), (2, "Braga", False), (3, "Faro", True), (4, "Lisbon", False)]
```

Output:

```text
3 [(1, 'Lisbon', False), (2, 'Braga', False), (3, 'Faro', True), (4, 'Lisbon', False)]
```

The delete branch comes first because a delete row also satisfies the plain `MATCHED` branch; the insert branch excludes deletes, so customer 9 is not created. **Common wrong answer:** `WHEN NOT MATCHED THEN INSERT` without the `op` check, which creates customer 9 as an active customer. **Interviewer follow-up:** “Changes can arrive out of order.” Then a delete for an unseen key should be kept as a tombstone (insert with `is_deleted = true`) and every matched branch needs a version guard, as in lesson 21.

<a id="solution-5"></a>
### Solution 5 · Find the bug: an order changed its date

```python
con.execute("""CREATE TABLE fct AS SELECT order_id, order_date::DATE AS order_date,
    amount::DECIMAL(10,2) AS amount FROM (VALUES (110, '2026-03-01', 20.00),
    (111, '2026-03-01', 30.00), (112, '2026-03-02', 40.00)) AS v(order_id, order_date, amount)""")
con.execute("""CREATE TABLE agg AS SELECT order_date, count(*) AS orders, sum(amount) AS revenue
               FROM fct GROUP BY order_date""")
con.execute("CREATE TABLE batch AS SELECT 110 AS order_id, DATE '2026-03-02' AS order_date, "
            "20.00::DECIMAL(10,2) AS amount")
con.execute("""BEGIN TRANSACTION;
CREATE OR REPLACE TEMP TABLE affected AS            -- BEFORE the merge: old and new dates
SELECT order_date FROM batch
UNION
SELECT t.order_date FROM fct AS t JOIN batch AS s USING (order_id);
MERGE INTO fct AS t USING batch AS s ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET order_date = s.order_date, amount = s.amount;
DELETE FROM agg WHERE order_date IN (SELECT order_date FROM affected);
INSERT INTO agg
SELECT order_date, count(*), sum(amount) FROM fct
WHERE order_date IN (SELECT order_date FROM affected) GROUP BY order_date;
COMMIT;""")
rows = [(str(d), n, str(r)) for d, n, r in q("SELECT * FROM agg ORDER BY order_date")]
print(rows)
assert rows == [("2026-03-01", 1, "30.00"), ("2026-03-02", 2, "60.00")]
assert q("""SELECT count(*) FROM (FROM agg EXCEPT
            SELECT order_date, count(*), sum(amount) FROM fct GROUP BY order_date)""") == [(0,)]
```

Output:

```text
[('2026-03-01', 1, '30.00'), ('2026-03-02', 2, '60.00')]
```

The buggy job reads the affected dates *after* the MERGE, from the target, so it sees only the new date (2 March); 1 March is never rebuilt. Read the dates before the merge and include both the batch’s dates and the target’s old dates; then run it all in one transaction. **Common wrong answer:** taking the dates only from the batch: that also misses 1 March. **Interviewer follow-up:** “The fact is append-only CDC, so the old date is not in the target.” Then the change row must carry the before-image (old values), as CDC tools usually provide, or keep a key → partition lookup table.

<a id="solution-6"></a>
### Solution 6 · A version guard without DO NOTHING

```python
con.execute("""CREATE OR REPLACE MACRO batch_latest(b) AS TABLE
SELECT *
FROM raw_changes
WHERE batch_id = b
  AND order_id IS NOT NULL                       -- broken keys go to quarantine instead
QUALIFY row_number() OVER (PARTITION BY order_id
                           ORDER BY change_seq DESC) = 1;""")
con.execute("""CREATE TABLE fct_orders AS SELECT order_id, customer_id, order_date, status, amount,
               updated_at, change_seq, false AS is_deleted FROM raw_changes WHERE false""")
for b in (1, 2, 3):
    con.execute(f"""MERGE INTO fct_orders AS t
USING batch_latest({b}) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING   -- stale or already applied
WHEN MATCHED AND s.op = 'D' THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = true
WHEN MATCHED THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN                                           -- a delete we never saw: tombstone
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D');""")
changed = q("""MERGE INTO fct_orders AS t
USING batch_latest(4) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq > t.change_seq AND s.op = 'D' THEN
    UPDATE SET status = s.status, amount = s.amount, updated_at = s.updated_at,
               change_seq = s.change_seq, is_deleted = true
WHEN MATCHED AND s.change_seq > t.change_seq THEN
    UPDATE SET status = s.status, amount = s.amount, updated_at = s.updated_at,
               change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D')""")[0][0]
rows = q("""SELECT order_id, status, change_seq, is_deleted FROM fct_orders
            WHERE order_id IN (105, 106, 107, 109) ORDER BY order_id""")
print(changed, rows)
assert changed == 2
assert rows == [(105, "placed", 10, True), (106, "shipped", 19, False),
                (107, "refunded", 17, False), (109, "placed", 15, False)]
```

Output:

```text
2 [(105, 'placed', 10, True), (106, 'shipped', 19, False), (107, 'refunded', 17, False), (109, 'placed', 15, False)]
```

Stale rows (105 at change 8, 107 at change 14) match no branch, so nothing happens to them; 106 is updated and 109 inserted. A delete for an unseen key becomes a tombstone, which keeps the result order-independent. **Common wrong answer:** guarding only the update branch: then a stale delete (one older than a re-insert) could still fire. **Interviewer follow-up:** “There is no sequence, only `updated_at`, and two changes can share a timestamp.” Use `>=` with a deterministic tie-breaker in staging, or ask the source for a log position; say that the guard is only as good as the version.

<a id="solution-7"></a>
### Solution 7 · Choose the strategy and justify it

```python
con.execute("CREATE TABLE events (event_id VARCHAR, user_id INTEGER, name VARCHAR)")
batch = """SELECT * FROM (VALUES ('e1', 1, 'view'), ('e2', 1, 'add_to_cart'),
                              ('e2', 1, 'add_to_cart')) AS v(event_id, user_id, name)"""
INSERT_ONLY = f"""MERGE INTO events AS t
USING (SELECT DISTINCT * FROM ({batch})) AS s       -- exact duplicates: DISTINCT is enough
ON t.event_id = s.event_id
WHEN NOT MATCHED THEN INSERT VALUES (s.event_id, s.user_id, s.name)"""
con.execute(INSERT_ONLY); con.execute(INSERT_ONLY)    # redelivery
choice = {"a": "insert-only MERGE on event_id", "b": "MERGE with version guard and tombstones",
          "c": "partition replace (insert_overwrite, dynamic) of changed days",
          "d": "full rebuild"}
for k, v in choice.items():
    print(k, "->", v)
assert q("SELECT count(*), count(DISTINCT event_id) FROM events") == [(2, 2)]
```

Output:

```text
a -> insert-only MERGE on event_id
b -> MERGE with version guard and tombstones
c -> partition replace (insert_overwrite, dynamic) of changed days
d -> full rebuild
```

(a) Append is wrong despite immutability: redelivery duplicates. An insert-only MERGE (or `INSERT … ON CONFLICT DO NOTHING`) on `event_id` is idempotent; for exact duplicates, `DISTINCT` in the source is enough. (b) Keyed rows that change, delete, and arrive late: a guarded MERGE with tombstones. (c) Huge, date-partitioned, changes confined to recent days: replace the changed days (dynamic `insert_overwrite` or MERGE ON FALSE), with partitions taken from the changed rows. (d) Tiny and fully re-exported: rebuild; nothing to drift. **Common wrong answer:** MERGE for (c): correct but it matches keys across billions of rows when whole days could be swapped. **Interviewer follow-up:** “For (d), finance wants to know when a rate changed.” Then it is no longer a rebuild: snapshot it (SCD Type 2), covered in the dimensional-modeling and dbt snapshot decks.

<a id="solution-8"></a>
### Solution 8 · How long must the lookback be?

```python
con.execute("""CREATE TABLE batches AS FROM read_csv('sql-warehouse-writes-lab/data/batches.csv')""")
con.execute("""CREATE TABLE src_changes AS SELECT r.* EXCLUDE (batch_id), b.extracted_at AS visible_at
               FROM raw_changes AS r JOIN batches AS b USING (batch_id)""")
con.execute("""CREATE OR REPLACE TABLE fct_orders_rebuild AS
SELECT order_id, customer_id, order_date, status, amount, updated_at, change_seq,
       op = 'D' AS is_deleted
FROM raw_changes
WHERE order_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1;""")
MERGE = """MERGE INTO fct_orders AS t
USING stg AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING   -- stale or already applied
WHEN MATCHED AND s.op = 'D' THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = true
WHEN MATCHED THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN                                           -- a delete we never saw: tombstone
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D');"""
RUNS = ["2026-03-02 12:00", "2026-03-03 12:00", "2026-03-04 12:00", "2026-03-05 12:00"]

def differences(lookback_days):
    con.execute("""CREATE OR REPLACE TABLE fct_orders AS SELECT order_id, customer_id, order_date,
        status, amount, updated_at, change_seq, false AS is_deleted FROM src_changes WHERE false""")
    hw = "1970-01-01"
    for now in RUNS:
        con.execute(f"""CREATE OR REPLACE TEMP TABLE stg AS SELECT * FROM src_changes
            WHERE visible_at <= TIMESTAMP '{now}' AND order_id IS NOT NULL
              AND updated_at > TIMESTAMP '{hw}' - INTERVAL {lookback_days} DAY
            QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY change_seq DESC) = 1""")
        con.execute(MERGE)
        hw = q(f"SELECT max(updated_at) FROM src_changes WHERE visible_at <= TIMESTAMP '{now}'")[0][0]
    return q("""SELECT (SELECT count(*) FROM (FROM fct_orders EXCEPT FROM fct_orders_rebuild))
                     + (SELECT count(*) FROM (FROM fct_orders_rebuild EXCEPT FROM fct_orders))""")[0][0]

result = {days: differences(days) for days in range(4)}
for days, diff in result.items():
    print(f"lookback {days} day(s): {diff} rows differ from the rebuild")
assert result == {0: 1, 1: 0, 2: 0, 3: 0}
```

Output:

```text
lookback 0 day(s): 1 rows differ from the rebuild
lookback 1 day(s): 0 rows differ from the rebuild
lookback 2 day(s): 0 rows differ from the rebuild
lookback 3 day(s): 0 rows differ from the rebuild
```

With no lookback only order 109 is lost (one row differs). One day is enough *for this data*, because the guard makes the other late rows (105 and 107, both stale) harmless, and 109 was visible 11 h 10 min after the watermark. But the measured lag of a row can be 2 days 20 hours (lesson 20), and tomorrow’s late row may not be stale. Size the window from the maximum observed lag plus a margin (3 days), and alert when the lag approaches it. **Common wrong answer:** picking the smallest window that passes today’s test. **Interviewer follow-up:** “Three days of re-reading is too expensive.” Watermark on arrival time instead (lesson 20), or partition the source by arrival date so the lookback reads only a few partitions.

<a id="solution-9"></a>
### Solution 9 · Take-home: a reusable load test

```python
con.execute("""CREATE OR REPLACE MACRO batch_latest(b) AS TABLE
SELECT *
FROM raw_changes
WHERE batch_id = b
  AND order_id IS NOT NULL                       -- broken keys go to quarantine instead
QUALIFY row_number() OVER (PARTITION BY order_id
                           ORDER BY change_seq DESC) = 1;""")
V1 = """MERGE INTO fct_orders AS t
USING batch_latest({b}) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' AND NOT t.is_deleted THEN
    UPDATE SET is_deleted = true, updated_at = s.updated_at, change_seq = s.change_seq
WHEN MATCHED AND s.op <> 'D'
     AND (t.status, t.amount) IS DISTINCT FROM (s.status, s.amount) THEN
    UPDATE SET status = s.status, amount = s.amount,
               updated_at = s.updated_at, change_seq = s.change_seq
WHEN NOT MATCHED AND s.op <> 'D' THEN
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, false);"""
V2 = """MERGE INTO fct_orders AS t
USING batch_latest({b}) AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.change_seq <= t.change_seq THEN DO NOTHING   -- stale or already applied
WHEN MATCHED AND s.op = 'D' THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = true
WHEN MATCHED THEN
    UPDATE SET customer_id = s.customer_id, order_date = s.order_date, status = s.status,
               amount = s.amount, updated_at = s.updated_at, change_seq = s.change_seq, is_deleted = false
WHEN NOT MATCHED THEN                                           -- a delete we never saw: tombstone
    INSERT VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount,
                   s.updated_at, s.change_seq, s.op = 'D');"""

def build(statement, order):
    con.execute("""CREATE OR REPLACE TABLE fct_orders AS SELECT order_id, customer_id, order_date,
        status, amount, updated_at, change_seq, false AS is_deleted FROM raw_changes WHERE false""")
    for b in order:
        con.execute(statement.format(b=b))
    return q("SELECT md5(string_agg(f::VARCHAR, ',' ORDER BY f::VARCHAR)) FROM fct_orders f")[0][0]

def check_load(statement, batches):
    once = build(statement, batches)
    twice = build(statement, [b for b in batches for _ in range(2)])
    reverse = build(statement, list(reversed(batches)))
    return once == twice, once == reverse

v1, v2 = check_load(V1, [1, 2, 3, 4]), check_load(V2, [1, 2, 3, 4])
print("merge_v1 (idempotent, order-independent):", v1)
print("merge_v2 (idempotent, order-independent):", v2)
assert v1 == (True, False) and v2 == (True, True)
```

Output:

```text
merge_v1 (idempotent, order-independent): (True, False)
merge_v2 (idempotent, order-independent): (True, True)
```

Both statements are idempotent: re-running a batch is a no-op. Only the guarded one is order-independent; v1 lets whichever batch arrives last win. This pair of checks, plus a comparison with the full rebuild, is what the lab’s pytest suite runs. **Common wrong answer:** testing only “run twice”, which v1 passes, so the out-of-order bug ships. **Interviewer follow-up:** “How would you run this in CI on a real pipeline?” With small fixture batches checked into the repo, the same function as a pytest test, and an in-process engine (DuckDB) or a disposable warehouse schema.

<a id="solution-10"></a>
### Solution 10 · Stretch: sync one day from a complete snapshot

```python
con.execute("""CREATE TABLE fct AS SELECT order_id, order_date::DATE AS order_date, status,
    false AS is_deleted FROM (VALUES (101, '2026-03-01', 'placed'), (102, '2026-03-01', 'shipped'),
    (103, '2026-03-01', 'placed'), (104, '2026-03-02', 'placed')) AS v(order_id, order_date, status)""")
con.execute("""CREATE TABLE snap AS FROM (VALUES (101, 'shipped'), (102, 'shipped'), (108, 'placed'))
               AS v(order_id, status)""")

def sync_day(day):
    if q("SELECT count(*) FROM snap")[0][0] == 0:
        raise ValueError("empty snapshot: refusing to delete a whole day")
    return q(f"""MERGE INTO fct AS t
USING snap AS s
ON t.order_id = s.order_id
WHEN MATCHED AND t.status IS DISTINCT FROM s.status THEN UPDATE SET status = s.status
WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, DATE '{day}', s.status, false)
WHEN NOT MATCHED BY SOURCE AND t.order_date = DATE '{day}' AND NOT t.is_deleted
    THEN UPDATE SET is_deleted = true""")[0][0]

print("changed:", sync_day("2026-03-01"), "| again:", sync_day("2026-03-01"))
rows = q("SELECT order_id, status, is_deleted FROM fct ORDER BY order_id")
print(rows)
assert rows == [(101, "shipped", False), (102, "shipped", False), (103, "placed", True),
                (104, "placed", False), (108, "placed", False)]
con.execute("DELETE FROM snap")
try:
    sync_day("2026-03-01")
except ValueError as e:
    print("empty file:", e)
```

Output:

```text
changed: 3 | again: 0
[(101, 'shipped', False), (102, 'shipped', False), (103, 'placed', True), (104, 'placed', False), (108, 'placed', False)]
empty file: empty snapshot: refusing to delete a whole day
```

Without the `t.order_date = …` condition, order 104 (2 March) is also “not matched by source” and gets deleted: the snapshot is complete only for its own day. The second run changes nothing, and an empty file is rejected before any row is touched (in production, compare with yesterday’s count rather than only with zero). **Common wrong answer:** putting the date filter in `USING` or `ON`: the target rows of other days still reach the `BY SOURCE` branch. **Interviewer follow-up:** “What if an order moves from 1 to 2 March?” The 1 March snapshot deletes it and the 2 March snapshot must re-insert it, so process the day snapshots in one transaction, or move rows with a matched update when the key is found in another day’s snapshot.
