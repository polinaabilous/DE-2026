# Add ingredient-line parser with fraction and unit normalisation

## What and why
Adds `parse/ingredients.py`, which pairs `RecipeIngredientQuantities` with `RecipeIngredientParts` and normalises "1 1/2", "½" and "2-3" to numbers. The grams conversion and USDA matching (next PRs) need one parsed row per ingredient line. Follows `design-fuel-smart-v1.md`.

## How it was validated
- `python -m pytest parse/tests -q`: new tests for 14 quantity formats, including empty and range values.
- On the 50-recipe fixture: every ingredient line gets a parsed row; unparsed quantities keep the raw text and `quantity = NULL`.

## Impact on existing models and consumers
None: no model reads the parser yet.

## Rollback
Revert this PR.

## Checklist
- [x] Tests added or updated, and passing
- [x] Descriptions and docs updated
- [x] Downstream owners told (when impact is not "None")
