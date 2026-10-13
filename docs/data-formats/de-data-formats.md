# Data formats in data engineering

## Data formats in practice

The same orders can arrive from an API, travel through an event pipeline, become historical reporting data, and change later when a customer requests a refund. Different formats support different parts of that journey.

This guide covers **CSV, JSON, Avro, Parquet, and ORC**, then **Delta Lake, Apache Iceberg, and Apache Hudi**. It connects their strengths to how they store data, handle structure, and support real workloads.

Use **Read** for the article view, or navigate one slide at a time. The final slide is a complete cheatsheet covering all eight formats.

---

## One dataset, several workloads

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

---

## File formats: representation shapes the work

*Foundations · the same information, different arrangements*

A file format defines how values and structure are written and read. Some favor easy exchange as text; others use a compact binary representation or arrange values for analytical queries.

### CSV: values in a known order

```csv
order_id,country,amount
101,US,25.00
```

The header supplies names, but the file does not declare that `amount` is an exact decimal or `order_id` is an identifier. The reader needs to infer or be given those types.

### JSON: names alongside values

```json
{"order_id": 101, "country": "US", "amount": 25.00}
```

JSON distinguishes strings, numbers, and other basic types. A value like `25.00` still does not declare a fixed monetary precision. The receiving application supplies that meaning.

**Remember:** format conversion should preserve both values and meaning. Choosing field types is part of the work, not just changing a filename.

