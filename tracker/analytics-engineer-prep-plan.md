# Analytics Engineer Prep Plan (v4: ordered prerequisites and staged portfolio releases)

Self-paced and built around stage gates. Move on when you meet a phase's exit criteria, not when a date passes.

**Target role:** Analytics Engineer first, with the skills to move into Data Engineering later.
**Approach:** Learn skills that carry across platforms first. Platforms are a thin layer on top.
**Your edge:**
- Software engineering discipline: Git, CI/CD, infrastructure-as-code.
- Production data work: ~100-table Dataverse data model, Data Factory incremental syncs, a GDPR pipeline handling millions of records a day.
- Power BI with row-level security; Kusto (KQL).
- Privacy, security and Responsible AI reviews.
- **Hands-on AI agent work.** In 2026 this is a real differentiator for analytics engineers (see section 14).

---

## 0. What the research changed (why v3 adds more)

| Finding (2026) | Source | What it means for the plan |
|---|---|---|
| Analytics engineering shifted from "write models" to **system design, governance ownership and providing context for AI**. AI now writes much of the boilerplate SQL and dbt code. | dbt Labs blog, Jun 2026 | New sections on governance/quality (12) and AI-ready analytics engineering (14). Business judgment and precise definitions matter more than SQL speed. |
| 72% of analytics engineers use AI-assisted coding; **data quality is still the #1 challenge**; 71% fear wrong or hallucinated AI outputs reaching stakeholders; warehouse costs are growing faster than budgets | dbt *2026 State of Analytics Engineering* | Data quality, observability and cost (FinOps) become real modules, not footnotes |
| **Fivetran and dbt Labs merged** (completed June 2026). **dbt Core v2.0 with the Rust-based Fusion engine** was released as open source (alpha). | dbt Labs / press | Learn dbt concepts (stable). Try Fusion, but expect most employers to still run dbt Core 1.x or dbt Cloud. |
| **MetricFlow is open source (Apache 2.0)**. The **Open Semantic Interchange standard became Apache Ossie (incubating)**, a shared spec for metrics and semantic models backed by Snowflake, dbt, Databricks and others. | dbt Labs, Snowflake, ASF | The semantic layer is now a core analytics engineering skill and is what AI agents query |
| Analytics engineer postings: **dbt is nearly universal; Snowflake is the top warehouse**, then BigQuery and Databricks. BI tools: Power BI ≈ Tableau > Looker (LookML growing). Experimentation, stakeholder and data-contract skills appear increasingly. | Analytics engineering job boards and guides | Add Snowflake familiarity, LookML awareness, statistics/A/B testing and business metrics |
| **Apache Iceberg** is becoming the vendor-neutral table format (works across Spark, Snowflake, BigQuery, Trino, DuckDB). Delta remains standard on Databricks. | Industry comparisons | Learn Delta deeply; learn Iceberg basics |
| Analytics engineer interviews now regularly include **metric definition, product sense ("DAU dropped 15%, why?") and dbt take-homes** | PracHub, Interview Query, KORE1, DataDriven guides | New business and statistics section (13) and expanded interview prep (20) |

---

## 1. Skill map: what to learn and how deep

| Tier | Skills | Analytics engineer depth | Data engineer depth |
|---|---|---|---|
| **Core** | Advanced SQL · data modeling · dbt · performance | Deep | Deep |
| **Bridge** | Python for data · Spark/Databricks · Airflow · data architecture | Working knowledge | Deep |
| **Differentiators** | **Data quality, contracts and observability** · **metrics, statistics and business sense** · **AI-ready analytics engineering** (semantic layer, MCP, evaluation) · communication | Deep (these get you hired) | Medium |
| **Platform familiarity** | Snowflake · BigQuery · Iceberg · cloud basics + IAM + Terraform · ingestion tools/CDC · LookML/Tableau awareness | Working knowledge | Medium–Deep |
| **Awareness only** | Streaming (Kafka, Flink) · SQLMesh · Data Vault · data mesh · Fabric (you have the background already) | Can explain them in an interview | Medium |
| **Skip** | See section 21 | — | — |

### Effort (rough)
- **Analytics engineer, ready to apply:** ~280–350 h. About 7–9 months at 10 h/week.
- **Analytics + data engineer:** ~380–480 h.
- **You don't need to finish everything before applying.** See the "ready to apply" checkpoint in section 3. Prepare career assets and basic interview practice alongside the first release; start applying after the SQL depth, performance & quality checkpoint with portfolio v1. Continue later extensions while interviewing.

---

## 2. Lanes and weekly rhythm

| Lane | What | Session type | Share |
|---|---|---|---|
| **A. Practice** | SQL; from Phase 2, also Python; from Phase 3, also metric/product cases | 30–45 min, 3–5× per week | ~30% |
| **B. Theory** (rotates by phase) | Modeling + metrics → performance + quality + statistics → architecture + AI context | 45–60 min, 2× per week | ~25% |
| **C. Build** | One portfolio project; each new skill adds a layer to it | 2–4 h block, 1–2× per week | ~40% |
| **D. On the job + community** | Data work in your current role; dbt Slack; meetups; writing | Opportunistic | ~5%+ |

### How the lanes connect
1. **Theory becomes the build target** that same week (e.g. SCD2 → `dbt snapshot`; contracts → a breaking change caught in CI). Finish prerequisites before signing off a deliverable; the tracker lists them under **Learn first** in each lesson and **Knowledge needed** in each portfolio stage.
2. **Modeling exercises include metrics.** Every weekly domain exercise produces a star schema, **plus 3 metric definitions written in MetricFlow YAML**, plus SQL answers. That covers modeling, the semantic layer and SQL in one session.
3. **Solve each problem three ways:** SQL → pandas/Polars → PySpark.
4. **AI rule:** do practice reps **without AI**, since interviews are usually AI-free. Then use Copilot to review your solution. In the build lane, **use AI freely, but review every line.** That's a 2026 job skill in itself.
5. **Learning log** (`LEARNING_LOG.md`): one entry per concept. It becomes your revision sheet.
6. **Write once per phase:** a short public write-up (blog or LinkedIn) of what you built. It's networking that compounds.

### A typical week (~10 h)
| Session | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Practice ×4–5 | SQL + introductory interview practice (IV0) | 3 SQL + 2 Python; keep explaining solutions aloud | 2 SQL + 1 Python + 1 metric case | Advanced timed mixed + mock interviews |
| Theory ×2 | Modeling + metrics basics | Performance + quality + statistics | Architecture + AI context + platforms | Review + design cases |
| Build ×1–2 | dbt + bounded ingestion + Python tests | Tested DuckDB/dbt portfolio v1 + dashboard; local Spark/Delta labs | Later lakehouse, Airflow, semantic layer, AI and portability releases | Polish + demo |

