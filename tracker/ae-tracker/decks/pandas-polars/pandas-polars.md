# pandas for data engineering, with a Polars bridge

*Companion to `pandas-polars.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Lesson:** *DataFrames: pandas & Polars* (filter, groupby/agg, merge, shift/rank/rolling, pivot/melt, dtypes and memory, method chaining, and when to use Polars, pandas or DuckDB).

**Tested with:** CPython 3.12.10 on Windows 11 (64-bit), pandas 3.0.6, NumPy 2.5.3, PyArrow 25.0.1, Polars 1.44.2 and DuckDB 1.5.6 (DuckDB SQL dialect), in one virtual environment. Every Python block was executed while building this document, and every SQL query shown next to pandas code was run by DuckDB against the same DataFrames. Timing and memory figures are labelled as measured on the build machine; yours will differ.

**Version notes:** pandas 3.0 changed defaults that most online examples predate: Copy-on-Write is always on, text columns get the new `str` dtype, and new datetimes default to microsecond resolution. Microsoft Fabric Spark Runtime 1.3 ships pandas 2.1.4 and Runtime 2.0 ships pandas 2.3.3 (per the runtime release notes, checked October 2026), so code you meet at work may behave like pandas 2.x. Lesson 13 shows both.

**Prerequisites:** the SQL window-functions deck, the dimensional-modeling deck, and both decks of the lesson *Python for data engineering* (Python foundations; files and streams). New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note.

**Additions beyond the original brief** are marked (added): testing DataFrames with `assert_frame_equal`, DuckDB integer-sum types, Arrow interchange between the three engines, `case_when`, Parquet partitioning, and a pandas 2.x → 3.0 migration checklist.

## Contents

1. [pandas for data engineering, with a Polars bridge](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [The running example: six orders and four customers](#slide-3)
4. [A SQL user’s map of pandas and Polars](#slide-4)
5. [Series and DataFrame: the data model](#slide-5)
6. [The index and automatic alignment](#slide-6)
7. [Selecting rows and columns: [], .loc, .iloc](#slide-7)
8. [Filtering: WHERE in pandas](#slide-8)
9. [dtypes: NumPy, nullable, Arrow, and the new str](#slide-9)
10. [Missing values: NaN, None, pd.NA, NaT vs SQL NULL](#slide-10)
11. [Strings and dates: the .str and .dt accessors](#slide-11)
12. [Vectorization: whole-column operations](#slide-12)
13. [Copy-on-Write: how assignment works in pandas 3.0](#slide-13)
14. [assign and method chaining](#slide-14)
15. [Sorting and row order: ORDER BY, ties, and NULLs](#slide-15)
16. [GROUP BY in pandas: groupby and agg](#slide-16)
17. [NULL groups and group order](#slide-17)
18. [transform and filter: window aggregates and HAVING](#slide-18)
19. [Joins: merge next to JOIN](#slide-19)
20. [NULL join keys: pandas matches them, SQL does not](#slide-20)
21. [Join cardinality: validate= and fan-out](#slide-21)
22. [Semi-joins and anti-joins: indicator=True and isin](#slide-22)
23. [concat: UNION ALL, by name not by position](#slide-23)
24. [Deduplication: drop_duplicates and “latest row per key”](#slide-24)
25. [LAG, LEAD and RANK: shift and rank](#slide-25)
26. [Running totals and rolling windows](#slide-26)
27. [Pivot and melt: long to wide and back](#slide-27)
28. [SQL vs pandas: the differences that bite](#slide-28)
29. [CSV I/O: declare types instead of letting pandas guess](#slide-29)
30. [Parquet I/O: typed, compressed, columnar files](#slide-30)
31. [Measuring memory and shrinking DataFrames](#slide-31)
32. [When data gets big: chunks, column pruning, and streaming](#slide-32)
33. [Polars: DataFrames built from expressions](#slide-33)
34. [Polars expressions: CASE, windows, and namespaces](#slide-34)
35. [Polars semantics: nulls, joins, grouping, concat](#slide-35)
36. [Eager vs lazy: scan, explain, collect](#slide-36)
37. [Ten SQL problems, three engines](#slide-37)
38. [Problems 1–2: top N per group, running total](#slide-38)
39. [Problems 3–4: latest row per key, change since previous](#slide-39)
40. [Problems 5–6: streaks (sessions), share of total](#slide-40)
41. [Problems 7–8: anti-join, pivot](#slide-41)
42. [Problems 9–10: rank with ties, rolling average](#slide-42)
43. [Lab: messy events to daily metrics](#slide-43)
44. [Lab in pandas: clean, reject, dedupe, aggregate](#slide-44)
45. [Lab in Polars: one lazy query](#slide-45)
46. [Lab in DuckDB SQL, three-way check, and Parquet output](#slide-46)
47. [Choosing: pandas, Polars, DuckDB, or Spark](#slide-47)
48. [Bug clinic: DataFrame bugs that pass silently](#slide-48)
49. [Exercises 1–4: NULLs, joins, Copy-on-Write](#slide-49)
50. [Exercises 5–7: groups, windows, Polars](#slide-50)
51. [Exercises 8–10: duplicates, memory, chunks](#slide-51)
52. [Cheat sheet: SQL → pandas → Polars](#slide-52)
53. [Glossary](#slide-53)
54. [What to remember, and what comes next](#slide-54)
55. [References and how this deck was tested](#slide-55)
56. [Appendix A · Hints](#appendix-a)
57. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. pandas for data engineering, with a Polars bridge

**

You already answer questions with `GROUP BY`, joins and window functions. This deck maps each of those ideas to pandas, runs the SQL in DuckDB against the same DataFrames so you can compare real outputs, and then translates everything to Polars.

- **Part A, pandas core:** Series, DataFrames, index alignment, `.loc`, dtypes (including nullable and Arrow-backed), missing values, dates and strings, vectorization, Copy-on-Write, `assign` and method chaining.
- **Part B, SQL side by side:** `groupby`/`agg`/`transform`, NULL groups, joins with cardinality validation, anti-joins, `concat`, deduplication, `shift`, `rank`, rolling windows, pivot and melt, and the four differences that trip SQL users (NULL joins, grouping, ordering, indexes).
- **Part C, I/O and memory:** CSV and Parquet, measuring memory, smaller dtypes, chunked reads, and column pruning.
- **Part D, Polars, practice, choices:** expressions, eager vs lazy, `scan`/`collect`, query plans, ten SQL problems solved in SQL, pandas and Polars, a messy-events-to-daily-metrics lab, and a pandas/Polars/DuckDB/Spark choice guide. Then a bug clinic, 10 exercises, a cheat sheet and a glossary.

**Additions beyond the brief** (marked *added*): testing DataFrames with `assert_frame_equal`, DuckDB's 128-bit integer sums, Arrow interchange between pandas, Polars and DuckDB, `Series.case_when`, partitioned Parquet, and a pandas 2.x → 3.0 migration checklist.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

pandas is the most widely used Python library for tabular data: notebooks, data-quality checks, small and medium transforms, test fixtures, and quick investigations. Polars and DuckDB are faster modern options with the same table thinking. Knowing how they differ from SQL (NULLs, grouping, ordering, indexes) prevents subtle wrong answers.

#### Where you will use it

- Fabric/Databricks notebooks that prepare data before writing Delta tables.
- Validating extracts: row counts, nulls, duplicates, reconciliations.
- Small-to-medium transformations that don’t justify Spark.
- Unit tests for transforms (assert_frame_equal) and data fixtures.

#### What goes wrong without it

- Joins that silently match NULL keys or fan out (no validate=).
- groupby dropping NULL groups that SQL would keep.
- Memory blow-ups from loading everything as object/string columns.
- Copy/assignment code from older pandas versions behaving differently in pandas 3.

#### Who expects you to know it

- Data engineers and analysts (pandas appears in most Python data roles).
- Data scientists and ML engineers who consume your outputs.
- Interviews: pandas/SQL translation tasks, groupby/merge questions, “how would you make this faster or use less memory?”

> **On the job:** A frequent task: “check yesterday’s extract against the source and produce daily metrics”. With pandas or Polars it is a short, testable script; knowing the SQL differences keeps its numbers identical to the warehouse’s.

> **The main idea:** DataFrames are the everyday tool for table-shaped work in Python; using them correctly means matching SQL semantics and respecting memory.

*Read more:* [pandas: comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html), [Polars user guide](https://docs.pola.rs/).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Exploration, validation, small/medium transforms in a notebook | pandas | Ubiquitous, rich API, integrates with everything |
| Larger data on one machine, speed matters | Polars (lazy) | Multithreaded, query optimisation, low memory |
| SQL-first logic over files or DataFrames | DuckDB | Columnar SQL engine in-process |
| Data bigger than one machine or already in a lake | Spark / warehouse SQL | Distributed engines |
| Per-record glue and validation | Plain Python | No table needed |

#### How interviews test it

- “Translate this SQL into pandas” (and the reverse).
- “Why does this merge produce more rows?” (cardinality, validate=).
- “How would you process a file too big for memory?” (chunks, dtypes, Parquet, Polars lazy, DuckDB).

#### Where it sits in your learning path

- Builds on: both Python for data engineering decks and the SQL window-functions deck (its ten SQL problems are re-solved here).
- Next: the reliable-ingestion deck produces Parquet that pandas, Polars and DuckDB read; dbt does the same transforms in SQL.

> **The main idea:** use pandas for familiar notebook work, Polars or DuckDB when size or speed matters, and SQL/Spark when the data already lives in an engine.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · one virtual environment, four libraries*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** on Windows 11, **pandas 3.0.6**, **NumPy 2.5.3**, **PyArrow 25.0.1**, **Polars 1.44.2**, **DuckDB 1.5.6**. SQL is DuckDB’s dialect (close to PostgreSQL). |
| The libraries | **pandas**: the standard Python DataFrame library. **NumPy**: fast typed arrays that pandas is built on. **PyArrow**: Python bindings for **Apache Arrow**, a standard columnar in-memory format; pandas uses it for text and Parquet. **Polars**: a newer DataFrame library written in Rust. **DuckDB**: an embedded SQL engine (introduced in the files-and-streams deck) that can query pandas and Polars DataFrames directly. |
| Minimum versions | pandas **3.0** for the behaviour shown (Copy-on-Write always on, `str` dtype). Most code also runs on pandas 2.2+; lesson 13 lists what differs. Polars 1.x. |
| What runs at work | Microsoft Fabric Spark Runtime 1.3 lists **pandas 2.1.4** (Python 3.11) and Runtime 2.0 lists **pandas 2.3.3** (Python 3.13) in their release notes (checked October 2026). Online answers are mostly pandas 1.x/2.x. Always check `pd.__version__` first. |
| How outputs were produced | Every Python block ran inside the build, in order. SQL blocks ran in DuckDB against the same in-memory DataFrames. Timing and memory figures are labelled as measured on the build machine. |

#### Create the environment

```text
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install "pandas>=3" pyarrow polars duckdb

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
python -m pip install "pandas>=3" pyarrow polars duckdb
```

#### Check it, and set display width

```python
import sys
import duckdb, numpy as np, pandas as pd, polars as pl, pyarrow as pa

print("Python", sys.version.split()[0])
for lib in (pd, np, pa, pl, duckdb):
    print(f"{lib.__name__:<7} {lib.__version__}")

pd.set_option("display.width", 100)        # wider printed tables in this deck
pd.set_option("display.max_columns", 12)
```

Output:

```text
Python 3.12.10
pandas  3.0.6
numpy   2.5.3
pyarrow 25.0.1
polars  1.44.2
duckdb  1.5.6
```

> **On the job:** Put library versions in your notebook’s first cell output or in the job log. Many “pandas changed my numbers” incidents are version differences between a laptop and a cluster runtime.

> **The main idea:** pin versions per project and print them at the start of every notebook or job. pandas 3.0 behaves differently from the 2.x versions still common on cluster runtimes.

*Read more:* [pandas installation](https://pandas.pydata.org/docs/getting_started/install.html), [What’s new in pandas 3.0](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html), [Fabric runtimes](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime), [Fabric/Synapse runtime release notes (library versions)](https://github.com/microsoft/synapse-spark-runtime).

---

<a id="slide-3"></a>
## 3. The running example: six orders and four customers

*Start here · the SQL deck’s orders table, now as DataFrames*

The SQL deck used six orders with deliberate ties: two orders share a date and three share the amount 40. We reuse them, plus a small `customers` table. Zoe has no orders and no city, so she will show up in anti-joins and missing-value lessons. Every lesson and exercise starts from this code.

```python
import pandas as pd

orders = pd.DataFrame({
    "order_id":   [1, 2, 3, 4, 5, 6],
    "customer":   ["Maya", "Maya", "Leo", "Maya", "Leo", "Ana"],
    "order_date": pd.to_datetime(["2026-01-03", "2026-01-05", "2026-01-05",
                                  "2026-01-09", "2026-01-10", "2026-01-10"]),
    "amount":     [25, 40, 40, 15, 60, 40],
})
customers = pd.DataFrame({
    "customer": ["Maya", "Leo", "Ana", "Zoe"],
    "city":     ["Austin", "Denver", "Austin", None],
    "segment":  ["retail", "wholesale", "retail", "retail"],
})

print(orders)
print(customers)
```

Output:

```text
   order_id customer order_date  amount
0         1     Maya 2026-01-03      25
1         2     Maya 2026-01-05      40
2         3      Leo 2026-01-05      40
3         4     Maya 2026-01-09      15
4         5      Leo 2026-01-10      60
5         6      Ana 2026-01-10      40
  customer    city    segment
0     Maya  Austin     retail
1      Leo  Denver  wholesale
2      Ana  Austin     retail
3      Zoe     NaN     retail
```

#### Totals to keep in mind

Maya: 25 + 40 + 15 = **80**. Leo: 40 + 60 = **100**. Ana: **40**. All orders: **220**. Zoe: no orders, city unknown.

#### Querying the same frames with SQL

DuckDB can read a pandas or Polars DataFrame by its Python variable name. That is called a **replacement scan**: when a table name isn’t found in the database, DuckDB looks for a Python variable with that name. So `duckdb.sql("SELECT … FROM orders")` queries the DataFrame above, and both sides of every comparison use identical data.

> **On the job:** The same trick is handy at work: run a SQL query over a DataFrame to cross-check a pandas transformation, or to let a SQL-first colleague review your logic.

> **The main idea:** one tiny dataset with ties, a missing value and an unmatched row is enough to expose most differences between SQL and pandas.

*Read more:* [DuckDB: SQL on pandas](https://duckdb.org/docs/stable/guides/python/sql_on_pandas), [10 minutes to pandas](https://pandas.pydata.org/docs/user_guide/10min.html).

---

<a id="slide-4"></a>
## 4. A SQL user’s map of pandas and Polars

*Start here · the same ideas, three spellings*

A **DataFrame** is an in-memory table: named columns, each with one data type. pandas and Polars both have one; they differ in how you describe work. In pandas you mostly call methods that run immediately (**eager** execution). In Polars you can also build a plan that runs only when you ask for the result (**lazy** execution), like a SQL query that the engine optimises first.

| SQL | pandas | Polars | Lesson |
|---|---|---|---|
| table | `DataFrame` (plus an *index*) | `DataFrame` / `LazyFrame` (no index) | 5–6 |
| `SELECT a, b` | `df[["a", "b"]]` | `df.select("a", "b")` | 7 |
| `WHERE` | `df[mask]`, `df.loc[mask]`, `df.query(…)` | `df.filter(expr)` | 8 |
| `expr AS new_col` | `df.assign(new_col=…)` | `df.with_columns(…alias("new_col"))` | 14, 33 |
| `CASE WHEN` | `np.where`, `np.select`, `Series.case_when` | `pl.when().then().otherwise()` | 12, 14 |
| `ORDER BY`, `LIMIT` | `sort_values`, `head` | `sort`, `head` | 15 |
| `GROUP BY` + aggregates, `HAVING` | `groupby().agg()`, then filter | `group_by().agg()`, then filter | 16–18 |
| window `OVER (PARTITION BY …)` | `groupby().transform()`, `shift`, `rank`, `rolling` | `expr.over(…)` | 18, 25–26 |
| `JOIN` | `merge` | `join` | 19–22 |
| `UNION ALL` / `UNION` | `pd.concat` / + `drop_duplicates` | `pl.concat` / + `unique` | 23 |
| `DISTINCT`, `ROW_NUMBER() = 1` | `drop_duplicates` | `unique` | 24 |
| `PIVOT` / `UNPIVOT` | `pivot_table` / `melt` | `pivot` / `unpivot` | 27 |
| `NULL` | `NaN`, `None`, `pd.NA`, `NaT` | `null` (and NaN is a separate value) | 10, 35 |
| CTE (`WITH`) | method chain or named intermediate frames | chained expressions on a `LazyFrame` | 14, 36 |

> **On the job:** In interviews you are often allowed to answer in SQL or pandas. Knowing this map lets you switch quickly, and naming the differences (NULL keys, NULL groups, order, index) shows real experience.

> **The main idea:** every SQL clause has a pandas method and a Polars expression. The ideas carry over; the defaults around NULLs, order and the index do not.

*Read more:* [pandas: comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html), [Polars: coming from pandas](https://docs.pola.rs/user-guide/migration/pandas/).

---

<a id="slide-5"></a>
## 5. Series and DataFrame: the data model

*pandas core · values, dtype, index, columns*

A **Series** is one column: an array of values with one **dtype** (data type, such as `int64` or `str`) and an **index**, a set of row labels. A **DataFrame** is a set of Series that share one index, one per column name. Data is stored **column by column** (a columnar layout), which is why whole-column operations are fast.

```python
amount = orders["amount"]           # one column -> a Series
print(type(amount).__name__, amount.dtype, amount.name)
print(amount.index)                   # RangeIndex: labels 0..5, created automatically
print(amount.to_numpy())              # the values as a NumPy array

print(orders.shape, list(orders.columns))
print(orders.dtypes)
orders.info()                         # dtypes, non-null counts, memory
```

Output:

```text
Series int64 amount
RangeIndex(start=0, stop=6, step=1)
[25 40 40 15 60 40]
(6, 4) ['order_id', 'customer', 'order_date', 'amount']
order_id               int64
customer                 str
order_date    datetime64[us]
amount                 int64
dtype: object
<class 'pandas.DataFrame'>
RangeIndex: 6 entries, 0 to 5
Data columns (total 4 columns):
 #   Column      Non-Null Count  Dtype         
---  ------      --------------  -----         
 0   order_id    6 non-null      int64         
 1   customer    6 non-null      str           
 2   order_date  6 non-null      datetime64[us]
 3   amount      6 non-null      int64         
dtypes: datetime64[us](1), int64(2), str(1)
memory usage: 345.0 bytes
```

#### Terms

| Term | Meaning |
|---|---|
| **NumPy array** | A block of memory holding many values of one machine type; operations run in compiled code. |
| **dtype** | The type of every value in a column: `int64`, `float64`, `bool`, `datetime64[us]`, `str`, `object` (any Python object), and others in lesson 9. |
| **index** | Row labels. Default is `RangeIndex` (0, 1, 2, …). Labels need not be unique or sorted. |
| **shape** | (rows, columns). |

#### What is new in pandas 3.0 here

`customer` shows dtype `str`. pandas 2.x showed `object` for text. `order_date` is `datetime64[us]` (microseconds); pandas 2.x used nanoseconds (`[ns]`) by default. Both are covered in lesson 9.

> **On the job:** `df.info()` and `df.dtypes` are the first two calls after loading any file. A numeric column that arrives as `str` means bad values in the source, and you want to find that before aggregating.

> **The main idea:** a DataFrame is columns of typed arrays sharing one index. Check `dtypes` after every load.

*Read more:* [Intro to data structures](https://pandas.pydata.org/docs/user_guide/dsintro.html), [DataFrame.info](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.info.html).

---

<a id="slide-6"></a>
## 6. The index and automatic alignment

*pandas core · operations match rows by label, not by position*

When you combine two Series, pandas first lines them up by index label, then computes. Labels present in only one side produce a missing value (`NaN`, “not a number”). This is **index alignment**. SQL has nothing like it: rows have no labels, only columns, and you match rows explicitly with a join.

```python
target = pd.Series([100, 200, 300], index=["Jan", "Feb", "Mar"])
actual = pd.Series([90, 210, 50], index=["Feb", "Mar", "Apr"])
print(actual - target)                         # aligned by label; result sorted by label
print(actual.sub(target, fill_value=0))        # treat a missing side as 0

# The classic bug: assigning a Series with a different index
df = pd.DataFrame({"x": [3, 1, 2]})
ranked = df.sort_values("x")                   # index is now 1, 2, 0
df["wrong"] = ranked["x"]                       # aligned back by label: no visible change!
df["sorted_values"] = ranked["x"].to_numpy()   # positional: ignore the index
print(df)
```

Output:

```text
Apr      NaN
Feb   -110.0
Jan      NaN
Mar    -90.0
dtype: float64
Apr     50.0
Feb   -110.0
Jan   -100.0
Mar    -90.0
dtype: float64
   x  wrong  sorted_values
0  3      3              1
1  1      1              2
2  2      2              3
```

#### Working with the index

```python
by_customer = customers.set_index("customer")    # column -> index
print(by_customer.loc["Leo", "city"])             # label lookup, like a primary key
print(by_customer.index.is_unique)
print(by_customer.reset_index().columns.tolist())  # index -> column again

# DuckDB never sees the index: SQL tables have no row labels
print(duckdb.sql("SELECT * FROM by_customer LIMIT 1"))
```

Output:

```text
Denver
True
['customer', 'city', 'segment']
┌─────────┬─────────┐
│  city   │ segment │
│ varchar │ varchar │
├─────────┼─────────┤
│ Austin  │ retail  │
└─────────┴─────────┘
```

#### Rules of thumb

- Treat the index as an optional lookup key. For pipeline code keep the default `RangeIndex` and use columns; call `reset_index()` after `groupby` or `set_index` when you want plain columns back.
- If you assign a Series into a frame and the values look unchanged or become NaN, suspect alignment. Use `.to_numpy()` for positional assignment, or align explicitly.
- Writing to Parquet or a database: pass `index=False` (or reset it) so the index doesn’t become a surprise column.

> **On the job:** Alignment is helpful for time series (two metrics indexed by date line up automatically) and dangerous after filtering, sorting or joining. Many silent wrong-number bugs in notebooks are misaligned assignments.

> **The main idea:** pandas matches rows by index label before computing. SQL matches rows only through explicit joins. Keep a plain RangeIndex in pipelines and reset it when operations create a new one.

*Read more:* [Intro to data structures](https://pandas.pydata.org/docs/user_guide/dsintro.html), [Indexing and selecting data](https://pandas.pydata.org/docs/user_guide/indexing.html).

---

<a id="slide-7"></a>
## 7. Selecting rows and columns: [], .loc, .iloc

*pandas core · SELECT columns and pick rows by label or position*

Three ways to select. `df[...]` with a column name or list of names picks **columns**. `.loc[rows, cols]` selects by **label** (index values and column names). `.iloc[rows, cols]` selects by integer **position**, like a Python list. A **slice** is a range written `start:stop`.

```python
print(orders[["order_id", "amount"]].head(2))      # SELECT order_id, amount ... LIMIT 2
print(orders["customer"].tolist())                    # one column -> Series -> list

print(orders.loc[2, "customer"])                      # row label 2, column "customer"
print(orders.loc[1:3, ["customer", "amount"]])        # label slice: 3 IS included
print(orders.iloc[1:3, [1, 3]])                       # position slice: 3 is NOT included
print(orders.loc[orders["amount"] >= 60, ["order_id", "customer"]])   # mask + columns
print(orders.at[0, "amount"], orders.iat[0, 3])       # fast single values
```

Output:

```text
   order_id  amount
0         1      25
1         2      40
['Maya', 'Maya', 'Leo', 'Maya', 'Leo', 'Ana']
Leo
  customer  amount
1     Maya      40
2      Leo      40
3     Maya      15
  customer  amount
1     Maya      40
2      Leo      40
   order_id customer
4         5      Leo
25 25
```

#### Which one to use

| Need | Write |
|---|---|
| one column | `df["col"]` (avoid `df.col` in code: breaks for names with spaces or that clash with methods) |
| several columns | `df[["a", "b"]]` (double brackets: a list) |
| rows by condition | `df.loc[mask]` or `df[mask]` |
| rows by condition, some columns | `df.loc[mask, ["a", "b"]]` |
| set values | `df.loc[mask, "col"] = value` (one step; lesson 13) |
| first n rows | `df.head(n)`; by position `df.iloc[:n]` |

#### Two traps

**Label slices include the end.** `.loc[1:3]` returns labels 1, 2 and 3; `.iloc[1:3]` returns positions 1 and 2. After filtering or sorting, labels and positions differ, so `.loc[0]` may fail or return an unexpected row.

**Single vs double brackets.** `df["a"]` is a Series; `df[["a"]]` is a one-column DataFrame. Methods differ between the two.

> **On the job:** Most pipeline code selects columns early (`df[["needed", "cols"]]`) to cut memory and make the schema explicit, then filters with `.loc[mask]`. Positional `.iloc` is rare outside quick inspection.

> **The main idea:** `[]` for columns, `.loc` for labels and masks, `.iloc` for positions. Label slices are inclusive; position slices are not.

*Read more:* [Indexing and selecting data](https://pandas.pydata.org/docs/user_guide/indexing.html).

---

<a id="slide-8"></a>
## 8. Filtering: WHERE in pandas

*pandas core · boolean masks, isin, between, query*

A **boolean mask** is a Series of True/False values, one per row. `df[mask]` keeps the True rows. Combine masks with `&` (and), `|` (or) and `~` (not), and wrap each comparison in parentheses because these operators bind tighter than `==` or `>`.

#### pandas

```python
mask = (orders["customer"] == "Maya") & (orders["amount"] >= 25)
print(orders[mask])
print(orders[orders["customer"].isin(["Leo", "Ana"])].order_id.tolist())
print(orders[orders["order_date"].between("2026-01-05", "2026-01-09")].order_id.tolist())
print(orders.query("amount > 30 and customer != 'Leo'").order_id.tolist())
```

Output:

```text
   order_id customer order_date  amount
0         1     Maya 2026-01-03      25
1         2     Maya 2026-01-05      40
[3, 5, 6]
[2, 3, 4]
[2, 6]
```

#### SQL (DuckDB, same DataFrame)

```python
print(duckdb.sql("""
    SELECT order_id FROM orders
    WHERE customer IN ('Leo', 'Ana')
    ORDER BY order_id""").fetchall())
print(duckdb.sql("""
    SELECT order_id FROM orders
    WHERE order_date BETWEEN '2026-01-05' AND '2026-01-09'
    ORDER BY order_id""").fetchall())
```

Output:

```text
[(3,), (5,), (6,)]
[(2,), (3,), (4,)]
```

#### Python `and` does not work on columns

```python
orders[(orders["amount"] > 30) and (orders["customer"] == "Maya")]
```

Output:

```text
ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().
```

`and` asks “is this whole Series true?”, which has no answer. Use `&`. Without parentheses, `orders.amount > 30 & orders.customer == "Maya"` is parsed as `orders.amount > (30 & orders.customer) == …` and fails or gives nonsense.

#### A NULL difference already

```python
print(customers[customers["city"] != "Austin"])            # Zoe (city missing) is KEPT
print(duckdb.sql("SELECT * FROM customers WHERE city <> 'Austin'"))   # Zoe is DROPPED
```

Output:

```text
  customer    city    segment
1      Leo  Denver  wholesale
3      Zoe     NaN     retail
┌──────────┬─────────┬───────────┐
│ customer │  city   │  segment  │
│ varchar  │ varchar │  varchar  │
├──────────┼─────────┼───────────┤
│ Leo      │ Denver  │ wholesale │
└──────────┴─────────┴───────────┘
```

In SQL, `NULL <> 'Austin'` is unknown, so the row is filtered out. In pandas, a missing value compares as not equal to everything, so `!=` keeps it. Lesson 10 explains why.

> **On the job:** Filters are where silent row loss or gain happens. When porting a SQL `WHERE` to pandas, check row counts on both sides, and decide explicitly what should happen to missing values, for example `(df.city != "Austin") & df.city.notna()`.

> **The main idea:** filter with parenthesised masks joined by `&`, `|`, `~`; use `isin`, `between` (inclusive, like SQL) and `query` for readability. Missing values behave differently from SQL NULLs in comparisons.

*Read more:* [Indexing and selecting data](https://pandas.pydata.org/docs/user_guide/indexing.html), [DataFrame.query](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.query.html), [pandas: comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html).

---

<a id="slide-9"></a>
## 9. dtypes: NumPy, nullable, Arrow, and the new str

*pandas core · choose types that can hold your data, including missing values*

pandas columns come in three families. **NumPy dtypes** (`int64`, `float64`, `bool`, `datetime64`) are fast but `int64` and `bool` cannot hold a missing value, so one missing value turns integers into floats. **Nullable extension dtypes** (capitalised: `Int64`, `Float64`, `boolean`, `string`) add a separate mask for missing values, shown as `<NA>`. **Arrow-backed dtypes** (`int64[pyarrow]`, …) store data in Apache Arrow format.

```python
print(pd.Series([1, None, 3]).dtype)                  # float64: the missing value forced floats
print(pd.Series([1, None, 3], dtype="Int64").tolist())  # nullable integers keep ints
print(pd.Series([True, None]).dtype, "|", pd.Series([True, None], dtype="boolean").tolist())
print(pd.Series([1, None], dtype="int64[pyarrow]").dtype)

