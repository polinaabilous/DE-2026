# SQL semi-structured data: JSON, arrays, UNNEST across engines

*Companion to `sql-semi-structured.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engines and dialects:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, Windows 11 (64-bit); PostgreSQL 18.3 running in PGlite 0.5.8 (PostgreSQL compiled to WebAssembly, run by Node.js) for the JSONB lesson. Every DuckDB and PostgreSQL query in this document ran while it was built, and the result under it is the real result. **Spark SQL, Snowflake, BigQuery, and T-SQL / Fabric Warehouse snippets were not executed** (no Java, cloud accounts, or SQL Server on the build machine); each is labelled “not executed” and has no output. Cloud runtimes ship their own versions (for example Microsoft Fabric and Databricks runtimes pin a Spark version); check the linked documentation for yours.

**Scope (a gap deck):** *File formats in practice* already explains JSON and how nested data relates to table grain (its slides 5–6). This deck does not repeat that; it teaches the SQL: typed extraction, UNNEST / LATERAL / EXPLODE in five engines, the fan-out that unnesting causes, missing vs null fields, and drifting schemas. **Prerequisites:** *File formats in practice*, *SQL correctness: joins, grain, and NULLs* (fan-out, outer joins, three-valued logic), and *SQL aggregation* (COUNT DISTINCT, FILTER). New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common semi-structured-data interview patterns (research done in October 2026: typed extraction, FLATTEN vs UNNEST vs EXPLODE, disappearing rows for empty arrays, totals inflated after flattening, schema drift, raw vs typed storage). All questions are original and use the deck’s data.

**Lab:** [`sql-semi-structured-lab/`](sql-semi-structured-lab/README.md) next to this file holds the Open Food Facts–shaped fixture, the SQL, a runner, pytest tests, and a Spark SQL port (not executed). The fixture is synthetic: invented products with the real export’s shape. Open Food Facts data is licensed under ODbL.

**Additions beyond the original brief** are marked *(added)*: PostgreSQL JSONB examples executed in a real PostgreSQL engine (PGlite) instead of reference-only text; keys that need quoting (hyphens, dots, case) in JSON paths; list functions that answer array questions without unnesting; objects with variable keys (json_each, MAP); schema profiling with json_group_structure and key-frequency checks; T-SQL / Fabric Warehouse OPENJSON notes; duplicate documents across delta files and recursive sub-ingredients in the lab.

## Contents

1. [SQL semi-structured data: JSON, arrays, UNNEST across engines](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was executed](#slide-2)
3. [The running example: Leafy order documents](#slide-3)
4. [Navigate a document: ->, ->>, and JSON paths](#slide-4)
5. [Explicit types: cast after you extract](#slide-5)
6. [read_json with explicit nested columns](#slide-6)
7. [STRUCT, LIST, and MAP: answer array questions without unnesting](#slide-7)
8. [UNNEST: one row per array element](#slide-8)
9. [Empty arrays, NULL arrays, and element position](#slide-9)
10. [Arrays of objects and arrays inside arrays](#slide-10)
11. [Fan-out: parent values repeated on every element](#slide-11)
12. [Fan-out: two sibling arrays on one parent](#slide-12)
13. [Objects with variable keys: json_each and MAP](#slide-13)
14. [Missing key, JSON null, empty array: four different states](#slide-14)
15. [Drifting schemas: profile, then reconcile versions](#slide-15)
16. [Safe typed staging: TRY_CAST, quarantine, and contract checks](#slide-16)
17. [Same task, five engines: extract and cast](#slide-17)
18. [PostgreSQL JSONB, executed](#slide-18)
19. [Spark SQL, Snowflake, BigQuery, and T-SQL: the same order lines](#slide-19)
20. [Interview patterns: which tool for which JSON question](#slide-20)
21. [Lab: products per ingredient from Open Food Facts–shaped JSONL](#slide-21)
22. [Lab step 1: typed nutriments, newest version per product](#slide-22)
23. [Lab steps 2 and 3: explode ingredients, then count products](#slide-23)
24. [Lab step 4: run it, test it, port it to Spark SQL](#slide-24)
25. [Bug clinic: believable semi-structured bugs](#slide-25)
26. [Interview questions and model answers](#slide-26)
27. [Exercises 1–5 · extract, unnest, count](#slide-27)
28. [Exercises 6–10 · fan-out, drift, position, and a take-home](#slide-28)
29. [Cheat sheet](#slide-29)
30. [Glossary](#slide-30)
31. [Recap and practice plan](#slide-31)
32. [References and how this deck was tested](#slide-32)
33. [Appendix A · Hints](#appendix-a)
34. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. SQL semi-structured data: JSON, arrays, UNNEST across engines

**

APIs, app events, and product catalogues arrive as JSON documents with objects inside objects and arrays inside arrays. Reporting needs flat, typed rows at a known grain. This deck teaches the SQL in between: `->` and `->>`, casts, `read_json` with nested types, `UNNEST` and `LATERAL`, the fan-out unnesting causes, and what changes in PostgreSQL, Spark SQL, Snowflake, and BigQuery.

- **Part A, extract:** paths and arrows, explicit types, `read_json` with nested columns, STRUCT / LIST / MAP types.
- **Part B, unnest:** UNNEST and LATERAL, empty and NULL arrays, element position, nested arrays, the two kinds of fan-out, objects with variable keys.
- **Part C, missing and drift:** missing key vs JSON null vs empty array, drifting schemas, safe typed staging.
- **Part D, across engines:** the same task in DuckDB, PostgreSQL (executed), Spark SQL, Snowflake, BigQuery, and T-SQL; how to recognise which tool an interview question needs.
- **Lab:** typed nutriments, exploded ingredients, and products per ingredient from an Open Food Facts–shaped JSONL fixture, with tests and a Spark SQL port.
- **Practice:** a bug clinic, 8 interview questions with model answers, and 10 exercises.

This is a gap deck: *File formats in practice* (slides 5–6) already covers what JSON is and why flattening changes the grain. Every DuckDB and PostgreSQL query ran while this deck was built; Spark SQL, Snowflake, BigQuery, and T-SQL snippets are labelled not executed.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Most data you ingest is not born in tables. Order APIs, clickstream events, product catalogues, and SaaS exports arrive as JSON documents with nested objects and arrays. Reports, dbt models, and dashboards need **flat, typed rows at a stated grain**. The step in between is where silent errors hide: a quantity read as text, an order that vanishes because its array was empty, a shipping fee counted once per item, a field renamed by the source that turns a column into NULLs. This deck teaches that step in SQL, in the engines you will meet: DuckDB locally, PostgreSQL, Spark SQL, Snowflake, and BigQuery.

#### Where you will use it

- Turning raw API or event JSON (a bronze table) into typed staging models (silver).
- Exploding order lines, cart items, tags, or ingredients for product-level reporting.
- Reading event properties whose keys differ per event type.
- Reconciling counts after a source changes its payload.
- Porting a working query between DuckDB, Spark, Snowflake, and BigQuery.

#### What goes wrong without it

- Orders with an empty or missing array disappear from revenue reports.
- Parent amounts repeated on every array element inflate totals.
- Numbers stored as text sort and compare wrongly; joins on quoted JSON strings match nothing.
- A renamed field becomes NULL without any error.
- The same query returns different row counts in two engines.

#### Who expects you to know it

- Data engineers: staging models over raw JSON sources in dbt; ingestion that lands JSON and flattens it reliably.
- Analysts on Snowflake and BigQuery, where nested data is everyday SQL.
- Interviewers: “flatten this JSON” and “why did the row count change?” are standard screen questions.

> **On the job:** A typical first ticket: “Marketing wants revenue by product category, and the order API sends line items as a JSON array.” A strong answer lands the raw JSON unchanged, builds a typed order-line model with one row per item (keeping orders with no items visible), proves that item revenue plus shipping reconciles to payments per order, and adds a test that fails when the API renames a field.

> **The main idea:** JSON is where data arrives; typed rows at a known grain are what the business uses. The SQL that connects them must be explicit about types, emptiness, and grain.

*Read more:* [DuckDB: JSON overview](https://duckdb.org/docs/stable/data/json/overview), [Snowflake: FLATTEN](https://docs.snowflake.com/en/sql-reference/functions/flatten), [BigQuery: work with arrays](https://cloud.google.com/bigquery/docs/arrays).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| One scalar inside a document (city, status) | `->>` or a typed path, then `CAST` (lessons 4–5) | One value per row: no grain change. |
| A known, stable nested schema | `read_json` / `json_transform` with explicit STRUCT and LIST types (lessons 5–6) | Types are checked once at load; queries stay simple. |
| A question about the elements of an array, answered per parent | List functions: `len`, `list_filter`, `list_contains` (lesson 7) | No new rows, so no fan-out. |
| Reporting at element grain (per item, per ingredient) | `UNNEST` / `LATERAL` / `EXPLODE`, outer form if parents must stay (lessons 8–10) | The output grain changes on purpose. |
| Keys that differ per row (event properties) | `json_each` or a MAP (lesson 13) | Keys become values you can group by. |
| A payload you will query every day at scale | Not repeated JSON parsing: typed columns in Parquet / Delta (lesson 16) | Parsing text on every query costs time and money. |
| A one-off look at an unfamiliar payload | Not a full model: `json_structure` and a few paths (lesson 15) | Profile first, model only what others will reuse. |

#### How interviews test it

- “Flatten this nested JSON into one row per item” (array of objects → rows, with types).
- “What’s the difference between FLATTEN, UNNEST, and EXPLODE?” (same operation, three engines, outer variants).
- “After flattening, some orders are missing / the total is too high. Why?” (empty arrays; fan-out).
- “The source added or renamed a field. What happens to your pipeline?” (schema drift, raw landing, contracts).
- `->` vs `->>`, missing vs null, keeping array position.

#### Where it sits in your learning path

- Builds on *File formats in practice* (JSON, nested data and grain), *SQL correctness: joins, grain, and NULLs* (fan-out, outer joins), and *SQL aggregation* (COUNT DISTINCT, FILTER).
- Feeds the dbt decks (staging models over raw JSON sources) and the Fuel Smart portfolio project (Open Food Facts products and ingredients).

> **The main idea:** extract when you need one value, use list functions when the answer stays per parent, and unnest only when you want the grain to change, with the outer form whenever parents must survive.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was executed

*Start here · one Python environment, one optional Node package*

| Item | Detail |
|---|---|
| Executed engine | **DuckDB 1.5.6** (Python package) on **CPython 3.12.10**, Windows 11. DuckDB’s JSON support is built in: no extension to install. |
| Executed, PostgreSQL | **PostgreSQL 18.3** in **PGlite 0.5.8**: the real PostgreSQL server compiled to WebAssembly and run in-process by Node.js. Used for lesson 18 only. Optional: skip it and read the results on the slide. |
| Not executed | **Spark SQL, Snowflake, BigQuery, T-SQL / Fabric Warehouse.** The build machine has no Java, cloud accounts, or SQL Server, so their snippets are reference only, labelled “not executed”, and never shown with output. The syntax follows the linked official documentation. |
| Minimum versions | Tested on DuckDB 1.5.6. Some functions used here (`json_each`, `WITH ORDINALITY`) are recent additions: on an older DuckDB, upgrade rather than work around. PostgreSQL 12+ for `jsonb_path_query`; 9.4+ for JSONB. Spark 2.2+ for `explode_outer`; Spark 4.0 adds a `VARIANT` type. |
| How results were produced | The build runs every query and prints the real result. A query that fails, returns an unexpected result, or returns several rows without `ORDER BY` is a build failure. This deck built with **0 failures**. |

#### Create the environment

```text
# Windows PowerShell (macOS/Linux: source .venv/bin/activate)
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb pytest
# optional, for lesson 18: a local PostgreSQL without installing a server
npm install @electric-sql/pglite
```

#### Check it

```python
import sys, duckdb
print("Python", sys.version.split()[0], "· DuckDB", duckdb.__version__)
print(duckdb.sql("""SELECT '{"tags": ["indoor", "large"]}'::JSON -> 'tags' AS tags""").fetchall())
```

Output:

```text
Python 3.12.10 · DuckDB 1.5.6
[('["indoor","large"]',)]
```

*SQL · PostgreSQL (PGlite)*

```sql
SELECT current_setting('server_version') AS server_version,
       '{"tags": ["indoor", "large"]}'::jsonb -> 'tags' AS tags;
```

Result (1 row):

| server_version | tags |
|---|---|
| 18.3 | ["indoor","large"] |

> **On the job:** Semi-structured SQL is written in a warehouse or lakehouse engine (Snowflake, BigQuery, Databricks, Fabric) where you cannot iterate cheaply. DuckDB reads the same JSONL files locally in milliseconds, so it is a good place to work out the paths, types, and row counts on a sample before you port the query.

> **The main idea:** one local engine for every lesson, a real PostgreSQL for the JSONB lesson, and an honest label on everything that did not run.

*Read more:* [DuckDB: JSON overview](https://duckdb.org/docs/stable/data/json/overview), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [PGlite documentation](https://pglite.dev/docs/).

---

<a id="slide-3"></a>
## 3. The running example: Leafy order documents

*Start here · nine JSON documents with every common trap planted*

Recap from *File formats in practice*: a JSON document keeps objects and arrays together, and turning an array into rows changes the grain. Here is the data we will turn into rows. Leafy, the plant shop from earlier decks, receives orders from its order API as **JSONL** (JSON Lines: one JSON document per line). Each order has a nested `customer` object, an `items` array of objects (each with a `tags` array), and a `payments` array. A second file, `events.jsonl`, holds five app events whose `props` object has different keys per event type.

#### One document (order L-1006)

```python
import json
with open("data/orders.jsonl", encoding="utf-8") as f:
    docs = [json.loads(line) for line in f]
print(len(docs), "documents; order L-1006 without its arrays:")
doc = docs[5]
print({k: v for k, v in doc.items() if k not in ("items", "payments")})
for item in doc["items"]:
    print("  items[]   ", item)
for payment in doc["payments"]:
    print("  payments[]", payment)
```

Output:

```text
9 documents; order L-1006 without its arrays:
{'order_id': 'L-1006', 'placed_at': '2026-03-04T19:20:00Z', 'status': 'shipped', 'customer': {'id': 'C-05', 'country': 'US', 'address': {'city': 'Austin', 'zip': '78702'}}, 'shipping': 4.99}
  items[]    {'sku': 'MON-01', 'name': 'Monstera deliciosa', 'qty': 1, 'unit_price': 29.0, 'tags': ['indoor', 'large']}
  items[]    {'sku': 'MON-01', 'name': 'Monstera deliciosa', 'qty': 1, 'unit_price': 29.0, 'tags': ['indoor', 'large']}
  items[]    {'sku': 'CAC-02', 'name': 'Bunny-ear cactus', 'qty': 1, 'unit_price': 12.0, 'tags': None}
  payments[] {'method': 'card', 'amount': 70.0}
  payments[] {'method': 'card', 'amount': 4.99}
```

#### All nine documents, at a glance

```sql
SELECT doc ->> 'order_id'                    AS order_id,
       doc ->> 'status'                      AS status,
       json_array_length(doc, '$.items')     AS n_items,
       json_array_length(doc, '$.payments')  AS n_payments,
       doc ->> 'api_version'                 AS api_version
FROM read_json_objects('data/orders.jsonl') AS t(doc)
ORDER BY order_id;
```

Result (9 rows):

| order_id | status | n_items | n_payments | api_version |
|---|---|---|---|---|
| L-1001 | shipped | 2 | 1 | NULL |
| L-1002 | shipped | 1 | 2 | NULL |
| L-1003 | shipped | 1 | 1 | NULL |
| L-1004 | cancelled | 0 | 0 | NULL |
| L-1005 | draft | NULL | NULL | NULL |
| L-1006 | shipped | 3 | 2 | NULL |
| L-1007 | shipped | 1 | 1 | 2 |
| L-1008 | shipped | 2 | 1 | 2 |
| L-1009 | shipped | 1 | 1 | 2 |

`read_json_objects` reads each line as one value of DuckDB’s `JSON` type without interpreting it. Lesson 4 explains the operators.

| Trap planted in the data | Where | Lesson |
|---|---|---|
| Quantity sent as a string (`"qty": "2"`) and a price as a string (`"12.00"`) | L-1002, L-1009 | 5 |
| A missing nested key (no `city`), a JSON `null` address, a `null` country | L-1003, L-1005, L-1009 | 14 |
| An empty `items` array, a missing `items` key, a `null` and an empty `tags` array | L-1004, L-1005, L-1006, L-1003 | 9, 14 |
| The same SKU on two lines of one order | L-1006 | 11 |
| Two sibling arrays on one order (3 items, 2 payments) | L-1006, L-1002 | 12 |
| API v2 renamed `unit_price` to `price.amount` and added `gift` | L-1007 to L-1009 | 15 |
| Event properties with different keys per event | `events.jsonl` | 13 |

The files are generated by a deterministic script and ship in the lab folder (`sql-semi-structured-lab/data/`), so every query in this deck can be rerun from inside that folder.

> **On the job:** Real API payloads look like this: optional keys, values that change type between versions, empty arrays for cancelled things, and new fields that appear without notice. Writing the trap list for your source down, as above, is the first thing to do when you take over a JSON feed.

> **The main idea:** nine small documents carry every trap this deck fixes; keep the trap table in mind, because each lesson changes a number on one of these orders.

*Read more:* [DuckDB: loading JSON (read_json)](https://duckdb.org/docs/stable/data/json/loading_json), [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259).

---

<a id="slide-4"></a>
## 4. Navigate a document: ->, ->>, and JSON paths

*Part A · how do I reach one value inside a document?*

DuckDB stores a document in its **JSON type**: text that has been checked to be valid JSON. Two operators reach inside it. `->` returns the value *as JSON* (a string keeps its quotes; an object stays an object, so you can keep navigating). `->>` returns the value *as text* (`VARCHAR`, quotes removed): use it for the last step. The right-hand side is a key name, an array index, or a **JSON path**: a string starting with `$` that walks the document, such as `$.customer.address.city` or `$.items[0].sku`.

#### Land the raw documents first

*SQL · land the raw documents*

```sql
CREATE OR REPLACE TABLE raw_orders AS
SELECT json AS doc                                   -- one JSON value per line, untouched
FROM read_json_objects('data/orders.jsonl');
```

One column, nine rows. Nothing is interpreted yet, so nothing can be lost: this is the **raw landing** (often called bronze) that later models read from.

#### Coming from C#

`->` is `JsonElement.GetProperty("city")`: you still hold a JSON element. `->>` is `.GetString()`: you hold a plain string. A missing property returns SQL `NULL` instead of throwing `KeyNotFoundException`; that silence is useful and dangerous (lesson 14).

```sql
SELECT doc ->> 'order_id'                           AS order_id,
       doc -> 'customer' -> 'address' -> 'city'      AS city_json,   -- JSON
       doc ->> '$.customer.address.city'             AS city_text,   -- VARCHAR
       doc ->> '$.items[0].sku'                      AS first_sku,   -- JSON path: 0-based
       doc -> 'items' -> 1 ->> 'sku'                 AS second_sku,
       doc ->> 'Order_ID'                            AS wrong_case
FROM raw_orders
WHERE doc ->> 'order_id' IN ('L-1001', 'L-1003', 'L-1005')
ORDER BY order_id;
```

Result (3 rows):

| order_id | city_json | city_text | first_sku | second_sku | wrong_case |
|---|---|---|---|---|---|
| L-1001 | "Austin" | Austin | MON-01 | POT-12 | NULL |
| L-1003 | NULL | NULL | SUC-07 | NULL | NULL |
| L-1005 | NULL | NULL | NULL | NULL | NULL |

#### Keys with dots, hyphens, or another case

```sql
SELECT '{"a.b": 1, "a": {"b": 2}}'::JSON ->> 'a.b'           AS plain_key,
       '{"a.b": 1, "a": {"b": 2}}'::JSON ->> '$.a.b'         AS path,
       '{"a.b": 1, "a": {"b": 2}}'::JSON ->> '$."a.b"'       AS quoted_in_path,
       '{"energy-kcal_100g": 452}'::JSON ->> '$."energy-kcal_100g"' AS hyphen_key;
```

Result (1 row):

| plain_key | path | quoted_in_path | hyphen_key |
|---|---|---|---|
| 1 | 2 | 1 | 452 |

A plain string is *one key name*, even if it contains a dot. A `$` path navigates; quote a key inside a path with double quotes when it contains a dot or space. Keys are case-sensitive: `Order_ID` above is NULL. Open Food Facts uses hyphenated keys such as `energy-kcal_100g`; DuckDB accepts the hyphen in a path, but Snowflake, Spark, and BigQuery need it quoted (lesson 17).

#### Pitfall: operator precedence

*SQL · believable, but wrong*

```sql
SELECT doc -> 'customer' -> 'address' -> 'city' = 'Austin' AS is_austin
FROM raw_orders;
```

Error (expected):

```text
BinderException: Binder Error: No function matches the given name and argument types 'json_extract(JSON, BOOLEAN)'. You might need to add explicit type casts.
```

In DuckDB, arrows mixed with `=` don’t always group the way you read them: here the last step parsed as `… -> ('city' = 'Austin')` and failed to bind; `x = doc ->> 'k'` in a join condition fails the same way. Wrap every arrow expression in parentheses before comparing or joining: `(doc ->> '$.customer.address.city') = 'Austin'`.

> **On the job:** The first hour with a new JSON feed is spent exactly here: picking the paths you need, checking which ones are sometimes missing, and writing them down as the column list of a staging model.

> **The main idea:** -> keeps JSON so you can keep walking; ->> gives text for the last step; a $ path walks the document, a plain string is one key, and parentheses keep comparisons safe.

*Read more:* [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [DuckDB: JSON overview](https://duckdb.org/docs/stable/data/json/overview), [RFC 9535: JSONPath](https://www.rfc-editor.org/rfc/rfc9535).

---

<a id="slide-5"></a>
## 5. Explicit types: cast after you extract

*Part A · how do I get an INTEGER, not the text "2"?*

Everything that leaves a JSON document is either JSON or text. A **JSON scalar** (a single number, string, boolean, or null) has its own JSON type, and the same field can arrive as a number in one document and a string in the next. So the rule is: extract with `->>`, then **cast explicitly** to the type the column should have. `CAST` fails loudly on a bad value; `TRY_CAST` returns NULL instead, which you must then count (lesson 16).

```sql
SELECT doc ->> 'order_id'                                 AS order_id,
       doc -> '$.items[0].qty'                             AS qty_json,
       json_type(doc, '$.items[0].qty')                    AS json_type,
       CAST(doc ->> '$.items[0].qty' AS INTEGER)           AS qty,
       CAST(doc ->> 'shipping' AS DECIMAL(10, 2))          AS shipping
