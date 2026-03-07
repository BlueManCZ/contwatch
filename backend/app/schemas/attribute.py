import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import OrmBase


class AttributeRead(OrmBase, BaseModel):
    id: int
    name: str
    handler_id: int
    enabled: bool
    unit: str | None = None
    label: str | None = None
    icon: str | None = None
    order: int | None = None
    rounding: int | None = None
    color: str | None = None
    min_value: float | None = None
    max_value: float | None = None


class AttributeCreate(BaseModel):
    name: str
    handler_id: int
    enabled: bool = True
    unit: str | None = None
    label: str | None = None
    icon: str | None = None
    order: int | None = None
    rounding: int | None = None
    color: str | None = None


class AttributeUpdate(BaseModel):
    label: str | None = None
    unit: str | None = None
    icon: str | None = None
    order: int | None = None
    rounding: int | None = None
    color: str | None = None
    min_value: float | None = None
    max_value: float | None = None


class AttributeReorderItem(BaseModel):
    id: int
    order: int


class AttributeReorderRequest(BaseModel):
    items: list[AttributeReorderItem]


class OutOfRangeDayItem(BaseModel):
    date: datetime.date
    count: int


class OutOfRangeByDateAttributeBounds(BaseModel):
    attribute_id: int
    min_value: float | None = None
    max_value: float | None = None


class OutOfRangeByDateRequest(BaseModel):
    date: datetime.date
    tz_offset: int = Field(0, ge=-720, le=840, description="Browser timezone offset in minutes (JS getTimezoneOffset)")
    attributes: list[OutOfRangeByDateAttributeBounds]


class OutOfRangeByDateItem(BaseModel):
    attribute_id: int
    attribute_name: str
    count: int


class OutOfRangeByDateDeleteRequest(BaseModel):
    date: datetime.date
    tz_offset: int = Field(0, ge=-720, le=840, description="Browser timezone offset in minutes (JS getTimezoneOffset)")
    attributes: list[OutOfRangeByDateAttributeBounds]


class OutOfRangeDeleteRequest(BaseModel):
    dates: list[datetime.date]
    tz_offset: int = Field(0, ge=-720, le=840, description="Browser timezone offset in minutes (JS getTimezoneOffset)")


class OutOfRangeDeleteResult(BaseModel):
    deleted: int


class AttributeValue(BaseModel):
    attribute_id: int
    value: Any
    trend: int
    daily_min: float | None = None
    daily_max: float | None = None
    stats_stale: bool = False
    last_changed: datetime.datetime | None = None
