# Exercise 5 · Multi-key sort with None last
# Write sort_events(rows) returning a new list ordered by user_id ascending, 
# then amount descending with None after every number, 
# then ts ascending 
# (the ts strings are all UTC Z, so string order equals time order).

from decimal import Decimal
rows = [
    {"id": "a", "user_id": "u2", "amount": Decimal("5"),  "ts": "2026-03-02T10:00:00Z"},
    {"id": "b", "user_id": "u1", "amount": None,          "ts": "2026-03-02T08:00:00Z"},
    {"id": "c", "user_id": "u1", "amount": Decimal("64"), "ts": "2026-03-02T09:00:00Z"},
    {"id": "d", "user_id": "u1", "amount": Decimal("64"), "ts": "2026-03-02T07:00:00Z"},
    {"id": "e", "user_id": "u1", "amount": Decimal("0"),  "ts": "2026-03-02T06:00:00Z"},
]

def sort_events(rows: list[dict]) -> list[dict]:
    def key(r):
        amount = r["amount"]
        return (r["user_id"], amount is None, -amount if amount is not None else 0, r["ts"])
    return sorted(rows, key=key)

assert [r["id"] for r in sort_events(rows)] == ["d", "c", "e", "b", "a"]
assert [r["id"] for r in rows] == ["a", "b", "c", "d", "e"]      # input order unchanged
