// Original Leafy examples for the six advanced-SCD slides and their runnable lab.
const base = 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/';
const sources = {
  type3: ['Kimball: Type 3 — add an attribute', base + 'type-3/'],
  type4: ['Kimball: Type 4 — add a mini-dimension', base + 'type-4-mini-dimension/'],
  type6: ['Kimball: Type 6 — current attributes on Type 2 rows', base + 'type-6/'],
  hybrids: ['Kimball: hybrid SCD patterns and event-time profiles', 'https://www.kimballgroup.com/2005/03/slowly-changing-dimensions-are-not-always-as-easy-as-1-2-3/'],
  numbering: ['Kimball Design Tip 152: Types 4, 5, 6 and 7', 'https://www.kimballgroup.com/2013/02/design-tip-152-slowly-changing-dimension-types-0-4-5-6-7/'],
  keys: ['Kimball: natural and durable keys', base + 'natural-durable-supernatural-key/'],
  factless: ['Kimball: factless fact tables', base + 'factless-fact-table/']
};
const sql = {
  type3Load: `UPDATE dim_customer3
SET previous_sales_region = sales_region,
    sales_region = 'Central'
WHERE customer_id = 'C-101'
  AND sales_region IS DISTINCT FROM 'Central';`,
  type3Report: `SELECT 'new_map' AS perspective,
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
ORDER BY perspective, region;`,
  type4Profiles: `INSERT INTO dim_profile4 (loyalty_tier, age_band, income_band)
SELECT DISTINCT s.loyalty_tier, s.age_band, s.income_band
FROM stg_order4 AS s
WHERE NOT EXISTS (
    SELECT 1 FROM dim_profile4 AS p
    WHERE p.loyalty_tier = s.loyalty_tier
      AND p.age_band = s.age_band
      AND p.income_band = s.income_band
)
ORDER BY 1, 2, 3;`,
  type4Facts: `INSERT INTO fact_order4
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
);`,
  type4Report: `SELECT p.loyalty_tier, SUM(f.amount) AS sales
FROM fact_order4 AS f
JOIN dim_customer4 AS c USING (customer_key)
JOIN dim_profile4 AS p USING (profile_key)
GROUP BY p.loyalty_tier
ORDER BY p.loyalty_tier;`,
  type6Load: `BEGIN TRANSACTION;
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
COMMIT;`,
  type6Facts: `INSERT INTO fact_order6
SELECT s.order_number, s.order_date, d.customer_key, s.amount
FROM stg_order6 AS s
JOIN dim_customer6 AS d
  ON d.customer_id = s.customer_id
 AND s.order_date BETWEEN d.valid_from AND d.valid_to
WHERE NOT EXISTS (
    SELECT 1 FROM fact_order6 AS f
    WHERE f.order_number = s.order_number
);`,
  type6Report: `SELECT 'as_was' AS perspective,
       d.city, SUM(f.amount) AS sales
FROM fact_order6 AS f
JOIN dim_customer6 AS d USING (customer_key)
GROUP BY d.city
UNION ALL
SELECT 'as_is', d.current_city, SUM(f.amount)
FROM fact_order6 AS f
JOIN dim_customer6 AS d USING (customer_key)
GROUP BY d.current_city
ORDER BY perspective, city;`
};
const setup = `CREATE TABLE dim_customer3 (
    customer_key INTEGER PRIMARY KEY, customer_id VARCHAR UNIQUE,
    name VARCHAR, sales_region VARCHAR NOT NULL, previous_sales_region VARCHAR
);
INSERT INTO dim_customer3 VALUES
    (1, 'C-101', 'Maya', 'South', NULL),
    (2, 'C-102', 'Leo', 'West', NULL),
    (3, 'C-103', 'Ana', 'Northwest', NULL);
CREATE TABLE fact_order3 (
    order_number VARCHAR PRIMARY KEY, order_date DATE,
    customer_key INTEGER REFERENCES dim_customer3(customer_key),
    amount DECIMAL(10,2)
);
INSERT INTO fact_order3 VALUES
    ('SO-5001', '2026-03-02', 1, 64),
    ('SO-5002', '2026-03-02', 2, 25),
    ('SO-5003', '2026-03-09', 1, 18);

CREATE TABLE dim_customer4 (
    customer_key INTEGER PRIMARY KEY, customer_id VARCHAR UNIQUE,
    name VARCHAR
);
INSERT INTO dim_customer4 VALUES
    (1, 'C-101', 'Maya'), (2, 'C-102', 'Leo'), (3, 'C-103', 'Ana');
CREATE SEQUENCE profile4_seq START 10;
CREATE TABLE dim_profile4 (
    profile_key INTEGER PRIMARY KEY DEFAULT nextval('profile4_seq'),
    loyalty_tier VARCHAR NOT NULL, age_band VARCHAR NOT NULL,
    income_band VARCHAR NOT NULL,
    UNIQUE(loyalty_tier, age_band, income_band)
);
INSERT INTO dim_profile4 VALUES (-1, 'Unknown', 'Unknown', 'Unknown');
CREATE TABLE stg_order4 AS
SELECT * FROM (VALUES
    ('SO-5001', DATE '2026-03-02', 'C-101', 'Bronze', '25-34', '40k-60k', 64.00),
    ('SO-5002', DATE '2026-03-02', 'C-102', 'Bronze', '25-34', '40k-60k', 25.00),
    ('SO-5003', DATE '2026-03-09', 'C-101', 'Silver', '25-34', '40k-60k', 18.00)
) AS t(order_number, order_date, customer_id, loyalty_tier, age_band, income_band, amount);
CREATE TABLE fact_order4 (
    order_number VARCHAR PRIMARY KEY, order_date DATE,
    customer_key INTEGER REFERENCES dim_customer4(customer_key),
    profile_key INTEGER REFERENCES dim_profile4(profile_key),
    amount DECIMAL(10,2)
);

CREATE SEQUENCE customer6_seq START 4;
CREATE TABLE dim_customer6 (
    customer_key INTEGER PRIMARY KEY DEFAULT nextval('customer6_seq'),
    customer_id VARCHAR, name VARCHAR, city VARCHAR, current_city VARCHAR,
    valid_from DATE, valid_to DATE, is_current BOOLEAN
);
INSERT INTO dim_customer6 VALUES
    (1, 'C-101', 'Maya', 'Austin', 'Austin', '2025-01-10', '9999-12-31', TRUE),
    (2, 'C-102', 'Leo', 'Denver', 'Denver', '2025-06-01', '9999-12-31', TRUE),
    (3, 'C-103', 'Ana', 'Seattle', 'Seattle', '2025-11-20', '9999-12-31', TRUE);
CREATE TABLE stg_city6 AS
SELECT 'C-101' AS customer_id, 'Maya' AS name,
       'Denver' AS city, DATE '2026-03-05' AS effective_date;
CREATE TABLE stg_order6 AS
SELECT * FROM (VALUES
    ('SO-5001', DATE '2026-03-02', 'C-101', 64.00),
    ('SO-5002', DATE '2026-03-02', 'C-102', 25.00),
    ('SO-5003', DATE '2026-03-09', 'C-101', 18.00)
) AS t(order_number, order_date, customer_id, amount);
CREATE TABLE fact_order6 (
    order_number VARCHAR PRIMARY KEY, order_date DATE,
    customer_key INTEGER REFERENCES dim_customer6(customer_key),
    amount DECIMAL(10,2)
);`;
const p = text => ({ type: 'p', text });
const table = (title, headers, rows) => ({ type: 'table', title, headers, rows });
const code = key => ({ type: 'sql', key });
const call = (label, text) => ({ type: 'call', label, text });
const detail = (title, nodes) => ({ type: 'detail', title, nodes });
const steps = (...items) => ({ type: 'steps', items });
const slides = [
  { id: 21, label: '9A', title: 'Type 3: keep two views of the same sales', refs: ['type3'], nodes: [
    p('Leafy redraws its sales regions. Maya’s assignment changes from South to Central; Leo stays in West. Management wants to compare the same orders under both maps. Type 3 keeps an alternate assignment beside the main value, so a report can choose its lens.'),
    table('Before and after the reorganisation', ['State', 'customer_key', 'customer_id', 'sales_region', 'previous_sales_region'], [
      ['Before', '1', 'C-101', 'South', 'NULL'], ['After', '1', 'C-101', 'Central', 'South'], ['After', '2', 'C-102', 'West', 'NULL']
    ]),
    p('The key stays 1. Both Maya orders still reference that row: 64 + 18 = 82. Grouping by `sales_region` puts all 82 in Central. Grouping by `COALESCE(previous_sales_region, sales_region)` puts all 82 in South. Leo’s 25 stays in West.'),
    call('The important distinction', 'The old-map query also puts Maya’s newer order in South. This is an alternate classification of the same facts, rather than a reconstruction of the region at each order date.'),
    p('Use it for a small, agreed set of comparisons: the old organisation versus the new one, or an original category versus today’s category. If every historical assignment and its dates must remain queryable, choose a versioned design such as Type 2.')
  ], takeaway: 'Type 3 preserves a limited set of alternative descriptions. Choose the column that matches the report’s business question.' },
  { id: 22, label: '9B', title: 'Type 3: update safely and name the comparison', refs: ['type3', 'hybrids'], nodes: [
    p('This rolling-previous implementation moves the old assignment into `previous_sales_region` only when the incoming assignment differs. The guard matters: replaying the same Central update should leave South in the previous column. The examples use DuckDB, a local analytical SQL database; the downloadable lab creates its tables in memory.'),
    code('type3Load'),
    detail('Compare the same 107 of sales under both maps', [code('type3Report'), table('Expected result', ['perspective', 'region', 'sales'], [['new_map', 'Central', '82.00'], ['new_map', 'West', '25.00'], ['old_map', 'South', '82.00'], ['old_map', 'West', '25.00']])]),
    p('A later move to East would leave Central as previous and erase South from this two-slot representation. If the requirement is specifically “before the 2026 reorganisation,” preserve a named baseline such as `sales_region_before_2026_reorg` once. Agree whether a column means original, previous, or a particular approved map.'),
    p('In this fixture, the original assignments are known and an empty previous slot means unchanged. If an old assignment can itself be unknown, distinguish that state explicitly; blindly falling back to the current region would misrepresent the old map.'),
    call('Load assumptions', 'The example applies one authoritative assignment per customer. Deduplicate incoming changes and define effective order before rotating values. Replaying an older source snapshot must not be treated as a new business change.'),
    detail('Try it: a replay, then a second change', [p('Run the Central update twice. Maya must still be Central / South. Change the incoming value to East and run it: expect East / Central. Explain why neither version of the report can now reconstruct all historical assignments.')])
  ], takeaway: 'A previous-value slot is limited history. A replay guard protects it, and precise column names protect its meaning.' },
  { id: 23, label: '9C', title: 'Type 4: separate a reusable customer profile', refs: ['type4', 'numbering'], nodes: [
    p('Suppose Leafy’s large customer dimension also carries loyalty tier, age band and income band. Creating a full customer version whenever this profile changes can duplicate many stable attributes. A mini-dimension holds the distinct profile combinations separately. This deck uses Kimball’s Type 4 terminology.'),
    { type: 'profileDiagram' },
    table('dim_profile4: one row per combination, shared by customers', ['profile_key', 'loyalty_tier', 'age_band', 'income_band'], [['10', 'Bronze', '25-34', '40k-60k'], ['11', 'Silver', '25-34', '40k-60k']]),
    table('fact_order4: one row per order, with two foreign keys', ['order_number', 'customer_key', 'profile_key', 'amount'], [['SO-5001', '1 · Maya', '10', '64.00'], ['SO-5002', '2 · Leo', '10', '25.00'], ['SO-5003', '1 · Maya', '11', '18.00']]),
    p('Maya’s customer key remains 1 in this simplified base dimension; the later order records profile 11. Leo shares profile 10. A profile row represents a combination, rather than one person or a customer-specific version.'),
    call('Keep the old combinations stable', 'When a profile changes, reuse or create its combination and put that key on the new fact. Editing profile 10 from Bronze to Silver would relabel every old fact that references it.')
  ], takeaway: 'Type 4 stores the customer and the event-time profile as separate dimensions. The fact captures which combination applied.' },
  { id: 24, label: '9D', title: 'Type 4: capture the profile at the event time', refs: ['type4', 'hybrids', 'factless'], nodes: [
    steps(['Prepare the event', 'Resolve the customer and the profile that applied when the order occurred. A historical backfill needs historical profile evidence.'], ['Find or add the combination', 'Look up the complete tuple. Insert an observed combination only when absent; enforce uniqueness.'], ['Write the fact', 'Store both keys. Validate unmatched lookups and reconcile row counts before publishing.']),
    code('type4Report'),
    table('Expected sales by the profile on each order', ['loyalty_tier', 'sales'], [['Bronze', '89.00'], ['Silver', '18.00']]),
    detail('See the complete profile lookup and fact load', [p('The lab provides three unique staged orders, non-null profile bands and a sequence that generates surrogate keys. It validates customer lookups before these statements. Run both inside one transaction.'), code('type4Profiles'), code('type4Facts'), p('The replay guard assumes an identical replay. If the same order ID arrives with different values, validate and apply an explicit correction policy rather than silently ignoring it.')]),
    p('Choose bounded bands deliberately. Three tiers × eight age bands × six income bands permits 144 combinations in this toy design; exact balances or timestamps could make combinations nearly unique per customer. Store observed tuples rather than eagerly generating every possible tuple.'),
    call('What facts cannot tell you', 'If a profile changes between purchases, an order fact alone does not record that change. A dated customer–profile assignment history, such as a factless fact table, is needed for questions about every interval between events.'),
    detail('Try it: a shared profile and a backfill', [p('Give Ana a new order with the same Silver profile: reuse key 11. Then backfill a Maya order from before the tier change: its profile must be 10, even if her current tier is Silver. Explain how you would resolve it if the source supplies only today’s profile.')])
  ], takeaway: 'A mini-dimension stays useful when combinations are reusable and facts carry the correct event-time key.' },
  { id: 25, label: '9E', title: 'Type 6: historical city and current city together', refs: ['type6', 'keys'], nodes: [
    p('Return to Maya’s move from Austin to Denver on 5 March. Type 2 keeps Austin on the old row and Denver on the new one. Type 6 additionally carries `current_city` on every version, allowing both historical and current rollups through the fact’s existing surrogate-key join.'),
    table('After the move: two versions, one current perspective', ['customer_key', 'customer_id', 'city', 'current_city', 'valid_from', 'valid_to', 'is_current'], [
      ['1', 'C-101', 'Austin', 'Denver', '2025-01-10', '2026-03-04', 'false'],
      ['4', 'C-101', 'Denver', 'Denver', '2026-03-05', '9999-12-31', 'true'],
      ['2', 'C-102', 'Denver', 'Denver', '2025-06-01', '9999-12-31', 'true']
    ]),
    p('SO-5001 still points to key 1. Its historical city is Austin, but its current city is Denver. SO-5003 points to key 4. These examples retain the earlier slides’ inclusive dates: the old version ends on 4 March and the new one starts on 5 March.'),
    code('type6Report'),
    table('Same three orders; both views total 107', ['perspective', 'city', 'sales'], [['as_is', 'Denver', '107.00'], ['as_was', 'Austin', '64.00'], ['as_was', 'Denver', '43.00']]),
    call('Why “1 + 2 + 3”?', 'Type 2 supplies versioned rows; the extra alternate-view column is the Type 3 idea; its values are overwritten using Type 1 behaviour. This Kimball hybrid does not require a separate previous_city column.')
  ], takeaway: 'The fact key preserves its historical version. Choosing city or current_city changes the analytical perspective without a second dimension join.' },
  { id: 26, label: '9F', title: 'Type 6: update every version, then prove both views', refs: ['type6', 'hybrids'], nodes: [
    p('For an ordered, effective-dated change, detect the real difference before modifying rows. Close the old version, insert the new one, and overwrite `current_city` for every version of the same customer. A transaction publishes those steps together.'),
    steps(['Keep the historical column', 'Expired rows retain their city and surrogate key.'], ['Propagate the current column', 'Every C-101 row receives Denver, including key 1.'], ['Keep fact keys stable', 'Existing facts retain their historical keys; new or late facts use an event-date lookup.']),
    detail('The transactional update used in the lab', [p('DuckDB SQL. The fixture provides a surrogate-key sequence and one deduplicated change per customer, with an effective date strictly after the existing version’s start. Detecting only changed values makes an identical replay a no-op. For multiple changes within a day, use timestamp intervals and a consistent half-open boundary rule.'), code('type6Load')]),
    call('Two easy mistakes', 'Updating current_city only WHERE is_current leaves old facts grouped under stale “current” values. Conversely, filtering WHERE is_current after joining facts by their historical key drops Maya’s old 64 of sales: the remaining total is only 43.'),
    p('Use a durable identity to group all versions. In this example `customer_id` is assumed stable; if a source can reassign or replace it, resolve a warehouse-managed durable identity first. Test one current row, no overlapping intervals, and a single current-city value across each customer’s versions.'),
    p('The trade-off is deliberate: the historical city remains reproducible, while yesterday’s “as is” report may change after another move. Many versions also mean more rows to update. Type 2 plus a separate current-row join can be simpler when the combined view is rarely needed.'),
    detail('Try it: replay, failure and a third city', [p('Replay the Denver change: no extra version should appear. Roll back a deliberately interrupted update: readers should retain the previous state. Then apply a later Seattle move: historical cities must remain Austin / Denver / Seattle, while every current_city becomes Seattle. Retroactive corrections need interval repair; do not run them blindly through this forward-change example.')]),
    { type: 'labLinks' }
  ], takeaway: 'Type 6 is useful when both perspectives are common enough to justify maintaining a current attribute on all historical rows.' }
];
module.exports = { sources, sql, setup, slides };
