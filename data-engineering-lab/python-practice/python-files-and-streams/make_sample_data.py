"""make_sample_data.py: create the raw files used throughout this deck."""
import gzip
from pathlib import Path

RAW = Path("data/raw")
RAW.mkdir(parents=True, exist_ok=True)

# Day 1: JSON Lines (one JSON object per line), with typical problems
day1 = [
    '{"event_id":"e1","user_id":"u1","event_type":"page_view","ts":"2026-03-02T09:00:00Z","amount":null}',
    '{"event_id":"e2","user_id":"u1","event_type":"add_to_cart","ts":"2026-03-02T09:01:10Z","amount":"40.00"}',
    '{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00"}',
    '',                                                                        # blank line
    '{"event_id":"e4","user_id":" U2 ","event_type":"Page_View","ts":"2026-03-02T10:15:00+01:00","amount":null}',
    '{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":25}',
    '{"event_id":"e6","user_id":null,"event_type":"purchase","ts":"2026-03-02T11:00:00Z","amount":"18.00"}',
    '{"event_id":"e7","user_id":"u3","event_type":"purchase"',               # truncated JSON
    '{"event_id":"e8","user_id":"u3","event_type":"purchase","ts":"2026-03-02T12:00:00Z","amount":"abc"}',
    '{"event_id":"e9","user_id":"u4","event_type":"purchase","ts":"2026-03-02T12:30:00Z","amount":"12.50","note":"Café ☕"}',
    '[1, 2, 3]',                                                               # valid JSON, not an object
    '{"event_id":"e3","user_id":"u1","event_type":"purchase","ts":"2026-03-02T09:03:00Z","amount":"64.00"}',  # redelivery
]
(RAW / "events_2026-03-02.jsonl").write_text("\n".join(day1) + "\n", encoding="utf-8")

# Day 2: the same format, gzip-compressed
day2 = [
    '{"event_id":"e10","user_id":"u5","event_type":"page_view","ts":"2026-03-03T07:59:00-06:00","amount":null}',
    '{"event_id":"e11","user_id":"u5","event_type":"purchase","ts":"2026-03-03T08:00:00-06:00","amount":7.5}',
    '{"event_id":"e12","user_id":"u1","event_type":"refund","ts":"2026-03-03T09:00:00Z","amount":"5.00"}',
    '{"event_id":"e13","user_id":"u2","event_type":"purchase","ts":"2026-03-03T23:30:00-08:00","amount":"39.00"}',
]
with gzip.open(RAW / "events_2026-03-03.jsonl.gz", "wt", encoding="utf-8") as f:
    f.write("\n".join(day2) + "\n")

# Day 3: arrives late and contains an event_id that was already loaded (e5)
day3 = [
    '{"event_id":"e14","user_id":"u6","event_type":"purchase","ts":"2026-03-04T10:00:00Z","amount":"9.99"}',
    '{"event_id":"e5","user_id":"u2","event_type":"purchase","ts":"2026-03-02T09:20:00Z","amount":"25.00"}',
]
(RAW / "events_2026-03-04.jsonl").write_text("\n".join(day3) + "\n", encoding="utf-8")

# An Excel-style CSV export: UTF-8 with a byte-order mark, quotes, commas and a newline inside fields,
# and local Chicago times without an offset
csv_text = (
    "order_id,customer,city,amount,ordered_at_local\r\n"
    "SO-5001,Maya Lopez,Austin,64.00,2026-03-02 09:03\r\n"
    'SO-5002,"Café Verde, LLC",Denver,"1,250.50",2026-03-08 02:30\r\n'
    'SO-5003,"Leo ""The Plant"" Kim",Denver,25.00,2026-11-01 01:30\r\n'
    'SO-5004,"Ana\r\nRuiz",Seattle,18.00,2026-11-01 03:15\r\n'
)
(RAW / "orders_export.csv").write_text(csv_text, encoding="utf-8-sig", newline="")

# A legacy export saved in Windows-1252, not UTF-8
(RAW / "legacy_cp1252.csv").write_bytes("customer,city\r\nCafé Verde,Denver\r\n".encode("cp1252"))

for p in sorted(RAW.iterdir()):
    print(f"{p.as_posix():<38} {p.stat().st_size:>5} bytes")
