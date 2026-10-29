# Decision: star schema, One Big Table, or both — for <the use case>

*One page. Write it before you build; revisit it when a consumer, tool, or source changes.*

## 1. The use case

- **Question(s) it must answer:** <the 2–3 questions, in business words>
- **Grain of the main table:** <one row per …>
- **Consumers:** <who reads it, how many teams, which tools (Power BI, Tableau, notebooks, ML, an agent, an export)>
- **Freshness and volume:** <how often it refreshes; rows now and in a year>

## 2. Forces (tick what applies)

| Force | Points to | Applies? |
|---|---|---|
| Several teams or tools reuse the same customers, products, dates | Star (conformed dimensions) | |
| Attributes change and reports need history (as-was) or both as-was and as-is | Star (SCD2) | |
| The BI tool is a Power BI / Analysis Services semantic model | Star | |
| One dashboard or one ML feature set with a fixed column list | OBT | |
| Consumers cannot or should not write joins (exports, self-serve spreadsheets, some AI tools) | OBT | |
| Measures live at different grains (order shipping vs line revenue) | Star, or one OBT per grain | |
| Dimension attributes change often and a full rebuild is expensive | Star | |

## 3. Decision

- **We build:** <star only | OBT only | star as the source of truth + OBT projection(s) for …>
- **Grain of each OBT, and what it deliberately leaves out:** <…>
- **History policy:** <as-was columns, as-is columns, or both; how the OBT is rebuilt when a dimension changes>

## 4. Consequences and checks

- **Tests:** <OBT row count = fact row count; sum(measure) in OBT = sum in fact; no column at a coarser grain>
- **Cost we accept:** <storage, rebuild time, duplicated logic>
- **Revisit when:** <a second consumer appears; a dimension starts changing daily; the tool changes>
