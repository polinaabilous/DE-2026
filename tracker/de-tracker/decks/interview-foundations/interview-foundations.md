# Interview foundations: think aloud on SQL, Python and a case

*Companion to `interview-foundations.html`: same lessons, same numbering, same code and outputs. Hints and solutions are in Appendices A and B.*

**Tested with:** CPython 3.12.10 on Windows 11 (64-bit), DuckDB 1.5.6 (Python package), pytest 9.1.1 and the `tzdata` package for `zoneinfo`. The Python problems use the standard library only. SQL is DuckDB’s dialect. Every code block and command with an output ran while this document was built, in a fresh copy of the lab folder `interview-foundations-lab/` that ships next to this file. Timings are labelled as measured on the build machine. The data is small, synthetic Leafy data with planted edge cases; the Fuel Smart nutrient values are illustrative, not USDA values. Nothing is downloaded and no hosted service is used.

**Gap deck:** it teaches only what the earlier decks leave out. The SQL side of thinking aloud (the four-question method and how to work a SQL interview question in *Classic SQL patterns*; the grain-first routine in *SQL correctness: joins, grain, and NULLs*) is recapped in one line and referenced by title. It also builds on *Python foundations for data engineering*, *Metric design: define the number before writing SQL* and *Why dimensional modeling*. Hard timed drills, more cases and full mock loops come in later lessons (*Interview-style Python*, *Interview: timed SQL & Python*, *Interview: modeling, metrics & dbt cases*, *Mock loops & take-home*). New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the loop description, the interview questions and the exercises are based on common data-engineering interview patterns (research done in October 2026: round structure, published coding rubrics, data-Python round question types, modeling and metrics case routines, candidate reports). All questions are original and use the Leafy data or the Fuel Smart portfolio.

**Additions beyond the original brief** are marked *(added)*: an offline SQL session checker, `check_sql.py`, that compares your rows with a reference and lists the edge cases you must explain; `practice.py`: a session log, a mistake log with retries 1, 3 and 7 days later, rubric scoring and a definition-of-done report; a round-by-round map of which earlier deck prepares you for each interview round; reconciliation asserts (rows in = rows kept + rows rejected) as a habit for testing aloud; rules for using AI in practice: after the self-review, never during the attempt; a Fuel Smart case model answer with a small synthetic fixture you can validate.

## Contents