FROM raw_orders
WHERE doc ->> 'order_id' IN ('L-1001', 'L-1002', 'L-1004')
ORDER BY order_id;
```

Result (3 rows):

| order_id | qty_json | json_type | qty | shipping |
|---|---|---|---|---|
| L-1001 | 1 | UBIGINT | 1 | 4.99 |
| L-1002 | "2" | VARCHAR | 2 | 4.99 |
| L-1004 | NULL | NULL | NULL | 0.00 |

Order L-1002 sends `"qty": "2"`, a JSON string; the cast turns both shapes into the same INTEGER. Order L-1004 has no items, so every item path is NULL.

#### Why the cast is not optional

*SQL · text cannot be summed*

```sql
SELECT SUM(doc ->> 'shipping') FROM raw_orders;
```

Error (expected):

```text
BinderException: Binder Error: No function matches the given name and argument types 'sum(VARCHAR)'. You might need to add explicit type casts.
```

```sql
SELECT SUM(CAST(doc ->> 'shipping' AS DOUBLE))::VARCHAR AS as_double,
       SUM(CAST(doc ->> 'shipping' AS DECIMAL(10, 2)))     AS as_decimal,
       '12.00' > '4.99'                                    AS text_compare,
       TRY_CAST('two' AS INTEGER)                          AS try_cast_bad
FROM raw_orders;
```

Result (1 row):

| as_double | as_decimal | text_compare | try_cast_bad |
|---|---|---|---|
| 29.940000000000005 | 29.94 | false | NULL |

Text can’t be summed, and compares character by character (`'12.00' < '4.99'`). `DOUBLE` money drifts (29.940000000000005); `DECIMAL(10, 2)` is exact. Use DECIMAL for amounts, INTEGER for counts, TIMESTAMP for times.

#### Many typed fields at once: json_transform

```sql
SELECT doc ->> 'order_id' AS order_id,
       json_transform(doc, '{"shipping": "DECIMAL(10,2)",
                              "items": [{"sku": "VARCHAR", "qty": "INTEGER"}]}') AS typed
FROM raw_orders
WHERE doc ->> 'order_id' IN ('L-1002', 'L-1004', 'L-1005')
ORDER BY order_id;
```

Result (3 rows):

| order_id | typed |
|---|---|
| L-1002 | {shipping: 4.99, items: [{sku: 'FIC-03', qty: 2}]} |
| L-1004 | {shipping: 0.00, items: []} |
| L-1005 | {shipping: 0.00, items: NULL} |

`json_transform` (alias `from_json`) takes a **structure**: a JSON template whose leaves are type names. It returns a typed `STRUCT`, with lists for arrays. Keys not in the structure are dropped; keys missing from the document become NULL; values that can’t be cast become NULL. `json_transform_strict` raises an error instead.

- `json_extract(doc, path)` = `->` (returns JSON); `json_extract_string(doc, path)` = `->>` (returns VARCHAR).
- `json_value(doc, path)` returns a scalar only; for an object or array it returns NULL. Handy as a guard, confusing as a default.
- Coming from C#: this is `JsonSerializer.Deserialize<Order>()` with a record type, except that a bad field becomes NULL instead of throwing, unless you choose the strict variant.

> **On the job:** Every staging model over a JSON source starts with an explicit type for each column. In code review, a column that stays VARCHAR because “it came from JSON” is the first thing a senior engineer will flag, because sorting, joining, and summing it later will be wrong.

> **The main idea:** extract with ->>, cast to the real type (DECIMAL for money), use TRY_CAST only when you also count what failed, and use json_transform to type a whole document at once.

*Read more:* [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [DuckDB: CAST and TRY_CAST](https://duckdb.org/docs/stable/sql/expressions/cast).

---

<a id="slide-6"></a>
## 6. read_json with explicit nested columns

*Part A · how do I type a whole file at load time?*

`read_json` reads a JSON or JSONL file straight into typed columns. Without help it **infers** a schema from a sample of documents. With `columns = {…}` you declare it: nested objects become **STRUCT** columns and arrays become **LIST** columns (written `TYPE[]`). *Python files and streams* loaded flat JSONL this way; here the columns are nested.

#### What inference decided

*SQL · let DuckDB infer the schema*

```sql
SELECT column_name, column_type
FROM (DESCRIBE SELECT * FROM read_json('data/orders.jsonl'));
```

Result (9 rows):

| column_name | column_type |
|---|---|
| order_id | VARCHAR |
| placed_at | TIMESTAMP |
| status | VARCHAR |
| customer | STRUCT(id VARCHAR, country VARCHAR, address STRUCT(city VARCHAR, zip VARCHAR)) |
| items | STRUCT(sku VARCHAR, "name" VARCHAR, qty JSON, unit_price DOUBLE, tags VARCHAR[], price STRUCT(amount JSON, currency VARCHAR))[] |
| shipping | DOUBLE |
| payments | STRUCT("method" VARCHAR, amount DOUBLE)[] |
| api_version | BIGINT |
| gift | STRUCT(note VARCHAR) |

Inference merged both API versions into one struct (`unit_price` *and* `price`), made `qty` and `price.amount` JSON because they are sometimes strings, and chose DOUBLE for money. It ran without error, and it is not a schema you want to depend on: one new document can change it.

#### What a declared schema does, and hides

```sql
SELECT order_id, items[1].sku AS first_sku, items[1].unit_price AS first_unit_price
FROM read_json('data/orders.jsonl', format = 'newline_delimited',
     columns = {order_id: 'VARCHAR',
                items: 'STRUCT(sku VARCHAR, unit_price DECIMAL(10, 2))[]'})
WHERE order_id IN ('L-1001', 'L-1007', 'L-1008')
ORDER BY order_id;
```

Result (3 rows):

| order_id | first_sku | first_unit_price |
|---|---|---|
| L-1001 | MON-01 | 29.00 |
| L-1007 | FIC-03 | NULL |
| L-1008 | POT-12 | NULL |

Declared types are applied while reading (`"2"` becomes 2, `29.0` becomes 29.00). Keys you didn’t declare are skipped. Keys that are missing become NULL, **without an error**: the v2 orders moved the price to `price.amount`, so `unit_price` is silently NULL. Lesson 15 shows how to catch this.

#### The typed view used from now on

*SQL · the typed view used from now on*

```sql
CREATE OR REPLACE VIEW orders AS
SELECT *
FROM read_json('data/orders.jsonl', format = 'newline_delimited',
     columns = {
       order_id:  'VARCHAR',
       placed_at: 'TIMESTAMP',
       status:    'VARCHAR',
       customer:  'STRUCT(id VARCHAR, country VARCHAR, address STRUCT(city VARCHAR, zip VARCHAR))',
       items:     'STRUCT(sku VARCHAR, "name" VARCHAR, qty INTEGER, unit_price DECIMAL(10, 2),
                          price STRUCT(amount DECIMAL(10, 2), currency VARCHAR), tags VARCHAR[])[]',
       shipping:  'DECIMAL(10, 2)',
       payments:  'STRUCT("method" VARCHAR, amount DECIMAL(10, 2))[]',
       api_version: 'INTEGER'});
```

It declares both price shapes so no data is lost, and keeps the arrays as lists. Field names that are SQL keywords (`name`, `method`) are double-quoted.

#### Check it

```sql
SELECT order_id, customer.address.city AS city, len(items) AS n_items, shipping
FROM orders
ORDER BY order_id;
```

Result (9 rows):

| order_id | city | n_items | shipping |
|---|---|---|---|
| L-1001 | Austin | 2 | 4.99 |
| L-1002 | Denver | 1 | 4.99 |
| L-1003 | NULL | 1 | 4.99 |
| L-1004 | Austin | 0 | 0.00 |
| L-1005 | NULL | NULL | 0.00 |
| L-1006 | Austin | 3 | 4.99 |
| L-1007 | Denver | 1 | 4.99 |
| L-1008 | Seattle | 2 | 4.99 |
| L-1009 | NULL | 1 | 0.00 |

`customer.address.city` walks STRUCT fields with dots. `len(items)` is 0 for the cancelled order’s empty array and NULL for the draft order with no `items` key: two different states, kept apart (lesson 14).

> **On the job:** In dbt on DuckDB, Snowflake, or Databricks, this is your staging model: the source is a folder of JSON files, the model declares the schema, and the declaration lives in version control so a reviewer can see every type decision.

> **The main idea:** declare the schema for anything you will query twice: inference is a starting point, and a declared schema still needs a check that the keys you expect actually arrive.

*Read more:* [DuckDB: loading JSON (read_json)](https://duckdb.org/docs/stable/data/json/loading_json), [DuckDB: STRUCT](https://duckdb.org/docs/stable/sql/data_types/struct), [DuckDB: LIST](https://duckdb.org/docs/stable/sql/data_types/list).

---

<a id="slide-7"></a>
## 7. STRUCT, LIST, and MAP: answer array questions without unnesting

*Part A · how do I ask about the elements but keep one row per order? (added)*

Once JSON is typed, three nested types do the work. A **STRUCT** has a fixed set of named fields (like a C# record): `customer.address.city`. A **LIST** holds any number of values of one type: `items`, `tags`; SQL lists are **1-based** (`items[1]`), while JSON paths are 0-based (`$.items[0]`). A **MAP** holds key/value pairs whose keys differ per row (lesson 13). **List functions** work inside a list without creating rows: `len`, `list_transform(l, x -> …)`, `list_filter`, `list_sum`, `list_contains`. The `x -> …` part is a **lambda**, exactly like a C# lambda in LINQ.

```sql
SELECT order_id,
       len(items)                                                   AS n_lines,
       list_sum(list_transform(items, i -> i.qty))                  AS units,
       list_sum(list_transform(items, i -> i.qty * coalesce(i.unit_price, i.price.amount))) AS items_amount,
       list_contains(list_transform(items, i -> i.sku), 'MON-01')   AS has_monstera,
       items[1].sku                                                 AS first_sku     -- LIST: 1-based
FROM orders
ORDER BY order_id;
```

Result (9 rows):

| order_id | n_lines | units | items_amount | has_monstera | first_sku |
|---|---|---|---|---|---|
| L-1001 | 2 | 3 | 46.00 | true | MON-01 |
| L-1002 | 1 | 2 | 36.00 | false | FIC-03 |
| L-1003 | 1 | 3 | 18.00 | false | SUC-07 |
| L-1004 | 0 | NULL | NULL | false | NULL |
| L-1005 | NULL | NULL | NULL | NULL | NULL |
| L-1006 | 3 | 3 | 70.00 | true | MON-01 |
| L-1007 | 1 | 1 | 18.00 | false | FIC-03 |
| L-1008 | 2 | 5 | 32.50 | false | POT-12 |
| L-1009 | 1 | 2 | 24.00 | false | CAC-02 |

#### Read the result

- Still one row per order: no fan-out is possible, because no rows were created.
- Order L-1006 is 29 + 29 + 12 = 70.00. `coalesce(i.unit_price, i.price.amount)` reads the v1 or v2 price shape (lesson 15).
- L-1004 (empty list) gives `len = 0` and `list_sum = NULL`; L-1005 (no list) gives NULL everywhere. Decide which of these is 0 for your report.

Coming from C#: `order.Items.Sum(i => i.Qty * i.Price)` and `order.Items.Any(i => i.Sku == "MON-01")`.

#### Nested lists: filter on the inner list

```sql
SELECT order_id,
       len(list_filter(items, i -> list_contains(i.tags, 'indoor'))) AS indoor_lines
FROM orders
WHERE status = 'shipped'
ORDER BY order_id;
```

Result (7 rows):

| order_id | indoor_lines |
|---|---|
| L-1001 | 1 |
| L-1002 | 1 |
| L-1003 | 0 |
| L-1006 | 2 |
| L-1007 | 1 |
| L-1008 | 0 |
| L-1009 | 1 |

A lambda can call list functions on an inner list: count the lines whose `tags` contain `indoor`. L-1006’s cactus line has `tags: null`; `list_contains(NULL, …)` is NULL, which `list_filter` treats as “not kept”.

> **On the job:** Per-order flags and counts (has a gift note, number of lines, contains a promo SKU) are the most common derived columns in a staging model. Computing them with list functions keeps the model at order grain, so it can be joined to anything without a fan-out risk.

> **The main idea:** if the answer is still one row per parent, compute it inside the list (len, list_filter, list_sum, list_contains) and never create element rows at all.

*Read more:* [DuckDB: list functions](https://duckdb.org/docs/stable/sql/functions/list), [DuckDB: lambda functions](https://duckdb.org/docs/stable/sql/functions/lambda), [DuckDB: STRUCT](https://duckdb.org/docs/stable/sql/data_types/struct), [DuckDB: MAP](https://duckdb.org/docs/stable/sql/data_types/map).

---

<a id="slide-8"></a>
## 8. UNNEST: one row per array element

*Part B · how do I turn the items array into order lines?*

**Unnesting** (also called exploding or flattening) produces one output row per element of an array, repeating the parent’s columns on each. The output has a new **grain**: one row per order line instead of one row per order. In DuckDB the table function `UNNEST(list)` does it. In `FROM orders AS o, UNNEST(o.items)` the function reads a column of the table on its left, once per row: that is a **lateral join** (DuckDB adds the `LATERAL` keyword for you; PostgreSQL and the standard write it). Coming from C#: `orders.SelectMany(o => o.Items, (o, item) => new { o.OrderId, item.Sku })`.

```sql
SELECT o.order_id,
       u.item.sku,
       u.item.qty,
       coalesce(u.item.unit_price, u.item.price.amount) AS unit_price
FROM orders AS o,
     UNNEST(o.items) AS u(item)          -- one row per element of THIS order's list
ORDER BY o.order_id, u.item.sku;
```

Result (11 rows):

| order_id | sku | qty | unit_price |
|---|---|---|---|
| L-1001 | MON-01 | 1 | 29.00 |
| L-1001 | POT-12 | 2 | 8.50 |
| L-1002 | FIC-03 | 2 | 18.00 |
| L-1003 | SUC-07 | 3 | 6.00 |
| L-1006 | CAC-02 | 1 | 12.00 |
| L-1006 | MON-01 | 1 | 29.00 |
| L-1006 | MON-01 | 1 | 29.00 |
| L-1007 | FIC-03 | 1 | 18.00 |
| L-1008 | POT-12 | 1 | 8.50 |
| L-1008 | SUC-07 | 4 | 6.00 |
| L-1009 | CAC-02 | 2 | 12.00 |

#### Predict the row count before you run it

```sql
SELECT (SELECT sum(len(items)) FROM orders)                 AS predicted_rows,
       (SELECT count(*) FROM orders, UNNEST(items))            AS actual_rows,
       (SELECT count(DISTINCT order_id) FROM orders, UNNEST(items)) AS orders_left;
```

Result (1 row):

| predicted_rows | actual_rows | orders_left |
|---|---|---|
| 11 | 11 | 7 |

Rows out = the sum of the list lengths: 2 + 1 + 1 + 0 + 3 + 1 + 2 + 1 = 11. Only 7 of the 9 orders survive: lesson 9 explains the two that vanished. Writing the predicted count next to the query is the habit that catches every bug in Part B.

#### Two ways to write it

*SQL · the select-list form*

```sql
SELECT order_id, UNNEST(items).sku AS sku
FROM orders
WHERE order_id = 'L-1001'
ORDER BY sku;
```

Result (2 rows):

| order_id | sku |
|---|---|
| L-1001 | MON-01 |
| L-1001 | POT-12 |

`UNNEST` in the select list is a DuckDB and PostgreSQL convenience. The `FROM … , UNNEST(…) AS u(item)` form is the one that ports: it reads like PostgreSQL `LATERAL`, Snowflake `LATERAL FLATTEN`, BigQuery `, UNNEST()`, and Spark `LATERAL VIEW explode`. Use the FROM form in models.

> **On the job:** Order lines, cart items, event parameters, tags, ingredient lists: every “one row per thing inside the thing” table in a warehouse is built with this one operation. State the new grain in the model’s description (“one row per order line”) and test it with a unique key such as `(order_id, line_no)`.

> **The main idea:** UNNEST changes the grain on purpose; predict the row count (sum of list lengths) before running it, and prefer the FROM form that ports to every engine.

*Read more:* [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [DuckDB: FROM and LATERAL joins](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-9"></a>
## 9. Empty arrays, NULL arrays, and element position

*Part B · why did two orders disappear, and which line came first?*

An inner unnest of an **empty array** (`[]`) or a **NULL array** (key missing, or `null`) produces zero rows, so the parent row disappears: the cancelled order L-1004 and the draft L-1005 are gone, with no error. When parents must stay (counting orders, revenue including zero-item orders, “orders without lines” checks), use the **outer** form: `LEFT JOIN UNNEST(…) ON true`. The parent appears once with NULL element columns.

```sql
SELECT 'inner: FROM orders, UNNEST(items)' AS form,
       count(*) AS row_count, count(DISTINCT order_id) AS order_count
FROM orders, UNNEST(items) AS u(item)
UNION ALL
SELECT 'outer: LEFT JOIN UNNEST(items) ON true',
       count(*), count(DISTINCT order_id)
FROM orders LEFT JOIN UNNEST(items) AS u(item) ON true
ORDER BY form;
```

Result (2 rows):

| form | row_count | order_count |
|---|---|---|
| inner: FROM orders, UNNEST(items) | 11 | 7 |
| outer: LEFT JOIN UNNEST(items) ON true | 13 | 9 |

#### Keep the parent, and keep the position

```sql
SELECT o.order_id, o.status, u.line_no, u.item.sku
FROM orders AS o
LEFT JOIN UNNEST(o.items) WITH ORDINALITY AS u(item, line_no) ON true
WHERE o.order_id IN ('L-1003', 'L-1004', 'L-1005', 'L-1006')
ORDER BY o.order_id, u.line_no;
```

Result (6 rows):

| order_id | status | line_no | sku |
|---|---|---|---|
| L-1003 | shipped | 1 | SUC-07 |
| L-1004 | cancelled | NULL | NULL |
| L-1005 | draft | NULL | NULL |
| L-1006 | shipped | 1 | MON-01 |
| L-1006 | shipped | 2 | MON-01 |
| L-1006 | shipped | 3 | CAC-02 |

`WITH ORDINALITY` adds the element’s position, starting at 1. Together with the parent key it forms the new grain’s unique key `(order_id, line_no)`. Even two identical lines, like L-1006’s two Monstera lines, stay distinguishable.

#### Why the position must be a column

*SQL · no ORDER BY, no position*

```sql
SELECT u.e ->> 'sku' AS sku
FROM raw_orders,
     UNNEST(CAST(doc -> 'items' AS JSON[])) AS u(e)
WHERE doc ->> 'order_id' = 'L-1001';
```

Result (2 rows):

| sku |
|---|
| POT-12 |
| MON-01 |

JSON arrays are ordered, but SQL result rows are not. Run without `ORDER BY`, this returned the second item first on the build machine. If order matters (first ingredient, step 1 of a funnel, line numbers on an invoice), capture it with `WITH ORDINALITY` and sort by it.

| Engine | Inner form (drops empty / NULL) | Outer form (keeps the parent) | Position |
|---|---|---|---|
| DuckDB | `FROM t, UNNEST(a) AS u(x)` | `LEFT JOIN UNNEST(a) AS u(x) ON true` | `WITH ORDINALITY` (1-based) |
| PostgreSQL | `FROM t, LATERAL jsonb_array_elements(j)` | `LEFT JOIN LATERAL … ON true` | `WITH ORDINALITY` (1-based) |
| Spark SQL | `LATERAL VIEW explode(a)` | `LATERAL VIEW OUTER explode(a)`, `explode_outer` | `posexplode` (0-based) |
| Snowflake | `, LATERAL FLATTEN(input => v)` | `FLATTEN(input => v, OUTER => TRUE)` | `f.index` (0-based) |
| BigQuery | `FROM t, UNNEST(a) AS x` | `LEFT JOIN UNNEST(a) AS x` | `WITH OFFSET` (0-based) |

*Rows other than DuckDB and PostgreSQL are reference syntax, not executed; lessons 17–19 show them in context.*

> **On the job:** “Orders missing from the product report” is the most common incident after a team starts flattening JSON. Reviewers look for the outer form wherever the parent count matters, and for a test that compares the number of distinct parents before and after the unnest.

> **The main idea:** an inner unnest silently drops parents with empty or missing arrays; use the outer form whenever parents must survive, and capture element position as a column.

*Read more:* [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [DuckDB: FROM and LATERAL joins](https://duckdb.org/docs/stable/sql/query_syntax/from), [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html), [Snowflake: FLATTEN](https://docs.snowflake.com/en/sql-reference/functions/flatten), [BigQuery: work with arrays](https://cloud.google.com/bigquery/docs/arrays).

---

<a id="slide-10"></a>
## 10. Arrays of objects and arrays inside arrays

*Part B · how do I reach the tags inside each item?*

Two practical shapes. If the column is still raw **JSON**, cast the array to a list of JSON values (`CAST(doc -> 'items' AS JSON[])`), unnest it, and use `->>` plus a cast on each element. If the column is typed, the elements are STRUCTs and you use dots. For an **array inside an array**, unnest level by level: each `UNNEST` in the FROM clause can read aliases to its left, so the second one unnests the tags of *this* item. The grain becomes one row per order × line × tag.

#### From raw JSON

```sql
SELECT doc ->> 'order_id'                    AS order_id,
       u.n                                   AS line_no,
       u.e ->> 'sku'                         AS sku,
       CAST(u.e ->> 'qty' AS INTEGER)        AS qty
