# Flight Reliability — portfolio project brief

**Question:** Which airline and departure window has historically been most reliable for a selected US domestic route?

Build a public route explorer that helps visitors compare historical cancellation risk, substantial arrival delays and the worst-delay percentiles. A later release adds weather observations and a replay of one airport disruption.

## First release

- **Period:** January–March 2025, pinned in the dataset manifest.
- **Routes:** Flights whose origin and destination are both in SEA, SFO, LAX, DEN, ORD and JFK. Keep every matching row, including cancellations and diversions. These airports are an initial scope choice, not a claim that every route has enough comparable flights.
- **Source:** BTS Reporting Carrier On-Time Performance. Use the reporting carrier consistently; distinguish it from marketing-airline identity if that dataset is added later.
- **Stack:** Python ingestion → month-partitioned Parquet → DuckDB + dbt → tested reliability marts → a public web dashboard such as Evidence.
- **Offline fixture:** A small source-shaped sample with expected results for cancellations, diversions, missing arrival delay, duplicate/conflicting records, overnight flights and midnight/2400 cases.
- **Manifest:** Source table and URLs, monthly files, checksums, download dates, exact filter, selected/rejected counts and schema version. Store source event time and retrieval time separately.

The initial output is one useful route explorer and one finding supported by its data. Weather, Spark, Airflow, AI and a second warehouse come after this release.

## What visitors can do

1. Choose a route and date range, then compare reporting carriers and scheduled local departure windows within that same route and period.
2. See cancellation rate, substantial-delay rate and p90 delay alongside flight counts and missing-outcome coverage.
3. Inspect low-sample labels and understand exactly which flights each metric includes.
4. Open the source and metric definitions from the dashboard; see the data-as-of date.
5. In the next release, replay one airport disruption alongside measured weather and a comparable baseline period.

## Three first-release metrics

| Metric | Definition | Required context |
| --- | --- | --- |
| Cancellation rate | Cancelled flight legs / all selected scheduled flight legs | Total scheduled count; keep diversions in this denominator |
| Substantial arrival-delay rate | Legs with recorded arrival delay ≥30 minutes / non-cancelled, non-diverted legs with a recorded arrival delay | Eligible count and missing-delay exclusions; this is the project's chosen threshold |
| p90 arrival delay | 90th percentile of max(recorded arrival delay, 0) over the same eligible population | Counts, percentile method and date range; early arrivals contribute zero |

Publish cancelled, diverted and missing-outcome counts separately. Never turn a missing delay into zero. Do not mix the cancellation denominator with the eligible-arrival denominator or average group percentages without their counts.

Start with a configurable threshold of 100 eligible flights per comparison cell. Label smaller groups as insufficient evidence rather than hiding their existence. This threshold is a presentation rule, not a guarantee of statistical precision. Formal intervals and route/season/mix sensitivity checks can follow the statistics lesson.

## Data sources and access

