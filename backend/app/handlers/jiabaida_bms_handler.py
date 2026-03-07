import asyncio
import json
import logging
from typing import ClassVar

import serial_asyncio
from serial import SerialException

from app.handlers.base import (
    AbstractHandler,
    ActionParam,
    ConfigField,
    Indicator,
    KnownAction,
    KnownAttribute,
    KnownControl,
)
from app.handlers.registry import register_handler_type

logger = logging.getLogger(__name__)

# JBD BMS serial protocol (UART, 9600 baud, big-endian)
# Spec: https://gitlab.com/bms-tools/bms-tools/-/raw/master/JBD_REGISTER_MAP.md

# Read commands — frame format: DD A5 <register> 00 <checksum_hi> <checksum_lo> 77
_CMD_BASIC_INFO = b"\xdd\xa5\x03\x00\xff\xfd\x77"  # Register 0x03
_CMD_CELL_VOLTAGES = b"\xdd\xa5\x04\x00\xff\xfc\x77"  # Register 0x04
_CMD_HARDWARE_VERSION = b"\xdd\xa5\x05\x00\xff\xfb\x77"  # Register 0x05

# Frame markers
_FRAME_START = 0xDD
_FRAME_END = 0x77

# Basic-info response (register 0x03) byte offsets into the data payload
_OFF_VOLTAGE = 0  # uint16, /100 → V
_OFF_CURRENT = 2  # uint16 (signed), /100 → A
_OFF_CAPACITY = 4  # uint16, *10 → mAh
_OFF_NOMINAL_CAPACITY = 6  # uint16, *10 → mAh
_OFF_CYCLES = 8  # uint16
_OFF_PRODUCTION_DATE = 10  # uint16, packed Y/M/D
_OFF_BALANCE_LOW = 12  # uint16, cells 1-16 balance bits
_OFF_BALANCE_HIGH = 14  # uint16, cells 17-32 balance bits
_OFF_PROTECTION = 16  # uint16, protection status bits
_OFF_SOFTWARE_VER = 18  # uint8, high nibble.low nibble
_OFF_SOC = 19  # uint8, 0-100 %
_OFF_MOS = 20  # uint8, bit0=charge, bit1=discharge (1=ON)
_OFF_CELL_COUNT = 21  # uint8
_OFF_TEMP_COUNT = 22  # uint8
_OFF_TEMPS = 23  # uint16 each, in decikelvin

# Conversion constants
_DECIKELVIN_OFFSET = 2731  # NTC readings are in 0.1K; subtract to get 0.1°C

# Write commands — frame format: DD 5A <register> <len> <data> <checksum_hi> <checksum_lo> 77
# Factory mode is required before 0xE0 and 0xE2 — enter via reg 0x00, exit via reg 0x01.
# Source: https://gitlab.com/bms-tools/bms-tools/-/raw/master/JBD_REGISTER_MAP.md


def _build_write_frame(register: int, data: bytes) -> bytes:
    """Build a write frame: DD 5A <register> <len> <data...> <checksum_hi> <checksum_lo> 77."""
    payload = bytes([register, len(data)]) + data
    checksum = (0x10000 - sum(payload)) & 0xFFFF
    return b"\xdd\x5a" + payload + checksum.to_bytes(2, "big") + b"\x77"


_CMD_ENTER_FACTORY = _build_write_frame(0x00, b"\x56\x78")
_CMD_EXIT_FACTORY = _build_write_frame(0x01, b"\x00\x00")
_CMD_EXIT_FACTORY_SAVE = _build_write_frame(0x01, b"\x28\x28")


def _uint16(data: list[int], index: int) -> int:
    """Read big-endian uint16 from two consecutive bytes."""
    return data[index] * 256 + data[index + 1]


def _build_mos_frame(val: int) -> bytes:
    """Build the MOS control frame for the given control value (0-3).

    Control values:
      0x00 = release all (both ON)
      0x01 = close charge (charge OFF)
      0x02 = close discharge (discharge OFF)
      0x03 = close both (both OFF)
    """
    payload = bytes([0xE1, 0x02, 0x00, val])
    checksum = (0x10000 - sum(payload)) & 0xFFFF
    return b"\xdd\x5a" + payload + checksum.to_bytes(2, "big") + b"\x77"


def _parse_production_date(raw: int) -> str:
    """Decode the packed production date into a YYYY-MM-DD string."""
    day = raw & 0x1F
    month = (raw >> 5) & 0x0F
    year = 2000 + (raw >> 9)
    return f"{year:04d}-{month:02d}-{day:02d}"


