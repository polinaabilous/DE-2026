# Study materials

The lesson decks now live with the tracker in [`tracker/ae-tracker/decks/`](../tracker/ae-tracker/decks/), so they are published with the app and open from each lesson panel and the Library. This page is an index by learning area. Links are relative, so serve the **repository root** locally (`python -m http.server 8000 --bind 127.0.0.1`) or browse them on GitHub.

## Getting started

| Deck | Lessons | Files |
| --- | --- | --- |
| **uv quick guide** | Minimal lab · Python for data engineering (part) | [Guide](../tracker/ae-tracker/decks/tools/uv-quick-guide.md) |
| **DuckDB quick guide** | Minimal lab | [Guide](../tracker/ae-tracker/decks/tools/duckdb-quick-guide.md) |

## Advanced SQL

| Deck | Lessons | Files |
| --- | --- | --- |
| **Window functions** · 19 slides | Window functions · Time-based analysis (part) · How a query runs (part) | [Deck](../tracker/ae-tracker/decks/sql-window-functions/sql-window-functions.html) |
| **Classic SQL patterns** · 14 slides | Classic SQL patterns · Interview foundations: explain and practice (part) · Interview: timed SQL & Python (part) | [Deck](../tracker/ae-tracker/decks/sql-patterns/sql-patterns.html) · [Lab file](../tracker/ae-tracker/decks/sql-patterns/sql-interview-patterns-lab.sql) |
| **Query structure: recursion and clean SQL** · 18 slides | Time-based analysis (part) · Query structure and style · How a query runs (part) | [Deck](../tracker/ae-tracker/decks/sql-query-structure/sql-query-structure.html) |
| **SQL correctness: joins, grain, and NULLs** · 35 slides | Joins and grain · Interview foundations: explain and practice (part) | [Deck](../tracker/ae-tracker/decks/sql-joins-grain/sql-joins-grain.html) · [Markdown](../tracker/ae-tracker/decks/sql-joins-grain/sql-joins-grain.md) |
| **SQL aggregation** · 26 slides | Advanced aggregation · Query structure and style (part) | [Deck](../tracker/ae-tracker/decks/sql-aggregation/sql-aggregation.html) · [Markdown](../tracker/ae-tracker/decks/sql-aggregation/sql-aggregation.md) |

## Python for data

| Deck | Lessons | Files |
| --- | --- | --- |
| **Python foundations for data engineering** · 48 slides | Python for data engineering | [Deck](../tracker/ae-tracker/decks/python-foundations/python-foundations.html) · [Markdown](../tracker/ae-tracker/decks/python-foundations/python-foundations.md) |
| **Python files, generators, and practical data scripts** · 51 slides | Python for data engineering | [Deck](../tracker/ae-tracker/decks/python-files-streams/python-files-streams.html) · [Markdown](../tracker/ae-tracker/decks/python-files-streams/python-files-streams.md) |
| **pandas for data engineering, with a Polars bridge** · 55 slides | DataFrames: pandas & Polars | [Deck](../tracker/ae-tracker/decks/pandas-polars/pandas-polars.html) · [Markdown](../tracker/ae-tracker/decks/pandas-polars/pandas-polars.md) |
| **Reliable Python ingestion: APIs and files to Parquet** · 52 slides | Ingestion engineering | [Deck](../tracker/ae-tracker/decks/python-ingestion/python-ingestion.html) · [Markdown](../tracker/ae-tracker/decks/python-ingestion/python-ingestion.md) |

## Data modeling

| Deck | Lessons | Files |
| --- | --- | --- |
| **Why dimensional modeling** · 19 slides | Why dimensional modeling · Requirements & bus matrix (part) | [Deck](../tracker/ae-tracker/decks/dim-why-dimensional/dim-why-dimensional.html) |
| **Fact tables** · 13 slides | Fact tables | [Deck](../tracker/ae-tracker/decks/dim-fact-tables/dim-fact-tables.html) |
| **Dimension tables** · 20 slides | Dimension tables | [Deck](../tracker/ae-tracker/decks/dim-dimension-tables/dim-dimension-tables.html) |
| **Model a business end to end** · 17 slides | Requirements & bus matrix (part) · Interview: modeling, metrics & dbt cases (part) | [Deck](../tracker/ae-tracker/decks/dim-modeling-project/dim-modeling-project.html) |

