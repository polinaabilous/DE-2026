# Lab: a test suite and CI for the Leafy order-events ingester

Companion lab for the deck *Python quality and tooling: tests, validation, types, pre-commit and CI* (lessons 26–27).
Everything runs offline. Time: about 2 hours.

## What is here

| Path | What it is |
|---|---|
| `src/leafy_ingest/` | the ingester: Pydantic model (`models.py`), pure core (`core.py`), Pandera contract (`frames.py`), file I/O (`files.py`), CLI (`cli.py`) |
| `tests/` | **your** test suite: starts with one smoke test and the fixture files |
| `tests/fixtures/` | `orders_2026-03-08.jsonl` (a sample day with every trap) and `bad_lines.jsonl` (one bad line per reject reason) |
| `reference/tests/` | the finished suite from the deck, to compare with **after** you try |
| `pyproject.toml` | pytest, coverage (branch, fail under 80 %), mypy (strict) and Ruff configuration |
| `requirements-dev.txt` | pinned versions the deck was tested with |
| `.pre-commit-config.yaml` | Ruff (pinned remote hook) and mypy (local hook) |
| `.github/workflows/ci.yml` | GitHub Actions: lint, format, types, tests + coverage |

## Setup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements-dev.txt
pytest                               # starts red: 1 passed, coverage about 18 % < 80 %
```

## Tasks (definition of done in brackets)

1. **Fixtures** – write `tests/conftest.py` with a session-scoped `day_lines` fixture (read once, returned as a tuple) and a `make_event(**overrides, drop=())` factory fixture. *(I use pytest fixtures and parametrize)*
2. **Model tests** – `tests/unit/test_models.py`: a parametrized table of accepted edge cases and rejected records with `pytest.param(id=...)`, asserting the Pydantic error **type**; business dates around midnight and the DST switch. *(I validate schemas with pydantic or pandera)*
3. **Core tests** – `tests/unit/test_core.py`: counts for the sample day (12 valid, 2 rejected, 1 duplicate), the reason for every line of `bad_lines.jsonl`, the reject-rate limit.
4. **Frame tests** – `tests/unit/test_frames.py`: the sample day passes the Pandera contract; two `order_placed` events for one order fail; lazy validation reports several failures.
5. **Integration tests** – `tests/integration/` with its own `conftest.py` (fixed clock, CLI runner), marked `integration`: end-to-end run into `tmp_path`, the environment override with `monkeypatch`, the missing-file exit code; a parametrized fixture for LF and CRLF files.
6. **Gate** – `pytest` passes with total coverage ≥ 80 % (branch coverage on). *(Ingester core has ≥ 80 % test coverage)*
7. **Types and lint** – `mypy`, `ruff check .` and `ruff format --check .` are clean.
8. **Hooks and CI** – `pre-commit install`; push the folder as the root of a new GitHub repository and make the `ci` workflow a required check. *(Lint and type checks run in CI)*

## Verify

```powershell
pytest -m "not integration" -q       # fast unit run
pytest                               # all tests + coverage gate (exit code 0)
mypy; ruff check .; ruff format --check .
pre-commit run --all-files
```

Expected with the reference suite (`pytest reference/tests`): 37 passed, total coverage 100 %.

## Notes

- `.github/workflows/` only works at the root of a repository: copy this folder to a new repository to see CI run. The workflow was linted with actionlint but not executed on GitHub while the deck was built.
- The remote pre-commit hooks need network on first use. Offline, use the all-local variant shown in lesson 20 of the deck.
- All data is invented. Do not add real customer data to fixtures.