FROM raw_orders,
     UNNEST(CAST(doc -> 'items' AS JSON[])) WITH ORDINALITY AS u(e, n)
WHERE doc ->> 'order_id' IN ('L-1001', 'L-1002')
ORDER BY order_id, line_no;
```

Result (3 rows):

| order_id | line_no | sku | qty |
|---|---|---|---|
| L-1001 | 1 | MON-01 | 1 |
| L-1001 | 2 | POT-12 | 2 |
| L-1002 | 1 | FIC-03 | 2 |

Each element `e` is a JSON object; `"2"` and `2` both cast to 2. This is the shape you use in a bronze-to-silver model before a typed schema exists.

#### Two levels: lines, then tags

```sql
SELECT o.order_id, u.line_no, u.item.sku, t.tag
FROM orders AS o,
     UNNEST(o.items) WITH ORDINALITY AS u(item, line_no),
     UNNEST(u.item.tags) AS t(tag)                -- reads the alias u on its left
WHERE o.order_id IN ('L-1001', 'L-1003', 'L-1006')
ORDER BY o.order_id, u.line_no, t.tag;
```

Result (7 rows):

| order_id | line_no | sku | tag |
|---|---|---|---|
| L-1001 | 1 | MON-01 | indoor |
| L-1001 | 1 | MON-01 | large |
| L-1001 | 2 | POT-12 | ceramic |
| L-1006 | 1 | MON-01 | indoor |
| L-1006 | 1 | MON-01 | large |
| L-1006 | 2 | MON-01 | indoor |
| L-1006 | 2 | MON-01 | large |

L-1001 gives 3 rows (two tags on line 1, one on line 2). L-1006 line 3 has `tags: null` and L-1003’s only line has `tags: []`: both lines vanish, and L-1003 with them. Use the outer form at the inner level too if lines without tags must stay.

#### Shortcut: expand the struct fields into columns

```sql
SELECT *
FROM (SELECT order_id, UNNEST(items, recursive := true)
      FROM orders
      WHERE order_id = 'L-1008')
ORDER BY sku;
```

Result (2 rows):

| order_id | sku | name | qty | unit_price | amount | currency | tags |
|---|---|---|---|---|---|---|---|
| L-1008 | POT-12 | Ceramic pot 12 cm | 1 | NULL | 8.50 | USD | ['ceramic'] |
| L-1008 | SUC-07 | Succulent trio | 4 | NULL | 6.00 | USD | ['outdoor'] |

`UNNEST(list, recursive := true)` unnests the list and spreads the fields of each STRUCT (including the nested `price` struct) into columns. `tags` stays a list. Handy for exploring; in a model, name the columns you want explicitly so a new field doesn’t change the output.

#### Rule of thumb

- One UNNEST per level of nesting, each reading the alias on its left.
- Predict the rows at every level: Σ lines, then Σ tags over lines.
- Decide inner vs outer *per level*.
- Never unnest two *sibling* arrays in the same FROM: lesson 12.

> **On the job:** API payloads are often two or three levels deep: orders → lines → discounts, sessions → events → parameters, products → ingredients → sub-ingredients (the lab). Building one model per level, each with its own unique key, keeps the joins between them obvious and testable.

> **The main idea:** unnest one level at a time, each UNNEST reading the alias on its left; cast raw JSON arrays to JSON[] first; and decide inner vs outer at every level.

*Read more:* [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions).

---

<a id="slide-11"></a>
## 11. Fan-out: parent values repeated on every element

*Part B · why is shipping revenue too high after flattening?*

After an unnest, every **parent-level** value (shipping fee, order total, customer attributes) is repeated once per element. Summing or counting it at the new grain multiplies it by the number of elements: the same **fan-out** that a one-to-many join causes (*SQL correctness: joins, grain, and NULLs*, lessons 6–8). An unnest is a one-to-many join between a row and its own array.

#### ✗ Believable, but wrong

*SQL · believable, but wrong*

```sql
SELECT o.customer.address.city AS city,
       count(*)        AS orders,
       sum(o.shipping) AS shipping
FROM orders AS o, UNNEST(o.items) AS u(item)
WHERE o.status = 'shipped'
GROUP BY city
ORDER BY city;
```

Result (4 rows):

| city | orders | shipping |
|---|---|---|
| Austin | 5 | 24.95 |
| Denver | 2 | 9.98 |
| Seattle | 2 | 9.98 |
| NULL | 2 | 4.99 |

#### ✓ Fixed

*SQL · fixed: order-level measures at order grain*

```sql
SELECT customer.address.city AS city,
       count(*)      AS orders,
       sum(shipping) AS shipping
FROM orders                       -- order grain: shipping lives here
WHERE status = 'shipped'
GROUP BY city
ORDER BY city;
```

Result (4 rows):

| city | orders | shipping |
|---|---|---|
| Austin | 2 | 9.98 |
| Denver | 2 | 9.98 |
| Seattle | 1 | 4.99 |
| NULL | 2 | 4.99 |

#### Reconcile before you trust it

```sql
SELECT (SELECT sum(shipping) FROM orders WHERE status = 'shipped')    AS shipping_at_order_grain,
       (SELECT sum(o.shipping) FROM orders AS o, UNNEST(o.items)
        WHERE o.status = 'shipped')                                AS shipping_after_unnest,
       (SELECT count(DISTINCT o.order_id) FROM orders AS o, UNNEST(o.items)
        WHERE o.status = 'shipped')                                AS distinct_orders;
```

Result (1 row):

| shipping_at_order_grain | shipping_after_unnest | distinct_orders |
|---|---|---|
| 29.94 | 49.90 | 7 |

Shipping on shipped orders is 6 × 4.99 = 29.94 at order grain, and 49.90 after the unnest: each fee is counted once per line. The third column is how you count parents after an unnest: `count(DISTINCT order_id)`, never `count(*)`.

#### Three safe patterns

- **Measure at the grain it belongs to.** Order-level measures come from the order-grain model; line-level measures (qty × price) from the line-grain model.
- **Aggregate the lines first, then join** to the order grain (lesson 12).
- **Don’t create the rows** if the answer is per order: list functions (lesson 7).

If you must allocate a parent value to lines (shipping per line for margin), allocate it explicitly, for example by line value, and test that the allocations sum back to the parent.

> **On the job:** “Revenue in the new product dashboard is 40 % higher than Finance’s number” is this bug in production. The standard defence is a reconciliation test in the model: the sum of each parent measure after flattening equals the sum at parent grain.

> **The main idea:** an unnest is a one-to-many join with the row’s own array; parent-level measures must be summed at parent grain, and parents are counted with COUNT(DISTINCT key).

*Read more:* [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-12"></a>
## 12. Fan-out: two sibling arrays on one parent

*Part B · why are paid amounts doubled for split payments?*

Order L-1006 has 3 items and 2 payments. Unnesting both **sibling arrays** in one FROM clause pairs every item with every payment: 3 × 2 = 6 rows, a **cartesian product** inside each order. Every item amount is counted twice and every payment three times.

#### ✗ Believable, but wrong

*SQL · believable, but wrong*

```sql
SELECT o.order_id,
       sum(i.item.qty * coalesce(i.item.unit_price, i.item.price.amount)) AS items_amount,
       sum(p.pay.amount)                                                  AS paid
FROM orders AS o,
     UNNEST(o.items) AS i(item),
     UNNEST(o.payments) AS p(pay)
WHERE o.order_id IN ('L-1001', 'L-1002', 'L-1006')
GROUP BY o.order_id
ORDER BY o.order_id;
```

Result (3 rows):

| order_id | items_amount | paid |
|---|---|---|
| L-1001 | 46.00 | 101.98 |
| L-1002 | 72.00 | 40.99 |
| L-1006 | 140.00 | 224.97 |

#### ✓ Fixed

*SQL · fixed: one array per CTE, join at order grain*

```sql
WITH line_totals AS (
    SELECT o.order_id, sum(i.item.qty * coalesce(i.item.unit_price, i.item.price.amount)) AS items_amount
    FROM orders AS o, UNNEST(o.items) AS i(item)
    GROUP BY o.order_id),
pay_totals AS (
    SELECT o.order_id, sum(p.pay.amount) AS paid
    FROM orders AS o, UNNEST(o.payments) AS p(pay)
    GROUP BY o.order_id)
SELECT o.order_id, l.items_amount, o.shipping, p.paid,
       l.items_amount + o.shipping = p.paid AS reconciles
FROM orders AS o
JOIN line_totals AS l USING (order_id)
JOIN pay_totals  AS p USING (order_id)
WHERE o.order_id IN ('L-1001', 'L-1002', 'L-1006')
ORDER BY o.order_id;
```

Result (3 rows):

| order_id | items_amount | shipping | paid | reconciles |
|---|---|---|---|---|
| L-1001 | 46.00 | 4.99 | 50.99 | true |
| L-1002 | 36.00 | 4.99 | 40.99 | true |
| L-1006 | 70.00 | 4.99 | 74.99 | true |

Correct values: L-1006 items 70.00 + shipping 4.99 = paid 74.99. The wrong query reports 140.00 and 224.97, and even L-1001, with a single payment, reports 101.98 paid: its payment is repeated once per item. The fix is the pattern from *SQL correctness*: **pre-aggregate each child to the parent grain, then join**. Here the last column proves it on every order.

#### A DuckDB/PostgreSQL trap: UNNEST in the select list zips

*SQL · two UNNESTs in the SELECT list*

```sql
SELECT order_id,
       UNNEST(items).sku       AS sku,
       UNNEST(payments).amount AS payment
FROM orders
WHERE order_id = 'L-1006'
ORDER BY sku, payment;
```

Result (3 rows):

| order_id | sku | payment |
|---|---|---|
| L-1006 | CAC-02 | NULL |
| L-1006 | MON-01 | 4.99 |
| L-1006 | MON-01 | 70.00 |

Several UNNESTs in the SELECT list are paired *by position* (item 1 with payment 1) and padded with NULL. That avoids the multiplication, but the pairs mean nothing: payment 1 does not belong to item 1. Spark refuses two generators in one SELECT. Don’t rely on either behaviour.

#### Re-nest after filtering

*SQL · re-nest: rows back into a list*

```sql
SELECT o.order_id,
       list(u.item.sku ORDER BY u.line_no) AS indoor_skus
FROM orders AS o, UNNEST(o.items) WITH ORDINALITY AS u(item, line_no)
WHERE list_contains(u.item.tags, 'indoor')
GROUP BY o.order_id
ORDER BY o.order_id;
```

Result (5 rows):

| order_id | indoor_skus |
|---|---|
| L-1001 | ['MON-01'] |
| L-1002 | ['FIC-03'] |
| L-1006 | ['MON-01', 'MON-01'] |
| L-1007 | ['FIC-03'] |
| L-1009 | ['CAC-02'] |

`list(x ORDER BY pos)` (or `array_agg`) is the inverse of UNNEST: it collects rows back into one list per parent. Unnest, filter, re-nest is how you answer “which indoor SKUs did each order contain?” and stay at order grain.

> **On the job:** Payloads with several arrays per parent are everywhere: orders with items, payments, and discounts; sessions with events and experiments. A model per array, each aggregated or keyed at its own grain, is the design reviewers expect; one wide “flatten everything” query is the design that produces wrong totals.

> **The main idea:** never unnest two sibling arrays in one FROM: model each array separately, aggregate it to the parent grain, and join the totals.

*Read more:* [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [DuckDB: list functions](https://duckdb.org/docs/stable/sql/functions/list).

---

<a id="slide-13"></a>
## 13. Objects with variable keys: json_each and MAP

*Part B · how do I query properties whose names change per event? (added)*

Some objects are not records with fixed fields but bags of **key/value pairs**: event properties, product attributes, feature flags. Each row has different keys, so you can’t list them as columns. Two tools: `json_each(json)` is a table function that turns an object into one row per key (`key`, `value`, `type`, …); a **MAP** column keeps the pairs in one value you can look up by key.

*SQL · land the events*

```sql
CREATE OR REPLACE TABLE raw_events AS
SELECT json AS doc FROM read_json_objects('data/events.jsonl');
```

```sql
SELECT doc ->> 'event_id' AS event_id,
       doc ->> 'event'    AS event,
       p.key, p.value, p.type
FROM raw_events
LEFT JOIN json_each(doc -> 'props') AS p ON true
ORDER BY event_id, p.key;
```

Result (10 rows):

| event_id | event | key | value | type |
|---|---|---|---|---|
| e1 | page_view | page | "/p/MON-01" | VARCHAR |
| e1 | page_view | utm_source | "instagram" | VARCHAR |
| e2 | add_to_cart | qty | 1 | UBIGINT |
| e2 | add_to_cart | sku | "MON-01" | VARCHAR |
| e3 | search | query | "pet safe" | VARCHAR |
| e3 | search | results | 12 | UBIGINT |
| e4 | page_view | page | "/" | VARCHAR |
| e4 | page_view | utm_campaign | "spring" | VARCHAR |
| e4 | page_view | utm_source | "newsletter" | VARCHAR |
| e5 | page_view | NULL | NULL | NULL |

#### Profile the keys

```sql
SELECT p.key, count(*) AS events, list(DISTINCT p.type) AS json_types
FROM raw_events, json_each(doc -> 'props') AS p
GROUP BY p.key
ORDER BY events DESC, p.key;
```

Result (7 rows):

| key | events | json_types |
|---|---|---|
| page | 2 | ['VARCHAR'] |
| utm_source | 2 | ['VARCHAR'] |
| qty | 1 | ['UBIGINT'] |
| query | 1 | ['VARCHAR'] |
| results | 1 | ['UBIGINT'] |
| sku | 1 | ['VARCHAR'] |
| utm_campaign | 1 | ['VARCHAR'] |

Which keys exist, how often, and with which JSON types: the input for deciding which keys deserve a real column. Event e5 has an empty object, so it adds no keys here (the outer form above kept it).

#### Or keep them in a MAP

```sql
SELECT doc ->> 'event_id' AS event_id,
       CAST(doc -> 'props' AS MAP(VARCHAR, JSON))                AS props,
       CAST(doc -> 'props' AS MAP(VARCHAR, JSON))['utm_source'] ->> '$' AS utm_source
FROM raw_events
ORDER BY event_id;
```

Result (5 rows):

| event_id | props | utm_source |
|---|---|---|
| e1 | {page: '"/p/MON-01"', utm_source: '"instagram"'} | instagram |
| e2 | {sku: '"MON-01"', qty: '1'} | NULL |
| e3 | {query: '"pet safe"', results: '12'} | NULL |
| e4 | {page: '"/"', utm_source: '"newsletter"', utm_campaign: '"spring"'} | newsletter |
| e5 | {} | NULL |

`m['key']` looks a key up; a missing key gives NULL. In the result, the MAP is shown with its JSON values. Spark, BigQuery, and Snowflake have the same idea: `MAP` / `explode(map)`, `JSON_KEYS`, `FLATTEN` on an object (lesson 19).

> **On the job:** Product analytics events (Google Analytics 4, Segment, Amplitude exports) carry parameters as variable keys. The usual model is a long table, one row per event × parameter, plus a handful of promoted columns (utm_source, page) for the keys every query uses.

> **The main idea:** when keys are data, turn them into rows with json_each (or keep a MAP), profile them, and promote only the frequent keys to typed columns.

*Read more:* [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [DuckDB: MAP](https://duckdb.org/docs/stable/sql/data_types/map).

---

<a id="slide-14"></a>
## 14. Missing key, JSON null, empty array: four different states

*Part C · is “no tags” the same as “tags unknown”?*

A field in a JSON document can be in four states: it has a value; it is **empty** (`[]`, `{}`, `""`); it is **JSON null** (the key is there, the value is `null`); or it is **missing** (the key isn’t there at all). SQL has one NULL, so the operators collapse some of these states. Know which ones.

```sql
SELECT label,
       doc -> 'tags'                    AS arrow,
       doc ->> 'tags'                   AS arrow_text,
       json_exists(doc, '$.tags')       AS key_exists,
       json_type(doc, '$.tags')         AS json_type,
       json_array_length(doc, '$.tags') AS json_len,
       len(json_transform(doc, '{"tags": ["VARCHAR"]}').tags) AS typed_len
FROM (VALUES (1, 'has values', '{"tags": ["indoor"]}'::JSON),
             (2, 'empty',      '{"tags": []}'::JSON),
             (3, 'JSON null',  '{"tags": null}'::JSON),
             (4, 'missing',    '{}'::JSON)) AS t(n, label, doc)
ORDER BY n;
```

Result (4 rows):

| label | arrow | arrow_text | key_exists | json_type | json_len | typed_len |
|---|---|---|---|---|---|---|
| has values | ["indoor"] | ["indoor"] | true | ARRAY | 1 | 1 |
| empty | [] | [] | true | ARRAY | 0 | 0 |
| JSON null | null | NULL | true | NULL | 0 | NULL |
| missing | NULL | NULL | false | NULL | NULL | NULL |

#### What the columns show

- `->` keeps JSON null as the JSON value `null`, but returns SQL NULL for a missing key: the only arrow that tells them apart.
- `->>` and every typed path (casts, `json_transform`, `read_json` columns) turn both into SQL NULL.
- `json_exists` and `json_type` (`'NULL'` vs SQL NULL) distinguish them explicitly.
- `json_array_length` returns 0 for JSON null (and for any non-array), so it can’t tell empty from null on its own: check `json_type` first.
- An empty array survives typing as a list of length 0; JSON null and missing become a NULL list.

#### Classify before you type

```sql
SELECT doc ->> 'order_id' AS order_id,
       CASE WHEN NOT json_exists(doc, '$.items')       THEN 'missing'
            WHEN json_type(doc, '$.items') = 'NULL'    THEN 'JSON null'
            WHEN json_array_length(doc, '$.items') = 0 THEN 'empty'
            ELSE 'has values' END                      AS items_state,
       CASE WHEN NOT json_exists(doc, '$.customer.address')          THEN 'missing'
            WHEN json_type(doc, '$.customer.address') = 'NULL'       THEN 'JSON null'
            WHEN NOT json_exists(doc, '$.customer.address.city')     THEN 'no city key'
            ELSE 'has city' END                        AS address_state
FROM raw_orders
WHERE doc ->> 'order_id' IN ('L-1003', 'L-1004', 'L-1005', 'L-1009')
ORDER BY order_id;
```

Result (4 rows):

| order_id | items_state | address_state |
|---|---|---|
| L-1003 | has values | no city key |
| L-1004 | empty | has city |
| L-1005 | missing | JSON null |
| L-1009 | has values | missing |

The same checks on the Leafy documents. Typed columns can’t show the difference later, so if it matters, compute a state column from the raw JSON in the staging model.

#### Decide a policy per field

| State | Usual meaning | Typical treatment |
|---|---|---|
| missing | not sent: unknown, or an older API version | NULL; count it; investigate if it was required |
| JSON null | sent, deliberately without a value | NULL; keep a flag if “cleared” matters (updates, PATCH APIs) |
| empty | known to have none | 0 for counts, no rows after an inner unnest |
| has values | normal | cast and use |

#### Pitfalls

- `COALESCE(len(tags), 0)` reports “unknown” as “none”. Fine for a count of tags on a product page; wrong for a data-quality metric.
- `AVG(sugars)` skips NULLs, so products with no sugar value silently leave the denominator (the lab handles it).
- Some sources send `""` or `"null"` as text: treat them in the same CASE.

In PostgreSQL the same distinctions are `j ? 'tags'` and `jsonb_typeof` (lesson 18); Snowflake has `IS_NULL_VALUE`; Spark’s `from_json` gives NULL for both.

> **On the job:** Update feeds and CDC payloads often use JSON null to mean “this field was cleared” and a missing key to mean “unchanged”. Merging them as if they were the same overwrites good data with NULL. A state column computed from the raw JSON makes the difference testable.

> **The main idea:** missing, JSON null, and empty are three different facts; -> and json_exists / json_type can tell them apart, typed columns can’t, so decide the policy per field before you cast.

*Read more:* [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259).

---

<a id="slide-15"></a>
## 15. Drifting schemas: profile, then reconcile versions

*Part C · the API changed: how would I even notice?*

**Schema drift** is a change in the shape of incoming documents: a field is added, removed, renamed, or starts arriving with another type. JSON accepts all of it silently, and a declared schema turns the renamed field into NULL without an error (lesson 6). You notice drift only if you look for it: profile the keys, compare with what you expect, and make the model handle every version explicitly.

#### 1 · Profile the keys by version

```sql
SELECT coalesce(doc ->> 'api_version', '1') AS api_version,
       k.key                                 AS item_key,
       count(*)                              AS item_lines,
       list(DISTINCT k.type ORDER BY k.type) AS json_types
FROM raw_orders,
     UNNEST(CAST(doc -> 'items' AS JSON[])) AS u(e),
     json_each(u.e) AS k
GROUP BY ALL
ORDER BY api_version, item_key;
```

Result (10 rows):

| api_version | item_key | item_lines | json_types |
|---|---|---|---|
| 1 | name | 7 | ['VARCHAR'] |
| 1 | qty | 7 | ['UBIGINT', 'VARCHAR'] |
| 1 | sku | 7 | ['VARCHAR'] |
| 1 | tags | 7 | ['ARRAY', 'NULL'] |
| 1 | unit_price | 7 | ['DOUBLE'] |
| 2 | name | 4 | ['VARCHAR'] |
| 2 | price | 4 | ['OBJECT'] |
| 2 | qty | 4 | ['UBIGINT'] |
| 2 | sku | 4 | ['VARCHAR'] |
| 2 | tags | 4 | ['ARRAY'] |

`unit_price` exists only in v1 lines and `price` only in v2: a rename. `qty` arrives as a number and once as a string (`VARCHAR`): a type wobble the cast absorbs.

#### 2 · Or ask for the merged structure

```sql
SELECT json_group_structure(doc -> 'items') AS merged_items_structure
FROM raw_orders;
```

Result (1 row):

| merged_items_structure |
|---|
| [{"sku":"VARCHAR","name":"VARCHAR","qty":"JSON","unit_price":"DOUBLE","tags":["VARCHAR"],"price":{"amount":"JSON","currency":"VARCHAR"}}] |

`json_group_structure` merges the shape of every value into one JSON template. A leaf typed `"JSON"` means the values disagree; both price shapes appear side by side. Good for a first look at an unfamiliar feed.

#### 3 · Alert on keys you have never seen

```sql
SELECT k.key AS unexpected_top_level_key, count(*) AS documents,
       list(doc ->> 'order_id' ORDER BY doc ->> 'order_id') AS order_ids
