# Interview foundations lab: two SQL sessions, two Python sessions, one case

This folder ships with the deck `interview-foundations.html`. It turns the deck's definition of done into five practice sessions you can run offline, check yourself, and log:

| Definition of done | Sessions here | How you check it |
|---|---|---|
| Two medium SQL sessions completed with reasoning and edge cases explained | S1 (S1a + S1b), S2 (S2a + S2b) in `prompts.md` | `python check_sql.py <prompt> attempts/<prompt>.sql` compares your rows with the reference and lists the edge cases you must have explained |
| Two basic data-Python sessions completed without AI | P1, P2 (`python_sessions/p1.py`, `p2.py`) | `python -m pytest -q tests/test_p1.py` (and `test_p2.py`) |
| One modeling/metrics case rehearsed aloud and feedback recorded | The Fuel Smart case (`templates/case-card.md`) | Self-score `templates/rubric-case.json`, compare with `solutions/case/fuel-smart-case.md`, log the session with feedback |

## Setup (about 5 minutes)

```powershell
# Windows PowerShell, from this folder
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest tzdata
```

Python 3.11 or newer. `tzdata` gives `zoneinfo` the time-zone database on Windows; DuckDB ships its own. Nothing is downloaded at run time and no service is used.

## Rules for every session

1. No AI and no searching for the answer during the session; official syntax docs are fine.
2. Time box: about 45 minutes for two SQL or two Python problems, 30 minutes for the case.
3. Talk aloud the whole time: restate, examples, edge cases, approach and complexity, code, test, follow-up. Record yourself if you can (`recordings/` is git-ignored).
4. Self-review **before** reading any solution: score the rubric, log each mistake with a one-line rule, log the session.

## Run the sessions

```powershell
# SQL session 1: write attempts/S1a.sql and attempts/S1b.sql, then
python check_sql.py S1a attempts/S1a.sql
python check_sql.py S1b attempts/S1b.sql

# Python session 1: implement python_sessions/p1.py, then
python -m pytest -q tests/test_p1.py

# Self-review and logging (copy templates/rubric-technical.json first and fill in 0-3 scores)
python practice.py score my-rubric.json
python practice.py log-mistake --date 2026-10-14 --kind sql --problem S1b --pattern spine --type edge-case --rule "'per X per month' means build the X x month spine first"
python practice.py log-session --date 2026-10-14 --kind sql --problems S1a,S1b --minutes 50 --ai no --score 10 --feedback "zero row found late"

# Before each later session: what should I retry today?
python practice.py due --on 2026-10-15
python practice.py retry 1 --date 2026-10-15 --result clean
python practice.py report
```

Your logs go to `log/` (git-ignored). `examples/sample-log/` shows a filled-in log; run any command with `--log examples/sample-log` to see the output without touching your own log.

## Expected results (checked when the deck was built)

- `PRACTICE_IMPL=solutions python -m pytest -q` (PowerShell: `$env:PRACTICE_IMPL="solutions"; python -m pytest -q`): 12 passed.
- `python -m pytest -q` before you implement anything: the 8 session tests fail with `NotImplementedError`; the 4 `test_practice.py` tests pass.
- `python check_sql.py S1b solutions/sql/S1b.sql`: `PASS: 4 rows match the reference.` The same for S1a (12 rows), S2a (4 rows) and S2b (3 rows).
- `python check_sql.py S1b examples/S1b-attempt-1.sql`: `FAIL` with three missing and two extra rows; the deck (lesson 7) explains each one.

## Files

```text
interview-foundations-lab/
  README.md            this file
  prompts.md           session rules and the SQL, Python and case prompts
  check_sql.py         runs your SQL and the reference in DuckDB and compares the rows
  practice.py          session log, mistake log, spaced retries (1, 3, 7 days), rubric scores
  data/                orders.csv, customers.csv, events.jsonl (synthetic Leafy data, edge cases planted)
  attempts/            your SQL files
  python_sessions/     p1.py, p2.py: stubs you implement
  tests/               tests for the sessions and for practice.py
  templates/           rubric.md, rubric-technical.json, rubric-case.json, case-card.md, session-log.md
  examples/            the attempts and the sample log used in the deck
  solutions/           reference SQL, Python and the case model answer: open after your self-review
```

Harder timed sets (hard SQL in 20-25 minutes, data-Python in 25 minutes), more modeling and metrics cases, and full mock loops come in later lessons. Keep one short session per week from this lab while you build the portfolio.