text = pd.Series(["Maya", None])
print(text.dtype, "|", repr(text.dtype))               # pandas 3.0 default for text
print(customers.convert_dtypes().dtypes.to_dict())     # pick the nullable dtype for each column

ids = pd.Series(["007", "042"])
print(ids.astype("Int64").tolist(), "<- leading zeros lost: keep IDs as text")
print(pd.to_numeric(pd.Series(["12.5", "abc", None]), errors="coerce").tolist())
```

Output:

```text
float64
[1, <NA>, 3]
object | [True, <NA>]
int64[pyarrow]
str | <StringDtype(na_value=nan)>
{'customer': <StringDtype(na_value=<NA>)>, 'city': <StringDtype(na_value=<NA>)>, 'segment': <StringDtype(na_value=<NA>)>}
[7, 42] <- leading zeros lost: keep IDs as text
[12.5, nan, nan]
```

#### The pandas 3.0 `str` dtype

Since pandas 3.0, text columns get the **`str`** dtype by default (a `StringDtype` stored with PyArrow when it is installed). Missing values in it are `NaN`, matching the old behaviour. In pandas 2.x the same column was `object`: an array of pointers to Python strings, slower and much larger in memory (measured in lesson 31). `dtype="string"` is the older opt-in variant that uses `<NA>` for missing values.

| Code you see online | pandas 2.x | pandas 3.0 |
|---|---|---|
| `df.dtypes` for text | `object` | `str` |
| `df[df.col.dtype == object]` to find text columns | works | misses text columns: use `select_dtypes(include="str")` or `pd.api.types.is_string_dtype` |
| putting a number into a text column | allowed (mixed object) | error: `str` columns hold only strings and missing values |

#### Conversions

| Need | Use |
|---|---|
| text → numbers, bad values to missing | `pd.to_numeric(s, errors="coerce")` |
| strict conversion (fail on bad values) | `s.astype("Int64")` |
| whole frame to nullable dtypes | `df.convert_dtypes()` |
| read straight into Arrow dtypes | `pd.read_csv(…, dtype_backend="pyarrow")` |
| few distinct repeated values | `s.astype("category")` (lesson 31) |

> **On the job:** Type drift is a top cause of broken pipelines: an ID column turns into floats (`1234.0`) because one row was empty, and the join to the dimension table silently stops matching. Declare dtypes at read time and keep IDs as text unless you do arithmetic on them.

> **The main idea:** NumPy dtypes are fast but can’t represent missing integers or booleans; nullable and Arrow dtypes can. pandas 3.0 stores text as `str`, not `object`. Convert with `to_numeric`/`astype` on purpose, never by accident.

*Read more:* [dtypes](https://pandas.pydata.org/docs/user_guide/basics.html#basics-dtypes), [Nullable integer data type](https://pandas.pydata.org/docs/user_guide/integer_na.html), [PyArrow functionality](https://pandas.pydata.org/docs/user_guide/pyarrow.html), [Migration guide for the new string dtype](https://pandas.pydata.org/docs/user_guide/migration-3-strings.html).

---

<a id="slide-10"></a>
## 10. Missing values: NaN, None, pd.NA, NaT vs SQL NULL

*pandas core · detect, fill, drop, and compare*

SQL has one missing marker, **NULL**, with **three-valued logic**: a comparison with NULL is neither true nor false but *unknown*, and `WHERE` keeps only true rows. pandas has several markers: `NaN` (a special float), `None` (Python’s null object), `pd.NA` (the nullable dtypes’ marker), and `NaT` (“not a time”). Test for all of them with `isna()`.

```python
import numpy as np
s = pd.Series([10.0, np.nan, 30.0])
print(s.isna().tolist(), s.notna().sum())
print(np.nan == np.nan, pd.NA == 1, pd.NA | True)        # NaN never equals itself; NA propagates

print(s.sum(), s.mean(), s.count(), len(s))             # NaN skipped, like SQL SUM/AVG/COUNT(col)
print(pd.Series([np.nan, np.nan]).sum())                # 0.0 ... but SQL SUM of only NULLs is NULL
print(pd.Series([np.nan, np.nan]).sum(min_count=1))     # nan: SQL-like

print(customers.fillna({"city": "unknown"}).city.tolist())   # COALESCE(city, 'unknown')
print(customers.dropna(subset=["city"]).customer.tolist())   # WHERE city IS NOT NULL
```

Output:

```text
[False, True, False] 2
False <NA> True
40.0 20.0 2 3
0.0
nan
['Austin', 'Denver', 'Austin', 'unknown']
['Maya', 'Leo', 'Ana']
```

```python
print(duckdb.sql("""
    SELECT SUM(x) AS sum_x, AVG(x) AS avg_x, COUNT(x) AS count_x, COUNT(*) AS count_star,
           SUM(x) FILTER (WHERE x IS NULL) AS sum_of_only_nulls
    FROM (VALUES (10.0), (NULL), (30.0)) t(x)"""))
```

Output:

```text
┌───────────────┬────────┬─────────┬────────────┬───────────────────┐
│     sum_x     │ avg_x  │ count_x │ count_star │ sum_of_only_nulls │
│ decimal(38,1) │ double │  int64  │   int64    │   decimal(38,1)   │
├───────────────┼────────┼─────────┼────────────┼───────────────────┤
│          40.0 │   20.0 │       2 │          3 │              NULL │
└───────────────┴────────┴─────────┴────────────┴───────────────────┘
```

| Question | SQL | pandas |
|---|---|---|
| Is the value missing? | `x IS NULL` | `s.isna()` (never `s == np.nan`, always False) |
| Comparison with a missing value | unknown → row dropped by `WHERE` | `NaN`: `==` False, `!=` True → row kept by `!=`; `pd.NA`: result is NA, treated as False in a filter |
| Sum of an all-missing group | `NULL` | `0` (use `min_count=1` for NaN) |
| Replace missing | `COALESCE(x, d)` | `s.fillna(d)`, `s.combine_first(other)` |
| Turn a value into missing | `NULLIF(x, 0)` | `s.mask(s == 0)` or `s.replace(0, np.nan)` |
| Missing in group keys / join keys | NULL group kept; NULL keys never match | groups dropped by default; keys *do* match (lessons 17, 20) |

> **On the job:** Data-quality checks are mostly missing-value checks: “no NULL `customer_id` in the fact table”, “less than 1% missing `amount`”. In pandas that is `df.isna().sum()` or `df.isna().mean()` per column, logged or asserted before you write output.

> **The main idea:** use `isna()` to test, `fillna`/`dropna` to handle, and remember three differences from SQL: `!=` keeps missing rows, all-missing sums are 0, and missing keys match in joins.

*Read more:* [Working with missing data](https://pandas.pydata.org/docs/user_guide/missing_data.html), [DuckDB: NULL values](https://duckdb.org/docs/stable/sql/data_types/nulls).

---

<a id="slide-11"></a>
## 11. Strings and dates: the .str and .dt accessors

*pandas core · clean text, parse timestamps, truncate to days*

An **accessor** is a namespace of methods for one kind of column: `.str` for text, `.dt` for datetimes. Each method works on the whole column at once and passes missing values through.

#### Text

```python
raw = pd.Series(["  Maya ", "LEO", None, "ana-01"])
clean = raw.str.strip().str.lower()
print(clean.tolist())
print(clean.str.contains("a").tolist())          # missing -> False for the str dtype
print(clean.str.extract(r"^([a-z]+)")[0].tolist())  # regex capture group
print(clean.str.replace("-01", "", regex=False).str.title().tolist())
print(pd.Series(["a,b", "c"]).str.split(",").tolist())
```

Output:

```text
['maya', 'leo', nan, 'ana-01']
[True, False, False, True]
['maya', 'leo', nan, 'ana']
['Maya', 'Leo', nan, 'Ana']
[['a', 'b'], ['c']]
```

#### Dates and times

```python
ts = pd.Series(["2026-03-02T09:00:00Z", "2026-03-02T10:15:00+01:00",
                "2026-03-03T23:30:00-08:00", "not a date"])
utc = pd.to_datetime(ts, utc=True, format="ISO8601", errors="coerce")
print(utc.tolist())
print(utc.dt.date.tolist())                      # calendar date in UTC
print(utc.dt.floor("D").dt.strftime("%Y-%m-%d").tolist())   # DATE_TRUNC('day', ts)
print(orders["order_date"].dt.to_period("M").astype(str).unique().tolist())   # month
print(utc.dt.tz_convert("America/Chicago").dt.strftime("%H:%M %Z").tolist())
```

Output:

```text
[Timestamp('2026-03-02 09:00:00+0000', tz='UTC'), Timestamp('2026-03-02 09:15:00+0000', tz='UTC'), Timestamp('2026-03-04 07:30:00+0000', tz='UTC'), NaT]
[datetime.date(2026, 3, 2), datetime.date(2026, 3, 2), datetime.date(2026, 3, 4), NaT]
['2026-03-02', '2026-03-02', '2026-03-04', nan]
['2026-01']
['03:00 CST', '03:15 CST', '01:30 CST', nan]
```

#### Rules for timestamps

- Parse with `utc=True` when inputs carry offsets. Mixed offsets without it raise `ValueError: Mixed timezones detected`.
- Give `format=` (`"ISO8601"` or an explicit pattern). Guessing formats is slow and can read 03/04 as 3 April or 4 March.
- `errors="coerce"` turns bad values into `NaT`; count them and report, don’t ignore them.
- Aggregate “per day” on a UTC (or explicitly chosen) zone, and say which in the metric definition.

#### SQL equivalents

| SQL (DuckDB) | pandas |
|---|---|
| `TRIM(LOWER(s))` | `s.str.strip().str.lower()` |
| `s LIKE '%a%'` | `s.str.contains("a", regex=False)` |
| `regexp_extract(s, …)` | `s.str.extract(…)` |
| `CAST(ts AS DATE)` | `ts.dt.date` or `ts.dt.normalize()` |
| `date_trunc('month', ts)` | `ts.dt.to_period("M").dt.start_time` |
| `ts AT TIME ZONE '…'` | `ts.dt.tz_convert("…")` |

> **On the job:** Event pipelines spend much of their code here: normalising user IDs and event names, parsing timestamps from several sources with different offsets, and assigning each event to a reporting day. The lab (lessons 43–46) does exactly this.

> **The main idea:** use `.str` and `.dt` instead of loops; parse timestamps with `utc=True`, an explicit `format`, and `errors="coerce"` plus a count of failures.

*Read more:* [Working with text data](https://pandas.pydata.org/docs/user_guide/text.html), [Time series / date functionality](https://pandas.pydata.org/docs/user_guide/timeseries.html), [pandas.to_datetime](https://pandas.pydata.org/docs/reference/api/pandas.to_datetime.html).

---

<a id="slide-12"></a>
## 12. Vectorization: whole-column operations

*pandas core · why loops and apply are slow, and what to use instead*

A **vectorized** operation applies to a whole column in one call, and the loop runs inside compiled code (C, C++ or Rust), not in the Python interpreter. `df["a"] * 1.1` is vectorized. A Python `for` loop over rows, `iterrows()`, and usually `apply(lambda …)` call Python code once per row and are often 10× slower or worse; the measurement below shows the gap on one million rows.

```python
import time
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
big = pd.DataFrame({"amount": rng.integers(1, 200, size=1_000_000)})

def timed(label, fn):
    t0 = time.perf_counter(); out = fn(); dt = time.perf_counter() - t0
    print(f"{label:<28} {dt * 1000:8.1f} ms")
    return out

loop = timed("Python loop over rows", lambda: [a * 1.1 if a > 100 else a for a in big["amount"]])
appl = timed("Series.apply (row by row)", lambda: big["amount"].apply(lambda a: a * 1.1 if a > 100 else a))
vect = timed("np.where (vectorized)", lambda: np.where(big["amount"] > 100, big["amount"] * 1.1, big["amount"]))
assert np.allclose(loop, vect) and np.allclose(appl, vect)
```

Output (timings measured on the build machine, one run):

```text
Python loop over rows            91.1 ms
Series.apply (row by row)       157.9 ms
np.where (vectorized)             8.8 ms
```

#### Conditional columns without loops

```python
amount = orders["amount"]
print(np.where(amount >= 40, "big", "small").tolist())            # IF / ELSE
print(np.select([amount >= 60, amount >= 40], ["large", "medium"], default="small").tolist())
size = pd.Series("small", index=amount.index).case_when([           # pandas 2.2+
    (amount >= 60, "large"),
    (amount >= 40, "medium")])
print(size.tolist())
```

Output:

```text
['small', 'big', 'big', 'small', 'big', 'big']
['small', 'medium', 'medium', 'small', 'large', 'medium']
['small', 'medium', 'medium', 'small', 'large', 'medium']
```

`np.select` and `case_when` check conditions in order and take the first match, like SQL `CASE WHEN`. (added)

#### When a loop is acceptable

- Calling an external API or file per row (I/O, not computation).
- Tiny frames where clarity matters more than speed.
- Logic with no vectorized form; even then, try `map` with a dict, `merge` with a lookup table, or `.str`/`.dt` methods first.

> **On the job:** A notebook that takes 20 minutes because of `iterrows()` over a million rows is a common code-review finding. Rewriting the loop as column expressions, or pushing the work into SQL, usually takes it to seconds.

> **The main idea:** write column expressions, not row loops: arithmetic and comparisons on Series, `np.where`, `np.select` or `case_when` for conditions, `.str`/`.dt` for text and dates.

*Read more:* [Enhancing performance](https://pandas.pydata.org/docs/user_guide/enhancingperf.html), [Series.case_when](https://pandas.pydata.org/docs/reference/api/pandas.Series.case_when.html), [numpy.select](https://numpy.org/doc/stable/reference/generated/numpy.select.html).

---

<a id="slide-13"></a>
## 13. Copy-on-Write: how assignment works in pandas 3.0

*pandas core · chained assignment, views, and copies across versions*

A **view** is an object that shares memory with another object; a **copy** owns its own memory. In pandas 1.x and 2.x it was hard to predict whether `df[mask]` returned a view or a copy, so writing to it might or might not change `df`, and pandas raised `SettingWithCopyWarning` to say “not sure”. pandas 3.0 makes **Copy-on-Write** (CoW) the only behaviour: every object you get from indexing or a method *behaves* as a copy, and memory is actually copied only when one of the objects is modified.

```python
df = orders.copy()

df[df["customer"] == "Ana"]["amount"] = 0       # chained assignment: two steps, never works in 3.0
print(df.loc[df["customer"] == "Ana", "amount"].tolist())

df.loc[df["customer"] == "Ana", "amount"] = 0   # one step with .loc: works
print(df.loc[df["customer"] == "Ana", "amount"].tolist())

sub = df[df["amount"] >= 40]                     # a separate object
sub["amount"] = sub["amount"] * 2                # changes sub only, no warning in 3.0
print(df["amount"].tolist(), sub["amount"].tolist())

col = df["amount"]                               # shares memory until someone writes...
print(np.shares_memory(col.to_numpy(), df["amount"].to_numpy()))
col.iloc[0] = 999                                # ...then col gets its own copy
print(np.shares_memory(col.to_numpy(), df["amount"].to_numpy()), df["amount"].iloc[0])
```

Output:

```text
<snippet>:3: ChainedAssignmentError: A value is being set on a copy of a DataFrame or Series through chained assignment.
Such chained assignment never works to update the original DataFrame or Series, because the intermediate object on which we are setting values always behaves as a copy (due to Copy-on-Write).

Try using '.loc[row_indexer, col_indexer] = value' instead, to perform the assignment in a single step.

See the documentation for a more detailed explanation: https://pandas.pydata.org/pandas-docs/stable/user_guide/copy_on_write.html#chained-assignment
[40]
[0]
[25, 40, 40, 15, 60, 0] [80, 80, 120]
True
False 25
```

#### What changed, version by version

| Pattern | pandas 1.x / 2.x (default) | pandas 3.0 |
|---|---|---|
| `df[mask]["col"] = v` | `SettingWithCopyWarning`; usually no effect | `ChainedAssignmentError` warning; never has an effect |
| `df["col"].fillna(0, inplace=True)` | usually updated `df` | warning; never updates `df` |
| `sub = df[mask]; sub["x"] = 1` | warning; `df` unchanged (sometimes changed for views) | no warning; `df` unchanged, always |
| `s = df["col"]; s.iloc[0] = 1` | changed `df` too (a view) | `df` unchanged |
| defensive `.copy()` everywhere | common, to silence warnings | not needed; harmless |

pandas 2.2 and 2.3 can opt in with `pd.options.mode.copy_on_write = True`, which lets you test 3.0 behaviour on a cluster that still runs 2.x.

#### pandas 2.x → 3.0 migration checklist (added)

- Replace chained assignment with one `.loc[rows, col] = value`.
- Replace `df[col].method(…, inplace=True)` with `df[col] = df[col].method(…)` or `df = df.fillna({col: v})`.
- Text checks: `dtype == object` → `pd.api.types.is_string_dtype` (lesson 9).
- Datetimes default to microseconds (`datetime64[us]`). Code that turns timestamps into epoch numbers with `.astype("int64")` now gets microseconds, not nanoseconds; divide by `pd.Timedelta("1s")` instead.
- Run the test suite with warnings shown; fix every `FutureWarning` and `Pandas4Warning`.

> **On the job:** If your team’s notebooks run on Fabric Runtime 1.3 (pandas 2.1.4) or 2.0 (pandas 2.3.3) and your laptop has pandas 3, the same cell can behave differently. Write the version-neutral form: single-step `.loc` assignment and no chained `inplace=True`. It is correct on every version.

> **The main idea:** in pandas 3.0 every derived object behaves as a copy. Modify a DataFrame only through one step on that DataFrame: `df.loc[rows, col] = value` or `df[col] = …`. Chained assignment silently does nothing.

*Read more:* [Copy-on-Write](https://pandas.pydata.org/docs/user_guide/copy_on_write.html), [What’s new in pandas 3.0](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html), [Returning a view versus a copy](https://pandas.pydata.org/docs/user_guide/indexing.html#returning-a-view-versus-a-copy).

---

<a id="slide-14"></a>
## 14. assign and method chaining

*pandas core · readable pipelines that never modify their input*

**Method chaining** means calling methods one after another, each returning a new DataFrame, inside parentheses so each step sits on its own line. `assign(name=…)` returns a copy with new or replaced columns. Passing a **lambda** (a small anonymous function, `lambda d: …`) lets a step refer to the DataFrame *as it is at that point* in the chain, including columns created by earlier steps. `pipe(fn, …)` inserts your own function as a step.

#### pandas chain

```python
def add_tax(df, rate):
    """A reusable step: takes a DataFrame, returns a new one."""
    return df.assign(amount_with_tax=lambda d: (d["amount"] * (1 + rate)).round(2))

result = (
    orders
    .assign(order_month=lambda d: d["order_date"].dt.strftime("%Y-%m"),
            size=lambda d: np.where(d["amount"] >= 40, "big", "small"))
    .loc[lambda d: d["size"] == "big"]               # WHERE on a column created above
    .pipe(add_tax, rate=0.08)
    .sort_values(["amount", "order_id"], ascending=[False, True])
    [["order_id", "customer", "order_month", "amount", "amount_with_tax"]]
    .reset_index(drop=True)
)
print(result)
```

Output:

```text
   order_id customer order_month  amount  amount_with_tax
0         5      Leo     2026-01      60             64.8
1         2     Maya     2026-01      40             43.2
2         3      Leo     2026-01      40             43.2
3         6      Ana     2026-01      40             43.2
```

#### The same logic as SQL CTEs

```python
print(duckdb.sql("""
WITH labelled AS (
    SELECT *, strftime(order_date, '%Y-%m') AS order_month,
           CASE WHEN amount >= 40 THEN 'big' ELSE 'small' END AS size
    FROM orders
), big AS (
    SELECT * FROM labelled WHERE size = 'big'
)
SELECT order_id, customer, order_month, amount,
       ROUND(amount * 1.08, 2) AS amount_with_tax
FROM big
ORDER BY amount DESC, order_id""").df())
```

Output:

```text
   order_id customer order_month  amount  amount_with_tax
0         5      Leo     2026-01      60             64.8
1         2     Maya     2026-01      40             43.2
2         3      Leo     2026-01      40             43.2
3         6      Ana     2026-01      40             43.2
```

#### Why chain

- Each step is a pure transformation: the input frame is never modified, so re-running a notebook cell gives the same result.
- Reads top to bottom like a SQL query with CTEs, and each step can be commented out while debugging.
- No half-finished intermediate variables (`df2`, `df_final_v3`) left in memory.

#### Debugging a chain

Insert a step that prints and passes the frame through: `.pipe(lambda d: print(d.shape) or d)`. Keep chains to about 5–10 steps; give larger stages a named function and call it with `pipe`, which also makes them unit-testable.

> **On the job:** Transformation layers in pipelines (bronze → silver → gold, deck on dimensional modeling) are often a set of small functions `clean_orders(df)`, `add_keys(df)`, chained with `pipe` and tested one by one with pytest.

> **The main idea:** build transformations as chains of `assign`, `loc[lambda d: …]`, `pipe`, `sort_values` and column selection. Use lambdas to refer to columns created earlier in the chain.

*Read more:* [DataFrame.assign](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.assign.html), [DataFrame.pipe](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.pipe.html), [pandas: comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html).

---

<a id="slide-15"></a>
## 15. Sorting and row order: ORDER BY, ties, and NULLs

*pandas core · pandas keeps order; SQL promises none without ORDER BY*

A SQL table is a **set**: without `ORDER BY`, rows can come back in any order, and the order can change between runs as the engine uses several threads. A pandas DataFrame is an **ordered** sequence: filters, `assign` and most methods keep the existing row order. A sort is **stable** if rows with equal keys keep their original relative order.

#### pandas

```python
s = orders.assign(amount=orders["amount"].where(orders["order_id"] != 4))   # order 4 -> NaN
print(s.sort_values("amount", ascending=False, kind="stable").set_index("order_id")["amount"].to_dict())
print(s.sort_values(["amount", "order_id"], ascending=[False, True],
                    na_position="first").set_index("order_id")["amount"].to_dict())
print(orders.nlargest(2, "amount", keep="all").set_index("order_id")["amount"].to_dict())  # ties kept
```

Output:

```text
{5: 60.0, 2: 40.0, 3: 40.0, 6: 40.0, 1: 25.0, 4: nan}
{4: nan, 5: 60.0, 2: 40.0, 3: 40.0, 6: 40.0, 1: 25.0}
{5: 60, 2: 40, 3: 40, 6: 40}
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT order_id, amount FROM s
    ORDER BY amount DESC, order_id""").fetchall())
print(duckdb.sql("""
    SELECT order_id, amount FROM s
    ORDER BY amount DESC NULLS FIRST, order_id""").fetchall())
```

Output:

```text
[(5, 60.0), (2, 40.0), (3, 40.0), (6, 40.0), (1, 25.0), (4, None)]
[(4, None), (5, 60.0), (2, 40.0), (3, 40.0), (6, 40.0), (1, 25.0)]
```

pandas puts missing values **last** by default, for both directions. DuckDB also defaults to `NULLS LAST`; PostgreSQL and Oracle put NULLs *first* for `DESC`, SQL Server treats NULL as the smallest value. Say `NULLS FIRST/LAST` explicitly in portable SQL, and `na_position` in pandas.

| Operation | Row order in pandas | Row order in SQL |
|---|---|---|
| filter, `assign`, `drop_duplicates` | original order kept | undefined without ORDER BY |
| `sort_values(col)` | sorted; ties in undefined order unless `kind="stable"` or a tie-breaker column | ties in undefined order unless a tie-breaker |
| `groupby` | groups sorted by key (`sort=True` default) | undefined |
| `merge(how="inner")` | left frame’s order | undefined |
| `concat` | inputs one after another | undefined (`UNION ALL`) |

> **On the job:** Tests that compare DataFrames row by row fail randomly if the SQL side has no `ORDER BY`. Sort both sides by a unique key before comparing (lesson 37 does this), and always add a tie-breaker when “first” or “latest” matters.

> **The main idea:** always sort by a unique key (add a tie-breaker) before you rely on order, in both SQL and pandas. State where missing values go.

*Read more:* [DataFrame.sort_values](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.sort_values.html), [DuckDB: ORDER BY](https://duckdb.org/docs/stable/sql/query_syntax/orderby), [DataFrame.nlargest](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.nlargest.html).

---

<a id="slide-16"></a>
## 16. GROUP BY in pandas: groupby and agg

*SQL side by side · split-apply-combine, and four ways to count*

`groupby` follows **split-apply-combine**: split rows into groups by key, apply a function to each group, combine the results into one frame. **Named aggregation**, `agg(new_name=("column", "function"))`, is the readable form and maps one-to-one to `SUM(col) AS new_name`. `as_index=False` keeps the keys as normal columns instead of moving them into the index.

#### pandas

```python
o = orders.assign(amount=orders["amount"].where(orders["order_id"] != 4))  # order 4 -> NaN

summary = o.groupby("customer", as_index=False).agg(
    rows=("order_id", "size"),          # COUNT(*): every row, missing or not
    amounts=("amount", "count"),        # COUNT(amount): non-missing only
    distinct_amounts=("amount", "nunique"),
    revenue=("amount", "sum"),
    first_order=("order_date", "min"),
)
print(summary)
print(o.groupby("customer").size().to_dict())       # a Series indexed by key
```

Output:

```text
  customer  rows  amounts  distinct_amounts  revenue first_order
0      Ana     1        1                 1     40.0  2026-01-10
1      Leo     2        2                 2    100.0  2026-01-05
2     Maya     3        2                 2     65.0  2026-01-03
{'Ana': 1, 'Leo': 2, 'Maya': 3}
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT customer,
           COUNT(*)               AS rows,
           COUNT(amount)          AS amounts,
           COUNT(DISTINCT amount) AS distinct_amounts,
           SUM(amount)            AS revenue,
           MIN(order_date)        AS first_order
    FROM o
    GROUP BY customer
    ORDER BY customer""").df())
```

Output:

```text
  customer  rows  amounts  distinct_amounts  revenue first_order
