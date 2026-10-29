"""Tests for the Leafy Box scorecards. Properties first, then a few pinned values from the fixed seed."""
import pytest


def by(rows, key):
    return {r[key]: r for r in rows}


def test_channel_scorecard_shape_and_definitions(impl, con):
    sc = by(impl.channel_scorecard(con), 'channel')
    assert set(sc) == {'paid_search', 'paid_social', 'influencer', 'referral'}      # paid channels only
    for r in sc.values():
        assert r['cac'] == pytest.approx(float(r['spend']) / r['new_customers'], abs=0.01)
        assert r['mrr'] > 0 and 25 <= r['arpa'] <= 40
        assert r['formula_ltv'] == pytest.approx(float(r['arpa']) * float(r['cm_pct']) / float(r['monthly_churn']), rel=0.01)
        assert r['ltv_12m'] > r['ltv_6m'] > 0
        assert r['ltv12_to_cac'] == pytest.approx(float(r['ltv_12m']) / float(r['cac']), abs=0.01)


def test_channel_scorecard_decision(impl, con):
    sc = by(impl.channel_scorecard(con), 'channel')
    assert max(sc, key=lambda c: sc[c]['ltv12_to_cac']) == 'referral'
    assert sc['influencer']['payback_months'] is None                                 # not paid back yet
    assert sc['paid_social']['payback_months'] > sc['paid_search']['payback_months'] > sc['referral']['payback_months']


def test_channel_scorecard_pinned(impl, con):
    sc = by(impl.channel_scorecard(con), 'channel')
    assert float(sc['referral']['cac']) == pytest.approx(15.00)
    assert float(sc['paid_search']['cac']) == pytest.approx(62.46, abs=0.01)
    assert float(sc['paid_social']['ltv_12m']) == pytest.approx(41.04, abs=0.01)
    assert float(sc['paid_search']['mrr']) == pytest.approx(6545.00)
    assert {c: r['payback_months'] for c, r in sc.items()} == {
        'referral': 3, 'paid_search': 10, 'paid_social': 11, 'influencer': None}


def test_ops_scorecard(impl, con):
    ops = by(impl.ops_scorecard(con), 'asset_name')
    assert len(ops) == 6                                                              # zero-failure asset kept
    idle = ops['label_printer_2']
    assert idle['failures'] == 0 and idle['mtbf_h'] is None and float(idle['availability']) == 1.0
    for r in ops.values():
        if r['failures']:
            mtbf, mttr = float(r['mtbf_h']), float(r['mttr_recover_h'])
            assert float(r['availability']) == pytest.approx(mtbf / (mtbf + mttr), abs=0.0005)
    assert ops['packing_line_1']['failures'] == 17
    assert sum(r['open_incidents'] for r in ops.values()) == 2
    assert float(ops['conveyor_1']['mttr_recover_h']) > float(ops['conveyor_1']['median_recover_h'])
    assert float(ops['label_printer_1']['sla_attainment']) == pytest.approx(0.833, abs=0.001)


def test_checkout_slo(impl, con):
    months = impl.checkout_slo(con)
    assert [m['slo_met'] for m in months] == [True, False, True]
    assert float(months[1]['budget_used']) == pytest.approx(1.45, abs=0.01)


def test_flow_and_littles_law(impl, con):
    f = impl.flow_scorecard(con)
    assert f['boxes_shipped'] == 824
    assert float(f['boxes_per_labour_hour']) == pytest.approx(1.073, abs=0.001)
    assert abs(float(f['little_wip']) - float(f['measured_wip'])) / float(f['measured_wip']) < 0.05
