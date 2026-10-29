# Practical reading map

Reviewed: **2026-10-21**. This supersedes the October 20 selection. Short modeling definitions and opinion-only pieces were removed. The collection now contains 37 selected practical reads, mapped to 47 lessons, alongside the focused references, practice sites and core books retained by the full resource audit.

Use **Resources → By lesson → Start with five** or **Show production reading**. A selection may be a primary lesson pick or appear in its collapsed Production reading section; it is shown once per lesson. Reading ticks do not complete a lesson.

## Selection standard

Prefer a worked scenario with data/model/query/configuration examples, a tool walkthrough with meaningful steps, or a production account that explains failures, design choices and results. A respected author or a free page is not enough. Short definitions, unbounded feeds and product-positioning articles are not practical learning selections. Focused API references remain useful alongside articles; reading the docs is different from reproducing a use case.

Descriptions summarize what the source contains. The suggested exercises are editorial adaptations for this roadmap, not evidence that the source implements the flights project. Free refers to article access, not the services used in examples. Historical articles are labeled with engine/version caveats.

## Start with five when their lessons are relevant

1. [Preventing common analytical errors: Join duplicates and join misses — Alex Petralia](https://alexpetralia.com/2017/07/19/more-dangerous-subtleties-of-joins-in-sql/) — Joins and grain (S4) · Fact tables (M2). A worked example of joins silently inflating revenue or losing costs. Learn to check cardinality and unmatched keys before trusting aggregates.
2. [On the limits of incrementality — Tristan Handy / dbt Community](https://discourse.getdbt.com/t/on-the-limits-of-incrementality/303) — Warehouse writes (S8) · Incremental, snapshots, unit tests (D3). SQL examples show why a maximum-timestamp filter misses old corrections, and how lookback windows and changed-entity rebuilds trade correctness against work.
3. [Timeouts, retries, and backoff with jitter — Amazon Builders’ Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — Ingestion engineering (Py3) · Airflow authoring (AF2). Production experience explains how retries can amplify an outage and why timeout selection, bounded backoff and jitter matter.
4. [How to write integration tests for Python data pipelines (Start Data Engineering)](https://www.startdataengineering.com/post/python-datapipeline-integration-test/) — Python quality & tooling (Py4). A worked pytest example tests the boundaries between a Python pipeline and external systems, including unexpected output schemas and API behavior.
5. [Building a Kimball dimensional model with dbt](https://docs.getdbt.com/blog/kimball-dimensional-model) — Why dimensional modeling (M1) · Fact tables (M2). A complete worked example with source data, a repository, dimension and fact SQL, surrogate keys and model documentation; includes a local DuckDB option.

## Stronger modeling resources

| Need | Selection | What is actually in it |
| --- | --- | --- |
| Why dimensional modeling (M1) · Fact tables (M2) | [Building a Kimball dimensional model with dbt](https://docs.getdbt.com/blog/kimball-dimensional-model) | A complete worked example with source data, a repository, dimension and fact SQL, surrogate keys and model documentation; includes a local DuckDB option. |
| Modern modeling adaptations (M4) | [Implementing a dimensional warehouse: tables, keys and metadata — Databricks, Part 1](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-1) | Uses AdventureWorks to turn a logical star schema into physical dimension and fact tables, covering data types, keys, constraints and metadata. |
| Dimension tables (M3) | [Dimension ETL with Type 1, Type 2 and late-arriving members — Databricks, Part 2](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-2) | A step-by-step AdventureWorks implementation stages source data, detects changes, repairs placeholder dimensions, expires old SCD2 rows and inserts new versions. |
| Fact tables (M2) | [Fact ETL: changed records, dimension lookups and late members — Databricks, Part 3](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-3) | Works through an incremental sales fact load, including changed rows, missing dimension members, a continuous date dimension and surrogate-key lookup. |
| Dimension tables (M3) · Incremental, snapshots, unit tests (D3) | [Track changing order status with dbt snapshots — dbt Labs](https://www.getdbt.com/blog/track-data-changes-with-dbt-snapshots) | Follows a mutable order through status changes and shows how snapshot validity rows preserve history that the operational table overwrites. |
| Dimension tables (M3) · Joins and grain (S4) | [Tackling the complexity of joining snapshots — dbt Developer Blog](https://docs.getdbt.com/blog/joining-snapshot-complexity) | Uses two independently changing datasets and worked SQL to join only overlapping validity intervals instead of multiplying every historical row per entity. |
| Semantic layer modeling (M5) | [Many-to-many model options compared with DAX and query plans — SQLBI](https://www.sqlbi.com/articles/different-options-to-model-many-to-many-relationships-in-power-bi-and-tabular/) | Builds a customer-to-sport bridge scenario and compares filter paths, query plans and performance for alternative relationship designs. |

Follow the design and SQL sections during modeling. Reproduce dbt or Databricks-specific execution after the corresponding tool lesson. Use current configuration for your installed version.

## Production gaps supported by the reading

These are suggested failure exercises within existing lessons, not a new curriculum. Existing decks already cover the surrounding theory.

- **Warehouse writes (S8) · Ingestion engineering (Py3):** Atomic publication and crash recovery are not explicit standalone practice in the current ingestion lesson. [Source](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- **Pipeline patterns (A1) · Ingestion tools & CDC (PL5):** The transactional outbox and the dual-write problem are missing from explicit CDC practice. [Source](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/)
- **Streaming (awareness) (PL7):** The boundary between broker guarantees and external sink effects needs a concrete failure exercise. [Source](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)
- **Streaming (awareness) (PL7) · Pipeline patterns (A1):** Watermarks, completeness and late-event policy are not explicit learning outcomes in the streaming overview. [Source](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-102/)
- **Incidents & trust (Q4) · Reliability (A4):** A measured restore drill with recovery-time and recovery-point objectives is missing from explicit reliability practice. [Source](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/)
- **Governance & security (A5) · Cloud fundamentals & IAM (PL1):** Deletion-versus-replay behavior is not an explicit exercise in governance or backfills. [Source](https://engineering.atspotify.com/2018/9/scalable-user-privacy)
- **Agents over data (AI3) · Unstructured data for AI (AI6):** Prompt-injection testing is missing from the current agent and retrieval practice. [Source](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- **Dimension tables (M3):** Provides the worked late-arriving-dimension repair missing from the original lesson practice. [Source](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-2)

## Complete reading map

### 1. Preventing common analytical errors: Join duplicates and join misses — Alex Petralia

[Read](https://alexpetralia.com/2017/07/19/more-dangerous-subtleties-of-joins-in-sql/)

- **Lessons:** Joins and grain (S4) · Fact tables (M2)
- **Contains:** A worked example of joins silently inflating revenue or losing costs. Learn to check cardinality and unmatched keys before trusting aggregates.
- **Try:** Duplicate an airport lookup key, join it to flights, and catch the changed flight count and cancellation denominator with assertions.

### 2. On the limits of incrementality — Tristan Handy / dbt Community

[Read](https://discourse.getdbt.com/t/on-the-limits-of-incrementality/303)

- **Lessons:** Warehouse writes (S8) · Incremental, snapshots, unit tests (D3)
- **Contains:** SQL examples show why a maximum-timestamp filter misses old corrections, and how lookback windows and changed-entity rebuilds trade correctness against work.
- **Try:** Correct a flight outside a three-day lookback. Compare the incremental result with a full rebuild, then rebuild the affected month.
- **Context:** Older warehouse-specific SQL: adapt syntax and benchmark your adapter; a fixed lookback cannot guarantee complete correction handling.

### 3. Timeouts, retries, and backoff with jitter — Amazon Builders’ Library

[Read](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

- **Lessons:** Ingestion engineering (Py3) · Airflow authoring (AF2)
- **Contains:** Production experience explains how retries can amplify an outage and why timeout selection, bounded backoff and jitter matter.
- **Try:** Use a fake downloader returning a timeout, 429 and 503. Verify bounded retries, jitter, Retry-After handling and failure after the retry budget.

### 4. Making retries safe with idempotent APIs — Amazon Builders’ Library

[Read](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

- **Lessons:** Warehouse writes (S8) · Ingestion engineering (Py3)
- **Contains:** An ambiguous timeout may follow a successful write. Request identity, repeated intent and atomic state changes explain what safe retries actually require.
- **Try:** Simulate a crash after writing a monthly partition but before acknowledging success. Re-run using a manifest and checksum; publish one complete result.
- **Context:** The manifest exercise transfers the article’s design principles to files; an API request token alone does not make filesystem writes atomic.

### 5. Semantics of timezone-aware datetime arithmetic — Paul Ganssle

[Read](https://blog.ganssle.io/articles/2018/02/aware-datetime-arithmetic.html)

- **Lessons:** Time-based analysis (S5) · Python for data engineering (Py1)
- **Contains:** Worked Python examples distinguish elapsed time from local wall-clock time across daylight-saving changes.
- **Try:** Test a spring DST boundary: compare the next local calendar day with 24 elapsed hours. Convert endpoints to UTC before measuring elapsed duration.
- **Context:** Read after basic datetime/zoneinfo. Examples use dateutil; adapt them to zoneinfo. Flights v1 keeps BTS delay fields; full timestamp reconstruction belongs to the weather extension.

### 6. Memory Management in DuckDB — DuckDB Engineering

[Read](https://duckdb.org/2024/07/09/memory-management)

- **Lessons:** DataFrames: pandas & Polars (Py2) · Columnar warehouses (P3)
- **Contains:** Explains chunked execution, intermediate-state spilling and the buffer manager, making larger-than-memory processing concrete.
- **Try:** Convert a bounded flight CSV to Parquet directly in DuckDB under a memory limit. Contrast it with materializing a DataFrame and record peak memory.
- **Context:** Spilling has limits and needs disk space; larger-than-memory support does not guarantee every query can finish under any memory limit.

### 7. Optimizers: The Low-Key MVP — DuckDB Engineering

[Read](https://duckdb.org/2024/11/14/optimizers)

- **Lessons:** How a query runs (P1) · Query structure and style (S6)
- **Contains:** Executable SQL and plans reveal filter pushdown, join ordering and Top-N optimization. Useful evidence when query shape and speed do not match intuition.
- **Try:** Write equivalent CTE, subquery and join versions of a route query. Compare EXPLAIN ANALYZE plans and results before claiming one spelling is faster.
- **Context:** Optimizer behavior varies by engine and version; the article is not a universal CTE-versus-subquery rule.

### 8. Chad Sanderson: An engineer's guide to data contracts, pt. 1

[Read](https://dataproducts.substack.com/p/an-engineers-guide-to-data-contracts)

- **Lessons:** Data contracts (Q2) · dbt governance & scale (D5)
- **Contains:** Convoy engineers walk through entity contracts, schema enforcement and CDC fulfillment using open-source components; the full first part is free on Substack.
- **Try:** Define required flight fields, a schema version, an owner and a breaking-change policy. Add a fixture that changes a field type and verify rejection before publication.
- **Context:** A dbt model contract checks the output shape; it is not the same thing as an enforced producer-to-consumer agreement.

### 9. Reliable Microservices Data Exchange With the Outbox Pattern — Debezium

[Read](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/)

- **Lessons:** Pipeline patterns (A1) · Ingestion tools & CDC (PL5)
- **Contains:** A runnable design addresses the dual-write failure: committing a database change while failing to publish its corresponding event.
- **Try:** Standalone lab: insert an order and its outbox row in one database transaction, simulate publisher failure, then replay with consumer deduplication.
- **Context:** Use current connector configuration, not the article’s historical package names. This is a separate lab; monthly BTS downloads do not require Kafka or an outbox.

### 10. Exactly-Once Semantics Are Possible: Here’s How Kafka Does It — Confluent Engineering

[Read](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)

- **Lessons:** Streaming (awareness) (PL7)
- **Contains:** The engineers behind Kafka’s transactions explain producer idempotence, failure recovery and the scope of transactional stream processing.
- **Try:** Draw Kafka → consumer → SQL sink and mark the crash between the database commit and offset commit. Demonstrate how a unique event key prevents duplicate effects.
- **Context:** Historical implementation article: use current Kafka docs for settings. Kafka transactions do not automatically make an external database or HTTP call exactly once.

### 11. Streaming 102: The world beyond batch — Tyler Akidau / O’Reilly Radar

[Read](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-102/)

- **Lessons:** Streaming (awareness) (PL7) · Pipeline patterns (A1)
- **Contains:** Animated examples separate event time, processing time, windows, watermarks and triggers, showing why a result may need later correction.
- **Try:** Standalone lab: process five out-of-order events on paper, then compute results with and without allowed lateness; state when a window is considered complete.
- **Context:** Read the linked Streaming 101 introduction first if unfamiliar. Concepts transfer across engines; the historical APIs are not a current Spark recipe.

### 12. How to write integration tests for Python data pipelines (Start Data Engineering)

[Read](https://www.startdataengineering.com/post/python-datapipeline-integration-test/)

- **Lessons:** Python quality & tooling (Py4)
- **Contains:** A worked pytest example tests the boundaries between a Python pipeline and external systems, including unexpected output schemas and API behavior.
- **Try:** Test CSV download → parsing → Parquet publication with tiny fixtures. Include a malformed response and reordered input columns; assert the final schema and rows.

### 13. Airflow docs: Backfill

[Read](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/backfill.html)

- **Lessons:** Airflow authoring (AF2) · Airflow ops & alternatives (AF4)
- **Contains:** Current Airflow guidance covers reprocessing choices, concurrency limits, ordering and dry runs for historical DAG runs.
- **Try:** Dry-run a three-month BTS backfill, cap active runs and rerun a corrected month. Verify untouched months and identical row counts on a repeat.
- **Context:** Use the documentation matching your installed Airflow version. Schedule source publication intervals; BTS monthly files are not a live daily feed.

### 14. Data Processing Pipelines — Google SRE Workbook / Spotify

[Read](https://sre.google/workbook/data-processing/)

- **Lessons:** Airflow core concepts (AF1) · Reliability (A4)
- **Contains:** Production pipeline design connects correctness, timeliness, capacity, dependencies and operational reliability rather than treating a successful task as sufficient.
- **Try:** Write the dependency graph and completion condition for one flight release. Simulate a missing source month and prevent a partial dashboard refresh from being published.

### 15. How Uber Achieves Operational Excellence in the Data Quality Experience — Uber Engineering

[Read](https://www.uber.com/us/en/blog/operational-excellence-data-quality/)

- **Lessons:** Observability (Q3) · Incidents & trust (Q4)
- **Contains:** Shows how quality checks connect to alert ownership and incident resolution, including the cost of false positives and manual work.
- **Try:** Remove one airport from a fixture month. Detect the regional coverage drop, assign an owner, and record impact, diagnosis and recovery in a runbook.
- **Context:** Use simple checks first; the case study is a design example, not a requirement to recreate Uber’s platform.

### 16. Alerting on SLOs — Google SRE Workbook

[Read](https://sre.google/workbook/alerting-on-slos/)

- **Lessons:** Observability (Q3) · Airflow integrations (AF3)
- **Contains:** Worked alert strategies explain precision, recall, detection time and error-budget burn instead of alerting on every failed check.
- **Try:** For monthly BTS ingestion, define freshness relative to observed source publication, then distinguish a transient retry from a missed publication deadline.
- **Context:** The examples concern request-based services. Adapt the reasoning to batch freshness and completeness; do not copy request error-rate thresholds literally.

### 17. Postmortem of database outage of January 31 — GitLab Engineering

[Read](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/)

- **Lessons:** Incidents & trust (Q4) · Reliability (A4)
- **Contains:** A real incident exposes the difference between having backup mechanisms and having a recovery procedure that works under pressure.
- **Try:** In a disposable copy, delete a derived flight partition, restore or rebuild it from retained inputs, and record recovery time and any unrecoverable changes.

### 18. Scalable User Privacy — Spotify Engineering

[Read](https://engineering.atspotify.com/2018/9/scalable-user-privacy)

- **Lessons:** Governance & security (A5) · Cloud fundamentals & IAM (PL1)
- **Contains:** A real privacy architecture explains user-specific encryption keys and data lifecycle control across many services and batch pipelines.
- **Try:** Standalone synthetic-user lab: delete a user from raw, derived and cached data; replay an old input and verify that the user is not reintroduced.
- **Context:** Study the engineering trade-off, not a universal compliance recipe. Public BTS flight records do not require inventing passenger data; keep this lab synthetic.

### 19. Delta Lake Small File Compaction with OPTIMIZE — Delta Lake

[Read](https://delta.io/blog/2023-01-25-delta-lake-small-file-compaction-optimize/)

- **Lessons:** Delta Lake + Iceberg basics (SB3) · Spark performance (SB5)
- **Contains:** A small runnable example shows how repeated writes produce file overhead and how compaction changes physical layout without changing logical rows.
- **Try:** On a disposable Delta fixture, create many small files, compact them, and compare file count, row checksums and repeated scan timings.
- **Context:** Skip the article’s zero-retention VACUUM demonstration: it removes rollback history. Choose retention for readers and recovery needs, using current Delta guidance.

### 20. Estimate and control costs — BigQuery practical guide

[Read](https://docs.cloud.google.com/bigquery/docs/best-practices-costs)

- **Lessons:** Materialization & cost (FinOps) (P5) · BigQuery (PL4)
- **Contains:** Concrete examples cover dry runs, bytes estimates, maximum bytes billed and query patterns that unexpectedly scan more data.
- **Try:** Optional BigQuery lab: dry-run a bounded public-table query with and without a partition filter; record estimated bytes and set a maximum before execution.
- **Context:** Reading is free; cloud execution may cost money. Use current pricing and limits. A LIMIT clause is not a general scan-cost cap.

### 21. Diagnosing Sample Ratio Mismatch in A/B Testing — Microsoft Research

[Read](https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/)

- **Lessons:** Experimentation (BZ4) · Statistics in Python (Py6)
- **Contains:** Real experiment examples show how missing or selectively filtered users can reverse a conclusion even when the final metric looks reasonable.
- **Try:** Standalone experiment lab: generate a 50/50 assignment, selectively drop treatment users, run a chi-square SRM check and stop interpretation until the logging issue is understood.
- **Context:** The flights project is observational; do not present route or weather comparisons as randomized treatment effects.

### 22. Demystifying evals for AI agents — Anthropic Engineering

[Read](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)

- **Lessons:** Evaluating AI analytics (AI4)
- **Contains:** Concrete evaluation design separates tasks, graders, agent traces and outcomes, and explains how to start with observed failures.
- **Try:** For the later flight assistant, grade result correctness, source citation and insufficient-data refusal separately. Preserve failed cases as regression tests.
- **Context:** The article is free. Running a hosted model can cost money; evaluation design and fixture-based checks can be prepared offline.

### 23. The lethal trifecta for AI agents — Simon Willison

[Read](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)

- **Lessons:** Agents over data (AI3) · Unstructured data for AI (AI6)
- **Contains:** Practical examples explain prompt injection when an agent combines private data, untrusted retrieved content and external communication.
- **Try:** Put a malicious instruction in a synthetic retrieved document. Verify that it cannot trigger a write, secret lookup or external request; enforce permissions outside the model.
- **Context:** Read-only SQL access alone does not prevent data leakage if other tools can send data out.

### 24. A Dirty Dozen: Twelve Common Metric Interpretation Pitfalls — Microsoft Research (PDF)

[Read](https://www.microsoft.com/en-us/research/wp-content/uploads/2020/08/2017-08-KDDMetricInterpretationPitfalls.pdf)

- **Lessons:** Metric design (BZ2) · Diagnosing metric changes (BZ5)
- **Contains:** A freely available paper uses real experiment puzzles to show why a metric movement needs denominator, population and interpretation checks.
- **Try:** Construct a two-airport example where the overall cancellation rate improves while each airport worsens. Explain the mix shift using counts and rates.
- **Context:** The paper concerns experiments. The mix-shift exercise transfers the diagnostic reasoning to observational flight metrics without making causal claims.

### 25. Visualizing uncertainty — Claus Wilke / Fundamentals of Data Visualization

[Read](https://clauswilke.com/dataviz/visualizing-uncertainty.html)

- **Lessons:** Storytelling & dashboards (CM3) · Statistics essentials (BZ3)
- **Contains:** A free illustrated chapter compares frequency framing, error bars and uncertainty displays for audiences with different levels of statistical knowledge.
- **Try:** Show flight comparison sample sizes and coverage beside the rate. Sketch how an uncertainty display could explain why a tiny route sample cannot support a confident ranking.
- **Context:** A sample-size threshold is a product guardrail, not a confidence interval or proof that two airlines differ.

### 26. Writing memory-efficient data pipelines in Python (Start Data Engineering)

[Read](https://www.startdataengineering.com/post/writing-memory-efficient-dps-in-python/)

- **Lessons:** Python for data engineering (Py1)
- **Contains:** Runnable Python examples use generators and mini-batches instead of collecting every record in memory.
- **Try:** Read a gzip CSV through a generator, validate rows in bounded batches, and measure peak memory against an eager list implementation.
- **Context:** Examples are older; follow the streaming pattern and current library APIs rather than copying dependency versions.

### 27. Building a Kimball dimensional model with dbt

[Read](https://docs.getdbt.com/blog/kimball-dimensional-model)

- **Lessons:** Why dimensional modeling (M1) · Fact tables (M2)
- **Contains:** A complete worked example with source data, a repository, dimension and fact SQL, surrogate keys and model documentation; includes a local DuckDB option.
- **Try:** Identify the business process and grain, then reproduce one dimension and one fact. Adapt the pattern to flight-leg data and verify key uniqueness and join counts.
- **Context:** During modeling, focus on the design and SQL sections; run the dbt project after the dbt foundations lesson. Use current adapter versions instead of old pins.

### 28. Implementing a dimensional warehouse: tables, keys and metadata — Databricks, Part 1

[Read](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-1)

- **Lessons:** Modern modeling adaptations (M4)
- **Contains:** Uses AdventureWorks to turn a logical star schema into physical dimension and fact tables, covering data types, keys, constraints and metadata.
- **Try:** Write the equivalent local DuckDB DDL for a flight fact and role-playing airport dimension. Document which constraints are actually enforced by each engine.
- **Context:** Databricks-specific syntax and platform behavior do not transfer unchanged. You can study the DDL locally before the later Databricks lesson.

### 29. Dimension ETL with Type 1, Type 2 and late-arriving members — Databricks, Part 2

[Read](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-2)

- **Lessons:** Dimension tables (M3)
- **Contains:** A step-by-step AdventureWorks implementation stages source data, detects changes, repairs placeholder dimensions, expires old SCD2 rows and inserts new versions.
- **Try:** Replay two dimension changes, an unchanged batch and a late-arriving member. Assert one current row per business key and non-overlapping validity intervals.
- **Context:** Translate Databricks SQL functions and execution assumptions to your engine. Keep the staging and version-expiry steps consistent during a load.

### 30. Fact ETL: changed records, dimension lookups and late members — Databricks, Part 3

[Read](https://www.databricks.com/blog/implementing-dimensional-data-warehouse-databricks-sql-part-3)

- **Lessons:** Fact tables (M2)
- **Contains:** Works through an incremental sales fact load, including changed rows, missing dimension members, a continuous date dimension and surrogate-key lookup.
- **Try:** Load a small transaction fact twice, then change a source row and add a previously missing dimension member. Reconcile row counts and measures after every step.
- **Context:** This is an engine-specific implementation, not a complete guarantee for arbitrary source corrections. Test watermarks, ties, deletes and old corrections against your own source contract.

### 31. Track changing order status with dbt snapshots — dbt Labs

[Read](https://www.getdbt.com/blog/track-data-changes-with-dbt-snapshots)

- **Lessons:** Dimension tables (M3) · Incremental, snapshots, unit tests (D3)
- **Contains:** Follows a mutable order through status changes and shows how snapshot validity rows preserve history that the operational table overwrites.
- **Try:** Change an order from pending to shipped, run a snapshot twice, and query its earlier state. Explain which transitions were invisible between snapshot runs.
- **Context:** The historical example uses older snapshot configuration. Follow current dbt snapshot syntax and distinguish observation time from the source’s true event time.

### 32. Tackling the complexity of joining snapshots — dbt Developer Blog

[Read](https://docs.getdbt.com/blog/joining-snapshot-complexity)

- **Lessons:** Dimension tables (M3) · Joins and grain (S4)
- **Contains:** Uses two independently changing datasets and worked SQL to join only overlapping validity intervals instead of multiplying every historical row per entity.
- **Try:** Create two histories with different change dates, compute interval overlaps and assert the expected timeline. Test equal boundaries and open-ended current rows.
- **Context:** Study the interval logic, not a universal complexity claim. Adapt macros and sentinel values to your warehouse and use a consistent half-open interval convention.

### 33. Many-to-many model options compared with DAX and query plans — SQLBI

[Read](https://www.sqlbi.com/articles/different-options-to-model-many-to-many-relationships-in-power-bi-and-tabular/)

- **Lessons:** Semantic layer modeling (M5)
- **Contains:** Builds a customer-to-sport bridge scenario and compares filter paths, query plans and performance for alternative relationship designs.
- **Try:** Model customers who play multiple sports. Compare a bridge design with a limited relationship, checking totals and filter propagation before timing queries.
- **Context:** This is Power BI/Tabular-specific. Do not apply its relationship or performance conclusions as universal SQL warehouse rules.

### 34. Composite index column order: worked queries and execution plans — Use The Index, Luke!

[Read](https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys)

- **Lessons:** Row-store indexing (P2)
- **Contains:** A company-merger example changes the employee key, then compares queries and plans before and after reversing a composite index.
- **Try:** In PostgreSQL, compare indexes on (airline, flight_date) and (flight_date, airline) for selective filters. Record actual plans and rows rather than assuming one order always wins.
- **Context:** The article includes older Oracle-style plans. Verify current engine behavior, statistics and scan choices; small test tables may reasonably use a sequential scan.

### 35. Hash joins: filter indexes, projected columns and measured plans — Use The Index, Luke!

[Read](https://use-the-index-luke.com/sql/join/hash-join-partial-objects)

- **Lessons:** Row-store indexing (P2)
- **Contains:** Uses a sales-to-employee query and several engines’ plans to show how selective predicates and unnecessary columns affect a hash join.
- **Try:** Compare SELECT * with a narrow projection and a date filter on a join. Inspect scan volume, hash-table size and runtime while confirming identical required output.
- **Context:** Translate date syntax and inspect the plan your engine actually chooses. An index on a join key is not an automatic improvement for every join strategy.

### 36. Semantic models and metric queries on Jaffle Shop — dbt Labs / MetricFlow

[Read](https://www.getdbt.com/blog/how-the-dbt-semantic-layer-works)

- **Lessons:** Semantic layer modeling (M5) · Semantic layer for AI (AI1)
- **Contains:** A worked Jaffle Shop example defines entities, measures and metrics in YAML, then explains how metric requests become SQL. Links to the example repository.
- **Try:** Define a numerator, denominator and cancellation-rate metric over a flight mart. Inspect generated SQL and compare the result with a handwritten query at the same grain.
- **Context:** Some hosted APIs shown require a paid dbt plan. Read and inspect the example freely; follow the current MetricFlow version and distinguish local modeling from hosted API access.

### 37. GitLab dbt guide

[Read](https://handbook.gitlab.com/handbook/enterprise-data/platform/dbt-guide/)

- **Lessons:** dbt deployment & CI (D4) · Test strategy (Q1)
- **Contains:** GitLab publishes its actual dbt working practices, commands, model conventions, testing and deployment procedures, with concrete configuration examples.
- **Try:** Read the testing and CI sections, then add a failure fixture to an isolated dbt branch and explain which check should block a merge.
- **Context:** Read the named sections rather than the entire handbook. GitLab’s infrastructure and conventions are company-specific, not a template to copy wholesale.

## Full catalog audit

See [resource-quality-review.md](resource-quality-review.md) and its machine-readable companion for every keep/remove decision. The app retains retired identities solely to preserve saved ticks and import/export compatibility; they do not appear in the Library, lesson recommendations or portfolio references.
