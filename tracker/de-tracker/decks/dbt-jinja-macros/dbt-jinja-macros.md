# dbt Jinja and macros: templates, loops, reusable SQL

*Companion to `dbt-jinja-macros.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Tested with:** dbt-core 1.12.5 and the dbt-duckdb adapter 1.11.0 (DuckDB 1.5.6) on CPython 3.12.10, Windows 11 (64-bit), in one virtual environment. SQL dialect: DuckDB. Every dbt command shown was executed while building this document, in a real project folder, and its real output is shown. Output was normalised in three ways only: the leading clock time on each dbt log line was removed, per-node and total durations were replaced by `x.xx`, and absolute folder paths were replaced by `<project>`, `<venv>` or `~`. Some long outputs are trimmed (marked).

**Series:** this is deck 2 of 2 on dbt. It starts from the finished project of deck 1, *dbt fundamentals* (folder `dbt-fundamentals-project/` next to that deck), and refactors it with a Jinja loop and a macro. The refactored project is in the folder `dbt-jinja-macros-project/` next to this file; lesson 6 rebuilds it from scratch. Lessons 7–8 preview incremental models, snapshots, unit tests, packages and contracts in a scratch copy.

**Prerequisites:** deck 1, *dbt fundamentals* (sources, ref, layers, materializations, tests, selectors), and the Python decks (functions, string formatting). New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises follow common dbt interview patterns (research done in October 2026: how dbt uses Jinja, writing and calling macros, debugging templates, <code>is_incremental()</code> and <code>unique_key</code>, snapshot strategies, packages). All questions are original and use the Leafy project.

**Additions beyond the original brief** are marked *(added)*: a setup that starts from the dbt fundamentals project and keeps a copy of the old output; proving a refactor safe by comparing output rows before and after (`EXCEPT` both ways); a bug clinic for Jinja, macros, incremental models and snapshots; interview questions with model answers.

## Contents

1. [dbt Jinja and macros: templates, loops, reusable SQL](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up: start from the dbt fundamentals project](#slide-2)
3. [Jinja basics: the template language inside dbt](#slide-3)
4. [A Jinja loop: one column per event type](#slide-4)
5. [A simple macro: reusable SQL snippets](#slide-5)
6. [The refactored project, rebuilt from a clean folder](#slide-6)
7. [Next steps: incremental models and snapshots](#slide-7)
8. [Next steps: packages, contracts, unit tests, other warehouses, CI](#slide-8)
9. [Bug clinic: what goes wrong with Jinja and macros](#slide-9)
10. [Interview questions and model answers](#slide-10)
11. [Exercises 1–2: macros and loops](#slide-11)
12. [Cheat sheet](#slide-12)
13. [Glossary](#slide-13)
14. [What to remember, and what comes next](#slide-14)
15. [References and how this deck was tested](#slide-15)
16. [Appendix A · Hints](#appendix-a)
17. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. dbt Jinja and macros: templates, loops, reusable SQL

**

Deck 1 built a tested star schema with dbt. Some of its SQL is repetitive: four nearly identical lines in a pivot, a time-zone conversion that every future source will need. This deck turns that SQL into templates with **Jinja**, proves the refactor changed nothing, and then previews what Jinja makes possible next: incremental models, snapshots, and unit tests. Every `dbt` command ran while the deck was built, against a local DuckDB file.

- **Start here:** the dbt fundamentals project, built and checked, with a copy of its output.
- **Part A, Jinja:** expressions, statements, comments, whitespace control, and dbt’s built-in functions.
- **Part B, refactor:** a loop over a project variable, a macro with an argument, and the refactored project rebuilt from scratch.
- **Part C, next steps:** incremental models, snapshots, unit tests, packages, contracts, CI (preview, in a scratch copy).
- **Then:** a bug clinic, interview questions, 2 exercises, a cheat sheet, a glossary and references.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Real dbt projects repeat themselves: the same pivot for every new category, the same time-zone or currency conversion in every staging model, the same union for every country’s copy of a source. Copy-pasted SQL drifts, and a fix made in one place is forgotten in four others. Jinja and macros let you write such SQL once and generate the rest, and they are also the machinery behind incremental models, snapshots, and most dbt packages. Used with restraint, they make a project shorter and safer; used carelessly, they make it unreadable.

#### Where you will use it

- Pivots and column lists driven by a variable or seed.
- Shared expressions (UTC, currency, safe casts) in a small macros folder.
- Environment-specific SQL with `target.name`.
- Incremental models (`is_incremental()`, `{{ this }}`) and packages such as `dbt_utils`.

#### What goes wrong without it

- The same rule copied into many models and fixed in only some of them.
- A new category added in the data but not in the hand-written pivot.
- A refactor that silently changes dashboard numbers.
- Templates so clever that nobody can review the SQL they produce.

#### Who expects you to know it

- Data engineers: macros, packages and refactoring are daily work.
- Reviewers: expect compiled SQL and evidence that outputs did not change.
- Interviewers: “how does dbt use Jinja?”, “write a macro”, “what does is_incremental() do?”, “snapshot or incremental?”.

> **On the job:** A teammate adds a fifth event type to the website. In a project with a hard-coded pivot, someone must find and edit every model that lists event types; in this deck’s project, they add one value to a variable, run dbt build, and a comparison query shows that the four existing columns did not move.

> **The main idea:** Jinja and macros remove repetition from SQL; the compiled output and an output comparison keep them honest.

*Read more:* [dbt: Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [Jinja template designer docs](https://jinja.palletsprojects.com/en/stable/templates/).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| The same SQL pattern repeated for a list of values | A Jinja loop over a variable or seed | One change point; the list is documented |
| The same expression in three or more models | A macro | One definition, one fix |
| SQL that differs per environment or database | `target` or adapter dispatch | One model, several targets |
| A large fact that is too slow to rebuild | An incremental model (Part C) | Processes only new rows |
| Logic that is clearer as plain SQL | Plain SQL | Reviewers read SQL faster than templates |
| Something that needs to look at data before writing SQL | Usually a model or a seed, not run_query | Jinja runs before the data is read |

#### How interviews test it

- “How does dbt use Jinja, and when does it run?”
- “Write a macro that …; how do you call it?” (column names as strings).
- “How do you debug a broken template?” (compile, read target/compiled).
- “What does is_incremental() do? Snapshot or incremental?”

#### Where it sits in your learning path

- Builds on: deck 1, *dbt fundamentals* (its project is the starting point here) and the Python decks (functions, default arguments).
- Next in your plan: incremental models, snapshots and unit tests in depth, then deployment and CI.

> **The main idea:** reach for a loop or macro when it removes real repetition, and prove every refactor with compiled SQL and an output comparison; otherwise keep plain SQL.

---

<a id="slide-2"></a>
## 2. Set up: start from the dbt fundamentals project

*Start here · a known-good project before any refactor*

| Item | Detail |
|---|---|
| Tested with | **dbt-core 1.12.5** with the **dbt-duckdb 1.11.0** adapter (DuckDB 1.5.6) on CPython 3.12.10, Windows 11. SQL dialect: DuckDB. Same virtual environment as deck 1. |
| Starting point | The finished project of deck 1, *dbt fundamentals*: folder `dbt-fundamentals-project/` next to that deck. Copy it to a new working folder; every file in this deck is a change to that copy. |
| Outputs | Real. Clock times removed, durations shown as `x.xx`, machine paths replaced by `<project>`, `<venv>` or `~`. Long outputs are trimmed and labelled. |

#### Load and build, exactly as deck 1 ended

```text
# from the copied project folder, with the deck-1 virtual environment active
python scripts/load_raw.py
dbt build
```

Terminal:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal (summary lines):

```text
$ dbt build
Finished running 2 seeds, 5 table models, 32 data tests, 3 view models in x.xx seconds (normalised).
Done. PASS=41 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=42
```

#### Keep a copy of the output you will refactor

A **refactor** changes how code is written without changing what it produces. To prove that, save the current output of `fct_daily_funnel` before touching it. The copy is an ordinary table outside dbt’s schemas, so dbt never overwrites it.

```python
import duckdb
with duckdb.connect("leafy.duckdb") as con:
    con.execute("create or replace table main.fct_daily_funnel_legacy as select * from main_marts.fct_daily_funnel")
    print(con.sql("select * from main.fct_daily_funnel_legacy order by date_key"))
