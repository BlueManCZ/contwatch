import json
from typing import ClassVar

import httpx

from app.handlers.base import ActionParam, ConfigField, Indicator, KnownAction, KnownAttribute, KnownControl
from app.handlers.http_handler import HttpHandler
from app.handlers.registry import register_handler_type
from app.handlers.shelly_utils import is_on, wifi_disconnected_indicator, wifi_indicator


@register_handler_type
class ShellyDuoHandler(HttpHandler):
    """Handler for Shelly Duo (SHBDUO-1) smart light bulbs."""

    handler_type = "shelly_duo"
    handler_name = "Shelly Duo"
    handler_icon = "lightbulb"
    handler_category = "http"
    probe_priority: ClassVar[int] = 10
    config_fields: ClassVar[list[ConfigField]] = [
        {"key": "host", "type": "string", "label": "Device URL / IP", "default": ""},
        {"key": "fetch_route", "type": "string", "label": "Fetch route", "default": "/status"},
        {"key": "interval", "type": "int", "label": "Interval (s)", "default": 10},
    ]
    known_attributes: ClassVar[list[KnownAttribute]] = [
        KnownAttribute(name="lights/0/ison", label="Light state"),
        KnownAttribute(name="lights/0/brightness", label="Brightness", unit="%", rounding=0),
        KnownAttribute(name="lights/0/white", label="White level", rounding=0),
        KnownAttribute(name="lights/0/temp", label="Color temperature", unit="K", rounding=0),
    ]
    known_actions: ClassVar[list[KnownAction]] = [
        KnownAction(
            name="Light ON",
            message=json.dumps({"method": "GET", "path": "/light/0", "params": {"turn": "on"}}),
        ),
        KnownAction(
            name="Light OFF",
            message=json.dumps({"method": "GET", "path": "/light/0", "params": {"turn": "off"}}),
        ),
        KnownAction(
            name="Light Toggle",
            message=json.dumps({"method": "GET", "path": "/light/0", "params": {"turn": "toggle"}}),
        ),
        KnownAction(
            name="Set Brightness",
            message=json.dumps({"method": "GET", "path": "/light/0", "params": {"brightness": "50"}}),
            params=(ActionParam(key="brightness", label="Brightness", min=0, max=100, step=1, unit="%", default=50),),
        ),
        KnownAction(
            name="Set Color Temperature",
            message=json.dumps({"method": "GET", "path": "/light/0", "params": {"temp": "4000"}}),
            params=(
                ActionParam(
                    key="temp", label="Color Temperature", min=2700, max=6500, step=100, unit="K", default=4000
                ),
            ),
        ),
    ]
    known_controls: ClassVar[list[KnownControl]] = [
        KnownControl(
            type="switch",
            key="light",
            label="Light",
            icon="lightbulb",
            state_attribute="lights/0/ison",
            action_on="Light ON",
            action_off="Light OFF",
        ),
        KnownControl(
            type="slider",
            key="brightness",
            label="Brightness",
            icon="sun",
            state_attribute="lights/0/brightness",
            action="Set Brightness",
            param_key="brightness",
            min=0,
            max=100,
            step=1,
            unit="%",
        ),
        KnownControl(
            type="slider",
            key="color_temp",
            label="Color Temperature",
            icon="thermometer",
            state_attribute="lights/0/temp",
            action="Set Color Temperature",
            param_key="temp",
            min=2700,
            max=6500,
            step=100,
            unit="K",
        ),
    ]

    def extract_indicators(self, data: dict) -> list[Indicator]:
        indicators: list[Indicator] = []
        light = data.get("lights/0/ison")
        if light is not None:
            on = is_on(light)
            indicators.append(
                Indicator(
                    icon="power" if on else "power-off",
                    color="success" if on else "muted",
                    tooltip=f"Light: {'ON' if on else 'OFF'}",
                )
            )
        rssi = data.get("wifi_sta/rssi")
        if rssi is not None:
            indicators.append(wifi_indicator(int(rssi)))
        return indicators

    def disconnected_indicators(self) -> list[Indicator]:
        return [wifi_disconnected_indicator()]

    @classmethod
    async def probe(cls, config: dict) -> bool:
        host = cls._normalize_host(config.get("host", ""))
        if not host:
            return False
        url = f"{host.rstrip('/')}/shelly"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                return str(data.get("type", "")).startswith("SHBDUO")
        except Exception:
            return False
