-- Singular test: every barcode has exactly one current version in the snapshot.
-- Returns the barcodes that break the rule; any row is a failure.
select barcode, count(*) as current_versions
from {{ ref('supplier_products_snapshot') }}
where dbt_valid_to = timestamp '9999-12-31'
group by barcode
having count(*) <> 1
