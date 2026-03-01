import asyncio
import json
import logging
from typing import ClassVar

import serial_asyncio

from app.handlers.base import AbstractHandler, KnownAction, KnownAttribute
from app.handlers.registry import register_handler_type

logger = logging.getLogger(__name__)


def _byte(array: list[int], index: int) -> int:
    """Read big-endian uint16 from two consecutive bytes."""
    return array[index] * 256 + array[index + 1]


@register_handler_type
class JiabaidaBmsSerialHandler(AbstractHandler):
    """Handler for Jiabaida Battery Management System via serial port."""

    handler_type = "jiabaida_bms_serial"
    handler_name = "Jiabaida BMS"
    handler_icon = "battery"
    handler_category = "serial"
    probe_priority: ClassVar[int] = 20
    config_fields: ClassVar[list[dict]] = [
        {"key": "port", "type": "string", "label": "Device port (e.g. /dev/ttyUSB0)", "default": ""},
        {"key": "interval", "type": "int", "label": "Polling interval (s)", "default": 10},
        {"key": "auto_reconnect", "type": "bool", "label": "Auto reconnect", "default": True},
        {"key": "trim_echo", "type": "bool", "label": "Trim echoed messages", "default": False},
    ]

    @classmethod
    def describe(cls, options: dict) -> str:
        port = options.get("config", {}).get("port", "")
        return port or cls.handler_name
    known_attributes: ClassVar[list[KnownAttribute]] = [
        KnownAttribute(name="voltage", label="Voltage", unit="V", rounding=2),
        KnownAttribute(name="current", label="Current", unit="A", rounding=2),
        KnownAttribute(name="capacity", label="Capacity", unit="mAh", rounding=0),
        KnownAttribute(name="nominal_capacity", label="Nominal capacity", unit="mAh", rounding=0),
        KnownAttribute(name="cycles", label="Cycles", rounding=0),
        KnownAttribute(name="percentages", label="State of charge", unit="%", rounding=0),
        KnownAttribute(name="mos_state", label="MOS state"),
        KnownAttribute(name="protection_bits", label="Protection bits"),
    ]
    known_actions: ClassVar[list[KnownAction]] = [
        KnownAction(name="Charge+Discharge ON", message=json.dumps({"mos_state": "00"})),
        KnownAction(name="Charge OFF", message=json.dumps({"mos_state": "01"})),
        KnownAction(name="Discharge OFF", message=json.dumps({"mos_state": "10"})),
        KnownAction(name="Both OFF", message=json.dumps({"mos_state": "11"})),
    ]

    @classmethod
    async def probe(cls, config: dict) -> bool:
        port = config.get("port", "")
        if not port:
            return False
        try:
            reader, writer = await serial_asyncio.open_serial_connection(url=port)
            try:
                writer.write(b"\xdd\xa5\x03\x00\xff\xfd\x77")
                await writer.drain()
                raw = await asyncio.wait_for(reader.readexactly(1), timeout=2)
                return raw[0] == 0xDD
            finally:
                writer.close()
        except Exception:
            return False

    async def _read_block(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        query: bytes,
    ) -> list[int]:
        """Send a binary query and read the response block."""
        writer.write(query)
        await writer.drain()

        trim_echo = self.get_config_option("trim_echo", False)
        header_len = 11 if trim_echo else 4

        header = []
        length = 0
        for i in range(header_len):
            raw = await asyncio.wait_for(reader.readexactly(1), timeout=0.1)
            byte = int.from_bytes(raw, "big")
            if i == header_len - 2 and byte != 0:
                break
            if i == header_len - 1:
                length = byte
            header.append(byte)

        data = []
        for _ in range(length):
            raw = await asyncio.wait_for(reader.readexactly(1), timeout=0.1)
            data.append(int.from_bytes(raw, "big"))

        # Skip 3 trailing bytes (checksum + end marker)
        for _ in range(3):
            await asyncio.wait_for(reader.readexactly(1), timeout=0.1)

        return data

    async def _poll(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> dict:
        """Send both queries and decode the response into a dict."""
        d1 = await self._read_block(reader, writer, b"\xdd\xa5\x03\x00\xff\xfd\x77")
        d2 = await self._read_block(reader, writer, b"\xdd\xa5\x04\x00\xff\xfc\x77")

        if not d1 or not d2:
            raise OSError("Missing data block from BMS")

        raw_current = _byte(d1, 2)
        current = (raw_current / 100 if raw_current < 2**15 else (raw_current - 2**16) / 100) or 0

        result: dict = {
            "voltage": _byte(d1, 0) / 100,
            "current": current,
            "capacity": _byte(d1, 4) * 10,
            "nominal_capacity": _byte(d1, 6) * 10,
            "cycles": _byte(d1, 8),
            "percentages": d1[19],
            "mos_state": d1[20],
            "protection_bits": bin(_byte(d1, 16))[2:].zfill(16),
            "temperatures": {},
            "cells": {},
        }

        temperatures_count = d1[22]
        for i in range(temperatures_count):
            result["temperatures"][str(i + 1)] = (_byte(d1, 23 + i * 2) - 2731) / 10

        cell_count = d1[21]
        balancing = bin(_byte(d1, 14))[2:].zfill(16) + bin(_byte(d1, 12))[2:].zfill(16)

        for i in range(cell_count):
            result["cells"][str(i + 1)] = {
                "voltage": _byte(d2, i * 2) / 1000,
                "balancing": int(balancing[31 - i]),
            }

        return result

    async def run(self) -> None:
        port = self.get_config_option("port", "")
        interval = int(self.get_config_option("interval", 10))
        auto_reconnect = self.get_config_option("auto_reconnect", True)

        while self.is_active:
            reader: asyncio.StreamReader | None = None
            writer: asyncio.StreamWriter | None = None
            try:
                reader, writer = await serial_asyncio.open_serial_connection(url=port)
                self._connected = True
                logger.info("Handler %s: connected to %s", self.handler_id, port)

                while self.is_active:
                    data = await self._poll(reader, writer)
                    self.add_message(data)
                    await self.wait_for_interval(interval)

            except (OSError, serial_asyncio.serial.SerialException, TimeoutError) as e:
                logger.warning("Handler %s: BMS error on %s: %s", self.handler_id, port, e)
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
        """Set MOS state on the BMS (charge/discharge control)."""
        port = self.get_config_option("port", "")

        try:
            parsed = json.loads(message)
        except (json.JSONDecodeError, TypeError):
            logger.error("Handler %s: invalid action JSON", self.handler_id)
            return False

        mos_state = parsed.get("mos_state")
        if mos_state not in ("00", "01", "10", "11"):
            logger.error("Handler %s: invalid mos_state '%s'", self.handler_id, mos_state)
            return False

        # Build MOS control frame: DD 5A E1 02 00 <val> <checksum_hi> <checksum_lo> 77
        val = 3 - int(mos_state, 2)
        payload = bytes([0xE1, 0x02, 0x00, val])
        checksum = 0x10000 - sum(payload)
        frame = b"\xdd\x5a" + payload + checksum.to_bytes(2, "big") + b"\x77"

        try:
            _, writer = await serial_asyncio.open_serial_connection(url=port)
            try:
                writer.write(frame)
                await writer.drain()
            finally:
                writer.close()
            return True
        except (OSError, serial_asyncio.serial.SerialException) as e:
            logger.warning("Handler %s: action error: %s", self.handler_id, e)
            return False