@register_handler_type
class JiabaidaBmsSerialHandler(AbstractHandler):
    """Handler for Jiabaida Battery Management System via serial port."""

    handler_type = "jiabaida_bms_serial"
    handler_name = "Jiabaida BMS"
    handler_icon = "battery"
    handler_category = "serial"
    probe_priority: ClassVar[int] = 20
    config_fields: ClassVar[list[ConfigField]] = [
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
        KnownAttribute(name="charge_mos", label="Charge MOS"),
        KnownAttribute(name="discharge_mos", label="Discharge MOS"),
        KnownAttribute(name="protection_bits", label="Protection bits"),
        KnownAttribute(name="production_date", label="Production date"),
        KnownAttribute(name="software_version", label="Software version"),
        KnownAttribute(name="hardware_version", label="Hardware version"),
    ]
    known_actions: ClassVar[list[KnownAction]] = [
        # Virtual actions for independent switch control
        KnownAction(name="Charge ON", message=json.dumps({"set_charge": True})),
        KnownAction(name="Charge OFF", message=json.dumps({"set_charge": False})),
        KnownAction(name="Discharge ON", message=json.dumps({"set_discharge": True})),
        KnownAction(name="Discharge OFF", message=json.dumps({"set_discharge": False})),
        # Direct MOS control (full state)
        KnownAction(name="Charge+Discharge ON", message=json.dumps({"mos_state": "00"})),
        KnownAction(name="Both OFF", message=json.dumps({"mos_state": "11"})),
        # SOC calibration
        KnownAction(
            name="Set Remaining Capacity",
            message=json.dumps({"set_capacity": 0}),
            params=(ActionParam(key="capacity", label="Capacity", unit="mAh", min=0, max=655350, step=10, default=0),),
        ),
        # Balance control
        KnownAction(name="Balance Odd Cells", message=json.dumps({"balance": "odd"})),
        KnownAction(name="Balance Even Cells", message=json.dumps({"balance": "even"})),
        KnownAction(name="Balance Stop", message=json.dumps({"balance": "stop"})),
    ]
    known_controls: ClassVar[list[KnownControl]] = [
        KnownControl(
            type="switch",
            key="charge",
            label="Charge",
            icon="battery-charging",
            state_attribute="charge_mos",
            action_on="Charge ON",
            action_off="Charge OFF",
        ),
        KnownControl(
            type="switch",
            key="discharge",
            label="Discharge",
            icon="zap",
            state_attribute="discharge_mos",
            action_on="Discharge ON",
            action_off="Discharge OFF",
        ),
    ]

    def __init__(self, handler_id: int, options: dict):
        super().__init__(handler_id, options)
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._serial_lock = asyncio.Lock()
        self._last_charge_mos: bool = True
        self._last_discharge_mos: bool = True
        self._hardware_version: str | None = None

    def extract_indicators(self, data: dict) -> list[Indicator]:
        pct = data.get("percentages")
        if pct is not None:
            pct = int(pct)
            params = {"pct": str(pct)}
            key = "indicators.battery"
            if pct >= 60:
                return [Indicator(icon="battery-full", color="success", tooltip_key=key, tooltip_params=params)]
            if pct >= 30:
                return [Indicator(icon="battery-medium", color="warning", tooltip_key=key, tooltip_params=params)]
            return [Indicator(icon="battery-low", color="destructive", tooltip_key=key, tooltip_params=params)]
        return []

    @classmethod
    async def probe(cls, config: dict) -> bool:
        port = config.get("port", "")
        if not port:
            return False
        try:
            reader, writer = await serial_asyncio.open_serial_connection(url=port)
            try:
                writer.write(_CMD_BASIC_INFO)
                await writer.drain()
                raw = await asyncio.wait_for(reader.readexactly(1), timeout=2)
                return raw[0] == _FRAME_START
            finally:
                writer.close()
        except Exception:
            return False

    async def _transact(self, query: bytes) -> list[int]:
        """Send a query and read the validated response data under the serial lock."""
        async with self._serial_lock:
            reader, writer = self._reader, self._writer
            if not reader or not writer:
                raise OSError("Not connected")

            writer.write(query)
            await writer.drain()

            # Discard echoed request bytes if configured
            if self.get_config_option("trim_echo", False):
                await asyncio.wait_for(reader.readexactly(len(query)), timeout=2)

            # Response header: DD <cmd> <status> <length>
            header = await asyncio.wait_for(reader.readexactly(4), timeout=2)
            if header[0] != _FRAME_START:
                raise OSError(f"Invalid start byte: 0x{header[0]:02X}")

            status = header[2]
            length = header[3]

            # Data + checksum (2 bytes) + end marker (1 byte)
            tail = await asyncio.wait_for(reader.readexactly(length + 3), timeout=2)
            data = list(tail[:length])
            checksum_received = tail[length] * 256 + tail[length + 1]
            end_marker = tail[length + 2]

            if end_marker != _FRAME_END:
                raise OSError(f"Invalid end marker: 0x{end_marker:02X}")

            # Checksum covers: length + data bytes
            checksum_expected = (0x10000 - (length + sum(data))) & 0xFFFF
            if checksum_received != checksum_expected:
                raise OSError(
                    f"Checksum mismatch: received 0x{checksum_received:04X}, expected 0x{checksum_expected:04X}"
                )

            if status != 0:
                raise OSError(f"BMS error status: 0x{status:02X}")

            return data

    async def _read_hardware_version(self) -> str | None:
        """Read the hardware version string (command 0x05)."""
        try:
            data = await self._transact(_CMD_HARDWARE_VERSION)
            return bytes(data).decode("ascii", errors="replace") if data else None
        except (OSError, TimeoutError):
            logger.debug("Handler %s: hardware version read failed", self.handler_id)
            return None

    async def _poll(self) -> dict:
        """Send both queries and decode the response into a dict."""
        d1 = await self._transact(_CMD_BASIC_INFO)
        d2 = await self._transact(_CMD_CELL_VOLTAGES)

        if not d1 or not d2:
            raise OSError("Missing data block from BMS")

        raw_current = _uint16(d1, _OFF_CURRENT)
        current = (raw_current / 100 if raw_current < 2**15 else (raw_current - 2**16) / 100) or 0

        # FET control state: bit0 = charge MOS (1=ON), bit1 = discharge MOS (1=ON)
        mos_byte = d1[_OFF_MOS]
        charge_mos = bool(mos_byte & 0x01)
        discharge_mos = bool(mos_byte & 0x02)
        self._last_charge_mos = charge_mos
        self._last_discharge_mos = discharge_mos

        sw_ver = d1[_OFF_SOFTWARE_VER]
        result: dict = {
            "voltage": _uint16(d1, _OFF_VOLTAGE) / 100,
            "current": current,
            "capacity": _uint16(d1, _OFF_CAPACITY) * 10,
            "nominal_capacity": _uint16(d1, _OFF_NOMINAL_CAPACITY) * 10,
            "cycles": _uint16(d1, _OFF_CYCLES),
            "production_date": _parse_production_date(_uint16(d1, _OFF_PRODUCTION_DATE)),
            "percentages": d1[_OFF_SOC],
            "charge_mos": charge_mos,
            "discharge_mos": discharge_mos,
            # Keep raw mos_state for backward compatibility with existing attribute setups
            "mos_state": mos_byte,
            "protection_bits": bin(_uint16(d1, _OFF_PROTECTION))[2:].zfill(16),
            "software_version": f"{sw_ver >> 4}.{sw_ver & 0x0F}",
            "temperatures": {},
            "cells": {},
        }

        if self._hardware_version is not None:
            result["hardware_version"] = self._hardware_version

        temperatures_count = d1[_OFF_TEMP_COUNT]
        for i in range(temperatures_count):
            result["temperatures"][str(i + 1)] = (_uint16(d1, _OFF_TEMPS + i * 2) - _DECIKELVIN_OFFSET) / 10

        cell_count = d1[_OFF_CELL_COUNT]
        balancing = bin(_uint16(d1, _OFF_BALANCE_HIGH))[2:].zfill(16) + bin(_uint16(d1, _OFF_BALANCE_LOW))[2:].zfill(16)

        for i in range(cell_count):
            result["cells"][str(i + 1)] = {
                "voltage": _uint16(d2, i * 2) / 1000,
                "balancing": int(balancing[31 - i]),
            }

        return result

    async def run(self) -> None:
        port = self.get_config_option("port", "")
        interval = int(self.get_config_option("interval", 10))
        auto_reconnect = self.get_config_option("auto_reconnect", True)

        while self.is_active:
            try:
                self._reader, self._writer = await serial_asyncio.open_serial_connection(url=port)
                self._connected = True
                logger.info("Handler %s: connected to %s", self.handler_id, port)

                # Read hardware version once per connection
                self._hardware_version = await self._read_hardware_version()

                while self.is_active:
                    data = await self._poll()
                    self.add_message(data)
                    await self.wait_for_interval(interval)

            except (OSError, SerialException, TimeoutError) as e:
                logger.warning("Handler %s: BMS error on %s: %s", self.handler_id, port, e)
                self._connected = False
            finally:
                if self._writer:
                    self._writer.close()
                self._reader = None
                self._writer = None
                self._connected = False

            if not self.is_active:
                break

            if auto_reconnect:
                logger.info("Handler %s: reconnecting in 1s ...", self.handler_id)
                await asyncio.sleep(1)
            else:
                return

    async def _factory_mode(self, command: bytes, *, save: bool = False) -> list[int]:
        """Enter factory mode, execute a command, and exit factory mode."""
        await self._transact(_CMD_ENTER_FACTORY)
        try:
            result = await self._transact(command)
        finally:
            exit_cmd = _CMD_EXIT_FACTORY_SAVE if save else _CMD_EXIT_FACTORY
            await self._transact(exit_cmd)
        return result

    def _compute_mos_control_value(self, charge_on: bool, discharge_on: bool) -> int:
        """Compute the MOS control frame value from desired switch states.

        Control value bits (inverted logic — 1 means CLOSE/OFF):
          bit 0: close charge   (1=OFF, 0=ON)
          bit 1: close discharge (1=OFF, 0=ON)
        """
        return (0 if charge_on else 1) | (0 if discharge_on else 2)

    async def execute_action(self, message: str) -> bool:
        """Control MOS state on the BMS (charge/discharge control)."""
        try:
            parsed = json.loads(message)
        except (json.JSONDecodeError, TypeError):
            logger.error("Handler %s: invalid action JSON", self.handler_id)
            return False

        # Determine the control value (0-3) from the action message
        if "set_charge" in parsed:
            # Virtual switch: toggle charge, keep current discharge state
            charge = bool(parsed["set_charge"])
            discharge = self._last_discharge_mos
            val = self._compute_mos_control_value(charge, discharge)
        elif "set_discharge" in parsed:
            # Virtual switch: toggle discharge, keep current charge state
            charge = self._last_charge_mos
            discharge = bool(parsed["set_discharge"])
            val = self._compute_mos_control_value(charge, discharge)
        elif "mos_state" in parsed:
            # Direct MOS control: mos_state is binary string matching control value
            mos_state = parsed["mos_state"]
            if mos_state not in ("00", "01", "10", "11"):
                logger.error("Handler %s: invalid mos_state '%s'", self.handler_id, mos_state)
                return False
            val = int(mos_state, 2)
        elif "set_capacity" in parsed:
            return await self._execute_set_capacity(parsed)
        elif "balance" in parsed:
            return await self._execute_balance(parsed)
        else:
            logger.error("Handler %s: unknown action format: %s", self.handler_id, message)
            return False

        frame = _build_mos_frame(val)

        try:
            await self._transact(frame)
        except (OSError, SerialException, TimeoutError) as e:
            logger.warning("Handler %s: MOS control error: %s", self.handler_id, e)
            return False

        # Optimistically update local state for subsequent virtual switch actions
        if "set_charge" in parsed:
            self._last_charge_mos = bool(parsed["set_charge"])
        elif "set_discharge" in parsed:
            self._last_discharge_mos = bool(parsed["set_discharge"])
        else:
            v = int(parsed["mos_state"], 2)
            self._last_charge_mos = (v & 1) == 0
            self._last_discharge_mos = (v & 2) == 0

        return True

    async def _execute_set_capacity(self, parsed: dict) -> bool:
        """Set remaining capacity (register 0xE0) for SOC calibration."""
        try:
            capacity_mah = int(parsed["set_capacity"])
            # Register value is in units of 10mAh
            raw = capacity_mah // 10
            if not 0 <= raw <= 0xFFFF:
                logger.error("Handler %s: capacity %d mAh out of range", self.handler_id, capacity_mah)
                return False
            frame = _build_write_frame(0xE0, raw.to_bytes(2, "big"))
            await self._factory_mode(frame, save=True)
            return True
        except (OSError, SerialException, TimeoutError) as e:
            logger.warning("Handler %s: set capacity error: %s", self.handler_id, e)
            return False

    async def _execute_balance(self, parsed: dict) -> bool:
        """Balance control (register 0xE2)."""
        balance_map = {"odd": 0x0001, "even": 0x0002, "stop": 0x0003}
        mode = parsed.get("balance")
        if mode not in balance_map:
            logger.error("Handler %s: invalid balance mode '%s'", self.handler_id, mode)
            return False
        try:
            frame = _build_write_frame(0xE2, balance_map[mode].to_bytes(2, "big"))
            await self._factory_mode(frame)
            return True
        except (OSError, SerialException, TimeoutError) as e:
            logger.warning("Handler %s: balance control error: %s", self.handler_id, e)
            return False
