# ADR-0001: Exclude recipes with less than 80% matched ingredient weight

## Status
Accepted · 2026-10-13

## Context
Nutrients come only from ingredient lines matched to a USDA food. A recipe with half its weight unmatched would show a protein density that describes half a dish. Matching will never reach 100%: spices, branded items and vague lines ("a handful of greens") stay unmatched.

## Decision
We will compute the three metrics only for recipes whose matched ingredients cover at least 80% of the recipe's estimated weight. Other recipes stay in the mart with `exclusion_reason = 'low_coverage'` and NULL metrics.

## Consequences
- Easier: every published number describes most of the dish; the threshold is one documented constant; coverage is reported next to every result.
- Harder: fewer recipes qualify, and the excluded share must be reported; recipes heavy in unmatched items (for example spice-rich dishes) are under-represented.
