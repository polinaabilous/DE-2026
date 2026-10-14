# Modeling approaches: star, One Big Table, Data Vault, Activity Schema and Inmon

*Companion to `modeling-approaches.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, pytest for the lab, Windows 11 (64-bit). SQL is DuckDB’s PostgreSQL-flavoured dialect. Every DuckDB query in this document ran while it was built, and the result under it is the real result. **T-SQL (SQL Server, Fabric Warehouse), Spark SQL and Snowflake snippets were not executed** (no server, Java or cloud account on the build machine); each is labelled as reference only. Timings and file sizes on lesson 10 were measured on the build machine and will differ on yours. The data is a small, deterministic, hand-checkable fixture shipped with the lab.

**Scope (a gap deck):** it teaches only what earlier decks leave out. Facts, dimensions, grain, SCD types, conformed dimensions and the bus matrix are in the dimensional-modeling decks *Why dimensional modeling*, *Fact tables*, *Dimension tables* and *Model a business end to end*; dbt’s staging, intermediate and marts layers and how they line up with bronze, silver and gold are in *dbt fundamentals: source data to trusted marts* (slides 4, 12, 16 and 22). This deck recaps them in one line where needed and adds Inmon, One Big Table, Data Vault and Activity Schema, and the platform-level choice between them. Where the semantic layer sits and how marts are served to BI, reverse ETL, APIs and AI agents are left to the later *data serving architecture* deck. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common data-modeling interview patterns (research done in October 2026: Kimball vs Inmon, “explain Data Vault”, star vs One Big Table on a columnar warehouse, design-choice scenarios, where history lives, hash keys and idempotent loads, event modeling). All questions are original and use the Leafy data.

**Lab:** [`modeling-approaches-lab/`](modeling-approaches-lab/README.md) next to this file holds the fixture, the SQL for all five models, a runner, pytest tests, and a one-page OBT-vs-star decision template (slides 22–23).

**Additions beyond the original brief** are marked *(added)*: an executable Inmon-style 3NF integration layer, so “Inmon” is something you have queried, not only a name; hash keys, hashdiffs, ghost records and idempotent re-runs in Data Vault; load date vs business (effective) date, the most common Data Vault history mistake; DuckDB’s ASOF join as Activity Schema’s “last before” relationship; a measured star-vs-OBT comparison on 5 million rows (query time, Parquet size, rebuild cost); why Power BI semantic models prefer a star over one flat table; point-in-time (PIT) and bridge tables, at awareness level; a five-model lab with pytest that reconciles every model to one hand-checked answer; dialect notes for hash keys and ASOF joins (T-SQL, Spark SQL, Snowflake); “In your portfolio” notes for Fuel Smart.

## Contents

1. [Modeling approaches: star, One Big Table, Data Vault, Activity Schema and Inmon](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was executed](#slide-2)
3. [The running example: one Leafy question, five models](#slide-3)
4. [The modeling map: where each approach lives](#slide-4)
5. [Inmon: the integrated 3NF enterprise warehouse](#slide-5)
6. [Kimball vs Inmon: where integration happens](#slide-6)
7. [The Leafy star, in one slide](#slide-7)
8. [One Big Table: flatten the star for one consumer](#slide-8)
9. [What breaks in an OBT](#slide-9)
10. [Star or OBT? Measured on 5 million rows](#slide-10)
11. [A one-page OBT vs star decision](#slide-11)
12. [Data Vault in two minutes: hubs, links, satellites](#slide-12)
13. [Build the raw vault: hash keys and the first load](#slide-13)
14. [Insert-only loads: hashdiff, batch 2, and a safe replay](#slide-14)
15. [Query the vault: an information mart on top](#slide-15)
16. [When Data Vault fits, and when it is overkill](#slide-16)
17. [Activity Schema: the business as one stream](#slide-17)
18. [Temporal joins: “first after” and “last before”](#slide-18)
19. [One question, five models: the scorecard](#slide-19)
20. [Kimball, Inmon, Data Vault and OBT at platform level](#slide-20)
21. [Interview patterns: recognise which approach the question wants](#slide-21)
22. [Lab: one question, five models, one test suite](#slide-22)
23. [Lab steps: run, test, then push a change through](#slide-23)
24. [Bug clinic: believable modeling bugs](#slide-24)
25. [Interview questions and model answers](#slide-25)
26. [Exercises 1–5: shapes, grains, hashes and satellites](#slide-26)
27. [Exercises 6–10: streams, vault loads, design and a take-home](#slide-27)
28. [Cheat sheet](#slide-28)
29. [Glossary](#slide-29)
30. [Recap and what comes next](#slide-30)
31. [References and how this deck was tested](#slide-31)
32. [Appendix A · Hints](#appendix-a)
33. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Modeling approaches: star, One Big Table, Data Vault, Activity Schema and Inmon

**

You already know how to design a star schema. In interviews and on real platforms you will also meet an enterprise 3NF layer, a Data Vault, a wide “one big table” for a dashboard, and an event stream. Each one is a different answer to *where integration, history and convenience should live*. This deck builds all five for one business question, shows that they give the same answer, and shows what each costs when the data changes.

- **Part A, the landscape:** where each approach sits in the layers, Inmon’s 3NF enterprise warehouse, Kimball vs Inmon.
- **Part B, star vs One Big Table:** flatten a star, what breaks, measured costs, a one-page decision.
- **Part C, Data Vault:** hubs, links, satellites, hash keys, insert-only loads, information marts on top, when it fits.
- **Part D, Activity Schema:** one stream table, “first after” and “last before” joins.
- **Part E, choosing:** one question in five models, a platform-level comparison, interview patterns.
- **Practice:** a five-model lab with tests, a bug clinic, interview questions with model answers, and 10 exercises.

Every query ran in DuckDB while the deck was built; the result under each query is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

A star schema is the right default for analytics, but it is not the only model on a real platform. Upstream of the marts there is often an integration layer: an Inmon-style 3NF warehouse or a Data Vault that keeps every source’s history. Downstream there are wide “one big tables” for dashboards, ML features and exports, and some product teams model behaviour as one event stream. When you join a team you inherit one of these, and in interviews you are asked to compare them. This deck lets you **name each approach, build a small one, say what it is good at, and argue which layer it belongs in**.

#### Where you will use it

- Reading an existing platform: “our silver layer is a Data Vault”, “gold has OBTs for Looker”.
- Deciding whether a dashboard gets its own wide table or reads the star.
- Integrating a second source system without breaking existing marts.
- Answering “who did X, then Y within 7 days?” on event data.
- Writing the architecture section of a portfolio project or a design doc.

#### What goes wrong without it

- A wide table per dashboard, each with its own “customer”, and numbers that never match.
- A Data Vault built for one source and three reports: months of work, no faster answers.
- History lost because the integration layer overwrote changes.
- An OBT that silently double-counts an order-level amount.
- Interview answers that recite “top-down vs bottom-up” but cannot say when to choose which.

#### Who expects you to know it

- Analytics engineers: own marts, OBTs and the decision between them.
- Data engineers and architects: own the integration layer (3NF or Data Vault) and loading patterns.
- BI developers: need a star for Power BI semantic models.
- Interviewers: “Kimball vs Inmon”, “explain Data Vault”, and “star or OBT?” are standard modeling questions.

> **On the job:** A typical ticket: “Marketing wants a fast dashboard of revenue by segment and category, and Finance is onboarding a CRM next quarter.” A strong answer keeps the conformed star as the source of truth, adds one OBT at line grain for the dashboard, and plans how the CRM lands in the integration layer (a new satellite, not a rewrite), written up as a one-page decision.

> **The main idea:** every approach is an answer to where integration, history and convenience should live; knowing all five lets you put each in the right layer instead of arguing for one everywhere.

*Read more:* [Kimball Group: enterprise bus architecture](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/enterprise-data-warehouse-bus-architecture/), [Data vault modeling (Wikipedia)](https://en.wikipedia.org/wiki/Data_vault_modeling), [Activity Schema 2.0 specification](https://github.com/ActivitySchema/ActivitySchema/blob/main/2.0.md), [Fivetran: star schema vs OBT benchmark](https://www.fivetran.com/blog/star-schema-vs-obt).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Business users and BI tools need fast, understandable analysis | Kimball star (marts) | Facts and conformed dimensions; Power BI and most semantic layers expect it. |
| One dashboard, ML feature set or export with a fixed column list | One Big Table built from the star | No joins for consumers; rebuild is cheap at the fact grain. |
| Many sources, changing schemas, audit or regulatory history | Data Vault in the integration layer | Insert-only, source-traceable, new sources add tables instead of changing them. |
| A large enterprise wants one normalized, governed model of the business first | Inmon 3NF enterprise warehouse | Integration in one place; marts derived from it. |
| Behavioural questions about sequences of customer actions | Activity Schema stream (awareness) | Any activity relates to any other by customer and time. |
| A small team, one or two sources, a few dashboards | Not Data Vault; not Inmon | Staging → star (→ OBT) is enough; extra layers only add cost. |
| Many teams reuse the same dimensions with changing attributes | Not OBT as the source of truth | Every change forces a rebuild and copies diverge. |

#### How interviews test it

- “Compare Kimball and Inmon. Which would you choose today?” (where integration happens; usually both, in different layers).
- “Explain Data Vault in two minutes.” (hubs, links, satellites; insert-only; why marts still sit on top).
- “Star schema or one big table on Snowflake/BigQuery?” (consumers, history, rebuild cost, the BI tool).
- “Ten sources, an audit requirement, schema changes every month: design the warehouse layers.”
- “Where does history live?” (SCD2 dimension vs satellites vs an event stream).

#### Where it sits in your learning path

- Builds on the dimensional-modeling decks (facts, dimensions, grain, SCD2, conformed dimensions, bus matrix).
- Builds on dbt fundamentals (staging, intermediate, marts, and the medallion mapping on its slide 4).
- Next: the data serving architecture deck places the semantic layer and serves marts to BI, reverse ETL, APIs and AI agents.

> **The main idea:** default to staging → star → (OBT where a consumer needs it); add Data Vault or a 3NF layer only when integration and audit across many changing sources justify the cost.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was executed

*Start here · DuckDB from Python, one small fixture*

| Item | Detail |
|---|---|
| Tested engine | **DuckDB 1.5.6** (Python package) on **CPython 3.12.10**, Windows 11. The lab’s tests use pytest. |
| Dialect | DuckDB’s PostgreSQL-flavoured SQL. DuckDB conveniences used here: `QUALIFY`, `GROUP BY ALL`, `ASOF JOIN`, `SET VARIABLE` / `getvariable()`, and the `->>` JSON operator. Each is labelled where it first appears. |
| Other engines | Short notes show how hash keys and “last before” joins are written in **T-SQL** (SQL Server, Fabric Warehouse), **Spark SQL** and **Snowflake**. That syntax is reference only and was **not executed**: there is no server, Java runtime or cloud account on the build machine. |
| Minimum versions | DuckDB 1.1 or newer (`SET VARIABLE` arrived in 1.1; `ASOF JOIN` and JSON are older). Python 3.10+. |
| How results were produced | The build runs every query and prints the real result. A query that fails, returns an unexpected result, or returns several rows without `ORDER BY` is a build failure. Timings and file sizes in lesson 10 are labelled as measured on the build machine. |

#### Create the environment

```text
# Windows (PowerShell); on macOS/Linux: source .venv/bin/activate
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb pytest
cd modeling-approaches-lab
python run_lab.py            # builds all five models (lesson 22)
```

#### Check it

```python
import sys, duckdb
print("Python", sys.version.split()[0], "· DuckDB", duckdb.__version__)
print(duckdb.sql("""SELECT md5('C-001') AS hash_key,
                           json_object('segment', 'pro') ->> 'segment' AS from_json""").fetchall())
```

Output:

```text
Python 3.12.10 · DuckDB 1.5.6
[('3fd6b21e0b8802e3760819938215d216', 'pro')]
```

Two building blocks of this deck already work: `md5()` turns a business key into a fixed-length **hash key** (Data Vault, Part C), and `->>` reads a field out of a JSON value as text (Activity Schema, Part D).

> **On the job:** Modeling decisions are made on a whiteboard but proven on data. A local DuckDB copy of a small, hand-checked fixture is how you prototype a Data Vault load or an OBT before asking for warehouse capacity, and how you show a reviewer that two models agree.

> **The main idea:** one local engine, one deterministic fixture, every result executed. Prove a modeling choice on ten rows before you argue about it on ten billion.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: SET VARIABLE](https://duckdb.org/docs/stable/sql/statements/set_variable), [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions).

---

<a id="slide-3"></a>
## 3. The running example: one Leafy question, five models

*Start here · a fixture small enough to check by hand*

Leafy, the plant shop from earlier decks, lands six files from two source systems: the **shop** database (customers, products, orders, order lines, web events) and a loyalty **CRM** (contacts). Each row carries `_loaded_at`, the time the ingestion tool landed it. There are two batches: **16 March 06:00** and **1 April 06:00** (all times UTC). The staging models clean each file once, exactly as in *dbt fundamentals*; every model in this deck is built from them.

#### Staging (silver): two of the six models

*SQL · 00_staging.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE stg_crm_contacts AS
SELECT upper(trim(customer_ref)) AS customer_id,      -- ' c-001' and 'C-001 ' are the same customer
       email, loyalty_tier, _loaded_at
FROM read_csv('data/crm_contacts.csv', header = true,
     columns = {'customer_ref': 'VARCHAR', 'email': 'VARCHAR', 'loyalty_tier': 'VARCHAR',
                '_loaded_at': 'TIMESTAMP'});
```

*SQL · 00_staging.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE stg_web_events AS
SELECT event_id, customer_id, anonymous_id, event_name, product_id, event_at, _loaded_at
FROM read_csv('data/web_events.csv', header = true,
     columns = {'event_id': 'VARCHAR', 'customer_id': 'VARCHAR', 'anonymous_id': 'VARCHAR',
                'event_name': 'VARCHAR', 'product_id': 'VARCHAR', 'event_at': 'TIMESTAMP',
                '_loaded_at': 'TIMESTAMP'})
QUALIFY row_number() OVER (PARTITION BY event_id ORDER BY _loaded_at) = 1;   -- E06 was delivered twice
```

#### What landed

```sql
SELECT 'stg_shop_customers' AS staging_table, 'one row per customer version per batch' AS grain,
       count(*) AS row_count FROM stg_shop_customers
UNION ALL SELECT 'stg_crm_contacts', 'one row per CRM contact',        count(*) FROM stg_crm_contacts
UNION ALL SELECT 'stg_products',     'one row per product',            count(*) FROM stg_products
UNION ALL SELECT 'stg_orders',       'one row per order',              count(*) FROM stg_orders
UNION ALL SELECT 'stg_order_lines',  'one row per order line',         count(*) FROM stg_order_lines
UNION ALL SELECT 'stg_web_events',   'one row per event (deduplicated)', count(*) FROM stg_web_events
ORDER BY staging_table;
```

Result (6 rows):

| staging_table | grain | row_count |
|---|---|---|
| stg_crm_contacts | one row per CRM contact | 4 |
| stg_order_lines | one row per order line | 13 |
| stg_orders | one row per order | 9 |
| stg_products | one row per product | 5 |
| stg_shop_customers | one row per customer version per batch | 9 |
| stg_web_events | one row per event (deduplicated) | 10 |

- **History:** Ben (C-002) moved from *hobbyist* to *pro* on 20 March; Chloe (C-003) moved city on 28 March. The customer file is a snapshot per batch, with `updated_at` = when the change happened in the shop.
- **Two sources, one customer:** the CRM writes keys as `" c-001"` and `"C-002 "`; C-006 exists only in the CRM.
- **A guest order** (O-1003) has no customer; **a late order** (O-1006, placed 15 March) arrived in the second batch; event E06 was delivered twice.

#### The question every model must answer (Q1)

*“Net item revenue in March 2026 by customer segment **at the time of the order** and product category.”* Revenue = quantity × unit price (shipping is a separate order-level amount). Guest orders go to *unknown*.

| segment_at_order | category | revenue |
|---|---|---|
| hobbyist | Succulent | 36.00 |
| hobbyist | Tools | 12.00 |
| hobbyist | Tropical | 60.00 |
| pro | Succulent | 52.00 |
| pro | Tools | 12.00 |
| pro | Tropical | 105.00 |
| unknown | Tropical | 15.00 |

Worked out by hand from the files (total 292.00). Ben’s 8 March order counts as *hobbyist*; his 25 March order as *pro*.

#### Two follow-up questions

- **Q2, as-is:** the same revenue by the customer’s *current* segment. Only Ben’s first order (16.00) moves, from hobbyist to pro.
- **Q3, behaviour:** of the customers who viewed a product, who placed an order within 7 days of their *first* view? By hand: C-001, C-002, C-003 and C-005 did; C-004 ordered 9 days later. 4 of 5.

Q1 needs history and integration; Q2 needs “current”; Q3 needs time order between two kinds of event. Each approach in this deck finds a different one of them easy.

> **On the job:** Starting from a hand-checked answer is how experienced engineers review a new model: before reading any SQL, they ask “what should this return on ten rows?” and compare. The lab turns this table into a pytest test that all five models must pass.

> **The main idea:** one question with a known answer is the fairest way to compare modeling approaches: same input, same answer, different cost.

*Read more:* [DuckDB: CSV import](https://duckdb.org/docs/stable/data/csv/overview), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify).

---

<a id="slide-4"></a>
## 4. The modeling map: where each approach lives

*Part A · five approaches, one layer stack*

*Recap in one line:* *dbt fundamentals* (slide 4) lined up sources ≈ bronze, staging and intermediate ≈ silver, marts ≈ gold, with Kimball facts and dimensions in the marts. This lesson places five modeling approaches on that same stack. Four words first:

- **Normalization**: organising tables so each fact is stored once. **Third normal form (3NF)** means every non-key column depends on the key, the whole key, and nothing but the key, so a category name lives in one row of a category table, not on every product.
- **Denormalization**: deliberately repeating data (the category name on every sales row) to save joins for readers.
- The **integration layer** is where data about the same business thing from several sources is combined under one key and kept with its history. The **presentation layer** is what people and BI tools query.

| Approach | Unit of modeling | Shape | Typical layer | Optimises for |
|---|---|---|---|---|
| **Inmon** enterprise data warehouse (lesson 5) | Business entities and relationships | 3NF, normalized, many tables | Integration (silver) | One integrated, governed version of the business |
| **Kimball** star schema (lesson 7; dimensional decks) | Business process events (facts) + context (dimensions) | Denormalized dimensions, narrow facts | Presentation (gold marts) | Understandable, fast analysis; reuse via conformed dimensions |
| **One Big Table** (OBT, lessons 8–11) | One consumer’s question set | Fully denormalized, one wide table | Serving, on top of gold | Zero joins for the reader |
| **Data Vault** (lessons 12–16) | Business keys, relationships, descriptive history | Hubs, links, satellites; insert-only | Integration (silver) | Many changing sources, audit, parallel loading |
| **Activity Schema** (lessons 17–18) | An entity’s activities over time | One narrow event stream | Its own single layer | Sequence questions with no foreign keys |

1. **Bronze** (landed files and tables): Exactly as delivered, plus `_loaded_at`. No modeling.
2. **Silver** (staging, then integration): Clean once per source (staging). Large platforms add an integration model here: Inmon 3NF or a Data Vault.
3. **Gold** (marts): Kimball facts and conformed dimensions at declared grains: the source of truth for analysis.
4. **Serving** (projections for consumers): OBTs, extracts, semantic models. Where the semantic layer sits is the subject of the data serving architecture deck.

> **On the job:** When you read a new platform, place each schema on this map first: “raw_*” is bronze, “dv_*” or “edw_*” is an integration layer, “dim_/fct_” is gold, “obt_/wide_” is serving. Most “why don’t these numbers match?” incidents come from a consumer reading the wrong layer.

> **The main idea:** the approaches are not rivals for the same job: Inmon and Data Vault integrate, Kimball presents, OBT serves one consumer, and Activity Schema replaces the stack with one stream.

*Read more:* [dbt: how we structure our projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview), [Medallion architecture](https://learn.microsoft.com/en-us/azure/databricks/lakehouse/medallion), [Database normalization (Wikipedia)](https://en.wikipedia.org/wiki/Database_normalization).

---

<a id="slide-5"></a>
## 5. Inmon: the integrated 3NF enterprise warehouse

*Part A · what does “top-down” look like in tables?*

**Bill Inmon** defined a data warehouse as a *subject-oriented, integrated, time-variant and non-volatile* collection of data that supports management decisions. His architecture, the **Corporate Information Factory** (CIF), builds one **enterprise data warehouse** (EDW) first: atomic data from every source, integrated under common keys, in **3NF**, with history. Departmental **dependent data marts** (often dimensional) are then derived from the EDW. Because the enterprise model comes first, this is called **top-down**.

#### Leafy’s EDW: six normalized tables

*SQL · 01_inmon_3nf.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE edw_customer AS          -- one row per customer, from BOTH sources
SELECT customer_id, s.name, c.email, c.loyalty_tier
FROM (SELECT DISTINCT customer_id, name FROM stg_shop_customers) AS s
FULL JOIN stg_crm_contacts AS c USING (customer_id);
```

