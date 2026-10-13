# Tracker and preparation plan review — October 5, 2026

The curriculum covers the major analytics engineering areas well. Its biggest gaps are prioritization, prerequisite order, realistic effort estimates, and evidence of retained ability. The app already supports ratings, practice checklists, resources, notes, time logs, themes, folder persistence and daily backups. Improve those foundations before expanding the resource library.

Scope: reviewed the full preparation plan and all four app source files, inspected the saved progress file, checked JavaScript syntax and roadmap references, and ran isolated logic probes with mocked browser and filesystem interfaces. This was not a visual browser or accessibility audit. The app and saved progress were not changed.

**What works well**

- SQL, dimensional modeling, dbt, data quality, metrics, Python, architecture and communication all have dedicated coverage.
- Definitions of done emphasize explainable ability and working deliverables, rather than resource consumption alone.
- One evolving portfolio project connects learning to practical work.
- Minimal initial setup and later topic-specific installations reduce startup friction.
- Local operation, Markdown notes, JSON exports and folder backups support ownership of the learning record.

**1. Fix the effort estimate and offer distinct paths**

The data contains 91 topics: 86 required and 5 optional. Required topic estimates sum to 504 hours; including optional topics gives 530 hours. The plan and `PLAN.effort` say 280–350 hours to analytics engineering readiness.

| Milestone | Sum of current topic estimates | At 10 hours/week |
|---|---:|---:|
| Setup | 2 h | 0.2 weeks |
| Foundations | 105 h | 10.5 weeks |
| Depth | 144 h | 14.4 weeks |
| Through the application checkpoint | 251 h cumulative | 25.1 weeks |
| Build at scale, required topics | 179 h | 17.9 weeks |
| Interview preparation, required topics | 74 h | 7.4 weeks |
| Entire required roadmap | 504 h | 50.4 weeks |

These are sums of the app's estimates, not predictions of your actual learning time. Learning topics and portfolio topics sometimes reuse the same work; clarify whether portfolio hours represent additional integration effort to avoid counting it twice.

Offer three selectable scopes:

- **AE application path:** SQL, dimensional modeling, dbt, one warehouse, tests, business metrics, one dashboard, one credible project, interview practice and career assets.
- **AI specialization:** semantic layer, agent and evaluation, added after a usable core project.
- **DE extension:** deeper Spark, Airflow, table formats, CDC and infrastructure.

The current optional switch removes only AI6, PL5, PL6, PL7 and CERT. It does not remove most DE or multi-platform workload. Let role and target job requirements determine scope, rather than requiring every platform.

Add an initial skills diagnostic and allow a demonstrated skill to satisfy a topic. Your documented existing software, Power BI, ADF and governance experience should shorten the path where you can provide evidence.

**2. Correct prerequisite order and checkpoint contradictions**

| Current requirement | Prerequisite currently later | Proposed correction |
|---|---|---|
| PF1 ingester at step 1.5 requires validation and pytest in CI | Py4 at 2.3 | Move basic ingester testing into phase 1, or defer those PF1 requirements |
| PF2 at 2.4 requires Auto Loader | SB4 and Databricks setup at 3.2 | Use local PySpark/Delta for PF2; add Auto Loader with SB4, or move SB4 earlier |
| PF4 at 3.1 requires Cosmos, alerts and DAG tests | AF3 at 3.2; AF4 at 4.1 | Move integration and testing before PF4 signoff |
| Phase 2 checkpoint requires at least six performance experiments | Distributed execution and materialization/cost labs occur in phase 3 | Require only experiments taught by phase 2; keep the full lab checkpoint later |
| Phase 3 checkpoint requires architecture documentation and decision records | PF10 formalizes these at 4.3 | Build these incrementally and move their signoff into phase 3 |
| Applications begin after phase 2 | Resume, LinkedIn and interview work mostly occur in phase 4 | Start basic career assets and light interview practice in phase 1–2 |