---

## 3. Roadmap: learn → build

The tracker's **Roadmap** page follows this order. Each row lists the lessons that unlock the next portfolio stage, career milestone or checkpoint. A lesson can be completed only after its "Learn first" lessons; a stage can be marked built only after its required lessons and earlier stages. Lessons that no stage needs are standalone practice (DataLemur, LeetCode, labs) and still appear on the roadmap.

### First release · Fuel Smart

One question, a bounded recipe sample, tested marts and one useful dashboard — your application evidence.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Your lab & the question:** Minimal lab, Requirements & stakeholders | Portfolio stage: **Frame the question & the sample** |
| ✓ | **Checkpoint · Lab ready** | All setup checks ticked |
| 2 | **Python for data & ingestion:** Python for data engineering, Ingestion engineering, Python quality & tooling | Portfolio stage: **Build the bounded ingester** |
| 3 | **Analytical SQL on recipes & reviews:** Window functions, Classic SQL patterns, Joins and grain, Semi-structured data | Portfolio stage: **Explore the sample & match ingredients** |
| 4 | **More SQL & DataFrames:** Advanced aggregation, Time-based analysis, DataFrames: pandas & Polars | Standalone: Interview practice |
| 5 | **Dimensional modeling & metrics:** Why dimensional modeling, Fact tables, Dimension tables, Business models & metrics, Metric design | Portfolio stage: **Design the analytical model** |
| 6 | **Interview foundations:** — | Career milestone: **Interview foundations: explain and practice** |
| ✓ | **Checkpoint · Core SQL, modeling & ingester** | Medium window problems in under 15 min; I can explain grain, the 3 fact types and SCDs; I can write a precise metric definition; Bounded ingester validates records, re-runs safely and passes tests in CI |
| 7 | **dbt, tests & contracts:** Query structure and style, Modern modeling adaptations, dbt fundamentals, Jinja, macros, packages, Incremental, snapshots, unit tests, Test strategy, Data contracts | Portfolio stage: **Build tested dbt marts** |
| 8 | **Writing & dashboards:** Writing, Storytelling & dashboards | Portfolio stage: **Ship dashboard v1 & README** |
| 9 | **SQL depth & performance:** Warehouse writes, How a query runs, Row-store indexing, Columnar warehouses | Standalone: Depth labs |
| 10 | **Spark & Delta (local labs):** Spark fundamentals, PySpark, Delta Lake + Iceberg basics, Pipeline patterns | Standalone: Local labs |
| 11 | **Statistics & optional experience:** Statistics essentials, Experience: telemetry star schema (work or personal) (optional) | Standalone: Statistics & experience practice |
| ✓ | **Checkpoint · SQL depth, performance & quality** | Hard SQL in 20–25 min; ≥3 performance experiments from the query-plan, indexing and columnar lessons written up; Delta MERGE working; Tests and contracts run in CI; I can explain p-values, CIs and power simply |
| 12 | **Career assets:** Personal brand & network | Career milestone: **Resume, LinkedIn & STAR stories** |
| ✓ | **Ready to apply** | SQL depth, performance & quality checkpoint passed; Portfolio v1 shipped: bounded dataset, tested dbt marts and dashboard; Resume and LinkedIn prepared; Basic SQL, Python and modeling interview practice done |

### Extension · Lakehouse

Full recipes and 3.7M+ Open Food Facts products in local bronze and silver Delta tables.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Storage architecture:** Storage architecture | Portfolio stage: **Local bronze → silver lakehouse** |

### Extension · Orchestration

Databricks, Airflow and Cosmos run the pipeline on a schedule.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Databricks & Airflow:** Databricks platform, Airflow core concepts, Airflow authoring, Airflow integrations, Airflow ops & alternatives, Reliability | Portfolio stage: **Orchestrate with Airflow** |

### Extension · Quality & observability

Freshness, reconciliation and an incident handled end to end.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Observability & incidents:** Observability, Incidents & trust | Portfolio stage: **Quality & observability** |
| 2 | **Experimentation:** Experimentation, Statistics in Python | Standalone: Experiment analysis practice |

### Extension · Performance & cost

Benchmarks and cost per model at larger volumes.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Distributed execution & cost:** Distributed execution, Materialization & cost (FinOps), Spark performance | Portfolio stage: **Performance & cost lab** |

### Extension · Semantic layer

Certified metrics feeding the dashboard.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Semantic modeling & AI context:** Semantic layer modeling, Requirements & bus matrix, dbt governance & scale, Semantic layer for AI, Documentation as context | Portfolio stage: **Semantic layer** |

### Extension · AI agent + evaluation

An evaluated agent over certified metrics.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Agents & evaluation:** Agents over data, Evaluating AI analytics, LLM functions in the warehouse, AI-assisted development | Portfolio stage: **AI agent + evaluation ⭐** |
| 2 | **Optional AI breadth:** Unstructured data for AI (optional), Experience: metrics exposed to an agent (work or personal) (optional) | Standalone: Optional practice |

### Extension · Portability & infrastructure

Terraform, least privilege and gold on Snowflake.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Cloud, Terraform & warehouses:** Cloud fundamentals & IAM, Terraform, Snowflake, BigQuery, dbt deployment & CI | Portfolio stage: **Portability & infrastructure** |
| 2 | **Optional platform breadth:** Ingestion tools & CDC (optional), BI breadth (optional), Streaming (awareness) (optional) | Standalone: Optional practice |

### Extension · Architecture docs

The architecture document and decision records for everything you shipped.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Platform modeling & governance:** Platform modeling & serving, Governance & security | Portfolio stage: **Architecture & decision records** |
| ✓ | **Checkpoint · Extensions built** | Lakehouse, orchestration, quality, performance & cost, semantic layer, AI and portability stages built; Architecture doc + ≥5 decision records + TESTING.md; AI evaluation report published |

### Extension · Polished story & demo

A short demo and public write-up of the shipped releases.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Trade-offs:** Trade-offs & organization | Portfolio stage: **Polished story & demo** |

### Interview-ready

Advanced timed practice, design and metric cases, then full mock loops.

| # | Learn | Unlocks |
|---|---|---|
| 1 | **Interview Python:** Interview-style Python | Career milestone: **Interview: timed SQL & Python** |
| 2 | **Design, metric & modeling cases:** System design interviews, Diagnosing metric changes, Interview: modeling, metrics & dbt cases | Standalone: Interview practice |
| 3 | **Mock loops:** — | Career milestone: **Mock loops & take-home** |
| 4 | **Optional certification:** Optional certification (optional) | Standalone: Optional certification |
| ✓ | **Checkpoint · Interview-ready** | 3 mock loops passed; Resume and LinkedIn rewritten; Applications going out via referrals |

