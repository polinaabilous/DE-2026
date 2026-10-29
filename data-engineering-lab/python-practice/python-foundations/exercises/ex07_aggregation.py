# Exercise 7 · Revenue per UTC day and top spenders
# Write daily_revenue(rows) → 
#     {"YYYY-MM-DD": Decimal} for purchases, grouped by the UTC date, 
# and top_users(rows, n) → 
#     the n users with the highest purchase revenue as (user, revenue) pairs, 
#     highest first, ties broken by user ascending.

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from collections import defaultdict

plus2 = timezone(timedelta(hours=2))
rows = [
    {"user_id": "u1", "event_type": "purchase",  "amount": Decimal("64.00"), "ts": datetime(2026, 3, 2, 9, 3, tzinfo=timezone.utc)},
    {"user_id": "u2", "event_type": "purchase",  "amount": Decimal("25.00"), "ts": datetime(2026, 3, 2, 9, 20, tzinfo=timezone.utc)},
    {"user_id": "u2", "event_type": "purchase",  "amount": Decimal("39.00"), "ts": datetime(2026, 3, 3, 0, 30, tzinfo=plus2)},
    {"user_id": "u3", "event_type": "purchase",  "amount": Decimal("0.00"),  "ts": datetime(2026, 3, 3, 8, 30, tzinfo=timezone.utc)},
    {"user_id": "u1", "event_type": "page_view", "amount": None,             "ts": datetime(2026, 3, 3, 9, 0, tzinfo=timezone.utc)},
]

def daily_revenue(rows: list[dict]) -> dict[str, Decimal]:
    revenue: dict[str, Decimal] = defaultdict(Decimal)

    for row in rows:
        utc_ts_formatted = row["ts"].astimezone(timezone.utc).date().isoformat()
        if row["event_type"] == "purchase": 
            revenue[utc_ts_formatted] += row["amount"]

    return revenue
        

def top_users(rows: list[dict], n: int) -> list[tuple[str, Decimal]]:
    revenue_by_users: dict[str, Decimal] = defaultdict(Decimal)

    for row in rows:
        if row["event_type"] == "purchase": 
            revenue_by_users[row["user_id"]] += row["amount"]

    return sorted(revenue_by_users.items(), key=lambda item: item[1], reverse=True)[:n]

assert daily_revenue(rows) == {"2026-03-02": Decimal("128.00"), "2026-03-03": Decimal("0.00")}
assert top_users(rows, 2) == [("u1", Decimal("64.00")), ("u2", Decimal("64.00"))]