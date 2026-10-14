# Fuel Smart

Trusted nutrition metrics for simple recipes, built from Food.com and USDA data, for people who train and cook.

## Quickstart
```powershell
git clone https://github.com/OWNER/fuel-smart.git; cd fuel-smart
uv sync
uv run python ingest/build_fixture.py
uv run dbt build --project-dir models
uv run python -m pytest -q
```

## Expected output
Illustrative until your first real run; replace it with what your project prints.
```text
fixture: 50 recipes, their reviews and matched USDA foods written to data/fixture/
dbt build: mart_recipe_nutrition built; all tests passed
pytest: all tests passed
```

## Project layout
- `ingest/`: download, deterministic sample, fixture builder
- `parse/`: ingredient parsing, unit conversion, matching and the answer set
- `models/`: dbt staging, intermediate and marts
- `docs/`: intake, metric specs, design doc and ADRs
- `tests/`: pytest

## Tests
`uv run python -m pytest -q` checks parsing and unit conversion; `dbt build` runs the model tests.

## Data sources and licences
Food.com recipes and reviews (CC0, Kaggle); USDA FoodData Central Foundation Foods and SR Legacy (CC0), release dates pinned in `dataset.yml`. The fixture in `data/fixture/` is small enough to commit; full downloads are not committed.

## Decisions
`docs/design-fuel-smart-v1.md`, `docs/adr/` (start with ADR-0001: coverage threshold).

## Troubleshooting
- `uv: command not found`: install uv, then open a new terminal.
- dbt cannot find a profile: run from the repository root, or pass `--profiles-dir models`.

## Owner
The repository owner; open an issue for questions.