> **Ready to apply:** pass the SQL depth, performance & quality checkpoint, ship the first release (bounded ingester, tested dbt marts and dashboard), prepare the resume and LinkedIn, and complete interview foundations. Start applying through referrals; continue extensions and advanced interviews alongside applications. Work-data access is not required.

### Portfolio stages

| Release | Stage | Needs lessons | After stages |
|---|---|---|---|
| First release · Fuel Smart | Frame the question & the sample | Minimal lab, Requirements & stakeholders | — |
| First release · Fuel Smart | Build the bounded ingester | Python for data engineering, Ingestion engineering, Python quality & tooling | Frame the question & the sample |
| First release · Fuel Smart | Explore the sample & match ingredients | Window functions, Classic SQL patterns, Joins and grain, Semi-structured data | Build the bounded ingester |
| First release · Fuel Smart | Design the analytical model | Why dimensional modeling, Fact tables, Dimension tables, Business models & metrics, Metric design | Explore the sample & match ingredients |
| First release · Fuel Smart | Build tested dbt marts | Query structure and style, Modern modeling adaptations, dbt fundamentals, Jinja, macros, packages, Incremental, snapshots, unit tests, Test strategy, Data contracts | Design the analytical model |
| First release · Fuel Smart | Ship dashboard v1 & README | Writing, Storytelling & dashboards | Build tested dbt marts |
| Extension · Lakehouse | Local bronze → silver lakehouse | PySpark, Delta Lake + Iceberg basics | Ship dashboard v1 & README |
| Extension · Orchestration | Orchestrate with Airflow | Airflow core concepts, Airflow authoring, Airflow integrations, Airflow ops & alternatives, Databricks platform | Local bronze → silver lakehouse |
| Extension · Quality & observability | Quality & observability | Test strategy, Data contracts, Observability, Incidents & trust, Airflow integrations | Ship dashboard v1 & README |
| Extension · Performance & cost | Performance & cost lab | How a query runs, Row-store indexing, Columnar warehouses, Distributed execution, Materialization & cost (FinOps), Delta Lake + Iceberg basics, Spark performance | Ship dashboard v1 & README |
| Extension · Semantic layer | Semantic layer | Semantic layer modeling, Metric design, Semantic layer for AI, Documentation as context | Ship dashboard v1 & README |
| Extension · AI agent + evaluation | AI agent + evaluation ⭐ | Agents over data, Evaluating AI analytics, LLM functions in the warehouse | Semantic layer |
| Extension · Portability & infrastructure | Portability & infrastructure | Cloud fundamentals & IAM, Terraform, Snowflake, dbt deployment & CI | Ship dashboard v1 & README |
| Extension · Architecture docs | Architecture & decision records | Pipeline patterns, Storage architecture, Platform modeling & serving, Reliability, Governance & security, Writing | Ship dashboard v1 & README, Local bronze → silver lakehouse, Orchestrate with Airflow, Quality & observability |
| Extension · Polished story & demo | Polished story & demo | Trade-offs & organization, Writing, Storytelling & dashboards | Architecture & decision records |

---

## 4. Lane A: Advanced SQL

| # | Topic | Key concepts |
|---|---|---|
| S1 | Window functions I | Ranking functions, `LAG`/`LEAD`, running totals, **frames (`ROWS` vs `RANGE`)**, `FIRST_VALUE`/`LAST_VALUE` gotchas |
| S2 | Classic patterns | Removing duplicates (`QUALIFY`), top-N per group, **gaps-and-islands**, sessionization, latest record per key |
| S3 | Aggregation | Conditional aggregation (`FILTER`), `GROUPING SETS`/`ROLLUP`/`CUBE`, pivot/unpivot, percentiles, approximate distinct counts |
| S4 | Joins and grain | Semi-/anti-joins, **fan-out traps** (joins that duplicate rows), range/"as-of" joins, self-joins, NULL semantics, `NOT IN` gotchas |
| S5 | Time | Date spines, calendar tables, time zones, period-over-period, **cohorts and retention**, funnels |
| S6 | Structure | CTEs, recursive CTEs, set operations, readable SQL (dbt style guide) |
| S7 | Semi-structured data | JSON, arrays, `UNNEST`/`LATERAL`/`EXPLODE` |
| S8 | Warehouse writes | `MERGE`, re-runnable loads, delete+insert, incremental patterns |

**Resources:**
- *SQL for Data Analysis* (Tanimura).
- *T-SQL Window Functions* (Ben-Gan).
- Select Star SQL; Mode SQL tutorial (advanced); modern-sql.com; PostgreSQL docs on window functions.

**Practice:**
- DataLemur (medium → hard), LeetCode SQL 50 → Advanced SQL 50, StrataScratch (analytics engineer / data engineer filter), pgexercises, Advent of SQL.
- 3 questions per week against your own star schema.
- Time-box: 15 min for medium, 25 for hard. If stuck, re-solve from scratch 48 hours later. Tag problems by pattern and practice your weakest one next.

---

## 5. Lane B: Indexes and performance

| # | Topic | Key concepts |
|---|---|---|
| P1 | How a query runs | Logical processing order, `EXPLAIN` / `EXPLAIN ANALYZE`, estimated vs actual rows |
| P2 | Row-store indexing | B-trees, composite-index order, covering indexes, **"sargability"** (whether a filter can use an index), selectivity, statistics, join algorithms |
| P3 | Columnar warehouses | Compression, **partition pruning**, clustering (Snowflake micro-partitions, Delta liquid clustering / Z-order, BigQuery clustering), predicate pushdown |
| P4 | Distributed execution | Shuffles, broadcast joins, **skew**, spilling, adaptive query execution (AQE), query profiles |
| P5 | Materialization and **cost (FinOps)** | View / table / incremental / materialized view; incremental strategies (append, merge, delete+insert, insert_overwrite, microbatch). **Cost per model**, warehouse sizing, auto-suspend, Databricks billing system tables, Snowflake resource monitors. |

**Resources:**
- Use The Index, Luke! / *SQL Performance Explained*.
- Brent Ozar, "How to Think Like the SQL Server Engine".
- Postgres "Using EXPLAIN" + explain.dalibo.com.
- *DDIA* chapter 3.
- Databricks, Snowflake and BigQuery performance docs.
- Optional: CMU 15-445.

**Practice: "performance lab"** (one page per experiment):
1. Postgres indexes: compare index variants, covering indexes, and breaking/fixing sargability.
2. Join algorithms.
3. Partitioned Parquet with DuckDB on TPC-H at scale factor 10.
4. Spark skew and broadcast joins (local Spark UI).
5. dbt full refresh vs incremental at 1 / 10 / 100 GB.
6. Small files vs `OPTIMIZE`.
7. **Cost experiment:** the same gold model as a view vs a table vs incremental. Measure the cost of each.

