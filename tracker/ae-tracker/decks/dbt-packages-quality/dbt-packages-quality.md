# dbt packages and project quality: dbt_utils, codegen, project evaluator and SQLFluff

*Companion to `dbt-packages-quality.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Tested with:** dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), dbt_utils 1.4.1, codegen 0.14.1, dbt_project_evaluator 1.4.0, SQLFluff 4.4.0 with sqlfluff-templater-dbt 4.4.0, CPython 3.12.10, on Windows 11 (64-bit). SQL dialect: DuckDB. Every dbt, SQLFluff and Python command shown was executed while building this document, in a real project folder, and its real output is shown. Output was normalised in three ways only: the leading clock time on dbt log lines was removed, durations were replaced by `x.xx`, and absolute folder paths were replaced by `<project>`, `<root>`, `<venv>` or `~`. Long outputs are trimmed (marked). Timings are labelled as measured on the build machine.

**Series and scope:** this is a gap deck in the dbt series. It starts from the finished project of *dbt Jinja and macros: templates, loops, reusable SQL* (Jinja, a loop, a first macro and a proven refactor are taught there and not repeated). It adds what that deck left out: packages and `dbt deps`, dbt_utils, codegen, a second macro with arguments and defaults, dbt-project-evaluator fixed to zero findings, and SQLFluff with the dbt style config. Recursive CTEs, CTE pipelines and formatting rules are in *Query structure: recursion and clean SQL*; set operations are in *SQL aggregation*.

**Lab:** the finished project is in `dbt-packages-quality-lab/` next to this file, with a README and a one-command quality gate (lesson 21).

**Prerequisites:** *dbt fundamentals: source data to trusted marts*, *dbt Jinja and macros*, and *Query structure: recursion and clean SQL*. New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises follow common analytics-engineering interview patterns (research done in October 2026: installing and pinning packages, surrogate keys, macros with defaults, custom generic tests, enforcing SQL style, keeping a project healthy, debugging missing packages). All questions are original and use the Leafy project.

**Additions beyond the original brief** are marked *(added)*: package-lock.yml and the Windows path-length limit that breaks `dbt deps`; a counterexample showing why `md5(a || b)` is not a safe key; dbt_utils generic tests (`unique_combination_of_columns`, `expression_is_true`); a custom generic test written as a macro; evaluator severity as a CI gate, and lint fixes proved to change no data; a one-command quality gate script for the lab.

## Contents

1. [dbt packages and project quality: dbt_utils, codegen, project evaluator and SQLFluff](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up: versions, the starting project, and what was tested](#slide-2)
3. [The quality bar: what “done” means in this deck](#slide-3)
4. [Packages: packages.yml and version ranges](#slide-4)
5. [dbt deps and package-lock.yml](#slide-5)
6. [dbt_utils.generate_surrogate_key: keys from a macro, not hand-written md5()](#slide-6)
7. [Composite keys: NULLs, separators, and a new mart at a two-column grain](#slide-7)
8. [Everyday dbt_utils: date_spine, star, and extra generic tests](#slide-8)
9. [codegen: generate source YAML and a base model](#slide-9)
10. [codegen: model YAML, then add descriptions and tests](#slide-10)
11. [A second macro: arguments, defaults and keyword calls](#slide-11)
12. [A custom generic test: a macro that returns failing rows](#slide-12)
13. [dbt-project-evaluator: install it and run it](#slide-13)
14. [Reading the findings: what the eight warnings mean](#slide-14)
15. [Fixing the findings: folders, descriptions and primary-key tests](#slide-15)
16. [Exceptions, zero findings, and a CI gate](#slide-16)
17. [SQLFluff: a linter that understands SQL, dialects and templates](#slide-17)
18. [The dbt style config (.sqlfluff) and the first lint](#slide-18)
19. [sqlfluff fix: what it changes, and what it cannot](#slide-19)
20. [Lint clean, prove nothing changed, and wire it into CI](#slide-20)
21. [Lab: the Leafy quality gate, from the dbt Jinja and macros project to zero findings](#slide-21)
22. [Bug clinic: what goes wrong with packages, macros, the evaluator and SQLFluff](#slide-22)
23. [Interview questions and model answers](#slide-23)
24. [Exercises 1–3: lock files, composite keys, package tests](#slide-24)
25. [Exercises 4–5: your own macro and your own test](#slide-25)
26. [Exercises 6–7: lint a model, pass the evaluator](#slide-26)
27. [Exercises 8–10: debug CI, choose the tool, add a source](#slide-27)
28. [Cheat sheet](#slide-28)
29. [Glossary](#slide-29)
30. [What to remember, and references](#slide-30)
31. [Appendix A · Hints](#appendix-a)
32. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. dbt packages and project quality: dbt_utils, codegen, project evaluator and SQLFluff

**

The Leafy project from *dbt Jinja and macros* builds and passes its tests, but nobody else could check it the way a team would: keys are hand-written `md5()` calls, two models have no tests, one has no description, files sit in the wrong folders, and the SQL layout varies by file. This deck adds three packages, fixes every finding of **dbt-project-evaluator**, and makes the SQL pass **SQLFluff** with the dbt style config, proving at each step that the data did not change. Every `dbt` and `sqlfluff` command ran while the deck was built.

- **Part A, packages:** packages.yml, dbt deps, the lock file, dbt_utils, codegen.
- **Part B, your macros:** a macro with arguments and defaults, a custom generic test.
- **Part C, project evaluator:** run it, read the findings, fix them, add justified exceptions, then gate CI on it.
- **Part D, SQLFluff and lab:** the dbt style config, lint, fix, prove no data changed; a one-command quality gate.
- **Then:** a bug clinic, interview questions, 10 exercises, a cheat sheet, a glossary and references.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

A dbt project that works on your laptop is not yet a project a team can trust. Others need the same package versions you used, keys that do not collide, sources and staging models that look like everyone else’s, documentation and primary-key tests on every model, and SQL that reads the same whoever wrote it. Packages (dbt_utils, codegen) remove hand-written boilerplate; dbt-project-evaluator and SQLFluff turn “best practice” into checks a machine runs on every change.

#### Where you will use it

- Adding `dbt_utils` for surrogate keys, date spines and extra tests, pinned so CI installs the same code.
- Bootstrapping a new source with `codegen` instead of typing YAML by hand.
- Writing small macros with arguments and defaults, and custom generic tests.
- Gating pull requests on zero evaluator findings and a clean SQLFluff lint.

#### What goes wrong without it

- A CI run that stops with “Run dbt deps” because packages were never installed, or builds differently because a new release slipped in.
- Surrogate keys that collide (`md5(a || b)`) or become NULL when one part is NULL.
- Models without descriptions or primary-key tests, found only when a dashboard breaks.
- Review time spent on commas and capital letters instead of logic.

#### Who expects you to know it

- Analytics engineers: packages, macros and lint fixes are weekly work.
- Reviewers and leads: expect zero evaluator findings and lint-clean SQL in every pull request.
- Interviewers: “how do you build a surrogate key?”, “how do you install and pin a package?”, “how do you enforce SQL style?”, “how do you keep a dbt project healthy?”.

> **On the job:** Your first ticket on a new analytics team: “add the reviews source and a daily product sales mart”. The reviewer’s checklist is a CI job: dbt deps from the lock file, dbt build, dbt-project-evaluator with severity error, sqlfluff lint. You use codegen to write the source YAML, dbt_utils for the composite key and its test, and you fix every finding before you ask for review.

> **The main idea:** packages save you from rewriting solved problems, and the evaluator and SQLFluff turn your team’s conventions into checks that run on every change.

*Read more:* [dbt: Packages](https://docs.getdbt.com/docs/build/packages), [dbt_project_evaluator docs](https://dbt-labs.github.io/dbt-project-evaluator/latest/).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| The same helper SQL that other teams already wrote (keys, date spines, unions) | A package such as dbt_utils, pinned with a version range | Tested code, maintained for many warehouses |
| A rule only your project needs (your rounding, your text cleaning) | Your own macro with arguments and defaults | Small, readable, owned by you |
| Typing source YAML and staging boilerplate | codegen, then edit the output | Minutes instead of an hour; fewer typos |
| Checking structure, naming, docs and PK tests at scale | dbt-project-evaluator in CI | A machine never forgets a rule |
| Arguing about SQL layout in review | SQLFluff with a shared .sqlfluff | One style, auto-fixed |
| A package for one 3-line expression, or one you would have to fork | A local macro instead | Every package is a dependency to upgrade and trust |

#### How interviews test it

- “How do you install a dbt package, and how do you make CI use the same version?” (packages.yml, version range, dbt deps, package-lock.yml).
- “Build a surrogate key on (order_date, product_id). Why not md5 of the concatenation?” (NULLs, separators).
- “Write a macro with a default argument” / “write a custom generic test”.
- “How do you keep a growing dbt project consistent?” (evaluator, SQLFluff, CI gates).

#### Where it sits in your learning path

- Builds on: *dbt fundamentals: source data to trusted marts*, *dbt Jinja and macros: templates, loops, reusable SQL* (its finished project is this deck’s starting point) and *Query structure: recursion and clean SQL* (the style rules SQLFluff now enforces).
- Next in your plan: incremental models, snapshots and unit tests in depth, then deployment with slim CI, where these checks run on every pull request.

> **The main idea:** add a package when it solves a shared problem, write a macro when the rule is yours, and let the evaluator and SQLFluff check the conventions in CI.

---

<a id="slide-2"></a>
## 2. Set up: versions, the starting project, and what was tested

*Start here · a known-good project before any change*

| Item | Detail |
|---|---|
| Tested with | **dbt-core 1.12.5**, **dbt-duckdb 1.11.0** (DuckDB 1.5.6), **SQLFluff 4.4.0** with sqlfluff-templater-dbt 4.4.0, CPython 3.12.10, Windows 11. dbt packages resolved by `dbt deps`: dbt_utils 1.4.1, codegen 0.14.1, dbt_project_evaluator 1.4.0. SQL dialect: DuckDB. |
| Starting point | The finished project of *dbt Jinja and macros* (folder `dbt-jinja-macros-project/` next to that deck). Copy it to a **short** path such as `C:\dev\leafy`: lesson 5 explains why. |
| What ran | Every dbt, SQLFluff and Python command, in one project folder, in lesson order; exercises ran in scratch copies. `dbt deps` downloaded the packages from hub.getdbt.com during the build. |
| Outputs | Real. Clock times removed, durations shown as `x.xx`, machine paths replaced by `<project>`, `<root>` or `~`. Long outputs are trimmed and labelled. |

#### Install, load and build

```text
# one virtual environment at a short path (Windows: see lesson 5)
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0 sqlfluff==4.4.0 sqlfluff-templater-dbt==4.4.0
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

#### Save the output you are about to change

Several lessons change how models are written (keys, a date spine, lint fixes) but must not change what they produce. Save a copy of every mart first, in a schema dbt never touches, so “nothing changed” can be proved with `EXCEPT` as in *dbt Jinja and macros*.

```python
import duckdb
marts = ["dim_customer", "dim_product", "dim_date", "fct_orders", "fct_daily_funnel"]
with duckdb.connect("leafy.duckdb") as con:
    con.execute("create schema if not exists legacy")      # outside dbt's schemas
    for m in marts:
        con.execute(f"create or replace table legacy.{m} as select * from main_marts.{m}")
        n = con.sql(f"select count(*) from legacy.{m}").fetchone()[0]
        print(f"legacy.{m}: {n} rows")
```

Output:

```text
legacy.dim_customer: 6 rows
legacy.dim_product: 5 rows
legacy.dim_date: 7 rows
legacy.fct_orders: 7 rows
legacy.fct_daily_funnel: 3 rows
```

> **On the job:** Tooling changes (a package upgrade, a lint run over the whole project) touch many files at once. Teams pair them with an output comparison or an audit query in CI, so a formatting pull request can be approved without reading every line.

> **The main idea:** start from a green build and a saved copy of the marts; then every package, macro and lint fix can be proved harmless.

