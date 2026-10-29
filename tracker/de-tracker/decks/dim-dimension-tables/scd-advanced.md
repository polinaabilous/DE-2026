# SCD Types 3, 4 and 6: worked Leafy examples

Supplement to [Dimension tables](dim-dimension-tables.html). Six worked additions, researched 27 October 2026, placed after lesson 9 as 9A–9F. Original section links remain stable. Each example is a separate demonstration schema, with **one fact row per order**, using the same 64 + 25 + 18 = 107 of sales. Profile assignments and regions are synthetic extensions of Leafy.

SQL uses DuckDB; an embedded analytical database that can run this lab locally without a server. Run [the lab](lab/README.md) to create all tables and verify the outputs, identical replays, date boundaries and rollback. It never connects to your tracker or a warehouse.

## Contents

- [9A. Type 3: keep two views of the same sales](#slide-21)
- [9B. Type 3: update safely and name the comparison](#slide-22)
- [9C. Type 4: separate a reusable customer profile](#slide-23)
- [9D. Type 4: capture the profile at the event time](#slide-24)
- [9E. Type 6: historical city and current city together](#slide-25)
- [9F. Type 6: update every version, then prove both views](#slide-26)

<a id="slide-21"></a>
## 9A. Type 3: keep two views of the same sales

Leafy redraws its sales regions. Maya’s assignment changes from South to Central; Leo stays in West. Management wants to compare the same orders under both maps. Type 3 keeps an alternate assignment beside the main value, so a report can choose its lens.

### Before and after the reorganisation

| State | customer_key | customer_id | sales_region | previous_sales_region |
| --- | --- | --- | --- | --- |
| Before | 1 | C-101 | South | NULL |
| After | 1 | C-101 | Central | South |
| After | 2 | C-102 | West | NULL |

The key stays 1. Both Maya orders still reference that row: 64 + 18 = 82. Grouping by `sales_region` puts all 82 in Central. Grouping by `COALESCE(previous_sales_region, sales_region)` puts all 82 in South. Leo’s 25 stays in West.

> **The important distinction:** The old-map query also puts Maya’s newer order in South. This is an alternate classification of the same facts, rather than a reconstruction of the region at each order date.

Use it for a small, agreed set of comparisons: the old organisation versus the new one, or an original category versus today’s category. If every historical assignment and its dates must remain queryable, choose a versioned design such as Type 2.

**The main idea:** Type 3 preserves a limited set of alternative descriptions. Choose the column that matches the report’s business question.

*Primary sources:* [Kimball: Type 3 — add an attribute](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-3/)

---

<a id="slide-22"></a>
## 9B. Type 3: update safely and name the comparison

This rolling-previous implementation moves the old assignment into `previous_sales_region` only when the incoming assignment differs. The guard matters: replaying the same Central update should leave South in the previous column. The examples use DuckDB, a local analytical SQL database; the downloadable lab creates its tables in memory.

```sql
UPDATE dim_customer3
SET previous_sales_region = sales_region,
    sales_region = 'Central'
WHERE customer_id = 'C-101'
  AND sales_region IS DISTINCT FROM 'Central';
```

### Compare the same 107 of sales under both maps

```sql
SELECT 'new_map' AS perspective,
       d.sales_region AS region, SUM(f.amount) AS sales
FROM fact_order3 AS f
JOIN dim_customer3 AS d USING (customer_key)
GROUP BY d.sales_region
UNION ALL
SELECT 'old_map',
       COALESCE(d.previous_sales_region, d.sales_region),
       SUM(f.amount)
FROM fact_order3 AS f
JOIN dim_customer3 AS d USING (customer_key)
GROUP BY COALESCE(d.previous_sales_region, d.sales_region)
ORDER BY perspective, region;
```

### Expected result

| perspective | region | sales |
| --- | --- | --- |
| new_map | Central | 82.00 |
| new_map | West | 25.00 |
| old_map | South | 82.00 |
| old_map | West | 25.00 |

A later move to East would leave Central as previous and erase South from this two-slot representation. If the requirement is specifically “before the 2026 reorganisation,” preserve a named baseline such as `sales_region_before_2026_reorg` once. Agree whether a column means original, previous, or a particular approved map.

In this fixture, the original assignments are known and an empty previous slot means unchanged. If an old assignment can itself be unknown, distinguish that state explicitly; blindly falling back to the current region would misrepresent the old map.

> **Load assumptions:** The example applies one authoritative assignment per customer. Deduplicate incoming changes and define effective order before rotating values. Replaying an older source snapshot must not be treated as a new business change.

### Try it: a replay, then a second change

Run the Central update twice. Maya must still be Central / South. Change the incoming value to East and run it: expect East / Central. Explain why neither version of the report can now reconstruct all historical assignments.

**The main idea:** A previous-value slot is limited history. A replay guard protects it, and precise column names protect its meaning.

*Primary sources:* [Kimball: Type 3 — add an attribute](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-3/) · [Kimball: hybrid SCD patterns and event-time profiles](https://www.kimballgroup.com/2005/03/slowly-changing-dimensions-are-not-always-as-easy-as-1-2-3/)

---

<a id="slide-23"></a>
## 9C. Type 4: separate a reusable customer profile

Suppose Leafy’s large customer dimension also carries loyalty tier, age band and income band. Creating a full customer version whenever this profile changes can duplicate many stable attributes. A mini-dimension holds the distinct profile combinations separately. This deck uses Kimball’s Type 4 terminology.

Customer dimension ← **customer_key · Order fact · profile_key** → Profile mini-dimension. The fact stores both keys; the profile grain is one attribute combination.

### dim_profile4: one row per combination, shared by customers

| profile_key | loyalty_tier | age_band | income_band |
| --- | --- | --- | --- |
| 10 | Bronze | 25-34 | 40k-60k |
| 11 | Silver | 25-34 | 40k-60k |

### fact_order4: one row per order, with two foreign keys

| order_number | customer_key | profile_key | amount |
| --- | --- | --- | --- |
| SO-5001 | 1 · Maya | 10 | 64.00 |
| SO-5002 | 2 · Leo | 10 | 25.00 |
| SO-5003 | 1 · Maya | 11 | 18.00 |

Maya’s customer key remains 1 in this simplified base dimension; the later order records profile 11. Leo shares profile 10. A profile row represents a combination, rather than one person or a customer-specific version.

> **Keep the old combinations stable:** When a profile changes, reuse or create its combination and put that key on the new fact. Editing profile 10 from Bronze to Silver would relabel every old fact that references it.

**The main idea:** Type 4 stores the customer and the event-time profile as separate dimensions. The fact captures which combination applied.

*Primary sources:* [Kimball: Type 4 — add a mini-dimension](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-4-mini-dimension/) · [Kimball Design Tip 152: Types 4, 5, 6 and 7](https://www.kimballgroup.com/2013/02/design-tip-152-slowly-changing-dimension-types-0-4-5-6-7/)

---

<a id="slide-24"></a>
## 9D. Type 4: capture the profile at the event time

1. **Prepare the event.** Resolve the customer and the profile that applied when the order occurred. A historical backfill needs historical profile evidence.
2. **Find or add the combination.** Look up the complete tuple. Insert an observed combination only when absent; enforce uniqueness.
3. **Write the fact.** Store both keys. Validate unmatched lookups and reconcile row counts before publishing.

```sql
SELECT p.loyalty_tier, SUM(f.amount) AS sales
FROM fact_order4 AS f
JOIN dim_customer4 AS c USING (customer_key)
JOIN dim_profile4 AS p USING (profile_key)
GROUP BY p.loyalty_tier
ORDER BY p.loyalty_tier;
```

### Expected sales by the profile on each order

| loyalty_tier | sales |
| --- | --- |
| Bronze | 89.00 |
| Silver | 18.00 |

### See the complete profile lookup and fact load

The lab provides three unique staged orders, non-null profile bands and a sequence that generates surrogate keys. It validates customer lookups before these statements. Run both inside one transaction.

```sql
INSERT INTO dim_profile4 (loyalty_tier, age_band, income_band)
SELECT DISTINCT s.loyalty_tier, s.age_band, s.income_band
FROM stg_order4 AS s
WHERE NOT EXISTS (
    SELECT 1 FROM dim_profile4 AS p
    WHERE p.loyalty_tier = s.loyalty_tier
      AND p.age_band = s.age_band
      AND p.income_band = s.income_band
)
ORDER BY 1, 2, 3;
```

```sql
INSERT INTO fact_order4
SELECT s.order_number, s.order_date,
       c.customer_key, p.profile_key, s.amount
FROM stg_order4 AS s
JOIN dim_customer4 AS c USING (customer_id)
JOIN dim_profile4 AS p
  ON p.loyalty_tier = s.loyalty_tier
 AND p.age_band = s.age_band
 AND p.income_band = s.income_band
WHERE NOT EXISTS (
    SELECT 1 FROM fact_order4 AS f
    WHERE f.order_number = s.order_number
);
```

The replay guard assumes an identical replay. If the same order ID arrives with different values, validate and apply an explicit correction policy rather than silently ignoring it.

Choose bounded bands deliberately. Three tiers × eight age bands × six income bands permits 144 combinations in this toy design; exact balances or timestamps could make combinations nearly unique per customer. Store observed tuples rather than eagerly generating every possible tuple.

> **What facts cannot tell you:** If a profile changes between purchases, an order fact alone does not record that change. A dated customer–profile assignment history, such as a factless fact table, is needed for questions about every interval between events.

### Try it: a shared profile and a backfill

Give Ana a new order with the same Silver profile: reuse key 11. Then backfill a Maya order from before the tier change: its profile must be 10, even if her current tier is Silver. Explain how you would resolve it if the source supplies only today’s profile.

**The main idea:** A mini-dimension stays useful when combinations are reusable and facts carry the correct event-time key.

*Primary sources:* [Kimball: Type 4 — add a mini-dimension](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-4-mini-dimension/) · [Kimball: hybrid SCD patterns and event-time profiles](https://www.kimballgroup.com/2005/03/slowly-changing-dimensions-are-not-always-as-easy-as-1-2-3/) · [Kimball: factless fact tables](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/factless-fact-table/)

---

<a id="slide-25"></a>
## 9E. Type 6: historical city and current city together

Return to Maya’s move from Austin to Denver on 5 March. Type 2 keeps Austin on the old row and Denver on the new one. Type 6 additionally carries `current_city` on every version, allowing both historical and current rollups through the fact’s existing surrogate-key join.

### After the move: two versions, one current perspective

| customer_key | customer_id | city | current_city | valid_from | valid_to | is_current |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | C-101 | Austin | Denver | 2025-01-10 | 2026-03-04 | false |
| 4 | C-101 | Denver | Denver | 2026-03-05 | 9999-12-31 | true |
| 2 | C-102 | Denver | Denver | 2025-06-01 | 9999-12-31 | true |

SO-5001 still points to key 1. Its historical city is Austin, but its current city is Denver. SO-5003 points to key 4. These examples retain the earlier slides’ inclusive dates: the old version ends on 4 March and the new one starts on 5 March.

```sql
SELECT 'as_was' AS perspective,
       d.city, SUM(f.amount) AS sales
FROM fact_order6 AS f
JOIN dim_customer6 AS d USING (customer_key)
GROUP BY d.city
UNION ALL
SELECT 'as_is', d.current_city, SUM(f.amount)
FROM fact_order6 AS f
JOIN dim_customer6 AS d USING (customer_key)
GROUP BY d.current_city
ORDER BY perspective, city;
```

### Same three orders; both views total 107

| perspective | city | sales |
| --- | --- | --- |
| as_is | Denver | 107.00 |
| as_was | Austin | 64.00 |
| as_was | Denver | 43.00 |

> **Why “1 + 2 + 3”?:** Type 2 supplies versioned rows; the extra alternate-view column is the Type 3 idea; its values are overwritten using Type 1 behaviour. This Kimball hybrid does not require a separate previous_city column.

**The main idea:** The fact key preserves its historical version. Choosing city or current_city changes the analytical perspective without a second dimension join.

*Primary sources:* [Kimball: Type 6 — current attributes on Type 2 rows](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-6/) · [Kimball: natural and durable keys](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/natural-durable-supernatural-key/)

---

<a id="slide-26"></a>
## 9F. Type 6: update every version, then prove both views

For an ordered, effective-dated change, detect the real difference before modifying rows. Close the old version, insert the new one, and overwrite `current_city` for every version of the same customer. A transaction publishes those steps together.

1. **Keep the historical column.** Expired rows retain their city and surrogate key.
2. **Propagate the current column.** Every C-101 row receives Denver, including key 1.
3. **Keep fact keys stable.** Existing facts retain their historical keys; new or late facts use an event-date lookup.

### The transactional update used in the lab

DuckDB SQL. The fixture provides a surrogate-key sequence and one deduplicated change per customer, with an effective date strictly after the existing version’s start. Detecting only changed values makes an identical replay a no-op. For multiple changes within a day, use timestamp intervals and a consistent half-open boundary rule.

```sql
BEGIN TRANSACTION;
-- Freeze the actual changes before expiring any rows.
CREATE OR REPLACE TEMP TABLE changed6 AS
SELECT s.*
FROM stg_city6 AS s
JOIN dim_customer6 AS d USING (customer_id)
WHERE d.is_current AND d.city IS DISTINCT FROM s.city;

UPDATE dim_customer6 AS d
SET valid_to = s.effective_date - 1, is_current = FALSE
FROM changed6 AS s
WHERE d.customer_id = s.customer_id AND d.is_current;

INSERT INTO dim_customer6
    (customer_id, name, city, current_city,
     valid_from, valid_to, is_current)
SELECT customer_id, name, city, city,
       effective_date, DATE '9999-12-31', TRUE
FROM changed6;

-- Deliberately update EVERY version of the customer.
UPDATE dim_customer6 AS d
SET current_city = s.city
FROM changed6 AS s
WHERE d.customer_id = s.customer_id;
COMMIT;
```

> **Two easy mistakes:** Updating current_city only WHERE is_current leaves old facts grouped under stale “current” values. Conversely, filtering WHERE is_current after joining facts by their historical key drops Maya’s old 64 of sales: the remaining total is only 43.

Use a durable identity to group all versions. In this example `customer_id` is assumed stable; if a source can reassign or replace it, resolve a warehouse-managed durable identity first. Test one current row, no overlapping intervals, and a single current-city value across each customer’s versions.

The trade-off is deliberate: the historical city remains reproducible, while yesterday’s “as is” report may change after another move. Many versions also mean more rows to update. Type 2 plus a separate current-row join can be simpler when the combined view is rarely needed.

### Try it: replay, failure and a third city

Replay the Denver change: no extra version should appear. Roll back a deliberately interrupted update: readers should retain the previous state. Then apply a later Seattle move: historical cities must remain Austin / Denver / Seattle, while every current_city becomes Seattle. Retroactive corrections need interval repair; do not run them blindly through this forward-change example.

[Download the runnable lab](lab/run_scd_lab.py) · [Lab instructions](lab/README.md)

**The main idea:** Type 6 is useful when both perspectives are common enough to justify maintaining a current attribute on all historical rows.

*Primary sources:* [Kimball: Type 6 — current attributes on Type 2 rows](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-6/) · [Kimball: hybrid SCD patterns and event-time profiles](https://www.kimballgroup.com/2005/03/slowly-changing-dimensions-are-not-always-as-easy-as-1-2-3/)

---

