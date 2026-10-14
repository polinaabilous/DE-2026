# Requirements-writing lab

Templates, a document linter and a bus-matrix builder: the lab for the deck "From vague ask to written spec".

## Quickstart
```powershell
cd requirements-writing-lab
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb pytest
python -m pytest -q
```

## Expected output
The last line of a successful run (the time differs per machine):
```text
15 passed in 2.01s
```

## Project layout
- `doclint.py`: checks a Markdown document by kind: intake, definition, spec, design, adr, pr, readme, status.
- `bus_matrix.py`: turns a BEAM event table (CSV) into a bus matrix with grain statements and checks (DuckDB).
- `acceptance.py`: the Leafy intake's acceptance criteria as executable checks (DuckDB).
- `data/`: `leafy_orders.csv` (19 orders with planted edge cases) and `beam_events.csv` (Leafy business events).
- `examples/`: the worked Leafy documents from the deck; files named `*-before.md` are first drafts that fail on purpose.
- `solutions/`: model answers for the lab tasks (spoilers).
- `tests/`: pytest tests for all of the above.
- `../templates/`: the blank templates to copy.

## Tests
`python -m pytest -q` checks that blank templates fail only on placeholders, that worked examples and model answers pass, that both bus matrices pass their checks, and that the acceptance criteria hold on the fixture.

## Lab tasks
Plan 60 to 120 minutes. Put your files in a new folder `my-docs/` and name each one with its kind as a prefix (`intake-`, `definition-`, `spec-`, `design-`, `adr-`, `pr-`, `status-`, `readme-`).

1. **Three intakes** from `../templates/intake.md`: the Fuel Smart v1 question; the Leafy ask "Can you tell me if the workshops are worth it? People seem to love them." (events coordinator, 2026-03-16); one request from your own work (a synthetic one is fine).
2. **A BEAM interview** for Fuel Smart with `../templates/beam-interview.md` (ask a peer to play the stakeholder, or interview yourself). Save the event table as `my-docs/beam-fuel-smart.csv` and run `python bus_matrix.py my-docs/beam-fuel-smart.csv`.
3. **A metric spec** for protein density from `../templates/metric-spec.md`.
4. **A one-page design doc** for Fuel Smart v1 and **one ADR** for its most debatable choice.
5. **A README** for your Fuel Smart repository and a **PR description** for its first pull request.
6. **A peer review**: send one document with `../templates/peer-review-checklist.md`, fix every blocking comment, and ask a peer to follow the README with a 10-minute timer.

Done when `python doclint.py auto my-docs` prints PASS for every file and `bus_matrix.py` prints `Checks: OK`. Then compare with `solutions/`.

## Data sources and licences
Everything in `data/` is synthetic and written for this lab; Leafy is a fictional plant shop. Nothing is downloaded.

## Decisions
- The checks are small and opinionated: they catch missing sections, placeholders, vague words and untestable criteria, not weak ideas. A peer review still matters.
- Text in quotes, in quote blocks (lines starting with `>`) and in code is not checked for vague words, so you can quote the requester word for word.
- The design-doc limit is 700 words, about one page.

## Troubleshooting
- `ModuleNotFoundError: No module named 'duckdb'`: activate the virtual environment, then run `python -m pip install duckdb pytest`.
- `Activate.ps1 cannot be loaded because running scripts is disabled`: run `Set-ExecutionPolicy -Scope Process Bypass` in that terminal, then activate again. On macOS or Linux use `source .venv/bin/activate`.
- `SKIP ... (kind unknown from the file name)`: add a kind prefix to the file name, or pass the kind instead of `auto`.

## Owner
Part of the learning-deck series; ask questions where you found the deck.
