import json
import logging
from typing import ClassVar

import httpx

from app.handlers.base import AbstractHandler
from app.handlers.registry import register_handler_type

logger = logging.getLogger(__name__)


@register_handler_type
class HttpHandler(AbstractHandler):
    handler_type = "http"
    handler_name = "HTTP API"
    handler_icon = "globe"
    config_fields: ClassVar[list[dict]] = [
        {"key": "host", "type": "string", "label": "Host / URL", "default": "http://localhost"},
        {"key": "fetch_route", "type": "string", "label": "Fetch route", "default": "/"},
        {"key": "interval", "type": "int", "label": "Interval (s)", "default": 10},
        {"key": "timeout", "type": "int", "label": "Timeout (s)", "default": 5},
    ]

    async def execute_action(self, message: str) -> bool:
        """Execute an HTTP action and re-fetch polling URL to update values."""
        host = self.get_config_option("host", "http://localhost")
        timeout = int(self.get_config_option("timeout", 5))

        try:
            parsed = json.loads(message)
        except (json.JSONDecodeError, TypeError):
            logger.error("Handler %s: invalid action message JSON", self.handler_id)
            return False

        method = parsed.get("method", "GET").upper()
        path = parsed.get("path", "/")
        params = parsed.get("params")

        action_url = f"{host.rstrip('/')}/{path.lstrip('/')}"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.request(method, action_url, params=params)
                response.raise_for_status()

                # Re-fetch the polling URL to immediately get updated values
                fetch_route = self.get_config_option("fetch_route", "/")
                fetch_url = f"{host.rstrip('/')}/{fetch_route.lstrip('/')}"
                fetch_resp = await client.get(fetch_url)
                fetch_resp.raise_for_status()
                self.add_message(fetch_resp.json())

            return True
        except httpx.HTTPStatusError as e:
            logger.warning("Handler %s action HTTP error: %s", self.handler_id, e.response.status_code)
            return False
        except httpx.RequestError as e:
            logger.warning("Handler %s action request error: %s", self.handler_id, e)
            return False

    async def run(self) -> None:
        host = self.get_config_option("host", "http://localhost")
        route = self.get_config_option("fetch_route", "/")
        interval = int(self.get_config_option("interval", 10))
        timeout = int(self.get_config_option("timeout", 5))

        url = f"{host.rstrip('/')}/{route.lstrip('/')}"

        async with httpx.AsyncClient(timeout=timeout) as client:
            while self.is_active:
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()
                    self.add_message(data)
                    self._connected = True
                except httpx.HTTPStatusError as e:
                    logger.warning("Handler %s HTTP error: %s", self.handler_id, e.response.status_code)
                    self._connected = False
                except httpx.RequestError as e:
                    logger.warning("Handler %s request error: %s", self.handler_id, e)
                    self._connected = False
                except Exception:
                    logger.exception("Handler %s unexpected error", self.handler_id)
                    self._connected = False

                await self.wait_for_interval(interval)
