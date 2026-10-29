from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

ALLOWED_TYPES = frozenset({"page_view", "add_to_cart", "purchase"})
MONEY_TYPES = frozenset({"add_to_cart", "purchase"})

@dataclass(frozen=True, slots=True)
class Event:
    event_id: str
    user_id: str
    event_type: str
    ts: datetime              # aware, UTC
    amount: Decimal | None
    ingested_at: datetime     # aware, UTC

@dataclass(frozen=True, slots=True)
class Rejection:
    event_id: str | None
    errors: tuple[str, ...]

@dataclass(frozen=True)
class Summary:
    counts_by_type: dict[str, int]
    revenue_by_user: dict[str, Decimal]    # purchases only
    purchases_by_day: dict[str, int]       # UTC date "YYYY-MM-DD"
    distinct_users: int

@dataclass(frozen=True)
class CleanResult:
    events: list[Event]                    # unique, valid, sorted by (ts, event_id)
    rejected: list[Rejection]              # in input order
    duplicates_dropped: int
    summary: Summary

def parse_ts(text: str | None) -> datetime:
    dt = datetime.fromisoformat((text or "").strip())
    if dt.tzinfo is None:
        raise ValueError(f"timestamp has no offset: {text!r}")
    return dt.astimezone(timezone.utc)

def parse_amount(text: str | None) -> Decimal | None:
    if text is None or text.strip() == "":
        return None
    try:
        value = Decimal(text.strip())
        if not value.is_finite():
            raise ValueError(f"amount is not finite: {text!r}")
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError(f"amount is not a number: {text!r}") from None

def validate(raw: dict) -> Event | Rejection:
    """Apply every rule from lesson 3; collect all errors."""
    errors = []

    event_id = (raw.get("event_id") or "").strip()
    if not event_id:
        errors.append("event_id is required")

    user_id = (raw.get("user_id") or "").strip().lower()
    if not user_id:
        errors.append("user_id is required")

    event_type = (raw.get("event_type") or "").strip().lower()
    if event_type not in ALLOWED_TYPES:
        errors.append("event_type must be page_view, add_to_cart, or purchase")

    ts = None
    try:
        ts = parse_ts(raw.get("ts"))
    except ValueError:
        errors.append(f"ts {raw.get('ts')!r} is not an ISO 8601 timestamp with offset")

    amount = None
    try:
        amount = parse_amount(raw.get("amount"))
    except ValueError as e:
        errors.append(str(e))
    else:
        if amount is not None and amount < 0:
            errors.append("amount must be >= 0")
        if event_type in MONEY_TYPES and amount is None:
            errors.append(f"amount is required for {event_type}")
        if event_type == "page_view" and amount is not None:
            errors.append("page_view must not have an amount")

    ingested_at = None
    try:
        ingested_at = parse_ts(raw.get("ingested_at"))
    except ValueError:
        errors.append("ingested_at is missing or invalid")

    if errors:
        return Rejection(event_id or None, tuple(errors))

    return Event(event_id, user_id, event_type, ts, amount, ingested_at)

def dedupe_latest(events: list[Event]) -> tuple[list[Event], int]:
    """Same event_id -> keep max (ingested_at, input position)."""
    ...
    deduped: dict[str,Event] = {}\

    for e in events:
        current = deduped.get(e.event_id)

        if current is None or e.ingested_at >= current.ingested_at:
            deduped[e.event_id] = e

    duplicates_dropped = len(events) - len(deduped)
    return list(deduped.values()), duplicates_dropped 

def summarize(events: list[Event]) -> Summary:
    counts_by_type: dict[str, int] = defaultdict(int)
    revenue_by_user: dict[str, Decimal] = defaultdict(Decimal)    # purchases only
    purchases_by_day: dict[str, int] = defaultdict(int)      # UTC date "YYYY-MM-DD"
    distinct_users: set = set()                 # int

    for e in events:
        counts_by_type[e.event_type] += 1
        if e.event_type == 'purchase':
            revenue_by_user[e.user_id] += e.amount
            purchases_by_day[e.ts.date().isoformat()] += 1
        distinct_users.add(e.user_id)

    return Summary(
        counts_by_type=dict(sorted(counts_by_type.items())),
        revenue_by_user=dict(sorted(revenue_by_user.items())),
        purchases_by_day=dict(sorted(purchases_by_day.items())),
        distinct_users=len(distinct_users),
    )

def clean_events(raw_events: list[dict]) -> CleanResult:
    """validate -> dedupe -> sort -> summarise; never mutate raw_events."""
    events: list[Event] = []                    # unique, valid, sorted by (ts, event_id)
    rejected: list[Rejection] = []             # in input order

    for e in raw_events:
        validated = validate(e)
        if isinstance(validated, Event):
            events.append(validated)
        else:
            rejected.append(validated)

    deduped, duplicates_dropped = dedupe_latest(events)

    return CleanResult(
        sorted(deduped, key=lambda e: (e.ts, e.event_id)),
        rejected,
        duplicates_dropped,
        summarize(deduped)
    )

def format_report(result: CleanResult) -> str:
    """A short human-readable report (free format)."""
    summary = result.summary
    lines = [
        f"Valid events: {len(result.events)} | Rejected: {len(result.rejected)} | "
        f"Duplicates dropped: {result.duplicates_dropped}",
        f"Distinct users: {summary.distinct_users}",
        "Events by type: " + (
            ", ".join(f"{kind}={count}" for kind, count in summary.counts_by_type.items())
            or "none"
        ),
        "Purchase revenue by user: " + (
            ", ".join(f"{user}={amount:.2f}" for user, amount in summary.revenue_by_user.items())
            or "none"
        ),
        "Purchases by UTC day: " + (
            ", ".join(f"{day}={count}" for day, count in summary.purchases_by_day.items())
            or "none"
        ),
    ]
    lines.extend(
        f"Rejected {rejection.event_id or '<missing>'}: " + "; ".join(rejection.errors)
        for rejection in result.rejected
    )
    return "\n".join(lines)
