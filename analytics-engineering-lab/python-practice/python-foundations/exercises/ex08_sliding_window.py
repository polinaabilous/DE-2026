# Exercise 8 · Detect bursts with a sliding window
# Fraud and bot detection often ask: 
# did a user produce at least k events within any w-minute window? 
# Write bursts(events, window=timedelta(minutes=10), threshold=3) 
# returning the set of such users. 
# An event at time t counts in the window ending at now 
# if now - t < window. Input is (user, ts) pairs in any order.

from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque

t0 = datetime(2026, 3, 2, 9, 0, tzinfo=timezone.utc)
m = lambda minutes: t0 + timedelta(minutes=minutes)
events = [("u2", m(10)), ("u1", m(0)), ("u2", m(0)), ("u1", m(4)), ("u3", m(1)), ("u2", m(5)), ("u1", m(9)), ("u3", m(0))]

def bursts(events, window=timedelta(minutes=10), threshold=3) -> set[str]:
    recent: defaultdict[str, deque] = defaultdict(deque)
    flagged: set[str] = set()
    for user, ts in sorted(events, key=lambda e: e[1]):
        q = recent[user]
        q.append(ts)
        while ts - q[0] >= window:          # drop events outside the window
            q.popleft()
        if len(q) >= threshold:
            flagged.add(user)
    return flagged

assert bursts(events) == {"u1"}                        # u1: 0, 4, 9 -> 3 events within 10 min
assert bursts(events, threshold=2) == {"u1", "u2", "u3"}
assert bursts(events, window=timedelta(minutes=11)) == {"u1", "u2"}   # u2: 0, 5, 10
