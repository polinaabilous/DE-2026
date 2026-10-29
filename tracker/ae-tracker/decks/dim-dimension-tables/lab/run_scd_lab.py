"""Synthetic SCD lab. Requires duckdb==1.5.6; all data stays in memory."""
import duckdb

SETUP = "CREATE TABLE dim_customer3 (\n    customer_key INTEGER PRIMARY KEY, customer_id VARCHAR UNIQUE,\n    name VARCHAR, sales_region VARCHAR NOT NULL, previous_sales_region VARCHAR\n);\nINSERT INTO dim_customer3 VALUES\n    (1, 'C-101', 'Maya', 'South', NULL),\n    (2, 'C-102', 'Leo', 'West', NULL),\n    (3, 'C-103', 'Ana', 'Northwest', NULL);\nCREATE TABLE fact_order3 (\n    order_number VARCHAR PRIMARY KEY, order_date DATE,\n    customer_key INTEGER REFERENCES dim_customer3(customer_key),\n    amount DECIMAL(10,2)\n);\nINSERT INTO fact_order3 VALUES\n    ('SO-5001', '2026-03-02', 1, 64),\n    ('SO-5002', '2026-03-02', 2, 25),\n    ('SO-5003', '2026-03-09', 1, 18);\n\nCREATE TABLE dim_customer4 (\n    customer_key INTEGER PRIMARY KEY, customer_id VARCHAR UNIQUE,\n    name VARCHAR\n);\nINSERT INTO dim_customer4 VALUES\n    (1, 'C-101', 'Maya'), (2, 'C-102', 'Leo'), (3, 'C-103', 'Ana');\nCREATE SEQUENCE profile4_seq START 10;\nCREATE TABLE dim_profile4 (\n    profile_key INTEGER PRIMARY KEY DEFAULT nextval('profile4_seq'),\n    loyalty_tier VARCHAR NOT NULL, age_band VARCHAR NOT NULL,\n    income_band VARCHAR NOT NULL,\n    UNIQUE(loyalty_tier, age_band, income_band)\n);\nINSERT INTO dim_profile4 VALUES (-1, 'Unknown', 'Unknown', 'Unknown');\nCREATE TABLE stg_order4 AS\nSELECT * FROM (VALUES\n    ('SO-5001', DATE '2026-03-02', 'C-101', 'Bronze', '25-34', '40k-60k', 64.00),\n    ('SO-5002', DATE '2026-03-02', 'C-102', 'Bronze', '25-34', '40k-60k', 25.00),\n    ('SO-5003', DATE '2026-03-09', 'C-101', 'Silver', '25-34', '40k-60k', 18.00)\n) AS t(order_number, order_date, customer_id, loyalty_tier, age_band, income_band, amount);\nCREATE TABLE fact_order4 (\n    order_number VARCHAR PRIMARY KEY, order_date DATE,\n    customer_key INTEGER REFERENCES dim_customer4(customer_key),\n    profile_key INTEGER REFERENCES dim_profile4(profile_key),\n    amount DECIMAL(10,2)\n);\n\nCREATE SEQUENCE customer6_seq START 4;\nCREATE TABLE dim_customer6 (\n    customer_key INTEGER PRIMARY KEY DEFAULT nextval('customer6_seq'),\n    customer_id VARCHAR, name VARCHAR, city VARCHAR, current_city VARCHAR,\n    valid_from DATE, valid_to DATE, is_current BOOLEAN\n);\nINSERT INTO dim_customer6 VALUES\n    (1, 'C-101', 'Maya', 'Austin', 'Austin', '2025-01-10', '9999-12-31', TRUE),\n    (2, 'C-102', 'Leo', 'Denver', 'Denver', '2025-06-01', '9999-12-31', TRUE),\n    (3, 'C-103', 'Ana', 'Seattle', 'Seattle', '2025-11-20', '9999-12-31', TRUE);\nCREATE TABLE stg_city6 AS\nSELECT 'C-101' AS customer_id, 'Maya' AS name,\n       'Denver' AS city, DATE '2026-03-05' AS effective_date;\nCREATE TABLE stg_order6 AS\nSELECT * FROM (VALUES\n    ('SO-5001', DATE '2026-03-02', 'C-101', 64.00),\n    ('SO-5002', DATE '2026-03-02', 'C-102', 25.00),\n    ('SO-5003', DATE '2026-03-09', 'C-101', 18.00)\n) AS t(order_number, order_date, customer_id, amount);\nCREATE TABLE fact_order6 (\n    order_number VARCHAR PRIMARY KEY, order_date DATE,\n    customer_key INTEGER REFERENCES dim_customer6(customer_key),\n    amount DECIMAL(10,2)\n);"
SQL = {
    "type3Load": "UPDATE dim_customer3\nSET previous_sales_region = sales_region,\n    sales_region = 'Central'\nWHERE customer_id = 'C-101'\n  AND sales_region IS DISTINCT FROM 'Central';",
    "type3Report": "SELECT 'new_map' AS perspective,\n       d.sales_region AS region, SUM(f.amount) AS sales\nFROM fact_order3 AS f\nJOIN dim_customer3 AS d USING (customer_key)\nGROUP BY d.sales_region\nUNION ALL\nSELECT 'old_map',\n       COALESCE(d.previous_sales_region, d.sales_region),\n       SUM(f.amount)\nFROM fact_order3 AS f\nJOIN dim_customer3 AS d USING (customer_key)\nGROUP BY COALESCE(d.previous_sales_region, d.sales_region)\nORDER BY perspective, region;",
    "type4Profiles": "INSERT INTO dim_profile4 (loyalty_tier, age_band, income_band)\nSELECT DISTINCT s.loyalty_tier, s.age_band, s.income_band\nFROM stg_order4 AS s\nWHERE NOT EXISTS (\n    SELECT 1 FROM dim_profile4 AS p\n    WHERE p.loyalty_tier = s.loyalty_tier\n      AND p.age_band = s.age_band\n      AND p.income_band = s.income_band\n)\nORDER BY 1, 2, 3;",
    "type4Facts": "INSERT INTO fact_order4\nSELECT s.order_number, s.order_date,\n       c.customer_key, p.profile_key, s.amount\nFROM stg_order4 AS s\nJOIN dim_customer4 AS c USING (customer_id)\nJOIN dim_profile4 AS p\n  ON p.loyalty_tier = s.loyalty_tier\n AND p.age_band = s.age_band\n AND p.income_band = s.income_band\nWHERE NOT EXISTS (\n    SELECT 1 FROM fact_order4 AS f\n    WHERE f.order_number = s.order_number\n);",
    "type4Report": "SELECT p.loyalty_tier, SUM(f.amount) AS sales\nFROM fact_order4 AS f\nJOIN dim_customer4 AS c USING (customer_key)\nJOIN dim_profile4 AS p USING (profile_key)\nGROUP BY p.loyalty_tier\nORDER BY p.loyalty_tier;",
    "type6Load": "BEGIN TRANSACTION;\n-- Freeze the actual changes before expiring any rows.\nCREATE OR REPLACE TEMP TABLE changed6 AS\nSELECT s.*\nFROM stg_city6 AS s\nJOIN dim_customer6 AS d USING (customer_id)\nWHERE d.is_current AND d.city IS DISTINCT FROM s.city;\n\nUPDATE dim_customer6 AS d\nSET valid_to = s.effective_date - 1, is_current = FALSE\nFROM changed6 AS s\nWHERE d.customer_id = s.customer_id AND d.is_current;\n\nINSERT INTO dim_customer6\n    (customer_id, name, city, current_city,\n     valid_from, valid_to, is_current)\nSELECT customer_id, name, city, city,\n       effective_date, DATE '9999-12-31', TRUE\nFROM changed6;\n\n-- Deliberately update EVERY version of the customer.\nUPDATE dim_customer6 AS d\nSET current_city = s.city\nFROM changed6 AS s\nWHERE d.customer_id = s.customer_id;\nCOMMIT;",
    "type6Facts": "INSERT INTO fact_order6\nSELECT s.order_number, s.order_date, d.customer_key, s.amount\nFROM stg_order6 AS s\nJOIN dim_customer6 AS d\n  ON d.customer_id = s.customer_id\n AND s.order_date BETWEEN d.valid_from AND d.valid_to\nWHERE NOT EXISTS (\n    SELECT 1 FROM fact_order6 AS f\n    WHERE f.order_number = s.order_number\n);",
    "type6Report": "SELECT 'as_was' AS perspective,\n       d.city, SUM(f.amount) AS sales\nFROM fact_order6 AS f\nJOIN dim_customer6 AS d USING (customer_key)\nGROUP BY d.city\nUNION ALL\nSELECT 'as_is', d.current_city, SUM(f.amount)\nFROM fact_order6 AS f\nJOIN dim_customer6 AS d USING (customer_key)\nGROUP BY d.current_city\nORDER BY perspective, city;"
}

