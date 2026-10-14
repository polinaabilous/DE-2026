-- 02_product_ingredients.sql: one row per ingredient occurrence, at any depth.
CREATE OR REPLACE VIEW product_ingredients AS
WITH RECURSIVE walk(code, path, depth, ing) AS (
    SELECT p.code, [t.pos], 1, t.ing
    FROM stg_products AS p,
         UNNEST(CAST(p.raw_doc -> 'ingredients' AS JSON[])) WITH ORDINALITY AS t(ing, pos)
    UNION ALL                           -- sub-ingredients: unnest the element's own list
    SELECT w.code, list_append(w.path, s.pos), w.depth + 1, s.ing
    FROM walk AS w,
         UNNEST(CAST(w.ing -> 'ingredients' AS JSON[])) WITH ORDINALITY AS s(ing, pos)
)
SELECT code,
       path,                                          -- [3, 1]: 1st sub-ingredient of the 3rd ingredient
       path[1]                                        AS top_position,
       depth,
       lower(trim(ing ->> 'id'))                      AS ingredient_id,
       ing ->> 'text'                                 AS ingredient_text,
       TRY_CAST(ing ->> 'percent_estimate' AS DOUBLE) AS percent_estimate,
       ing ->> 'vegan'                                AS vegan
FROM walk;

-- products with no ingredient rows are not lost: they are counted here
CREATE OR REPLACE VIEW ingredient_coverage AS
SELECT ingredients_state,
       count(*)                                  AS products,
       list(product_name ORDER BY product_name)  AS product_names
FROM stg_products
GROUP BY ingredients_state;
