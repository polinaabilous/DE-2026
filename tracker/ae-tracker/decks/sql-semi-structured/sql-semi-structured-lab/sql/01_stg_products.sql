-- 01_stg_products.sql: one row per product (newest version of each code), typed nutriments per 100 g.
CREATE OR REPLACE VIEW raw_products AS
SELECT json AS doc
FROM read_json_objects('data/off_products.jsonl');

CREATE OR REPLACE VIEW stg_products AS
WITH latest AS (                       -- daily delta files repeat products: keep the newest version
    SELECT doc
    FROM raw_products
    QUALIFY row_number() OVER (PARTITION BY doc ->> 'code'
                               ORDER BY CAST(doc ->> 'last_modified_t' AS BIGINT) DESC) = 1
),
typed AS (
    SELECT doc ->> 'code'                                                    AS code,
           doc ->> 'product_name'                                            AS product_name,
           doc ->> 'brands'                                                  AS brand,
           make_timestamp(CAST(doc ->> 'last_modified_t' AS BIGINT) * 1000000) AS last_modified_at,
           TRY_CAST(doc -> 'nutriments' ->> 'energy-kcal_100g'   AS DOUBLE)  AS energy_kcal_reported,
           TRY_CAST(doc -> 'nutriments' ->> 'energy_100g'        AS DOUBLE)  AS energy_kj_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'proteins_100g'      AS DOUBLE)  AS proteins_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'carbohydrates_100g' AS DOUBLE)  AS carbohydrates_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'sugars_100g'        AS DOUBLE)  AS sugars_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'fat_100g'           AS DOUBLE)  AS fat_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'fiber_100g'         AS DOUBLE)  AS fiber_100g,
           TRY_CAST(doc -> 'nutriments' ->> 'salt_100g'          AS DOUBLE)  AS salt_100g,
           CASE WHEN NOT json_exists(doc, '$.ingredients')       THEN 'missing'
                WHEN json_type(doc, '$.ingredients') = 'NULL'    THEN 'JSON null'
                WHEN json_array_length(doc, '$.ingredients') = 0 THEN 'empty'
                ELSE 'has values' END                                        AS ingredients_state,
           doc                                                               AS raw_doc
    FROM latest
)
SELECT * EXCLUDE (energy_kcal_reported, raw_doc),
       coalesce(energy_kcal_reported, round(energy_kj_100g / 4.184, 1))     AS energy_kcal_100g,
       energy_kcal_reported IS NULL AND energy_kj_100g IS NOT NULL           AS energy_kcal_derived,
       raw_doc
FROM typed;

-- nutrient values that are present but are not numbers: quarantined, never silently NULL
CREATE OR REPLACE VIEW nutrient_issues AS
SELECT p.code, n.key AS nutrient, n.value AS raw_value
FROM stg_products AS p,
     json_each(p.raw_doc -> 'nutriments') AS n
WHERE n.type <> 'NULL'
  AND TRY_CAST(n.value ->> '$' AS DOUBLE) IS NULL;