1. [Interview foundations](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [The running example: Leafy’s practice data, and what you already know](#slide-3)
4. [The data-engineer interview loop](#slide-4)
5. [How a round is scored, and what “foundations” means](#slide-5)
6. [The think-aloud loop: one routine for every technical round](#slide-6)
7. [Running a medium SQL session, and checking it yourself](#slide-7)
8. [Basic data-Python: the toolkit and the complexity talk](#slide-8)
9. [Worked problem 1: parse messy lines, aloud](#slide-9)
10. [Worked problem 2: group, count, and top-k with ties](#slide-10)
11. [Worked problem 3: deduplicate, the latest version wins](#slide-11)
12. [Worked problem 4 and testing aloud: a lookup join, then the follow-ups](#slide-12)
13. [The case routine: clarify, grain, model, metric spec, validate, answer](#slide-13)
14. [Worked case, steps 1–3: clarify, grain, model](#slide-14)
15. [Worked case, steps 4–6: metric spec, validate, three-sentence answer](#slide-15)
16. [In your portfolio: rehearse the Fuel Smart case aloud](#slide-16)
17. [A self-review rubric: score every session the same way](#slide-17)
18. [A mistake log and a retry plan](#slide-18)
19. [Lab: your first five sessions, then one a week](#slide-19)
20. [Bug clinic: believable mistakes in interview code and in the routine](#slide-20)
21. [Interview questions and model answers](#slide-21)
22. [Exercises 1–4 · warm-ups and a first interview-level problem](#slide-22)
23. [Exercises 5–7 · interview-level problems](#slide-23)
24. [Exercises 8–10 · stretch and take-home style](#slide-24)
25. [Cheat sheet and glossary](#slide-25)
26. [Recap and references](#slide-26)
27. [Appendix A · Hints](#appendix-a)
28. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Interview foundations

**

The earlier decks taught the techniques. Interviews also grade how you use them under observation: whether you clarify before typing, state the grain, name edge cases, test your own code, and finish with a clear answer. This deck makes that behaviour a routine you can practise now, months before you apply, with short sessions you can check yourself.

- **Part A, the loop:** the rounds of an data-engineer interview loop, what each one checks, and how a round is scored.
- **Part B, technical rounds:** the think-aloud loop, how to run a medium SQL session, and four basic data-Python problems (parse, group and count, dedupe, lookup join) solved aloud with edge cases and complexity.
- **Part C, the case:** clarify → grain → model → metric spec → validate → three-sentence answer, worked on Leafy and rehearsed on your Fuel Smart portfolio question.
- **Part D, practice system:** a self-review rubric, a mistake log and a retry plan; then the lab with two SQL sessions, two Python sessions and one case.
- **Practice:** a bug clinic, 9 interview questions with model answers, and 10 exercises.

Every example ran while this deck was built; outputs are real. The `interview-foundations-lab/` folder ships next to this file.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

An interview round is a short, observed work sample. The interviewer cannot see your thinking, only hear it, so a correct answer reached in silence scores lower than a clear one reached aloud, and a fast answer that skips the grain or the edge cases often scores as wrong. Thinking aloud, clarifying first and checking your own work are skills like any other: they improve with a routine and deliberate practice, and they decay if you only start the week before an interview.

#### Where you will use it

- Technical screens: a live SQL or Python problem in a shared editor, 20–60 minutes.
- Onsite rounds: a modeling and metrics case on a whiteboard, with follow-up questions.
- At work: design reviews, pull-request walkthroughs, incident calls, and every “quick question” from a stakeholder.

#### What goes wrong without it

- Correct code, written silently, scored “leaning no hire” on communication.
- A query that answers a different question because nobody asked “one row per what?”.
- The same mistake (a missing tie-breaker, UTC months) in interview after interview, because it was never written down and retried.

#### Who expects you to know it

- Hiring managers and interviewers for data-engineer roles: communication and testing are scored dimensions in published rubrics.
- Your future teammates: the same habits make your pull requests and your numbers easy to trust.

> **On the job:** A product manager messages you: “Is same-day delivery working?” You restate the decision, name the grain, propose a metric with its exclusions, check it on the data, and reply in three sentences with a caveat. That is the case routine of Part C, used on a Tuesday afternoon.

> **The main idea:** interviews grade visible reasoning; a routine you practise early makes your reasoning visible without extra effort.

*Read more:* [Tech Interview Handbook: coding interview rubrics](https://www.techinterviewhandbook.org/coding-interview-rubrics/), [The Learning Scientists: retrieval practice](https://www.learningscientists.org/retrieval-practice).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A live SQL or Python problem, in an interview or a pairing session | The think-aloud loop (lesson 6) | Restating and naming edge cases first prevents solving the wrong problem; narration lets the interviewer give hints |
| “Design a model” or “define a metric for X” | The case routine (lessons 13–16) | Grain first and a metric spec avoid redesigning halfway; the three-sentence answer lands the decision |
| Right after every practice session | Rubric, mistake log and retry plan (lessons 17–18) | Turns one bad session into a rule you retry 1, 3 and 7 days later |
| Learning a technique for the first time | Not this routine: the topic deck | The routine assumes you already know the tool; reading the solution is learning, not practice |
| An interview in the next two weeks, or hard timed sets | Not yet: the timed SQL & Python lesson | Speed comes after the habits; timing a weak routine just makes it faster at being wrong |
| Using an AI assistant | After the self-review only | Recall without help is what builds the skill; AI is useful for variants and for reviewing your explanation |

#### How interviews test it

- “Walk me through your approach before you code.” (a plan, the grain, edge cases)
- “What is the time complexity?” (O(n) with a dict, O(n log n) with a sort)
- “How would you test it?” (a typical case, two edge cases, a reconciliation)
- “What is the grain of your fact table?” (one sentence: “one row per …”)
- “You have one minute with the COO.” (three sentences: answer, evidence, next step)

#### Where it sits in your learning path

- Builds on Classic SQL patterns, SQL correctness: joins, grain, and NULLs, Python foundations for data engineering, Metric design, and Why dimensional modeling.
- Next: Interview-style Python and Interview: timed SQL & Python (speed), Interview: modeling, metrics & dbt cases (more cases), Resume, LinkedIn & STAR stories, and Mock loops & take-home.

> **The main idea:** use the routines on every practice problem from now on; add the timer only after the habits are automatic.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · one lab folder, standard library and DuckDB*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** on Windows 11, **DuckDB 1.5.6** (Python package), **pytest 9.1.1**, and `tzdata` so that `zoneinfo` has time-zone data on Windows. |
| What ships with the deck | [interview-foundations-lab/](interview-foundations-lab/README.md): three small Leafy data files with planted edge cases, four SQL prompts with a checker (`check_sql.py`), two Python sessions with tests, a case card, rubrics, and `practice.py` for the session and mistake logs. |
| What was executed | Every Python block and command with an output, in a fresh copy of the lab folder. The Python problems use only the standard library, as most data-Python rounds expect. |
| What was not executed | Nothing in this deck needs a hosted service. Interview formats on slides 4–5 come from public guides and candidate reports (October 2026); companies vary, so ask your recruiter for the exact format. |
| Minimum versions | Python 3.11 or newer (`datetime.fromisoformat` accepts a trailing `Z` from 3.11); DuckDB 1.1 or newer (`QUALIFY`, `AT TIME ZONE`). |

#### Create the environment

```text
# Windows PowerShell, from the folder that holds this deck
cd interview-foundations-lab
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest tzdata
```

#### Check it

```python
import sys, duckdb, pytest
from zoneinfo import ZoneInfo
print("Python", sys.version.split()[0], "· DuckDB", duckdb.__version__, "· pytest", pytest.__version__)
print("Chicago zone loads:", ZoneInfo("America/Chicago").key)
```

Output:

```text
Python 3.12.10 · DuckDB 1.5.6 · pytest 9.1.1
Chicago zone loads: America/Chicago
```

The lab’s tests against the reference solutions (PowerShell: `$env:PRACTICE_IMPL="solutions"` first):

Terminal (the lab’s own tests):

```text
$ python -m pytest -q   # with PRACTICE_IMPL=solutions
............                                                             [100%]
12 passed in 0.24s
```

> **On the job:** Interview platforms (CoderPad, HackerRank, a shared doc) give you a plain editor with no autocomplete and often no internet. Practising in a bare terminal with the standard library, as this lab does, is closer to the real thing than practising in an IDE with an assistant.

> **The main idea:** one folder, the standard library, DuckDB and pytest: enough to rehearse every round offline.

*Read more:* [pytest: get started](https://docs.pytest.org/en/stable/getting-started.html), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [Python: zoneinfo](https://docs.python.org/3/library/zoneinfo.html).

---

<a id="slide-3"></a>
## 3. The running example: Leafy’s practice data, and what you already know

*Start here · three files, every trap planted, five earlier decks*

Leafy is the series’ online plant shop. In March 2026 it launched **same-day delivery** in Chicago. The lab’s three files are a small slice of that month. They are used in the SQL sessions, the Python sessions and the worked case.

#### The files

```python
import csv
from pathlib import Path

orders = list(csv.DictReader(open("data/orders.csv", encoding="utf-8")))
events = Path("data/events.jsonl").read_text(encoding="utf-8").splitlines()
print(len(orders), "order rows ·", len({o["order_id"] for o in orders}), "distinct orders")
print(len(events), "event lines")
for o in orders[:3]:
    print(o["order_id"], o["customer_id"], o["placed_at_utc"], o["delivery_option"], o["status"], o["amount"])
```

Output:

```text
22 order rows · 21 distinct orders
20 event lines
O01 C01 2026-02-10T16:00:00Z standard completed 35.00
O02 C02 2026-03-01T05:30:00Z standard completed 22.50
O03 C03 2026-03-02T15:00:00Z same_day completed 48.00
```

Columns of `orders.csv`: `order_id, customer_id, placed_at_utc, city, delivery_option, status, amount, promised_by_utc, delivered_at_utc`. `customers.csv` adds `signup_date, segment, is_staff`. Each line of `events.jsonl` is one app event with `event_id, user_id, event_type, event_ts, ingested_at`.

#### Edge cases planted on purpose

- **O07** appears twice (an ingestion replay): row count ≠ order count.
- **O02** at 05:30 UTC on 1 March is 28 February in Chicago; **O19** at 04:00 UTC on 1 April is still 31 March.
- **O13** is a guest order with no customer; **C06** is a staff account.
- **O08** cancelled, **O15** refunded, **O11** has no delivery time yet.
- **O10** is exactly 30 × 24 hours after **O05**: is day 30 inside a 30-day window?
- Events: one malformed line, one without `event_ts`, a `null` user, **E08** re-sent with a correction, **E05** sent twice, and the daylight-saving change on 8 March.

| Already taught (recap in one line) | Deck | This deck adds |
|---|---|---|
| A four-question method for window problems, and a six-step way to work a SQL interview question | *Classic SQL patterns*, slides 4 and 11 | Running a timed medium SQL *session* and scoring it |
| A grain-first routine: restate the output, name each table’s grain, predict joins, ask the NULL questions | *SQL correctness: joins, grain, and NULLs*, slide 22 | The same habit for Python problems and for cases |
| Parse, validate, deduplicate by a stated rule, group and count in plain Python | *Python foundations for data engineering*, slides 33–36 | Doing it aloud, under a timer, with complexity and tests |
| The metric spec card and the routine for vague requests | *Metric design: define the number before writing SQL*, slides 5–6 | A full case answer: model, spec, validation and a three-sentence answer |
| Grain and the four-step design process | *Why dimensional modeling*, slides 13–16 | Saying the grain first, out loud, in an interview |

> **On the job:** The traps above are the ones that cause real incidents: replayed rows double revenue, UTC month boundaries move orders between months, guests and staff distort customer metrics. An interviewer who plants one is checking whether you would catch it in production.

> **The main idea:** one small month of Leafy data with every common trap planted, and five earlier decks this one builds on rather than repeats.

*Read more:* [Python: csv](https://docs.python.org/3/library/csv.html), [Python: json](https://docs.python.org/3/library/json.html), [DuckDB: JSON](https://duckdb.org/docs/stable/data/json/overview).

---

<a id="slide-4"></a>
## 4. The data-engineer interview loop

*Part A · which rounds will I face, and what does each one check?*

An **interview loop** is the full sequence of conversations a company uses to decide on one candidate. Most data-engineer (DE) loops have a **screen** stage (one or two calls that decide whether you continue) and an **onsite** stage (three to five rounds, today usually on video, often on one day). Each round collects evidence on a few skills; the hiring decision is made from all rounds together, so one weak round is not automatically fatal, but a silent or disorganised one is hard to outweigh.

| Round | Typical format | What it checks | Where you prepare |
|---|---|---|---|
| Recruiter screen | 20–30 min call | Motivation, background, logistics; sometimes two or three quick SQL or Python questions | *Resume, LinkedIn & STAR stories* (later lesson) |
| Technical screen | 45–60 min in a shared editor (CoderPad, HackerRank, a doc); SQL, often plus Python | Correct queries and code, edge cases, speed, and whether you explain while you work | *Classic SQL patterns*, *SQL correctness: joins, grain, and NULLs*, *Python foundations for data engineering*; this deck’s Part B |
| SQL round (onsite) | 45–60 min, 2–4 problems that build on each other | Grain, joins and NULLs, windows, deduplication, local time; testing on small data | The SQL decks; lesson 7 and the lab’s SQL sessions |
| Python / data-manipulation round | 30–60 min, standard library, sometimes pandas | Parsing messy input, grouping, deduplication, dict lookups, complexity, “now it does not fit in memory” | *Python foundations for data engineering*; lessons 8–12 and the Python sessions |
| Modeling and metrics case | 45–60 min, whiteboard or doc | Clarifying a vague goal, grain, facts and dimensions, a precise metric, validation, a clear recommendation | *Why dimensional modeling*, *Metric design: define the number before writing SQL*; Part C |
| dbt or tools deep dive | 30–45 min discussion | Layers, tests, incremental models, sources versus refs | The dbt decks |
| Take-home (some companies) | 2–4 hours, then a review call | A small dbt project or analysis with a README you can defend | *Mock loops & take-home* (later lesson) |
| Behavioural and stakeholder | 30–45 min | Ownership, ambiguity, prioritisation, explaining trade-offs to non-technical people | *From vague ask to written spec*; *Resume, LinkedIn & STAR stories* |

#### What varies, and what to ask the recruiter

- Which rounds, in which order, and how long each one is.
- Which SQL dialect and editor; whether you can run the code.
- Whether Python means the standard library or pandas.
- Whether rounds are timed with several short problems (common in screens) or one problem that grows.
- Whether there is a take-home, and how long it should take.

Asking is normal and expected; the answers tell you which lab sessions to repeat.

#### What every round has in common

- A small, ambiguous prompt that you are expected to clarify.
- A planted edge case: a duplicate, a NULL, a tie, a time-zone boundary.
- A follow-up that changes one condition (“now there are ties”, “now it is 50 GB”).
- A score for communication, separate from correctness.

Part B and Part C give you one routine for each kind of round, so you never start from a blank page.

> **On the job:** Large companies often run a blended onsite where one round mixes a product question, a small model and a query on it. Smaller teams more often use one SQL screen, a take-home and a review call. Either way, the same three skills are scored: clarify, solve aloud, and check your work.

> **The main idea:** a DE loop is a screen, then three to five rounds (SQL, Python, a modeling and metrics case, sometimes dbt or a take-home, and behavioural); each one checks a few skills, and communication is scored in all of them.

*Read more:* [Start Data Engineering: DE interview prep, SQL](https://www.startdataengineering.com/post/de_interview_sql/), [Start Data Engineering: DE interview prep, data structures](https://www.startdataengineering.com/post/de_interview_dsa/), [IGotAnOffer: Meta data engineer interview](https://igotanoffer.com/blogs/tech/facebook-data-engineer-interview), [dbt Labs: what is data engineering](https://www.getdbt.com/what-is-analytics-engineering).

---

<a id="slide-5"></a>
## 5. How a round is scored, and what “foundations” means

*Part A · what does the interviewer write down about me?*

Most companies give interviewers a **rubric**: a short list of dimensions, each with written descriptions of strong and weak evidence. Published coding rubrics converge on four dimensions. Data interviews add a fifth that is specific to data work.

| Dimension | Evidence for “hire” | Evidence for “no hire” | Data-specific version |
|---|---|---|---|
| **Communication** | Clarifies, explains the approach before coding, keeps talking while coding, summarises | Long silences; narrates syntax (“now a for loop”); the interviewer has to ask what you are doing | Says the output grain out loud: “one row per customer per month” |
| **Problem solving** | Systematic plan, a sound approach, states trade-offs and complexity, needs few hints | Jumps straight to code; cannot explain why the approach works | Chooses aggregate-then-join, dedupe-then-count, local-then-truncate in the right order |
| **Technical competency** | Working code with few bugs, idiomatic, readable names | Code does not run; misuses the language | Uses `dict`, `Counter`, `sorted(key=…)`, `QUALIFY`, `COUNT(DISTINCT)` naturally |
| **Testing** | Walks an example by hand, finds corner cases, fixes own bugs | Declares “done” without testing; misses glaring bugs | Checks duplicates, NULLs, ties, empty groups and time-zone boundaries |
| **Data judgement** added | Asks how the number will be used; notices that the data could be wrong | Treats the input as clean and the metric as obvious | Reconciles counts (rows in = rows kept + rows rejected) and states assumptions |

#### How the score is used

Each interviewer writes evidence for each dimension and an overall band: **strong hire, hire, no hire, strong no hire**. The panel then reads all the rounds together. Two consequences: a partial solution explained well can still pass a round, and a correct solution with no explanation can fail it.

#### Foundations now, speed later

|  | This deck (now) | Later lessons |
|---|---|---|
| SQL | Medium problems, about 20 minutes each, explained aloud | Hard problems in 20–25 minutes (*Interview: timed SQL & Python*) |
| Python | Basic data problems, about 20 minutes each, no AI | Typical data-Python problems in 25 minutes, heapq, streaming (*Interview-style Python*) |
| Case | One case, 30 minutes, rehearsed aloud | 5+ modeling and 5+ metrics cases, dbt deep dives (*Interview: modeling, metrics & dbt cases*) |
| Loops | One short session a week while you build | Full mock loops and a take-home (*Mock loops & take-home*) |

> **On the job:** The same dimensions show up in performance reviews for data roles: whether people can follow your reasoning, whether your numbers hold up, and whether you catch your own mistakes. Practising for the rubric is practising for the job.

> **The main idea:** you are scored on communication, problem solving, technical skill, testing and data judgement; the foundations stage builds all five at a comfortable pace before any timer.

*Read more:* [Tech Interview Handbook: coding interview rubrics](https://www.techinterviewhandbook.org/coding-interview-rubrics/), [Tech Interview Handbook: coding interview cheatsheet](https://www.techinterviewhandbook.org/coding-interview-cheatsheet/).

---

<a id="slide-6"></a>
## 6. The think-aloud loop: one routine for every technical round

*Part B · what do I say, in what order, from prompt to “done”?*

**Thinking aloud** means saying your reasoning as you solve: what you understand, what you plan, what you check. It comes from a research method (the think-aloud protocol) and it is what interviewers mean by “talk me through it”. Coming from C#: it is a code review of your own work, done live, with the reviewer listening.

1. **Restate** (~1 min): Say the task in your words, including the output: “one row per …, sorted by …”.
2. **Examples** (~1 min): Agree one tiny input and its expected output with the interviewer.
3. **Edge cases** (~1 min): List them before coding: empty, None/NULL, duplicates, ties, boundaries, time zones.
4. **Approach** (~2 min): Steps in plain words, the data structure, and the time complexity. Ask “shall I code this?”.
5. **Code** (~10 min): Narrate decisions, not syntax: “I key the dict on order_id because that is the grain”.
6. **Test** (~3 min): Walk the example by hand, then each edge case; add one reconciliation check.
7. **Follow-up** (~2 min): Summarise, restate the complexity, say what changes at 100× the data.

#### SQL: you already have this (recap in one line)

For SQL, steps 1–4 are the four-question method and the six-step routine in *Classic SQL patterns* (slides 4 and 11) and the grain-first routine in *SQL correctness: joins, grain, and NULLs* (slide 22). This loop is the same skeleton, extended to Python problems and with an explicit test step.

#### Say this, not that

| Instead of… | Say… |
|---|---|
| (silence for two minutes) | “I am deciding between a dict and sorting first; the dict is one pass, so O(n).” |
| “Now I write a for loop.” | “I loop once over the lines and keep the latest row per order.” |
| “I think it works.” | “Let me walk the duplicate O07 through it: the second copy is skipped.” |
| “I don’t know.” | “The simple version is O(n²): compare every pair. Let me start there and improve it.” |

> **On the job:** The same loop is how good engineers handle a production question in a team channel: restate, ask about the edge, propose, check, answer. Interviewers recognise it because they use it themselves.

> **The main idea:** restate, examples, edge cases, approach and complexity, code, test, follow-up: seven steps, said out loud, for every SQL and Python problem.

*Read more:* [Tech Interview Handbook: coding interview cheatsheet](https://www.techinterviewhandbook.org/coding-interview-cheatsheet/), [Think-aloud protocol](https://en.wikipedia.org/wiki/Think_aloud_protocol), [Rubber duck debugging](https://en.wikipedia.org/wiki/Rubber_duck_debugging).

---

<a id="slide-7"></a>
## 7. Running a medium SQL session, and checking it yourself

*Part B · how do I practise SQL so that it counts for the definition of done? (added)*

A **medium** SQL problem needs one or two steps (a CTE, a window or a join) and contains one trap; it takes 15–25 minutes when you explain as you go. A **practice session** is two such problems in about 45 minutes, without AI, spoken aloud, then checked and self-scored. The lab has two sessions (S1 and S2, four prompts in `prompts.md`) and a checker that runs your query and a reference query in DuckDB and compares the rows.

#### A first attempt at S1b, typed in 12 minutes

*interview-foundations-lab/examples/S1b-attempt-1.sql:*

```sql
-- first attempt at S1b, typed in 12 minutes
SELECT city,
       date_trunc('month', placed_at_utc)::DATE AS month,
       sum(amount) AS revenue
FROM orders
WHERE status = 'completed'
  AND placed_at_utc >= TIMESTAMPTZ '2026-02-01 00:00:00+00'
  AND placed_at_utc <  TIMESTAMPTZ '2026-04-01 00:00:00+00'
GROUP BY city, month
ORDER BY city, month;
```

The prompt: completed revenue per city per month for February and March 2026, months in America/Chicago local time, 0 when a city had no orders, each order counted once.

#### What the checker says

Terminal:

```text
$ python check_sql.py S1b examples/S1b-attempt-1.sql
FAIL: your query returned 3 rows; the reference has 4.
  missing (in the reference, not in yours):
    ('Austin', '2026-02-01', 0.0)
    ('Chicago', '2026-02-01', 57.5)
    ('Chicago', '2026-03-01', 457.0)
  extra (in yours, not in the reference):
    ('Chicago', '2026-02-01', 35.0)
    ('Chicago', '2026-03-01', 475.5)
Edge cases in S1b (say how your query handles each one):
  - months are local to America/Chicago: O02 at 05:30 UTC on 1 March is February
  - O19 at 04:00 UTC on 1 April is still 31 March in Chicago
  - the replayed duplicate O07 must be counted once
  - Austin has no February orders but still needs a row with 0
[exit code 1]
```

The checker never shows the reference query. It lists the rows that differ and the edge cases this prompt contains; your job is to explain each one aloud.

| Checker line | Cause | The question you should have asked in step 1–3 |
|---|---|---|
| Austin 2026-02-01 0.0 missing | No spine: a city with no orders that month produces no row | “Do you want a row with 0 for empty months?” (spine + LEFT JOIN, *SQL correctness: joins, grain, and NULLs*) |
| Chicago February 35.0 instead of 57.5 | Months cut in UTC: O02 at 05:30 UTC on 1 March is 28 February in Chicago | “Whose midnight: UTC or the store’s local time?” |
| Chicago March 475.5 instead of 457.0 | +40.00 from the replayed O07 row, +22.50 from O02, −44.00 from O19 (31 March in Chicago) | “Can rows repeat? What is the key?” |

#### The second attempt passes

Terminal:

```text
$ python check_sql.py S1b examples/S1b-attempt-2.sql
PASS: 4 rows match the reference.
Edge cases in S1b (say how your query handles each one):
  - months are local to America/Chicago: O02 at 05:30 UTC on 1 March is February
  - O19 at 04:00 UTC on 1 April is still 31 March in Chicago
  - the replayed duplicate O07 must be counted once
  - Austin has no February orders but still needs a row with 0
```

The fix uses only techniques from the SQL decks: `SELECT DISTINCT *` for the exact replay, `AT TIME ZONE` before `date_trunc`, and a city × month spine with a `LEFT JOIN`.

#### The session protocol

- **Before:** open `prompts.md`, start a 45-minute timer and a recording.
- **During:** the think-aloud loop for each prompt; write the query in `attempts/`.
- **Check:** run `check_sql.py`; for every listed edge case, say how your query handles it.
- **After:** score the rubric (lesson 17), log mistakes and the session (lesson 18), and only then read `solutions/sql/`.
- **More medium problems:** DataLemur and StrataScratch (filter by medium); use the same protocol.

> **On the job:** A checker that compares your result with a known-good answer is how data engineers test models too: dbt unit tests and reconciliation queries compare actual rows with expected rows. Practising against a checker builds the habit of asking “how would I know this is right?”.

> **The main idea:** a medium SQL session is two prompts, 45 minutes, aloud, then a check and a self-score; every mismatch maps back to a question you should have asked in the first three minutes.

*Read more:* [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DataLemur SQL questions](https://datalemur.com/questions), [StrataScratch](https://www.stratascratch.com/).

---

<a id="slide-8"></a>
## 8. Basic data-Python: the toolkit and the complexity talk

*Part B · which tools does a data-Python round expect, and how do I talk about cost?*

A **basic data-Python problem** gives you a small list of strings, tuples or dicts (or a small file) and asks for a dict or a list back: parse it, group it, count it, deduplicate it, join it to a lookup. Most rounds expect the standard library only, because it shows that you understand the data structures that pandas hides. *Python foundations for data engineering* taught each tool; this slide is the interview checklist.

| You need to… | Reach for | Coming from C# |
|---|---|---|
| Look up a record by key; keep the best row per key | `dict` | `Dictionary<K,V>` |
| Count per key | `collections.Counter` | `GroupBy(k).Select(g => g.Count())` |
| Group rows into lists per key | `collections.defaultdict(list)` | `ToLookup(k)` |
| Distinct values; fast “have I seen it?” | `set` | `HashSet<T>` |
| Sort with a tie-breaker | `sorted(rows, key=lambda r: (-r[1], r[0]))` | `OrderByDescending(…).ThenBy(…)` |
| Parse JSON lines, CSV, timestamps, money | `json.loads`, `csv.DictReader`, `datetime.fromisoformat` + `zoneinfo`, `Decimal` | `JsonSerializer`, a CSV library, `DateTimeOffset`, `decimal` |

#### Complexity in one minute

**Time complexity** describes how running time grows with the input size *n*; **space complexity** does the same for memory. Both are written in **Big-O notation**, which keeps only the fastest-growing term: O(n) means “roughly proportional to n”.

| Operation | Cost |
|---|---|
| `d[key]`, `key in d`, `x in some_set` | O(1) on average |
| `x in some_list` | O(n): it scans the list |
| `sorted(rows)` | O(n log n) |
| A loop inside a loop over two inputs | O(n × m) |

What to say: “one pass with a dict is O(n) time and O(k) memory for k keys; the final sort of k keys adds O(k log k)”.

#### Why it matters on real data

```python
import timeit

ids = [f"C{i:05d}" for i in range(20_000)]
as_list, as_set = ids, set(ids)
probe = "C19999"                                  # the worst case for a list: the last item
t_list = timeit.timeit(lambda: probe in as_list, number=200)
t_set = timeit.timeit(lambda: probe in as_set, number=200)
print(f"in list: {t_list * 1e6 / 200:8.1f} µs per lookup")
print(f"in set:  {t_set * 1e6 / 200:8.3f} µs per lookup")
```

Output (measured on the build machine; your numbers will differ):

```text
in list:    215.4 µs per lookup
in set:     0.078 µs per lookup
```

A membership test inside a loop turns an O(n) solution into O(n²) when the lookup is a list. With 20,000 customers that is the difference above, multiplied by every row you process.

> **On the job:** In pipelines the same choice decides whether a job runs in seconds or hours: a lookup table loaded into a dict (or a hash join in the warehouse) versus a scan per row. Interviewers ask for complexity to see whether you would notice that before production does.

> **The main idea:** dict, Counter, defaultdict, set and sorted with a key solve most basic data-Python problems in one pass; say the complexity as “O(n) with a dict, plus O(k log k) to sort the result”.

*Read more:* [Python wiki: time complexity of built-in types](https://wiki.python.org/moin/TimeComplexity), [Big O notation](https://en.wikipedia.org/wiki/Big_O_notation), [Python: collections (Counter, defaultdict)](https://docs.python.org/3/library/collections.html), [Python: sorting HOW TO](https://docs.python.org/3/howto/sorting.html).

---

<a id="slide-9"></a>
## 9. Worked problem 1: parse messy lines, aloud

*Part B · “Here is an export from the old till. Turn it into records.”*

The interviewer pastes eight lines from Leafy’s old point-of-sale export and asks for a list of order records. The routine matters more than the code: most of the score is earned in the first three minutes.

| Step | What you say | What you write |
|---|---|---|
| 1 Restate | “I return one record per valid order line, with typed fields, plus a list of rejected lines with a reason. Right?” | `parse_orders(lines) -> (orders, rejects, skipped)` |
| 2 Example | “For `O01\|C01\|2026-03-02 09:15\|49.90` I expect O01, C01, that timestamp, and 49.90 as a `Decimal`.” | One expected record |
| 3 Edge cases | “I see a header, a blank line, spaces and lower case, a comma decimal, a missing amount, a date without time, an extra field, and a guest with a zero amount. Zero is valid; empty is not.” | A list of the eight lines and what each should do |
| 4 Approach | “One pass. Strip, skip header and blanks, split on the pipe, check the field count, then parse each field in its own try so the reason is precise. O(n) time, O(n) for the output.” | The function skeleton |
| 6 Test | “Rows in must equal kept plus rejected plus skipped; that catches any line I silently drop.” | The reconciliation `assert` |

#### Step 5: the code

```python
from datetime import datetime
from decimal import Decimal, InvalidOperation


def parse_orders(lines):
    """Parse 'order_id|customer_id|placed_at|amount' lines -> (orders, rejects, skipped)."""
    orders, rejects, skipped = [], [], 0
    for n, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.lower().startswith("order_id|"):   # blank line or header
            skipped += 1
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != 4:
            rejects.append((n, f"expected 4 fields, got {len(parts)}"))
            continue
        order_id, customer_id, placed_at, amount = parts
        try:
            ts = datetime.strptime(placed_at, "%Y-%m-%d %H:%M")
        except ValueError:
            rejects.append((n, f"bad placed_at {placed_at!r}"))
            continue
        try:
            value = Decimal(amount.replace(",", "."))           # "12,50" -> 12.50
        except InvalidOperation:
            rejects.append((n, f"bad amount {amount!r}"))
            continue
        orders.append({"order_id": order_id.upper(), "customer_id": customer_id.upper() or None,
                       "placed_at": ts, "amount": value})
    return orders, rejects, skipped
```

#### Step 6: test it against every line

```python
lines = [
    "order_id|customer_id|placed_at|amount",
    "O01|C01|2026-03-02 09:15|49.90",
    " o02 | c02 |2026-03-02 10:00| 12,50 ",
    "",
    "O03|C03|2026-03-02 11:30|",
    "O04|C04|2026-03-02|20.00",
    "O05|C05|2026-03-02 12:00|15.00|gift",
    "O06||2026-03-02 12:30|0.00",
]
orders, rejects, skipped = parse_orders(lines)
for o in orders:
    print(o["order_id"], o["customer_id"], o["placed_at"].isoformat(), o["amount"])
for r in rejects:
    print("reject", r)
assert [o["order_id"] for o in orders] == ["O01", "O02", "O06"]
assert orders[2]["amount"] == 0 and orders[2]["customer_id"] is None    # a real zero, a guest
assert len(orders) + len(rejects) + skipped == len(lines)               # every line accounted for
print("lines", len(lines), "= kept", len(orders), "+ rejected", len(rejects), "+ skipped", skipped)
```

Output:

```text
O01 C01 2026-03-02T09:15:00 49.90
O02 C02 2026-03-02T10:00:00 12.50
O06 None 2026-03-02T12:30:00 0.00
reject (5, "bad amount ''")
reject (6, "bad placed_at '2026-03-02'")
reject (7, 'expected 4 fields, got 5')
lines 8 = kept 3 + rejected 3 + skipped 2
```

**Follow-ups you can expect:** “Quoted fields contain the separator” → switch to `csv.reader(lines, delimiter="|")`. “The file is 10 GB” → make it a generator that yields records and writes rejects as it goes. “Different date formats per store” → a list of formats tried in order, and a count of rejects per store.

> **On the job:** This is the first step of every ingestion job: parse, validate, and quarantine what fails with a reason, instead of crashing or silently dropping rows. The reconciliation line is the same control a pipeline reports as “rows read / rows loaded / rows rejected”.

> **The main idea:** name every odd line before coding, give each failure its own reason, keep real zeros, and prove that rows in = rows kept + rows rejected + rows skipped.

*Read more:* [Python: datetime](https://docs.python.org/3/library/datetime.html), [Python: decimal](https://docs.python.org/3/library/decimal.html), [Python: csv](https://docs.python.org/3/library/csv.html).

---

<a id="slide-10"></a>
## 10. Worked problem 2: group, count, and top-k with ties

*Part B · “Who are our top two customers by revenue?”*

A grouping problem looks easy, so the score comes from the questions: what is a customer (guests?), what is revenue (which statuses?), and what happens on a tie. Agree the answers, then code one pass.

| Step | What you say | What you write |
|---|---|---|
| 1 Restate | “Sum amount per customer, skip guests, return the two highest. Is the input already completed orders only?” | `top_customers(rows, k=2)` |
| 3 Edge cases | “Guests with `None`; a tie at second place; fewer than k customers; empty input. For ties I suggest including everyone tied, like `RANK() <= 2` in SQL. OK?” | Tie rule agreed |
| 4 Approach | “A `defaultdict(Decimal)` in one pass, O(n). Then sort the k′ customers by revenue descending and id ascending, O(k′ log k′), and cut at the k-th revenue.” | Skeleton |
| 7 Follow-up | “For millions of customers and small k, `heapq.nlargest` is O(n log k), but I would still need the tie rule on top.” | — |

#### Step 5: one pass, then a deterministic sort

```python
from collections import Counter, defaultdict
from decimal import Decimal

rows = [("C01", Decimal("35.00")), ("C03", Decimal("48.00")), (None, Decimal("19.00")),
        ("C04", Decimal("31.00")), ("C03", Decimal("52.00")), ("C04", Decimal("28.00")),
        ("C08", Decimal("45.00")), ("C08", Decimal("30.00")), ("C05", Decimal("27.00"))]



def naive_top(rows, k=2):                           # the believable first answer
    totals = Counter()
    for customer, amount in rows:
        if customer:
            totals[customer] += amount
    return [(c, str(r)) for c, r in totals.most_common(k)]



def top_customers(rows, k=2):
    """Top k customers by revenue; everyone tied with the k-th is included. Guests are skipped."""
    totals = defaultdict(Decimal)
    for customer, amount in rows:
        if customer is not None:
            totals[customer] += amount
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))   # revenue desc, id asc
    if len(ranked) <= k:
        return ranked
    cutoff = ranked[k - 1][1]
    return [(c, r) for c, r in ranked if r >= cutoff]


result = top_customers(rows)
print("most_common(2):", naive_top(rows))
print("with ties:     ", [(c, str(r)) for c, r in result])
assert result == [("C03", Decimal("100.00")), ("C08", Decimal("75.00"))]
```

Output:

```text
most_common(2): [('C03', '100.00'), ('C08', '75.00')]
with ties:      [('C03', '100.00'), ('C08', '75.00')]
```

#### Step 6: test the tie the interviewer will add

```python
rows.append(("C04", Decimal("16.00")))           # C04 now also has 75.00
print("most_common(2):", naive_top(rows))
print("with ties:     ", [(c, str(r)) for c, r in top_customers(rows)])
assert [c for c, _ in top_customers(rows)] == ["C03", "C04", "C08"]
assert top_customers([]) == []
```

Output:

```text
most_common(2): [('C03', '100.00'), ('C04', '75.00')]
with ties:      [('C03', '100.00'), ('C04', '75.00'), ('C08', '75.00')]
```

`Counter.most_common` breaks ties by insertion order, so it silently drops C08 (or C04, depending on the input order). Saying the tie rule out loud, and putting the id in the sort key, makes the answer the same on every run.

> **On the job:** Top-N lists feed dashboards and incentive programs; a tie dropped at random is a customer who silently loses a reward. The deterministic sort key (value, then id) is the Python version of a unique tie-breaker in `ORDER BY`.

> **The main idea:** group in one pass with a dict, sort with a full key (value, then id), and agree the tie rule before you code; then say O(n + k log k).

*Read more:* [Python: collections (Counter, defaultdict)](https://docs.python.org/3/library/collections.html), [Python: sorting HOW TO](https://docs.python.org/3/howto/sorting.html), [Python: heapq](https://docs.python.org/3/library/heapq.html).

---

<a id="slide-11"></a>
## 11. Worked problem 3: deduplicate, the latest version wins

*Part B · “Status updates arrive late and twice. What is each order’s current status?”*

The technique (a dict of best-so-far rows keyed by the dedupe key) is in *Python foundations for data engineering*, worked example 3. In an interview the hard part is saying the rule before coding: **the key** (what makes two rows the same), **the winner** (which one survives) and **the tie-breaker** (what decides equal winners).

| Step | What you say | What you write |
|---|---|---|
| 1 Restate | “One row per order with its current status. Current means the latest `updated_at`, not the last row I receive. Correct?” | Rule: key = order_id; winner = max updated_at; tie = later arrival |
| 3 Edge cases | “A late-arriving older update, an exact replay, and two updates with the same timestamp.” | Three test rows |
| 4 Approach | “One pass, a dict from order_id to the best (timestamp, position) seen so far. O(n) time, O(k) memory for k orders.” | Skeleton |
| 6 Test | “O11: the late ‘packed’ must not overwrite ‘dispatched’. O15: same timestamp, so the later arrival ‘refunded’ wins.” | Asserts |

#### Steps 5–6: code and test

```python
from datetime import datetime

updates = [  # (order_id, status, updated_at, arrival position)
    ("O11", "placed",     "2026-03-10 10:30", 1),
    ("O11", "dispatched", "2026-03-10 14:05", 2),
    ("O07", "placed",     "2026-03-05 12:00", 3),
    ("O07", "delivered",  "2026-03-05 20:00", 4),
    ("O11", "packed",     "2026-03-10 12:10", 5),   # arrives late: older than 'dispatched'
    ("O07", "delivered",  "2026-03-05 20:00", 6),   # replayed copy
    ("O15", "delivered",  "2026-03-15 21:30", 7),
    ("O15", "refunded",   "2026-03-15 21:30", 8),   # same timestamp: the later arrival wins
]

last_seen = {o: s for o, s, _, _ in updates}        # the believable wrong answer
print("last seen:", dict(sorted(last_seen.items())))


def current_status(updates):
    best = {}
    for order_id, status, updated_at, pos in updates:
        key = (datetime.fromisoformat(updated_at), pos)          # newest, then latest arrival
        if order_id not in best or key > best[order_id][0]:
            best[order_id] = (key, status)
    return {o: s for o, (_, s) in sorted(best.items())}


result = current_status(updates)
print("current:  ", result)
assert result == {"O07": "delivered", "O11": "dispatched", "O15": "refunded"}
assert current_status([]) == {}
```

Output:

```text
last seen: {'O07': 'delivered', 'O11': 'packed', 'O15': 'refunded'}
current:   {'O07': 'delivered', 'O11': 'dispatched', 'O15': 'refunded'}
```

#### Why the wrong answer looks right

“Last seen wins” is correct whenever data arrives in order, which is most of the time in a demo and some of the time in production. It is wrong exactly when it matters: O11 shows *packed* after it was dispatched.

**Follow-ups:** “Keep the full history instead” → store a list per key and sort it, or keep both the first and the latest. “Two sources disagree” → add a source priority to the key tuple. “It is a stream” → the same dict works if memory holds one entry per open order; close orders that reach a final status.

> **On the job:** This is the logic behind incremental merges (`MERGE` or a dbt incremental model with a unique key) and SCD loads: decide the business key, the version order and the tie-breaker, or replays and late events will overwrite newer data.

> **The main idea:** say the key, the winner and the tie-breaker before you type; compare (timestamp, arrival) tuples so late and replayed rows cannot win.

*Read more:* [Python: datetime](https://docs.python.org/3/library/datetime.html), [Python: sorting HOW TO](https://docs.python.org/3/howto/sorting.html).

---

<a id="slide-12"></a>
## 12. Worked problem 4 and testing aloud: a lookup join, then the follow-ups

*Part B · “Add each order’s customer segment.” Then: “How do you know it works?”*

A **lookup join** in Python is a dict built from the small side, probed once per row of the big side: the hash join a database would choose. Two things can go wrong silently, so test them out loud: a key that is missing from the lookup (rows get a default) and a key that appears twice in the lookup (the dict keeps one and hides the other). Testing aloud means walking each edge case through the code and saying the expected result before you run it.

#### The code, with its reconciliation asserts

```python
from collections import Counter

customers = [("C01", "consumer"), ("C03", "consumer"), ("C04", "business"), ("C08", "consumer")]
orders = [("O01", "C01"), ("O04", "C04"), ("O13", None), ("O14", "C09"), ("O20", "C04"), ("O12", "C08")]


def enrich(orders, customers):
    """Add a segment to each order; report how many matched. The lookup must be one row per customer."""
    segment = {}
    for cid, seg in customers:
        if cid in segment:
            raise ValueError(f"customer {cid} appears twice in the lookup")
        segment[cid] = seg
    out, counts = [], Counter()
    for order_id, cid in orders:
        if cid is None:
            seg, outcome = "guest", "guest"
        elif cid in segment:
            seg, outcome = segment[cid], "matched"
        else:
            seg, outcome = "unknown", "missing customer"
        out.append((order_id, cid, seg))
        counts[outcome] += 1
    return out, counts


rows, counts = enrich(orders, customers)
for r in rows:
    print(r)
print(dict(sorted(counts.items())))
assert len(rows) == len(orders)                       # a lookup join never adds or drops orders
assert sum(counts.values()) == len(orders)            # every order lands in exactly one outcome
assert counts == {"matched": 4, "guest": 1, "missing customer": 1}
```

Output:

```text
('O01', 'C01', 'consumer')
('O04', 'C04', 'business')
('O13', None, 'guest')
('O14', 'C09', 'unknown')
('O20', 'C04', 'business')
('O12', 'C08', 'consumer')
{'guest': 1, 'matched': 4, 'missing customer': 1}
```

#### The edge-case table you say aloud

| Case | Input | Expected |
|---|---|---|
| Typical | O01 → C01 | consumer, matched |
| Same customer twice | O04, O20 → C04 | both business |
| Guest | O13 → None | guest, not “missing” |
| Unknown customer | O14 → C09 | unknown, counted as missing |
| Duplicate in lookup | C04 twice | error, not a silent overwrite |
| Empty input | [] | [] and zero counts |

```python
rows, counts = enrich(orders, customers + [("C04", "consumer")])
```

Output:

```text
ValueError: customer C04 appears twice in the lookup
```

A duplicate key in the lookup is a grain violation: the lookup is supposed to be one row per customer. Failing loudly is the Python version of the fan-out check in *SQL correctness: joins, grain, and NULLs*.

#### Follow-up: “The orders file is 50 GB”

```python
import csv
from collections import Counter


def statuses(path):
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):          # one row in memory at a time
            yield row["status"]


print(sorted(Counter(statuses("data/orders.csv")).items()))
```

Output:

```text
[('cancelled', 2), ('completed', 19), ('refunded', 1)]
```

Keep the small side (customers) in a dict and stream the big side with a generator: memory becomes O(customers) instead of O(orders). Say it in one sentence first; write it only if asked.

#### Other follow-ups, and one-sentence answers

- “Two lookups disagree” → pick a source priority and log the conflicts.
- “The lookup changes over time” → join on the version valid at the order time (an as-of join, *SQL correctness: joins, grain, and NULLs*).
- “Late rows” → re-run for the affected window; the function is pure, so the result is the same for the same input.
- “Make it faster” → it is already O(n + m); the next step is a database hash join, not a cleverer loop.

> **On the job:** Enriching events with a dimension, then reporting unmatched keys, is the daily work of a staging model. The two asserts (row count unchanged, outcomes add up) are the checks a dbt `relationships` test and a row-count reconciliation perform in a pipeline.

> **The main idea:** build the dict from the small side and refuse duplicate keys; then test aloud with an edge-case table and two reconciliation asserts, and answer scale follow-ups in one sentence.

*Read more:* [Python: collections (Counter, defaultdict)](https://docs.python.org/3/library/collections.html), [Python: functional programming HOW TO (generators)](https://docs.python.org/3/howto/functional.html), [Python: csv](https://docs.python.org/3/library/csv.html).

---

<a id="slide-13"></a>
## 13. The case routine: clarify, grain, model, metric spec, validate, answer

*Part C · how do I structure a 30–45 minute modeling and metrics case?*

A **modeling and metrics case** is an open prompt about a business goal (“Is feature X working?”, “Design the data for Y”) where you design the tables and define the numbers out loud. There is no single right answer; the interviewer scores whether your steps are in a sensible order and whether each decision is explicit. The routine below is the order that avoids redesigning halfway.

1. **Clarify** (3–5 min): The decision, who makes it and when; the population; the period and time zone; what “good” means. State assumptions out loud.
2. **Grain** (2 min): The unit of analysis, and one sentence per table: “one row per …”. Say it before naming any column.
3. **Model** (5–8 min): Facts and dimensions with keys, plus any derived table the metric needs (for example, one row per customer’s first order).
4. **Metric spec** (5 min): Primary metric and one guardrail: numerator, denominator, population, window, time zone, exclusions, unknowns.
5. **Validate** (3–5 min): Grain check, a reconciliation, a sensitivity check (which reading changes the answer), sample size and bias.
6. **Answer** (1 min): Three sentences: the answer with its number; the evidence and its limit; the recommendation and the next step.

#### Where each step comes from

- **Grain and model:** the four-step design process (business process, grain, dimensions, facts) from *Why dimensional modeling*.
- **Metric spec:** the metric spec card and the routine for vague requests from *Metric design: define the number before writing SQL*; here you fill in only the fields the decision needs.
- **Validate:** the reconciliation habit from *SQL correctness: joins, grain, and NULLs* and Part B of this deck.
- **Answer:** new here. A **three-sentence answer** is answer + evidence (with its limit) + recommendation (with the next step). It is what a busy decision-maker remembers.

#### Say this at each step

| Step | Opening line |
|---|---|
| Clarify | “Before I design anything: what decision will this number drive, and by when?” |
| Grain | “The unit is the new customer; the fact table is one row per order.” |
| Model | “Three tables and one derived table; let me draw them with their keys.” |
| Metric | “Primary metric first, then a guardrail so we do not win one number by breaking another.” |
| Validate | “Here is how I would know it is right before anyone sees it.” |
| Answer | “In one minute: …” |

> **On the job:** This is the shape of a good analytics ticket and a good design review: the question and decision, the grain, the model, the metric definition, the checks, and a short conclusion. Teams that skip the first two steps rebuild the model when the first stakeholder asks a follow-up.

> **The main idea:** clarify, grain, model, metric spec, validate, answer: say the grain before any column, and finish with three sentences that a decision-maker can act on.

*Read more:* [Kimball: four-step design process](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/four-4-step-design-process/), [Kimball: declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/).

---

<a id="slide-14"></a>
## 14. Worked case, steps 1–3: clarify, grain, model

*Part C · “Same-day delivery launched in Chicago on 2 March. Is it working? Should we launch it in Austin?”*

The COO’s question mixes a goal (“working”), a decision (Austin) and no definitions. The first five minutes turn it into something you can model.

| Step | What you say | What you write |
|---|---|---|
| 1 Clarify | “The decision is whether to launch same-day in Austin, by the end of April. ‘Working’ could mean more customers coming back, more revenue, or happy customers. I will use: new customers whose first order is same-day come back more often, without hurting delivery reliability. Cost per delivery matters too, but it is not in this data; I will flag it.” | Decision, success definition, assumption |
| 1 Clarify | “Population: new Chicago customers in March 2026, local time, excluding staff accounts and guest checkouts. Comparison: customers whose first order was standard delivery.” | Population and comparison group |
| 2 Grain | “The unit of analysis is the new customer. The fact table is one row per order; I need a derived table with one row per customer: their first completed order.” | Two grain sentences |
| 3 Model | “`fct_order` (one row per order, after removing replays), `dim_customer` (one row per customer, with `is_staff`), `dim_date`, and `int_first_order`. Delivery option stays on the fact as a plain attribute.” | The table list below |

#### The model you draw

| Table | Grain | Key | Main columns |
|---|---|---|---|
| fct_order | one row per order | order_id | customer_id, placed_at_utc, city, delivery_option, status, amount, promised_by_utc, delivered_at_utc |
| dim_customer | one row per customer | customer_id | signup_date, segment, is_staff |
| dim_date | one row per local calendar day | date | month, week, is_weekend |
| int_first_order | one row per customer | customer_id | first order_id, first_at, city, delivery_option |

**Why a derived table?** The metric is about customers, but the fact is about orders. Computing the first order once, at customer grain, keeps the metric query simple and testable.

#### Check the grain before trusting anything

```python
import check_sql                        # the lab's DuckDB views: orders, customers, events

con = check_sql.connect()
print("raw rows:", con.sql("SELECT count(*) FROM orders").fetchone()[0],
      "· distinct order_id:", con.sql("SELECT count(DISTINCT order_id) FROM orders").fetchone()[0])
print("duplicated keys:", con.sql("""
    SELECT order_id, count(*) AS copies FROM orders
    GROUP BY order_id HAVING count(*) > 1""").fetchall())

con.execute("CREATE TABLE fct_order AS SELECT DISTINCT * FROM orders")       # staging: drop the replay
FIRST_SQL = """
    CREATE TABLE int_first_order AS                                         -- one row per customer
    SELECT o.customer_id, o.order_id, o.placed_at_utc AS first_at, o.city, o.delivery_option
    FROM fct_order AS o
    JOIN customers AS c USING (customer_id)          -- inner join: drops guests (NULL customer_id)
    WHERE o.status = 'completed' AND NOT c.is_staff
    QUALIFY row_number() OVER (PARTITION BY o.customer_id ORDER BY o.placed_at_utc, o.order_id) = 1"""
con.execute(FIRST_SQL)
for t, key in (("fct_order", "order_id"), ("int_first_order", "customer_id")):
    n, k = con.sql(f"SELECT count(*), count(DISTINCT {key}) FROM {t}").fetchone()
    print(f"{t:<16} rows {n:>2} · distinct {key} {k:>2} · grain holds: {n == k}")
```

Output:

```text
raw rows: 22 · distinct order_id: 21
duplicated keys: [('O07', 2)]
fct_order        rows 21 · distinct order_id 21 · grain holds: True
int_first_order  rows 11 · distinct customer_id 11 · grain holds: True
```

The raw file is *not* at order grain: O07 was replayed. Saying “I would check the key is unique first” and finding a duplicate is exactly the evidence the validate step is for.

> **On the job:** In a dbt project these are a staging model (deduplicate, type the columns), a fact, a dimension and an intermediate model. Interviewers accept boxes on a whiteboard; what they listen for is the grain sentence for each box and the reason for the derived table.

> **The main idea:** turn the vague question into a decision, a population and a comparison; then state the grain of every table and check it before computing any metric.

*Read more:* [Kimball: declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/), [Kimball: four-step design process](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/four-4-step-design-process/), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify).

---

<a id="slide-15"></a>
## 15. Worked case, steps 4–6: metric spec, validate, three-sentence answer

*Part C · what number answers the COO, how do I know it is right, and what do I say?*

| Spec field | Primary: 30-day repeat rate of new customers | Guardrail: same-day on-time rate |
|---|---|---|
| Numerator | New customers with another completed order in [first order, first order + 30 days) | Completed same-day orders delivered by the promised time |
| Denominator | New customers (first completed order in the period) | Completed same-day orders with a known delivery time |
| Population and split | Chicago, first order in March 2026 (America/Chicago); split by first-order delivery option; no staff, no guests | Chicago, placed in March 2026 (local); guests included (a delivery is a delivery) |
| Unknowns | Customers with less than 30 days of history are not yet mature (re-run in May) | Orders with no delivery time are reported as “unknown”, not counted as late |

#### Step 5: compute, then walk the rows

```python
REPEAT_SQL = """
WITH cohort AS (
    SELECT * FROM int_first_order
    WHERE city = 'Chicago'
      AND date_trunc('month', first_at AT TIME ZONE 'America/Chicago') = DATE '2026-03-01'
),
flags AS (
    SELECT f.customer_id, f.delivery_option, bool_or(r.order_id IS NOT NULL) AS repeated
    FROM cohort AS f
    LEFT JOIN fct_order AS r
      ON r.customer_id = f.customer_id AND r.status = 'completed'
     AND r.placed_at_utc > f.first_at
     AND r.placed_at_utc < f.first_at + INTERVAL 30 DAY        -- half-open: day 30 is out
    GROUP BY ALL
)
SELECT delivery_option, count(*) AS new_customers, count(*) FILTER (WHERE repeated) AS repeat_30d,
       round(100.0 * count(*) FILTER (WHERE repeated) / count(*), 1) AS pct,
       string_agg(customer_id, ',' ORDER BY customer_id) AS who
FROM flags GROUP BY delivery_option ORDER BY delivery_option"""
for row in con.sql(REPEAT_SQL).fetchall():
    print(row)

print(con.sql("""
    SELECT count(*) FILTER (WHERE delivered_at_utc <= promised_by_utc) AS on_time,
           count(delivered_at_utc) AS known, count(*) - count(delivered_at_utc) AS unknown
    FROM fct_order
    WHERE city = 'Chicago' AND delivery_option = 'same_day' AND status = 'completed'
      AND date_trunc('month', placed_at_utc AT TIME ZONE 'America/Chicago') = DATE '2026-03-01'
""").fetchone(), "(on time, known, unknown)")
```

Output:

```text
('same_day', 4, 3, 75.0, 'C03,C04,C08,C10')
('standard', 4, 1, 25.0, 'C05,C07,C11,C12')
(5, 7, 1) (on time, known, unknown)
```

Walk it aloud: C03, C04 and C08 came back; C10’s first completed order is O16 because O15 was refunded. C05’s second order is exactly 30 days later, so it is out.

#### Step 5: which reading would change the answer?

```python
def readings(name, first_sql=FIRST_SQL, repeat_sql=REPEAT_SQL):
    con.execute("DROP TABLE int_first_order")
    con.execute(first_sql)
    rows = {r[0]: f"{r[2]}/{r[1]}" for r in con.sql(repeat_sql).fetchall()}
    print(f"{name:<34} same_day {rows['same_day']:<5} standard {rows['standard']}")


readings("as specified")
readings("day 30 counted (<=)", repeat_sql=REPEAT_SQL.replace("< f.first_at +", "<= f.first_at +"))
readings("staff included", first_sql=FIRST_SQL.replace("AND NOT c.is_staff", ""))
readings("cancelled first orders count", first_sql=FIRST_SQL.replace("o.status = 'completed' AND ", ""))
readings("as specified, again")
```

Output:

```text
as specified                       same_day 3/4   standard 1/4
day 30 counted (<=)                same_day 3/4   standard 2/4
staff included                     same_day 3/5   standard 1/4
cancelled first orders count       same_day 5/5   standard 1/3
as specified, again                same_day 3/4   standard 1/4
```

A **sensitivity check** re-runs the metric under the plausible alternative readings. The direction holds in every reading, which is what you want to say; the size moves, which is why the spec must be written down.

#### Step 6: the three-sentence answer

> “In Chicago’s March cohort, 3 of 4 new customers whose first order was same-day ordered again within 30 days, against 1 of 4 with standard delivery, and same-day orders arrived on time 5 times out of 7 with a known delivery time. These are tiny, self-selected groups, so this is an encouraging signal, not proof that same-day causes repeat purchases. I would run a limited Austin pilot with an on-time target of at least 90%, and add delivery cost per order before a full launch.”

#### Follow-ups, and one-line answers

- “Isn’t eight customers too few?” → Yes; I report counts, not just percentages, and re-run with April and May cohorts.
- “Maybe same-day attracts different customers.” → Selection bias; a randomised holdout in the Austin pilot answers it.
- “What about revenue?” → Add 60-day revenue per new customer as a secondary metric, from the same tables.
- “Late deliveries look bad.” → 2 of 7 late; that is the guardrail, so the pilot needs an on-time target.

> **On the job:** The same three moves (compute, sensitivity-check, summarise in three sentences) make a good weekly-business-review comment or a Slack reply to an executive. The spec table is what you paste into the pull request that adds the metric.

> **The main idea:** spec a primary metric and a guardrail, compute them, walk the rows, re-run the plausible readings, and close with answer, evidence with its limit, and a recommendation.

*Read more:* [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [Kimball: declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/).

---

<a id="slide-16"></a>
## 16. In your portfolio: rehearse the Fuel Smart case aloud

*Part C · the case you will be asked about most: your own project*

Interviewers often turn your portfolio into the case: “Walk me through Fuel Smart. What is the grain? How do you know the numbers are right?” Rehearse it with the same six steps. The model answer is in the lab (`solutions/case/fuel-smart-case.md`); here is the core of it.

| Step | What you say | What you write |
|---|---|---|
| 1 Clarify | “The decision is which simple recipes to recommend on training days: 10 ingredients or fewer, 45 minutes or less. Ratings only count with enough reviews.” | Decision, population |
| 2 Grain | “One recipe serving. The ingredient fact is one row per recipe ingredient line; the mart is one row per recipe.” | Grain sentences |
| 3 Model | “`fct_recipe_ingredient`, `dim_food`, `fct_food_nutrient`, `fct_review`, and `mart_recipe_nutrition`.” | Boxes with keys |
| 4 Metric | “Protein density: protein grams per 100 kcal from matched ingredients; a recipe is excluded below 80% matched weight, and I report how many.” | Spec |
| 5 Validate | “Unique keys; recipes in = ranked + excluded; protein × 4 + carbs × 4 + fat × 9 close to kcal.” | Checks |
| 6 Answer | “Among N simple recipes with good coverage, the top ten give X–Y g of protein per 100 kcal, rated about the same as the rest; matching coverage limits the ranking today.” | Three sentences |

#### Step 5 on a five-recipe fixture

```python
# Illustrative nutrient values per 100 g (a synthetic fixture with the real shape, not USDA data).
# Each line: (ingredient, grams, protein_g_per_100g, kcal_per_100g); None = no USDA match.
recipes = {
    "R1 lentil and spinach dal": [("red lentils", 200, 24.0, 350), ("spinach", 150, 2.9, 23),
                                  ("onion", 110, 1.1, 40), ("coconut milk", 200, 2.0, 200)],
    "R2 chicken traybake":       [("chicken breast", 500, 22.5, 120), ("broccoli", 300, 2.8, 34),
                                  ("olive oil", 30, 0.0, 884), ("spice mix", 10, None, None)],
    "R3 oat cookies":            [("oats", 150, 13.0, 380), ("butter", 120, 0.9, 717),
                                  ("sugar", 100, 0.0, 387), ("chocolate chips", 80, None, None)],
    "R4 tofu noodle stir-fry":   [("tofu", 400, 12.0, 120), ("noodles", 250, None, None),
                                  ("peppers", 200, 1.0, 26), ("soy sauce", 30, 8.0, 53)],
    "R5 yogurt and berry bowl":  [("greek yogurt", 500, 10.0, 59), ("berries", 200, 0.7, 57),
                                  ("honey", 30, 0.3, 304)],
}


def protein_density(lines, min_coverage=0.80):
    total = sum(g for _, g, _, _ in lines)
    matched = [(g, p, k) for _, g, p, k in lines if p is not None]
    coverage = sum(g for g, _, _ in matched) / total
    protein = sum(g * p / 100 for g, p, _ in matched)
    kcal = sum(g * k / 100 for g, _, k in matched)
    density = round(100 * protein / kcal, 1) if coverage >= min_coverage and kcal else None
    return density, round(coverage, 2)


ranked, excluded = [], []
for name, lines in recipes.items():
    density, coverage = protein_density(lines)
    (ranked if density is not None else excluded).append((name, density, coverage))
ranked.sort(key=lambda r: (-r[1], r[0]))
for r in ranked:
    print(f"{r[0]:<27} {r[1]:>5} g protein / 100 kcal   coverage {r[2]:.0%}")
for r in excluded:
    print(f"{r[0]:<27} excluded: coverage {r[2]:.0%} < 80%")
assert len(ranked) + len(excluded) == len(recipes)
```

Output:

```text
R2 chicken traybake          12.5 g protein / 100 kcal   coverage 99%
R5 yogurt and berry bowl     10.3 g protein / 100 kcal   coverage 100%
R1 lentil and spinach dal     4.9 g protein / 100 kcal   coverage 100%
R3 oat cookies                1.1 g protein / 100 kcal   coverage 82%
R4 tofu noodle stir-fry     excluded: coverage 72% < 80%
```

#### What the fixture teaches you to say

- **Exclusion with a reason:** R4 drops out because 250 g of noodles have no match; saying “excluded, not guessed” is the trust signal.
- **Servings cancel in a density:** protein per 100 kcal is a ratio of two per-serving totals, so the number of servings does not change it; it does change grams per serving.
- **Passing coverage is not the same as complete:** R3’s chocolate chips are unmatched, so its kcal is understated and its density overstated. Mention it as a known limit.
- **Reconcile:** five recipes in, four ranked plus one excluded out.

Rehearse aloud for 30 minutes with `templates/case-card.md`, score `templates/rubric-case.json`, then read the model answer and log the session with your feedback (lesson 18).

> **On the job:** A portfolio walkthrough is a case where you know the data better than the interviewer. The risk is the opposite of a cold case: too much detail. The six steps keep it to ten minutes, and the three sentences show you can explain your own work to a non-specialist.

> **The main idea:** rehearse your own project with the same six steps; the exclusion rule, the reconciliation and the three-sentence answer are what make it credible.

*Read more:* [Kimball: declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/), [Python: sorting HOW TO](https://docs.python.org/3/howto/sorting.html).

---

<a id="slide-17"></a>
## 17. A self-review rubric: score every session the same way

*Part D · how do I know whether a practice session went well?*

A **self-review** is scoring your own session against a fixed rubric right after it ends, from your recording or notes, before you read any solution. Scoring before reading matters: once you have seen the answer, everything looks obvious. The lab’s rubric uses the dimensions from lesson 5, each scored 0–3 with written anchors (`templates/rubric.md`).

| Technical dimension | 1 point | 2 points (interview level) | 3 points |
|---|---|---|---|
| clarify | Restated the task only | Restated, asked two or more questions, named the output grain | …and agreed an example input and output |
| approach | Plan only in your head | Said the steps before coding | …plus complexity and one alternative |
| correctness | Runs, wrong answer | Right on the main case | Right on every edge case (checker or tests pass) |
| testing | Re-read the code | Walked one example by hand | Walked a typical case and two edge cases; fixed what you found |
| communication | Narrated syntax | Narrated decisions | Decisions, a summary and a clear “done” |

#### Score a session

*interview-foundations-lab/examples/rubric-session1.json:*

```json
{"clarify": 2, "approach": 2, "correctness": 2, "testing": 1, "communication": 3}
```

Terminal:

```text
$ python practice.py score examples/rubric-session1.json
technical rubric: 10 / 15
  clarify=2  approach=2  correctness=2  testing=1  communication=3
weakest: testing -> make it the focus of your next session
verdict: below 2 somewhere: retry this pattern
```

The rule is simple: **no dimension below 2** means the session was at interview level for this stage. The weakest dimension becomes the one thing you focus on next time, not everything at once.

#### Scoring honestly

- **Use the recording.** Count silences longer than a minute; note the timestamp where you first said the grain.
- **An edge case counts only if you said it before the checker or tests showed it.**
- **Case rounds** use six dimensions (`templates/rubric-case.json`): clarify, grain, model, metric, validate, answer.
- **Peer review** (optional, valuable): a friend reads a prompt from `prompts.md`, stays silent unless asked, then fills in the same rubric. Compare their scores with yours.

> **On the job:** Engineering teams use the same idea in retrospectives and post-incident reviews: a fixed set of questions, answered soon after the event, before memory rewrites it. The habit of judging your work against written criteria transfers directly.

> **The main idea:** score every session on the same 0–3 rubric before reading solutions; interview level means no dimension below 2, and the weakest one sets the next session’s focus.

*Read more:* [Tech Interview Handbook: coding interview rubrics](https://www.techinterviewhandbook.org/coding-interview-rubrics/), [The Learning Scientists: retrieval practice](https://www.learningscientists.org/retrieval-practice).

---

<a id="slide-18"></a>
## 18. A mistake log and a retry plan

*Part D · how do I stop making the same mistake?*

A **mistake log** records each mistake from a session as data: the problem, the pattern, the type of mistake, and a one-line **rule** that would have prevented it. The rule is written from the **root cause** (why it happened), not the symptom: “I forgot the zero row” is a symptom; “‘per X per month’ means build the spine first” is a rule. Each logged mistake gets a **spaced retry**: you solve a fresh problem with the same pattern 1, 3 and 7 days later, without help. This uses two well-studied learning effects: **retrieval practice** (recalling without looking strengthens memory) and **spaced practice** (gaps between attempts make it last).

| Mistake type | Example from the lab | Rule you would log |
|---|---|---|
| clarify | Assumed UTC months in S1b | Ask “whose midnight?” before any date bucket |
| grain | Counted orders instead of customers in a repeat rate | Say “one row per …” for the output before writing |
| edge-case | No row for Austin in February | “Per X per month” → build the spine first |
| logic | Sort without a tie-breaker in P1b | Every sort in an answer gets a tie-breaker |
| api-recall | Forgot `datetime.fromisoformat` | Write the three parsing calls from memory once a week |
| complexity | `x in list` inside a loop | Membership inside a loop → a set |
| communication | Two silent minutes while debugging | Say the hypothesis before changing code |
| time | Spent 30 minutes on the first prompt | Move on at the time box; come back if time remains |

#### The log in action

```python
import shutil
shutil.copytree("examples/sample-log", "log")      # the demo starts from the sample log
for name in ("sessions", "mistakes"):
    rows = open(f"log/{name}.csv", encoding="utf-8").read().splitlines()
    print(f"{name}: {len(rows) - 1} rows · columns: {rows[0]}")
```

Output:

```text
sessions: 3 rows · columns: date,kind,problems,minutes,ai,score,feedback
mistakes: 5 rows · columns: id,date,kind,problem,pattern,type,rule,retries
```

Terminal:

```text
$ python practice.py log-mistake --date 2026-10-19 --kind python --problem P1a --pattern parse --type edge-case --rule "Name blank, header and malformed lines before coding"
mistake 6 logged; first retry due 2026-10-20
```

Terminal:

```text
$ python practice.py due --on 2026-10-19
retries due on or before 2026-10-19: 4
  #3 sql    S1b   dedupe       due 2026-10-15  rule: Ask 'can rows repeat?' and name the key before aggregating
  #2 sql    S1b   spine        due 2026-10-16  rule: 'per X per month' means build the X x month spine first
  #4 python P1b   sort-ties    due 2026-10-17  rule: Every sort in an answer gets a tie-breaker
  #5 sql    S2b   dedupe       due 2026-10-19  rule: Say the dedupe rule (key + winner + tie-breaker) before typing
```

Terminal:

```text
$ python practice.py retry 2 --date 2026-10-19 --result clean
mistake 2: clean on 2026-10-19; next retry 2026-10-22
```

#### Progress against the definition of done

Terminal:

```text
$ python practice.py report
Definition of done (sessions without AI):
  [x] sql    2 / 2
  [ ] python 1 / 2
  [ ] case   0 / 1
mistakes: 6 logged, 6 open
  by type:    edge-case 3, clarify 1, communication 1, logic 1
  by pattern: dedupe 2, month-bucket 1, parse 1, sort-ties 1, spine 1
```

A retry is *clean* when you solve a new problem of the same pattern within the time box and score at least 2 on the dimension that failed. A miss resets the schedule to one day. Three clean retries in a row close the mistake.

**Using AI in practice** added: never during an attempt. After the self-review it is useful to ask for three new problems with the same pattern, or for a critique of your recorded explanation against the rubric. Mixing patterns in one session (**interleaving**) is better than repeating one pattern five times.

> **On the job:** Teams do the same after incidents: a blameless postmortem names the root cause and an action item, and someone checks later that it worked. A personal mistake log is a postmortem for your practice, and it gives you true stories for “tell me about a mistake you made”.

> **The main idea:** log every mistake with a root-cause rule, retry the pattern 1, 3 and 7 days later without help, and let the report tell you what to practise next.

*Read more:* [The Learning Scientists: spaced practice](https://www.learningscientists.org/spaced-practice), [The Learning Scientists: retrieval practice](https://www.learningscientists.org/retrieval-practice), [The Learning Scientists: six strategies for effective learning](https://www.learningscientists.org/blog/2016/8/18-1).

---

<a id="slide-19"></a>
## 19. Lab: your first five sessions, then one a week

*Practice · two SQL sessions, two Python sessions, one case, checked and logged*

The lab turns the definition of done into five sessions you can finish in about five hours spread over two weeks. Everything runs offline in `interview-foundations-lab/`: [prompts.md](interview-foundations-lab/prompts.md) holds the rules and the prompts, and [README.md](interview-foundations-lab/README.md) lists every command and the expected results.

| Step | What you do (aloud, no AI, timer on) | How you check it | Done when |
|---|---|---|---|
| 0 · 10 min | Read the session rules in `prompts.md`; set up the environment (slide 2) | `python -m pytest -q` runs: 8 session tests fail, 4 pass | You can run the checker and the tests |
| 1 · 45 min | SQL session 1: S1a and S1b in `attempts/` | `python check_sql.py S1a attempts/S1a.sql`, then S1b; explain each listed edge case aloud | Both PASS or every FAIL line explained; rubric scored; mistakes and session logged |
| 2 · 45 min | Python session 1: implement `python_sessions/p1.py` | `python -m pytest -q tests/test_p1.py` | Tests pass, complexity said aloud, rubric scored, logged |
| 3 · 45 min | SQL session 2: S2a and S2b; start with any retries that are due | `check_sql.py` as above; `practice.py due --on <today>` | As step 1 |
| 4 · 45 min | Python session 2: implement `python_sessions/p2.py` | `python -m pytest -q tests/test_p2.py` | As step 2 |
| 5 · 30 min | The Fuel Smart case aloud with `templates/case-card.md`, recorded | Score `templates/rubric-case.json`; compare with `solutions/case/fuel-smart-case.md` | Session logged with written feedback |
| 6 · weekly | One short session a week while you build the portfolio: one due retry plus one new medium problem, alternating SQL and Python; a case once a month | `practice.py due` and `practice.py report` | The report shows no overdue retries |

#### Before you start: the Python stubs fail on purpose

Terminal (before you implement anything):

```text
$ python -m pytest -q --tb=no
FFFFFFFF....                                                             [100%]
=========================== short test summary info ===========================
FAILED tests/test_p1.py::test_parse_keeps_good_lines_and_explains_rejects - N...
FAILED tests/test_p1.py::test_parse_keeps_null_user_and_parses_offsets - NotI...
FAILED tests/test_p1.py::test_count_by_type_sorted_by_count_then_name - NotIm...
FAILED tests/test_p1.py::test_empty_input - NotImplementedError
FAILED tests/test_p2.py::test_dedupe_keeps_latest_ingested_copy - NotImplemen...
FAILED tests/test_p2.py::test_dedupe_tie_goes_to_later_line - NotImplementedE...
FAILED tests/test_p2.py::test_daily_active_users_in_local_time - NotImplement...
FAILED tests/test_p2.py::test_daily_active_users_in_utc_differs - NotImplemen...
8 failed, 4 passed in 0.18s
[exit code 1]
```

#### After the five sessions: the definition-of-done report

Terminal:

```text
$ python practice.py log-session --date 2026-10-20 --kind python --problems P2a,P2b --minutes 44 --ai no --score 12 --feedback "dedupe rule said first; tie by line"
logged python session on 2026-10-20 (4 sessions in the log)
```

Terminal:

```text
$ python practice.py log-session --date 2026-10-22 --kind case --problems fuel-smart --minutes 31 --ai no --score 14 --feedback "grain late; answer ran to 5 sentences; retry the answer step"
logged case session on 2026-10-22 (5 sessions in the log)
```

Terminal:

```text
$ python practice.py report
Definition of done (sessions without AI):
  [x] sql    2 / 2
  [x] python 2 / 2
  [x] case   1 / 1
mistakes: 6 logged, 6 open
  by type:    edge-case 3, clarify 1, communication 1, logic 1
  by pattern: dedupe 2, month-bucket 1, parse 1, sort-ties 1, spine 1
```

**Expected results.** Your SQL attempts PASS in `check_sql.py` (S1a 12 rows, S1b 4, S2a 4, S2b 3) or you can explain every FAIL line; `tests/test_p1.py` and `tests/test_p2.py` pass; the report shows all three definition-of-done lines ticked. The demo above continues the sample log from lesson 18; your own log starts empty in `log/`, which Git ignores.

> **On the job:** A small, repeatable practice loop with a scoreboard is how people keep a skill sharp while doing other work. One 30–45 minute session a week during the portfolio build keeps the habits alive, so the timed lessons later add speed instead of rebuilding basics.

> **The main idea:** five sessions (two SQL, two Python, one case), each spoken aloud, checked, scored and logged, then one short session a week until the timed lessons.

*Read more:* [pytest: get started](https://docs.pytest.org/en/stable/getting-started.html), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DataLemur SQL questions](https://datalemur.com/questions), [StrataScratch](https://www.stratascratch.com/).

---

<a id="slide-20"></a>
## 20. Bug clinic: believable mistakes in interview code and in the routine

*Practice · each one has cost real candidates a round*

#### Bug: valid zero amounts disappear

```python
from decimal import Decimal
amounts = [Decimal("19.00"), Decimal("0.00"), None, Decimal("5.50")]
kept = [a for a in amounts if a]                 # "skip missing amounts"
print(len(kept), "kept")
```

Output:

```text
2 kept
```

**Symptom:** the free sample order (0.00) vanishes with the missing one. **Fix:** test for missing explicitly: `if a is not None`. Say it aloud: “zero is a value; None is missing”.

#### Bug: splitting CSV on commas

```python
import csv
line = 'O09,"Ficus, large",33.00'
print(line.split(","))
print(next(csv.reader([line])))
```

Output:

```text
['O09', '"Ficus', ' large"', '33.00']
['O09', 'Ficus, large', '33.00']
```

**Symptom:** four fields instead of three, and an amount that will not parse. **Fix:** `csv.reader` understands quoting; `split` does not.

#### Bug: comparing timestamps as strings

```python
from datetime import datetime
a, b = "2026-03-08T13:00:00-05:00", "2026-03-08T17:30:00Z"
print("as strings, a is later:", a > b)
print("as instants, a is later:", datetime.fromisoformat(a) > datetime.fromisoformat(b))
```

Output:

```text
as strings, a is later: False
as instants, a is later: True
```

**Symptom:** a dedupe keeps the older copy whenever offsets differ (13:00 at −05:00 is 18:00 UTC, later than 17:30 UTC). **Fix:** parse to aware datetimes, then compare.

#### Bug: the date is sliced from the string

```python
from datetime import datetime
from zoneinfo import ZoneInfo
ts = "2026-03-08T05:30:00Z"                    # E04
print("ts[:10]       ->", ts[:10])
print("Chicago date  ->", datetime.fromisoformat(ts).astimezone(ZoneInfo("America/Chicago")).date())
```

Output:

```text
ts[:10]       -> 2026-03-08
Chicago date  -> 2026-03-07
```

**Symptom:** daily counts move events to the wrong day around midnight. **Fix:** convert to the business time zone, then take the date.

#### Bug: changing a dict while looping over it

```python
totals = {"C01": 35, None: 19, "C03": 100}
for customer in totals:
    if customer is None:
        del totals[customer]
```

Output:

```text
RuntimeError: dictionary changed size during iteration
```

**Fix:** build a new dict: `{c: t for c, t in totals.items() if c is not None}`, or loop over `list(totals)`.

#### Bug: the dedupe that trusts arrival order

```python
rows = [("O11", "dispatched", "14:05"), ("O11", "packed", "12:10")]   # packed arrives late
print({order: status for order, status, _ in rows})
```

Output:

```text
{'O11': 'packed'}
```

**Fix:** keep the row with the greatest (timestamp, arrival) per key, as in lesson 11. Say the winner and the tie-breaker before coding.

| Routine bug | Symptom | Fix |
|---|---|---|
| Silent coding | Interviewer asks “what are you doing?” twice | Say each decision before you type it; narrate decisions, not syntax |
| Solving a different question | Correct code, wrong output grain | Restate the output as “one row per …” and get a yes |
| “Done” without a test | The interviewer finds the bug for you | Walk one example and two edge cases; add a reconciliation |
| Five-minute answer to “what do you tell the COO?” | Interrupted halfway | Three sentences: answer, evidence with limit, recommendation |
| Ignoring a hint | The same hint, repeated | Repeat the hint back and act on it: hints are part of the conversation |

> **On the job:** Every code bug here has a production twin: free orders missing from revenue, product names split into columns, stale records winning a merge, sales on the wrong day, a crash in a cleanup job, a dashboard showing a status that was already superseded.

> **The main idea:** most interview bugs are data bugs: falsy zeros, naive splitting, string timestamps, UTC dates and arrival-order dedupes; most routine bugs are silence and skipping the test.

---

<a id="slide-21"></a>
## 21. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

These are the questions that came up most often in the interview research behind this deck: process questions asked in every technical round, the case closers, and one behavioural question about mistakes. Say your answer aloud in about a minute, then open the model answer.

<details><summary>“Walk me through how you would approach this before you write any code.” · checks: structure, clarifying, the output grain</summary>

**Model answer (about 60 s):** I would restate the task, including the output: one row per customer with their latest completed order. Then I would agree one tiny example and list edge cases: guests, cancelled orders, duplicates, ties on the timestamp. My approach is one pass with a dict keyed by customer, keeping the best (timestamp, order id) so far; that is O(n) time and O(k) memory. If that sounds right, I will code it and then walk the duplicate and the tie through it.

**Likely follow-up:** “What if two orders have the same timestamp?” → I already put order_id in the comparison key as the tie-breaker; I would confirm which one the business wants to win.

</details>

<details><summary>“What is the time and space complexity of your solution?” · checks: whether you know what your data structures cost</summary>

**Model answer (about 60 s):** The loop touches each row once, and each dict lookup and update is O(1) on average, so the main pass is O(n). Memory is O(k) for k distinct keys. Sorting the result adds O(k log k). If I had used a list for the membership check, it would be O(n × k), which is why I chose a set.

**Likely follow-up:** “Can you do better?” → Not asymptotically: every row must be read once. For small k of a large input I could use heapq.nlargest, which is O(n log k).

</details>

<details><summary>“How would you test this?” · checks: testing discipline beyond the happy path</summary>

**Model answer (about 60 s):** First the example we agreed, walked by hand. Then the edge cases I listed: empty input, a None key, a duplicate row, a tie, and a boundary like midnight in the business time zone. Finally a reconciliation that must always hold, for example rows in equals rows kept plus rows rejected. In a real codebase each of those becomes a pytest case.

**Likely follow-up:** “Which test would you write first?” → The reconciliation, because it catches silent drops that no single example shows.

</details>

<details><summary>“The file is 50 GB now. What changes?” · checks: streaming and memory awareness</summary>

**Model answer (about 60 s):** The logic stays the same; the memory profile changes. I would read the file line by line with a generator instead of loading a list, keep only the aggregation state in memory (one entry per key), and write rejects as I go. If the key space itself is too large, I would push the work into DuckDB or the warehouse, or partition by key and process the partitions separately.

**Likely follow-up:** “And if it must be exactly once?” → Make it restartable: record the last processed offset, and make the output write idempotent.

</details>

<details><summary>“Why not just use pandas?” · checks: judgement, not dogma</summary>

**Model answer (about 60 s):** In a real job I often would, for analysis on data that fits in memory. In this round the plain-Python version shows that I understand what groupby and merge do underneath, it has no dependency, and it streams. If you prefer pandas, I am happy to switch; the edge cases are the same.

**Likely follow-up:** “Show me the pandas version” → `groupby` with `sum`, then `nlargest` or a rank with `method="min"` for ties.

</details>

<details><summary>“What is the grain of your fact table, and why that grain?” · checks: the most important modeling decision, stated clearly</summary>

**Model answer (about 60 s):** One row per order, after removing replayed duplicates, because the business events are orders and every question we discussed can be answered by aggregating orders. Customer-level metrics such as the repeat rate need one row per customer, so I add a derived table of each customer’s first completed order rather than changing the fact’s grain.

**Likely follow-up:** “Why not one row per order line?” → If we need product-level questions, yes; then order-level amounts must not be repeated on every line.

</details>

<details><summary>“How do you know your metric is right?” · checks: validation habits and data judgement</summary>

**Model answer (about 60 s):** Four checks. The keys are unique at the grain I claimed. Counts reconcile: raw rows equal staged rows plus removed duplicates. I walk a handful of customers through the logic by hand, including the edge cases like the order exactly 30 days later. And I re-run the metric under the plausible alternative definitions to see whether the conclusion depends on one of them.

**Likely follow-up:** “The numbers don’t match Finance.” → Reconcile step by step: same population, same period and time zone, same statuses; the difference is usually one exclusion.

</details>

<details><summary>“You have one minute with the COO. What do you say?” · checks: whether you can land a decision</summary>

**Model answer (about 60 s):** In Chicago’s March cohort, three of four new customers whose first order was same-day came back within 30 days, against one of four with standard delivery, and same-day arrived on time five times out of seven. The groups are tiny and self-selected, so it is a promising signal, not proof. I recommend a limited Austin pilot with an on-time target and a delivery-cost metric before a full launch.

**Likely follow-up:** “So is it working or not?” → Probably, for retention; we will know in six weeks from the pilot’s holdout group.

</details>

<details><summary>“Tell me about a mistake you made in a query, and what you changed afterwards.” · checks: ownership and learning (behavioural)</summary>

**Model answer (about 60 s):** In practice I bucketed orders into months in UTC, which moved late-evening Chicago orders into the next month. I found it with a reconciliation against a checker, not by eye. Since then I ask “whose midnight?” before any date bucketing, and I keep a mistake log with a rule per mistake and retries a few days later; that rule has held in every session since.

**Likely follow-up:** “How do you make sure your team doesn’t repeat it?” → A test with a row at 23:30 local time, and the rule in the model’s documentation.

</details>

Behavioural stories in full STAR form (situation, task, action, result) are the subject of the *Resume, LinkedIn & STAR stories* lesson; harder technical follow-ups come in the timed lessons.

> **The main idea:** the process questions (approach, complexity, tests, scale, grain, validation, the one-minute answer) are predictable: rehearse them until each answer takes a minute.

*Read more:* [Tech Interview Handbook: coding interview cheatsheet](https://www.techinterviewhandbook.org/coding-interview-cheatsheet/), [DataDriven: the Python round for data engineers](https://datadriven.io/data-engineer-interview-prep/python-round), [STAR answer format](https://en.wikipedia.org/wiki/Situation,_task,_action,_result).

---

<a id="slide-22"></a>
## 22. Exercises 1–4 · warm-ups and a first interview-level problem

*Exercises · predict, count, fix, parse*

Say your restatement and edge cases aloud, then write the answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 1 · Predict the output, then make it tie-safe

Predict what this prints before running it. Then write `top_visitors(visits, k)` that returns every customer tied with the k-th place, sorted by count descending and id ascending, and gives the same answer for any input order. **Pattern:** top-k with ties (predict the output). **Target time:** about 5 minutes.

```python
from collections import Counter
visits = ["C2", "C1", "C2", "C3", "C1", "C3"]
print(Counter(visits).most_common(2))
```

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Count orders per status, with missing statuses

Given `rows = [{"status": "completed"}, {"status": None}, {}, {"status": "cancelled"}, {"status": "completed"}, {"status": ""}, {"status": "Completed "}]`, return `[(status, count), …]` with statuses trimmed and lower-cased, missing or empty ones counted as `"unknown"`, sorted by count descending then status. Say the complexity. **Expected:** `[("completed", 3), ("unknown", 3), ("cancelled", 1)]`. **Pattern:** group and count with normalisation. **Target time:** about 8 minutes.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Find and fix: the dedupe that keeps the wrong tie

The rule is “for each `event_id`, keep the copy with the latest `ingested_at`; on a tie, the later line wins”. This function passes a quick test but breaks the rule. Find the bug, fix it, and prove it with a test that fails on the old version. **Pattern:** dedupe with a tie-breaker (find the bug). **Target time:** about 8 minutes.

```python
def latest(events):
    best = {}
    for e in events:
        k = e["event_id"]
        if k not in best or e["ingested_at"] > best[k]["ingested_at"]:
            best[k] = e
    return best
```

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Parse lines and count daily active users in local time

Each line is `timestamp|user|event`. Return `(dau, rejects)`: `dau` maps each America/Chicago calendar date to the number of distinct users; `rejects` lists `(line_number, reason)` for lines whose timestamp is unparseable or has no offset. Lines with an empty user are skipped (not rejected). **Expected:** `{"2026-03-07": 2, "2026-03-08": 3, "2026-03-09": 1}` and two rejects (lines 8 and 9). **Pattern:** parse, validate, local-time bucketing, distinct count. **Target time:** about 15 minutes.

```python
lines = [
    "2026-03-07T22:30:00-06:00|C01|view",
    "2026-03-08T04:10:00Z|C02|view",
    "2026-03-08T01:59:00-06:00|C01|view",
    "2026-03-08T03:01:00-05:00|C03|cart",
    "2026-03-08T12:00:00-05:00||view",
    "2026-03-09T04:59:00Z|C02|view",
    "2026-03-09T05:00:00Z|C04|view",
    "not-a-time|C05|view",
    "2026-03-09T10:00:00|C05|view",
    "2026-03-09T10:00:00-05:00|C04|purchase",
]
```

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

> **The main idea:** every warm-up hides one interview habit: a tie rule, a None, a tie-breaker, a time zone.

---

<a id="slide-23"></a>
## 23. Exercises 5–7 · interview-level problems

*Exercises · group, reconcile, validate*

Say your restatement and edge cases aloud, then write the answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 5 · Top two customers per city, ties included

Rows are `(city, customer_id, amount)` for completed orders. Return a dict from city to a list of `(customer_id, revenue)`: the top two customers by revenue in each city, including everyone tied with second place, sorted by revenue descending then id. **Expected:** `{"Austin": [("C09", 41), ("C12", 20)], "Chicago": [("C03", 100), ("C04", 75), ("C08", 75)]}`. **Pattern:** top-N per group with ties (the Python version of `RANK() OVER (PARTITION BY city …) <= 2`). **Target time:** about 15 minutes.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · Reconcile orders and payments

Orders map `order_id` to an amount; payments are `(payment_id, order_id, amount)` and an order can have several. Return a sorted list of `(order_id, reason, ordered, paid)` for every problem: `"no payment"`, `"unknown order"` or `"amount differs"`. Use `Decimal`. **Expected:** O03 differs (48.00 vs 40.00), O04 has no payment, O99 is unknown; O02 is fine because its two payments add up. **Pattern:** full outer join with dicts, aggregate before comparing. **Target time:** about 15 minutes.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

### Exercise 7 · Check the grain before you trust a table

Write `grain_violations(rows, key)` that returns a dict from each key value that appears more than once to its number of copies (empty dict when the grain holds). `key` is a tuple of column names, so composite keys work. Use it on `data/orders.csv` (key `order_id`) and `data/customers.csv` (key `customer_id`), then say aloud what you would tell the interviewer about each. **Expected:** orders → `{("O07",): 2}`; customers → `{}`. **Pattern:** the validate step of a case (grain check). **Target time:** about 10 minutes.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

> **The main idea:** aggregate to the right grain before comparing, include ties on purpose, and check keys before trusting any table.

---

<a id="slide-24"></a>
## 24. Exercises 8–10 · stretch and take-home style

*Exercises · state, streaming, a portfolio metric*

Say your restatement and edge cases aloud, then write the answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 8 · Which retries are due, and what is my weakest pattern?

Each mistake has a date and a list of retries `(date, "clean" | "miss")`. The next retry is 1 day after the mistake (or after a miss), then 3 days and 7 days after consecutive clean retries; three clean retries in a row close it. Write `due(mistakes, on)` (ids sorted by due date, then id) and `weakest(mistakes)` (the pattern with the most mistakes, ties by name). **Expected on 2026-10-19:** due `[3, 2, 4, 5]`, weakest `"dedupe"`. **Pattern:** dates, state from an event list, group and count. **Target time:** about 15 minutes.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Stretch: the follow-up “now the file does not fit in memory”

Write a generator `iter_events(path)` that yields one parsed event dict per valid line of `data/events.jsonl` (skip blank and malformed lines and lines without `event_ts`), and `count_types(path)` that returns `[(event_type, count)]` sorted by count descending then name, without ever building a list of all events. **Expected:** `[("view", 9), ("add_to_cart", 6), ("purchase", 2)]`, and `iter_events` is a generator. **Pattern:** streaming with generators (scale follow-up). **Target time:** about 15 minutes.

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Take-home style: the vegetable and legume share for Fuel Smart

For each recipe, every ingredient line is `(name, grams, food_group)` where `food_group` is `None` when the ingredient has no USDA match. Compute the **vegetable and legume share** (grams in groups `"vegetables"` or `"legumes"` divided by matched grams), exclude recipes with matched-weight coverage below 80%, and return `(ranked, excluded)`: ranked by share descending then name, shares as percentages with one decimal. Then write the three-sentence answer. **Expected:** ranked R3 76.2, R1 69.7, R5 50.0, R2 41.1; R4 excluded at 71.6% coverage. **Pattern:** a take-home metric with an exclusion rule and a reconciliation. **Target time:** about 25 minutes.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

> **The main idea:** the stretch tasks are the follow-ups interviewers add: state over time, streaming, and a metric you must defend in three sentences.

---

<a id="slide-25"></a>
## 25. Cheat sheet and glossary

*Reference · one page to keep open while you practise*

#### Cheat sheet

| Moment | What to do or say |
|---|---|
| First minute of any problem | “So the output is one row per …, sorted by …. Can I check a small example?” |
| Before coding | List edge cases: empty, None/NULL, duplicates, ties, boundaries, time zones. Say the approach and its complexity. |
| Parse | Strip; skip blanks and header; one `try` per field with a reason; keep real zeros; rows in = kept + rejected + skipped. |
| Group and count | `Counter` / `defaultdict`; sort with `key=lambda kv: (-kv[1], kv[0])`; agree the tie rule. |
| Dedupe | Say key, winner, tie-breaker; compare `(timestamp, arrival)` tuples of parsed datetimes. |
| Lookup join | Dict from the small side; refuse duplicate keys; count matched / guest / missing; row count unchanged. |
| Local dates | `datetime.fromisoformat(s).astimezone(ZoneInfo("America/Chicago")).date()`, never `s[:10]`. |
| Scale follow-up | Generator over the big side, dict for the small side; or push it to DuckDB / the warehouse. |
| Case | Clarify → grain → model → metric spec (+ guardrail) → validate (grain, reconcile, sensitivity, sample size) → three sentences. |
| After the session | Score the rubric (no dimension below 2), log mistakes as rules, retry 1 / 3 / 7 days later, no AI during attempts. |
| Lab commands | `check_sql.py S1b attempts/S1b.sql` · `pytest -q tests/test_p1.py` · `practice.py score \| log-mistake \| log-session \| due \| report` |

#### Glossary

| Term | Meaning |
|---|---|
| Interview loop | The full sequence of interviews for one candidate: a screen stage, then three to five onsite rounds. |
| Technical screen | An early live round (SQL, often Python) that decides whether you reach the onsite. |
| Onsite | The main set of rounds, often on one day and usually on video. |
| Rubric | A fixed list of scored dimensions with written anchors, used by interviewers and by you in self-review. |
| Think aloud | Saying your reasoning while you solve: understanding, plan, checks. |
| Edge case | An input at the boundary of the rules: empty, None, duplicate, tie, midnight, daylight-saving change. |
| Time / space complexity | How running time / memory grow with input size, written in Big-O notation (O(n), O(n log n)). |
| Tie-breaker | An extra sort or comparison key that makes equal values come out in a fixed order. |
| Reconciliation | A check that totals or counts agree across steps, such as rows in = rows kept + rejected. |
| Lookup join | Enriching rows by probing a dict built from a small table: a hash join in Python. |
| Grain | What one row of a table represents: “one row per …”. |
| Modeling and metrics case | An open business prompt where you design tables and define numbers aloud. |
| Guardrail metric | A second metric that must not get worse while you improve the primary one. |
| Sensitivity check | Re-running a metric under plausible alternative definitions to see if the conclusion changes. |
| Three-sentence answer | Answer with the number; evidence and its limit; recommendation and next step. |
| Self-review | Scoring your own session against the rubric before reading any solution. |
| Mistake log | A record of each mistake with its pattern, type, root cause and a one-line rule. |
| Root cause | Why a mistake happened, as opposed to its symptom. |
| Spaced retry | Re-solving a missed pattern after growing gaps (1, 3, 7 days); an application of spaced practice. |
| Retrieval practice | Recalling without looking, which strengthens memory more than re-reading. |
| Interleaving | Mixing different problem types in one session instead of repeating one type. |

> **The main idea:** keep the cheat sheet next to the editor for your first sessions; when you no longer need it, start the timed lessons.

---

<a id="slide-26"></a>
## 26. Recap and references

*Reference · what to remember, and where to read more*

1. An data-engineer loop is a screen plus SQL, Python, a modeling and metrics case, sometimes dbt or a take-home, and a behavioural round; communication is scored in all of them.
2. Rubrics score communication, problem solving, technical skill and testing; data roles add judgement about grain and trust.
3. Use one think-aloud loop for every technical problem: restate, examples, edge cases, approach and complexity, code, test, follow-up.
4. A medium SQL session is two prompts in about 45 minutes, aloud, then a check; every mismatch maps to a question you should have asked.
5. Basic data-Python is parse, group and count, dedupe, lookup join; say the tie rule and the dedupe rule, keep real zeros, convert to local time, and reconcile.
6. Answer scale follow-ups in one sentence: stream the big side, keep the small side in a dict, or push the work to the database.
7. Run a case as clarify, grain, model, metric spec, validate, answer; say the grain before any column and close in three sentences.
8. Score every session before reading solutions; interview level means no dimension below 2.
9. Log each mistake as a rule and retry it 1, 3 and 7 days later without AI; one short session a week keeps the habits until the timed lessons.

- [Tech Interview Handbook: coding interview rubrics](https://www.techinterviewhandbook.org/coding-interview-rubrics/) · the four scored dimensions and what strong and weak evidence looks like.
- [Tech Interview Handbook: coding interview cheatsheet](https://www.techinterviewhandbook.org/coding-interview-cheatsheet/) · what to do before, during and after coding.
- [Start Data Engineering: DE interview prep, data structures](https://www.startdataengineering.com/post/de_interview_dsa/), [SQL](https://www.startdataengineering.com/post/de_interview_sql/) and [system design](https://www.startdataengineering.com/post/de_interview_sd/) · which data structures and question types data-engineering rounds use.
- [DataDriven: the Python round for data engineers](https://datadriven.io/data-engineer-interview-prep/python-round) · typical data-Python question types (parsing, grouping, dedupe, streaming).
- [IGotAnOffer: Meta data engineer interview](https://igotanoffer.com/blogs/tech/facebook-data-engineer-interview) · an example of a screen with SQL and Python blocks and a blended onsite.
- [dbt Labs: what is data engineering](https://www.getdbt.com/what-is-analytics-engineering) · what the role is, in the words of the people who named it.
- [The Learning Scientists: six strategies for effective learning](https://www.learningscientists.org/blog/2016/8/18-1), [spaced practice](https://www.learningscientists.org/spaced-practice), [retrieval practice](https://www.learningscientists.org/retrieval-practice) · the learning science behind the retry plan.
- [Python wiki: time complexity of built-in types](https://wiki.python.org/moin/TimeComplexity) · the costs to quote when asked about complexity.
- [Python: collections (Counter, defaultdict)](https://docs.python.org/3/library/collections.html), [sorting](https://docs.python.org/3/howto/sorting.html), [zoneinfo](https://docs.python.org/3/library/zoneinfo.html), [generators](https://docs.python.org/3/howto/functional.html) · the standard-library tools used in Part B.
- [Kimball: declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/) and [the four-step design process](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/four-4-step-design-process/) · the modeling steps behind the case routine.
- [DataLemur SQL questions](https://datalemur.com/questions) and [StrataScratch](https://www.stratascratch.com/) · further practice: more medium SQL and Python problems to run with the same session protocol.
- Earlier decks in this series: *Classic SQL patterns*, *SQL correctness: joins, grain, and NULLs*, *Python foundations for data engineering*, *Metric design: define the number before writing SQL*, *Why dimensional modeling*, *From vague ask to written spec*.

**How this deck was tested:** CPython 3.12.10, DuckDB 1.5.6, pytest 9.1.1 on Windows 11; every output above came from running the code against a fresh copy of `interview-foundations-lab/` during the build. Interview formats are summarised from public guides and candidate reports read in October 2026.

> **The main idea:** practise the routines now, one short session a week; speed, harder sets and full mock loops come next.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Predict the output, then make it tie-safe

All three customers have the same count. How does `most_common` order equal counts? (Look at the docs for “elements with equal counts”.)

<a id="hint-2"></a>
### Hint 2 · Count orders per status, with missing statuses

Normalise first with `(row.get("status") or "").strip().lower()`, then count with `Counter`. What should the empty string become?

<a id="hint-3"></a>
### Hint 3 · Find and fix: the dedupe that keeps the wrong tie

What happens when two copies have exactly the same `ingested_at`? Which one does a strict `>` keep?

<a id="hint-4"></a>
### Hint 4 · Parse lines and count daily active users in local time

Say the edge cases first: the daylight-saving jump on 8 March, a `Z` timestamp that is the previous evening in Chicago, a missing user, a timestamp with no offset. Then: `datetime.fromisoformat`, check `tzinfo`, `astimezone(ZoneInfo(...)).date()`, and a `defaultdict(set)`.

<a id="hint-5"></a>
### Hint 5 · Top two customers per city, ties included

Two levels of grouping: first sum per (city, customer) with a dict keyed by the tuple, then group those totals by city and apply the cutoff from lesson 10 to each city.

<a id="hint-6"></a>
### Hint 6 · Reconcile orders and payments

Aggregate payments per order first (what is the grain of `payments`?), then loop over the *union* of both key sets.

<a id="hint-7"></a>
### Hint 7 · Check the grain before you trust a table

`Counter(tuple(row[c] for c in key) for row in rows)`, then keep the entries with a count above one.

<a id="hint-8"></a>
### Hint 8 · Which retries are due, and what is my weakest pattern?

Replay the retries in order, keeping two pieces of state: the base date and the clean streak. A miss resets the streak; the offset is `(1, 3, 7)[streak]`.

<a id="hint-9"></a>
### Hint 9 · Stretch: the follow-up “now the file does not fit in memory”

Use `yield` inside a `with open(...)` loop; pass the generator straight into `Counter`. Memory is then O(number of event types).

<a id="hint-10"></a>
### Hint 10 · Take-home style: the vegetable and legume share for Fuel Smart

Compute three sums per recipe in one pass: total grams, matched grams, and vegetable-or-legume grams. Decide what the denominator is (matched grams) and say why before coding.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Predict the output, then make it tie-safe

```python
from collections import Counter
import random

visits = ["C2", "C1", "C2", "C3", "C1", "C3"]
print(Counter(visits).most_common(2))          # equal counts keep first-seen order


def top_visitors(visits, k):
    ranked = sorted(Counter(visits).items(), key=lambda kv: (-kv[1], kv[0]))
    if len(ranked) <= k:
        return ranked
    cutoff = ranked[k - 1][1]
    return [kv for kv in ranked if kv[1] >= cutoff]


print(top_visitors(visits, 2))
random.seed(7)
shuffled = random.sample(visits, len(visits))
assert top_visitors(shuffled, 2) == top_visitors(visits, 2) == [("C1", 2), ("C2", 2), ("C3", 2)]
assert top_visitors([], 2) == []
```

Output:

```text
[('C2', 2), ('C1', 2)]
[('C1', 2), ('C2', 2), ('C3', 2)]
```

**Why it works:** `most_common` orders equal counts by first appearance, so the answer depends on input order; a full sort key (count, then id) and a cutoff at the k-th count make it deterministic and tie-inclusive. **Common wrong answer:** trusting `most_common(2)` and saying “C2 and C1” without mentioning C3. **Interviewer follow-up:** “Return exactly k, ties broken by id” → slice `ranked[:k]` and say that the tie rule is now id order.

<a id="solution-2"></a>
### Solution 2 · Count orders per status, with missing statuses

```python
from collections import Counter

rows = [{"status": "completed"}, {"status": None}, {}, {"status": "cancelled"},
        {"status": "completed"}, {"status": ""}, {"status": "Completed "}]


def count_status(rows):
    counts = Counter((r.get("status") or "").strip().lower() or "unknown" for r in rows)
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))


result = count_status(rows)
print(result)
assert result == [("completed", 3), ("unknown", 3), ("cancelled", 1)]
assert sum(n for _, n in result) == len(rows)      # every row counted once
assert count_status([]) == []
```

Output:

```text
[('completed', 3), ('unknown', 3), ('cancelled', 1)]
```

**Why it works:** one pass, O(n) time and O(s) memory for s statuses, plus O(s log s) for the sort. `r.get` handles the missing key, `or ""` handles `None`, and the final `or "unknown"` handles empty strings after trimming. **Common wrong answer:** `r["status"]` (KeyError on `{}`) or counting `None` and `""` as two different groups. **Interviewer follow-up:** “Report the raw values you mapped to unknown” → count them separately, so the data owner can fix the source.

<a id="solution-3"></a>
### Solution 3 · Find and fix: the dedupe that keeps the wrong tie

```python
def latest_buggy(events):
    best = {}
    for e in events:
        k = e["event_id"]
        if k not in best or e["ingested_at"] > best[k]["ingested_at"]:
            best[k] = e
    return best


def latest(events):
    best = {}
    for e in events:
        k = e["event_id"]
        if k not in best or (e["ingested_at"], e["line"]) > (best[k]["ingested_at"], best[k]["line"]):
            best[k] = e
    return best


events = [{"event_id": "E15", "ingested_at": "2026-03-09T16:02:05+00:00", "line": 1, "type": "view"},
          {"event_id": "E15", "ingested_at": "2026-03-09T16:02:05+00:00", "line": 2, "type": "add_to_cart"}]
print("buggy:", latest_buggy(events)["E15"]["type"], "· fixed:", latest(events)["E15"]["type"])
assert latest_buggy(events)["E15"]["line"] == 1      # the test that exposes the bug
assert latest(events)["E15"]["line"] == 2
assert latest(list(reversed(events)))["E15"]["line"] == 2   # input order no longer matters
```

Output:

```text
buggy: view · fixed: add_to_cart
```

**Why it works:** comparing the tuple (ingested_at, line) makes the tie-breaker part of the comparison, so the result no longer depends on which copy arrives first. (The timestamps here share one offset, so comparing strings is safe; with mixed offsets parse them first, as in the bug clinic.) **Common wrong answer:** changing `>` to `>=`. It happens to work for this input, but it hides the rule (“the later line wins”) and breaks if the input is ever re-sorted. **Interviewer follow-up:** “Now there are 200 million events” → the same dict needs one entry per event_id; if that does not fit, push it to SQL: `QUALIFY row_number() OVER (PARTITION BY event_id ORDER BY ingested_at DESC, line DESC) = 1`.

<a id="solution-4"></a>
### Solution 4 · Parse lines and count daily active users in local time

```python
from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

lines = [
    "2026-03-07T22:30:00-06:00|C01|view",
    "2026-03-08T04:10:00Z|C02|view",
    "2026-03-08T01:59:00-06:00|C01|view",
    "2026-03-08T03:01:00-05:00|C03|cart",
    "2026-03-08T12:00:00-05:00||view",
    "2026-03-09T04:59:00Z|C02|view",
    "2026-03-09T05:00:00Z|C04|view",
    "not-a-time|C05|view",
    "2026-03-09T10:00:00|C05|view",
    "2026-03-09T10:00:00-05:00|C04|purchase",
]
CHICAGO = ZoneInfo("America/Chicago")


def local_dau(lines, zone=CHICAGO):
    users, rejects = defaultdict(set), []
    for n, line in enumerate(lines, 1):
        ts_text, user, _event = line.split("|")
        try:
            ts = datetime.fromisoformat(ts_text)
        except ValueError:
            rejects.append((n, "bad timestamp"))
            continue
        if ts.tzinfo is None:
            rejects.append((n, "no offset"))
            continue
        if user:
            users[ts.astimezone(zone).date().isoformat()].add(user)
    return {day: len(users[day]) for day in sorted(users)}, rejects


dau, rejects = local_dau(lines)
print(dau, rejects)
assert dau == {"2026-03-07": 2, "2026-03-08": 3, "2026-03-09": 1}
assert rejects == [(8, "bad timestamp"), (9, "no offset")]
naive = {}
for line in lines[:7] + lines[9:]:
    ts, user, _ = line.split("|")
    if user:
        naive.setdefault(ts[:10], set()).add(user)
print("sliced dates:", {d: len(u) for d, u in sorted(naive.items())})
```

Output:

```text
{'2026-03-07': 2, '2026-03-08': 3, '2026-03-09': 1} [(8, 'bad timestamp'), (9, 'no offset')]
sliced dates: {'2026-03-07': 1, '2026-03-08': 3, '2026-03-09': 2}
```

**Why it works:** converting each instant to Chicago time before taking the date puts 04:10 UTC on 8 March into 7 March and 04:59 UTC on 9 March into 8 March; `zoneinfo` applies the right offset on each side of the daylight-saving change. O(n) time, O(u) memory for distinct (day, user) pairs. **Common wrong answer:** slicing `ts[:10]`, which gives the date in whatever offset the writer used (the last line of output). **Interviewer follow-up:** “Weekly active users, weeks starting Monday” → bucket on `date - timedelta(days=date.weekday())`, still after converting to local time.

<a id="solution-5"></a>
### Solution 5 · Top two customers per city, ties included

```python
from collections import defaultdict

rows = [("Chicago", "C03", 48), ("Chicago", "C04", 31), ("Chicago", "C03", 52), ("Chicago", "C08", 45),
        ("Chicago", "C08", 30), ("Chicago", "C04", 44), ("Chicago", "C05", 27),
        ("Austin", "C09", 41), ("Austin", "C12", 20)]


def top_per_city(rows, k=2):
    totals = defaultdict(int)
    for city, customer, amount in rows:
        totals[(city, customer)] += amount
    by_city = defaultdict(list)
    for (city, customer), revenue in totals.items():
        by_city[city].append((customer, revenue))
    out = {}
    for city in sorted(by_city):
        ranked = sorted(by_city[city], key=lambda cr: (-cr[1], cr[0]))
        cutoff = ranked[min(k, len(ranked)) - 1][1]
        out[city] = [cr for cr in ranked if cr[1] >= cutoff]
    return out


result = top_per_city(rows)
print(result)
assert result == {"Austin": [("C09", 41), ("C12", 20)],
                  "Chicago": [("C03", 100), ("C04", 75), ("C08", 75)]}
assert top_per_city([]) == {}
```

Output:

```text
{'Austin': [('C09', 41), ('C12', 20)], 'Chicago': [('C03', 100), ('C04', 75), ('C08', 75)]}
```

**Why it works:** the composite key (city, customer) is the grain of the first aggregation; the per-city sort and cutoff implement “rank ≤ 2”. O(n) for the sums and O(c log c) per city for the sorts. **Common wrong answer:** sorting all customers once and taking the first two per city while iterating, which silently drops C08 (tied at 75). **Interviewer follow-up:** “Use dense rank instead” → keep customers whose revenue is among the top two *distinct* revenues: `sorted({r for _, r in ranked}, reverse=True)[:2]`.

<a id="solution-6"></a>
### Solution 6 · Reconcile orders and payments

```python
from collections import defaultdict
from decimal import Decimal

orders = {"O01": Decimal("35.00"), "O02": Decimal("22.50"), "O03": Decimal("48.00"), "O04": Decimal("31.00")}
payments = [("P1", "O01", Decimal("35.00")), ("P2", "O02", Decimal("20.00")), ("P3", "O02", Decimal("2.50")),
            ("P4", "O03", Decimal("40.00")), ("P5", "O99", Decimal("10.00"))]


def reconcile(orders, payments):
    paid = defaultdict(Decimal)
    for _pid, order_id, amount in payments:
        paid[order_id] += amount                      # payments are many per order: aggregate first
    problems = []
    for order_id in sorted(orders.keys() | paid.keys()):
        ordered, got = orders.get(order_id), paid.get(order_id)
        if got is None:
            problems.append((order_id, "no payment", ordered, None))
        elif ordered is None:
            problems.append((order_id, "unknown order", None, got))
        elif ordered != got:
            problems.append((order_id, "amount differs", ordered, got))
    return problems


for p in reconcile(orders, payments):
    print(p)
assert [(o, r) for o, r, _, _ in reconcile(orders, payments)] == [
    ("O03", "amount differs"), ("O04", "no payment"), ("O99", "unknown order")]
assert reconcile(orders, []) == [(o, "no payment", a, None) for o, a in sorted(orders.items())]
```

Output:

```text
('O03', 'amount differs', Decimal('48.00'), Decimal('40.00'))
('O04', 'no payment', Decimal('31.00'), None)
('O99', 'unknown order', None, Decimal('10.00'))
```

**Why it works:** aggregating payments to order grain first makes both sides one row per order, and iterating over the union of keys is a full outer join, so missing rows on either side surface. O(n + m). **Common wrong answer:** `paid = {order_id: amount for …}`, which keeps only the last payment for O02 and reports a false mismatch: the Python version of joining before aggregating. **Interviewer follow-up:** “Payments can be refunded (negative)” → they still sum; report orders whose net paid is zero separately, because they are not the same as “no payment”.

<a id="solution-7"></a>
### Solution 7 · Check the grain before you trust a table

```python
import csv
from collections import Counter


def grain_violations(rows, key):
    counts = Counter(tuple(row[c] for c in key) for row in rows)
    return {k: n for k, n in sorted(counts.items()) if n > 1}


with open("data/orders.csv", newline="", encoding="utf-8") as f:
    orders = list(csv.DictReader(f))
with open("data/customers.csv", newline="", encoding="utf-8") as f:
    customers = list(csv.DictReader(f))

print("orders:", grain_violations(orders, ("order_id",)))
print("customers:", grain_violations(customers, ("customer_id",)))
print("orders by (order_id, status):", grain_violations(orders, ("order_id", "status")))
assert grain_violations(orders, ("order_id",)) == {("O07",): 2}
assert grain_violations(customers, ("customer_id",)) == {}
```

Output:

```text
orders: {('O07',): 2}
customers: {}
orders by (order_id, status): {('O07', 'completed'): 2}
```

**What to say:** “orders.csv is not at order grain: O07 is an exact replay, so staging must deduplicate before any sum or count. customers.csv is one row per customer, so it is safe as a lookup.” **Common wrong answer:** checking `len(rows) == len(set(order_ids))` and stopping at “False”, without naming the offending keys or deciding what to do. **Interviewer follow-up:** “The two O07 rows differ in amount” → it is no longer a replay but a conflict: pick a rule (latest ingested, or source priority), log it, and add a uniqueness test so it cannot reach the mart.

<a id="solution-8"></a>
### Solution 8 · Which retries are due, and what is my weakest pattern?

```python
from collections import Counter
from datetime import date, timedelta

mistakes = [
    {"id": 1, "date": "2026-10-14", "pattern": "month-bucket", "retries": [("2026-10-15", "clean"), ("2026-10-18", "clean")]},
    {"id": 2, "date": "2026-10-14", "pattern": "spine", "retries": [("2026-10-15", "miss")]},
    {"id": 3, "date": "2026-10-14", "pattern": "dedupe", "retries": []},
    {"id": 4, "date": "2026-10-16", "pattern": "sort-ties", "retries": []},
    {"id": 5, "date": "2026-10-18", "pattern": "dedupe", "retries": []},
]
OFFSETS = (1, 3, 7)


def next_due(m):
    base, streak = date.fromisoformat(m["date"]), 0
    for day, result in m["retries"]:
        base, streak = date.fromisoformat(day), (streak + 1 if result == "clean" else 0)
    return None if streak >= len(OFFSETS) else base + timedelta(days=OFFSETS[streak])


def due(mistakes, on):
    on = date.fromisoformat(on)
    pending = [(next_due(m), m["id"]) for m in mistakes]
    return [i for d, i in sorted(p for p in pending if p[0] is not None and p[0] <= on)]


def weakest(mistakes):
    counts = Counter(m["pattern"] for m in mistakes)
    return min(counts, key=lambda p: (-counts[p], p))


print(due(mistakes, "2026-10-19"), weakest(mistakes), next_due(mistakes[0]))
assert due(mistakes, "2026-10-19") == [3, 2, 4, 5]
assert next_due(mistakes[0]) == date(2026, 10, 25)          # two clean retries: +7 days
assert weakest(mistakes) == "dedupe"
```

Output:

```text
[3, 2, 4, 5] dedupe 2026-10-25
```

**Why it works:** the schedule is a tiny state machine replayed from the retry list, so it never stores derived state that could drift. Sorting (date, id) tuples gives a stable order. This is what the lab’s `practice.py` does. **Common wrong answer:** counting all clean retries instead of consecutive ones, so a miss does not reset the schedule. **Interviewer follow-up:** “Show the next seven days as a calendar” → loop over the dates and call `due` for each, or group `next_due` results by date.

<a id="solution-9"></a>
### Solution 9 · Stretch: the follow-up “now the file does not fit in memory”

```python
import inspect
import json
from collections import Counter


def iter_events(path):
    with open(path, encoding="utf-8") as f:
        for line in f:                         # the file object is itself a lazy iterator
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("event_ts"):
                yield rec


def count_types(path):
    counts = Counter(e["event_type"] for e in iter_events(path))
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))


print(count_types("data/events.jsonl"))
assert inspect.isgenerator(iter_events("data/events.jsonl"))
assert count_types("data/events.jsonl") == [("view", 9), ("add_to_cart", 6), ("purchase", 2)]
```

Output:

```text
[('view', 9), ('add_to_cart', 6), ('purchase', 2)]
```

**Why it works:** the file is read line by line and each event is discarded after it is counted, so memory does not grow with the file. The counts match the lab’s `count_by_type` because both run before deduplication. **Common wrong answer:** `f.readlines()` or `list(iter_events(...))`, which loads everything and defeats the purpose. **Interviewer follow-up:** “Now dedupe while streaming” → you need a set of seen `event_id`s, which is O(distinct ids) memory; if that is too large, sort the file externally by id or push it to DuckDB.

<a id="solution-10"></a>
### Solution 10 · Take-home style: the vegetable and legume share for Fuel Smart

```python
recipes = {
    "R1 lentil dal":       [("red lentils", 200, "legumes"), ("spinach", 150, "vegetables"),
                            ("onion", 110, "vegetables"), ("coconut milk", 200, "nuts")],
    "R2 chicken traybake": [("chicken breast", 400, "poultry"), ("broccoli", 300, "vegetables"),
                            ("olive oil", 30, "fats"), ("spice mix", 10, None)],
    "R3 bean chili":       [("kidney beans", 400, "legumes"), ("tomatoes", 400, "vegetables"),
                            ("beef mince", 250, "beef"), ("chili spice", 15, None)],
    "R4 tofu stir-fry":    [("tofu", 400, "legumes"), ("noodles", 250, None),
                            ("peppers", 200, "vegetables"), ("soy sauce", 30, "condiments")],
    "R5 veggie omelette":  [("eggs", 300, "eggs"), ("peppers", 150, "vegetables"), ("spinach", 150, "vegetables")],
}
PLANTS = {"vegetables", "legumes"}


def plant_share(recipes, min_coverage=0.80):
    ranked, excluded = [], []
    for name, lines in recipes.items():
        total = sum(g for _, g, _ in lines)
        matched = sum(g for _, g, grp in lines if grp is not None)
        plants = sum(g for _, g, grp in lines if grp in PLANTS)
        coverage = matched / total if total else 0.0
        if coverage < min_coverage:
            excluded.append((name, round(100 * coverage, 1)))
        else:
            ranked.append((name, round(100 * plants / matched, 1)))
    ranked.sort(key=lambda r: (-r[1], r[0]))
    return ranked, excluded


ranked, excluded = plant_share(recipes)
for r in ranked:
    print(f"{r[0]:<20} {r[1]:>5}%")
print("excluded:", excluded)
assert ranked == [("R3 bean chili", 76.2), ("R1 lentil dal", 69.7),
                  ("R5 veggie omelette", 50.0), ("R2 chicken traybake", 41.1)]
assert excluded == [("R4 tofu stir-fry", 71.6)]
assert len(ranked) + len(excluded) == len(recipes)
```

Output:

```text
R3 bean chili         76.2%
R1 lentil dal         69.7%
R5 veggie omelette    50.0%
R2 chicken traybake   41.1%
excluded: [('R4 tofu stir-fry', 71.6)]
```

**Three-sentence answer:** “Of five recipes, four have enough matched weight to score; the bean chili leads with 76% of its matched weight from vegetables and legumes, and the lentil dal follows at 70%. The tofu stir-fry is excluded because its noodles are unmatched, so a quarter of its weight is unknown. Next I would improve noodle and spice matching, because coverage, not cooking, decides who is excluded.” **Common wrong answer:** dividing by total grams, which quietly penalises recipes with unmatched ingredients instead of excluding them with a reason. **Interviewer follow-up:** “Why matched weight, not total?” → unknown grams are unknown, not zero vegetables; the coverage rule keeps the ratio honest and the exclusion list makes the gap visible.