| Source | What it supplies | How it is used |
| --- | --- | --- |
| [BTS flight statistics](https://transtats.bts.gov/ONTIME/Index.aspx) | Historical reported US domestic schedules, outcomes, cancellation and diversion information | First-release flight data; published files have a reporting lag |
| [BTS reporting-carrier field dictionary and download](https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ) | DOT carrier/airport IDs, local HHMM times, delay fields and elapsed-time fields | Pin the table and schema; prefer stable DOT identities over assuming codes never change |
| [NOAA GHCNh](https://www.ncei.noaa.gov/products/global-historical-climatology-network-hourly) | Historical station weather observations, metadata and quality information; bulk PSV/Parquet access | Second release: selected airport/station/time ranges, with explicit units and quality filtering |

Use published bulk downloads rather than inventing a flight REST API. The initial bulk-file pipeline needs no commercial flight subscription. Check the source's download method and latest availability when implementing it; save the successful URLs and source versions in the manifest. An initial manually downloaded source file is acceptable while automating the downloader.

The product describes historical reporting-carrier outcomes. Ticket prices, live status, worldwide coverage and passenger connection itineraries are outside these sources. Source links, attribution and retrieval dates belong in the public README.

## Model and correctness

- **Flight fact:** One selected scheduled flight leg. Test a candidate key using flight date, DOT reporting-carrier ID, flight number, origin, destination and scheduled departure time. Prove uniqueness; quarantine unexplained conflicting rows rather than silently inventing a tie-breaker. Preserve the raw row/source-version identity for audit.
- **Dimensions:** Airport, reporting carrier and date. The same airport dimension serves the origin and destination roles. Store a documented local departure-window definition.
- **Marts:** Aggregate by route, carrier, date period and departure window. Retain numerators, denominators and coverage so filters and rollups remain correct.
- **Time:** BTS HHMM values are local times. Use the reported arrival-delay field for v1 outcomes. Preserve signed source delay as well as the non-negative metric value. Full UTC alignment for weather must account for origin/destination zones, elapsed times, midnight/2400, date rollovers and DST ambiguity; flag unresolved cases.
- **Incremental writes:** New monthly files create new partitions. A corrected source month replaces or merges that affected partition under a tested version policy. Compare the result with a full rebuild. Fixture corrections are simulations and must be labelled as such.
- **History:** An SCD2 exercise can snapshot reference attributes you capture. A simulated airport-name/time-zone change tests the mechanism; it does not establish historical attributes absent from the source.

## Weather and disruption replay

Choose one airport, an event period and a comparable baseline. For an airport-wide replay, expand beyond the six-airport route slice to all reported legs touching that airport and record the changed scope.

Map the airport to an appropriate station using documented distance and coverage criteria. Store station observations as a separate fact. Normalize weather units, apply source quality flags, resolve timestamps to UTC and use an explicit hourly aggregation or nearest-observation tolerance. Assert that adding weather does not multiply flight rows, and publish unmatched coverage.

The replay shows weather and flight outcomes together. It can report observed associations; it cannot establish causal attribution or predict future disruption from proximity alone.

## Learning and project progression

| Stage | Learn first | Build and prove |
| --- | --- | --- |
| Frame the question | Minimal lab; requirements and stakeholders | Decision, pinned sample contract and README stub |
| Bounded ingester | Python foundations; ingestion; quality and testing | Batched ZIP/CSV ingestion, Parquet, manifest, validation, fixture and CI |
| Explore flight outcomes | Windows; SQL patterns; aggregation; joins/grain; time analysis | Identity/time rules, comparison metrics, profiling and count reconciliation |
| Analytical model | Facts, dimensions and metric design | Flight-leg grain, role-playing airports and precise denominator definitions |
| Tested marts | Query structure; modeling; dbt; tests and contracts | Sources/staging/marts, expected-result fixtures, reproducible build |
| Public first release | Writing and dashboard storytelling | Route explorer, one supported finding, public URL and clear limits |
| Weather replay | Reuse ingestion, DataFrames, temporal joins, modeling and quality | Station mapping, separate observation fact, tested joins and event replay |
| Lakehouse | Spark; Delta/Iceberg; storage architecture | Measured multi-year archive, corrected-month replay, silver reconciliation and recovery |
| Orchestration | Databricks setup; Airflow scheduling, integration and DAG testing | Published-month discovery, interval backfills, retries and failure recovery |
| Quality and observability | Observability and incidents | Source-aware freshness, count/coverage checks and a fixture incident |
| Performance and cost | Plans, columnar storage, distributed execution and materializations | Measured scans/joins/aggregates with actual bytes, timing and cost |
| Semantic layer | Semantic modeling and documentation | Certified definitions reused by the dashboard |
| AI evaluation | Agents, evaluation and warehouse LLM functions | Read-only historical assistant and grounded narratives, tested against 40 questions |
| Portability and story | Cloud/IAM, Terraform, warehouse adapters and architecture | Portable marts, decision records and a concise public demo |

Interview practice remains a separate practice route linked from lessons. JSON/recursion, experimentation and other skills can use standalone labs when the flight project does not naturally need them. Existing recipe-based decks remain useful exercises: reuse their methods and templates with the flight question rather than presenting their food metrics as portfolio work.

## Scope and release discipline

Ship the small public version before adding platforms. Add weather before scaling. Expand the real archive gradually and record its actual size; 1/10/100 GB experiments are optional, and synthetic repetitions must be labelled. AI comes after trustworthy metrics and must abstain from unsupported prices, live predictions and causal explanations.

Keep collecting decisions while building. Resume work and basic interview practice continue before the application checkpoint; work, synthetic and equivalent personal-project evidence remain valid.

The tracker retains existing lesson and stage IDs so saved notes and progress remain connected. Review any previously ticked portfolio criteria against these new flight deliverables.
