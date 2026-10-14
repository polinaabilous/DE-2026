# Lab: products per ingredient from Open Food Facts–shaped JSONL

Companion lab for the deck *SQL semi-structured data: JSON, arrays, UNNEST across engines* (slides 21–24).

**Task.** From a JSONL export of packaged foods, build (1) one typed row per product with nutriments per 100 g,
(2) one row per ingredient occurrence including sub-ingredients, and (3) the number of distinct products per
ingredient, without fan-out, without losing products, and with every bad value accounted for.

**Data.** `data/off_products.jsonl` has the real shape of an Open Food Facts export
(<https://world.openfoodfacts.org/data>), but the 11 products are invented and the file is synthetic: no download
is needed. Open Food Facts data itself is licensed under the Open Database License (ODbL); credit it and share
derived product tables under ODbL if you publish them. `data/orders.jsonl` and `data/events.jsonl` are the Leafy
documents used in the deck's lessons and exercises.

## Run it

```text
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
python -m pip install duckdb pytest
python run_lab.py
python -m pytest -q
```

Tested with DuckDB 1.5.6 on CPython 3.12.10 (Windows 11). The Spark SQL port in `spark/` was **not executed**
(no Java/Spark on the build machine); its expected result is the DuckDB output below.

## Expected output of `python run_lab.py`

```text
== coverage
ingredients_state  products
empty              1       
has values         9       
missing            1       

== nutrient values that are not numbers
code           nutrient       raw_value
0000000000116  proteins_100g  "20,5"   

== top ingredients by distinct products
ingredient_id    products  occurrences  shallowest_depth
en:salt          5         5            1               
en:sugar         3         4            1               
en:cocoa-butter  2         2            1               
en:olive-oil     2         2            1               
en:almond        1         1            1               
en:basil         1         1            1               
```

## Steps

1. `sql/01_stg_products.sql`: newest version per `code` (`QUALIFY row_number()`), every nutriment via `->>` and
   `TRY_CAST … AS DOUBLE`, kcal derived from kJ only when kcal is null (flagged), `ingredients_state`
   (missing / JSON null / empty / has values), and `nutrient_issues` for present values that are not numbers.
2. `sql/02_product_ingredients.sql`: recursive unnest of `ingredients` and each element's own `ingredients`,
   with `path` (positions down the tree); `ingredient_coverage` counts products with no ingredient rows.
3. `sql/03_products_per_ingredient.sql`: `count(DISTINCT code)` per normalised ingredient id, plus occurrences.
4. `tests/test_lab.py`: grain, types, rejects, coverage, and a plain-Python cross-check of products per ingredient.

## Definition of done

- [ ] Every nutriment column is DOUBLE; non-numbers are listed in `nutrient_issues`.
- [ ] One row per product code (newest version).
- [ ] One row per ingredient occurrence, unique on `(code, path)`; products without ingredients are counted.
- [ ] Products per ingredient uses `count(DISTINCT code)` and matches the Python check (all tests pass).
- [ ] Stretch: run `spark/products_per_ingredient.sql` in Spark and match the products column.
