from conftest import impl

p1 = impl("p1")


def test_parse_keeps_good_lines_and_explains_rejects(event_lines):
    events, rejects = p1.parse_events(event_lines)
    assert len(events) == 17
    assert rejects == [(13, "malformed json"), (14, "missing event_ts")]
    assert len(events) + len(rejects) + 1 == len(event_lines)      # + 1 blank line


def test_parse_keeps_null_user_and_parses_offsets(event_lines):
    events, _ = p1.parse_events(event_lines)
    e09 = next(e for e in events if e["event_id"] == "E09")
    assert e09["user_id"] is None
    assert e09["event_ts"].utcoffset().total_seconds() == -5 * 3600


def test_count_by_type_sorted_by_count_then_name(event_lines):
    events, _ = p1.parse_events(event_lines)
    assert p1.count_by_type(events) == [("view", 9), ("add_to_cart", 6), ("purchase", 2)]


def test_empty_input():
    assert p1.parse_events([]) == ([], [])
    assert p1.count_by_type([]) == []