0      Ana     1        1                 1     40.0  2026-01-10
1      Leo     2        2                 2    100.0  2026-01-05
2     Maya     3        2                 2     65.0  2026-01-03
```

#### Counting, precisely

| SQL | pandas | Counts |
|---|---|---|
| `COUNT(*)` | `.size()` or `("col", "size")` | rows, including missing values |
| `COUNT(col)` | `.count()` or `("col", "count")` | non-missing values |
| `COUNT(DISTINCT col)` | `.nunique()` | distinct non-missing values |
| `SUM(col)` of all NULLs | `.sum()` → 0; `.sum(min_count=1)` → NaN | see lesson 10 |

#### Notes

- String function names (`"sum"`, `"mean"`, `"size"`) run optimised code; a `lambda` runs Python per group and is slower.
- Several keys: `groupby(["customer", "month"])`. Results come back sorted by key, unlike SQL (next lesson).
- `HAVING` is a filter after the aggregation: `.loc[lambda d: d["revenue"] > 50]`.

> **On the job:** Daily and monthly summary tables, row-count reconciliations (“rows per source file”) and duplicate checks (`groupby(key).size() > 1`) are all one `groupby`.

> **The main idea:** use `groupby(keys, as_index=False).agg(name=("col", "func"))`. `size` is `COUNT(*)`, `count` is `COUNT(col)`, `nunique` is `COUNT(DISTINCT col)`.

*Read more:* [Group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html), [Named aggregation](https://pandas.pydata.org/docs/user_guide/groupby.html#named-aggregation), [DuckDB: GROUP BY](https://duckdb.org/docs/stable/sql/query_syntax/groupby).

---

<a id="slide-17"></a>
## 17. NULL groups and group order

*SQL side by side · dropna=True drops the NULL group; sort=True sorts keys*

Two `groupby` defaults differ from SQL. `dropna=True`: rows whose key is missing are **dropped** from the result, while SQL puts them in one NULL group. `sort=True`: groups come back sorted by key, while SQL returns groups in no particular order.

#### pandas

```python
print(customers.groupby("city").size())                    # Zoe's missing city: gone
print(customers.groupby("city", dropna=False).size())      # NULL group kept, like SQL
print(customers.groupby("city", sort=False).size().index.tolist())   # order of first appearance
print(customers.groupby("city").size().sum(), "of", len(customers), "rows counted")
```

Output:

```text
city
Austin    2
Denver    1
dtype: int64
city
Austin    2
Denver    1
NaN       1
dtype: int64
['Austin', 'Denver']
3 of 4 rows counted
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT city, COUNT(*) AS n
    FROM customers
    GROUP BY city
    ORDER BY city NULLS LAST"""))
```

Output:

```text
┌─────────┬───────┐
│  city   │   n   │
│ varchar │ int64 │
├─────────┼───────┤
│ Austin  │     2 │
│ Denver  │     1 │
│ NULL    │     1 │
└─────────┴───────┘
```

#### Categorical keys

A **categorical** column stores a fixed list of allowed values (categories) plus a small integer code per row. When grouping by a categorical, `observed=True` (the default since pandas 3.0) returns only categories that occur; `observed=False` also returns empty categories with size 0, which is useful for “every day/region must appear” reports.

#### Rule

Whenever a key column can be missing, decide on purpose: keep the group (`dropna=False`), relabel it (`fillna("unknown")` before grouping), or reject the rows as bad data. Never let the default decide silently.

> **On the job:** Revenue by region that doesn’t add up to total revenue is a classic report bug. The missing-region rows were dropped by `groupby`. A reconciliation check (sum of groups equals overall total) catches it immediately.

> **The main idea:** pandas drops missing-key groups by default and sorts the groups; SQL keeps a NULL group and promises no order. Use `dropna=False` and explicit sorting to match SQL.

*Read more:* [Group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html), [DataFrame.groupby](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.groupby.html), [Categorical data](https://pandas.pydata.org/docs/user_guide/categorical.html).

---

<a id="slide-18"></a>
## 18. transform and filter: window aggregates and HAVING

*SQL side by side · keep every row, add a group value*

`agg` returns **one row per group**. `transform` returns **one value per original row**, the group result repeated for each row in the group. That is exactly a SQL window aggregate with `PARTITION BY` and no `ORDER BY`. `groupby(...).filter(fn)` keeps or drops *whole groups* and returns the original rows.

#### pandas

```python
share = orders.assign(
    customer_total=lambda d: d.groupby("customer")["amount"].transform("sum"),
    pct_of_customer=lambda d: (100 * d["amount"] / d["customer_total"]).round(1),
    above_avg=lambda d: d["amount"] > d.groupby("customer")["amount"].transform("mean"),
)
print(share[["order_id", "customer", "amount", "customer_total", "pct_of_customer", "above_avg"]])

repeat = orders.groupby("customer").filter(lambda g: len(g) >= 2)   # customers with 2+ orders
print(repeat["order_id"].tolist())
```

Output:

```text
   order_id customer  amount  customer_total  pct_of_customer  above_avg
0         1     Maya      25              80             31.2      False
1         2     Maya      40              80             50.0       True
2         3      Leo      40             100             40.0      False
3         4     Maya      15              80             18.8      False
4         5      Leo      60             100             60.0       True
5         6      Ana      40              40            100.0      False
[1, 2, 3, 4, 5]
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT order_id, customer, amount,
           SUM(amount) OVER (PARTITION BY customer) AS customer_total,
           ROUND(100 * amount / SUM(amount) OVER (PARTITION BY customer), 1)
               AS pct_of_customer
    FROM orders ORDER BY order_id""").df())
print(duckdb.sql("""
    SELECT order_id FROM orders
    WHERE customer IN (SELECT customer FROM orders
                       GROUP BY customer HAVING COUNT(*) >= 2)
    ORDER BY order_id""").fetchall())
```

Output:

```text
   order_id customer  amount  customer_total  pct_of_customer
0         1     Maya      25            80.0             31.3
1         2     Maya      40            80.0             50.0
2         3      Leo      40           100.0             40.0
3         4     Maya      15            80.0             18.8
4         5      Leo      60           100.0             60.0
5         6      Ana      40            40.0            100.0
[(1,), (2,), (3,), (4,), (5,)]
```

| You want | pandas | SQL |
|---|---|---|
| one row per group | `groupby().agg()` | `GROUP BY` |
| group value on every row | `groupby()[col].transform("sum")` | `SUM(col) OVER (PARTITION BY …)` |
| groups that pass a test (rows) | `groupby().filter(fn)`, or a `transform` mask | `WHERE key IN (… HAVING …)` |
| groups that pass a test (summary) | `agg()` then `.loc[…]` | `GROUP BY … HAVING` |

> **On the job:** “Share of customer total”, “flag orders above the customer’s average”, and “only keep users with at least two sessions” are interview staples. For large data prefer the `transform` mask form, `df[df.groupby(k)[c].transform("size") >= 2]`: `filter` with a lambda calls Python once per group.

> **The main idea:** `transform` is a window aggregate without ORDER BY: same number of rows out as in. `filter` is HAVING that returns detail rows.

*Read more:* [Group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html), [DataFrameGroupBy.transform](https://pandas.pydata.org/docs/reference/api/pandas.api.typing.DataFrameGroupBy.transform.html).

---

<a id="slide-19"></a>
## 19. Joins: merge next to JOIN

*SQL side by side · inner, left, outer, keys, suffixes*

`pd.merge(left, right, on=…, how=…)` (or `left.merge(right, …)`) is SQL’s `JOIN`. `how` is `"inner"` (default), `"left"`, `"right"`, `"outer"` (SQL `FULL OUTER`) or `"cross"`. Use `left_on`/`right_on` when the key columns have different names, and `suffixes` to rename clashing non-key columns.

#### pandas

```python
enriched = orders.merge(customers, on="customer", how="left")
print(enriched[["order_id", "customer", "city", "amount"]])

everyone = customers.merge(orders, on="customer", how="left")      # Zoe kept, no orders
print(everyone[["customer", "order_id", "amount"]].tail(3))

per_city = (orders.merge(customers, on="customer")
            .groupby("city", as_index=False)["amount"].sum())
print(per_city)
```

Output:

```text
   order_id customer    city  amount
0         1     Maya  Austin      25
1         2     Maya  Austin      40
2         3      Leo  Denver      40
3         4     Maya  Austin      15
4         5      Leo  Denver      60
5         6      Ana  Austin      40
  customer  order_id  amount
4      Leo       5.0    60.0
5      Ana       6.0    40.0
6      Zoe       NaN     NaN
     city  amount
0  Austin     120
1  Denver     100
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT c.customer, o.order_id, o.amount
    FROM customers c
    LEFT JOIN orders o USING (customer)
    ORDER BY o.order_id NULLS LAST
    LIMIT 3 OFFSET 4"""))
print(duckdb.sql("""
    SELECT c.city, SUM(o.amount)::BIGINT AS amount
    FROM orders o JOIN customers c USING (customer)
    GROUP BY c.city ORDER BY c.city""").fetchall())
```

Output:

```text
┌──────────┬──────────┬────────┐
│ customer │ order_id │ amount │
│ varchar  │  int64   │ int64  │
├──────────┼──────────┼────────┤
│ Leo      │        5 │     60 │
│ Ana      │        6 │     40 │
│ Zoe      │     NULL │   NULL │
└──────────┴──────────┴────────┘

[('Austin', 120), ('Denver', 100)]
```

#### Differences to remember

- **Missing values on the unmatched side** become `NaN`, so integer columns turn into `float64` (see `order_id` in the second output: 5.0, 6.0, NaN). Use nullable dtypes (`Int64`) if that matters.
- **Row order**: `how="left"` and `"inner"` keep the left frame’s order; SQL promises nothing.
- **Key dtypes must match**: merging an `int64` key with a `str` key raises `ValueError`; SQL engines often cast silently or fail too.
- **NULL keys match** in pandas (next lesson).

#### Joining on the index

`df.join(other)` joins on the index of `other`; `merge(left_index=True, right_index=True)` joins index to index. Prefer explicit columns with `merge(on=…)` in pipelines: it is clearer and survives `reset_index`.

> **On the job:** Enriching facts with dimension attributes (orders + customers, events + users) is the most common join in data engineering, and it should never change the number of fact rows. Lesson 21 shows how to make pandas check that for you.

> **The main idea:** `merge` is JOIN: choose `how`, name the keys, and expect NaN-filled, float-upcast columns on the unmatched side.

*Read more:* [Merge, join, concatenate and compare](https://pandas.pydata.org/docs/user_guide/merging.html), [pandas.merge](https://pandas.pydata.org/docs/reference/api/pandas.merge.html), [DuckDB: FROM and JOIN](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-20"></a>
## 20. NULL join keys: pandas matches them, SQL does not

*SQL side by side · the most surprising join difference*

In SQL, `NULL = NULL` is unknown, so a row with a NULL key never matches anything. pandas `merge` treats missing keys as equal to each other: every missing key on the left joins to every missing key on the right. With several missing keys on each side, that is a many-to-many explosion.

```python
left = pd.DataFrame({"user_id": ["u1", None, None], "event": ["view", "view", "buy"]})
right = pd.DataFrame({"user_id": ["u1", None], "country": ["DE", "??"]})

print(left.merge(right, on="user_id", how="inner"))          # None matched None: 3 rows

print(duckdb.sql("""SELECT l.user_id, l.event, r.country
                    FROM "left" l JOIN "right" r ON l.user_id = r.user_id"""))   # 1 row

print(duckdb.sql("""SELECT l.user_id, l.event, r.country
                    FROM "left" l JOIN "right" r
                      ON l.user_id IS NOT DISTINCT FROM r.user_id
                    ORDER BY l.event DESC, l.user_id NULLS LAST"""))   # SQL's NULL-matching join
```

Output:

```text
  user_id event country
0      u1  view      DE
1     NaN  view      ??
2     NaN   buy      ??
┌─────────┬─────────┬─────────┐
│ user_id │  event  │ country │
│ varchar │ varchar │ varchar │
├─────────┼─────────┼─────────┤
│ u1      │ view    │ DE      │
└─────────┴─────────┴─────────┘

┌─────────┬─────────┬─────────┐
│ user_id │  event  │ country │
│ varchar │ varchar │ varchar │
├─────────┼─────────┼─────────┤
│ u1      │ view    │ DE      │
│ NULL    │ view    │ ??      │
│ NULL    │ buy     │ ??      │
└─────────┴─────────┴─────────┘
```

#### Make pandas behave like SQL

```python
sql_like = left.dropna(subset=["user_id"]).merge(
    right.dropna(subset=["user_id"]), on="user_id", how="inner")
print(sql_like)

# For a LEFT join, keep the NULL-key rows but stop them matching:
safe_left = left.merge(right.dropna(subset=["user_id"]), on="user_id", how="left")
print(safe_left)
```

Output:

```text
  user_id event country
0      u1  view      DE
  user_id event country
0      u1  view      DE
1     NaN  view     NaN
2     NaN   buy     NaN
```

#### Why it matters

Missing join keys are common in raw data: anonymous events without a user, orders without a customer, late-arriving dimension rows. In SQL they quietly fall out of an inner join; in pandas they quietly join to each other, producing invented rows. Either way, count them before the join and decide.

> **On the job:** A safe enrichment step does three things: drop or quarantine rows with missing keys (log how many), merge with `validate=` (next lesson), and assert the row count. For dimension lookups, Kimball’s approach is to map missing keys to an explicit “Unknown” member instead of NULL.

> **The main idea:** pandas joins missing keys to each other; SQL never does (unless you write `IS NOT DISTINCT FROM`). Drop or relabel missing keys before `merge`.

*Read more:* [pandas.merge](https://pandas.pydata.org/docs/reference/api/pandas.merge.html), [DuckDB: comparison operators (IS DISTINCT FROM)](https://duckdb.org/docs/stable/sql/expressions/comparison_operators).

---

<a id="slide-21"></a>
## 21. Join cardinality: validate= and fan-out

*SQL side by side · make the join check its own assumptions*

**Cardinality** is how many rows on one side can match one row on the other: one-to-one, one-to-many, many-to-one, many-to-many. If you expect each order to find *one* customer but the customer table has a duplicate, every matching order is duplicated. That is called **fan-out**, and it inflates every sum computed afterwards. `merge(validate=…)` checks the uniqueness assumption and raises `MergeError` instead.

```python
customers_dup = pd.concat([customers, pd.DataFrame(
    {"customer": ["Leo"], "city": ["Boulder"], "segment": ["wholesale"]})], ignore_index=True)

fanned = orders.merge(customers_dup, on="customer", how="left")
print(len(orders), "->", len(fanned), "rows; revenue", orders["amount"].sum(), "->", fanned["amount"].sum())

orders.merge(customers_dup, on="customer", how="left", validate="many_to_one")
```

Output:

```text
6 -> 8 rows; revenue 220 -> 320
MergeError: Merge keys are not unique in right dataset; not a many-to-one merge

Duplicates in right:
 customer
     Leo ...
```

#### validate values

| validate= | Checks that | Typical join |
|---|---|---|
| `"one_to_one"` / `"1:1"` | keys unique on both sides | entity + its 1:1 extension table |
| `"one_to_many"` / `"1:m"` | keys unique on the left | customers → orders |
| `"many_to_one"` / `"m:1"` | keys unique on the right | fact → dimension lookup |
| `"many_to_many"` | nothing (documents intent) | bridge tables, deliberate |

```python
ok = orders.merge(customers, on="customer", how="left", validate="many_to_one")
assert len(ok) == len(orders), "fan-out!"
print(len(ok), ok["amount"].sum())
```

Output:

```text
6 220
```

#### In SQL there is no validate=

DuckDB produces the same 8 rows; nothing warns you. Check the key first:

```python
print(duckdb.sql("""
    SELECT customer, COUNT(*) AS n
    FROM customers_dup GROUP BY customer HAVING COUNT(*) > 1"""))
print(duckdb.sql("""SELECT COUNT(*) FROM orders o
                    LEFT JOIN customers_dup c USING (customer)""").fetchone())
```

Output:

```text
┌──────────┬───────┐
│ customer │   n   │
│ varchar  │ int64 │
├──────────┼───────┤
│ Leo      │     2 │
└──────────┴───────┘

(8,)
```

> **On the job:** Fan-out is the most common cause of “revenue doubled overnight” incidents: someone added a second row per customer to a dimension (a slowly changing dimension without a current-row filter, deck on Kimball). `validate="many_to_one"` plus a row-count assertion turns that into a failed job instead of a wrong dashboard.

> **The main idea:** state the expected cardinality on every merge with `validate=`, and assert row counts. In SQL, check key uniqueness with GROUP BY … HAVING COUNT(*) > 1 before joining.

*Read more:* [pandas.merge](https://pandas.pydata.org/docs/reference/api/pandas.merge.html), [Merge, join, concatenate and compare](https://pandas.pydata.org/docs/user_guide/merging.html).

---

<a id="slide-22"></a>
## 22. Semi-joins and anti-joins: indicator=True and isin

*SQL side by side · EXISTS, NOT EXISTS, and the NOT IN trap*

A **semi-join** keeps left rows that have at least one match, without adding columns or duplicating rows (SQL `EXISTS`). An **anti-join** keeps left rows with *no* match (SQL `NOT EXISTS`). In pandas, `merge(…, how="left", indicator=True)` adds a `_merge` column saying where each row came from: `both`, `left_only` or `right_only`.

#### pandas

```python
flagged = customers.merge(orders[["customer"]].drop_duplicates(),
                          on="customer", how="left", indicator=True)
print(flagged[["customer", "_merge"]])
no_orders = flagged.loc[flagged["_merge"] == "left_only", "customer"].tolist()
print("anti-join:", no_orders)

print("semi-join:", customers[customers["customer"].isin(orders["customer"])]["customer"].tolist())
print("anti-join:", customers[~customers["customer"].isin(orders["customer"])]["customer"].tolist())
```

Output:

```text
  customer     _merge
0     Maya       both
1      Leo       both
2      Ana       both
3      Zoe  left_only
anti-join: ['Zoe']
semi-join: ['Maya', 'Leo', 'Ana']
anti-join: ['Zoe']
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT customer FROM customers c
    WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer = c.customer)""").fetchall())

# The NOT IN trap: one NULL in the subquery makes the result empty
print(duckdb.sql("""
    SELECT customer FROM customers
    WHERE customer NOT IN (SELECT customer FROM orders UNION ALL SELECT NULL)""").fetchall())
```

Output:

```text
[('Zoe',)]
[]
```

`x NOT IN (a, b, NULL)` means `x <> a AND x <> b AND x <> NULL`; the last part is unknown, so no row qualifies. pandas `~isin` has no such trap. Prefer `NOT EXISTS` in SQL.

#### Which pandas form

- `isin` on one key column: simplest, fastest, no duplicates.
- `indicator=True`: several key columns, or when you also want to report “in both / left only / right only” counts.
- Deduplicate the right side’s keys before a merge-based semi-join, or                                          matching rows are duplicated.

> **On the job:** Anti-joins are reconciliation tools: “orders whose customer is missing from the dimension” (orphans), “source IDs not yet loaded into the target” (incremental loads), “rows in yesterday’s snapshot but not today’s” (deletes). `value_counts()` on `_merge` after an outer join is a one-line data-diff report.

> **The main idea:** semi-join = `isin`; anti-join = `~isin` or `indicator=True` + `"left_only"`. In SQL use `EXISTS`/`NOT EXISTS`, never `NOT IN` over a nullable column.

*Read more:* [pandas.merge](https://pandas.pydata.org/docs/reference/api/pandas.merge.html), [Series.isin](https://pandas.pydata.org/docs/reference/api/pandas.Series.isin.html), [DuckDB: FROM and JOIN](https://duckdb.org/docs/stable/sql/query_syntax/from).

---

<a id="slide-23"></a>
## 23. concat: UNION ALL, by name not by position

*SQL side by side · stack batches, handle schema drift*

`pd.concat([df1, df2, …])` stacks frames vertically, like `UNION ALL`. Two differences from SQL: columns are matched by **name**, not position, and a column missing from one input is filled with missing values instead of raising an error. That is helpful for **schema drift** (a source adding or reordering columns over time) and dangerous when a column was renamed.

```python
jan = pd.DataFrame({"order_id": [1, 2], "amount": [25, 40]})
feb = pd.DataFrame({"amount": [15, 60], "order_id": [4, 5], "channel": ["web", "app"]})  # reordered + new col

stacked = pd.concat([jan, feb], ignore_index=True)       # ignore_index: fresh 0..n-1 labels
print(stacked)
print(stacked.dtypes.to_dict())

print(pd.concat([jan, jan]).index.tolist())               # without ignore_index: duplicate labels
union = pd.concat([jan, jan], ignore_index=True).drop_duplicates()   # UNION (distinct)
print(len(union))
```

Output:

```text
   order_id  amount channel
0         1      25     NaN
1         2      40     NaN
2         4      15     web
3         5      60     app
{'order_id': dtype('int64'), 'amount': dtype('int64'), 'channel': <StringDtype(na_value=nan)>}
[0, 1, 0, 1]
2
```

#### SQL (DuckDB)

```python
print(duckdb.sql("SELECT * FROM jan UNION ALL BY NAME SELECT * FROM feb ORDER BY order_id"))
print(duckdb.sql("SELECT * FROM jan UNION ALL SELECT amount, order_id FROM feb").fetchall())  # by position!
```

Output:

```text
┌──────────┬────────┬─────────┐
│ order_id │ amount │ channel │
│  int64   │ int64  │ varchar │
├──────────┼────────┼─────────┤
│        1 │     25 │ NULL    │
│        2 │     40 │ NULL    │
│        4 │     15 │ web     │
│        5 │     60 │ app     │
└──────────┴────────┴─────────┘

[(1, 25), (2, 40), (15, 4), (60, 5)]
```

Standard `UNION ALL` matches columns by *position*: the second query above put amounts into `order_id` silently. DuckDB’s `UNION ALL BY NAME` behaves like `pd.concat`.

#### Rules

- Pass a **list** of frames once; don’t `concat` inside a loop (each call copies everything so far, so the loop is quadratic). Collect frames in a list, concat at the end.
- Use `ignore_index=True` unless the index means something.
- Check columns before stacking: `assert set(a.columns) == set(b.columns)` when drift is not allowed; add a `source_file` column so you can trace rows back.
- `axis=1` concatenates side by side, aligned on the index (rarely what you want in pipelines; use `merge`).

> **On the job:** Loading a folder of daily files is “read each file, add `source_file`, append to a list, `pd.concat` once”. Schema-drift handling (allow new columns, reject missing required ones) is a real design decision you should be able to discuss.

> **The main idea:** `pd.concat(list, ignore_index=True)` is `UNION ALL BY NAME`; add `drop_duplicates()` for `UNION`. Concat once, not in a loop, and decide how to treat schema drift.

*Read more:* [pandas.concat](https://pandas.pydata.org/docs/reference/api/pandas.concat.html), [Merge, join, concatenate and compare](https://pandas.pydata.org/docs/user_guide/merging.html), [DuckDB: set operations](https://duckdb.org/docs/stable/sql/query_syntax/setops).

---

<a id="slide-24"></a>
## 24. Deduplication: drop_duplicates and “latest row per key”

*SQL side by side · DISTINCT and ROW_NUMBER() = 1*

`duplicated(subset=…)` marks rows that repeat an earlier row on the given columns; `drop_duplicates(subset=…, keep=…)` removes them. `keep="first"` (default) or `"last"` chooses which copy survives, based on the *current row order*, so sort first. `keep=False` drops every copy. The SQL deck’s change feed (CDC: change data capture) delivered customer 7 three times; we want the current version of each customer.

```python
changes = pd.DataFrame({
    "customer_id": [7, 7, 7, 8],
    "email":       ["a@old.com", "a@new.com", "a@new.com", "b@x.com"],
    "updated_at":  pd.to_datetime(["2026-01-01 09:00", "2026-01-04 12:00", "2026-01-04 12:00", "2026-01-02 08:00"]),
    "load_id":     [1, 2, 3, 1],
})

print(changes.duplicated(subset=["customer_id", "email", "updated_at"]).tolist())   # exact repeats
latest = (changes
          .sort_values(["customer_id", "updated_at", "load_id"])     # tie-breaker: load_id
          .drop_duplicates(subset="customer_id", keep="last")
          .reset_index(drop=True))
print(latest)
```

Output:

```text
[False, False, True, False]
   customer_id      email          updated_at  load_id
0            7  a@new.com 2026-01-04 12:00:00        3
1            8    b@x.com 2026-01-02 08:00:00        1
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT customer_id, email, updated_at, load_id
    FROM changes
    QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id
                               ORDER BY updated_at DESC, load_id DESC) = 1
    ORDER BY customer_id""").df())
```

Output:

```text
   customer_id      email          updated_at  load_id
0            7  a@new.com 2026-01-04 12:00:00        3
1            8    b@x.com 2026-01-02 08:00:00        1
```

`QUALIFY` filters on a window function’s result (DuckDB, Snowflake, BigQuery). Elsewhere, compute `ROW_NUMBER()` in a CTE and filter outside.

#### Alternatives and traps

- `changes.loc[changes.groupby("customer_id")["updated_at"].idxmax()]`: the row label of each group’s maximum. Ties go to the first label, so the tie-breaker is implicit; the sort form is clearer.
- `drop_duplicates()` with no subset is `SELECT DISTINCT *`: it only removes rows identical in every column.
- Without the `load_id` tie-breaker, the two 12:00 rows tie and the survivor depends on input order, so re-runs may differ.

> **On the job:** Every raw-to-clean layer deduplicates: redelivered events (same `event_id`), CDC rows (latest per key), and overlapping incremental extracts. Record how many rows dedup removed; a sudden jump points to an upstream problem.

> **The main idea:** latest per key = sort by key, timestamp and a tie-breaker, then `drop_duplicates(subset=key, keep="last")`. It is `ROW_NUMBER() … = 1` with the same need for a deterministic order.

*Read more:* [DataFrame.drop_duplicates](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.drop_duplicates.html), [DataFrame.duplicated](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.duplicated.html), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify).

---

<a id="slide-25"></a>
## 25. LAG, LEAD and RANK: shift and rank

*SQL side by side · window functions that depend on order*

`shift(1)` moves values down one row: each row sees the previous row’s value (SQL `LAG`); `shift(-1)` is `LEAD`. `rank(method=…)` numbers rows by value. The key difference: a SQL window has its own `ORDER BY` inside `OVER (…)`; `shift` uses the **current row order** of the frame, so you must sort first.

#### pandas

```python
w = (orders.sort_values(["customer", "order_date", "order_id"])
       .assign(prev_amount=lambda d: d.groupby("customer")["amount"].shift(1),
               change=lambda d: d["amount"] - d["prev_amount"],
               days_since=lambda d: d.groupby("customer")["order_date"].diff().dt.days,
               row_number=lambda d: d.groupby("customer").cumcount() + 1))
print(w.drop(columns="order_date"))

r = orders.assign(
    row_number=orders["amount"].rank(method="first", ascending=False).astype(int),
    rank=orders["amount"].rank(method="min", ascending=False).astype(int),
    dense_rank=orders["amount"].rank(method="dense", ascending=False).astype(int))
print(r[["order_id", "amount", "row_number", "rank", "dense_rank"]].sort_values("row_number"))
```

Output:

```text
   order_id customer  amount  prev_amount  change  days_since  row_number
5         6      Ana      40          NaN     NaN         NaN           1
2         3      Leo      40          NaN     NaN         NaN           1
4         5      Leo      60         40.0    20.0         5.0           2
0         1     Maya      25          NaN     NaN         NaN           1
1         2     Maya      40         25.0    15.0         2.0           2
3         4     Maya      15         40.0   -25.0         4.0           3
   order_id  amount  row_number  rank  dense_rank
4         5      60           1     1           1
1         2      40           2     2           2
2         3      40           3     2           2
5         6      40           4     2           2
0         1      25           5     5           3
3         4      15           6     6           4
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    SELECT order_id, customer, amount,
           LAG(amount) OVER w                AS prev_amount,
           amount - LAG(amount) OVER w       AS change,
           order_date - LAG(order_date) OVER w AS days_since,
           ROW_NUMBER() OVER w               AS row_number
    FROM orders
    WINDOW w AS (PARTITION BY customer ORDER BY order_date, order_id)
    ORDER BY customer, order_date, order_id"""))
print(duckdb.sql("""
    SELECT order_id, amount,
           ROW_NUMBER() OVER (ORDER BY amount DESC, order_id) AS row_number,
           RANK()       OVER (ORDER BY amount DESC) AS rank,
           DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rank
    FROM orders ORDER BY row_number""").fetchall())
```

Output:

```text
┌──────────┬──────────┬────────┬─────────────┬────────┬────────────┬────────────┐
│ order_id │ customer │ amount │ prev_amount │ change │ days_since │ row_number │
│  int64   │ varchar  │ int64  │    int64    │ int64  │  interval  │   int64    │
├──────────┼──────────┼────────┼─────────────┼────────┼────────────┼────────────┤
│        6 │ Ana      │     40 │        NULL │   NULL │ NULL       │          1 │
│        3 │ Leo      │     40 │        NULL │   NULL │ NULL       │          1 │
│        5 │ Leo      │     60 │          40 │     20 │ 5 days     │          2 │
│        1 │ Maya     │     25 │        NULL │   NULL │ NULL       │          1 │
│        2 │ Maya     │     40 │          25 │     15 │ 2 days     │          2 │
│        4 │ Maya     │     15 │          40 │    -25 │ 4 days     │          3 │
└──────────┴──────────┴────────┴─────────────┴────────┴────────────┴────────────┘

[(5, 60, 1, 1, 1), (2, 40, 2, 2, 2), (3, 40, 3, 2, 2), (6, 40, 4, 2, 2), (1, 25, 5, 5, 3), (4, 15, 6, 6, 4)]
```

| SQL | pandas | Note |
|---|---|---|
| `LAG(x) OVER (PARTITION BY k ORDER BY t)` | `df.sort_values([k, t]).groupby(k)[x].shift(1)` | sort first; first row per group is missing |
| `LEAD(x, 2)` | `.shift(-2)` |  |
| `ROW_NUMBER()` | `groupby(k).cumcount() + 1` or `rank(method="first")` | `"first"` breaks ties by row order |
| `RANK()` / `DENSE_RANK()` | `rank(method="min")` / `rank(method="dense")` | returns floats; cast to `int` |
| `x - LAG(x)` | `groupby(k)[x].diff()` | `pct_change()` for growth |

> **On the job:** “Change since the previous order”, “days between purchases” and “rank products within category” are everyday feature-engineering and reporting steps. When a pandas result differs from SQL, the cause is almost always a missing sort or a missing tie-breaker.

> **The main idea:** sort by partition key, time and a tie-breaker, then use `groupby(k).shift`, `diff`, `cumcount` and `rank(method=…)`. `first`, `min` and `dense` map to ROW_NUMBER, RANK and DENSE_RANK.

*Read more:* [DataFrameGroupBy.shift](https://pandas.pydata.org/docs/reference/api/pandas.api.typing.DataFrameGroupBy.shift.html), [Series.rank](https://pandas.pydata.org/docs/reference/api/pandas.Series.rank.html), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-26"></a>
## 26. Running totals and rolling windows

*SQL side by side · cumsum, rolling by rows, rolling by time, missing days*

`cumsum()` is a running total (`SUM(x) OVER (ORDER BY t ROWS UNBOUNDED PRECEDING)`). `rolling(n)` is a window of the last *n rows* (`ROWS BETWEEN n-1 PRECEDING AND CURRENT ROW`). `rolling("3D")` on a datetime index is a window of the last 3 *days* of timestamps (`RANGE` with an interval). As in the SQL deck, aggregate to one row per day first and decide what a missing day means.

```python
daily = orders.groupby("order_date")["amount"].sum()          # one row per day WITH orders
print(pd.DataFrame({
    "revenue": daily,
    "running_total": daily.cumsum(),
    "avg_last_2_rows": daily.rolling(2, min_periods=1).mean(),
    "avg_last_3_days_present": daily.rolling("3D").mean(),
}))