JOB1 and JOB2 depend on opportunities at work. Make equivalent personal-project evidence acceptable so employer access cannot block learning progress.

Introduce explicit `prerequisites` in the content model. Topics within a step are not always independent, despite the instruction to do them together. Break 30–40 hour steps into concrete weekly outcomes.

**3. Add depth through practical drills, not many new tracks**

Much of the following is touched on already; the missing piece is an explicit exercise and acceptance criterion.

| Area to strengthen | Concrete exercise |
|---|---|
| Historical and temporal correctness | Late-arriving dimension, unknown dimension member, SCD2 point-in-time join, retroactive correction and reopened PR |
| Incremental correctness | Compare incremental output with a full rebuild after duplicate, late, corrected and deleted records |
| Metric semantics | Distinguish event time from ingestion time, zero from missing data, bot from human activity, and mature from incomplete cohorts |
| CDC basics | Explain inserts, updates, deletes, ordering and replay; keep this core conceptual knowledge even if the Debezium lab remains optional |
| Safe model changes | Change a metric or schema, assess downstream impact, introduce a compatible transition, communicate the change and rehearse rollback |
| Business and BI delivery | Take a stakeholder question through a spec, metric, dashboard and acceptance check; test filter behavior, access and refresh |
| Financial modeling practice | Use a small second dataset for refunds, currencies and decimal rounding; GitHub events do not exercise these cases |
| AI evaluation | Include ambiguous questions, unsupported metrics, denied access, stale data, result tolerances, repeated runs, cost and latency |

Extend existing S8/D3/Q1, M3, BZ2/S5, D4/Q2, CM1/CM3 and AI4 rather than creating a large new curriculum. Replace blanket "every problem in SQL, pandas and PySpark" with selected comparison exercises after each tool has been introduced.

**4. Make the portfolio feasible and meaningful**

The project is asked to demonstrate ingestion, Spark, Delta, Iceberg, dbt, three fact types, SCD2, Airflow, observability, a semantic layer, an agent, warehouse AI functions, Snowflake portability, Terraform and 100 GB benchmarks. This can become a platform integration project before it answers a useful business question.

Define a first release around a decision, for example: "Which repositories have slowing PR review, and how does that relate to contributor retention?" Deliver a bounded dataset, relevant facts/dimensions, documented SQL metrics, tests and a dashboard. Add platform and AI extensions as separate releases.

