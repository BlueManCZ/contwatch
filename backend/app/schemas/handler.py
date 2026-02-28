from typing import Any

from pydantic import BaseModel

from app.schemas.attribute import AttributeRead
from app.schemas.common import OrmBase


class HandlerRead(OrmBase, BaseModel):
    id: int
    type: str
    options: dict
    enabled: bool
    attributes: list[AttributeRead] = []


class HandlerCreate(BaseModel):
    type: str
    options: dict = {}
    enabled: bool = True


class HandlerUpdate(BaseModel):
    type: str | None = None
    options: dict | None = None
    enabled: bool | None = None


class HandlerConfigField(BaseModel):
    key: str
    type: str
    label: str
    default: Any = None


class HandlerTypeInfo(BaseModel):
    type: str
    name: str
    icon: str
    config_fields: list[HandlerConfigField]


class HandlerStatus(BaseModel):
    running: bool
    connected: bool
