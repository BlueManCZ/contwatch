import json
from typing import ClassVar

import httpx

from app.handlers.base import Indicator, KnownAction, KnownAttribute, KnownControl
from app.handlers.http_handler import HttpHandler
from app.handlers.registry import register_handler_type
from app.handlers.shelly_utils import is_on, wifi_indicator


@register_handler_type
class ShellyPlugHandler(HttpHandler):
    """Handler for Shelly Plug smart plugs."""

    handler_type = "shelly_plug"
    handler_name = "Shelly Plug"
    handler_icon = "plug"
    handler_category = "http"
    probe_priority: ClassVar[int] = 10
    config_fields: ClassVar[list[dict]] = [
        {"key": "host", "type": "string", "label": "Device URL / IP", "default": ""},
        {"key": "fetch_route", "type": "string", "label": "Fetch route", "default": "/status"},
        {"key": "interval", "type": "int", "label": "Interval (s)", "default": 10},
    ]
    known_attributes: ClassVar[list[KnownAttribute]] = [
        KnownAttribute(name="relays/0/ison", label="Relay state"),
        KnownAttribute(name="meters/0/power", label="Power", unit="W", rounding=0),
        # Gen1 API reports watt-minutes
        KnownAttribute(name="meters/0/total", label="Total energy", unit="Wm", rounding=0),
        KnownAttribute(name="temperature", label="Temperature", unit="\u00b0C", rounding=1),
    ]
    known_actions: ClassVar[list[KnownAction]] = [
        KnownAction(
            name="Relay ON",
            message=json.dumps({"method": "GET", "path": "/relay/0", "params": {"turn": "on"}}),
        ),
        KnownAction(
            name="Relay OFF",
            message=json.dumps({"method": "GET", "path": "/relay/0", "params": {"turn": "off"}}),
        ),
        KnownAction(
            name="Relay Toggle",
            message=json.dumps({"method": "GET", "path": "/relay/0", "params": {"turn": "toggle"}}),
        ),
    ]
    known_controls: ClassVar[list[KnownControl]] = [
        KnownControl(
            type="switch",
            key="relay",
            label="Relay",
            icon="plug",
            state_attribute="relays/0/ison",
            state_compare="true",
            action_on="Relay ON",
            action_off="Relay OFF",
        ),
    ]

    def extract_indicators(self, data: dict) -> list[Indicator]:
        indicators: list[Indicator] = []
        relay = data.get("relays/0/ison")
        if relay is not None:
            on = is_on(relay)
            indicators.append(
                Indicator(
                    icon="power" if on else "power-off",
                    color="success" if on else "muted",
                    tooltip=f"Relay: {'ON' if on else 'OFF'}",
                )
            )
        rssi = data.get("wifi_sta/rssi")
        if rssi is not None:
            indicators.append(wifi_indicator(int(rssi)))
        return indicators

    @classmethod
    async def probe(cls, config: dict) -> bool:
        host = cls._normalize_host(config.get("host", ""))
        if not host:
            return False
        url = f"{host.rstrip('/')}/status"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                return "relays" in data
        except Exception:
            return False
