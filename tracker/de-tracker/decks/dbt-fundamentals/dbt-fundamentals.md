# dbt fundamentals: source data to trusted marts

*Companion to `dbt-fundamentals.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Tested with:** dbt-core 1.12.5 and the dbt-duckdb adapter 1.11.0 (DuckDB 1.5.6) on CPython 3.12.10, Windows 11 (64-bit), in one virtual environment. SQL dialect: DuckDB. Every dbt command shown was executed while building this document, in a real project folder, and its real output is shown. Output was normalised in three ways only: the leading clock time on each dbt log line was removed, per-node and total durations were replaced by `x.xx`, and absolute folder paths were replaced by `<project>`, `<venv>` or `~`. Some long outputs are trimmed (marked).

**The final project** is in the folder `dbt-fundamentals-project/` next to this file. Lesson 34 shows a clean run of it from scratch.

**Series:** this is deck 1 of 2 on dbt. Deck 2, *dbt Jinja and macros*, starts from this project: Jinja expressions, loops and macros, then a preview of incremental models, snapshots and unit tests.

**Prerequisites:** the SQL decks (window functions, `QUALIFY`-style dedupe, CTEs), the dimensional modeling deck (grain, facts, dimensions, surrogate keys, unknown members, SCD2), Python deck 2 (DuckDB from Python), and the Fabric medallion review. New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note.

**Additions beyond the original brief** are marked *(added)*: the EL step that lands raw files (bronze) before dbt starts; `env_var()` in profiles and the custom-schema naming rule; dedupe with `QUALIFY` in staging; unknown-member rows so relationships tests pass honestly; test severity (`warn`) and `--store-failures`; `dbt show` for previews; `dbt build` skipping downstream nodes after a failed test; reading `manifest.json` in Python; source freshness (concept); a bug clinic including a YAML quoting trap found while building this deck; interview questions.

## Contents

1. [dbt foundations: source data to trusted marts](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [What dbt does in an ELT pipeline](#slide-3)
4. [Where dbt layers meet medallion and Kimball](#slide-4)
5. [The running example: Leafy’s raw events](#slide-5)
6. [The EL step: land raw data before dbt starts](#slide-6)
7. [Anatomy of a dbt project](#slide-7)
8. [dbt_project.yml: the project’s settings](#slide-8)
9. [profiles.yml, targets, and dbt debug](#slide-9)
10. [Seeds: small reference data from CSV](#slide-10)
11. [Sources: declare the raw tables](#slide-11)
12. [Your first model: stg_events](#slide-12)
13. [ref() and the dependency graph](#slide-13)
14. [dbt run, and previewing results with dbt show](#slide-14)
15. [dbt compile: see the SQL that really runs](#slide-15)
16. [Intermediate models: reusable steps between staging and marts](#slide-16)
17. [Dimensions with surrogate keys and an unknown member](#slide-17)
18. [dim_date from project variables](#slide-18)
19. [fct_orders: a fact table at a declared grain](#slide-19)
20. [fct_daily_funnel: a periodic snapshot fact](#slide-20)
21. [Build the marts and check the expected results](#slide-21)
22. [Trace four events from raw rows to the star schema](#slide-22)
23. [Materializations: view, table, ephemeral](#slide-23)
24. [What the materializations look like in DuckDB](#slide-24)
25. [The everyday commands](#slide-25)
26. [Selectors: build only what you need](#slide-26)
27. [Data tests: the four generic tests](#slide-27)
28. [Singular tests and severity](#slide-28)
29. [dbt test: reading a failure](#slide-29)
30. [dbt build: a failed test protects everything downstream](#slide-30)
31. [Fix the rule, store failures, and go green](#slide-31)
32. [Documentation: descriptions, doc blocks, dbt docs](#slide-32)
33. [Lineage: the DAG, drawn from manifest.json](#slide-33)
34. [The reproducible project, from a clean folder](#slide-34)
35. [Bug clinic: what goes wrong in dbt projects](#slide-35)
36. [Interview questions you should now be able to answer](#slide-36)
37. [Exercises 1–3: tests, selectors, materializations](#slide-37)
38. [Exercises 4–5: debugging tests and reconciliation](#slide-38)
39. [Exercises 6–8: new data, hidden dependencies, materializations](#slide-39)
40. [Cheat sheet](#slide-40)
41. [Glossary](#slide-41)
42. [What to remember, and what comes next](#slide-42)
43. [References and how this deck was tested](#slide-43)
44. [Appendix A · Hints](#appendix-a)
45. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. dbt foundations: source data to trusted marts

**

You already know how to write the SQL (window functions, dedupe, CTEs) and how to design the target (grain, facts, dimensions). This deck adds **dbt**, the tool most data teams use to run that SQL in the right order, test the results, and publish documentation and lineage. Every `dbt` command ran while the deck was built, against a local DuckDB file.

- **Part A, the project:** ELT, the running example, `dbt_project.yml`, `profiles.yml`, `dbt debug`.
- **Part B, building models:** seeds, sources, `ref`, the dependency graph, staging → intermediate → marts, `dbt compile` and `dbt run`.
- **Part C, tools of the trade:** view / table / ephemeral materializations, the main commands, selectors.
- **Part D, trust:** generic and singular data tests, `dbt build`, documentation, lineage, and the final reproducible project.
- **Then:** a bug clinic, interview questions, 8 exercises, a cheat sheet, a glossary and references. Jinja loops and macros, incremental models, snapshots and unit tests continue in deck 2, *dbt Jinja and macros*.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Most warehouse transformation logic is SQL. dbt turns that SQL into a software project: version control, dependencies resolved automatically, tests on every run, documentation and lineage generated from the code. Data engineers use it to build and test warehouse transformations, including silver and gold layers.

#### Where you will use it

- Building staging, intermediate and mart models (facts and dimensions).
- Data tests in CI that stop bad data reaching dashboards.
- Lineage and docs that answer “where does this column come from?”.
- Warehouses including Fabric Warehouse, Snowflake, BigQuery, Databricks, and DuckDB locally.

#### What goes wrong without it

- Hundreds of stored procedures with hidden dependencies, run in a fragile order.
- Copy-pasted SQL that drifts: two definitions of “active customer”.
- No tests: duplicate keys or broken relationships found by business users.
- Nobody can tell which dashboards break if a source column changes.

#### Who expects you to know it

- Data engineers (dbt is the core skill of the role).
- Data engineers who own transformation layers.
- Interviewers: ref vs source, layers, materializations, tests, what dbt build does, how you structure a project.

> **On the job:** A typical team workflow: open a pull request that changes a model, CI runs dbt build on the changed models and their children, tests pass, the change merges, docs and lineage update. Knowing this flow is expected in data-engineering roles.

> **The main idea:** dbt brings software engineering practice (modules, tests, CI, docs) to SQL transformations.

*Read more:* [What is dbt?](https://docs.getdbt.com/docs/introduction), [dbt: how we structure projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| SQL transformations in a warehouse, many models | dbt | Dependencies, tests, docs, environments |
| Heavy procedural logic or complex Python | Notebooks / Spark jobs (or dbt Python models where supported) | SQL is the wrong shape |
| Getting data INTO the warehouse | Ingestion tools (pipelines, dlt, connectors) | dbt transforms data already loaded |
| A one-off analysis | A query or notebook | A project is overhead |
| Low-code teams in Power BI | Dataflows / semantic models | Different audience; dbt suits code-first teams |

#### How interviews test it

- “What is the difference between ref() and source()?”
- “Which materialization would you use for staging vs marts, and why?”
- “How do you test a model?” (unique, not_null, accepted_values, relationships, singular tests).
- “What does dbt build do when a test fails?” and “how do you select what to run?”.

#### Where it sits in your learning path

- Builds on: SQL decks (windows, correctness), dimensional modeling (facts, dims, grain) and the medallion layers.
- Next: deck 2, *dbt Jinja and macros* (loops, macros, then a preview of incremental models, snapshots and unit tests); later, deployment and CI.

> **The main idea:** use dbt for SQL transformations inside a warehouse when you want tests, lineage and reviewable code; keep ingestion and heavy procedural work in other tools.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · one virtual environment, two packages*

| Item | Detail |
|---|---|
| Tested with | **dbt-core 1.12.5** with the **dbt-duckdb 1.11.0** adapter, which brings **DuckDB 1.5.6**, on CPython 3.12.10, Windows 11. SQL dialect: DuckDB. |
| dbt Core | The open-source command-line tool (`dbt …`) used in this deck. It is a Python package. The hosted product (the dbt platform, formerly dbt Cloud) runs the same projects with a scheduler and a browser IDE; the concepts are the same. |
| Adapter | An **adapter** is the plug-in that teaches dbt how to talk to one database: how to connect, which SQL to generate for “create a table”. You install dbt-core plus one adapter: `dbt-duckdb`, `dbt-fabric`, `dbt-snowflake`, `dbt-databricks` … |
| Why DuckDB | An embedded analytical database (you used it in Python deck 2). No server, no account: the whole warehouse is one file, `leafy.duckdb`. Ideal for learning and for unit-sized CI runs. |
| Outputs | Real. The clock time at the start of each dbt log line was removed, durations are shown as `x.xx`, and machine paths are replaced by `<project>`, `<venv>` or `~`. Long outputs are trimmed and labelled. |

#### Install

```text
# Windows (PowerShell)
python -m venv .venv-dbt
.venv-dbt\Scripts\Activate.ps1
python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0

# macOS / Linux
python3 -m venv .venv-dbt
source .venv-dbt/bin/activate
python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0
```

Pin both versions: dbt projects are code, and an unpinned upgrade can change compiled SQL or deprecate syntax overnight.

#### Check it

Terminal (version check lines only):

```text
$ dbt --version
Core:
  - installed: 1.12.5
Plugins:
  - duckdb: 1.11.0 - Up to date!
