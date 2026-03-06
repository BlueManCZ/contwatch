import datetime
from typing import Any, Literal

from pydantic import BaseModel

from app.schemas.common import OrmBase


class WidgetCreate(BaseModel):
    type: Literal["tile", "switch", "slider", "button"]
    name: str | None = None
    icon: str | None = None
    attribute_id: int | None = None
    config: dict = {}


class WidgetUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    attribute_id: int | None = None
    config: dict | None = None


class WidgetRead(OrmBase, BaseModel):
    id: int
    type: str
    order: int
    name: str | None = None
    icon: str | None = None
    attribute_id: int | None = None
    config: dict = {}


class WidgetReorderItem(BaseModel):
    id: int
    order: int


class WidgetReorderRequest(BaseModel):
    items: list[WidgetReorderItem]


class DashboardWidget(BaseModel):
    id: int
    type: str
    order: int
    name: str | None = None
    icon: str | None = None

    # Handler info
    handler_id: int | None = None
    handler_label: str | None = None
    handler_running: bool = True
    handler_connected: bool = True
    confirm_actions: bool = False

    # Attribute info (tile, switch, slider)
    attribute_id: int | None = None
    attribute_name: str | None = None
    attribute_label: str | None = None

    # Live value
    value: Any = None

    # Tile-specific
    unit: str | None = None
    color: str | None = None
    rounding: int | None = None
    trend: int = 0
    daily_min: float | None = None
    daily_max: float | None = None
    stats_stale: bool = False
    last_changed: datetime.datetime | None = None

    # Switch-specific
    attribute_compare: str | None = None
    action_on_id: int | None = None
    action_off_id: int | None = None
    action_on_name: str | None = None
    action_off_name: str | None = None

    # Slider + Button
    action_id: int | None = None
    action_name: str | None = None
    param_key: str | None = None
    min: float | None = None
    max: float | None = None
    step: float | None = None


class SwitchToggleRequest(BaseModel):
    value: bool


class SliderSetRequest(BaseModel):
    value: float


class ButtonExecuteRequest(BaseModel):
    params: dict[str, str] | None = None
