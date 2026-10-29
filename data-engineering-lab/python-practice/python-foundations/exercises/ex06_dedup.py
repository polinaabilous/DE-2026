# Exercise 6 · Deduplicate by natural key, keep first
# A source without event IDs (the id here is just a row number)
#  can only be deduplicated by a natural key: (user_id, event_type, ts). 
# Write dedupe_first(rows) returning (kept_rows, dropped_count): 
# keep the first row for each key and preserve input order.

rows = [
    {"id": "a", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "b", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "c", "user_id": "u2", "event_type": "page_view", "ts": "2026-03-02T09:15:00Z"},
    {"id": "d", "user_id": "u1", "event_type": "purchase",  "ts": "2026-03-02T09:03:00Z"},
    {"id": "e", "user_id": "u1", "event_type": "page_view", "ts": "2026-03-02T09:03:00Z"},
]

def dedupe_first(rows: list[dict]) -> tuple[list[dict], int]:
    seen: set[tuple[str, str, str]] = set()
    kept: list[dict] = []

    for row in rows:
        key = (row["user_id"], row["event_type"], row["ts"])

        if key in seen: continue
        seen.add(key)
        kept.append(row)

    return (kept, len(rows) - len(kept))


kept, dropped = dedupe_first(rows)
assert [r["id"] for r in kept] == ["a", "c", "e"] and dropped == 2