# Data landscape: tools, formats and concepts

Researched 2026-10-22. 112 core terms in 14 purpose groups, backed by 101 primary sources.

Generated from `tracker/content/data-landscape.cjs`; the interactive reference is the tracker’s **Data map** page (`#data-map`).

This is a role map, not an exhaustive vendor catalog or a compatibility certification. Definitions and distinguishing facts use the linked project documentation, specifications and original architecture writing. Examples and practical cautions are synthesized guidance. Product roles overlap; exact features, prices and connector behavior depend on version and configuration. No paid service is required to use the reference itself.

## How to read it

- Storage keeps bytes. File formats encode values. Table formats manage table state. Catalogs resolve metadata. Engines execute work. Platforms bundle capabilities.
- Following a labeled relationship tells you how pieces fit; it does not declare a universal migration or deployment recipe.
- Each entry includes its purpose, distinguishing feature, caveat, connections and primary sources.

## Common mix-ups

### Hive vs Metastore

Hive can execute SQL. Hive Metastore describes tables and their locations; other engines can use it without running Hive queries.

### Spark vs Presto / Trino

All perform computation. Spark provides broad processing APIs; Presto and Trino focus on distributed SQL through connectors. Present-day PrestoDB and Trino are distinct projects.

### Parquet vs Iceberg / Delta

Parquet describes values inside files. Iceberg and Delta describe changing table state across files. They usually work together rather than replacing one another.

### Arrow vs Parquet

Arrow emphasizes columnar memory and interchange; Parquet emphasizes persistent analytical files with encoding and compression. Arrow also has IPC serialization.

### dbt vs Airflow

dbt defines and builds analytical models on a target engine. Airflow coordinates task dependencies, scheduling and retries; it can trigger a dbt build.

### Lakehouse vs Mesh

Lakehouse addresses data storage, table management and execution. Mesh addresses domain ownership, data products, self-serve infrastructure and shared governance. They can coexist.

## Example stacks

### A lake query

Amazon S3 — **holds files in** → Parquet — **data tracked by** → Apache Iceberg — **registered in** → AWS Glue Data Catalog — **metadata used by** → Trino

One possible read path: bytes, encoding, table state, catalog and engine. Exact write/read features depend on the chosen versions and configuration.

Other pieces you may encounter: Hive Metastore, Apache Hive, Apache Spark.

### Your flights v1

CSV — **read by** → Python ingestion — **writes typed** → Parquet — **queried by** → DuckDB — **model SQL from** → dbt — **models viewed in** → Streamlit

A local first release. dbt generates model SQL for DuckDB; the app consumes the resulting data. This does not require a cloud lakehouse.

Keep the result reliable: pytest, Data tests, Idempotency.

### Events to analytics

PostgreSQL — **changes captured by** → Debezium — **events sent to** → Apache Kafka — **consumed by** → Apache Flink — **writes through a supported sink** → Apache Iceberg

An illustrative CDC path. A sink applies the events; capture alone does not build the destination table. End-to-end guarantees need proof.

Message and timing decisions: Avro, Schema registry, Event-time watermark.

## Move data

**How does it get here?** Connectors copy records; CDC captures changes. Neither defines your business metrics.

<a id="python"></a>
### Python ingestion

*tool · Custom API and file extraction*

**What it is:** A script that retrieves source data and records how it was obtained.

**Why use it:** Useful when source behavior or validation needs custom code.

**What sets it apart:** You own pagination, timeouts, retry policy and checkpoints.

**Good to know:** Retain source versions and test with offline fixtures; a successful download does not prove completeness.

**Connections:**