calendar = daily.asfreq("D", fill_value=0)                       # add the missing days as 0
print(calendar.rolling(3, min_periods=1).mean().round(2).tail(4))
```

Output:

```text
            revenue  running_total  avg_last_2_rows  avg_last_3_days_present
order_date                                                                  
2026-01-03       25             25             25.0                     25.0
2026-01-05       80            105             52.5                     52.5
2026-01-09       15            120             47.5                     15.0
2026-01-10      100            220             57.5                     57.5
order_date
2026-01-07    26.67
2026-01-08     0.00
2026-01-09     5.00
2026-01-10    38.33
Freq: D, Name: amount, dtype: float64
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    WITH daily AS (SELECT order_date, SUM(amount) AS revenue FROM orders GROUP BY order_date)
    SELECT order_date, revenue,
           SUM(revenue) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) AS running_total,
           AVG(revenue) OVER (ORDER BY order_date
                              RANGE BETWEEN INTERVAL 2 DAYS PRECEDING AND CURRENT ROW)
                                                                    AS avg_last_3_days_present
    FROM daily ORDER BY order_date""").df())
```

Output:

```text
  order_date  revenue  running_total  avg_last_3_days_present
0 2026-01-03     25.0           25.0                     25.0
1 2026-01-05     80.0          105.0                     52.5
2 2026-01-09     15.0          120.0                     15.0
3 2026-01-10    100.0          220.0                     57.5
```

#### Three questions to ask

- **Rows or time?** `rolling(3)` is 3 rows, whatever dates they have. `rolling("3D")` is a time span.
- **Missing days?** A time window averages the rows that exist. Jan 10’s “3-day” average is 57.5 over 2 days with orders, but 38.33 over 3 calendar days. Fill the calendar (`asfreq`, `resample`, or a date dimension join) when the metric is “per calendar day”.
- **Partial windows?** `min_periods` sets how many values are needed; the default for a row window is the full window, giving NaN at the start.

> **On the job:** 7-day rolling active users and 28-day rolling revenue are standard dashboard metrics. Getting the missing-day handling wrong inflates them on quiet days, and it is a favourite interview follow-up.

> **The main idea:** `cumsum` for running totals, `rolling(n)` for row windows, `rolling("nD")` for time windows, and fill the calendar first when a missing day should count as zero. Use `groupby(k).rolling(…)` or `groupby(k).cumsum()` per partition.

*Read more:* [Windowing operations](https://pandas.pydata.org/docs/user_guide/window.html), [Series.asfreq](https://pandas.pydata.org/docs/reference/api/pandas.Series.asfreq.html), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-27"></a>
## 27. Pivot and melt: long to wide and back

*SQL side by side · pivot_table, pivot, crosstab, melt*

**Long** data has one row per observation (customer, size, amount). **Wide** data spreads one column’s values across new columns (one column per size). `pivot_table` goes long → wide and aggregates duplicates; `pivot` does the same without aggregating and fails on duplicates; `melt` goes wide → long. Most pipeline storage is long; wide is for reports and some ML features.

#### pandas

```python
sized = orders.assign(size=np.where(orders["amount"] >= 40, "big", "small"))
wide = sized.pivot_table(index="customer", columns="size", values="amount",
                         aggfunc="sum", fill_value=0)
print(wide)

long = (wide.reset_index()
        .melt(id_vars="customer", var_name="size", value_name="amount")
        .sort_values(["customer", "size"], ignore_index=True))
print(long)
print(pd.crosstab(sized["customer"], sized["size"]))       # counts
```

Output:

```text
size      big  small
customer            
Ana        40      0
Leo       100      0
Maya       40     40
  customer   size  amount
0      Ana    big      40
1      Ana  small       0
2      Leo    big     100
3      Leo  small       0
4     Maya    big      40
5     Maya  small      40
size      big  small
customer            
Ana         1      0
Leo         2      0
Maya        1      2
```

#### SQL (DuckDB)

```python
print(duckdb.sql("""
    PIVOT sized ON size USING SUM(amount)::BIGINT GROUP BY customer
    ORDER BY customer"""))
print(duckdb.sql("""
    UNPIVOT (PIVOT sized ON size USING SUM(amount)::BIGINT GROUP BY customer)
    ON big, small INTO NAME size VALUE amount
    ORDER BY customer, size""").fetchall())
```

Output:

```text
┌──────────┬───────┬───────┐
│ customer │  big  │ small │
│ varchar  │ int64 │ int64 │
├──────────┼───────┼───────┤
│ Ana      │    40 │  NULL │
│ Leo      │   100 │  NULL │
│ Maya     │    40 │    40 │
└──────────┴───────┴───────┘

[('Ana', 'big', 40), ('Leo', 'big', 100), ('Maya', 'big', 40), ('Maya', 'small', 40)]
```

Differences: DuckDB leaves `NULL` where a combination doesn’t exist (pandas used `fill_value=0`), and `UNPIVOT` drops NULL cells by default, so Ana and Leo have no “small” row. Standard SQL without `PIVOT` writes one `SUM(CASE WHEN size = 'big' THEN amount END)` per output column.

> **On the job:** Finance-style reports (“months across, accounts down”) are pivots made at the very end. In the other direction, spreadsheets and some APIs deliver wide data (one column per month), and the first cleaning step is `melt` into a long table you can store, join and aggregate.

> **The main idea:** keep data long; pivot to wide only for presentation. `pivot_table(index, columns, values, aggfunc, fill_value)` and `melt(id_vars, var_name, value_name)` are inverses, apart from missing combinations.

*Read more:* [Reshaping and pivot tables](https://pandas.pydata.org/docs/user_guide/reshaping.html), [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [DuckDB: UNPIVOT](https://duckdb.org/docs/stable/sql/statements/unpivot).

---

<a id="slide-28"></a>
## 28. SQL vs pandas: the differences that bite

*SQL side by side · NULL joins, grouping, ordering, indexes, and more*

Everything in Part B on one page. Each row is a place where a correct SQL query, translated literally, gives a different answer in pandas.

| Topic | SQL | pandas default | Make pandas match SQL | Lesson |
|---|---|---|---|---|
| NULL join keys | never match | missing keys match each other | `dropna(subset=keys)` before `merge` | 20 |
| NULL group keys | one NULL group | group dropped | `groupby(…, dropna=False)` | 17 |
| Group order | undefined | sorted by key | `sort=False`, or sort explicitly in both | 17 |
| Row order | undefined without ORDER BY | kept from input | sort by a unique key before comparing | 15 |
| Window order | `ORDER BY` inside `OVER` | current row order | `sort_values` before `shift`/`cumsum` | 25 |
| Index | no row labels | index aligns operations | keep a RangeIndex; `reset_index()`; `.to_numpy()` | 6 |
| `x <> v` with NULL x | row dropped | row kept (`NaN != v` is True) | add `& s.notna()` | 8, 10 |
| `SUM` of only NULLs | NULL | 0 | `sum(min_count=1)` | 10 |
| `NOT IN` with a NULL | returns nothing | `~isin` unaffected | use NOT EXISTS in SQL | 22 |
| Rounding .5 | half away from zero | half to even | `np.floor(x * 10 + 0.5) / 10` for positives, or `Decimal` | 18 |
| Integer column + missing | still integer | becomes float64 | nullable `Int64` | 9, 19 |
| `UNION ALL` | by position | by name; missing columns filled | check columns; DuckDB `BY NAME` | 23 |

<details><summary>Interview check: “Your pandas port of a SQL report shows higher revenue than the SQL version. Name three likely causes.”</summary>

(1) Fan-out from a merge with a duplicated dimension key (no `validate=`). (2) Missing join keys matching each other in `merge`. (3) Different filtering of missing values, e.g. `!=` keeping NaN rows. Then explain how you would find it: compare row counts after each step, and use an outer join with `indicator=True` to diff the outputs.

</details>

<details><summary>Interview check: “Revenue by region is lower in pandas than in SQL.”</summary>

The `groupby` dropped rows with a missing region (`dropna=True`). SQL kept them in a NULL group. Use `dropna=False` or fill the key, and reconcile group sums to the total.

</details>

> **The main idea:** NULL keys, NULL groups, order and the index are the four big differences. Know the one-argument fix for each, and verify ports by comparing row counts and totals.

*Read more:* [pandas: comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html).

---

<a id="slide-29"></a>
## 29. CSV I/O: declare types instead of letting pandas guess

*I/O and memory · read_csv, dtype, parse_dates, na_values, to_csv*

CSV files carry no types: every value is text, and `read_csv` **infers** (guesses) a dtype per column from the values. Inference loses leading zeros, reads money with thousands separators as text, and leaves dates as strings. Declare what you expect.

```csv
# data/orders_export.csv
order_id,customer,order_date,amount,status
0001,Maya,2026-01-03,25.00,paid
0002,Maya,2026-01-05,40.00,paid
0003,Leo,2026-01-05,"1,040.00",-
0004,Maya,2026-01-09,15.00,refunded
0005,Leo,2026-01-10,60.00,
0006,Ana,2026-01-10,40.00,paid
```

#### Default: inferred

```python
raw = pd.read_csv("data/orders_export.csv")
print(raw)
print(raw.dtypes.to_dict())
```

Output:

```text
   order_id customer  order_date    amount    status
0         1     Maya  2026-01-03     25.00      paid
1         2     Maya  2026-01-05     40.00      paid
2         3      Leo  2026-01-05  1,040.00         -
3         4     Maya  2026-01-09     15.00  refunded
4         5      Leo  2026-01-10     60.00       NaN
5         6      Ana  2026-01-10     40.00      paid
{'order_id': dtype('int64'), 'customer': <StringDtype(na_value=nan)>, 'order_date': <StringDtype(na_value=nan)>, 'amount': <StringDtype(na_value=nan)>, 'status': <StringDtype(na_value=nan)>}
```

#### Declared

```python
typed = pd.read_csv(
    "data/orders_export.csv",
    dtype={"order_id": "str", "customer": "str", "status": "str"},
    thousands=",",                         # "1,040.00" -> 1040.0
    na_values=["-"],                       # extra strings that mean missing
    parse_dates=["order_date"], date_format="%Y-%m-%d",
    encoding="utf-8",                      # "utf-8-sig" for Excel exports (files deck)
)
print(typed)
print(typed.dtypes.to_dict())
```

Output:

```text
  order_id customer order_date  amount    status
0     0001     Maya 2026-01-03    25.0      paid
1     0002     Maya 2026-01-05    40.0      paid
2     0003      Leo 2026-01-05  1040.0       NaN
3     0004     Maya 2026-01-09    15.0  refunded
4     0005      Leo 2026-01-10    60.0       NaN
5     0006      Ana 2026-01-10    40.0      paid
{'order_id': <StringDtype(na_value=nan)>, 'customer': <StringDtype(na_value=nan)>, 'order_date': dtype('<M8[us]'), 'amount': dtype('float64'), 'status': <StringDtype(na_value=nan)>}
```

#### Writing

```python
typed.to_csv("data/orders_clean.csv", index=False, date_format="%Y-%m-%d")
print(open("data/orders_clean.csv", encoding="utf-8").read().splitlines()[:3])
```

Output:

```text
['order_id,customer,order_date,amount,status', '0001,Maya,2026-01-03,25.0,paid', '0002,Maya,2026-01-05,40.0,paid']
```

Always pass `index=False`, or the index becomes an unnamed first column. Other useful options: `usecols=[…]` to read fewer columns, `engine="pyarrow"` for a faster multithreaded parser, `dtype_backend="pyarrow"` for Arrow dtypes, `chunksize=` to stream (lesson 32).

#### Know the source

- Empty field → `NaN` by default (order 5’s status); a source-specific marker such as `-` needs `na_values` (order 3). Strings like `"NULL"`, `"NA"`, `"N/A"` are also treated as missing by default; `keep_default_na=False` turns that off when “NA” is a real value (Namibia’s country code).
- IDs: always `str`. Money: parse as float for analysis or keep text and convert to `Decimal` at the boundary (files-and-streams deck) when exactness matters.
- Timestamps with offsets: read as text, then `pd.to_datetime(…, utc=True, format="ISO8601")` (lesson 11).

> **On the job:** A CSV landing job should fail loudly when the file doesn’t match the agreed schema. Declaring dtypes is the cheapest schema check there is: a non-numeric amount raises at read time instead of turning the column into text and breaking a sum three steps later.

> **The main idea:** CSV has no types. Pass `dtype`, `parse_dates` with `date_format`, `na_values`, `thousands` and `encoding`; write with `index=False`.

*Read more:* [pandas.read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html), [IO tools (text, CSV, Parquet, …)](https://pandas.pydata.org/docs/user_guide/io.html).

---

<a id="slide-30"></a>
## 30. Parquet I/O: typed, compressed, columnar files

*I/O and memory · to_parquet, read_parquet, columns=, filters=, partitions*

**Parquet** is a columnar file format: values are stored column by column, compressed, with the schema (names and types) in the file footer. A file is split into **row groups** (blocks of rows), and each stores min/max statistics per column. Readers can therefore skip columns they don’t need (**column pruning**, also called projection pushdown) and skip row groups whose statistics rule out a filter (**predicate pushdown**).

```python
orders.to_parquet("data/orders.parquet", index=False)          # pyarrow engine by default
back = pd.read_parquet("data/orders.parquet")
print(back.dtypes.to_dict())                                     # types survive the round trip

few = pd.read_parquet("data/orders.parquet", columns=["order_id", "amount"],
                      filters=[("customer", "==", "Maya")])    # prune columns, push down a filter
print(few)

import pyarrow.parquet as pq
meta = pq.read_metadata("data/orders.parquet")
print(meta.num_rows, "rows,", meta.num_row_groups, "row group(s),", meta.num_columns, "columns")
print(pq.read_schema("data/orders.parquet"))
```

Output:

```text
{'order_id': dtype('int64'), 'customer': <StringDtype(na_value=nan)>, 'order_date': dtype('<M8[us]'), 'amount': dtype('int64')}
   order_id  amount
0         1      25
1         2      40
2         4      15
6 rows, 1 row group(s), 4 columns
order_id: int64
customer: large_string
order_date: timestamp[us]
amount: int64
-- schema metadata --
pandas: '{"index_columns": [], "column_indexes": [], "columns": [{"name":' + 556
```

#### Partitioned datasets (added)

```python
from pathlib import Path
(orders.assign(order_week=orders["order_date"].dt.strftime("%G-W%V"))
       .to_parquet("data/orders_by_week", partition_cols=["order_week"], index=False))
print(sorted(p.relative_to("data").as_posix() for p in Path("data/orders_by_week").rglob("*")
             if p.is_dir()))
week2 = pd.read_parquet("data/orders_by_week", filters=[("order_week", "==", "2026-W02")])
print(week2[["order_id", "order_week"]])
```

Output:

```text
['orders_by_week/order_week=2026-W01', 'orders_by_week/order_week=2026-W02']
   order_id order_week
0         2   2026-W02
1         3   2026-W02
2         4   2026-W02
3         5   2026-W02
4         6   2026-W02
```

`partition_cols` writes one folder per value (`order_week=2026-W02/`), called **Hive-style partitioning**. A filter on the partition column skips whole folders. Partition by a low-cardinality column you filter on often (date, region); thousands of tiny files are slower than one large file.

#### CSV vs Parquet

|  | CSV | Parquet |
|---|---|---|
| types | none; inferred on read | stored in the file |
| size | large | compressed (lesson 32: about 3.7× smaller here) |
| read a few columns | parse every byte | read only those columns |
| human-readable | yes | no (use a tool) |
| append a row | easy | write a new file |

> **On the job:** Parquet is the default storage format of lakehouses: Delta Lake and Apache Iceberg tables are folders of Parquet files plus a transaction log. Writing clean Parquet with correct types from pandas is how many small pipelines publish to the silver layer.

> **The main idea:** prefer Parquet for anything a program reads: types survive, files are small, and readers can prune columns and skip row groups. Read with `columns=` and `filters=`; partition by a column you filter on.

*Read more:* [pandas: Parquet](https://pandas.pydata.org/docs/user_guide/io.html#parquet), [pandas.read_parquet](https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html), [PyArrow: reading and writing Parquet](https://arrow.apache.org/docs/python/parquet.html), [Apache Parquet documentation](https://parquet.apache.org/docs/).

---

<a id="slide-31"></a>
## 31. Measuring memory and shrinking DataFrames

*I/O and memory · memory_usage(deep=True), str vs object, category, downcasting*

`memory_usage(deep=True)` reports bytes per column, including the text itself (without `deep=True`, text columns report only their pointers). We build one million synthetic events with a fixed random seed and measure the same data in different dtypes.

```python
import numpy as np
import pandas as pd

rng = np.random.default_rng(7)                       # fixed seed: same data every run
n = 1_000_000
events = pd.DataFrame({
    "event_id": pd.Series(np.arange(n)).map("e{:07d}".format),
    "user_id": "u" + pd.Series(rng.integers(0, 50_000, n)).astype(str),
    "event_type": rng.choice(["page_view", "add_to_cart", "purchase", "refund"], n,
                             p=[0.70, 0.15, 0.12, 0.03]),
    "ts": pd.Timestamp("2026-03-01", tz="UTC")
          + pd.to_timedelta(rng.integers(0, 7 * 86_400, n), unit="s"),
})
events["amount"] = np.where(events["event_type"].isin(["purchase", "refund"]),
                            rng.integers(500, 20_000, n) / 100, np.nan)

def mib(df):
    return round(df.memory_usage(deep=True).sum() / 2**20, 1)

as_object = events.astype({"event_id": object, "user_id": object, "event_type": object})  # pandas 2.x default
slim = events.astype({"event_type": "category", "user_id": "category"}).assign(
    amount=lambda d: d["amount"].astype("float32"))

for name, df in [("object text (pandas 2.x style)", as_object),
                 ("str text (pandas 3.0 default)", events),
                 ("+ category and float32", slim)]:
    print(f"{name:<32} {mib(df):>6} MiB")
print((slim.memory_usage(deep=True) / 2**20).round(1).to_dict())
```

Output (memory measured on the build machine (deterministic for this data)):

```text
object text (pandas 2.x style)    177.3 MiB
str text (pandas 3.0 default)      60.0 MiB
+ category and float32             32.1 MiB
{'Index': 0.0, 'event_id': 15.3, 'user_id': 4.5, 'event_type': 1.0, 'ts': 7.6, 'amount': 3.8}
```

#### Levers, biggest first

| Lever | How | Caveat |
|---|---|---|
| read fewer columns | `usecols=`, `columns=` | none: the best saving |
| text → `str` (Arrow) | default in pandas 3; `dtype="str"` or `dtype_backend="pyarrow"` in 2.x | much smaller than `object` |
| repeated labels → `category` | `astype("category")` | only when distinct values are few relative to rows |
| smaller numbers | `pd.to_numeric(s, downcast="integer")`, `float32` | float32 has ~7 significant digits: not for money totals |
| fewer rows | filter early; aggregate early | push filters into the reader (Parquet `filters=`) |

#### How much RAM do you need?

A DataFrame needs its own size in RAM, and operations make temporary copies: a merge or sort can need several times the input size. A rule of thumb from pandas’ creator is to have 5–10× the data size available. If the data is close to your RAM, change tools (lesson 47) rather than tuning dtypes forever.

> **On the job:** “The notebook crashed with MemoryError” is usually solved by reading only needed columns, using category for low-cardinality text, and aggregating before joining. Report `memory_usage(deep=True).sum()` in logs for large steps so you see growth before it fails.

> **The main idea:** measure with `memory_usage(deep=True)`. Read only the columns you need, keep text as `str`, use `category` for repeated labels, and be careful with float32 for money.

*Read more:* [DataFrame.memory_usage](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.memory_usage.html), [Scaling to large datasets](https://pandas.pydata.org/docs/user_guide/scale.html), [Categorical data](https://pandas.pydata.org/docs/user_guide/categorical.html), [W. McKinney: Apache Arrow and the “10 things I hate about pandas”](https://wesmckinney.com/blog/apache-arrow-pandas-internals/).

---

<a id="slide-32"></a>
## 32. When data gets big: chunks, column pruning, and streaming

*I/O and memory · read_csv(chunksize=), Parquet projection, generator streaming*

pandas loads the whole input into memory. For files larger than that, three techniques help: **chunked reading** (process *n* rows at a time, combine partial results, the DataFrame version of the files-and-streams deck’s bounded batches), **column pruning** (Parquet reads only the columns you ask for), and handing the work to an engine that streams (DuckDB, Polars lazy; lessons 36 and 47).

```python
import os
events.to_csv("data/events_big.csv", index=False)
events.to_parquet("data/events_big.parquet", index=False)
for f in ["data/events_big.csv", "data/events_big.parquet"]:
    print(f"{f:<26} {os.path.getsize(f) / 2**20:6.1f} MiB on disk")

# Chunked: revenue per event type, 200,000 rows at a time
partials, biggest_chunk = [], 0
for chunk in pd.read_csv("data/events_big.csv", usecols=["event_type", "amount"], chunksize=200_000):
    biggest_chunk = max(biggest_chunk, chunk.memory_usage(deep=True).sum())
    partials.append(chunk.groupby("event_type")["amount"].agg(["sum", "count"]))
chunked = pd.concat(partials).groupby(level=0).sum()          # combine partial sums and counts
print(chunked.round(2))
print("largest chunk held in memory:", round(biggest_chunk / 2**20, 1), "MiB")

full = events.groupby("event_type")["amount"].agg(["sum", "count"])
assert np.allclose(full["sum"], chunked["sum"]) and (full["count"] == chunked["count"]).all()

two_cols = pd.read_parquet("data/events_big.parquet", columns=["event_type", "amount"])
print("Parquet, 2 of 5 columns:", round(two_cols.memory_usage(deep=True).sum() / 2**20, 1), "MiB in memory")
```

Output (sizes measured on the build machine):

```text
data/events_big.csv          52.1 MiB on disk
data/events_big.parquet      14.2 MiB on disk
                     sum   count
event_type                      
add_to_cart         0.00       0
page_view           0.00       0
purchase     12288005.56  119785
refund        3069766.11   29837
largest chunk held in memory: 4.8 MiB
Parquet, 2 of 5 columns: 23.9 MiB in memory
```

#### What combines across chunks

| Metric | Combine partials by |
|---|---|
| count, sum, min, max | sum / min / max of the partials |
| mean | sum of sums ÷ sum of counts (never average the averages) |
| distinct count | union of per-chunk sets (memory grows with distinct values), or an approximate sketch |
| median, percentiles, global sort, dedupe | not by simple combination: use DuckDB/Polars or a two-pass approach |

#### Compared with generators

The files-and-streams deck streamed one record at a time with generators: constant memory, but Python-speed per record. Chunked pandas keeps memory bounded by the chunk size and runs each chunk vectorized. Both share the same limit: only **decomposable** aggregations (ones you can compute per chunk and combine) work in a single pass.

> **On the job:** Before reaching for chunks, ask whether the job really needs every row in Python. Pushing the aggregation into DuckDB over the Parquet files (one SQL statement) or a Polars lazy scan is usually simpler and faster. Chunked pandas is the fallback when you must run Python logic per row block, e.g. calling a library that only accepts DataFrames.

> **The main idea:** for data near or above memory: read fewer columns (Parquet), process in chunks with combinable aggregates, or let a streaming engine do the work. Never average per-chunk averages.

*Read more:* [Scaling to large datasets](https://pandas.pydata.org/docs/user_guide/scale.html), [pandas.read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html), [PyArrow datasets](https://arrow.apache.org/docs/python/dataset.html).

---

<a id="slide-33"></a>
## 33. Polars: DataFrames built from expressions

*Polars bridge · no index, strict types, pl.col expressions*

**Polars** is a DataFrame library written in Rust, built on Apache Arrow memory. It has **no index**: rows are identified only by their columns, as in SQL. You describe work with **expressions**: objects such as `pl.col("amount") * 1.08` that say *what* to compute on columns. An expression does nothing alone; a **context** (`select`, `with_columns`, `filter`, `group_by().agg`) evaluates it. Polars can run independent expressions in parallel on all CPU cores.

```python
import polars as pl

po = pl.from_pandas(orders)            # or pl.DataFrame({...}) / pl.read_parquet(...)
print(po.schema)

big = (
    po.filter(pl.col("amount") >= 40)                                    # WHERE
      .with_columns(                                                     # add columns
          (pl.col("amount") * 1.08).round(2).alias("amount_with_tax"),
          pl.col("order_date").dt.strftime("%Y-%m").alias("order_month"))
      .select("order_id", "customer", "order_month", "amount", "amount_with_tax")   # SELECT
      .sort(["amount", "order_id"], descending=[True, False])            # ORDER BY
)
print(big)

print(po.group_by("customer")
        .agg(pl.len().alias("rows"),
             pl.col("amount").sum().alias("revenue"),
             pl.col("order_date").min().alias("first_order"))
        .sort("customer"))
```

Output:

```text
Schema({'order_id': Int64, 'customer': String, 'order_date': Datetime(time_unit='us', time_zone=None), 'amount': Int64})
shape: (4, 5)
┌──────────┬──────────┬─────────────┬────────┬─────────────────┐
│ order_id ┆ customer ┆ order_month ┆ amount ┆ amount_with_tax │
│ ---      ┆ ---      ┆ ---         ┆ ---    ┆ ---             │
│ i64      ┆ str      ┆ str         ┆ i64    ┆ f64             │
╞══════════╪══════════╪═════════════╪════════╪═════════════════╡
│ 5        ┆ Leo      ┆ 2026-01     ┆ 60     ┆ 64.8            │
│ 2        ┆ Maya     ┆ 2026-01     ┆ 40     ┆ 43.2            │
│ 3        ┆ Leo      ┆ 2026-01     ┆ 40     ┆ 43.2            │
│ 6        ┆ Ana      ┆ 2026-01     ┆ 40     ┆ 43.2            │
└──────────┴──────────┴─────────────┴────────┴─────────────────┘
shape: (3, 4)
┌──────────┬──────┬─────────┬─────────────────────┐
│ customer ┆ rows ┆ revenue ┆ first_order         │
│ ---      ┆ ---  ┆ ---     ┆ ---                 │
│ str      ┆ u32  ┆ i64     ┆ datetime[μs]        │
╞══════════╪══════╪═════════╪═════════════════════╡
│ Ana      ┆ 1    ┆ 40      ┆ 2026-01-10 00:00:00 │
│ Leo      ┆ 2    ┆ 100     ┆ 2026-01-05 00:00:00 │
│ Maya     ┆ 3    ┆ 80      ┆ 2026-01-03 00:00:00 │
└──────────┴──────┴─────────┴─────────────────────┘
```

#### pandas → Polars

| pandas | Polars |
|---|---|
| `df["a"]`, `df[["a", "b"]]` | `df.select("a", "b")`, `df.get_column("a")` |
| `df[mask]` | `df.filter(expr)` |
| `df.assign(x=…)` | `df.with_columns(expr.alias("x"))` or `with_columns(x=expr)` |
| `sort_values` | `sort` |
| `groupby().agg(n=("c", "sum"))` | `group_by().agg(pl.col("c").sum().alias("n"))` |
| `size()` / `count()` | `pl.len()` / `pl.col(c).count()` (non-null) |
| `merge` | `join` |
| `drop_duplicates` | `unique(maintain_order=True)` |

#### What feels different

- No index, so no alignment surprises and no `reset_index`.
- Types are strict: an integer column with a missing value stays integer (`null`), and a bad cast raises instead of producing `object`.
- Every method returns a new DataFrame; there is no in-place assignment and no Copy-on-Write puzzle.
- `group_by` output order is not guaranteed (like SQL): sort it, or pass `maintain_order=True`.

> **On the job:** Teams adopt Polars for single-machine jobs that outgrew pandas: it is often several times faster and uses less memory on the same hardware. The expression style also reads closer to SQL, which helps code review in SQL-heavy teams.

> **The main idea:** Polars = SQL-like expressions (`pl.col`) evaluated in contexts (`select`, `with_columns`, `filter`, `group_by().agg`), with no index and strict types.

*Read more:* [Polars: expressions and contexts](https://docs.pola.rs/user-guide/concepts/expressions-and-contexts/), [Polars: coming from pandas](https://docs.pola.rs/user-guide/migration/pandas/).

---

<a id="slide-34"></a>
## 34. Polars expressions: CASE, windows, and namespaces

*Polars bridge · when/then, over(), shift, rank, rolling, .str and .dt*

Window functions are expressions with `.over(partition)`: the aggregate is computed per group and broadcast back to every row, like SQL `OVER (PARTITION BY …)` and pandas `transform`. `over(…, order_by=…)` sets the order within the partition for `shift`, `cum_sum` and similar, so there is no need to sort the frame first.

```python
w = po.with_columns(
    size=pl.when(pl.col("amount") >= 60).then(pl.lit("large"))          # CASE WHEN
           .when(pl.col("amount") >= 40).then(pl.lit("medium"))
           .otherwise(pl.lit("small")),
    customer_total=pl.col("amount").sum().over("customer"),                # SUM() OVER (PARTITION BY)
    prev_amount=pl.col("amount").shift(1).over("customer", order_by=["order_date", "order_id"]),  # LAG
    running=pl.col("amount").cum_sum().over("customer", order_by=["order_date", "order_id"]),
    dense_rank=pl.col("amount").rank("dense", descending=True),           # DENSE_RANK()
).drop("order_date")
print(w)
```

Output:

```text
shape: (6, 8)
┌──────────┬──────────┬────────┬────────┬────────────────┬─────────────┬─────────┬────────────┐
│ order_id ┆ customer ┆ amount ┆ size   ┆ customer_total ┆ prev_amount ┆ running ┆ dense_rank │
│ ---      ┆ ---      ┆ ---    ┆ ---    ┆ ---            ┆ ---         ┆ ---     ┆ ---        │
│ i64      ┆ str      ┆ i64    ┆ str    ┆ i64            ┆ i64         ┆ i64     ┆ u32        │
╞══════════╪══════════╪════════╪════════╪════════════════╪═════════════╪═════════╪════════════╡
│ 1        ┆ Maya     ┆ 25     ┆ small  ┆ 80             ┆ null        ┆ 25      ┆ 3          │
│ 2        ┆ Maya     ┆ 40     ┆ medium ┆ 80             ┆ 25          ┆ 65      ┆ 2          │
│ 3        ┆ Leo      ┆ 40     ┆ medium ┆ 100            ┆ null        ┆ 40      ┆ 2          │
│ 4        ┆ Maya     ┆ 15     ┆ small  ┆ 80             ┆ 40          ┆ 80      ┆ 4          │
│ 5        ┆ Leo      ┆ 60     ┆ large  ┆ 100            ┆ 40          ┆ 100     ┆ 1          │
│ 6        ┆ Ana      ┆ 40     ┆ medium ┆ 40             ┆ null        ┆ 40      ┆ 2          │
└──────────┴──────────┴────────┴────────┴────────────────┴─────────────┴─────────┴────────────┘
```

```python
print(po.select(pl.col(pl.Int64).max()))                 # expression expansion: every Int64 column
print(po.select(pl.col("customer").str.to_uppercase().unique().sort().implode(), pl.len()))
po.select(pl.col("customer").unique(), pl.col("amount"))  # 3 values next to 6 values
```

Output:

```text
shape: (1, 2)
┌──────────┬────────┐
│ order_id ┆ amount │
│ ---      ┆ ---    │
│ i64      ┆ i64    │
╞══════════╪════════╡
│ 6        ┆ 60     │
└──────────┴────────┘
shape: (1, 2)
┌────────────────────────┬─────┐
│ customer               ┆ len │
│ ---                    ┆ --- │
│ list[str]              ┆ u32 │
╞════════════════════════╪═════╡
│ ["ANA", "LEO", "MAYA"] ┆ 6   │
└────────────────────────┴─────┘
ShapeError: Series length 3 doesn't match the DataFrame height of 6
```

#### Reading the outputs

The last `select` fails with `ShapeError`: three distinct customers cannot sit next to six amounts. pandas would align the two by index and fill the gaps with NaN; Polars refuses. A length-1 result (an aggregate such as `max()`, `pl.len()`, or a list built by `implode()`) is fine, because it is broadcast. Strictness like this turns silent bugs into errors.

#### Namespaces and selectors

`.str`, `.dt`, `.list` and `.struct` hold type-specific expressions, as in pandas. `pl.col(pl.Int64)` or `polars.selectors` (`cs.numeric()`, `cs.starts_with("amt_")`) select columns by type or name pattern.

> **On the job:** Expressions are reusable values: define `revenue = pl.col("amount").filter(pl.col("event_type") == "purchase").sum()` once and use it in several `agg` calls or modules. Metric definitions then live in one place, which keeps dashboards consistent.

> **The main idea:** `pl.when().then().otherwise()` is CASE; `expr.over(k, order_by=…)` is a window function; `shift`, `cum_sum`, `rank`, `rolling_*` are expressions. Polars rejects columns of different lengths instead of aligning them.

*Read more:* [Polars: expressions and contexts](https://docs.pola.rs/user-guide/concepts/expressions-and-contexts/), [Polars: window functions](https://docs.pola.rs/user-guide/expressions/window-functions/), [Expr.over](https://docs.pola.rs/api/python/stable/reference/expressions/api/polars.Expr.over.html).

---

<a id="slide-35"></a>
## 35. Polars semantics: nulls, joins, grouping, concat

*Polars bridge · closer to SQL than pandas is*

Polars has one missing marker, **null**, for every type. `NaN` is a separate, ordinary float value (“not a number”, e.g. from 0/0), not a missing value. On the four differences from lesson 28, Polars mostly behaves like SQL.

```python
left_pl, right_pl = pl.from_pandas(left), pl.from_pandas(right)       # frames from lesson 20
print(left_pl.join(right_pl, on="user_id", how="inner"))                   # null keys don't match
print(left_pl.join(right_pl, on="user_id", how="inner", nulls_equal=True).height, "rows with nulls_equal=True")

cust = pl.from_pandas(customers)
print(cust.group_by("city", maintain_order=True).agg(pl.len()))          # null group KEPT

customers_dup_pl = pl.from_pandas(customers_dup)
try:
    po.join(customers_dup_pl, on="customer", how="left", validate="m:1")
except pl.exceptions.ComputeError as e:
    print("ComputeError:", str(e).splitlines()[0])

jan_pl, feb_pl = pl.from_pandas(jan), pl.from_pandas(feb)
print(pl.concat([jan_pl, feb_pl], how="diagonal").sort("order_id"))       # by name, fill nulls
```

Output:

```text
shape: (1, 3)
┌─────────┬───────┬─────────┐
│ user_id ┆ event ┆ country │
│ ---     ┆ ---   ┆ ---     │
│ str     ┆ str   ┆ str     │
╞═════════╪═══════╪═════════╡
│ u1      ┆ view  ┆ DE      │
└─────────┴───────┴─────────┘
3 rows with nulls_equal=True
shape: (3, 2)
┌────────┬─────┐
│ city   ┆ len │
│ ---    ┆ --- │
│ str    ┆ u32 │
╞════════╪═════╡
│ Austin ┆ 2   │
│ Denver ┆ 1   │
│ null   ┆ 1   │
└────────┴─────┘
ComputeError: join keys did not fulfill m:1 validation
shape: (4, 3)
┌──────────┬────────┬─────────┐
│ order_id ┆ amount ┆ channel │
│ ---      ┆ ---    ┆ ---     │
│ i64      ┆ i64    ┆ str     │
╞══════════╪════════╪═════════╡
│ 1        ┆ 25     ┆ null    │
│ 2        ┆ 40     ┆ null    │
│ 4        ┆ 15     ┆ web     │
│ 5        ┆ 60     ┆ app     │
└──────────┴────────┴─────────┘
```

| Behaviour | SQL | pandas | Polars |
|---|---|---|---|
| NULL join keys | never match | match each other | never match (`nulls_equal=True` to match) |
| NULL group key | kept | dropped (`dropna=True`) | kept |
| group output order | undefined | sorted | undefined (`maintain_order=True` or sort) |
| row labels | none | index | none |
| join cardinality check | none built in | `validate="m:1"` | `validate="m:1"` |
| missing marker | NULL | NaN / None / NA / NaT | null (NaN is a value) |
| vertical concat | by position | by name, fill missing | `how="vertical"` strict; `"diagonal"` by name, fill |

> **On the job:** When porting SQL to a DataFrame library, Polars needs fewer “make it behave like SQL” fixes than pandas. When porting pandas code to Polars, the reverse applies: re-check every merge on nullable keys and every groupby on a nullable column.

> **The main idea:** Polars treats nulls like SQL in joins and grouping, has no index, and leaves group order undefined. Use `validate=` on joins and `how="diagonal"` for by-name concat.

*Read more:* [Polars: missing data](https://docs.pola.rs/user-guide/expressions/missing-data/), [Polars: joins](https://docs.pola.rs/user-guide/transformations/joins/), [Polars: concatenation](https://docs.pola.rs/user-guide/transformations/concatenation/), [DataFrame.join](https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.join.html).

---

<a id="slide-36"></a>
## 36. Eager vs lazy: scan, explain, collect

*Polars bridge · let the engine optimise the whole query*

**Eager** execution runs each method immediately (pandas; Polars `DataFrame`). **Lazy** execution records the steps as a **query plan** and runs nothing until you call `collect()` (Polars `LazyFrame`). Seeing the whole query lets the optimiser apply **projection pushdown** (read only needed columns) and **predicate pushdown** (filter while reading), just as a SQL database does. `pl.scan_parquet` / `pl.scan_csv` start a lazy query from files; `pl.read_*` load eagerly.

```python
import polars as pl

lazy = (
    pl.scan_parquet("data/events_big.parquet")             # nothing is read yet
      .filter(pl.col("event_type") == "purchase")
      .group_by(pl.col("ts").dt.date().alias("day"))
      .agg(pl.col("amount").sum().round(2).alias("revenue"),
           pl.col("user_id").n_unique().alias("buyers"))
      .sort("day")
)
print(type(lazy).__name__)
print(lazy.explain())                                      # the optimised plan
daily_pl = lazy.collect()                                  # now it runs
print(daily_pl.head(3))
print(lazy.collect(engine="streaming").equals(daily_pl))   # streaming engine: same result, bounded memory
```

Output:

```text
LazyFrame
SORT BY [col("day")]
  AGGREGATE[maintain_order: false]
    [col("amount").sum().round().alias("revenue"), col("user_id").n_unique().alias("buyers")] BY [col("ts").dt.date().alias("day")]
    FROM
    simple π 3/3 ["ts", "amount", "user_id"]
      Parquet SCAN [data/events_big.parquet]
      PROJECT 4/5 COLUMNS
      SELECTION: col("event_type") == "purchase"
      ESTIMATED ROWS: 1000000
shape: (3, 3)
┌────────────┬──────────┬────────┐
│ day        ┆ revenue  ┆ buyers │
│ ---        ┆ ---      ┆ ---    │
│ date       ┆ f64      ┆ u32    │
╞════════════╪══════════╪════════╡
│ 2026-03-01 ┆ 1.7541e6 ┆ 14542  │
│ 2026-03-02 ┆ 1.7632e6 ┆ 14606  │
│ 2026-03-03 ┆ 1.7574e6 ┆ 14452  │
└────────────┴──────────┴────────┘
True
```

#### Reading the plan

- Read it bottom-up: the Parquet scan happens first.
- `PROJECT 4/5 COLUMNS`: `event_id` is never read (projection pushdown).
- `SELECTION: col("event_type") == "purchase"` sits inside the scan: rows are filtered while reading (predicate pushdown), and row groups whose statistics exclude “purchase” can be skipped.
- `collect(engine="streaming")` processes the file in batches, so inputs larger than memory work for most queries; `sink_parquet(path)` streams the result straight to a file.

#### Eager or lazy?

| Situation | Use |
|---|---|
| exploring a small frame in a notebook | eager `DataFrame` |
| reading files in a pipeline | `scan_*` … `collect()` |
| input larger than memory | `scan_*` … `collect(engine="streaming")` or `sink_parquet` |
| an eager frame in a long pipeline | `df.lazy()` … `collect()` |

> **On the job:** A lazy Polars job is the DataFrame equivalent of a SQL query: describe the whole transformation, inspect the plan (`explain()`) when it is slow, and let the engine choose how to read the files. It is the natural next step when a pandas job runs out of memory.

> **The main idea:** use `scan_parquet`/`scan_csv` → expressions → `collect()`. Check `explain()` for pushdowns; use the streaming engine or `sink_parquet` for data larger than memory.

*Read more:* [Polars: lazy API](https://docs.pola.rs/user-guide/concepts/lazy-api/), [Polars: query plan](https://docs.pola.rs/user-guide/lazy/query-plan/), [Polars: streaming](https://docs.pola.rs/user-guide/concepts/streaming/), [polars.scan_parquet](https://docs.pola.rs/api/python/stable/reference/api/polars.scan_parquet.html).

---

<a id="slide-37"></a>
## 37. Ten SQL problems, three engines

*Ten SQL problems · the SQL deck’s patterns in pandas and Polars*

Each problem below is a classic from the SQL deck, on the same six orders. For each one you get the SQL (run by DuckDB on the `orders` DataFrame), a pandas solution, a Polars solution (`po = pl.from_pandas(orders)`, lesson 33), and an executed check that all three return the same rows. Try each problem yourself before opening the tabs.

| # | Problem | SQL pattern | pandas | Polars |
|---|---|---|---|---|
| 1 | Top 2 orders per customer | `DENSE_RANK` + filter | `groupby().rank("dense")` | `rank("dense").over()` |
| 2 | Running total of daily revenue | `SUM() OVER (ORDER BY)` | `groupby().sum().cumsum()` | `sort` + `cum_sum()` |
| 3 | Latest order per customer | `ROW_NUMBER() = 1` | `sort_values` + `drop_duplicates` | `sort` + `unique(keep="last")` |
| 4 | Change since previous order | `LAG` | `groupby().shift()` | `shift().over(order_by=)` |
| 5 | Order streaks (sessions) | `LAG` + running `SUM` of flags | `diff` + `cumsum` | `diff().over()` + `cum_sum().over()` |
| 6 | Share of total revenue | `SUM(SUM()) OVER ()` | `agg` + column / its sum | `agg` + `col / col.sum()` |
| 7 | Customers with no orders | `NOT EXISTS` | `~isin` | `join(how="anti")` |
| 8 | Revenue by customer and week | `PIVOT` | `pivot_table` | `pivot` |
| 9 | Rank with ties; second-highest | `RANK`, `DENSE_RANK` | `rank("min" / "dense")` | `rank("min" / "dense")` |
| 10 | 3-day rolling average with missing days | calendar + `AVG OVER ROWS` | `asfreq` + `rolling` | `upsample` + `rolling_mean` |

#### The equality check (added)

```python
from pandas.testing import assert_frame_equal

def check(sql_df, pd_df, pl_df):
    """Sort the three results the same way, then compare values and column names."""
    def norm(d):
        return d.sort_values(list(d.columns)).reset_index(drop=True)
    expected = norm(sql_df)
    assert_frame_equal(norm(pd_df), expected, check_dtype=False)              # pandas
    assert_frame_equal(norm(pl_df.to_pandas()), expected, check_dtype=False)  # Polars
    print(f"SQL = pandas = Polars ({len(expected)} rows)")

po = pl.from_pandas(orders)
pc = pl.from_pandas(customers)
```

`assert_frame_equal` raises with a precise message (which column, which row) when frames differ. `check_dtype=False` ignores harmless type differences such as DuckDB returning `float64` for a sum or Polars ranks being unsigned integers. Sorting by every column makes the comparison independent of row order, which SQL and Polars do not guarantee.

#### How to read the solutions

- SQL and Polars state the order of a window inside the expression; pandas sorts the frame first.
- Polars `group_by` returns groups in arbitrary order, so every Polars solution ends with `sort` before anything that depends on order.
- Each problem ends with a note on what changed in translation.

> **On the job:** The `check` function is a real technique: when you migrate a SQL transformation to pandas or Polars (or back), run both on the same input and assert equality in a test. It is the safest way to refactor pipelines.

> **The main idea:** every SQL window pattern has a direct pandas and Polars form. Prove translations equal with a sorted `assert_frame_equal`, not by eye.

*Read more:* [pandas.testing.assert_frame_equal](https://pandas.pydata.org/docs/reference/api/pandas.testing.assert_frame_equal.html), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [Polars: window functions](https://docs.pola.rs/user-guide/expressions/window-functions/).

---

<a id="slide-38"></a>
## 38. Problems 1–2: top N per group, running total

*Ten SQL problems · DENSE_RANK and cumulative SUM*

**Problem 1 · Top 2 orders per customer.** Return each customer’s orders with the two highest distinct amounts, with their dense rank.

**SQL (DuckDB)**

```python
r1_sql = duckdb.sql("""
WITH ranked AS (
    SELECT customer, order_id, amount,
           DENSE_RANK() OVER (PARTITION BY customer ORDER BY amount DESC) AS amount_rank
    FROM orders)