```

> **On the job:** A data team pins dbt and adapter versions in `requirements.txt` or `pyproject.toml`, and CI installs exactly those. Upgrades happen on a branch, with a full `dbt build` to catch behaviour changes.

> **The main idea:** dbt Core is a Python CLI plus one adapter per database. Pin both versions; this deck uses dbt-core 1.12.5 with dbt-duckdb 1.11.0.

*Read more:* [Install dbt Core with pip](https://docs.getdbt.com/docs/local/install-dbt), [DuckDB setup (dbt docs)](https://docs.getdbt.com/docs/local/connect-data-platform/duckdb-setup), [dbt-duckdb adapter on GitHub](https://github.com/duckdb/dbt-duckdb), [Supported data platforms](https://docs.getdbt.com/docs/supported-data-platforms).

---

<a id="slide-3"></a>
## 3. What dbt does in an ELT pipeline

*Start here · the T in ELT, and nothing else*

**ETL** (extract, transform, load) transforms data *before* it reaches the warehouse. **ELT** (extract, load, transform) first lands raw data in the warehouse, then transforms it there with SQL, using the warehouse’s own compute. dbt is a tool for the **T** of ELT.

In dbt, a **model** is one `.sql` file containing one `SELECT` statement. dbt wraps it in the right `CREATE VIEW` or `CREATE TABLE` statement, works out the order from the references between models, runs it on the warehouse, tests the results, and documents everything. **Data engineering** is the job of building these tested, documented transformations.

1. **Extract + Load** (not dbt): Fivetran, Azure Data Factory, Fabric pipelines, a Python loader (deck 2). Raw data lands unchanged.
2. **Sources** (declared in dbt): dbt is told where the raw tables are, so it can reference, test and document them.
3. **Models** (dbt run): SELECT statements, layered: staging → intermediate → marts.
4. **Tests** (dbt test): Queries that look for bad rows: duplicates, nulls, unexpected values, broken keys.
5. **Docs + lineage** (dbt docs generate): A website and JSON files describing every model, column and dependency.
6. **Orchestration** (not dbt Core): A scheduler (Airflow, Fabric, the dbt platform, cron) runs `dbt build` on a timetable.

#### What dbt is

- A compiler: SQL + Jinja templates → plain SQL for your warehouse.
- A runner: executes models in dependency order, in parallel threads.
- A test framework for data.
- A documentation and lineage generator.

#### What dbt is not

- Not a database: all compute happens in the warehouse.
- Not an extractor or loader (Core cannot call APIs or copy files for you).
- Not a scheduler: something else decides *when* to run it.
- Not a place for row-by-row Python logic (Python models exist on some platforms, but SQL is the norm).

> **On the job:** In interviews, “what is dbt?” is a warm-up question. A strong answer: “the transformation layer of an ELT stack: version-controlled SELECT statements, built in dependency order, with tests and docs, running on the warehouse’s compute.”

> **The main idea:** dbt is the T in ELT: it compiles templated SELECT statements, runs them in dependency order on the warehouse, tests the results and documents them. Loading and scheduling are someone else’s job.

*Read more:* [What is dbt?](https://docs.getdbt.com/docs/introduction), [ELT explained (dbt Labs)](https://docs.getdbt.com/terms/elt).

---

<a id="slide-4"></a>
## 4. Where dbt layers meet medallion and Kimball

*Start here · the same idea under three names*

You have seen two vocabularies for “raw → clean → business-ready”. dbt’s recommended project structure is a third. They line up closely:

| Medallion (Fabric deck) | dbt layer | What happens | Kimball link | In this deck |
|---|---|---|---|---|
| Bronze | **sources** (raw tables, not built by dbt) | Nothing: data exactly as delivered, all text | Source system extracts | `raw.events` |
| Silver | **staging** (`stg_`) | One model per source table: rename, cast, clean, dedupe. No joins, no business logic | Cleaned, conformed attributes | `stg_events`, `stg_customers`, `stg_products` |
| Silver | **intermediate** (`int_`) | Reusable building blocks: filters, joins, re-graining | Preparing a business process | `int_purchases` |
| Gold | **marts** (`fct_`, `dim_`) | Business-facing tables at a declared grain | Facts and conformed dimensions, star schema | `fct_orders`, `dim_customer`, `dim_product`, `dim_date`, `fct_daily_funnel` |

#### Why layers

- Each source is cleaned **once**, in staging; every downstream model reuses it.
- A change in the source format touches one staging model, not twenty marts.
- Tests sit at the layer where a problem can first appear.

#### Naming

Prefixes make the layer obvious in every query and in lineage: `stg_`, `int_`, `fct_`, `dim_`. Large projects add the source name: `stg_shop__events` (double underscore between source and entity). This deck keeps names short.

> **On the job:** In a Fabric or Databricks lakehouse, a dbt project often owns silver and gold: bronze arrives via pipelines or Auto Loader, and dbt models build the cleaned and dimensional layers on top.

> **The main idea:** bronze ≈ sources, silver ≈ staging (+ intermediate), gold ≈ marts. Marts are where your Kimball design lives: facts at a declared grain and conformed dimensions.

*Read more:* [How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview), [Staging layer guide](https://docs.getdbt.com/best-practices/how-we-structure/2-staging), [Medallion architecture (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/databricks/lakehouse/medallion).

---

<a id="slide-5"></a>
## 5. The running example: Leafy’s raw events

*Start here · three daily JSON Lines files with familiar problems*

Leafy, the plant shop from the earlier decks, sends website events as daily **JSON Lines** files (one JSON object per line). These are the same traps you handled in Python deck 2, now to be fixed in SQL by dbt. Create them in a folder `data/raw/` inside the project.

```json
# data/raw/events_2026-03-02.jsonl
{"event_id":"e1","user_id":"u1","event_type":"page_view","ts":"2026-03-02T09:00:00Z","amount":null,"product_id":"P1"}
{"event_id":"e2","user_id":"u1","event_type":"add_to_cart","ts":"2026-03-02T09:01:10Z","amount":null,"product_id":"P1"}
{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00","product_id":"P1"}
{"event_id":"e4","user_id":" U2 ","event_type":"Page_View","ts":"2026-03-02T10:15:00+01:00","amount":null,"product_id":"P2"}
{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":25,"product_id":"P2"}
{"event_id":"e6","user_id":null,"event_type":"purchase","ts":"2026-03-02T11:00:00Z","amount":"18.00","product_id":"P3"}
{"event_id":"e7","user_id":"u3","event_type":"purchase","ts":"2026-03-02T12:00:00Z","amount":"abc","product_id":"P2"}
{"event_id":"e8","user_id":"u4","event_type":"purchase","ts":"2026-03-02T12:30:00Z","amount":"12.50","product_id":"P4"}
{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00","product_id":"P1"}
```

#### Day 2 and day 3

```json
# data/raw/events_2026-03-03.jsonl
{"event_id":"e9","user_id":"u5","event_type":"page_view","ts":"2026-03-03T07:59:00-06:00","amount":null,"product_id":"P3"}
{"event_id":"e10","user_id":"u5","event_type":"purchase","ts":"2026-03-03T08:00:00-06:00","amount":7.5,"product_id":"P4"}
{"event_id":"e11","user_id":"u1","event_type":"refund","ts":"2026-03-03T09:00:00Z","amount":"5.00","product_id":"P1"}
{"event_id":"e12","user_id":"u2","event_type":"purchase","ts":"2026-03-03T23:30:00-08:00","amount":"39.00","product_id":"P1"}
```

```json
# data/raw/events_2026-03-04.jsonl
{"event_id":"e13","user_id":"u6","event_type":"purchase","ts":"2026-03-04T10:00:00Z","amount":"9.99","product_id":"P4"}
{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":"25.00","product_id":"P2"}
```

#### Traps, and the lesson that handles each

| Trap | Rows | Handled in |
|---|---|---|
| Redelivered event (same `event_id`) | e3 twice on day 1; e5 again on day 3 | staging dedupe (12) |
| Messy text: spaces, capitals | `" U2 "`, `Page_View` | staging clean (12) |
| Offsets other than UTC | +01:00, −06:00, −08:00 (e12 is 4 March in UTC) | staging cast to UTC (12) |
| Amount as number, string, or garbage | 25, 7.5, `"abc"` | staging + singular test (12, 28) |
| Missing user | e6 | unknown member (17) |
| User not in the customer list | u6 (e13) | unknown member (17) |
| A new event type | `refund` (e11) | accepted_values test (27, 29) |

> **The main idea:** keep a tiny, deliberately messy sample of every source. It drives development, it is your test data, and it documents what “raw” really looks like.

*Read more:* [JSON Lines format](https://jsonlines.org/), [DuckDB: loading JSON](https://duckdb.org/docs/stable/data/json/loading_json).

---

<a id="slide-6"></a>
## 6. The EL step: land raw data before dbt starts

*Start here · bronze is loaded by something that is not dbt added*

dbt only transforms data that is already in the warehouse. So something must first **land** the files. In real life that is a pipeline tool; here it is a ten-line Python script using DuckDB (deck 2). It keeps every column as text, so nothing can fail on load and nothing is silently “fixed” before you can see it, and it records which file each row came from.

```python
# scripts/load_raw.py
"""load_raw.py: the EL step. Land the raw JSONL files in DuckDB unchanged, as text (bronze)."""
import duckdb

with duckdb.connect("leafy.duckdb") as con:
    con.execute("create schema if not exists raw")
    con.execute("""
        create or replace table raw.events as
        select * exclude (filename), parse_filename(filename) as _source_file
        from read_json('data/raw/events_*.jsonl', format = 'newline_delimited', filename = true,
                       columns = {event_id: 'VARCHAR', user_id: 'VARCHAR', event_type: 'VARCHAR',
                                  ts: 'VARCHAR', amount: 'VARCHAR', product_id: 'VARCHAR'})
    """)
    for file, n in con.sql("select _source_file, count(*) from raw.events group by 1 order by 1").fetchall():
        print(f"{file}: {n} rows")
    print("total:", con.sql("select count(*) from raw.events").fetchone()[0])
```

Output:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select event_id, user_id, event_type, ts, amount, product_id, _source_file
                     from raw.events order by _source_file, length(event_id), event_id"""))
```

Output:

```text
┌──────────┬─────────┬─────────────┬───────────────────────────┬─────────┬────────────┬─────────────────────────┐
│ event_id │ user_id │ event_type  │            ts             │ amount  │ product_id │      _source_file       │
│ varchar  │ varchar │   varchar   │          varchar          │ varchar │  varchar   │         varchar         │
├──────────┼─────────┼─────────────┼───────────────────────────┼─────────┼────────────┼─────────────────────────┤
│ e1       │ u1      │ page_view   │ 2026-03-02T09:00:00Z      │ NULL    │ P1         │ events_2026-03-02.jsonl │
│ e2       │ u1      │ add_to_cart │ 2026-03-02T09:01:10Z      │ NULL    │ P1         │ events_2026-03-02.jsonl │
│ e3       │ u1      │ purchase    │ 2026-03-02T09:03:00Z      │ 64.00   │ P1         │ events_2026-03-02.jsonl │
│ e3       │ u1      │ purchase    │ 2026-03-02T09:03:00Z      │ 64.00   │ P1         │ events_2026-03-02.jsonl │
│ e4       │  U2     │ Page_View   │ 2026-03-02T10:15:00+01:00 │ NULL    │ P2         │ events_2026-03-02.jsonl │
│ e5       │ u2      │ purchase    │ 2026-03-02T09:20:00Z      │ 25      │ P2         │ events_2026-03-02.jsonl │
│ e6       │ NULL    │ purchase    │ 2026-03-02T11:00:00Z      │ 18.00   │ P3         │ events_2026-03-02.jsonl │
│ e7       │ u3      │ purchase    │ 2026-03-02T12:00:00Z      │ abc     │ P2         │ events_2026-03-02.jsonl │
│ e8       │ u4      │ purchase    │ 2026-03-02T12:30:00Z      │ 12.50   │ P4         │ events_2026-03-02.jsonl │
│ e9       │ u5      │ page_view   │ 2026-03-03T07:59:00-06:00 │ NULL    │ P3         │ events_2026-03-03.jsonl │
│ e10      │ u5      │ purchase    │ 2026-03-03T08:00:00-06:00 │ 7.5     │ P4         │ events_2026-03-03.jsonl │
│ e11      │ u1      │ refund      │ 2026-03-03T09:00:00Z      │ 5.00    │ P1         │ events_2026-03-03.jsonl │
│ e12      │ u2      │ purchase    │ 2026-03-03T23:30:00-08:00 │ 39.00   │ P1         │ events_2026-03-03.jsonl │
│ e5       │ u2      │ purchase    │ 2026-03-02T09:20:00Z      │ 25.00   │ P2         │ events_2026-03-04.jsonl │
│ e13      │ u6      │ purchase    │ 2026-03-04T10:00:00Z      │ 9.99    │ P4         │ events_2026-03-04.jsonl │
└──────────┴─────────┴─────────────┴───────────────────────────┴─────────┴────────────┴─────────────────────────┘
  15 rows                                                                                             7 columns
```

#### Why everything is VARCHAR

Raw (bronze) tables should accept whatever arrives. If the loader cast `amount` to a number, the `"abc"` row would either crash the load or vanish. As text, it lands, and a dbt test reports it. Typing is staging’s job.

#### Re-running

`create or replace table` rebuilds the raw table from all files each time, so the load is idempotent (deck 2). At scale you would append only new files and record a load timestamp; this example uses the file name to know which delivery is newest.

> **On the job:** The handover between ingestion and dbt is a contract: “raw tables appear in schema `raw`, all text, with a source-file or load-time column”. Writing it down saves weeks of “who changed the raw table?” arguments.

> **The main idea:** dbt starts where loading ends. Land raw data unchanged and as text, with lineage columns such as `_source_file`, then let dbt do every cleaning step where it can be tested.

*Read more:* [DuckDB: loading JSON](https://duckdb.org/docs/stable/data/json/loading_json), [DuckDB: reading multiple files](https://duckdb.org/docs/stable/data/multiple_files/overview).

---

<a id="slide-7"></a>
## 7. Anatomy of a dbt project

*The project · a folder of SQL and YAML*

A **dbt project** is a folder with a `dbt_project.yml` file at the top. Everything else is convention: SQL models in `models/`, small CSV files in `seeds/`, reusable Jinja in `macros/`, extra tests in `tests/`. **YAML** (the `.yml` files) is a plain-text format for settings: `key: value` pairs and indented lists. In dbt, YAML files that describe models are called **property files**; their names (`_sources.yml`, `_marts.yml`) are up to you.

#### The finished project from this deck

```text
dbt-fundamentals-project/
├── dbt_project.yml            project configuration (lesson 8)
├── profiles.yml               connection to leafy.duckdb (lesson 9)
├── README.md                  how to run it
├── data/raw/                  three JSONL files (lesson 5)
├── scripts/load_raw.py        the EL step (lesson 6)
├── seeds/
│   ├── customers.csv          small reference data (lesson 10)
│   ├── products.csv
│   └── _seeds.yml
├── models/
│   ├── docs.md                doc blocks (lesson 32)
│   ├── staging/
│   │   ├── _sources.yml       where raw tables live (lesson 11)
│   │   ├── _staging.yml       descriptions + tests
│   │   ├── stg_events.sql
│   │   ├── stg_customers.sql
│   │   └── stg_products.sql
│   ├── intermediate/
│   │   └── int_purchases.sql  ephemeral
│   └── marts/
│       ├── _marts.yml
│       ├── dim_customer.sql
│       ├── dim_product.sql
│       ├── dim_date.sql
│       ├── fct_orders.sql
│       └── fct_daily_funnel.sql
└── tests/assert_no_unparseable_amounts.sql   a singular test (lesson 28)

generated, never committed:  target/  logs/  leafy.duckdb
```

#### How to start one

`dbt init my_project` asks a few questions (which adapter, which database) and creates the folder with example models and a profile in your home folder. It is interactive, so this deck writes the few files by hand instead: you will see every line.

| Folder | Contains | Created by |
|---|---|---|
| `models/` | `.sql` models and `.yml` property files | you |
| `seeds/` | CSV files loaded by `dbt seed` | you |
| `macros/` | Jinja functions | you |
| `tests/` | singular tests (`.sql`) | you |
| `target/` | compiled SQL, run SQL, manifest.json, docs | dbt |
| `logs/` | `dbt.log`, a detailed log of every run | dbt |

> **On the job:** A dbt project lives in Git like any code. Pull requests change models; CI runs `dbt build` on the change. `target/`, `logs/` and local database files go in `.gitignore`.

> **The main idea:** a dbt project is a Git-friendly folder: SQL models, YAML properties, seeds, macros and tests, plus `dbt_project.yml`. dbt writes its output to `target/` and `logs/`.

*Read more:* [About dbt projects](https://docs.getdbt.com/docs/build/projects), [dbt init](https://docs.getdbt.com/reference/commands/init).

---

<a id="slide-8"></a>
## 8. dbt_project.yml: the project’s settings

*The project · names, paths, variables, and folder-level configs*

```yaml
# dbt_project.yml
name: leafy
version: "1.0.0"
profile: leafy                       # which entry in profiles.yml to use
require-dbt-version: [">=1.10.0", "<2.0.0"]

model-paths: ["models"]
seed-paths: ["seeds"]
test-paths: ["tests"]
macro-paths: ["macros"]
clean-targets: ["target"]            # folders that `dbt clean` deletes

flags:
  send_anonymous_usage_stats: false  # no telemetry from this project

vars:                                # project variables, read with var()
  dim_date_start: "2026-03-01"
  dim_date_end: "2026-03-07"

models:
  leafy:                             # this project
    staging:                         # = models/staging/
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      +schema: marts
      +tags: ["mart"]

seeds:
  leafy:
    +schema: seeds
```

#### Reading it

- `name` identifies the project (models are addressed as `leafy.…`); `profile` points to a connection in `profiles.yml` (next lesson).
- A **config** is a setting that changes how dbt builds a resource: its materialization, schema, tags. Under `models: leafy:`, each key is a **folder**; a `+` prefix marks a config that applies to everything in and below that folder.
- **Materialization** = what dbt creates for a model: a view, a table, or nothing at all (ephemeral). Lesson 23 compares them.
- **Tags** are labels you can select on: `dbt run --select tag:mart`.
- `vars` are project **variables**: values that models read with `{{ var("name") }}` and that you can override on the command line.

#### Config precedence

The most specific setting wins:

| Where | Example | Priority |
|---|---|---|
| `{{ config(...) }}` inside the model file | `{{ config(materialized="view") }}` | highest |
| property file (`.yml`) under `config:` | `config: {materialized: view}` | middle |
| `dbt_project.yml`, deepest folder first | `marts: +materialized: table` | lowest |

> **On the job:** Teams set defaults by folder in `dbt_project.yml` (“all marts are tables in schema marts”) and override in a model only when there is a reason, so a reviewer sees exceptions immediately.

> **The main idea:** `dbt_project.yml` names the project, points to a profile, sets folder-level defaults with `+config` keys, and defines variables. The most specific config wins.

*Read more:* [dbt_project.yml reference](https://docs.getdbt.com/reference/dbt_project.yml), [Configs and properties](https://docs.getdbt.com/reference/configs-and-properties), [Model configurations](https://docs.getdbt.com/reference/model-configs).

---

<a id="slide-9"></a>
## 9. profiles.yml, targets, and dbt debug

*The project · how dbt finds the database*

A **profile** holds connection details, kept outside `dbt_project.yml` so the same project can run against different databases. A profile has one or more **targets**: named connections such as `dev`, `ci`, `prod`. Choose one with `--target ci`; otherwise dbt uses the default.

#### profiles.yml

```yaml
# profiles.yml
leafy:                         # must match `profile:` in dbt_project.yml
  target: dev                  # the default target
  outputs:
    dev:
      type: duckdb             # which adapter
      path: "{{ env_var('LEAFY_DUCKDB_PATH', 'leafy.duckdb') }}"
      threads: 4               # models built in parallel
    ci:
      type: duckdb
      path: leafy_ci.duckdb
      threads: 4
```

- dbt looks for `profiles.yml` in this order: the `--profiles-dir` option, the `DBT_PROFILES_DIR` environment variable, **the current folder**, then `~/.dbt/`. This project keeps it in the project folder, so nothing is written to your home folder.
- `env_var("NAME", "default")` reads an environment variable at run time added. Use it for passwords and tokens so they never enter Git. DuckDB needs no password; here it only makes the file path configurable.
- **Threads** = how many models dbt may build at the same time.

#### dbt debug: check before you build

Terminal (adapter option lines with default values removed):

```text
$ dbt debug
Running with dbt=1.12.5
dbt version: 1.12.5
python version: 3.12.10
python path: <venv>\Scripts\python.exe
os info: Windows-11-10.0.26300-SP0
Using profiles dir at <project>
Using profiles.yml file at <project>\profiles.yml
Using dbt_project.yml file at <project>\dbt_project.yml
adapter type: duckdb
adapter version: 1.11.0
Configuration:
  profiles.yml file [OK found and valid]
  dbt_project.yml file [OK found and valid]
Required dependencies:
 - git [OK found]

Connection:
  database: leafy
  schema: main
  path: leafy.duckdb
Registered adapter: duckdb=1.11.0
  Connection test: [OK connection ok]

All checks passed!
```

> **On the job:** In production, the profile usually comes from the environment: a CI secret sets `DBT_ENV_SECRET_PASSWORD`, or the dbt platform stores the connection. `dbt debug` is the first command to run when “dbt can’t connect” on a new machine or CI runner.

> **The main idea:** profiles.yml holds connections (targets) outside the project; secrets come in through `env_var()`. `dbt debug` confirms the project, the profile and the connection before anything is built.

*Read more:* [About profiles.yml](https://docs.getdbt.com/docs/local/profiles.yml), [dbt debug](https://docs.getdbt.com/reference/commands/debug), [env_var](https://docs.getdbt.com/reference/dbt-jinja-functions/env_var).

---

<a id="slide-10"></a>
## 10. Seeds: small reference data from CSV

*Building models · dbt seed loads CSV files into tables*

A **seed** is a small CSV file in `seeds/` that `dbt seed` loads into a table. Seeds are version-controlled with the code, so they suit small, slowly changing lists: country codes, mappings, a test customer list. Here they stand in for the CRM and product catalogue extracts.

#### The CSV files

```csv
# seeds/customers.csv
customer_id,customer_name,city,signup_date
u1,Maya Lopez,Austin,2026-01-15
u2,Leo Kim,Denver,2026-02-01
u3,Ana Ruiz,Seattle,2026-02-10
u4,Café Verde,Denver,2026-02-20
u5,Sam Patel,Austin,2026-03-01
```

```csv
# seeds/products.csv
product_id,product_name,category,list_price
P1,Monstera,Plants,64.00
P2,Snake Plant,Plants,25.00
P3,Ceramic Pot,Accessories,18.00
P4,Fertilizer,Plant care,12.50
```

#### Types and tests for the seeds

```yaml
# seeds/_seeds.yml
version: 2

seeds:
  - name: customers
    description: Customer master list exported from the CRM. One row per customer.
    config:
      column_types: {customer_id: varchar, customer_name: varchar, city: varchar, signup_date: date}
    columns:
      - name: customer_id
        data_tests: [unique, not_null]

  - name: products
    description: Product catalogue. One row per product.
    config:
      column_types: {product_id: varchar, product_name: varchar, category: varchar, list_price: "decimal(10,2)"}
    columns:
      - name: product_id
        data_tests: [unique, not_null]
```

Without `column_types`, dbt guesses types from the values, and a guess can change when the data changes (an ID column of digits becomes an integer and loses leading zeros). Declaring them makes the load stable.

Note the quotes around `"decimal(10,2)"`. Inside a YAML `{ … }` mapping the comma separates entries, so the unquoted version is split in two. That exact mistake happened while this deck was being built: dbt warned about “column types specified for non-existent columns” and the seed failed to load.

Terminal:

```text
$ dbt seed
Running with dbt=1.12.5
Registered adapter: duckdb=1.11.0
Unable to do partial parsing because saved manifest not found. Starting full parse.
[WARNING]: Configuration paths exist in your dbt_project.yml file which do not apply to any resources.
There are 3 unused configuration paths:
- models.leafy.intermediate
- models.leafy.marts
- models.leafy.staging
Found 2 seeds, 4 data tests, 500 macros

Concurrency: 4 threads (target='dev')

1 of 2 START seed file main_seeds.customers .................................... [RUN]
2 of 2 START seed file main_seeds.products ..................................... [RUN]
2 of 2 OK loaded seed file main_seeds.products ................................. [INSERT 4 in x.xxs]
1 of 2 OK loaded seed file main_seeds.customers ................................ [INSERT 5 in x.xxs]

Finished running 2 seeds in x.xx seconds (normalised).

Completed successfully

Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

#### Reading the output

- The two seeds were created in schema `main_seeds`, not `seeds`. By default dbt names a custom schema `<target schema>_<custom schema>` so that developers sharing a database don’t overwrite each other added. The target schema in DuckDB is `main`.
- The warning about unused configuration paths is expected for now: the three model folders configured in `dbt_project.yml` contain no models yet. It disappears once they do. Keep an eye on this warning: after a folder rename it is often the only clue that your configs no longer apply.

#### When not to use a seed

- Large or frequently changing data: load it as a source instead.
- Anything with personal data or secrets: seeds live in Git.
- Raw events: those come from a loader, not a CSV in the repository.

> **On the job:** Typical seeds: a mapping of payment-provider codes to names, a list of test accounts to exclude, holiday dates, currency codes. If someone in the business edits it weekly, it should not be a seed.

> **The main idea:** seeds load small, version-controlled CSV files as tables. Declare their column types. Remember the schema rule: custom schema `seeds` becomes `main_seeds`.

*Read more:* [Seeds](https://docs.getdbt.com/docs/build/seeds), [dbt seed](https://docs.getdbt.com/reference/commands/seed), [column_types](https://docs.getdbt.com/reference/resource-configs/column_types), [Custom schemas](https://docs.getdbt.com/docs/build/custom-schemas).

---

<a id="slide-11"></a>
## 11. Sources: declare the raw tables

*Building models · source() instead of hard-coded table names*

A **source** is a table that dbt does not build: it was loaded by something else. You declare sources in a property file, then refer to them in SQL with `{{ source("shop_raw", "events") }}`. At compile time dbt replaces that with the real name, `"leafy"."raw"."events"`.

```yaml
# models/staging/_sources.yml
version: 2

sources:
  - name: shop_raw                 # the name you use in source('shop_raw', ...)
    description: Raw website events landed by scripts/load_raw.py (bronze). Every column is text.
    schema: raw                    # where the tables really are
    tables:
      - name: events
        description: One row per delivered event, including redeliveries of the same event_id.
        columns:
          - name: event_id
            description: Event identifier from the website. Not unique here because of redeliveries.
            data_tests:
              - not_null
          - name: _source_file
            description: The daily file the row came from. Later files win when deduplicating.
```

#### Why declare sources

- **One place to change.** If raw data moves to schema `bronze`, you edit one line, not every model.
- **Lineage.** Sources appear as the starting nodes of the dependency graph and the docs site.
- **Tests on raw data.** The `not_null` test above runs on the raw table, so a broken feed is caught before any model is built.
- **Freshness** added. With a `loaded_at_field` and thresholds configured, `dbt source freshness` warns or errors when the newest row is too old: the feed has stopped. Not run here because the result depends on today’s date.

#### Rules

- Only staging models should call `source()`. Everything downstream uses `ref()` to staging models.
- One staging model per source table.
- Never write `from raw.events` directly in a model: dbt would not know about the dependency, and lineage, ordering and selectors would all be wrong.

> **On the job:** Source freshness checks are one of the cheapest alerts in a data platform: “orders haven’t arrived for 6 hours” reaches the team before a stakeholder notices an empty dashboard.

> **The main idea:** declare every raw table as a source and reference it only with `source()`, only from staging. You get one place to change names, lineage from the very start, and tests on raw data.

*Read more:* [Sources](https://docs.getdbt.com/docs/build/sources), [source()](https://docs.getdbt.com/reference/dbt-jinja-functions/source), [Source freshness](https://docs.getdbt.com/reference/resource-configs/freshness).

---

<a id="slide-12"></a>
## 12. Your first model: stg_events

*Building models · rename, cast, clean, dedupe*

A **model** is a `.sql` file with one `SELECT`. The file name becomes the object name: `stg_events.sql` → view `main_staging.stg_events`. You never write `CREATE VIEW` yourself; dbt adds it based on the materialization.

```sql
# models/staging/stg_events.sql
-- stg_events: cleaned, typed and deduplicated website events.
-- Grain: one row per event_id.
with source as (

    select * from {{ source('shop_raw', 'events') }}

),

cleaned as (

    select
        event_id,
        nullif(lower(trim(user_id)), '')          as customer_id,
        lower(trim(event_type))                   as event_type,
        timezone('UTC', cast(ts as timestamptz))  as event_at_utc,
        try_cast(trim(amount) as decimal(10, 2))  as amount,
        amount                                    as amount_raw,
        upper(trim(product_id))                   as product_id,
        _source_file
    from source

),

deduplicated as (

    select *
    from cleaned
    qualify row_number() over (
        partition by event_id
        order by _source_file desc       -- the latest delivery wins
    ) = 1

)

select * from deduplicated
```

#### Line by line

| Expression | Fixes |
|---|---|
| `nullif(lower(trim(user_id)), '')` | `" U2 "` → `u2`; empty strings → NULL |
| `lower(trim(event_type))` | `Page_View` → `page_view` |
| `timezone('UTC', cast(ts as timestamptz))` | Parses the offset, converts to UTC, returns a plain `TIMESTAMP` in UTC |
| `try_cast(… as decimal(10, 2))` | `25`, `"7.5"` → numbers; `"abc"` → NULL instead of a crash |
| `amount as amount_raw` | Keeps the original text so a test can find unparseable values (lesson 28) |
| `qualify row_number() … = 1` | Keeps one row per `event_id`: the latest delivery |

#### Style conventions

- **Import CTEs** first (`with source as (select * from …)`): every dependency is visible at the top.
- One CTE per logical step, named for what it does; the last line is `select * from <final CTE>`. A **CTE** (common table expression) is a named subquery in a `WITH` clause.
- `QUALIFY` filters on a window function’s result, like `HAVING` does for aggregates (SQL deck). DuckDB, Snowflake and Databricks support it; on SQL Server or Fabric Warehouse use a subquery.
- No joins and no business rules in staging: just make the source usable.

> **On the job:** Dedupe-in-staging is the standard answer to at-least-once delivery: queues and APIs redeliver events, and every downstream count would be wrong without it. In an interview, say which column decides the winner and why.

> **The main idea:** staging models make one source table usable: rename, cast, clean text, convert time zones, dedupe. Keep raw text alongside parsed values when parsing can fail.

*Read more:* [SQL models](https://docs.getdbt.com/docs/build/sql-models), [Staging: preparing atomic building blocks](https://docs.getdbt.com/best-practices/how-we-structure/2-staging), [DuckDB QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz).

---

<a id="slide-13"></a>
## 13. ref() and the dependency graph

*Building models · how dbt knows the build order*

`{{ ref("customers") }}` refers to another dbt resource (a model, seed or snapshot) by name. It does two jobs: at compile time it becomes the real table name (`"leafy"."main_seeds"."customers"`), and it records an edge in the **DAG**, the **directed acyclic graph** of dependencies: arrows point from parent to child, and there are no loops.

#### Two more staging models

```sql
# models/staging/stg_customers.sql
-- stg_customers: one row per customer, from the CRM seed.
select
    lower(trim(customer_id)) as customer_id,
    customer_name,
    city,
    signup_date
from {{ ref('customers') }}
```

```sql
# models/staging/stg_products.sql
-- stg_products: one row per product, from the catalogue seed.
select
    upper(trim(product_id)) as product_id,
    product_name,
    category,
    list_price
from {{ ref('products') }}
```

#### What ref buys you

- **Order.** dbt builds parents before children, and runs independent models in parallel threads.
- **Environments.** The same code resolves to `main_seeds.customers` in dev and, say, `analytics.customers` in prod, because names come from the target, not from your SQL.
- **Selection.** `--select +stg_customers` means “this model and everything it depends on”. That only works because `ref` recorded the edge.
- **Lineage** in the docs site, generated from the same edges.

| Use | For |
|---|---|
| `source("src", "table")` | raw tables loaded outside dbt |
| `ref("name")` | anything dbt builds: models, seeds, snapshots |
| a hard-coded name | never |

> **On the job:** “Why must you use ref instead of a table name?” is a classic dbt interview question. The answer has four parts: build order, environment-aware names, selection, and lineage. A hard-coded name silently breaks all four.

> **The main idea:** `ref()` resolves a name to the right schema for the current target and adds an edge to the DAG. Every dependency between dbt resources must go through `ref()` or `source()`.

*Read more:* [ref()](https://docs.getdbt.com/reference/dbt-jinja-functions/ref), [DAGs explained (dbt Labs)](https://docs.getdbt.com/terms/dag).

---

<a id="slide-14"></a>
## 14. dbt run, and previewing results with dbt show

*Building models · build the staging layer and look at it*

`dbt run` builds models (not seeds, not tests). `--select staging` limits it to models in the `staging` folder; lesson 26 covers selection properly.

Terminal:

```text
$ dbt run --select staging
Running with dbt=1.12.5
Registered adapter: duckdb=1.11.0
[WARNING]: Configuration paths exist in your dbt_project.yml file which do not apply to any resources.
There are 2 unused configuration paths:
- models.leafy.marts
- models.leafy.intermediate
Found 2 seeds, 5 data tests, 3 models, 1 source, 500 macros

Concurrency: 4 threads (target='dev')

1 of 3 START sql view model main_staging.stg_customers ......................... [RUN]
2 of 3 START sql view model main_staging.stg_events ............................ [RUN]
3 of 3 START sql view model main_staging.stg_products .......................... [RUN]
3 of 3 OK created sql view model main_staging.stg_products ..................... [OK in x.xxs]
2 of 3 OK created sql view model main_staging.stg_events ....................... [OK in x.xxs]
1 of 3 OK created sql view model main_staging.stg_customers .................... [OK in x.xxs]

Finished running 3 view models in x.xx seconds (normalised).

Completed successfully

Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

`dbt show` added compiles a model’s SQL (`--select stg_events`) or a query you type (`--inline`, where `ref` works too), runs it, and prints the first rows without changing anything in the database. It prints at most six columns, so pick the ones you want to check.

Terminal (startup lines removed):

```text
$ dbt show --inline "select event_id, customer_id, event_type, event_at_utc, amount, amount_raw from {{ ref('stg_events') }} order by event_at_utc, event_id" --limit 20
[WARNING]: Configuration paths exist in your dbt_project.yml file which do not apply to any resources.
There are 2 unused configuration paths:
- models.leafy.intermediate
- models.leafy.marts
Previewing inline node:
| event_id | customer_id | event_type  |        event_at_utc | amount | amount_raw |
| -------- | ----------- | ----------- | ------------------- | ------ | ---------- |
| e1       | u1          | page_view   | 2026-03-02 09:00:00 |        |            |
| e2       | u1          | add_to_cart | 2026-03-02 09:01:10 |        |            |
| e3       | u1          | purchase    | 2026-03-02 09:03:00 |  64.00 | 64.00      |
| e4       | u2          | page_view   | 2026-03-02 09:15:00 |        |            |
| e5       | u2          | purchase    | 2026-03-02 09:20:00 |  25.00 | 25.00      |
| e6       |             | purchase    | 2026-03-02 11:00:00 |  18.00 | 18.00      |
| e7       | u3          | purchase    | 2026-03-02 12:00:00 |        | abc        |
| e8       | u4          | purchase    | 2026-03-02 12:30:00 |  12.50 | 12.50      |
| e11      | u1          | refund      | 2026-03-03 09:00:00 |   5.00 | 5.00       |
| e9       | u5          | page_view   | 2026-03-03 13:59:00 |        |            |
| e10      | u5          | purchase    | 2026-03-03 14:00:00 |   7.50 | 7.5        |
| e12      | u2          | purchase    | 2026-03-04 07:30:00 |  39.00 | 39.00      |
| e13      | u6          | purchase    | 2026-03-04 10:00:00 |   9.99 | 9.99       |
```

#### Check against the traps

- 15 raw rows → **13** events: e3 and e5 appear once.
- e4: `u2`, `page_view`, 09:15 UTC (10:15 at +01:00).
- e7: amount NULL, raw text `abc` kept.
- e12: 23:30 at −08:00 is **2026-03-04 07:30** UTC, a different day.
- e5’s winning row is the day-3 redelivery (`25.00` from `events_2026-03-04.jsonl`).

#### What dbt created

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select table_schema, table_name, table_type
                     from information_schema.tables
                     order by table_schema, table_name"""))
```

Output:

```text
┌──────────────┬───────────────┬────────────┐
│ table_schema │  table_name   │ table_type │
│   varchar    │    varchar    │  varchar   │
├──────────────┼───────────────┼────────────┤
│ main_seeds   │ customers     │ BASE TABLE │
│ main_seeds   │ products      │ BASE TABLE │
│ main_staging │ stg_customers │ VIEW       │
│ main_staging │ stg_events    │ VIEW       │
│ main_staging │ stg_products  │ VIEW       │
│ raw          │ events        │ BASE TABLE │
└──────────────┴───────────────┴────────────┘
```

> **On the job:** Before opening a pull request, run the model and look at a sample: `dbt show` catches “all amounts are NULL” in seconds, long before a test or a reviewer would.

> **The main idea:** `dbt run` builds models in dependency order and reports PASS/ERROR per model; `dbt show` previews a model’s rows without building anything.

*Read more:* [dbt run](https://docs.getdbt.com/reference/commands/run), [dbt show](https://docs.getdbt.com/reference/commands/show).

---

<a id="slide-15"></a>
## 15. dbt compile: see the SQL that really runs

*Building models · Jinja in, plain SQL out*

Every model is a **template**: SQL with Jinja placeholders. **Compiling** renders the template into plain SQL for your warehouse. `dbt compile` does only that (it needs the database only to look up metadata) and writes the result to `target/compiled/`. `dbt run` compiles too, then wraps the SQL in DDL and writes that to `target/run/`.

Terminal (startup lines removed):

```text
$ dbt compile --select stg_customers
[WARNING]: Configuration paths exist in your dbt_project.yml file which do not apply to any resources.
There are 2 unused configuration paths:
- models.leafy.marts
- models.leafy.intermediate
Compiled node 'stg_customers' is:
-- stg_customers: one row per customer, from the CRM seed.
select
    lower(trim(customer_id)) as customer_id,
    customer_name,
    city,
    signup_date
from "leafy"."main_seeds"."customers"
```

#### Compiled: source() resolved

```sql
-- target/compiled/leafy/models/staging/stg_events.sql (generated by dbt)
-- stg_events: cleaned, typed and deduplicated website events.
-- Grain: one row per event_id.
with source as (
    select * from "leafy"."raw"."events"
),
cleaned as (
    select
        event_id,
        nullif(lower(trim(user_id)), '')          as customer_id,
        lower(trim(event_type))                   as event_type,
        timezone('UTC', cast(ts as timestamptz))  as event_at_utc,
        try_cast(trim(amount) as decimal(10, 2))  as amount,
        amount                                    as amount_raw,
        upper(trim(product_id))                   as product_id,
        _source_file
    from source
),
deduplicated as (
    select *
    from cleaned
    qualify row_number() over (
        partition by event_id
        order by _source_file desc       -- the latest delivery wins
    ) = 1
)
select * from deduplicated
```

#### Run: wrapped in DDL by the view materialization

```sql
-- target/run/leafy/models/staging/stg_events.sql (generated by dbt)
  create view "leafy"."main_staging"."stg_events__dbt_tmp" as (
    -- stg_events: cleaned, typed and deduplicated website events.
-- Grain: one row per event_id.
with source as (
    select * from "leafy"."raw"."events"
),
cleaned as (
    select
        event_id,
        nullif(lower(trim(user_id)), '')          as customer_id,
        lower(trim(event_type))                   as event_type,
        timezone('UTC', cast(ts as timestamptz))  as event_at_utc,
        try_cast(trim(amount) as decimal(10, 2))  as amount,
        amount                                    as amount_raw,
        upper(trim(product_id))                   as product_id,
        _source_file
    from source
),
deduplicated as (
    select *
    from cleaned
    qualify row_number() over (
        partition by event_id
        order by _source_file desc       -- the latest delivery wins
    ) = 1
)
select * from deduplicated
  );
```

**DDL** (data definition language) is the SQL that creates or changes objects: `CREATE`, `ALTER`, `DROP`. The view materialization creates it under a temporary name and swaps it in, so readers never see a missing view.

> **On the job:** When a model fails with a database error, open its file in `target/compiled/` (or `target/run/`) and run that SQL directly in the warehouse’s query editor. It is the single most useful debugging habit in dbt.

> **The main idea:** dbt compiles Jinja to plain SQL. `target/compiled/` holds the SELECT, `target/run/` the DDL that was executed; both are the first place to look when something breaks.

*Read more:* [dbt compile](https://docs.getdbt.com/reference/commands/compile), [dbt artifacts and target folder](https://docs.getdbt.com/reference/global-configs/json-artifacts).

---

<a id="slide-16"></a>
## 16. Intermediate models: reusable steps between staging and marts

*Building models · int_ models re-grain, filter and join*

An **intermediate** model holds logic that is too specific for staging but used by, or too complex to bury inside, a mart. Typical jobs: filter to one business process, join two staging models, change the grain (for example events → sessions).

```sql
# models/intermediate/int_purchases.sql
-- int_purchases: purchase events that can be counted as orders.
-- Ephemeral (folder default): never built, inlined as a CTE where referenced.
select
    event_id                    as order_id,
    customer_id,
    product_id,
    event_at_utc                as ordered_at_utc,
    cast(event_at_utc as date)  as order_date_utc,
    amount
from {{ ref('stg_events') }}
where event_type = 'purchase'
  and amount is not null       -- e7 ("abc") is excluded; a test reports it
```

#### Design decisions

- **Rename to the business term.** Analysts think in orders, so `event_id` becomes `order_id` here.
- **Exclude, but don’t hide.** e7 cannot be an order without an amount. Dropping it is a business decision; a singular test (lesson 28) makes the exclusion visible on every run.
- **Ephemeral by default.** The folder config makes it ephemeral: no view or table appears in the database. Lesson 24 shows where it goes instead.

#### Intermediate or not?

| Situation | Where |
|---|---|
| Cast, rename, dedupe one source | staging |
| Filter/join reused by two or more marts | intermediate |
| A 200-line mart with five CTE stages | split stages into intermediate models |
| Business-facing table at a declared grain | marts |

> **On the job:** Intermediate models are where most refactoring happens: when two marts compute “valid purchases” slightly differently, you move the logic into one `int_` model and both marts `ref` it. One definition, one test.

> **The main idea:** intermediate models hold reusable business logic between staging and marts. Name columns in business terms there, and make every exclusion visible with a test.

*Read more:* [Intermediate: purpose-built transformations](https://docs.getdbt.com/best-practices/how-we-structure/3-intermediate).

---

<a id="slide-17"></a>
## 17. Dimensions with surrogate keys and an unknown member

*Building models · dim_customer and dim_product*

Now the Kimball design lands in dbt. Each dimension gets a **surrogate key**, and an **unknown member**: a real row (natural key `-1`) that facts point to when the real member is missing or not yet known. Without it, e6 (no user) and e13 (user u6, not in the CRM yet) would need NULL keys or would be dropped by inner joins.

#### dim_customer

```sql
# models/marts/dim_customer.sql
-- dim_customer: one row per customer, plus one unknown member.
-- customer_key is a surrogate key: a hash of the natural key customer_id.
with customers as (

    select * from {{ ref('stg_customers') }}

),

unknown_member as (

    select
        '-1'               as customer_id,
        'Unknown customer' as customer_name,
        'Unknown'          as city,
        cast(null as date) as signup_date

),

unioned as (

    select customer_id, customer_name, city, signup_date from customers
    union all
    select customer_id, customer_name, city, signup_date from unknown_member

)

select
    md5(customer_id) as customer_key,
    customer_id,
    customer_name,
    city,
    signup_date
from unioned
```

#### dim_product

```sql
# models/marts/dim_product.sql
-- dim_product: one row per product, plus one unknown member.
with products as (

    select * from {{ ref('stg_products') }}

),

unioned as (

    select product_id, product_name, category, list_price from products
    union all
    select '-1', 'Unknown product', 'Unknown', cast(null as decimal(10, 2))

)

select
    md5(product_id) as product_key,
    product_id,
    product_name,
    category,
    list_price
from unioned
```

**Hashed surrogate keys.** In dbt the usual surrogate key is a hash of the natural key (`md5(customer_id)`; the `dbt_utils` package has `generate_surrogate_key` for several columns). A hash is the same in every run and every environment, needs no sequence, and lets the fact compute keys without a lookup. An integer from `row_number()` would change when a new customer sorts earlier, silently re-pointing old facts.

> **On the job:** Unknown and “late-arriving” members are standard in warehouse interviews: say how you keep the fact row (unknown key), how you monitor it (a test or a count of unknown keys), and how you fix it later (re-run when the dimension catches up; with SCD2, an inferred member).

> **The main idea:** marts dimensions = staging rows + an unknown member, keyed by a stable hash of the natural key. That keeps every fact row and every join honest.

*Read more:* [Marts: business-defined entities](https://docs.getdbt.com/best-practices/how-we-structure/4-marts), [Kimball dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/).

---

<a id="slide-18"></a>
## 18. dim_date from project variables

*Building models · var() makes a model configurable*

A date dimension is generated, not loaded. `{{ var("dim_date_start") }}` reads a project variable from `dbt_project.yml` (lesson 8). The key is the readable integer `yyyymmdd`, a common exception to “surrogate keys are meaningless” because dates never change.

```sql
# models/marts/dim_date.sql
-- dim_date: one row per calendar day between two project variables.
with days as (

    select cast(range as date) as date_day
    from range(
        date '{{ var("dim_date_start") }}',
        date '{{ var("dim_date_end") }}' + interval 1 day,
        interval 1 day
    )

)

select
    cast(strftime(date_day, '%Y%m%d') as integer) as date_key,
    date_day,
    dayname(date_day)                             as day_name,
    isodow(date_day) in (6, 7)                    as is_weekend
from days
```

#### Override at run time

Variables can be overridden for one run with `--vars` (YAML or JSON text). `dbt show` builds nothing, so this is a safe way to see the effect:

Terminal (startup lines removed):

```text
$ dbt show --select dim_date --vars '{dim_date_end: "2026-03-03"}'
Unable to do partial parsing because config vars, config profile, or config target have changed
Previewing node 'dim_date':
| date_key |   date_day | day_name | is_weekend |
| -------- | ---------- | -------- | ---------- |
| 20260301 | 2026-03-01 | Sunday   |       True |
| 20260302 | 2026-03-02 | Monday   |      False |
| 20260303 | 2026-03-03 | Tuesday  |      False |
```

#### Notes

- Real date dimensions cover years (for example 2020–2035) and add fiscal periods, holidays and week numbers. A seed of holidays joined here is a classic use of seeds.
- In production, generate a generous range once; don’t let it depend on today’s date, or a rebuild changes history.
- The value in `--vars` is parsed as YAML, so quote dates and anything with special characters.

> **On the job:** Project variables typically carry start dates, lists of statuses, feature switches and look-back windows. Keeping them in `dbt_project.yml` documents them; overriding them with `--vars` makes backfills and tests easy.

> **The main idea:** `var()` pulls configuration into SQL; defaults live in `dbt_project.yml`, and `--vars` overrides them for one invocation.

*Read more:* [Project variables](https://docs.getdbt.com/docs/build/project-variables), [var()](https://docs.getdbt.com/reference/dbt-jinja-functions/var).

---

<a id="slide-19"></a>
## 19. fct_orders: a fact table at a declared grain

*Building models · the star schema in dbt*

The **grain** (dimensional modeling deck) is what one row means. Write it in the first comment of every fact model and test it (lesson 27: `unique` on `order_id`). The fact looks up each surrogate key with a `left join`, and falls back to the unknown member’s key, so no order is lost.

#### The model

```sql
# models/marts/fct_orders.sql
-- fct_orders: one row per order (a purchase event with a valid amount).
-- Grain: order_id. Measures: amount. Foreign keys to dim_date, dim_customer, dim_product.
with purchases as (

    select * from {{ ref('int_purchases') }}

),

customers as (

    select customer_key, customer_id from {{ ref('dim_customer') }}

),

products as (

    select product_key, product_id from {{ ref('dim_product') }}

)

select
    purchases.order_id,
    cast(strftime(purchases.order_date_utc, '%Y%m%d') as integer) as date_key,
    coalesce(customers.customer_key, md5('-1'))                     as customer_key,
    coalesce(products.product_key, md5('-1'))                       as product_key,
    purchases.ordered_at_utc,
    purchases.amount
from purchases
left join customers on purchases.customer_id = customers.customer_id
left join products  on purchases.product_id  = products.product_id
```

#### The design

*Star schema: fct_orders (order_id DD, date_key FK, customer_key FK, product_key FK, ordered_at_utc, amount M) joined to dim_date (date_key PK), dim_customer (customer_key PK, customer_id NK), dim_product (product_key PK, product_id NK).*

- `order_id` is a **degenerate dimension** (DD): an identifier kept on the fact with no dimension table of its own.
- `left join` + `coalesce(…, md5('-1'))`: an inner join would silently drop e6 and e13.
- `dim_customer` is a **conformed dimension**: the same table (same keys) serves every fact about customers, including future ones such as `fct_sessions`.

> **On the job:** “What is the grain of this table?” should be answerable from the first line of the model file. Reviewers check that every join preserves it: a join that multiplies rows (fan-out) is the most common cause of inflated revenue.

> **The main idea:** a fact model declares its grain, looks up surrogate keys with left joins to conformed dimensions, and maps misses to the unknown member so row counts and totals survive.

*Read more:* [Marts: business-defined entities](https://docs.getdbt.com/best-practices/how-we-structure/4-marts), [Marts guide](https://docs.getdbt.com/best-practices/how-we-structure/4-marts).

---

<a id="slide-20"></a>
## 20. fct_daily_funnel: a periodic snapshot fact

*Building models · one row per day, one column per event type*

Not every fact has one row per business event. A **periodic snapshot fact** (dimensional modeling deck) has one row per period: here, one row per UTC day with a count for each event type. Its `date_key` joins the same conformed `dim_date` as `fct_orders`. The first line, `{{ config(tags=["funnel"]) }}`, sets a config inside the model file: the most specific config wins (lesson 8), and the tag lets you select the model later (lesson 26).

#### The model

```sql
# models/marts/fct_daily_funnel.sql
{{ config(tags=["funnel"]) }}
-- fct_daily_funnel: one row per UTC day with event counts by type.
-- A periodic snapshot fact (grain: date).
select
    cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer) as date_key,
    count(*) filter (where event_type = 'page_view')   as page_view_events,
    count(*) filter (where event_type = 'add_to_cart') as add_to_cart_events,
    count(*) filter (where event_type = 'purchase')    as purchase_events,
    count(*) filter (where event_type = 'refund')      as refund_events,
    count(distinct customer_id) as active_customers
from {{ ref("stg_events") }}
group by 1
```

#### Preview before building

Terminal (summary line; the SQL is in target/compiled/):

```text
$ dbt compile --select fct_daily_funnel
Compiled node 'fct_daily_funnel' is:
```

```python
import duckdb
from pathlib import Path
sql = Path("target/compiled/leafy/models/marts/fct_daily_funnel.sql").read_text(encoding="utf-8")
with duckdb.connect("leafy.duckdb", read_only=True) as con:     # run the compiled SELECT, sorted
    print(con.sql(f"select * from ({sql}) order by date_key"))
```

Output:

```text
┌──────────┬──────────────────┬────────────────────┬─────────────────┬───────────────┬──────────────────┐
│ date_key │ page_view_events │ add_to_cart_events │ purchase_events │ refund_events │ active_customers │
│  int32   │      int64       │       int64        │      int64      │     int64     │      int64       │
├──────────┼──────────────────┼────────────────────┼─────────────────┼───────────────┼──────────────────┤
│ 20260302 │                2 │                  1 │               5 │             0 │                4 │
│ 20260303 │                1 │                  0 │               1 │             1 │                2 │
│ 20260304 │                0 │                  0 │               2 │             0 │                2 │
└──────────┴──────────────────┴────────────────────┴─────────────────┴───────────────┴──────────────────┘
```

- `count(*) filter (where …)` counts only the rows that match: a pivot from rows to columns (SQL correctness deck).
- `count(distinct customer_id)` ignores NULL users, so anonymous events never count as active customers.
- Four nearly identical lines: when a fifth event type arrives, someone must remember to add a fifth. The *dbt Jinja and macros* deck replaces them with a loop over a project variable.

> **On the job:** Daily snapshot facts like this feed most operational dashboards because they are small and fast. Analysts expect one row for every day in `dim_date`; a missing day usually means a failed load, not a quiet day.

> **The main idea:** a periodic snapshot fact has one row per period and joins the same conformed date dimension as every other fact; declare its grain in the first comment.

*Read more:* [Marts: business-defined entities](https://docs.getdbt.com/best-practices/how-we-structure/4-marts), [config()](https://docs.getdbt.com/reference/dbt-jinja-functions/config).

---

<a id="slide-21"></a>
## 21. Build the marts and check the expected results

*Building models · dbt run, then look at the fact*

Run everything. dbt works out the order from the refs: staging first, then the dimensions and the daily funnel, then the orders fact (the ephemeral `int_purchases` is not run on its own).

Terminal:

```text
$ dbt run
Running with dbt=1.12.5
Registered adapter: duckdb=1.11.0
Found 9 models, 2 seeds, 5 data tests, 1 source, 500 macros

Concurrency: 4 threads (target='dev')

1 of 8 START sql table model main_marts.dim_date ............................... [RUN]
2 of 8 START sql view model main_staging.stg_customers ......................... [RUN]
3 of 8 START sql view model main_staging.stg_events ............................ [RUN]
4 of 8 START sql view model main_staging.stg_products .......................... [RUN]
1 of 8 OK created sql table model main_marts.dim_date .......................... [OK in x.xxs]
2 of 8 OK created sql view model main_staging.stg_customers .................... [OK in x.xxs]
4 of 8 OK created sql view model main_staging.stg_products ..................... [OK in x.xxs]
3 of 8 OK created sql view model main_staging.stg_events ....................... [OK in x.xxs]
5 of 8 START sql table model main_marts.dim_customer ........................... [RUN]
6 of 8 START sql table model main_marts.dim_product ............................ [RUN]
7 of 8 START sql table model main_marts.fct_daily_funnel ....................... [RUN]
5 of 8 OK created sql table model main_marts.dim_customer ...................... [OK in x.xxs]
6 of 8 OK created sql table model main_marts.dim_product ....................... [OK in x.xxs]
7 of 8 OK created sql table model main_marts.fct_daily_funnel .................. [OK in x.xxs]
8 of 8 START sql table model main_marts.fct_orders ............................. [RUN]
8 of 8 OK created sql table model main_marts.fct_orders ........................ [OK in x.xxs]

Finished running 5 table models, 3 view models in x.xx seconds (normalised).

Completed successfully

Done. PASS=8 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=8
```

Terminal (startup lines removed):

```text
$ dbt show --inline "select * from {{ ref('fct_orders') }} order by ordered_at_utc" --limit 10
Previewing inline node:
| order_id | date_key | customer_key         | product_key          |      ordered_at_utc | amount |
| -------- | -------- | -------------------- | -------------------- | ------------------- | ------ |
| e3       | 20260302 | e4774cdda0793f864... | 5f2b9323c39ee3c86... | 2026-03-02 09:03:00 |  64.00 |
| e5       | 20260302 | 270c1b084f3f146eb... | 5890595e16cbebb88... | 2026-03-02 09:20:00 |  25.00 |
| e6       | 20260302 | 6bb61e3b7bce0931d... | bd11537f1bc31e334... | 2026-03-02 11:00:00 |  18.00 |
| e8       | 20260302 | 7b8d62fd2f0f5b2e3... | 905ad4f16a809a8f8... | 2026-03-02 12:30:00 |  12.50 |
| e10      | 20260303 | 4d0a87b63b7290cd6... | 905ad4f16a809a8f8... | 2026-03-03 14:00:00 |   7.50 |
| e12      | 20260304 | 270c1b084f3f146eb... | 5f2b9323c39ee3c86... | 2026-03-04 07:30:00 |  39.00 |
| e13      | 20260304 | 6bb61e3b7bce0931d... | 905ad4f16a809a8f8... | 2026-03-04 10:00:00 |   9.99 |
```

#### Expected results

| Check | Expected | Why |
|---|---|---|
| rows in fct_orders | 7 | 8 purchases (e3, e5, e6, e7, e8, e10, e12, e13) minus e7 with amount “abc” |
| total amount | 175.99 | 64 + 25 + 18 + 12.50 + 7.50 + 39 + 9.99 |
| e12 date_key | 20260304 | 23:30 on 3 March at −08:00 is 4 March in UTC |
| orders on the unknown customer | 2 | e6 (no user) and e13 (u6, not in the CRM) |

#### Verify with SQL

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""
        select count(*) as orders, sum(amount) as revenue,
               count(*) filter (where c.customer_id = '-1') as unknown_customer_orders
        from main_marts.fct_orders f
        join main_marts.dim_customer c using (customer_key)"""))
```

Output:

```text
┌────────┬───────────────┬─────────────────────────┐
│ orders │    revenue    │ unknown_customer_orders │
│ int64  │ decimal(38,2) │          int64          │
├────────┼───────────────┼─────────────────────────┤
│      7 │        175.99 │                       2 │
└────────┴───────────────┴─────────────────────────┘
```

> **On the job:** Turn every “expected result” you check by hand into a test or a reconciliation query (exercise 5), so the next run checks it for you.

> **The main idea:** one `dbt run` builds the layers in dependency order. Know your expected results (row counts, totals, edge cases) before you look, then check them.

*Read more:* [dbt run](https://docs.getdbt.com/reference/commands/run), [dbt show](https://docs.getdbt.com/reference/commands/show).

---

<a id="slide-22"></a>
## 22. Trace four events from raw rows to the star schema

*Building models · the same events in bronze, silver and gold*

Follow four interesting events through every layer with plain SQL against the DuckDB file: e5 (redelivered), e6 (no user), e7 (amount “abc”) and e12 (a −08:00 offset that changes the date). The commands that produced these tables, in order, were `python scripts/load_raw.py`, `dbt seed` and `dbt run`.

```python
import duckdb
ids = "('e5', 'e6', 'e7', 'e12')"
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print("BRONZE  raw.events (source)")
    print(con.sql(f"""select event_id, user_id, ts, amount, _source_file from raw.events
                     where event_id in {ids} order by event_id, _source_file"""))
    print("SILVER  main_staging.stg_events (view)")
    print(con.sql(f"""select event_id, customer_id, event_at_utc, amount, amount_raw from main_staging.stg_events
                     where event_id in {ids} order by event_id"""))
    print("GOLD    main_marts.fct_orders joined to its dimensions (tables)")
    print(con.sql(f"""select f.order_id, d.date_day, c.customer_name, p.product_name, f.amount
                     from main_marts.fct_orders f
                     join main_marts.dim_date d using (date_key)
                     join main_marts.dim_customer c using (customer_key)
                     join main_marts.dim_product p using (product_key)
                     where f.order_id in {ids} order by f.order_id"""))
```

Output:

```text
BRONZE  raw.events (source)
┌──────────┬─────────┬───────────────────────────┬─────────┬─────────────────────────┐
│ event_id │ user_id │            ts             │ amount  │      _source_file       │
│ varchar  │ varchar │          varchar          │ varchar │         varchar         │
├──────────┼─────────┼───────────────────────────┼─────────┼─────────────────────────┤
│ e12      │ u2      │ 2026-03-03T23:30:00-08:00 │ 39.00   │ events_2026-03-03.jsonl │
│ e5       │ u2      │ 2026-03-02T09:20:00Z      │ 25      │ events_2026-03-02.jsonl │
│ e5       │ u2      │ 2026-03-02T09:20:00Z      │ 25.00   │ events_2026-03-04.jsonl │
│ e6       │ NULL    │ 2026-03-02T11:00:00Z      │ 18.00   │ events_2026-03-02.jsonl │
│ e7       │ u3      │ 2026-03-02T12:00:00Z      │ abc     │ events_2026-03-02.jsonl │
└──────────┴─────────┴───────────────────────────┴─────────┴─────────────────────────┘

SILVER  main_staging.stg_events (view)
┌──────────┬─────────────┬─────────────────────┬───────────────┬────────────┐
│ event_id │ customer_id │    event_at_utc     │    amount     │ amount_raw │
│ varchar  │   varchar   │      timestamp      │ decimal(10,2) │  varchar   │
├──────────┼─────────────┼─────────────────────┼───────────────┼────────────┤
│ e12      │ u2          │ 2026-03-04 07:30:00 │         39.00 │ 39.00      │
│ e5       │ u2          │ 2026-03-02 09:20:00 │         25.00 │ 25.00      │
│ e6       │ NULL        │ 2026-03-02 11:00:00 │         18.00 │ 18.00      │
│ e7       │ u3          │ 2026-03-02 12:00:00 │          NULL │ abc        │
└──────────┴─────────────┴─────────────────────┴───────────────┴────────────┘

GOLD    main_marts.fct_orders joined to its dimensions (tables)
┌──────────┬────────────┬──────────────────┬──────────────┬───────────────┐
│ order_id │  date_day  │  customer_name   │ product_name │    amount     │
│ varchar  │    date    │     varchar      │   varchar    │ decimal(10,2) │
├──────────┼────────────┼──────────────────┼──────────────┼───────────────┤
│ e12      │ 2026-03-04 │ Leo Kim          │ Monstera     │         39.00 │
│ e5       │ 2026-03-02 │ Leo Kim          │ Snake Plant  │         25.00 │
│ e6       │ 2026-03-02 │ Unknown customer │ Ceramic Pot  │         18.00 │
└──────────┴────────────┴──────────────────┴──────────────┴───────────────┘
```

#### What happened to each

| Event | Bronze | Silver | Gold |
|---|---|---|---|
| e5 | 2 rows (day 1 and day 3) | 1 row, the day-3 delivery wins | 1 order, Leo Kim, 25.00 |
| e6 | user NULL | customer_id NULL | order kept, “Unknown customer” |
| e7 | amount “abc” | amount NULL, raw text kept | not an order (filtered in `int_purchases`, reported by a test) |
| e12 | 23:30 at −08:00 on 3 March | 07:30 UTC on 4 March | date 2026-03-04 |

#### Where the SQL came from

Every step is visible as compiled SQL: `target/compiled/leafy/models/staging/stg_events.sql` for the cleaning and dedupe, and `target/compiled/leafy/models/marts/fct_orders.sql` for the fact, with `int_purchases` inlined as a CTE (lesson 24).

> **On the job:** “Walk me through how one record gets from the source to the dashboard” is a common interview prompt. Answer layer by layer, naming what each layer guarantees: bronze = as delivered, silver = one clean typed row per entity, gold = business grain with keys to conformed dimensions.

> **The main idea:** being able to trace a single record through bronze, silver and gold, and explain every change, is the best evidence that a pipeline is correct.

*Read more:* [Staging: preparing atomic building blocks](https://docs.getdbt.com/best-practices/how-we-structure/2-staging), [Marts: business-defined entities](https://docs.getdbt.com/best-practices/how-we-structure/4-marts).

---

<a id="slide-23"></a>
## 23. Materializations: view, table, ephemeral

*Tools of the trade · what dbt creates for each model*

A **materialization** is the strategy dbt uses to turn a model’s SELECT into something in the warehouse. You choose it per folder or per model with the `materialized` config. Four are built in; this deck uses the first three.

| Materialization | Creates | Query cost | Build cost | Use for |
|---|---|---|---|---|
| **view** | a view (stored query) | pays every time someone queries it | almost zero | staging; light logic; always-fresh results |
| **table** | a table, rebuilt in full on every run | cheap: data is stored | the whole query, every run | marts that people and dashboards query |
| **ephemeral** | nothing: the SQL is inlined as a CTE into each model that refs it | n/a | n/a | small intermediate steps you don’t want as objects |
| **incremental** | a table that is *appended to / merged into* instead of rebuilt | cheap | only new rows | large event facts (previewed in the *dbt Jinja and macros* deck) |
| materialized_view | a database-managed materialized view (adapter-specific) | cheap | database refreshes it | where the warehouse supports it |

#### Trade-offs to say out loud

- Views are always current but recompute their whole upstream chain on every query; a stack of five views over a billion-row table makes slow dashboards.
- Tables are fast to read but only as fresh as the last `dbt run`, and a full rebuild of a large table every hour is expensive.
- Ephemeral models can’t be queried when debugging, and a large ephemeral model inlined into many marts is recomputed in each one.
- Switching materialization is a one-line config change: dbt drops the old object and creates the new kind.

#### Choosing

| Layer | Usual default |
|---|---|
| staging | view |
| intermediate | ephemeral or view |
| marts | table (incremental when large) |

> **On the job:** On Fabric Warehouse, Snowflake or BigQuery, materialization choices show up directly in the bill: table rebuilds cost compute on every run, views cost compute on every query. Teams move a mart from table to incremental when its full rebuild stops fitting the schedule.

> **The main idea:** view = stored query, table = stored result rebuilt each run, ephemeral = inlined CTE. Choose per layer, override per model, and move big facts to incremental later.

*Read more:* [Materializations](https://docs.getdbt.com/docs/build/materializations), [Materialization best practices](https://docs.getdbt.com/best-practices/materializations/1-guide-overview).

---

<a id="slide-24"></a>
## 24. What the materializations look like in DuckDB

*Tools of the trade · views, tables, and an ephemeral model that isn’t there*

Ask the database itself. `information_schema.tables` is the standard catalog view that lists every table and view.

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select table_schema, table_name, table_type
                     from information_schema.tables
                     where table_schema like 'main_%'
                     order by table_schema, table_name"""))
```

Output:

```text
┌──────────────┬──────────────────┬────────────┐
│ table_schema │    table_name    │ table_type │
│   varchar    │     varchar      │  varchar   │
├──────────────┼──────────────────┼────────────┤
│ main_marts   │ dim_customer     │ BASE TABLE │
│ main_marts   │ dim_date         │ BASE TABLE │
│ main_marts   │ dim_product      │ BASE TABLE │
│ main_marts   │ fct_daily_funnel │ BASE TABLE │
│ main_marts   │ fct_orders       │ BASE TABLE │
│ main_seeds   │ customers        │ BASE TABLE │
│ main_seeds   │ products         │ BASE TABLE │
│ main_staging │ stg_customers    │ VIEW       │
│ main_staging │ stg_events       │ VIEW       │
│ main_staging │ stg_products     │ VIEW       │
└──────────────┴──────────────────┴────────────┘
  10 rows                            3 columns
```

#### Where did int_purchases go?

It has no object. dbt pasted its SQL into the compiled fact as a CTE named `__dbt__cte__int_purchases`:

```sql
-- target/compiled/leafy/models/marts/fct_orders.sql (generated by dbt)
-- fct_orders: one row per order (a purchase event with a valid amount).
-- Grain: order_id. Measures: amount. Foreign keys to dim_date, dim_customer, dim_product.
with  __dbt__cte__int_purchases as (
-- int_purchases: purchase events that can be counted as orders.
-- Ephemeral (folder default): never built, inlined as a CTE where referenced.
select
    event_id                    as order_id,
    customer_id,
    product_id,
    event_at_utc                as ordered_at_utc,
    cast(event_at_utc as date)  as order_date_utc,
    amount
from "leafy"."main_staging"."stg_events"
where event_type = 'purchase'
  and amount is not null       -- e7 ("abc") is excluded; a test reports it
), purchases as (
    select * from __dbt__cte__int_purchases
),
customers as (
    select customer_key, customer_id from "leafy"."main_marts"."dim_customer"
),
products as (
    select product_key, product_id from "leafy"."main_marts"."dim_product"
)
select
    purchases.order_id,
    cast(strftime(purchases.order_date_utc, '%Y%m%d') as integer) as date_key,
    coalesce(customers.customer_key, md5('-1'))                     as customer_key,
    coalesce(products.product_key, md5('-1'))                       as product_key,
    purchases.ordered_at_utc,
    purchases.amount
from purchases
left join customers on purchases.customer_id = customers.customer_id
left join products  on purchases.product_id  = products.product_id
```

#### Reading the result

- `main_staging`: three **VIEW**s (folder default).
- `main_marts`: four **BASE TABLE**s (folder default).
- `main_seeds`: seeds are always tables.
- No `int_purchases` anywhere: ephemeral.

> **On the job:** When a stakeholder asks “where is table X?”, the answer depends on the materialization and the custom schema. `information_schema` (or the warehouse’s catalog) plus `target/compiled/` answers it in a minute.

> **The main idea:** views and tables appear in the catalog; ephemeral models appear only inside the compiled SQL of the models that use them.

*Read more:* [Materializations](https://docs.getdbt.com/docs/build/materializations), [DuckDB information_schema](https://duckdb.org/docs/stable/sql/meta/information_schema).

---

<a id="slide-25"></a>
## 25. The everyday commands

*Tools of the trade · compile, run, test, build, and friends*

| Command | What it does | Touches the database? |
|---|---|---|
| `dbt debug` | Checks project, profile and connection | connects only |
| `dbt parse` | Reads the project and writes `target/manifest.json`; catches YAML and Jinja errors fast | no |
| `dbt compile` | Renders Jinja to SQL in `target/compiled/` | reads metadata |
| `dbt seed` | Loads CSV seeds into tables | writes |
| `dbt run` | Builds models (views, tables) in DAG order | writes |
| `dbt test` | Runs data tests; each test is a query that must return zero rows | reads (writes only with `--store-failures`) |
| `dbt build` | Seeds + models + snapshots + tests, interleaved in DAG order; a failing test skips everything downstream | writes |
| `dbt show` | Previews a model’s or query’s rows | reads |
| `dbt ls` | Lists the resources a selector picks | no |
| `dbt docs generate` | Writes the docs site and `catalog.json` | reads metadata |
| `dbt clean` | Deletes the folders in `clean-targets` (here `target/`) | no |

#### Exit codes

dbt returns **0** when everything succeeded (warnings included), **1** when a model, seed or test failed, and **2** when dbt itself could not run (bad YAML, unknown command). Schedulers and CI read this number, exactly like the scripts in Python deck 2.

#### Common flags

- `--select` / `--exclude`: which nodes (next lesson).
- `--target ci`: which connection.
- `--vars '{key: value}'`: override variables.
- `--full-refresh`: rebuild incremental models from scratch.
- `--fail-fast` (`-x`): stop at the first failure.
- `--threads 8`: parallelism.

> **On the job:** A typical production job is a single line: `dbt build --target prod`. Development is a loop of `dbt build --select my_model+` (the model, its tests, and everything downstream) until it is green.

> **The main idea:** `run` builds models, `test` checks data, `build` does both in DAG order and stops bad data from flowing downstream. Exit code 0 = success, 1 = failures, 2 = dbt error.

*Read more:* [dbt command reference](https://docs.getdbt.com/reference/dbt-commands), [dbt build](https://docs.getdbt.com/reference/commands/build), [Exit codes](https://docs.getdbt.com/reference/exit-codes).

---

<a id="slide-26"></a>
## 26. Selectors: build only what you need

*Tools of the trade · --select with graph operators, methods and set operators*

A **node** is anything in the DAG: a model, seed, source, test or snapshot. A **selector** picks nodes. `dbt ls` prints what a selector picks without running anything, so use it to check before you build.

#### Graph operators: `+` follows the arrows

Terminal (output trimmed):

```text
$ dbt ls --select stg_events+ --resource-type model
leafy.marts.fct_daily_funnel
leafy.marts.fct_orders
leafy.intermediate.int_purchases
leafy.staging.stg_events
```

Terminal (output trimmed):

```text
$ dbt ls --select +fct_orders --exclude resource_type:test
leafy.marts.dim_customer
leafy.marts.dim_product
leafy.marts.fct_orders
leafy.intermediate.int_purchases
leafy.staging.stg_customers
leafy.staging.stg_events
leafy.staging.stg_products
leafy.customers
leafy.products
source:leafy.shop_raw.events
```

#### Methods and set operators

Terminal (output trimmed):

```text
$ dbt ls --select tag:funnel
leafy.marts.fct_daily_funnel
```

Terminal (output trimmed):

```text
$ dbt ls --select path:models/staging --resource-type model
leafy.staging.stg_customers
leafy.staging.stg_events
leafy.staging.stg_products
```

Terminal (output trimmed):

```text
$ dbt ls --select stg_events+,tag:mart --resource-type model
leafy.marts.fct_daily_funnel
leafy.marts.fct_orders
```

Terminal (output trimmed):

```text
$ dbt ls --select 1+fct_orders --resource-type model
leafy.marts.dim_customer
leafy.marts.dim_product
leafy.marts.fct_orders
leafy.intermediate.int_purchases
```

| Selector | Picks | Example |
|---|---|---|
| `model_name` | one node | `--select fct_orders` |
| `name+` / `+name` | node and all descendants / all ancestors | `stg_events+`, `+fct_orders` |
| `n+name`, `name+n` | only n generations | `1+fct_orders` = direct parents |
| `@name` | descendants and all their ancestors (everything needed to rebuild them) | `@stg_events` |
| `tag:`, `path:`, `resource_type:`, `source:`, `config.materialized:` | by property | `tag:mart`, `path:models/staging` |
| space | union (OR) | `--select stg_events dim_date` |
| comma | intersection (AND) | `--select stg_events+,tag:mart` |
| `--exclude` | remove from the selection | `--exclude resource_type:test` |
| `state:modified` | changed since a saved manifest (CI; previewed in the *dbt Jinja and macros* deck) | `--select state:modified+ --state prod-artifacts/` |

> **On the job:** Selectors keep development fast and production safe: “rebuild the model I changed and everything downstream” is `dbt build --select my_model+`; “the nightly marketing refresh” is `dbt build --select tag:marketing`. Interviewers like asking what `+model+` means.

> **The main idea:** use `+` for ancestors/descendants, methods such as `tag:` and `path:`, space for OR, comma for AND, and check any selector with `dbt ls` before building.

*Read more:* [Node selection syntax](https://docs.getdbt.com/reference/node-selection/syntax), [Graph operators](https://docs.getdbt.com/reference/node-selection/graph-operators), [Selector methods](https://docs.getdbt.com/reference/node-selection/methods), [Set operators](https://docs.getdbt.com/reference/node-selection/set-operators), [dbt ls (list)](https://docs.getdbt.com/reference/commands/list).

---

<a id="slide-27"></a>
## 27. Data tests: the four generic tests

*Trust · unique, not_null, accepted_values, relationships*

A **data test** is a SELECT that returns the rows that break a rule. Zero rows = pass. A **generic test** is a reusable, parameterised test that you attach to a column in YAML; dbt ships four:

| Generic test | Fails when | Typical use |
|---|---|---|
| `unique` | a value appears more than once | primary keys, the grain of a fact |
| `not_null` | a value is NULL | keys, required attributes, measures |
| `accepted_values` | a value is outside a list | statuses, event types, country codes |
| `relationships` | a value has no match in another model’s column (a broken foreign key) | fact → dimension keys |

#### Staging tests

```yaml
# models/staging/_staging.yml
version: 2

models:
  - name: stg_events
    description: Website events, cleaned, typed and deduplicated. One row per event_id.
    columns:
      - name: event_id
        description: Primary key of the event.
        data_tests:
          - unique
          - not_null
      - name: event_type
        description: Lower-case event type.
        data_tests:
          - accepted_values:
              arguments:
                values: ["page_view", "add_to_cart", "purchase"]
      - name: event_at_utc
        description: Event time converted to UTC (TIMESTAMP without time zone).
        data_tests:
          - not_null

  - name: stg_customers
    description: One row per customer from the CRM seed, with a normalised customer_id.

  - name: stg_products
    description: One row per product from the catalogue seed.
```

The accepted list deliberately omits `refund`, the value that arrived on day 2. You will see the failure in lesson 29.

#### Mart tests

```yaml
# models/marts/_marts.yml
version: 2

models:
  - name: dim_customer
    description: Conformed customer dimension. One row per customer plus an unknown member (customer_id = '-1').
    columns:
      - name: customer_key
        description: Surrogate key, md5(customer_id).
        data_tests: [unique, not_null]
      - name: customer_id
        description: Natural key from the CRM.
        data_tests: [unique, not_null]

  - name: dim_product
    description: Product dimension. One row per product plus an unknown member (product_id = '-1').
    columns:
      - name: product_key
        data_tests: [unique, not_null]
      - name: product_id
        data_tests: [unique, not_null]

  - name: dim_date
    description: Calendar dimension, one row per day between the dim_date_start and dim_date_end variables.
    columns:
      - name: date_key
        description: Date as an integer yyyymmdd.
        data_tests: [unique, not_null]

  - name: fct_orders
    description: Orders fact. One row per purchase event with a valid amount.
    columns:
      - name: order_id
        description: Degenerate dimension; the purchase event_id.
        data_tests: [unique, not_null]
      - name: customer_key
        data_tests:
          - not_null
          - relationships:
              arguments:
                to: ref('dim_customer')
                field: customer_key
      - name: product_key
        data_tests:
          - not_null
          - relationships:
              arguments:
                to: ref('dim_product')
                field: product_key
      - name: date_key
        data_tests:
          - not_null
          - relationships:
              arguments:
                to: ref('dim_date')
                field: date_key
      - name: amount
        description: Order amount in USD.
        data_tests: [not_null]

  - name: fct_daily_funnel
    description: Periodic snapshot of event counts per UTC day.
    columns:
      - name: date_key
        data_tests:
          - unique
          - not_null
          - relationships:
              arguments:
                to: ref('dim_date')
                field: date_key
```

#### Syntax notes

- Use the key `data_tests:` (dbt 1.8+; the older `tests:` still works). Unit tests are a different feature (previewed in the *dbt Jinja and macros* deck).
- Test parameters go under `arguments:` (dbt 1.10+). The older form, with `values:` directly under the test name, still runs but raises a deprecation warning.
- `relationships` ignores NULLs, so pair it with `not_null` on foreign keys.

#### What to test first

- The grain: `unique` + `not_null` on every model’s key.
- Every fact-to-dimension key: `relationships` + `not_null`.
- Every column that drives logic (`event_type`, `status`): `accepted_values`.

> **On the job:** These four tests catch most real incidents: duplicate rows after a source redelivers, a new status nobody mapped, facts pointing at customers that don’t exist. Many teams require `unique` + `not_null` on the primary key of every model before a pull request can merge.

> **The main idea:** attach `unique`, `not_null`, `accepted_values` and `relationships` to columns in YAML. Test every grain, every foreign key, and every column that drives logic.

*Read more:* [Add data tests to your DAG](https://docs.getdbt.com/docs/build/data-tests), [data_tests property](https://docs.getdbt.com/reference/resource-properties/data-tests), [accepted_values reference](https://docs.getdbt.com/reference/resource-properties/data-tests#accepted_values).

---

<a id="slide-28"></a>
## 28. Singular tests and severity

*Trust · a one-off rule written as SQL*

A **singular test** is a `.sql` file in `tests/` containing one SELECT that returns failing rows. Use it for rules that don’t fit a generic test: reconciliations, cross-column rules, “this should never happen” checks. **Severity** decides what a failure means: `error` (the default) fails the run; `warn` reports it and carries on added.

```sql
# tests/assert_no_unparseable_amounts.sql
-- Singular test: purchase-like events whose amount text could not be parsed.
-- Any returned row is a failure; severity 'warn' reports it without failing the run.
{{ config(severity='warn') }}

select
    event_id,
    event_type,
    amount_raw
from {{ ref('stg_events') }}
where amount_raw is not null
  and amount is null
```

Terminal (output trimmed):

```text
$ dbt test --select assert_no_unparseable_amounts
1 of 1 START test assert_no_unparseable_amounts ................................ [RUN]
1 of 1 WARN 1 assert_no_unparseable_amounts .................................... [WARN 1 in x.xxs]
Finished running 1 test in x.xx seconds (normalised).
Completed with 1 warning:
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
  compiled code at target\compiled\leafy\tests\assert_no_unparseable_amounts.sql
Done. PASS=0 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### Why warn here

`int_purchases` deliberately excludes e7 (amount `abc`). The business accepted that, but wants to know each time it happens. A warning keeps the pipeline running and leaves a visible record in the log. If unparseable amounts ever became common, you would raise the severity, or use thresholds: `warn_if: ">0"`, `error_if: ">10"`.

#### Generic or singular?

| Rule | Test |
|---|---|
| order_id is unique | generic `unique` |
| fct total = staging total for valid purchases | singular (exercise 5) |
| no order before the customer signed up | singular |
| the same rule on 20 models | write your own generic test (a test macro) |

> **On the job:** Reconciliation tests (“revenue in the mart equals revenue in the source for yesterday”) are singular tests that finance teams love. They catch fan-out joins and silent filters that per-column tests never see.

> **The main idea:** a singular test is a SELECT of bad rows in `tests/`. Choose severity on purpose: `error` stops the pipeline, `warn` records known, accepted problems.

*Read more:* [Singular data tests](https://docs.getdbt.com/docs/build/data-tests#singular-data-tests), [severity, error_if, warn_if](https://docs.getdbt.com/reference/resource-configs/severity).

---

<a id="slide-29"></a>
## 29. dbt test: reading a failure

*Trust · the accepted_values test fails, on purpose*

Run every test. Expect one failure (`refund` is not in the accepted list) and one warning (e7).

Terminal (PASS lines removed):

```text
$ dbt test
2 of 32 WARN 1 assert_no_unparseable_amounts ................................... [WARN 1 in x.xxs]
1 of 32 FAIL 1 accepted_values_stg_events_event_type__page_view__add_to_cart__purchase  [FAIL 1 in x.xxs]
Completed with 1 error, 0 partial successes, and 1 warning:
[ERROR]: in test accepted_values_stg_events_event_type__page_view__add_to_cart__purchase (models\staging\_staging.yml)
  Got 1 result, configured to fail if != 0
  compiled code at target\compiled\leafy\models\staging\_staging.yml\accepted_values_stg_events_2ed8c44c503f537c31b00e985e4153d8.sql
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
  compiled code at target\compiled\leafy\tests\assert_no_unparseable_amounts.sql
Done. PASS=30 WARN=1 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=32
[exit code 1]
```

#### How to read it

- `FAIL 1`: the test query returned 1 row. For `accepted_values` that means one distinct bad value.
- The test name tells you the model, column and rule: `accepted_values_stg_events_…`.
- “compiled code at …” is the exact SQL that ran. Open it, run it, look at the rows.
- Summary: `ERROR=1` counts failed error-severity tests; `WARN=1` is the singular test. The exit code is 1.

#### The failing query

```sql
-- target/compiled/leafy/models/staging/_staging.yml/accepted_values_stg_events_2ed8c44c503f537c31b00e985e4153d8.sql (generated by dbt)
with all_values as (
    select
        event_type as value_field,
        count(*) as n_records
    from "leafy"."main_staging"."stg_events"
    group by event_type
)
select *
from all_values
where value_field not in (
    'page_view','add_to_cart','purchase'
)
```

The generic test is a macro: dbt filled in the model, the column and the list.

> **On the job:** In an on-call rotation, a failed test is an alert. The first three questions are always the same: which rows (run the compiled SQL), since when (which load introduced them), and is the data wrong or is the rule out of date? Here the rule is out of date: refunds are a real new event type.

> **The main idea:** a test failure names the model, column and rule, gives the number of failing rows, and points to the compiled SQL. Run that SQL to see the rows, then decide whether the data or the rule is wrong.

*Read more:* [dbt test](https://docs.getdbt.com/reference/commands/test), [Add data tests to your DAG](https://docs.getdbt.com/docs/build/data-tests).

---

<a id="slide-30"></a>
## 30. dbt build: a failed test protects everything downstream

*Trust · seeds, models and tests interleaved in DAG order added*

`dbt build` runs each node, then its tests, before moving downstream. When an error-severity test fails, every node that depends on the tested model is **skipped**, so bad data does not flow into marts. Run it now, with the failing test still in place:

Terminal (only the interesting lines):

```text
$ dbt build
12 of 42 FAIL 1 accepted_values_stg_events_event_type__page_view__add_to_cart__purchase  [FAIL 1 in x.xxs]
13 of 42 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
19 of 42 SKIP relation main_marts.fct_daily_funnel ............................. [SKIP]
20 of 42 SKIP test not_null_fct_daily_funnel_date_key .......................... [SKIP]
21 of 42 SKIP test relationships_fct_daily_funnel_date_key__date_key__ref_dim_date_  [SKIP]
22 of 42 SKIP test unique_fct_daily_funnel_date_key ............................ [SKIP]
33 of 42 SKIP relation main_marts.fct_orders due to ephemeral model status 'skipped'  [ERROR SKIP]
34 of 42 SKIP test not_null_fct_orders_amount .................................. [SKIP]
35 of 42 SKIP test not_null_fct_orders_customer_key ............................ [SKIP]
36 of 42 SKIP test not_null_fct_orders_date_key ................................ [SKIP]
37 of 42 SKIP test not_null_fct_orders_order_id ................................ [SKIP]
38 of 42 SKIP test not_null_fct_orders_product_key ............................. [SKIP]
39 of 42 SKIP test relationships_fct_orders_customer_key__customer_key__ref_dim_customer_  [SKIP]
40 of 42 SKIP test relationships_fct_orders_date_key__date_key__ref_dim_date_ .. [SKIP]
41 of 42 SKIP test relationships_fct_orders_product_key__product_key__ref_dim_product_  [SKIP]
42 of 42 SKIP test unique_fct_orders_order_id .................................. [SKIP]
[ERROR]: in test accepted_values_stg_events_event_type__page_view__add_to_cart__purchase (models\staging\_staging.yml)
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
Done. PASS=26 WARN=1 ERROR=1 SKIP=14 NO-OP=0 REUSED=0 TOTAL=42
[exit code 1]
```

#### What happened

- Seeds, staging views and the three dimensions were built and tested.
- `accepted_values` on `stg_events` failed, so both facts (which depend on `stg_events`) and all of their tests were skipped: 14 skipped nodes.
- `fct_orders` says “due to ephemeral model status ‘skipped’”: its direct parent is the ephemeral `int_purchases`, which was skipped first.
- With 4 threads, lines can appear in a slightly different order on every run; the numbers (`12 of 42`) identify the nodes.
- The previous versions of `fct_orders` and `fct_daily_funnel` are still in the database, untouched: consumers keep yesterday’s good data rather than today’s suspect data.

#### run + test vs build

|  | `dbt run` then `dbt test` | `dbt build` |
|---|---|---|
| order | all models, then all tests | per node: build, test, then children |
| bad data in marts? | yes, until someone reacts | no: children are skipped |
| use | quick local loops | production and CI |

> **On the job:** Production schedules run `dbt build`, not `run` followed by `test`: by the time a separate test step fails, dashboards have already refreshed with bad data.

> **The main idea:** `dbt build` tests each node before building its children and skips descendants of a failed test, so marts keep their last good data.

*Read more:* [dbt build](https://docs.getdbt.com/reference/commands/build).

---

<a id="slide-31"></a>
## 31. Fix the rule, store failures, and go green

*Trust · --store-failures, then update the accepted values*

`--store-failures` added saves each failing test’s rows in a table (schema `main_dbt_test__audit`) so you can query them after the run, from a notebook or a dashboard.

Terminal (output trimmed):

```text
$ dbt test --select stg_events --store-failures
2 of 5 WARN 1 assert_no_unparseable_amounts .................................... [WARN 1 in x.xxs]
1 of 5 FAIL 1 accepted_values_stg_events_event_type__page_view__add_to_cart__purchase  [FAIL 1 in x.xxs]
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
Done. PASS=3 WARN=1 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
[exit code 1]
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    (name,) = con.sql("""select table_name from information_schema.tables
                         where table_schema = 'main_dbt_test__audit'
                           and table_name like 'accepted_values%'""").fetchone()
    print(name)
    print(con.sql(f'select * from main_dbt_test__audit."{name}"'))
```

Output:

```text
accepted_values_stg_events_2ed8c44c503f537c31b00e985e4153d8
┌─────────────┬───────────┐
│ value_field │ n_records │
│   varchar   │   int64   │
├─────────────┼───────────┤
│ refund      │         1 │
└─────────────┴───────────┘
```

#### The fix

The data is right; the rule was out of date. Add `refund` to the list in `models/staging/_staging.yml`:

```diff
-                values: ["page_view", "add_to_cart", "purchase"]
+                values: ["page_view", "add_to_cart", "purchase", "refund"]
```

#### Green again

Terminal (output trimmed):

```text
$ dbt test --select stg_events
2 of 5 WARN 1 assert_no_unparseable_amounts .................................... [WARN 1 in x.xxs]
1 of 5 PASS accepted_values_stg_events_event_type__page_view__add_to_cart__purchase__refund  [PASS in x.xxs]
4 of 5 PASS not_null_stg_events_event_id ....................................... [PASS in x.xxs]
3 of 5 PASS not_null_stg_events_event_at_utc ................................... [PASS in x.xxs]
5 of 5 PASS unique_stg_events_event_id ......................................... [PASS in x.xxs]
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
Done. PASS=4 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

> **On the job:** Changing a test to make it pass needs the same scrutiny as changing a model. In the pull request, link the evidence (“refunds launched on 3 March, see ticket”) so the reviewer knows the rule changed for a business reason, not to silence an alert.

> **The main idea:** store failing rows when you need to investigate or report them; fix the data or the rule, never just delete the test.

*Read more:* [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures), [dbt test](https://docs.getdbt.com/reference/commands/test).

---

<a id="slide-32"></a>
## 32. Documentation: descriptions, doc blocks, dbt docs

*Trust · documentation lives next to the code*

Every `description:` you wrote in YAML is documentation. For longer text, a **doc block** is a named piece of Markdown in a `.md` file under `models/`, referenced with `{{ doc("name") }}`. `dbt docs generate` combines the project (descriptions, tests, SQL, lineage) with the **catalog** (column names and types read from the database) into a static website.

#### A doc block for the fact

```markdown
# models/docs.md
{% docs fct_orders %}
**Orders fact.** One row per purchase event with a parseable amount.

- **Grain:** `order_id` (the purchase `event_id`), tested with `unique` and `not_null`.
- **Excluded:** purchases whose amount text cannot be parsed; the
  `assert_no_unparseable_amounts` test warns about each one.
- **Unknown members:** a missing or unknown customer or product maps to the
  dimension row with natural key `-1`.
- **Time:** `ordered_at_utc` and `date_key` are in UTC.
{% enddocs %}
```

…referenced from `models/marts/_marts.yml`:

```diff
   - name: fct_orders
-    description: Orders fact. One row per purchase event with a valid amount.
+    description: '{{ doc("fct_orders") }}'
```

#### Generate the site

Terminal (output trimmed):

```text
$ dbt docs generate --static
Building catalog
Catalog written to <project>\target\catalog.json
```

```python
from pathlib import Path
for name in ["index.html", "static_index.html", "manifest.json", "catalog.json", "run_results.json"]:
    print(f"{name:<18} exists: {Path('target', name).exists()}")
```

Output:

```text
index.html         exists: True
static_index.html  exists: True
manifest.json      exists: True
catalog.json       exists: True
run_results.json   exists: True
```

`--static` also writes `static_index.html`, one self-contained file you can open in a browser or attach to a ticket.

#### dbt docs serve

`dbt docs serve` starts a small local web server (default port 8080) and opens the site in your browser: model and column descriptions, tests, the compiled SQL, and an interactive lineage graph. It keeps running until you press Ctrl+C, so it is not run in this build. Teams publish `target/` to internal static hosting after each production run instead.

#### Good descriptions

- Models: the grain, the business meaning, what is excluded.
- Columns: units (USD, UTC), meaning of special values (`-1`), source of truth.
- `persist_docs` can also write descriptions into the warehouse as table and column comments, so they show up in other tools.

> **On the job:** Docs generated from the same files as the code are rarely stale. Analysts use the docs site to find the right table and its grain; reviewers can require a description for every new model and every key column.

> **The main idea:** write descriptions in YAML and longer notes in doc blocks; `dbt docs generate` turns them, plus the catalog and lineage, into a website. Serve it locally or publish `target/`.

*Read more:* [About documentation](https://docs.getdbt.com/docs/build/documentation), [Doc blocks](https://docs.getdbt.com/docs/build/documentation#using-docs-blocks), [dbt docs generate / serve](https://docs.getdbt.com/reference/commands/cmd-docs), [persist_docs](https://docs.getdbt.com/reference/resource-configs/persist_docs).

---

<a id="slide-33"></a>
## 33. Lineage: the DAG, drawn from manifest.json

*Trust · every ref() and source() is an edge*

**Lineage** is the record of where each table’s data comes from. dbt knows it exactly, because every `ref()` and `source()` is an edge. `target/manifest.json` stores the whole project as JSON, including a `parent_map`: for each node, the nodes it reads from. The diagram below was drawn by this deck’s build script from that file (tests omitted).

Lineage edges from `target/manifest.json` `parent_map` (parent → child; tests omitted):

- `dim_customer` → `fct_orders`
- `dim_product` → `fct_orders`
- `int_purchases` → `fct_orders`
- `stg_customers` → `dim_customer`
- `stg_events` → `fct_daily_funnel`
- `stg_events` → `int_purchases`
- `stg_products` → `dim_product`
- `customers` → `stg_customers`
- `products` → `stg_products`
- `shop_raw.events` → `stg_events`

#### Read it yourself

```python
import json
manifest = json.load(open("target/manifest.json", encoding="utf-8"))
print("dbt", manifest["metadata"]["dbt_version"], "| nodes:", len(manifest["nodes"]), "| sources:", len(manifest["sources"]))
for child in ["model.leafy.fct_orders", "model.leafy.int_purchases", "model.leafy.stg_events"]:
    print(child.split(".")[-1], "<-", sorted(p.split(".")[-1] for p in manifest["parent_map"][child]))
print("children of stg_events:", sorted(manifest["nodes"][c]["name"] for c in manifest["child_map"]["model.leafy.stg_events"]))
```

Output:

```text
dbt 1.12.5 | nodes: 43 | sources: 1
fct_orders <- ['dim_customer', 'dim_product', 'int_purchases']
int_purchases <- ['stg_events']
stg_events <- ['events']
children of stg_events: ['accepted_values_stg_events_event_type__page_view__add_to_cart__purchase__refund', 'assert_no_unparseable_amounts', 'fct_daily_funnel', 'int_purchases', 'not_null_stg_events_event_at_utc', 'not_null_stg_events_event_id', 'unique_stg_events_event_id']
```

Tests are children too: `child_map` lists the tests on `stg_events` next to the models that read it.

#### What lineage is for

- **Impact analysis:** “if I change `stg_events`, what breaks?” is `dbt ls --select stg_events+`.
- **Root cause:** a wrong number in `fct_orders` can only come from its ancestors (`+fct_orders`).
- **Governance:** catalogs such as Microsoft Purview, DataHub or the dbt platform’s explorer import `manifest.json` to show lineage across tools.

> **On the job:** manifest.json is the API of a dbt project: CI uses it for `state:modified` selection, catalogs import it for lineage, and teams write small scripts (like the one here) to enforce rules such as “every mart has a description and a unique test”.

> **The main idea:** lineage comes free with `ref()` and `source()`. It lives in `manifest.json` (`parent_map`, `child_map`), drives selectors, and powers the docs graph and external catalogs.

*Read more:* [manifest.json](https://docs.getdbt.com/reference/artifacts/manifest-json), [dbt artifacts](https://docs.getdbt.com/reference/artifacts/dbt-artifacts), [Data lineage explained (dbt Labs)](https://docs.getdbt.com/terms/data-lineage).

---

<a id="slide-34"></a>
## 34. The reproducible project, from a clean folder

*Trust · four generic tests, a singular test, generated docs*

The finished project is in `dbt-fundamentals-project/` next to this deck: exactly the files written in the lessons, plus a README and a `.gitignore`. To prove it is reproducible, the build copied it to an empty folder (no database, no `target/`) and ran it from scratch.

#### What is in the folder

```text
dbt-fundamentals-project/
├── data/
│   └── raw/
│       ├── events_2026-03-02.jsonl
│       ├── events_2026-03-03.jsonl
│       └── events_2026-03-04.jsonl
├── models/
│   ├── intermediate/
│   │   └── int_purchases.sql
│   ├── marts/
│   │   ├── _marts.yml
│   │   ├── dim_customer.sql
│   │   ├── dim_date.sql
│   │   ├── dim_product.sql
│   │   ├── fct_daily_funnel.sql
│   │   └── fct_orders.sql
│   ├── staging/
│   │   ├── _sources.yml
│   │   ├── _staging.yml
│   │   ├── stg_customers.sql
│   │   ├── stg_events.sql
│   │   └── stg_products.sql
│   └── docs.md
├── scripts/
│   └── load_raw.py
├── seeds/
│   ├── _seeds.yml
│   ├── customers.csv
│   └── products.csv
├── tests/
│   └── assert_no_unparseable_amounts.sql
├── .gitignore
├── dbt_project.yml
├── profiles.yml
└── README.md
```

```markdown
# README.md
# Leafy: a small dbt + DuckDB project

The reproducible project from the deck *dbt fundamentals* (dbt series, deck 1 of 2).
Raw plant-shop events (JSON Lines) become a tested star schema: `fct_orders`,
`fct_daily_funnel`, `dim_customer`, `dim_product`, `dim_date`.

Tested with dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), Python 3.12.

## Run it

    python -m venv .venv
    .venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
    python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0
    python scripts/load_raw.py            # EL: land data/raw/*.jsonl in raw.events
    dbt debug                             # uses profiles.yml in this folder
    dbt build                             # expect: PASS=41 WARN=1 ERROR=0 SKIP=0
    dbt docs generate                     # target/index.html, manifest.json, catalog.json
    dbt docs serve                        # optional, interactive: http://localhost:8080

Run every command from this folder. The DuckDB file `leafy.duckdb` is created here.

## Expected results

- `fct_orders`: 7 rows, total amount 175.99; 2 orders on the unknown customer.
- The one warning is `assert_no_unparseable_amounts` (event e7, amount "abc").

## Layout

- `models/staging`: views; one per source table (rename, cast, clean, dedupe)
- `models/intermediate`: ephemeral building blocks
- `models/marts`: tables at a declared grain (facts and dimensions)
- `seeds`: customers and products; `tests`: singular tests
```

```text
# .gitignore
target/
logs/
dbt_packages/
*.duckdb
*.duckdb.wal
.user.yml
```

#### A clean run: load, build, document

Terminal:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal (PASS lines for tests removed):

```text
$ dbt build
3 of 42 OK loaded seed file main_seeds.products ................................ [INSERT 4 in x.xxs]
2 of 42 OK loaded seed file main_seeds.customers ............................... [INSERT 5 in x.xxs]
1 of 42 OK created sql table model main_marts.dim_date ......................... [OK in x.xxs]
5 of 42 OK created sql view model main_staging.stg_events ...................... [OK in x.xxs]
13 of 42 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
17 of 42 OK created sql view model main_staging.stg_products ................... [OK in x.xxs]
18 of 42 OK created sql view model main_staging.stg_customers .................. [OK in x.xxs]
19 of 42 OK created sql table model main_marts.fct_daily_funnel ................ [OK in x.xxs]
20 of 42 OK created sql table model main_marts.dim_product ..................... [OK in x.xxs]
21 of 42 OK created sql table model main_marts.dim_customer .................... [OK in x.xxs]
33 of 42 OK created sql table model main_marts.fct_orders ...................... [OK in x.xxs]
Finished running 2 seeds, 5 table models, 32 data tests, 3 view models in x.xx seconds (normalised).
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
Done. PASS=41 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=42
```

Terminal (output trimmed):

```text
$ dbt docs generate
Building catalog
Catalog written to <project>\target\catalog.json
```

| Expected | Value |
|---|---|
| nodes built and tested | 42 = 2 seeds + 8 models + 32 tests |
| result | PASS=41, WARN=1 (e7), ERROR=0, SKIP=0 |
| fct_orders | 7 rows, 175.99 total |
| generic tests used | `unique`, `not_null`, `accepted_values`, `relationships` |
| docs | `target/index.html`, `manifest.json`, `catalog.json` |

> **On the job:** “Clone, install, load, `dbt build`” in five commands is what a good project README promises. CI does exactly this on every pull request against an empty database, which is why tiny sample data and DuckDB are so useful for fast pipelines.

> **The main idea:** a dbt project is reproducible when a fresh clone needs only an install, a load and `dbt build`. This one builds 42 nodes with one expected warning and generates its docs.

*Read more:* [dbt build](https://docs.getdbt.com/reference/commands/build), [dbt docs generate / serve](https://docs.getdbt.com/reference/commands/cmd-docs).

---

<a id="slide-35"></a>
## 35. Bug clinic: what goes wrong in dbt projects

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | On a fresh database a model fails with “table does not exist”; it works on your laptop | Hard-coded table name instead of `ref()`/`source()`, so dbt doesn’t know the order | Always `ref`/`source`; check with `dbt ls --select +model` | 13, ex. 7 |
| 2 | Tables appear in `main_marts`, not `marts` | Default custom-schema naming: `<target schema>_<custom>` | Expected; override `generate_schema_name` only if your team agrees | 10 |
| 3 | “Configuration paths exist … which do not apply to any resources” | Folder renamed, typo in `dbt_project.yml`, or no models yet | Fix the path; never ignore this warning after a rename | 10 |
| 4 | “Column types specified for non-existent columns … 2)” and a seed load error | Unquoted `decimal(10,2)` in a YAML `{…}` mapping: YAML splits at the comma (this happened while building the deck) | Quote it: `"decimal(10,2)"` | 10 |
| 5 | Seed IDs lose leading zeros | Type inference turns `007` into 7 | `column_types: {id: varchar}` | 10 |
| 6 | `unique` fails on a fact, revenue too high | Fan-out join or missing dedupe; grain not preserved | Dedupe in staging; check every join against the grain | 12, 19 |
| 7 | `relationships` fails after new data arrives | Late-arriving or missing dimension member | Unknown member + `coalesce` in the fact; monitor unknown counts | 17, ex. 4 |
| 8 | `relationships` passes but facts have NULL keys | `relationships` ignores NULLs | Add `not_null` to every foreign key | 27 |
| 9 | Orders silently missing from a mart | Inner join to a dimension | Left join + unknown member; reconciliation test | 19, ex. 5 |
| 10 | `accepted_values` fails after a source change | A new legitimate value, or bad data | Decide rule vs data; store failures to see rows | 29, 31 |
| 11 | Times or dates off by hours; orders on the wrong day | Offsets ignored or session time zone used | Parse as TIMESTAMPTZ, convert to UTC in staging | 12 |
| 12 | Dashboards showed bad data before the test failed | `dbt run` then `dbt test` | `dbt build` in production | 30 |
| 13 | Deprecation warning: “Arguments to generic tests should be nested under the arguments property” | Pre-1.10 test syntax (`values:` directly under the test) | Move parameters under `arguments:` | 27 |
| 14 | “Could not set lock on file … leafy.duckdb” | Another process (a notebook, a SQL client) holds the DuckDB file open for writing | Close it, or open it `read_only=True` | 6 |
| 15 | “Could not find profile named …” | Profile name mismatch, or dbt run from another folder | `dbt debug`; run from the project folder or set `DBT_PROFILES_DIR` | 9 |

> **On the job:** Many dbt bugs leave every test green: a filter in the wrong layer, a join that drops rows, a hard-coded name that works in dev. Reconciliation tests, unknown-member counts, and reading compiled SQL catch them. Mention all three when you describe how you keep a pipeline trustworthy.

> **The main idea:** most dbt problems are about dependencies (ref), naming (schemas, paths), grain (joins, dedupe), and rules that drift from reality (tests). Each has a cheap, standard fix.

---

<a id="slide-36"></a>
## 36. Interview questions you should now be able to answer

*Practice · short answers, then say them in your own words added*

**Q: What does dbt do, and what doesn’t it do?**  
It is the T in ELT: it compiles templated SELECT statements to SQL, runs them on the warehouse in dependency order, tests the results and documents them. It does not extract or load data, does not store data itself, and (Core) does not schedule runs.

**Q: Why use `ref()` instead of a table name?**  
Build order from the DAG, environment-specific names (dev vs prod schemas), graph selection (`+model`), and lineage in docs and manifest.json. A hard-coded name breaks all four silently.

**Q: Source vs seed vs model?**  
A source is a raw table loaded by another tool and declared in YAML; a seed is a small CSV in the repository loaded by `dbt seed`; a model is a SELECT that dbt builds.

**Q: View, table, ephemeral, incremental: how do you choose?**  
Views for light staging logic (cheap to build, cost on every query); tables for marts people query; ephemeral for small reusable steps you don’t need as objects; incremental when a table is too large to rebuild every run.

**Q: What are the four built-in generic tests, and what do you test first?**  
`unique`, `not_null`, `accepted_values`, `relationships`. First: the grain (unique + not_null on keys), then fact-to-dimension relationships plus not_null, then columns that drive logic.

**Q: What happens in `dbt build` when a test fails?**  
Nodes downstream of the tested model are skipped; already-built objects keep their previous data; the run exits with code 1. With `severity: warn` the run continues and the warning is recorded.

**Q: How would you handle a fact row whose customer isn’t in the dimension yet?**  
Keep the row: left join, map to an unknown (or inferred) member key, monitor the count of unknown keys with a test, and re-process once the dimension catches up.

**Q: Explain `dbt build --select state:modified+`.**  
Compare the project with a saved manifest (usually production’s), select changed nodes and everything downstream, and build only those, often with `--defer` so unchanged parents are read from production. This is slim CI.

**Q: Where do you look when a model fails?**  
The error message, then `target/compiled/…` (the SELECT) or `target/run/…` (the DDL); run that SQL directly in the warehouse. For test failures, run the compiled test SQL or use `--store-failures`.

> **On the job:** Interviewers usually go one level deeper than the first answer: “and how would you test that?”, “what if the table were 10 TB?”, “how would CI catch it?”. Practise by adding one follow-up to each answer above.

> **The main idea:** if you can explain ref, layers, materializations, tests, build behaviour, unknown members and slim CI with an example from this project, you are ready for most dbt foundation questions.

---

<a id="slide-37"></a>
## 37. Exercises 1–3: tests, selectors, materializations

*Exercises · warm-up*

Work in the project folder from the lessons (or a fresh copy of `dbt-fundamentals-project/` after `python scripts/load_raw.py` and `dbt build`). Each solution below was applied to a scratch copy of the project and run during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Test the grain and the categories of stg_products

Add tests to `stg_products` in `models/staging/_staging.yml`: `product_id` must be unique and not null; `category` must be not null and one of `Plants`, `Accessories`, `Plant care`. Run only the tests on that model. How many tests run?

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Write selectors, check them with dbt ls

Write a selector for each, and check it with `dbt ls … --resource-type model`: (a) every model affected if the `products` seed changes; (b) only the direct parents of `fct_daily_funnel`, plus the model itself; (c) every mart model except the two facts.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Override a materialization in one model

Make `dim_product` a view without touching `dbt_project.yml`. Rebuild only that model and prove, from `information_schema`, that it is now a view while the other dimensions are still tables.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

---

<a id="slide-38"></a>
## 38. Exercises 4–5: debugging tests and reconciliation

*Exercises · read failures, then prevent them*

Work in the project folder from the lessons (or a fresh copy of `dbt-fundamentals-project/` after `python scripts/load_raw.py` and `dbt build`). Each solution below was applied to a scratch copy of the project and run during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 4 · Debug failing relationships and not_null tests

A teammate “simplified” `fct_orders`: since keys are hashes, why join at all? They replaced the customer lookup with one line. Predict which tests fail and for which orders, run `dbt build --select fct_orders` to check, and fix it.

```diff
# models/marts/fct_orders.sql (changed line)
-    coalesce(customers.customer_key, md5('-1'))                     as customer_key,
+    md5(purchases.customer_id)                                      as customer_key,
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · A reconciliation test that catches silent row loss

Write a singular test `tests/assert_orders_reconcile_to_staging.sql` that fails when the number of orders or the total amount in `fct_orders` differs from the valid purchases in `stg_events`. Then prove it is useful: change the customer `left join` in `fct_orders` to an inner `join` and run `dbt build --select fct_orders`. Which per-column tests notice? Which orders vanished?

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

---

<a id="slide-39"></a>
## 39. Exercises 6–8: new data, hidden dependencies, materializations

*Exercises · think like a reviewer*

Work in the project folder from the lessons (or a fresh copy of `dbt-fundamentals-project/` after `python scripts/load_raw.py` and `dbt build`). Each solution below was applied to a scratch copy of the project and run during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 6 · A new day of data arrives

A fourth file arrives. Before running anything, predict: how many rows will `fct_orders` have and what total? Where does e14 (product P5, not in the catalogue) end up? Does any test fail? Then add the file, reload raw data and run `dbt build`.

```json
# data/raw/events_2026-03-05.jsonl
{"event_id":"e14","user_id":"u3","event_type":"purchase","ts":"2026-03-05T08:00:00Z","amount":"30.00","product_id":"P5"}
{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00","product_id":"P1"}
```

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · Works on my laptop: the hard-coded table name

This report model works on your laptop, where the marts already exist. Explain why it fails in CI, which builds into an empty database; prove it with `dbt ls` and a fresh build; then fix it.

```sql
# models/marts/rpt_revenue_by_city.sql
-- rpt_revenue_by_city: revenue per customer city.
select c.city, sum(f.amount) as revenue
from main_marts.fct_orders as f
join main_marts.dim_customer as c using (customer_key)
group by 1
```

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · From ephemeral to view: where does it land?

Change `int_purchases` from ephemeral to a view with a `config()` line, then run it and `fct_orders`. Before running, predict: in which **schema** will the view be created, and how will the compiled `fct_orders` change?

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

---

<a id="slide-40"></a>
## 40. Cheat sheet

*Reference · the deck on one page*

#### Commands

| Need | Run |
|---|---|
| check setup | `dbt debug` |
| load CSV seeds | `dbt seed` |
| build models | `dbt run --select …` |
| run data tests | `dbt test --select …` |
| everything, safely | `dbt build` (tests between nodes; skips children of failures) |
| see the SQL | `dbt compile --select m` → `target/compiled/` |
| preview rows | `dbt show --select m` / `--inline "select …"` |
| what would run? | `dbt ls --select …` |
| keep failing rows | `dbt test --store-failures` |
| override a variable | `--vars '{key: value}'` |
| docs | `dbt docs generate`, then `dbt docs serve` |
| start again | `dbt clean`, then `dbt build` |

#### Selectors

| Write | Means |
|---|---|
| `m` | just m |
| `m+` / `+m` | m and descendants / ancestors |
| `1+m` | m and direct parents |
| `@m` | descendants of m and all their ancestors |
| `tag:mart` | by tag |
| `path:models/staging` | by folder |
| `resource_type:test` | by type |
| `a b` | a OR b |
| `a,b` | a AND b |
| `--exclude x` | minus x |
| `state:modified+` | changed + children (CI) |

#### Jinja in models

| Need | Write |
|---|---|
| another model or seed | `{{ ref("stg_events") }}` |
| a raw table | `{{ source("shop_raw", "events") }}` |
| per-model config | `{{ config(materialized="view", tags=["x"]) }}` |
| variable with default | `{{ var("name", "default") }}` |
| secret / setting | `{{ env_var("NAME", "default") }}` |
| comment | `{# not sent to the database #}` |

#### Tests and layout

| Need | Write |
|---|---|
| grain | `data_tests: [unique, not_null]` on the key |
| allowed values | `accepted_values: {arguments: {values: [...]}}` |
| foreign key | `relationships: {arguments: {to: ref('dim'), field: key}}` + `not_null` |
| custom rule | SELECT of bad rows in `tests/*.sql` |
| known, accepted issue | `{{ config(severity="warn") }}` |
| layers | sources → `stg_` (views) → `int_` (ephemeral) → `fct_`/`dim_` (tables) |
| staging does | rename, cast, clean, UTC, dedupe; no joins |
| marts do | declared grain, surrogate keys, unknown members, left joins |
| schemas | custom `marts` → `<target>_marts` |

> **The main idea:** ref and source for every dependency, layers with clear jobs, tests on every grain and key, `dbt build` with selectors, and compiled SQL whenever something is unclear.

---

<a id="slide-41"></a>
## 41. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| ETL / ELT | Transform before loading / load raw data first, then transform inside the warehouse |
| Data engineering | Building tested, documented transformations that turn raw data into trusted models |
| dbt Core / dbt platform | The open-source CLI / the hosted product (formerly dbt Cloud) with scheduler and IDE |
| Adapter | Plug-in that lets dbt connect to and generate SQL for one database (dbt-duckdb, dbt-fabric) |
| Project | A folder with dbt_project.yml, models, seeds, macros and tests |
| YAML / property file | Indented key: value text format / a .yml file describing resources (descriptions, tests) |
| Profile / target | Connection settings outside the project / one named connection (dev, ci, prod) |
| Threads | How many nodes dbt builds in parallel |
| Config | A setting that changes how a resource is built (materialized, schema, tags, severity) |
| Custom schema | A schema set with +schema; by default named <target schema>_<custom> |
| Model | One .sql file with one SELECT; dbt creates the object |
| Materialization | How a model is built: view, table, ephemeral, incremental |
| Ephemeral model | A model inlined as a CTE (__dbt__cte__name) into the models that use it |
| Incremental model | A table that processes only new or changed rows after the first run |
| Seed | Small CSV in the repository loaded as a table by dbt seed |
| Source | A raw table loaded by another tool and declared in YAML; referenced with source() |
| Source freshness | A check that the newest row of a source is recent enough |
| Bronze / silver / gold | Medallion layers ≈ sources / staging (+ intermediate) / marts |
| Staging / intermediate / marts | Clean one source / reusable logic / business-facing facts and dimensions |
| CTE / import CTE | A named subquery in WITH / a CTE at the top that selects from one ref or source |
| QUALIFY | Filter on a window-function result (used for dedupe) |
| ref() | Reference to a dbt resource; resolves its name and adds a DAG edge |
| DAG | Directed acyclic graph of dependencies between nodes |
| Node | Anything in the DAG: model, seed, source, test, snapshot |
| Template / compile | SQL with Jinja / render it to plain SQL (target/compiled) |
| DDL | SQL that creates or changes objects (CREATE, ALTER, DROP); in target/run |
| Jinja | The template language in dbt: {{ expression }}, {% statement %}, {# comment #} |
| Variable (var) | A project setting read in models; overridable with --vars |
| Grain | What one row of a table means |
| Surrogate key / hashed key | A warehouse key for a dimension row / one computed as a hash of the natural key |
| Natural key | The identifier from the source system (customer_id) |
| Unknown member | A dimension row (key -1) that facts use when the real member is missing |
| Late-arriving dimension | A fact that arrives before its dimension member exists |
| Degenerate dimension | An identifier kept on the fact with no dimension table (order_id) |
| Conformed dimension | One dimension shared, with the same keys, by several facts |
| Periodic snapshot fact | A fact with one row per period (per day) |
| Fan-out | A join that multiplies rows and inflates totals |
| Data test | A query returning rows that break a rule; zero rows = pass |
| Generic / singular test | Reusable parameterised test attached in YAML / one-off SELECT in tests/ |
| Severity | Whether a failing test errors (stops) or warns (continues) |
| Store failures | Saving failing rows of a test in a table for investigation |
| Reconciliation test | Compares counts or totals between layers or with the source |
| Unit test | Tests a model’s logic on hand-made input rows (dbt 1.8+) |
| Selector / graph operator / set operator | Picks nodes / + and @ walk the DAG / space = OR, comma = AND |
| Skip | A node not run because something it depends on failed |
| Exit code | 0 success, 1 failures, 2 dbt error; read by schedulers and CI |
| manifest.json / catalog.json | The project as JSON (nodes, parent_map, child_map) / column metadata read from the database |
| Doc block | Named Markdown in a .md file, used with {{ doc("name") }} |
| Lineage | Where each table’s data comes from, as edges between nodes |
| Snapshot (dbt) | Records changes of a mutable source as SCD type 2 rows |
| Package | A reusable dbt project installed with dbt deps (dbt_utils) |
| Slim CI / defer | Build only state:modified+ in CI / read unchanged parents from production |
| Idempotent | Running twice gives the same result as running once |

---

<a id="slide-42"></a>
## 42. What to remember, and what comes next

*Reference · recap*

1. **dbt is the T in ELT.** It compiles templated SELECTs, runs them in DAG order on the warehouse, tests and documents them. Loading and scheduling are elsewhere.
2. **The project is code.** `dbt_project.yml` sets folder defaults; `profiles.yml` holds targets outside the code; secrets via `env_var`.
3. **Every dependency goes through `source()` or `ref()`.** That gives order, environment-safe names, selection and lineage.
4. **Layers have jobs.** Staging cleans one source (cast, UTC, dedupe); intermediate holds reusable logic; marts are facts and conformed dimensions at a declared grain, with unknown members.
5. **Materialization is a choice per layer.** Views for staging, ephemeral for small steps, tables for marts; incremental later.
6. **Models are templates.** `ref`, `source`, `var` and `config` are Jinja; dbt compiles them to plain SQL, so read the compiled SQL whenever in doubt.
7. **Tests encode expectations.** unique + not_null on every grain, relationships + not_null on keys, accepted_values on logic columns, singular tests for reconciliations; choose severity on purpose.
8. **Build, select, document.** `dbt build` stops bad data; selectors keep work focused; docs and `manifest.json` give lineage for free.

#### Practise this week

- Rebuild the project from an empty folder from memory, checking against `dbt-fundamentals-project/`.
- Do exercises 4, 5 and 7 again without hints.
- Add a second source (for example a refunds table) with its own staging model, tests and a fact.
- Explain the lineage diagram out loud, layer by layer, in two minutes.

#### Coming up

Deck 2, *dbt Jinja and macros*, starts from this project: Jinja expressions and statements, a loop that rebuilds `fct_daily_funnel` from a variable, a macro for the UTC conversion, then a preview of incremental models, snapshots, unit tests, packages and contracts. Later lessons cover deployment, slim CI and the same project on a cloud warehouse such as Fabric Data Warehouse.

> **The main idea:** ref and source for dependencies, layers with clear jobs, tests at every grain and key, `dbt build` with selectors, and docs from the same files: that is a trustworthy dbt project.

*Read more:* [What is dbt?](https://docs.getdbt.com/docs/introduction), [How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview).

---

<a id="slide-43"></a>
## 43. References and how this deck was tested

*References · official documentation*

- [What is dbt?](https://docs.getdbt.com/docs/introduction), [install with pip](https://docs.getdbt.com/docs/local/install-dbt), [DuckDB setup](https://docs.getdbt.com/docs/local/connect-data-platform/duckdb-setup), [dbt-duckdb](https://github.com/duckdb/dbt-duckdb), [supported platforms](https://docs.getdbt.com/docs/supported-data-platforms).
- [dbt_project.yml](https://docs.getdbt.com/reference/dbt_project.yml), [profiles.yml](https://docs.getdbt.com/docs/local/profiles.yml), [env_var](https://docs.getdbt.com/reference/dbt-jinja-functions/env_var), [custom schemas](https://docs.getdbt.com/docs/build/custom-schemas), [configs and properties](https://docs.getdbt.com/reference/configs-and-properties).
- [seeds](https://docs.getdbt.com/docs/build/seeds), [sources](https://docs.getdbt.com/docs/build/sources), [ref](https://docs.getdbt.com/reference/dbt-jinja-functions/ref), [SQL models](https://docs.getdbt.com/docs/build/sql-models), [how we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview).
- [materializations](https://docs.getdbt.com/docs/build/materializations), [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [Jinja template docs](https://jinja.palletsprojects.com/en/stable/templates/), [project variables](https://docs.getdbt.com/docs/build/project-variables).
- [commands](https://docs.getdbt.com/reference/dbt-commands), [dbt build](https://docs.getdbt.com/reference/commands/build), [dbt show](https://docs.getdbt.com/reference/commands/show), [node selection](https://docs.getdbt.com/reference/node-selection/syntax), [graph operators](https://docs.getdbt.com/reference/node-selection/graph-operators), [selector methods](https://docs.getdbt.com/reference/node-selection/methods).
- [data tests](https://docs.getdbt.com/docs/build/data-tests), [severity](https://docs.getdbt.com/reference/resource-configs/severity), [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures), [unit tests](https://docs.getdbt.com/docs/build/unit-tests).
- [documentation](https://docs.getdbt.com/docs/build/documentation), [dbt docs](https://docs.getdbt.com/reference/commands/cmd-docs), [manifest.json](https://docs.getdbt.com/reference/artifacts/manifest-json), [catalog.json](https://docs.getdbt.com/reference/artifacts/catalog-json).
- [incremental models](https://docs.getdbt.com/docs/build/incremental-models) (concept), [state selection](https://docs.getdbt.com/reference/node-selection/state-selection).
- [DuckDB QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [TIMESTAMPTZ functions](https://duckdb.org/docs/stable/sql/functions/timestamptz), [loading JSON](https://duckdb.org/docs/stable/data/json/loading_json), [information_schema](https://duckdb.org/docs/stable/sql/meta/information_schema).
- [dbt with Fabric Data Warehouse](https://docs.getdbt.com/docs/local/connect-data-platform/fabric-setup), [Fabric dbt tutorial](https://learn.microsoft.com/en-us/fabric/data-warehouse/tutorial-setup-dbt), [Kimball techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/).

**Testing:** built with dbt-core 1.12.5, dbt-duckdb 1.11.0 and DuckDB 1.5.6 on CPython 3.12.10 (Windows 11). The project was created file by file in a scratch folder in the order of the lessons, and every `dbt` command and Python block ran there; exercises ran in separate copies. The final project was exported to `dbt-fundamentals-project/` and rebuilt from an empty folder (lesson 34). Output normalisation: leading clock times removed, durations replaced by `x.xx`, absolute paths replaced by placeholders, some long outputs trimmed (labelled). With 4 threads, the order of lines in run output can differ between runs. Telemetry was disabled with `send_anonymous_usage_stats: false`.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Test the grain and the categories of stg_products

Copy the column/test layout from `stg_events`. `accepted_values` needs its list under `arguments: values:`. A model name in `--select` picks the model’s tests too when the command is `dbt test`.

<a id="hint-2"></a>
### Hint 2 · Write selectors, check them with dbt ls

(a) descendants: `name+`. (b) one generation up: `1+name`. (c) select by tag, then `--exclude` takes several names separated by spaces.

<a id="hint-3"></a>
### Hint 3 · Override a materialization in one model

A `{{ config(…) }}` call at the top of the model file beats the folder default. Then `dbt run --select dim_product`.

<a id="hint-4"></a>
### Hint 4 · Debug failing relationships and not_null tests

Which orders have a customer that is missing (NULL) or not in `dim_customer`? What is `md5(NULL)`? Which test ignores NULLs?

<a id="hint-5"></a>
### Hint 5 · A reconciliation test that catches silent row loss

Two one-row CTEs (count and sum each side), a `cross join`, and a `where` that keeps the row only when they differ. Give the columns distinct names. dbt selects a test when any of its parents is selected.

<a id="hint-6"></a>
### Hint 6 · A new day of data arrives

The loader rebuilds `raw.events` from every file. e3 is another redelivery. u3 (Ana Ruiz) exists; P5 does not. 2026-03-05 is inside the `dim_date` range.

<a id="hint-7"></a>
### Hint 7 · Works on my laptop: the hard-coded table name

Ask dbt for the model’s ancestors with `+rpt_revenue_by_city`. What does dbt think this model depends on? When will it run in a fresh build?

<a id="hint-8"></a>
### Hint 8 · From ephemeral to view: where does it land?

Look at `dbt_project.yml`: does the `intermediate` folder set `+schema`? What is the target schema in `profiles.yml`/`dbt debug`?

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was applied to a scratch copy of the project and run with dbt during the build; the outputs shown are real (timestamps and durations normalised).

<a id="solution-1"></a>
### Solution 1 · Test the grain and the categories of stg_products

```yaml
# models/staging/_staging.yml (stg_products entry)
  - name: stg_products
    description: One row per product from the catalogue seed.
    columns:
      - name: product_id
        data_tests: [unique, not_null]
      - name: category
        data_tests:
          - not_null
          - accepted_values:
              arguments:
                values: ["Plants", "Accessories", "Plant care"]
```

Terminal (output trimmed):

```text
$ dbt test --select stg_products
2 of 4 PASS not_null_stg_products_category ..................................... [PASS in x.xxs]
1 of 4 PASS accepted_values_stg_products_category__Plants__Accessories__Plant_care  [PASS in x.xxs]
3 of 4 PASS not_null_stg_products_product_id ................................... [PASS in x.xxs]
4 of 4 PASS unique_stg_products_product_id ..................................... [PASS in x.xxs]
Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4
```

**Why it works.** Four generic tests attach to two columns; `dbt test --select stg_products` runs every test whose parent is `stg_products`. Values in `accepted_values` are case-sensitive: `plants` would fail.

<a id="solution-2"></a>
### Solution 2 · Write selectors, check them with dbt ls

Terminal (output trimmed):

```text
$ dbt ls --select products+ --resource-type model
leafy.marts.dim_product
leafy.marts.fct_orders
leafy.staging.stg_products
```

Terminal (output trimmed):

```text
$ dbt ls --select 1+fct_daily_funnel --resource-type model
leafy.marts.fct_daily_funnel
leafy.staging.stg_events
```

Terminal (output trimmed):

```text
$ dbt ls --select tag:mart --exclude fct_orders fct_daily_funnel --resource-type model
leafy.marts.dim_customer
leafy.marts.dim_date
leafy.marts.dim_product
```

**Why it works.** `+` after a name walks down the DAG to children; a number limits the depth; `--exclude` is applied after selection. Seeds are nodes too, so `products+` starts at the seed. In practice you would run `dbt build --select products+` after editing the CSV.

<a id="solution-3"></a>
### Solution 3 · Override a materialization in one model

```sql
# models/marts/dim_product.sql (first line added)
{{ config(materialized='view') }}
-- dim_product: one row per product, plus one unknown member.
…
```

Terminal (output trimmed):

```text
$ dbt run --select dim_product
1 of 1 OK created sql view model main_marts.dim_product ........................ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select table_name, table_type from information_schema.tables
                     where table_schema = 'main_marts' and table_name like 'dim_%' order by 1"""))
```

Output:

```text
┌──────────────┬────────────┐
│  table_name  │ table_type │
│   varchar    │  varchar   │
├──────────────┼────────────┤
│ dim_customer │ BASE TABLE │
│ dim_date     │ BASE TABLE │
│ dim_product  │ VIEW       │
└──────────────┴────────────┘
```

**Why it works.** Config precedence: model file > property file > `dbt_project.yml`. dbt sees an existing *table* called `dim_product`, drops it, and creates the view. The schema is still `main_marts` because the folder’s `+schema` still applies.

<a id="solution-4"></a>
### Solution 4 · Debug failing relationships and not_null tests

Terminal (output trimmed):

```text
$ dbt build --select fct_orders   # with the teammate’s change
3 of 10 FAIL 1 not_null_fct_orders_customer_key ................................ [FAIL 1 in x.xxs]
7 of 10 FAIL 1 relationships_fct_orders_customer_key__customer_key__ref_dim_customer_  [FAIL 1 in x.xxs]
Done. PASS=8 WARN=0 ERROR=2 SKIP=0 NO-OP=0 REUSED=0 TOTAL=10
[exit code 1]
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select f.order_id, f.customer_key is null as key_is_null
                     from main_marts.fct_orders f
                     left join main_marts.dim_customer c using (customer_key)
                     where c.customer_key is null order by 1"""))
```

Output:

```text
┌──────────┬─────────────┐
│ order_id │ key_is_null │
│ varchar  │   boolean   │
├──────────┼─────────────┤
│ e13      │ false       │
│ e6       │ true        │
└──────────┴─────────────┘
```

Terminal (output trimmed):

```text
$ dbt build --select fct_orders   # after restoring the lookup
Done. PASS=10 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=10
```

**Why it fails.** e6 has no user: `md5(NULL)` is NULL, so `not_null` fails (and `relationships` ignores it). e13’s user u6 is not in the CRM: its hash exists nowhere in `dim_customer`, so `relationships` fails. The hash alone is not enough; the lookup decides *whether* the member exists and maps misses to the unknown member. `dbt build --select fct_orders` builds the model and runs its 9 tests, which is why the fixed run shows `PASS=10`.

<a id="solution-5"></a>
### Solution 5 · A reconciliation test that catches silent row loss

```sql
# tests/assert_orders_reconcile_to_staging.sql
-- Reconciliation: fct_orders must hold exactly the valid purchases from staging.
with mart as (
    select count(*) as n, sum(amount) as total
    from {{ ref('fct_orders') }}
),
staging as (
    select count(*) as n, sum(amount) as total
    from {{ ref('stg_events') }}
    where event_type = 'purchase' and amount is not null
)
select
    mart.n as mart_orders, staging.n as staging_orders,
    mart.total as mart_total, staging.total as staging_total
from mart cross join staging
where mart.n <> staging.n or mart.total <> staging.total
```

Terminal (output trimmed):

```text
$ dbt test --select assert_orders_reconcile_to_staging
1 of 1 PASS assert_orders_reconcile_to_staging ................................. [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt build --select fct_orders   # after changing left join to join
2 of 11 FAIL 1 assert_orders_reconcile_to_staging .............................. [FAIL 1 in x.xxs]
Done. PASS=10 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=11
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt show --inline "select order_id from {{ ref('fct_orders') }} order by order_id"
Previewing inline node:
| order_id |
| -------- |
| e10      |
| e12      |
| e3       |
| e5       |
| e8       |
```

**Why it works.** The inner join drops e6 and e13 (no matching customer). Every remaining row is still unique, not null and has valid relationships, so the nine generic tests pass; only the reconciliation sees that 2 orders and 27.99 are missing. Reconciliation tests are the safety net for joins and filters.

<a id="solution-6"></a>
### Solution 6 · A new day of data arrives

```json
# data/raw/events_2026-03-05.jsonl
{"event_id":"e14","user_id":"u3","event_type":"purchase","ts":"2026-03-05T08:00:00Z","amount":"30.00","product_id":"P5"}
{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00","product_id":"P1"}
```

Terminal:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
events_2026-03-05.jsonl: 2 rows
total: 17
```

Terminal (output trimmed):

```text
$ dbt build
Done. PASS=41 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=42
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("select count(*) as orders, sum(amount) as revenue from main_marts.fct_orders"))
    print(con.sql("""select f.order_id, c.customer_name, p.product_name, f.amount
                     from main_marts.fct_orders f
                     join main_marts.dim_customer c using (customer_key)
                     join main_marts.dim_product p using (product_key)
                     where p.product_id = '-1' or c.customer_id = '-1' order by 1"""))
```

Output:

```text
┌────────┬───────────────┐
│ orders │    revenue    │
│ int64  │ decimal(38,2) │
├────────┼───────────────┤
│      8 │        205.99 │
└────────┴───────────────┘

┌──────────┬──────────────────┬─────────────────┬───────────────┐
│ order_id │  customer_name   │  product_name   │    amount     │
│ varchar  │     varchar      │     varchar     │ decimal(10,2) │
├──────────┼──────────────────┼─────────────────┼───────────────┤
│ e13      │ Unknown customer │ Fertilizer      │          9.99 │
│ e14      │ Ana Ruiz         │ Unknown product │         30.00 │
│ e6       │ Unknown customer │ Ceramic Pot     │         18.00 │
└──────────┴──────────────────┴─────────────────┴───────────────┘
```

**Why it works.** Staging dedupes the third e3, so only e14 is new: 8 orders, 175.99 + 30.00 = 205.99. P5 maps to the unknown product, so `relationships` passes and the order is kept; the second query is the monitoring query you would schedule to find unknown members. If the date had been outside the `dim_date` range, the `relationships` test on `date_key` would have failed: a good reason for a generous date range.

<a id="solution-7"></a>
### Solution 7 · Works on my laptop: the hard-coded table name

Terminal (output trimmed):

```text
$ dbt ls --select +rpt_revenue_by_city --resource-type model
Unable to do partial parsing because saved manifest not found. Starting full parse.
leafy.marts.rpt_revenue_by_city
```

Terminal (a fresh database, as in CI):

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal (output trimmed):

```text
$ dbt build
2 of 43 ERROR creating sql table model main_marts.rpt_revenue_by_city .......... [ERROR in x.xxs]
  Catalog Error: Table with name fct_orders does not exist!
Done. PASS=41 WARN=1 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=43
[exit code 1]
```

The fix: replace the two names with `ref()`.

```sql
# models/marts/rpt_revenue_by_city.sql (fixed)
-- rpt_revenue_by_city: revenue per customer city.
select c.city, sum(f.amount) as revenue
from {{ ref('fct_orders') }} as f
join {{ ref('dim_customer') }} as c using (customer_key)
group by 1
```

Terminal (output trimmed):

```text
$ dbt ls --select +rpt_revenue_by_city --resource-type model
Unable to do partial parsing because saved manifest not found. Starting full parse.
leafy.marts.dim_customer
leafy.marts.dim_product
leafy.marts.fct_orders
leafy.intermediate.int_purchases
leafy.marts.rpt_revenue_by_city
leafy.staging.stg_customers
leafy.staging.stg_events
leafy.staging.stg_products
```

Terminal (a fresh database again):

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal (output trimmed):

```text
$ dbt build
43 of 43 START sql table model main_marts.rpt_revenue_by_city .................. [RUN]
43 of 43 OK created sql table model main_marts.rpt_revenue_by_city ............. [OK in x.xxs]
Done. PASS=42 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=43
```

Terminal (output trimmed):

```text
$ dbt show --inline "select * from {{ ref('rpt_revenue_by_city') }} order by city"
Previewing inline node:
| city    | revenue |
| ------- | ------- |
| Austin  |   71.50 |
| Denver  |   76.50 |
| Unknown |   27.99 |
```

**Why it fails.** Without `ref()` the model has no parents, so dbt runs it in the first wave, before `fct_orders` exists. On your laptop yesterday’s tables hid the bug (and it would read *dev* tables even when deploying to prod). With `ref()` the model gets its ancestors, runs last, and is correct in every environment. Revenue per city: Austin 71.50, Denver 76.50, Unknown 27.99; together 175.99, matching the fact.

<a id="solution-8"></a>
### Solution 8 · From ephemeral to view: where does it land?

Terminal (output trimmed):

```text
$ dbt run --select int_purchases fct_orders
1 of 2 OK created sql view model main.int_purchases ............................ [OK in x.xxs]
2 of 2 OK created sql table model main_marts.fct_orders ........................ [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal (lines mentioning int_purchases):

```text
$ dbt compile --select fct_orders
    select * from "leafy"."main"."int_purchases"
```

**Why it works.** The `intermediate` folder sets a materialization but no custom schema, so the view goes to the target schema, `main`. The compiled fact no longer contains the `__dbt__cte__int_purchases` CTE; it selects from the view instead. If you want it in its own schema, add `+schema: intermediate` (giving `main_intermediate`). Making an ephemeral model a view temporarily is also the standard way to debug it.