FROM raw_orders, json_each(doc) AS k
WHERE k.key NOT IN ('order_id', 'placed_at', 'status', 'customer', 'items', 'shipping', 'payments', 'api_version')
GROUP BY k.key
ORDER BY k.key;
```

Result (1 row):

| unexpected_top_level_key | documents | order_ids |
|---|---|---|
| gift | 1 | ['L-1007'] |

An allow-list of expected keys turns “the source added `gift`” into a failing check instead of a surprise. Unknown keys are not errors; they are questions for the source team.

#### 4 · Handle each version, then prove it

```sql
SELECT coalesce(o.api_version, 1)                               AS api_version,
       count(*)                                                    AS lines,
       count(i.item.unit_price)                                    AS v1_price,
       count(i.item.price.amount)                                  AS v2_price,
       count(coalesce(i.item.unit_price, i.item.price.amount))     AS unified_price,
       count(*) FILTER (WHERE i.item.price.currency <> 'USD')      AS non_usd
FROM orders AS o, UNNEST(o.items) AS i(item)
GROUP BY ALL
ORDER BY api_version;
```

Result (2 rows):

| api_version | lines | v1_price | v2_price | unified_price | non_usd |
|---|---|---|---|---|---|
| 1 | 7 | 7 | 0 | 7 | 0 |
| 2 | 4 | 0 | 4 | 4 | 0 |

The unified price is filled on every line of both versions, and no line has a non-USD currency. That proof is a test: “count of lines with no unified price = 0”. When v3 arrives, this test fails first.

> **On the job:** Drift is the most common cause of “the dashboard went to zero overnight”. Teams defend against it with three habits: keep the raw JSON (so nothing is lost and you can backfill), profile keys and types on each load, and write contract tests that fail on unknown keys, missing required keys, and cast failures. In dbt this is a source freshness check plus tests on the staging model; in Databricks, Auto Loader’s schema hints and rescued-data column play the same role.

> **The main idea:** drift is silent in JSON; profile keys and types per version, alert on unknown keys, coalesce the versions explicitly, and test that the unified field is never NULL.

*Read more:* [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [DuckDB: loading JSON (read_json)](https://duckdb.org/docs/stable/data/json/loading_json), [Spark SQL: JSON files](https://spark.apache.org/docs/latest/sql-data-sources-json.html).

---

<a id="slide-16"></a>
## 16. Safe typed staging: TRY_CAST, quarantine, and contract checks

*Part C · how do I type messy JSON without losing or hiding rows?*

Put the lessons together into the pattern used in production. Keep the **raw** JSON. Build a **typed staging** model that casts every field with `TRY_CAST` (so one bad value doesn’t fail the whole load) and keeps the raw element next to the typed columns. Route rows whose casts failed to a **quarantine** (a table or view of rejected rows with the reason). Run **contract checks**: tests that fail when the data breaks the agreed shape. A new daily file arrives with three problems:

```json
# data/orders_2026-03-07.jsonl
{"api_version": 2, "order_id": "L-1010", "placed_at": "2026-03-07T10:00:00Z", "status": "shipped", "customer": {"id": "C-08", "country": "DE"}, "items": [{"sku": "MON-01", "qty": "two", "price": {"amount": 29.0, "currency": "USD"}}, {"sku": "POT-12", "qty": 1, "price": {"amount": "8,50", "currency": "EUR"}}], "shipping": 4.99, "payments": [{"method": "card", "amount": 42.49}], "discounts": [{"code": "SPRING10", "amount": 3.0}]}
```

#### Typed staging

*SQL · staging with TRY_CAST*

```sql
CREATE OR REPLACE TABLE stg_order_lines AS
SELECT doc ->> 'order_id'                                              AS order_id,
       u.n                                                             AS line_no,
       u.e ->> 'sku'                                                   AS sku,
       TRY_CAST(u.e ->> 'qty' AS INTEGER)                              AS qty,
       TRY_CAST(coalesce(u.e ->> 'unit_price', u.e ->> '$.price.amount')
                AS DECIMAL(10, 2))                                     AS unit_price,
       coalesce(u.e ->> '$.price.currency', 'USD')                     AS currency,
       u.e                                                             AS raw_line   -- keep the evidence
FROM read_json_objects('data/orders*.jsonl') AS r(doc),
     UNNEST(CAST(doc -> 'items' AS JSON[])) WITH ORDINALITY AS u(e, n);
```

One row per order line, from every file matching the glob. `TRY_CAST` turns `"two"` and `"8,50"` (a European decimal comma) into NULL instead of an error.

#### Quarantine: what failed, with the evidence

```sql
SELECT order_id, line_no, raw_line,
       concat_ws(', ',
         CASE WHEN qty IS NULL        THEN 'qty not an integer' END,
         CASE WHEN unit_price IS NULL THEN 'price not a decimal' END,
         CASE WHEN currency <> 'USD'  THEN 'currency ' || currency END) AS reasons
FROM stg_order_lines
WHERE qty IS NULL OR unit_price IS NULL OR currency <> 'USD'
ORDER BY order_id, line_no;
```

Result (2 rows):

| order_id | line_no | raw_line | reasons |
|---|---|---|---|
| L-1010 | 1 | {"sku":"MON-01","qty":"two","price":{"amount":29.0,"currency":"USD"}} | qty not an integer |
| L-1010 | 2 | {"sku":"POT-12","qty":1,"price":{"amount":"8,50","currency":"EUR"}} | price not a decimal, currency EUR |

#### Contract checks

```sql
SELECT 'unique (order_id, line_no)' AS test,
       count(*) - count(DISTINCT (order_id, line_no)) AS failures FROM stg_order_lines
UNION ALL
SELECT 'cast failures (TRY_CAST gave NULL)',
       count(*) FILTER (WHERE qty IS NULL OR unit_price IS NULL) FROM stg_order_lines
UNION ALL
SELECT 'unknown top-level keys',
       count(*) FROM read_json_objects('data/orders*.jsonl') AS r(doc), json_each(doc) AS k
       WHERE k.key NOT IN ('order_id', 'placed_at', 'status', 'customer', 'items',
                           'shipping', 'payments', 'api_version', 'gift')
ORDER BY test;
```

Result (3 rows):

| test | failures |
|---|---|
| cast failures (TRY_CAST gave NULL) | 2 |
| unique (order_id, line_no) | 0 |
| unknown top-level keys | 1 |

Zero means pass. Two cast failures and one unknown key (`discounts`, an array nobody models yet, which may change revenue) must reach a human before the numbers are published.

#### Why not just CAST, or ignore errors?

- Plain `CAST` fails the whole load for one bad line: safe, but one partner’s typo stops every report.
- `TRY_CAST` without a count hides bad data as NULL: the worst of both.
- `read_json(…, ignore_errors = true)` drops or nulls bad records with no record of which (*Python files and streams*).
- TRY_CAST *plus* quarantine *plus* a failing test is safe and visible.

**Repeated parsing costs money:** engines re-parse JSON text on every query. Type it once in staging and store it as Parquet or Delta; query the typed table.

> **On the job:** This is the bronze → silver step of a medallion lakehouse, or the staging layer in dbt: raw JSON in, typed columns out, a quarantine for rejects, and tests (unique keys, accepted values, “no cast failures”, “no unknown keys”) that run on every load and page someone when they fail.

> **The main idea:** keep the raw JSON, cast with TRY_CAST, quarantine what failed with its evidence, and let contract tests stop bad loads from reaching reports.

*Read more:* [DuckDB: CAST and TRY_CAST](https://duckdb.org/docs/stable/sql/expressions/cast), [DuckDB: loading JSON (read_json)](https://duckdb.org/docs/stable/data/json/loading_json), [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions).

---

<a id="slide-17"></a>
## 17. Same task, five engines: extract and cast

*Part D · what changes when I leave DuckDB?*

Every engine has the same three ideas: a type for documents, a path to reach a value, and an explicit cast. The spelling differs, and so do two details that cause bugs: whether the extracted value is still JSON (quotes kept) or already text, and how keys with special characters are quoted. One task across engines: *the city of the customer as text, and the first line’s quantity as an integer*.

| Engine | Document type | City as text | Quantity as integer | Hyphenated key |
|---|---|---|---|---|
| DuckDB | `JSON` | `doc ->> '$.customer.address.city'` | `CAST(doc ->> '$.items[0].qty' AS INTEGER)` | `'$."energy-kcal_100g"'` (hyphen also works unquoted) |
| PostgreSQL | `jsonb` (prefer it to `json`) | `doc #>> '{customer,address,city}'` or `doc -> 'customer' -> 'address' ->> 'city'` | `(doc -> 'items' -> 0 ->> 'qty')::int` | `doc ->> 'energy-kcal_100g'` (a key is just a string) |
| Spark SQL | `STRING` + `from_json` schema; Spark 4: `VARIANT` | `get_json_object(doc, '$.customer.address.city')` | `try_cast(get_json_object(doc, '$.items[0].qty') AS INT)` | struct field in backticks: `` n.`energy-kcal_100g` `` |
| Snowflake | `VARIANT` | `doc:customer.address.city::STRING` | `TRY_TO_NUMBER(doc:items[0].qty::STRING)` | `doc:nutriments:"energy-kcal_100g"` |
| BigQuery | `JSON` or `STRING` | `JSON_VALUE(doc, '$.customer.address.city')` | `SAFE_CAST(JSON_VALUE(doc, '$.items[0].qty') AS INT64)` | `'$.nutriments."energy-kcal_100g"'` |
| T-SQL / Fabric Warehouse | `NVARCHAR(MAX)` / `VARCHAR(MAX)` text | `JSON_VALUE(doc, '$.customer.address.city')` | `TRY_CAST(JSON_VALUE(doc, '$.items[0].qty') AS INT)` | `'$."energy-kcal_100g"'` |

*DuckDB and PostgreSQL rows were executed in this deck (lessons 4–5 and 18); the other rows are reference syntax from the linked documentation, not executed.*

#### Where to look it up

