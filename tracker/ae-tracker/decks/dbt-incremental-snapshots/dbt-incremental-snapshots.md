# dbt incremental models, snapshots and unit tests

*Companion to `dbt-incremental-snapshots.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Tested with:** dbt-core 1.12.5 and the dbt-duckdb adapter 1.11.0 (DuckDB 1.5.6) on CPython 3.12.10, Windows 11 (64-bit); packages dbt_utils 1.4.1 and dbt_expectations 0.10.10 (with dbt_date 0.21.0) installed by `dbt deps`. SQL dialect: DuckDB. Every dbt command shown was executed while building this document, in a real project folder, and its real output is shown. Output was normalised in three ways only: the leading clock time on each dbt log line was removed, durations were replaced by `x.xx`, and absolute folder paths were replaced by `<project>` or `~`. Some long outputs are trimmed (marked). Fabric Data Warehouse, Snowflake, BigQuery and Databricks support a different set of incremental strategies; where that matters the deck says so, and nothing that needs a hosted warehouse is shown as executed.

**Series:** this is a *gap deck* in the dbt series. It starts from the finished project of *dbt Jinja and macros: templates, loops, reusable SQL* (folder `dbt-jinja-macros-project/` next to that deck) and goes deep on what that deck only previewed in its lessons 7–8. The finished project of this deck is in `dbt-incremental-snapshots-project/` next to this file; the lab (lessons 23–24) rebuilds it day by day from an empty folder.

**Prerequisites:** *dbt fundamentals: source data to trusted marts* (sources, ref, layers, materializations, generic and singular tests, selectors) and *dbt Jinja and macros* (Jinja, macros, the incremental/snapshot/unit-test preview). SCD type 2 comes from the dimensional-modeling decks. New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note. Packages in general (dbt_utils macros, codegen, project evaluator, SQLFluff) are the subject of the deck *dbt packages and project quality*; here they appear only as test libraries.

**Interview focus:** the interview questions and exercises follow common dbt interview patterns (research done in October 2026 from public interview guides, candidates’ write-ups and the dbt documentation: incremental strategies, late data and idempotency, backfills, on_schema_change, snapshot strategies and hard deletes, unit vs data tests, test configs). All questions are original and use the Leafy project.

**Additions beyond the original brief** are marked *(added)*: microbatch with a `lookback` and an explicit backfill window; reading the SQL dbt actually ran (`target/run`) for merge and delete+insert; the incremental-vs-full-refresh equivalence check as a reusable script; `insert_overwrite` tried on DuckDB to show adapter support is real; snapshots of a delta feed versus a full extract (when `hard_deletes` is wrong); an SCD2 dimension built on top of a snapshot; a unit test of the incremental branch with `this` and overrides; a “which tool?” decision table, a bug clinic and interview questions with model answers.

## Contents

1. [dbt incremental models, snapshots and unit tests](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up: start from the Jinja-and-macros project](#slide-2)
3. [The running example: reviews that arrive late and get edited](#slide-3)
4. [How an incremental run works: is_incremental() and {{ this }}](#slide-4)
5. [Strategy 1, append: fast, and duplicates on every re-send](#slide-5)
6. [Strategies 2 and 3: unique_key with merge or delete+insert](#slide-6)
7. [The five strategies, and which one to choose](#slide-7)
8. [Late-arriving data: the high-water mark silently skips rows](#slide-8)
9. [The fix: a look-back window plus merge](#slide-9)
10. [Prove it: the incremental table must equal a full rebuild](#slide-10)
11. [Schema changes: on_schema_change and when to full-refresh](#slide-11)
12. [Microbatch: incremental by time batches, with a lookback](#slide-12)
13. [Snapshots with the timestamp strategy](#slide-13)
14. [The check strategy, and how to choose between the two](#slide-14)
15. [Hard deletes: when a row disappears from the source](#slide-15)
16. [History limits, the project snapshot, and an SCD2 dimension](#slide-16)
17. [Unit test 1: the dedupe rule in staging](#slide-17)
18. [Unit test 2: the incremental branch, with this and overrides](#slide-18)
19. [Unit test 3, and unit tests versus data tests](#slide-19)
20. [Data tests that fit reality: where, thresholds, severity, store_failures](#slide-20)
21. [Test packages and a singular test on the snapshot](#slide-21)
22. [Interview pattern: which tool for which data?](#slide-22)
23. [Lab: incremental reviews and a supplier history](#slide-23)
24. [Lab: replay the week and verify against a full rebuild](#slide-24)
25. [Bug clinic: incremental models, snapshots and tests](#slide-25)
26. [Interview questions: incremental models](#slide-26)
27. [Interview questions: snapshots and tests](#slide-27)
28. [Exercises 1–3: warm-ups](#slide-28)
29. [Exercises 4–5: late data and table comparison](#slide-29)
30. [Exercises 6–7: aggregates and delta feeds](#slide-30)
31. [Exercises 8–10: tests and design](#slide-31)
32. [Cheat sheet](#slide-32)
33. [Glossary](#slide-33)
34. [What to remember, and what comes next](#slide-34)
35. [References and how this deck was tested](#slide-35)
36. [Appendix A · Hints](#appendix-a)
37. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. dbt incremental models, snapshots and unit tests

**

The *dbt Jinja and macros* deck previewed an incremental model, a snapshot and one unit test. This deck goes all the way: every incremental strategy, late-arriving reviews caught by a **look-back window**, a check that the incremental table equals a full rebuild, snapshots with the timestamp and check strategies and hard deletes, three unit tests on tricky logic, and data tests with thresholds and test packages. The running example is Leafy, the plant shop: product reviews that arrive late and get edited, and a supplier catalogue whose labels change. Every `dbt` command ran while the deck was built, day by day.

- **Start here:** the Jinja-and-macros project plus reviews and a supplier feed that arrive day by day.
- **Part A, incremental:** `is_incremental()`, `unique_key`, five strategies, the look-back window, the equivalence check, `on_schema_change`, microbatch.
- **Part B, snapshots:** timestamp vs check, hard deletes, history limits, an SCD2 dimension.
- **Part C, tests:** three unit tests, unit vs data tests, `where` / thresholds / `store_failures`, dbt_utils and dbt_expectations.
- **Project:** a lab that replays four days and verifies against a full rebuild; then a bug clinic, interview questions, 10 exercises, a cheat sheet, a glossary and references.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Rebuilding every table every night stops working when facts reach hundreds of millions of rows: runs take hours and cost real money. Incremental models fix the cost, but they add a new class of bugs: rows that arrive late are skipped, re-sent rows are duplicated, and nothing fails. Meanwhile many sources overwrite themselves (a CRM, a product catalogue), so yesterday’s values are gone unless something records them. Snapshots keep that history, and unit tests and tuned data tests are how you prove that both kinds of model do what you think.

#### Where you will use it

- Large event and fact tables: incremental with merge and a look-back window, or microbatch.
- History of mutable sources (customers, products, prices): snapshots and SCD2 dimensions.
- Pull requests that touch dedupe, CASE ladders or incremental filters: unit tests.
- Daily operations: data tests with thresholds that warn instead of crying wolf.

#### What goes wrong without it

- A dashboard quietly missing late orders for weeks.
- Duplicate rows after a retry or a re-sent file, inflating revenue.
- No answer to “what was this product’s label last month?”.
- A refactor that changes a rule nobody tested; a test that is red every day and ignored.

#### Who expects you to know it

- Analytics engineers: incremental models, snapshots and tests are core dbt work.
- Data engineers and on-call: backfills, full refreshes and repairs.
- Interviewers: “merge vs append?”, “late data?”, “timestamp or check?”, “unit vs data tests?”.

> **On the job:** The review model takes 40 minutes and finance asks for it hourly. You make it incremental with merge and a 3-day look-back, add a unit test for the window boundary, and schedule a weekly check against a full rebuild. Two weeks later the check flags reviews from a partner that sends a week late, and you widen the window once instead of discovering the gap in a quarterly review.

> **The main idea:** incremental models save time only if they stay equal to a full rebuild; snapshots keep history only of what they observe; tests make both verifiable.

*Read more:* [dbt: About incremental models](https://docs.getdbt.com/docs/build/incremental-models-overview), [dbt: Snapshots](https://docs.getdbt.com/docs/build/snapshots), [dbt: Unit tests](https://docs.getdbt.com/docs/build/unit-tests).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A large fact (tens of millions of rows or more) that is slow or expensive to rebuild | Incremental: merge + look-back, or microbatch | Processes only recent data; correct with a window and a key |
| Immutable events delivered exactly once | Incremental append | Cheapest write |
| A source that overwrites values you need historically | Snapshot (SCD2) + a dimension on top | The only way to keep the old values |
| A rule that is easy to get subtly wrong | A unit test with designed rows | Fails before the data is wrong |
| A small table, or logic over all history | A plain table | Incremental adds risk without saving time |
| You need every change, not one per run | CDC or an event stream, not a snapshot | Snapshots only see the state when they run |

#### How interviews test it

- “Explain merge, delete+insert, append, insert_overwrite; when each?”
- “How do you handle late-arriving data? How do you test an incremental model?”
- “Timestamp or check strategy? What about hard deletes?”
- “Unit tests vs data tests; how do you keep tests from being ignored?”

#### Where it sits in your learning path

- Builds on: *dbt fundamentals* (materializations, tests, selectors) and *dbt Jinja and macros* (Jinja, the preview in its lessons 7–8); SCD2 from the dimensional-modeling decks.
- Next: deployment and CI (state, defer, building changed incremental models twice), and *dbt packages and project quality*.

> **The main idea:** reach for incremental models when rebuilds are too slow, snapshots when sources overwrite history, unit tests when rules are subtle; prove each one, and keep small things simple.

---

<a id="slide-2"></a>
## 2. Set up: start from the Jinja-and-macros project

*Start here · versions, starting point, and what was not executed*

| Item | Detail |
|---|---|
| Tested with | **dbt-core 1.12.5** with **dbt-duckdb 1.11.0** (DuckDB 1.5.6) on CPython 3.12.10, Windows 11. Packages: dbt_utils 1.4.1, dbt_expectations 0.10.10 (needs dbt_date 0.21.0). Minimums: dbt 1.8 for unit tests, dbt 1.9 for microbatch, YAML snapshots and `hard_deletes`; DuckDB 1.4 for the `merge` strategy. |
| Starting point | The finished project of *dbt Jinja and macros* (`dbt-jinja-macros-project/`), copied to a new folder. Its preview models for incremental and snapshots lived in a scratch copy, so this project has none yet. |
| New in this deck | Two new raw sources (reviews, supplier catalogue), a loader that replays them day by day, `packages.yml`, a `lessons` folder for teaching variants, and a `snapshots` folder. |
| Not executed | `insert_overwrite` on BigQuery/Spark and the dbt Learn courses need hosted services; they are described, never shown with output. Everything else ran locally. |
| Outputs | Real. Clock times removed, durations shown as `x.xx`, machine paths replaced by `<project>` or `~`. Long outputs are trimmed and labelled. |

#### Copy, add packages, install them

```text
# in a copy of dbt-jinja-macros-project, with the dbt virtual environment active
python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0   # same as earlier decks
$env:DBT_PROFILES_DIR = (Get-Location).Path   # profiles.yml lives in the project folder
```

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.3.0", "<2.0.0"]
  - package: metaplane/dbt_expectations     # the maintained fork of calogica/dbt_expectations
    version: [">=0.10.0", "<0.11.0"]
```

Terminal (output trimmed):

```text
$ dbt deps
Installing dbt-labs/dbt_utils
Installed from version 1.4.1
Installing metaplane/dbt_expectations
Installed from version 0.10.10
Installing godatadriven/dbt_date
Installed from version 0.21.0
```

A **package** is another dbt project you install into `dbt_packages/`; `dbt deps` resolves the version ranges and writes `package-lock.yml`. Here they only provide extra tests (lesson 21).

#### Load the events, land day 1 of the new data, build

Terminal:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-02
2026-03-02: raw.reviews 3 rows from 1 files; raw.supplier_products 3 rows from products_2026-03-02.jsonl
```

Terminal (summary lines):

```text
$ dbt build
Finished running 2 seeds, 5 table models, 32 data tests, 4 view models in x.xx seconds (normalised).
Done. PASS=42 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=43
```

Green, with the one expected warning carried over from the earlier decks (event e7, amount “abc”). The new staging view `stg_reviews` is built too (next slide).

> **On the job:** Keep the path to your project short on Windows: `dbt deps` unpacks packages several folders deep and can hit the 260-character path limit. Setting `DBT_PROFILES_DIR` explicitly avoids picking up a `profiles.yml` from your home folder by accident.

> **The main idea:** start from the green project of the previous deck, add the new sources and test packages, and check the build is still green before changing anything.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Packages](https://docs.getdbt.com/docs/build/packages), [DuckDB setup (dbt docs)](https://docs.getdbt.com/docs/local/connect-data-platform/duckdb-setup).

---

<a id="slide-3"></a>
## 3. The running example: reviews that arrive late and get edited

*Start here · one small dataset with every incremental trap in it*

Leafy’s app sends product **reviews** in daily files. Like real event data, they are messy in exactly the ways that break incremental models: a review is *edited* and re-sent, a phone posts a review *days late* after being offline, a file is delivered twice, and an old app version rates out of 10. All times are UTC; `_loaded_at` is when the file landed in the warehouse.

| File (lands 23:00 UTC) | Rows | Trap |
|---|---|---|
| `reviews_2026-03-02.jsonl` | r1, r2, r3 | r3 rated 7 out of 10, time with a −06:00 offset |
| `reviews_2026-03-03.jsonl` | r2 (edited), r4, r5 | r2 re-sent with a new rating and `edited_at`; r5 has no rating |
| `reviews_2026-03-04.jsonl` | r6, r7 | r7 by customer u6, who is not in the CRM seed |
| `reviews_2026-03-05.jsonl` | r8, r9 (late), r6 (again) | r9 was written on 3 March, offline for two days; r6 delivered twice |
| `reviews_2026-03-06.jsonl` | r10 (very late), r11 | r10 was written on 27 February: a week late |

#### The loader replays the days

`scripts/load_day.py DAY` lands every file up to `DAY` in `raw.reviews` (like an append-only landing zone) and the latest supplier extract in `raw.supplier_products` (Part B). Running it with an earlier day “rewinds” the raw data, which is how each lesson replays the week.

Terminal:

```text
$ python scripts/load_day.py 2026-03-06
2026-03-06: raw.reviews 13 rows from 5 files; raw.supplier_products 3 rows from products_2026-03-04.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select stg_reviews
1 of 1 OK created sql view model main_staging.stg_reviews ...................... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### Staging: one row per review, latest edit wins

```sql
# models/staging/stg_reviews.sql (dedupe and rating logic)
case    -- the old app sent ratings out of 10; convert to 1-5, half away from zero
    when rating_scale = 10 and rating_raw between 1 and 10 then cast(round(rating_raw / 2) as integer)
    when rating_scale = 5  and rating_raw between 1 and 5  then rating_raw
end as rating
...
qualify row_number() over (
    partition by review_id
    order by updated_at_utc desc, _loaded_at desc   -- latest edit wins; then the latest delivery
) = 1
```

