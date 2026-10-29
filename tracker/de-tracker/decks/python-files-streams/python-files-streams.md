# Python files, generators, and practical data scripts

*Companion to `python-files-streams.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Lesson:** *Python for data engineering*, deck 2 of 2. Deck 1 of 2, *Python foundations for data engineering*, covers the in-memory core; this deck covers files, streams and generators, time zones and `Decimal` at the edges, DB-API and transactions, context managers and decorators, logging, configuration, a CLI, packaging with uv and Ruff, tests, and concurrency.

**Tested with:** CPython 3.12.10 on Windows 11 (64-bit), DuckDB 1.5.6, tzdata, pytest, and uv, in one virtual environment; Ruff 0.16.10 for the linting example. Every Python block was executed while building this document: in-process blocks inside the build, and blocks shown with a `$ python …` line as separate processes. Timing and memory figures are labelled as measured on the build machine; yours will differ.

**Minimum version:** Python 3.11 (`itertools.batched` needs 3.12; a 3.11 version is shown). **Also runs on:** Microsoft Fabric Runtime 1.3 (Python 3.11) and 2.0 (Python 3.13).

**Prerequisite:** the Python foundations deck (*Python foundations for data engineering*). New terms are defined on first use, collected in the glossary, and most lessons end with an **On the job** note on where the concept is used in real work.

**Additions beyond the original brief** are marked *(added)*.

**2026-10-26 update:** lesson 12A adds a small API JSON → flat rows walkthrough after atomic writes. Its stable anchor is `slide-52`; existing lesson anchors and numbers are retained. The deck now has 52 lessons plus two introductory “Why” sections.

## Contents

1. [Python files, generators, and practical data scripts](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [The running example: raw files from three systems](#slide-3)
4. [Anatomy of a practical data script](#slide-4)
5. [pathlib: paths as objects](#slide-5)
6. [Encodings: bytes are not text](#slide-6)
7. [Opening files: modes, newlines, and line-by-line reading](#slide-7)
8. [CSV: reading and writing with the csv module](#slide-8)
9. [JSON: types, Decimal, and serialising your own objects](#slide-9)
10. [JSON Lines: one record per line, streamable](#slide-10)
11. [gzip and compression](#slide-11)
12. [Atomic writes: never leave half a file](#slide-12)
   - [12A. Nested API JSON: parse and flatten selected fields](#slide-52)
13. [Iterables versus iterators](#slide-13)
14. [Generators and yield](#slide-14)
15. [Generator pipelines: read → parse → validate](#slide-15)
16. [itertools: the streaming toolbox](#slide-16)
17. [Bounded batches](#slide-17)
18. [Measuring memory: list versus stream](#slide-18)
19. [Timezone-aware UTC datetimes in scripts](#slide-19)
20. [zoneinfo and daylight saving time](#slide-20)
21. [Decimal at the boundaries](#slide-21)
22. [DB-API: one interface for many databases](#slide-22)
23. [Parameterised queries and SQL injection](#slide-23)
24. [Transactions: all or nothing](#slide-24)
25. [DuckDB from Python](#slide-25)
26. [Idempotent loads and a load log](#slide-26)
27. [Context managers: guaranteed cleanup](#slide-27)
28. [Decorators: wrap behaviour around functions](#slide-28)
29. [Logging instead of print](#slide-29)
30. [Configuration from the environment](#slide-30)
31. [A command-line interface with argparse](#slide-31)
32. [Packaging a script with uv and pyproject.toml](#slide-32)
33. [Testing data scripts with pytest](#slide-33)
34. [Concurrency: what problem are you solving?](#slide-34)
35. [The GIL, at decision-making depth](#slide-35)
36. [Threads with ThreadPoolExecutor](#slide-36)
37. [Processes with ProcessPoolExecutor](#slide-37)
38. [asyncio: many waits on one thread](#slide-38)
39. [Choosing a concurrency model, and keeping it bounded](#slide-39)
40. [Project: a streaming JSONL → DuckDB loader](#slide-40)
41. [Project: the loader code](#slide-41)
42. [Project: first run, malformed records, and the reject file](#slide-42)
43. [Project: failures, rollback, cleanup, and re-runs](#slide-43)
44. [Project: measured memory and speed](#slide-44)
45. [Bug clinic: failures that hide in scripts](#slide-45)
46. [Exercises 1–5: files, streams, and time](#slide-46)
47. [Exercises 6–10: databases, scripts, concurrency](#slide-47)
48. [Cheat sheet](#slide-48)
49. [Glossary](#slide-49)
50. [What to remember, and what comes next](#slide-50)
51. [References and how this deck was tested](#slide-51)
52. [Appendix A · Hints](#appendix-a)
53. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Python files, generators, and practical data scripts

**

The Python foundations deck cleaned data already in memory. This deck covers what comes before and after: files of unknown encoding, compressed logs larger than memory, databases that must stay consistent when something fails, and scripts a scheduler runs unattended.

- **Part A, files:** `pathlib`, encodings, CSV, JSON, JSONL, gzip, atomic writes, nested API JSON to flat rows.
- **Part B, streams:** iterables vs iterators, generators and `yield`, `itertools`, bounded batches, measuring memory.
- **Part C, edges and databases:** aware UTC datetimes, `zoneinfo` and DST, `Decimal` at boundaries, DB-API, parameterised queries, transactions, DuckDB.
- **Part D, scripts and concurrency:** context managers, decorators, logging, environment configuration, a CLI, `uv` and `pyproject.toml`, Ruff, testing with pytest, threads, processes, asyncio, and the GIL.
- **Project:** a streaming JSONL → DuckDB loader with malformed records, a dead-letter file, rollback, cleanup, idempotent re-runs, and measured memory. Then a bug clinic, 10 exercises, a cheat sheet and a glossary.

**Additions beyond the brief** (marked *added*): atomic writes, dead-letter files, idempotent re-runs with a load log, exit codes, pytest, Ruff, Parquet export, and DuckDB bulk-load performance. HTTP retry engineering is left to the ingestion deck.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Real data arrives as files and API dumps: unknown encodings, compressed logs bigger than memory, late and duplicated deliveries. Scripts that load them run unattended at 3 a.m. This deck is about making those scripts correct, bounded in memory, safe to re-run, and observable when something fails.

#### Where you will use it

- Landing jobs that move files from SharePoint, SFTP or blob storage into a lakehouse.
- Loaders that parse JSONL/CSV and write to a database or Parquet.
- Scheduled scripts and notebooks run by Fabric pipelines, ADF, cron or Airflow.
- Packaging shared code (uv, wheels) for Fabric environments and containers.

#### What goes wrong without it

- “CafÃ©” in reports because of a wrong encoding.
- Out-of-memory errors from reading whole files into lists.
- Half-loaded tables and half-written files after a crash.
- Duplicates after every re-run; jobs that fail but exit with code 0.

#### Who expects you to know it

- Data engineers own these jobs and get paged when they fail.
- Platform/DevOps teams expect exit codes, logs and configuration outside code.
- Interviews: “What happens if your load fails halfway?”, “How do you make it idempotent?”, “Threads or processes?”

> **On the job:** A common incident: a daily load crashed after 60% of a file and the re-run doubled the rows. The fixes in this deck (one transaction per file, delete-then-insert by source, a load log, a non-zero exit code) are the standard answers on real teams.

> **The main idea:** reliable scripts are what keep data platforms running; streaming, transactions and idempotency are the difference between a demo and production.

*Read more:* [pathlib](https://docs.python.org/3/library/pathlib.html), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Files larger than memory, one pass | Generators and line-by-line reading | Constant memory |
| Writing outputs others read | Temp file + atomic rename | Readers never see half a file |
| Loading into a database | Transaction per file + bulk load | All or nothing; fast |
| Re-runs and backfills | Delete-then-insert or upsert + load log | Idempotent and auditable |
| Many waits on network/files | Threads or asyncio, bounded | Overlaps I/O; respects remote limits |
| Heavy CPU parsing or joins | Processes, or DuckDB/Spark | The GIL limits threads for CPU work |

#### How interviews test it

- “Walk me through a script that loads daily files and survives failures.”
- “Why didn’t multithreading speed up my parser?” (GIL).
- “How do you avoid duplicates on re-run?” and “How would you test a loader?”

#### Where it sits in your learning path

- Second of the two decks for the lesson Python for data engineering; builds on the Python foundations deck.
- Next: the pandas & Polars deck for table-shaped work and the reliable-ingestion deck for APIs and files to Parquet.
- The transaction and idempotency ideas return in dbt and lakehouse table formats.

> **The main idea:** stream inputs, normalise values at the edges, write atomically and idempotently, and add concurrency only where the bottleneck is I/O.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · one virtual environment, two packages*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** on Windows 11, **DuckDB 1.5.6** (Python package), **tzdata** (time-zone database), **pytest** for the testing lesson, and **uv** for the packaging lesson. All in one virtual environment. |
| Minimum Python | **3.11.** One feature needs 3.12: `itertools.batched`; the deck shows a 3.11-compatible version too. Fabric Runtime 1.3 ships 3.11, Runtime 2.0 ships 3.13. |
| Virtual environment | A **virtual environment** (venv) is a private folder of installed packages for one project, so projects don’t break each other. Create it once per project (commands below). |
| Third-party packages | `duckdb` (embedded analytical database), `tzdata` (needed on Windows for `zoneinfo`), `pytest`. Everything else is the standard library. |
| How outputs were produced | In-process blocks ran inside the build; blocks labelled `$ python file.py` ran as separate processes, as you would run them. Timing and memory figures are labelled as measured on the build machine. |

#### Create the environment

```text
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb tzdata pytest

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
python -m pip install duckdb tzdata pytest
```

Lesson 32 shows the same setup with `uv`, which creates the environment and lock file for you.

#### Check it

```python
import sys, duckdb
from zoneinfo import ZoneInfo
print(sys.version.split()[0], duckdb.__version__)
print(ZoneInfo("America/Chicago"))   # fails on Windows without tzdata
```

Output:

```text
3.12.10 1.5.6
America/Chicago
```

> **On the job:** Every production script runs in a pinned environment: a venv locally, a Fabric environment or Docker image in the cloud. "It works on my machine" bugs are mostly different package versions.

> **The main idea:** one venv per project, with packages installed into it rather than globally. Note the versions you test with; the deck states its own at the top of the Markdown companion.

*Read more:* [venv](https://docs.python.org/3/library/venv.html), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [tzdata on PyPI](https://pypi.org/project/tzdata/).

---

<a id="slide-3"></a>
## 3. The running example: raw files from three systems

*Start here · create the sample files once*

The plant shop from the Python foundations deck now delivers data as **files**: daily **JSON Lines** event logs (one JSON object per line, also called JSONL or NDJSON), a gzip-compressed log, a late file, an Excel CSV export, and a legacy file in an old Windows encoding. Save this script and run it once in an empty folder; every later example reads these files.

```python
# make_sample_data.py
"""make_sample_data.py: create the raw files used throughout this deck."""
import gzip
from pathlib import Path

RAW = Path("data/raw")
RAW.mkdir(parents=True, exist_ok=True)

# Day 1: JSON Lines (one JSON object per line), with typical problems
day1 = [
    '{"event_id":"e1","user_id":"u1","event_type":"page_view","ts":"2026-03-02T09:00:00Z","amount":null}',
    '{"event_id":"e2","user_id":"u1","event_type":"add_to_cart","ts":"2026-03-02T09:01:10Z","amount":"40.00"}',
    '{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00"}',
    '',                                                                        # blank line
    '{"event_id":"e4","user_id":" U2 ","event_type":"Page_View","ts":"2026-03-02T10:15:00+01:00","amount":null}',
    '{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":25}',
    '{"event_id":"e6","user_id":null,"event_type":"purchase","ts":"2026-03-02T11:00:00Z","amount":"18.00"}',
    '{"event_id":"e7","user_id":"u3","event_type":"purchase"',               # truncated JSON
    '{"event_id":"e8","user_id":"u3","event_type":"purchase","ts":"2026-03-02T12:00:00Z","amount":"abc"}',
    '{"event_id":"e9","user_id":"u4","event_type":"purchase","ts":"2026-03-02T12:30:00Z","amount":"12.50","note":"Café ☕"}',
    '[1, 2, 3]',                                                               # valid JSON, not an object
    '{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00"}',  # redelivery
]
(RAW / "events_2026-03-02.jsonl").write_text("\n".join(day1) + "\n", encoding="utf-8")

# Day 2: the same format, gzip-compressed
day2 = [
    '{"event_id":"e10","user_id":"u5","event_type":"page_view","ts":"2026-03-03T07:59:00-06:00","amount":null}',
    '{"event_id":"e11","user_id":"u5","event_type":"purchase","ts":"2026-03-03T08:00:00-06:00","amount":7.5}',
    '{"event_id":"e12","user_id":"u1","event_type":"refund","ts":"2026-03-03T09:00:00Z","amount":"5.00"}',
    '{"event_id":"e13","user_id":"u2","event_type":"purchase","ts":"2026-03-03T23:30:00-08:00","amount":"39.00"}',
]
with gzip.open(RAW / "events_2026-03-03.jsonl.gz", "wt", encoding="utf-8") as f:
    f.write("\n".join(day2) + "\n")

# Day 3: arrives late and contains an event_id that was already loaded (e5)
day3 = [
    '{"event_id":"e14","user_id":"u6","event_type":"purchase","ts":"2026-03-04T10:00:00Z","amount":"9.99"}',
    '{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":"25.00"}',
]
(RAW / "events_2026-03-04.jsonl").write_text("\n".join(day3) + "\n", encoding="utf-8")

# An Excel-style CSV export: UTF-8 with a byte-order mark, quotes, commas and a newline inside fields,
# and local Chicago times without an offset
csv_text = (
    "order_id,customer,city,amount,ordered_at_local\r\n"
    "SO-5001,Maya Lopez,Austin,64.00,2026-03-02 09:03\r\n"
    'SO-5002,"Café Verde, LLC",Denver,"1,250.50",2026-03-08 02:30\r\n'
    'SO-5003,"Leo ""The Plant"" Kim",Denver,25.00,2026-11-01 01:30\r\n'
    'SO-5004,"Ana\r\nRuiz",Seattle,18.00,2026-11-01 03:15\r\n'
)
(RAW / "orders_export.csv").write_text(csv_text, encoding="utf-8-sig", newline="")

# A legacy export saved in Windows-1252, not UTF-8
(RAW / "legacy_cp1252.csv").write_bytes("customer,city\r\nCafé Verde,Denver\r\n".encode("cp1252"))

for p in sorted(RAW.iterdir()):
    print(f"{p.as_posix():<38} {p.stat().st_size:>5} bytes")
```

Output:

```text
$ python make_sample_data.py
data/raw/events_2026-03-02.jsonl        1015 bytes
data/raw/events_2026-03-03.jsonl.gz      210 bytes
data/raw/events_2026-03-04.jsonl         206 bytes
data/raw/legacy_cp1252.csv                34 bytes
data/raw/orders_export.csv               279 bytes
```

| File | Traps it contains | Lessons |
|---|---|---|
| events_2026-03-02.jsonl | blank line, truncated JSON (e7), a JSON array instead of an object, missing user, bad amount, non-ASCII text, a +01:00 offset, a number instead of a string amount, a redelivered e3 | 10, 15, 42 |
| events_2026-03-03.jsonl.gz | gzip, −06:00 / −08:00 offsets (e13 is on 4 March in UTC), a float amount, an unknown event type | 11, 19, 42 |
| events_2026-03-04.jsonl | arrives late; e5 was already loaded, which violates the target table’s primary key | 43 |
| orders_export.csv | byte-order mark, comma and quotes inside fields, a newline inside a field, thousands separators, local times in a DST gap and a DST overlap | 6, 8, 20, 21 |
| legacy_cp1252.csv | Windows-1252 bytes that are invalid UTF-8 | 6 |

> **The main idea:** keep a tiny, deliberately broken sample of every input format. It doubles as test data and as documentation of what “messy” looks like for each source.

---

<a id="slide-4"></a>
## 4. Anatomy of a practical data script

*Start here · where each lesson fits*

Most data-engineering scripts follow the same shape. A **batch job** processes a bounded set of input (yesterday’s files) and stops; a **streaming** job never stops. This deck is about batch scripts that *stream* through their input: they read a record, handle it, and move on, so memory stays flat however large the files are.

1. **Configure** (CLI arguments, environment variables): Which files, which database, batch size. Lessons 30–32.
2. **Discover inputs** (pathlib): Find the files to process, in a deterministic order. Lesson 5.
3. **Read and decode** (open, encodings, csv, json, gzip): Bytes → text → records. Lessons 6–11.
4. **Stream and validate** (generators, itertools): One record at a time; bad records to a dead-letter file. Lessons 13–18.
5. **Load in batches** (DB-API, transactions, DuckDB): All-or-nothing per file; re-runnable. Lessons 22–26.
6. **Clean up and report** (context managers, logging, exit code): Temp files deleted, a load log written, a non-zero exit on failure. Lessons 27–31.

> **On the job:** This is the shape of an ingestion notebook in Fabric, an Azure Function that lands files, or a scheduled container job. Interviewers often ask you to sketch it: “walk me through a script that loads daily files into a warehouse and survives failures.”

> **The main idea:** configure → discover → decode → stream and validate → load in batches inside a transaction → clean up and report. Each lesson below makes one step robust.

*Read more:* [__main__: top-level code environment](https://docs.python.org/3/library/__main__.html), [The Twelve-Factor App](https://12factor.net/).

---

<a id="slide-5"></a>
## 5. pathlib: paths as objects

*Files · Path objects instead of string concatenation*

`pathlib.Path` represents a file-system path as an object. The `/` operator joins parts with the right separator for the operating system (`\` on Windows, `/` elsewhere), and methods answer common questions without string slicing.

```python
from pathlib import Path

raw = Path("data") / "raw"                      # join with /
p = raw / "events_2026-03-03.jsonl.gz"
print(p.as_posix(), "| name:", p.name, "| stem:", p.stem, "| suffixes:", p.suffixes)
print("parent:", p.parent.as_posix(), "| exists:", p.exists(), "| is_file:", p.is_file())
print("size:", p.stat().st_size, "bytes")
print(p.with_suffix("").with_suffix(".parquet").name)   # swap extensions

files = sorted(raw.glob("events_*.jsonl*"))              # pattern match, sorted for determinism
print([f.name for f in files])
print(sorted(f.name for f in Path("data").rglob("*.csv")))   # recursive

out = Path("data/out/reports")
out.mkdir(parents=True, exist_ok=True)                    # like mkdir -p
(out / "hello.txt").write_text("hi\n", encoding="utf-8")
print((out / "hello.txt").read_text(encoding="utf-8").strip(), "| absolute?", out.is_absolute())
print(repr(Path("data/raw")))                             # the real type on this machine
```

Output:

```text
data/raw/events_2026-03-03.jsonl.gz | name: events_2026-03-03.jsonl.gz | stem: events_2026-03-03.jsonl | suffixes: ['.jsonl', '.gz']
parent: data/raw | exists: True | is_file: True
size: 210 bytes
events_2026-03-03.parquet
['events_2026-03-02.jsonl', 'events_2026-03-03.jsonl.gz', 'events_2026-03-04.jsonl']
['legacy_cp1252.csv', 'orders_export.csv']
hi | absolute? False
WindowsPath('data/raw')
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `"data" + "\\" + name` breaks on Linux and in Fabric | `Path("data") / name` |
| Relying on `glob` / `iterdir` order (not guaranteed) | `sorted(...)`: files processed in the same order every run |
| Relative paths resolve against the *current working directory*, which differs when a scheduler runs your script | Build paths from configuration, or from `Path(__file__).parent` for files shipped with the code |
| `p.suffix` on `x.jsonl.gz` gives only `.gz` | Use `p.suffixes` or `p.name.endswith(".jsonl.gz")` |
| `read_text()` without `encoding=` | Always pass `encoding="utf-8"` (next lesson) |

#### Fabric and cloud paths

In a Fabric notebook the default lakehouse is mounted at `/lakehouse/default/Files`, so `Path("/lakehouse/default/Files/raw")` works with everything in this deck. Remote URLs such as `abfss://…` are not local paths: Spark, DuckDB, or the `fsspec`/`adlfs` libraries read those.

> **On the job:** File discovery is the first step of every landing job: “process every new `*.jsonl.gz` under `raw/2026/03/`, oldest first”. Sorting the list and logging it makes a run reproducible and easy to audit.

> **The main idea:** use Path for every path: join with `/`, inspect with `.name`, `.suffixes`, `.stat()`, discover with sorted `glob`, and create folders with `mkdir(parents=True, exist_ok=True)`.