SELECT * FROM ranked
WHERE amount_rank <= 2
ORDER BY customer, amount_rank, order_id
""").df()
print(r1_sql)
```

Output:

```text
  customer  order_id  amount  amount_rank
0      Ana         6      40            1
1      Leo         5      60            1
2      Leo         3      40            2
3     Maya         2      40            1
4     Maya         1      25            2
```

**pandas**

```python
r1_pd = (orders
    .assign(amount_rank=lambda d: d.groupby("customer")["amount"]
                                   .rank(method="dense", ascending=False).astype("int64"))
    .loc[lambda d: d["amount_rank"] <= 2, ["customer", "order_id", "amount", "amount_rank"]]
    .sort_values(["customer", "amount_rank", "order_id"], ignore_index=True))
print(r1_pd)
```

Output:

```text
  customer  order_id  amount  amount_rank
0      Ana         6      40            1
1      Leo         5      60            1
2      Leo         3      40            2
3     Maya         2      40            1
4     Maya         1      25            2
```

**Polars**

```python
r1_pl = (po
    .with_columns(amount_rank=pl.col("amount").rank("dense", descending=True).over("customer"))
    .filter(pl.col("amount_rank") <= 2)
    .select("customer", "order_id", "amount", "amount_rank")
    .sort("customer", "amount_rank", "order_id"))
print(r1_pl)
```

Output:

```text
shape: (5, 4)
┌──────────┬──────────┬────────┬─────────────┐
│ customer ┆ order_id ┆ amount ┆ amount_rank │
│ ---      ┆ ---      ┆ ---    ┆ ---         │
│ str      ┆ i64      ┆ i64    ┆ u32         │
╞══════════╪══════════╪════════╪═════════════╡
│ Ana      ┆ 6        ┆ 40     ┆ 1           │
│ Leo      ┆ 5        ┆ 60     ┆ 1           │
│ Leo      ┆ 3        ┆ 40     ┆ 2           │
│ Maya     ┆ 2        ┆ 40     ┆ 1           │
│ Maya     ┆ 1        ┆ 25     ┆ 2           │
└──────────┴──────────┴────────┴─────────────┘
```

```python
check(r1_sql, r1_pd, r1_pl)
```

Output:

```text
SQL = pandas = Polars (5 rows)
```

Translation: `PARTITION BY customer` becomes `groupby("customer")` in pandas and `.over("customer")` in Polars. pandas `rank` returns floats, hence `astype("int64")`.

**Problem 2 · Running total of daily revenue.** One row per order date with that day’s revenue and the cumulative revenue so far.

**SQL (DuckDB)**

```python
r2_sql = duckdb.sql("""
WITH daily AS (
    SELECT order_date, SUM(amount) AS revenue
    FROM orders GROUP BY order_date)
SELECT order_date, revenue::BIGINT AS revenue,
       SUM(revenue) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING)::BIGINT AS running_total
FROM daily
ORDER BY order_date
""").df()
print(r2_sql)
```

Output:

```text
  order_date  revenue  running_total
0 2026-01-03       25             25
1 2026-01-05       80            105
2 2026-01-09       15            120
3 2026-01-10      100            220
```

**pandas**

```python
r2_pd = (orders
    .groupby("order_date", as_index=False)["amount"].sum()      # groupby sorts by date
    .rename(columns={"amount": "revenue"})
    .assign(running_total=lambda d: d["revenue"].cumsum()))
print(r2_pd)
```

Output:

```text
  order_date  revenue  running_total
0 2026-01-03       25             25
1 2026-01-05       80            105
2 2026-01-09       15            120
3 2026-01-10      100            220
```

**Polars**

```python
r2_pl = (po
    .group_by("order_date").agg(revenue=pl.col("amount").sum())
    .sort("order_date")                                       # group_by order is arbitrary
    .with_columns(running_total=pl.col("revenue").cum_sum()))
print(r2_pl)
```

Output:

```text
shape: (4, 3)
┌─────────────────────┬─────────┬───────────────┐
│ order_date          ┆ revenue ┆ running_total │
│ ---                 ┆ ---     ┆ ---           │
│ datetime[μs]        ┆ i64     ┆ i64           │
╞═════════════════════╪═════════╪═══════════════╡
│ 2026-01-03 00:00:00 ┆ 25      ┆ 25            │
│ 2026-01-05 00:00:00 ┆ 80      ┆ 105           │
│ 2026-01-09 00:00:00 ┆ 15      ┆ 120           │
│ 2026-01-10 00:00:00 ┆ 100     ┆ 220           │
└─────────────────────┴─────────┴───────────────┘
```

```python
check(r2_sql, r2_pd, r2_pl)
```

Output:

```text
SQL = pandas = Polars (4 rows)
```

Translation: the pandas version silently relies on `groupby` sorting the dates; the Polars version must sort explicitly, exactly as SQL needs `ORDER BY` inside `OVER`. The `::BIGINT` casts undo DuckDB’s 128-bit sums (lesson 18).

> **The main idea:** rank inside a partition and filter outside; aggregate to the grain, sort, then accumulate.

*Read more:* [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [DataFrameGroupBy.rank](https://pandas.pydata.org/docs/reference/api/pandas.api.typing.DataFrameGroupBy.rank.html), [Expr.rank](https://docs.pola.rs/api/python/stable/reference/expressions/api/polars.Expr.rank.html).

---

<a id="slide-39"></a>
## 39. Problems 3–4: latest row per key, change since previous

*Ten SQL problems · ROW_NUMBER = 1 and LAG*

**Problem 3 · Latest order per customer.** Keep one row per customer: the most recent order, with `order_id` as the tie-breaker.

**SQL (DuckDB)**

```python
r3_sql = duckdb.sql("""
SELECT customer, order_id, order_date, amount
FROM orders
QUALIFY ROW_NUMBER() OVER (PARTITION BY customer
                           ORDER BY order_date DESC, order_id DESC) = 1
ORDER BY customer
""").df()
print(r3_sql)
```

Output:

```text
  customer  order_id order_date  amount
0      Ana         6 2026-01-10      40
1      Leo         5 2026-01-10      60
2     Maya         4 2026-01-09      15
```

**pandas**

```python
r3_pd = (orders
    .sort_values(["customer", "order_date", "order_id"])
    .drop_duplicates(subset="customer", keep="last")
    [["customer", "order_id", "order_date", "amount"]]
    .reset_index(drop=True))
print(r3_pd)
```

Output:

```text
  customer  order_id order_date  amount
0      Ana         6 2026-01-10      40
1      Leo         5 2026-01-10      60
2     Maya         4 2026-01-09      15
```

**Polars**

```python
r3_pl = (po
    .sort("customer", "order_date", "order_id")
    .unique(subset="customer", keep="last", maintain_order=True)
    .select("customer", "order_id", "order_date", "amount"))
print(r3_pl)
```

Output:

```text
shape: (3, 4)
┌──────────┬──────────┬─────────────────────┬────────┐
│ customer ┆ order_id ┆ order_date          ┆ amount │
│ ---      ┆ ---      ┆ ---                 ┆ ---    │
│ str      ┆ i64      ┆ datetime[μs]        ┆ i64    │
╞══════════╪══════════╪═════════════════════╪════════╡
│ Ana      ┆ 6        ┆ 2026-01-10 00:00:00 ┆ 40     │
│ Leo      ┆ 5        ┆ 2026-01-10 00:00:00 ┆ 60     │
│ Maya     ┆ 4        ┆ 2026-01-09 00:00:00 ┆ 15     │
└──────────┴──────────┴─────────────────────┴────────┘
```

```python
check(r3_sql, r3_pd, r3_pl)
```

Output:

```text
SQL = pandas = Polars (3 rows)
```

Translation: “row number 1 in descending order” becomes “last row in ascending order”. Both DataFrame versions depend on the sort, so the tie-breaker moves from `OVER (ORDER BY …)` into `sort_values`/`sort`.

**Problem 4 · Change since the previous order.** For every order, show the customer’s previous amount and the change.

**SQL (DuckDB)**

```python
r4_sql = duckdb.sql("""
SELECT order_id, customer, amount,
       LAG(amount) OVER w          AS prev_amount,
       amount - LAG(amount) OVER w AS change
FROM orders
WINDOW w AS (PARTITION BY customer ORDER BY order_date, order_id)
ORDER BY order_id
""").df()
print(r4_sql)
```

Output:

```text
   order_id customer  amount  prev_amount  change
0         1     Maya      25         <NA>    <NA>
1         2     Maya      40           25      15
2         3      Leo      40         <NA>    <NA>
3         4     Maya      15           40     -25
4         5      Leo      60           40      20
5         6      Ana      40         <NA>    <NA>
```

**pandas**

```python
r4_pd = (orders
    .sort_values(["customer", "order_date", "order_id"])
    .assign(prev_amount=lambda d: d.groupby("customer")["amount"].shift(1),
            change=lambda d: d["amount"] - d["prev_amount"])
    [["order_id", "customer", "amount", "prev_amount", "change"]]
    .sort_values("order_id", ignore_index=True))
print(r4_pd)
```

Output:

```text
   order_id customer  amount  prev_amount  change
0         1     Maya      25          NaN     NaN
1         2     Maya      40         25.0    15.0
2         3      Leo      40          NaN     NaN
3         4     Maya      15         40.0   -25.0
4         5      Leo      60         40.0    20.0
5         6      Ana      40          NaN     NaN
```

**Polars**

```python
order = ["order_date", "order_id"]
r4_pl = (po
    .with_columns(prev_amount=pl.col("amount").shift(1).over("customer", order_by=order))
    .with_columns(change=pl.col("amount") - pl.col("prev_amount"))
    .select("order_id", "customer", "amount", "prev_amount", "change")
    .sort("order_id"))
print(r4_pl)
```

Output:

```text
shape: (6, 5)
┌──────────┬──────────┬────────┬─────────────┬────────┐
│ order_id ┆ customer ┆ amount ┆ prev_amount ┆ change │
│ ---      ┆ ---      ┆ ---    ┆ ---         ┆ ---    │
│ i64      ┆ str      ┆ i64    ┆ i64         ┆ i64    │
╞══════════╪══════════╪════════╪═════════════╪════════╡
│ 1        ┆ Maya     ┆ 25     ┆ null        ┆ null   │
│ 2        ┆ Maya     ┆ 40     ┆ 25          ┆ 15     │
│ 3        ┆ Leo      ┆ 40     ┆ null        ┆ null   │
│ 4        ┆ Maya     ┆ 15     ┆ 40          ┆ -25    │
│ 5        ┆ Leo      ┆ 60     ┆ 40          ┆ 20     │
│ 6        ┆ Ana      ┆ 40     ┆ null        ┆ null   │
└──────────┴──────────┴────────┴─────────────┴────────┘
```

```python
check(r4_sql, r4_pd, r4_pl)
```

Output:

```text
SQL = pandas = Polars (6 rows)
```

Translation: the first order per customer has no previous value: SQL `NULL` (DuckDB hands it to pandas as `<NA>` in a nullable `Int64` column), pandas `NaN` (and the column becomes float), Polars `null` (the column stays integer). Polars’ `over(…, order_by=…)` is the closest match to SQL’s window clause.

> **The main idea:** latest-per-key and LAG both need a deterministic order with a tie-breaker. pandas puts it in a sort; SQL and Polars can put it in the window.

*Read more:* [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DataFrame.unique](https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.unique.html), [DataFrameGroupBy.shift](https://pandas.pydata.org/docs/reference/api/pandas.api.typing.DataFrameGroupBy.shift.html).

---

<a id="slide-40"></a>
## 40. Problems 5–6: streaks (sessions), share of total

*Ten SQL problems · running SUM of flags, and SUM(SUM()) OVER ()*

**Problem 5 · Order streaks.** Group each customer’s orders into streaks: a new streak starts when more than 3 days have passed since that customer’s previous order. One row per streak with first date, last date and number of orders. This is sessionization (gaps and islands) from the SQL deck.

**SQL (DuckDB)**

```python
r5_sql = duckdb.sql("""
WITH flagged AS (
    SELECT customer, order_id, order_date,
           CASE WHEN order_date - LAG(order_date) OVER w <= INTERVAL 3 DAYS
                THEN 0 ELSE 1 END AS is_new      -- first order: NULL comparison -> ELSE
    FROM orders
    WINDOW w AS (PARTITION BY customer ORDER BY order_date, order_id)
), numbered AS (
    SELECT *, SUM(is_new) OVER (PARTITION BY customer ORDER BY order_date, order_id
                                ROWS UNBOUNDED PRECEDING) AS streak_no
    FROM flagged)
