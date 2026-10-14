# Model answer: the Fuel Smart case, rehearsed aloud

Prompt you give yourself (or a friend reads it to you): *"You built Fuel Smart. Which simple recipes give the most protein per 100 kcal, and do reviewers like them as much as other recipes? Walk me through your model and your metric, then give me the answer."*

## 1. Clarify (say it)
- "The decision is personal and product-level: which recipes to recommend on training days. So I optimise for protein per calorie among *simple* recipes: 10 ingredients or fewer, ready in 45 minutes or less."
- "Population: recipes in the fixed 5,000-recipe sample whose matched ingredients cover at least 80% of ingredient weight. Below that, I exclude the recipe and report how many I excluded."
- "Period: ratings use every review in the sample; I compare groups only when each has enough reviews and I report the count."
- "Assumption: the metric describes recipe data, not personal health advice."

## 2. Grain
- "The unit is one recipe serving."
- "`fct_recipe_ingredient`: one row per recipe ingredient line. `fct_review`: one row per review. `mart_recipe_nutrition`: one row per recipe (per serving values)."

## 3. Model
| Table | Grain | Key | Main columns |
|---|---|---|---|
| dim_recipe | one row per recipe | recipe_id | name, servings, ingredient_count, total_minutes, is_simple |
| dim_food | one row per USDA food | fdc_id | description, food_group |
| fct_recipe_ingredient | one row per ingredient line | (recipe_id, line_no) | quantity, unit, grams, fdc_id (nullable), match_confidence |
| fct_food_nutrient | one row per food per nutrient | (fdc_id, nutrient_id) | amount_per_100g |
| fct_review | one row per review | review_id | recipe_id, reviewer_id, review_date, rating |
| mart_recipe_nutrition | one row per recipe | recipe_id | kcal_per_serving, protein_g_per_serving, protein_per_100kcal, coverage, n_reviews, avg_rating |

## 4. Metric spec
- **Protein density** = protein grams per serving / kcal per serving x 100, from matched ingredients only.
- Population: simple recipes with coverage >= 0.80 (matched grams / total grams). Excluded recipes are counted and listed.
- Unknowns: an ingredient without a usable gram conversion is unmatched, never guessed.
- Ratings: mean rating with the review count; compare top-quartile protein density against the rest only when both groups have at least 30 reviews.

## 5. Validate
- Grain checks: `recipe_id` unique in the mart; `(recipe_id, line_no)` unique in the ingredient fact.
- Reconciliation: recipes in = recipes ranked + recipes excluded (with a reason).
- Calorie check: protein x 4 + carbohydrate x 4 + fat x 9 within 15% of computed kcal; flag the rest.
- Compare computed protein with Food.com's listed nutrition after deciding whether it is per serving or per recipe.

## 6. Three-sentence answer (template; fill in with your real numbers)
1. "Among N simple recipes with at least 80% of ingredient weight matched, the top ten deliver X-Y g of protein per 100 kcal, mostly from legumes, eggs and fish."
2. "They average R1 stars over n1 reviews against R2 over n2 for other simple recipes, so reviewers like them about as much; M recipes were excluded for low matching coverage, which I report."
3. "I would surface the top list on training days and next improve ingredient matching, because coverage is what limits the ranking today."