| Engine | Page to bookmark | Search for |
|---|---|---|
| DuckDB | [JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest) | `->>`, `json_transform`, `read_json`, `WITH ORDINALITY` |
| PostgreSQL | [JSON functions and operators](https://www.postgresql.org/docs/current/functions-json.html) | `jsonb_array_elements`, `jsonb_path_query`, `?` |
| Spark SQL | [built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html), [LATERAL VIEW](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-lateral-view.html) | `from_json`, `explode_outer`, `posexplode` |
| Snowflake | [querying semi-structured data](https://docs.snowflake.com/en/user-guide/querying-semistructured), [FLATTEN](https://docs.snowflake.com/en/sql-reference/functions/flatten) | `OUTER => TRUE`, `IS_NULL_VALUE`, `TRY_TO_*` |
| BigQuery | [work with arrays](https://cloud.google.com/bigquery/docs/arrays), [JSON functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions) | `LEFT JOIN UNNEST`, `WITH OFFSET`, `JSON_QUERY_ARRAY` |
| T-SQL / Fabric | [OPENJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql), [JSON_VALUE](https://learn.microsoft.com/en-us/sql/t-sql/functions/json-value-transact-sql), [Fabric surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area) | `OUTER APPLY OPENJSON`, lax vs strict paths |

#### Differences that change results

- **JSON or text?** DuckDB `->`, PostgreSQL `->`, BigQuery `JSON_QUERY`, and a Snowflake path without `::STRING` return JSON: a string keeps its quotes. Use the text form for comparisons and joins.
- **Positions:** JSON paths are 0-based everywhere; DuckDB lists and ordinality are 1-based; Spark `posexplode`, Snowflake `index`, BigQuery `OFFSET`, and T-SQL `OPENJSON` keys are 0-based.
- **Bad values:** a failed cast is an error in DuckDB, PostgreSQL, and Snowflake `::`; use `TRY_CAST` / `TRY_TO_*` / `SAFE_CAST` / `try_cast`. Spark with ANSI mode on (the default in Spark 4) also raises.
- **Lax paths:** T-SQL `JSON_VALUE` returns NULL for a missing path (lax mode) unless you write `strict`.

> **On the job:** Interviews for Snowflake, Databricks, or BigQuery shops ask for the syntax of their engine, but they score whether you know the semantics: text vs JSON, inner vs outer, 0- vs 1-based, and safe casts. Learn those once and look the spelling up in the pages above.

> **The main idea:** the ideas are the same everywhere (document type, path, explicit cast); check three details per engine: JSON-or-text results, 0- or 1-based positions, and how failed casts behave.

*Read more:* [PostgreSQL: JSON functions and operators](https://www.postgresql.org/docs/current/functions-json.html), [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html), [Snowflake: querying semi-structured data](https://docs.snowflake.com/en/user-guide/querying-semistructured), [BigQuery: JSON functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions), [T-SQL: JSON_VALUE](https://learn.microsoft.com/en-us/sql/t-sql/functions/json-value-transact-sql).

---

<a id="slide-18"></a>
## 18. PostgreSQL JSONB, executed

*Part D · the same ideas in PostgreSQL, run for real (added)*

PostgreSQL has two JSON types: `json` stores the text as given, **`jsonb`** stores a parsed binary form (keys de-duplicated and reordered, indexable). Use `jsonb`. The nine Leafy documents were inserted into `raw_orders(doc jsonb)` in a real PostgreSQL 18.3 (PGlite), and every result below is real.

*SQL · PostgreSQL (executed in PGlite)*

```sql
SELECT doc ->> 'order_id'                           AS order_id,
       doc #>> '{customer,address,city}'             AS city,
       (doc -> 'items' -> 0 ->> 'qty')::int          AS first_qty,
       doc ? 'items'                                 AS has_items_key,
       jsonb_typeof(doc -> 'customer' -> 'address')  AS address_type,
       (doc -> 'customer' -> 'address')::text        AS address_json
FROM raw_orders
WHERE doc ->> 'order_id' IN ('L-1002', 'L-1004', 'L-1005', 'L-1009')
ORDER BY order_id;
```

Result (4 rows):

| order_id | city | first_qty | has_items_key | address_type | address_json |
|---|---|---|---|---|---|
| L-1002 | Denver | 2 | true | object | {"zip": "80202", "city": "Denver"} |
| L-1004 | Austin | NULL | true | object | {"zip": "78701", "city": "Austin"} |
| L-1005 | NULL | NULL | false | null | null |
| L-1009 | NULL | 2 | true | NULL | NULL |

#### Read it

- `->` / `->>` behave like DuckDB; `#>>` takes a path as a text array.
- `?` tests whether a key exists; `jsonb_typeof` returns `'null'` for JSON null and SQL NULL for a missing key (L-1005 vs L-1009).
- `jsonb` printed the address keys reordered (`zip` before `city`): never rely on key order.

#### Inner vs outer, same counts as DuckDB

*SQL · PostgreSQL (executed in PGlite)*

```sql
SELECT 'inner' AS form, count(*) AS row_count, count(DISTINCT doc ->> 'order_id') AS order_count
FROM raw_orders, LATERAL jsonb_array_elements(doc -> 'items') AS e(item)
UNION ALL
SELECT 'outer', count(*), count(DISTINCT doc ->> 'order_id')
FROM raw_orders
LEFT JOIN LATERAL jsonb_array_elements(doc -> 'items') WITH ORDINALITY AS e(item, line_no) ON true
ORDER BY form;
```

Result (2 rows):

| form | row_count | order_count |
|---|---|---|
| inner | 11 | 7 |
| outer | 13 | 9 |

`jsonb_array_elements` is the set-returning function that unnests a JSON array; `LATERAL` lets it read `doc`; `LEFT JOIN LATERAL … ON true` keeps the parents. Same 11 / 13 rows as lesson 9.

#### A PostgreSQL-specific failure

*SQL · PostgreSQL · believable, but fails*

```sql
SELECT doc ->> 'order_id' AS order_id, t.tag
FROM raw_orders,
     LATERAL jsonb_array_elements(doc -> 'items') AS e(item),
     LATERAL jsonb_array_elements_text(e.item -> 'tags') AS t(tag)
ORDER BY 1, 2;
```

Error (expected):

```text
ERROR: cannot extract elements from a scalar
```

L-1006 has a line with `"tags": null`. A JSON null is a *scalar*, and `jsonb_array_elements` raises an error on anything that is not an array (a missing key, SQL NULL, simply returns no rows). DuckDB returned no rows for the same data.

#### Fix: let a JSON path skip what isn’t there

*SQL · PostgreSQL · fixed with a JSON path filter*

```sql
SELECT doc ->> 'order_id' AS order_id, t.tag #>> '{}' AS tag
FROM raw_orders,
     LATERAL jsonb_path_query(doc, '$.items[*].tags[*] ? (@.type() == "string")') AS t(tag)
WHERE doc ->> 'order_id' IN ('L-1003', 'L-1006')
ORDER BY 1, 2;
```

Result (4 rows):

| order_id | tag |
|---|---|
| L-1006 | indoor |
| L-1006 | indoor |
| L-1006 | large |
| L-1006 | large |

`jsonb_path_query` walks a SQL/JSON path in *lax* mode: missing keys and empty arrays produce no rows instead of errors, and the filter `? (@.type() == "string")` drops the JSON null. `#>> '{}'` turns a JSON string into text. Alternatives: `CASE WHEN jsonb_typeof(x) = 'array' THEN x ELSE '[]' END`.

> **On the job:** PostgreSQL is a common source system: application tables with a jsonb “attributes” or “metadata” column. Extracting typed columns from it in the replica or in the warehouse load is everyday work, and GIN indexes on jsonb (`@>`, `?`) are what make filtering on it fast in the source.

> **The main idea:** in PostgreSQL use jsonb, ->> and #>> for text, ? and jsonb_typeof for missing vs null, LEFT JOIN LATERAL for outer unnests, and a JSON path when an array might be null.

*Read more:* [PostgreSQL: JSON functions and operators](https://www.postgresql.org/docs/current/functions-json.html), [PostgreSQL: JSON types](https://www.postgresql.org/docs/current/datatype-json.html), [PostgreSQL: table expressions (LATERAL)](https://www.postgresql.org/docs/current/queries-table-expressions.html), [PGlite documentation](https://pglite.dev/docs/).

---

<a id="slide-19"></a>
## 19. Spark SQL, Snowflake, BigQuery, and T-SQL: the same order lines

*Part D · how do I port the outer unnest with types and position?*

One task, five spellings: *one row per order line, typed quantity and unified price, line numbers from 1, and orders without lines kept*. The DuckDB query ran; the other four are reference ports written from the official documentation, **not executed**. Use the DuckDB result (13 rows, 9 orders) as the expected output when you run a port.

**Spark SQL**

*Spark SQL (reference, not executed):*

```sql
-- raw_orders(doc STRING); quantities are sometimes strings, so read them as STRING and try_cast
WITH parsed AS (
  SELECT from_json(doc, 'order_id STRING,
           items ARRAY<STRUCT<sku: STRING, qty: STRING, unit_price: DECIMAL(10,2),
                              price: STRUCT<amount: STRING, currency: STRING>>>') AS o
  FROM raw_orders
)
SELECT o.order_id,
       pos + 1                                                   AS line_no,   -- posexplode is 0-based
       item.sku,
       try_cast(item.qty AS INT)                                 AS qty,
       coalesce(item.unit_price, try_cast(item.price.amount AS DECIMAL(10,2))) AS unit_price
FROM parsed
LATERAL VIEW OUTER posexplode(o.items) x AS pos, item       -- OUTER keeps orders with no items
ORDER BY o.order_id, line_no;
```

**Snowflake**

*Snowflake (reference, not executed):*

```sql
-- raw_orders(doc VARIANT)
SELECT r.doc:order_id::STRING                                           AS order_id,
       f.index + 1                                                      AS line_no,   -- 0-based
       f.value:sku::STRING                                              AS sku,
       TRY_TO_NUMBER(f.value:qty::STRING)                               AS qty,
       COALESCE(TRY_TO_DECIMAL(f.value:unit_price::STRING, 10, 2),
                TRY_TO_DECIMAL(f.value:price.amount::STRING, 10, 2))    AS unit_price
FROM raw_orders AS r,
     LATERAL FLATTEN(input => r.doc:items, OUTER => TRUE) AS f
ORDER BY order_id, line_no;
```

**BigQuery**

*BigQuery (reference, not executed):*

```sql
-- raw_orders(doc JSON)
SELECT JSON_VALUE(r.doc, '$.order_id')                                  AS order_id,
       pos + 1                                                          AS line_no,   -- 0-based
       JSON_VALUE(item, '$.sku')                                        AS sku,
       SAFE_CAST(JSON_VALUE(item, '$.qty') AS INT64)                    AS qty,
       COALESCE(SAFE_CAST(JSON_VALUE(item, '$.unit_price') AS NUMERIC),
                SAFE_CAST(JSON_VALUE(item, '$.price.amount') AS NUMERIC)) AS unit_price
FROM raw_orders AS r
LEFT JOIN UNNEST(JSON_QUERY_ARRAY(r.doc, '$.items')) AS item WITH OFFSET AS pos
ORDER BY order_id, line_no;
```

**T-SQL / Fabric**

*T-SQL (reference, not executed):*

```sql
-- raw_orders(doc NVARCHAR(MAX)); Fabric Warehouse: VARCHAR(MAX)
SELECT JSON_VALUE(r.doc, '$.order_id')                                  AS order_id,
       CAST(i.[key] AS INT) + 1                                         AS line_no,   -- 0-based key
       JSON_VALUE(i.[value], '$.sku')                                   AS sku,
       TRY_CAST(JSON_VALUE(i.[value], '$.qty') AS INT)                  AS qty,
       COALESCE(TRY_CAST(JSON_VALUE(i.[value], '$.unit_price') AS DECIMAL(10, 2)),
                TRY_CAST(JSON_VALUE(i.[value], '$.price.amount') AS DECIMAL(10, 2))) AS unit_price
FROM raw_orders AS r
OUTER APPLY OPENJSON(r.doc, '$.items') AS i        -- OUTER APPLY keeps orders with no items
ORDER BY order_id, line_no;
```

#### What each port had to change

- **Spark:** the schema is a `from_json` DDL string; `OUTER` in `LATERAL VIEW` (or `explode_outer`) keeps empty arrays; only one generator per SELECT; `explode` on a MAP gives `key`, `value`.
- **Snowflake:** `:` paths on VARIANT, `::` casts, `FLATTEN` returns `value`, `index`, `key`, `path`; `OUTER => TRUE`; `RECURSIVE => TRUE` walks every level.
- **BigQuery:** a comma before `UNNEST` is an inner join; `LEFT JOIN UNNEST` keeps parents; `JSON_QUERY_ARRAY` turns a JSON array into an ARRAY you can unnest.
- **T-SQL:** `OPENJSON` returns `key`, `value`, `type`; `CROSS APPLY` is inner, `OUTER APPLY` keeps parents. Fabric Warehouse uses the same T-SQL JSON functions; check its surface-area page for limits.

#### The expected result

*SQL · DuckDB (executed): the result every port must reproduce*

```sql
SELECT o.order_id, u.line_no, u.item.sku, u.item.qty,
       coalesce(u.item.unit_price, u.item.price.amount) AS unit_price
FROM orders AS o
LEFT JOIN UNNEST(o.items) WITH ORDINALITY AS u(item, line_no) ON true
ORDER BY o.order_id, u.line_no;
```

Result (13 rows):

| order_id | line_no | sku | qty | unit_price |
|---|---|---|---|---|
| L-1001 | 1 | MON-01 | 1 | 29.00 |
| L-1001 | 2 | POT-12 | 2 | 8.50 |
| L-1002 | 1 | FIC-03 | 2 | 18.00 |
| L-1003 | 1 | SUC-07 | 3 | 6.00 |
| L-1004 | NULL | NULL | NULL | NULL |
| L-1005 | NULL | NULL | NULL | NULL |
| L-1006 | 1 | MON-01 | 1 | 29.00 |
| L-1006 | 2 | MON-01 | 1 | 29.00 |
| L-1006 | 3 | CAC-02 | 1 | 12.00 |
| L-1007 | 1 | FIC-03 | 1 | 18.00 |
| L-1008 | 1 | POT-12 | 1 | 8.50 |
| L-1008 | 2 | SUC-07 | 4 | 6.00 |
| L-1009 | 1 | CAC-02 | 2 | 12.00 |

> **On the job:** Porting is a normal week-one task: a prototype in DuckDB or a notebook becomes a dbt model on Snowflake or a Spark job in Fabric or Databricks. Port with the expected result in hand, and re-test the three edge cases first: an empty array, a missing array, and a value that fails to cast.

> **The main idea:** every engine has an outer unnest and a safe cast under a different name; port with the executed result as the expected output and test empty, missing, and bad values first.

*Read more:* [Spark SQL: LATERAL VIEW](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-lateral-view.html), [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html), [Snowflake: FLATTEN](https://docs.snowflake.com/en/sql-reference/functions/flatten), [BigQuery: work with arrays](https://cloud.google.com/bigquery/docs/arrays), [T-SQL: OPENJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql), [Fabric Warehouse: T-SQL surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area).

---

<a id="slide-20"></a>
## 20. Interview patterns: which tool for which JSON question

*Part D · how do I recognise what the question needs?*

Semi-structured questions in interviews come in a few recognisable shapes. Name the output grain first; the tool follows from it.

| If the question says… | Reach for | Watch out for | Lesson |
|---|---|---|---|
| “Get the customer’s city / the status from this JSON column” | `->>` or a typed path, then a cast | JSON-vs-text results, precedence, case-sensitive keys | 4–5 |
| “Flatten the items into one row per item” | UNNEST / FLATTEN / EXPLODE in the FROM clause | Empty and NULL arrays drop parents: outer form | 8–9 |
| “How many orders contain X?” / “orders with more than 2 lines” | List functions or COUNT(DISTINCT parent) | COUNT(*) after an unnest counts elements | 7, 11 |
| “Total shipping (or order value) by product” | Measure at its own grain; allocate explicitly | Parent value repeated per element | 11 |
| “Show items and payments for each order” | One CTE per array, aggregate, join at parent grain | Cartesian product of sibling arrays | 12 |
| “Nested arrays: tags inside items” | One UNNEST per level, each reading the alias to its left | Inner vs outer at every level | 10 |
| “First / last element”, “keep the order” | `WITH ORDINALITY`, `posexplode`, `WITH OFFSET`, `index` | 0- vs 1-based | 9, 17 |
| “Event properties have different keys” | `json_each`, MAP, `FLATTEN` on an object | Values are JSON: cast after | 13 |
| “The source added / renamed a field” | Raw landing, key profiling, coalesce versions, contract tests | Declared schemas NULL renamed fields silently | 15–16 |

1. **Grain** (say it aloud): What does one output row represent: an order, a line, a tag?
2. **Shape** (extract or unnest): One value per parent → extract or list functions; one row per element → unnest.
3. **Emptiness** (inner or outer): Must parents with empty or missing arrays survive?
4. **Types** (cast explicitly): ->> then CAST / TRY_CAST; DECIMAL for money.
5. **Prove it** (counts and sums): Predicted rows, distinct parents, parent totals reconcile.

> **On the job:** The five-step routine is also how you review someone else’s flattening model: ask for the grain, the outer/inner decision, the casts, and the reconciliation test, in that order.

> **The main idea:** say the grain, choose extract vs unnest, decide inner vs outer, cast explicitly, and prove the counts: that order answers almost every JSON question.

---

<a id="slide-21"></a>
## 21. Lab: products per ingredient from Open Food Facts–shaped JSONL

*Lab · the task, the data, and the plan*

**Task:** from a JSONL export of packaged foods, build (1) a product table with **typed nutriments** per 100 g, (2) one row per **ingredient** occurrence including sub-ingredients, and (3) the number of **distinct products per ingredient**, without fan-out, without losing products, and with every bad value accounted for. About an hour; everything runs offline in DuckDB.

**The data** has the real shape of an [Open Food Facts export](https://world.openfoodfacts.org/data) (keys such as `nutriments.energy-kcal_100g`, `ingredients[].id`, nested `ingredients`, `last_modified_t`), but the 11 products are invented: no real download is needed or used. Planted traps: a product repeated by a later delta file, numbers sent as strings (`"24"`) and with a decimal comma (`"20,5"`), a JSON `null` energy with a kJ value present, a missing fibre key, an empty `nutriments` object, an empty and a missing `ingredients` array, and sugar listed twice in one product (top level and inside chocolate chips).

#### One product, as delivered

```python
import json
with open("sql-semi-structured-lab/data/off_products.jsonl", encoding="utf-8") as f:
    products = [json.loads(line) for line in f]
print(len(products), "lines,", len({p["code"] for p in products}), "distinct codes")
cookies = products[1]
print({k: cookies[k] for k in ("code", "product_name", "nova_group")})
print("nutriments:", cookies["nutriments"])
for ing in cookies["ingredients"]:
    print("  ", {k: v for k, v in ing.items() if k != "ingredients"})
    for sub in ing.get("ingredients", []):
        print("       sub:", sub)
```

Output:

```text
12 lines, 11 distinct codes
{'code': '0000000000024', 'product_name': 'Chocolate chip cookies', 'nova_group': 4}
nutriments: {'energy-kcal_100g': 498, 'energy_100g': 2084, 'proteins_100g': 5.9, 'fat_100g': 23.0, 'carbohydrates_100g': 65.0, 'sugars_100g': 33.0, 'fiber_100g': 2.4, 'salt_100g': 0.61}
   {'id': 'en:wheat-flour', 'text': 'wheat flour', 'percent_estimate': 41, 'vegan': 'yes'}
   {'id': 'en:sugar', 'text': 'sugar', 'percent_estimate': 20, 'vegan': 'yes'}
   {'id': 'en:chocolate-chips', 'text': 'chocolate chips', 'percent_estimate': 18, 'vegan': 'maybe'}
       sub: {'id': 'en:sugar', 'text': 'sugar', 'percent_estimate': 9, 'vegan': 'yes'}
       sub: {'id': 'en:cocoa-paste', 'text': 'cocoa mass', 'percent_estimate': 6, 'vegan': 'yes'}
       sub: {'id': 'en:cocoa-butter', 'text': 'cocoa butter', 'percent_estimate': 3, 'vegan': 'yes'}
   {'id': 'en:butter', 'text': 'butter', 'percent_estimate': 15, 'vegan': 'no'}
   {'id': 'en:salt', 'text': 'salt', 'percent_estimate': 0.6, 'vegan': 'yes'}
```

#### The lab folder

```text
sql-semi-structured-lab/
├── README.md                      how to run, expected results, definition of done
├── data/
│   ├── off_products.jsonl         12 lines, 11 products (synthetic, Open Food Facts shape)
│   ├── orders.jsonl, events.jsonl the Leafy documents used in lessons 3-20 and the exercises
├── sql/
│   ├── 01_stg_products.sql        step 1: typed nutriments, newest version per product
│   ├── 02_product_ingredients.sql step 2: ingredients at any depth, coverage
│   └── 03_products_per_ingredient.sql  step 3: distinct products per ingredient
├── run_lab.py                     builds the views in DuckDB and prints the results
├── tests/test_lab.py              pytest: grain, types, quarantine, no fan-out, Python cross-check
└── spark/products_per_ingredient.sql   the Spark SQL port (not executed)
```

Start with [the lab README](sql-semi-structured-lab/README.md). Run every step from inside the folder: `python run_lab.py`, then `python -m pytest -q`.

1. **Step 1** (typed products): Newest version per code; TRY_CAST each nutriment; derive kcal from kJ when needed; quarantine non-numbers.
2. **Step 2** (explode ingredients): Recursive unnest with positions; one row per occurrence; report products with none.
3. **Step 3** (products per ingredient): COUNT(DISTINCT code) per normalised id; compare with the naive count.
4. **Step 4** (prove and port): pytest cross-checks with plain Python; port to Spark SQL.

> **On the job:** In your portfolio: this is the Open Food Facts release of the Fuel Smart project. The real export has millions of products and daily delta files; the same three models, plus the tests, are what turn it into a silver table you can join to recipes and USDA nutrients. Credit Open Food Facts and respect its ODbL licence when you publish derived tables.

> **The main idea:** one realistic JSONL feed, three small models (typed products, exploded ingredients, products per ingredient), and tests that prove nothing was lost or double-counted.

*Read more:* [Open Food Facts: data exports](https://world.openfoodfacts.org/data), [Open Food Facts: API and field reference](https://openfoodfacts.github.io/openfoodfacts-server/api/), [DuckDB: loading JSON (read_json)](https://duckdb.org/docs/stable/data/json/loading_json).

---

<a id="slide-22"></a>
## 22. Lab step 1: typed nutriments, newest version per product

*Lab · from documents to one typed row per product*

The first model types the document. Each nutriment is extracted with `->>` (the hyphenated key works as a plain key) and cast with `TRY_CAST … AS DOUBLE`. `QUALIFY row_number()` keeps the newest version of each product code, because delta files repeat products (the granola appears twice; its sugars were corrected from 21 to 18.5). The ingredients state from lesson 14 is computed while the raw JSON is still available.

```sql
# sql-semi-structured-lab/sql/01_stg_products.sql
-- 01_stg_products.sql: one row per product (newest version of each code), typed nutriments per 100 g.
CREATE OR REPLACE VIEW raw_products AS
SELECT json AS doc
FROM read_json_objects('data/off_products.jsonl');

CREATE OR REPLACE VIEW stg_products AS
WITH latest AS (                       -- daily delta files repeat products: keep the newest version
    SELECT doc
    FROM raw_products
    QUALIFY row_number() OVER (PARTITION BY doc ->> 'code'
                               ORDER BY CAST(doc ->> 'last_modified_t' AS BIGINT) DESC) = 1
),
typed AS (
    SELECT doc ->> 'code'                                                    AS code,
           doc ->> 'product_name'                                            AS product_name,
           doc ->> 'brands'                                                  AS brand,
           make_timestamp(CAST(doc ->> 'last_modified_t' AS BIGINT) * 1000000) AS last_modified_at,
           TRY_CAST(doc -> 'nutriments' ->> 'energy-kcal_100g'   AS DOUBLE)  AS energy_kcal_reported,
           TRY_CAST(doc -> 'nutriments' ->> 'energy_100g'        AS DOUBLE)  AS energy_kj_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'proteins_100g'      AS DOUBLE)  AS proteins_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'carbohydrates_100g' AS DOUBLE)  AS carbohydrates_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'sugars_100g'        AS DOUBLE)  AS sugars_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'fat_100g'           AS DOUBLE)  AS fat_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'fiber_100g'         AS DOUBLE)  AS fiber_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'salt_100g'          AS DOUBLE)  AS salt_100g,
           CASE WHEN NOT json_exists(doc, '$.ingredients')       THEN 'missing'
                WHEN json_type(doc, '$.ingredients') = 'NULL'    THEN 'JSON null'
                WHEN json_array_length(doc, '$.ingredients') = 0 THEN 'empty'
                ELSE 'has values' END                                        AS ingredients_state,
           doc                                                               AS raw_doc
    FROM latest
)
SELECT * EXCLUDE (energy_kcal_reported, raw_doc),
       coalesce(energy_kcal_reported, round(energy_kj_100g / 4.184, 1))     AS energy_kcal_100g,
       energy_kcal_reported IS NULL AND energy_kj_100g IS NOT NULL           AS energy_kcal_derived,
       raw_doc
FROM typed;

-- nutrient values that are present but are not numbers: quarantined, never silently NULL
CREATE OR REPLACE VIEW nutrient_issues AS
SELECT p.code, n.key AS nutrient, n.value AS raw_value
FROM stg_products AS p,
     json_each(p.raw_doc -> 'nutriments') AS n
WHERE n.type <> 'NULL'
  AND TRY_CAST(n.value ->> '$' AS DOUBLE) IS NULL;
```

#### The typed products

```sql
SELECT code, product_name, energy_kcal_100g AS kcal, energy_kcal_derived AS derived,
       proteins_100g AS protein, sugars_100g AS sugars, fiber_100g AS fiber, ingredients_state
FROM stg_products
ORDER BY code;
```

Result (11 rows):

| code | product_name | kcal | derived | protein | sugars | fiber | ingredients_state |
|---|---|---|---|---|---|---|---|
| 0000000000017 | Oat & honey granola | 452 | false | 9.8 | 18.5 | 7.1 | has values |
| 0000000000024 | Chocolate chip cookies | 498 | false | 5.9 | 33 | 2.4 | has values |
| 0000000000031 | Red lentil pasta | 339 | false | 24 | 2 | 11 | has values |
| 0000000000048 | Greek style yogurt | 97 | false | 9 | 4 | NULL | has values |
| 0000000000055 | Tomato & basil soup | 45 | false | 1.2 | 4.2 | 1.1 | has values |
| 0000000000062 | Sparkling water | 0 | false | 0 | 0 | 0 | has values |
| 0000000000079 | Trail mix bar | 410 | false | 8.5 | 24 | 5.5 | empty |
| 0000000000086 | Loose leaf green tea | NULL | false | NULL | NULL | NULL | missing |
| 0000000000093 | Crunchy peanut butter | 619 | true | 25 | 4 | 8 | has values |
| 0000000000109 | Classic hummus | 260 | false | 7.4 | 0.6 | 6 | has values |
| 0000000000116 | Protein crisp bar | 372 | false | NULL | 3.1 | 9 | has values |

Peanut butter sent `energy-kcal_100g: null` but `energy_100g: 2590` kJ, so kcal is derived (2590 ÷ 4.184) and flagged. Red lentil pasta’s `"24"` cast cleanly. The tea has an empty `nutriments` object, so every value is NULL, honestly.

#### Quarantine: present but not a number

```sql
SELECT * FROM nutrient_issues ORDER BY code, nutrient;
```

Result (1 row):

| code | nutrient | raw_value |
|---|---|---|
| 0000000000116 | proteins_100g | "20,5" |

`json_each` lists every nutriment of every product; a value that exists, isn’t JSON null, and fails `TRY_CAST` is an issue. The protein bar’s `"20,5"` uses a decimal comma: fix it at the source or with an explicit rule (`replace(v, ',', '.')`) that you document, never by silently dropping it.

> **On the job:** Open Food Facts nutriments are user-contributed: strings, commas, missing keys, and kJ-only products are normal. A staging model that types them, flags derived values, and lists rejects is what makes any later “protein per 100 kcal” metric defensible.

> **The main idea:** type every nutriment with TRY_CAST, keep the newest version per key, derive only with a flag, and list every value that failed instead of hiding it as NULL.

*Read more:* [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions), [DuckDB: CAST and TRY_CAST](https://duckdb.org/docs/stable/sql/expressions/cast), [Open Food Facts: API and field reference](https://openfoodfacts.github.io/openfoodfacts-server/api/).

---

<a id="slide-23"></a>
## 23. Lab steps 2 and 3: explode ingredients, then count products

*Lab · one row per ingredient, then distinct products per ingredient*

**Step 2** unnests the ingredients with positions and then, recursively, each ingredient’s own `ingredients` list (the recursive CTE from the SQL windows and recursion deck, with an UNNEST in each step). The grain is one row per occurrence; the key is `(code, path)`, where `path` is the list of positions down the tree. **Step 3** counts *distinct products* per normalised ingredient id.

#### Step 2 · the model

```sql
# sql-semi-structured-lab/sql/02_product_ingredients.sql
-- 02_product_ingredients.sql: one row per ingredient occurrence, at any depth.
CREATE OR REPLACE VIEW product_ingredients AS
WITH RECURSIVE walk(code, path, depth, ing) AS (
    SELECT p.code, [t.pos], 1, t.ing
    FROM stg_products AS p,
         UNNEST(CAST(p.raw_doc -> 'ingredients' AS JSON[])) WITH ORDINALITY AS t(ing, pos)
    UNION ALL                           -- sub-ingredients: unnest the element's own list
    SELECT w.code, list_append(w.path, s.pos), w.depth + 1, s.ing
    FROM walk AS w,
         UNNEST(CAST(w.ing -> 'ingredients' AS JSON[])) WITH ORDINALITY AS s(ing, pos)
)
SELECT code,
       path,                                          -- [3, 1]: 1st sub-ingredient of the 3rd ingredient
       path[1]                                        AS top_position,
       depth,
       lower(trim(ing ->> 'id'))                      AS ingredient_id,
       ing ->> 'text'                                 AS ingredient_text,
       TRY_CAST(ing ->> 'percent_estimate' AS DOUBLE) AS percent_estimate,
       ing ->> 'vegan'                                AS vegan
FROM walk;

-- products with no ingredient rows are not lost: they are counted here
CREATE OR REPLACE VIEW ingredient_coverage AS
SELECT ingredients_state,
       count(*)                                  AS products,
       list(product_name ORDER BY product_name)  AS product_names
FROM stg_products
GROUP BY ingredients_state;
```

#### Step 3 · the model

```sql
# sql-semi-structured-lab/sql/03_products_per_ingredient.sql
-- 03_products_per_ingredient.sql: how many distinct products contain each ingredient (any depth).
CREATE OR REPLACE VIEW products_per_ingredient AS
SELECT ingredient_id,
       count(DISTINCT code) AS products,       -- the answer: products, not rows
       count(*)             AS occurrences,    -- rows: larger when an ingredient repeats in a product
       min(depth)           AS shallowest_depth
FROM product_ingredients
GROUP BY ingredient_id;
```

#### The cookies, exploded

```sql
SELECT path, depth, ingredient_id, percent_estimate, vegan
FROM product_ingredients
WHERE code = '0000000000024'
ORDER BY path;
```

Result (8 rows):

| path | depth | ingredient_id | percent_estimate | vegan |
|---|---|---|---|---|
| [1] | 1 | en:wheat-flour | 41 | yes |
| [2] | 1 | en:sugar | 20 | yes |
| [3] | 1 | en:chocolate-chips | 18 | maybe |
| [3, 1] | 2 | en:sugar | 9 | yes |
| [3, 2] | 2 | en:cocoa-paste | 6 | yes |
| [3, 3] | 2 | en:cocoa-butter | 3 | yes |
| [4] | 1 | en:butter | 15 | no |
| [5] | 1 | en:salt | 0.6 | yes |

Sugar appears at `[2]` and again at `[3, 1]` inside the chocolate chips: two occurrences, one product.

#### Nothing lost

```sql
SELECT ingredients_state, products, product_names
FROM ingredient_coverage
ORDER BY ingredients_state;
```

Result (3 rows):

| ingredients_state | products | product_names |
|---|---|---|
| empty | 1 | ['Trail mix bar'] |
| has values | 9 | ['Chocolate chip cookies', 'Classic hummus', 'Crunchy peanut butter', 'Greek style yogurt', 'Oat & honey granola', 'Protein crisp bar', 'Red lentil pasta', 'Sparkling water', 'Tomato & basil soup'] |
| missing | 1 | ['Loose leaf green tea'] |

Trail mix (empty list) and tea (no key) produce no ingredient rows, which is correct at this grain, and the coverage view counts them so a report can say “9 of 11 products have ingredient data”.

#### ✗ Believable, but wrong

*SQL · believable, but wrong*

```sql
SELECT t.ing ->> 'id' AS ingredient_id, count(*) AS products
FROM raw_products AS r,
     UNNEST(CAST(r.doc -> 'ingredients' AS JSON[])) AS t(ing)
WHERE t.ing ->> 'id' IN ('en:salt', 'en:sugar', 'en:cocoa-butter', 'en:oat-flakes')
GROUP BY ALL
ORDER BY ingredient_id;
```

Result (4 rows):

| ingredient_id | products |
|---|---|
| en:cocoa-butter | 1 |
| en:oat-flakes | 2 |
| en:salt | 6 |
| en:sugar | 3 |

#### ✓ Fixed

*SQL · fixed: the model*

```sql
SELECT ingredient_id, products, occurrences, shallowest_depth
FROM products_per_ingredient
WHERE ingredient_id IN ('en:salt', 'en:sugar', 'en:cocoa-butter', 'en:oat-flakes')
ORDER BY ingredient_id;
```

Result (4 rows):

| ingredient_id | products | occurrences | shallowest_depth |
|---|---|---|---|
| en:cocoa-butter | 2 | 2 | 1 |
| en:oat-flakes | 1 | 1 | 1 |
| en:salt | 5 | 5 | 1 |
| en:sugar | 3 | 4 | 1 |

The naive query has three bugs that all look plausible: it reads every version (salt 6 and oat flakes 2, because the granola is counted twice), it stops at the top level (cocoa butter 1, missing the chocolate chips), and it counts rows, which would make sugar 4 once sub-ingredients are included. The model fixes each one: newest version, recursive walk, `count(DISTINCT code)`.

> **On the job:** “Products per ingredient” is a fan-out question in disguise, and the same shape appears as “customers per product”, “sessions per page”, and “recipes per food”. Count distinct parents, de-duplicate versions first, and decide the depth on purpose.

> **The main idea:** explode to the occurrence grain with positions (recursively for nested lists), report parents with no rows, and answer “how many products” with COUNT(DISTINCT product) after de-duplicating versions.

*Read more:* [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates), [Open Food Facts: API and field reference](https://openfoodfacts.github.io/openfoodfacts-server/api/).

---

<a id="slide-24"></a>
## 24. Lab step 4: run it, test it, port it to Spark SQL

*Lab · prove the numbers, then move them to another engine*

The runner builds the three views and prints the results. The tests check the lab’s definition of done against an independent plain-Python reading of the same JSONL: one row per product, newest version, typed nutriments, listed rejects, unique ingredient grain, reported coverage, and products per ingredient equal to Python’s count with no fan-out.

#### Run it

Output:

```text
$ python sql-semi-structured-lab/run_lab.py

== coverage
ingredients_state  products
empty              1       
has values         9       
missing            1       

== nutrient values that are not numbers
code           nutrient       raw_value
0000000000116  proteins_100g  "20,5"   

== top ingredients by distinct products
ingredient_id    products  occurrences  shallowest_depth
en:salt          5         5            1               
en:sugar         3         4            1               
en:cocoa-butter  2         2            1               
en:olive-oil     2         2            1               
en:almond        1         1            1               
en:basil         1         1            1               
```

#### Test it

Terminal (timing measured on the build machine):

```text
$ python -m pytest -q -p no:cacheprovider
........                                                                 [100%]
8 passed in 0.19s
```

Test code: `sql-semi-structured-lab/tests/test_lab.py` (8 tests). The Python reference walks the nested lists with a recursive generator and counts each ingredient once per product with a `set`.

*Spark SQL (reference, not executed):*

```sql
# sql-semi-structured-lab/spark/products_per_ingredient.sql
-- products_per_ingredient.sql (Spark SQL 3.5 / 4.x)
-- NOT EXECUTED: the lab was built on a machine without Java or Spark. Expected result: the DuckDB
-- output of run_lab.py. Run it with spark-sql from the lab folder, or paste it into a notebook.

CREATE OR REPLACE TEMPORARY VIEW raw_lines
USING text OPTIONS (path 'data/off_products.jsonl');                 -- one STRING column: value

-- An explicit schema. nutriments as MAP<STRING, STRING>: hyphenated keys stay plain map keys,
-- and every value arrives as text, so "24" and "20,5" can be checked with try_cast.
CREATE OR REPLACE TEMPORARY VIEW parsed AS
SELECT from_json(value,
  'code STRING, product_name STRING, last_modified_t BIGINT,
   nutriments MAP<STRING, STRING>,
   ingredients ARRAY<STRUCT<id: STRING, text: STRING, percent_estimate: DOUBLE, vegan: STRING,
                            ingredients: ARRAY<STRUCT<id: STRING, text: STRING>>>>') AS p
FROM raw_lines;

CREATE OR REPLACE TEMPORARY VIEW stg_products AS
SELECT p.code,
       p.product_name,
       try_cast(p.nutriments['energy-kcal_100g'] AS DOUBLE) AS energy_kcal_reported,
       try_cast(p.nutriments['proteins_100g'] AS DOUBLE)    AS proteins_100g,
       try_cast(p.nutriments['sugars_100g'] AS DOUBLE)      AS sugars_100g,
       p.ingredients
FROM (SELECT p, row_number() OVER (PARTITION BY p.code ORDER BY p.last_modified_t DESC) AS rn
      FROM parsed)
WHERE rn = 1;

-- Two fixed levels (the fixture's depth). posexplode is 0-based; explode drops NULL/empty arrays,
-- which is right at ingredient grain (coverage is reported from stg_products).
CREATE OR REPLACE TEMPORARY VIEW product_ingredients AS
SELECT code, pos + 1 AS top_position, 1 AS depth, lower(trim(ing.id)) AS ingredient_id
FROM stg_products
LATERAL VIEW posexplode(ingredients) t AS pos, ing
UNION ALL
SELECT code, pos + 1 AS top_position, 2 AS depth, lower(trim(sub.id)) AS ingredient_id
FROM stg_products
LATERAL VIEW posexplode(ingredients) t AS pos, ing
LATERAL VIEW explode(ing.ingredients) s AS sub;

SELECT ingredient_id,
       count(DISTINCT code) AS products,
       count(*)             AS occurrences
FROM product_ingredients
GROUP BY ingredient_id
ORDER BY products DESC, ingredient_id
LIMIT 6;
```

#### What the Spark port changes

- Reads lines as text and parses with an explicit `from_json` schema; `nutriments` as `MAP<STRING, STRING>` so hyphenated keys and string numbers are easy.
- `row_number()` in a subquery instead of `QUALIFY` (Databricks SQL has `QUALIFY`; open-source Spark SQL did not when this was written).
- `LATERAL VIEW posexplode` (0-based) and a fixed second level instead of a recursive CTE.
- Not executed here: run it and compare with the DuckDB output above. The products column must match exactly.

#### Definition of done for this lab

- ☐ Every nutriment column is DOUBLE; non-numbers are listed in `nutrient_issues`.
- ☐ One row per product code (newest version).
- ☐ One row per ingredient occurrence, unique on `(code, path)`; products without ingredients counted.
- ☐ Products per ingredient uses `count(DISTINCT code)` and matches the Python check.
- ☐ The Spark port returns the same products column.

> **On the job:** This is a complete, reviewable data-quality story for a portfolio: raw JSONL in, typed and de-duplicated silver models, a quarantine, tests that cross-check with an independent implementation, and a port to a second engine. Put the README’s “what I checked” section in your project write-up.

> **The main idea:** a lab is done when tests prove the grain, the types, the rejects, and the counts against an independent check, and the port to a second engine has an expected result to match.

*Read more:* [pytest documentation](https://docs.pytest.org/en/stable/), [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html), [Spark SQL: LATERAL VIEW](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-lateral-view.html).

---

<a id="slide-25"></a>
## 25. Bug clinic: believable semi-structured bugs

*Practice · symptom → cause → fix*

Each query runs, returns plausible numbers, and is wrong. Read the symptom, find the cause, then check the fix.

#### 1 · “Cancelled and draft orders vanished from the status report”

*SQL · believable, but wrong*

```sql
SELECT o.status, count(DISTINCT o.order_id) AS orders
FROM orders AS o, UNNEST(o.items) AS u(item)
GROUP BY o.status
ORDER BY o.status;
```

Result (1 row):

| status | orders |
|---|---|
| shipped | 7 |

*SQL · fixed*

```sql
SELECT o.status, count(DISTINCT o.order_id) AS orders
FROM orders AS o LEFT JOIN UNNEST(o.items) AS u(item) ON true
GROUP BY o.status
ORDER BY o.status;
```

Result (3 rows):

| status | orders |
|---|---|
| cancelled | 1 |
| draft | 1 |
| shipped | 7 |

**Cause:** the unnest was added for an item filter that was later removed; the inner form drops orders with an empty or missing `items`. **Fix:** the outer form, or better, don’t unnest at all for an order-grain report (lessons 7, 9).

#### 2 · “The join to the city dimension matches nothing”

*SQL · believable, but wrong*

```sql
SELECT count(*) AS matched_orders
FROM raw_orders AS r
JOIN dim_city AS c
  ON CAST(r.doc -> '$.customer.address.city' AS VARCHAR) = c.city;
```

Result (1 row):

| matched_orders |
|---|
| 0 |

*SQL · fixed*

```sql
SELECT count(*) AS matched_orders
FROM raw_orders AS r
JOIN dim_city AS c
  ON (r.doc ->> '$.customer.address.city') = c.city;
```

Result (1 row):

| matched_orders |
|---|
| 6 |

`dim_city` holds Austin, Denver, and Seattle. **Cause:** `->` returns JSON; cast to text it keeps its quotes (`"Austin"`), so no city matches. BigQuery’s `JSON_QUERY` and a Snowflake path without `::STRING` behave the same way. **Fix:** `->>` (lessons 4, 17).

#### 3 · “first_sku is NULL for every order”

*SQL · believable, but wrong*

```sql
SELECT order_id, items[0].sku AS first_sku
FROM orders
WHERE order_id IN ('L-1001', 'L-1008')
ORDER BY order_id;
```

Result (2 rows):

| order_id | first_sku |
|---|---|
| L-1001 | NULL |
| L-1008 | NULL |

*SQL · fixed*

```sql
SELECT order_id, items[1].sku AS first_sku, doc_first
FROM orders
JOIN (SELECT doc ->> 'order_id' AS order_id, doc ->> '$.items[0].sku' AS doc_first FROM raw_orders) USING (order_id)
WHERE order_id IN ('L-1001', 'L-1008')
ORDER BY order_id;
```

Result (2 rows):

| order_id | first_sku | doc_first |
|---|---|---|
| L-1001 | MON-01 | MON-01 |
| L-1008 | POT-12 | POT-12 |

**Cause:** SQL lists are 1-based; `items[0]` is out of range and returns NULL, not an error. JSON paths are 0-based (`$.items[0]`). **Fix:** `items[1]` on lists, `[0]` in JSON paths; Spark and BigQuery arrays have their own rules (lesson 17).

#### 4 · “Revenue is NULL for every order since 5 March”

*SQL · believable, but wrong*

```sql
SELECT o.order_id, sum(u.item.qty * u.item.unit_price) AS items_amount
FROM orders AS o, UNNEST(o.items) AS u(item)
WHERE o.order_id IN ('L-1006', 'L-1007', 'L-1008')
GROUP BY o.order_id
ORDER BY o.order_id;
```

Result (3 rows):

| order_id | items_amount |
|---|---|
| L-1006 | 70.00 |
| L-1007 | NULL |
| L-1008 | NULL |

*SQL · fixed, with a test column*

```sql
SELECT o.order_id,
       sum(u.item.qty * coalesce(u.item.unit_price, u.item.price.amount)) AS items_amount,
       count(*) FILTER (WHERE coalesce(u.item.unit_price, u.item.price.amount) IS NULL) AS unpriced_lines
FROM orders AS o, UNNEST(o.items) AS u(item)
WHERE o.order_id IN ('L-1006', 'L-1007', 'L-1008')
GROUP BY o.order_id
ORDER BY o.order_id;
```

Result (3 rows):

| order_id | items_amount | unpriced_lines |
|---|---|---|
| L-1006 | 70.00 | 0 |
| L-1007 | 18.00 | 0 |
| L-1008 | 32.50 | 0 |

**Cause:** API v2 moved the price to `price.amount`; the declared schema made `unit_price` NULL without an error, and `SUM` skipped the NULL products. **Fix:** handle both versions and add a test that counts unpriced lines (lesson 15).

#### The pattern behind them

- Rows silently dropped by an inner unnest.
- JSON values treated as text (quotes) or text treated as numbers.
- 0-based vs 1-based positions.
- Schema drift turning a field into NULL without an error.
- And the two fan-outs of lessons 11–12: parent values repeated, sibling arrays multiplied.

#### A review checklist

Before a flattening model ships, ask: What is the grain and its unique key? Inner or outer, and why? Is every extracted value cast, with `->>`? Are parent measures summed at parent grain? Is there a test for unknown keys and for NULLs in required fields?

> **On the job:** Paste these five questions into the pull-request template of the repository that holds your staging models; they catch most JSON bugs in review rather than in a dashboard.

> **The main idea:** most JSON bugs are silent: dropped parents, quoted strings, off-by-one positions, and renamed fields. Each one has a cheap test; write it.

---

<a id="slide-26"></a>
## 26. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

These are the semi-structured questions that came up most often in the interview research behind this deck (typed extraction, FLATTEN vs UNNEST vs EXPLODE, disappearing rows, inflated totals, position, missing vs null, drift, raw vs typed storage). Answer aloud in about a minute, then open the model answer.

<details><summary>“What is the difference between -> and ->> (or, in Snowflake, a path with and without ::STRING)?” · *checks: JSON vs text, explicit types, join bugs*</summary>

**Model answer (about 60 seconds):** The arrow returns the value as JSON, so a string keeps its quotes and an object stays navigable; the double arrow returns text. I use the single arrow to walk into nested objects and the double arrow for the last step, then cast to the real type: INTEGER for counts, DECIMAL for money, TIMESTAMP for times. Comparing or joining on the JSON form is a classic bug: “Austin” with quotes matches nothing. In Snowflake the same rule is to end a path with ::STRING or ::NUMBER; in BigQuery it is JSON_VALUE rather than JSON_QUERY.

**Likely follow-up:** “What happens if the value can’t be cast?” → CAST fails the query; TRY_CAST, TRY_TO_NUMBER, or SAFE_CAST return NULL. I use the safe form in staging, but I count and quarantine those NULLs so bad data is visible.

</details>

<details><summary>“What is the difference between FLATTEN, UNNEST, and EXPLODE?” · *checks: cross-engine vocabulary, outer variants, position*</summary>

**Model answer (about 60 seconds):** They are the same operation, turning each array element into a row, in different engines: FLATTEN is Snowflake’s table function, used with LATERAL; UNNEST is BigQuery’s, PostgreSQL’s, and DuckDB’s; EXPLODE is Spark’s generator, often written with LATERAL VIEW. The differences that matter are the outer forms, which keep parents with empty arrays (OUTER => TRUE, LEFT JOIN UNNEST, explode_outer), how you get the position (index, WITH OFFSET, posexplode, WITH ORDINALITY) and whether it is 0- or 1-based, and what extra columns come back, such as Snowflake’s key, path, and value.

**Likely follow-up:** “How do you flatten an array inside an array?” → One unnest per level, each reading the alias to its left: lines, then tags of each line. I predict the row count at each level and choose inner or outer per level.

</details>

<details><summary>“After flattening the items, some orders are missing. Why?” · *checks: empty and NULL arrays, inner vs outer, a parent-count check*</summary>

**Model answer (about 60 seconds):** An inner unnest of an empty array or a NULL/missing array produces no rows, so those parents disappear without an error: cancelled orders with no items, drafts without the key. If the report needs every order, I use the outer form, LEFT JOIN UNNEST ON true or the engine’s equivalent, or I don’t unnest at all and use list functions at order grain. And I add a test that the count of distinct orders after the unnest equals the count before.

**Likely follow-up:** “And if the array is JSON null rather than missing?” → Same result in DuckDB, BigQuery, and Snowflake; in PostgreSQL jsonb_array_elements raises an error on a JSON null, so I guard with jsonb_typeof or use a JSON path query.

</details>

<details><summary>“After flattening, revenue is too high. What happened?” · *checks: fan-out from parent values and sibling arrays, pre-aggregation, reconciliation*</summary>

**Model answer (about 60 seconds):** Unnesting is a one-to-many join between a row and its own array, so every parent-level value, such as shipping or the order total, is repeated per element. Summing it at the new grain multiplies it. A second cause is unnesting two sibling arrays, say items and payments, in the same FROM: that is a cartesian product per order. The fix is to measure each value at the grain it belongs to: aggregate each array to the order grain separately, then join, and prove it with a reconciliation test, for example that item revenue plus shipping equals payments per order.

**Likely follow-up:** “How would you put the shipping on product-level rows anyway?” → Allocate it explicitly, for example in proportion to line value, and test that the allocations sum back to the order’s shipping.

</details>

<details><summary>“How do you keep the order of array elements after unnesting?” · *checks: positions, 0- vs 1-based, SQL row order*</summary>

**Model answer (about 60 seconds):** JSON arrays are ordered but SQL results are not, so I capture the position as a column while unnesting: WITH ORDINALITY in DuckDB and PostgreSQL (1-based), posexplode in Spark, WITH OFFSET in BigQuery, and FLATTEN’s index in Snowflake (all 0-based). The parent key plus the position is also the unique key of the new grain, and I sort by it whenever order matters, such as the first ingredient or step one of a funnel.

**Likely follow-up:** “Can you re-build the array after filtering?” → Yes: aggregate back with list or array_agg ordered by the position, grouped by the parent key.

</details>

<details><summary>“How do you handle a key that is missing versus a key that is null?” · *checks: four states, policy per field, engine functions*</summary>

**Model answer (about 60 seconds):** There are really four states: a value, an empty container, JSON null, and a missing key. Typed columns collapse the last two into SQL NULL, so if the difference matters, for example in update feeds where null means “cleared” and missing means “unchanged”, I compute a state column from the raw JSON with json_exists and json_type, or the engine’s equivalents: the ? operator and jsonb_typeof in PostgreSQL, IS_NULL_VALUE in Snowflake. Then I decide per field whether NULL becomes zero, unknown, or an error, and I count each state.

**Likely follow-up:** “Why not just COALESCE everything to zero?” → Because unknown is not zero: it hides missing data and changes averages and rates.

</details>

<details><summary>“The source API renamed a field. What happens to your pipeline, and how do you protect it?” · *checks: schema drift, raw landing, contracts, version handling*</summary>

**Model answer (about 60 seconds):** With a declared schema the old field silently becomes NULL; with inference the schema changes under you. Neither fails loudly. I protect against it in layers: land the raw JSON unchanged so nothing is lost and I can backfill; profile keys and types on each load; handle known versions explicitly, for example COALESCE of the old and new paths; and run contract tests that fail on unknown keys, on NULLs in required fields, and on cast failures. Then I talk to the source team about versioning their API.

**Likely follow-up:** “How would you backfill after fixing the model?” → Rebuild the staging model from the raw landing for the affected dates; because the raw JSON was kept, no re-ingestion is needed.

</details>

<details><summary>“Would you store the raw JSON in the warehouse or flatten it on ingest?” · *checks: bronze/silver design, cost of parsing, when JSON columns are right*</summary>

**Model answer (about 60 seconds):** Both, in layers. I land the raw documents unchanged, because sources change and I may need fields I didn’t model. Then I build typed staging tables with the fields people actually use, stored in a columnar format such as Parquet or Delta, because re-parsing JSON text on every query is slow and expensive. I keep a JSON or VARIANT column only for genuinely sparse, long-tail attributes. Snowflake’s VARIANT and Spark’s variant type store JSON in a binary form, which helps, but explicit typed columns are still clearer and easier to test.

**Likely follow-up:** “Isn’t storing it twice wasteful?” → Raw storage is cheap compared with lost data or re-ingestion; retention rules can expire old raw files once the typed tables are trusted.

</details>

> **The main idea:** strong answers name the grain, choose inner vs outer on purpose, cast explicitly, and finish with the test that proves the counts.

---

<a id="slide-27"></a>
## 27. Exercises 1–5 · extract, unnest, count

*Exercises · warm-ups and first interview tasks*

Exercises use `data/orders.jsonl` and `data/events.jsonl` (lesson 3) and, from exercise 9, the lab fixture. Each solution starts by loading the raw documents into `raw_orders(doc JSON)`, exactly as in lesson 4. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · Predict before you run: arrows on missing and null

**Pattern:** typed extraction, missing vs null · **Format:** predict the output · **Target time:** about 5 minutes.

For orders `L-1005` and `L-1009`, predict four columns for each of the paths `$.customer.address`, `$.customer.address.city`, `$.customer.country`, and `$.items`: the result of `->` (shown as text), of `->>`, `json_type`, and `json_exists`. Then run it. Expected property: your predictions match the 8 rows exactly.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Units sold per city from raw JSON

**Pattern:** extract + cast + unnest · **Format:** write the query · **Target time:** about 8 minutes.

From `raw_orders` (raw JSON, no typed view), return units sold per customer city for shipped orders: columns `city, units`, with a missing city shown as `(unknown)`, sorted by city. Expected: Austin 6, Denver 3, Seattle 5, (unknown) 5; 19 units in total.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Predict the row counts of three unnests

**Pattern:** unnest grain, empty and NULL arrays · **Format:** predict the output · **Target time:** about 6 minutes.

Without running anything, predict `rows` and `distinct orders` for (a) an inner unnest of `items`, (b) an outer unnest of `items`, (c) an inner unnest of `items` followed by an inner unnest of each line’s `tags`. Then verify. Expected: three pairs of numbers that you can justify from the trap table.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Revenue and orders per SKU, across both API versions

**Pattern:** flatten an array of objects, distinct parents · **Format:** write the query · **Target time:** about 10 minutes.

For shipped orders, return per SKU: `sku, orders` (distinct orders containing it), `units`, `revenue` (qty × unit price, DECIMAL), sorted by revenue descending then SKU. Expected: 5 SKUs, total revenue 244.50, MON-01 first with 87.00 from 2 orders; the total must equal the sum of per-order item amounts computed with list functions.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Shipping on orders with an indoor plant (find the bug)

**Pattern:** fan-out after a nested unnest, semi-join · **Format:** find and fix the bug · **Target time:** about 8 minutes.

A colleague reports shipping revenue from shipped orders that contain at least one item tagged `indoor`. Their query returns 24.95. What is wrong, and what is the right number? Expected property: each qualifying order’s shipping is counted exactly once.

```sql
SELECT sum(o.shipping) AS shipping
FROM orders AS o, UNNEST(o.items) AS u(item), UNNEST(u.item.tags) AS t(tag)
WHERE t.tag = 'indoor' AND o.status = 'shipped';
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

---

<a id="slide-28"></a>
## 28. Exercises 6–10 · fan-out, drift, position, and a take-home

*Exercises · interview-level and stretch*

Exercises 6–8 use the Leafy documents; exercises 9–10 build the lab models first (from the lab folder’s SQL files) and work on the Open Food Facts–shaped products. Write your answer first; hints and solutions are collapsed. Every solution ran during the build and its `assert` lines passed.

### Exercise 6 · Order-level reconciliation from two sibling arrays

**Pattern:** sibling arrays, pre-aggregate then join · **Format:** write the query · **Target time:** about 12 minutes.

From `raw_orders` (raw JSON), build one row per shipped order: `order_id, items_amount, shipping, paid, difference` where difference = paid − (items_amount + shipping). Expected: 7 rows, every difference 0.00, and no row multiplied by a cartesian product.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · Orders and units per tag, keeping untagged lines

**Pattern:** nested arrays, outer unnest at the inner level, distinct parents · **Format:** write the query · **Target time:** about 12 minutes.

For shipped orders, return per tag: `tag, orders, units`, where lines whose `tags` are empty or null go into a `(no tags)` bucket. Sort by orders descending, then tag. Expected: indoor 5 orders / 8 units; (no tags) 2 / 4; ceramic 2 / 3; large 2 / 3; outdoor 1 / 4.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · API v3 arrives: handle three versions and catch the next one

**Pattern:** schema drift, version coalescing, contract test · **Format:** write the query and the test · **Target time:** about 15 minutes.

A v3 document arrives: lines use `quantity` instead of `qty`, and the price is in cents: `price.amount_minor`. Using the raw documents plus the v3 one, build order lines with `qty` and `unit_price` filled for every version, and a contract check that lists line keys outside an allow-list. Expected: 13 lines, none with a NULL qty or price; L-1011’s line is qty 2 at 29.00; the contract check is empty once you add the v3 keys to the allow-list, and lists them before.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Sugar in the top three ingredients, then port it to Spark SQL

**Pattern:** element position, cross-engine port · **Format:** write the query, then translate · **Target time:** about 15 minutes.

Using the lab models, list each product with ingredient data: `product_name, first_ingredient, sugar_in_top3` (sugar among the first three *top-level* ingredients). Then write the Spark SQL version. Expected: 9 products; `sugar_in_top3` is true for exactly the cookies and the protein bar; the soup lists sugar 6th, so false.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Take-home: a vegan claim with honest unknowns

**Pattern:** nested arrays with missing values, three-valued logic, parents kept · **Format:** take-home extension of the lab · **Target time:** about 20 minutes.

Classify every product (all 11) as `vegan` (every ingredient occurrence, any depth, has `vegan = 'yes'`), `not vegan` (any occurrence is `'no'`), `unknown` (otherwise: some `'maybe'` or missing flag), or `no ingredient data`. Expected counts: vegan 4, not vegan 4, unknown 1, no ingredient data 2.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

---

<a id="slide-29"></a>
## 29. Cheat sheet

*Reference · the deck on one page*

| Task | DuckDB | Lesson |
|---|---|---|
| Land raw documents | `SELECT json AS doc FROM read_json_objects('f.jsonl')` | 4 |
| One value as text, then typed | `CAST(doc ->> '$.a.b' AS INTEGER)`; `TRY_CAST` + count failures | 4–5 |
| Key with a dot or space | `doc ->> '$."a.b"'`; a plain string is one key | 4 |
| Compare / join on JSON | `(doc ->> 'k') = x`: text form, in parentheses | 4, 25 |
| Type a whole document | `json_transform(doc, '{"a": "INTEGER", "l": ["VARCHAR"]}')` | 5 |
| Typed file read | `read_json(f, columns = {a: 'STRUCT(…)', l: 'STRUCT(…)[]'})` | 6 |
| Per-parent answer, no new rows | `len(l)`, `list_filter(l, x -> …)`, `list_sum(list_transform(l, x -> …))` | 7 |
| Unnest (inner) | `FROM t, UNNEST(t.l) AS u(x)` | 8 |
| Unnest keeping parents, with position | `LEFT JOIN UNNEST(t.l) WITH ORDINALITY AS u(x, n) ON true` | 9 |
| Unnest a raw JSON array | `UNNEST(CAST(doc -> 'items' AS JSON[]))` | 10 |
| Count parents after an unnest | `count(DISTINCT parent_key)` | 11 |
| Two arrays on one parent | one CTE per array, `GROUP BY` parent, join totals | 12 |
| Rows back into a list | `list(x ORDER BY n)` grouped by parent | 12 |
| Object keys as rows | `LEFT JOIN json_each(doc -> 'props') AS p ON true` | 13 |
| Missing vs JSON null | `json_exists(doc, p)`, `json_type(doc, p) = 'NULL'` | 14 |
| Profile shape / keys | `json_group_structure(doc)`; `json_each` + `GROUP BY key` | 15 |
| Nested lists of any depth | recursive CTE with an `UNNEST` in the recursive step | 23 |

| Need | PostgreSQL | Spark SQL | Snowflake | BigQuery |
|---|---|---|---|---|
| Text value | `->>`, `#>>` | `get_json_object` | `:path::STRING` | `JSON_VALUE` |
| Typed parse | `jsonb_to_record`, casts | `from_json(s, schema)` | `::`, `TRY_TO_*` | `SAFE_CAST(JSON_VALUE(…))` |
| Unnest, inner | `, LATERAL jsonb_array_elements` | `LATERAL VIEW explode` | `, LATERAL FLATTEN` | `, UNNEST` |
| Unnest, outer | `LEFT JOIN LATERAL … ON true` | `LATERAL VIEW OUTER`, `explode_outer` | `OUTER => TRUE` | `LEFT JOIN UNNEST` |
| Position | `WITH ORDINALITY` (1) | `posexplode` (0) | `index` (0) | `WITH OFFSET` (0) |
| Key exists / JSON null | `?`, `jsonb_typeof` | both NULL after `from_json` | `IS_NULL_VALUE` | `JSON_TYPE` |

*PostgreSQL syntax was executed (lesson 18); Spark SQL, Snowflake, and BigQuery entries are reference only and were not executed. T-SQL: `JSON_VALUE`, `OPENJSON` with `CROSS APPLY` / `OUTER APPLY` (lesson 19).*

> **On the job:** Keep the five-step routine (grain, extract or unnest, inner or outer, cast, prove) and the two tables above open while writing a staging model or answering a live SQL question.

> **The main idea:** extract with ->> and cast; compute per-parent answers inside lists; unnest in the FROM clause, outer when parents must stay; count parents with DISTINCT; one array per CTE.

---

<a id="slide-30"></a>
## 30. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Allow-list (of keys) | The keys a model expects; anything else is reported as drift (lessons 15–16). |
| Array (JSON) | An ordered list of values in square brackets; positions start at 0 in JSON paths. |
| Cartesian product (per parent) | Every element of one array paired with every element of a sibling array (lesson 12). |
| CAST / TRY_CAST | Convert to a type; CAST fails on bad input, TRY_CAST returns NULL instead. |
| Contract check | A test that fails when data breaks the agreed shape: unknown keys, missing required fields, cast failures. |
| Delta file (Open Food Facts) | A daily export of recently changed products; it repeats products that already exist. |
| Empty array | `[]`: the key is present and known to hold nothing. |
| Explode / flatten / unnest | Turn each array element into a row (Spark, Snowflake, standard SQL names). |
| Fan-out | Rows multiplied by a one-to-many step, inflating sums and counts of parent-level values. |
| FLATTEN | Snowflake table function that unnests a VARIANT array or object (value, index, key, path). |
| Grain | What one row of a table represents (one order, one order line, one tag of a line). |
| JSON | A text format of objects, arrays, strings, numbers, booleans, and null (RFC 8259). |
| JSON null | The value `null` written in a document: the key exists, the value is absent. |
| JSON path | A string starting with `$` that walks a document: `$.items[0].sku`. |
| JSON scalar | A single JSON number, string, boolean, or null. |
| JSON type (DuckDB) | A column type holding validated JSON text. |
| jsonb | PostgreSQL’s binary JSON type: parsed, keys de-duplicated and reordered, indexable. |
| JSONL (JSON Lines) | One JSON document per line; the usual format for exports and event logs. |
| json_each | Table function that returns one row per key (or element) of a JSON value. |
| json_transform / structure | Converts JSON to typed STRUCT / LIST values using a template of type names. |
| Lambda | An inline function such as `x -> x.qty * 2`, used by list functions. |
| Lateral join | A join whose right side can read columns of each row on its left; how UNNEST reads its parent’s array. |
| LIST | DuckDB variable-length array type of one element type (`VARCHAR[]`); 1-based indexing. |
| List functions | `len`, `list_filter`, `list_transform`, `list_sum`, `list_contains`: work inside a list without creating rows. |
| MAP | Key/value type whose keys may differ per row. |
| Missing key | The key does not appear in the document at all. |
| Ordinality / position | The element’s index captured while unnesting (WITH ORDINALITY, posexplode, WITH OFFSET). |
| Outer unnest | An unnest that keeps parents with empty or missing arrays (LEFT JOIN UNNEST, explode_outer, OUTER => TRUE). |
| PGlite | PostgreSQL compiled to WebAssembly and run inside Node.js; used here to execute the PostgreSQL lesson. |
| Quarantine | A table or view of rejected rows with the reason, kept for review instead of being dropped or hidden. |
| Raw landing (bronze) | Source documents stored unchanged, so nothing is lost and models can be rebuilt. |
| Re-nest | Aggregate rows back into a list per parent: `list(x ORDER BY n)`, `array_agg`. |
| read_json / read_json_objects | DuckDB readers: typed columns (inferred or declared) / one raw JSON value per document. |
| Schema drift | Fields added, removed, renamed, or re-typed between documents or API versions. |
| Schema inference | An engine guessing column types from a sample of documents. |
| Semi-structured data | Data with structure carried in the data itself (keys, nesting) rather than a fixed table schema. |
| Sibling arrays | Two arrays on the same parent, such as items and payments. |
| STRUCT | A value with a fixed set of named, typed fields; accessed with dots. |
| Typed staging (silver) | A model that turns raw documents into typed columns at a stated grain, with tests. |
| VARIANT | A type that stores semi-structured values in binary form (Snowflake; Spark 4). |

> **The main idea:** if you can define grain, outer unnest, fan-out, JSON null vs missing, and schema drift in one sentence each, you can handle most semi-structured interview questions.

---

<a id="slide-31"></a>
## 31. Recap and practice plan

*Reference · what to remember*

1. Land raw JSON unchanged; build typed models from it.
2. `->` keeps JSON, `->>` gives text; cast explicitly (DECIMAL for money) and parenthesise arrow expressions.
3. Declare schemas for anything reused; a declared schema still needs a check that expected keys arrive.
4. If the answer is per parent, compute it inside the list: no new rows, no fan-out.
5. UNNEST changes the grain on purpose: predict the row count, and key the new grain with the parent key plus the position.
6. Inner unnests drop empty and missing arrays; use the outer form when parents must survive.
7. Parent-level values are summed at parent grain; parents are counted with COUNT(DISTINCT).
8. Never unnest sibling arrays together: one CTE per array, aggregate, then join.
9. Missing key, JSON null, and empty are different facts; decide a policy per field before casting.
10. Profile keys and types, coalesce versions explicitly, quarantine cast failures, and test contracts on every load.

#### Practice plan (one week)

- Day 1: exercises 1–3 from memory; redraw the four-state table from lesson 14.
- Day 2: exercises 4–5 aloud with a timer, as in a live screen.
- Day 3: exercises 6–7; then answer interview questions 3 and 4 aloud.
- Day 4: exercise 8; write the contract checks for a JSON feed you know.
- Day 5: the lab and exercises 9–10; run the Spark port if you have Spark (Fabric or Databricks notebook).

#### Further practice

- [Snowflake FLATTEN examples](https://docs.snowflake.com/en/sql-reference/functions/flatten): nested and recursive flattening.
- [BigQuery: work with arrays](https://cloud.google.com/bigquery/docs/arrays): UNNEST, WITH OFFSET, and correlated joins.
- [Spark SQL functions](https://spark.apache.org/docs/latest/api/sql/index.html): search `explode_outer`, `posexplode`, `from_json`, `schema_of_json`.
- [Open Food Facts exports](https://world.openfoodfacts.org/data): when you are ready, run the lab on a real sample (respect the ODbL licence).

> **On the job:** Next in the series: the dbt decks turn these queries into staging models with sources, tests, and documentation; the Fuel Smart project uses this lab’s models for its Open Food Facts release.

> **The main idea:** type it, decide the grain, keep the parents, count the parents, and test the shape: that is semi-structured SQL in five words each.

---

<a id="slide-32"></a>
## 32. References and how this deck was tested

*References · official documentation and what to read there*

| Source | What to read there |
|---|---|
| [DuckDB: JSON overview](https://duckdb.org/docs/stable/data/json/overview), [JSON functions](https://duckdb.org/docs/stable/data/json/json_functions) | The JSON type, `->` / `->>`, paths, `json_transform`, `json_each`, `json_group_structure`. |
| [DuckDB: loading JSON](https://duckdb.org/docs/stable/data/json/loading_json) | `read_json` options: `columns`, `format`, inference, `read_json_objects`. |
| [DuckDB: UNNEST](https://duckdb.org/docs/stable/sql/query_syntax/unnest), [FROM and LATERAL](https://duckdb.org/docs/stable/sql/query_syntax/from) | `recursive`, `max_depth`, lateral joins, `WITH ORDINALITY`. |
| [STRUCT](https://duckdb.org/docs/stable/sql/data_types/struct), [LIST](https://duckdb.org/docs/stable/sql/data_types/list), [MAP](https://duckdb.org/docs/stable/sql/data_types/map), [list functions](https://duckdb.org/docs/stable/sql/functions/list), [lambdas](https://duckdb.org/docs/stable/sql/functions/lambda) | Nested types and computing inside them. |
| [DuckDB: CAST and TRY_CAST](https://duckdb.org/docs/stable/sql/expressions/cast) | What fails and what returns NULL. |
| [PostgreSQL: JSON functions](https://www.postgresql.org/docs/current/functions-json.html), [JSON types](https://www.postgresql.org/docs/current/datatype-json.html), [LATERAL](https://www.postgresql.org/docs/current/queries-table-expressions.html) | `jsonb` vs `json`, `jsonb_array_elements`, SQL/JSON path, lax mode. |
| [PGlite](https://pglite.dev/docs/) | Running PostgreSQL locally inside Node.js (used for lesson 18). |
| [Spark SQL functions](https://spark.apache.org/docs/latest/api/sql/index.html), [LATERAL VIEW](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-lateral-view.html), [JSON files](https://spark.apache.org/docs/latest/sql-data-sources-json.html) | `from_json`, `explode_outer`, `posexplode`, JSON reader options. |
| [Snowflake: querying semi-structured data](https://docs.snowflake.com/en/user-guide/querying-semistructured), [FLATTEN](https://docs.snowflake.com/en/sql-reference/functions/flatten) | VARIANT paths, casts, `OUTER`, `RECURSIVE`. |
| [BigQuery: arrays](https://cloud.google.com/bigquery/docs/arrays), [JSON functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions) | `UNNEST` joins, `WITH OFFSET`, `JSON_VALUE` vs `JSON_QUERY`. |
| [T-SQL: OPENJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/openjson-transact-sql), [JSON_VALUE](https://learn.microsoft.com/en-us/sql/t-sql/functions/json-value-transact-sql), [Fabric Warehouse surface area](https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area) | APPLY patterns, lax and strict paths, Fabric limits. |
| [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259), [RFC 9535: JSONPath](https://www.rfc-editor.org/rfc/rfc9535) | The standards behind documents and paths. |
| [Open Food Facts data](https://world.openfoodfacts.org/data), [API and field reference](https://openfoodfacts.github.io/openfoodfacts-server/api/) | The real export shape behind the lab; ODbL licence. |
| [Python json](https://docs.python.org/3/library/json.html), [pytest](https://docs.pytest.org/en/stable/) | The lab’s independent check and tests. |

**How this deck was tested:** DuckDB 1.5.6 on CPython 3.12.10, Windows 11; PostgreSQL 18.3 in PGlite 0.5.8 on Node.js. Every DuckDB query, PostgreSQL query, Python block, the lab runner, and the lab’s pytest suite ran during the build; the build fails on any error, unexpected result, or unordered multi-row result. Spark SQL, Snowflake, BigQuery, and T-SQL snippets are reference only, labelled not executed. Interview patterns were researched in October 2026; all questions are original. Fixtures are synthetic.

> **The main idea:** official documentation for the spelling, executed examples for the semantics: check both before you trust a flattening query.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Predict before you run: arrows on missing and null

Look at the two documents in lesson 3’s trap table. Which keys are missing, which are JSON null? Lesson 14 has the four states and what each function returns for them.

<a id="hint-2"></a>
### Hint 2 · Units sold per city from raw JSON

Cast the items array to `JSON[]` and unnest it; `qty` is sometimes a string, so extract it with `->>` and cast. `coalesce` the city.

<a id="hint-3"></a>
### Hint 3 · Predict the row counts of three unnests

(a) is the sum of list lengths. (b) adds one row per order whose list is empty or missing. (c) is the sum of tag-list lengths over all lines, and a line with `[]` or `null` tags contributes nothing.

<a id="hint-4"></a>
### Hint 4 · Revenue and orders per SKU, across both API versions

Use the typed view. The unit price is `unit_price` in v1 and `price.amount` in v2. Count orders with `count(DISTINCT …)`: L-1006 has MON-01 on two lines.

<a id="hint-5"></a>
### Hint 5 · Shipping on orders with an indoor plant (find the bug)

How many indoor-tagged rows does L-1006 produce? “Has at least one” is a semi-join question (*SQL correctness: joins, grain, and NULLs*, lesson 11); here it can be a list function at order grain.

<a id="hint-6"></a>
### Hint 6 · Order-level reconciliation from two sibling arrays

Aggregate each array in its own CTE (or with list functions on a typed version), keyed by order; join the totals at order grain. Prices live in two places.

<a id="hint-7"></a>
### Hint 7 · Orders and units per tag, keeping untagged lines

Inner unnest for lines, outer for tags (`LEFT JOIN UNNEST(…) ON true`), then `coalesce(tag, '(no tags)')`. Orders are `count(DISTINCT)`; units are the line’s quantity, once per (line, tag).

<a id="hint-8"></a>
### Hint 8 · API v3 arrives: handle three versions and catch the next one

Profile the keys first (`json_each` on each line, lesson 15). Then `coalesce` the paths in priority order, dividing cents by 100. Keep the allow-list in one place so the check and the model agree.

<a id="hint-9"></a>
### Hint 9 · Sugar in the top three ingredients, then port it to Spark SQL

`top_position` and `depth` are already in `product_ingredients`. In Spark, `posexplode` gives a 0-based position.

<a id="hint-10"></a>
### Hint 10 · Take-home: a vegan claim with honest unknowns

Start from `stg_products` so no product is lost, `LEFT JOIN` the ingredient rows, and use filtered counts per product. Check the “not vegan” rule before the “vegan” rule.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Predict before you run: arrows on missing and null

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")

rows = con.execute("""
    SELECT doc ->> 'order_id' AS order_id, p.path,
           CAST(json_extract(doc, p.path) AS VARCHAR) AS arrow,
           json_extract_string(doc, p.path)           AS double_arrow,
           json_type(doc, p.path)                     AS json_type,
           json_exists(doc, p.path)                   AS key_exists
    FROM raw_orders,
         (VALUES ('$.customer.address'), ('$.customer.address.city'),
                 ('$.customer.country'), ('$.items')) AS p(path)
    WHERE doc ->> 'order_id' IN ('L-1005', 'L-1009')
    ORDER BY order_id, p.path""").fetchall()
for r in rows:
    print(r)
got = {(r[0], r[1]): r[2:] for r in rows}
assert got[("L-1005", "$.customer.address")] == ("null", None, "NULL", True)    # JSON null
assert got[("L-1005", "$.customer.address.city")] == (None, None, None, False) # path through null
assert got[("L-1005", "$.items")] == (None, None, None, False)                 # missing key
assert got[("L-1009", "$.customer.address")] == (None, None, None, False)      # missing key
assert got[("L-1009", "$.customer.country")] == ("null", None, "NULL", True)   # JSON null
```

Output:

```text
('L-1005', '$.customer.address', 'null', None, 'NULL', True)
('L-1005', '$.customer.address.city', None, None, None, False)
('L-1005', '$.customer.country', '"US"', 'US', 'VARCHAR', True)
('L-1005', '$.items', None, None, None, False)
('L-1009', '$.customer.address', None, None, None, False)
('L-1009', '$.customer.address.city', None, None, None, False)
('L-1009', '$.customer.country', 'null', None, 'NULL', True)
('L-1009', '$.items', '[{"sku":"CAC-02","name":"Bunny-ear cactus","qty":2,"price":{"amount":"12.00","currency":"USD"},"tags":["indoor"]}]', '[{"sku":"CAC-02","name":"Bunny-ear cactus","qty":2,"price":{"amount":"12.00","currency":"USD"},"tags":["indoor"]}]', 'ARRAY', True)
```

**Why.** Only `->` (shown cast to text) and `json_type` distinguish JSON null (`null`, `'NULL'`) from a missing key (SQL NULL); `json_exists` says whether the key is there at all. A path that walks *through* a JSON null behaves like a missing key. **Common wrong answer:** “`->>` returns the text `'null'` for a JSON null”; it returns SQL NULL. **Interviewer follow-up:** “How would you count customers whose country was explicitly cleared?” → `count(*) FILTER (WHERE json_type(doc, '$.customer.country') = 'NULL')`.

<a id="solution-2"></a>
### Solution 2 · Units sold per city from raw JSON

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")

rows = con.execute("""
    SELECT coalesce(doc ->> '$.customer.address.city', '(unknown)') AS city,
           sum(CAST(u.e ->> 'qty' AS INTEGER))                     AS units
    FROM raw_orders,
         UNNEST(CAST(doc -> 'items' AS JSON[])) AS u(e)
    WHERE doc ->> 'status' = 'shipped'
    GROUP BY city
    ORDER BY city""").fetchall()
print(rows)
assert dict(rows) == {"(unknown)": 5, "Austin": 6, "Denver": 3, "Seattle": 5}
assert sum(u for _, u in rows) == 19
```

Output:

```text
[('(unknown)', 5), ('Austin', 6), ('Denver', 3), ('Seattle', 5)]
```

**Why it works.** Units are a line-level measure, so summing after the unnest is correct here (unlike shipping in lesson 11). The cast turns `"2"` and `2` into the same integer. **Common wrong answer:** `sum(u.e -> 'qty')` or summing the text, which fails to bind, or `count(*)`, which counts lines (11), not units. **Interviewer follow-up:** “Unknown city is too vague” → fall back to the ZIP or country: `coalesce(city, 'zip ' || zip, country, '(unknown)')`, and report how many orders needed the fallback.

<a id="solution-3"></a>
### Solution 3 · Predict the row counts of three unnests

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")
con.execute("""CREATE VIEW orders AS SELECT * FROM read_json('data/orders.jsonl', columns = {
    order_id: 'VARCHAR', status: 'VARCHAR', api_version: 'INTEGER', shipping: 'DECIMAL(10, 2)',
    customer: 'STRUCT(id VARCHAR, country VARCHAR, address STRUCT(city VARCHAR, zip VARCHAR))',
    items: 'STRUCT(sku VARCHAR, qty INTEGER, unit_price DECIMAL(10, 2),
                   price STRUCT(amount DECIMAL(10, 2), currency VARCHAR), tags VARCHAR[])[]',
    payments: 'STRUCT("method" VARCHAR, amount DECIMAL(10, 2))[]'})""")

q = {
    "a inner items":        "FROM orders AS o, UNNEST(o.items) AS u(item)",
    "b outer items":        "FROM orders AS o LEFT JOIN UNNEST(o.items) AS u(item) ON true",
    "c inner items, tags":  "FROM orders AS o, UNNEST(o.items) AS u(item), UNNEST(u.item.tags) AS t(tag)",
}
got = {k: con.execute(f"SELECT count(*), count(DISTINCT o.order_id) {v}").fetchone() for k, v in q.items()}
for k, v in got.items():
    print(f"{k:<20} rows={v[0]:>2}  orders={v[1]}")
assert got == {"a inner items": (11, 7), "b outer items": (13, 9), "c inner items, tags": (12, 6)}
```

Output:

```text
a inner items        rows=11  orders=7
b outer items        rows=13  orders=9
c inner items, tags  rows=12  orders=6
```

**Why.** (a) 2+1+1+0+3+1+2+1 = 11 rows, 7 orders (L-1004 empty, L-1005 missing). (b) the two vanished orders return with one NULL row each: 13 rows, 9 orders. (c) tags per line: 2+1, 1, 0, 2+2+0, 1, 1+1, 1 = 12 rows; L-1003’s only line has `[]` tags, so it vanishes too: 6 orders. **Common wrong answer:** (c) = 11 × something, or forgetting that an inner level can remove a parent that survived the first level. **Interviewer follow-up:** “Keep lines without tags” → `LEFT JOIN UNNEST(u.item.tags) AS t(tag) ON true` at the inner level: 14 rows.

<a id="solution-4"></a>
### Solution 4 · Revenue and orders per SKU, across both API versions

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")
con.execute("""CREATE VIEW orders AS SELECT * FROM read_json('data/orders.jsonl', columns = {
    order_id: 'VARCHAR', status: 'VARCHAR', api_version: 'INTEGER', shipping: 'DECIMAL(10, 2)',
    customer: 'STRUCT(id VARCHAR, country VARCHAR, address STRUCT(city VARCHAR, zip VARCHAR))',
    items: 'STRUCT(sku VARCHAR, qty INTEGER, unit_price DECIMAL(10, 2),
                   price STRUCT(amount DECIMAL(10, 2), currency VARCHAR), tags VARCHAR[])[]',
    payments: 'STRUCT("method" VARCHAR, amount DECIMAL(10, 2))[]'})""")

rows = con.execute("""
    SELECT u.item.sku                                                            AS sku,
           count(DISTINCT o.order_id)                                            AS orders,
           sum(u.item.qty)                                                       AS units,
           sum(u.item.qty * coalesce(u.item.unit_price, u.item.price.amount))    AS revenue
    FROM orders AS o, UNNEST(o.items) AS u(item)
    WHERE o.status = 'shipped'
    GROUP BY sku
    ORDER BY revenue DESC, sku""").fetchall()
for r in rows:
    print(r)
check = con.execute("""
    SELECT sum(list_sum(list_transform(items, i -> i.qty * coalesce(i.unit_price, i.price.amount))))
    FROM orders WHERE status = 'shipped'""").fetchone()[0]
total = sum(r[3] for r in rows)
assert len(rows) == 5 and rows[0][0] == "MON-01" and float(rows[0][3]) == 87.0 and rows[0][1] == 2
assert float(total) == float(check) == 244.5
```

Output:

```text
('MON-01', 2, 3, Decimal('87.00'))
('FIC-03', 2, 3, Decimal('54.00'))
('SUC-07', 2, 7, Decimal('42.00'))
('CAC-02', 2, 3, Decimal('36.00'))
('POT-12', 2, 3, Decimal('25.50'))
```

**Why it works.** Revenue is a line-level measure, so it is summed at line grain; the number of orders is a parent count, so it is `count(DISTINCT)`. The cross-check computes the same total without creating rows. **Common wrong answer:** `count(*) AS orders` (MON-01 would show 3), or `i.unit_price` only (v2 revenue silently NULL, total 170.00). **Interviewer follow-up:** “Show SKUs with zero sales too” → start from a product dimension and `LEFT JOIN` the per-SKU result.

<a id="solution-5"></a>
### Solution 5 · Shipping on orders with an indoor plant (find the bug)

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")
con.execute("""CREATE VIEW orders AS SELECT * FROM read_json('data/orders.jsonl', columns = {
    order_id: 'VARCHAR', status: 'VARCHAR', api_version: 'INTEGER', shipping: 'DECIMAL(10, 2)',
    customer: 'STRUCT(id VARCHAR, country VARCHAR, address STRUCT(city VARCHAR, zip VARCHAR))',
    items: 'STRUCT(sku VARCHAR, qty INTEGER, unit_price DECIMAL(10, 2),
                   price STRUCT(amount DECIMAL(10, 2), currency VARCHAR), tags VARCHAR[])[]',
    payments: 'STRUCT("method" VARCHAR, amount DECIMAL(10, 2))[]'})""")

wrong = con.execute("""
    SELECT sum(o.shipping) FROM orders AS o, UNNEST(o.items) AS u(item), UNNEST(u.item.tags) AS t(tag)
    WHERE t.tag = 'indoor' AND o.status = 'shipped'""").fetchone()[0]
right = con.execute("""
    SELECT sum(shipping) FROM orders
    WHERE status = 'shipped'
      AND len(list_filter(items, i -> list_contains(i.tags, 'indoor'))) > 0""").fetchone()[0]
also_right = con.execute("""
    SELECT sum(o.shipping) FROM orders AS o
    WHERE o.status = 'shipped'
      AND EXISTS (SELECT 1 FROM UNNEST(o.items) AS u(item) WHERE list_contains(u.item.tags, 'indoor'))""").fetchone()[0]
print("colleague:", wrong, "| fixed:", right, "| with EXISTS:", also_right)
assert float(wrong) == 24.95 and float(right) == float(also_right) == 19.96
```

Output:

```text
colleague: 24.95 | fixed: 19.96 | with EXISTS: 19.96
```

**Why.** L-1006 has two Monstera lines, both tagged indoor, so its 4.99 is summed twice. Qualifying orders are L-1001, L-1002, L-1006, L-1007 (4.99 each) and L-1009 (free shipping): 19.96. Filtering at order grain (a list function, or `EXISTS` over the unnested items) never creates the duplicate rows. **Common wrong answer:** `sum(DISTINCT o.shipping)`, which returns 4.99 because every order pays the same fee. **Interviewer follow-up:** “Now per tag” → the parent measure must be attributed per (order, tag) pair once: `SELECT DISTINCT order_id, tag` first, then join shipping.

<a id="solution-6"></a>
### Solution 6 · Order-level reconciliation from two sibling arrays

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")

rows = con.execute("""
    WITH lines AS (
        SELECT doc ->> 'order_id' AS order_id,
               sum(CAST(e ->> 'qty' AS INTEGER) *
                   CAST(coalesce(e ->> 'unit_price', e ->> '$.price.amount') AS DECIMAL(10, 2))) AS items_amount
        FROM raw_orders, UNNEST(CAST(doc -> 'items' AS JSON[])) AS u(e)
        GROUP BY 1),
    pays AS (
        SELECT doc ->> 'order_id' AS order_id,
               sum(CAST(p ->> 'amount' AS DECIMAL(10, 2))) AS paid
        FROM raw_orders, UNNEST(CAST(doc -> 'payments' AS JSON[])) AS v(p)
        GROUP BY 1)
    SELECT doc ->> 'order_id' AS order_id, l.items_amount,
           CAST(doc ->> 'shipping' AS DECIMAL(10, 2)) AS shipping, p.paid,
           p.paid - (l.items_amount + CAST(doc ->> 'shipping' AS DECIMAL(10, 2))) AS difference
    FROM raw_orders
    JOIN lines AS l ON l.order_id = (doc ->> 'order_id')   -- parentheses: lesson 4
    JOIN pays  AS p ON p.order_id = (doc ->> 'order_id')
    WHERE doc ->> 'status' = 'shipped'
    ORDER BY order_id""").fetchall()
for r in rows:
    print(r)
assert len(rows) == 7 and all(r[4] == 0 for r in rows)
```

Output:

```text
('L-1001', Decimal('46.00'), Decimal('4.99'), Decimal('50.99'), Decimal('0.00'))
('L-1002', Decimal('36.00'), Decimal('4.99'), Decimal('40.99'), Decimal('0.00'))
('L-1003', Decimal('18.00'), Decimal('4.99'), Decimal('22.99'), Decimal('0.00'))
('L-1006', Decimal('70.00'), Decimal('4.99'), Decimal('74.99'), Decimal('0.00'))
('L-1007', Decimal('18.00'), Decimal('4.99'), Decimal('22.99'), Decimal('0.00'))
('L-1008', Decimal('32.50'), Decimal('4.99'), Decimal('37.49'), Decimal('0.00'))
('L-1009', Decimal('24.00'), Decimal('0.00'), Decimal('24.00'), Decimal('0.00'))
```

**Why it works.** Each CTE has exactly one row per order, so the joins are one-to-one and nothing multiplies. The difference column turns the business rule into a test. **Common wrong answer:** unnesting items and payments in one FROM (lesson 12): L-1006 would show 140.00 and 224.97. **Interviewer follow-up:** “Some orders have refunds in a third array” → a third CTE, and the rule becomes paid − refunded = items + shipping; never a third unnest in the same FROM.

<a id="solution-7"></a>
### Solution 7 · Orders and units per tag, keeping untagged lines

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")
con.execute("""CREATE VIEW orders AS SELECT * FROM read_json('data/orders.jsonl', columns = {
    order_id: 'VARCHAR', status: 'VARCHAR', api_version: 'INTEGER', shipping: 'DECIMAL(10, 2)',
    customer: 'STRUCT(id VARCHAR, country VARCHAR, address STRUCT(city VARCHAR, zip VARCHAR))',
    items: 'STRUCT(sku VARCHAR, qty INTEGER, unit_price DECIMAL(10, 2),
                   price STRUCT(amount DECIMAL(10, 2), currency VARCHAR), tags VARCHAR[])[]',
    payments: 'STRUCT("method" VARCHAR, amount DECIMAL(10, 2))[]'})""")

rows = con.execute("""
    SELECT coalesce(t.tag, '(no tags)')   AS tag,
           count(DISTINCT o.order_id)     AS orders,
           sum(u.item.qty)                AS units
    FROM orders AS o
    JOIN UNNEST(o.items) AS u(item) ON true
    LEFT JOIN UNNEST(u.item.tags) AS t(tag) ON true
    WHERE o.status = 'shipped'
    GROUP BY 1
    ORDER BY orders DESC, tag""").fetchall()
for r in rows:
    print(r)
assert rows == [("indoor", 5, 8), ("(no tags)", 2, 4), ("ceramic", 2, 3), ("large", 2, 3), ("outdoor", 1, 4)]
```

Output:

```text
('indoor', 5, 8)
('(no tags)', 2, 4)
('ceramic', 2, 3)
('large', 2, 3)
('outdoor', 1, 4)
```

**Why it works.** Each (line, tag) row carries its line’s quantity once, so units per tag are right; a line with two tags appears under both, which is intended: tags overlap, so the units column does not add up to total units (19), and the report should say so. **Common wrong answer:** an inner unnest of tags, which silently drops L-1003 and the cactus line (the `(no tags)` bucket disappears), or `count(*)` as orders. **Interviewer follow-up:** “Make the units add up” → assign each line to one primary tag (the first, by position) or report overlapping tags with a note.

<a id="solution-8"></a>
### Solution 8 · API v3 arrives: handle three versions and catch the next one

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE raw_orders AS SELECT json AS doc FROM read_json_objects('data/orders.jsonl')")

con.execute("""CREATE TABLE raw_all AS
    SELECT doc FROM raw_orders
    UNION ALL
    SELECT '{"api_version": 3, "order_id": "L-1011", "status": "shipped", "shipping": 4.99,
             "items": [{"sku": "MON-01", "quantity": 2, "price": {"amount_minor": 2900, "currency": "USD"}},
                       {"sku": "POT-12", "quantity": 1, "price": {"amount_minor": 850, "currency": "USD"}}]}'::JSON""")
lines = con.execute("""
    SELECT doc ->> 'order_id' AS order_id, u.n AS line_no,
           CAST(coalesce(e ->> 'qty', e ->> 'quantity') AS INTEGER) AS qty,
           coalesce(CAST(e ->> 'unit_price' AS DECIMAL(10, 2)),
                    CAST(e ->> '$.price.amount' AS DECIMAL(10, 2)),
                    CAST(e ->> '$.price.amount_minor' AS DECIMAL(12, 2)) / 100)::DECIMAL(10, 2) AS unit_price
    FROM raw_all, UNNEST(CAST(doc -> 'items' AS JSON[])) WITH ORDINALITY AS u(e, n)
    ORDER BY order_id, line_no""").fetchall()

def unknown_keys(allowed):
    return con.execute("""
        SELECT DISTINCT k.key FROM raw_all, UNNEST(CAST(doc -> 'items' AS JSON[])) AS u(e), json_each(e) AS k
        WHERE NOT list_contains(?, k.key) ORDER BY 1""", [allowed]).fetchall()

v2_keys = ["sku", "name", "qty", "unit_price", "price", "tags"]
print("before:", unknown_keys(v2_keys))
print("after: ", unknown_keys(v2_keys + ["quantity"]))
print(lines[-2:])
assert len(lines) == 13 and all(q is not None and p is not None for _, _, q, p in lines)
assert lines[-2][2:] == (2, 29) and unknown_keys(v2_keys) == [("quantity",)] and unknown_keys(v2_keys + ["quantity"]) == []
```

Output:

```text
before: [('quantity',)]
after:  []
[('L-1011', 1, 2, Decimal('29.00')), ('L-1011', 2, 1, Decimal('8.50'))]
```

**Why it works.** Each version contributes one path to each `coalesce`, so every line is priced exactly once; the cents path is converted at the boundary. The key check sees `quantity` because it is a new *line* key; `amount_minor` is inside `price`, so a nested check (or a per-version required-field test such as “no NULL unit price”) is what catches it. **Common wrong answer:** fixing only the price and missing the qty rename (qty NULL, revenue NULL). **Interviewer follow-up:** “How do you know which version wins if a line has both fields?” → write the precedence down, test a document with both, and ask the source team to version the payload.

<a id="solution-9"></a>
### Solution 9 · Sugar in the top three ingredients, then port it to Spark SQL

```python
import duckdb
LAB = "sql-semi-structured-lab"          # path to the lab folder from where you run this
con = duckdb.connect()
con.execute(f"SET file_search_path = '{LAB}'")
for name in ("01_stg_products.sql", "02_product_ingredients.sql", "03_products_per_ingredient.sql"):
    con.execute(open(f"{LAB}/sql/{name}", encoding="utf-8").read())

rows = con.execute("""
    SELECT p.product_name,
           max(i.ingredient_id) FILTER (WHERE i.depth = 1 AND i.top_position = 1)                     AS first_ingredient,
           coalesce(bool_or(i.ingredient_id = 'en:sugar' AND i.depth = 1 AND i.top_position <= 3), false) AS sugar_in_top3
    FROM stg_products AS p
    JOIN product_ingredients AS i USING (code)
    GROUP BY p.product_name
    ORDER BY p.product_name""").fetchall()
for r in rows:
    print(r)
assert len(rows) == 9
assert {r[0] for r in rows if r[2]} == {"Chocolate chip cookies", "Protein crisp bar"}
```

Output:

```text
('Chocolate chip cookies', 'en:wheat-flour', True)
('Classic hummus', 'en:chickpea', False)
('Crunchy peanut butter', 'en:peanut', False)
('Greek style yogurt', 'en:milk', False)
('Oat & honey granola', 'en:oat-flakes', False)
('Protein crisp bar', 'en:milk-protein', True)
('Red lentil pasta', 'en:red-lentil-flour', False)
('Sparkling water', 'en:carbonated-water', False)
('Tomato & basil soup', 'en:tomato', False)
```

*Spark SQL (reference, not executed):*

```sql
-- Spark SQL port (reference, not executed): positions from posexplode are 0-based
SELECT product_name,
       max(CASE WHEN pos = 0 THEN ing.id END)                             AS first_ingredient,
       coalesce(bool_or(ing.id = 'en:sugar' AND pos < 3), false)          AS sugar_in_top3
FROM stg_products
LATERAL VIEW posexplode(ingredients) t AS pos, ing
GROUP BY product_name
ORDER BY product_name;
```

**Why it works.** The position is captured during the unnest, so “top three” is a filter on a column, not on result order. The Spark port changes only the spelling and the base (0 vs 1); the inner `LATERAL VIEW` drops products without ingredients, exactly as the inner join does here. **Common wrong answer:** `pos <= 3` in Spark (that is the top four), or counting sub-ingredients (the cookies’ chocolate-chip sugar is depth 2). **Interviewer follow-up:** “Include products with no ingredient data as unknown” → `LEFT JOIN` here, `LATERAL VIEW OUTER` in Spark, and a three-valued result.

<a id="solution-10"></a>
### Solution 10 · Take-home: a vegan claim with honest unknowns

```python
import duckdb
LAB = "sql-semi-structured-lab"          # path to the lab folder from where you run this
con = duckdb.connect()
con.execute(f"SET file_search_path = '{LAB}'")
for name in ("01_stg_products.sql", "02_product_ingredients.sql", "03_products_per_ingredient.sql"):
    con.execute(open(f"{LAB}/sql/{name}", encoding="utf-8").read())

rows = con.execute("""
    WITH per_product AS (
        SELECT p.product_name, p.ingredients_state,
               count(i.ingredient_id)                             AS occurrences,
               count(*) FILTER (WHERE i.vegan = 'no')             AS no_flags,
               count(*) FILTER (WHERE i.vegan = 'yes')            AS yes_flags
        FROM stg_products AS p
        LEFT JOIN product_ingredients AS i USING (code)
        GROUP BY ALL)
    SELECT product_name,
           CASE WHEN occurrences = 0           THEN 'no ingredient data'
                WHEN no_flags > 0              THEN 'not vegan'
                WHEN yes_flags = occurrences   THEN 'vegan'
                ELSE 'unknown' END AS vegan_claim
    FROM per_product
    ORDER BY vegan_claim, product_name""").fetchall()
for r in rows:
    print(r)
from collections import Counter
assert Counter(c for _, c in rows) == {"vegan": 4, "not vegan": 4, "unknown": 1, "no ingredient data": 2}
assert ("Tomato & basil soup", "unknown") in rows and ("Chocolate chip cookies", "not vegan") in rows
```

Output:

```text
('Loose leaf green tea', 'no ingredient data')
('Trail mix bar', 'no ingredient data')
('Chocolate chip cookies', 'not vegan')
('Greek style yogurt', 'not vegan')
('Oat & honey granola', 'not vegan')
('Protein crisp bar', 'not vegan')
('Tomato & basil soup', 'unknown')
('Classic hummus', 'vegan')
('Crunchy peanut butter', 'vegan')
('Red lentil pasta', 'vegan')
('Sparkling water', 'vegan')
```

**Why it works.** Counting flags per product handles missing values explicitly: a missing `vegan` key is neither yes nor no, so the product can’t be called vegan. The soup’s basil is `maybe`, so it is unknown; the yogurt’s live cultures have no flag, but its milk is `no`, so it is not vegan. Starting from `stg_products` keeps the trail mix and tea visible. **Common wrong answer:** `bool_and(vegan = 'yes')`, which ignores NULL flags and calls a product with an unflagged ingredient vegan, or an inner join that silently drops the two products without ingredients. **Interviewer follow-up:** “Sub-ingredients say yes but the parent says maybe” → decide which level is authoritative, write it down, and test the cookies’ chocolate chips as the example.
