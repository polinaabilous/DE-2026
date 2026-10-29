"""Data-driven validation stretch goal for the event-cleaning mini-project.

FIELD_PARSERS converts raw values; RULES maps fields to check functions.
Each check receives its value and all parsed fields, and returns an error
message or None. The remaining pipeline follows mini-project.py.
"""

from collections import defaultdict
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

def parse_text(value: object) -> str:
    """Missing text becomes blank; reject values of other types."""
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError("must be text")
    return value.strip()


def parse_lowercase_text(value: object) -> str:
    return parse_text(value).lower()


def parse_ts(value: object) -> datetime:
    dt = datetime.fromisoformat(parse_text(value))
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError("must be an ISO 8601 timestamp with a timezone offset")
    return dt.astimezone(timezone.utc)


def parse_amount(value: object) -> Decimal | None:
    text = parse_text(value)
    if not text:
        return None
    try:
        amount = Decimal(text)
    except InvalidOperation:
        raise ValueError(f"is not a number: {value!r}") from None
    if not amount.is_finite():
        raise ValueError(f"must be finite: {value!r}")
    # Keep the original precision until validation has checked the sign.
    # Otherwise, -0.001 would round to -0.00 and hide a negative input.
    return amount


# Every check receives (the field's parsed value, all parsed fields).
# Return an error message for an invalid value, or None for a valid one.
def check_required(value, _fields) -> str | None:
    if value is None or value == "":
        return "is required"
    return None


def check_allowed_type(value, _fields) -> str | None:
    if value not in ALLOWED_TYPES:
        return "must be page_view, add_to_cart, or purchase"
    return None


def check_non_negative(value, _fields) -> str | None:
    if value is not None and value < 0:
        return "must be >= 0"
    return None


def check_amount_required(value, fields) -> str | None:
    event_type = fields.get("event_type")
    if event_type in MONEY_TYPES and value is None:
        return f"is required for {event_type}"
    return None


def check_page_view_amount(value, fields) -> str | None:
    if fields.get("event_type") == "page_view" and value is not None:
        return "must be empty for page_view"
    return None


def check_amount_precision(value, _fields) -> str | None:
    if value is not None:
        try:
            value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except InvalidOperation:
            return "cannot be represented with 2 decimal places"
    return None


FIELD_PARSERS = {
    "event_id": parse_text,
    "user_id": parse_lowercase_text,
    "event_type": parse_lowercase_text,
    "ts": parse_ts,
    "amount": parse_amount,
    "ingested_at": parse_ts,
}

# Change which checks apply here, without changing validate's loops.
# Timestamp validity is enforced by parse_ts in FIELD_PARSERS.
RULES = {
    "event_id": [check_required],
    "user_id": [check_required],
    "event_type": [check_allowed_type],
    "amount": [
        check_non_negative,
        check_amount_required,
        check_page_view_amount,
        check_amount_precision,
    ],
}


def validate(raw: dict) -> Event | Rejection:
    """Parse fields, run their configured checks, then build a typed event."""
    fields = {}
    errors = []
    failed_fields = set()

    # Parse everything first so checks can refer to other fields.
    for field, parser in FIELD_PARSERS.items():
        try:
            fields[field] = parser(raw.get(field))
        except ValueError as error:
            fields[field] = None
            failed_fields.add(field)
            errors.append(f"{field} {error}")

    for field, checks in RULES.items():
        # A parse failure already explains the problem. Do not also
        # label an invalid supplied value as missing.
        if field in failed_fields:
            continue
        for check in checks:
            error = check(fields[field], fields)
            if error is not None:
                errors.append(f"{field} {error}")

    if errors:
        return Rejection(fields.get("event_id") or None, tuple(errors))

    amount = fields["amount"]
    if amount is not None:
        amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return Event(
        event_id=fields["event_id"],
        user_id=fields["user_id"],
        event_type=fields["event_type"],
        ts=fields["ts"],
        amount=amount,
        ingested_at=fields["ingested_at"],
    )

def dedupe_latest(events: list[Event]) -> tuple[list[Event], int]:
    """Same event_id -> keep max (ingested_at, input position)."""
    deduped: dict[str, Event] = {}

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