*Read more:* [Install dbt Core](https://docs.getdbt.com/docs/local/install-dbt), [SQLFluff: getting started](https://docs.sqlfluff.com/en/stable/gettingstarted.html).

---

<a id="slide-3"></a>
## 3. The quality bar: what “done” means in this deck

*Start here · the checklist you will tick, and where each item is taught*

The learning plan sets a **definition of done**: concrete statements you can tick when the work is finished. This deck makes each one checkable by a command, not by opinion.

| You can say | Checked by | Lessons |
|---|---|---|
| I add and use packages | `dbt deps` installs from `packages.yml`; `package-lock.yml` is committed; models call `dbt_utils` macros | 4–10 |
| I write and use a macro (a second one, with defaults) | `dbt compile` shows the generated SQL; the model builds | 11–12 |
| I refactor legacy SQL into modular models | saved output `EXCEPT` new output returns 0 rows both ways (method from *dbt Jinja and macros*) | 6, 8, 20 |
| dbt-project-evaluator shows zero violations | `dbt build --select package:dbt_project_evaluator` ends with `WARN=0`, then passes with severity `error` | 13–16 |
| My SQL passes SQLFluff with the dbt style config | `sqlfluff lint` exits 0 with the dbtonic `.sqlfluff` | 17–20 |
| (all of the above, in one go) | `python scripts/quality_gate.py` exits 0 | lab, 21 |

#### Already covered elsewhere (one line each)

- Jinja expressions and statements, a loop, a first macro (`to_utc`), proving a refactor with `EXCEPT`: *dbt Jinja and macros: templates, loops, reusable SQL*.
- CTE pipelines (import → logical → final), recursive CTEs, naming and formatting habits: *Query structure: recursion and clean SQL*.
- UNION, UNION ALL, INTERSECT, EXCEPT: *SQL aggregation*.
- pre-commit hooks and CI mechanics: *Python quality and tooling*.

#### What this deck adds to the project

```text
leafy/
├── packages.yml + package-lock.yml     # lessons 4-5
├── .sqlfluff + .sqlfluffignore         # lessons 18-20
├── macros/
│   ├── safe_divide.sql                 # lesson 11: second macro
│   └── _macros.yml                     # macro documentation
├── tests/generic/row_count_between.sql  # lesson 12: generic test
├── models/
│   ├── staging/shop_raw/…              # lesson 15: evaluator fix
│   └── marts/fct_daily_product_sales   # lesson 7: composite key
├── seeds/dbt_project_evaluator_exceptions.csv   # lesson 16
└── scripts/quality_gate.py             # lesson 21
```

> **The main idea:** each line of the definition of done maps to a command with an exit code; the lab runs them all.

*Read more:* [How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview).

---

<a id="slide-4"></a>
## 4. Packages: packages.yml and version ranges

*Part A · how do I add someone else’s dbt code to my project?*

A **dbt package** is a complete dbt project (macros, models, tests) that you install into yours. Its macros are then called with the package name as a prefix, such as `dbt_utils.generate_surrogate_key(...)`, and its models become part of your DAG. **dbt Hub** (hub.getdbt.com) is the public registry of packages. Coming from C#: `packages.yml` is the `<PackageReference>` list in a .csproj, `dbt deps` is `dotnet restore`, and `package-lock.yml` is `packages.lock.json`. One difference: dbt packages arrive as *source code* that is compiled with your project, not as binaries.

#### The file for this deck

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.4.0", "<1.5.0"]    # any 1.4.x patch, never 1.5
  - package: dbt-labs/codegen
    version: [">=0.14.0", "<0.15.0"]
  - package: dbt-labs/dbt_project_evaluator
    version: [">=1.4.0", "<1.5.0"]
```

A **version range** such as `[">=1.4.0", "<1.5.0"]` accepts any 1.4.x release. Packages use **semantic versioning** (major.minor.patch): patches fix bugs, minors add features, majors may break you. dbt’s docs recommend exactly this form: the latest patch of a chosen minor.

#### Where a package can come from

| Key | Example | Use when |
|---|---|---|
| `package:` + `version:` | `dbt-labs/dbt_utils` | public Hub packages (default choice; dbt resolves shared dependencies) |
| `git:` + `revision:` | a tag, branch or 40-character commit | a fork, or a package not on the Hub |
| `private:` | `org/repo` on GitHub, GitLab, Azure DevOps | your company’s internal package |
| `local:` | `../shared_macros` | a monorepo, or testing a package change |
| `tarball:` | an internal artifact URL | no direct internet access |

#### packages.yml or dependencies.yml?

Newer dbt versions also accept a file named `dependencies.yml`; it can hold the same `packages:` list plus `projects:` (cross-project references in dbt Mesh). It is not rendered with Jinja, so anything that needs `env_var()`, such as a Git token, must stay in `packages.yml`. Do not list packages in both files: dbt stops with an error (bug clinic). This deck uses `packages.yml` because it only installs Hub packages.

| Package | What it gives you | Lessons |
|---|---|---|
| `dbt_utils` | everyday macros (`generate_surrogate_key`, `date_spine`, `star`, `union_relations`, `deduplicate`) and generic tests | 6–8 |
| `codegen` | operations that print source YAML, base models and model YAML for you to paste | 9–10 |
| `dbt_project_evaluator` | models and tests that check your project against dbt Labs’ best practices | 13–16 |

> **On the job:** Production dbt projects usually list a handful of packages. Common ones are dbt_utils, dbt_expectations (more data tests), codegen, audit_helper (compare old and new tables) and source packages for tools such as Fivetran or Stripe. Reviewers check that each one is pinned and that nobody added a package for a single three-line macro.

> **The main idea:** a package is someone else’s dbt project compiled with yours; list it in packages.yml with a minor-version range so you get fixes but not breaking changes.

*Read more:* [Packages](https://docs.getdbt.com/docs/build/packages), [dbt Package Hub](https://hub.getdbt.com/), [packages-install-path](https://docs.getdbt.com/reference/project-configs/packages-install-path).

---

<a id="slide-5"></a>
## 5. dbt deps and package-lock.yml

*Part A · how do the packages get installed, and how does CI get the same versions?*

`dbt deps` resolves every entry in `packages.yml` (and the packages *they* depend on), downloads them into `dbt_packages/`, and writes **package-lock.yml**: the exact version of every package plus a hash of your `packages.yml`. The next `dbt deps` installs exactly what the lock says, until you change `packages.yml` or ask for an upgrade.

#### First run

Terminal:

```text
$ dbt deps
Running with dbt=1.12.5
Updating lock file in file path: <project>/package-lock.yml
Installing dbt-labs/dbt_utils
Installed from version 1.4.1
Up to date!
Installing dbt-labs/codegen
Installed from version 0.14.1
Up to date!
Installing dbt-labs/dbt_project_evaluator
Installed from version 1.4.0
Up to date!
```

```yaml
-- package-lock.yml (generated)
packages:
  - name: dbt_utils
    package: dbt-labs/dbt_utils
    version: 1.4.1
  - name: codegen
    package: dbt-labs/codegen
    version: 0.14.1
  - name: dbt_project_evaluator
    package: dbt-labs/dbt_project_evaluator
    version: 1.4.0
sha1_hash: 45f4a20b91695adc39f64b47b6b06713326c5547
```

#### What landed, and the second run

```python
import os
for name in sorted(os.listdir("dbt_packages")):
    files = sum(len(fs) for _, _, fs in os.walk(os.path.join("dbt_packages", name)))
    print(f"dbt_packages/{name:<24} {files:>4} files")
```

Output:

```text
dbt_packages/codegen                    84 files
dbt_packages/dbt_project_evaluator     348 files
dbt_packages/dbt_utils                 235 files
```

Terminal (second run: versions come from the lock file):

```text
$ dbt deps
Installing dbt-labs/dbt_utils
Installed from version 1.4.1
Up to date!
Installing dbt-labs/codegen
Installed from version 0.14.1
Up to date!
Installing dbt-labs/dbt_project_evaluator
Installed from version 1.4.0
Up to date!
```

Commit `packages.yml` and `package-lock.yml`; never commit `dbt_packages/` (the project’s `.gitignore` already lists it). In CI the job runs `dbt deps` first and gets the locked versions.

#### Three options worth knowing

Terminal (only the options discussed here):

```text
$ dbt deps --help
  There is a way to add new packages by providing an `--add-package` flag to
  --source [hub|git|local]        Source to download page from, must be one of
  --lock                          Generate the package-lock.yml file without
  --upgrade                       Upgrade packages to the latest version.
  --add-package NEWPACKAGE        Add a package to current package spec,
                                  the source with --source flag.
```

- `dbt deps`: install what the lock file says (creates it on the first run).
- `dbt deps --upgrade`: ignore the lock, take the newest versions inside your ranges, rewrite the lock. Do it on purpose, in its own pull request.
- `dbt deps --lock`: rewrite the lock without installing (for a quick review of what would change).

#### Windows: the 260-character path limit

*(added)* Not in the brief: this limit decides where you can put a project on Windows.

dbt_project_evaluator contains files up to **137 characters** below the project folder (measured on the build machine). Windows refuses paths longer than 260 characters unless long paths are enabled, so `dbt deps` fails with `FileNotFoundError: [Errno 2] No such file or directory: 'dbt_packages\\dbt-project-evaluator-…'` when the project sits deep inside your user folder. While this deck was prepared, `dbt deps` failed exactly like that in a deeply nested folder; the build then moved the project to a short path.

- Keep dbt projects at short paths such as `C:\dev\leafy`.
- Or enable Windows long paths (an administrator setting) and use Git’s `core.longpaths`.
- Linux and macOS runners (most CI) do not have this limit.

> **On the job:** “Works on my machine, fails in CI” with packages is nearly always one of three things: CI never ran `dbt deps`, the lock file was not committed so CI resolved a newer version, or someone edited `packages.yml` without re-running `dbt deps`. Bug clinic and exercise 8 reproduce the first one.

> **The main idea:** dbt deps installs into dbt_packages/ and records exact versions in package-lock.yml; commit the lock, ignore the folder, upgrade on purpose.

*Read more:* [dbt deps](https://docs.getdbt.com/reference/commands/deps), [Pinning packages](https://docs.getdbt.com/docs/build/packages#pinning-packages), [Windows maximum path length](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation).

---

<a id="slide-6"></a>
## 6. dbt_utils.generate_surrogate_key: keys from a macro, not hand-written md5()

*Part A · how do I build surrogate keys the way every dbt team does?*

A **surrogate key** is a key the warehouse makes up, here a hash of the natural key, so facts can join dimensions on one column (*dbt fundamentals* built them with `md5(customer_id)`). `dbt_utils.generate_surrogate_key(field_list)` takes a *list of column names as strings* and returns SQL that casts each to text, replaces NULL with a fixed marker, joins the parts with `-`, and hashes the result with the adapter’s hash function.

#### What the macro compiles to (DuckDB)

Terminal:

```text
$ dbt --quiet compile --inline "select {{ dbt_utils.generate_surrogate_key(['customer_id']) }}"
select md5(cast(coalesce(cast(customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT))
```

For one non-NULL text column, `md5(cast(coalesce(cast(x as TEXT), '…null…') as TEXT))` equals `md5(x)`, so the keys below should not move. That is a prediction; the comparison checks it.

#### Replace the hand-written keys

```diff
--- a/models/marts/dim_customer.sql
+++ b/models/marts/dim_customer.sql
@@ -27,3 +27,3 @@
 select
-    md5(customer_id) as customer_key,
+    {{ dbt_utils.generate_surrogate_key(['customer_id']) }} as customer_key,
     customer_id,
```

```diff
--- a/models/marts/fct_orders.sql
+++ b/models/marts/fct_orders.sql
@@ -24,2 +24,2 @@
-    coalesce(customers.customer_key, md5('-1'))                     as customer_key,
-    coalesce(products.product_key, md5('-1'))                       as product_key,
+    coalesce(customers.customer_key, {{ dbt_utils.generate_surrogate_key(["'-1'"]) }}) as customer_key,
+    coalesce(products.product_key, {{ dbt_utils.generate_surrogate_key(["'-1'"]) }}) as product_key,
```

`dim_product` gets the same change as `dim_customer`. The unknown member’s key is the macro applied to the literal `'-1'` (a string inside the list, so it is quoted twice).

#### Build and prove nothing changed

Terminal (output trimmed):

```text
$ dbt build --select dim_customer dim_product fct_orders
Done. PASS=20 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=20
```

```python
import duckdb

def compare(model, cols="*", schema="main_marts"):
    """Rows only in the saved copy, and rows only in the new model (EXCEPT ALL both ways)."""
    with duckdb.connect("leafy.duckdb", read_only=True) as con:
        q = f"select {cols} from legacy.{model} except all select {cols} from {schema}.{model}"
        old_only = con.sql(q).fetchall()
        q = f"select {cols} from {schema}.{model} except all select {cols} from legacy.{model}"
        new_only = con.sql(q).fetchall()
    print(f"{model:<17} only in old: {len(old_only)}   only in new: {len(new_only)}")
    return len(old_only) + len(new_only)

diffs = [compare(m) for m in ["dim_customer", "dim_product", "fct_orders"]]
assert sum(diffs) == 0
```

Output:

```text
dim_customer      only in old: 0   only in new: 0
dim_product       only in old: 0   only in new: 0
fct_orders        only in old: 0   only in new: 0
```

#### Why use the macro if the result is the same?

- One rule for every key in the project, including composite keys (next lesson) and NULL parts.
- Portable: the macro picks the right hash and string functions on Snowflake, BigQuery, Fabric or DuckDB.
- **Pitfall:** on other columns or warehouses the formula can differ from your old one. Changing a key formula changes every key, so treat it as a migration: compare outputs, and rebuild incremental models and snapshots that store keys.
- **Pitfall:** `dbt_utils.surrogate_key` (no `generate_`) was removed in dbt_utils 1.0; old blog posts still show it.

> **On the job:** Surrogate keys appear in every dimensional model: one per dimension row, one per fact row when the grain has several columns, and as the merge key of incremental models. Reviewers expect `generate_surrogate_key` and a `unique` + `not_null` test on every key it produces.

> **The main idea:** generate_surrogate_key turns a list of column names into a NULL-safe hash; switch to it with an output comparison, because a changed key formula changes every key downstream.

*Read more:* [generate_surrogate_key](https://github.com/dbt-labs/dbt-utils#generate_surrogate_key-source), [dbt glossary: surrogate key](https://docs.getdbt.com/terms/surrogate-key).

---

<a id="slide-7"></a>
## 7. Composite keys: NULLs, separators, and a new mart at a two-column grain

*Part A · what goes wrong when I hash several columns myself?*

A **composite grain** is a grain defined by more than one column, such as “one row per day and product”. Its surrogate key must hash all of them. The obvious hand-written version, `md5(a || b)`, is wrong in two ways that the counterexample below shows with real output.

Terminal:

```text
$ dbt show `
    --inline "select a, b, md5(a || b) as naive_key, {{ dbt_utils.generate_surrogate_key(['a', 'b']) }} as macro_key from (values …) as v(a, b)"
| a  | b  | naive_key            | macro_key            |
| -- | -- | -------------------- | -------------------- |
| ab | c  | 900150983cd24fb0d... | 4c0cb56fab412feef... |
| a  | bc | 900150983cd24fb0d... | 428577ef9518eb9b2... |
| x  |    |                      | 30489944057fd1254... |
|    | x  |                      | 3b4eefe862272d143... |
```

#### Read the output

- Rows 1 and 2 have different pairs but the **same naive key**: `'ab' || 'c'` and `'a' || 'bc'` are both `'abc'`. The macro puts `-` between parts, so the keys differ.
- Rows 3 and 4: `'x' || NULL` is NULL, so the naive key is **NULL** and a `not_null` test fails (or worse, joins silently drop rows). The macro replaces NULL with a marker first.
- **Interviewer follow-up:** “can the macro still collide?” Yes, in theory: `('a-', 'b')` and `('a', '-b')` both become `a--b`. Keys are made from typed columns (dates, IDs) where that cannot happen, and a `unique` test on the key would catch it.

*(added)* This counterexample is not in the brief; it is the most common interview follow-up on surrogate keys.

#### A new mart at the grain (date, product)

```sql
# models/marts/fct_daily_product_sales.sql
-- fct_daily_product_sales: one row per UTC order date and product.
-- Grain: (date_key, product_key). Measures: orders, revenue.
with orders as (

    select * from {{ ref('fct_orders') }}

)

select
    {{ dbt_utils.generate_surrogate_key(['date_key', 'product_key']) }} as daily_product_sales_key,
    date_key,
    product_key,
    count(*) as orders,
    sum(amount) as revenue
from orders
group by date_key, product_key
```

Terminal (output trimmed):

```text
$ dbt build --select fct_daily_product_sales
1 of 1 OK created sql table model main_marts.fct_daily_product_sales ........... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    rows = con.sql("""select date_key, p.product_id, orders, revenue, left(daily_product_sales_key, 8) as key8
                      from main_marts.fct_daily_product_sales f
                      join main_marts.dim_product p using (product_key)
                      order by 1, 2""").fetchall()
for r in rows:
    print(r)
assert len({r[4] for r in rows}) == len(rows)          # one key per grain row
```

Output:

```text
(20260302, 'P1', 1, Decimal('64.00'), 'f5afc47e')
(20260302, 'P2', 1, Decimal('25.00'), 'dbc1d805')
(20260302, 'P3', 1, Decimal('18.00'), '5954439e')
(20260302, 'P4', 1, Decimal('12.50'), '76e107c7')
(20260303, 'P4', 1, Decimal('7.50'), '7baaf0d8')
(20260304, 'P1', 1, Decimal('39.00'), 'bc80a4c0')
(20260304, 'P4', 1, Decimal('9.99'), '8190ac9b')
```

> **On the job:** Composite grains are everywhere: order lines (order, line number), daily snapshots (day, account), bridge tables (account, customer). Name the key after the table (`daily_product_sales_key`), build it from the grain columns in grain order, and test it with `unique` + `not_null` or with `dbt_utils.unique_combination_of_columns` on the grain columns (lesson 10). In your portfolio: Fuel Smart’s `fct_recipe_ingredient` has the grain (recipe_id, line_number) and needs exactly this key.

> **The main idea:** never hash a plain concatenation: build composite keys with generate_surrogate_key over the grain columns and test them for uniqueness.

*Read more:* [generate_surrogate_key](https://github.com/dbt-labs/dbt-utils#generate_surrogate_key-source), [dbt blog: surrogate keys in dbt](https://docs.getdbt.com/blog/sql-surrogate-keys).

---

<a id="slide-8"></a>
## 8. Everyday dbt_utils: date_spine, star, and extra generic tests

*Part A · which other dbt_utils macros will I use every week?*

#### date_spine: replace a hand-written calendar

`date_spine(datepart, start_date, end_date)` returns one row per period in a column named `date_day` (for `datepart="day"`); the end is **exclusive**. Its arguments are SQL expressions passed as strings, which is why the variable is concatenated with `~`.

```sql
# models/marts/dim_date.sql
-- dim_date: one row per calendar day between two project variables.
-- dbt_utils.date_spine generates the days; the end date is exclusive, so add one day.
with days as (

    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('" ~ var("dim_date_start") ~ "' as date)",
        end_date="(cast('" ~ var("dim_date_end") ~ "' as date) + interval 1 day)"
    ) }}

)

select
    cast(strftime(date_day, '%Y%m%d') as integer) as date_key,
    cast(date_day as date) as date_day,
    dayname(date_day) as day_name,
    isodow(date_day) in (6, 7) as is_weekend
from days
```

Terminal (output trimmed):

```text
$ dbt build --select dim_date
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

```python
assert compare("dim_date") == 0
```

Output:

```text
dim_date          only in old: 0   only in new: 0
```

#### star: every column except a few

`star(from, except)` expands to the column list of a relation at compile time, minus the ones you name. It needs the relation to exist (it reads the warehouse’s metadata), so it does not work on a model that has never been built.

Terminal:

```text
$ dbt --quiet show `
    --inline "select {{ dbt_utils.star(from=ref('dim_customer'), except=['customer_key', 'signup_date']) }} from {{ ref('dim_customer') }}" --limit 3
| customer_id | customer_name | city    |
| ----------- | ------------- | ------- |
| u1          | Maya Lopez    | Austin  |
| u2          | Leo Kim       | Denver  |
| u3          | Ana Ruiz      | Seattle |
```

**A data test on the model, not a column:** `expression_is_true` fails for every row where the expression is false.

```diff
--- a/models/marts/_marts.yml
+++ b/models/marts/_marts.yml
@@ -30,2 +30,6 @@
     description: '{{ doc("fct_orders") }}'
+    data_tests:
+      - dbt_utils.expression_is_true:
+          arguments:
+            expression: "amount > 0"
     columns:
```

Terminal (output trimmed):

```text
$ dbt test --select fct_orders,test_name:expression_is_true
1 of 1 PASS dbt_utils_expression_is_true_fct_orders_amount_0 ................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

| Macro or test | What it does | Typical use |
|---|---|---|
| `union_relations(relations)` | UNION ALL of several tables, aligning columns by name and adding `_dbt_source_relation` | one staging model over per-country copies of a source |
| `deduplicate(relation, partition_by, order_by)` | keeps the first row per partition | the “latest delivery wins” step in staging |
| `get_column_values(table, column)` + `pivot` | reads distinct values at compile time and pivots them | when a loop’s list must come from data |
| `unique_combination_of_columns` | test: no duplicate combination of the listed columns | the grain of a composite-key model |
| `accepted_range`, `not_null_proportion`, `equal_rowcount`, `recency` | tests: value bounds, share of non-NULLs, same row count as another model, freshness of a timestamp | measures, sparse columns, reconciliations, late loads |

> **On the job:** Before writing a macro, check the dbt_utils README: dates, unions, pivots and deduplication are already there, tested on the main warehouses. Data teams also use dbt_expectations for richer tests and audit_helper for comparing a refactored model with the old one, which automates the `EXCEPT` check used in this deck.

> **The main idea:** dbt_utils covers calendars, column lists, unions, deduplication and many generic tests; prove each swap with the same output comparison as any refactor.

*Read more:* [date_spine](https://github.com/dbt-labs/dbt-utils#date_spine-source), [dbt_utils README](https://github.com/dbt-labs/dbt-utils), [audit_helper](https://hub.getdbt.com/dbt-labs/audit_helper/latest/).

---

<a id="slide-9"></a>
## 9. codegen: generate source YAML and a base model

*Part A · how do I stop typing YAML for every new raw table?*

**codegen** is a dbt Labs package of macros that *print* code for you to paste: source YAML from the tables in a schema, a first staging (“base”) model for a source table, and model YAML with every column. You call them with **`dbt run-operation`**, which runs a macro on its own (no model is built); `--args` takes a YAML or JSON dictionary of arguments, and `--quiet` hides dbt’s log lines so only the printed code remains.

#### Source YAML for raw.events

Terminal:

```text
$ dbt --quiet run-operation codegen.generate_source `
    --args '{"schema_name": "raw", "name": "shop_raw", "table_names": ["events"], "generate_columns": true, "include_descriptions": true}'
version: 2

sources:
  - name: shop_raw
    description: ""
    schema: raw
    tables:
      - name: events
        description: ""
        columns:
          - name: event_id
            data_type: varchar
            description: ""
          - name: user_id
            data_type: varchar
            description: ""
          - name: event_type
            data_type: varchar
            description: ""
          - name: ts
            data_type: varchar
            description: ""
          - name: amount
            data_type: varchar
            description: ""
          - name: product_id
            data_type: varchar
            description: ""
          - name: _source_file
            data_type: varchar
            description: ""
```

**DuckDB caveat:** without `table_names`, codegen looks the tables up in `<database>.information_schema`, which DuckDB does not have, and fails (bug clinic). Listing the tables avoids the lookup.

#### A base model to start staging from

Terminal:

```text
$ dbt --quiet run-operation codegen.generate_base_model `
    --args '{"source_name": "shop_raw", "table_name": "events"}'
with source as (

    select * from {{ source('shop_raw', 'events') }}

),

renamed as (

    select
        event_id,
        user_id,
        event_type,
        ts,
        amount,
        product_id,
        _source_file

    from source

)

select * from renamed
```

- Compare with the real `stg_events`: codegen gives the shape (an import CTE, a rename CTE); you add the types, cleaning and deduplication.
- Paste the source YAML into the staging folder and replace every empty `description: ""`; the evaluator (Part C) counts empty descriptions as missing.

> **On the job:** The typical first ticket for a new data source: the loader lands raw tables, you run `generate_source` for the schema, paste and describe it, run `generate_base_model` per table, then write the real cleaning. Exercise 10 does exactly this for a new reviews table.

> **The main idea:** codegen prints the boilerplate (source YAML, base models) from the warehouse’s real columns; you edit it, describe it and test it.

*Read more:* [codegen README](https://github.com/dbt-labs/dbt-codegen), [dbt run-operation](https://docs.getdbt.com/reference/commands/run-operation), [codegen on dbt Hub](https://hub.getdbt.com/dbt-labs/codegen/latest/).

---

<a id="slide-10"></a>
## 10. codegen: model YAML, then add descriptions and tests

*Part A · how do I document a new model without typing every column?*

#### Generated (empty descriptions, real types)

Terminal:

```text
$ dbt --quiet run-operation codegen.generate_model_yaml `
    --args '{"model_names": ["fct_daily_product_sales"]}'
version: 2

models:
  - name: fct_daily_product_sales
    description: ""
    columns:
      - name: daily_product_sales_key
        data_type: varchar
        description: ""

      - name: date_key
        data_type: integer
        description: ""

      - name: product_key
        data_type: varchar
        description: ""

      - name: orders
        data_type: bigint
        description: ""

      - name: revenue
        data_type: decimal(38,2)
        description: ""
```

`generate_model_yaml` reads the built model’s columns, so build the model first. `data_type` comes from the warehouse; keep it only if you also plan a contract.

#### Edited: what the generated file becomes

```yaml
# models/marts/_marts.yml (appended)
  - name: fct_daily_product_sales
    description: Revenue and order count per UTC order date and product. Grain (date_key, product_key).
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [date_key, product_key]
    columns:
      - name: daily_product_sales_key
        description: Surrogate key, generate_surrogate_key(date_key, product_key).
        data_tests: [unique, not_null]
      - name: date_key
        data_tests:
          - relationships:
              arguments:
                to: ref('dim_date')
                field: date_key
      - name: product_key
        data_tests:
          - relationships:
              arguments:
                to: ref('dim_product')
                field: product_key
      - name: revenue
        description: Sum of order amounts in USD.
```

Terminal (output trimmed):

```text
$ dbt build --select fct_daily_product_sales
2 of 6 PASS dbt_utils_unique_combination_of_columns_fct_daily_product_sales_date_key__product_key  [PASS in x.xxs]
3 of 6 PASS not_null_fct_daily_product_sales_daily_product_sales_key ........... [PASS in x.xxs]
4 of 6 PASS relationships_fct_daily_product_sales_date_key__date_key__ref_dim_date_  [PASS in x.xxs]
5 of 6 PASS relationships_fct_daily_product_sales_product_key__product_key__ref_dim_product_  [PASS in x.xxs]
6 of 6 PASS unique_fct_daily_product_sales_daily_product_sales_key ............. [PASS in x.xxs]
Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

- Describe the model and every non-obvious column; delete the empty descriptions you do not fill.
- Test the grain twice on purpose: `unique_combination_of_columns` on the grain columns and `unique` + `not_null` on the key. The first catches a wrong grain, the second a wrong key formula.

> **On the job:** Codegen output is a draft, never a deliverable. In review, empty descriptions and untested keys are the first comments you get, and Part C’s evaluator flags them automatically. Other codegen macros: `generate_model_import_ctes` (rewrites refs into import CTEs) and `generate_unit_test_template`.

> **The main idea:** generate the model YAML from the built model, then add descriptions and grain tests before the pull request.

*Read more:* [codegen README](https://github.com/dbt-labs/dbt-codegen), [data_tests property](https://docs.getdbt.com/reference/resource-properties/data-tests).

---

<a id="slide-11"></a>
## 11. A second macro: arguments, defaults and keyword calls

*Part B · how do I write a macro other people can call safely?*

*dbt Jinja and macros* wrote `to_utc(column_name)`: one argument, no options. Real macros need options with sensible **default values** (used when the caller leaves the argument out) and are called with **keyword arguments** (`name=value`) for clarity. Coming from C#: exactly optional parameters and named arguments, `SafeDivide(n, d, decimals: 4)`. The arguments are SQL *text*; the macro only pastes them into the SQL it returns.

#### The problem: DuckDB divides by zero into Infinity

Terminal:

```text
$ dbt --quiet show `
    --inline "select date_key, purchase_events, page_view_events, purchase_events / page_view_events as naive_rate from {{ ref('fct_daily_funnel') }} order by 1"
| date_key | purchase_events | page_view_events | naive_rate |
| -------- | --------------- | ---------------- | ---------- |
| 20260302 |               5 |                2 |        2.5 |
| 20260303 |               1 |                1 |        1.0 |
| 20260304 |               2 |                0 |   Infinity |
```

On 4 March there were purchases but no page views. DuckDB returns `Infinity`, which a dashboard shows as “∞ %”; Snowflake, SQL Server and Fabric raise a division-by-zero *error* and stop the run. One rule, written once, should decide what a zero denominator means.

```sql
# macros/safe_divide.sql
{#- safe_divide: numerator / denominator, or on_zero when the denominator is 0 or NULL.
    numerator, denominator: SQL expressions as strings, for example 'purchase_events'. -#}
{% macro safe_divide(numerator, denominator, decimals=2, on_zero="null") -%}
    case
        when ({{ denominator }}) is null or ({{ denominator }}) = 0 then {{ on_zero }}
        else round(cast({{ numerator }} as double) / ({{ denominator }}), {{ decimals }})
    end
{%- endmacro %}
```

```yaml
# macros/_macros.yml
version: 2

macros:
  - name: safe_divide
    description: Division that returns on_zero (default NULL) instead of inf or an error when the denominator is 0 or NULL.
    arguments:
      - name: numerator
        type: string
        description: SQL expression for the numerator.
      - name: denominator
        type: string
        description: SQL expression for the denominator.
      - name: decimals
        type: integer
        description: Digits to round to (default 2).
      - name: on_zero
        type: string
        description: SQL returned when the denominator is 0 or NULL (default null).
  - name: to_utc
    description: Converts a timestamp-with-offset text column to a UTC timestamp.
    arguments:
      - name: column_name
        type: string
        description: Column holding ISO 8601 text with an offset.
```

#### Call it with defaults and with keywords

Terminal:

```text
$ dbt --quiet compile `
    --inline "{{ safe_divide('purchase_events', 'page_view_events') }} … {{ safe_divide('revenue', 'orders', on_zero=0, decimals=4) }}"
case
        when (page_view_events) is null or (page_view_events) = 0 then null
        else round(cast(purchase_events as double) / (page_view_events), 2)
    end
-- keyword arguments, in any order:
case
        when (orders) is null or (orders) = 0 then 0
        else round(cast(revenue as double) / (orders), 4)
    end
```

Use it in the funnel mart. The loop moves into a CTE so the new column can refer to the counts by name:

```sql
# models/marts/fct_daily_funnel.sql
{{ config(tags=["funnel"]) }}
-- fct_daily_funnel: one row per UTC day with event counts by type.
-- A periodic snapshot fact (grain: date). Event types come from a project variable.
with counts as (

    select
        cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer) as date_key,
        {%- for event_type in var("funnel_event_types") %}
        count(*) filter (where event_type = '{{ event_type }}') as {{ event_type }}_events,
        {%- endfor %}
        count(distinct customer_id) as active_customers
    from {{ ref("stg_events") }}
    group by 1

)

select
    *,
    {{ safe_divide('purchase_events', 'page_view_events') }} as purchases_per_page_view
from counts
```

Terminal (output trimmed):

```text
$ dbt build --select fct_daily_funnel
Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4
```

```python
old_cols = "date_key, page_view_events, add_to_cart_events, purchase_events, refund_events, active_customers"
assert compare("fct_daily_funnel", cols=old_cols) == 0
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    print(con.sql("select date_key, purchases_per_page_view from main_marts.fct_daily_funnel order by 1").fetchall())
```

Output:

```text
fct_daily_funnel  only in old: 0   only in new: 0
[(20260302, 2.5), (20260303, 1.0), (20260304, None)]
```

The six existing columns are unchanged; the new one is 2.5, 1.0 and NULL instead of `Infinity`.

- **Wrap arguments in parentheses** inside the macro (`({{ denominator }})`): a caller may pass `a - b`, and without parentheses `x / a - b` means `(x / a) - b`.
- **Defaults are Python-like values:** `decimals=2` is a number, `on_zero="null"` is a string pasted as SQL. Pass `on_zero=0` or `on_zero="'n/a'"` (quoted twice for a SQL string).
- **Document macros** in a YAML file under `macros/` (`arguments` with name, type, description); `dbt docs` shows them next to the models.

> **On the job:** Small macros with defaults are the most common custom macros in real projects: `safe_divide`, `cents_to_dollars(column, scale=2)`, `clean_text(column, case="lower")` (exercise 4). Before writing one, check dbt_utils (it has `safe_divide` too, with no options); write your own when the team needs a specific rule such as rounding or a non-NULL result.

> **The main idea:** give macros keyword arguments with safe defaults, parenthesise every argument you paste, document them in YAML, and prove the model’s old columns did not change.

*Read more:* [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [Macro properties](https://docs.getdbt.com/reference/macro-properties), [Jinja macros and defaults](https://jinja.palletsprojects.com/en/stable/templates/#macros).

---

<a id="slide-12"></a>
## 12. A custom generic test: a macro that returns failing rows

*Part B · how do I write a test I can reuse on any model?*

A **generic test** is a macro defined with `{% test name(model, column_name, …) %}` instead of `{% macro %}`. dbt passes the model under test as `model` (and the column as `column_name` when the test sits under a column); your extra arguments come from `arguments:` in YAML. The test’s SQL returns the *failing* rows: zero rows means pass. `unique` and `not_null` are written this way, and so are the dbt_utils tests.

*(added)* The brief asks for a second macro; a generic test is the next thing interviewers ask you to write (“write a custom generic test”), so it is added here.

#### Define it once

```sql
# tests/generic/row_count_between.sql
{% test row_count_between(model, min_rows=1, max_rows=none) %}
{#- Fails when the model has fewer than min_rows or more than max_rows rows. -#}
select row_count
from (select count(*) as row_count from {{ model }}) as counted
where row_count < {{ min_rows }}
{%- if max_rows is not none %}
    or row_count > {{ max_rows }}
{%- endif %}
{% endtest %}
```

Generic tests live in `tests/generic/` (or in `macros/`). This one is model-level (no `column_name`) and has two optional arguments.

#### Use it, and see it fail

```diff
--- a/models/marts/_marts.yml
+++ b/models/marts/_marts.yml
@@ -34,2 +34,5 @@
             expression: "amount > 0"
+      - row_count_between:
+          arguments:
+            min_rows: 1
     columns:
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:row_count_between
1 of 1 PASS row_count_between_fct_orders_1 ..................................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:row_count_between    # with max_rows: 5
1 of 1 FAIL 1 row_count_between_fct_orders_5__1 ................................ [FAIL 1 in x.xxs]
  Got 1 result, configured to fail if != 0
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

With `max_rows: 5` (in a scratch copy) the test returns the one row `row_count = 7`, so it fails with “Got 1 result”.

> **On the job:** Teams write generic tests for rules that dbt_utils does not cover or that encode business policy: “every order has a currency from this list”, “no model is empty after a load”, “keys match this pattern” (exercise 5). Add `config(severity=…)` or `where` in YAML to tune them per model, as with built-in tests.

> **The main idea:** a generic test is a macro that returns failing rows; define it once with default arguments and attach it to any model or column in YAML.

*Read more:* [Writing custom generic tests](https://docs.getdbt.com/best-practices/writing-custom-generic-tests), [Generic data tests](https://docs.getdbt.com/docs/build/data-tests#generic-data-tests).

---

<a id="slide-13"></a>
## 13. dbt-project-evaluator: install it and run it

*Part C · how does a machine review my dbt project?*

**dbt-project-evaluator** is a dbt Labs package that checks your project against dbt Labs’ best practices. It reads dbt’s **graph** (every model, source, test and their links), writes it into the warehouse as tables, then builds one model per rule (`fct_undocumented_models`, `fct_root_models`, …) holding the **findings**, and tests that each is empty. Each non-empty table is a test warning. The rules cover modelling (DAG shape), testing, documentation, structure (names and folders), performance and governance.

#### 1. Install (lesson 4) and configure dispatch

```diff
--- a/dbt_project.yml
+++ b/dbt_project.yml
@@ -34 +34,5 @@
     +schema: seeds
+
+dispatch:                            # dbt-project-evaluator on DuckDB needs its macros first
+  - macro_namespace: dbt
+    search_order: ["dbt_project_evaluator", "dbt"]
```

**Dispatch** lets dbt choose which implementation of a macro to call. On DuckDB, Databricks, Redshift and Fabric the package replaces a few dbt core macros, so its namespace must come first in the search order. Without this the run fails on DuckDB.

#### 2. Run only the package’s models and tests

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator
Found 58 models, 68 data tests, 3 seeds, 1 source, 734 macros
30 of 78 WARN 1 valid_documentation_coverage ................................... [WARN 1 in x.xxs]
35 of 78 WARN 1 is_empty_fct_source_directories_ ............................... [WARN 1 in x.xxs]
36 of 78 WARN 1 is_empty_fct_undocumented_models_ .............................. [WARN 1 in x.xxs]
37 of 78 WARN 1 is_empty_fct_sources_without_freshness_ ........................ [WARN 1 in x.xxs]
67 of 78 WARN 1 is_empty_fct_model_directories_ ................................ [WARN 1 in x.xxs]
73 of 78 WARN 1 is_empty_fct_root_models_ ...................................... [WARN 1 in x.xxs]
76 of 78 WARN 3 is_empty_fct_missing_primary_key_tests_ ........................ [WARN 3 in x.xxs]
78 of 78 WARN 1 valid_test_coverage ............................................ [WARN 1 in x.xxs]
Done. PASS=70 WARN=8 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

The “Found” line counts your nodes plus the package’s own models and tests. Run it separately from your project with `--select package:dbt_project_evaluator`; exclude it from normal builds with `--exclude package:dbt_project_evaluator`.

> **On the job:** Teams run the evaluator in CI on every pull request (Part C ends with that), and once when adopting it on an old project, where the first run often shows dozens of findings. Fix them in small batches by rule, and record real exceptions in a seed with a reason (lesson 16), so the number stays at zero afterwards.

> **The main idea:** the evaluator turns your project graph into tables and tests them against best practice; each warning is one rule with findings to fix or justify.

*Read more:* [dbt_project_evaluator docs](https://dbt-labs.github.io/dbt-project-evaluator/latest/), [evaluator rules](https://dbt-labs.github.io/dbt-project-evaluator/latest/rules/), [dispatch](https://docs.getdbt.com/reference/dbt-jinja-functions/dispatch).

---

<a id="slide-14"></a>
## 14. Reading the findings: what the eight warnings mean

*Part C · which models break which rule, and why does the rule exist?*

A warning only says “this rule has findings”. The rows are in the rule’s table, in the schema where the package builds (`main` here). Query them like any table:

```python
import duckdb
rules = ["fct_undocumented_models", "fct_missing_primary_key_tests", "fct_model_directories",
         "fct_source_directories", "fct_root_models", "fct_sources_without_freshness"]
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    for t in rules:
        rows = con.sql(f"select * from main.{t}").fetchall()
        cols = [c for c in con.sql(f"select * from main.{t}").columns][:3]
        print(f"{t} ({len(rows)}): {cols}")
        for r in rows:
            print("   ", tuple(str(x).replace("\\\\", "/") for x in r[:3]))
    cov = con.sql("""select 'documentation' as kind, documentation_coverage_pct as pct from main.fct_documentation_coverage
                     union all
                     select 'test', test_coverage_pct from main.fct_test_coverage""").fetchall()
    print("coverage (target 100):", cov)
```

Output:

```text
fct_undocumented_models (1): ['resource_name', 'model_type']
    ('int_purchases', 'intermediate')
fct_missing_primary_key_tests (3): ['resource_name', 'resource_type', 'model_type']
    ('stg_products', 'model', 'staging')
    ('int_purchases', 'model', 'intermediate')
    ('stg_customers', 'model', 'staging')
fct_model_directories (1): ['resource_name', 'resource_type', 'model_type']
    ('stg_events', 'model', 'staging')
fct_source_directories (1): ['resource_name', 'resource_type', 'current_file_path']
    ('shop_raw.events', 'source', 'models/staging/_sources.yml')
fct_root_models (1): ['child']
    ('dim_date',)
fct_sources_without_freshness (1): ['resource_name']
    ('shop_raw.events',)
coverage (target 100): [('documentation', 90.0), ('test', 70.0)]
```

| Rule (table) | Why it exists | Finding here |
|---|---|---|
| `fct_undocumented_models`, documentation coverage | every model needs a description so consumers can trust it | `int_purchases` has none, so coverage is below the 100 % target |
| `fct_missing_primary_key_tests`, test coverage | every model needs a tested primary key (`unique` + `not_null`, or `unique_combination_of_columns`) | `stg_customers`, `stg_products`, `int_purchases`; test coverage below 100 % |
| `fct_model_directories` | staging models live in a folder per source: `staging/<source>/` | `stg_events` sits directly in `staging/` |
| `fct_source_directories` | a source’s YAML lives in that source’s staging folder | `_sources.yml` is one level too high |
| `fct_root_models` | a model with no parents usually hides a hard-coded table name | `dim_date`: generated, no parent |
| `fct_sources_without_freshness` | sources should declare how late data may be | `shop_raw.events` has no freshness |

> **On the job:** In review, the evaluator’s rule names become shared vocabulary: “this is a root model”, “direct join to source”, “staging depends on staging”. Learn the dozen most common rules (cheat sheet); interviewers ask the same thing in plain words: “how would you spot a model that joins a raw source directly?”.

> **The main idea:** read each warning’s table, then decide per row: fix the project, or record a justified exception.

*Read more:* [evaluator rules](https://dbt-labs.github.io/dbt-project-evaluator/latest/rules/), [Testing rules](https://dbt-labs.github.io/dbt-project-evaluator/latest/rules/testing/), [Structure rules](https://dbt-labs.github.io/dbt-project-evaluator/latest/rules/structure/).

---

<a id="slide-15"></a>
## 15. Fixing the findings: folders, descriptions and primary-key tests

*Part C · how do I fix each finding, and what does a fix break?*

#### 1. Move the files the structure rules name

Each structure finding names the target path (`change_file_path_to`). Move `stg_events.sql` and the source YAML into `models/staging/shop_raw/`, run again, and a *new* rule fires:

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator
33 of 78 WARN 1 valid_documentation_coverage ................................... [WARN 1 in x.xxs]
35 of 78 WARN 1 is_empty_fct_sources_without_freshness_ ........................ [WARN 1 in x.xxs]
37 of 78 WARN 1 is_empty_fct_undocumented_models_ .............................. [WARN 1 in x.xxs]
44 of 78 WARN 4 is_empty_fct_test_directories_ ................................. [WARN 4 in x.xxs]
71 of 78 WARN 1 is_empty_fct_root_models_ ...................................... [WARN 1 in x.xxs]
77 of 78 WARN 3 is_empty_fct_missing_primary_key_tests_ ........................ [WARN 3 in x.xxs]
78 of 78 WARN 1 valid_test_coverage ............................................ [WARN 1 in x.xxs]
Done. PASS=71 WARN=7 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    q = """select distinct model_name, current_test_directory, change_test_directory_to
           from main.fct_test_directories"""
    for r in con.sql(q).fetchall():
        print(tuple(str(x).replace("\\\\", "/") for x in r))
```

Output:

```text
('stg_events', 'models/staging/', 'models/staging/shop_raw/')
```

`stg_events`’s tests are still defined in `models/staging/_staging.yml`, one folder above the model. Fixes can create findings, which is why you re-run after each batch.

#### 2. Split the YAML by folder, add descriptions and PK tests

`stg_events`’s entry moves to `models/staging/shop_raw/_shop_raw__models.yml` unchanged; the seed-based staging models get primary-key tests; the intermediate model gets a YAML file with a description and a tested key:

```yaml
# models/staging/_staging.yml
version: 2

models:
  - name: stg_customers
    description: One row per customer from the CRM seed, with a normalised customer_id.
    columns:
      - name: customer_id
        description: Primary key.
        data_tests: [unique, not_null]

  - name: stg_products
    description: One row per product from the catalogue seed.
    columns:
      - name: product_id
        description: Primary key.
        data_tests: [unique, not_null]
```

```yaml
# models/intermediate/_intermediate.yml
version: 2

models:
  - name: int_purchases
    description: Purchase events that count as orders (parseable amount). One row per order_id. Ephemeral.
    columns:
      - name: order_id
        description: Primary key; the purchase event_id.
        data_tests: [unique, not_null]
```

#### The project tree after the fixes

```python
import os
for root, dirs, files in sorted(os.walk("models")):
    for f in sorted(files):
        print(os.path.join(root, f).replace(os.sep, "/"))
```

Output:

```text
models/docs.md
models/intermediate/_intermediate.yml
models/intermediate/int_purchases.sql
models/marts/_marts.yml
models/marts/dim_customer.sql
models/marts/dim_date.sql
models/marts/dim_product.sql
models/marts/fct_daily_funnel.sql
models/marts/fct_daily_product_sales.sql
models/marts/fct_orders.sql
models/staging/_staging.yml
models/staging/stg_customers.sql
models/staging/stg_products.sql
models/staging/shop_raw/_shop_raw__models.yml
models/staging/shop_raw/_shop_raw__sources.yml
models/staging/shop_raw/stg_events.sql
```

#### Rebuild, then re-run the evaluator

Terminal (output trimmed):

```text
$ dbt build --exclude package:dbt_project_evaluator
Done. PASS=55 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=56
```

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator
37 of 78 WARN 1 is_empty_fct_sources_without_freshness_ ........................ [WARN 1 in x.xxs]
71 of 78 WARN 1 is_empty_fct_root_models_ ...................................... [WARN 1 in x.xxs]
Done. PASS=76 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

Six of eight warnings are gone. The two left are `fct_root_models` (dim_date) and `fct_sources_without_freshness`: next lesson decides whether to fix them or record exceptions.

> **On the job:** Moving files is safe in dbt: models are identified by name, not path, so `ref()` calls do not change. The `<source>` folder convention matters as projects grow to dozens of sources: a newcomer finds every model for Stripe under `staging/stripe/`. Tests on ephemeral models such as `int_purchases` work because dbt inlines the model into the test query.

> **The main idea:** fix findings in small batches and re-run after each: folder moves are safe for ref(), and every model gets a description and a tested primary key.

*Read more:* [evaluator rules](https://dbt-labs.github.io/dbt-project-evaluator/latest/rules/), [How we structure: staging](https://docs.getdbt.com/best-practices/how-we-structure/2-staging).

---

<a id="slide-16"></a>
## 16. Exceptions, zero findings, and a CI gate

*Part C · when is “break the rule” the right answer, and how do I keep zero?*

Some findings are correct by design. `dim_date` is generated by `date_spine`, so it has no parent; the lab’s raw files are static, so a freshness check would always fail. The package reads a seed named **dbt_project_evaluator_exceptions** with one row per accepted finding: the rule table, the column to match, the value (or a `like` pattern such as `stg_%_unioned`) and a **comment** saying why.

#### The exceptions seed and the project config

```csv
# seeds/dbt_project_evaluator_exceptions.csv
fct_name,column_name,id_to_exclude,comment
fct_root_models,child,dim_date,Generated calendar from dbt_utils.date_spine: no parent by design
fct_sources_without_freshness,resource_name,shop_raw.events,Static fixture files in the lab: freshness would always fail
```

```diff
--- a/dbt_project.yml
+++ b/dbt_project.yml
@@ -34,0 +35,7 @@
+  dbt_project_evaluator:              # use our exceptions seed instead of the package's empty one
+    dbt_project_evaluator_exceptions:
+      +enabled: false
+
+data_tests:
+  dbt_project_evaluator:              # warn locally; CI sets the variable to error
+    +severity: "{{ env_var('DBT_PROJECT_EVALUATOR_SEVERITY', 'warn') }}"
```

Only one seed with that name may exist, so the package’s empty one is disabled. The `data_tests` block makes every evaluator test’s severity come from an environment variable.

#### Zero findings, then the same run as a CI gate

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions
12 of 78 START seed file main_seeds.dbt_project_evaluator_exceptions ........... [RUN]
12 of 78 OK loaded seed file main_seeds.dbt_project_evaluator_exceptions ....... [INSERT 2 in x.xxs]
Done. PASS=78 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

Terminal (output trimmed):

```text
$ $env:DBT_PROJECT_EVALUATOR_SEVERITY = "error"; dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions
Done. PASS=78 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

With severity `error` any new finding fails the build (exit code 1), so a pull request that adds an undocumented model cannot merge. Exercise 7 shows that failure.

- **Fix, don’t except,** when the rule is right: an exception for a missing test is just a hidden missing test.
- **Coverage rules cannot be excepted per model;** change their targets with project variables (for example `documentation_coverage_target`) only if the team agrees.
- **Freshness in production:** real sources should declare `freshness` with `loaded_at_field` and be checked with `dbt source freshness`; the exception here is for fixture data only.

> **On the job:** In CI the evaluator runs after the project build: `dbt build --select state:modified+ --exclude package:dbt_project_evaluator`, then `dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions` with severity error. Every exception row is reviewed like code, and its comment is the reason a reviewer accepts it.

> **The main idea:** fix what the rule is right about, record the rest as commented exceptions, and run the evaluator with severity error in CI so zero stays zero.

*Read more:* [Configuring exceptions](https://dbt-labs.github.io/dbt-project-evaluator/latest/customization/exceptions/), [Running the evaluator as a CI check](https://dbt-labs.github.io/dbt-project-evaluator/latest/ci-check/), [Source freshness](https://docs.getdbt.com/reference/resource-properties/freshness).

---

<a id="slide-17"></a>
## 17. SQLFluff: a linter that understands SQL, dialects and templates

*Part D · what is SQLFluff, and how can it read SQL full of Jinja?*

A **linter** reads code without running it and reports breaches of style rules; a **formatter/fixer** rewrites the code to obey them. **SQLFluff** is the standard SQL linter in dbt projects: it parses SQL in a chosen **dialect** (duckdb, snowflake, tsql, bigquery, …), checks 79 **rules** (in version 4.4.0), and fixes most breaches with `sqlfluff fix`. Coming from C#: it is the Roslyn analyzers plus `dotnet format`, driven by an `.editorconfig`-like file named `.sqlfluff`.

#### Installed version and the rules you will meet

Terminal:

```text
$ sqlfluff --version
python -m sqlfluff, version 4.4.0
```

Terminal (only the rules met in this deck; first line of each):

```text
$ sqlfluff rules
AL03: [aliasing.expression] Column expression without alias. Use explicit `AS`
AM06: [ambiguous.column_references] Inconsistent column references in 'GROUP
CP01: [capitalisation.keywords] Inconsistent capitalisation of keywords.
LT01: [layout.spacing] Inappropriate Spacing.
LT02: [layout.indent] Incorrect Indentation.
LT05: [layout.long_lines] Line is too long.
LT09: [layout.select_targets] Select targets should be on a new line unless
ST06: [structure.column_order] Select wildcards then simple targets before
```

Every rule has a code (`LT05`) and a name (`layout.long_lines`); groups are LT layout, CP capitalisation, AL aliasing, AM ambiguous, ST structure, RF references, CV convention.

#### Templaters: how SQLFluff sees Jinja

dbt models are templates, so SQLFluff must render them before parsing. A **templater** does that rendering:

| Templater | How it renders | Trade-off |
|---|---|---|
| `dbt` (plugin `sqlfluff-templater-dbt`) | asks dbt to compile the project, exactly as `dbt compile` would | accurate (packages, `ref`, `var`, macros); slower; needs a working profile and dbt installed |
| `jinja` (built in) | renders Jinja itself; `apply_dbt_builtins` fakes `ref`, `source`, `config`, `var` | fast and needs no database; package macros such as `dbt_utils.*` are undefined unless you provide stubs |
| `raw`, `placeholder`, `python` | no rendering / parameter placeholders / Python format strings | for non-dbt SQL |

This deck uses the `dbt` templater (lesson 20 measures the speed difference). The rules are applied to the rendered SQL, and fixes are mapped back to your source file; code produced inside a macro is not changed.

> **On the job:** Teams add SQLFluff when reviews keep repeating “trailing comma”, “lower-case keywords”, “alias this column”. After that, style comments disappear from pull requests: the linter runs locally and in CI, and the review is about logic. The *Query structure: recursion and clean SQL* deck explains the style choices; this part makes a machine enforce them.

> **The main idea:** SQLFluff parses SQL in your dialect, renders dbt’s Jinja through a templater, and reports or fixes rule breaches; the dbt templater is accurate, the jinja templater is fast.

*Read more:* [SQLFluff docs](https://docs.sqlfluff.com/en/stable/), [SQLFluff rules reference](https://docs.sqlfluff.com/en/stable/reference/rules.html), [SQLFluff dbt templater](https://docs.sqlfluff.com/en/stable/configuration/templating/dbt.html).

---

<a id="slide-18"></a>
## 18. The dbt style config (.sqlfluff) and the first lint

*Part D · how do I configure SQLFluff the way dbt Labs does, and what does it find?*

#### .sqlfluff: dbt Labs’ “dbtonic” rules, plus dialect and paths

```ini
# .sqlfluff
[sqlfluff]
dialect = duckdb
templater = dbt
runaway_limit = 10
max_line_length = 80
indent_unit = space

[sqlfluff:templater:dbt]
project_dir = .
profiles_dir = .

[sqlfluff:indentation]
tab_space_size = 4

[sqlfluff:layout:type:comma]
spacing_before = touch
line_position = trailing

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = lower

[sqlfluff:rules:aliasing.table]
aliasing = explicit

[sqlfluff:rules:aliasing.column]
aliasing = explicit

[sqlfluff:rules:aliasing.expression]
allow_scalar = False

[sqlfluff:rules:capitalisation.identifiers]
extended_capitalisation_policy = lower

[sqlfluff:rules:capitalisation.functions]
capitalisation_policy = lower

[sqlfluff:rules:capitalisation.literals]
capitalisation_policy = lower

[sqlfluff:rules:ambiguous.column_references]
group_by_and_order_by_style = implicit
```

Everything below `[sqlfluff:indentation]` is the config dbt Labs publishes for its own projects (lower-case keywords, functions and literals; trailing commas; explicit aliases; 80-character lines; 4-space indents; positional `group by 1, 2`). Added for this project: the `duckdb` dialect and where the dbt project and `profiles.yml` are.

```text
# .sqlfluffignore
target/
dbt_packages/
logs/
```

#### Lint one model, then the whole project

Terminal:

```text
$ sqlfluff lint models/marts/fct_orders.sql
=== [dbt templater] Sorting Nodes...
=== [dbt templater] Compiling dbt project...
=== [dbt templater] Project Compiled.
== [models\marts\fct_orders.sql] FAIL
L:   2 | P:   1 | LT05 | Line is too long (90 > 80). [layout.long_lines]
L:  11 | P:   5 | LT09 | Select targets should be on a new line unless there is
                       | only one select target. [layout.select_targets]
L:  17 | P:   5 | LT09 | Select targets should be on a new line unless there is
                       | only one select target. [layout.select_targets]
L:  24 | P:   5 | LT05 | Line is too long (103 > 80). [layout.long_lines]
L:  25 | P:   5 | LT05 | Line is too long (100 > 80). [layout.long_lines]
L:  30 | P:  19 | LT01 | Expected only single space before 'on' keyword. Found '
                       | '. [layout.spacing]
L:  30 | P:  44 | LT01 | Expected only single space before raw comparison
                       | operator '='. Found '  '. [layout.spacing]
All Finished!
[exit code 1]
```

Each line is `L`ine, `P`osition, rule code and message. `sqlfluff lint` exits 1 when anything fails, which is what CI needs. The JSON format is easier to summarise:

```python
import json, subprocess, sys
from collections import Counter

p = subprocess.run([sys.executable, "-m", "sqlfluff", "lint", "models", "tests", "--format", "json"],
                   capture_output=True, text=True)
files = json.loads(p.stdout)
by_rule = Counter(v["code"] for f in files for v in f["violations"])
failing = sum(1 for f in files if f["violations"])
print(f"exit code {p.returncode}; {failing} of {len(files)} files fail; {sum(by_rule.values())} violations")
for code, n in by_rule.most_common():
    print(f"  {code}: {n}")
```

Output:

```text
exit code 1; 11 of 12 files fail; 41 violations
  LT01: 13
  LT05: 10
  LT09: 6
  LT02: 5
  AL03: 4
  ST06: 2
  AM06: 1
```

- **LT01** is the aligned `as` columns from earlier decks: dbt style uses one space, not alignment.
- **LT09** wants one select target per line; **LT02** wants consistent indentation; **LT05** is any line over 80 characters, comments included.
- **AL03** flags expressions without an alias (the unknown-member row in `dim_product`); **AM06** flags `group by` by name where the config asks for positions; **ST06** wants simple columns before calculations.

> **On the job:** Adopting a linter on an existing project always starts like this: dozens of violations in files nobody is changing. Teams run one big `sqlfluff fix` in its own pull request (with an output comparison, lesson 20), then lint only changed files in CI from that day on.

> **The main idea:** copy dbt Labs’ .sqlfluff, set your dialect and project paths, ignore generated folders, and expect a long first report.

*Read more:* [dbt: lint and format (dbtonic .sqlfluff)](https://docs.getdbt.com/docs/platform/studio-ide/lint-format), [SQLFluff configuration files](https://docs.sqlfluff.com/en/stable/configuration/setting_configuration.html), [How we style our SQL](https://docs.getdbt.com/best-practices/how-we-style/2-how-we-style-our-sql).

---

<a id="slide-19"></a>
## 19. sqlfluff fix: what it changes, and what it cannot

*Part D · can I let the tool rewrite my SQL?*

#### First, read what a rule would do

In a scratch copy, `sqlfluff fix` on `stg_customers` with every rule enabled moves the primary key to the *end* of the select list (ST06: simple columns before calculations):

```diff
--- a/models/staging/stg_customers.sql
+++ b/models/staging/stg_customers.sql
@@ -1,7 +1,7 @@
 -- stg_customers: one row per customer, from the CRM seed.
 select
-    lower(trim(customer_id)) as customer_id,
     customer_name,
     city,
-    signup_date
+    signup_date,
+    lower(trim(customer_id)) as customer_id
 from {{ ref('customers') }}
```

That breaks the dbt style guide’s “keys first” convention and changes the column order every consumer sees. A config decision, written down with its reason, settles it:

```diff
--- a/.sqlfluff
+++ b/.sqlfluff
@@ -6,2 +6,4 @@
 indent_unit = space
+# keep keys first (dbt style guide); ST06 would move computed keys to the end
+exclude_rules = structure.column_order
 
```

#### Then fix the whole project

Terminal (output trimmed):

```text
$ sqlfluff fix models tests
==== finding fixable violations ====
== [models\intermediate\int_purchases.sql] FIXED
== [models\marts\dim_customer.sql] FIXED
== [models\marts\dim_product.sql] FIXED
== [models\marts\fct_daily_funnel.sql] FIXED
== [models\marts\fct_daily_product_sales.sql] FIXED
== [models\marts\fct_orders.sql] FIXED
== [models\staging\shop_raw\stg_events.sql] FIXED
== [tests\assert_no_unparseable_amounts.sql] FIXED
30 fixable linting violations found
  [9 unfixable linting violations found]
[exit code 1]
```

```diff
--- a/models/marts/fct_orders.sql
+++ b/models/marts/fct_orders.sql
@@ -10,3 +10,6 @@
 
-    select customer_key, customer_id from {{ ref('dim_customer') }}
+    select
+        customer_key,
+        customer_id
+    from {{ ref('dim_customer') }}
 
@@ -16,3 +19,6 @@
 
-    select product_key, product_id from {{ ref('dim_product') }}
+    select
+        product_key,
+        product_id
+    from {{ ref('dim_product') }}
 
@@ -23,4 +29,8 @@
     cast(strftime(purchases.order_date_utc, '%Y%m%d') as integer) as date_key,
-    coalesce(customers.customer_key, {{ dbt_utils.generate_surrogate_key(["'-1'"]) }}) as customer_key,
-    coalesce(products.product_key, {{ dbt_utils.generate_surrogate_key(["'-1'"]) }}) as product_key,
+    coalesce(
+        customers.customer_key, {{ dbt_utils.generate_surrogate_key(["'-1'"]) }}
+    ) as customer_key,
+    coalesce(
+        products.product_key, {{ dbt_utils.generate_surrogate_key(["'-1'"]) }}
+    ) as product_key,
     purchases.ordered_at_utc,
@@ -29,2 +39,2 @@
 left join customers on purchases.customer_id = customers.customer_id
-left join products  on purchases.product_id  = products.product_id
+left join products on purchases.product_id = products.product_id
```

The joins lost their alignment spaces, the one-line CTE selects became one column per line, and the long `coalesce` lines were wrapped.

#### What is left: rules fix cannot apply

Terminal (output trimmed):

```text
$ sqlfluff lint models tests
== [models\marts\dim_date.sql] FAIL
L:   2 | P:   1 | LT05 | Line is too long (86 > 80). [layout.long_lines]
== [models\marts\dim_product.sql] FAIL
L:  18 | P:   9 | AL03 | Column expression without alias. Use explicit `AS`
                       | clause. [aliasing.expression]
L:  19 | P:   9 | AL03 | Column expression without alias. Use explicit `AS`
                       | clause. [aliasing.expression]
L:  20 | P:   9 | AL03 | Column expression without alias. Use explicit `AS`
                       | clause. [aliasing.expression]
L:  21 | P:   9 | AL03 | Column expression without alias. Use explicit `AS`
                       | clause. [aliasing.expression]
== [models\marts\fct_daily_funnel.sql] FAIL
L:   3 | P:   1 | LT05 | Line is too long (84 > 80). [layout.long_lines]
== [models\marts\fct_daily_product_sales.sql] FAIL
L:  17 | P:   1 | AM06 | Inconsistent column references in 'GROUP BY/ORDER BY'
                       | clauses. [ambiguous.column_references]
== [models\marts\fct_orders.sql] FAIL
L:   2 | P:   1 | LT05 | Line is too long (90 > 80). [layout.long_lines]
== [tests\assert_no_unparseable_amounts.sql] FAIL
L:   2 | P:   1 | LT05 | Line is too long (85 > 80). [layout.long_lines]
All Finished!
[exit code 1]
```

#### Why these are “unfixable”

- **LT05 on comments:** SQLFluff will not reword your prose; wrap the comment yourself.
- **AL03:** it cannot invent a name for `'-1'`; you decide it is `product_id`.
- **AM06:** changing `group by date_key, product_key` to positions needs a human to check which positions.
- Templated loops are re-indented as rendered SQL, which can look odd in the source (look at `fct_daily_funnel`): always read the diff before committing.

> **On the job:** `sqlfluff fix` is safe for layout and capitalisation, which is most of what it changes, but it edits many files at once. Run it on a clean Git working tree, read `git diff`, rebuild, compare outputs, and commit the formatting separately from logic changes so reviewers can trust both.

> **The main idea:** let sqlfluff fix layout, but read the diff, disable rules that fight your conventions in .sqlfluff with a reason, and fix the rest by hand.

*Read more:* [SQLFluff rules reference](https://docs.sqlfluff.com/en/stable/reference/rules.html), [Ignoring errors and files](https://docs.sqlfluff.com/en/stable/configuration/ignoring_configuration.html).

---

<a id="slide-20"></a>
## 20. Lint clean, prove nothing changed, and wire it into CI

*Part D · how do I finish, and keep it clean?*

#### Fix the rest by hand

```diff
--- a/models/marts/dim_product.sql
+++ b/models/marts/dim_product.sql
@@ -18,4 +18,4 @@
-        '-1',
-        'Unknown product',
-        'Unknown',
-        cast(null as decimal(10, 2))
+        '-1' as product_id,
+        'Unknown product' as product_name,
+        'Unknown' as category,
+        cast(null as decimal(10, 2)) as list_price
```

```diff
--- a/models/marts/fct_daily_product_sales.sql
+++ b/models/marts/fct_daily_product_sales.sql
@@ -17 +17 @@
-group by date_key, product_key
+group by 2, 3
```

The four long comment lines are wrapped onto two lines each. `group by 2, 3` follows the config’s positional style; the key in position 1 is computed from those two columns, so it needs no grouping of its own.

Terminal (output trimmed):

```text
$ sqlfluff lint models tests
=== [dbt templater] Sorting Nodes...
=== [dbt templater] Compiling dbt project...
=== [dbt templater] Project Compiled.
All Finished!
```

#### Prove the formatting changed no data

Terminal (output trimmed):

```text
$ dbt build --exclude package:dbt_project_evaluator
Done. PASS=56 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=57
```

```python
diffs = [compare(m) for m in ["dim_customer", "dim_product", "dim_date", "fct_orders"]]
diffs.append(compare("fct_daily_funnel", cols=old_cols))
assert sum(diffs) == 0
```

Output:

```text
dim_customer      only in old: 0   only in new: 0
dim_product       only in old: 0   only in new: 0
dim_date          only in old: 0   only in new: 0
fct_orders        only in old: 0   only in new: 0
fct_daily_funnel  only in old: 0   only in new: 0
```

Every mart saved in lesson 2 is still identical row for row, after new keys, a date spine, a new column, file moves and a project-wide `sqlfluff fix`. That is the evidence a reviewer needs to approve a large formatting change.

#### dbt templater or jinja templater?

```python
import subprocess, sys, time

def lint(*extra):
    t = time.perf_counter()
    p = subprocess.run([sys.executable, "-m", "sqlfluff", "lint", "models", *extra], capture_output=True, text=True)
    return p, time.perf_counter() - t

p_dbt, s_dbt = lint()
p_jinja, s_jinja = lint("--templater", "jinja")
print(f"dbt templater:   exit {p_dbt.returncode}, {s_dbt:.1f} s")
print(f"jinja templater: exit {p_jinja.returncode}, {s_jinja:.1f} s")
tmp = [line for line in p_jinja.stdout.splitlines() if "TMP" in line]
print(len(tmp), "templating errors, for example:")
print([line for line in tmp if "dbt_utils" in line][0])
```

Output (timings measured on the build machine):

```text
dbt templater:   exit 0, 18.1 s
jinja templater: exit 1, 2.7 s
8 templating errors, for example:
L:  38 | P:   8 |  TMP | Undefined jinja template variable: 'dbt_utils'
```

The jinja templater is faster but does not know `dbt_utils`, so it reports a templating error (`TMP`) wherever a package macro is called. Stick with the dbt templater, or provide stub macros through the jinja templater’s `library_path` if lint speed matters more than accuracy.

#### Keep it clean: pre-commit and CI

```yaml
# .pre-commit-config.yaml (shown, not executed in this build)
repos:
  - repo: local                      # use the SQLFluff in the project's environment
    hooks:
      - id: sqlfluff-lint
        name: sqlfluff lint
        entry: sqlfluff lint
        language: system
        files: ^models/.*\.sql$
```

pre-commit itself is taught and executed in *Python quality and tooling*; this hook is the SQL equivalent of its Ruff hook. In CI, lint only the changed files to stay fast, for example `git diff --name-only origin/main -- "models/*.sql" | xargs sqlfluff lint`; the lab’s gate lints everything because the project is small.

> **On the job:** “My SQL passes SQLFluff with the dbt style config” is now a command with exit code 0. In interviews, describe the whole loop: shared .sqlfluff, one formatting pull request with an output comparison, then lint on every pull request, with exclusions documented in the config.

> **The main idea:** finish by hand, prove the data did not change, and run the linter on every change so the codebase stays clean.

*Read more:* [SQLFluff jinja templater](https://docs.sqlfluff.com/en/stable/configuration/templating/jinja.html), [SQLFluff with pre-commit](https://docs.sqlfluff.com/en/stable/production/pre_commit.html), [How we style our SQL](https://docs.getdbt.com/best-practices/how-we-style/2-how-we-style-our-sql).

---

<a id="slide-21"></a>
## 21. Lab: the Leafy quality gate, from the dbt Jinja and macros project to zero findings

*Lab · an hour or two, offline after dbt deps*

**Goal:** take the finished project of *dbt Jinja and macros* to the quality bar of lesson 3, then prove it with one command. The reference solution is [dbt-packages-quality-lab/](dbt-packages-quality-lab/README.md) next to this deck; its README lists the steps and expected results.

#### Steps (lessons in brackets)

1. Copy `dbt-jinja-macros-project` to a short path; build; save the marts to `legacy` (2).
2. Add `packages.yml`, run `dbt deps`, commit the lock file (4–5).
3. Swap every `md5()` key for `generate_surrogate_key`; add `fct_daily_product_sales` with a composite key; prove nothing changed (6–7).
4. Use `date_spine` in `dim_date`; generate YAML with codegen; add descriptions and grain tests (8–10).
5. Write `safe_divide` with defaults and the generic test `row_count_between` (11–12).
6. Run the evaluator; fix every finding; record the two justified exceptions (13–16).
7. Add `.sqlfluff`; lint, fix, finish by hand; prove the marts unchanged (17–20).
8. Write `scripts/quality_gate.py` and run it until it prints `QUALITY GATE: PASS`.

| Check | Expected |
|---|---|
| project build | ERROR=0, one expected warning (event e7) |
| evaluator, severity error | WARN=0, ERROR=0 |
| `sqlfluff lint models tests` | exit code 0 |
| saved marts vs new | 0 rows differ, both directions |
| `quality_gate.py` | exit code 0 |

#### The gate script, and its run on the exported lab

```python
# scripts/quality_gate.py
"""quality_gate.py: every check of the lab, in order. Exit code 0 only if all pass.
Run from the project folder with the virtual environment active:  python scripts/quality_gate.py"""
import os
import subprocess
import sys

STEPS = [
    ("install packages (lock file)", ["dbt", "deps"]),
    ("load raw data", [sys.executable, "scripts/load_raw.py"]),
    ("build and test the project", ["dbt", "build", "--exclude", "package:dbt_project_evaluator"]),
    ("project evaluator, severity error", ["dbt", "build", "--select",
                                           "package:dbt_project_evaluator", "dbt_project_evaluator_exceptions"]),
    ("SQLFluff lint (dbt style config)", [sys.executable, "-m", "sqlfluff", "lint", "models", "tests"]),
]


def main():
    env = dict(os.environ, DBT_PROJECT_EVALUATOR_SEVERITY="error", DBT_PROFILES_DIR=os.getcwd())
    for name, cmd in STEPS:
        p = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(f"{'PASS' if p.returncode == 0 else 'FAIL'}  {name}")
        if p.returncode != 0:
            print((p.stdout + p.stderr)[-3000:])
            print("QUALITY GATE: FAIL")
            return 1                       # later steps depend on earlier ones
    print("QUALITY GATE: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Terminal:

```text
$ python scripts/quality_gate.py      # in a fresh copy of dbt-packages-quality-lab/
PASS  install packages (lock file)
PASS  load raw data
PASS  build and test the project
PASS  project evaluator, severity error
PASS  SQLFluff lint (dbt style config)
QUALITY GATE: PASS
```

The build exported the project to `dbt-packages-quality-lab/` (without `dbt_packages/`, `target/` or the database), copied it to a new short folder and ran the gate there, so the lab is proved to work from a clean checkout.

#### What the lab folder contains

```python
import os
skip = {"dbt_packages", "target", "logs"}
for root, dirs, files in os.walk("."):
    dirs[:] = sorted(d for d in dirs if d not in skip)
    depth = root.count(os.sep)
    if depth <= 3:
        for f in sorted(files):
            if not f.endswith((".duckdb", ".wal", ".yml.bak")) and f != ".user.yml":
                print(os.path.join(root, f)[2:].replace(os.sep, "/"))
```

Output:

```text
.gitignore
.sqlfluff
.sqlfluffignore
README.md
dbt_project.yml
package-lock.yml
packages.yml
profiles.yml
data/raw/events_2026-03-02.jsonl
data/raw/events_2026-03-03.jsonl
data/raw/events_2026-03-04.jsonl
macros/_macros.yml
macros/safe_divide.sql
macros/to_utc.sql
models/docs.md
models/intermediate/_intermediate.yml
models/intermediate/int_purchases.sql
models/marts/_marts.yml
models/marts/dim_customer.sql
models/marts/dim_date.sql
models/marts/dim_product.sql
models/marts/fct_daily_funnel.sql
models/marts/fct_daily_product_sales.sql
models/marts/fct_orders.sql
models/staging/_staging.yml
models/staging/stg_customers.sql
models/staging/stg_products.sql
models/staging/shop_raw/_shop_raw__models.yml
models/staging/shop_raw/_shop_raw__sources.yml
models/staging/shop_raw/stg_events.sql
scripts/load_raw.py
scripts/quality_gate.py
seeds/_seeds.yml
seeds/customers.csv
seeds/dbt_project_evaluator_exceptions.csv
seeds/products.csv
tests/assert_no_unparseable_amounts.sql
tests/generic/row_count_between.sql
```

#### Stretch and portfolio

- Make the gate lint only files changed since `main` (Git) and time both versions.
- Turn on `DBT_PROJECT_EVALUATOR_SEVERITY=error` and add an undocumented model: watch the gate fail at step 4, then fix it (exercise 7).
- **In your portfolio:** Fuel Smart’s first release gets the same gate from day one: dbt_utils keys for `fct_recipe_ingredient` (recipe, line) and `fct_food_nutrient` (food, nutrient), codegen for the USDA and Food.com sources, zero evaluator findings and lint-clean SQL. Put the gate’s output in the README: reviewers of a portfolio read it first.

> **The main idea:** a quality gate is a script of commands with exit codes; run it on a fresh copy of the project to prove the whole lab, not just your working folder.

*Read more:* [SQLFluff docs](https://docs.sqlfluff.com/en/stable/), [Evaluator as a CI check](https://dbt-labs.github.io/dbt-project-evaluator/latest/ci-check/).

---

<a id="slide-22"></a>
## 22. Bug clinic: what goes wrong with packages, macros, the evaluator and SQLFluff

*Practice · believable bugs, their symptoms, and the fix*

#### 1. Packages listed in two files

Terminal (output trimmed):

```text
$ dbt deps        # packages.yml and dependencies.yml both list packages
Runtime Error
  The 'packages' key cannot be specified in both packages.yml and dependencies.yml
[exit code 2]
```

**Fix:** keep one file. Use `packages.yml` if any entry needs Jinja (an `env_var` token); otherwise `dependencies.yml` is fine.

#### 2. codegen on DuckDB without table names

Terminal (output trimmed):

```text
$ dbt --quiet run-operation codegen.generate_source --args '{"schema_name": "raw"}'
[ERROR]: Encountered an error while running operation: Runtime Error
  Catalog Error: Table with name "information_schema.tables" does not exist because schema "information_schema" does not exist.
  LINE 17:         from leafy.information_schema.tables
                        ^
[exit code 1]
```

**Fix:** pass `"table_names": ["events"]` (lesson 9). The default lookup assumes every database has an `information_schema` inside it.

#### 3. Column names not quoted in a key

Terminal:

```text
$ dbt --quiet compile --inline "select {{ dbt_utils.generate_surrogate_key([customer_id]) }}"
select md5(cast(coalesce(cast( as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT))
```

**Symptom:** compile *succeeds* and produces `cast( as TEXT)`: Jinja treats `customer_id` as an undefined variable and renders it as nothing. The warehouse fails later with a syntax error. **Fix:** `['customer_id']`, strings inside the list.

#### 4. date_spine’s end is exclusive

Terminal:

```text
$ dbt show `
    --inline "select count(*) … from ({{ dbt_utils.date_spine('day', '2026-03-01', '2026-03-07') }})"
| days |           first_day |            last_day |
| ---- | ------------------- | ------------------- |
|    6 | 2026-03-01 00:00:00 | 2026-03-06 00:00:00 |
```

Asked for 1–7 March, got 6 days ending on 6 March. **Fix:** pass the day *after* the last one (lesson 8), and test the row count of a calendar.

#### More you will meet

| Symptom | Cause | Fix |
|---|---|---|
| `dbt expects 3 package(s) … Run "dbt deps"` | `dbt deps` never ran (fresh clone, CI) | run `dbt deps` first in every job (exercise 8) |
| CI builds differently from your laptop | `package-lock.yml` not committed, so CI resolved a newer release | commit the lock; upgrade on purpose |
| `dbt deps`: `FileNotFoundError … dbt_project_evaluator` on Windows | path longer than 260 characters (seen while preparing this deck) | short project path or long paths enabled (lesson 5) |
| A new evaluator finding after moving a file | tests still defined in the old folder’s YAML | move the YAML entry with the model (lesson 15) |
| An exception that silences a real problem | exception rows without review | every row has a comment; review it like code |
| `sqlfluff fix` moved key columns | ST06 (column order) enabled | exclude the rule in `.sqlfluff` with a reason (lesson 19) |
| SQLFluff: `TMP` undefined `dbt_utils` | jinja templater does not load packages | dbt templater, or stubs (lesson 20) |
| `dbt_utils.surrogate_key` not found | removed in dbt_utils 1.0 | `generate_surrogate_key` (keys change: compare outputs) |

> **The main idea:** most package problems are installation and version problems; most macro bugs are quoting; most evaluator and lint surprises come from moving files and rules nobody configured.

---

<a id="slide-23"></a>
## 23. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

<details><summary>“How do you add a package to a dbt project, and how do you make sure CI uses the same version?” · checks: packages.yml, ranges, dbt deps, lock file</summary>

**Model answer (about 60 s):** I list it in `packages.yml` with a minor-version range, for example dbt_utils `[">=1.4.0", "<1.5.0"]`, run `dbt deps`, and commit both `packages.yml` and the generated `package-lock.yml`, which records the exact versions. `dbt_packages/` is git-ignored. CI runs `dbt deps` first, so it installs the locked versions. Upgrades are deliberate: `dbt deps --upgrade` in its own pull request with a full build.

**Likely follow-up:** “packages.yml or dependencies.yml?” → dependencies.yml also holds cross-project dependencies but is not rendered with Jinja; private packages that need an `env_var` token stay in packages.yml; never list packages in both.

</details>

<details><summary>“Build a surrogate key for a table at the grain (order_date, product_id). Why not md5 of the concatenation?” · checks: generate_surrogate_key, NULLs, separators</summary>

**Model answer (about 60 s):** `{{ dbt_utils.generate_surrogate_key(['order_date', 'product_id']) }}`, column names as strings in grain order. A plain `md5(a || b)` collides when values shift across the boundary (`ab|c` vs `a|bc`) and returns NULL if any part is NULL. The macro casts each part to text, replaces NULL with a marker, joins with a separator and hashes. I test the key with `unique` + `not_null` and the grain with `unique_combination_of_columns`.

**Likely follow-up:** “You change the key formula in production. What breaks?” → every key value; incremental models and snapshots that stored old keys, and any downstream join. Treat it as a migration with an output comparison and full refreshes.

</details>

<details><summary>“Write a macro with a default argument. How is it called?” · checks: macro syntax, defaults, keyword args, strings</summary>

**Model answer (about 60 s):** `{% macro safe_divide(numerator, denominator, decimals=2, on_zero="null") %}` returning a `case when` that checks the denominator for 0 or NULL. Callers write `{{ safe_divide('revenue', 'orders') }}` or `{{ safe_divide('revenue', 'orders', decimals=4) }}`; the arguments are SQL text. I parenthesise every argument inside the macro, document it in `macros/_macros.yml`, and check the output with `dbt compile`.

**Likely follow-up:** “How do you reject a bad argument?” → `{{ exceptions.raise_compiler_error("…") }}` inside an `if`, so the error appears at compile time (exercise 4).

</details>

<details><summary>“Write a custom generic test.” · checks: test block, model/column_name, failing rows</summary>

**Model answer (about 60 s):** A generic test is a macro in `tests/generic/` declared with `{% test name(model, column_name, …) %}`. Its query returns the failing rows; zero rows is a pass. For example `row_count_between(model, min_rows=1, max_rows=none)` selects the row count when it is out of range. I attach it in YAML under `data_tests` with `arguments:`, and tune it with `severity` or `where`.

**Likely follow-up:** “Generic or singular test?” → singular for a one-off query on one model; generic when the rule applies to many models or columns.

</details>

<details><summary>“How do you keep a growing dbt project consistent?” · checks: automation, not discipline</summary>

**Model answer (about 60 s):** Conventions are checked by machines in CI. dbt-project-evaluator checks structure (folders, naming), DAG rules (no direct joins to sources, no root models), documentation and primary-key tests; we fix findings or record commented exceptions in its seed, and run it with severity error in CI. SQLFluff with a shared `.sqlfluff` enforces SQL style. Plus codegen for boilerplate and pinned packages.

**Likely follow-up:** “The first evaluator run on a legacy project shows 150 findings. Now what?” → fix by rule in small batches, start with tests and docs on marts, add exceptions only with reasons, and turn on severity error once at zero.

</details>

<details><summary>“The evaluator flags a model, but you think the rule does not apply. What do you do?” · checks: judgement, exceptions seed</summary>

**Model answer (about 60 s):** First check the rule’s reason in the docs; usually the finding is right. If it is not, for example a generated date dimension with no parent, I add a row to `dbt_project_evaluator_exceptions.csv` naming the rule, column and model, with a comment explaining why, and get it reviewed. I do not disable the whole rule or lower the severity.

**Likely follow-up:** “Can you except a coverage rule for one model?” → no; coverage targets are project variables, changed only by team agreement.

</details>

<details><summary>“How do you lint dbt SQL? dbt templater or jinja templater?” · checks: SQLFluff, templaters, CI</summary>

**Model answer (about 60 s):** SQLFluff with a `.sqlfluff` at the project root: dialect, the dbt style rules, and the templater. The dbt templater compiles the project through dbt, so packages and macros render exactly; it is slower and needs a profile. The jinja templater is faster but fakes dbt’s functions and does not know package macros. I use the dbt templater, run `sqlfluff fix` once in a separate pull request with an output comparison, then lint changed files in pre-commit and CI.

**Likely follow-up:** “A rule fights your conventions.” → exclude or configure it in `.sqlfluff` with a comment, for the whole team, rather than `-- noqa` everywhere.

</details>

<details><summary>“CI fails with “dbt expects 3 package(s) … Run dbt deps”, but your laptop works. Why?” · checks: debugging installs</summary>

**Model answer (about 60 s):** CI starts from a clean checkout without `dbt_packages/`, which is git-ignored; dbt compares `packages.yml` with what is installed and stops before compiling anything. The job must run `dbt deps` before any other dbt command. If it does and versions still differ, the lock file was not committed, so CI resolved a newer version inside the range.

**Likely follow-up:** “How do you make CI faster?” → cache `dbt_packages/` keyed on the hash of `package-lock.yml`.

</details>

> **The main idea:** interviewers check that you install and pin packages deliberately, build keys and macros safely, and keep a project consistent with automated checks rather than good intentions.

---

<a id="slide-24"></a>
## 24. Exercises 1–3: lock files, composite keys, package tests

*Exercises · warm-ups: try before opening the hint*

### Exercise 1 · Predict what dbt deps does after a range change

The lock file says dbt_utils `1.4.1`. A teammate changes the dbt_utils range in `packages.yml` to `[">=1.3.0", "<1.4.0"]` and runs plain `dbt deps` (no `--upgrade`). Predict: which dbt_utils version is installed, and what happens to `package-lock.yml`? Then check in a copy of the project. Pattern: installing and pinning packages · Target time: about 8 min.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · A composite key over a pair that can be NULL

Write one query (run it with `dbt show --inline`) over `int_purchases` that returns one row per (customer_id, product_id) pair with a key `pair_key`. Event e6 has no customer. Required: one row per pair, every key distinct, **no NULL key**. Then predict how many NULL keys `md5(customer_id || product_id)` would give. Pattern: surrogate keys over a composite grain · Target time: about 10 min.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Find and fix the bug in a dbt_utils test

```yaml
# models/marts/_marts.yml (excerpt)
  - name: fct_daily_product_sales
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            columns: [date_key, product_key]
```

`dbt test --select fct_daily_product_sales` stops before running anything. What is the error, and what is the fix? Pattern: debugging package tests · Target time: about 5 min.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

---

<a id="slide-25"></a>
## 25. Exercises 4–5: your own macro and your own test

*Exercises · interview-level: write it, prove it*

### Exercise 4 · A second macro with a default, used in two models

`stg_customers` has `lower(trim(customer_id))` and `stg_products` has `upper(trim(product_id))`. Write `clean_text(column_name, case="lower")` that also turns empty strings into NULL, use it in both models (lower by default, upper by keyword), prove both staging models unchanged, and make `case="title"` fail at compile time with a clear message. Pattern: write a macro with defaults · Target time: about 15 min.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · A custom generic test meets the unknown member

Write a generic test `matches_pattern(model, column_name, pattern)` that fails for non-NULL values not matching a regular expression (DuckDB: `regexp_matches(value, pattern)`). Attach it to `dim_product.product_id` with `^P[0-9]+$`. Predict the result, explain it, and make the test pass without weakening it for real products. Pattern: write a custom generic test · Target time: about 15 min.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

---

<a id="slide-26"></a>
## 26. Exercises 6–7: lint a model, pass the evaluator

*Exercises · interview-level: style and structure*

### Exercise 6 · Predict the SQLFluff rules, then write the lint-clean version

```sql
# models/marts/fct_customer_orders.sql
SELECT c.customer_id, COUNT(*) orders, SUM(o.amount) AS Revenue
FROM {{ ref('fct_orders') }} o JOIN {{ ref('dim_customer') }} c ON o.customer_key = c.customer_key
GROUP BY c.customer_id
```

With the project’s `.sqlfluff`, predict at least five rule codes that fire on this model (look at keywords, aliases, the join, the group by, the select list). Then rewrite it so `sqlfluff lint` exits 0, in the import → logical → final CTE shape from *Query structure: recursion and clean SQL*. Pattern: enforce SQL style · Target time: about 15 min.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · A rushed model meets the evaluator in CI

```sql
# models/marts/customer_revenue.sql
-- customer_revenue: revenue per customer (written in a hurry)
select
    customers.customer_id,
    sum(try_cast(events.amount as decimal(10, 2))) as revenue
from {{ source('shop_raw', 'events') }} as events
inner join {{ ref('stg_customers') }} as customers
    on lower(trim(events.user_id)) = customers.customer_id
where events.event_type = 'purchase'
group by 1
```

A teammate adds this model with no YAML. CI runs the evaluator with severity `error`. Predict which rules fail and why, then fix the model so the evaluator passes again (do not add exceptions). Pattern: keep a project healthy; review a pull request · Target time: about 20 min.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

---

<a id="slide-27"></a>
## 27. Exercises 8–10: debug CI, choose the tool, add a source

*Exercises · debug, design, and a take-home*

### Exercise 8 · Debug: works on my laptop, fails in CI

CI checks out the repository and runs `dbt build`. It fails, while the same command works on your laptop. Reproduce it on a copy of the project without `dbt_packages/`, explain the error, and fix the CI steps. Pattern: debugging package installs · Target time: about 10 min.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Package, your own macro, or plain SQL?

For each need, choose a dbt_utils macro, your own macro, or plain SQL, and justify it in one sentence: (a) “division that returns NULL on zero” in one mart; (b) “keep the latest delivery per event_id” in five staging models; (c) “round money to 2 decimals and show 0 instead of NULL” in ten marts; (d) a 3-line expression used in one model. Check what dbt_utils already offers before answering. Pattern: explain the trade-off / choose the tool · Target time: about 10 min.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Take-home: add the reviews source, end to end

Leafy starts collecting product reviews (`data/raw/reviews.jsonl`: 5 lines with a redelivered `r2`, a NULL rating, a padded user ID and a lower-case unknown product `p9`). Land them in `raw.reviews`, generate the source YAML with codegen, write `stg_reviews` (one row per review, cleaned with `clean_text` from exercise 4 and deduplicated with dbt_utils), test it, check that every review ID in the file survives, and finish with the evaluator at zero (severity error) and a clean lint. Pattern: the take-home “add a source” task · Target time: about 45 min.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

---

<a id="slide-28"></a>
## 28. Cheat sheet

*Reference · the deck on one page*

#### Packages and generators

| Need | Write or run |
|---|---|
| add a package | `packages.yml`: `- package: dbt-labs/dbt_utils` + `version: [">=1.4.0", "<1.5.0"]` |
| install / reproduce | `dbt deps` (commit `package-lock.yml`, ignore `dbt_packages/`) |
| upgrade on purpose | `dbt deps --upgrade`; review the lock diff |
| surrogate key | `{{ dbt_utils.generate_surrogate_key(['a', 'b']) }}` |
| calendar | `dbt_utils.date_spine("day", start, end_exclusive)` |
| all columns but some | `dbt_utils.star(from=ref('m'), except=['x'])` |
| grain test | `dbt_utils.unique_combination_of_columns` + `combination_of_columns:` |
| row rule test | `dbt_utils.expression_is_true` + `expression: "amount > 0"` |
| source YAML | `dbt --quiet run-operation codegen.generate_source --args '{"schema_name": "raw", "table_names": ["t"]}'` |
| staging start | `codegen.generate_base_model` `{"source_name": "s", "table_name": "t"}` |
| model YAML | `codegen.generate_model_yaml` `{"model_names": ["m"]}` |

#### Macros, evaluator, SQLFluff

| Need | Write or run |
|---|---|
| macro with defaults | `{% macro f(col, decimals=2, on_zero="null") -%} … {%- endmacro %}` |
| keyword call | `{{ f('revenue', decimals=4) }}` |
| fail fast | `{{ exceptions.raise_compiler_error("…") }}` |
| generic test | `{% test name(model, column_name, arg=default) %} select … failing rows {% endtest %}` |
| evaluator run | `dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions` |
| normal build without it | `dbt build --exclude package:dbt_project_evaluator` |
| accept a finding | row in `seeds/dbt_project_evaluator_exceptions.csv` with a comment |
| CI gate | `DBT_PROJECT_EVALUATOR_SEVERITY=error` + `data_tests: dbt_project_evaluator: +severity` |
| lint / fix | `sqlfluff lint models tests` · `sqlfluff fix models tests` |
| machine-readable lint | `sqlfluff lint models --format json` |
| disable a rule for the team | `exclude_rules = structure.column_order` in `.sqlfluff` |

| Evaluator rule (table) | Fires when | Usual fix |
|---|---|---|
| `fct_undocumented_models` / documentation coverage | a model has no description | describe it in YAML |
| `fct_missing_primary_key_tests` / test coverage | no unique + not_null (or combination) test | test the key |
| `fct_model_directories`, `fct_source_directories`, `fct_test_directories` | files outside `staging/<source>/`, YAML in another folder | move the file or YAML entry |
| `fct_model_naming_conventions` | no `stg_`/`int_`/`fct_`/`dim_` prefix | rename |
| `fct_direct_join_to_source`, `fct_marts_or_intermediate_dependent_on_source` | a model reads a source and a model, or a mart reads a source | add or use a staging model |
| `fct_root_models` | a model with no parents | ref the real parent, or except generated models |
| `fct_sources_without_freshness` | no freshness on a source | add `freshness` + `loaded_at_field` |

> **The main idea:** pin packages and commit the lock, build keys with generate_surrogate_key, give macros defaults, and let the evaluator and SQLFluff gate every change.

---

<a id="slide-29"></a>
## 29. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| dbt package | A dbt project (macros, models, tests) installed into yours and compiled with it |
| dbt Hub | The public registry of dbt packages (hub.getdbt.com) |
| packages.yml / dependencies.yml | Files listing the packages to install; dependencies.yml also lists project dependencies and is not rendered with Jinja |
| dbt deps | Command that resolves, downloads and installs packages into dbt_packages/ |
| package-lock.yml | File written by dbt deps with the exact installed versions and a hash of packages.yml |
| Version range / semantic versioning | A list of bounds such as [">=1.4.0", "<1.5.0"] / major.minor.patch numbering |
| Surrogate key | A key made up by the warehouse, here a hash of the natural key columns |
| Composite grain | A grain defined by more than one column |
| generate_surrogate_key | dbt_utils macro: NULL-safe, separator-joined hash of a list of columns |
| date_spine | dbt_utils macro that generates one row per period; the end is exclusive |
| codegen | dbt Labs package whose macros print source YAML, base models and model YAML |
| run-operation | dbt command that runs one macro on its own, with --args |
| Default value / keyword argument | A macro argument used when the caller omits it / an argument passed as name=value |
| Generic test | A test macro ({% test %}) that returns failing rows and can be attached to any model or column |
| dbt-project-evaluator | dbt Labs package that checks a project against best practices and reports findings as tests |
| Finding / rule | One breach of a best practice / one check (one fct_ table in the evaluator) |
| Root model | A model with no parents |
| Exceptions seed | dbt_project_evaluator_exceptions.csv: accepted findings, each with a comment |
| Dispatch | dbt’s mechanism for choosing which implementation of a macro to call (per adapter or package) |
| Severity | Whether a failing test warns or errors; set per test or folder |
| Linter / fixer | A tool that reports style breaches without running code / one that rewrites code to obey the rules |
| SQLFluff | The SQL linter and fixer used in dbt projects |
| Dialect | The SQL variant SQLFluff parses (duckdb, snowflake, tsql, …) |
| Templater | How SQLFluff renders templated SQL before linting: dbt, jinja, raw, placeholder, python |
| .sqlfluff / .sqlfluffignore | SQLFluff configuration file / list of paths SQLFluff skips |
| Quality gate | A script or CI job that runs every check and fails if any fails |

---

<a id="slide-30"></a>
## 30. What to remember, and references

*Reference · recap and official sources*

1. **Packages are source code.** List them in `packages.yml` with minor-version ranges, run `dbt deps`, commit `package-lock.yml`, never `dbt_packages/`. On Windows keep projects at short paths.
2. **Keys come from a macro.** `generate_surrogate_key` handles NULLs and separators; test keys and grains; treat a formula change as a migration.
3. **Reuse before you write.** dbt_utils has calendars, unions, deduplication and tests; codegen writes the YAML. Read a package macro’s SQL for your adapter before trusting it (exercise 10).
4. **Your macros have defaults.** Keyword arguments, parenthesised arguments, compile-time errors for bad input, YAML docs; generic tests return failing rows.
5. **The evaluator keeps structure honest.** Read the fct_ tables, fix in batches, except only with a comment, then run with severity error in CI.
6. **SQLFluff keeps style honest.** dbt Labs’ .sqlfluff with your dialect, the dbt templater, one fix pull request proved by an output comparison, then lint on every change.

- [Packages](https://docs.getdbt.com/docs/build/packages), [dbt deps](https://docs.getdbt.com/reference/commands/deps), [dbt Hub](https://hub.getdbt.com/): installing, pinning, the lock file, private packages.
- [dbt_utils README](https://github.com/dbt-labs/dbt-utils) (every macro and test with examples), [codegen README](https://github.com/dbt-labs/dbt-codegen), [run-operation](https://docs.getdbt.com/reference/commands/run-operation).
- [Jinja and macros](https://docs.getdbt.com/docs/build/jinja-macros), [macro properties](https://docs.getdbt.com/reference/macro-properties), [writing custom generic tests](https://docs.getdbt.com/best-practices/writing-custom-generic-tests), [dispatch](https://docs.getdbt.com/reference/dbt-jinja-functions/dispatch).
- [dbt_project_evaluator](https://dbt-labs.github.io/dbt-project-evaluator/latest/): [rules](https://dbt-labs.github.io/dbt-project-evaluator/latest/rules/), [exceptions](https://dbt-labs.github.io/dbt-project-evaluator/latest/customization/exceptions/), [CI check](https://dbt-labs.github.io/dbt-project-evaluator/latest/ci-check/).
- [SQLFluff](https://docs.sqlfluff.com/en/stable/): [rules reference](https://docs.sqlfluff.com/en/stable/reference/rules.html), [dbt templater](https://docs.sqlfluff.com/en/stable/configuration/templating/dbt.html), [jinja templater](https://docs.sqlfluff.com/en/stable/configuration/templating/jinja.html); [dbt’s dbtonic .sqlfluff](https://docs.getdbt.com/docs/platform/studio-ide/lint-format), [How we style our SQL](https://docs.getdbt.com/best-practices/how-we-style/2-how-we-style-our-sql).
- [How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview) (the conventions the evaluator checks).

**How this deck was tested:** dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), SQLFluff 4.4.0 with sqlfluff-templater-dbt 4.4.0 on CPython 3.12.10 (Windows 11), all in one virtual environment at a short path. `dbt deps` resolved dbt_utils 1.4.1, codegen 0.14.1 and dbt_project_evaluator 1.4.0 from hub.getdbt.com during the build. The build copied the exported project of *dbt Jinja and macros* into a short scratch folder and applied the lessons in order; every dbt, SQLFluff and Python command ran there, exercises and bug-clinic cases ran in separate copies, and the lab was exported and its quality gate run again on a fresh copy. Not executed: the `.pre-commit-config.yaml` hook (shown only) and any hosted CI service. Output normalisation: clock times removed, durations replaced by `x.xx`, absolute paths replaced by placeholders, long outputs trimmed (labelled); timings are measured on the build machine. Next in your plan: incremental models, snapshots and unit tests in depth, then deployment and slim CI, where this deck’s gate runs on every pull request.

> **The main idea:** borrow tested code through pinned packages, write small macros with defaults, and let dbt-project-evaluator and SQLFluff enforce the rest on every change.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Predict what dbt deps does after a range change

The lock file stores a hash of `packages.yml`. What should dbt do when the file it hashed has changed?

<a id="hint-2"></a>
### Hint 2 · A composite key over a pair that can be NULL

Group by the two columns and build the key with the dbt_utils macro, column names as strings. Concatenating with NULL gives NULL.

<a id="hint-3"></a>
### Hint 3 · Find and fix the bug in a dbt_utils test

Package tests are macros; YAML arguments become keyword arguments. Check the argument name in the dbt_utils README.

<a id="hint-4"></a>
### Hint 4 · A second macro with a default, used in two models

`nullif(x, '')` turns an empty string into NULL. `exceptions.raise_compiler_error("…")` stops compilation. Save the two staging models to `legacy` first, as in lesson 2.

<a id="hint-5"></a>
### Hint 5 · A custom generic test meets the unknown member

`dim_product` has one row that is not a real product. Generic tests accept `config: where:` in YAML.

<a id="hint-6"></a>
### Hint 6 · Predict the SQLFluff rules, then write the lint-clean version

Upper-case keywords (CP01), implicit aliases for tables and columns (AL01, AL02), a bare `JOIN` (AM05), `group by` by name (AM06), several targets on one line (LT09). An alias named `orders` next to a CTE named `orders` is legal but confusing.

<a id="hint-7"></a>
### Hint 7 · A rushed model meets the evaluator in CI

Look at the prefix of the name, at what it selects from (a source and a model together), and at what YAML it lacks.

<a id="hint-8"></a>
### Hint 8 · Debug: works on my laptop, fails in CI

What is in `.gitignore`, and which command creates the ignored folder?

<a id="hint-9"></a>
### Hint 9 · Package, your own macro, or plain SQL?

Search the installed package’s macro folder for the names you need; the README lists them too.

<a id="hint-10"></a>
### Hint 10 · Take-home: add the reviews source, end to end

Order: load, `generate_source` with `table_names`, paste and describe, staging model, YAML with a tested key, then the evaluator: a second source without freshness needs the same justified exception as events (a `like` pattern covers both).

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was applied to a scratch copy of the project and run with dbt, SQLFluff or Python during the build; the outputs shown are real (clock times and durations normalised) and the `assert` lines passed.

<a id="solution-1"></a>
### Solution 1 · Predict what dbt deps does after a range change

Terminal (output trimmed):

```text
$ dbt deps
Updating lock file in file path: <project>/package-lock.yml
Installing dbt-labs/dbt_utils
Installed from version 1.3.3
Updates available for packages: ['dbt-labs/dbt_utils']
```

```python
import yaml
lock = yaml.safe_load(open("package-lock.yml", encoding="utf-8"))
versions = {p["name"]: p["version"] for p in lock["packages"]}
print(versions)
assert versions["dbt_utils"].startswith("1.3.")
```

Output:

```text
{'dbt_utils': '1.3.3', 'codegen': '0.14.1', 'dbt_project_evaluator': '1.4.0'}
```

dbt sees that `packages.yml` no longer matches the hash in the lock, re-resolves every package and rewrites the lock with the newest 1.3.x. **Common wrong answer:** “the lock keeps 1.4.1 until you pass --upgrade”; the lock only wins while `packages.yml` is unchanged. **Interviewer follow-up:** “How do you take a new patch release without editing the range?” → `dbt deps --upgrade`, review the lock diff, run a full build, merge alone.

<a id="solution-2"></a>
### Solution 2 · A composite key over a pair that can be NULL

Terminal:

```text
$ dbt --quiet show `
    --inline "select customer_id, product_id, {{ dbt_utils.generate_surrogate_key(['customer_id', 'product_id']) }} as pair_key from {{ ref('int_purchases') }} group by 1, 2 order by 1 nulls first, 2" --limit 20
| customer_id | product_id | pair_key             |
| ----------- | ---------- | -------------------- |
|             | P3         | 6efbf952f03341050... |
| u1          | P1         | eea369111468d5606... |
| u2          | P1         | 2198b96d58b7a342a... |
| u2          | P2         | ceae334904b1806a8... |
| u4          | P4         | f69cdb0e1d5950e93... |
| u5          | P4         | a8af2f18734554100... |
| u6          | P4         | e5826425351fb370c... |
```

```python
import duckdb
compiled = """with __dbt__cte__int_purchases as (
-- int_purchases: purchase events that can be counted as orders.
-- Ephemeral (folder default): never built, inlined as a CTE where referenced.
select
    event_id                    as order_id,
    customer_id,
    product_id,
    event_at_utc                as ordered_at_utc,
    cast(event_at_utc as date)  as order_date_utc,
    amount
from "main_staging"."stg_events"
where event_type = 'purchase'
  and amount is not null       -- e7 ("abc") is excluded; a test reports it
) select customer_id, product_id, md5(cast(coalesce(cast(customer_id as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(product_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as pair_key from __dbt__cte__int_purchases group by 1, 2"""
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    rows = con.sql(compiled).fetchall()
    naive = con.sql("select count(*) from (" + compiled.replace(
        "md5(cast(coalesce(cast(customer_id as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(product_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT))",
        "md5(customer_id || product_id)") + ") where pair_key is null").fetchone()[0]
keys = [r[2] for r in rows]
print(len(rows), "pairs,", len(set(keys)), "distinct keys,", sum(k is None for k in keys), "NULL keys; naive md5 NULL keys:", naive)
assert len(set(keys)) == len(rows) and None not in keys and naive == 1
```

Output:

```text
7 pairs, 7 distinct keys, 0 NULL keys; naive md5 NULL keys: 1
```

The macro replaces the NULL customer with a marker, so the e6 pair still gets a key; the naive version returns NULL for exactly that pair. **Common wrong answer:** `generate_surrogate_key([customer_id, product_id])` without quotes, which compiles to `cast( as TEXT)` (bug clinic). **Interviewer follow-up:** “Should a NULL customer even get a key?” → in a fact, map it to the unknown member’s key (`-1`), as `fct_orders` does, so joins to the dimension never drop rows.

<a id="solution-3"></a>
### Solution 3 · Find and fix the bug in a dbt_utils test

Terminal (output trimmed):

```text
$ dbt test --select fct_daily_product_sales
Compilation Error in test dbt_utils_unique_combination_of_columns_fct_daily_product_sales_date_key__product_key (models\marts\_marts.yml)
  macro 'dbt_macro__test_unique_combination_of_columns' takes no keyword argument 'columns'
[exit code 2]
```

Fixed (`combination_of_columns`):

Terminal (output trimmed):

```text
$ dbt test --select fct_daily_product_sales,test_name:unique_combination_of_columns
1 of 1 PASS dbt_utils_unique_combination_of_columns_fct_daily_product_sales_date_key__product_key  [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

The test macro’s signature is `unique_combination_of_columns(model, combination_of_columns, quote_columns=false)`; an unknown keyword is a compilation error, so no test runs at all. **Common wrong answer:** moving the test under a column (it is a model-level test). **Interviewer follow-up:** “Why test both the key and the column combination?” → the combination test catches a wrong grain; the key test catches a wrong key formula.

<a id="solution-4"></a>
### Solution 4 · A second macro with a default, used in two models

```python
import duckdb
with duckdb.connect("leafy.duckdb") as con:
    for m in ["stg_customers", "stg_products"]:
        con.execute(f"create or replace table legacy.{m} as select * from main_staging.{m}")
```

```sql
# macros/clean_text.sql
{% macro clean_text(column_name, case="lower") -%}
    {%- if case not in ["lower", "upper"] -%}
        {{ exceptions.raise_compiler_error("clean_text: case must be 'lower' or 'upper', got '" ~ case ~ "'") }}
    {%- endif -%}
    nullif({{ case }}(trim({{ column_name }})), '')
{%- endmacro %}
```

```diff
--- a/models/staging/stg_customers.sql
+++ b/models/staging/stg_customers.sql
@@ -3 +3 @@
-    lower(trim(customer_id)) as customer_id,
+    {{ clean_text('customer_id') }} as customer_id,
```

```diff
--- a/models/staging/stg_products.sql
+++ b/models/staging/stg_products.sql
@@ -3 +3 @@
-    upper(trim(product_id)) as product_id,
+    {{ clean_text('product_id', case='upper') }} as product_id,
```

Terminal (output trimmed):

```text
$ dbt build --select stg_customers stg_products
Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

```python
assert compare("stg_customers", schema="main_staging") + compare("stg_products", schema="main_staging") == 0
```

Output:

```text
stg_customers     only in old: 0   only in new: 0
stg_products      only in old: 0   only in new: 0
```

Terminal (output trimmed):

```text
$ dbt --quiet compile --inline "{{ clean_text('city', case='title') }}"
clean_text: case must be 'lower' or 'upper', got 'title'
[exit code 2]
```

Both models produce the same rows: no ID in the seeds is empty, so `nullif` changes nothing today but protects tomorrow’s data. The default keeps the common call short; the keyword makes the unusual call obvious. Pasting `{{ case }}` as a function name is only safe because the value is validated first. **Common wrong answer:** `{{ clean_text(customer_id) }}` without quotes (renders nothing). **Interviewer follow-up:** “Would you put this in dbt_utils style with dispatch?” → only if the project targets several warehouses whose string functions differ.

<a id="solution-5"></a>
### Solution 5 · A custom generic test meets the unknown member

```sql
# tests/generic/matches_pattern.sql
{% test matches_pattern(model, column_name, pattern) %}
{#- Fails for every non-NULL value that does not match the regular expression. -#}
select {{ column_name }}
from {{ model }}
where {{ column_name }} is not null
    and not regexp_matches({{ column_name }}, '{{ pattern }}')
{% endtest %}
```

Terminal (output trimmed):

```text
$ dbt test --select dim_product,test_name:matches_pattern
1 of 1 FAIL 1 matches_pattern_dim_product_product_id___P_0_9_ .................. [FAIL 1 in x.xxs]
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

Terminal:

```text
$ dbt --quiet show `
    --inline "select product_id from {{ ref('dim_product') }} where not regexp_matches(product_id, '^P[0-9]+$')"
| product_id |
| ---------- |
| -1         |
```

```diff
--- a/models/marts/_marts.yml
+++ b/models/marts/_marts.yml
@@ -25,2 +25,4 @@
                 pattern: "^P[0-9]+$"
+              config:
+                where: "product_id <> '-1'"   # the unknown member
 
```

Terminal (output trimmed):

```text
$ dbt test --select dim_product,test_name:matches_pattern
1 of 1 PASS matches_pattern_dim_product_product_id___P_0_9_ .................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

The unknown member `-1` fails the pattern, by design. Filtering it with `where` keeps the rule strict for real products and documents the exception next to the test. **Common wrong answer:** loosening the pattern to `.*` or `^(P[0-9]+|-1)$` without saying why. The second works but hides the intent. **Interviewer follow-up:** “How would you make the regex function portable?” → wrap it in a dispatched macro or use `dbt.regexp_*` cross-database macros where they exist.

<a id="solution-6"></a>
### Solution 6 · Predict the SQLFluff rules, then write the lint-clean version

```python
import json, subprocess, sys
p = subprocess.run([sys.executable, "-m", "sqlfluff", "lint", "models/marts/fct_customer_orders.sql", "--format", "json"],
                   capture_output=True, text=True)
codes = sorted({v["code"] for f in json.loads(p.stdout) for v in f["violations"]})
print("exit", p.returncode, codes)
assert p.returncode == 1 and {"CP01", "AL01", "AL02", "AM05", "AM06", "LT09"} <= set(codes)
```

Output:

```text
exit 1 ['AL01', 'AL02', 'AM05', 'AM06', 'CP01', 'CP02', 'LT05', 'LT09']
```

```sql
# models/marts/fct_customer_orders.sql
-- fct_customer_orders: one row per customer with order count and revenue.
with orders as (

    select * from {{ ref('fct_orders') }}

),

customers as (

    select * from {{ ref('dim_customer') }}

)

select
    customers.customer_id,
    count(*) as order_count,
    sum(orders.amount) as revenue
from orders
inner join customers on orders.customer_key = customers.customer_key
group by 1
```

Terminal (output trimmed):

```text
$ sqlfluff lint models/marts/fct_customer_orders.sql
All Finished!
```

Every finding maps to a convention: lower case, explicit `as`, `inner join` spelled out, positional `group by`, one column per line, CTEs named after what they hold instead of one-letter aliases. **Common wrong answer:** running `sqlfluff fix` and stopping; it fixes case and layout but cannot choose names for `COUNT(*)` or rewrite the query into CTEs. **Interviewer follow-up:** “Your team disagrees with positional group by.” → change `group_by_and_order_by_style` to `explicit` in `.sqlfluff`; the point is one rule for everyone.

<a id="solution-7"></a>
### Solution 7 · A rushed model meets the evaluator in CI

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions    # severity error
30 of 78 FAIL 1 valid_documentation_coverage ................................... [FAIL 1 in x.xxs]
33 of 78 FAIL 1 is_empty_fct_model_naming_conventions_ ......................... [FAIL 1 in x.xxs]
36 of 78 FAIL 1 is_empty_fct_undocumented_models_ .............................. [FAIL 1 in x.xxs]
63 of 78 FAIL 2 is_empty_fct_direct_join_to_source_ ............................ [FAIL 2 in x.xxs]
66 of 78 FAIL 1 is_empty_fct_marts_or_intermediate_dependent_on_source_ ........ [FAIL 1 in x.xxs]
73 of 78 FAIL 1 is_empty_fct_source_fanout_ .................................... [FAIL 1 in x.xxs]
77 of 78 FAIL 1 is_empty_fct_missing_primary_key_tests_ ........................ [FAIL 1 in x.xxs]
78 of 78 FAIL 1 valid_test_coverage ............................................ [FAIL 1 in x.xxs]
Done. PASS=70 WARN=0 ERROR=8 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
[exit code 1]
```

**Fix:** build on the existing marts instead of the raw source, use the `fct_` prefix, document it and test its key.

```sql
# models/marts/fct_customer_revenue.sql
-- fct_customer_revenue: one row per customer with purchase revenue.
with orders as (

    select * from {{ ref('fct_orders') }}

),

customers as (

    select * from {{ ref('dim_customer') }}

)

select
    customers.customer_id,
    sum(orders.amount) as revenue
from orders
inner join customers on orders.customer_key = customers.customer_key
group by 1
```

```yaml
# models/marts/_fct_customer_revenue.yml
version: 2

models:
  - name: fct_customer_revenue
    description: Purchase revenue per customer, from fct_orders. One row per customer_id.
    columns:
      - name: customer_id
        description: Primary key.
        data_tests: [unique, not_null]
```

Terminal (output trimmed):

```text
$ dbt build --select fct_customer_revenue
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions    # severity error
Done. PASS=78 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

The model joined a **source** directly with a **model** (`fct_direct_join_to_source`) and a mart read a source (`fct_marts_or_intermediate_dependent_on_source`), and the events source now fed two models (`fct_source_fanout`), so its cleaning duplicated `stg_events` and could drift from it. It had no prefix (naming), no description and no tested key (coverage). Rebuilding it on `fct_orders` also reuses the order rules: e7 and the unknown customer are handled once. **Common wrong answer:** adding four exception rows. **Interviewer follow-up:** “When is a source in a mart acceptable?” → practically never; add a staging model even if it only renames.

<a id="solution-8"></a>
### Solution 8 · Debug: works on my laptop, fails in CI

Terminal (output trimmed):

```text
$ dbt build --select dim_customer    # fresh checkout: no dbt_packages/
Compilation Error
  dbt expects 3 package(s) based on packages specified in packages.yml, but found only 0 package(s) installed in dbt_packages. Following packages were not found: dbt_utils, codegen, dbt_project_evaluator. Run "dbt deps" to install package dependencies.
[exit code 2]
```

Terminal (output trimmed):

```text
$ dbt deps
Installed from version 1.4.1
Installed from version 0.14.1
Installed from version 1.4.0
```

Terminal (output trimmed):

```text
$ dbt build --select dim_customer
Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

`dbt_packages/` is never committed, so a fresh checkout has no packages; dbt compares `packages.yml` with `dbt_packages/`, names the missing ones and stops before compiling anything. The fix is a CI step order: `dbt deps`, then `dbt build`, with `package-lock.yml` committed so the versions match your laptop. **Common wrong answer:** committing `dbt_packages/` (thousands of files, stale on the next upgrade). **Interviewer follow-up:** “deps takes 30 seconds in every job.” → cache `dbt_packages/` keyed on the lock file’s hash.

<a id="solution-9"></a>
### Solution 9 · Package, your own macro, or plain SQL?

```python
import pathlib, re
hits = {}
for path in pathlib.Path("dbt_packages/dbt_utils/macros").rglob("*.sql"):
    for m in re.finditer(r"{%-?\s*macro\s+(safe_divide|deduplicate|star|date_spine)\(([^)]*)\)", path.read_text(encoding="utf-8")):
        hits.setdefault(m.group(1), m.group(2).strip())
for name in sorted(hits):
    print(f"dbt_utils.{name}({hits[name]})")
assert {"safe_divide", "deduplicate"} <= set(hits)
```

Output:

```text
dbt_utils.date_spine(datepart, start_date, end_date)
dbt_utils.deduplicate(relation, partition_by, order_by)
dbt_utils.safe_divide(numerator, denominator)
dbt_utils.star(from, relation_alias=False, except=[], prefix='', suffix='', quote_identifiers=True, unquote_aliases=False, rename={})
```

| Need | Choice | Why |
|---|---|---|
| (a) NULL on zero, one mart | `dbt_utils.safe_divide` | it exists, is tested on many warehouses, and needs no options here |
| (b) latest row per key, five models | one shared pattern (`qualify row_number()`), or `dbt_utils.deduplicate` after reading its SQL for your adapter | one definition for five places; exercise 10 shows why to read package SQL |
| (c) team rounding rule, ten marts | your own macro (like lesson 11) with defaults | a business rule dbt_utils cannot know |
| (d) one expression, one model | plain SQL | a macro would only hide it from reviewers |

Packages win when the problem is generic and you can live with their options; your own macro wins for business rules; plain SQL wins below the “three uses” threshold. **Common wrong answer:** writing `safe_divide` without checking dbt_utils, or adding a package for one tiny macro. **Interviewer follow-up:** “dbt_utils’ version almost fits.” → wrap it in your macro, or override it for your project with `dispatch`, rather than forking the package.

<a id="solution-10"></a>
### Solution 10 · Take-home: add the reviews source, end to end

```json
# data/raw/reviews.jsonl
{"review_id":"r1","user_id":"u1","product_id":"P1","rating":"5","reviewed_at":"2026-03-03T10:00:00Z"}
{"review_id":"r2","user_id":"u2","product_id":"P2","rating":"4","reviewed_at":"2026-03-03T11:00:00Z"}
{"review_id":"r3","user_id":"u4","product_id":"P4","rating":null,"reviewed_at":"2026-03-04T09:00:00Z"}
{"review_id":"r2","user_id":"u2","product_id":"P2","rating":"4","reviewed_at":"2026-03-03T11:00:00Z"}
{"review_id":"r4","user_id":" U5 ","product_id":"p9","rating":"2","reviewed_at":"2026-03-04T12:30:00-06:00"}
```

```python
# scripts/load_reviews.py
"""load_reviews.py: land data/raw/reviews.jsonl in raw.reviews, as text."""
import duckdb

with duckdb.connect("leafy.duckdb") as con:
    con.execute("""
        create or replace table raw.reviews as
        select * from read_json('data/raw/reviews.jsonl', format = 'newline_delimited',
            columns = {review_id: 'VARCHAR', user_id: 'VARCHAR', product_id: 'VARCHAR',
                       rating: 'VARCHAR', reviewed_at: 'VARCHAR'})
    """)
    print("raw.reviews:", con.sql("select count(*) from raw.reviews").fetchone()[0], "rows")
```

Output:

```text
$ python scripts/load_reviews.py
raw.reviews: 5 rows
```

Terminal (only the table and two column lines):

```text
$ dbt --quiet run-operation codegen.generate_source `
    --args '{"schema_name": "raw", "name": "shop_raw", "table_names": ["reviews"], "generate_columns": true}'
      - name: reviews
          - name: review_id
          - name: rating
```

```sql
# models/staging/shop_raw/stg_reviews.sql (first attempt)
-- stg_reviews: product reviews, typed and deduplicated. One row per review_id.
with source as (

    select * from {{ source('shop_raw', 'reviews') }}

),

cleaned as (

    select
        review_id,
        {{ clean_text('user_id') }} as customer_id,
        {{ clean_text('product_id', case='upper') }} as product_id,
        try_cast(rating as integer) as rating,
        {{ to_utc('reviewed_at') }} as reviewed_at_utc
    from source

),

deduplicated as (

    {{ dbt_utils.deduplicate(
        relation='cleaned',
        partition_by='review_id',
        order_by='reviewed_at_utc desc'
    ) }}

)

select * from deduplicated
```

Terminal (output trimmed):

```text
$ dbt build --select source:shop_raw.reviews+
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

Terminal:

```text
$ dbt --quiet show --inline "select * from {{ ref('stg_reviews') }} order by review_id"
| review_id | customer_id | product_id | rating |     reviewed_at_utc |
| --------- | ----------- | ---------- | ------ | ------------------- |
| r1        | u1          | P1         |      5 | 2026-03-03 10:00:00 |
| r2        | u2          | P2         |      4 | 2026-03-03 11:00:00 |
| r4        | u5          | P9         |      2 | 2026-03-04 18:30:00 |
```

Four review IDs went in (r1–r4) but only three came out: **r3, the review with a NULL rating, is gone**, and every test passed. The macro’s default SQL (used on DuckDB) explains it:

Terminal (the lines that matter):

```text
$ dbt --quiet compile `
    --inline "{{ dbt_utils.deduplicate(relation='cleaned', partition_by='review_id', order_by='reviewed_at_utc desc') }}"
        distinct data.*
    from cleaned as data
    natural join row_numbered
```

A `natural join` matches on *every* column, and `NULL = NULL` is not true, so any row with a NULL anywhere is dropped. Replace it with the `qualify` pattern that `stg_events` already uses:

```sql
# models/staging/shop_raw/stg_reviews.sql (fixed: the deduplicated CTE)
deduplicated as (

    select *
    from cleaned
    qualify row_number() over (
        partition by review_id
        order by reviewed_at_utc desc
    ) = 1

)

select * from deduplicated
```

Terminal (output trimmed):

```text
$ dbt build --select source:shop_raw.reviews+
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

Terminal:

```text
$ dbt --quiet show --inline "select * from {{ ref('stg_reviews') }} order by review_id"
| review_id | customer_id | product_id | rating |     reviewed_at_utc |
| --------- | ----------- | ---------- | ------ | ------------------- |
| r1        | u1          | P1         |      5 | 2026-03-03 10:00:00 |
| r2        | u2          | P2         |      4 | 2026-03-03 11:00:00 |
| r3        | u4          | P4         |        | 2026-03-04 09:00:00 |
| r4        | u5          | P9         |      2 | 2026-03-04 18:30:00 |
```

Terminal (output trimmed):

```text
$ dbt build --select package:dbt_project_evaluator dbt_project_evaluator_exceptions    # severity error
Done. PASS=78 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=78
```

Terminal (output trimmed):

```text
$ sqlfluff lint models tests
All Finished!
```

codegen produced the source skeleton; `clean_text` normalised IDs; a package macro looked right, passed every test and still lost a row, which only a row count against the input caught (add a test: exercise 4’s idea, or `dbt_utils.equal_rowcount` against a distinct count);  `accepted_range` allows the NULL rating (NULLs pass range tests). The exception row now uses `shop_raw.%`, a pattern, with the same comment. `p9` stays in staging; a fact would map it to the unknown product. **Common wrong answer:** adding `stg_reviews` under `models/staging/` directly (the evaluator’s folder rule fails again). **Interviewer follow-up:** “How would you add freshness for real?” → `loaded_at_field` on a load timestamp column added by the loader, plus `dbt source freshness` in the scheduled job.
