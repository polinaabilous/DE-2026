# Metric spec: protein density

## Definition
Grams of protein per 100 kcal in one serving of a recipe, computed from the recipe's matched ingredients.

## Decision
Ranks the "fuel picks" on the dashboard; a recipe needs a protein density in the top 20% of the population to qualify.

## Owner
Portfolio owner.

## Population
Recipes in the fixed 5,000-recipe sample with at least 80% of ingredient weight matched to a USDA food.

## Grain
One row per recipe serving.

## Numerator
Protein grams per serving: the sum over matched lines of grams x protein per 100 g / 100, divided by the recipe's servings.

## Denominator
Kilocalories per serving from the same matched lines, divided by 100. The numerator and denominator use the same lines.

## Time window and time zone
Not time-based: one value per recipe for the pinned USDA releases; recomputed only when a release pin changes.

## Exclusions
- Coverage below 80% of ingredient weight: kept in the table with `exclusion_reason = 'low_coverage'`.
- Servings missing or 0: `exclusion_reason = 'no_servings'`.
- Kilocalories per serving below 20: `exclusion_reason = 'kcal_too_low'`; a ratio over a tiny denominator is not meaningful.

## Missing data and late rows
Unmatched ingredient lines count in the coverage denominator and add no nutrients. The sample is static, so there are no late rows.
