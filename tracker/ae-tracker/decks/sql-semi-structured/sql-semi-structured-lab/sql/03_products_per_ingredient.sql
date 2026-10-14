-- 03_products_per_ingredient.sql: how many distinct products contain each ingredient (any depth).
CREATE OR REPLACE VIEW products_per_ingredient AS
SELECT ingredient_id,
       count(DISTINCT code) AS products,       -- the answer: products, not rows
       count(*)             AS occurrences,    -- rows: larger when an ingredient repeats in a product
       min(depth)           AS shallowest_depth
FROM product_ingredients
GROUP BY ingredient_id;
