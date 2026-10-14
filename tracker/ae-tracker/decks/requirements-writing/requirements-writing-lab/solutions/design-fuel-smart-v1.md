# Design: Fuel Smart v1, recipe nutrition marts

**Author:** Portfolio owner · **Reviewers:** one peer · **Status:** In review · **Updated:** 2026-10-13

## Context
Fuel Smart answers the question in `intake-fuel-smart-v1.md`. Food.com stores ingredient quantities and names as separate text lists; USDA FoodData Central gives nutrients per 100 g and household portions in grams. The work is parsing, converting to grams and matching, then three metrics per serving.

## Goals
- `mart_recipe_nutrition`: one row per recipe serving with protein density, fibre density, vegetable-and-legume share and matching coverage.
- Match precision and coverage reported against a 200-line hand-labelled answer set.
- A fresh clone rebuilds the 50-recipe fixture end to end in 10 minutes or less.

## Non-goals
- Open Food Facts, orchestration, Spark, AI features (later releases).
- Nutrition advice.

## Proposal
A Python ingester samples 5,000 recipes deterministically (lowest hash of the recipe ID) and writes Parquet. A parser pairs quantities with ingredient names, normalises fractions and converts to grams with USDA portions. A matcher assigns a USDA food and a confidence. dbt on DuckDB builds `fct_recipe_ingredient` (one row per ingredient line), `fct_review` (one row per review) and the mart. Metrics follow `spec-protein-density.md`.

## Alternatives considered
- Use the nutrition that Food.com lists: rejected as the main source; its basis is unclear. Kept for reconciliation.
- Fuzzy string matching only: rejected; no confidence score to report.
- An LLM parser in v1: rejected; it needs an evaluated answer set first (AI release).

## Risks and mitigations
- Matching never feels finished: fix the answer set early and report coverage honestly (ADR-0001).
- Metrics read as health advice: say on the dashboard that they describe recipe data.

## Test and rollout plan
- pytest for the parser and unit conversion; dbt tests for grain and accepted values.
- The acceptance criteria in the intake, run on the fixture in CI.
- One peer runs the README from a fresh clone with a timer.

## Open questions
- Is the nutrition Food.com lists per serving or per recipe? (portfolio owner, by 2026-10-31)
