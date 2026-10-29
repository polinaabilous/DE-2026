"""Tests for the lab tools and documents. Run from the lab folder: python -m pytest -q"""
import sys
from pathlib import Path

import pytest

LAB = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LAB))
import acceptance  # noqa: E402
import bus_matrix  # noqa: E402
import doclint  # noqa: E402

TEMPLATES = LAB.parent / 'templates'
TEMPLATE_KINDS = {'intake.md': 'intake', 'definition.md': 'definition', 'metric-spec.md': 'spec',
                  'design-doc-one-page.md': 'design', 'adr.md': 'adr', 'pr-description.md': 'pr',
                  'readme.md': 'readme', 'status-update.md': 'status'}


@pytest.mark.parametrize('name,kind', sorted(TEMPLATE_KINDS.items()))
def test_blank_template_has_every_section_but_fails_on_placeholders(name, kind):
    problems = doclint.lint(kind, (TEMPLATES / name).read_text(encoding='utf-8'))
    assert any(p.startswith('placeholder left') for p in problems)
    assert not any(p.startswith(('missing section', 'empty section')) for p in problems)


def test_worked_examples_pass_and_first_drafts_fail():
    for f in sorted((LAB / 'examples').glob('*.md')):
        problems = doclint.lint(doclint.kind_from_name(f), f.read_text(encoding='utf-8'))
        assert bool(problems) == ('before' in f.name), (f.name, problems)


def test_model_answers_and_this_readme_pass():
    files = sorted((LAB / 'solutions').glob('*.md')) + [LAB / 'README.md']
    for f in files:
        assert doclint.lint(doclint.kind_from_name(f), f.read_text(encoding='utf-8')) == [], f.name


def test_quoted_words_are_not_flagged_but_plain_ones_are():
    assert doclint.vague_terms('> Need it ASAP\nThey said "real-time".') == []
    assert [t for t, _ in doclint.vague_terms('Refresh in real time, ASAP.')] == ['ASAP', 'real time']


@pytest.mark.parametrize('csv', ['data/beam_events.csv', 'solutions/beam-fuel-smart.csv'])
def test_bus_matrices_pass_their_checks(csv):
    assert bus_matrix.checks(bus_matrix.load(str(LAB / csv))) == []


def test_bus_matrix_flags_an_event_without_a_date(tmp_path):
    bad = tmp_path / 'bad.csv'
    bad.write_text('process,fact_table,grain,w,item\nShipments,fct_shipment,one row per parcel,who,Customer\n')
    assert bus_matrix.checks(bus_matrix.load(str(bad))) == [
        'Shipments: no "when": every business event needs a date']


def test_acceptance_criteria_pass_on_the_fixture():
    assert acceptance.main([str(LAB / 'data' / 'leafy_orders.csv')]) == 0
