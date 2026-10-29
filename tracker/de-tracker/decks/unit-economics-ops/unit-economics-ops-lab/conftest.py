import importlib
import os
import sys

import duckdb
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def pytest_addoption(parser):
    parser.addoption('--impl', default='scorecard',
                     help="module under test: 'scorecard' (your file, default) or 'reference'")


@pytest.fixture(scope='session')
def impl(request):
    name = request.config.getoption('--impl')
    return importlib.import_module('reference.scorecard_solution' if name == 'reference' else name)


@pytest.fixture(scope='session')
def con():
    db = os.path.join(HERE, 'leafy_box.duckdb')
    if not os.path.exists(db):
        import make_data
        make_data.main()
    c = duckdb.connect(db)
    yield c
    c.close()
