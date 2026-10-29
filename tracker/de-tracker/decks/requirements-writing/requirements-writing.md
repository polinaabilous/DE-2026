# From vague ask to written spec: requirements interviews, intake, design docs and READMEs

*Companion to `requirements-writing.html`: same lessons, same numbering, same commands and outputs. Hints and solutions are in Appendices A and B.*

**Tested with:** CPython 3.12.10 on Windows 11 (64-bit), DuckDB 1.5.6 (Python package) and pytest 9.1.1. This is a writing deck: most lessons are worked documents (before and after). Every command and Python block shown with output was executed while this document was built, against the lab folder `requirements-writing-lab/` and the `templates/` folder that ship next to this file. The data is a 19-row synthetic Leafy order file with planted edge cases; nothing is downloaded and no hosted service is used. dbt models named in the Leafy example documents (design doc, PR description) are illustrative and were not built here; the dbt decks cover building them.

**Gap deck:** it teaches only what the earlier decks leave out. It assumes *Metric design: define the number before writing SQL* (the metric spec card, the clarifying routine for vague asks, pushing back with concrete readings), *Model a business end to end* (the bus matrix) and *Why dimensional modeling* (grain statements and the four-step design process), and refers to them by title instead of repeating them. New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common data-engineering interview patterns (research done in October 2026: vague requests, scope creep and deadlines, pushing back, requirements interviews, take-home READMEs and PR descriptions, design decisions). All questions are original and use the Leafy data or the Fuel Smart portfolio.

**Additions beyond the original brief** are marked *(added)*: acceptance criteria written as executable checks (`acceptance.py`); a small document linter, `doclint.py`, with tests for every template; status updates that offer options when a date is at risk; requirement keywords (RFC 2119) and half-open time windows for precise definitions; peer review with labelled comments, and the 10-minute README test; a “which document does this situation need?” recognition table.

## Contents

