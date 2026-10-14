"""Reference solution for session P2. Open it only after your attempt and your self-review."""
from zoneinfo import ZoneInfo


def dedupe_latest(events):
    best = {}
    for e in events:
        cur = best.get(e["event_id"])
        if cur is None or (e["ingested_at"], e["line"]) > (cur["ingested_at"], cur["line"]):
            best[e["event_id"]] = e
    return sorted(best.values(), key=lambda e: e["line"])


def daily_active_users(events, tz="America/Chicago"):
    zone = ZoneInfo(tz)
    users = {}
    for e in events:
        if e["user_id"] is None:
            continue
        day = e["event_ts"].astimezone(zone).date().isoformat()
        users.setdefault(day, set()).add(e["user_id"])
    return {day: len(users[day]) for day in sorted(users)}
