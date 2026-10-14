"""Lab tests. Run from the lab folder: python -m pytest -q"""
import json
import os
from collections import Counter
from pathlib import Path

import duckdb
import pytest

LAB = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def con():
    old = os.getcwd()
    os.chdir(LAB)                      # views read data/... relative to the lab folder
    c = duckdb.connect()
    for path in sorted((LAB / "sql").glob("*.sql")):
        c.execute(path.read_text(encoding="utf-8"))
    yield c
    c.close()
    os.chdir(old)


def latest_products():
    """Plain-Python reference: newest version of each product code."""
    lines = (LAB / "data" / "off_products.jsonl").read_text(encoding="utf-8").splitlines()
    latest = {}
    for doc in (json.loads(line) for line in lines if line.strip()):
        kept = latest.get(doc["code"])
        if kept is None or doc["last_modified_t"] > kept["last_modified_t"]:
            latest[doc["code"]] = doc
    return latest


def ingredient_ids(ingredients):
    for ing in ingredients or []:
        yield ing["id"].strip().lower()
        yield from ingredient_ids(ing.get("ingredients"))


def test_one_row_per_product(con):
    rows, codes = con.execute("SELECT count(*), count(DISTINCT code) FROM stg_products").fetchone()
    assert rows == codes == len(latest_products())


def test_newest_version_wins(con):
    sugars = con.execute("SELECT sugars_100g FROM stg_products WHERE code = '0000000000017'").fetchone()[0]
    assert sugars == latest_products()["0000000000017"]["nutriments"]["sugars_100g"] == 18.5


def test_nutriments_are_typed(con):
    cols = con.execute("SELECT column_name, data_type FROM information_schema.columns "
                       "WHERE table_name = 'stg_products'").fetchall()
    nutrient_types = {t for c, t in cols if c.endswith("_100g")}
    assert nutrient_types == {"DOUBLE"}


def test_bad_values_are_listed_not_hidden(con):
    issues = con.execute("SELECT code, nutrient, raw_value FROM nutrient_issues ORDER BY ALL").fetchall()
    assert issues == [("0000000000116", "proteins_100g", '"20,5"')]


def test_energy_derived_from_kj_is_flagged(con):
    kcal, derived = con.execute("SELECT energy_kcal_100g, energy_kcal_derived FROM stg_products "
                                "WHERE code = '0000000000093'").fetchone()
    assert derived is True and kcal == round(2590 / 4.184, 1)


def test_ingredient_grain_is_unique(con):
    duplicates = con.execute("SELECT count(*) - count(DISTINCT (code, path)) FROM product_ingredients").fetchone()[0]
    assert duplicates == 0


def test_products_without_ingredients_are_reported(con):
    states = dict(con.execute("SELECT ingredients_state, products FROM ingredient_coverage").fetchall())
    assert states == {"has values": 9, "empty": 1, "missing": 1}
    assert sum(states.values()) == len(latest_products())


def test_products_per_ingredient_matches_python_without_fan_out(con):
    expected = Counter(i for doc in latest_products().values()
                       for i in set(ingredient_ids(doc.get("ingredients"))))
    got = dict(con.execute("SELECT ingredient_id, products FROM products_per_ingredient").fetchall())
    assert got == dict(expected)
    assert got["en:sugar"] == 3        # listed twice in the cookies, still one product
    assert max(got.values()) <= len(latest_products())