*Read more:* [pathlib](https://docs.python.org/3/library/pathlib.html), [Fabric: explore lakehouse data from a notebook](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-notebook-explore).

---

<a id="slide-6"></a>
## 6. Encodings: bytes are not text

*Files · UTF-8, the BOM, cp1252, and mojibake*

Files store **bytes**. An **encoding** is the rule that maps bytes to characters. **UTF-8** is the standard: ASCII characters take 1 byte, others 2–4 (é is 2 bytes, ☕ is 3). **Decoding** turns bytes into `str`; **encoding** turns `str` into bytes. Decoding with the wrong encoding either fails or silently produces **mojibake** (garbled text like `CafÃ©`).

```python
import locale
from pathlib import Path

text = "Café ☕"
data = text.encode("utf-8")
print(data, len(text), "characters ->", len(data), "bytes")
print(data.decode("cp1252"))                       # mojibake: wrong encoding, no error!

raw = Path("data/raw/legacy_cp1252.csv").read_bytes()
print(raw)
try:
    raw.decode("utf-8")
except UnicodeDecodeError as e:
    print("UnicodeDecodeError:", e.reason, "at byte", e.start)
print(raw.decode("cp1252").splitlines()[1])        # the right encoding
print(raw.decode("utf-8", errors="replace").splitlines()[1])   # keep going, mark bad bytes with U+FFFD

bom = Path("data/raw/orders_export.csv").read_bytes()[:3]
print("BOM bytes:", bom)
print(repr(Path("data/raw/orders_export.csv").read_text(encoding="utf-8")[:9]))
print(repr(Path("data/raw/orders_export.csv").read_text(encoding="utf-8-sig")[:9]))
print("default encoding for open() here:", locale.getpreferredencoding(False))
```

Output:

```text
b'Caf\xc3\xa9 \xe2\x98\x95' 6 characters -> 9 bytes
CafÃ© â˜•
b'customer,city\r\nCaf\xe9 Verde,Denver\r\n'
UnicodeDecodeError: invalid continuation byte at byte 18
Café Verde,Denver
Caf� Verde,Denver
BOM bytes: b'\xef\xbb\xbf'
'\ufefforder_id'
'order_id,'
default encoding for open() here: cp1252
```

#### Rules

- **Always pass `encoding=`** to `open`, `read_text`, `write_text`. On this Windows machine the default is `cp1252`, on Linux usually UTF-8, so the same code behaves differently. (Python 3.15 is scheduled to make UTF-8 the default everywhere, PEP 686; until then, be explicit.)
- Read files from Excel and Windows tools with `utf-8-sig`: it strips the **BOM** (byte-order mark, the 3 bytes `EF BB BF`) if present, otherwise behaves like UTF-8. Without it, your first column is named `\ufefforder_id`.
- Write UTF-8 without a BOM unless a consumer (old Excel) demands one.
- `errors="strict"` (the default) is right for pipelines: fail loudly. Use `errors="replace"` only when you also count and report the replacements.

#### How to find the encoding

Ask the source owner first. Otherwise: try strict UTF-8; if it fails, look at the offending bytes. `0xE9` alone is é in cp1252/latin-1; `0xC3 0xA9` is é in UTF-8. Libraries like `charset-normalizer` can guess, but guesses are not contracts.

> **On the job:** Encoding bugs show up as customer names like “CafÃ© Verde” in a Power BI report, or a job that fails only on the day a supplier name contains “ñ”. Write the agreed encoding into the data contract for each feed, and keep a sample file with non-ASCII characters in your tests.

> **The main idea:** text in files is bytes plus an encoding. Pass `encoding=` every time, use `utf-8-sig` for Excel exports, fail on undecodable bytes, and document each source’s encoding.

*Read more:* [Unicode HOWTO](https://docs.python.org/3/howto/unicode.html), [Standard encodings](https://docs.python.org/3/library/codecs.html#standard-encodings), [PEP 686: make UTF-8 mode the default](https://peps.python.org/pep-0686/), [Python UTF-8 Mode](https://docs.python.org/3/library/os.html#utf8-mode).

---

<a id="slide-7"></a>
## 7. Opening files: modes, newlines, and line-by-line reading

*Files · open(), text vs binary, and streaming lines*

`open(path, mode, encoding=…)` returns a **file object**. Mode `"r"` reads text, `"w"` truncates and writes, `"a"` appends, `"x"` creates only if the file doesn’t exist; add `"b"` for bytes. Always open with `with`: the file is closed even if an error occurs (lesson 27 explains how).

```python
from pathlib import Path

path = Path("data/raw/events_2026-03-02.jsonl")
with open(path, encoding="utf-8") as f:          # mode "r" is the default
    for line_no, line in enumerate(f, start=1):   # reads ONE line at a time: constant memory
        line = line.rstrip("\n")
        if line_no <= 3 or not line:
            print(line_no, repr(line[:45]))

with open("data/out/log.txt", "w", encoding="utf-8") as f:
    f.write("first\n")
    print("second", file=f)                       # print() can write to a file
with open("data/out/log.txt", "a", encoding="utf-8") as f:
    f.writelines(["third\n", "fourth\n"])
print(Path("data/out/log.txt").read_text(encoding="utf-8").splitlines())

try:
    with open("data/out/log.txt", "x", encoding="utf-8") as f:    # refuse to overwrite
        pass
except FileExistsError as e:
    print("FileExistsError:", e.filename)

with open(path, "rb") as f:                       # binary: bytes, no decoding
    print(f.read(20))
```

Output:

```text
1 '{"event_id":"e1","user_id":"u1","event_type":'
2 '{"event_id":"e2","user_id":"u1","event_type":'
3 '{"event_id":"e3","user_id":"u1","event_type":'
4 ''
['first', 'second', 'third', 'fourth']
FileExistsError: data/out/log.txt
b'{"event_id":"e1","us'
```

#### Newlines

In text mode Python translates line endings: on reading, `\r\n` and `\r` become `\n`; on writing, `\n` becomes the platform default (`\r\n` on Windows). Pass `newline=""` to turn translation off. The `csv` module requires `newline=""` because it handles line endings itself, including newlines *inside* quoted fields.

| Read the whole file | Read line by line |
|---|---|
| `f.read()`, `path.read_text()`, `f.readlines()` | `for line in f:` |
| memory grows with file size | memory stays flat |
| fine for config files and small inputs | right for logs and data files |

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `"w"` on the output you were about to append to: data gone | Use `"a"`, or `"x"` to refuse overwrites; better, write to a new file atomically (lesson 12) |
| Forgetting to close: data not flushed, file locked on Windows | `with open(...)` |
| `f.readlines()` on a 10 GB log | Iterate the file object |
| Lines still end with `\n` | `line.rstrip("\n")` (not `strip()`, which also eats meaningful spaces) |
| Extra blank rows in CSV on Windows | Open CSV files with `newline=""` |

> **On the job:** Iterating a file object is the simplest streaming reader there is. Log processors, JSONL loaders, and line-count checks (“did we receive as many rows as the source said?”) are all a `for line in f` loop.

> **The main idea:** open files with `with`, an explicit mode and encoding; iterate the file object to stream lines; use `newline=""` for CSV.

*Read more:* [open()](https://docs.python.org/3/library/functions.html#open), [io](https://docs.python.org/3/library/io.html), [Tutorial: reading and writing files](https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files).

---

<a id="slide-8"></a>
## 8. CSV: reading and writing with the csv module

*Files · never split on commas yourself*

**CSV** (comma-separated values) looks simple until a field contains a comma, a quote, or a newline. Quoted fields handle that: `"Café Verde, LLC"`, and a quote inside is doubled: `"Leo ""The Plant"" Kim"`. The `csv` module implements those rules; `line.split(",")` does not.

```python
import csv
from pathlib import Path

path = Path("data/raw/orders_export.csv")
with open(path, encoding="utf-8-sig", newline="") as f:    # utf-8-sig strips the BOM; newline="" for csv
    reader = csv.DictReader(f)                             # first row = header
    print(reader.fieldnames)
    for row in reader:
        print(reader.line_num, row["order_id"], repr(row["customer"]), repr(row["amount"]))

n_lines = sum(1 for _ in open(path, encoding="utf-8-sig"))
print(n_lines, "physical lines = 1 header + 4 records + 1 newline inside a quoted field")
print("naive split:", "SO-5002,\"Café Verde, LLC\",Denver".split(","))
```

Output:

```text
['order_id', 'customer', 'city', 'amount', 'ordered_at_local']
2 SO-5001 'Maya Lopez' '64.00'
3 SO-5002 'Café Verde, LLC' '1,250.50'
4 SO-5003 'Leo "The Plant" Kim' '25.00'
6 SO-5004 'Ana\r\nRuiz' '18.00'
6 physical lines = 1 header + 4 records + 1 newline inside a quoted field
naive split: ['SO-5002', '"Café Verde', ' LLC"', 'Denver']
```

#### Writing CSV

```python
import csv
rows = [{"order_id": "SO-5002", "customer": "Café Verde, LLC", "amount": "1250.50"},
        {"order_id": "SO-5003", "customer": 'Leo "The Plant" Kim', "amount": "25.00"}]
with open("data/out/orders_clean.csv", "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["order_id", "customer", "amount"])
    writer.writeheader()
    writer.writerows(rows)                  # quoting is applied only where needed
print(open("data/out/orders_clean.csv", encoding="utf-8").read())
```

Output:

```text
order_id,customer,amount
SO-5002,"Café Verde, LLC",1250.50
SO-5003,"Leo ""The Plant"" Kim",25.00
```

#### Rules and traps

- Every value is a **string**. `"1,250.50"` needs `.replace(",", "")` before `Decimal`; empty fields are `""`, not `None`.
- `DictReader` uses the header; check `reader.fieldnames` against the expected columns before processing, and fail early if a column was renamed.
- `reader.line_num` counts *physical* lines, so it differs from the record number when fields contain newlines. Use `enumerate(reader, start=2)` for “row N” messages.
- Other dialects: `delimiter=";"` (European Excel), `"\t"` (TSV). `csv.Sniffer` can guess, but declare it when you can.
- Very long fields raise `csv.Error: field larger than field limit`; raise the limit with `csv.field_size_limit()` only on purpose.

> **On the job:** CSV is still the most common hand-off format: finance exports, vendor feeds, SharePoint downloads. Typical first-day tasks are “why does the first column have a weird name?” (BOM) and “why did row 1,203 split into two?” (unquoted newline or delimiter).

> **The main idea:** always use the csv module with `newline=""` and an explicit encoding (`utf-8-sig` for Excel). Treat every field as text, validate the header, then convert types yourself.

*Read more:* [csv](https://docs.python.org/3/library/csv.html), [RFC 4180: CSV](https://www.rfc-editor.org/rfc/rfc4180).

---

<a id="slide-9"></a>
## 9. JSON: types, Decimal, and serialising your own objects

*Files · json.loads / json.dumps and their edge cases*

**JSON** (JavaScript Object Notation) maps to Python as: object → `dict`, array → `list`, string → `str`, integer → `int`, fractional number → `float`, `true`/`false` → `True`/`False`, `null` → `None`. **Serialising** (dumping) goes the other way; anything else (datetime, Decimal, sets, dataclasses) needs your help.

```python
import json
from datetime import datetime, timezone
from decimal import Decimal

doc = '{"id": "e11", "amount": 7.5, "qty": 2, "paid": true, "note": null, "tags": ["a"]}'
print(json.loads(doc))
print(json.loads(doc, parse_float=Decimal)["amount"].__repr__())   # money stays exact
print(json.loads('{"amount": 0.1}')["amount"] + 0.2)              # float drift without it

record = {"id": "e3", "amount": Decimal("64.00"), "ts": datetime(2026, 3, 2, 9, 3, tzinfo=timezone.utc)}
try:
    json.dumps(record)
except TypeError as e:
    print("TypeError:", e)

def to_json(value):                     # called for objects json does not know
    if isinstance(value, Decimal):
        return str(value)               # keep exact digits as a string
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"not JSON serialisable: {type(value).__name__}")

print(json.dumps(record, default=to_json))
print(json.dumps({"note": "Café ☕"}), json.dumps({"note": "Café ☕"}, ensure_ascii=False))
print(json.dumps({"b": 1, "a": 2}, sort_keys=True, separators=(",", ":")))   # stable, compact
```

Output:

```text
{'id': 'e11', 'amount': 7.5, 'qty': 2, 'paid': True, 'note': None, 'tags': ['a']}
Decimal('7.5')
0.30000000000000004
TypeError: Object of type Decimal is not JSON serializable
{"id": "e3", "amount": "64.00", "ts": "2026-03-02T09:03:00+00:00"}
{"note": "Caf\u00e9 \u2615"} {"note": "Café ☕"}
{"a":2,"b":1}
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| Money parsed as float | `json.loads(s, parse_float=Decimal)`, or agree that amounts are sent as strings |
| `TypeError: Object of type Decimal is not JSON serializable` | `default=` function, as above |
| `json.load(f)` on a 5 GB file holding one big array | Ask for JSONL instead, or use a streaming parser (`ijson`); `json.load` always reads everything |
| Comparing JSON text in tests | Compare parsed objects, or dump with `sort_keys=True` |
| NaN in data: `json.dumps(float("nan"))` gives `NaN`, which is not valid JSON | `allow_nan=False` to fail, then clean upstream |

#### Where JSON comes from

API responses, configuration files, Event Hubs / Kafka messages, document databases (Cosmos DB), and logs. JSON keys are always strings, so `{1: "a"}` dumps as `{"1": "a"}` and loads back with a string key.

> **On the job:** Most REST APIs return JSON; most data platforms land it raw in Bronze, then parse it into typed columns in Silver. Deciding `parse_float=Decimal` vs float is a real design decision for any money field.

> **The main idea:** json maps to dict, list, str, int, float, bool, None. Parse money with `parse_float=Decimal`, serialise custom types with `default=`, and remember that `json.load` reads the whole document into memory.

*Read more:* [json](https://docs.python.org/3/library/json.html), [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259).

---

<a id="slide-10"></a>
## 10. JSON Lines: one record per line, streamable

*Files · read, validate, and write JSONL*

**JSON Lines** puts one JSON value per line. Because each line is complete, you can stream it, append to it, split it, and point at the exact line that is broken, none of which work with one big JSON array.

```python
import json
from pathlib import Path

good, bad = [], []
with open("data/raw/events_2026-03-02.jsonl", encoding="utf-8") as f:
    for line_no, line in enumerate(f, start=1):
        if not line.strip():
            continue                                        # blank lines carry no data
        try:
            obj = json.loads(line.rstrip("\n"))
        except json.JSONDecodeError as e:
            bad.append((line_no, f"invalid JSON: {e.msg} at character {e.pos}"))
            continue
        if not isinstance(obj, dict):
            bad.append((line_no, f"expected an object, got {type(obj).__name__}"))
            continue
        good.append(obj)

print(len(good), "objects:", [o["event_id"] for o in good])
for line_no, reason in bad:
    print("line", line_no, "->", reason)

with open("data/out/purchases.jsonl", "w", encoding="utf-8") as f:
    for obj in good:
        if obj.get("event_type") == "purchase":
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")     # one line per record
print(Path("data/out/purchases.jsonl").read_text(encoding="utf-8").count("\n"), "lines written")
```

Output:

```text
9 objects: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e8', 'e9', 'e3']
line 8 -> invalid JSON: Expecting ',' delimiter at character 55
line 11 -> expected an object, got list
6 lines written
```

#### Rules

- Parse each line inside its own `try`: one bad line must not stop the file.
- Keep the **line number** with every error; it’s the only way someone can find and fix the source record.
- Check the parsed type: valid JSON can still be the wrong shape (`[1, 2, 3]`).
- Writing: `json.dumps(obj)` never contains a raw newline (newlines inside strings become `\n`), so one record is always one line.
- `json.JSONDecodeError` is a subclass of `ValueError`.

#### JSONL vs other formats

| Format | Good for |
|---|---|
| JSON (one document) | Config, single API responses |
| JSONL / NDJSON | Logs, events, API dumps, dead-letter files; streamable and appendable |
| CSV | Flat tables for people and spreadsheets |
| Parquet | Analytics: typed, columnar, compressed (lesson 25) |

> **On the job:** Event Hubs Capture, Application Insights exports, and many SaaS APIs deliver JSONL. Bronze layers often keep it as-is; your loader parses it line by line and quarantines bad lines with their line numbers.

> **The main idea:** JSONL is the streaming-friendly JSON: parse line by line, keep line numbers for errors, check the shape of each object, and write one `json.dumps` per line.

*Read more:* [JSON Lines format](https://jsonlines.org/), [json](https://docs.python.org/3/library/json.html).

---

<a id="slide-11"></a>
## 11. gzip and compression

*Files · read and write compressed files as if they were plain text*

**Compression** stores the same bytes in less space. **gzip** (`.gz`) is the most common codec for text logs. `gzip.open(path, "rt", encoding=…)` returns a text file object, so a streaming reader works unchanged: the data is decompressed a chunk at a time, never all at once.

```python
import gzip, json
from pathlib import Path

path = Path("data/raw/events_2026-03-03.jsonl.gz")
with gzip.open(path, "rt", encoding="utf-8") as f:              # "rt" = read text
    for line in f:
        print(json.loads(line)["event_id"], end=" ")
print()

def open_text(path: Path):
    """Open .gz and plain files the same way."""
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, encoding="utf-8")

for p in sorted(Path("data/raw").glob("events_*.jsonl*")):
    with open_text(p) as f:
        print(p.name, sum(1 for line in f if line.strip()), "records")

# Compression ratio on repetitive event data
lines = [json.dumps({"event_id": f"e{i}", "user_id": f"u{i % 50}", "event_type": "page_view",
                     "ts": "2026-03-02T09:00:00Z"}) for i in range(10_000)]
raw = ("\n".join(lines) + "\n").encode("utf-8")
print(f"{len(raw):,} bytes -> {len(gzip.compress(raw)):,} bytes gzipped")

Path("data/out/not_really.gz").write_bytes(b"plain text")
try:
    with gzip.open("data/out/not_really.gz", "rt", encoding="utf-8") as f:
        f.read()
except gzip.BadGzipFile as e:
    print("BadGzipFile:", e)
```

Output:

```text
e10 e11 e12 e13 
events_2026-03-02.jsonl 11 records
events_2026-03-03.jsonl.gz 4 records
events_2026-03-04.jsonl 2 records
966,890 bytes -> 28,856 bytes gzipped
BadGzipFile: Not a gzipped file (b'pl')
```

#### Facts that affect design

- Text logs often compress 5–15× with gzip. Storage and transfer get cheaper; CPU cost goes up a little.
- A gzip file can only be read from the start: it’s **not splittable**, so Spark reads one big `.gz` with a single task. Prefer many medium files (or Parquet) for parallel engines.
- A **truncated** download raises `EOFError` near the end of reading, after earlier lines were already processed. That is one reason loads need transactions (lesson 24).
- Other codecs: `bz2`, `lzma` (standard library), zstd (fast, increasingly common; in the standard library from Python 3.14 as `compression.zstd`). DuckDB and Spark read `.gz` and `.zst` directly.

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `gzip.open(p)` returns bytes; `json.loads` works but string comparisons fail | Use mode `"rt"` and an encoding |
| Choosing the opener by guessing | Decide by suffix (as above) or by the magic bytes `1f 8b` |
| Writing `.gz` and forgetting to close: corrupt file | `with gzip.open(p, "wt", encoding="utf-8")` |

> **On the job:** Raw zones in a lake are full of `.json.gz` and `.csv.gz` files. Being able to stream one in a few lines of Python is the fastest way to inspect a feed, count rows, or reproduce a parsing bug outside Spark.

> **The main idea:** gzip.open in "rt" mode gives a normal text stream, so the same line-by-line code reads compressed and plain files. Remember that .gz files aren’t splittable and can be truncated.

*Read more:* [gzip](https://docs.python.org/3/library/gzip.html), [Data compression and archiving](https://docs.python.org/3/library/archiving.html).

---

<a id="slide-12"></a>
## 12. Atomic writes: never leave half a file

*Files · write to a temporary file, then rename added*

If a script dies while writing `report.csv`, the next reader sees a **partial file** that looks valid. An **atomic** operation either happens completely or not at all. The standard trick: write to a temporary file in the *same folder*, flush it, then `os.replace(tmp, final)`. Renaming within one file system is atomic: readers see the old file or the new one, never a mix.

```python
import os, tempfile
from pathlib import Path

target = Path("data/out/daily_summary.csv")
target.write_text("day,events\n2026-03-01,100\n", encoding="utf-8")       # yesterday's good file

def write_naive(path, rows, fail_after=None):
    with open(path, "w", encoding="utf-8") as f:          # truncates immediately!
        f.write("day,events\n")
        for i, row in enumerate(rows):
            if i == fail_after:
                raise RuntimeError("crash while writing")
            f.write(row + "\n")

def write_atomic(path, rows, fail_after=None):
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write("day,events\n")
            for i, row in enumerate(rows):
                if i == fail_after:
                    raise RuntimeError("crash while writing")
                f.write(row + "\n")
            f.flush()
            os.fsync(f.fileno())                        # make sure bytes reached the disk
        os.replace(tmp, path)                           # atomic swap
    except BaseException:
        Path(tmp).unlink(missing_ok=True)               # clean up the temp file
        raise

rows = ["2026-03-02,11", "2026-03-03,4"]
for writer in (write_naive, write_atomic):
    target.write_text("day,events\n2026-03-01,100\n", encoding="utf-8")
    try:
        writer(target, rows, fail_after=1)
    except RuntimeError:
        pass
    print(f"{writer.__name__:<12} after crash:", target.read_text(encoding="utf-8").splitlines())

write_atomic(target, rows)
print("after success:", target.read_text(encoding="utf-8").splitlines())
print("leftover temp files:", list(target.parent.glob("*.tmp")))
```

Output:

```text
write_naive  after crash: ['day,events', '2026-03-02,11']
write_atomic after crash: ['day,events', '2026-03-01,100']
after success: ['day,events', '2026-03-02,11', '2026-03-03,4']
leftover temp files: []
```

#### Notes

- The temp file must be in the **same directory** (same file system); a rename across drives is a copy, not atomic.
- On Windows, `os.replace` fails if another process has the target open; retry or write a new versioned file name instead.
- Object stores (ADLS, S3) have no atomic rename across folders in all modes; there, write to a staging path and use a commit marker or a table format (Delta) that provides atomic commits.
- Lesson 27 turns this into a reusable `with atomic_write(path) as f:` (exercise 7).

#### Readers need a signal too

Downstream jobs often poll a folder. Give them a clear “done” signal: the atomic rename itself, a `_SUCCESS` marker file written last (Spark and Hadoop do this), or a row in a load log (lesson 26).

> **On the job:** Half-written outputs cause some of the hardest incidents: a dashboard showing 40% of yesterday’s sales with no error anywhere. Atomic writes plus a success marker are a cheap, standard defence in any job that writes files.

> **The main idea:** write output to a temp file in the same folder and `os.replace` it into place; delete the temp file on failure. Readers then see either the old file or the complete new one.

*Read more:* [os.replace](https://docs.python.org/3/library/os.html#os.replace), [tempfile](https://docs.python.org/3/library/tempfile.html).

---

<a id="slide-52"></a>
## 12A. Nested API JSON: parse and flatten selected fields

*Files · API response → selected flat fields*

An API may wrap its records inside a top-level object called an **envelope**. Here, `data` is the list of users. Parsing turns JSON text into Python dictionaries and lists; **flattening** builds new dictionaries containing the fields you want. We will keep **one output row per user**.

### 1. A small response body

Copy this and the next block into the same script. This synthetic response needs no account or network access.

```python
body = """{
  "data": [
    {"id": 1, "name": "Maya",
     "address": {"city": "Seattle"},
     "tags": ["new", "vip"]},
    {"id": 2, "name": "Leo",
     "address": null}
  ]
}"""
```

### 2. Parse, then select fields

```python
import json

payload = json.loads(body)
rows = []
for user in payload["data"]:
    address = user.get("address")
    # Missing key or JSON null becomes an empty dict.
    if address is None:
        address = {}
    if not isinstance(address, dict):
        raise ValueError(
            "address must be an object or null"
        )
    rows.append({
        "user_id": user["id"],
        "name": user.get("name"),
        "city": address.get("city"),
    })
print(json.dumps(rows, indent=2))
```

### 3. The flat result

| user_id | name | city |
| --- | --- | --- |
| 1 | Maya | Seattle |
| 2 | Leo | `None` (JSON `null`) |

- `user["id"]` treats the ID as required: a missing key raises `KeyError`. `user.get("name")` returns `None` when an optional name is absent.
- `address.city` becomes a top-level `city` column. Missing or null addresses produce `None` in Python, shown as `null` when dumped back to JSON. Unexpected address types fail explicitly.
- We intentionally omit `tags`. Expanding a list into multiple rows is a separate decision that changes the grain. Selecting fields here preserves the number of users.

#### JSON output

```json
[
  {
    "user_id": 1,
    "name": "Maya",
    "city": "Seattle"
  },
  {
    "user_id": 2,
    "name": "Leo",
    "city": null
  }
]
```

#### Fetch this structure from a real API

`urllib.request` is Python’s built-in library for opening URLs. `urlopen()` returns a file-like HTTP response, and `with` closes it after use. Replace `payload = json.loads(body)` with the following: `json.load(response)` reads and parses the response body directly. The example URL is a placeholder; adapt the endpoint and the `data` key to your API.

```python
from urllib.request import urlopen

# Illustrative URL: replace with your endpoint.
with urlopen("https://api.example.com/users", timeout=10) as response:
    payload = json.load(response)
# Continue with rows = [] and the same for loop above.
```

For pagination, authentication, retries and larger responses, continue with [the ingestion deck](../python-ingestion/python-ingestion.html#slide-6).

#### Try it yourself

Remove Leo’s `address` key: his output row should remain, with `city` set to null. Then try `"address": "unknown"`: the code should raise `ValueError`. Finally, add an optional `country` field to the selected columns and check that the output still has one row per input user.

> **The main idea:** Parse the response, locate its record list, then build one flat dictionary per record. Choose required fields, optional fields and the output grain deliberately.

*Read more:* [Python json: load and loads](https://docs.python.org/3/library/json.html), [Python dictionaries: get](https://docs.python.org/3/library/stdtypes.html#dict.get), [Python urllib.request: urlopen](https://docs.python.org/3/library/urllib.request.html).

---

<a id="slide-13"></a>
## 13. Iterables versus iterators

*Streams · the protocol behind every for loop*

An **iterable** is anything you can loop over: it can hand out an iterator (`iter(x)`). An **iterator** is the object that actually walks: each `next(it)` returns the next item, and it raises `StopIteration` when exhausted. A `for` loop calls `iter()` once, then `next()` until `StopIteration`. In C# terms: iterable ≈ `IEnumerable`, iterator ≈ `IEnumerator`.

```python
ids = ["e1", "e2", "e3"]          # a list is an ITERABLE: each iter() starts a fresh walk
it = iter(ids)                     # an ITERATOR: remembers its position
print(next(it), next(it))
print(list(it))                    # the rest
print(list(it))                    # exhausted: empty
print(list(ids), list(ids))        # the list can be walked again and again

# What a for loop does:
it = iter(ids)
while True:
    try:
        item = next(it)
    except StopIteration:
        break
    print("got", item)

with open("data/raw/events_2026-03-04.jsonl", encoding="utf-8") as f:
    print(iter(f) is f)                            # a file IS its own iterator
    first = sum(1 for _ in f)
    second = sum(1 for _ in f)
    print("first pass:", first, "| second pass:", second)   # single pass!
```

Output:

```text
e1 e2
['e3']
[]
['e1', 'e2', 'e3'] ['e1', 'e2', 'e3']
got e1
got e2
got e3
True
first pass: 2 | second pass: 0
```

#### Which things are single-pass?

| Re-iterable (iterables) | Single-pass (iterators) |
|---|---|
| list, tuple, str, dict, set, range | file objects, csv.reader, generators |
| Path.read_text() result (a str) | map(), filter(), zip(), enumerate() |
|  | a DB cursor, an HTTP streaming response, gzip file |

Rule: if you need two passes over a single-pass source, either re-open it or store it (`list(…)`) when it’s small enough.

#### Bug: the second consumer gets nothing

```python
rows = (line for line in ["a", "b", "c"])   # a generator: single-pass
count = sum(1 for _ in rows)
names = [r.upper() for r in rows]
print(count, names)                        # names is empty
```

Output:

```text
3 []
```

> **On the job:** This bug is common in pipelines: a function counts rows for a log line, then the load step finds nothing to load. When a value of unknown type is passed around, document whether it may be single-pass, and type-hint it `Iterable[...]` vs `list[...]`.

> **The main idea:** iterables can produce iterators; iterators are single-pass position trackers. Files, readers, cursors and generators are iterators, so consume them once, or re-open them.

*Read more:* [Iterator types](https://docs.python.org/3/library/stdtypes.html#iterator-types), [iterator (glossary)](https://docs.python.org/3/glossary.html#term-iterator).

---

<a id="slide-14"></a>
## 14. Generators and yield

*Streams · lazy functions that produce values one at a time*

A function containing `yield` is a **generator function**. Calling it runs nothing; it returns a **generator** (an iterator). Each `next()` runs the body until the next `yield`, hands that value out, and **pauses** there with all local variables intact. This is C#’s `yield return`.

```python
def read_ids(lines):
    print("  [start]")
    for line in lines:
        print(f"  [about to yield {line}]")
        yield line
        print(f"  [resumed after {line}]")
    print("  [done]")

gen = read_ids(["e1", "e2"])
print("created:", type(gen).__name__)      # nothing printed by the body yet
print("next ->", next(gen))
print("next ->", next(gen))
print("rest ->", list(gen))
```

Output:

```text
created: generator
  [start]
  [about to yield e1]
next -> e1
  [resumed after e1]
  [about to yield e2]
next -> e2
  [resumed after e2]
  [done]
rest -> []
```

#### yield from and cleanup

```python
import json

def lines_from(paths):
    for path in paths:
        with open(path, encoding="utf-8") as f:   # closed even if the consumer stops early
            yield from f                          # delegate: yield every line of f

def first_n(iterable, n):
    for i, item in enumerate(iterable):
        if i == n:
            return                                # stopping early is fine
        yield item

paths = ["data/raw/events_2026-03-02.jsonl", "data/raw/events_2026-03-04.jsonl"]
for line in first_n(lines_from(paths), 2):
    print(json.loads(line)["event_id"])
```

Output:

```text
e1
e2
```

When a consumer stops early, Python **closes** the generator (now or when it is garbage-collected), which runs its pending `finally` blocks and `with` exits, so the file is closed.

#### Rules

- Generators are lazy: work happens only when someone asks for the next item.
- They are single-pass iterators (previous lesson).
- A `return value` inside a generator ends it; the value is attached to `StopIteration` and rarely needed.
- Exceptions raised inside a generator surface at the consumer’s `next()`, not when the generator is created, so put error handling where the values are consumed, or inside the generator per item.
- A generator that holds a file or connection keeps it open until it’s exhausted or closed: consume it fully, or wrap it in `contextlib.closing`.

> **On the job:** Generators are how you write readers for files bigger than memory, paginated API clients (“yield every record from every page”), and the stages of a streaming loader. Spark’s lazy transformations follow the same idea at cluster scale.

> **The main idea:** use `yield` to turn a loop that would build a list into a lazy stream. Put resources (`with open`) inside the generator so they live exactly as long as the stream.

*Read more:* [Functional HOWTO: generators](https://docs.python.org/3/howto/functional.html#generators), [yield expressions](https://docs.python.org/3/reference/expressions.html#yield-expressions).

---

<a id="slide-15"></a>
## 15. Generator pipelines: read → parse → validate

*Streams · composable stages with constant memory*

Chain generators so each stage pulls one item from the previous stage. Only one record is in flight at a time, and the whole pipeline is lazy: asking for three results reads only as many lines as needed.

```python
import gzip, json
from itertools import islice
from pathlib import Path

STATS = {"lines_read": 0}

def read_lines(paths):
    """Stage 1: yield (path, line_no, text) from plain or .gz files, in sorted order."""
    for path in sorted(paths):
        opener = gzip.open if path.suffix == ".gz" else open
        with opener(path, "rt", encoding="utf-8") as f:
            for line_no, line in enumerate(f, start=1):
                STATS["lines_read"] += 1
                yield path.name, line_no, line.rstrip("\n")

def parse(lines):
    """Stage 2: JSON objects or rejects; never raises for bad data."""
    for name, line_no, text in lines:
        if not text.strip():
            continue
        try:
            obj = json.loads(text)
        except json.JSONDecodeError as e:
            yield {"_reject": f"{name}:{line_no}: {e.msg}"}
            continue
        if not isinstance(obj, dict):
            yield {"_reject": f"{name}:{line_no}: not an object"}
            continue
        yield {**obj, "_source": f"{name}:{line_no}"}

def only_purchases(records):
    """Stage 3: a filter."""
    return (r for r in records if r.get("event_type") == "purchase")   # a generator expression works too

pipeline = only_purchases(parse(read_lines(Path("data/raw").glob("events_*.jsonl*"))))
first_three = list(islice(pipeline, 3))
print([r["_source"] for r in first_three], "| lines read so far:", STATS["lines_read"])
rest = list(pipeline)                       # continue where we stopped
print(len(rest), "more | lines read in total:", STATS["lines_read"])
```

Output:

```text
['events_2026-03-02.jsonl:3', 'events_2026-03-02.jsonl:6', 'events_2026-03-02.jsonl:7'] | lines read so far: 7
7 more | lines read in total: 18
```

#### Why stages?

- Each stage is small and testable on a plain list (`parse([("f", 1, "{}")])`).
- Stages can be swapped: CSV reader instead of JSONL, a different filter, a different sink.
- Rejects travel through the pipeline as data (or go to a side list) instead of exceptions that would stop the stream.
- Memory is bounded by the largest single record, not the file.

#### Where streaming stops

Some operations need all data before producing output: **sorting**, global **deduplication** (you must remember every key seen), and “top 10”. Those are **blocking** steps. Push them to a database (DuckDB, a warehouse), keep only the needed state (a set of IDs, a heap of 10 items), or use sorted inputs and merge (next lesson).

> **On the job:** A pipeline of generators is the plain-Python version of a dataflow: the same shape as Spark’s read → transform → filter → write, Azure Data Factory activities, or a dbt model chain. Being able to say which steps are streaming and which are blocking is a common system-design interview point.

> **The main idea:** compose small generator stages; the pipeline stays lazy and runs in constant memory until a blocking step (sort, global dedupe) needs to see everything.

*Read more:* [Functional HOWTO: generators](https://docs.python.org/3/howto/functional.html#generators).

---

<a id="slide-16"></a>
## 16. itertools: the streaming toolbox

*Streams · slice, chain, group, accumulate, merge*

`itertools` provides fast building blocks that work on any iterable and stay lazy. Think of it as LINQ for streams: `islice` ≈ `Skip/Take`, `chain` ≈ `Concat`, `groupby` ≈ `GroupBy` (with an important difference).

```python
import heapq
from itertools import accumulate, chain, count, groupby, islice, pairwise, takewhile
from operator import itemgetter

print(list(islice(count(start=1000), 3)))                          # infinite counter, take 3
print(list(islice("abcdefgh", 2, 6, 2)))                           # start, stop, step
print(list(chain(["e1", "e2"], ["e3"], ("e4",))))                  # concatenate streams
print(list(chain.from_iterable([["a", "b"], ["c"]])))             # flatten one level
print(list(accumulate([10, 5, 20])))                               # running total
print(list(pairwise(["09:00", "09:05", "09:30"])))                 # consecutive pairs (3.10+)
print(list(takewhile(lambda n: n < 3, [1, 2, 5, 1])))              # stop at first failure

rows = [("u1", "e1"), ("u1", "e2"), ("u2", "e5"), ("u1", "e9")]    # sorted by time, not by user
print([(k, [e for _, e in g]) for k, g in groupby(rows, key=itemgetter(0))])   # CONSECUTIVE groups!
rows_sorted = sorted(rows, key=itemgetter(0))
print([(k, [e for _, e in g]) for k, g in groupby(rows_sorted, key=itemgetter(0))])

# Merge already-sorted streams lazily (e.g. sorted daily files) without loading them all:
day1 = [("2026-03-02T09:00", "e1"), ("2026-03-02T11:00", "e6")]
day1b = [("2026-03-02T09:20", "e5"), ("2026-03-02T12:30", "e9")]
print([e for _, e in heapq.merge(day1, day1b)])
```

Output:

```text
[1000, 1001, 1002]
['c', 'e']
['e1', 'e2', 'e3', 'e4']
['a', 'b', 'c']
[10, 15, 35]
[('09:00', '09:05'), ('09:05', '09:30')]
[1, 2]
[('u1', ['e1', 'e2']), ('u2', ['e5']), ('u1', ['e9'])]
[('u1', ['e1', 'e2', 'e9']), ('u2', ['e5'])]
['e1', 'e5', 'e6', 'e9']
```

#### groupby only groups neighbours

Unlike SQL `GROUP BY` or LINQ, `itertools.groupby` starts a new group whenever the key changes, as in the first output (u1 appears twice). Sort by the key first, or rely on inputs that are already ordered (a file sorted by user, a query with `ORDER BY`). For unsorted data, use a `defaultdict(list)` (Python foundations deck) or a database.

| Tool | Use it for |
|---|---|
| `islice` | preview the first N rows; skip a header; paginate a stream |
| `chain.from_iterable` | many files or pages → one stream |
| `groupby` | per-key processing of sorted input (sessions, per-user files) |
| `pairwise` | gaps between consecutive events |
| `heapq.merge` | k-way merge of sorted files (external sort) |
| `tee` | two consumers of one stream (buffers the gap between them: memory risk) |

#### Notes

- Everything here is lazy except `sorted`, which must read all input.
- `groupby` groups share the underlying iterator: consume each group before moving to the next, or convert it to a list as shown.
- `itertools.batched` (3.12+) gets its own lesson next.
- The [itertools recipes](https://docs.python.org/3/library/itertools.html#itertools-recipes) section of the docs is worth reading once.

> **On the job:** Typical uses: `islice` to sample the first 1,000 lines of a 20 GB log while debugging; `chain` to treat 300 daily files as one stream; `groupby` on a sorted export to write one output file per customer; `heapq.merge` to merge pre-sorted partitions.

> **The main idea:** itertools gives lazy slicing, concatenation, grouping, running totals, and merging. Remember that groupby only groups consecutive equal keys.

*Read more:* [itertools](https://docs.python.org/3/library/itertools.html), [heapq.merge](https://docs.python.org/3/library/heapq.html#heapq.merge).

---

<a id="slide-17"></a>
## 17. Bounded batches

*Streams · process N records at a time*

A **batch** (or chunk) is a fixed-size group of records handled together. Batching sits between “one row at a time” (too many round-trips) and “everything at once” (too much memory). A **bounded** batch has a maximum size, so memory has a ceiling whatever the input size.

```python
from itertools import batched, islice   # batched: Python 3.12+

print(list(batched(range(7), 3)))         # tuples; the last batch may be short

def batches(iterable, size):
    """Python 3.11-compatible version of itertools.batched."""
    if size < 1:
        raise ValueError("size must be >= 1")
    it = iter(iterable)                     # important: one shared iterator
    while batch := list(islice(it, size)):  # := assigns and tests in one step
        yield batch

print(list(batches(range(7), 3)))

def endless_ids():
    n = 0
    while True:
        n += 1
        yield f"e{n}"

first_two = list(islice(batches(endless_ids(), 1000), 2))   # works on infinite streams: lazy
print(len(first_two), first_two[1][:2])
```

Output:

```text
[(0, 1, 2), (3, 4, 5), (6,)]
[[0, 1, 2], [3, 4, 5], [6]]
2 ['e1001', 'e1002']
```

#### Choosing a batch size

| Smaller batches | Larger batches |
|---|---|
| lower memory per batch | fewer round-trips, less per-call overhead |
| less work lost or retried on failure | better throughput for bulk loaders |
| finer progress logging | longer transactions and locks |

Start with something like 1,000–50,000 rows for database loads and whatever the API documents for API calls (often 100–1,000). Measure, then tune. Always handle the last, partial batch.

#### Bug: the batch helper that never ends

```python
from itertools import islice

def broken_batches(iterable, size):
    while True:
        batch = list(islice(iterable, size))   # BUG on lists: islice restarts from the beginning
        if not batch:
            return
        yield batch

print(list(islice(broken_batches([1, 2, 3], 2), 3)))   # repeats [1, 2] forever (capped at 3 here)
```

Output:

```text
[[1, 2], [1, 2], [1, 2]]
```

Calling `iter()` once and slicing that iterator, as in the correct version, fixes it.

> **On the job:** Batches appear everywhere: “insert 10,000 rows per transaction”, “send at most 500 records per API call”, “write one Parquet file per 1 million rows”, “commit Kafka offsets every 1,000 messages”. The batch size is usually a configuration value (lesson 30).

> **The main idea:** batch streams with `itertools.batched` (3.12+) or the islice-on-one-iterator helper; choose the size by measuring, and remember the last batch is usually short.

*Read more:* [itertools.batched](https://docs.python.org/3/library/itertools.html#itertools.batched), [PEP 572: assignment expressions](https://peps.python.org/pep-0572/).

---

<a id="slide-18"></a>
## 18. Measuring memory: list versus stream

*Streams · tracemalloc, measured on 200,000 events*

Claims like “generators save memory” are worth measuring. `tracemalloc` (standard library) records memory allocated by Python objects; `get_traced_memory()` returns the current and **peak** bytes since `start()`. First create a larger file:

```python
# make_big_file.py
"""make_big_file.py: 200,000 synthetic events (gzip), with a few malformed lines."""
import gzip, json, random
from datetime import datetime, timedelta, timezone
from pathlib import Path

rng = random.Random(42)                       # fixed seed: same file every run
start = datetime(2026, 3, 5, tzinfo=timezone.utc)
Path("data/big").mkdir(parents=True, exist_ok=True)
with gzip.open("data/big/events_big.jsonl.gz", "wt", encoding="utf-8") as f:
    for i in range(1, 200_001):
        kind = rng.choices(["page_view", "add_to_cart", "purchase"], weights=[70, 20, 10])[0]
        event = {
            "event_id": f"b{i}",
            "user_id": f"u{rng.randint(1, 5000)}",
            "event_type": kind,
            "ts": (start + timedelta(seconds=i * 3)).isoformat().replace("+00:00", "Z"),
            "amount": None if kind == "page_view" else f"{rng.randint(100, 20000) / 100:.2f}",
        }
        line = json.dumps(event)
        if i % 5000 == 0:
            line = line[:40]                  # every 5,000th line is truncated
        f.write(line + "\n")
print("written", Path("data/big/events_big.jsonl.gz").stat().st_size, "bytes")
```

Output:

```text
$ python make_big_file.py
written 2074718 bytes
```

```python
# measure_memory.py
"""measure_memory.py: peak Python memory for 'load everything' vs 'stream'."""
import gzip, json, time, tracemalloc
from collections import Counter

PATH = "data/big/events_big.jsonl.gz"

def load_everything():
    with gzip.open(PATH, "rt", encoding="utf-8") as f:
        lines = f.readlines()                          # all lines in memory
    records = []
    for line in lines:
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return Counter(r["event_type"] for r in records)

def stream():
    counts = Counter()
    with gzip.open(PATH, "rt", encoding="utf-8") as f:
        for line in f:                                 # one line at a time
            try:
                counts[json.loads(line)["event_type"]] += 1
            except json.JSONDecodeError:
                pass
    return counts

for fn in (load_everything, stream):
    tracemalloc.start()
    t0 = time.perf_counter()
    result = fn()
    seconds = time.perf_counter() - t0
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    print(f"{fn.__name__:<16} peak {peak / 1_048_576:7.1f} MiB  time {seconds:5.2f} s  purchases={result['purchase']:,}")
```

Output (measured on the build machine; times include tracemalloc’s own overhead):

```text
$ python measure_memory.py
load_everything  peak   155.5 MiB  time  2.17 s  purchases=19,971
stream           peak     0.3 MiB  time  1.44 s  purchases=19,971
```

#### Reading the result

- Both functions give the same answer; only the **shape** of the code differs.
- The “load everything” peak grows with the file; the streaming peak stays roughly constant whatever the file size. Scale the input 100× (20 million events) and the first version would need roughly 15 GB; the streaming peak would not change.
- Python objects are large: a parsed event dict uses several hundred bytes, many times its size as JSON text.
- `tracemalloc` slows code down (often 2–3×): use it to compare designs, not to report production speed.

#### What tracemalloc does not see

Memory allocated outside Python’s allocator is invisible to it: DuckDB’s and Arrow’s C++ buffers, NumPy arrays’ data in some cases, the OS file cache. For a whole-process view, watch the **resident set size** (RSS) with Task Manager, `top`, the third-party `psutil` package, or the Spark/Fabric monitoring UI.

> **On the job:** Out-of-memory errors are one of the most common failures of notebook jobs. When one happens, measure where the peak occurs (often a `readlines()`, a `list(...)`, or a `.collect()`/`.toPandas()` in Spark) and replace it with a stream or push the work into the engine.

> **The main idea:** measure peak memory with tracemalloc when choosing a design. Streaming keeps the peak flat; reading everything makes it grow with the input, and Python objects are much bigger than the raw bytes.

*Read more:* [tracemalloc](https://docs.python.org/3/library/tracemalloc.html), [psutil (third-party)](https://psutil.readthedocs.io/).

---

<a id="slide-19"></a>
## 19. Timezone-aware UTC datetimes in scripts

*Edges · now(), epochs, durations, and storage*

The Python foundations deck parsed timestamps into aware UTC datetimes. Scripts also *create* timestamps (load time, watermarks) and receive them as **Unix epoch** numbers (seconds or milliseconds since 1970-01-01 00:00 UTC, common in APIs and logs).

```python
import time, warnings
from datetime import datetime, timedelta, timezone

loaded_at = datetime.now(timezone.utc)          # aware "now" in UTC: the right way
print(loaded_at.tzinfo, loaded_at.isoformat(timespec="seconds")[-6:])

with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    naive = datetime.utcnow()                    # deprecated since 3.12: returns a NAIVE value
print(naive.tzinfo, "|", w[0].category.__name__)

epoch_ms = 1772442180000                         # what many APIs send
ts = datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc)
print(ts, "| back to epoch seconds:", int(ts.timestamp()))
print(datetime.fromisoformat("2026-03-02T09:03:00Z").isoformat().replace("+00:00", "Z"))

watermark = datetime(2026, 3, 2, 12, 0, tzinfo=timezone.utc)
events = [datetime(2026, 3, 2, 11, 59, tzinfo=timezone.utc), datetime(2026, 3, 2, 12, 0, 1, tzinfo=timezone.utc)]
print("new since watermark:", [e.time().isoformat() for e in events if e > watermark])

t0 = time.perf_counter()                         # measure durations with a monotonic clock
time.sleep(0.05)
print(f"elapsed ≈ {time.perf_counter() - t0:.2f} s")
```

Output:

```text
UTC +00:00
None | DeprecationWarning
2026-03-02 09:03:00+00:00 | back to epoch seconds: 1772442180
2026-03-02T09:03:00Z
new since watermark: ['12:00:01']
elapsed ≈ 0.05 s
```

#### Rules for scripts

- Create timestamps with `datetime.now(timezone.utc)`, never `datetime.now()` (local, naive) or `utcnow()` (naive, deprecated).
- Convert epochs with `fromtimestamp(x, tz=timezone.utc)`; check whether the source sends seconds or milliseconds (13 digits = ms).
- Measure elapsed time with `time.perf_counter()` or `time.monotonic()`; wall-clock time can jump (NTP sync, DST).
- Store UTC. In databases without a reliable timezone type, use a plain timestamp column whose *name* says UTC (`ts_utc`), as the loader does.
- Serialise with `isoformat()`; keep the offset.

#### Watermarks

A **watermark** is the highest timestamp (or ID) already processed. Incremental loads read only records newer than the stored watermark, then advance it after a successful commit. Use a strict `>` plus a small overlap window, or deduplicate, because sources can deliver late records with older timestamps.

> **On the job:** Every incremental pipeline (“load rows where `modified_at > last_watermark`”) depends on aware UTC timestamps. A naive local `now()` on a server in another region silently skips or duplicates hours of data.

> **The main idea:** create “now” with `datetime.now(timezone.utc)`, convert epochs with an explicit UTC zone, time durations with perf_counter, and store UTC with a name that says so.

*Read more:* [datetime](https://docs.python.org/3/library/datetime.html), [time.perf_counter](https://docs.python.org/3/library/time.html#time.perf_counter).

---

<a id="slide-20"></a>
## 20. zoneinfo and daylight saving time

*Edges · local times that don’t exist, and times that happen twice*

Sources often record **local** time without an offset (the CSV’s `ordered_at_local` is Chicago time). `zoneinfo.ZoneInfo("America/Chicago")` knows that zone’s rules from the IANA time-zone database. **Daylight saving time** (DST) creates two hazards: in spring, clocks jump from 02:00 to 03:00, so 02:30 **does not exist** (a gap); in autumn, 01:00–02:00 happens **twice** (an overlap). Python’s `fold` attribute picks the first (0) or second (1) occurrence.

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

CHI = ZoneInfo("America/Chicago")

def to_utc(local_text, zone=CHI, fold=0):
    local = datetime.fromisoformat(local_text).replace(tzinfo=zone, fold=fold)
    return local.astimezone(timezone.utc)

def exists(local_text, zone=CHI):
    naive = datetime.fromisoformat(local_text)
    back = to_utc(local_text, zone).astimezone(zone).replace(tzinfo=None)
    return back == naive                                    # a gap time does not survive the round trip

for text in ["2026-03-02 09:03", "2026-03-08 02:30", "2026-11-01 01:30", "2026-11-01 03:15"]:
    print(text, "| exists:", exists(text), "| fold=0:", to_utc(text).strftime("%H:%M"), "UTC",
          "| fold=1:", to_utc(text, fold=1).strftime("%H:%M"), "UTC")

day_start = datetime(2026, 3, 8, tzinfo=CHI)
day_end = datetime(2026, 3, 9, tzinfo=CHI)
print("hours in 2026-03-08 Chicago:", (day_end.astimezone(timezone.utc) - day_start.astimezone(timezone.utc)).total_seconds() / 3600)
print(datetime(2026, 7, 1, 12, tzinfo=CHI).tzname(), datetime(2026, 1, 1, 12, tzinfo=CHI).tzname())
```

Output:

```text
2026-03-02 09:03 | exists: True | fold=0: 15:03 UTC | fold=1: 15:03 UTC
2026-03-08 02:30 | exists: False | fold=0: 08:30 UTC | fold=1: 07:30 UTC
2026-11-01 01:30 | exists: True | fold=0: 06:30 UTC | fold=1: 07:30 UTC
2026-11-01 03:15 | exists: True | fold=0: 09:15 UTC | fold=1: 09:15 UTC
hours in 2026-03-08 Chicago: 23.0
CDT CST
```

#### What the output shows

- 09:03 on 2 March is ordinary: CST = UTC−6, so 15:03 UTC.
- 02:30 on 8 March **doesn’t exist**, yet Python silently returns a time anyway (08:30 or 07:30 UTC depending on `fold`). It never raises: you must detect gaps yourself.
- 01:30 on 1 November exists **twice**: 06:30 UTC (CDT) or 07:30 UTC (CST). Without extra information the source is ambiguous; choose a documented rule (usually the first occurrence) or ask for offsets.
- A local day is not always 24 hours: 8 March 2026 has 23.

**Windows note:** Windows has no IANA database, so `zoneinfo` needs the `tzdata` package (lesson 2).

#### Rules

- Ask sources to send UTC or an offset (`2026-03-08T02:30:00-06:00`). Local times without an offset are a data-quality issue.
- Use IANA names (`America/Chicago`), never fixed offsets like “CST” or −6, which ignore DST.
- Convert to UTC at the edge; convert back to local only for display or for “business day” grouping.
- Daily aggregates “per local day” must use zone-aware day boundaries (23- and 25-hour days).
- Don’t use `pytz`-style `localize` in new code; `zoneinfo` is the standard since 3.9.

> **On the job:** Data-centre and operations data is often logged in site-local time. DST bugs show up twice a year as an hour of missing or doubled events, shift reports that are an hour off, or SLA timers that jump. Test pipelines with the DST dates of every zone you serve.

> **The main idea:** use ZoneInfo with IANA names, convert local times to UTC as early as possible, detect gap times with a round-trip check, resolve overlaps with a documented fold rule, and remember a local day can be 23 or 25 hours.

*Read more:* [zoneinfo](https://docs.python.org/3/library/zoneinfo.html), [PEP 495: the fold attribute](https://peps.python.org/pep-0495/), [IANA time zone database](https://www.iana.org/time-zones).

---

<a id="slide-21"></a>
## 21. Decimal at the boundaries

*Edges · keeping money exact from file to database*

The Python foundations deck introduced `Decimal`. The risk in scripts is the **boundaries**: every time a value crosses from a file, JSON parser, or database driver into Python, it can silently become a float.

```python
import json
from decimal import Decimal, ROUND_HALF_UP, localcontext
import duckdb

CENT = Decimal("0.01")
print(Decimal("1,250.50".replace(",", "")))                      # CSV text with a thousands separator
print(json.loads('{"amount": 7.5}', parse_float=Decimal)["amount"])   # JSON number, exact
print(Decimal(7.5), Decimal(0.1))                                # from a float: exact for 7.5, not for 0.1
print(Decimal(str(0.1)))                                         # if you only have a float: go via str()

parts = [Decimal("19.995"), Decimal("0.005")]
print(sum(parts).quantize(CENT, rounding=ROUND_HALF_UP), "vs rounding each:",
      sum(p.quantize(CENT, rounding=ROUND_HALF_UP) for p in parts))

with localcontext() as ctx:                                      # precision is significant digits (default 28)
    ctx.prec = 6
    print(Decimal(1) / Decimal(7))

con = duckdb.connect()
con.execute("CREATE TABLE t (amount DECIMAL(18, 2))")
con.execute("INSERT INTO t VALUES (?), (?)", [Decimal("64.00"), Decimal("0.10")])
total = con.execute("SELECT sum(amount) FROM t").fetchone()[0]
print(repr(total))                                               # comes back as Decimal
print(con.execute("SELECT 0.1::DOUBLE + 0.2::DOUBLE, 0.1::DECIMAL(18,2) + 0.2::DECIMAL(18,2)").fetchone())
con.close()
```

Output:

```text
1250.50
7.5
7.5 0.1000000000000000055511151231257827021181583404541015625
0.1
20.00 vs rounding each: 20.01
0.142857
Decimal('64.10')
(0.30000000000000004, Decimal('0.30'))
```

#### Boundary checklist

| Boundary | Keep it exact by… |
|---|---|
| CSV | Keep the text; strip thousands separators and currency symbols; `Decimal(text)` |
| JSON in | `parse_float=Decimal`, or ask the source to send strings |
| JSON out | `default=` that writes `str(value)` (lesson 9) |
| DuckDB / SQL Server / Postgres | `DECIMAL(p, s)` / `NUMERIC` columns; drivers return `Decimal` |
| SQLite | No decimal type: store integer cents or text, and convert explicitly |
| Spark / pandas | `DecimalType(p, s)`; pandas uses float by default unless told otherwise |

#### Rounding rules

- Round once, at the end, with a stated mode (`ROUND_HALF_UP` for most finance; the default is `ROUND_HALF_EVEN`, “banker’s rounding”).
- Rounding each line then summing can differ from summing then rounding, as shown. Agree with finance which one their reports use.
- `DECIMAL(18, 2)` means up to 18 digits in total, 2 after the point.

> **On the job:** Reconciliation failures (“the warehouse total is off by 0.03 from the ERP”) are almost always a float somewhere in the chain or a different rounding rule. Checking each boundary in this table is the standard first step in that investigation.

> **The main idea:** every boundary can turn money into float: parse text and JSON straight to Decimal, use DECIMAL columns, round once at the end with a stated mode.

*Read more:* [decimal](https://docs.python.org/3/library/decimal.html), [DuckDB: numeric types](https://duckdb.org/docs/stable/sql/data_types/numeric).

---

<a id="slide-22"></a>
## 22. DB-API: one interface for many databases

*Databases · connect, cursor, execute, fetch*

**PEP 249**, the Python Database API (DB-API 2.0), is a shared shape that most drivers follow: `sqlite3` (standard library), `pyodbc` (SQL Server, Azure SQL, Fabric SQL endpoints), `psycopg` (PostgreSQL), and DuckDB (mostly). Learn it once with SQLite, which needs no server.

```python
import sqlite3

con = sqlite3.connect(":memory:")                 # a file path for a real database
cur = con.cursor()                                # a cursor runs statements and holds results
cur.execute("CREATE TABLE events (event_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount_cents INTEGER)")
cur.execute("INSERT INTO events VALUES (?, ?, ?)", ("e3", "u1", 6400))          # one row
cur.executemany("INSERT INTO events VALUES (?, ?, ?)",                          # many rows
                [("e5", "u2", 2500), ("e9", "u4", 1250), ("e1", "u1", None)])
con.commit()                                      # make the changes permanent

cur.execute("SELECT user_id, SUM(amount_cents) FROM events GROUP BY user_id ORDER BY user_id")
print([d[0] for d in cur.description])            # column names
print(cur.fetchone())                             # next row
print(cur.fetchall())                             # the rest

cur.execute("SELECT event_id FROM events ORDER BY event_id")
for (event_id,) in cur:                           # cursors are iterators: stream large results
    print(event_id, end=" ")
print()
cur.execute("SELECT event_id FROM events ORDER BY event_id")
while batch := cur.fetchmany(2):                  # or fetch in bounded batches
    print(batch)
con.close()
```

Output:

```text
['user_id', 'SUM(amount_cents)']
('u1', 6400)
[('u2', 2500), ('u4', 1250)]
e1 e3 e5 e9 
[('e1',), ('e3',)]
[('e5',), ('e9',)]
```

#### Placeholders differ by driver

| Driver | paramstyle | Example |
|---|---|---|
| sqlite3 | qmark / named | `?` or `:user_id` |
| duckdb | qmark / numbered / named | `?`, `$1`, `$user_id` |
| pyodbc (SQL Server, Fabric) | qmark | `?` |
| psycopg (PostgreSQL) | format / pyformat | `%s` or `%(user_id)s`, which are not Python string formatting |

Each driver exposes its style as `module.paramstyle`.

#### Rules

- Iterate the cursor or use `fetchmany` for big results; `fetchall` loads everything (lesson 18).
- Close connections (or use `contextlib.closing`, lesson 27). Open connections hold locks and server resources.
- Drivers raise exceptions from a standard hierarchy: `module.Error` → `DatabaseError` → `IntegrityError`, `OperationalError`…
- SQLite has no decimal type: integer cents keep money exact.

> **On the job:** The same `connect → cursor → execute(sql, params) → fetch` pattern talks to Azure SQL with `pyodbc`, to a Fabric warehouse or lakehouse SQL endpoint, and to PostgreSQL. Only the connection string and placeholder style change.

> **The main idea:** DB-API code is connect → cursor → execute with parameters → fetch (or iterate) → commit → close. Check each driver’s placeholder style.

*Read more:* [PEP 249: DB-API 2.0](https://peps.python.org/pep-0249/), [sqlite3](https://docs.python.org/3/library/sqlite3.html).

---

<a id="slide-23"></a>
## 23. Parameterised queries and SQL injection

*Databases · values travel separately from SQL text*

**SQL injection** happens when untrusted text is pasted into SQL and changes its meaning. A **parameterised query** sends the SQL with placeholders and the values separately; the database never interprets the values as SQL.

```python
import sqlite3

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE events (event_id TEXT, user_id TEXT, event_type TEXT)")
con.executemany("INSERT INTO events VALUES (?, ?, ?)",
                [("e1", "u1", "page_view"), ("e3", "u1", "purchase"), ("e5", "u2", "purchase")])

user_input = "u9' OR '1'='1"                       # from a file, a form, an API parameter...

bad_sql = f"SELECT event_id FROM events WHERE user_id = '{user_input}'"   # BUG: injection
print(bad_sql)
print("f-string:", con.execute(bad_sql).fetchall())                          # returns EVERY row

print("params:  ", con.execute("SELECT event_id FROM events WHERE user_id = ?", (user_input,)).fetchall())

types = ["purchase", "refund"]                     # a variable-length IN list
placeholders = ", ".join("?" for _ in types)
print(con.execute(f"SELECT event_id FROM events WHERE event_type IN ({placeholders}) ORDER BY event_id", types).fetchall())

ALLOWED_SORT = {"event_id", "user_id"}             # identifiers can't be parameters: allowlist them
def list_events(order_by):
    if order_by not in ALLOWED_SORT:
        raise ValueError(f"cannot sort by {order_by!r}")
    return con.execute(f"SELECT event_id FROM events ORDER BY {order_by}").fetchall()
print(list_events("user_id"))
try:
    list_events("event_id; DROP TABLE events")
except ValueError as e:
    print("ValueError:", e)
```

Output:

```text
SELECT event_id FROM events WHERE user_id = 'u9' OR '1'='1'
f-string: [('e1',), ('e3',), ('e5',)]
params:   []
[('e3',), ('e5',)]
[('e1',), ('e3',), ('e5',)]
ValueError: cannot sort by 'event_id; DROP TABLE events'
```

#### Rules

- Every **value** goes through a placeholder: user input, file contents, values from another table, dates, even “safe-looking” numbers.
- **Identifiers** (table and column names) and SQL keywords cannot be parameters. If they must vary, check them against an allowlist, as above.
- Building the *placeholder list* with an f-string is fine (it contains only `?` characters); the values still travel separately.
- Parameters also fix quoting bugs (`O'Brien`), date formats, and decimal separators, and let the database reuse query plans.

#### Not only a security issue

In data work the “attacker” is usually a messy value: a supplier called `Smith's Garden` breaks a hand-built INSERT at 3 a.m. Parameterisation makes that a non-event.

> **On the job:** Code reviews flag any SQL built with f-strings or `+` around values. In notebooks the same applies to Spark SQL: `spark.sql("… WHERE id = :id", args={"id": x})` (Spark 3.4+) instead of formatting values into the string.

> **The main idea:** never format values into SQL text. Use the driver’s placeholders for values and an allowlist for identifiers.

*Read more:* [OWASP: query parameterization](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html), [PEP 249: DB-API 2.0](https://peps.python.org/pep-0249/).

---

<a id="slide-24"></a>
## 24. Transactions: all or nothing

*Databases · commit, rollback, and two classic surprises*

A **transaction** groups statements so they succeed or fail together. **Commit** makes them permanent and visible to others; **rollback** undoes everything since the transaction began. The properties are called **ACID**: atomic (all or nothing), consistent (constraints hold), isolated (others don’t see half-done work), durable (committed data survives a crash).

```python
import sqlite3
from contextlib import closing

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE events (event_id TEXT PRIMARY KEY, amount_cents INTEGER CHECK (amount_cents >= 0))")
con.commit()

def load(rows):
    try:
        con.executemany("INSERT INTO events VALUES (?, ?)", rows)   # sqlite3 opens a transaction implicitly
        con.commit()
    except sqlite3.IntegrityError as e:
        con.rollback()                                            # undo the rows already inserted
        print("rolled back:", e)

load([("e1", 100), ("e2", 200)])
load([("e3", 300), ("e4", -5), ("e5", 500)])                     # fails on the 2nd row
print(con.execute("SELECT event_id FROM events ORDER BY 1").fetchall())   # e3 is NOT there

with con:                                                         # commit on success, rollback on error...
    con.execute("INSERT INTO events VALUES ('e6', 600)")
print(con.execute("SELECT count(*) FROM events").fetchone(), "| still open:", con.total_changes > 0)
con.close()                                                       # ...but `with con` does NOT close it

with closing(sqlite3.connect(":memory:")) as con2, con2:          # closing() closes; inner `con2` commits
    con2.execute("CREATE TABLE t (x)")
print("closed and committed")
```

Output:

```text
rolled back: CHECK constraint failed: amount_cents >= 0
[('e1',), ('e2',)]
(3,) | still open: True
closed and committed
```

#### DuckDB transactions

```python
import duckdb
con = duckdb.connect()
con.execute("CREATE TABLE events (event_id VARCHAR PRIMARY KEY)")
con.execute("INSERT INTO events VALUES ('e1')")        # autocommit: committed immediately
con.begin()                                             # or con.execute("BEGIN TRANSACTION")
try:
    con.execute("INSERT INTO events VALUES ('e2')")
    con.execute("INSERT INTO events VALUES ('e1')")    # duplicate key
    con.commit()
except duckdb.ConstraintException as e:
    con.rollback()
    print("rolled back:", str(e).splitlines()[0][:60])
print(con.execute("SELECT list(event_id ORDER BY event_id) FROM events").fetchone()[0])
con.close()
```

Output:

```text
rolled back: Constraint Error: Duplicate key "event_id: e1" violates prim
['e1']
```

DuckDB runs each statement in its own transaction (**autocommit**) unless you call `begin()`. sqlite3, by contrast, opens one implicitly before INSERT/UPDATE/DELETE and waits for `commit()`; Python 3.12 added a `Connection.autocommit` setting to make this explicit.

#### Surprises and rules

| Surprise | Rule |
|---|---|
| sqlite3: forgetting `commit()`, so data disappears when the script ends | Commit explicitly, or use `with con:` |
| `with con:` commits but leaves the connection open | Wrap with `contextlib.closing(...)`, or call `close()` |
| DuckDB: each INSERT commits on its own unless you `begin()` | Begin a transaction for any multi-statement unit of work |
| Catching the error but not rolling back | Always `rollback()` in the except path (or let a context manager do it) |
| One giant transaction for 6 hours | Transaction per file or per partition: atomic units that can be retried |

> **On the job:** The question “what happens if your load fails halfway?” comes up in every data-engineering interview. The answer is a transaction around a meaningful unit (a file, a partition, a day), plus a re-run that’s safe (lesson 26).

> **The main idea:** wrap each unit of work in a transaction; roll back on any error; know your driver’s default (sqlite3: implicit transactions; DuckDB: autocommit) and close connections explicitly.

*Read more:* [sqlite3: transaction control](https://docs.python.org/3/library/sqlite3.html#sqlite3-controlling-transactions), [DuckDB: transaction management](https://duckdb.org/docs/stable/sql/statements/transactions), [PEP 249: DB-API 2.0](https://peps.python.org/pep-0249/).

---

<a id="slide-25"></a>
## 25. DuckDB from Python

*Databases · an embedded analytical database, and how to feed it fast added*

**DuckDB** is an **embedded** database (it runs inside your Python process, like SQLite, with no server) designed for **analytics**: columnar storage, vectorised execution, and native readers for CSV, JSON and Parquet. `duckdb.connect("warehouse.duckdb")` opens or creates a single database file; `connect()` with no path gives an in-memory database.

```python
import duckdb

con = duckdb.connect("data/out/demo.duckdb")
con.execute("CREATE OR REPLACE TABLE orders AS SELECT * FROM read_csv('data/raw/orders_export.csv', header = true)")
print(con.execute("DESCRIBE orders").fetchall()[:3])
print(con.execute("SELECT order_id, customer FROM orders WHERE city = ? ORDER BY 1", ["Denver"]).fetchall())

# Native JSONL reader with an explicit schema (never trust inference for a contract)
print(con.execute("""SELECT count(*) FROM read_json('data/raw/events_2026-03-03.jsonl.gz',
                        format = 'newline_delimited',
                        columns = {event_id: 'VARCHAR', event_type: 'VARCHAR', amount: 'VARCHAR'})""").fetchone())
try:
    con.execute("SELECT * FROM read_json('data/raw/events_2026-03-02.jsonl', format = 'newline_delimited')").fetchall()
except duckdb.InvalidInputException as e:
    print("InvalidInputException:", str(e).splitlines()[0][:90])

con.execute("COPY orders TO 'data/out/orders.parquet' (FORMAT parquet)")        # export to Parquet
print(con.execute("SELECT count(*) FROM 'data/out/orders.parquet'").fetchone())
print(con.execute("SELECT current_setting('TimeZone')").fetchone())
con.close()
```

Output:

```text
[('order_id', 'VARCHAR', 'YES', None, None, None), ('customer', 'VARCHAR', 'YES', None, None, None), ('city', 'VARCHAR', 'YES', None, None, None)]
[('SO-5002', 'Café Verde, LLC'), ('SO-5003', 'Leo "The Plant" Kim')]
(4,)
InvalidInputException: Invalid Input Error: Malformed JSON in file "data/raw/events_2026-03-02.jsonl", at byte 58
(4,)
('America/Los_Angeles',)
```

**Feeding DuckDB from Python is a performance trap.** Columnar engines are built for bulk operations; row-by-row inserts are slow. Measured on the build machine:

```python
# bulk_insert_speed.py
"""bulk_insert_speed.py: three ways to put rows into DuckDB."""
import duckdb, json, os, tempfile, time

rows = [(f"e{i}", f"u{i % 500}", f"{i % 1000}.50") for i in range(200_000)]
con = duckdb.connect()
con.execute("CREATE TABLE t (event_id VARCHAR, user_id VARCHAR, amount DECIMAL(18, 2))")

n = 2_000                                                       # only 2,000: this method is slow
t0 = time.perf_counter()
con.executemany("INSERT INTO t VALUES (?, ?, ?)", rows[:n])
per_row = (time.perf_counter() - t0) / n
print(f"executemany        {n:>7,} rows  {per_row * n:6.2f} s  (≈ {per_row * len(rows) / 60:.0f} min for 200,000)")

con.execute("DELETE FROM t")
t0 = time.perf_counter()
with tempfile.TemporaryDirectory() as tmp:                      # stage each batch as a JSONL file
    path = os.path.join(tmp, "batch.jsonl")
    for start in range(0, len(rows), 20_000):
        with open(path, "w", encoding="utf-8") as f:
            for e, u, a in rows[start:start + 20_000]:
                f.write(json.dumps({"event_id": e, "user_id": u, "amount": a}) + "\n")
        con.execute("""INSERT INTO t SELECT event_id, user_id, CAST(amount AS DECIMAL(18, 2))
                       FROM read_json(?, format = 'newline_delimited',
                                      columns = {event_id: 'VARCHAR', user_id: 'VARCHAR', amount: 'VARCHAR'})""", [path])
print(f"staged JSONL files {len(rows):>7,} rows  {time.perf_counter() - t0:6.2f} s")
print(con.execute("SELECT count(*), sum(amount) FROM t").fetchone())
con.close()
```

Output (measured on the build machine):

```text
$ python bulk_insert_speed.py
executemany          2,000 rows    7.04 s  (≈ 12 min for 200,000)
staged JSONL files 200,000 rows    0.50 s
(200000, Decimal('100000000.00'))
```

#### Ways to load, fastest first

| Method | When |
|---|---|
| `read_json` / `read_csv` / `read_parquet` directly on the files | The file is already in a shape DuckDB can parse and you accept its error handling |
| Stage validated batches to a file, then `INSERT … SELECT FROM read_json(file)` | Python must validate or transform each record (the loader project) |
| A pandas or Arrow table: `INSERT INTO t SELECT * FROM df` | You already use pandas/Polars/PyArrow (later decks) |
| `executemany` | A handful of rows (config, audit log entries) |

#### Gotchas

- `ignore_errors = true` on `read_json` does not quarantine bad lines: they become NULL rows or vanish, with no record of which lines failed. Fine for exploration, not for a contract.
- Schema inference guesses from a sample; declare `columns` or cast explicitly.
- The session `TimeZone` defaults to the machine’s zone (shown above). `TIMESTAMPTZ` values are displayed in it, and fetching them into Python requires the `pytz` package. The loader stores UTC in a plain `TIMESTAMP` column named `ts_utc`.
- One process at a time may open a database file for writing.

> **On the job:** DuckDB is used for local development against lake files, for small-to-medium transformation jobs that don’t need Spark, in CI tests for SQL, and inside Fabric Python notebooks. Knowing to load in bulk rather than row by row is the difference between a 1-second and a 20-minute job.

> **The main idea:** use DuckDB’s native readers or staged bulk files, not executemany, for anything bigger than a handful of rows; declare schemas explicitly; export to Parquet with COPY.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: loading JSON](https://duckdb.org/docs/stable/data/json/loading_json), [DuckDB: Parquet](https://duckdb.org/docs/stable/data/parquet/overview), [DuckDB: insert statements (performance note)](https://duckdb.org/docs/stable/data/insert).

---

<a id="slide-26"></a>
## 26. Idempotent loads and a load log

*Databases · re-running a job must not duplicate data added*

A job is **idempotent** when running it twice gives the same result as running it once. Jobs *will* be re-run: after a failure, a fix, or a backfill (reloading past periods). Without idempotency, every re-run duplicates rows.

```python
import duckdb
from datetime import datetime, timezone

con = duckdb.connect()
con.execute("CREATE TABLE events (event_id VARCHAR PRIMARY KEY, amount DECIMAL(18,2), source_file VARCHAR NOT NULL)")
con.execute("""CREATE TABLE load_log (source_file VARCHAR, started_at TIMESTAMP, finished_at TIMESTAMP,
                                       status VARCHAR, rows_loaded INTEGER)""")

def load_file(source_file, rows):
    started = datetime.now(timezone.utc).replace(tzinfo=None)    # store UTC in a plain TIMESTAMP
    con.begin()
    try:
        con.execute("DELETE FROM events WHERE source_file = ?", [source_file])     # 1. remove this file's previous load
        for event_id, amount in rows:                                               # 2. insert (tiny demo; bulk in the project)
            con.execute("INSERT INTO events VALUES (?, ?, ?)", [event_id, amount, source_file])
        con.commit()                                                                # 3. both or neither
        status, n = "succeeded", len(rows)
    except duckdb.Error:
        con.rollback()
        status, n = "failed", 0
    con.execute("INSERT INTO load_log VALUES (?, ?, ?, ?, ?)",                      # audit row, outside the load transaction
                [source_file, started, datetime.now(timezone.utc).replace(tzinfo=None), status, n])
    return status

print(load_file("day1.jsonl", [("e1", "10.00"), ("e2", "5.00")]))
print(load_file("day1.jsonl", [("e1", "10.00"), ("e2", "5.00")]))      # re-run: no duplicates
print(load_file("day2.jsonl", [("e3", "7.00"), ("e1", "1.00")]))       # e1 belongs to day1: PK conflict
print(con.execute("SELECT count(*), sum(amount) FROM events").fetchone())
print(con.execute("SELECT source_file, status, rows_loaded FROM load_log ORDER BY started_at").fetchall())
con.close()
```

Output:

```text
succeeded
succeeded
failed
(2, Decimal('15.00'))
[('day1.jsonl', 'succeeded', 2), ('day1.jsonl', 'succeeded', 2), ('day2.jsonl', 'failed', 0)]
```

#### Idempotency strategies

| Strategy | How | Good for |
|---|---|---|
| Delete-then-insert by unit | DELETE rows of this file/partition/day, INSERT the new ones, in one transaction | File and daily loads (the project) |
| Upsert / MERGE | `INSERT … ON CONFLICT (key) DO UPDATE`, SQL `MERGE`, Delta `MERGE INTO` | Changing records keyed by ID (CDC) |
| Overwrite a partition | Replace the whole partition or table atomically | Lake tables, small dimension tables |
| Skip already-loaded | Check the load log or a processed-files list first | Append-only immutable files |

#### Why a load log

- It answers “what was loaded, when, from which file, with how many rows, and did it succeed?”
- It’s written *outside* the load transaction, so failures are recorded even though the data was rolled back.
- It drives re-runs (“retry every file whose last status is failed”) and monitoring (“alert if today has no succeeded rows”).

> **On the job:** Ask “is it safe to run this twice?” of every job you build or review. Load logs or control tables exist in almost every production platform, often as a table the orchestrator reads (the FDEFinOps platform’s run log is an example).

> **The main idea:** design every load so a re-run gives the same result (delete-then-insert per unit in one transaction, or upsert), and record every attempt, success or failure, in a load log.

*Read more:* [DuckDB: transaction management](https://duckdb.org/docs/stable/sql/statements/transactions), [DuckDB: INSERT … ON CONFLICT](https://duckdb.org/docs/stable/sql/statements/insert#on-conflict-clause).

---

<a id="slide-27"></a>
## 27. Context managers: guaranteed cleanup

*Scripts · with, __enter__/__exit__, contextmanager, ExitStack*

A **context manager** is an object used with `with`: its `__enter__` runs at the start, its `__exit__` runs at the end **even if an exception happens**. It’s Python’s version of C# `using` / `IDisposable`, but it can also see the exception and decide what to do (commit vs roll back).

```python
from contextlib import contextmanager, ExitStack, suppress
from pathlib import Path
import duckdb, time

class Timer:                                       # the class form
    def __init__(self, name):
        self.name = name
    def __enter__(self):
        self.t0 = time.perf_counter()
        return self                                # bound to the name after `as`
    def __exit__(self, exc_type, exc, tb):
        status = "failed" if exc_type else "ok"
        print(f"{self.name}: {status} in {time.perf_counter() - self.t0:.2f}s")
        return False                               # False = don't swallow the exception

with Timer("count"):
    sum(range(1_000_000))

@contextmanager                                    # the generator form: code before yield = enter, after = exit
def transaction(con):
    con.begin()
    try:
        yield con
    except BaseException:
        con.rollback()
        raise                                      # re-raise so the caller knows
    else:
        con.commit()

con = duckdb.connect()
con.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")
with transaction(con):
    con.execute("INSERT INTO t VALUES (1), (2)")
try:
    with transaction(con):
        con.execute("INSERT INTO t VALUES (3)")
        con.execute("INSERT INTO t VALUES (1)")    # duplicate -> rollback of 3 as well
except duckdb.ConstraintException:
    print("rolled back")
print(con.execute("SELECT list(id ORDER BY id) FROM t").fetchone()[0])
con.close()

paths = sorted(Path("data/raw").glob("events_*.jsonl"))
with ExitStack() as stack:                         # a variable number of resources
    files = [stack.enter_context(open(p, encoding="utf-8")) for p in paths]
    print([sum(1 for _ in f) for f in files])
print("all closed:", all(f.closed for f in files))

with suppress(FileNotFoundError):                  # ignore one specific, expected error
    Path("data/out/does_not_exist.tmp").unlink()
```

Output:

```text
count: ok in 0.01s
rolled back
[1, 2]
[12, 2]
all closed: True
```

#### Context managers you already use

| Object | Cleanup on exit |
|---|---|
| `open(...)`, `gzip.open(...)` | flush and close the file |
| `tempfile.TemporaryDirectory()` | delete the folder and its contents |
| `sqlite3` connection | commit or roll back (but not close) |
| `contextlib.closing(x)` | call `x.close()` |
| `threading.Lock()` | release the lock |
| `ThreadPoolExecutor()` | wait for tasks, shut down the threads |

#### Rules

- Anything that must be released (file, connection, lock, temp folder, transaction) belongs in a `with`.
- In `@contextmanager`, wrap the `yield` in `try`/`finally` or `except`, otherwise cleanup is skipped when the body raises.
- Return `False` from `__exit__` (or re-raise) unless swallowing the error is the purpose; silent swallowing hides failures.
- Exercise 7 builds `atomic_write` (lesson 12) as a context manager.

> **On the job:** Loaders use context managers for exactly these jobs: a transaction per file, a temp folder for staging files, a timer that logs each step’s duration, a lock file so two runs never overlap.

> **The main idea:** put every acquire/release pair in a context manager; write your own with `@contextmanager` and try/except around the yield; use ExitStack for a variable number of resources.

*Read more:* [With statement context managers](https://docs.python.org/3/reference/datamodel.html#context-managers), [contextlib](https://docs.python.org/3/library/contextlib.html).

---

<a id="slide-28"></a>
## 28. Decorators: wrap behaviour around functions

*Scripts · timing, simple retries, caching*

A **decorator** is a function that takes a function and returns a new function, usually one that calls the original with extra behaviour around it. `@timed` above a `def` is shorthand for `f = timed(f)`. It’s similar to an attribute plus interception in C#, implemented as plain code.

```python
import functools, time

def timed(func):
    @functools.wraps(func)                       # keep the name and docstring of func
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__} took {time.perf_counter() - t0:.3f}s")
    return wrapper

@timed
def count_lines(path):
    """Count lines in a text file."""
    with open(path, encoding="utf-8") as f:
        return sum(1 for _ in f)

print(count_lines("data/raw/events_2026-03-02.jsonl"), "|", count_lines.__name__, "|", count_lines.__doc__)

def retry(times=3, exceptions=(OSError,), delay=0.0):     # a decorator FACTORY: returns a decorator
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == times:
                        raise
                    print(f"attempt {attempt} failed ({e}); retrying")
                    time.sleep(delay * 2 ** (attempt - 1))    # exponential backoff
        return wrapper
    return decorator

calls = {"n": 0}
@retry(times=3, exceptions=(ConnectionError,))
def flaky_read():
    calls["n"] += 1
    if calls["n"] < 3:
        raise ConnectionError("share temporarily unavailable")
    return "data"

print(flaky_read(), "after", calls["n"], "calls")

@functools.cache                                  # memoise: same argument -> cached result
def country_for(company_code):
    print(f"  (lookup {company_code})")
    return {"1010": "US", "1020": "GB"}.get(company_code, "unknown")
print([country_for(c) for c in ["1010", "1020", "1010", "1010"]])
```

Output:

```text
count_lines took 0.000s
12 | count_lines | Count lines in a text file.
attempt 1 failed (share temporarily unavailable); retrying
attempt 2 failed (share temporarily unavailable); retrying
data after 3 calls
  (lookup 1010)
  (lookup 1020)
['US', 'GB', 'US', 'US']
```

#### Rules

- Always use `functools.wraps`, or logs, tracebacks and tests show `wrapper` instead of the real name.
- Retry only **transient** errors (timeouts, connection resets, throttling) and only **idempotent** operations; retrying a non-idempotent INSERT duplicates data.
- Add backoff and a maximum number of attempts. Real HTTP retries also need jitter, `Retry-After` headers, and status-code rules; that belongs to the ingestion deck.
- `functools.cache` keeps every result forever; use `lru_cache(maxsize=…)` for bounded memory, and only for pure functions.

#### Decorators you will meet

| Decorator | From |
|---|---|
| `@dataclass` | Python foundations deck |
| `@contextmanager` | lesson 27 |
| `@functools.cache` / `lru_cache` | memoisation |
| `@pytest.fixture`, `@pytest.mark.parametrize` | lesson 33 |
| `@app.route`, `@app.function` | web and Azure Functions frameworks |
| `@dlt.table`, `@asset` | pipeline frameworks (Databricks DLT, Dagster) |

> **On the job:** Teams put cross-cutting behaviour (timing every pipeline step, retrying flaky network shares, logging inputs and outputs, registering tasks with an orchestrator) in decorators so the business functions stay short and testable.

> **The main idea:** a decorator wraps a function to add behaviour around every call. Use functools.wraps, retry only transient errors on idempotent work, and recognise decorator factories like `@retry(times=3)`.

*Read more:* [decorator (glossary)](https://docs.python.org/3/glossary.html#term-decorator), [functools](https://docs.python.org/3/library/functools.html), [PEP 318: decorators](https://peps.python.org/pep-0318/).

---

<a id="slide-29"></a>
## 29. Logging instead of print

*Scripts · levels, loggers, formats, and exceptions*

`print` is for program output; **logging** is for diagnostics. The `logging` module adds **levels** (DEBUG < INFO < WARNING < ERROR < CRITICAL), names (which module logged it), timestamps, and **handlers** that decide where messages go (console, file, Azure Monitor) without changing the code that logs.

```python
import logging, json

logging.basicConfig(                                   # configure ONCE, at program start (in main)
    level=logging.INFO,
    format="%(levelname)-7s %(name)s: %(message)s",    # add %(asctime)s in real scripts
    force=True,                                        # only needed because this deck reconfigures repeatedly
)
log = logging.getLogger("loader.parse")                # usually logging.getLogger(__name__)

log.debug("not shown: below the INFO level")
log.info("processing %s", "events_2026-03-02.jsonl")   # lazy %-style args: formatted only if emitted
log.warning("line %d: blank line skipped", 4)

try:
    json.loads('{"event_id": "e7"')
except json.JSONDecodeError:
    log.exception("line %d: invalid JSON", 8)          # ERROR level + traceback

log.info("loaded file=%s rows=%d rejected=%d seconds=%.2f", "events_2026-03-02.jsonl", 6, 3, 0.41)
logging.getLogger("loader").setLevel(logging.WARNING)  # quieten a whole subtree
log.info("not shown any more")
```

Output:

```text
INFO    loader.parse: processing events_2026-03-02.jsonl
WARNING loader.parse: line 4: blank line skipped
ERROR   loader.parse: line 8: invalid JSON
Traceback (most recent call last):
  File "<snippet>", line 15, in <module>
  File "<python>\Lib\json\__init__.py", line 346, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<python>\Lib\json\decoder.py", line 338, in decode
    obj, end = self.raw_decode(s, idx=_w(s, 0).end())
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<python>\Lib\json\decoder.py", line 354, in raw_decode
    obj, end = self.scan_once(s, idx)
               ^^^^^^^^^^^^^^^^^^^^^^
json.decoder.JSONDecodeError: Expecting ',' delimiter: line 1 column 18 (char 17)
INFO    loader.parse: loaded file=events_2026-03-02.jsonl rows=6 rejected=3 seconds=0.41
```

#### Rules

- Library and module code only does `log = logging.getLogger(__name__)`; the entry point (`main`) configures handlers and levels once.
- Use `log.exception(...)` inside `except` to keep the traceback.
- Pass values as arguments (`log.info("rows=%d", n)`), not f-strings: formatting is skipped when the level is disabled.
- Log **counts and identifiers**, not raw records: logs are widely readable and kept a long time. Never log secrets or personal data.
- Logs go to **stderr** by default, keeping stdout clean for program output (and for piping).
- Use a consistent `key=value` style, or JSON log lines, so logs can be searched and parsed.

#### Levels in a loader

| Level | Example |
|---|---|
| DEBUG | each batch inserted, each file opened |
| INFO | file loaded: rows, rejects, duration |
| WARNING | rejected records, retried operation, unexpected but handled |
| ERROR | file failed and was rolled back |
| CRITICAL | cannot continue at all (database unreachable) |

> **On the job:** In production nobody watches the console. Logs from Fabric notebooks, Azure Functions, and containers land in Log Analytics / Application Insights, where you query them with KQL, for example to find every file that logged an ERROR yesterday. Good log lines turn an incident into a five-minute query.

> **The main idea:** use module-level loggers, configure logging once in main, choose levels deliberately, log counts and IDs with lazy arguments, and use log.exception for errors.

*Read more:* [logging](https://docs.python.org/3/library/logging.html), [Logging HOWTO](https://docs.python.org/3/howto/logging.html), [Logging cookbook](https://docs.python.org/3/howto/logging-cookbook.html).

---

<a id="slide-30"></a>
## 30. Configuration from the environment

*Scripts · settings and secrets outside the code*

**Configuration** is everything that differs between environments (dev, test, prod) or runs: database paths, batch sizes, input folders, log levels, credentials. Keep it *out of the code*. **Environment variables** are name=value pairs the operating system passes to a process; `os.environ` is a dict-like view of them.

```python
import os
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class Config:
    db_path: Path
    input_dir: Path
    batch_size: int
    log_level: str

    @classmethod
    def from_env(cls, env=os.environ):
        errors = []
        try:
            batch_size = int(env.get("EVLOAD_BATCH_SIZE", "5000"))
            if batch_size < 1:
                errors.append("EVLOAD_BATCH_SIZE must be >= 1")
        except ValueError:
            errors.append(f"EVLOAD_BATCH_SIZE is not an integer: {env['EVLOAD_BATCH_SIZE']!r}")
            batch_size = 0
        if "EVLOAD_DB" not in env:
            errors.append("EVLOAD_DB is required")
        level = env.get("EVLOAD_LOG_LEVEL", "INFO").upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR"}:
            errors.append(f"EVLOAD_LOG_LEVEL invalid: {level!r}")
        if errors:
            raise ValueError("; ".join(errors))           # fail fast, before touching any data
        return cls(Path(env["EVLOAD_DB"]), Path(env.get("EVLOAD_INPUT", "data/raw")), batch_size, level)

print(Config.from_env({"EVLOAD_DB": "warehouse.duckdb"}))
print(Config.from_env({"EVLOAD_DB": "prod.duckdb", "EVLOAD_BATCH_SIZE": "20000", "EVLOAD_LOG_LEVEL": "debug"}))
try:
    Config.from_env({"EVLOAD_BATCH_SIZE": "lots"})
except ValueError as e:
    print("ValueError:", e)
print("PATH" in os.environ, os.environ.get("EVLOAD_DB"))   # the real process environment
```

Output:

```text
Config(db_path=WindowsPath('warehouse.duckdb'), input_dir=WindowsPath('data/raw'), batch_size=5000, log_level='INFO')
Config(db_path=WindowsPath('prod.duckdb'), input_dir=WindowsPath('data/raw'), batch_size=20000, log_level='DEBUG')
ValueError: EVLOAD_BATCH_SIZE is not an integer: 'lots'; EVLOAD_DB is required
True None
```

#### Rules

- Read configuration once at start-up into a typed, validated, frozen object; pass it to functions instead of calling `os.environ` everywhere (easy to test, as above).
- **Precedence** (highest wins): command-line arguments → environment variables → config file → defaults.
- Prefix your variables (`EVLOAD_…`) to avoid clashes.
- Environment values are always strings: convert and validate them.
- For local development, a `.env` file loaded by the third-party `python-dotenv` package is common. Add `.env` to `.gitignore`.

#### Secrets

Passwords, keys and connection strings never go in code, notebooks, Git, or logs. In Azure, store them in **Key Vault** and fetch them at run time (in Fabric notebooks: `notebookutils.credentials.getSecret(vault_url, name)`), or avoid secrets entirely with **managed identities** / workspace identities.

> **On the job:** A typical change request is “point the job at the new storage account”. If the account name is configuration, that’s a variable change; if it’s hard-coded in 12 notebooks, it’s a risky release. Variable libraries in Fabric (seen in the FDEFinOps platform) solve the same problem per environment.

> **The main idea:** keep settings and secrets outside the code; read them once into a validated config object; let the CLI override the environment; keep secrets in Key Vault or use managed identities.

*Read more:* [os.environ](https://docs.python.org/3/library/os.html#os.environ), [The Twelve-Factor App: config](https://12factor.net/config), [Fabric notebook utilities: credentials](https://learn.microsoft.com/en-us/fabric/data-engineering/notebook-utilities#credentials-utilities).

---

<a id="slide-31"></a>
## 31. A command-line interface with argparse

*Scripts · arguments, help, and exit codes*

A **CLI** (command-line interface) lets people and schedulers run your script with different inputs without editing it. `argparse` (standard library) parses arguments, converts types, and generates `--help`. The **exit code** (0 = success, anything else = failure) is how a scheduler knows whether the run worked.

```python
# count_events.py
"""count_events.py: a small command-line tool."""
import argparse
import gzip
import logging
import sys
from pathlib import Path

log = logging.getLogger("count_events")

def count_records(path: Path) -> int:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        return sum(1 for line in f if line.strip())

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Count records in JSONL files.")
    parser.add_argument("folder", type=Path, help="folder with *.jsonl / *.jsonl.gz files")
    parser.add_argument("--pattern", default="*.jsonl*", help="glob pattern (default: %(default)s)")
    parser.add_argument("--min-records", type=int, default=1, help="fail if any file has fewer records")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)                 # argv=None -> read sys.argv; a list -> tests

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(levelname)s %(message)s", stream=sys.stderr)
    files = sorted(args.folder.glob(args.pattern))
    if not files:
        log.error("no files match %s in %s", args.pattern, args.folder)
        return 1
    ok = True
    for path in files:
        n = count_records(path)
        log.debug("%s: %d records", path.name, n)
        if n < args.min_records:
            log.error("%s has %d records (< %d)", path.name, n, args.min_records)
            ok = False
        print(f"{path.name}\t{n}")                 # program output on stdout
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())                               # the return value becomes the process exit code
```

Output:

```text
$ python count_events.py --help
usage: count_events.py [-h] [--pattern PATTERN] [--min-records MIN_RECORDS]
                       [-v]
                       folder

Count records in JSONL files.

positional arguments:
  folder                folder with *.jsonl / *.jsonl.gz files

options:
  -h, --help            show this help message and exit
  --pattern PATTERN     glob pattern (default: *.jsonl*)
  --min-records MIN_RECORDS
                        fail if any file has fewer records
  -v, --verbose
```

Output:

```text
$ python count_events.py data/raw --min-records 3
events_2026-03-02.jsonl	11
events_2026-03-03.jsonl.gz	4
events_2026-03-04.jsonl	2
ERROR events_2026-03-04.jsonl has 2 records (< 3)
[exit code 1]
```

Output:

```text
$ python count_events.py data/raw --pattern *.gz -v
events_2026-03-03.jsonl.gz	4
DEBUG events_2026-03-03.jsonl.gz: 4 records
```

Output:

```text
$ python count_events.py data/raw --min-records many
usage: count_events.py [-h] [--pattern PATTERN] [--min-records MIN_RECORDS]
                       [-v]
                       folder
count_events.py: error: argument --min-records: invalid int value: 'many'
[exit code 2]
```

#### Exit codes

| Code | Meaning | Who sets it |
|---|---|---|
| 0 | success | `return 0` / end of script |
| 1 | the job failed (bad data, no input, rollback) | your `main` |
| 2 | wrong usage (bad arguments) | argparse, automatically |
| 1 + traceback | unhandled exception | Python |

Stdout carries the output (the counts); stderr carries logs and errors. That separation lets you run `python count_events.py data/raw > counts.tsv` and still see the warnings on screen.

#### Design rules

- Put logic in functions; `main(argv=None)` parses arguments and returns an exit code; tests call `main(["data/raw"])` directly.
- Make dangerous actions explicit: `--dry-run`, `--force`.
- Defaults come from the config object (lesson 30); arguments override them.
- Larger CLIs use sub-commands (`add_subparsers`) or third-party Typer/Click.

> **On the job:** Orchestrators (Fabric pipelines running a notebook or Spark job, Azure Data Factory, cron, Airflow, Kubernetes jobs) treat a non-zero exit as failure and trigger retries or alerts. A script that logs an error but exits 0 is a silent failure: the run shows green while the data is missing.

> **The main idea:** give every script a `main(argv) -> int` built on argparse, write output to stdout and logs to stderr, and exit non-zero on failure so schedulers notice.

*Read more:* [argparse](https://docs.python.org/3/library/argparse.html), [sys.exit](https://docs.python.org/3/library/sys.html#sys.exit).

---

<a id="slide-32"></a>
## 32. Packaging a script with uv and pyproject.toml

*Scripts · from a loose .py file to an installable command*

**uv** is a fast Python project and package manager: it creates the virtual environment, resolves and installs dependencies, writes a **lock file** (exact versions for reproducible installs), and runs commands inside the environment. **`pyproject.toml`** is the standard file that describes a Python project: name, version, Python requirement, dependencies, and **entry points** (commands the package installs).

#### The workflow (real output, trimmed)

Terminal:

```text
$ uv init --package evtools --python 3.12
Initialized project `evtools` at `…\evtools`
```

Terminal:

```text
$ uv add duckdb
Using CPython 3.12.10 interpreter at: …\Python312\python.exe
Creating virtual environment at: .venv
Resolved 2 packages in 463ms
   Building evtools @ file:///…/evtools
      Built evtools @ file:///…/evtools
Downloading duckdb (12.6MiB)
 Downloaded duckdb
Installed 2 packages in 107ms
 + duckdb==1.5.6
 + evtools==0.1.0 (from file:///…/evtools)
```

Terminal:

```text
$ uv add --dev pytest
Resolved 8 packages in 318ms
Installed 7 packages in 465ms
 + colorama==0.4.6
 + iniconfig==2.3.1
 + packaging==26.3
 + pluggy==1.6.0
 + pygments==2.21.0
 + pytest==9.1.1
```

Terminal:

```text
$ uv run evtools data -v
DEBUG events_2026-03-02.jsonl: 11 records
DEBUG events_2026-03-03.jsonl.gz: 4 records
DEBUG events_2026-03-04.jsonl: 2 records
3 files, 17 records
```

Terminal:

```text
$ uv build
Building source distribution...
Building wheel from source distribution...
Successfully built dist\evtools-0.1.0.tar.gz
Successfully built dist\evtools-0.1.0-py3-none-any.whl
```

#### Layout and pyproject.toml

```text
evtools/
├── .python-version          # 3.12: the interpreter uv uses for this project
├── pyproject.toml           # project metadata, dependencies, entry points
├── uv.lock                  # exact versions + hashes of everything installed (commit it)
├── README.md
├── src/
│   └── evtools/
│       ├── __init__.py
│       └── cli.py           # count_events.py from lesson 31, with main(argv) -> int
└── tests/
    └── test_cli.py
```

```toml
[project]
name = "evtools"
version = "0.1.0"
description = "Inspect raw event files."
readme = "README.md"
authors = [{ name = "Your Name", email = "you@example.com" }]
requires-python = ">=3.12"
dependencies = [
    "duckdb>=1.5.6",              # runtime dependencies (added by `uv add duckdb`)
]

[project.scripts]
evtools = "evtools.cli:main"      # creates an `evtools` command that calls main()

[build-system]
requires = ["uv_build>=0.12.23,<0.13.0"]
build-backend = "uv_build"

[dependency-groups]
dev = [
    "pytest>=9.1.1",              # development-only tools (added by `uv add --dev pytest`)
]
```

#### Lint and format with Ruff *(added)*

A **linter** reads code without running it and flags likely bugs and style problems; a **formatter** rewrites code into one consistent layout. **Ruff** is a fast Python linter and formatter (it replaces flake8, isort, pyupgrade and black in most projects). Add it as a dev tool with `uv add --dev ruff`, configure it in the same `pyproject.toml`, and run `uv run ruff check` and `uv run ruff format`.

```toml
# lintdemo/pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
# E/F: pycodestyle errors + Pyflakes (the defaults), I: import order,
# B: bugbear (likely bugs), UP: pyupgrade (modern syntax)
select = ["E", "F", "I", "B", "UP"]
```

```python
# lintdemo/load.py
import os
import json
from typing import Optional


def load(path, seen=[]):
    with open(path, encoding="utf-8") as f:
        rows = [json.loads(l) for l in f]
    seen.extend(rows)
    return seen


def to_amount(text: Optional[str]) -> float:
    try:
        return float(text)
    except:
        return 0.0
```

#### What Ruff reports (real output)

Terminal:

```text
$ ruff check --output-format concise lintdemo
lintdemo\load.py:1:1: I001 [*] Import block is un-sorted or un-formatted
lintdemo\load.py:1:8: F401 [*] `os` imported but unused
lintdemo\load.py:6:21: B006 Do not use mutable data structures for argument defaults
lintdemo\load.py:8:35: E741 Ambiguous variable name: `l`
lintdemo\load.py:13:21: UP045 [*] Use `X | None` for type annotations
lintdemo\load.py:16:5: E722 Do not use bare `except`
Found 6 errors.
[*] 3 fixable with the `--fix` option (1 hidden fix can be enabled with the `--unsafe-fixes` option).
[exit code 1]
```

- `B006` is the shared mutable default from the foundations deck: a real bug, caught before it runs.
- `E722` (bare `except`) hides every error, even typing mistakes, behind a default value.
- `F401`, `I001`, `E741` and `UP045` are clean-up: an unused import, import order, an ambiguous name (`l` looks like `1`), and `Optional[str]` → `str | None`. Items marked `[*]` are fixed automatically by `ruff check --fix`.
- Exit code 1 means “findings”, so CI fails the pull request; `ruff format --check` does the same for layout.

> **On the job:** Teams run `ruff check` and `ruff format --check` in CI and in a pre-commit hook, so reviews discuss logic instead of import order. Type checks (mypy or Pyright, introduced with type hints in the foundations deck) usually run in the same CI step.

#### Command map

| Task | uv | pip / venv equivalent |
|---|---|---|
| new project | `uv init --package name` | create folders and pyproject by hand |
| add a dependency | `uv add duckdb` | `pip install duckdb` + edit requirements |
| dev-only tool | `uv add --dev pytest` | a separate requirements-dev.txt |
| lint and format | `uv run ruff check --fix`, `uv run ruff format` | flake8 + isort + black |
| install exactly the lock | `uv sync` | `pip install -r requirements.txt` (pins) |
| run in the env | `uv run evtools …`, `uv run pytest` | activate venv, then run |
| build a wheel | `uv build` | `python -m build` |
| upgrade one package | `uv lock --upgrade-package duckdb` | `pip install -U duckdb` |

#### Notes

- A **wheel** (`.whl`) is the installable, pre-built package format. The `src/` layout prevents tests from accidentally importing the uninstalled folder.
- Commit `pyproject.toml` and `uv.lock`; never commit `.venv`.
- uv was run with downloads of Python itself disabled (`UV_PYTHON_DOWNLOADS=never`) so it used the installed 3.12; by default it can download the interpreter too.
- Tested with uv 0.12.23. The author line that `uv init` fills in from your Git configuration is replaced by a placeholder above.

> **On the job:** The same wheel can be uploaded as a custom library to a Fabric environment, installed in a Docker image for a container job, or published to an internal Azure Artifacts feed, so shared parsing and loading code isn’t copy-pasted between notebooks.

> **The main idea:** turn a script into a project: `uv init --package`, `uv add` dependencies, declare the command in `[project.scripts]`, commit the lock file, run everything with `uv run`, and let Ruff lint and format it.

*Read more:* [uv documentation](https://docs.astral.sh/uv/), [uv: projects](https://docs.astral.sh/uv/concepts/projects/), [Writing pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/), [Ruff documentation](https://docs.astral.sh/ruff/), [Ruff: rules](https://docs.astral.sh/ruff/rules/), [Fabric: manage libraries in an environment](https://learn.microsoft.com/en-us/fabric/data-engineering/environment-manage-library).

---

<a id="slide-33"></a>
## 33. Testing data scripts with pytest

*Scripts · fast checks for parsing and loading code added*

**pytest** is the standard Python test runner: it finds files named `test_*.py`, runs functions named `test_*`, and reports failed `assert` statements with the values involved. Its **fixtures** are ready-made test resources requested by parameter name, such as `tmp_path`, a fresh temporary folder for each test.

```python
# parsing.py
"""parsing.py: functions under test."""
import json
from decimal import Decimal, InvalidOperation


def parse_amount(text: str | None) -> Decimal | None:
    if text is None or str(text).strip() == "":
        return None
    try:
        value = Decimal(str(text).strip())
    except InvalidOperation:
        raise ValueError(f"amount is not a number: {text!r}") from None
    if not value.is_finite() or value < 0:
        raise ValueError(f"amount must be a finite number >= 0: {text!r}")
    return value.quantize(Decimal("0.01"))


def read_jsonl(path):
    """Yield (line_no, obj_or_None, error_or_None) for every non-blank line."""
    with open(path, encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                yield line_no, None, e.msg
                continue
            if not isinstance(obj, dict):
                yield line_no, None, "not an object"
            else:
                yield line_no, obj, None
```

```python
# test_parsing.py
"""test_parsing.py: run with `python -m pytest -q`."""
from decimal import Decimal

import pytest

from parsing import parse_amount, read_jsonl


@pytest.mark.parametrize("text, expected", [
    ("25", Decimal("25.00")),
    (" 0.00 ", Decimal("0.00")),       # a real zero is not missing
    (7.5, Decimal("7.50")),            # JSON numbers arrive as int/float
    ("", None),
    (None, None),
])
def test_parse_amount_valid(text, expected):
    assert parse_amount(text) == expected


@pytest.mark.parametrize("text", ["abc", "-5", "NaN"])
def test_parse_amount_rejects(text):
    with pytest.raises(ValueError, match="amount"):
        parse_amount(text)


def test_read_jsonl_reports_bad_lines(tmp_path):     # tmp_path: a fresh temporary folder per test
    path = tmp_path / "sample.jsonl"
    path.write_text('{"event_id": "e1"}\n\n{"event_id": \n[1, 2]\n', encoding="utf-8")
    results = list(read_jsonl(path))
    assert [(n, err is None) for n, _, err in results] == [(1, True), (3, False), (4, False)]
    assert results[2][2] == "not an object"
```

Terminal (run on the build machine; durations vary):

```text
$ python -m pytest -q test_parsing.py
.........                                                                [100%]
9 passed in 0.06s
```

#### What to test in data code

- Parsers and validators: every rule, including edge cases (zero, blank, NaN, non-ASCII, DST dates).
- Readers: small files written into `tmp_path`, including malformed lines.
- Loaders: an in-memory DuckDB (`duckdb.connect()`) or a database file in `tmp_path`; assert row counts, rejects, rollback, and that a re-run is idempotent.
- The CLI: call `main([...])` and assert the exit code.
- Bugs: every production bug gets a test that reproduces it before the fix.

#### Tips

- `@pytest.mark.parametrize` runs one test over many inputs, a compact table of cases.
- `pytest.raises(ValueError, match="…")` asserts an exception and part of its message.
- Keep tests fast (seconds) so they run on every change and in CI.
- With uv: `uv run pytest`.

> **On the job:** Teams run these tests in a CI pipeline (Azure DevOps, GitHub Actions) on every pull request, so a change to the parser can’t merge if it breaks the zero-amount or DST cases. Interviewers often ask “how do you test a data pipeline?”: unit tests on transforms with small fixtures plus data-quality checks on real runs is a strong answer.

> **The main idea:** keep parsing and loading logic in importable functions, and test them with small fixture files in tmp_path, parametrised edge cases, and assertions on exceptions and row counts.

*Read more:* [pytest](https://docs.pytest.org/en/stable/), [pytest: tmp_path](https://docs.pytest.org/en/stable/how-to/tmp_path.html), [pytest: parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html).

---

<a id="slide-34"></a>
## 34. Concurrency: what problem are you solving?

*Concurrency · I/O-bound vs CPU-bound, and the three tools*

**Concurrency** means several tasks are in progress at once (they interleave). **Parallelism** means several tasks run at literally the same instant on different CPU cores. Which you need depends on where time goes:

| Kind of work | Time is spent… | Examples | What helps |
|---|---|---|---|
| **I/O-bound** | waiting for something outside the CPU | HTTP calls, database queries, reading from a network share or blob storage | Overlap the waiting: **threads** or **asyncio** |
| **CPU-bound** | computing in Python code | parsing millions of JSON lines, hashing, pure-Python transforms | Use more cores: **processes**, or move the work into an engine (DuckDB, Spark, vectorised libraries) |

```python
import time
from concurrent.futures import ThreadPoolExecutor

def fetch_page(n):                     # pretend I/O: 0.1 s of waiting for a remote system
    time.sleep(0.1)
    return n * 10

t0 = time.perf_counter()
serial = [fetch_page(n) for n in range(20)]
t_serial = time.perf_counter() - t0

t0 = time.perf_counter()
with ThreadPoolExecutor(max_workers=5) as pool:
    threaded = list(pool.map(fetch_page, range(20)))     # results in input order
t_threads = time.perf_counter() - t0

print(serial == threaded)
print(f"serial ≈ {t_serial:.1f}s, 5 threads ≈ {t_threads:.1f}s")    # ~2.0 vs ~0.4
```

Output:

```text
True
serial ≈ 2.0s, 5 threads ≈ 0.4s
```

#### The three tools

| Tool | Model | Best for |
|---|---|---|
| `threading` / `ThreadPoolExecutor` | OS threads in one process, sharing memory | Blocking I/O with ordinary libraries (requests, pyodbc, file copies) |
| `multiprocessing` / `ProcessPoolExecutor` | separate processes, separate memory | CPU-bound Python code |
| `asyncio` | one thread, an event loop switching between coroutines at `await` | Thousands of concurrent network calls with async libraries (aiohttp, httpx) |

#### Measure first

Before adding concurrency, time the steps. If a job spends 90% of its time in one SQL query, threads in Python won’t help; a better query will. Concurrency adds complexity: race conditions, harder debugging, and rate-limit trouble with the systems you call.

> **On the job:** Typical cases: copying 2,000 files from SharePoint or blob storage (I/O-bound: threads), calling an API for 50,000 IDs (I/O-bound: asyncio or threads, within the API’s rate limit), parsing 300 large log files (CPU-bound: processes, or let DuckDB/Spark do it).

> **The main idea:** first classify the work: waiting (I/O-bound) is helped by threads or asyncio; computing (CPU-bound) needs processes or a native engine. Measure before and after.

*Read more:* [Concurrent execution](https://docs.python.org/3/library/concurrency.html), [concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html).

---

<a id="slide-35"></a>
## 35. The GIL, at decision-making depth

*Concurrency · why threads don’t speed up Python CPU work*

Standard CPython has a **Global Interpreter Lock** (GIL): only one thread at a time can execute Python bytecode in a process. Threads still help I/O because a thread *releases* the GIL while it waits (sleeping, reading a socket, waiting for a database). They don’t help pure-Python computation, because the threads just take turns.

```python
# gil_demo.py
"""gil_demo.py: CPU-bound work with threads vs processes."""
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

def burn(n: int) -> int:                 # pure-Python CPU work
    total = 0
    for i in range(n):
        total += i * i % 7
    return total

def timed(label, fn):
    t0 = time.perf_counter()
    fn()
    print(f"{label:<14} {time.perf_counter() - t0:5.2f} s")

if __name__ == "__main__":               # required for processes on Windows and macOS
    import os
    print("CPU cores:", os.cpu_count())
    jobs = [20_000_000] * 4
    timed("serial", lambda: [burn(n) for n in jobs])
    with ThreadPoolExecutor(4) as pool:
        timed("4 threads", lambda: list(pool.map(burn, jobs)))
    with ProcessPoolExecutor(4) as pool:
        timed("4 processes", lambda: list(pool.map(burn, jobs)))
```

Output (measured on the build machine):

```text
$ python gil_demo.py
CPU cores: 14
serial          3.80 s
4 threads       3.95 s
4 processes     2.55 s
```

#### What the numbers mean

- 4 threads ≈ serial: the GIL lets only one of them compute at a time (plus some switching overhead).
- With jobs this heavy (several seconds in total), 4 processes are clearly faster. With tiny jobs (a fraction of a second), process start-up cost can make processes *slower* than serial; try it with smaller `jobs`.
- Processes are faster because each has its own interpreter and its own GIL, on its own core. Each process costs start-up time and memory, and data passed between them must be **pickled** (serialised).
- Many C-implemented libraries release the GIL inside heavy operations: DuckDB queries, NumPy and Arrow kernels, zlib/gzip compression, hashlib on large inputs. Threads calling those *can* run in parallel.

#### Where this is heading

Python 3.13 added an optional **free-threaded** build without the GIL (experimental), and Python 3.14 made that build officially supported. It remains a separate, opt-in build with some single-thread overhead and gradually growing library support; the default CPython, and the Python in Fabric runtimes, still has a GIL. Design with the GIL in mind for now.

> **On the job:** Interview question: “Why didn’t my multithreaded Python parser get faster?” Answer: the GIL serialises Python bytecode, so use processes, a native engine, or vectorised libraries for CPU work, and threads for I/O. In Spark, the heavy work runs in the JVM or native code, so the GIL limits only Python UDFs, which is one reason to avoid row-by-row Python UDFs.

> **The main idea:** the GIL makes threads useless for pure-Python CPU work but fine for I/O. Use processes (or native engines) for CPU-bound work; free-threaded Python is coming but isn’t the default yet.

*Read more:* [GIL (glossary)](https://docs.python.org/3/glossary.html#term-global-interpreter-lock), [Python support for free threading](https://docs.python.org/3/howto/free-threading-python.html), [PEP 703: making the GIL optional](https://peps.python.org/pep-0703/).

---

<a id="slide-36"></a>
## 36. Threads with ThreadPoolExecutor

*Concurrency · submit, as_completed, errors, and shared state*

`concurrent.futures.ThreadPoolExecutor` manages a fixed pool of worker threads. `submit(fn, arg)` returns a **future**, a handle to a result that will exist later; `.result()` waits for it and re-raises any exception from the worker. `as_completed` yields futures as they finish.

```python
import threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

def copy_file(name):
    time.sleep({"a.gz": 0.15, "b.gz": 0.05, "c.gz": 0.10, "bad.gz": 0.02}[name])
    if name == "bad.gz":
        raise OSError(f"{name}: permission denied")
    return name, 1000

results, failures = {}, {}
with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(copy_file, n): n for n in ["a.gz", "b.gz", "c.gz", "bad.gz"]}
    for fut in as_completed(futures):                  # completion order, not submission order
        name = futures[fut]
        try:
            _, size = fut.result()                     # re-raises the worker's exception here
            results[name] = size
            print("done", name)
        except OSError as e:
            failures[name] = str(e)
print(sorted(results), failures)

# Shared state needs a lock: "counter += 1" is read-modify-write, not atomic
counter = {"n": 0}
lock = threading.Lock()
def add_unsafe(_):
    for _ in range(1000):
        current = counter["n"]
        time.sleep(0)                                  # invite a thread switch, as real I/O would
        counter["n"] = current + 1
def add_safe(_):
    for _ in range(1000):
        with lock:
            counter["n"] += 1
for fn in (add_unsafe, add_safe):
    counter["n"] = 0
    with ThreadPoolExecutor(4) as pool:
        list(pool.map(fn, range(4)))
    print(f"{fn.__name__}: {counter['n']} (expected 4000)")
```

Output:

```text
done b.gz
done c.gz
done a.gz
['a.gz', 'b.gz', 'c.gz'] {'bad.gz': 'bad.gz: permission denied'}
add_unsafe: 2002 (expected 4000)
add_safe: 4000 (expected 4000)
```

#### Rules

- Prefer workers that **return** results over workers that mutate shared objects; collect results in the main thread.
- If threads must share mutable state, guard it with a `Lock`; use `queue.Queue` to pass work between threads.
- Always call `.result()` (or iterate `map`): an exception in a worker is silently stored in its future until you do.
- Choose `max_workers` by what the *remote* system tolerates (connections, rate limits), not by CPU count.
- Many clients are not thread-safe: give each thread its own database connection or HTTP session, or check the library docs.

#### map vs submit

|  | `pool.map(fn, items)` | `submit` + `as_completed` |
|---|---|---|
| result order | input order | completion order |
| first error | raised when you reach that item | handled per future |
| progress logging | harder | natural: log each completion |
| memory | submits everything up front | you control how many are in flight (lesson 39) |

> **On the job:** A common real use: download or copy hundreds of files from a share, SFTP server, or blob container with 8–16 threads, logging each completion and collecting failures for a retry list rather than stopping the whole job on the first error.

> **The main idea:** use ThreadPoolExecutor for blocking I/O; get results and exceptions through futures; avoid shared mutable state, or lock it; size the pool for the remote system.

*Read more:* [concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html), [threading](https://docs.python.org/3/library/threading.html), [queue](https://docs.python.org/3/library/queue.html).

---

<a id="slide-37"></a>
## 37. Processes with ProcessPoolExecutor

*Concurrency · parallel CPU work, with its costs*

`ProcessPoolExecutor` has the same interface as the thread pool, but each worker is a separate Python process with its own GIL, so CPU-bound work runs on several cores. Arguments and results are **pickled** (serialised to bytes) and sent between processes.

```python
# parallel_parse.py
"""parallel_parse.py: CPU-bound parsing of several files, one process per file."""
import gzip, json, time
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

def split_into_shards(src: Path, n: int) -> list[Path]:
    out = [src.parent / f"shard_{i}.jsonl.gz" for i in range(n)]
    handles = [gzip.open(p, "wt", encoding="utf-8") for p in out]
    with gzip.open(src, "rt", encoding="utf-8") as f:
        for i, line in enumerate(f):
            handles[i % n].write(line)
    for h in handles:
        h.close()
    return out

def summarize(path: Path) -> Counter:          # top-level function: picklable by name
    counts = Counter()
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            try:
                counts[json.loads(line)["event_type"]] += 1
            except json.JSONDecodeError:
                counts["_malformed"] += 1
    return counts                              # small result travels back to the parent

if __name__ == "__main__":
    shards = split_into_shards(Path("data/big/events_big.jsonl.gz"), 4)
    for workers in (1, 4):
        t0 = time.perf_counter()
        with ProcessPoolExecutor(max_workers=workers) as pool:
            total = sum(pool.map(summarize, shards), Counter())
        print(f"{workers} process(es): {time.perf_counter() - t0:5.2f} s  {dict(sorted(total.items()))}")
```

Output (measured on the build machine; includes process start-up):

```text
$ python parallel_parse.py
1 process(es):  0.66 s  {'_malformed': 40, 'add_to_cart': 39796, 'page_view': 140193, 'purchase': 19971}
4 process(es):  0.63 s  {'_malformed': 40, 'add_to_cart': 39796, 'page_view': 140193, 'purchase': 19971}
```

**Read the result honestly:** each shard needs only ~0.2 s of parsing, so starting 4 processes costs about as much as it saves, and the speed-up is small. Process pools pay off when each task takes seconds or more: large files, heavy transforms. Measure with your real input before committing to the design.

#### Rules

- Guard the entry point with `if __name__ == "__main__":`. On Windows and macOS, new processes re-import your script; without the guard they would start pools recursively.
- Worker functions must be defined at module top level (not lambdas or nested functions) so they can be pickled by name; that’s also why this example runs as a script, not in a notebook cell.
- Send **small** inputs (a file path) and return **small** results (a Counter), not big lists of records: pickling large data can cost more than the work.
- Give each process its own resources (files, connections); they can’t share open handles.
- Expect start-up overhead (tens to hundreds of ms per process): worth it for seconds of work per task, not milliseconds. Use `chunksize` in `map` for many tiny tasks.

#### Before reaching for processes

Ask whether the work should be in Python at all. DuckDB parses these 200,000 lines with multiple threads in native code (`SELECT event_type, count(*) FROM read_json(…) GROUP BY ALL`) faster than either version above, and Spark distributes the same work across a cluster.

> **On the job:** Per-file parallelism is the usual pattern: one process per input file or partition, each returning a summary or writing its own output file. Notebooks are a poor host for process pools (worker functions can’t be pickled from cells); put them in a module or use the engine’s own parallelism.

> **The main idea:** use processes for CPU-bound Python work: guard `__main__`, use top-level functions, pass paths not data, and return small results. Often a native engine is the better answer.

*Read more:* [concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html), [multiprocessing](https://docs.python.org/3/library/multiprocessing.html), [multiprocessing: start methods](https://docs.python.org/3/library/multiprocessing.html#the-spawn-and-forkserver-start-methods).

---

<a id="slide-38"></a>
## 38. asyncio: many waits on one thread

*Concurrency · coroutines, await, gather, Semaphore*

**asyncio** runs many tasks on *one* thread. A **coroutine** (`async def`) pauses at each `await` while it waits for I/O, and the **event loop** runs another coroutine meanwhile. It works like C# `async`/`await` and scales to thousands of concurrent waits, but only with libraries that are themselves async (aiohttp, httpx, asyncpg, aiofiles).

```python
import asyncio, time

async def fetch(page: int, limit: asyncio.Semaphore, state: dict) -> int:
    async with limit:                              # at most N inside this block at once
        state["in_flight"] += 1
        state["max"] = max(state["max"], state["in_flight"])
        await asyncio.sleep(0.1)                   # pretend network wait; the loop runs others meanwhile
        state["in_flight"] -= 1
        if page == 7:
            raise ConnectionError("page 7: connection reset")
        return page * 10

async def main():
    limit = asyncio.Semaphore(5)                   # bounded concurrency
    state = {"in_flight": 0, "max": 0}
    t0 = time.perf_counter()
    results = await asyncio.gather(*(fetch(p, limit, state) for p in range(20)), return_exceptions=True)
    ok = [r for r in results if not isinstance(r, Exception)]
    errors = [str(r) for r in results if isinstance(r, Exception)]
    print(f"{len(ok)} ok, errors={errors}, max in flight={state['max']}, ≈{time.perf_counter() - t0:.1f}s")

    def blocking_lookup():                         # a sync library call (e.g. pyodbc) inside async code
        time.sleep(0.1)
        return "done"
    print(await asyncio.to_thread(blocking_lookup))   # run it in a thread so the loop isn't blocked

    try:
        async with asyncio.timeout(0.05):          # Python 3.11+
            await asyncio.sleep(1)
    except TimeoutError:
        print("timed out")

asyncio.run(main())                                # start the event loop
```

Output:

```text
19 ok, errors=['page 7: connection reset'], max in flight=5, ≈0.4s
done
timed out
```

#### Rules

- Never call blocking code (`time.sleep`, `requests.get`, sync DB drivers) directly inside a coroutine: it freezes the whole loop. Use the async library, or `asyncio.to_thread`.
- Bound concurrency with `asyncio.Semaphore`; unbounded `gather` over 100,000 calls will overwhelm the remote API and your memory.
- `gather(..., return_exceptions=True)` collects failures instead of cancelling everything on the first one; `asyncio.TaskGroup` (3.11+) does the opposite: fail fast and cancel the rest.
- `asyncio.run(main())` starts the loop in scripts. Jupyter and Fabric notebooks already run a loop: there, use `await main()` directly in a cell.

#### Threads or asyncio?

| Choose threads when… | Choose asyncio when… |
|---|---|
| libraries are synchronous (most DB drivers, requests, SDKs) | async libraries exist for every call you make |
| tens of concurrent operations | hundreds to thousands of concurrent operations |
| you are adding concurrency to existing code | you are writing a new I/O-heavy service or client |

> **On the job:** Async clients show up when pulling large volumes from APIs (thousands of paginated calls), in Azure Functions and web services, and in Azure SDKs’ `aio` sub-packages. Full HTTP retry and pagination engineering is covered in the ingestion deck.

> **The main idea:** asyncio overlaps many network waits on one thread using async libraries. Bound it with a Semaphore, never block the loop, and choose gather-with-exceptions or TaskGroup deliberately.

*Read more:* [asyncio](https://docs.python.org/3/library/asyncio.html), [asyncio: coroutines and tasks](https://docs.python.org/3/library/asyncio-task.html), [asyncio.Semaphore](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore).

---

<a id="slide-39"></a>
## 39. Choosing a concurrency model, and keeping it bounded

*Concurrency · a decision table and four bounding patterns*

| Situation | Use | Why |
|---|---|---|
| A handful of slow steps that depend on each other | Nothing: run them in order | Concurrency only helps independent work |
| Download or copy many files; call a sync SDK many times | `ThreadPoolExecutor(8–32)` | I/O-bound; sync libraries; simple |
| Thousands of HTTP calls with an async client | `asyncio` + `Semaphore` | Cheap waits, fine-grained bounds |
| Parse or transform many large files in Python | `ProcessPoolExecutor(cores)`, one task per file | CPU-bound; sidesteps the GIL |
| Aggregate or join large data | DuckDB / Spark / a warehouse | Native, parallel, memory-managed engines |
| Calls to a rate-limited API | Bounded threads or asyncio + a rate limiter | The API, not your CPU, is the limit |

#### Four ways to bound work

| Pattern | Bounds |
|---|---|
| Pool size (`max_workers`) | how many tasks *run* at once |
| Bounded submission (keep at most K futures pending) | how many tasks are *queued* in memory: `pool.map` over a huge generator submits everything immediately |
| `asyncio.Semaphore(k)` / `threading.BoundedSemaphore(k)` | how many tasks enter a critical section |
| `queue.Queue(maxsize=k)` between producer and workers | how far a fast producer can run ahead (back-pressure) |

#### Bounded submission, in code

```python
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from itertools import islice
import time

def work(i):
    time.sleep(0.01)
    return i

def run_bounded(items, workers=4, max_pending=8):
    items = iter(items)
    done_count = 0
    with ThreadPoolExecutor(workers) as pool:
        pending = {pool.submit(work, i) for i in islice(items, max_pending)}
        while pending:
            done, pending = wait(pending, return_when=FIRST_COMPLETED)
            done_count += sum(1 for f in done if f.result() is not None)
            for i in islice(items, len(done)):          # refill only as slots free up
                pending.add(pool.submit(work, i))
    return done_count

print(run_bounded(range(100)))      # never more than 8 futures exist at once
```

Output:

```text
100
```

> **On the job:** A job that submits 2 million tasks at once can run out of memory before the first one finishes, or flood an API. Bounded submission plus a fixed pool keeps memory and load flat; exercise 9 practises it.

> **The main idea:** pick the model by the bottleneck (I/O, CPU, or engine), then bound everything: workers, pending tasks, and calls per second. Unbounded concurrency is the most common way concurrent jobs fail.

*Read more:* [concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html), [asyncio](https://docs.python.org/3/library/asyncio.html), [queue](https://docs.python.org/3/library/queue.html).

---

<a id="slide-40"></a>
## 40. Project: a streaming JSONL → DuckDB loader

*Project · requirements and design*

Put the deck together in one realistic script. It loads the raw event files into a DuckDB `events` table and must behave well when the data, or the script itself, goes wrong.

| Requirement | How the design meets it | Lessons |
|---|---|---|
| Files of any size | Stream lines from `.jsonl` or `.jsonl.gz` with generators; memory bounded by the batch size | 7, 11, 13–18 |
| Malformed records don’t stop the load | Per-line validation; rejects go to `data/rejects/<file>.rejects.jsonl` with line number, reason, and the raw text | 9, 10, 15 |
| But a mostly-broken file does | `--max-reject-rate`: above it, the file fails | — |
| Exact values | Amounts parsed with `parse_float=Decimal`, stored as `DECIMAL(18,2)`; timestamps converted to UTC | 9, 19, 21 |
| All or nothing per file | One transaction per file: DELETE previous rows for the file, insert all batches, COMMIT; any error rolls back | 24, 27 |
| Safe to re-run | Delete-then-insert by `source_file`; redeliveries inside a file are counted and skipped | 26 |
| Fast enough | Each batch is staged as a JSONL file and bulk-inserted with `read_json`, not `executemany` | 17, 25 |
| Nothing left behind | Staging folder removed in `finally`; rejects file published atomically only after commit | 12, 27 |
| Observable | Logging per file, a `load_log` row for every attempt, exit code 1 if any file failed | 29, 31 |
| Configurable | argparse with environment-variable defaults | 30, 31 |

1. **discover()** (sorted list of input files): Folders are expanded; missing paths fail fast.
2. **read_lines()** (generator of (line_no, text)): gzip or plain; blank lines skipped.
3. **validate()** (clean row or Reject): All rules; the reason is collected for the reject file.
4. **batched()** (tuples of ≤ batch_size rows): Lazy: only one batch in memory.
5. **stage + INSERT … read_json** (bulk insert per batch): Inside the file’s transaction.
6. **commit, publish rejects, log** (or rollback and log the failure): load_log row + exit code.

> **On the job:** This is a scaled-down version of a real landing-to-Bronze/Silver loader. In an interview, being able to explain the transaction boundary, the idempotency rule, where rejects go, and how memory stays bounded is worth more than the code itself.

> **The main idea:** state the guarantees first (bounded memory, quarantine, all-or-nothing per file, idempotent, observable), then pick one mechanism per guarantee.

---

<a id="slide-41"></a>
## 41. Project: the loader code

*Project · read it top to bottom; every part maps to a lesson*

About 250 lines, standard library plus `duckdb`. Python 3.12+ because of `itertools.batched`; on 3.11, paste the `batches()` helper from lesson 17. The `--crash-after-batches` option is a hidden demo switch used on slide 43 to simulate a crash.

<details><summary>Show load_events.py</summary>

```python
# load_events.py
"""load_events.py: stream JSONL(.gz) event files into DuckDB, one transaction per file."""
from __future__ import annotations

import argparse
import gzip
import json
import logging
import os
import shutil
import sys
import tempfile
import time
import tracemalloc
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from itertools import batched
from pathlib import Path
from typing import Iterator

import duckdb

log = logging.getLogger("load_events")

ALLOWED_TYPES = frozenset({"page_view", "add_to_cart", "purchase"})
MONEY_TYPES = frozenset({"add_to_cart", "purchase"})
CENT = Decimal("0.01")

DDL = """
CREATE TABLE IF NOT EXISTS events (
    event_id    VARCHAR PRIMARY KEY,
    user_id     VARCHAR NOT NULL,
    event_type  VARCHAR NOT NULL,
    ts_utc      TIMESTAMP NOT NULL,          -- UTC, stored without a zone
    amount      DECIMAL(18, 2),
    source_file VARCHAR NOT NULL,
    line_no     INTEGER NOT NULL,
    load_id     VARCHAR NOT NULL
);
CREATE TABLE IF NOT EXISTS load_log (
    load_id      VARCHAR,
    source_file  VARCHAR,
    started_at   TIMESTAMP,
    finished_at  TIMESTAMP,
    status       VARCHAR,
    rows_read    INTEGER,
    rows_loaded  INTEGER,
    rows_rejected INTEGER,
    duplicates   INTEGER,
    message      VARCHAR
);
"""

INSERT_FROM_STAGING = """
INSERT INTO events
SELECT event_id, user_id, event_type, CAST(ts_utc AS TIMESTAMP), CAST(amount AS DECIMAL(18, 2)),
       source_file, line_no, load_id
FROM read_json(?, format = 'newline_delimited', columns = {
    event_id: 'VARCHAR', user_id: 'VARCHAR', event_type: 'VARCHAR', ts_utc: 'VARCHAR',
    amount: 'VARCHAR', source_file: 'VARCHAR', line_no: 'INTEGER', load_id: 'VARCHAR'})
"""


# ---------------------------------------------------------------- configuration
@dataclass(frozen=True)
class Config:
    inputs: list[Path]
    db_path: Path
    rejects_dir: Path
    batch_size: int
    max_reject_rate: float
    crash_after_batches: int | None      # demo only: simulate a crash mid-file
    measure_memory: bool


def parse_args(argv: list[str] | None) -> Config:
    p = argparse.ArgumentParser(description="Load JSONL event files into DuckDB.")
    p.add_argument("inputs", nargs="+", type=Path, help="files or folders (*.jsonl, *.jsonl.gz)")
    p.add_argument("--db", type=Path, default=Path(os.environ.get("EVLOAD_DB", "warehouse.duckdb")))
    p.add_argument("--rejects-dir", type=Path, default=Path("data/rejects"))
    p.add_argument("--batch-size", type=int, default=int(os.environ.get("EVLOAD_BATCH_SIZE", "5000")))
    p.add_argument("--max-reject-rate", type=float, default=0.5,
                   help="fail the file if more than this share of records is rejected")
    p.add_argument("--crash-after-batches", type=int, default=None, help=argparse.SUPPRESS)
    p.add_argument("--measure-memory", action="store_true")
    p.add_argument("-v", "--verbose", action="store_true")
    a = p.parse_args(argv)
    if a.batch_size < 1:
        p.error("--batch-size must be >= 1")             # exits with code 2
    logging.basicConfig(level=logging.DEBUG if a.verbose else logging.INFO,
                        format="%(levelname)-7s %(message)s", stream=sys.stderr)
    return Config(a.inputs, a.db, a.rejects_dir, a.batch_size, a.max_reject_rate,
                  a.crash_after_batches, a.measure_memory)


def discover(inputs: list[Path]) -> list[Path]:
    files: list[Path] = []
    for item in inputs:
        if item.is_dir():
            files += [p for p in item.iterdir() if p.name.endswith((".jsonl", ".jsonl.gz"))]
        elif item.is_file():
            files.append(item)
        else:
            raise FileNotFoundError(item)
    return sorted(files)


# ---------------------------------------------------------------- reading and validation
def read_lines(path: Path) -> Iterator[tuple[int, str]]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if line.strip():
                yield line_no, line.rstrip("\n")


class Reject(Exception):
    pass


def validate(text: str) -> dict:
    """Return a clean row (all values JSON-serialisable strings) or raise Reject."""
    try:
        raw = json.loads(text, parse_float=Decimal)
    except json.JSONDecodeError as e:
        raise Reject(f"invalid JSON: {e.msg}") from None
    if not isinstance(raw, dict):
        raise Reject(f"expected an object, got {type(raw).__name__}")
    errors = []
    event_id = str(raw.get("event_id") or "").strip()
    if not event_id:
        errors.append("event_id is required")
    user_id = str(raw.get("user_id") or "").strip().lower()
    if not user_id:
        errors.append("user_id is required")
    event_type = str(raw.get("event_type") or "").strip().lower()
    if event_type not in ALLOWED_TYPES:
        errors.append(f"event_type {raw.get('event_type')!r} not allowed")
    ts_utc = None
    try:
        ts = datetime.fromisoformat(str(raw.get("ts") or ""))
        if ts.tzinfo is None:
            errors.append("ts has no UTC offset")
        else:
            ts_utc = ts.astimezone(timezone.utc).replace(tzinfo=None).isoformat()
    except ValueError:
        errors.append(f"ts {raw.get('ts')!r} is not ISO 8601")
    amount = raw.get("amount")
    if amount is None or str(amount).strip() == "":
        amount = None
    else:
        try:
            amount = Decimal(str(amount).strip())
            if not amount.is_finite() or amount < 0:
                errors.append(f"amount {raw.get('amount')!r} must be a number >= 0")
            amount = str(amount.quantize(CENT))
        except InvalidOperation:
            errors.append(f"amount {raw.get('amount')!r} is not a number")
    if event_type in MONEY_TYPES and amount is None:
        errors.append(f"amount is required for {event_type}")
    if event_type == "page_view" and amount is not None:
        errors.append("page_view must not have an amount")
    if errors:
        raise Reject("; ".join(errors))
    return {"event_id": event_id, "user_id": user_id, "event_type": event_type,
            "ts_utc": ts_utc, "amount": amount}


# ---------------------------------------------------------------- helpers
@contextmanager
def transaction(con: duckdb.DuckDBPyConnection):
    con.begin()
    try:
        yield
    except BaseException:
        con.rollback()
        raise
    else:
        con.commit()


@contextmanager
def staging_dir(root: Path):
    """A private folder for batch files, always removed afterwards."""
    root.mkdir(parents=True, exist_ok=True)
    path = Path(tempfile.mkdtemp(prefix="stage_", dir=root))
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------- the load
@dataclass
class FileResult:
    status: str = "running"
    read: int = 0
    loaded: int = 0
    rejected: int = 0
    duplicates: int = 0
    message: str = ""


def load_file(con, path: Path, cfg: Config, load_id: str) -> FileResult:
    res = FileResult()
    source = path.name
    rejects_final = cfg.rejects_dir / f"{source}.rejects.jsonl"
    rejects_tmp = rejects_final.with_name(rejects_final.name + ".tmp")
    cfg.rejects_dir.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()

    def clean_rows(rej_file):
        for line_no, text in read_lines(path):
            res.read += 1
            try:
                row = validate(text)
            except Reject as e:
                res.rejected += 1
                rej_file.write(json.dumps({"source_file": source, "line_no": line_no,
                                           "reason": str(e), "raw": text}, ensure_ascii=False) + "\n")
                continue
            if row["event_id"] in seen:                       # redelivery inside this file: keep the first
                res.duplicates += 1
                continue
            seen.add(row["event_id"])
            yield {**row, "source_file": source, "line_no": line_no, "load_id": load_id}

    try:
        with open(rejects_tmp, "w", encoding="utf-8") as rej_file, \
             staging_dir(cfg.db_path.parent / "_staging") as stage, \
             transaction(con):
            con.execute("DELETE FROM events WHERE source_file = ?", [source])      # idempotent re-run
            for batch_no, batch in enumerate(batched(clean_rows(rej_file), cfg.batch_size), start=1):
                if cfg.crash_after_batches is not None and batch_no > cfg.crash_after_batches:
                    raise RuntimeError(f"simulated crash before batch {batch_no}")
                staged = stage / f"batch_{batch_no:05d}.jsonl"
                with open(staged, "w", encoding="utf-8") as f:
                    for row in batch:
                        f.write(json.dumps(row) + "\n")
                con.execute(INSERT_FROM_STAGING, [str(staged)])
                staged.unlink()
                res.loaded += len(batch)
                log.debug("%s: batch %d inserted (%d rows, %d so far)", source, batch_no, len(batch), res.loaded)
            if res.read and res.rejected / res.read > cfg.max_reject_rate:
                raise RuntimeError(f"reject rate {res.rejected / res.read:.0%} exceeds {cfg.max_reject_rate:.0%}")
        os.replace(rejects_tmp, rejects_final)                # publish rejects only after commit
        if res.rejected == 0:
            rejects_final.unlink()
        res.status = "succeeded"
    except Exception as e:                                     # the transaction already rolled back
        Path(rejects_tmp).unlink(missing_ok=True)
        res.status, res.message, res.loaded = "failed", f"{type(e).__name__}: {str(e).splitlines()[0]}", 0
    return res


def main(argv: list[str] | None = None) -> int:
    cfg = parse_args(argv)
    if cfg.measure_memory:
        tracemalloc.start()
    try:
        files = discover(cfg.inputs)
    except FileNotFoundError as e:
        log.error("input not found: %s", e)
        return 1
    cfg.db_path.parent.mkdir(parents=True, exist_ok=True)
    failed = 0
    with duckdb.connect(str(cfg.db_path)) as con:
        con.execute(DDL)
        for path in files:
            load_id = f"{path.name}@{utc_now():%Y%m%dT%H%M%S%f}"
            started, t0 = utc_now(), time.perf_counter()
            res = load_file(con, path, cfg, load_id)
            con.execute("INSERT INTO load_log VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [load_id, path.name, started, utc_now(), res.status, res.read,
                         res.loaded, res.rejected, res.duplicates, res.message])
            if res.status == "succeeded":
                log.info("%s: loaded=%d rejected=%d duplicates=%d read=%d (%.2fs)",
                         path.name, res.loaded, res.rejected, res.duplicates, res.read, time.perf_counter() - t0)
            else:
                failed += 1
                log.error("%s: FAILED, rolled back (%s)", path.name, res.message)
    if cfg.measure_memory:
        _, peak = tracemalloc.get_traced_memory()
        log.info("peak traced Python memory: %.1f MiB", peak / 1_048_576)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
```

Output:

```text
$ python load_events.py --help
usage: load_events.py [-h] [--db DB] [--rejects-dir REJECTS_DIR]
                      [--batch-size BATCH_SIZE]
                      [--max-reject-rate MAX_REJECT_RATE] [--measure-memory]
                      [-v]
                      inputs [inputs ...]

Load JSONL event files into DuckDB.

positional arguments:
  inputs                files or folders (*.jsonl, *.jsonl.gz)

options:
  -h, --help            show this help message and exit
  --db DB
  --rejects-dir REJECTS_DIR
  --batch-size BATCH_SIZE
  --max-reject-rate MAX_REJECT_RATE
                        fail the file if more than this share of records is
                        rejected
  --measure-memory
  -v, --verbose
```

</details>

#### Where to look

| Function | Responsibility |
|---|---|
| `parse_args` | CLI + environment defaults → frozen `Config`; bad arguments exit 2 |
| `read_lines` | generator over plain or gzip text, with line numbers |
| `validate` | pure function: JSON text → clean dict or `Reject` with all reasons |
| `transaction`, `staging_dir` | context managers: commit/rollback; temp folder always removed |
| `load_file` | one file: stream → dedupe → batch → stage → insert, inside one transaction; rejects published after commit |
| `main` | discover files, open DuckDB, load each file, write `load_log`, return the exit code |

#### Design notes

- `validate` is pure and has no I/O, so it is easy to unit-test (lesson 33).
- Rejects are written as the stream is read (no list of rejects in memory) to a `.tmp` file that becomes visible only after the commit.
- The `seen` set grows with the number of unique IDs in one file: fine for millions of IDs, not billions. At that scale, deduplicate in the database instead.
- `load_log` is written *after* the transaction, so failed attempts are recorded too.
- Timestamps are stored as UTC in a `TIMESTAMP` column; DuckDB’s `TIMESTAMPTZ` would need `pytz` to fetch into Python (lesson 25).

> **The main idea:** each function has one job and maps to one lesson; the guarantees come from how they are combined: generators inside a transaction inside context managers.

---

<a id="slide-42"></a>
## 42. Project: first run, malformed records, and the reject file

*Project · load two days of data*

Output:

```text
$ python load_events.py data/raw/events_2026-03-02.jsonl data/raw/events_2026-03-03.jsonl.gz --db data/out/warehouse.duckdb -v
DEBUG   events_2026-03-02.jsonl: batch 1 inserted (6 rows, 6 so far)
INFO    events_2026-03-02.jsonl: loaded=6 rejected=4 duplicates=1 read=11 (0.04s)
DEBUG   events_2026-03-03.jsonl.gz: batch 1 inserted (3 rows, 3 so far)
INFO    events_2026-03-03.jsonl.gz: loaded=3 rejected=1 duplicates=0 read=4 (0.03s)
```

```python
# inspect_db.py
"""inspect_db.py: look at what the loader wrote."""
import sys
import duckdb

with duckdb.connect(sys.argv[1], read_only=True) as con:
    print(con.execute("SELECT count(*) AS rows, count(DISTINCT source_file) AS files, sum(amount) AS revenue FROM events").fetchone())
    for row in con.execute("""SELECT event_id, user_id, event_type, strftime(ts_utc, '%Y-%m-%d %H:%M') AS ts_utc, amount, source_file, line_no
                              FROM events ORDER BY ts_utc, event_id LIMIT 12""").fetchall():
        print(row)
    print("load_log:")
    for row in con.execute("""SELECT source_file, status, rows_read, rows_loaded, rows_rejected, duplicates, message
                              FROM load_log ORDER BY started_at""").fetchall():
        print(" ", row)
```

Output:

```text
$ python inspect_db.py data/out/warehouse.duckdb
(9, 2, Decimal('188.00'))
('e1', 'u1', 'page_view', '2026-03-02 09:00', None, 'events_2026-03-02.jsonl', 1)
('e2', 'u1', 'add_to_cart', '2026-03-02 09:01', Decimal('40.00'), 'events_2026-03-02.jsonl', 2)
('e3', 'u1', 'purchase', '2026-03-02 09:03', Decimal('64.00'), 'events_2026-03-02.jsonl', 3)
('e4', 'u2', 'page_view', '2026-03-02 09:15', None, 'events_2026-03-02.jsonl', 5)
('e5', 'u2', 'purchase', '2026-03-02 09:20', Decimal('25.00'), 'events_2026-03-02.jsonl', 6)
('e9', 'u4', 'purchase', '2026-03-02 12:30', Decimal('12.50'), 'events_2026-03-02.jsonl', 10)
('e10', 'u5', 'page_view', '2026-03-03 13:59', None, 'events_2026-03-03.jsonl.gz', 1)
('e11', 'u5', 'purchase', '2026-03-03 14:00', Decimal('7.50'), 'events_2026-03-03.jsonl.gz', 2)
('e13', 'u2', 'purchase', '2026-03-04 07:30', Decimal('39.00'), 'events_2026-03-03.jsonl.gz', 4)
load_log:
  ('events_2026-03-02.jsonl', 'succeeded', 11, 6, 4, 1, '')
  ('events_2026-03-03.jsonl.gz', 'succeeded', 4, 3, 1, 0, '')
```

```python
from pathlib import Path
for p in sorted(Path("data/rejects").glob("*.rejects.jsonl")):
    print("==", p.name)
    print(p.read_text(encoding="utf-8"), end="")
```

Output:

```text
== events_2026-03-02.jsonl.rejects.jsonl
{"source_file": "events_2026-03-02.jsonl", "line_no": 7, "reason": "user_id is required", "raw": "{\"event_id\":\"e6\",\"user_id\":null,\"event_type\":\"purchase\",\"ts\":\"2026-03-02T11:00:00Z\",\"amount\":\"18.00\"}"}
{"source_file": "events_2026-03-02.jsonl", "line_no": 8, "reason": "invalid JSON: Expecting ',' delimiter", "raw": "{\"event_id\":\"e7\",\"user_id\":\"u3\",\"event_type\":\"purchase\""}
{"source_file": "events_2026-03-02.jsonl", "line_no": 9, "reason": "amount 'abc' is not a number", "raw": "{\"event_id\":\"e8\",\"user_id\":\"u3\",\"event_type\":\"purchase\",\"ts\":\"2026-03-02T12:00:00Z\",\"amount\":\"abc\"}"}
{"source_file": "events_2026-03-02.jsonl", "line_no": 11, "reason": "expected an object, got list", "raw": "[1, 2, 3]"}
== events_2026-03-03.jsonl.gz.rejects.jsonl
{"source_file": "events_2026-03-03.jsonl.gz", "line_no": 3, "reason": "event_type 'refund' not allowed", "raw": "{\"event_id\":\"e12\",\"user_id\":\"u1\",\"event_type\":\"refund\",\"ts\":\"2026-03-03T09:00:00Z\",\"amount\":\"5.00\"}"}
```

#### Check the numbers

- Day 1: 11 non-blank lines → 6 loaded, 4 rejected (truncated JSON, a JSON array, missing user, bad amount), 1 duplicate (the redelivered e3).
- Day 2 (gzip): 4 lines → 3 loaded, 1 rejected (the `refund` type is not in the allowed list).
- e4’s 10:15+01:00 became 09:15 UTC; e13’s 23:30−08:00 on 3 March became 07:30 UTC on **4 March**.
- e5’s JSON number `25` and e11’s `7.5` were stored as exact decimals 25.00 and 7.50.
- Revenue = 40.00 + 64.00 + 25.00 + 12.50 + 7.50 + 39.00 = 188.00.

#### The reject file is a work queue

Each reject keeps the file, line number, every reason, and the raw text. Someone can fix the source, or a later job can re-process the fixed lines. Rejects are data, not just log messages: they can be counted, alerted on, and trended over time.

> **On the job:** In production the reject location is usually a `rejects/` or `quarantine/` folder in the lake, or a dead-letter table, with an alert when the reject rate jumps. Business owners of the source get a daily report from it.

> **The main idea:** every input line ends up in exactly one place: the table, the reject file, or the duplicate count. The numbers add up, and the reasons are kept.

---

<a id="slide-43"></a>
## 43. Project: failures, rollback, cleanup, and re-runs

*Project · prove the guarantees*

**1 · A constraint violation.** The late file for 4 March contains e14 (new) and e5, which was already loaded from day 1. The primary key rejects e5, so the whole file must roll back: no e14 either.

Output:

```text
$ python load_events.py data/raw/events_2026-03-04.jsonl --db data/out/warehouse.duckdb
ERROR   events_2026-03-04.jsonl: FAILED, rolled back (ConstraintException: Constraint Error: Duplicate key "event_id: e5" violates primary key constraint.)
[exit code 1]
```

**2 · A crash halfway through a big file.** Load the 200,000-event file with 20,000-row batches, simulating a crash before batch 4 (after 60,000 rows were inserted inside the transaction).

Output:

```text
$ python load_events.py data/big/events_big.jsonl.gz --db data/out/warehouse.duckdb --batch-size 20000 --crash-after-batches 3 -v
DEBUG   events_big.jsonl.gz: batch 1 inserted (20000 rows, 20000 so far)
DEBUG   events_big.jsonl.gz: batch 2 inserted (20000 rows, 40000 so far)
DEBUG   events_big.jsonl.gz: batch 3 inserted (20000 rows, 60000 so far)
ERROR   events_big.jsonl.gz: FAILED, rolled back (RuntimeError: simulated crash before batch 4)
[exit code 1]
```

**3 · Re-run day 1 (idempotency).** Running the same file again must not create duplicates.

Output:

```text
$ python load_events.py data/raw/events_2026-03-02.jsonl --db data/out/warehouse.duckdb
INFO    events_2026-03-02.jsonl: loaded=6 rejected=4 duplicates=1 read=11 (0.05s)
```

Output:

```text
$ python inspect_db.py data/out/warehouse.duckdb
(9, 2, Decimal('188.00'))
('e1', 'u1', 'page_view', '2026-03-02 09:00', None, 'events_2026-03-02.jsonl', 1)
('e2', 'u1', 'add_to_cart', '2026-03-02 09:01', Decimal('40.00'), 'events_2026-03-02.jsonl', 2)
('e3', 'u1', 'purchase', '2026-03-02 09:03', Decimal('64.00'), 'events_2026-03-02.jsonl', 3)
('e4', 'u2', 'page_view', '2026-03-02 09:15', None, 'events_2026-03-02.jsonl', 5)
('e5', 'u2', 'purchase', '2026-03-02 09:20', Decimal('25.00'), 'events_2026-03-02.jsonl', 6)
('e9', 'u4', 'purchase', '2026-03-02 12:30', Decimal('12.50'), 'events_2026-03-02.jsonl', 10)
('e10', 'u5', 'page_view', '2026-03-03 13:59', None, 'events_2026-03-03.jsonl.gz', 1)
('e11', 'u5', 'purchase', '2026-03-03 14:00', Decimal('7.50'), 'events_2026-03-03.jsonl.gz', 2)
('e13', 'u2', 'purchase', '2026-03-04 07:30', Decimal('39.00'), 'events_2026-03-03.jsonl.gz', 4)
load_log:
  ('events_2026-03-02.jsonl', 'succeeded', 11, 6, 4, 1, '')
  ('events_2026-03-03.jsonl.gz', 'succeeded', 4, 3, 1, 0, '')
  ('events_2026-03-04.jsonl', 'failed', 2, 0, 0, 0, 'ConstraintException: Constraint Error: Duplicate key "event_id: e5" violates primary key constraint.')
  ('events_big.jsonl.gz', 'failed', 80016, 0, 16, 0, 'RuntimeError: simulated crash before batch 4')
  ('events_2026-03-02.jsonl', 'succeeded', 11, 6, 4, 1, '')
```

```python
from pathlib import Path
print("staging leftovers:", sorted(p.name for p in Path("data/out/_staging").iterdir()))
print("reject files:", sorted(p.name for p in Path("data/rejects").iterdir()))
```

Output:

```text
staging leftovers: []
reject files: ['events_2026-03-02.jsonl.rejects.jsonl', 'events_2026-03-03.jsonl.gz.rejects.jsonl']
```

#### What was proven

- The table still has exactly 9 rows: neither e14 nor any of the 60,000 crashed rows remain. **Rollback works**.
- The load log records every attempt, including both failures with their reasons, which is enough to alert and retry.
- Re-running day 1 replaced its 6 rows instead of adding 6 more: **idempotent**.
- No staging files remain and no `.tmp` reject files were published for failed loads: **cleanup works** on both paths.
- Exit code 1 for failed runs: a scheduler would mark them red.

#### Fixing the late file

The conflict is a real business question: is the second e5 a correction or a duplicate from another feed? Options: (a) upsert (`INSERT … ON CONFLICT DO UPDATE`) if later files may correct earlier ones; (b) dedupe across files by keeping the first-loaded version and sending conflicts to rejects; (c) fail, as now, and let a person decide. Write the rule down; the code follows.

> **On the job:** “The load failed halfway; what state is the table in?” If the honest answer is “it depends”, the design is wrong. With a transaction per file plus a load log, the answer is always “exactly as before the run, and the log says why”.

> **The main idea:** test the failure paths, not just the happy path: constraint violations and crashes roll back completely, temp files disappear, the log records every attempt, and re-runs don’t duplicate.

---

<a id="slide-44"></a>
## 44. Project: measured memory and speed

*Project · peak memory = per-file state + one batch*

Run the loader on the 200,000-event file three times, each into a fresh database: with tracemalloc enabled (`--measure-memory`) and 1,000-row batches, then 20,000-row batches, then the small day-1 file for contrast; finally twice without tracemalloc to see the real speed of both batch sizes.

Output (measured on the build machine):

```text
$ python load_events.py data/big/events_big.jsonl.gz --db data/out/mem_b1000.duckdb --batch-size 1000 --measure-memory --max-reject-rate 0.01
INFO    events_big.jsonl.gz: loaded=199960 rejected=40 duplicates=0 read=200000 (15.66s)
INFO    peak traced Python memory: 20.4 MiB
```

Output (measured on the build machine):

```text
$ python load_events.py data/big/events_big.jsonl.gz --db data/out/mem_b20000.duckdb --batch-size 20000 --measure-memory --max-reject-rate 0.01
INFO    events_big.jsonl.gz: loaded=199960 rejected=40 duplicates=0 read=200000 (12.88s)
INFO    peak traced Python memory: 36.5 MiB
```

Output (measured on the build machine):

```text
$ python load_events.py data/raw/events_2026-03-02.jsonl --db data/out/mem_small.duckdb --measure-memory
INFO    events_2026-03-02.jsonl: loaded=6 rejected=4 duplicates=1 read=11 (0.05s)
INFO    peak traced Python memory: 0.2 MiB
```

Output (measured on the build machine):

```text
$ python load_events.py data/big/events_big.jsonl.gz --db data/out/speed_b1000.duckdb --batch-size 1000 --max-reject-rate 0.01
INFO    events_big.jsonl.gz: loaded=199960 rejected=40 duplicates=0 read=200000 (7.28s)
```

Output (measured on the build machine):

```text
$ python load_events.py data/big/events_big.jsonl.gz --db data/out/speed_b20000.duckdb --batch-size 20000 --max-reject-rate 0.01
INFO    events_big.jsonl.gz: loaded=199960 rejected=40 duplicates=0 read=200000 (4.44s)
```

#### Reading the numbers

- Peak traced memory is about 20 MiB with 1,000-row batches and about 37 MiB with 20,000-row batches; the difference is the bigger batch held in memory.
- Most of the 20 MiB base is the `seen` set: one string per unique event_id (200,000 here), the only state that grows with the file. A file 100× bigger would grow that set, but not the batch part. To remove it, deduplicate in the database instead (e.g. a staging table and `DISTINCT ON`).
- The small day-1 file peaks at a fraction of a MiB. Compare lesson 18: reading the big file into a list peaked around 155 MiB before any database work.
- Without tracemalloc, larger batches are faster (fewer statements and staging files): compare the last two runs. tracemalloc itself slows Python several-fold, so never quote traced timings as performance.
- tracemalloc sees Python objects only. DuckDB’s own buffers are extra; cap them with `SET memory_limit = '1GB'` if needed.

#### Stretch goals

- Process several files in parallel with one process per file and one DuckDB connection each, writing to separate staging tables, then merge (lessons 37, 39).
- Switch the conflict rule to an upsert and add a test proving that a correction file updates rows.
- Add a `--dry-run` that validates and writes rejects without touching the database.
- Package it with uv (lesson 32) as an `evload` command, with pytest tests for `validate` and for a rollback.
- Export the loaded table to Parquet partitioned by day: `COPY events TO 'out' (FORMAT parquet, PARTITION_BY (day))`.

> **On the job:** Memory-bounded streaming is what lets the same script run on a laptop, in a small container, and in a Fabric Python notebook with a small node size, whatever the size of the day’s file.

> **The main idea:** bounded batches make peak memory a setting rather than a property of the input. Measure it, choose a batch size, and keep the per-file state (like the seen-set) in mind.

---

<a id="slide-45"></a>
## 45. Bug clinic: failures that hide in scripts

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | “CafÃ© Verde” in reports, or a job that fails only on some days | Wrong or default encoding | Explicit `encoding=`; `utf-8-sig` for Excel; strict errors | 6 |
| 2 | First CSV column named `\ufeffid`; KeyError on `"id"` | BOM not stripped | `encoding="utf-8-sig"` | 6, 8 |
| 3 | Rows split in two; extra blank rows on Windows | Hand-split CSV; missing `newline=""` | `csv` module with `newline=""` | 8 |
| 4 | Out of memory on a big file | `readlines()`, `json.load` of a huge array, `list(generator)`, `fetchall()` | Iterate lines, use JSONL, batch, `fetchmany` | 7, 13–18 |
| 5 | Second step finds no data | A generator or file consumed twice | Re-open, or materialise once if small | 13 |
| 6 | Half-written output read by the next job | Writing directly to the final path | Temp file + `os.replace`; success markers | 12 |
| 7 | Data disappears after the script ends (sqlite3) | No `commit()` | Commit, or `with con:` | 24 |
| 8 | Half a file in the table after a crash | Autocommit per statement; no transaction | One transaction per file; rollback on error | 24, 43 |
| 9 | Duplicates after a re-run | Append-only load | Delete-then-insert per unit, or upsert; load log | 26 |
| 10 | Query returns every row for a strange input | Values formatted into SQL | Placeholders; allowlist identifiers | 23 |
| 11 | Load of 200k rows takes 20 minutes | Row-by-row inserts into a columnar DB | Bulk load: native readers or staged files | 25 |
| 12 | An hour of events missing or doubled in March/November | Local times without offsets; DST | zoneinfo, detect gaps, documented fold rule, UTC storage | 20 |
| 13 | Totals off by cents | Float at a boundary (JSON, driver, pandas) | parse_float=Decimal; DECIMAL columns | 21 |
| 14 | Job shows green but data is missing | Errors logged but exit code 0; `except: pass` | Return non-zero; catch narrowly | 29, 31 |
| 15 | “Multithreaded” parser no faster | GIL on CPU-bound Python | Processes or a native engine | 35, 37 |
| 16 | Notebook hangs or the API bans you | Unbounded concurrency; blocking calls in asyncio | Bounded pools/semaphores; `to_thread` | 38, 39 |
| 17 | Works locally, fails in the scheduler | Relative paths, missing env vars, different packages | Paths from config; validated config at start-up; locked env | 5, 30, 32 |

> **On the job:** Many of these bugs leave no error at all: the job succeeds and the numbers are wrong. Reconciliation checks (row counts in vs out, totals vs source) and a load log catch them. Mention them whenever you describe a pipeline in an interview.

> **The main idea:** most script failures are about boundaries (encodings, time zones, decimals), state (consumed iterators, uncommitted or half-committed work), and scale (memory, row-by-row writes, unbounded concurrency).

---

<a id="slide-46"></a>
## 46. Exercises 1–5: files, streams, and time

*Exercises · CSV, JSONL, constant memory, groupby, DST*

Each exercise runs in the folder created by `make_sample_data.py` (lesson 3); some also use `make_big_file.py` (lesson 18). Tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Read an Excel CSV export safely

Write `read_orders(path)`, a *generator* that yields one dict per order from `data/raw/orders_export.csv` with keys `order_id, customer, city, amount, ordered_at_local`. Strip the BOM, keep embedded commas/quotes/newlines intact, convert `amount` to `Decimal` (remove thousands separators), and raise `ValueError` listing missing columns if the header is wrong.

```python
from decimal import Decimal
from pathlib import Path

def read_orders(path):
    ...

orders = list(read_orders("data/raw/orders_export.csv"))
assert [o["order_id"] for o in orders] == ["SO-5001", "SO-5002", "SO-5003", "SO-5004"]
assert orders[1]["customer"] == "Café Verde, LLC" and orders[1]["amount"] == Decimal("1250.50")
assert orders[2]["customer"] == 'Leo "The Plant" Kim'
assert "\n" in orders[3]["customer"]
Path("data/out/bad_header.csv").write_text("order_id,amount\nX,1\n", encoding="utf-8")
try:
    list(read_orders("data/out/bad_header.csv"))
except ValueError as e:
    assert "city" in str(e) and "customer" in str(e)
else:
    raise AssertionError("missing columns not detected")
```

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · A lazy JSONL splitter

Write a generator `split_jsonl(lines)` that takes an iterable of text lines and yields `("ok", line_no, obj)` or `("bad", line_no, reason)`, skipping blank lines. It must be **lazy**: it must work on an endless stream of lines.

```python
from itertools import count, islice

def split_jsonl(lines):
    ...

with open("data/raw/events_2026-03-02.jsonl", encoding="utf-8") as f:
    results = list(split_jsonl(f))
assert [kind for kind, _, _ in results].count("ok") == 9
assert [(n, r) for kind, n, r in results if kind == "bad"] == [(8, "invalid JSON"), (11, "not an object")]

endless = (f'{{"n": {i}}}' for i in count())                    # never ends
assert [obj["n"] for _, _, obj in islice(split_jsonl(endless), 3)] == [0, 1, 2]
```

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Constant-memory statistics from a big file

Using only a generator pipeline over `data/big/events_big.jsonl.gz`, compute (a) the number of events per type and (b) total purchase revenue per UTC day as `Decimal`. Skip malformed lines. Keep peak traced memory under 5 MiB, and check your answer against DuckDB.

```python
import tracemalloc, duckdb
from decimal import Decimal

def stats(path):
    ...   # return (Counter of event_type, {day: Decimal revenue})

tracemalloc.start()
types, revenue = stats("data/big/events_big.jsonl.gz")
peak = tracemalloc.get_traced_memory()[1]
tracemalloc.stop()
assert peak < 5 * 1_048_576, f"peak {peak / 1_048_576:.1f} MiB"
with duckdb.connect() as con:
    expected = dict(con.execute("""
        SELECT strftime(CAST(ts AS TIMESTAMPTZ) AT TIME ZONE 'UTC', '%Y-%m-%d'), sum(CAST(amount AS DECIMAL(18,2)))
        FROM read_json('data/big/events_big.jsonl.gz', format='newline_delimited', ignore_errors=true,
                       columns={ts: 'VARCHAR', event_type: 'VARCHAR', amount: 'VARCHAR'})
        WHERE event_type = 'purchase' GROUP BY 1""").fetchall())
assert revenue == expected and types["purchase"] == 19_971
```

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Sessions with groupby and pairwise

A **session** is a run of a user’s events with no gap longer than 30 minutes. Given events already **sorted by (user, ts)**, write `sessions(events)` returning `{user: number_of_sessions}` using `itertools.groupby` and `pairwise`, without sorting or building per-user lists.

```python
from datetime import datetime, timedelta

def sessions(events, gap=timedelta(minutes=30)):
    ...

t = lambda s: datetime.fromisoformat("2026-03-02T" + s)
events = [("u1", t("09:00")), ("u1", t("09:20")), ("u1", t("10:00")), ("u1", t("10:29")),
          ("u2", t("08:00")), ("u3", t("12:00")), ("u3", t("12:30")), ("u3", t("13:01"))]
assert sessions(events) == {"u1": 2, "u2": 1, "u3": 2}
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Local time to UTC with an explicit DST policy

Write `local_to_utc(text, zone="America/Chicago", *, ambiguous="earlier", nonexistent="raise")`. `ambiguous` is `"earlier"`, `"later"` or `"raise"`; `nonexistent` is `"raise"` or `"shift"` (move forward by the gap, as clocks do). Raise `ValueError` where the policy says so.

```python
from datetime import datetime, timezone

def local_to_utc(text, zone="America/Chicago", *, ambiguous="earlier", nonexistent="raise"):
    ...

u = lambda s: datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
assert local_to_utc("2026-03-02 09:03") == u("2026-03-02T15:03")
assert local_to_utc("2026-11-01 01:30") == u("2026-11-01T06:30")                       # first 01:30 (CDT)
assert local_to_utc("2026-11-01 01:30", ambiguous="later") == u("2026-11-01T07:30")    # second 01:30 (CST)
assert local_to_utc("2026-03-08 02:30", nonexistent="shift") == u("2026-03-08T08:30")  # = 03:30 CDT
for kwargs in ({"ambiguous": "raise", "text": "2026-11-01 01:30"}, {"text": "2026-03-08 02:30"}):
    text = kwargs.pop("text")
    try:
        local_to_utc(text, **kwargs)
    except ValueError:
        pass
    else:
        raise AssertionError(text)
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

> **The main idea:** read with the right encoding and module, stream instead of materialising, and turn silent time-zone choices into explicit policies.

---

<a id="slide-47"></a>
## 47. Exercises 6–10: databases, scripts, concurrency

*Exercises · SQL safety, context managers, decorators, bounded concurrency, idempotency*

Each exercise runs in the folder created by `make_sample_data.py` (lesson 3); some also use `make_big_file.py` (lesson 18). Tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 6 · A safe query function

Write `find_events(con, user_ids, event_types, order_by="ts_utc")` against the loader’s `events` table. It must use placeholders for every value (including variable-length IN lists), allow ordering only by `event_id`, `ts_utc`, or `amount`, and return a list of event IDs. Empty lists return `[]` without querying.

```python
import duckdb

def find_events(con, user_ids, event_types, order_by="ts_utc"):
    ...

con = duckdb.connect("data/out/warehouse.duckdb", read_only=True)
assert find_events(con, ["u1", "u2"], ["purchase"]) == ["e3", "e5", "e13"]
assert find_events(con, ["u1"], ["purchase", "add_to_cart"], order_by="amount") == ["e2", "e3"]
assert find_events(con, ["u1' OR '1'='1"], ["purchase"]) == []
assert find_events(con, [], ["purchase"]) == []
try:
    find_events(con, ["u1"], ["purchase"], order_by="amount; DROP TABLE events")
except ValueError:
    pass
else:
    raise AssertionError("order_by not validated")
con.close()
```

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · atomic_write as a context manager

Turn lesson 12 into `@contextmanager def atomic_write(path, encoding="utf-8")` so that `with atomic_write(p) as f: f.write(...)` replaces `p` only if the block finishes without an exception. On an exception the old file stays untouched, no temp file remains, and the exception propagates.

```python
from pathlib import Path

# define atomic_write here

p = Path("data/out/atomic_test.txt")
p.write_text("old\n", encoding="utf-8")
try:
    with atomic_write(p) as f:
        f.write("new partial\n")
        raise RuntimeError("boom")
except RuntimeError:
    pass
assert p.read_text(encoding="utf-8") == "old\n"
assert not list(p.parent.glob("atomic_test.txt.*.tmp"))
with atomic_write(p) as f:
    f.write("new\n")
assert p.read_text(encoding="utf-8") == "new\n"
```

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · A retry decorator for transient errors

Write `retry(times=3, on=(ConnectionError, TimeoutError), backoff=0.0, sleep=time.sleep)`, a decorator factory. It retries only the listed exceptions, up to `times` attempts in total, waiting `backoff * 2**(attempt-1)` seconds between attempts (via the injectable `sleep`, so tests don’t wait). Other exceptions propagate immediately. Keep the wrapped function’s name.

```python
import time

def retry(times=3, on=(ConnectionError, TimeoutError), backoff=0.0, sleep=time.sleep):
    ...

waits = []
calls = {"n": 0}
@retry(times=4, backoff=0.5, sleep=waits.append)
def flaky():
    calls["n"] += 1
    if calls["n"] < 3:
        raise TimeoutError("slow share")
    return "ok"
assert flaky() == "ok" and calls["n"] == 3 and waits == [0.5, 1.0] and flaky.__name__ == "flaky"

@retry(times=5, sleep=waits.append)
def broken():
    calls["n"] += 1
    raise ValueError("bad data")          # not transient: no retry
calls["n"] = 0
try:
    broken()
except ValueError:
    assert calls["n"] == 1
@retry(times=2, sleep=lambda s: None)
def always_down():
    raise ConnectionError("down")
try:
    always_down()
except ConnectionError:
    pass
else:
    raise AssertionError("should re-raise after the last attempt")
```

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Bounded concurrent downloads

Write `fetch_all(ids, fetch, max_in_flight=4)` that calls `fetch(id)` concurrently with at most `max_in_flight` calls running at once, and returns `(results, errors)`: `results` in the same order as `ids` (failed IDs omitted), `errors` a dict `{id: message}`. It should be much faster than serial for I/O-bound `fetch`.

```python
import threading, time

def fetch_all(ids, fetch, max_in_flight=4):
    ...

state = {"now": 0, "max": 0}
lock = threading.Lock()
def fake_fetch(i):
    with lock:
        state["now"] += 1
        state["max"] = max(state["max"], state["now"])
    try:
        time.sleep(0.05)
        if i % 7 == 3:
            raise ConnectionError(f"id {i}: reset")
        return i * 10
    finally:
        with lock:
            state["now"] -= 1

t0 = time.perf_counter()
results, errors = fetch_all(range(20), fake_fetch, max_in_flight=4)
elapsed = time.perf_counter() - t0
assert state["max"] == 4
assert sorted(errors) == [3, 10, 17]
assert results == [i * 10 for i in range(20) if i % 7 != 3]
assert elapsed < 20 * 0.05 * 0.5, elapsed
```

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Prove a loader is idempotent and atomic

Write `load_rows(con, source, rows)` for a DuckDB table `events(event_id VARCHAR PRIMARY KEY, amount DECIMAL(18,2), source VARCHAR)`: delete the source’s previous rows and insert the new ones in **one transaction**, returning the number inserted. Then make the tests pass: a re-run doesn’t duplicate, and a failing load leaves the table exactly as before.

```python
import duckdb
from decimal import Decimal

def load_rows(con, source, rows):
    ...

con = duckdb.connect()
con.execute("CREATE TABLE events (event_id VARCHAR PRIMARY KEY, amount DECIMAL(18,2), source VARCHAR)")
snapshot = lambda: con.execute("SELECT event_id, amount, source FROM events ORDER BY event_id").fetchall()

assert load_rows(con, "day1", [("e1", "10.00"), ("e2", "5.00")]) == 2
first = snapshot()
assert load_rows(con, "day1", [("e1", "10.00"), ("e2", "5.00")]) == 2
assert snapshot() == first                                             # idempotent
assert load_rows(con, "day1", [("e1", "12.00")]) == 1                  # corrected file replaces the old rows
assert snapshot() == [("e1", Decimal("12.00"), "day1")]
before = snapshot()
try:
    load_rows(con, "day2", [("e3", "1.00"), ("e1", "2.00")])           # e1 belongs to day1
except duckdb.ConstraintException:
    pass
else:
    raise AssertionError("expected a constraint violation")
assert snapshot() == before                                            # atomic: no e3
con.close()
```

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** every guarantee you claim (safe SQL, atomic files, retries only when safe, bounded concurrency, idempotent loads) should come with a small test that proves it.

---

<a id="slide-48"></a>
## 48. Cheat sheet

*Reference · the deck on one page*

#### Files

| Need | Write |
|---|---|
| join paths | `Path("data") / "raw" / name` |
| find files, stable order | `sorted(p.glob("*.jsonl*"))` |
| make folders | `p.mkdir(parents=True, exist_ok=True)` |
| read text | `open(p, encoding="utf-8")`; Excel: `"utf-8-sig"` |
| stream lines | `for line in f:` (never `readlines()` on big files) |
| CSV | `csv.DictReader(open(p, encoding=…, newline=""))` |
| JSON money | `json.loads(s, parse_float=Decimal)` |
| JSON custom types | `json.dumps(obj, default=fn)` |
| JSONL write | `f.write(json.dumps(obj) + "\n")` |
| gzip text | `gzip.open(p, "rt", encoding="utf-8")` |
| atomic output | temp file in same dir → `os.replace(tmp, final)` |

#### Streams

| Need | Write |
|---|---|
| lazy stage | `def stage(items): for x in items: yield f(x)` |
| delegate | `yield from inner` |
| first N | `itertools.islice(it, n)` |
| concatenate | `chain.from_iterable(iters)` |
| group (sorted input) | `groupby(it, key=…)` |
| neighbours | `pairwise(it)` |
| merge sorted streams | `heapq.merge(a, b)` |
| batches | `itertools.batched(it, n)` (3.12+) |
| peak memory | `tracemalloc.start()` … `get_traced_memory()` |

#### Edges and databases

| Need | Write |
|---|---|
| now, UTC | `datetime.now(timezone.utc)` |
| epoch ms → datetime | `datetime.fromtimestamp(ms / 1000, tz=timezone.utc)` |
| local → UTC | `naive.replace(tzinfo=ZoneInfo("America/Chicago")).astimezone(timezone.utc)` |
| durations | `time.perf_counter()` |
| parameters | `con.execute("… WHERE id = ?", [x])` |
| IN list | `", ".join("?" for _ in xs)` + values as params |
| transaction | `con.begin()` … `commit()` / `rollback()` |
| DuckDB bulk load | `INSERT INTO t SELECT … FROM read_json(file, columns=…)` |
| Parquet export | `COPY t TO 'x.parquet' (FORMAT parquet)` |
| idempotent | DELETE unit + INSERT in one transaction, or upsert |

#### Scripts and concurrency

| Need | Write |
|---|---|
| cleanup | `with …:`; `@contextmanager`; `ExitStack` |
| wrap behaviour | decorator + `functools.wraps` |
| logger | `log = logging.getLogger(__name__)`; configure in main |
| config | validated frozen dataclass from env; CLI overrides |
| CLI | `argparse`; `sys.exit(main())`; 0 ok, 1 failed, 2 usage |
| project | `uv init --package`, `uv add`, `uv run`, commit `uv.lock` |
| lint | `uv run ruff check --fix`, `uv run ruff format`; rules in `[tool.ruff]` |
| tests | `pytest`, `tmp_path`, `parametrize`, `raises` |
| I/O-bound | `ThreadPoolExecutor(n)` or asyncio + `Semaphore` |
| CPU-bound | `ProcessPoolExecutor` under `__main__`, or a native engine |
| blocking call in async | `await asyncio.to_thread(fn)` |

> **The main idea:** explicit encodings, streams and batches, UTC and Decimal at the edges, parameters and transactions in the database, context managers for cleanup, exit codes for schedulers, and bounded concurrency chosen by the bottleneck.

---

<a id="slide-49"></a>
## 49. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Encoding / decoding | Rules mapping characters to bytes / bytes back to characters (UTF-8, cp1252) |
| BOM | Byte-order mark: 3 bytes some tools put at the start of UTF-8 files |
| Mojibake | Garbled text from decoding bytes with the wrong encoding |
| JSON Lines (JSONL, NDJSON) | One JSON value per line; streamable and appendable |
| Compression / codec | Storing data in fewer bytes / the algorithm used (gzip, zstd) |
| Splittable | A file format a parallel engine can read in independent chunks (gzip is not) |
| Atomic operation | Happens completely or not at all; nobody sees a partial state |
| Iterable / iterator | Can produce an iterator / walks items once with next() |
| Generator | An iterator produced by a function containing yield; lazy and single-pass |
| Lazy evaluation | Work happens only when a result is requested |
| Blocking step | A step that needs all input before producing output (sort, global dedupe) |
| Batch / bounded batch | A group of records handled together / with a maximum size |
| Peak memory | The highest memory use during a run; what causes out-of-memory errors |
| Epoch | Seconds (or ms) since 1970-01-01 00:00 UTC |
| Watermark | The highest timestamp or ID already processed in incremental loads |
| IANA time zone | A named zone with its DST history, e.g. America/Chicago |
| DST gap / overlap | Local times that don’t exist (spring) / occur twice (autumn); fold picks the occurrence |
| DB-API (PEP 249) | The standard Python interface for database drivers |
| Cursor | An object that executes statements and iterates results |
| Placeholder / parameterised query | A marker (?, %s) for a value sent separately from the SQL text |
| SQL injection | Untrusted text changing the meaning of a SQL statement |
| Transaction / commit / rollback | A unit of work / make permanent / undo |
| ACID | Atomic, consistent, isolated, durable |
| Autocommit | Each statement commits on its own (DuckDB default) |
| Embedded database | A database running inside your process (SQLite, DuckDB) |
| Idempotent | Running twice gives the same result as running once |
| Load log | A table recording every load attempt, its counts and status |
| Dead-letter / reject file | Where invalid records go, with reasons |
| Context manager | An object used with with; guarantees cleanup |
| Decorator | A function that wraps another function to add behaviour |
| Transient error | A temporary failure that may succeed on retry (timeout, reset) |
| Environment variable | A name=value setting passed to a process by the OS |
| Exit code | The number a process returns: 0 success, non-zero failure |
| Virtual environment | A private set of installed packages for one project |
| Lock file | Exact versions of every dependency, for reproducible installs (uv.lock) |
| Wheel | The pre-built installable Python package format (.whl) |
| Linter | A tool that reads code without running it and flags likely bugs and style problems (Ruff, flake8) |
| Formatter | A tool that rewrites code into one consistent layout (ruff format, black) |
| Entry point | A command a package installs, mapped to a function ([project.scripts]) |
| Fixture (pytest) | A test resource requested by parameter name, e.g. tmp_path |
| I/O-bound / CPU-bound | Time spent waiting / computing |
| Concurrency / parallelism | Tasks in progress together / literally simultaneous |
| GIL | Global Interpreter Lock: one thread runs Python bytecode at a time in standard CPython |
| Free-threaded build | An optional CPython build without the GIL (3.13 experimental, 3.14 supported) |
| Future | A handle to a result that will be available later |
| Pickling | Serialising Python objects to bytes, e.g. to send them to another process |
| Coroutine / event loop | An async def function / the scheduler that runs coroutines at each await |
| Semaphore | A counter limiting how many tasks enter a section at once |
| Back-pressure | Slowing a fast producer so a slower consumer isn’t overwhelmed |

---

<a id="slide-50"></a>
## 50. What to remember, and what comes next

*Reference · recap and the next decks*

1. **Bytes need an encoding.** Pass `encoding=` every time; `utf-8-sig` for Excel; fail loudly on bad bytes.
2. **Use the format’s module.** csv with `newline=""`, json with Decimal, JSONL line by line, gzip in text mode.
3. **Stream, then batch.** Generators keep memory flat; bounded batches turn memory into a setting; measure peaks with tracemalloc.
4. **Normalise at the edges.** Aware UTC datetimes, zoneinfo with explicit DST rules, Decimal from text.
5. **Databases: parameters, transactions, bulk.** Never format values into SQL; one transaction per unit; bulk-load columnar engines.
6. **Re-runs are normal.** Make loads idempotent and log every attempt.
7. **Scripts are products.** Context managers, logging, validated config, a CLI with exit codes, a locked environment, and tests.
8. **Concurrency follows the bottleneck.** Threads/asyncio for I/O, processes or engines for CPU, and always bounded.

#### Practise this week

- Re-type the loader from memory in smaller pieces: reader → validator → batch insert → transaction → load log.
- Do exercises 3, 5, 9 and 10 without the hints.
- Package the loader with uv and add three pytest tests (validate, rollback, idempotency).
- Point the loader at a real export you have access to (a few thousand rows) and read its reject file.

#### Coming up

Next in the Python track: DataFrames in the pandas & Polars deck (lesson *DataFrames: pandas & Polars*), then the reliable-ingestion deck (lesson *Ingestion engineering*): HTTP APIs with pagination, retries with jitter, rate limits, and Parquet output. Everything here carries over: streaming, batches, transactions, idempotency, and observability are the same ideas at larger scale.

> **The main idea:** a reliable data script streams its input, normalises values at the boundaries, writes atomically and idempotently, reports through logs and exit codes, and adds concurrency only where the bottleneck calls for it.

---

<a id="slide-51"></a>
## 51. References and how this deck was tested

*References · official documentation*

- [pathlib](https://docs.python.org/3/library/pathlib.html), [open()](https://docs.python.org/3/library/functions.html#open), [Unicode HOWTO](https://docs.python.org/3/howto/unicode.html), [standard encodings](https://docs.python.org/3/library/codecs.html#standard-encodings), [PEP 686](https://peps.python.org/pep-0686/).
- [csv](https://docs.python.org/3/library/csv.html), [json](https://docs.python.org/3/library/json.html), [JSON Lines](https://jsonlines.org/), [gzip](https://docs.python.org/3/library/gzip.html), [tempfile](https://docs.python.org/3/library/tempfile.html), [os.replace](https://docs.python.org/3/library/os.html#os.replace).
- [Iterator types](https://docs.python.org/3/library/stdtypes.html#iterator-types), [Functional programming HOWTO](https://docs.python.org/3/howto/functional.html), [itertools](https://docs.python.org/3/library/itertools.html), [tracemalloc](https://docs.python.org/3/library/tracemalloc.html).
- [datetime](https://docs.python.org/3/library/datetime.html), [zoneinfo](https://docs.python.org/3/library/zoneinfo.html), [PEP 495 (fold)](https://peps.python.org/pep-0495/), [decimal](https://docs.python.org/3/library/decimal.html).
- [PEP 249 DB-API](https://peps.python.org/pep-0249/), [sqlite3](https://docs.python.org/3/library/sqlite3.html), [OWASP query parameterization](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html).
- [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [loading JSON](https://duckdb.org/docs/stable/data/json/loading_json), [transactions](https://duckdb.org/docs/stable/sql/statements/transactions), [insert performance](https://duckdb.org/docs/stable/data/insert).
- [contextlib](https://docs.python.org/3/library/contextlib.html), [functools](https://docs.python.org/3/library/functools.html), [Logging HOWTO](https://docs.python.org/3/howto/logging.html), [argparse](https://docs.python.org/3/library/argparse.html), [Twelve-Factor config](https://12factor.net/config).
- [uv](https://docs.astral.sh/uv/), [Writing pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/), [Ruff](https://docs.astral.sh/ruff/), [pytest](https://docs.pytest.org/en/stable/).
- [concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html), [asyncio](https://docs.python.org/3/library/asyncio.html), [GIL](https://docs.python.org/3/glossary.html#term-global-interpreter-lock), [free threading](https://docs.python.org/3/howto/free-threading-python.html), [PEP 703](https://peps.python.org/pep-0703/).
- [Fabric Runtime 1.3](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-1-3) (Python 3.11) and [Fabric Runtime 2.0](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-2-0) (Python 3.13).

**Testing:** built with CPython 3.12.10, DuckDB 1.5.6, tzdata, pytest 9.1.1 and uv 0.12.23 in one virtual environment on Windows 11; Ruff 0.16.10 for the linting example. In-process examples ran inside the build; examples shown with `$ python …` ran as separate processes in a scratch folder created by `make_sample_data.py` and `make_big_file.py`; the uv commands were run in a scratch project and their output trimmed (personal paths and author details replaced). Every exercise solution ran with its tests. Timings and memory figures are labelled as measurements from the build machine.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Read an Excel CSV export safely

Open with `encoding="utf-8-sig", newline=""` and use `csv.DictReader`. Compare `set(EXPECTED) - set(reader.fieldnames)` before yielding anything. `Decimal(row["amount"].replace(",", ""))`. Because it’s a generator, the error is raised on the first `next()`, which is why the test wraps `list(...)`.

<a id="hint-2"></a>
### Hint 2 · A lazy JSONL splitter

Use `enumerate(lines, start=1)`; inside the loop, `continue` on blank lines; wrap `json.loads` in `try`/`except json.JSONDecodeError`; check `isinstance(obj, dict)`. Never call `list()` or `len()` on the input.

<a id="hint-3"></a>
### Hint 3 · Constant-memory statistics from a big file

Stream with `gzip.open(path, "rt", encoding="utf-8")` and a `for` loop; update a `Counter` and a `defaultdict(Decimal)`; never build a list. The day key is `datetime.fromisoformat(ts).astimezone(timezone.utc).date().isoformat()`.

<a id="hint-4"></a>
### Hint 4 · Sessions with groupby and pairwise

`for user, group in groupby(events, key=itemgetter(0))` gives one iterator per user. Inside, `1 + sum(1 for (_, a), (_, b) in pairwise(group) if b - a > gap)` counts the gaps that start a new session. A gap of exactly 30 minutes does *not* start a new session.

<a id="hint-5"></a>
### Hint 5 · Local time to UTC with an explicit DST policy

A time is **ambiguous** if `fold=0` and `fold=1` give different UTC results; it is **nonexistent** if converting to UTC and back doesn’t reproduce the input. With `fold=0`, Python already maps a gap time using the pre-transition offset, which lands at “shifted forward” (02:30 CST → 08:30 UTC = 03:30 CDT).

<a id="hint-6"></a>
### Hint 6 · A safe query function

Build `", ".join("?" * n)`-style placeholder lists for each IN clause and pass `[*user_ids, *event_types]` as parameters. Check `order_by` against a set before putting it into the SQL text. Add `event_id` as a tie-breaker for a deterministic order.

<a id="hint-7"></a>
### Hint 7 · atomic_write as a context manager

Create the temp file with `tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")`, wrap the descriptor with `os.fdopen`, and `yield` the file object inside `try`. After the yield: flush, fsync, close, `os.replace`. In `except BaseException`: close, delete the temp file, re-raise.

<a id="hint-8"></a>
### Hint 8 · A retry decorator for transient errors

Three levels of functions: `retry(...)` returns `decorator(func)`, which returns `wrapper(*args, **kwargs)` decorated with `functools.wraps(func)`. In the loop, `except on as e`: if it’s the last attempt, `raise`; otherwise `sleep(backoff * 2 ** (attempt - 1))`.

<a id="hint-9"></a>
### Hint 9 · Bounded concurrent downloads

`ThreadPoolExecutor(max_workers=max_in_flight)` already limits how many run at once. Submit each ID, keep `{future: id}`, collect with `as_completed`, put successes in a dict keyed by ID, then rebuild the list in input order. Catch exceptions per future.

<a id="hint-10"></a>
### Hint 10 · Prove a loader is idempotent and atomic

Use `con.begin()`, then `DELETE … WHERE source = ?` and the inserts (a few rows: `executemany` is fine), then `con.commit()`; in `except`, `con.rollback()` and re-raise. Or reuse the `transaction` context manager from lesson 27.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Read an Excel CSV export safely

```python
import csv
from decimal import Decimal
from pathlib import Path

EXPECTED = ("order_id", "customer", "city", "amount", "ordered_at_local")

def read_orders(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = sorted(set(EXPECTED) - set(reader.fieldnames or []))
        if missing:
            raise ValueError(f"{path}: missing columns {missing}")
        for row in reader:
            yield {**row, "amount": Decimal(row["amount"].replace(",", "").strip())}

orders = list(read_orders("data/raw/orders_export.csv"))
assert [o["order_id"] for o in orders] == ["SO-5001", "SO-5002", "SO-5003", "SO-5004"]
assert orders[1]["customer"] == "Café Verde, LLC" and orders[1]["amount"] == Decimal("1250.50")
assert orders[2]["customer"] == 'Leo "The Plant" Kim'
assert "\n" in orders[3]["customer"]
Path("data/out/bad_header.csv").write_text("order_id,amount\nX,1\n", encoding="utf-8")
try:
    list(read_orders("data/out/bad_header.csv"))
except ValueError as e:
    assert "city" in str(e) and "customer" in str(e)
    print(e)
else:
    raise AssertionError("missing columns not detected")
print("All tests passed")
```

Output:

```text
data/out/bad_header.csv: missing columns ['city', 'customer', 'ordered_at_local']
All tests passed
```

**Why it works.** `utf-8-sig` removes the BOM so the first header is `order_id`; `newline=""` lets `csv` handle the newline inside “Ana Ruiz”. Checking the header before the first row means a renamed column fails the whole file immediately instead of producing KeyErrors on every row. The amount conversion happens once, at the boundary (lesson 21).

<a id="solution-2"></a>
### Solution 2 · A lazy JSONL splitter

```python
import json
from itertools import count, islice

def split_jsonl(lines):
    for line_no, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            yield "bad", line_no, "invalid JSON"
            continue
        if isinstance(obj, dict):
            yield "ok", line_no, obj
        else:
            yield "bad", line_no, "not an object"

with open("data/raw/events_2026-03-02.jsonl", encoding="utf-8") as f:
    results = list(split_jsonl(f))
assert [kind for kind, _, _ in results].count("ok") == 9
assert [(n, r) for kind, n, r in results if kind == "bad"] == [(8, "invalid JSON"), (11, "not an object")]

endless = (f'{{"n": {i}}}' for i in count())
assert [obj["n"] for _, _, obj in islice(split_jsonl(endless), 3)] == [0, 1, 2]
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** The function only ever holds one line; `islice` stops pulling after three results, so the infinite input is never exhausted. Rejects are yielded as data rather than raised, so one bad line can’t end the stream, and line numbers are counted before skipping blanks so they match the file.

<a id="solution-3"></a>
### Solution 3 · Constant-memory statistics from a big file

```python
import gzip, json, tracemalloc, duckdb
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal

def stats(path):
    types = Counter()
    revenue = defaultdict(Decimal)
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            types[e["event_type"]] += 1
            if e["event_type"] == "purchase":
                day = datetime.fromisoformat(e["ts"]).astimezone(timezone.utc).date().isoformat()
                revenue[day] += Decimal(e["amount"])
    return types, dict(revenue)

tracemalloc.start()
types, revenue = stats("data/big/events_big.jsonl.gz")
peak = tracemalloc.get_traced_memory()[1]
tracemalloc.stop()
assert peak < 5 * 1_048_576, f"peak {peak / 1_048_576:.1f} MiB"
with duckdb.connect() as con:
    expected = dict(con.execute("""
        SELECT strftime(CAST(ts AS TIMESTAMPTZ) AT TIME ZONE 'UTC', '%Y-%m-%d'), sum(CAST(amount AS DECIMAL(18,2)))
        FROM read_json('data/big/events_big.jsonl.gz', format='newline_delimited', ignore_errors=true,
                       columns={ts: 'VARCHAR', event_type: 'VARCHAR', amount: 'VARCHAR'})
        WHERE event_type = 'purchase' GROUP BY 1""").fetchall())
assert revenue == expected and types["purchase"] == 19_971
print(f"peak {peak / 1_048_576:.2f} MiB | {dict(sorted(types.items()))} | days: {sorted(revenue)}")
print("All tests passed")
```

Output:

```text
peak 0.32 MiB | {'add_to_cart': 39796, 'page_view': 140193, 'purchase': 19971} | days: ['2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11']
All tests passed
```

**Why it works.** State is two small dictionaries whose size depends on the number of event types and days, not on the number of lines, so the peak stays well under a MiB. Cross-checking against an independent implementation (DuckDB’s reader here) is a standard way to verify pipeline code. Note that DuckDB’s `ignore_errors` is acceptable for this *check*, where we already know malformed lines aren’t purchases.

<a id="solution-4"></a>
### Solution 4 · Sessions with groupby and pairwise

```python
from datetime import datetime, timedelta
from itertools import groupby, pairwise
from operator import itemgetter

def sessions(events, gap=timedelta(minutes=30)):
    result = {}
    for user, group in groupby(events, key=itemgetter(0)):        # input must be sorted by user
        result[user] = 1 + sum(1 for (_, a), (_, b) in pairwise(group) if b - a > gap)
    return result

t = lambda s: datetime.fromisoformat("2026-03-02T" + s)
events = [("u1", t("09:00")), ("u1", t("09:20")), ("u1", t("10:00")), ("u1", t("10:29")),
          ("u2", t("08:00")), ("u3", t("12:00")), ("u3", t("12:30")), ("u3", t("13:01"))]
assert sessions(events) == {"u1": 2, "u2": 1, "u3": 2}
print(sessions(events))
print("All tests passed")
```

Output:

```text
{'u1': 2, 'u2': 1, 'u3': 2}
All tests passed
```

**Why it works.** Because the input is sorted, `groupby` sees each user once, and `pairwise` walks consecutive timestamps; each gap above the threshold starts a new session. Memory is constant per user, so this streams over a file sorted by user and time, exactly how sessionisation is done on exports or in a `LAG()` window query in SQL (SQL deck).

<a id="solution-5"></a>
### Solution 5 · Local time to UTC with an explicit DST policy

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def local_to_utc(text, zone="America/Chicago", *, ambiguous="earlier", nonexistent="raise"):
    tz = ZoneInfo(zone)
    naive = datetime.fromisoformat(text)
    if naive.tzinfo is not None:
        raise ValueError(f"expected a local time without offset: {text!r}")
    first = naive.replace(tzinfo=tz, fold=0).astimezone(timezone.utc)
    second = naive.replace(tzinfo=tz, fold=1).astimezone(timezone.utc)
    exists = first.astimezone(tz).replace(tzinfo=None) == naive
    if not exists:
        if nonexistent == "raise":
            raise ValueError(f"{text} does not exist in {zone} (DST gap)")
        return first                                   # fold=0 = shifted forward by the gap
    if first != second:                                # the time occurs twice
        if ambiguous == "raise":
            raise ValueError(f"{text} is ambiguous in {zone} (DST overlap)")
        return first if ambiguous == "earlier" else second
    return first

u = lambda s: datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
assert local_to_utc("2026-03-02 09:03") == u("2026-03-02T15:03")
assert local_to_utc("2026-11-01 01:30") == u("2026-11-01T06:30")
assert local_to_utc("2026-11-01 01:30", ambiguous="later") == u("2026-11-01T07:30")
assert local_to_utc("2026-03-08 02:30", nonexistent="shift") == u("2026-03-08T08:30")
for kwargs in ({"ambiguous": "raise", "text": "2026-11-01 01:30"}, {"text": "2026-03-08 02:30"}):
    text = kwargs.pop("text")
    try:
        local_to_utc(text, **kwargs)
    except ValueError as e:
        print("ValueError:", e)
    else:
        raise AssertionError(text)
print("All tests passed")
```

Output:

```text
ValueError: 2026-11-01 01:30 is ambiguous in America/Chicago (DST overlap)
ValueError: 2026-03-08 02:30 does not exist in America/Chicago (DST gap)
All tests passed
```

**Why it works.** Python never raises for gap or overlap times; it silently picks an offset based on `fold`. Computing both folds and the round trip turns those silent choices into explicit, documented policies. Pipelines usually use “earlier” for overlaps and “raise” (to a reject file) or “shift” for gaps, and the choice belongs in the data contract.

<a id="solution-6"></a>
### Solution 6 · A safe query function

```python
import duckdb

SORTABLE = {"event_id", "ts_utc", "amount"}

def find_events(con, user_ids, event_types, order_by="ts_utc"):
    if order_by not in SORTABLE:
        raise ValueError(f"cannot order by {order_by!r}")
    if not user_ids or not event_types:
        return []
    users = ", ".join("?" for _ in user_ids)
    types = ", ".join("?" for _ in event_types)
    sql = (f"SELECT event_id FROM events WHERE user_id IN ({users}) AND event_type IN ({types}) "
           f"ORDER BY {order_by}, event_id")
    return [row[0] for row in con.execute(sql, [*user_ids, *event_types]).fetchall()]

con = duckdb.connect("data/out/warehouse.duckdb", read_only=True)
assert find_events(con, ["u1", "u2"], ["purchase"]) == ["e3", "e5", "e13"]
assert find_events(con, ["u1"], ["purchase", "add_to_cart"], order_by="amount") == ["e2", "e3"]
assert find_events(con, ["u1' OR '1'='1"], ["purchase"]) == []
assert find_events(con, [], ["purchase"]) == []
try:
    find_events(con, ["u1"], ["purchase"], order_by="amount; DROP TABLE events")
except ValueError as e:
    print("ValueError:", e)
else:
    raise AssertionError("order_by not validated")
con.close()
print("All tests passed")
```

Output:

```text
ValueError: cannot order by 'amount; DROP TABLE events'
All tests passed
```

**Why it works.** The only text interpolated into SQL is question marks and an identifier that passed an allowlist; every value goes through parameters, so the injection string is just a user ID that doesn’t exist. Returning early for empty lists avoids invalid SQL (`IN ()`). Opening the database `read_only` is good practice for code that should never write.

<a id="solution-7"></a>
### Solution 7 · atomic_write as a context manager

```python
import os, tempfile
from contextlib import contextmanager
from pathlib import Path

@contextmanager
def atomic_write(path, encoding="utf-8"):
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    f = os.fdopen(fd, "w", encoding=encoding, newline="")
    try:
        yield f
        f.flush()
        os.fsync(f.fileno())
        f.close()
        os.replace(tmp, path)
    except BaseException:
        f.close()
        Path(tmp).unlink(missing_ok=True)
        raise

p = Path("data/out/atomic_test.txt")
p.write_text("old\n", encoding="utf-8")
try:
    with atomic_write(p) as f:
        f.write("new partial\n")
        raise RuntimeError("boom")
except RuntimeError:
    pass
assert p.read_text(encoding="utf-8") == "old\n"
assert not list(p.parent.glob("atomic_test.txt.*.tmp"))
with atomic_write(p) as f:
    f.write("new\n")
assert p.read_text(encoding="utf-8") == "new\n"
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** An exception inside the `with` block is re-raised at the `yield`, so the code after it (the rename) never runs and the `except` path cleans up. Closing before `os.replace` matters on Windows, where an open file can’t be replaced. `newline=""` leaves line endings exactly as written, which suits CSV writers.

<a id="solution-8"></a>
### Solution 8 · A retry decorator for transient errors

```python
import functools, time

def retry(times=3, on=(ConnectionError, TimeoutError), backoff=0.0, sleep=time.sleep):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except on:
                    if attempt == times:
                        raise
                    sleep(backoff * 2 ** (attempt - 1))
        return wrapper
    return decorator

waits = []
calls = {"n": 0}
@retry(times=4, backoff=0.5, sleep=waits.append)
def flaky():
    calls["n"] += 1
    if calls["n"] < 3:
        raise TimeoutError("slow share")
    return "ok"
assert flaky() == "ok" and calls["n"] == 3 and waits == [0.5, 1.0] and flaky.__name__ == "flaky"

@retry(times=5, sleep=waits.append)
def broken():
    calls["n"] += 1
    raise ValueError("bad data")
calls["n"] = 0
try:
    broken()
except ValueError:
    assert calls["n"] == 1
@retry(times=2, sleep=lambda s: None)
def always_down():
    raise ConnectionError("down")
try:
    always_down()
except ConnectionError:
    pass
else:
    raise AssertionError("should re-raise after the last attempt")
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** `except on:` accepts a tuple of exception types, so only transient errors are retried; a `ValueError` (bad data) fails at once, because retrying can’t fix it. Injecting `sleep` makes the backoff testable without waiting, a general technique for time-dependent code. Production HTTP retries add jitter and respect `Retry-After`; that is covered in the ingestion deck.

<a id="solution-9"></a>
### Solution 9 · Bounded concurrent downloads

```python
import threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_all(ids, fetch, max_in_flight=4):
    ids = list(ids)
    done, errors = {}, {}
    with ThreadPoolExecutor(max_workers=max_in_flight) as pool:
        futures = {pool.submit(fetch, i): i for i in ids}
        for fut in as_completed(futures):
            i = futures[fut]
            try:
                done[i] = fut.result()
            except Exception as e:                 # collect, don't stop the batch
                errors[i] = f"{type(e).__name__}: {e}"
    return [done[i] for i in ids if i in done], errors

state = {"now": 0, "max": 0}
lock = threading.Lock()
def fake_fetch(i):
    with lock:
        state["now"] += 1
        state["max"] = max(state["max"], state["now"])
    try:
        time.sleep(0.05)
        if i % 7 == 3:
            raise ConnectionError(f"id {i}: reset")
        return i * 10
    finally:
        with lock:
            state["now"] -= 1

t0 = time.perf_counter()
results, errors = fetch_all(range(20), fake_fetch, max_in_flight=4)
elapsed = time.perf_counter() - t0
assert state["max"] == 4
assert sorted(errors) == [3, 10, 17]
assert results == [i * 10 for i in range(20) if i % 7 != 3]
assert elapsed < 20 * 0.05 * 0.5, elapsed
print(errors)
print(f"max in flight: {state['max']}, elapsed ≈ {elapsed:.2f}s vs {20 * 0.05:.2f}s serial")
print("All tests passed")
```

Output:

```text
{3: 'ConnectionError: id 3: reset', 10: 'ConnectionError: id 10: reset', 17: 'ConnectionError: id 17: reset'}
max in flight: 4, elapsed ≈ 0.27s vs 1.00s serial
All tests passed
```

**Why it works.** The pool size is the concurrency bound; the lock-protected counter proves it never exceeded 4. Errors are captured per future so one failure doesn’t cancel the rest, and results are re-ordered by input position because `as_completed` yields in completion order. For millions of IDs, combine this with bounded *submission* (lesson 39) so the futures dictionary doesn’t hold them all at once; with an async client, use `asyncio.Semaphore` the same way (lesson 38).

<a id="solution-10"></a>
### Solution 10 · Prove a loader is idempotent and atomic

```python
import duckdb
from contextlib import contextmanager
from decimal import Decimal

@contextmanager
def transaction(con):
    con.begin()
    try:
        yield
    except BaseException:
        con.rollback()
        raise
    else:
        con.commit()

def load_rows(con, source, rows):
    with transaction(con):
        con.execute("DELETE FROM events WHERE source = ?", [source])
        con.executemany("INSERT INTO events VALUES (?, ?, ?)", [(e, a, source) for e, a in rows])
    return len(rows)

con = duckdb.connect()
con.execute("CREATE TABLE events (event_id VARCHAR PRIMARY KEY, amount DECIMAL(18,2), source VARCHAR)")
snapshot = lambda: con.execute("SELECT event_id, amount, source FROM events ORDER BY event_id").fetchall()

assert load_rows(con, "day1", [("e1", "10.00"), ("e2", "5.00")]) == 2
first = snapshot()
assert load_rows(con, "day1", [("e1", "10.00"), ("e2", "5.00")]) == 2
assert snapshot() == first
assert load_rows(con, "day1", [("e1", "12.00")]) == 1
assert snapshot() == [("e1", Decimal("12.00"), "day1")]
before = snapshot()
try:
    load_rows(con, "day2", [("e3", "1.00"), ("e1", "2.00")])
except duckdb.ConstraintException:
    pass
else:
    raise AssertionError("expected a constraint violation")
assert snapshot() == before
con.close()
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** Delete and insert share one transaction, so readers never see the source half-replaced and a failure restores the previous state; the snapshot comparisons prove both properties directly. These four assertions (same result on re-run, correction replaces, failure changes nothing, the exception still reaches the caller) are a reusable test template for any loader. Put them in pytest with `tmp_path` databases (lesson 33).
