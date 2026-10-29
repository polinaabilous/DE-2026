-- dim_supplier_product: SCD type 2 product dimension built on the snapshot.
-- Grain: one row per barcode per version. Join facts on barcode and the fact's time between valid_from and valid_to.
select
    dbt_scd_id                                   as supplier_product_key,
    barcode,
    product_name,
    brand,
    label,
    npk,
    coalesce(dbt_is_deleted = 'True', false)     as is_discontinued,
    dbt_valid_from                               as valid_from,
    dbt_valid_to                                 as valid_to,
    dbt_valid_to = timestamp '9999-12-31'        as is_current
from {{ ref('supplier_products_snapshot') }}