---

## 6. Lane B: Data modeling

| # | Topic | Key concepts |
|---|---|---|
| M1 | Why dimensional | OLTP vs OLAP; normalization vs denormalization; **Kimball 4-step process** (business process, grain, dimensions, facts) |
| M2 | Facts | **Transaction / periodic snapshot / accumulating snapshot**; factless facts; additive, semi-additive and non-additive measures |
| M3 | Dimensions | Conformed dimensions, SCD types 0–3, surrogate keys, junk/degenerate/role-playing dimensions, mini-dimensions, bridge tables, hierarchies |
| M4 | Modern adaptations | dbt layers; One Big Table vs star schema; medallion mapping; awareness of Data Vault and Activity Schema |
| M5 | Semantic layer | Entities, measures, dimensions and metrics in **MetricFlow**; Power BI semantic models; LookML concepts; avoiding double counting |
| M6 | Requirements | Bus matrix, BEAM (Corr), grain statements, pushing back on bad metrics |

**Resources:**
- *The Data Warehouse Toolkit* 3e (chapters 1–8).
- Kimball techniques page (free).
- dbt "How we structure our dbt projects".
- SQLBI.
- *Agile Data Warehouse Design* (Corr).
- Zach Wilson's DataExpert free bootcamp (modeling modules).
- *Analytics Engineering with SQL and dbt* (Machado & Russa, O'Reilly).

**Practice: weekly modeling exercise.** Produce a bus matrix, grain statements, an ERD in dbdiagram.io, **3 metric definitions in MetricFlow YAML** and 3–5 SQL answers.

Domains to rotate through: e-commerce, ride-sharing, SaaS subscriptions, marketplace, your supplier/product-lifecycle app, Copilot agent telemetry, airline bookings, recipes and nutrition (your Fuel Smart project).

---

## 7. Lane C: dbt

| # | Topic | Resources |
|---|---|---|
| D1 | Sources, `ref`, models, tests, docs, materializations | dbt Learn **dbt Fundamentals** (free); `jaffle_shop` |
| D2 | Jinja, macros, packages, structure, linting | dbt Learn "Jinja, Macros, and Packages" and "Refactoring SQL for Modularity"; `dbt_utils`, `dbt-codegen`, `dbt-project-evaluator`; SQLFluff |
| D3 | Incremental models, snapshots, advanced tests, **unit tests** | dbt Learn "Advanced Materializations" and "Advanced Testing"; `dbt_expectations` |
| D4 | Deployment | Environments, **slim CI** (`state:modified+`, `--defer`), docs site, exposures, `dbt-databricks`, `dbt-snowflake` |
| D5 | **Governance and scale (new)** | **Model contracts**, **model versions**, access levels and groups, **dbt Mesh** (multiple projects), column-level lineage, source freshness, **Semantic Layer / MetricFlow**, **dbt MCP server**. Try **dbt Core v2.0 / Fusion engine** (still alpha; check maturity). Awareness of SQLMesh as an alternative. |

**Resources:** dbt docs (contracts, versions, Mesh, Semantic Layer, MCP), the dbt Learn courses above, the Analytics Engineering Roundup newsletter, and the dbt Community Slack.

---

## 8. Lane C: Python for data

| # | Topic | Key concepts |
|---|---|---|
| Py1 | Python for data engineering (core) | Built-in structures and their costs (`dict`/`set`/`deque`, `defaultdict`, `Counter`); **generators and `itertools`** for streaming and chunking files larger than memory; CSV / JSON / JSON-lines / gzip I/O; **time-zone-aware datetimes** (`zoneinfo`) and `Decimal` for money; **DB-API** (parameterized queries, transactions) with sqlite3 / psycopg / DuckDB; decorators and context managers (retry, timing, connections); threads vs processes vs asyncio (GIL); packaged CLIs with **`uv`** + `pyproject.toml`, `ruff`, type hints, `dataclasses`, logging, config from env vars |
| Py2 | DataFrames | pandas and **Polars**: filter, `groupby`/`agg`, `merge`, `shift`/`rank`/`rolling`, pivot/melt, dtypes, method chaining; SQL → DataFrame cheat-sheet |
| Py3 | Ingestion engineering | `httpx`, pagination, **retries with backoff**, rate limits, streaming gzip JSON-lines, **`pyarrow`/Parquet**, re-runnable writes, secrets, **`dlt`** |
| Py4 | Quality and tooling | **pytest**, pydantic / pandera, `ruff`, `mypy`, pre-commit |
| Py5 | Interview-style Python | Log parsing, removing duplicates, merging intervals, sessionization, `heapq`/`Counter`, processing large files without loading them into memory |
| Py6 | Statistics in Python | `scipy.stats` (t-test, chi-square), bootstrap, `statsmodels` basics; supports BZ3–BZ4 |

**Resources:**
- *Python for Data Analysis* 3e (free online).
- *Effective Pandas 2*.
- Polars user guide.
- Official Python tutorial and standard-library docs (`itertools`, `collections`, `csv`, `json`, `datetime`/`zoneinfo`, `sqlite3`, `concurrent.futures`).
- *Fluent Python* 2e (Ramalho) and *Effective Python* 3e (Slatkin) for idioms.
- Real Python tutorials (generators, decorators, context managers, concurrency).
- *Python Testing with pytest* 2e.
- *Data Pipelines Pocket Reference*.
- dlt docs and courses.
- startdataengineering.com.

**Practice:**
- LeetCode "30 Days of Pandas"; StrataScratch in Python.
- Solve problems three ways (SQL → pandas → PySpark).
- **Fuel Smart ingester CLI:** deterministic recipe sample, paged USDA FoodData Central API calls, retries, safe re-runs, partitioned Parquet, schema validation, pytest, CI.
- Phase 4: 2 plain-Python interview problems per week on a timer.

---

## 9. Lane C: Spark and Databricks

| # | Topic | Key concepts |
|---|---|---|
| SB1 | Spark fundamentals | Driver/executors, lazy evaluation, transformations vs actions, partitions, narrow vs wide transformations |
| SB2 | PySpark | Joins, windows, `explode` nested JSON, schemas, built-ins instead of Python UDFs, Parquet/Delta I/O |
| SB3 | Delta Lake (+ Iceberg basics) | ACID transaction log, **`MERGE`**, time travel, schema evolution, `OPTIMIZE`/`VACUUM`, liquid clustering, Change Data Feed. **Iceberg:** hidden partitioning, partition evolution, catalogs. Delta UniForm. |
| SB4 | Databricks platform | **Unity Catalog**, **Auto Loader**, Lakeflow Declarative Pipelines (formerly Delta Live Tables), Lakeflow Jobs, SQL warehouses, Asset Bundles, `dbt-databricks`, **AI functions** (`ai_query`, `ai_classify`; see section 14) |
| SB5 | Spark performance | AQE, broadcast, skew, small files, caching, Photon, query profile / Spark UI |

**Resources:**
- Databricks Academy (free Data Engineer path).
- *Learning Spark* 2e (free).
- *Delta Lake: The Definitive Guide*.
- ***Apache Iceberg: The Definitive Guide*** (O'Reilly).
- PySpark, Delta and Iceberg docs.
- DataExpert Spark modules.
- **Platform:** Databricks Free Edition (no Spark UI) + local PySpark (Spark UI at localhost:4040).

**Practice:**
- Re-solve problems three ways.
- Bronze → silver with Auto Loader + `MERGE`.
- Time-travel rollback; schema evolution; `OPTIMIZE`.
- **Write one silver table as Iceberg (PyIceberg or Spark) and query it from DuckDB** to show it works across engines.
- Performance labs 4 and 6.
- Optional certification: Databricks Data Engineer Associate.

---

## 10. Lane C: Orchestration and Airflow

| # | Topic | Key concepts |
|---|---|---|
| AF1 | Core concepts | DAGs, tasks, operators, scheduler, executors, connections, XComs. **Airflow 3:** assets, DAG versioning, new UI, Task SDK. |
| AF2 | Authoring | TaskFlow API, data intervals, **re-runnable tasks**, retries, `catchup` and **backfills**, dynamic task mapping, deferrable operators, asset-triggered scheduling |
| AF3 | Integrations | **dbt via Astronomer Cosmos**, the Databricks provider, alerts |
| AF4 | Ops | Astro CLI, DAG tests in pytest, CI. Awareness of Dagster, Prefect, Lakeflow Jobs, ADF and Kestra, and when to pick each. |

**Resources:**
- Astronomer Academy (free).
- Airflow docs ("Best Practices").
- Cosmos docs.
- *Data Pipelines with Apache Airflow* (Manning).
- Marc Lamberti.
- Optional: Dagster University "Dagster & dbt".

**Practice:**
- Daily Open Food Facts delta-file DAG: ingest → Databricks → dbt via Cosmos.
- Backfill a month and confirm re-runs don't create duplicates.
- Failure exercises (killed task, source outage).
- Asset-triggered data-quality DAG.
- DAG tests in CI.

---

## 11. Lane B: Data architecture

| # | Topic | Key concepts |
|---|---|---|
| A1 | Pipeline patterns | ETL vs ELT; batch / micro-batch / streaming; **change data capture (CDC)** (Debezium concept); push vs pull; awareness of Lambda/Kappa |
| A2 | Storage | Warehouse vs lake vs **lakehouse**; medallion layers; **open table formats + catalogs** (Unity Catalog, Iceberg REST/Polaris); separating storage from compute |
| A3 | Modeling at platform level | Kimball / Inmon / Data Vault / OBT; where the semantic layer sits; serving to BI, reverse ETL, APIs and **AI agents** |
| A4 | Reliability | Re-runnable pipelines, backfills, late data, SLAs/SLOs, data contracts, observability, incidents |
| A5 | Governance and security | Role-based access, row- and column-level security, PII masking, **GDPR deletion**, lineage, catalogs, retention, **cloud IAM** |
| A6 | Trade-offs and organization | **Cost models (FinOps)**, build vs buy (e.g. Fivetran vs dlt), centralized vs **data mesh**, multi-platform reality |
| A7 | System design interviews | Clickstream, ride-sharing, payments, IoT, **"governed data platform for AI agents"** |

**Resources:**
- *Fundamentals of Data Engineering*.
- *Deciphering Data Architectures* (Serra).
- *DDIA*.
- Netflix, Uber, Airbnb and Databricks engineering blogs.
- startdataengineering.com; Seattle Data Guy; dataengineering.wiki.
- System-design question banks: PracHub, Exponent, DataExpert.

**Practice:**
- Architecture decision records (≥5).
- An architecture document for the portfolio.
- Retroactive design docs for your Data Factory migration and GDPR tool.
- A weekly 45-minute design exercise using the template:
  1. requirements and SLAs;
  2. sources;
  3. ingestion;
  4. storage;
  5. transformation;
  6. serving;
  7. quality;
  8. governance;
  9. cost;
  10. trade-offs.

---

## 12. Lane B/C: Data quality, contracts and observability (new)

**Why:** this is the #1 challenge in the 2026 dbt survey, and governance is now a primary analytics engineering deliverable.

| # | Topic | Key concepts |
|---|---|---|
| Q1 | Test strategy | What to test at each layer (sources: freshness and volume; staging: keys and types; marts: business rules); **unit tests vs data tests**; avoiding too many tests |
| Q2 | Contracts | **dbt model contracts**, model versions, deprecation, access levels; producer–consumer data contracts; schema-change policies |
| Q3 | Observability | Freshness, volume, schema and distribution anomalies; lineage-based impact analysis; tools: **Elementary** (dbt-native), Soda, Great Expectations; awareness of Monte Carlo |
| Q4 | Incidents and trust | Alert routing, runbooks, data-incident postmortems, reconciliation with source systems (e.g. "finance's revenue ≠ the dashboard's"), communicating data incidents |

**Resources:**
- dbt docs: tests, unit tests, contracts, versions, source freshness.
- ***Data Quality Fundamentals*** (Moses, Gavish, Vorwerck; O'Reilly).
- ***Data Contracts*** (Chad Sanderson & Mark Freeman; O'Reilly).
- Elementary and Soda docs.

**Practice (in the portfolio; basic tests/contracts belong to v1, observability and incidents to later releases):**
- Write a `TESTING.md` describing your test strategy.
- Use the Elementary report as an observability dashboard.
- **Simulate an upstream schema change** that the contract catches in CI.
- Add a freshness SLA alert in Airflow.
- Write one **incident postmortem** for a bug you planted on purpose.
- Add a **reconciliation test** (gold totals vs bronze counts).

---

## 13. Lane A/B: Metrics, statistics and business sense (new)

**Why:** analytics engineer interviews now include metric definition, product sense ("DAU dropped, why?") and experiment questions. Business judgment is the skill AI can't replace.

| # | Topic | Key concepts |
|---|---|---|
| BZ1 | Business models and their metrics | **SaaS** (MRR/ARR, churn, net revenue retention (NRR), LTV/CAC), **e-commerce** (conversion, AOV, repeat rate), **marketplaces** (liquidity, take rate), **product** (DAU/MAU, stickiness, activation, retention), **operations** (SLA, MTTR, throughput; ties to your Data Center Ops domain) |
| BZ2 | Metric design | Precise definitions (grain, filters, time window, edge cases), leading vs lagging, north-star + guardrail metrics, ratio-metric pitfalls, metric trees |
| BZ3 | Statistics essentials | Distributions, mean vs median, variance; sampling; **confidence intervals, p-values, statistical power**; correlation vs causation; **Simpson's paradox**; survivorship and selection bias |
| BZ4 | Experimentation | A/B test design, randomization unit, sample size, **sample ratio mismatch (SRM)**, peeking, novelty effects; awareness of CUPED; modeling experiment data in the warehouse |
| BZ5 | Diagnosing metric changes | Root-cause framework: data issue vs real change; segment by dimension; mix shift; seasonality; external events; how to communicate the answer |

**Resources:**
- ***Lean Analytics*** (Croll & Yoskovitz): metrics for each business model.
- ***Practical Statistics for Data Scientists*** 2e (Bruce, Bruce & Gedeck).
- ***Trustworthy Online Controlled Experiments*** (Kohavi, Tang, Xu). Kohavi led experimentation at Microsoft.
- **Udacity "A/B Testing" by Google** (free).
- **StatQuest** (YouTube) for statistics intuition.
- *Ace the Data Science Interview*: product-sense and statistics chapters.
- datainterview.com product-sense question lists.

**Practice:**
- Every weekly modeling exercise includes 3 metric definitions plus edge cases.
- From Phase 3, **1 metric/product case per week**, out loud, 20 minutes (e.g. "The average rating of high-protein recipes dropped 10%. Why?" using your project data).
- **Experiment notebook:** generate synthetic A/B data, then compute lift, a confidence interval and an SRM check, in both SQL and Python.
- Write a metric spec for "high-protein recipe" on your project, as precise as a contract.

---

## 14. Lane B/C: AI-ready analytics engineering (new, and your biggest differentiator)

**Why:** in 2026 analytics engineers are "AI context providers". AI agents answer business questions using the semantic layer, documentation, lineage and contracts you build. You already build AI agents for a living. Combining the two is rare.

| # | Topic | Key concepts |
|---|---|---|
| AI1 | Semantic layer for AI | Why raw text-to-SQL produces inconsistent metrics; how agents query certified metrics instead; **MetricFlow**; **Apache Ossie (formerly OSI)** standard; Cube; Power BI semantic models + Copilot |
| AI2 | Documentation as context | **Precise definitions:** naming, descriptions, metric definitions and contracts that are clear to both humans and LLMs; column-level lineage for citing answers |
| AI3 | Agents over data | **dbt MCP server**; MCP basics; guardrails (row-level security still applies, read-only access, query cost limits); text-to-SQL vs semantic-layer-backed querying |
| AI4 | **Evaluating AI analytics** | Gold question/answer sets, execution accuracy, regression testing for agents, awareness of BIRD/Spider benchmarks |
| AI5 | LLM functions in the warehouse | **Databricks AI functions** (`ai_query`, `ai_classify`, `ai_extract`), **Snowflake Cortex AISQL**; cost and latency; when *not* to use them |
| AI6 | Unstructured data for AI | Chunking, embeddings, vector search (Databricks Vector Search, Azure AI Search), metadata/permissions, freshness (connects to your agent work) |
| AI7 | AI-assisted development | Copilot for dbt/SQL; reviewing AI-generated SQL for grain and fan-out bugs; prompt patterns; dbt's AI tooling |

**Resources:**
- dbt docs: Semantic Layer, MetricFlow, **MCP server**, column-level lineage.
- dbt blog: "The analytics engineer in 2026", "How a semantic layer prevents AI hallucinations".
- ossie.apache.org (spec).
- Databricks AI Functions docs; Snowflake Cortex AISQL docs.
- Cube's articles on semantic layers for AI.
- modelcontextprotocol.io.

**Practice: a later portfolio release, after v1 is published**
1. Define 8–12 metrics in **MetricFlow** on the GitHub gold layer.
2. Build an **"Ask GitHub Analytics" agent** (Copilot Studio, Foundry or Python) that queries through the **dbt MCP server / semantic layer**.
3. **Evaluation harness:** 40 business questions with expected answers.
   - Compare accuracy of (a) raw schema + text-to-SQL vs (b) semantic-layer-grounded answers.
   - Publish the results table in the README.
4. Use **`ai_classify`** to label PRs (bug fix / feature / docs / dependency), build a fact table on top, and record the cost per 1,000 rows.

---

## 15. Platform familiarity (new)

| # | Area | What to learn | Resource / practice |
|---|---|---|---|
| PL1 | **Cloud fundamentals** | Object storage (S3/ADLS), **IAM** (roles, service principals, least privilege), networking basics, cost controls | AWS Skill Builder "Cloud Practitioner Essentials" (free); you already know Azure. Grant least-privilege access in the portfolio. |
| PL2 | **Terraform** | Providers, state, modules; provisioning storage + Databricks resources | HashiCorp tutorials (free). Easy for you after ARM templates. Provision the portfolio's infrastructure with Terraform. |
| PL3 | **Snowflake** | Warehouses, micro-partitions, roles, Time Travel, Snowpark awareness, Cortex | 30-day trial + Snowflake's free **"Hands-On Essentials"** badges. Run the gold dbt layer on Snowflake to show portability. |
| PL4 | **BigQuery** | Partitioning/clustering, slots vs on-demand pricing | Sandbox (free); load the Fuel Smart recipe sample |
| PL5 | **Ingestion tools and CDC** | Fivetran/Airbyte/dlt trade-offs; CDC concepts (Debezium, log-based) | dlt (already used); read the Debezium docs overview |
| PL6 | **BI breadth** | Power BI (deep; you have it), **LookML concepts**, Tableau awareness, BI-as-code (Evidence/Lightdash) | Google Cloud Skills Boost LookML labs; *Storytelling with Data* for dashboard design |
| PL7 | Streaming (awareness; deeper for data engineer) | Kafka topics/partitions/consumer groups, delivery guarantees, Spark Structured Streaming | Confluent Developer "Kafka 101" (free). Optional mini-project: Wikimedia EventStreams → Structured Streaming → Delta. |

---

## 16. Communication and career assets (new)

| # | Topic | Practice |
|---|---|---|
| CM1 | Requirements and stakeholders (1.4) | A request-intake template (question, decision it supports, grain, deadline). Use it for the portfolio question and two work, synthetic or personal requests. |
| CM2 | Writing (1.5) | Metric specs, design docs, PR descriptions and READMEs; start with the v1 design and keep them current. |
| CM3 | Data storytelling and dashboard design (2.3) | *Storytelling with Data* (Knaflic). Critique dashboards, then use those lessons in the first portfolio dashboard. |
| CM4 | Personal brand and network (1.6 onward) | Initial write-up, three informational chats and community participation; continue one write-up per later phase and attend online or local events. |

**Resources:**
- *The Analytics Setup Guidebook* (Holistics, free).
- *Storytelling with Data*.
- Locally Optimistic (blog/Slack).
- Benn Stancil's newsletter.
- Analytics Engineering Roundup.

---

## 17. Portfolio project: "Fuel Smart", released in stages

One data space: food and nutrition. Full brief: [Fuel Smart project brief](../docs/study-planning/fuel-smart-project-brief.md).

### First release: one question, one bounded dataset, one useful dashboard

**Question:** Which simple recipes (≤10 ingredients, ≤45 minutes) give the most protein and fibre per 100 kcal and the most vegetables, and do reviewers rate them as highly as other recipes?

**Dataset contract:** in `dataset.yml`, fix a deterministic sample of **5,000 Food.com recipes** with all their reviews, and pin the **USDA FoodData Central** Foundation Foods and SR Legacy releases. Record source versions, the sampling rule, retained counts and anything dropped. Commit a small fixture so someone can reproduce the build offline. Check representative recipes (ingredient quantity and name lists, servings, listed nutrition) before choosing metrics; explain what the sample can and cannot establish.

**Metrics** (per recipe serving): protein per 100 kcal, fibre per 100 kcal, and vegetable & legume share of matched ingredient weight. Define unit conversion with USDA food portions, the ingredient-match coverage threshold (e.g. exclude recipes with <80% of ingredient weight matched), zero denominators and how ratings are compared (minimum review counts). The metrics describe recipe data, not personal health advice.

```text
Food.com recipe sample + pinned USDA releases + small offline fixture
  → Python CLI: deterministic sample, paged USDA API, retries, validation, safe re-runs, pytest in CI [Py3–Py4, PF1]
  → Partitioned Parquet
  → Ingredient parsing, gram conversion and USDA matching, checked against a 200-line answer set
  → DuckDB + dbt staging and marts [D1–D3, Q1–Q2, PF3]
  → Recipe-ingredient fact + review fact + recipe/food/reviewer/date dimensions
  → Three documented SQL metrics
  → One dashboard (Power BI or Evidence) + README + metric spec
```

### First-release checklist (PF1 + PF3; application evidence)

- [ ] One business question and the decision the dashboard supports, captured using CM1
- [ ] Dataset manifest: sampling rule, source versions, retained counts and coverage limitations
- [ ] Small committed fixture; README commands reproduce ingestion and `dbt build`
- [ ] Idempotent Python ingester with retries, validation, quarantine and pytest in CI
- [ ] Ingredient matching with a hand-labelled answer set; precision and matched-weight coverage reported
- [ ] Recipe-ingredient and review facts with only the dimensions needed for the question; grain statements and stable keys
- [ ] Three precise metric definitions, with missing-data and zero-denominator behavior
- [ ] dbt data tests, unit tests for tricky logic, and model contracts pass in CI
- [ ] Dashboard v1 and README explain the answer and dataset limitations

**First-release boundary:** use local DuckDB/dbt and manual reproducible runs. Open Food Facts, Auto Loader, a deployed Spark pipeline, all three fact types, a mandatory SCD2 mart, Airflow, hosted semantic APIs, AI, Terraform, Snowflake portability and large benchmarks belong to later extensions or dedicated learning labs. Select additional fact types and SCD2 when an extension's question needs them.

### Later releases: extend the working v1

| Release | Deliverables | Prerequisite / signoff |
|---|---|---|
| **Lakehouse** | PF2: full Food.com files and the Open Food Facts Parquet export (3.7M+ products) into local bronze/silver Delta, MERGE by barcode, reconciliation, quarantine and time-travel recovery. SB4 then adds Databricks Auto Loader. Iceberg remains an SB3 lab. | SB2–SB3 before PF2; PF2 before SB4 |
| **Operations and quality** | PF4: Airflow/Cosmos loading daily Open Food Facts delta files and monthly USDA Branded Foods releases, with backfill, recovery, alerts and DAG tests. PF5: Elementary, freshness, reconciliation, the protein × 4 + carbohydrate × 4 + fat × 9 calorie check, postmortem and TESTING.md. PF6: larger performance/cost experiments. | AF1–AF4 before PF4; Q1–Q4 before PF5; P1–P5 before PF6 |
| **Architecture documentation** | PF11: architecture diagram/document, ≥5 decision records and linked testing/recovery evidence. Collect decisions while building. | A1–A5, CM2 and PF2–PF5 |
| **Semantic layer and AI** | PF7: MetricFlow and documented nutrition metrics. PF8: "What should I cook?" agent, 40-question evaluation and LLM ingredient extraction with cost measurement. | M5/BZ2/AI1–AI2 before PF7; PF7/AI3–AI5 before PF8 |
| **Portability and infrastructure** | PF9: Terraform, least privilege, gold on Snowflake and full CI. | PL1–PL3 and D4 before PF9 |
| **Polished story** | PF10: update existing architecture/docs, publish a three-minute demo and public write-up. | Reuse PF11; complete after A6 |

For the one-month backfill, begin with a small deterministic fixture per interval and label it a recovery exercise. Open Food Facts delta files cover only the last 14 days and omit deleted products, so plan periodic full refreshes. Increase volume deliberately for performance benchmarks (uncompressed JSONL or a labelled synthetic scale factor). Keep the original local v1 run command reproducible throughout the extensions.

**Extensions signoff** covers the later extensions and PF11; **application readiness** depends on the first-release checklist plus early career/interview preparation, not on finishing the full expanded system.

---

## 18. Setup: minimal first, the rest just in time
Don't install everything on day one. Most tools mean nothing until you reach their topic, and trials (Snowflake) expire. Start with a 1–2 hour minimal lab, then install each tool when its topic begins.

**Phase 0: minimal lab**
- [ ] VS Code + Git + the **Codex** extension (sign in with ChatGPT; included in Plus/Pro, no extra cost). Use it as a tutor: attempt practice yourself first, then ask for hints or review
- [ ] `uv`, then Python 3.12 (`uv python install 3.12`)
- [ ] GitHub repo `analytics-engineering-lab` with a README and `sql-practice/` (add other folders when a topic needs them)
- [ ] DuckDB CLI: run `SELECT * FROM 'file.csv' LIMIT 5`
- [ ] DataLemur + LeetCode accounts

**Install when you get there**

| Topic (step) | Set up then |
|---|---|
| Py1 (1.1) | `uv init` in `python-practice/`; `duckdb`, `typer`, `ruff` |
| M1 (1.1) | dbdiagram.io account |
| Py2 (1.2) | `pandas`, `polars`, `pyarrow` |
| D1 (1.3) | `dbt-core` + `dbt-duckdb`; clone `jaffle_shop_duckdb`; join dbt Slack |
| CM4 (1.6) | Locally Optimistic Slack; a Seattle data meetup |
| P1 (2.1) | Docker Desktop + Postgres container; `psycopg` |
| SB1 (2.1) | Java 17 + `pyspark` |
| Py3 (1.4) | `httpx`, `pyarrow`; freeze the bounded dataset manifest |
| Py4 (1.5) | `pydantic`, `pytest`, `mypy`, pre-commit; GitHub Actions CI |
| SB3 (2.4) | `delta-spark` + `pyiceberg` |
| PF3 (2.5) | Power BI Desktop or Evidence (Node.js) |
| AF1 (3.2) | Astro CLI (runs on Docker); Astronomer Academy |
| SB4 (3.1, after PF2) | Databricks Free Edition + Databricks CLI; `dbt-databricks` |
| Q3 (3.3) | Elementary |
| Py6 (3.3) | Jupyter, `scipy`, `statsmodels` |
| PL1–PL5 (3.7–3.8) | Cloud free account + budget alert; Terraform CLI; Snowflake trial (**start only now**, 30 days); BigQuery sandbox; `dlt` |

The tracker shows these as **🔧 Set up first** on each topic.

---

## 19. Lane D: Experience evidence, at work or in a personal project

**JOB1 (optional, Phase 2):** choose approved Kusto/Copilot telemetry at work, synthetic telemetry, or your personal portfolio. Build a star schema, define activity/retention/outcome metrics, add a Power BI semantic model or documented dbt metric views, and demonstrate quality checks and repeatable refresh. Reuse PF3 artifacts where they provide equivalent evidence; a second project is not required.

**JOB2 (optional, Phase 3):** after PF8, expose certified metrics to an agent using approved work data or the personal project, with a before/after evaluation. Employer access is not a prerequisite for progress or applications.

**IV3 (Phase 1):** prepare the AE-focused resume, LinkedIn and six STAR stories before applying. Draw on the Dataverse model, ADF incremental sync, GDPR pipeline, Power BI RLS, agent telemetry and governance reviews. Substitute personal-project examples where needed. Add portfolio v1 before applications and update career assets as later releases ship.

---

## 20. Interview prep: start early, deepen in Phase 4

**IV0 (1.6):** before the application checkpoint, complete two medium SQL sessions, two basic data-Python sessions without AI, and one modeling/metrics case aloud. Record reasoning, edge cases and feedback. Continue one short interview-practice session each week while building.

**IV3 (1.5):** prepare the first resume, LinkedIn and STAR stories; add portfolio v1 before applying. Phase 4 updates these assets rather than starting from scratch.

**IV1–IV2 and IV4 (Phase 4):** advanced timed sets, deeper cases, a take-home and full mock loops.

**Typical loop:**
1. Live SQL.
2. Python.
3. **Data modeling case** (e.g. weekly LTV by acquisition channel; daily churn for a freemium app).
4. **dbt deep dive:** staging/intermediate/marts; incremental keys and strategies; snapshots; `source` vs `ref`; writing a custom test.
5. **Metrics and product sense:** define MAU, debug "DAU −15% while MAU is flat", reconcile revenue with finance.
6. **Take-home:** messy events CSV → a dbt project with tests and documented metrics for a retention dashboard, then defend it live.
7. System design (more so for data engineer roles).
8. Behavioral.

**Practice:**
- 2 timed SQL sets + 2 Python problems per week.
- 1 modeling case + 1 metrics case + 1 design case per week, out loud.
- Spark/Airflow concept drills.
- A 4-hour practice take-home, checked with `dbt-project-evaluator`.
- Mock interviews: dbt Slack peers or a paid service.
- **Prepare to discuss AI:** "How do you make AI-generated analytics trustworthy?" Answer with your evaluation results.

**Optional certifications (pick 1–2):** dbt Analytics Engineering · Databricks Data Engineer Associate · Astronomer Airflow Fundamentals. DP-600/PL-300 only for Microsoft-partner targets.

---

## 21. What to skip (deliberately)
- **Hadoop / Hive / MapReduce:** legacy.
- **Scala:** PySpark covers it.
- **Deep Kubernetes:** Docker is enough.
- **Hard LeetCode algorithms:** data interviews rarely test them.
- **Deep machine learning / model training:** a different career path.
- **Several BI tools in depth:** go deep on one (Power BI), with awareness of the others.
- **Collecting certifications:** the portfolio matters more.
- **Deep Fabric specialization:** see the earlier analysis.
- **Deep Data Vault:** awareness only, unless a target employer uses it.
- **Deep Flink:** awareness only, unless you go the streaming data engineer route.

---

## 22. Quick reference: resources
| Area | Primary | Secondary |
|---|---|---|
| Advanced SQL | *SQL for Data Analysis* | Select Star SQL, modern-sql.com, *T-SQL Window Functions* |
| SQL practice | DataLemur, LeetCode SQL 50 / Advanced 50 | StrataScratch, pgexercises, Advent of SQL |
| Performance and cost | Use The Index, Luke! | Brent Ozar, *DDIA* ch. 3, platform cost docs |
| Data modeling | *The Data Warehouse Toolkit* 3e | Kimball techniques page, SQLBI, Corr, DataExpert, *Analytics Engineering with SQL and dbt* |
| dbt | dbt Learn + docs (contracts, Mesh, Semantic Layer, MCP) | Roundup newsletter, dbt Slack |
| Python | *Python for Data Analysis* 3e | *Effective Pandas 2*, Polars, *pytest* book, dlt |
| Spark / Databricks | Databricks Academy + Free Edition | *Learning Spark* 2e, *Delta Lake* and *Iceberg* Definitive Guides |
| Airflow | Astronomer Academy | Airflow docs, Cosmos, Manning book |
| Architecture | *Fundamentals of Data Engineering* | *Deciphering Data Architectures*, *DDIA* |
| **Data quality** | *Data Quality Fundamentals* | *Data Contracts*, Elementary/Soda docs |
| **Metrics and statistics** | *Lean Analytics* + *Practical Statistics for Data Scientists* | *Trustworthy Online Controlled Experiments*, Udacity A/B Testing, StatQuest |
| **AI-ready analytics engineering** | dbt Semantic Layer / MetricFlow / MCP docs | Apache Ossie spec, Databricks AI Functions, Snowflake Cortex, modelcontextprotocol.io |
| **Platforms** | Snowflake Hands-On Essentials, Terraform tutorials | AWS Cloud Practitioner Essentials, LookML labs, Confluent Kafka 101 |
| **Communication** | *Storytelling with Data* | *Analytics Setup Guidebook*, Locally Optimistic, Benn Stancil |
