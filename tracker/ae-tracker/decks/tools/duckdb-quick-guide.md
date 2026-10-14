# DuckDB quick reference

## What it is

DuckDB is an embedded SQL database built for analytics: filtering, joining, grouping, and summarizing data. It runs inside a local process without a separate database server and can query files directly. Use it through the command-line tool or a programming-language client. [DuckDB overview](https://duckdb.org/)

## Main features

| Feature                               | Example                               |
| ------------------------------------- | ------------------------------------- |
| Query CSV, Parquet, and JSON directly | `SELECT * FROM 'data.csv';`           |
| Analyze data with SQL                 | Joins, aggregations, window functions |
| Use temporary or saved databases      | `duckdb` or `duckdb analytics.duckdb` |
| Import data into tables               | `CREATE TABLE ... AS SELECT ...`      |
| Export query results                  | `COPY (...) TO ...`                   |
| Run saved SQL scripts                 | `.read query.sql`                     |

## Start or open a database

Run in a terminal; assume the DuckDB CLI is installed and available on `PATH`. [Installation options](https://duckdb.org/docs/current/installation)

```sh
duckdb --version
duckdb                         # Temporary in-memory database
```

To open or create a saved database, use this instead:

```sh
duckdb analytics.duckdb
```

At the `D` prompt, enter SQL ending in `;`. Dot commands such as `.exit` need no semicolon. In-memory tables disappear on exit; tables in a database file persist. [CLI guide](https://duckdb.org/docs/current/clients/cli/overview)

## Query files directly

Replace these filenames with existing files. Run inside DuckDB:

```sql
SELECT * FROM 'data.csv' LIMIT 10;
SELECT * FROM read_csv('data.csv') LIMIT 10;
SELECT * FROM read_parquet('data.parquet') LIMIT 10;
SELECT * FROM read_json('data.json') LIMIT 10;
```

No connection string or import step is needed to query these files. Paths are relative to DuckDB's working folder. Absolute paths also work; quote SQL paths with single quotes, including spaces:

```sql
SELECT * FROM read_csv('data/my file.csv') LIMIT 10;
```

CSV settings and column types are detected automatically. Override settings if necessary:

```sql
SELECT * FROM read_csv('data.csv', header = true, delim = ';');
SELECT * FROM read_csv('data.csv', all_varchar = true); -- Read columns as text
```

[CSV guide](https://duckdb.org/docs/current/data/csv/overview), [Parquet guide](https://duckdb.org/docs/current/data/parquet/overview), [JSON guide](https://duckdb.org/docs/current/data/json/overview)

## Inspect and summarize data

```sql
DESCRIBE SELECT * FROM 'data.csv'; -- Column names and types
SELECT COUNT(*) AS row_count FROM 'data.csv';
```

For a file containing `country` and `amount` columns:

```sql
SELECT country, SUM(amount) AS total_amount
FROM 'data.csv'
GROUP BY country
ORDER BY total_amount DESC;
```

[SQL introduction](https://duckdb.org/docs/current/sql/introduction)

## Import a file into a .duckdb database

A `.duckdb` file is a database that can hold multiple tables. To turn `data.csv` into a saved database, create `data.duckdb` and import the CSV rows into a table named `records`. The CSV remains available; the database stores its own copy.

### Step by step

**1. In your terminal**, from the folder containing `data.csv`, open or create the database:

```sh
duckdb data.duckdb
```

**2. At DuckDB's `D` prompt**, run:

```sql
CREATE TABLE records AS SELECT * FROM read_csv('data.csv');
SHOW TABLES;
SELECT * FROM records LIMIT 10;
```

Then type this to close DuckDB and return to your terminal:

```text
.exit
```

**3. Later, reopen the saved database** from your terminal:

```sh
duckdb data.duckdb
```

At the `D` prompt, query the stored table:

```sql
SELECT * FROM records LIMIT 10;
```

The table is now stored in `data.duckdb`; reading it no longer requires the original CSV. Run `CREATE TABLE` only for the initial import. Later changes to the CSV do not automatically update the stored table. [CSV import](https://duckdb.org/docs/current/data/csv/overview), [Persistent databases](https://duckdb.org/docs/current/clients/cli/overview#in-memory-vs-persistent-database)

### Import in one terminal command

As an alternative to the initial interactive import:

```sh
duckdb data.duckdb -c "CREATE TABLE records AS SELECT * FROM read_csv('data.csv');"
```

The same pattern works for other formats. These examples add separate tables to the database:

```sh
duckdb data.duckdb -c "CREATE TABLE parquet_records AS SELECT * FROM read_parquet('data.parquet');"
duckdb data.duckdb -c "CREATE TABLE json_records AS SELECT * FROM read_json('data.json');"
```

[Parquet import](https://duckdb.org/docs/current/data/parquet/overview), [JSON import](https://duckdb.org/docs/current/data/json/overview)

## Create a table or view

```sql
CREATE TABLE csv_snapshot AS SELECT * FROM 'data.csv'; -- Store a copy
SHOW TABLES;
DESCRIBE csv_snapshot;
SELECT * FROM csv_snapshot LIMIT 10;

CREATE VIEW source_data AS SELECT * FROM 'data.csv'; -- Save a query
SELECT * FROM source_data LIMIT 10;
```

A table stores a snapshot; changes to the source file do not update it. A view stores the query and reads the source when queried, so the file must remain accessible. Create each table or view once, then query it in later sessions. Use a database file to keep these objects after exiting. [Tables](https://duckdb.org/docs/current/sql/statements/create_table), [Views](https://duckdb.org/docs/current/sql/statements/create_view)

## Export results

```sql
COPY (SELECT * FROM 'data.csv' LIMIT 100)
TO 'output.csv' (FORMAT CSV, HEADER true);

COPY (SELECT * FROM 'data.csv')
TO 'output.parquet' (FORMAT PARQUET);

COPY (SELECT * FROM 'data.csv')
TO 'output.json' (FORMAT JSON);
```

Replace the inner query with your own. Output paths use the same working-folder rule. [COPY reference](https://duckdb.org/docs/current/sql/statements/copy)

## Run one query or a saved SQL file

From a terminal:

```sh
duckdb -c "SELECT * FROM 'data.csv' LIMIT 10;"
duckdb data.duckdb -c "SELECT * FROM records LIMIT 10;"
```

For an interactive session, first run `duckdb data.duckdb` in your terminal. Then, at its `D` prompt, load a saved SQL file with:

```text
.read query.sql
```

In bash or zsh, input redirection also works:

```sh
duckdb < query.sql
duckdb data.duckdb < query.sql
```

[CLI scripting](https://duckdb.org/docs/current/clients/cli/overview#reading-sql-from-a-file)

## Daily analytics engineering (AE) and data engineering (DE) work

DuckDB can act as a local SQL workbench between receiving data and building or checking a production pipeline. These are practical applications of its file readers, SQL engine, and exporters.

| Daily task                          | How DuckDB helps                                                                        | Typical result                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Inspect a new source                | Profile a vendor CSV or API JSON export; check types, missing values, and ranges        | Understand the schema before building ingestion    |
| Check data quality                  | Find duplicate keys, null required fields, and unexpected values                        | Identify bad records before loading them           |
| Develop transformations and metrics | Join extracts, test deduplication, and calculate aggregates on a representative dataset | Validate model logic and expected output           |
| Investigate a broken report         | Query source and warehouse exports side by side                                         | Isolate missing rows or changed values             |
| Prepare a batch                     | Combine files, normalize fields, and write Parquet                                      | Produce an output ready for the next pipeline step |
| Automate recurring checks           | Save SQL in a file and run it from a script or scheduled job                            | Repeat the same analysis for each delivery         |

### Inspect and validate a delivery

For an `orders.csv` containing `order_id` and `amount`:

```sql
SUMMARIZE SELECT * FROM 'orders.csv'; -- Types, ranges, null percentages, etc.

SELECT order_id, COUNT(*) AS occurrences
FROM 'orders.csv'
WHERE order_id IS NOT NULL
GROUP BY order_id
HAVING COUNT(*) > 1;

SELECT * FROM 'orders.csv'
WHERE order_id IS NULL OR amount IS NULL;
```

For these example rules, the last two queries should return no rows. A query returning bad records still succeeds as SQL; an automated check must inspect its result and fail the job when violations exist. [Profiling reference](https://duckdb.org/docs/current/sql/statements/summarize)

### Combine and transform a batch

For Parquet files containing `country` and numeric `amount` columns:

```sql
COPY (
    SELECT UPPER(TRIM(country)) AS country, SUM(amount) AS total_amount
    FROM read_parquet('incoming/*.parquet')
    GROUP BY UPPER(TRIM(country))
) TO 'country_totals.parquet' (FORMAT PARQUET);
```

The wildcard reads the matching files as one dataset. For files with different column layouts, `read_parquet('incoming/*.parquet', union_by_name = true)` aligns columns by name and fills missing columns with nulls; check that this matches the data contract. [Multiple files](https://duckdb.org/docs/current/data/multiple_files/overview), [Parquet export](https://duckdb.org/docs/current/guides/file_formats/parquet_export)

### Reconcile source and target extracts

Suppose `source.csv` and `target.parquet` contain the same expected `order_id` and `amount` fields:

```sql
-- Rows in the source that are missing or different in the target.
SELECT order_id, amount FROM 'source.csv'
EXCEPT ALL
SELECT order_id, amount FROM 'target.parquet';
```

Run the comparison in reverse to find extra target rows. `EXCEPT ALL` also detects differences in duplicate counts. Align types, rounding, and the reporting period before comparing. [Set operations](https://duckdb.org/docs/current/sql/query_syntax/setops)

For a repeatable workflow: **inspect → check → transform → compare → export**. Save the queries in version control. Run a saved script from the terminal with:

```sh
duckdb -bail -c ".read pipeline.sql"
```

`-bail` stops on SQL errors; data-quality rules still need explicit pass/fail handling. [CLI options](https://duckdb.org/docs/current/clients/cli/arguments)

Use DuckDB for local analysis and batch work that fits the machine's CPU, memory, and disk. It can spill some workloads to disk when data exceeds memory. Validate SQL compatibility when moving logic to another database. [Workload tuning](https://duckdb.org/docs/current/guides/performance/how_to_tune_workloads)

## Useful commands inside DuckDB

```text
.help
.timer on
.mode markdown
.mode duckbox
.exit
```

These list commands, enable timings, select Markdown output, restore default output, and exit. Use `duckdb --help` in the terminal for startup options. [CLI reference](https://duckdb.org/docs/current/clients/cli/overview)
