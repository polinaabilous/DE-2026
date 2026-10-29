# Exercise 4 · Distinct event types per user
# Write types_per_user(rows) 
# returning {user: sorted list of distinct event types}. 
# Normalise users and types (strip + lower) and skip rows without a user.

from collections import defaultdict

rows = [
    {"id": "a", "user_id": " U1", "event_type": "Page_View"},
    {"id": "b", "user_id": "u1",  "event_type": "purchase"},
    {"id": "c", "user_id": None,  "event_type": "purchase"},
    {"id": "d", "user_id": "u2",  "event_type": "page_view"},
    {"id": "e", "user_id": "u1",  "event_type": "page_view"},
]

def types_per_user(rows: list[dict]) -> dict[str, list[str]]:
    groups: defaultdict[str, set[str]] = defaultdict(set)

    for row in rows:
        user = (row.get("user_id") or "").strip().lower()
        if not user: continue
        groups[user].add(row.get("event_type", "").strip().lower())

    return {user: sorted(list(types)) for user, types in sorted(groups.items())}

assert types_per_user(rows) == {"u1": ["page_view", "purchase"], "u2": ["page_view"]}