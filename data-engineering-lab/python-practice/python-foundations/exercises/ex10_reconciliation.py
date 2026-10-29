# Exercise 10 · Reconcile two batches
# A reconciliation compares what should have arrived with what did. 
# Write reconcile(expected_ids, received_ids) returning a dict with 
# missing (expected but not received, sorted), 
# unexpected (received but not expected, sorted),
# and duplicated ({id: count} for IDs received more than once).

from collections import Counter

def reconcile(expected_ids: list[str], received_ids: list[str]) -> dict:
    missing = sorted(set(expected_ids) - set(received_ids))
    unexpected = sorted(set(received_ids) - set(expected_ids))
    duplicated = {k:v for k, v in Counter(received_ids).items() if v > 1}

    return {"missing": missing, "unexpected": unexpected, "duplicated": duplicated}

report = reconcile(["e1", "e2", "e3", "e4"], ["e3", "e1", "e3", "e9", "e2", "e3"])
assert report == {"missing": ["e4"], "unexpected": ["e9"], "duplicated": {"e3": 3}}