def run():
    c = duckdb.connect(":memory:")
    try:
        c.execute(SETUP)
        c.execute(SQL["type3Load"])
        region_report = c.execute(SQL["type3Report"]).fetchall()
        assert region_report == [("new_map", "Central", 82), ("new_map", "West", 25),
                                 ("old_map", "South", 82), ("old_map", "West", 25)]
        before = c.execute("SELECT * FROM dim_customer3 ORDER BY customer_key").fetchall()
        c.execute(SQL["type3Load"])
        assert before == c.execute("SELECT * FROM dim_customer3 ORDER BY customer_key").fetchall()
        c.execute(SQL["type3Load"].replace("Central", "East"))
        assert c.execute("SELECT sales_region, previous_sales_region FROM dim_customer3 WHERE customer_id='C-101'").fetchone() == ("East", "Central")

        def load4():
            c.execute("BEGIN")
            try:
                # A missing lookup must fail rather than silently drop orders.
                assert c.execute("SELECT count(*) FROM stg_order4 s LEFT JOIN dim_customer4 d USING(customer_id) WHERE d.customer_key IS NULL").fetchone()[0] == 0
                c.execute(SQL["type4Profiles"])
                c.execute(SQL["type4Facts"])
                c.execute("COMMIT")
            except BaseException:
                c.execute("ROLLBACK")
                raise
        load4()
        profile_report = c.execute(SQL["type4Report"]).fetchall()
        assert profile_report == [("Bronze", 89), ("Silver", 18)]
        profiles = c.execute("SELECT * FROM dim_profile4 ORDER BY profile_key").fetchall()
        facts4 = c.execute("SELECT * FROM fact_order4 ORDER BY order_number").fetchall()
        assert len(profiles) == 3  # two observed combinations plus Unknown
        assert c.execute("SELECT count(*) FROM dim_customer4").fetchone()[0] == 3
        assert facts4[0][3] == facts4[1][3] == 10
        assert facts4[2][3] == 11
        load4()
        assert profiles == c.execute("SELECT * FROM dim_profile4 ORDER BY profile_key").fetchall()
        assert facts4 == c.execute("SELECT * FROM fact_order4 ORDER BY order_number").fetchall()

        c.execute(SQL["type6Load"])
        c.execute(SQL["type6Facts"])
        city_report = c.execute(SQL["type6Report"]).fetchall()
        assert city_report == [("as_is", "Denver", 107), ("as_was", "Austin", 64), ("as_was", "Denver", 43)]
        versions = c.execute("SELECT * FROM dim_customer6 ORDER BY customer_key").fetchall()
        assert len(versions) == 4
        c.execute(SQL["type6Load"])
        c.execute(SQL["type6Facts"])
        assert versions == c.execute("SELECT * FROM dim_customer6 ORDER BY customer_key").fetchall()
        assert c.execute("SELECT count(*), sum(amount) FROM fact_order6").fetchone() == (3, 107)
        for day, expected in [("2026-03-04", 1), ("2026-03-05", 4)]:
            keys = c.execute("SELECT customer_key FROM dim_customer6 WHERE customer_id='C-101' AND CAST(? AS DATE) BETWEEN valid_from AND valid_to", [day]).fetchall()
            assert keys == [(expected,)]
        wrong = c.execute("SELECT sum(f.amount) FROM fact_order6 f JOIN dim_customer6 d USING(customer_key) WHERE d.is_current").fetchone()[0]
        assert wrong == 43  # the old 64 disappeared

        c.execute("BEGIN")
        try:
            c.execute("UPDATE dim_customer6 SET is_current=FALSE WHERE customer_id='C-101' AND is_current")
            raise RuntimeError("simulated interruption after expiry")
        except RuntimeError:
            c.execute("ROLLBACK")
        assert versions == c.execute("SELECT * FROM dim_customer6 ORDER BY customer_key").fetchall()

        c.execute("UPDATE stg_city6 SET city='Seattle', effective_date=DATE '2026-06-01'")
        c.execute(SQL["type6Load"])
        assert c.execute("SELECT city, current_city FROM dim_customer6 WHERE customer_id='C-101' ORDER BY valid_from").fetchall() == [("Austin", "Seattle"), ("Denver", "Seattle"), ("Seattle", "Seattle")]
        assert c.execute("SELECT customer_id FROM dim_customer6 GROUP BY customer_id HAVING count(*) FILTER(WHERE is_current) <> 1").fetchall() == []
        assert c.execute("SELECT customer_id FROM dim_customer6 GROUP BY customer_id HAVING count(DISTINCT current_city) <> 1").fetchall() == []
        assert c.execute("SELECT a.customer_key FROM dim_customer6 a JOIN dim_customer6 b ON a.customer_id=b.customer_id AND a.customer_key<b.customer_key AND a.valid_from<=b.valid_to AND b.valid_from<=a.valid_to").fetchall() == []
        later = c.execute(SQL["type6Report"]).fetchall()
        assert later == [("as_is", "Denver", 25), ("as_is", "Seattle", 82), ("as_was", "Austin", 64), ("as_was", "Denver", 43)]
        print("Type 3, before the optional East exercise:", region_report)
        print("Type 4, event-time profiles:", profile_report)
        print("Type 6, before the optional Seattle move:", city_report)
        print("PASS: exact totals, shared profiles, identical replays, effective-date boundaries, rollback and current attributes on every version.")
        print("DuckDB", duckdb.__version__)
    finally:
        c.close()

if __name__ == "__main__":
    run()
