# Python foundations for data engineering

*Companion to `python-foundations.html`: same lessons, same numbering, same code. Hints and solutions are in Appendices A and B.*

**Lesson:** *Python for data engineering*, deck 1 of 2. This deck covers the in-memory core (values, collections and their costs, functions, errors, copies, `Counter`/`defaultdict`/`deque`, type hints, dataclasses); deck 2 of 2, *Python files, generators, and practical data scripts*, covers files, streams, datetimes at the edges, databases, scripts and concurrency.

**Tested with:** CPython 3.12.10 on Windows (64-bit). Every Python block was executed while building this document; the Output blocks are the real results. **Minimum version:** Python 3.11. **Also runs on:** Microsoft Fabric Runtime 1.3 (Python 3.11) and Runtime 2.0 (Python 3.13). Standard library only.

**Audience:** you already program (comparisons use C#) and are learning Python for analytics and data engineering. New terms are defined on first use and collected in the glossary (section 46).

**Scope:** everything happens in memory. Files, I/O, databases and concurrency are covered in the files-and-streams deck; HTTP APIs in the reliable-ingestion deck.

## Contents

1. [Python foundations for data engineering](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and how to read this deck](#slide-2)
3. [The running example: raw app events](#slide-3)
4. [Python for a C# developer](#slide-4)
5. [Values and types](#slide-5)
6. [None, equality, and identity](#slide-6)
7. [Truthiness: the zero-amount trap](#slide-7)
8. [Strings: cleaning and splitting text](#slide-8)
9. [Numbers: int, float, and Decimal for money](#slide-9)
10. [Dates and times you need for events](#slide-10)
11. [Branching: if, elif, else, and boolean operators](#slide-11)
12. [Loops: for, while, enumerate, zip](#slide-12)
13. [Functions and arguments](#slide-13)
14. [Scope: where names live](#slide-14)
15. [Imports, modules, and the standard library](#slide-15)
16. [Exceptions: fail loudly, or quarantine the record](#slide-16)
17. [Lists: ordered, mutable sequences](#slide-17)
18. [Tuples and unpacking](#slide-18)
19. [Dicts: records and lookups](#slide-19)
20. [Sets: membership, uniqueness, and set algebra](#slide-20)
21. [Choosing the right collection](#slide-21)
22. [Comprehensions and generator expressions](#slide-22)
23. [Sorting with keys](#slide-23)
24. [Names, references, and mutability](#slide-24)
25. [Shallow and deep copies](#slide-25)
26. [The mutable default argument bug](#slide-26)
27. [Counter: counting without boilerplate](#slide-27)
28. [defaultdict: grouping without key checks](#slide-28)
29. [deque: queues and sliding windows](#slide-29)
30. [Practical time and memory costs](#slide-30)
31. [Type hints: documentation that tools can check](#slide-31)
32. [Dataclasses: typed records](#slide-32)
33. [Worked example 1: parse raw records](#slide-33)
34. [Worked example 2: validate and collect every error](#slide-34)
35. [Worked example 3: deduplicate by a stated rule](#slide-35)
36. [Worked example 4: group and count](#slide-36)
37. [Bug clinic: the mistakes that corrupt data silently](#slide-37)
38. [Exercises 1–3: values, strings, mutability](#slide-38)
39. [Exercises 4–6: grouping, sorting, deduplication](#slide-39)
40. [Exercises 7–8: aggregation and windows](#slide-40)
41. [Exercises 9–10: typed records and reconciliation](#slide-41)
42. [Mini-project: an in-memory event cleaner](#slide-42)
43. [Mini-project: starter code and tests](#slide-43)
44. [Mini-project: reference solution](#slide-44)
45. [Cheat sheet](#slide-45)
46. [Glossary](#slide-46)
47. [What to remember, and what comes next](#slide-47)
48. [References and how this deck was tested](#slide-48)
49. [Appendix A · Hints](#appendix-a)
50. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Python foundations for data engineering

**

This deck teaches the plain Python you need to transform data before you use DataFrame libraries. It assumes you already program (comparisons use C#) and are new to Python and data engineering.

- **Lessons 2–10, values:** types, `None`, truthiness, strings, numbers, dates and times.
- **Lessons 11–16, control and code:** branching, loops, functions, scope, imports, exceptions.
- **Lessons 17–32, collections:** lists, tuples, dicts, sets, comprehensions, sorting, copies, `Counter`, `defaultdict`, `deque`, time and memory costs, type hints, dataclasses.
- **Lessons 33–48, practice:** parsing, validating, deduplicating, grouping and counting events; a bug clinic; 10 exercises; an in-memory event-cleaning mini-project; a cheat sheet.

Out of scope: files, databases, async and threads (the second deck of this lesson, *Python files, generators, and practical data scripts*), DataFrames (the pandas & Polars deck) and HTTP (the reliable-ingestion deck).

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Python is the glue language of data engineering. Before you use DataFrames or Spark you write plain Python to parse records, validate fields, deduplicate, and count, and when a DataFrame job misbehaves, you debug it with the same mental model: names, objects, collections, copies.

#### Where you will use it

- Fabric and Databricks notebooks: validation and small transforms around Spark/pandas code.
- Azure Functions and scripts that receive JSON events or API responses.
- Data-quality checks, reconciliation scripts, and test fixtures.
- Coding interviews: dicts, sets, Counter, sorting with keys, dedupe rules.

#### What goes wrong without it

- Zero amounts treated as missing (truthiness), float money that doesn’t reconcile.
- Shared mutable defaults and shallow copies that corrupt “unrelated” records.
- O(n²) loops (list membership inside loops) that take hours on real volumes.
- One bad record crashes the job, or vanishes silently.

#### Who expects you to know it

- Data engineers (Python is in almost every job description).
- Analytics engineers writing dbt Python models or utilities.
- Interviewers in Python rounds: clean, correct code on small data problems.

> **On the job:** A typical ticket: “the nightly job crashed on a record with a null user, fix it and stop it happening again”. The fix is plain Python: parse at the edge, validate every field, quarantine bad rows with reasons, and add an invariant so counts always add up.

> **The main idea:** plain Python is the foundation under every data library. Getting values, collections and copies right prevents the bugs that silently change numbers.

*Read more:* [The Python tutorial](https://docs.python.org/3/tutorial/index.html).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Small or record-by-record logic, glue, validation | Plain Python | Clear, testable, no dependencies |
| Tables of thousands to millions of rows | pandas / Polars / DuckDB | Vectorised, columnar, far less memory per row |
| Data in a warehouse already | SQL | Push work to the engine instead of pulling rows out |
| Billions of rows or many files in a lake | Spark | Distributed processing |
| Counting, grouping, dedupe in memory | Counter, defaultdict, sets, dicts | O(1) lookups; built for exactly this |

#### How interviews test it

- Live coding: “count events per user”, “deduplicate keeping the latest”, “group by day”.
- Follow-ups: complexity (why a set, not a list?), edge cases (None, 0, duplicates, time zones).
- Reading code: spotting mutable defaults, aliasing, truthiness bugs.

#### Where it sits in your learning path

- First of the two decks for the lesson Python for data engineering; assumes only general programming experience (C#).
- Next: the files-and-streams deck completes the lesson (files, generators, databases, scripts, concurrency); then the pandas & Polars deck and the reliable-ingestion deck.

> **The main idea:** use plain Python for glue, validation and per-record logic; move to DataFrame engines or SQL when the work becomes table-shaped or large.

---

<a id="slide-2"></a>
## 2. Set up, versions, and how to read this deck

*Start here · what you need and what was tested*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** (the standard Python implementation, written in C) on Windows 11, 64-bit. Every Python block in this deck was executed while building it; the OUTPUT boxes are the real results. |
| Minimum version | **Python 3.11.** Two features need it: `datetime.fromisoformat` accepting a trailing `Z`, and the `X \| None` type-hint syntax used everywhere (3.10+). |
| Where it also runs | Microsoft Fabric notebooks: Runtime 1.3 ships Python 3.11; Runtime 2.0 ships Python 3.13. Only the standard library is used, so nothing needs installing. |
| How to run code | **REPL** (read-eval-print loop: type `python` in a terminal and run lines interactively), a `.py` file run with `python file.py`, VS Code with the Python extension, or a Jupyter/Fabric notebook cell. |
| Conventions | Names follow [PEP 8](https://peps.python.org/pep-0008/), the Python style guide: `snake_case` for functions and variables, `PascalCase` for classes, 4-space indentation. |

#### How each lesson works

A short explanation, a runnable example with its real output, the bug that usually bites, and the fix. New terms are defined the first time they appear and collected in the glossary (lesson 46).

#### Check your Python

```python
import sys
print(sys.version_info >= (3, 11))   # True means this deck's code will run
print(sys.version.split()[0])
```

Output:

```text
True
3.12.10
```

> **The main idea:** use Python 3.11 or newer. Run every example yourself and change one thing at a time: predicting the output before you run it is the fastest way to learn.

*Read more:* [Python downloads](https://www.python.org/downloads/), [Python tutorial](https://docs.python.org/3/tutorial/index.html), [Fabric Runtime 1.3 (Python 3.11)](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-1-3), [Fabric Runtime 2.0 (Python 3.13)](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-2-0).

---

<a id="slide-3"></a>
## 3. The running example: raw app events

*Start here · one small, messy dataset used throughout*

An online plant shop sends an **event** (a record that something happened) each time a user views a page, adds to cart, or buys. Each event arrives as a **dictionary** (a key→value map, like a C# `Dictionary<string, object>`). The data is deliberately messy, like real feeds. Every lesson that says “uses the dataset” runs this code first:

```python
# The running example: raw events as they arrive from an app (already in memory).
RAW_EVENTS = [
    {"event_id": "e1", "user_id": "u1",   "event_type": "page_view",   "ts": "2026-03-02T09:00:00Z",      "amount": None,    "ingested_at": "2026-03-02T09:00:05Z"},
    {"event_id": "e2", "user_id": "u1",   "event_type": "add_to_cart", "ts": "2026-03-02T09:01:10Z",      "amount": "40.00", "ingested_at": "2026-03-02T09:01:12Z"},
    {"event_id": "e3", "user_id": "u1",   "event_type": "purchase",    "ts": "2026-03-02T09:03:00Z",      "amount": "64.00", "ingested_at": "2026-03-02T09:03:02Z"},
    {"event_id": "e3", "user_id": "u1",   "event_type": "purchase",    "ts": "2026-03-02T09:03:00Z",      "amount": "64.00", "ingested_at": "2026-03-02T09:10:00Z"},
    {"event_id": "e4", "user_id": " U2 ", "event_type": "Page_View",   "ts": "2026-03-02T10:15:00+01:00", "amount": "",      "ingested_at": "2026-03-02T09:15:03Z"},
    {"event_id": "e5", "user_id": "u2",   "event_type": "purchase",    "ts": "2026-03-02T09:20:00Z",      "amount": "25",    "ingested_at": "2026-03-02T09:20:01Z"},
    {"event_id": "e6", "user_id": None,   "event_type": "purchase",    "ts": "2026-03-02T11:00:00Z",      "amount": "18.00", "ingested_at": "2026-03-02T11:00:02Z"},
    {"event_id": "e7", "user_id": "u3",   "event_type": "refund",      "ts": "not-a-date",                "amount": "-5",    "ingested_at": "2026-03-03T07:00:00Z"},
    {"event_id": "e8", "user_id": "u3",   "event_type": "purchase",    "ts": "2026-03-03T08:00:00Z",      "amount": "abc",   "ingested_at": "2026-03-03T08:00:01Z"},
    {"event_id": "e9", "user_id": "u3",   "event_type": "purchase",    "ts": "2026-03-03T08:30:00Z",      "amount": "0.00",  "ingested_at": "2026-03-03T08:30:01Z"},
    {"event_id": "e2", "user_id": "u1",   "event_type": "add_to_cart", "ts": "2026-03-02T09:01:10Z",      "amount": "42.00", "ingested_at": "2026-03-02T09:30:00Z"},
]

# The same kind of data as pipe-delimited text lines (still in memory, no files yet).
RAW_LINES = [
    "e10|u4|page_view|2026-03-04T12:00:00Z|",
    "e11|u4|purchase|2026-03-04T12:05:00Z|19.99",
    "e12 | u5 | PURCHASE | 2026-03-04T13:00:00Z | 7.5",
    "e13|u5|purchase|2026-03-04T13:10:00Z",
]
```

| Field | Cleaning rule (the contract we will enforce) |
|---|---|
| event_id | Required, non-empty text. |
| user_id | Required. Trim whitespace and lowercase: `" U2 "` → `"u2"`. |
| event_type | Trim and lowercase; must be one of `page_view`, `add_to_cart`, `purchase`. |
| ts | ISO 8601 timestamp with an offset; store as a UTC `datetime`. |
| amount | Required for add_to_cart and purchase: a non-negative `Decimal` with 2 decimal places. Must be empty for page_view. |
| duplicates | Same `event_id` = same event. Keep the record with the latest `ingested_at`; on a tie, keep the one that appears later in the input. |

Spot the traps before you read on: a **duplicate redelivery** (e3), a **correction** (e2 arrives again with 42.00), whitespace and case (e4), a **+01:00** time zone (e4), a missing user (e6), an unknown type with a bad timestamp (e7), a non-numeric amount (e8), and a legitimate **zero** amount (e9).

> **The main idea:** write the cleaning rules down before writing code. Every function in this deck enforces one of these rules, and the mini-project combines them.

---

<a id="slide-4"></a>
## 4. Python for a C# developer

*Start here · what transfers and what is different*

| Concept | C# | Python |
|---|---|---|
| Typing | Static: types checked at compile time | **Dynamic**: a name can refer to any type; types are checked when code runs. Still **strong**: `"1" + 1` is an error, not "11". |
| Blocks | `{ }` braces | Indentation (4 spaces) after a line ending in `:` |
| Variables | Typed storage; value types copy | **Names** bound to **objects**. Assignment never copies; everything (even `int`) is an object. |
| Null | `null` | `None` (a single object of type `NoneType`) |
| Collections | `List<T>`, `Dictionary<K,V>`, `HashSet<T>`, `Queue<T>` | `list`, `dict`, `set`, `collections.deque` |
| LINQ | `Where`, `Select`, `OrderBy`, `GroupBy` | Comprehensions, `sorted(key=…)`, `collections.Counter`/`defaultdict`, `itertools` |
| Records | `record`, `class` | `@dataclass`, `class` |
| Integers | `int` overflows at 2³¹ | `int` has arbitrary precision: it never overflows |
| Money | `decimal` | `decimal.Decimal` (import it) |
| Strings | `$"{x}"`, immutable | `f"{x}"`, immutable |
| Entry point | `static void Main` | Top-level code runs on import; guard it with `if __name__ == "__main__":` |
| Namespaces | `namespace` / `using` | Modules (files) and packages (folders) / `import` |
| Generics / interfaces | Enforced by the compiler | **Type hints** are documentation checked by optional tools (mypy, Pyright), not by Python itself |

```python
x = 42          # x names an int object
x = "forty-two" # now x names a str object: allowed (dynamic typing)
try:
    print("1" + 1)
except TypeError as e:
    print("TypeError:", e)   # strong typing: no silent conversion
```

Output:

```text
TypeError: can only concatenate str (not "int") to str
```

> **On the job:** Data teams mix languages: Python for notebooks, ingestion and glue code, SQL for transformations, and sometimes C#/.NET for services such as Azure Functions. Reviewers of Python written by C# developers most often flag manual index loops, getter/setter classes and type checks where idiomatic Python is shorter and easier for the team to maintain.

> **The main idea:** think “names pointing at objects” rather than “typed boxes”. Most surprises in Python data code (aliasing, shallow copies, mutable defaults) follow from that one idea.

*Read more:* [Data model](https://docs.python.org/3/reference/datamodel.html), [Python glossary](https://docs.python.org/3/glossary.html).

---

<a id="slide-5"></a>
## 5. Values and types

*Values · the built-in types a record is made of*

A **value** (or object) always has a **type**, which decides what operations it supports. `type(x)` returns it; `isinstance(x, T)` tests it (and accepts subclasses, like C# `is`). A **literal** is a value written directly in code, like `42` or `"u1"`.

| Type | Literal examples | Mutable? | Typical use in data work |
|---|---|---|---|
| `int` | `42`, `-7`, `1_000_000` | no | counts, IDs, years |
| `float` | `3.14`, `1e-3`, `float("nan")` | no | measurements, ratios (not money) |
| `bool` | `True`, `False` | no | flags; a subclass of int (`True + True == 2`) |
| `str` | `"u1"`, `'x'`, `"""multi-line"""` | no | IDs, names, raw text |
| `NoneType` | `None` | no | missing / not applicable |
| `Decimal` | `Decimal("64.00")` | no | money, exact decimal arithmetic |
| `tuple` | `(1, "a")` | no | fixed records, composite keys |
| `list` | `[1, 2]` | **yes** | ordered sequences |
| `dict` | `{"k": 1}` | **yes** | records, lookups |
| `set` | `{1, 2}` | **yes** | membership, dedupe |

**Mutable** means the object can be changed in place after creation; **immutable** means every “change” creates a new object. This matters later for copies and dictionary keys.

```python
from decimal import Decimal

for value in [42, 3.5, True, "u1", None, Decimal("64.00"), (1, "a"), [1, 2], {"k": 1}, {1, 2}]:
    print(f"{value!r:<18} {type(value).__name__}")

print(isinstance(True, int))      # bool is a subclass of int
print(2 ** 100)                   # ints never overflow
```

Output:

```text
42                 int
3.5                float
True               bool
'u1'               str
None               NoneType
Decimal('64.00')   Decimal
(1, 'a')           tuple
[1, 2]             list
{'k': 1}           dict
{1, 2}             set
True
1267650600228229401496703205376
```

> **On the job:** Every ingestion step turns source text into typed values: an ID that must stay a string (leading zeros), an amount that must become `Decimal`, a flag that must become `bool` (note that `bool("false")` is `True`). Type mistakes made here travel all the way to the warehouse.

> **The main idea:** every value has a type, and the type decides what you can do with it. Know which types are mutable: list, dict, and set are; numbers, strings, tuples, and None are not.

*Read more:* [Built-in types](https://docs.python.org/3/library/stdtypes.html), [Data model](https://docs.python.org/3/reference/datamodel.html).

---

<a id="slide-6"></a>
## 6. None, equality, and identity

*Values · missing data and the == vs is question*

`None` means “no value”. There is exactly one `None` object in a running program, so the idiomatic test is **identity**: `x is None`. `==` asks “are these values equal?”; `is` asks “are these the same object?” (like C# `ReferenceEquals`).

```python
a = [1, 2]
b = [1, 2]
c = a
print(a == b, a is b)   # equal values, different objects
print(a == c, a is c)   # same object

amount = None
print(amount is None)        # idiomatic missing-value check
print(amount == 0)           # None is not zero
print(None == "")            # ...and not an empty string
```

Output:

```text
True False
True True
True
False
False
```

#### Four different kinds of “missing”

| Value | Meaning in a feed |
|---|---|
| `None` | field present, no value (JSON `null`) |
| `""` | empty text: often “not provided” in CSV/form data |
| key absent | the field was not sent at all: `"amount" not in record` |
| `float("nan")` | “not a number”: appears after numeric parsing; `nan == nan` is False |

#### Bug and fix

**Bug:** `if x == None` works but can be fooled by objects that redefine `==` (pandas does). `is` on strings or numbers (`x is "u1"`) may work by accident and fail later.

**Fix:** use `is` / `is not` *only* for `None` (and `True`/`False` singletons when needed); use `==` for everything else. Decide early how your pipeline maps `""` and absent keys to `None`.

> **On the job:** Sources express “missing” in several ways: JSON `null`, an absent key, an empty string, the text `"NULL"`. A pipeline maps them all to one representation (`None` in Python, `NULL` in SQL) at the edge, and data-quality checks then count missing values per column.

> **The main idea:** test for missing values with `is None`, compare values with `==`, and normalise the different flavours of “missing” into one representation as early as possible.

*Read more:* [None](https://docs.python.org/3/library/constants.html#None), [Identity comparisons](https://docs.python.org/3/reference/expressions.html#is-not).

---

<a id="slide-7"></a>
## 7. Truthiness: the zero-amount trap

*Values · what counts as False in an if statement*

`if x:` doesn’t require a `bool`. Python asks the object whether it is **truthy** (treated as True) or **falsy**. Falsy values: `None`, `False`, any zero (`0`, `0.0`, `Decimal("0.00")`), and any empty container or string (`""`, `[]`, `{}`, `set()`). Everything else is truthy, including `"0"`, `"False"`, and `"  "`.

```python
from decimal import Decimal

for value in [None, 0, 0.0, Decimal("0.00"), "", "0", "  ", [], [0], {}]:
    print(f"{value!r:<18} -> {bool(value)}")
```

Output:

```text
None               -> False
0                  -> False
0.0                -> False
Decimal('0.00')    -> False
''                 -> False
'0'                -> True
'  '               -> True
[]                 -> False
[0]                -> True
{}                 -> False
```

#### The bug

```python
from decimal import Decimal

amounts = [Decimal("64.00"), None, Decimal("0.00")]
missing = [a for a in amounts if not a]       # BUG
print(missing)   # a real zero is counted as missing
```

Output:

```text
[None, Decimal('0.00')]
```

#### The fix

```python
from decimal import Decimal

amounts = [Decimal("64.00"), None, Decimal("0.00")]
missing = [a for a in amounts if a is None]   # explicit
print(missing)
```

Output:

```text
[None]
```

Use plain `if items:` for “is this container non-empty?” (idiomatic). For values that can legitimately be 0 or `""`, test the exact condition: `is None`, `== ""`, `len(x) == 0`.

> **On the job:** Code reviews on data teams flag `if amount:` and `amount or default` on numeric fields, because they turn legitimate zeros (free orders, zero-quantity adjustments) into “missing” values that later vanish from totals.

> **The main idea:** truthiness is convenient for containers but dangerous for data values. Event e9 has a valid 0.00 purchase; `if amount:` would silently drop it.

*Read more:* [Truth value testing](https://docs.python.org/3/library/stdtypes.html#truth-value-testing).

---

<a id="slide-8"></a>
## 8. Strings: cleaning and splitting text

*Values · str is immutable Unicode text*

A **string** (`str`) is an immutable sequence of Unicode characters. Every method returns a *new* string; the original never changes. You can index (`s[0]`), slice (`s[1:4]`, end exclusive), and test membership (`"u" in s`).

```python
raw = "  e12 | u5 | PURCHASE | 2026-03-04T13:00:00Z | 7.5 "
s = raw.strip()                     # remove surrounding whitespace
print(repr(s))
parts = [p.strip() for p in s.split("|")]
print(parts)
print(parts[2].lower(), parts[0].startswith("e"), parts[3][:10])
print(raw)                          # unchanged: strings are immutable
```

Output:

```text
'e12 | u5 | PURCHASE | 2026-03-04T13:00:00Z | 7.5'
['e12', 'u5', 'PURCHASE', '2026-03-04T13:00:00Z', '7.5']
purchase True 2026-03-04
  e12 | u5 | PURCHASE | 2026-03-04T13:00:00Z | 7.5 
```

| Method | Example | Result |
|---|---|---|
| `strip()` / `lstrip()` / `rstrip()` | `" U2 ".strip()` | `"U2"` |
| `lower()` / `upper()` / `casefold()` | `"Page_View".lower()` | `"page_view"` (casefold is stronger for non-English text) |
| `split(sep)` / `split()` | `"a\|b\|\|c".split("\|")` | `["a", "b", "", "c"]`; `split()` with no argument splits on any whitespace and drops empties |
| `partition(sep)` | `"k=v=w".partition("=")` | `("k", "=", "v=w")`: split once, always 3 parts |
| `replace(a, b)` | `"1,234".replace(",", "")` | `"1234"` |
| `startswith` / `endswith` | `"e12".startswith("e")` | `True` (accept a tuple of options) |
| `removeprefix` / `removesuffix` | `"evt_42".removeprefix("evt_")` | `"42"` (3.9+) |
| `isdigit()` | `"42".isdigit()` | `True`; `"-5"` and `"4.2"` give False |
| `sep.join(items)` | `"\|".join(["a", "b"])` | `"a\|b"`: the fast way to build strings |

#### f-strings and formatting

```python
from decimal import Decimal
user, amount = "u1", Decimal("1234.5")
print(f"{user} spent {amount:,.2f}")    # format spec after the colon
print(f"{user!r:>6}|")                  # repr, right-aligned to 6
print(f"{amount=}")                     # debugging shortcut (3.8+)
```

Output:

```text
u1 spent 1,234.50
  'u1'|
amount=Decimal('1234.5')
```

#### Bug and fix: building strings in a loop

**Bug:** `out += piece` in a loop creates a new string each time; with many pieces it gets slow (quadratic in the worst case).

**Fix:** collect pieces in a list and call `"".join(pieces)` once at the end.

> **On the job:** Joins between systems fail on keys that differ only by case or whitespace (`" U2 "` versus `"u2"`). Normalising keys in one shared function before joining or deduplicating is a standard step when raw data is cleaned into a Silver layer.

> **The main idea:** clean text with `strip`, `lower`, and `split`, format output with f-strings, and remember that string methods return new strings: `s.strip()` alone does nothing to `s`.

*Read more:* [String methods](https://docs.python.org/3/library/stdtypes.html#string-methods), [f-strings](https://docs.python.org/3/reference/lexical_analysis.html#f-strings), [Format specification](https://docs.python.org/3/library/string.html#format-specification-mini-language).

---

<a id="slide-9"></a>
## 9. Numbers: int, float, and Decimal for money

*Values · parsing numbers from text, and why floats are wrong for money*

```python
from decimal import Decimal, ROUND_HALF_UP

print(0.1 + 0.2, 0.1 + 0.2 == 0.3)          # binary floating point
print(Decimal("0.1") + Decimal("0.2"))      # exact decimal arithmetic
print(Decimal(0.1))                         # BUG: built from a float, inherits its error
print(int("42"), float("4.2"), Decimal("25").quantize(Decimal("0.01")))
print(round(2.5), round(3.5))               # round() uses banker's rounding (half to even)
print(Decimal("2.345").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
print(7 // 2, 7 % 2, -7 // 2, 7 / 2)        # floor division, remainder, true division
```

Output:

```text
0.30000000000000004 False
0.3
0.1000000000000000055511151231257827021181583404541015625
42 4.2 25.00
2 4
2.35
3 1 -4 3.5
```

#### Parsing text to numbers

```python
from decimal import Decimal, InvalidOperation

for text in ["42", " 42 ", "4.2", "abc", ""]:
    try:
        print(repr(text), "->", int(text))
    except ValueError as e:
        print(repr(text), "-> ValueError:", e)

try:
    Decimal("abc")
except InvalidOperation:
    print("Decimal('abc') -> InvalidOperation")
```

Output:

```text
'42' -> 42
' 42 ' -> 42
'4.2' -> ValueError: invalid literal for int() with base 10: '4.2'
'abc' -> ValueError: invalid literal for int() with base 10: 'abc'
'' -> ValueError: invalid literal for int() with base 10: ''
Decimal('abc') -> InvalidOperation
```

#### Rules of thumb

- **Money:** `Decimal`, built from *strings*, then `quantize(Decimal("0.01"))` to fix the number of decimal places.
- **Counts and IDs:** `int`. Keep IDs with leading zeros (`"007"`) as strings.
- **Measurements and statistics:** `float` is fine; compare with `math.isclose`, never `==`.
- `int()` accepts surrounding whitespace but not `"4.2"`; `Decimal()` raises `decimal.InvalidOperation`, which is *not* a `ValueError`, so catch both when parsing.
- Unlike C#, `/` on two ints returns a float (`7 / 2 == 3.5`); use `//` for floor division. Note `-7 // 2 == -4` (floors), where C# truncates to -3.

> **On the job:** Finance-facing tables store money as `DECIMAL` in the warehouse; the matching Python type is `Decimal` created from strings. Reconciliations against finance totals fail by a few cents when a float sneaks in anywhere between source and table.

> **The main idea:** use Decimal from strings for money and quantize it; parse numbers inside try/except because feeds contain text like "abc" and "".

*Read more:* [decimal](https://docs.python.org/3/library/decimal.html), [Floating-point arithmetic: issues and limitations](https://docs.python.org/3/tutorial/floatingpoint.html), [round()](https://docs.python.org/3/library/functions.html#round).

---

<a id="slide-10"></a>
## 10. Dates and times you need for events

*Values · parse ISO 8601, normalise to UTC*

An **ISO 8601** timestamp looks like `2026-03-02T10:15:00+01:00`: date, `T`, time, and an **offset** from UTC (`Z` means +00:00). A `datetime` with an offset is **aware**; one without is **naive** (like C# `DateTimeKind.Unspecified`). Normalise everything to aware UTC as soon as you parse it.

```python
from datetime import datetime, timezone, timedelta

a = datetime.fromisoformat("2026-03-02T09:00:00Z")          # 'Z' accepted since Python 3.11
b = datetime.fromisoformat("2026-03-02T10:15:00+01:00")
print(a, "|", b)
b_utc = b.astimezone(timezone.utc)
print(b_utc, "| difference:", b_utc - a)
print(b_utc.date(), b_utc.isoformat(), b_utc + timedelta(minutes=30))

naive = datetime(2026, 3, 2, 9, 0)
try:
    print(naive < a)
except TypeError as e:
    print("TypeError:", e)

try:
    datetime.fromisoformat("not-a-date")
except ValueError as e:
    print("ValueError:", e)
```

Output:

```text
2026-03-02 09:00:00+00:00 | 2026-03-02 10:15:00+01:00
2026-03-02 09:15:00+00:00 | difference: 0:15:00
2026-03-02 2026-03-02T09:15:00+00:00 2026-03-02 09:45:00+00:00
TypeError: can't compare offset-naive and offset-aware datetimes
ValueError: Invalid isoformat string: 'not-a-date'
```

#### Rules

- Parse with `datetime.fromisoformat` (3.11+ accepts most ISO 8601 forms) or `datetime.strptime(text, format)` for other layouts.
- Reject or explicitly assume a zone for naive timestamps; never mix aware and naive values.
- Convert to UTC with `.astimezone(timezone.utc)` before comparing, sorting, or grouping by day.
- Group “per day” on the UTC date unless the business asks for local days.

#### Why it matters here

Event e4 says 10:15+01:00, which is **09:15 UTC**, before e5 at 09:20 UTC. Sorting the raw strings would put e4 after e5. Parse first, then sort.

> **On the job:** Event pipelines store timestamps in UTC and convert to local time only for reporting. Mixed offsets in raw feeds (like e4) are a common reason events land in the wrong day partition and daily counts disagree between systems.

> **The main idea:** parse timestamps into aware UTC datetimes at the edge of your code, and compare or sort only those, never the raw strings.

*Read more:* [datetime](https://docs.python.org/3/library/datetime.html), [datetime.fromisoformat](https://docs.python.org/3/library/datetime.html#datetime.datetime.fromisoformat).

---

<a id="slide-11"></a>
## 11. Branching: if, elif, else, and boolean operators

*Control and code · deciding what to do with each record*

```python
def classify(amount):
    if amount is None:
        return "missing"
    elif amount < 0:
        return "negative"
    elif 0 <= amount < 100:          # chained comparison: 0 <= amount and amount < 100
        return "small"
    else:
        return "large"

for a in [None, -5, 0, 64, 250]:
    print(a, "->", classify(a))

event_type = "purchase"
label = "money" if event_type in ("purchase", "add_to_cart") else "no money"   # conditional expression
print(label)
```

Output:

```text
None -> missing
-5 -> negative
0 -> small
64 -> small
250 -> large
money
```

#### and / or return operands, not bools

`a or b` returns `a` if `a` is truthy, otherwise `b`. `a and b` returns `a` if it is falsy, otherwise `b`. Both stop early (**short-circuit**), like C# `||`/`&&`.

```python
print(None or "unknown")       # default for a missing value
print(0 or "unknown")          # BUG when 0 is a valid value!
print("" and "never evaluated")
user = None
print(user is not None and user.strip() != "")   # safe: strip() never runs on None
```

Output:

```text
unknown
unknown

False
```

#### match (3.10+), briefly

`match` is **structural pattern matching**: like C# `switch` with patterns. Handy for dispatching on record shapes; plain `if`/`elif` or a dict lookup covers most data code.

```python
def handler(event):
    match event:
        case {"event_type": "purchase", "amount": amt}:
            return f"purchase of {amt}"
        case {"event_type": "page_view"}:
            return "view"
        case _:
            return "unknown"

print(handler({"event_type": "purchase", "amount": "64.00"}))
print(handler({"event_type": "refund"}))
```

Output:

```text
purchase of 64.00
unknown
```

> **On the job:** Mapping rules (event type → category, status code → outcome) are if/elif chains, dict lookups or `match` statements. A final `else` that raises or quarantines catches the new values a source starts sending without telling you.

> **The main idea:** write explicit conditions (`is None`, `in (…)`, chained comparisons). Use `x or default` only when no falsy value (0, "", empty list) is legitimate.

*Read more:* [Tutorial: more control flow tools](https://docs.python.org/3/tutorial/controlflow.html), [Boolean operations](https://docs.python.org/3/reference/expressions.html#boolean-operations), [PEP 636: structural pattern matching tutorial](https://peps.python.org/pep-0636/).

---

<a id="slide-12"></a>
## 12. Loops: for, while, enumerate, zip

*Control and code · iterate over things, not indexes*

Python’s `for` is a **foreach**: it walks any **iterable** (an object that can produce its items one at a time: lists, strings, dicts, sets, ranges, files, generators). You rarely need an index variable.

```python
events = ["e1", "e2", "e3"]
users = ["u1", "u1", "u2"]

for i, event_id in enumerate(events, start=1):        # index + item
    print(i, event_id)

for event_id, user in zip(events, users, strict=True):  # walk two lists together (strict: 3.10+)
    print(event_id, user)

counts = {"page_view": 2, "purchase": 3}
for event_type, n in counts.items():                     # dict: key and value
    print(f"{event_type}: {n}")

for n in range(3):            # 0, 1, 2 (end exclusive)
    if n == 1:
        continue              # skip to next iteration
    print("n =", n)

attempts = 0
while attempts < 3:           # while: when the number of iterations is unknown
    attempts += 1             # Python has no ++ operator
print("attempts:", attempts)
```

Output:

```text
1 e1
2 e2
3 e3
e1 u1
e2 u1
e3 u2
page_view: 2
purchase: 3
n = 0
n = 2
attempts: 3
```

#### Bug: changing a list while looping over it

```python
ids = ["e1", "e6", "e7", "e9"]
bad = {"e6", "e7"}
for x in ids:
    if x in bad:
        ids.remove(x)       # BUG: the loop skips the element after each removal
print(ids)
```

Output:

```text
['e1', 'e7', 'e9']
```

#### Fix: build a new list

```python
ids = ["e1", "e6", "e7", "e9"]
bad = {"e6", "e7"}
ids = [x for x in ids if x not in bad]   # filter into a new list
print(ids)
```

Output:

```text
['e1', 'e9']
```

Same rule for dicts and sets: modifying their size during iteration raises `RuntimeError`. Iterate over a copy (`list(d)`) or build a new collection.

> **On the job:** Record-by-record loops are the shape of parsers, validators and API pagination code. `enumerate(…, start=1)` gives the line numbers that go into reject files, and `zip(strict=True)` catches header/row length mismatches that would otherwise drop columns silently.

> **The main idea:** loop over items directly; use `enumerate` for positions, `zip(strict=True)` for parallel lists, and `.items()` for dicts. Never add or remove items from the collection you are looping over.

*Read more:* [Tutorial: more control flow tools](https://docs.python.org/3/tutorial/controlflow.html), [zip()](https://docs.python.org/3/library/functions.html#zip), [iterable](https://docs.python.org/3/glossary.html#term-iterable).

---

<a id="slide-13"></a>
## 13. Functions and arguments

*Control and code · positional, keyword, defaults, *args, **kwargs*

A **function** is defined with `def`; without a `return` it returns `None`. Callers can pass arguments by position or by **keyword** (`name=value`, like C# named arguments). Functions are objects: you can pass them to other functions.

```python
def parse_amount(text, *, places=2, allow_negative=False):
    """Parse money text. Arguments after * are keyword-only."""
    from decimal import Decimal
    value = Decimal(text.strip()).quantize(Decimal(1).scaleb(-places))
    if value < 0 and not allow_negative:
        raise ValueError(f"negative amount: {value}")
    return value

print(parse_amount(" 25 "))
print(parse_amount("7.5", places=3))
print(parse_amount("-5", allow_negative=True))
try:
    parse_amount("7.5", 3)          # places must be passed by keyword
except TypeError as e:
    print("TypeError:", e)
```

Output:

```text
25.00
7.500
-5.00
TypeError: parse_amount() takes 1 positional argument but 2 were given
```

#### *args, **kwargs, and returning several values

```python
def summarize(*amounts, label="total", **tags):
    # amounts: tuple of extra positional args; tags: dict of extra keyword args
    return label, sum(amounts), tags

name, total, tags = summarize(10, 20, 5, label="cart", source="app")  # tuple unpacking
print(name, total, tags)

numbers = [1, 2, 3]
options = {"label": "spread"}
print(summarize(*numbers, **options))      # * and ** also unpack at the call site
```

Output:

```text
cart 35 {'source': 'app'}
('spread', 6, {})
```

#### Functions are values

```python
def by_amount(e):
    return e["amount"]

rows = [{"id": "a", "amount": 5}, {"id": "b", "amount": 2}]
print(max(rows, key=by_amount)["id"])           # pass a function
print(min(rows, key=lambda e: e["amount"])["id"])  # lambda: an anonymous one-expression function
```

Output:

```text
a
b
```

Signature cheat: `def f(pos_only, /, normal, *, kw_only)`. Arguments before `/` are positional-only; after `*` they are keyword-only. Keyword-only flags (`allow_negative=True`) make call sites self-documenting.

> **On the job:** Pipelines are built from small functions (`parse_amount`, `normalise_user`, `is_valid`) that are unit-tested one at a time and reused in notebooks, scripts and tests. Keyword-only options make call sites readable in code review.

> **The main idea:** prefer small functions with clear keyword-only options, return tuples for several results, and pass functions (often lambdas) to built-ins like `sorted`, `max`, and `min`.

*Read more:* [Defining functions](https://docs.python.org/3/tutorial/controlflow.html#defining-functions), [Special parameters / and *](https://docs.python.org/3/tutorial/controlflow.html#special-parameters).

---

<a id="slide-14"></a>
## 14. Scope: where names live

*Control and code · LEGB, closures, and two classic bugs*

**Scope** is the region of code where a name is visible. Python looks names up in order **L**ocal (the current function) → **E**nclosing functions → **G**lobal (the module) → **B**uilt-ins (`len`, `print`). Unlike C#, `if` and `for` blocks do *not* create a new scope.

```python
threshold = 100                      # global (module-level)

def is_large(amount):
    return amount > threshold        # reads the global: fine

for i in range(3):
    last = i
print(i, last)                       # loop variables survive the loop

def make_counter():
    count = 0                        # enclosing scope
    def increment():
        nonlocal count               # rebind the enclosing variable
        count += 1
        return count
    return increment                 # a closure: a function that remembers its enclosing variables

c = make_counter()
print(c(), c(), c())
```

Output:

```text
2 2
1 2 3
```

#### Bug 1: UnboundLocalError

```python
total = 0
def add(x):
    total += x       # assignment makes 'total' local to add(), so reading it first fails
    return total
try:
    add(5)
except UnboundLocalError as e:
    print("UnboundLocalError:", e)
```

Output:

```text
UnboundLocalError: cannot access local variable 'total' where it is not associated with a value
```

**Fix:** don’t mutate globals. Pass values in and return results: `def add(total, x): return total + x`. (`global total` works but makes code hard to test.)

#### Bug 2: late binding in loops

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])          # BUG: all see the final i

funcs = [lambda i=i: i for i in range(3)]   # fix: bind the current value as a default
print([f() for f in funcs])
```

Output:

```text
[2, 2, 2]
[0, 1, 2]
```

Closures look up variables when called, not when created. C# had the same issue with `foreach` before C# 5.

> **On the job:** Module-level state in notebooks is a classic source of irreproducible results: one cell changes a global and later cells silently use the new value. Passing state in as arguments and returning results keeps each step testable and safe to re-run.

> **The main idea:** keep state in function arguments and return values, not globals. Remember that blocks don’t create scopes and closures read variables late.

*Read more:* [Resolution of names (scope)](https://docs.python.org/3/reference/executionmodel.html#resolution-of-names), [FAQ: UnboundLocalError](https://docs.python.org/3/faq/programming.html#why-am-i-getting-an-unboundlocalerror-when-the-variable-has-a-value).

---

<a id="slide-15"></a>
## 15. Imports, modules, and the standard library

*Control and code · organising and reusing code*

A **module** is a `.py` file; a **package** is a folder of modules. `import` runs the module once, caches it, and binds a name to it. The **standard library** (modules shipped with Python) covers everything in this deck.

```python
import collections                         # use as collections.Counter
from decimal import Decimal, InvalidOperation   # import specific names
from datetime import datetime as dt        # alias
import itertools, operator

print(collections.Counter("aab").most_common(1))
print(Decimal("1.10") + Decimal("2.20"), dt(2026, 3, 2).date())
print(list(itertools.islice(itertools.count(10), 3)), operator.itemgetter("id")({"id": "e1"}))
```

Output:

```text
[('a', 2)]
3.30 2026-03-02
[10, 11, 12] e1
```

#### A module you write: events_lib.py

```python
"""Helpers for cleaning event records."""   # module docstring
from decimal import Decimal

ALLOWED_TYPES = frozenset({"page_view", "add_to_cart", "purchase"})   # constant: UPPER_CASE

def normalize_type(raw: str) -> str:
    return raw.strip().lower()

if __name__ == "__main__":
    # Runs only with `python events_lib.py`, not on `import events_lib`
    print(normalize_type(" Page_View "))
```

In another file in the same folder: `from events_lib import normalize_type`. In Fabric, shared code usually lives in a notebook loaded with `%run` or in a custom library attached to an environment.

#### Rules and pitfalls

- Put imports at the top: standard library, then third-party, then your own (PEP 8 order).
- Avoid `from module import *`: it hides where names come from and can overwrite yours.
- Don’t name your file after a module you import (`decimal.py`, `collections.py`): your file **shadows** the real one.
- Module-level code runs at import time: keep it to definitions and constants.
- Modules this deck uses: `collections`, `dataclasses`, `datetime`, `decimal`, `itertools`, `operator`, `copy`, `typing`, `sys`, `timeit`.

> **On the job:** Shared parsing and validation code lives in a module or package imported by notebooks, jobs and tests instead of being copy-pasted between notebooks; the `__main__` guard lets the same file run as a script and be imported by tests.

> **The main idea:** import what you need explicitly, guard script entry points with `if __name__ == "__main__":`, and reach for the standard library before installing anything.

*Read more:* [Tutorial: modules](https://docs.python.org/3/tutorial/modules.html), [The Python Standard Library](https://docs.python.org/3/library/index.html), [PEP 8: imports](https://peps.python.org/pep-0008/#imports).

---

<a id="slide-16"></a>
## 16. Exceptions: fail loudly, or quarantine the record

*Control and code · try / except / else / finally, raise, custom errors*

An **exception** is an object that interrupts normal flow when something goes wrong, as in C#. Python leans on **EAFP** (“easier to ask forgiveness than permission”: try the operation and handle the failure) rather than **LBYL** (“look before you leap”: check first).

```python
from decimal import Decimal, InvalidOperation

class ValidationError(ValueError):
    """Raised when a record breaks the cleaning contract."""

def parse_amount(text):
    try:
        value = Decimal(text)
    except InvalidOperation as e:
        raise ValidationError(f"amount is not a number: {text!r}") from e   # keep the original cause
    else:
        return value                  # runs only if no exception happened
    finally:
        pass                          # always runs (release resources, log timings)

for text in ["64.00", "abc"]:
    try:
        print(parse_amount(text))
    except ValidationError as e:
        print("rejected:", e, "| cause:", type(e.__cause__).__name__)
```

Output:

```text
64.00
rejected: amount is not a number: 'abc' | cause: InvalidOperation
```

#### The data-engineering pattern: quarantine

```python
from decimal import Decimal, InvalidOperation

good, rejected = [], []
for event_id, text in [("e3", "64.00"), ("e8", "abc"), ("e9", "0.00")]:
    try:
        good.append((event_id, Decimal(text)))
    except InvalidOperation:
        rejected.append({"event_id": event_id, "reason": f"bad amount {text!r}"})
print(good)
print(rejected)
```

Output:

```text
[('e3', Decimal('64.00')), ('e9', Decimal('0.00'))]
[{'event_id': 'e8', 'reason': "bad amount 'abc'"}]
```

One bad record should not stop a million good ones. Catch the *specific* error, keep the record and the reason in a reject list (a **quarantine** or dead-letter list), and report the count.

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `except:` or `except Exception: pass` swallows everything, including typos (`NameError`) | Catch the narrowest exception that the operation can raise |
| Catching too much code in one `try` | Keep the try block to the one risky line; use `else` for the rest |
| Losing the original error | `raise NewError(...) from e` |
| Using exceptions for normal control flow in hot loops | Fine for rare failures; for common cases test first (`if key in d`) |
| Assuming `Decimal("x")` raises `ValueError` | It raises `decimal.InvalidOperation` |

> **On the job:** Production jobs separate record-level errors (quarantine the row with a reason and continue) from job-level errors (a missing file, bad credentials: fail the run so the scheduler alerts someone). A broad `except Exception: pass` is one of the most common review findings in data code.

> **The main idea:** raise specific exceptions with clear messages, catch them narrowly, chain causes with `from`, and in pipelines quarantine bad records instead of crashing or silently dropping them.

*Read more:* [Tutorial: errors and exceptions](https://docs.python.org/3/tutorial/errors.html), [Built-in exceptions](https://docs.python.org/3/library/exceptions.html), [EAFP](https://docs.python.org/3/glossary.html#term-EAFP).

---

<a id="slide-17"></a>
## 17. Lists: ordered, mutable sequences

*Collections · list, the everyday container*

A **list** is an ordered, resizable sequence (like C# `List<T>`, but it can hold mixed types). Indexes start at 0; negative indexes count from the end. **Slicing** `xs[start:stop:step]` returns a new list (stop is exclusive).

```python
ids = ["e1", "e2", "e3"]
ids.append("e4")               # add one item at the end
ids.extend(["e5", "e6"])       # add many
ids.insert(0, "e0")            # add at a position (slow for big lists: shifts everything)
print(ids, len(ids))
print(ids[0], ids[-1], ids[1:3], ids[::2], ids[::-1][:2])
last = ids.pop()               # remove and return the last item (fast)
print(last, "e3" in ids, ids.index("e3"))
ids.remove("e0")               # remove first matching value (searches: slow for big lists)
print(ids, sorted(ids, reverse=True))
print([0] * 3, ["a"] + ["b"])
```

Output:

```text
['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'] 7
e0 e6 ['e1', 'e2'] ['e0', 'e2', 'e4', 'e6'] ['e6', 'e5']
e6 True 3
['e1', 'e2', 'e3', 'e4', 'e5'] ['e5', 'e4', 'e3', 'e2', 'e1']
[0, 0, 0] ['a', 'b']
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `xs = xs.append(1)` sets xs to `None`: in-place methods return None | Call `xs.append(1)` on its own line |
| `xs = xs.sort()`, same reason | `xs.sort()` (in place) or `xs = sorted(xs)` (new list) |
| `xs.append([4, 5])` adds one nested list | `xs.extend([4, 5])` adds two items |
| `xs[10]` raises `IndexError` | Check `len(xs)`, or slice (`xs[10:11]` returns `[]`) |

#### Costs (n = number of items)

| Operation | Cost |
|---|---|
| `xs[i]`, `xs[i] = v`, `len(xs)` | O(1): constant time |
| `append`, `pop()` at the end | O(1) on average |
| `insert(0, v)`, `pop(0)` | O(n): shifts every item; use a deque instead |
| `v in xs`, `xs.index(v)`, `xs.remove(v)` | O(n): scans the list; use a set for membership |
| `sorted(xs)` | O(n log n) |

**O(…)** (“big O”) describes how work grows with input size: O(1) stays flat, O(n) grows in proportion, O(n log n) slightly faster than proportional.

> **On the job:** Lists hold the rows of one small batch: a page of API results, the lines of a small file, the records of a micro-batch before an insert. For inputs that may not fit in memory you stream instead (files-and-streams deck).

> **The main idea:** lists are for ordered data you append to and loop over. For fast membership tests use a set; for removing from the front use a deque.

*Read more:* [Tutorial: data structures](https://docs.python.org/3/tutorial/datastructures.html), [Sequence types](https://docs.python.org/3/library/stdtypes.html#sequence-types-list-tuple-range).

---

<a id="slide-18"></a>
## 18. Tuples and unpacking

*Collections · fixed records and multiple assignment*

A **tuple** is an immutable sequence, written with commas (parentheses are usually added for clarity). Use it for small fixed-shape records and for **composite keys** like `(user_id, day)`. **Unpacking** assigns the items of a sequence to several names at once (like C# deconstruction).

```python
key = ("u1", "2026-03-02")                 # composite key
user, day = key                            # unpacking
print(user, day)

a, b = 1, 2
a, b = b, a                                # swap without a temp variable
print(a, b)

first, *middle, last = ["e1", "e2", "e3", "e4"]   # star collects the rest into a list
print(first, middle, last)

rows = [("e1", "u1", 0), ("e3", "u1", 64)]
for event_id, user_id, amount in rows:     # unpack in the loop header
    print(event_id, user_id, amount)

single = ("only",)                         # one-item tuple needs a trailing comma
print(type(("only")).__name__, type(single).__name__)

try:
    x, y = (1, 2, 3)
except ValueError as e:
    print("ValueError:", e)
```

Output:

```text
u1 2026-03-02
2 1
e1 ['e2', 'e3'] e4
e1 u1 0
e3 u1 64
str tuple
ValueError: too many values to unpack (expected 2)
```

#### Named fields: namedtuple

```python
from collections import namedtuple

Key = namedtuple("Key", ["user_id", "day"])
k = Key("u1", "2026-03-02")
print(k.user_id, k[1], k == ("u1", "2026-03-02"))
```

Output:

```text
u1 2026-03-02 True
```

A **namedtuple** is a tuple with field names: still immutable, still usable as a dict key. For richer records use a dataclass (lesson 32).

#### When to use a tuple vs a list

| Use a tuple when… | Use a list when… |
|---|---|
| the size and meaning of each position are fixed | you add and remove items |
| you need a dict key or set member | the items are “many of the same kind” |
| you return several values from a function | you sort or change it in place |

> **On the job:** Composite keys such as `(customer_id, order_date)` or `(event_id, source)` are tuples in Python, just like composite primary keys in a table; they work as dict keys and set members because they are hashable.

> **The main idea:** tuples are lightweight immutable records and the natural type for composite keys. Unpacking makes code that handles them short and readable.

*Read more:* [Tuples and sequences](https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences), [namedtuple](https://docs.python.org/3/library/collections.html#collections.namedtuple).

---

<a id="slide-19"></a>
## 19. Dicts: records and lookups

*Collections · dict, the most important data structure in Python data code*

A **dict** maps **keys** to values using a hash table, like C# `Dictionary<K,V>`. Lookups by key are O(1) on average. Keys must be **hashable**: immutable values like str, int, tuple (of hashables), frozenset. Since Python 3.7, dicts keep **insertion order**.

In this deck a dict plays two roles: a **record** (one event, with field names as keys) and an **index** (event_id → event).

```python
event = {"event_id": "e5", "user_id": "u2", "amount": "25"}
print(event["user_id"])                    # KeyError if missing
print(event.get("ts"))                     # None if missing
print(event.get("ts", "n/a"))              # or a default
print("amount" in event, len(event))

event["amount"] = "25.00"                  # update
event["source"] = "app"                    # insert
del event["source"]                        # delete
print(list(event.keys()), list(event.values())[:2])

defaults = {"source": "app", "amount": None}
merged = defaults | event                  # merge into a new dict (3.9+); right side wins
print(merged)

by_id = {e["event_id"]: e for e in [{"event_id": "e1"}, {"event_id": "e2"}]}   # index by key
print(by_id["e2"])
```

Output:

```text
u2
None
n/a
True 3
['event_id', 'user_id', 'amount'] ['e5', 'u2']
{'source': 'app', 'amount': '25.00', 'event_id': 'e5', 'user_id': 'u2'}
{'event_id': 'e2'}
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `record["amount"]` raises `KeyError` on optional fields | `record.get("amount")` |
| `d[["a", "b"]] = 1`: `TypeError: unhashable type: 'list'` | Use a tuple key: `d[("a", "b")]` |
| Counting with `if k not in d: d[k] = 0` boilerplate everywhere | `d[k] = d.get(k, 0) + 1`, or `Counter` / `defaultdict` (lessons 27–28) |
| Assuming JSON `1` and `"1"` keys are the same | They are different keys; normalise types first |
| Using `dict.fromkeys(keys, [])` | Every key shares *one* list (lesson 25); use a comprehension |

#### Iterating

```python
totals = {"u1": 64, "u2": 25}
for user, total in totals.items():
    print(user, total)
print(max(totals, key=totals.get))        # key with the largest value
```

Output:

```text
u1 64
u2 25
u1
```

Iterating a dict directly gives its keys. Use `.items()` for key–value pairs.

> **On the job:** JSON records from APIs arrive as dicts, and lookup tables (country codes, product → category, ID → latest record) are dicts built once and queried per record: the in-memory version of a join to a small dimension.

> **The main idea:** dicts are records and indexes. Use `.get` for optional fields, tuples for composite keys, and comprehensions to build indexes.

*Read more:* [dict](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict), [hashable](https://docs.python.org/3/glossary.html#term-hashable).

---

<a id="slide-20"></a>
## 20. Sets: membership, uniqueness, and set algebra

*Collections · set and frozenset*

A **set** is an unordered collection of unique hashable values (like C# `HashSet<T>`). `x in s` is O(1) on average, compared with O(n) for a list. A **frozenset** is an immutable set, usable as a dict key or a constant.

```python
ALLOWED = frozenset({"page_view", "add_to_cart", "purchase"})
print("refund" in ALLOWED, "purchase" in ALLOWED)

seen_types = {"page_view", "purchase", "refund"}
print(sorted(seen_types - ALLOWED))       # difference: in seen, not allowed
print(sorted(seen_types & ALLOWED))       # intersection
print(sorted(seen_types | ALLOWED))       # union
print(sorted(seen_types ^ ALLOWED))       # symmetric difference: in exactly one

ids = ["e1", "e2", "e3", "e3", "e2"]
print(len(ids), len(set(ids)))            # count distinct
print(list(dict.fromkeys(ids)))           # dedupe AND keep first-seen order

empty = set()                             # {} would be an empty dict!
empty.add("e1"); empty.add("e1")
print(empty, type({}).__name__)
```

Output:

```text
False True
['refund']
['page_view', 'purchase']
['add_to_cart', 'page_view', 'purchase', 'refund']
['add_to_cart', 'refund']
5 3
['e1', 'e2', 'e3']
{'e1'} dict
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `list(set(xs))` changes the order | `list(dict.fromkeys(xs))` keeps first-seen order |
| `{}` to create an empty set | `set()` |
| Putting dicts or lists in a set: `TypeError: unhashable` | Store a hashable key: a tuple of field values, or the ID |
| Iterating a set and expecting a stable order in output | Sort before printing or comparing |

#### Data-engineering uses

- Allowed-value checks (`event_type in ALLOWED`).
- Seen-before checks during deduplication.
- Comparing two key lists: `expected - actual` = missing rows; `actual - expected` = unexpected rows.
- Distinct counts: `len({e["user_id"] for e in events})`.

> **On the job:** Reconciliation scripts compare ID sets between source and target: `source - target` are missing rows, `target - source` unexpected rows, and the intersection the matched ones. It is the first check to run when row counts disagree.

> **The main idea:** use sets whenever the question is “is it there?” or “which are different?”. They are the cheapest way to check membership and compare key lists.

*Read more:* [set and frozenset](https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset).

---

<a id="slide-21"></a>
## 21. Choosing the right collection

*Collections · a decision table*

| You need… | Use | C# equivalent | Why |
|---|---|---|---|
| Ordered items you append to and loop over | `list` | `List<T>` | Fast append and index |
| A small fixed record, or a composite key | `tuple` / `namedtuple` | tuple / `record struct` | Immutable and hashable |
| A record with named fields | `dict` (raw) → `@dataclass` (clean) | `Dictionary` → `record` | Raw input is dicts; typed objects after validation |
| Lookup by key | `dict` | `Dictionary<K,V>` | O(1) average lookup |
| “Have I seen this?” / distinct values | `set` | `HashSet<T>` | O(1) average membership |
| Constant set of allowed values | `frozenset` | `ImmutableHashSet` | Cannot be changed by accident |
| Counts per key | `collections.Counter` | `Dictionary<K,int>` + GroupBy | `most_common`, arithmetic |
| Lists per key (grouping) | `collections.defaultdict(list)` | `GroupBy` / `ILookup` | No missing-key boilerplate |
| Queue, or the last N items | `collections.deque` | `Queue<T>` / `LinkedList<T>` | O(1) at both ends, optional maxlen |
| Millions of numbers or rows | Arrow, NumPy, pandas, Polars, Spark (later decks) | arrays / DataFrames | Plain Python objects cost ~30–100 bytes each |

```python
events = [{"event_id": "e1", "user_id": "u1"}, {"event_id": "e5", "user_id": "u2"}, {"event_id": "e3", "user_id": "u1"}]

by_id = {e["event_id"]: e for e in events}            # dict: lookup
users = {e["user_id"] for e in events}                # set: distinct
order = [e["event_id"] for e in events]               # list: sequence
pairs = [(e["user_id"], e["event_id"]) for e in events]   # tuples: keys
print(by_id["e5"]["user_id"], sorted(users), order, pairs[0])
```

Output:

```text
u2 ['u1', 'u2'] ['e1', 'e5', 'e3'] ('u1', 'e1')
```

> **On the job:** Slow Python jobs in code review are often the wrong container: list membership inside a loop over a million records, or `list.pop(0)` used as a queue. Choosing the collection by the question you ask (lookup, order, uniqueness, count) is usually the whole fix.

> **The main idea:** pick the collection by the question you will ask most often: “in order?” → list, “by key?” → dict, “seen?” → set, “how many?” → Counter, “group of?” → defaultdict(list), “from the front?” → deque.

*Read more:* [Tutorial: data structures](https://docs.python.org/3/tutorial/datastructures.html), [collections](https://docs.python.org/3/library/collections.html).

---

<a id="slide-22"></a>
## 22. Comprehensions and generator expressions

*Collections · Python’s LINQ Select / Where*

A **comprehension** builds a new collection from an iterable in one expression: `[expr for x in items if condition]`. It reads like LINQ `items.Where(condition).Select(expr)`. Square brackets give a list, braces give a set or (with `k: v`) a dict. Round brackets give a **generator expression**: a lazy sequence that produces items one at a time without building a list (like C# `IEnumerable` with `yield`).

```python
purchases = [e for e in RAW_EVENTS if e["event_type"] == "purchase"]                       # filter
print([e["event_id"] for e in purchases])                                                     # map
print(sorted({e["user_id"] for e in RAW_EVENTS if e["user_id"]}))                             # set (sorted: set order varies per run)
print({e["event_id"]: e["amount"] for e in RAW_EVENTS if e["event_type"] == "add_to_cart"})   # dict (later keys win)
print(sum(1 for e in RAW_EVENTS if e["amount"] in (None, "")))                                # generator: count
print(any(e["user_id"] is None for e in RAW_EVENTS), all(e["event_id"] for e in RAW_EVENTS))
pairs = [(u, t) for u in ("u1", "u2") for t in ("view", "buy")]                              # nested: like SelectMany
print(pairs)
```

Output:

```text
['e3', 'e3', 'e5', 'e6', 'e8', 'e9']
[' U2 ', 'u1', 'u2', 'u3']
{'e2': '42.00'}
2
True True
[('u1', 'view'), ('u1', 'buy'), ('u2', 'view'), ('u2', 'buy')]
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| A three-level nested comprehension nobody can read | Use a normal `for` loop; comprehensions are for simple transforms |
| Side effects inside a comprehension (`[print(x) for x in xs]`) | Use a `for` loop for actions; comprehensions are for building values |
| Building a huge list only to sum or test it | Use a generator: `sum(x for x in xs)`, `any(…)` |
| Reusing a generator: the second pass is empty | Generators are single-use; build a list if you need several passes |
| Expecting the dict comprehension to keep the first duplicate key | Later keys overwrite earlier ones (e2 shows 42.00) |

#### Generators are single-use

```python
gen = (n * n for n in range(4))
print(sum(gen))     # first pass consumes it
print(sum(gen))     # BUG: already exhausted -> 0
```

Output:

```text
14
0
```

A generator holds only its current position, not all items, so memory stays flat no matter how many items it yields. That is how streaming pipelines process data bigger than memory.

> **On the job:** Comprehensions are the everyday filter-and-map step in notebooks and scripts (select fields, drop invalid rows). Generator expressions feed `sum()`, `max()` or a file writer without building a list, which keeps memory flat on large inputs.

> **The main idea:** use comprehensions for simple filter-and-map steps, generator expressions when you only aggregate or test, and plain loops when the logic needs several statements.

*Read more:* [List comprehensions](https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions), [generator expression](https://docs.python.org/3/glossary.html#term-generator-expression).

---

<a id="slide-23"></a>
## 23. Sorting with keys

*Collections · sorted(), key functions, and stability*

`sorted(items, key=f)` returns a new list ordered by `f(item)`; `items.sort(key=f)` sorts a list in place. The **key function** is called once per item. Sorting is **stable**: items with equal keys keep their original order, which lets you sort in several passes.

```python
from operator import itemgetter

rows = [
    {"id": "e5", "user": "u2", "amount": 25},
    {"id": "e3", "user": "u1", "amount": 64},
    {"id": "e2", "user": "u1", "amount": 42},
    {"id": "e9", "user": "u3", "amount": 0},
]
print([r["id"] for r in sorted(rows, key=itemgetter("amount"))])               # ascending
print([r["id"] for r in sorted(rows, key=lambda r: r["amount"], reverse=True)]) # descending
print([r["id"] for r in sorted(rows, key=lambda r: (r["user"], -r["amount"]))]) # user asc, amount desc
print(max(rows, key=itemgetter("amount"))["id"], min(rows, key=itemgetter("amount"))["id"])

words = ["purchase", "Page_View", "add_to_cart"]
print(sorted(words), sorted(words, key=str.lower))       # uppercase sorts before lowercase
```

Output:

```text
['e9', 'e5', 'e2', 'e3']
['e3', 'e2', 'e5', 'e9']
['e3', 'e2', 'e5', 'e9']
e3 e9
['Page_View', 'add_to_cart', 'purchase'] ['add_to_cart', 'Page_View', 'purchase']
```

#### Bug: None in the sort key

```python
amounts = [25, None, 0, 64]
try:
    sorted(amounts)
except TypeError as e:
    print("TypeError:", e)
# Fix: sort by (is_missing, value) so None goes last
print(sorted(amounts, key=lambda a: (a is None, a if a is not None else 0)))
```

Output:

```text
TypeError: '<' not supported between instances of 'NoneType' and 'int'
[0, 25, 64, None]
```

#### Mixed directions on non-numbers

```python
from operator import itemgetter
rows = [("u2", "e5"), ("u1", "e3"), ("u1", "e2")]
# Want: user ascending, event id DESCENDING. Can't negate a string, so sort twice:
rows = sorted(rows, key=itemgetter(1), reverse=True)   # secondary key first
rows = sorted(rows, key=itemgetter(0))                 # primary key last (stable)
print(rows)
```

Output:

```text
[('u1', 'e3'), ('u1', 'e2'), ('u2', 'e5')]
```

`operator.itemgetter("amount")` is a fast, readable replacement for `lambda r: r["amount"]`; `attrgetter("ts")` does the same for object attributes.

> **On the job:** Deterministic outputs need a total order: sort by the business key plus a tie-breaker so re-runs produce identical files and clean diffs. It is the same rule as `ORDER BY` with a tie-breaker inside a SQL window function.

> **The main idea:** sort by a key function that returns a tuple for multi-column orders; push None to the end explicitly; use two stable passes when one column must go in reverse and can’t be negated.

*Read more:* [Sorting techniques](https://docs.python.org/3/howto/sorting.html), [operator.itemgetter](https://docs.python.org/3/library/operator.html#operator.itemgetter).

---

<a id="slide-24"></a>
## 24. Names, references, and mutability

*Collections · assignment never copies*

Assignment (`b = a`) makes a second **name** for the *same* object; this is called **aliasing**. With an immutable object you can’t tell the difference. With a mutable object (list, dict, set), a change through one name is visible through the other. Function arguments work the same way (“call by sharing”): the function receives a reference to the caller’s object, as with C# reference types.

```python
a = {"event_id": "e1", "tags": ["web"]}
b = a                       # alias, not a copy
b["event_id"] = "e99"
print(a["event_id"], a is b)

def add_flag(record):
    record["flag"] = True   # mutates the caller's dict
    return record

r = {"event_id": "e2"}
add_flag(r)
print(r)

x = 10
y = x
y += 1                      # ints are immutable: += rebinds y to a NEW object
print(x, y)

s = "u1"
t = s
t += "!"                    # same for strings
print(s, t)
```

Output:

```text
e99 True
{'event_id': 'e2', 'flag': True}
10 11
u1 u1!
```

#### The rule

- **Rebinding** a name (`x = …`, `x += 1` on an int) never affects other names.
- **Mutating** an object (`.append`, `d[k] = v`, `.add`, `+=` on a list) affects every name that refers to it.
- Functions that mutate their arguments should say so in their name or docstring, and usually return `None` (like `list.sort`).
- In pipelines, prefer functions that **return new records** and leave inputs untouched: you can re-run them, test them, and compare before and after.

#### A pure alternative

```python
def with_flag(record):
    return {**record, "flag": True}   # new dict; ** unpacks the old keys

r = {"event_id": "e2"}
r2 = with_flag(r)
print(r, r2)
```

Output:

```text
{'event_id': 'e2'} {'event_id': 'e2', 'flag': True}
```

A **pure function** depends only on its arguments and changes nothing outside itself.

> **On the job:** Aliasing bugs appear when a function “cleans” a record in place and the raw record kept for the quarantine file changes too. Teams prefer transformation functions that return new records over ones that mutate their inputs.

> **The main idea:** assignment and argument passing share objects; they never copy. Mutate on purpose, document it, and prefer returning new values in data-cleaning code.

*Read more:* [FAQ: call by reference](https://docs.python.org/3/faq/programming.html#how-do-i-write-a-function-with-output-parameters-call-by-reference), [Objects, values and types](https://docs.python.org/3/reference/datamodel.html#objects-values-and-types).

---

<a id="slide-25"></a>
## 25. Shallow and deep copies

*Collections · the copy that still shares its insides*

A **shallow copy** creates a new outer container but reuses the same inner objects. `list(xs)`, `xs[:]`, `xs.copy()`, `dict(d)`, `d.copy()`, and `{**d}` are all shallow. A **deep copy** (`copy.deepcopy`) recursively copies everything inside.

```python
import copy

raw = {"event_id": "e1", "tags": ["web"], "meta": {"source": "app"}}
shallow = raw.copy()
deep = copy.deepcopy(raw)

shallow["event_id"] = "changed"      # top level: independent
shallow["tags"].append("mobile")     # nested list: SHARED with raw
deep["meta"]["source"] = "batch"     # deep copy: fully independent

print(raw)
print(shallow["tags"] is raw["tags"], deep["tags"] is raw["tags"])
```

Output:

```text
{'event_id': 'e1', 'tags': ['web', 'mobile'], 'meta': {'source': 'app'}}
True False
```

#### Bug: multiplying a list of lists

```python
grid = [[]] * 3              # three references to ONE inner list
grid[0].append("x")
print(grid)

grid = [[] for _ in range(3)]  # fix: a new inner list each time
grid[0].append("x")
print(grid)
```

Output:

```text
[['x'], ['x'], ['x']]
[['x'], [], []]
```

#### Bug: dict.fromkeys with a mutable value

```python
groups = dict.fromkeys(["u1", "u2"], [])   # one shared list
groups["u1"].append("e1")
print(groups)

groups = {u: [] for u in ["u1", "u2"]}     # fix
groups["u1"].append("e1")
print(groups)
```

Output:

```text
{'u1': ['e1'], 'u2': ['e1']}
{'u1': ['e1'], 'u2': []}
```

**When to use which:** for flat records (strings and numbers only) a shallow copy is enough and fast. For nested records you intend to change, either deep-copy or, better, build the new structure explicitly so you know exactly what is shared. `deepcopy` is slow on large data; don’t call it inside a hot loop.

> **On the job:** When a job keeps both the raw and the cleaned version of a record (for audit or quarantine), a shallow copy shares the nested lists and dicts, so cleaning one silently edits the other. Build the clean record explicitly, or deep-copy only the nested parts you change.

> **The main idea:** most copy methods are shallow. If a record contains lists or dicts and you change them, deep-copy or rebuild, or the “original” changes too.

*Read more:* [copy: shallow and deep copy](https://docs.python.org/3/library/copy.html), [FAQ: multidimensional lists](https://docs.python.org/3/faq/programming.html#how-do-i-create-a-multidimensional-list).

---

<a id="slide-26"></a>
## 26. The mutable default argument bug

*Collections · Python’s most famous gotcha*

Default values are evaluated **once**, when the `def` statement runs, not on each call. A mutable default (`[]`, `{}`, `set()`) is therefore shared by every call that doesn’t pass the argument. C# avoids this by requiring defaults to be compile-time constants.

#### The bug

```python
def collect_errors(record, errors=[]):      # BUG: one list shared by all calls
    if not record.get("user_id"):
        errors.append(f"{record['event_id']}: missing user_id")
    return errors

print(collect_errors({"event_id": "e6", "user_id": None}))
print(collect_errors({"event_id": "e1", "user_id": "u1"}))   # valid record, yet...
```

Output:

```text
['e6: missing user_id']
['e6: missing user_id']
```

#### The fix

```python
def collect_errors(record, errors=None):     # None means "not given"
    if errors is None:
        errors = []                             # a fresh list on every call
    if not record.get("user_id"):
        errors.append(f"{record['event_id']}: missing user_id")
    return errors

print(collect_errors({"event_id": "e6", "user_id": None}))
print(collect_errors({"event_id": "e1", "user_id": "u1"}))
```

Output:

```text
['e6: missing user_id']
[]
```

| Where it appears | Safe pattern |
|---|---|
| Function defaults | `def f(x, items=None): items = [] if items is None else items` |
| Dataclass fields | `tags: list[str] = field(default_factory=list)` (dataclasses refuse a plain `= []`) |
| Class attributes | Create lists in `__init__`, not in the class body |
| Immutable defaults | `0`, `""`, `None`, `()`, `frozenset()` are always safe |

Linters catch this: Ruff rule B006 and Pylint W0102 (“dangerous default value”).

> **On the job:** In production this shows up as data leaking between calls: a helper declared with `batch=[]` still holds rows from the previous file, or from the previous test. Teams catch it with a linter rule in CI rather than relying on code review.

> **The main idea:** never use a mutable object as a default value. Default to None and create the object inside the function.

*Read more:* [FAQ: why are default values shared?](https://docs.python.org/3/faq/programming.html#why-are-default-values-shared-between-objects), [Function definitions](https://docs.python.org/3/reference/compound_stmts.html#function-definitions).

---

<a id="slide-27"></a>
## 27. Counter: counting without boilerplate

*Collections · collections.Counter*

`Counter` is a dict subclass that maps items to counts. Missing keys count as 0 (reading them doesn’t insert anything). It is the Python equivalent of `GroupBy(x).Select(g => (g.Key, g.Count()))`.

```python
from collections import Counter

types = Counter(e["event_type"].strip().lower() for e in RAW_EVENTS)
print(types)
print(types.most_common(2))            # top N
print(types["refund"], types["chargeback"])   # missing -> 0
print(sum(types.values()), len(types)) # total events, distinct types

per_day = Counter()
for e in RAW_EVENTS:
    per_day[e["ingested_at"][:10]] += 1   # += works without initialising
print(sorted(per_day.items()))

monday, tuesday = Counter(a=3, b=1), Counter(a=1, c=2)
print(monday + tuesday, monday - tuesday)  # arithmetic; subtraction drops counts <= 0
```

Output:

```text
Counter({'purchase': 6, 'page_view': 2, 'add_to_cart': 2, 'refund': 1})
[('purchase', 6), ('page_view', 2)]
1 0
11 4
[('2026-03-02', 8), ('2026-03-03', 3)]
Counter({'a': 4, 'c': 2, 'b': 1}) Counter({'a': 2, 'b': 1})
```

#### Bugs and fixes

| Bug | Fix |
|---|---|
| `Counter("purchase")` counts *letters* | `Counter(["purchase"])` or a generator of whole values |
| Counting before normalising: `"Page_View"` and `"page_view"` counted apart | Normalise inside the generator (as above) |
| Expecting `most_common` ties in a specific order | Ties keep first-seen order; sort explicitly if order matters |
| Summing money with Counter | Counter is for counts; use `defaultdict(Decimal)` for amounts |

#### Counting with a composite key

```python
from collections import Counter
pairs = Counter((e["user_id"], e["event_type"]) for e in RAW_EVENTS if e["user_id"])
print(pairs[("u1", "purchase")], pairs[("u3", "purchase")])
```

Output:

```text
2 2
```

Raw counts include duplicates and invalid rows. That is why counting comes *after* cleaning in the pipeline.

> **On the job:** Data-quality reports and run summaries count values per column (event types, status codes, reject reasons). `Counter.most_common()` gives the top values for a log line or an alert in one call.

> **The main idea:** use Counter for any “how many per X” question, with a tuple key for several dimensions. Normalise values before counting.

*Read more:* [Counter](https://docs.python.org/3/library/collections.html#collections.Counter).

---

<a id="slide-28"></a>
## 28. defaultdict: grouping without key checks

*Collections · collections.defaultdict*

`defaultdict(factory)` is a dict that calls `factory()` to create a value the first time a missing key is accessed. `defaultdict(list)` groups items, `defaultdict(set)` collects distinct items, and `defaultdict(Decimal)` sums money (`Decimal()` is 0).

```python
from collections import defaultdict
from decimal import Decimal

events_by_user = defaultdict(list)
for e in RAW_EVENTS:
    if e["user_id"]:
        events_by_user[e["user_id"].strip().lower()].append(e["event_id"])
print(dict(events_by_user))

types_by_user = defaultdict(set)
for e in RAW_EVENTS:
    if e["user_id"]:
        types_by_user[e["user_id"].strip().lower()].add(e["event_type"].lower())
print({u: sorted(t) for u, t in types_by_user.items()})

from decimal import InvalidOperation

def to_decimal(text):
    try:
        return Decimal(text)
    except (InvalidOperation, TypeError):     # bad text, or None
        return None

revenue = defaultdict(Decimal)
for e in RAW_EVENTS:
    amount = to_decimal(e["amount"])
    if e["event_type"] == "purchase" and e["user_id"] and amount is not None:
        revenue[e["user_id"]] += amount
print(dict(revenue))     # still includes the e3 duplicate: clean first!
```

Output:

```text
{'u1': ['e1', 'e2', 'e3', 'e3', 'e2'], 'u2': ['e4', 'e5'], 'u3': ['e7', 'e8', 'e9']}
{'u1': ['add_to_cart', 'page_view', 'purchase'], 'u2': ['page_view', 'purchase'], 'u3': ['purchase', 'refund']}
{'u1': Decimal('128.00'), 'u2': Decimal('25'), 'u3': Decimal('0.00')}
```

#### Bug: reading inserts

```python
from collections import defaultdict
counts = defaultdict(int)
counts["u1"] += 1
if counts["u9"] == 0:        # just LOOKING at a missing key inserts it
    pass
print(dict(counts))
print("u9" in counts, counts.get("u5"))   # 'in' and .get() do not insert
```

Output:

```text
{'u1': 1, 'u9': 0}
True None
```

#### Equivalent plain-dict patterns

```python
groups = {}
for user, event_id in [("u1", "e1"), ("u2", "e5"), ("u1", "e3")]:
    groups.setdefault(user, []).append(event_id)   # insert [] if missing, return the list
print(groups)
```

Output:

```text
{'u1': ['e1', 'e3'], 'u2': ['e5']}
```

`setdefault` works on any dict. Convert a defaultdict to a plain dict (`dict(dd)`) before returning it, so callers don’t get surprise inserts.

> **On the job:** Grouping records before writing (one output file per day, one batch per customer, distinct users per day) is a `defaultdict(list)` or `defaultdict(set)`: `GROUP BY` for data that has not reached a database yet.

> **The main idea:** defaultdict(list) groups, defaultdict(set) collects distinct values, defaultdict(Decimal) sums money. Use `in` or `.get()` to check keys without inserting.

*Read more:* [defaultdict](https://docs.python.org/3/library/collections.html#collections.defaultdict), [dict.setdefault](https://docs.python.org/3/library/stdtypes.html#dict.setdefault).

---

<a id="slide-29"></a>
## 29. deque: queues and sliding windows

*Collections · collections.deque*

A **deque** (“deck”, double-ended queue) supports O(1) appends and pops at *both* ends. `list.pop(0)` is O(n) because every item shifts left. With `maxlen`, a deque keeps only the newest N items, which is ideal for “last N events” and sliding windows.

```python
from collections import deque

queue = deque(["e1", "e2"])
queue.append("e3")           # enqueue at the right
first = queue.popleft()      # dequeue from the left: O(1)
print(first, queue)

recent = deque(maxlen=3)     # keep only the last 3
for event_id in ["e1", "e2", "e3", "e4", "e5"]:
    recent.append(event_id)  # oldest falls off automatically
print(list(recent))

# Sliding time window: how many events in the last 10 minutes, at each event?
times = [0, 2, 4, 11, 12, 30]           # minutes since start, already sorted
window = deque()
for t in times:
    window.append(t)
    while window[0] <= t - 10:          # drop events older than 10 minutes
        window.popleft()
    print(f"t={t:>2}: {len(window)} event(s) in window")
```

Output:

```text
e1 deque(['e2', 'e3'])
['e3', 'e4', 'e5']
t= 0: 1 event(s) in window
t= 2: 2 event(s) in window
t= 4: 3 event(s) in window
t=11: 3 event(s) in window
t=12: 3 event(s) in window
t=30: 1 event(s) in window
```

#### When to use it

- Work queues (breadth-first processing, retry queues).
- Last-N buffers: recent errors, recent events per user.
- Sliding windows over sorted timestamps: rate limits, burst detection, rolling counts.
- Not for random access in the middle: `dq[i]` is O(n) away from the ends.

#### C# mapping

`deque.append`/`popleft` ≈ `Queue.Enqueue`/`Dequeue`; `appendleft`/`pop` make it a stack at the other end too, like `LinkedList<T>`. A deque is **not** thread-safe as a work queue between threads: use `queue.Queue` for that (concurrency is covered in the files-and-streams deck).

> **On the job:** Sliding windows over a sorted stream (the last N readings, events in the last 30 minutes for rate checks or sessions) and simple work queues use deques; `maxlen` bounds the memory automatically.

> **The main idea:** use a deque when you remove from the front or need only the newest N items; with a sorted input it turns sliding-window questions into one linear pass.

*Read more:* [deque](https://docs.python.org/3/library/collections.html#collections.deque).

---

<a id="slide-30"></a>
## 30. Practical time and memory costs

*Collections · the numbers that decide your design*

| Operation | list | dict / set | deque |
|---|---|---|---|
| Add at the end | O(1)* | O(1)* insert | O(1) |
| Remove from the front | **O(n)** | — | O(1) |
| Membership `x in c` | **O(n)** | O(1)* average | O(n) |
| Get by index / key | O(1) | O(1)* average | O(n) in the middle |
| Delete a given value | O(n) | O(1)* average | O(n) |
| Sort | O(n log n) | — | — |

* average or amortised (“averaged over many operations”). The practical consequence: a lookup inside a loop multiplies. Checking 100,000 events against a 100,000-item *list* is ~10¹⁰ steps; against a *set* it is ~10⁵.

#### Measured: list vs set membership

```python
import timeit
ids_list = [f"e{i}" for i in range(100_000)]
ids_set = set(ids_list)
probe = "e99999"                       # worst case for the list: near the end
t_list = timeit.timeit(lambda: probe in ids_list, number=200)
t_set = timeit.timeit(lambda: probe in ids_set, number=200)
print(f"list: {t_list / 200 * 1e6:,.1f} µs per lookup")
print(f"set:  {t_set / 200 * 1e6:,.3f} µs per lookup")
```

Output (measured on the build machine (CPython 3.12.10, Windows laptop); your numbers will differ):

```text
list: 595.9 µs per lookup
set:  0.038 µs per lookup
```

#### Memory: why DataFrames exist

```python
import sys
print(sys.getsizeof(1), sys.getsizeof(2**100))   # bytes for one int object
print(sys.getsizeof("u1"), sys.getsizeof(1.5))
row = {"event_id": "e1", "user_id": "u1", "amount": 64}
print(sys.getsizeof(row))                        # the dict alone, not its contents
print(sys.getsizeof([0] * 1000), sys.getsizeof(range(1000)))
```

Output:

```text
28 40
43 24
184
8056 48
```

`sys.getsizeof` reports the object itself (on 64-bit CPython 3.12.10), not what it points to. A row stored as a dict of small objects costs a few hundred bytes; a million rows is hundreds of MB. Columnar libraries (Arrow, Polars, pandas) store a column of a million int64 values in about 8 MB.

- Use generators to **stream** records instead of materialising lists when you only need one pass.
- Build lookup dicts and sets **once**, outside the loop.
- Measure with `timeit` before optimising; readability first for small data.

> **On the job:** Rough estimates decide designs: ten million small dicts at several hundred bytes each need gigabytes of RAM, which is the point where you switch to streaming, Arrow/pandas columns, or a database instead of Python objects.

> **The main idea:** choose sets and dicts for lookups inside loops, deques for queues, and generators for single passes. When rows reach the millions, move to columnar DataFrames.

*Read more:* [Python wiki: time complexity](https://wiki.python.org/moin/TimeComplexity), [timeit](https://docs.python.org/3/library/timeit.html), [sys.getsizeof](https://docs.python.org/3/library/sys.html#sys.getsizeof).

---

<a id="slide-31"></a>
## 31. Type hints: documentation that tools can check

*Collections · annotations, Optional, and checkers*

**Type hints** (annotations) declare the intended type of a parameter, return value, or variable. Python itself **ignores** them at runtime; tools like **mypy** or **Pyright** (the engine behind VS Code’s Pylance) check them before you run the code, much like the C# compiler. They also make editor autocomplete work.

```python
from decimal import Decimal
from typing import Callable, TypedDict

def parse_amount(text: str | None) -> Decimal | None:     # X | None = "optional" (3.10+)
    if text is None or text.strip() == "":
        return None
    return Decimal(text)

totals: dict[str, Decimal] = {}                 # built-in generics (3.9+)
ids: list[str] = ["e1", "e2"]
key: tuple[str, str] = ("u1", "2026-03-02")

class RawEvent(TypedDict):                      # describes the shape of a dict
    event_id: str
    user_id: str | None
    amount: str | None

def apply(f: Callable[[str], str], values: list[str]) -> list[str]:
    return [f(v) for v in values]

def double(x: int) -> int:
    return x * 2

print(parse_amount(" 25 "), apply(str.upper, ids))
print(double("ab"))           # hints are NOT enforced at runtime: a str "works" and returns "abab"
print(parse_amount.__annotations__["return"])
```

Output:

```text
25 ['E1', 'E2']
abab
decimal.Decimal | None
```

#### What a checker reports

```text
$ mypy cleaning.py          # the code above, saved as cleaning.py (mypy 2.4.0)
cleaning.py:25: error: Argument 1 to "double" has incompatible type "str"; expected "int"  [arg-type]
Found 1 error in 1 file (checked 1 source file)
```

Run a checker in CI or your editor. Annotate function signatures first; local variables are usually inferred.

#### C# ↔ Python

| C# | Python hint |
|---|---|
| `string?` | `str \| None` (older: `Optional[str]`) |
| `List<string>` | `list[str]` |
| `Dictionary<string, decimal>` | `dict[str, Decimal]` |
| `Func<string, int>` | `Callable[[str], int]` |
| `IEnumerable<T>` | `Iterable[T]` from `collections.abc` |
| `object` / `dynamic` | `object` / `Any` |

> **On the job:** Typed signatures plus mypy or Pyright in CI catch `None`-handling and wrong-type bugs before a run, document shared pipeline libraries, and are read directly by tools such as dataclasses and pydantic.

> **The main idea:** annotate function signatures and run mypy or Pyright: you get compile-time-style feedback without losing Python’s flexibility. Remember that hints never validate data at runtime.

*Read more:* [typing](https://docs.python.org/3/library/typing.html), [PEP 484: type hints](https://peps.python.org/pep-0484/), [mypy](https://mypy.readthedocs.io/en/stable/).

---

<a id="slide-32"></a>
## 32. Dataclasses: typed records

*Collections · @dataclass, defaults, frozen, validation*

A **dataclass** is a class whose `__init__`, `__repr__` (printable form), and `__eq__` are generated from its annotated fields, like a C# `record`. The usual pattern: raw input arrives as dicts; after validation it becomes a dataclass, so the rest of the code works with typed, named fields.

```python
from dataclasses import dataclass, field, asdict, replace
from datetime import datetime, timezone
from decimal import Decimal

@dataclass(frozen=True, slots=True)          # frozen: immutable; slots: smaller and faster objects (3.10+)
class Event:
    event_id: str
    user_id: str
    event_type: str
    ts: datetime
    amount: Decimal | None = None             # fields with defaults come last
    tags: tuple[str, ...] = ()                # immutable default is safe

    def __post_init__(self):                  # runs after the generated __init__: validate here
        if self.ts.tzinfo is None:
            raise ValueError("ts must be timezone-aware")
        if self.amount is not None and self.amount < 0:
            raise ValueError("amount must be >= 0")

e = Event("e3", "u1", "purchase", datetime(2026, 3, 2, 9, 3, tzinfo=timezone.utc), Decimal("64.00"))
print(e)
print(e == replace(e), e.amount, asdict(e)["event_type"])
try:
    e.amount = Decimal("1")                   # frozen: can't change
except Exception as ex:
    print(type(ex).__name__)
try:
    Event("e7", "u3", "purchase", datetime(2026, 3, 3), Decimal("-5"))
except ValueError as ex:
    print("ValueError:", ex)
```

Output:

```text
Event(event_id='e3', user_id='u1', event_type='purchase', ts=datetime.datetime(2026, 3, 2, 9, 3, tzinfo=datetime.timezone.utc), amount=Decimal('64.00'), tags=())
True 64.00 purchase
FrozenInstanceError
ValueError: ts must be timezone-aware
```

#### Mutable fields need default_factory

```python
from dataclasses import dataclass, field

@dataclass
class Batch:
    name: str
    errors: list[str] = field(default_factory=list)   # new list per instance

a, b = Batch("a"), Batch("b")
a.errors.append("bad row")
print(a.errors, b.errors)
```

Output:

```text
['bad row'] []
```

Writing `errors: list[str] = []` raises `ValueError: mutable default … is not allowed`: dataclasses protect you from the lesson-26 bug.

#### Dict vs dataclass vs others

| Choice | Use for |
|---|---|
| `dict` | Raw, unvalidated input with unknown or optional keys |
| `@dataclass` | Validated records inside your code; typed fields, equality, readable output |
| `frozen=True` | Records that should never change after creation; hashable, usable as keys |
| `NamedTuple` | Tiny immutable records that must also behave like tuples |
| Pydantic (third-party) | Parsing and validating untrusted input with type coercion (common with APIs) |

> **On the job:** After validation, records move between pipeline steps as frozen dataclasses (or pydantic models when parsing untrusted API input). A typo in a field name then fails immediately instead of quietly creating a new dict key.

> **The main idea:** convert validated dicts into frozen dataclasses: you get typed fields, free equality and printing, immutability, and one place (`__post_init__`) for invariants.

*Read more:* [dataclasses](https://docs.python.org/3/library/dataclasses.html), [PEP 557: data classes](https://peps.python.org/pep-0557/).

---

<a id="slide-33"></a>
## 33. Worked example 1: parse raw records

*Practice · text → fields → typed values*

**Parsing** turns raw text into structured values. Do it in small functions that either return a clean value or raise a clear `ValueError`, so the caller can decide what to do with the failure. Here we parse the pipe-delimited `RAW_LINES` from lesson 3.

```python
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

FIELDS = ("event_id", "user_id", "event_type", "ts", "amount")
CENT = Decimal("0.01")

def parse_line(line: str) -> dict[str, str]:
    """Split one pipe-delimited line into a dict of trimmed strings."""
    parts = [p.strip() for p in line.split("|")]
    if len(parts) != len(FIELDS):
        raise ValueError(f"expected {len(FIELDS)} fields, got {len(parts)}: {line!r}")
    return dict(zip(FIELDS, parts))

def parse_ts(text: str) -> datetime:
    """ISO 8601 with an offset -> aware UTC datetime."""
    dt = datetime.fromisoformat(text.strip())          # raises ValueError on bad text
    if dt.tzinfo is None:
        raise ValueError(f"timestamp has no offset: {text!r}")
    return dt.astimezone(timezone.utc)

def parse_amount(text: str | None) -> Decimal | None:
    """'' or None -> None; otherwise a finite Decimal rounded to cents."""
    if text is None or text.strip() == "":
        return None
    try:
        value = Decimal(text.strip())
    except InvalidOperation:
        raise ValueError(f"amount is not a number: {text!r}") from None
    if not value.is_finite():                          # Decimal("NaN") parses!
        raise ValueError(f"amount is not finite: {text!r}")
    return value.quantize(CENT, rounding=ROUND_HALF_UP)

for line in RAW_LINES:
    try:
        rec = parse_line(line)
        print(rec["event_id"], rec["event_type"], parse_ts(rec["ts"]).isoformat(), parse_amount(rec["amount"]))
    except ValueError as e:
        print("REJECT:", e)
```

Output:

```text
e10 page_view 2026-03-04T12:00:00+00:00 None
e11 purchase 2026-03-04T12:05:00+00:00 19.99
e12 PURCHASE 2026-03-04T13:00:00+00:00 7.50
REJECT: expected 5 fields, got 4: 'e13|u5|purchase|2026-03-04T13:10:00Z'
```

#### Design choices

- Each parser handles **one field** and is testable alone.
- Parsers **raise**; they don’t print or log. The caller decides between “reject” and “crash”.
- `raise … from None` hides the low-level `InvalidOperation` traceback because our message already explains it; use `from e` when the cause helps debugging.
- Strings stay strings until a parser converts them; nothing is *half*-converted.

#### What happened to each line

| Line | Result |
|---|---|
| e10 | parsed; empty amount → None |
| e11 | parsed; amount 19.99 |
| e12 | parsed after trimming spaces; type still upper-case (normalising is validation’s job) |
| e13 | rejected: only 4 fields |

> **The main idea:** parse in small, single-purpose functions that return a typed value or raise ValueError with the offending input in the message.

*Read more:* [str.split](https://docs.python.org/3/library/stdtypes.html#str.split), [decimal](https://docs.python.org/3/library/decimal.html), [datetime.fromisoformat](https://docs.python.org/3/library/datetime.html#datetime.datetime.fromisoformat).

---

<a id="slide-34"></a>
## 34. Worked example 2: validate and collect every error

*Practice · enforce the contract, report all problems at once*

**Validation** checks a parsed record against the rules from lesson 3. Collect *all* errors for a record instead of stopping at the first: the person fixing the source wants the full list. Valid records become `Event` dataclasses; invalid ones go to a reject list with reasons.

```python
from dataclasses import dataclass

ALLOWED_TYPES = frozenset({"page_view", "add_to_cart", "purchase"})
MONEY_TYPES = frozenset({"add_to_cart", "purchase"})

@dataclass(frozen=True, slots=True)
class Event:
    event_id: str
    user_id: str
    event_type: str
    ts: datetime
    amount: Decimal | None
    ingested_at: datetime

def validate(raw: dict) -> tuple[Event | None, list[str]]:
    errors: list[str] = []
    event_id = (raw.get("event_id") or "").strip()
    if not event_id:
        errors.append("event_id is required")
    user_id = (raw.get("user_id") or "").strip().lower()      # None -> "" -> error below
    if not user_id:
        errors.append("user_id is required")
    event_type = (raw.get("event_type") or "").strip().lower()
    if event_type not in ALLOWED_TYPES:
        errors.append(f"event_type {raw.get('event_type')!r} is not allowed")
    try:
        ts = parse_ts(raw.get("ts") or "")
    except ValueError:
        ts = None
        errors.append(f"ts {raw.get('ts')!r} is not an ISO 8601 timestamp with offset")
    try:
        amount = parse_amount(raw.get("amount"))
    except ValueError as e:
        amount = None
        errors.append(str(e))
    else:
        if amount is not None and amount < 0:
            errors.append("amount must be >= 0")
        if event_type in MONEY_TYPES and amount is None:
            errors.append(f"amount is required for {event_type}")
        if event_type == "page_view" and amount is not None:
            errors.append("page_view must not have an amount")
    ingested_at = parse_ts(raw["ingested_at"])                 # trusted: set by our own system
    if errors:
        return None, errors
    return Event(event_id, user_id, event_type, ts, amount, ingested_at), []

valid, rejected = [], []
for raw in RAW_EVENTS:
    event, errors = validate(raw)
    if event:
        valid.append(event)
    else:
        rejected.append((raw.get("event_id"), errors))

print(len(valid), "valid:", [e.event_id for e in valid])
for event_id, errors in rejected:
    print("REJECT", event_id, errors)
```

Output:

```text
8 valid: ['e1', 'e2', 'e3', 'e3', 'e4', 'e5', 'e9', 'e2']
REJECT e6 ['user_id is required']
REJECT e7 ["event_type 'refund' is not allowed", "ts 'not-a-date' is not an ISO 8601 timestamp with offset", 'amount must be >= 0']
REJECT e8 ["amount is not a number: 'abc'"]
```

#### Notice

- `(raw.get("user_id") or "")` maps both `None` and a missing key to `""` before calling string methods, so `.strip()` never runs on None. Here the falsy-to-default trick is safe because an empty ID is invalid anyway.
- e7 gets **three** errors at once.
- e9 (0.00) passes: we test `amount is None`, not `not amount`.
- Duplicates (e2, e3) are still present: 8 valid records, but only 6 unique events.

#### Alternatives you will meet

Libraries such as **Pydantic** or **pandera** express these rules declaratively, and Spark/SQL pipelines put them in data-quality checks. The logic is the same: parse, check each rule, collect failures, route rejects.

> **The main idea:** validate every field, collect all errors per record, return either a typed Event or a list of reasons, and never let a bad record crash the batch.

*Read more:* [Tutorial: errors and exceptions](https://docs.python.org/3/tutorial/errors.html), [dataclasses](https://docs.python.org/3/library/dataclasses.html).

---

<a id="slide-35"></a>
## 35. Worked example 3: deduplicate by a stated rule

*Practice · “latest ingested wins; ties go to the later record”*

**Deduplication** removes records that represent the same real-world event. Always **state the rule** first: what makes two records “the same” (the **key**) and which one survives (the **tie-breaker**). Ours: same `event_id` → keep the latest `ingested_at`; on equal `ingested_at`, keep the one later in the input.

```python
def dedupe_latest(events: list[Event]) -> tuple[list[Event], int]:
    """Keep one Event per event_id: max (ingested_at, input position)."""
    best: dict[str, tuple[datetime, int, Event]] = {}
    for position, e in enumerate(events):
        candidate = (e.ingested_at, position, e)
        current = best.get(e.event_id)
        if current is None or candidate[:2] > current[:2]:     # tuples compare item by item
            best[e.event_id] = candidate
    kept = [entry[2] for entry in best.values()]
    return kept, len(events) - len(kept)

unique, dropped = dedupe_latest(valid)
print("dropped:", dropped)
for e in sorted(unique, key=lambda e: (e.ts, e.event_id)):
    print(e.event_id, e.user_id, e.event_type, e.ts.strftime("%Y-%m-%d %H:%M"), e.amount)
```

Output:

```text
dropped: 2
e1 u1 page_view 2026-03-02 09:00 None
e2 u1 add_to_cart 2026-03-02 09:01 42.00
e3 u1 purchase 2026-03-02 09:03 64.00
e4 u2 page_view 2026-03-02 09:15 None
e5 u2 purchase 2026-03-02 09:20 25.00
e9 u3 purchase 2026-03-03 08:30 0.00
```

#### Common dedupe rules

| Rule | Key | Keep | Implementation |
|---|---|---|---|
| Exact duplicate | all fields | any | `set` of tuples, or `dict.fromkeys` |
| First seen wins | business key | first | `seen` set; skip if already seen (exercise 6) |
| Latest version wins (this one) | event_id | max (ingested_at, position) | dict of best-so-far |
| Natural key | (user, type, ts) | first | tuple key when the source has no ID |
| Highest priority source | id | min source rank | tuple key (rank, …) |

#### Why the tie-breaker matters

Without it, “latest” is ambiguous when two records share a timestamp, and the result depends on input order or dict internals, so re-runs could differ. Including the input **position** makes the rule **deterministic**: the same input always produces the same output.

This is exactly `ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingested_at DESC, position DESC) = 1` from the SQL deck, written in Python.

> **The main idea:** write the dedupe rule as a sentence (key + winner + tie-breaker) before coding, then implement it with a dict of best-so-far records keyed by the dedupe key.

*Read more:* [Tutorial: dictionaries](https://docs.python.org/3/tutorial/datastructures.html#dictionaries), [Sorting techniques](https://docs.python.org/3/howto/sorting.html).

---

<a id="slide-36"></a>
## 36. Worked example 4: group and count

*Practice · Counter, defaultdict, and composite keys*

With clean, unique events, the questions become easy. Each aggregation answers a “how many / how much *per* X” question; X becomes the key.

```python
from collections import Counter, defaultdict

by_type = Counter(e.event_type for e in unique)
revenue_by_user: defaultdict[str, Decimal] = defaultdict(Decimal)
purchases_by_day = Counter()
users_by_type: defaultdict[str, set[str]] = defaultdict(set)

for e in unique:
    users_by_type[e.event_type].add(e.user_id)
    if e.event_type == "purchase":
        revenue_by_user[e.user_id] += e.amount
        purchases_by_day[e.ts.date().isoformat()] += 1       # UTC day

print(dict(sorted(by_type.items())))
print(dict(sorted(revenue_by_user.items())))
print(dict(sorted(purchases_by_day.items())))
print({t: len(u) for t, u in sorted(users_by_type.items())})
print("top spender:", max(revenue_by_user.items(), key=lambda kv: (kv[1], kv[0])))
print("conversion:", f"{len(users_by_type['purchase']) / len({e.user_id for e in unique}):.0%}")
```

Output:

```text
{'add_to_cart': 1, 'page_view': 2, 'purchase': 3}
{'u1': Decimal('64.00'), 'u2': Decimal('25.00'), 'u3': Decimal('0.00')}
{'2026-03-02': 2, '2026-03-03': 1}
{'add_to_cart': 1, 'page_view': 2, 'purchase': 3}
top spender: ('u1', Decimal('64.00'))
conversion: 100%
```

#### Read it as SQL

```sql
-- by_type
SELECT event_type, COUNT(*) FROM clean_events GROUP BY event_type;
-- revenue_by_user
SELECT user_id, SUM(amount) FROM clean_events WHERE event_type = 'purchase' GROUP BY user_id;
-- users_by_type
SELECT event_type, COUNT(DISTINCT user_id) FROM clean_events GROUP BY event_type;
```

#### Notes

- u3 appears in revenue with **0.00**: a real zero is kept, not treated as missing.
- Sort dict items before printing so output is stable and diffable.
- The `max` key `(revenue, user)` breaks ties deterministically.
- Ratios are computed *after* aggregation from additive parts (dimensional-modeling deck, non-additive measures).

> **The main idea:** aggregations are dictionaries keyed by the “per X” dimension: Counter for counts, defaultdict(Decimal) for sums, defaultdict(set) for distinct counts.

*Read more:* [Counter](https://docs.python.org/3/library/collections.html#collections.Counter), [defaultdict](https://docs.python.org/3/library/collections.html#collections.defaultdict).

---

<a id="slide-37"></a>
## 37. Bug clinic: the mistakes that corrupt data silently

*Practice · symptom → cause → fix*

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | Zero-amount purchases disappear | `if amount:` treats 0 as missing | `if amount is not None:` | 7 |
| 2 | Totals off by fractions of a cent | Money stored as float | `Decimal(str)` + `quantize` | 9 |
| 3 | Events sorted in the wrong order across time zones | Sorting raw timestamp strings | Parse to aware UTC datetimes, then sort | 10 |
| 4 | “Valid” record shows another record’s errors | Mutable default argument | Default to `None` | 26 |
| 5 | Cleaning step changes the raw input | Mutating the caller’s dict / shallow copy | Return new records; deep-copy nested data | 24–25 |
| 6 | Every group contains every item | `[[]] * n` or `dict.fromkeys(k, [])` | Comprehension creating a new list per key | 25 |
| 7 | Items silently skipped in a loop | Removing from a list while iterating it | Build a new filtered list | 12 |
| 8 | `"Page_View"` and `"page_view"` counted separately | Counting before normalising | Normalise, then count | 27 |
| 9 | Pipeline crashes on one bad row | No exception handling per record | Quarantine with reasons | 16 |
| 10 | Pipeline “succeeds” but loses rows | `except Exception: pass` | Catch specific errors and count rejects | 16 |
| 11 | Different results on re-run | Dedupe without a tie-breaker; iterating a set | Deterministic keys; sort before output | 20, 35 |
| 12 | Job slows down dramatically as data grows | `x in list` or `list.pop(0)` inside a loop | Use a set or a deque | 29–30 |
| 13 | `xs` is `None` after sorting | `xs = xs.sort()` | `xs.sort()` or `xs = sorted(xs)` | 17 |
| 14 | Variable unexpectedly empty or wrong in a closure | Late binding in a loop | Bind with a default argument | 14 |

A good habit: after each cleaning step, assert simple **invariants** (facts that must always hold): input count = valid + rejected; unique IDs after dedupe; no negative amounts; every timestamp has `tzinfo == timezone.utc`. They catch most of the bugs above.

> **The main idea:** the dangerous bugs in data code don’t crash; they change numbers. Know these fourteen, and protect each pipeline step with a couple of asserted invariants.

---

<a id="slide-38"></a>
## 38. Exercises 1–3: values, strings, mutability

*Exercises · parsing and the classic traps*

Write the function, then run the tests under it. All tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 1 · Clean an amount

Write `clean_amount(text)` for the rules in lesson 3: `None` or blank text → `None`; otherwise a finite, non-negative `Decimal` rounded half-up to 2 places. Raise `ValueError` (with the text in the message) for anything else.

```python
from decimal import Decimal

def clean_amount(text: str | None) -> Decimal | None:
    ...

assert clean_amount(None) is None
assert clean_amount("   ") is None
assert clean_amount(" 0.00 ") == Decimal("0.00")      # zero is valid!
assert str(clean_amount("25")) == "25.00"
assert clean_amount("19.995") == Decimal("20.00")
for bad in ["abc", "-5", "NaN", "1e999999999"]:
    try:
        clean_amount(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"{bad!r} should be rejected")
```

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Parse key=value text

Some feeds send records as `"user=u1; type=purchase; amount=25"`. Write `parse_kv(text)` that returns a dict of trimmed, lower-case keys to trimmed values. Ignore empty segments (e.g. a trailing `;`). Raise `ValueError` for a segment without `=` or for a repeated key. Values may contain `=`.

```python
def parse_kv(text: str) -> dict[str, str]:
    ...

assert parse_kv("user=u1; type=purchase;amount=25 ;") == {"user": "u1", "type": "purchase", "amount": "25"}
assert parse_kv(" Note = a=b ") == {"note": "a=b"}
assert parse_kv("") == {}
for bad in ["user=u1; broken", "a=1; A=2"]:
    try:
        parse_kv(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(bad)
```

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Bug hunt: tags that leak between records

This function is supposed to return a *new* record with one more tag, leaving the input untouched. Explain the bugs, then rewrite it so the tests pass.

```python
def add_tag(record, tag, tags=[]):
    tags.append(tag)
    record["tags"] = tags
    return record

# Tests for the fixed version
r = {"event_id": "e1"}
r1 = add_tag(r, "web")
r2 = add_tag(r1, "promo")
assert r == {"event_id": "e1"}                     # input untouched
assert r1["tags"] == ["web"]
assert r2["tags"] == ["web", "promo"]
assert r1["tags"] is not r2["tags"]                # no shared lists
assert add_tag({"event_id": "e2"}, "x")["tags"] == ["x"]
```

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

> **The main idea:** each exercise targets one trap from the bug clinic: truthiness and Decimal errors, string splitting, and shared mutable state.

---

<a id="slide-39"></a>
## 39. Exercises 4–6: grouping, sorting, deduplication

*Exercises · collections and keys*

Write the function, then run the tests under it. All tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 4 · Distinct event types per user

Write `types_per_user(rows)` returning `{user: sorted list of distinct event types}`. Normalise users and types (strip + lower) and skip rows without a user.

```python
rows = [
    {"id": "a", "user_id": " U1", "event_type": "Page_View"},
    {"id": "b", "user_id": "u1",  "event_type": "purchase"},
    {"id": "c", "user_id": None,  "event_type": "purchase"},
    {"id": "d", "user_id": "u2",  "event_type": "page_view"},
    {"id": "e", "user_id": "u1",  "event_type": "page_view"},
]

def types_per_user(rows: list[dict]) -> dict[str, list[str]]:
    ...

assert types_per_user(rows) == {"u1": ["page_view", "purchase"], "u2": ["page_view"]}
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Multi-key sort with None last

Write `sort_events(rows)` returning a *new* list ordered by `user_id` ascending, then `amount` descending with `None` after every number, then `ts` ascending (the ts strings are all UTC `Z`, so string order equals time order).

```python
from decimal import Decimal
rows = [
    {"id": "a", "user_id": "u2", "amount": Decimal("5"),  "ts": "2026-03-02T10:00:00Z"},
    {"id": "b", "user_id": "u1", "amount": None,          "ts": "2026-03-02T08:00:00Z"},
    {"id": "c", "user_id": "u1", "amount": Decimal("64"), "ts": "2026-03-02T09:00:00Z"},
    {"id": "d", "user_id": "u1", "amount": Decimal("64"), "ts": "2026-03-02T07:00:00Z"},
    {"id": "e", "user_id": "u1", "amount": Decimal("0"),  "ts": "2026-03-02T06:00:00Z"},
]

def sort_events(rows: list[dict]) -> list[dict]:
    ...

assert [r["id"] for r in sort_events(rows)] == ["d", "c", "e", "b", "a"]
assert [r["id"] for r in rows] == ["a", "b", "c", "d", "e"]      # input order unchanged
```

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · Deduplicate by natural key, keep first

A source without event IDs (the `id` here is just a row number) can only be deduplicated by a **natural key**: `(user_id, event_type, ts)`. Write `dedupe_first(rows)` returning `(kept_rows, dropped_count)`: keep the first row for each key and preserve input order.

```python
rows = [
    {"id": "a", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "b", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "c", "user_id": "u2", "event_type": "page_view", "ts": "2026-03-02T09:15:00Z"},
    {"id": "d", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "e", "user_id": "u1", "event_type": "page_view", "ts": "2026-03-02T09:03:00Z"},
]

def dedupe_first(rows: list[dict]) -> tuple[list[dict], int]:
    ...

kept, dropped = dedupe_first(rows)
assert [r["id"] for r in kept] == ["a", "c", "e"] and dropped == 2
```

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

> **The main idea:** the data structure follows from the question: groups → defaultdict, order → a key tuple, “seen before?” → a set of key tuples.

---

<a id="slide-40"></a>
## 40. Exercises 7–8: aggregation and windows

*Exercises · defaultdict, time zones, deque*

Write the function, then run the tests under it. All tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 7 · Revenue per UTC day and top spenders

Write `daily_revenue(rows)` → `{"YYYY-MM-DD": Decimal}` for purchases, grouped by the **UTC** date, and `top_users(rows, n)` → the n users with the highest purchase revenue as `(user, revenue)` pairs, highest first, ties broken by user ascending.

```python
from datetime import datetime, timezone, timedelta
from decimal import Decimal
plus2 = timezone(timedelta(hours=2))
rows = [
    {"user_id": "u1", "event_type": "purchase",  "amount": Decimal("64.00"), "ts": datetime(2026, 3, 2, 9, 3, tzinfo=timezone.utc)},
    {"user_id": "u2", "event_type": "purchase",  "amount": Decimal("25.00"), "ts": datetime(2026, 3, 2, 9, 20, tzinfo=timezone.utc)},
    {"user_id": "u2", "event_type": "purchase",  "amount": Decimal("39.00"), "ts": datetime(2026, 3, 3, 0, 30, tzinfo=plus2)},
    {"user_id": "u3", "event_type": "purchase",  "amount": Decimal("0.00"),  "ts": datetime(2026, 3, 3, 8, 30, tzinfo=timezone.utc)},
    {"user_id": "u1", "event_type": "page_view", "amount": None,             "ts": datetime(2026, 3, 3, 9, 0, tzinfo=timezone.utc)},
]

def daily_revenue(rows: list[dict]) -> dict[str, Decimal]:
    ...

def top_users(rows: list[dict], n: int) -> list[tuple[str, Decimal]]:
    ...

assert daily_revenue(rows) == {"2026-03-02": Decimal("128.00"), "2026-03-03": Decimal("0.00")}
assert top_users(rows, 2) == [("u1", Decimal("64.00")), ("u2", Decimal("64.00"))]
```

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Detect bursts with a sliding window

Fraud and bot detection often ask: did a user produce at least *k* events within any *w*-minute window? Write `bursts(events, window=timedelta(minutes=10), threshold=3)` returning the set of such users. An event at time `t` counts in the window ending at `now` if `now - t < window`. Input is `(user, ts)` pairs in any order.

```python
from datetime import datetime, timedelta, timezone
t0 = datetime(2026, 3, 2, 9, 0, tzinfo=timezone.utc)
m = lambda minutes: t0 + timedelta(minutes=minutes)
events = [("u2", m(10)), ("u1", m(0)), ("u2", m(0)), ("u1", m(4)), ("u3", m(1)), ("u2", m(5)), ("u1", m(9)), ("u3", m(0))]

def bursts(events, window=timedelta(minutes=10), threshold=3) -> set[str]:
    ...

assert bursts(events) == {"u1"}                        # u1: 0, 4, 9 -> 3 events within 10 min
assert bursts(events, threshold=2) == {"u1", "u2", "u3"}
assert bursts(events, window=timedelta(minutes=11)) == {"u1", "u2"}   # u2: 0, 5, 10
```

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

> **The main idea:** aggregate on normalised keys (UTC dates), break ties explicitly, and use a deque for any “within the last N minutes” question.

---

<a id="slide-41"></a>
## 41. Exercises 9–10: typed records and reconciliation

*Exercises · dataclasses, exceptions, sets, Counter*

Write the function, then run the tests under it. All tests are plain `assert` statements: silence means success. Hints and solutions are collapsed; the Markdown companion puts them in Appendices A and B.

### Exercise 9 · A validating dataclass

Create a frozen dataclass `Purchase(event_id: str, user_id: str, amount: Decimal, ts: datetime)` and a `@classmethod from_raw(raw: dict)` that normalises the user (strip + lower), parses `amount` (required, ≥ 0, 2 dp) and `ts` (aware, converted to UTC), and raises `InvalidRecord` carrying **all** errors in an `errors` attribute. Use the dataset: only purchases are passed in.

```python
class InvalidRecord(ValueError):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors

# define Purchase here ...

purchases = [r for r in RAW_EVENTS if r["event_type"] == "purchase"]
ok, bad = [], {}
for raw in purchases:
    try:
        ok.append(Purchase.from_raw(raw))
    except InvalidRecord as e:
        bad[raw["event_id"]] = e.errors
assert [p.event_id for p in ok] == ["e3", "e3", "e5", "e9"]
assert set(bad) == {"e6", "e8"} and len(bad["e6"]) == 1
assert ok[2].amount == Decimal("25.00") and ok[3].amount == Decimal("0.00")
```

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Reconcile two batches

A **reconciliation** compares what should have arrived with what did. Write `reconcile(expected_ids, received_ids)` returning a dict with `missing` (expected but not received, sorted), `unexpected` (received but not expected, sorted), and `duplicated` (`{id: count}` for IDs received more than once).

```python
def reconcile(expected_ids: list[str], received_ids: list[str]) -> dict:
    ...

report = reconcile(["e1", "e2", "e3", "e4"], ["e3", "e1", "e3", "e9", "e2", "e3"])
assert report == {"missing": ["e4"], "unexpected": ["e9"], "duplicated": {"e3": 3}}
```

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** parse into typed objects that can only exist when valid, and finish every load by reconciling what arrived against what was expected.

---

<a id="slide-42"></a>
## 42. Mini-project: an in-memory event cleaner

*Mini-project · the brief*

Combine everything into one small pipeline. Input: `RAW_EVENTS` from lesson 3 (a list of dicts). Output: a `CleanResult` holding unique, valid, typed events; the rejected records with *all* their reasons; the number of duplicates dropped; and a summary. No files, no network, no third-party libraries.

1. **validate(raw)** (one record → Event or Rejection): Apply every rule from lesson 3, collect all errors (worked example 2, exercises 1 and 9).
2. **dedupe_latest(events)** (Events → unique Events + count): Same event_id → keep max (ingested_at, input position) (worked example 3).
3. **sort** (deterministic order): By (ts, event_id) on UTC datetimes (lessons 10, 23).
4. **summarize(events)** (Events → Summary): Counts by type, purchase revenue by user, purchases per UTC day, distinct users (worked example 4).
5. **clean_events(raw)** (the pipeline): Ties it together, asserts invariants, never mutates the input (lessons 24–25).
6. **format_report(result)** (a readable report): f-strings and joins (lesson 8).

#### Acceptance criteria

- All tests on the next slide pass.
- Unique valid events: `e1, e2, e3, e4, e5, e9` in time order; e2 carries the corrected 42.00.
- Rejected: `e6, e7, e8`, and e7 lists three problems.
- Two duplicates dropped (the older e2 and the older e3).
- The zero purchase (e9) is kept and counted.
- `RAW_EVENTS` is unchanged afterwards.

#### Design decisions already made

- **Validate, then deduplicate:** only valid versions compete. (The alternative, dedupe raw records first, means an invalid correction would hide a valid earlier version. Both are defensible; the rule must be stated.)
- Rejections keep input order; valid events are sorted by time.
- All money is `Decimal` with 2 places; all times are aware UTC.
- Aggregates are plain dicts with sorted keys, so test comparisons are exact.

> **The main idea:** small functions with one job each, typed records between steps, a stated dedupe rule, and invariants at the end: that is a production-shaped pipeline, just in memory.

---

<a id="slide-43"></a>
## 43. Mini-project: starter code and tests

*Mini-project · fill in the four functions, then run the tests*

Copy the starter into a file or notebook cell after the dataset code from lesson 3. Implement the functions marked `...`, then paste and run the tests. Work in this order: `validate` → `dedupe_latest` → `summarize` → `clean_events` → `format_report`, testing each in the REPL as you go.

```python
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

ALLOWED_TYPES = frozenset({"page_view", "add_to_cart", "purchase"})
MONEY_TYPES = frozenset({"add_to_cart", "purchase"})

@dataclass(frozen=True, slots=True)
class Event:
    event_id: str
    user_id: str
    event_type: str
    ts: datetime              # aware, UTC
    amount: Decimal | None
    ingested_at: datetime     # aware, UTC

@dataclass(frozen=True, slots=True)
class Rejection:
    event_id: str | None
    errors: tuple[str, ...]

@dataclass(frozen=True)
class Summary:
    counts_by_type: dict[str, int]
    revenue_by_user: dict[str, Decimal]    # purchases only
    purchases_by_day: dict[str, int]       # UTC date "YYYY-MM-DD"
    distinct_users: int

@dataclass(frozen=True)
class CleanResult:
    events: list[Event]                    # unique, valid, sorted by (ts, event_id)
    rejected: list[Rejection]              # in input order
    duplicates_dropped: int
    summary: Summary

def validate(raw: dict) -> Event | Rejection:
    """Apply every rule from lesson 3; collect all errors."""
    ...

def dedupe_latest(events: list[Event]) -> tuple[list[Event], int]:
    """Same event_id -> keep max (ingested_at, input position)."""
    ...

def summarize(events: list[Event]) -> Summary:
    ...

def clean_events(raw_events: list[dict]) -> CleanResult:
    """validate -> dedupe -> sort -> summarise; never mutate raw_events."""
    ...

def format_report(result: CleanResult) -> str:
    """A short human-readable report (free format)."""
    ...
```

```python
# ---- tests: run after your implementation ----
import copy
from datetime import timezone
from decimal import Decimal

before = copy.deepcopy(RAW_EVENTS)
result = clean_events(RAW_EVENTS)
assert RAW_EVENTS == before                                            # input not mutated
assert [e.event_id for e in result.events] == ["e1", "e2", "e3", "e4", "e5", "e9"]   # sorted by (ts, id)
assert next(e for e in result.events if e.event_id == "e2").amount == Decimal("42.00")  # latest version won
assert next(e for e in result.events if e.event_id == "e4").user_id == "u2"            # normalised
assert all(e.ts.tzinfo == timezone.utc for e in result.events)
assert [r.event_id for r in result.rejected] == ["e6", "e7", "e8"]
assert len(next(r for r in result.rejected if r.event_id == "e7").errors) == 3
assert result.duplicates_dropped == 2
s = result.summary
assert s.counts_by_type == {"add_to_cart": 1, "page_view": 2, "purchase": 3}
assert s.revenue_by_user == {"u1": Decimal("64.00"), "u2": Decimal("25.00"), "u3": Decimal("0.00")}
assert s.purchases_by_day == {"2026-03-02": 2, "2026-03-03": 1}
assert s.distinct_users == 3
assert clean_events([]).summary.distinct_users == 0                    # empty input works
```

#### Stretch goals

- Accept `RAW_LINES` too: parse them (worked example 1) into dicts; decide what `ingested_at` should be when a source does not send one, and write that rule down.
- Make the rules data-driven: a dict of `{field: [check functions]}` instead of if-statements.
- Add `events_per_user_window`: users with 3+ events in 10 minutes (exercise 8).
- Run `mypy --strict` on your file and fix every warning.
- Measure: generate 1,000,000 synthetic events and time each step with `time.perf_counter()`. Which step dominates?

#### Self-review checklist

- Does any function change its input? (Compare with `copy.deepcopy` before and after.)
- Any `if amount:`? Any float money?
- Any `except:` without a specific exception?
- Any mutable default arguments?
- Is every output order deterministic?

> **The main idea:** write the tests before the code: they are the specification. When they pass, run the self-review checklist.

---

<a id="slide-44"></a>
## 44. Mini-project: reference solution

*Mini-project · one way to do it (open after you’ve tried)*

<details><summary>Show the reference solution and its test run</summary>

```python
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

ALLOWED_TYPES = frozenset({"page_view", "add_to_cart", "purchase"})
MONEY_TYPES = frozenset({"add_to_cart", "purchase"})
CENT = Decimal("0.01")

@dataclass(frozen=True, slots=True)
class Event:
    event_id: str
    user_id: str
    event_type: str
    ts: datetime
    amount: Decimal | None
    ingested_at: datetime

@dataclass(frozen=True, slots=True)
class Rejection:
    event_id: str | None
    errors: tuple[str, ...]

@dataclass(frozen=True)
class Summary:
    counts_by_type: dict[str, int]
    revenue_by_user: dict[str, Decimal]
    purchases_by_day: dict[str, int]
    distinct_users: int

@dataclass(frozen=True)
class CleanResult:
    events: list[Event]
    rejected: list[Rejection]
    duplicates_dropped: int
    summary: Summary


# ---------- parsing helpers: return a value or raise ValueError ----------
def parse_ts(text: str | None) -> datetime:
    dt = datetime.fromisoformat((text or "").strip())
    if dt.tzinfo is None:
        raise ValueError(f"timestamp has no offset: {text!r}")
    return dt.astimezone(timezone.utc)

def parse_amount(text: str | None) -> Decimal | None:
    if text is None or text.strip() == "":
        return None
    try:
        value = Decimal(text.strip())
        if not value.is_finite():
            raise ValueError(f"amount is not finite: {text!r}")
        return value.quantize(CENT, rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError(f"amount is not a number: {text!r}") from None


# ---------- step 1: validate one record ----------
def validate(raw: dict) -> Event | Rejection:
    errors: list[str] = []
    event_id = (raw.get("event_id") or "").strip()
    if not event_id:
        errors.append("event_id is required")
    user_id = (raw.get("user_id") or "").strip().lower()
    if not user_id:
        errors.append("user_id is required")
    event_type = (raw.get("event_type") or "").strip().lower()
    if event_type not in ALLOWED_TYPES:
        errors.append(f"event_type {raw.get('event_type')!r} is not allowed")
    ts = None
    try:
        ts = parse_ts(raw.get("ts"))
    except ValueError:
        errors.append(f"ts {raw.get('ts')!r} is not an ISO 8601 timestamp with offset")
    amount = None
    try:
        amount = parse_amount(raw.get("amount"))
    except ValueError as e:
        errors.append(str(e))
    else:
        if amount is not None and amount < 0:
            errors.append("amount must be >= 0")
        if event_type in MONEY_TYPES and amount is None:
            errors.append(f"amount is required for {event_type}")
        if event_type == "page_view" and amount is not None:
            errors.append("page_view must not have an amount")
    try:
        ingested_at = parse_ts(raw.get("ingested_at"))
    except ValueError:
        ingested_at = None
        errors.append("ingested_at is missing or invalid")
    if errors:
        return Rejection(event_id or None, tuple(errors))
    return Event(event_id, user_id, event_type, ts, amount, ingested_at)


# ---------- step 2: deduplicate by the stated rule ----------
def dedupe_latest(events: list[Event]) -> tuple[list[Event], int]:
    best: dict[str, tuple[datetime, int, Event]] = {}
    for position, e in enumerate(events):
        current = best.get(e.event_id)
        if current is None or (e.ingested_at, position) > current[:2]:
            best[e.event_id] = (e.ingested_at, position, e)
    kept = [entry[2] for entry in best.values()]
    return kept, len(events) - len(kept)


# ---------- step 3: aggregate ----------
def summarize(events: list[Event]) -> Summary:
    counts = Counter(e.event_type for e in events)
    revenue: defaultdict[str, Decimal] = defaultdict(Decimal)
    per_day: Counter[str] = Counter()
    for e in events:
        if e.event_type == "purchase":
            revenue[e.user_id] += e.amount
            per_day[e.ts.date().isoformat()] += 1
    return Summary(
        counts_by_type=dict(sorted(counts.items())),
        revenue_by_user=dict(sorted(revenue.items())),
        purchases_by_day=dict(sorted(per_day.items())),
        distinct_users=len({e.user_id for e in events}),
    )


# ---------- the pipeline ----------
def clean_events(raw_events: list[dict]) -> CleanResult:
    valid: list[Event] = []
    rejected: list[Rejection] = []
    for raw in raw_events:
        outcome = validate(raw)
        if isinstance(outcome, Event):
            valid.append(outcome)
        else:
            rejected.append(outcome)
    unique, dropped = dedupe_latest(valid)
    unique.sort(key=lambda e: (e.ts, e.event_id))
    # invariants: cheap checks that catch silent bugs
    assert len(valid) + len(rejected) == len(raw_events), "every input row is accounted for"
    assert len({e.event_id for e in unique}) == len(unique), "event_id is unique after dedupe"
    return CleanResult(unique, rejected, dropped, summarize(unique))


def format_report(result: CleanResult) -> str:
    lines = [
        f"valid events: {len(result.events)} | rejected: {len(result.rejected)} | duplicates dropped: {result.duplicates_dropped}",
        "by type:   " + ", ".join(f"{t}={n}" for t, n in result.summary.counts_by_type.items()),
        "revenue:   " + ", ".join(f"{u}={amt}" for u, amt in result.summary.revenue_by_user.items()),
        "per day:   " + ", ".join(f"{d}={n}" for d, n in result.summary.purchases_by_day.items()),
    ]
    lines += [f"rejected {r.event_id}: " + "; ".join(r.errors) for r in result.rejected]
    return "\n".join(lines)

# ---- tests: run after your implementation ----
import copy
from datetime import timezone
from decimal import Decimal

before = copy.deepcopy(RAW_EVENTS)
result = clean_events(RAW_EVENTS)
assert RAW_EVENTS == before                                            # input not mutated
assert [e.event_id for e in result.events] == ["e1", "e2", "e3", "e4", "e5", "e9"]   # sorted by (ts, id)
assert next(e for e in result.events if e.event_id == "e2").amount == Decimal("42.00")  # latest version won
assert next(e for e in result.events if e.event_id == "e4").user_id == "u2"            # normalised
assert all(e.ts.tzinfo == timezone.utc for e in result.events)
assert [r.event_id for r in result.rejected] == ["e6", "e7", "e8"]
assert len(next(r for r in result.rejected if r.event_id == "e7").errors) == 3
assert result.duplicates_dropped == 2
s = result.summary
assert s.counts_by_type == {"add_to_cart": 1, "page_view": 2, "purchase": 3}
assert s.revenue_by_user == {"u1": Decimal("64.00"), "u2": Decimal("25.00"), "u3": Decimal("0.00")}
assert s.purchases_by_day == {"2026-03-02": 2, "2026-03-03": 1}
assert s.distinct_users == 3
assert clean_events([]).summary.distinct_users == 0                    # empty input works

print(format_report(result))
print("All tests passed")
```

Output:

```text
valid events: 6 | rejected: 3 | duplicates dropped: 2
by type:   add_to_cart=1, page_view=2, purchase=3
revenue:   u1=64.00, u2=25.00, u3=0.00
per day:   2026-03-02=2, 2026-03-03=1
rejected e6: user_id is required
rejected e7: event_type 'refund' is not allowed; ts 'not-a-date' is not an ISO 8601 timestamp with offset; amount must be >= 0
rejected e8: amount is not a number: 'abc'
All tests passed
```

</details>

#### How the pieces map to the lessons

| Piece | Lessons |
|---|---|
| `parse_ts`, `parse_amount` | 9, 10, 16 · worked example 1 |
| `validate` collecting all errors | 6, 7, 8, 20 · worked example 2 |
| `Event`, `Rejection`, `Summary` frozen dataclasses | 31, 32 |
| `dedupe_latest` with (ingested_at, position) | 18, 19 · worked example 3 |
| `summarize` with Counter / defaultdict | 27, 28 · worked example 4 |
| sorted keys, tuple sort key | 23 |
| invariant asserts, no input mutation | 24, 25, 37 |

#### Choices worth discussing

- `validate` returns `Event | Rejection` instead of raising, because rejects are an expected outcome, not an exceptional one. Exercise 9 raised instead; both are common.
- `assert` statements are skipped when Python runs with `-O`. For checks that must always run in production, raise an explicit exception instead.
- Everything is O(n) except the sort (O(n log n)). Memory is the real limit: every event is a Python object. That is where DataFrames come in.
- In a Fabric notebook, the same functions can be applied to a pandas or PySpark DataFrame’s rows for small data, or re-expressed as DataFrame operations for large data.

> **The main idea:** if your solution passes the same tests with different code, it’s correct. Compare structure, naming, and determinism, not line-by-line equality.

---

<a id="slide-45"></a>
## 45. Cheat sheet

*Reference · the deck on one page*

#### Values

| Need | Write |
|---|---|
| missing check | `x is None` / `x is not None` |
| empty container | `if not items:` |
| money | `Decimal("1.50").quantize(Decimal("0.01"))` |
| parse int / decimal | `int(s)` (ValueError) / `Decimal(s)` (InvalidOperation) |
| clean text | `s.strip().lower()` |
| split once | `k, sep, v = s.partition("=")` |
| format | `f"{x:,.2f}"`, `f"{x!r}"`, `f"{x=}"` |
| timestamp → UTC | `datetime.fromisoformat(s).astimezone(timezone.utc)` |
| UTC day key | `ts.date().isoformat()` |

#### Collections

| Need | Write |
|---|---|
| filter + map | `[f(x) for x in xs if p(x)]` |
| index by key | `{r["id"]: r for r in rows}` |
| distinct | `{r["user"] for r in rows}` |
| dedupe keep order | `list(dict.fromkeys(xs))` |
| count | `Counter(xs).most_common(n)` |
| group | `g = defaultdict(list); g[k].append(v)` |
| sum per key | `defaultdict(Decimal)` |
| last N / queue | `deque(maxlen=n)`, `append`/`popleft` |
| sort multi-key | `sorted(rows, key=lambda r: (r["a"], -r["n"]))` |
| None last | `key=lambda r: (r["x"] is None, r["x"] or 0)` |
| compare key sets | `expected - actual`, `actual - expected` |

#### Functions and records

| Need | Write |
|---|---|
| keyword-only option | `def f(x, *, strict=False)` |
| safe mutable default | `def f(x, items=None): items = [] if items is None else items` |
| new dict with a change | `{**rec, "k": v}` |
| deep copy | `copy.deepcopy(obj)` |
| typed record | `@dataclass(frozen=True, slots=True)` |
| list field default | `field(default_factory=list)` |
| optional hint | `str \| None` |
| re-raise with cause | `raise ValueError("…") from e` |

#### Costs and traps

| Remember | Because |
|---|---|
| `x in set` not `x in list` in loops | O(1) vs O(n) |
| `deque.popleft` not `list.pop(0)` | O(1) vs O(n) |
| `"".join(parts)` | no quadratic string building |
| `xs.sort()` returns None | in-place methods return None |
| `[[]] * n` shares one list | use a comprehension |
| generators are single-use | build a list for several passes |
| `defaultdict[k]` inserts | check with `in` / `.get` |
| hints aren’t enforced | run mypy/Pyright; validate at runtime |

> **The main idea:** print this page; it covers 90% of the plain-Python you will write around data pipelines.

---

<a id="slide-46"></a>
## 46. Glossary

*Reference · every new term in this deck*

| Term | Meaning |
|---|---|
| Object / value | A piece of data in memory with a type; every Python value is an object |
| Name / binding | A label that refers to an object; assignment binds a name, it never copies |
| Aliasing | Two names referring to the same object |
| Mutable / immutable | Can / cannot be changed in place after creation |
| Hashable | Has a stable hash; required for dict keys and set members (immutable built-ins are hashable) |
| Truthy / falsy | Treated as True / False in a condition; falsy = None, False, zeros, empty containers |
| Iterable | Anything a for-loop can walk: lists, strings, dicts, sets, generators |
| Comprehension | An expression that builds a list, set, or dict from an iterable |
| Generator (expression) | A lazy, single-use iterable that produces items on demand |
| Unpacking | Assigning the items of a sequence to several names: `a, b = pair` |
| Shallow / deep copy | A new outer container sharing inner objects / a fully recursive copy |
| Scope (LEGB) | Where a name is visible: Local, Enclosing, Global, Built-in |
| Closure | A function that remembers variables from the scope where it was created |
| Module / package | A .py file / a folder of modules |
| Exception | An object that interrupts normal flow to signal an error |
| EAFP / LBYL | Try then handle failure / check before acting |
| Quarantine (reject list) | Where invalid records go, with reasons, instead of crashing or vanishing |
| Big O (O(1), O(n), O(n log n)) | How work grows as input size grows |
| Amortised | Averaged over many operations (e.g., list append) |
| Type hint | An annotation describing intended types; checked by tools, not by Python at runtime |
| Dataclass | A class whose init, repr, and equality are generated from annotated fields |
| Aware / naive datetime | With / without a UTC offset |
| ISO 8601 | Standard timestamp text format, e.g. 2026-03-02T09:00:00Z |
| Natural key / business key | Fields that identify a real-world thing when no ID exists |
| Deduplication rule | Key + winner + tie-breaker that decide which duplicate survives |
| Deterministic | Same input → same output on every run |
| Invariant | A condition that must always hold after a step; checked with assert or explicit raises |
| Reconciliation | Comparing what was expected with what arrived (missing, unexpected, duplicated) |
| Pure function | Depends only on its inputs and changes nothing outside itself |

---

<a id="slide-47"></a>
## 47. What to remember, and what comes next

*Reference · recap and the next deck*

1. **Names point at objects.** Assignment and argument passing share; most copies are shallow; never use mutable defaults.
2. **Missing is explicit.** `is None` for values, truthiness only for containers; normalise `""`, absent keys, and None early.
3. **Parse at the edge.** Text → Decimal, aware UTC datetime, normalised strings, inside small functions that raise ValueError.
4. **Validate fully, quarantine politely.** Collect all errors per record; never let one bad row crash or silently vanish.
5. **State the dedupe rule** (key, winner, tie-breaker) and implement it deterministically.
6. **Pick the collection by the question:** list, dict, set, Counter, defaultdict, deque. Lookups in loops belong in sets and dicts.
7. **Typed records after validation:** frozen dataclasses with type hints checked by mypy or Pyright.
8. **Assert invariants** after each step: counts add up, keys are unique, values are in range.

#### Next: Python files, generators, and practical data scripts

- Files and paths (`pathlib`), CSV and JSON (`csv`, `json`), encodings and newline traps.
- Streaming large files with generators; chunking.
- Logging, configuration, and testing with pytest.
- Databases from Python: parameterised queries, transactions, and DuckDB.
- Concurrency: threads, processes, and asyncio, and when each helps.
- Later: DataFrames in the pandas & Polars deck, and HTTP APIs with retries and pagination in the reliable-ingestion deck.

#### Practise this week

- Finish the mini-project without looking at the solution.
- Redo exercises 5, 6, and 8 from memory a day later.
- Translate worked example 4 into SQL GROUP BY queries (SQL deck) and compare results.
- Read `collections` and `dataclasses` docs end to end once.

> **The main idea:** plain Python is the foundation under every DataFrame and Spark job. Master these patterns once, and the libraries in later decks will feel like faster versions of them.

---

<a id="slide-48"></a>
## 48. References and how this deck was tested

*References · official documentation*

- [The Python Tutorial](https://docs.python.org/3/tutorial/index.html): chapters 3–5 and 8–9 cover this deck’s language basics.
- [Built-in types](https://docs.python.org/3/library/stdtypes.html), [collections](https://docs.python.org/3/library/collections.html), [dataclasses](https://docs.python.org/3/library/dataclasses.html), [copy](https://docs.python.org/3/library/copy.html).
- [decimal](https://docs.python.org/3/library/decimal.html), [datetime](https://docs.python.org/3/library/datetime.html), [floating-point issues](https://docs.python.org/3/tutorial/floatingpoint.html).
- [Sorting techniques](https://docs.python.org/3/howto/sorting.html), [Errors and exceptions](https://docs.python.org/3/tutorial/errors.html), [Execution model (scope)](https://docs.python.org/3/reference/executionmodel.html).
- [Programming FAQ](https://docs.python.org/3/faq/programming.html): default values, scope, copies, multidimensional lists.
- [Python wiki: time complexity](https://wiki.python.org/moin/TimeComplexity) of list, dict, set, and deque operations.
- [typing](https://docs.python.org/3/library/typing.html), [PEP 484](https://peps.python.org/pep-0484/), [mypy](https://mypy.readthedocs.io/en/stable/), [Pyright](https://microsoft.github.io/pyright/).
- [PEP 8 style guide](https://peps.python.org/pep-0008/), [Python glossary](https://docs.python.org/3/glossary.html).
- [Fabric Runtime 1.3](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-1-3) (Python 3.11) and [Fabric Runtime 2.0](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-2-0) (Python 3.13).

**Testing:** every Python block was executed with CPython 3.12.10 while the deck was built; OUTPUT boxes are the captured results (except the timing example, marked as typical). Exercise solutions and the mini-project solution ran with their tests. Starter code and blocks marked TEXT or SQL are not executed.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Clean an amount

Test for blank with `text.strip() == ""`, not truthiness of the parsed value. `Decimal` raises `InvalidOperation`, not `ValueError`: convert it. `Decimal("NaN")` parses successfully, so check `value.is_finite()`. Use `quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)`. Huge exponents can make `quantize` itself raise `InvalidOperation`, so keep it inside the `try`.

<a id="hint-2"></a>
### Hint 2 · Parse key=value text

`split(";")`, then for each segment `strip()` and skip it if empty. `segment.partition("=")` splits at the *first* `=` only and tells you whether a separator was found (the middle part is `""` if not). Check `key in result` before assigning.

<a id="hint-3"></a>
### Hint 3 · Bug hunt: tags that leak between records

Look for three things: a default evaluated once (lesson 26), a function that mutates its argument (lesson 24), and a function that ignores tags already on the record. Build the new list with `[*old_tags, tag]` and the new dict with `{**record, "tags": …}`.

<a id="hint-4"></a>
### Hint 4 · Distinct event types per user

Group into `defaultdict(set)` (a set removes duplicates for you), then convert with a dict comprehension: `{u: sorted(t) for u, t in groups.items()}`. Skip rows where `user_id` is `None` or blank.

<a id="hint-5"></a>
### Hint 5 · Multi-key sort with None last

Return a tuple from the key function. For “None last”, start the tuple with `amount is None` (False sorts before True). For “descending”, negate the number: `-amount` works for `Decimal`. Use `0` as a placeholder when the amount is None so the tuple stays comparable.

<a id="hint-6"></a>
### Hint 6 · Deduplicate by natural key, keep first

Keep a `seen` set of key tuples. For each row build the tuple; if it is already in `seen`, count it as dropped; otherwise add it and keep the row. Lists and dicts can’t go in a set, tuples of strings can.

<a id="hint-7"></a>
### Hint 7 · Revenue per UTC day and top spenders

The +02:00 purchase at 00:30 on 3 March is 22:30 on **2 March** in UTC: convert with `ts.astimezone(timezone.utc).date()`. Use `defaultdict(Decimal)` for both totals. For the top list, sort the items by `(-revenue, user)` and slice `[:n]`.

<a id="hint-8"></a>
### Hint 8 · Detect bursts with a sliding window

Sort by timestamp first. Keep one `deque` per user in a `defaultdict(deque)`. For each event: append its time to that user’s deque, then `popleft()` while the oldest time is `>= window` old. If the deque length reaches the threshold, record the user.

<a id="hint-9"></a>
### Hint 9 · A validating dataclass

A **classmethod** receives the class as its first argument (`cls`) instead of an instance, like a C# static factory method. Collect errors in a list, parse each field in its own `try`, and only call `cls(...)` when the list is empty; otherwise `raise InvalidRecord(errors)`.

<a id="hint-10"></a>
### Hint 10 · Reconcile two batches

Set difference answers the first two questions: `set(expected) - set(received)`. `Counter(received_ids)` gives counts; keep entries with a count above 1 using a dict comprehension.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Clean an amount

```python
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

CENT = Decimal("0.01")

def clean_amount(text: str | None) -> Decimal | None:
    if text is None or text.strip() == "":
        return None
    try:
        value = Decimal(text.strip())
        if not value.is_finite():
            raise ValueError(f"amount is not finite: {text!r}")
        value = value.quantize(CENT, rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError(f"amount is not a number: {text!r}") from None
    if value < 0:
        raise ValueError(f"amount must be >= 0: {text!r}")
    return value

assert clean_amount(None) is None
assert clean_amount("   ") is None
assert clean_amount(" 0.00 ") == Decimal("0.00")
assert str(clean_amount("25")) == "25.00"
assert clean_amount("19.995") == Decimal("20.00")
for bad in ["abc", "-5", "NaN", "1e999999999"]:
    try:
        clean_amount(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"{bad!r} should be rejected")
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** Blank detection happens on the *text*, so a parsed zero is never confused with “missing” (lesson 7). Both parsing and quantizing sit inside the `try`, and the library-specific `InvalidOperation` is translated into the `ValueError` our callers expect (lesson 16). `is_finite()` rejects `NaN` and `Infinity`, which `Decimal` accepts as valid input. The `ValueError` raised for NaN inside the `try` is not caught by `except InvalidOperation`, because `InvalidOperation` isn’t a `ValueError`.

<a id="solution-2"></a>
### Solution 2 · Parse key=value text

```python
def parse_kv(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for segment in text.split(";"):
        segment = segment.strip()
        if not segment:                      # empty segment: skip (truthiness is fine for "")
            continue
        key, sep, value = segment.partition("=")
        if not sep:
            raise ValueError(f"segment without '=': {segment!r}")
        key = key.strip().lower()
        if key in result:
            raise ValueError(f"duplicate key: {key!r}")
        result[key] = value.strip()
    return result

assert parse_kv("user=u1; type=purchase;amount=25 ;") == {"user": "u1", "type": "purchase", "amount": "25"}
assert parse_kv(" Note = a=b ") == {"note": "a=b"}
assert parse_kv("") == {}
for bad in ["user=u1; broken", "a=1; A=2"]:
    try:
        parse_kv(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(bad)
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** `partition` always returns three parts, so unpacking never fails, and it keeps everything after the first `=` in the value. Duplicate keys are detected *after* normalising case, so `a` and `A` collide, as they should. Here truthiness is the right tool: an empty segment carries no data (lesson 7).

<a id="solution-3"></a>
### Solution 3 · Bug hunt: tags that leak between records

```python
def add_tag(record: dict, tag: str) -> dict:
    old_tags = record.get("tags", [])
    return {**record, "tags": [*old_tags, tag]}     # new dict, new list

r = {"event_id": "e1"}
r1 = add_tag(r, "web")
r2 = add_tag(r1, "promo")
assert r == {"event_id": "e1"}
assert r1["tags"] == ["web"]
assert r2["tags"] == ["web", "promo"]
assert r1["tags"] is not r2["tags"]
assert add_tag({"event_id": "e2"}, "x")["tags"] == ["x"]
print("All tests passed")
```

Output:

```text
All tests passed
```

**The bugs.** (1) `tags=[]` is created once, so every call appends to the same list and unrelated records share tags. (2) `record["tags"] = …` mutates the caller’s dict, so the “original” changes too. (3) Existing tags on the record are ignored. **The fix** removes the parameter entirely, reads existing tags with `.get`, and returns a fresh dict containing a fresh list. `{**record}` is shallow, which is fine here because the only nested value (`tags`) is replaced rather than modified.

<a id="solution-4"></a>
### Solution 4 · Distinct event types per user

```python
rows = [
    {"id": "a", "user_id": " U1", "event_type": "Page_View"},
    {"id": "b", "user_id": "u1",  "event_type": "purchase"},
    {"id": "c", "user_id": None,  "event_type": "purchase"},
    {"id": "d", "user_id": "u2",  "event_type": "page_view"},
    {"id": "e", "user_id": "u1",  "event_type": "page_view"},
]
from collections import defaultdict

def types_per_user(rows: list[dict]) -> dict[str, list[str]]:
    groups: defaultdict[str, set[str]] = defaultdict(set)
    for row in rows:
        user = (row.get("user_id") or "").strip().lower()
        if not user:
            continue
        groups[user].add(row["event_type"].strip().lower())
    return {user: sorted(types) for user, types in sorted(groups.items())}

assert types_per_user(rows) == {"u1": ["page_view", "purchase"], "u2": ["page_view"]}
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** `defaultdict(set)` creates an empty set the first time each user appears, and `.add` ignores repeats, so `"Page_View"` and `"page_view"` collapse after normalisation. Returning plain lists in a plain dict avoids leaking a defaultdict (and its insert-on-read behaviour) to callers, and sorting gives a deterministic result.

<a id="solution-5"></a>
### Solution 5 · Multi-key sort with None last

```python
from decimal import Decimal
rows = [
    {"id": "a", "user_id": "u2", "amount": Decimal("5"),  "ts": "2026-03-02T10:00:00Z"},
    {"id": "b", "user_id": "u1", "amount": None,          "ts": "2026-03-02T08:00:00Z"},
    {"id": "c", "user_id": "u1", "amount": Decimal("64"), "ts": "2026-03-02T09:00:00Z"},
    {"id": "d", "user_id": "u1", "amount": Decimal("64"), "ts": "2026-03-02T07:00:00Z"},
    {"id": "e", "user_id": "u1", "amount": Decimal("0"),  "ts": "2026-03-02T06:00:00Z"},
]

def sort_events(rows: list[dict]) -> list[dict]:
    def key(r):
        amount = r["amount"]
        return (r["user_id"], amount is None, -amount if amount is not None else 0, r["ts"])
    return sorted(rows, key=key)

assert [r["id"] for r in sort_events(rows)] == ["d", "c", "e", "b", "a"]
assert [r["id"] for r in rows] == ["a", "b", "c", "d", "e"]
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** Tuples compare element by element, so the key encodes the priority of the sort columns. `amount is None` is False for numbers and True for None, which pushes None to the end within each user. Negation reverses the amount order without a second pass; `d` and `c` tie at 64 and are then ordered by `ts`. `sorted` returns a new list, so the input stays untouched (unlike `list.sort`).

<a id="solution-6"></a>
### Solution 6 · Deduplicate by natural key, keep first

```python
rows = [
    {"id": "a", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "b", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "c", "user_id": "u2", "event_type": "page_view", "ts": "2026-03-02T09:15:00Z"},
    {"id": "d", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "e", "user_id": "u1", "event_type": "page_view", "ts": "2026-03-02T09:03:00Z"},
]

def dedupe_first(rows: list[dict]) -> tuple[list[dict], int]:
    seen: set[tuple[str, str, str]] = set()
    kept: list[dict] = []
    for row in rows:
        key = (row["user_id"], row["event_type"], row["ts"])
        if key in seen:
            continue
        seen.add(key)
        kept.append(row)
    return kept, len(rows) - len(kept)

kept, dropped = dedupe_first(rows)
assert [r["id"] for r in kept] == ["a", "c", "e"] and dropped == 2
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** Set membership is O(1), so the whole pass is O(n) (a list of seen keys would make it O(n²)). Iterating the input in order and appending only first occurrences preserves order. Compare with worked example 3: the *key* and the *winner* change, but the shape of the code is the same. Write the rule down first, then pick the data structure.

<a id="solution-7"></a>
### Solution 7 · Revenue per UTC day and top spenders

```python
from datetime import datetime, timezone, timedelta
from decimal import Decimal
plus2 = timezone(timedelta(hours=2))
rows = [
    {"user_id": "u1", "event_type": "purchase",  "amount": Decimal("64.00"), "ts": datetime(2026, 3, 2, 9, 3, tzinfo=timezone.utc)},
    {"user_id": "u2", "event_type": "purchase",  "amount": Decimal("25.00"), "ts": datetime(2026, 3, 2, 9, 20, tzinfo=timezone.utc)},
    {"user_id": "u2", "event_type": "purchase",  "amount": Decimal("39.00"), "ts": datetime(2026, 3, 3, 0, 30, tzinfo=plus2)},
    {"user_id": "u3", "event_type": "purchase",  "amount": Decimal("0.00"),  "ts": datetime(2026, 3, 3, 8, 30, tzinfo=timezone.utc)},
    {"user_id": "u1", "event_type": "page_view", "amount": None,             "ts": datetime(2026, 3, 3, 9, 0, tzinfo=timezone.utc)},
]
from collections import defaultdict

def daily_revenue(rows: list[dict]) -> dict[str, Decimal]:
    totals: defaultdict[str, Decimal] = defaultdict(Decimal)
    for r in rows:
        if r["event_type"] == "purchase":
            day = r["ts"].astimezone(timezone.utc).date().isoformat()
            totals[day] += r["amount"]
    return dict(sorted(totals.items()))

def top_users(rows: list[dict], n: int) -> list[tuple[str, Decimal]]:
    revenue: defaultdict[str, Decimal] = defaultdict(Decimal)
    for r in rows:
        if r["event_type"] == "purchase":
            revenue[r["user_id"]] += r["amount"]
    return sorted(revenue.items(), key=lambda kv: (-kv[1], kv[0]))[:n]

assert daily_revenue(rows) == {"2026-03-02": Decimal("128.00"), "2026-03-03": Decimal("0.00")}
assert top_users(rows, 2) == [("u1", Decimal("64.00")), ("u2", Decimal("64.00"))]
print(daily_revenue(rows))
print(top_users(rows, 3))
print("All tests passed")
```

Output:

```text
{'2026-03-02': Decimal('128.00'), '2026-03-03': Decimal('0.00')}
[('u1', Decimal('64.00')), ('u2', Decimal('64.00')), ('u3', Decimal('0.00'))]
All tests passed
```

**Why it works.** Converting to UTC *before* taking `.date()` puts the +02:00 purchase on 2 March, so 64 + 25 + 39 = 128.00 that day; grouping on the local date would give a wrong split. The day still appears with 0.00 on 3 March because u3’s zero purchase is a real purchase. u1 and u2 both total 64.00; the key `(-revenue, user)` breaks the tie alphabetically, so the result is deterministic. `Counter.most_common` would also work for ints, but its tie order is first-seen rather than alphabetical, and it is meant for counts, not money.

<a id="solution-8"></a>
### Solution 8 · Detect bursts with a sliding window

```python
from datetime import datetime, timedelta, timezone
t0 = datetime(2026, 3, 2, 9, 0, tzinfo=timezone.utc)
m = lambda minutes: t0 + timedelta(minutes=minutes)
events = [("u2", m(10)), ("u1", m(0)), ("u2", m(0)), ("u1", m(4)), ("u3", m(1)), ("u2", m(5)), ("u1", m(9)), ("u3", m(0))]
from collections import defaultdict, deque

def bursts(events, window=timedelta(minutes=10), threshold=3) -> set[str]:
    recent: defaultdict[str, deque] = defaultdict(deque)
    flagged: set[str] = set()
    for user, ts in sorted(events, key=lambda e: e[1]):
        q = recent[user]
        q.append(ts)
        while ts - q[0] >= window:          # drop events outside the window
            q.popleft()
        if len(q) >= threshold:
            flagged.add(user)
    return flagged

assert bursts(events) == {"u1"}
assert bursts(events, threshold=2) == {"u1", "u2", "u3"}
assert bursts(events, window=timedelta(minutes=11)) == {"u1", "u2"}
print("All tests passed")
```

Output:

```text
All tests passed
```

**Why it works.** After sorting, each user’s deque holds exactly the events inside the current window: new times enter on the right, expired ones leave on the left in O(1). Every event is appended once and removed at most once, so the scan is O(n log n) for the sort plus O(n) for the windows. A naive approach compares every pair of events (O(n²)). For u2 at 0, 5, 10: at minute 10 the event at 0 is exactly 10 minutes old, so it drops out with a 10-minute window but stays with an 11-minute one.

<a id="solution-9"></a>
### Solution 9 · A validating dataclass

```python
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

class InvalidRecord(ValueError):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors

@dataclass(frozen=True, slots=True)
class Purchase:
    event_id: str
    user_id: str
    amount: Decimal
    ts: datetime

    @classmethod
    def from_raw(cls, raw: dict) -> "Purchase":
        errors: list[str] = []
        user_id = (raw.get("user_id") or "").strip().lower()
        if not user_id:
            errors.append("user_id is required")
        amount = None
        try:
            amount = Decimal((raw.get("amount") or "").strip())
            if not amount.is_finite() or amount < 0:
                errors.append(f"amount must be a finite number >= 0: {raw.get('amount')!r}")
            amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except InvalidOperation:
            errors.append(f"amount is not a number: {raw.get('amount')!r}")
        ts = None
        try:
            ts = datetime.fromisoformat(raw.get("ts") or "")
            if ts.tzinfo is None:
                errors.append("ts has no offset")
            else:
                ts = ts.astimezone(timezone.utc)
        except ValueError:
            errors.append(f"ts is not ISO 8601: {raw.get('ts')!r}")
        if errors:
            raise InvalidRecord(errors)
        return cls(raw["event_id"], user_id, amount, ts)

purchases = [r for r in RAW_EVENTS if r["event_type"] == "purchase"]
ok, bad = [], {}
for raw in purchases:
    try:
        ok.append(Purchase.from_raw(raw))
    except InvalidRecord as e:
        bad[raw["event_id"]] = e.errors
assert [p.event_id for p in ok] == ["e3", "e3", "e5", "e9"]
assert set(bad) == {"e6", "e8"} and len(bad["e6"]) == 1
assert ok[2].amount == Decimal("25.00") and ok[3].amount == Decimal("0.00")
print(bad)
print(ok[2])
print("All tests passed")
```

Output:

```text
{'e6': ['user_id is required'], 'e8': ["amount is not a number: 'abc'"]}
Purchase(event_id='e5', user_id='u2', amount=Decimal('25.00'), ts=datetime.datetime(2026, 3, 2, 9, 20, tzinfo=datetime.timezone.utc))
All tests passed
```

**Why it works.** Every field is checked even after an earlier failure, so `InvalidRecord.errors` lists all problems; the exception’s message joins them for logs. An empty amount becomes `Decimal("")`, which raises `InvalidOperation`, so “required” falls out of the parse. The dataclass is constructed only from validated values, so any `Purchase` that exists is valid. That is the main benefit of parsing at the edge into typed objects. Note the two e3 records: deduplication is a separate step.

<a id="solution-10"></a>
### Solution 10 · Reconcile two batches

```python
from collections import Counter

def reconcile(expected_ids: list[str], received_ids: list[str]) -> dict:
    expected, received = set(expected_ids), set(received_ids)
    counts = Counter(received_ids)
    return {
        "missing": sorted(expected - received),
        "unexpected": sorted(received - expected),
        "duplicated": {i: n for i, n in sorted(counts.items()) if n > 1},
    }

report = reconcile(["e1", "e2", "e3", "e4"], ["e3", "e1", "e3", "e9", "e2", "e3"])
assert report == {"missing": ["e4"], "unexpected": ["e9"], "duplicated": {"e3": 3}}
print(report)
print("All tests passed")
```

Output:

```text
{'missing': ['e4'], 'unexpected': ['e9'], 'duplicated': {'e3': 3}}
All tests passed
```

**Why it works.** Converting both lists to sets once makes each difference O(n), and sorting the results makes the report stable for tests and diffs. `Counter` handles the duplicates question that sets can’t (a set forgets multiplicity). This exact check runs after many real loads: row counts and key sets between source and target.
