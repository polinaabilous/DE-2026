from conftest import impl

p1 = impl("p1")
p2 = impl("p2")


def test_dedupe_keeps_latest_ingested_copy(event_lines):
    events, _ = p1.parse_events(event_lines)
    latest = p2.dedupe_latest(events)
    assert len(latest) == 15
    e08 = [e for e in latest if e["event_id"] == "E08"]
    assert len(e08) == 1 and e08[0]["event_type"] == "add_to_cart"


def test_dedupe_tie_goes_to_later_line(event_lines):
    events, _ = p1.parse_events(event_lines)
    e05 = [e for e in p2.dedupe_latest(events) if e["event_id"] == "E05"]
    assert [e["line"] for e in e05] == [20]


def test_daily_active_users_in_local_time(event_lines):
    events, _ = p1.parse_events(event_lines)
    dau = p2.daily_active_users(p2.dedupe_latest(events))
    assert dau == {"2026-03-07": 2, "2026-03-08": 3, "2026-03-09": 3, "2026-03-10": 1}
    assert list(dau) == sorted(dau)


def test_daily_active_users_in_utc_differs(event_lines):
    events, _ = p1.parse_events(event_lines)
    dau = p2.daily_active_users(p2.dedupe_latest(events), tz="UTC")
    assert dau == {"2026-03-07": 1, "2026-03-08": 3, "2026-03-09": 2, "2026-03-10": 1}
