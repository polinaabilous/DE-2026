# Data architecture: how we got here

Warehouse → lake → lakehouse · cloud, streaming, data mesh and the decisions behind them

Researched 21 October 2026; rewritten as a narrative with first-use tool explanations on 22 October 2026. Generated alongside the HTML deck from `tracker/scripts/build-architecture-deck.cjs`.

New tools have compact first-use reference cards beside the story (collapsed below it on small screens). The same definitions are included here and in deck search.

The guide follows a fictional travel company through connected explanations of reporting, flexible storage, reliable table state and ownership. Read continuously with the Read as story control, or navigate one section at a time. Historical accounts are identified separately; the fictional company is not a claim about the portfolio’s available sources. The local synthetic lab is in [lab/README.md](lab/README.md). It does not demonstrate a distributed lakehouse commit protocol.

## Contents

1. [Data architecture: how we got here](#slide-1)
2. [Meet the team and the question it needs to answer](#slide-2)
3. [Why querying the applications directly became awkward](#slide-3)
4. [Decide what the reporting data means](#slide-4)
5. [The warehouse gives reporting a dependable home](#slide-5)
6. [How a traditional warehouse pipeline did the work](#slide-6)
7. [The business starts asking questions the model never anticipated](#slide-7)
8. [Hadoop made a large collection of files usable across machines](#slide-8)
9. [The lake preserves data before every future use is known](#slide-9)
10. [Keeping the data and answering quickly were different problems](#slide-10)
11. [Object storage lets the files outlive the compute machines](#slide-11)
12. [Warehouses also changed when they moved to the cloud](#slide-12)
13. [ETL and ELT describe where a transformation takes place](#slide-13)
14. [A lake and a warehouse often worked together](#slide-14)
15. [A correction exposes what a folder cannot decide](#slide-15)
16. [The lakehouse brings reliable table behavior to lake data](#slide-16)
17. [Walk through one query, from a table name to stored values](#slide-17)
18. [Delta, Iceberg and Hudi address overlapping table problems](#slide-18)
19. [Reliable object reads do not publish a whole table change](#slide-19)
20. [Today, product labels tell only part of the architecture](#slide-20)
21. [A shared table still needs controlled access and an owner](#slide-21)
22. [Medallion names the steps from source evidence to useful answers](#slide-22)
23. [Streaming changes when work happens, rather than replacing the storage story](#slide-23)
24. [Eventually, the slow part may be the central team](#slide-24)
25. [Four principles, explained through the team](#slide-25)
26. [A data product is a promise a consumer can rely on](#slide-26)
27. [Now the overlapping architecture words have a place](#slide-27)
28. [Choose tools after you can explain the work](#slide-28)
29. [The right starting point depends on the problem you have now](#slide-29)
30. [Your Flight Reliability v1 already has a coherent architecture](#slide-30)
31. [Extend the project when you can state the new need](#slide-31)
32. [A migration should prove that the consumer still gets the right answer](#slide-32)
33. [The lab makes the wrong population visible in eight rows](#slide-33)
34. [Run it, then inspect the corrected record](#slide-34)
35. [Explain the story before listing the tools](#slide-35)
36. [Practise choosing a design from a concrete situation](#slide-36)
37. [A glossary to revisit after the story](#slide-37)
38. [Retell the evolution in your own words](#slide-38)
39. [Primary sources: history and mechanisms](#slide-39)
40. [Primary sources: current capabilities and ownership](#slide-40)

---

<a id="slide-1"></a>
## 1. Data architecture: how we got here

A warehouse, a lake, a lakehouse, a mesh: it is easy to learn these names and still have no clear picture of why a team would move between them. This guide follows the problems behind the names, using one travel company as a running example.

We begin with a team that wants trustworthy reports. As its data and responsibilities grow, it needs to retain more detail, run different kinds of analysis, correct published records and share ownership. Each change solves a particular problem and creates some new work. Real-world developments overlapped; our example follows a learning sequence.

Read in order for the connected explanation, then use the glossary and exercises for review.

> **Our running example:** The company and its situations are fictional. The historical accounts are identified separately. Later, we connect the story to your actual Flight Reliability project and its small synthetic lab.

**The main idea:** Follow the problem first. The architectural names and tools will make more sense once their purpose is clear.

---

<a id="slide-2"></a>
## 2. Meet the team and the question it needs to answer

Imagine a travel company called **Waypoint**. Its booking application records reservations, its payment system records charges and refunds, and its operations feed records flight outcomes. Customer support has its own records of passengers asking for help.

A manager asks: **“Which routes are regularly disrupted, and how much do those disruptions cost us in refunds?”** Answering this requires more than downloading a file. The team must connect a booking to a payment and to the right flight, decide what counts as a disruption, and make sure everybody uses the same definition.

Along the way, we will separate four decisions that are often mixed together: where data is stored, what computes the answer, how business records are modeled, and who is responsible for them. A change in one does not automatically require changing all the others.

First, though, the team tries the most obvious approach: asking the existing applications for the report.

**The main idea:** An architecture begins with a consumer question and the data needed to answer it, before any particular storage product is chosen.

---

<a id="slide-3"></a>
## 3. Why querying the applications directly became awkward

The booking application is built to handle actions such as creating a reservation or updating a passenger. The manager’s report is a different kind of workload: it scans many past records, joins several systems and groups the results by route and month.

Running that work against live applications can compete with customer activity. Even when the queries are fast enough, the systems may disagree about identifiers and meanings. A booking can be created in one month, paid in another and refunded later. Simply joining records does not decide which month should receive the cost.

Now imagine two analysts producing two reasonable reports from different extracts. One counts cancelled bookings; the other counts cancelled flights. Their totals disagree because their populations and definitions differ. Faster hardware would leave that disagreement intact.

Waypoint needs a place where reporting rules are resolved deliberately, and where analytical work can run without repeatedly rebuilding those rules inside each application query.

**The main idea:** The first problem is dependable, integrated reporting—not merely a shortage of storage.

*Sources:* [Devlin & Murphy: original warehouse architecture (1988)](https://www.9sight.com/1988/02/art-ibmsj-ebis/)

---

<a id="slide-4"></a>
## 4. Decide what the reporting data means

Before building the reporting system, the team agrees what each row represents. A flight-outcome table will contain **one scheduled flight leg per row**. A payment table will contain one payment event per row. This is the **grain** of each table, and it matters because one flight can have many passenger bookings and many refund events.

The team then aligns keys, dates and business rules. For example, it defines how a refund links back to a booking and flight, and whether costs are reported by payment date or flight date. It checks that the integrated data reconciles with the original systems.

These decisions create an analytical representation of the business. A **data model** describes that representation; an **engine** executes queries against it. The model could eventually move to another engine while keeping the same business meaning.

With these rules in place, the team can publish a shared reporting dataset. That is the role the warehouse will play.

**The main idea:** Choose row meaning and business rules before choosing how to store or execute the report.

*Sources:* [Devlin & Murphy: original warehouse architecture (1988)](https://www.9sight.com/1988/02/art-ibmsj-ebis/)

---

<a id="slide-5"></a>
## 5. The warehouse gives reporting a dependable home

A **data warehouse** brings data from operational sources into an analytical system where it can be integrated, retained and queried for reporting. Waypoint now loads its source data into this system and publishes tables that already contain the agreed identifiers and reporting rules.

The applications continue serving customers. The warehouse serves questions about the business. Analysts can use the same prepared flight and refund data instead of making independent extracts and reinterpreting every source from scratch.

1. **Applications** — Record bookings, payments and flight events.
2. **Integration** — Align records and apply the agreed rules.
3. **Warehouse** — Retain shared analytical tables and reporting history.
4. **Reports** — Answer the manager’s route and refund question.

This explains why the warehouse was useful long before today’s cloud services. The durable idea is a trusted analytical representation of the business. The next question is how teams implemented it.

**The main idea:** The warehouse separates analytical reporting from operational activity and gives consumers a shared set of prepared data.

*Sources:* [Devlin & Murphy: original warehouse architecture (1988)](https://www.9sight.com/1988/02/art-ibmsj-ebis/)

---

<a id="slide-6"></a>
## 6. How a traditional warehouse pipeline did the work

In a traditional deployment, an integration job might extract bookings and payments overnight, clean and reconcile them, and load reporting tables. This is a typical **ETL** flow: extract, transform, then load the target. Waypoint could build those preparation jobs in **SSIS**.

The prepared records then go into a warehouse database such as **Teradata**. A **BI** (business intelligence) tool turns query results into reports, charts and dashboards. The pipeline has three distinct responsibilities: preparing records, executing analytical queries, and presenting useful answers.

For Waypoint, this can work very well: the morning report is understandable and consistent. But the platform also has an operating model. Somebody provisions capacity, maintains load jobs, tunes queries and reviews new datasets before they enter the reporting system.

That last step becomes more significant when the company starts collecting data that does not fit its existing reports.

### New in this section

**SSIS · ETL / integration**

SQL Server Integration Services is Microsoft’s tool for building data-movement and transformation jobs. [Documentation](https://learn.microsoft.com/en-us/sql/integration-services/sql-server-integration-services)

**Teradata · Analytical database**

A database platform used for data warehousing: it stores analytical tables and executes queries over them. [Documentation](https://www.teradata.com/platform)

**The main idea:** ETL tools prepared the data, the warehouse database stored and queried it, and BI tools presented it. Those responsibilities still exist in newer stacks.

*Sources:* [Devlin & Murphy: original warehouse architecture (1988)](https://www.9sight.com/1988/02/art-ibmsj-ebis/) · [Snowflake: SIGMOD 2016 paper (public CMU-hosted copy)](https://www.cs.cmu.edu/~15721-f24/papers/Snowflake.pdf) · [Microsoft: SQL Server Integration Services](https://learn.microsoft.com/en-us/sql/integration-services/sql-server-integration-services) · [Teradata: analytical database platform](https://www.teradata.com/platform)

---

<a id="slide-7"></a>
## 7. The business starts asking questions the model never anticipated

Waypoint’s website now records searches, clicks and browsing events. A product analyst wants to study searches that never became bookings. A data scientist wants detailed sequences of events. Neither question can be answered from the warehouse’s existing booking totals alone.

The team has two new pressures. First, there is much more detail to retain and process. Second, people want to inspect unfamiliar fields before anybody knows the final reporting model. Requiring every event to pass through a fully designed warehouse integration can make this exploratory work slow to start.

In many older deployments, adding storage and processing capacity also meant expanding a relatively fixed installation. That could make retaining a large, uncertain-value dataset hard to justify. These were practical constraints of deployments, not permanent limits of the warehouse idea.

The team starts looking for a way to retain detailed data and process it more flexibly. Distributed file storage and processing offered one route.

**The main idea:** Growing detail and unfamiliar workloads created pressure for flexible retention and processing alongside trusted reports.

*Sources:* [James Dixon: the data lake motivation (2010)](https://jamesdixon.wordpress.com/2010/10/14/pentaho-hadoop-and-data-lakes/) · [Snowflake: SIGMOD 2016 paper (public CMU-hosted copy)](https://www.cs.cmu.edu/~15721-f24/papers/Snowflake.pdf)

---

<a id="slide-8"></a>
## 8. Hadoop made a large collection of files usable across machines

One historical response was **Hadoop**. Instead of relying on a single large machine for all the work, a cluster could distribute storage and processing across several machines. That made a large collection of detailed files practical for new kinds of analysis.

The components divide the work: **HDFS** keeps the files, **MapReduce** processes distributed input, and **Hive** lets analysts approach it through SQL tables. **Hive Metastore** keeps the table definitions that connect those queries to the files. Storage, computation and metadata cooperate, rather than one component doing everything.

Waypoint could now retain a large event history and process it without first squeezing every field into its existing reporting model. But someone still had to operate the cluster, organize files, maintain metadata and handle failures. Distributing the work moved some limits and introduced new responsibilities.

This ability to keep detailed files for different uses helped support the approach we call a data lake.

### New in this section

**Hadoop · Distributed ecosystem**

A family of open-source software for storing and processing data across a cluster of machines. [Documentation](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)

**HDFS · Distributed storage**

The Hadoop Distributed File System spreads large files across machines. It stores data; a processing engine does the computation. [Documentation](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)

**MapReduce · Batch processing**

A distributed computation model: process pieces of input, regroup related records, then combine their results. [Documentation](https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/)

**Hive · SQL warehousing**

Adds SQL-oriented warehousing over distributed data, making stored files accessible through table definitions and queries. [Documentation](https://hive.apache.org/docs/latest/introduction-to-apache-hive/)

**Hive Metastore · Table metadata**

Hive’s metadata service records schemas, locations and partitions. Other engines can reuse it without running queries through Hive. [Documentation](https://hive.apache.org/docs/latest/introduction-to-apache-hive/)

**The main idea:** HDFS stores files, processing frameworks compute results, and Hive adds SQL-oriented access and metadata. Hadoop is the ecosystem around these roles.

*Sources:* [Apache Hadoop: HDFS architecture](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html) · [Dean & Ghemawat: MapReduce (2004)](https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/) · [Apache Hive: SQL warehousing and metadata](https://hive.apache.org/docs/latest/introduction-to-apache-hive/)

---

<a id="slide-9"></a>
## 9. The lake preserves data before every future use is known

A **data lake** retains data in a flexible storage layer so several kinds of processing can use it. Waypoint can keep source event files, later derive analytical tables from them, and revisit the original detail when a new question appears.

This changes when some decisions are made. A consumer may interpret a field when reading a file rather than requiring that field to be integrated into a reporting model first. That is the idea behind **schema on read**. There is still structure: the consumer must decide how to interpret timestamps, nested fields, missing values and identifiers.

For example, an analyst can inspect a newly added search-filter field without waiting for the warehouse model to expose it. Once the field becomes part of a published metric, its interpretation needs a stable, tested definition.

Keeping the detail creates flexibility. It also creates a new burden: the files must remain understandable and usable as the collection grows.

**The main idea:** A lake postpones some modeling choices while preserving source detail. It does not remove the need to interpret and govern that detail.

*Sources:* [James Dixon: the data lake motivation (2010)](https://jamesdixon.wordpress.com/2010/10/14/pentaho-hadoop-and-data-lakes/)

---

<a id="slide-10"></a>
## 10. Keeping the data and answering quickly were different problems

The distinction appeared in real systems. In its 2009 Hive account, Facebook described rapid data growth and daily processing that could take longer than a day. Hadoop and Hive helped address that scale and throughput problem. Facebook’s later account of **Presto** described a need for more interactive SQL analysis.

Back at Waypoint, the same distinction is useful. A nightly job that cleans the entire event history and an analyst exploring a question during a meeting have different needs. Both may use the same stored data, while benefiting from different execution approaches.

For Waypoint’s nightly transformations, **Spark** offers a processing engine, and **PySpark** lets the team describe that work in **Python**. For interactive exploration, Presto offers a query path over supported connected sources. The choice can follow the job: preparing a history and asking an ad hoc question need not use the same execution approach.

The important connection is that storage and execution are separable choices. Next, cloud object storage changes how that storage can be operated.

### New in this section

**Spark · Processing engine**

Distributes analytical transformations across machines, with SQL and tabular programming interfaces. It is not the filesystem. [Documentation](https://spark.apache.org/docs/latest/)

**PySpark · Python API**

Spark’s interface for Python. Your Python code describes work that the Spark engine executes. [Documentation](https://spark.apache.org/docs/latest/)

**Python · Programming language**

A general-purpose language used here to express processing and pipeline logic. A library or engine provides the actual data capabilities. [Documentation](https://docs.python.org/3/tutorial/)

**Presto · SQL query engine**

Runs distributed SQL across supported connected sources, with an emphasis on interactive analytics. It queries data rather than storing the files. [Documentation](https://engineering.fb.com/2013/11/06/core-infra/presto-interacting-with-petabytes-of-data-at-facebook/)

**The main idea:** Retaining a large history, transforming it efficiently and answering interactive queries are related requirements with different bottlenecks.

*Sources:* [Facebook: Hive at petabyte scale (2009)](https://engineering.fb.com/2009/06/10/web/hive-a-petabyte-scale-data-warehouse-using-hadoop/) · [Facebook: why Presto was built (2013)](https://engineering.fb.com/2013/11/06/core-infra/presto-interacting-with-petabytes-of-data-at-facebook/) · [Apache Spark: processing APIs and execution](https://spark.apache.org/docs/latest/) · [Apache Hive: SQL warehousing and metadata](https://hive.apache.org/docs/latest/introduction-to-apache-hive/) · [Trino: engines, catalogs and connectors](https://trino.io/docs/current/overview/concepts.html) · [Python: language tutorial](https://docs.python.org/3/tutorial/)

---

<a id="slide-11"></a>
## 11. Object storage lets the files outlive the compute machines

Operating a distributed storage cluster was substantial work. Cloud object services changed that boundary: a provider operates storage, and a team retains named objects such as source files in it. **Amazon S3**, launched in 2006, is one such service; Azure and Google Cloud also provide object storage for analytics.

Waypoint could encode an analytical dataset as **Parquet** and keep those files in S3. Parquet determines how values are arranged inside each file; S3 provides a place to retain it. Choosing a file representation and choosing a storage service are separate decisions.

Imagine Waypoint retaining its event files in object storage. A processing job starts, reads the files, produces a result and stops. A separate query engine can later read supported representations of the same data. The team does not have to keep that particular processing machine alive just to preserve its inputs.

This is an important form of **storage/compute separation**: stored data and execution capacity can have different lifecycles. It can make it easier to choose capacity for each workload. Scans, data movement, retained copies and idle services still contribute to cost.

Cloud storage therefore changes an infrastructure responsibility. It leaves the team with decisions about schemas, models and table behavior—which other cloud services approach differently.

### New in this section

**Amazon S3 · Object storage**

Amazon Simple Storage Service retains named objects, such as source files, independently of your compute machines. It launched in 2006. [Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)

**Parquet · Columnar file format**

Stores typed values by column, helping analytical readers read selected columns and skip some irrelevant data. It does not manage table transactions. [Documentation](https://parquet.apache.org/docs/overview/)

**The main idea:** Storage can persist independently while different compute jobs come and go. That flexibility still needs deliberate data and cost management.

*Sources:* [Amazon: S3 launch (2006)](https://press.aboutamazon.com/2006/3/amazon-web-services-launches) · [AWS: how S3 object storage works](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) · [Apache Parquet: columnar file format](https://parquet.apache.org/docs/overview/)

---

<a id="slide-12"></a>
## 12. Warehouses also changed when they moved to the cloud

It would be misleading to tell this story as though every warehouse stood still while lakes improved. Cloud warehouse services addressed provisioning, workload isolation and operating effort while keeping the goal of dependable analytical SQL.

For example, with **Snowflake**, Waypoint can allocate execution capacity to reporting and to another workload independently while they access shared stored data. That changes how the team provisions and isolates work without giving up its analytical warehouse.

**BigQuery**, with roots in Google’s **Dremel** query work, and **Amazon Redshift** provide other managed analytics routes. These examples show that the warehouse idea also evolved. Each service’s deployment and capacity choices still need evaluation against the actual workload.

Waypoint therefore has more than one reasonable route. It might modernize its reporting warehouse, use a governed lake for workloads that benefit from open files, or combine them. The answer depends on its consumers, supported operations and available operating capacity.

To understand these options, it helps to separate a processing choice—where transformation happens—from the broader architecture.

### New in this section

**Snowflake · Managed analytics**

A cloud analytical platform separating stored data from virtual-warehouse compute. A virtual warehouse is execution capacity. [Documentation](https://docs.snowflake.com/en/user-guide/intro-key-concepts)

**BigQuery · Managed analytics**

Google’s managed analytical service for SQL queries over large datasets. Its roots include Dremel’s interactive-query work. [Documentation](https://docs.cloud.google.com/bigquery/docs/introduction)

**Dremel · Query-system foundation**

Google’s distributed system for interactive analysis of columnar, nested data, described in its 2010 research paper. [Documentation](https://research.google/pubs/dremel-interactive-analysis-of-web-scale-datasets-2/)

**Amazon Redshift · Managed warehouse**

Amazon Redshift is AWS’s managed SQL data warehouse service. Deployment and capacity options still need workload-specific evaluation. [Documentation](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html)

**The main idea:** Cloud warehouses and cloud lakes evolved alongside one another. A warehouse can address new requirements without being replaced by a lake.

*Sources:* [Snowflake: storage, compute and cloud services architecture](https://docs.snowflake.com/en/user-guide/intro-key-concepts) · [Snowflake: SIGMOD 2016 paper (public CMU-hosted copy)](https://www.cs.cmu.edu/~15721-f24/papers/Snowflake.pdf) · [Google: Dremel (2010 paper)](https://research.google/pubs/dremel-interactive-analysis-of-web-scale-datasets-2/) · [Google Cloud: BigQuery overview](https://docs.cloud.google.com/bigquery/docs/introduction) · [AWS: Amazon Redshift overview](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html)

---

<a id="slide-13"></a>
## 13. ETL and ELT describe where a transformation takes place

Earlier, Waypoint transformed operational data before loading its reporting target: ETL. With capable analytical execution available in the target, another option is to load source-like records first and transform them there. That ordering is **ELT**: extract, load, transform.

For example, the team could load booking records into a raw database schema, then use **dbt** to build and test SQL models for clean bookings and refund summaries. The target engine executes those models; transformation logic and database execution remain distinct responsibilities.

A single pipeline can still have several boundaries. A downloader may validate a **CSV** before writing typed Parquet. A later SQL model may apply business rules after loading that representation. Calling the entire system ETL or ELT leaves out those details.

Similarly, schema on write and schema on read describe when a representation is interpreted or constrained. Both can appear in the same system. We can now use these distinctions to understand a common design: a lake feeding a warehouse.

### New in this section

**dbt · Transformation framework**

Defines, builds, tests and documents analytical models. The target engine executes the SQL; dbt is not the database storing the records. [Documentation](https://docs.getdbt.com/docs/introduction)

**CSV · Delimited text format**

Represents records as text fields separated by delimiters. Parsing, types and validation need explicit rules. [Documentation](https://www.rfc-editor.org/rfc/rfc4180)

**The main idea:** Draw where source data is loaded, validated and transformed. ETL and ELT describe that ordering, rather than deciding the entire storage architecture.

*Sources:* [dbt: analytical modeling and execution roles](https://docs.getdbt.com/docs/introduction) · [RFC 4180: CSV representation](https://www.rfc-editor.org/rfc/rfc4180)

---

<a id="slide-14"></a>
## 14. A lake and a warehouse often worked together

Waypoint keeps detailed event and source files in its lake, but its finance and operations reports still use prepared warehouse tables. A pipeline reads selected lake data, cleans it and loads the reporting representation. Each side serves a useful purpose.

1. **Retained sources** — Keep detail and evidence for replay.
2. **Preparation** — Select versions, validate records and apply rules.
3. **Warehouse marts** — Publish the agreed analytical representation.
4. **Consumers** — Use reports with stable definitions.

The extra representation also has consequences. A correction can be present in the lake before it reaches the warehouse. Two consumers may query different versions. The team must monitor the copy, define its freshness and reconcile the results.

That hybrid can remain a good choice. But it also raises an attractive question: could the lake itself offer more dependable table behavior for consumers that already work there? First, we need to see what an ordinary folder is missing.

**The main idea:** Using both can be sensible. The cost is another publication boundary whose versions, permissions and results must be kept in agreement.

*Sources:* [CIDR: Lakehouse architecture paper (2021)](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf)

---

<a id="slide-15"></a>
## 15. A correction exposes what a folder cannot decide

Waypoint receives a January flight file and retains it as source evidence. Later, the source republishes January with one corrected record. The team keeps both files so it can investigate what changed. Keeping them both is sensible; treating them both as current input is a different decision.

```text
raw/2025-01-v1.csv    # original January: 3 records
raw/2025-01-v2.csv    # replacement January: 3 records
raw/2025-02-v1.csv    # February: 2 records
```

A query that reads every file finds eight rows. The intended current dataset contains five flight identities. The query can execute successfully and still answer the wrong question, because the folder does not tell it which January version is current. Converting every file to Parquet would preserve that ambiguity.

A real changing table needs an agreed state: which data belongs to the version readers should see? It also needs rules for publishing a new state when writers fail or overlap. That is where table-management mechanisms become useful.

**The main idea:** File encoding and current-table membership solve different problems. Readers need explicit rules for selecting a consistent state.

*Sources:* [VLDB: Delta Lake paper (2020)](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf) · [Apache Iceberg: concurrent commits and reliability](https://iceberg.apache.org/docs/latest/reliability/)

---

<a id="slide-16"></a>
## 16. The lakehouse brings reliable table behavior to lake data

Instead of asking each reader to discover the right files independently, a table-management layer records which data belongs to a table version. A writer prepares a change, then **commits** it: it publishes a new agreed state through the supported protocol. A reader resolves a **snapshot**, a particular state of the table.

For Waypoint’s correction, that means readers can use the previous complete table state while the replacement is being prepared, then use the new state after it is published. The precise behavior depends on the table format, catalog and execution engine, but the responsibility is now explicit.

A **lakehouse** combines lake-style storage with reliable table management and useful analytical execution. Its database-like guarantees often include ACID transactions: atomic changes, consistency with declared rules, isolation between concurrent work and durability of committed state. The scope of those guarantees must be checked.

The influential 2021 lakehouse paper argued for this direction. The practical question for our team is which components provide the table, metadata and query behavior it needs.

**The main idea:** The lakehouse adds coordinated table state and execution around stored data. The next step is to identify which component does each job.

*Sources:* [CIDR: Lakehouse architecture paper (2021)](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf) · [VLDB: Delta Lake paper (2020)](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf) · [Delta Lake: concurrency control](https://docs.delta.io/concurrency-control/) · [Apache Iceberg: concurrent commits and reliability](https://iceberg.apache.org/docs/latest/reliability/)

---

<a id="slide-17"></a>
## 17. Walk through one query, from a table name to stored values

An analyst submits a query for `analytics.flight_legs`. The query engine needs to find that table. A supported **catalog** provides the relevant metadata or a route to it, including the location of the table’s current metadata.

The **table format** defines how that metadata describes table state: for example, which files belong to a snapshot and how changes are represented. The engine uses compatible readers to interpret that state. It then reads the required values from **data files**, commonly Parquet, held in a storage system such as object storage.

For example, an **Apache Iceberg** table can be queried by **Trino** through a compatible connector and catalog. Iceberg describes the changing table state; Trino executes the query. Being able to read Parquet alone would not establish that the engine understands the table’s snapshots, deletes and publication rules.

> **A concrete path:** An appropriately configured Trino Iceberg connector can resolve an Iceberg table through a supported catalog and query its Parquet data in object storage. Compatibility includes metadata, permissions and supported table features—not just readable files.

With these roles separated, the three common open table projects become easier to compare.

### New in this section

**Apache Iceberg · Open table format**

Apache Iceberg uses metadata and snapshots to describe changing analytical tables. Stable field identities support schema evolution; partition layouts can evolve too. [Documentation](https://iceberg.apache.org/docs/latest/evolution/)

**Trino · SQL query engine**

Queries supported sources through connectors. Formerly PrestoSQL; Trino and PrestoDB are now distinct projects with shared ancestry. [Documentation](https://trino.io/blog/2020/12/27/announcing-trino.html)

**The main idea:** To explain a lakehouse, trace a real query through its engine, catalog, table metadata, file format and storage.

*Sources:* [Trino: Iceberg connector and catalog requirements](https://trino.io/docs/current/connector/iceberg.html) · [Trino: engines, catalogs and connectors](https://trino.io/docs/current/overview/concepts.html) · [Apache Iceberg: schema and partition evolution](https://iceberg.apache.org/docs/latest/evolution/) · [Trino founders: the PrestoSQL rename](https://trino.io/blog/2020/12/27/announcing-trino.html)

---

<a id="slide-18"></a>
## 18. Delta, Iceberg and Hudi address overlapping table problems

All three projects help make changing lake data more dependable. Their starting pressures and design emphases differ, so a team should investigate the operations and consumers it actually needs rather than choose by a single feature slogan.

With **Delta Lake**, a compatible reader uses the transaction log to identify the table state instead of treating every Parquet file as current. Waypoint’s corrected January can therefore become a deliberate table change, rather than one more file that every consumer must interpret independently.

With **Apache Iceberg**, stable field identities help supported schema changes preserve which field a column represents, while partition layouts can evolve. Catalog commits and reader/writer feature support matter when several engines share the table.

With **Apache Hudi**, record keys, updates and incremental processing are central to the ingestion story. Uber’s original account describes the need to update its Hadoop data platform efficiently as source records changed. That is a useful motivation to compare with Waypoint’s corrected source months.

For Waypoint, a meaningful evaluation would replay a correction, delete a record, change a schema and interrupt a write. Those experiments expose an important distinction about storage guarantees.

### New in this section

**Delta Lake · Open table format**

Coordinates changes to Parquet-backed tables through a transaction log. Compatible readers use that log to resolve the table state. [Documentation](https://docs.delta.io/concurrency-control/)

**Apache Hudi · Table format + ingestion**

Apache Hudi combines table management with ingestion and maintenance capabilities, emphasizing record updates and incremental processing. [Documentation](https://hudi.apache.org/docs/overview/)

**The main idea:** Compare the behavior of a complete supported setup. The projects overlap, and their useful differences appear in real read, write and maintenance operations.

*Sources:* [Delta Lake: concurrency control](https://docs.delta.io/concurrency-control/) · [Apache Iceberg: schema and partition evolution](https://iceberg.apache.org/docs/latest/evolution/) · [Uber: the ingestion problem behind Hudi (2017)](https://www.uber.com/ch/en/blog/hoodie/) · [Apache Hudi: table and incremental-processing capabilities](https://hudi.apache.org/docs/overview/)

---

<a id="slide-19"></a>
## 19. Reliable object reads do not publish a whole table change

Suppose a job intends to publish two data files. It writes the first successfully, then crashes before writing the second. The first object may be perfectly durable and immediately visible, while the intended dataset is still incomplete.

S3’s strong read-after-write and listing consistency, announced in 2020, addresses visibility of object operations. It does not turn a sequence of separate object writes into one atomic table update. **Object consistency and table transactions cover different boundaries.**

A supported table protocol coordinates publication of table metadata and handles conflicting changes according to its rules. Readers resolve the resulting state instead of assuming that whatever a folder listing reveals must be the complete dataset.

Waypoint should therefore ask what happens during failure and concurrent writes, not only whether it can read a file. It should also check whether a transaction covers one table or several: a table commit does not automatically update every report or external system at once.

**The main idea:** Ask what is published atomically, how readers find that state, and where the guarantee ends.

*Sources:* [AWS: S3 strong consistency announcement (2020)](https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/) · [Delta Lake: concurrency control](https://docs.delta.io/concurrency-control/) · [Apache Iceberg: concurrent commits and reliability](https://iceberg.apache.org/docs/latest/reliability/)

---

<a id="slide-20"></a>
## 20. Today, product labels tell only part of the architecture

These mechanisms have spread across product boundaries. A service described as a warehouse may offer open lake tables, while a lakehouse platform may offer a managed SQL experience familiar to warehouse users. The historical categories explain motivations better than they predict every current feature.

For example, Snowflake supports Iceberg table options, and BigQuery offers managed Iceberg tables in **Google Cloud Storage**. **Microsoft Fabric** brings a Delta-based lakehouse into a wider analytics suite. **Databricks** combines lakehouse processing with SQL and governance experiences. Similar consumer needs can now be approached from several product families.

This does not make every path interchangeable. Waypoint still needs to identify who manages the table, which catalog is used, which operations each engine supports, and where authorization is enforced. These details are specific to the selected service, feature version and configuration.

Once the team can trace the actual read and write paths, another issue becomes visible: how should it control access and responsibility across them?

### New in this section

**Google Cloud Storage · Object storage**

Google’s service for retaining named objects such as analytical data files. It supplies storage; table management and query execution are separate roles. [Documentation](https://docs.cloud.google.com/bigquery/docs/biglake-iceberg-tables-in-bigquery)

**Microsoft Fabric · Analytics platform**

A software-as-a-service suite combining data engineering, warehousing, real-time analytics and BI. Its lakehouse uses Delta as the default table format. [Documentation](https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview)

**Databricks · Data and AI platform**

Integrates processing, SQL and governance experiences around lakehouse data, rather than providing only a file or table format. [Documentation](https://docs.databricks.com/aws/en/introduction/)

**The main idea:** Use current product documentation to trace the concrete access path. A warehouse or lakehouse brand name alone cannot answer the implementation questions.

*Sources:* [Snowflake: Iceberg tables](https://docs.snowflake.com/en/user-guide/tables-iceberg) · [BigQuery: managed Iceberg tables](https://docs.cloud.google.com/bigquery/docs/biglake-iceberg-tables-in-bigquery) · [Microsoft Fabric: lakehouse and Delta tables](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables) · [Databricks: platform overview](https://docs.databricks.com/aws/en/introduction/) · [Microsoft Fabric: integrated analytics platform](https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview)

---

<a id="slide-21"></a>
## 21. A shared table still needs controlled access and an owner

Several teams can now work with Waypoint’s data, sometimes through different engines. That is useful, but it means a permission on one SQL endpoint may not cover every possible access path. A user denied a sensitive column in a query tool might still have credentials that allow reading the underlying storage.

The team needs to understand and enforce the supported paths deliberately. A catalog can help discover and govern assets, but the exact enforcement depends on the platform, engine and storage setup. Access control has to be checked where data can actually be reached.

The data also needs an operating owner. When a source stops arriving, who investigates? When a schema changes, who tells consumers? When old snapshots are removed, can a published result still be reproduced? **Governance** includes these responsibilities alongside security and policy.

As Waypoint makes those expectations explicit, it also needs a clearer way to distinguish raw evidence from data that is ready for consumers. That leads to a layering pattern often discussed with lakehouses.

**The main idea:** Shared storage and supported queries are useful foundations; dependable access also needs enforced permissions, lifecycle policies and accountable owners.

*Sources:* [Trino: Iceberg connector and catalog requirements](https://trino.io/docs/current/connector/iceberg.html) · [AWS: concrete services for a data mesh](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-data-mesh/aws-offerings-data-mesh.html)

---

<a id="slide-22"></a>
## 22. Medallion names the steps from source evidence to useful answers

Waypoint has several representations of a flight record. The original source file is evidence of what arrived. A typed, de-duplicated flight-leg table is a validated analytical input. A route-level reliability model is prepared for a particular consumer question. These representations have different purposes and quality expectations.

The **medallion** pattern gives that progression familiar names: **bronze** for raw/source-oriented data, **silver** for validated and standardized data, and **gold** for consumer-ready data. A corrected record can pass through validation before it changes a published metric.

1. **Bronze** — Preserve the source version and how it arrived.
2. **Silver** — Produce valid flight legs with defined types and keys.
3. **Gold** — Publish route metrics with explicit populations and rules.

These are logical responsibilities. A warehouse can have a similar progression through staging, intermediate models and marts. The names do not require exactly three physical copies, and they do not implement quality or ACID behavior by themselves. Having organized the stages, the team must also decide when each stage runs.

**The main idea:** Medallion describes progressive preparation and quality. The code, checks and transaction mechanisms must make that progression real.

*Sources:* [Databricks: medallion as a logical design pattern](https://docs.databricks.com/aws/en/lakehouse/medallion)

---

<a id="slide-23"></a>
## 23. Streaming changes when work happens, rather than replacing the storage story

An overnight file gives Waypoint a bounded piece of input to process: a **batch**. Website events arrive continuously, so a consumer may need **streaming** processing that maintains results as new events arrive. Some streaming systems execute that work in small increments called micro-batches.

Continuous input introduces questions that a simple file run can avoid. An event may arrive late or be replayed after failure. A system might retain events in **Kafka**, then compute results with **Flink** or **Spark Structured Streaming**. Keeping replayable events and maintaining a result are separate jobs, so the design must account for both.

Historical architecture discussions proposed different ways to combine fresh and historical results. **Lambda** uses batch and speed paths that meet in serving, at the cost of keeping their results and logic consistent. A **Kappa-style** approach uses a replayable event log and one stream-processing path, making replay capacity and retained history important.

Either processing approach can feed a warehouse or lakehouse. Choose timing from the source and consumer need. **BTS**, the US Bureau of Transportation Statistics, publishes the monthly flight records used in your project. Those publications remain a batch source; continuously running a processor would not turn them into live flight events.

### New in this section

**Kafka · Event log**

A distributed log that retains streams of events for consumers to read and replay. Retention is distinct from computing a result. [Documentation](https://kafka.apache.org/intro/)

**Flink · Stream processing**

An engine for stateful computations over arriving data, including the handling of event time and processing state. [Documentation](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/)

**Spark Structured Streaming · Streaming API**

Spark’s interface for incremental streaming computations, often executed as micro-batches. Spark supplies the processing engine. [Documentation](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html)

**The main idea:** Storage architecture and processing cadence answer different questions. Freshness starts with what the source can actually publish.

*Sources:* [Apache Beam: bounded and unbounded data](https://beam.apache.org/documentation/basics/) · [Jay Kreps: questioning Lambda architecture (2014)](https://www.oreilly.com/radar/questioning-the-lambda-architecture/) · [BTS: flight source fields and monthly files](https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ) · [Apache Kafka: event retention and consumers](https://kafka.apache.org/intro/) · [Apache Flink: stateful processing](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/) · [Spark: Structured Streaming](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html)

---

<a id="slide-24"></a>
## 24. Eventually, the slow part may be the central team

Waypoint’s platform is now technically capable, but requests still wait in one central queue. Finance wants a new refund definition, operations changes a flight-status field, and customer support wants an explanation for a broken report. The central team must understand each domain before it can deliver the change.

Adding compute capacity does little for this bottleneck. The constraint is responsibility and domain knowledge. The people closest to a source understand why its records change, while the central team is expected to translate and support everybody’s meaning.

**Data mesh** proposes a different operating model: domain teams own and publish supported data products, using a shared self-serve platform and common governance. The intention is to distribute meaningful responsibility without making every team rebuild infrastructure.

This is a separate kind of evolution from moving between storage systems. The products can live in a warehouse, lake or lakehouse. To see what changes in practice, consider the four principles behind the approach.

**The main idea:** Data mesh addresses the ownership and delivery problem that appears when one team becomes the default interpreter and maintainer of everybody’s data.

*Sources:* [Zhamak Dehghani: monolith to data mesh (2019)](https://martinfowler.com/articles/data-monolith-to-mesh.html)

---

<a id="slide-25"></a>
## 25. Four principles, explained through the team

**Domain-oriented ownership** means the flight-operations team is responsible for the flight-outcome product: its meaning, changes and incident response. Assigning an owner is useful only if that team has the skills, time and authority to support the responsibility.

**Data as a product** means consumers receive something they can actually use: an interface with documented meaning, quality and service expectations. The team treats consumer breakage as a product problem, rather than saying that the source file technically arrived.

**A self-serve platform** gives teams supported ways to provision, test, secure and publish their products. It keeps decentralized ownership from becoming duplicated infrastructure work. The platform team still has a substantial job, but it no longer has to implement every domain’s business logic.

**Federated computational governance** means domains participate in shared rules and suitable controls enforce them automatically. For example, teams can agree on identity, access and publication rules while retaining responsibility for their own business definitions.

Together, the principles describe an operating model. Simply renaming schemas after departments would leave the old bottleneck in place if the same central team still does all the work.

**The main idea:** Mesh connects accountable domain ownership with product practices, shared platform capabilities and enforceable common rules.

*Sources:* [Zhamak Dehghani: four data mesh principles (2020)](https://martinfowler.com/articles/data-mesh-principles.html)

---

<a id="slide-26"></a>
## 26. A data product is a promise a consumer can rely on

The flight-operations team publishes `flight_outcomes`. A consumer should be able to find it, obtain appropriate access, understand what one row represents and know when to expect a corrected source month. The following **YAML** sketch makes some expectations explicit; the sketch does not enforce them by itself.

```yaml
product: flight_outcomes
owner: flight_operations_data
grain: one scheduled flight leg
source: published BTS monthly files
quality: unique leg key; source-count reconciliation
freshness: agreed lag after source publication
change_policy: version breaking changes; notify consumers
```

A weather team could publish station observations under its own expectations. An analytics consumer could then join the products using a documented station and time rule. Clear interfaces make that collaboration possible without pretending the join will be correct automatically.

This remains a fictional multi-team example. In your personal project, the useful practice is to write clear ownership, meaning and change expectations. You do not need to invent several teams or buy a mesh platform to learn that habit.

### New in this section

**YAML · Configuration format**

Human-readable structured text often used for configuration. Writing a contract in YAML documents expectations; it does not enforce them. [Documentation](https://yaml.org/spec/1.2.2/)

**The main idea:** A product turns “there is a table” into an explicit, supported relationship between its producer and consumers.

*Sources:* [AWS: concrete services for a data mesh](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-data-mesh/aws-offerings-data-mesh.html) · [YAML: language specification](https://yaml.org/spec/1.2.2/)

---

<a id="slide-27"></a>
## 27. Now the overlapping architecture words have a place

We can now return to the labels without treating them as a list of competing upgrades. **Warehouse, lake and lakehouse** describe storage, management and consumption arrangements. **Data mesh** changes how teams own and publish products. **Medallion** describes how representations become more prepared for use.

A company can therefore use domain-owned data products, a shared lakehouse platform and bronze/silver/gold layers at the same time. A domain may publish a star schema for BI, while another exposes a different model. Business modeling is another decision alongside storage and ownership.

You will also hear **data fabric**, a broad industry term for connecting data, metadata, integration and policy across a distributed estate. Its implementation varies by vendor and design. Ask which concrete discovery, integration or governance capabilities a proposal supplies. Microsoft Fabric is a particular product; the generic term does not refer only to it.

Finally, a **semantic layer** publishes business concepts and metrics to consumers, and **query federation** executes across connected systems. Those describe consumption and execution capabilities. Each term becomes easier to evaluate when you identify the responsibility it changes.

**The main idea:** Several patterns can coexist because they answer different questions about the same system.

*Sources:* [Zhamak Dehghani: four data mesh principles (2020)](https://martinfowler.com/articles/data-mesh-principles.html) · [IBM: data fabric terminology](https://www.ibm.com/think/topics/data-fabric) · [Databricks: medallion as a logical design pattern](https://docs.databricks.com/aws/en/lakehouse/medallion) · [Trino: engines, catalogs and connectors](https://trino.io/docs/current/overview/concepts.html)

---

<a id="slide-28"></a>
## 28. Choose tools after you can explain the work

If Waypoint wants to retrieve a monthly file, a Python script may be enough; **dlt** can help when ingestion needs normalization and load-state tracking. Propagating database inserts, updates and deletes is a different requirement: **CDC**, or change data capture. **Debezium** addresses that source-change problem, rather than the monthly-download problem.

For local queries and transformations, the team could start with **DuckDB**. If a workload needs distributed processing, it might evaluate Spark; if it needs SQL over supported connected sources, it might evaluate Trino. The choice follows the actual work and deployment needs.

dbt defines the analytical models that an engine builds. **Apache Airflow** can coordinate their execution with downloads, checks and other dependent jobs. It can trigger a dbt build or a Spark job without becoming their SQL engine. A BI tool or data app then exposes useful results to people.

For a design review, tell the story in that order: what arrives, where it is retained, how it becomes trusted data, and what a consumer receives. Introduce each tool at the point where it performs a needed job.

### New in this section

**dlt · Python ingestion library**

Loads data into supported destinations, with capabilities such as normalization and load-state tracking. [Documentation](https://dlthub.com/docs/intro)

**Debezium · Change data capture**

Connectors capture database inserts, updates and deletes as events so downstream systems can respond to source changes. [Documentation](https://debezium.io/documentation/reference/stable/architecture.html)

**DuckDB · Embedded SQL database**

Runs analytical SQL inside an application without a separate database server. It can query files and store transactional tables locally. [Documentation](https://duckdb.org/docs/current/clients/python/dbapi)

**Apache Airflow · Workflow orchestration**

Apache Airflow coordinates tasks, dependencies, schedules and retries. It can trigger dbt builds or Spark jobs without becoming their execution engine. [Documentation](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html)

**The main idea:** A tool is easier to understand when it appears as the answer to a concrete job in the pipeline.

*Sources:* [dbt: analytical modeling and execution roles](https://docs.getdbt.com/docs/introduction) · [dlt: Python ingestion library](https://dlthub.com/docs/intro) · [Debezium: database change capture](https://debezium.io/documentation/reference/stable/architecture.html) · [DuckDB: Python DB API and transactions](https://duckdb.org/docs/current/clients/python/dbapi) · [Apache Airflow: workflow architecture](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html)

---

<a id="slide-29"></a>
## 29. The right starting point depends on the problem you have now

Return to Waypoint’s first question and imagine a small team with a few sources and a daily report. A local analytical database or managed warehouse, with retained source inputs and tested models, may solve the immediate problem with relatively little operating work. That is a complete architecture for the requirement.

If the company later retains many kinds of files and several processing workloads need them, a governed lake may become useful. If those consumers need to coordinate changing shared tables, lakehouse table management becomes worth evaluating. The evidence is the workload and failure behavior, rather than a universal row-count threshold.

Likewise, distributing ownership makes sense when real domain teams can support products and a shared platform can help them do so. A one-person project cannot remove its delivery bottleneck by declaring itself a mesh.

The practical habit is to start with a consumer requirement, choose a design you can operate, and name the condition that would make you revisit it. We can apply that habit directly to your portfolio.

**The main idea:** Choose a design you can explain and operate for the current requirement. Let a measurable new need justify the next boundary or tool.

---

<a id="slide-30"></a>
## 30. Your Flight Reliability v1 already has a coherent architecture

Your project asks one bounded question: **which airline and departure window has historically been most reliable for a selected route?** It uses January–March 2025 reporting-carrier records for flights between the six selected airports: SEA, SFO, LAX, DEN, ORD and JFK.

Python retrieves the monthly source files and records versions, checksums and retrieval information. Validated Parquet provides a typed analytical representation. DuckDB executes queries, and dbt builds and tests the flight models and route-level outputs. A public explorer lets someone use the result.

The metric definitions are part of that architecture. Cancellation rate uses the selected scheduled-leg population. The long-arrival-delay rate and p90 (90th-percentile) delay need their defined eligible-arrival population, excluding cancellations, diversions and missing arrival delay. The app should expose sample sizes and missing-data coverage so the result can be interpreted.

This release exercises ingestion, modeling, transformation, quality and serving without requiring every platform in the historical story. Retained files plus DuckDB form a useful local analytical pipeline; they do not by themselves provide a shared transactional lakehouse.

**The main idea:** The first release is strong when its question, source versions, transformations and published answer are understandable and reproducible.

*Sources:* [BTS: flight source fields and monthly files](https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ) · [dbt: analytical modeling and execution roles](https://docs.getdbt.com/docs/introduction)

---

<a id="slide-31"></a>
## 31. Extend the project when you can state the new need

Suppose the explorer can show that a route was disrupted, and you want to investigate whether weather was associated with the pattern. **NOAA**, the US National Oceanic and Atmospheric Administration, publishes weather observations that can support that investigation. The engineering work is then station selection, time alignment, unmatched coverage and a join that preserves flight grain. More sources alone do not create a better answer.

Suppose you want to practice larger source archives and corrected-month replay with shared table state. The planned Spark/Delta extension becomes a way to learn those capabilities. Compare its result with the existing model and measure its behavior, rather than claiming that a small local dataset requires distributed processing.

When repeated publications and historical backfills need coordination, Airflow supports workflow orchestration. **Astronomer Cosmos** can bring dbt’s model-level workflow into that orchestration. A later semantic interface can help several consumers use the same metrics. Each extension should preserve the established business meaning while proving one additional capability.

This gives your roadmap a clear progression: publish a dependable first answer, then add a specific requirement and demonstrate how the design handles it.

### New in this section

**Astronomer Cosmos · dbt–Airflow integration**

Astronomer Cosmos represents dbt workflows as Airflow tasks and dependencies, enabling model-level orchestration. [Documentation](https://astronomer.github.io/astronomer-cosmos/)

**The main idea:** Keep the business answer stable while each extension adds a testable capability, such as source alignment, table updates or recoverable scheduling.

*Sources:* [NOAA: hourly weather data and station metadata](https://www.ncei.noaa.gov/products/global-historical-climatology-network-hourly) · [Astronomer Cosmos: dbt workflows in Airflow](https://astronomer.github.io/astronomer-cosmos/)

---

<a id="slide-32"></a>
## 32. A migration should prove that the consumer still gets the right answer

Imagine moving one corrected source month from your DuckDB pipeline into the planned Delta pipeline. Begin by recording the exact source versions, selected population and metric definitions. Those are the comparison baseline; a migration becomes difficult to assess if the input and business rules change at the same time.

Build the new representation beside the old one. Compare individual flight keys and changed attributes, not only total row counts. Two outputs can contain the same number of rows and still disagree about which flight was cancelled. Reconcile aggregates and metric denominators as well.

Then test how the new route behaves when interrupted and rerun. Check which state readers see, how access is enforced, and whether retained history supports recovery. Measure the operating work and resources needed for the improvement you intended.

Once the consumer contract has been validated, move the consumer deliberately and keep a rollback path until the new route is dependable. The tiny lab makes one part of this reasoning visible before you add a distributed platform.

**The main idea:** A successful migration preserves meaning and improves a stated requirement, with evidence from normal execution, failure and replay.

---

<a id="slide-33"></a>
## 33. The lab makes the wrong population visible in eight rows

The lab uses five synthetic flight identities across two months. January has an original file and a corrected replacement; February has one file. All three files remain available as source evidence. No real BTS download or cloud service is needed.

Reading every file counts January twice. Choosing the current January version produces a different—and intended—population. This is why the same-looking metric can change before any complicated SQL or performance problem is involved.

| How input is selected | Rows / cancellations | Cancellation rate |
| --- | --- | --- |
| Read all retained files. | 8 rows, 2 cancellations | 25%: the population double-counts January. |
| Choose the current file for each month. | 5 rows, 1 cancellation | 20%: the intended current population. |
| Replay January into the transactional mart twice. | 5 rows, 1 cancellation | 20%: the repeated load preserves the intended result. |

The lab records its file selection in **JSON**. That document specifies which source file is current for each month. Typed Parquet and a local DuckDB transaction demonstrate the next boundaries. The JSON selection is a teaching aid, rather than a distributed Delta or Iceberg commit protocol.

### New in this section

**JSON · Structured text format**

Represents values using objects, arrays and primitive types. The lab uses it to record current-file selection, not to provide distributed table transactions. [Documentation](https://www.rfc-editor.org/rfc/rfc8259)

**The main idea:** A plausible percentage can be wrong because the input population is wrong. Select versions deliberately before interpreting a metric.

*Sources:* [RFC 8259: JSON representation](https://www.rfc-editor.org/rfc/rfc8259)

---

<a id="slide-34"></a>
## 34. Run it, then inspect the corrected record

[Open lab instructions and fixture downloads](lab/README.md) · [Download the Python script](lab/run_lab.py)

These commands use **uv** to run the script with DuckDB available. Run them from this deck’s folder after obtaining the lab files.

```bash
# From this deck’s folder; Python 3.11+ and uv
uv run --with "duckdb>=1.4,<2" python lab/run_lab.py

# Keep inspectable output in a new directory
uv run --with "duckdb>=1.4,<2" python lab/run_lab.py --output ./architecture-lab-output
```

Start by comparing F002 in the two January files. Then inspect the current-file selection and the typed silver Parquet. The final mart should contain five scheduled legs, one cancellation, four eligible arrivals and two arrivals delayed by at least 30 minutes. The p90 nonnegative arrival delay is 38.5 minutes.

The script replaces January twice and asserts that no additional effects appear on the second run. It also deliberately interrupts a transaction after a delete, then checks that rollback preserves the published mart. These are different proofs: safe repetition and atomic failure handling.

The assertions were executed with DuckDB 1.5.6. First-time dependency installation may need a network connection, but the lab itself makes no network requests. Default outputs are temporary; use the second command to retain them in a new directory.

### New in this section

**uv · Python environment tooling**

Manages Python environments and dependencies. The lab uses it to run a script with DuckDB available. [Documentation](https://docs.astral.sh/uv/)

**The main idea:** Inspect the source change, selection and transaction boundary. Those explain the result more clearly than the architecture label alone.

*Sources:* [DuckDB: Python DB API and transactions](https://duckdb.org/docs/current/clients/python/dbapi) · [Astral: Python environment management with uv](https://docs.astral.sh/uv/)

---

<a id="slide-35"></a>
## 35. Explain the story before listing the tools

Use a requirement, the mechanism it motivates and a consequence you would test. Try answering each question aloud before revealing the suggested reasoning.

### “Why would a team add a lake to its warehouse?”

Its existing reports may be dependable while new needs require retaining more detail or using different processing workloads. A lake can preserve that detail for later use. The team then takes on version selection, discoverability and governance. A cloud warehouse might also meet the need; compare the actual constraint.

### “What does a lakehouse add?”

It brings reliable table management and analytical execution to lake-style storage. Explain how a writer publishes a table state and how readers resolve it. Name the file, table, catalog and engine roles, then check update, failure and conflict behavior for that setup.

### “Does data mesh replace a lakehouse?”

Mesh changes who owns and supports data products and how a shared platform helps them publish consistently. Those products can use a lakehouse or a warehouse. Storage choices and ownership choices can therefore evolve independently.

### “The dashboard changed after migration. What do you investigate?”

Trace the result back through the metric definition, row grain, joins, date rules, input population and source versions. Reconcile changed keys and denominators. Only after establishing that the systems are answering the same question should you compare execution performance.

**The main idea:** A useful answer explains why the design fits the requirement and how you would know it works.

---

<a id="slide-36"></a>
## 36. Practise choosing a design from a concrete situation

For each case, draw the current data flow, name the actual difficulty and propose the smallest change that addresses it. Include an owner and a failure/replay check. The revealed reasoning is a starting point, not a single compulsory stack.

### Case A: five analysts need a daily sales report

A small analytical database or managed warehouse plus retained inputs may be enough. Clarify the report population and freshness expectation, build tested models, and make reruns safe. A lakehouse becomes worth considering when a stated requirement needs the additional table/platform capabilities.

### Case B: several teams update and query the same lake tables

The shared table state is now central. Specify the catalog and supported reader/writer paths, then test updates, schema evolution, conflicting writes, permissions and maintenance. Explain which complete state readers see during a failed publication.

### Case C: many domains depend on one central delivery queue

Investigate domain knowledge, staffing and responsibility. A larger engine will not give the central team more business understanding. Product ownership and self-serve platform practices may help if domain teams can actually support the responsibility.

Write the decision as a short record: the need, alternatives, chosen boundaries, owner, evidence, operating effort and rollback. That document should still make sense if the vendor names are removed.

**The main idea:** Judge a design by its correctness, usefulness and operating demands, rather than how many familiar tools it includes.

---

<a id="slide-37"></a>
## 37. A glossary to revisit after the story

Use this page as a reminder after reading the explanations. These terms describe different responsibilities, so a system may combine several of them.

| Term | What to remember |
| --- | --- |
| Data warehouse | It integrates analytical data and provides prepared representations for reporting and other consumers. |
| Data lake | It retains flexible source and derived data for several kinds of processing and consumption. |
| Lakehouse | It combines lake-style storage with reliable table management and analytical execution. |
| Snapshot / commit | A snapshot is a table state; a commit publishes a new state through the supported protocol. |
| Catalog | It helps resolve and manage named assets and their metadata; its exact role depends on the implementation. |
| Data product | It gives consumers a supported interface with explicit meaning, ownership and expectations. |
| Data mesh | It combines domain product ownership, self-serve platform capabilities and shared governance. |
| Medallion | It names the progression from source evidence through validated data to consumer-ready outputs. |
| Serving / semantic layer | Serving exposes usable results; a semantic layer defines business concepts and metrics for consumers. |
| Interoperability | It means the chosen versions and access paths support the intended behavior, beyond merely reading the same file format. |

**The main idea:** When a label is ambiguous, explain the concrete responsibility, interface or guarantee you mean.

---

<a id="slide-38"></a>
## 38. Retell the evolution in your own words

Start with a business that needs consistent reporting across operational systems. It integrates the data into a warehouse so consumers can use shared analytical definitions without rebuilding every source join themselves.

As detailed data and unfamiliar workloads grow, retaining flexible source history becomes more valuable. Distributed processing and later independently operated cloud storage support that work. Cloud warehouses also improve provisioning and execution options, so several designs remain reasonable.

When many files must behave like a changing, dependable table, the team needs explicit state and coordinated publication. Lakehouse mechanisms bring those capabilities to lake data. Modeling, quality, security and consumer definitions still need deliberate work.

When the bottleneck moves to one central team owning everybody’s meaning and delivery, domain data products and shared platform practices address that organizational problem. That is the mesh discussion. Your own project can learn from the whole story while starting with a small, reproducible first answer.

[Continue with file formats](../data-file-formats/data-file-formats.html) · [Continue with table formats](../data-table-formats/data-table-formats.html) · [Compare business modeling approaches](../modeling-approaches/modeling-approaches.html)

**The main idea:** Each architectural change is easier to understand as a response to a particular need. Keep that causal story when explaining your own design.

---

<a id="slide-39"></a>
## 39. Primary sources: history and mechanisms

Historical sources researched 21 October 2026; the narrative and first-use tool explanations were revised and checked 22 October 2026. Original papers and engineering accounts establish historical motivations; current project/product documentation establishes implementation scope. Company claims are attributed, not treated as universal benchmarks.

- [Devlin & Murphy: original warehouse architecture (1988)](https://www.9sight.com/1988/02/art-ibmsj-ebis/)
- [Snowflake: SIGMOD 2016 paper (public CMU-hosted copy)](https://www.cs.cmu.edu/~15721-f24/papers/Snowflake.pdf)
- [Microsoft: SQL Server Integration Services](https://learn.microsoft.com/en-us/sql/integration-services/sql-server-integration-services)
- [Teradata: analytical database platform](https://www.teradata.com/platform)
- [James Dixon: the data lake motivation (2010)](https://jamesdixon.wordpress.com/2010/10/14/pentaho-hadoop-and-data-lakes/)
- [Apache Hadoop: HDFS architecture](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [Dean & Ghemawat: MapReduce (2004)](https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/)
- [Apache Hive: SQL warehousing and metadata](https://hive.apache.org/docs/latest/introduction-to-apache-hive/)
- [Facebook: Hive at petabyte scale (2009)](https://engineering.fb.com/2009/06/10/web/hive-a-petabyte-scale-data-warehouse-using-hadoop/)
- [Facebook: why Presto was built (2013)](https://engineering.fb.com/2013/11/06/core-infra/presto-interacting-with-petabytes-of-data-at-facebook/)
- [Apache Spark: processing APIs and execution](https://spark.apache.org/docs/latest/)
- [Trino: engines, catalogs and connectors](https://trino.io/docs/current/overview/concepts.html)
- [Python: language tutorial](https://docs.python.org/3/tutorial/)
- [Amazon: S3 launch (2006)](https://press.aboutamazon.com/2006/3/amazon-web-services-launches)
- [AWS: how S3 object storage works](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [Apache Parquet: columnar file format](https://parquet.apache.org/docs/overview/)
- [Snowflake: storage, compute and cloud services architecture](https://docs.snowflake.com/en/user-guide/intro-key-concepts)
- [Google: Dremel (2010 paper)](https://research.google/pubs/dremel-interactive-analysis-of-web-scale-datasets-2/)
- [Google Cloud: BigQuery overview](https://docs.cloud.google.com/bigquery/docs/introduction)
- [AWS: Amazon Redshift overview](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html)
- [dbt: analytical modeling and execution roles](https://docs.getdbt.com/docs/introduction)
- [RFC 4180: CSV representation](https://www.rfc-editor.org/rfc/rfc4180)
- [CIDR: Lakehouse architecture paper (2021)](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf)
- [VLDB: Delta Lake paper (2020)](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf)
- [Apache Iceberg: concurrent commits and reliability](https://iceberg.apache.org/docs/latest/reliability/)
- [Delta Lake: concurrency control](https://docs.delta.io/concurrency-control/)
- [Trino: Iceberg connector and catalog requirements](https://trino.io/docs/current/connector/iceberg.html)
- [Apache Iceberg: schema and partition evolution](https://iceberg.apache.org/docs/latest/evolution/)
- [Trino founders: the PrestoSQL rename](https://trino.io/blog/2020/12/27/announcing-trino.html)

> **How this was checked:** The runnable lab was executed locally and its invariants asserted. Platform combinations were researched, not provisioned. Historical dates describe selected evidence; product capability lists are a dated snapshot.

**The main idea:** Use the original source and the exact installed-version documentation before implementing a platform-specific feature.

---

<a id="slide-40"></a>
## 40. Primary sources: current capabilities and ownership

Historical sources researched 21 October 2026; the narrative and first-use tool explanations were revised and checked 22 October 2026. Original papers and engineering accounts establish historical motivations; current project/product documentation establishes implementation scope. Company claims are attributed, not treated as universal benchmarks.

- [Uber: the ingestion problem behind Hudi (2017)](https://www.uber.com/ch/en/blog/hoodie/)
- [Apache Hudi: table and incremental-processing capabilities](https://hudi.apache.org/docs/overview/)
- [AWS: S3 strong consistency announcement (2020)](https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/)
- [Snowflake: Iceberg tables](https://docs.snowflake.com/en/user-guide/tables-iceberg)
- [BigQuery: managed Iceberg tables](https://docs.cloud.google.com/bigquery/docs/biglake-iceberg-tables-in-bigquery)
- [Microsoft Fabric: lakehouse and Delta tables](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables)
- [Databricks: platform overview](https://docs.databricks.com/aws/en/introduction/)
- [Microsoft Fabric: integrated analytics platform](https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview)
- [AWS: concrete services for a data mesh](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-data-mesh/aws-offerings-data-mesh.html)
- [Databricks: medallion as a logical design pattern](https://docs.databricks.com/aws/en/lakehouse/medallion)
- [Apache Beam: bounded and unbounded data](https://beam.apache.org/documentation/basics/)
- [Jay Kreps: questioning Lambda architecture (2014)](https://www.oreilly.com/radar/questioning-the-lambda-architecture/)
- [BTS: flight source fields and monthly files](https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ)
- [Apache Kafka: event retention and consumers](https://kafka.apache.org/intro/)
- [Apache Flink: stateful processing](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/)
- [Spark: Structured Streaming](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html)
- [Zhamak Dehghani: monolith to data mesh (2019)](https://martinfowler.com/articles/data-monolith-to-mesh.html)
- [Zhamak Dehghani: four data mesh principles (2020)](https://martinfowler.com/articles/data-mesh-principles.html)
- [YAML: language specification](https://yaml.org/spec/1.2.2/)
- [IBM: data fabric terminology](https://www.ibm.com/think/topics/data-fabric)
- [dlt: Python ingestion library](https://dlthub.com/docs/intro)
- [Debezium: database change capture](https://debezium.io/documentation/reference/stable/architecture.html)
- [DuckDB: Python DB API and transactions](https://duckdb.org/docs/current/clients/python/dbapi)
- [Apache Airflow: workflow architecture](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html)
- [NOAA: hourly weather data and station metadata](https://www.ncei.noaa.gov/products/global-historical-climatology-network-hourly)
- [Astronomer Cosmos: dbt workflows in Airflow](https://astronomer.github.io/astronomer-cosmos/)
- [RFC 8259: JSON representation](https://www.rfc-editor.org/rfc/rfc8259)
- [Astral: Python environment management with uv](https://docs.astral.sh/uv/)

> **Scope:** Examples and decision exercises are original and synthetic. No product is universally fastest or cheapest. No source forecasts a mandatory migration path for your project.

**The main idea:** Use the original source and the exact installed-version documentation before implementing a platform-specific feature.

---

