from typing import Any

from pydantic import BaseModel

from app.schemas.common import OrmBase

# --- Tiles ---


class WidgetTileRead(OrmBase, BaseModel):
    id: int
    attribute_id: int


class WidgetTileCreate(BaseModel):
    attribute_id: int


class DashboardTile(BaseModel):
    id: int
    attribute_id: int
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
    name: str | None = None
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


# --- Dashboard ---


class DashboardResponse(BaseModel):
    tiles: list[DashboardTile]
    switches: list[DashboardSwitch]
