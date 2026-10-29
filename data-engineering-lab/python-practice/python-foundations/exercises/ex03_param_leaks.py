# Exercise 3 · Bug hunt: tags that leak between records
# This function is supposed to return a new record with one more tag, 
# leaving the input untouched. 
# Explain the bugs, then rewrite it so the tests pass.

def add_tag(record, tag, tags=[]):
    old_tags = record.get("tags", [])
    return {**record, "tags": [*old_tags, tag]} 

# Tests for the fixed version
r = {"event_id": "e1"}
r1 = add_tag(r, "web")
r2 = add_tag(r1, "promo")
assert r == {"event_id": "e1"}                     # input untouched
assert r1["tags"] == ["web"]
assert r2["tags"] == ["web", "promo"]
assert r1["tags"] is not r2["tags"]                # no shared lists
assert add_tag({"event_id": "e2"}, "x")["tags"] == ["x"]