*SQL · 01_inmon_3nf.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE edw_customer_profile AS  -- history: one row per version
SELECT customer_id, city, segment, updated_at AS valid_from,
       lead(updated_at, 1, TIMESTAMP '9999-12-31') OVER (PARTITION BY customer_id ORDER BY updated_at) AS valid_to
FROM (SELECT DISTINCT customer_id, city, segment, updated_at FROM stg_shop_customers);
```

*SQL · 01_inmon_3nf.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE edw_product AS           -- category stored once, referenced by id
SELECT p.product_id, p.name, c.category_id
FROM stg_products AS p JOIN edw_product_category AS c ON c.category_name = p.category;
```

The other three tables (`edw_product_category`, `edw_sales_order`, `edw_sales_order_line`) are one-line copies; the full file is `sql/01_inmon_3nf.sql` in the lab.

#### Integrated, historized, stored once

```sql
SELECT (SELECT count(*) FROM edw_customer)                      AS customers,
       (SELECT count(*) FROM edw_customer WHERE email IS NOT NULL) AS with_crm_email,
       (SELECT count(*) FROM edw_customer_profile)              AS profile_versions,
       (SELECT count(*) FROM edw_product_category)              AS category_rows;
```

Result (1 row):

| customers | with_crm_email | profile_versions | category_rows |
|---|---|---|---|
| 6 | 4 | 7 | 3 |

- Six customers: the shop’s five plus C-006 from the CRM. One table answers “who is a customer?” for the whole company.
- Seven profile versions: Ben and Chloe each have two, with `valid_from`/`valid_to`.
- Three category rows: renaming “Tropical” is a one-row update, the classic benefit of 3NF.

**Coming from C#:** this is the normalized domain model you would map with Entity Framework for an application: great for consistency and updates, verbose to report from.

#### Q1 from the EDW: five tables, four joins

*SQL · Q1 from the 3NF warehouse*

```sql
SELECT coalesce(cp.segment, 'unknown') AS segment_at_order,
       cat.category_name                 AS category,
       sum(l.quantity * l.unit_price)    AS revenue
FROM edw_sales_order_line AS l
JOIN edw_sales_order      AS o   ON o.order_id = l.order_id
LEFT JOIN edw_customer_profile AS cp
       ON cp.customer_id = o.customer_id
      AND o.ordered_at >= cp.valid_from AND o.ordered_at < cp.valid_to     -- the version valid at order time
JOIN edw_product          AS p   ON p.product_id = l.product_id
JOIN edw_product_category AS cat ON cat.category_id = p.category_id
GROUP BY ALL
ORDER BY segment_at_order, category;
```

Result (7 rows):

| segment_at_order | category | revenue |
|---|---|---|
| hobbyist | Succulent | 36.00 |
| hobbyist | Tools | 12.00 |
| hobbyist | Tropical | 60.00 |
| pro | Succulent | 52.00 |
| pro | Tools | 12.00 |
| pro | Tropical | 105.00 |
| unknown | Tropical | 15.00 |

#### What it costs, and why marts exist

The answer is right, but the analyst had to know five tables, which join is “as-was”, and where the category name lives. Every report repeats that knowledge. Inmon’s answer is to put **dependent marts** on top: dimensional tables derived from the EDW for each department, so the joins are written once.

**Pitfall:** a 3NF EDW is a large up-front design. Teams that start here can spend months modeling the enterprise before the first dashboard ships, which is the main criticism of top-down delivery.

> **On the job:** You meet Inmon-style layers in banks, insurers, telcos and older enterprise warehouses (Teradata, Oracle, SQL Server) as an “EDW” or “core” schema in 3NF feeding marts. On a lakehouse the same idea often appears as an “enterprise silver” layer. Your work there is usually to build marts from it, not to change it.

> **The main idea:** Inmon integrates first: one normalized, historized model of the enterprise, then dependent marts for analysis. Strong consistency, slow first delivery, many joins for readers.

