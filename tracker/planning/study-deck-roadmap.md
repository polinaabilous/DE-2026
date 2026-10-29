# Study deck roadmap and reusable prompts

Based on the full prep plan and tracker topic definitions, reviewed 12 October 2026. This is a menu for creating teaching materials as you reach each topic, not additional prerequisites or a requirement to finish every deck before applying.

## What you already have

Since 13 October 2026 the decks live with the tracker in `tracker/de-tracker/decks/<slug>/`, one deck per lesson where content exists (see [Topics in the tracker](https://de-roadmap.web.app/#topics)). The original long decks were split to follow the lessons:

- SQL windows, recursion and clean SQL → [Window functions](../de-tracker/decks/sql-window-functions/sql-window-functions.html), [Classic SQL patterns](../de-tracker/decks/sql-patterns/sql-patterns.html) (with the runnable [interview patterns lab](../de-tracker/decks/sql-patterns/sql-interview-patterns-lab.sql)) and [Query structure](../de-tracker/decks/sql-query-structure/sql-query-structure.html).
- Dimensional modeling → [Why dimensional modeling](../de-tracker/decks/dim-why-dimensional/dim-why-dimensional.html), [Fact tables](../de-tracker/decks/dim-fact-tables/dim-fact-tables.html), [Dimension tables](../de-tracker/decks/dim-dimension-tables/dim-dimension-tables.html) and [Model a business end to end](../de-tracker/decks/dim-modeling-project/dim-modeling-project.html) (FitHub project).
- Data formats → [File formats](../de-tracker/decks/data-file-formats/data-file-formats.html) and [Table formats](../de-tracker/decks/data-table-formats/data-table-formats.html), plus the one-page reference.
- Stage 1 decks 1–6 below now exist: Python foundations, Python files and streams, pandas & Polars, dbt fundamentals (with dbt Jinja and macros split out), SQL correctness (split into joins & grain and aggregation) and business metrics (split into business models, metric design and metric diagnosis). Deck 7, Reliable Python ingestion, exists too.
- [uv quick guide](../de-tracker/decks/tools/uv-quick-guide.md) and [DuckDB quick guide](../de-tracker/decks/tools/duckdb-quick-guide.md): setup/reference companions in `decks/tools/`.

The decks without a Markdown companion are the SQL and dimensional-modeling splits; their HTML provides the teaching and presentation reference. Every other deck has an aligned Markdown companion.

The useful pattern to preserve is a course rather than a slide summary: prerequisites, one tiny recurring dataset, concepts introduced in order, visible input/output, common mistakes, checkpoints, hidden hints/answers, a practical project, a glossary, and a recap. The existing decks also provide contents/search, slide/read modes, keyboard navigation, printing, and offline use.

## Shared prompt: paste this before any topic prompt

> Create `tracker/de-tracker/decks/<slug>/<slug>.html` and `tracker/de-tracker/decks/<slug>/<slug>.md` for the topic below. First read `tracker/data-engineer-prep-plan.md`, the relevant topics and definitions of done in `tracker/de-tracker/data.js`, and my existing decks in `tracker/de-tracker/decks/` (for example `dim-fact-tables/` and `sql-joins-grain/`). Match their teaching depth, visual style, navigation, Read mode, print support, and offline behavior. Use `tracker/de-tracker/decks/sql-joins-grain/sql-joins-grain.md` as a companion-document reference. I have software-engineering experience, including C#, but am learning Python and analytics/data engineering. Explain new terms before using them and use SQL/C# comparisons where helpful. Build lessons around one small realistic dataset with deliberate edge cases and verifiable outputs. Include worked examples, common bugs and fixes, 8–12 graduated exercises with separate hints and explained solutions, a bounded local mini-project, a cheat sheet, and an “I can…” exit checklist mapped to the plan. For conceptual topics, use design/debugging cases instead of coding exercises. Make the Markdown a complete readable companion with code, exercises, and solutions, not just slide headings. Keep HTML and Markdown aligned. Link official sources, state the tested versions/dialect, and verify version-sensitive APIs and platform availability when generating. Execute runnable examples and verify expected outputs where possible; identify anything not executed. Teach the depth needed for my plan, with advanced material clearly optional. Reuse existing material instead of repeating it. Do not modify my tracker or unrelated files.

Replace `<slug>` with the filename stem below (one folder per deck), then append its topic prompt. Each stem produces both `.html` and `.md` files. The shared prompt supplies the learning design; the short topic prompt supplies the scope.

## Stage 1: create these first

Py1 is unusually broad in your tracker: it spans syntax, streaming, databases, concurrency, and packaging. Two decks will make it much easier to learn and revise. Py2 can stay pandas-first with a short Polars bridge. dbt should be split across stages rather than compressed into one huge course.

### 1. Python foundations for data engineering

**Files:** `python-de-foundations` · **When:** 1.1 · **Coverage:** Py1, language foundations.

> Teach the Python needed to transform data before using DataFrames: values and types, `None`, truthiness, strings, branching, loops, functions and arguments, scope, imports, exceptions, lists/tuples/dicts/sets, comprehensions, sorting with keys, unpacking, mutability and shallow copies, mutable-default bugs, `Counter`, `defaultdict`, and `deque`. Explain practical time/memory costs, type hints, and dataclasses with C#/LINQ comparisons. Practise parsing event records, validating fields, deduplicating by a stated rule, grouping, and counting. End with an in-memory event-cleaning mini-project; leave external I/O and concurrency to the next deck.

### 2. Python files, generators, and practical data scripts

**Files:** `python-de-files-streams` · **When:** 1.1, after deck 1 · **Coverage:** rest of Py1.

> Teach `pathlib`, encodings, CSV/JSON/JSONL/gzip I/O, iterables versus iterators, generators, `yield`, `itertools`, and bounded batches. Cover timezone-aware UTC datetimes, `zoneinfo` and DST, `Decimal`, parameterized DB-API queries and transactions, context managers, decorators, logging, environment configuration, and a CLI with `uv`/`pyproject.toml`. Explain threads/processes/asyncio and the GIL at decision-making depth, using a small bounded concurrency exercise. Build a streaming JSONL-to-DuckDB loader; demonstrate malformed records, rollback, cleanup, and measured memory use. Link the existing uv/DuckDB guides; defer full HTTP retry engineering to ingestion.

### 3. pandas for SQL users, with a Polars bridge

**Files:** `pandas-for-data-engineering` · **When:** 1.2 · **Coverage:** Py2.

> Teach Series/DataFrames, index alignment, `.loc`, filtering, nullable dtypes, missing values, dates/strings, vectorization, `assign`, method chaining, `groupby`/`agg`/`transform`, joins with cardinality validation, concat, deduplication, `shift`/rank/rolling, pivot/melt, and CSV/Parquet I/O. Show SQL and pandas side by side, explicitly explaining differences in NULL joins, grouping, ordering, and indexes. Include memory limits and version-appropriate copy/assignment behavior. Re-solve ten small SQL exercises in pandas, then translate them into Polars with expressions, eager/lazy execution, and `scan`/`collect`. Finish with a messy-events-to-daily-metrics lab and a pandas/Polars/DuckDB choice guide.

### 4. dbt foundations: source data to trusted marts

**Files:** `dbt-foundations` · **When:** 1.3 · **Coverage:** D1; introduction to M4.

> Teach what dbt does in an ELT pipeline, a local DuckDB project, project/profile configuration, sources versus `ref`, the dependency graph, staging/intermediate/marts, seeds, view/table/ephemeral materializations, basic Jinja, compile/run/test/build, selectors, generic and singular data tests, documentation, and lineage. Trace raw events through compiled SQL to a small fact and dimensions, with exact run commands and expected results. End with a reproducible local project using four basic generic tests and generated docs. Introduce incremental models and snapshots only as next steps.

### 5. SQL correctness: joins, grain, NULLs, and aggregation

**Files:** `sql-joins-grain-aggregation` · **When:** 1.3–1.4 · **Coverage:** S3–S4; remaining set-operation coverage from S6.

> Extend my SQL deck with join cardinality and fan-out, outer-join filters, semi/anti joins, `EXISTS` versus `IN`/`NOT IN`, three-valued NULL logic, self-joins, range/as-of joins, pre-aggregation, `COUNT` variants, conditional aggregation, `FILTER`, weighted ratios, set operations, `GROUPING SETS`/ROLLUP/CUBE and grouping markers, pivot/unpivot, percentiles, and approximate distinct trade-offs. Use tiny counterexamples to show believable but wrong answers. Reuse the existing SQL lab where applicable. End with a revenue reconciliation exercise where several joins initially inflate totals.

### 6. Business metrics: define the number before writing SQL

**Files:** `business-metrics-foundations` · **When:** 1.4 · **Coverage:** BZ1–BZ2, CM1; foundations for M6.

> Teach metric specifications: business decision, population, event/entity grain, numerator/denominator, distinct keys, time window/timezone, exclusions, bot policy, missing data, zero denominators, and observation limits. Cover SaaS, commerce, marketplace, product, and operations metrics through a few worked examples, plus north-star/guardrails, leading/lagging indicators, metric trees, and ratio aggregation. Use stakeholder ambiguity exercises and runnable SQL. Finish by specifying the portfolio's PR event count, observed contributors, and merged/closed-event share; explain why that share is not the eventual merge rate of PRs opened in the window. Keep MetricFlow implementation for the later semantic-layer deck.

### 7. Reliable Python ingestion: APIs and files to Parquet

**Files:** `python-reliable-ingestion` · **When:** 1.4; project signoff at 1.6 · **Coverage:** Py3, PF1 implementation.

> Teach HTTP basics, `httpx`, timeouts, cursor/page pagination, retryable failures, exponential backoff with jitter, `Retry-After`, rate limits, streaming downloads/gzip JSONL, PyArrow schemas and batched Parquet writes, sensible partitions, checkpoints, deterministic identifiers, idempotent publication, quarantine, secrets, and audit counts. Distinguish a paginated API lab from GH Archive's hourly-file ingestion. Build the plan's bounded ingester: fixed 24-hour UTC window, three repositories, deterministic cap of 100,000 retained events, manifest and truncation reporting, plus an offline fixture. Prove safe reruns and interrupted-run recovery. Compare manual ingestion with dlt briefly.

### 8. Testing Python data pipelines

**Files:** `python-data-pipeline-testing` · **When:** 1.5–1.6 · **Coverage:** Py4, PF1 validation.

> Teach pure transformations versus I/O, pytest assertions/fixtures/parametrize, temporary files, mocked HTTP responses, integration tests, Pydantic record validation versus Pandera DataFrame validation, quarantine, type checking, Ruff, pre-commit, and GitHub Actions. Test malformed JSON, missing fields, unexpected types, empty input, duplicate events, timezones, pagination, rate limits, retries, partial writes, and reruns using deterministic fixtures. Explain what coverage does and does not prove. Finish with an ingester test suite and CI checks that demonstrate the PF1 acceptance criteria without requiring live network access.

## Stage 2: deepen skills and ship portfolio v1

Create these when their tracker topics begin. The SQL deck covers window mechanics already; the new SQL materials should concentrate on business semantics, nested data, and writes.

### 9. SQL time analysis: cohorts, retention, and funnels

**Files:** `sql-time-cohorts-funnels` · **When:** 2.1 · **Coverage:** S5.

> Teach date spines, calendar boundaries, timezone conversion, missing periods, period-over-period comparisons, rolling windows, cohort assignment, retention definitions, ordered funnels with conversion windows, and censoring from incomplete observation. Include repeat events, zero-activity users, incomplete cohorts, and DST boundaries. Reuse window mechanics from my existing deck and the SQL lab. Finish with a cohort table and funnel whose expected outputs can be checked by hand.

### 10. SQL nested data and safe warehouse writes

**Files:** `sql-json-incremental-writes` · **When:** 2.3–2.4 · **Coverage:** S7–S8.

> Teach JSON extraction and typing, arrays, unnest/lateral/explode, missing versus null fields, empty arrays, and grain changes. Then cover staging changes, INSERT/UPDATE/DELETE/MERGE, deterministic source deduplication, transactions, append/merge/delete-and-insert strategies, watermarks, late updates, deletes, and replay. Use DuckDB as the executable baseline and label dialect differences. End with a nested-event upsert lab that handles duplicates and late corrections and reconciles against a full rebuild.

### 11. dbt depth: reusable SQL, incremental models, and snapshots

**Files:** `dbt-incremental-snapshots-testing` · **When:** 2.3–2.4 · **Coverage:** D2–D3.

> Teach Jinja rendering, macros, packages, modular SQL, surrogate-key generation, SQLFluff and project evaluation, then `is_incremental`, `unique_key`, adapter-supported strategies, full refresh, late-data lookback, schema changes, source deduplication, and snapshot timestamp/check strategies. Explain dbt unit tests versus data tests. Show initial load, rerun, update, late arrival, and recovery as explicit input/output tables. Include snapshot history limitations and test an incremental result against a full-refresh baseline. Use tiny local labs for history concepts that portfolio v1 does not require.

### 12. Data quality and contracts

**Files:** `data-quality-contracts` · **When:** 2.3–2.4 · **Coverage:** Q1–Q2; relevant D5 foundations.

> Teach a risk-based test strategy across sources, staging, and marts: freshness, volume, keys, relationships, business invariants, unit tests, and reconciliation. Distinguish runtime data validation, dbt model contracts, and producer–consumer data contracts; explain what each can and cannot catch. Cover model versions, compatibility, deprecation, ownership, and schema-change policy. Build a minimal meaningful test suite, inject a breaking change, and write TESTING.md. Separate CI-detectable failures from issues requiring production monitoring.

### 13. Query performance: plans, indexes, and columnar scans

**Files:** `query-performance-foundations` · **When:** 2.1–2.2 · **Coverage:** P1–P3.

> Teach logical versus physical execution, EXPLAIN/EXPLAIN ANALYZE, estimated versus actual rows, statistics/selectivity, scan/join/sort/aggregate operators, B-tree composite and covering indexes, sargability, and join algorithms. Then teach columnar compression, projection/predicate pushdown, partition pruning, and clustering. Contrast Postgres indexing with DuckDB/Parquet scans. Include three reproducible before/after experiments with correctness checks, controlled scale, timings and plans, and explain why a small benchmark may mislead.

### 14. PySpark foundations: DataFrames on a distributed engine

**Files:** `pyspark-foundations` · **When:** 2.1–2.2 · **Coverage:** SB1–SB2.

> Teach driver/executors, jobs/stages/tasks, lazy evaluation, actions, partitions, narrow/wide transformations, and shuffles. Translate familiar SQL/pandas exercises into explicit-schema PySpark transformations, joins, windows, JSON structs/arrays/explode, null handling, and Parquet I/O. Explain built-ins versus Python UDFs, `collect` risks, and deterministic results. Use local Spark and its UI; end with a bounded bronze-to-silver transformation and reconciliation checks.

### 15. Lakehouse tables: operating Delta and understanding Iceberg

**Files:** `lakehouse-delta-iceberg` · **When:** 2.4 labs; 3.1 portfolio extension · **Coverage:** SB3, PF2.

> Build on my data-formats deck to teach files versus transactional tables, table metadata/logs/catalogs, snapshots, ACID, MERGE, schema enforcement/evolution, time travel, compaction, retention, and safe cleanup. Use Delta for executable insert/update/delete, late-data, quarantine, reconciliation, and recovery labs. Explain Iceberg hidden partitioning, partition evolution, catalogs, and a small cross-engine reading lab; discuss interoperability limits. Clearly separate local open-source features from platform-specific features and avoid treating a table format as a compute engine.

### 16. Data architecture and modern modeling decisions

**Readability revision, 2026-10-22 (deployed as `2026-10-22.3`):** the deck is now a connected travel-company narrative. Tools are defined in compact side cards when introduced, and continuous reading is available. On smaller screens the cards are collapsed below the story; definitions also remain in the Markdown and deck search. Existing section identities, lesson links and the synthetic lab are retained.

**Update, 2026-10-21:** [Data architecture: how we got here](../de-tracker/decks/architecture-evolution/architecture-evolution.html) now covers A2 in full: warehouse/lake/lakehouse history, storage/compute, catalogs, medallion and a runnable source-version/transaction lab. It adds partial context for A1/A3/A5/A6, including streaming architecture and data mesh. The tracker names the remaining A1/A3 deck **Pipeline and data-serving architecture**: deeper CDC and pipeline implementations, semantic-layer placement and BI/API/reverse-ETL/agent serving still need fuller treatment. The original broader brief follows for context; it is not all missing anymore.

**Files:** `data-architecture-foundations` · **When:** 2.2–2.4; revisit 3.4 · **Coverage:** M4, A1–A3; foundations for PF11.

> Teach ETL/ELT, batch/micro-batch/streaming, CDC, warehouse/lake/lakehouse, compute versus storage, medallion versus dbt layers, catalogs, and serving to BI/APIs/reverse ETL/agents. Compare star schemas and OBT with brief Inmon/Data Vault/Activity Schema awareness. Trace the same requirement through two plausible architectures and defend the simplest adequate choice. Start with the portfolio's local DuckDB/dbt v1 and add later capabilities only when a requirement justifies them. Finish with an architecture diagram and decision-record exercises.

### 17. Statistics for data engineers

**Files:** `statistics-for-data-engineers` · **When:** 2.5 · **Coverage:** BZ3.

> Teach distributions, mean/median/quantiles, variability, populations/samples, sampling bias, standard error, confidence intervals, hypothesis tests, p-values, effect size, practical significance, power, correlation versus causation, Simpson's paradox, and selection/survivorship bias. Use small simulated business datasets and plain-language interpretations, including wrong conclusions to correct. Finish with an analysis explaining what a bounded observational dataset can and cannot establish. Keep full experiment design and Python statistical APIs for the later experimentation deck.

## Stage 3: generate only as the corresponding extension begins

### 18. Databricks and Spark performance

**Files:** `databricks-spark-performance` · **When:** 3.1 · **Coverage:** SB4–SB5, P4.

> Teach the Databricks platform through a familiar local Spark pipeline: catalog/schema/table organization, Unity Catalog permissions, Auto Loader, Lakeflow pipelines/jobs, SQL warehouses, and deployment bundles using currently supported names and APIs. Diagnose shuffles, skew, spill, broadcast joins, AQE, partition counts, small files, and caching using plans and Spark UI/query profiles. Include Photon awareness and clearly label hosted-only features and account limitations. End with an incremental ingestion extension and measured performance fixes; provide local equivalents for core exercises.

### 19. dbt deployment, CI, and governance

**Files:** `dbt-deployment-governance` · **When:** 3.1 and 3.4 · **Coverage:** D4–D5, PF9 dbt CI.

> Teach isolated dev/CI/prod targets, credentials, manifests and run artifacts, selection, state comparison, deferral, slim CI, docs/exposures, adapter portability, deployment and rollback. Extend contracts into model versions, deprecation, groups/access and multi-project governance, keeping Mesh proportional to need. Trace a pull request with an upstream change and its affected downstream models. Build a safe CI lab and compatibility checklist. Verify current dbt engine/product distinctions rather than repeating version-status claims from the plan.

### 20. Airflow: reliable orchestration and recovery

**Files:** `airflow-reliable-pipelines` · **When:** 3.2–3.4 · **Coverage:** AF1–AF4, A4, PF4.

> Teach Airflow architecture, DAGs/tasks, TaskFlow, logical dates and data intervals, schedules, catchup/backfills, idempotent tasks, retries/timeouts, connections/secrets, small XCom metadata, dynamic mapping, pools/concurrency, deferrable work, and asset scheduling. Integrate dbt through Cosmos and explain the Databricks provider. Build a tiny interval-based pipeline with DAG tests, CI, alerts, a source outage, partial failure, rerun, and backfill. Verify current Airflow APIs and show recovery without duplicates; briefly compare other orchestrators by requirement.

### 21. Observability, incidents, and data trust

**Files:** `data-observability-incidents` · **When:** 3.3–3.4 · **Coverage:** Q3–Q4, A4, PF5.

> Extend the quality deck into freshness/volume/schema/distribution monitoring, baselines and thresholds, lineage-based impact, ownership, SLOs, alert routing, runbooks, and reconciliation across pipeline layers. Use Elementary for a bounded example with brief Soda/Great Expectations comparisons. Inject stale data, a partial load, and a metric mismatch; distinguish symptoms from root causes, recover safely, and communicate impact. Finish with a tested runbook, an incident timeline, a blameless postmortem, and updated TESTING.md.

### 22. Experimentation and statistics in Python

**Files:** `experimentation-python` · **When:** 3.3 · **Coverage:** BZ4, Py6.

> Build on the statistics deck to teach hypotheses, randomization and analysis units, exposure/assignment modeling, primary and guardrail metrics, power/sample size, SRM, peeking, multiple testing, novelty effects, and CUPED awareness. Use deterministic synthetic data to compute lift, confidence intervals, t-tests, chi-square tests, bootstrap intervals, and an SRM check with SciPy/statsmodels as appropriate. Explain assumptions and interpretation rather than choosing tests mechanically. Finish with an experiment fact model and a business recommendation supported by SQL and Python checks.

### 23. Semantic layers: consistent metrics across consumers

**Files:** `semantic-layers-metricflow` · **When:** 3.5 · **Coverage:** M5–M6, AI1–AI2, PF7.

> Teach semantic models, entities and join relationships, measures, dimensions, time grains, simple/ratio/derived/cumulative metrics, fan-out avoidance, and precise documentation. Translate requirements and metric specs into currently supported MetricFlow YAML and queries; compare concepts with Power BI and LookML. Demonstrate the same result in SQL and the semantic layer, including empty data and denominator edge cases. Build eight to twelve metrics only where source fields support them. Label local versus hosted access requirements and explain how governed definitions become context for AI.

### 24. Trustworthy AI over analytics data

**Files:** `ai-analytics-evaluation` · **When:** 3.6 · **Coverage:** AI3–AI5, AI7, PF8.

> Teach raw text-to-SQL versus semantic-layer querying, MCP tool interfaces, identity and permission propagation, read-only access, query/cost limits, untrusted data/tool content, grounding, and answer provenance. Build a reproducible evaluation with forty business questions, expected results, execution checks, ambiguity/abstention cases, and regression tests. Compare both approaches fairly on the same data and questions. Include a small warehouse-LLM classification exercise with labeled examples and measured cost, plus review exercises for AI-generated SQL with grain/fan-out bugs. Use supported tools and document service dependencies.

### 25. Cloud, Terraform, and data access governance

**Files:** `cloud-terraform-data-governance` · **When:** governance at 3.4; implementation at 3.7 · **Coverage:** A5, PL1–PL2, PF9.

> Teach object storage and prefixes, identities/roles/service principals, least privilege, credentials, networking basics, encryption, row/column controls, masking, retention/deletion design, lineage, and catalogs. Teach Terraform providers, resources, state, plan/apply, modules, drift, and teardown through a minimal data-platform example. Trace reader/writer/CI permissions and deletion propagation through derived data and retained copies. Use local or plan-only exercises where possible; clearly label billable steps and state-handling risks. Treat compliance examples as engineering requirements, not a substitute for legal policy.

### 26. Warehouse portability: Snowflake and BigQuery

**Files:** `warehouse-portability-snowflake-bigquery` · **When:** 3.7 · **Coverage:** PL3–PL4, PF9.

> Teach the Snowflake and BigQuery mental models: organization of objects, storage/compute, warehouses versus slots/on-demand processing, pruning/partitioning/clustering, permissions, history/recovery, query profiles, and cost controls. Port a small DuckDB/dbt mart, identifying dialect, timestamps, NULLs, types, and materialization differences; reconcile results before comparing performance. Include Snowpark and warehouse AI only as awareness. Verify current sandbox/trial restrictions and pricing documentation without assuming either environment is free.

### 27. Pipeline performance and cost decisions

**Files:** `data-pipeline-performance-cost` · **When:** 3.2; revisit with platform labs · **Coverage:** P5, PF6, part of A6.

> Compare views, tables, incremental models and materialized views using workload and freshness requirements. Teach append/merge/delete-insert/overwrite/microbatch strategy trade-offs, full refresh versus incremental cost, small-file effects, storage/compute/transfer costs, concurrency, sizing, idle resources, and cost attribution per model/run. Design controlled experiments with correctness, runtime, bytes and platform cost where available. Start locally, label estimates, and scale only deliberately. Finish with a defensible materialization and budget decision for the portfolio.

## Stage 4: practice decks rather than another theory course

### 28. Python data interview patterns

**Files:** `python-data-interview-patterns` · **When:** basic exercises at 1.6; full deck at 4.1 · **Coverage:** Py5, IV0–IV1.

> Teach recognition patterns for log parsing, grouping/counting, deduplication, latest-per-key, top-k with heaps, interval merging, sessionization, and bounded-memory file processing. Include twelve timed plain-Python problems with edge cases, hints, reference solutions, time/space analysis, and aloud reasoning. Reuse foundations briefly and focus on transfer to unfamiliar questions. End with a 25-minute mock and a self-review rubric; keep hard general algorithm puzzles out of scope.

### 29. Analytics interview cases: metrics, modeling, and dbt

**Files:** `data-engineer-interview-cases` · **When:** basic cases at 1.6; full deck at 4.2–4.4 · **Coverage:** BZ5, IV2, IV4.

> Build realistic cases around a metric drop, mix shift, revenue reconciliation, churn/retention definitions, a modeling brief, incremental dbt correctness, and an unfamiliar messy-events take-home. Require clarifying questions, grain and metric contracts, edge cases, SQL/model designs, validation, and a concise stakeholder explanation. Include timed prompts, graduated hints, defensible alternative answers, interviewer follow-ups, and scoring rubrics. End with a bounded four-hour dbt take-home and a live-defense checklist.

### 30. Data system design and architecture trade-offs

**Files:** `data-system-design-cases` · **When:** 4.1 onward · **Coverage:** A6–A7, IV1–IV4; PF11/PF10 reuse.

> Teach a repeatable interview method: requirements, scale/freshness, sources, ingestion, storage, transformation, serving, quality, security, recovery, cost, and trade-offs. Work through clickstream, payments, ride-sharing, and a governed analytics service for AI, with batch-first and streaming alternatives justified by requirements. Cover CDC, late data, deletion, replay, deduplication, delivery guarantees, build-versus-buy, and team ownership. Include 45-minute cases, diagram prompts, decision records, follow-up failures, and scoring rubrics. Reuse the portfolio architecture to practise a three-minute explanation.

## Optional short decks, only if needed

| Deck / file stem | Plan mapping | Topic prompt to append to the shared prompt |
| --- | --- | --- |
| CDC and streaming fundamentals / `cdc-streaming-fundamentals` | PL5, PL7, 3.8 | Explain snapshots plus log-based CDC, insert/update/delete events, ordering, offsets, Kafka topics/partitions/consumer groups, schemas, event versus processing time, watermarks, replay, and delivery guarantees. Use a small duplicate/out-of-order event exercise and compare dlt/Airbyte/Fivetran/Debezium by use case. Keep Flink and operational tuning at awareness depth unless I choose the DE specialization. |
| Retrieval over unstructured data / `unstructured-data-retrieval` | AI6, 3.8 | Explain document ingestion, chunking, embeddings, vector and hybrid retrieval, metadata filters, permission propagation, updates/deletes, freshness and retrieval evaluation. Use a tiny document set with known answers and permission boundaries; connect it to structured analytics without making it a prerequisite for the semantic-layer project. |
| Dashboard storytelling / `dashboard-data-storytelling` | CM3, PL6; first useful at 2.3 | Teach choosing charts from the decision and data grain, comparisons and baselines, hierarchy, filters, uncertainty, accessibility and misleading presentations. Critique and redesign a small portfolio dashboard, make sample limitations visible, and include a stakeholder readout. Use Power BI as the familiar baseline; keep other BI tools at awareness depth. |
| Technical communication and portfolio defense / `data-communication-portfolio` | CM1–CM4, IV3, PF10–PF11 | Turn ambiguous requests into decision/grain/acceptance criteria; practise metric specs, concise design docs, decision records, READMEs, PR explanations, incident updates, six evidence-based STAR stories and a three-minute portfolio demo. Include prompts and before/after examples; never invent achievements. |

## How to use the catalogue without expanding the plan

1. Start with Python foundations, Python files/streams, pandas, and dbt foundations, in that order. Introduce the remaining Stage 1 decks alongside their tracker topics.
2. Study the lesson, attempt the exercise without AI, then reveal hints and solutions. Produce the tracker deliverable before treating a deck as completed.
3. Keep v1 local and bounded: PF1 plus PF3. Spark and Delta begin as learning labs; Airflow, a deployed lakehouse, hosted semantic APIs, AI and cloud infrastructure belong to later releases.
4. Use the Stage 2 application checkpoint from your plan. Later decks do not delay applications.
5. Keep setup in the existing uv/DuckDB references. Use templates/checklists for career work unless a teaching deck would actually help you.
6. Generate software-specific decks just before use. Product names, versions, adapters, APIs and account limits in the plan need checking at that time; its introductory market claims are not required teaching material.

## Source basis

Local curriculum: [prep plan](../data-engineer-prep-plan.md), [tracker topics and acceptance criteria](../de-tracker/data.js), and the existing materials named above. The grouping and priorities here are recommendations inferred from your curriculum and preferred teaching style, not claims about a universal interview syllabus.

Official references checked while shaping the prompts:

- [Python tutorial](https://docs.python.org/3/tutorial/): language foundations, data structures, exceptions, generators, modules and I/O; the tutorial is aimed at people who already understand programming.
- [pandas comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html): supports teaching pandas through familiar SQL operations.
- [dbt incremental models](https://docs.getdbt.com/docs/build/incremental-models): reference for the advanced dbt deck's incremental logic and configuration.
- [Airflow best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html): reference for reliable task design and operational exercises.
