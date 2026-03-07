import datetime

from pydantic import BaseModel


class DailyStatRead(BaseModel):
    attribute_id: int
    date: datetime.date
    min_value: float | None
    max_value: float | None