GH Archive records public GitHub events, with payloads that may change. Define what can and cannot be inferred from the observed window. For example, an already-open PR at the window start needs a documented handling rule. Validate actual sample fields before committing to PR classification or lifecycle metrics. [GH Archive](https://www.gharchive.org/).

Specify a small default dataset and a larger optional benchmark. Document free-tier limits and provide alternatives. Databricks Free Edition has constrained serverless resources and restricted outbound access, so a continuous hourly pipeline, month-long backfill and 100 GB lab need a feasibility check. [Databricks Free Edition limitations](https://docs.databricks.com/aws/en/getting-started/free-edition-limitations).

Distinguish open-source MetricFlow from hosted dbt Semantic Layer services. Local MetricFlow supports metric definitions and CLI queries; hosted APIs and downstream integrations have different availability. The dbt MCP server's Semantic Layer tools require dbt platform access. Make the chosen access path and budget explicit, or build a documented local metric-query adapter as an alternative. [Semantic Layer architecture](https://docs.getdbt.com/docs/use-dbt-semantic-layer/sl-architecture), [MCP requirements](https://docs.getdbt.com/docs/dbt-ai/setup-local-mcp).

The plan already offers Evidence as an alternative to Power BI. Make that an explicit setup choice on macOS: Power BI Desktop requires Windows. [Microsoft requirements](https://learn.microsoft.com/en-us/power-bi/fundamentals/desktop-get-the-desktop).

**5. Repair storage and recovery before adding features**

| Priority | Finding | Evidence and proposed fix |
|---|---|---|
| High | External note edits can be silently overwritten | Reproduced in an in-memory filesystem: edit a track's Markdown externally, then add a browser note in that track before refresh. `changedOnDisk()` skips checks while a save is pending; `write()` uses the cached app notes and replaces the file. Check the disk version before each changed file write, preserve both versions on conflict, and resolve per note ID |
| High | Import rejects the folder's own `progress.json` | Reproduced using the actual saved file. Import requires top-level `r`, while folder storage wraps state in `data`. Accept supported formats explicitly; explain that folder progress does not include the separate Markdown notes |
| High | Stage gates do not control the recommended next step | Reproduced: rate SETUP Solid and leave its gate unchecked; `currentStep()` returns 1.1. Treat an incomplete gate as the next action, or clearly label gates as advisory |
| Medium | Notes drafts live only in memory | `drafts` survives rerenders but not reload or closing the tab. Persist drafts separately and show whether the note is a draft or saved |
| Medium | Recovery depends on a daily snapshot | Keep daily backups, and also create a snapshot before Reset, Import and replacing real state with sample data. Provide a restore preview and an isolated demo mode |
| Medium | Imported state has weak validation | Validate version, rating ranges, hours, dates, roles, topic IDs and note fields before replacing current state. Show an import summary first |

For actual implementation, add focused regression tests for folder conflicts, format compatibility and recovery. General UI tests are less urgent than these data-preservation behaviors.

**6. Improve the learning workflow**

- **Today/This week:** show one specific practice rep, one build outcome and due reviews; let the user choose available time. Keep the complete roadmap as the planning view.
- **Review queue:** store rating history and assessment dates, then schedule retrieval practice. The current UI says "a second Solid counts more than the first," but no repeated-assessment history is stored and both ratings have the same score.
- **Evidence per check:** attach a query, repository file, benchmark, diagram, demo or mock-interview result; distinguish self-rating from demonstrated ability.
- **Problem log:** record link/ID, pattern, difficulty, duration, outcome, hint/AI use, mistake and retry date. Current time logs do not capture this information.
- **Clear metrics:** label current weighted percentages as self-assessed mastery. The displayed "hours left" is estimated topic hours multiplied by rating gaps; logged effort does not reduce it. Present mastery, effort and forecast separately.
- **Useful career view:** track target roles, referrals, applications, interview stages and feedback. Link repeated interview weaknesses back to the review queue.
- **Resource focus:** there are 211 resource entries. Select one primary resource and one optional reference per topic; add specific sections, cost/access labels and last-checked dates.
- **Navigation and accessibility:** add global topic search and topic-specific links, labels for form controls, selected-state semantics for ratings, and reliable keyboard focus when opening and rerendering the drawer. Validate mobile behavior in a browser before claiming accessibility improvements.

**7. Reduce content drift**

The Markdown plan and `data.js` are independently maintained. They already differ in detail, and the phase map does not match every app requirement. Use one structured content source and generate both views, or add a consistency check until that refactor is worthwhile.

Use stable IDs for checks and gates rather than array positions, plus a separate curriculum version in saved state. Reordering a checklist should not attach an old tick or rating to a different requirement. Preserve rating history through migrations. Pin a tested tool/version combination for labs and date platform-specific guidance.

**Suggested delivery order**

1. Preserve data: conflict detection, supported imports, draft recovery and backups before destructive actions.
2. Correct the roadmap: prerequisites, honest effort, AE/AI/DE scopes, demonstrated-skill exemptions and usable gates.
3. Improve daily learning: weekly outcomes, problem log, evidence links and retrieval reviews.
4. Improve career support, navigation and accessibility; reduce resource noise and content duplication.

The best immediate change is a reliable, shorter path to one useful project and interview evidence. Add curriculum breadth only where a target role or observed practice weakness justifies it.