SELECT customer, streak_no::BIGINT AS streak_no,
       MIN(order_date) AS first_date, MAX(order_date) AS last_date, COUNT(*) AS orders
FROM numbered
GROUP BY customer, streak_no
ORDER BY customer, streak_no
""").df()
print(r5_sql)
```

Output:

```text
  customer  streak_no first_date  last_date  orders
0      Ana          1 2026-01-10 2026-01-10       1
1      Leo          1 2026-01-05 2026-01-05       1
2      Leo          2 2026-01-10 2026-01-10       1
3     Maya          1 2026-01-03 2026-01-05       2
4     Maya          2 2026-01-09 2026-01-09       1
```

**pandas**

```python
r5_pd = (orders
    .sort_values(["customer", "order_date", "order_id"])
    .assign(gap_days=lambda d: d.groupby("customer")["order_date"].diff().dt.days,
            is_new=lambda d: (~(d["gap_days"] <= 3)).astype("int64"),   # NaN <= 3 is False -> new
            streak_no=lambda d: d.groupby("customer")["is_new"].cumsum())
    .groupby(["customer", "streak_no"], as_index=False)
    .agg(first_date=("order_date", "min"), last_date=("order_date", "max"),
         orders=("order_id", "size")))
print(r5_pd)
```

Output:

```text
  customer  streak_no first_date  last_date  orders
0      Ana          1 2026-01-10 2026-01-10       1
1      Leo          1 2026-01-05 2026-01-05       1
2      Leo          2 2026-01-10 2026-01-10       1
3     Maya          1 2026-01-03 2026-01-05       2
4     Maya          2 2026-01-09 2026-01-09       1
```

**Polars**

```python
order = ["order_date", "order_id"]
r5_pl = (po
    .with_columns(gap_days=pl.col("order_date").diff().over("customer", order_by=order)
                             .dt.total_days())
    .with_columns(is_new=(pl.col("gap_days") <= 3).not_().fill_null(True).cast(pl.Int64))
    .with_columns(streak_no=pl.col("is_new").cum_sum().over("customer", order_by=order))
    .group_by("customer", "streak_no")
    .agg(first_date=pl.col("order_date").min(), last_date=pl.col("order_date").max(),
         orders=pl.len())
    .sort("customer", "streak_no"))
print(r5_pl)
```

Output:

```text
shape: (5, 5)
┌──────────┬───────────┬─────────────────────┬─────────────────────┬────────┐
│ customer ┆ streak_no ┆ first_date          ┆ last_date           ┆ orders │
│ ---      ┆ ---       ┆ ---                 ┆ ---                 ┆ ---    │
│ str      ┆ i64       ┆ datetime[μs]        ┆ datetime[μs]        ┆ u32    │
╞══════════╪═══════════╪═════════════════════╪═════════════════════╪════════╡
│ Ana      ┆ 1         ┆ 2026-01-10 00:00:00 ┆ 2026-01-10 00:00:00 ┆ 1      │
│ Leo      ┆ 1         ┆ 2026-01-05 00:00:00 ┆ 2026-01-05 00:00:00 ┆ 1      │
│ Leo      ┆ 2         ┆ 2026-01-10 00:00:00 ┆ 2026-01-10 00:00:00 ┆ 1      │
│ Maya     ┆ 1         ┆ 2026-01-03 00:00:00 ┆ 2026-01-05 00:00:00 ┆ 2      │
│ Maya     ┆ 2         ┆ 2026-01-09 00:00:00 ┆ 2026-01-09 00:00:00 ┆ 1      │
└──────────┴───────────┴─────────────────────┴─────────────────────┴────────┘
```

```python
check(r5_sql, r5_pd, r5_pl)
```

Output:

```text
SQL = pandas = Polars (5 rows)
```

Translation: the first order of each customer has no gap. SQL’s comparison is NULL so `ELSE 1` applies; in pandas `NaN <= 3` is False, so `~` makes it True; in Polars the comparison is `null` and needs `fill_null(True)`. Three engines, three null rules, same answer only because each was handled.

**Problem 6 · Share of total revenue.** Revenue per customer and its percentage of all revenue, rounded to one decimal.

**SQL (DuckDB)**

```python
r6_sql = duckdb.sql("""
SELECT customer,
       SUM(amount)::BIGINT AS revenue,
       ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct_of_total
