"""Starter test. Replace and extend: the lab asks for >= 80 % branch coverage."""

from leafy_ingest.models import OrderEvent

LINE = (
    '{"event_id": "E-1", "order_id": "O-1001", "customer_id": "C-01", '
    '"event_type": "order_paid", "amount": "25.00", "currency": "USD", '
    '"occurred_at": "2026-03-08T05:31:10Z"}'
)


def test_one_valid_event_parses() -> None:
    assert OrderEvent.model_validate_json(LINE).order_id == "O-1001"
