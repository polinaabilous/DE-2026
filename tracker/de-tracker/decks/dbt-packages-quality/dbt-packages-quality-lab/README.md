# Leafy quality lab: packages, project evaluator and SQLFluff

The reference solution for the lab of the deck *dbt packages and project quality:
dbt_utils, codegen, project evaluator and SQLFluff*. It starts from
`dbt-jinja-macros-project` (deck *dbt Jinja and macros*) and adds three packages,
a second macro, a custom generic test, zero dbt-project-evaluator findings and
lint-clean SQL.

Tested with dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), SQLFluff 4.4.0 with
sqlfluff-templater-dbt 4.4.0, Python 3.12.10; packages dbt_utils 1.4.1, codegen 0.14.1,
dbt_project_evaluator 1.4.0 (pinned in `package-lock.yml`).

## Windows: use a short folder

`dbt deps` unpacks dbt_project_evaluator files up to about 140 characters below the
project folder. Copy this folder to a short path such as `C:\dev\leafy-quality`
first (or enable Windows long paths), otherwise `dbt deps` fails with
`FileNotFoundError`. Create the virtual environment at a short path too.

## Run the quality gate

    python -m venv .venv
    .venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
    python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0 sqlfluff==4.4.0 sqlfluff-templater-dbt==4.4.0
    python scripts/quality_gate.py        # expect five PASS lines and "QUALITY GATE: PASS"

Run every command from this folder; `profiles.yml` is here and `leafy.duckdb` is created here.
`dbt deps` needs internet access to hub.getdbt.com.

## Lab steps (do them on a copy of dbt-jinja-macros-project, then compare with this folder)

1. Add `packages.yml` (dbt_utils, codegen, dbt_project_evaluator with minor-version ranges); run `dbt deps`; commit `package-lock.yml`, not `dbt_packages/`.
2. Save the marts to a `legacy` schema; replace every `md5(...)` key with `dbt_utils.generate_surrogate_key`; prove 0 rows differ with `EXCEPT` both ways.
3. Add `fct_daily_product_sales` (grain: date, product) with a composite surrogate key; generate its YAML with `codegen.generate_model_yaml`; add descriptions and `unique_combination_of_columns`.
4. Replace the calendar in `dim_date` with `dbt_utils.date_spine`; prove it unchanged.
5. Write `macros/safe_divide.sql` (arguments with defaults), document it in `macros/_macros.yml`, use it for `purchases_per_page_view`.
6. Write the generic test `tests/generic/row_count_between.sql` and attach it to `fct_orders`.
7. Add the `dispatch` block, run `dbt build --select package:dbt_project_evaluator`, fix every finding (folders, descriptions, primary-key tests), and record the two justified exceptions in `seeds/dbt_project_evaluator_exceptions.csv`.
8. Add `.sqlfluff` (dbt style) and `.sqlfluffignore`; `sqlfluff lint`, `sqlfluff fix`, fix the rest by hand; rebuild and prove the marts unchanged.
9. Run `python scripts/quality_gate.py`.

## Expected results

- `dbt build --exclude package:dbt_project_evaluator`: ERROR=0 and one expected warning (`assert_no_unparseable_amounts`, event e7, amount "abc").
- Evaluator with `DBT_PROJECT_EVALUATOR_SEVERITY=error`: WARN=0, ERROR=0.
- `sqlfluff lint models tests`: exit code 0.
- `fct_daily_product_sales`: 7 rows; `fct_daily_funnel.purchases_per_page_view`: 2.5, 1.0, NULL.

## Layout

- `packages.yml`, `package-lock.yml`: the three packages and their locked versions
- `macros/`: `to_utc`, `safe_divide`, `_macros.yml` (macro docs)
- `tests/generic/row_count_between.sql`: custom generic test
- `models/staging/shop_raw/`: the source, its staging model and their YAML
- `seeds/dbt_project_evaluator_exceptions.csv`: accepted findings, each with a reason
- `.sqlfluff`, `.sqlfluffignore`: lint configuration
- `scripts/load_raw.py`, `scripts/quality_gate.py`
