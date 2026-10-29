# Python quality and tooling: tests, validation, types, pre-commit and CI

*Companion to `python-quality-tooling.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Tested with:** CPython 3.12.10 on Windows 11 (64-bit); pytest 9.1.1, pytest-cov 7.1.0 (coverage.py 7.16.2), Pydantic 2.13.5 (pydantic-core 2.46.5), Pandera 0.34.1 with pandas 3.0.6, mypy 2.4.0 (pandas-stubs 3.0.5.260914), Ruff 0.16.10, pre-commit 4.6.2, actionlint 1.7.12, Hypothesis 6.168.5, PyYAML 6.0.3, tzdata 2026.5. Every Python block, test run, type check, lint and hook run in this document was executed while building it, and the output under it is the real output. Test durations are labelled as measured on the build machine. **Not executed:** the GitHub Actions workflow did not run on GitHub; it was linted locally with actionlint and its `run:` steps were executed locally (lesson 23). pre-commit ran with local hooks from the project environment; the pinned remote-hook configuration was validated but its hook environments were not installed on the build machine (lesson 20).

**This is a gap deck.** It teaches only what the earlier Python decks leave out. Already covered elsewhere, and not repeated here: uv, `pyproject.toml`, Ruff basics, pytest basics with `parametrize` and `tmp_path` (*Python files, generators, and practical data scripts*, lessons 32–33); type-hint syntax and a first mypy run (*Python foundations for data engineering*, lesson 31); HTTP mocking with MockTransport and RESPX, and the quarantine idea (*Reliable Python ingestion: APIs and files to Parquet*, lessons 19 and 24).

**Prerequisites:** those three decks. New terms are defined on first use and collected in the glossary; most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common data-engineering and Python testing interview patterns (research done in October 2026: “how do you test a pipeline”, fixture scopes and conftest, record vs DataFrame validation, bad-record handling, CI for data code, what coverage proves). All questions are original and use the Leafy data.

**Lab:** `python-quality-tooling-lab/` next to this file: a small ingester package with a starter test, a reference test suite, pre-commit and GitHub Actions configuration (lessons 26–27).

**Additions beyond the original brief** are marked *(added)*: a testable ingester shape (pure core, I/O at the edges); controlling time and environment with monkeypatch and an injected clock; Pydantic strict vs lax mode and the Literal-whitespace trap; actionlint to lint workflows before you push; branch coverage, mutation and property-based testing as answers to “what coverage doesn’t prove”; pre-commit hook pinning and the remote-vs-local hook trade-off.

## Contents

1. [Python quality and tooling: tests, validation, types, pre-commit and CI](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [The running example: a Leafy order-events ingester](#slide-3)
4. [Shape the ingester so it can be tested](#slide-4)
5. [Test layout for an ingester: unit and integration](#slide-5)
6. [conftest.py: where shared fixtures live](#slide-6)
7. [Fixture scopes and teardown](#slide-7)
8. [Factory fixtures: build test data with overrides](#slide-8)
9. [Fixture files and golden expectations](#slide-9)
10. [parametrize in depth: ids, marks, stacking, and parametrized fixtures](#slide-10)
11. [monkeypatch, captured output, and controlling time](#slide-11)
12. [Pydantic models: a contract for one record](#slide-12)
13. [Validators, strict mode, and extra fields](#slide-13)
14. [Record validation with quarantine and reason codes](#slide-14)
15. [Pandera: a schema for a whole DataFrame](#slide-15)
16. [Lazy validation: every failure, then quarantine the rows](#slide-16)
17. [Choosing a validator: Pydantic, Pandera, dataclasses, or dbt tests](#slide-17)
18. [mypy configuration for a real package](#slide-18)
19. [The mypy errors you will meet, and how to fix them](#slide-19)
20. [pre-commit: run Ruff and mypy before every commit](#slide-20)
21. [pre-commit in action: a commit blocked, fixed, accepted](#slide-21)
22. [GitHub Actions: lint, types and tests on every pull request](#slide-22)
23. [Run the CI steps locally before you push](#slide-23)
24. [Coverage with pytest-cov: lines, branches, and the 80 % gate](#slide-24)
25. [What coverage does not prove](#slide-25)
26. [Lab: a test suite and CI for the Leafy ingester](#slide-26)
27. [Lab: verify your result](#slide-27)
28. [Bug clinic: quality-tooling failures and their fixes](#slide-28)
29. [Interview questions and model answers: testing](#slide-29)
30. [Interview questions and model answers: validation, types and CI](#slide-30)
31. [Exercises 1–3: parametrize, scopes, factory fixtures](#slide-31)
32. [Exercises 4–5: a flaky clock, and a signup contract](#slide-32)
33. [Exercises 6–8: mypy errors, a revenue contract, a broken workflow](#slide-33)
34. [Exercises 9–10: a test plan for Fuel Smart, and what line coverage missed](#slide-34)
35. [Cheat sheet](#slide-35)
36. [Glossary](#slide-36)
37. [What to remember, and what comes next](#slide-37)
38. [References and how this deck was tested](#slide-38)
39. [Appendix A · Hints](#appendix-a)
40. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Python quality and tooling: tests, validation, types, pre-commit and CI

**

You already write small pytest tests, lint with Ruff, and quarantine bad lines (the files-and-streams and ingestion decks). This deck fills the gaps a reviewer or interviewer will probe next: how a real test suite for an ingester is laid out, how **Pydantic** and **Pandera** turn validation rules into code, how to configure **mypy** and read its errors, and how **pre-commit**, **GitHub Actions** and **coverage** turn all of it into a gate that nobody can forget to run.

- **Part A, pytest in depth:** a testable ingester shape, unit vs integration layout, `conftest.py`, fixture scopes and teardown, factory fixtures, fixture files, `parametrize` in depth, `monkeypatch` and clocks.
- **Part B, validation:** Pydantic models and validators, strict vs lax mode, record quarantine with reason codes, Pandera DataFrame schemas, lazy validation and failure cases, choosing a validator.
- **Part C, types and automation:** mypy configuration and the errors you will meet, pre-commit with Ruff and mypy, GitHub Actions CI.
- **Part D, coverage and lab:** pytest-cov, branch coverage, what coverage does not prove, and the ingester lab to ≥ 80 % coverage.
- **Practice:** a bug clinic, interview questions with model answers, and 10 exercises.

**Gap deck:** pytest basics, `tmp_path`, uv, `pyproject.toml` and Ruff basics are in *Python files, generators, and practical data scripts* (lessons 32–33); type-hint syntax in *Python foundations for data engineering* (lesson 31); HTTP mocking and the quarantine idea in *Reliable Python ingestion* (lessons 19, 24).

**Additions beyond the brief** (marked *added*): a testable ingester shape (pure core, I/O at the edges); controlling time and environment with monkeypatch and an injected clock; Pydantic strict vs lax mode and the Literal-whitespace trap; actionlint to lint workflows before you push; branch coverage, mutation and property-based testing as answers to “what coverage doesn’t prove”; pre-commit hook pinning and the remote-vs-local hook trade-off.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Ingestion code fails quietly. A parser that drops the zero-amount orders, a validator that lets naive timestamps through, a refactor that breaks the CRLF files from one supplier: none of these crash, they just publish wrong numbers. The fix is a set of safety nets that each catch a different failure: **tests** for your logic, **runtime validation** for bad data, **type checks** for mistakes between your own functions, and **automation** (pre-commit, CI, a coverage floor) so that none of it depends on someone remembering to run it.

#### Where you will use it

- Adding a new source to an ingester without breaking the old ones.
- Turning “some records are bad” into quarantine with reason codes and a threshold.
- Reviewing a teammate’s pull request with a green or red check already on it.
- Upgrading pandas or Pydantic and knowing within minutes what broke.
- Showing a portfolio repository that a hiring manager trusts at a glance.

#### What goes wrong without it

- A bad batch is published and found by a finance analyst a week later.
- Tests pass on one laptop and fail everywhere else (clocks, paths, shared state).
- A None reaches an attribute access at 3 a.m.
- Coverage reads 95 % while the money conversion is wrong.
- Lint arguments eat code-review time.

#### Who expects you to know it

- Data engineers: own the ingesters, their tests and CI; the same discipline in dbt, plus Python for ingestion and tooling.
- Platform teams: expect pre-commit, typed code and required checks.
- Interviewers: “how do you test a pipeline?” appears in most DE loops.

> **On the job:** A typical first ticket: “The order-events ingester has no tests and breaks every time the checkout team changes a field. Add tests and validation, get coverage to 80 %, and make CI block bad merges.” This deck’s lab is that ticket on a small scale.

> **The main idea:** quality tooling is how a data team turns “it worked when I ran it” into a guarantee on every change.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [GitHub Actions: building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Logic you wrote: parsing, rules, dedup, time zones | pytest unit tests with fixtures and parametrize (Part A) | fast, precise, and they document the edge cases |
| Wiring: files, CLI, exit codes, outputs | a few integration tests with tmp_path and a fixed clock (lessons 5, 11) | catches the bugs units cannot see, at a higher cost per test |
| Untrusted records arriving as JSON | Pydantic model + quarantine (lessons 12–14) | per-record reasons; good records continue |
| A DataFrame before you write it | Pandera contract, lazy (lessons 15–16) | rules across rows; one place for the batch contract |
| Types between your own functions | mypy strict in CI (lessons 18–19) | finds None and Any problems on every path without running |
| Checks people forget to run | pre-commit locally + CI as a required check (lessons 20–23) | fast feedback plus a real gate |
| A one-off notebook exploration | not the full stack | assert a few things inline; formalise when the code is reused |
| Checks that need history or other tables | warehouse data tests (the dbt decks) | Python sees one batch; the warehouse sees everything |

#### How interviews test it

- “How do you test a data pipeline?” (layers: unit, integration, data quality; a concrete example).
- “Fixture scopes: when is session scope dangerous?” (shared mutable state, ScopeMismatch).
- “Pydantic or Pandera?” and “fail the run or drop bad rows?” (record vs batch; quarantine and thresholds).
- “What runs in pre-commit vs CI?” and “is 80 % coverage enough?” (speed vs guarantee; coverage proves execution, not correctness).

#### Where it sits in your learning path

- Builds on pytest basics, uv, pyproject.toml and Ruff (*Python files, generators, and practical data scripts*, lessons 32–33) and type hints (*Python foundations for data engineering*, lesson 31).
- Reuses the quarantine idea and HTTP mocking from *Reliable Python ingestion* (lessons 19, 24).
- Leads into the dbt decks’ data tests and the Fuel Smart portfolio ingester, which should start with this structure.

> **The main idea:** reach for each tool by the failure it catches: tests for logic, validation for data, types for code, automation so it always runs.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · one environment, every tool pinned*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** on Windows 11. pytest 9.1.1, pytest-cov 7.1.0 (coverage.py 7.16.2), Pydantic 2.13.5, Pandera 0.34.1 on pandas 3.0.6, mypy 2.4.0 with pandas-stubs, Ruff 0.16.10, pre-commit 4.6.2, actionlint 1.7.12, Hypothesis 6.168.5 (one demo). |
| Minimum versions | Python 3.11+ (`datetime.UTC`, `X \| None` everywhere). Pydantic **2.x**: v1 code (`@validator`, `.dict()`) does not run unchanged. Pandera 0.24+ for the `pandera.pandas` import used here. pytest 8+ for the options shown. |
| What ran | Every Python block, every `pytest`, `mypy`, `ruff`, `pre-commit` and `actionlint` command. Test durations are measured on the build machine and vary. |
| What did not run | **GitHub Actions on GitHub** (not executed — requires a GitHub repository and runners). The workflow was linted with actionlint and its `run:` steps were executed locally (lesson 23). The pinned **remote** pre-commit hooks were validated but not installed: their environments exceed the Windows path-length limit in the build folder, so hooks ran as **local** hooks with the same tool versions (lesson 20). |
| Platform notes | Windows has no IANA time-zone database: install `tzdata` for `zoneinfo`. CI in this deck uses `ubuntu-latest`; nothing here is Windows-specific except the activation command. |

#### Create the environment

```text
# Windows PowerShell; macOS/Linux: source .venv/bin/activate
cd python-quality-tooling-lab
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

```text
# requirements-dev.txt
# Tested versions (pinned). Runtime: pydantic, pandas, pandera, tzdata. The rest are dev tools.
pydantic==2.13.5
pandas==3.0.6
pandera==0.34.1
tzdata==2026.5
pytest==9.1.1
pytest-cov==7.1.0
mypy==2.4.0
pandas-stubs==3.0.5.260914
ruff==0.16.10
pre-commit==4.6.2
```

#### Check it

```python
import importlib.metadata as md
import sys

print("Python", sys.version.split()[0])
for name in ["pytest", "pytest-cov", "pydantic", "pandera", "pandas", "mypy", "ruff", "pre-commit"]:
    print(f"{name:<11}", md.version(name))
```

Output:

```text
Python 3.12.10
pytest      9.1.1
pytest-cov  7.1.0
pydantic    2.13.5
pandera     0.34.1
pandas      3.0.6
mypy        2.4.0
ruff        0.16.10
pre-commit  4.6.2
```

With uv (from the files-and-streams deck) the same pins live in `pyproject.toml` under `[dependency-groups]` and `uv.lock`; run each tool with `uv run`. This deck uses plain `pip` so that CI needs nothing but Python.

> **On the job:** Pinning every quality tool matters more than pinning libraries: a new Ruff or mypy release adds rules and errors, and an unpinned CI goes red on a Monday with no code change. Teams upgrade tools deliberately, in one pull request, and fix the new findings there.

> **The main idea:** one virtual environment with every tool pinned; everything shown ran, and the two things that could not run here are labelled.

