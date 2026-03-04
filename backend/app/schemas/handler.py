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
    order: int | None = None
    confirm_actions: bool = False
    description: str = ""
    attributes: list[AttributeRead] = []
    actions: list[ActionRead] = []


class HandlerCreate(BaseModel):
    type: str
    label: str | None = None
    options: dict = {}
    enabled: bool = True
    confirm_actions: bool = False


class HandlerUpdate(BaseModel):
    type: str | None = None
    label: str | None = None
    options: dict | None = None
    enabled: bool | None = None
    confirm_actions: bool | None = None


class FieldChoice(BaseModel):
    value: str
    label: str


class HandlerConfigField(BaseModel):
    key: str
    type: str
    label: str
    default: Any = None
    choices: list[FieldChoice] | None = None
    row: int | None = None


class KnownAttributeInfo(BaseModel):
    name: str
    label: str | None = None
    unit: str | None = None
    icon: str | None = None
    rounding: int | None = None


class ActionParamInfo(BaseModel):
    key: str
    label: str
    type: str = "number"
    min: float | None = None
    max: float | None = None
    step: float | None = None
    unit: str | None = None
    default: float | None = None


class KnownActionInfo(BaseModel):
    name: str
    message: str
    params: list[ActionParamInfo] = []


class KnownControlInfo(BaseModel):
    type: str
    key: str
    label: str
    icon: str | None = None
    state_attribute: str = ""
    state_compare: str | None = None
    action_on: str | None = None
    action_off: str | None = None
    action: str | None = None
    param_key: str | None = None
    min: float = 0
    max: float = 100
    step: float = 1
    unit: str | None = None


class HandlerTypeInfo(BaseModel):
    type: str
    name: str
    icon: str
    category: str
    config_fields: list[HandlerConfigField]
    known_actions: list[KnownActionInfo] = []
    known_controls: list[KnownControlInfo] = []


class IndicatorInfo(BaseModel):
    icon: str
    color: str
    tooltip: str


class HandlerStatus(BaseModel):
    running: bool
    connected: bool
    last_active: datetime | None = None
    indicators: list[IndicatorInfo] = []


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


class ResolvedControl(BaseModel):
    type: str
    key: str
    label: str
    icon: str | None = None
    state_attribute: str = ""
    state_compare: str | None = None
    action_on: str | None = None
    action_off: str | None = None
    action: str | None = None
    param_key: str | None = None
    min: float = 0
    max: float = 100
    step: float = 1
    unit: str | None = None
    attribute_id: int | None = None
    action_on_id: int | None = None
    action_off_id: int | None = None
    action_id: int | None = None
    action_on_name: str | None = None
    action_off_name: str | None = None
    action_name: str | None = None
    resolved: bool = False
    value: Any = None


class CreateWidgetFromControlRequest(BaseModel):
    handler_id: int
    control_key: str
    label: str | None = None


class HandlerReorderItem(BaseModel):
    id: int
    order: int


class HandlerReorderRequest(BaseModel):
    items: list[HandlerReorderItem]


class CategoryInfo(BaseModel):
    name: str
    label: str
    icon: str
    default_handler_type: str
    default_label: str
    probe_fields: list[HandlerConfigField]
