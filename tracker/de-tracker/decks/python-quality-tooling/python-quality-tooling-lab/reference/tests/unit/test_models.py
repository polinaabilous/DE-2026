"""Unit tests for the pydantic contract: one record at a time, no I/O."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from pydantic import ValidationError

from leafy_ingest.models import OrderEvent


def test_valid_event_is_parsed_and_typed(make_event: Any) -> None:
    event = OrderEvent.model_validate_json(make_event())
    assert event.amount == Decimal("12.00")
    assert event.items[0].qty == 1


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param(
            {"amount": "0.00", "items": [{"sku": "PLT-900", "qty": 1, "unit_price": "0"}]},
            id="free-sample-zero-amount",
        ),
        pytest.param({"currency": " usd "}, id="currency-normalised"),
        pytest.param({"occurred_at": "2026-03-08T13:00:00+01:00"}, id="offset-not-Z"),
        pytest.param({"coupon": "SPRING"}, id="unknown-field-ignored"),
        pytest.param({"event_type": "order_paid", "items": []}, id="paid-without-items"),
    ],
)
def test_accepts_edge_cases(make_event: Any, overrides: dict[str, Any]) -> None:
    OrderEvent.model_validate_json(make_event(**overrides))


@pytest.mark.parametrize(
    ("overrides", "drop", "error_type"),
    [
        pytest.param({}, ("customer_id",), "missing", id="no-customer"),
        pytest.param(
            {"amount": "-1.00", "event_type": "order_refunded"},
            (),
            "greater_than_equal",
            id="negative-amount",
        ),
        pytest.param({"amount": "1.005"}, (), "decimal_max_places", id="three-decimals"),
        pytest.param({"occurred_at": "2026-03-08T12:00:00"}, (), "timezone_aware", id="naive-time"),
        pytest.param({"event_type": "order_shipped"}, (), "literal_error", id="unknown-type"),
        pytest.param({"currency": "EUR"}, (), "literal_error", id="wrong-currency"),
        pytest.param({"amount": "13.00"}, (), "value_error", id="amount-not-items-total"),
        pytest.param({"items": []}, (), "value_error", id="placed-without-items"),
    ],
)
def test_rejects_bad_records(
    make_event: Any, overrides: dict[str, Any], drop: tuple[str, ...], error_type: str
) -> None:
    with pytest.raises(ValidationError) as info:
        OrderEvent.model_validate_json(make_event(drop=drop, **overrides))
    assert info.value.errors()[0]["type"] == error_type


@pytest.mark.parametrize(
    ("occurred_at", "business_date"),
    [
        ("2026-03-08T05:30:00Z", date(2026, 3, 7)),  # 23:30 CST the evening before
        ("2026-03-08T08:30:00Z", date(2026, 3, 8)),  # 03:30 CDT, after the DST jump
        ("2026-03-09T04:59:59Z", date(2026, 3, 8)),  # 23:59:59 CDT
        ("2026-03-09T05:00:01Z", date(2026, 3, 9)),  # 00:00:01 CDT
    ],
)
def test_business_date_uses_chicago_time(
    make_event: Any, occurred_at: str, business_date: date
) -> None:
    event = OrderEvent.model_validate_json(make_event(occurred_at=occurred_at))
    assert event.business_date == business_date