*Read more:* [pre-commit](https://pre-commit.com/), [pytest-cov](https://pytest-cov.readthedocs.io/en/latest/), [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [Pandera documentation](https://pandera.readthedocs.io/en/stable/), [mypy: the configuration file](https://mypy.readthedocs.io/en/stable/config_file.html).

---

<a id="slide-3"></a>
## 3. The running example: a Leafy order-events ingester

*Start here · one small package with every trap planted*

Leafy, the plant shop from the earlier decks, receives its order events as **JSON Lines** files (one JSON object per line). The `leafy_ingest` package reads one day file, validates every line, drops duplicate deliveries, quarantines bad lines with a reason, checks the batch, and writes a CSV, a quarantine file and a manifest. It is small enough to read in ten minutes and real enough to need every tool in this deck.

#### The package (the lab folder)

```text
python-quality-tooling-lab/
├── pyproject.toml              # project metadata + pytest, coverage, mypy, ruff config
├── requirements-dev.txt        # pinned tool versions (previous slide)
├── .pre-commit-config.yaml     # lesson 20
├── .github/workflows/ci.yml    # lesson 22
├── src/leafy_ingest/
│   ├── models.py               # Pydantic contract for one event      (Part B)
│   ├── core.py                 # pure core: lines -> valid + rejects   (lesson 4)
│   ├── frames.py               # Pandera contract for the batch        (Part B)
│   ├── files.py                # imperative shell: file reads/writes
│   └── cli.py                  # main(argv, clock) -> exit code
├── tests/                      # YOUR suite: starts with one smoke test (the lab)
│   ├── fixtures/               # orders_2026-03-08.jsonl, bad_lines.jsonl
│   └── test_smoke.py
└── reference/tests/            # the finished suite built in Part A
    ├── conftest.py
    ├── fixtures/
    ├── unit/                   # test_models.py, test_core.py, test_frames.py
    └── integration/            # conftest.py, test_cli.py
```

#### One day of events, line by line

```python
import json
from pathlib import Path

path = Path("tests/fixtures/orders_2026-03-08.jsonl")
for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
    if not line.strip():
        print(f"{n:>2}  (blank line)")
        continue
    e = json.loads(line)
    print(f"{n:>2}  {e['event_id']}  {e['event_type']:<15} {e['amount']:>6}  {e['occurred_at']}")
```

Output:

```text
 1  E-001  order_placed     25.00  2026-03-08T05:30:00Z
 2  E-002  order_paid       25.00  2026-03-08T05:31:10Z
 3  E-002  order_paid       25.00  2026-03-08T05:31:10Z
 4  E-003  order_placed      0.00  2026-03-08T07:59:00Z
 5  E-004  order_paid        0.00  2026-03-08T08:00:30Z
 6  E-005  order_placed     31.50  2026-03-08T08:30:00Z
 7  E-006  order_paid       31.50  2026-03-08T14:00:00+01:00
 8  E-007  order_placed     18.00  2026-03-08T16:45:00Z
 9  (blank line)
10  E-008  order_placed     42.00  2026-03-08T21:10:00Z
11  E-009  order_paid       42.00  2026-03-08T21:12:00Z
12  E-010  order_cancelled   0.00  2026-03-08T22:05:00Z
13  E-011  order_refunded   25.00  2026-03-08T23:40:00Z
14  E-012  order_paid       19.00  2026-03-08T09:15:00
15  E-013  order_placed     12.00  2026-03-09T04:59:59Z
16  E-014  order_paid       12.00  2026-03-09T05:00:01Z
```

| Trap planted in the fixture | Line | What the ingester must do |
|---|---|---|
| The same event delivered twice (`E-002`) | 2–3 | keep the first copy, count the duplicate |
| A free sample: amount `0.00`, currency `"usd"` | 4 | accept: zero is a value, not “missing”; normalise the currency |
| An unknown extra field (`coupon`) | 6 | ignore it: sources add fields all the time |
| A `+01:00` offset instead of `Z` | 7 | accept and normalise to UTC |
| No `customer_id` | 8 | quarantine with reason `missing:customer_id` |
| A timestamp without a time zone | 14 | quarantine: a naive time is ambiguous |
| 05:30 UTC on 8 March is 23:30 on 7 March in Chicago; 8 March is also the US daylight-saving switch | 1, 15, 16 | business date in America/Chicago, across DST |

> **On the job:** This is the shape of most ingestion code you will own: read, validate, deduplicate, quarantine, publish. The trap table is the start of the test plan: every row becomes at least one test.

> **The main idea:** one small ingester and one day file with every common trap; each lesson tests or validates one of them.

*Read more:* [JSON Lines](https://jsonlines.org/), [zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-4"></a>
## 4. Shape the ingester so it can be tested

*Part A · where do I/O, clocks and environment variables belong? (added)*

**Functional core, imperative shell** is a design rule: keep decisions in **pure functions** (same input → same output, no files, network, clock or environment) and push every side effect into a thin outer layer, the **shell**. The core is then unit-tested with plain values; only the shell needs files or a temporary folder. Coming from C#: it is the same idea as injecting `TimeProvider` and `IFileSystem` instead of calling `DateTime.UtcNow` and `File.ReadAllLines` inside domain logic — but in Python you usually pass a function or a value rather than an interface.

#### Pure core: `core.validate_lines`

```python
# src/leafy_ingest/core.py
def validate_lines(lines: Iterable[str]) -> BatchResult:
    """Validate every non-blank line; keep the first copy of each event_id."""
    result = BatchResult()
    seen: set[str] = set()
    for line_no, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        parsed = parse_line(line_no, line)
        if isinstance(parsed, Rejected):
            result.rejected.append(parsed)
        elif parsed.event_id in seen:
            result.duplicates += 1
        else:
            seen.add(parsed.event_id)
            result.valid.append(parsed)
    return result
```

```python
from leafy_ingest.core import validate_lines

lines = [
    '{"event_id":"E-1","order_id":"O-1001","customer_id":"C-01","event_type":"order_paid",'
    '"amount":"25.00","currency":"USD","occurred_at":"2026-03-08T05:31:10Z"}',
    "",
    "not json",
]
result = validate_lines(lines)          # a list of strings is enough: no files needed
print(len(result.valid), [r.reason for r in result.rejected], result.lines_read)
```

Output:

```text
1 ['json_invalid:record'] 2
```

#### Shell: `cli.main` takes its dependencies

```python
# src/leafy_ingest/cli.py
Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


def max_reject_rate() -> float:
    return float(os.environ.get("LEAFY_MAX_REJECT_RATE", "0.25"))


def main(argv: Sequence[str] | None = None, clock: Clock = utc_now) -> int:
    parser = argparse.ArgumentParser(prog="leafy-ingest")
    parser.add_argument("input", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)

    if not args.input.is_file():
        print(f"error: no such file: {args.input.name}")
        return 1
    result = validate_lines(read_lines(args.input))
    try:
        check_reject_rate(result, max_reject_rate())
    except TooManyRejectsError as error:
        print(f"error: {error}")
        return 2
    frame = validate_frame(to_frame(result.valid))
    manifest = {
        "source": args.input.name,
        "run_at_utc": clock().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "lines_read": result.lines_read,
        "valid": len(result.valid),
        "rejected": len(result.rejected),
        "duplicates": result.duplicates,
    }
    write_outputs(args.out, frame, result.rejected, manifest)
    print(
        f"{len(result.valid)} valid, {len(result.rejected)} rejected, "
        f"{result.duplicates} duplicates -> {args.out.name}"
    )
    return 0
```

- `validate_lines` accepts any iterable of strings: a test passes a list, the CLI passes a file generator.
- `main(argv, clock)` returns an exit code instead of calling `sys.exit`, and takes `argv` and the clock as parameters: a test calls it directly with a fixed clock.
- The reject limit comes from an environment variable read *at call time* in one small function, so a test can set it with `monkeypatch` (lesson 11).

> **On the job:** In code review, “this is hard to test” usually means I/O or `datetime.now()` is buried in the middle of logic. Moving it to the edge is the refactor that makes the 80 % coverage target cheap instead of painful, and it is a common interview follow-up: “how would you make this function testable?”

> **The main idea:** keep decisions pure and push files, clocks and environment to a thin shell; unit tests then need nothing but values.

*Read more:* [Functional core, imperative shell (screencast)](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell), [.NET TimeProvider](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview), [dataclasses](https://docs.python.org/3/library/dataclasses.html).

---

<a id="slide-5"></a>
## 5. Test layout for an ingester: unit and integration

*Part A · where does each test live, and how do I run only the fast ones?*

A **unit test** checks one function or class with in-memory values: no files, network, database or clock, so it runs in milliseconds. An **integration test** checks several pieces working together through a real boundary: real files in a temporary folder, the real CLI, a real (local) database. A **marker** is a label on a test (`@pytest.mark.integration`) that lets you select or deselect groups with `-m`. Coming from C#: the split is the same as separate xUnit test projects or `[Trait("Category", "Integration")]`; pytest does it with folders plus markers in one project.

#### Folders

```text
reference/tests/
├── conftest.py              # fixtures for every test below (lesson 6)
├── fixtures/                # small data files with the real shape (lesson 9)
├── unit/                    # pure functions: models, core, frames
│   ├── test_models.py
│   ├── test_core.py
│   └── test_frames.py
└── integration/             # files, CLI, end to end
    ├── conftest.py          # fixtures only integration tests need
    ├── test_cli.py          # pytestmark = pytest.mark.integration
    └── test_files.py
```

#### pytest configuration in `pyproject.toml`

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]                   # import leafy_ingest without installing it
addopts = [
    "--import-mode=importlib",         # no sys.path tricks; duplicate test file names are fine
    "--strict-markers",                # a typo in a marker name is an error, not a new marker
    "--strict-config",
    "-ra",                             # summary line for every skip/xfail/failure
    "--cov",                           # measure what [tool.coverage.run] says
    "--cov-report=term-missing:skip-covered",
]
markers = ["integration: touches files or runs the CLI end to end (deselect with -m 'not integration')"]
```

- `testpaths`: where plain `pytest` looks (the lab’s own `tests/`; the reference suite is run by path).
- `pythonpath = ["src"]`: import `leafy_ingest` without installing it. In CI you can install the package instead.
- `--import-mode=importlib`: the mode pytest recommends for new projects; test folders need no `__init__.py` and two files may share a name. A test file then cannot import another test file; shared code goes in fixtures or a helper package.
- `--strict-markers`: `@pytest.mark.integraton` (typo) is an error instead of a silently new marker that `-m` never selects.

#### Fast feedback: unit tests only

Terminal (durations measured on the build machine):

```text
$ pytest reference/tests -m "not integration" -q --no-cov
...............................                                                          [100%]
31 passed, 6 deselected in 3.10s
```

#### Then the slower group

Terminal (durations measured on the build machine):

```text
$ pytest reference/tests -m integration -q --no-cov
......                                                                                   [100%]
6 passed, 31 deselected in 2.50s
```

|  | Unit | Integration |
|---|---|---|
| Touches | values in memory | files (`tmp_path`), CLI, local DB |
| Speed | milliseconds; run on every save | seconds; run before push and in CI |
| Catches | rule bugs: a validator, a reason code, DST | wiring bugs: wrong path, encoding, exit code, missing output |
| In this suite | 31 tests | 6 tests |

> **On the job:** Interviewers ask “how do you test a data pipeline?” more than any other testing question. A strong answer names the layers: many fast unit tests on pure transforms with tiny fixtures, a few integration tests through real files or a local engine, and data-quality checks on real runs (Pandera here, dbt tests in the dbt decks).

> **The main idea:** unit tests in one folder, integration tests in another and marked; configure pytest once in pyproject.toml so every developer and CI run the same way.

*Read more:* [pytest: good integration practices (layout, import modes)](https://docs.pytest.org/en/stable/explanation/goodpractices.html), [pytest: markers](https://docs.pytest.org/en/stable/how-to/mark.html), [pytest: configuration](https://docs.pytest.org/en/stable/reference/customize.html).

---

<a id="slide-6"></a>
## 6. conftest.py: where shared fixtures live

*Part A · how does a test find a fixture it never imported?*

A **fixture** is a function marked `@pytest.fixture` that prepares something a test needs; the test asks for it by naming it as a parameter, and pytest calls it (this is **dependency injection**, like constructor injection in ASP.NET Core). **`conftest.py`** is a file pytest loads automatically: fixtures defined in it are visible to every test in that folder and below, with no import. Fixtures can ask for other fixtures, so they form a graph that pytest resolves for each test.

#### Lookup order for a fixture name

- the test module itself (a fixture defined in the same file);
- the nearest `conftest.py`, then each parent folder’s `conftest.py` up to the root directory;
- plugins and pytest’s built-ins (`tmp_path`, `monkeypatch`, `capsys` …).
- A closer definition with the same name **overrides** a farther one: an integration `conftest.py` can replace a root fixture for its folder only.

```python
# reference/tests/integration/conftest.py
"""Fixtures only the integration tests need: a fixed clock and a CLI runner."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

import pytest

from leafy_ingest.cli import main

RunCli = Callable[[Path], tuple[int, Path]]


@pytest.fixture
def fixed_clock() -> Callable[[], datetime]:
    """A clock that always says 2026-03-09 06:00 UTC."""
    return lambda: datetime(2026, 3, 9, 6, 0, tzinfo=UTC)


@pytest.fixture
def run_cli(tmp_path: Path, fixed_clock: Callable[[], datetime]) -> RunCli:
    """Factory: run the CLI on a file, writing into tmp_path/out; returns (exit code, out)."""

    def run(input_path: Path) -> tuple[int, Path]:
        out = tmp_path / "out"
        return main([str(input_path), "--out", str(out)], clock=fixed_clock), out

    return run
```

#### Ask pytest where each fixture came from

Terminal:

```text
$ pytest reference/tests/integration/test_cli.py::test_reject_limit_from_environment --fixtures-per-test --no-cov -q

--------------------- fixtures used by test_reject_limit_from_environment ---------------------
------------------------ (reference\tests\integration\test_cli.py:42) -------------------------
fixed_clock -- reference\tests\integration\conftest.py:17
    A clock that always says 2026-03-09 06:00 UTC.
fixtures_dir -- reference\tests\conftest.py:18
    Folder with the sample files: tests/fixtures next to this conftest.
monkeypatch -- ...\_pytest\monkeypatch.py:36
    A convenient fixture for monkey-patching.
run_cli -- reference\tests\integration\conftest.py:23
    Factory: run the CLI on a file, writing into tmp_path/out; returns (exit code, out).
tmp_path -- ...\_pytest\tmpdir.py:291
    Return a temporary directory (as :class:`pathlib.Path` object)
    which is unique to each test function invocation.
    The temporary directory is created as a subdirectory
    of the base temporary directory, with configurable retention,
    as discussed in :ref:`temporary directory location and retention`.
tmp_path_factory -- ...\_pytest\tmpdir.py:276
    Return a :class:`pytest.TempPathFactory` instance for the test session.

no tests ran
```

`fixed_clock` and `run_cli` come from `integration/conftest.py`, `fixtures_dir` from the root `conftest.py`, and the rest are pytest built-ins. `pytest --fixtures` lists every fixture available in a folder, with its docstring: write one.

- Do not import from `conftest.py` in tests (`from conftest import …`): it breaks under `--import-mode=importlib` and when two conftest files exist. Shared types or helpers go in a small module in your package or a `tests/helpers` package.
- Keep the root `conftest.py` for fixtures most tests need; put narrow fixtures next to the tests that use them. A 600-line root conftest is the test-suite version of a god class.

> **On the job:** When you join a team, `pytest --fixtures` and `--fixtures-per-test` are the fastest way to learn its test suite: they show what a test can ask for and where it is defined, without grepping.

> **The main idea:** fixtures are injected by name; conftest.py makes them visible to its folder and below, and a nearer definition overrides a farther one.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [pytest: fixtures reference (scopes, conftest, order)](https://docs.pytest.org/en/stable/reference/fixtures.html).

---

<a id="slide-7"></a>
## 7. Fixture scopes and teardown

*Part A · how often is a fixture created, and who cleans up?*

A fixture’s **scope** says how long one instance lives: `function` (the default: a fresh one per test), `class`, `module` (one per test file), `package`, or `session` (one per whole run). A fixture that `yield`s a value runs the code after `yield` as **teardown**, even when the test fails, like a `using` block or `IAsyncLifetime.DisposeAsync` in xUnit. The pattern below is the standard one for database tests: an expensive **session** resource, **module**-level reference data, and a **function**-level transaction that is rolled back so tests cannot see each other’s rows.

#### `demos/scopes/conftest.py`

```python
# scopes/conftest.py
"""A tiny warehouse fixture stack: session -> module -> function."""

import sqlite3
from collections.abc import Iterator

import pytest


@pytest.fixture(scope="session")
def warehouse(tmp_path_factory: pytest.TempPathFactory) -> Iterator[sqlite3.Connection]:
    """Expensive: created once per test run, closed after the last test."""
    path = tmp_path_factory.mktemp("wh") / "leafy.db"
    con = sqlite3.connect(path, isolation_level=None)  # autocommit; we manage transactions
    con.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, amount_cents INTEGER NOT NULL)")
    yield con  # everything after yield is teardown
    con.close()


@pytest.fixture(scope="module")
def seeded(warehouse: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    """Once per test file: load reference rows, remove them afterwards."""
    warehouse.executemany("INSERT INTO orders VALUES (?, ?)", [("O-1001", 2500), ("O-1002", 0)])
    yield warehouse
    warehouse.execute("DELETE FROM orders")


@pytest.fixture
def db(seeded: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    """Function scope (the default): each test runs in a transaction that is rolled back."""
    seeded.execute("BEGIN")
    yield seeded
    seeded.execute("ROLLBACK")
```

#### Two tests and the setup plan

```python
# scopes/test_orders.py
import sqlite3


def test_insert_a_new_order(db: sqlite3.Connection) -> None:
    db.execute("INSERT INTO orders VALUES ('O-1003', 1800)")
    assert db.execute("SELECT COUNT(*) FROM orders").fetchone() == (3,)


def test_previous_insert_was_rolled_back(db: sqlite3.Connection) -> None:
    assert db.execute("SELECT COUNT(*) FROM orders").fetchone() == (2,)
```

Terminal (durations measured on the build machine):

```text
$ pytest scopes --setup-show -q

SETUP    S tmp_path_factory
SETUP    S warehouse (fixtures used: tmp_path_factory)
    SETUP    M seeded (fixtures used: warehouse)
        SETUP    F db (fixtures used: seeded)
        scopes/test_orders.py::test_insert_a_new_order (fixtures used: db, request, seeded, tmp_path_factory, warehouse) .
        TEARDOWN F db
        SETUP    F db (fixtures used: seeded)
        scopes/test_orders.py::test_previous_insert_was_rolled_back (fixtures used: db, request, seeded, tmp_path_factory, warehouse) .
        TEARDOWN F db
    TEARDOWN M seeded
TEARDOWN S warehouse
TEARDOWN S tmp_path_factory
2 passed in 0.97s
```

Read the indentation: `S` = session, `M` = module, `F` = function. `warehouse` and `seeded` are set up once; `db` is set up and torn down around each test, and the second test sees 2 rows because the first test’s insert was rolled back. Teardown runs in reverse order of setup.

#### Pitfall: a wider scope cannot use a narrower fixture

```python
# mismatch/test_mismatch.py
import pytest


@pytest.fixture(scope="session")
def landing_dir(tmp_path):        # tmp_path is function-scoped
    return tmp_path / "landing"


def test_uses_landing(landing_dir):
    assert landing_dir.name == "landing"
```

Terminal:

```text
$ pytest mismatch -q
=========================================== ERRORS ============================================
ScopeMismatch: You tried to access the function scoped fixture tmp_path with a session scoped request object. Requesting fixture stack:
=================================== short test summary info ===================================
ERROR mismatch/test_mismatch.py::test_uses_landing - Failed: ScopeMismatch: You tried to acce...
[exit code 1]
```

A session fixture lives longer than any one test’s `tmp_path`. Use `tmp_path_factory.mktemp(...)`, which is session-scoped, as the warehouse fixture does.

#### Choosing a scope

| Scope | Use for | Risk |
|---|---|---|
| function | anything a test mutates; the default | slow if setup is expensive |
| module | reference data shared by one file | tests in the file can affect each other |
| session | expensive, read-only resources: an engine, a big parsed file, a container | one test mutating it breaks others in an order-dependent way (bug clinic) |

> **On the job:** Integration suites against DuckDB, Postgres in a container, or a Spark session use exactly this stack: create once per session, load reference data per module, isolate each test with a transaction or a fresh schema. When a suite becomes slow, widening the scope of the most expensive read-only fixture is usually the first fix.

> **The main idea:** scope sets how long a fixture lives; yield gives guaranteed teardown; share expensive read-only things widely and give anything mutable function scope.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [pytest: fixtures reference (scopes, conftest, order)](https://docs.pytest.org/en/stable/reference/fixtures.html), [pytest: tmp_path and tmp_path_factory](https://docs.pytest.org/en/stable/how-to/tmp_path.html).

---

<a id="slide-8"></a>
## 8. Factory fixtures: build test data with overrides

*Part A · how do I get 20 slightly different records without 20 fixtures?*

A **factory fixture** returns a *function* instead of a value. Each test calls it with only the fields it cares about, and gets a complete, valid record with every other field defaulted. It is the C# **test data builder** (or AutoFixture) pattern. Because the factory is created per test, it can also hand out unique IDs, keep a list of what it created for teardown, or write files into `tmp_path`.

#### `reference/tests/conftest.py`

```python
# reference/tests/conftest.py
"""Fixtures shared by every test below this folder (pytest finds them; no import needed)."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

FIXTURES = Path(__file__).parent / "fixtures"

EventFactory = Callable[..., str]


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    """Folder with the sample files: tests/fixtures next to this conftest."""
    return FIXTURES


@pytest.fixture(scope="session")
def day_lines(fixtures_dir: Path) -> tuple[str, ...]:
    """The 2026-03-08 sample day, read once per run. A tuple, so no test can mutate it."""
    text = (fixtures_dir / "orders_2026-03-08.jsonl").read_text(encoding="utf-8")
    return tuple(text.splitlines())


@pytest.fixture
def make_event() -> EventFactory:
    """Factory fixture: returns a function that builds one valid JSON line per call."""
    counter = iter(range(1, 1000))

    def make(*, drop: tuple[str, ...] = (), **overrides: Any) -> str:
        event: dict[str, Any] = {
            "event_id": f"T-{next(counter):03d}",
            "order_id": "O-9001",
            "customer_id": "C-01",
            "event_type": "order_placed",
            "amount": "12.00",
            "currency": "USD",
            "occurred_at": "2026-03-08T12:00:00Z",
            "items": [{"sku": "PLT-101", "qty": 1, "unit_price": "12.00"}],
        }
        event.update(overrides)
        return json.dumps({k: v for k, v in event.items() if k not in drop})

    return make
```

#### Tests read like the rule they check

```python
# reference/tests/unit/test_core.py
def test_first_copy_of_a_duplicate_wins(make_event: Any) -> None:
    first = make_event(event_id="E-1", amount="12.00")
    later = make_event(event_id="E-1", event_type="order_paid", items=[])
    result = validate_lines([first, later])
    assert [e.event_type for e in result.valid] == ["order_placed"]
    assert result.duplicates == 1
```

```python
# reference/tests/unit/test_models.py
def test_valid_event_is_parsed_and_typed(make_event: Any) -> None:
    event = OrderEvent.model_validate_json(make_event())
    assert event.amount == Decimal("12.00")
    assert event.items[0].qty == 1
```

Terminal (durations measured on the build machine):

```text
$ pytest reference/tests -k "duplicate or typed" -v --no-cov
reference/tests/unit/test_core.py::test_first_copy_of_a_duplicate_wins PASSED            [ 50%]
reference/tests/unit/test_models.py::test_valid_event_is_parsed_and_typed PASSED         [100%]
============================== 2 passed, 35 deselected in 2.55s ===============================
```

| How to supply test data | Use when | Example here |
|---|---|---|
| A fixture returning a value | many tests need the same read-only thing | `day_lines` (a tuple, read once per session) |
| A factory fixture | tests need variations of one valid record | `make_event(amount="0.00", drop=("customer_id",))` |
| A fixture file | the exact bytes matter: real shape, odd encodings, a full day | `fixtures/orders_2026-03-08.jsonl` (next lesson) |

`-k` selects tests whose names match an expression; `-v` prints one line per test. The `drop=` argument removes a field entirely, which is different from setting it to `None`: Pydantic reports `missing` for one and a type error for the other.

> **On the job:** Factory fixtures are what keep a 300-test suite maintainable: when the event schema gains a required field, you add one default in the factory instead of editing 300 JSON literals.

> **The main idea:** return a builder from the fixture, default every field to something valid, and let each test override only what it is about.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [pytest: factories as fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html#factories-as-fixtures).

---

<a id="slide-9"></a>
## 9. Fixture files and golden expectations

*Part A · when do test inputs belong in files, and how do I find them?*

A **fixture file** is a small data file committed next to the tests: it has the real shape of production input (field names, nesting, encodings, line endings) but invented values. A **golden** (or *expected*) result is the known-correct output for that file, written down once and compared on every run. Together they turn “I looked at the output and it seemed fine” into a repeatable check.

#### The test: one bad line per reason

```python
# reference/tests/unit/test_core.py
EXPECTED_BAD_REASONS = [
    "missing:customer_id",
    "greater_than_equal:amount",
    "timezone_aware:occurred_at",
    "json_invalid:record",
    "value_error:record",
    "literal_error:event_type",
    "decimal_max_places:amount",
    "string_pattern_mismatch:items.0.sku",
    "model_type:record",
    "literal_error:currency",
]

def test_every_bad_line_gets_its_reason(fixtures_dir: Path) -> None:
    lines = (fixtures_dir / "bad_lines.jsonl").read_text(encoding="utf-8").splitlines()
    result = validate_lines(lines)
    assert result.valid == []
    assert [r.reason for r in result.rejected] == EXPECTED_BAD_REASONS
```

#### What the file contains, and what each line produces

```python
from pathlib import Path

from leafy_ingest.core import validate_lines

lines = Path("tests/fixtures/bad_lines.jsonl").read_text(encoding="utf-8").splitlines()
for r in validate_lines(lines).rejected:
    print(f"{r.line_no:>2}  {r.reason:<36} {r.raw[:30]}")
```

Output:

```text
 1  missing:customer_id                  {"event_id": "B-001", "order_i
 2  greater_than_equal:amount            {"event_id": "B-002", "order_i
 3  timezone_aware:occurred_at           {"event_id": "B-003", "order_i
 4  json_invalid:record                  {"event_id": "B-004", "order_i
 5  value_error:record                   {"event_id": "B-005", "order_i
 6  literal_error:event_type             {"event_id": "B-006", "order_i
 7  decimal_max_places:amount            {"event_id": "B-007", "order_i
 8  string_pattern_mismatch:items.0.sku  {"event_id": "B-008", "order_i
 9  model_type:record                    ["B-009", "order_paid"]
10  literal_error:currency               {"event_id": "B-010", "order_i
```

- Locate files from the test file, not from the current directory: `Path(__file__).parent / "fixtures"`. `open("tests/fixtures/x")` passes when you run from the repository root and fails in an IDE or a CI step that starts elsewhere (bug clinic).
- Keep each file tiny and readable: one line per edge case, a comment or a table in the test saying why each line exists. A 50 MB production sample is not a unit-test fixture.
- Never copy real customer data into fixtures. Invent values with the real shape; if you start from a real record, replace every identifier.
- When the expected output is large (a whole CSV), compare against a committed golden file and regenerate it deliberately when behaviour changes; snapshot plugins such as *syrupy* automate this.

> **In your portfolio (Fuel Smart):** commit a 50-recipe fixture with the real Food.com column names, including the ugly ingredient lines (`1 1/2`, `½`, `2-3`, a missing unit) and the expected parsed grams as a golden file. The same file feeds unit tests, the CLI integration test and a reviewer reading the repository.

> **On the job:** A fixture file per known production incident is a common team habit: the bad line that broke Tuesday’s run becomes a permanent line in `bad_lines.jsonl`, with the reason code it must now produce.

> **The main idea:** commit small files with the real shape and invented values, find them relative to the test file, and pin the expected result for each line.

*Read more:* [pytest: tmp_path and tmp_path_factory](https://docs.pytest.org/en/stable/how-to/tmp_path.html), [pathlib](https://docs.python.org/3/library/pathlib.html).

---

<a id="slide-10"></a>
## 10. parametrize in depth: ids, marks, stacking, and parametrized fixtures

*Part A · one test function, many named cases*

`@pytest.mark.parametrize` runs one test once per row of arguments (the basics are in the files-and-streams deck, lesson 33). Three features make it scale: **`pytest.param(..., id=...)`** names a case so a failure says `[half-cent]` instead of `[amount3-cents3]`; **`marks=`** attaches a marker to one case, such as an expected failure; and **stacked** decorators produce every combination. An **xfail** marks a test that is expected to fail (a known bug or an undecided rule); with `strict=True` it turns into a failure the day it starts passing, so the marker cannot outlive the bug.

#### `demos/test_param_demo.py`

```python
# test_param_demo.py
from decimal import Decimal

import pytest


def to_cents(amount: Decimal) -> int:
    return int(amount * 100)


@pytest.mark.parametrize(
    ("amount", "cents"),
    [
        pytest.param(Decimal("25.00"), 2500, id="whole"),
        pytest.param(Decimal("0.00"), 0, id="zero"),
        pytest.param(Decimal("19.99"), 1999, id="cents"),
        pytest.param(Decimal("0.005"), 1, id="half-cent",
                     marks=pytest.mark.xfail(reason="rounding rule not decided yet", strict=True)),
    ],
)
def test_to_cents(amount: Decimal, cents: int) -> None:
    assert to_cents(amount) == cents


@pytest.mark.parametrize("platform", ["web", "ios"])
@pytest.mark.parametrize("tz", ["UTC", "America/Chicago"])
def test_every_combination(platform: str, tz: str) -> None:   # 2 x 2 = 4 tests
    assert platform and tz
```

#### Each case is a named test

Terminal (durations measured on the build machine):

```text
$ pytest test_param_demo.py -v
test_param_demo.py::test_to_cents[whole] PASSED                                          [ 12%]
test_param_demo.py::test_to_cents[zero] PASSED                                           [ 25%]
test_param_demo.py::test_to_cents[cents] PASSED                                          [ 37%]
test_param_demo.py::test_to_cents[half-cent] XFAIL (rounding rule not decided yet)       [ 50%]
test_param_demo.py::test_every_combination[UTC-web] PASSED                               [ 62%]
test_param_demo.py::test_every_combination[UTC-ios] PASSED                               [ 75%]
test_param_demo.py::test_every_combination[America/Chicago-web] PASSED                   [ 87%]
test_param_demo.py::test_every_combination[America/Chicago-ios] PASSED                   [100%]
================================ 7 passed, 1 xfailed in 1.18s =================================
```

IDs from stacked decorators are joined with `-`, the innermost decorator first. Select one case on the command line with `pytest "test_param_demo.py::test_to_cents[zero]"`.

#### Parametrized fixture: every test that uses it runs per value

```python
# reference/tests/integration/test_files.py
@pytest.fixture(params=["\n", "\r\n"], ids=["LF", "CRLF"])
def day_file(request: pytest.FixtureRequest, tmp_path: Path, day_lines: tuple[str, ...]) -> Path:
    """Every test that uses this fixture runs twice: once per line ending."""
    path = tmp_path / "day.jsonl"
    path.write_bytes((request.param.join(day_lines) + request.param).encode("utf-8"))
    return path


def test_reader_handles_both_line_endings(day_file: Path) -> None:
    result = validate_lines(read_lines(day_file))
    assert (len(result.valid), len(result.rejected), result.duplicates) == (12, 2, 1)
```

`request.param` is the current value. Windows exports often arrive with CRLF line endings; this fixture makes the reader prove it handles both, for every test that asks for `day_file`.

#### Which tool for which variation

| Need | Use |
|---|---|
| many inputs → expected outputs for one rule | `parametrize` with `pytest.param(id=…)` |
| the same tests against several environments or inputs | a fixture with `params=` |
| a known bug you are not fixing today | `marks=pytest.mark.xfail(strict=True, reason=…)` |
| a case that cannot run here (no network, wrong OS) | `pytest.mark.skipif(condition, reason=…)` |

> **On the job:** A parametrize table is the cheapest way to show a reviewer that you thought about edge cases: zero, negative, NULL, three decimals, DST, CRLF. Interviewers often hand you a function and ask “what would you test?”; answering with a named case table is exactly what they want to see.

> **The main idea:** name every case with pytest.param(id=...), mark single cases with marks=, stack decorators for combinations, and use fixture params to run whole tests per variant.

*Read more:* [pytest: parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html), [pytest: skip and xfail](https://docs.pytest.org/en/stable/how-to/skipping.html), [pytest: fixtures reference (scopes, conftest, order)](https://docs.pytest.org/en/stable/reference/fixtures.html).

---

<a id="slide-11"></a>
## 11. monkeypatch, captured output, and controlling time

*Part A · how do I test code that reads the environment or the clock? (added)*

**`monkeypatch`** is a built-in fixture that changes something for one test and undoes it afterwards: `setenv`/`delenv` for environment variables, `setattr` for an attribute or a module function, `chdir` for the working directory. **`capsys`** captures what the code printed. For time, prefer **injecting a clock** (a parameter that defaults to the real one) over patching `datetime`: it is explicit, works with any library, and mypy checks it. HTTP calls are patched with MockTransport or RESPX (*Reliable Python ingestion*, lesson 19).

#### The integration tests

```python
# reference/tests/integration/test_cli.py
def test_sample_day_end_to_end(
    run_cli: RunCli, fixtures_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code, out = run_cli(fixtures_dir / "orders_2026-03-08.jsonl")
    assert code == 0
    assert capsys.readouterr().out == "12 valid, 2 rejected, 1 duplicates -> out\n"
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    assert manifest == {
        "source": "orders_2026-03-08.jsonl",
        "run_at_utc": "2026-03-09T06:00:00Z",
        "lines_read": 15,
        "valid": 12,
        "rejected": 2,
        "duplicates": 1,
    }
    with (out / "order_events.csv").open(encoding="utf-8", newline="") as f:
        assert len(list(csv.DictReader(f))) == 12
    quarantine = (out / "quarantine.jsonl").read_text(encoding="utf-8").splitlines()
    reasons = [json.loads(line)["reason"] for line in quarantine]
    assert reasons == ["missing:customer_id", "timezone_aware:occurred_at"]


def test_reject_limit_from_environment(
    run_cli: RunCli, fixtures_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LEAFY_MAX_REJECT_RATE", "0.05")
    code, out = run_cli(fixtures_dir / "orders_2026-03-08.jsonl")
    assert code == 2
    assert not out.exists()  # nothing is published when the batch is refused


def test_missing_input_file(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main([str(tmp_path / "nope.jsonl"), "--out", str(tmp_path)]) == 1
    assert "no such file: nope.jsonl" in capsys.readouterr().out
```

#### Run them

Terminal (durations measured on the build machine):

```text
$ pytest reference/tests/integration -v --no-cov
reference/tests/integration/test_cli.py::test_sample_day_end_to_end PASSED               [ 16%]
reference/tests/integration/test_cli.py::test_reject_limit_from_environment PASSED       [ 33%]
reference/tests/integration/test_cli.py::test_missing_input_file PASSED                  [ 50%]
reference/tests/integration/test_cli.py::test_real_clock_is_utc PASSED                   [ 66%]
reference/tests/integration/test_files.py::test_reader_handles_both_line_endings[LF] PASSED [ 83%]
reference/tests/integration/test_files.py::test_reader_handles_both_line_endings[CRLF] PASSED [100%]
====================================== 6 passed in 1.40s ======================================
```

- `run_cli` passes `fixed_clock`, so `run_at_utc` in the manifest is always `2026-03-09T06:00:00Z` and the whole manifest can be compared with `==`.
- `monkeypatch.setenv` lowers the reject limit for one test only; the next test sees the real environment again.
- The refused batch publishes nothing: the test asserts that the output folder does not exist.
- One tiny test calls the real `utc_now` so the default is covered and known to be time-zone aware.

| Tool | Patches | Undo |
|---|---|---|
| `monkeypatch.setenv / delenv` | environment variables | automatic after the test |
| `monkeypatch.setattr(module, "name", fake)` | a function or attribute where it is *looked up* | automatic |
| `unittest.mock.patch("pkg.mod.name")` | the same, plus call recording (`assert_called_once_with`) | context manager or decorator |
| an injected parameter (`clock=`, `client=`) | nothing: the test passes its own | not needed |

> **On the job:** Flaky tests in data code are mostly about time: a test that passes all day and fails after 19:00 in Chicago because `date.today()` rolled over in UTC. Injected clocks and fixed dates remove the whole class of problem.

> **The main idea:** patch environment and attributes with monkeypatch, capture prints with capsys, and inject clocks instead of patching datetime.

*Read more:* [pytest: monkeypatch](https://docs.pytest.org/en/stable/how-to/monkeypatch.html), [pytest: capturing output](https://docs.pytest.org/en/stable/how-to/capture-stdout-stderr.html), [unittest.mock](https://docs.python.org/3/library/unittest.mock.html).

---

<a id="slide-12"></a>
## 12. Pydantic models: a contract for one record

*Part B · how do I turn “what a valid event looks like” into code?*

**Pydantic** validates data against a class you declare with type hints. A **model** is a subclass of `BaseModel`; at runtime each annotation becomes a check plus a conversion: `"25.00"` becomes `Decimal("25.00")`, an ISO string becomes a `datetime`. Hints alone never do this (the foundations deck, lesson 31); Pydantic reads them and enforces them. Coming from C#: think `System.Text.Json` deserialisation plus DataAnnotations (`[Required]`, `[Range]`, `[RegularExpression]`) in one step, with every error collected instead of the first one thrown.

#### `src/leafy_ingest/models.py`

```python
# src/leafy_ingest/models.py
LEAFY_TZ = ZoneInfo("America/Chicago")

Money = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
EventType = Literal["order_placed", "order_paid", "order_cancelled", "order_refunded"]


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    sku: Annotated[str, Field(pattern=r"^PLT-\d{3}$")]
    qty: Annotated[int, Field(gt=0)]
    unit_price: Money


class OrderEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True, str_strip_whitespace=True)

    event_id: Annotated[str, Field(min_length=1)]
    order_id: Annotated[str, Field(pattern=r"^O-\d{4}$")]
    customer_id: Annotated[str, Field(min_length=1)]
    event_type: EventType
    amount: Money
    currency: Literal["USD"]
    occurred_at: AwareDatetime
    items: list[Item] = Field(default_factory=list)

    @field_validator("currency", mode="before")
    @classmethod
    def upper_currency(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def placed_amount_matches_items(self) -> OrderEvent:
        if self.event_type != "order_placed":
            return self
        if not self.items:
            raise ValueError("order_placed needs at least one item")
        total = sum((i.unit_price * i.qty for i in self.items), Decimal("0"))
        if total != self.amount:
            raise ValueError(f"amount {self.amount} != items total {total}")
        return self

    @property
    def business_date(self) -> date:
        """The Leafy business day: the event time in Chicago, not in UTC."""
        return self.occurred_at.astimezone(LEAFY_TZ).date()
```

#### Parse a line, then break one

```python
from leafy_ingest.models import OrderEvent
from pydantic import ValidationError

good = ('{"event_id":"E-001","order_id":"O-1001","customer_id":"C-01",'
        '"event_type":"order_placed","amount":"25.00","currency":"usd",'
        '"occurred_at":"2026-03-08T05:30:00Z",'
        '"items":[{"sku":"PLT-101","qty":1,"unit_price":"25.00"}]}')
e = OrderEvent.model_validate_json(good)      # parse + validate in one call
print(repr(e.amount), e.currency, e.occurred_at.isoformat(), e.business_date)
print(e.model_dump(mode="json")["items"])

bad = ('{"event_id":"","order_id":"1001","event_type":"order_shipped",'
       '"amount":"-1","currency":"USD","occurred_at":"2026-03-08 05:30"}')
try:
    OrderEvent.model_validate_json(bad)
except ValidationError as err:
    print(err.error_count(), "errors")
    for x in err.errors(include_url=False):
        print(f"  {x['type']:<24} {'.'.join(map(str, x['loc'])):<12} {x['msg'][:44]}")
```

Output:

```text
Decimal('25.00') USD 2026-03-08T05:30:00+00:00 2026-03-07
[{'sku': 'PLT-101', 'qty': 1, 'unit_price': '25.00'}]
6 errors
  string_too_short         event_id     String should have at least 1 character
  string_pattern_mismatch  order_id     String should match pattern '^O-\d{4}$'
  missing                  customer_id  Field required
  literal_error            event_type   Input should be 'order_placed', 'order_paid'
  greater_than_equal       amount       Input should be greater than or equal to 0
  timezone_aware           occurred_at  Input should have timezone info
```

| Building block | What it does here |
|---|---|
| `Annotated[str, Field(pattern=…)]` | a type plus constraints: regex, `min_length`, `gt`/`ge`, `max_digits`, `decimal_places` |
| `Money = Annotated[Decimal, Field(ge=0, …)]` | a reusable constrained type: define once, use for every money field |
| `Literal["order_placed", …]` | an enumeration of allowed strings (a closed set of event types) |
| `AwareDatetime` | a datetime that *must* carry a time zone; naive times are rejected |
| `list[Item]` | nested models are validated recursively; errors report the path, e.g. `items.0.sku` |
| `ConfigDict(frozen=True)` | instances are immutable and hashable, like a C# `record` |
| `model_validate_json` vs `model_validate` | JSON text vs a Python dict; the JSON path parses in Rust and is faster than `json.loads` + validate |

> **On the job:** Pydantic is the most common way Python data teams express an **input contract**: API payloads, event schemas, config files (pydantic-settings), and the models FastAPI and dlt build on. An interviewer who asks “how do you validate incoming records?” is usually happy to hear “a Pydantic model at the boundary, with every rejection given a reason”.

> **The main idea:** declare the record once as a model; Pydantic converts what it safely can, rejects what it cannot, and reports every error with a type and a location.

*Read more:* [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [Pydantic: fields](https://docs.pydantic.dev/latest/concepts/fields/), [Pydantic: AwareDatetime](https://docs.pydantic.dev/latest/api/types/#pydantic.types.AwareDatetime).

---

<a id="slide-13"></a>
## 13. Validators, strict mode, and extra fields

*Part B · rules that types cannot express, and how much conversion to allow (added)*

A **field validator** (`@field_validator`) is a method that checks or transforms one field: `mode="before"` runs on the raw input (normalise text before the type check), `mode="after"` on the converted value. A **model validator** (`@model_validator(mode="after")`) sees the whole object, for rules across fields such as “amount equals the sum of the items”. Raise `ValueError` to reject; Pydantic turns it into a `value_error`. **Lax mode** (the default) converts safe-looking inputs (`"1"` → `1`); **strict mode** requires the exact type.

#### The two validators in `OrderEvent`

```python
# src/leafy_ingest/models.py
    @field_validator("currency", mode="before")
    @classmethod
    def upper_currency(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def placed_amount_matches_items(self) -> OrderEvent:
        if self.event_type != "order_placed":
            return self
        if not self.items:
            raise ValueError("order_placed needs at least one item")
        total = sum((i.unit_price * i.qty for i in self.items), Decimal("0"))
        if total != self.amount:
            raise ValueError(f"amount {self.amount} != items total {total}")
        return self
```

#### Lax vs strict, forbid vs ignore

```python
from pydantic import BaseModel, ConfigDict, TypeAdapter, ValidationError
from leafy_ingest.models import Item, OrderEvent

raw = {"sku": "PLT-101", "qty": "2", "unit_price": 12}
print("lax   :", Item.model_validate(raw))
try:
    Item.model_validate(raw, strict=True)
except ValidationError as err:
    print("strict:", err.errors()[0]["type"], err.errors()[0]["loc"])

try:                                    # Item has extra="forbid"
    Item.model_validate({**raw, "colour": "green"})
except ValidationError as err:
    print("forbid:", err.errors()[0]["type"], err.errors()[0]["loc"])

items = TypeAdapter(list[Item]).validate_python([raw, {**raw, "sku": "PLT-102"}])
print("TypeAdapter:", [i.sku for i in items])
```

Output:

```text
lax   : sku='PLT-101' qty=2 unit_price=Decimal('12')
strict: int_type ('qty',)
forbid: extra_forbidden ('colour',)
TypeAdapter: ['PLT-101', 'PLT-102']
```

#### The trap: whitespace and `Literal`

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, ValidationError

class Naive(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    currency: Literal["USD"]

try:
    Naive.model_validate({"currency": " USD "})
except ValidationError as err:
    print(err.errors()[0]["type"], repr(err.errors()[0]["input"]))
```

Output:

```text
literal_error ' USD '
```

`str_strip_whitespace` applies to `str` fields, not to a `Literal`. This was a real failure while building the lab: the first version of the validator only called `.upper()`. The fix is the `mode="before"` validator above, which strips *and* upper-cases before the literal check, plus a test case `" usd "`.

#### Choosing the settings

| Setting | Pick it when |
|---|---|
| `extra="ignore"` (default) | the source may add fields; you only promise what you read (events, APIs) |
| `extra="forbid"` | a typo must fail: configs, hand-written files, nested items you own |
| lax (default) | text formats (CSV, query strings) where everything arrives as a string |
| `strict=True` | typed sources (JSON from your own service): `"2"` for an int is a producer bug you want to see |

> **On the job:** Contract changes are the most common cause of ingestion incidents. Deciding explicitly what is coerced, what is ignored and what is forbidden, and writing a test for each decision, is what lets a team say “that change upstream would have been caught” in the post-mortem.

> **The main idea:** use field validators to normalise and model validators for cross-field rules; choose lax or strict and ignore or forbid deliberately, and test each choice.

*Read more:* [Pydantic: validators](https://docs.pydantic.dev/latest/concepts/validators/), [Pydantic: strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/), [Pydantic: ConfigDict](https://docs.pydantic.dev/latest/api/config/), [Pydantic: TypeAdapter](https://docs.pydantic.dev/latest/concepts/type_adapter/).

---

<a id="slide-14"></a>
## 14. Record validation with quarantine and reason codes

*Part B · how do Pydantic errors become a quarantine file someone can act on?*

**Quarantine** keeps bad records with where, why and what, so good records continue (the ingestion deck, lesson 24, introduced the idea with hand-written checks). With Pydantic, the *why* comes for free: every error has a stable **error type** (`missing`, `literal_error`, `timezone_aware` …) and a **location**. Joined as `type:location`, they make a **reason code** you can count, alert on and group in a dashboard.

#### `core.py`: one function maps errors to reasons

```python
# src/leafy_ingest/core.py
class TooManyRejectsError(Exception):
    """The share of rejected lines suggests a format change upstream."""


def reason_of(error: ValidationError) -> tuple[str, str]:
    """First error -> ('type:location', message). Location 'record' = a whole-model rule."""
    first = error.errors(include_url=False)[0]
    where = ".".join(str(part) for part in first["loc"]) or "record"
    return f"{first['type']}:{where}", first["msg"]


def parse_line(line_no: int, line: str, raw_limit: int = 500) -> OrderEvent | Rejected:
    try:
        return OrderEvent.model_validate_json(line)
    except ValidationError as error:
        reason, detail = reason_of(error)
        return Rejected(line_no, reason, detail, line[:raw_limit])

def check_reject_rate(result: BatchResult, limit: float) -> None:
    if result.reject_rate > limit:
        raise TooManyRejectsError(
            f"{len(result.rejected)} of {result.lines_read} lines rejected "
            f"({result.reject_rate:.0%} > limit {limit:.0%})"
        )
```

#### Run it on the sample day

```python
import json
from collections import Counter
from dataclasses import asdict
from pathlib import Path

from leafy_ingest.core import TooManyRejectsError, check_reject_rate, validate_lines

lines = Path("tests/fixtures/orders_2026-03-08.jsonl").read_text(encoding="utf-8").splitlines()
result = validate_lines(lines)
print(f"read {result.lines_read}: valid {len(result.valid)}, rejected {len(result.rejected)}, "
      f"duplicates {result.duplicates}, reject rate {result.reject_rate:.1%}")
print(Counter(r.reason for r in result.rejected))

q = asdict(result.rejected[0])
q["raw"] = q["raw"][:48] + "..."
print(json.dumps(q, indent=1))

for limit in (0.25, 0.10):
    try:
        check_reject_rate(result, limit)
        print(f"limit {limit:.0%}: publish")
    except TooManyRejectsError as err:
        print(f"limit {limit:.0%}: refuse -> {err}")
```

Output:

```text
read 15: valid 12, rejected 2, duplicates 1, reject rate 13.3%
Counter({'missing:customer_id': 1, 'timezone_aware:occurred_at': 1})
{
 "line_no": 8,
 "reason": "missing:customer_id",
 "detail": "Field required",
 "raw": "{\"event_id\": \"E-007\", \"order_id\": \"O-1004\", \"eve..."
}
limit 25%: publish
limit 10%: refuse -> 2 of 15 lines rejected (13% > limit 10%)
```

- Use only the **first** error for the reason code, so each line counts once; keep the full list in a `detail` field if you need it.
- Truncate the raw text: a 5 MB line should not become a 5 MB log entry, and quarantine files are often readable by more people than the raw zone.
- The batch-level threshold is separate from the record rule: two bad lines in fifteen is normal; half the file bad means the format changed, and publishing the other half would hide that.

> **On the job:** Quarantine counts by reason are what on-call engineers look at first: a jump in `missing:customer_id` after a release of the checkout service tells you who to call. Reason codes that come from the validator’s error type stay consistent without anyone maintaining a list.

> **The main idea:** turn each ValidationError into a stable type:location reason, quarantine the line with it, and refuse the whole batch above a reject-rate limit.

*Read more:* [Pydantic: validation error types](https://docs.pydantic.dev/latest/errors/validation_errors/), [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/).

---

<a id="slide-15"></a>
## 15. Pandera: a schema for a whole DataFrame

*Part B · how do I check a batch, not a record?*

**Pandera** validates a pandas (or Polars) **DataFrame** against a declared schema: column names and dtypes, per-column checks, uniqueness, nullability, and **DataFrame-level checks** that look at several rows at once. Pydantic checks one record at a time; Pandera checks properties that only exist across rows, such as “each order is placed only once”. **`DataFrameModel`** is the class style (like a Pydantic model); `DataFrameSchema` is the same thing built as an object, handy when columns are generated.

#### `src/leafy_ingest/frames.py`

```python
# src/leafy_ingest/frames.py
class OrderEventsFrame(pa.DataFrameModel):
    event_id: Series[str] = pa.Field(unique=True)
    order_id: Series[str] = pa.Field(str_matches=r"^O-\d{4}$")
    customer_id: Series[str]
    event_type: Series[str] = pa.Field(isin=EVENT_TYPES)
    amount_cents: Series[int] = pa.Field(ge=0)
    occurred_at_utc: Series[str] = pa.Field(str_matches=r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
    business_date: Series[str] = pa.Field(str_matches=r"^\d{4}-\d\d-\d\d$")

    class Config:
        strict = True  # no unexpected columns
        coerce = True  # cast to the declared dtypes before checking

    @pa.dataframe_check
    @classmethod
    def one_placed_event_per_order(cls, df: pd.DataFrame) -> bool:
        placed = df.loc[df["event_type"] == "order_placed", "order_id"]
        return bool(placed.is_unique)

def validate_frame(df: pd.DataFrame) -> DataFrame[OrderEventsFrame]:
    """lazy=True collects every failure instead of stopping at the first one."""
    return OrderEventsFrame.validate(df, lazy=True)
```

#### Validate the sample day

```python
from pathlib import Path

from leafy_ingest.core import validate_lines
from leafy_ingest.frames import to_frame, validate_frame

lines = Path("tests/fixtures/orders_2026-03-08.jsonl").read_text(encoding="utf-8").splitlines()
frame = validate_frame(to_frame(validate_lines(lines).valid))
print(frame.shape)
print(frame[["event_id", "event_type", "amount_cents", "occurred_at_utc", "business_date"]]
      .head(4).to_string(index=False))
```

Output:

```text
(12, 7)
event_id   event_type  amount_cents      occurred_at_utc business_date
   E-001 order_placed          2500 2026-03-08T05:30:00Z    2026-03-07
   E-002   order_paid          2500 2026-03-08T05:31:10Z    2026-03-07
   E-003 order_placed             0 2026-03-08T07:59:00Z    2026-03-08
   E-004   order_paid             0 2026-03-08T08:00:30Z    2026-03-08
```

`E-001` happened at 05:30 UTC on 8 March, which is still **7 March** in Chicago: the business date column carries the rule from the Pydantic model into the batch.

#### Coercion: what `coerce=True` buys you

```python
import pandas as pd
import pandera.pandas as pa

daily = pa.DataFrameSchema(
    {
        "business_date": pa.Column("datetime64[ns]", unique=True),
        "orders": pa.Column(int, pa.Check.ge(0)),
        "revenue": pa.Column(float, pa.Check.ge(0)),
    },
    strict=True,
    coerce=True,
)
csv_like = pd.DataFrame({"business_date": ["2026-03-07", "2026-03-08"],
                         "orders": ["1", "5"], "revenue": ["25.00", "103.50"]})
print(daily.validate(csv_like).dtypes.to_dict())
```

Output:

```text
{'business_date': dtype('<M8[ns]'), 'orders': dtype('int64'), 'revenue': dtype('float64')}
```

#### Checks you will use most

| Check | DataFrameModel | Object API |
|---|---|---|
| range | `Field(ge=0)` | `Check.ge(0)` |
| allowed values | `Field(isin=[…])` | `Check.isin([…])` |
| regex | `Field(str_matches=…)` | `Check.str_matches(…)` |
| unique / nullable | `Field(unique=True, nullable=False)` | `Column(…, unique=True)` |
| several rows | `@pa.dataframe_check` | `DataFrameSchema(checks=[…])` |
| no unexpected columns | `Config.strict = True` | `strict=True` |

> **On the job:** Pandera schemas sit at the hand-off points of a Python pipeline: after a transform and before writing Parquet or loading a table. They play the role dbt tests play in SQL (the dbt decks): `unique`, `not_null`, `accepted_values`, plus custom checks, but before the data leaves Python.

> **The main idea:** describe the batch as a DataFrameModel: dtypes, column checks and multi-row checks in one place, with coercion for text sources.

*Read more:* [Pandera: DataFrame models](https://pandera.readthedocs.io/en/stable/dataframe_models.html), [Pandera: checks](https://pandera.readthedocs.io/en/stable/checks.html), [Pandera documentation](https://pandera.readthedocs.io/en/stable/).

---

<a id="slide-16"></a>
## 16. Lazy validation: every failure, then quarantine the rows

*Part B · how do I get all the problems in a batch, and keep the good rows?*

By default Pandera stops at the first failing check (`SchemaError`). With **`lazy=True`** it runs every check and raises one `SchemaErrors` whose **`failure_cases`** is itself a DataFrame: which check failed, on which column, with which value, at which row **index**. Row-level failures have an index; DataFrame-level failures (a multi-row check) have none, because no single row is to blame.

```python
from pathlib import Path

import pandera.errors

from leafy_ingest.core import validate_lines
from leafy_ingest.frames import to_frame, validate_frame

lines = Path("tests/fixtures/orders_2026-03-08.jsonl").read_text(encoding="utf-8").splitlines()
frame = to_frame(validate_lines(lines).valid)
frame.loc[0, "amount_cents"] = -1                          # a row-level problem
frame.loc[2, "business_date"] = "08/03/2026"               # another one
frame.loc[frame["event_id"] == "E-005", "order_id"] = "O-1001"   # a batch-level problem

try:
    validate_frame(frame)
except pandera.errors.SchemaErrors as err:
    cases = err.failure_cases
    print(cases[["schema_context", "column", "check", "failure_case", "index"]].to_string(index=False))

    bad_rows = cases["index"].dropna().astype(int).unique()
    batch_level = cases["index"].isna().any()
    good = frame.drop(index=bad_rows)
    print(f"\nquarantine rows {sorted(bad_rows.tolist())}; keep {len(good)} rows; "
          f"batch-level failure: {batch_level}")
```

Output:

```text
 schema_context           column                            check failure_case index
DataFrameSchema OrderEventsFrame       one_placed_event_per_order        False  None
         Column     amount_cents      greater_than_or_equal_to(0)           -1     0
         Column    business_date str_matches('^\d{4}-\d\d-\d\d$')   08/03/2026     2

quarantine rows [0, 2]; keep 10 rows; batch-level failure: True
```

#### What to do with each kind

- **Row-level** failures: drop those rows into quarantine with `check` as the reason, continue with the rest (the same policy as records in lesson 14).
- **Batch-level** failures: stop. Two `order_placed` events for one order means duplicated upstream data or a key collision, and dropping rows would hide it.
- In the lab’s CLI, validation is the final *contract* before writing, so any failure raises: Pydantic already quarantined bad records, and a Pandera failure here means a bug in our own code.

#### Validate function inputs and outputs

```python
import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame
from leafy_ingest.frames import OrderEventsFrame

@pa.check_types
def paid_only(df: DataFrame[OrderEventsFrame]) -> DataFrame[OrderEventsFrame]:
    return df[df["event_type"] == "order_paid"]

try:
    paid_only(pd.DataFrame({"event_id": ["E-1"]}))
except pa.errors.SchemaError as err:
    print(type(err).__name__, "->", str(err).splitlines()[0][:70])
```

Output:

```text
SchemaError -> column 'order_id' not in dataframe. Columns in dataframe: ['event_id']
```

`@pa.check_types` validates arguments and return values annotated with `DataFrame[Model]` at runtime: a cheap guard on the functions between pipeline steps.

> **On the job:** “Fail the run or drop the bad rows?” is a classic interview follow-up. The strong answer separates the two kinds: isolate row-level problems with a reason and a threshold, stop on batch-level contract violations, and always make the decision visible in counts.

> **The main idea:** validate with lazy=True, quarantine rows that have an index, and stop the batch on failures that have none.

*Read more:* [Pandera: lazy validation](https://pandera.readthedocs.io/en/stable/lazy_validation.html), [Pandera: DataFrame models](https://pandera.readthedocs.io/en/stable/dataframe_models.html), [Pandera: decorators (check_types)](https://pandera.readthedocs.io/en/stable/decorators.html).

---

<a id="slide-17"></a>
## 17. Choosing a validator: Pydantic, Pandera, dataclasses, or dbt tests

*Part B · interview pattern: which tool for which check?*

All of these check data; they differ in **what unit** they look at and **where** in the pipeline they run. Pick by the shape of the data at that point, not by habit.

| Tool | Unit it checks | Best at | Weak at |
|---|---|---|---|
| **Pydantic** | one record (dict / JSON) | parsing and converting untrusted input; nested objects; per-record reasons | rules across rows (uniqueness, one placed event per order); millions of rows one by one |
| **Pandera** | a DataFrame | dtypes, column checks, uniqueness, multi-row and statistical checks; works with pandas and Polars | nested JSON; converting messy text field by field |
| **dataclasses + hand checks** | one record | zero dependencies, full control (the foundations deck) | you write and maintain every rule and message |
| **mypy** | your code, before it runs | wrong types between your own functions, `None` handling | anything about data at runtime: it never sees the data |
| **dbt tests** / SQL checks | a table in the warehouse | unique, not null, relationships, accepted values after loading (the dbt decks) | stopping bad data before it lands |

#### Where each sits in the Leafy flow

1. **Pydantic** (per line): parse, convert, reject with a reason
2. **Pandera** (per batch): contract before writing the CSV / Parquet
3. **dbt tests** (per table): after loading, across days and sources
4. **mypy** (per commit): our code passes the right types around

#### Decision rules

- Data arrives as JSON or dicts → Pydantic at the boundary.
- Data is already a DataFrame → Pandera; do not loop rows through Pydantic.
- The check needs history or other tables (late events, referential integrity across days) → warehouse tests.
- Two layers are normal: Pydantic for records plus Pandera for the batch, as in the lab. Do not repeat the same rule in both without a reason.

> **On the job:** In design interviews, naming the layer is the point: “Pydantic at ingestion with quarantine, a Pandera contract before we write Parquet, dbt tests in the warehouse, mypy and pytest in CI for the code” shows you know that code quality and data quality are different problems with different tools.

> **The main idea:** Pydantic for records at the boundary, Pandera for batches in Python, dbt tests for tables in the warehouse, and mypy for the code itself.

*Read more:* [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [Pandera documentation](https://pandera.readthedocs.io/en/stable/), [dbt: data tests](https://docs.getdbt.com/docs/build/data-tests).

---

<a id="slide-18"></a>
## 18. mypy configuration for a real package

*Part C · what goes in [tool.mypy], and what does strict turn on?*

**mypy** is a **static type checker**: it reads your code and type hints without running anything and reports places where types cannot fit, like the C# compiler does on every build. The foundations deck ran it once on a file (lesson 31). A project needs a **configuration** so every developer, the editor and CI check the same files with the same rules. **Gradual typing** means unannotated code is allowed and unchecked by default; `strict = true` turns that off, so new code must be fully annotated.

#### `[tool.mypy]` in `pyproject.toml`

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
files = ["src", "tests"]
mypy_path = "src"
explicit_package_bases = true
plugins = ["pydantic.mypy"]                  # understands BaseModel __init__ and validators
warn_unreachable = true
enable_error_code = ["ignore-without-code", "redundant-expr", "truthy-bool"]
```

#### Run it: no arguments, the config says what to check

Terminal (first run builds a cache; later runs are incremental):

```text
$ mypy
Success: no issues found in 7 source files
```

Terminal:

```text
$ mypy src reference/tests
Success: no issues found in 13 source files
```

| Setting | What it does | Why here |
|---|---|---|
| `strict = true` | turns on about a dozen checks: every function annotated (`disallow_untyped_defs`), no bare generics (`list` → `list[str]`), `warn_return_any`, `no_implicit_reexport`, `strict_equality`, unused `# type: ignore` reported … | new code: start strict, it is much harder to tighten later |
| `files`, `mypy_path` | what plain `mypy` checks; where to find first-party imports | the `src` layout: `leafy_ingest` lives in `src/` |
| `explicit_package_bases` | name modules by their path from the base, so `tests/conftest.py` and `tests/integration/conftest.py` do not collide | test folders without `__init__.py` |
| `plugins = ["pydantic.mypy"]` | teaches mypy how `BaseModel` builds `__init__` and validators | without it, model construction is checked less precisely |
| `warn_unreachable`, `enable_error_code` | flag dead branches; require a code on every `# type: ignore[...]`; catch always-true conditions | cheap, and each one has caught real bugs |
| `[[tool.mypy.overrides]]` | per-module exceptions, e.g. `ignore_missing_imports` for one untyped library, or a looser rule for legacy code | not needed here: pandas-stubs, Pydantic and Pandera ship types |

**Adopting mypy on an existing codebase**: start non-strict on everything, add `strict = true` per package through overrides as each is cleaned, and never add a blanket `ignore_errors`. Pyright (Microsoft’s checker, behind VS Code’s Pylance) reads the same hints; many teams run Pylance in the editor and mypy in CI.

> **On the job:** “Lint and type checks run in CI” is the line in your definition of done this lesson makes possible. In data code the payoff is `None`: mypy forces you to decide what happens when a lookup, an environment variable or a regex match returns nothing, before a 3 a.m. `AttributeError` decides for you.

> **The main idea:** configure mypy once in pyproject.toml (files, paths, strict, plugins) so plain mypy checks the same thing everywhere.

*Read more:* [mypy: the configuration file](https://mypy.readthedocs.io/en/stable/config_file.html), [mypy: using mypy with an existing codebase](https://mypy.readthedocs.io/en/stable/existing_code.html), [Pydantic: mypy plugin](https://docs.pydantic.dev/latest/integrations/mypy/).

---

<a id="slide-19"></a>
## 19. The mypy errors you will meet, and how to fix them

*Part C · reading mypy output: code, cause, fix*

Every mypy error ends with an **error code** in brackets, such as `[union-attr]`. The code tells you the category, links to the documentation, and is what you write in a targeted `# type: ignore[code]` when an ignore is truly justified. Below is a helper module a teammate might write; each function has a bug class that is common in data code.

#### `demos/typing/load_utils.py`

```python
# typing/load_utils.py
"""Helpers a teammate wrote for the Leafy loader."""
import json
import os
from dataclasses import dataclass
from decimal import Decimal

import yaml


@dataclass(frozen=True)
class Event:
    event_id: str
    amount: Decimal


def find_event(events: list[Event], event_id: str) -> Event | None:
    return next((e for e in events if e.event_id == event_id), None)


def refund_amount(events: list[Event], event_id: str) -> Decimal:
    return find_event(events, event_id).amount


def reject_limit() -> float:
    return float(os.environ.get("LEAFY_MAX_REJECT_RATE"))


def load_mapping(path: str) -> dict[str, int]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def total(amounts: list[float]) -> float:
    return sum(amounts)


cents = [2500, 0, 3150]
print(total(cents))


def load_settings(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)
```

#### What mypy reports

Terminal:

```text
$ mypy --strict load_utils.py
load_utils.py:7: error: Library stubs not installed for "yaml"  [import-untyped]
load_utils.py:7: note: Hint: "python3 -m pip install types-PyYAML"
load_utils.py:7: note: (or run "mypy --install-types" to install all missing stub packages)
load_utils.py:7: note: See https://mypy.readthedocs.io/en/stable/running_mypy.html#missing-imports
load_utils.py:21: error: Item "None" of "Event | None" has no attribute "amount"  [union-attr]
load_utils.py:25: error: Argument 1 to "float" has incompatible type "str | None"; expected "str | Buffer | SupportsFloat | SupportsIndex"  [arg-type]
load_utils.py:30: error: Returning Any from function declared to return "dict[str, int]"  [no-any-return]
load_utils.py:38: error: Argument 1 to "total" has incompatible type "list[int]"; expected "list[float]"  [arg-type]
load_utils.py:38: note: "list" is invariant -- see https://mypy.readthedocs.io/en/stable/common_issues.html#variance
load_utils.py:38: note: Consider using "Sequence" instead, which is covariant
load_utils.py:41: error: Function is missing a type annotation  [no-untyped-def]
[exit code 1]
```

(Run with `--no-error-summary` to keep the listing short; without it mypy ends with “Found N errors in 1 file”.)

| Code | Cause | Fix |
|---|---|---|
| `union-attr` | `find_event` may return `None`, and `.amount` is used without checking | check and **narrow**: `if event is None: raise …`; mypy then knows the type is `Event` |
| `arg-type` (`str \| None`) | `os.environ.get` returns `None` when the variable is missing | give a default, or fail with a clear message |
| `no-any-return` | `json.load` returns `Any`; returning it unchecked lies about the type | validate the shape (or use a Pydantic `TypeAdapter`) before returning |
| `arg-type` (`list[int]` vs `list[float]`) | `list` is **invariant**: a function taking `list[float]` could append a float to your `list[int]` | accept a read-only `Sequence[float]` (covariant) |
| `no-untyped-def` | strict mode requires annotations on every function | annotate parameters and the return type |
| `import-untyped` | PyYAML ships no type information | install the stub package `types-PyYAML`, or a targeted ignore / override for that module |

<details><summary>The fixed file, and mypy on it</summary>

```python
# typing/load_utils_fixed.py
"""The same helpers, after fixing every mypy finding."""
import json
import os
from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import yaml  # type: ignore[import-untyped]  # or: pip install types-PyYAML


@dataclass(frozen=True)
class Event:
    event_id: str
    amount: Decimal


def find_event(events: list[Event], event_id: str) -> Event | None:
    return next((e for e in events if e.event_id == event_id), None)


def refund_amount(events: list[Event], event_id: str) -> Decimal:
    event = find_event(events, event_id)
    if event is None:                       # narrowing: after this, event is Event
        raise KeyError(f"unknown event {event_id}")
    return event.amount


def reject_limit() -> float:
    return float(os.environ.get("LEAFY_MAX_REJECT_RATE", "0.25"))


def load_mapping(path: str) -> dict[str, int]:
    with open(path, encoding="utf-8") as f:
        data: Any = json.load(f)
    if not isinstance(data, dict) or not all(isinstance(v, int) for v in data.values()):
        raise ValueError(f"{path}: expected an object of integers")
    return {str(k): v for k, v in data.items()}


def total(amounts: Sequence[float]) -> float:      # Sequence is read-only, so covariant
    return sum(amounts)


cents = [2500, 0, 3150]
print(total(cents))


def load_settings(path: str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        loaded: dict[str, Any] = yaml.safe_load(f)
    return loaded
```

Terminal:

```text
$ mypy --strict load_utils_fixed.py
Success: no issues found in 1 source file
```

</details>

> **On the job:** In review, a bare `# type: ignore` is a red flag: it silences every error on the line, including the next real one. Teams require the code (`ignore-without-code`) and a comment saying why, and treat a growing count of ignores as technical debt.

> **The main idea:** read the error code, find the None, Any or invariance behind it, and fix the type with narrowing, validation or a wider read-only type; ignore only with a code and a reason.

*Read more:* [mypy: error codes](https://mypy.readthedocs.io/en/stable/error_code_list.html), [mypy: optional error codes](https://mypy.readthedocs.io/en/stable/error_code_list2.html), [mypy: missing imports](https://mypy.readthedocs.io/en/stable/running_mypy.html#missing-imports), [mypy: common issues and solutions](https://mypy.readthedocs.io/en/stable/common_issues.html).

---

<a id="slide-20"></a>
## 20. pre-commit: run Ruff and mypy before every commit

*Part C · how do checks run without anyone remembering to run them?*

A **Git hook** is a script Git runs at a point in its workflow; the `pre-commit` hook runs before a commit is created and can stop it. **pre-commit** (the tool) manages those hooks from one YAML file: each **hook** is a command run on the staged files. **Remote hooks** come from a repository pinned at a `rev` and run in an environment pre-commit builds for them; **local hooks** (`repo: local`, `language: system`) run a command from your own environment.

#### The lab’s `.pre-commit-config.yaml`

```yaml
# .pre-commit-config.yaml
# .pre-commit-config.yaml: run `pre-commit install` once per clone
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0                   # pinned; update with `pre-commit autoupdate`
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-added-large-files   # stops a 200 MB sample file being committed
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.16.10                 # same Ruff version as requirements-dev.txt
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
  - repo: local                   # mypy needs the project's own dependencies to resolve imports
    hooks:
      - id: mypy
        name: mypy
        entry: mypy
        language: system
        types_or: [python, pyi]
        pass_filenames: false     # check what [tool.mypy] files says, not just staged files
```

Terminal:

```text
$ pre-commit validate-config
(no output: the file is valid)
```

#### All-local variant (what ran on the build machine)

```yaml
# .pre-commit-config.yaml (local variant)
# The same hooks, all local: tools come from the activated project environment
repos:
  - repo: local
    hooks:
      - id: ruff-check
        name: ruff check
        entry: ruff check --fix --force-exclude
        language: system
        types_or: [python, pyi]
      - id: ruff-format
        name: ruff format
        entry: ruff format --force-exclude
        language: system
        types_or: [python, pyi]
      - id: mypy
        name: mypy
        entry: mypy
        language: system
        types_or: [python, pyi]
        pass_filenames: false
```

|  | Remote, pinned | Local, system |
|---|---|---|
| Tool version from | `rev:` in the YAML | your environment (`requirements-dev.txt`) |
| First run | downloads and builds hook envs (needs network) | instant, offline |
| Risk | two places to bump a version | fails if the venv is not activated |
| Typical use | linters and formatters (Ruff) | mypy and anything needing project imports |

#### Commands

| Command | What it does |
|---|---|
| `pre-commit install` | writes `.git/hooks/pre-commit`; once per clone |
| `pre-commit run --all-files` | run every hook on the whole repository (first adoption, or CI) |
| `pre-commit run ruff-check --files src/x.py` | one hook, chosen files |
| `pre-commit autoupdate` | bump every `rev:` to its latest tag (review the diff) |
| `git commit --no-verify` | skips hooks: why CI must run the same checks |

#### Not executed here

The remote hooks above were **validated, not installed**: building their environments failed on the build machine because the folder path plus the hook’s files exceeded the Windows 260-character path limit. On a normal checkout path (or with long paths enabled) `pre-commit install` works as shown. The next lesson runs the all-local variant, which uses the same Ruff and mypy versions.

> **On the job:** pre-commit is the developer-side half of the quality gate: it gives feedback in seconds, before a push. It is a convenience, not a guarantee, because anyone can skip it with `--no-verify`; the guarantee is CI running the same tools (lesson 22).

> **The main idea:** declare hooks once in .pre-commit-config.yaml, pin remote hooks, use local hooks for tools that need your project environment, and repeat the checks in CI.

*Read more:* [pre-commit](https://pre-commit.com/), [ruff-pre-commit](https://github.com/astral-sh/ruff-pre-commit), [pre-commit-hooks](https://github.com/pre-commit/pre-commit-hooks).

---

<a id="slide-21"></a>
## 21. pre-commit in action: a commit blocked, fixed, accepted

*Part C · what happens when you commit code with problems?*

A teammate adds a small `report.py` to the ingester. It has three problems of three different kinds: imports out of order (lint), odd spacing (format), and a wrong return type (types). This is a real Git repository on the build machine with the all-local hooks installed.

#### 1 · Install the hooks and try to commit

Terminal:

```text
$ pre-commit install
pre-commit installed at .git/hooks/pre-commit
```

```python
# src/leafy_ingest/report.py
from decimal import Decimal
import json
from leafy_ingest.core import BatchResult


def summary(result: BatchResult) -> int:
    total = sum(  (e.amount for e in result.valid), Decimal("0"))
    return json.dumps({"valid": len(result.valid), "total": str(total)})
```

Terminal:

```text
$ git add -A; git commit -m "Add batch summary"
ruff check...............................................................Failed
- hook id: ruff-check
- files were modified by this hook

Found 1 error (1 fixed, 0 remaining).

ruff format..............................................................Failed
- hook id: ruff-format
- files were modified by this hook

1 file reformatted

mypy.....................................................................Failed
- hook id: mypy
- exit code: 1

src\leafy_ingest\report.py:9: error: Incompatible return value type (got "str", expected "int")  [return-value]
Found 1 error in 1 file (checked 8 source files)
[exit code 1]
```

#### 2 · Read what happened

- **ruff check** found the import-order problem, fixed it (`--fix`) and failed, because it changed a file: you must look at and stage the fix.
- **ruff format** rewrote the spacing and failed for the same reason.
- **mypy** found a real bug: `json.dumps` returns `str`, but the function promises `int`. No tool can fix that for you.
- No commit was created. The working tree now holds the auto-fixed file; the return type is still wrong.

```python
# src/leafy_ingest/report.py, after the fixes
import json
from decimal import Decimal

from leafy_ingest.core import BatchResult


def summary(result: BatchResult) -> str:
    total = sum((e.amount for e in result.valid), Decimal("0"))
    return json.dumps({"valid": len(result.valid), "total": str(total)})
```

Terminal:

```text
$ git add -A; git commit -m "Add batch summary"
ruff check...............................................................Passed
ruff format..............................................................Passed
mypy.....................................................................Passed

[main f22066e] Add batch summary
 1 file changed, 9 insertions(+)
 create mode 100644 src/leafy_ingest/report.py
```

The commit hash is stable because the author and dates were fixed for the build; yours will differ. Hooks only see **staged** files (mypy is the exception here: `pass_filenames: false` makes it check the configured folders, because types cross files).

> **On the job:** On a team, the most common pre-commit failure is not a bug but a formatter fix: the hook changes the file, you re-stage and commit again. It feels slow for a day and then saves every reviewer from commenting on whitespace and import order again.

> **The main idea:** hooks block the commit, auto-fixers change files you must re-stage, and type errors still need a human; together they keep trivial problems out of review.

*Read more:* [pre-commit](https://pre-commit.com/), [Pro Git: Git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks).

---

<a id="slide-22"></a>
## 22. GitHub Actions: lint, types and tests on every pull request

*Part C · how does the same gate run on a server for every change?*

**Continuous integration** (CI) runs your checks on a fresh machine for every push and pull request. In **GitHub Actions**, a **workflow** is a YAML file in `.github/workflows/`; it is triggered by **events** (`on:`), contains **jobs** that run on a **runner** (a fresh virtual machine), and each job is a list of **steps**: either an **action** (`uses:`, reusable code such as checkout) or a shell command (`run:`). A **matrix** runs the same job once per value, here per Python version. Coming from C#: the same role as an Azure Pipelines YAML running `dotnet build` and `dotnet test`.

#### `.github/workflows/ci.yml` (in the lab)

```yaml
# .github/workflows/ci.yml
name: ci

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read            # least privilege: this workflow only reads the code

concurrency:                # a new push cancels the still-running check of the old one
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: lint, types, tests (py${{ matrix.python-version }})
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.12", "3.13"]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip
          cache-dependency-path: requirements-dev.txt
      - name: Install pinned tools
        run: python -m pip install -r requirements-dev.txt
      - name: Lint (Ruff)
        run: ruff check --output-format=github .
      - name: Format check (Ruff)
        run: ruff format --check .
      - name: Types (mypy)
        run: mypy
      - name: Tests and coverage (fails under 80 %)
        run: pytest --cov-report=xml
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: coverage-py${{ matrix.python-version }}
          path: coverage.xml
```

#### Lint the workflow locally (not executed on GitHub)

Terminal (workflow not executed on GitHub):

```text
$ actionlint .github/workflows/ci.yml
(no output: no problems found)
```

**actionlint** checks workflow syntax, expressions, matrix keys, runner labels and known action inputs before you push. The same file with three typical mistakes:

```yaml
# ci.yml (broken)
name: ci
on:
  pull_requests:
jobs:
  quality:
    runs-on: ubuntu-lates
    strategy:
      matrix:
        python-version: ["3.12"]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: ${{ matrix.python }}
      - run: pytest
```

Terminal:

```text
$ actionlint ci.yml
ci.yml:3:3: unknown Webhook event "pull_requests". see https://docs.github.com/en/actions/reference/workflow
    s-and-actions/events-that-trigger-workflows#webhook-events for list of all Webhook event names [events]
ci.yml:6:14: label "ubuntu-lates" is unknown. available labels are "ubuntu-latest", "windows-latest", …
    (list shortened) [runner-label]
ci.yml:14:31: property "python" is not defined in object type {python-version: number} [expression]
[exit code 1]
```

| Line | Why it is there |
|---|---|
| `on: push (main), pull_request` | check every pull request, and main after merge |
| `permissions: contents: read` | the job’s token can only read; a compromised step cannot push or publish |
| `concurrency … cancel-in-progress` | two quick pushes do not waste two full runs |
| `matrix` + `fail-fast: false` | test every supported Python; one failing version does not hide the others |
| `cache: pip` keyed on `requirements-dev.txt` | reuse downloaded wheels until the pins change |
| one step per tool | the pull-request page shows *which* gate failed: lint, format, types or tests |
| `--output-format=github` | Ruff findings appear as annotations on the changed lines |
| `if: always()` on the upload | keep the coverage report even when tests fail |

> **On the job:** A workflow only gates merges once it is a **required status check** in the repository’s branch protection (Settings → Branches). Without that, a red check is just a suggestion. Pinning actions to a major version (`@v7`) is common; security-sensitive teams pin to a full commit SHA.

> **The main idea:** one workflow, triggered on pull requests, with one step per gate and pinned tools; lint it with actionlint and make it a required check.

*Read more:* [GitHub Actions: workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [GitHub Actions: building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python), [GitHub Actions: matrix jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations), [GitHub Actions: concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [actions/setup-python](https://github.com/actions/setup-python), [actionlint](https://github.com/rhysd/actionlint), [GitHub: protected branches and required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

---

<a id="slide-23"></a>
## 23. Run the CI steps locally before you push

*Part C · how do I know CI will pass, and what happens when it does not?*

CI should run commands you can also run on your laptop; then a red check is reproducible in one command. The lab’s workflow has four gates: Ruff lint, Ruff format, mypy, and pytest with a coverage threshold. Below, a 25-line script reads `ci.yml` and runs its `run:` steps in order on the *finished* lab (the reference suite copied into `tests/`, which is what the lab asks you to build). The install step is skipped because the tools are already in the environment; the two `uses:` actions only exist on GitHub.

#### `demos/run_ci_locally.py`

```python
# run_ci_locally.py
"""Run the `run:` steps of one GitHub Actions job locally, in order; stop at the first failure."""

import subprocess
import sys
from pathlib import Path

import yaml

workflow = yaml.safe_load(Path(sys.argv[1]).read_text(encoding="utf-8"))
skip = set(sys.argv[2:])                     # step names to skip locally
for step in workflow["jobs"]["quality"]["steps"]:
    name = step.get("name", step.get("uses"))
    if "run" not in step:
        print(f"-- {name}: an action, runs on GitHub only")
        continue
    if name in skip:
        print(f"-- {name}: skipped locally")
        continue
    proc = subprocess.run(step["run"], shell=True, capture_output=True, text=True)
    tail = (proc.stdout + proc.stderr).strip().splitlines()[-3:]
    print(f"== {name}: $ {step['run']} -> exit {proc.returncode}")
    for line in tail:
        print("   " + line)
    if proc.returncode:
        sys.exit(proc.returncode)
print("all run steps passed")
```

#### The four gates on the finished lab

Terminal (run: steps executed locally; durations measured on the build machine):

```text
$ python ../demos/run_ci_locally.py .github/workflows/ci.yml "Install pinned tools"
-- actions/checkout@v7: an action, runs on GitHub only
-- actions/setup-python@v7: an action, runs on GitHub only
-- Install pinned tools: skipped locally
== Lint (Ruff): $ ruff check --output-format=github . -> exit 0
== Format check (Ruff): $ ruff format --check . -> exit 0
   14 files already formatted
== Types (mypy): $ mypy -> exit 0
   Success: no issues found in 13 source files
== Tests and coverage (fails under 80 %): $ pytest --cov-report=xml -> exit 0
   Coverage XML written to file coverage.xml
   Required test coverage of 80.0% reached. Total coverage: 100.00%
   ===================================== 37 passed in 4.57s ======================================
-- Upload coverage report: an action, runs on GitHub only
all run steps passed
```

YAML trivia that bites people writing such scripts: PyYAML reads the key `on` as the boolean `True` (YAML 1.1), so `workflow["on"]` raises `KeyError`; GitHub itself reads it as the string.

| When CI is red | Reproduce locally with | Typical cause |
|---|---|---|
| Lint (Ruff) | `ruff check .` | hooks not installed, or committed with `--no-verify` |
| Format check | `ruff format --check .` (fix: `ruff format .`) | an editor with a different formatter |
| Types (mypy) | `mypy` | a dependency upgrade changed a signature; a new `None` path |
| Tests and coverage | `pytest` | a real failure, or new code without tests pushed coverage under 80 % |
| Only fails in CI | compare Python version, OS, time zone, file paths | a test that depends on the local machine (bug clinic) |

> **On the job:** Being able to say “I can reproduce any CI failure locally with one command” is an underrated senior signal. It comes from keeping all configuration in `pyproject.toml` and `requirements-dev.txt`, not in long inline scripts inside the YAML.

> **The main idea:** keep CI steps as plain commands that read the project config, run them locally before pushing, and every red check is reproducible.

*Read more:* [GitHub Actions: building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python), [GitHub Actions: workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [PyYAML documentation](https://pyyaml.org/wiki/PyYAMLDocumentation).

---

<a id="slide-24"></a>
## 24. Coverage with pytest-cov: lines, branches, and the 80 % gate

*Part D · which lines and branches did the tests actually run?*

**Code coverage** measures which parts of your code ran while the tests ran. **Line coverage** counts executed statements; **branch coverage** also checks that each decision went both ways (the `if` was true *and* false at least once). **coverage.py** does the measuring; **pytest-cov** is the plugin that switches it on with `--cov` and prints the report. A **coverage threshold** (`fail_under`) makes the run fail when the total drops below a number, so coverage cannot erode silently. Coming from C#: Coverlet with `/p:Threshold=80`.

#### Configuration (`pyproject.toml`)

```toml
# pyproject.toml
[tool.coverage.run]
source = ["leafy_ingest"]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_also = ["if TYPE_CHECKING:", "raise NotImplementedError"]
```

- `source`: measure the package, including files no test imported (they show up at 0 % instead of being invisible).
- `branch = true`: report partial branches (`BrPart`) and count them in the total.
- `fail_under = 80`: the gate; the addopts line `--cov` turns measurement on for every `pytest` run.
- `exclude_also`: lines that should not count, such as `if TYPE_CHECKING:`.

#### Unit tests alone, on the finished lab

Terminal (durations measured on the build machine):

```text
$ pytest -m "not integration" -q
...............................                                                          [100%]
======================================= tests coverage ========================================
______________________ coverage: platform win32, python 3.12.10-final-0 _______________________
Name                        Stmts   Miss Branch BrPart  Cover   Missing
-----------------------------------------------------------------------
src\leafy_ingest\cli.py        33     20      2      0    37%   19, 23, 27-55
src\leafy_ingest\files.py      19      9      4      0    43%   17-19, 25-30
-----------------------------------------------------------------------
TOTAL                         173     29     22      0    82%
4 files skipped due to complete coverage.
Required test coverage of 80.0% reached. Total coverage: 82.05%
31 passed, 6 deselected in 4.66s
```

`Missing` lists line numbers that never ran; with branch coverage an entry such as `12->15` marks a decision that only went one way (none here). The total passes the gate at 82 %, yet the CLI is only 37 % covered: **a total can hide a weak file**. Look at the per-file rows for the code that matters, not only at the last line.

#### The whole suite

Terminal (durations measured on the build machine):

```text
$ pytest -q
.....................................                                                    [100%]
======================================= tests coverage ========================================
______________________ coverage: platform win32, python 3.12.10-final-0 _______________________
Name    Stmts   Miss Branch BrPart  Cover   Missing
---------------------------------------------------
TOTAL     173      0     22      0   100%
6 files skipped due to complete coverage.
Required test coverage of 80.0% reached. Total coverage: 100.00%
37 passed in 4.69s
```

#### Other reports

| Option | Gives |
|---|---|
| `--cov-report=term-missing` | the table above, with missing lines |
| `--cov-report=html` | `htmlcov/index.html`: each file with uncovered lines highlighted |
| `--cov-report=xml` | `coverage.xml` for CI tools and pull-request comments |
| `--no-cov` | switch it off for a quick local run or a debugger session |
| `# pragma: no cover` | exclude one line or block (the `__main__` guard in `cli.py`); use rarely and visibly |

> **On the job:** “Ingester core has ≥ 80 % test coverage” is in your definition of done because it is a cheap, honest signal that the important paths run in tests. Teams usually gate on the total, then look at the HTML report for the files that matter most: the parser, the validator, the loader.

> **The main idea:** measure the package with branch coverage, gate the total with fail_under, and read the Missing column to find what no test runs.

*Read more:* [pytest-cov](https://pytest-cov.readthedocs.io/en/latest/), [coverage.py](https://coverage.readthedocs.io/en/latest/), [coverage.py: branch coverage](https://coverage.readthedocs.io/en/latest/branch.html), [coverage.py: excluding code](https://coverage.readthedocs.io/en/latest/excluding.html).

---

<a id="slide-25"></a>
## 25. What coverage does not prove

*Part D · 100 % covered, still wrong (added)*

Coverage tells you which code *ran*, not whether anything *checked* the result, and not which inputs were tried. A suite can execute every line and still miss the bug that matters. Here is a two-line function with **100 % line and branch coverage** and a money bug.

#### The function and its tests

```python
# coverage_lies/cents.py
def to_cents(amount: str) -> int:
    """'19.99' -> 1999. Used to load order amounts into an integer column."""
    return int(float(amount) * 100)
```

```python
# coverage_lies/test_cents.py
from cents import to_cents


def test_whole_amount() -> None:
    assert to_cents("25.00") == 2500


def test_runs_without_error() -> None:      # executes code, asserts nothing
    to_cents("19.99")
```

Terminal (durations measured on the build machine):

```text
$ pytest test_cents.py --cov=cents --cov-branch -q
..                                                                                       [100%]
======================================= tests coverage ========================================
______________________ coverage: platform win32, python 3.12.10-final-0 _______________________
Name       Stmts   Miss Branch BrPart  Cover
--------------------------------------------
cents.py       2      0      0      0   100%
--------------------------------------------
TOTAL          2      0      0      0   100%
2 passed in 1.13s
```

#### The bug coverage did not see

```python
import sys
sys.path.insert(0, "demos/coverage_lies")
from cents import to_cents

for text in ["25.00", "19.99", "0.29", "1.15"]:
    print(f"{text:>6} -> {to_cents(text)}")
```

Output:

```text
 25.00 -> 2500
 19.99 -> 1998
  0.29 -> 28
  1.15 -> 114
```

`19.99` is stored as the binary float 19.989999…, times 100 is 1998.99…, and `int()` truncates. The test that “covered” `19.99` asserted nothing. A **property-based test** states a rule for *all* inputs and lets a library (**Hypothesis**, `pip install hypothesis`) search for a counterexample and shrink it to the simplest one:

```python
# coverage_lies/test_cents_property.py
from decimal import Decimal

from hypothesis import given, settings
from hypothesis import strategies as st

from cents import to_cents


@settings(derandomize=True, database=None)          # deterministic for this deck
@given(st.decimals(min_value=0, max_value=10_000, places=2))
def test_to_cents_matches_decimal(amount: Decimal) -> None:
    assert to_cents(str(amount)) == int(amount * 100)
```

Terminal:

```text
$ pytest test_cents_property.py -q --tb=short
F                                                                                        [100%]
========================================== FAILURES ===========================================
________________________________ test_to_cents_matches_decimal ________________________________
test_cents_property.py:10: in test_to_cents_matches_decimal
    @given(st.decimals(min_value=0, max_value=10_000, places=2))
                   ^^^
test_cents_property.py:12: in test_to_cents_matches_decimal
    assert to_cents(str(amount)) == int(amount * 100)
E   AssertionError: assert 250 == 251
E    +  where 250 = to_cents('2.51')
E    +    where '2.51' = str(Decimal('2.51'))
E    +  and   251 = int((Decimal('2.51') * 100))
E   Failing test case: test_to_cents_matches_decimal(
E       amount=Decimal('2.51'),
E   )
=================================== short test summary info ===================================
FAILED test_cents_property.py::test_to_cents_matches_decimal - AssertionError: assert 250 == 251
1 failed in 1.57s
[exit code 1]
```

| Coverage does not prove | What does |
|---|---|
| that results were checked | assertions on values; review tests that only “run” code |
| that the right inputs were tried | parametrized edge cases (lesson 10), property-based tests (**Hypothesis**) |
| that the tests would notice a change | **mutation testing**: a tool (mutmut) flips `<` to `<=`, `+` to `-`, and checks that some test fails. Not executed here: mutmut needs a fork-capable OS (Linux, macOS, or WSL on Windows) |
| that the data is right | runtime validation and contracts (Part B), data tests in the warehouse |
| that code paths that are not there are handled | nothing measures missing code; the trap table from lesson 3 does |

> **On the job:** “We have 95 % coverage” is a weak argument in an incident review; “every reject reason has a fixture line and an assertion” is a strong one. Use the number as a floor that stops erosion, and the Missing column as a to-do list, not as a goal to game.

> **The main idea:** coverage measures execution, not verification: pair a coverage floor with real assertions, named edge cases, and property tests for numeric code.

*Read more:* [coverage.py](https://coverage.readthedocs.io/en/latest/), [Hypothesis (property-based testing)](https://hypothesis.readthedocs.io/en/latest/), [mutmut (mutation testing)](https://mutmut.readthedocs.io/en/latest/).

---

<a id="slide-26"></a>
## 26. Lab: a test suite and CI for the Leafy ingester

*Lab · build it yourself, then compare*

The lab folder [ 0 ](python-quality-tooling-lab/README.md) next to this deck contains the ingester from the lessons with **one** smoke test. Your job is the rest: fixtures, unit and integration tests, the coverage gate, types, hooks and CI. Allow about two hours. The finished suite from Part A is in `reference/tests/`; open it only to compare.

#### Starting point: red on purpose

Terminal (durations measured on the build machine):

```text
$ pytest -q
.
ERROR: Coverage failure: total of 18 is less than fail-under=80
                                                                                         [100%]
======================================= tests coverage ========================================
______________________ coverage: platform win32, python 3.12.10-final-0 _______________________
Name                         Stmts   Miss Branch BrPart  Cover   Missing
------------------------------------------------------------------------
src\leafy_ingest\cli.py         33     33      2      0     0%   3-55
src\leafy_ingest\core.py        50     50     10      0     0%   3-75
src\leafy_ingest\files.py       19     19      4      0     0%   3-30
src\leafy_ingest\frames.py      29     29      0      0     0%   3-63
src\leafy_ingest\models.py      41      7      6      1    74%   47-52, 57
------------------------------------------------------------------------
TOTAL                          173    138     22      1    18%
1 file skipped due to complete coverage.
FAIL Required test coverage of 80.0% not reached. Total coverage: 18.46%
1 passed in 1.34s
[exit code 1]
```

#### Steps

1. **Fixtures**: `tests/conftest.py` with a session-scoped `day_lines` (a tuple) and a `make_event` factory (lessons 6–8).
2. **Model tests**: parametrized accepted and rejected records with `pytest.param(id=…)`, asserting the Pydantic error *type*; business dates around midnight and DST (lessons 10, 12–13).
3. **Core tests**: sample-day counts (12 valid, 2 rejected, 1 duplicate), the reason for each line of `bad_lines.jsonl`, the reject-rate limit (lessons 9, 14).
4. **Frame tests**: the Pandera contract passes on the sample day and fails on a duplicated placed event, with lazy failure cases (lessons 15–16).
5. **Integration tests** in `tests/integration/`, marked, with their own `conftest.py`: the CLI end to end in `tmp_path`, a fixed clock, `monkeypatch` for the limit, LF and CRLF files (lessons 5, 10–11).
6. **Gate**: `pytest` exits 0 with ≥ 80 % branch coverage; then `mypy`, `ruff check .`, `ruff format --check .` are clean (lessons 18, 24).
7. **Automation**: `pre-commit install`; copy the folder to a new GitHub repository, push, and make `ci` a required check (lessons 20–22).

| Definition of done (tracker) | Where the deck teaches it | How you prove it in the lab |
|---|---|---|
| I use pytest fixtures and parametrize | lessons 6–11 | conftest files with session, function and factory fixtures; parametrize tables with ids |
| I validate schemas with pydantic or pandera | lessons 12–17 | model tests per reject reason; Pandera contract tests |
| Lint and type checks run in CI | lessons 18–23 | the `ci` workflow green on a pull request, as a required check |
| Ingester core has ≥ 80 % test coverage | lessons 24–25 | `pytest` exits 0 with `fail_under = 80` and branch coverage |

> **On the job:** This is a realistic first-month task on a data team: “the ingester works but has no tests; get it to 80 % and into CI before we add sources.” Doing it on a small package first teaches you the order that works: fixtures, then pure-core tests, then a few integration tests, then the gate.

> **The main idea:** start from a red gate, build fixtures first, test the pure core thoroughly and the shell with a few integration tests, then let pre-commit and CI keep it green.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [pytest-cov](https://pytest-cov.readthedocs.io/en/latest/), [GitHub Actions: building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python).

---

<a id="slide-27"></a>
## 27. Lab: verify your result

*Lab · what “done” looks like, with the reference suite*

When your suite is complete, the lab looks like `finished-lab` below: the reference tests copied into `tests/`. Lesson 23 ran all four CI gates on it; here is the end-to-end run of the ingester itself and the files it writes, which your integration test should pin.

#### Run the ingester on the sample day

Terminal:

```text
$ PYTHONPATH=src python -m leafy_ingest.cli tests/fixtures/orders_2026-03-08.jsonl --out out
12 valid, 2 rejected, 1 duplicates -> out
```

In PowerShell set the path first: `$env:PYTHONPATH = "src"`.

```python
import json
from pathlib import Path

out = Path("finished-lab/out")
manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
manifest["run_at_utc"] = "<real clock: differs on every run>"
print(json.dumps(manifest, indent=1))
for line in (out / "quarantine.jsonl").read_text(encoding="utf-8").splitlines():
    print(json.loads(line)["line_no"], json.loads(line)["reason"])
print((out / "order_events.csv").read_text(encoding="utf-8").splitlines()[0])
```

Output:

```text
{
 "duplicates": 1,
 "lines_read": 15,
 "rejected": 2,
 "run_at_utc": "<real clock: differs on every run>",
 "source": "orders_2026-03-08.jsonl",
 "valid": 12
}
8 missing:customer_id
14 timezone_aware:occurred_at
event_id,order_id,customer_id,event_type,amount_cents,occurred_at_utc,business_date
```

#### Your checklist

| Check | Expected |
|---|---|
| `pytest -m "not integration" -q` | all unit tests pass in a few seconds |
| `pytest` | exit 0; “Required test coverage of 80.0% reached” |
| `mypy` | “Success: no issues found” |
| `ruff check .` and `ruff format --check .` | clean |
| `pre-commit run --all-files` | every hook “Passed” |
| a pull request on GitHub | the `ci` check green for 3.12 and 3.13 |
| the manifest in your integration test | equal to the dictionary on the left, with the fixed clock’s time |

Compare with `reference/tests/` only after you are green. Different tests are fine if they pin the same behaviour; missing reject reasons or no CRLF case are the usual gaps.

> **In your portfolio (Fuel Smart):** the v1 ingester has the same shape. A Pydantic model per ingredient line (quantity, unit, name, recipe id) with reason codes such as `missing:unit`; a Pandera contract for the recipe frame (one row per recipe serving, `kcal ≥ 0`, matched share between 0 and 1); a 50-recipe fixture with golden grams; the same `pyproject.toml` gates and `ci.yml`. A reviewer opening the repository sees a green check and a coverage number on day one.

> **On the job:** Hiring managers reading a portfolio repository look for exactly these signals in the first minute: a `tests/` folder with fixtures, a CI badge or a green check on the last commit, and a `pyproject.toml` that configures the tools. They are cheap to add and rare in candidate projects.

> **The main idea:** done means a green gate you can reproduce locally and on GitHub, and tests that pin the ingester’s real outputs: counts, reasons, manifest.

*Read more:* [pytest-cov](https://pytest-cov.readthedocs.io/en/latest/), [pre-commit](https://pre-commit.com/), [GitHub Actions: building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python).

---

<a id="slide-28"></a>
## 28. Bug clinic: quality-tooling failures and their fixes

*Practice · believable bugs, the symptom, the fix*

#### Bug 1 · a session fixture is mutated

```python
# bugs/test_shared.py
import pytest


@pytest.fixture(scope="session")
def known_skus() -> list[str]:
    return ["PLT-101", "PLT-102"]


def test_new_sku_is_accepted(known_skus: list[str]) -> None:
    known_skus.append("PLT-900")          # mutates the shared list
    assert "PLT-900" in known_skus


def test_catalogue_has_two_skus(known_skus: list[str]) -> None:
    assert len(known_skus) == 2
```

Terminal:

```text
$ pytest bugs/test_shared.py -q
.F                                                                                       [100%]
========================================== FAILURES ===========================================
E   AssertionError: assert 3 == 2
     +  where 3 = len(['PLT-101', 'PLT-102', 'PLT-900'])
<project>\bugs\test_shared.py:15: AssertionError: assert 3 == 2
=================================== short test summary info ===================================
FAILED bugs/test_shared.py::test_catalogue_has_two_skus - AssertionError: assert 3 == 2
1 failed, 1 passed in 0.98s
[exit code 1]
```

**Symptom:** the second test fails only when the first one runs before it; alone, it passes. **Fix:** return an immutable value (`tuple`, `frozenset`) from wide-scoped fixtures, or give mutable data function scope. The lab’s `day_lines` is a tuple for this reason.

#### Bug 2 · a fixture path relative to the working directory

```python
# bugs/paths/test_paths.py
from pathlib import Path


def test_fixture_by_cwd() -> None:
    lines = Path("fixtures/day.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1


def test_fixture_by_file() -> None:
    here = Path(__file__).parent
    lines = (here / "fixtures" / "day.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
```

Terminal:

```text
$ pytest bugs/paths -q
F.                                                                                       [100%]
========================================== FAILURES ===========================================
E   FileNotFoundError: [Errno 2] No such file or directory: 'fixtures\\day.jsonl'
<python>\Lib\pathlib.py:1013: FileNotFoundError: [Errno 2] No such file or directory: 'fixtures\\day.jsonl'
=================================== short test summary info ===================================
FAILED bugs/paths/test_paths.py::test_fixture_by_cwd - FileNotFoundError: [Errno 2] No such f...
1 failed, 1 passed in 0.93s
[exit code 1]
```

**Symptom:** green when you run pytest inside the test folder, red from the repository root, in CI, or in the IDE. **Fix:** build paths from `Path(__file__).parent`, as the second test does.

#### Bug 3 · Pandera stops at the first problem

```python
import pandas as pd
import pandera.pandas as pa

schema = pa.DataFrameSchema({"amount_cents": pa.Column(int, pa.Check.ge(0)),
                             "business_date": pa.Column(str, pa.Check.str_matches(r"^\d{4}-"))})
df = pd.DataFrame({"amount_cents": [-1, 5], "business_date": ["2026-03-08", "08/03/2026"]})
try:
    schema.validate(df)                         # eager: first failure only
except pa.errors.SchemaError as err:
    print("eager:", err.check)
try:
    schema.validate(df, lazy=True)
except pa.errors.SchemaErrors as err:
    print("lazy :", sorted(map(str, err.failure_cases["check"])))
```

Output:

```text
eager: <Check greater_than_or_equal_to: greater_than_or_equal_to(0)>
lazy : ['greater_than_or_equal_to(0)', "str_matches('^\\d{4}-')"]
```

**Symptom:** the quarantine table shows one reason; after fixing it, a second appears. **Fix:** `lazy=True` and handle `SchemaErrors` (plural).

#### More bugs seen in real teams

| Bug | Symptom | Fix |
|---|---|---|
| `date.today()` or `datetime.now()` inside logic | a test fails after 19:00 Chicago time, or only on the first of the month | inject a clock (lesson 11); fixed dates in tests |
| `str_strip_whitespace` with a `Literal` field | `" USD "` rejected although stripping is on | strip in a `mode="before"` validator (lesson 13) |
| bare `# type: ignore` | a later, real type error on the same line is hidden | `# type: ignore[code]` + `ignore-without-code` |
| CI exists but is not a required check | a red pull request is merged anyway | branch protection: required status checks |
| hooks skipped with `--no-verify` | lint errors reach main | CI repeats every hook’s check |
| a test with no assertion | coverage 100 %, bug in production | review tests for asserts; property tests (lesson 25) |
| `@pytest.mark.integraton` (typo) | `-m integration` silently skips the test | `--strict-markers` (lesson 5) |

> **On the job:** Most of these are discovered as “flaky tests”: the suite passes on one machine or in one order and fails elsewhere. When a test is flaky, look first for shared mutable fixtures, the clock, the working directory, and test order.

> **The main idea:** shared mutable fixtures, cwd-relative paths, eager validation, real clocks and silent ignores are the usual culprits; each has a one-line fix.

---

<a id="slide-29"></a>
## 29. Interview questions and model answers: testing

*Practice · say each answer aloud before revealing it*

These are the testing questions that recur most in data-engineering interviews (research, October 2026). Each answer uses the Leafy ingester as the example: a concrete project beats a list of buzzwords.

<details><summary>“How do you test a data pipeline?” · *checks: layers, not tools; pure core; real examples*</summary>

**Model answer (about 60 s):** In layers. Most tests are fast unit tests on pure functions: the record model, the parser, the dedup rule, each with small parametrized cases for edge cases like zero amounts, missing keys, naive timestamps and DST. A few integration tests run the real entry point on fixture files in a temporary folder and assert the outputs: counts, quarantine reasons, the manifest. In production, data-quality checks validate each batch, with Pandera before writing and dbt tests in the warehouse. All of it runs in CI on every pull request with a coverage floor.

**Likely follow-up:** “How do you keep integration tests fast?” → wide-scoped read-only fixtures (a session engine), transactions rolled back per test, tiny fixture files, and a marker so developers run unit tests on every save and integration tests before push.

</details>

<details><summary>“What is a pytest fixture, and how do scopes work?” · *checks: dependency injection, teardown, scope risks*</summary>

**Model answer (about 60 s):** A fixture is a function that provides something a test needs; the test requests it by parameter name and pytest injects it, resolving fixtures that depend on other fixtures. If it yields, the code after the yield is teardown and runs even when the test fails. Scope sets the lifetime: function by default, then class, module, package, session. I use session scope for expensive read-only things like an engine or a parsed reference file, and function scope for anything a test mutates, often with a transaction rolled back after each test.

**Likely follow-up:** “What goes wrong with session scope?” → shared mutable state: one test mutates the object and another fails depending on order. Return immutable values or narrow the scope; a function-scoped fixture cannot be used from a session-scoped one (ScopeMismatch).

</details>

<details><summary>“What is conftest.py and how do you organise fixtures?” · *checks: discovery, layering, overriding*</summary>

**Model answer (about 60 s):** conftest.py is loaded automatically by pytest; fixtures in it are available to tests in that folder and below without imports. I keep widely used fixtures, such as fixture-file paths and a record factory, in the root conftest, and narrow ones next to the tests that need them: integration tests get their own conftest with the CLI runner and a fixed clock. A nearer fixture with the same name overrides a farther one. I never import from conftest; shared helpers go in a module.

**Likely follow-up:** “How do you find where a fixture comes from in a big suite?” → `pytest --fixtures-per-test path::test` or `pytest --fixtures`, which list each fixture with its file and docstring.

</details>

<details><summary>“How do you test code that depends on time, environment variables or an API?” · *checks: injection over patching; determinism*</summary>

**Model answer (about 60 s):** I design for it: the clock and the HTTP client are parameters with real defaults, so tests pass a fixed clock and a fake transport. Environment variables are read at call time in one small function, and tests set them with monkeypatch, which undoes the change. For HTTP I use httpx MockTransport or RESPX. I avoid patching datetime globally; it is fragile and hides the dependency.

**Likely follow-up:** “Where do you patch when you must?” → where the name is looked up, not where it is defined: `monkeypatch.setattr("leafy_ingest.cli.utc_now", fake)`, because `cli` imported the name.

</details>

<details><summary>“Your tests pass locally and fail in CI. How do you debug it?” · *checks: systematic differences, flakiness causes*</summary>

**Model answer (about 60 s):** First reproduce: run the exact CI command locally, with the same Python version. If it still passes, list the differences between the machines: operating system and path separators, time zone and current date, locale and encoding, environment variables, installed versions, and test order or parallelism. The usual culprits are a real clock, a path relative to the working directory, a shared mutable fixture, or an unpinned tool. Then I write a test that fails for that reason, fix it, and keep the test.

**Likely follow-up:** “And if it fails only sometimes?” → run it repeatedly and in random order to reproduce; look for shared state and time; never just add a retry without a cause.

</details>

> **The main idea:** answer with layers, design choices and a concrete example; interviewers listen for pure cores, fixtures with clear scopes, and determinism.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [pytest: fixtures reference (scopes, conftest, order)](https://docs.pytest.org/en/stable/reference/fixtures.html), [pytest: monkeypatch](https://docs.pytest.org/en/stable/how-to/monkeypatch.html).

---

<a id="slide-30"></a>
## 30. Interview questions and model answers: validation, types and CI

*Practice · say each answer aloud before revealing it*

<details><summary>“Pydantic or Pandera: when do you use which?” · *checks: record vs batch, placement in the pipeline*</summary>

**Model answer (about 60 s):** Pydantic validates one record: parsing JSON or dicts at the boundary, converting types, nested objects, and giving each bad record a reason. Pandera validates a DataFrame: dtypes, column checks, uniqueness and rules across rows, like one placed event per order. In the Leafy ingester I use both: Pydantic per line with quarantine, then a Pandera contract on the batch before writing. Once data is already a DataFrame I do not loop rows through Pydantic, and checks that need history belong in the warehouse.

**Likely follow-up:** “Why not just dbt tests?” → they run after the data has landed; Python-side validation stops bad data before it is published and gives record-level reasons at the source.

</details>

<details><summary>“Some records in a batch are bad. Do you fail the run or continue?” · *checks: quarantine, thresholds, row vs batch problems*</summary>

**Model answer (about 60 s):** It depends on what kind of bad. Row-level problems, like a missing customer id, go to quarantine with a reason code and the run continues, so one bad line does not block a day of good data. But I set a reject-rate threshold: if, say, more than a quarter of the lines fail, the format probably changed and I refuse the batch. Batch-level contract violations, like duplicate keys across rows, stop the run because dropping rows would hide the problem. Counts by reason go into the manifest and monitoring.

**Likely follow-up:** “How do you replay quarantined records?” → keep source file, line number and raw text; after a fix, re-run those lines through the same validator; the idempotent load makes the replay safe.

</details>

<details><summary>“What does mypy catch that tests do not, and how would you introduce it into a legacy codebase?” · *checks: static vs runtime, gradual adoption*</summary>

**Model answer (about 60 s):** mypy checks every code path without running it: None that can reach an attribute access, wrong argument types between my own functions, an Any leaking from json.load, invariant containers. Tests only check the paths and inputs they run. Neither validates data at runtime; that is Pydantic’s job. For a legacy codebase I would start non-strict on everything, fix the errors, then enable strict per package through overrides as modules are cleaned, require codes on every type ignore, and run it in CI so the count cannot grow.

**Likely follow-up:** “mypy or Pyright?” → both read the same hints; a common setup is Pylance (Pyright) in the editor for speed and mypy in CI, with the same strictness.

</details>

<details><summary>“What runs in pre-commit and what runs in CI, and why both?” · *checks: speed vs guarantee*</summary>

**Model answer (about 60 s):** pre-commit runs fast checks on the changed files before each commit: Ruff lint and format, sometimes mypy. It gives feedback in seconds, but anyone can skip it. CI runs everything on a clean machine for every pull request: lint, format check, mypy, the full test suite with a coverage threshold, and it is a required check, so it is the actual gate. The commands are the same in both, configured in pyproject.toml, so a CI failure is reproducible locally.

**Likely follow-up:** “How do you keep tool versions in sync?” → pin them in one requirements or lock file; pin remote hook revs to the same versions, or use local hooks that run the project’s tools.

</details>

<details><summary>“Is 80 % coverage good? What does coverage not tell you?” · *checks: coverage as a floor, its blind spots*</summary>

**Model answer (about 60 s):** It is a reasonable floor for application code like an ingester, gated with fail_under so it cannot erode. But coverage only says which lines and branches ran. It does not say the results were checked, that the right inputs were tried, or that the data is valid. I have seen a money-conversion function with 100 % coverage that truncated 19.99 to 1998 cents. So I pair the floor with assertions on values, parametrized edge cases, property-based tests for numeric code, and per-file review of the parts that matter.

**Likely follow-up:** “Line or branch coverage?” → branch: it catches the if that never went false, which line coverage reports as fully covered.

</details>

> **The main idea:** separate record from batch validation, code checks from data checks, and fast local hooks from the CI gate; treat coverage as a floor, not proof.

*Read more:* [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [Pandera documentation](https://pandera.readthedocs.io/en/stable/), [mypy: using mypy with an existing codebase](https://mypy.readthedocs.io/en/stable/existing_code.html), [pre-commit](https://pre-commit.com/), [coverage.py](https://coverage.readthedocs.io/en/latest/).

---

<a id="slide-31"></a>
## 31. Exercises 1–3: parametrize, scopes, factory fixtures

*Exercises · warm-ups: one concept each, about 10 minutes*

Exercises 1, 3 and later ones that import `leafy_ingest` are run inside the finished lab (`tests/exercises/`), so the lab’s `pyproject.toml` puts `src` on the path. Add `--no-cov` when you run a single exercise, or the 80 % gate fails on a partial run.

### Exercise 1 · Business dates around the autumn DST change

Leafy’s business day is the event time in America/Chicago. On Sunday 1 November 2026 clocks fall back from 02:00 CDT (UTC−5) to 01:00 CST (UTC−6). Write one parametrized test with readable ids for `OrderEvent.business_date` and these instants: `2026-11-01T05:30Z`, `2026-11-01T06:30Z`, `2026-11-02T05:30Z`, `2026-11-02T06:00Z`. Expected: 1 Nov, 1 Nov, 1 Nov, 2 Nov. Pattern: edge-case table · Target time: about 10 min.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Predict the setup counts

Predict, before running: with the `conftest.py` below and two test files, how many times is each fixture set up? Pattern: fixture scopes (predict the output) · Target time: about 5 min.

#### `ex2/conftest.py`

```python
# tests/exercises/ex2/conftest.py
import pytest


@pytest.fixture(scope="session")
def engine() -> str:
    return "duckdb"


@pytest.fixture(scope="module")
def catalogue(engine: str) -> tuple[str, ...]:
    return ("PLT-101", "PLT-102")


@pytest.fixture
def basket(catalogue: tuple[str, ...]) -> list[str]:
    return [catalogue[0]]
```

#### `test_a.py` and `test_b.py`

```python
# tests/exercises/ex2/test_a.py
def test_basket_has_one_item(basket: list[str]) -> None:
    assert len(basket) == 1


def test_basket_can_grow(basket: list[str]) -> None:
    basket.append("PLT-102")
    assert len(basket) == 2
```

```python
# tests/exercises/ex2/test_b.py
def test_basket_is_fresh(basket: list[str]) -> None:
    assert basket == ["PLT-101"]


def test_engine_only(engine: str) -> None:
    assert engine == "duckdb"
```

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · A factory fixture for DataFrame rows

Write a `make_row(**overrides)` factory fixture that returns a valid row for the lab’s `OrderEventsFrame`, with a new `event_id` and `order_id` on every call. Use it to test: three default rows pass; two rows with the same `event_id` fail with `field_uniqueness`; two `order_placed` rows for one order fail only the `one_placed_event_per_order` check. Pattern: factory fixture · Target time: about 10 min.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

*Read more:* [pytest: parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html), [pytest: fixtures reference (scopes, conftest, order)](https://docs.pytest.org/en/stable/reference/fixtures.html), [Pandera: DataFrame models](https://pandera.readthedocs.io/en/stable/dataframe_models.html).

---

<a id="slide-32"></a>
## 32. Exercises 4–5: a flaky clock, and a signup contract

*Exercises · interview level: about 15 minutes each*

### Exercise 4 · Find and fix the flaky test

This test was green when it was written and red on every day since. Explain why, then fix the *code* (not just the test) so it has no hidden clock, test the boundary (exactly 2 hours is on time; 2 hours and 1 second is late), and make the limit configurable with the environment variable `LEAFY_LATE_AFTER_HOURS`, read at call time and tested with `monkeypatch`. Pattern: find the bug · determinism · Target time: about 15 min.

```python
# tests/exercises/test_ex4_bug.py
from datetime import UTC, datetime, timedelta

LATE_AFTER = timedelta(hours=2)


def is_late(occurred_at: datetime, received_at: datetime | None = None) -> bool:
    received_at = received_at or datetime.now(UTC)
    return received_at - occurred_at > LATE_AFTER


def test_event_is_on_time() -> None:          # written and green on 8 March 2026
    assert not is_late(datetime(2026, 3, 8, 12, 0, tzinfo=UTC))
```

Terminal (durations measured on the build machine):

```text
$ pytest tests/exercises/test_ex4_bug.py -q --no-cov
F                                                                                        [100%]
========================================== FAILURES ===========================================
E   assert not True
     +  where True = is_late(datetime.datetime(2026, 3, 8, 12, 0, tzinfo=datetime.timezone.utc))
     +    where datetime.datetime(2026, 3, 8, 12, 0, tzinfo=datetime.timezone.utc) = datetime(2026, 3, 8, 12, 0, tzinfo=datetime.timezone.utc)
<project>\tests\exercises\test_ex4_bug.py:12: assert not True
=================================== short test summary info ===================================
FAILED tests/exercises/test_ex4_bug.py::test_event_is_on_time - assert not True
1 failed in 0.99s
[exit code 1]
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · A Pydantic contract for customer signups

Leafy’s signup service sends JSON with `customer_id`, `email`, `country`, `marketing_opt_in` and `signed_up_at`. Write a model that: normalises email (trim, lower-case) and country (trim, upper-case); accepts only `C-` + digits, two-letter countries, a real boolean opt-in (`"yes"` must fail), and an aware timestamp; rejects unknown fields. Then show the `type:location` reason for five bad inputs. Pattern: record validation with reason codes · Target time: about 15 min.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

*Read more:* [pytest: monkeypatch](https://docs.pytest.org/en/stable/how-to/monkeypatch.html), [Pydantic: validators](https://docs.pydantic.dev/latest/concepts/validators/), [Pydantic: strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/).

---

<a id="slide-33"></a>
## 33. Exercises 6–8: mypy errors, a revenue contract, a broken workflow

*Exercises · interview level: about 15 minutes each*

### Exercise 6 · Fix three mypy errors

Run `mypy --strict` on this module, read the three error codes, and fix the *code* so that mypy passes without any `# type: ignore`. Keep the behaviour sensible: a bad order id is an error; an unknown source gets a default limit; no paid event means `None`. Pattern: find and fix · static typing · Target time: about 10 min.

```python
# ex6/ex6.py
import re


def order_number(order_id: str) -> int:
    return int(re.match(r"O-(\d+)", order_id).group(1))


def reject_limit(limits: dict[str, float], source: str) -> float:
    return limits.get(source)


def first_paid(events: list[dict[str, str]]) -> dict[str, str]:
    for e in events:
        if e["event_type"] == "order_paid":
            return e
```

Terminal:

```text
$ mypy --strict ex6.py
ex6.py:5: error: Item "None" of "Match[str] | None" has no attribute "group"  [union-attr]
ex6.py:9: error: Incompatible return value type (got "float | None", expected "float")  [return-value]
ex6.py:12: error: Missing return statement  [return]
Found 3 errors in 1 file (checked 1 source file)
[exit code 1]
```

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · A Pandera contract for daily revenue, with row quarantine

A daily revenue frame has `business_date`, `orders`, `revenue`, `refunds`. Write a `DataFrameModel`: unique ISO dates, non-negative numbers, and refunds not above revenue *per row*. Validate lazily, quarantine every row that has a failure, and keep the rest. Then say in one sentence whether Pydantic would fit this check better. Input: the five rows in the solution (one negative order count, one refund above revenue, one duplicated date). Expected: rows 1, 2, 3 quarantined. Pattern: batch validation + quarantine · choose the tool · Target time: about 15 min.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Find every problem in a workflow

A teammate’s workflow (below). Find the problems actionlint reports *and* the ones it cannot see, then write a fixed version with lint, format, types and tests. Pattern: find and fix · CI design · Target time: about 10 min.

```yaml
# broken.yml
name: ci
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        py: ["3.12", "3.13"]
    steps:
      - uses: actions/setup-python
        with:
          python-version: ${{ matrix.python-version }}
      - run: pytest
      - run: python -m pip install -r requirements-dev.txt
```

Terminal:

```text
$ actionlint broken.yml
broken.yml:10:15: specifying action "actions/setup-python" in invalid format because ref is missing.
    available formats are "{owner}/{repo}@{ref}" or "{owner}/{repo}/{path}@{ref}" [action]
broken.yml:12:31: property "python-version" is not defined in object type {py: number} [expression]
[exit code 1]
```

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

*Read more:* [mypy: error codes](https://mypy.readthedocs.io/en/stable/error_code_list.html), [Pandera: lazy validation](https://pandera.readthedocs.io/en/stable/lazy_validation.html), [actionlint](https://github.com/rhysd/actionlint).

---

<a id="slide-34"></a>
## 34. Exercises 9–10: a test plan for Fuel Smart, and what line coverage missed

*Exercises · stretch: design and debug, about 20–30 minutes each*

### Exercise 9 · Design the tests for an ingredient-quantity parser (Fuel Smart)

Your portfolio ingester must turn Food.com quantity text into numbers before converting to grams: `3`, `1/2`, `1 1/2`, `1½`, `½`, and ranges such as `2-3`. (1) Write a short test plan for the whole ingredient pipeline: what is unit-tested, what is integration-tested, which fixture files exist, which checks run on the batch, what the coverage gate is, and what is deliberately *not* tested. (2) Implement `parse_quantity(text) -> (low, high)` with a parametrized test, including inputs that must be rejected. Pattern: design + take-home · Target time: about 30 min.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Full line coverage, still a bug

The two tests below give this function 100 % *line* coverage. Run coverage with branches, find the decision that only went one way, write the test it points to, and fix the bug that test exposes. Pattern: debug · what coverage proves · Target time: about 15 min.

```python
# rules.py
def amount_reason(event: dict[str, object]) -> str | None:
    # reason code for a bad amount, or None when the amount is fine
    amount = event.get("amount")
    if amount is None:
        return "missing:amount"
    if isinstance(amount, int | float) and amount < 0:
        reason = "negative:amount"
    return reason
```

```python
# test_rules.py
from rules import amount_reason


def test_missing_amount() -> None:
    assert amount_reason({}) == "missing:amount"


def test_negative_amount() -> None:
    assert amount_reason({"amount": -5}) == "negative:amount"
```

Terminal:

```text
$ pytest --cov=rules --cov-report=term-missing -q
..                                                                                       [100%]
======================================= tests coverage ========================================
______________________ coverage: platform win32, python 3.12.10-final-0 _______________________
Name       Stmts   Miss  Cover   Missing
----------------------------------------
rules.py       7      0   100%
----------------------------------------
TOTAL          7      0   100%
2 passed in 0.99s
```

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

*Read more:* [coverage.py: branch coverage](https://coverage.readthedocs.io/en/latest/branch.html), [pytest: parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html), [fractions](https://docs.python.org/3/library/fractions.html).

---

<a id="slide-35"></a>
## 35. Cheat sheet

*Reference · one page to keep open*

#### pytest

| Task | Command or code |
|---|---|
| unit tests only | `pytest -m "not integration"` |
| one test / one case | `pytest path::test_name` · `"path::test[zero]"` |
| select by name | `pytest -k "duplicate or typed"` |
| where fixtures come from | `pytest --fixtures-per-test path::test` |
| setup and teardown order | `pytest --setup-show` |
| shared fixture | `@pytest.fixture` in `conftest.py`; request it by name |
| scope | `@pytest.fixture(scope="session")`; return immutable data |
| teardown | `yield value`, cleanup after it |
| factory | fixture returns `def make(**overrides)` |
| named cases | `pytest.param(x, y, id="zero", marks=pytest.mark.xfail(strict=True))` |
| fixture per variant | `@pytest.fixture(params=[…], ids=[…])` + `request.param` |
| env / attribute | `monkeypatch.setenv(…)`, `monkeypatch.setattr(mod, "name", fake)` |
| printed output | `capsys.readouterr().out` |
| temp folders | `tmp_path` (function), `tmp_path_factory.mktemp()` (session) |

#### Validation, types, automation

| Task | Command or code |
|---|---|
| parse + validate JSON | `Model.model_validate_json(line)` |
| errors as data | `err.errors(include_url=False)` → `type`, `loc`, `msg` |
| constrained field | `Annotated[Decimal, Field(ge=0, decimal_places=2)]` |
| normalise first | `@field_validator("x", mode="before")` |
| cross-field rule | `@model_validator(mode="after")`, raise `ValueError` |
| exact types / no extras | `strict=True` · `ConfigDict(extra="forbid")` |
| DataFrame schema | `class M(pa.DataFrameModel)` + `Config: strict, coerce` |
| all failures | `M.validate(df, lazy=True)` → `SchemaErrors.failure_cases` |
| row vs batch check | `@pa.dataframe_check` returning Series vs bool |
| types | `mypy` (config in `[tool.mypy]`, `strict = true`) |
| targeted ignore | `# type: ignore[import-untyped]` |
| hooks | `pre-commit install` · `pre-commit run --all-files` |
| lint a workflow | `actionlint .github/workflows/ci.yml` |
| coverage gate | `--cov` + `[tool.coverage] branch = true, fail_under = 80` |

| Symptom | First thing to check |
|---|---|
| test passes alone, fails in the suite | a mutated session/module fixture; test order |
| passes locally, fails in CI | clock, time zone, working directory, Python/tool versions |
| `-m integration` skips a test | marker typo; use `--strict-markers` |
| mypy `union-attr` | a value that can be `None`; narrow it |
| quarantine shows one reason at a time | Pandera without `lazy=True` |
| coverage high, bug shipped | tests without asserts; missing edge cases; branch coverage off |

> **The main idea:** fixtures for setup, parametrize for cases, Pydantic for records, Pandera for frames, mypy for code, pre-commit for speed, CI for the guarantee.

---

<a id="slide-36"></a>
## 36. Glossary

*Reference · every new term in one place*

| Term | Meaning |
|---|---|
| action (GitHub) | a reusable step in a workflow, referenced with `uses:` (e.g. `actions/checkout@v7`) |
| actionlint | a linter for GitHub Actions workflow files |
| branch coverage | coverage that also checks each decision went both ways |
| batch-level failure | a validation failure that belongs to the whole DataFrame, not one row (no index) |
| code coverage | the share of code (lines, branches) executed by the tests |
| conftest.py | a file pytest loads automatically; its fixtures are visible to its folder and below |
| continuous integration (CI) | running checks automatically on a clean machine for every push or pull request |
| coverage threshold (`fail_under`) | the minimum total coverage below which the test run fails |
| DataFrameModel | Pandera’s class-based schema for a DataFrame |
| dependency injection | passing a component its dependencies instead of having it create them; pytest injects fixtures by name |
| error code (mypy) | the bracketed category at the end of a mypy error, e.g. `[union-attr]` |
| error type (Pydantic) | the stable category of a validation error, e.g. `missing`, `literal_error` |
| event (GitHub Actions) | what triggers a workflow: `push`, `pull_request` … |
| factory fixture | a fixture that returns a function which builds test objects with overrides |
| field validator | a Pydantic method that checks or transforms one field (`before` or `after` type conversion) |
| fixture | a function that provides something a test needs, requested by parameter name |
| fixture file | a small committed data file with the real shape of production input |
| functional core, imperative shell | design rule: decisions in pure functions, side effects in a thin outer layer |
| Git hook | a script Git runs at a point in its workflow, e.g. before a commit |
| golden result | a committed, known-correct expected output compared on every run |
| gradual typing | type checking that allows unannotated code and checks only what is annotated |
| hook (pre-commit) | one check pre-commit runs on staged files; remote (pinned repo) or local |
| integration test | a test of several parts together through a real boundary (files, CLI, database) |
| invariant (types) | `list[int]` is not a `list[float]`, because lists can be written to |
| job / step / runner | a workflow’s unit of work / one command or action in it / the machine that runs it |
| lax mode / strict mode | Pydantic converting safe-looking inputs (`"1"` → 1) / requiring exact types |
| lazy validation | running every check and reporting all failures at once (`lazy=True`) |
| marker | a label on a test used to select or deselect groups (`-m`) |
| matrix | running one CI job once per value of a variable, e.g. Python versions |
| model (Pydantic) | a `BaseModel` subclass whose type hints become runtime validation |
| model validator | a Pydantic method that checks the whole object, for rules across fields |
| monkeypatch | a pytest fixture that changes env vars or attributes for one test and undoes it |
| mutation testing | changing the code on purpose to check that some test fails |
| mypy | a static type checker for Python |
| narrowing | a check (`if x is None: …`) after which the type checker knows a narrower type |
| Pandera | a library that validates DataFrames against declared schemas |
| parametrize | running one test function once per set of arguments |
| pre-commit | a tool that manages Git pre-commit hooks from one YAML file |
| property-based test | a test that states a rule for all inputs and lets a library (Hypothesis) search for counterexamples |
| Pydantic | a library that validates and converts data using classes with type hints |
| pure function | same input → same output, with no I/O, clock or environment access |
| pytest-cov | the pytest plugin that runs coverage.py and reports coverage |
| quarantine | keeping rejected records with location, reason and raw text so good records continue |
| reason code | a short stable label for why a record was rejected (`type:location`) |
| required status check | a CI check that must pass before a pull request can merge |
| scope (fixture) | how long one fixture instance lives: function, class, module, package, session |
| static type checker | a tool that checks types by reading code, without running it |
| teardown | cleanup code that runs after a test, after `yield` in a fixture |
| unit test | a fast test of one function or class with in-memory values only |
| workflow | a GitHub Actions YAML file in `.github/workflows/` |
| xfail | a test expected to fail; with `strict=True` it fails when it unexpectedly passes |

---

<a id="slide-37"></a>
## 37. What to remember, and what comes next

*Reference · the ideas that matter in interviews and on the job*

1. **Shape for testing:** pure core, I/O and clocks at the edge; then unit tests need only values.
2. **Layout:** unit and integration folders, a marker, pytest configured once in `pyproject.toml`.
3. **Fixtures:** conftest.py by folder, nearest wins; wide scopes for expensive read-only things, function scope for anything mutable; `yield` for teardown.
4. **Test data:** factory fixtures for variations, fixture files with the real shape, golden expectations, named parametrize cases.
5. **Determinism:** monkeypatch for environment, injected clocks for time, no cwd-relative paths.
6. **Records:** a Pydantic model at the boundary; error type + location = reason code; quarantine plus a reject-rate limit.
7. **Batches:** a Pandera DataFrameModel; lazy validation; quarantine rows with an index, stop on batch-level failures.
8. **Types:** mypy strict, configured once; fix None, Any and invariance instead of ignoring them.
9. **Automation:** pre-commit for fast local feedback, CI as the required gate, the same commands in both.
10. **Coverage:** branch coverage with a floor of 80 %, read per file; coverage proves execution, not correctness.

#### Where this connects

- *Python files, generators, and practical data scripts*: uv, `pyproject.toml`, Ruff and pytest basics that this deck builds on.
- *Reliable Python ingestion*: HTTP mocking (lesson 19) and the quarantine idea (lesson 24), now with Pydantic reason codes.
- The dbt decks: data tests in the warehouse, the SQL-side counterpart of Pandera contracts.

#### Next steps

- Finish the lab and push it to GitHub with the `ci` workflow as a required check.
- Apply the same structure to the Fuel Smart v1 ingester from day one.
- Practise answering the interview questions aloud with your own project as the example.

> **The main idea:** testing, validation, typing and automation are four different safety nets; a strong data engineer can say which one catches which failure.

*Read more:* [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [Pandera: DataFrame models](https://pandera.readthedocs.io/en/stable/dataframe_models.html), [mypy: the configuration file](https://mypy.readthedocs.io/en/stable/config_file.html), [pre-commit](https://pre-commit.com/), [pytest-cov](https://pytest-cov.readthedocs.io/en/latest/).

---

<a id="slide-38"></a>
## 38. References and how this deck was tested

*Reference · official sources and what to read there*

| Source | Read for |
|---|---|
| [pytest: how to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html) | fixtures, scopes, yield teardown, factories, parametrized fixtures |
| [pytest: fixtures reference (scopes, conftest, order)](https://docs.pytest.org/en/stable/reference/fixtures.html) | conftest.py visibility, override rules, instantiation order |
| [pytest: parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html), [pytest: markers](https://docs.pytest.org/en/stable/how-to/mark.html) | parametrize, ids, marks; registering markers and `--strict-markers` |
| [pytest: good integration practices (layout, import modes)](https://docs.pytest.org/en/stable/explanation/goodpractices.html) | test layout, `src` layout, import modes |
| [pytest: monkeypatch](https://docs.pytest.org/en/stable/how-to/monkeypatch.html) | monkeypatch for environment, attributes and dictionaries |
| [pytest-cov](https://pytest-cov.readthedocs.io/en/latest/), [coverage.py](https://coverage.readthedocs.io/en/latest/) | pytest-cov options; coverage.py configuration, branch measurement, exclusions |
| [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/), [Pydantic: validators](https://docs.pydantic.dev/latest/concepts/validators/), [Pydantic: strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/) | models, validators, strict mode |
| [Pydantic: validation error types](https://docs.pydantic.dev/latest/errors/validation_errors/) | the list of validation error types used as reason codes |
| [Pandera: DataFrame models](https://pandera.readthedocs.io/en/stable/dataframe_models.html), [Pandera: lazy validation](https://pandera.readthedocs.io/en/stable/lazy_validation.html) | DataFrameModel, checks, lazy validation and failure cases |
| [mypy: the configuration file](https://mypy.readthedocs.io/en/stable/config_file.html), [mypy: error codes](https://mypy.readthedocs.io/en/stable/error_code_list.html) | mypy configuration and every error code |
| [mypy: using mypy with an existing codebase](https://mypy.readthedocs.io/en/stable/existing_code.html) | introducing mypy to an existing codebase |
| [pre-commit](https://pre-commit.com/), [ruff-pre-commit](https://github.com/astral-sh/ruff-pre-commit) | pre-commit configuration, local hooks, Ruff’s hooks |
| [GitHub Actions: workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [GitHub Actions: building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python) | workflow syntax; building and testing Python |
| [GitHub: protected branches and required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | required status checks |
| [actionlint](https://github.com/rhysd/actionlint) | what actionlint checks |
| [Hypothesis (property-based testing)](https://hypothesis.readthedocs.io/en/latest/), [mutmut (mutation testing)](https://mutmut.readthedocs.io/en/latest/) | property-based and mutation testing |

**How this deck was tested:** CPython 3.12.10 on Windows 11; pytest 9.1.1, pytest-cov 7.1.0, coverage.py 7.16.2, Pydantic 2.13.5, Pandera 0.34.1, pandas 3.0.6, mypy 2.4.0, Ruff 0.16.10, pre-commit 4.6.2, actionlint 1.7.12, Hypothesis 6.168.5. Every code block, test run, type check, lint and hook run was executed during the build; durations are measured on the build machine. **Not executed:** the workflow on GitHub (requires a repository and runners; linted with actionlint and its `run:` steps executed locally), the remote pre-commit hook environments (validated; local hooks ran instead), and mutation testing (mutmut needs a fork-capable OS). Interview patterns: research done in October 2026 across public DE interview guides, pytest question banks and community threads; all questions here are original.

> **The main idea:** official docs first; every claim in this deck can be checked there or in the executed output.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Business dates around the autumn DST change

`pytest.param(value, expected, id="…")` per case; build the JSON line with a small helper so each case is one line. Work out the third case carefully: which offset applies on the evening of 1 November?

<a id="hint-2"></a>
### Hint 2 · Predict the setup counts

Session = once per run, module = once per test *file* that needs it, function = once per test that needs it. Count which tests need each fixture, directly or through another fixture.

<a id="hint-3"></a>
### Hint 3 · A factory fixture for DataFrame rows

Copy the shape of `make_event` from lesson 8; `itertools.count(1)` gives the sequence. Read the check names from `SchemaErrors.failure_cases["check"]`.

<a id="hint-4"></a>
### Hint 4 · Find and fix the flaky test

What does `received_at or datetime.now(UTC)` return when the test does not pass `received_at`? What day is it now? Lesson 11 shows the injected-clock pattern.

<a id="hint-5"></a>
### Hint 5 · A Pydantic contract for customer signups

Lesson 13: a `mode="before"` validator can serve two fields (`info.field_name` tells you which); `Field(strict=True)` makes one field strict; `extra="forbid"`.

<a id="hint-6"></a>
### Hint 6 · Fix three mypy errors

Lesson 19’s table: `union-attr` → narrow the `Optional`; `return-value` → `dict.get` can return `None`; `return` → a path falls off the end of the function.

<a id="hint-7"></a>
### Hint 7 · A Pandera contract for daily revenue, with row quarantine

A `@pa.dataframe_check` that returns a boolean *Series* (one value per row) produces row-level failures with an index; one that returns a single `bool` produces a batch-level failure (lesson 16).

<a id="hint-8"></a>
### Hint 8 · Find every problem in a workflow

actionlint finds two things. For the rest, read the steps in order as if you were the runner: what is on the machine before the first `run:`?

<a id="hint-9"></a>
### Hint 9 · Design the tests for an ingredient-quantity parser (Fuel Smart)

Think in the layers of lesson 5 and the tools of lesson 17. For the parser, `fractions.Fraction` keeps `1/3` exact, and `str.partition("-")` splits a range.

<a id="hint-10"></a>
### Hint 10 · Full line coverage, still a bug

Add `--cov-branch`. In the `Missing` column, `6->8` means “from line 6, the jump to line 8 never happened”: which input makes the `if` false?

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Business dates around the autumn DST change

```python
# tests/exercises/test_ex1_dst.py
"""Exercise 1: business dates around the autumn DST change (America/Chicago)."""

import json
from datetime import date

import pytest

from leafy_ingest.models import OrderEvent


def paid_line(occurred_at: str) -> str:
    return json.dumps({
        "event_id": "E-1", "order_id": "O-1001", "customer_id": "C-01", "event_type": "order_paid",
        "amount": "1.00", "currency": "USD", "occurred_at": occurred_at,
    })


@pytest.mark.parametrize(
    ("occurred_at", "expected"),
    [
        pytest.param("2026-11-01T05:30:00Z", date(2026, 11, 1), id="cdt-after-midnight"),
        pytest.param("2026-11-01T06:30:00Z", date(2026, 11, 1), id="cdt-before-fall-back"),
        pytest.param("2026-11-02T05:30:00Z", date(2026, 11, 1), id="cst-late-evening"),
        pytest.param("2026-11-02T06:00:00Z", date(2026, 11, 2), id="cst-midnight"),
    ],
)
def test_business_date_around_fall_back(occurred_at: str, expected: date) -> None:
    assert OrderEvent.model_validate_json(paid_line(occurred_at)).business_date == expected
```

Terminal (durations measured on the build machine):

```text
$ pytest tests/exercises/test_ex1_dst.py -v --no-cov
collecting ... collected 4 items

tests/exercises/test_ex1_dst.py::test_business_date_around_fall_back[cdt-after-midnight] PASSED [ 25%]
tests/exercises/test_ex1_dst.py::test_business_date_around_fall_back[cdt-before-fall-back] PASSED [ 50%]
tests/exercises/test_ex1_dst.py::test_business_date_around_fall_back[cst-late-evening] PASSED [ 75%]
tests/exercises/test_ex1_dst.py::test_business_date_around_fall_back[cst-midnight] PASSED [100%]

====================================== 4 passed in 1.08s ======================================
```

`05:30Z` on 2 November is 23:30 CST on 1 November: with the summer offset you would wrongly get 00:30 on 2 November. `zoneinfo` applies the right offset per instant. **Common wrong answer:** computing the date with a fixed `timedelta(hours=-6)` or `-5`: correct for half the year. **Interviewer follow-up:** “and the spring change?” → add the four mirrored cases around 8 March (the reference suite has them).

<a id="solution-2"></a>
### Solution 2 · Predict the setup counts

```python
import re
import subprocess
from collections import Counter

out = subprocess.run(["pytest", "tests/exercises/ex2", "--setup-show", "-q", "--no-cov"],
                     cwd="finished-lab", capture_output=True, text=True).stdout
setups = Counter(re.findall(r"SETUP\s+[SMF] (\w+)", out))
counts = {name: setups[name] for name in ("engine", "catalogue", "basket")}
print(counts)
assert counts == {"engine": 1, "catalogue": 2, "basket": 3}
assert "4 passed" in out
```

Output (setup lines counted from pytest --setup-show):

```text
{'engine': 1, 'catalogue': 2, 'basket': 3}
```

`engine` once (session); `catalogue` twice, once per file, because each file has a test that needs it through `basket`; `basket` three times, once per test that requests it. `test_basket_is_fresh` passes although `test_basket_can_grow` appended: function scope gives each test its own list. **Common wrong answer:** “catalogue once, because module means the package”. **Interviewer follow-up:** “make `basket` module-scoped: what breaks?” → `test_basket_is_fresh` still passes (new module), but in `test_a.py` the second test would see the first test’s append, an order dependency.

<a id="solution-3"></a>
### Solution 3 · A factory fixture for DataFrame rows

```python
# tests/exercises/ex3/conftest.py
import itertools
from collections.abc import Callable
from typing import Any

import pytest

RowFactory = Callable[..., dict[str, Any]]


@pytest.fixture
def make_row() -> RowFactory:
    """A valid OrderEventsFrame row; every call gets a new event_id and order_id."""
    counter = itertools.count(1)

    def make(**overrides: Any) -> dict[str, Any]:
        n = next(counter)
        row: dict[str, Any] = {
            "event_id": f"R-{n:03d}", "order_id": f"O-{1000 + n}", "customer_id": "C-01",
            "event_type": "order_paid", "amount_cents": 1200,
            "occurred_at_utc": "2026-03-08T12:00:00Z", "business_date": "2026-03-08",
        }
        row.update(overrides)
        return row

    return make
```

```python
# tests/exercises/ex3/test_rows.py
from typing import Any

import pandas as pd
import pandera.errors
import pytest

from leafy_ingest.frames import validate_frame


def checks_failed(rows: list[dict[str, Any]]) -> set[str]:
    with pytest.raises(pandera.errors.SchemaErrors) as info:
        validate_frame(pd.DataFrame(rows))
    return set(info.value.failure_cases["check"])


def test_default_rows_are_valid(make_row: Any) -> None:
    assert len(validate_frame(pd.DataFrame([make_row() for _ in range(3)]))) == 3


def test_duplicate_event_id_fails(make_row: Any) -> None:
    assert "field_uniqueness" in checks_failed([make_row(event_id="E-1"), make_row(event_id="E-1")])


def test_two_placed_events_for_one_order_fail(make_row: Any) -> None:
    rows = [make_row(order_id="O-1001", event_type="order_placed") for _ in range(2)]
    assert checks_failed(rows) == {"one_placed_event_per_order"}
```

Terminal (durations measured on the build machine):

```text
$ pytest tests/exercises/ex3 -q --no-cov
...                                                                                      [100%]
3 passed in 2.71s
```

Unique IDs by default mean each test only states what it is about. The last assertion uses `==`, not `in`, so it also proves that nothing *else* failed: a factory that produced an invalid default row would break it. **Common wrong answer:** hard-coding `event_id="R-1"` in the factory, so every multi-row test fails uniqueness for the wrong reason. **Interviewer follow-up:** “now Polars instead of pandas?” → Pandera supports Polars with `pandera.polars` and the same model style; the factory does not change.

<a id="solution-4"></a>
### Solution 4 · Find and fix the flaky test

```python
# tests/exercises/test_ex4_fixed.py
import os
from datetime import UTC, datetime, timedelta

import pytest


def late_after() -> timedelta:
    return timedelta(hours=float(os.environ.get("LEAFY_LATE_AFTER_HOURS", "2")))


def is_late(occurred_at: datetime, received_at: datetime) -> bool:
    """Late = received more than late_after() after it happened. No hidden clock."""
    return received_at - occurred_at > late_after()


OCCURRED = datetime(2026, 3, 8, 12, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("received_after", "late"),
    [
        pytest.param(timedelta(minutes=5), False, id="on-time"),
        pytest.param(timedelta(hours=2), False, id="exactly-at-limit"),
        pytest.param(timedelta(hours=2, seconds=1), True, id="just-late"),
    ],
)
def test_is_late_boundaries(received_after: timedelta, late: bool) -> None:
    assert is_late(OCCURRED, OCCURRED + received_after) is late


def test_limit_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LEAFY_LATE_AFTER_HOURS", "0.5")
    assert is_late(OCCURRED, OCCURRED + timedelta(hours=1))
```

Terminal (durations measured on the build machine):

```text
$ pytest tests/exercises/test_ex4_fixed.py -v --no-cov
collecting ... collected 4 items

tests/exercises/test_ex4_fixed.py::test_is_late_boundaries[on-time] PASSED               [ 25%]
tests/exercises/test_ex4_fixed.py::test_is_late_boundaries[exactly-at-limit] PASSED      [ 50%]
tests/exercises/test_ex4_fixed.py::test_is_late_boundaries[just-late] PASSED             [ 75%]
tests/exercises/test_ex4_fixed.py::test_limit_from_environment PASSED                    [100%]

====================================== 4 passed in 0.94s ======================================
```

The default argument made the result depend on the day the test runs: on 8 March 2026 at noon the event was minutes old; months later it is “late”. Making `received_at` required moves the clock to the caller (the CLI passes `utc_now()`), and the boundary cases document whether the limit is inclusive. **Common wrong answer:** updating the date in the test, which fails again tomorrow; or patching `datetime` globally. **Interviewer follow-up:** “events can arrive before they happened (device clocks)?” → add a case with a negative delay and decide: reject, or clamp to zero and flag.

<a id="solution-5"></a>
### Solution 5 · A Pydantic contract for customer signups

```python
from typing import Annotated

from pydantic import (AwareDatetime, BaseModel, ConfigDict, Field, ValidationError,
                      ValidationInfo, field_validator)


class CustomerSignup(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    customer_id: Annotated[str, Field(pattern=r"^C-\d+$")]
    email: str
    country: Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
    marketing_opt_in: Annotated[bool, Field(strict=True)]   # "yes" or 1 are producer bugs
    signed_up_at: AwareDatetime

    @field_validator("email", "country", mode="before")
    @classmethod
    def normalise(cls, value: object, info: ValidationInfo) -> object:
        if not isinstance(value, str):
            return value
        value = value.strip()
        return value.lower() if info.field_name == "email" else value.upper()

    @field_validator("email")
    @classmethod
    def looks_like_email(cls, value: str) -> str:
        local, at, domain = value.partition("@")
        if not (local and at and "." in domain and "@" not in domain):
            raise ValueError("not an email address")
        return value


def reason(data: dict[str, object]) -> str:
    try:
        CustomerSignup.model_validate(data)
        return "ok"
    except ValidationError as err:
        first = err.errors()[0]
        return f"{first['type']}:{'.'.join(map(str, first['loc']))}"


good = {"customer_id": "C-17", "email": " Ana@Leafy.Example ", "country": " us",
        "marketing_opt_in": False, "signed_up_at": "2026-03-08T12:00:00Z"}
s = CustomerSignup.model_validate(good)
print(s.email, s.country, s.marketing_opt_in)
cases = {
    "opt-in as text": {**good, "marketing_opt_in": "yes"},
    "three-letter country": {**good, "country": "USA"},
    "no @": {**good, "email": "ana.leafy.example"},
    "naive time": {**good, "signed_up_at": "2026-03-08T12:00:00"},
    "unknown field": {**good, "referrer": "ads"},
}
results = {name: reason(data) for name, data in cases.items()}
for name, r in results.items():
    print(f"{name:<21} {r}")
assert (s.email, s.country) == ("ana@leafy.example", "US")
assert results == {
    "opt-in as text": "bool_type:marketing_opt_in",
    "three-letter country": "string_pattern_mismatch:country",
    "no @": "value_error:email",
    "naive time": "timezone_aware:signed_up_at",
    "unknown field": "extra_forbidden:referrer",
}
```

Output:

```text
ana@leafy.example US False
opt-in as text        bool_type:marketing_opt_in
three-letter country  string_pattern_mismatch:country
no @                  value_error:email
naive time            timezone_aware:signed_up_at
unknown field         extra_forbidden:referrer
```

Normalisation runs *before* the pattern checks, so `" us"` becomes `"US"` and passes. Strictness is per field: the rest of the model stays lax. The reason codes come straight from Pydantic’s error types, so they can feed the same quarantine as lesson 14. **Common wrong answer:** `marketing_opt_in: bool` in lax mode accepts `"yes"` as `True`, silently opting people in to marketing. **Interviewer follow-up:** “the email check is naive” → yes: for real validation use `pydantic.EmailStr` (needs the `email-validator` package) and accept that only a confirmation email proves an address.

<a id="solution-6"></a>
### Solution 6 · Fix three mypy errors

```python
# ex6/ex6_fixed.py
import re


def order_number(order_id: str) -> int:
    match = re.fullmatch(r"O-(\d+)", order_id)
    if match is None:
        raise ValueError(f"not an order id: {order_id!r}")
    return int(match.group(1))


def reject_limit(limits: dict[str, float], source: str, default: float = 0.25) -> float:
    return limits.get(source, default)


def first_paid(events: list[dict[str, str]]) -> dict[str, str] | None:
    for e in events:
        if e["event_type"] == "order_paid":
            return e
    return None


assert order_number("O-1001") == 1001
assert reject_limit({"web": 0.1}, "ios") == 0.25
assert first_paid([{"event_type": "order_placed"}]) is None
print("all asserts passed")
```

Terminal:

```text
$ mypy --strict ex6_fixed.py
Success: no issues found in 1 source file
```

Terminal:

```text
$ python ex6_fixed.py
all asserts passed
```

Each fix makes a decision the original code left to chance. `re.fullmatch` also rejects `"O-1001x"`, which `re.match` would accept. The return type of `first_paid` now tells every caller to handle “no paid event”. **Common wrong answer:** `return limits[source]` (a `KeyError` at runtime) or `assert match` (removed when Python runs with `-O`). **Interviewer follow-up:** “mypy passes; are we safe?” → only from type errors in our code; the data can still be wrong, which is Part B’s job.

<a id="solution-7"></a>
### Solution 7 · A Pandera contract for daily revenue, with row quarantine

```python
import pandas as pd
import pandera.pandas as pa
from pandera.typing import Series


class DailyRevenue(pa.DataFrameModel):
    business_date: Series[str] = pa.Field(unique=True, str_matches=r"^\d{4}-\d\d-\d\d$")
    orders: Series[int] = pa.Field(ge=0)
    revenue: Series[float] = pa.Field(ge=0)
    refunds: Series[float] = pa.Field(ge=0)

    class Config:
        strict = True
        coerce = True

    @pa.dataframe_check
    @classmethod
    def refunds_not_above_revenue(cls, df: pd.DataFrame) -> pd.Series:
        return df["refunds"] <= df["revenue"]          # one bool per row -> row-level failures


daily = pd.DataFrame({
    "business_date": ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-08", "2026-03-09"],
    "orders": [10, -1, 12, 1, 9],
    "revenue": [250.0, 0.0, 300.5, 10.0, 199.0],
    "refunds": [0.0, 0.0, 320.0, 0.0, 25.0],
})
try:
    DailyRevenue.validate(daily, lazy=True)
except pa.errors.SchemaErrors as err:
    cases = err.failure_cases
    print(cases[["column", "check", "failure_case", "index"]].to_string(index=False))
    bad = set(cases["index"].dropna().astype(int))
good = daily.drop(index=sorted(bad))
print("quarantine rows:", sorted(bad), "| keep:", good["business_date"].tolist())
assert bad == {1, 2, 3}
assert good["business_date"].tolist() == ["2026-03-06", "2026-03-09"]
assert len(DailyRevenue.validate(good)) == 2
```

Output:

```text
       column                       check failure_case  index
business_date   refunds_not_above_revenue   2026-03-08      2
       orders   refunds_not_above_revenue           12      2
      revenue   refunds_not_above_revenue        300.5      2
      refunds   refunds_not_above_revenue        320.0      2
business_date            field_uniqueness   2026-03-08      2
business_date            field_uniqueness   2026-03-08      3
       orders greater_than_or_equal_to(0)           -1      1
quarantine rows: [1, 2, 3] | keep: ['2026-03-06', '2026-03-09']
```

Uniqueness reports *both* rows of the duplicated date, which is right: the frame cannot tell which one is correct, so both wait in quarantine for a human or a rule. Returning a Series makes the refund rule row-level. **Pydantic or Pandera?** Pandera: the data is already a frame and two of the rules (unique dates) span rows, which a per-record model cannot see. **Common wrong answer:** returning `bool((df.refunds <= df.revenue).all())`: correct detection, but no row index, so nothing can be quarantined. **Interviewer follow-up:** “revenue should not drop more than 50 % day on day” → a statistical check across rows; batch-level, alert rather than quarantine.

<a id="solution-8"></a>
### Solution 8 · Find every problem in a workflow

```python
import subprocess
from pathlib import Path

import yaml

fixed = """name: ci
on: [pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.12", "3.13"]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: ${{ matrix.python-version }}
      - run: python -m pip install -r requirements-dev.txt
      - run: ruff check --output-format=github .
      - run: ruff format --check .
      - run: mypy
      - run: pytest"""
path = Path("demos/ex8/fixed.yml")
path.write_text(fixed, encoding="utf-8")
lint = subprocess.run(["actionlint", str(path)], capture_output=True, text=True)
print("actionlint exit code:", lint.returncode, lint.stdout.strip())

steps = yaml.safe_load(fixed)["jobs"]["test"]["steps"]
order = [s.get("uses", s.get("run")) for s in steps]
print(*order, sep="\n")
assert lint.returncode == 0
assert order[0].startswith("actions/checkout@")
assert order.index("python -m pip install -r requirements-dev.txt") < order.index("pytest")
assert {"mypy", "ruff format --check ."} <= set(order)
```

Output:

```text
actionlint exit code: 0 
actions/checkout@v7
actions/setup-python@v7
python -m pip install -r requirements-dev.txt
ruff check --output-format=github .
ruff format --check .
mypy
pytest
```

actionlint caught the action without a version (`actions/setup-python` needs `@v7`) and the undefined matrix key (`py` vs `python-version`). It cannot know that there is **no checkout** (the runner starts empty, so there is nothing to test), that **tests run before the install**, or that **lint and types are missing**. **Common wrong answer:** fixing only what the linter reports. **Interviewer follow-up:** “CI takes 12 minutes” → cache pip, split slow integration tests into their own job, cancel superseded runs with `concurrency`, and run only the matrix leg you need on pull requests.

<a id="solution-9"></a>
### Solution 9 · Design the tests for an ingredient-quantity parser (Fuel Smart)

| Layer | What | How |
|---|---|---|
| unit | `parse_quantity`, unit normalisation (`cups` → `cup`), grams conversion, food matching score | parametrize tables with ids; every odd form seen in the data gets a case |
| unit | Pydantic model per ingredient line, with reason codes (`missing:unit`, `value_error:quantity`) | factory fixture for lines |
| fixture files | 50 recipes with the real Food.com columns + a golden file of expected grams per line | committed, invented or public-domain values; located via `Path(__file__)` |
| integration | the CLI on the 50-recipe fixture into `tmp_path`: counts, quarantine reasons, manifest | fixed clock; marked `integration` |
| batch contract | recipe frame: one row per recipe serving, `kcal ≥ 0`, matched share in [0, 1] | Pandera, lazy; stop on batch-level failures |
| not tested here | the USDA API and Kaggle download | a fake client in unit tests; one manual smoke run, documented |
| gate | ≥ 80 % branch coverage on the package; mypy strict; Ruff | CI required check |

```python
# tests/exercises/test_ex9_quantity.py
from fractions import Fraction

import pytest

VULGAR = {"½": Fraction(1, 2), "⅓": Fraction(1, 3), "¼": Fraction(1, 4), "¾": Fraction(3, 4)}


def _number(text: str) -> Fraction:
    """'1', '1/2', '1 1/2', '1½', '½' -> Fraction."""
    text = text.strip()
    if text and text[-1] in VULGAR:
        whole = text[:-1].strip()
        return (Fraction(whole) if whole else Fraction(0)) + VULGAR[text[-1]]
    parts = text.split()
    if len(parts) == 2:
        return Fraction(parts[0]) + Fraction(parts[1])
    if len(parts) == 1:
        return Fraction(parts[0])
    raise ValueError(f"not a quantity: {text!r}")


def parse_quantity(text: str) -> tuple[Fraction, Fraction]:
    """Quantity text -> (low, high). A single value gives low == high; '2-3' gives a range."""
    low_text, dash, high_text = text.partition("-")
    try:
        low = _number(low_text)
        high = _number(high_text) if dash else low
    except (ValueError, ZeroDivisionError):
        raise ValueError(f"not a quantity: {text!r}") from None
    if low > high:
        raise ValueError(f"range goes down: {text!r}")
    return low, high


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        pytest.param("3", (Fraction(3), Fraction(3)), id="whole"),
        pytest.param("1/2", (Fraction(1, 2), Fraction(1, 2)), id="fraction"),
        pytest.param("1 1/2", (Fraction(3, 2), Fraction(3, 2)), id="mixed"),
        pytest.param("1½", (Fraction(3, 2), Fraction(3, 2)), id="unicode-mixed"),
        pytest.param("½", (Fraction(1, 2), Fraction(1, 2)), id="unicode-half"),
        pytest.param("2-3", (Fraction(2), Fraction(3)), id="range"),
    ],
)
def test_parse_quantity(text: str, expected: tuple[Fraction, Fraction]) -> None:
    assert parse_quantity(text) == expected


@pytest.mark.parametrize("text", ["", "a pinch", "1/0", "3-2"], ids=["empty", "words", "div0", "down"])
def test_rejects(text: str) -> None:
    with pytest.raises(ValueError, match="quantity|range"):
        parse_quantity(text)
```

Terminal (durations measured on the build machine):

```text
$ pytest tests/exercises/test_ex9_quantity.py -q --no-cov
..........                                                                               [100%]
10 passed in 1.01s
```

The plan puts most effort where the risk is (parsing and matching), keeps external services out of automated tests, and makes the batch contract the last line of defence. Returning a range instead of a midpoint keeps the decision (“use the low end”, “use the mean”) visible and testable later. **Common wrong answer:** converting with `float()` early, so `1/3 cup` becomes 0.333… and golden grams drift by rounding; or testing only happy paths. **Interviewer follow-up:** “500k recipes: is per-line Python fast enough?” → measure first; the parser is pure, so it parallelises with processes, or move the common forms to a vectorised regex in Polars or DuckDB and keep Python for the rare ones.

<a id="solution-10"></a>
### Solution 10 · Full line coverage, still a bug

Terminal:

```text
$ pytest --cov=rules --cov-branch --cov-report=term-missing -q
..                                                                                       [100%]
======================================= tests coverage ========================================
______________________ coverage: platform win32, python 3.12.10-final-0 _______________________
Name       Stmts   Miss Branch BrPart  Cover   Missing
------------------------------------------------------
rules.py       7      0      4      1    91%   6->8
------------------------------------------------------
TOTAL          7      0      4      1    91%
2 passed in 0.99s
```

```python
from pathlib import Path
import subprocess

folder = Path("demos/ex10")
tests = folder / "test_rules.py"
tests.write_text(tests.read_text(encoding="utf-8") + """

def test_valid_amount_has_no_reason() -> None:
    assert amount_reason({"amount": 12.5}) is None
""", encoding="utf-8")
run = subprocess.run(["pytest", "-q", "--tb=line"], cwd=folder, capture_output=True, text=True)
print(next(l for l in run.stdout.splitlines() if "UnboundLocalError" in l).strip())
assert run.returncode == 1

(folder / "rules.py").write_text("""def amount_reason(event: dict[str, object]) -> str | None:
    # reason code for a bad amount, or None when the amount is fine
    amount = event.get("amount")
    if amount is None:
        return "missing:amount"
    if isinstance(amount, int | float) and amount < 0:
        return "negative:amount"
    return None
""", encoding="utf-8")
run = subprocess.run(["pytest", "--cov=rules", "--cov-branch", "-q"], cwd=folder,
                     capture_output=True, text=True)
print(run.stdout.strip().splitlines()[-1])
print(next(l for l in run.stdout.splitlines() if l.startswith("rules.py")))
assert run.returncode == 0 and "100%" in run.stdout
```

Output:

```text
E   UnboundLocalError: cannot access local variable 'reason' where it is not associated with a value
3 passed in 1.01s
rules.py       7      0      4      0   100%
```

Every line ran, but the `if amount < 0` never evaluated to false, so no test ever reached `return reason` with `reason` unassigned. A valid amount, the most common input in production, raised `UnboundLocalError`. Branch coverage pointed at the missing case; the fix returns explicitly on each path. **Common wrong answer:** initialising `reason = None` at the top and moving on: it works, but the real lesson is the missing test for the happy path. **Interviewer follow-up:** “would mypy have caught it?” → not by default; Ruff and mypy have “possibly undefined” checks (mypy’s `possibly-undefined` error code) that you can enable.