## dbt

| Deck | Lessons | Files |
| --- | --- | --- |
| **dbt fundamentals: source data to trusted marts** · 43 slides | dbt fundamentals · Modern modeling adaptations (part) · Test strategy (part) | [Deck](../tracker/ae-tracker/decks/dbt-fundamentals/dbt-fundamentals.html) · [Markdown](../tracker/ae-tracker/decks/dbt-fundamentals/dbt-fundamentals.md) · [Lab project](../tracker/ae-tracker/decks/dbt-fundamentals/dbt-fundamentals-project/README.md) |
| **dbt Jinja and macros: templates, loops, reusable SQL** · 15 slides | Jinja, macros, packages (part) · Incremental, snapshots, unit tests (part) | [Deck](../tracker/ae-tracker/decks/dbt-jinja-macros/dbt-jinja-macros.html) · [Markdown](../tracker/ae-tracker/decks/dbt-jinja-macros/dbt-jinja-macros.md) · [Lab project](../tracker/ae-tracker/decks/dbt-jinja-macros/dbt-jinja-macros-project/README.md) |

## Metrics & statistics

| Deck | Lessons | Files |
| --- | --- | --- |
| **Business models and metrics: commerce, SaaS, marketplace, product, operations** · 24 slides | Business models & metrics (part) | [Deck](../tracker/ae-tracker/decks/business-metrics-models/business-metrics-models.html) · [Markdown](../tracker/ae-tracker/decks/business-metrics-models/business-metrics-models.md) |
| **Metric design: define the number before writing SQL** · 36 slides | Requirements & bus matrix (part) · Metric design · Experimentation (part) · Semantic layer modeling (part) · Requirements & stakeholders (part) · Writing (part) · Incidents & trust (part) | [Deck](../tracker/ae-tracker/decks/metric-design/metric-design.html) · [Markdown](../tracker/ae-tracker/decks/metric-design/metric-design.md) |
| **Diagnosing metric changes: trees, mix shift, and the weekly business review** · 21 slides | Diagnosing metric changes · Statistics essentials (part) · Storytelling & dashboards (part) | [Deck](../tracker/ae-tracker/decks/metric-diagnosis/metric-diagnosis.html) · [Markdown](../tracker/ae-tracker/decks/metric-diagnosis/metric-diagnosis.md) |

## Performance & cost

| Deck | Lessons | Files |
| --- | --- | --- |
| **File formats in practice** · 20 slides | Semi-structured data (part) · Columnar warehouses (part) · Ingestion engineering (part) | [Deck](../tracker/ae-tracker/decks/data-file-formats/data-file-formats.html) · [Markdown](../tracker/ae-tracker/decks/data-file-formats/data-file-formats.md) · [Data formats one-page reference](../tracker/ae-tracker/decks/data-file-formats/de-data-formats-one-page.html) |

## Spark & Databricks

| Deck | Lessons | Files |
| --- | --- | --- |
| **Table formats in practice** · 16 slides | Delta Lake + Iceberg basics (part) · Storage architecture (part) · Ingestion tools & CDC (part) | [Deck](../tracker/ae-tracker/decks/data-table-formats/data-table-formats.html) · [Markdown](../tracker/ae-tracker/decks/data-table-formats/data-table-formats.md) · [Data formats one-page reference](../tracker/ae-tracker/decks/data-file-formats/de-data-formats-one-page.html) |

Lessons without a deck show “No deck yet” in the tracker; planned decks and reusable prompts are in [the study deck roadmap](study-planning/study-deck-roadmap.md).

## Other materials

| Topic | Materials |
| --- | --- |
| SQL practice | [DataLemur catalog](sql/datalemur/index.html) · [Catalog notes and exports](sql/datalemur/README.md) |
| Study planning | [Fuel Smart project brief](study-planning/fuel-smart-project-brief.md) · [Future decks and reusable prompts](study-planning/study-deck-roadmap.md) · [Roadmap mockup](study-planning/roadmap-mockup.html) · [Full study plan](../tracker/analytics-engineer-prep-plan.md) |

To add a deck, put its folder under `tracker/ae-tracker/decks/<slug>/` and register it in `tracker/ae-tracker/data.js` (see [development notes](../tracker/docs/development.md#decks)); then add it to this index.
