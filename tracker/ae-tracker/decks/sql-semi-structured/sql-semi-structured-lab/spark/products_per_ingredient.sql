-- products_per_ingredient.sql (Spark SQL 3.5 / 4.x)
-- NOT EXECUTED: the lab was built on a machine without Java or Spark. Expected result: the DuckDB
-- output of run_lab.py. Run it with spark-sql from the lab folder, or paste it into a notebook.

CREATE OR REPLACE TEMPORARY VIEW raw_lines
USING text OPTIONS (path 'data/off_products.jsonl');                 -- one STRING column: value

-- An explicit schema. nutriments as MAP<STRING, STRING>: hyphenated keys stay plain map keys,
-- and every value arrives as text, so "24" and "20,5" can be checked with try_cast.
CREATE OR REPLACE TEMPORARY VIEW parsed AS
SELECT from_json(value,
  'code STRING, product_name STRING, last_modified_t BIGINT,
   nutriments MAP<STRING, STRING>,
   ingredients ARRAY<STRUCT<id: STRING, text: STRING, percent_estimate: DOUBLE, vegan: STRING,
                            ingredients: ARRAY<STRUCT<id: STRING, text: STRING>>>>') AS p
FROM raw_lines;

CREATE OR REPLACE TEMPORARY VIEW stg_products AS
SELECT p.code,
       p.product_name,
       try_cast(p.nutriments['energy-kcal_100g'] AS DOUBLE) AS energy_kcal_reported,
       try_cast(p.nutriments['proteins_100g'] AS DOUBLE)    AS proteins_100g,
       try_cast(p.nutriments['sugars_100g'] AS DOUBLE)      AS sugars_100g,
       p.ingredients
FROM (SELECT p, row_number() OVER (PARTITION BY p.code ORDER BY p.last_modified_t DESC) AS rn
      FROM parsed)
WHERE rn = 1;

-- Two fixed levels (the fixture's depth). posexplode is 0-based; explode drops NULL/empty arrays,
-- which is right at ingredient grain (coverage is reported from stg_products).
CREATE OR REPLACE TEMPORARY VIEW product_ingredients AS
SELECT code, pos + 1 AS top_position, 1 AS depth, lower(trim(ing.id)) AS ingredient_id
FROM stg_products
LATERAL VIEW posexplode(ingredients) t AS pos, ing
UNION ALL
SELECT code, pos + 1 AS top_position, 2 AS depth, lower(trim(sub.id)) AS ingredient_id
FROM stg_products
LATERAL VIEW posexplode(ingredients) t AS pos, ing
LATERAL VIEW explode(ing.ingredients) s AS sub;

SELECT ingredient_id,
       count(DISTINCT code) AS products,
       count(*)             AS occurrences
FROM product_ingredients
GROUP BY ingredient_id
ORDER BY products DESC, ingredient_id
LIMIT 6;
