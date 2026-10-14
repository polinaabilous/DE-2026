# Unit economics and operations metrics: LTV, CAC, payback, MTTR and SLAs

*Companion to `unit-economics-ops.html`: same lessons, same numbering, same queries and results. Hints and solutions are in Appendices A and B.*

**Tested engine and dialect:** DuckDB 1.5.6 (Python package) on CPython 3.12.10, pytest 9.1.1 (lab tests only), Windows 11 (64-bit). SQL is DuckDB’s PostgreSQL-flavoured dialect; notes for SQL Server (T-SQL) and Spark SQL are reference only and were not executed. Every DuckDB query and Python block in this document ran while it was built, and the result under it is the real result. The data is synthetic and deterministic: `make_data.py` in the lab folder rebuilds exactly the same database on any machine, offline.

**What kind of deck this is:** a short gap deck. *Business models and metrics: commerce, SaaS, marketplace, product, operations* already teaches MRR, the MRR bridge, churn, GRR, NRR, marketplace and product metrics, on-time delivery, percentiles, and ticket backlog; *Metric design: define the number before writing SQL* teaches spec cards, ratio of sums, and maturity. This deck teaches only what those two leave out: unit economics (contribution margin, CAC, LTV, LTV/CAC, payback) and operations reliability and flow metrics (MTTR, MTBF, availability, SLA attainment, throughput). New terms are defined on first use and collected in the glossary. Most lessons end with an **On the job** note.

**Interview focus:** the interview questions and exercises are based on common analytics-engineering, data-analyst, case-interview, and operations-analytics interview patterns (research done in October 2026: LTV and CAC definitions, LTV/CAC judgement, payback, cohort LTV with maturity, MTTR/MTBF/SLA SQL over incident tables, SLOs and error budgets, throughput). All questions are original and use the Leafy Box data.

**Lab:** `unit-economics-ops-lab/` (next to this file) has the generator, a starter `scorecard.py`, a reference solution, and pytest tests.

**Additions beyond the original brief** are marked *(added)*: a horizon-capped, discounted LTV next to the textbook formula; the full incident clock (MTTD, MTTA, the four meanings of MTTR) and incidents as an accumulating snapshot; SLI, SLO, SLA, and error budgets; Little’s law to sanity-check throughput, work in progress, and cycle time; censoring: open incidents, zero-failure assets, and immature cohorts; a Fuel Smart note: pipeline MTTR and a data-freshness SLA for your portfolio.

## Contents

