from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.action import ActionRead
from app.schemas.attribute import AttributeRead
from app.schemas.common import OrmBase


class HandlerRead(OrmBase, BaseModel):
    id: int
    type: str
    label: str | None = None
    options: dict
    enabled: bool
    description: str = ""
    attributes: list[AttributeRead] = []
    actions: list[ActionRead] = []


class HandlerCreate(BaseModel):
    type: str
    label: str | None = None
    options: dict = {}
    enabled: bool = True


class HandlerUpdate(BaseModel):
    type: str | None = None
    label: str | None = None
    options: dict | None = None
    enabled: bool | None = None


class FieldChoice(BaseModel):
    value: str
    label: str


class HandlerConfigField(BaseModel):
    key: str
    type: str
    label: str
    default: Any = None
    choices: list[FieldChoice] | None = None


class KnownAttributeInfo(BaseModel):
    name: str
    label: str | None = None
    unit: str | None = None
    icon: str | None = None
    rounding: int | None = None


class KnownActionInfo(BaseModel):
    name: str
    message: str


class HandlerTypeInfo(BaseModel):
    type: str
    name: str
    icon: str
    category: str
    config_fields: list[HandlerConfigField]
    known_actions: list[KnownActionInfo] = []


class HandlerStatus(BaseModel):
    running: bool
    connected: bool
    last_active: datetime | None = None


class ProbeRequest(BaseModel):
    category: str
    config: dict


class ProbeResult(BaseModel):
    detected: bool
    handler_type: str | None = None
    handler_name: str | None = None
    handler_icon: str | None = None
    config_fields: list[HandlerConfigField] = []
    known_attributes: list[KnownAttributeInfo] = []
    known_actions: list[KnownActionInfo] = []


class SetupRequest(BaseModel):
    type: str
    label: str | None = None
    config: dict = {}
    enabled: bool = True
    attributes: list[KnownAttributeInfo] = []
    actions: list[KnownActionInfo] = []


class SerialPortInfo(BaseModel):
    device: str
    description: str


class CategoryInfo(BaseModel):
    name: str
    label: str
    icon: str
    default_handler_type: str
    default_label: str
    probe_fields: list[HandlerConfigField]