The full model is in the project (`models/staging/stg_reviews.sql`); dedupe with `QUALIFY` and the `to_utc` macro come from the earlier decks. `updated_at_utc` is the edit time, or the submit time if never edited.

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select review_id as id, rating_raw as raw, rating_scale as scale, rating,
                            submitted_at_utc, updated_at_utc, _loaded_at
                     from main_staging.stg_reviews order by try_cast(substr(review_id, 2) as int)"""))
```

Output:

```text
┌─────────┬───────┬───────┬────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│   id    │  raw  │ scale │ rating │  submitted_at_utc   │   updated_at_utc    │     _loaded_at      │
│ varchar │ int32 │ int32 │ int32  │      timestamp      │      timestamp      │      timestamp      │
├─────────┼───────┼───────┼────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│ r1      │     5 │     5 │      5 │ 2026-03-02 10:00:00 │ 2026-03-02 10:00:00 │ 2026-03-02 23:00:00 │
│ r2      │     2 │     5 │      2 │ 2026-03-02 12:00:00 │ 2026-03-03 08:00:00 │ 2026-03-03 23:00:00 │
│ r3      │     7 │    10 │      4 │ 2026-03-02 21:00:00 │ 2026-03-02 21:00:00 │ 2026-03-02 23:00:00 │
│ r4      │     3 │     5 │      3 │ 2026-03-03 09:00:00 │ 2026-03-03 09:00:00 │ 2026-03-03 23:00:00 │
│ r5      │  NULL │     5 │   NULL │ 2026-03-03 11:00:00 │ 2026-03-03 11:00:00 │ 2026-03-03 23:00:00 │
│ r6      │     5 │     5 │      5 │ 2026-03-04 10:00:00 │ 2026-03-04 10:00:00 │ 2026-03-05 23:00:00 │
│ r7      │     9 │    10 │      5 │ 2026-03-04 12:00:00 │ 2026-03-04 12:00:00 │ 2026-03-04 23:00:00 │
│ r8      │     1 │     5 │      1 │ 2026-03-05 09:00:00 │ 2026-03-05 09:00:00 │ 2026-03-05 23:00:00 │
│ r9      │     5 │     5 │      5 │ 2026-03-03 20:00:00 │ 2026-03-03 20:00:00 │ 2026-03-05 23:00:00 │
│ r10     │     4 │     5 │      4 │ 2026-02-27 18:00:00 │ 2026-02-27 18:00:00 │ 2026-03-06 23:00:00 │
│ r11     │     5 │     5 │      5 │ 2026-03-06 10:00:00 │ 2026-03-06 10:00:00 │ 2026-03-06 23:00:00 │
└─────────┴───────┴───────┴────────┴─────────────────────┴─────────────────────┴─────────────────────┘
  11 rows                                                                                  7 columns
```

Eleven reviews, one row each. r2 shows the edit (rating 2, updated 3 March); r3 and r7 were converted from a 10-point scale; r5 has no rating; r9 and r10 were submitted long before they landed. After this check the loader was rewound to day 1:

Terminal:

```text
$ python scripts/load_day.py 2026-03-02
2026-03-02: raw.reviews 3 rows from 1 files; raw.supplier_products 3 rows from products_2026-03-02.jsonl
```

> **On the job:** Mobile apps, IoT devices and partner feeds all deliver late, twice, or edited. Before making a model incremental, list how late data can arrive and whether rows change after they are first sent: that decides the watermark, the key and the look-back window.

> **The main idea:** before writing an incremental model, know your data’s arrival pattern: late rows, edits, redeliveries. The rest of the deck replays this week day by day.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [loaded_at_field and freshness](https://docs.getdbt.com/reference/resource-properties/freshness).

---

<a id="slide-4"></a>
## 4. How an incremental run works: is_incremental() and {{ this }}

*Part A · what happens on the first run, and on every run after it*

Recap from *dbt Jinja and macros* (lesson 7): an **incremental model** is a table that, after it exists, is updated with only the new or changed rows instead of being rebuilt. This lesson looks at exactly what dbt does on each run.

#### The model and its two runs

```sql
# models/lessons/fct_reviews_append.sql
{{ config(materialized='incremental') }}
-- fct_reviews_append: no unique_key, so later runs only INSERT new rows (append).
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from {{ ref('stg_reviews') }}
{% if is_incremental() %}
where updated_at_utc > (select max(updated_at_utc) from {{ this }})   -- the high-water mark
{% endif %}
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_append   # run 1: the table does not exist yet
1 of 1 OK created sql incremental model main_lessons.fct_reviews_append ........ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```sql
-- target/compiled/leafy/models/lessons/fct_reviews_append.sql (generated by dbt)
-- fct_reviews_append: no unique_key, so later runs only INSERT new rows (append).
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from "leafy"."main_staging"."stg_reviews"
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_append   # run 2, same data
1 of 1 OK created sql incremental model main_lessons.fct_reviews_append ........ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```sql
-- target/compiled/leafy/models/lessons/fct_reviews_append.sql (generated by dbt)
-- fct_reviews_append: no unique_key, so later runs only INSERT new rows (append).
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from "leafy"."main_staging"."stg_reviews"
where updated_at_utc > (select max(updated_at_utc) from "leafy"."main_lessons"."fct_reviews_append")   -- the high-water mark
```

#### The rules

| Piece | Meaning |
|---|---|
| `is_incremental()` | A dbt macro that returns true only if **all** hold: the model is `materialized='incremental'`, its table already exists, and the run is not `--full-refresh`. |
| `{{ this }}` | The model’s own existing table (here `"leafy"."main_lessons"."fct_reviews_append"`). Only meaningful inside the incremental branch. |
| **high-water mark** (watermark) | The largest value of a time column already loaded: `max(updated_at_utc)` from `{{ this }}`. Rows above it are “new”. |
| **temp relation** | On later runs dbt first saves the model’s SELECT result in a temporary table, then applies the **incremental strategy** (the SQL that moves those rows into the target). |

```sql
-- target/run/leafy/models/lessons/fct_reviews_append.sql (generated by dbt)
    insert into "leafy"."main_lessons"."fct_reviews_append" ("review_id", "product_id", "customer_id", "rating", "review_date", "submitted_at_utc", "updated_at_utc", "_loaded_at")
    (
        select "review_id", "product_id", "customer_id", "rating", "review_date", "submitted_at_utc", "updated_at_utc", "_loaded_at"
        from "fct_reviews_append__dbt_tmp<timestamp>"
    )
  
```

Run 1 is a plain `create table as`. Run 2 put the filtered SELECT in a temp table and then ran the strategy, here an `insert`: zero rows, because nothing is newer than the watermark.

**Coming from C#:** think of the model as a pure function and the strategy as how its output is written: `table.AddRange(newRows)` for append, an upsert by key for merge.

> **On the job:** When an incremental model misbehaves, the first two things to read are the compiled SQL of the latest run (`target/compiled`, with the filter) and the statements dbt executed (`target/run`, or `logs/dbt.log`). Most bugs are visible there.

> **The main idea:** run 1 creates the table from the full SELECT; every later run filters with is_incremental(), stores the result in a temp table, and applies a strategy to the existing table.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [dbt Jinja functions](https://docs.getdbt.com/reference/dbt-jinja-functions), [this](https://docs.getdbt.com/reference/dbt-jinja-functions/this).

---

<a id="slide-5"></a>
## 5. Strategy 1, append: fast, and duplicates on every re-send

*Part A · what happens without a unique_key*

Day 2 lands: the edited r2 (rating 2, edited 3 March 08:00) plus r4 and r5. Their `updated_at_utc` is above the watermark, so the model inserts all three.

#### Day 2

Terminal:

```text
$ python scripts/load_day.py 2026-03-03
2026-03-03: raw.reviews 6 rows from 2 files; raw.supplier_products 3 rows from products_2026-03-03.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_append   # day 2
1 of 1 OK created sql incremental model main_lessons.fct_reviews_append ........ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select review_id, rating, updated_at_utc, _loaded_at
    from {{ ref('fct_reviews_append') }}
    order by review_id, updated_at_utc"
Previewing inline node:
| review_id | rating |      updated_at_utc |          _loaded_at |
| --------- | ------ | ------------------- | ------------------- |
| r1        |      5 | 2026-03-02 10:00:00 | 2026-03-02 23:00:00 |
| r2        |      4 | 2026-03-02 12:00:00 | 2026-03-02 23:00:00 |
| r2        |      2 | 2026-03-03 08:00:00 | 2026-03-03 23:00:00 |
| r3        |      4 | 2026-03-02 21:00:00 | 2026-03-02 23:00:00 |
| r4        |      3 | 2026-03-03 09:00:00 | 2026-03-03 23:00:00 |
| r5        |        | 2026-03-03 11:00:00 | 2026-03-03 23:00:00 |
```

#### What went wrong, and when append is right

**Append** inserts the new rows and never looks at the existing ones. r2 now has two rows: the original rating 4 and the edited rating 2. Any `count(*)` or `avg(rating)` on this table is wrong, and the `unique` test on `review_id` would fail.

| Append is right when… | Append is wrong when… |
|---|---|
| rows are immutable facts (page views, sensor readings) | rows can be edited or re-sent |
| each row is delivered exactly once | a retry or a re-delivered file can repeat rows |
| you want the cheapest possible write | you need one row per key |

Without a `unique_key`, `append` is what most adapters do; on DuckDB the default strategy (delete+insert) behaves the same way when there is no key.

> **On the job:** Append-only tables with a downstream dedupe (a `QUALIFY row_number()` in the next model) are a common, cheap pattern for raw event logs. The bug is using append for an entity that changes, such as orders, reviews or tickets.

> **The main idea:** append never updates: use it only for immutable rows delivered once, or dedupe downstream.

*Read more:* [Incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [Incremental models](https://docs.getdbt.com/docs/build/incremental-models).

---

<a id="slide-6"></a>
## 6. Strategies 2 and 3: unique_key with merge or delete+insert

*Part A · one row per key, even when rows change*

A **`unique_key`** tells dbt the grain of the table: the column (or list of columns) that identifies a row. With a key, later runs replace rows that already exist instead of adding copies. Two strategies do that; the models differ only in the config line (`fct_reviews_di` uses `incremental_strategy='delete+insert'`).

#### Replay days 1 and 2

```sql
# models/lessons/fct_reviews_merge.sql
{{ config(materialized='incremental', unique_key='review_id', incremental_strategy='merge') }}
-- fct_reviews_merge: one row per review_id; later runs UPDATE matching keys and INSERT new ones.
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from {{ ref('stg_reviews') }}
{% if is_incremental() %}
where updated_at_utc > (select max(updated_at_utc) from {{ this }})   -- the high-water mark
{% endif %}
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_merge fct_reviews_di   # day 1
1 of 2 OK created sql incremental model main_lessons.fct_reviews_di ............ [OK in x.xxs]
2 of 2 OK created sql incremental model main_lessons.fct_reviews_merge ......... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-03
2026-03-03: raw.reviews 6 rows from 2 files; raw.supplier_products 3 rows from products_2026-03-03.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_merge fct_reviews_di   # day 2
1 of 2 OK created sql incremental model main_lessons.fct_reviews_di ............ [OK in x.xxs]
2 of 2 OK created sql incremental model main_lessons.fct_reviews_merge ......... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select review_id, rating, updated_at_utc, _loaded_at
    from {{ ref('fct_reviews_merge') }}
    order by review_id"
Previewing inline node:
| review_id | rating |      updated_at_utc |          _loaded_at |
| --------- | ------ | ------------------- | ------------------- |
| r1        |      5 | 2026-03-02 10:00:00 | 2026-03-02 23:00:00 |
| r2        |      2 | 2026-03-03 08:00:00 | 2026-03-03 23:00:00 |
| r3        |      4 | 2026-03-02 21:00:00 | 2026-03-02 23:00:00 |
| r4        |      3 | 2026-03-03 09:00:00 | 2026-03-03 23:00:00 |
| r5        |        | 2026-03-03 11:00:00 | 2026-03-03 23:00:00 |
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select count(*) as rows_that_differ
    from (select * from {{ ref('fct_reviews_merge') }} except select * from {{ ref('fct_reviews_di') }})"
Previewing inline node:
| rows_that_differ |
| ---------------- |
|                0 |
```

r2 has one row, with the edited rating, and both strategies produce the same table.

#### What each strategy executed on day 2

```sql
-- target/run/leafy/models/lessons/fct_reviews_merge.sql (generated by dbt)
    MERGE INTO "leafy"."main_lessons"."fct_reviews_merge" AS DBT_INTERNAL_DEST
        USING "fct_reviews_merge__dbt_tmp<timestamp>" AS DBT_INTERNAL_SOURCE
        ON (DBT_INTERNAL_SOURCE.review_id = DBT_INTERNAL_DEST.review_id)
    WHEN MATCHED
    THEN
        UPDATE BY NAME
    WHEN NOT MATCHED
    THEN
        INSERT BY NAME
  
```

```sql
-- target/run/leafy/models/lessons/fct_reviews_di.sql (generated by dbt)
            delete from "leafy"."main_lessons"."fct_reviews_di"
            where (
                review_id) in (
                select (review_id)
                from "fct_reviews_di__dbt_tmp<timestamp>"
            );
    insert into "leafy"."main_lessons"."fct_reviews_di" ("review_id", "product_id", "customer_id", "rating", "review_date", "submitted_at_utc", "updated_at_utc", "_loaded_at")
    (
        select "review_id", "product_id", "customer_id", "rating", "review_date", "submitted_at_utc", "updated_at_utc", "_loaded_at"
        from "fct_reviews_di__dbt_tmp<timestamp>"
    )
  
```

|  | **merge** | **delete+insert** |
|---|---|---|
| Statement | one `MERGE`: update matched keys, insert the rest | `DELETE` matching keys, then `INSERT` the whole batch |
| Partial updates | `merge_update_columns` / `merge_exclude_columns` keep some old values (for example `first_seen_at`) | no: the row is replaced |
| Where | default on Snowflake, BigQuery, Databricks; DuckDB ≥ 1.4, Postgres ≥ 15 | DuckDB and Postgres default when a key is set; also Snowflake, Fabric |
| Cost | one pass; can be slow on huge targets without pruning | two statements; often faster on large batches with a selective key |

**Pitfalls.** The key must be unique *inside each batch* too: two rows for r2 in one run make `MERGE` fail on most warehouses and make delete+insert insert both. A `NULL` key never matches anything, so those rows are inserted again on every run. A composite key is a list: `unique_key=['product_id', 'review_date']`.

> **On the job:** Most production incremental models are `merge` with a `unique_key` equal to the grain, plus a `unique` + `not_null` test on that key. If the test ever fails, the incremental logic or the upstream dedupe is broken.

> **The main idea:** a unique_key turns appends into upserts: merge updates in place, delete+insert replaces rows; both need a key that is unique and not null in every batch.

*Read more:* [Incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [unique_key](https://docs.getdbt.com/reference/resource-configs/unique_key).

---

<a id="slide-7"></a>
## 7. The five strategies, and which one to choose

*Part A · strategy map; adapter support is real, so test it*

| Strategy | What a later run does | Needs | Use when |
|---|---|---|---|
| `append` | insert the batch | nothing | immutable rows delivered once (lesson 5) |
| `merge` | update matched keys, insert new | `unique_key` | rows change or repeat; the default choice (lesson 6) |
| `delete+insert` | delete matching keys, insert batch | `unique_key` | no MERGE, or large batches with a selective key (lesson 6) |
| `insert_overwrite` | replace whole **partitions** (for example every day in the batch) | `partition_by`; BigQuery, Spark, Databricks | huge, date-partitioned facts where rewriting a few days is cheaper than a key lookup |
| `microbatch` | split the work into time batches by `event_time`; each batch is replaced | `event_time`, `batch_size`, `begin`; dbt 1.9+ | large time series; backfills and retries by batch (lesson 12) |

#### insert_overwrite on DuckDB: try it

```sql
# models/lessons/fct_reviews_io.sql
{{ config(materialized='incremental', incremental_strategy='insert_overwrite',
          partition_by='review_date') }}
-- fct_reviews_io: replace whole partitions (days). Supported on BigQuery, Spark, Databricks; not on DuckDB.
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from {{ ref('stg_reviews') }}
{% if is_incremental() %}
where cast(submitted_at_utc as date) >= (select max(review_date) - 2 from {{ this }})
{% endif %}
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_io   # run 1: just a CREATE TABLE
1 of 1 OK created sql incremental model main_lessons.fct_reviews_io ............ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_io   # run 2: the strategy is used for the first time
1 of 1 ERROR creating sql incremental model main_lessons.fct_reviews_io ........ [ERROR in x.xxs]
Completed with 1 error, 0 partial successes, and 0 warnings:
[ERROR]: in model fct_reviews_io (models\lessons\fct_reviews_io.sql)
  Runtime Error in model fct_reviews_io (models\lessons\fct_reviews_io.sql)
  The incremental strategy 'insert_overwrite' is not valid for this adapter
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

Run 1 succeeded because the first run never uses the strategy; it only creates the table. The error appears on run 2. The model was removed afterwards.

#### How to choose

- Is there a key that identifies a row, and can rows change or repeat? → `merge` (or `delete+insert` where merge is missing or slow).
- Is the table partitioned by date and are changes confined to recent days? → `insert_overwrite` on BigQuery/Spark, or `microbatch` on dbt 1.9+.
- Immutable, exactly-once rows? → `append`.
- Small table (under a few million rows) or complex logic (window functions over all history)? → stay with `table`: incremental adds risk, so earn it with real runtime savings.

Strategy support differs by adapter and version: DuckDB offers append, delete+insert, merge and microbatch; Fabric Data Warehouse, Snowflake, BigQuery and Databricks each have their own list and default. Check the adapter page before choosing.

> **On the job:** A bad strategy or partition config only fails on the second run, often in production the next morning. In CI, build every changed incremental model twice (or run it once on top of a copy of production with `--defer`) so the incremental branch actually executes.

> **The main idea:** choose the strategy from the data: key + changes → merge; partitions → insert_overwrite or microbatch; immutable → append; small → table. Run it twice before trusting it.

*Read more:* [Incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [About incremental models](https://docs.getdbt.com/docs/build/incremental-models-overview), [BigQuery insert_overwrite](https://docs.getdbt.com/reference/resource-configs/bigquery-configs#the-insert_overwrite-strategy).

---

<a id="slide-8"></a>
## 8. Late-arriving data: the high-water mark silently skips rows

*Part A · the most common incremental bug*

**Late-arriving data** are rows whose event time is older than rows you have already loaded: a phone that was offline, a partner that re-sends yesterday, a retry after an outage. A plain high-water mark assumes time only moves forward, so it drops them. To see it, the merge model is copied as `fct_reviews_naive` (same SQL) and the week is replayed with a small script.

#### Replay four days

```python
# scripts/replay.py (the loop)
while day <= last:
    subprocess.run([sys.executable, "scripts/load_day.py", day.isoformat()], check=True, capture_output=True)
    result = subprocess.run([DBT, *dbt_args, "--quiet"])        # --quiet: dbt prints errors only
    print(f"{day}: files landed; dbt {' '.join(dbt_args)} -> {'ok' if result.returncode == 0 else 'FAILED'}", flush=True)
```

Terminal:

```text
$ python scripts/replay.py 2026-03-02 2026-03-05 run --select fct_reviews_naive
2026-03-02: files landed; dbt run --select fct_reviews_naive -> ok
2026-03-03: files landed; dbt run --select fct_reviews_naive -> ok
2026-03-04: files landed; dbt run --select fct_reviews_naive -> ok
2026-03-05: files landed; dbt run --select fct_reviews_naive -> ok
```

Each day the script lands the files, then runs the dbt command you pass it (in its own process, because DuckDB allows only one writer at a time). Every run succeeded. Nothing looks wrong.

#### Which staged reviews are missing from the model?

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select s.review_id, s.submitted_at_utc, s.updated_at_utc, s._loaded_at
    from {{ ref('stg_reviews') }} as s
    anti join {{ ref('fct_reviews_naive') }} as f using (review_id)"
Previewing inline node:
| review_id |    submitted_at_utc |      updated_at_utc |          _loaded_at |
| --------- | ------------------- | ------------------- | ------------------- |
| r9        | 2026-03-03 20:00:00 | 2026-03-03 20:00:00 | 2026-03-05 23:00:00 |
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select max(updated_at_utc) as watermark_before_day_4
    from {{ ref('fct_reviews_naive') }}
    where _loaded_at < '2026-03-05'"
Previewing inline node:
| watermark_before_... |
| -------------------- |
|  2026-03-04 12:00:00 |
```

r9 was written on 3 March at 20:00 but landed on day 4. By then the table already held r7 (4 March 12:00), so the filter `updated_at_utc > max(updated_at_utc)` excluded r9, **forever**: no later run will look that far back. No test failed, because every row that *is* in the table is valid.

> **On the job:** “The dashboard is missing some orders, but only a few, and only from the last weeks” is the classic symptom. The fix is a look-back window (next lesson) plus a check that compares the incremental table with a full rebuild (lesson 10), not a bigger warehouse.

> **The main idea:** a plain watermark loses every row that arrives after a newer one; that loss is silent, so you must design for it and test for it.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Best practices: incremental models](https://docs.getdbt.com/best-practices/materializations/4-incremental-models).

---

<a id="slide-9"></a>
## 9. The fix: a look-back window plus merge

*Part A · re-read the last N days on every run*

A **look-back window** moves the filter back by a fixed amount: instead of “newer than the newest row”, the model re-reads “everything from N days before the newest row”. Rows in the window that already exist are merged (updated in place), so re-reading them is harmless; rows that arrived late are inserted. This is the project’s real review fact, in `models/marts`, with N from the variable `review_lookback_days` (3).

#### The model and the replay

```sql
# models/marts/fct_reviews.sql
{{
    config(
        materialized='incremental',
        unique_key='review_id',
        incremental_strategy='merge'
    )
}}
-- fct_reviews: one row per review (grain: review_id), the latest version of each review.
-- Each run re-reads a look-back window, so late and edited reviews are merged, not lost.
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from {{ ref('stg_reviews') }}
{% if is_incremental() %}
where updated_at_utc >= (
    -- coalesce: an existing but empty table (dbt run --empty) must not filter everything out
    select coalesce(max(updated_at_utc), timestamp '1900-01-01') - interval {{ var('review_lookback_days', 3) }} day
    from {{ this }}
)
{% endif %}
```

Terminal:

```text
$ python scripts/replay.py 2026-03-02 2026-03-05 run --select fct_reviews
2026-03-02: files landed; dbt run --select fct_reviews -> ok
2026-03-03: files landed; dbt run --select fct_reviews -> ok
2026-03-04: files landed; dbt run --select fct_reviews -> ok
2026-03-05: files landed; dbt run --select fct_reviews -> ok
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select review_id, rating, updated_at_utc, _loaded_at
    from {{ ref('fct_reviews') }}
    order by updated_at_utc"
Previewing inline node:
| review_id | rating |      updated_at_utc |          _loaded_at |
| --------- | ------ | ------------------- | ------------------- |
| r1        |      5 | 2026-03-02 10:00:00 | 2026-03-02 23:00:00 |
| r3        |      4 | 2026-03-02 21:00:00 | 2026-03-02 23:00:00 |
| r2        |      2 | 2026-03-03 08:00:00 | 2026-03-03 23:00:00 |
| r4        |      3 | 2026-03-03 09:00:00 | 2026-03-03 23:00:00 |
| r5        |        | 2026-03-03 11:00:00 | 2026-03-03 23:00:00 |
| r9        |      5 | 2026-03-03 20:00:00 | 2026-03-05 23:00:00 |
| r6        |      5 | 2026-03-04 10:00:00 | 2026-03-05 23:00:00 |
| r7        |      5 | 2026-03-04 12:00:00 | 2026-03-04 23:00:00 |
| r8        |      1 | 2026-03-05 09:00:00 | 2026-03-05 23:00:00 |
```

#### What ran, and how to pick N

```sql
-- target/compiled/leafy/models/marts/fct_reviews.sql (generated by dbt)
-- fct_reviews: one row per review (grain: review_id), the latest version of each review.
-- Each run re-reads a look-back window, so late and edited reviews are merged, not lost.
select
    review_id,
    product_id,
    customer_id,
    rating,
    cast(submitted_at_utc as date) as review_date,
    submitted_at_utc,
    updated_at_utc,
    _loaded_at
from "leafy"."main_staging"."stg_reviews"
where updated_at_utc >= (
    -- coalesce: an existing but empty table (dbt run --empty) must not filter everything out
    select coalesce(max(updated_at_utc), timestamp '1900-01-01') - interval 3 day
    from "leafy"."main_marts"."fct_reviews"
)
```

Terminal (output trimmed):

```text
$ dbt show --limit 3 --inline "select review_id, updated_at_utc, _loaded_at, _loaded_at - updated_at_utc as lateness
    from {{ ref('stg_reviews') }}
    order by lateness desc"
Previewing inline node:
| review_id |      updated_at_utc |          _loaded_at | lateness        |
| --------- | ------------------- | ------------------- | --------------- |
| r9        | 2026-03-03 20:00:00 | 2026-03-05 23:00:00 | 2 days, 3:00:00 |
| r6        | 2026-03-04 10:00:00 | 2026-03-05 23:00:00 | 1 day, 13:00:00 |
| r2        | 2026-03-03 08:00:00 | 2026-03-03 23:00:00 | 15:00:00        |
```

On day 4 the window started at 4 March 12:00 − 3 days, so r9 (3 March 20:00) was inside it. To choose N, measure lateness: the longest gap between a row’s time and its landing. Here it is about two days, so 3 days covers it with a margin; r10 on day 5 will be a week late (exercise 4).

| Watermark on… | Catches | Watch out for |
|---|---|---|
| event or update time minus N days (this model) | rows up to N days late, and edits | rows later than N; cost grows with N (every run re-merges N days) |
| ingestion time (`_loaded_at > max(_loaded_at)`) | any lateness, as long as the loader stamps every row | needs a trustworthy load timestamp; a re-load of old files with old stamps is missed |
| both: ingestion time minus a small window | late rows, and reruns of the last loads | the most robust choice when the landing zone has a load timestamp |

> **On the job:** “Merge with a 3-day look-back” is the default answer in many teams because it is simple and idempotent: running the same day twice gives the same table. Write the window in a variable so an on-call engineer can widen it once (`--vars '{review_lookback_days: 30}'`) to repair a month without a full refresh.

> **The main idea:** filter on max(time) minus a window and merge on the key: late rows inside the window are inserted, re-read rows are updated, and reruns are idempotent.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Best practices: incremental models](https://docs.getdbt.com/best-practices/materializations/4-incremental-models), [Project variables](https://docs.getdbt.com/docs/build/project-variables).

---

<a id="slide-10"></a>
## 10. Prove it: the incremental table must equal a full rebuild

*Part A · the equivalence check added*

An incremental model is correct only if, at any moment, its table equals what a full rebuild would produce from the same inputs. That gives a precise, automatable test: the **equivalence check**. The script below compiles the model as a full refresh (so `is_incremental()` is false), runs that SELECT read-only, and compares it with the table with `EXCEPT` in both directions plus row counts (EXCEPT alone ignores duplicates).

#### The check

```python
# scripts/check_full_refresh.py (core)
subprocess.run([dbt, "compile", "--select", model, "--full-refresh", "--quiet"], check=True, ...)
node = ...manifest["nodes"]...                     # compiled_code and relation_name of the model
full_sql, table = node["compiled_code"], node["relation_name"]
only_table = con.sql(f"select * from {table} except select * from ({full_sql})")
only_full  = con.sql(f"select * from ({full_sql}) except select * from {table}")
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_reviews_naive
fct_reviews_naive: incremental table 8 rows, full rebuild 9 rows
only in the incremental table: 1 rows
┌───────────┬────────────┬─────────────┬────────┬───┬─────────────────────┬─────────────────────┬─────────────────────┐
│ review_id │ product_id │ customer_id │ rating │ … │  submitted_at_utc   │   updated_at_utc    │     _loaded_at      │
│  varchar  │  varchar   │   varchar   │ int32  │ … │      timestamp      │      timestamp      │      timestamp      │
├───────────┼────────────┼─────────────┼────────┼───┼─────────────────────┼─────────────────────┼─────────────────────┤
│ r6        │ P2         │ u1          │      5 │ … │ 2026-03-04 10:00:00 │ 2026-03-04 10:00:00 │ 2026-03-04 23:00:00 │
└───────────┴────────────┴─────────────┴────────┴───┴─────────────────────┴─────────────────────┴─────────────────────┘
  1 rows                                                                                          8 columns (7 shown)

only in a full rebuild: 2 rows
┌───────────┬────────────┬─────────────┬────────┬───┬─────────────────────┬─────────────────────┬─────────────────────┐
│ review_id │ product_id │ customer_id │ rating │ … │  submitted_at_utc   │   updated_at_utc    │     _loaded_at      │
│  varchar  │  varchar   │   varchar   │ int32  │ … │      timestamp      │      timestamp      │      timestamp      │
├───────────┼────────────┼─────────────┼────────┼───┼─────────────────────┼─────────────────────┼─────────────────────┤
│ r9        │ P4         │ u3          │      5 │ … │ 2026-03-03 20:00:00 │ 2026-03-03 20:00:00 │ 2026-03-05 23:00:00 │
│ r6        │ P2         │ u1          │      5 │ … │ 2026-03-04 10:00:00 │ 2026-03-04 10:00:00 │ 2026-03-05 23:00:00 │
└───────────┴────────────┴─────────────┴────────┴───┴─────────────────────┴─────────────────────┴─────────────────────┘
  2 rows                                                                                          8 columns (7 shown)

DIFFERENT
[exit code 1]
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_reviews
fct_reviews: incremental table 9 rows, full rebuild 9 rows
only in the incremental table: 0 rows
only in a full rebuild: 0 rows
EQUIVALENT
```

#### Repair the naive model

The check found two differences in the naive model. r9 is missing (lesson 8). And r6 carries its *first* delivery’s `_loaded_at`: the identical re-delivery on day 4 was below the watermark, so it never reached the table, while a full rebuild keeps the latest delivery. Lineage columns such as `_loaded_at` make the check stricter, which is what you want. The simplest repair is a **full refresh**: `--full-refresh` makes `is_incremental()` false, so dbt rebuilds the table from the full SELECT.

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_naive --full-refresh
1 of 1 OK created sql incremental model main_lessons.fct_reviews_naive ......... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_reviews_naive
fct_reviews_naive: incremental table 9 rows, full rebuild 9 rows
only in the incremental table: 0 rows
only in a full rebuild: 0 rows
EQUIVALENT
```

In production, a full refresh of a billion-row table may take hours; the alternatives are widening the look-back once with `--vars`, or (with microbatch) re-running only the affected days.

> **On the job:** Run the equivalence check on a schedule (weekly, or after incidents) on a recent slice, for example the last 30 days filtered on both sides. It catches watermark bugs, missing keys and non-deterministic SQL long before a stakeholder does. In an interview, “how do you test an incremental model?” is answered by this check plus a unique test on the key.

> **The main idea:** an incremental model is correct when it equals its full rebuild; compile with --full-refresh, compare both ways, and repair with a full refresh or a wider window.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [dbt compile](https://docs.getdbt.com/reference/commands/compile), [full_refresh config](https://docs.getdbt.com/reference/resource-configs/full_refresh).

---

<a id="slide-11"></a>
## 11. Schema changes: on_schema_change and when to full-refresh

*Part A · adding a column to a table that is never rebuilt*

A table model is rebuilt every run, so a new column just appears. An incremental table is only modified, so dbt must decide what to do when the SELECT’s columns no longer match the table: that is **`on_schema_change`**. Tried in a scratch copy: add `length(body) as body_length` to `fct_reviews`.

#### fail, then ignore

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews   # on_schema_change='fail'
1 of 1 ERROR creating sql incremental model main_marts.fct_reviews ............. [ERROR in x.xxs]
Completed with 1 error, 0 partial successes, and 0 warnings:
[ERROR]: in model fct_reviews (models\marts\fct_reviews.sql)
  Compilation Error in model fct_reviews (models\marts\fct_reviews.sql)
                The source and target schemas on this incremental model are out of sync!
                  - set the `on_schema_change` config to either append_new_columns or sync_all_columns, depending on your situation.
                  - Re-run the incremental model with `full_refresh: True` to update the target schema.
                  - update the schema manually and re-run the process.
…
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews   # default 'ignore', merge strategy
  Binder Error: Table "fct_reviews" does not have a column with name "body_length"
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews   # default 'ignore', delete+insert strategy
1 of 1 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select column_name
    from information_schema.columns
    where table_schema = 'main_marts' and table_name = 'fct_reviews'
    order by ordinal_position"
Previewing inline node:
| column_name      |
| ---------------- |
| review_id        |
| product_id       |
| customer_id      |
| rating           |
| review_date      |
| submitted_at_utc |
| updated_at_utc   |
| _loaded_at       |
```

`fail` stops the run with a clear error. `ignore` is the default, and its behaviour depends on the strategy: on DuckDB, `merge` inserts *by name* and fails with a binder error; `delete+insert` (and the merge of most other adapters, which list the table’s columns) succeeds and **silently drops** the new column: the code says `body_length` exists, the table does not have it.

#### append_new_columns, then --full-refresh

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews --vars '{review_lookback_days: 1}'   # 'append_new_columns'
1 of 1 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select review_id, updated_at_utc, body_length
    from {{ ref('fct_reviews') }}
    order by updated_at_utc"
Previewing inline node:
| review_id |      updated_at_utc | body_length |
| --------- | ------------------- | ----------- |
| r1        | 2026-03-02 10:00:00 |             |
| r3        | 2026-03-02 21:00:00 |             |
| r2        | 2026-03-03 08:00:00 |             |
| r4        | 2026-03-03 09:00:00 |             |
| r5        | 2026-03-03 11:00:00 |             |
| r9        | 2026-03-03 20:00:00 |             |
| r6        | 2026-03-04 10:00:00 |          23 |
| r7        | 2026-03-04 12:00:00 |          15 |
| r8        | 2026-03-05 09:00:00 |          18 |
```

The column was added, but only rows re-read in this run (a one-day window, to make the effect visible) got values; the six older rows keep `NULL`, because an incremental model never revisits rows outside its window. A full refresh fills them all:

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews --full-refresh
1 of 1 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

| on_schema_change | New column in the SELECT | Column removed from the SELECT | Pick it when |
|---|---|---|---|
| `ignore` (default) | not added (or an error, as with DuckDB merge) | kept in the table | never, for a model you still change |
| `fail` | run fails | run fails | critical models: a human decides (full refresh or backfill) |
| `append_new_columns` | added; old rows NULL | kept | additive changes, then backfill or full-refresh |
| `sync_all_columns` | added; old rows NULL | dropped (types also synced) | the table should mirror the SELECT exactly |

**`--full-refresh`** is the right tool after a logic change that affects old rows, a new column that needs history, or a failed equivalence check. For tables too large to rebuild casually, set `full_refresh: false` in the model config: dbt then ignores the flag for that model, and a rebuild needs a deliberate config change.

> **On the job:** Adding a column to a big incremental fact is a two-step change in a pull request: the column with `append_new_columns`, and a backfill plan (a one-off wide look-back, a full refresh in a quiet window, or microbatch backfill). Reviewers will ask which one.

> **The main idea:** incremental tables are modified, not rebuilt: choose on_schema_change deliberately (fail or append_new_columns), and plan how old rows get the new column.

*Read more:* [on_schema_change](https://docs.getdbt.com/docs/build/incremental-models#what-if-the-columns-of-my-incremental-model-change), [full_refresh config](https://docs.getdbt.com/reference/resource-configs/full_refresh), [Incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy).

---

<a id="slide-12"></a>
## 12. Microbatch: incremental by time batches, with a lookback

*Part A · dbt 1.9+: let dbt write the time filter added*

**Microbatch** is an incremental strategy where you do not write an `is_incremental()` filter. You declare the model’s **`event_time`** column and a `batch_size` (hour, day, month, year); dbt splits the work into one query per batch, filters every input that also declares an `event_time` to that batch, and replaces the batch in the target. **`lookback`** = 3 means each normal run also re-processes the three batches before the current one, which is the look-back window as a config. `begin` is where history starts.

#### The model

```sql
# models/lessons/fct_reviews_mb.sql
{{
    config(
        materialized='incremental',
        incremental_strategy='microbatch',
        event_time='submitted_at_utc',
        batch_size='day',
        lookback=3,
        begin='2026-03-01',
        concurrent_batches=false
    )
}}
-- fct_reviews_mb: the same review fact, built in daily batches by submit time.
-- No is_incremental() block: dbt adds the batch filter to every ref() that has an event_time.
select review_id, product_id, customer_id, rating, submitted_at_utc, updated_at_utc, _loaded_at
from {{ ref('stg_reviews') }}
```

```yaml
# models/staging/_reviews.yml (added)
    config:
      event_time: submitted_at_utc     # lets microbatch models filter this input by batch
```

A normal run (no flags) computes the batches from the *current time*: today’s batch plus the three before it. These fixtures are dated March 2026, so both runs pass an explicit window, which is also how you **backfill**.

#### Day 3, then day 4 with the late r9

Terminal:

```text
$ python scripts/load_day.py 2026-03-04
2026-03-04: raw.reviews 8 rows from 3 files; raw.supplier_products 3 rows from products_2026-03-04.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_mb --event-time-start 2026-03-01 --event-time-end 2026-03-05
Batch 1 of 4 START batch 2026-03-01 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 1 of 4 OK created batch 2026-03-01 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Batch 2 of 4 START batch 2026-03-02 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 2 of 4 OK created batch 2026-03-02 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Batch 3 of 4 START batch 2026-03-03 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 3 of 4 OK created batch 2026-03-03 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Batch 4 of 4 START batch 2026-03-04 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 4 of 4 OK created batch 2026-03-04 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-05
2026-03-05: raw.reviews 11 rows from 4 files; raw.supplier_products 3 rows from products_2026-03-04.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_mb --event-time-start 2026-03-02 --event-time-end 2026-03-06
Batch 1 of 4 START batch 2026-03-02 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 1 of 4 OK created batch 2026-03-02 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Batch 2 of 4 START batch 2026-03-03 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 2 of 4 OK created batch 2026-03-03 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Batch 3 of 4 START batch 2026-03-04 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 3 of 4 OK created batch 2026-03-04 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Batch 4 of 4 START batch 2026-03-05 of main_lessons.fct_reviews_mb ................... [RUN]
Batch 4 of 4 OK created batch 2026-03-05 of main_lessons.fct_reviews_mb .............. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select review_id, rating, submitted_at_utc
    from {{ ref('fct_reviews_mb') }}
    order by submitted_at_utc"
Previewing inline node:
| review_id | rating |    submitted_at_utc |
| --------- | ------ | ------------------- |
| r1        |      5 | 2026-03-02 10:00:00 |
| r2        |      2 | 2026-03-02 12:00:00 |
| r3        |      4 | 2026-03-02 21:00:00 |
| r4        |      3 | 2026-03-03 09:00:00 |
| r5        |        | 2026-03-03 11:00:00 |
| r9        |      5 | 2026-03-03 20:00:00 |
| r6        |      5 | 2026-03-04 10:00:00 |
| r7        |      5 | 2026-03-04 12:00:00 |
| r8        |      1 | 2026-03-05 09:00:00 |
```

The second run re-processed 2–5 March, so r9 (submitted 3 March, landed 5 March) is in, and r2 shows its edited rating. Each batch ran as delete-by-time-range + insert on DuckDB.

|  | Merge + look-back (lesson 9) | Microbatch |
|---|---|---|
| Filter | you write it with `is_incremental()` | dbt adds it from `event_time` |
| Unit of replacement | rows, by `unique_key` | whole time batches (no `unique_key` on DuckDB) |
| Edits to old rows | caught if inside the window | caught only when that row’s event-time batch is re-run |
| Backfill / retry | full refresh or wider window | `--event-time-start/--event-time-end`; `dbt retry` re-runs failed batches only |

> **On the job:** Microbatch fits large, append-mostly time series (events, IoT, logs) where whole days are reprocessed and backfills are frequent. Rows that are edited long after their event time (like r2) fit merge with a key better. Fuel Smart’s 1.4M reviews are a natural microbatch candidate by review date.

> **The main idea:** microbatch = declare event_time, batch_size, lookback and begin; dbt filters and replaces one time batch at a time, which makes late data, backfills and retries routine.

*Read more:* [Microbatch incremental models](https://docs.getdbt.com/docs/build/incremental-microbatch), [lookback](https://docs.getdbt.com/reference/resource-configs/lookback), [event_time](https://docs.getdbt.com/reference/resource-configs/event-time).

---

<a id="slide-13"></a>
## 13. Snapshots with the timestamp strategy

*Part B · history for a source that overwrites itself*

Recap from *dbt Jinja and macros* (lesson 7): a **snapshot** stores every version of each row of a mutable source as SCD type 2, with validity columns. The supplier sends a full catalogue extract every day and overwrites the old one, so without a snapshot yesterday’s label is gone. A **snapshot strategy** decides how dbt detects that a row changed. Both strategies ran together on the same days; this lesson reads the timestamp one.

#### Definition and day 1

```yaml
# snapshots/lessons/supplier_strategies.yml
snapshots:
  - name: snap_supplier_ts
    relation: source('shop_raw', 'supplier_products')
    config:
      unique_key: barcode
      strategy: timestamp
      updated_at: last_modified_at      # trust the supplier's change time

  - name: snap_supplier_check
    relation: source('shop_raw', 'supplier_products')
    config:
      unique_key: barcode
      strategy: check
      check_cols: [label, npk]          # compare these values on every run
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-02
2026-03-02: raw.reviews 3 rows from 1 files; raw.supplier_products 3 rows from products_2026-03-02.jsonl
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, product_name, label, npk, last_modified_at
    from {{ source('shop_raw', 'supplier_products') }}
    order by barcode"
Previewing inline node:
| barcode | product_name         | label     | npk      |    last_modified_at |
| ------- | -------------------- | --------- | -------- | ------------------- |
| B100    | All-Purpose Plant... | organic   | 10-10-10 | 2026-03-01 08:00:00 |
| B200    | Cactus Mix           | peat-free |          | 2026-03-01 08:00:00 |
| B300    | Orchid Food          |           | 20-20-20 | 2026-03-01 08:00:00 |
```

Terminal (output trimmed):

```text
$ dbt snapshot --select snap_supplier_ts snap_supplier_check   # day 1
1 of 2 OK snapshotted main_snapshots.snap_supplier_check ....................... [OK in x.xxs]
2 of 2 OK snapshotted main_snapshots.snap_supplier_ts .......................... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

#### Day 2: B100 relabelled, B300 changed silently

Terminal:

```text
$ python scripts/load_day.py 2026-03-03
2026-03-03: raw.reviews 6 rows from 2 files; raw.supplier_products 3 rows from products_2026-03-03.jsonl
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, label, npk, last_modified_at
    from {{ source('shop_raw', 'supplier_products') }}
    order by barcode"
Previewing inline node:
| barcode | label             | npk      |    last_modified_at |
| ------- | ----------------- | -------- | ------------------- |
| B100    | organic; pet-safe | 10-10-10 | 2026-03-02 09:00:00 |
| B200    | peat-free         |          | 2026-03-01 08:00:00 |
| B300    |                   | 30-10-10 | 2026-03-01 08:00:00 |
```

Terminal (output trimmed):

```text
$ dbt snapshot --select snap_supplier_ts snap_supplier_check   # day 2
1 of 2 OK snapshotted main_snapshots.snap_supplier_check ....................... [OK in x.xxs]
2 of 2 OK snapshotted main_snapshots.snap_supplier_ts .......................... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, label, npk, dbt_valid_from, dbt_valid_to
    from {{ ref('snap_supplier_ts') }}
    order by barcode, dbt_valid_from"
Previewing inline node:
| barcode | label             | npk      |      dbt_valid_from |        dbt_valid_to |
| ------- | ----------------- | -------- | ------------------- | ------------------- |
| B100    | organic           | 10-10-10 | 2026-03-01 08:00:00 | 2026-03-02 09:00:00 |
| B100    | organic; pet-safe | 10-10-10 | 2026-03-02 09:00:00 |                     |
| B200    | peat-free         |          | 2026-03-01 08:00:00 |                     |
| B300    |                   | 20-20-20 | 2026-03-01 08:00:00 |                     |
```

B100’s label changed *and* its `last_modified_at` moved forward, so the old version was closed and a new one opened. B300’s nutrient ratio changed, but the supplier did not bump `last_modified_at`: the timestamp strategy saw no change, and the snapshot still says 20-20-20.

| Column dbt adds | Meaning (timestamp strategy) |
|---|---|
| `dbt_valid_from` | when this version started: the source’s `updated_at` value |
| `dbt_valid_to` | when it was superseded; `NULL` = current version (configurable, lesson 16) |
| `dbt_updated_at` | the `updated_at` value dbt saw for this version |
| `dbt_scd_id` | a hash of key + time: unique per version, usable as a surrogate key |

#### Point-in-time: what was on the label on 2 March, 00:00?

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, label
    from {{ ref('snap_supplier_ts') }}
    where timestamp '2026-03-02 00:00' >= dbt_valid_from and (dbt_valid_to is null or timestamp '2026-03-02 00:00' < dbt_valid_to)
    order by barcode"
Previewing inline node:
| barcode | label     |
| ------- | --------- |
| B100    | organic   |
| B200    | peat-free |
| B300    |           |
```

#### Coming from C#

A snapshot is an audit-history table that your ORM never wrote: dbt compares today’s source with the current versions and writes the history rows for you. **The timestamp strategy** is like optimistic concurrency on a `RowVersion` column: it only works if every update bumps it.

> **On the job:** Timestamp is the default choice when the source has a reliable `updated_at` (most application databases, CRM exports, Open Food Facts’ `last_modified_t`): it is cheap and its validity times are the source’s own. Ask the source owner whether *every* change bumps it.

> **The main idea:** the timestamp strategy versions a row when updated_at moves forward; it is cheap and precise, and blind to changes that do not bump updated_at.

*Read more:* [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [strategy](https://docs.getdbt.com/reference/resource-configs/strategy), [updated_at](https://docs.getdbt.com/reference/resource-configs/updated_at).

---

<a id="slide-14"></a>
## 14. The check strategy, and how to choose between the two

*Part B · compare values when the timestamp cannot be trusted*

The **check strategy** ignores timestamps and compares the values of `check_cols` (a list, or `all`) between the source and the current version. Any difference opens a new version. Same two days, the second snapshot:

#### Day 2 in snap_supplier_check

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, label, npk, dbt_valid_to is null as is_current
    from {{ ref('snap_supplier_check') }}
    order by barcode, is_current"
Previewing inline node:
| barcode | label             | npk      | is_current |
| ------- | ----------------- | -------- | ---------- |
| B100    | organic           | 10-10-10 |      False |
| B100    | organic; pet-safe | 10-10-10 |       True |
| B200    | peat-free         |          |       True |
| B300    |                   | 20-20-20 |      False |
| B300    |                   | 30-10-10 |       True |
```

B300 now has two versions: the silent change was caught. Its `dbt_valid_from` is the *time the snapshot ran* (not shown, it is the build time), because the check strategy has no source timestamp to use.

#### Choosing

| Situation | Strategy | Why |
|---|---|---|
| reliable `updated_at` on every change | timestamp | cheap; validity in source time |
| no `updated_at`, or changes do not bump it | check | compares values directly |
| only some columns matter | check with a list | ignores noise such as an extract timestamp |
| very wide or huge source | timestamp (or check on a hash column you compute) | check compares every listed column on every run |

| Pitfall | What happens | Fix |
|---|---|---|
| `check_cols: all` on a source with a volatile column (`extracted_at`) | a new version for every row on every run | list the business columns |
| timestamp strategy, `updated_at` not bumped or goes backwards | changes missed (B300 above) | check strategy, or fix the source contract |
| timestamps in local time with DST | versions out of order twice a year | snapshot a UTC column |
| `NULL` in a checked column | handled by dbt (NULL to value counts as a change, as with B300’s label) but easy to break in hand-written SCD2 SQL | let dbt do it; test with a unit test if you hand-write it |

> **On the job:** In interviews, “timestamp or check?” is really “do you trust the source’s updated_at?”. Say what you would verify (does every change bump it, is it monotonic, what precision, which time zone) and name the cost of check on wide tables.

> **The main idea:** check compares values and catches silent changes at a higher cost and with run-time validity; timestamp trusts updated_at. Choose by how much you trust the source.

*Read more:* [strategy](https://docs.getdbt.com/reference/resource-configs/strategy), [check_cols](https://docs.getdbt.com/reference/resource-configs/check_cols), [Snapshot configurations](https://docs.getdbt.com/reference/snapshot-configs).

---

<a id="slide-15"></a>
## 15. Hard deletes: when a row disappears from the source

*Part B · discontinued products, deleted accounts, purged rows*

A **hard delete** is a row that disappears from the source instead of being flagged (a soft delete would be `is_active = false`). On day 3 the supplier stops selling Cactus Mix (B200) and drops it from the extract. What a snapshot does about that is the **`hard_deletes`** config (dbt 1.9+; it replaces the older `invalidate_hard_deletes: true`). Three snapshots, one per setting, replayed over days 1–3:

#### Config and replay

```yaml
# snapshots/lessons/supplier_hard_deletes.yml
snapshots:
  - name: snap_del_ignore
    relation: source('shop_raw', 'supplier_products')
    config: {unique_key: barcode, strategy: timestamp, updated_at: last_modified_at,
             hard_deletes: ignore}          # the default
  - name: snap_del_invalidate
    relation: source('shop_raw', 'supplier_products')
    config: {unique_key: barcode, strategy: timestamp, updated_at: last_modified_at,
             hard_deletes: invalidate}      # close the current version
  - name: snap_del_new_record
    relation: source('shop_raw', 'supplier_products')
    config: {unique_key: barcode, strategy: timestamp, updated_at: last_modified_at,
             hard_deletes: new_record}      # add a version flagged dbt_is_deleted
```

Terminal:

```text
$ python scripts/replay.py 2026-03-02 2026-03-04 snapshot --select snap_del_ignore snap_del_invalidate snap_del_new_record
2026-03-02: files landed; dbt snapshot --select snap_del_ignore snap_del_invalidate snap_del_new_record -> ok
2026-03-03: files landed; dbt snapshot --select snap_del_ignore snap_del_invalidate snap_del_new_record -> ok
2026-03-04: files landed; dbt snapshot --select snap_del_ignore snap_del_invalidate snap_del_new_record -> ok
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, label, last_modified_at
    from {{ source('shop_raw', 'supplier_products') }}
    order by barcode"
Previewing inline node:
| barcode | label             |    last_modified_at |
| ------- | ----------------- | ------------------- |
| B100    | organic; pet-safe | 2026-03-02 09:00:00 |
| B300    |                   | 2026-03-01 08:00:00 |
| B400    | peat-free         | 2026-03-03 10:00:00 |
```

#### What each snapshot says about B200

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select 'ignore' as hard_deletes, barcode, dbt_valid_to is null as is_current,
    null as dbt_is_deleted
    from {{ ref('snap_del_ignore') }}
    where barcode = 'B200'
    union all select 'invalidate', barcode, dbt_valid_to is null,
    null
    from {{ ref('snap_del_invalidate') }}
    where barcode = 'B200'
    union all select 'new_record', barcode, dbt_valid_to is null,
    dbt_is_deleted
    from {{ ref('snap_del_new_record') }}
    where barcode = 'B200'
    order by 1, 3"
Previewing inline node:
| hard_deletes | barcode | is_current | dbt_is_deleted |
| ------------ | ------- | ---------- | -------------- |
| ignore       | B200    |       True |                |
| invalidate   | B200    |      False |                |
| new_record   | B200    |      False | False          |
| new_record   | B200    |       True | True           |
```

| Setting | Effect | Use when |
|---|---|---|
| `ignore` | B200 stays “current” forever | the source is a *delta* (only changed rows), so absence means nothing |
| `invalidate` | current version closed (`dbt_valid_to` = run time) | full extract; you only need “not current any more” |
| `new_record` | version closed and a new row with `dbt_is_deleted = True`; if the row comes back, another version opens | full extract; you need to report deletions and reappearances |

**Delta or full extract?** Absence only means deletion if each extract contains *every* live row. Many feeds (Open Food Facts’ daily delta files, CDC exports, “changed since” APIs) send only changed rows; with those, `invalidate` or `new_record` would close every product that did not change today. Exercise 7 shows that failure.

> **On the job:** “Our snapshot still shows customers that were deleted months ago” is a common ticket: the default is `ignore`. The opposite ticket, “half the catalogue was marked deleted overnight”, is `invalidate` on a feed that was a delta, or a full extract that arrived truncated. Pair deletion tracking with a row-count test on the source.

> **The main idea:** set hard_deletes deliberately: ignore for delta feeds, invalidate or new_record for full extracts, and guard against a truncated extract with a volume test.

*Read more:* [hard_deletes](https://docs.getdbt.com/reference/resource-configs/hard-deletes), [Snapshots](https://docs.getdbt.com/docs/build/snapshots).

---

<a id="slide-16"></a>
## 16. History limits, the project snapshot, and an SCD2 dimension

*Part B · what a snapshot can and cannot know*

#### The project’s snapshot

```yaml
# snapshots/supplier_products.yml
snapshots:
  - name: supplier_products_snapshot
    description: SCD2 history of the supplier catalogue (full daily extract). One row per barcode per version.
    relation: source('shop_raw', 'supplier_products')
    config:
      unique_key: barcode
      strategy: check                         # the supplier does not always bump last_modified_at
      check_cols: [product_name, brand, label, npk]
      hard_deletes: new_record                # full extract: absence = discontinued
      dbt_valid_to_current: "cast('9999-12-31' as timestamp)"   # current rows get an end date, not NULL
```

Terminal:

```text
$ python scripts/replay.py 2026-03-02 2026-03-04 snapshot --select supplier_products_snapshot
2026-03-02: files landed; dbt snapshot --select supplier_products_snapshot -> ok
2026-03-03: files landed; dbt snapshot --select supplier_products_snapshot -> ok
2026-03-04: files landed; dbt snapshot --select supplier_products_snapshot -> ok
```

**`dbt_valid_to_current`** puts a far-future date in `dbt_valid_to` for current rows instead of `NULL`, so range joins need no `coalesce`. (**`snapshot_meta_column_names`** renames the `dbt_*` columns if your standards require it.)

#### A dimension on top of it

```sql
# models/marts/dim_supplier_product.sql
-- dim_supplier_product: SCD type 2 product dimension built on the snapshot.
-- Grain: one row per barcode per version. Join facts on barcode and the fact's time between valid_from and valid_to.
select
    dbt_scd_id                                   as supplier_product_key,
    barcode,
    product_name,
    brand,
    label,
    npk,
    coalesce(dbt_is_deleted = 'True', false)     as is_discontinued,
    dbt_valid_from                               as valid_from,
    dbt_valid_to                                 as valid_to,
    dbt_valid_to = timestamp '9999-12-31'        as is_current
from {{ ref('supplier_products_snapshot') }}
```

Terminal (output trimmed):

```text
$ dbt run --select dim_supplier_product
1 of 1 OK created sql table model main_marts.dim_supplier_product .............. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select barcode, label, npk, is_discontinued, is_current, valid_to = timestamp '9999-12-31' as open_ended
    from {{ ref('dim_supplier_product') }}
    order by barcode, is_current, is_discontinued"
Previewing inline node:
| barcode | label             | npk      | is_discontinued | is_current | open_ended |
| ------- | ----------------- | -------- | --------------- | ---------- | ---------- |
| B100    | organic           | 10-10-10 |           False |      False |      False |
| B100    | organic; pet-safe | 10-10-10 |           False |       True |       True |
| B200    | peat-free         |          |           False |      False |      False |
| B200    | peat-free         |          |            True |       True |       True |
| B300    |                   | 20-20-20 |           False |      False |      False |
| B300    |                   | 30-10-10 |           False |       True |       True |
| B400    | peat-free         | 1-1-1    |           False |       True |       True |
```

Seven versions for four barcodes: B100 and B300 changed, B200 was discontinued (a closed version and a deletion record; the deletion record is the current one), B400 is new. Downstream models read the dimension, never the snapshot directly.

| Limit | Why | What to do |
|---|---|---|
| Changes between two runs are invisible | a value that changes and changes back before the next run leaves no trace | schedule snapshots at least as often as the source changes; use CDC if every change matters |
| History cannot be rebuilt | the source no longer has the old values; `dbt snapshot` has no full refresh | protect the schema (permissions, backups); never drop a snapshot casually |
| History starts on the first run | nothing before it was observed | start snapshots early; load a known history once if one exists |
| Source columns change | new columns are added (old versions NULL); removed columns stay | snapshot the raw source with few transformations; reshape downstream |
| Duplicate `unique_key` in the source | several “current” rows per key, broken joins | test uniqueness on the source; test one current row per key (lesson 21) |

> **On the job:** Teams usually snapshot sources (raw or a light staging view), store snapshots in their own schema, and build SCD2 dimensions on top as ordinary models. In your Fuel Smart portfolio, snapshot the Open Food Facts product slice by barcode to track Nutri-Score and label changes; decide `hard_deletes` by whether you load full dumps or delta files.

> **The main idea:** a snapshot records only what it observes, when it observes it, and cannot be rebuilt: run it often enough, protect it, and model dimensions on top of it.

*Read more:* [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [dbt_valid_to_current](https://docs.getdbt.com/reference/resource-configs/dbt_valid_to_current), [snapshot_meta_column_names](https://docs.getdbt.com/reference/resource-configs/snapshot_meta_column_names), [dbt snapshot](https://docs.getdbt.com/reference/commands/snapshot).

---

<a id="slide-17"></a>
## 17. Unit test 1: the dedupe rule in staging

*Part C · test logic on rows you design, before any real data*

Recap from *dbt Jinja and macros* (lesson 8): a **unit test** (dbt 1.8+) runs one model on a few hand-written input rows (`given`) and compares its output with hand-written expected rows (`expect`). Only the columns you list matter; the others are `NULL`. The first of three tests pins the trickiest rule in `stg_reviews`: which version of a review wins.

#### The test

```yaml
# models/staging/_unit_tests.yml
unit_tests:
  - name: stg_reviews_latest_edit_wins
    description: An edit beats the original, even when the original is re-delivered later;
      an identical re-delivery keeps the latest file.
    model: stg_reviews
    given:
      - input: source('shop_raw', 'reviews')
        rows:
          - {review_id: r1, rating: "4", submitted_at: "2026-03-02T12:00:00Z", edited_at: null,
             _loaded_at: "2026-03-02 23:00:00", _source_file: a.jsonl}
          - {review_id: r1, rating: "2", submitted_at: "2026-03-02T12:00:00Z", edited_at: "2026-03-03T08:00:00Z",
             _loaded_at: "2026-03-03 23:00:00", _source_file: b.jsonl}
          - {review_id: r1, rating: "4", submitted_at: "2026-03-02T12:00:00Z", edited_at: null,
             _loaded_at: "2026-03-05 23:00:00", _source_file: c.jsonl}      # old version, re-sent late
          - {review_id: r6, rating: "5", submitted_at: "2026-03-04T10:00:00Z", edited_at: null,
             _loaded_at: "2026-03-04 23:00:00", _source_file: d.jsonl}
          - {review_id: r6, rating: "5", submitted_at: "2026-03-04T10:00:00Z", edited_at: null,
             _loaded_at: "2026-03-05 23:00:00", _source_file: e.jsonl}      # identical re-delivery
    expect:
      rows:
        - {review_id: r1, rating: 2, updated_at_utc: "2026-03-03 08:00:00", _source_file: b.jsonl}
        - {review_id: r6, rating: 5, updated_at_utc: "2026-03-04 10:00:00", _source_file: e.jsonl}
```

Terminal (output trimmed):

```text
$ dbt test --select stg_reviews_latest_edit_wins
1 of 1 PASS stg_reviews::stg_reviews_latest_edit_wins .......................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### What a failing unit test looks like

A plausible “simplification”: order by the newest file first. In a scratch copy:

Terminal (output trimmed):

```text
$ dbt test --select stg_reviews_latest_edit_wins   # after changing the ORDER BY to "_loaded_at desc, updated_at_utc desc"
1 of 1 FAIL 1 stg_reviews::stg_reviews_latest_edit_wins ........................ [FAIL 1 in x.xxs]
actual differs from expected:
@@,review_id,rating,updated_at_utc                         ,_source_file
→ ,r1       ,2→4   ,2026-03-03 08:00:00→2026-03-02 12:00:00,b.jsonl→c.jsonl
  ,r6       ,5     ,2026-03-04 10:00:00                    ,e.jsonl
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

The diff shows the expected and actual rows: the late re-delivery of the *old* version (c.jsonl, rating 4) now wins over the edit. This is exactly the bug the third input row was written to catch.

| Unit test part | Meaning |
|---|---|
| `model` | the model under test; dbt runs its SQL with the inputs replaced |
| `given` | one entry per `ref()` / `source()` the model reads; rows as YAML dicts, CSV or SQL |
| `expect` | the exact output rows (order ignored); list only the columns you assert on |
| run it | `dbt test --select test_type:unit`; `dbt build` runs a model’s unit tests before building it |

> **On the job:** Write a unit test when the logic has a rule that a reviewer could “simplify” wrongly: dedupe order, CASE ladders, date and time-zone boundaries, window frames. Name the test after the rule, and put the nasty case (here the late re-delivery) in the input on purpose.

> **The main idea:** a unit test pins a rule with designed rows, including the nasty case; when someone breaks the rule, the diff shows exactly how.

*Read more:* [Unit tests](https://docs.getdbt.com/docs/build/unit-tests), [unit_tests properties](https://docs.getdbt.com/reference/resource-properties/unit-tests).

---

<a id="slide-18"></a>
## 18. Unit test 2: the incremental branch, with this and overrides

*Part C · test the code that only runs on day 2*

The look-back filter only runs when `is_incremental()` is true, so a normal first build never executes it. A unit test can force that branch: **`overrides`** replace macros (here `is_incremental`) and variables for the test, and the special input **`this`** provides the rows of the “existing” table that the filter reads.

#### The test

```yaml
# models/marts/_unit_tests.yml
unit_tests:
  - name: fct_reviews_lookback_window
    description: In incremental mode, re-read everything from (max updated_at in the table - 3 days).
    model: fct_reviews
    overrides:
      macros:
        is_incremental: true            # pretend the table exists and this is not a full refresh
      vars:
        review_lookback_days: 3
    given:
      - input: this                     # the existing table: newest row 5 March 09:00
        rows:
          - {review_id: r8, updated_at_utc: "2026-03-05 09:00:00"}
      - input: ref('stg_reviews')
        rows:
          - {review_id: too_old, updated_at_utc: "2026-03-02 08:59:59"}
          - {review_id: on_edge, updated_at_utc: "2026-03-02 09:00:00"}   # exactly 3 days before
          - {review_id: late,    updated_at_utc: "2026-03-03 20:00:00"}
          - {review_id: new,     updated_at_utc: "2026-03-06 10:00:00"}
    expect:                             # the rows the model SELECTs (the batch), not the merged table
      rows:
        - {review_id: on_edge}
        - {review_id: late}
        - {review_id: new}
```

Terminal (output trimmed):

```text
$ dbt test --select fct_reviews_lookback_window
1 of 1 PASS fct_reviews::fct_reviews_lookback_window ........................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### Why these rows

- `this` holds one row at 5 March 09:00, so the window starts exactly at 2 March 09:00.
- `too_old` is one second before the start and `on_edge` is exactly on it: the test pins `>=` versus `>`, the classic off-by-one.
- `late` is the r9 case from lesson 8; `new` is ordinary new data.
- `expect` describes the model’s SELECT (the batch handed to the merge), not the table after merging.

**Coming from C#:** `overrides` is dependency injection for a test: like passing a fake clock or a stubbed `IsIncremental()` into the class under test.

> **On the job:** Every incremental model in a serious project should have this test: it is the only cheap way to run the incremental branch in CI before production does it for the first time. Pair it with the equivalence check (lesson 10) on real data.

> **The main idea:** override is_incremental and give a this input to unit-test the incremental filter, including its boundary; expect the batch, not the merged table.

*Read more:* [Unit tests](https://docs.getdbt.com/docs/build/unit-tests), [Unit test overrides](https://docs.getdbt.com/reference/resource-properties/unit-test-overrides), [Unit testing versioned and incremental models](https://docs.getdbt.com/reference/resource-properties/unit-testing-versions).

---

<a id="slide-19"></a>
## 19. Unit test 3, and unit tests versus data tests

*Part C · a CASE ladder with rounding, then the comparison interviewers ask for*

#### Rating conversion, as CSV fixtures

```yaml
# models/staging/_unit_tests_rating.yml
unit_tests:
  - name: stg_reviews_rating_scale
    description: Ratings out of 10 become 1-5, rounding half away from zero; anything invalid is NULL.
    model: stg_reviews
    given:
      - input: source('shop_raw', 'reviews')
        format: csv
        rows: |
          review_id,rating,rating_scale
          a,7,10
          b,5,10
          c,1,10
          d,10,10
          e,3,
          f,6,5
          g,0,5
          h,abc,5
    expect:
      format: csv
      rows: |
        review_id,rating
        a,4
        b,3
        c,1
        d,5
        e,3
        f,
        g,
        h,
```

Terminal (output trimmed):

```text
$ dbt test --select test_type:unit   # all three
1 of 3 PASS fct_reviews::fct_reviews_lookback_window ........................... [PASS in x.xxs]
2 of 3 PASS stg_reviews::stg_reviews_latest_edit_wins .......................... [PASS in x.xxs]
3 of 3 PASS stg_reviews::stg_reviews_rating_scale .............................. [PASS in x.xxs]
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

CSV fixtures make tables of cases readable. An empty CSV field is `NULL`. Rows `b` and `e` are the traps: 5/10 must round *up* to 3, and a missing scale means 5.

#### Why the rounding row matters

```python
print("Python round(2.5):", round(2.5), " round(3.5):", round(3.5))   # banker's rounding
import duckdb
print(duckdb.sql("select round(2.5) as r25, round(3.5) as r35, round(5 / 2) as five_out_of_ten"))
```

Output:

```text
Python round(2.5): 2  round(3.5): 4
┌──────────────┬──────────────┬─────────────────┐
│     r25      │     r35      │ five_out_of_ten │
│ decimal(2,0) │ decimal(2,0) │     double      │
├──────────────┼──────────────┼─────────────────┤
│            3 │            4 │             3.0 │
└──────────────┴──────────────┴─────────────────┘
```

DuckDB rounds half away from zero; Python (and .NET’s default `Math.Round`) round half to even. Logic moved between Python and SQL, or between warehouses, can change silently on exactly .5. A unit test pins the behaviour you chose.

|  | Unit test | Data test |
|---|---|---|
| Checks | the model’s **logic** | the **data** after a build |
| Input | hand-written fixture rows | the real table |
| Runs | before the model is built (`dbt build`), in dev and CI | after the model is built, in every environment |
| Catches | wrong rules, refactor regressions, edge cases not yet seen in data | bad or unexpected source data, broken grain, orphans, drift |
| Cost | tiny; dbt recommends skipping in prod: `--exclude-resource-type unit_test` | scans real data; tune with `where` and thresholds |
| Example here | dedupe order, look-back boundary, rating ladder | `unique` on `review_id`, thresholds and package tests (next lessons) |

Unit tests need the model’s direct parents to exist in the warehouse (dbt reads their column types), and a test with a `this` input needs the model’s own table too. In a fresh CI environment, `dbt run --empty` builds every model with zero rows cheaply, then unit tests can run; the lab’s first build simply excludes them (`--exclude-resource-type unit_test`). This is also why `fct_reviews` wraps its watermark in `coalesce`: `max()` over an empty table is `NULL`, and `>= NULL` would filter out every row forever.

> **On the job:** In an interview: “unit tests prove the SQL does what I meant on cases I designed; data tests prove the data is what I assumed. I need both: a unit test can’t know the source started sending ratings out of 100, and a data test can’t tell me my rounding is wrong on 2.5.”

> **The main idea:** unit tests check logic on designed rows before building; data tests check real data after building; a project needs both, for different failures.

*Read more:* [Unit tests](https://docs.getdbt.com/docs/build/unit-tests), [Data tests](https://docs.getdbt.com/docs/build/data-tests), [dbt build](https://docs.getdbt.com/reference/commands/build), [resource-type flags](https://docs.getdbt.com/reference/global-configs/resource-type).

---

<a id="slide-20"></a>
## 20. Data tests that fit reality: where, thresholds, severity, store_failures

*Part C · tests that warn, fail at a threshold, or look only at recent rows*

Generic tests (`unique`, `not_null`, `relationships`, `accepted_values`) come from *dbt fundamentals*. Real data needs them tuned, through **test configs**:

| Config | Effect |
|---|---|
| `severity: warn` | report failures without failing the run (default `error`) |
| `warn_if` / `error_if` | thresholds on the number of failing rows, for example warn above 0, error above 2 |
| `where` | test only a subset, such as recent rows or one region |
| `store_failures: true` | save the failing rows in a table (schema `…_dbt_test__audit`) for triage |
| `limit` | stop after N failing rows on huge tables |

#### The tests on fct_reviews

```yaml
# models/marts/_reviews.yml
version: 2

models:
  - name: fct_reviews
    description: One row per product review, latest version. Incremental (merge) with a look-back window.
    columns:
      - name: review_id
        data_tests: [unique, not_null]
      - name: rating
        data_tests:
          - not_null:
              config:
                warn_if: ">0"            # any unrated review is worth a look
                error_if: ">2"           # more than two breaks the build
      - name: customer_id
        data_tests:
          - relationships:
              arguments:
                to: ref('dim_customer')
                field: customer_id
              config:
                where: "review_date >= '2026-03-04'"   # only recent rows: old orphans are known
                severity: warn
                store_failures: true     # keep the failing rows in a table
```

#### Build and triage

Terminal (output trimmed):

```text
$ dbt build --select fct_reviews
1 of 6 PASS fct_reviews::fct_reviews_lookback_window ........................... [PASS in x.xxs]
3 of 6 WARN 1 not_null_fct_reviews_rating ...................................... [WARN 1 in x.xxs]
4 of 6 PASS not_null_fct_reviews_review_id ..................................... [PASS in x.xxs]
5 of 6 WARN 1 relationships_fct_reviews_customer_id__customer_id__ref_dim_customer_  [WARN 1 in x.xxs]
6 of 6 PASS unique_fct_reviews_review_id ....................................... [PASS in x.xxs]
[WARNING]: in test not_null_fct_reviews_rating (models\marts\_reviews.yml)
[WARNING]: Got 1 result, configured to warn if >0
[WARNING]: in test relationships_fct_reviews_customer_id__customer_id__ref_dim_customer_ (models\marts\_reviews.yml)
[WARNING]: Got 1 result, configured to warn if != 0
Done. PASS=4 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select *
    from main_dbt_test__audit.relationships_fct_reviews_d7ec62fe2dad54bd1cd5cfeb49dd9eb7"
Previewing inline node:
| from_field |
| ---------- |
| u6         |
```

Two warnings, no error: r5 has no rating (1 row, below the error threshold), and r7’s customer u6 is missing from the CRM seed (stored for triage). The build stays usable while someone fixes the CRM export.

> **On the job:** Thresholds turn “the test is always red so we ignore it” into a signal: warn on any failure, fail the build only when the count means the data is unusable. Stored failures give the on-call person the exact rows instead of a count.

> **The main idea:** tune data tests to reality: where for scope, warn_if/error_if for tolerance, severity for impact, store_failures for triage.

*Read more:* [severity, error_if, warn_if](https://docs.getdbt.com/reference/resource-configs/severity), [where](https://docs.getdbt.com/reference/resource-configs/where), [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures), [Data tests](https://docs.getdbt.com/docs/build/data-tests).

---

<a id="slide-21"></a>
## 21. Test packages and a singular test on the snapshot

*Part C · dbt_utils and dbt_expectations as test libraries*

Test packages add **generic tests** you configure in YAML like the built-in ones. **dbt_utils** (dbt Labs) has the everyday ones; **dbt_expectations** (a port of Python’s Great Expectations, now maintained by Metaplane) has many statistical and pattern checks. A **singular test** is a SQL file in `tests/` that returns failing rows: use it when no generic test expresses the rule.

#### Configured tests

```yaml
# the new tests (in models/staging/_sources.yml and models/marts/_reviews.yml)
version: 2

sources:
  - name: shop_raw
    tables:
      - name: supplier_products
        data_tests:
          - dbt_expectations.expect_table_row_count_to_be_between:   # a truncated extract
              arguments: {min_value: 3}                                # would "delete" products
        columns:
          - name: barcode
            data_tests:
              - dbt_expectations.expect_column_values_to_match_regex:
                  arguments: {regex: "^B[0-9]{3}$"}

models:
  - name: fct_reviews
    data_tests:
      - dbt_utils.expression_is_true:
          arguments: {expression: "updated_at_utc >= submitted_at_utc"}
    columns:
      - name: rating
        data_tests:
          - dbt_utils.accepted_range:
              arguments: {min_value: 1, max_value: 5}
  - name: dim_supplier_product
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          arguments: {combination_of_columns: [barcode, valid_from]}
```

#### A rule no package has

```sql
# tests/assert_one_current_version_per_barcode.sql
-- Singular test: every barcode has exactly one current version in the snapshot.
-- Returns the barcodes that break the rule; any row is a failure.
select barcode, count(*) as current_versions
from {{ ref('supplier_products_snapshot') }}
where dbt_valid_to = timestamp '9999-12-31'
group by barcode
having count(*) <> 1
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:accepted_range test_name:expression_is_true test_name:unique_combination_of_columns test_name:expect_table_row_count_to_be_between test_name:expect_column_values_to_match_regex assert_one_current_version_per_barcode
1 of 6 PASS assert_one_current_version_per_barcode ............................. [PASS in x.xxs]
2 of 6 PASS dbt_expectations_source_expect_column_values_to_match_regex_shop_raw_supplier_products_barcode___B_0_9_3_  [PASS in x.xxs]
3 of 6 PASS dbt_expectations_source_expect_table_row_count_to_be_between_shop_raw_supplier_products_3  [PASS in x.xxs]
4 of 6 PASS dbt_utils_accepted_range_fct_reviews_rating__5__1 .................. [PASS in x.xxs]
5 of 6 PASS dbt_utils_expression_is_true_fct_reviews_updated_at_utc_submitted_at_utc  [PASS in x.xxs]
6 of 6 PASS dbt_utils_unique_combination_of_columns_dim_supplier_product_barcode__valid_from  [PASS in x.xxs]
Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

`test_name:` selects tests by their generic test name. All six pass on day 3 data. The row-count test guards lesson 15’s risk: a truncated extract would otherwise mark products as deleted.

| Need | Test |
|---|---|
| value range | `dbt_utils.accepted_range`; `dbt_expectations.expect_column_values_to_be_between` |
| row rule across columns | `dbt_utils.expression_is_true` |
| composite grain | `dbt_utils.unique_combination_of_columns` |
| freshness of a model (not a source) | `dbt_utils.recency` |
| volume / truncated loads | `dbt_expectations.expect_table_row_count_to_be_between` |
| format | `dbt_expectations.expect_column_values_to_match_regex` |
| snapshot integrity | singular test: one current version per key |

> **On the job:** Install only what you use, pin versions, and read a package test’s SQL once (`dbt_packages/…/macros`) before relying on it; some dbt_expectations tests behave differently per warehouse. The deck *dbt packages and project quality* covers packages beyond tests.

> **The main idea:** package tests cover ranges, grains, volumes and patterns in YAML; write a singular test for project-specific rules such as one current version per key.

*Read more:* [dbt_utils on dbt Hub](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/), [dbt_expectations on dbt Hub](https://hub.getdbt.com/metaplane/dbt_expectations/latest/), [Packages](https://docs.getdbt.com/docs/build/packages), [Singular data tests](https://docs.getdbt.com/docs/build/data-tests#singular-data-tests).

---

<a id="slide-22"></a>
## 22. Interview pattern: which tool for which data?

*Part C · recognise the situation, name the tool added*

| You hear… | Reach for | Say also |
|---|---|---|
| “A 2-billion-row event table takes 3 hours to rebuild nightly.” | incremental: merge on event_id with a look-back, or microbatch by event date | how late events arrive; equivalence check; partitioning/clustering |
| “Events are immutable and delivered exactly once.” | incremental append | dedupe downstream if delivery is at-least-once |
| “Orders change status for weeks after they are placed.” | merge with `unique_key=order_id`; watermark on updated_at with a window | or a snapshot if every status change must be kept |
| “We need to know what a customer’s plan was last March.” | snapshot (SCD2) of the customer source, dimension on top | timestamp vs check; run frequency; hard deletes |
| “The source has no updated_at.” | snapshot with the check strategy | cost on wide tables; list the business columns |
| “The vendor sends only changed rows.” | snapshot with `hard_deletes: ignore` | deletions need their own feed |
| “Finance wants to re-run last year without blocking daily jobs.” | microbatch backfill with `--event-time-start/--event-time-end`, or a separate full refresh in a quiet window | `full_refresh: false` protects the table from accidents |
| “Someone simplified the dedupe and numbers moved.” | a unit test on the dedupe rule | data tests would not have caught a plausible but wrong value |
| “The test is red every day, so we ignore it.” | thresholds (`warn_if`/`error_if`), `where`, `store_failures` | an owner for each warning |
| “A small dimension, 50k rows.” | a plain `table` | incremental adds risk without saving anything |

> **On the job:** Interviewers rarely ask “what is microbatch?”. They describe a situation, like the left column, and listen for the tool, the risk you name (late data, deletes, cost), and how you would verify it. Practise saying all three in under a minute.

> **The main idea:** name the tool from the situation, then the risk and the check: incremental for cost, snapshots for history, unit tests for logic, data tests for data.

*Read more:* [About incremental models](https://docs.getdbt.com/docs/build/incremental-models-overview), [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [Unit tests](https://docs.getdbt.com/docs/build/unit-tests).

---

<a id="slide-23"></a>
## 23. Lab: incremental reviews and a supplier history

*Project · the brief, the steps, the expected results*

**Task.** Starting from `dbt-jinja-macros-project` and the fixtures in this deck (`data/raw/reviews`, `data/raw/supplier`, `scripts/load_day.py`), build what a team would ship: an incremental review fact that survives late and edited data, a history of the supplier catalogue, and tests that would catch the bugs of this deck. Try it yourself first; the finished project is [dbt-incremental-snapshots-project/](dbt-incremental-snapshots-project/README.md) next to this deck.

#### Steps (about 1.5 hours)

| # | Build | Lesson |
|---|---|---|
| 1 | `stg_reviews`: dedupe (latest edit, then latest delivery), rating conversion | 3 |
| 2 | `fct_reviews`: incremental, merge on `review_id`, 3-day look-back from a variable | 6, 9 |
| 3 | `supplier_products_snapshot`: check strategy on the business columns, `hard_deletes: new_record`, `dbt_valid_to_current` | 13–16 |
| 4 | `dim_supplier_product` on the snapshot | 16 |
| 5 | Three unit tests: dedupe, look-back boundary, rating ladder | 17–19 |
| 6 | Data tests: thresholds, `where`, `store_failures`; dbt_utils, dbt_expectations; one-current-version singular test | 20–21 |
| 7 | Day 1: `dbt build --exclude-resource-type unit_test` (unit tests need the tables); days 2–4 with `dbt build`; rerun day 4; run the equivalence check | 8, 10, 19 |

#### Project layout

```text
dbt-incremental-snapshots-project/
├── data/raw/              events (deck 1), reviews/ (5 daily files), supplier/ (3 full extracts)
├── scripts/               load_raw.py, load_day.py, replay.py, check_full_refresh.py
├── models/staging/        stg_reviews.sql (+ stg_events, stg_customers, stg_products)
│                          _sources.yml, _reviews.yml, _unit_tests.yml, _unit_tests_rating.yml
├── models/marts/          fct_reviews.sql (incremental), dim_supplier_product.sql (SCD2)
│                          _reviews.yml (tests), _unit_tests.yml (+ deck-1 marts)
├── snapshots/             supplier_products.yml
├── tests/                 assert_one_current_version_per_barcode.sql (+ deck-1 test)
├── packages.yml           dbt_utils, dbt_expectations (package-lock.yml pins them)
└── dbt_project.yml, profiles.yml, README.md, .gitignore
```

| Expected after day 4 (2026-03-05) | Value |
|---|---|
| `dbt build` summary | `Done. PASS=58 WARN=3 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=61` |
| `fct_reviews` | 9 rows, average rating 3.75, includes the late r9 |
| `supplier_products_snapshot` | 7 rows; 3 live products; B200 discontinued |
| `check_full_refresh.py fct_reviews` | EQUIVALENT |

> **On the job:** This is a realistic first incremental ticket: “the reviews model takes too long; make it incremental without losing data”. Shipping it with a look-back, a boundary unit test and an equivalence check is what separates a senior answer from “I added is_incremental()”.

> **The main idea:** ship incremental models and snapshots together with the tests that prove them: unit tests for the rules, data tests for the data, an equivalence check for the increments.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [Unit tests](https://docs.getdbt.com/docs/build/unit-tests).

---

<a id="slide-24"></a>
## 24. Lab: replay the week and verify against a full rebuild

*Project · executed from an empty folder, exactly as the README says*

#### Day 1 from nothing, then days 2–4

Terminal:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal (output trimmed):

```text
$ dbt deps
Installed from version 1.4.1
Installed from version 0.10.10
Installed from version 0.21.0
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-02
2026-03-02: raw.reviews 3 rows from 1 files; raw.supplier_products 3 rows from products_2026-03-02.jsonl
```

Terminal (output trimmed):

```text
$ dbt build --exclude-resource-type unit_test   # day 1: creates every table and the first snapshot
Done. PASS=57 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=58
```

Terminal:

```text
$ python scripts/replay.py 2026-03-03 2026-03-05 build
2026-03-03: files landed; dbt build -> ok
2026-03-04: files landed; dbt build -> ok
2026-03-05: files landed; dbt build -> ok
```

#### Rerun, verify, inspect

Terminal (output trimmed):

```text
$ dbt build   # day 4 again: a rerun must change nothing
21 of 61 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
49 of 61 WARN 1 not_null_fct_reviews_rating .................................... [WARN 1 in x.xxs]
52 of 61 WARN 1 relationships_fct_reviews_customer_id__customer_id__ref_dim_customer_  [WARN 1 in x.xxs]
Done. PASS=58 WARN=3 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=61
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_reviews
fct_reviews: incremental table 9 rows, full rebuild 9 rows
only in the incremental table: 0 rows
only in a full rebuild: 0 rows
EQUIVALENT
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select (select count(*) from {{ ref('fct_reviews') }}) as reviews,
    (select round(avg(rating), 2) from {{ ref('fct_reviews') }}) as avg_rating,
    (select count(*) from {{ ref('supplier_products_snapshot') }}) as snapshot_rows,
    (select count(*) from {{ ref('dim_supplier_product') }} where is_current and not is_discontinued) as live_products,
    (select string_agg(barcode, ',' order by barcode) from {{ ref('dim_supplier_product') }} where is_current and is_discontinued) as discontinued"
Previewing inline node:
| reviews | avg_rating | snapshot_rows | live_products | discontinued |
| ------- | ---------- | ------------- | ------------- | ------------ |
|       9 |       3.75 |             7 |             3 | B200         |
```

Rerunning day 4 changed nothing (the snapshot still has the same rows and the check still passes): the pipeline is **idempotent**, which is what lets an orchestrator retry it safely. The three warnings are the known data issues; nothing failed.

#### In your portfolio: Fuel Smart

| Leafy (this lab) | Fuel Smart |
|---|---|
| reviews, late and edited | Food.com reviews: make `fct_review` incremental (merge on review id) with a 3-day look-back on the review date |
| supplier catalogue, full extract | Open Food Facts product slice by barcode: snapshot label, Nutri-Score and NOVA changes |
| `last_modified_at` not always bumped | `last_modified_t`: check whether every edit bumps it before choosing timestamp |
| full extract → `new_record` | daily *delta* files → `hard_deletes: ignore`; full dumps → `new_record` |
| three unit tests | unit-test the nutrient-per-100-kcal maths and the ingredient matching rule |

#### Stretch

- Add r10 (day 5, a week late) and make the check pass without a full refresh (exercise 4).
- Replace the look-back with an ingestion-time watermark on `_loaded_at` and compare the two with the equivalence check.
- Rebuild `fct_reviews` as microbatch by `submitted_at_utc` and backfill March with `--event-time-start`.

> **On the job:** In a take-home or a portfolio, this slide is the evidence reviewers look for: commands that run from a clean folder, expected numbers, an idempotent rerun and a correctness check. Put the same four things in your README.

> **The main idea:** a pipeline is done when it rebuilds from an empty folder, reruns without changes, and its incremental tables equal a full rebuild.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [dbt build](https://docs.getdbt.com/reference/commands/build), [Open Food Facts data](https://world.openfoodfacts.org/data).

---

<a id="slide-25"></a>
## 25. Bug clinic: incremental models, snapshots and tests

*Practice · symptom → cause → fix added*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | Duplicate keys after a re-sent file or an edit | No `unique_key`: the strategy appends | `unique_key` + merge; then `--full-refresh` to remove existing duplicates | 5, 6, ex. 2 |
| 2 | A few late rows missing; every test green | Plain high-water mark | Look-back window (or ingestion-time watermark) + equivalence check | 8–10 |
| 3 | MERGE fails: a target row matched more than one source row | Key not unique inside the batch | Dedupe upstream (`QUALIFY row_number()`), test uniqueness in staging | 6 |
| 4 | Rows with a NULL key multiply on every run | NULL never equals NULL, so the merge never matches | `not_null` test on the key; filter or default NULL keys | 6 |
| 5 | Model fails only on its second run | Strategy or partition config is used only on later runs | Build changed incremental models twice in CI | 7 |
| 6 | New column missing from the table, or a binder error | `on_schema_change: ignore` | `append_new_columns` (or `fail`) and a backfill plan | 11 |
| 7 | Old rows NULL in a new column | Incremental runs never revisit rows outside the window | Full refresh or a one-off wide look-back | 11 |
| 8 | A daily aggregate undercounts after late rows | Only the new rows were aggregated | Recompute whole affected groups (delete+insert by group key) | ex. 6 |
| 9 | Microbatch run processes nothing | Batches are computed from the current time; data is older | `--event-time-start/--event-time-end`; check `begin` | 12 |
| 10 | Snapshot misses a change the business remembers | timestamp strategy and `updated_at` not bumped, or the change was reverted between runs | check strategy; snapshot more often | 13, 14, 16 |
| 11 | Half the catalogue “deleted” overnight | `invalidate`/`new_record` on a delta or truncated extract | `ignore` for deltas; a row-count test on the source | 15, 21, ex. 7 |
| 12 | Unit test: “Not able to get columns … because the relation doesn’t exist” | A parent, or for a `this` input the model itself, is not built in this environment | `dbt run --empty` or a first build without unit tests | 19, lab |
| 13 | Incremental model stays empty after `dbt run --empty` or a truncate | `max()` over an empty `{{ this }}` is NULL, and `>= NULL` keeps no rows | `coalesce` the watermark with an early date | 9, 19 |

> **On the job:** Most of these bugs are silent: the run is green and the numbers are slightly wrong. The defence is the same every time: a key test, a unit test on the rule, and an equivalence or volume check that compares with an independent count.

> **The main idea:** incremental and snapshot bugs are mostly silent losses or duplicates; keys, boundary unit tests and equivalence checks make them loud.

---

<a id="slide-26"></a>
## 26. Interview questions: incremental models

*Practice · say each answer aloud before revealing it*

These patterns recur in public dbt interview guides, candidates’ write-ups and the dbt docs (research done in October 2026). Answer aloud in about a minute, then open the model answer. Further practice: [30 dbt interview questions (analyticsengineering.com)](https://www.analyticsengineering.com/resources/dbt-interview-questions-and-answers).

<details><summary>“What is an incremental model, and when would you not use one?” · *checks: mechanics, cost vs risk judgement*</summary>

**Model answer (about 60 seconds):** It is a table that dbt creates in full on the first run and afterwards only updates with new or changed rows. Inside an is_incremental() block I filter the source, usually by a timestamp compared with the maximum already in {{ this }}; dbt puts the result in a temp table and applies a strategy such as merge. I use it when a full rebuild is too slow or expensive, typically large event or fact tables. I avoid it for small tables, or when the logic needs all history, like window functions over a customer’s lifetime, because incremental adds correctness risk that only pays off with real savings.

**Likely follow-up:** “What makes is_incremental() true?” → The model is materialized incremental, its table already exists, and the run is not a full refresh.

</details>

<details><summary>“Explain append, merge, delete+insert and insert_overwrite.” · *checks: strategies, unique_key, adapter awareness*</summary>

**Model answer (about 60 seconds):** Append inserts the batch and never updates, so it is only for immutable rows delivered once. Merge needs a unique_key and updates matching rows and inserts new ones in one statement; it is the default on Snowflake, BigQuery and Databricks. Delete+insert deletes target rows whose key appears in the batch and inserts the batch; it is used where merge is missing or slow on large batches. Insert_overwrite replaces whole partitions, such as days, on BigQuery or Spark. Support differs by adapter, and the strategy only runs from the second run, so I test that in CI.

**Likely follow-up:** “Your merge fails with “multiple source rows matched”. Why?” → The key is not unique inside the batch: dedupe upstream with row_number and test uniqueness in staging.

</details>

<details><summary>“How do you handle late-arriving data?” · *checks: look-back window, idempotency, choosing N*</summary>

**Model answer (about 60 seconds):** A plain watermark drops rows that arrive after newer ones. I re-read a window, for example max(updated_at) in the table minus three days, and merge on the key, so late rows are inserted and re-read rows are just updated; reruns give the same result. I choose the window by measuring lateness, the gap between event time and load time, and put it in a variable so it can be widened once for a repair. If lateness is unbounded, I filter on an ingestion timestamp instead. Microbatch with a lookback is the built-in version on dbt 1.9 and later.

**Likely follow-up:** “Some rows are a month late, once a quarter. What now?” → Keep the small window for daily runs and schedule a periodic wider run or full refresh; alert when the equivalence check finds differences.

</details>

<details><summary>“How do you know an incremental model is correct, and how do you repair it?” · *checks: equivalence check, unit test of the branch, backfill*</summary>

**Model answer (about 60 seconds):** Three checks. A unique and not_null test on the key catches duplicates. A unit test with is_incremental overridden to true and a this input tests the filter, including the window boundary. And an equivalence check compares the table with a full rebuild of the same model, both ways with EXCEPT plus row counts, on a schedule or a recent slice. To repair, I run with a wider look-back for the affected period, or a full refresh in a quiet window, or with microbatch I re-run only the affected batches with event-time start and end.

**Likely follow-up:** “The table is two billion rows. Full refresh?” → Avoid it: backfill by period (microbatch or a var-driven window), and set full_refresh: false so nobody rebuilds it by accident.

</details>

<details><summary>“You add a column to an incremental model. What happens?” · *checks: on_schema_change, backfill*</summary>

**Model answer (about 60 seconds):** It depends on on_schema_change. The default, ignore, keeps the old table shape: the column is missing, or on some adapters the merge errors. Fail stops the run so a human decides. Append_new_columns adds it, but existing rows stay NULL because incremental runs only touch rows in the window; sync_all_columns also drops removed columns. So I use append_new_columns or fail, and plan a backfill: full refresh or a one-off wide window.

**Likely follow-up:** “Would you choose sync_all_columns?” → Only when the table should mirror the SELECT exactly and dropping a column is safe for every consumer.

</details>

> **The main idea:** strong answers name the mechanism, the failure mode (late data, duplicates, schema drift) and the check that proves correctness.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy).

---

<a id="slide-27"></a>
## 27. Interview questions: snapshots and tests

*Practice · say each answer aloud before revealing it*

<details><summary>“What is a snapshot, and how do the timestamp and check strategies differ?” · *checks: SCD2, choosing a strategy*</summary>

**Model answer (about 60 seconds):** A snapshot keeps the history of a mutable source as SCD type 2: each change closes the current version with dbt_valid_to and opens a new one. The timestamp strategy detects a change when the updated_at column moves forward, so it is cheap and its validity times come from the source, but it misses changes that do not bump updated_at. The check strategy compares the values of check_cols, so it catches silent changes, but it costs more on wide tables and its validity times are the run times. I choose by how much I trust the source’s updated_at.

**Likely follow-up:** “check_cols: all, any risk?” → A volatile column such as an extract timestamp creates a new version every run; list the business columns.

</details>

<details><summary>“What can a snapshot not do?” · *checks: history limits, hard deletes, operations*</summary>

**Model answer (about 60 seconds):** It only sees the source when it runs, so a change that is reverted between runs leaves no trace, and history starts on the first run. It cannot be rebuilt, because the source no longer has the old values, so I protect the snapshot schema and never drop it casually. Deletions are ignored by default; hard_deletes invalidate or new_record track them, but only if the source is a full extract. With delta feeds, absence means nothing, so I keep ignore and add a row-count test against truncated extracts.

**Likely follow-up:** “How do you use a snapshot downstream?” → Build an SCD2 dimension on it (surrogate key from dbt_scd_id, valid_from/valid_to, is_current) and join facts on key and time range.

</details>

<details><summary>“Unit tests or data tests?” · *checks: logic vs data, when each runs*</summary>

**Model answer (about 60 seconds):** A unit test runs a model on hand-made input rows and compares exact expected rows, so it checks logic, such as a dedupe order, a CASE ladder or a window boundary, before anything is built, in dev and CI. A data test runs on real data after the build and returns failing rows: uniqueness, not null, relationships, ranges. They catch different failures: a unit test cannot know the source started sending a new format, and a data test cannot tell that my rounding is wrong on 2.5. I write unit tests for rules that someone could plausibly simplify wrongly, and data tests on every key and grain.

**Likely follow-up:** “How do you unit-test an incremental model?” → Override is_incremental to true, give a this input with the existing rows, and expect the rows the SELECT returns, not the merged table.

</details>

<details><summary>“A data test fails every day and people ignore it. What do you do?” · *checks: test configs, ownership*</summary>

**Model answer (about 60 seconds):** Make it reflect what is actually acceptable. Thresholds with warn_if and error_if turn a count into a signal; where limits the test to the rows that matter, such as recent data; severity warn reports known issues without blocking the pipeline; store_failures keeps the failing rows for triage. Then give each warning an owner, or fix the source. For volume and patterns I use package tests like dbt_expectations row-count bounds, and singular tests for project-specific rules such as one current version per key.

**Likely follow-up:** “Which test would have caught a truncated supplier file?” → A row-count bound on the source (expect_table_row_count_to_be_between), or a singular test comparing today’s count with yesterday’s.

</details>

> **The main idea:** snapshots record only what they observe; unit tests prove rules, data tests prove data, and test configs keep the signal useful.

*Read more:* [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [hard_deletes](https://docs.getdbt.com/reference/resource-configs/hard-deletes), [Unit tests](https://docs.getdbt.com/docs/build/unit-tests), [Data tests](https://docs.getdbt.com/docs/build/data-tests).

---

<a id="slide-28"></a>
## 28. Exercises 1–3: warm-ups

*Exercises · one concept each*

Work in the project folder from the lessons (or in `dbt-incremental-snapshots-project/` after the lab, which ends in the same state: data landed up to 2026-03-05). Each solution was applied to a scratch copy of the project and run with dbt during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Predict the compiled SQL

*Pattern: “what does is_incremental() do?” · predict the output · about 5 minutes.* Without running anything, write down whether the compiled SQL of `fct_reviews` contains the `where updated_at_utc >= …` block in three situations: (a) the table does not exist yet, (b) it exists and you run `dbt compile`, (c) it exists and you add `--full-refresh`. Then check with `dbt compile`.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Find and fix the duplicates

*Pattern: “why do I have duplicates after a rerun?” · find and fix the bug · about 10 minutes.* `fct_reviews_append` (lesson 5) has two rows for r2. Fix the model so each review appears once, and make the existing table clean. Expected: one row per `review_id` (9 rows with data up to 5 March).

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Snapshot prices without an updated_at

*Pattern: “design a snapshot for a source without timestamps” · write the config · about 10 minutes.* The product seed (`stg_products`) has no change timestamp. Snapshot its `list_price` history with current rows ending on 9999-12-31, run it, raise P2 (Snake Plant) from 25.00 to 27.00 in `seeds/products.csv`, reload the seed and snapshot again. Expected: two versions of P2, the 27.00 one current.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

---

<a id="slide-29"></a>
## 29. Exercises 4–5: late data and table comparison

*Exercises · interview level*

Work in the project folder from the lessons (or in `dbt-incremental-snapshots-project/` after the lab, which ends in the same state: data landed up to 2026-03-05). Each solution was applied to a scratch copy of the project and run with dbt during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 4 · A review that is a week late

*Pattern: late-arriving data, “repair without a full refresh” · about 10 minutes.* Land day 5 (`python scripts/load_day.py 2026-03-06`): it contains r11 and r10, which was written on 27 February. Predict whether `dbt run --select fct_reviews` picks up r10, verify with the equivalence check, then repair the table *without* `--full-refresh` and without editing the model.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Compare two tables properly

*Pattern: “how do you prove two tables are identical?” · write the query, predict the output · about 10 minutes.* (1) Predict what `EXCEPT` returns for a table with a duplicated row compared with the same table without the duplicate, then check with `EXCEPT ALL` and counts. (2) Write one SQL statement that returns every row that differs between `main_marts.fct_reviews` and a hand-written full rebuild from `main_staging.stg_reviews`. Expected: 0 rows.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

---

<a id="slide-30"></a>
## 30. Exercises 6–7: aggregates and delta feeds

*Exercises · interview level*

Work in the project folder from the lessons (or in `dbt-incremental-snapshots-project/` after the lab, which ends in the same state: data landed up to 2026-03-05). Each solution was applied to a scratch copy of the project and run with dbt during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 6 · An incremental aggregate with a composite key

*Pattern: “make a daily summary incremental” · write the model · about 15 minutes.* Build `fct_product_daily_ratings` on `fct_reviews`: one row per `product_id` and `review_date` with `reviews`, `rated_reviews`, `avg_rating`. Make it incremental so that the late r9 (P4, 3 March) updates the 3 March row for P4 on day 4. Prove it with `check_full_refresh.py`. Expected for P4 on 3 March after day 4: 2 reviews, 1 rated (r5 has no rating).

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · The supplier switches to delta files

*Pattern: “hard deletes and delta feeds” · predict, then explain the design · about 15 minutes.* From 5 March the supplier sends only *changed* products: the new file contains just B400 with a new label. Predict which barcodes are current in `snap_del_ignore` and in `snap_del_invalidate` (lesson 15) after the next snapshot, run it, and say which setting the project should use from now on.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

---

<a id="slide-31"></a>
## 31. Exercises 8–10: tests and design

*Exercises · interview level and stretch*

Work in the project folder from the lessons (or in `dbt-incremental-snapshots-project/` after the lab, which ends in the same state: data landed up to 2026-03-05). Each solution was applied to a scratch copy of the project and run with dbt during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 8 · Unit-test the SCD2 dimension flags

*Pattern: “what would you unit test?” · write the test · about 15 minutes.* `dim_supplier_product` (lesson 16) derives `is_current` from `dbt_valid_to` and `is_discontinued` from `dbt_is_deleted`, which is `NULL` for versions written before deletion tracking was switched on. Write a unit test with three snapshot rows (a live product, an old version with `NULL` `dbt_is_deleted`, a deletion record) and the expected flags.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Stop the snapshot when the extract is truncated

*Pattern: “protect history from a bad load” · debug and explain · about 10 minutes.* The project snapshot uses `hard_deletes: new_record`. One morning the extract arrives truncated: only B400 (use the delta file from exercise 7 as the truncated file). Show that `dbt build` on the source and everything downstream does *not* mark B100 and B300 as deleted, and explain which test is responsible and which setting would break the protection.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Design the Fuel Smart history and increments

*Pattern: design task / take-home · about 20 minutes.* Fuel Smart has (1) 1.4M dated Food.com reviews that are almost never edited, and (2) Open Food Facts products delivered as *daily delta files* with a `last_modified_t` that is bumped on every edit. For each, choose materialization, strategy and the key settings, name the main risk and the test that guards it. Write the two configs (use the Leafy source as a stand-in so dbt can parse them).

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

---

<a id="slide-32"></a>
## 32. Cheat sheet

*Reference · the deck on one page*

#### Incremental models

| Need | Write |
|---|---|
| basic | `config(materialized='incremental', unique_key='id', incremental_strategy='merge')` |
| filter on later runs | `{% if is_incremental() %} where … {% endif %}` |
| the existing table | `{{ this }}` |
| look-back window | `where t >= (select max(t) - interval {{ var('n', 3) }} day from {{ this }})` |
| composite key | `unique_key=['a', 'b']` |
| update some columns only | `merge_update_columns` / `merge_exclude_columns` |
| schema changes | `on_schema_change='append_new_columns'` (or `fail`) |
| protect a huge table | `full_refresh=false` |
| microbatch | `incremental_strategy='microbatch', event_time=…, batch_size='day', lookback=3, begin=…` |

#### Snapshots and tests

| Need | Write |
|---|---|
| timestamp snapshot | `strategy: timestamp`, `updated_at: col` |
| check snapshot | `strategy: check`, `check_cols: [a, b]` |
| deletions | `hard_deletes: ignore \| invalidate \| new_record` |
| end date for current rows | `dbt_valid_to_current: "cast('9999-12-31' as timestamp)"` |
| unit test | `unit_tests: model, given (input, rows), expect (rows)` |
| unit-test the incremental branch | `overrides: macros: {is_incremental: true}` + `input: this` |
| test tolerance | `config: {warn_if: ">0", error_if: ">2"}` |
| test scope / triage | `where: "…"`, `store_failures: true` |
| package tests | `dbt_utils.accepted_range`, `dbt_expectations.expect_table_row_count_to_be_between` |

| Command | Does |
|---|---|
| `dbt run -s m --full-refresh` | rebuild an incremental model from its full SELECT |
| `dbt run -s m --vars '{n: 30}'` | one-off wider look-back (repair without a full refresh) |
| `dbt run -s m --event-time-start A --event-time-end B` | microbatch backfill of a date range; `dbt retry` re-runs failed batches |
| `dbt compile -s m --full-refresh` | the full-rebuild SQL, for an equivalence check |
| `dbt snapshot` | run snapshots (also part of `dbt build`); no full refresh exists |
| `dbt test -s test_type:unit` / `--exclude-resource-type unit_test` | only unit tests (dev, CI) / skip them (prod) |
| `dbt run --empty` | build schemas with zero rows so unit tests can run in a fresh environment |

> **The main idea:** incremental = filter + key + strategy + a check against a full rebuild; snapshot = strategy + deletes + a schedule; tests = unit for rules, data for data.

---

<a id="slide-33"></a>
## 33. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Incremental model | A table built in full once, then updated with only new or changed rows |
| is_incremental() | True when the model is incremental, its table exists, and the run is not a full refresh |
| {{ this }} | The model’s own existing table |
| High-water mark (watermark) | The largest time value already loaded; rows above it are treated as new |
| Temp relation | The temporary table holding a run’s batch before the strategy moves it into the target |
| Incremental strategy | The SQL that applies a batch: append, merge, delete+insert, insert_overwrite, microbatch |
| unique_key | The column(s) identifying a row; turns appends into upserts |
| Upsert | Update if the key exists, insert otherwise (what merge does) |
| Partition | A slice of a table (often one day) that a warehouse can replace as a unit |
| Late-arriving data | Rows whose event time is older than rows already loaded |
| Look-back window | Re-reading the last N days on every run so late and edited rows are merged |
| Ingestion time | When a row landed in the warehouse (`_loaded_at`), as opposed to when the event happened |
| Idempotent | Running the same step twice gives the same result |
| Equivalence check | Comparing an incremental table with a full rebuild, both directions plus counts |
| Full refresh | Rebuilding an incremental model from its full SELECT (`--full-refresh`) |
| Backfill | Re-processing a past period, for example after a bug or a new column |
| on_schema_change | What an incremental model does when its columns change: ignore, fail, append_new_columns, sync_all_columns |
| Microbatch | Incremental strategy that processes and replaces time batches by event_time (dbt 1.9+) |
| event_time / batch_size / lookback / begin | Microbatch settings: the time column, batch length, batches re-run, history start |
| Snapshot | dbt’s SCD type 2 history of a mutable source |
| Snapshot strategy | timestamp (trust updated_at) or check (compare check_cols values) |
| Hard delete / soft delete | A row removed from the source / a row flagged as deleted but kept |
| hard_deletes | Snapshot setting for removed rows: ignore, invalidate, new_record |
| Full extract / delta | A file with every live row / a file with only changed rows |
| dbt_valid_to_current | The value used for dbt_valid_to of current rows instead of NULL |
| Unit test | A test of a model’s logic on designed input rows and exact expected rows (dbt 1.8+) |
| Fixture | Hand-written test input (YAML dicts, CSV or SQL) |
| overrides | Unit-test replacements for macros, vars or env vars |
| Data test | A query on real data that returns failing rows (generic or singular) |
| warn_if / error_if | Thresholds on the number of failing rows |
| store_failures | Saving a test’s failing rows in a table for triage |
| Package | A dbt project installed with dbt deps (dbt_utils, dbt_expectations) |

---

<a id="slide-34"></a>
## 34. What to remember, and what comes next

*Reference · recap*

1. **An incremental run** filters with `is_incremental()`, stores the batch in a temp table and applies a strategy to `{{ this }}`.
2. **The key and the strategy** decide duplicates: append for immutable rows, merge or delete+insert with a `unique_key`, insert_overwrite or microbatch for partitions and time batches.
3. **Late data is lost silently** by a plain watermark; a look-back window plus merge fixes it, chosen from measured lateness.
4. **Prove correctness** with an equivalence check against a full rebuild; repair with a wider window, a backfill or a full refresh.
5. **Schema changes** need a deliberate `on_schema_change` and a backfill plan.
6. **Snapshots** record what they observe: timestamp trusts `updated_at`, check compares values; `hard_deletes` depends on full extract vs delta; history cannot be rebuilt.
7. **Unit tests** pin rules on designed rows (including the incremental branch); **data tests** check real data, tuned with thresholds, `where` and `store_failures`.

#### Practise this week

- Redo the lab from `dbt-jinja-macros-project/` without looking, then compare with `dbt-incremental-snapshots-project/`.
- Do exercises 4, 6 and 7 again without hints.
- Explain aloud in two minutes: merge vs delete+insert, how you handle late data, and timestamp vs check.
- Fuel Smart: make `fct_review` incremental with a 3-day look-back and snapshot one Open Food Facts slice.

#### Coming up

Next in the dbt track: deployment and CI (environments, `state:modified+`, `--defer`, building changed incremental models twice), and governance (contracts, versions). Packages beyond tests, project evaluation and SQL linting are in *dbt packages and project quality*.

> **The main idea:** fast is easy; fast and correct needs a key, a window, a check against a full rebuild, and tests for both the rules and the data.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [Unit tests](https://docs.getdbt.com/docs/build/unit-tests).

---

<a id="slide-35"></a>
## 35. References and how this deck was tested

*References · official documentation*

- [About incremental models](https://docs.getdbt.com/docs/build/incremental-models-overview), [configuring incremental models](https://docs.getdbt.com/docs/build/incremental-models), [incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy), [best practices: incremental models](https://docs.getdbt.com/best-practices/materializations/4-incremental-models).
- [microbatch](https://docs.getdbt.com/docs/build/incremental-microbatch), [lookback](https://docs.getdbt.com/reference/resource-configs/lookback), [event_time](https://docs.getdbt.com/reference/resource-configs/event-time), [on_schema_change](https://docs.getdbt.com/docs/build/incremental-models#what-if-the-columns-of-my-incremental-model-change), [full_refresh](https://docs.getdbt.com/reference/resource-configs/full_refresh).
- [snapshots](https://docs.getdbt.com/docs/build/snapshots), [snapshot configurations](https://docs.getdbt.com/reference/snapshot-configs), [strategy](https://docs.getdbt.com/reference/resource-configs/strategy), [check_cols](https://docs.getdbt.com/reference/resource-configs/check_cols), [hard_deletes](https://docs.getdbt.com/reference/resource-configs/hard-deletes), [dbt_valid_to_current](https://docs.getdbt.com/reference/resource-configs/dbt_valid_to_current), [snapshot_meta_column_names](https://docs.getdbt.com/reference/resource-configs/snapshot_meta_column_names).
- [unit tests](https://docs.getdbt.com/docs/build/unit-tests), [unit_tests properties](https://docs.getdbt.com/reference/resource-properties/unit-tests), [overrides](https://docs.getdbt.com/reference/resource-properties/unit-test-overrides), [unit testing incremental and versioned models](https://docs.getdbt.com/reference/resource-properties/unit-testing-versions).
- [data tests](https://docs.getdbt.com/docs/build/data-tests), [severity, warn_if, error_if](https://docs.getdbt.com/reference/resource-configs/severity), [where](https://docs.getdbt.com/reference/resource-configs/where), [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures), [dbt_utils](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/), [dbt_expectations](https://hub.getdbt.com/metaplane/dbt_expectations/latest/).
- [dbt-duckdb setup](https://docs.getdbt.com/docs/local/connect-data-platform/duckdb-setup), [dbt build](https://docs.getdbt.com/reference/commands/build), [dbt snapshot](https://docs.getdbt.com/reference/commands/snapshot), [DuckDB MERGE INTO](https://duckdb.org/docs/stable/sql/statements/merge_into).
- Further interview practice: [30 dbt interview questions (analyticsengineering.com)](https://www.analyticsengineering.com/resources/dbt-interview-questions-and-answers).

**Testing:** built with dbt-core 1.12.5, dbt-duckdb 1.11.0 and DuckDB 1.5.6 on CPython 3.12.10 (Windows 11). The build copied the exported project of *dbt Jinja and macros* into a scratch folder, added the fixtures and loader, and replayed the days in the order of the lessons; every `dbt` command and Python block ran there. Exercise solutions and the on_schema_change lesson ran in separate copies. The finished project was exported to `dbt-incremental-snapshots-project/` and rebuilt day by day from an empty folder (the lab). Not executed: `insert_overwrite` on a warehouse that supports it, and the hosted dbt Learn courses. Output normalisation: leading clock times removed, durations replaced by `x.xx`, temporary table suffixes replaced by `<timestamp>`, absolute paths replaced by placeholders, some long outputs trimmed (labelled). Telemetry was disabled with `send_anonymous_usage_stats: false`.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Predict the compiled SQL

List the three conditions of `is_incremental()` from lesson 4 and test each situation against them. `dbt compile` evaluates `is_incremental()` against the real warehouse.

<a id="hint-2"></a>
### Hint 2 · Find and fix the duplicates

Two separate problems: the config that caused the duplicates, and the duplicates already stored in the table. Does a config change rewrite rows that are already there?

<a id="hint-3"></a>
### Hint 3 · Snapshot prices without an updated_at

No timestamp means one strategy. Which columns should trigger a new version? Lesson 16 shows the config for a far-future end date.

<a id="hint-4"></a>
### Hint 4 · A review that is a week late

Compute the window start: the newest `updated_at_utc` already in the table minus 3 days. The window length is a variable (lesson 9).

<a id="hint-5"></a>
### Hint 5 · Compare two tables properly

`EXCEPT` is a set operation (it removes duplicates); `EXCEPT ALL` keeps multiplicities. Compare in both directions and glue the halves with `UNION ALL`.

<a id="hint-6"></a>
### Hint 6 · An incremental aggregate with a composite key

A daily average cannot be updated from the new rows alone. Find the groups touched by changed reviews, then recompute those groups from *all* their reviews; the group is the `unique_key`.

<a id="hint-7"></a>
### Hint 7 · The supplier switches to delta files

After loading, `raw.supplier_products` has one row. What does `invalidate` conclude about every barcode that is not in the source?

<a id="hint-8"></a>
### Hint 8 · Unit-test the SCD2 dimension flags

The input is the snapshot: `input: ref('supplier_products_snapshot')`. List only the columns the logic reads, and expect only the columns you assert on. Booleans are `true`/`false`.

<a id="hint-9"></a>
### Hint 9 · Stop the snapshot when the extract is truncated

In `dbt build`, a failing test on a node makes dbt skip the nodes downstream of it. Lesson 21 attached a test to the source.

<a id="hint-10"></a>
### Hint 10 · Design the Fuel Smart history and increments

Use the “which tool?” table (lesson 22). For the products, the delivery format decides `hard_deletes`; the trustworthiness of the timestamp decides the strategy.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was applied to a scratch copy of the project and run with dbt during the build; the outputs shown are real (clock times and durations normalised), and the Python checks (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Predict the compiled SQL

Terminal (output trimmed):

```text
$ dbt compile --select fct_reviews   # (b) the table exists
Compiled node 'fct_reviews' is:
from "leafy"."main_staging"."stg_reviews"
where updated_at_utc >= (
    select coalesce(max(updated_at_utc), timestamp '1900-01-01') - interval 3 day
    from "leafy"."main_marts"."fct_reviews"
)
```

Terminal (output trimmed):

```text
$ dbt compile --select fct_reviews --full-refresh   # (c)
Compiled node 'fct_reviews' is:
from "leafy"."main_staging"."stg_reviews"
```

```python
import duckdb
with duckdb.connect("leafy.duckdb") as con:          # scratch copy only
    con.execute("drop table main_marts.fct_reviews")
    print(con.sql("select count(*) as tables_named_fct_reviews from information_schema.tables where table_name = 'fct_reviews'"))
```

Output:

```text
┌──────────────────────────┐
│ tables_named_fct_reviews │
│          int64           │
├──────────────────────────┤
│                        0 │
└──────────────────────────┘
```

Terminal (output trimmed):

```text
$ dbt compile --select fct_reviews   # (a) the table does not exist
Compiled node 'fct_reviews' is:
from "leafy"."main_staging"."stg_reviews"
```

**Why.** Only (b) meets all three conditions (incremental materialization, the table exists, no full refresh), so only (b) has the filter. **Common wrong answer:** “(c) has the filter because the table exists”: `--full-refresh` makes `is_incremental()` false. **Interviewer follow-up:** “and if the table exists but is a view?” → dbt treats it as a full refresh too, and replaces the view with a table.

<a id="solution-2"></a>
### Solution 2 · Find and fix the duplicates

```diff
# models/lessons/fct_reviews_append.sql (changed line)
-{{ config(materialized='incremental') }}
+{{ config(materialized='incremental', unique_key='review_id', incremental_strategy='merge') }}
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_append   # incremental run with the new config
1 of 1 OK created sql incremental model main_lessons.fct_reviews_append ........ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select review_id, count(*) as copies
    from {{ ref('fct_reviews_append') }}
    group by review_id
    having count(*) > 1"
Previewing inline node:
| review_id | copies |
| --------- | ------ |
| r2        |      2 |
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews_append --full-refresh
1 of 1 OK created sql incremental model main_lessons.fct_reviews_append ........ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select count(*) as reviews, count(distinct review_id) as distinct_ids
    from {{ ref('fct_reviews_append') }}"
Previewing inline node:
| reviews | distinct_ids |
| ------- | ------------ |
|       9 |            9 |
```

**Why.** `unique_key` + merge stops *new* duplicates, but the two r2 rows already in the table both match the key, so the merge updates both and they stay. Only a full refresh (or a one-off dedupe) cleans existing data. **Common wrong answer:** “add unique_key and rerun”: the duplicates survive, as the first query shows. **Interviewer follow-up:** “the table is too big to rebuild” → delete the duplicates in place with a one-off statement keeping the latest version per key, then add a `unique` test so it never happens silently again.

<a id="solution-3"></a>
### Solution 3 · Snapshot prices without an updated_at

```yaml
# snapshots/products_snapshot.yml
snapshots:
  - name: products_snapshot
    relation: ref('stg_products')
    config:
      unique_key: product_id
      strategy: check                  # the seed has no updated_at column
      check_cols: [list_price]
      dbt_valid_to_current: "cast('9999-12-31' as timestamp)"
```

Terminal (output trimmed):

```text
$ dbt snapshot --select products_snapshot
1 of 1 OK snapshotted main_snapshots.products_snapshot ......................... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt seed --select products   # after changing P2 from 25.00 to 27.00
1 of 1 OK loaded seed file main_seeds.products ................................. [INSERT 4 in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt snapshot --select products_snapshot
1 of 1 OK snapshotted main_snapshots.products_snapshot ......................... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select product_id, list_price, dbt_valid_to = timestamp '9999-12-31' as is_current
    from {{ ref('products_snapshot') }}
    where product_id = 'P2'
    order by is_current"
Previewing inline node:
| product_id | list_price | is_current |
| ---------- | ---------- | ---------- |
| P2         |         25 |      False |
| P2         |         27 |       True |
```

**Why.** The check strategy compares `list_price` with the current version; 27.00 ≠ 25.00 closes the old version and opens a new one. **Common wrong answer:** `check_cols: all`, which also versions name typo fixes and category renames (maybe wanted, maybe noise; decide explicitly). **Interviewer follow-up:** “prices change several times a day but you snapshot nightly” → you only see end-of-day prices; if every change matters, capture changes at the source (CDC or an event stream) instead.

<a id="solution-4"></a>
### Solution 4 · A review that is a week late

Terminal:

```text
$ python scripts/load_day.py 2026-03-06
2026-03-06: raw.reviews 13 rows from 5 files; raw.supplier_products 3 rows from products_2026-03-04.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews
1 of 1 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_reviews
fct_reviews: incremental table 10 rows, full rebuild 11 rows
only in the incremental table: 0 rows
only in a full rebuild: 1 rows
┌───────────┬────────────┬─────────────┬────────┬───┬─────────────────────┬─────────────────────┬─────────────────────┐
│ review_id │ product_id │ customer_id │ rating │ … │  submitted_at_utc   │   updated_at_utc    │     _loaded_at      │
│  varchar  │  varchar   │   varchar   │ int32  │ … │      timestamp      │      timestamp      │      timestamp      │
├───────────┼────────────┼─────────────┼────────┼───┼─────────────────────┼─────────────────────┼─────────────────────┤
│ r10       │ P2         │ u5          │      4 │ … │ 2026-02-27 18:00:00 │ 2026-02-27 18:00:00 │ 2026-03-06 23:00:00 │
└───────────┴────────────┴─────────────┴────────┴───┴─────────────────────┴─────────────────────┴─────────────────────┘
  1 rows                                                                                          8 columns (7 shown)

DIFFERENT
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews --vars '{review_lookback_days: 10}'
1 of 1 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_reviews
fct_reviews: incremental table 11 rows, full rebuild 11 rows
only in the incremental table: 0 rows
only in a full rebuild: 0 rows
EQUIVALENT
```

**Why.** Before the run, the newest row was r8 (5 March 09:00), so the window started on 2 March 09:00 and r10 (27 February) was outside it. A one-off run with a 10-day window re-reads far enough back; merge inserts r10 and harmlessly updates the rest. **Common wrong answer:** “permanently set the window to 30 days”: every daily run then re-merges a month of data. **Interviewer follow-up:** “lateness is unbounded” → filter on the ingestion time (`_loaded_at > max(_loaded_at)`, optionally minus a small window), which catches r10 whatever its event date.

<a id="solution-5"></a>
### Solution 5 · Compare two tables properly

```python
import duckdb
con = duckdb.connect()                                   # in memory
con.execute("create table incremental_t as select * from (values ('r1', 5), ('r2', 2), ('r2', 2)) t(review_id, rating)")
con.execute("create table rebuild_t     as select * from (values ('r1', 5), ('r2', 2)) t(review_id, rating)")
q = lambda sql: con.sql(sql).fetchall()
plain = q("select * from incremental_t except select * from rebuild_t")
with_all = q("select * from incremental_t except all select * from rebuild_t")
counts = q("select (select count(*) from incremental_t), (select count(*) from rebuild_t)")
print("EXCEPT:", plain, "| EXCEPT ALL:", with_all, "| counts:", counts)
assert plain == [] and with_all == [('r2', 2)] and counts == [(3, 2)]

leafy = duckdb.connect("leafy.duckdb", read_only=True)   # now the real model vs a hand-written full rebuild
rebuild = """select review_id, product_id, customer_id, rating, cast(submitted_at_utc as date) as review_date,
                    submitted_at_utc, updated_at_utc, _loaded_at from main_staging.stg_reviews"""
diff = leafy.sql(f"""(select * from main_marts.fct_reviews except all ({rebuild}))
                     union all
                     (({rebuild}) except all select * from main_marts.fct_reviews)""").fetchall()
print("fct_reviews vs rebuild, rows that differ:", len(diff))
assert diff == []
```

Output:

```text
EXCEPT: [] | EXCEPT ALL: [('r2', 2)] | counts: [(3, 2)]
fct_reviews vs rebuild, rows that differ: 0
```

**Why.** Plain `EXCEPT` says “no difference” for a table with a duplicate, so the check script also compares counts; `EXCEPT ALL` both ways catches it directly. **Common wrong answer:** one direction only, which misses rows that are missing from the incremental table (the r9 bug). **Interviewer follow-up:** “the tables have 500M rows” → compare per-day counts and hashes (`count(*)`, `sum(hash(...))` grouped by date) first, then drill into the days that differ; on Snowflake or BigQuery restrict both sides to a recent window.

<a id="solution-6"></a>
### Solution 6 · An incremental aggregate with a composite key

```sql
# models/marts/fct_product_daily_ratings.sql
{{
    config(
        materialized='incremental',
        unique_key=['product_id', 'review_date'],
        incremental_strategy='delete+insert'
    )
}}
-- fct_product_daily_ratings: one row per product per review date (grain: product_id, review_date).
-- Incremental runs recompute every (product, day) group that has a review changed in the window.
with changed_groups as (

    select distinct product_id, review_date
    from {{ ref('fct_reviews') }}
    {% if is_incremental() %}
    where updated_at_utc >= (
        select max(max_updated_at_utc) - interval {{ var('review_lookback_days', 3) }} day from {{ this }}
    )
    {% endif %}

)

select
    r.product_id,
    r.review_date,
    count(*)                as reviews,
    count(r.rating)         as rated_reviews,
    avg(r.rating)           as avg_rating,
    max(r.updated_at_utc)   as max_updated_at_utc
from {{ ref('fct_reviews') }} as r
join changed_groups using (product_id, review_date)
group by r.product_id, r.review_date
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-04
2026-03-04: raw.reviews 8 rows from 3 files; raw.supplier_products 3 rows from products_2026-03-04.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews fct_product_daily_ratings --full-refresh   # start clean on day 3
1 of 2 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
2 of 2 OK created sql incremental model main_marts.fct_product_daily_ratings ... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-05
2026-03-05: raw.reviews 11 rows from 4 files; raw.supplier_products 3 rows from products_2026-03-04.jsonl
```

Terminal (output trimmed):

```text
$ dbt run --select fct_reviews fct_product_daily_ratings   # day 4, r9 arrives late
1 of 2 OK created sql incremental model main_marts.fct_reviews ................. [OK in x.xxs]
2 of 2 OK created sql incremental model main_marts.fct_product_daily_ratings ... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select product_id, review_date, reviews, rated_reviews, avg_rating
    from {{ ref('fct_product_daily_ratings') }}
    where product_id = 'P4'"
Previewing inline node:
| product_id | review_date | reviews | rated_reviews | avg_rating |
| ---------- | ----------- | ------- | ------------- | ---------- |
| P4         |  2026-03-03 |       2 |             1 |          5 |
```

Terminal:

```text
$ python scripts/check_full_refresh.py fct_product_daily_ratings
fct_product_daily_ratings: incremental table 8 rows, full rebuild 8 rows
only in the incremental table: 0 rows
only in a full rebuild: 0 rows
EQUIVALENT
```

**Why.** The window finds changed reviews; `changed_groups` turns them into (product, day) groups; the SELECT recomputes those groups from all their reviews; delete+insert on the composite key replaces exactly those rows. **Common wrong answer:** aggregating only the new rows: on day 4 the 3 March row for P4 would be overwritten with r9 alone (1 review, average 5), losing r5. **Interviewer follow-up:** “the source is 1B rows” → recompute only the affected days (filter `fct_reviews` by those dates first) and partition both tables by date; or make it microbatch by `review_date`.

<a id="solution-7"></a>
### Solution 7 · The supplier switches to delta files

```json
# data/raw/supplier/products_2026-03-05.jsonl (the new delta file)
{"barcode": "B400", "product_name": "Seed Starter Mix", "brand": "SproutCo", "label": "peat-free; organic", "npk": "1-1-1", "last_modified_at": "2026-03-04 15:00:00"}
```

Terminal:

```text
$ python scripts/load_day.py 2026-03-05
2026-03-05: raw.reviews 11 rows from 4 files; raw.supplier_products 1 rows from products_2026-03-05.jsonl
```

Terminal (output trimmed):

```text
$ dbt snapshot --select snap_del_ignore snap_del_invalidate
1 of 2 OK snapshotted main_snapshots.snap_del_ignore ........................... [OK in x.xxs]
2 of 2 OK snapshotted main_snapshots.snap_del_invalidate ....................... [OK in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select 'ignore' as hard_deletes, barcode as current_barcode, label
    from {{ ref('snap_del_ignore') }}
    where dbt_valid_to is null
    union all select 'invalidate', barcode, label
    from {{ ref('snap_del_invalidate') }}
    where dbt_valid_to is null
    order by 1, 2"
Previewing inline node:
| hard_deletes | current_barcode | label              |
| ------------ | --------------- | ------------------ |
| ignore       | B100            | organic; pet-safe  |
| ignore       | B200            | peat-free          |
| ignore       | B300            |                    |
| ignore       | B400            | peat-free; organic |
| invalidate   | B400            | peat-free; organic |
```

**Why.** `invalidate` treats absence as deletion, so B100 and B300 were closed although nothing happened to them; only B400 is current. `ignore` recorded B400’s new label and left the rest alone (B200, deleted on day 3, also stays current: deletions now need another source). For delta feeds use `ignore`. **Common wrong answer:** “new_record is safer”: it would add deletion records for B100 and B300, the same mistake with more rows. **Interviewer follow-up:** “how do you learn about real deletions then?” → a periodic full dump (snapshotted separately with `invalidate`), or a deletion list from the vendor, or a soft-delete flag in the feed.

<a id="solution-8"></a>
### Solution 8 · Unit-test the SCD2 dimension flags

```yaml
# models/marts/_unit_tests_dim.yml
unit_tests:
  - name: dim_supplier_product_flags
    description: is_current comes from the far-future end date; is_discontinued treats NULL as false.
    model: dim_supplier_product
    given:
      - input: ref('supplier_products_snapshot')
        rows:
          - {dbt_scd_id: a1, barcode: A, dbt_is_deleted: "False", dbt_valid_to: "9999-12-31 00:00:00"}
          - {dbt_scd_id: b1, barcode: B, dbt_is_deleted: null,    dbt_valid_to: "2026-03-03 00:00:00"}
          - {dbt_scd_id: b2, barcode: B, dbt_is_deleted: "True",  dbt_valid_to: "9999-12-31 00:00:00"}
    expect:
      rows:
        - {supplier_product_key: a1, is_current: true,  is_discontinued: false}
        - {supplier_product_key: b1, is_current: false, is_discontinued: false}
        - {supplier_product_key: b2, is_current: true,  is_discontinued: true}
```

Terminal (output trimmed):

```text
$ dbt test --select dim_supplier_product_flags
1 of 1 PASS dim_supplier_product::dim_supplier_product_flags ................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

**Why.** The test pins the two rules a reader could get wrong: `NULL` in `dbt_is_deleted` must mean “not discontinued” (without `coalesce`, `NULL = 'True'` is `NULL`, not false), and the deletion record is the current row. **Common wrong answer:** testing `count(*)` or real data in a unit test; unit tests use designed rows and exact expectations. **Interviewer follow-up:** “how would you test the point-in-time join of a fact to this dimension?” → a unit test on the fact model with two dimension versions and fact rows on, before and after the boundary.

<a id="solution-9"></a>
### Solution 9 · Stop the snapshot when the extract is truncated

Terminal:

```text
$ python scripts/load_day.py 2026-03-05
2026-03-05: raw.reviews 11 rows from 4 files; raw.supplier_products 1 rows from products_2026-03-05.jsonl
```

Terminal (output trimmed):

```text
$ dbt build --select source:shop_raw.supplier_products+ --exclude resource_type:unit_test
2 of 11 FAIL 1 dbt_expectations_source_expect_table_row_count_to_be_between_shop_raw_supplier_products_3  [FAIL 1 in x.xxs]
3 of 11 SKIP relation main_snapshots.snap_del_ignore ........................... [SKIP]
4 of 11 SKIP relation main_snapshots.snap_del_invalidate ....................... [SKIP]
5 of 11 SKIP relation main_snapshots.snap_del_new_record ....................... [SKIP]
6 of 11 SKIP relation main_snapshots.snap_supplier_check ....................... [SKIP]
7 of 11 SKIP relation main_snapshots.snap_supplier_ts .......................... [SKIP]
8 of 11 SKIP relation main_snapshots.supplier_products_snapshot ................ [SKIP]
9 of 11 SKIP test assert_one_current_version_per_barcode ....................... [SKIP]
10 of 11 SKIP relation main_marts.dim_supplier_product ......................... [SKIP]
11 of 11 SKIP test dbt_utils_unique_combination_of_columns_dim_supplier_product_barcode__valid_from  [SKIP]
Done. PASS=1 WARN=0 ERROR=1 SKIP=9 NO-OP=0 REUSED=0 TOTAL=11
[exit code 1]
```

**Why.** `expect_table_row_count_to_be_between` (min 3) is attached to the source, so it runs before the snapshot; it failed, and dbt skipped the snapshot and everything after it. The snapshot still has only B200’s deletion record. If the test had `severity: warn`, nothing would be skipped and two products would be “deleted”. **Common wrong answer:** putting the volume check in a test on the snapshot or the dimension: it runs after the damage. **Interviewer follow-up:** “a fixed minimum is brittle” → compare with the previous load (for example at least 90% of yesterday’s row count, from a small audit table of load counts), still attached to the source.

<a id="solution-10"></a>
### Solution 10 · Design the Fuel Smart history and increments

|  | Reviews | OFF products |
|---|---|---|
| Build as | incremental, microbatch by review date (or merge on review id + 3-day look-back) | snapshot, timestamp strategy |
| Key settings | `event_time`, `batch_size: day`, `lookback: 3`, `begin` | `updated_at: last_modified`, `hard_deletes: ignore`, far-future end date |
| Main risk | late or re-sent reviews; backfilling years of history | silent edits without a timestamp bump; deletions invisible in deltas |
| Guarded by | equivalence check on a recent window; unique test on review id | check strategy on key columns if bumps prove unreliable; monthly full dump for deletions; row-count test on each delta |

```yaml
# snapshots/off_products_snapshot.yml
snapshots:
  - name: off_products_snapshot          # Open Food Facts slice, keyed by barcode
    relation: source('shop_raw', 'supplier_products')   # stand-in for source('off', 'products_delta')
    config:
      unique_key: barcode
      strategy: timestamp                # OFF bumps last_modified_t on every product edit
      updated_at: last_modified_at       # cast from the epoch last_modified_t in staging/raw
      hard_deletes: ignore               # daily delta files: absence is not deletion
      dbt_valid_to_current: "cast('9999-12-31' as timestamp)"
```

```sql
# models/marts/fct_review_fs.sql
{{
    config(
        materialized='incremental',
        incremental_strategy='microbatch',
        event_time='submitted_at_utc',
        batch_size='day',
        lookback=3,
        begin='2026-01-01'
    )
}}
-- fct_review_fs: Fuel Smart review fact sketch (Leafy columns as a stand-in).
-- event_time = the review date; lookback = reviews edited or landed up to 3 days late.
select review_id, product_id as recipe_id, customer_id as reviewer_id, rating, submitted_at_utc
from {{ ref('stg_reviews') }}
```

Terminal (output trimmed):

```text
$ dbt parse
Performance info: <project>\target\perf_info.json
```

```python
import json
nodes = json.load(open("target/manifest.json", encoding="utf-8"))["nodes"].values()
for n in sorted(nodes, key=lambda n: n["name"]):
    if n["name"] in ("off_products_snapshot", "fct_review_fs"):
        c = n["config"]
        keys = ["materialized", "strategy", "updated_at", "hard_deletes", "incremental_strategy", "event_time", "batch_size", "lookback"]
        print(n["name"], {k: c.get(k) for k in keys if c.get(k) is not None})
assert {n["name"] for n in nodes} >= {"off_products_snapshot", "fct_review_fs"}
```

Output:

```text
fct_review_fs {'materialized': 'incremental', 'incremental_strategy': 'microbatch', 'event_time': 'submitted_at_utc', 'batch_size': 'day', 'lookback': 3}
off_products_snapshot {'materialized': 'snapshot', 'strategy': 'timestamp', 'updated_at': 'last_modified_at', 'hard_deletes': 'ignore', 'lookback': 1}
```

**Why.** Reviews are an append-mostly time series, so microbatch gives cheap daily runs, a built-in look-back and backfills by date range; products change in place and arrive as deltas, so a timestamp snapshot with `ignore` keeps correct history without inventing deletions. `dbt parse` accepted both configs, and the manifest shows the settings dbt will use. **Common wrong answer:** `hard_deletes: invalidate` on the delta files (exercise 7). **Interviewer follow-up:** “now the dashboard needs the Nutri-Score a recipe’s ingredients had when it was reviewed” → join reviews to the product dimension on barcode and review time between `valid_from` and `valid_to`.
