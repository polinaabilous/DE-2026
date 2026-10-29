# Data engineering learning and interview preparation

My workspace for learning data engineering, practising SQL and Python, and preparing for Data Engineer interviews. The learning path builds from SQL, modeling and dbt into broader pipeline and platform skills.

## Start here

- [Open the learning tracker](https://de-roadmap.web.app) for the roadmap, lesson checks, resources, notes and interview-practice progress.
- [Preparation plan](tracker/data-engineer-prep-plan.md) describes the learning path and application checkpoints.
- [Flight Reliability project brief](tracker/planning/flights-project-brief.md) defines the current portfolio project: Python ingestion → Parquet → DuckDB and dbt → tested marts → a route explorer.

## Folder map

| Folder | Purpose |
| --- | --- |
| [data-engineering-lab/](data-engineering-lab/README.md) | Personal SQL and Python practice, exercises and attempts |
| [books/](books/) | Local book references |
| [tracker/](tracker/README.md) | Learning tracker app, curriculum, hosting configuration and maintenance tools |
| [tracker/de-tracker/decks/](tracker/de-tracker/decks/) | Published lessons and their self-contained teaching labs and reference solutions |
| [tracker/content/](tracker/content/) | Authored content and SQL catalog inputs used by the tracker builders |
| [tracker/planning/](tracker/planning/README.md) | Current project brief, reading map and deck roadmap; historical plans and audits in `archive/` |
| [tracker/scripts/](tracker/scripts/) | Catalog exports, generated-content builders and folder-backup tools |
| [tracker/docs/](tracker/docs/development.md) | Tracker development and maintenance documentation |

Personal practice belongs in `data-engineering-lab/`; supplied lesson labs stay beside their decks. Flight Reliability is the current portfolio direction. The archived Fuel Smart brief remains useful for standalone recipe exercises. The project brief is a specification; its folder is not the pipeline implementation.

## Run locally

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the local tracker](http://127.0.0.1:8000/tracker/de-tracker/). Serving the repository root also makes the offline SQL catalog available. See the [tracker README](tracker/README.md) for sign-in and progress storage.

For the SQL lab, open a new DuckDB database from the repository root:

```sh
duckdb data-engineering-lab/sql-practice/practice.duckdb
```

Then run these commands at the DuckDB prompt:

```text
.read data-engineering-lab/sql-practice/setup.sql
.read data-engineering-lab/sql-practice/queries.sql
```

Run setup once per new database. Python practice has its own [uv project](data-engineering-lab/python-practice/pyproject.toml).

## Maintaining the materials

The tracker curriculum lives in `tracker/de-tracker/data.js`. Its [development guide](tracker/docs/development.md) explains deck registration, generated content and validation. Run the tracker unit checks with:

```sh
npm --prefix tracker test
```

Edit authored sources before regenerating their outputs:

| Source | Generated output | Command from the repository root |
| --- | --- | --- |
| `tracker/content/data-landscape.cjs` | Interactive Data map | `npm --prefix tracker run build:map` |
| Registered decks and guides | Deck search index and shared search integration | `npm --prefix tracker run build:search` |
| `tracker/content/sql/` metadata snapshots and topic mappings | Hosted SQL practice catalog | `node tracker/scripts/build-practice-catalog.cjs` |

The [DataLemur refresh instructions](tracker/content/sql/datalemur/README.md) describe the browser export tool in `tracker/scripts/export-datalemur.cjs`. The Flight Reliability brief in `tracker/planning/` is the source for its hosted HTML and Markdown copies; keep those copies synchronized when changing it.

Cloud progress is separate from the older folder snapshots in `tracker/de-tracker-data/`. Use the tracker's **Export JSON** for a current cloud backup. Keep local databases, virtual environments, caches and generated exercise output out of Git; retain small input fixtures and dependency lockfiles.
