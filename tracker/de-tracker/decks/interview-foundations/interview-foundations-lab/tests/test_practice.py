import json

import practice


def m(day, retries=""):
    return {"date": day, "retries": retries}


def test_first_retry_is_one_day_later():
    assert str(practice.next_due(m("2026-10-14"))) == "2026-10-15"


def test_clean_retries_space_out_then_close():
    assert str(practice.next_due(m("2026-10-14", "2026-10-15:clean"))) == "2026-10-18"
    assert str(practice.next_due(m("2026-10-14", "2026-10-15:clean;2026-10-18:clean"))) == "2026-10-25"
    assert practice.next_due(m("2026-10-14", "2026-10-15:clean;2026-10-18:clean;2026-10-25:clean")) is None


def test_a_miss_resets_the_schedule():
    assert str(practice.next_due(m("2026-10-14", "2026-10-15:clean;2026-10-18:miss"))) == "2026-10-19"


def test_score_finds_weakest_dimension(tmp_path):
    rubric = json.loads(open("examples/rubric-session1.json", encoding="utf-8").read())
    assert practice.score(rubric) == ("technical", 10, 15, "testing", False)
