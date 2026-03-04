import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.common import OrmBase

# --- Tiles ---


class WidgetTileRead(OrmBase, BaseModel):
    id: int
    attribute_id: int


class WidgetTileCreate(BaseModel):
    attribute_id: int


class WidgetTileUpdate(BaseModel):
    attribute_id: int


class DashboardTile(BaseModel):
    id: int
    attribute_id: int
    handler_id: int
    handler_running: bool = True
    handler_connected: bool = True
    name: str
    label: str | None = None
    unit: str | None = None
    icon: str | None = None
    color: str | None = None
    rounding: int | None = None
    value: Any = None
    trend: int = 0
    daily_min: float | None = None
    daily_max: float | None = None
    last_changed: datetime.datetime | None = None


# --- Switches ---


class WidgetSwitchRead(OrmBase, BaseModel):
    id: int
    name: str | None = None
    icon: str | None = None
    attribute_id: int
    attribute_compare: str | None = None
    action_on_id: int | None = None
    action_off_id: int | None = None


class WidgetSwitchCreate(BaseModel):
    icon: str | None = None
    attribute_id: int
    attribute_compare: str | None = None
    action_on_id: int | None = None
    action_off_id: int | None = None


class WidgetSwitchUpdate(BaseModel):
    icon: str | None = None
    attribute_id: int
    attribute_compare: str | None = None
    action_on_id: int | None = None
    action_off_id: int | None = None


class DashboardSwitch(BaseModel):
    id: int
    name: str | None = None
    icon: str | None = None
    attribute_id: int
    handler_id: int
    handler_label: str | None = None
    handler_running: bool = True
    handler_connected: bool = True
    confirm_actions: bool = False
    attribute_compare: str | None = None
    action_on_id: int | None = None
    action_off_id: int | None = None
    attribute_name: str
    attribute_label: str | None = None
    action_on_name: str | None = None
    action_off_name: str | None = None
    value: Any = None


class SwitchToggleRequest(BaseModel):
    value: bool


# --- Sliders ---


class WidgetSliderRead(OrmBase, BaseModel):
    id: int
    name: str | None = None
    icon: str | None = None
    attribute_id: int
    action_id: int
    param_key: str
    min: float
    max: float
    step: float
    unit: str | None = None


class WidgetSliderCreate(BaseModel):
    icon: str | None = None
    attribute_id: int
    action_id: int
    param_key: str
    min: float = 0
    max: float = 100
    step: float = 1


class WidgetSliderUpdate(BaseModel):
    icon: str | None = None
    attribute_id: int
    action_id: int
    param_key: str
    min: float = 0
    max: float = 100
    step: float = 1


class DashboardSlider(BaseModel):
    id: int
    name: str | None = None
    icon: str | None = None
    attribute_id: int
    handler_id: int
    handler_label: str | None = None
    handler_running: bool = True
    handler_connected: bool = True
    confirm_actions: bool = False
    action_id: int
    action_name: str
    param_key: str
    min: float
    max: float
    step: float
    unit: str | None = None
    attribute_name: str
    attribute_label: str | None = None
    value: Any = None


class SliderSetRequest(BaseModel):
    value: float


# --- Dashboard ---


class DashboardResponse(BaseModel):
    tiles: list[DashboardTile]
    switches: list[DashboardSwitch]
    sliders: list[DashboardSlider] = []
