"""Reference solution for session P1. Open it only after your attempt and your self-review."""
import json
from collections import Counter
from datetime import datetime

REQUIRED = ("event_id", "event_type", "event_ts", "ingested_at")


def parse_events(lines):
    events, rejects = [], []
    for n, raw in enumerate(lines, 1):
        if not raw.strip():
            continue                                   # blank line: not data, not an error
        try:
            rec = json.loads(raw)
        except json.JSONDecodeError:
            rejects.append((n, "malformed json"))
            continue
        missing = [f for f in REQUIRED if not rec.get(f)]
        if missing:
            rejects.append((n, "missing " + ",".join(missing)))
            continue
        try:
            ts = datetime.fromisoformat(rec["event_ts"])
            ingested = datetime.fromisoformat(rec["ingested_at"])
        except ValueError:
            rejects.append((n, "bad timestamp"))
            continue
        if ts.tzinfo is None or ingested.tzinfo is None:
            rejects.append((n, "timestamp without offset"))
            continue
        events.append({"event_id": rec["event_id"], "user_id": rec.get("user_id"),
                       "event_type": rec["event_type"], "event_ts": ts,
                       "ingested_at": ingested, "line": n})
    return events, rejects


def count_by_type(events):
    counts = Counter(e["event_type"] for e in events)
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
