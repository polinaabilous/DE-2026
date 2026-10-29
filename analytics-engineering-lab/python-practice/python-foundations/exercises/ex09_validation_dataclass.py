# Exercise 9 · A validating dataclass
# Create a frozen dataclass Purchase(event_id: 
# str, user_id: str, amount: Decimal, ts: datetime) and a
# @classmethod from_raw(raw: dict) 
# that normalises the user (strip + lower), 
# parses amount (required, ≥ 0, 2 dp) 
# and ts (aware, converted to UTC), 
# and raises InvalidRecord carrying all errors in an errors attribute. 
# Use the dataset: only purchases are passed in.

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import datetime, timezone

class InvalidRecord(ValueError):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors

@dataclass(frozen=True, slots=True)
class Purchase:
    event_id: str 
    user_id: str 
    amount: Decimal
    ts: datetime

    @classmethod
    def from_raw(raw: dict):
        errors: list[str] = []
        
        event_id = (raw.get("event_id") or "").strip()
        if not event_id: 
            errors.append("event_id is required")
        
        user_id = (raw.get("user_id") or "").strip().lower()
        if not user_id: 
            errors.append("user_id is required")

        try:
            ts = datetime.fromisoformat(raw.get("ts") or "")
            if ts.tzinfo is None:
                errors.append("ts has no offset")
            else:
                ts = ts.astimezone(timezone.utc)
        except ValueError:
            errors.append(f"ts {raw.get('ts')!r} is not an ISO 8601 timestamp with offset")

        try:
            amount = Decimal((raw.get("amount") or "").strip())
            if not amount.is_finite() or amount < 0:
                errors.append(f"amount must be a finite number >= 0: {raw.get('amount')!r}")
            amount = amount.quantize("0.01", rounding=ROUND_HALF_UP)
        except InvalidOperation:
            errors.append(f"amount is not a number: {raw.get('amount')!r}")

        if errors:
            raise InvalidRecord(errors)

        return Purchase(raw["event_id"], user_id, amount, ts)  

  
RAW_EVENTS = [
    {"event_id": "e1", "user_id": "u1", "event_type": "page_view", "ts": "2026-03-02T09:00:00Z", "amount": None, "ingested_at": "2026-03-02T09:00:05Z"},
    {"event_id": "e2", "user_id": "u1", "event_type": "add_to_cart", "ts": "2026-03-02T09:01:10Z", "amount": "40.00", "ingested_at": "2026-03-02T09:01:12Z"},
    {"event_id": "e3", "user_id": "u1", "event_type": "purchase", "ts": "2026-03-02T09:03:00Z", "amount": "64.00", "ingested_at": "2026-03-02T09:03:02Z"},
    {"event_id": "e3", "user_id": "u1", "event_type": "purchase", "ts": "2026-03-02T09:03:00Z", "amount": "64.00", "ingested_at": "2026-03-02T09:10:00Z"},
    {"event_id": "e4", "user_id": " U2 ", "event_type": "Page_View", "ts": "2026-03-02T10:15:00+01:00", "amount": "", "ingested_at": "2026-03-02T09:15:03Z"},
    {"event_id": "e5", "user_id": "u2", "event_type": "purchase", "ts": "2026-03-02T09:20:00Z", "amount": "25", "ingested_at": "2026-03-02T09:20:01Z"},
    {"event_id": "e6", "user_id": None, "event_type": "purchase", "ts": "2026-03-02T11:00:00Z", "amount": "18.00", "ingested_at": "2026-03-02T11:00:02Z"},
    {"event_id": "e7", "user_id": "u3", "event_type": "refund", "ts": "not-a-date", "amount": "-5", "ingested_at": "2026-03-03T07:00:00Z"},
    {"event_id": "e8", "user_id": "u3", "event_type": "purchase", "ts": "2026-03-03T08:00:00Z", "amount": "abc", "ingested_at": "2026-03-03T08:00:01Z"},
    {"event_id": "e9", "user_id": "u3", "event_type": "purchase", "ts": "2026-03-03T08:30:00Z", "amount": "0.00", "ingested_at": "2026-03-03T08:30:01Z"},
    {"event_id": "e2", "user_id": "u1", "event_type": "add_to_cart", "ts": "2026-03-02T09:01:10Z", "amount": "42.00", "ingested_at": "2026-03-02T09:30:00Z"},
]

purchases = [r for r in RAW_EVENTS if r["event_type"] == "purchase"]
ok, bad = [], {}
for raw in purchases:
    try:
        ok.append(Purchase.from_raw(raw))
    except InvalidRecord as e:
        bad[raw["event_id"]] = e.errors
assert [p.event_id for p in ok] == ["e3", "e3", "e5", "e9"]
assert set(bad) == {"e6", "e8"} and len(bad["e6"]) == 1
assert ok[2].amount == Decimal("25.00") and ok[3].amount == Decimal("0.00")