"""Pandera: the batch contract for the DataFrame we publish."""

from __future__ import annotations

from datetime import UTC

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from leafy_ingest.models import OrderEvent

EVENT_TYPES = ["order_placed", "order_paid", "order_cancelled", "order_refunded"]
COLUMNS = [
    "event_id",
    "order_id",
    "customer_id",
    "event_type",
    "amount_cents",
    "occurred_at_utc",
    "business_date",
]


class OrderEventsFrame(pa.DataFrameModel):
    event_id: Series[str] = pa.Field(unique=True)
    order_id: Series[str] = pa.Field(str_matches=r"^O-\d{4}$")
    customer_id: Series[str]
    event_type: Series[str] = pa.Field(isin=EVENT_TYPES)
    amount_cents: Series[int] = pa.Field(ge=0)
    occurred_at_utc: Series[str] = pa.Field(str_matches=r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
    business_date: Series[str] = pa.Field(str_matches=r"^\d{4}-\d\d-\d\d$")

    class Config:
        strict = True  # no unexpected columns
        coerce = True  # cast to the declared dtypes before checking

    @pa.dataframe_check
    @classmethod
    def one_placed_event_per_order(cls, df: pd.DataFrame) -> bool:
        placed = df.loc[df["event_type"] == "order_placed", "order_id"]
        return bool(placed.is_unique)


def to_frame(events: list[OrderEvent]) -> pd.DataFrame:
    rows = [
        {
            "event_id": e.event_id,
            "order_id": e.order_id,
            "customer_id": e.customer_id,
            "event_type": e.event_type,
            "amount_cents": int(e.amount * 100),
            "occurred_at_utc": e.occurred_at.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "business_date": e.business_date.isoformat(),
        }
        for e in events
    ]
    return pd.DataFrame(rows, columns=COLUMNS)


def validate_frame(df: pd.DataFrame) -> DataFrame[OrderEventsFrame]:
    """lazy=True collects every failure instead of stopping at the first one."""
    return OrderEventsFrame.validate(df, lazy=True)
