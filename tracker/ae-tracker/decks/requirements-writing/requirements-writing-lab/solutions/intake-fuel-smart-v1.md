# Intake: Fuel Smart v1, nutrient-dense simple recipes

**Requester:** Portfolio owner (the reader is a hiring manager) · **Received:** 2026-10-13 · **Priority:** P1

> Which simple recipes give the most protein and fibre per calorie and contain the most vegetables, and do reviewers rate them as highly as other recipes?

## Question
Among simple recipes (10 ingredients or fewer, ready in 45 minutes or less) in the fixed 5,000-recipe Food.com sample, which have the highest protein density, fibre density and vegetable-and-legume share per serving, and is their mean rating different from other recipes when each group has at least 20 reviews?

## Decision it supports
Which 20 recipes the Fuel Smart dashboard features as "fuel picks" for training days, and whether to rank them by protein density alone or by a combined score. A hiring manager reading the portfolio decides whether the definitions are precise enough to trust.

## Grain
One row per recipe serving in `mart_recipe_nutrition`. Population: recipes in the sample with at least 80% of ingredient weight matched to USDA foods; the rest stay in the table with an exclusion reason.

## Deadline
2026-11-30: a self-set date for the v1 release (day level; time zone not relevant).

## Owner
Builds it, owns the definitions and signs off: portfolio owner. One peer reviewer checks the README and the definitions.

## Acceptance criteria
- On the 50-recipe fixture, every recipe has either all three metrics or an exclusion reason (coverage below 80%).
- Protein density of one hand-checked recipe matches a hand calculation within 0.1 g per 100 kcal.
- Rating comparisons show the review count of each group; a group with fewer than 20 reviews shows no mean.
- A fresh clone reaches the first mart table in 10 minutes or less by following the README.

## Out of scope
- Open Food Facts, orchestration, Spark and AI features: later releases in the project brief.
- Personal training data.
- Nutrition advice: the metrics describe recipe data only.

## Data sources
Food.com recipes and reviews (CC0, Kaggle download); USDA FoodData Central Foundation Foods and SR Legacy, pinned to named release dates in `dataset.yml`.

## Open questions
- Is the nutrition that Food.com lists per serving or per recipe? (portfolio owner, while profiling, by 2026-10-31)
