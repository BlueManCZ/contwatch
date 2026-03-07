import json
from typing import ClassVar

import httpx

from app.handlers.base import ConfigField, Indicator, KnownAction, KnownAttribute, KnownControl
from app.handlers.http_handler import HttpHandler
from app.handlers.registry import register_handler_type
from app.handlers.shelly_utils import is_on, wifi_disconnected_indicator, wifi_indicator


@register_handler_type
class ShellyPlugGen2Handler(HttpHandler):
    """Handler for Shelly Plug Gen2+ smart plugs (Plus Plug S, Plug S G3)."""

    handler_type = "shelly_plug_gen2"
    handler_name = "Shelly Plug (Gen2+)"
    handler_icon = "plug"
    handler_category = "http"
    probe_priority: ClassVar[int] = 15
    config_fields: ClassVar[list[ConfigField]] = [
        {"key": "host", "type": "string", "label": "Device URL / IP", "default": ""},
        {"key": "fetch_route", "type": "string", "label": "Fetch route", "default": "/rpc/Shelly.GetStatus"},
        {"key": "interval", "type": "int", "label": "Interval (s)", "default": 10},
    ]
    known_attributes: ClassVar[list[KnownAttribute]] = [
        KnownAttribute(name="switch:0/output", label="Relay state"),
        KnownAttribute(name="switch:0/apower", label="Power", unit="W", rounding=0),
        KnownAttribute(name="switch:0/voltage", label="Voltage", unit="V", rounding=0),
        KnownAttribute(name="switch:0/current", label="Current", unit="A", rounding=2),
        KnownAttribute(name="switch:0/aenergy/total", label="Total energy", unit="Wh", rounding=1),
        KnownAttribute(name="switch:0/temperature/tC", label="Temperature", unit="°C", rounding=1),
    ]
    known_actions: ClassVar[list[KnownAction]] = [
        KnownAction(
            name="Switch ON",
            message=json.dumps({"method": "GET", "path": "/rpc/Switch.Set", "params": {"id": 0, "on": True}}),
        ),
        KnownAction(
            name="Switch OFF",
            message=json.dumps({"method": "GET", "path": "/rpc/Switch.Set", "params": {"id": 0, "on": False}}),
        ),
        KnownAction(
            name="Switch Toggle",
            message=json.dumps({"method": "GET", "path": "/rpc/Switch.Toggle", "params": {"id": 0}}),
        ),
    ]
    known_controls: ClassVar[list[KnownControl]] = [
        KnownControl(
            type="switch",
            key="relay",
            label="Relay",
            icon="plug",
            state_attribute="switch:0/output",
            action_on="Switch ON",
            action_off="Switch OFF",
        ),
    ]

    def extract_indicators(self, data: dict) -> list[Indicator]:
        indicators: list[Indicator] = []
        output = data.get("switch:0/output")
        if output is not None:
            on = is_on(output)
            indicators.append(
                Indicator(
                    icon="power" if on else "power-off",
                    color="success" if on else "muted",
                    tooltip_key="indicators.relayOn" if on else "indicators.relayOff",
                )
            )
        rssi = data.get("wifi/rssi")
        if rssi is not None:
            indicators.append(wifi_indicator(int(rssi)))
        return indicators

    def disconnected_indicators(self) -> list[Indicator]:
        return [wifi_disconnected_indicator()]

    @classmethod
    async def probe(cls, config: dict, client: httpx.AsyncClient | None = None) -> bool:
        host = cls._normalize_host(config.get("host", ""))
        if not host:
            return False
        url = f"{host.rstrip('/')}/rpc/Shelly.GetDeviceInfo"
        try:
            resp = await (client or httpx.AsyncClient(timeout=5)).get(url)
            resp.raise_for_status()
            data = resp.json()
            return "gen" in data
        except Exception:
            return False