1. [From vague ask to written spec](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what was tested](#slide-2)
3. [The running example: Leafy’s inbox, and what you already know](#slide-3)
4. [The request-intake template](#slide-4)
5. [Worked intake: from a chat message to an agreed request](#slide-5)
6. [Acceptance criteria you can run](#slide-6)
7. [Scope a first version: must, later, and out of scope](#slide-7)
8. [Trade-offs and timeline updates: manage expectations in writing](#slide-8)
9. [In your portfolio: the Fuel Smart question through the intake](#slide-9)
10. [BEAM and the 7Ws: requirements as business events](#slide-10)
11. [Run a 7Ws interview: the script](#slide-11)
12. [From interview notes to an event table and a grain statement](#slide-12)
13. [From event table to bus-matrix rows](#slide-13)
14. [Rehearse it: an agent-telemetry interview and a metric push-back](#slide-14)
15. [Semantic precision: definitions two people count the same way](#slide-15)
16. [The one-page design doc](#slide-16)
17. [Decision records (ADRs)](#slide-17)
18. [PR descriptions a reviewer can trust](#slide-18)
19. [READMEs that onboard someone in 10 minutes](#slide-19)
20. [Get one peer review on every document that matters](#slide-20)
21. [Recognise which document the situation needs](#slide-21)
22. [Lab: the Fuel Smart spec pack](#slide-22)
23. [Bug clinic: believable requirement and writing bugs](#slide-23)
24. [Interview questions and model answers](#slide-24)
25. [Exercises 1–3 · warm-ups](#slide-25)
26. [Exercises 4–6 · scope, push-back, status](#slide-26)
27. [Exercises 7–9 · writing for reviewers](#slide-27)
28. [Exercises 10–11 · stretch](#slide-28)
29. [Cheat sheet](#slide-29)
30. [Glossary](#slide-30)
31. [Recap and how this deck meets the lessons](#slide-31)
32. [References and how this deck was tested](#slide-32)
33. [Appendix A · Hints](#appendix-a)
34. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. From vague ask to written spec

**

The *Metric design* deck taught you to define one number. This deck covers everything around it: the intake that pins the question, decision, grain and deadline; a first version that fits the time; a structured interview that finds the business events and turns them into bus-matrix rows; and the documents that let other people review and run your work without you.

- **Part A, intake and expectations:** the request-intake template, acceptance criteria you can run, MVP scope, trade-offs, status updates, and your portfolio question.
- **Part B, requirements interviews:** BEAM and the 7Ws, the interview script, event tables, grain statements, bus-matrix rows, and an agent-telemetry rehearsal.
- **Part C, writing:** precise definitions, one-page design docs, decision records (ADRs), PR descriptions, READMEs that onboard someone in 10 minutes, and peer review.
- **Practice:** the lab (the Fuel Smart spec pack), a bug clinic, interview questions with model answers, and 11 exercises.

Every command and check ran while this deck was built; outputs are real. The `templates/` folder and the `requirements-writing-lab/` folder ship next to this file.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Most data work starts as a sentence in a chat (“can you show me how repeat customers are doing, ASAP?”) and ends as tables, dashboards and pull requests that other people must trust and maintain. The gap between the two is **writing**: an intake that pins the question, the decision, the grain and the deadline; a scope that fits the time; an interview that finds the business events; and short documents (a design doc, a decision record, a PR description, a README) that let someone else review, run and extend your work without you in the room. This deck teaches those documents with worked Leafy examples, ready-to-copy templates and a small linter that catches the most common gaps.

#### Where you will use it

- Turning a stakeholder message into a ticket you can estimate and test.
- Saying what is in and out of a first version, and sending a status update before a date slips.
- Running a requirements workshop before you design a star schema.
- Writing the design doc, ADR and PR description that get your model merged.
- Your portfolio and take-home tasks, where the README is read before the code.

#### What goes wrong without it

- You build the dashboard that was asked for, not the number that was needed.
- Scope grows silently and the deadline is missed without warning.
- Two teams count the same word differently and argue about whose number is right.
- Reviewers cannot tell what a PR changes, so they approve blindly or block it.
- Nobody can run the project after you leave; a take-home reviewer gives up at step 2.

#### Who expects you to know it

- Data engineers: own requirements, definitions and model documentation; write design docs and ADRs for pipelines and platforms.
- Leads and reviewers: judge seniority by the clarity of your written work.
- Interviewers: stakeholder, scoping and take-home rounds test exactly this.

> **On the job:** Monday 09:10, a message from the Marketing lead: “Can you build me a dashboard on how our repeat customers are doing? Ideally real-time, by channel, region, product and campaign. Need it ASAP.” By Monday noon a strong data engineer has replied with a one-screen intake: the decision it supports (fund an email series or not, on 12 March), the grain (one row per cohort month per channel), the deadline (11 March, 17:00 Chicago), testable acceptance checks, and what is out of scope for v1. The building starts only after a “yes”.

> **The main idea:** the code is the easy half; the written question, scope and decisions are what make the result used and trusted.

*Read more:* [Modelstorming (Agile Data Warehouse Design, BEAM)](https://modelstorming.com/), [Kimball: the bus matrix](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/enterprise-data-warehouse-bus-matrix/), [Design docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/), [Google: writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| A request arrives in business words | An intake (lessons 4–6) | Pins question, decision, grain, deadline, owner and testable acceptance criteria. |
| The ask is bigger than the time | MVP scope + out-of-scope list (lesson 7) | Fix the time, flex the scope; say “not now” in writing. |
| A date or a source is at risk | A status update with options (lesson 8) | An early warning plus a choice beats a surprise on the due date. |
| A new business area to model | A BEAM 7Ws interview → event table → bus-matrix row (lessons 10–13) | Finds the events, the grain and the shared dimensions with the people who do the work. |
| A design with real alternatives or risk | A one-page design doc (lesson 16) | Reviewers can disagree before the code exists. |
| One choice others will question later | An ADR (lesson 17) | Records why, and what got harder, in five minutes of writing. |
| A one-line fix, or a one-off query for yourself | Not a design doc | A clear PR description or a code comment is enough; ceremony would cost more than it saves. |

#### How interviews test it

- “A stakeholder asks for a dashboard ASAP. What do you do?” (decision first, intake, MVP, confirm in writing).
- “Tell me about a time scope grew, or you pushed back on a deadline.” (options with trade-offs, early status updates).
- “How do you gather requirements?” (structured interview, examples, playback, sign-off).
- Take-homes judged on the README and the PR description (runs in 10 minutes, assumptions stated).
- “Here is how the business works; which facts and dimensions?” (events → grain → bus matrix).

#### Where it sits in your learning path

- Builds on *Metric design: define the number before writing SQL* (spec card, clarifying routine, pushing back), *Why dimensional modeling* (grain, four-step process) and *Model a business end to end* (bus matrix).
- Feeds every later project deck and your Fuel Smart portfolio: each release gets an intake, a design doc, ADRs and a README.

> **The main idea:** write the smallest document that lets someone else decide, review or run the work without you; skip it when nobody else needs it.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what was tested

*Start here · one small lab folder, no services*

| Item | Detail |
|---|---|
| Tested with | **CPython 3.12.10** on Windows 11, **DuckDB 1.5.6** (Python package) and **pytest 9.1.1**. Nothing else. |
| What ships with the deck | `templates/`: 10 Markdown templates (intake, definition, metric spec, one-page design doc, ADR, PR description, README, status update, BEAM interview, peer-review checklist). `requirements-writing-lab/`: `doclint.py` (checks a document by kind), `bus_matrix.py` (event table → bus matrix), `acceptance.py` (acceptance criteria as checks), a 19-row Leafy fixture, worked examples, model answers and tests. |
| What was executed | Every command and Python block with an output below, in a fresh copy of the lab folder. The worked documents are the real files in `examples/`, linted during the build. |
| What was not executed | The dbt models *named* in the Leafy design doc and PR description are illustrative (the dbt decks build such models). The Fuel Smart README in `solutions/` describes a project you will build; its commands and output are labelled illustrative. No hosted service, no download. |
| Minimum versions | Python 3.10 or newer; DuckDB 1.1 or newer (`QUALIFY`, and `AT TIME ZONE` through the ICU extension that the Python package bundles). On Windows nothing else is needed: DuckDB ships its own time-zone data. |

#### Create the environment

```text
# Windows PowerShell, from the folder that holds this deck
cd requirements-writing-lab
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest
```

#### Check it

```python
import sys, duckdb, pytest, doclint
print("Python", sys.version.split()[0])
print("DuckDB", duckdb.__version__, "· pytest", pytest.__version__)
print("doclint kinds:", ", ".join(doclint.REQUIRED))
```

Output:

```text
Python 3.12.10
DuckDB 1.5.6 · pytest 9.1.1
doclint kinds: intake, definition, spec, design, adr, pr, readme, status
```

Terminal (the lab’s own tests):

```text
$ python -m pytest -q
...............                                                          [100%]
15 passed in 2.01s
```

> **On the job:** The documents in this deck live in Git next to the code they describe: `docs/` for intakes, design docs and ADRs, `.github/pull_request_template.md` for PRs, `README.md` at the root. A tiny checker such as `doclint.py` can run in CI like any linter, so missing sections are caught in review instead of in a meeting.

> **The main idea:** one folder, three small scripts, real outputs. The point is the writing; the scripts only make the common gaps visible.

*Read more:* [pytest: get started](https://docs.pytest.org/en/stable/getting-started.html), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [GitHub: Markdown syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

---

<a id="slide-3"></a>
## 3. The running example: Leafy’s inbox, and what you already know

*Start here · three requests, one portfolio, three earlier decks*

Leafy is the series’ online plant shop (orders, customers, events). Three requests arrive in one month. Each one is used in a different part of the deck, so you see the same techniques on different asks.

| Request (in the requester’s words) | From | Used in |
|---|---|---|
| “Can you build me a dashboard on how our repeat customers are doing? Ideally real-time, by channel, region, product and campaign. Need it ASAP for the spring campaign planning.” | Marketing lead | Intake, acceptance criteria, scope, status (lessons 4–8); every document in Part C |
| “Is the Plant Doctor working? I want a success metric for it.” (Plant Doctor is Leafy’s AI plant-care assistant in the app.) | Product manager | Agent-telemetry interview rehearsal (lesson 14) |
| “Can you tell me if the workshops are worth it? People seem to love them.” | Events coordinator | The lab (your second intake) |
| **In your portfolio:** Fuel Smart v1. “Which simple recipes give the most protein and fibre per calorie and contain the most vegetables, and do reviewers rate them as highly as other recipes?” | You | Lesson 9, the lab, exercise 11 |

#### The fixture behind the acceptance checks

```python
import duckdb
duckdb.sql("SET TimeZone = 'UTC'")
rows = duckdb.sql("""
    SELECT order_id, coalesce(customer_id, '-') AS customer, placed_at_utc,
           strftime((placed_at_utc::TIMESTAMP AT TIME ZONE 'UTC')
                    AT TIME ZONE 'America/Chicago', '%m-%d %H:%M') AS chicago,
           status, channel, is_staff
    FROM read_csv('data/leafy_orders.csv') ORDER BY order_id""").fetchall()
for r in rows:
    print(*r)
```

Output:

```text
O01 C01 2026-01-05 16:00:00 01-05 10:00 completed web False
O02 C01 2026-01-15 18:00:00 01-15 12:00 completed web False
O03 C02 2026-01-08 15:00:00 01-08 09:00 completed app False
O04 C02 2026-02-07 15:00:00 02-07 09:00 completed app False
O05 C03 2026-01-12 20:00:00 01-12 14:00 completed web False
O06 C04 2026-01-20 14:00:00 01-20 08:00 completed app False
O07 C04 2026-01-28 14:00:00 01-28 08:00 cancelled app False
O08 C05 2026-01-22 17:00:00 01-22 11:00 completed web False
O09 C05 2026-01-27 17:00:00 01-27 11:00 completed web False
O10 C05 2026-02-03 17:00:00 02-03 11:00 completed web False
O11 C06 2026-01-10 15:00:00 01-10 09:00 completed web True
O12 C06 2026-01-11 15:00:00 01-11 09:00 completed web True
O13 C07 2026-02-01 03:30:00 01-31 21:30 completed web False
O14 C07 2026-02-14 19:00:00 02-14 13:00 completed web False
O15 C08 2026-01-25 16:00:00 01-25 10:00 cancelled app False
O16 C08 2026-02-05 16:00:00 02-05 10:00 completed app False
O17 C08 2026-02-20 16:00:00 02-20 10:00 completed app False
O18 C09 2026-02-10 18:00:00 02-10 12:00 completed web False
O19 - 2026-01-18 17:00:00 01-18 11:00 completed web False
```

#### Edge cases planted on purpose

- **C07**: first order at 03:30 UTC on 1 February, which is 21:30 on 31 January in Chicago.
- **C02**: second order exactly 30 × 24 hours after the first.
- **C04**: second order cancelled. **C08**: first order cancelled, then two completed.
- **C06**: a staff account. **O19**: a guest checkout with no customer.
- **C05**: three orders, so “repeat” must count customers, not orders.

Lessons 5–6 show how each one changes the answer, and why the intake must name them.

| Already taught (recap in one line) | Deck | This deck adds |
|---|---|---|
| Vague ask → metric spec card; a clarifying routine; pushing back with concrete readings | *Metric design: define the number before writing SQL*, slides 4–8 | The intake around the request: decision, deadline, owner, acceptance criteria, scope and timing |
| Grain statements and the four-step design process | *Why dimensional modeling*, slides 13–16 | How to get the grain from people: BEAM 7Ws interviews |
| The bus matrix as a one-page plan | *Model a business end to end*, slide 3 | Turning interview notes into bus-matrix rows, with checks |
| The metric spec card as a precise written definition | *Metric design*, slide 5 | Precision in every document: definitions, design docs, ADRs, PRs, READMEs |

> **On the job:** Real requests look like these: a mix of a goal (“plan the spring campaign”), a solution (“a dashboard”), and wishes (“real-time, by everything”). Your first job is to separate the decision from the wish list, in writing.

> **The main idea:** one realistic inbox, one 19-row fixture with every trap planted, and three earlier decks this one builds on rather than repeats.

*Read more:* [DuckDB: reading CSV files](https://duckdb.org/docs/stable/data/csv/overview), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones).

---

<a id="slide-4"></a>
## 4. The request-intake template

*Part A · what must be written down before you start building?*

A **request intake** is a short, structured record of one request, written when it arrives and agreed with the requester before any building starts. It turns a message into something you can estimate, test and say “done” to. Coming from C#: it is the interface and the unit tests of a request, written before the implementation. The SQL, models and dashboards are the implementation.

| Field | The question it answers | Vague → precise |
|---|---|---|
| **Question** | What exactly do we want to know? One sentence, ending with “?”. | “How are repeat customers doing” → “What share of new customers place a second completed order within 30 days, by first-order month and channel?” |
| **Decision it supports** | Who decides what, when, and what changes for each answer? | “Marketing planning” → “On 12 March the Marketing lead funds the email series if the web repeat rate is below 40%.” |
| **Grain** | What is one row of the answer? Which population? | “by everything” → “one row per cohort month per acquisition channel; staff and guests excluded”. |
| **Deadline** | By when, in which time zone, and what event sets it? | “ASAP” → “2026-03-11 17:00 America/Chicago, for the pre-read”. |
| **Owner** | Who builds it, who owns the definition, who signs off? | “Marketing” → three roles, named. |
| **Acceptance criteria** | How will anyone check it is right? With numbers. | “looks right” → “January 2026 cohort on the fixture: 6 new, 3 repeat, 50.0%”. |
| **Out of scope** | What will this version not do, and when could it? | (missing) → “live refresh, region, product, campaign: phase 2”. |

#### The template (`templates/intake.md`)

*templates/intake.md:*

```markdown
# Intake: <short name of the request>

<!-- Paste the ask first, then make every section precise. Check it with:
     python doclint.py intake intake-<name>.md -->

**Requester:** <role, team> · **Received:** <YYYY-MM-DD> · **Priority:** <P1, P2 or P3>

> <paste the original ask here, unedited>

## Question
<one question that ends with a question mark>

## Decision it supports
<who decides what, at which meeting or date, and what they do differently for each answer>

## Grain
<one row per ...; population and exclusions in one line>

## Deadline
<YYYY-MM-DD HH:MM and time zone; the event that sets it (meeting, launch, report)>

## Owner
<who builds it; who owns the definition; who signs it off>

## Acceptance criteria
- <a check someone else can run, with the expected number>
- <a second check: an edge case such as time zone, exclusions or empty periods>

## Out of scope
- <what this version will not do, and when it could come>

## Data sources
<tables or systems, refresh times, known gaps>

## Open questions
- <question> (answered by <role>, by <YYYY-MM-DD>)
```

#### A blank template fails only on placeholders

```python
import doclint
from pathlib import Path

blank = Path("../templates/intake.md").read_text(encoding="utf-8")
problems = doclint.lint("intake", blank)
print(len(problems), "problems; kinds:", sorted({p.split(":")[0] for p in problems}))
print(problems[0])
```

Output:

```text
20 problems; kinds: ['acceptance criteria', 'deadline', 'placeholder left', 'question']
placeholder left: <short name of the request>
```

`doclint.py` checks that every section exists and is filled, and flags placeholders such as `<role, team>`, vague words (“ASAP”, “real-time”, “recent”), a question without “?”, a grain without “one row per”, a deadline without a date, and acceptance criteria without a number.

**Intake vs spec card:** the intake is about the *request*; the metric spec card from *Metric design* (lesson 5 there) is about one *number* inside it. One intake may need zero, one or several spec cards; link them from the Grain section.

> **On the job:** Teams keep intakes as a ticket form (Jira, Azure Boards, GitHub issue forms) or as a Markdown file in `docs/requests/`. Whatever the tool, the fields are the same. A request without a decision and a deadline is the one that gets reprioritised forever.

> **The main idea:** seven fields (question, decision, grain, deadline, owner, acceptance criteria, out of scope) turn a message into a request you can estimate, test and finish.

*Read more:* [GitHub: Markdown syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), [ISO 8601 dates and times](https://www.iso.org/iso-8601-date-and-time-format.html), [Python re (regular expressions)](https://docs.python.org/3/library/re.html).

---

<a id="slide-5"></a>
## 5. Worked intake: from a chat message to an agreed request

*Part A · what does a good intake look like for the Marketing ask?*

The first draft most people write copies the ask into the template. The linter shows what is still undecided:

Terminal:

```text
$ python doclint.py intake examples/intake-before.md
FAIL examples/intake-before.md (intake)
  - missing section: grain
  - missing section: acceptance criteria
  - missing section: out of scope
  - vague: "ASAP" -> name a date and a time zone
  - question: write one question that ends with "?"
  - deadline: give a date as YYYY-MM-DD
[exit code 1]
```

The finished intake below answers every field. Three habits make it work: **quote the ask** unedited at the top (the linter ignores quoted text, so “ASAP” there is fine); **restate** each wish as a decision, a number or a date; and **move** every wish you will not do now to Out of scope, so it is visible rather than forgotten.

#### After: `examples/intake-repeat-customers.md`

*examples/intake-repeat-customers.md:*

```markdown
# Intake: 30-day repeat-customer rate for spring campaign planning

**Requester:** Marketing lead · **Received:** 2026-03-02 · **Priority:** P1

> Hey! Can you build me a dashboard on how our repeat customers are doing? Ideally real-time, by channel, region, product and campaign. Need it ASAP for the spring campaign planning, thanks!!

## Question
What share of new Leafy customers place a second completed order within 30 days of their first, by first-order month and acquisition channel?

## Decision it supports
At the spring planning meeting on 2026-03-12 the Marketing lead decides whether to fund the "second plant" email series. If the 30-day repeat rate of new web customers is below 40%, the series is funded; otherwise the money goes to paid search.

## Grain
One row per cohort month (America/Chicago) per acquisition channel. Population: customers whose first completed order falls in that month; staff accounts and guest checkouts excluded. Definition: `definition-repeat-customer.md`.

## Deadline
2026-03-11 17:00 America/Chicago: the table goes into the pre-read for the 2026-03-12 meeting.

## Owner
Builds it: data engineer. Owns the definition: analytics lead. Signs off: Marketing lead.

## Acceptance criteria
- On the fixture `data/leafy_orders.csv`, the January 2026 cohort has 6 new customers, 3 repeat: 50.0%.
- An order placed 2026-02-01 03:30 UTC belongs to the January cohort (months are cut in America/Chicago).
- A second order exactly 30 x 24 hours after the first does not count: the window is [first order, first order + 30 days).
- Staff accounts, guest checkouts and cancelled orders never count, as a first order or as a repeat.
- `python acceptance.py` prints PASS on every line.

## Out of scope
- Live refresh: the decision is made once, so the daily 06:00 Chicago refresh is enough.
- Region, product and campaign breakdowns: phase 2, after 2026-03-12, if the meeting asks for them.
- A dashboard: v1 is a table in the pre-read; a dashboard follows only if the metric is reused.

## Data sources
`orders` (order service, loaded daily at 05:00 Chicago) and `customers.is_staff`. Guest checkouts have no `customer_id`. Orders from the new web shop (live since 2026-02-01) arrive in a separate monthly export.

## Open questions
- Does a refund within 30 days cancel a repeat? (Marketing lead, by 2026-03-04)
```

#### Check it, then send it

Terminal:

```text
$ python doclint.py intake examples/intake-repeat-customers.md
PASS examples/intake-repeat-customers.md (intake)
```

**How to send it:** paste the intake into the thread with one question at the end: “Is this the decision you are making on 12 March? If yes, I start today and you get the table on 11 March.” A reply of “yes” is the sign-off.

**Where the wishes went:** “real-time” became *Out of scope: live refresh, daily is enough for a one-off decision*; “by region, product, campaign” became *phase 2*; “dashboard” became *a table in the pre-read*. Nothing was refused; everything was placed.

> **On the job:** In interviews, “a stakeholder asks for a dashboard ASAP” is graded on this move: ask for the decision, propose a smaller first version with a date, and confirm in writing. Saying the intake fields out loud is enough; you do not need the template.

> **The main idea:** an intake is finished when every wish is either in the question, in the acceptance criteria, or in Out of scope, and the requester has said yes to it.

*Read more:* [GitHub: Markdown syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), [Plain language guidelines](https://www.plainlanguage.gov/guidelines/).

---

<a id="slide-6"></a>
## 6. Acceptance criteria you can run

*Part A · how will anyone know the answer is right? (added)*

An **acceptance criterion** is a statement that must be true for the work to count as done, written so that someone other than the author can check it. Good ones name an input, an expected result with a number, and the edge case they protect. Coming from C#: they are the `[Fact]` tests of the request. **Given** the fixture, **when** I compute January, **then** I get 6 new, 3 repeat, 50.0% (the Given / When / Then wording comes from behaviour-driven development).

#### The criteria as a script (`acceptance.py`)

Terminal:

```text
$ python acceptance.py
PASS January 2026 cohort: 6 new customers, 3 repeat, 50.0%
PASS February 2026 cohort: 2 new customers, 1 repeat, 50.0%
PASS C07 (first order 2026-02-01 03:30 UTC) is in the January cohort
PASS C02 (second order exactly 30 x 24 h later) is not a repeat
PASS C04 (second order cancelled) is not a repeat
PASS staff C06 and guest orders are not customers
```

Each line is one sentence from the intake. The script runs the specified SQL over `data/leafy_orders.csv` in DuckDB and compares the result with the numbers the requester agreed to.

#### Why each criterion is there

```python
import duckdb, acceptance

def jan_rate(sql):
    con = duckdb.connect()
    con.execute("SET TimeZone = 'UTC'")
    con.execute("CREATE TABLE customers AS " + sql, ["data/leafy_orders.csv"])
    return con.execute(acceptance.RATE_SQL).fetchall()[0][1:]   # January cohort

base = acceptance.CUSTOMERS_SQL
readings = {
    "as specified (Chicago, [t, t+30d), no staff/cancelled)": base,
    "months cut in UTC":            base.replace("'America/Chicago'", "'UTC'"),
    "window end included (<=)":     base.replace("e.placed_local < f.first_at", "e.placed_local <= f.first_at"),
    "staff accounts included":      base.replace("AND NOT is_staff", ""),
    "cancelled orders counted":     base.replace("status = 'completed' AND ", ""),
}
for name, sql in readings.items():
    new, rep, pct = jan_rate(sql)
    print(f"{name:<55} {new} new, {rep} repeat, {pct}%")
```

Output:

```text
as specified (Chicago, [t, t+30d), no staff/cancelled)  6 new, 3 repeat, 50.0%
months cut in UTC                                       5 new, 2 repeat, 40.0%
window end included (<=)                                6 new, 4 repeat, 66.7%
staff accounts included                                 7 new, 4 repeat, 57.1%
cancelled orders counted                                7 new, 5 repeat, 71.4%
```

Every plausible “small” misreading gives a different January number. Without the criteria, all five would pass a quick look. With them, four fail, and each failure names the decision that was violated.

| Weak criterion | Why it fails | Strong criterion |
|---|---|---|
| “Numbers look right.” | Nobody can check it but the author. | “January 2026 on the fixture: 6 new, 3 repeat, 50.0%.” |
| “Handles time zones.” | Which zone, which boundary? | “An order at 2026-02-01 03:30 UTC is in the January cohort.” |
| “Within 30 days.” | Is day 30 in or out? | “A second order exactly 30 × 24 h later does not count: [t, t + 30 days).” |
| “Matches Marketing’s spreadsheet.” | Which cells, after which exclusions? | “Two named cohorts match the spreadsheet after removing staff accounts.” |

> **On the job:** In dbt projects the same criteria become unit tests on a small fixture (the dbt decks show `unit_tests`) or a singular test; in a ticket they are the checklist the reviewer ticks. Writing them in the intake means the requester agrees to the edge cases before you build, not after the number surprises them.

> **The main idea:** write at least one criterion with a number and one per edge case; if a criterion cannot fail, it is not a criterion.

*Read more:* [Gherkin: Given / When / Then](https://cucumber.io/docs/gherkin/reference/), [DuckDB: QUALIFY](https://duckdb.org/docs/stable/sql/query_syntax/qualify), [DuckDB: time zones](https://duckdb.org/docs/stable/sql/data_types/timezones).

---

<a id="slide-7"></a>
## 7. Scope a first version: must, later, and out of scope

*Part A · the ask is bigger than the time; what goes in v1?*

**Scope** is the list of things a piece of work will deliver. An **MVP** (minimum viable product) here means the smallest version that still supports the decision; for data work that is usually one number at one grain, correct and tested, not a dashboard with every breakdown. **Scope creep** is scope that grows after the start without the time growing with it.

Two tools keep scope honest. **Appetite** (from Basecamp’s *Shape Up*) is the time you are willing to spend, fixed up front; you flex the scope to fit it instead of stretching the time. **MoSCoW** sorts each ask into Must have, Should have, Could have and Won’t have (this time). The test for “must” is the decision: *without it, can the Marketing lead still decide on 12 March?*

#### Fit the asks to the appetite

```python
# (item, MoSCoW, estimate in working days); estimates by the data engineer
asks = [
    ("repeat rate by cohort month",          "must",   2.0),
    ("split by acquisition channel",         "must",   0.5),
    ("written definition + acceptance checks", "must", 1.0),
    ("tests and peer review",                "must",   1.0),
    ("dashboard",                            "should", 2.0),
    ("region split",                         "could",  1.0),
    ("product-category split",               "could",  1.5),
    ("campaign attribution",                 "won't",  4.0),
    ("live refresh",                         "won't",  3.0),
]
appetite = 6.0                 # working days from 2026-03-03 to 2026-03-10, after meetings
budget = appetite * 0.8        # keep 20% for surprises: plan to 80%

plan, later, out = [], [], []
for name, moscow, days in asks:            # list is already ordered must > should > could > won't
    used = sum(d for _, d in plan)
    if moscow == "won't":
        out.append(name)
    elif moscow == "must" or used + days <= budget:
        plan.append((name, days))
    else:
        later.append(name)

used = sum(d for _, d in plan)
assert all(m != "must" or n in dict(plan) for n, m, _ in asks)   # every must is in
print(f"v1 plan: {used} of {appetite} days (budget {budget:.1f}):")
for name, days in plan:
    print(f"  - {name} ({days} d)")
print("later (phase 2):", ", ".join(later))
print("out of scope:   ", ", ".join(out))
```

Output:

```text
v1 plan: 4.5 of 6.0 days (budget 4.8):
  - repeat rate by cohort month (2.0 d)
  - split by acquisition channel (0.5 d)
  - written definition + acceptance checks (1.0 d)
  - tests and peer review (1.0 d)
later (phase 2): dashboard, region split, product-category split
out of scope:    campaign attribution, live refresh
```

#### What the plan says, in words

- All four musts fit in 4.5 days and leave 1.5 days of buffer. Nothing else is planned, even though the region split (1 day) would still fit inside the 6 days: the buffer is for the surprises that always come (a late export, a definition question).
- The dashboard is a *should*: useful if the number is reused, not needed for one decision. It moves to phase 2.
- **Won’t (this time)** is not “never”: campaign attribution needs its own model, and live refresh adds nothing to a once-a-year decision.

> “For 12 March I will deliver the 30-day repeat rate by cohort month and channel, with a written definition and tests, by 11 March 17:00. Region and product splits and a dashboard can follow in phase 2 if the meeting needs them. Campaign attribution and live refresh are out of scope for this request.”

**Coming from C#:** the same instinct as cutting a release: ship the feature behind the decision, keep the backlog visible, never cut the tests to make the date.

| Pitfall | Better |
|---|---|
| Cutting correctness (tests, definition, review) to keep every breakdown. | Cut breadth (dimensions, polish), never correctness. A wrong number with six filters is worse than a right one with two. |
| Saying “we’ll see” about the extra asks. | Write them in Out of scope with a phase or a condition (“if the meeting asks”). |
| Planning to 100% of the appetite. | Plan to about 80%; the rest is for the unknowns you will meet. |
| Accepting a new ask mid-way silently. | Trade it: “Yes, if X moves to phase 2, or the date moves to Y.” |

> **On the job:** “Tell me about a time scope grew” is one of the most common behavioural questions for data roles. A strong answer shows the trade-off you offered (what moved out, or what date moved), that it was written down, and who decided.

> **The main idea:** fix the time, flex the scope, plan to about 80%, and write the leftovers down as “later” or “out of scope” so nothing is silently dropped.

*Read more:* [Shape Up: set boundaries (appetite)](https://basecamp.com/shapeup/1.2-chapter-03), [MoSCoW method](https://en.wikipedia.org/wiki/MoSCoW_method), [Project management triangle](https://en.wikipedia.org/wiki/Project_management_triangle).

---

<a id="slide-8"></a>
## 8. Trade-offs and timeline updates: manage expectations in writing

*Part A · what do you say when the ask or the date does not fit?*

A **trade-off** is giving up some of one thing to get more of another. In delivery the classic three are **scope**, **time** and **quality** (with people or cost as a fourth): fix two, and the third moves. Managing expectations means making that choice visible and letting the person who owns the decision make it, early, in writing.

#### When a new ask arrives mid-way

On Thursday the Marketing lead adds: “Can you also split it by campaign?”

> “Happy to. Campaign attribution needs a model we don’t have (about 4 days). Three options: **A** keep 11 March and add campaign in phase 2; **B** add a rough split by the first order’s discount code (half a day, labelled approximate); **C** full attribution, delivery moves to 17 March. I suggest A. Which do you prefer?”

- Say yes to the goal, then show the cost.
- Give two or three options, each with a date and a quality label.
- Recommend one; let the decision owner choose.

#### Status updates that warn early added

A **status update** is a short, regular message on progress, risks and asks. Start with one of three states: **On track**, **At risk** (may miss without action), **Off track** (will miss). When the state is not “On track”, the update must offer options or a new date.

Terminal:

```text
$ python doclint.py status examples/status-before.md
FAIL examples/status-before.md (status)
  - missing section: risks
  - missing section: asks
  - missing section: next update
  - status: start with On track, At risk or Off track
[exit code 1]
```

The “before” update hides the risk (“should be fine”). A **watermelon status** is green outside and red inside: it reports “on track” until the day before the deadline.

#### After: `examples/status-repeat-rate-2026-03-06.md`

*examples/status-repeat-rate-2026-03-06.md:*

```markdown
# Status: 30-day repeat-customer rate · 2026-03-06

## Status
At risk: February orders from the new web shop, needed to count January repeats, land on 2026-03-10, one day before the pre-read deadline.

## Done since last update
- Definition, design doc and ADR-0001 approved (2026-03-04).
- Models and acceptance checks pass on the fixture: January 2026 cohort 50.0%.

## Next
- 2026-03-09: full run for cohorts January 2025 to December 2025.
- 2026-03-10: load the web shop export, recompute January 2026 and send the table to the Marketing lead.

## Risks and blockers
- Web shop export late: if it slips past 2026-03-10 12:00 Chicago, January 2026 web repeats are undercounted.

## Asks
Marketing lead, by 2026-03-09: pick one option in case the export slips.
- Option A: keep the 2026-03-11 deadline; January 2026 web is marked "provisional, undercounted".
- Option B: new date 2026-03-12 08:00 with January 2026 complete, and no review time before the meeting.

## Next update
2026-03-09, or the same day if the export date changes.
```

#### Why this one works

Terminal:

```text
$ python doclint.py status examples/status-repeat-rate-2026-03-06.md
PASS examples/status-repeat-rate-2026-03-06.md (status)
```

- It is sent on 6 March, the day the risk is known, not on 11 March.
- The risk is specific: which data, which date, which number it affects.
- The ask has an owner and a deadline, and two options with their cost.
- It promises the next update on a date, so silence is never ambiguous.

> **On the job:** Data work slips for reasons outside your control: a late export, an API change, a definition debate. Stakeholders forgive a slip they heard about early with options; they remember a surprise. Many teams send a weekly status on a fixed day and an extra one whenever the state changes.

> **The main idea:** when scope or time does not fit, offer options with dates and labels, recommend one, and let the decision owner choose; when a date is at risk, say so the day you know.

*Read more:* [Project management triangle](https://en.wikipedia.org/wiki/Project_management_triangle), [Shape Up: the betting table](https://basecamp.com/shapeup/2.2-chapter-08), [STAR answer format](https://en.wikipedia.org/wiki/Situation,_task,_action,_result).

---

<a id="slide-9"></a>
## 9. In your portfolio: the Fuel Smart question through the intake

*Part A · what is decided by the brief, and what must you decide?*

The practice item for this lesson is to run the intake on your portfolio question and on two more requests (one from Leafy in the lab, one from your work, real or synthetic). The Fuel Smart brief already answers some fields; the rest are decisions you must write down.

| Field | Already in the Fuel Smart brief | You decide and write |
|---|---|---|
| Question | Simple = 10 ingredients or fewer, 45 minutes or less; protein and fibre per 100 kcal; vegetable-and-legume share; ratings. | One sentence with “?”, naming the 5,000-recipe sample and the review threshold for comparing ratings. |
| Decision | Not stated. | What the answer changes: which recipes the dashboard features, and how they are ranked. For a portfolio, also: what a hiring manager should be able to judge. |
| Grain | One recipe serving; exclude recipes with under 80% of ingredient weight matched. | “One row per recipe serving”; excluded recipes stay with a reason, or disappear? Say which. |
| Deadline | Not stated. | A date for v1 that you commit to (a portfolio without a date never ships). |
| Owner | You. | Who reviews it: one peer for the README and definitions. |
| Acceptance criteria | Reconciliation with Food.com nutrition; the calorie check. | Checks with numbers on the 50-recipe fixture, and the 10-minute README test. |
| Out of scope | Open Food Facts, orchestration, Spark, AI, personal data. | Copy them, plus “not nutrition advice”. |

#### A first draft, checked

```python
import doclint

draft = """# Intake: Fuel Smart v1

## Question
Which simple recipes give the most protein and fibre per 100 kcal and the most vegetables,
and do reviewers rate them as highly as other recipes?

## Grain
One row per recipe serving.
"""
for p in doclint.lint("intake", draft):
    print("-", p)
```

Output:

```text
- missing section: decision
- missing section: deadline
- missing section: owner
- missing section: acceptance criteria
- missing section: out of scope
```

#### What the output tells you

The two sections you wrote pass. Everything the brief leaves open shows up as missing: the decision, the deadline, the owner, acceptance criteria and out of scope. That list is your to-do list for the intake, not a failure.

A model answer is in `requirements-writing-lab/solutions/intake-fuel-smart-v1.md`. Write yours first (lab step 1), then compare.

> **On the job:** In a portfolio review or a take-home debrief, the first question is often “why this question, and how would you know you’re done?”. A one-page intake in `docs/` answers both before anyone asks, and shows the habit hiring managers look for.

> **The main idea:** the brief gives you the data and part of the question; the intake forces you to write the decision, the date and the checks that make it a project instead of an exploration.

*Read more:* [GitHub: Markdown syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), [ISO 8601 dates and times](https://www.iso.org/iso-8601-date-and-time-format.html).

---

<a id="slide-10"></a>
## 10. BEAM and the 7Ws: requirements as business events

*Part B · what do you ask to get facts, dimensions and grain from people?*

A **business event** is something that happens in the business at a point in time and is worth measuring, said as *subject + verb + object*: “a customer orders a product”, “a customer returns an order line”. Each one is a candidate fact table (the *business process* of the four-step design process in *Why dimensional modeling*).

**BEAM✲** (Business Event Analysis and Modeling) is a requirements method from Lawrence Corr and Jim Stagnitto’s book *Agile Data Warehouse Design*. You run short, example-driven workshops with the people who do the work (the book calls them **modelstorming**: modelling + brainstorming) and ask the **7Ws** about each event. The answers map almost one-to-one onto a star schema.

| W | Ask | Leafy: “customer orders product” | Becomes |
|---|---|---|---|
| **Who** | Who does it? Who else is involved? | Customer C05; staff for phone orders | Dimension (customer, employee) |
| **What** | What is it done to or with? | Fern mini, Ceramic pot | Dimension (product) |
| **When** | When does it happen? Which timestamps exist? | Placed 2026-01-22 11:00 Chicago; shipped two days later | Date (and time) dimensions; role-playing dates |
| **Where** | Where: place, channel, system? | Web or app; ships from Austin or Denver | Dimension (channel, warehouse) |
| **How many** | What do you count or add up? | 3 items, $54.00 line amount, $5.00 discount | Measures in the fact table |
| **Why** | Why does it happen: reason, campaign, trigger? | Spring email, discount code SPRING10 | Dimension (promotion, reason) |
| **How** | How: method, status, type? | Card payment; gift order | Dimension or flags (payment method, order type) |

#### Why examples, not abstractions

BEAM asks for **example rows** (the book calls them event stories): real or typical values for each W, plus at least one odd case. People who cannot answer “what attributes does an order have?” can easily answer “tell me about a weird order last week”. The odd cases (a partial return, a gift without an order number) are what decide the grain.

#### Coming from C#

If you know domain-driven design, a business event is close to a *domain event* (`OrderPlaced`), and a BEAM workshop is close to an event-storming session. The difference: BEAM keeps going until each event has its 7Ws and example rows, because the output is a fact table, not a service boundary.

> **On the job:** BEAM is how the four-step process (business process, grain, dimensions, facts) gets filled in from conversations instead of from source tables. Starting from source tables gives you the model the app needs; starting from events gives you the model the business asks questions of.

> **The main idea:** ask about business events in subject-verb-object form, then the 7Ws with example rows: who, what, when, where become dimensions, how many become measures, why and how become dimensions or flags.

*Read more:* [Modelstorming (Agile Data Warehouse Design, BEAM)](https://modelstorming.com/), [Modelstorming: BEAM templates](https://modelstorming.com/templates), [Kimball: four-step design process](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/four-4-step-design-process/).

---

<a id="slide-11"></a>
## 11. Run a 7Ws interview: the script

*Part B · how do you run 45 minutes with a stakeholder so you leave with an event table?*

A **structured requirements interview** follows a fixed script, so every event gets the same questions and nothing depends on your memory. Two people run it: a **facilitator** who asks, and a **scribe** who fills the event table where everyone can see it (a shared screen or a whiteboard).

1. **Open** (5 min): Ask which decisions they make each week and which lack data. This is the “why” of the whole session.
2. **Find the events** (10 min): “Walk me through a normal day.” Write each answer as subject + verb + object. Verbs are events; nouns are dimensions; numbers are measures.
3. **7Ws per event** (20–30 min): One event at a time, in their words. Ask “how many” last: people answer it better once the context is set.
4. **Example rows** (5 min): Three to five typical rows and at least one odd case: cancelled, partial, late, duplicate, missing value.
5. **Grain and play back** (5 min): Say the grain (“one row per …”) and read the table back. “What did we miss? Who else should we ask?”

#### Good and bad questions

| Instead of… | Ask… | Why |
|---|---|---|
| “Do you need a customer dimension?” | “Who places the order? Anyone else involved?” | Business words, not model words. |
| “You want daily data, right?” | “How often do you look at this, and what do you do then?” | Not leading; finds the decision. |
| “What fields do you need?” | “Tell me about an unusual order from last week.” | Stories reveal the grain and the edge cases. |
| “Is the data clean?” | “When was a number on this wrong, and why?” | Finds the known traps. |

#### The template (`templates/beam-interview.md`)

*templates/beam-interview.md:*

```markdown
# BEAM requirements interview: <business area>

<!-- 45-60 minutes with one or two people who do the work. Fill the event table live,
     with real example rows. Convert each event into a bus-matrix row afterwards. -->

**People:** <roles> · **Date:** <YYYY-MM-DD> · **Facilitator:** <role> · **Scribe:** <role>

## 1. Open (5 min)
- What decisions do you make each week? Which ones lack data today?

## 2. Find the events (10 min)
- "Walk me through a normal day. What happens, and who does it?"
- Write each answer as subject + verb + object: <customer orders product>.

## 3. The 7Ws for each event (20-30 min)
| W | Question | Answer (with an example value) |
|---|---|---|
| Who | Who does it? Who else is involved? | |
| What | What is it done to or with? | |
| When | When does it happen? Which timestamps exist? | |
| Where | Where does it happen (place, channel, system)? | |
| How many | What do you count or add up? | |
| Why | Why does it happen (reason, campaign, trigger)? | |
| How | How does it happen (method, status, type)? | |

## 4. Example rows (5 min)
…
```

| Pitfall | Better |
|---|---|
| Interviewing only the manager who asked. | Add one person who does the work (warehouse lead, support agent); they know the odd cases. |
| Designing tables during the session. | Capture events and Ws in their words; design afterwards and play the result back. |
| Skipping the odd case because time ran out. | Ask for it first if time is short: it decides the grain. |
| No written output. | Send the event table within 24 hours with “what did I get wrong?”. |

> **On the job:** The practice item is to run one BEAM-style interview at work. Book 45 minutes with one stakeholder and one hands-on person, share the template beforehand, and send back the event table and a bus-matrix row the next day. That written playback is what makes it a requirements interview rather than a chat.

> **The main idea:** a fixed script (open, events, 7Ws, example rows, grain and playback) with a facilitator and a scribe turns a conversation into an event table you can model from.

*Read more:* [Modelstorming: BEAM templates](https://modelstorming.com/templates), [Kimball: business processes](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/business-process/).

---

<a id="slide-12"></a>
## 12. From interview notes to an event table and a grain statement

*Part B · how do notes become something a model can be built from?*

Leafy’s warehouse lead was interviewed about returns. Five lines from the scribe’s notes, and what each one decided:

| Note (their words) | W | Decision |
|---|---|---|
| “Customers send back plants that arrive damaged, or the wrong size.” | Who, What, Why | Event: *customer returns order line*. Return reason is a dimension. |
| “We refund the line amount for the items that come back, not the shipping.” | How many | Measures: returned quantity, refund amount. |
| “Sometimes they return 2 of the 3 ferns on one line, and the third a week later.” | Grain (odd case) | One order line can be returned more than once: the grain is **one row per order line per return**, not one row per order line. |
| “Gifts come back without an order number.” | Who (odd case) | Customer can be unknown: use an unknown-member row, never drop the return. |
| “Everything comes to the Denver returns desk, drop-off only.” | Where, How | Only one value today: no dimension yet; noted as an open question if pickup starts. |

#### The event table, with example rows

| Who | What | When | Why | How many |
|---|---|---|---|---|
| C01 | Ceramic pot | 2026-02-03 | damaged in transit | 1 item, $12.00 |
| C05 | Fern mini | 2026-02-10 | wrong size | 2 items, $18.00 |
| C05 | Fern mini | 2026-02-17 | wrong size | 1 item, $9.00 (same line, second return) |
| unknown (gift) | Monstera 30 cm | 2026-02-12 | arrived damaged | 1 item, $40.00 |

#### The same event, as rows the bus-matrix script reads

```python
import csv

with open("data/beam_events.csv", newline="", encoding="utf-8") as f:
    rows = [r for r in csv.DictReader(f) if r["process"] == "Returns"]

print("grain:", rows[0]["grain"], "| fact table:", rows[0]["fact_table"])
for r in rows:
    print(f'  {r["w"]:<9} -> {r["item"]}')
```

Output:

```text
grain: one row per order line per return | fact table: fct_return_line
  who       -> Customer
  what      -> Product
  when      -> Date
  why       -> Return reason
  how many  -> refund_amount
  how many  -> quantity
```

Long form (one row per process and W) is easy to write in a spreadsheet during the session and easy to check with a script. The next lesson turns it into a matrix.

**Grain statement:** “*fct_return_line* has one row per order line per return; measures are returned quantity and refund amount.” The rules for grain statements (declare it before the dimensions; one grain per fact table) are in *Why dimensional modeling*, slides 14–16.

> **On the job:** Notice that the grain came from an odd case the warehouse lead mentioned in passing. That is the normal pattern: the happy path never tells you the grain; the second return, the late record or the missing key does. Ask for odd cases every time.

> **The main idea:** write notes in the stakeholder’s words, mark each with its W, and let the odd cases decide the grain; not every W becomes a dimension.

*Read more:* [Kimball: declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/), [Modelstorming: BEAM templates](https://modelstorming.com/templates).

---

<a id="slide-13"></a>
## 13. From event table to bus-matrix rows

*Part B · how do several interviews become one plan?*

Each interviewed event becomes one row of the **bus matrix** (processes as rows, shared dimensions as columns, from *Model a business end to end*, slide 3). `bus_matrix.py` reads the long-form event table, builds the matrix with DuckDB, lists the dimensions to conform first, prints every grain statement, and checks the rows:

Terminal (Leafy: orders, returns, and the three Plant Doctor events from lesson 14):

```text
$ python bus_matrix.py data/beam_events.csv
Bus matrix: 5 processes x 10 dimensions (most shared first)

                            Customer
                            | Date
                            | | Agent version
                            | | | Channel
                            | | | | Product
                            | | | | | Intent
                            | | | | | | Payment method
                            | | | | | | | Promotion
                            | | | | | | | | Return reason
                            | | | | | | | | | Tool
                            | | | | | | | | | | 
Orders                      x x . x x . x x . . 
Returns                     x x . . x . . . x . 
Plant Doctor conversations  x x x x x x . . . . 
Plant Doctor tool calls     x x x . . . . . . x 
Plant Doctor feedback       x x x x . . . . . . 

Conform first (used by 2+ processes): Customer (5), Date (5), Agent version (3), Channel (3), Product (3)

Grain statements:
  fct_order_line: one row per order line; measures: line_amount, quantity
  fct_return_line: one row per order line per return; measures: quantity, refund_amount
  fct_agent_conversation: one row per conversation; measures: handoff_flag, resolved_flag, turn_count
  fct_agent_tool_call: one row per tool call; measures: error_flag, latency_ms
  fct_agent_feedback: one row per rating; measures: rating

Checks: OK
```

#### How to read it

- Each row is a future fact table with its grain; read across to see its star.
- **Conform first**: Customer and Date appear in all five processes, Channel, Product and Agent version in three. These must mean the same thing everywhere, so they are agreed and built first.
- Dimensions used once (Tool, Intent, Return reason) can be designed with that process alone.
- The checks fail if a grain does not start with “one row per”, an event has no “when”, a W is misspelled, or one process has two grains.

#### What the checks protect

Two grains in one row is the most common bus-matrix bug: “Returns” filed once as *one row per return* and once as *one row per order line* means two fact tables were mixed. The script fails instead of drawing a misleading matrix; the bug clinic shows it.

**Fuel Smart:** the lab asks you to run the same script on your own event table. The model answer has three processes (recipe ingredient lines, food nutrients, reviews) that share Recipe, Food and Date.

> **On the job:** The matrix is the artefact you bring back to the stakeholders after a round of interviews: “these are the five things that happen, these are the shared words we must agree on, this is the order we will build in.” It turns many interviews into one plan and makes conformance a visible decision.

> **The main idea:** one interviewed event = one bus-matrix row with a grain; the columns used by many rows are the definitions to agree first.

*Read more:* [Kimball: the bus matrix](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/enterprise-data-warehouse-bus-matrix/), [Kimball: the matrix revisited](https://www.kimballgroup.com/2005/12/the-matrix-revisited/), [DuckDB: reading CSV files](https://duckdb.org/docs/stable/data/csv/overview).

---

<a id="slide-14"></a>
## 14. Rehearse it: an agent-telemetry interview and a metric push-back

*Part B · “Is the Plant Doctor working?”*

Leafy’s product manager asks for “a success metric” for the Plant Doctor, the AI assistant that answers plant-care questions in the app and can call tools (look up an order, open a return, fetch a care guide). This is the same shape as the practice item at work (agent telemetry), on synthetic data.

| W | Answers from the interview (product manager + support lead) |
|---|---|
| Who | Customer (or anonymous visitor); a support agent after a hand-off. |
| What | The plant or order the question is about; the tool called. |
| When | Conversation start and end; each turn; each tool call; hand-off time. |
| Where | App or web; country. |
| How many | Turns, latency in ms, tokens and cost per conversation, rating (1–5) when given. |
| Why | Intent: care question, order problem, return. |
| How | **Agent version** (model + prompt + tool set; every release changes it); resolved, handed off, abandoned. |

Events found: *customer starts a conversation*, *agent calls a tool*, *customer rates an answer* (and, later, *support takes over*). They are the three Plant Doctor rows in the bus matrix of lesson 13; they share Customer, Date, Channel and Product with Orders and Returns, so “did Plant Doctor users return fewer plants?” is answerable later.

#### The proposed metric, tested on two weeks

```python
import duckdb, random

random.seed(7)
rows = []   # (week, agent_version, customer_id, resolved, handed_off), synthetic
for week, version, n, p_resolved, p_handoff in [(1, "1.3", 400, 0.75, 0.10),
                                                (2, "1.4", 520, 0.55, 0.25)]:
    for _ in range(n):
        r = random.random()
        rows.append((week, version, f"C{random.randint(1, 300):03d}",
                     r < p_resolved, p_resolved <= r < p_resolved + p_handoff))

con = duckdb.connect()
con.execute("CREATE TABLE conv (week INT, agent_version VARCHAR, customer_id VARCHAR,"
            " resolved BOOLEAN, handed_off BOOLEAN)")
con.executemany("INSERT INTO conv VALUES (?, ?, ?, ?, ?)", rows)
print("week version conversations per_customer resolved_pct handoff_pct")
for r in con.execute("""
    SELECT week, agent_version, count(*),
           round(count(*) / count(DISTINCT customer_id), 2),
           round(100 * avg(resolved::INT), 1), round(100 * avg(handed_off::INT), 1)
    FROM conv GROUP BY ALL ORDER BY week""").fetchall():
    print(*r, sep="   ")
```

Output:

```text
week version conversations per_customer resolved_pct handoff_pct
1   1.3   400   1.83   76.5   9.0
2   1.4   520   2.13   54.2   28.3
```

#### Push back with an alternative

The PM proposes “conversations per week”. In week 2 (agent 1.4) conversations rose by 30% while the share resolved fell from 76.5% to 54.2% and the hand-off rate roughly tripled: customers asked again because answers failed.

> “Conversation count goes up when the Plant Doctor gets worse, so it can’t be the success metric. I suggest: **primary**, share of conversations resolved without a hand-off; **guardrails**, hand-off rate and conversations per customer; conversation count as context only. Each is reported by agent version, so a bad release shows up in a week. OK to write the spec on that basis?”

The push-back technique (show concrete readings with numbers, propose, confirm) is from *Metric design*, slides 4–8 and its guardrail lesson; here it lands in the intake’s Decision and Acceptance criteria.

#### At work: your checklist

- Interview the agent’s owner *and* someone who reads failed conversations (support, QA).
- Ask for three real traces, one with a failed tool call and one with a hand-off.
- Make **agent version** a dimension from day one: model, prompt and tool set change independently.
- Measures: turns, latency, tokens, cost; flags: resolved, handed off, abandoned.

#### Privacy and scope

- Prompt and answer text can contain personal data: keep IDs and labels in facts, text in a restricted store with a retention period.
- Write in the intake who may see conversation text, and for how long.
- Out of scope for v1: judging answer quality with another model; that needs its own evaluation set.

> **On the job:** Teams shipping AI features need exactly this: the event model (conversation, turn, tool call, feedback, hand-off), one versioned dimension for the agent, and a success metric that cannot go up when the product gets worse. Bringing the 7Ws table and a counter-proposal to the first meeting is what makes the data engineer part of the product conversation.

> **The main idea:** run the same 7Ws on agent telemetry, make agent version a dimension, and push back on volume metrics with a resolution-based alternative and guardrails.

*Read more:* [Modelstorming: BEAM templates](https://modelstorming.com/templates), [Kimball: business processes](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/business-process/), [Kimball: the bus matrix](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/enterprise-data-warehouse-bus-matrix/).

---

<a id="slide-15"></a>
## 15. Semantic precision: definitions two people count the same way

*Part C · when is a written definition precise enough?*

**Semantic precision** means every term that counts, filters or times something has exactly one meaning, written down, so two readers would select the same rows. The test is practical: pick one example row and ask a colleague whether it counts. If you disagree, the definition is not finished.

| Vague | Precise | What was missing |
|---|---|---|
| users | customers with a `customer_id`, excluding staff accounts and guest checkouts | population, exclusions |
| last week | calendar week Monday–Sunday in America/Chicago (or: the 7 × 24 hours before the load) | calendar or rolling, time zone |
| within 30 days | in the half-open window [first order, first order + 30 × 24 h) | is the end included? |
| revenue | items amount after discounts, before tax and shipping, in USD, at order time | unit, currency, inclusions |
| daily | refreshed by 06:00 America/Chicago with data up to the end of the previous day | refresh time, data cut-off |
| real-time | at most 15 minutes old for 99% of the day | a number for the delay |
| should be unique | `order_id` MUST be unique (dbt test `unique`) | obligation level, the check |

#### Rules that do most of the work

- One term, one meaning; never alternate synonyms (“client” and “customer”) for variety.
- Every count says its **unit** and **population**; every time says its **clock, window and time zone**.
- Use **half-open intervals** added [start, end): the start is included, the end is not, so consecutive windows never overlap or leave a gap.
- Write dates as ISO 8601 (`2026-03-11 17:00`) with a time zone.
- Requirement keywords added (RFC 2119): **MUST**, **SHOULD**, **MAY** carry their special meaning only in capitals (RFC 8174).
- Give an example *and* a non-example: the non-example is where readers disagree.

#### A linter catches the words, not the meaning

```python
import doclint

before = "Active customers are users who ordered recently, excluding test accounts etc."
after = ("A 28-day ordering customer is a customer_id with at least one completed order "
         "in the 28 complete days before the report date (America/Chicago), "
         "excluding staff accounts and guest checkouts.")
for name, text in [("before", before), ("after", after)]:
    print(name, [term for term, advice in doclint.vague_terms(text)])
print(doclint.vague_terms(before)[0][1])
```

Output:

```text
before ['recently', 'Active', 'etc']
after []
give the window, e.g. "the last 28 complete days"
```

A word list only finds the obvious holes (here “recently”, “Active”, “etc”). The precise version passes because it names the action, the window, the clock and the exclusions. Whether the definition is *right* is still a conversation with the owner.

#### A finished definition card

*examples/definition-repeat-customer.md:*

```markdown
# Definition: 30-day repeat customer

## Definition
A 30-day repeat customer is a new customer who places at least one more completed order in the 30 days that start at their first completed order.

## Includes
- Customers with a `customer_id` whose first completed order is in the cohort month.
- Second orders on any channel, of any amount.

## Excludes
- Staff accounts (`customers.is_staff = true`): they test the shop.
- Guest checkouts (no `customer_id`): their orders cannot be linked.
- Cancelled orders, as a first order and as a repeat order.

## Unit
A customer (`customer_id`), counted once per cohort.

## Time
Cohort month: calendar month of the first completed order in America/Chicago (ADR-0001). Repeat window: the half-open interval [first order time, first order time + 30 x 24 hours). Cohorts younger than 30 days are not reported.

## Source
`orders` from the order service (system of record); `customers` for `is_staff`.

## Owner
Analytics lead.

## Examples
- Example: first order 2026-01-22 11:00, second order 2026-01-27 11:00 (Chicago): a repeat.
- Non-example: second order exactly 30 x 24 hours after the first: not a repeat, because the end of the window is excluded.
- Non-example: second order cancelled: not a repeat.
```

#### Check it

Terminal:

```text
$ python doclint.py definition examples/definition-repeat-customer.md
PASS examples/definition-repeat-customer.md (definition)
```

`templates/definition.md` is for any business term (customer, order, active, session). For a *metric*, use the spec card from *Metric design* (lesson 5 there) instead; `templates/metric-spec.md` is its Markdown version, and `doclint.py spec` checks it.

**Coming from C#:** a precise definition is a strong type. `int days` is a vague word; `TimeSpan` with a documented inclusive start and exclusive end is a definition.

> **On the job:** Definitions live in dbt `description` fields, a glossary page, or a semantic layer. When two dashboards disagree, the fix is almost always a definition that was never written or is used with two meanings. Writing the non-example is the cheapest way to find that before a meeting does.

> **The main idea:** a definition is precise when two people pick the same rows: name the unit, population, clock, window ends and exclusions, and add a non-example.

*Read more:* [RFC 2119: MUST, SHOULD, MAY](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174: keywords only in capitals](https://www.rfc-editor.org/rfc/rfc8174), [ISO 8601 dates and times](https://www.iso.org/iso-8601-date-and-time-format.html), [dbt: description property](https://docs.getdbt.com/reference/resource-properties/description).

---

<a id="slide-16"></a>
## 16. The one-page design doc

*Part C · how do you get a design reviewed before the code exists?*

A **design doc** describes a planned piece of work and the reasoning behind it, written before the build so reviewers can disagree while changes are cheap. A **one-page** design doc (about 400 to 700 words) is enough for most data work: a new mart, a pipeline change, a metric. Longer docs exist for platforms; the sections are the same.

| Section | Answers | Common mistake |
|---|---|---|
| Context | What problem, for whom; link to the intake. | A history lesson instead of the problem. |
| Goals | Measurable outcomes of this work. | Goals that are activities (“build a model”). |
| **Non-goals** | Reasonable things this design will not do. | Missing: then every reviewer adds their wish. |
| Proposal | Sources, models and their grain, outputs, refresh. | Pasting SQL instead of the shape. |
| **Alternatives considered** | At least two, including the simplest or “do nothing”, and why not. | A straw man nobody would pick. |
| Risks and mitigations | What could go wrong and what you will do. | Risks with no action. |
| Test and rollout plan | Tests, acceptance checks, who validates, how it ships. | “Will test it.” |
| Open questions | What you do not know yet, with an owner and a date. | Hiding them to look finished. |

#### Worked example (`examples/design-repeat-customers.md`)

*examples/design-repeat-customers.md:*

```markdown
# Design: 30-day repeat-customer rate (v1)

**Author:** Data engineer · **Reviewers:** Analytics lead, Marketing lead · **Status:** Approved · **Updated:** 2026-03-04

## Context
Marketing decides on 2026-03-12 whether to fund a "second plant" email series (`intake-repeat-customers.md`). No table answers "do new customers come back?" today. Two ad-hoc queries in the team disagree: one cuts months at midnight UTC, the other counts cancelled orders.

## Goals
- One table: 30-day repeat rate by cohort month and acquisition channel, January 2025 to the newest mature cohort, in the pre-read by 2026-03-11 17:00 Chicago.
- One written definition (`definition-repeat-customer.md`) that replaces both ad-hoc queries.
- Acceptance checks that anyone can run on the fixture in under a minute.

## Non-goals
- Live refresh; region, product and campaign breakdowns (phase 2).
- Attributing repeats to campaigns.
- A dashboard.

## Proposal
Two dbt models over the existing `stg_orders` and `stg_customers`:
- `int_customer_first_order`: one row per customer, with the first completed order time in Chicago, the cohort month and the acquisition channel (the channel of that order).
- `mart_repeat_rate_monthly`: one row per cohort month per channel, with `new_customers`, `repeat_customers` and `repeat_rate`. The mart stores both counts so the rate can be re-aggregated across channels as a ratio of sums.

Cohorts younger than 30 days are filtered out in the mart. The models refresh in the daily dbt run at 06:00 Chicago.

## Alternatives considered
- Do nothing and reuse an ad-hoc query: rejected; one counts cancelled orders and the other uses UTC months.
- Compute it in the BI tool: rejected; the logic would be hidden from tests and from other teams.
- A full customer-lifetime model: rejected for v1; too large for the deadline and not needed for this decision.

## Risks and mitigations
- New web shop orders arrive in a monthly export: the fixture lets us validate the logic first; the status update flags any delay.
- Refund policy (open question, answered 2026-03-04: ignore refunds in v1): the definition says so explicitly.

## Test and rollout plan
- dbt tests: `unique` and `not_null` on (cohort_month, channel); `repeat_customers <= new_customers`.
- `python acceptance.py` on the fixture: every check PASS.
- The analytics lead reviews the PR; the Marketing lead compares two cohorts with her spreadsheet.
- Ship to the `marts` schema; the ad-hoc queries get a deprecation note that links here.

## Open questions
- Should phase 2 split by first-order product category? (Marketing lead, after 2026-03-12)
```

#### Check it

Terminal:

```text
$ python doclint.py design examples/design-repeat-customers.md
PASS examples/design-repeat-customers.md (design)
```

The linter checks every section, at least two alternatives, at least one non-goal and the 700-word limit (code and quotes excluded). It cannot check that the alternatives are honest; a reviewer can.

**Intake, design doc or ADR?** The intake records the *request* and is agreed with the requester. The design doc records the *plan* and is reviewed by engineers. An ADR records *one decision* for future readers. Small work may need only the first; the Leafy example used all three.

> **On the job:** A design doc is the cheapest code review you will ever get: a reviewer who says “why not reuse the orders mart?” on the doc saves you a rewrite. Teams usually link it from the PR and keep it in `docs/`. In senior interviews, “walk me through a design you wrote, and an alternative you rejected” is a standard question.

> **The main idea:** one page, eight sections, written before the build; non-goals and honest alternatives are what make it useful to reviewers.

*Read more:* [Design docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/), [Google Technical Writing One](https://developers.google.com/tech-writing/one), [dbt: how we structure projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview).

---

<a id="slide-17"></a>
## 17. Decision records (ADRs)

*Part C · how do you record why a choice was made?*

An **architecture decision record** (**ADR**, also called a decision record) is a short, numbered document that records one significant decision: its context, the decision, and its consequences. The format comes from Michael Nygard (2011). ADRs are stored in the repository (`docs/adr/0001-….md`) and are **immutable** once accepted: to change a decision you write a new ADR that *supersedes* the old one.

1. **Proposed** (in a PR): Written when the decision is being made, reviewed like code.
2. **Accepted** (merged): The decision stands; the record is never edited again (typos aside).
3. **Superseded or Deprecated** (later): “Superseded by ADR-0007” links forward; the old record stays, so history explains itself.

#### Worked example

*examples/adr-0001-chicago-business-days.md:*

```markdown
# ADR-0001: Use America/Chicago calendar days for every business date

## Status
Accepted · 2026-03-04

## Context
Leafy stores every timestamp in UTC. Two ad-hoc repeat-customer queries disagreed because one cut months at midnight UTC and the other at midnight in Chicago, where the company works. Orders placed on the evening of the last day of a month (Chicago time) fell into the next month in UTC. Finance closes the books in Chicago time.

## Decision
We will derive every business date, week and month from UTC timestamps converted to America/Chicago, with the shared macro `local_ts()`. Stored columns stay in UTC; derived date columns end in `_local_date`.

## Consequences
- Easier: numbers match Finance and the Marketing spreadsheet; one macro to review; the rule is written down once.
- Harder: every model must call the macro; days around daylight-saving changes have 23 or 25 hours; people in other time zones see days that differ from their own clock.
```

Terminal:

```text
$ python doclint.py adr examples/adr-0001-chicago-business-days.md
PASS examples/adr-0001-chicago-business-days.md (adr)
```

#### What a first draft usually misses

```python
import doclint
from pathlib import Path

adr = Path("examples/adr-0001-chicago-business-days.md").read_text(encoding="utf-8")
broken = adr.replace("Accepted", "Done").split("- Harder:")[0]   # a typical first draft
for p in doclint.lint("adr", broken):
    print("-", p)
```

Output:

```text
- status: Proposed, Accepted, Rejected, Deprecated or Superseded by ADR-NNNN
- consequences: say what becomes harder ("Harder: ...")
```

Nygard’s consequences section asks what becomes *easier* and what becomes *more difficult*. Drafts list only the benefits; the “Harder” line is what a future reader needs most, because it explains the workarounds they will find.

**Coming from C#:** superseding an ADR is like `[Obsolete("Use X instead")]`: the old thing stays visible and points to its replacement.

| Write an ADR when… | Skip it when… |
|---|---|
| The choice is hard or costly to reverse (time-zone rule, grain of a core fact, tool or warehouse). | It is easy to undo in one PR. |
| Other teams depend on it, or will question it later. | Only you are affected. |
| Reasonable people disagreed during review. | Nobody would choose otherwise. |
| You chose the less obvious option (simpler over scalable, or the reverse). | The choice is a team convention already written elsewhere. |

> **On the job:** Six months later someone asks “why are our weeks in Chicago time?” or “why didn’t we use streaming?”. With ADRs the answer is a link; without them it is an archaeology project, or the same debate again. “Describe a decision you made and what it cost” is a senior interview staple, and an ADR is that answer written down.

> **The main idea:** one decision per numbered, immutable record: context, decision, and what became easier and harder; supersede instead of editing.

*Read more:* [Nygard: Documenting architecture decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions), [adr.github.io: architectural decision records](https://adr.github.io/), [ADR templates](https://adr.github.io/adr-templates/), [Azure Well-Architected: decision records](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record).

---

<a id="slide-18"></a>
## 18. PR descriptions a reviewer can trust

*Part C · what does a reviewer need before reading the diff?*

A **PR description** (pull request description) tells a reviewer what changed, why, how it was checked, and what it affects, before they read a line of the diff. The code is the *how*; the description is the *what* and *why*, and it stays in the history as the explanation of the change.

Terminal:

```text
$ python doclint.py pr examples/pr-before.md
FAIL examples/pr-before.md (pr)
  - missing section: impact
  - missing section: rollback
  - title: too generic; say what changed and why
  - validation: show a command, a test name or a number
  - checklist: 1 unticked item(s)
[exit code 1]
```

#### After (`examples/pr-repeat-rate-mart.md`)

*examples/pr-repeat-rate-mart.md:*

```markdown
# Add 30-day repeat-customer rate mart for spring campaign planning

## What and why
Adds `int_customer_first_order` and `mart_repeat_rate_monthly` (one row per cohort month per channel) so Marketing can decide on the "second plant" email series on 2026-03-12. Implements `definition-repeat-customer.md` and `design-repeat-customers.md`; follows ADR-0001 (Chicago business days).

## How it was validated
- `python acceptance.py`: 6 of 6 checks PASS on the fixture (January 2026 cohort: 6 new, 3 repeat, 50.0%).
- New dbt tests: `unique` and `not_null` on (cohort_month, channel); `repeat_customers <= new_customers`.
- `python doclint.py auto examples`: the definition, design doc and ADR pass.

## Impact on existing models and consumers
New models only; no existing column or grain changes. The two ad-hoc queries in the shared folder get a deprecation note that points here. Their January 2026 numbers will not match this mart, by design: months are now cut in Chicago time and cancelled orders are excluded.

## Rollback
Revert this PR. Nothing reads the new models yet.

## Checklist
- [x] Tests added or updated, and passing
- [x] Descriptions and docs updated
- [x] Downstream owners told (Marketing lead, analytics lead)
```

Terminal:

```text
$ python doclint.py pr examples/pr-repeat-rate-mart.md
PASS examples/pr-repeat-rate-mart.md (pr)
```

#### What each section is for

| Section | The reviewer’s question |
|---|---|
| Title (≤ 72 characters) | Can I tell from the list of PRs what this does? Verb + what + why. |
| What and why | Why does this change exist? Link the intake, design doc, ADR. |
| How it was validated | What did you run, and what did you compare? Commands and numbers. |
| Impact | Which columns, grains or numbers change, and who must know? “None” is an answer. |
| Rollback | If this breaks something tonight, what do I do? |
| Checklist | Did you do the routine things? Unticked boxes mean “not yet”. |

dbt Labs’ public template has the same core (description and motivation, validation, changes to existing models, checklist). Put yours in `.github/pull_request_template.md` (GitHub) or `.azuredevops/pull_request_template.md` (Azure Repos) so every PR starts from it.

| Pitfall | Better |
|---|---|
| “Update models” / “fix”. | “Add 30-day repeat-customer rate mart for spring campaign planning.” |
| “Ran it, looks good.” | The command, the test names, and one number compared before and after. |
| “No impact” on a PR that changes a grain or a definition. | Name the changed numbers and the people told; link the ADR. |
| A description that repeats the diff line by line. | Explain intent and risk; the diff already shows the lines. |

> **On the job:** In analytics teams, a PR that changes a metric is a business change. The description is what a reviewer approves, and what someone reads a year later when the number looks odd. Take-home tasks are often submitted as a PR or a repository, and graded partly on exactly these sections.

> **The main idea:** title with a verb and a reason; then why, how you validated it with commands and numbers, the impact on consumers, and how to roll back.

*Read more:* [Google: writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html), [dbt Labs: the PR template we use](https://docs.getdbt.com/blog/analytics-pull-request-template), [GitHub: pull request templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository), [Azure Repos: pull request templates](https://learn.microsoft.com/en-us/azure/devops/repos/git/pull-request-templates).

---

<a id="slide-19"></a>
## 19. READMEs that onboard someone in 10 minutes

*Part C · can a newcomer get the first result without asking you?*

A **README** is the first file a newcomer opens in a repository. For a data project its job is narrow: in 10 minutes, a person who has never seen the project knows what it is for, has run it, and knows where to look next. In Diátaxis terms it is a short tutorial and how-to guide with links to the reference and explanation documents (spec cards, design doc, ADRs).

**The 10-minute test** added:

1. **Find a tester** (1 min): Someone who has not seen the project; a fresh clone or a clean machine.
2. **Start a timer** (10 min): They follow the README only. You watch and do not help.
3. **Note every stop** (during): Each question, missing step or error is a README bug, not a user error.
4. **Fix and repeat** (after): Fix the README (or script the steps) until a run fits in 10 minutes.

#### Before: what most first READMEs look like

Terminal:

```text
$ python doclint.py readme examples/readme-before.md
FAIL examples/readme-before.md (readme)
  - missing section: quickstart
  - missing section: expected output
  - missing section: project layout
  - missing section: tests
  - missing section: data sources
  - missing section: decisions
  - missing section: troubleshooting
  - vague: "various" -> name them or give a number
[exit code 1]
```

“Ask someone” and “run the scripts in order” are where the 10-minute test stops. A quickstart of more than five commands usually means a missing script (`make`, a `uv run` task, or one Python entry point).

#### After: this lab’s own README

Terminal:

```text
$ python doclint.py readme README.md
PASS README.md (readme)
```

| Section | Why it is there |
|---|---|
| One-sentence purpose | The reader decides in 5 seconds whether this is the right repository. |
| Quickstart (≤ 5 commands) | Copy-paste from clone to first result. |
| Expected output | The reader knows it worked; a mismatch is the first troubleshooting clue. |
| Layout, tests, data, decisions | Where to look next, and the licence of what they are using. |
| Troubleshooting | The two or three errors every newcomer hits. |

*README.md:*

````markdown
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
````

> **On the job:** A take-home reviewer or a hiring manager opening your portfolio is the 10-minute test in real life: if the quickstart fails, they rarely read the models. On a team, a README that works cuts onboarding from days to hours and stops the same questions in chat.

> **The main idea:** write for a stranger with a timer: purpose, at most five commands, the expected output, and where to look next; then let someone else run it.

*Read more:* [GitHub: about READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), [Make a README](https://www.makeareadme.com/), [Diátaxis documentation framework](https://diataxis.fr/).

---

<a id="slide-20"></a>
## 20. Get one peer review on every document that matters

*Part C · how do you ask for, and give, a useful review of a document?*

A **peer review** of a document is a colleague reading it with a checklist and leaving labelled comments before it is approved. The practice item for this lesson is to get one on your metric spec, design doc or README. Ask well, and it takes the reviewer 15 minutes.

#### How to ask

- Run `doclint.py` first, so the reviewer spends time on ideas, not missing sections.
- Put the one question you most want answered at the top (“Is the grain right for returns?”).
- Say the deadline and the time it needs: “15 minutes, by Thursday 12:00”.
- Pick someone who did not write it; for a README, someone who has never run the project.

#### The checklist (`templates/peer-review-checklist.md`)

*templates/peer-review-checklist.md:*

```markdown
# Peer review checklist for a written document

<!-- Ask one person who did not write it. Give them the document, this list and 15 minutes. -->

## Before you ask
- [ ] The document passes doclint for its kind
- [ ] I wrote the one question I most want feedback on at the top

## For the reviewer
- [ ] I can say the question and the decision in one sentence each
- [ ] Every term that counts something has a definition (population, unit, time, time zone)
- [ ] I would count the same rows as the author for one example I picked
- [ ] Out of scope and non-goals are explicit
- [ ] Each acceptance check could be run by someone else
- [ ] README only: I reached the first result in 10 minutes without asking the author

## How to comment
- Start each comment with a label: **issue (blocking)**, **question**, **suggestion (non-blocking)** or **praise**
- Quote the sentence, say what is unclear, and propose replacement text
- The author replies to every blocking comment before the document is approved
```

| Unhelpful comment | Labelled, actionable comment |
|---|---|
| “Unclear.” | **issue (blocking):** “‘within 30 days’: is day 30 included? Suggest: ‘in the window [first order, first order + 30 × 24 h)’.” |
| “Why not BI?” | **question:** “Alternatives don’t mention computing it in the BI tool; was it considered?” |
| “Too long.” | **suggestion (non-blocking):** “Proposal repeats the definition card; link it instead and save about 120 words.” |
| (silence on what is good) | **praise:** “The non-example in the definition settles the cancelled-order question.” |

The labels added follow **Conventional Comments**, a widely used convention: a label (issue, question, suggestion, praise…) plus *(blocking)* or *(non-blocking)*, so the author knows what must change before approval.

> **On the job:** The same skills run every code review. Teams that label comments argue less, because “suggestion (non-blocking)” cannot be mistaken for a veto. Receiving review well (reply to every blocking comment, change the text, thank the reviewer) is noticed as much as giving it.

> **The main idea:** lint first, ask one specific question with a deadline, and label every comment so the author knows what blocks approval.

*Read more:* [Conventional Comments](https://conventionalcomments.org/), [Google: how to do a code review](https://google.github.io/eng-practices/review/reviewer/), [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/).

---

<a id="slide-21"></a>
## 21. Recognise which document the situation needs

*Part C · interview patterns: what do you write, and when? (added)*

Interviewers and real stakeholders rarely name the document. They describe a situation; you pick the smallest artefact that resolves it. Learn the cues on the left.

| You hear… | Write | Lesson | Interview pattern |
|---|---|---|---|
| “Can you get me X?” / “I need a dashboard ASAP.” | Intake: question, decision, grain, deadline, owner, acceptance criteria, out of scope | 4–6 | Vague request |
| “How would you know it’s right?” | Acceptance criteria with numbers and edge cases | 6 | Vague request, testing |
| “Can you also add…?” mid-way | Options with dates; updated Out of scope | 7–8 | Scope creep |
| “Will it be ready Friday?” when a source is late | Status update: At risk + options + next update date | 8 | Deadlines |
| “Here is how the business works; model it.” | BEAM event table → grain → bus-matrix rows | 10–13 | Data-model design |
| “Our success metric is volume of X.” | Push-back with readings and an alternative + guardrail | 14 | Push back on a bad metric |
| “What exactly does *active* mean?” | Definition card with a non-example | 15 | Conflicting definitions |
| “Should we build A or B?” | One-page design doc with alternatives | 16 | Design decisions |
| “Why did we choose this?” (months later) | ADR | 17 | Design decisions |
| “Please review my change.” | PR description | 18 | Take-home, code review |
| “How do I run this?” | README that passes the 10-minute test | 19 | Take-home, onboarding |

#### Signals that you are over-writing

- A design doc for a one-line fix.
- An ADR for a choice nobody would make differently.
- A 3-page intake for a one-off question you will answer in an hour (a reply with your assumptions is enough).

#### Signals that you are under-writing

- The same question about a definition comes up twice.
- A reviewer asks “why?” on a PR.
- You cannot say what is out of scope.
- Nobody but you can run the project.

> **On the job:** In behavioural interviews, name the artefact in your answer: “I wrote a one-page intake and got a yes on the decision before building” is more convincing than “I clarified requirements”. It shows a repeatable habit, not luck.

> **The main idea:** match the situation to the smallest document that resolves it, and say the artefact by name when you tell the story.

*Read more:* [Diátaxis documentation framework](https://diataxis.fr/), [Google Technical Writing One](https://developers.google.com/tech-writing/one), [STAR answer format](https://en.wikipedia.org/wiki/Situation,_task,_action,_result).

---

<a id="slide-22"></a>
## 22. Lab: the Fuel Smart spec pack

*Practice · 60 to 120 minutes, offline, everything checkable*

Put the deck together on your portfolio. You write six kinds of document for Fuel Smart v1 (plus one Leafy intake and one from your work), check them with the lab tools, get one peer review, and compare with the model answers. Everything is in [ 0 ](requirements-writing-lab/README.md) and [ 1 ](templates/intake.md), next to this deck.

| Step | Write (in `my-docs/`) | From the template | Check | Time |
|---|---|---|---|---|
| 1 | Three intakes: Fuel Smart v1; the Leafy workshops ask (“Can you tell me if the workshops are worth it?”); one request from your work | `intake.md` | `python doclint.py auto my-docs` | 30 min |
| 2 | A BEAM interview for Fuel Smart (a peer plays the stakeholder) and its event table as `beam-fuel-smart.csv` | `beam-interview.md` | `python bus_matrix.py my-docs/beam-fuel-smart.csv` | 20 min |
| 3 | A metric spec for protein density | `metric-spec.md` | doclint (kind `spec`) | 10 min |
| 4 | A one-page design doc for v1 and one ADR for its most debatable choice | `design-doc-one-page.md`, `adr.md` | doclint (kinds `design`, `adr`) | 30 min |
| 5 | A README for your Fuel Smart repository and the PR description of its first PR | `readme.md`, `pr-description.md` | doclint (kinds `readme`, `pr`) | 20 min |
| 6 | One peer review; fix every blocking comment; a peer runs the README with a 10-minute timer | `peer-review-checklist.md` | the checklist | 15 min |

#### Done when

- `python doclint.py auto my-docs` prints PASS for every file.
- `bus_matrix.py` prints `Checks: OK`, and Recipe and Date are among the conformed dimensions.
- Your reviewer has no open blocking comment.
- You can say, for each document, who reads it and what decision it helps.

**Then compare** with `solutions/`. The model answers pass the same checks:

Terminal:

```text
$ python doclint.py auto solutions
PASS solutions/adr-0001-exclude-low-coverage-recipes.md (adr)
PASS solutions/design-fuel-smart-v1.md (design)
PASS solutions/intake-fuel-smart-v1.md (intake)
PASS solutions/intake-leafy-workshops.md (intake)
PASS solutions/pr-fuel-smart-ingredient-parser.md (pr)
PASS solutions/readme-fuel-smart.md (readme)
PASS solutions/spec-protein-density.md (spec)
```

#### Hints, if you get stuck

- Decision for a portfolio: what the dashboard features and how it ranks, plus what a hiring manager should be able to judge.
- Fuel Smart events: an ingredient line is matched to a food; a food has nutrient amounts in a USDA release; a reviewer rates a recipe.
- The most debatable choice is usually the coverage threshold (80% of ingredient weight) or the source of truth for nutrition.
- README: everything that is not yet built goes in as “illustrative until the first run” in Expected output.
- Stretch: add the lab’s checks to your Fuel Smart CI, so every document PR runs `doclint.py auto docs`.

> **On the job:** This is the documentation set a reviewer expects in a strong data-engineering portfolio, and what a new team expects from you in your first month: a written question, a model plan, the decisions, and a project anyone can run. Keep the files in your Fuel Smart repository under `docs/`.

> **The main idea:** the lab turns every lesson into one artefact for your portfolio; the checks catch the gaps, the peer review catches the rest.

---

<a id="slide-23"></a>
## 23. Bug clinic: believable requirement and writing bugs

*Practice · symptom → cause → fix*

#### Bug 1 · “Numbers match the spreadsheet”

**Symptom:** the January repeat rate ships as 40.0%; Marketing’s count says 50.0%. **Cause:** the only acceptance criterion was “matches the spreadsheet”, and the query cut months in UTC. **Fix:** criteria with numbers and one per edge case (lesson 6); run `acceptance.py` in CI.

#### Bug 2 · One process, two grains

```python
import bus_matrix
from pathlib import Path

Path("bad_beam.csv").write_text(
    "process,fact_table,grain,w,item\n"
    "Returns,fct_return_line,one row per return,who,Customer\n"
    "Returns,fct_return_line,one row per order line,what,Product\n"
    "Returns,fct_return_line,one row per order line,how many,refund_amount\n",
    encoding="utf-8")
for p in bus_matrix.checks(bus_matrix.load("bad_beam.csv")):
    print("-", p)
```

Output:

```text
- Returns: no "when": every business event needs a date
- Returns: more than one fact table or grain for one process
```

**Symptom:** returns double-count when joined to orders. **Cause:** two interviews filed the same event at different grains. **Fix:** one grain per process, decided by the odd case (lesson 12).

#### Bug 3 · “Last week” in a definition

```python
import doclint
spec = "Weekly orders: completed orders from last week, all customers."
print(doclint.vague_terms(spec))
```

Output:

```text
[('last week', 'calendar or rolling? e.g. "calendar week Mon-Sun, America/Chicago"')]
```

**Symptom:** two analysts’ Monday numbers differ. **Cause:** one used the calendar week, one the last 7 × 24 hours; “all customers” included staff. **Fix:** name the window, time zone and population (lesson 15).

#### Bug 4 · The watermelon status

**Symptom:** “On track” for two weeks, then “we need another week” the day before. **Cause:** the risk was known early but the update had no Risks or Asks section. **Fix:** At risk + options + next update date, sent the day the risk appears (lesson 8).

#### Bug 5 · Editing an accepted ADR

**Symptom:** nobody can explain why last year’s numbers used UTC. **Cause:** ADR-0001 was edited in place when the rule changed, erasing the old reasoning. **Fix:** write ADR-0004 “Superseded ADR-0001…”, mark 0001 *Superseded by ADR-0004* (lesson 17).

#### Bug 6 · “Impact: none”

**Symptom:** a dashboard jumps 8% overnight; Finance escalates. **Cause:** the PR changed how cancelled orders were treated but said “Impact: none”. **Fix:** any change to a definition, grain or filter lists the numbers that move and who was told (lesson 18).

#### Bug 7 · The README that works on one laptop

**Symptom:** a reviewer stops at step 2 of your take-home. **Cause:** the quickstart reads `D:\work\leafy\data` and an environment variable only you set. **Fix:** relative paths, a committed fixture, every setting in the README, and the 10-minute test with someone else (lesson 19).

#### Bug 8 · The MVP that cut the tests

**Symptom:** v1 ships on time with six breakdowns and a wrong total. **Cause:** scope was cut from correctness instead of breadth. **Fix:** tests, definition and review are always “must”; cut dimensions and polish (lesson 7).

> **On the job:** Every one of these has a cheap written fix that costs minutes; each costs days when found by a stakeholder. Reviewing your own documents against this list before you send them is a good habit to build now.

> **The main idea:** most requirement bugs are missing words: a number in a criterion, a grain, a window, a risk, a consequence, an impact; write them down before someone else finds them.

---

<a id="slide-24"></a>
## 24. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

These are the question types that came up most often in the October 2026 research (data-engineering loops, behavioural and take-home rounds). Answer aloud in about a minute, then compare. Name the artefact you would write; that is what makes an answer sound like a habit.

<details><summary>“A stakeholder asks for a growth dashboard ASAP. What do you do?” · *checks: turning a vague ask into an agreed request; not over-building*</summary>

**Model answer (about 60 s):** First I ask what decision the dashboard supports and by when, because that picks the metric and the grain. I write a short intake: the question in one sentence, the decision, the grain, the deadline, the owner, two or three acceptance checks with numbers, and what is out of scope for the first version. I propose the smallest version that supports the decision, say a table of one metric by month and channel by Thursday, and list the other wishes as phase 2. I send it back and start when they say yes. That usually takes an hour and saves a week of building the wrong thing.

**Likely follow-up:** “They insist on everything by Friday.” → Offer two or three options with dates and quality labels (lesson 8), recommend one, and let them choose in writing.

</details>

<details><summary>“How do you gather requirements for a new data model?” · *checks: a structured method, involving the right people, written playback*</summary>

**Model answer (about 60 s):** I run a short structured interview with the person who asked and someone who does the work. I find the business events as subject-verb-object (“customer returns an order line”), then ask the 7Ws for each: who, what, when, where, how many, why, how, with real example rows and at least one odd case. The odd cases decide the grain. Afterwards I turn each event into a bus-matrix row with a grain statement, send the table back the next day with “what did I miss?”, and agree the shared dimensions first.

**Likely follow-up:** “What if they don’t know what they need?” → Ask about decisions and recent stories, not fields; propose readings with numbers and let them pick.

</details>

<details><summary>“Tell me about a time the scope grew mid-project.” · *checks: trade-offs made explicit; who decided; written outcome (STAR)*</summary>

**Model answer (about 60 s):** Situation: two days into a repeat-customer analysis due before a planning meeting, the requester added a campaign split. Task: keep the date that mattered. Action: I estimated campaign attribution at four days, and offered three options in writing: keep the date and add campaigns in phase 2, a rough split labelled approximate in half a day, or move the date by a week. I recommended the first. Result: they chose it, the meeting got the number on time, and the campaign work became its own intake.

**Likely follow-up:** “What if your manager says just do it all?” → Show the plan at 80% capacity and ask which item moves; never cut tests to fit.

</details>

<details><summary>“An upstream source will be late and you may miss a deadline. What do you do?” · *checks: early warning, options, ownership*</summary>

**Model answer (about 60 s):** I send a status update the day I know, not on the due date: At risk, which data is late, which number it affects and from which date. I give options with their cost, for example ship on time with one cohort marked provisional, or move the date by one day with complete data, and I name who decides and by when. I also say when the next update comes, so silence is never ambiguous.

**Likely follow-up:** “Would you ever ship with the provisional number?” → Yes if it is labelled, the decision tolerates it, and the owner chose it in writing.

</details>

<details><summary>“A PM wants “number of conversations” as the success metric for an AI assistant. Respond.” · *checks: pushing back with evidence and an alternative*</summary>

**Model answer (about 60 s):** I would check what the metric does when the product gets worse. In a bad release, conversations often rise because people retry, while the share resolved falls and hand-offs to humans rise; I would show that on two weeks of data. So I would propose a primary metric of conversations resolved without a hand-off, with guardrails such as hand-off rate and conversations per customer, all reported by agent version, and keep volume as context.

**Likely follow-up:** “How do you know it was resolved?” → Write the definition: no hand-off, no repeat conversation on the same intent within 24 hours; review a sample of transcripts to check it.

</details>

<details><summary>“Two teams define “active customer” differently. How do you resolve it?” · *checks: semantic precision, ownership, governance*</summary>

**Model answer (about 60 s):** First I write both definitions side by side with their numbers for the same period, and find the exact difference: the action, the window, the time zone, the exclusions. Then I bring the owners together with a proposed definition card that has an example and a non-example, and ask which decisions each team uses it for. Often both are valid for different decisions, so we give them different names. The agreed card goes into the semantic layer or dbt descriptions, with one owner.

**Likely follow-up:** “They still disagree.” → Escalate to the metric owner named in governance; until then, label each dashboard with its definition.

</details>

<details><summary>“What makes a good README and PR description for a take-home?” · *checks: reviewer empathy; reproducibility; stating assumptions*</summary>

**Model answer (about 60 s):** The README lets a stranger get the result in 10 minutes: one sentence of purpose, at most five commands, the expected output, the layout, how to run the tests, data sources and the decisions and assumptions I made. The PR description says what and why, how I validated it with commands and numbers, what it affects, and how to roll back. I ask someone to run the README with a timer before I submit.

**Likely follow-up:** “What assumptions would you state?” → Grain, exclusions, time zone, what is out of scope, and anything you would ask the business if you could.

</details>

<details><summary>“Walk me through a design decision you documented, and the alternative you rejected.” · *checks: reasoning about trade-offs; honest consequences*</summary>

**Model answer (about 60 s):** On the repeat-customer work we had to choose which clock defines a business month. UTC was simpler, but it put evening orders on the last day of a month into the next month and disagreed with Finance. We chose Chicago calendar days through one shared macro and wrote ADR-0001: context, the decision, and consequences, including what got harder (every model must use the macro; daylight-saving days have 23 or 25 hours). The rejected alternative is in the record, so nobody reopens it without new facts.

**Likely follow-up:** “What would make you change it?” → New facts, recorded as a new ADR that supersedes the old one.

</details>

> **The main idea:** every answer has the same spine: ask for the decision, write the smallest document that makes it explicit, offer options with costs, and confirm in writing.

*Read more:* [STAR answer format](https://en.wikipedia.org/wiki/Situation,_task,_action,_result), [Conventional Comments](https://conventionalcomments.org/).

---

<a id="slide-25"></a>
## 25. Exercises 1–3 · warm-ups

*Exercises · one idea each*

Write your answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 1 · Write the intake for a delivery question

Leafy’s operations lead writes: *“Can we see how late deliveries are getting? Need it for the carrier review.”* You learn: the carrier review is on **2026-04-02**; the decision is whether to move Denver parcels from Carrier B to Carrier A; the table `shipments` has `carrier`, `warehouse`, `promised_date` and `delivered_at_utc`. Write a complete intake as a Markdown string so that `doclint.lint("intake", doc)` returns `[]`. Include at least two acceptance criteria, one with a number. *Pattern: vague request (P1) · warm-up · about 10 minutes.*

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Predict what the linter flags

Predict the output, then rewrite the definition so nothing is flagged. Input: `"Engaged users: people active in the last month, real-time."` *Pattern: conflicting definitions / precision (P6) · warm-up, predict the output · about 5 minutes.*

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Sort interview notes into the 7Ws

From a Leafy workshop interview: *“the customer who attends”, “the instructor”, “the repotting workshop”, “Saturday 17 January, 10:00”, “the Denver store”, “ticket price $35”, “came because of the spring email”, “booked online or at the till”*. Map each note to one W, then write the grain statement for the event *customer attends workshop*. *Pattern: requirements interview (P2) · warm-up · about 5 minutes.*

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

> **The main idea:** an intake passes when every section is decided; a definition passes when no word hides a choice; notes become a model when each one has its W.

---

<a id="slide-26"></a>
## 26. Exercises 4–6 · scope, push-back, status

*Exercises · interview level*

Write your answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 4 · Cut the scope to fit the appetite

Finance asks for “a monthly revenue report by product, region and channel, with a forecast and drill-down to orders” in **4 working days**. Your estimates: revenue by product category (must, 1.0 d), reconcile to the ledger total (must, 1.0 d), tests and definition (must, 0.75 d), region split (should, 0.5 d), channel split (could, 0.5 d), drill-down to orders (could, 1.0 d), forecast (won’t, 3.0 d). Plan to 80% of the appetite. Return the plan, the “later” list and the “out” list, and write the one-sentence scope statement. *Pattern: scope creep (P3) · interview level · about 15 minutes.*

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Push back on “average rating” for the Plant Doctor

The product manager proposes “average answer rating” as the Plant Doctor’s success metric. On 1,000 synthetic conversations, compute the share that have a rating, the average rating, and the share resolved without hand-off. Then write a three-sentence reply with an alternative. *Pattern: push back on a bad metric (P4) · interview level · about 15 minutes.*

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · Fix the status update

You are building the on-time delivery table from exercise 1, due **2026-03-31 12:00**. On 2026-03-25 you learn the carrier API allows 1,000 calls per hour, so the backfill takes 3 days instead of 1. The update you were about to send: `Status: Green. Done: modelling. Next: finish. Risks: none.` Write the update so `doclint.lint("status", doc)` returns `[]` and it says **At risk**. *Pattern: deadlines and status (P5) · interview level, find the bug · about 10 minutes.*

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

> **The main idea:** scope, push-back and status answers all show options with costs and leave the decision to its owner, in writing.

---

<a id="slide-27"></a>
## 27. Exercises 7–9 · writing for reviewers

*Exercises · interview level*

Write your answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 7 · Rewrite a PR description

Your PR changes how Plant Doctor events are de-duplicated: from `(session_id, event_ts)` to `event_id`. On February data, conversations drop by 3.1% (duplicates that had different timestamps were counted twice). The draft description is `# Fix` followed by “changed dedup”. Write a description that passes `doclint.lint("pr", doc)` and states the 3.1% impact in the Impact section. *Pattern: take-home / code review (P7) · interview level · about 10 minutes.*

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Add a bus-matrix row from an interview

A new event from the payments lead: *“A customer redeems a gift card on an order, on the web or in the app; we track the amount redeemed.”* Add the rows for process **Gift card redemptions** (fact `fct_gift_card_redemption`) to Leafy’s `data/beam_events.csv` in a new file, run the checks, and report which dimensions are now shared by the most processes. *Pattern: data-model design (P8) · interview level · about 15 minutes.*

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Make the README pass the 10-minute test

Rewrite `examples/readme-before.md` for a repository that holds the repeat-customer work (`acceptance.py`, `data/leafy_orders.csv`, `docs/`). It must pass `doclint.lint("readme", doc)` with at most five quickstart commands. *Pattern: take-home README (P7) · interview level · about 15 minutes.*

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

> **The main idea:** write for the reader who was not there: the reviewer, the next modeller, the stranger with a timer.

---

<a id="slide-28"></a>
## 28. Exercises 10–11 · stretch

*Exercises · design and take-home*

Write your answer before opening the hint. The solutions ran during the build: their `assert` lines passed. In the Markdown companion, hints are in Appendix A and solutions in Appendix B.

### Exercise 10 · Write the ADR for a de-duplication decision

After exercise 7, the team decides that Plant Doctor events are de-duplicated **once, in staging, on `event_id`**, instead of in each mart. Write ADR-0005 so it passes `doclint.lint("adr", doc)`, with at least one honest “Harder” consequence. *Pattern: design decisions (P9) · stretch, design · about 15 minutes.*

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

### Exercise 11 · Take-home: the Fuel Smart intake and bus matrix

Do lab steps 1 and 2 for Fuel Smart: an intake for the v1 question and a BEAM event table with at least three processes. Your files must pass `doclint.py` and `bus_matrix.py`, and Recipe and Date must be conformed (used by two or more processes). The solution checks the model answers in `solutions/`; run the same lines on your files. *Pattern: vague request + data-model design (P1, P8) · stretch, take-home · about 45 minutes.*

*Hint: [Appendix A](#hint-11) · Solution: [Appendix B](#solution-11)*

> **The main idea:** decisions and models are only as useful as their written reasons and grains; the stretch tasks are the documents you will keep in your portfolio.

---

<a id="slide-29"></a>
## 29. Cheat sheet

*Reference · one page to keep open*

| Document | Must contain | Check with | Template |
|---|---|---|---|
| Intake | Question (?), decision, grain (one row per), deadline (date + zone), owner, acceptance criteria (with a number), out of scope | `python doclint.py intake FILE` | `intake.md` |
| Acceptance criteria | Input, expected number, one per edge case; runnable by someone else | `python acceptance.py` (pattern) | in the intake |
| Scope statement | In v1, later (phase 2), out of scope; plan to ~80% of the appetite | MoSCoW + estimates | in the intake |
| Status update | On track / At risk / Off track, done, next, risks, asks, next update date; options when not on track | `doclint.py status` | `status-update.md` |
| BEAM interview | Events (subject-verb-object), 7Ws, example rows with an odd case, grain, playback | `python bus_matrix.py FILE.csv` | `beam-interview.md` |
| Definition card | Definition, includes, excludes, unit, time (window, zone, ends), source, owner, example + non-example | `doclint.py definition` | `definition.md` |
| Metric spec | The spec card from *Metric design* (lesson 5) | `doclint.py spec` | `metric-spec.md` |
| One-page design doc | Context, goals, non-goals, proposal, ≥ 2 alternatives, risks, test and rollout, open questions; ≤ 700 words | `doclint.py design` | `design-doc-one-page.md` |
| ADR | # ADR-NNNN: title; status; context; decision (“We will…”); consequences (Easier / Harder) | `doclint.py adr` | `adr.md` |
| PR description | Title ≤ 72 chars (verb + what + why); what and why; validation (commands, numbers); impact; rollback; ticked checklist | `doclint.py pr` | `pr-description.md` |
| README | One-sentence purpose; quickstart ≤ 5 commands; expected output; layout; tests; data and licences; decisions; troubleshooting | `doclint.py readme` + a 10-minute test | `readme.md` |
| Peer review | One question, a deadline, labelled comments (issue (blocking), question, suggestion, praise) | the checklist | `peer-review-checklist.md` |

#### Words to replace

| Instead of | Write |
|---|---|
| ASAP, soon | a date, a time, a time zone |
| real-time, fast | a maximum delay or a duration in numbers |
| recent, last week | the window: calendar or rolling, the zone, the ends |
| active, engaged | the action, by whom, in which window |
| users, all customers | the population and the exclusions |
| etc, various | the full list, or “only these” |

#### Phrases that work

- “Which decision will this number change, and by when?”
- “For 12 March I will deliver X; Y and Z can follow in phase 2.”
- “Three options: A … (date), B … (label), C … (date). I suggest A. Which do you prefer?”
- “At risk: … Next update on …”
- “Tell me about an unusual one from last week.”
- “What did I get wrong?” (with the playback)

> **The main idea:** every document has a short list of sections that force the decisions; the linter checks the list, people check the decisions.

---

<a id="slide-30"></a>
## 30. Glossary

*Reference · every new term in one place*

| Term | Meaning |
|---|---|
| Acceptance criterion | A statement that must be true for the work to count as done, checkable by someone other than the author (lesson 6). |
| ADR (architecture decision record) | A short, numbered, immutable record of one decision: status, context, decision, consequences (lesson 17). |
| Agent version | The combination of model, prompt and tool set that answered; a dimension for AI-assistant telemetry (lesson 14). |
| Appetite | The time you are willing to spend on a piece of work, fixed up front; scope flexes to fit it (lesson 7). |
| BEAM✲ | Business Event Analysis and Modeling: an example-driven requirements method using the 7Ws (lesson 10). |
| Bus matrix | A table with business processes as rows and shared dimensions as columns; the plan of a warehouse (lesson 13). |
| Business event | Something that happens at a point in time and is worth measuring, said as subject + verb + object; a candidate fact table (lesson 10). |
| Conformed dimension | A dimension with one agreed meaning, shared by several processes (lesson 13). |
| Decision (of an intake) | Who decides what, when, and what changes for each answer; the reason a request exists (lesson 4). |
| Definition card | A written definition of one business term: includes, excludes, unit, time, source, owner, example and non-example (lesson 15). |
| Design doc | A document describing planned work and its reasoning, reviewed before the build; one page for most data work (lesson 16). |
| Event table / example rows | The 7Ws of one event with typical and odd example values; BEAM calls the rows event stories (lessons 10, 12). |
| Facilitator, scribe | The two roles in a requirements interview: one asks, one writes the event table where everyone can see it (lesson 11). |
| Grain statement | “One row per …”: what one row of a fact table or an answer means (lesson 12). |
| Half-open interval | [start, end): includes the start, excludes the end, so consecutive windows neither overlap nor leave gaps (lesson 15). |
| Modelstorming | Modelling + brainstorming: BEAM’s collaborative, example-driven workshop (lesson 10). |
| MoSCoW | Must have, Should have, Could have, Won’t have (this time): a way to sort scope (lesson 7). |
| MVP (minimum viable product) | The smallest version that still supports the decision (lesson 7). |
| Non-goal | A reasonable thing a design deliberately will not do (lesson 16). |
| Out of scope | Wishes this version will not deliver, written down with a phase or condition (lessons 4, 7). |
| Peer review | A colleague reading a document with a checklist and leaving labelled comments before approval (lesson 20). |
| Playback | Reading the captured requirements back to the stakeholders to confirm them (lesson 11). |
| PR description | The text of a pull request: what and why, validation, impact, rollback, checklist (lesson 18). |
| README, 10-minute test | The entry document of a repository; the test is a stranger reaching the first result in 10 minutes with it alone (lesson 19). |
| Request intake | A short, structured record of one request: question, decision, grain, deadline, owner, acceptance criteria, out of scope (lesson 4). |
| RFC 2119 keywords | MUST, SHOULD, MAY (and their negatives) with precise meanings, only when written in capitals (lesson 15). |
| 7Ws | Who, what, when, where, how many, why, how: the BEAM questions for each event (lesson 10). |
| Scope, scope creep | What the work will deliver; growth of scope without growth of time (lesson 7). |
| Semantic precision | Every counting term has one written meaning, so two readers select the same rows (lesson 15). |
| Status update | A short regular message: On track / At risk / Off track, done, next, risks, asks, next update (lesson 8). |
| Superseded | An ADR status meaning a newer ADR replaced it; the old record stays unchanged (lesson 17). |
| Trade-off | Giving up some of one thing (scope, time, quality) to get more of another (lesson 8). |
| Watermelon status | A status that is green outside and red inside: reported on track until it is too late (lesson 8). |

---

<a id="slide-31"></a>
## 31. Recap and how this deck meets the lessons

*Reference · what to remember, and what to tick off*

1. Before building, write an intake: question, decision, grain, deadline, owner, acceptance criteria, out of scope; start after a “yes”.
2. Acceptance criteria have numbers and one check per edge case; if a criterion cannot fail, it is not one.
3. Fix the time, flex the scope, plan to about 80%, and write the leftovers as “later” or “out of scope”.
4. When scope or dates do not fit, offer options with costs and let the owner choose; send At risk the day you know.
5. Requirements interviews: events as subject-verb-object, the 7Ws, example rows with an odd case, a grain, and a written playback.
6. Each event becomes a bus-matrix row; the dimensions used by many rows are the definitions to agree first.
7. Push back on volume metrics with numbers and an alternative plus guardrails.
8. A definition is precise when two people pick the same rows; add a non-example.
9. One-page design docs need non-goals and honest alternatives; ADRs need what got harder; PRs need validation and impact; READMEs need a stranger and a timer.
10. Lint first, then ask one peer one question; label comments.

| Lesson goal (definition of done) | Where in this deck | Practice |
|---|---|---|
| I turn vague asks into specs | Lessons 4–6 (with *Metric design* slides 4–6 for the spec card) | Exercise 1, lab step 1 |
| I clarify which decision a request supports | Lessons 4–5, 9 | Exercises 1, 11 |
| I manage expectations on scope and timing | Lessons 7–8 | Exercises 4, 6 |
| I write a one-page design doc | Lesson 16 | Lab step 4 |
| My README onboards someone in 10 minutes | Lesson 19 | Exercise 9, lab steps 5–6 |
| My definitions are precise | Lesson 15 (spec card: *Metric design* slide 5) | Exercise 2, lab step 3 |
| I build a bus matrix | Lesson 13 (concept: *Model a business end to end* slide 3) | Exercise 8, lab step 2 |
| I run a structured requirements interview | Lessons 10–12, 14 | Exercise 3, lab step 2, one interview at work |
| I turn a vague request into a grain + metric spec | Lessons 5, 12 (grain rules: *Why dimensional modeling* slides 14–16) | Exercises 1, 11 |
| I push back on a bad metric with an alternative | Lesson 14 (technique: *Metric design* slides 4–8) | Exercise 5 |

**Practice plan:** this week, run the lab on Fuel Smart; next week, run one 45-minute BEAM interview at work on agent telemetry and send the event table back the next day; from then on, every request you take gets an intake, and every PR a description that passes the checklist.

> **The main idea:** the habit is small and repeatable: decision first, write it down, offer options, make it checkable, and let someone else read it.

---

<a id="slide-32"></a>
## 32. References and how this deck was tested

*Reference · official and primary sources, and what to read there*

| Source | What to read there |
|---|---|
| [Modelstorming: Agile Data Warehouse Design](https://modelstorming.com/), [BEAM templates](https://modelstorming.com/templates) | The 7Ws, event stories and the BEAM table; the free templates are enough to run a session. |
| [Kimball: the bus matrix](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/enterprise-data-warehouse-bus-matrix/), [the matrix revisited](https://www.kimballgroup.com/2005/12/the-matrix-revisited/) | How the matrix plans a warehouse and drives conformance. |
| [Kimball: four-step design process](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/four-4-step-design-process/), [declare the grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/), [business processes](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/business-process/) | Where interview answers go in the design. |
| [Nygard: Documenting architecture decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions), [adr.github.io](https://adr.github.io/), [ADR templates](https://adr.github.io/adr-templates/), [Azure Well-Architected: decision records](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record) | The original format, variants (MADR, Y-statements), and how large teams keep a decision log. |
| [Design docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) | Goals and non-goals, alternatives, and when a design doc is not worth writing. |
| [Google: writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html), [how to do a code review](https://google.github.io/eng-practices/review/reviewer/) | First line, body, and what reviewers look for. |
| [dbt Labs: the PR template we use](https://docs.getdbt.com/blog/analytics-pull-request-template), [GitHub PR templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository), [Azure Repos PR templates](https://learn.microsoft.com/en-us/azure/devops/repos/git/pull-request-templates) | An analytics PR template, and where to put yours. |
| [GitHub: about READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), [Make a README](https://www.makeareadme.com/), [Diátaxis](https://diataxis.fr/) | README sections, and how a README fits with tutorials, how-tos, reference and explanation. |
| [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) | Requirement keywords and date formats: precision you can cite. |
| [Google Technical Writing One](https://developers.google.com/tech-writing/one), [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/), [plain language guidelines](https://www.plainlanguage.gov/guidelines/) | Short sentences, active voice, one term per idea. |
| [Shape Up: set boundaries](https://basecamp.com/shapeup/1.2-chapter-03), [the betting table](https://basecamp.com/shapeup/2.2-chapter-08), [MoSCoW](https://en.wikipedia.org/wiki/MoSCoW_method), [project triangle](https://en.wikipedia.org/wiki/Project_management_triangle) | Appetite, fixed time and variable scope, prioritisation. |
| [Conventional Comments](https://conventionalcomments.org/), [STAR answer format](https://en.wikipedia.org/wiki/Situation,_task,_action,_result), [Gherkin](https://cucumber.io/docs/gherkin/reference/) | Labelled review comments; telling a behavioural story; Given / When / Then. |
| [dbt: documentation](https://docs.getdbt.com/docs/build/documentation), [description property](https://docs.getdbt.com/reference/resource-properties/description), [DuckDB: CSV](https://duckdb.org/docs/stable/data/csv/overview), [pytest](https://docs.pytest.org/en/stable/getting-started.html) | Where definitions live in a dbt project; the tools the lab uses. |

**How this deck was tested:** CPython 3.12.10, DuckDB 1.5.6, pytest 9.1.1 on Windows 11. The build copies the lab and templates into a fresh folder, runs every command and Python block shown with output, and fails on any unexpected exit code or exception; it built with 0 failures. The lab’s pytest suite runs as part of the build (lesson 2). Not executed: the dbt models named in the Leafy design doc and PR description (illustrative), and the Fuel Smart README’s commands (a project you will build). Interview patterns were researched in October 2026 from public interview guides, question banks and practitioner posts; all questions here are original.

> **The main idea:** the sources are short and practical: read BEAM’s templates, Nygard’s ADR post and Google’s CL-description guide first.

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Write the intake for a delivery question

Start from `templates/intake.md`. Turn “how late” into a rate with a grain (“one row per …”), and pick a deadline before the meeting.

<a id="hint-2"></a>
### Hint 2 · Predict what the linter flags

`doclint.VAGUE` is checked pattern by pattern, in list order, not in sentence order.

<a id="hint-3"></a>
### Hint 3 · Sort interview notes into the 7Ws

Nouns that act are “who”; the thing involved is “what”; numbers you add up are “how many”; reasons are “why”; methods are “how”.

<a id="hint-4"></a>
### Hint 4 · Cut the scope to fit the appetite

Musts always go in; others only while the running total stays within the 80% budget; “won’t” goes straight to out of scope.

<a id="hint-5"></a>
### Hint 5 · Push back on “average rating” for the Plant Doctor

A metric that only a small, self-selected group feeds is a coverage problem first. Compute coverage before the average.

<a id="hint-6"></a>
### Hint 6 · Fix the status update

At risk needs a specific cause, the number or date affected, options with their cost, a named decision owner, and the date of the next update.

<a id="hint-7"></a>
### Hint 7 · Rewrite a PR description

Title: verb + what + why, at most 72 characters. Impact: which number moves, by how much, and who was told.

<a id="hint-8"></a>
### Hint 8 · Add a bus-matrix row from an interview

Who, what, when, where and how many are all in the sentence. One redemption can cover part of an order: what is one row?

<a id="hint-9"></a>
### Hint 9 · Make the README pass the 10-minute test

Use the section list from `templates/readme.md`; put real expected output in the Expected output block.

<a id="hint-10"></a>
### Hint 10 · Write the ADR for a de-duplication decision

Context = why now (the 3.1% double count; three marts each de-duplicating differently). Decision = one sentence starting “We will”. Consequences = easier and harder.

<a id="hint-11"></a>
### Hint 11 · Take-home: the Fuel Smart intake and bus matrix

Use the Fuel Smart brief’s model sketch: which of its tables are events (things that happen) and which are dimensions?

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Write the intake for a delivery question

```python
import doclint

doc = """# Intake: on-time delivery by carrier for the 2026-04-02 carrier review

> Can we see how late deliveries are getting? Need it for the carrier review.

## Question
What share of Denver parcels did each carrier deliver by the promised date, per calendar week, from 2026-01-05 to 2026-03-29?

## Decision it supports
At the carrier review on 2026-04-02 the operations lead decides whether to move Denver parcels from Carrier B to Carrier A. Move them if Carrier B's on-time share is more than 5 points below Carrier A's for 8 of the 12 weeks.

## Grain
One row per carrier per ISO week (America/Chicago). Population: delivered parcels shipped from Denver; lost or returned parcels are counted separately.

## Deadline
2026-03-31 12:00 America/Chicago, so the table can go into the review pack.

## Owner
Builds it: data engineer. Owns the on-time definition: operations lead. Signs off: operations lead.

## Acceptance criteria
- On time means delivered_at_utc converted to America/Chicago falls on or before promised_date.
- On the 20-parcel fixture, Carrier A week 2026-W10 shows 9 of 10 on time (90.0%).
- A week with no parcels for a carrier shows 0 parcels and an empty rate, not 0%.

## Out of scope
- Austin parcels: phase 2 if the review asks.
- Cost per parcel and damage rates: separate request.
"""
problems = doclint.lint("intake", doc)
assert problems == [], problems
print("PASS:", len(doc.split()), "words")
```

Output:

```text
PASS: 219 words
```

**Why it works:** the question has a rate, a population and a window; the decision has a threshold, so the number changes an action; the grain names the week definition; the criteria include a definition, a number and an empty-week edge case. **Common wrong answer:** “Question: how late are deliveries?” with no grain or threshold: it passes as a sentence but cannot be tested. **Interviewer follow-up:** “The review moves to next Monday.” → Keep the grain and criteria, cut breadth (one warehouse, fewer weeks) and say so in Out of scope.

<a id="solution-2"></a>
### Solution 2 · Predict what the linter flags

```python
import doclint

text = "Engaged users: people active in the last month, real-time."
found = [term for term, _ in doclint.vague_terms(text)]
print(found)
assert found == ["real-time", "last month", "active", "Engaged"]

fixed = ("Ordering customers (28 days): customer_ids with at least one completed order in the "
         "28 complete days before the report date, America/Chicago; data at most 1 day old.")
assert doclint.vague_terms(fixed) == []
print("fixed: no vague terms")
```

Output:

```text
['real-time', 'last month', 'active', 'Engaged']
fixed: no vague terms
```

**Why:** the matches come out grouped by pattern (real-time, then last week/month, then active, then engaged), which is why sentence order is the most common wrong prediction. The fix replaces every flagged word with an action, a window, a clock and a delay. **Common wrong answer:** replacing “active” with “engaged”: a synonym is not a definition. **Interviewer follow-up:** “Marketing wants 30 days, Product 28.” → Two names, two cards, one owner each.

<a id="solution-3"></a>
### Solution 3 · Sort interview notes into the 7Ws

```python
notes = {
    "the customer who attends": "who",
    "the instructor": "who",
    "the repotting workshop": "what",
    "Saturday 17 January, 10:00": "when",
    "the Denver store": "where",
    "ticket price $35": "how many",
    "came because of the spring email": "why",
    "booked online or at the till": "how",
}
grain = "one row per attendee per workshop session"
assert sorted(set(notes.values())) == ["how", "how many", "what", "when", "where", "who", "why"]
assert grain.startswith("one row per")
for w in ["who", "what", "when", "where", "how many", "why", "how"]:
    print(f"{w:<9}", [n for n, x in notes.items() if x == w])
print("grain:", grain)
```

Output:

```text
who       ['the customer who attends', 'the instructor']
what      ['the repotting workshop']
when      ['Saturday 17 January, 10:00']
where     ['the Denver store']
how many  ['ticket price $35']
why       ['came because of the spring email']
how       ['booked online or at the till']
grain: one row per attendee per workshop session
```

**Why:** two “who” answers (customer and instructor) become two dimensions or roles; “ticket price” is the measure; “why” (the email) becomes a promotion dimension, conformed with Orders. **Common wrong answer:** grain “one row per workshop”: then attendance and ticket revenue per customer are lost. **Interviewer follow-up:** “Some people book and don’t come.” → Is a no-show a row with a flag, or a separate booking event? Ask for an example row.

<a id="solution-4"></a>
### Solution 4 · Cut the scope to fit the appetite

```python
def fit(asks, appetite, share=0.8):
    budget, plan, later, out = appetite * share, [], [], []
    for name, moscow, days in asks:
        used = sum(d for _, d in plan)
        if moscow == "won't":
            out.append(name)
        elif moscow == "must" or used + days <= budget:
            plan.append((name, days))
        else:
            later.append(name)
    return plan, later, out

asks = [("revenue by product category", "must", 1.0), ("reconcile to ledger total", "must", 1.0),
        ("tests and definition", "must", 0.75), ("region split", "should", 0.5),
        ("channel split", "could", 0.5), ("drill-down to orders", "could", 1.0),
        ("forecast", "won't", 3.0)]
plan, later, out = fit(asks, appetite=4.0)
assert [n for n, _ in plan] == ["revenue by product category", "reconcile to ledger total", "tests and definition"]
assert sum(d for _, d in plan) == 2.75 and later == ["region split", "channel split", "drill-down to orders"]
print("plan:", plan, "\nlater:", later, "\nout:", out)
print("Statement: by day 4, monthly revenue by product category, reconciled to the ledger and tested;"
      " region, channel and drill-down in phase 2; forecasting is out of scope.")
```

Output:

```text
plan: [('revenue by product category', 1.0), ('reconcile to ledger total', 1.0), ('tests and definition', 0.75)] 
later: ['region split', 'channel split', 'drill-down to orders'] 
out: ['forecast']
Statement: by day 4, monthly revenue by product category, reconciled to the ledger and tested; region, channel and drill-down in phase 2; forecasting is out of scope.
```

**Why:** 2.75 days of musts plus the 0.5-day region split would be 3.25 days, over the 3.2-day budget, so region waits. The statement names what is in, what is later and what is out. **Common wrong answer:** filling to 4.0 days with region and channel, leaving no buffer for the reconciliation surprises that always happen. **Interviewer follow-up:** “Finance says region is a must.” → Then it goes in and something gives: the buffer shrinks to 0.25 days or the date moves by half a day. Say which, in writing.

<a id="solution-5"></a>
### Solution 5 · Push back on “average rating” for the Plant Doctor

```python
import duckdb, random

random.seed(11)
rows = []
for i in range(1000):
    resolved = random.random() < 0.70
    rated = random.random() < (0.05 if resolved else 0.12)     # unhappy people rate more often
    rating = (random.choice([4, 5, 5]) if resolved else random.choice([1, 1, 2, 5])) if rated else None
    rows.append((i, resolved, rating))
con = duckdb.connect()
con.execute("CREATE TABLE conv (id INT, resolved BOOLEAN, rating INT)")
con.executemany("INSERT INTO conv VALUES (?, ?, ?)", rows)
coverage, avg_rating, resolved = con.execute("""
    SELECT round(100 * count(rating) / count(*), 1), round(avg(rating), 2),
           round(100 * avg(resolved::INT), 1) FROM conv""").fetchone()
print(f"rated: {coverage}% · average rating: {avg_rating} · resolved: {resolved}%")
assert coverage < 10
print("Reply: Only", f"{coverage}%", "of conversations get a rating, and unhappy customers rate more often,"
      " so the average describes a small, skewed group. I suggest the share resolved without hand-off"
      " as the success metric, with rating coverage and hand-off rate as guardrails. OK?")
```

Output:

```text
rated: 6.1% · average rating: 3.31 · resolved: 71.1%
Reply: Only 6.1% of conversations get a rating, and unhappy customers rate more often, so the average describes a small, skewed group. I suggest the share resolved without hand-off as the success metric, with rating coverage and hand-off rate as guardrails. OK?
```

**Why:** the average rating rests on under 10% of conversations, chosen by the customers themselves; it can move with who bothers to rate, not with quality. A resolution-based metric covers every conversation. **Common wrong answer:** arguing about whether the average is good: the problem is coverage, not the value. **Interviewer follow-up:** “Then how do we measure quality?” → Sample and label transcripts each week (an evaluation set), reported by agent version.

<a id="solution-6"></a>
### Solution 6 · Fix the status update

```python
import doclint

doc = """# Status: on-time delivery by carrier · 2026-03-25

## Status
At risk: the carrier API allows 1,000 calls per hour, so the 12-week backfill finishes on 2026-03-31 at the earliest.

## Done since last update
- Fact table and on-time definition reviewed with the operations lead.

## Next
- 2026-03-26: start the backfill, newest weeks first.

## Risks and blockers
- Backfill time: if it fails once, the 12 weeks are not complete for the review.

## Asks
Operations lead, by 2026-03-26 12:00: choose one option.
- Option A: keep 2026-03-31 with the 8 newest weeks only; the decision rule becomes 6 of 8 weeks.
- Option B: new date 2026-04-01 17:00 with all 12 weeks, the evening before the review.

## Next update
2026-03-27, or earlier if the backfill fails.
"""
problems = doclint.lint("status", doc)
assert problems == [] and "At risk" in doc
print("PASS")
```

Output:

```text
PASS
```

**Why:** the update is sent the day the risk is known, explains it with a number, shows what each option costs (including that option A changes the decision rule), and asks a named person to choose. **Common wrong answer:** “Green, slight delay possible”: the reader cannot act on it. **Interviewer follow-up:** “Why not just work the weekend?” → It may be an option; put it in the list with its cost, but the API limit is per hour, so effort does not shorten it.

<a id="solution-7"></a>
### Solution 7 · Rewrite a PR description

```python
import doclint

doc = """# De-duplicate Plant Doctor events on event_id to stop double counts

## What and why
Staging now keeps one row per `event_id`. The old key `(session_id, event_ts)` kept retried events with a new timestamp twice, inflating conversations.

## How it was validated
- `python -m pytest tests/test_stg_agent_events.py`: 4 new tests, including a retried event with two timestamps.
- February conversations: 18,412 before, 17,841 after (-3.1%), checked against 50 sampled sessions.

## Impact on existing models and consumers
`fct_agent_conversation` and the Plant Doctor dashboard drop by 3.1% for February; earlier months by 2-4%. Product manager and support lead told on 2026-03-12.

## Rollback
Revert this PR and re-run the staging model; no schema change.

## Checklist
- [x] Tests added or updated, and passing
- [x] Descriptions and docs updated
- [x] Downstream owners told (when impact is not "None")
"""
problems = doclint.lint("pr", doc)
impact = doclint.find(doclint.sections(doc), "impact")
assert problems == [] and "3.1%" in impact
print("PASS; title length:", len(doc.splitlines()[0]) - 2)
```

Output:

```text
PASS; title length: 66
```

**Why:** a reviewer sees the reason, how it was tested, and that a visible number moves, before reading the diff; the owners heard it from you, not from the dashboard. The figures in this description are part of the exercise scenario (not measured here); in your PR they come from your own run. **Common wrong answer:** “Impact: none, it’s a bug fix”: bug fixes that move a number are exactly the ones that need an impact note. **Interviewer follow-up:** “Should old months be restated?” → That is a decision for the metric owner; offer restating with a note, or freezing history, and record it in an ADR.

<a id="solution-8"></a>
### Solution 8 · Add a bus-matrix row from an interview

```python
import bus_matrix
from pathlib import Path

new_rows = """Gift card redemptions,fct_gift_card_redemption,one row per gift card per order,who,Customer
Gift card redemptions,fct_gift_card_redemption,one row per gift card per order,what,Gift card
Gift card redemptions,fct_gift_card_redemption,one row per gift card per order,when,Date
Gift card redemptions,fct_gift_card_redemption,one row per gift card per order,where,Channel
Gift card redemptions,fct_gift_card_redemption,one row per gift card per order,how many,amount_redeemed
"""
Path("beam_with_gift_cards.csv").write_text(
    Path("data/beam_events.csv").read_text(encoding="utf-8") + new_rows, encoding="utf-8")
con = bus_matrix.load("beam_with_gift_cards.csv")
assert bus_matrix.checks(con) == []
dims, procs, uses = bus_matrix.matrix(con)
print(dims[:4])
assert dims[:4] == [("Customer", 6), ("Date", 6), ("Channel", 4), ("Agent version", 3)]
```

Output:

```text
[('Customer', 6), ('Date', 6), ('Channel', 4), ('Agent version', 3)]
```

**Why:** the new process uses Customer, Date and Channel, so those become even more important to conform; Gift card is a new dimension used once. The grain “one row per gift card per order” handles two cards on one order and one card over several orders. **Common wrong answer:** adding `amount_redeemed` as a column of the orders fact: a different event with its own grain belongs in its own row. **Interviewer follow-up:** “Is a gift-card purchase the same process?” → No: buying is a sale (Orders), redeeming is a payment; two events, two rows.

<a id="solution-9"></a>
### Solution 9 · Make the README pass the 10-minute test

```python
import doclint

FENCE = "`" * 3        # a Markdown code fence, built here so this example stays readable
doc = f"""# leafy-repeat-customers

The 30-day repeat-customer rate for Leafy's marketing team, with its definition and acceptance checks.

## Quickstart
{FENCE}powershell
python -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install duckdb
python acceptance.py
{FENCE}

## Expected output
{FENCE}text
PASS January 2026 cohort: 6 new customers, 3 repeat, 50.0%
{FENCE}
(six PASS lines in total)

## Project layout
- `acceptance.py`: the acceptance criteria as checks
- `data/leafy_orders.csv`: 19-order fixture with planted edge cases
- `docs/`: intake, definition, design doc, ADR-0001

## Tests
`python acceptance.py` exits 0 when every check passes.

## Data sources and licences
Synthetic fixture written for this project; no customer data.

## Decisions
`docs/design-repeat-customers.md`; `docs/adr/0001-chicago-business-days.md`.

## Troubleshooting
- `No module named duckdb`: activate the virtual environment first.
"""
problems = doclint.lint("readme", doc)
assert problems == [], problems
print("PASS")
```

Output:

```text
PASS
```

**Why:** a stranger knows what it is in one sentence, runs four commands, sees the expected PASS line, and knows where the decisions are. The expected-output line is the real first line printed by `acceptance.py` in lesson 6. **Common wrong answer:** “Install the requirements and run the scripts in order”: no commands, no order, no output. **Interviewer follow-up:** “It needs warehouse credentials.” → Say which variable, how to get access, and ship a fixture so the quickstart runs without them.

<a id="solution-10"></a>
### Solution 10 · Write the ADR for a de-duplication decision

```python
import doclint

doc = """# ADR-0005: De-duplicate Plant Doctor events once, in staging, on event_id

## Status
Accepted · 2026-03-13

## Context
Three marts de-duplicated agent events in three ways; the conversation mart used (session_id, event_ts) and counted retried events twice (3.1% in February). The client SDK has sent a unique event_id since agent version 1.2.

## Decision
We will de-duplicate agent events once, in `stg_agent_events`, keeping the first row per `event_id`; marts must read only from staging.

## Consequences
- Easier: one rule, one test, the same counts in every mart; marts get simpler.
- Harder: events from agent versions before 1.2 have no event_id and are kept as they are, with a flag; staging becomes a dependency every agent mart must wait for.
"""
problems = doclint.lint("adr", doc)
assert problems == [], problems
print("PASS")
```

Output:

```text
PASS
```

**Why:** the context gives the facts that force a decision now; the decision is one sentence; the consequences admit two real costs (old versions without IDs, a new dependency). **Common wrong answer:** a “Consequences: better data quality” line only: it gives a future reader nothing to work with. **Interviewer follow-up:** “Next year ingestion de-duplicates at the source.” → Write ADR-0009, mark 0005 *Superseded by ADR-0009*; never edit 0005.

<a id="solution-11"></a>
### Solution 11 · Take-home: the Fuel Smart intake and bus matrix

```python
import doclint, bus_matrix
from pathlib import Path

intake = Path("solutions/intake-fuel-smart-v1.md").read_text(encoding="utf-8")
assert doclint.lint("intake", intake) == []

con = bus_matrix.load("solutions/beam-fuel-smart.csv")
assert bus_matrix.checks(con) == []
dims, procs, uses = bus_matrix.matrix(con)
shared = sorted(d for d, n in dims if n >= 2)
assert {"Recipe", "Date"} <= set(shared)
print("conformed:", shared)
for p, fact, grain, measures in procs:
    print(f"{fact}: {grain}")
```

Output:

```text
conformed: ['Date', 'Food', 'Recipe']
fct_recipe_ingredient: one row per recipe ingredient line
fct_food_nutrient: one row per food per nutrient per USDA release
fct_review: one row per review
```

**Why:** three events (an ingredient line is matched, a food has nutrients in a release, a reviewer rates a recipe) give three fact tables; Recipe, Food and Date link them. Notice that the brief’s `mart_recipe_nutrition` is not an event: it is a summary built from them. **Common wrong answer:** listing `dim_recipe` as a process; recipes are things, not events (unless you model “recipe published”). **Interviewer follow-up:** “Add Open Food Facts later.” → A new event (“a product’s nutriments are published in a daily delta”) with Food conformed by barcode mapping; one new bus-matrix row.
