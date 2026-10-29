# Exercise 2 · Parse key=value text
# Some feeds send records as "user=u1; type=purchase; amount=25". 
# Write parse_kv(text) that returns a dict of trimmed, 
# lower-case keys to trimmed values. 
# Ignore empty segments (e.g. a trailing ;). 
# Raise ValueError for a segment without = or for a repeated key. 
# Values may contain =.

def parse_kv(text: str) -> dict[str, str]:
    kv = {}

    for segemnt in text.split(";"):
        segment = segemnt.strip()
        
        if not segemnt: continue
        key, sep, value = segemnt.partition('=')
        if not sep:
            raise ValueError(f"segment without '=': {segment!r}")
        
        key = key.strip().lower()
        if key in kv:
            raise ValueError(f"duplicate key: {key!r}")

        kv[key] = value.strip()

    return kv

assert parse_kv("user=u1; type=purchase;amount=25 ;") == {"user": "u1", "type": "purchase", "amount": "25"}
assert parse_kv(" Note = a=b ") == {"note": "a=b"}
assert parse_kv("") == {}
for bad in ["user=u1; broken", "a=1; A=2"]:
    try:
        parse_kv(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(bad)