1. [Unit economics and operations metrics: LTV, CAC, payback, MTTR and SLAs](#slide-1)
   - [Why this matters · Why this matters on the job](#why-1)
   - [Why this matters · When to reach for it, and when not to](#why-2)
2. [Set up, versions, and what this deck adds](#slide-2)
3. [The running example: Leafy Box](#slide-3)
4. [Contribution margin: what one box really earns](#slide-4)
5. [CAC: what it costs to win one customer](#slide-5)
6. [Formula LTV: the quick estimate and its assumptions](#slide-6)
7. [Cohort LTV: what customers actually earned](#slide-7)
8. [LTV/CAC and CAC payback: is a channel worth it?](#slide-8)
9. [The incident clock: MTTD, MTTA, and the four meanings of MTTR](#slide-9)
10. [MTBF and availability: how often it breaks, how much it is up](#slide-10)
11. [SLA attainment, SLOs, and error budgets](#slide-11)
12. [Throughput, productivity, and Little’s law](#slide-12)
13. [Map your data-centre operations metrics](#slide-13)
14. [Lab: a channel scorecard and an ops scorecard](#slide-14)
15. [Bug clinic: believable unit-economics and ops-metric bugs](#slide-15)
16. [Interview questions and model answers](#slide-16)
17. [Exercises 1–6 · unit economics and MTTR](#slide-17)
18. [Exercises 7–11 · SLAs, availability, MTBF, flow, and DC Ops](#slide-18)
19. [Cheat sheet and glossary](#slide-19)
20. [Recap and references](#slide-20)
21. [Appendix A · Hints](#appendix-a)
22. [Appendix B · Solutions](#appendix-b)

---

<a id="slide-1"></a>
## 1. Unit economics and operations metrics: LTV, CAC, payback, MTTR and SLAs

The *Business models and metrics* deck taught the headline numbers: MRR, churn, GRR, NRR, on-time delivery, percentiles, and backlog. This short deck fills two gaps it left open. **Unit economics** asks whether one customer earns back what it cost to win them. **Operations metrics** ask how often things break, how fast they are fixed, and whether promises (SLAs) are kept.

- **Start here:** setup, and the Leafy Box dataset: subscribers, billing, marketing spend, incidents, and warehouse jobs.
- **Part A, unit economics:** contribution margin, CAC (blended and paid), formula LTV, cohort LTV, LTV/CAC, and CAC payback by channel.
- **Part B, operations:** the incident clock and MTTR, MTBF and availability, SLA attainment and error budgets, throughput and Little’s law, and mapping data-centre operations metrics.
- **Practice:** a lab that builds a channel scorecard and an ops scorecard with tests, a bug clinic, interview questions with model answers, and 11 exercises.

Every query ran in DuckDB while this deck was built; the result under each query is the real result.

---

<a id="why-1"></a>
## Why this matters · Why this matters on the job

*Why this matters · the need behind the topic*

Growth costs money and operations make promises. Marketing asks for more budget for the channel with the most signups; operations reports that the warehouse “usually” fixes breakdowns quickly. Neither claim means anything until someone turns billing rows, ad spend, and ticket timestamps into a few well-defined numbers: **what one customer contributes after variable costs, what it cost to win them, how long until that cost is earned back, how often assets fail, how fast they recover, and how often promises are kept**. Analytics engineers build exactly these numbers, and the hard part is never the arithmetic. It is the definition: margin or revenue, which costs count, which customers are mature, which clock starts and stops, and what to do with tickets that are still open.

#### Where you will use it

- A channel scorecard for marketing: CAC, LTV, LTV/CAC, and payback per channel.
- Finance reviews of contribution margin per order, box, or subscriber.
- Investor and board packs (LTV/CAC and payback are standard slides).
- Operations reviews: MTTR, MTBF, availability, SLA attainment, throughput per site or team.
- Your own data platform: pipeline MTTR and data-freshness SLAs.

#### What goes wrong without it

- A channel with cheap signups and high churn gets more budget and loses money.
- LTV computed on revenue, not margin, makes every channel look profitable.
- Young cohorts make a good channel look like it never pays back, or the reverse.
- MTTR excludes the incidents still open, so the worst ones vanish from the average.
- An SLA report quietly drops breached tickets that are still open, and reports 100 %.

#### Who expects you to know it

- Analytics engineers: own the models and definitions behind these scorecards.
- Data and BI analysts: present them to marketing, finance, and operations.
- Data engineers: are measured by them (pipeline MTTR, freshness SLAs).
- Interviewers: “compute LTV/CAC by channel” and “compute MTTR and SLA compliance” are common SQL and case questions.

> **On the job:** Your first month on a growth-analytics team: the CMO wants to move budget from influencers to paid social “because it’s cheaper per signup”. A strong analytics engineer answers in a day with a one-page channel scorecard: CAC, contribution margin per box, cohort LTV at 6 months, LTV/CAC, and payback, with a note on which cohorts are too young to judge. The same week, the operations lead asks why the warehouse dashboard says 99 % SLA when the floor feels chaotic; you find the open breached tickets that the old query ignored.

> **The main idea:** unit economics and ops metrics are where data work meets money and promises; the people who define them carefully are the people whose numbers move budgets.

*Read more:* [a16z: 16 startup metrics (LTV, CAC, payback)](https://a16z.com/16-startup-metrics/), [Atlassian: common incident management metrics](https://www.atlassian.com/incident-management/kpis/common-metrics), [Google SRE book: service level objectives](https://sre.google/sre-book/service-level-objectives/).

---

<a id="why-2"></a>
## Why this matters · When to reach for it, and when not to

*Why this matters · choosing the right tool*

| Situation | Reach for | Why |
|---|---|---|
| Deciding where to spend acquisition budget | CAC by channel + cohort LTV + payback (lessons 5, 7, 8) | Cheap signups that churn fast can be the most expensive customers. |
| Judging if each sale or box makes money | Contribution margin (lesson 4) | Revenue hides variable costs; margin is what pays back CAC. |
| A quick estimate for a new product or a board slide | Formula LTV, clearly labelled (lesson 6) | Fast, but assumes constant churn and margin; state the assumptions. |
| Comparing channels with real history | Cohort LTV on mature cohorts (lesson 7) | Uses what customers actually did, not an assumption. |
| Reporting reliability of assets or services | MTTR, MTBF, availability (lessons 9, 10) | Separates “breaks often” from “takes long to fix”. |
| Checking promises to customers or internal teams | SLA attainment, SLOs and error budgets (lesson 11) | A target without an attainment rate is only a hope. |
| Capacity and productivity of a process | Throughput per day and per labour hour (lesson 12) | Busy is not the same as productive. |
| Revenue recognition, accounting profit, fixed-cost allocation | Not these metrics: use Finance’s P&L | Unit economics are decision metrics, not audited accounts. |

#### How interviews test it

- “How would you calculate LTV? Which version would you trust?” (formula vs cohort, margin not revenue).
- “Write SQL for CAC by channel; what goes in the numerator?” (blended vs paid, attribution).
- “Our LTV/CAC is 5. Good?” (payback, maturity, under-investing).
- “Compute MTTR and SLA compliance from this incidents table” (which clock, open tickets, median).
- “What is the difference between SLA, SLO, and SLI?” (error budgets).

#### Where it sits in your learning path

- Builds on *Business models and metrics* (MRR, churn, cohorts, percentiles) and *Metric design* (spec cards, ratio of sums, maturity).
- Uses window functions and date spines from the SQL decks, and grain and accumulating snapshots from dimensional modelling.
- Feeds the dbt and semantic-layer work later in the course: every metric here becomes a tested model.

> **The main idea:** reach for unit economics when money is allocated, and for ops metrics when promises are made; always pair a rate with its population and its maturity.

---

<a id="slide-2"></a>
## 2. Set up, versions, and what this deck adds

*Start here · one engine, one small database, two gaps to fill*

| Item | Detail |
|---|---|
| Tested engine | **DuckDB 1.5.6** (Python package) on **CPython 3.12.10**, Windows 11 (64-bit). The lab’s tests use pytest. Nothing else: no server, no cloud account, no internet at build time. |
| Dialect | DuckDB’s PostgreSQL-flavoured SQL. Interval arithmetic and `date_diff` differ in SQL Server and Spark; notes are on the slides where it matters. That other-dialect syntax is reference only and was not executed. |
| Minimum versions | DuckDB 1.1 or newer (every query uses only `FILTER`, window functions, `generate_series`, and interval arithmetic). Python 3.10 or newer for the lab. |
| How results were produced | The build runs every query and prints the real result. A query that fails, returns an unexpected result, or returns several rows without `ORDER BY` is a build failure. This deck built with **0 failures**. |

#### Create the environment

```text
# Windows (PowerShell); on macOS/Linux: source .venv/bin/activate
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install duckdb pytest
cd unit-economics-ops-lab
python make_data.py      # builds leafy_box.duckdb (next slide)
```

#### Check it

```python
import sys, duckdb
print("Python", sys.version.split()[0], "· DuckDB", duckdb.__version__)
print(duckdb.sql("""
    SELECT date_diff('month', DATE '2025-01-31', DATE '2025-02-01') AS month_boundaries,
           TIMESTAMP '2026-02-01 02:00' - TIMESTAMP '2026-01-31 23:20' AS elapsed
""").fetchall())
```

Output:

```text
Python 3.12.10 · DuckDB 1.5.6
[(1, datetime.timedelta(seconds=9600))]
```

Two facts used all through the deck. `date_diff('month', a, b)` counts *month boundaries crossed*, not 30-day blocks: 31 January to 1 February is one month. Subtracting timestamps gives an **interval**, a duration such as 2 h 40 min.

#### Already taught: recap in one line each

- *Business models and metrics*: commerce net sales and AOV; SaaS MRR, MRR bridge, logo churn, GRR, NRR; marketplace GMV and take rate; product DAU/MAU, funnels, cohorts; operations on-time delivery, percentiles, and ticket backlog.
- *Metric design*: metric spec cards, population and grain, ratio of sums, maturity and observation limits, north star and guardrails.
- This deck reuses those ideas (spec cards, ratio of sums, maturity) without re-teaching them.

#### New here: the two gaps

- **Unit economics:** contribution margin, CAC, LTV (formula and cohort), LTV/CAC, CAC payback, by acquisition channel.
- **Operations reliability and flow:** MTTR and its relatives, MTBF and availability, SLA attainment and error budgets, throughput.
- A mapping of these to data-centre operations work, and a lab that ties both halves into scorecards.

> **On the job:** In a real team these numbers live in a warehouse (Fabric, Snowflake, Databricks, BigQuery) and are read by finance, marketing, and operations dashboards. DuckDB is the local scratchpad where you prototype a definition on a sample and pin its edge cases with tests before you port it.

> **The main idea:** one local engine, one deterministic database, every result executed; this deck adds unit economics and operations reliability on top of the two earlier metrics decks.

*Read more:* [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [DuckDB: interval functions](https://duckdb.org/docs/stable/sql/functions/interval).

---

<a id="slide-3"></a>
## 3. The running example: Leafy Box

*Start here · a subscription box with a warehouse behind it*

Leafy, the plant shop of this course, launched **Leafy Box** in January 2025: a monthly plant-care box, `small` at $25 or `large` at $40, with the *first box at 50 % off*. Subscribers arrive through five **acquisition channels** (the route by which a customer first came): `paid_search`, `paid_social`, `influencer`, `referral` (a $15 credit per referred friend), and `organic` (no paid touch). A small warehouse packs the boxes, and a web checkout takes the orders. The generator `make_data.py` (in the lab folder: [unit-economics-ops-lab/make_data.py](unit-economics-ops-lab/make_data.py)) writes the same rows on every machine. Data is complete up to the end of **31 March 2026** (UTC).

Output:

```text
$ python make_data.py
customers         1,363 rows
billing           7,400 rows
marketing_spend      72 rows
assets                6 rows
incidents            56 rows
sla_targets           3 rows
box_jobs            838 rows
shifts               26 rows
```

#### Tables and their grain

```sql
SELECT 'customers' AS table_name, 'one row per subscriber' AS grain, COUNT(*) AS row_count FROM customers
UNION ALL SELECT 'billing',         'one row per payment attempt',            COUNT(*) FROM billing
UNION ALL SELECT 'marketing_spend', 'one row per channel per month',          COUNT(*) FROM marketing_spend
UNION ALL SELECT 'assets',          'one row per asset or service',           COUNT(*) FROM assets
UNION ALL SELECT 'incidents',       'one row per incident ticket',            COUNT(*) FROM incidents
UNION ALL SELECT 'sla_targets',     'one row per severity',                   COUNT(*) FROM sla_targets
UNION ALL SELECT 'box_jobs',        'one row per box released (March 2026)',  COUNT(*) FROM box_jobs
UNION ALL SELECT 'shifts',          'one row per warehouse working day',      COUNT(*) FROM shifts
ORDER BY row_count DESC;
```

Result (8 rows):

| table_name | grain | row_count |
|---|---|---|
| billing | one row per payment attempt | 7400 |
| customers | one row per subscriber | 1363 |
| box_jobs | one row per box released (March 2026) | 838 |
| marketing_spend | one row per channel per month | 72 |
| incidents | one row per incident ticket | 56 |
| shifts | one row per warehouse working day | 26 |
| assets | one row per asset or service | 6 |
| sla_targets | one row per severity | 3 |

#### Facts you need from day one

- `billing` has one row per *payment attempt*: failed card attempts are rows with `status = 'failed'` and a revenue figure that was never collected.
- Per paid box: `revenue` (after the first-box discount), `refund`, `product_cost`, `shipping_cost`, `payment_fee`, all in USD.
- `marketing_spend` is by spend month and channel. `brand_podcast` is brand spend that no channel can claim; organic has no spend.
- `incidents` has five timestamps (started, detected, acknowledged, mitigated, resolved); `merged_into` marks a duplicate ticket.
- The warehouse works Monday to Saturday; Sundays are closed.

| Trap planted in the data | Where | Lesson |
|---|---|---|
| Failed payment attempts that look like revenue | `billing.status` | 4 |
| QA test subscribers | `customers.is_test` | 4, 5 |
| First box sold below cost (50 % off) | `billing.discount` | 4, 8 |
| A paid month with zero signups; brand spend with no channel | `marketing_spend` | 5 |
| Young cohorts that have not had time to pay back | `customers.signup_date` | 7, 8 |
| A duplicate incident ticket, merged into the original | `incidents.merged_into` | 9 |
| Two incidents still open at the end of the quarter | `incidents.resolved_at IS NULL` | 9, 10, 11 |
| An outlier: a conveyor waiting 30 hours for a spare part | `incidents` | 9 |
| An asset with zero incidents | `assets` | 10 |
| An outage across the January/February boundary | `web_checkout` | 11 |
| Closed Sundays and a slow day after a line failure | `box_jobs`, `shifts` | 12 |

> **On the job:** Unit-economics and ops data always come from several systems: a billing provider (Stripe, Zuora), an ad platform export, a ticketing tool (ServiceNow, Jira), and a warehouse or facilities system. Learning each source’s grain and quirks is the first job before any metric is trusted.

> **The main idea:** one deterministic dataset covers both halves of the deck, with the classic traps planted: failed payments, test accounts, unattributed spend, young cohorts, duplicate and open tickets, and zero-failure assets.

*Read more:* [DuckDB: CSV import](https://duckdb.org/docs/stable/data/csv/overview), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="slide-4"></a>
## 4. Contribution margin: what one box really earns

*Part A · unit economics · revenue is not what pays back marketing*

**Unit economics** means measuring revenue and cost *per unit* (one order, one box, one subscriber-month) instead of in company totals, to see whether each unit makes or loses money. The key per-unit number is **contribution margin** (CM): revenue minus refunds minus the **variable costs** of that unit, the costs that grow with every extra unit (the plants, shipping, payment fees). **Fixed costs** such as warehouse rent and salaries do not change with one more box and are left out. **CM %** is contribution ÷ net revenue.

#### Margin levels you will hear

| Name | Revenue minus… |
|---|---|
| **Gross margin** | cost of goods sold (the plants and pot) |
| **CM1 / CM2** (e-commerce) | CM1 = after goods; CM2 = also after shipping, packing, payment fees |
| **CM3** | also after marketing; close to CM2 − CAC |
| Operating profit | also after fixed costs (Finance’s P&L, not this deck) |

Names vary by company; the spec card must list which costs are subtracted. This deck’s contribution is CM2 per paid box.

#### Coming from C#

Think of contribution as a pure function of one unit: `Contribution(Box b) => b.Revenue - b.Refund - b.VariableCost`. Fixed costs are like static overhead outside the method: real, but not part of the per-call cost.

*SQL · the clean base view (one row per paid box)*

```sql
CREATE OR REPLACE VIEW box_margin AS
SELECT b.customer_id, c.channel, b.plan,
       date_trunc('month', c.signup_date)::DATE                              AS cohort_month,
       b.bill_month,
       date_diff('month', date_trunc('month', c.signup_date), b.bill_month)  AS month_index,
       b.list_price,
       b.revenue - b.refund                                                  AS net_revenue,
       b.product_cost + b.shipping_cost + b.payment_fee                      AS variable_cost,
       b.revenue - b.refund - b.product_cost - b.shipping_cost - b.payment_fee AS contribution
FROM billing b
JOIN customers c USING (customer_id)
WHERE b.status = 'paid'          -- a failed card attempt is not revenue
  AND NOT c.is_test;             -- QA subscribers are not customers
```

Every Part A query reads this view. It handles three traps once: failed payment attempts, test subscribers, and refunds. `month_index` is 0 for the first box, 1 for the second, and so on.

```sql
SELECT CASE WHEN month_index = 0 THEN 'first box (50 % off)' ELSE 'later boxes' END AS box,
       plan,
       COUNT(*)                                      AS boxes,
       ROUND(AVG(net_revenue), 2)                    AS avg_net_revenue,
       ROUND(AVG(variable_cost), 2)                  AS avg_variable_cost,
       ROUND(AVG(contribution), 2)                   AS avg_contribution,
       ROUND(SUM(contribution) / SUM(net_revenue), 3) AS cm_pct
FROM box_margin
GROUP BY ALL
ORDER BY box, plan;
```

Result (4 rows):

| box | plan | boxes | avg_net_revenue | avg_variable_cost | avg_contribution | cm_pct |
|---|---|---|---|---|---|---|
| first box (50 % off) | large | 484 | 19.67 | 23.88 | -4.21 | -0.214 |
| first box (50 % off) | small | 873 | 12.29 | 16.16 | -3.87 | -0.315 |
| later boxes | large | 2545 | 38.98 | 24.46 | 14.52 | 0.372 |
| later boxes | small | 3170 | 24.52 | 16.53 | 7.99 | 0.326 |

The first box sells at half price, so it **loses** about $4 whichever plan it is: Leafy pays to start every subscription, on top of the marketing cost. Later boxes earn about 33–37 % CM. That is why a subscriber who cancels after one box is a loss even before counting what it cost to acquire them.

#### ✗ Believable, but wrong: revenue from every billing row

*SQL · “March revenue”*

```sql
SELECT SUM(revenue) AS march_revenue
FROM billing
WHERE bill_month = DATE '2026-03-01';
```

Result (1 row):

| march_revenue |
|---|
| 25925.00 |

#### ✓ Fixed: net revenue and contribution of paid, real boxes

*SQL · from the clean base*

```sql
SELECT SUM(net_revenue)  AS march_net_revenue,
       SUM(contribution) AS march_contribution
FROM box_margin
WHERE bill_month = DATE '2026-03-01';
```

Result (1 row):

| march_net_revenue | march_contribution |
|---|---|
| 24230.00 | 7483.76 |

The left query adds failed card attempts, test subscribers, and refunded boxes. **Revenue** answers “what did we bill?”; **contribution** answers “what is left to pay for marketing and fixed costs?”. Unit economics always uses contribution.

> **On the job:** A finance partner will ask exactly which costs are in your CM. Write them in the model’s description (dbt YAML) and keep each cost as its own column, so CM1, CM2, and CM3 can all be derived and reconciled with the P&L at month end.

> **The main idea:** contribution margin is revenue minus refunds minus variable costs per unit; it, not revenue, is the money that pays back acquisition and fixed costs.

*Read more:* [Contribution margin](https://en.wikipedia.org/wiki/Contribution_margin), [DuckDB: CREATE VIEW](https://duckdb.org/docs/stable/sql/statements/create_view), [DuckDB: aggregate functions](https://duckdb.org/docs/stable/sql/functions/aggregates).

---

<a id="slide-5"></a>
## 5. CAC: what it costs to win one customer

*Part A · unit economics · blended, paid, and per channel*

**Customer acquisition cost** (CAC) is acquisition spend divided by the new customers it won, for the same channel and period. The numerator and the denominator must describe the same thing:

- **Paid CAC** (or channel CAC): spend of paid channels ÷ customers attributed to those channels.
- **Blended CAC**: *all* acquisition spend, including brand spend nobody can attribute, ÷ *all* new customers, including organic ones. It is lower than paid CAC because free customers sit in the denominator.
- **Fully loaded CAC** also adds the people and tools behind acquisition (marketing salaries, agency fees, software). Leafy’s data has media spend only, so every CAC here is “media CAC”; say so on the card.
- **Attribution** is the rule that assigns a customer to one channel (here: the first touch, stored in `customers.channel`). Change the rule and every channel’s CAC changes.

```sql
CREATE OR REPLACE VIEW channel_cac AS
WITH spend AS (
    SELECT channel, SUM(spend) AS spend FROM marketing_spend GROUP BY channel
), new_customers AS (
    SELECT channel, COUNT(*) AS new_customers FROM customers WHERE NOT is_test GROUP BY channel
)
SELECT COALESCE(n.channel, s.channel)                 AS channel,
       COALESCE(s.spend, 0)                           AS spend,
       COALESCE(n.new_customers, 0)                   AS new_customers,
       ROUND(s.spend / NULLIF(n.new_customers, 0), 2) AS cac
FROM new_customers n
FULL JOIN spend s USING (channel);

SELECT * FROM channel_cac ORDER BY cac NULLS LAST, channel;
```

Result (6 rows):

| channel | spend | new_customers | cac |
|---|---|---|---|
| referral | 3360.00 | 224 | 15 |
| paid_social | 13173.58 | 329 | 40.04 |
| paid_search | 20674.33 | 331 | 62.46 |
| influencer | 9685.94 | 105 | 92.25 |
| brand_podcast | 13500.00 | 0 | NULL |
| organic | 0.00 | 368 | NULL |

#### Paid vs blended

```sql
SELECT ROUND(SUM(spend) FILTER (WHERE channel NOT IN ('organic', 'brand_podcast'))
             / SUM(new_customers) FILTER (WHERE channel NOT IN ('organic', 'brand_podcast')), 2) AS paid_cac,
       ROUND(SUM(spend) / SUM(new_customers), 2)                                         AS blended_cac
FROM channel_cac;
```

Result (1 row):

| paid_cac | blended_cac |
|---|---|
| 47.42 | 44.51 |

Report both, and label them. Blended CAC is right for “what does growth cost the company?”; paid CAC by channel is right for “where should the next dollar go?”.

#### A month with spend and no customers

```sql
SELECT s.spend_month, s.spend,
       COUNT(c.customer_id)                           AS new_customers,
       ROUND(s.spend / NULLIF(COUNT(c.customer_id), 0), 2) AS cac
FROM marketing_spend s
LEFT JOIN customers c
  ON c.channel = s.channel AND NOT c.is_test
 AND date_trunc('month', c.signup_date) = s.spend_month
WHERE s.channel = 'influencer'
  AND s.spend_month BETWEEN DATE '2025-07-01' AND DATE '2025-09-01'
GROUP BY s.spend_month, s.spend
ORDER BY s.spend_month;
```

Result (3 rows):

| spend_month | spend | new_customers | cac |
|---|---|---|---|
| 2025-07-01 | 496.78 | 7 | 70.97 |
| 2025-08-01 | 1500.00 | 0 | NULL |
| 2025-09-01 | 722.46 | 9 | 80.27 |

The August influencer campaign brought no one, so its monthly CAC is undefined: `NULLIF` returns NULL instead of a divide-by-zero error or a fake $0. Monthly channel CAC is noisy for small channels and for spend that converts a month later; prefer a quarter or the whole period, as the main query does.

> **On the job:** Marketing owns spend data, product owns signups, and they rarely agree on attribution. Analytics engineers usually build one `fct_acquisition` model with the agreed attribution rule and a `channel_cac` mart on top, and put “media CAC, first-touch attribution” in the column description.

> **The main idea:** CAC = spend ÷ new customers for the same channel and period; say whether it is paid, blended, or fully loaded, and which attribution rule assigned the customers.

*Read more:* [Customer acquisition cost](https://en.wikipedia.org/wiki/Customer_acquisition_cost), [a16z: 16 startup metrics (LTV, CAC, payback)](https://a16z.com/16-startup-metrics/), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter).

---

<a id="slide-6"></a>
## 6. Formula LTV: the quick estimate and its assumptions

*Part A · unit economics · ARPA × CM % ÷ churn*

**Customer lifetime value** (LTV, also CLV) is the total contribution a customer is expected to bring over their whole relationship with the company. Use contribution, not revenue: a revenue LTV compared with CAC overstates every channel. The textbook **formula LTV** for a subscription is

> **LTV = ARPA × CM % ÷ monthly churn**

- **ARPA** (average revenue per account) is MRR ÷ active subscribers; MRR itself is taught in *Business models and metrics*.
- **Monthly churn** is the share of subscribers paying this month who do not pay next month (logo churn, same deck). If churn is constant, the expected lifetime is **1 ÷ churn** months: 5 % churn means 20 months.
- The formula assumes churn, price, and margin stay constant forever. It is a quick, explainable estimate, not a measurement.

```sql
CREATE OR REPLACE VIEW formula_inputs AS
WITH months AS (
    SELECT channel, bill_month, month_index, list_price, net_revenue, contribution,
           LEAD(bill_month) OVER (PARTITION BY customer_id ORDER BY bill_month) AS next_bill_month
    FROM box_margin
)
SELECT channel,
       -- ARPA: average MRR per active subscriber in March 2026 (MRR uses list price, no one-off discounts)
       AVG(list_price) FILTER (WHERE bill_month = DATE '2026-03-01')                     AS arpa,
       -- CM % of recurring boxes (not the discounted first box), last 6 complete months
       SUM(contribution) FILTER (WHERE month_index > 0 AND bill_month >= DATE '2025-10-01')
         / SUM(net_revenue) FILTER (WHERE month_index > 0 AND bill_month >= DATE '2025-10-01') AS cm_pct,
       -- monthly logo churn: paid this month, no paid box next month (Sep 2025 to Feb 2026)
       AVG(CASE WHEN next_bill_month = bill_month + INTERVAL 1 MONTH THEN 0 ELSE 1 END)
         FILTER (WHERE bill_month BETWEEN DATE '2025-09-01' AND DATE '2026-02-01')           AS monthly_churn
FROM months
GROUP BY channel;

SELECT channel, ROUND(arpa, 2) AS arpa, ROUND(cm_pct, 3) AS cm_pct, ROUND(monthly_churn, 4) AS churn,
       ROUND(1 / monthly_churn, 1)                AS expected_life_months,
       ROUND(arpa * cm_pct / monthly_churn, 2)    AS formula_ltv
FROM formula_inputs
ORDER BY formula_ltv DESC;
```

Result (5 rows):

| channel | arpa | cm_pct | churn | expected_life_months | formula_ltv |
|---|---|---|---|---|---|
| referral | 32.67 | 0.356 | 0.0467 | 21.4 | 249.38 |
| organic | 32.44 | 0.354 | 0.0697 | 14.3 | 164.63 |
| paid_search | 31.77 | 0.35 | 0.0828 | 12.1 | 134.43 |
| influencer | 31.74 | 0.341 | 0.0938 | 10.7 | 115.18 |
| paid_social | 30.43 | 0.346 | 0.1391 | 7.2 | 75.75 |

Referral subscribers churn least, so their formula LTV is highest; paid social subscribers churn about three times faster. Notice how sensitive the result is: churn sits in the denominator, so halving churn doubles LTV, and a channel with very low churn gets an LTV of many years that nobody has observed yet.

#### Two honest adjustments *(added)*

Cap the horizon (most companies use 24–60 months) and **discount** future months, because $1 next year is worth less than $1 today. The capped, discounted LTV is a finite sum:

> LTVH = ARPA × CM % × Σt=0..H−1 ((1 − churn) ÷ (1 + d))t

where *d* is the monthly discount rate.

#### The same inputs, three answers

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

rows = con.execute("SELECT channel, arpa, cm_pct, monthly_churn FROM formula_inputs ORDER BY channel").fetchall()

def ltv(arpa, cm_pct, churn, months=None, annual_discount=0.0):
    """Expected contribution of one subscriber. months=None is the textbook infinite sum."""
    m = float(arpa) * float(cm_pct)                    # monthly contribution while subscribed
    if months is None and annual_discount == 0:
        return m / float(churn)
    d = (1 + annual_discount) ** (1 / 12) - 1          # monthly discount rate
    keep = (1 - float(churn)) / (1 + d)                # survive one month, worth a bit less
    return m * sum(keep ** t for t in range(months))

print(f"{'channel':12} {'textbook':>9} {'36 m cap':>9} {'36 m, 10 %/yr':>14}")
for ch, arpa, cm, churn in rows:
    print(f"{ch:12} {ltv(arpa, cm, churn):9.2f} {ltv(arpa, cm, churn, 36):9.2f} "
          f"{ltv(arpa, cm, churn, 36, 0.10):14.2f}")
assert all(ltv(*r[1:], 36, 0.10) < ltv(*r[1:], 36) < ltv(*r[1:]) for r in rows)
```

Output:

```text
channel       textbook  36 m cap  36 m, 10 %/yr
influencer      115.18    111.86         104.69
organic         164.63    152.43         140.62
paid_search     134.43    128.43         119.45
paid_social      75.75     75.41          71.97
referral        249.38    204.75         185.82
```

The first-box loss from lesson 4 is not in the formula. Either add it to CAC (“cost to acquire includes the onboarding discount”) or subtract it from LTV; pick one and write it on the spec card. Lesson 8 treats it as part of the cohort’s contribution.

#### Dialect notes

| Engine | Syntax and behaviour |
|---|---|
| SQL Server / Fabric Warehouse | `LEAD(bill_month) OVER (...)` works the same; month arithmetic is `DATEADD(month, 1, bill_month)`; `FILTER` does not exist, so write `AVG(CASE WHEN ... THEN x END)`. |
| Spark SQL | `add_months(bill_month, 1)`; `FILTER (WHERE ...)` is supported on aggregates. |

*Other-engine syntax is for reference and was not executed; the DuckDB queries on this slide were.*

> **On the job:** Formula LTV is what goes on an early-stage board slide or into a quick “should we launch this channel?” estimate. Always print the three inputs next to it, because the person reading it will want to change churn by one point and see what happens.

> **The main idea:** formula LTV = ARPA × CM % ÷ churn is quick and explainable but assumes everything stays constant; cap the horizon, discount it, and show its inputs.

*Read more:* [Customer lifetime value](https://en.wikipedia.org/wiki/Customer_lifetime_value), [Stripe: subscription analytics](https://docs.stripe.com/billing/subscriptions/analytics), [Net present value (discounting)](https://en.wikipedia.org/wiki/Net_present_value), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-7"></a>
## 7. Cohort LTV: what customers actually earned

*Part A · unit economics · observed value, by months since acquisition*

**Cohort LTV** (historical or observed LTV) measures instead of assuming. Group customers into **acquisition cohorts** (here: channel and signup month), then for each month since acquisition *k* compute

> **LTVk = cumulative contribution of the cohort up to month k ÷ customers acquired in the cohort**

- **Denominator: everyone acquired**, including those who churned after one box. Dividing by customers still active is survivorship bias and inflates LTV (bug clinic).
- **Maturity:** only cohorts that have already reached month *k* count for LTVk. A cohort that joined in February 2026 has two boxes of history; it says nothing about 12-month value. (Maturity and observation limits are taught in *Metric design*.)
- Read LTVk as “value by month k”, e.g. 6-month LTV. It is a lower bound for lifetime value and grows with *k*.

*SQL · cumulative contribution per acquired customer, mature cohorts only*

```sql
CREATE OR REPLACE VIEW cohort_ltv AS
WITH acquired AS (                      -- the denominator: everyone acquired, churned or not
    SELECT channel, date_trunc('month', signup_date)::DATE AS cohort_month, COUNT(*) AS customers
    FROM customers WHERE NOT is_test
    GROUP BY ALL
), horizons AS (
    SELECT UNNEST(range(0, 15)) AS k    -- month_index 0 .. 14
), eligible AS (                        -- maturity: the cohort has been billed for month k already
    SELECT a.channel, a.cohort_month, a.customers, h.k
    FROM acquired a CROSS JOIN horizons h
    WHERE a.cohort_month + to_months(h.k::INTEGER) <= DATE '2026-03-01'
), cum AS (
    SELECT e.channel, e.k, e.cohort_month, e.customers,
           COALESCE(SUM(b.contribution), 0) AS cum_contribution
    FROM eligible e
    LEFT JOIN box_margin b
      ON b.channel = e.channel AND b.cohort_month = e.cohort_month AND b.month_index <= e.k
    GROUP BY ALL
)
SELECT channel, k AS month_index,
       COUNT(*)                                AS cohorts,
       SUM(customers)                          AS customers,
       SUM(cum_contribution) / SUM(customers)  AS ltv
FROM cum
GROUP BY channel, k;
```

```sql
SELECT channel,
       ROUND(MAX(ltv) FILTER (WHERE month_index = 0), 2)  AS ltv_1m,
       ROUND(MAX(ltv) FILTER (WHERE month_index = 2), 2)  AS ltv_3m,
       ROUND(MAX(ltv) FILTER (WHERE month_index = 5), 2)  AS ltv_6m,
       ROUND(MAX(ltv) FILTER (WHERE month_index = 11), 2) AS ltv_12m,
       MAX(cohorts) FILTER (WHERE month_index = 11)       AS cohorts_12m,
       MAX(customers) FILTER (WHERE month_index = 11)     AS customers_12m
FROM cohort_ltv
GROUP BY channel
ORDER BY ltv_12m DESC;
```

Result (5 rows):

| channel | ltv_1m | ltv_3m | ltv_6m | ltv_12m | cohorts_12m | customers_12m |
|---|---|---|---|---|---|---|
| referral | -4.22 | 15.95 | 45.59 | 99.48 | 4 | 45 |
| organic | -4.02 | 14.85 | 39.93 | 86.94 | 4 | 91 |
| influencer | -3.97 | 13.6 | 38.19 | 81.68 | 1 | 8 |
| paid_search | -3.78 | 14.73 | 38.74 | 76.85 | 4 | 66 |
| paid_social | -4.03 | 10.86 | 25.17 | 41.04 | 4 | 79 |

Every channel starts negative (the discounted first box), then climbs. Referral and organic subscribers keep paying; paid social flattens early because most of them leave. The last two columns are the honest small print: influencer started in April 2025, so its 12-month LTV rests on one cohort of a handful of subscribers. Report the count, or the number will be over-read.

#### Formula vs cohort LTV

|  | Formula LTV | Cohort LTV |
|---|---|---|
| Based on | Assumed constant churn and margin | What cohorts actually paid |
| Needs | A few months of data | Mature cohorts (months or years) |
| Horizon | Infinite unless capped | Exactly *k* months |
| Bias | Overstates when churn falls with tenure or prices drop | Understates lifetime (only k months); noisy for small cohorts |
| Use for | Quick estimate, new channels | Channel decisions, board numbers |

#### Coming from C#

The `eligible` step is a filter like `cohorts.Where(c => c.Month.AddMonths(k) <= lastComplete)` applied *before* aggregating; doing it after (averaging per-month values from different cohort sets) mixes populations.

The `LEFT JOIN` plus `COALESCE(…, 0)` keeps a cohort whose customers all left before month *k*: its contribution stops growing, but its customers stay in the denominator.

> **On the job:** Growth and finance teams read a cohort LTV table every month. Analytics engineers usually materialise it as a model with one row per channel, cohort, and month index (the grain), so dashboards can pivot it any way without re-implementing the maturity rule.

> **The main idea:** cohort LTV is cumulative contribution per acquired customer by month since acquisition, over mature cohorts only; always show how many cohorts and customers each number rests on.

*Read more:* [Customer lifetime value](https://en.wikipedia.org/wiki/Customer_lifetime_value), [Survivorship bias](https://en.wikipedia.org/wiki/Survivorship_bias), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-8"></a>
## 8. LTV/CAC and CAC payback: is a channel worth it?

*Part A · unit economics · two numbers, one decision*

Two ratios turn LTV and CAC into a decision:

- **LTV/CAC ratio**: lifetime contribution per customer ÷ CAC. Above 1 the customer pays back eventually; a common rule of thumb for subscription businesses is about **3 or more**. Far above 5 can mean the channel is under-funded.
- **CAC payback period**: months until a customer’s cumulative contribution covers CAC. The simple version is **CAC ÷ (ARPA × CM %)**, which ignores churn and the discounted first box. The **cohort payback** is the first month *k* at which cohort LTVk ≥ CAC; it includes churn, because churned customers stay in the denominator.
- Payback measures *cash risk and speed*; LTV/CAC measures *eventual return*. A channel can have a fine ratio and a payback too long to afford.

```sql
WITH paid_back AS (
    SELECT l.channel, MIN(l.month_index) + 1 AS payback_months   -- boxes billed until LTV_k >= CAC
    FROM cohort_ltv l JOIN channel_cac c USING (channel)
    WHERE l.ltv >= c.cac
    GROUP BY l.channel
)
SELECT c.channel, c.cac,
       ROUND(MAX(l.ltv) FILTER (WHERE l.month_index = 11), 2)                 AS ltv_12m,
       ROUND(MAX(l.ltv) FILTER (WHERE l.month_index = 11) / c.cac, 2)         AS ltv12_to_cac,
       ROUND(f.arpa * f.cm_pct / f.monthly_churn / c.cac, 2)                  AS formula_ltv_to_cac,
       ROUND(c.cac / (f.arpa * f.cm_pct), 1)                                  AS simple_payback_months,
       p.payback_months                                                       AS cohort_payback_months
FROM channel_cac c
JOIN cohort_ltv l USING (channel)
JOIN formula_inputs f USING (channel)
LEFT JOIN paid_back p USING (channel)
WHERE c.cac IS NOT NULL
GROUP BY c.channel, c.cac, f.arpa, f.cm_pct, f.monthly_churn, p.payback_months
ORDER BY ltv12_to_cac DESC;
```

Result (4 rows):

| channel | cac | ltv_12m | ltv12_to_cac | formula_ltv_to_cac | simple_payback_months | cohort_payback_months |
|---|---|---|---|---|---|---|
| referral | 15 | 99.48 | 6.63 | 16.63 | 1.3 | 3 |
| paid_search | 62.46 | 76.85 | 1.23 | 2.15 | 5.6 | 10 |
| paid_social | 40.04 | 41.04 | 1.02 | 1.89 | 3.8 | 11 |
| influencer | 92.25 | 81.68 | 0.89 | 1.25 | 8.5 | NULL |

#### Reading the scorecard

- **Referral** is cheap and loyal: the best ratio and the fastest payback. Grow it.
- **Paid social** has cheap signups, but they churn so fast that cohorts take much longer to pay back than the simple formula suggests. “Cheapest per signup” is not “cheapest per dollar returned”.
- **Influencer** has not paid back within the observed months (NULL = not yet), and its 12-month LTV rests on a single small cohort: keep testing, do not scale.
- The simple payback is optimistic for every channel because it ignores churn; compare it with the cohort column.

#### Rules of thumb, not laws

“LTV/CAC ≥ 3” and “payback under 12 months” come from venture-backed SaaS with 70–80 % gross margins. A physical box with about 35 % CM and monthly churn needs faster payback, because a customer who leaves at month 6 never repays a 9-month payback. Quote benchmarks only with their context; the decision comes from your own cohorts.

**CM3** per customer is LTV − CAC: what a customer leaves for fixed costs and profit.

> **On the job:** This is the table a marketing lead asks for before a budget meeting. The deliverable is a one-row-per-channel mart with CAC, LTV at fixed horizons, LTV/CAC, payback, and the cohort counts, plus a sentence on which channels are too young to judge. The lab builds exactly this.

> **The main idea:** LTV/CAC says whether a channel returns its cost eventually; cohort payback says how fast, including churn. Decide on both, and only with mature cohorts.

*Read more:* [a16z: 16 startup metrics (LTV, CAC, payback)](https://a16z.com/16-startup-metrics/), [Customer acquisition cost](https://en.wikipedia.org/wiki/Customer_acquisition_cost), [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions).

---

<a id="slide-9"></a>
## 9. The incident clock: MTTD, MTTA, and the four meanings of MTTR

*Part B · operations · which clock starts, which clock stops*

An **incident** is an unplanned interruption or degradation of a service or asset. Every incident has a timeline, and each operations metric is the average gap between two of its timestamps:

1. **Started** (impact begins): the asset stops or degrades; often known only afterwards
2. **Detected** (alert or ticket): **MTTD**, mean time to detect = detected − started
3. **Acknowledged** (someone owns it): **MTTA**, mean time to acknowledge = acknowledged − detected
4. **Mitigated** (service restored): **MTTR (recover / restore)** = mitigated − started
5. **Resolved** (ticket closed): **MTTR (resolve)** = resolved − detected (root cause fixed)

**MTTR** has four common expansions: mean time to *repair* (hands-on fix time), *recover* or *restore* (until the service works again), *resolve* (until the ticket is closed and the cause fixed), and sometimes *respond*. They can differ by hours. The first question in any MTTR discussion is: **which R, and which two timestamps?** *(added)*

*SQL · one row per real incident, with every clock*

```sql
CREATE OR REPLACE VIEW incident_clock AS
SELECT i.incident_id, a.asset_name, a.asset_type, i.severity,
       i.started_at, i.detected_at, i.acknowledged_at, i.mitigated_at, i.resolved_at,
       date_diff('minute', i.started_at,  i.detected_at)       AS minutes_to_detect,
       date_diff('minute', i.detected_at, i.acknowledged_at)   AS minutes_to_acknowledge,
       date_diff('minute', i.started_at,  i.mitigated_at) / 60 AS hours_to_recover,  -- NULL until mitigated
       date_diff('minute', i.detected_at, i.resolved_at)  / 60 AS hours_to_resolve,  -- NULL while open
       i.resolved_at IS NULL                                   AS is_open
FROM incidents i
JOIN assets a USING (asset_id)
WHERE i.merged_into IS NULL;     -- a duplicate ticket is not a second incident
```

```sql
SELECT severity,
       COUNT(*)                                AS incidents,
       COUNT(*) FILTER (WHERE is_open)         AS still_open,
       ROUND(AVG(minutes_to_detect), 1)        AS mttd_min,
       ROUND(AVG(minutes_to_acknowledge), 1)   AS mtta_min,
       ROUND(AVG(hours_to_recover), 2)         AS mttr_recover_h,
       ROUND(MEDIAN(hours_to_recover), 2)      AS median_recover_h,
       ROUND(MAX(hours_to_recover), 2)         AS max_recover_h,
       ROUND(AVG(hours_to_resolve), 2)         AS mtt_resolve_h
FROM incident_clock
GROUP BY severity
ORDER BY severity;
```

Result (3 rows):

| severity | incidents | still_open | mttd_min | mtta_min | mttr_recover_h | median_recover_h | max_recover_h | mtt_resolve_h |
|---|---|---|---|---|---|---|---|---|
| sev1 | 11 | 1 | 8.2 | 5.6 | 1.1 | 1.13 | 1.83 | 2.58 |
| sev2 | 29 | 0 | 9.4 | 9.9 | 2.83 | 1.78 | 30 | 7.09 |
| sev3 | 15 | 1 | 11.1 | 13.3 | 5.28 | 4.5 | 11.67 | 14.06 |

#### Mean or median?

One sev2 incident, a conveyor waiting 30 hours for a spare part, pulls the sev2 mean far above the median. Durations are right-skewed: report the median (or p90) beside the mean, as the percentiles lesson of *Business models and metrics* showed for delivery times. The mean is still useful, because it is what total downtime ÷ incidents gives.

#### Open incidents are censored *(added)*

Two incidents are still open at the end of the quarter, so their resolve time is unknown: the observation is **censored** (cut off before the outcome). `AVG` silently skips their NULLs, so the slowest incidents are the ones missing. Always report the open count next to MTTR, and judge them against the target in the SLA lesson.

#### Coming from C#

This is a state machine with timestamps: `Started → Detected → Acknowledged → Mitigated → Resolved`. Each metric is `(t2 - t1).TotalMinutes` averaged over incidents that reached state `t2`.

#### The table shape *(added)*

One row per incident, with one column per milestone that is filled in as the incident progresses, is an **accumulating snapshot** fact table (dimensional modelling). Its rows are updated, unlike a transaction fact; build it as a merge or a full rebuild, not append-only.

> **On the job:** ServiceNow, Jira Service Management, PagerDuty, and Azure DevOps all export these timestamps, but under different names (opened_at, sys_created_on, acknowledged_at, restored_at). The analytics engineer’s job is to map each tool’s fields onto one agreed clock definition, and to document which MTTR the dashboard shows.

> **The main idea:** MTTR is ambiguous until you name the two timestamps; report MTTD, MTTA, recover, and resolve separately, with the median and the open count.

*Read more:* [Atlassian: common incident management metrics](https://www.atlassian.com/incident-management/kpis/common-metrics), [Mean time to repair](https://en.wikipedia.org/wiki/Mean_time_to_repair), [Kimball: accumulating snapshot fact table](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/accumulating-snapshot-fact-table/), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-10"></a>
## 10. MTBF and availability: how often it breaks, how much it is up

*Part B · operations · failures per operating hour*

**MTBF** (mean time between failures) is operating time ÷ number of failures, for a repairable asset over a period: how long it typically runs before breaking. Higher is better. It pairs with MTTR (how long a failure lasts) into **availability**, the share of time the asset can do its job:

> **availability = uptime ÷ total time = MTBF ÷ (MTBF + MTTR)**

Here the period is Q1 2026 (2,160 hours), a failure is an incident, the asset is down from `started_at` until `mitigated_at`, and an incident still unmitigated at quarter end counts as down until the end of the quarter.

```sql
WITH quarter AS (
    SELECT TIMESTAMP '2026-01-01' AS q_start, TIMESTAMP '2026-04-01' AS q_end,
           date_diff('hour', TIMESTAMP '2026-01-01', TIMESTAMP '2026-04-01') AS q_hours
), downtime AS (                -- each incident stops the asset from start until mitigated (or quarter end)
    SELECT i.asset_id, COUNT(*) AS failures,
           SUM(date_diff('second', i.started_at, LEAST(COALESCE(i.mitigated_at, q.q_end), q.q_end))) / 3600 AS down_h
    FROM incidents i, quarter q
    WHERE i.merged_into IS NULL
    GROUP BY i.asset_id
)
SELECT a.asset_name,
       COALESCE(d.failures, 0)                                         AS failures,
       ROUND(COALESCE(d.down_h, 0), 1)                                 AS down_h,
       ROUND((q.q_hours - COALESCE(d.down_h, 0)) / NULLIF(d.failures, 0), 1) AS mtbf_h,
       ROUND(d.down_h / NULLIF(d.failures, 0), 2)                      AS mttr_h,
       ROUND(1 - COALESCE(d.down_h, 0) / q.q_hours, 4)                 AS availability,
       ROUND(mtbf_h / (mtbf_h + mttr_h), 4)                            AS mtbf_over_mtbf_plus_mttr
FROM assets a
CROSS JOIN quarter q
LEFT JOIN downtime d USING (asset_id)       -- keep the asset with zero failures
ORDER BY availability;
```

Result (6 rows):

| asset_name | failures | down_h | mtbf_h | mttr_h | availability | mtbf_over_mtbf_plus_mttr |
|---|---|---|---|---|---|---|
| packing_line_2 | 15 | 53.5 | 140.4 | 3.56 | 0.9752 | 0.9753 |
| packing_line_1 | 17 | 49 | 124.2 | 2.88 | 0.9773 | 0.9773 |
| conveyor_1 | 6 | 40.1 | 353.3 | 6.68 | 0.9814 | 0.9814 |
| label_printer_1 | 12 | 23.3 | 178.1 | 1.94 | 0.9892 | 0.9892 |
| web_checkout | 5 | 8.4 | 430.3 | 1.68 | 0.9961 | 0.9961 |
| label_printer_2 | 0 | 0 | NULL | NULL | 1 | NULL |

#### What the result shows

- The last two columns agree: with MTBF measured as uptime ÷ failures and MTTR as downtime ÷ failures, availability is exactly MTBF ÷ (MTBF + MTTR).
- Packing lines break most often (lowest MTBF); the conveyor breaks rarely but takes longest (highest MTTR). Same availability problem, different fixes: preventive maintenance vs spare parts.
- `label_printer_2` never failed. Its MTBF is not 0 and not missing: it is **more than 2,160 hours**, a censored value. The `LEFT JOIN` keeps it in the report; dropping it would make the fleet look less reliable than it is.

#### Definitions that vary

- Some teams use *calendar time* ÷ failures; with high availability the difference is small. Write down which.
- **MTTF** (mean time to failure) is for non-repairable parts (a disk is replaced, not repaired).
- For a fleet, use the ratio of sums: Σ operating hours ÷ Σ failures, not the average of per-asset MTBFs. In data centres this often appears as the **annualised failure rate** (AFR) = failures ÷ device-years (lesson 13).

> **On the job:** Reliability engineers use MTBF per asset type to plan preventive maintenance and spare-part stock; operations reviews use availability per site. The analytics model needs an asset inventory with in-service dates as the population, not just the ticket table, or every never-failed asset disappears.

> **The main idea:** MTBF = operating time ÷ failures and availability = MTBF ÷ (MTBF + MTTR); the population is the asset list, including assets that never failed.

*Read more:* [Mean time between failures](https://en.wikipedia.org/wiki/Mean_time_between_failures), [Availability (reliability engineering)](https://en.wikipedia.org/wiki/Availability), [Azure Well-Architected: reliability metrics](https://learn.microsoft.com/en-us/azure/well-architected/reliability/metrics), [DuckDB: timestamp functions](https://duckdb.org/docs/stable/sql/functions/timestamp).

---

<a id="slide-11"></a>
## 11. SLA attainment, SLOs, and error budgets

*Part B · operations · promises, and how often they are kept*

Three terms that interviews love to separate *(added)*:

- **SLI** (service level indicator): a measured quantity, such as “share of minutes the checkout was up” or “hours to resolve a ticket”.
- **SLO** (service level objective): the internal target for an SLI, such as “checkout up 99.5 % of each month” or “sev1 resolved within 4 hours”.
- **SLA** (service level agreement): a promise to a customer, usually looser than the SLO and with consequences (credits, penalties) when missed.
- **SLA attainment** (compliance) is the share of eligible items that met the target. The **error budget** is what the SLO allows to fail: 99.5 % of a 31-day month leaves 0.5 % × 44,640 = 223.2 minutes of downtime.

*SQL · every ticket gets a status*

```sql
CREATE OR REPLACE VIEW incident_sla AS
SELECT c.*, t.target_hours,
       CASE WHEN c.resolved_at IS NOT NULL AND c.hours_to_resolve <= t.target_hours THEN 'met'
            WHEN c.resolved_at IS NOT NULL                                         THEN 'breached'
            WHEN date_diff('minute', c.detected_at, TIMESTAMP '2026-04-01') / 60 > t.target_hours THEN 'breached (still open)'
            ELSE 'pending'                         -- open, and its target time has not passed yet
       END AS sla_status
FROM incident_clock c
JOIN sla_targets t USING (severity);
```

```sql
SELECT severity, MAX(target_hours) AS target_h,
       COUNT(*) FILTER (WHERE sla_status = 'met')            AS met,
       COUNT(*) FILTER (WHERE sla_status LIKE 'breached%')   AS breached,
       COUNT(*) FILTER (WHERE sla_status = 'pending')        AS pending,
       ROUND(COUNT(*) FILTER (WHERE sla_status = 'met')
             / NULLIF(COUNT(*) FILTER (WHERE sla_status <> 'pending'), 0), 3) AS attainment
FROM incident_sla
GROUP BY severity
ORDER BY severity;
```

Result (3 rows):

| severity | target_h | met | breached | pending | attainment |
|---|---|---|---|---|---|
| sev1 | 4 | 9 | 1 | 1 | 0.9 |
| sev2 | 24 | 28 | 1 | 0 | 0.966 |
| sev3 | 72 | 14 | 1 | 0 | 0.933 |

The denominator is the decision. A ticket that is still open but already past its target is a breach *today*; leaving it out (because it has no resolve time) is the most common way an SLA report shows a false 100 %. An open ticket whose target time has not passed is **pending**: excluded until it resolves or breaches.

#### Availability SLO for the web checkout

```sql
WITH months AS (
    SELECT m AS m_start, m + INTERVAL 1 MONTH AS m_end
    FROM (SELECT UNNEST(generate_series(TIMESTAMP '2026-01-01', TIMESTAMP '2026-03-01', INTERVAL 1 MONTH)) AS m)
), outage_pieces AS (               -- the part of each outage that falls inside each month
    SELECT mo.m_start,
           date_diff('second', GREATEST(i.started_at, mo.m_start),
                               LEAST(COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01'), mo.m_end)) / 60 AS down_min
    FROM months mo
    JOIN incidents i
      ON i.asset_id = 6 AND i.merged_into IS NULL
     AND i.started_at < mo.m_end AND COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01') > mo.m_start
)
SELECT mo.m_start::DATE                                       AS month,
       date_diff('minute', mo.m_start, mo.m_end)             AS minutes,
       ROUND(COALESCE(SUM(o.down_min), 0), 1)                AS down_min,
       ROUND(1 - COALESCE(SUM(o.down_min), 0) / minutes, 5)  AS availability,
       ROUND(0.005 * minutes, 1)                             AS budget_min,      -- SLO 99.5 %
       ROUND(COALESCE(SUM(o.down_min), 0) / budget_min, 2)   AS budget_used,
       availability >= 0.995                                 AS slo_met
FROM months mo
LEFT JOIN outage_pieces o USING (m_start)
GROUP BY mo.m_start, mo.m_end
ORDER BY month;
```

Result (3 rows):

| month | minutes | down_min | availability | budget_min | budget_used | slo_met |
|---|---|---|---|---|---|---|
| 2026-01-01 | 44640 | 213 | 0.99523 | 223.2 | 0.95 | true |
| 2026-02-01 | 40320 | 292 | 0.99276 | 201.6 | 1.45 | false |
| 2026-03-01 | 44640 | 0 | 1 | 223.2 | 0 | true |

#### How the query works

- One outage started at 23:20 on 31 January and ended at 01:10 on 1 February. `GREATEST` and `LEAST` clip it to each month, so 40 minutes count in January and 70 in February.
- February is shorter, so its budget is smaller, and it overspent it: the SLO was missed.
- `budget_used` above 1 means the budget is gone. Under an **error budget policy**, the team then pauses risky releases until reliability recovers.
- The `JOIN` inside `outage_pieces` is deliberate: the bug clinic shows what happens when it becomes a `LEFT JOIN`.

> **On the job:** Contracts state SLAs in business hours or calendar hours, with clock pauses (“waiting on customer”) and exclusions (planned maintenance). Those rules belong in the spec card and usually in a calendar or pause table; the SQL is easy once the clock rules are written down.

> **The main idea:** attainment = met ÷ (met + breached), counting open tickets already past target as breaches; an SLO turns into an error budget that a team can spend and track.

*Read more:* [Google SRE book: service level objectives](https://sre.google/sre-book/service-level-objectives/), [Google SRE workbook: error budget policy](https://sre.google/workbook/error-budget-policy/), [Microsoft: SLAs for Online Services](https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services), [DuckDB: FILTER clause](https://duckdb.org/docs/stable/sql/query_syntax/filter).

---

<a id="slide-12"></a>
## 12. Throughput, productivity, and Little’s law

*Part B · operations · how much work flows through*

**Throughput** is completed units per unit of time: boxes shipped per day, tickets closed per week, servers deployed per month. **Productivity** divides by an input instead of time, such as boxes per **labour hour**. **Cycle time** is how long one unit takes from start to finish, and **work in progress** (WIP) is how many units are started but not finished. Throughput is not utilisation: a team can be 100 % busy and ship little.

#### A date spine shows the zero days

```sql
WITH days AS (
    SELECT UNNEST(generate_series(DATE '2026-03-16', DATE '2026-03-22', INTERVAL 1 DAY))::DATE AS day
), shipped AS (
    SELECT shipped_at::DATE AS day, COUNT(*) AS boxes FROM box_jobs WHERE shipped_at IS NOT NULL GROUP BY 1
)
SELECT d.day, dayname(d.day) AS weekday, COALESCE(s.boxes, 0) AS boxes_shipped,
       COALESCE(h.labour_hours, 0) AS labour_hours
FROM days d
LEFT JOIN shipped s USING (day)
LEFT JOIN shifts h ON h.work_day = d.day
ORDER BY d.day;
```

Result (7 rows):

| day | weekday | boxes_shipped | labour_hours |
|---|---|---|---|
| 2026-03-16 | Monday | 45 | 32.0 |
| 2026-03-17 | Tuesday | 24 | 32.0 |
| 2026-03-18 | Wednesday | 30 | 32.0 |
| 2026-03-19 | Thursday | 21 | 32.0 |
| 2026-03-20 | Friday | 44 | 32.0 |
| 2026-03-21 | Saturday | 41 | 16.0 |
| 2026-03-22 | Sunday | 0 | 0.0 |

Sunday shipped nothing because the warehouse is closed; without the date spine (the generated list of days) it would vanish from the daily chart, and “average boxes per day” would quietly mean “per day that had shipments”.

#### One month, three denominators

```sql
WITH days AS (
    SELECT UNNEST(generate_series(DATE '2026-03-01', DATE '2026-03-31', INTERVAL 1 DAY))::DATE AS day
), shipped AS (
    SELECT shipped_at::DATE AS day, COUNT(*) AS boxes FROM box_jobs WHERE shipped_at IS NOT NULL GROUP BY 1
), daily AS (
    SELECT d.day, COALESCE(s.boxes, 0) AS boxes, COALESCE(h.labour_hours, 0) AS labour_hours
    FROM days d LEFT JOIN shipped s USING (day) LEFT JOIN shifts h ON h.work_day = d.day
)
SELECT SUM(boxes)                                                     AS boxes_shipped,
       COUNT(*) FILTER (WHERE labour_hours > 0)                       AS working_days,
       ROUND(SUM(boxes) / COUNT(*) FILTER (WHERE labour_hours > 0), 1) AS per_working_day,
       ROUND(SUM(boxes) / SUM(labour_hours), 3)                       AS boxes_per_labour_hour,
       ROUND(AVG(boxes / labour_hours) FILTER (WHERE labour_hours > 0), 3) AS mean_of_daily_rates
FROM daily;
```

Result (1 row):

| boxes_shipped | working_days | per_working_day | boxes_per_labour_hour | mean_of_daily_rates |
|---|---|---|---|---|
| 824 | 26 | 31.7 | 1.073 | 1.166 |

Saturdays have half the labour hours but similar volumes, so the mean of daily rates is higher than the ratio of sums. Productivity for the month is Σ boxes ÷ Σ labour hours (the ratio-of-sums rule from *Metric design*).

**Little’s law** *(added)* links the three flow numbers for any stable process: **average WIP = arrival rate × average cycle time** (L = λW). It holds whatever the arrival pattern, so it is a free consistency check on your data and an estimator for the one you cannot measure.

```sql
WITH jobs AS (
    SELECT released_at, COALESCE(shipped_at, TIMESTAMP '2026-04-01') AS left_at       -- open jobs: censored at the cut-off
    FROM box_jobs
), hours AS (
    SELECT UNNEST(generate_series(TIMESTAMP '2026-03-01 00:30', TIMESTAMP '2026-03-31 23:30', INTERVAL 1 HOUR)) AS h
), wip AS (                                                    -- boxes in the warehouse at each half-past
    SELECT h, COUNT(j.released_at) AS in_progress
    FROM hours LEFT JOIN jobs j ON j.released_at <= h AND j.left_at > h
    GROUP BY h
)
SELECT ROUND(COUNT(*) / 744.0, 3)                                         AS arrivals_per_h,
       ROUND(AVG(date_diff('second', released_at, left_at) / 3600), 1)   AS avg_cycle_h,
       ROUND(MEDIAN(date_diff('second', released_at, left_at) / 3600), 1) AS median_cycle_h,
       ROUND(arrivals_per_h * avg_cycle_h, 1)                            AS little_wip,
       (SELECT ROUND(AVG(in_progress), 1) FROM wip)                      AS measured_wip
FROM jobs;
```

Result (1 row):

| arrivals_per_h | avg_cycle_h | median_cycle_h | little_wip | measured_wip |
|---|---|---|---|---|
| 1.126 | 36.3 | 30.7 | 40.9 | 40.7 |

The WIP predicted from arrivals and cycle times matches the WIP measured by sampling the warehouse every hour within a few percent; the gap comes from boxes still open at the cut-off. Used backwards: 40 boxes in progress with 27 arrivals a day means a typical box waits about 1.5 days.

> **On the job:** Operations leads ask for throughput by day and site, productivity per labour hour, and cycle-time percentiles. Build them on a date (or hour) spine with explicit working-calendar flags, so closed days, holidays, and outages are visible zeros rather than missing rows.

> **The main idea:** throughput is completions per time on a date spine; productivity is a ratio of sums over an input; Little’s law (WIP = arrival rate × cycle time) checks that the three agree.

*Read more:* [Little’s law](https://en.wikipedia.org/wiki/Little%27s_law), [DuckDB: list functions (range, generate_series)](https://duckdb.org/docs/stable/sql/functions/list), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date).

---

<a id="slide-13"></a>
## 13. Map your data-centre operations metrics

*Part B · operations · the same four ideas in a data centre*

Data-centre operations (DC Ops) runs physical infrastructure: servers, racks, network gear, power and cooling. Its work arrives as tickets and work orders, so every metric in Part B applies directly. The table maps typical DC Ops processes to the metric, its clocks, and the trap to write on the spec card.

| DC Ops process | Metric and clock | Population and grain | Trap to spec |
|---|---|---|---|
| Hardware break-fix (failed disk, DIMM, PSU, NIC) | **MTTR**: ticket created → device returned to production (validated), not just “part swapped” | One row per repair ticket; by priority, component, site | Waiting for parts or vendor RMA: report hands-on time and waiting time separately |
| Component reliability | **MTBF** or **AFR** = failures ÷ device-years in service | Device inventory with in-service dates; failures from tickets | Devices with zero failures must stay in the denominator |
| Break-fix and request SLAs | **SLA attainment**: share closed within the contractual window per priority | Tickets with a target; open-and-past-target = breached | Clock pauses (“waiting on customer”), business-hours calendars |
| Server and rack deployments, decommissions | **Throughput**: units handed over per week; **cycle time**: request → handover | One row per deployment order; date spine of weeks | WIP and cycle time via Little’s law; partial racks |
| Cluster or rack uptime | **Availability** = uptime ÷ scheduled time; SLO and error budget | Minutes per cluster per month | Planned maintenance: excluded or not, written down |
| Alert to technician on site | **MTTA** and time to dispatch | Alerts that became tickets | Duplicate alerts merged into one incident |

#### Spec card: break-fix MTTR

| Field | Metric spec card |
|---|---|
| **Definition** | Mean hours from break-fix ticket creation to the device being returned to production, per priority. |
| **Decision** | Staffing per shift, spare-part stock levels, vendor escalation. |
| **Population** | Closed break-fix tickets in the month; duplicates merged; test tickets excluded. Open tickets reported as a count and in SLA attainment. |
| **Clocks** | Start: `created_at`. Stop: `returned_to_production_at`. Reported split: hands-on vs waiting for parts. |
| **Companions** | Median and p90; SLA attainment; tickets per 1,000 devices (failure rate). |

#### Annualised failure rate on a fleet

```sql
SELECT component, devices, failures,
       ROUND(device_hours / NULLIF(failures, 0))          AS mtbf_h,
       ROUND(failures / (device_hours / 8760), 3)          AS afr     -- failures per device-year
FROM (VALUES ('disk model A', 4000, 31, 4000 * 2160),
             ('disk model B', 1200, 18, 1200 * 2160),
             ('power supply', 900,   0,  900 * 2160)) AS fleet(component, devices, failures, device_hours)
ORDER BY afr DESC;
```

Result (3 rows):

| component | devices | failures | mtbf_h | afr |
|---|---|---|---|---|
| disk model B | 1200 | 18 | 144000 | 0.061 |
| disk model A | 4000 | 31 | 278710 | 0.031 |
| power supply | 900 | 0 | NULL | 0 |

AFR normalises failures by exposure, so fleets of different sizes compare fairly. The power supplies had no failures: AFR 0 over 900 device-quarters, MTBF unknown but above the observed hours. Toy numbers, computed in a scratch database.

#### In your portfolio: Fuel Smart *(added)*

- **Pipeline MTTR:** failed run → next successful run of the nutrition pipeline.
- **Data-freshness SLA:** “USDA and recipe tables refreshed by 06:00 UTC on 99 % of days”, with an error budget of about 3 late days a year.
- **Throughput:** recipes parsed and matched per run; match coverage as the quality guardrail.

#### Coming from C#

Treat each metric as a contract: `interface IOpsMetric { Clock Start; Clock Stop; Population Population; }`. The two clocks and the population are the whole definition; everything else is aggregation.

> **On the job:** In a DC Ops team the same ticket table feeds an ops review (MTTR, SLA attainment per site), a reliability review (AFR per component model), and capacity planning (deployment throughput and cycle time). One accumulating-snapshot model of tickets plus a device inventory supports all three.

> **The main idea:** DC Ops metrics are the same four ideas (MTTR, MTBF or AFR, SLA attainment, throughput) applied to tickets, devices, and work orders; the spec card is where the clock rules and populations live.

*Read more:* [Azure Well-Architected: reliability metrics](https://learn.microsoft.com/en-us/azure/well-architected/reliability/metrics), [Mean time between failures](https://en.wikipedia.org/wiki/Mean_time_between_failures), [DORA: the four key metrics](https://dora.dev/guides/dora-metrics-four-keys/), [Google SRE workbook: implementing SLOs](https://sre.google/workbook/implementing-slos/).

---

<a id="slide-14"></a>
## 14. Lab: a channel scorecard and an ops scorecard

*Practice · about 1.5–2 hours, offline, with tests*

Two requests land on the same Monday. Marketing: *“Which acquisition channel should get more budget next quarter?”* Operations: *“One scorecard for the warehouse and the checkout: how often things break, how fast we fix them, whether we keep our SLAs, and how many boxes we ship.”* The lab folder [unit-economics-ops-lab/README.md](unit-economics-ops-lab/README.md) has the generator, a starter `scorecard.py` with four functions to implement, pytest tests, and a reference solution to open only after your attempt.

#### Steps

- **1 · Explore (10 min):** list each table’s grain and find the planted traps (lesson 3).
- **2 · Channel scorecard (40 min):** CAC, MRR and ARPA, CM %, churn, formula LTV, cohort LTV at 6 and 12 months, LTV12/CAC, payback months (lessons 4–8).
- **3 · Ops scorecard (25 min):** per asset: failures, open incidents, MTTR mean and median, MTBF, availability, SLA attainment (lessons 9–11).
- **4 · Checkout SLO (15 min):** monthly availability, clipped outages, error budget used (lesson 11).
- **5 · Warehouse flow (15 min):** throughput, boxes per labour hour, cycle time, Little’s law check (lesson 12).
- **6 · Recommend (10 min):** five sentences: grow one channel, fix one, one too young to judge, one ops metric to act on, each with its caveat.

#### The functions you write

```python
def connect(path=DB):
def channel_scorecard(con):
def ops_scorecard(con):
def checkout_slo(con, slo=0.995):
def flow_scorecard(con):
```

Each returns plain dicts, so the tests read like a spec: CAC = spend ÷ customers, availability = MTBF ÷ (MTBF + MTTR), Little’s law within 5 %, plus a few values pinned by the fixed seed.

#### Build the data, check the tests

Terminal:

```text
$ python make_data.py
customers         1,363 rows
billing           7,400 rows
marketing_spend      72 rows
assets                6 rows
incidents            56 rows
sla_targets           3 rows
box_jobs            838 rows
shifts               26 rows
```

Terminal (before you start: the starter raises NotImplementedError):

```text
$ python -m pytest -q --tb=no
FFFFFF                                                                   [100%]
=========================== short test summary info ===========================
FAILED tests/test_scorecard.py::test_channel_scorecard_shape_and_definitions
FAILED tests/test_scorecard.py::test_channel_scorecard_decision - NotImplemen...
FAILED tests/test_scorecard.py::test_channel_scorecard_pinned - NotImplemente...
FAILED tests/test_scorecard.py::test_ops_scorecard - NotImplementedError: ste...
FAILED tests/test_scorecard.py::test_checkout_slo - NotImplementedError: step...
FAILED tests/test_scorecard.py::test_flow_and_littles_law - NotImplementedErr...
6 failed in 0.08s
[exit code 1]
```

Terminal (timing measured on the build machine):

```text
$ python -m pytest -q --impl reference
......                                                                   [100%]
6 passed in 0.41s
```

#### Expected result (reference solution)

Terminal:

```text
$ python reference/scorecard_solution.py
Channel scorecard
      channel    cac      mrr   arpa  formula_ltv  ltv_6m  ltv_12m  ltv12_to_cac  payback_months
     referral   15.0  5620.00  32.67       249.38   45.59    99.48          6.63               3
  paid_search  62.46  6545.00  31.77       134.43   38.74    76.85          1.23              10
  paid_social  40.04  4290.00  30.43        75.75   25.17    41.04          1.02              11
   influencer  92.25  2190.00  31.74       115.18   38.19    81.68          0.89            None

Ops scorecard, Q1 2026
       asset_name  failures  open_incidents  mttr_recover_h  median_recover_h  mtbf_h  availability  sla_attainment
   packing_line_2        15               0            3.56              1.92   140.4        0.9752             1.0
   packing_line_1        17               1            2.88              2.27   124.2        0.9773             1.0
       conveyor_1         6               0            6.68               1.5   353.3        0.9814           0.833
  label_printer_1        12               1            1.94              1.38   178.1        0.9892           0.833
     web_checkout         5               0            1.68              1.83   430.3        0.9961             1.0
  label_printer_2         0               0            None              None    None           1.0            None

Checkout availability SLO (99.5 %)
       month  availability  budget_used  slo_met
  2026-01-01       0.99523         0.95     True
  2026-02-01       0.99276         1.45    False
  2026-03-01           1.0          0.0     True

Warehouse flow, March 2026
  boxes_shipped  per_working_day  boxes_per_labour_hour  avg_cycle_h  little_wip  measured_wip
            824             31.7                  1.073         36.3        40.9          40.7
```

**Done when:** `python -m pytest -q` reports 6 passed against your own `scorecard.py`, and your five sentences name numbers with their caveats, for example “influencer has not paid back after 11 months, but on one cohort of 8 subscribers”.

> **On the job:** This is a realistic first deliverable on a growth or operations analytics team: two marts, tests that pin the definitions, and a short written recommendation. In dbt the same work becomes `mart_channel_unit_economics` and `mart_ops_scorecard` models with their tests.

> **The main idea:** the lab ties both halves together: one tested channel scorecard for budget decisions and one tested ops scorecard for reliability and flow.

*Read more:* [pytest documentation](https://docs.pytest.org/en/stable/), [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview).

---

<a id="slide-15"></a>
## 15. Bug clinic: believable unit-economics and ops-metric bugs

*Practice · each bug runs, returns a number, and is wrong*

Every query below runs without an error and returns a plausible number. That is what makes these bugs dangerous.

**Bug 1 · survivorship in cohort LTV.** Symptom: paid social’s 6-month LTV looks healthy and the channel looks fine.

#### ✗ Wrong: LTV per surviving customer

*SQL · divides by survivors*

```sql
WITH cohorts AS (           -- paid_social cohorts old enough for month 5
    SELECT customer_id, date_trunc('month', signup_date)::DATE AS cohort_month
    FROM customers
    WHERE channel = 'paid_social' AND NOT is_test
      AND date_trunc('month', signup_date) <= DATE '2025-10-01'
)
SELECT ROUND(SUM(b.contribution)
             / COUNT(DISTINCT b.customer_id) FILTER (WHERE b.month_index = 5), 2) AS ltv_6m
FROM cohorts c JOIN box_margin b USING (customer_id)
WHERE b.month_index <= 5;
```

Result (1 row):

| ltv_6m |
|---|
| 61.64 |

#### ✓ Fixed: LTV per acquired customer

*SQL · divides by everyone acquired*

```sql
WITH cohorts AS (
    SELECT customer_id, date_trunc('month', signup_date)::DATE AS cohort_month
    FROM customers
    WHERE channel = 'paid_social' AND NOT is_test
      AND date_trunc('month', signup_date) <= DATE '2025-10-01'
)
SELECT ROUND(SUM(b.contribution) / (SELECT COUNT(*) FROM cohorts), 2) AS ltv_6m
FROM cohorts c JOIN box_margin b USING (customer_id)
WHERE b.month_index <= 5;
```

Result (1 row):

| ltv_6m |
|---|
| 25.17 |

Dividing by customers still paying in month 5 keeps only the survivors, who are exactly the customers who paid every month. The denominator must be everyone acquired, as in lesson 7 (same result as its `ltv_6m` column).

**Bug 2 · `GREATEST` and `LEAST` ignore NULLs.** Symptom: the checkout was down for the whole of March, although it had no incident in March.

#### ✗ Believable, but wrong

*SQL · one LEFT JOIN instead of JOIN + LEFT JOIN*

```sql
WITH months AS (
    SELECT m AS m_start, m + INTERVAL 1 MONTH AS m_end
    FROM (SELECT UNNEST(generate_series(TIMESTAMP '2026-01-01', TIMESTAMP '2026-03-01', INTERVAL 1 MONTH)) AS m)
)
SELECT mo.m_start::DATE AS month,
       COALESCE(SUM(date_diff('second', GREATEST(i.started_at, mo.m_start),
                     LEAST(COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01'), mo.m_end))) / 60, 0) AS down_min
FROM months mo
LEFT JOIN incidents i
  ON i.asset_id = 6 AND i.merged_into IS NULL
 AND i.started_at < mo.m_end AND COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01') > mo.m_start
GROUP BY mo.m_start
ORDER BY month;
```

Result (3 rows):

| month | down_min |
|---|---|
| 2026-01-01 | 213 |
| 2026-02-01 | 292 |
| 2026-03-01 | 44640 |

#### ✓ Why, and the fix

*SQL · why*

```sql
SELECT GREATEST(NULL, TIMESTAMP '2026-03-01') AS greatest_with_null,
       LEAST(COALESCE(NULL, TIMESTAMP '2026-04-01'), TIMESTAMP '2026-04-01') AS least_value;
```

Result (1 row):

| greatest_with_null | least_value |
|---|---|
| 2026-03-01T00:00:00 | 2026-04-01T00:00:00 |

In a month with no incident the `LEFT JOIN` leaves `i.*` NULL. DuckDB’s `GREATEST` and `LEAST` skip NULL arguments (PostgreSQL and SQL Server 2022 do the same), so the “outage” becomes the whole month. Fix: clip outages in an inner `JOIN`, then `LEFT JOIN` the per-month sums to the month list, as in lesson 11.

**Bug 3 · open breaches dropped from SLA attainment.** Symptom: sev3 shows 100 % attainment, but one sev3 ticket has been open for over four days against a 72-hour target.

#### ✗ Believable, but wrong

*SQL · only closed tickets in the denominator*

```sql
SELECT severity,
       ROUND(COUNT(*) FILTER (WHERE hours_to_resolve <= target_hours)
             / COUNT(*) FILTER (WHERE resolved_at IS NOT NULL), 3) AS attainment
FROM incident_clock JOIN sla_targets USING (severity)
GROUP BY severity
ORDER BY severity;
```

Result (3 rows):

| severity | attainment |
|---|---|
| sev1 | 0.9 |
| sev2 | 0.966 |
| sev3 | 1 |

#### ✓ Fixed

Give every ticket a status first (met, breached, breached while open, pending), then compute met ÷ (met + breached), as in lesson 11: sev3 attainment is 0.933, not 1. The `<=` comparison with a NULL resolve time is NULL, so the open ticket silently fell out of the numerator *and* the denominator.

| Bug | Symptom | Fix |
|---|---|---|
| LTV on revenue, compared with CAC | Every channel has LTV/CAC above 3 | Use contribution (lesson 4); say “revenue LTV” if you must show it |
| Failed payment attempts in revenue | Revenue higher than the payment provider’s payout | Filter `status = 'paid'` in one base view |
| Blended CAC reported as channel CAC | Every paid channel looks cheaper than its invoices | Paid spend ÷ paid-channel customers; label blended separately |
| Immature cohorts in a 12-month LTV | LTV falls for recent cohorts and alarms marketing | Only cohorts that reached month *k* (lesson 7) |
| Merged duplicate tickets counted | Incident count and MTTR inflated after a big outage | `WHERE merged_into IS NULL` |
| Zero-failure assets dropped | Fleet MTBF lower than reality | Start from the asset list with a `LEFT JOIN` (lesson 10) |
| Average over days with shipments only | Throughput per day looks higher; Sundays vanish | Date spine with explicit working-day flags (lesson 12) |
| Mean of daily productivity rates | Productivity differs from Σ boxes ÷ Σ hours | Ratio of sums |

> **On the job:** Most of these bugs reach production because the query “looks right” and the number is plausible. The cheapest defences are tests that pin definitions (the lab’s tests), reconciliation with an outside total (payment provider payouts, the ticketing tool’s own SLA report), and showing population counts next to every rate.

> **The main idea:** the dangerous bugs are the ones that return a plausible number: survivors in the denominator, NULL-skipping functions after a LEFT JOIN, and open tickets that fall out of the SLA.

---

<a id="slide-16"></a>
## 16. Interview questions and model answers

*Practice · say each answer aloud before revealing it*

These are the question types that recur in analytics-engineering, data-analyst, and operations-analytics interviews (research summary in the Markdown intro). Answer aloud in about a minute, then open the model answer.

<details><summary>“How do you calculate customer lifetime value?” · *checks: margin vs revenue, formula vs cohort, maturity*</summary>

**Model answer (about 60 s):** LTV is the contribution a customer brings over their lifetime, so I start from contribution margin, not revenue. There are two ways. The formula version is ARPA × contribution margin % ÷ monthly churn: quick, but it assumes constant churn and margin, so I cap the horizon and often discount it. The cohort version measures what acquisition cohorts actually earned: cumulative contribution up to month k divided by everyone acquired, using only cohorts old enough to have reached month k. For decisions I trust the cohort version at a stated horizon, like 12-month LTV, and I show the cohort sizes.

**Likely follow-up:** “We launched the channel two months ago; what LTV do you use?” → a formula LTV with clearly stated inputs, maybe churn borrowed from a similar channel, labelled as an estimate, and a date when cohort data will replace it.

</details>

<details><summary>“What goes into CAC? Blended or paid?” · *checks: numerator and denominator match, attribution*</summary>

**Model answer (about 60 s):** CAC is acquisition spend divided by the new customers it won, for the same channel and period. Blended CAC divides all acquisition spend, including brand, by all new customers, including organic, so it answers “what does growth cost us?”. Paid or channel CAC divides one channel’s spend by the customers attributed to it, which answers “where should the next dollar go?”. Fully loaded CAC adds salaries, agencies, and tools. I always state which one, and the attribution rule, because changing first-touch to last-touch moves customers between channels.

**Likely follow-up:** “Spend in March brings signups in April.” → use longer windows (quarters) or a lagged attribution; never compare one month’s spend with the same month’s small signup count.

</details>

<details><summary>“Our LTV/CAC is 5. Is that good?” · *checks: judgement, payback, maturity, benchmarks in context*</summary>

**Model answer (about 60 s):** It depends on how it was computed and on payback. First I check that LTV is margin-based and from mature cohorts, not a formula with a very low churn assumption. Then I look at payback: a ratio of 5 with a 30-month payback can still starve cash. If both are solid, a ratio well above the usual rule of thumb of about 3 may mean we are under-investing in that channel, so I would test more spend and watch whether CAC rises as we scale.

**Likely follow-up:** “And if it is 0.9?” → the channel loses money per customer today; check whether it is too young to judge (cohort counts), then cut or fix it (targeting, first-box discount, onboarding to reduce early churn).

</details>

<details><summary>“How do you compute CAC payback?” · *checks: simple vs cohort version, churn*</summary>

**Model answer (about 60 s):** The simple formula is CAC divided by monthly contribution per customer, ARPA × CM %. It ignores churn and one-off costs like a first-month discount, so it is optimistic. The cohort version finds the first month k at which cumulative contribution per acquired customer reaches CAC. Because churned customers stay in the denominator, it includes churn. At Leafy, paid social pays back in under 4 months by the formula but in 11 months by cohorts.

**Likely follow-up:** “Write it in SQL.” → cumulative sum per cohort over month index, divide by acquired customers, filter mature cohorts, then MIN(k) WHERE ltv ≥ cac.

</details>

<details><summary>“What is contribution margin, and how is it different from gross margin?” · *checks: variable vs fixed costs*</summary>

**Model answer (about 60 s):** Contribution margin is revenue minus refunds minus all variable costs of a unit: goods, shipping, packing, payment fees. Gross margin usually subtracts only the cost of goods. Fixed costs like rent and salaries are excluded from both. Contribution margin is what pays back CAC and covers fixed costs, so it is the right input for LTV and payback. I always list which costs are included, because e-commerce teams use CM1, CM2, CM3 for different cut-offs.

**Likely follow-up:** “How many subscribers to break even?” → fixed costs ÷ contribution per subscriber per month.

</details>

<details><summary>“Define MTTR. How would you compute it from an incidents table?” · *checks: which R, clocks, median, open incidents, duplicates*</summary>

**Model answer (about 60 s):** MTTR is ambiguous: mean time to repair, recover, resolve, or respond. I would agree which two timestamps it uses, for example impact start to service restored for recovery, or ticket opened to closed for resolution. In SQL it is the average difference between those timestamps over incidents that reached the end state, excluding merged duplicates. Durations are skewed, so I report the median and p90 next to the mean, and the count of open incidents, because averaging only closed incidents hides the slowest ones.

**Likely follow-up:** “MTTR went up this month. Is the team slower?” → check mix (more sev3?), one outlier (median), and whether detection got faster, so incidents that used to be invisible are now counted.

</details>

<details><summary>“What is MTBF, and how does it relate to availability?” · *checks: operating time ÷ failures, population*</summary>

**Model answer (about 60 s):** MTBF is operating time divided by the number of failures for a repairable asset over a period. Availability is uptime ÷ total time, which equals MTBF ÷ (MTBF + MTTR). The population must be the asset inventory, not the ticket table, so assets that never failed are kept; their MTBF is “more than the observed time”. For a fleet I use total operating hours ÷ total failures, or an annualised failure rate.

**Likely follow-up:** “A 99.9 % availability target: how much downtime per month?” → 0.1 % × 43,200 minutes in a 30-day month ≈ 43 minutes.

</details>

<details><summary>“SLA vs SLO vs SLI? How do you compute SLA attainment?” · *checks: definitions, error budget, open tickets*</summary>

**Model answer (about 60 s):** An SLI is the measurement, such as uptime minutes or hours to resolve. An SLO is our internal target for it. An SLA is the external promise, usually looser, with penalties. The error budget is the failure the SLO allows: 0.5 % of a month for 99.5 %. SLA attainment is the share of eligible items that met the target: met ÷ (met + breached), where an open ticket already past its target is a breach and an open ticket within target is pending.

**Likely follow-up:** “The contract measures business hours only.” → a working-hours calendar table and a function that counts only business minutes between two timestamps; clock pauses for “waiting on customer” need a status-history table.

</details>

<details><summary>“How would you measure throughput for an operations team?” · *checks: date spine, ratio of sums, Little’s law*</summary>

**Model answer (about 60 s):** Throughput is completed units per period on a date spine, so days with zero output stay visible. Productivity divides by an input, such as labour hours, as a ratio of sums over the period. I add cycle time percentiles and work in progress, and use Little’s law, WIP = arrival rate × cycle time, to check that the three numbers are consistent or to estimate the one I cannot measure.

**Likely follow-up:** “Throughput is flat but the team is busier.” → look at WIP and cycle time (more work started, not finished), rework, and the mix of work types.

</details>

> **On the job:** Interviewers rarely want only the formula. They listen for the definition choices: margin, maturity, attribution, which clock, which population, what happens to open items. Say those out loud, and the formula follows.

> **The main idea:** every answer has the same shape: the formula, the definition choices that change it, the trap, and how you would check it.

---

<a id="slide-17"></a>
## 17. Exercises 1–6 · unit economics and MTTR

*Exercises · warm-ups first, then interview-level*

Exercises use the Leafy Box database (lesson 3) and the `box_margin` view (lesson 4). Write your answer first; hints and solutions are collapsed (the Markdown companion puts them in Appendices A and B). Every solution ran during the build and its `assert` lines passed.

### Exercise 1 · Contribution margin per recurring box, from raw tables

**Pattern:** contribution margin, base-table hygiene · **Format:** write the query · **Target time:** about 6 minutes.

Without using the `box_margin` view, compute for recurring boxes (not the first box) billed January–March 2026: one row per plan with `boxes`, `avg_contribution` (2 decimals), and `cm_pct` (3 decimals). Expected properties: two rows; large earns more per box than small; your numbers equal the same calculation over `box_margin`.

*Hint: [Appendix A](#hint-1) · Solution: [Appendix B](#solution-1)*

### Exercise 2 · Predict, then compute: paid vs blended CAC for one quarter

**Pattern:** CAC by channel, blended vs paid · **Format:** predict the output, then write the query · **Target time:** about 8 minutes.

For Q4 2025 (spend months and signup months October–December 2025): (a) predict whether blended CAC (all spend ÷ all non-test new customers) is above or below paid CAC (paid-channel spend ÷ paid-channel customers; paid channels are `paid_search`, `paid_social`, `influencer`, `referral`). (b) Return one row per paid channel with `spend, new_customers, cac`, then both totals. Expected: four channel rows, and the prediction checked.

*Hint: [Appendix A](#hint-2) · Solution: [Appendix B](#solution-2)*

### Exercise 3 · Which lever doubles LTV?

**Pattern:** formula LTV sensitivity · **Format:** predict, then verify in Python · **Target time:** about 5 minutes.

ARPA is $32, CM % is 35 %, monthly churn is 8 %. Predict the textbook LTV, then which change doubles it: (a) ARPA +10 %, (b) CM % from 35 % to 40 %, (c) churn from 8 % to 4 %. Finally: does halving churn also double a *36-month capped* LTV? Expected: numbers printed, predictions asserted.

*Hint: [Appendix A](#hint-3) · Solution: [Appendix B](#solution-3)*

### Exercise 4 · Three-box LTV by signup quarter

**Pattern:** cohort LTV with maturity · **Format:** write the query · **Target time:** about 12 minutes.

For all channels together, compute LTV after the first three boxes (month index 0–2) per signup *quarter* of 2025: columns `signup_quarter, customers, ltv_3_boxes` (2 decimals). Only include customers whose cohort has reached month index 2 by March 2026. Expected properties: four rows; the denominator includes customers who left after one box; a plain-Python recomputation from raw rows agrees.

*Hint: [Appendix A](#hint-4) · Solution: [Appendix B](#solution-4)*

### Exercise 5 · Payback for the first-half 2025 cohorts, with matching CAC

**Pattern:** CAC payback from cohort data · **Format:** write the query (take-home style, ties to the lab) · **Target time:** about 15 minutes.

Use only customers who signed up January–June 2025, and CAC from spend in the same months. Per paid channel, return `channel, cac, payback_months`, where payback is the first month index *k* (plus 1) at which cumulative contribution per acquired customer reaches CAC. All these cohorts are at least 9 months old. Expected properties: four rows; referral pays back first; a Python loop over the same rows gives the same months.

*Hint: [Appendix A](#hint-5) · Solution: [Appendix B](#solution-5)*

### Exercise 6 · MTTR by asset type, with the traps handled

**Pattern:** MTTR from an incidents table · **Format:** write the query · **Target time:** about 8 minutes.

Per `asset_type`, return `incidents`, `open_incidents`, `mttr_recover_h` (mean, started → mitigated) and `median_recover_h`, both 2 decimals, straight from `incidents` and `assets`. Expected properties: the merged duplicate ticket is not counted (the service type has 5 incidents, not 6); the conveyor’s mean is well above its median; open incidents are counted, not hidden.

*Hint: [Appendix A](#hint-6) · Solution: [Appendix B](#solution-6)*

> **The main idea:** the unit-economics exercises all turn on one rule: numerator and denominator must describe the same customers, cohorts, and period.

---

<a id="slide-18"></a>
## 18. Exercises 7–11 · SLAs, availability, MTBF, flow, and DC Ops

*Exercises · interview-level and stretch*

Exercises 7–10 use the Leafy Box database and the `incident_clock` view (lesson 9); exercise 11 brings its own fixture. Hints and solutions are collapsed (Appendices A and B in the Markdown companion). Every solution ran during the build and its `assert` lines passed.

### Exercise 7 · SLA attainment by month, open tickets included

**Pattern:** SLA compliance with a denominator decision · **Format:** write the query · **Target time:** about 10 minutes.

Using `incident_clock` and `sla_targets`, return one row per month of `detected_at` (January–March 2026) with `met, breached, pending, attainment`. The SLA clock runs from detection to resolution; the data cut-off is 1 April 2026 00:00; an open ticket past its target is breached, an open ticket within target is pending. Expected properties: three rows; March has one pending ticket and one breached open ticket; a Python recomputation agrees.

*Hint: [Appendix A](#hint-7) · Solution: [Appendix B](#solution-7)*

### Exercise 8 · Monthly availability SLO for the packing lines

**Pattern:** availability per period, clipping intervals, error budget · **Format:** write the query · **Target time:** about 12 minutes.

Operations sets an internal SLO of **98 % monthly availability** for each packing line. Return one row per line and month (Q1 2026): `asset_name, month, down_h, availability, budget_used`. Downtime runs from `started_at` to `mitigated_at` (or the cut-off), clipped to month boundaries. Expected properties: six rows; each line’s three monthly downtimes add up to its quarterly downtime from lesson 10.

*Hint: [Appendix A](#hint-8) · Solution: [Appendix B](#solution-8)*

### Exercise 9 · Find the bugs in a fleet MTBF query

**Pattern:** MTBF population and exposure · **Format:** find and fix the bugs · **Target time:** about 10 minutes.

A colleague reports MTBF per asset type for Q1 2026 as the average gap between one failure’s mitigation and the next failure’s start. Name three problems, then compute MTBF per asset type as total operating hours ÷ total failures (2,160 hours per asset, downtime as in lesson 10). Expected: the label-printer fleet’s MTBF rises substantially once the fixed definition is used.

*SQL · the colleague’s fleet MTBF*

```sql
WITH gaps AS (
    SELECT a.asset_type,
           date_diff('minute', LAG(i.mitigated_at) OVER (PARTITION BY i.asset_id ORDER BY i.started_at),
                     i.started_at) / 60 AS gap_h
    FROM incidents i JOIN assets a USING (asset_id)
)
SELECT asset_type, ROUND(AVG(gap_h), 1) AS mtbf_h, MIN(gap_h) AS smallest_gap_h
FROM gaps
GROUP BY asset_type
ORDER BY asset_type;
```

Result (4 rows):

| asset_type | mtbf_h | smallest_gap_h |
|---|---|---|
| conveyor | 246.1 | 75.1 |
| label_printer | 182 | 2.95 |
| packing_line | 124.6 | 17.38333333 |
| service | 173.6 | -1.833333333 |

*Hint: [Appendix A](#hint-9) · Solution: [Appendix B](#solution-9)*

### Exercise 10 · Little’s law: predict a WIP cap, then check a week

**Pattern:** throughput, WIP, cycle time · **Format:** predict, then verify · **Target time:** about 10 minutes.

(a) The warehouse receives about 27 boxes a day, and operations wants boxes to spend 24 hours in the warehouse on average. Predict the average WIP that implies. (b) For the week Monday 16 – Sunday 22 March, measure the arrival rate (boxes released per hour), the average cycle time of boxes released that week, and the average WIP sampled every hour of that week. Expected: λ × W agrees with the measured WIP within 15 %.

*Hint: [Appendix A](#hint-10) · Solution: [Appendix B](#solution-10)*

### Exercise 11 · Design a break-fix scorecard for a data-centre team

**Pattern:** ops scorecard design, clock pauses · **Format:** design, then compute on a fixture · **Target time:** about 15 minutes.

A DC Ops team’s break-fix tickets have a priority, `created_at`, an optional wait for vendor parts (`wait_start`, `wait_end`), and `returned_at` (device back in production, NULL while open). The contract: P1 within 8 hours and P2 within 24 hours of *active* time; the SLA clock pauses while waiting for parts. Data cut-off: 31 March 18:00. (1) State the grain and the two clocks. (2) On the six-ticket fixture below, compute MTTR (total, active, waiting) over closed tickets and SLA attainment with and without the pause. Expected: attainment 0.6 with the pause and 0.2 without.

*Hint: [Appendix A](#hint-11) · Solution: [Appendix B](#solution-11)*

> **The main idea:** ops exercises all turn on two choices: which clocks, and which population (open tickets, zero-failure assets, quiet months, paused time).

---

<a id="slide-19"></a>
## 19. Cheat sheet and glossary

*Reference · one page to keep open, and every new term*

| Metric | Formula | Population and grain | Trap |
|---|---|---|---|
| Contribution margin | revenue − refunds − variable costs (per unit); CM % = CM ÷ net revenue | Paid units of real customers | Failed payments, test accounts; say which costs (CM1/CM2/CM3) |
| CAC | acquisition spend ÷ new customers, same channel and period | Paid: per channel. Blended: all spend ÷ all new | Blended labelled as paid; spend lag; attribution rule |
| Formula LTV | ARPA × CM % ÷ monthly churn; capped: Σ (1 − churn)t discounted | Current subscribers | Revenue instead of margin; tiny churn ⇒ huge LTV |
| Cohort LTVk | cumulative contribution to month k ÷ customers acquired | Cohorts that reached month k | Survivors in the denominator; immature cohorts |
| LTV/CAC | LTV ÷ CAC (same channel, comparable horizon) | Per channel | Benchmarks (≈ 3) out of context |
| CAC payback | simple: CAC ÷ (ARPA × CM %); cohort: first k with LTVk ≥ CAC | Per channel | Simple version ignores churn and first-box loss |
| MTTD / MTTA | detected − started; acknowledged − detected | Real incidents (no duplicates) | Started time is often estimated |
| MTTR | name the R: recover = mitigated − started; resolve = resolved − detected | Incidents that reached the end state | Open incidents hidden; mean without median |
| MTBF / AFR | operating hours ÷ failures; AFR = failures ÷ device-years | Asset inventory, incl. zero failures | Gaps between failures; dropped idle assets |
| Availability | uptime ÷ total time = MTBF ÷ (MTBF + MTTR) | Per asset or service per period | Outages across period boundaries; maintenance rule |
| SLA attainment | met ÷ (met + breached) | Tickets with a target; open past target = breached | Open breaches dropped; clock pauses |
| Error budget | (1 − SLO) × period length; used = downtime ÷ budget | Per service per period | Months of different lengths |
| Throughput / productivity | completed ÷ time on a date spine; Σ output ÷ Σ labour hours | Calendar with working-day flags | Zero days missing; mean of daily rates |
| Little’s law | WIP = arrival rate × cycle time | Stable process, consistent units | Units mixed; short windows |

**Metric cheat sheet for five business models** (headline metrics are taught in *Business models and metrics*; unit-economics and ops columns in this deck):

| Model | Headline metrics | Unit economics | Operations metrics |
|---|---|---|---|
| Commerce (e-commerce, retail) | Net sales, orders, AOV, conversion, repeat rate | CM per order (CM1/CM2), CAC, cohort LTV, payback | On-time delivery, fulfilment cycle time, throughput per labour hour |
| SaaS and subscriptions | MRR/ARR, MRR bridge, logo and revenue churn, GRR, NRR | ARPA, CM %, formula and cohort LTV, LTV/CAC, CAC payback | Availability SLO, error budget, incident MTTR, support SLA attainment |
| Marketplace | GMV, net revenue, take rate, liquidity, sell-through | Contribution per order after incentives; CAC per side (buyers, sellers) | Dispute resolution SLA, time to first sale, listing throughput |
| Product (consumer app) | DAU/WAU/MAU, stickiness, funnel conversion, retention cohorts | Revenue and CM per active user, CAC per install, payback | Crash-free sessions, latency percentiles, availability SLO |
| Operations (warehouse, data centre, service desk) | Volume, backlog, on-time %, percentiles | Cost per unit handled, cost per ticket | MTTR, MTBF/AFR, availability, SLA attainment, throughput, cycle time, WIP |

| Term | Meaning |
|---|---|
| Unit economics | Revenue and cost measured per unit (order, box, customer) instead of company totals. |
| Contribution margin (CM) | Revenue minus refunds minus variable costs of a unit; what is left for acquisition, fixed costs, and profit. |
| Variable cost / fixed cost | Costs that grow with each extra unit / costs that do not (rent, salaries). |
| Gross margin | Revenue minus the cost of goods sold only. |
| CM1, CM2, CM3 | Contribution after goods; after goods and fulfilment; after marketing as well. |
| Acquisition channel | The route by which a customer first arrived (paid search, social, referral, organic…). |
| Attribution | The rule that assigns a customer to one channel (first touch, last touch, …). |
| CAC | Customer acquisition cost: acquisition spend ÷ new customers for the same channel and period. |
| Paid / blended / fully loaded CAC | Paid channels only / all spend over all new customers / including people and tools. |
| ARPA | Average revenue per account: MRR ÷ active subscribers. |
| LTV (CLV) | Expected total contribution of a customer over the relationship. |
| Formula LTV | ARPA × CM % ÷ churn; assumes constant churn and margin. |
| Cohort LTV (observed LTV) | Cumulative contribution per acquired customer by month since acquisition, over mature cohorts. |
| Acquisition cohort | Customers grouped by when (and here, through which channel) they were acquired. |
| Discounting | Valuing future money less than money today, at a stated rate. |
| LTV/CAC ratio | Lifetime contribution per customer ÷ acquisition cost. |
| CAC payback period | Months until cumulative contribution per customer covers CAC. |
| Incident | An unplanned interruption or degradation of a service or asset. |
| MTTD / MTTA | Mean time to detect / to acknowledge. |
| MTTR | Mean time to repair, recover/restore, resolve, or respond: always name which. |
| MTBF / MTTF | Mean time between failures (repairable) / to failure (non-repairable). |
| AFR | Annualised failure rate: failures ÷ device-years in service. |
| Availability | Share of time an asset or service can do its job: uptime ÷ total time. |
| Censored observation | A value cut off before its outcome (open incident, never-failed asset, young cohort). |
| Accumulating snapshot | A fact table with one row per process instance, updated as milestones happen. |
| SLI / SLO / SLA | Measured indicator / internal objective / external agreement with consequences. |
| SLA attainment | Share of eligible items that met their target: met ÷ (met + breached). |
| Error budget | The amount of failure an SLO allows in a period, e.g. 0.5 % of a month. |
| Throughput / productivity | Completed units per time / per unit of input (e.g. labour hour). |
| Cycle time / WIP | Time from start to finish of one unit / units started but not finished. |
| Little’s law | Average WIP = arrival rate × average cycle time, for a stable process. |
| Date spine | A generated list of every period, so periods with no rows still appear. |

---

<a id="slide-20"></a>
## 20. Recap and references

*Reference · what to remember, and where to read more*

1. Unit economics use **contribution margin**, not revenue: revenue − refunds − variable costs per unit.
2. **CAC** = spend ÷ new customers for the same channel and period; label paid, blended, or fully loaded, and the attribution rule.
3. **Formula LTV** (ARPA × CM % ÷ churn) is a quick estimate; cap and discount it, and show its inputs.
4. **Cohort LTV** divides cumulative contribution by everyone acquired, over mature cohorts only, with cohort counts shown.
5. Decide on **LTV/CAC and cohort payback together**; benchmarks (≈ 3, under 12 months) are rules of thumb in context.
6. **MTTR** means nothing until you name the two timestamps; report the median and the open count.
7. **MTBF and availability** need the asset inventory as the population; availability = MTBF ÷ (MTBF + MTTR).
8. **SLA attainment** = met ÷ (met + breached), with open tickets past target as breaches; SLOs become error budgets.
9. **Throughput** lives on a date spine; productivity is a ratio of sums; Little’s law checks WIP, arrivals, and cycle time.

#### Practice plan

- Day 1: lessons 4–8, exercises 1–5; explain formula vs cohort LTV aloud in one minute.
- Day 2: lessons 9–13, exercises 6–11; write a spec card for one metric from your own team.
- Day 3: the lab, then the interview questions without looking. Further practice: [unit-economics case interviews](https://www.hackingthecaseinterview.com/pages/unit-economics-case-interview), [DataLemur SQL interview questions](https://datalemur.com/questions).

#### Where these come back

- dbt: each scorecard becomes a mart with tests (dbt decks).
- Semantic layer: CAC, LTV, MTTR as certified metrics with owners.
- Fuel Smart: pipeline MTTR and a data-freshness SLA on your portfolio dashboard.

- [a16z: 16 startup metrics (LTV, CAC, payback)](https://a16z.com/16-startup-metrics/) · definitions of LTV, CAC, blended vs paid CAC, and payback, with the common mistakes.
- [Stripe: subscription analytics](https://docs.stripe.com/billing/subscriptions/analytics) · how a billing provider defines MRR, churn, and subscriber metrics.
- [Customer lifetime value](https://en.wikipedia.org/wiki/Customer_lifetime_value), [Contribution margin](https://en.wikipedia.org/wiki/Contribution_margin), [Customer acquisition cost](https://en.wikipedia.org/wiki/Customer_acquisition_cost) · formulas and terminology.
- [Atlassian: common incident management metrics](https://www.atlassian.com/incident-management/kpis/common-metrics) · MTTR variants, MTBF, MTTA, MTTF in incident management.
- [Google SRE book: service level objectives](https://sre.google/sre-book/service-level-objectives/) and [Google SRE workbook: error budget policy](https://sre.google/workbook/error-budget-policy/) · SLIs, SLOs, SLAs, and how teams use error budgets.
- [Azure Well-Architected: reliability metrics](https://learn.microsoft.com/en-us/azure/well-architected/reliability/metrics) · availability targets, MTTR and MTBF in Azure workload design.
- [Microsoft: SLAs for Online Services](https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services) · what a real SLA document looks like (uptime definitions, exclusions, credits).
- [DORA: the four key metrics](https://dora.dev/guides/dora-metrics-four-keys/) · time to restore service as a software-delivery metric.
- [Kimball: accumulating snapshot fact table](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/accumulating-snapshot-fact-table/) · the table shape for incident and ticket lifecycles.
- [Little’s law](https://en.wikipedia.org/wiki/Little%27s_law) · the law, its assumptions, and examples.
- [DuckDB: window functions](https://duckdb.org/docs/stable/sql/functions/window_functions), [DuckDB: date functions](https://duckdb.org/docs/stable/sql/functions/date), [DuckDB: list functions (range, generate_series)](https://duckdb.org/docs/stable/sql/functions/list) · the DuckDB features used in every query.
- [T-SQL: DATEDIFF](https://learn.microsoft.com/en-us/sql/t-sql/functions/datediff-transact-sql) and [Spark SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html) · porting the date arithmetic to SQL Server and Spark.

**How this deck was tested:** every query and Python block ran during the build on DuckDB 1.5.6 and CPython 3.12.10; the lab’s 6 tests pass against the reference solution. The data is synthetic and deterministic (seed 20260331).

---

<a id="appendix-a"></a>
## Appendix A · Hints

Try each exercise before opening its hint; open the solution only after an honest attempt.

<a id="hint-1"></a>
### Hint 1 · Contribution margin per recurring box, from raw tables

Which billing rows are not revenue, and which customers are not customers? “Recurring” means the bill month is after the signup month: `date_diff('month', …)` on the truncated signup date.

<a id="hint-2"></a>
### Hint 2 · Predict, then compute: paid vs blended CAC for one quarter

Aggregate spend and customers *separately* by channel before joining them, so neither side multiplies the other. Organic customers have no spend row; brand spend has no customers.

<a id="hint-3"></a>
### Hint 3 · Which lever doubles LTV?

Churn is in the denominator. The capped version is a finite geometric sum.

<a id="hint-4"></a>
### Hint 4 · Three-box LTV by signup quarter

Build the per-customer contribution for months 0–2 with a `LEFT JOIN` from the customer list (so leavers keep a row), then group by quarter. Every 2025 cohort is mature for month 2.

<a id="hint-5"></a>
### Hint 5 · Payback for the first-half 2025 cohorts, with matching CAC

Restricting to January–June makes every cohort mature up to month index 8 at least, so you can cumulate without a per-*k* eligibility filter up to *k* = 8. Use a running `SUM` over month index.

<a id="hint-6"></a>
### Hint 6 · MTTR by asset type, with the traps handled

Which column marks a duplicate? `AVG` and `MEDIAN` skip NULL durations, so count open incidents separately.

<a id="hint-7"></a>
### Hint 7 · SLA attainment by month, open tickets included

Give each ticket a status in a CTE first; then count statuses with `FILTER`. The denominator is met + breached.

<a id="hint-8"></a>
### Hint 8 · Monthly availability SLO for the packing lines

Cross join months with lines to get the grid (so a quiet month still appears), clip outages in an inner join, then `LEFT JOIN` the pieces back to the grid. Hours in a month: `date_diff('hour', m_start, m_end)`.

<a id="hint-9"></a>
### Hint 9 · Find the bugs in a fleet MTBF query

Which asset is missing from `incidents`? What happens to the hours before the first failure and after the last? Look at the `smallest_gap_h` of the service.

<a id="hint-10"></a>
### Hint 10 · Little’s law: predict a WIP cap, then check a week

L = λW with consistent units (hours). A week is a shorter window than a month, so boxes crossing the week boundaries make the check approximate.

<a id="hint-11"></a>
### Hint 11 · Design a break-fix scorecard for a data-centre team

Active hours = (returned or cut-off − created) − waiting hours. Open tickets: breached if active time already exceeds the target, pending otherwise.

---

<a id="appendix-b"></a>
## Appendix B · Solutions

Every solution below was executed during the build; the test lines (`assert`) passed.

<a id="solution-1"></a>
### Solution 1 · Contribution margin per recurring box, from raw tables

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

mine = con.execute("""
    SELECT b.plan, COUNT(*) AS boxes,
           ROUND(AVG(b.revenue - b.refund - b.product_cost - b.shipping_cost - b.payment_fee), 2),
           ROUND(SUM(b.revenue - b.refund - b.product_cost - b.shipping_cost - b.payment_fee)
                 / SUM(b.revenue - b.refund), 3)
    FROM billing b JOIN customers c USING (customer_id)
    WHERE b.status = 'paid' AND NOT c.is_test
      AND b.bill_month BETWEEN DATE '2026-01-01' AND DATE '2026-03-01'
      AND date_diff('month', date_trunc('month', c.signup_date), b.bill_month) > 0
    GROUP BY b.plan ORDER BY b.plan""").fetchall()
for row in mine:
    print(row)
check = con.execute("""
    SELECT plan, COUNT(*), ROUND(AVG(contribution), 2), ROUND(SUM(contribution) / SUM(net_revenue), 3)
    FROM box_margin WHERE bill_month BETWEEN DATE '2026-01-01' AND DATE '2026-03-01' AND month_index > 0
    GROUP BY plan ORDER BY plan""").fetchall()
assert mine == check and len(mine) == 2
assert mine[0][0] == "large" and mine[0][2] > mine[1][2]
```

Output:

```text
('large', 940, 14.6, 0.374)
('small', 1114, 7.84, 0.322)
```

**Why it works.** Contribution is computed per paid box from its own cost columns; the filters remove failed attempts and QA subscribers, and `month_index > 0` drops the discounted first box. CM % is a ratio of sums, so big boxes weigh more. **Common wrong answer:** no `status` filter, which adds failed attempts as revenue with zero cost and inflates both columns. **Interviewer follow-up:** “Show CM1 and CM2.” → CM1 subtracts only `product_cost`; CM2 also shipping and payment fees; keep the cost columns separate so both come from the same rows.

<a id="solution-2"></a>
### Solution 2 · Predict, then compute: paid vs blended CAC for one quarter

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

q4 = "BETWEEN DATE '2025-10-01' AND DATE '2025-12-31'"
rows = con.execute(f"""
    WITH s AS (SELECT channel, SUM(spend) AS spend FROM marketing_spend WHERE spend_month {q4} GROUP BY channel),
         n AS (SELECT channel, COUNT(*) AS n FROM customers WHERE NOT is_test AND signup_date {q4} GROUP BY channel)
    SELECT channel, s.spend, n.n, ROUND(s.spend / NULLIF(n.n, 0), 2) AS cac
    FROM s JOIN n USING (channel)
    ORDER BY cac""").fetchall()
for r in rows:
    print(r)
paid = float(sum(r[1] for r in rows)) / sum(r[2] for r in rows)
all_spend = con.execute(f"SELECT SUM(spend) FROM marketing_spend WHERE spend_month {q4}").fetchone()[0]
all_new = con.execute(f"SELECT COUNT(*) FROM customers WHERE NOT is_test AND signup_date {q4}").fetchone()[0]
blended = float(all_spend) / all_new
print(f"paid CAC {paid:.2f} | blended CAC {blended:.2f}")
assert len(rows) == 4 and blended < paid
```

Output:

```text
('referral', Decimal('810.00'), 54, 15.0)
('paid_social', Decimal('2709.69'), 69, 39.27)
('paid_search', Decimal('4301.79'), 68, 63.26)
('influencer', Decimal('3004.82'), 38, 79.07)
paid CAC 47.28 | blended CAC 43.92
```

**Why.** Blended CAC adds $2,700 of brand spend to the numerator but about a quarter of all new customers (organic, free) to the denominator; the free customers win, so blended is lower. The `JOIN` drops `brand_podcast` and `organic` on purpose: neither has a paid CAC. **Common wrong answer:** joining `marketing_spend` to `customers` row by row and summing spend, which multiplies each month’s spend by its number of customers (a fan-out). **Interviewer follow-up:** “Marketing says blended is the real number.” → both are real; they answer different questions. Show both, labelled.

<a id="solution-3"></a>
### Solution 3 · Which lever doubles LTV?

```python
def ltv(arpa, cm, churn, months=None):
    m = arpa * cm
    return m / churn if months is None else m * sum((1 - churn) ** t for t in range(months))

base = ltv(32, 0.35, 0.08)
options = {"ARPA +10 %": ltv(35.2, 0.35, 0.08), "CM 40 %": ltv(32, 0.40, 0.08), "churn 4 %": ltv(32, 0.35, 0.04)}
print(f"base {base:.2f}")
for name, v in options.items():
    print(f"{name:11} {v:7.2f}  x{v / base:.2f}")
capped_ratio = ltv(32, 0.35, 0.04, 36) / ltv(32, 0.35, 0.08, 36)
print(f"36-month cap: halving churn multiplies LTV by {capped_ratio:.2f}")
assert abs(options["churn 4 %"] / base - 2) < 1e-9
assert 1 < capped_ratio < 2
```

Output:

```text
base 140.00
ARPA +10 %   154.00  x1.10
CM 40 %      160.00  x1.14
churn 4 %    280.00  x2.00
36-month cap: halving churn multiplies LTV by 1.62
```

**Why.** Textbook LTV = 32 × 0.35 ÷ 0.08 = $140; only halving churn doubles it, because expected lifetime 1 ÷ churn goes from 12.5 to 25 months. Under a 36-month cap the gain is smaller, since the extra lifetime beyond 36 months no longer counts. **Common wrong answer:** “all three help about the same”: price and margin enter linearly, churn inversely. **Interviewer follow-up:** “So should we only work on churn?” → churn changes compound slowly and are hard to move; compare the cost of each lever, and measure retention by cohort before believing a formula.

<a id="solution-4"></a>
### Solution 4 · Three-box LTV by signup quarter

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

rows = con.execute("""
    WITH acquired AS (
        SELECT customer_id, date_trunc('quarter', signup_date)::DATE AS signup_quarter
        FROM customers
        WHERE NOT is_test AND signup_date < DATE '2026-01-01'
          AND date_trunc('month', signup_date) + INTERVAL 2 MONTH <= DATE '2026-03-01'
    ), per_customer AS (
        SELECT a.customer_id, a.signup_quarter, COALESCE(SUM(b.contribution), 0) AS cm
        FROM acquired a LEFT JOIN box_margin b
          ON b.customer_id = a.customer_id AND b.month_index <= 2
        GROUP BY a.customer_id, a.signup_quarter
    )
    SELECT signup_quarter, COUNT(*) AS customers, ROUND(AVG(cm), 2) AS ltv_3_boxes
    FROM per_customer GROUP BY signup_quarter ORDER BY signup_quarter""").fetchall()
for r in rows:
    print(r)

# independent check in plain Python
from collections import defaultdict
cust = {cid: d for cid, d in con.execute(
    "SELECT customer_id, signup_date FROM customers WHERE NOT is_test AND signup_date < DATE '2026-01-01'").fetchall()}
total = defaultdict(float)
for cid, mi, cm in con.execute("SELECT customer_id, month_index, contribution FROM box_margin").fetchall():
    if cid in cust and mi <= 2:
        total[cid] += float(cm)
by_q = defaultdict(list)
for cid, d in cust.items():
    by_q[(d.year, (d.month - 1) // 3 + 1)].append(total[cid])
py = [round(sum(v) / len(v), 2) for k, v in sorted(by_q.items())]
assert len(rows) == 4 and all(abs(float(r[2]) - v) < 0.006 for r, v in zip(rows, py))
```

Output:

```text
(datetime.date(2025, 1, 1), 214, 14.78)
(datetime.date(2025, 4, 1), 236, 13.08)
(datetime.date(2025, 7, 1), 273, 13.91)
(datetime.date(2025, 10, 1), 308, 13.92)
```

**Why it works.** The customer list is the population, so a customer with one (loss-making) box counts with their small or negative total. Averaging per-customer totals equals Σ contribution ÷ customers. **Common wrong answer:** starting from `box_margin` and dividing by `COUNT(DISTINCT customer_id)` in month 2, which keeps only survivors (bug clinic 1). **Interviewer follow-up:** “Now 12-box LTV per quarter.” → Q2–Q4 2025 cohorts are not mature for month 11 yet; show only Q1, or show “not yet” rather than a partial number.

<a id="solution-5"></a>
### Solution 5 · Payback for the first-half 2025 cohorts, with matching CAC

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

rows = con.execute("""
    WITH h1 AS (SELECT customer_id, channel FROM customers
                WHERE NOT is_test AND signup_date BETWEEN DATE '2025-01-01' AND DATE '2025-06-30'),
    cac AS (SELECT s.channel, SUM(s.spend) / (SELECT COUNT(*) FROM h1 WHERE h1.channel = s.channel) AS cac
            FROM marketing_spend s
            WHERE s.spend_month <= DATE '2025-06-01' AND s.channel IN (SELECT channel FROM h1)
            GROUP BY s.channel),
    per_k AS (SELECT h1.channel, b.month_index AS k, SUM(b.contribution) AS cm
              FROM h1 JOIN box_margin b USING (customer_id)
              WHERE b.month_index <= 8 GROUP BY ALL),
    cum AS (SELECT channel, k,
                   SUM(cm) OVER (PARTITION BY channel ORDER BY k)
                     / (SELECT COUNT(*) FROM h1 WHERE h1.channel = per_k.channel) AS ltv
            FROM per_k)
    SELECT c.channel, ROUND(c.cac, 2) AS cac, MIN(cum.k) FILTER (WHERE cum.ltv >= c.cac) + 1 AS payback_months
    FROM cac c JOIN cum USING (channel)
    GROUP BY c.channel, c.cac ORDER BY payback_months NULLS LAST, c.channel""").fetchall()
for r in rows:
    print(r)

# the same with a Python loop
from collections import defaultdict
ch_of = dict(con.execute("""SELECT customer_id, channel FROM customers WHERE NOT is_test
                            AND signup_date BETWEEN DATE '2025-01-01' AND DATE '2025-06-30'""").fetchall())
n = defaultdict(int)
for ch in ch_of.values():
    n[ch] += 1
cm = defaultdict(float)
for cid, k, c in con.execute("SELECT customer_id, month_index, contribution FROM box_margin WHERE month_index <= 8").fetchall():
    if cid in ch_of:
        cm[(ch_of[cid], k)] += float(c)
for ch, cac, months in rows:
    running, found = 0.0, None
    for k in range(9):
        running += cm[(ch, k)]
        if found is None and running / n[ch] >= float(cac):
            found = k + 1
    assert found == months, (ch, found, months)
assert rows[0][0] == "referral" and len(rows) == 4
```

Output:

```text
('referral', 15.0, 3)
('influencer', 76.78, None)
('paid_search', 65.06, None)
('paid_social', 40.02, None)
```

**Why it works.** CAC and LTV now describe the same customers: spend in January–June against signups in January–June. The running sum gives cumulative contribution by month; dividing by everyone acquired keeps churn in the result; `MIN(k) FILTER (…)` finds the first month at or above CAC. Only referral pays back within the 9 observed months; the paid channels return NULL, consistent with the 10–11-month cohort paybacks of lesson 8. Influencer has only April–June 2025 here, so treat its number with care. **Common wrong answer:** lifetime spend ÷ H1 customers (a CAC from a different population), or a running sum divided by surviving customers. **Interviewer follow-up:** “What if payback is beyond the observed months?” → return NULL and say “not within 9 months”; never extrapolate silently.

<a id="solution-6"></a>
### Solution 6 · MTTR by asset type, with the traps handled

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

rows = con.execute("""
    SELECT a.asset_type,
           COUNT(*)                                       AS incidents,
           COUNT(*) FILTER (WHERE i.resolved_at IS NULL)  AS open_incidents,
           ROUND(AVG(date_diff('minute', i.started_at, i.mitigated_at) / 60), 2)    AS mttr_recover_h,
           ROUND(MEDIAN(date_diff('minute', i.started_at, i.mitigated_at) / 60), 2) AS median_recover_h
    FROM incidents i JOIN assets a USING (asset_id)
    WHERE i.merged_into IS NULL
    GROUP BY a.asset_type
    ORDER BY a.asset_type""").fetchall()
for r in rows:
    print(r)
t = {r[0]: r for r in rows}
raw_service = con.execute("SELECT COUNT(*) FROM incidents WHERE asset_id = 6").fetchone()[0]
assert t["service"][1] == 5 and raw_service == 6
assert t["conveyor"][3] > 2 * t["conveyor"][4]
assert sum(r[2] for r in rows) == 2
```

Output:

```text
('conveyor', 6, 0, 6.68, 1.5)
('label_printer', 12, 1, 1.94, 1.38)
('packing_line', 32, 1, 3.25, 2.13)
('service', 5, 0, 1.68, 1.83)
```

**Why it works.** `merged_into IS NULL` keeps one row per real incident; recover time uses the agreed clocks; the median shows the typical incident while the mean carries the 30-hour spare-part wait. **Common wrong answer:** counting every ticket, which double-counts the January checkout outage: the service shows 6 incidents, and that outage weighs twice in the mean. **Interviewer follow-up:** “Leadership wants one MTTR number.” → give the median recovery for sev1 and sev2 with the mean and count beside it, and state which R.

<a id="solution-7"></a>
### Solution 7 · SLA attainment by month, open tickets included

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

rows = con.execute("""
    WITH s AS (
        SELECT date_trunc('month', c.detected_at)::DATE AS month,
               CASE WHEN c.resolved_at IS NOT NULL AND c.hours_to_resolve <= t.target_hours THEN 'met'
                    WHEN c.resolved_at IS NOT NULL THEN 'breached'
                    WHEN date_diff('minute', c.detected_at, TIMESTAMP '2026-04-01') / 60 > t.target_hours THEN 'breached'
                    ELSE 'pending' END AS status
        FROM incident_clock c JOIN sla_targets t USING (severity))
    SELECT month,
           COUNT(*) FILTER (WHERE status = 'met')      AS met,
           COUNT(*) FILTER (WHERE status = 'breached') AS breached,
           COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
           ROUND(met / NULLIF(met + breached, 0), 3)   AS attainment
    FROM s GROUP BY month ORDER BY month""").fetchall()
for r in rows:
    print(r)

from datetime import datetime
cutoff = datetime(2026, 4, 1)
target = dict(con.execute("SELECT severity, target_hours FROM sla_targets").fetchall())
py = {}
for sev, det, res in con.execute("SELECT severity, detected_at, resolved_at FROM incidents WHERE merged_into IS NULL").fetchall():
    hours = ((res or cutoff) - det).total_seconds() / 3600
    status = "met" if res and hours <= target[sev] else "breached" if hours > target[sev] else "pending"
    py.setdefault(det.month, []).append(status)
for month, met, breached, pending, _ in rows:
    assert [py[month.month].count(x) for x in ("met", "breached", "pending")] == [met, breached, pending]
assert rows[2][3] == 1 and len(rows) == 3
```

Output:

```text
(datetime.date(2026, 1, 1), 17, 1, 0, 0.944)
(datetime.date(2026, 2, 1), 22, 1, 0, 0.957)
(datetime.date(2026, 3, 1), 12, 1, 1, 0.923)
```

**Why it works.** Status first, then counts: each ticket lands in exactly one bucket, and the open breach is counted even though it has no resolve time. Note that the Python check uses whole seconds and the SQL whole minutes; with these timestamps (all on the minute) they agree. **Common wrong answer:** `AVG(CASE WHEN hours_to_resolve <= target_hours THEN 1 ELSE 0 END)`, which scores the open breach and the pending ticket both as misses, or drops both. **Interviewer follow-up:** “Report it by resolution month instead.” → then open tickets have no month at all; that is why most teams report by the month the clock started and restate recent months.

<a id="solution-8"></a>
### Solution 8 · Monthly availability SLO for the packing lines

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

rows = con.execute("""
    WITH months AS (SELECT m AS m_start, m + INTERVAL 1 MONTH AS m_end
                    FROM (SELECT UNNEST(generate_series(TIMESTAMP '2026-01-01', TIMESTAMP '2026-03-01', INTERVAL 1 MONTH)) AS m)),
    grid AS (SELECT * FROM months CROSS JOIN (SELECT asset_id, asset_name FROM assets WHERE asset_type = 'packing_line')),
    pieces AS (
        SELECT g.asset_id, g.m_start,
               date_diff('second', GREATEST(i.started_at, g.m_start),
                         LEAST(COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01'), g.m_end)) / 3600 AS down_h
        FROM grid g JOIN incidents i
          ON i.asset_id = g.asset_id AND i.merged_into IS NULL
         AND i.started_at < g.m_end AND COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01') > g.m_start)
    SELECT g.asset_name, g.m_start::DATE AS month,
           ROUND(COALESCE(SUM(p.down_h), 0), 2) AS down_h,
           ROUND(1 - COALESCE(SUM(p.down_h), 0) / date_diff('hour', g.m_start, g.m_end), 4) AS availability,
           ROUND(COALESCE(SUM(p.down_h), 0) / (0.02 * date_diff('hour', g.m_start, g.m_end)), 2) AS budget_used
    FROM grid g LEFT JOIN pieces p ON p.asset_id = g.asset_id AND p.m_start = g.m_start
    GROUP BY g.asset_name, g.asset_id, g.m_start, g.m_end
    ORDER BY g.asset_name, month""").fetchall()
for r in rows:
    print(r, "SLO met" if r[3] >= 0.98 else "SLO MISSED")

quarter = dict(con.execute("""
    SELECT a.asset_name, SUM(date_diff('second', i.started_at,
               LEAST(COALESCE(i.mitigated_at, TIMESTAMP '2026-04-01'), TIMESTAMP '2026-04-01'))) / 3600
    FROM incidents i JOIN assets a USING (asset_id)
    WHERE a.asset_type = 'packing_line' AND i.merged_into IS NULL GROUP BY a.asset_name""").fetchall())
for line, total in quarter.items():
    assert abs(sum(float(r[2]) for r in rows if r[0] == line) - total) < 0.02
assert len(rows) == 6
```

Output:

```text
('packing_line_1', datetime.date(2026, 1, 1), 15.02, 0.9798, 1.01) SLO MISSED
('packing_line_1', datetime.date(2026, 2, 1), 19.78, 0.9706, 1.47) SLO MISSED
('packing_line_1', datetime.date(2026, 3, 1), 14.17, 0.981, 0.95) SLO met
('packing_line_2', datetime.date(2026, 1, 1), 18.28, 0.9754, 1.23) SLO MISSED
('packing_line_2', datetime.date(2026, 2, 1), 21.6, 0.9679, 1.61) SLO MISSED
('packing_line_2', datetime.date(2026, 3, 1), 13.58, 0.9817, 0.91) SLO met
```

**Why it works.** The grid guarantees a row for every line and month; clipping with `GREATEST`/`LEAST` inside an inner join assigns each outage’s minutes to the month they happened in; the sum over months reconciles with the quarter, which is the test that clipping neither lost nor double-counted time. A 98 % SLO leaves 2 % of a month (about 13–15 hours, depending on the month’s length) as error budget. **Common wrong answer:** assigning a whole outage to its start month, or the `LEFT JOIN` + `GREATEST` trap from the bug clinic. **Interviewer follow-up:** “Planned maintenance should not count.” → add a maintenance-window table and subtract its overlap from both downtime and the scheduled hours; write the rule on the spec card.

<a id="solution-9"></a>
### Solution 9 · Find the bugs in a fleet MTBF query

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

fixed = con.execute("""
    WITH down AS (
        SELECT asset_id, COUNT(*) AS failures,
               SUM(date_diff('second', started_at, LEAST(COALESCE(mitigated_at, TIMESTAMP '2026-04-01'),
                                                        TIMESTAMP '2026-04-01'))) / 3600 AS down_h
        FROM incidents WHERE merged_into IS NULL GROUP BY asset_id)
    SELECT a.asset_type, COUNT(*) AS assets, SUM(COALESCE(d.failures, 0)) AS failures,
           ROUND((2160 * COUNT(*) - SUM(COALESCE(d.down_h, 0))) / NULLIF(SUM(d.failures), 0), 1) AS mtbf_h
    FROM assets a LEFT JOIN down d USING (asset_id)
    GROUP BY a.asset_type ORDER BY a.asset_type""").fetchall()
for r in fixed:
    print(r)
wrong = dict((t, m) for t, m, _ in con.execute("""
    WITH gaps AS (SELECT a.asset_type, date_diff('minute', LAG(i.mitigated_at) OVER (PARTITION BY i.asset_id
                         ORDER BY i.started_at), i.started_at) / 60 AS gap_h
                  FROM incidents i JOIN assets a USING (asset_id))
    SELECT asset_type, ROUND(AVG(gap_h), 1), MIN(gap_h) FROM gaps GROUP BY asset_type""").fetchall())
f = {r[0]: r for r in fixed}
assert f["label_printer"][1] == 2 and f["label_printer"][3] > 1.5 * wrong["label_printer"]
assert f["service"][2] == 5
```

Output:

```text
('conveyor', 1, 6, 353.3)
('label_printer', 2, 12, 358.1)
('packing_line', 2, 32, 131.8)
('service', 1, 5, 430.3)
```

**The bugs.** (1) **Population:** starting from `incidents` drops `label_printer_2`, whose 2,160 failure-free hours are the best evidence of printer reliability. (2) **Exposure:** gaps between failures ignore the time before the first failure and after the last, so assets with few failures lose most of their operating hours. (3) **Duplicates:** the merged ticket creates a negative gap for the checkout (the duplicate starts before the original is mitigated). **Fix:** operating hours from the asset list minus downtime, divided by real failures, as a ratio of sums per type. **Interviewer follow-up:** “One asset joined the fleet in February.” → use its in-service date to compute its operating hours; exposure, not calendar time, is the denominator.

<a id="solution-10"></a>
### Solution 10 · Little’s law: predict a WIP cap, then check a week

```python
import duckdb
con = duckdb.connect("leafy_box.duckdb")

print("(a) WIP for 24 h average cycle time:", round(27 / 24 * 24), "boxes")
lam, w = con.execute("""
    SELECT COUNT(*) / 168.0,
           AVG(date_diff('second', released_at, COALESCE(shipped_at, TIMESTAMP '2026-04-01')) / 3600)
    FROM box_jobs
    WHERE released_at >= TIMESTAMP '2026-03-16' AND released_at < TIMESTAMP '2026-03-23'""").fetchone()
wip = con.execute("""
    SELECT AVG(n) FROM (
        SELECT h, COUNT(j.job_id) AS n
        FROM (SELECT UNNEST(generate_series(TIMESTAMP '2026-03-16 00:30', TIMESTAMP '2026-03-22 23:30',
                                            INTERVAL 1 HOUR)) AS h) hours
        LEFT JOIN box_jobs j
          ON j.released_at <= h AND COALESCE(j.shipped_at, TIMESTAMP '2026-04-01') > h
        GROUP BY h)""").fetchone()[0]
print(f"(b) lambda {lam:.3f}/h x W {w:.1f} h = {lam * w:.1f} boxes | measured WIP {wip:.1f}")
assert abs(lam * w - wip) / wip < 0.15
```

Output:

```text
(a) WIP for 24 h average cycle time: 27 boxes
(b) lambda 1.167/h x W 40.3 h = 47.0 boxes | measured WIP 47.3
```

**Why.** (a) λ = 27 per day = 1.125 per hour; L = 1.125 × 24 = 27 boxes. To get 24-hour cycle times without shipping faster, cap WIP near 27 and stop releasing work early. (b) Over one week the law holds approximately: boxes released the week before are still in the warehouse on Monday, and some released on Saturday leave after Sunday. Over a longer window, or in a stable process, the gap shrinks. **Common wrong answer:** mixing units (boxes per day × cycle hours). **Interviewer follow-up:** “Cycle time is up but throughput is flat; why?” → WIP went up: more work was started than finished; Little’s law makes that visible.

<a id="solution-11"></a>
### Solution 11 · Design a break-fix scorecard for a data-centre team

```python
import duckdb
db = duckdb.connect()
db.execute("""
    CREATE TABLE tickets AS SELECT * FROM (VALUES
      (1, 'P1', TIMESTAMP '2026-03-02 08:00', NULL::TIMESTAMP,         NULL::TIMESTAMP,         TIMESTAMP '2026-03-02 13:00'),
      (2, 'P1', TIMESTAMP '2026-03-05 22:00', TIMESTAMP '2026-03-06 01:00', TIMESTAMP '2026-03-07 09:00', TIMESTAMP '2026-03-07 13:00'),
      (3, 'P2', TIMESTAMP '2026-03-10 09:00', NULL, NULL,                                           TIMESTAMP '2026-03-11 15:00'),
      (4, 'P2', TIMESTAMP '2026-03-20 10:00', TIMESTAMP '2026-03-20 12:00', TIMESTAMP '2026-03-23 12:00', TIMESTAMP '2026-03-23 18:00'),
      (5, 'P1', TIMESTAMP '2026-03-31 07:00', NULL, NULL, NULL),
      (6, 'P2', TIMESTAMP '2026-03-31 12:00', NULL, NULL, NULL)
    ) AS t(ticket_id, priority, created_at, wait_start, wait_end, returned_at)""")
rows = db.execute("""
    WITH t AS (
        SELECT *, CASE priority WHEN 'P1' THEN 8 ELSE 24 END AS target_h,
               date_diff('minute', created_at, COALESCE(returned_at, TIMESTAMP '2026-03-31 18:00')) / 60 AS total_h,
               COALESCE(date_diff('minute', wait_start, wait_end) / 60, 0) AS waiting_h
        FROM tickets),
    s AS (
        SELECT *, total_h - waiting_h AS active_h,
               CASE WHEN total_h - waiting_h > target_h THEN 'breached'
                    WHEN returned_at IS NULL THEN 'pending' ELSE 'met' END AS with_pause,
               CASE WHEN total_h > target_h THEN 'breached'
                    WHEN returned_at IS NULL THEN 'pending' ELSE 'met' END AS without_pause
        FROM t)
    SELECT ROUND(AVG(total_h) FILTER (WHERE returned_at IS NOT NULL), 1)   AS mttr_total_h,
           ROUND(AVG(active_h) FILTER (WHERE returned_at IS NOT NULL), 1)  AS mttr_active_h,
           ROUND(AVG(waiting_h) FILTER (WHERE returned_at IS NOT NULL), 1) AS mean_waiting_h,
           ROUND(COUNT(*) FILTER (WHERE with_pause = 'met')
                 / COUNT(*) FILTER (WHERE with_pause <> 'pending'), 2)     AS attainment_with_pause,
           ROUND(COUNT(*) FILTER (WHERE without_pause = 'met')
                 / COUNT(*) FILTER (WHERE without_pause <> 'pending'), 2)  AS attainment_without_pause
    FROM s""").fetchone()
print(rows)
assert rows == (38.5, 12.5, 26.0, 0.6, 0.2)
```

Output:

```text
(38.5, 12.5, 26.0, 0.6, 0.2)
```

**Design.** Grain: one row per break-fix ticket (an accumulating snapshot with created, wait start/end, returned). Clocks: MTTR from `created_at` to `returned_at`, split into active and waiting; the SLA clock is active time only. Population: closed tickets for MTTR, all non-pending tickets for attainment. **Why the numbers differ:** two tickets were met only because the contract pauses the clock during vendor waits; without the pause they look like breaches. Mean total MTTR (38.5 h) is dominated by waiting for parts, so the lever is spare-part stock, not technician speed. **Common wrong answer:** one MTTR number that mixes waiting and hands-on time, which sends the team to fix the wrong thing. **Interviewer follow-up:** “A ticket waited for parts twice.” → store waits in a child table (one row per pause) and sum them per ticket.
