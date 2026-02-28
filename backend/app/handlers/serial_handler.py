import asyncio
import json
import logging
from typing import ClassVar

import serial_asyncio

from app.handlers.base import AbstractHandler
from app.handlers.registry import register_handler_type

logger = logging.getLogger(__name__)


@register_handler_type
class SerialHandler(AbstractHandler):
    """Handler for devices connected via serial port (line-based JSON)."""

    handler_type = "serial"
    handler_name = "Serial device"
    handler_icon = "serial"
    config_fields: ClassVar[list[dict]] = [
        {"key": "port", "type": "string", "label": "Device port (e.g. /dev/ttyUSB0)", "default": ""},
        {"key": "baudrate", "type": "int", "label": "Baudrate", "default": 9600},
        {"key": "timeout", "type": "float", "label": "Read timeout (s)", "default": 0.1},
        {"key": "auto_reconnect", "type": "bool", "label": "Auto reconnect", "default": True},
    ]

    async def run(self) -> None:
        port = self.get_config_option("port", "")
        baudrate = int(self.get_config_option("baudrate", 9600))
        timeout = float(self.get_config_option("timeout", 0.1))
        auto_reconnect = self.get_config_option("auto_reconnect", True)

        while self.is_active:
            reader: asyncio.StreamReader | None = None
            writer: asyncio.StreamWriter | None = None
            try:
                reader, writer = await serial_asyncio.open_serial_connection(
                    url=port,
                    baudrate=baudrate,
                )
                self._connected = True
                logger.info("Handler %s: connected to %s", self.handler_id, port)

                while self.is_active:
                    try:
                        raw = await asyncio.wait_for(reader.readline(), timeout=timeout)
                    except TimeoutError:
                        continue

                    if not raw:
                        continue

                    try:
                        data = json.loads(raw)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        data = raw.decode(errors="replace").strip()

                    if data:
                        self.add_message(data if isinstance(data, dict) else {"raw": data})

            except (OSError, serial_asyncio.serial.SerialException) as e:
                logger.warning("Handler %s: serial error on %s: %s", self.handler_id, port, e)
                self._connected = False
            finally:
                if writer:
                    writer.close()
                self._connected = False

            if not self.is_active:
                break

            if auto_reconnect:
                logger.info("Handler %s: reconnecting in 1s ...", self.handler_id)
                await asyncio.sleep(1)
            else:
                return

    async def execute_action(self, message: str) -> bool:
        return False