Sources: [CSV specification](https://www.rfc-editor.org/rfc/rfc4180), [JSON specification](https://www.rfc-editor.org/rfc/rfc8259).

---

## CSV: a portable boundary between tools

*File formats · .csv · comma-separated values*

CSV stores flat records as delimited text. Its main advantage is interoperability: spreadsheets, databases, and programming languages can exchange a table with very little setup.

### How a reader interprets it

```csv
order_id,country,amount
101,US,25.00
102,GB,40.00
103,US,15.00
```

A reader splits records into fields and converts text to useful types. The import settings provide the delimiter, header handling, and type expectations. Quoted fields let values contain commas or line breaks.

### Where it works well

CSV fits partner deliveries, extracts, small reference datasets, and human-facing exports. It is particularly useful when you cannot assume that both parties have the same data tools.

For repeated analysis, text parsing adds work: the tool must interpret values again, and the file has no column statistics for skipping irrelevant sections. Keeping CSV as the exchange format and a typed analytical copy internally is a common pattern.

**Remember:** CSV's strength is broad compatibility. Use an explicit import schema when stable IDs, dates, and monetary values matter.

Sources: [CSV specification](https://www.rfc-editor.org/rfc/rfc4180), [DuckDB CSV import settings](https://duckdb.org/docs/current/data/csv/overview).

---

## JSON: preserve the structure of application data

*File formats · .json · named values, objects, and arrays*

JSON represents data as text with named fields. It supports nested objects and arrays, so it can preserve the structure of an API response without first forcing everything into one flat table.

### A record with explicit field names

```json
{
  "order_id": 101,
  "country": "US",
  "amount": 25.00,
  "paid": true
}
```

Names make records readable and allow different records to contain different fields. A receiving application still needs expectations about required fields and their meanings.

### Where it works well

JSON fits APIs, application events, and source data with optional or nested fields. An **API** is an interface through which programs request or send information to each other.

That flexibility is valuable during collection. Before reporting, teams often validate the structure and convert selected fields to stable types. Repeated field names and text parsing make JSON less efficient than columnar files for large, recurring analytical scans.

**Remember:** JSON preserves application structure well. A consistent reporting schema is usually established during processing.

Sources: [JSON specification](https://www.rfc-editor.org/rfc/rfc8259), [MDN: working with JSON](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON).

---

## Nested JSON and the grain of your table

*JSON in practice · one order can contain several items*

An order naturally contains customer details and a list of purchased items. JSON keeps those relationships together through **objects** (named fields) and **arrays** (lists).

### Preserve the source structure

```json
{
  "order_id": 101,
  "customer": {"name": "Maya", "country": "US"},
  "items": [
    {"product": "Notebook", "quantity": 2},
    {"product": "Pen", "quantity": 1}
  ]
}
```

### Choose the reporting structure

Turning `items` into rows produces two records for order 101. This operation is often called **flattening** or **unnesting**. The resulting grain is one row per order item, rather than one row per order.

This is useful for product-level reporting. Keep order totals in an orders table and item details in an order-items table when you need both grains; otherwise, repeating an order total on every item can inflate a sum.

**Remember:** transforming JSON is also a modeling decision: decide what each output row represents before calculating metrics.

Sources: [MDN: JSON objects and arrays](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON).

---

## Schemas make data predictable

*Foundations · types, contracts, and change over time*

A **schema** describes field names, types, and structure. It gives a writer and reader a shared contract: what values can appear, and how those values should be interpreted.

### Types carry meaning

For orders, `order_id` may be text if leading zeros matter, `country` is text, and `amount` can be an exact decimal. A timestamp also needs an agreed time interpretation.

CSV usually gets its types from import settings. JSON carries basic value types but does not require a dataset-wide schema. Avro, Parquet, and ORC can describe richer types alongside their binary data.

### Schemas also change

**Schema evolution** means changing the structure while keeping data usable. Adding a nullable `discount_code` field is a common example: older orders have no value for it.

The details depend on the format and reader. A schema embedded in one file describes that file; managing a consistent schema across many files is a separate table-level concern.

**Remember:** binary formats need compatible software to decode them. Embedded types make records easier to interpret, but they do not validate every business rule.

Sources: [Avro schemas](https://avro.apache.org/docs/1.12.0/getting-started-java/), [Parquet logical types](https://parquet.apache.org/docs/file-format/types/logicaltypes/).

---

## Avro: compact records with a shared schema

*File formats · .avro · Apache Avro*

Avro encodes records using a schema. In its binary representation, values follow the schema's structure, so every record does not need to repeat its field names. Avro container files embed the schema and can compress blocks of records.

### A schema is part of the agreement

```json
{
  "type": "record",
  "name": "OrderStatus",
  "fields": [
    {"name": "order_id", "type": "long"},
    {"name": "status", "type": "string"}
  ]
}
```

This JSON describes the schema. The actual records, such as order 101 with status `paid`, can be encoded in binary.

### Why evolution matters

Suppose a new reader expects a `channel` field. Giving that field a default such as `"unknown"` lets the reader supply a value when reading older records that lack it.

This is **backward compatibility**: newer readers can understand older data. Compatibility follows specific rules; arbitrary type changes are not automatically safe. That makes Avro useful for long-lived event streams with separately updated producers and consumers.

**Remember:** Avro is a strong fit for complete records, compact exchange, and controlled schema evolution.

Sources: [Avro encoding, container files, and schema resolution](https://avro.apache.org/docs/1.12.0/specification/).

---

## Avro in an event pipeline

*Avro in practice · separate the message from its transport*

When order 101 is paid, the shop publishes an **event**, a record describing that occurrence. A shipping service and an analytics pipeline can each consume it for a different purpose.

### Producer, schema, consumer

The **producer** writes the event; the **consumer** reads it. Kafka can store and deliver the messages, while Avro defines how their contents are encoded.

In a common setup, a **schema registry** stores shared schemas. A message includes a schema identifier, allowing a consumer to retrieve the schema needed to decode it. This avoids sending a complete schema in every message.

### Events and reporting serve different needs

An event stream benefits from compact, complete records and compatible schema changes. A historical report usually benefits from reading selected columns across many records.

A pipeline can therefore receive Avro messages and write Parquet data for analytics. It may process events continuously (**streaming**) or in scheduled groups (**batch processing**).

**Remember:** Kafka transports and stores messages; Avro represents records; Parquet can organize the accumulated data for reporting.

Sources: [Confluent Avro serialization and schema registry](https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html).

---

## Why store values by column?

*Storage layout · complete records versus analytical scans*

Imagine our shop now has a million orders, each with 50 fields. To calculate total sales, we only need the `amount` field. Reading delivery addresses and product descriptions would be extra work.

```diagram
Rows:    [101, US, 25] [102, GB, 40] [103, US, 15]
Columns: [101,102,103] [US,GB,US] [25,40,15]
To total the amounts: 25 + 40 + 15 = 80
```

### Keeping a record together

A **row-oriented** representation keeps an order's values together. This is a natural fit when sending or processing one complete order, as in our Avro example.

### Grouping values by field

A **columnar** format groups values from the same field together within parts of a file. Software can read the columns a calculation needs. Parquet and ORC use this approach.

**Remember:** columnar storage shines when a query touches many records but only some fields. It does not imply that looking up a single order is always faster.

Sources: [Parquet layout concepts](https://parquet.apache.org/docs/concepts/), [ORC background](https://orc.apache.org/docs/).

---

## Parquet: organize data for selective reading

*File formats · .parquet · Apache Parquet*

Parquet is a typed, binary, columnar format used for analytical storage. It supports nested structures as well as flat tables, so data does not always need to be flattened before it can be stored efficiently.

### The layout behind the benefit

A file contains **row groups**, each holding a batch of records. Inside a row group, values are separated into column chunks. A reader asking for `country` and `amount` can locate those chunks without loading every other field.

The file footer stores metadata describing the schema and where the columns are located. Available column statistics can help the reader decide which row groups are relevant.

### Smaller storage, less repeated work

Similar values within a column are good candidates for **encoding**, such as representing repeated country names with compact codes, and **compression**, which reduces stored size further.

Parquet fits cleaned datasets, historical reporting, and data shared across analytical tools. It is especially useful when queries repeatedly scan many records but select a subset of fields.

**Remember:** Parquet's value comes from typed storage, efficient compression, and the ability to read less data for a query.

Sources: [Parquet file structure](https://parquet.apache.org/docs/file-format/), [Parquet motivation](https://parquet.apache.org/docs/overview/motivation/), [Parquet logical types](https://parquet.apache.org/docs/file-format/types/logicaltypes/).

---

## How a Parquet query reads less

*Parquet in practice · projection and filter pushdown*

Suppose the three orders are stored in `orders.parquet`. In DuckDB, this query asks for sales by country:

### Select the columns you need

```sql
SELECT country, SUM(amount) AS total_sales
FROM read_parquet('orders.parquet')
GROUP BY country
ORDER BY country;
```

The result is GB = 40 and US = 40. Only `country` and `amount` are needed. **Projection pushdown** means the engine passes that column selection to the reader, so it can avoid loading `order_id`.

### Use filters to skip sections

Now imagine a much larger file and a filter `WHERE amount >= 100`. If a row group's recorded maximum amount is 40, it cannot contain a match and may be skipped.

This is one benefit of **filter pushdown**: the engine gives the condition to the reader early. Skipping requires useful statistics; groups that might contain a match still need their values checked.

**Remember:** selecting fewer columns and filtering on well-organized data can reduce reading. The format enables this; the query engine implements it.

Sources: [DuckDB Parquet projection and filter pushdown](https://duckdb.org/docs/current/data/parquet/overview).

---

## ORC: columnar storage with built-in indexes

*File formats · .orc · Optimized Row Columnar*

ORC is a typed, binary, columnar format developed for analytical workloads in Apache Hive. Like Parquet, it combines efficient compression with selective reading and can represent nested data.

### Stripes and statistics

An ORC file is divided into **stripes**, batches of rows with their columns stored separately. Statistics at several levels describe the values, helping readers skip parts that cannot match a query.

For example, a report filtered to recent order dates may avoid older stripes when their date ranges rule out a match. These indexes help reduce scans; they are not the same as a database index that directly locates an individual order.

### Choosing between ORC and Parquet

ORC is a strong fit when a Hive-based platform already uses it effectively. Parquet is a common choice across general analytical tooling. Both target similar problems, so the engine and workload matter more than a universal speed ranking.

For a real comparison, use representative queries: selected columns, typical filters, and your actual data. A full-table read alone may hide the benefits you care about.

**Remember:** ORC's strengths are efficient column storage and metadata-assisted skipping in compatible analytical systems.

Sources: [ORC background](https://orc.apache.org/docs/), [ORC indexes](https://orc.apache.org/docs/indexes.html).

---

## Match the file format to the workload

*Choose a file · match it to the job*

These are common starting points, not exclusive uses. The same orders may move through more than one format.

| Format | Main strength | Reach for it when… |
| --- | --- | --- |
| CSV | A simple table that many tools can open | You are sharing an export with a person or partner. |
| JSON | Named values, nested groups, and lists | You receive data from an API or application. |
| Avro | Compact records with a shared schema | Your event pipeline exchanges many structured records. |
| Parquet | Efficient storage and column-based reading | You keep cleaned data for repeated analysis. |
| ORC | Efficient column-based reading in compatible platforms | Your Hive-based reporting environment already uses ORC. |

**Remember:** first ask, “Am I sharing a file, receiving application data, moving events, or building reports?” That narrows the choice.

---

## From one file to a table that keeps changing

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

## A table format keeps track of the current data

*Table formats · a concrete example of a table version*

Imagine a simplified table with two files. One contains order 101; another contains orders 102 and 103. To record the refund, our tool writes a replacement for the first file and records a new table version.

```diagram
Version 1: original order 101 + orders 102 and 103
Version 2: refunded order 101 + orders 102 and 103
The table's bookkeeping tells the reader which files to use.
```

The bookkeeping is called **metadata**: information describing the data, such as its schema and which files belong to a version. A **snapshot** is a particular version of the table.

A **commit** publishes the new version after its data is ready. The unchanged file can be reused across both versions; each snapshot does not need a complete copy of the table.

**Remember:** Parquet and a table format can work together. Parquet holds the order values; the table format records how the files make up the table. The diagram is one simplified update strategy.

Sources: [Delta table versions](https://docs.delta.io/delta-batch/), [Iceberg reliability](https://iceberg.apache.org/docs/latest/reliability/).

---

## Transactions, versions, and schema changes

*Table formats · what a managed table adds*

Table formats give compatible engines rules for coordinating files, updates, and metadata. Their value becomes clear when several jobs read or change the same dataset.

### Publish a complete change

A **transaction** publishes a set of changes together. A refund job might write several files before committing the new version. Readers can keep using a consistent snapshot while that work completes.

This is part of **ACID** behavior: atomicity (all-or-nothing changes), consistency (declared rules remain valid), isolation (concurrent work is coordinated), and durability (committed changes persist). These guarantees do not prove that a business calculation is correct.

### Evolve and reproduce the table

**Schema enforcement** checks incoming structure; **schema evolution** permits supported changes, such as adding a column. Their exact behavior depends on the engine and configuration.

**Time travel** queries an earlier version so a report can be reproduced. Both its metadata and required data files must still be retained. An **upsert** updates a matching record or inserts a new one.

**Remember:** table formats add coordinated changes and table-level structure around the files. Use tools that understand the table's metadata.

Sources: [Delta Lake features](https://docs.delta.io/), [Delta schema and history](https://docs.delta.io/delta-batch/), [Iceberg reliability](https://iceberg.apache.org/docs/latest/reliability/).

---

## Delta Lake: Parquet plus a transaction log

*Table formats · updates, history, and batch or streaming workflows*

A Delta table stores its data in Parquet files and records table changes in a **transaction log**, conventionally under `_delta_log`. A Delta-aware reader uses the log to identify a consistent table version.

### Apply changes with MERGE

Suppose a daily delivery contains a refund for order 101 and a new order 104. A **MERGE** operation can match on `order_id`, update 101, and insert 104 in one table operation.

This is useful for maintaining a current reporting table from incoming changes. Delta also supports schema checks and retained table history, so you can inspect changes and reproduce earlier results.

### Where Delta fits

Delta is a natural fit for Spark and Databricks pipelines, including scheduled batches and streaming ingestion. Spark processes the data; Delta defines how the table is stored and updated.

Read the dataset as a Delta table rather than selecting every Parquet file in its folder. Old files may still be present for earlier versions, so the transaction log determines which files belong to the selected version.

**Remember:** Delta combines Parquet's analytical storage with a transaction log that coordinates changes to the whole table.

Sources: [Delta Lake introduction](https://docs.delta.io/), [Delta MERGE operations](https://docs.delta.io/delta-update/), [Delta reads and history](https://docs.delta.io/delta-batch/).

---

## Apache Iceberg: shared tables that can evolve

*Table formats · multiple engines, snapshots, and partitioning*

Iceberg tracks snapshots through metadata and **manifests**, lists describing data files. It commonly uses Parquet, and also supports ORC and Avro data files. A catalog helps engines locate the table's current metadata.

### Share a table across engines

One team might prepare orders with Spark while another queries the same Iceberg table with Trino. Both must use compatible connectors and the appropriate catalog; support for particular write operations still varies.

Iceberg identifies columns internally with stable IDs. That allows supported changes such as renaming a column without confusing its identity with another field.

### Partition by a useful business dimension

**Partitioning** groups data by values such as order date so queries can avoid unrelated groups. Iceberg's **hidden partitioning** lets a date filter use that organization without requiring a separate partition column in the query.

Its layout can also evolve. A table might start grouped by month and later write new data grouped by day; readers can work with both layouts without immediately rewriting the older files.

**Remember:** Iceberg is a strong fit for shared analytical tables whose schema and storage layout need to evolve over time.

Sources: [Iceberg introduction](https://iceberg.apache.org/docs/latest/), [Iceberg evolution](https://iceberg.apache.org/docs/latest/evolution/), [Iceberg partitioning](https://iceberg.apache.org/docs/latest/partitioning/).

---

## CDC: keep a copy in step with database changes

*Before Hudi · change data capture*

The shop's application database stores the live orders. We also want a copy for reporting. **CDC means change data capture**: detecting inserts, updates, and deletes in the source database and passing those changes to another system.

| What happens in the shop | Change to pass along | What the reporting copy should do |
| --- | --- | --- |
| Order 104 is placed | Insert order 104 | Add the new order. |
| Order 101 is refunded | Update order 101 | Change its status to refunded. |
| A test order is removed | Delete that order | Remove the corresponding record. |

After an initial copy, a CDC tool can read database change logs and send the changes instead of recopying every row. Events typically identify the record, the operation, and an ordering position or timestamp.

The destination uses those details to apply changes to the right record in the intended order. Capture and application are separate jobs: Debezium can capture the changes, while a pipeline applies them to a Delta, Iceberg, or Hudi table.

**Remember:** CDC is a process, not a file format. It explains why a reporting table may need frequent updates as well as new rows.

Sources: [Debezium: capturing database changes](https://debezium.io/documentation/reference/stable/).

---

## Apache Hudi: optimize for changing records

*Table formats · upserts and incremental processing*

Hudi combines an open table format with ingestion and maintenance tools. A **record key**, such as `order_id`, identifies the order to update. Its focus on upserts and incremental work makes it useful for CDC-fed reporting tables.

### Two ways to handle updates

**Copy on Write** merges changes into new versions of columnar base files during a write. Queries read the resulting base files, which keeps reads straightforward but can require more rewriting.

**Merge on Read** can first store updates in log files. Queries combine base data with those updates for the latest view; a later **compaction** merges them into base files. This moves some work from ingestion to reads and maintenance.

### Work on the changed data

Hudi's timeline records table actions. **Incremental queries** can retrieve records changed since an earlier point, allowing a downstream job to process a smaller update set instead of rescanning the entire table.

This fits orders whose status changes frequently. Choose the write strategy according to how quickly changes must arrive and how much work reads can afford. Main data files commonly use Parquet.

**Remember:** Hudi is especially relevant when record-level changes, ingestion latency, and incremental downstream processing drive the design.

Sources: [Hudi overview](https://hudi.apache.org/docs/overview/), [Hudi table and query types](https://hudi.apache.org/docs/table_types/).

---

## Delta, Iceberg, or Hudi: choose by workload

*Choose a table · start with the project you actually have*

All three help manage changing tables over files. Their capabilities overlap, so these are useful starting points rather than a feature ranking.

| Option | A good reason to explore it | Our shop example |
| --- | --- | --- |
| Delta Lake | Your team or course already works with Delta in Spark or Databricks. | Maintain an orders table and review its history after refunds. |
| Apache Iceberg | Several compatible data tools need to share analytical tables. | Prepare orders in one tool and query the same table in another. |
| Apache Hudi | Frequent record updates and incremental processing are central to the pipeline. | Keep a reporting copy current as database changes arrive. |

Compare the actual readers and writers you need, the frequency of updates, and whether downstream jobs need change-based processing. Then confirm that the platform supports the required table features. For a local, fixed dataset, a Parquet file may already meet the need.

**Remember:** you usually choose one table format for a given table. You do not need to use all three in one project.

---

## How the formats can work together

*Put it together · one possible journey for our orders*

A **data pipeline** is a series of steps that moves and prepares data. Different steps can use different formats because they do different jobs.

1. **Receive orders as JSON.** The shop's API returns orders with customer details and purchased items.
2. **Prepare the data.** Your program selects useful fields, checks amounts, and produces a consistent table of orders.
3. **Save for reporting.** A simple project can save Parquet files. A project needing managed updates could use a Delta table, whose data files are Parquet.
4. **Answer business questions.** A data tool calculates daily sales or refund totals.
5. **Share a result as CSV.** A colleague opens the summary in a spreadsheet.

In an event-based version of this pipeline, order messages might arrive as Avro. In another platform, the reporting table might use Iceberg or Hudi instead.

**Remember:** you do not have to force the whole pipeline into one format. Choose a suitable representation at each step.

---

## Evaluate the tradeoff

*Scenarios · reveal the reasoning behind each choice*

Each situation suggests a starting point. There can be other valid choices depending on the tools already in use.

<details><summary>A colleague wants a small list of orders to open in Excel.</summary><p><strong>Start with CSV.</strong> The data is a simple table, and the recipient needs a widely supported export.</p></details>

<details><summary>A shop API sends one order with a customer and a list of items.</summary><p><strong>Expect JSON.</strong> Its objects and arrays can keep those related details together.</p></details>

<details><summary>You run the same sales summaries over a growing historical dataset.</summary><p><strong>Start with Parquet.</strong> Its column layout helps readers select the fields needed by reports, and it supports efficient compression.</p></details>

<details><summary>A database sends frequent order corrections into a reporting lake.</summary><p><strong>Explore Hudi in a CDC pipeline.</strong> Its focus on record updates and incremental work fits this need. Delta and Iceberg can also handle updates; existing platform support still matters.</p></details>

**Remember:** a useful answer includes both a format and a reason tied to the task.

---

## A practical conversion: CSV to typed Parquet

*Hands-on · specify types, then verify the result*

Save the three sample orders as `orders.csv`. Run the following in DuckDB from the folder containing the file. The output is a Parquet file that you can query repeatedly.

### Write with an explicit schema

```sql
COPY (
  SELECT * FROM read_csv('orders.csv',
    header = true,
    columns = {
      'order_id': 'VARCHAR',
      'country': 'VARCHAR',
      'amount': 'DECIMAL(12,2)'
    })
) TO 'orders.parquet' (FORMAT PARQUET);
```

`VARCHAR` keeps IDs as text. `DECIMAL(12,2)` reserves 12 digits in total, including two after the decimal point, for exact monetary values.

### Check meaning as well as storage

```sql
SELECT COUNT(*) AS orders,
       SUM(amount) AS total
FROM read_parquet('orders.parquet');
-- Expected: 3 orders, total 80.00
```

Also compare field types and a few records. Changing the format should preserve your intended values and row count. This tiny example checks correctness; it is too small for a meaningful speed comparison.

**Remember:** converting to Parquet gives typed analytical storage. Creating a managed Delta, Iceberg, or Hudi table is an additional step.

Sources: [DuckDB CSV reader](https://duckdb.org/docs/current/data/csv/overview), [DuckDB Parquet export](https://duckdb.org/docs/current/data/parquet/overview).

---

## Working vocabulary

*Quick reference · connect the terms to their purpose*

| Term | What it means in practice |
| --- | --- |
| Schema / schema evolution | The expected fields and types / supported changes to that structure over time. |
| Grain / record key | What one row represents / the value that identifies a record for matching updates. |
| Projection / filter pushdown | Pass column selections / conditions to the reader so it can reduce work. |
| Row group / stripe | A batch of records stored in columnar form inside Parquet / ORC. |
| Partitioning | Group data by a useful dimension, such as date, so queries can avoid unrelated groups. |
| Metadata / catalog | Information describing the data / a service that helps locate and manage named tables. |
| Transaction / snapshot | A change committed as a unit / a particular version of a table. |
| CDC / upsert | Capture database inserts, updates, and deletes / update a match or insert a new record. |
| Incremental / compaction | Process what changed / reorganize files or merge logged changes to improve reads. |
| Schema registry | Shared schema storage used by message producers and consumers. |

---

## Connect storage choices to pipeline design

*Recap · connect each name to a practical job*

### Five ways to represent data

**CSV** makes a simple table easy to share. **JSON** represents named values, groups, and lists from applications. **Avro** carries compact records with an agreed schema.

**Parquet** and **ORC** group values by column to support analysis. Parquet has broad analytical tool support; ORC is a strong fit in compatible Hive-based environments.

### Three ways to manage changing tables

**Delta Lake, Apache Iceberg, and Apache Hudi** keep track of a table's data files and changes. They let compatible tools offer features such as updates and consistent table versions.

For example, a Delta table stores order data in Parquet files and records which files make up each version. That is the practical difference between a file format and a table format.

**Remember:** explain the job first, then choose the format. “I want to share orders” and “I want to keep a reporting table current” are different needs.

---

## Further reading, when you need it

*References · optional next steps*

The shop examples connect format design to practical workloads. These references provide implementation detail when you need it; sources are also linked beside the relevant explanations.

- [CSV specification](https://www.rfc-editor.org/rfc/rfc4180) and [JSON specification](https://www.rfc-editor.org/rfc/rfc8259): the rules behind the two text formats.
- [Avro introduction](https://avro.apache.org/docs/1.12.0/getting-started-java/): schemas and records.
- [Parquet overview](https://parquet.apache.org/docs/overview/) and [ORC background](https://orc.apache.org/docs/): formats designed for analysis.
- [DuckDB: reading Parquet](https://duckdb.org/docs/current/data/parquet/overview): try a query on a local file.
- [Delta Lake documentation](https://docs.delta.io/): tables, updates, and history.
- [Apache Iceberg introduction](https://iceberg.apache.org/docs/latest/): shared analytical tables.
- [Apache Hudi overview](https://hudi.apache.org/docs/overview/): tables and incremental pipelines.
- [Debezium documentation](https://debezium.io/documentation/reference/stable/): capturing database changes.

The [readable overview](https://medium.com/@aftab4092/a-comprehensive-guide-to-file-formats-in-data-engineering-60d5e6dac4d5) inspired the explanatory style. Technical explanations here use the project documentation linked above. Format choices are practical guidance, not universal performance rankings.

---

## Complete data formats cheatsheet

*Keep this slide · five file formats + three table formats*

**File formats** organize values inside files or messages. **Table formats** coordinate data files, schemas, and table versions. They work together: a Delta table, for example, stores its data in Parquet.

**File formats — representation, structure, and fit**

| Format | Layout & schema | Strong fit | Useful tradeoff |
| --- | --- | --- | --- |
| **CSV** `.csv` | Flat text records; types supplied or inferred on import. | Portable exports, partner exchange, simple reference tables. | Easy to inspect; repeated parsing and no embedded column statistics. |
| **JSON** `.json` | Text objects and arrays; basic value types, optional external schema. | APIs, application events, nested source data. | Flexible structure; validate types and choose a reporting grain. |
| **Avro** `.avro` | Binary records; schema embedded in container files or shared for messages. | Event streams, complete-record exchange, compatible schema evolution. | Compact and compressible; readers need the writer's schema. |
| **Parquet** `.parquet` | Binary columns within row groups; embedded types and metadata. | Repeated analytics, historical datasets, broad analytical tool use. | Compression and selective reads; managed row updates require another layer. |
| **ORC** `.orc` | Binary columns within stripes; embedded types, statistics, and indexes. | Hive-based analytics and compatible SQL platforms. | Efficient compression and skipping; choose according to engine support. |

**Table formats — management above the data files**

| Format | Data & bookkeeping | Strong fit | Key operating idea |
| --- | --- | --- | --- |
| **Delta Lake** | Parquet data + transaction log. | Spark/Databricks workflows, merges, batch and streaming tables. | Use a Delta reader; the log identifies the selected table version. |
| **Apache Iceberg** | Parquet, ORC, or Avro data + snapshots and manifests; catalog locates metadata. | Shared tables across engines, schema and partition-layout evolution. | Hidden partitioning connects filters to layout; verify connector capabilities. |
| **Apache Hudi** | Commonly Parquet base files + timeline; update logs for Merge on Read. | Frequent upserts, CDC ingestion, incremental processing. | Record keys match updates; Copy on Write favors simple reads, Merge on Read defers some write work. |

**Shared table capabilities:** coordinated commits, evolving schemas, updates/deletes, and retained versions through compatible engines. Read and write support varies by engine and feature; history needs retained files and metadata.

**Decision shortcuts:** share a flat table → CSV · exchange nested application data → JSON · send typed events → Avro · store for analysis → Parquet / ORC · maintain a changing lake table → Delta / Iceberg / Hudi.

**Terms to retain:** CDC = capture database changes · upsert = update or insert · pushdown = let the reader use selected columns or filters early · partitioning = group data to narrow reads · compaction = reorganize files or merge updates for better reads.
