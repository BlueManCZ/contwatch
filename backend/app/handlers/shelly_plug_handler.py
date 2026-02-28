from typing import ClassVar

from app.handlers.http_handler import HttpHandler
from app.handlers.registry import register_handler_type


@register_handler_type
class ShellyPlugHandler(HttpHandler):
    """Handler for Shelly Plug smart plugs."""

    handler_type = "shelly_plug"
    handler_name = "Shelly Plug"
    handler_icon = "plug"
    config_fields: ClassVar[list[dict]] = [
        {"key": "host", "type": "string", "label": "Host / URL", "default": "http://192.168.1.100"},
        {"key": "fetch_route", "type": "string", "label": "Fetch route", "default": "/status"},
        {"key": "interval", "type": "int", "label": "Interval (s)", "default": 10},
        {"key": "timeout", "type": "int", "label": "Timeout (s)", "default": 5},
    ]
