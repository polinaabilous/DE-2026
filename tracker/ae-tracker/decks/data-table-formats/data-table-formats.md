# Table formats: Delta, Iceberg, Hudi & CDC

*Companion to `data-table-formats.html`: the same lessons with the same numbering.*

This deck has no runnable code; it explains concepts with the same three sample orders. Format features and engine support change between versions, so check the linked project documentation for the version you use. This deck is one half of the former “Data formats in practice” guide (the other half is *File formats*).

**Additions in this split:** On-the-job notes on the main lessons, two table-format scenarios, and a table-format cheat sheet.

## Contents

1. [Table formats](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [One dataset, several workloads](#slide-2)
3. [From one file to a table that keeps changing](#slide-3)
4. [A table format keeps track of the current data](#slide-4)
5. [Transactions, versions, and schema changes](#slide-5)
6. [Delta Lake: Parquet plus a transaction log](#slide-6)
7. [Apache Iceberg: shared tables that can evolve](#slide-7)
8. [CDC: keep a copy in step with database changes](#slide-8)
9. [Apache Hudi: optimize for changing records](#slide-9)
10. [Delta, Iceberg, or Hudi: choose by workload](#slide-10)
11. [How the formats can work together](#slide-11)
12. [Scenarios: evaluate the tradeoff](#slide-12)
13. [Glossary: working vocabulary](#slide-13)
14. [Recap: connect storage choices to pipeline design](#slide-14)
15. [References: further reading, when you need it](#slide-15)
16. [Cheat sheet: table formats](#slide-16)

---

<a id="slide-1"></a>
## 1. Table formats

A folder of Parquet files is not yet a table you can update safely. Table formats add the bookkeeping: which files are current, how a change is committed, and how to read an earlier version.

Explore Delta Lake, Apache Iceberg and Apache Hudi, and the change data capture (CDC) pipelines that feed them. It builds on the *File formats* deck.

- **From files to tables:** Table formats. Track the current files, commit changes, keep versions
- **The three formats:** Delta · Iceberg · Hudi. Transaction log, snapshots and catalogs, record-level updates
- **Feeding the table:** Change data capture. Keep a copy in step with database changes
- **Put it together:** Choose by workload. How file and table formats work together in a pipeline

**Part of a split series.** This deck is the second half of the former “Data formats in practice” guide; the first half is *File formats*.

**Added in this split:** On-the-job notes on each format, two table-format scenarios (shared tables, recovery with time travel), and a table-format cheat sheet.

**Prefer an article?** Select Read to see every lesson together, or Markdown ↗ for the companion.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Parquet files alone cannot tell a reader which files make up today’s table, apply an update safely, or show yesterday’s version. Table formats (Delta Lake, Apache Iceberg, Apache Hudi) add that bookkeeping, and they are the storage layer of every modern lakehouse, including Fabric and Databricks.

#### Where you will use it

- Fabric lakehouses and Databricks: every managed table is a Delta table.
- MERGE-based loads of CDC and deduplicated batches into Silver tables.
- Recovering from a bad load with table history (time travel).

#### What goes wrong without it

- Readers see half-written data while a job is still writing files.
- Updates rewritten by hand as “delete the folder and reload everything”.
- Two engines disagree about which files belong to the table.

#### Who expects you to know it

- Data engineers and platform engineers running lakehouses.
- Interviewers: “how does the Delta log give ACID?”, “Delta vs Iceberg?”, “what is CDC?”.

> **On the job:** A nightly job merges corrected orders into a Delta table. One night the source sends bad data; you query the previous version to confirm, restore it, fix the input and re-run. Without a table format this would be a manual file-level recovery.

> **The main idea:** table formats turn folders of files into tables with commits, versions and updates; they are the backbone of the lakehouse.

*Read more:* [Delta Lake documentation](https://docs.delta.io/), [Fabric: lakehouse and Delta tables](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Spark, Databricks or Fabric pipelines | Delta Lake | Native support, MERGE, time travel |
| One table shared by several engines | Apache Iceberg with a catalog | Engine-neutral metadata, hidden partitioning |
| Frequent record-level upserts from CDC | Hudi (or Delta / Iceberg with MERGE) | Built around record keys and incremental pulls |
| Keep a copy of an operational database current | Log-based CDC into a table format | Applies inserts, updates and deletes in order |
| Static files that never change | Plain Parquet files | A table format adds little |

#### How interviews test it

- “How does a transaction log make writes atomic?”
- “Delta vs Iceberg vs Hudi: how would you choose?”
- “What is CDC, and how do you apply it to a lake table?”

#### Where it sits in your learning path

- Builds on: File formats (Parquet in particular).
- Next: Delta Lake operations in Spark (MERGE, OPTIMIZE, VACUUM) and storage architecture (lake, warehouse, lakehouse).
- Later: ingestion tools and CDC in practice.

> **The main idea:** use a table format whenever a lake table changes over time or is shared; keep plain files for static exchange.

---

<a id="slide-2"></a>
## 2. One dataset, several workloads

*Foundations · follow the orders through a pipeline*

We will use the same orders throughout. Amounts are in US dollars, and each row represents one order. This is the table's **grain**: what a single record represents.

| order_id | country | amount |
| --- | --- | --- |
| 101 | US | 25.00 |
| 102 | GB | 40.00 |
| 103 | US | 15.00 |

### Exchanging complete records

A partner needs a daily export. An application sends a new order. A payment service publishes a status change. These jobs usually move complete records, so readability, message size, and an agreed structure matter.

### Analyzing and maintaining a dataset

A report totals sales across millions of orders but reads only a few columns. Meanwhile, refunds change existing records. Now selective reading, efficient storage, and consistent updates become important.

**Remember:** choose a format for the work being done with the data. The same dataset can use several formats at different stages.

Sources: [Parquet overview](https://parquet.apache.org/docs/overview/), [DuckDB CSV import settings](https://duckdb.org/docs/current/data/csv/overview).

---

<a id="slide-3"></a>
## 3. From one file to a table that keeps changing

*Table formats · why we need another idea*

Our shop grows. Orders are now saved across many files in cloud storage. A **data lake** is a place where a team stores datasets as files, often in a service such as Amazon S3.

### Yesterday was straightforward

A report reads yesterday's saved orders and adds up the amounts. If those orders are fixed, a collection of Parquet files may be enough for the job.

Today, order 101 is refunded. We need to change its status. New orders are also arriving while someone runs a report.

### Now we need coordination

Which files contain the current orders? When is an update complete? Can a report see one consistent version while changes are happening?

A **table format** adds bookkeeping and rules around the data files. Delta Lake, Iceberg, and Hudi help tools manage those files as a changing table.

A **lakehouse** brings table-management features to data kept in a lake, allowing file storage and database-like operations to work together.

**Remember:** the file format handles the contents of individual files. The table format helps manage the whole table over time.

Sources: [Delta Lake introduction](https://docs.delta.io/), [Iceberg introduction](https://iceberg.apache.org/docs/latest/).

---

<a id="slide-4"></a>
## 4. A table format keeps track of the current data

*Table formats · a concrete example of a table version*

Imagine a simplified table with two files. One contains order 101; another contains orders 102 and 103. To record the refund, our tool writes a replacement for the first file and records a new table version.

```diagram
Version 1: original order 101 + orders 102 and 103
Version 2: refunded order 101 + orders 102 and 103
The table's bookkeeping tells the reader which files to use.
```

The bookkeeping is called **metadata**: information describing the data, such as its schema and which files belong to a version. A **snapshot** is a particular version of the table.

A **commit** publishes the new version after its data is ready. The unchanged file can be reused across both versions; each snapshot does not need a complete copy of the table.

> **On the job:** In a Fabric lakehouse or Databricks workspace every managed table is a Delta table: Parquet files plus a log. Knowing what the log tracks explains why you should not add or delete files in the table folder by hand.

**Remember:** Parquet and a table format can work together. Parquet holds the order values; the table format records how the files make up the table. The diagram is one simplified update strategy.

Sources: [Delta table versions](https://docs.delta.io/delta-batch/), [Iceberg reliability](https://iceberg.apache.org/docs/latest/reliability/).

---

<a id="slide-5"></a>
## 5. Transactions, versions, and schema changes

*Table formats · what a managed table adds*

Table formats give compatible engines rules for coordinating files, updates, and metadata. Their value becomes clear when several jobs read or change the same dataset.

### Publish a complete change

A **transaction** publishes a set of changes together. A refund job might write several files before committing the new version. Readers can keep using a consistent snapshot while that work completes.

This is part of **ACID** behavior: atomicity (all-or-nothing changes), consistency (declared rules remain valid), isolation (concurrent work is coordinated), and durability (committed changes persist). These guarantees do not prove that a business calculation is correct.

### Evolve and reproduce the table

**Schema enforcement** checks incoming structure; **schema evolution** permits supported changes, such as adding a column. Their exact behavior depends on the engine and configuration.

**Time travel** queries an earlier version so a report can be reproduced. Both its metadata and required data files must still be retained. An **upsert** updates a matching record or inserts a new one.

> **On the job:** Atomic commits are why a failed nightly load does not leave half-written data for the morning dashboard, and versions are how you answer “what did this table look like yesterday?” during an incident.

**Remember:** table formats add coordinated changes and table-level structure around the files. Use tools that understand the table's metadata.

Sources: [Delta Lake features](https://docs.delta.io/), [Delta schema and history](https://docs.delta.io/delta-batch/), [Iceberg reliability](https://iceberg.apache.org/docs/latest/reliability/).

---

<a id="slide-6"></a>
## 6. Delta Lake: Parquet plus a transaction log

*Table formats · updates, history, and batch or streaming workflows*

A Delta table stores its data in Parquet files and records table changes in a **transaction log**, conventionally under `_delta_log`. A Delta-aware reader uses the log to identify a consistent table version.

### Apply changes with MERGE

Suppose a daily delivery contains a refund for order 101 and a new order 104. A **MERGE** operation can match on `order_id`, update 101, and insert 104 in one table operation.

This is useful for maintaining a current reporting table from incoming changes. Delta also supports schema checks and retained table history, so you can inspect changes and reproduce earlier results.

### Where Delta fits

Delta is a natural fit for Spark and Databricks pipelines, including scheduled batches and streaming ingestion. Spark processes the data; Delta defines how the table is stored and updated.

Read the dataset as a Delta table rather than selecting every Parquet file in its folder. Old files may still be present for earlier versions, so the transaction log determines which files belong to the selected version.

> **On the job:** MERGE into Delta is the standard way to apply updates and deduplicated CDC batches in Spark and Fabric pipelines; OPTIMIZE and VACUUM are the routine maintenance jobs that keep those tables fast and small.

**Remember:** Delta combines Parquet's analytical storage with a transaction log that coordinates changes to the whole table.

Sources: [Delta Lake introduction](https://docs.delta.io/), [Delta MERGE operations](https://docs.delta.io/delta-update/), [Delta reads and history](https://docs.delta.io/delta-batch/).

---

<a id="slide-7"></a>
## 7. Apache Iceberg: shared tables that can evolve

*Table formats · multiple engines, snapshots, and partitioning*

Iceberg tracks snapshots through metadata and **manifests**, lists describing data files. It commonly uses Parquet, and also supports ORC and Avro data files. A catalog helps engines locate the table's current metadata.

### Share a table across engines

One team might prepare orders with Spark while another queries the same Iceberg table with Trino. Both must use compatible connectors and the appropriate catalog; support for particular write operations still varies.

Iceberg identifies columns internally with stable IDs. That allows supported changes such as renaming a column without confusing its identity with another field.

### Partition by a useful business dimension

**Partitioning** groups data by values such as order date so queries can avoid unrelated groups. Iceberg's **hidden partitioning** lets a date filter use that organization without requiring a separate partition column in the query.

Its layout can also evolve. A table might start grouped by month and later write new data grouped by day; readers can work with both layouts without immediately rewriting the older files.

> **On the job:** Iceberg is the common choice when several engines (Spark, Trino, Snowflake, BigQuery) must share one table through a catalog. Platform teams pick it to avoid locking data into one vendor.

**Remember:** Iceberg is a strong fit for shared analytical tables whose schema and storage layout need to evolve over time.

Sources: [Iceberg introduction](https://iceberg.apache.org/docs/latest/), [Iceberg evolution](https://iceberg.apache.org/docs/latest/evolution/), [Iceberg partitioning](https://iceberg.apache.org/docs/latest/partitioning/).

---

<a id="slide-8"></a>
## 8. CDC: keep a copy in step with database changes

*Before Hudi · change data capture*

The shop's application database stores the live orders. We also want a copy for reporting. **CDC means change data capture**: detecting inserts, updates, and deletes in the source database and passing those changes to another system.

| What happens in the shop | Change to pass along | What the reporting copy should do |
| --- | --- | --- |
| Order 104 is placed | Insert order 104 | Add the new order. |
| Order 101 is refunded | Update order 101 | Change its status to refunded. |
| A test order is removed | Delete that order | Remove the corresponding record. |

After an initial copy, a CDC tool can read database change logs and send the changes instead of recopying every row. Events typically identify the record, the operation, and an ordering position or timestamp.

The destination uses those details to apply changes to the right record in the intended order. Capture and application are separate jobs: Debezium can capture the changes, while a pipeline applies them to a Delta, Iceberg, or Hudi table.

> **On the job:** Keeping a warehouse copy of an operational database in step is a classic data-engineering task. Log-based CDC tools such as Debezium, Fivetran or Fabric mirroring read the database log and emit inserts, updates and deletes for the pipeline to merge.

**Remember:** CDC is a process, not a file format. It explains why a reporting table may need frequent updates as well as new rows.

Sources: [Debezium: capturing database changes](https://debezium.io/documentation/reference/stable/).

---

<a id="slide-9"></a>
## 9. Apache Hudi: optimize for changing records

*Table formats · upserts and incremental processing*

Hudi combines an open table format with ingestion and maintenance tools. A **record key**, such as `order_id`, identifies the order to update. Its focus on upserts and incremental work makes it useful for CDC-fed reporting tables.

### Two ways to handle updates

**Copy on Write** merges changes into new versions of columnar base files during a write. Queries read the resulting base files, which keeps reads straightforward but can require more rewriting.

**Merge on Read** can first store updates in log files. Queries combine base data with those updates for the latest view; a later **compaction** merges them into base files. This moves some work from ingestion to reads and maintenance.

### Work on the changed data

Hudi's timeline records table actions. **Incremental queries** can retrieve records changed since an earlier point, allowing a downstream job to process a smaller update set instead of rescanning the entire table.

This fits orders whose status changes frequently. Choose the write strategy according to how quickly changes must arrive and how much work reads can afford. Main data files commonly use Parquet.

> **On the job:** Hudi appears in high-churn ingestion (many updates per record) and in AWS-heavy stacks. Even if your platform uses Delta or Iceberg, interviewers may ask you to compare the three.

**Remember:** Hudi is especially relevant when record-level changes, ingestion latency, and incremental downstream processing drive the design.

Sources: [Hudi overview](https://hudi.apache.org/docs/overview/), [Hudi table and query types](https://hudi.apache.org/docs/table_types/).

---

<a id="slide-10"></a>
## 10. Delta, Iceberg, or Hudi: choose by workload

*Choose a table · start with the project you actually have*

All three help manage changing tables over files. Their capabilities overlap, so these are useful starting points rather than a feature ranking.

| Option | A good reason to explore it | Our shop example |
| --- | --- | --- |
| Delta Lake | Your team or course already works with Delta in Spark or Databricks. | Maintain an orders table and review its history after refunds. |
| Apache Iceberg | Several compatible data tools need to share analytical tables. | Prepare orders in one tool and query the same table in another. |
| Apache Hudi | Frequent record updates and incremental processing are central to the pipeline. | Keep a reporting copy current as database changes arrive. |

Compare the actual readers and writers you need, the frequency of updates, and whether downstream jobs need change-based processing. Then confirm that the platform supports the required table features. For a local, fixed dataset, a Parquet file may already meet the need.

**Remember:** you usually choose one table format for a given table. You do not need to use all three in one project.

Sources: [Delta Lake documentation](https://docs.delta.io/), [Apache Iceberg introduction](https://iceberg.apache.org/docs/latest/), [Apache Hudi overview](https://hudi.apache.org/docs/overview/).

---

<a id="slide-11"></a>
## 11. How the formats can work together

*Put it together · one possible journey for our orders*

A **data pipeline** is a series of steps that moves and prepares data. Different steps can use different formats because they do different jobs.

1. **Receive orders as JSON.** The shop's API returns orders with customer details and purchased items.
2. **Prepare the data.** Your program selects useful fields, checks amounts, and produces a consistent table of orders.
3. **Save for reporting.** A simple project can save Parquet files. A project needing managed updates could use a Delta table, whose data files are Parquet.
4. **Answer business questions.** A data tool calculates daily sales or refund totals.
5. **Share a result as CSV.** A colleague opens the summary in a spreadsheet.

In an event-based version of this pipeline, order messages might arrive as Avro. In another platform, the reporting table might use Iceberg or Hudi instead.

**Remember:** you do not have to force the whole pipeline into one format. Choose a suitable representation at each step.

Sources: [Fabric: lakehouse and Delta tables](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables), [Parquet overview](https://parquet.apache.org/docs/overview/).

---

<a id="slide-12"></a>
## 12. Scenarios: evaluate the tradeoff

*Scenarios · reveal the reasoning behind each choice*

Each situation suggests a starting point. There can be other valid choices depending on the tools already in use.

<details><summary>A database sends frequent order corrections into a reporting lake.</summary>

**Explore Hudi in a CDC pipeline.** Its focus on record updates and incremental work fits this need. Delta and Iceberg can also handle updates; existing platform support still matters.

</details>

<details><summary>Spark jobs write a sales table that analysts also query from another engine, and the platform team wants to avoid tying the data to one vendor.</summary>

**Consider Iceberg with a shared catalog.** It is designed for tables shared across engines. Check that every engine’s connector supports the features you need, such as row-level deletes.

</details>

<details><summary>Yesterday’s load overwrote a Delta table with bad data, and a report needs the previous figures now.</summary>

**Use the table history.** Query or restore the earlier version (time travel), then fix and re-run the load. This works only while the old files are still retained.

</details>

**Remember:** a useful answer includes both a format and a reason tied to the task.

Sources: [Delta Lake: time travel](https://docs.delta.io/latest/delta-batch.html#query-an-older-snapshot-of-a-table-time-travel), [Apache Iceberg introduction](https://iceberg.apache.org/docs/latest/), [Apache Hudi overview](https://hudi.apache.org/docs/overview/).

---

<a id="slide-13"></a>
## 13. Glossary: working vocabulary

*Quick reference · connect the terms to their purpose*

| Term | What it means in practice |
|---|---|
| Schema / schema evolution | The expected fields and types / supported changes to that structure over time. |
| Grain / record key | What one row represents / the value that identifies a record for matching updates. |
| Partitioning | Group data by a useful dimension, such as date, so queries can avoid unrelated groups. |
| Metadata / catalog | Information describing the data / a service that helps locate and manage named tables. |
| Transaction / snapshot | A change committed as a unit / a particular version of a table. |
| CDC / upsert | Capture database inserts, updates, and deletes / update a match or insert a new record. |
| Incremental / compaction | Process what changed / reorganize files or merge logged changes to improve reads. |

---

<a id="slide-14"></a>
## 14. Recap: connect storage choices to pipeline design

*Recap · connect each name to a practical job*

1. A **table format** tracks which data files make up the current table, so readers never see half-written changes.
2. Every change is a **commit**; earlier versions stay readable while their files are retained (time travel).
3. **Delta Lake** = Parquet + a transaction log; **Iceberg** = snapshots and manifests located through a catalog; **Hudi** = a timeline built around record keys.
4. **CDC** captures inserts, updates and deletes from a database so a lake table can be kept in step with MERGE or upserts.
5. Choose by the platform and the workload, then verify the features your engines actually support.

#### Three ways to manage changing tables

**Delta Lake, Apache Iceberg, and Apache Hudi** keep track of a table’s data files and changes. They let compatible tools offer features such as updates and consistent table versions.

For example, a Delta table stores order data in Parquet files and records which files make up each version. That is the practical difference between a file format and a table format.

#### Choosing between them

Start from the platform and the workload: Delta where Spark, Databricks or Fabric lead; Iceberg for tables shared across engines through a catalog; Hudi for record-level upserts and incremental CDC pipelines. Feature support changes quickly, so check the engine’s documentation.

**Remember:** “I want to keep a reporting table current” is a table-format need: commits, versions and updates on top of the data files.

---

<a id="slide-15"></a>
## 15. References: further reading, when you need it

*References · optional next steps*

The shop examples connect format design to practical workloads. These references provide implementation detail when you need it; sources are also linked beside the relevant explanations.

- [Parquet overview](https://parquet.apache.org/docs/overview/) and [ORC background](https://orc.apache.org/docs/): formats designed for analysis.
- [Delta Lake documentation](https://docs.delta.io/): tables, updates, and history.
- [Apache Iceberg introduction](https://iceberg.apache.org/docs/latest/): shared analytical tables.
- [Apache Hudi overview](https://hudi.apache.org/docs/overview/): tables and incremental pipelines.
- [Debezium documentation](https://debezium.io/documentation/reference/stable/): capturing database changes.
- [Fabric: lakehouse and Delta tables](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables): how a managed platform uses Delta.

A readable overview on Medium, “A comprehensive guide to file formats in data engineering”, inspired the explanatory style. Technical explanations here use the project documentation linked above. Format choices are practical guidance, not universal performance rankings.

---

<a id="slide-16"></a>
## 16. Cheat sheet: table formats

*Keep this slide · three table formats*

**File formats** organize values inside files or messages. **Table formats** coordinate data files, schemas, and table versions. They work together: a Delta table, for example, stores its data in Parquet.

**Table formats — management above the data files**

| Format | Data & bookkeeping | Strong fit | Key operating idea |
|---|---|---|---|
| **Delta Lake** | Parquet data + transaction log. | Spark/Databricks workflows, merges, batch and streaming tables. | Use a Delta reader; the log identifies the selected table version. |
| **Apache Iceberg** | Parquet, ORC, or Avro data + snapshots and manifests; catalog locates metadata. | Shared tables across engines, schema and partition-layout evolution. | Hidden partitioning connects filters to layout; verify connector capabilities. |
| **Apache Hudi** | Commonly Parquet base files + timeline; update logs for Merge on Read. | Frequent upserts, CDC ingestion, incremental processing. | Record keys match updates; Copy on Write favors simple reads, Merge on Read defers some write work. |

**Shared table capabilities:** coordinated commits, evolving schemas, updates/deletes, and retained versions through compatible engines. Read and write support varies by engine and feature; history needs retained files and metadata.

**Terms to retain:** CDC = capture database changes · upsert = update or insert · partitioning = group data to narrow reads · compaction = reorganize files or merge updates for better reads.