- Can delegate loading to → [dlt](#dlt)
- Can publish typed data as → [Parquet](#parquet)
- Needs safe replay → [Idempotency](#idempotency)

**Sources:** [HTTPX: HTTP requests, status codes and errors](https://www.python-httpx.org/quickstart/) · [dlt: Python ingestion](https://dlthub.com/docs/intro)

<a id="dlt"></a>
### dlt

*tool · Python-first extraction and loading*

**What it is:** A Python library for loading source data into structured destination datasets.

**Why use it:** Reduces custom normalization, load-state and destination plumbing.

**What sets it apart:** A code-first ingestion library rather than a warehouse or scheduler.

**Good to know:** Check the source, destination and incremental-state semantics. This is not Databricks’ former Delta Live Tables name.

**Connections:**

- Used from → [Python ingestion](#python)
- Can load into → [DuckDB](#duckdb)
- Can track incremental loading → [Incremental load](#incremental)

**Sources:** [dlt: Python ingestion](https://dlthub.com/docs/intro)

<a id="airbyte"></a>
### Airbyte

*tool · Connector-based replication*

**What it is:** A platform that syncs configured sources to destinations.

**Why use it:** Useful when supported connectors can replace bespoke extraction work.

**What sets it apart:** A configured connection combines source, destination, schedule and sync mode.

**Good to know:** Connector support and deletion/history behavior vary. Self-managed operation still takes work.

**Connections:**

- Some connectors support → [CDC](#cdc)
- Can feed transformation models → [dbt](#dbt)
- Compare replication approach with → [Fivetran](#fivetran)

**Sources:** [Airbyte: replication core concepts](https://docs.airbyte.com/platform/using-airbyte/core-concepts)

<a id="fivetran"></a>
### Fivetran

*tool · Managed source replication*

**What it is:** A managed service for moving supported source data to analytical destinations.

**Why use it:** Useful when a team wants managed connector operations.

**What sets it apart:** Trades managed ingestion convenience against service cost and connector-specific behavior.

**Good to know:** Confirm source permissions, deletion handling, sync latency and the billing unit for the exact connector.

**Connections:**

- Compare replication approach with → [Airbyte](#airbyte)
- Can load a warehouse such as → [Snowflake](#snowflake)
- May capture database changes with → [CDC](#cdc)

**Sources:** [Fivetran: connectors and destinations](https://fivetran.com/docs/getting-started)

<a id="cdc"></a>
### CDC

*concept · Capture inserts, updates and deletes*

**What it is:** Change data capture propagates source changes rather than repeatedly copying the whole source.

**Why use it:** Keeps analytical copies current with less full-table extraction.

**What sets it apart:** Log-based capture reads a database change log; polling checks queries or timestamps.

**Good to know:** Source ordering, delete events, initial snapshots and replay policy matter as much as capture.

**Connections:**

- Implemented by → [Debezium](#debezium)
- Often transports events through → [Apache Kafka](#kafka)
- Feeds incremental application → [Incremental load](#incremental)

**Sources:** [Debezium: architecture and deployment options](https://debezium.io/documentation/reference/stable/architecture.html)

<a id="debezium"></a>
### Debezium

*tool · Database change-event capture*

**What it is:** Source connectors turn database changes into events.

**Why use it:** Useful for feeding analytics and other consumers from operational changes.

**What sets it apart:** Capture is separate from applying events to a destination table.

**Good to know:** Kafka Connect is a common deployment; Debezium Server and embedded options also exist.

**Connections:**

- Implements → [CDC](#cdc)
- Common deployment runtime → [Kafka Connect](#kafka-connect)
- Can publish events to → [Apache Kafka](#kafka)

**Sources:** [Debezium: architecture and deployment options](https://debezium.io/documentation/reference/stable/architecture.html)

<a id="etl"></a>
### ETL / ELT

*concept · Where transformation happens*

**What it is:** ETL transforms before loading the target; ELT loads it before transformation there.

**Why use it:** Makes the placement of processing and validation explicit.

**What sets it apart:** The acronym depends on which target boundary you mean.

**Good to know:** One pipeline can do both at different boundaries. Neither guarantees trusted data.

**Connections:**

- Often transforms after loading → [dbt](#dbt)
- Can be the target → [Data warehouse](#warehouse)
- Can retain raw inputs → [Data lake](#lake)

**Sources:** [dbt: introduction](https://docs.getdbt.com/docs/introduction) · [dlt: Python ingestion](https://dlthub.com/docs/intro)

## Keep the bytes

**Where does the data live?** Storage holds objects or files. An engine still has to interpret and query them.

<a id="object-storage"></a>
### Object storage

*concept · Objects addressed by keys*

**What it is:** Storage organized as named objects in containers such as buckets.

**Why use it:** Separates retained data from the life of a compute machine.

**What sets it apart:** General-purpose object keys often look like folders; this is not the same interface as a local filesystem.

**Good to know:** Object consistency alone does not make a group of writes one table transaction.

**Connections:**

- AWS implementation → [Amazon S3](#s3)
- Azure analytics storage → [ADLS Gen2](#adls)
- Google implementation → [Cloud Storage](#gcs)
- Often underlies → [Data lake](#lake)

**Sources:** [AWS: Amazon S3 concepts](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)

<a id="s3"></a>
### Amazon S3

*tool · AWS object storage*

**What it is:** An object service for data in buckets addressed by keys.

**Why use it:** Often retains lake data, source archives and backups.

**What sets it apart:** Stores bytes independently of Spark, Trino or warehouse compute.

**Good to know:** Choose access and lifecycle policies deliberately; do not treat a normal bucket like a mounted local disk.

**Connections:**

- Implements → [Object storage](#object-storage)
- Can hold files encoded as → [Parquet](#parquet)
- Can hold data files for → [Apache Iceberg](#iceberg)

**Sources:** [AWS: Amazon S3 concepts](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)

<a id="adls"></a>
### ADLS Gen2

*tool · Azure lake storage capabilities*

**What it is:** Azure Data Lake Storage capabilities built on Blob Storage.

**Why use it:** Supports analytics with a hierarchical namespace and data access controls.

**What sets it apart:** Adds filesystem-oriented namespace capabilities to object storage.

**Good to know:** ADLS is storage, not Azure Data Factory and not a table format.

**Connections:**

- Built on object storage → [Object storage](#object-storage)
- Can receive data moved by → [Azure Data Factory](#adf)
- Can hold tables represented by → [Delta Lake](#delta)

**Sources:** [Microsoft: Azure Data Lake Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction)

<a id="gcs"></a>
### Cloud Storage

*tool · Google Cloud object storage*

**What it is:** Google Cloud’s bucket-and-object storage service.

**Why use it:** Keeps files for analytical jobs, archives and other consumers.

**What sets it apart:** Separate from BigQuery’s query execution and managed table storage.

**Good to know:** A bucket containing Parquet does not automatically provide a governed warehouse table.

**Connections:**

- Implements → [Object storage](#object-storage)
- Can provide external data to → [BigQuery](#bigquery)
- Can retain → [Parquet](#parquet)

**Sources:** [Google Cloud: Cloud Storage overview](https://docs.cloud.google.com/storage/docs/introduction)

<a id="hdfs"></a>
### HDFS

*tool · Distributed filesystem*

**What it is:** Hadoop’s filesystem distributes large files across DataNodes, with namespace metadata managed by NameNodes.

**Why use it:** Designed for high-throughput distributed file access.

**What sets it apart:** A cluster filesystem with an operational model different from rented object storage.

**Good to know:** HDFS stores data; MapReduce, Hive and Spark do processing. Small files impose metadata overhead.

**Connections:**

- Part of → [Hadoop](#hadoop)
- Can supply files to → [Apache Spark](#spark)
- Can store data read by → [Apache Hive](#hive)

**Sources:** [Hadoop: HDFS architecture](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)

<a id="hadoop"></a>
### Hadoop

*tool · A family, not one engine*

**What it is:** An ecosystem including HDFS, YARN and MapReduce plus shared libraries.

**Why use it:** Established distributed storage and batch-processing infrastructure.

**What sets it apart:** The umbrella name covers storage, resource scheduling and execution.

**Good to know:** Using Spark does not require running your own HDFS or Hadoop cluster.

**Connections:**

- Contains storage component → [HDFS](#hdfs)
- Contains resource scheduler → [YARN](#yarn)
- Contains batch framework → [MapReduce](#mapreduce)

**Sources:** [Apache Hadoop: component documentation](https://hadoop.apache.org/docs/stable/) · [Apache Spark: overview](https://spark.apache.org/docs/latest/)

## Encode the data

**How are values represented?** File formats, memory layouts and compression codecs solve different problems.

<a id="csv"></a>
### CSV

*format · Readable delimited rows*

**What it is:** Text records with fields separated by a delimiter and quoting rules.

**Why use it:** Simple exchange with spreadsheets and many source systems.

**What sets it apart:** Portable and inspectable, but does not carry a rich typed schema.

**Good to know:** Agree on encoding, delimiter, NULLs, dates and quoting. Embedded newlines make naïve line splitting unsafe.

**Connections:**

- Often ingested with → [Python ingestion](#python)
- Convert validated analytical data to → [Parquet](#parquet)

**Sources:** [IETF RFC 4180: CSV](https://datatracker.ietf.org/doc/html/rfc4180)

<a id="json"></a>
### JSON

*format · Nested text values*

**What it is:** Text objects, arrays and scalar values used to exchange structured data.

**Why use it:** Fits APIs and variable nested payloads.

**What sets it apart:** Naturally expresses nested values; repeated field names and parsing add overhead.

**Good to know:** Flattening arrays changes row grain. Missing fields and explicit null need deliberate handling.

**Connections:**

- Record-per-line convention → [JSON Lines](#jsonl)
- Compare message encoding with → [Protocol Buffers](#protobuf)
- Can normalize to typed analytical files → [Parquet](#parquet)

**Sources:** [IETF RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259)

<a id="jsonl"></a>
### JSON Lines

*format · One JSON value per line*

**What it is:** UTF-8 text with a complete JSON value on each nonempty line.

**Why use it:** Convenient for log ingestion and incremental record processing.

**What sets it apart:** Can process one record at a time without parsing one giant array.

**Good to know:** JSON Lines is a convention, not a new JSON type system; ordinary pretty-printed JSON is not necessarily JSONL.

**Connections:**

- Uses → [JSON](#json)
- Often compressed with → [gzip](#gzip)

**Sources:** [JSON Lines: format description](https://jsonlines.org/)

<a id="avro"></a>
### Avro

*format · Schema-based record serialization*

**What it is:** A serialization system with schemas and compact binary record encoding.

**Why use it:** Useful for events and record-oriented exchange with evolving schemas.

**What sets it apart:** Writer and reader schema resolution is central to compatibility.

**Good to know:** An Avro container file includes a schema; Kafka message framing may refer to a registry instead. Evolution has rules.

**Connections:**

- Can pair messages with → [Schema registry](#schema-registry)
- Often used for events on → [Apache Kafka](#kafka)
- Compare record vs column layout with → [Parquet](#parquet)

**Sources:** [Apache Avro: specification, including schema resolution](https://avro.apache.org/docs/1.12.0/specification/)

<a id="parquet"></a>
### Parquet

*format · Columnar analytical files*

**What it is:** A typed column-oriented file format with row groups, encodings and compression.

**Why use it:** Reads fewer columns and can skip irrelevant regions in analytical scans.

**What sets it apart:** Optimizes file-level analytics; does not manage a changing multi-file table.

**Good to know:** Many tiny files can be slow. A Parquet filename glob can include obsolete table data.

**Connections:**

- Provides data files for → [Delta Lake](#delta)
- Common data files for → [Apache Iceberg](#iceberg)
- Compare disk layout with memory layout → [Apache Arrow](#arrow)

**Sources:** [Apache Parquet: overview](https://parquet.apache.org/docs/overview/) · [Parquet: row groups, column chunks and pages](https://parquet.apache.org/docs/concepts/)

<a id="orc"></a>
### ORC

*format · Columnar files with stripes*

**What it is:** A typed columnar format with stripes, indexes and statistics.

**Why use it:** Developed to improve Hive/Hadoop analytical storage and reads.

**What sets it apart:** Often encountered in Hive-oriented systems; also supported by other engines.

**Good to know:** File support and table transaction support are separate questions. Benchmark your reader and workload.

**Connections:**

- Historically closely associated with → [Apache Hive](#hive)
- Compare columnar file format with → [Parquet](#parquet)

**Sources:** [Apache ORC: design and background](https://orc.apache.org/docs/)

<a id="arrow"></a>
### Apache Arrow

*format · Columnar memory and interchange*

**What it is:** A specification and ecosystem for typed columnar memory and data interchange.

**Why use it:** Allows analytical components to exchange data with less conversion.

**What sets it apart:** Primarily a memory/interchange layout; Parquet targets compact persistent analytics files.

**Good to know:** Zero-copy is possible only on compatible paths. Arrow also defines IPC serialization; it is not “memory only”.

**Connections:**

- Python implementation ecosystem → [PyArrow](#pyarrow)
- Uses Arrow-compatible columnar data → [Polars](#polars)
- Different role from → [Parquet](#parquet)

**Sources:** [Apache Arrow: columnar memory and transport specification](https://arrow.apache.org/docs/format/Columnar.html)

<a id="protobuf"></a>
### Protocol Buffers

*format · Schema-defined binary messages*

**What it is:** A message serialization system with schemas, numbered fields and generated language bindings.

**Why use it:** Useful for compact service and event messages.

**What sets it apart:** A message protocol rather than an analytical columnar file format.

**Good to know:** Preserve field-number compatibility; binary payloads need the corresponding message definition to be interpreted.

**Connections:**

- Compare message representation with → [JSON](#json)
- Can govern message schemas → [Schema registry](#schema-registry)

**Sources:** [Protocol Buffers: overview](https://protobuf.dev/overview/)

<a id="gzip"></a>
### gzip

*format · Compressed byte stream*

**What it is:** A compression format commonly wrapped around CSV or JSONL files.

**Why use it:** Reduces transfer and storage size for text data.

**What sets it apart:** A codec/container layer, not a schema or row/column layout.

**Good to know:** A single ordinary gzip stream is generally not independently splittable for parallel text reads; format framing matters.

**Connections:**

- Common payload → [JSON Lines](#jsonl)
- Common payload → [CSV](#csv)
- Compare compression choices with → [Zstandard](#zstd)

**Sources:** [Python: gzip compression](https://docs.python.org/3/library/gzip.html)

<a id="snappy"></a>
### Snappy

*format · Compression favoring speed*

**What it is:** A compressor/decompressor designed for speed with reasonable size reduction.

**Why use it:** Common inside analytics files and data systems.

**What sets it apart:** Prioritizes processing speed rather than maximum compression ratio.

**Good to know:** Read/write codec support is implementation-specific. It does not replace Parquet or Avro.

**Connections:**

- Can compress pages in → [Parquet](#parquet)
- Compare speed/size trade-off with → [Zstandard](#zstd)

**Sources:** [Snappy: compression design](https://google.github.io/snappy/)

<a id="zstd"></a>
### Zstandard

*format · Tunable compression*

**What it is:** A compression algorithm with multiple levels and optional dictionary support.

**Why use it:** Useful when balancing transfer size, storage and CPU work.

**What sets it apart:** Offers a range of compression/speed settings; no single codec wins every workload.

**Good to know:** Measure end-to-end reads and writes, not only compressed size. Check all consumers support the codec.

**Connections:**

- Compare codec with → [Snappy](#snappy)
- Can be used inside → [Parquet](#parquet)

**Sources:** [Zstandard: compression design](https://facebook.github.io/zstd/)

## Manage tables & metadata

**Which data is the current table?** A table format tracks state; a catalog resolves named tables. Both need compatible engines.

<a id="delta"></a>
### Delta Lake

*format · Table protocol and transaction log*

**What it is:** An open table format that manages data files and table changes through metadata and a transaction log.

**Why use it:** Adds reliable updates, snapshots and schema controls to lake data.

**What sets it apart:** Data files are Parquet; the log determines the table state.

**Good to know:** Read through a compatible Delta reader, not a Parquet glob. Retention and supported table features constrain time travel.

**Connections:**

- Stores data in → [Parquet](#parquet)
- Common processing engine → [Apache Spark](#spark)
- Integrated in platform → [Databricks](#databricks)
- Alternative table format → [Apache Iceberg](#iceberg)

**Sources:** [Delta Lake: introduction and feature scope](https://docs.delta.io/)

<a id="iceberg"></a>
### Apache Iceberg

*format · Snapshots and evolvable tables*

**What it is:** An open table format using metadata, manifests and snapshots to describe table state.

**Why use it:** Supports changing analytical tables across compatible engines.

**What sets it apart:** Stable field identities, hidden partitioning and partition evolution are important design features.

**Good to know:** Sharing files alone is insufficient: catalog, engine versions and read/write feature support must agree.

**Connections:**

- Commonly stores data in → [Parquet](#parquet)
- Can be queried through → [Trino](#trino)
- Needs a supported metadata/commit path → [Catalog](#catalog)
- Alternative table format → [Delta Lake](#delta)

**Sources:** [Apache Iceberg: introduction](https://iceberg.apache.org/docs/latest/) · [Iceberg: schema and partition evolution](https://iceberg.apache.org/docs/latest/evolution/)

<a id="hudi"></a>
### Apache Hudi

*format · Changing records and incremental work*

**What it is:** An open table platform combining table representation with ingestion and maintenance capabilities.

**Why use it:** Useful for upserts and incremental processing of changing lake data.

**What sets it apart:** Emphasizes record keys, merge behavior, indexing and table services.

**Good to know:** Copy-on-write and merge-on-read have different read/maintenance trade-offs; verify engine support.

**Connections:**

- Can receive changes from → [CDC](#cdc)
- Common processing engine → [Apache Spark](#spark)
- Compare table management with → [Apache Iceberg](#iceberg)

**Sources:** [Apache Hudi: overview](https://hudi.apache.org/docs/overview/)

<a id="catalog"></a>
### Catalog

*concept · Resolve names to metadata*

**What it is:** A metadata interface that helps locate and manage named data assets.

**Why use it:** Lets engines discover table definitions and, for supported formats, coordinate table metadata.

**What sets it apart:** An execution catalog and an enterprise discovery catalog can have different responsibilities.

**Good to know:** Catalog registration alone does not enforce every storage access path or guarantee cross-engine writes.

**Connections:**

- An implementation → [Hive Metastore](#hms)
- AWS metadata service → [AWS Glue Data Catalog](#glue)
- Governance-oriented catalog → [Unity Catalog](#unity)
- Discovery catalog role → [DataHub](#datahub)

**Sources:** [AWS Glue: Data Catalog and crawlers](https://docs.aws.amazon.com/glue/latest/dg/catalog-and-crawler.html) · [Trino: concepts and connectors](https://trino.io/docs/current/overview/concepts.html)

<a id="hms"></a>
### Hive Metastore

*tool · Shared table metadata service*

**What it is:** A repository/service for table schemas, locations, partitions and related metadata.

**Why use it:** Allows several engines to discover compatible lake table definitions.

**What sets it apart:** Can be used without submitting queries to the Hive execution engine.

**Good to know:** “Hive table” may refer to catalog metadata. Ask which engine actually runs the SQL.

**Connections:**

- Originates in → [Apache Hive](#hive)
- Can provide metadata to → [Trino](#trino)
- Can share metadata with → [Apache Spark](#spark)

**Sources:** [Apache Hive: metastore role](https://hive.apache.org/) · [Trino: Hive connector and metastore requirements](https://trino.io/docs/current/connector/hive.html)

<a id="glue"></a>
### AWS Glue Data Catalog

*tool · AWS-managed table metadata*

**What it is:** A centralized metadata repository that can be populated by crawlers, APIs or manual definitions.

**Why use it:** Shares dataset descriptions with AWS analytical services.

**What sets it apart:** The Data Catalog is one component of Glue; Glue ETL jobs are a different responsibility.

**Good to know:** A crawler infers metadata; inference is not proof of source correctness or a business contract.

**Connections:**

- Implements a catalog role → [Catalog](#catalog)
- Can describe data stored in → [Amazon S3](#s3)
- Can participate in table catalog setups → [Apache Iceberg](#iceberg)

**Sources:** [AWS Glue: Data Catalog and crawlers](https://docs.aws.amazon.com/glue/latest/dg/catalog-and-crawler.html)

<a id="unity"></a>
### Unity Catalog

*tool · Databricks governance layer*

**What it is:** A catalog and governance layer for data and AI assets in Databricks.

**Why use it:** Centralizes supported access controls, discovery, auditing and lineage.

**What sets it apart:** A broader governance role than recording a file schema.

**Good to know:** Managed service and open-source implementations are not identical. Verify enforcement on every consumer access path.

**Connections:**

- Integrated into → [Databricks](#databricks)
- Implements → [Catalog](#catalog)
- Can capture → [Lineage / OpenLineage](#lineage)
- Works with cloud access controls → [IAM / RBAC](#iam)

**Sources:** [Databricks: Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/)

## Read & compute

**What actually runs the work?** Engines execute; APIs and libraries expose computation. SQL is a language, not a storage layer.

<a id="sql"></a>
### SQL

*concept · A query language, not an engine*

**What it is:** A language for declaring queries and data operations in supported database systems.

**Why use it:** Lets you express joins, filters, aggregates and more without specifying every execution step.

**What sets it apart:** Spark SQL, Trino, DuckDB and PostgreSQL implement their own SQL dialects and execution behavior.

**Good to know:** Check the target engine for syntax, NULL rules, types and transaction support; the same-looking query can behave differently.

**Connections:**

- One engine that executes → [DuckDB](#duckdb)
- Provides Spark SQL → [Apache Spark](#spark)
- Another engine that executes → [Trino](#trino)

**Sources:** [Trino: concepts and connectors](https://trino.io/docs/current/overview/concepts.html) · [PostgreSQL: database overview](https://www.postgresql.org/about/)

<a id="spark"></a>
### Apache Spark

*tool · Distributed processing engine*

**What it is:** An engine for SQL, DataFrames and other large-scale analytical processing.

**Why use it:** Useful when a workload benefits from parallel execution across a cluster.

**What sets it apart:** Execution is distinct from HDFS storage, Delta table metadata and the Databricks platform.

**Good to know:** Can also run locally. Distributed execution adds scheduling, shuffle and operational overhead.

**Connections:**

- Python API → [PySpark](#pyspark)
- Can read from → [HDFS](#hdfs)
- Can process tables using → [Delta Lake](#delta)
- May move data through → [Shuffle](#shuffle)

**Sources:** [Apache Spark: overview](https://spark.apache.org/docs/latest/)

<a id="pyspark"></a>
### PySpark

*tool · Python API for Spark*

**What it is:** Python interfaces for constructing and running Spark jobs.

**Why use it:** Lets Python users work with Spark SQL, DataFrames and streaming.

**What sets it apart:** A Spark DataFrame is not a pandas DataFrame; operations form work for Spark execution.

**Good to know:** Avoid pulling large distributed results to the driver with collect() or toPandas().

**Connections:**

- API for → [Apache Spark](#spark)
- Different execution model from → [pandas](#pandas)
- Can express → [Structured Streaming](#structured-streaming)

**Sources:** [Apache Spark: overview](https://spark.apache.org/docs/latest/)

<a id="hive"></a>
### Apache Hive

*tool · SQL warehousing over distributed data*

**What it is:** Software for querying and managing large datasets in distributed storage using SQL.

**Why use it:** Brought SQL-oriented warehouse workflows to the Hadoop ecosystem.

**What sets it apart:** Includes query execution and metadata components; Hive Metastore can be used independently.

**Good to know:** Hive does not always mean MapReduce. Execution backend and transaction support depend on configuration and version.

**Connections:**

- Includes metadata component → [Hive Metastore](#hms)
- Can query stored data in → [HDFS](#hdfs)
- Alternative SQL execution approach → [Presto / PrestoDB](#presto)

**Sources:** [Apache Hive: introduction](https://hive.apache.org/docs/latest/introduction-to-apache-hive/)

<a id="presto"></a>
### Presto / PrestoDB

*tool · Distributed SQL query engine*

**What it is:** An engine that queries large datasets through connectors to multiple sources.

**Why use it:** Useful for analytical SQL without first moving everything into one database.

**What sets it apart:** PrestoDB and Trino are separate projects with shared ancestry.

**Good to know:** PrestoSQL was renamed Trino in 2020; PrestoDB did not disappear. Connector behavior and versions differ.

**Connections:**

- Related project; distinct today → [Trino](#trino)
- Can use shared table metadata → [Hive Metastore](#hms)
- Supports through connectors → [Query federation](#federation)

**Sources:** [Presto: use cases](https://www.prestodb.io/docs/current/overview/use-cases.html) · [Trino founders: PrestoSQL rename, December 2020](https://trino.io/blog/2020/12/27/announcing-trino.html)

<a id="trino"></a>
### Trino

*tool · Distributed and federated SQL*

**What it is:** A coordinator-and-worker query engine with connectors to varied data sources.

**Why use it:** Lets analysts query lake tables and other systems with SQL.

**What sets it apart:** Formerly PrestoSQL; a separate codebase from present-day PrestoDB.

**Good to know:** A Trino catalog is connector configuration, not necessarily an enterprise data catalog. Writes depend on connectors.

**Connections:**

- Can query using a connector → [Apache Iceberg](#iceberg)
- Can obtain Hive metadata from → [Hive Metastore](#hms)
- Shared ancestry with → [Presto / PrestoDB](#presto)
- Can execute → [Query federation](#federation)

**Sources:** [Trino: concepts and connectors](https://trino.io/docs/current/overview/concepts.html) · [Trino founders: PrestoSQL rename, December 2020](https://trino.io/blog/2020/12/27/announcing-trino.html)

<a id="duckdb"></a>
### DuckDB

*tool · Embedded analytical SQL database*

**What it is:** An in-process analytical database that can query files and persist database tables.

**Why use it:** Excellent for local analysis, repeatable data pipelines and small first releases.

**What sets it apart:** No separate database server is needed for the embedded engine.

**Good to know:** Local does not mean tiny-data-only; memory, disk, concurrency and workload still determine practical limits.

**Connections:**

- Can query directly → [Parquet](#parquet)
- Can execute models via dbt-duckdb → [dbt](#dbt)
- Compare local vs distributed execution with → [Apache Spark](#spark)

**Sources:** [DuckDB: why an embedded analytical database](https://duckdb.org/why_duckdb)

<a id="pandas"></a>
### pandas

*tool · Python tabular manipulation*

**What it is:** A Python library for indexed tabular data, joins, aggregation and time-series work.

**Why use it:** Useful for exploration and familiar Python data workflows.

**What sets it apart:** Usually eager operations on a local DataFrame rather than a distributed query plan.

**Good to know:** Check dtypes, memory and join cardinality. A notebook that runs is not automatically a reliable pipeline.

**Connections:**

- Alternative DataFrame library → [Polars](#polars)
- SQL alternative for tabular work → [DuckDB](#duckdb)
- Can use for columnar interoperability → [PyArrow](#pyarrow)

**Sources:** [pandas: getting started](https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html)

<a id="polars"></a>
### Polars

*tool · Expression-based DataFrame engine*

**What it is:** A DataFrame engine with eager and lazy APIs and columnar execution.

**Why use it:** Useful for analytical transformations with optimized lazy plans.

**What sets it apart:** Expressions and query planning differ from pandas’ index-oriented API.

**Good to know:** Lazy execution can optimize a query; performance and streaming eligibility still depend on the operations and environment.

**Connections:**

- Compare DataFrame API with → [pandas](#pandas)
- Uses compatible columnar representations → [Apache Arrow](#arrow)
- Lazy plans can benefit from → [Pushdown & data skipping](#pushdown)

**Sources:** [Polars: expressions and DataFrames](https://docs.pola.rs/user-guide/getting-started/)

<a id="pyarrow"></a>
### PyArrow

*tool · Arrow and file I/O in Python*

**What it is:** Python bindings and tools for Arrow data, datasets and formats such as Parquet.

**Why use it:** Useful for typed conversion, efficient file I/O and interchange.

**What sets it apart:** A library implementing multiple capabilities, not another name for Parquet.

**Good to know:** Specify important types rather than trusting inference; compatibility depends on the chosen file features.

**Connections:**

- Implements Python access to → [Apache Arrow](#arrow)
- Can read and write → [Parquet](#parquet)
- Useful in ingestion scripts → [Python ingestion](#python)

**Sources:** [PyArrow: Python tools and I/O](https://arrow.apache.org/docs/python/)

<a id="mapreduce"></a>
### MapReduce

*tool · Distributed map/shuffle/reduce*

**What it is:** A batch programming and execution model that groups mapped records for reduction.

**Why use it:** Enabled scalable processing with distribution and failure handling.

**What sets it apart:** Classic jobs have materialized stage boundaries; Spark offers a broader execution model.

**Good to know:** Historical importance does not make it a mandatory first tool for your local project.

**Connections:**

- Part of ecosystem → [Hadoop](#hadoop)
- Often processed files from → [HDFS](#hdfs)
- Compare execution approach with → [Apache Spark](#spark)

**Sources:** [Apache Hadoop: component documentation](https://hadoop.apache.org/docs/stable/)

<a id="tez"></a>
### Apache Tez

*tool · DAG execution on Hadoop*

**What it is:** An execution framework for expressing processing as a directed graph of tasks.

**Why use it:** Useful as an execution backend for systems such as Hive.

**What sets it apart:** Executes a processing plan; it is not the Hive SQL language or the Hive Metastore.

**Good to know:** A processing DAG is not the same operating boundary as a scheduled business workflow in Airflow.

**Connections:**

- Can execute plans for → [Apache Hive](#hive)
- Uses Hadoop resource management → [YARN](#yarn)
- Alternative execution framework → [MapReduce](#mapreduce)

**Sources:** [Apache Tez: execution framework](https://tez.apache.org/) · [Apache Hive: introduction](https://hive.apache.org/docs/latest/introduction-to-apache-hive/)

## Databases & platforms

**What system do users work in?** A platform bundles several layers. A warehouse can also query open lake tables.

<a id="snowflake"></a>
### Snowflake

*tool · Managed cloud data platform*

**What it is:** A managed analytical service with stored data, virtual-warehouse compute and cloud services.

**Why use it:** Useful for SQL analytics with independently provisioned workload capacity.

**What sets it apart:** A Snowflake virtual warehouse is compute, not a separate copy of all stored tables.

**Good to know:** Do not confuse Snowflake the product with a snowflake-shaped dimensional schema. Cost depends on workload and configuration.

**Connections:**

- Implements warehouse-oriented analytics → [Data warehouse](#warehouse)
- Also supports Iceberg table options → [Apache Iceberg](#iceberg)
- Can execute models built by → [dbt](#dbt)

**Sources:** [Snowflake: architecture and virtual warehouses](https://docs.snowflake.com/en/user-guide/intro-key-concepts)

<a id="bigquery"></a>
### BigQuery

*tool · Google-managed analytics*

**What it is:** A managed analytical service for SQL and broader data workloads.

**Why use it:** Useful when the service manages much of the query infrastructure.

**What sets it apart:** Separates managed analytical execution from the consumer’s local machine.

**Good to know:** Serverless does not mean free or limitless. Pricing and capacity modes differ; scan reduction still matters.

**Connections:**

- Can query external data in → [Cloud Storage](#gcs)
- Supports table partitioning → [Partitioning](#partitioning)
- Supports clustered tables → [Clustering / sorting](#clustering)
- Serves analytical warehouse use cases → [Data warehouse](#warehouse)

**Sources:** [Google Cloud: BigQuery overview](https://docs.cloud.google.com/bigquery/docs/introduction)

<a id="redshift"></a>
### Amazon Redshift

*tool · AWS-managed analytical warehouse*

**What it is:** A managed SQL warehouse with provisioned and serverless deployment options.

**Why use it:** Useful for analytical workloads integrated with AWS services.

**What sets it apart:** A warehouse service rather than general-purpose S3 object storage.

**Good to know:** Provisioned and serverless capacity models differ. Evaluate external data access, concurrency and cost for your setup.

**Connections:**

- Can integrate with files in → [Amazon S3](#s3)
- Implements → [Data warehouse](#warehouse)
- Alternative managed analytical service → [Snowflake](#snowflake)

**Sources:** [AWS: Redshift overview](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html)

<a id="databricks"></a>
### Databricks

*tool · Integrated analytics and AI platform*

**What it is:** A platform combining processing, SQL, governance and data/AI development experiences.

**Why use it:** Useful when teams want integrated lakehouse workflows and managed operation.

**What sets it apart:** A platform around engines and metadata, not a synonym for Apache Spark or Delta Lake.

**Good to know:** An open format does not make every platform feature portable. Check runtime, catalog and consumer paths.

**Connections:**

- Supports processing with → [Apache Spark](#spark)
- Integrates table management with → [Delta Lake](#delta)
- Provides governance through → [Unity Catalog](#unity)
- Common architectural fit → [Lakehouse](#lakehouse)

**Sources:** [Databricks: platform overview](https://docs.databricks.com/aws/en/introduction/)

<a id="fabric"></a>
### Microsoft Fabric

*tool · Microsoft analytics suite*

**What it is:** A SaaS analytics platform integrating engineering, warehousing, real-time and BI experiences.

**Why use it:** Useful when teams want connected Microsoft data and reporting workloads.

**What sets it apart:** Combines several experiences around OneLake rather than being only a file format or engine.

**Good to know:** Fabric the product is different from the generic term data fabric. Capacity and access behavior depend on the workload.

**Connections:**

- Integrates reporting through → [Power BI](#powerbi)
- Default lakehouse table format → [Delta Lake](#delta)
- Different from this architecture term → [Data fabric](#data-fabric)

**Sources:** [Microsoft: Fabric overview](https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview) · [Fabric: lakehouse and Delta tables](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables)

<a id="postgres"></a>
### PostgreSQL

*tool · General-purpose relational database*

**What it is:** An open-source database supporting SQL, transactions and extensible data types.

**Why use it:** Useful for operational applications and many moderate analytical workloads.

**What sets it apart:** Often serves OLTP work; it is not a file format or only a warehouse query engine.

**Good to know:** Heavy analytics can compete with application transactions. Choose indexes and isolation intentionally.

**Connections:**

- Can support both workload types → [OLTP / OLAP](#oltp-olap)
- Can supply database changes for → [CDC](#cdc)
- Compare application vs analytical focus with → [DuckDB](#duckdb)

**Sources:** [PostgreSQL: database overview](https://www.postgresql.org/about/)

<a id="clickhouse"></a>
### ClickHouse

*tool · Column-oriented analytical database*

**What it is:** A database designed for analytical queries, including event and observability workloads.

**Why use it:** Useful for repeated aggregation over large analytical datasets.

**What sets it apart:** Owns an analytical storage/query system rather than just federating external SQL sources.

**Good to know:** Update, merge and deduplication behavior depends on table engine and design; do not assume OLTP semantics.

**Connections:**

- Oriented toward analytical workloads → [OLTP / OLAP](#oltp-olap)
- Compare stored analytics vs federated execution with → [Presto / PrestoDB](#presto)

**Sources:** [ClickHouse: analytical database overview](https://clickhouse.com/docs/get-started/about/intro)

<a id="athena"></a>
### Amazon Athena

*tool · Managed SQL over lake data*

**What it is:** An AWS interactive query service for data such as files in S3; it also offers a Spark experience.

**Why use it:** Useful for SQL exploration without operating a separate query cluster.

**What sets it apart:** A managed service rather than S3 storage or the open-source engine project itself.

**Good to know:** Athena SQL and Athena Spark are distinct experiences. Table, catalog and engine-version support still need checking.

**Connections:**

- Can query data in → [Amazon S3](#s3)
- Can use metadata from → [AWS Glue Data Catalog](#glue)
- Also has a managed Spark experience → [Apache Spark](#spark)

**Sources:** [AWS: Amazon Athena SQL and Spark](https://docs.aws.amazon.com/athena/latest/ug/what-is.html)

## Transport & process events

**What happens as events arrive?** A broker keeps/moves events. A stream processor computes results from them.

<a id="kafka"></a>
### Apache Kafka

*tool · Durable partitioned event log*

**What it is:** An event-streaming platform with topics, partitions and independently advancing consumers.

**Why use it:** Useful for retaining events and decoupling producers from consumers.

**What sets it apart:** Stores event streams; Flink or Spark can compute over them.

**Good to know:** Order is per partition, not global. Retention and delivery guarantees need explicit configuration.

**Connections:**

- Connector framework in ecosystem → [Kafka Connect](#kafka-connect)
- Can feed processing by → [Apache Flink](#flink)
- Possible event encoding → [Avro](#avro)
- Guarantee scope to verify → [Exactly-once](#exactly-once)

**Sources:** [Apache Kafka: introduction](https://kafka.apache.org/intro/)

<a id="kafka-connect"></a>
### Kafka Connect

*tool · Source and sink connector runtime*

**What it is:** A framework for streaming records between Kafka and external systems through connectors.

**Why use it:** Reduces custom producer/consumer integration plumbing.

**What sets it apart:** A connector execution framework, not the same thing as a Kafka topic or a stream-processing query.

**Good to know:** Source and sink connector behavior differs. A connector being available does not prove deletion or transactional semantics.

**Connections:**

- Connects systems to → [Apache Kafka](#kafka)
- Can run database connectors from → [Debezium](#debezium)

**Sources:** [Apache Kafka: introduction](https://kafka.apache.org/intro/) · [Debezium: architecture and deployment options](https://debezium.io/documentation/reference/stable/architecture.html)

<a id="flink"></a>
### Apache Flink

*tool · Stateful distributed processing*

**What it is:** An engine for stateful computations over bounded and unbounded data.

**Why use it:** Useful for event-time processing and continuously maintained results.

**What sets it apart:** Runs computation; Kafka transports/retains the events.

**Good to know:** State size, checkpoints, late events and sink guarantees shape correctness and operating cost.

**Connections:**

- Can consume events from → [Apache Kafka](#kafka)
- Uses event-time progress concepts such as → [Event-time watermark](#watermark)
- Can serve as a runner for → [Apache Beam](#beam)

**Sources:** [Apache Flink: processing concepts](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/)

<a id="structured-streaming"></a>
### Structured Streaming

*tool · Incremental processing in Spark*

**What it is:** Spark’s streaming API built around incremental DataFrame/SQL computations.

**Why use it:** Reuses Spark’s structured APIs for arriving data.

**What sets it apart:** Often executes in micro-batches; it is not equivalent to a Kafka broker.

**Good to know:** Checkpoint state, output mode, event-time watermarks and sink support all affect restart behavior.

**Connections:**

- Part of → [Apache Spark](#spark)
- Can read events from → [Apache Kafka](#kafka)
- Can manage late event state with → [Event-time watermark](#watermark)

**Sources:** [Spark: Structured Streaming guide](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html)

<a id="beam"></a>
### Apache Beam

*tool · Portable pipeline programming model*

**What it is:** SDKs and a model for expressing bounded and unbounded data processing.

**Why use it:** Lets a pipeline target supported execution runners.

**What sets it apart:** Describes the pipeline; a runner such as Flink or Dataflow executes it.

**Good to know:** Runner capability and connector support differ. Portability is not a promise of identical behavior everywhere.

**Connections:**

- One possible runner → [Apache Flink](#flink)
- Models both bounded and unbounded data → [Batch / streaming](#batch-stream)

**Sources:** [Apache Beam: model, windows and runners](https://beam.apache.org/documentation/basics/)

<a id="pubsub"></a>
### Google Pub/Sub

*tool · Managed publish/subscribe messaging*

**What it is:** A Google Cloud messaging service connecting publishers to subscriptions.

**Why use it:** Useful for decoupling producers and event-consuming services.

**What sets it apart:** A managed delivery system rather than an analytical table or BI tool.

**Good to know:** Delivery, ordering and exactly-once options have specific scopes; check the chosen subscription mode.

**Connections:**

- Compare messaging model with → [Apache Kafka](#kafka)
- Can feed a processing pipeline expressed with → [Apache Beam](#beam)

**Sources:** [Google Cloud: Pub/Sub overview](https://docs.cloud.google.com/pubsub/docs/overview)

<a id="kinesis"></a>
### Kinesis Data Streams

*tool · AWS-managed data streams*

**What it is:** An AWS service for collecting and consuming streams of records.

**Why use it:** Useful for streaming integrations in AWS environments.

**What sets it apart:** A managed stream service; consumers still implement useful processing.

**Good to know:** Choose stream capacity, partition-key distribution and retention deliberately. This entry refers to Data Streams specifically.

**Connections:**

- Compare event infrastructure with → [Apache Kafka](#kafka)
- Can feed stateful processing by → [Apache Flink](#flink)

**Sources:** [AWS: Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html)

<a id="schema-registry"></a>
### Schema registry

*concept · Version event message definitions*

**What it is:** A service for storing schemas and enforcing configured compatibility rules between versions.

**Why use it:** Helps independently deployed producers and consumers agree on message shape.

**What sets it apart:** Message-schema metadata differs from a lake table catalog.

**Good to know:** Compatibility checks do not prove the event’s business meaning, completeness or correct units.

**Connections:**

- Can manage schemas for → [Avro](#avro)
- Can manage schemas for → [Protocol Buffers](#protobuf)
- Different metadata responsibility from → [Catalog](#catalog)

**Sources:** [Confluent: schema registry](https://docs.confluent.io/platform/current/schema-registry/index.html)

<a id="dataflow"></a>
### Google Dataflow

*tool · Managed Beam execution*

**What it is:** A Google Cloud service for executing batch and streaming data pipelines.

**Why use it:** Useful when teams want managed execution for supported Beam workloads.

**What sets it apart:** Beam describes the pipeline; Dataflow runs it as a managed service.

**Good to know:** Managed execution does not remove decisions about state, late data, connector behavior or cost.

**Connections:**

- Runs supported pipelines expressed with → [Apache Beam](#beam)
- Can consume messages from → [Google Pub/Sub](#pubsub)
- Can publish results to → [BigQuery](#bigquery)

**Sources:** [Google Cloud: Dataflow and Beam](https://docs.cloud.google.com/dataflow/docs/overview)

## Transform & coordinate

**What runs, and in what order?** Transformation builds data. Orchestration schedules dependencies, retries and recovery.

<a id="dbt"></a>
### dbt

*tool · Versioned analytical transformations*

**What it is:** A framework for defining, building, testing and documenting data models.

**Why use it:** Makes analytical transformation logic and dependencies explicit.

**What sets it apart:** The target engine executes the SQL; dbt does not become the warehouse.

**Good to know:** dbt Core and hosted platform capabilities differ. Ingestion and event transport are separate responsibilities.

**Connections:**

- Can execute locally through adapter → [DuckDB](#duckdb)
- Can execute on → [Snowflake](#snowflake)
- Can be scheduled by → [Apache Airflow](#airflow)
- Provides tests for → [Data tests](#data-tests)

**Sources:** [dbt: introduction](https://docs.getdbt.com/docs/introduction)

<a id="airflow"></a>
### Apache Airflow

*tool · Workflow dependency orchestration*

**What it is:** A platform for defining and operating workflows made of dependent tasks.

**Why use it:** Coordinates scheduled work, retries and integrations across systems.

**What sets it apart:** Tasks trigger/run work; the scheduler is not a distributed SQL engine.

**Good to know:** Use explicit data intervals and rerun-safe tasks. Pass small metadata references rather than bulk data between tasks.

**Connections:**

- Represents workflows as → [DAG](#dag)
- Can trigger work in → [Apache Spark](#spark)
- Can integrate dbt with → [Astronomer Cosmos](#cosmos)
- Tasks should support → [Idempotency](#idempotency)

**Sources:** [Apache Airflow: architecture](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html)

<a id="dagster"></a>
### Dagster

*tool · Asset-oriented orchestration*

**What it is:** An orchestration system with software-defined assets, dependencies and execution metadata.

**Why use it:** Useful when datasets and their lineage are the central operating model.

**What sets it apart:** Can describe the data asset being produced, alongside jobs that produce it.

**Good to know:** An asset declaration does not validate the data automatically; configure checks, resources and deployment behavior.

**Connections:**

- Alternative orchestration approach → [Apache Airflow](#airflow)
- Can coordinate models from → [dbt](#dbt)
- Can expose dependency metadata for → [Lineage / OpenLineage](#lineage)

**Sources:** [Dagster: assets and orchestration](https://dagster.io/docs/guides/build/assets)

<a id="prefect"></a>
### Prefect

*tool · Python-native workflow orchestration*

**What it is:** An orchestration engine for Python flows and tasks with tracked execution state.

**Why use it:** Adds scheduling, retries and monitoring to Python workflows.

**What sets it apart:** Focuses on orchestrating code; does not replace the storage/query engine.

**Good to know:** Decide where workers and code run and how retries interact with side effects.

**Connections:**

- Alternative orchestration approach → [Apache Airflow](#airflow)
- Can coordinate extraction written in → [Python ingestion](#python)
- Still requires safe side effects → [Idempotency](#idempotency)

**Sources:** [Prefect: introduction](https://docs.prefect.io/v3/get-started)

<a id="adf"></a>
### Azure Data Factory

*tool · Managed integration pipelines*

**What it is:** An Azure service for data movement, transformation coordination and integration workflows.

**Why use it:** Useful for managed, connector-driven data integration in Azure.

**What sets it apart:** Pipelines coordinate activities; linked processing systems may execute transformations.

**Good to know:** ADF and Fabric Data Factory are related product experiences, not interchangeable configuration targets.

**Connections:**

- Can move data into → [ADLS Gen2](#adls)
- Can coordinate processing on → [Databricks](#databricks)
- Can implement → [ETL / ELT](#etl)

**Sources:** [Microsoft: Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/introduction)

<a id="cosmos"></a>
### Astronomer Cosmos

*tool · dbt workflows in Airflow*

**What it is:** An integration that turns dbt workflow structure into Airflow tasks and DAGs.

**Why use it:** Makes model-level orchestration and visibility available in Airflow.

**What sets it apart:** An integration layer, not another dbt execution engine.

**Good to know:** This is Astronomer Cosmos, not Azure Cosmos DB. Keep adapter, dbt and Airflow integration versions compatible.

**Connections:**

- Reads workflow structure from → [dbt](#dbt)
- Builds tasks in → [Apache Airflow](#airflow)

**Sources:** [Astronomer Cosmos: dbt and Airflow](https://astronomer.github.io/astronomer-cosmos/)

<a id="dag"></a>
### DAG

*concept · Acyclic dependency graph*

**What it is:** A directed acyclic graph showing dependencies between units of work.

**Why use it:** Expresses which outputs or tasks must be ready before others run.

**What sets it apart:** The same graph idea appears in Airflow workflows and dbt model dependencies.

**Good to know:** Dependency order does not guarantee data quality, correct intervals or safe retries.

**Connections:**

- Represents workflows in → [Apache Airflow](#airflow)
- Represents model dependencies in → [dbt](#dbt)

**Sources:** [Apache Airflow: architecture](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html) · [dbt: introduction](https://docs.getdbt.com/docs/introduction)

## Architecture & modeling

**Which boundaries and meanings?** Storage design, business modeling and ownership are different axes.

<a id="warehouse"></a>
### Data warehouse

*concept · Integrated analytical serving*

**What it is:** A system and curated data layer for integrated analytical queries and reporting.

**Why use it:** Gives consumers consistent business data and query interfaces.

**What sets it apart:** Defined by analytical responsibilities, not one vendor or a requirement for a star schema.

**Good to know:** Modern warehouses can also handle semi-structured data and open-table integrations.

**Connections:**

- Can coexist with → [Data lake](#lake)
- Compare architectural responsibilities with → [Lakehouse](#lakehouse)
- Can publish models such as → [Star schema](#star)

**Sources:** [Snowflake: architecture and virtual warehouses](https://docs.snowflake.com/en/user-guide/intro-key-concepts) · [CIDR 2021: lakehouse proposal](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf)

<a id="lake"></a>
### Data lake

*concept · Flexible retained data*

**What it is:** A storage-oriented architecture retaining data for multiple processing and consumer needs.

**Why use it:** Keeps detail and enables replay or questions not modeled at ingestion.

**What sets it apart:** Raw retention and curated serving are separate responsibilities.

**Good to know:** A folder full of files needs discoverability, version policy, ownership and validation to remain useful.

**Connections:**

- Often built on → [Object storage](#object-storage)
- Can add reliable table management through → [Lakehouse](#lakehouse)
- Can organize quality progression using → [Medallion](#medallion)

**Sources:** [CIDR 2021: lakehouse proposal](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf)

<a id="lakehouse"></a>
### Lakehouse

*concept · Lake storage with table reliability*

**What it is:** An architecture combining lake-style storage with reliable table management and analytical execution.

**Why use it:** Supports changing tables and broader workloads without relying only on unmanaged files.

**What sets it apart:** Needs file formats, table protocols, metadata and compatible engines working together.

**Good to know:** Neither a mandatory successor to a warehouse nor a guarantee of zero copies or universal interoperability.

**Connections:**

- Can use table management from → [Apache Iceberg](#iceberg)
- Can use table management from → [Delta Lake](#delta)
- Independent ownership choice from → [Data mesh](#mesh)

**Sources:** [CIDR 2021: lakehouse proposal](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf)

<a id="medallion"></a>
### Medallion

*concept · Bronze → silver → gold*

**What it is:** A logical pattern that moves data from raw evidence through validated records to consumer-ready outputs.

**Why use it:** Clarifies how meaning and quality progress through a pipeline.

**What sets it apart:** Names responsibilities, not three mandatory storage products or physical copies.

**Good to know:** Naming folders bronze/silver/gold does not create transactions or correctness. Implement the checks and publication boundaries.

**Connections:**

- Commonly used in → [Lakehouse](#lakehouse)
- Staging/intermediate/marts are related layering ideas → [dbt](#dbt)
- Quality must be proved with → [Data tests](#data-tests)

**Sources:** [Databricks: medallion layers](https://docs.databricks.com/aws/en/lakehouse/medallion)

<a id="mesh"></a>
### Data mesh

*concept · Domain-owned data products*

**What it is:** An approach combining domain ownership, data as a product, a self-serve platform and federated governance.

**Why use it:** Addresses delivery and ownership bottlenecks across many teams.

**What sets it apart:** An organizational and technical operating model, not a file or storage format.

**Good to know:** A personal project can use clear contracts without pretending to operate a multi-domain mesh.

**Connections:**

- Products can live in → [Data warehouse](#warehouse)
- Products can live in → [Lakehouse](#lakehouse)
- Products need explicit interfaces → [Data contract](#contracts)
- Different emphasis from → [Data fabric](#data-fabric)

**Sources:** [Zhamak Dehghani: data mesh principles](https://martinfowler.com/articles/data-mesh-principles.html)

<a id="data-fabric"></a>
### Data fabric

*concept · Metadata-driven integration umbrella*

**What it is:** A broad architecture term for connecting data, metadata, integration and policy across an estate.

**Why use it:** Aims to make distributed data easier to discover, connect and govern.

**What sets it apart:** Not one standardized table protocol; vendors package different capabilities under the label.

**Good to know:** Ask which concrete integration or governance problem is solved. Microsoft Fabric is a product name, not this definition.

**Connections:**

- Do not confuse with product → [Microsoft Fabric](#fabric)
- Can coexist with ownership approach → [Data mesh](#mesh)
- May include metadata capabilities from → [Catalog](#catalog)

**Sources:** [IBM: data fabric terminology](https://www.ibm.com/think/topics/data-fabric)

<a id="batch-stream"></a>
### Batch / streaming

*concept · Bounded vs continuously arriving data*

**What it is:** Batch processes bounded input; streaming processes data as it arrives, often using retained state.

**Why use it:** Matches processing behavior to source availability and consumer freshness.

**What sets it apart:** Micro-batching processes small bounded increments as a streaming execution approach.

**Good to know:** Streaming a monthly source does not make its data live. Event time and arrival time can differ.

**Connections:**

- One implementation → [Structured Streaming](#structured-streaming)
- Another processing engine → [Apache Flink](#flink)
- Useful for event-time progress → [Event-time watermark](#watermark)

**Sources:** [Apache Beam: model, windows and runners](https://beam.apache.org/documentation/basics/)

<a id="oltp-olap"></a>
### OLTP / OLAP

*concept · Transactions vs analytical scans*

**What it is:** OLTP serves operational transactions; OLAP serves analytical queries across many records.

**Why use it:** Explains why an application database and reporting system may use different designs.

**What sets it apart:** A workload distinction, not a claim that one database can never do both.

**Good to know:** Measure contention and query patterns before separating systems. “SQL database” alone does not identify the workload.

**Connections:**

- Often used for operational transactions → [PostgreSQL](#postgres)
- Targets analytical processing → [ClickHouse](#clickhouse)
- Typically serves analytical needs → [Data warehouse](#warehouse)

**Sources:** [Presto: use cases](https://www.prestodb.io/docs/current/overview/use-cases.html) · [PostgreSQL: database overview](https://www.postgresql.org/about/)

<a id="star"></a>
### Star schema

*concept · Facts connected to dimensions*

**What it is:** A dimensional model with event/measurement facts linked to descriptive dimensions.

**Why use it:** Makes business reporting and filtering easier to reason about.

**What sets it apart:** Business modeling is independent of the physical file or table format.

**Good to know:** Declare the fact grain first; dimension joins can still multiply rows if keys are not unique.

**Connections:**

- Depends on explicit → [Grain](#grain)
- Dimensions may preserve history with → [SCD](#scd)
- Can be served in → [Data warehouse](#warehouse)

**Sources:** [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)

<a id="grain"></a>
### Grain

*concept · What one row represents*

**What it is:** The precise business event or entity represented by one row.

**Why use it:** Prevents mixed-level joins, invalid aggregates and ambiguous keys.

**What sets it apart:** A business meaning decision, not a partition or file size.

**Good to know:** Write “one scheduled flight leg” before choosing columns or computing rates.

**Connections:**

- Defines facts in → [Star schema](#star)
- Can be checked with keys and reconciliation → [Data tests](#data-tests)

**Sources:** [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)

<a id="scd"></a>
### SCD

*concept · Dimension attribute history*

**What it is:** Slowly changing dimension techniques define how descriptive changes are stored.

**Why use it:** Preserves either the latest value or historical context for reporting.

**What sets it apart:** Type 1 overwrites; Type 2 preserves versions with validity periods.

**Good to know:** Historical joins need the right effective-time rule. Table time travel does not replace business-effective history.

**Connections:**

- Used in dimensions of → [Star schema](#star)
- Different from storage snapshot history → [Time travel / snapshots](#time-travel)

**Sources:** [Kimball Group: dimensional modeling techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)

## Correctness & recovery

**What survives change or failure?** A successful job is not proof of a correct, reproducible business answer.

<a id="acid"></a>
### ACID

*concept · Transaction guarantees with a scope*

**What it is:** Atomicity, consistency, isolation and durability describe transaction properties.

**Why use it:** Helps reason about partial writes, concurrent work and committed state.

**What sets it apart:** Database consistency means preserving declared rules, not proving the business formula is correct.

**Good to know:** Ask whether the guarantee covers one table, several tables, or an external sink too. Isolation levels differ.

**Connections:**

- Provides supported table transaction behavior → [Delta Lake](#delta)
- Different from rerun safety → [Idempotency](#idempotency)
- Different from end-to-end event handling → [Exactly-once](#exactly-once)

**Sources:** [PostgreSQL: transaction boundaries](https://www.postgresql.org/docs/current/tutorial-transactions.html) · [PostgreSQL: transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) · [Iceberg: commits and reliability](https://iceberg.apache.org/docs/latest/reliability/)

<a id="idempotency"></a>
### Idempotency

*concept · Same intended result after replay*

**What it is:** Repeating an operation with the same logical input does not add unintended effects.

**Why use it:** Makes retries, reruns and recovery safer.

**What sets it apart:** A transaction makes one execution atomic; idempotency makes repetition safe.

**Good to know:** Use stable keys or interval replacement, and prove it by running twice and comparing the full result.

**Connections:**

- Needed for retrying tasks in → [Apache Airflow](#airflow)
- Needed for safe updates in → [Incremental load](#incremental)
- Different guarantee from → [ACID](#acid)

**Sources:** [Airflow: rerun-safe task practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)

<a id="incremental"></a>
### Incremental load

*concept · Process changes since a boundary*

**What it is:** A load that processes a selected new or changed subset rather than rebuilding everything.

**Why use it:** Reduces work when the boundary and update policy are reliable.

**What sets it apart:** A watermark/filter selects input; a merge or replacement policy applies it.

**Good to know:** Late corrections and deletes need explicit handling. Compare incremental output with a full rebuild.

**Connections:**

- Can identify source changes using → [CDC](#cdc)
- Still needs safe replay → [Idempotency](#idempotency)
- Must coexist with → [Backfill](#backfill)

**Sources:** [dbt: incremental models](https://docs.getdbt.com/docs/build/incremental-models)

<a id="backfill"></a>
### Backfill

*concept · Rebuild past intervals*

**What it is:** Processing historical data intervals that were missed or need recomputation.

**Why use it:** Repairs gaps or applies changed logic to history.

**What sets it apart:** Uses explicit data intervals rather than just the machine’s current date.

**Good to know:** Make historical inputs reproducible and writes replay-safe; avoid overwriting newer corrections with stale inputs.

**Connections:**

- Requires → [Idempotency](#idempotency)
- Must agree with current loads → [Incremental load](#incremental)
- Can coordinate → [Apache Airflow](#airflow)

**Sources:** [Airflow: rerun-safe task practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)

<a id="exactly-once"></a>
### Exactly-once

*concept · A scoped processing guarantee*

**What it is:** A guarantee about the observable effect of processing within a defined system boundary.

**Why use it:** Avoids duplicate effects despite retries or replay when the boundary supports it.

**What sets it apart:** A processor’s internal guarantee is not automatically an external sink’s guarantee.

**Good to know:** Check source offsets, checkpoint recovery and sink publication together. Idempotent writes often help close the boundary.

**Connections:**

- Event systems advertise scoped guarantees → [Apache Kafka](#kafka)
- Processing guarantees depend on sink setup → [Apache Flink](#flink)
- Can help make sinks replay-safe → [Idempotency](#idempotency)

**Sources:** [Spark: Structured Streaming guide](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html)

<a id="watermark"></a>
### Event-time watermark

*concept · Progress despite late events*

**What it is:** A processing rule/estimate for event-time progress used to bound late-data handling and state.

**Why use it:** Lets streaming systems close windows and manage retained state.

**What sets it apart:** Different from a batch incremental cursor such as latest_loaded_id.

**Good to know:** Events arriving beyond the lateness policy may be dropped or routed differently. Define and test the business policy.

**Connections:**

- Used in → [Structured Streaming](#structured-streaming)
- Uses event-time progress rules → [Apache Flink](#flink)
- Do not confuse with batch loading cursor → [Incremental load](#incremental)

**Sources:** [Flink: event time and watermarks](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/)

<a id="time-travel"></a>
### Time travel / snapshots

*concept · Read an earlier table state*

**What it is:** A supported way to query retained versions of a changing table.

**Why use it:** Useful for investigation, reproducibility and some recovery workflows.

**What sets it apart:** A snapshot selects physical table state; SCD tracks business-effective attribute history.

**Good to know:** Old metadata and data files must remain available. Retention/cleanup can remove the ability to read a version.

**Connections:**

- Supported table feature in → [Delta Lake](#delta)
- Supported table feature in → [Apache Iceberg](#iceberg)
- Different history concept from → [SCD](#scd)

**Sources:** [Iceberg: snapshot expiration and file compaction](https://iceberg.apache.org/docs/latest/maintenance/) · [Delta Lake: introduction and feature scope](https://docs.delta.io/)

<a id="schema-evolution"></a>
### Schema evolution

*concept · Change structure deliberately*

**What it is:** Controlled changes to a dataset’s columns, types or other schema definition.

**Why use it:** Lets producers add or alter data while preserving intended compatibility.

**What sets it apart:** Adding a nullable field and renaming/changing meaning have different risks.

**Good to know:** Support depends on format, engine and consumer. A technically accepted change can still break a metric.

**Connections:**

- Supports defined evolution operations → [Apache Iceberg](#iceberg)
- Has writer/reader compatibility rules → [Avro](#avro)
- Can constrain published interfaces → [Data contract](#contracts)

**Sources:** [Iceberg: schema and partition evolution](https://iceberg.apache.org/docs/latest/evolution/)

<a id="contracts"></a>
### Data contract

*concept · A published producer/consumer promise*

**What it is:** An explicit agreement about data shape, meaning and expected behavior.

**Why use it:** Makes incompatible changes and responsibilities visible before consumers fail.

**What sets it apart:** A dbt model contract enforces part of the shape; a broader contract also covers ownership and service expectations.

**Good to know:** Supported constraints vary by adapter. A contract declaration does not enforce every quality or freshness rule.

**Connections:**

- Can enforce part of message shape → [Schema registry](#schema-registry)
- Supports data-product interfaces → [Data mesh](#mesh)
- Complemented by → [Data tests](#data-tests)

**Sources:** [dbt: model contracts and their limits](https://docs.getdbt.com/docs/mesh/govern/model-contracts)

## Layout & query work

**How do we avoid wasted reads?** Optimize the amount and movement of data after defining the correct answer.

<a id="partitioning"></a>
### Partitioning

*concept · Split data by a useful rule*

**What it is:** Organizing data into subsets, often by date or another limited-cardinality key.

**Why use it:** Allows suitable filters to avoid scanning unrelated subsets.

**What sets it apart:** Storage partitioning, Kafka partitions and Spark execution partitions are different uses of the word.

**Good to know:** A high-cardinality storage key can create too many tiny partitions. Pruning depends on supported filters and metadata.

**Connections:**

- Different physical organization from → [Clustering / sorting](#clustering)
- Supports partition evolution → [Apache Iceberg](#iceberg)
- Files may be grouped into storage partitions → [Parquet](#parquet)

**Sources:** [BigQuery: table partitioning](https://docs.cloud.google.com/bigquery/docs/partitioned-tables)

<a id="clustering"></a>
### Clustering / sorting

*concept · Bring related values together*

**What it is:** Organizing values so selected queries can skip more irrelevant data blocks.

**Why use it:** Improves selective scans when layout matches common filters.

**What sets it apart:** Usually organizes within a table or partition rather than creating a partition for every distinct value.

**Good to know:** “Clustering” means different things across engines. Maintenance cost and supported pruning behavior matter.

**Connections:**

- Can complement → [Partitioning](#partitioning)
- Helps selective scans with → [Pushdown & data skipping](#pushdown)

**Sources:** [BigQuery: clustered tables](https://docs.cloud.google.com/bigquery/docs/clustered-tables)

<a id="pushdown"></a>
### Pushdown & data skipping

*concept · Do less work nearer the data*

**What it is:** Pushdown delegates filters/columns/work to a lower layer; skipping avoids data ruled out by metadata.

**Why use it:** Reduces reads, network transfer or computation.

**What sets it apart:** Column projection, file statistics and remote predicate pushdown are related but distinct mechanisms.

**Good to know:** Not every predicate or connector supports pushdown. Inspect the query plan and actual scanned data.

**Connections:**

- Supports selective columnar reads → [Parquet](#parquet)
- Depends on connector capabilities in → [Trino](#trino)
- Lazy plans can optimize → [Polars](#polars)

**Sources:** [Apache Parquet: overview](https://parquet.apache.org/docs/overview/) · [Trino: predicate and projection pushdown](https://trino.io/docs/current/optimizer/pushdown.html)

<a id="shuffle"></a>
### Shuffle

*concept · Redistribute rows across workers*

**What it is:** Moving records among execution partitions so related records can be processed together.

**Why use it:** Enables distributed joins, aggregation and other key-based work.

**What sets it apart:** An execution data movement cost rather than a persistent table format.

**Good to know:** Skewed keys can overload a few workers. Read the plan before blindly increasing partition counts.

**Connections:**

- A major performance consideration in → [Apache Spark](#spark)
- Execution partitions differ from storage partitions → [Partitioning](#partitioning)

**Sources:** [Spark SQL: performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)

<a id="compaction"></a>
### Compaction / small files

*concept · Rewrite layout for efficient reads*

**What it is:** Combining or reorganizing data files to reduce overhead and improve layout.

**Why use it:** Counters many tiny files produced by repeated small writes.

**What sets it apart:** Changes physical layout; logical table rows should retain their meaning.

**Good to know:** Use table-aware maintenance. Deleting “old-looking” files by hand can break snapshots or concurrent readers.

**Connections:**

- Has table maintenance procedures → [Apache Iceberg](#iceberg)
- Includes table services → [Apache Hudi](#hudi)
- Retention and cleanup affect → [Time travel / snapshots](#time-travel)

**Sources:** [Iceberg: snapshot expiration and file compaction](https://iceberg.apache.org/docs/latest/maintenance/)

<a id="federation"></a>
### Query federation

*concept · One query across data systems*

**What it is:** Executing a query over multiple connected systems without first consolidating every dataset.

**Why use it:** Useful for exploration and some cross-system access patterns.

**What sets it apart:** Avoiding a stored copy does not eliminate network movement or remote computation.

**Good to know:** Permissions, pushdown, type mappings and source freshness differ; remote joins can be expensive.

**Connections:**

- Supported through connectors in → [Trino](#trino)
- Supported through connectors in → [Presto / PrestoDB](#presto)
- Uses connector configuration/metadata from → [Catalog](#catalog)

**Sources:** [Trino: analytical query use cases](https://trino.io/docs/current/overview/use-cases.html)

## Validate, discover & govern

**Can consumers trust and access it?** Testing, lineage, discovery and authorization are separate capabilities.

<a id="data-tests"></a>
### Data tests

*concept · Assertions about actual records*

**What it is:** Checks for properties such as unique keys, accepted values and relationships in produced data.

**Why use it:** Catch broken assumptions before publishing a consumer dataset.

**What sets it apart:** Different from unit tests on code/fixtures and from a declared schema contract.

**Good to know:** Choose tests from business risk. Passing uniqueness tests does not prove the population or denominator is correct.

**Connections:**

- Built into model workflows with → [dbt](#dbt)
- Alternative validation tooling → [Great Expectations](#gx)
- Can protect the chosen row meaning → [Grain](#grain)

**Sources:** [dbt: data tests](https://docs.getdbt.com/docs/build/data-tests)

<a id="gx"></a>
### Great Expectations

*tool · Data validation workflows*

**What it is:** A library/platform ecosystem for expressing and running data expectations.

**Why use it:** Useful for reusable validation outside a single SQL model framework.

**What sets it apart:** GX Core is the Python library; hosted capabilities are a separate product choice.

**Good to know:** Validation must sit at a meaningful publication boundary with a failure policy; checks alone do not repair data.

**Connections:**

- Implements validation checks → [Data tests](#data-tests)
- Can help validate parts of → [Data contract](#contracts)

**Sources:** [Great Expectations: GX Core](https://docs.greatexpectations.io/docs/core/introduction/)

<a id="lineage"></a>
### Lineage / OpenLineage

*concept · Trace dataset dependencies and runs*

**What it is:** Lineage records where data comes from and goes; OpenLineage specifies interoperable run/job/dataset metadata.

**Why use it:** Helps investigate incidents and assess downstream impact.

**What sets it apart:** Dependency visibility is different from validating business correctness.

**Good to know:** Collected lineage is only as complete as its integrations and supported paths; a missing edge may mean missing capture.

**Connections:**

- Can surface collected lineage in → [DataHub](#datahub)
- Can emit run metadata through integrations → [Apache Airflow](#airflow)
- Can capture supported lineage paths → [Unity Catalog](#unity)

**Sources:** [OpenLineage: specification and collection](https://openlineage.io/docs/)

<a id="datahub"></a>
### DataHub

*tool · Metadata discovery and context*

**What it is:** A metadata platform for discovering assets, ownership, lineage and related context.

**Why use it:** Helps people find datasets and understand their use.

**What sets it apart:** An enterprise metadata/discovery role, not the engine scanning the underlying records.

**Good to know:** Indexing metadata does not automatically enforce access to every data file. Connectors determine coverage.

**Connections:**

- Implements a discovery catalog role → [Catalog](#catalog)
- Can surface → [Lineage / OpenLineage](#lineage)
- Different role from execution metastore → [Hive Metastore](#hms)

**Sources:** [DataHub: project overview and metadata role](https://github.com/datahub-project/datahub)

<a id="iam"></a>
### IAM / RBAC

*concept · Identity, roles and permissions*

**What it is:** Identity/access management controls who can do what; role-based access groups permissions by role.

**Why use it:** Provides manageable, least-privilege access to systems and data.

**What sets it apart:** Signing in proves identity; authorization determines permitted actions.

**Good to know:** A SQL-level restriction can be bypassed by a separate broad storage credential. Review every access path.

**Connections:**

- Can govern data access in → [Unity Catalog](#unity)
- Storage permissions also matter for → [Amazon S3](#s3)
- Complements published access expectations → [Data contract](#contracts)

**Sources:** [AWS: identity and access management](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html) · [BigQuery: row-level security](https://docs.cloud.google.com/bigquery/docs/row-level-security-intro)

<a id="slo"></a>
### SLI / SLO / SLA

*concept · Measure and promise service behavior*

**What it is:** An SLI measures behavior, an SLO sets a target, and an SLA adds an agreement and consequences.

**Why use it:** Turns vague “reliable data” requests into observable service expectations.

**What sets it apart:** Dataset freshness and completion delay are different from the source’s publication schedule.

**Good to know:** Define the population, measurement window and incident owner. No pipeline can promise data before its source publishes it.

**Connections:**

- Can include service expectations in → [Data contract](#contracts)
- Can monitor workflow delivery through → [Apache Airflow](#airflow)

**Sources:** [Google SRE: service-level objectives](https://sre.google/sre-book/service-level-objectives/)

## Publish useful answers

**What do people consume?** BI, semantic metrics and data apps sit above modeled data; they do not fix its grain.

<a id="semantic"></a>
### Semantic layer

*concept · Shared dimensions and metrics*

**What it is:** A consumer-facing model of business entities, relationships and metric definitions.

**Why use it:** Keeps measures such as cancellation rate consistent across consumers.

**What sets it apart:** Different from a storage schema or the visualization that renders a chart.

**Good to know:** A shared definition still needs valid joins, population rules and tested data underneath.

**Connections:**

- One ecosystem with a semantic-layer product → [dbt](#dbt)
- Has semantic modeling capabilities → [Power BI](#powerbi)
- Metric validity depends on → [Grain](#grain)

**Sources:** [dbt: semantic layer](https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-sl)

<a id="powerbi"></a>
### Power BI

*tool · Semantic models and reporting*

**What it is:** Microsoft tools/services for modeling, visualizing and sharing analytical data.

**Why use it:** Useful for business reporting and interactive exploration.

**What sets it apart:** Combines semantic modeling with visuals; distinct from the lake files holding source data.

**Good to know:** Import, DirectQuery and other connection modes have different freshness, performance and deployment behavior.

**Connections:**

- Can define business semantics in → [Semantic layer](#semantic)
- Integrated analytics ecosystem → [Microsoft Fabric](#fabric)
- Can consume curated data from → [Data warehouse](#warehouse)

**Sources:** [Microsoft: Power BI overview](https://learn.microsoft.com/en-us/power-bi/fundamentals/power-bi-overview)

<a id="tableau"></a>
### Tableau

*tool · Visual analytics and dashboards*

**What it is:** Tools for building and sharing visual analysis over connected data.

**Why use it:** Useful for exploratory visual analysis and business dashboards.

**What sets it apart:** A consumer interface rather than the engine/storage architecture for the whole pipeline.

**Good to know:** Live connections and extracts have different refresh behavior; verify the chart’s actual data source and grain.

**Connections:**

- Can consume analytical tables from → [Data warehouse](#warehouse)
- Alternative BI interface → [Power BI](#powerbi)

**Sources:** [Tableau: visualization and authoring](https://help.tableau.com/current/pro/desktop/en-us/gettingstarted_overview.htm)

<a id="superset"></a>
### Apache Superset

*tool · Open-source SQL-oriented BI*

**What it is:** A data exploration and visualization platform over connected analytical databases.

**Why use it:** Useful for self-hosted dashboards and SQL exploration.

**What sets it apart:** Queries an underlying engine rather than replacing its storage and execution.

**Good to know:** Self-hosting still requires authentication, authorization, upgrades and reliable database connectivity.

**Connections:**

- Can visualize queries executed by → [Trino](#trino)
- Compare deployment/connector support before connecting → [DuckDB](#duckdb)
- Metrics must still be defined consistently → [Semantic layer](#semantic)

**Sources:** [Apache Superset: project overview](https://github.com/apache/superset)

<a id="streamlit"></a>
### Streamlit

*tool · Python data apps*

**What it is:** A framework for creating interactive applications from Python code.

**Why use it:** Useful for a focused portfolio explorer with filters and clear explanatory text.

**What sets it apart:** An app framework, not a warehouse or ready-made enterprise BI governance layer.

**Good to know:** Avoid exposing secrets or unrestricted query execution. Cache with explicit freshness and resource limits.

**Connections:**

- Can query a local analytical dataset with → [DuckDB](#duckdb)
- Uses Python code alongside → [Python ingestion](#python)
- Different publishing experience from → [Power BI](#powerbi)

**Sources:** [Streamlit: documentation](https://docs.streamlit.io/)

## Build & run the stack

**How is it repeatable?** Infrastructure orchestration, workflow orchestration and code quality are different jobs.

<a id="docker"></a>
### Docker

*tool · Package code and runtime*

**What it is:** Tools for building images and running isolated application containers.

**Why use it:** Makes runtime dependencies and deployment packaging more reproducible.

**What sets it apart:** An image is the packaged template; a container is a running instance.

**Good to know:** Container files are not automatically durable storage. Use explicit persistence and keep credentials out of images.

**Connections:**

- Can schedule containerized applications → [Kubernetes](#kubernetes)
- Can package a runtime for → [Apache Airflow](#airflow)

**Sources:** [Docker: containers and images](https://docs.docker.com/get-started/docker-overview/)

<a id="kubernetes"></a>
### Kubernetes

*tool · Operate containerized workloads*

**What it is:** A platform for scheduling and managing containerized applications and their resources.

**Why use it:** Useful when a deployment needs cluster-level workload control.

**What sets it apart:** Schedules infrastructure/workloads; Airflow schedules data-task dependencies.

**Good to know:** Cluster management adds real operating work. It is not required for your first local data pipeline.

**Connections:**

- Uses container images built by tools such as → [Docker](#docker)
- Different cluster resource-management ecosystem → [YARN](#yarn)
- Different orchestration responsibility from → [Apache Airflow](#airflow)

**Sources:** [Kubernetes: role and concepts](https://kubernetes.io/docs/concepts/overview/)

<a id="yarn"></a>
### YARN

*tool · Hadoop cluster resource allocation*

**What it is:** A resource-management layer coordinating cluster capacity and application execution.

**Why use it:** Lets multiple processing applications share Hadoop cluster resources.

**What sets it apart:** Allocates application resources rather than describing business pipeline dependencies.

**Good to know:** Spark can run on YARN, Kubernetes or its own standalone cluster manager; these are deployment choices.

**Connections:**

- Part of → [Hadoop](#hadoop)
- Can allocate execution resources for → [Apache Spark](#spark)
- Different scheduling layer from → [Apache Airflow](#airflow)

**Sources:** [Hadoop: YARN architecture](https://hadoop.apache.org/docs/stable/hadoop-yarn/hadoop-yarn-site/YARN.html) · [Apache Spark: overview](https://spark.apache.org/docs/latest/)

<a id="terraform"></a>
### Terraform

*tool · Infrastructure as code*

**What it is:** A tool for describing and managing infrastructure through provider-backed configuration and state.

**Why use it:** Makes infrastructure changes reviewable and repeatable.

**What sets it apart:** Provisions resources; does not perform the dataset transformation itself.

**Good to know:** Review plans and protect state. A small local project may not need cloud provisioning.

**Connections:**

- Can provision cloud access resources → [IAM / RBAC](#iam)
- Can manage related infrastructure → [Kubernetes](#kubernetes)
- Can be checked in CI with → [GitHub Actions / CI](#actions)

**Sources:** [HashiCorp: Terraform and infrastructure as code](https://developer.hashicorp.com/terraform/intro)

<a id="actions"></a>
### GitHub Actions / CI

*tool · Automated repository checks*

**What it is:** Workflow automation triggered by events such as pull requests or schedules.

**Why use it:** Runs repeatable lint, tests and build checks before changes are accepted.

**What sets it apart:** CI validates changes; deployment and production data orchestration have separate requirements.

**Good to know:** A green workflow only proves the checks you actually ran. Keep fixture tests independent of personal credentials.

**Connections:**

- Can run tests with → [pytest](#pytest)
- Can lint Python with → [Ruff](#ruff)
- Can validate models built with → [dbt](#dbt)

**Sources:** [GitHub: Actions workflows and CI](https://docs.github.com/en/actions/get-started/understand-github-actions)

<a id="uv"></a>
### uv

*tool · Python projects and dependencies*

**What it is:** Tools for managing Python versions, environments, dependencies and project execution.

**Why use it:** Keeps a project’s runnable environment explicit and reproducible.

**What sets it apart:** Manages the environment; DuckDB or pandas performs the data computation.

**Good to know:** Commit the relevant project and lock files. Development dependencies such as Ruff serve tooling, not runtime data logic.

**Connections:**

- Manages environments for scripts → [Python ingestion](#python)
- Can install as a development dependency → [Ruff](#ruff)
- Can install the Python package for → [DuckDB](#duckdb)

**Sources:** [Astral: uv](https://docs.astral.sh/uv/)

<a id="ruff"></a>
### Ruff

*tool · Python linting and formatting*

**What it is:** A Python linter and formatter.

**Why use it:** Catches selected code issues and keeps style consistent.

**What sets it apart:** Static code checks are different from executing assertions on data behavior.

**Good to know:** Passing lint does not prove correct retries, SQL logic or business metrics.

**Connections:**

- Complements behavior tests written with → [pytest](#pytest)
- Can run in CI through → [GitHub Actions / CI](#actions)
- Can be managed as a development dependency by → [uv](#uv)

**Sources:** [Astral: Ruff](https://docs.astral.sh/ruff/)

<a id="pytest"></a>
### pytest

*tool · Python behavior tests*

**What it is:** A test framework with assertions, fixtures and parametrization.

**Why use it:** Makes edge cases, regressions and failure behavior repeatably testable.

**What sets it apart:** Tests selected behavior; neither lint nor coverage percentage is a correctness proof.

**Good to know:** Use small fixtures and explicit expected outcomes; test reruns, malformed inputs and failure boundaries.

**Connections:**

- Tests ingestion code written in → [Python ingestion](#python)
- Can prove rerun behavior such as → [Idempotency](#idempotency)
- Can run automatically through → [GitHub Actions / CI](#actions)

**Sources:** [pytest: test framework](https://docs.pytest.org/en/stable/)