```

Output:

```text
┌──────────┬──────────────────┬────────────────────┬─────────────────┬───────────────┬──────────────────┐
│ date_key │ page_view_events │ add_to_cart_events │ purchase_events │ refund_events │ active_customers │
│  int32   │      int64       │       int64        │      int64      │     int64     │      int64       │
├──────────┼──────────────────┼────────────────────┼─────────────────┼───────────────┼──────────────────┤
│ 20260302 │                2 │                  1 │               5 │             0 │                4 │
│ 20260303 │                1 │                  0 │               1 │             1 │                2 │
│ 20260304 │                0 │                  0 │               2 │             0 │                2 │
└──────────┴──────────────────┴────────────────────┴─────────────────┴───────────────┴──────────────────┘
```

> **On the job:** Before refactoring a model that dashboards read, teams snapshot its output (or run an audit query in CI against production) and compare row by row afterwards. “Same rows before and after” is the acceptance test for a refactor.

The build ends green with one expected warning (event e7, amount “abc”), exactly as in deck 1. If yours does not, fix that first: a refactor on top of a broken project cannot be verified.

> **The main idea:** start a refactor from a green build and a saved copy of the output you are about to change; then “nothing changed” is something you can prove.

*Read more:* [Install dbt Core](https://docs.getdbt.com/docs/local/install-dbt), [dbt build](https://docs.getdbt.com/reference/commands/build).

---

<a id="slide-3"></a>
## 3. Jinja basics: the template language inside dbt

*Part A · {{ expressions }}, {% statements %}, {# comments #}*

**Jinja** is a Python templating language. dbt renders every model with Jinja before sending it to the database. You already used it in deck 1: `{{ ref() }}`, `{{ source() }}`, `{{ var() }}` and `{{ config() }}` are Jinja. Three kinds of delimiter:

| Syntax | Meaning | Example |
|---|---|---|
| `{{ … }}` | **expression**: evaluate and insert the result as text | `{{ ref("stg_events") }}`, `{{ var("dim_date_start") }}` |
| `{% … %}` | **statement**: logic that inserts nothing by itself | `{% for t in types %}` … `{% endfor %}`, `{% if target.name == "ci" %}`, `{% set x = 3 %}` |
| `{# … #}` | **comment**: removed before the SQL reaches the database | `{# explain a tricky filter #}` |
| `{%- … -%}` | **whitespace control**: the dash trims spaces/newlines on that side | keeps compiled SQL tidy |

Terminal (startup lines removed):

```text
$ dbt compile --inline "select {{ 40 + 2 }} as answer, '{{ var('dim_date_start') }}' as first_day, '{{ target.name }}' as target_name {# not sent #}"
Compiled inline node is:
select 42 as answer, '2026-03-01' as first_day, 'dev' as target_name 
```

#### dbt’s built-in Jinja

| Function / variable | Returns |
|---|---|
| `ref("m")`, `source("s", "t")` | a relation name, and a DAG edge |
| `config(materialized="view", tags=[…])` | sets configs for this model |
| `var("name", default)` | a project variable |
| `env_var("NAME", default)` | an environment variable |
| `target.name`, `target.schema` | details of the active target |
| `is_incremental()`, `this` | used by incremental models (lesson 7) |

#### Golden rule

Jinja runs **before** the database sees anything. It can write SQL, but it cannot see data (except through special macros such as `run_query`). If a template is confusing, read the compiled SQL: that is what really runs.

> **On the job:** Most production dbt Jinja is simple: `ref`, `source`, `config`, a variable, an occasional loop or `if target.name`. Heavy Jinja makes models hard to review; reviewers often ask “could this be plain SQL?”

> **The main idea:** `{{ }}` inserts a value, `{% %}` runs logic, `{# #}` is a comment. Jinja runs first and produces plain SQL; read the compiled output whenever in doubt.

*Read more:* [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [dbt Jinja functions](https://docs.getdbt.com/reference/dbt-jinja-functions), [Jinja template designer docs](https://jinja.palletsprojects.com/en/stable/templates/), [target](https://docs.getdbt.com/reference/dbt-jinja-functions/target).

---

<a id="slide-4"></a>
## 4. A Jinja loop: one column per event type

*Part B · generate repetitive SQL from a list*

In deck 1, `fct_daily_funnel` has four nearly identical `count(*) filter (…)` lines, one per event type. A pivot (one column per category) is repetitive SQL: perfect for a `{% for %}` loop. First move the list into a project variable, so adding an event type becomes a one-line change in `dbt_project.yml`:

```diff
vars:
   dim_date_start: "2026-03-01"
   dim_date_end: "2026-03-07"
+  funnel_event_types: ["page_view", "add_to_cart", "purchase", "refund"]
```

#### The template replaces the four lines

```sql
# models/marts/fct_daily_funnel.sql
{{ config(tags=["funnel"]) }}
-- fct_daily_funnel: one row per UTC day with event counts by type.
-- A periodic snapshot fact (grain: date). Event types come from a project variable.
select
    cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer) as date_key,
    {%- for event_type in var("funnel_event_types") %}
    count(*) filter (where event_type = '{{ event_type }}') as {{ event_type }}_events,
    {%- endfor %}
    count(distinct customer_id) as active_customers
from {{ ref("stg_events") }}
group by 1
```

#### Compiled: the same four lines as before

Terminal (startup lines removed):

```text
$ dbt compile --select fct_daily_funnel
Unable to do partial parsing because a project config has changed
-- fct_daily_funnel: one row per UTC day with event counts by type.
-- A periodic snapshot fact (grain: date). Event types come from a project variable.
select
    cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer) as date_key,
    count(*) filter (where event_type = 'page_view') as page_view_events,
    count(*) filter (where event_type = 'add_to_cart') as add_to_cart_events,
    count(*) filter (where event_type = 'purchase') as purchase_events,
    count(*) filter (where event_type = 'refund') as refund_events,
    count(distinct customer_id) as active_customers
from "leafy"."main_staging"."stg_events"
group by 1
```

Terminal (summary lines):

```text
$ dbt run --select fct_daily_funnel
1 of 1 OK created sql table model main_marts.fct_daily_funnel .................. [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### Prove the refactor changed nothing

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    new_only = con.sql("""select * from main_marts.fct_daily_funnel
                          except select * from main.fct_daily_funnel_legacy""").fetchall()
    old_only = con.sql("""select * from main.fct_daily_funnel_legacy
                          except select * from main_marts.fct_daily_funnel""").fetchall()
    print("rows only in the new output:", len(new_only))
    print("rows only in the old output:", len(old_only))
    assert new_only == [] and old_only == []
```

Output:

```text
rows only in the new output: 0
rows only in the old output: 0
```

`EXCEPT` returns the rows of the first query that are missing from the second. Empty in both directions means the new table has exactly the old rows. Column names are compared by position, so the order of the generated columns matters too.

#### Notes

- The trailing-comma problem is avoided by ending with a column outside the loop. Alternative: `{% if not loop.last %},{% endif %}`.
- `{%- for … %}`: the dash removes the newline before the tag, so the compiled SQL has no blank lines.
- The `funnel` tag still comes from `{{ config() }}` in the file, so `--select tag:funnel` keeps working.

> **On the job:** Loops generate pivots, unions of many similar sources (“one staging model per country, unioned”), and column lists. If a loop needs a hard-coded list of values found in the data, consider `dbt_utils.get_column_values` or keep the list in a variable or seed.

> **The main idea:** use `{% for %}` over a variable list to generate repetitive SQL; control commas and whitespace, check the compiled result, and prove the output did not change.

*Read more:* [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [Jinja for loops](https://jinja.palletsprojects.com/en/stable/templates/#for), [config()](https://docs.getdbt.com/reference/dbt-jinja-functions/config), [Project variables](https://docs.getdbt.com/docs/build/project-variables).

---

<a id="slide-5"></a>
## 5. A simple macro: reusable SQL snippets

*Part B · macros are Jinja functions*

A **macro** is a Jinja function, defined in a `.sql` file under `macros/`, that returns SQL text. Every model can call it. Here the UTC conversion from `stg_events` becomes a macro, so any future source with offset timestamps converts them the same way.

#### Define it

```sql
# macros/to_utc.sql
{% macro to_utc(column_name) -%}
    timezone('UTC', cast({{ column_name }} as timestamptz))
{%- endmacro %}
```

Then edit one line of `models/staging/stg_events.sql`:

```diff
-        timezone('UTC', cast(ts as timestamptz))  as event_at_utc,
+        {{ to_utc('ts') }}                        as event_at_utc,
```

#### Same SQL as before

Terminal (only the line that changed):

```text
$ dbt compile --select stg_events
        timezone('UTC', cast(ts as timestamptz))                        as event_at_utc,
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `{{ to_utc(ts) }}`: Jinja looks for a Jinja variable called `ts` and finds none | Pass column names as strings: `to_utc('ts')` |
| Macro output has stray newlines | Whitespace control: `{%- … -%}` |
| Macro edited but models not rebuilt | Macros change compiled SQL; re-run the models that use them |
| A macro called `ref` or `source` | Don’t shadow built-ins; prefix your own macros if unsure |

#### Where macros are used

- Repeated expressions: currency conversion, UTC conversion, safe casts.
- Adapter differences: the same macro can produce DuckDB SQL or T-SQL.
- Overriding dbt behaviour, e.g. `generate_schema_name` to change the `main_marts` naming rule.
- Packages such as `dbt_utils` are mostly collections of macros (lesson 8).

> **On the job:** A small `macros/` folder of well-named helpers is a sign of a mature project; a huge one full of clever Jinja is a warning sign. Write a macro when the same expression appears in three models.

> **The main idea:** macros are Jinja functions that return SQL. Pass column names as strings, control whitespace, and verify with `dbt compile` that the generated SQL is what you meant.

*Read more:* [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [Adapter dispatch](https://docs.getdbt.com/reference/dbt-jinja-functions/dispatch), [Custom schemas and generate_schema_name](https://docs.getdbt.com/docs/build/custom-schemas).

---

<a id="slide-6"></a>
## 6. The refactored project, rebuilt from a clean folder

*Part B · the same 42 nodes, now with a loop and a macro*

The refactored project is in `dbt-jinja-macros-project/` next to this deck. To prove the refactor left the project reproducible, the build copied it to an empty folder (no database, no `target/`) and ran it from scratch, exactly as deck 1 did for the original.

#### What changed compared with deck 1

| Change | File |
|---|---|
| changed | `README.md` |
| changed | `dbt_project.yml` |
| added | `macros/to_utc.sql` |
| changed | `models/marts/fct_daily_funnel.sql` |
| changed | `models/staging/stg_events.sql` |

```text
dbt-jinja-macros-project/
├── data/
│   └── raw/
│       ├── events_2026-03-02.jsonl
│       ├── events_2026-03-03.jsonl
│       └── events_2026-03-04.jsonl
├── macros/
│   └── to_utc.sql
├── models/
│   ├── intermediate/
│   │   └── int_purchases.sql
│   ├── marts/
│   │   ├── _marts.yml
│   │   ├── dim_customer.sql
│   │   ├── dim_date.sql
│   │   ├── dim_product.sql
│   │   ├── fct_daily_funnel.sql
│   │   └── fct_orders.sql
│   ├── staging/
│   │   ├── _sources.yml
│   │   ├── _staging.yml
│   │   ├── stg_customers.sql
│   │   ├── stg_events.sql
│   │   └── stg_products.sql
│   └── docs.md
├── scripts/
│   └── load_raw.py
├── seeds/
│   ├── _seeds.yml
│   ├── customers.csv
│   └── products.csv
├── tests/
│   └── assert_no_unparseable_amounts.sql
├── .gitignore
├── dbt_project.yml
├── profiles.yml
└── README.md
```

#### A clean run: load and build

Terminal:

```text
$ python scripts/load_raw.py
events_2026-03-02.jsonl: 9 rows
events_2026-03-03.jsonl: 4 rows
events_2026-03-04.jsonl: 2 rows
total: 15
```

Terminal (PASS lines for tests removed):

```text
$ dbt build
2 of 42 OK loaded seed file main_seeds.customers ............................... [INSERT 5 in x.xxs]
3 of 42 OK loaded seed file main_seeds.products ................................ [INSERT 4 in x.xxs]
1 of 42 OK created sql table model main_marts.dim_date ......................... [OK in x.xxs]
5 of 42 OK created sql view model main_staging.stg_events ...................... [OK in x.xxs]
12 of 42 OK created sql view model main_staging.stg_customers .................. [OK in x.xxs]
14 of 42 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
18 of 42 OK created sql view model main_staging.stg_products ................... [OK in x.xxs]
19 of 42 OK created sql table model main_marts.dim_customer .................... [OK in x.xxs]
20 of 42 OK created sql table model main_marts.fct_daily_funnel ................ [OK in x.xxs]
21 of 42 OK created sql table model main_marts.dim_product ..................... [OK in x.xxs]
33 of 42 OK created sql table model main_marts.fct_orders ...................... [OK in x.xxs]
Finished running 2 seeds, 5 table models, 32 data tests, 3 view models in x.xx seconds (normalised).
[WARNING]: in test assert_no_unparseable_amounts (tests\assert_no_unparseable_amounts.sql)
[WARNING]: Got 1 result, configured to warn if != 0
Done. PASS=41 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=42
```

| Expected | Value |
|---|---|
| nodes built and tested | 42, the same as deck 1: a macro is not a node |
| result | PASS=41, WARN=1 (e7), ERROR=0, SKIP=0 |
| fct_orders | 7 rows, 175.99 total |

> **On the job:** A refactor pull request looks exactly like this table: a few changed files, the same node count, the same test results, and evidence that the output did not move. Reviewers approve it in minutes.

> **The main idea:** a good refactor changes files, not results: same nodes, same tests, same rows, and a project that still builds from an empty folder.

*Read more:* [dbt build](https://docs.getdbt.com/reference/commands/build), [dbt compile](https://docs.getdbt.com/reference/commands/compile).

---

<a id="slide-7"></a>
## 7. Next steps: incremental models and snapshots

*Part C · introduced only, tried in a scratch copy of the project*

Two features that build directly on Jinja, and that come next in your plan (incremental models, snapshots, unit tests). Both were run here in a *copy* of the refactored project; the final project does not include them.

#### Incremental models

An **incremental** model is a table that, after the first run, processes only new or changed rows and merges them in, instead of rebuilding everything. The Jinja `{% if is_incremental() %}` block adds a filter only on later runs; `{{ this }}` is the model’s own existing table; `unique_key` tells dbt which rows to update rather than append.

```sql
# models/marts/fct_events_incremental.sql
{{ config(materialized='incremental', unique_key='event_id') }}
-- Sketch: an event fact that only processes new rows after the first run.
select event_id, event_type, event_at_utc, amount
from {{ ref('stg_events') }}
{% if is_incremental() %}
where event_at_utc > (select max(event_at_utc) from {{ this }})
{% endif %}
```

Terminal (output trimmed):

```text
$ dbt run --select fct_events_incremental   # first run: creates the table
1 of 1 OK created sql incremental model main_marts.fct_events_incremental ...... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt run --select fct_events_incremental   # later runs: only new rows
1 of 1 OK created sql incremental model main_marts.fct_events_incremental ...... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```sql
-- target/compiled/leafy/models/marts/fct_events_incremental.sql (generated by dbt)
-- Sketch: an event fact that only processes new rows after the first run.
select event_id, event_type, event_at_utc, amount
from "leafy"."main_staging"."stg_events"
where event_at_utc > (select max(event_at_utc) from "leafy"."main_marts"."fct_events_incremental")
```

Watch for: late-arriving rows older than the max timestamp (use a look-back window), schema changes (`on_schema_change`), and `--full-refresh` to rebuild from scratch.

#### Snapshots

A **snapshot** records how rows of a mutable source change over time: **SCD type 2** from the dimensional modeling deck, with `dbt_valid_from` / `dbt_valid_to` columns. Defined in YAML since dbt 1.9; run with `dbt snapshot` (also part of `dbt build`).

```yaml
# snapshots/customers_snapshot.yml
snapshots:
  - name: customers_snapshot
    relation: ref('stg_customers')
    config:
      schema: snapshots
      unique_key: customer_id
      strategy: check          # compare column values; 'timestamp' uses an updated_at column
      check_cols: all
```

Terminal (output trimmed):

```text
$ dbt snapshot   # day 1
1 of 1 OK snapshotted main_snapshots.customers_snapshot ........................ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Leo Kim (u2) moves from Denver to Austin in the CRM; the seed is edited, reloaded, and the snapshot runs again:

Terminal (output trimmed):

```text
$ dbt seed --select customers
1 of 1 OK loaded seed file main_seeds.customers ................................ [INSERT 5 in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt snapshot   # day 2
1 of 1 OK snapshotted main_snapshots.customers_snapshot ........................ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("""select customer_id, city, dbt_valid_to is null as is_current
                     from main_snapshots.customers_snapshot
                     where customer_id in ('u1', 'u2') order by customer_id, is_current"""))
```

Output:

```text
┌─────────────┬─────────┬────────────┐
│ customer_id │  city   │ is_current │
│   varchar   │ varchar │  boolean   │
├─────────────┼─────────┼────────────┤
│ u1          │ Austin  │ true       │
│ u2          │ Denver  │ false      │
│ u2          │ Austin  │ true       │
└─────────────┴─────────┴────────────┘
```

u2 now has two versions: Denver (closed) and Austin (current). Snapshots must run regularly: a change between two runs that is reverted before the next one is never seen.

> **On the job:** Incremental models are how event facts with billions of rows stay affordable; snapshots are how teams keep history of CRM or product tables whose source overwrites values. Both are standard interview topics once you have the foundations from the two dbt decks.

> **The main idea:** incremental = process only new rows into an existing table; snapshot = keep SCD2 history of a changing source. Both are Jinja-driven and come next in your plan.

*Read more:* [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Snapshots](https://docs.getdbt.com/docs/build/snapshots), [Snapshot configurations](https://docs.getdbt.com/reference/snapshot-configs).

---

<a id="slide-8"></a>
## 8. Next steps: packages, contracts, unit tests, other warehouses, CI

*Part C · where to go after Jinja and macros*

#### Unit tests (dbt 1.8+)

A **unit test** checks a model’s *logic* on a few hand-made input rows, without real data: “given these two deliveries of e1, staging keeps the later one and cleans the text”. Data tests check the data; unit tests check the SQL. Tried here in a scratch copy:

```yaml
# models/staging/_unit_tests.yml
unit_tests:
  - name: stg_events_keeps_latest_delivery
    model: stg_events
    given:
      - input: source('shop_raw', 'events')
        rows:
          - {event_id: e1, user_id: " U1 ", event_type: Purchase, ts: "2026-03-02T10:00:00+01:00", amount: "10", product_id: p1, _source_file: a.jsonl}
          - {event_id: e1, user_id: u1, event_type: purchase, ts: "2026-03-02T10:00:00+01:00", amount: "12.50", product_id: p1, _source_file: b.jsonl}
    expect:
      rows:
        - {event_id: e1, customer_id: u1, event_type: purchase, amount: 12.50, product_id: P1, _source_file: b.jsonl}
```

Terminal (output trimmed):

```text
$ dbt test --select test_type:unit
1 of 1 PASS stg_events::stg_events_keeps_latest_delivery ....................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### More to learn

| Topic | In one line |
|---|---|
| **Packages** | Reusable projects listed in `packages.yml` and installed with `dbt deps`. `dbt_utils` adds macros such as `generate_surrogate_key`, `date_spine` and extra generic tests; `dbt_expectations` adds many more tests. |
| **Model contracts** | `contract: {enforced: true}` plus a `data_type` for every column: dbt refuses to build the model if its output shape differs. Used on marts that other teams depend on. |
| **Other warehouses** | Same project, different adapter and SQL dialect: `dbt-fabric` (Fabric Data Warehouse, T-SQL: no `QUALIFY`), `dbt-fabricspark` or `dbt-databricks` (Spark SQL), `dbt-snowflake`, `dbt-bigquery`. Macros with adapter dispatch hide the differences. |
| **CI with state** | Save production’s `manifest.json`; in a pull request run `dbt build --select state:modified+ --defer --state prod-artifacts/`: only changed models and their children are built, and unchanged parents are read from production (“slim CI”). |
| **Orchestration** | Airflow, Dagster, Fabric pipelines or the dbt platform run `dbt build` on a schedule and alert on a non-zero exit code. |
| **Semantic layer and exposures** | Define metrics once (MetricFlow) and declare which dashboards depend on which marts (`exposures`), so lineage reaches the BI tool. |

> **On the job:** A realistic first month in an data-engineering role: fix a failing test, add a staging model for a new source, add a column to a mart with tests and docs, and get it through slim CI. Everything above is incremental on top of the two dbt decks.

> **The main idea:** next come unit tests for logic, packages for reuse, contracts for stable interfaces, adapters for other warehouses, and state-based CI. The foundations (ref, layers, tests, selectors, Jinja) stay the same.

*Read more:* [Unit tests](https://docs.getdbt.com/docs/build/unit-tests), [Packages](https://docs.getdbt.com/docs/build/packages), [dbt_utils on dbt Hub](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [State selection](https://docs.getdbt.com/reference/node-selection/state-selection), [Defer](https://docs.getdbt.com/reference/node-selection/defer), [Microsoft Fabric Data Warehouse setup (dbt docs)](https://docs.getdbt.com/docs/local/connect-data-platform/fabric-setup), [Fabric tutorial: set up dbt for Fabric Data Warehouse](https://learn.microsoft.com/en-us/fabric/data-warehouse/tutorial-setup-dbt).

---

<a id="slide-9"></a>
## 9. Bug clinic: what goes wrong with Jinja and macros

*Practice · symptom → cause → fix added*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | Compilation error: “… is undefined” when calling a macro | Column name passed without quotes, so Jinja looks for a variable | `to_utc('ts')`: pass column names as strings | 5 |
| 2 | Syntax error near `from` in a generated pivot | Trailing comma from a Jinja loop | End with a fixed column, or `{% if not loop.last %},{% endif %}` | 4 |
| 3 | Compiled SQL full of blank lines and odd indentation | No whitespace control on loop or macro tags | `{%- … %}` / `{%- … -%}`; read `target/compiled/` | 3, 4 |
| 4 | A new event type appears in the data but never gets a column | The list of values is hard-coded in the model | Keep it in a variable (or a seed); add a test that flags unknown values | 4 |
| 5 | “… is undefined” for a variable in one environment only | `var()` without a default, and the variable is not defined there | Define it in `dbt_project.yml` or give `var()` a default | 4, ex. 2 |
| 6 | A macro was fixed, but the table still has the old values | Macros change compiled SQL only; tables are rebuilt only when their models run | `dbt build --select stg_events+` after changing a macro used by `stg_events` | 5 |
| 7 | A “harmless” refactor changes dashboard numbers | Nobody compared the output before and after | Save the old output; compare with `EXCEPT` both ways | 2, 4 |
| 8 | An incremental model misses events that arrived late | The filter `> max(event_at_utc)` skips rows older than the newest one | A look-back window plus `unique_key`, or `--full-refresh` | 7 |
| 9 | A snapshot shows no history for a change everyone remembers | The value changed and changed back between two snapshot runs | Run snapshots on a schedule frequent enough for the source | 7 |

> **On the job:** Jinja bugs are cheap to catch before they reach the warehouse: `dbt compile` (or `dbt parse`) in CI fails on undefined names, and reviewing the compiled SQL catches commas and whitespace. Output comparisons catch the rest.

> **The main idea:** most Jinja problems are names (strings vs variables), punctuation (commas, whitespace), or stale builds. Compile, read the SQL, rebuild downstream, and compare outputs.

---

<a id="slide-10"></a>
## 10. Interview questions and model answers

*Practice · say each answer aloud before revealing it added*

These questions recur in dbt interview guides and candidates’ write-ups (research done in October 2026): how dbt uses Jinja, macros, `is_incremental()`, snapshots, and testing logic. Answer aloud in about a minute, then open the model answer.

<details><summary>“How does dbt use Jinja, and when does it run?” · *checks: compile-time rendering, the three delimiters, debugging habit*</summary>

**Model answer (about 60 seconds):** Every model is a template. Before anything is sent to the warehouse, dbt renders it with Jinja: expressions in double curly braces insert values such as ref(), source(), var() or config(); statements in curly-percent tags add logic such as loops and ifs; comments are dropped. The result is plain SQL in target/compiled. Jinja cannot see the data, except through special macros such as run_query, so when a template is confusing I read the compiled SQL, which is what actually runs.

**Likely follow-up:** “How would you debug a model whose generated SQL is wrong?” → Run dbt compile for that model, open target/compiled, run that SQL directly, and fix the template; dbt parse catches undefined names quickly in CI.

</details>

<details><summary>“What is a macro, and when would you write one?” · *checks: reusable SQL, judgement about when not to, strings vs variables*</summary>

**Model answer (about 60 seconds):** A macro is a Jinja function in the macros folder that returns SQL text. I write one when the same expression appears in several models, such as a UTC conversion or a safe cast, when SQL must differ by adapter, or to override dbt behaviour such as generate_schema_name. Column names go in as strings. I keep macros small, check the compiled output after a change, and rebuild the models that use them. If a macro makes a model harder to read than plain SQL, I don’t write it.

**Likely follow-up:** “How would you share macros across several dbt projects?” → Put them in a package (a separate dbt project), add it to packages.yml with a pinned version, and install it with dbt deps; dbt_utils is the best-known example.

</details>

<details><summary>“What does is_incremental() do, and why does an incremental model need a unique_key?” · *checks: incremental mechanics, merges vs appends, late data*</summary>

**Model answer (about 60 seconds):** is_incremental() is true when the model’s table already exists, the model is materialized as incremental, and the run is not a full refresh. Inside that block I filter the source to new rows, usually comparing a timestamp with the maximum already in {{ this }}, the existing table. Without a unique_key dbt appends, so a changed or redelivered row is duplicated; with it dbt merges, updating rows whose key already exists.

**Likely follow-up:** “Events can arrive two days late. What changes?” → Use a look-back window, for example max timestamp minus three days, together with unique_key so reprocessed rows are merged, not duplicated; schedule a periodic full refresh if the source can change further back.

</details>

<details><summary>“When would you use a snapshot instead of an incremental model?” · *checks: SCD2, strategies, what each tool keeps*</summary>

**Model answer (about 60 seconds):** A snapshot keeps history of a mutable source: every time a row changes, the old version is closed with dbt_valid_to and a new one opens, which is a type 2 slowly changing dimension. An incremental model processes new rows efficiently but keeps only the current state of each key. With the timestamp strategy dbt trusts an updated_at column; with the check strategy it compares column values, which works without a timestamp but costs more.

**Likely follow-up:** “What is the risk with snapshots?” → They only see changes at the moments they run: a value that changes and changes back between two runs leaves no trace, so the schedule must match how fast the source changes.

</details>

<details><summary>“What is the difference between a unit test and a data test?” · *checks: testing logic vs testing data*</summary>

**Model answer (about 60 seconds):** A data test runs on the real data after a model is built and returns failing rows: unique, not_null, relationships, or a custom SQL rule. A unit test checks the model’s logic on a few hand-made input rows and expected output rows, without real data, so it can run in CI before anything is built. I use unit tests for tricky logic such as dedupe or date handling, and data tests on every key and grain.

**Likely follow-up:** “Can a unit test replace data tests?” → No: a unit test proves the SQL is right for the cases you thought of; data tests catch what the real source actually sends.

</details>

> **The main idea:** strong answers explain when Jinja runs, keep macros small and justified, and know what is_incremental(), unique_key and snapshots each guarantee.

*Read more:* [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [Incremental models](https://docs.getdbt.com/docs/build/incremental-models), [Snapshots](https://docs.getdbt.com/docs/build/snapshots).

---

<a id="slide-11"></a>
## 11. Exercises 1–2: macros and loops

*Exercises · Jinja that stays readable*

Work in the project folder from the lessons (or a fresh copy of `dbt-jinja-macros-project/` after `python scripts/load_raw.py` and `dbt build`). Each solution below was applied to a scratch copy of the project and run during the build; its output is real. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Your own macro with a default argument

Write a macro `parse_amount(column_name, scale=2)` that returns the safe cast used in `stg_events`, use it there, and prove with `dbt compile` that the generated SQL is unchanged. Then run `dbt build --select stg_events`.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · A Jinja loop over product categories

Create `models/marts/fct_daily_category_revenue.sql`: one row per `date_key`, a `…_revenue` column for each category in a variable `revenue_categories` (default `Plants`, `Accessories`, `Plant care`), and a `total_revenue`. Column names must be valid identifiers (`plant_care_revenue`). Expected for 2 March: plants 89.00, accessories 18.00, plant care 12.50.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

---

<a id="slide-12"></a>
## 12. Cheat sheet

*Reference · the deck on one page*

#### Jinja in models

| Need | Write |
|---|---|
| insert a value | `{{ expression }}` |
| logic | `{% statement %}` |
| comment (not sent) | `{# … #}` |
| trim whitespace | `{%- … -%}` |
| loop | `{%- for x in xs %} … {%- endfor %}` |
| comma between items | `{% if not loop.last %},{% endif %}` |
| branch | `{% if target.name == "ci" %} … {% endif %}` |
| local variable | `{% set xs = var("list", ["a", "b"]) %}` |
| filter | `{{ name \| lower \| replace(" ", "_") }}` |
| macro | `{% macro f(col, n=2) -%} … {%- endmacro %}` |
| call a macro | `{{ f('column_name') }}` (column names as strings) |

#### Commands and checks

| Need | Run |
|---|---|
| see generated SQL | `dbt compile --select m` → `target/compiled/` |
| try a snippet | `dbt compile --inline "select {{ … }}"` |
| catch undefined names fast | `dbt parse` |
| rebuild after a macro change | `dbt build --select m+` |
| prove a refactor | save old output; `EXCEPT` both ways = 0 rows |
| incremental from scratch | `dbt run --select m --full-refresh` |
| record history | `dbt snapshot` |
| logic tests | `dbt test --select test_type:unit` |
| install packages | `dbt deps` (from `packages.yml`) |

| Built-in | Returns | Lesson |
|---|---|---|
| `ref()`, `source()` | a relation name and a DAG edge | 3 |
| `var("name", default)` | a project variable; `--vars` overrides it | 3, 4 |
| `config(...)` | per-model settings (materialized, tags, unique_key) | 3, 4, 7 |
| `target.name` | the active target (dev, ci, prod) | 3 |
| `is_incremental()`, `this` | true on later incremental runs / the model’s own table | 7 |

> **The main idea:** write a template only when it removes real repetition, read the compiled SQL every time, rebuild downstream after macro changes, and prove a refactor with an output comparison.

---

<a id="slide-13"></a>
## 13. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Jinja | The template language in dbt: {{ expression }}, {% statement %}, {# comment #} |
| Template / compile | SQL with Jinja / render it to plain SQL (target/compiled) |
| Expression / statement | Jinja that inserts a value / Jinja that runs logic (loops, ifs, set) without inserting text by itself |
| Whitespace control | A dash inside a Jinja tag ({%- -%}) trims spaces and newlines |
| Jinja filter | A transformation applied with a pipe: {{ x \| lower }} |
| Macro | A Jinja function in macros/ that returns SQL text |
| Variable (var) | A project setting read in models; default in dbt_project.yml, overridable with --vars |
| target | Jinja object describing the active connection (target.name, target.schema) |
| Refactor | Changing how code is written without changing what it produces |
| EXCEPT | Set operator: rows of the first query that are not in the second |
| Periodic snapshot fact | A fact with one row per period (per day) |
| Adapter dispatch | A macro mechanism that picks an implementation per database |
| Incremental model | A table that processes only new or changed rows after the first run |
| is_incremental() / this | True on later incremental runs / the model’s own existing table |
| unique_key | The key an incremental model merges on, instead of appending |
| Look-back window | Reprocessing a few recent periods on every run to catch late rows |
| Full refresh | Rebuilding an incremental model from scratch (--full-refresh) |
| Snapshot (dbt) | Records changes of a mutable source as SCD type 2 rows (dbt_valid_from, dbt_valid_to) |
| Snapshot strategy | timestamp (trust an updated_at column) or check (compare column values) |
| Unit test | Tests a model’s logic on hand-made input rows (dbt 1.8+) |
| Package | A reusable dbt project installed with dbt deps (dbt_utils) |
| Model contract | An enforced declaration of a model’s columns and types |
| Slim CI / defer | Build only state:modified+ in CI / read unchanged parents from production |

---

<a id="slide-14"></a>
## 14. What to remember, and what comes next

*Reference · recap*

1. **Jinja runs first.** dbt renders every model to plain SQL before the warehouse sees it; Jinja cannot see data.
2. **Three delimiters.** `{{ }}` inserts, `{% %}` runs logic, `{# #}` comments; dashes trim whitespace.
3. **Loops remove repetition.** Drive them from a variable or seed, avoid trailing commas, and read the compiled SQL.
4. **Macros are functions that return SQL.** Pass column names as strings, keep them small, rebuild downstream after a change.
5. **Refactor safely.** Start from a green build, save the old output, compare with `EXCEPT` both ways, rebuild from an empty folder.
6. **Next steps are Jinja too.** Incremental models use `is_incremental()` and `{{ this }}`; snapshots keep SCD2 history; unit tests check logic on fixed rows.

#### Practise this week

- Redo lessons 4 and 5 on a fresh copy of `dbt-fundamentals-project/`, checking against `dbt-jinja-macros-project/`.
- Do exercises 1 and 2 again without hints.
- Write one more macro (for example a safe division with `NULLIF`) and use it in a new mart.
- Explain `is_incremental()`, `unique_key` and the two snapshot strategies aloud in two minutes.

#### Coming up

The next lessons in your plan go deeper on what Part C previewed: incremental models with look-back windows and merge strategies, snapshots, advanced data tests and unit tests; then deployment with dev and prod targets, slim CI, and governance features such as contracts and versions.

> **The main idea:** Jinja is a tool for removing repetition, not for cleverness: template, compile, read, rebuild, and prove that nothing changed.

*Read more:* [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview).

---

<a id="slide-15"></a>
## 15. References and how this deck was tested

*References · official documentation*

- [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [dbt Jinja functions](https://docs.getdbt.com/reference/dbt-jinja-functions), [Jinja template designer docs](https://jinja.palletsprojects.com/en/stable/templates/), [Jinja for loops](https://jinja.palletsprojects.com/en/stable/templates/#for).
- [project variables](https://docs.getdbt.com/docs/build/project-variables), [config()](https://docs.getdbt.com/reference/dbt-jinja-functions/config), [target](https://docs.getdbt.com/reference/dbt-jinja-functions/target), [adapter dispatch](https://docs.getdbt.com/reference/dbt-jinja-functions/dispatch), [custom schemas](https://docs.getdbt.com/docs/build/custom-schemas).
- [dbt compile](https://docs.getdbt.com/reference/commands/compile), [dbt build](https://docs.getdbt.com/reference/commands/build).
- [incremental models](https://docs.getdbt.com/docs/build/incremental-models), [snapshots](https://docs.getdbt.com/docs/build/snapshots), [snapshot configurations](https://docs.getdbt.com/reference/snapshot-configs), [unit tests](https://docs.getdbt.com/docs/build/unit-tests).
- [packages](https://docs.getdbt.com/docs/build/packages), [dbt_utils](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/), [model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [state selection](https://docs.getdbt.com/reference/node-selection/state-selection), [defer](https://docs.getdbt.com/reference/node-selection/defer).
- [DuckDB set operations (EXCEPT)](https://duckdb.org/docs/stable/sql/query_syntax/setops), [dbt with Fabric Data Warehouse](https://docs.getdbt.com/docs/local/connect-data-platform/fabric-setup).

**Testing:** built with dbt-core 1.12.5, dbt-duckdb 1.11.0 and DuckDB 1.5.6 on CPython 3.12.10 (Windows 11). The build copied the exported project of the *dbt fundamentals* deck into a scratch folder, loaded and built it, then applied the changes in the order of the lessons; every `dbt` command and Python block ran there. Next-step features and exercises ran in separate copies. The refactored project was exported to `dbt-jinja-macros-project/` and rebuilt from an empty folder (lesson 6). Output normalisation: leading clock times removed, durations replaced by `x.xx`, absolute paths replaced by placeholders, some long outputs trimmed (labelled). Telemetry was disabled with `send_anonymous_usage_stats: false`.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Your own macro with a default argument

Copy the shape of `macros/to_utc.sql`. Jinja macros accept default arguments like Python functions. Pass the column name as a string.

<a id="hint-2"></a>
### Hint 2 · A Jinja loop over product categories

`{% set categories = var("revenue_categories", [...]) %}` gives a default. Jinja **filters** transform values with a pipe: `{{ x | lower | replace(" ", "_") }}`. Join the fact to `dim_product` on `product_key`.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was applied to a scratch copy of the project and run with dbt during the build; the outputs shown are real (timestamps and durations normalised).

<a id="solution-1"></a>
### Solution 1 · Your own macro with a default argument

```sql
# macros/parse_amount.sql
{% macro parse_amount(column_name, scale=2) -%}
    try_cast(trim({{ column_name }}) as decimal(10, {{ scale }}))
{%- endmacro %}
```

```diff
# models/staging/stg_events.sql (changed line)
-        try_cast(trim(amount) as decimal(10, 2))  as amount,
+        {{ parse_amount('amount') }}              as amount,
```

Terminal (only the changed line):

```text
$ dbt compile --select stg_events
        try_cast(trim(amount) as decimal(10, 2))              as amount,
```

Terminal (output trimmed):

```text
$ dbt build --select stg_events
Done. PASS=5 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

**Why it works.** The macro returns text; with `scale` defaulting to 2 it renders exactly the old expression, so the model’s behaviour (and its WARN for e7) is unchanged. Comparing compiled SQL before and after is how you refactor Jinja safely.

<a id="solution-2"></a>
### Solution 2 · A Jinja loop over product categories

```sql
# models/marts/fct_daily_category_revenue.sql
{% set categories = var("revenue_categories", ["Plants", "Accessories", "Plant care"]) %}
-- fct_daily_category_revenue: one row per UTC day, one revenue column per product category.
select
    f.date_key,
    {%- for category in categories %}
    sum(case when p.category = '{{ category }}' then f.amount else 0 end) as {{ category | lower | replace(" ", "_") }}_revenue,
    {%- endfor %}
    sum(f.amount) as total_revenue
from {{ ref("fct_orders") }} as f
join {{ ref("dim_product") }} as p using (product_key)
group by 1
```

Terminal (output trimmed):

```text
$ dbt run --select fct_daily_category_revenue
1 of 1 OK created sql table model main_marts.fct_daily_category_revenue ........ [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt show --inline "select * from {{ ref('fct_daily_category_revenue') }} order by date_key"
Previewing inline node:
| date_key | plants_revenue | accessories_revenue | plant_care_revenue | total_revenue |
| -------- | -------------- | ------------------- | ------------------ | ------------- |
| 20260302 |             89 |                  18 |              12.50 |        119.50 |
| 20260303 |              0 |                   0 |               7.50 |          7.50 |
| 20260304 |             39 |                   0 |               9.99 |         48.99 |
```

**Why it works.** The loop writes one `sum(case …)` per category; filters turn “Plant care” into a safe column name. Unknown products would count only in `total_revenue`, which is a good reason to keep a total column next to any pivot. Without the default in `var()`, the model would fail to compile until the variable is defined.