*Read more:* [Bill Inmon (Wikipedia)](https://en.wikipedia.org/wiki/Bill_Inmon), [Corporate Information Factory (Wikipedia)](https://en.wikipedia.org/wiki/Corporate_Information_Factory), [Third normal form (Wikipedia)](https://en.wikipedia.org/wiki/Third_normal_form).

---

<a id="slide-6"></a>
## 6. Kimball vs Inmon: where integration happens

*Part A · the classic interview comparison, made concrete*

**Ralph Kimball**’s approach is **bottom-up**: build one dimensional data mart per business process (sales, inventory, support) straight from staging, and integrate them through **conformed dimensions** planned on the **bus matrix** (both taught in *Dimension tables* and *Model a business end to end*). The set of conformed stars *is* the warehouse; there is no normalized EDW in between.

| Question | Inmon (top-down) | Kimball (bottom-up) |
|---|---|---|
| What is built first? | The enterprise model (3NF EDW) | One business process as a star |
| Where does integration happen? | In the EDW, once, for everything | In conformed dimensions shared by every star |
| What do users query? | Dependent marts derived from the EDW | The stars directly |
| Time to first value | Long: months of enterprise modeling | Short: one process at a time |
| Main risk | Big design up front; slow to change | Marts drift apart if dimensions are not really conformed |
| On a modern lakehouse | An “enterprise silver” or core layer | Gold marts: `dim_` and `fct_` tables |

#### Integration is hard in both: matching two sources’ keys

```sql
WITH shop AS (SELECT DISTINCT customer_id FROM read_csv('data/shop_customers.csv', header = true)),
     crm  AS (SELECT customer_ref FROM read_csv('data/crm_contacts.csv', header = true,
                                                columns = {'customer_ref': 'VARCHAR', 'email': 'VARCHAR',
                                                           'loyalty_tier': 'VARCHAR', '_loaded_at': 'VARCHAR'}))
SELECT 'raw keys'                      AS join_on,
       count(*) FILTER (WHERE s.customer_id IS NOT NULL) AS crm_rows_matched,
       count(*)                        AS crm_rows
FROM crm LEFT JOIN shop AS s ON s.customer_id = crm.customer_ref
UNION ALL
SELECT 'upper(trim(key))',
       count(*) FILTER (WHERE s.customer_id IS NOT NULL), count(*)
FROM crm LEFT JOIN shop AS s ON s.customer_id = upper(trim(crm.customer_ref))
ORDER BY join_on;
```

Result (2 rows):

| join_on | crm_rows_matched | crm_rows |
|---|---|---|
| raw keys | 0 | 4 |
| upper(trim(key)) | 3 | 4 |

Joining the CRM to the shop on raw keys matches **none** of the four CRM rows: `" c-001"`, `"C-002 "` and `"c-004"` differ in case and spaces. Normalizing the business key matches three; C-006 is genuinely CRM-only. Whether this rule lives in an EDW (Inmon), a conformed `dim_customer` (Kimball) or a hub (Data Vault, lesson 13), someone has to write it once.

#### The honest modern answer

- Most platforms are **hybrids**: an integration layer in silver (sometimes 3NF, increasingly Data Vault or just well-keyed staging and intermediate models) and Kimball marts in gold.
- Small and medium teams usually skip a separate enterprise model: staging → intermediate → conformed star, the dbt default.
- Choose Inmon-style integration first when many systems describe the same entities differently and the business needs one governed definition before any reporting.

> **On the job:** In an interview, don’t pick a side. Say where each puts integration, then: “On a lakehouse I’d integrate in silver and present Kimball stars in gold; I’d only build a full 3NF or Data Vault layer when the number of sources and the audit needs justify it.”

> **The main idea:** Inmon integrates in a normalized EDW before anyone reports; Kimball integrates through conformed dimensions while delivering one star at a time. The question is not which is right, but where integration should live on your platform.

*Read more:* [Kimball Group: the Kimball DW/BI architecture](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/kimball-data-warehouse-bus-architecture/), [Kimball Group: conformed dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/conformed-dimension/), [Data warehouse: Inmon and Kimball (Wikipedia)](https://en.wikipedia.org/wiki/Data_warehouse).

---

<a id="slide-7"></a>
## 7. The Leafy star, in one slide

*Part B · the baseline every other model is compared with*

*Recap in one line:* a star has narrow fact tables at a declared grain and wide dimensions; a **Type 2** dimension adds a row per change and the fact stores the key of the version valid at the event (see *Dimension tables*, slides 6–8, and *dbt fundamentals*, slide 17, for the mechanics). Here is Leafy’s sales star, built from the same staging tables as the EDW.

*Diagram:* `fct_order_line` (grain: one order line; `order_id` and `line_no` degenerate, `customer_sk` and `product_sk` foreign keys, measures `quantity` and `line_revenue`) joins `dim_customer` (SCD2: `segment` and `city` tracked, `valid_from`/`valid_to`) and `dim_product`. `fct_order` holds the order-level `shipping_fee` at its own grain.

#### The customer dimension (SCD2 + unknown member)

*SQL · 02_star.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE dim_customer AS
WITH versions AS (
    SELECT DISTINCT customer_id, name, city, segment, updated_at FROM stg_shop_customers
)
SELECT row_number() OVER (ORDER BY v.customer_id, v.updated_at) AS customer_sk,
       v.customer_id, v.name, v.city, v.segment, c.email, c.loyalty_tier,
       v.updated_at AS valid_from,
       lead(v.updated_at, 1, TIMESTAMP '9999-12-31')
           OVER (PARTITION BY v.customer_id ORDER BY v.updated_at) AS valid_to,
       valid_to = TIMESTAMP '9999-12-31' AS is_current
FROM versions AS v
LEFT JOIN stg_crm_contacts AS c USING (customer_id)
UNION ALL                                                  -- the unknown member for guest orders
SELECT -1, 'unknown', 'unknown', 'unknown', 'unknown', NULL, NULL,
       TIMESTAMP '1900-01-01', TIMESTAMP '9999-12-31', true;
```

#### The line-grain fact

*SQL · 02_star.sql (excerpt)*

```sql
CREATE OR REPLACE TABLE fct_order_line AS          -- grain: one row per order line
SELECT l.order_id, l.line_no,                                 -- order_id is a degenerate dimension
       coalesce(c.customer_sk, -1) AS customer_sk,            -- the version valid at order time
       p.product_sk, o.ordered_at, l.quantity, l.unit_price,
       l.quantity * l.unit_price AS line_revenue
FROM stg_order_lines AS l
JOIN stg_orders AS o USING (order_id)
LEFT JOIN dim_customer AS c
       ON c.customer_id = o.customer_id
      AND o.ordered_at >= c.valid_from AND o.ordered_at < c.valid_to
JOIN dim_product AS p USING (product_id);
```

`fct_order` (order grain, shipping fee) and `fct_product_view` (one row per view) are built the same way; see `sql/02_star.sql`.

#### Ben has two versions; guests have one row

```sql
SELECT customer_sk, customer_id, segment, valid_from, valid_to, is_current
FROM dim_customer
WHERE customer_id IN ('C-002', 'unknown')
ORDER BY customer_sk;
```

Result (3 rows):

| customer_sk | customer_id | segment | valid_from | valid_to | is_current |
|---|---|---|---|---|---|
| -1 | unknown | unknown | 1900-01-01 00:00:00 | 9999-12-31 00:00:00 | true |
| 2 | C-002 | hobbyist | 2025-12-14 16:30:00 | 2026-03-20 10:00:00 | false |
| 3 | C-002 | pro | 2026-03-20 10:00:00 | 9999-12-31 00:00:00 | true |

#### Q1 from the star: two joins

*SQL · Q1 from the star*

```sql
SELECT c.segment AS segment_at_order, p.category, sum(f.line_revenue) AS revenue
FROM fct_order_line AS f
JOIN dim_customer   AS c USING (customer_sk)
JOIN dim_product    AS p USING (product_sk)
GROUP BY ALL
ORDER BY segment_at_order, category;
```

Result (7 rows):

| segment_at_order | category | revenue |
|---|---|---|
| hobbyist | Succulent | 36.00 |
| hobbyist | Tools | 12.00 |
| hobbyist | Tropical | 60.00 |
| pro | Succulent | 52.00 |
| pro | Tools | 12.00 |
| pro | Tropical | 105.00 |
| unknown | Tropical | 15.00 |

Same answer as the EDW, with two joins instead of four, and the “as-was” logic paid once, at load time, in `fct_order_line.customer_sk`.

> **On the job:** This is the model most analytics engineers build every week. Everything else in this deck is judged against it: does the other approach make loading, history, integration or reading easier than this star, and at what cost?

> **The main idea:** the star is the reference point: integration and history are resolved at load time, so readers need few joins and no history logic.

*Read more:* [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/), [Kimball Group: SCD type 2](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/), [Fabric Warehouse: dimensional modeling](https://learn.microsoft.com/en-us/fabric/data-warehouse/dimensional-modeling-overview).

---

<a id="slide-8"></a>
## 8. One Big Table: flatten the star for one consumer

*Part B · what is an OBT, and how is it built?*

A **One Big Table** (**OBT**, also “wide table” or “flat table”) is a single, fully denormalized table at *one* grain that carries the measures and every descriptive attribute its consumers need, so that every query is a scan and a `GROUP BY`, with no joins. The safe way to build one is **from the star**, at the fact’s grain: the star stays the source of truth and the OBT is a **projection** of it for a consumer.

**Coming from C#:** it is the denormalized *read model* of CQRS, or a flattened DTO: built from the domain model for one screen, rebuilt when the domain changes, never written to directly.

#### Build it from the star

*SQL · 03_obt.sql*

```sql
CREATE OR REPLACE TABLE obt_order_lines AS
SELECT f.order_id, f.line_no, f.ordered_at, f.quantity, f.unit_price, f.line_revenue,
       c.customer_id, c.name AS customer_name, c.city AS city_at_order,
       c.segment AS segment_at_order,                        -- as-was (SCD2 version at order time)
       coalesce(cur.segment, 'unknown') AS segment_current,  -- as-is (frozen at build time!)
       c.loyalty_tier,
       p.product_id, p.product_name, p.category
FROM fct_order_line AS f
JOIN dim_customer   AS c   USING (customer_sk)
LEFT JOIN dim_customer AS cur ON cur.customer_id = c.customer_id AND cur.is_current
                             AND c.customer_sk <> -1
JOIN dim_product    AS p   USING (product_sk);
```

#### Read it without joins

*SQL · Q1 from the OBT: no joins*

```sql
SELECT segment_at_order, category, sum(line_revenue) AS revenue
FROM obt_order_lines
GROUP BY ALL
ORDER BY segment_at_order, category;
```

Result (7 rows):

| segment_at_order | category | revenue |
|---|---|---|
| hobbyist | Succulent | 36.00 |
| hobbyist | Tools | 12.00 |
| hobbyist | Tropical | 60.00 |
| pro | Succulent | 52.00 |
| pro | Tools | 12.00 |
| pro | Tropical | 105.00 |
| unknown | Tropical | 15.00 |

```sql
SELECT s.segment,
       (SELECT sum(line_revenue) FROM obt_order_lines WHERE segment_at_order = s.segment) AS revenue_as_was,
       (SELECT sum(line_revenue) FROM obt_order_lines WHERE segment_current  = s.segment) AS revenue_as_is
FROM (VALUES ('hobbyist'), ('pro'), ('unknown')) AS s(segment)
ORDER BY s.segment;
```

Result (3 rows):

| segment | revenue_as_was | revenue_as_is |
|---|---|---|
| hobbyist | 108.00 | 92.00 |
| pro | 169.00 | 185.00 |
| unknown | 15.00 | 15.00 |

Because it was built from an SCD2 star, the OBT can carry **both** history views: `segment_at_order` (as-was) and `segment_current` (as-is, Q2). Only Ben’s first order (16.00) moves between them.

#### Why wide tables are cheap to read on columnar engines

DuckDB, Snowflake, BigQuery, Fabric and Databricks store data **by column**: a query that touches `segment_at_order`, `category` and `line_revenue` reads those three columns and skips the rest. Width costs storage and rebuild time, not read time, which is why OBTs are popular in cloud warehouses (measured in lesson 10).

#### Rules that keep an OBT honest

- One grain per OBT, named in its name: `obt_order_lines`.
- Built only from tested marts, never from raw tables.
- Row count and measure totals equal the fact’s (the lab tests both).
- History columns named for what they mean: `_at_order` vs `_current`.

> **On the job:** dbt’s own guidance calls marts “wide and denormalized”; many teams expose an `obt_` or `wide_` table per dashboard, ML feature set or CSV export on top of their dimensional core. Reviewers will ask you which star it is built from and how it is tested.

> **The main idea:** an OBT is a denormalized projection of the star at one grain: zero joins for its consumer, while the star remains the place where integration and history are decided.

*Read more:* [dbt: marts (wide and denormalized)](https://docs.getdbt.com/best-practices/how-we-structure/4-marts), [Fivetran: star schema vs OBT benchmark](https://www.fivetran.com/blog/star-schema-vs-obt), [DuckDB: Parquet](https://duckdb.org/docs/stable/data/parquet/overview).

---

<a id="slide-9"></a>
## 9. What breaks in an OBT

*Part B · three failure modes you will see in review*

#### 1 · Mixing grains: the order fee repeated per line

*SQL · believable, but wrong*

```sql
CREATE OR REPLACE TEMP TABLE obt_with_shipping AS      -- “just add shipping to the OBT”
SELECT l.*, o.shipping_fee
FROM obt_order_lines AS l JOIN fct_order AS o USING (order_id);
SELECT sum(shipping_fee) AS shipping_total FROM obt_with_shipping;
```

Result (1 row):

| shipping_total |
|---|
| 42.50 |

*SQL · fixed*

```sql
SELECT sum(shipping_fee) AS shipping_total FROM fct_order;   -- the order-grain fact
```

Result (1 row):

| shipping_total |
|---|
| 37.50 |

O-1001 has two lines, so its 5.00 fee is counted twice: 42.50 instead of 37.50. The OBT’s grain is the order line; an order-level amount does not belong in it. Keep it in an order-grain table (or a second, order-grain OBT); allocating it to lines is a business rule that needs an owner.

#### 2 · Frozen attributes: the OBT is as old as its last build

```sql
CREATE OR REPLACE TEMP TABLE dim_customer_today AS SELECT * FROM dim_customer;
UPDATE dim_customer_today SET segment = 'pro'               -- a Type 1 correction lands today
WHERE customer_id = 'C-004' AND is_current;
SELECT 'star: read the dimension' AS reader,
       (SELECT segment FROM dim_customer_today WHERE customer_id = 'C-004' AND is_current) AS c004_segment
UNION ALL
SELECT 'OBT: built yesterday',
       (SELECT DISTINCT segment_current FROM obt_order_lines WHERE customer_id = 'C-004')
ORDER BY reader;
```

Result (2 rows):

| reader | c004_segment |
|---|---|
| OBT: built yesterday | hobbyist |
| star: read the dimension | pro |

A one-row change in the dimension is visible to every star query at once. The OBT keeps the old value until it is **rebuilt**, and rebuilding means rewriting every fact row (lesson 10 measures it). With several OBTs built at different times, dashboards disagree.

#### 3 · One table, many questions

Q3 (“viewed, then ordered within 7 days”) needs product *views*, a different grain. Putting views into `obt_order_lines` would fan out revenue; a second OBT per question set is the fix, and after a few of them you have re-invented a star with duplicated logic. **Column sprawl** follows: 300 columns nobody owns.

#### Spot them in review

- A column whose name contains `order_`, `account_` or `monthly_` in a line-grain table.
- No test that the OBT’s totals equal the fact’s totals.
- An attribute without `_at_order` / `_current`: which history does it show?
- An OBT built from raw or staging tables instead of marts.

> **On the job:** These are the three classic OBT incidents: “revenue is fine but shipping is double”, “the dashboard still shows last week’s segments”, and “we have five customer tables”. Each is prevented by the rules on the previous slide plus a reconciliation test in CI.

> **The main idea:** an OBT fails when it mixes grains, when it is older than its dimensions, or when it is asked to answer questions at other grains. Keep one grain, rebuild with the star, and test totals.

*Read more:* [dbt: marts (wide and denormalized)](https://docs.getdbt.com/best-practices/how-we-structure/4-marts), [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/).

---

<a id="slide-10"></a>
## 10. Star or OBT? Measured on 5 million rows

*Part B · what does each one cost: reads, storage, change? (added)*

Arguments about OBT vs star are usually about performance. Here is a measurement you can repeat: a synthetic star with 200,000 customers, 2,000 products and 5,000,000 order lines, the same as an OBT, and three costs: a Q1-style query, the Parquet size, and the cost of one customer changing segment.

```python
import os, time, duckdb

con = duckdb.connect()                                   # a separate, in-memory database
con.execute("""
CREATE TABLE dim_customer AS
SELECT i AS customer_sk, 'C-' || lpad(i::VARCHAR, 6, '0') AS customer_id, 'Customer ' || i AS name,
       ['hobbyist', 'pro', 'collector'][1 + (hash(i) % 3)::INTEGER] AS segment,
       ['Austin', 'Chicago', 'Denver', 'Boulder', 'Seattle'][1 + (hash(i * 7) % 5)::INTEGER] AS city
FROM range(1, 200001) AS t(i);
CREATE TABLE dim_product AS
SELECT i AS product_sk, 'P-' || lpad(i::VARCHAR, 4, '0') AS product_id, 'Product ' || i AS product_name,
       ['Tropical', 'Succulent', 'Tools', 'Trees', 'Herbs'][1 + (hash(i) % 5)::INTEGER] AS category
FROM range(1, 2001) AS t(i);
CREATE TABLE fct_order_line AS
SELECT i AS line_id, 1 + (hash(i) % 200000)::INTEGER AS customer_sk,
       1 + (hash(i * 31) % 2000)::INTEGER AS product_sk, 1 + (hash(i * 17) % 4)::INTEGER AS quantity,
       (5 + (hash(i * 13) % 60)::INTEGER)::DECIMAL(10, 2) AS unit_price
FROM range(1, 5000001) AS t(i);
""")
OBT = """CREATE OR REPLACE TABLE obt_order_lines AS
SELECT f.*, f.quantity * f.unit_price AS line_revenue, c.customer_id, c.name, c.segment, c.city,
       p.product_id, p.product_name, p.category
FROM fct_order_line AS f JOIN dim_customer AS c USING (customer_sk) JOIN dim_product AS p USING (product_sk)"""
con.execute(OBT)

def median_seconds(sql, runs=5):
    con.execute(sql).fetchall()                          # warm-up
    times = []
    for _ in range(runs):
        t = time.perf_counter(); con.execute(sql).fetchall(); times.append(time.perf_counter() - t)
    return sorted(times)[runs // 2]

star_sql = """SELECT c.segment, p.category, sum(f.quantity * f.unit_price) FROM fct_order_line AS f
              JOIN dim_customer AS c USING (customer_sk) JOIN dim_product AS p USING (product_sk) GROUP BY ALL"""
obt_sql = "SELECT segment, category, sum(line_revenue) FROM obt_order_lines GROUP BY ALL"
assert sorted(con.execute(star_sql).fetchall()) == sorted(con.execute(obt_sql).fetchall())
star_t, obt_t = median_seconds(star_sql), median_seconds(obt_sql)
print(f"rows: {con.execute('SELECT count(*) FROM obt_order_lines').fetchone()[0]:,}")
print(f"Q1-style query, star (2 joins): {star_t:.3f} s")
print(f"Q1-style query, OBT (no joins): {obt_t:.3f} s")

sizes = {}
for table in ["fct_order_line", "dim_customer", "dim_product", "obt_order_lines"]:
    con.execute(f"COPY {table} TO '{table}.parquet' (FORMAT parquet)")
    sizes[table] = os.path.getsize(f"{table}.parquet") / 1e6
    os.remove(f"{table}.parquet")
star_mb = sizes["fct_order_line"] + sizes["dim_customer"] + sizes["dim_product"]
print(f"Parquet size: star {star_mb:.0f} MB, OBT {sizes['obt_order_lines']:.0f} MB")

t = time.perf_counter()
con.execute("UPDATE dim_customer SET segment = 'pro' WHERE customer_sk = 42")
star_change = time.perf_counter() - t
t = time.perf_counter(); con.execute(OBT); obt_change = time.perf_counter() - t
print(f"One customer changes segment: star updates 1 row in {star_change:.3f} s, "
      f"OBT rewrites 5,000,000 rows in {obt_change:.2f} s")
```

Output (measured on the build machine; your numbers will differ):

```text
rows: 5,000,000
Q1-style query, star (2 joins): 0.083 s
Q1-style query, OBT (no joins): 0.073 s
Parquet size: star 56 MB, OBT 140 MB
One customer changes segment: star updates 1 row in 0.004 s, OBT rewrites 5,000,000 rows in 1.06 s
```

#### What the numbers say (on this engine)

- **Reads:** on DuckDB, joining a 5-million-row fact to small dimensions is in the same range as scanning the OBT (both well under a second here). Hash joins against dimensions that fit in memory are cheap on modern engines.
- **Storage:** the OBT is more than twice the size: every descriptive value is repeated on every row, and high-cardinality text (names) compresses poorly.
- **Change:** the star absorbs a dimension change in one row; the OBT must be rewritten. That is the real price of an OBT.

#### What others measured

Fivetran’s tests on Redshift, Snowflake and BigQuery (BI-style queries) found the denormalized table **25–50% faster** than a star, with mixed results on Snowflake for fast queries. Engines, data sizes and caching differ: measure on *your* warehouse before you choose for speed.

**Power BI is the exception.** Microsoft’s guidance is to model Power BI semantic models as stars: the VertiPaq engine compresses each column, so repeating customer attributes on every fact row makes the model bigger, and DAX filters are designed to flow from dimension tables to facts. (added)

> **On the job:** Before proposing an OBT “for performance”, run exactly this experiment on a realistic sample in your warehouse and put the three numbers (query time, storage, rebuild time) in the decision document. It turns an opinion into a measurement and usually settles the review.

> **The main idea:** an OBT buys simpler reads (and on some warehouses faster ones) with more storage and a full rewrite on every dimension change; on Power BI, a star is the recommended shape.

*Read more:* [Fivetran: star schema vs OBT benchmark](https://www.fivetran.com/blog/star-schema-vs-obt), [Power BI: star schema guidance](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema), [SQLBI: star schema or single table](https://www.sqlbi.com/articles/power-bi-star-schema-or-single-table/), [DuckDB: Parquet](https://duckdb.org/docs/stable/data/parquet/overview).

---

<a id="slide-11"></a>
## 11. A one-page OBT vs star decision

*Part B · how do I argue it for a given use case?*

The useful question is never “star or OBT?” in general but “for *this* consumer, given *these* forces”. Write the answer on one page, using the template in the lab (`templates/obt-vs-star-decision.md`): the use case, the forces, the decision, the consequences and checks.

| Force | Points to | Leafy marketing dashboard |
|---|---|---|
| Several teams or tools reuse customers, products, dates | Star (conformed dimensions) | Yes: Finance and Support use the same customers |
| Attributes change; reports need as-was, as-is or both | Star (SCD2), OBT built from it | Yes: segments change; marketing wants as-was |
| The BI tool is a Power BI semantic model | Star | No: the dashboard tool reads one table best |
| One dashboard with a fixed column list | OBT | Yes |
| Measures at different grains (shipping vs lines) | Star, or one OBT per grain | Yes: shipping stays in `fct_order` |
| Dimension attributes change often; rebuild is expensive | Star | No: 13 rows here; minutes at full scale |

#### The decision, as written

- **We build:** the star as the source of truth, plus `obt_order_lines` at order-line grain for the marketing dashboard.
- **Leaves out:** shipping (order grain) and product views (view grain).
- **History:** both `segment_at_order` and `segment_current`; rebuilt in the same run as the star.
- **Checks:** row count and revenue equal to the fact (right).
- **Revisit when:** a second consumer appears, or the dashboard moves to Power BI.

#### The checks, executed

*SQL · the two tests every OBT needs*

```sql
SELECT (SELECT count(*) FROM fct_order_line)          AS fact_rows,
       (SELECT count(*) FROM obt_order_lines)         AS obt_rows,
       (SELECT sum(line_revenue) FROM fct_order_line) AS fact_revenue,
       (SELECT sum(line_revenue) FROM obt_order_lines) AS obt_revenue;
```

Result (1 row):

| fact_rows | obt_rows | fact_revenue | obt_revenue |
|---|---|---|---|
| 13 | 13 | 292.00 | 292.00 |

#### In your portfolio: Fuel Smart

The brief’s `mart_recipe_nutrition` (one row per recipe serving, three metrics and match coverage) is an OBT-style mart built from `fct_recipe_ingredient`, `dim_recipe` and `dim_food`. Write its one-page decision: the dashboard reads the wide mart; the star stays the source for anything new (reviews, a semantic layer, the agent). Exercise 10 drafts it.

#### …and its layers

| Fuel Smart | dbt layer | Medallion |
|---|---|---|
| Food.com and USDA files as downloaded | sources | bronze |
| `stg_recipes`, `stg_usda_foods`, parsed ingredient lines | staging | silver |
| `int_ingredient_matches` (grams, food match, confidence) | intermediate | silver |
| `fct_recipe_ingredient`, `fct_review`, `dim_recipe`, `dim_food` | marts (star) | gold |
| `mart_recipe_nutrition` | marts (OBT-style projection) | gold / serving |

> **On the job:** Teams that write this page before building avoid the slow drift into one OBT per dashboard. Attach it to the pull request that adds the OBT; reviewers then discuss the forces, not taste.

> **The main idea:** argue OBT vs star from the consumer, the history needs, the grains and the BI tool, write it on one page, and ship the OBT only with tests that reconcile it to the star.

*Read more:* [dbt: marts (wide and denormalized)](https://docs.getdbt.com/best-practices/how-we-structure/4-marts), [Power BI: star schema guidance](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema), [Fivetran: star schema vs OBT benchmark](https://www.fivetran.com/blog/star-schema-vs-obt).

---

<a id="slide-12"></a>
## 12. Data Vault in two minutes: hubs, links, satellites

*Part C · what is a Data Vault, said in two minutes?*

**Data Vault** (created by Dan Linstedt; the current version is Data Vault 2.0) is a modeling method for the *integration layer*. It splits everything a source says into three kinds of table, and only ever inserts:

- A **hub** is the list of unique **business keys** for one business concept (customer, order, product), each with a **hash key**, the first `load_ts` and the `record_source`. No descriptions, no foreign keys.
- A **link** records that business keys are related (this order belongs to that customer). It holds its own hash key and the hash keys of the hubs it connects; no descriptions.
- A **satellite** holds descriptive attributes of one hub or link and their full history: one new row whenever the attributes change, detected with a **hashdiff** (a hash of all attribute values). Usually one satellite per source and rate of change.

| Table | Kind | Holds |
|---|---|---|
| `hub_customer`, `hub_order`, `hub_product` | hub | hash key, business key, `load_ts`, `record_source` |
| `link_order_customer`, `link_order_line` | link | own hash key + the hub hash keys it connects (+ `line_no`) |
| `sat_customer_shop`, `sat_customer_crm`, `sat_order`, `sat_product`, `sat_order_line` | satellite | parent hash key, `load_ts`, `hashdiff`, attributes, `record_source` |

#### The two-minute answer (say it aloud)

> Data Vault is a way to model the integration layer of a warehouse when there are many sources that change. Business keys go into hubs, relationships into links, and all descriptive data with its history into satellites, one per source. Everything is insert-only and stamped with load time and source, so it is fully auditable and you can reload or add a source without changing existing tables. Keys are hashes of the business keys, so tables load in parallel. Nobody reports from the raw vault directly: business rules go into a business vault, and star-schema information marts are built on top for BI. It pays off with many volatile sources and audit needs; for a few stable sources it is overhead.

#### Vocabulary you will hear

- **Raw vault**: hubs, links and satellites loaded from sources without business rules.
- **Business vault**: extra, still insert-only tables that apply business rules (derived attributes, de-duplication of customers).
- **Information mart**: the star (or OBT) built from the vault for consumers (lesson 15).
- **Coming from C#:** a satellite is an append-only, event-sourced history of an entity’s properties; a hub is the identity map of keys; a link is a many-to-many join entity.

> **On the job:** You will meet Data Vault mostly in regulated, multi-source enterprises (banking, insurance, public sector, large retailers), often generated by tools or dbt packages (AutomateDV, datavault4dbt). As an analytics engineer you usually build marts on top of it, so you must read hubs, links and satellites fluently.

> **The main idea:** hubs = keys, links = relationships, satellites = descriptions with history; insert-only, hash-keyed, source-stamped, and always with marts on top for people.

*Read more:* [Data vault modeling (Wikipedia)](https://en.wikipedia.org/wiki/Data_vault_modeling), [Data Vault Alliance](https://datavaultalliance.com/), [Scalefree: Data Vault glossary](https://www.scalefree.com/blog/data-vault/data-vault-glossary-hub-link-satellite-business-vault-and-more/), [Databricks: what is a Data Vault](https://www.databricks.com/glossary/data-vault).

---

<a id="slide-13"></a>
## 13. Build the raw vault: hash keys and the first load

*Part C · how do hubs, links and satellites get loaded?*

The vault is loaded *per batch*. The load script reads only the staging rows that landed at `getvariable('load_ts')`, a DuckDB **session variable** set with `SET VARIABLE` (DuckDB 1.1+), and inserts what is new. Every key is a **hash key**: `md5()` of the normalized business key, a 32-character text that any loader computes on its own, without looking up a sequence.

#### Three of the ten tables

*SQL · 04_vault_ddl.sql (excerpt)*

```sql
CREATE TABLE IF NOT EXISTS hub_customer (
    customer_hk VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL,
    load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS link_order_customer (
    order_customer_hk VARCHAR PRIMARY KEY, order_hk VARCHAR NOT NULL, customer_hk VARCHAR NOT NULL,
    load_ts TIMESTAMP NOT NULL, record_source VARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS sat_customer_shop (
    customer_hk VARCHAR, load_ts TIMESTAMP, hashdiff VARCHAR NOT NULL,
    name VARCHAR, city VARCHAR, segment VARCHAR, updated_at TIMESTAMP, record_source VARCHAR,
    PRIMARY KEY (customer_hk, load_ts));
```

Primary keys make DuckDB reject a duplicate hub row or a second satellite row for the same key and load time. The full DDL also inserts a **ghost record**, `00000000…` with business key `<unknown>`, so a guest order can link to “unknown” instead of to NULL, the vault’s version of the unknown member.

#### Load batch 1: new keys only, from every source

*SQL · 05_vault_load.sql (excerpt) · load_ts = '2026-03-16 06:00:00'*

```sql
INSERT INTO hub_customer                     -- new business keys only, from every source
SELECT md5(customer_id), customer_id, getvariable('load_ts'), min(record_source)
FROM (SELECT customer_id, 'shop' AS record_source FROM stg_shop_customers
      WHERE _loaded_at = getvariable('load_ts')
      UNION ALL
      SELECT customer_id, 'crm' FROM stg_crm_contacts
      WHERE _loaded_at = getvariable('load_ts')
      UNION ALL
      SELECT customer_id, 'shop' FROM stg_orders
      WHERE _loaded_at = getvariable('load_ts') AND customer_id IS NOT NULL) AS src
WHERE md5(customer_id) NOT IN (SELECT customer_hk FROM hub_customer)
GROUP BY customer_id;
```

*SQL · 05_vault_load.sql (excerpt)*

```sql
INSERT INTO link_order_customer
SELECT DISTINCT md5(concat_ws('||', order_id, coalesce(customer_id, '<unknown>'))),
       md5(order_id),
       coalesce(md5(customer_id), '00000000000000000000000000000000'),     -- guest order -> ghost key
       getvariable('load_ts'), 'shop'
FROM stg_orders
WHERE _loaded_at = getvariable('load_ts')
  AND md5(concat_ws('||', order_id, coalesce(customer_id, '<unknown>')))
      NOT IN (SELECT order_customer_hk FROM link_order_customer);
```

#### hub_customer after batch 1

```sql
SELECT customer_id, customer_hk, record_source
FROM hub_customer
ORDER BY customer_id;
```

Result (5 rows):

| customer_id | customer_hk | record_source |
|---|---|---|
| <unknown> | 00000000000000000000000000000000 | system |
| C-001 | 3fd6b21e0b8802e3760819938215d216 | shop |
| C-002 | f16e23648230b107306b69d6cc2ff5d3 | shop |
| C-003 | f4f7839d0b6d73eac1765ded26d016fb | shop |
| C-004 | 14a57418513a590f203027ccfc59e71c | shop |

#### Why hash keys

- **Deterministic:** the same business key gives the same hash in every system and every run, so hubs, links and satellites load in parallel.
- **Normalize first:** hash `upper(trim(key))`; `md5('c-001')` and `md5('C-001')` are different keys (exercise 3).
- **Collisions:** MD5 is 128 bits; for business keys the chance of a collision is negligible, and many teams use SHA-1 or SHA-256 anyway. It is not used here for security.
- **Dialects** (not executed): T-SQL `CONVERT(CHAR(32), HASHBYTES('MD5', k), 2)`; Spark SQL `md5(k)` or `sha2(k, 256)`; Snowflake `MD5(k)`.

> **On the job:** Hash keys are what make Data Vault loads “embarrassingly parallel”: hub, link and satellite loads for different sources can run at the same time, in any order, because nobody waits for a surrogate key to be generated. That is also why vault loads are easy to generate from metadata.

> **The main idea:** a vault load inserts new business keys into hubs, new relationships into links, and changed descriptions into satellites, all keyed by hashes of normalized business keys.

*Read more:* [Scalefree: hash keys in the Data Vault](https://www.scalefree.com/blog/data-vault/hash-keys-in-the-data-vault/), [DuckDB: SET VARIABLE](https://duckdb.org/docs/stable/sql/statements/set_variable), [DuckDB: text functions (md5, concat_ws)](https://duckdb.org/docs/stable/sql/functions/text), [T-SQL: HASHBYTES](https://learn.microsoft.com/en-us/sql/t-sql/functions/hashbytes-transact-sql).

---

<a id="slide-14"></a>
## 14. Insert-only loads: hashdiff, batch 2, and a safe replay

*Part C · how does a vault keep history and stay idempotent?*

A satellite gets a new row only when the incoming **hashdiff** differs from the hashdiff of the latest row for that key. Nothing is updated or deleted. Running the same batch twice therefore inserts nothing the second time: the load is **idempotent**, the property that makes retries safe.

#### The satellite load

*SQL · 05_vault_load.sql (excerpt) · load_ts = '2026-04-01 06:00:00'*

```sql
INSERT INTO sat_customer_shop                -- a new row only when the hashdiff changed
WITH incoming AS (
    SELECT DISTINCT md5(customer_id) AS customer_hk, getvariable('load_ts') AS load_ts,
           md5(concat_ws('||', coalesce(name, ''), coalesce(city, ''), coalesce(segment, ''),
                         coalesce(CAST(updated_at AS VARCHAR), ''))) AS hashdiff,
           name, city, segment, updated_at, 'shop' AS record_source
    FROM stg_shop_customers
    WHERE _loaded_at = getvariable('load_ts')
), latest AS (
    SELECT customer_hk, hashdiff FROM sat_customer_shop
    QUALIFY row_number() OVER (PARTITION BY customer_hk ORDER BY load_ts DESC) = 1
)
SELECT i.* FROM incoming AS i
LEFT JOIN latest AS l USING (customer_hk)
WHERE l.hashdiff IS DISTINCT FROM i.hashdiff;
```

`coalesce(…, '')` inside the hash matters: `concat_ws` skips NULLs, so without it `(NULL, 'x')` and `('x', NULL)` would hash the same (bug clinic).

#### What batch 2 added

*SQL · rows per batch after two loads*

```sql
SELECT t.table_name,
       count(*) FILTER (WHERE load_ts = TIMESTAMP '2026-03-16 06:00') AS batch_1,
       count(*) FILTER (WHERE load_ts = TIMESTAMP '2026-04-01 06:00') AS batch_2,
       count(*) AS total
FROM (SELECT 'hub_customer' AS table_name, load_ts FROM hub_customer
      WHERE customer_id <> '<unknown>'
      UNION ALL SELECT 'link_order_customer', load_ts FROM link_order_customer
      UNION ALL SELECT 'sat_customer_shop', load_ts FROM sat_customer_shop
      UNION ALL SELECT 'sat_customer_crm', load_ts FROM sat_customer_crm
      UNION ALL SELECT 'sat_order', load_ts FROM sat_order) AS t
GROUP BY t.table_name
ORDER BY t.table_name;
```

Result (5 rows):

| table_name | batch_1 | batch_2 | total |
|---|---|---|---|
| hub_customer | 4 | 2 | 6 |
| link_order_customer | 5 | 4 | 9 |
| sat_customer_crm | 0 | 4 | 4 |
| sat_customer_shop | 4 | 3 | 7 |
| sat_order | 5 | 4 | 9 |

- Two new hub keys: C-005 (shop) and C-006 (CRM only).
- Three new shop satellite rows: Ben’s segment, Chloe’s city, Emi. Ana and Dev arrived again unchanged, so no rows.
- A whole new satellite, `sat_customer_crm`, for the new source; no existing table changed.

#### History lives in the satellite (added)

```sql
SELECT customer_id, segment, city, updated_at, s.load_ts
FROM sat_customer_shop AS s JOIN hub_customer AS h USING (customer_hk)
WHERE customer_id IN ('C-001', 'C-002', 'C-003')
ORDER BY customer_id, s.load_ts;
```

Result (5 rows):

| customer_id | segment | city | updated_at | load_ts |
|---|---|---|---|---|
| C-001 | hobbyist | Austin | 2025-11-02 10:00:00 | 2026-03-16 06:00:00 |
| C-002 | hobbyist | Chicago | 2025-12-14 16:30:00 | 2026-03-16 06:00:00 |
| C-002 | pro | Chicago | 2026-03-20 10:00:00 | 2026-04-01 06:00:00 |
| C-003 | pro | Denver | 2026-01-05 09:00:00 | 2026-03-16 06:00:00 |
| C-003 | pro | Boulder | 2026-03-28 12:00:00 | 2026-04-01 06:00:00 |

Two different times on every row: `load_ts` is when the *warehouse* learned it; `updated_at` is when it happened in the *shop*. Ben became pro on 20 March, but the vault only knew on 1 April.

#### A replay changes nothing

```python
# replay batch 2: exactly what a retried or duplicated job does (run inside the lab folder)
con.execute("SET VARIABLE load_ts = TIMESTAMP '2026-04-01 06:00:00'")
con.execute(open("sql/05_vault_load.sql", encoding="utf-8").read())
print("replayed batch 2")
```

Output:

```text
replayed batch 2
```

*SQL · the same audit after the replay*

```sql
SELECT t.table_name,
       count(*) FILTER (WHERE load_ts = TIMESTAMP '2026-03-16 06:00') AS batch_1,
       count(*) FILTER (WHERE load_ts = TIMESTAMP '2026-04-01 06:00') AS batch_2,
       count(*) AS total
FROM (SELECT 'hub_customer' AS table_name, load_ts FROM hub_customer
      WHERE customer_id <> '<unknown>'
      UNION ALL SELECT 'link_order_customer', load_ts FROM link_order_customer
      UNION ALL SELECT 'sat_customer_shop', load_ts FROM sat_customer_shop
      UNION ALL SELECT 'sat_customer_crm', load_ts FROM sat_customer_crm
      UNION ALL SELECT 'sat_order', load_ts FROM sat_order) AS t
GROUP BY t.table_name
ORDER BY t.table_name;
```

Result (5 rows):

| table_name | batch_1 | batch_2 | total |
|---|---|---|---|
| hub_customer | 4 | 2 | 6 |
| link_order_customer | 5 | 4 | 9 |
| sat_customer_crm | 0 | 4 | 4 |
| sat_customer_shop | 4 | 3 | 7 |
| sat_order | 5 | 4 | 9 |

> **On the job:** Idempotent, insert-only loads are why Data Vault is liked by data engineers who run many pipelines: a failed job is simply re-run, a late file is simply loaded, and the satellite shows exactly what the warehouse knew and when, which is what auditors ask for.

> **The main idea:** satellites append a row only when the hashdiff changes, so history is complete, every load is replayable, and a new source arrives as a new satellite rather than a schema change.

*Read more:* [Scalefree: Data Vault glossary](https://www.scalefree.com/blog/data-vault/data-vault-glossary-hub-link-satellite-business-vault-and-more/), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: INSERT](https://duckdb.org/docs/stable/sql/statements/insert), [DuckDB: constraints (PRIMARY KEY)](https://duckdb.org/docs/stable/sql/constraints).

---

<a id="slide-15"></a>
## 15. Query the vault: an information mart on top

*Part C · why does nobody report from the raw vault?*

To answer Q1 the vault must pick the latest satellite row per order, line and product, walk two links and three hubs, and choose the customer version valid at order time. That is written **once**, in an **information mart** (here a view; in practice usually a star like lesson 7), and consumers query the mart.

#### The mart: seven tables, six joins

*SQL · 06_vault_mart.sql*

```sql
CREATE OR REPLACE VIEW vault_sales_lines AS
WITH order_now AS (                                   -- latest satellite row per order
    SELECT * FROM sat_order
    QUALIFY row_number() OVER (PARTITION BY order_hk ORDER BY load_ts DESC) = 1
), line_now AS (
    SELECT * FROM sat_order_line
    QUALIFY row_number() OVER (PARTITION BY order_line_hk ORDER BY load_ts DESC) = 1
), product_now AS (
    SELECT * FROM sat_product
    QUALIFY row_number() OVER (PARTITION BY product_hk ORDER BY load_ts DESC) = 1
)
SELECT ho.order_id, ll.line_no, o.ordered_at, loc.customer_hk, hp.product_id, pn.category,
       ln.quantity * ln.unit_price AS line_revenue
FROM hub_order           AS ho
JOIN order_now           AS o   ON o.order_hk = ho.order_hk
JOIN link_order_customer AS loc ON loc.order_hk = ho.order_hk
JOIN link_order_line     AS ll  ON ll.order_hk = ho.order_hk
JOIN line_now            AS ln  ON ln.order_line_hk = ll.order_line_hk
JOIN hub_product         AS hp  ON hp.product_hk = ll.product_hk
JOIN product_now         AS pn  ON pn.product_hk = hp.product_hk;
```

#### Q1 from the vault

*SQL · Q1 from the vault mart (ASOF on the business date)*

```sql
SELECT coalesce(s.segment, 'unknown') AS segment_at_order, v.category,
       sum(v.line_revenue) AS revenue
FROM vault_sales_lines AS v
ASOF LEFT JOIN sat_customer_shop AS s              -- last satellite row whose business date
       ON s.customer_hk = v.customer_hk            -- (updated_at) is at or before the order
      AND v.ordered_at >= s.updated_at
GROUP BY ALL
ORDER BY segment_at_order, category;
```

Result (7 rows):

| segment_at_order | category | revenue |
|---|---|---|
| hobbyist | Succulent | 36.00 |
| hobbyist | Tools | 12.00 |
| hobbyist | Tropical | 60.00 |
| pro | Succulent | 52.00 |
| pro | Tools | 12.00 |
| pro | Tropical | 105.00 |
| unknown | Tropical | 15.00 |

**ASOF LEFT JOIN** (DuckDB; also Snowflake) joins each row to the *last* matching row whose time is at or before its own, here the satellite version whose `updated_at` is at or before the order. Same answer as every other model.

#### The classic vault mistake: the wrong clock (added)

*SQL · believable, but wrong*

```sql
SELECT coalesce(s.segment, 'unknown') AS segment_at_order, sum(v.line_revenue) AS revenue
FROM vault_sales_lines AS v
ASOF LEFT JOIN sat_customer_shop AS s
       ON s.customer_hk = v.customer_hk AND v.ordered_at >= s.load_ts   -- the load date: wrong clock
GROUP BY ALL
ORDER BY segment_at_order;
```

Result (3 rows):

| segment_at_order | revenue |
|---|---|
| hobbyist | 66.00 |
| pro | 15.00 |
| unknown | 211.00 |

Using `load_ts` as “valid from” puts 211.00 of revenue into *unknown* (every order placed before the first load on 16 March, and Emi’s order before the second) and makes Ben a hobbyist for his 25 March order, because the vault only learned about the change on 1 April. For as-was business history use the source’s business date; `load_ts` answers “what did the warehouse know, and when?”

#### Making vault queries fast: PIT and bridge tables (added)

- A **point-in-time (PIT) table** stores, per hub key and snapshot date, the `load_ts` of the valid row in each satellite, so marts use equi-joins instead of “latest row” lookups.
- A **bridge table** (in Data Vault, not the many-to-many bridge of *Dimension tables*) stores pre-joined hub and link keys along a common path.
- Both are query helpers in the business vault, rebuilt from the raw vault; they never replace it.

> **On the job:** When a vault exists, your marts read it through views or dbt models like this one, often generated by AutomateDV or datavault4dbt macros. Reviewers will check two things: that you pick satellite rows by the right clock, and that a link with several rows per order cannot fan out your facts.

> **The main idea:** the vault is for loading and history; people read information marts built on top of it, which must pick satellite versions by the business date and keep the fact grain intact.

*Read more:* [DuckDB: ASOF join](https://duckdb.org/docs/stable/guides/sql_features/asof_join), [Snowflake: ASOF JOIN](https://docs.snowflake.com/en/sql-reference/constructs/asof-join), [Databricks: Data Vault on the lakehouse](https://www.databricks.com/blog/2022/06/24/prescriptive-guidance-for-implementing-a-data-vault-model-on-the-databricks-lakehouse-platform.html), [AutomateDV (dbt package) documentation](https://automate-dv.readthedocs.io/en/latest/).

---

<a id="slide-16"></a>
## 16. When Data Vault fits, and when it is overkill

*Part C · should this platform have a vault?*

| Force | Data Vault fits when… | Overkill when… |
|---|---|---|
| Number of sources | Many systems describe the same customers, products, contracts | One or two sources |
| Change | Source schemas and business rules change often; new sources arrive every quarter | Sources are stable |
| Audit and history | You must show what any source said at any time (finance, banking, insurance, public sector) | Current state plus SCD2 on a few attributes is enough |
| Loading | Many parallel, independent loads; late and replayed files are normal | One nightly batch |
| Team | Data engineers who can generate and operate many tables (often with AutomateDV or datavault4dbt) | A small team that needs dashboards next month |
| Consumers | You will build marts on top anyway | You were hoping to skip the marts: you can’t |

#### A new source cost one satellite

```sql
SELECT h.customer_id, h.record_source AS first_seen_in, c.email, c.loyalty_tier,
       s.segment AS shop_segment
FROM hub_customer AS h
LEFT JOIN sat_customer_crm  AS c USING (customer_hk)
LEFT JOIN (SELECT * FROM sat_customer_shop
           QUALIFY row_number() OVER (PARTITION BY customer_hk ORDER BY load_ts DESC) = 1) AS s USING (customer_hk)
WHERE h.customer_id <> '<unknown>'
ORDER BY h.customer_id;
```

Result (6 rows):

| customer_id | first_seen_in | email | loyalty_tier | shop_segment |
|---|---|---|---|---|
| C-001 | shop | ana@example.com | gold | hobbyist |
| C-002 | shop | ben@example.com | silver | pro |
| C-003 | shop | NULL | NULL | pro |
| C-004 | shop | dev@example.com | bronze | hobbyist |
| C-005 | shop | NULL | NULL | pro |
| C-006 | crm | fay@example.com | silver | NULL |

The CRM arrived in batch 2. Nothing existing changed: a new satellite was created and loaded, and C-006, known only to the CRM, got a hub row with `record_source = crm`. In the star, the same change meant new columns on `dim_customer` and a rebuild.

#### The costs, honestly

- **Many tables:** 10 tables and 81 rows here for what the star holds in 5 tables and 45 rows (lesson 19).
- **Many joins:** every question needs marts; nobody queries the raw vault.
- **Discipline:** business-key design, hash normalization, satellite splits and PIT tables are skills a team must have.
- **Rule of thumb:** a vault is an investment in change and audit; if you have neither, a staging → star pipeline is cheaper and just as correct.

> **On the job:** In interviews, “When would you NOT use Data Vault?” is as common as “What is Data Vault?”. A good answer names the forces in this table and ends with what you would build instead: “For two stable sources and three dashboards, staging, a few intermediate models and a conformed star.”

> **The main idea:** Data Vault pays off for many changing sources with audit and parallel-loading needs; for small, stable platforms it adds tables and joins without adding answers.

*Read more:* [Databricks: Data Vault on the lakehouse](https://www.databricks.com/blog/2022/06/24/prescriptive-guidance-for-implementing-a-data-vault-model-on-the-databricks-lakehouse-platform.html), [datavault4dbt (dbt package)](https://github.com/ScalefreeCOM/datavault4dbt), [Data vault modeling (Wikipedia)](https://en.wikipedia.org/wiki/Data_vault_modeling).

---

<a id="slide-17"></a>
## 17. Activity Schema: the business as one stream

*Part D · what if every question started from “who did what, when”?*

**Activity Schema** (an open specification from Narrator, now at version 2.0) models one **entity**, usually the customer, taking a sequence of **activities** over time. Everything goes into one narrow time-series table, `customer_stream`, with fixed columns: `activity_id`, `ts` (UTC), `customer`, `activity` (a *verb_noun* name), and `feature_json` for the activity’s own attributes; optionally `anonymous_customer_id`, `revenue_impact` and `link`. Helper columns `activity_occurrence` (1 = first time) and `activity_repeated_at` (when it happened next) make sequence queries cheap.

#### Build Leafy’s stream from staging

*SQL · 07_stream.sql*

```sql
CREATE OR REPLACE TABLE customer_stream AS
WITH segment_versions AS (                                   -- profile snapshots -> change activities
    SELECT DISTINCT customer_id, segment, updated_at FROM stg_shop_customers
), segment_changes AS (
    SELECT * FROM segment_versions
    QUALIFY segment IS DISTINCT FROM lag(segment) OVER (PARTITION BY customer_id ORDER BY updated_at)
), activities AS (
    SELECT 'seg-' || customer_id || '-' || strftime(updated_at, '%Y%m%d%H%M') AS activity_id,
           updated_at AS ts, customer_id AS customer, NULL AS anonymous_customer_id,
           'updated_segment' AS activity, json_object('segment', segment) AS feature_json,
           NULL::DECIMAL(10,2) AS revenue_impact
    FROM segment_changes
    UNION ALL
    SELECT event_id, event_at, customer_id, anonymous_id, 'viewed_product',
           json_object('product_id', product_id), NULL
    FROM stg_web_events WHERE event_name = 'viewed_product'
    UNION ALL
    SELECT order_id, ordered_at, customer_id,
           CASE WHEN customer_id IS NULL THEN 'guest-' || order_id END, 'completed_order',
           json_object('shipping_fee', shipping_fee), NULL
    FROM stg_orders
    UNION ALL
    SELECT l.order_id || '-' || l.line_no, o.ordered_at, o.customer_id,
           CASE WHEN o.customer_id IS NULL THEN 'guest-' || o.order_id END, 'ordered_item',
           json_object('order_id', l.order_id, 'product_id', l.product_id, 'quantity', l.quantity),
           l.quantity * l.unit_price
    FROM stg_order_lines AS l JOIN stg_orders AS o USING (order_id)
)
SELECT *,
       row_number() OVER w AS activity_occurrence,          -- 1 = the first time
       lead(ts) OVER w     AS activity_repeated_at          -- when it happened next
FROM activities
WINDOW w AS (PARTITION BY coalesce(customer, anonymous_customer_id), activity ORDER BY ts, activity_id);
```

#### Ben’s life as activities

```sql
SELECT activity, ts, feature_json, revenue_impact, activity_occurrence AS occ
FROM customer_stream
WHERE customer = 'C-002'
ORDER BY ts, activity;
```

Result (10 rows):

| activity | ts | feature_json | revenue_impact | occ |
|---|---|---|---|---|
| updated_segment | 2025-12-14 16:30:00 | {"segment":"hobbyist"} | NULL | 1 |
| viewed_product | 2026-03-07 13:00:00 | {"product_id":"P-03"} | NULL | 1 |
| completed_order | 2026-03-08 14:00:00 | {"shipping_fee":5.0} | NULL | 1 |
| ordered_item | 2026-03-08 14:00:00 | {"order_id":"O-1002","product_id":"P-03","quantity":2} | 16.00 | 1 |
| updated_segment | 2026-03-20 10:00:00 | {"segment":"pro"} | NULL | 2 |
| viewed_product | 2026-03-24 09:00:00 | {"product_id":"P-01"} | NULL | 2 |
| completed_order | 2026-03-25 11:00:00 | {"shipping_fee":0.0} | NULL | 2 |
| ordered_item | 2026-03-25 11:00:00 | {"order_id":"O-1007","product_id":"P-01","quantity":1} | 30.00 | 2 |
| ordered_item | 2026-03-25 11:00:00 | {"order_id":"O-1007","product_id":"P-03","quantity":3} | 24.00 | 3 |
| ordered_item | 2026-03-25 11:00:00 | {"order_id":"O-1007","product_id":"P-05","quantity":1} | 12.00 | 4 |

A changing attribute is *not* a column: Ben’s move to pro is an `updated_segment` activity. Activities are immutable; an activity stores only features it owns (the order line owns quantity, not the product’s category).

#### Four activities, one table

```sql
SELECT activity, count(*) AS row_count, count(customer) AS known_customer,
       sum(revenue_impact) AS revenue_impact
FROM customer_stream
GROUP BY activity
ORDER BY activity;
```

Result (4 rows):

| activity | row_count | known_customer | revenue_impact |
|---|---|---|---|
| completed_order | 9 | 8 | NULL |
| ordered_item | 13 | 12 | 292.00 |
| updated_segment | 6 | 6 | NULL |
| viewed_product | 10 | 9 | NULL |

The guest’s order and line, and one anonymous product view, have no `customer`; they carry `anonymous_customer_id` (`guest-O-1003`, `web-a77`) until identity resolution can attach them to a customer.

#### How it differs from a star

- No dimensions for the entity’s changing state, no foreign keys between activities: any activity relates to any other through `customer` and `ts` alone.
- One model layer instead of staging → marts: each activity is a short query from source tables, appended to the stream.
- Wide tables are assembled at query time by “borrowing” features from other activities (next lesson).
- **Coming from C#:** an append-only event log, like an event-sourcing store, with one schema for every event type and the payload in JSON.

> **On the job:** You are unlikely to be asked to build an Activity Schema, but you will meet its ideas: product-analytics event tables (Segment, Amplitude, GA4 exports), “customer 360” timelines, and the customer-journey questions they answer. Knowing the pattern lets you model a clean event table and recognise when a stream beats a star.

> **The main idea:** Activity Schema stores the entity’s history as one immutable stream of named activities with JSON features; state changes become activities, and relationships come from customer and time.

*Read more:* [Activity Schema 2.0 specification](https://github.com/ActivitySchema/ActivitySchema/blob/main/2.0.md), [Activity Schema repository](https://github.com/ActivitySchema/ActivitySchema), [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions).

---

<a id="slide-18"></a>
## 18. Temporal joins: “first after” and “last before”

*Part D · how do you query a stream with no foreign keys?*

Activity Schema queries start from a **cohort** activity (the rows of the result) and **append** other activities through a named **relationship** that only uses `customer` and `ts`. Appending never adds or removes rows, like a `LEFT JOIN` that returns at most one match. The common relationships:

| Relationship | For each cohort row, append… | Leafy example |
|---|---|---|
| First ever / last ever | the customer’s first (last) occurrence of the activity, any time | first product view of each customer |
| **First after** | the first occurrence after the cohort row | first order after the first view (Q3) |
| **Last before** | the last occurrence at or before the cohort row | segment at the time of each item (Q1): “as-was” without SCD2 |
| First in between | the first occurrence before the cohort activity happens again | did this visit lead to an order before the next visit? |
| Aggregate in between / before | an aggregate over occurrences in that window | pages viewed between two visits; revenue before this visit |

#### First after (Q3)

*SQL · Q3: first ever view → first order after, within 7 days*

```sql
WITH first_view AS (                         -- cohort: each customer's first product view
    SELECT customer, ts FROM customer_stream
    WHERE activity = 'viewed_product' AND activity_occurrence = 1 AND customer IS NOT NULL
)
SELECT v.customer, v.ts AS first_view_at,
       min(o.ts) AS first_order_after,                       -- "first after", within 7 days
       min(o.ts) IS NOT NULL AS converted_7d
FROM first_view AS v
LEFT JOIN customer_stream AS o
       ON o.customer = v.customer AND o.activity = 'completed_order'
      AND o.ts >= v.ts AND o.ts < v.ts + INTERVAL 7 DAY
GROUP BY v.customer, v.ts
ORDER BY v.customer;
```

Result (5 rows):

| customer | first_view_at | first_order_after | converted_7d |
|---|---|---|---|
| C-001 | 2026-03-01 09:00:00 | 2026-03-02 10:15:00 | true |
| C-002 | 2026-03-07 13:00:00 | 2026-03-08 14:00:00 | true |
| C-003 | 2026-03-11 08:00:00 | 2026-03-12 09:00:00 | true |
| C-004 | 2026-03-05 12:00:00 | NULL | false |
| C-005 | 2026-03-26 15:00:00 | 2026-03-27 16:20:00 | true |

4 of 5 customers converted within 7 days, the hand answer. C-004 ordered 9 days after the first view. The anonymous view is excluded by `customer IS NOT NULL`.

#### Last before (Q1) (added)

*SQL · Q1: each item → last segment before it*

```sql
SELECT coalesce(seg.feature_json ->> 'segment', 'unknown') AS segment_at_order,
       p.category, sum(i.revenue_impact) AS revenue
FROM customer_stream AS i
ASOF LEFT JOIN (SELECT customer, ts, feature_json FROM customer_stream
                WHERE activity = 'updated_segment') AS seg
       ON seg.customer = i.customer AND i.ts >= seg.ts        -- "last before"
JOIN stg_products AS p ON p.product_id = (i.feature_json ->> 'product_id')
WHERE i.activity = 'ordered_item'
GROUP BY ALL
ORDER BY segment_at_order, category;
```

Result (7 rows):

| segment_at_order | category | revenue |
|---|---|---|
| hobbyist | Succulent | 36.00 |
| hobbyist | Tools | 12.00 |
| hobbyist | Tropical | 60.00 |
| pro | Succulent | 52.00 |
| pro | Tools | 12.00 |
| pro | Tropical | 105.00 |
| unknown | Tropical | 15.00 |

DuckDB’s `ASOF LEFT JOIN` is exactly “last before”: for each item, the latest `updated_segment` at or before it. Same answer as the star and the vault, with no SCD2 dimension at all.

#### Dialects for “last before” (added)

- **DuckDB, Snowflake:** `ASOF JOIN … MATCH_CONDITION` (Snowflake) / `ASOF JOIN … ON … AND a.ts >= b.ts` (DuckDB).
- **T-SQL / Fabric Warehouse:** no ASOF join; use `OUTER APPLY (SELECT TOP 1 … WHERE b.ts <= a.ts ORDER BY b.ts DESC)`.
- **Spark SQL:** union both activities and take `last(segment, true)` over a window ordered by `ts`, or join and keep `row_number() = 1`.
- *Other-engine syntax is reference only and was not executed.*

#### Limits to know

- One entity per stream: B2B needs a `company_stream` too, and cross-entity questions get harder.
- Identity resolution is your job: anonymous ids must be stitched to customers.
- Features in JSON are weakly typed; finance-grade reporting still wants conformed dimensions and tested facts.
- Tooling and adoption are small compared with Kimball; treat it as a pattern to know, not a default.

> **On the job:** “First after” and “last before” are the building blocks of every funnel, attribution and journey query, whatever the model. Learn to write them on any event table: first-touch attribution is “first ever”, conversion windows are “first after” with a time limit, and point-in-time features for ML are “last before”.

> **The main idea:** in a stream, every relationship is a self-join on customer and time: first after for conversion, last before for as-was state; ASOF joins make the second one a single line.

*Read more:* [Activity Schema 2.0 specification](https://github.com/ActivitySchema/ActivitySchema/blob/main/2.0.md), [DuckDB: ASOF join](https://duckdb.org/docs/stable/guides/sql_features/asof_join), [Snowflake: ASOF JOIN](https://docs.snowflake.com/en/sql-reference/constructs/asof-join).

---

<a id="slide-19"></a>
## 19. One question, five models: the scorecard

*Part E · what did each model cost for the same answer?*

Every model answered Q1 with the hand-checked numbers. The differences are in what they store, how much the reader must know, and how they absorb change. The scorecard below is computed from the lab, not typed.

```python
import re
from pathlib import Path
from run_lab import MODELS, storage

joins = lambda sql: len(re.findall(r"\bJOIN\b", sql))
view_joins = joins(Path("sql/06_vault_mart.sql").read_text(encoding="utf-8"))   # the vault mart view
stored = {m: (t, r) for m, t, r in storage(con).fetchall()}
sql = {m: Path(f"sql/questions/q1_{m}.sql").read_text(encoding="utf-8") for m in MODELS}
answers = {m: con.sql(sql[m]).fetchall() for m in MODELS}
print(f"{'model':10} {'tables':>6} {'rows':>5} {'joins for Q1':>14}  same Q1 answer as star")
for m in MODELS:
    n = joins(sql[m]) + (view_joins if m == "vault" else 0)
    print(f"{m:10} {stored[m][0]:>6} {stored[m][1]:>5} {n:>14}  {answers[m] == answers['star']}")
assert all(a == answers["star"] for a in answers.values())
```

Output:

```text
model      tables  rows   joins for Q1  same Q1 answer as star
inmon_3nf       6    43              4  True
star            5    45              2  True
obt             1    13              0  True
vault          10    81              7  True
stream          1    38              2  True
```

|  | Inmon 3NF | Kimball star | OBT | Data Vault | Activity stream |
|---|---|---|---|---|---|
| Q1: as-was segment | History table + range join | Resolved at load (SCD2 key) | A column | ASOF on the business date | Last before (ASOF) |
| Q2: as-is segment | Filter current version | Join current version | A column, as old as the build | Latest satellite row | Last ever |
| Q3: view → order in 7 days | Needs an events table and a time join | Two facts, drill-across by customer | Needs a second OBT | Needs an event satellite or link | One self-join |
| A new source (the CRM) | Alter and migrate tables | New dimension columns, rebuild | Rebuild with new columns | **New satellite only** | New activities or entity columns |
| A dimension attribute changes | New history row | New SCD2 row | **Full rewrite** | New satellite row | New activity |
| Who reads it directly | Data engineers | **Analysts, BI tools** | **One consumer** | Nobody: marts on top | Analysts with sequence questions |

> **On the job:** Put a scorecard like this in an architecture review. It moves the discussion from “which methodology is best” to “which costs do we want to pay, in which layer”, which is the conversation senior engineers expect.

> **The main idea:** same answer, different bills: the star reads simply, the OBT reads simplest but rewrites on change, the vault absorbs change but needs marts, the stream makes sequences trivial.

*Read more:* [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/), [Data vault modeling (Wikipedia)](https://en.wikipedia.org/wiki/Data_vault_modeling), [Activity Schema 2.0 specification](https://github.com/ActivitySchema/ActivitySchema/blob/main/2.0.md).

---

<a id="slide-20"></a>
## 20. Kimball, Inmon, Data Vault and OBT at platform level

*Part E · how do the approaches fit together on one platform?*

| Dimension | Inmon (3NF EDW) | Kimball (bus of stars) | Data Vault | One Big Table |
|---|---|---|---|---|
| Philosophy | Integrate the enterprise first (top-down) | Deliver business processes, integrate via conformed dimensions (bottom-up) | Capture every source’s history, integrate by business key, decide later | Serve one consumer with zero joins |
| Shape | Normalized (3NF) | Denormalized dimensions, narrow facts | Hubs, links, satellites | One wide table per grain |
| Where integration happens | In the EDW | In conformed dimensions | In hubs (business keys) | Inherited from the star it is built from |
| History | Versioned rows in the EDW | SCD types per attribute | Complete, insert-only, two clocks | Whatever columns were copied at build time |
| Change tolerance | Low: schema changes ripple | Medium: dimension changes, new stars | High: new sources add tables | Low: every change is a rebuild |
| Query ease | Hard: many joins | Easy: star joins | Very hard directly; easy via marts | Easiest |
| Typical layer | Silver (integration) | Gold (marts) | Silver (integration) | Serving, on top of gold |
| Typical place | Large enterprises, legacy EDWs | Almost every analytics platform | Regulated, multi-source enterprises | Dashboards, ML features, exports |

#### A reference stack

1. **Bronze** (raw, as landed): Files and tables exactly as delivered, with load metadata.
2. **Silver** (staging (+ integration)): Staging always; a Data Vault or 3NF layer only when many changing sources and audit demand it.
3. **Gold** (Kimball marts): Facts and conformed dimensions: the tested source of truth.
4. **Serving** (projections): OBTs and extracts for specific consumers; the semantic layer (next deck).

#### How to say it in one breath

> Inmon and Data Vault are about integrating and historizing data from many sources; Kimball is about presenting it for analysis; an OBT is a convenience copy for one consumer. On a modern platform they stack: optional integration model in silver, Kimball stars in gold, OBTs on top. I add the integration model only when the sources and audit needs justify it.

**Not in this deck:** where the semantic layer sits and how marts are served to BI, reverse ETL, APIs and AI agents. That is the data serving architecture deck.

> **On the job:** Architecture documents and portfolio READMEs need exactly this: a layer diagram with one modeling approach per layer and one sentence of justification each. For Fuel Smart: staging and intermediate in silver (no vault: two stable public sources), a star in gold, `mart_recipe_nutrition` as the serving table.

> **The main idea:** at platform level the approaches stack rather than compete: integrate (Inmon or Data Vault) only when needed, present with Kimball, serve with OBTs.

*Read more:* [Kimball Group: the Kimball DW/BI architecture](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/kimball-data-warehouse-bus-architecture/), [Data warehouse: Inmon and Kimball (Wikipedia)](https://en.wikipedia.org/wiki/Data_warehouse), [Fabric: medallion lakehouse architecture](https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture), [Databricks: Data Vault on the lakehouse](https://www.databricks.com/blog/2022/06/24/prescriptive-guidance-for-implementing-a-data-vault-model-on-the-databricks-lakehouse-platform.html).

---

<a id="slide-21"></a>
## 21. Interview patterns: recognise which approach the question wants

*Part E · signal in the question → what to reach for*

| Signal in the question | Reach for | Say this first |
|---|---|---|
| “Business users”, “dashboards”, “self-service”, “Power BI” | Kimball star | Grain, facts, conformed dimensions; Power BI wants a star |
| “One dashboard is slow / analysts hate joins” | OBT built from the star | One grain, built from marts, tested totals; measure first |
| “Ten sources”, “audit”, “regulator”, “schemas change monthly” | Data Vault in silver + marts | Hubs, links, satellites; insert-only; marts on top |
| “Single version of the truth across the enterprise”, “governance first” | Inmon-style integration layer | Integrate once, then dependent marts; slower first value |
| “Kimball vs Inmon?” | Where integration happens | Both, in different layers; choose by sources and time-to-value |
| “Who did X then Y within N days?”, “customer journey” | Event stream / Activity Schema ideas | First after with a window; last before for state |
| “What was the segment at the time?” vs “now?” | SCD2, satellites, or last before | Name the clock: business date, not load date |
| “Totals in the wide table are too high” | Grain check | An order-level column in a line-grain table: fan-out |

#### A 4-step answer for design questions

1. **Consumers and questions:** who reads it, with which tool?
2. **Sources and change:** how many, how stable, any audit needs?
3. **Layers:** what lives in silver, gold and serving, and why.
4. **Costs and checks:** what you pay, and the test that proves it right.

#### Further practice

Public question banks with modeling theory and design prompts: [DataDriven: data warehouse interview questions (practice)](https://datadriven.io/data-warehouse-interview-questions) and [DataDriven: Data Vault for interviews (practice)](https://datadriven.io/data-modeling/data-vault). Answer them with the 4 steps and one of the scorecard rows as evidence.

> **On the job:** Interviewers rarely want a methodology lecture. They want to hear that you start from consumers and sources, place each model in a layer, and know the failure mode of each (fan-out in OBTs, the wrong clock in vaults, drifting non-conformed marts).

> **The main idea:** map the words in the question to forces (consumers, sources, change, audit, sequence), then to a layer and an approach, and finish with the cost and the test.

---

<a id="slide-22"></a>
## 22. Lab: one question, five models, one test suite

*Lab · the task, the data, and the plan*

**Goal:** build Leafy’s Q1 (March revenue by segment at order time and category) as an Inmon 3NF layer, a Kimball star, an OBT, a Data Vault with an information mart, and an Activity Schema stream; prove they agree with a hand-checked answer; then push a change through all five and write a one-page decision. The lab folder `modeling-approaches-lab/` sits next to this deck and runs offline in a few seconds.

#### What is in the folder

| Path | What it is |
|---|---|
| `data/*.csv` | The six landed files (two batches, two sources), exactly as used in this deck |
| `sql/00_staging.sql` … `07_stream.sql` | Every model in this deck, one file each (the deck ran these exact statements) |
| `sql/questions/` | Q1 for each model, Q3 for the stream |
| `run_lab.py` | Builds everything in an in-memory DuckDB, loads the vault batch by batch, prints the comparison |
| `tests/test_lab.py` | 11 pytest tests: hand answer ×5, OBT grain, shipping grain, as-was vs as-is, vault replay, hub keys, funnel |
| `templates/obt-vs-star-decision.md` | The one-page decision template from lesson 11 |

#### Plan (about 90 minutes)

1. **15 min · by hand:** fill the table below yourself from `data/` before running anything.
2. **10 min · run:** `python run_lab.py` and `python -m pytest -q` (next slide).
3. **40 min · change request:** push one change through all five models (next slide) and note what each needed.
4. **25 min · decide:** fill the decision template for the marketing dashboard or for Fuel Smart.

#### Check it by hand first

| Order | Placed (UTC) | Customer → segment at order | Lines → category: revenue |
|---|---|---|---|
| O-1001 | 2 Mar 10:15 | C-001 → hobbyist | Tropical 30.00, Tools 12.00 |
| O-1002 | 8 Mar 14:00 | C-002 → **hobbyist** (pro only from 20 Mar) | Succulent 16.00 |
| O-1003 | 9 Mar 18:30 | guest → unknown | Tropical 15.00 |
| O-1004 | 12 Mar 09:00 | C-003 → pro | Tropical 60.00, Succulent 20.00 |
| O-1005 | 14 Mar 20:45 | C-004 → hobbyist | Succulent 20.00 |
| O-1006 | 15 Mar 23:50 (arrived in batch 2) | C-001 → hobbyist | Tropical 30.00 |
| O-1007 | 25 Mar 11:00 | C-002 → **pro** | Tropical 30.00, Succulent 24.00, Tools 12.00 |
| O-1008 | 27 Mar 16:20 | C-005 → pro | Succulent 8.00 |
| O-1009 | 30 Mar 08:10 | C-003 → pro (moved city on 28 Mar; segment unchanged) | Tropical 15.00 |

Totals: hobbyist 108.00, pro 169.00, unknown 15.00, all 292.00. Shipping (37.50 in total) is not revenue and lives at order grain. Q3: C-001, C-002, C-003 and C-005 ordered within 7 days of their first product view; C-004 did not (9 days).

> **On the job:** This is how a modeling change is reviewed on a good team: a fixture small enough to reason about, a written expected answer, and tests that every model must pass before anyone discusses performance or style.

> **The main idea:** the lab turns the deck into one reproducible comparison: five models, one fixture, one hand answer, eleven tests.

*Read more:* [pytest documentation](https://docs.pytest.org/en/stable/), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="slide-23"></a>
## 23. Lab steps: run, test, then push a change through

*Lab · two commands, eleven tests, one change request*

#### 1 · Run all five models

Terminal:

```text
$ python run_lab.py
Q1: March revenue by segment at order time and category (star)
segment_at_order  category   revenue
hobbyist          Succulent  36.00
hobbyist          Tools      12.00
hobbyist          Tropical   60.00
pro               Succulent  52.00
pro               Tools      12.00
pro               Tropical   105.00
unknown           Tropical   15.00

All five models agree: True - inmon_3nf, star, obt, vault, stream

Q3: first product view -> order within 7 days (activity stream)
customer  first_view_at        first_order_after    converted_7d
C-001     2026-03-01 09:00:00  2026-03-02 10:15:00  True
C-002     2026-03-07 13:00:00  2026-03-08 14:00:00  True
C-003     2026-03-11 08:00:00  2026-03-12 09:00:00  True
C-004     2026-03-05 12:00:00  NULL                 False
C-005     2026-03-26 15:00:00  2026-03-27 16:20:00  True

Tables and rows stored per model
model      tables  rows_stored
inmon_3nf  6       43
obt        1       13
star       5       45
stream     1       38
vault      10      81
```

#### 2 · Run the tests

Terminal (timing measured on the build machine):

```text
$ python -m pytest -q
...........                                                              [100%]
11 passed in 1.20s
```

Each Q1 test compares a model with the hand answer from the previous slide, not with another model, so two models cannot be “consistently wrong” together.

#### 3 · Change request: “Leafy adds a care level per product, and Ana becomes pro on 2 April”

| Model | What you change | What to observe |
|---|---|---|
| Inmon 3NF | Add `care_level` to `edw_product` (or a product-care table); append Ana’s version to the profile history | Schema change plus migration in the integration layer |
| Star | Add `care_level` to `dim_product`; a new SCD2 row for Ana | Facts untouched; March answers unchanged; Q2 (as-is) moves Ana’s revenue to pro |
| OBT | Add the column and **rebuild** | Every row rewritten; `segment_current` stale until you do |
| Data Vault | A new satellite `sat_product_care`; load batch 3 with Ana’s new row | No existing table altered; replaying batch 3 inserts nothing |
| Activity stream | `care_level` in the products entity table; an `updated_segment` activity for Ana | Q1 unchanged (last before still finds hobbyist for March); last-ever segment is pro |

Add a `care_level` column to `data/products.csv` (and to `stg_products`), add Ana’s new version to `data/shop_customers.csv` with `updated_at = 2026-04-02 09:00:00` and `_loaded_at = 2026-04-16 06:00:00`, add that batch to `LOADS` in `run_lab.py`, and add one test per row of this table. **Definition of done:** all old tests still pass, the new tests pass, and you can say in one sentence what each model needed.

> **On the job:** “Walk me through what happens when a new attribute arrives” is a favourite follow-up after any modeling question. Having pushed one real change through five models, you can answer with specifics instead of slogans.

> **The main idea:** run, test against the hand answer, then change something: the change request is where the approaches really differ.

*Read more:* [pytest documentation](https://docs.pytest.org/en/stable/).

---

<a id="slide-24"></a>
## 24. Bug clinic: believable modeling bugs

*Practice · symptom → cause → fix*

Every bug below produces numbers that look plausible. Learn the *symptom*, because that is what you see first in a dashboard or a review.

| Symptom | Cause | Fix | Lesson |
|---|---|---|---|
| Shipping (or any order-level amount) too high in the wide table | Order-grain column repeated on line-grain OBT rows | Keep it at order grain; one OBT per grain | 9 |
| Revenue inflated only for customers whose attributes changed | Fact joined to an SCD2 dimension on the natural key | Join on the surrogate key, or on the key + validity range | 7 |
| Dashboard still shows last week’s segments | OBT not rebuilt when the dimension changed | Rebuild OBTs in the same run as the star; test freshness | 9 |
| Two hub rows for the same customer | Hash of an unnormalized key (`" c-001"` vs `"C-001"`) | Hash `upper(trim(key))`; test hub uniqueness on the normalized key | 13 |
| A real change never reached the satellite, or a fake one did | `concat_ws` skips NULLs, so different tuples hash the same | `coalesce` every attribute (and keep the column order fixed) before hashing | 14 |
| Every replay of a batch adds satellite rows | Insert without comparing to the latest hashdiff (or `load_ts` inside the hashdiff) | Compare with the latest row per key; primary key on (key, load_ts) | 14 |
| As-was report puts early orders into “unknown” | Satellite version chosen by `load_ts` | Choose by the business date; keep `load_ts` for audit | 15 |
| Vault mart revenue doubles after an order is reassigned | Two link rows for one order (old and new customer) | Effectivity satellite on the link; pick the active relationship | 15 |
| Funnel shows more views than happened | An event delivered twice | Deduplicate by event id in staging, once for every model | 3 |
| Guests vanish from customer counts in the stream | `customer` is NULL; anonymous ids never stitched | Identity resolution: back-fill `customer` when the link is known | 17 |
| Marts disagree on “how many customers” | Each mart built its own customer table | Conformed dimensions planned on the bus matrix | 6 |

#### Executed: SCD2 joined on the natural key

*SQL · believable, but wrong*

```sql
SELECT sum(l.quantity * l.unit_price) AS revenue          -- should be 292.00
FROM stg_order_lines AS l
JOIN stg_orders      AS o USING (order_id)
JOIN dim_customer    AS c ON c.customer_id = o.customer_id;   -- natural key: every version matches
```

Result (1 row):

| revenue |
|---|
| 454.00 |

Ben and Chloe each have two versions, so their order lines match twice; the guest order disappears in the inner join. The total is 454.00 instead of 292.00. The star’s load picks *one* version per row with the validity range (lesson 7).

#### Executed: the NULL hashdiff collision

```sql
SELECT md5(concat_ws('||', NULL, 'x')) = md5(concat_ws('||', 'x', NULL)) AS raw_collides,
       md5(concat_ws('||', coalesce(NULL, ''), 'x'))
     = md5(concat_ws('||', 'x', coalesce(NULL, '')))                  AS coalesced_collides;
```

Result (1 row):

| raw_collides | coalesced_collides |
|---|---|
| true | false |

`concat_ws` drops NULL arguments, so `(NULL, 'x')` and `('x', NULL)` both become `'x'`. With `coalesce` the positions survive and the hashes differ.

> **On the job:** In review, ask five questions of any model: what is the grain of each table, which key joins to a history table, which clock picks a version, how are keys normalized before matching or hashing, and what makes a replay safe? Most rows of this table fail one of them.

> **The main idea:** modeling bugs hide in grain, history joins, clocks, key normalization and replays; each has a one-line test that catches it.

---

<a id="slide-25"></a>
## 25. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

Say each answer aloud in about a minute before opening it. The questions follow the research for this deck (October 2026): Kimball vs Inmon, “explain Data Vault”, star vs OBT, design scenarios and history questions were the most frequent modeling-theory topics in data and analytics engineering interview guides and write-ups.

<details><summary>“Compare Kimball and Inmon. Which would you choose?” · checks: where integration happens, time to value, the modern hybrid</summary>

**Model answer (about 60 s):** Inmon builds an integrated, normalized enterprise warehouse first and derives departmental marts from it: top-down, consistent, slow to first value. Kimball builds dimensional marts per business process and integrates them through conformed dimensions on a bus matrix: bottom-up, fast, but marts drift if dimensions are not really conformed. Today they usually stack: an integration layer in silver when there are many sources, and Kimball stars in gold. For most teams I would go staging → intermediate → conformed star and add a separate integration model only when sources and audit needs justify it.

**Likely follow-up:** “Which for a five-person team with three sources?” → Kimball through dbt layers; a 3NF or vault layer would be overhead.

</details>

<details><summary>“Explain Data Vault in two minutes.” · checks: hubs, links, satellites, insert-only, marts on top, when it fits</summary>

**Model answer (about 60 s):** Data Vault models the integration layer. Hubs hold unique business keys, links hold relationships between keys, satellites hold descriptive attributes and their history, one per source. Everything is insert-only and stamped with load time and record source, so it is auditable and replayable, and a new source adds a satellite instead of changing tables. Keys are hashes of normalized business keys, so loads run in parallel. Nobody queries the raw vault: a business vault applies rules and information marts, usually stars, serve users. It fits many volatile sources with audit needs; for a few stable sources it is overhead.

**Likely follow-up:** “Why hash keys instead of sequences?” → Deterministic and computed independently by each loader, so no lookups and no load order; the same key in every system. Normalize before hashing.

</details>

<details><summary>“Star schema or one big table on Snowflake or BigQuery?” · checks: consumers, history, grain, rebuild cost, the BI tool</summary>

**Model answer (about 60 s):** Both, in different roles. The star is the source of truth: conformed dimensions, SCD history, one place to change an attribute. Where one consumer, such as a dashboard, an ML feature set or an export, needs a fixed set of columns, I build an OBT from the star at the fact grain, with tests that its rows and totals match the fact. Columnar engines read only the columns used, so a wide table is cheap to read; it costs storage and a full rewrite whenever a dimension changes. I would measure on our warehouse before choosing for speed.

**Likely follow-up:** “And if the dashboard is Power BI?” → Model the semantic model as a star: VertiPaq compresses per column and DAX filters flow from dimensions to facts; a flat table gets bigger and harder to write measures on.

</details>

<details><summary>“When would you not use Data Vault?” · checks: knowing the cost, not just the pitch</summary>

**Model answer (about 60 s):** When there are one or two stable sources, no audit requirement to reconstruct what each source said, and the team needs dashboards soon. A vault triples the table count, needs marts before anyone can use it, and needs people who can design business keys, satellites and PIT tables. In that case staging, a few intermediate models and a conformed star give the same answers with less to run.

**Likely follow-up:** “What would make you change your mind later?” → A third and fourth source describing the same customers, schema changes every month, or a regulator asking for history per source; then introduce a vault in silver without changing the gold marts.

</details>

<details><summary>“Where does history live in each approach?” · checks: SCD2 vs satellites vs streams, and the two clocks</summary>

**Model answer (about 60 s):** In a star, in Type 2 dimension rows with validity ranges, and the fact stores the version key at load time. In a Data Vault, in satellites: one insert per change, with the load time and the source’s own business date. In an Activity Schema, as activities such as updated_segment, and “as-was” is a last-before join. In every case I separate the business date, when it happened, from the load date, when we learned it.

**Likely follow-up:** “Which clock for a finance report?” → The business (effective) date; load dates answer audit questions such as “what did the report show on 2 April?”.

</details>

<details><summary>“How do you make a vault load idempotent?” · checks: hashdiff, insert-only, keys</summary>

**Model answer (about 60 s):** Every insert is “new only”: hubs and links insert keys that are not there yet, satellites insert a row only when the hashdiff differs from the latest row for that key. Primary keys on the hash key, and on hash key plus load time for satellites, reject duplicates. Replaying a batch therefore inserts nothing, which makes retries and late files safe.

**Likely follow-up:** “And deletes in the source?” → Never delete in the vault: record them in a status or effectivity satellite (a deleted flag with its time) and filter in the marts.

</details>

<details><summary>“Model clickstream data so we can ask ‘viewed, then purchased within 7 days’.” · checks: event grain, first after, identity</summary>

**Model answer (about 60 s):** Keep one row per event with the entity id, timestamp, event name and its own attributes, either as an event fact or an Activity Schema stream. The question is a “first after” relationship: for each customer’s first view, the first purchase at or after it and within 168 hours. I deduplicate events by id in staging, keep anonymous ids and stitch them to customers when they log in, and exclude entries whose 7-day window has not closed yet.

**Likely follow-up:** “What about ties and repeated views?” → Allow a purchase at the same second (>=) and say so; anchor on the first view unless the question asks per view.

</details>

<details><summary>“Map bronze, silver and gold to dbt layers, and place these approaches.” · checks: the layer stack</summary>

**Model answer (about 60 s):** Bronze is sources, landed as delivered. Silver is staging, one cleaned model per source, plus intermediate models; that is also where an Inmon-style or Data Vault integration layer sits if there is one. Gold is the marts: Kimball facts and conformed dimensions. OBTs and other projections sit on top of gold for specific consumers.

**Likely follow-up:** “Where does the semantic layer go?” → On top of the gold marts, between them and the consumers; that and the serving paths are the topic of the data serving architecture deck.

</details>

> **On the job:** Modeling questions are judged on trade-offs. Every strong answer above names the forces (consumers, sources, change, audit), places the approach in a layer, and states its failure mode. Practise ending each answer with “…and I would test it by…”.

> **The main idea:** answer modeling questions with layers and trade-offs, not loyalty: say where each approach belongs, what it costs, and how you would prove it right.

---

<a id="slide-26"></a>
## 26. Exercises 1–5: shapes, grains, hashes and satellites

*Exercises · warm-ups and interview tasks*

All exercises use the lab models (lesson 22): run Python inside `modeling-approaches-lab/`, where `from run_lab import build` returns a DuckDB connection with every model of this deck built from the fixture. Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · Name the table from its columns (warm-up)

Write `classify(columns)` that returns `"hub"`, `"link"`, `"satellite"`, `"dimension"`, `"fact"`, `"obt"` or `"stream"` from a table’s column names only, and check it on eight lab tables: `hub_order`, `link_order_line`, `sat_order`, `dim_product`, `fct_order_line`, `obt_order_lines`, `customer_stream`, `dim_customer`. **Expected:** each table gets its own kind. **Pattern:** recognise a model from its shape (“what kind of table is this?”). **Target time:** about 10 min.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Prove the OBT keeps the fact’s grain (warm-up)

Write one query that returns, for `obt_order_lines` vs `fct_order_line`: both row counts, both revenue totals, and the number of duplicate `(order_id, line_no)` pairs in the OBT. **Expected:** `(13, 13, 292.00, 292.00, 0)`. **Pattern:** reconciliation test for a denormalized table. **Target time:** about 8 min.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Normalize before hashing (warm-up)

The CRM sends `[" c-001", "C-002 ", "c-004", "C-006"]`. Compute `md5` of each raw value and of each normalized value, and count how many match a `customer_hk` in `hub_customer`. **Expected:** raw 1 of 4 (only the already-clean `C-006`), normalized 4 of 4. **Pattern:** Data Vault hash keys, business-key integration. **Target time:** about 8 min.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Find and fix: shipping by segment from the wide table

A teammate added `shipping_fee` to the OBT and reported shipping by segment at order time with `SELECT segment_at_order, sum(shipping_fee) … GROUP BY ALL`. Reproduce the bug, then write the correct query. **Expected (fixed):** hobbyist 20.00, pro 10.00, unknown 7.50 (total 37.50). **Pattern:** “why is my total too high?”, mixed grains. **Target time:** about 12 min.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Current state from a satellite

From `hub_customer` and `sat_customer_shop`, return each customer’s *current* segment and city (latest satellite row per key), ordered by customer id. Skip the ghost record. **Expected:** C-001 hobbyist Austin · C-002 pro Chicago · C-003 pro Boulder · C-004 hobbyist Austin · C-005 pro Chicago. **Pattern:** latest row per group (`QUALIFY row_number()`). **Target time:** about 10 min.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

> **The main idea:** recognise a model by its shape, prove an OBT against its fact, normalize before you hash, sum at the right grain, and pick the latest satellite row per key.

---

<a id="slide-27"></a>
## 27. Exercises 6–10: streams, vault loads, design and a take-home

*Exercises · interview tasks and stretch*

Exercises 6–8 use the lab models (`from run_lab import build`, inside `modeling-approaches-lab/`); exercises 9 and 10 are self-contained. Write your answer first; hints and solutions are collapsed (Appendices A and B in the Markdown companion). Every solution ran during the build and its `assert` lines passed.

### Exercise 6 · Per-view conversion: first order after each view, within 48 hours

From `customer_stream`, for every `viewed_product` activity of a known customer, find the first `completed_order` by the same customer at or after the view and within 48 hours. Return the number of views and of converted views. **Expected:** 9 views, 6 converted. **Pattern:** conversion window, “first after” per event. **Target time:** about 12 min.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · As-was vs as-is from the stream, checked against the OBT

Using only `customer_stream`, list every order line where the customer’s segment at the time of the item (last `updated_segment` before it) differs from their latest segment (last ever). Return customer, order id and both segments, and check the result equals the OBT’s `segment_at_order <> segment_current` rows. **Expected:** one row, C-002, O-1002, hobbyist → pro. **Pattern:** point-in-time join (“what was true then?”). **Target time:** about 15 min.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Predict a vault load, then run it twice

Batch 3 lands at `2026-04-16 06:00:00`: C-001 unchanged, C-004 moved to *pro* (`updated_at` 5 April), and a new order O-1010 for **C-006** with one line. Before running anything, predict how many rows batch 3 inserts into `hub_customer`, `hub_order`, `link_order_customer`, `link_order_line`, `sat_customer_shop`, `sat_order`, `sat_order_line`, and how many a replay inserts. **Expected:** 0, 1, 1, 1, 1, 1, 1; replay all 0. **Pattern:** idempotent, insert-only loads. **Target time:** about 15 min.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Choose the approach (design, stretch)

For each scenario, choose `"inmon"`, `"star"`, `"obt"`, `"data_vault"` or `"activity"`, and give a one-line reason. (a) A bank merges 14 source systems; the regulator asks what each system said about a customer on any past date. (b) Marketing’s single Looker dashboard reads a six-way join and the team wants one table. (c) Finance builds a Power BI semantic model of margin by product, region and month. (d) Growth asks: of users who started a trial, how many invited a teammate before their first payment? (e) An insurer wants one governed, normalized enterprise model of policies and claims before any reporting. **Pattern:** design-choice scenario. **Target time:** about 10 min.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Take-home: Fuel Smart’s nutrition mart and its one-page decision

Build a tiny Fuel Smart star (3 recipes, 4 foods with nutrients per 100 g, ingredient lines in grams, one unmatched line), then `mart_recipe_nutrition`: one row per recipe with `kcal_per_serving`, `protein_g_per_100kcal` and `matched_line_share`. Reconcile protein with the star and write the decision as a dict (consumer, grain, leaves out, history, checks). **Expected:** Chicken salad 18.51, Lentil soup 7.99, Oat bowl 3.48 g protein per 100 kcal; lentil soup has 2 of 3 lines matched. **Pattern:** take-home design + OBT-vs-star decision. **Target time:** about 30 min.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** time windows belong in the join, history needs the right clock, vault loads are predictable from keys and hashdiffs, and every design answer names the force that decided it.

---

<a id="slide-28"></a>
## 28. Cheat sheet

*Reference · the deck on one page*

| Task | Pattern (DuckDB) | Watch out |
|---|---|---|
| As-was join to a history table | `ON k = k AND t >= valid_from AND t < valid_to` | Never join an SCD2 table on the natural key alone |
| Build an OBT | `CREATE TABLE obt_x AS SELECT f.*, d.* FROM fct … JOIN dim …` | One grain; from marts; name history columns `_at_order` / `_current` |
| Test an OBT | rows = fact rows; `sum(measure)` = fact sum; key unique | Order-level columns on line-grain rows |
| Hash key | `md5(upper(trim(business_key)))` | Normalize before hashing; same rule in every loader |
| Link hash key | `md5(concat_ws('\|\|', key_a, key_b))` | Fixed column order; a delimiter |
| Hashdiff | `md5(concat_ws('\|\|', coalesce(a, ''), coalesce(b, '')))` | `concat_ws` skips NULLs |
| Hub / link load | `INSERT … WHERE hk NOT IN (SELECT hk FROM hub)` | Insert-only; primary key on the hash key |
| Satellite load | insert where `hashdiff IS DISTINCT FROM` latest row’s | Replay must insert nothing |
| Batch parameter | `SET VARIABLE load_ts = TIMESTAMP '…'`; `getvariable('load_ts')` | DuckDB 1.1+ |
| Latest row per key | `QUALIFY row_number() OVER (PARTITION BY k ORDER BY load_ts DESC) = 1` | `max()` per column mixes versions |
| Last before (as-was) | `ASOF LEFT JOIN s ON s.k = e.k AND e.ts >= s.ts` | Pick the business date, not `load_ts` |
| First after, within N | `LEFT JOIN … ON same customer AND o.ts >= v.ts AND o.ts < v.ts + INTERVAL N` | Window in `ON`, not `WHERE` |
| First occurrence | `activity_occurrence = 1` (from `row_number()`) | Partition by customer and activity |
| Choose an approach | Consumers → star; one consumer → OBT; many changing sources + audit → Data Vault; enterprise model first → Inmon; sequences → stream | They stack by layer; they do not compete |

| Layer | Approach that usually lives there |
|---|---|
| Bronze | None: data as landed |
| Silver | Staging (always); Inmon 3NF or Data Vault (only when justified) |
| Gold | Kimball facts and conformed dimensions |
| Serving | OBTs, extracts; the semantic layer (data serving architecture deck) |

---

<a id="slide-29"></a>
## 29. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| **Normalization / 3NF** | Storing each fact once; in third normal form every non-key column depends on the key, the whole key and nothing but the key. |
| **Denormalization** | Deliberately repeating data to save joins for readers. |
| **Integration layer** | Where data about the same business thing from several sources is combined under one key, with history. |
| **Presentation layer** | What people and BI tools query; in Kimball, the dimensional marts. |
| **Inmon / Corporate Information Factory (CIF)** | Top-down architecture: an integrated 3NF enterprise data warehouse first, dependent data marts derived from it. |
| **Enterprise data warehouse (EDW)** | The integrated, subject-oriented, time-variant, non-volatile store at the centre of Inmon’s architecture. |
| **Dependent data mart** | A departmental mart derived from the EDW rather than from sources. |
| **Top-down / bottom-up** | Enterprise model first (Inmon) vs one business process at a time, integrated by conformed dimensions (Kimball). |
| **One Big Table (OBT)** | A single, fully denormalized table at one grain carrying measures and all needed attributes, so readers need no joins. |
| **Projection / read model** | A table derived from the source of truth for one consumer and rebuilt from it, never edited directly. |
| **Columnar storage** | Storing data by column, so a query reads only the columns it uses. |
| **VertiPaq** | The in-memory columnar engine of Power BI and Analysis Services semantic models. |
| **Data Vault (2.0)** | An integration-layer method that splits sources into hubs, links and satellites; insert-only and source-stamped. |
| **Business key** | The identifier the business uses for a thing (customer number, order number), as opposed to a generated key. |
| **Hub** | A table of unique business keys for one concept, with hash key, first load time and record source. |
| **Link** | A table recording relationships between hubs’ keys; no descriptive columns. |
| **Satellite** | A table of descriptive attributes of one hub or link, with a new row per change. |
| **Hash key** | A fixed-length hash (here MD5) of a normalized business key, used as the vault’s key. |
| **Hashdiff** | A hash of all attribute values of a satellite row, used to detect change. |
| **Load date (`load_ts`)** | When the warehouse received a row; used for audit and replay. |
| **Business (effective) date** | When the change happened in the source; used for as-was history. |
| **Record source** | Which system a row came from. |
| **Ghost record** | A fixed “unknown” hub row so links never hold NULL keys. |
| **Raw vault / business vault** | Hubs, links and satellites loaded without business rules / extra insert-only tables that apply rules. |
| **Information mart** | A star or OBT built from the vault for consumers. |
| **PIT table** | Point-in-time table: per key and snapshot date, the load time of the valid row in each satellite. |
| **Bridge table (Data Vault)** | Pre-joined hub and link keys along a common query path. |
| **Effectivity satellite** | A satellite on a link recording when a relationship starts and ends. |
| **Same-as link** | A link mapping two business keys that identify the same thing. |
| **Idempotent load** | A load that can be run again with the same input without changing the result. |
| **Session variable** | A named value stored in the DuckDB connection with `SET VARIABLE` and read with `getvariable()`. |
| **Activity Schema** | An open specification that models one entity’s activities as one time-series stream table. |
| **Entity / activity** | The subject of the stream (usually the customer) / one named, immutable action it took at a time. |
| **`feature_json`** | The activity’s own attributes as JSON. |
| **`anonymous_customer_id`** | A source-specific id used until the global customer id is known. |
| **Identity resolution** | Linking anonymous ids to known customers and back-filling their activities. |
| **`activity_occurrence` / `activity_repeated_at`** | The n-th time the customer did this activity / when they did it next. |
| **Cohort and append activities** | The activity that defines result rows / activities added as columns through a relationship. |
| **First after / last before** | Relationships: the first occurrence after the cohort row / the last at or before it. |
| **ASOF join** | A join that matches each row to the last row at or before it in time (DuckDB, Snowflake). |

Terms from earlier decks (fact, dimension, grain, SCD types, surrogate key, unknown member, conformed dimension, bus matrix, staging, intermediate, marts, bronze, silver, gold) are in the glossaries of the dimensional-modeling decks and *dbt fundamentals*.

---

<a id="slide-30"></a>
## 30. Recap and what comes next

*Reference · what to remember*

1. Five approaches answer one question the same way; they differ in where integration, history and convenience live.
2. Inmon integrates first in a normalized, historized EDW and derives marts; Kimball delivers stars per process and integrates through conformed dimensions. Modern platforms stack them by layer.
3. An OBT is a projection of the star at one grain for one consumer. It reads simplest, costs storage and a rewrite on every dimension change, and must be tested against the fact.
4. Argue OBT vs star from consumers, history, grains and the BI tool; write it on one page. Power BI wants a star.
5. Data Vault in two minutes: hubs = business keys, links = relationships, satellites = descriptions with history; insert-only, hash-keyed, source-stamped; marts on top.
6. Normalize business keys before hashing; coalesce attributes before a hashdiff; compare with the latest hashdiff so replays insert nothing.
7. Two clocks: the business date answers “as-was”, the load date answers “what did we know, when”.
8. Activity Schema keeps one immutable stream; “first after” and “last before” (an ASOF join) answer sequence and as-was questions without foreign keys.
9. Default stack: staging → (integration model only if justified) → Kimball marts → OBTs for specific consumers.
10. Next: the data serving architecture deck places the semantic layer and serves these marts to BI, reverse ETL, APIs and AI agents.

| Lesson’s definition of done | Where in this deck |
|---|---|
| I explain responsibilities of staging, intermediate and marts | *dbt fundamentals* slides 12, 16, 22; recap on slide 4 here |
| I map medallion layers to dbt layers | *dbt fundamentals* slide 4; approaches placed on it on slides 4 and 20; Fuel Smart mapping on slide 11 |
| I argue OBT vs star for a given use case | Slides 8–11, exercise 10 |
| I explain Data Vault in 2 minutes | Slide 12 (the spoken answer), 13–16, interview question 2 |
| I compare Kimball, Inmon, Data Vault and OBT at platform level | Slides 5, 6, 19, 20 |
| I place the semantic layer in an architecture; I describe serving patterns | The data serving architecture deck (not here) |

---

<a id="slide-31"></a>
## 31. References and how this deck was tested

*References · official documentation and what to read there*

- [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/) · the technique catalogue; read “conformed dimensions” and “bus architecture” with lesson 6
- [Kimball Group: the Kimball DW/BI architecture](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/kimball-data-warehouse-bus-architecture/) · Kimball’s own architecture diagram: staging straight into dimensional presentation
- [Kimball: a dimensional modeling manifesto (1997)](https://www.kimballgroup.com/1997/08/a-dimensional-modeling-manifesto/) · Kimball’s 1997 argument for dimensional models over normalized ones
- [Bill Inmon (Wikipedia)](https://en.wikipedia.org/wiki/Bill_Inmon) · Inmon’s definition of a data warehouse and his books
- [Corporate Information Factory (Wikipedia)](https://en.wikipedia.org/wiki/Corporate_Information_Factory) · the Corporate Information Factory architecture
- [Data warehouse: Inmon and Kimball (Wikipedia)](https://en.wikipedia.org/wiki/Data_warehouse) · side-by-side summary of the Inmon and Kimball approaches
- [Third normal form (Wikipedia)](https://en.wikipedia.org/wiki/Third_normal_form) · what third normal form requires
- [dbt: marts (wide and denormalized)](https://docs.getdbt.com/best-practices/how-we-structure/4-marts) · why dbt marts are “wide and denormalized”
- [Fivetran: star schema vs OBT benchmark](https://www.fivetran.com/blog/star-schema-vs-obt) · the star vs OBT benchmark on Redshift, Snowflake and BigQuery
- [Power BI: star schema guidance](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema) · why Power BI semantic models should be stars
- [SQLBI: star schema or single table](https://www.sqlbi.com/articles/power-bi-star-schema-or-single-table/) · a worked comparison of star and single-table Power BI models
- [Data vault modeling (Wikipedia)](https://en.wikipedia.org/wiki/Data_vault_modeling) · history and vocabulary of Data Vault
- [Data Vault Alliance](https://datavaultalliance.com/) · the Data Vault 2.0 standard’s home
- [Scalefree: Data Vault glossary](https://www.scalefree.com/blog/data-vault/data-vault-glossary-hub-link-satellite-business-vault-and-more/) · hubs, links, satellites, business vault, PIT and bridge, defined
- [Scalefree: hash keys in the Data Vault](https://www.scalefree.com/blog/data-vault/hash-keys-in-the-data-vault/) · why and how to hash business keys
- [Databricks: Data Vault on the lakehouse](https://www.databricks.com/blog/2022/06/24/prescriptive-guidance-for-implementing-a-data-vault-model-on-the-databricks-lakehouse-platform.html) · where raw vault, business vault and marts sit on a lakehouse
- [AutomateDV (dbt package) documentation](https://automate-dv.readthedocs.io/en/latest/) · generating hubs, links and satellites with dbt macros
- [datavault4dbt (dbt package)](https://github.com/ScalefreeCOM/datavault4dbt) · another dbt package for Data Vault 2.0
- [Activity Schema 2.0 specification](https://github.com/ActivitySchema/ActivitySchema/blob/main/2.0.md) · columns, activities, and the relationship list (first after, last before…)
- [DuckDB: ASOF join](https://duckdb.org/docs/stable/guides/sql_features/asof_join) · DuckDB’s ASOF join, with examples
- [DuckDB: SET VARIABLE](https://duckdb.org/docs/stable/sql/statements/set_variable) · session variables used to parameterise the vault load
- [DuckDB: JSON functions](https://duckdb.org/docs/stable/data/json/json_functions) · the `->>` operator and `json_object`
- [Snowflake: ASOF JOIN](https://docs.snowflake.com/en/sql-reference/constructs/asof-join) · Snowflake’s ASOF JOIN syntax (not executed here)
- [T-SQL: HASHBYTES](https://learn.microsoft.com/en-us/sql/t-sql/functions/hashbytes-transact-sql) · hashing in T-SQL (not executed here)
- [Medallion architecture](https://learn.microsoft.com/en-us/azure/databricks/lakehouse/medallion) · bronze, silver and gold, as used on slides 4 and 20
- [pytest documentation](https://docs.pytest.org/en/stable/) · running and writing the lab’s tests

**How this deck was tested:** every DuckDB query and Python block ran during the build on DuckDB 1.5.6 and CPython 3.12.10 (Windows 11); results shown are the real results, and the build fails on any unexpected error or result. The lab ran with pytest (slide 23). T-SQL, Spark SQL and Snowflake syntax is reference only and was not executed. Interview patterns come from a research pass in October 2026 over public interview guides, candidate write-ups and vendor documentation; all questions are original.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Name the table from its columns (warm-up)

Look for the signature columns: a `hashdiff`, two or more `_hk` columns, a single `_hk` plus `record_source`, `feature_json`, a `_sk` primary key with descriptive columns, several `_sk` foreign keys with measures. Check the most specific signature first.

<a id="hint-2"></a>
### Hint 2 · Prove the OBT keeps the fact’s grain (warm-up)

Scalar subqueries side by side; for duplicates, count the groups of `(order_id, line_no)` having more than one row.

<a id="hint-3"></a>
### Hint 3 · Normalize before hashing (warm-up)

DuckDB can unnest a Python list passed as a parameter: `SELECT unnest(?) AS ref`. Normalize with `upper(trim(…))`.

<a id="hint-4"></a>
### Hint 4 · Find and fix: shipping by segment from the wide table

Which orders have more than one line? Compute the fee at the order grain (`fct_order`) and join the customer version stored on that row.

<a id="hint-5"></a>
### Hint 5 · Current state from a satellite

Rank satellite rows per `customer_hk` by `load_ts` descending and keep rank 1; join the hub for the business key. C-006 has no shop satellite rows.

<a id="hint-6"></a>
### Hint 6 · Per-view conversion: first order after each view, within 48 hours

Self-join the stream on `customer` with a time window in the join condition, then aggregate per view (`activity_id`) before counting.

<a id="hint-7"></a>
### Hint 7 · As-was vs as-is from the stream, checked against the OBT

“Last before” is an `ASOF LEFT JOIN` on `customer` and `ts`; “last ever” is the segment activity with the latest `ts` per customer (`activity_repeated_at IS NULL` marks it). The order id is in `feature_json`.

<a id="hint-8"></a>
### Hint 8 · Predict a vault load, then run it twice

Which customers are already in the hub, and from which source? Which shop rows have a new hashdiff?

<a id="hint-9"></a>
### Hint 9 · Choose the approach (design, stretch)

Map each scenario’s key words to a force: per-source history and audit, one consumer, Power BI, a sequence of activities, enterprise integration first.

<a id="hint-10"></a>
### Hint 10 · Take-home: Fuel Smart’s nutrition mart and its one-page decision

Keep nutrients in `dim_food` per 100 g and grams on the fact line; protein and kcal per line are `grams / 100 × value`. A ratio of sums, not an average of line ratios. An unmatched line has no food, so use a `LEFT JOIN` and count it.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Name the table from its columns (warm-up)

```python
from run_lab import build
con = build()

def columns(table):
    return [r[0] for r in con.sql(f"DESCRIBE {table}").fetchall()]

def classify(cols):
    hk = [c for c in cols if c.endswith("_hk")]
    sk = [c for c in cols if c.endswith("_sk")]
    if "feature_json" in cols and "activity" in cols:
        return "stream"
    if "hashdiff" in cols:
        return "satellite"
    if len(hk) >= 2:
        return "link"
    if len(hk) == 1 and "record_source" in cols:
        return "hub"
    if len(sk) >= 2:
        return "fact"
    if len(sk) == 1:
        return "dimension"
    return "obt"            # no keys of its own, measures and descriptions side by side

expected = {"hub_order": "hub", "link_order_line": "link", "sat_order": "satellite",
            "dim_product": "dimension", "fct_order_line": "fact", "obt_order_lines": "obt",
            "customer_stream": "stream", "dim_customer": "dimension"}
got = {t: classify(columns(t)) for t in expected}
assert got == expected, got
for t, k in got.items():
    print(f"{t:16} -> {k}")
```

Output:

```text
hub_order        -> hub
link_order_line  -> link
sat_order        -> satellite
dim_product      -> dimension
fct_order_line   -> fact
obt_order_lines  -> obt
customer_stream  -> stream
dim_customer     -> dimension
```

**Why it works:** each approach has a fixed shape. Hubs hold one hash key and a business key; links hold several hash keys; satellites carry a hashdiff; a star’s fact has several surrogate foreign keys and measures; an OBT has measures and descriptions with no keys of its own; a stream has `activity`, `ts` and `feature_json`. **Common wrong answer:** testing “has `_hk`” first, which calls every satellite a hub. Check the most specific signature first. **Interviewer follow-up:** “Is `edw_product` a dimension?” No: it is a 3NF entity with a foreign key to `edw_product_category` and no surrogate key; shape alone tells you it belongs to an integration layer.

<a id="solution-2"></a>
### Solution 2 · Prove the OBT keeps the fact’s grain (warm-up)

```python
from run_lab import build
con = build()
row = con.sql("""
SELECT (SELECT count(*) FROM obt_order_lines)          AS obt_rows,
       (SELECT count(*) FROM fct_order_line)           AS fact_rows,
       (SELECT sum(line_revenue) FROM obt_order_lines) AS obt_revenue,
       (SELECT sum(line_revenue) FROM fct_order_line)  AS fact_revenue,
       (SELECT count(*) FROM (SELECT order_id, line_no FROM obt_order_lines
                              GROUP BY ALL HAVING count(*) > 1)) AS duplicate_keys
""").fetchone()
print(row)
assert row[0] == row[1] == 13 and row[2] == row[3] and row[4] == 0
```

Output:

```text
(13, 13, Decimal('292.00'), Decimal('292.00'), 0)
```

**Why it works:** an OBT built from a fact must have exactly the fact’s rows and totals; any join that matches more than one dimension row shows up as extra rows, a higher total and duplicate keys. **Common wrong answer:** checking only the total. A fan-out can be hidden by a filter that drops other rows. Check counts, totals and key uniqueness together. **Interviewer follow-up:** “Make it a dbt test.” A singular test that returns rows when the counts differ, plus `dbt_utils.unique_combination_of_columns` on the key.

<a id="solution-3"></a>
### Solution 3 · Normalize before hashing (warm-up)

```python
from run_lab import build
con = build()
refs = [" c-001", "C-002 ", "c-004", "C-006"]
raw, normalized = con.execute("""
SELECT count(*) FILTER (WHERE md5(ref) IN (SELECT customer_hk FROM hub_customer)),
       count(*) FILTER (WHERE md5(upper(trim(ref))) IN (SELECT customer_hk FROM hub_customer))
FROM (SELECT unnest(?) AS ref)
""", [refs]).fetchone()
print("raw matches:", raw, "· normalized matches:", normalized)
assert (raw, normalized) == (1, 4)
```

Output:

```text
raw matches: 1 · normalized matches: 4
```

**Why it works:** a hash changes completely when one character changes, so `md5(" c-001")` and `md5("C-001")` share nothing. Every loader must apply the same normalization before hashing, or the hub splits one customer into several. C-006 matches because the CRM itself created that hub row in batch 2. **Common wrong answer:** normalizing in the satellite or the mart instead of before the hash. By then the hub already has duplicate keys. **Interviewer follow-up:** “Two systems use different keys for the same customer.” Keep both as separate hubs or keys and add a **same-as link** in the business vault that maps them, rather than overwriting either.

<a id="solution-4"></a>
### Solution 4 · Find and fix: shipping by segment from the wide table

```python
from run_lab import build
con = build()
buggy = con.sql("""
SELECT l.segment_at_order, sum(o.shipping_fee) AS shipping
FROM obt_order_lines AS l JOIN fct_order AS o USING (order_id)
GROUP BY ALL ORDER BY 1""").fetchall()
fixed = con.sql("""
SELECT c.segment AS segment_at_order, sum(o.shipping_fee) AS shipping
FROM fct_order AS o JOIN dim_customer AS c USING (customer_sk)
GROUP BY ALL ORDER BY 1""").fetchall()
print("buggy:", buggy)
print("fixed:", fixed)
assert [(s, float(v)) for s, v in fixed] == [("hobbyist", 20.0), ("pro", 10.0), ("unknown", 7.5)]
assert dict(buggy)["hobbyist"] - dict(fixed)["hobbyist"] == 5      # O-1001 has two lines
```

Output:

```text
buggy: [('hobbyist', Decimal('25.00')), ('pro', Decimal('10.00')), ('unknown', Decimal('7.50'))]
fixed: [('hobbyist', Decimal('20.00')), ('pro', Decimal('10.00')), ('unknown', Decimal('7.50'))]
```

**Why it works:** the fee belongs to the order, so it must be summed over one row per order. In the OBT, O-1001’s fee appears on both of its lines; O-1004 and O-1007 also have several lines but a fee of 0, which hides the bug for *pro*, the most dangerous kind of bug, because one segment looks right. **Common wrong answer:** `sum(DISTINCT shipping_fee)`: it collapses two different orders with the same 5.00 fee into one. **Interviewer follow-up:** “The dashboard needs shipping per line.” Allocate it by a rule the business owns (for example proportional to line revenue), store it as its own column, and test that allocations sum back to the order fee.

<a id="solution-5"></a>
### Solution 5 · Current state from a satellite

```python
from run_lab import build
con = build()
rows = con.sql("""
SELECT h.customer_id, s.segment, s.city
FROM hub_customer AS h
JOIN sat_customer_shop AS s USING (customer_hk)
QUALIFY row_number() OVER (PARTITION BY s.customer_hk ORDER BY s.load_ts DESC) = 1
ORDER BY h.customer_id""").fetchall()
print(rows)
assert rows == [("C-001", "hobbyist", "Austin"), ("C-002", "pro", "Chicago"), ("C-003", "pro", "Boulder"),
                ("C-004", "hobbyist", "Austin"), ("C-005", "pro", "Chicago")]
```

Output:

```text
[('C-001', 'hobbyist', 'Austin'), ('C-002', 'pro', 'Chicago'), ('C-003', 'pro', 'Boulder'), ('C-004', 'hobbyist', 'Austin'), ('C-005', 'pro', 'Chicago')]
```

**Why it works:** satellites are insert-only, so the current state is the newest row per key; `QUALIFY` filters on the window result without a subquery. The inner join drops the ghost record and C-006, who has no shop rows. **Common wrong answer:** `GROUP BY customer_hk` with `max(segment)` and `max(city)`: it mixes values from different versions (“pro” from one row, “Austin” from another). **Interviewer follow-up:** “Now as of 25 March, by business date.” Filter `updated_at <= TIMESTAMP '2026-03-25'` before ranking and rank by `updated_at`: Ben is already pro (since 20 March) but Chloe is still in Denver. Always say which clock you used.

<a id="solution-6"></a>
### Solution 6 · Per-view conversion: first order after each view, within 48 hours

```python
from run_lab import build
con = build()
views, converted = con.sql("""
WITH per_view AS (
    SELECT v.activity_id, min(o.ts) AS first_order_after
    FROM customer_stream AS v
    LEFT JOIN customer_stream AS o
           ON o.customer = v.customer AND o.activity = 'completed_order'
          AND o.ts >= v.ts AND o.ts < v.ts + INTERVAL 48 HOUR
    WHERE v.activity = 'viewed_product' AND v.customer IS NOT NULL
    GROUP BY v.activity_id
)
SELECT count(*), count(first_order_after) FROM per_view""").fetchone()
print(views, "views,", converted, "converted within 48 h")
assert (views, converted) == (9, 6)
```

Output:

```text
9 views, 6 converted within 48 h
```

**Why it works:** the window is in the `ON` clause, so views without a qualifying order keep a row with NULL; grouping by the view’s `activity_id` keeps one row per view even when several orders qualify. The unconverted views are C-004’s two and C-001’s view on 20 March. **Common wrong answer:** putting the window in `WHERE`, which turns the left join into an inner join and reports 6 of 6. **Interviewer follow-up:** “Only credit the order to the latest view before it.” That is “first in between”: bound the window by the next view (`activity_repeated_at`) as well as by 48 hours.

<a id="solution-7"></a>
### Solution 7 · As-was vs as-is from the stream, checked against the OBT

```python
from run_lab import build
con = build()
stream = con.sql("""
WITH seg AS (SELECT customer, ts, feature_json ->> 'segment' AS segment, activity_repeated_at
             FROM customer_stream WHERE activity = 'updated_segment')
SELECT i.customer, i.feature_json ->> 'order_id' AS order_id,
       was.segment AS segment_at_order, now.segment AS segment_current
FROM customer_stream AS i
ASOF JOIN seg AS was ON was.customer = i.customer AND i.ts >= was.ts
JOIN seg AS now ON now.customer = i.customer AND now.activity_repeated_at IS NULL
WHERE i.activity = 'ordered_item' AND was.segment <> now.segment
ORDER BY order_id""").fetchall()
obt = con.sql("""SELECT customer_id, order_id, segment_at_order, segment_current FROM obt_order_lines
                 WHERE segment_at_order <> segment_current ORDER BY order_id""").fetchall()
print(stream)
assert stream == obt == [("C-002", "O-1002", "hobbyist", "pro")]
```

Output:

```text
[('C-002', 'O-1002', 'hobbyist', 'pro')]
```

**Why it works:** in a stream, state is a sequence of activities; “as-was” is the last state activity before the event and “as-is” is the last one ever. The OBT reached the same answer through an SCD2 dimension resolved at load time. **Common wrong answer:** an inner `ASOF JOIN` silently drops guest items (no segment before them); here that is harmless because they cannot differ, but for revenue totals use `ASOF LEFT JOIN` as in lesson 18. **Interviewer follow-up:** “Do it without ASOF (T-SQL).” `OUTER APPLY (SELECT TOP 1 … WHERE s.ts <= i.ts ORDER BY s.ts DESC)`, or a window over the union of both activities.

<a id="solution-8"></a>
### Solution 8 · Predict a vault load, then run it twice

```python
from run_lab import build, load_vault_batch
con = build()
L3 = "2026-04-16 06:00:00"
con.execute(f"""
INSERT INTO stg_shop_customers VALUES
  ('C-001', 'Ana', 'Austin', 'hobbyist', TIMESTAMP '2025-11-02 10:00', TIMESTAMP '{L3}'),
  ('C-004', 'Dev', 'Austin', 'pro',      TIMESTAMP '2026-04-05 18:00', TIMESTAMP '{L3}');
INSERT INTO stg_orders VALUES ('O-1010', 'C-006', TIMESTAMP '2026-04-12 12:00', 5.00, TIMESTAMP '{L3}');
INSERT INTO stg_order_lines VALUES ('O-1010', 1, 'P-02', 1, 20.00, TIMESTAMP '{L3}');
""")
tables = ["hub_customer", "hub_order", "link_order_customer", "link_order_line",
          "sat_customer_shop", "sat_order", "sat_order_line"]
count = lambda: [con.sql(f"SELECT count(*) FROM {t}").fetchone()[0] for t in tables]
before = count(); load_vault_batch(con, L3); after = count(); load_vault_batch(con, L3); replay = count()
inserted = [a - b for a, b in zip(after, before)]
print(dict(zip(tables, inserted)))
assert inserted == [0, 1, 1, 1, 1, 1, 1] and replay == after
```

Output:

```text
{'hub_customer': 0, 'hub_order': 1, 'link_order_customer': 1, 'link_order_line': 1, 'sat_customer_shop': 1, 'sat_order': 1, 'sat_order_line': 1}
```

**Why it works:** hubs insert only unknown keys, and C-006 entered the hub from the CRM in batch 2, so a new *source* of C-006 adds nothing; C-001 arrives with the same hashdiff, so only Dev’s change creates a satellite row. The replay finds every key and hashdiff already present. **Common wrong answer:** “hub_customer gets C-006” (forgetting the CRM), or “sat_customer_shop gets 2” (forgetting the hashdiff). **Interviewer follow-up:** “C-006 has no shop satellite. Is the order still reportable?” Yes: the link and order satellites exist; the mart shows segment *unknown* until the shop sends a profile, which is a data-quality alert worth adding.

<a id="solution-9"></a>
### Solution 9 · Choose the approach (design, stretch)

```python
answer = {
    "a": ("data_vault", "many sources + per-source history for audit: hubs, links, satellites"),
    "b": ("obt", "one consumer, fixed columns: an OBT built from the star, at one grain"),
    "c": ("star", "Power BI semantic models are designed for stars (VertiPaq, DAX filters)"),
    "d": ("activity", "a sequence question: first 'invited_teammate' before first 'paid_invoice'"),
    "e": ("inmon", "integrate a normalized enterprise model first, marts later"),
}
assert {k: v[0] for k, v in answer.items()} == {"a": "data_vault", "b": "obt", "c": "star",
                                                "d": "activity", "e": "inmon"}
for k, (choice, why) in answer.items():
    print(f"({k}) {choice:10} {why}")
```

Output:

```text
(a) data_vault many sources + per-source history for audit: hubs, links, satellites
(b) obt        one consumer, fixed columns: an OBT built from the star, at one grain
(c) star       Power BI semantic models are designed for stars (VertiPaq, DAX filters)
(d) activity   a sequence question: first 'invited_teammate' before first 'paid_invoice'
(e) inmon      integrate a normalized enterprise model first, marts later
```

**Why it works:** each scenario contains one dominant force. In real platforms they combine: the bank’s vault feeds stars; Marketing’s OBT is built from the star; the insurer’s EDW feeds dependent marts. Saying that second sentence is what moves an answer from “correct” to “senior”. **Common wrong answer:** (b) “denormalize the star itself”: that breaks every other consumer; build a projection instead. **Interviewer follow-up:** “(d) without an Activity Schema?” An event fact at event grain and the same “first before” logic in SQL; the pattern matters more than the specification.

<a id="solution-10"></a>
### Solution 10 · Take-home: Fuel Smart’s nutrition mart and its one-page decision

```python
import duckdb
con = duckdb.connect()
con.execute("""
CREATE TABLE dim_recipe AS SELECT * FROM (VALUES
  ('R1', 'Lentil soup', 4), ('R2', 'Chicken salad', 2), ('R3', 'Oat bowl', 1)) AS t(recipe_id, recipe_name, servings);
CREATE TABLE dim_food AS SELECT * FROM (VALUES        -- per 100 g
  ('F1', 'lentils, boiled', 9.0, 116), ('F2', 'chicken breast', 31.0, 165),
  ('F3', 'oats', 13.2, 379), ('F4', 'spinach', 2.9, 23)) AS t(food_id, food_name, protein_g, kcal);
CREATE TABLE fct_recipe_ingredient AS SELECT * FROM (VALUES
  ('R1', 1, 'F1', 400.0), ('R1', 2, 'F4', 100.0), ('R1', 3, NULL, NULL),     -- 'salt to taste': unmatched
  ('R2', 1, 'F2', 300.0), ('R2', 2, 'F4', 100.0), ('R3', 1, 'F3', 60.0))
  AS t(recipe_id, line_no, food_id, grams);
CREATE TABLE mart_recipe_nutrition AS                  -- grain: one row per recipe
SELECT r.recipe_id, r.recipe_name, r.servings,
       round(sum(i.grams / 100 * f.kcal) / r.servings, 1)                   AS kcal_per_serving,
       round(100 * sum(i.grams / 100 * f.protein_g) / sum(i.grams / 100 * f.kcal), 2) AS protein_g_per_100kcal,
       round(count(f.food_id) / count(*), 2)                                AS matched_line_share
FROM dim_recipe AS r
JOIN fct_recipe_ingredient AS i USING (recipe_id)
LEFT JOIN dim_food AS f USING (food_id)
GROUP BY r.recipe_id, r.recipe_name, r.servings;
""")
mart = con.sql("""SELECT recipe_name, protein_g_per_100kcal, matched_line_share
                  FROM mart_recipe_nutrition ORDER BY recipe_name""").fetchall()
print(mart)
assert [(n, float(p), float(s)) for n, p, s in mart] == [
    ("Chicken salad", 18.51, 1.0), ("Lentil soup", 7.99, 0.67), ("Oat bowl", 3.48, 1.0)]
star_protein = con.sql("""SELECT sum(i.grams / 100 * f.protein_g) FROM fct_recipe_ingredient AS i
                          JOIN dim_food AS f USING (food_id)""").fetchone()[0]
mart_protein = con.sql("""SELECT sum(protein_g_per_100kcal * kcal_per_serving * servings / 100)
                          FROM mart_recipe_nutrition""").fetchone()[0]
assert abs(star_protein - mart_protein) < 0.5          # rounding only
decision = {
    "consumer": "the Fuel Smart dashboard (one tool, fixed columns)",
    "grain": "one row per recipe (per-serving values derived from servings)",
    "leaves_out": "reviews (review grain) and per-ingredient detail (line grain)",
    "history": "none needed in v1: USDA releases are pinned; rebuild on each release",
    "checks": "one row per recipe; protein reconciles with the star; matched share shown",
}
assert set(decision) == {"consumer", "grain", "leaves_out", "history", "checks"}
print(f"protein: star {star_protein:.2f} g, mart {mart_protein:.2f} g")
```

Output:

```text
[('Chicken salad', 18.51, 1.0), ('Lentil soup', 7.99, 0.67), ('Oat bowl', 3.48, 1.0)]
protein: star 142.72 g, mart 142.72 g
```

**Why it works:** the star keeps facts at line grain and nutrients once per food; the mart is a projection at recipe grain built with ratios of sums, so it can always be rebuilt and reconciled. The decision dict is the one-page template in miniature, attached to the code it justifies. **Common wrong answer:** averaging per-line protein ratios (`avg(protein / kcal)`), which weights a pinch of spinach like 400 g of lentils. **Interviewer follow-up:** “Exclude recipes under 80% matched weight, as the brief says.” Store matched and total grams on the mart (an unmatched line needs a gram estimate or is counted by line, and you must say which), then filter in the dashboard, not in the mart, so the exclusion stays visible.
