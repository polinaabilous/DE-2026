# File formats: CSV, JSON, Avro, Parquet & ORC

*Companion to `data-file-formats.html`: the same lessons with the same numbering.*

No code in this deck is executed by the build; the one DuckDB example (CSV to typed Parquet) shows its expected result, which you can check by hand. Format features and engine support change between versions, so check the linked project documentation for the version you use. This deck is one half of the former “Data formats in practice” guide (the other half is *Table formats*).

**Additions in this split:** On-the-job notes on the main lessons, an Avro scenario, and a file-format cheat sheet.

## Contents

1. [File formats](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [One dataset, several workloads](#slide-2)
3. [File formats: representation shapes the work](#slide-3)
4. [CSV: a portable boundary between tools](#slide-4)
5. [JSON: preserve the structure of application data](#slide-5)
6. [Nested JSON and the grain of your table](#slide-6)
7. [Schemas make data predictable](#slide-7)
8. [Avro: compact records with a shared schema](#slide-8)
9. [Avro in an event pipeline](#slide-9)
10. [Why store values by column?](#slide-10)
11. [Parquet: organize data for selective reading](#slide-11)
12. [How a Parquet query reads less](#slide-12)
13. [ORC: columnar storage with built-in indexes](#slide-13)
14. [Match the file format to the workload](#slide-14)
15. [A practical conversion: CSV to typed Parquet](#slide-15)
16. [Scenarios: evaluate the tradeoff](#slide-16)
17. [Glossary: working vocabulary](#slide-17)
18. [Recap: connect storage choices to pipeline design](#slide-18)
19. [References: further reading, when you need it](#slide-19)
20. [Cheat sheet: file formats](#slide-20)

---

<a id="slide-1"></a>
## 1. File formats

The same orders can arrive through an API, travel as events, and become reporting data. Different file formats support different parts of that journey.

Explore how CSV, JSON, Avro, Parquet and ORC store data, handle schemas, and support real workloads, with the technical terms explained in context.

- **Share and receive data:** CSV · JSON. Simple tables, application data, and nested records
- **Send structured records:** Avro. Messages with an agreed schema
- **Store data for reports:** Parquet · ORC. Read only the columns a calculation needs
- **Practise:** CSV to typed Parquet. Convert, then verify the row count and total

**Part of a split series.** This deck is the first half of the former “Data formats in practice” guide; the second half is *Table formats* (Delta, Iceberg, Hudi, CDC).

**Added in this split:** On-the-job notes on the main lessons, an Avro scenario, and a file-format cheat sheet.

**Prefer an article?** Select Read to see every lesson together, or Markdown ↗ for the companion.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Every pipeline starts and ends with files. Sources hand you CSV and JSON; event streams carry Avro; analytics platforms store Parquet. The file format decides how types survive, how much storage and compute a query costs, and how painful a schema change will be.

#### Where you will use it

- Landing partner CSV feeds and API JSON in a Bronze / raw layer.
- Writing typed Parquet for analysis (usually inside a Delta or Iceberg table).
- Consuming Avro events from Kafka or Event Hubs with a schema registry.

#### What goes wrong without it

- IDs like 001 lose their zeros and amounts become floats when CSV types are guessed.
- Nested JSON flattened at the wrong grain double counts order totals.
- Reports scan whole CSV files every day because nothing was converted to a columnar format.

#### Who expects you to know it

- Data engineers who build ingestion and storage layers.
- Interviewers: “row vs columnar?”, “why Parquet?”, “how do you handle schema changes?”.

> **On the job:** A typical first task on a data team is “land this new feed and make it queryable”. You keep the raw CSV or JSON unchanged, declare a schema, convert to typed Parquet, and check the row count and a total after the conversion.

> **The main idea:** file formats are not trivia: they decide correctness (types), speed and cost of everything downstream.

*Read more:* [Parquet overview](https://parquet.apache.org/docs/overview/), [DuckDB CSV import settings](https://duckdb.org/docs/current/data/csv/overview).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Share a flat table with a person or partner | CSV with an agreed schema | Opens anywhere; declare types on import |
| Receive application or API data | JSON, kept raw, then typed columns | Keeps nested structure; choose the grain later |
| Stream many typed records between services | Avro + schema registry | Compact; schema evolution is checked |
| Repeated analysis on growing history | Parquet (or ORC where the platform uses it) | Reads only needed columns; compresses well |
| Updates, deletes and versions on a lake table | A table format (next deck) | Files alone cannot coordinate changes |

#### How interviews test it

- “Why is columnar storage faster for analytics?”
- “CSV vs Parquet vs Avro: when would you use each?”
- “How do you flatten nested JSON without double counting?”

#### Where it sits in your learning path

- Builds on: tables, rows, columns and basic SQL.
- Next: Table formats (Delta, Iceberg, Hudi) and columnar warehouses.
- Later: semi-structured SQL (UNNEST / EXPLODE) and reliable ingestion to Parquet.

> **The main idea:** pick the file format by the job (share, receive, transport, analyse) and keep raw data unchanged in the landing layer.

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
## 3. File formats: representation shapes the work

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

<a id="slide-4"></a>
## 4. CSV: a portable boundary between tools

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

> **On the job:** Partner and vendor feeds still arrive as CSV more than anything else. A typical ingestion job reads them with an explicit schema, rejects or quarantines rows that do not parse, and lands a typed copy (Parquet or a Delta table) for everything downstream.

**Remember:** CSV's strength is broad compatibility. Use an explicit import schema when stable IDs, dates, and monetary values matter.

Sources: [CSV specification](https://www.rfc-editor.org/rfc/rfc4180), [DuckDB CSV import settings](https://duckdb.org/docs/current/data/csv/overview).

---

<a id="slide-5"></a>
## 5. JSON: preserve the structure of application data

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

> **On the job:** Most REST APIs and app events you ingest are JSON. Pipelines usually land the raw JSON unchanged in a Bronze layer, then extract typed columns into Silver, so a schema change upstream never loses data.

**Remember:** JSON preserves application structure well. A consistent reporting schema is usually established during processing.

Sources: [JSON specification](https://www.rfc-editor.org/rfc/rfc8259), [MDN: working with JSON](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON).

---

<a id="slide-6"></a>
## 6. Nested JSON and the grain of your table

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

> **On the job:** Order headers with line items, events with nested properties, API pages with arrays: the first modeling decision is which grain the reporting table needs, then UNNEST / EXPLODE to reach it. This is the core of the semi-structured SQL lesson.

**Remember:** transforming JSON is also a modeling decision: decide what each output row represents before calculating metrics.

Sources: [MDN: JSON objects and arrays](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON).

---

<a id="slide-7"></a>
## 7. Schemas make data predictable

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

<a id="slide-8"></a>
## 8. Avro: compact records with a shared schema

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

> **On the job:** Avro is common on Kafka and Event Hubs topics, usually with a schema registry. Data engineers meet it when consuming CDC or event streams and when a producer change breaks a consumer.

**Remember:** Avro is a strong fit for complete records, compact exchange, and controlled schema evolution.

Sources: [Avro encoding, container files, and schema resolution](https://avro.apache.org/docs/1.12.0/specification/).

---

<a id="slide-9"></a>
## 9. Avro in an event pipeline

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

<a id="slide-10"></a>
## 10. Why store values by column?

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

<a id="slide-11"></a>
## 11. Parquet: organize data for selective reading

*File formats · .parquet · Apache Parquet*

Parquet is a typed, binary, columnar format used for analytical storage. It supports nested structures as well as flat tables, so data does not always need to be flattened before it can be stored efficiently.

### The layout behind the benefit

A file contains **row groups**, each holding a batch of records. Inside a row group, values are separated into column chunks. A reader asking for `country` and `amount` can locate those chunks without loading every other field.

The file footer stores metadata describing the schema and where the columns are located. Available column statistics can help the reader decide which row groups are relevant.

### Smaller storage, less repeated work

Similar values within a column are good candidates for **encoding**, such as representing repeated country names with compact codes, and **compression**, which reduces stored size further.

Parquet fits cleaned datasets, historical reporting, and data shared across analytical tools. It is especially useful when queries repeatedly scan many records but select a subset of fields.

> **On the job:** Parquet is the default storage file for lakehouses (Fabric, Databricks, Snowflake external tables, BigQuery external data). Most of the files your pipelines write will be Parquet, often inside a Delta or Iceberg table.

**Remember:** Parquet's value comes from typed storage, efficient compression, and the ability to read less data for a query.

Sources: [Parquet file structure](https://parquet.apache.org/docs/file-format/), [Parquet motivation](https://parquet.apache.org/docs/overview/motivation/), [Parquet logical types](https://parquet.apache.org/docs/file-format/types/logicaltypes/).

---

<a id="slide-12"></a>
## 12. How a Parquet query reads less

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

> **On the job:** Selecting only the columns you need and filtering on partition or sorted columns is how you keep scans, and cloud bills, small. EXPLAIN output and query profiles in Fabric, Databricks or Snowflake show how many files and bytes were actually read.

**Remember:** selecting fewer columns and filtering on well-organized data can reduce reading. The format enables this; the query engine implements it.

Sources: [DuckDB Parquet projection and filter pushdown](https://duckdb.org/docs/current/data/parquet/overview).

---

<a id="slide-13"></a>
## 13. ORC: columnar storage with built-in indexes

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

<a id="slide-14"></a>
## 14. Match the file format to the workload

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

Sources: [CSV specification](https://www.rfc-editor.org/rfc/rfc4180), [Avro introduction](https://avro.apache.org/docs/1.12.0/getting-started-java/), [Parquet overview](https://parquet.apache.org/docs/overview/).

---

<a id="slide-15"></a>
## 15. A practical conversion: CSV to typed Parquet

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

> **On the job:** Converting landed CSV to typed Parquet (or a Delta table) is one of the first transformations in nearly every pipeline. Checking row counts and a control total after the conversion is the habit that catches type and parsing mistakes.

**Remember:** converting to Parquet gives typed analytical storage. Creating a managed Delta, Iceberg, or Hudi table is an additional step.

Sources: [DuckDB CSV reader](https://duckdb.org/docs/current/data/csv/overview), [DuckDB Parquet export](https://duckdb.org/docs/current/data/parquet/overview).

---

<a id="slide-16"></a>
## 16. Scenarios: evaluate the tradeoff

*Scenarios · reveal the reasoning behind each choice*

Each situation suggests a starting point. There can be other valid choices depending on the tools already in use.

<details><summary>A colleague wants a small list of orders to open in Excel.</summary>

**Start with CSV.** The data is a simple table, and the recipient needs a widely supported export.

</details>

<details><summary>A shop API sends one order with a customer and a list of items.</summary>

**Expect JSON.** Its objects and arrays can keep those related details together.

</details>

<details><summary>You run the same sales summaries over a growing historical dataset.</summary>

**Start with Parquet.** Its column layout helps readers select the fields needed by reports, and it supports efficient compression.

</details>

<details><summary>An event pipeline sends millions of small, typed order messages, and producers and consumers are deployed separately.</summary>

**Consider Avro with a schema registry.** Records are compact, and compatible schema changes can be checked before a producer breaks a consumer.

</details>

**Remember:** a useful answer includes both a format and a reason tied to the task.

Sources: [CSV specification](https://www.rfc-editor.org/rfc/rfc4180), [Parquet overview](https://parquet.apache.org/docs/overview/).

---

<a id="slide-17"></a>
## 17. Glossary: working vocabulary

*Quick reference · connect the terms to their purpose*

| Term | What it means in practice |
|---|---|
| Schema / schema evolution | The expected fields and types / supported changes to that structure over time. |
| Grain / record key | What one row represents / the value that identifies a record for matching updates. |
| Projection / filter pushdown | Pass column selections / conditions to the reader so it can reduce work. |
| Row group / stripe | A batch of records stored in columnar form inside Parquet / ORC. |
| Partitioning | Group data by a useful dimension, such as date, so queries can avoid unrelated groups. |
| Schema registry | Shared schema storage used by message producers and consumers. |

---

<a id="slide-18"></a>
## 18. Recap: connect storage choices to pipeline design

*Recap · connect each name to a practical job*

1. A file format is a **representation**: text or binary, rows or columns, schema embedded or supplied.
2. **CSV** is for sharing flat tables; declare types on import so IDs, dates and money survive.
3. **JSON** keeps nested application data; choose the reporting grain before flattening it.
4. **Avro** carries compact typed records with a schema that both sides agree on and evolve compatibly.
5. **Parquet** and **ORC** store values by column, so analytical queries read fewer bytes; select only the columns you need.

#### Five ways to represent data

**CSV** makes a simple table easy to share. **JSON** represents named values, groups, and lists from applications. **Avro** carries compact records with an agreed schema.

**Parquet** and **ORC** group values by column to support analysis. Parquet has broad analytical tool support; ORC is a strong fit in compatible Hive-based environments.

#### What comes next

Files hold data; they do not manage a changing table. Updates, consistent versions and history are the job of a **table format** (Delta Lake, Apache Iceberg, Apache Hudi), covered in the *Table formats* deck.

**Remember:** explain the job first, then choose the format: share a table, receive application data, move events, or store for analysis.

---

<a id="slide-19"></a>
## 19. References: further reading, when you need it

*References · optional next steps*

The shop examples connect format design to practical workloads. These references provide implementation detail when you need it; sources are also linked beside the relevant explanations.

- [CSV specification](https://www.rfc-editor.org/rfc/rfc4180) and [JSON specification](https://www.rfc-editor.org/rfc/rfc8259): the rules behind the two text formats.
- [Avro introduction](https://avro.apache.org/docs/1.12.0/getting-started-java/): schemas and records.
- [Parquet overview](https://parquet.apache.org/docs/overview/) and [ORC background](https://orc.apache.org/docs/): formats designed for analysis.
- [DuckDB: reading Parquet](https://duckdb.org/docs/current/data/parquet/overview): try a query on a local file.

A readable overview on Medium, “A comprehensive guide to file formats in data engineering”, inspired the explanatory style. Technical explanations here use the project documentation linked above. Format choices are practical guidance, not universal performance rankings.

---

<a id="slide-20"></a>
## 20. Cheat sheet: file formats

*Keep this slide · five file formats*

**File formats** organize values inside files or messages. **Table formats** coordinate data files, schemas, and table versions. They work together: a Delta table, for example, stores its data in Parquet.

**File formats — representation, structure, and fit**

| Format | Layout & schema | Strong fit | Useful tradeoff |
|---|---|---|---|
| **CSV** `.csv` | Flat text records; types supplied or inferred on import. | Portable exports, partner exchange, simple reference tables. | Easy to inspect; repeated parsing and no embedded column statistics. |
| **JSON** `.json` | Text objects and arrays; basic value types, optional external schema. | APIs, application events, nested source data. | Flexible structure; validate types and choose a reporting grain. |
| **Avro** `.avro` | Binary records; schema embedded in container files or shared for messages. | Event streams, complete-record exchange, compatible schema evolution. | Compact and compressible; readers need the writer’s schema. |
| **Parquet** `.parquet` | Binary columns within row groups; embedded types and metadata. | Repeated analytics, historical datasets, broad analytical tool use. | Compression and selective reads; managed row updates require another layer. |
| **ORC** `.orc` | Binary columns within stripes; embedded types, statistics, and indexes. | Hive-based analytics and compatible SQL platforms. | Efficient compression and skipping; choose according to engine support. |

**Decision shortcuts:** share a flat table → CSV · exchange nested application data → JSON · send typed events → Avro · store for analysis → Parquet / ORC · maintain a changing lake table → a table format (next deck).

**Terms to retain:** pushdown = let the reader use selected columns or filters early · partitioning = group data to narrow reads · row group / stripe = the batch inside a columnar file.
