"""Pydantic models: the contract for one raw Leafy order event."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

LEAFY_TZ = ZoneInfo("America/Chicago")

Money = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
EventType = Literal["order_placed", "order_paid", "order_cancelled", "order_refunded"]


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    sku: Annotated[str, Field(pattern=r"^PLT-\d{3}$")]
    qty: Annotated[int, Field(gt=0)]
    unit_price: Money


class OrderEvent(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True, str_strip_whitespace=True)

    event_id: Annotated[str, Field(min_length=1)]
    order_id: Annotated[str, Field(pattern=r"^O-\d{4}$")]
    customer_id: Annotated[str, Field(min_length=1)]
    event_type: EventType
    amount: Money
    currency: Literal["USD"]
    occurred_at: AwareDatetime
    items: list[Item] = Field(default_factory=list)

    @field_validator("currency", mode="before")
    @classmethod
    def upper_currency(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def placed_amount_matches_items(self) -> OrderEvent:
        if self.event_type != "order_placed":
            return self
        if not self.items:
            raise ValueError("order_placed needs at least one item")
        total = sum((i.unit_price * i.qty for i in self.items), Decimal("0"))
        if total != self.amount:
            raise ValueError(f"amount {self.amount} != items total {total}")
        return self

    @property
    def business_date(self) -> date:
        """The Leafy business day: the event time in Chicago, not in UTC."""
        return self.occurred_at.astimezone(LEAFY_TZ).date()
