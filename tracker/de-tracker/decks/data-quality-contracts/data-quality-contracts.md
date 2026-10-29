# Data quality and contracts: test strategy, freshness, model contracts and versions

*Companion to `data-quality-contracts.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Tested with:** dbt-core 1.12.5 and the dbt-duckdb adapter 1.11.0 (DuckDB 1.5.6) on CPython 3.12.10, Windows 11 (64-bit); Data Contract CLI 1.2.4 (Open Data Contract Standard v3.2.0) in its own virtual environment. SQL dialect: DuckDB. No packages from dbt Hub are needed. Every dbt, Python and Data Contract CLI command shown was executed while building this document, in a real project folder, and its real output is shown. Output was normalised in three ways only: the leading clock time on each dbt log line was removed, durations were replaced by `x.xx`, and absolute folder paths were replaced by `<project>` or `~`. Some long outputs are trimmed (marked). Nothing here needs a hosted service; features that only exist in the dbt platform (cross-project references, the Catalog UI) are described, never shown with output. Constraint enforcement differs by warehouse (Snowflake, BigQuery, Databricks, Fabric Data Warehouse); the deck says where.

**Series:** this is a *gap deck* in the dbt series. It starts from the finished project of *dbt Jinja and macros: templates, loops, reusable SQL* (folder `dbt-jinja-macros-project/` next to that deck). What earlier decks already teach is recapped in one line and referenced by title: generic and singular tests, `severity: warn`, reading failures and `store_failures` (*dbt fundamentals: source data to trusted marts*, lessons 27–31); unit tests vs data tests, `where`, simple `warn_if`/`error_if` counts and test packages (*dbt incremental models, snapshots and unit tests*, lessons 17–21); custom generic tests, a static row-count test and the project evaluator (*dbt packages and project quality*). The finished project of this deck is in `data-quality-contracts-lab/` next to this file, with its `TESTING.md`.

**Prerequisites:** *dbt fundamentals*, *dbt Jinja and macros*, and *dbt incremental models, snapshots and unit tests*. New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises follow common data-engineering interview patterns (research done in October 2026 from public interview guides, candidates’ write-ups, the dbt documentation and the dbt Labs blog: test strategy per layer, alert fatigue, freshness SLAs, volume anomalies, reconciliation with finance, contracts vs tests, breaking changes and versioning, producer–consumer contracts). All questions are original and use the Leafy project.

**Additions beyond the original brief** are marked *(added)*: a test inventory script that reads `manifest.json`, flags duplicate tests along the lineage and writes the catalogue into TESTING.md; `fail_calc` for percentage and two-sided thresholds (and the `severity: warn` gotcha); reconciliation with a documented list of known differences, so explained gaps do not hide new ones; `source_status:fresher+`: build only what has new data; model access and groups (public, protected, private); turning dbt’s breaking-change warning into a CI error with `--warn-error-options`; executed producer-side contract checks with the Data Contract CLI (`lint`, `test`, `breaking`); an incident drill: stale, truncated and changed-schema deliveries, and which check catches each.

## Contents

1. [Data quality and contracts: test strategy, freshness, model contracts and versions](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up: start from the Jinja-and-macros project](#slide-2)
3. [The running example: who produces Leafy’s data, and who depends on it](#slide-3)
4. [What you already have, and unit tests vs data tests in one minute](#slide-4)
5. [A risk-based test strategy: what to test at each layer](#slide-5)
6. [What not to test: review a pull request that adds ten tests](#slide-6)
7. [Source freshness: is the data late?](#slide-7)
8. [Freshness in a production job: order, artifacts, and building only what changed](#slide-8)
9. [warn_if, error_if and fail_calc: thresholds that mean something](#slide-9)
10. [Volume tests: did a whole delivery arrive?](#slide-10)
11. [Reconciliation 1: row conservation through the pipeline](#slide-11)
12. [Reconciliation 2: revenue against the payment provider](#slide-12)
13. [The Leafy test plan, applied and measured](#slide-13)
14. [TESTING.md: the strategy, written down where the code is](#slide-14)
15. [Contracts: promises about shape, between producers and consumers](#slide-15)
16. [Enforce a model contract on fct_orders](#slide-16)
17. [Constraints: let the database refuse bad rows](#slide-17)
18. [An upstream schema change: what catches it, and what does not](#slide-18)
19. [The fix, and the contract that stopped the first attempt in CI](#slide-19)
20. [Breaking changes: dbt compares the contract with production](#slide-20)
21. [Model versions: ship a breaking change next to the old shape](#slide-21)
22. [Deprecation: a date, warnings, and a migration window](#slide-22)
23. [Access and groups: who may ref which model](#slide-23)
24. [Producer–consumer data contracts: agree before it breaks](#slide-24)
25. [A schema-change policy: what is breaking, and how to ship it anyway](#slide-25)
26. [Interview pattern: which mechanism for which risk?](#slide-26)
27. [Lab: the Leafy quality gate, from the Jinja-and-macros project](#slide-27)
28. [Lab: the incident drill](#slide-28)
29. [Bug clinic: data quality and contracts](#slide-29)
30. [Interview questions: test strategy and data quality](#slide-30)
31. [Interview questions: contracts, versions and schema changes](#slide-31)
32. [Exercises 1–3: freshness, volume, thresholds](#slide-32)
33. [Exercises 4–5: reconciliation](#slide-33)
34. [Exercises 6–8: contracts and versions](#slide-34)
35. [Exercises 9–11: take-home, design and review](#slide-35)
36. [Cheat sheet](#slide-36)
37. [Glossary](#slide-37)
38. [What to remember, and what comes next](#slide-38)
39. [References and how this deck was tested](#slide-39)
40. [Appendix A · Hints](#appendix-a)
41. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Data quality and contracts: test strategy, freshness, model contracts and versions

**

Earlier decks taught *how* to write dbt tests. This one teaches *which* tests to write and where: freshness and volume on sources, keys and types in staging, business rules and reconciliation in marts, thresholds that warn before they fail, and a `TESTING.md` that explains it all. Then it turns your marts into dependable interfaces: enforced **model contracts**, **versions** with deprecation dates, access rules, and a **data contract** with the team that produces your data. The running example is Leafy, the plant shop: a week of web events, the payment provider’s settlement files, and three incidents (a late load, a truncated file and an unannounced schema change). Every command ran while the deck was built.

- **Start here:** the Jinja-and-macros project plus a week of events and payments; producers, consumers and what can break.
- **Part A, test strategy:** risk per layer, what not to test, freshness, thresholds, volume, reconciliation, `TESTING.md`.
- **Part B, contracts:** model contracts, constraints, an upstream change caught in CI, versions, deprecation, access.
- **Part C, between teams:** producer–consumer data contracts (ODCS) and a schema-change policy.
- **Project:** a lab that builds the Leafy quality gate and runs an incident drill; then a bug clinic, interview questions, 11 exercises, a cheat sheet, a glossary and references.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

A dbt project with no tests ships wrong numbers quietly; a project with hundreds of noisy tests ships them too, because everyone learned to ignore the red. What separates the two is a strategy: test where the risk is, at the layer that can see it, with a threshold and an owner. And once other teams build on your marts, a column rename is no longer a refactor but an outage. Contracts, versions and agreed change policies are how a data team keeps its promises to the people downstream, and asks the same of the people upstream.

#### Where you will use it

- Every dbt project: which tests go on sources, staging and marts, and with what severity.
- Daily operations: freshness and volume checks that say “the data did not arrive” before a stakeholder does.
- Finance and audits: reconciliation of revenue against the payment provider or the ledger.
- Shared marts: enforced contracts, versions and deprecation dates for tables used by dashboards, reverse ETL and other teams.

#### What goes wrong without it

- Dashboards built on yesterday’s data with no warning; half a file treated as a full day.
- Revenue that is 20% low and every test green.
- A test suite that is red every morning, so nobody looks.
- A “small” rename in a mart that breaks three dashboards and a finance export.

#### Who expects you to know it

- Data engineers: test strategy, contracts and versions are core dbt work and in the dbt certification; freshness SLAs, schema evolution and producer contracts at the ingestion boundary.
- Interviewers: “what do you test where?”, “too many alerts?”, “contract vs test?”, “how do you ship a breaking change?”.

> **On the job:** On Monday finance says weekend revenue looks low. Your tests were green. You add a reconciliation against the payment provider and find that the web app started sending amounts in cents on Saturday; the loader dropped the field. You agree a data contract with the web team, add the new field behind an enforced model contract, and publish a `fct_orders` v2 with a deprecation date for the old version. The next schema change fails the web team’s CI instead of your Monday.

> **The main idea:** test where the risk is, with thresholds and owners; give consumers contracts and a migration path; ask producers for the same.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [dbt: Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [dbt: Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A source that loads on a schedule | Source freshness with warn and error SLAs | Late data is the most common incident; it is cheap to check |
| A source whose size is predictable | A relative volume test | Catches truncated and doubled loads that keys and not-null miss |
| A number someone reconciles (revenue, payments, stock) | A reconciliation test against the other system | The only test that compares to the truth outside your pipeline |
| A mart read by other teams or tools | An enforced model contract (+ access: public) | Shape changes fail at build time, not in a dashboard |
| A breaking change to a contracted mart | A new model version with a deprecation date | Consumers migrate on a schedule instead of breaking |
| An exploratory or internal model that changes weekly | Keys and a few rules; no contract, no versions | Governance too early slows you down for no consumer |
| A column that cannot fail given the code (a literal, a coalesce) | No test, or a constraint | A test that can never fail is noise and cost |

#### How interviews test it

- “What do you test at each layer, and what do you not test?”
- “Your tests are always red. What do you do?” · “warn_if vs error_if vs severity?”
- “How do you know a source is late or incomplete?” · “Revenue doesn’t match Stripe: how do you prove the pipeline?”
- “Contract vs test vs constraint?” · “An upstream team renamed a column: how would you have caught it?” · “How do you ship a breaking change?”

#### Where it sits in your learning path

- Builds on: *dbt fundamentals* (generic and singular tests, severity, store_failures), *dbt Jinja and macros*, and *dbt incremental models, snapshots and unit tests* (unit vs data tests, where, thresholds).
- Next: CI/CD and deployment (state, defer, environments) and orchestration; *dbt packages and project quality* covers packages, the project evaluator and SQL linting.

> **The main idea:** reach for freshness, volume and reconciliation where data arrives and where money is counted; reach for contracts and versions where other people depend on your columns.

---

<a id="slide-2"></a>
## 2. Set up: start from the Jinja-and-macros project

*Start here · versions, starting point, and what was not executed*

| Item | Detail |
|---|---|
| Tested with | **dbt-core 1.12.5** with **dbt-duckdb 1.11.0** (DuckDB 1.5.6) on CPython 3.12.10, Windows 11; **Data Contract CLI 1.2.4** (ODCS v3.2.0) in a separate virtual environment. No dbt Hub packages. Minimums: dbt 1.5 for contracts, versions and access; dbt 1.6 for `deprecation_date`; dbt 1.8 for unit tests; dbt 1.10 for the `arguments:` key under tests. |
| Starting point | The finished project of *dbt Jinja and macros* (`dbt-jinja-macros-project/`), copied to a new folder: raw events → `stg_events` → `fct_orders`, dimensions and `fct_daily_funnel`, with the generic and singular tests of the earlier decks. |
| New in this deck | Three more days of events (5–7 March), the payment provider’s settlement files, a loader that can replay days, simulate a late load and land an *incident* delivery, a new source `payments_raw` with `stg_payments`. |
| Not executed | dbt platform features (cross-project `ref` in dbt Mesh, the Catalog UI, alerts) and a Kafka schema registry need hosted services; they are described, never shown with output. |
| Outputs | Real. Clock times removed, durations shown as `x.xx`, machine paths replaced by `<project>` or `~`. Long outputs are trimmed and labelled. |

#### Copy the project, install the tools

```text
# in a copy of dbt-jinja-macros-project, with the dbt virtual environment active
python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0   # same as earlier decks
$env:DBT_PROFILES_DIR = (Get-Location).Path   # profiles.yml lives in the project folder

# Part C only, in a second virtual environment (keep its path short on Windows)
python -m pip install "datacontract-cli[duckdb]==1.2.4"
```

The Data Contract CLI is a separate tool with many dependencies; a second virtual environment keeps them away from dbt. On Windows its `duckdb` extra unpacks very deep folders, so create that environment in a short path (for example `C:\venvs\dc`).

#### Land a week of data and build

Terminal:

```text
$ python scripts/load_raw.py
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 1 h ago
```

Terminal (summary lines):

```text
$ dbt build
18 of 45 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
Finished running 2 seeds, 5 table models, 34 data tests, 4 view models in x.xx seconds (normalised).
Done. PASS=44 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=45
```

Green, with the one expected warning carried over from the earlier decks (event e7, amount “abc”). The new model `stg_payments` is built and tested too.

> **On the job:** Before changing tests on a real project, run the full build once and write down the baseline: how many tests, which ones warn, how long it takes. Every change in this deck is compared with that baseline.

> **The main idea:** start from the green project of the previous deck, add the new data, and check the build is still green before changing any test.

*Read more:* [Data tests](https://docs.getdbt.com/docs/build/data-tests), [Sources](https://docs.getdbt.com/docs/build/sources), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts).

---

<a id="slide-3"></a>
## 3. The running example: who produces Leafy’s data, and who depends on it

*Start here · a week of data, two producers, three consumers*

Data quality is about promises between people, so start with the people. Leafy’s data has **producers** (teams or systems that create it) and **consumers** (teams or systems that read it). The data team sits in the middle: a consumer of raw data and a producer of marts.

| Who | Role | What they rely on | What can go wrong |
|---|---|---|---|
| Web team (the shop’s web app) | producer of `raw.events` | nothing from us | renames a field, sends a file late or half a file |
| Payment provider | producer of `raw.payments` | nothing from us | settlement file late; refunds negative |
| Data team (you) | consumer of raw, producer of marts | raw shape and timing | a refactor changes a mart’s columns |
| Finance | consumer of `fct_orders` | revenue that matches the payment provider | revenue silently low |
| Marketing dashboard | consumer of `fct_orders` columns by name | stable column names and types | dashboard breaks on a rename |

#### The files

| Delivery day | Events | Payments | Trap |
|---|---|---|---|
| 2026-03-02 to 03-04 | 9, 4, 2 | 5, 2, 2 | from the earlier decks: e7 amount “abc”, a redelivered file, time zones |
| 2026-03-05 to 03-07 | 8, 7, 9 | 3, 3, 4 | a guest page view, a refund, events after midnight UTC |
| incidents (2026-03-08) | truncated: 2; redelivered: 8; appv2: 8 | 3 each | a half file, the full redelivery, and a new app version that sends `amount_cents` |

The incident folders are landed only when a lesson or the lab asks for them (`--incident`).

#### Does revenue match the money?

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select o.date_key, o.orders_usd, p.charges_usd
    from (select date_key, sum(amount) as orders_usd from {{ ref('fct_orders') }} group by 1) o
    join (select cast(strftime(captured_date_utc, '%Y%m%d') as integer) as date_key, sum(amount_usd) as charges_usd from {{ ref('stg_payments') }} where payment_type = 'charge' group by 1) p using (date_key)
    order by 1"
Previewing inline node:
| date_key | orders_usd | charges_usd |
| -------- | ---------- | ----------- |
| 20260302 |     119.50 |      149.50 |
| 20260303 |       7.50 |        7.50 |
| 20260304 |      48.99 |       48.99 |
| 20260305 |     107.00 |      107.00 |
| 20260306 |      89.00 |       89.00 |
| 20260307 |     119.50 |      119.50 |
```

Six days of orders against the payment provider’s charges. Five days agree to the cent. On 2 March the provider settled 149.50 but `fct_orders` has 119.50: event e7 (amount “abc”) was a real 30.00 sale that the pipeline dropped. The earlier decks reported it only as a *warning*; lesson 11 turns this comparison into a test.

> **On the job:** Ask “who would notice first if this table were wrong, and what would they do?” for every important table. The answer tells you which tests matter, who owns a failure, and which tables need a contract.

> **The main idea:** list producers and consumers before writing tests: the promises between them are what you test and what you put in contracts.

