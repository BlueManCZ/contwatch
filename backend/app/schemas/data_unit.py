import datetime

from pydantic import BaseModel

from app.schemas.common import OrmBase


class DataUnitRead(OrmBase, BaseModel):
    handler_id: int
    attribute_id: int
    value: float
    timestamp: datetime.datetime


class ChartDataPoint(BaseModel):
    x: int
    y: float


class ChartDataset(BaseModel):
    id: int
    label: str
    unit: str | None
    color: str | None
    data: list[ChartDataPoint]
