import json
from typing import ClassVar

import httpx

from app.handlers.base import KnownAction, KnownAttribute
from app.handlers.http_handler import HttpHandler
from app.handlers.registry import register_handler_type


@register_handler_type
class ShellyPlugHandler(HttpHandler):
    """Handler for Shelly Plug smart plugs."""

    handler_type = "shelly_plug"
    handler_name = "Shelly Plug"
    handler_icon = "plug"
    handler_category = "http"
    probe_priority: ClassVar[int] = 10
    config_fields: ClassVar[list[dict]] = [
        {"key": "host", "type": "string", "label": "Host / URL", "default": "http://192.168.1.100"},
        {"key": "fetch_route", "type": "string", "label": "Fetch route", "default": "/status"},
        {"key": "interval", "type": "int", "label": "Interval (s)", "default": 10},
    ]
    known_attributes: ClassVar[list[KnownAttribute]] = [
        KnownAttribute(name="relays/0/ison", label="Relay state"),
        KnownAttribute(name="meters/0/power", label="Power", unit="W", rounding=1),
        KnownAttribute(name="meters/0/total", label="Total energy", unit="Wh", rounding=0),
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

    @classmethod
    async def probe(cls, config: dict) -> bool:
        host = config.get("host", "")
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