FROM orders
GROUP BY customer
ORDER BY revenue DESC
""").df()
print(r6_sql)
```

Output:

```text
  customer  revenue  pct_of_total
0      Leo      100          45.5
1     Maya       80          36.4
2      Ana       40          18.2
```

**pandas**

```python
r6_pd = (orders
    .groupby("customer", as_index=False).agg(revenue=("amount", "sum"))
    .assign(pct_of_total=lambda d: (100 * d["revenue"] / d["revenue"].sum()).round(1))
    .sort_values("revenue", ascending=False, ignore_index=True))
print(r6_pd)
```

Output:

```text
  customer  revenue  pct_of_total
0      Leo      100          45.5
1     Maya       80          36.4
2      Ana       40          18.2
```

**Polars**

```python
r6_pl = (po
    .group_by("customer").agg(revenue=pl.col("amount").sum())
    .with_columns(pct_of_total=(100 * pl.col("revenue") / pl.col("revenue").sum()).round(1))
    .sort("revenue", descending=True))
print(r6_pl)
```

Output:

```text
shape: (3, 3)
┌──────────┬─────────┬──────────────┐
│ customer ┆ revenue ┆ pct_of_total │
│ ---      ┆ ---     ┆ ---          │
│ str      ┆ i64     ┆ f64          │
╞══════════╪═════════╪══════════════╡
│ Leo      ┆ 100     ┆ 45.5         │
│ Maya     ┆ 80      ┆ 36.4         │
│ Ana      ┆ 40      ┆ 18.2         │
└──────────┴─────────┴──────────────┘
```

```python
check(r6_sql, r6_pd, r6_pl)
```

Output:

```text
SQL = pandas = Polars (3 rows)
```

Translation: SQL needs a window over an aggregate (`SUM(SUM(amount)) OVER ()`) because the grand total lives in a different grain. In pandas and Polars, the aggregated frame is just a frame, and its column sum is the total. Watch rounding of exact halves (lesson 18); none occur here.

> **The main idea:** flag the start of each group, then a running sum of the flags numbers the groups. Shares of total are an aggregate divided by the sum of that aggregate.

*Read more:* [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [DataFrameGroupBy.cumsum](https://pandas.pydata.org/docs/reference/api/pandas.api.typing.DataFrameGroupBy.cumsum.html), [Polars: window functions](https://docs.pola.rs/user-guide/expressions/window-functions/).

---

<a id="slide-41"></a>
## 41. Problems 7–8: anti-join, pivot

*Ten SQL problems · NOT EXISTS and PIVOT*

**Problem 7 · Customers with no orders.** List customers who never ordered.

**SQL (DuckDB)**

```python
r7_sql = duckdb.sql("""
SELECT customer
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer = c.customer)
ORDER BY customer
""").df()
print(r7_sql)
```

Output:

```text
  customer
0      Zoe
```

**pandas**

```python
r7_pd = (customers
    .loc[~customers["customer"].isin(orders["customer"]), ["customer"]]
    .reset_index(drop=True))
print(r7_pd)
```

Output:

```text
  customer
0      Zoe
```

**Polars**

```python
r7_pl = pc.join(po, on="customer", how="anti").select("customer").sort("customer")
print(r7_pl)
```

Output:

```text
shape: (1, 1)
┌──────────┐
│ customer │
│ ---      │
│ str      │
╞══════════╡
│ Zoe      │
└──────────┘
```

```python
check(r7_sql, r7_pd, r7_pl)
```

Output:

```text
SQL = pandas = Polars (1 rows)
```

Translation: Polars has first-class `how="semi"` and `how="anti"` joins, which never duplicate rows. pandas uses `isin` (one key) or `indicator=True` (several keys, lesson 22).

**Problem 8 · Revenue by customer and ISO week.** One row per customer, one column per ISO week (`W1`, `W2`), 0 where there were no orders.

**SQL (DuckDB)**

```python
r8_sql = duckdb.sql("""
PIVOT (SELECT customer, 'W' || weekofyear(order_date) AS week, amount FROM orders)
ON week
USING COALESCE(SUM(amount), 0)::BIGINT
GROUP BY customer
ORDER BY customer
""").df()
print(r8_sql)
```

Output:

```text
  customer  W1   W2
0      Ana   0   40
1      Leo   0  100
2     Maya  25   55
```

**pandas**

```python
r8_pd = (orders
    .assign(week="W" + orders["order_date"].dt.isocalendar().week.astype(str))
    .pivot_table(index="customer", columns="week", values="amount",
                 aggfunc="sum", fill_value=0)
    .reset_index()
    .rename_axis(columns=None))          # drop the leftover "week" columns label
print(r8_pd)
```

Output:

```text
  customer  W1   W2
0      Ana   0   40
1      Leo   0  100
2     Maya  25   55
```

**Polars**

```python
r8_pl = (po
    .with_columns(week=pl.lit("W") + pl.col("order_date").dt.week().cast(pl.String))
    .pivot(on="week", index="customer", values="amount", aggregate_function="sum")
    .fill_null(0)
    .select("customer", "W1", "W2")
    .sort("customer"))
print(r8_pl)
```

Output:

```text
shape: (3, 3)
┌──────────┬─────┬─────┐
│ customer ┆ W1  ┆ W2  │
│ ---      ┆ --- ┆ --- │
│ str      ┆ i64 ┆ i64 │
╞══════════╪═════╪═════╡
│ Ana      ┆ 0   ┆ 40  │
│ Leo      ┆ 0   ┆ 100 │
│ Maya     ┆ 25  ┆ 55  │
└──────────┴─────┴─────┘
```

```python
check(r8_sql, r8_pd, r8_pl)
```

Output:

```text
SQL = pandas = Polars (3 rows)
```

Translation: all three need the list of output columns to be known when the query runs. Polars’ `pivot` is eager-only for that reason (a lazy plan must know its schema in advance); in SQL engines without `PIVOT`, write one `SUM(CASE WHEN week = 'W1' THEN amount END)` per column.

> **The main idea:** anti-join with `~isin` or `how="anti"`; pivot with `pivot_table` / `pivot`, then fill missing combinations explicitly.

*Read more:* [Polars: joins (semi and anti)](https://docs.pola.rs/user-guide/transformations/joins/), [Polars: pivots](https://docs.pola.rs/user-guide/transformations/pivot/), [DuckDB: PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot).

---

<a id="slide-42"></a>
## 42. Problems 9–10: rank with ties, rolling average

*Ten SQL problems · RANK vs DENSE_RANK, and a calendar-filled window*

**Problem 9 · Rank with ties, and the second-highest amount.** Rank all orders by amount (highest first) with `RANK` and `DENSE_RANK`, then find the second-highest *distinct* amount.

**SQL (DuckDB)**

```python
r9_sql = duckdb.sql("""
SELECT order_id, amount,
       RANK()       OVER (ORDER BY amount DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rnk
FROM orders
ORDER BY rnk, order_id
""").df()
print(r9_sql)
```

Output:

```text
   order_id  amount  rnk  dense_rnk
0         5      60    1          1
1         2      40    2          2
2         3      40    2          2
3         6      40    2          2
4         1      25    5          3
5         4      15    6          4
```

**pandas**

```python
r9_pd = (orders[["order_id", "amount"]]
    .assign(rnk=orders["amount"].rank(method="min", ascending=False).astype("int64"),
            dense_rnk=orders["amount"].rank(method="dense", ascending=False).astype("int64"))
    .sort_values(["rnk", "order_id"], ignore_index=True))
print(r9_pd)
print("second highest:", r9_pd.loc[r9_pd["dense_rnk"] == 2, "amount"].max())
```

Output:

```text
   order_id  amount  rnk  dense_rnk
0         5      60    1          1
1         2      40    2          2
2         3      40    2          2
3         6      40    2          2
4         1      25    5          3
5         4      15    6          4
second highest: 40
```

**Polars**

```python
r9_pl = (po
    .select("order_id", "amount",
            rnk=pl.col("amount").rank("min", descending=True),
            dense_rnk=pl.col("amount").rank("dense", descending=True))
    .sort("rnk", "order_id"))
print(r9_pl)
print("second highest:", r9_pl.filter(pl.col("dense_rnk") == 2)["amount"].max())
```

Output:

```text
shape: (6, 4)
┌──────────┬────────┬─────┬───────────┐
│ order_id ┆ amount ┆ rnk ┆ dense_rnk │
│ ---      ┆ ---    ┆ --- ┆ ---       │
│ i64      ┆ i64    ┆ u32 ┆ u32       │
╞══════════╪════════╪═════╪═══════════╡
│ 5        ┆ 60     ┆ 1   ┆ 1         │
│ 2        ┆ 40     ┆ 2   ┆ 2         │
│ 3        ┆ 40     ┆ 2   ┆ 2         │
│ 6        ┆ 40     ┆ 2   ┆ 2         │
│ 1        ┆ 25     ┆ 5   ┆ 3         │
│ 4        ┆ 15     ┆ 6   ┆ 4         │
└──────────┴────────┴─────┴───────────┘
second highest: 40
```

```python
check(r9_sql, r9_pd, r9_pl)
```

Output:

```text
SQL = pandas = Polars (6 rows)
```

Translation: `RANK` = `"min"` (ties share the lowest rank, then a gap: 1, 2, 2, 2, 5), `DENSE_RANK` = `"dense"` (no gaps), `ROW_NUMBER` = `"first"` in pandas and `"ordinal"` in Polars. “Second highest” uses the dense rank and `max()`, which returns missing rather than failing when there is no second value.

**Problem 10 · 3-day rolling average with missing days.** Daily revenue for every calendar day from 3 to 10 January (0 on days without orders) and the average of the current and two previous days.

**SQL (DuckDB)**

```python
r10_sql = duckdb.sql("""
WITH days AS (
    SELECT CAST(d AS DATE) AS day
    FROM range(DATE '2026-01-03', DATE '2026-01-11', INTERVAL 1 DAY) t(d)
), daily AS (
    SELECT CAST(order_date AS DATE) AS day, SUM(amount) AS revenue
    FROM orders GROUP BY 1)
SELECT days.day, COALESCE(revenue, 0)::BIGINT AS revenue,
       ROUND(AVG(COALESCE(revenue, 0)) OVER (ORDER BY days.day
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3d
FROM days LEFT JOIN daily USING (day)
ORDER BY days.day
""").df()
print(r10_sql)
```

Output:

```text
         day  revenue  avg_3d
0 2026-01-03       25   25.00
1 2026-01-04        0   12.50
2 2026-01-05       80   35.00
3 2026-01-06        0   26.67
4 2026-01-07        0   26.67
5 2026-01-08        0    0.00
6 2026-01-09       15    5.00
7 2026-01-10      100   38.33
```

**pandas**

```python
r10_pd = (orders
    .groupby("order_date")["amount"].sum()
    .asfreq("D", fill_value=0)                     # the calendar: missing days -> 0
    .rename("revenue").to_frame()
    .assign(avg_3d=lambda d: d["revenue"].rolling(3, min_periods=1).mean().round(2))
    .rename_axis("day").reset_index())
print(r10_pd)
```

Output:

```text
         day  revenue  avg_3d
0 2026-01-03       25   25.00
1 2026-01-04        0   12.50
2 2026-01-05       80   35.00
3 2026-01-06        0   26.67
4 2026-01-07        0   26.67
5 2026-01-08        0    0.00
6 2026-01-09       15    5.00
7 2026-01-10      100   38.33
```

**Polars**

```python
r10_pl = (po
    .group_by("order_date").agg(revenue=pl.col("amount").sum())
    .sort("order_date")
    .upsample("order_date", every="1d")           # insert missing days (nulls)
    .fill_null(0)
    .with_columns(avg_3d=pl.col("revenue").rolling_mean(window_size=3, min_samples=1).round(2))
    .rename({"order_date": "day"}))
print(r10_pl)
```

Output:

```text
shape: (8, 3)
┌─────────────────────┬─────────┬────────┐
│ day                 ┆ revenue ┆ avg_3d │
│ ---                 ┆ ---     ┆ ---    │
│ datetime[μs]        ┆ i64     ┆ f64    │
╞═════════════════════╪═════════╪════════╡
│ 2026-01-03 00:00:00 ┆ 25      ┆ 25.0   │
│ 2026-01-04 00:00:00 ┆ 0       ┆ 12.5   │
│ 2026-01-05 00:00:00 ┆ 80      ┆ 35.0   │
│ 2026-01-06 00:00:00 ┆ 0       ┆ 26.67  │
│ 2026-01-07 00:00:00 ┆ 0       ┆ 26.67  │
│ 2026-01-08 00:00:00 ┆ 0       ┆ 0.0    │
│ 2026-01-09 00:00:00 ┆ 15      ┆ 5.0    │
│ 2026-01-10 00:00:00 ┆ 100     ┆ 38.33  │
└─────────────────────┴─────────┴────────┘
```

```python
check(r10_sql, r10_pd, r10_pl)
```

Output:

```text
SQL = pandas = Polars (8 rows)
```

Translation: each engine builds the calendar differently: a `range()` table and LEFT JOIN in SQL, `asfreq` in pandas, `upsample` in Polars. Once every day exists, a 3-row window is a 3-day window. In a warehouse you would join to the date dimension instead.

> **The main idea:** RANK/DENSE_RANK/ROW_NUMBER map to rank methods `min`/`dense`/`first` (Polars `ordinal`). For per-day rolling metrics, build the calendar first, then use a row window.

*Read more:* [Series.rolling](https://pandas.pydata.org/docs/reference/api/pandas.Series.rolling.html), [DataFrame.upsample](https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.upsample.html), [DuckDB: range()](https://duckdb.org/docs/stable/sql/functions/list#range-functions).

---

<a id="slide-43"></a>
## 43. Lab: messy events to daily metrics

*Lab · the brief, the data, and the metric definitions*

A product team wants a **daily metrics** table from raw app events. The events arrive as JSON Lines (one JSON object per line, from the files-and-streams deck) in the same shape as that deck’s events. You will build it three times, in pandas, Polars (lazy) and DuckDB SQL, prove the three agree, and write the result to Parquet. Every field arrives as text or null.

```jsonl
# data/raw/events.jsonl
{"event_id":"e1","user_id":"u1","event_type":"page_view","ts":"2026-03-02T09:00:00Z","amount":null}
{"event_id":"e2","user_id":"u1","event_type":"add_to_cart","ts":"2026-03-02T09:01:10Z","amount":"40.00"}
{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00"}
{"event_id":"e4","user_id":" U2 ","event_type":"Page_View","ts":"2026-03-02T10:15:00+01:00","amount":null}
{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":"25"}
{"event_id":"e6","user_id":null,"event_type":"purchase","ts":"2026-03-02T11:00:00Z","amount":"18.00"}
{"event_id":"e7","user_id":"u3","event_type":"purchase","ts":"not-a-time","amount":"10.00"}
{"event_id":"e8","user_id":"u3","event_type":"purchase","ts":"2026-03-02T12:00:00Z","amount":"abc"}
{"event_id":"e18","user_id":"u8","event_type":"page_view","ts":"2026-03-02T15:00:00Z","amount":null}
{"event_id":"e9","user_id":"u4","event_type":"page_view","ts":"2026-03-02T23:30:00-08:00","amount":null}
{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00"}
{"event_id":"e10","user_id":"u5","event_type":"page_view","ts":"2026-03-03T07:59:00-06:00","amount":null}
{"event_id":"e11","user_id":"u5","event_type":"purchase","ts":"2026-03-03T08:00:00-06:00","amount":"7.50"}
{"event_id":"e12","user_id":"u1","event_type":"refund","ts":"2026-03-03T09:00:00Z","amount":"5.00"}
{"event_id":"e13","user_id":"u4","event_type":"purchase","ts":"2026-03-03T08:10:00Z","amount":"1,250.50"}
{"event_id":"e14","user_id":"u6","event_type":"signup","ts":"2026-03-03T10:00:00Z","amount":null}
{"event_id":"e15","user_id":"u6","event_type":"page_view","ts":"2026-03-04T10:00:00Z","amount":null}
{"event_id":"e16","user_id":"u6","event_type":"purchase","ts":"2026-03-04T10:05:00Z","amount":"9.99"}
{"event_id":"e5","user_id":" U2","event_type":"PURCHASE","ts":"2026-03-02T10:20:00+01:00","amount":"25.00"}
{"event_id":"e17","user_id":"u7","event_type":"page_view","ts":"2026-03-04T11:00:00Z","amount":null}
```

#### Metric definitions (per UTC day)

| Metric | Definition |
|---|---|
| `active_users` | distinct users with at least one valid event that day (daily active users, DAU) |
| `purchases` | number of purchase events |
| `purchasers` | distinct users with a purchase |
| `revenue` | purchase amounts minus refund amounts, rounded to cents |
| `conversion` | `purchasers / active_users`, 3 decimals |

#### Cleaning rules

- Trim and lowercase `user_id` and `event_type`.
- Parse `ts` with its offset and convert to UTC; the reporting day is the UTC date.
- `amount`: remove thousands separators, then parse as a number.
- Reject, with a reason: missing user, unparsable timestamp, unknown event type, purchase/refund without a valid amount.
- Deduplicate on `event_id`. Redeliveries must be identical after cleaning; if two copies differ, stop.

| Trap | Rows | What should happen |
|---|---|---|
| messy text | e4 `" U2 "`/`Page_View`, second e5 `PURCHASE` | normalised, then counted as u2 |
| offsets | e4 (+01:00), e9 (−08:00), e10, e11 (−06:00) | e9 is 2 March locally but **3 March in UTC** |
| bad rows | e6 no user, e7 bad timestamp, e8 amount “abc”, e14 unknown type “signup” | rejected with a reason |
| redeliveries | e3 twice; e5 twice in different spellings | one copy each |
| formats | e13 `"1,250.50"`, e5 `"25"` vs `"25.00"` | 1250.5 and 25.0 |
| refund | e12 refunds 5.00 on 3 March | revenue goes down |

> **On the job:** This is the shape of most “silver to gold” jobs: typed and cleaned events in, one row per day out, with explicit metric definitions agreed with the business. Writing the definitions down first is what makes three implementations, or a dashboard and a pipeline, agree.

> **The main idea:** write metric definitions and cleaning rules before code. They are the specification all three implementations must meet.

---

<a id="slide-44"></a>
## 44. Lab in pandas: clean, reject, dedupe, aggregate

*Lab · eager, step by step, with a reconciliation line*

```python
import numpy as np
import pandas as pd

VALID_TYPES = ["page_view", "add_to_cart", "purchase", "refund"]

def load_raw(path):
    return pd.read_json(path, lines=True, dtype=False)        # dtype=False: keep every field as text

def clean(raw):
    df = raw.assign(
        user_id=raw["user_id"].str.strip().str.lower(),
        event_type=raw["event_type"].str.strip().str.lower(),
        ts=pd.to_datetime(raw["ts"], utc=True, format="ISO8601", errors="coerce"),
        amount=pd.to_numeric(raw["amount"].str.replace(",", "", regex=False), errors="coerce"),
    )
    df["reason"] = np.select(                                   # first failing rule wins
        [df["user_id"].isna() | (df["user_id"] == ""),
         df["ts"].isna(),
         ~df["event_type"].isin(VALID_TYPES),
         df["event_type"].isin(["purchase", "refund"]) & df["amount"].isna()],
        ["missing_user", "bad_ts", "unknown_type", "bad_amount"], default="ok")
    rejects = df[df["reason"] != "ok"]
    valid = df[df["reason"] == "ok"].drop(columns="reason")
    # Redeliveries must be identical after cleaning; anything else needs a human.
    conflicts = valid.drop_duplicates().groupby("event_id").size().loc[lambda s: s > 1]
    assert conflicts.empty, f"conflicting duplicates: {conflicts.index.tolist()}"
    events = valid.drop_duplicates(subset="event_id").reset_index(drop=True)
    return events, rejects

def daily_metrics(events):
    e = events.assign(
        day=events["ts"].dt.strftime("%Y-%m-%d"),                # reporting day in UTC
        is_purchase=events["event_type"] == "purchase",
        signed_amount=np.select([events["event_type"] == "purchase", events["event_type"] == "refund"],
                                [events["amount"], -events["amount"]], default=0.0),
    ).assign(purchaser=lambda d: d["user_id"].where(d["is_purchase"]))   # NaN if not a purchase
    m = e.groupby("day", as_index=False).agg(
        active_users=("user_id", "nunique"),
        purchases=("is_purchase", "sum"),
        purchasers=("purchaser", "nunique"),                     # nunique ignores NaN
        revenue=("signed_amount", "sum"),
    )
    return m.assign(revenue=m["revenue"].round(2),
                    conversion=(m["purchasers"] / m["active_users"]).round(3))

raw = load_raw("data/raw/events.jsonl")
events, rejects = clean(raw)
print(rejects[["event_id", "reason"]].to_string(index=False))
dups = len(raw) - len(events) - len(rejects)
print(f"raw {len(raw)} = valid {len(events)} + rejected {len(rejects)} + duplicates {dups}")
metrics_pd = daily_metrics(events)
print(metrics_pd)
```

Output:

```text
event_id       reason
      e6 missing_user
      e7       bad_ts
      e8   bad_amount
     e14 unknown_type
raw 20 = valid 14 + rejected 4 + duplicates 2
          day  active_users  purchases  purchasers  revenue  conversion
0  2026-03-02             3          2           2    89.00       0.667
1  2026-03-03             3          2           2  1253.00       0.667
2  2026-03-04             2          1           1     9.99       0.500
```

#### Design choices

- `dtype=False` keeps raw fields as text, so parsing happens once, in `clean`, with explicit rules.
- `np.select` gives each rejected row its *first* failing reason; rejects are kept, not dropped silently.
- The **reconciliation line** (raw = valid + rejected + duplicates) proves no row vanished without a reason.
- The `purchaser` column is a user ID only on purchase rows, so `nunique` counts distinct purchasers.

#### Money

Amounts are floats here and rounded to cents at the end, which is fine for a dashboard. For finance-grade totals, keep amounts as `Decimal` or integer cents through the pipeline (files-and-streams deck), or let a database use `DECIMAL(18, 2)`.

> **On the job:** In production, `clean` and `daily_metrics` would live in a module with pytest tests built on this very file, and the rejects would be written to a quarantine table with the run ID for someone to review.

> **The main idea:** small named functions (`load_raw`, `clean`, `daily_metrics`), explicit reject reasons, a duplicate-conflict check, and a reconciliation count.

*Read more:* [pandas.read_json](https://pandas.pydata.org/docs/reference/api/pandas.read_json.html), [pandas.to_datetime](https://pandas.pydata.org/docs/reference/api/pandas.to_datetime.html).

---

<a id="slide-45"></a>
## 45. Lab in Polars: one lazy query

*Lab · scan_ndjson → expressions → collect*

```python
import polars as pl

VALID_TYPES = ["page_view", "add_to_cart", "purchase", "refund"]
RAW_SCHEMA = {c: pl.String for c in ["event_id", "user_id", "event_type", "ts", "amount"]}

parsed = (
    pl.scan_ndjson("data/raw/events.jsonl", schema=RAW_SCHEMA)        # lazy: nothing read yet
    .with_columns(
        pl.col("user_id").str.strip_chars().str.to_lowercase(),
        pl.col("event_type").str.strip_chars().str.to_lowercase(),
        pl.col("ts").str.to_datetime("%Y-%m-%dT%H:%M:%S%#z", time_zone="UTC", strict=False),
        pl.col("amount").str.replace_all(",", "", literal=True).cast(pl.Float64, strict=False),
    )
    .with_columns(reason=pl.when(pl.col("user_id").is_null() | (pl.col("user_id") == ""))
                           .then(pl.lit("missing_user"))
                           .when(pl.col("ts").is_null()).then(pl.lit("bad_ts"))
                           .when(~pl.col("event_type").is_in(VALID_TYPES)).then(pl.lit("unknown_type"))
                           .when(pl.col("event_type").is_in(["purchase", "refund"])
                                 & pl.col("amount").is_null()).then(pl.lit("bad_amount"))
                           .otherwise(pl.lit("ok")))
)
valid = parsed.filter(pl.col("reason") == "ok").drop("reason").unique()   # drop exact duplicates

metrics_lf = (
    valid
    .group_by(pl.col("ts").dt.strftime("%Y-%m-%d").alias("day"))
    .agg(
        active_users=pl.col("user_id").n_unique(),
        purchases=(pl.col("event_type") == "purchase").sum(),
        purchasers=pl.col("user_id").filter(pl.col("event_type") == "purchase").n_unique(),
        revenue=pl.when(pl.col("event_type") == "purchase").then(pl.col("amount"))
                  .when(pl.col("event_type") == "refund").then(-pl.col("amount"))
                  .otherwise(0.0).sum().round(2),
    )
    .with_columns(conversion=(pl.col("purchasers") / pl.col("active_users")).round(3))
    .sort("day")
)

assert not valid.select(pl.col("event_id").is_duplicated().any()).collect().item(), "conflicting duplicates"
rejects_pl = parsed.filter(pl.col("reason") != "ok").select("event_id", "reason").collect()
print(rejects_pl.sort("event_id").rows())
metrics_pl = metrics_lf.collect()
print(metrics_pl)
```

Output:

```text
[('e14', 'unknown_type'), ('e6', 'missing_user'), ('e7', 'bad_ts'), ('e8', 'bad_amount')]
shape: (3, 6)
┌────────────┬──────────────┬───────────┬────────────┬─────────┬────────────┐
│ day        ┆ active_users ┆ purchases ┆ purchasers ┆ revenue ┆ conversion │
│ ---        ┆ ---          ┆ ---       ┆ ---        ┆ ---     ┆ ---        │
│ str        ┆ u32          ┆ u32       ┆ u32        ┆ f64     ┆ f64        │
╞════════════╪══════════════╪═══════════╪════════════╪═════════╪════════════╡
│ 2026-03-02 ┆ 3            ┆ 2         ┆ 2          ┆ 89.0    ┆ 0.667      │
│ 2026-03-03 ┆ 3            ┆ 2         ┆ 2          ┆ 1253.0  ┆ 0.667      │
│ 2026-03-04 ┆ 2            ┆ 1         ┆ 1          ┆ 9.99    ┆ 0.5        │
└────────────┴──────────────┴───────────┴────────────┴─────────┴────────────┘
```

```python
from pandas.testing import assert_frame_equal
assert_frame_equal(metrics_pl.to_pandas(), metrics_pd, check_dtype=False)
print("Polars = pandas")
```

Output:

```text
Polars = pandas
```

#### What is different from pandas

- The whole pipeline is one plan; `collect()` runs it, and the same `parsed` plan feeds both the metrics and the rejects.
- Timestamp parsing needs an explicit format; `%#z` accepts both `Z` and `+01:00`. `strict=False` turns failures into null, like `errors="coerce"`.
- Polars’ `n_unique` counts null as a value. Filtering to purchase rows first avoids that; pandas’ `nunique` ignores NaN by default.
- `unique()` without a subset drops exact duplicates; the assertion then proves no `event_id` still appears twice.

#### Scaling it

For a month of events in many files, change one line: `pl.scan_ndjson("data/raw/*.jsonl", …)`. Add `.sink_parquet("…")` instead of `collect()` to stream to disk, or `collect(engine="streaming")` to bound memory.

> **On the job:** Lazy Polars is a good fit for scheduled single-machine jobs: no cluster, low memory, and query plans you can inspect. In Fabric, the Python (non-Spark) notebook experience is a common place to run such jobs.

> **The main idea:** the Polars version is one declarative plan with the same rules; the assertion shows it matches pandas exactly.

*Read more:* [polars.scan_ndjson](https://docs.pola.rs/api/python/stable/reference/api/polars.scan_ndjson.html), [str.to_datetime](https://docs.pola.rs/api/python/stable/reference/series/api/polars.Series.str.to_datetime.html), [Polars: lazy API](https://docs.pola.rs/user-guide/concepts/lazy-api/).

---

<a id="slide-46"></a>
## 46. Lab in DuckDB SQL, three-way check, and Parquet output

*Lab · the same rules in SQL, then publish the result*

```python
import duckdb

con = duckdb.connect()
con.sql("SET TimeZone = 'UTC'")      # the session zone decides which day a TIMESTAMPTZ falls on

metrics_sql = con.sql("""
WITH raw AS (
    SELECT * FROM read_json('data/raw/events.jsonl',
        columns = {event_id: 'VARCHAR', user_id: 'VARCHAR', event_type: 'VARCHAR',
                   ts: 'VARCHAR', amount: 'VARCHAR'})
), parsed AS (
    SELECT event_id,
           lower(trim(user_id))                         AS user_id,
           lower(trim(event_type))                      AS event_type,
           TRY_CAST(ts AS TIMESTAMPTZ)                  AS ts,
           TRY_CAST(replace(amount, ',', '') AS DOUBLE) AS amount
    FROM raw
), valid AS (
    SELECT DISTINCT * FROM parsed                  -- exact redeliveries collapse here
    WHERE coalesce(user_id, '') <> ''
      AND ts IS NOT NULL
      AND event_type IN ('page_view', 'add_to_cart', 'purchase', 'refund')
      AND NOT (event_type IN ('purchase', 'refund') AND amount IS NULL)
)
SELECT strftime(ts, '%Y-%m-%d')                                        AS day,
       COUNT(DISTINCT user_id)                                         AS active_users,
       COUNT(*) FILTER (WHERE event_type = 'purchase')                 AS purchases,
       COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'purchase')  AS purchasers,
       ROUND(SUM(CASE event_type WHEN 'purchase' THEN amount
                                 WHEN 'refund'   THEN -amount ELSE 0 END), 2) AS revenue,
       ROUND(purchasers / active_users, 3)                             AS conversion
FROM valid
GROUP BY day
ORDER BY day
""").df()
print(metrics_sql)
```

Output:

```text
          day  active_users  purchases  purchasers  revenue  conversion
0  2026-03-02             3          2           2    89.00       0.667
1  2026-03-03             3          2           2  1253.00       0.667
2  2026-03-04             2          1           1     9.99       0.500
```

#### Three engines, one answer

```python
for name, other in [("Polars", metrics_pl.to_pandas()), ("DuckDB", metrics_sql)]:
    assert_frame_equal(other, metrics_pd, check_dtype=False)
print("pandas = Polars = DuckDB")

la = duckdb.connect()
la.sql("SET TimeZone = 'America/Los_Angeles'")
print("e9 in a Los Angeles session:",
      la.sql("SELECT strftime(TIMESTAMPTZ '2026-03-03 07:30:00+00', '%Y-%m-%d')").fetchone()[0])
```

Output:

```text
pandas = Polars = DuckDB
e9 in a Los Angeles session: 2026-03-02
```

DuckDB’s default session time zone is the machine’s local zone. Without `SET TimeZone = 'UTC'`, e9 would be counted on 2 March on a Los Angeles laptop and on 3 March on a UTC server.

#### Publish as Parquet

```python
from pathlib import Path
out = Path("data/out"); out.mkdir(parents=True, exist_ok=True)
metrics_pd.to_parquet(out / "daily_metrics.parquet", index=False)
rejects[["event_id", "reason"]].to_parquet(out / "rejects.parquet", index=False)

print(pl.read_parquet(out / "daily_metrics.parquet").schema)
print(duckdb.sql("SELECT day, revenue FROM 'data/out/daily_metrics.parquet' ORDER BY day").fetchall())
```

Output:

```text
Schema({'day': String, 'active_users': Int64, 'purchases': Int64, 'purchasers': Int64, 'revenue': Float64, 'conversion': Float64})
[('2026-03-02', 89.0), ('2026-03-03', 1253.0), ('2026-03-04', 9.99)]
```

> **On the job:** Parquet is the hand-off between engines: written by pandas, read by Polars, DuckDB, Spark or Power BI with types intact. Write to a temporary name and rename (atomic writes, files-and-streams deck), and overwrite the whole day’s output on re-runs so the job stays idempotent.

> **The main idea:** the same specification in three engines produced identical results, which is the best evidence that the metric logic is right. Pin the session time zone and publish typed Parquet.

*Read more:* [DuckDB: JSON](https://duckdb.org/docs/stable/data/json/overview), [DuckDB: timestamps and time zones](https://duckdb.org/docs/stable/sql/data_types/timestamp), [DuckDB: Parquet export](https://duckdb.org/docs/stable/guides/file_formats/parquet_export).

---

<a id="slide-47"></a>
## 47. Choosing: pandas, Polars, DuckDB, or Spark

*Choices · a decision guide, with one measurement*

| Question | pandas | Polars | DuckDB | Spark (PySpark) |
|---|---|---|---|---|
| Data size that is comfortable | well below RAM (needs several × data size) | up to RAM; larger with streaming | larger than RAM (spills to disk) | larger than one machine |
| Style | eager methods, index | expressions, eager or lazy | SQL (plus a relational Python API) | DataFrame API or SQL, lazy, distributed |
| Parallelism | mostly single core | all cores | all cores | many machines |
| Ecosystem fit | best: plotting, scikit-learn, statsmodels, most libraries accept pandas | growing; converts to pandas/Arrow cheaply | reads/writes pandas, Polars, Arrow, Parquet, CSV, JSON directly | lakehouse platforms (Fabric, Databricks), Delta Lake |
| Best for | small/medium data, notebooks, library interop, quick analysis | fast single-machine pipelines, larger-than-pandas data | SQL-first teams, ad-hoc queries over files, local warehouse | big data, cluster jobs, shared lakehouse tables |
| Watch out for | memory, index surprises, NULL semantics (lesson 28) | API still evolving between versions; fewer tutorials | single process: one writer per database file | cluster start-up and cost; overkill for small data |

```python
import time
import duckdb
import pandas as pd
import polars as pl

def run(label, fn, repeat=3):
    best = float("inf")
    for _ in range(repeat):
        t0 = time.perf_counter(); out = fn(); best = min(best, time.perf_counter() - t0)
    print(f"{label:<8} {best * 1000:7.1f} ms (best of {repeat})")
    return out

def with_pandas():
    df = pd.read_parquet("data/events_big.parquet", columns=["ts", "event_type", "user_id", "amount"])
    df = df[df["event_type"] == "purchase"]
    return (df.groupby(df["ts"].dt.floor("D"))
              .agg(revenue=("amount", "sum"), buyers=("user_id", "nunique")))

def with_polars():
    return (pl.scan_parquet("data/events_big.parquet")
              .filter(pl.col("event_type") == "purchase")
              .group_by(pl.col("ts").dt.date().alias("day"))
              .agg(revenue=pl.col("amount").sum(), buyers=pl.col("user_id").n_unique())
              .sort("day").collect())

con = duckdb.connect(); con.sql("SET TimeZone = 'UTC'")
def with_duckdb():
    return con.sql("""SELECT CAST(ts AS DATE) AS day, SUM(amount) AS revenue,
                             COUNT(DISTINCT user_id) AS buyers
                      FROM 'data/events_big.parquet' WHERE event_type = 'purchase'
                      GROUP BY day ORDER BY day""").df()

a, b, c = run("pandas", with_pandas), run("Polars", with_polars), run("DuckDB", with_duckdb)
assert a["buyers"].tolist() == b["buyers"].to_list() == c["buyers"].tolist()
```

Output (measured on the build machine; one million events from lesson 31):

```text
pandas     155.3 ms (best of 3)
Polars      26.3 ms (best of 3)
DuckDB     150.2 ms (best of 3)
```

Read this measurement with care: one query, one machine, a warm file cache, a million rows. At this size every engine answers in well under a second, and the ranking can change with the query, the data size and the versions. Benchmark your own workload before switching tools.

#### A practical decision path

- Fits easily in memory and you need plotting/ML libraries → **pandas**.
- Single machine, getting slow or memory-heavy, Python team → **Polars** (lazy).
- Team thinks in SQL, or data sits in Parquet/CSV files → **DuckDB**.
- Data or concurrency beyond one machine, or tables shared in a lakehouse → **Spark**.
- Mixing is normal: DuckDB to aggregate, Polars or pandas for the last mile.

#### Moving between them (added)

```python
import pyarrow as pa
tbl = duckdb.sql("SELECT customer, SUM(amount)::BIGINT AS revenue FROM orders "
                 "GROUP BY customer ORDER BY customer").to_arrow_table()      # Arrow table
print(type(tbl).__name__, tbl.num_rows, "rows")
print(pl.from_arrow(tbl).rows())                    # Arrow -> Polars (no copy for most types)
print(tbl.to_pandas().dtypes.to_dict())             # Arrow -> pandas
print(duckdb.sql("SELECT COUNT(*) FROM po").fetchone())   # DuckDB reads a Polars frame directly
```

Output:

```text
Table 3 rows
[('Ana', 40), ('Leo', 100), ('Maya', 80)]
{'customer': <StringDtype(na_value=nan)>, 'revenue': dtype('int64')}
(6,)
```

All three speak **Apache Arrow**, so conversions are cheap and often **zero-copy** (the new object reuses the same memory instead of copying it).

> **On the job:** “Why not just use Spark for everything?” is a common interview question. A good answer weighs data size, team skills, cost and latency: a 2 GB daily file is a DuckDB or Polars job that finishes in seconds on one machine; a 2 TB table shared by many teams belongs in Spark on a lakehouse.

> **The main idea:** choose by data size, team language and the libraries you must feed. pandas for interop and small data, Polars for fast single-machine pipelines, DuckDB for SQL over files, Spark for cluster scale. Arrow makes mixing them cheap.

*Read more:* [Polars: coming from pandas](https://docs.pola.rs/user-guide/migration/pandas/), [DuckDB: integration with Polars](https://duckdb.org/docs/stable/guides/python/polars), [PyArrow: pandas integration](https://arrow.apache.org/docs/python/pandas.html), [Fabric: Python experience on notebooks](https://learn.microsoft.com/en-us/fabric/data-engineering/using-python-experience-on-notebook).

---

<a id="slide-48"></a>
## 48. Bug clinic: DataFrame bugs that pass silently

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | A new column looks unchanged or full of NaN | Assigned a Series with a different index (alignment) | `.to_numpy()` or `reset_index(drop=True)` first | 6 |
| 2 | An update “did nothing”, with a `ChainedAssignmentError` warning | `df[mask]["col"] = v` or chained `inplace=True` under Copy-on-Write | `df.loc[mask, "col"] = v`; `df[col] = df[col].fillna(…)` | 13 |
| 3 | `ValueError: The truth value of a Series is ambiguous` | `and`/`or` instead of `&`/`\|`, or missing parentheses | `(a > 1) & (b == 2)` | 8 |
| 4 | Row count differs from the SQL version of a filter | `!=` keeps NaN rows; SQL drops NULLs | add `& s.notna()` | 8, 10 |
| 5 | IDs like `1234.0`; joins stop matching | Missing value turned an int column into float; leading zeros lost | read IDs as `str`; nullable `Int64` | 9, 29 |
| 6 | Revenue doubled after a join | Fan-out from duplicate dimension keys | `validate="many_to_one"` + row-count assert | 21 |
| 7 | Invented matches between rows without a key | pandas joins NaN keys to NaN keys | `dropna(subset=keys)` before `merge` | 20 |
| 8 | Group totals don’t add up to the overall total | `groupby` dropped missing keys | `dropna=False` or fill the key; reconcile | 17 |
| 9 | LAG/running totals wrong in pandas but right in SQL | No sort before `shift`/`cumsum`; no tie-breaker | sort by key, time, tie-breaker | 25 |
| 10 | Results differ run to run (Polars, SQL) | Relying on group or row order | explicit `sort`; `maintain_order=True` | 15, 35 |
| 11 | “3-day average” too high on quiet days | Time window over existing rows only | fill the calendar first | 26 |
| 12 | Column of numbers is `str` after `read_csv` | Thousands separators, stray text, unknown NA markers | `thousands=`, `na_values=`, `to_numeric(errors="coerce")` and count failures | 29 |
| 13 | Wrong day for late-evening events | Local time vs UTC; DuckDB session time zone | `utc=True`; `SET TimeZone = 'UTC'` | 11, 46 |
| 14 | Notebook takes minutes on a million rows | `iterrows`/`apply` row loops; `concat` in a loop | vectorize; collect frames, concat once | 12, 23 |
| 15 | `MemoryError` / kernel restarts | All columns read; `object` text; copies during merges | `usecols`/`columns`, `str`/`category`, chunks, Polars/DuckDB | 31, 32 |
| 16 | Sums from DuckDB arrive as floats | Integer `SUM` returns `HUGEINT` (128-bit) → `float64` | `SUM(x)::BIGINT` | 18 |
| 17 | Totals differ by 0.1 between pandas and SQL | Round-half-to-even vs half-away-from-zero | Decimal / integer cents; agree on a rule | 18 |
| 18 | Code that worked on the cluster breaks on a laptop (or back) | pandas 2.x vs 3.0 defaults | check `pd.__version__`; version-neutral patterns | 2, 13 |

> **On the job:** Most of these bugs produce numbers, not errors. The defence is the same every time: row counts before and after each step, totals reconciled to the source, uniqueness checks on keys, and a test that compares the pandas result with an independent SQL result.

> **The main idea:** DataFrame bugs cluster around the index, missing values, joins, order and dtypes. Assertions on counts, keys and totals catch them before a dashboard does.

---

<a id="slide-49"></a>
## 49. Exercises 1–4: NULLs, joins, Copy-on-Write

*Exercises · try before you open the hint*

Every exercise starts from the data in lesson 3 (`orders`, `customers`) with `import numpy as np`, `import pandas as pd`, `import polars as pl` and `import duckdb` already run. Tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · A filter with SQL NULL semantics

Write `not_in_city(df, city)` that returns the rows whose city is *known* and different from `city`, the way SQL’s `WHERE city <> :city` behaves. Compare with DuckDB.

```python
def not_in_city(df, city):
    ...

assert not_in_city(customers, "Austin")["customer"].tolist() == ["Leo"]
sql = duckdb.sql("SELECT customer FROM customers WHERE city <> 'Austin' ORDER BY customer").df()
assert not_in_city(customers, "Austin")["customer"].tolist() == sql["customer"].tolist()
assert len(not_in_city(customers, "Paris")) == 3        # Zoe (no city) still excluded
```

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · An enrichment join that checks itself

Write `enrich(facts, dim, key)`: a left join of a dimension onto a fact table that raises `pd.errors.MergeError` if the dimension has duplicate keys, and asserts that the number of fact rows did not change.

```python
def enrich(facts, dim, key):
    ...

out = enrich(orders, customers, "customer")
assert len(out) == len(orders) and out["amount"].sum() == 220
assert out.loc[out["customer"] == "Leo", "city"].unique().tolist() == ["Denver"]
customers_dup = pd.concat([customers, customers.iloc[[1]]], ignore_index=True)   # Leo twice
try:
    enrich(orders, customers_dup, "customer")
except pd.errors.MergeError:
    pass
else:
    raise AssertionError("duplicate dimension key not detected")
```

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · An inner join with SQL NULL semantics

Write `sql_inner_join(left, right, on)` that behaves like a SQL inner join (missing keys never match) and also returns how many left rows had a missing key.

```python
from pandas.testing import assert_frame_equal
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": ["u1", None, "u2", None]})
users = pd.DataFrame({"user_id": ["u1", "u2", None], "country": ["DE", "FR", "??"]})

def sql_inner_join(left, right, on):
    ...

joined, n_null = sql_inner_join(events, users, "user_id")
assert joined["event_id"].tolist() == [1, 3] and n_null == 2
assert "??" not in joined["country"].tolist()
expected = duckdb.sql("""SELECT e.event_id, user_id, u.country
                         FROM events e JOIN users u USING (user_id) ORDER BY e.event_id""").df()
assert_frame_equal(joined, expected, check_dtype=False)
```

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Fix the Copy-on-Write bugs

This function was written for pandas 1.x. On pandas 3.0 it changes nothing (and warns). Rewrite it as `apply_discount(df)`: Leo’s amounts × 0.9, missing cities become `"unknown"`, and the input frame must stay unchanged.

```python
def apply_discount_buggy(df):
    df[df["customer"] == "Leo"]["amount"] = df["amount"] * 0.9    # chained assignment
    df["city"].fillna("unknown", inplace=True)                   # chained inplace
    return df

def apply_discount(df):
    ...

enriched = orders.merge(customers, on="customer", how="left")
enriched.loc[enriched["customer"] == "Ana", "city"] = None        # one missing city
before = enriched.copy()
out = apply_discount(enriched)
assert out.loc[out["customer"] == "Leo", "amount"].tolist() == [36.0, 54.0]
assert out["city"].isna().sum() == 0 and (out["city"] == "unknown").sum() == 1
pd.testing.assert_frame_equal(enriched, before)                   # input untouched
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

> **The main idea:** write the SQL semantics you want explicitly: notna() for filters, validate= for joins, dropna on keys, and one-step assignment.

---

<a id="slide-50"></a>
## 50. Exercises 5–7: groups, windows, Polars

*Exercises · reconcile, LEAD, translate*

Every exercise starts from the data in lesson 3 (`orders`, `customers`) with `import numpy as np`, `import pandas as pd`, `import polars as pl` and `import duckdb` already run. Tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 5 · Revenue by city that reconciles

Ana’s city is unknown in `cust` below. Write `revenue_by_city(orders, customers)` returning columns `city` and `revenue`, with unknown cities labelled `"(unknown)"`, so the city totals add up to total revenue.

```python
cust = customers.assign(city=customers["city"].where(customers["customer"] != "Ana"))

def revenue_by_city(orders, customers):
    ...

r = revenue_by_city(orders, cust)
assert r.set_index("city")["revenue"].to_dict() == {"(unknown)": 40, "Austin": 80, "Denver": 100}
assert r["revenue"].sum() == orders["amount"].sum()
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · Days to the second order, in pandas and Polars

For each customer, return `customer`, `first_order` (date) and `days_to_second`: days between the first and second order, missing if there is no second order. Write a pandas and a Polars version.

```python
def days_to_second_order_pd(orders):
    ...

def days_to_second_order_pl(po):
    ...

r = days_to_second_order_pd(orders)
assert r["customer"].tolist() == ["Ana", "Leo", "Maya"]
assert r["days_to_second"].tolist()[1:] == [5.0, 2.0] and pd.isna(r["days_to_second"].iloc[0])
rp = days_to_second_order_pl(pl.from_pandas(orders))
assert rp["customer"].to_list() == ["Ana", "Leo", "Maya"]
assert rp["days_to_second"].to_list() == [None, 5, 2]
```

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · Translate a pandas chain to Polars lazy

Translate `summary_pd` into `summary_pl(lf)`, which takes and returns a `LazyFrame`. The collected result must equal the pandas one.

```python
from pandas.testing import assert_frame_equal

def summary_pd(orders):
    total = orders["amount"].sum()
    return (orders.groupby("customer", as_index=False)
                  .agg(n_orders=("order_id", "size"), revenue=("amount", "sum"),
                       avg_amount=("amount", "mean"))
                  .assign(avg_amount=lambda d: d["avg_amount"].round(2),
                          share=lambda d: (d["revenue"] / total).round(3))
                  .sort_values(["revenue", "customer"], ascending=[False, True], ignore_index=True))

def summary_pl(lf):
    ...

lazy = summary_pl(pl.from_pandas(orders).lazy())
assert isinstance(lazy, pl.LazyFrame)
assert_frame_equal(lazy.collect().to_pandas(), summary_pd(orders), check_dtype=False)
```

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

> **The main idea:** reconcile group totals, sort before window logic, and translate pandas steps one to one into Polars expressions.

---

<a id="slide-51"></a>
## 51. Exercises 8–10: duplicates, memory, chunks

*Exercises · production habits*

Every exercise starts from the data in lesson 3 (`orders`, `customers`) with `import numpy as np`, `import pandas as pd`, `import polars as pl` and `import duckdb` already run. Tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 8 · Find conflicting redeliveries

A source redelivers events. Copies are fine if they are identical after cleaning (trim and lowercase `user_id`, numeric `amount`). Write `conflicting_ids(df)` that returns the sorted list of `event_id`s whose copies disagree.

```python
deliveries = pd.DataFrame({
    "event_id": ["e1", "e2", "e2", "e3", "e3", "e4"],
    "user_id":  ["u1", "u2", "U2 ", "u3", "u3", "u4"],
    "amount":   ["10", "5.00", "5", "7.5", "8.5", "1"],
})

def conflicting_ids(df):
    ...

assert conflicting_ids(deliveries) == ["e3"]
assert conflicting_ids(deliveries[deliveries["event_id"] != "e3"]) == []
```

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Shrink a DataFrame

Write `shrink(df, max_unique_ratio=0.5)`: convert each `str` column whose share of distinct values is at most `max_unique_ratio` to `category`, and downcast integer columns to the smallest integer type. Values must not change.

```python
rng = np.random.default_rng(0)
n = 200_000
df = pd.DataFrame({
    "country": rng.choice(["DE", "FR", "US", "BR"], n),
    "user_id": pd.Series(rng.integers(0, 150_000, n)).map("u{:06d}".format),
    "clicks": rng.integers(0, 100, n),
})

def shrink(df, max_unique_ratio=0.5):
    ...

small = shrink(df)
assert small["country"].dtype == "category" and small["user_id"].dtype != "category"
assert small["clicks"].dtype == "int8"
assert small.memory_usage(deep=True).sum() < 0.6 * df.memory_usage(deep=True).sum()
assert (small["country"].astype("str") == df["country"]).all() and (small["clicks"] == df["clicks"]).all()
```

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · A chunked mean without averaging averages

Write `chunked_mean(path, chunksize)` returning the mean `amount` per `event_type` as a Series, reading the CSV `chunksize` rows at a time. It must equal the full-file answer for any chunk size.

```python
rng = np.random.default_rng(1)
sample = pd.DataFrame({"event_type": rng.choice(["a", "b", "c"], 10_000, p=[0.7, 0.2, 0.1]),
                       "amount": rng.integers(1, 1000, 10_000) / 10})
sample.to_csv("data/sample_events.csv", index=False)

def chunked_mean(path, chunksize):
    ...

expected = sample.groupby("event_type")["amount"].mean()
for size in (999, 4_000, 20_000):
    got = chunked_mean("data/sample_events.csv", size)
    assert np.allclose(got.sort_index(), expected.sort_index())
```

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** check duplicates for conflicts, measure memory before optimising, and combine chunk results with decomposable statistics.

---

<a id="slide-52"></a>
## 52. Cheat sheet: SQL → pandas → Polars

*Reference · the deck on one page*

| Need | SQL (DuckDB) | pandas | Polars |
|---|---|---|---|
| pick columns | `SELECT a, b` | `df[["a", "b"]]` | `df.select("a", "b")` |
| filter | `WHERE a > 1 AND b = 'x'` | `df[(df.a > 1) & (df.b == "x")]` | `df.filter((pl.col("a") > 1) & (pl.col("b") == "x"))` |
| NULL-safe “not equal” | `b <> 'x'` | `(df.b != "x") & df.b.notna()` | `pl.col("b") != "x"` (null → dropped) |
| new column | `a * 2 AS c` | `df.assign(c=lambda d: d.a * 2)` | `df.with_columns(c=pl.col("a") * 2)` |
| CASE WHEN | `CASE WHEN … THEN … ELSE … END` | `np.select`, `Series.case_when` | `pl.when().then().otherwise()` |
| missing | `COALESCE(a, 0)`, `a IS NULL` | `fillna(0)`, `isna()` | `fill_null(0)`, `is_null()` |
| sort | `ORDER BY a DESC, id` | `sort_values(["a", "id"], ascending=[False, True])` | `sort("a", "id", descending=[True, False])` |
| group | `GROUP BY k` + `SUM(a) AS s` | `groupby("k", as_index=False).agg(s=("a", "sum"))` | `group_by("k").agg(s=pl.col("a").sum())` |
| count rows / values / distinct | `COUNT(*)` / `COUNT(a)` / `COUNT(DISTINCT a)` | `size` / `count` / `nunique` | `pl.len()` / `count()` / `n_unique()` |
| NULL group | kept | `groupby(k, dropna=False)` | kept |
| window aggregate | `SUM(a) OVER (PARTITION BY k)` | `groupby(k)["a"].transform("sum")` | `pl.col("a").sum().over("k")` |
| LAG | `LAG(a) OVER (PARTITION BY k ORDER BY t)` | sort, then `groupby(k)["a"].shift(1)` | `pl.col("a").shift(1).over("k", order_by="t")` |
| ROW_NUMBER / RANK / DENSE_RANK | … | `rank(method="first" / "min" / "dense")` | `rank("ordinal" / "min" / "dense")` |
| running total | `SUM(a) OVER (ORDER BY t)` | `cumsum()` | `cum_sum()` |
| rolling | `AVG(a) OVER (ROWS 2 PRECEDING)` | `rolling(3, min_periods=1).mean()` | `rolling_mean(3, min_samples=1)` |
| join | `LEFT JOIN d USING (k)` | `merge(d, on="k", how="left", validate="m:1")` | `join(d, on="k", how="left", validate="m:1")` |
| anti / semi join | `NOT EXISTS` / `EXISTS` | `~isin` / `isin`, `indicator=True` | `how="anti"` / `how="semi"` |
| UNION ALL | `UNION ALL BY NAME` | `pd.concat(frames, ignore_index=True)` | `pl.concat(frames, how="diagonal")` |
| latest per key | `QUALIFY ROW_NUMBER() … = 1` | `sort_values` + `drop_duplicates(k, keep="last")` | `sort` + `unique(k, keep="last", maintain_order=True)` |
| pivot / unpivot | `PIVOT` / `UNPIVOT` | `pivot_table` / `melt` | `pivot` / `unpivot` |
| read | `FROM 'x.parquet'` | `pd.read_parquet(p, columns=…, filters=…)` | `pl.scan_parquet(p)` … `collect()` |
| write | `COPY t TO 'x.parquet'` | `df.to_parquet(p, index=False)` | `df.write_parquet(p)` / `lf.sink_parquet(p)` |

#### pandas habits

- Check `pd.__version__`, `dtypes`, `isna().sum()` after every load.
- One-step assignment: `df.loc[mask, col] = v`; chains of `assign`/`pipe`.
- Sort before `shift`/`cumsum`; add a tie-breaker.
- `validate=` on every merge; assert row counts and totals.

#### Memory and scale

- `memory_usage(deep=True).sum()` to measure.
- `usecols`/`columns`, `str`, `category`, downcast.
- `read_csv(chunksize=)` with sum + count, never mean of means.
- Larger than memory: Polars `scan_*` + streaming, or DuckDB SQL over files.

> **The main idea:** the same twenty operations in three dialects. The differences live in NULLs, order, the index, and how windows get their order.

---

<a id="slide-53"></a>
## 53. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| DataFrame / Series | An in-memory table of named, typed columns / one column with an index |
| dtype | The data type of a column (int64, float64, str, datetime64[us], category, …) |
| NumPy array | A block of memory of one machine type; the basis of classic pandas columns |
| Index / RangeIndex | Row labels of a pandas object / the default 0, 1, 2, … labels |
| Index alignment | pandas matching rows by label before combining two objects |
| Label vs position | `.loc` selects by index label (slices include the end); `.iloc` by integer position |
| Boolean mask | A True/False Series used to select rows |
| Nullable dtype | Int64, Float64, boolean, string: dtypes with a separate missing-value mask (`pd.NA`) |
| Apache Arrow / PyArrow | A standard columnar in-memory format / its Python library |
| str dtype | pandas 3.0’s default text dtype (Arrow-backed), replacing object for strings |
| object dtype | A column of pointers to arbitrary Python objects; slow and large |
| NaN, None, pd.NA, NaT | pandas’ missing markers: float “not a number”, Python null, nullable-dtype missing, “not a time” |
| Three-valued logic | SQL logic where comparisons with NULL are unknown, neither true nor false |
| Accessor | A method namespace for one column type: `.str`, `.dt`, `.cat` |
| Vectorized | Applied to a whole column in compiled code instead of a Python loop |
| View / copy | An object sharing memory with another / owning its own memory |
| Copy-on-Write (CoW) | Every derived object behaves as a copy; memory is copied only when written (always on in pandas 3.0) |
| Chained assignment | Assigning through two indexing steps (`df[a][b] = v`); never works under CoW |
| Method chaining | Calling methods one after another, each returning a new DataFrame |
| Lambda | A small anonymous function, `lambda d: …` |
| Split-apply-combine | The groupby model: split by key, apply a function, combine results |
| Named aggregation | `agg(new=("col", "func"))` |
| transform | A group computation returned with one value per original row (window aggregate) |
| Categorical | A dtype storing distinct values once plus a small integer code per row |
| Stable sort | A sort that keeps the original order of rows with equal keys |
| Cardinality | How many rows on one side of a join match one row on the other |
| Fan-out | Rows multiplying in a join because keys are not unique where you assumed they were |
| Semi-join / anti-join | Keep left rows with / without a match, without adding columns |
| Schema drift | A source’s columns changing over time (added, removed, renamed, reordered) |
| CDC | Change data capture: a feed of inserted/updated/deleted rows from a source system |
| Rolling window | An aggregate over the last n rows or a time span, moving with each row |
| Long / wide data | One row per observation / one column per value of a variable |
| Pivot / melt (unpivot) | Long → wide / wide → long |
| Parquet / row group | A columnar, compressed, typed file format / a block of rows with per-column statistics |
| Projection pushdown (column pruning) | Reading only the columns a query needs |
| Predicate pushdown | Applying filters while reading, skipping data that cannot match |
| Hive-style partitioning | Folders named `column=value` holding one partition each |
| Chunked reading | Processing a file n rows at a time to bound memory |
| Decomposable aggregation | One computable per chunk and combinable afterwards (sum, count, min, max) |
| Polars expression / context | A description of a column computation / where it is evaluated (select, with_columns, filter, agg) |
| Eager / lazy execution | Run each step immediately / record a plan and run it on collect() |
| Query plan | The steps an engine will run, after optimisation; `explain()` prints it |
| Streaming engine | Executes a plan in batches so inputs larger than memory fit |
| Replacement scan | DuckDB reading a Python DataFrame by its variable name |
| Zero-copy | Converting between libraries by sharing memory instead of copying |
| HUGEINT | DuckDB’s 128-bit integer, the result type of SUM over BIGINT |
| Banker’s rounding | Round half to even (pandas/NumPy); SQL rounds half away from zero |
| Sessionization | Grouping events into sessions separated by inactivity gaps |
| DAU / conversion | Daily active users / share of active users who purchased |
| Reconciliation | Checking that counts or totals add up across steps (raw = valid + rejected + duplicates) |

---

<a id="slide-54"></a>
## 54. What to remember, and what comes next

*Reference · recap and the next decks*

1. **A DataFrame is typed columns plus an index.** Check dtypes after loading; keep a plain RangeIndex in pipelines; beware alignment.
2. **pandas 3.0 changed defaults.** Copy-on-Write: one-step `.loc` assignment, no chained `inplace`. Text is `str`; datetimes are microseconds. Cluster runtimes may still run 2.x.
3. **NULLs differ from SQL.** `!=` keeps NaN, all-NaN sums are 0, missing join keys match, missing group keys vanish.
4. **Order is explicit.** Sort with a tie-breaker before `shift`, `cumsum`, `drop_duplicates`; never trust SQL or Polars row order.
5. **Joins check themselves.** `validate=`, row-count assertions, `indicator=True` for anti-joins and diffs.
6. **Vectorize and chain.** Column expressions, `assign`/`pipe`, no row loops.
7. **Memory is measurable.** `memory_usage(deep=True)`, fewer columns, better dtypes, Parquet, chunks with decomposable aggregates.
8. **Polars is SQL-shaped.** Expressions, `over()` windows, lazy plans with pushdown, SQL-like NULL rules.
9. **Prove translations.** Same input, three engines, `assert_frame_equal`.

#### Practise this week

- Re-solve the ten problems (lessons 38–42) without opening the tabs, first in pandas, then in Polars.
- Do exercises 2, 5, 6 and 10 without the hints.
- Take a SQL report you know at work and port it to pandas; reconcile row counts and totals step by step.
- Run the lab on the files-and-streams deck’s larger generated event file and compare pandas, Polars and DuckDB times.

#### Coming up

Next in the Python track: the reliable-ingestion deck (lesson *Ingestion engineering*), which fetches API data and files and writes the Parquet that pandas, Polars and DuckDB read. Later, PySpark and Spark SQL on a lakehouse apply the same DataFrame ideas, distributed and lazy. The habits from this deck carry over directly: explicit schemas, NULL-aware joins, deterministic order, cardinality checks, and reconciliation.

> **The main idea:** think in SQL, write DataFrames, and check every place where the two disagree: NULLs, order, the index, and join cardinality.

---

<a id="slide-55"></a>
## 55. References and how this deck was tested

*References · official documentation*

- [pandas user guide](https://pandas.pydata.org/docs/user_guide/index.html): [data structures](https://pandas.pydata.org/docs/user_guide/dsintro.html), [indexing](https://pandas.pydata.org/docs/user_guide/indexing.html), [missing data](https://pandas.pydata.org/docs/user_guide/missing_data.html), [text](https://pandas.pydata.org/docs/user_guide/text.html), [time series](https://pandas.pydata.org/docs/user_guide/timeseries.html), [performance](https://pandas.pydata.org/docs/user_guide/enhancingperf.html).
- [Copy-on-Write](https://pandas.pydata.org/docs/user_guide/copy_on_write.html), [what’s new in 3.0](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html), [string dtype migration](https://pandas.pydata.org/docs/user_guide/migration-3-strings.html), [PyArrow functionality](https://pandas.pydata.org/docs/user_guide/pyarrow.html), [nullable integers](https://pandas.pydata.org/docs/user_guide/integer_na.html).
- [groupby](https://pandas.pydata.org/docs/user_guide/groupby.html), [merge, join, concat](https://pandas.pydata.org/docs/user_guide/merging.html), [reshaping](https://pandas.pydata.org/docs/user_guide/reshaping.html), [windowing](https://pandas.pydata.org/docs/user_guide/window.html), [comparison with SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html).
- [IO tools](https://pandas.pydata.org/docs/user_guide/io.html), [scaling to large datasets](https://pandas.pydata.org/docs/user_guide/scale.html), [PyArrow Parquet](https://arrow.apache.org/docs/python/parquet.html), [Apache Parquet](https://parquet.apache.org/docs/).
- [Polars expressions and contexts](https://docs.pola.rs/user-guide/concepts/expressions-and-contexts/), [lazy API](https://docs.pola.rs/user-guide/concepts/lazy-api/), [query plans](https://docs.pola.rs/user-guide/lazy/query-plan/), [streaming](https://docs.pola.rs/user-guide/concepts/streaming/), [coming from pandas](https://docs.pola.rs/user-guide/migration/pandas/).
- [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [SQL on pandas](https://duckdb.org/docs/stable/guides/python/sql_on_pandas), [window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [PIVOT](https://duckdb.org/docs/stable/sql/statements/pivot), [timestamps](https://duckdb.org/docs/stable/sql/data_types/timestamp).
- [Fabric runtimes](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime) and [runtime release notes](https://github.com/microsoft/synapse-spark-runtime) (library versions: pandas 2.1.4 on Runtime 1.3, 2.3.3 on Runtime 2.0, checked October 2026).

**Testing:** built with CPython 3.12.10, pandas 3.0.6, NumPy 2.5.3, PyArrow 25.0.1, Polars 1.44.2 and DuckDB 1.5.6 in one virtual environment on Windows 11. Every Python block ran inside the build in a scratch folder, in the order shown; SQL ran in DuckDB against the same DataFrames; every exercise solution ran with its tests. Random data uses fixed seeds. Timings and memory figures are labelled as measurements from the build machine and change from run to run.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · A filter with SQL NULL semantics

`customers["city"] != city` is True for Zoe because NaN is “not equal” to everything. Combine it with a second mask that is True only where the city is present.

<a id="hint-2"></a>
### Hint 2 · An enrichment join that checks itself

`merge(…, how="left", validate="many_to_one")` does the duplicate check. Keep the row-count `assert` as well: it also protects against future edits that change `how`.

<a id="hint-3"></a>
### Hint 3 · An inner join with SQL NULL semantics

Count `left[on].isna()` first. Then drop rows with missing keys from *both* sides before `merge`, and sort the result by `event_id` with a fresh index.

<a id="hint-4"></a>
### Hint 4 · Fix the Copy-on-Write bugs

Return a new frame with `assign`. For the conditional amount use `np.where(condition, discounted, original)`; for the city use `df["city"].fillna("unknown")` without `inplace`.

<a id="hint-5"></a>
### Hint 5 · Revenue by city that reconciles

Join with `validate="many_to_one"`, then either `fillna({"city": "(unknown)"})` before grouping or `groupby("city", dropna=False)` and relabel. A default `groupby("city")` returns only 180.

<a id="hint-6"></a>
### Hint 6 · Days to the second order, in pandas and Polars

pandas: sort by customer, date and order_id; `groupby("customer")["order_date"].shift(-1)` is `LEAD`; keep the row where `cumcount() == 0`. Polars: after sorting, `group_by(...).agg(pl.col("order_date").first(), pl.col("order_date").slice(1, 1).first())` gives the first and (possibly null) second date.

<a id="hint-7"></a>
### Hint 7 · Translate a pandas chain to Polars lazy

`size` → `pl.len()`, `mean` → `pl.col("amount").mean()`. The share needs the total of the aggregated `revenue` column: `pl.col("revenue") / pl.col("revenue").sum()` inside `with_columns`. Sort with `descending=[True, False]`.

<a id="hint-8"></a>
### Hint 8 · Find conflicting redeliveries

Clean with `assign` first. Then `drop_duplicates()` on all columns removes identical copies; any `event_id` still present more than once has conflicting copies: `groupby("event_id").size()`.

<a id="hint-9"></a>
### Hint 9 · Shrink a DataFrame

Loop over columns. `pd.api.types.is_string_dtype(s)` finds text; `s.nunique() / len(s)` is the distinct ratio. `pd.api.types.is_integer_dtype(s)` finds integers; `pd.to_numeric(s, downcast="integer")` picks the smallest type. Build a new frame; don’t modify the input.

<a id="hint-10"></a>
### Hint 10 · A chunked mean without averaging averages

Per chunk, keep the `sum` and the `count` per event type. At the end, add up sums and counts across chunks (`pd.concat(parts).groupby(level=0).sum()`) and divide.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · A filter with SQL NULL semantics

```python
def not_in_city(df, city):
    mask = (df["city"] != city) & df["city"].notna()
    return df[mask].reset_index(drop=True)

assert not_in_city(customers, "Austin")["customer"].tolist() == ["Leo"]
sql = duckdb.sql("SELECT customer FROM customers WHERE city <> 'Austin' ORDER BY customer").df()
assert not_in_city(customers, "Austin")["customer"].tolist() == sql["customer"].tolist()
assert len(not_in_city(customers, "Paris")) == 3
print(not_in_city(customers, "Paris")["customer"].tolist())
print("All tests passed")
```

Output:

```text
['Maya', 'Leo', 'Ana']
All tests passed
```

**Why it works.** SQL’s three-valued logic makes `NULL <> 'Austin'` unknown, and `WHERE` drops unknown rows. pandas has no “unknown” for `NaN` comparisons, so you add the `notna()` condition yourself. With the nullable `"string"` dtype the comparison would return `<NA>`, which a filter also treats as False; being explicit works for every dtype.

<a id="solution-2"></a>
### Solution 2 · An enrichment join that checks itself

```python
def enrich(facts, dim, key):
    out = facts.merge(dim, on=key, how="left", validate="many_to_one")
    assert len(out) == len(facts), f"row count changed: {len(facts)} -> {len(out)}"
    return out

out = enrich(orders, customers, "customer")
assert len(out) == len(orders) and out["amount"].sum() == 220
assert out.loc[out["customer"] == "Leo", "city"].unique().tolist() == ["Denver"]
customers_dup = pd.concat([customers, customers.iloc[[1]]], ignore_index=True)
try:
    enrich(orders, customers_dup, "customer")
except pd.errors.MergeError as e:
    print("MergeError:", str(e).splitlines()[0])
else:
    raise AssertionError("duplicate dimension key not detected")
print("All tests passed")
```

Output:

```text
MergeError: Merge keys are not unique in right dataset; not a many-to-one merge
All tests passed
```

**Why it works.** `validate="many_to_one"` checks that the right-hand keys are unique before joining, so the fan-out never happens. A left join cannot lose fact rows, and with unique dimension keys it cannot add any, so the assertion documents the contract and catches later mistakes.

<a id="solution-3"></a>
### Solution 3 · An inner join with SQL NULL semantics

```python
from pandas.testing import assert_frame_equal
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": ["u1", None, "u2", None]})
users = pd.DataFrame({"user_id": ["u1", "u2", None], "country": ["DE", "FR", "??"]})

def sql_inner_join(left, right, on):
    n_null = int(left[on].isna().sum())
    joined = (left.dropna(subset=[on])
                  .merge(right.dropna(subset=[on]), on=on, how="inner")
                  .sort_values("event_id", ignore_index=True))
    return joined, n_null

print("plain merge rows:", len(events.merge(users, on="user_id")))     # NaN matched NaN
joined, n_null = sql_inner_join(events, users, "user_id")
assert joined["event_id"].tolist() == [1, 3] and n_null == 2
assert "??" not in joined["country"].tolist()
expected = duckdb.sql("""SELECT e.event_id, user_id, u.country
                         FROM events e JOIN users u USING (user_id) ORDER BY e.event_id""").df()
assert_frame_equal(joined, expected, check_dtype=False)
print(joined)
print("All tests passed")
```

Output:

```text
plain merge rows: 4
   event_id user_id country
0         1      u1      DE
1         3      u2      FR
All tests passed
```

**Why it works.** A plain `merge` gives 4 rows: events 2 and 4 both match the `"??"` user through their missing keys. Dropping missing keys on both sides restores SQL semantics, and returning the count lets the pipeline log or alert on keyless rows instead of losing them silently.

<a id="solution-4"></a>
### Solution 4 · Fix the Copy-on-Write bugs

```python
def apply_discount(df):
    return df.assign(
        amount=np.where(df["customer"] == "Leo", df["amount"] * 0.9, df["amount"]),
        city=df["city"].fillna("unknown"),
    )

enriched = orders.merge(customers, on="customer", how="left")
enriched.loc[enriched["customer"] == "Ana", "city"] = None
before = enriched.copy()
out = apply_discount(enriched)
assert out.loc[out["customer"] == "Leo", "amount"].tolist() == [36.0, 54.0]
assert out["city"].isna().sum() == 0 and (out["city"] == "unknown").sum() == 1
pd.testing.assert_frame_equal(enriched, before)
print(out[["order_id", "customer", "city", "amount"]])
print("All tests passed")
```

Output:

```text
   order_id customer     city  amount
0         1     Maya   Austin    25.0
1         2     Maya   Austin    40.0
2         3      Leo   Denver    36.0
3         4     Maya   Austin    15.0
4         5      Leo   Denver    54.0
5         6      Ana  unknown    40.0
All tests passed
```

**Why it works.** Under Copy-on-Write, `df[mask]` and `df["city"]` behave as new objects, so writing into them never reaches `df`. A function that returns a new frame from `assign` is correct on every pandas version, and leaving the input untouched makes it safe to call twice. If you must modify in place, use one step: `df.loc[df["customer"] == "Leo", "amount"] *= 0.9` (after converting the column to float).

<a id="solution-5"></a>
### Solution 5 · Revenue by city that reconciles

```python
cust = customers.assign(city=customers["city"].where(customers["customer"] != "Ana"))

def revenue_by_city(orders, customers):
    return (orders.merge(customers, on="customer", how="left", validate="many_to_one")
                  .fillna({"city": "(unknown)"})
                  .groupby("city", as_index=False)
                  .agg(revenue=("amount", "sum")))

naive = orders.merge(cust, on="customer").groupby("city")["amount"].sum()
print("default groupby total:", naive.sum(), "of", orders["amount"].sum())
r = revenue_by_city(orders, cust)
assert r.set_index("city")["revenue"].to_dict() == {"(unknown)": 40, "Austin": 80, "Denver": 100}
assert r["revenue"].sum() == orders["amount"].sum()
print(r)
print("All tests passed")
```

Output:

```text
default groupby total: 180 of 220
        city  revenue
0  (unknown)       40
1     Austin       80
2     Denver      100
All tests passed
```

**Why it works.** The default `groupby` drops the missing-city group, so 40 of 220 disappears. Labelling the missing key makes the gap visible in the report, and the reconciliation assertion (sum of groups = total) is the check you would keep in a production job.

<a id="solution-6"></a>
### Solution 6 · Days to the second order, in pandas and Polars

```python
def days_to_second_order_pd(orders):
    o = orders.sort_values(["customer", "order_date", "order_id"])
    o = o.assign(next_date=o.groupby("customer")["order_date"].shift(-1),
                 n=o.groupby("customer").cumcount())
    first = o[o["n"] == 0]
    return (first.assign(days_to_second=(first["next_date"] - first["order_date"]).dt.days)
                 .rename(columns={"order_date": "first_order"})
                 [["customer", "first_order", "days_to_second"]]
                 .reset_index(drop=True))

def days_to_second_order_pl(po):
    return (po.sort("customer", "order_date", "order_id")
              .group_by("customer")
              .agg(first_order=pl.col("order_date").first(),
                   second_order=pl.col("order_date").slice(1, 1).first())
              .with_columns(days_to_second=(pl.col("second_order") - pl.col("first_order")).dt.total_days())
              .drop("second_order")
              .sort("customer"))

r = days_to_second_order_pd(orders)
assert r["customer"].tolist() == ["Ana", "Leo", "Maya"]
assert r["days_to_second"].tolist()[1:] == [5.0, 2.0] and pd.isna(r["days_to_second"].iloc[0])
rp = days_to_second_order_pl(pl.from_pandas(orders))
assert rp["customer"].to_list() == ["Ana", "Leo", "Maya"]
assert rp["days_to_second"].to_list() == [None, 5, 2]
print(r)
print(rp)
print("All tests passed")
```

Output:

```text
  customer first_order  days_to_second
0      Ana  2026-01-10             NaN
1      Leo  2026-01-05             5.0
2     Maya  2026-01-03             2.0
shape: (3, 3)
┌──────────┬─────────────────────┬────────────────┐
│ customer ┆ first_order         ┆ days_to_second │
│ ---      ┆ ---                 ┆ ---            │
│ str      ┆ datetime[μs]        ┆ i64            │
╞══════════╪═════════════════════╪════════════════╡
│ Ana      ┆ 2026-01-10 00:00:00 ┆ null           │
│ Leo      ┆ 2026-01-05 00:00:00 ┆ 5              │
│ Maya     ┆ 2026-01-03 00:00:00 ┆ 2              │
└──────────┴─────────────────────┴────────────────┘
All tests passed
```

**Why it works.** Both versions sort first so “first” and “second” are well defined, with `order_id` as a tie-breaker. In pandas the missing second order is `NaT`, so the difference is `NaN` and the column is float. In Polars, `slice(1, 1)` of a one-element group is empty and `first()` of empty is `null`; the column stays integer. The Polars `group_by` keeps rows in their input order within each group, but not the order of groups, hence the final `sort`.

<a id="solution-7"></a>
### Solution 7 · Translate a pandas chain to Polars lazy

```python
from pandas.testing import assert_frame_equal

def summary_pd(orders):
    total = orders["amount"].sum()
    return (orders.groupby("customer", as_index=False)
                  .agg(n_orders=("order_id", "size"), revenue=("amount", "sum"),
                       avg_amount=("amount", "mean"))
                  .assign(avg_amount=lambda d: d["avg_amount"].round(2),
                          share=lambda d: (d["revenue"] / total).round(3))
                  .sort_values(["revenue", "customer"], ascending=[False, True], ignore_index=True))

def summary_pl(lf):
    return (lf.group_by("customer")
              .agg(n_orders=pl.len(),
                   revenue=pl.col("amount").sum(),
                   avg_amount=pl.col("amount").mean().round(2))
              .with_columns(share=(pl.col("revenue") / pl.col("revenue").sum()).round(3))
              .sort(["revenue", "customer"], descending=[True, False]))

lazy = summary_pl(pl.from_pandas(orders).lazy())
assert isinstance(lazy, pl.LazyFrame)
assert_frame_equal(lazy.collect().to_pandas(), summary_pd(orders), check_dtype=False)
print(lazy.collect())
print("All tests passed")
```

Output:

```text
shape: (3, 5)
┌──────────┬──────────┬─────────┬────────────┬───────┐
│ customer ┆ n_orders ┆ revenue ┆ avg_amount ┆ share │
│ ---      ┆ ---      ┆ ---     ┆ ---        ┆ ---   │
│ str      ┆ u32      ┆ i64     ┆ f64        ┆ f64   │
╞══════════╪══════════╪═════════╪════════════╪═══════╡
│ Leo      ┆ 2        ┆ 100     ┆ 50.0       ┆ 0.455 │
│ Maya     ┆ 3        ┆ 80      ┆ 26.67      ┆ 0.364 │
│ Ana      ┆ 1        ┆ 40      ┆ 40.0       ┆ 0.182 │
└──────────┴──────────┴─────────┴────────────┴───────┘
All tests passed
```

**Why it works.** Each pandas step has a Polars expression: named aggregations become aliased expressions inside `agg`, `assign` becomes `with_columns`, and `sort_values` becomes `sort`. The total is computed as an expression over the aggregated frame instead of a Python variable, so the whole thing stays one lazy plan the optimiser can see.

<a id="solution-8"></a>
### Solution 8 · Find conflicting redeliveries

```python
deliveries = pd.DataFrame({
    "event_id": ["e1", "e2", "e2", "e3", "e3", "e4"],
    "user_id":  ["u1", "u2", "U2 ", "u3", "u3", "u4"],
    "amount":   ["10", "5.00", "5", "7.5", "8.5", "1"],
})

def conflicting_ids(df):
    clean = df.assign(user_id=df["user_id"].str.strip().str.lower(),
                      amount=pd.to_numeric(df["amount"], errors="coerce"))
    sizes = clean.drop_duplicates().groupby("event_id").size()
    return sorted(sizes[sizes > 1].index.tolist())

assert conflicting_ids(deliveries) == ["e3"]
assert conflicting_ids(deliveries[deliveries["event_id"] != "e3"]) == []
print(conflicting_ids(deliveries))

pl_conflicts = (pl.from_pandas(deliveries)
                  .with_columns(pl.col("user_id").str.strip_chars().str.to_lowercase(),
                                pl.col("amount").cast(pl.Float64))
                  .unique()
                  .filter(pl.col("event_id").is_duplicated())["event_id"].unique().sort().to_list())
assert pl_conflicts == ["e3"]
print("All tests passed")
```

Output:

```text
['e3']
All tests passed
```

**Why it works.** Cleaning first makes harmless differences (`"U2 "` vs `"u2"`, `"5"` vs `"5.00"`) disappear. After removing exact duplicates, an ID that still repeats must have copies that differ in some column. The Polars version uses `unique()` and `is_duplicated()` for the same idea. In the lab, this check stops the job rather than guessing which copy is right.

<a id="solution-9"></a>
### Solution 9 · Shrink a DataFrame

```python
rng = np.random.default_rng(0)
n = 200_000
df = pd.DataFrame({
    "country": rng.choice(["DE", "FR", "US", "BR"], n),
    "user_id": pd.Series(rng.integers(0, 150_000, n)).map("u{:06d}".format),
    "clicks": rng.integers(0, 100, n),
})

def shrink(df, max_unique_ratio=0.5):
    out = {}
    for name, s in df.items():
        if pd.api.types.is_string_dtype(s) and s.nunique() / len(s) <= max_unique_ratio:
            out[name] = s.astype("category")
        elif pd.api.types.is_integer_dtype(s):
            out[name] = pd.to_numeric(s, downcast="integer")
        else:
            out[name] = s
    return pd.DataFrame(out, index=df.index)

small = shrink(df)
assert small["country"].dtype == "category" and small["user_id"].dtype != "category"
assert small["clicks"].dtype == "int8"
assert small.memory_usage(deep=True).sum() < 0.6 * df.memory_usage(deep=True).sum()
assert (small["country"].astype("str") == df["country"]).all() and (small["clicks"] == df["clicks"]).all()
print("distinct ratio user_id:", round(df["user_id"].nunique() / n, 2))
before, after = df.memory_usage(deep=True), small.memory_usage(deep=True)
print(pd.DataFrame({"before_KiB": before // 1024, "after_KiB": after // 1024}))
print("All tests passed")
```

Output (memory measured on the build machine):

```text
distinct ratio user_id: 0.55
         before_KiB  after_KiB
Index             0          0
country        1953        195
user_id        2929       2929
clicks         1562        195
All tests passed
```

**Why it works.** A categorical stores each distinct string once plus a small integer code per row, which pays off only when values repeat a lot: four countries in 200,000 rows shrink to one byte per row, while `user_id` is mostly distinct and would gain nothing. `downcast="integer"` checks the actual min and max, so 0–99 fits in `int8`. Never downcast blindly: tomorrow’s data may not fit, so do it in a reporting step, not a schema contract.

<a id="solution-10"></a>
### Solution 10 · A chunked mean without averaging averages

```python
rng = np.random.default_rng(1)
sample = pd.DataFrame({"event_type": rng.choice(["a", "b", "c"], 10_000, p=[0.7, 0.2, 0.1]),
                       "amount": rng.integers(1, 1000, 10_000) / 10})
sample.to_csv("data/sample_events.csv", index=False)

def chunked_mean(path, chunksize):
    parts = [chunk.groupby("event_type")["amount"].agg(["sum", "count"])
             for chunk in pd.read_csv(path, chunksize=chunksize)]
    totals = pd.concat(parts).groupby(level=0).sum()
    return totals["sum"] / totals["count"]

expected = sample.groupby("event_type")["amount"].mean()
for size in (999, 4_000, 20_000):
    got = chunked_mean("data/sample_events.csv", size)
    assert np.allclose(got.sort_index(), expected.sort_index())

wrong = pd.concat([c.groupby("event_type")["amount"].mean()
                   for c in pd.read_csv("data/sample_events.csv", chunksize=999)]).groupby(level=0).mean()
print(pd.DataFrame({"correct": expected.round(4), "average_of_averages": wrong.round(4)}))
print("All tests passed")
```

Output:

```text
            correct  average_of_averages
event_type                              
a           49.3695              49.6577
b           49.3884              49.3134
c           49.7141              49.6554
All tests passed
```

**Why it works.** A mean is not decomposable by itself, but sum and count are, and the mean is their ratio. Averaging per-chunk averages weights a small last chunk (10,000 = 10 × 999 + 10 rows) the same as a full one, which shifts the result. The same sum-and-count trick is how distributed engines compute `AVG` across partitions.
