import datetime
from typing import Any

from pydantic import BaseModel

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


class AttributeReorderItem(BaseModel):
    id: int
    order: int


class AttributeReorderRequest(BaseModel):
    items: list[AttributeReorderItem]


class AttributeValue(BaseModel):
    attribute_id: int
    value: Any
    trend: int
    daily_min: float | None = None
    daily_max: float | None = None
    last_changed: datetime.datetime | None = None