*Read more:* [Sources](https://docs.getdbt.com/docs/build/sources), [Exposures](https://docs.getdbt.com/docs/build/exposures).

---

<a id="slide-4"></a>
## 4. What you already have, and unit tests vs data tests in one minute

*Part A · the recap, in one line per topic*

This deck does not re-teach how to write a test. One line each, with the deck that teaches it:

| Already taught | In one line | Deck |
|---|---|---|
| Generic tests (`unique`, `not_null`, `accepted_values`, `relationships`), singular tests | YAML tests and SQL files that return failing rows | *dbt fundamentals*, lessons 27–28 |
| `severity: warn`, reading failures, `dbt build` skipping children, `store_failures` | a failed error-level test skips everything downstream | *dbt fundamentals*, lessons 28–31 |
| Unit tests, `where`, simple `warn_if`/`error_if` counts, dbt_utils and dbt_expectations tests | logic on fixtures; tuned data tests | *dbt incremental models, snapshots and unit tests*, lessons 17–21 |
| Custom generic tests, a static row-count test, the project evaluator | reusable tests as macros | *dbt packages and project quality*, lessons 12–16 |

#### Unit tests vs data tests

|  | Unit test | Data test |
|---|---|---|
| Checks | the model’s **logic** | the **data** after a build |
| Input | hand-written fixture rows | the real table |
| Runs | in dev and CI, before the model is built | in every environment, after the build |
| Catches | wrong rules, refactor regressions | bad or late source data, broken grain, drift |

**Coming from C#:** a dbt unit test is an xUnit test of one method with fakes; a data test is a health check that runs against production every day. You need both, for different failures. The rest of this deck is about *data* tests and contracts; unit tests are covered in *dbt incremental models, snapshots and unit tests*, lesson 19.

#### The tests in the project today

Terminal (output trimmed):

```text
$ dbt ls --select test_type:unit        # logic tests on fixture rows
[WARNING]: The selection criterion 'test_type:unit' does not match any enabled nodes
[WARNING]: No nodes selected!
```

Terminal (output trimmed):

```text
$ dbt ls --select test_type:singular    # SQL files in tests/
leafy.assert_no_unparseable_amounts
```

Terminal (output trimmed):

```text
$ dbt ls --select test_type:generic --output name   # YAML tests (first 4)
accepted_values_stg_events_event_type__page_view__add_to_cart__purchase__refund
not_null_customers_customer_id
not_null_dim_customer_customer_id
not_null_dim_customer_customer_key
…
```

`test_type:` selects tests by kind. This project has no unit tests yet (the earlier deck added them in its own project), one singular test and generic tests on every layer. Which of them actually matter is the question of the next two lessons.

> **On the job:** In CI, run unit tests and data tests (`dbt build`); in production, skip unit tests with `--exclude-resource-type unit_test`: their fixtures never change, so running them on production data proves nothing new.

> **The main idea:** unit tests check logic on fixtures in CI; data tests check real data in every run; this deck is about choosing the data tests and the contracts.

*Read more:* [Data tests](https://docs.getdbt.com/docs/build/data-tests), [Unit tests](https://docs.getdbt.com/docs/build/unit-tests), [test_type selection](https://docs.getdbt.com/reference/node-selection/methods#test_type).

---

<a id="slide-5"></a>
## 5. A risk-based test strategy: what to test at each layer

*Part A · test where the risk is, at the layer that can see it*

A **test strategy** is a short list of decisions: which failures you guard against, at which layer, how loudly, and who acts. Decide each candidate test by **risk** = *likelihood* × *impact*, and by one more question: *when it fails, will someone do something?* A test with no action is not protection, it is noise.

| Layer | What goes wrong there | Tests that belong there | Usual severity |
|---|---|---|---|
| **Sources** (raw, as delivered) | late, missing, truncated or duplicated deliveries; a changed payload | freshness, volume, a few column checks at the boundary (keys present, known types) | warn early, error when unusable |
| **Staging** (rename, cast, dedupe) | bad casts, duplicates after dedupe, unexpected codes | primary key `unique` + `not_null`, `accepted_values` on codes, parse failures | error on keys, warn on codes |
| **Intermediate** (joins, business logic) | fan-out, dropped rows | grain tests, or row conservation tested at the mart | error |
| **Marts** (facts, dimensions, reports) | wrong business numbers, orphans, broken interfaces | business rules, `relationships`, reconciliation, a contract on shared marts | error on money and keys |

#### A triage you can run in a meeting

```python
# Triage candidate tests: likelihood x impact, and is there an action when it fails?
candidates = [  # (test, layer, likelihood 1-3, impact 1-3, someone acts on it?)
    ("events land on time (freshness)",            "source",  3, 3, True),
    ("events volume vs recent days",               "source",  2, 3, True),
    ("event_id unique after dedupe",               "staging", 2, 3, True),
    ("amount parses as a number",                  "staging", 2, 2, True),
    ("revenue equals the payment provider's",      "marts",   2, 3, True),
    ("dim_date.day_name not null",                 "marts",   1, 1, False),
    ("product_name has no typos",                  "staging", 2, 1, False),
]
def decide(likelihood, impact, actionable):
    if not actionable:
        return "skip: nobody would act"
    score = likelihood * impact
    return "error" if score >= 6 else "warn" if score >= 3 else "skip: low risk"

for test, layer, l, i, act in candidates:
    print(f"{layer:<8} {test:<40} {l}x{i}={l * i}  -> {decide(l, i, act)}")
```

Output:

```text
source   events land on time (freshness)          3x3=9  -> error
source   events volume vs recent days             2x3=6  -> error
staging  event_id unique after dedupe             2x3=6  -> error
staging  amount parses as a number                2x2=4  -> warn
marts    revenue equals the payment provider's    2x3=6  -> error
marts    dim_date.day_name not null               1x1=1  -> skip: nobody would act
staging  product_name has no typos                2x1=2  -> skip: nobody would act
```

The scoring is crude on purpose: it forces the two questions that matter. Freshness and reconciliation score highest because they are likely *and* expensive. “No typos in product names” is plausible but nobody fixes typos from a test alert, so it does not become a test.

#### Rules of thumb

- Test each fact **once**, at the earliest layer that can see the problem; re-test it later only if a transformation can break it (a join, a union, a `coalesce`).
- Test the **boundary** (sources) for things you cannot fix (late, missing), and your own **logic** (staging, marts) for things you can.
- Every error-level test has an **owner** and a first action written down (lesson 14, `TESTING.md`).
- Prefer one reconciliation over twenty column checks for numbers people reconcile anyway.

**Coming from C#:** the same idea as the test pyramid plus risk-based testing: many cheap checks where failures are common, few expensive ones where they are costly, none where nobody would act.

> **On the job:** In an interview, answer “what do you test?” by layer and by risk, not by listing test names: “at the source, freshness and volume because that is where most incidents start; in staging, keys and parse failures; in marts, business rules and one reconciliation against finance; severities set so that red means act.”

> **The main idea:** test where the risk is, at the layer that can see it, with a severity that matches the impact and an owner who will act.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [Data tests](https://docs.getdbt.com/docs/build/data-tests), [severity, error_if, warn_if](https://docs.getdbt.com/reference/resource-configs/severity).

---

<a id="slide-6"></a>
## 6. What not to test: review a pull request that adds ten tests

*Part A · avoiding test bloat and noise*

**Test bloat** is a suite that grows faster than the risks it covers: slow builds, many alerts, and nobody sure which ones matter. **Noise** is a test that fails without anyone needing to act. Both train people to ignore red. A well-meaning teammate opens a pull request that adds ten tests:

#### The pull request (excerpts)

```yaml
# models/staging/_staging.yml (stg_payments)
      - name: payment_id
        data_tests: [unique, not_null]
      - name: currency
        data_tests:
          - accepted_values:                                   # PR test 3
              arguments: {values: ["USD"]}
      - name: captured_at_utc
        data_tests: [not_null]                                 # PR test 4
      - name: captured_date_utc
        data_tests: [not_null]                                 # PR test 5
      - name: payment_type
        data_tests:
          - accepted_values:                                   # PR test 10
              arguments: {values: ["charge", "refund"]}
```

```yaml
# models/marts/_marts.yml (dim_date, fct_daily_funnel)
  - name: dim_date
    columns:
      ...
      - name: day_name
        data_tests: [not_null]                                 # PR test 6
      - name: is_weekend
        data_tests:
          - not_null                                           # PR test 7
          - accepted_values:                                   # PR test 8
              arguments: {values: [true, false], quote: false}
  - name: fct_daily_funnel
    description: Periodic snapshot of event counts per UTC day.
    columns:
      - name: purchase_events
        data_tests: [not_null]                                 # PR test 9
```

Plus `unique` and `not_null` on `payment_id` in the source (tests 1–2). All ten pass:

Terminal (output trimmed):

```text
$ dbt build --select source:payments_raw stg_payments dim_date fct_daily_funnel
Done. PASS=21 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=21
```

#### What the inventory says

Terminal:

```text
$ python scripts/test_inventory.py
44 data tests
layer         tests  warn  kinds
source            3     0  not_null 2, unique 1
seed              4     0  not_null 2, unique 2
staging          11     1  accepted_values 3, not_null 5, singular 1, unique 2
marts            26     0  accepted_values 1, not_null 14, relationships 4, unique 7

duplicate candidates (same test, same column, upstream): 9
  dim_customer.customer_id     not_null  also on customers
  dim_customer.customer_id     unique    also on customers
  dim_product.product_id       not_null  also on products
  dim_product.product_id       unique    also on products
  fct_orders.customer_key      not_null  also on dim_customer
  fct_orders.product_key       not_null  also on dim_product
  stg_events.event_id          not_null  also on shop_raw.events
  stg_payments.payment_id      not_null  also on payments_raw.payments
  stg_payments.payment_id      unique    also on payments_raw.payments
```

`scripts/test_inventory.py` added reads `manifest.json` and flags the same test on the same column further up the lineage. Two older groups are flagged too. The seed/dimension pairs stay: the dimensions add an unknown member, so their keys can break even when the seed is clean. The `not_null` tests on `fct_orders.customer_key` and `product_key` cannot fail (the SQL coalesces to the unknown member); lesson 17 replaces them with constraints.

| PR test | Verdict | Why |
|---|---|---|
| 1–2 source `payment_id` unique, not_null | drop | staging passes the column through unchanged and tests it; test once |
| 3 `currency` accepted_values USD | keep, as warn | a second currency would silently corrupt the reconciliation; warn so finance can decide |
| 4 `captured_at_utc` not_null | keep | a payment without a time cannot be assigned to a day |
| 5 `captured_date_utc` not_null | drop | derived from test 4’s column: it cannot fail on its own |
| 6–8 `dim_date` day_name / is_weekend | drop | generated from a date spine; a boolean column can only hold true or false: cannot fail |
| 9 `fct_daily_funnel.purchase_events` not_null | drop | `count(*)` is never NULL: cannot fail |
| 10 `payment_type` accepted_values | keep | a new type (a chargeback) would break revenue; likely and costly |

Terminal:

```text
$ python scripts/test_inventory.py   # after the review
37 data tests
duplicate candidates (same test, same column, upstream): 7
```

> **On the job:** Review tests like code. Ask of each one: can it fail given the SQL? Is the same fact already tested upstream on an unchanged column? If it fails, who acts and how? Three “no” answers mean delete it. Then remember the catch: `accepted_values` ignores NULLs, so pair it with `not_null` when NULL is also wrong.

> **The main idea:** delete tests that cannot fail, that repeat an upstream test on an unchanged column, or that nobody would act on; keep the ones that guard likely, costly failures.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [Data tests](https://docs.getdbt.com/docs/build/data-tests), [test selection methods](https://docs.getdbt.com/reference/node-selection/methods#test_type).

---

<a id="slide-7"></a>
## 7. Source freshness: is the data late?

*Part A · the most common incident is data that did not arrive*

**Source freshness** answers “when did data last land?”. dbt runs `select max(loaded_at_field)` on each source table, compares it with the current time, and reports **pass**, **warn** or **error** against two thresholds: `warn_after` and `error_after`. The thresholds are your **SLA** (service-level agreement): how stale data may get before someone must act.

#### The config

```yaml
# models/staging/_sources.yml (freshness parts)
sources:
  - name: shop_raw
    schema: raw
    config:
      loaded_at_field: _loaded_at          # when the row landed (written by the loader)
      freshness:                           # files land nightly around 23:00 UTC
        warn_after: {count: 26, period: hour}
        error_after: {count: 48, period: hour}
    tables:
      - name: events

  - name: payments_raw
    schema: raw
    config:
      loaded_at_field: _loaded_at
      freshness:                           # settlement files arrive once a day, around 06:00 UTC
        warn_after: {count: 36, period: hour}
        error_after: {count: 60, period: hour}
    tables:
      - name: payments
```

`loaded_at_field` should be the *landing* time written by the loader (`_loaded_at`), not an event time: a late event can be in a fresh file. Configs set on the source apply to all its tables; a table can override them or opt out with `freshness: null`.

The two SLAs differ because the producers differ: events land nightly, settlement files once a day at 06:00, so payments get more slack.

#### Fresh, late, very late

Terminal (output trimmed):

```text
$ dbt source freshness            # newest files landed 1 h ago
1 of 2 PASS freshness of payments_raw.payments ................................. [PASS in x.xxs]
2 of 2 PASS freshness of shop_raw.events ....................................... [PASS in x.xxs]
Done.
```

Terminal:

```text
$ python scripts/load_raw.py --lag-hours 30
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 30 h ago
```

Terminal (output trimmed):

```text
$ dbt source freshness            # 30 h ago
1 of 2 PASS freshness of payments_raw.payments ................................. [PASS in x.xxs]
2 of 2 WARN freshness of shop_raw.events ....................................... [WARN in x.xxs]
Done.
```

Terminal:

```text
$ python scripts/load_raw.py --lag-hours 50
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 50 h ago
```

Terminal (output trimmed):

```text
$ dbt source freshness            # 50 h ago
1 of 2 WARN freshness of payments_raw.payments ................................. [WARN in x.xxs]
2 of 2 ERROR STALE freshness of shop_raw.events ................................ [ERROR STALE in x.xxs]
Done.
[exit code 1]
```

The loader stamps `_loaded_at` relative to the clock, so the same files can be “1, 30 or 50 hours old”. At 30 hours the events are past their 26-hour warning but payments are within 36. At 50 hours events are past the 48-hour error SLA, so the command exits with 1 and a scheduler stops the job.

> **On the job:** Run freshness as the first step of a production job and stop on error: building marts on stale data and publishing them as “today” is worse than publishing nothing. Tell consumers what the SLA is (put it in `TESTING.md` and the source description) so a warning means the same to everyone.

> **The main idea:** freshness = max(loaded_at_field) vs now, against warn_after and error_after SLAs set per source from how the producer delivers.

*Read more:* [freshness](https://docs.getdbt.com/reference/resource-properties/freshness), [dbt source freshness](https://docs.getdbt.com/reference/commands/source), [Source freshness in deployment](https://docs.getdbt.com/docs/deploy/source-freshness).

---

<a id="slide-8"></a>
## 8. Freshness in a production job: order, artifacts, and building only what changed

*Part A · where freshness sits in the run*

1. **dbt source freshness** (step 1): stop the job on error; writes target/sources.json
2. **dbt build** (step 2): models, tests, snapshots (freshness is not part of build)
3. **publish artifacts** (step 3): manifest.json, run_results.json, sources.json for alerts and the next run

#### Read the result like a monitor would

```python
import json
results = json.load(open("target/sources.json", encoding="utf-8"))["results"]
for r in results:
    hours = r["max_loaded_at_time_ago_in_s"] / 3600
    print(f'{r["unique_id"]:<38} {r["status"]:<6} {hours:5.1f} h old  '
          f'warn > {r["criteria"]["warn_after"]["count"]} h, error > {r["criteria"]["error_after"]["count"]} h')
```

Output:

```text
source.leafy.shop_raw.events           error   50.0 h old  warn > 26 h, error > 48 h
source.leafy.payments_raw.payments     warn    50.0 h old  warn > 36 h, error > 60 h
```

`target/sources.json` has the status, the age and the criteria for each table: what an alerting script or a dashboard reads. The ages above are from the 50-hour run of the last lesson.

#### Build only what has new data

The files above landed 30 hours ago; freshness ran and its `sources.json` was kept in `prev-run/`. Then new files landed:

Terminal:

```text
$ python scripts/load_raw.py
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 1 h ago
```

Terminal (output trimmed):

```text
$ dbt source freshness
1 of 2 PASS freshness of payments_raw.payments ................................. [PASS in x.xxs]
2 of 2 PASS freshness of shop_raw.events ....................................... [PASS in x.xxs]
Done.
```

Terminal (output trimmed):

```text
$ dbt ls --select source_status:fresher+ --state prev-run --resource-type model --output name
fct_daily_funnel
fct_orders
int_purchases
stg_events
stg_payments
```

`source_status:fresher+` added selects sources whose newest load is newer than in the saved state, and the `+` adds everything downstream. Schedules that run hourly use it to rebuild only the parts of the DAG that received data.

| Situation | Tool |
|---|---|
| Raw table landed by a loader | `freshness` on the source (this lesson) |
| Huge raw table: scanning `max()` is expensive | freshness `filter:` limits the scan, for example to the last 3 days |
| A model, not a source (is the mart itself recent?) | a recency test, such as `dbt_utils.recency` (*dbt incremental models, snapshots and unit tests*, lesson 21) |
| A source with no load-time column | add one in the loader; event time is a poor substitute |

> **On the job:** Alert on freshness by source owner: a stale payments file goes to the person who talks to the payment provider, not to the whole data team. dbt platform jobs can run freshness on their own schedule; with any other scheduler, a separate task that runs `dbt source freshness` and reads `sources.json` does the same.

> **The main idea:** run freshness first and stop on error, keep sources.json for alerts, and use source_status:fresher+ to rebuild only what received data.

*Read more:* [Source freshness in deployment](https://docs.getdbt.com/docs/deploy/source-freshness), [source_status selection](https://docs.getdbt.com/reference/node-selection/methods#source_status), [freshness](https://docs.getdbt.com/reference/resource-properties/freshness).

---

<a id="slide-9"></a>
## 9. warn_if, error_if and fail_calc: thresholds that mean something

*Part A · how dbt turns a test result into pass, warn or error*

Recap from *dbt incremental models, snapshots and unit tests* (lesson 20): `warn_if` and `error_if` are thresholds on the number of failing rows. Here is the full mechanism. dbt wraps your test query and computes **failures** with `fail_calc` (default `count(*)`), then appends `warn_if` and `error_if` as SQL comparisons. So a threshold can be any comparison, and `fail_calc` can measure anything the test returns, such as a percentage. added

#### A percentage threshold

```sql
# tests/generic/null_rate.sql
{% test null_rate(model, column_name) %}
{#- Returns ONE row: the percentage of NULLs in the column, rounded up to a whole number.
    The thresholds live in YAML: fail_calc reads null_pct, warn_if / error_if compare it. -#}
select cast(ceil(100.0 * count(*) filter (where {{ column_name }} is null)
                 / nullif(count(*), 0)) as integer) as null_pct
from {{ model }}
{% endtest %}
```

```yaml
# models/staging/_staging.yml (stg_events.customer_id)
      - name: customer_id
        description: Normalised customer id; NULL for guests (not logged in).
        data_tests:
          - null_rate:
              config:
                where: "event_type = 'purchase'"   # browsing as a guest is normal; buying as one is rare
                fail_calc: "coalesce(max(null_pct), 0)"
                warn_if: "> 5"                     # more than 5% guest purchases: look at the login service
                error_if: "> 20"                   # more than 20%: customer analytics is unusable
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:null_rate
1 of 1 WARN 6 null_rate_stg_events_customer_id ................................. [WARN 6 in x.xxs]
[WARNING]: Got 6 results, configured to warn if > 5
Done. PASS=0 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

17 purchases this week, 1 by a guest (e6): 5.9%, rounded up to 6, above 5 and below 20, so **warn**. The message says “Got 6 results”: dbt always calls the `fail_calc` value “results”, so read it as 6 percent. `failures` must be an integer, which is why the test rounds.

#### What dbt actually ran

```sql
-- target/run/leafy/models/staging/_staging.yml/null_rate_stg_events_customer_id.sql (generated by dbt)
    select
      coalesce(max(null_pct), 0) as failures,
      coalesce(max(null_pct), 0) > 5 as should_warn,
      coalesce(max(null_pct), 0) > 20 as should_error
    from (
  select cast(ceil(100.0 * count(*) filter (where customer_id is null)
                 / nullif(count(*), 0)) as integer) as null_pct
from (select * from "leafy"."main_staging"."stg_events" where event_type = 'purchase') dbt_subquery
    ) dbt_internal_test
```

| severity | Result |
|---|---|
| `error` (default) | error if `should_error`; else warn if `should_warn`; else pass |
| `warn` | warn if `should_warn`; else pass. **`error_if` is ignored.** |

Terminal (output trimmed):

```text
$ dbt test --select test_name:null_rate   # severity: warn, error_if "> 3"
1 of 1 WARN 6 null_rate_stg_events_customer_id ................................. [WARN 6 in x.xxs]
[WARNING]: Got 6 results, configured to warn if > 5
Done. PASS=0 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

The gotcha, executed in a scratch copy: with `severity: warn`, the 6% is above `error_if: "> 3"` but the test only warns. If you want both levels, leave `severity` at its default and use the two thresholds.

> **On the job:** Thresholds turn “always red, so ignored” into a signal, but only if they come from data: look at the last few weeks (here, guest purchases run at 3–6%), set warn just above normal and error where the data stops being usable, and write the reason next to the number. Revisit them when the business changes.

> **The main idea:** failures = fail_calc over the test’s rows; warn_if and error_if are SQL comparisons on it; severity: warn disables error_if.

*Read more:* [severity, error_if, warn_if](https://docs.getdbt.com/reference/resource-configs/severity), [fail_calc](https://docs.getdbt.com/reference/resource-configs/fail_calc), [where](https://docs.getdbt.com/reference/resource-configs/where), [Writing custom generic tests](https://docs.getdbt.com/best-practices/writing-custom-generic-tests).

---

<a id="slide-10"></a>
## 10. Volume tests: did a whole delivery arrive?

*Part A · catching truncated and doubled loads*

A **volume test** checks how many rows arrived. Freshness says a file landed; volume says it was complete. A *static* bound (“at least 1 row”) is in *dbt packages and project quality* (lesson 12); it catches empty loads but not half a file. A **relative** volume test compares the newest batch with recent batches, so it adapts as the business grows.

#### The test: newest batch vs the trailing average

```sql
# tests/generic/volume_vs_trailing.sql
{% test volume_vs_trailing(model, batch_column, lookback=3) %}
{#- Returns ONE row: the newest batch's row count as a percentage of the average of the
    previous `lookback` batches. The bands live in YAML (fail_calc + warn_if / error_if). -#}
with batches as (
    select {{ batch_column }} as batch, count(*) as row_count
    from {{ model }}
    group by 1
),
ranked as (
    select *, row_number() over (order by batch desc) as recency
    from batches
)
select
    newest.batch,
    newest.row_count,
    round(avg(previous.row_count), 1)                                           as trailing_avg,
    cast(round(100.0 * newest.row_count / avg(previous.row_count)) as integer) as pct_of_trailing
from ranked as newest
join ranked as previous on previous.recency between 2 and {{ lookback + 1 }}
where newest.recency = 1
group by newest.batch, newest.row_count
{% endtest %}
```

```yaml
# models/staging/_sources.yml (shop_raw.events)
      - name: events
        data_tests:
          - volume_vs_trailing:
              arguments: {batch_column: _batch_date, lookback: 3}
              config:
                fail_calc: "coalesce(max(pct_of_trailing), 100)"
                warn_if: "not between 50 and 200"    # unusual day: look
                error_if: "not between 30 and 400"   # broken delivery: stop
```

It applies the previous lesson: the test returns one measured row, `fail_calc` reads the percentage, and `not between` gives a two-sided band (too few *or* too many rows, for example a file loaded twice). `_batch_date` is the delivery day from the file name: a stable batch key that does not depend on the clock.

#### Normal week, then a half file

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select _batch_date, count(*) as row_count
    from {{ source('shop_raw', 'events') }}
    group by 1
    order by 1"
Previewing inline node:
| _batch_date | row_count |
| ----------- | --------- |
|  2026-03-02 |         9 |
|  2026-03-03 |         4 |
|  2026-03-04 |         2 |
|  2026-03-05 |         8 |
|  2026-03-06 |         7 |
|  2026-03-07 |         9 |
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:volume_vs_trailing
1 of 1 PASS source_volume_vs_trailing_shop_raw_events__batch_date__3 ........... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Newest batch 9 rows, previous three 2, 8 and 7: 159% of the average, inside both bands. In a scratch copy, the truncated delivery for 8 March lands (2 rows instead of about 8):

Terminal:

```text
$ python scripts/load_raw.py --incident truncated
raw.events     41 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: truncated)
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:volume_vs_trailing   # after the truncated delivery
1 of 1 FAIL 25 source_volume_vs_trailing_shop_raw_events__batch_date__3 ........ [FAIL 25 in x.xxs]
  Got 25 results, configured to fail if not between 30 and 400
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

2 rows against an average of 8 is 25%, outside the error band: the build stops before a half day reaches the marts. Freshness passed: the file was on time, just incomplete.

> **On the job:** Volume tests are noisy on small or seasonal data: a Sunday has fewer orders, a sale day more. Compare with the same weekday or widen the warn band, keep the error band for “clearly broken”, and test at the source, where the batch is still visible. Monitoring tools (Elementary, Monte Carlo, Metaplane) learn these bands from history; the idea is the same.

> **The main idea:** freshness says data arrived; a relative volume test says all of it arrived; use a warn band for unusual and an error band for broken.

*Read more:* [Writing custom generic tests](https://docs.getdbt.com/best-practices/writing-custom-generic-tests), [fail_calc](https://docs.getdbt.com/reference/resource-configs/fail_calc), [severity, error_if, warn_if](https://docs.getdbt.com/reference/resource-configs/severity).

---

<a id="slide-11"></a>
## 11. Reconciliation 1: row conservation through the pipeline

*Part A · rows in = rows out + rows rejected*

A **reconciliation test** compares two numbers that must agree because they describe the same thing from two sides. The simplest kind is **row conservation**: every row that enters a step comes out of it or is rejected for a stated reason. It catches the two classic silent bugs at once: rows dropped by an inner join or a filter, and rows multiplied by a fan-out join.

#### The test

```sql
# tests/assert_purchases_conserved.sql
-- Row conservation: every purchase event in staging becomes an order in fct_orders,
-- or is rejected for a known reason (an amount that does not parse). Returns a row if not.
with purchases as (
    select count(*) as n from {{ ref('stg_events') }} where event_type = 'purchase'
),
rejected as (
    select count(*) as n from {{ ref('stg_events') }} where event_type = 'purchase' and amount is null
),
orders as (
    select count(*) as n from {{ ref('fct_orders') }}
)
select purchases.n as purchases, orders.n as orders, rejected.n as rejected,
       purchases.n - orders.n - rejected.n as unaccounted
from purchases, orders, rejected
where purchases.n <> orders.n + rejected.n
```

Today: 17 purchase events = 16 orders + 1 rejected (e7, amount “abc”).

Terminal (output trimmed):

```text
$ dbt test --select assert_purchases_conserved
1 of 1 PASS assert_purchases_conserved ......................................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

#### A refactor that drops orders

```diff
# models/marts/fct_orders.sql (the change)
-left join customers on purchases.customer_id = customers.customer_id
-left join products  on purchases.product_id  = products.product_id
+join customers on purchases.customer_id = customers.customer_id
+join products  on purchases.product_id  = products.product_id
```

Terminal (output trimmed):

```text
$ dbt build --select fct_orders --store-failures   # a refactor used inner joins
2 of 11 FAIL 1 assert_purchases_conserved ...................................... [FAIL 1 in x.xxs]
Done. PASS=10 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=11
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select * from main_dbt_test__audit.assert_purchases_conserved"
Previewing inline node:
| purchases | orders | rejected | unaccounted |
| --------- | ------ | -------- | ----------- |
|        17 |     14 |        1 |           2 |
```

Two orders vanished: e6 (a guest, no customer) and e13 (customer u6, not yet in the CRM). Every column test still passed, because the remaining rows are perfect. Only a test that counts across the step notices what is *missing*. `--store-failures` kept the failing row for triage.

> **On the job:** Put a conservation test on every fact table that drops or splits rows on purpose, with the reasons spelled out (“rejected = unparseable amount”). When finance asks “where did order X go?”, the reasons are already in the SQL, and a new reason must be added deliberately.

> **The main idea:** rows in = rows out + rows rejected for a stated reason: one test catches dropped rows and fan-out that column tests cannot see.

*Read more:* [Data tests](https://docs.getdbt.com/docs/build/data-tests), [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures), [Singular data tests](https://docs.getdbt.com/docs/build/data-tests#singular-data-tests).

---

<a id="slide-12"></a>
## 12. Reconciliation 2: revenue against the payment provider

*Part A · the test that compares with the truth outside your pipeline*

Every test so far checks the pipeline against itself. A **cross-system reconciliation** compares it with an independent record, here the payment provider’s settled charges. It is the test finance will run anyway, so run it first. Two design rules: compare at the grain people reconcile (day), and keep **known differences** in a documented list, so an explained gap does not hide a new one.

#### A reconciliation model and a test

```sql
# models/marts/rec_daily_revenue.sql
-- rec_daily_revenue: revenue in fct_orders vs charges settled by the payment provider.
-- Grain: one row per UTC day. unexplained_usd must be 0 (tests/assert_revenue_reconciles.sql).
with orders as (
    select date_key, count(*) as orders, sum(amount) as orders_usd
    from {{ ref('fct_orders') }}
    group by date_key
),
charges as (
    select cast(strftime(captured_date_utc, '%Y%m%d') as integer) as date_key,
           count(*) as charges, sum(amount_usd) as charges_usd
    from {{ ref('stg_payments') }}
    where payment_type = 'charge'                     -- refunds are reconciled separately
    group by 1
),
known as (                                            -- documented, explained differences
    select cast(strftime(p.captured_date_utc, '%Y%m%d') as integer) as date_key,
           sum(k.amount_usd) as known_usd
    from {{ ref('known_differences') }} as k
    join {{ ref('stg_payments') }} as p on p.order_id = k.order_id and p.payment_type = 'charge'
    group by 1
)
select
    coalesce(o.date_key, c.date_key)                                       as date_key,
    coalesce(o.orders, 0)                                                  as orders,
    coalesce(c.charges, 0)                                                 as charges,
    coalesce(o.orders_usd, 0)                                              as orders_usd,
    coalesce(c.charges_usd, 0)                                             as charges_usd,
    coalesce(k.known_usd, 0)                                               as known_usd,
    coalesce(c.charges_usd, 0) - coalesce(o.orders_usd, 0) - coalesce(k.known_usd, 0) as unexplained_usd
from orders as o
full outer join charges as c on o.date_key = c.date_key       -- a day missing on either side shows up
left join known as k on k.date_key = coalesce(o.date_key, c.date_key)
```

```sql
# tests/assert_revenue_reconciles.sql
-- Revenue must match the payment provider's charges every day, after documented differences.
select date_key, orders, charges, orders_usd, charges_usd, known_usd, unexplained_usd
from {{ ref('rec_daily_revenue') }}
where abs(unexplained_usd) > 0.01
```

The model is useful on its own: finance can query it. The `full outer join` makes a day that exists in only one system visible; `payment_type = 'charge'` keeps refunds (negative amounts) out of a revenue comparison.

#### First run: one unexplained day

`seeds/known_differences.csv` starts with only its header.

Terminal (output trimmed):

```text
$ dbt build --select known_differences rec_daily_revenue+ --store-failures
6 of 6 FAIL 1 assert_revenue_reconciles ........................................ [FAIL 1 in x.xxs]
Done. PASS=5 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select date_key, orders, charges, orders_usd, charges_usd, unexplained_usd
    from main_dbt_test__audit.assert_revenue_reconciles"
Previewing inline node:
| date_key | orders | charges | orders_usd | charges_usd | unexplained_usd |
| -------- | ------ | ------- | ---------- | ----------- | --------------- |
| 20260302 |      4 |       5 |      119.5 |       149.5 |              30 |
```

2 March: 4 orders but 5 charges, 30.00 unexplained: e7. The web app sent “abc”, but the customer paid. The fix belongs to the web team (ticket WEB-1042); until then the difference is *explained*, not ignored:

```csv
# seeds/known_differences.csv
order_id,amount_usd,reason,ticket
e7,30.00,web app sent amount 'abc'; the 30.00 charge is real,WEB-1042
```

Terminal (output trimmed):

```text
$ dbt build --select known_differences rec_daily_revenue+   # after documenting e7
6 of 6 PASS assert_revenue_reconciles .......................................... [PASS in x.xxs]
Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select date_key, orders_usd, charges_usd, known_usd, unexplained_usd
    from {{ ref('rec_daily_revenue') }}
    order by date_key"
Previewing inline node:
| date_key | orders_usd | charges_usd | known_usd | unexplained_usd |
| -------- | ---------- | ----------- | --------- | --------------- |
| 20260302 |     119.50 |      149.50 |        30 |               0 |
| 20260303 |       7.50 |        7.50 |         0 |               0 |
| 20260304 |      48.99 |       48.99 |         0 |               0 |
| 20260305 |     107.00 |      107.00 |         0 |               0 |
| 20260306 |      89.00 |       89.00 |         0 |               0 |
| 20260307 |     119.50 |      119.50 |         0 |               0 |
```

> **On the job:** Agree the tolerance and the grain with finance (cents per day, or a percentage per month), and give every known difference a ticket and an owner. A reconciliation that fails every day because of old, explained gaps is noise; one with a short, documented exception list is the most trusted test in the project.

> **The main idea:** reconcile with an independent system at the grain people check, with a tolerance and a documented list of explained differences.

*Read more:* [Data tests](https://docs.getdbt.com/docs/build/data-tests), [Seeds](https://docs.getdbt.com/docs/build/seeds), [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures).

---

<a id="slide-13"></a>
## 13. The Leafy test plan, applied and measured

*Part A · the strategy as it now stands*

| Layer | Test | Catches | Severity |
|---|---|---|---|
| source | freshness (events 26/48 h, payments 36/60 h) | late deliveries | warn, then error |
| source | `volume_vs_trailing` on events | truncated or doubled files | warn 50–200%, error 30–400% |
| staging | keys: `unique` + `not_null` on `event_id`, `payment_id` | duplicates after dedupe | error |
| staging | `accepted_values` on event and payment types; currency | new codes that would break revenue | error; currency warn |
| staging | `null_rate` on guest purchases; unparseable amounts | login or app problems | warn (5%), error (20%) |
| marts | keys and `relationships` on facts and dimensions | orphans, broken grain | error |
| marts | row conservation; revenue reconciliation | dropped rows, fan-out, lost money | error |

#### The full build

Terminal (warnings and summary):

```text
$ dbt build
25 of 57 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
28 of 57 WARN 6 null_rate_stg_events_customer_id ............................... [WARN 6 in x.xxs]
Done. PASS=55 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=57
```

Two warnings, both meaningful and both owned: guest purchases at 6% (the login team was told), and e7’s unparseable amount (WEB-1042, the same root cause as the known difference). Everything else is green.

#### The inventory, by layer

Terminal:

```text
$ python scripts/test_inventory.py
44 data tests
layer         tests  warn  kinds
source            2     0  not_null 1, volume_vs_trailing 1
seed              7     0  not_null 4, unique 3
staging          11     2  accepted_values 3, not_null 4, null_rate 1, singular 1, unique 2
marts            24     0  not_null 11, relationships 4, singular 2, unique 7
```

Compare with the start of Part A: fewer tests that cannot fail, and new ones where the incidents happen (source freshness and volume) and where the money is (reconciliation).

> **On the job:** A healthy suite is mostly green, has a handful of warnings that each have a ticket, and fails rarely, and every failure is real. Track that: if the same warning has been there for a month, fix the cause, raise the threshold with a reason, or delete the test.

> **The main idea:** the plan puts freshness and volume at the source, keys and codes in staging, rules and reconciliation in marts, with severities that match the impact.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [severity, error_if, warn_if](https://docs.getdbt.com/reference/resource-configs/severity), [freshness](https://docs.getdbt.com/reference/resource-properties/freshness).

---

<a id="slide-14"></a>
## 14. TESTING.md: the strategy, written down where the code is

*Part A · a document a new teammate and an interviewer can read*

`TESTING.md` is a short file at the root of the project that states the test strategy: goals, what is tested at each layer and what is not, what severities mean, the SLAs, and what to do when each important test fails. It turns tribal knowledge into a review checklist, and it is the best artefact to show in a portfolio or a take-home.

#### The hand-written part

```markdown
# TESTING.md
# Testing strategy: Leafy dbt project

Owner: data team (#leafy-data). Reviewed every quarter and after every incident.

## Goals

- Catch late, incomplete or malformed deliveries before the marts are rebuilt.
- Keep revenue in `fct_orders` equal to the payment provider's charges, every day.
- No noise: a red test means someone acts today; a warning has an owner and a ticket.

## What we test at each layer

| Layer | We test | We do not test |
|---|---|---|
| sources | freshness (SLAs below), volume vs the last 3 deliveries | values we cannot fix (typos, free text) |
| staging | primary keys (unique + not_null), accepted codes, parse failures, guest-purchase rate | columns passed through unchanged that are tested upstream |
| marts | keys, relationships, row conservation, revenue reconciliation | columns that cannot fail (counts, coalesced keys, generated calendars) |

Unit tests (logic on fixture rows) run in CI only: `dbt build --exclude-resource-type unit_test` in production.

## Severity and thresholds

- **error**: the data is wrong or unusable; the job stops and downstream models are skipped.
- **warn**: unusual but usable; the owner reviews it the same day.
- Rates and volumes use `fail_calc` with `warn_if` / `error_if` bands; the numbers and reasons are in the YAML.

## Freshness SLAs

| Source | Lands | Warn after | Error after | Owner |
|---|---|---|---|---|
| `shop_raw.events` | nightly, about 23:00 UTC | 26 h | 48 h | web team (#web-platform) |
| `payments_raw.payments` | daily, about 06:00 UTC | 36 h | 60 h | finance operations |

## When a test fails

| Test | First action | Owner |
|---|---|---|
| freshness error | check the loader run, then ask the producer | data on-call |
| `volume_vs_trailing` error | compare the file with the producer; do not publish the day | data on-call |
| `assert_purchases_conserved` | find the step that dropped or multiplied rows (usually a join) | author of the last change |
| `assert_revenue_reconciles` | list the unexplained orders; fix, or add a known difference with a ticket | data engineer + finance |
| `null_rate` warn on guest purchases | tell the login team; no data change | data engineer |

## How to run

    dbt source freshness && dbt build                        # production order
    python scripts/test_inventory.py --catalogue TESTING.md  # refresh the catalogue below

## Adding or changing a test

1. Which failure does it catch, and how likely is it?
2. Is the same fact already tested upstream on an unchanged column?
3. Who acts when it fails, and how? Add a row to "When a test fails".
4. Does it pass on today's data without noise? Thresholds come from recent data, with the reason in a comment.

## Known exceptions

`seeds/known_differences.csv`: explained reconciliation differences, each with a ticket.

## Test catalogue (generated by scripts/test_inventory.py)

<!-- catalogue:start -->
<!-- catalogue:end -->
```

#### The generated part

Terminal:

```text
$ python scripts/test_inventory.py --catalogue TESTING.md
44 data tests
TESTING.md: catalogue rewritten (44 tests)
```

```python
from pathlib import Path
lines = Path("TESTING.md").read_text(encoding="utf-8").splitlines()
start = lines.index("<!-- catalogue:start -->")
print("\n".join(lines[start + 1:start + 9]))
print("...", sum(line.startswith("| ") for line in lines[start:]) - 2, "rows in total")
```

Output:

```text
| Layer | Tested node | Test | Severity | Thresholds |
|---|---|---|---|---|
| source | `shop_raw.events` | volume_vs_trailing | error | warn_if not between 50 and 200; error_if not between 30 and 400; fail_calc coalesce(max(pct_of_trailing), 100) |
| source | `shop_raw.events.event_id` | not_null | error | any failure |
| seed | `customers.customer_id` | not_null | error | any failure |
| seed | `customers.customer_id` | unique | error | any failure |
| seed | `known_differences.order_id` | not_null | error | any failure |
| seed | `known_differences.order_id` | unique | error | any failure |
... 43 rows in total
```

The catalogue is generated from `manifest.json` between two markers, so it cannot drift from the YAML. Re-run the script in CI and fail the pull request if `TESTING.md` changed (`git diff --exit-code TESTING.md`): then every new test shows up in review together with its severity.

**In your portfolio:** for Fuel Smart, write the same file: freshness of the recipe and nutrition loads, volume per USDA release, keys in staging, and one reconciliation (for example, calories recomputed from macronutrients against the published value, within a tolerance).

> **On the job:** Interviewers increasingly ask for a test strategy in take-home tasks. A one-page `TESTING.md` with a layer table, severities, owners and “what we do not test” shows judgement better than a hundred tests do.

> **The main idea:** write the strategy in TESTING.md next to the code, generate the catalogue from the manifest, and review both in every pull request.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [Data tests](https://docs.getdbt.com/docs/build/data-tests), [manifest.json](https://docs.getdbt.com/reference/artifacts/manifest-json).

---

<a id="slide-15"></a>
## 15. Contracts: promises about shape, between producers and consumers

*Part B · from “tested” to “dependable”*

A **contract** is an explicit, checked promise from a producer to its consumers about what the data looks like. Tests say “today’s data is right”; a contract says “the shape will stay like this, and if it must change you will hear about it first”. There are two kinds, at two boundaries:

|  | **Model contract** (dbt) | **Data contract** (between teams) |
|---|---|---|
| Promises | column names, data types, constraints of one model | schema, meaning of fields, quality rules, freshness SLA, owner, change policy |
| Checked | by dbt at build time (fails before the table changes) | by the producer’s CI and at ingestion (for example the Data Contract CLI) |
| Where at Leafy | `fct_orders` → finance, marketing (lessons 16–23) | web team → `raw.events` (lessons 24–25) |
| Format | YAML properties in the dbt project | a YAML document, often the Open Data Contract Standard (ODCS) |

1. **Web app** (producer): data contract: events
2. **raw → staging** (data team): tests at the boundary
3. **fct_orders** (data team as producer): model contract + version
4. **finance, dashboards** (consumers): rely on names and types

#### What a contract is not

- Not a data test: a contract checks the *shape* of the output; a column of the right type can still hold wrong values (lesson 18 shows exactly that).
- Not documentation: descriptions can drift; an enforced contract fails the build.
- Not free: it adds friction to every change, so put it only where someone depends on the shape.

#### Coming from C#

A model contract is a public interface: callers compile against member names and types, and changing them breaks callers. Model **versions** are API versioning (`/v1`, `/v2`), a **deprecation date** is `[Obsolete]` with a removal date, and **access** levels are `public`, `internal` and `private`. Data contracts are the equivalent of an OpenAPI spec agreed between two services.

> **On the job:** Contracts belong on the few models other people build on: marts read by dashboards, reverse ETL, ML features or other teams’ dbt projects. Adding them to every staging model only slows refactoring for no consumer.

> **The main idea:** a model contract guarantees a model’s shape at build time; a data contract is the wider agreement between teams; both exist so consumers are not surprised.

*Read more:* [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [Open Data Contract Standard (ODCS)](https://bitol-io.github.io/open-data-contract-standard/), [Model access](https://docs.getdbt.com/docs/mesh/govern/model-access).

---

<a id="slide-16"></a>
## 16. Enforce a model contract on fct_orders

*Part B · names and types checked before the table changes*

A **model contract** is switched on with `contract: {enforced: true}`. Then every column must be listed with a `data_type` the warehouse understands. On every build dbt runs a **preflight check**: it compares the names and types the SQL would produce with the YAML, and refuses to build if they differ. Column order does not matter; the table is created with the contract’s order.

#### The contract (excerpt of models/marts/_marts.yml)

```yaml
# models/marts/_marts.yml (fct_orders)
  - name: fct_orders
    description: '{{ doc("fct_orders") }}'
    config:
      contract: {enforced: true}         # the shape below is a promise to consumers
    columns:
      - name: order_id
        data_type: varchar
        data_tests: [unique, not_null]
      - name: date_key
        data_type: integer
      - name: customer_key
        data_type: varchar
      - name: product_key
        data_type: varchar
      - name: ordered_at_utc
        data_type: timestamp
      - name: amount
        data_type: decimal(10,2)
      # (data tests on the keys and amount are unchanged)
```

Supported for `table`, `incremental` (with `on_schema_change: append_new_columns` or `fail`) and `view` models (names and types only); not for ephemeral or Python models, and not for sources, seeds or snapshots.

#### First try, then green

Terminal (output trimmed):

```text
$ dbt run --select fct_orders   # first try: the YAML lists 5 of 6 columns
  This model has an enforced contract that failed.
  Please ensure the name, data_type, and number of columns in your contract match the columns in your model's definition.
  | column_name    | definition_type | contract_type | mismatch_reason     |
  | -------------- | --------------- | ------------- | ------------------- |
  | ordered_at_utc | TIMESTAMP       |               | missing in contract |
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

The first version of the YAML forgot `ordered_at_utc`: the preflight check lists it as *missing in contract* and nothing is built. With all six columns:

Terminal (output trimmed):

```text
$ dbt build --select fct_orders   # all 6 columns declared
1 of 11 OK created sql table model main_marts.fct_orders ....................... [OK in x.xxs]
3 of 11 PASS not_null_fct_orders_amount ........................................ [PASS in x.xxs]
4 of 11 PASS not_null_fct_orders_customer_key .................................. [PASS in x.xxs]
5 of 11 PASS not_null_fct_orders_date_key ...................................... [PASS in x.xxs]
6 of 11 PASS not_null_fct_orders_order_id ...................................... [PASS in x.xxs]
7 of 11 PASS not_null_fct_orders_product_key ................................... [PASS in x.xxs]
8 of 11 PASS relationships_fct_orders_customer_key__customer_key__ref_dim_customer_  [PASS in x.xxs]
9 of 11 PASS relationships_fct_orders_date_key__date_key__ref_dim_date_ ........ [PASS in x.xxs]
10 of 11 PASS relationships_fct_orders_product_key__product_key__ref_dim_product_  [PASS in x.xxs]
11 of 11 PASS unique_fct_orders_order_id ....................................... [PASS in x.xxs]
Done. PASS=11 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=11
```

```sql
# target/run/leafy/models/marts/fct_orders.sql (first statement, generated by dbt)
    create  table
      "leafy"."main_marts"."fct_orders__dbt_tmp"
  (
    order_id varchar,
    date_key integer,
    customer_key varchar,
    product_key varchar,
    ordered_at_utc timestamp,
    amount decimal(10,2)
    )
 ;
```

With a contract, dbt creates the table with explicit column types and then inserts the SELECT into it, instead of `create table as select`. The types come from the contract, not from whatever the SQL happens to produce.

> **On the job:** Write `data_type` exactly as the warehouse reports it (here `varchar`, `integer`, `decimal(10,2)`; in Snowflake `number(38,0)`, in BigQuery `int64`). The fastest way is to build the model once without a contract and copy the types from the warehouse catalog.

> **The main idea:** contract enforced = every column declared with a data_type; dbt checks names and types before building and creates the table with exactly that shape.

*Read more:* [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [contract config](https://docs.getdbt.com/reference/resource-configs/contract), [data_type](https://docs.getdbt.com/reference/resource-properties/data-types).

---

<a id="slide-17"></a>
## 17. Constraints: let the database refuse bad rows

*Part B · constraints, tests and contracts: who checks what, and when*

A **constraint** is a rule declared in the table’s DDL (`not null`, `primary key`, `unique`, `check`, `foreign key`) that the database checks while rows are inserted. With an enforced contract you can declare constraints per column; dbt adds them to the `create table`, and an enforced constraint makes the insert fail, so the old table stays in place.

#### Constraints on fct_orders

```yaml
# models/marts/_marts.yml (fct_orders, the changed columns)
      - name: order_id
        constraints:
          - type: not_null
          - type: primary_key
        data_tests: [unique]       # primary keys are not enforced on Snowflake or BigQuery
      - name: customer_key
        constraints: [{type: not_null}]   # replaces a not_null test that could never fail
      - name: amount
        constraints:
          - type: not_null
          - type: check
            expression: "amount > 0"
```

Terminal (output trimmed):

```text
$ dbt build --select fct_orders
1 of 6 OK created sql table model main_marts.fct_orders ........................ [OK in x.xxs]
3 of 6 PASS relationships_fct_orders_customer_key__customer_key__ref_dim_customer_  [PASS in x.xxs]
4 of 6 PASS relationships_fct_orders_date_key__date_key__ref_dim_date_ ......... [PASS in x.xxs]
5 of 6 PASS relationships_fct_orders_product_key__product_key__ref_dim_product_  [PASS in x.xxs]
6 of 6 PASS unique_fct_orders_order_id ......................................... [PASS in x.xxs]
Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6
```

```sql
# target/run/leafy/models/marts/fct_orders.sql (generated by dbt)
    create  table
      "leafy"."main_marts"."fct_orders__dbt_tmp"
  (
    order_id varchar not null primary key,
    date_key integer not null,
    customer_key varchar not null,
    product_key varchar not null,
    ordered_at_utc timestamp,
    amount decimal(10,2) not null check (amount > 0)
    )
 ;
```

#### A bad refactor, refused by the database

Terminal (output trimmed):

```text
$ dbt run --select fct_orders   # the SQL now produces negative amounts
1 of 1 ERROR creating sql table model main_marts.fct_orders .................... [ERROR in x.xxs]
  Constraint Error: CHECK constraint failed on table fct_orders__dbt_tmp with expression CHECK((amount > 0))
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    n, low = con.sql("select count(*), min(amount) from main_marts.fct_orders").fetchone()
print("rows:", n, " smallest amount:", low)
assert n == 16 and low > 0     # the old table is untouched: the failed build never replaced it
```

Output:

```text
rows: 16  smallest amount: 7.50
```

Executed in a scratch copy. DuckDB rejected the insert into the temporary table, so `fct_orders` still has yesterday’s 16 valid rows. A data test would have run *after* the bad table replaced the good one.

| Platform | Enforced at build | Declared only (metadata) |
|---|---|---|
| DuckDB (executed here) | not_null, primary_key, unique, check | foreign_key not tried |
| Postgres | all five | – |
| Snowflake | not_null | primary_key, unique, foreign_key |
| BigQuery | not_null | primary_key, foreign_key |
| Databricks | not_null, check | primary_key, foreign_key |

**Constraint, test or contract?** A contract checks the *shape* before building. An enforced constraint checks *each row* while building, for free. A data test checks *the data* after building and can express anything (relationships, reconciliation), but only reports. Where a platform enforces `not_null`, a `not_null` test on the same column is redundant; where it only declares a primary key, keep the `unique` test.

> **On the job:** Check your adapter’s constraint table before relying on one: on Snowflake a declared primary key is only metadata and duplicates load happily. Fabric Data Warehouse and other adapters have their own lists in the dbt adapter docs.

> **The main idea:** use enforced constraints for row rules the database checks for free, contracts for shape, and data tests for everything else, especially rules the platform only declares.

*Read more:* [constraints](https://docs.getdbt.com/reference/resource-properties/constraints), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [DuckDB constraints](https://duckdb.org/docs/stable/sql/constraints).

---

<a id="slide-18"></a>
## 18. An upstream schema change: what catches it, and what does not

*Part B · the web team ships app version 2.0*

On 8 March the web team releases a new app. Purchases now carry `amount_cents` (an integer) instead of `amount` (text), and a new `app_version` field. Nobody told the data team. The loader declares its columns explicitly, which is good practice, but it means an unknown field is silently ignored and the missing one becomes NULL:

#### What the loader does with the new payload

```python
import duckdb, json
line = {"event_id": "e39", "event_type": "purchase", "amount_cents": 1800, "app_version": "2.0.0"}
open("demo_v2.jsonl", "w").write(json.dumps(line) + "\n")
print(duckdb.sql("""select * from read_json('demo_v2.jsonl', format = 'newline_delimited',
                     columns = {event_id: 'VARCHAR', event_type: 'VARCHAR', amount: 'VARCHAR'})"""))
```

Output:

```text
┌──────────┬────────────┬─────────┐
│ event_id │ event_type │ amount  │
│ varchar  │  varchar   │ varchar │
├──────────┼────────────┼─────────┤
│ e39      │ purchase   │ NULL    │
└──────────┴────────────┴─────────┘
```

No error: the new field is dropped and `amount` is NULL. Purchases without an amount are “rejected” by `int_purchases`, exactly like e7.

#### Day 8 lands; the full build

Terminal:

```text
$ python scripts/load_raw.py --incident appv2
raw.events     47 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: appv2)
```

Terminal (output trimmed):

```text
$ dbt build   # day 8 from the new app
26 of 52 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
52 of 52 FAIL 1 assert_revenue_reconciles ...................................... [FAIL 1 in x.xxs]
Done. PASS=50 WARN=1 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=52
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select date_key, orders, charges, orders_usd, charges_usd, unexplained_usd
    from {{ ref('rec_daily_revenue') }}
    where date_key >= 20260307
    order by 1"
Previewing inline node:
| date_key | orders | charges | orders_usd | charges_usd | unexplained_usd |
| -------- | ------ | ------- | ---------- | ----------- | --------------- |
| 20260307 |      4 |       4 |      119.5 |       119.5 |             0.0 |
| 20260308 |      0 |       3 |        0.0 |        94.5 |            94.5 |
```

| Check | Result | Why |
|---|---|---|
| freshness | pass | the file arrived on time |
| `volume_vs_trailing` | pass | 8 rows, a normal day |
| keys, accepted values | pass | event ids and types are unchanged |
| `assert_purchases_conserved` | pass | the three purchases are counted as rejected (amount is NULL) |
| model contract on `fct_orders` | pass | names and types of the output did not change; there are just fewer rows |
| `assert_revenue_reconciles` | **fail** | 94.50 charged on 8 March, 0.00 in `fct_orders` |

> **On the job:** This is the most important lesson about contracts: a model contract protects consumers from *your* changes; it does not validate what producers send you. For inputs you need checks at the boundary (volume, reconciliation, null rates of required fields) and, better, a data contract the producer tests before releasing (lesson 24).

> **The main idea:** an unannounced upstream change passed freshness, volume, keys and the model contract; only the reconciliation against an independent system caught it.

*Read more:* [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [Data tests](https://docs.getdbt.com/docs/build/data-tests), [Sources](https://docs.getdbt.com/docs/build/sources).

---

<a id="slide-19"></a>
## 19. The fix, and the contract that stopped the first attempt in CI

*Part B · a type drift caught before it reached finance*

The data team adds the two new fields to the loader’s column list and teaches `stg_events` to read cents. The first commit looks right and the numbers would even be correct, but the CI build of the pull request fails:

#### First commit

```diff
# scripts/load_raw.py (the change)
-                 "ts": "VARCHAR", "amount": "VARCHAR", "product_id": "VARCHAR"}
+                 "ts": "VARCHAR", "amount": "VARCHAR", "product_id": "VARCHAR",
+                 "amount_cents": "VARCHAR", "app_version": "VARCHAR"}   # app 2.0 (2026-03-08)
```

```sql
# models/staging/stg_events.sql (first commit)
        coalesce(try_cast(trim(amount) as decimal(10, 2)),
                 try_cast(amount_cents as integer) / 100)   as amount,   -- app 2.0 sends cents
```

Terminal:

```text
$ python scripts/load_raw.py --incident appv2
raw.events     47 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: appv2)
```

Terminal (output trimmed):

```text
$ dbt build --select stg_events+   # what CI runs on the pull request
  This model has an enforced contract that failed.
  | column_name | definition_type | contract_type | mismatch_reason    |
  | ----------- | --------------- | ------------- | ------------------ |
  | amount      | DOUBLE          | DECIMAL(10,2) | data type mismatch |
Done. PASS=10 WARN=1 ERROR=1 SKIP=7 NO-OP=0 REUSED=0 TOTAL=19
[exit code 1]
```

In DuckDB, `integer / 100` is a `DOUBLE`, and `coalesce(decimal, double)` is a `DOUBLE` too. Without the contract, `fct_orders.amount` would silently have become a binary floating-point number: sums that end in …0000001 in finance’s export, and a type change for every consumer.

#### Second commit: cast explicitly

```sql
# models/staging/stg_events.sql (second commit)
        cast(coalesce(try_cast(trim(amount) as decimal(10, 2)),
                      try_cast(amount_cents as integer) / 100) as decimal(10, 2)) as amount,   -- app 2.0 sends cents
```

Terminal (output trimmed):

```text
$ dbt build --select stg_events+   # second commit
14 of 19 PASS relationships_fct_orders_customer_key__customer_key__ref_dim_customer_  [PASS in x.xxs]
15 of 19 PASS relationships_fct_orders_date_key__date_key__ref_dim_date_ ....... [PASS in x.xxs]
16 of 19 PASS relationships_fct_orders_product_key__product_key__ref_dim_product_  [PASS in x.xxs]
17 of 19 PASS unique_fct_orders_order_id ....................................... [PASS in x.xxs]
19 of 19 PASS assert_revenue_reconciles ........................................ [PASS in x.xxs]
Done. PASS=18 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=19
```

The contract passes, the three app-2.0 purchases are in `fct_orders`, and the reconciliation is green again. The raw data was then re-landed without the incident so the following lessons start from the normal week.

> **On the job:** Run `dbt build` for the changed models and their children in CI (`--select state:modified+`, next lesson) on every pull request. A contract failure there is cheap: it costs one more commit. The same failure found by a consumer costs an incident review.

> **The main idea:** the model contract caught a silent type change (DECIMAL to DOUBLE) in CI; fix it by casting explicitly, not by loosening the contract.

*Read more:* [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [State selection](https://docs.getdbt.com/reference/node-selection/state-selection), [data_type](https://docs.getdbt.com/reference/resource-properties/data-types).

---

<a id="slide-20"></a>
## 20. Breaking changes: dbt compares the contract with production

*Part B · catching a rename in the pull request, not in the dashboard*

A contract also protects consumers from deliberate changes. In CI, dbt compares the project with the **state** of production (its `manifest.json`, saved after each production run) and selects what changed with `state:modified`. For a contracted model it also classifies the change: removing or renaming a column, changing a type or removing a constraint is a **breaking change**; adding a column is not.

#### A pull request renames a column

```diff
# models/marts/fct_orders.sql (the change)
-    purchases.amount
+    purchases.amount as amount_usd
```

…with the contract and `rec_daily_revenue` updated to match, so the build itself is green. Production’s manifest was copied to `prod-artifacts/` first.

Terminal (output trimmed):

```text
$ dbt build --select state:modified+ --state prod-artifacts   # PR: rename amount to amount_usd
[WARNING]: Breaking change to contracted, unversioned model fct_orders (models\marts\fct_orders.sql)
While comparing to previous project state, dbt detected a breaking change to an unversioned model.
  - Columns were removed: 
    - amount
1 of 8 OK created sql table model main_marts.fct_orders ........................ [OK in x.xxs]
7 of 8 OK created sql table model main_marts.rec_daily_revenue ................. [OK in x.xxs]
Done. PASS=8 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=8
```

For an *unversioned* model dbt only warns, and the build succeeds: the dashboard that reads `amount` would break after the merge.

#### Make it a CI error

Terminal (output trimmed):

```text
$ dbt build --select state:modified+ --state prod-artifacts --warn-error-options '{"error": ["UnversionedBreakingChange"]}'
[ERROR]: Encountered an error:
Compilation Error
  [WARNING]: Breaking change to contracted, unversioned model fct_orders (models\marts\fct_orders.sql)
    - Columns were removed: 
      - amount
[exit code 2]
```

`--warn-error-options` added promotes chosen warnings to errors; in CI, `UnversionedBreakingChange` is the one to promote. For a *versioned* model (next lesson) dbt raises the error by itself and suggests a new version.

| Change to a contracted model | Breaking? |
|---|---|
| add a column | no |
| remove or rename a column | yes |
| change a data type | yes |
| remove a constraint; change materialization to ephemeral | yes |
| change the logic, same names and types | not detected: your judgement (lesson 25) |

> **On the job:** Slim CI in practice: production saves its artifacts; the pull-request job downloads them and runs `dbt build --select state:modified+ --defer --state prod-artifacts`, so only changed models and their children are built and unchanged parents are read from production. The breaking-change check comes with it for free.

> **The main idea:** state:modified compares contracts with production: unversioned breaking changes warn (promote them to errors in CI), versioned ones fail.

*Read more:* [State selection](https://docs.getdbt.com/reference/node-selection/state-selection), [Warnings and --warn-error-options](https://docs.getdbt.com/reference/global-configs/warnings), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [State comparison caveats](https://docs.getdbt.com/reference/node-selection/state-comparison-caveats).

---

<a id="slide-21"></a>
## 21. Model versions: ship a breaking change next to the old shape

*Part B · v1 for today’s consumers, v2 for the new shape*

Finance wants `amount` renamed to `amount_usd` and a `currency_code` column before Leafy sells in euros. Renaming breaks every consumer that reads `amount`. A **model version** lets both shapes live side by side: one model name, several numbered versions, each built as its own table. `latest_version` decides which version a plain `ref('fct_orders')` gets; newer versions are **prerelease** until you bump it, older ones are **old**.

#### Two files and a versions block

```text
# models/marts/
fct_orders_v1.sql   # the current SQL, moved
fct_orders_v2.sql   # the new shape
```

```yaml
# models/marts/_marts.yml (added under fct_orders)
    latest_version: 1
    versions:
      - v: 1
        config:
          alias: fct_orders              # v1 keeps the table name consumers already query
      - v: 2                             # prerelease: amount renamed, currency added
        columns:
          - include: all
            exclude: [amount]
          - name: amount_usd
            data_type: decimal(10,2)
            constraints:
              - type: not_null
              - type: check
                expression: "amount_usd > 0"
          - name: currency_code
            data_type: varchar
            data_tests:
              - accepted_values:
                  arguments: {values: ["USD"]}
```

Each version only lists how it *differs*: `include: all` inherits every column (with its type, constraints and tests) from the model, `exclude` drops `amount`, and the new columns are declared. The contract applies to both versions.

#### Build both

Terminal (output trimmed):

```text
$ dbt build --select fct_orders
1 of 12 OK created sql table model main_marts.fct_orders ....................... [OK in x.xxs]
2 of 12 OK created sql table model main_marts.fct_orders_v2 .................... [OK in x.xxs]
Done. PASS=12 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=12
```

Terminal (output trimmed):

```text
$ dbt ls --select version:prerelease --output name
fct_orders.v2
accepted_values_fct_orders_v2_currency_code__USD
relationships_fct_orders_v2_customer_key__customer_key__ref_dim_customer_
relationships_fct_orders_v2_date_key__date_key__ref_dim_date_
relationships_fct_orders_v2_product_key__product_key__ref_dim_product_
unique_fct_orders_v2_order_id
```

Terminal (output trimmed):

```text
$ dbt show --limit 3 --inline "select order_id, amount_usd, currency_code
    from {{ ref('fct_orders', v=2) }}
    order by ordered_at_utc"
Previewing inline node:
| order_id | amount_usd | currency_code |
| -------- | ---------- | ------------- |
| e3       |         64 | USD           |
| e5       |         25 | USD           |
| e6       |         18 | USD           |
```

v1 is built as `fct_orders` (the `alias`), so nothing changes for today’s readers; v2 is built as `fct_orders_v2`. Early adopters can try it with `ref('fct_orders', v=2)`.

| Reference | Resolves to |
|---|---|
| `ref('fct_orders')` | the `latest_version` (now v1) |
| `ref('fct_orders', v=2)` | exactly v2 (pinned) |
| `--select fct_orders` / `fct_orders.v2` / `version:latest` | all versions / one version / by status |

> **On the job:** Version only models with consumers you cannot update in the same pull request: other teams, dashboards, exports. For internal models, change the model and its children together. Plan breaking changes in batches (once or twice a year) rather than a new version for every column.

> **The main idea:** versions let a breaking change ship next to the old shape: one name, numbered versions, a latest_version for plain refs, and pins for those who need them.

*Read more:* [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions), [versions property](https://docs.getdbt.com/reference/resource-properties/versions), [latest_version](https://docs.getdbt.com/reference/resource-properties/latest_version).

---

<a id="slide-22"></a>
## 22. Deprecation: a date, warnings, and a migration window

*Part B · how v1 goes away without breaking anyone*

A **deprecation date** on a version says when it will be removed. dbt then warns every project that still references it, first that it is *slated* for deprecation, and after the date that it is past it. Together with versions this gives a standard migration path:

1. **v2 prerelease** (build it): early adopters test it
2. **bump latest_version** (announce): plain refs move to v2; v1 gets a deprecation date
3. **consumers migrate** (window): pins to v1 warn on every build
4. **remove v1** (after the date): move the alias to v2 if needed

#### Bump latest, deprecate v1, migrate one consumer

```yaml
# models/marts/_marts.yml (fct_orders, changed lines)
    latest_version: 2                    # bumped: plain refs now get v2
    versions:
      - v: 1
        deprecation_date: "2026-12-31T00:00:00+00:00"   # announced to consumers on 2026-10-01
```

```diff
# models/marts/rec_daily_revenue.sql (migrated)
-    select date_key, count(*) as orders, sum(amount) as orders_usd
+    select date_key, count(*) as orders, sum(amount_usd) as orders_usd
```

`rec_daily_revenue` uses a plain `ref`, so the bump moved it to v2 and it had to be migrated in the same pull request. Marketing has not migrated yet and pins v1:

```sql
# models/marketing/mkt_customer_orders.sql
-- mkt_customer_orders: orders and revenue per customer for the marketing dashboard.
-- Owned by marketing. Pinned to fct_orders v1 until it migrates (by the v1 deprecation date).
select
    c.customer_id,
    c.city,
    count(*)        as orders,
    sum(o.amount)   as revenue_usd
from {{ ref('fct_orders', v=1) }} as o
join {{ ref('dim_customer') }} as c using (customer_key)
group by c.customer_id, c.city
```

#### What every build now says

Terminal (output trimmed):

```text
$ dbt build --select fct_orders rec_daily_revenue+ mkt_customer_orders
[WARNING]: While compiling 'mkt_customer_orders': Found a reference to fct_orders.v1, which is slated for deprecation on '2026-12-31T00:00:00+00:00'. A new version of 'fct_orders' is available. Try it out: {{ ref('leafy', 'fct_orders', v='2') }}.
1 of 15 OK created sql table model main_marts.fct_orders ....................... [OK in x.xxs]
2 of 15 OK created sql table model main_marts.fct_orders_v2 .................... [OK in x.xxs]
13 of 15 OK created sql table model main_marketing.mkt_customer_orders ......... [OK in x.xxs]
14 of 15 OK created sql table model main_marts.rec_daily_revenue ............... [OK in x.xxs]
Done. PASS=15 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=15
```

Terminal (output trimmed):

```text
$ dbt parse   # the same project after the date (2026-09-30 in a scratch copy)
[WARNING]: Model fct_orders.v1 has passed its deprecation date of 2026-09-30T00:00:00+00:00. This model should be disabled or removed.
[WARNING]: While compiling 'mkt_customer_orders': Found a reference to fct_orders.v1, which was deprecated on '2026-09-30T00:00:00+00:00'. A new version of 'fct_orders' is available. Migrate now: {{ ref('leafy', 'fct_orders', v='2') }}.
```

Terminal (output trimmed):

```text
$ dbt ls --select version:old --output name
fct_orders.v1
relationships_fct_orders_v1_customer_key__customer_key__ref_dim_customer_
relationships_fct_orders_v1_date_key__date_key__ref_dim_date_
relationships_fct_orders_v1_product_key__product_key__ref_dim_product_
unique_fct_orders_v1_order_id
```

Before the date the warning is a reminder; after it, the model itself is flagged. dbt never deletes v1 for you: removing the file is a deliberate change after the window closes. Until then v1 is still built, tested and contracted.

> **On the job:** Announce the date where consumers will see it (release notes, the team channel, the model description), give a real window (one or two quarters for external consumers), and track who still pins the old version: `dbt ls --select +fct_orders.v1` lists the models in your project that still depend on it; exposures list the dashboards.

> **The main idea:** set a deprecation_date on the old version when you bump latest_version; dbt warns every consumer until they migrate, and you remove v1 after the date.

*Read more:* [deprecation_date](https://docs.getdbt.com/reference/resource-properties/deprecation_date), [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions), [latest_version](https://docs.getdbt.com/reference/resource-properties/latest_version).

---

<a id="slide-23"></a>
## 23. Access and groups: who may ref which model

*Part B · making the interface explicit*

A **group** is a named set of models with an **owner**. A model’s **access** says who may `ref` it: `private` (only models in its group), `protected` (any model in this project; the default) or `public` (any group, and other projects in a dbt Mesh setup). Access turns “please don’t build on `int_purchases`” into a rule dbt enforces at parse time. added

#### Groups, owners and access

```yaml
# models/_groups.yml
groups:
  - name: commerce
    owner: {name: Commerce analytics, email: commerce-analytics@leafy.example}
  - name: marketing
    owner: {name: Marketing analytics, email: marketing-analytics@leafy.example}
```

```yaml
# dbt_project.yml (models section, changed lines)
models:
  leafy:
    +group: commerce                 # owner of every model unless a folder says otherwise
    intermediate:
      +materialized: ephemeral
      +access: private                 # building blocks: only the commerce group may ref them
    marketing:
      +group: marketing
```

```yaml
# models/marts/_marts.yml (fct_orders config)
    config:
      contract: {enforced: true}
      access: public                     # any group (and, in dbt Mesh, other projects) may ref it
```

Terminal (output trimmed):

```text
$ dbt ls --select access:public --output name
fct_orders.v1
fct_orders.v2
accepted_values_fct_orders_v2_currency_code__USD
assert_purchases_conserved
relationships_fct_orders_v1_customer_key__customer_key__ref_dim_customer_
relationships_fct_orders_v1_date_key__date_key__ref_dim_date_
relationships_fct_orders_v1_product_key__product_key__ref_dim_product_
relationships_fct_orders_v2_customer_key__customer_key__ref_dim_customer_
relationships_fct_orders_v2_date_key__date_key__ref_dim_date_
relationships_fct_orders_v2_product_key__product_key__ref_dim_product_
unique_fct_orders_v1_order_id
unique_fct_orders_v2_order_id
```

Terminal (output trimmed):

```text
$ dbt ls --select access:private --output name
int_purchases
```

#### A private model, referenced from outside its group

Terminal (output trimmed):

```text
$ dbt parse   # a marketing model refs int_purchases (scratch copy)
Parsing Error
  Node model.leafy.mkt_purchases_raw attempted to reference node model.leafy.int_purchases, which is not allowed because the referenced node is private to the 'commerce' group.
[exit code 2]
```

The error appears at parse time, before anything runs, and names the owner group. The marketing model must use the public interface, `fct_orders`, which has a contract and versions.

Terminal (warnings and summary):

```text
$ dbt build
26 of 59 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
29 of 59 WARN 6 null_rate_stg_events_customer_id ............................... [WARN 6 in x.xxs]
Done. PASS=57 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=59
```

**Coming from C#:** `private` ≈ `private`, `protected` ≈ `internal` (visible inside the assembly, here the project), `public` ≈ `public`. A public model with a contract is like a public interface with a stable signature.

> **On the job:** A common governance rule: every public model has an enforced contract, an owner group and a description; private models can change freely. In multi-project dbt Mesh (a dbt platform feature, not executed here), only public models can be referenced from another project, so this is also how teams share models across repositories.

> **The main idea:** groups give models an owner; access (private, protected, public) decides who may ref them; public models are your interface and get contracts and versions.

*Read more:* [Model access](https://docs.getdbt.com/docs/mesh/govern/model-access), [Groups](https://docs.getdbt.com/docs/build/groups), [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions).

---

<a id="slide-24"></a>
## 24. Producer–consumer data contracts: agree before it breaks

*Part C · a contract the web team tests before releasing*

Lesson 18 showed the gap: nothing upstream promised anything. A **data contract** closes it. The producer (the web team) and the consumer (the data team) agree, in a file the producer owns: the schema, what each field means, quality rules, the delivery SLA, the owner, and how changes are announced. The **Open Data Contract Standard** (**ODCS**, maintained by Bitol under the Linux Foundation AI & Data) is a common YAML format for it; the **Data Contract CLI** lints it and tests data against it. added

#### The contract for web events (ODCS v3.2.0)

```yaml
# contracts/web_events.odcs.yaml
apiVersion: v3.2.0
kind: DataContract
id: leafy-web-events
name: Leafy web events
version: 1.0.0
status: active
team:
  name: web-platform                   # the producer owns this file and its changes
  members:
    - username: web-oncall
      role: owner
description:
  purpose: Website events (page views, carts, purchases, refunds) for analytics and finance.
  usage: Landed nightly into raw.events by the data team; purchases become orders in fct_orders.
  limitations: A file can be re-sent; the latest delivery wins. Times are ISO 8601 with an offset.
schema:
  - name: events
    physicalType: file
    description: One JSON object per line, one file per day (events_YYYY-MM-DD.jsonl).
    properties:
      - name: event_id
        logicalType: string
        required: true
      - name: user_id
        logicalType: string
        description: Logged-in customer id; null for guests.
      - name: event_type
        logicalType: string
        required: true
        quality:
          - metric: invalidValues
            arguments:
              validValues: [page_view, add_to_cart, purchase, refund]
            mustBe: 0
      - name: ts
        logicalType: string
        required: true
        description: Event time, ISO 8601 with a UTC offset.
      - name: amount
        logicalType: string
        description: Order amount in USD, a decimal string with two places (purchases and refunds).
      - name: product_id
        logicalType: string
    quality:
      - type: sql
        description: Every purchase carries an amount.
        query: select count(*) from events where event_type = 'purchase' and amount is null
        mustBe: 0
      - type: sql
        description: Amounts are decimal numbers.
        query: select count(*) from events where amount is not null and try_cast(amount as decimal(10, 2)) is null
        mustBe: 0
slaProperties:
  - property: latency                  # the freshness SLA, as agreed with the data team
    value: 26
    unit: h
  - property: frequency
    value: 1
    unit: d
servers:
  - server: landing                    # what the data team has received so far
    type: local
    path: ./data/raw/events_*.jsonl
    format: json
  - server: release-v1                 # sample output of the current app, in the producer's CI
    type: local
    path: ./data/incidents/redelivered/events_*.jsonl
    format: json
  - server: release-v2                 # sample output of the app 2.0 release candidate
    type: local
    path: ./data/incidents/appv2/events_*.jsonl
    format: json
```

#### Lint, then test three samples

Terminal:

```text
$ datacontract lint contracts/web_events.odcs.yaml
┌────────┬────────────────────────────────────────────┬───────┬─────────┐
│ Result │ Check                                      │ Field │ Details │
├────────┼────────────────────────────────────────────┼───────┼─────────┤
│ passed │ Data contract is valid against ODCS v3.2.0 │       │         │
└────────┴────────────────────────────────────────────┴───────┴─────────┘
🟢 Data contract is valid. Ran 1 checks. Took x.xx seconds.
```

Terminal (output trimmed):

```text
$ datacontract test --server release-v1 contracts/web_events.odcs.yaml
Testing contracts/web_events.odcs.yaml
Server: release-v1 (type=local, format=json, path=./data/incidents/redelivered/events_*.jsonl)
🟢 Data contract is valid. Ran 10 checks. Took x.xx seconds.
```

Terminal (output trimmed):

```text
$ datacontract test --server release-v2 contracts/web_events.odcs.yaml
Testing contracts/web_events.odcs.yaml
Server: release-v2 (type=local, format=json, path=./data/incidents/appv2/events_*.jsonl)
🔴 Data contract is invalid, found the following errors:
1) Every purchase carries an amount.: Actual custom_sql(events) was 3, expected = 0
[exit code 1]
```

Terminal (output trimmed):

```text
$ datacontract test --server landing contracts/web_events.odcs.yaml
Testing contracts/web_events.odcs.yaml
Server: landing (type=local, format=json, path=./data/raw/events_*.jsonl)
🔴 Data contract is invalid, found the following errors:
1) event_type Check that field event_type has invalid_count = 0: Actual 
invalid_count(event_type) was 1, expected = 0
2) Amounts are decimal numbers.: Actual custom_sql(events) was 1, expected = 0
3) Check that JSON has valid schema: data.event_type must be one of ['page_view', 
'add_to_cart', 'purchase', 'refund']
4) 2 checks: data.amount must be string or null
[exit code 1]
```

The producer’s CI tests a sample of each release against the contract: the current app passes; the 2.0 release candidate fails on “every purchase carries an amount”, *before* it ships. Run against everything already landed, the contract also finds two old problems that only the data team could see until now: e4’s event type `Page_View` (staging lower-cases it, so no dbt test ever complained) and e7’s amount “abc” (ticket WEB-1042).

The JSON-schema check passed for app 2.0 even though it sends two unknown fields: like the loader, a contract that allows extra fields only notices what is *missing* or wrong, so required fields and quality rules carry the weight.

> **On the job:** Data contracts are a social agreement first: they work when the producer owns the file, runs the test in their own CI, and has to bump the version to change it. On the consumer side, the same rules become source tests and loader checks, and the model contract protects the next team downstream. Kafka teams get a similar guarantee from a schema registry with compatibility rules (not executed here).

> **The main idea:** a data contract is the producer’s promise in a file: schema, meaning, quality, SLA, owner; the producer tests releases against it, so breaking changes fail in their CI.

*Read more:* [Open Data Contract Standard (ODCS)](https://bitol-io.github.io/open-data-contract-standard/), [ODCS on GitHub (Bitol, LF AI & Data)](https://github.com/bitol-io/open-data-contract-standard), [Data Contract CLI documentation](https://docs.datacontract.com/).

---

<a id="slide-25"></a>
## 25. A schema-change policy: what is breaking, and how to ship it anyway

*Part C · rules agreed once, applied to every change*

A **schema-change policy** is the part of the contract that says which changes are allowed, how they are versioned and how much notice consumers get. Most teams use **semantic versioning** for contracts: a *minor* version for compatible changes, a *major* version for breaking ones, and a breaking change ships with the **expand–contract** pattern: add the new field next to the old one, let consumers move, then remove the old one.

| Change | Breaking for consumers? | Policy at Leafy |
|---|---|---|
| add an optional field | no (if consumers ignore unknown fields) | minor version; announce in release notes |
| add a value to an enum (a new event type) | often: `accepted_values` tests and CASE ladders break | minor version, 2 weeks’ notice |
| widen a type (int → bigint, varchar(10) → varchar(50)) | usually no | minor version |
| rename or remove a field; narrow a type; make a field required | yes | major version; expand–contract; 1 quarter’s notice |
| same name and type, new meaning (dollars → cents, local time → UTC) | **yes, and invisible to schema checks** | treat as a rename: new field name |
| change the grain (one row per order → per order line) | yes | new dataset, not a new version |

#### App 2.0 as proposed: breaking

```diff
# contracts/web_events.v2_0.odcs.yaml (vs 1.0.0)
-version: 1.0.0
+version: 2.0.0
-      - name: amount
-        logicalType: string
+      - name: amount_cents
+        logicalType: integer
+      - name: app_version
+        logicalType: string
```

Terminal (output trimmed):

```text
$ datacontract breaking contracts/web_events.odcs.yaml contracts/web_events.v2_0.odcs.yaml
Summary
[ 1 Error ]  [ 3 Info ]
┌──────────┬─────────┬───────────────────────────────────────┐
│ Severity │ Change  │ Field                                 │
├──────────┼─────────┼───────────────────────────────────────┤
│ ERROR    │ Removed │ schema.events.properties.amount       │
│ INFO     │ Added   │ schema.events.properties.amount_cents │
│ INFO     │ Added   │ schema.events.properties.app_version  │
│ INFO     │ Updated │ version                               │
└──────────┴─────────┴───────────────────────────────────────┘
…
```

#### Expand first: 1.1.0 is compatible

```diff
# contracts/web_events.v1_1.odcs.yaml (vs 1.0.0)
-version: 1.0.0
+version: 1.1.0
+      - name: amount_cents
+        logicalType: integer
+      - name: app_version
+        logicalType: string
```

Terminal (output trimmed):

```text
$ datacontract breaking contracts/web_events.odcs.yaml contracts/web_events.v1_1.odcs.yaml
Summary
[ 3 Info ]
┌──────────┬─────────┬───────────────────────────────────────┐
│ Severity │ Change  │ Field                                 │
├──────────┼─────────┼───────────────────────────────────────┤
│ INFO     │ Added   │ schema.events.properties.amount_cents │
│ INFO     │ Added   │ schema.events.properties.app_version  │
│ INFO     │ Updated │ version                               │
└──────────┴─────────┴───────────────────────────────────────┘
…
```

The agreed plan: the web team ships 1.1.0 (both `amount` and `amount_cents`), the data team switches `stg_events` to cents (lesson 19 already reads both), and 2.0.0 removes `amount` after the notice period. `datacontract breaking` exits with 1 on a breaking change, so the web team’s CI blocks a major change that was not agreed.

> **On the job:** The same policy applies inside dbt: adding a column to a contracted mart is a minor change; renaming one needs a new model version with a deprecation date (lessons 21–22); incremental models need an `on_schema_change` decision (*dbt incremental models, snapshots and unit tests*, lesson 11). Write the policy into `TESTING.md` or the contract itself so every team applies the same rules.

> **The main idea:** classify every change as compatible or breaking, version contracts semantically, and ship breaking changes with expand–contract and a notice period; check it automatically in CI.

*Read more:* [Data Contract CLI documentation](https://docs.datacontract.com/), [Open Data Contract Standard (ODCS)](https://bitol-io.github.io/open-data-contract-standard/), [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions), [on_schema_change](https://docs.getdbt.com/docs/build/incremental-models#what-if-the-columns-of-my-incremental-model-change).

---

<a id="slide-26"></a>
## 26. Interview pattern: which mechanism for which risk?

*Part C · recognise the question, name the tool*

Interviewers rarely ask “what is fail_calc?”. They describe a situation and listen for the right mechanism, placed at the right layer, with an owner. Learn to map the situation to the tool:

| If you hear… | Reach for | Where | Who acts |
|---|---|---|---|
| “the dashboard showed yesterday’s numbers” | source freshness with warn/error SLAs; stop the job on error | sources | data on-call → producer |
| “the file was only half there” | relative volume test (newest batch vs trailing average) | sources | data on-call |
| “revenue doesn’t match Stripe / the ledger” | cross-system reconciliation with tolerance and known differences | marts | data engineer + finance |
| “rows disappeared after a refactor” | row conservation test; unit test for the join logic | marts / CI | PR author |
| “our tests are always red” | risk triage, delete can’t-fail tests, thresholds from data, owners | everywhere | test owners |
| “someone renamed a column and a dashboard broke” | enforced model contract + breaking-change check in CI | public marts | PR author |
| “we must rename it anyway” | new model version, deprecation date, migration window | public marts | model owner |
| “the upstream team changed the payload” | data contract tested in the producer’s CI; schema-change policy | between teams | producer |
| “someone built a report on our intermediate table” | groups and access: private | project | model owner |
| “the price was negative in the fact table” | enforced check constraint (or a data test where not enforced) | marts | PR author |

> **On the job:** A strong answer has three parts: the mechanism, why it fits better than the obvious alternative (“a not_null test would not catch this, because…”), and what happens when it fires (“the job stops and the producer is paged”). Practise saying all three in under a minute.

> **The main idea:** map the situation to a mechanism, a layer and an owner: freshness and volume at the boundary, reconciliation for money, contracts and versions for interfaces, data contracts between teams.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions).

---

<a id="slide-27"></a>
## 27. Lab: the Leafy quality gate, from the Jinja-and-macros project

*Project · build it yourself, then compare with the lab folder*

**Goal:** starting from a copy of `dbt-jinja-macros-project/`, build everything in this deck into one project, then prove it from an empty folder. Allow two hours. The reference solution is `data-quality-contracts-lab/` next to this deck ([README](data-quality-contracts-lab/README.md), [TESTING.md](data-quality-contracts-lab/TESTING.md)).

| Step | Build | Done when |
|---|---|---|
| 1 | Copy the fixtures and `scripts/load_raw.py` from the lab folder; add `payments_raw` and `stg_payments` (lessons 2–3) | `dbt build` green with one warning |
| 2 | Freshness SLAs on both sources; `volume_vs_trailing` on events (lessons 7, 10) | `--lag-hours 30` warns, `50` errors; the truncated incident fails the volume test |
| 3 | `null_rate` on guest purchases with `fail_calc` (lesson 9) | WARN 6, never error |
| 4 | Row conservation, `rec_daily_revenue`, `known_differences` (lessons 11–12) | reconciliation green with one documented difference |
| 5 | Contract and constraints on `fct_orders`; read `amount_cents` (lessons 16–19) | the first, uncast version fails the contract |
| 6 | Versions v1/v2, deprecation date, a pinned marketing model, groups and access (lessons 21–23) | deprecation warning; a private ref fails at parse |
| 7 | `TESTING.md` with the generated catalogue; the ODCS contract (lessons 14, 24–25) | catalogue up to date; `datacontract lint` valid |

#### The finished layout

```text
data-quality-contracts-lab/
  TESTING.md                      strategy, SLAs, owners, contracts policy, generated catalogue
  contracts/web_events*.odcs.yaml data contract with the web team (1.0.0, 1.1.0, 2.0.0)
  data/raw/                       a normal week: events_*.jsonl, payments/settlement_*.csv
  data/incidents/                 truncated/, redelivered/, appv2/ (day 2026-03-08)
  models/_groups.yml              commerce and marketing groups with owners
  models/staging/                 sources (freshness, volume), stg_events, stg_payments
  models/marts/                   fct_orders v1 + v2 (contract, constraints), rec_daily_revenue
  models/marketing/               mkt_customer_orders (pins fct_orders v1)
  seeds/known_differences.csv     explained reconciliation differences
  scripts/load_raw.py             EL with --through, --lag-hours, --incident
  scripts/test_inventory.py       test inventory and catalogue
  tests/                          conservation and reconciliation; generic null_rate, volume_vs_trailing
```

#### Verify from an empty folder

The lab folder was copied to a new place (no database, no `target/`) and run from scratch:

Terminal:

```text
$ python scripts/load_raw.py
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 1 h ago
```

Terminal (warnings and summary):

```text
$ dbt build
26 of 59 WARN 1 assert_no_unparseable_amounts .................................. [WARN 1 in x.xxs]
29 of 59 WARN 6 null_rate_stg_events_customer_id ............................... [WARN 6 in x.xxs]
Done. PASS=57 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=59
```

Terminal (output trimmed):

```text
$ dbt source freshness
1 of 2 PASS freshness of payments_raw.payments ................................. [PASS in x.xxs]
2 of 2 PASS freshness of shop_raw.events ....................................... [PASS in x.xxs]
Done.
```

Terminal:

```text
$ python scripts/test_inventory.py
44 data tests
duplicate candidates (same test, same column, upstream): 5
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    orders, revenue = con.sql("select count(*), sum(amount_usd) from main_marts.fct_orders_v2").fetchone()
    v1_rows = con.sql("select count(*) from main_marts.fct_orders").fetchone()[0]
    unexplained = con.sql("select sum(abs(unexplained_usd)) from main_marts.rec_daily_revenue").fetchone()[0]
print("fct_orders v2:", orders, "orders,", revenue, "USD;  v1 rows:", v1_rows, "; unexplained:", unexplained)
assert (orders, str(revenue), v1_rows, unexplained) == (16, "491.49", 16, 0)
```

Output:

```text
fct_orders v2: 16 orders, 491.49 USD;  v1 rows: 16 ; unexplained: 0.00
```

Terminal (output trimmed):

```text
$ datacontract test --server release-v1 contracts/web_events.odcs.yaml
Testing contracts/web_events.odcs.yaml
Server: release-v1 (type=local, format=json, path=./data/incidents/redelivered/events_*.jsonl)
🟢 Data contract is valid. Ran 10 checks. Took x.xx seconds.
```

> **On the job:** This is a portfolio-ready artefact: a README that runs end to end, a `TESTING.md` that explains the judgement behind the tests, and contracts that show you think about consumers. In an interview, walk through `TESTING.md` first and open the code only when asked.

> **The main idea:** one project with a written strategy, checks at the boundary, reconciliation for money, contracts and versions for consumers, and a data contract upstream, verified from an empty folder.

*Read more:* [Data tests](https://docs.getdbt.com/docs/build/data-tests), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions).

---

<a id="slide-28"></a>
## 28. Lab: the incident drill

*Project · four deliveries, four outcomes*

An **incident drill** replays bad deliveries on purpose to check that the right test fires, with the right severity, and that the runbook in `TESTING.md` makes sense. Run it in a fresh copy of the lab folder after a normal build:

#### 1 · Late (stale) and 2 · truncated

Terminal:

```text
$ python scripts/load_raw.py --lag-hours 50
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 50 h ago
```

Terminal (output trimmed):

```text
$ dbt source freshness
1 of 2 WARN freshness of payments_raw.payments ................................. [WARN in x.xxs]
2 of 2 ERROR STALE freshness of shop_raw.events ................................ [ERROR STALE in x.xxs]
[exit code 1]
```

Terminal:

```text
$ python scripts/load_raw.py --incident truncated
raw.events     41 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: truncated)
```

Terminal (output trimmed):

```text
$ dbt build
7 of 59 FAIL 25 source_volume_vs_trailing_shop_raw_events__batch_date__3 ....... [FAIL 25 in x.xxs]
Done. PASS=32 WARN=0 ERROR=1 SKIP=26 NO-OP=0 REUSED=0 TOTAL=59
[exit code 1]
```

The stale load stops the job at the first step. The truncated file fails the volume test on the source, so `dbt build` skips every model downstream of it: no half day reaches `fct_orders` or the reconciliation.

#### 3 · Redelivered and 4 · app 2.0

Terminal:

```text
$ python scripts/load_raw.py --incident redelivered
raw.events     47 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: redelivered)
```

Terminal (output trimmed):

```text
$ dbt build
Done. PASS=58 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=59
```

Terminal:

```text
$ python scripts/load_raw.py --incident appv2
raw.events     47 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: appv2)
```

Terminal (output trimmed):

```text
$ dbt build
Done. PASS=58 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=59
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select date_key, orders, charges, orders_usd, charges_usd, unexplained_usd
    from {{ ref('rec_daily_revenue') }}
    where date_key = 20260308"
Previewing inline node:
| date_key | orders | charges | orders_usd | charges_usd | unexplained_usd |
| -------- | ------ | ------- | ---------- | ----------- | --------------- |
| 20260308 |      3 |       3 |       94.5 |        94.5 |               0 |
```

The full redelivery makes the build green again. App 2.0’s cents are now read correctly (lesson 19), so 8 March reconciles to the cent. On the producer side, the same release candidate still fails the data contract until the web team ships version 1.1.0 (lesson 25).

| Delivery | Caught by | Severity | First action (from TESTING.md) |
|---|---|---|---|
| files 50 h old | source freshness | error: job stops | check the loader, then the producer |
| half a file | `volume_vs_trailing` | error: children skipped | compare with the producer; do not publish the day |
| full redelivery | nothing (correct) | – | close the incident |
| new payload, before the fix | `assert_revenue_reconciles` (lesson 18) | error | list unexplained orders, find the cause |
| new payload, before release | the data contract in the producer’s CI | blocks the release | agree an expand–contract plan |

> **On the job:** Run a drill whenever you add or change an important test, and after a real incident (with the real bad file). It is the only way to know that a test fires, and it is a great interview story: “we replayed last month’s truncated file and confirmed the volume test now stops the job”.

> **The main idea:** replay bad deliveries on purpose: each should be caught by the check you expect, at the severity you expect, with a first action written down.

*Read more:* [dbt source freshness](https://docs.getdbt.com/reference/commands/source), [Data tests](https://docs.getdbt.com/docs/build/data-tests), [Data Contract CLI documentation](https://docs.datacontract.com/).

---

<a id="slide-29"></a>
## 29. Bug clinic: data quality and contracts

*Bug clinic · believable bugs, their symptoms, and the fix*

| Symptom | Cause | Fix |
|---|---|---|
| Freshness errors right after every load | `loaded_at_field` is an event time, or a local time compared with UTC | use the landing time written by the loader, in UTC |
| Dashboards stale, yet “freshness is configured” | freshness is not part of `dbt build`; nobody runs it, or its exit code is ignored | run `dbt source freshness` as step 1 and stop on error |
| A test never errors despite `error_if` | `severity: warn` disables `error_if` | leave severity at error and use both thresholds (lesson 9) |
| Custom test fails with “is not of type integer” | `fail_calc` returns a decimal | round and cast the measured value to an integer |
| Revenue reconciliation off by exactly the refunds | refunds (negative) mixed into a revenue comparison | filter `payment_type = 'charge'`; reconcile refunds separately |
| Reconciliation off on days around midnight | one system groups by local date, the other by UTC | convert both to UTC (or both to the business time zone) before grouping |
| Volume test fails every Monday | weekly seasonality against a plain trailing average | compare with the same weekday, or widen the warn band |
| “data type mismatch: DOUBLE vs DECIMAL” after a harmless edit | implicit promotion (`int / 100`, `coalesce` of mixed types) | cast explicitly; never loosen the contract to pass |
| A rename merged and broke a dashboard despite the contract | unversioned model: dbt only *warns* on breaking changes | `--warn-error-options` with `UnversionedBreakingChange` in CI, or version the model |
| Duplicate keys in Snowflake despite `primary_key` | the constraint is declared, not enforced | keep a `unique` test where the platform does not enforce |
| `accepted_values` passes, but the column is half NULL | `accepted_values` ignores NULLs | add `not_null` when NULL is also wrong |
| v1 still used six months after its deprecation date | dbt only warns; nobody tracked the pins | `dbt ls --select +fct_orders.v1`, exposures, then remove v1 |

> **On the job:** Most of these are silent: the build is green and the numbers are wrong, or the build is red and nobody believes it. The fix is usually one line; finding it is the skill. When you hit one, add it to the “When a test fails” table in `TESTING.md`.

> **The main idea:** the classic failures are timing (time zones, freshness wiring), thresholds (severity, fail_calc), comparisons (refunds, dates) and contracts that only warn.

---

<a id="slide-30"></a>
## 30. Interview questions: test strategy and data quality

*Interview · say it in about 60 seconds, then open the answer*

Try answering aloud before opening each answer. The questions follow patterns that recur in data-engineering interviews (research, October 2026); the wording is original.

<details><summary>1 · What do you test at each layer of a dbt project, and what do you deliberately not test?</summary>

I test by risk. At the sources: freshness against an SLA and volume against recent loads, because late and incomplete deliveries are the most common incidents and I can’t fix them, only stop on them. In staging: primary keys unique and not null after dedupe, accepted codes and parse failures. In marts: business rules, relationships, row conservation and one reconciliation against an independent system for money. I don’t test columns that cannot fail given the SQL (counts, coalesced keys, generated calendars), I don’t re-test unchanged columns at every layer, and I don’t add tests nobody would act on.

**What the interviewer checks:** layered thinking, risk over coverage, awareness of noise.

**Follow-up:** “How many tests is too many?” → when failures stop leading to action; I look at how often each test fails and whether the failure was real, and delete or re-threshold the rest.

</details>

<details><summary>2 · Unit tests versus data tests?</summary>

A unit test checks the model’s logic on hand-written input rows with an exact expected output; it runs in dev and CI before the model is built and catches wrong rules and regressions. A data test checks the real data after a build, in every environment, and catches bad, late or unexpected source data. They catch different failures: a unit test can’t know the source started sending cents, and a data test can’t tell me my rounding is wrong on a case that hasn’t happened yet. In production I skip unit tests.

**What the interviewer checks:** that you know both exist (dbt 1.8+) and when each runs.

**Follow-up:** “Which models get unit tests?” → complex logic: dedupe order, CASE ladders, incremental filters, date boundaries.

</details>

<details><summary>3 · Our dbt tests are red every morning and people ignore them. What do you do?</summary>

First I measure: which tests fail, how often, and was it real. Then three moves. Delete tests that cannot fail or duplicate an upstream test. Re-threshold the rest from data: warn just above normal, error where the data becomes unusable, with fail_calc for percentages, and leave severity at error so error_if still works. And give every error-level test an owner and a first action in TESTING.md, routed to the person who can fix it. The goal is that red means act.

**What the interviewer checks:** alert-fatigue experience, warn_if/error_if/severity mechanics, ownership.

**Follow-up:** “What’s the gotcha with severity: warn?” → it ignores error_if, so the test can never fail the build.

</details>

<details><summary>4 · How do you know a source is late or incomplete?</summary>

Late: source freshness on a landing-time column, with warn_after and error_after set from how the producer delivers, run as the first step of the job so an error stops it. Incomplete: a volume test that compares the newest batch with the average of the last few, with a warn band for unusual and an error band for broken, because a static minimum misses half a file. Neither is part of dbt build by default for freshness, so I wire it into the scheduler.

**What the interviewer checks:** freshness mechanics, the landing-time vs event-time distinction, relative volume.

**Follow-up:** “The table is huge and max() is expensive.” → a freshness filter on recent partitions, or metadata-based freshness where the adapter supports it.

</details>

<details><summary>5 · Finance says revenue doesn’t match the payment provider. How do you prove where the gap is?</summary>

I build a reconciliation model at the grain finance checks, usually per day: orders total, charges total, and the difference, with a full outer join so a day missing on either side shows up. I filter to comparable records (charges only, same currency, same time zone for the date). Then a test fails when the unexplained difference is above a tolerance, and explained differences live in a documented list with tickets. Here it found an order the pipeline dropped because the app sent “abc” as the amount.

**What the interviewer checks:** cross-system thinking, grain, tolerance, handling known exceptions.

**Follow-up:** “It’s off by one day at midnight.” → time-zone mismatch between the two systems; align both to UTC before grouping.

</details>

> **The main idea:** answer by layer and by risk, name the threshold and the owner, and always say what happens when the test fires.

---

<a id="slide-31"></a>
## 31. Interview questions: contracts, versions and schema changes

*Interview · say it in about 60 seconds, then open the answer*

<details><summary>6 · What is a dbt model contract? How is it different from a test and from a constraint?</summary>

A model contract is a promise about the model’s shape: with contract enforced, every column is declared with a data type, and dbt checks the SQL’s output against it before building and fails if names or types differ. A data test runs after the build and checks values. A constraint is a rule in the table DDL, such as not null or check, that the database enforces row by row while inserting, but only where the platform enforces it: Snowflake enforces not null but not primary keys. So: contract for shape, constraints for cheap row rules, tests for everything else.

**What the interviewer checks:** precise mechanics and platform nuance.

**Follow-up:** “Where do you put contracts?” → only on public models other people depend on; elsewhere they slow refactoring.

</details>

<details><summary>7 · An upstream team changed a field and our revenue dropped. How would you have caught it before production?</summary>

Two places. Upstream, a data contract the producer tests in their CI on a sample of the new release: required fields, types, a rule like “every purchase has an amount”. At our boundary, checks on what arrives: volume, null rates of required fields, and a reconciliation against an independent system, because a model contract wouldn’t fire: our output shape didn’t change, only the values. And when we adapt our staging to the new field, the model contract on the mart catches type drift such as decimal becoming double in CI.

**What the interviewer checks:** that you know a model contract does not validate inputs.

**Follow-up:** “The producer won’t agree to a contract.” → test their output at ingestion anyway and quarantine bad batches; show the incident cost to get buy-in.

</details>

<details><summary>8 · You need to rename a column in a mart that three dashboards use. How do you ship it?</summary>

I don’t rename in place. I create a new model version with the new shape, keep v1 under the old table name, and test v2 as a prerelease. Then I bump latest_version so plain refs move to v2, migrate the models I own in the same pull request, and set a deprecation date on v1 that I announce to consumers. dbt warns everyone who still pins v1. After the date I remove v1 and, if needed, point the old table name at v2. In CI the breaking-change check stops anyone from doing the rename without a version.

**What the interviewer checks:** versions, deprecation, communication, CI enforcement.

**Follow-up:** “Isn’t that just a v2 table?” → mostly, but dbt tracks versions under one name, lets consumers pin, selects by version status and warns on deprecation.

</details>

<details><summary>9 · What is a data contract between teams, what is in it, and who owns it?</summary>

It is the producer’s written promise to its consumers: the schema with field meanings and units, quality rules, the delivery SLA, the owner and support channel, and the change policy with versions. The producer owns it and tests their output against it in their CI; the consumer helps write it and mirrors the important rules in their own checks. Formats like the Open Data Contract Standard make it machine-readable, so tools can lint it, test data against it and detect breaking changes between versions.

**What the interviewer checks:** ownership, contents beyond schema, enforcement.

**Follow-up:** “How is it different from a schema registry?” → a registry enforces schema compatibility for messages; a data contract also covers semantics, quality, SLAs and ownership.

</details>

<details><summary>10 · Which schema changes are breaking?</summary>

For consumers: removing or renaming a field, narrowing a type, making an optional field required, changing the grain, and changing the meaning without changing the type, like dollars to cents, which schema checks can’t see. Usually compatible: adding an optional field, widening a type. Adding an enum value is in between: it breaks accepted-values tests and CASE statements, so it needs notice. Breaking changes ship with expand–contract: add the new field, let consumers move, then remove the old one under a new major version.

**What the interviewer checks:** semantic vs structural compatibility; a migration pattern.

**Follow-up:** “How do you enforce it?” → a breaking-change check in CI: datacontract breaking for data contracts, the dbt state comparison for model contracts.

</details>

> **The main idea:** name the mechanism (contract, constraint, version, data contract), say where it runs and what it cannot catch, and end with how the change reaches consumers safely.

---

<a id="slide-32"></a>
## 32. Exercises 1–3: freshness, volume, thresholds

*Exercises · warm-ups, one concept each*

Work in the project from the lessons, or in `data-quality-contracts-lab/` (same state: the normal week loaded). Each solution was applied to a scratch copy of the project and run during the build; its output is real and its Python checks passed. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Predict the freshness status

*Pattern: “how do you monitor freshness?” · predict the output · about 5 minutes.* With the SLAs of lesson 7 (events warn 26 h / error 48 h; payments warn 36 h / error 60 h), predict the status of both sources when the newest files landed **20**, **40** and **70** hours ago, and the exit code of `dbt source freshness` in each case. Then check with `python scripts/load_raw.py --lag-hours N`.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · A volume test for the settlement files

*Pattern: “how would you catch a half-delivered file?” · write the config · about 10 minutes.* Add the `volume_vs_trailing` test of lesson 10 to `payments_raw.payments` with the same bands. Show that it passes on the normal week (settlement files of 5, 2, 2, 3, 3 and 4 rows), then land the truncated events incident and run it again. Expected: pass both times. Explain why it cannot replace the volume test on events.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Why does this test never fail?

*Pattern: “warn_if vs error_if vs severity” · find the bug · about 5 minutes.* A teammate wants guest purchases to **warn above 2%** and **fail the build above 3%**. Today the rate is 6%, yet the build only warns. Find the bug in the config and fix it. Expected after the fix: the test fails.

```yaml
# models/staging/_staging.yml (stg_events.customer_id)
          - null_rate:
              config:
                where: "event_type = 'purchase'"
                fail_calc: "coalesce(max(null_pct), 0)"
                severity: warn
                warn_if: "> 2"
                error_if: "> 3"
```

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

---

<a id="slide-33"></a>
## 33. Exercises 4–5: reconciliation

*Exercises · interview level*

Work in the project from the lessons, or in `data-quality-contracts-lab/` (same state: the normal week loaded). Each solution was applied to a scratch copy of the project and run during the build; its output is real and its Python checks passed. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 4 · Reconcile two marts: the funnel and the orders

*Pattern: “two dashboards show different numbers” · write the query · about 15 minutes.* `fct_daily_funnel.purchase_events` and the number of rows in `fct_orders` are both “purchases per day”. Write a singular test `tests/assert_funnel_matches_orders.sql` that fails on any day where they disagree for an unexplained reason. Expected: passes on the normal week.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · The reconciliation fails after a clean-up

*Pattern: “revenue doesn’t match: debug it” · find and fix the bug · about 10 minutes.* After a teammate’s “clean-up” pull request, `assert_revenue_reconciles` fails on two days: 3 March (−5.00 unexplained) and 6 March (−25.00). Nothing changed in the data. Find the cause and fix it without touching the test or the known differences.

```sql
# models/marts/rec_daily_revenue.sql (the PR, excerpt)
charges as (
    select cast(strftime(captured_date_utc, '%Y%m%d') as integer) as date_key,
           count(*) as charges, sum(amount_usd) as charges_usd
    from {{ ref('stg_payments') }}
    group by 1
),
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

---

<a id="slide-34"></a>
## 34. Exercises 6–8: contracts and versions

*Exercises · interview level*

Work in the project from the lessons, or in `data-quality-contracts-lab/` (same state: the normal week loaded). Each solution was applied to a scratch copy of the project and run during the build; its output is real and its Python checks passed. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 6 · Which edits break the contract?

*Pattern: “contract vs test” · predict the output · about 10 minutes.* For each edit to `fct_orders_v2.sql`, predict whether `dbt run --select fct_orders.v2` succeeds and, if not, the `mismatch_reason`: (a) swap the first two columns of the SELECT; (b) cast `date_key` to `bigint`; (c) add a column `purchases.amount > 50 as is_large_order`.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · A CI gate for a breaking change

*Pattern: “how would you have caught the rename before production?” · write the CI step · about 15 minutes.* Marketing now reads `dim_customer` directly. (1) Give it an enforced contract and `access: public`. (2) Save the production state (`dbt parse`, copy `target/manifest.json` to `prod-artifacts/`). (3) A pull request removes `signup_date` from the model and its YAML. Write the CI step, as a small Python script, that blocks this pull request. Expected: exit code 2 and the removed column named.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Version a model with a deprecation date

*Pattern: “ship a breaking change to a shared model” · write the config · about 15 minutes.* Marketing asks for `city` to be renamed `customer_city` in `dim_customer`. Ship it as v2 next to v1, keep v1 as the default and under its current table name, and give v1 a deprecation date of 2027-03-31. Expected: tables `dim_customer` (v1) and `dim_customer_v2`, with the right column names.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

---

<a id="slide-35"></a>
## 35. Exercises 9–11: take-home, design and review

*Exercises · stretch*

Work in the project from the lessons, or in `data-quality-contracts-lab/` (same state: the normal week loaded). Each solution was applied to a scratch copy of the project and run during the build; its output is real and its Python checks passed. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 9 · Take-home: reconcile refunds and document it

*Pattern: take-home “extend the quality checks and document them” · about 30 minutes.* Refunds are excluded from the revenue reconciliation. Add a test that reconciles refund *events* (positive `amount`, `event_type = 'refund'`) with the provider’s refunds (negative `amount_usd`) per UTC day. Add its first action to “When a test fails” in `TESTING.md` and refresh the catalogue. Expected: the test passes (5.00 on 3 March, 25.00 on 6 March) and appears in the catalogue.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Design: a data contract for the payment provider

*Pattern: “what would you put in a data contract?” · design task · about 30 minutes.* Write an ODCS contract for the settlement files: the owner, every field with a type and whether it is required, the allowed payment types, the sign rule (charges positive, refunds negative), the 36-hour SLA, and a server that points at the landed CSV files. Lint it, test it against the normal week, then check what the provider’s proposed v2 (amount in cents instead of USD) would mean. Expected: valid, all checks pass, and v2 reported as breaking.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

### Exercise 11 · Review: keep or drop these five tests?

*Pattern: “our tests are noisy” / code review of tests · explain the trade-off · about 10 minutes.* A pull request adds five tests. All five pass today. For each, decide keep or drop, and if you keep it, at what severity. Expected: three kept, two dropped, and a one-line reason for each.

- (1) `not_null` on `fct_orders` v2 `currency_code`
- (2) `unique` on `rec_daily_revenue.date_key`
- (3) `relationships` from `stg_payments.order_id` to `stg_events.event_id`
- (4) `not_null` on `stg_events.event_type` (which already has `accepted_values`)
- (5) `accepted_values` on `dim_customer.city`: Austin, Denver, Seattle, Unknown

*Hint: [Appendix A](#hint-11) · Solution: [Appendix B](#solution-11)*

---

<a id="slide-36"></a>
## 36. Cheat sheet

*Reference · the deck on one page*

#### Test strategy and thresholds

| Need | Write |
|---|---|
| freshness SLA | `config: {loaded_at_field: _loaded_at, freshness: {warn_after: {count: 26, period: hour}, error_after: {…}}}` on the source |
| run it | `dbt source freshness` (not part of build) → `target/sources.json` |
| build only fresh parts | `--select source_status:fresher+ --state prev-run` |
| threshold on a measured value | `config: {fail_calc: "coalesce(max(pct), 0)", warn_if: "> 5", error_if: "> 20"}` |
| two-sided band | `warn_if: "not between 50 and 200"` |
| the gotcha | `severity: warn` ignores `error_if` |
| volume | newest batch vs trailing average (`volume_vs_trailing`) |
| reconciliation | rows in = rows out + rejected; system A vs system B per day, tolerance, known differences |
| strategy doc | `TESTING.md` + `scripts/test_inventory.py --catalogue TESTING.md` |

#### Contracts, versions, access

| Need | Write |
|---|---|
| enforce a contract | `config: {contract: {enforced: true}}` + `data_type` on every column |
| row rules | `constraints: [{type: not_null}, {type: check, expression: "amount > 0"}]` |
| breaking-change gate in CI | `--select state:modified+ --state prod-artifacts --warn-error-options '{"error": ["UnversionedBreakingChange"]}'` |
| versions | `latest_version: 1`, `versions: [{v: 1, config: {alias: fct_orders}}, {v: 2, columns: [{include: all, exclude: [amount]}, …]}]` |
| pin a version | `ref('fct_orders', v=1)` |
| deprecate | `deprecation_date: "2026-12-31T00:00:00+00:00"` on the old version |
| select by version | `version:latest`, `version:prerelease`, `version:old` |
| ownership and access | `groups:` with owner; `+group`; `access: private \| protected \| public` |
| data contract (Data Contract CLI 1.2.4) | `datacontract lint` · `test --server X` · `breaking old new` |

| Layer | Test there | Do not test there |
|---|---|---|
| sources | freshness, volume, keys present | what you cannot fix (typos) |
| staging | primary keys, accepted codes, parse failures, null rates | unchanged columns tested upstream |
| marts | relationships, business rules, conservation, reconciliation; contract on public models | columns that cannot fail (counts, coalesced keys, calendars) |

> **The main idea:** freshness and volume at the boundary, keys and codes in staging, rules and reconciliation in marts; contracts, versions and access for interfaces; data contracts upstream.

---

<a id="slide-37"></a>
## 37. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Producer / consumer | The team or system that creates a dataset / the one that reads it |
| Test strategy | The decisions about which failures to guard against, where, how loudly, and who acts |
| Risk | Likelihood × impact of a failure; decides whether a test is worth its cost |
| Test bloat | Tests that grow faster than the risks they cover: slow builds, many alerts |
| Noise | A test that fails without anyone needing to act |
| Source freshness | How long ago data last landed in a source, compared with warn_after / error_after |
| loaded_at_field | The column dbt uses for freshness; should be the landing time |
| SLA | Service-level agreement: how stale or late data may get before someone must act |
| sources.json | The artifact written by dbt source freshness: status, age, criteria per source table |
| source_status:fresher | Selector for sources whose newest load is newer than in a saved state |
| fail_calc | The SQL that turns a test’s rows into the “failures” number (default count(*)) |
| warn_if / error_if | SQL comparisons on the failures number that decide warn and error |
| Volume test | A check on how many rows arrived; relative = compared with recent batches |
| Batch | One delivery (here one daily file), identified by _batch_date |
| Reconciliation test | A test that two independent numbers for the same thing agree |
| Row conservation | Rows in = rows out + rows rejected for a stated reason |
| Known difference | A documented, explained reconciliation gap with a ticket |
| TESTING.md | The written test strategy at the root of the project |
| Contract (general) | An explicit, checked promise from a producer to its consumers |
| Model contract | dbt’s enforced promise about a model’s column names and data types |
| Preflight check | dbt’s comparison of the SQL’s output columns with the contract before building |
| Constraint | A rule in the table DDL (not null, primary key, unique, check, foreign key) |
| Enforced / declared constraint | Checked by the database on insert / stored as metadata only |
| Breaking change | A change that can break consumers: removing, renaming or retyping a column |
| State (state:modified) | Comparison with a saved manifest.json from production |
| --warn-error-options | Turns chosen dbt warnings (such as UnversionedBreakingChange) into errors |
| Model version | One numbered shape of a model; several can be live at once |
| latest_version | The version a plain ref() resolves to; newer = prerelease, older = old |
| deprecation_date | When an old version will be removed; dbt warns its consumers |
| Group / access | A set of models with an owner / who may ref a model: private, protected, public |
| Data contract | An agreement between teams: schema, meaning, quality, SLA, owner, change policy |
| ODCS | Open Data Contract Standard: a YAML format for data contracts (Bitol, LF AI & Data) |
| Schema-change policy | Rules for which changes are allowed, how they are versioned, and the notice period |
| Semantic versioning | major.minor.patch: major for breaking changes, minor for compatible ones |
| Expand–contract | Add the new field next to the old one, migrate consumers, then remove the old one |
| Incident drill | Replaying bad deliveries on purpose to check the right test fires |

---

<a id="slide-38"></a>
## 38. What to remember, and what comes next

*Reference · recap*

1. **Test by risk and layer:** freshness and volume at the source, keys and codes in staging, rules and reconciliation in marts; delete tests that cannot fail or that nobody acts on.
2. **Freshness** compares the landing time with warn/error SLAs; run it first and stop on error. **Volume** compares the newest batch with recent ones.
3. **Thresholds** are SQL: `fail_calc` measures, `warn_if`/`error_if` compare, and `severity: warn` disables `error_if`.
4. **Reconcile** rows through each step and money against an independent system, with a tolerance and documented known differences.
5. **Write it down** in `TESTING.md`, with owners and first actions, and generate the catalogue from the manifest.
6. **Model contracts** guarantee shape before building; constraints refuse bad rows where the platform enforces them; contracts do not validate inputs.
7. **Breaking changes** are caught against production state; ship them as **versions** with a **deprecation date**; use **access** to mark the interface.
8. **Data contracts** move the checks to the producer, with a schema-change policy and expand–contract migrations.

#### Practise this week

- Redo the lab from `dbt-jinja-macros-project/` without looking, then compare with `data-quality-contracts-lab/`.
- Do exercises 3, 5 and 7 again without hints.
- Explain aloud in a minute each: what you test per layer, contract vs test vs constraint, how you ship a breaking change.
- Fuel Smart: write `TESTING.md`, add freshness and volume to the USDA and Open Food Facts loads, and put a contract on the mart your dashboard reads.

#### Coming up

Next in the dbt track: CI/CD and deployment (environments, `state:modified+` with `--defer`, artifacts, scheduling) and orchestration. Packages, the project evaluator and SQL linting are in *dbt packages and project quality*; unit tests and incremental testing in *dbt incremental models, snapshots and unit tests*.

> **The main idea:** a few well-placed tests with owners beat many noisy ones; contracts, versions and data contracts turn tables into dependable interfaces.

*Read more:* [dbt blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder), [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [Model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions).

---

<a id="slide-39"></a>
## 39. References and how this deck was tested

*References · official documentation*

- [data tests](https://docs.getdbt.com/docs/build/data-tests), [severity, warn_if, error_if](https://docs.getdbt.com/reference/resource-configs/severity), [fail_calc](https://docs.getdbt.com/reference/resource-configs/fail_calc), [where](https://docs.getdbt.com/reference/resource-configs/where), [store_failures](https://docs.getdbt.com/reference/resource-configs/store_failures), [writing custom generic tests](https://docs.getdbt.com/best-practices/writing-custom-generic-tests).
- [freshness](https://docs.getdbt.com/reference/resource-properties/freshness), [dbt source freshness](https://docs.getdbt.com/reference/commands/source), [source freshness in deployment](https://docs.getdbt.com/docs/deploy/source-freshness), [source_status selection](https://docs.getdbt.com/reference/node-selection/methods#source_status).
- [model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts), [contract config](https://docs.getdbt.com/reference/resource-configs/contract), [constraints](https://docs.getdbt.com/reference/resource-properties/constraints), [DuckDB constraints](https://duckdb.org/docs/stable/sql/constraints).
- [model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions), [versions](https://docs.getdbt.com/reference/resource-properties/versions), [latest_version](https://docs.getdbt.com/reference/resource-properties/latest_version), [deprecation_date](https://docs.getdbt.com/reference/resource-properties/deprecation_date), [model access](https://docs.getdbt.com/docs/mesh/govern/model-access), [groups](https://docs.getdbt.com/docs/build/groups).
- [state selection](https://docs.getdbt.com/reference/node-selection/state-selection), [state comparison caveats](https://docs.getdbt.com/reference/node-selection/state-comparison-caveats), [warnings and --warn-error-options](https://docs.getdbt.com/reference/global-configs/warnings).
- [Open Data Contract Standard](https://bitol-io.github.io/open-data-contract-standard/), [ODCS on GitHub](https://github.com/bitol-io/open-data-contract-standard), [Data Contract CLI](https://docs.datacontract.com/).
- [dbt Labs blog: Test smarter, not harder](https://docs.getdbt.com/blog/test-smarter-not-harder) (identifying and prioritising data-quality concerns).
- Further interview practice: [30 dbt interview questions (analyticsengineering.com)](https://www.analyticsengineering.com/resources/dbt-interview-questions-and-answers).

**Testing:** built with dbt-core 1.12.5, dbt-duckdb 1.11.0 and DuckDB 1.5.6 on CPython 3.12.10 (Windows 11), and Data Contract CLI 1.2.4 in a separate virtual environment. The build copied the exported project of *dbt Jinja and macros* into a scratch folder, added the fixtures and the loader, and ran every lesson in order; broken variants and exercise solutions ran in separate copies. The finished project was exported to `data-quality-contracts-lab/` and rebuilt from an empty folder (the lab), including the incident drill. Freshness ages are relative to the clock by design (the loader stamps the landing time), so statuses are reproducible. Not executed: dbt platform features (cross-project refs, Catalog, alerts) and a schema registry. Output normalisation: leading clock times removed, durations replaced by `x.xx`, absolute paths replaced by placeholders, repeated warning lines shown once, some long outputs trimmed (labelled).

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Predict the freshness status

Compare each age with both thresholds of each source; the exit code is non-zero only if some source reaches `error_after`.

<a id="hint-2"></a>
### Hint 2 · A volume test for the settlement files

The test is generic: only the YAML changes. Which rows does the truncated incident actually cut short?

<a id="hint-3"></a>
### Hint 3 · Why does this test never fail?

Re-read the table “severity → result” in lesson 9.

<a id="hint-4"></a>
### Hint 4 · Reconcile two marts: the funnel and the orders

Start with the naive comparison and look at the failing day with `--store-failures`. Lesson 11 says what to add to make the two sides comparable.

<a id="hint-5"></a>
### Hint 5 · The reconciliation fails after a clean-up

Negative unexplained amounts mean the provider side is *smaller*. Which payments are negative?

<a id="hint-6"></a>
### Hint 6 · Which edits break the contract?

The preflight check compares names, types and the number of columns, and lesson 16 says one thing it ignores.

<a id="hint-7"></a>
### Hint 7 · A CI gate for a breaking change

Without a version, dbt only warns about a breaking change (lesson 20). One flag turns that specific warning into an error.

<a id="hint-8"></a>
### Hint 8 · Version a model with a deprecation date

Lessons 21–22: move the SQL to `dim_customer_v1.sql`, add `dim_customer_v2.sql`, and describe v2 by difference with `include`/`exclude`. The excluded column must be declared at the model level first.

<a id="hint-9"></a>
### Hint 9 · Take-home: reconcile refunds and document it

Same shape as lesson 12: two aggregates per day, a `full outer join`, a sign flip on one side.

<a id="hint-10"></a>
### Hint 10 · Design: a data contract for the payment provider

Start from `contracts/web_events.odcs.yaml` (lesson 24). CSV columns are typed when read, so use `number` and `timestamp` where the values are numbers and times.

<a id="hint-11"></a>
### Hint 11 · Review: keep or drop these five tests?

Ask the three questions of lesson 6 for each: can it fail given the SQL, is it already covered, and would anyone act? One of them hides a subtle gap in an existing test.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was applied to a scratch copy of the project and run during the build; the outputs shown are real (clock times and durations normalised), and the Python checks (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Predict the freshness status

Terminal:

```text
$ python scripts/load_raw.py --lag-hours 40
raw.events     39 rows from 6 files, newest delivery 2026-03-07
raw.payments   19 rows from 6 files, newest delivery 2026-03-07
newest files landed 40 h ago
```

Terminal (output trimmed):

```text
$ dbt source freshness   # files landed 40 h ago
1 of 2 WARN freshness of payments_raw.payments ................................. [WARN in x.xxs]
2 of 2 WARN freshness of shop_raw.events ....................................... [WARN in x.xxs]
```

```python
import json
expected = {20: ("pass", "pass"), 40: ("warn", "warn"), 70: ("error", "error")}   # (events, payments)
for lag, want in expected.items():
    results = json.load(open(f"fresh_{lag}.json", encoding="utf-8"))["results"]
    got = {r["unique_id"].split(".")[2]: r["status"] for r in results}
    print(f"{lag} h:", got)
    assert (got["shop_raw"], got["payments_raw"]) == want
```

Output:

```text
20 h: {'payments_raw': 'pass', 'shop_raw': 'pass'}
40 h: {'shop_raw': 'warn', 'payments_raw': 'warn'}
70 h: {'payments_raw': 'error', 'shop_raw': 'error'}
```

**Why.** 20 h is under every threshold; 40 h is past both warnings but under both errors; 70 h is past both errors, so the command exits with 1. **Common wrong answer:** “40 h is an error for events because events land daily”: the SLA, not the delivery rhythm, decides. **Interviewer follow-up:** “the source is loaded every 15 minutes” → thresholds in minutes, freshness run on its own frequent schedule, and a `filter` so `max()` scans only recent partitions.

<a id="solution-2"></a>
### Solution 2 · A volume test for the settlement files

```yaml
# models/staging/_sources.yml (payments_raw.payments)
      - name: payments
        description: One row per settled payment (charges and refunds). Refund amounts are negative.
        data_tests:
          - volume_vs_trailing:
              arguments: {batch_column: _batch_date, lookback: 3}
              config:
                fail_calc: "coalesce(max(pct_of_trailing), 100)"
                warn_if: "not between 50 and 200"
                error_if: "not between 30 and 400"
```

Terminal (output trimmed):

```text
$ dbt test --select source:payments_raw   # the normal week
1 of 1 PASS source_volume_vs_trailing_payments_raw_payments__batch_date__3 ..... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal:

```text
$ python scripts/load_raw.py --incident truncated
raw.events     41 rows from 7 files, newest delivery 2026-03-08
raw.payments   22 rows from 7 files, newest delivery 2026-03-08
newest files landed 1 h ago (incident: truncated)
```

Terminal (output trimmed):

```text
$ dbt test --select source:payments_raw   # after the truncated events file
1 of 1 PASS source_volume_vs_trailing_payments_raw_payments__batch_date__3 ..... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```python
import json
results = json.load(open("target/run_results.json", encoding="utf-8"))["results"]
status = lambda part: next(r["status"] for r in results if part in r["unique_id"])
print(status("volume_vs_trailing_payments"))
assert status("volume_vs_trailing_payments") == "pass"   # the settlement file for 8 March was complete
```

Output:

```text
pass
```

**Why.** Newest batch 4 rows against an average of 2.7 is 150%, inside the warn band. The truncated incident only cut the *events* file; the provider’s settlement for 8 March is complete (3 rows, 90%), so this test rightly passes. Each producer can fail independently, so each source needs its own volume test. **Common wrong answer:** one volume test on `fct_orders`: by then a half day is already in the mart, and orders legitimately vary. **Interviewer follow-up:** “three payments a day is too small for percentages” → for tiny feeds use absolute bounds (at least one file and one row per day) and rely on reconciliation for completeness.

<a id="solution-3"></a>
### Solution 3 · Why does this test never fail?

Terminal (output trimmed):

```text
$ dbt test --select test_name:null_rate   # as written
1 of 1 WARN 6 null_rate_stg_events_customer_id ................................. [WARN 6 in x.xxs]
[WARNING]: Got 6 results, configured to warn if > 2
Done. PASS=0 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt test --select test_name:null_rate   # severity line removed
1 of 1 FAIL 6 null_rate_stg_events_customer_id ................................. [FAIL 6 in x.xxs]
  Got 6 results, configured to fail if > 3
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

```python
import json
results = json.load(open("target/run_results.json", encoding="utf-8"))["results"]
status = lambda part: next(r["status"] for r in results if part in r["unique_id"])
print(status("null_rate"))
assert status("null_rate") == "fail"      # 6% > 3%: the build now stops
```

Output:

```text
fail
```

**Why.** With `severity: warn` dbt never evaluates `error_if`; the default severity (`error`) checks `error_if` first and falls back to `warn_if`. **Common wrong answer:** lowering `error_if` further: it is ignored at any value. **Interviewer follow-up:** “now make it fail only in production, warn in dev” → make the thresholds depend on the target, for example `error_if: "{{ '> 3' if target.name == 'prod' else '> 100' }}"`, and document why.

<a id="solution-4"></a>
### Solution 4 · Reconcile two marts: the funnel and the orders

Terminal (output trimmed):

```text
$ dbt test --select assert_funnel_matches_orders --store-failures   # first version
1 of 1 FAIL 1 assert_funnel_matches_orders ..................................... [FAIL 1 in x.xxs]
  Got 1 result, configured to fail if != 0
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select * from main_dbt_test__audit.assert_funnel_matches_orders"
Previewing inline node:
| date_key | purchase_events | orders |
| -------- | --------------- | ------ |
| 20260302 |               5 |      4 |
```

```sql
# tests/assert_funnel_matches_orders.sql
-- Purchases counted by the funnel = orders in fct_orders + purchases rejected for an
-- unparseable amount, per UTC day. Two marts built from the same events must agree.
with orders as (
    select date_key, count(*) as orders from {{ ref('fct_orders') }} group by 1
),
rejected as (
    select cast(strftime(cast(event_at_utc as date), '%Y%m%d') as integer) as date_key,
           count(*) as rejected
    from {{ ref('stg_events') }}
    where event_type = 'purchase' and amount is null
    group by 1
)
select f.date_key, f.purchase_events, coalesce(o.orders, 0) as orders, coalesce(r.rejected, 0) as rejected
from {{ ref('fct_daily_funnel') }} as f
left join orders as o using (date_key)
left join rejected as r using (date_key)
where f.purchase_events <> coalesce(o.orders, 0) + coalesce(r.rejected, 0)
```

Terminal (output trimmed):

```text
$ dbt test --select assert_funnel_matches_orders   # with the rejects
1 of 1 PASS assert_funnel_matches_orders ....................................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```python
import json
results = json.load(open("target/run_results.json", encoding="utf-8"))["results"]
status = lambda part: next(r["status"] for r in results if part in r["unique_id"])
assert status("assert_funnel_matches_orders") == "pass"
print("funnel and orders agree on every day")
```

Output:

```text
funnel and orders agree on every day
```

**Why.** The funnel counts every purchase event; `fct_orders` drops purchases whose amount does not parse (e7 on 2 March). Comparable sides are “funnel purchases” and “orders + rejected”, the conservation rule of lesson 11, now per day. **Common wrong answer:** the first version, or adding a tolerance of 1 so it passes: that would also hide a real dropped order. **Interviewer follow-up:** “the funnel uses the user’s local date” → the two marts no longer share a grain; convert to one time zone before comparing, or the test fails around midnight.

<a id="solution-5"></a>
### Solution 5 · The reconciliation fails after a clean-up

Terminal (output trimmed):

```text
$ dbt build --select rec_daily_revenue+ --store-failures   # after the clean-up PR
2 of 2 FAIL 2 assert_revenue_reconciles ........................................ [FAIL 2 in x.xxs]
  Got 2 results, configured to fail if != 0
Done. PASS=1 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt show --limit 50 --inline "select date_key, orders_usd, charges_usd, unexplained_usd
    from main_dbt_test__audit.assert_revenue_reconciles
    order by 1"
Previewing inline node:
| date_key | orders_usd | charges_usd | unexplained_usd |
| -------- | ---------- | ----------- | --------------- |
| 20260303 |        7.5 |         2.5 |              -5 |
| 20260306 |       89.0 |        64.0 |             -25 |
```

Terminal (output trimmed):

```text
$ dbt build --select rec_daily_revenue+   # filter restored
2 of 2 PASS assert_revenue_reconciles .......................................... [PASS in x.xxs]
Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2
```

```python
import json
results = json.load(open("target/run_results.json", encoding="utf-8"))["results"]
status = lambda part: next(r["status"] for r in results if part in r["unique_id"])
assert status("assert_revenue_reconciles") == "pass"
print("reconciled again")
```

Output:

```text
reconciled again
```

**Why.** The PR removed `where payment_type = 'charge'`, so refunds (−5.00 for e11, −25.00 for e27) were netted into “charges”. Revenue and refunds are reconciled separately because orders and refunds are different facts. **Common wrong answer:** adding the refunds to `known_differences`: that documents a bug as if it were a business fact. **Interviewer follow-up:** “finance wants net revenue” → build net revenue on both sides (orders minus refund events vs charges plus refunds), and keep the gross reconciliation too.

<a id="solution-6"></a>
### Solution 6 · Which edits break the contract?

Terminal (output trimmed):

```text
$ dbt run --select fct_orders.v2   # (a) swap the first two columns of the SELECT
1 of 1 OK created sql table model main_marts.fct_orders_v2 ..................... [OK in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal (output trimmed):

```text
$ dbt run --select fct_orders.v2   # (b) cast date_key to bigint
  | column_name | definition_type | contract_type | mismatch_reason    |
  | ----------- | --------------- | ------------- | ------------------ |
  | date_key    | BIGINT          | INTEGER       | data type mismatch |
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

Terminal (output trimmed):

```text
$ dbt run --select fct_orders.v2   # (c) add a column is_large_order
  | column_name    | definition_type | contract_type | mismatch_reason     |
  | -------------- | --------------- | ------------- | ------------------- |
  | is_large_order | BOOLEAN         |               | missing in contract |
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
[exit code 1]
```

```python
# observed = {variant: status of fct_orders.v2 in that run}, read from run_results.json after each run
print(observed)
assert observed == {"a": "success", "b": "error", "c": "error"}
```

Output:

```text
{'a': 'success', 'b': 'error', 'c': 'error'}
```

**Why.** (a) Column order is ignored; the table is created in the contract’s order. (b) `BIGINT` ≠ `INTEGER`: a data type mismatch, even though every value fits. (c) A new column is a non-breaking change for consumers, but it still has to be declared: “missing in contract”. **Common wrong answer:** “(c) passes because adding columns is non-breaking”: non-breaking means you may add it *to the contract* without a new version. **Interviewer follow-up:** “so is a contract just a test?” → no: it runs before the build, fixes the DDL types, and lets dbt classify changes as breaking against production.

<a id="solution-7"></a>
### Solution 7 · A CI gate for a breaking change

```yaml
# models/marts/_marts.yml (dim_customer, step 1)
  - name: dim_customer
    description: Conformed customer dimension. One row per customer plus an unknown member (customer_id = '-1').
    config:
      contract: {enforced: true}
      access: public
    columns:
      - name: customer_key
        data_type: varchar
        description: Surrogate key, md5(customer_id).
        data_tests: [unique, not_null]
      - name: customer_id
        data_type: varchar
        description: Natural key from the CRM.
        data_tests: [unique, not_null]
      - name: customer_name
        data_type: varchar
      - name: city
        data_type: varchar
      - name: signup_date
        data_type: date
```

Terminal (output trimmed):

```text
$ dbt build --select dim_customer   # with the new contract
1 of 7 OK created sql table model main_marts.dim_customer ...................... [OK in x.xxs]
Done. PASS=7 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=7
```

```python
import subprocess
gate = ["dbt", "build", "--select", "state:modified+", "--state", "prod-artifacts",
        "--warn-error-options", '{"error": ["UnversionedBreakingChange"]}']
run = subprocess.run(gate, capture_output=True, text=True, encoding="utf-8")
log = run.stdout + run.stderr
print("exit code:", run.returncode)
print(next(line.strip() for line in log.splitlines() if "Breaking change" in line))
assert run.returncode == 2 and "Columns were removed" in log
```

Output:

```text
exit code: 2
[WARNING]: Breaking change to contracted, unversioned model dim_customer (models\marts\dim_customer.sql)
```

**Why.** `state:modified+` compares the contract with production’s manifest; removing a column of a contracted, unversioned model raises the `UnversionedBreakingChange` warning, and `--warn-error-options` makes it fatal, so the CI job fails before anything is built. **Common wrong answer:** `--warn-error` (all warnings become errors): the deprecation warnings for `fct_orders` v1 would then fail every pull request. **Interviewer follow-up:** “but the column really must go” → version `dim_customer` (exercise 8) or get the consumers’ sign-off and merge with an explicit override in the pipeline.

<a id="solution-8"></a>
### Solution 8 · Version a model with a deprecation date

```yaml
# models/marts/_marts.yml (dim_customer, added lines)
    latest_version: 1
    versions:
      - v: 1
        deprecation_date: "2027-03-31T00:00:00+00:00"
        config:
          alias: dim_customer
      - v: 2
        columns:
          - include: all
            exclude: [city]
          - name: customer_city
```

Terminal (output trimmed):

```text
$ dbt build --select dim_customer
[WARNING]: While compiling 'mkt_customer_orders': Found a reference to fct_orders.v1, which is slated for deprecation on '2026-12-31T00:00:00+00:00'. A new version of 'fct_orders' is available. Try it out: {{ ref('leafy', 'fct_orders', v='2') }}.
[WARNING]: While compiling 'fct_orders': Found a reference to dim_customer.v1, which is slated for deprecation on '2027-03-31T00:00:00+00:00'. 
[WARNING]: While compiling 'mkt_customer_orders': Found a reference to dim_customer.v1, which is slated for deprecation on '2027-03-31T00:00:00+00:00'. 
1 of 12 OK created sql table model main_marts.dim_customer ..................... [OK in x.xxs]
2 of 12 OK created sql table model main_marts.dim_customer_v2 .................. [OK in x.xxs]
Done. PASS=12 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=12
```

```python
import duckdb
with duckdb.connect("leafy.duckdb", read_only=True) as con:
    cols = lambda t: [r[0] for r in con.sql(f"describe main_marts.{t}").fetchall()]
    v1, v2 = cols("dim_customer"), cols("dim_customer_v2")
print("v1:", v1)
print("v2:", v2)
assert "city" in v1 and "customer_city" in v2 and "city" not in v2
```

Output:

```text
v1: ['customer_key', 'customer_id', 'customer_name', 'city', 'signup_date']
v2: ['customer_key', 'customer_id', 'customer_name', 'customer_city', 'signup_date']
```

**Why.** Each version is its own table; the `alias` keeps v1 at the old name, so every existing query keeps working, while v2 is available as `ref('dim_customer', v=2)`. Because `fct_orders` and the marketing model reference `dim_customer` (latest = v1), dbt warns that they depend on a version slated for deprecation: the migration list writes itself. **Common wrong answer:** setting `latest_version: 2` straight away: every plain `ref` moves to v2 at once, which is the breaking change you wanted to avoid. **Interviewer follow-up:** “how do you know when v1 can go?” → no refs left in the project (`dbt ls --select +dim_customer.v1`), exposures checked, and warehouse query logs show no reads of the old table.

<a id="solution-9"></a>
### Solution 9 · Take-home: reconcile refunds and document it

```sql
# tests/assert_refunds_reconcile.sql
-- Refund events (positive amounts) must match the provider's refunds (negative), per UTC day.
with events as (
    select cast(event_at_utc as date) as day, sum(amount) as refunds_usd
    from {{ ref('stg_events') }}
    where event_type = 'refund'
    group by 1
),
provider as (
    select captured_date_utc as day, -sum(amount_usd) as refunds_usd
    from {{ ref('stg_payments') }}
    where payment_type = 'refund'
    group by 1
)
select coalesce(e.day, p.day) as day, e.refunds_usd as events_usd, p.refunds_usd as provider_usd
from events as e
full outer join provider as p on e.day = p.day
where coalesce(e.refunds_usd, 0) <> coalesce(p.refunds_usd, 0)
```

Terminal (output trimmed):

```text
$ dbt test --select assert_refunds_reconcile
1 of 1 PASS assert_refunds_reconcile ........................................... [PASS in x.xxs]
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Terminal:

```text
$ python scripts/test_inventory.py --catalogue TESTING.md
45 data tests
TESTING.md: catalogue rewritten (45 tests)
```

```python
text = open("TESTING.md", encoding="utf-8").read()
catalogue = text.split("<!-- catalogue:start -->")[1]
rows = [line for line in catalogue.splitlines() if "singular" in line]
print("\n".join(rows))
assert any("assert_refunds_reconcile" in r for r in rows)
```

Output:

```text
| staging | `stg_events` | singular: `assert_no_unparseable_amounts` | warn | any failure |
| staging | `stg_events` | singular: `assert_refunds_reconcile` | error | any failure |
| marts | `fct_orders.v2` | singular: `assert_purchases_conserved` | error | any failure |
| marts | `rec_daily_revenue` | singular: `assert_revenue_reconciles` | error | any failure |
```

**Why.** Both sides are reduced to “refunded USD per UTC day” with the same sign; the full outer join makes a refund that exists in only one system visible. Documenting the first action is what turns a test into an operational control. **Common wrong answer:** comparing `sum(amount_usd)` without flipping the sign: every refund day fails. **Interviewer follow-up:** “refund events arrive a day after the provider’s refund” → reconcile on a rolling window (for example two days) or match by order, and say which you chose and why in `TESTING.md`.

<a id="solution-10"></a>
### Solution 10 · Design: a data contract for the payment provider

```yaml
# contracts/payments.odcs.yaml
apiVersion: v3.2.0
kind: DataContract
id: leafy-payment-settlements
name: Payment provider settlement files
version: 1.0.0
status: active
team:
  name: finance-operations              # owns the relationship with the payment provider
description:
  purpose: Settled charges and refunds, one CSV per day, used to reconcile revenue.
schema:
  - name: payments
    physicalType: file
    properties:
      - name: payment_id
        logicalType: string
        required: true
        unique: true
      - name: order_id
        logicalType: string
        required: true
      - name: type
        logicalType: string
        required: true
        quality:
          - metric: invalidValues
            arguments:
              validValues: [charge, refund]
            mustBe: 0
      - name: amount_usd
        logicalType: number
        required: true
        description: USD with two decimals; refunds are negative.
      - name: currency
        logicalType: string
        required: true
      - name: captured_at_utc
        logicalType: timestamp
        required: true
    quality:
      - type: sql
        description: Charges are positive and refunds negative.
        query: select count(*) from payments where (type = 'charge' and amount_usd <= 0) or (type = 'refund' and amount_usd >= 0)
        mustBe: 0
slaProperties:
  - property: latency
    value: 36
    unit: h
servers:
  - server: landing
    type: local
    path: ./data/raw/payments/settlement_*.csv
    format: csv
```

Terminal:

```text
$ datacontract lint contracts/payments.odcs.yaml
┌────────┬────────────────────────────────────────────┬───────┬─────────┐
│ Result │ Check                                      │ Field │ Details │
├────────┼────────────────────────────────────────────┼───────┼─────────┤
│ passed │ Data contract is valid against ODCS v3.2.0 │       │         │
└────────┴────────────────────────────────────────────┴───────┴─────────┘
🟢 Data contract is valid. Ran 1 checks. Took x.xx seconds.
```

Terminal (output trimmed):

```text
$ datacontract test contracts/payments.odcs.yaml
Testing contracts/payments.odcs.yaml
Server: landing (type=local, format=csv, path=./data/raw/payments/settlement_*.csv)
🟢 Data contract is valid. Ran 15 checks. Took x.xx seconds.
```

Terminal (output trimmed):

```text
$ datacontract breaking contracts/payments.odcs.yaml contracts/payments.v2.odcs.yaml
Summary
[ 1 Error ]  [ 2 Info ]
┌──────────┬─────────┬─────────────────────────────────────────┐
│ Severity │ Change  │ Field                                   │
├──────────┼─────────┼─────────────────────────────────────────┤
│ INFO     │ Added   │ schema.payments.properties.amount_cents │
│ ERROR    │ Removed │ schema.payments.properties.amount_usd   │
│ INFO     │ Updated │ version                                 │
└──────────┴─────────┴─────────────────────────────────────────┘
…
```

```python
import subprocess
run = lambda *args: subprocess.run(["datacontract", *args], capture_output=True, text=True, encoding="utf-8").returncode
codes = {"test v1": run("test", "contracts/payments.odcs.yaml"),
         "breaking v1 -> v2": run("breaking", "contracts/payments.odcs.yaml", "contracts/payments.v2.odcs.yaml")}
print(codes)
assert codes == {"test v1": 0, "breaking v1 -> v2": 1}
```

Output:

```text
{'test v1': 0, 'breaking v1 -> v2': 1}
```

**Why.** The contract captures what the reconciliation silently relies on: one row per payment, two types, signed amounts, USD, a timestamp in UTC, a daily delivery. The cents proposal removes `amount_usd`, so it is breaking even though the information is the same; it needs a major version and an expand–contract plan. **Common wrong answer:** a contract with only names and types: the sign rule and the allowed values are what protect the reconciliation. **Interviewer follow-up:** “the provider is an external company that won’t run your tool” → you run the contract test at ingestion on each file, quarantine failures, and keep the contract as the documented basis for escalations.

<a id="solution-11"></a>
### Solution 11 · Review: keep or drop these five tests?

Terminal (output trimmed):

```text
$ dbt build --select stg_events stg_payments dim_customer fct_orders rec_daily_revenue   # with the PR
Done. PASS=35 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=37
```

| Test | Verdict | Reason |
|---|---|---|
| (1) not_null currency_code | drop | the column is a literal `'USD'`: it cannot be NULL; `accepted_values` already guards a future change |
| (2) unique rec_daily_revenue.date_key | keep | finance queries this table by day; a join change could duplicate days and double the totals |
| (3) payments → events relationships | keep, warn | names the exact order missing from the web events; the reconciliation stays the error-level gate |
| (4) not_null event_type | keep | `accepted_values` ignores NULLs, so a NULL type would pass unnoticed |
| (5) accepted_values city | drop | a new city is business growth, not a data error: it would fail for good news |

Terminal (output trimmed):

```text
$ dbt build --select stg_events stg_payments dim_customer fct_orders rec_daily_revenue   # after the review
Done. PASS=33 WARN=2 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=35
```

```python
# baseline_tests: number of data tests in the manifest before the PR
import json
nodes = json.load(open("target/manifest.json", encoding="utf-8"))["nodes"].values()
tests = [n for n in nodes if n["resource_type"] == "test"]
present = {(n["attached_node"].split(".")[2], n["column_name"], n["test_metadata"]["name"])
           for n in tests if n.get("test_metadata") and n.get("attached_node")}
kept = {("stg_events", "event_type", "not_null"), ("stg_payments", "order_id", "relationships"),
        ("rec_daily_revenue", "date_key", "unique")}
dropped = {("fct_orders", "currency_code", "not_null"), ("dim_customer", "city", "accepted_values")}
print("tests before the PR:", baseline_tests, " after the review:", len(tests))
assert kept <= present and not (dropped & present) and len(tests) == baseline_tests + 3
```

Output:

```text
tests before the PR: 44  after the review: 47
```

**Why.** “It passes” is not a reason to keep a test, and “it might be redundant” is not a reason to drop one: what matters is whether it can fail for a real problem and whether someone acts. **Common wrong answer:** dropping (4) as a duplicate of `accepted_values`: the NULL gap is exactly what makes it necessary. **Interviewer follow-up:** “marketing wants to know about new cities” → that is a report or a monitor (a weekly list of new values), not a failing test.
