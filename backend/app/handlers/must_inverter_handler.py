import asyncio
import contextlib
import logging
from typing import ClassVar

import minimalmodbus

from app.handlers.base import AbstractHandler, KnownAttribute
from app.handlers.registry import register_handler_type

logger = logging.getLogger(__name__)

_REGISTERS: dict[str, dict[str, list[int]]] = {
    "charger": {
        "pv_voltage": [15205, 1],
        "battery_voltage": [15206, 1],
        "current": [15207, 1],
        "power": [15208, 0],
    },
    "inverter": {
        "battery_voltage": [25205, 1],
        "power": [25213, 0],
        "power_grid": [25214, 0],
        "power_load": [25215, 0],
    },
}


def _open_instrument(port: str, slave_address: int, timeout: float) -> minimalmodbus.Instrument:
    """Create and configure a minimalmodbus Instrument (blocking)."""
    instrument = minimalmodbus.Instrument(port, slave_address)
    instrument.serial.timeout = timeout
    return instrument


async def _read_all_registers(instrument: minimalmodbus.Instrument) -> dict:
    """Read all configured registers from the instrument."""
    await asyncio.to_thread(instrument.serial.reset_input_buffer)
    result: dict = {}
    for section, registers in _REGISTERS.items():
        result[section] = {}
        for key, (address, decimals) in registers.items():
            result[section][key] = await asyncio.to_thread(instrument.read_register, address, decimals)
            await asyncio.sleep(0.05)
    return result


@register_handler_type
class MustPVPHInverterModbusHandler(AbstractHandler):
    """Handler for MUST PV/PH solar system inverters via Modbus RTU."""

    handler_type = "must_pv_ph_modbus"
    handler_name = "MUST PV/PH solar inverter"
    handler_icon = "solar-panel"
    handler_category = "serial"
    probe_priority: ClassVar[int] = 10
    config_fields: ClassVar[list[dict]] = [
        {"key": "port", "type": "string", "label": "Device port (e.g. /dev/ttyUSB0)", "default": ""},
        {"key": "slave_address", "type": "int", "label": "Slave address", "default": 4},
        {"key": "interval", "type": "int", "label": "Polling interval (s)", "default": 10},
        {"key": "auto_reconnect", "type": "bool", "label": "Auto reconnect", "default": True},
    ]

    @classmethod
    def describe(cls, options: dict) -> str:
        port = options.get("config", {}).get("port", "")
        return port or cls.handler_name

    known_attributes: ClassVar[list[KnownAttribute]] = [
        KnownAttribute(name="charger/pv_voltage", label="PV voltage", unit="V", rounding=1),
        KnownAttribute(name="charger/battery_voltage", label="Charger battery voltage", unit="V", rounding=1),
        KnownAttribute(name="charger/current", label="Charge current", unit="A", rounding=1),
        KnownAttribute(name="charger/power", label="Charge power", unit="W", rounding=0),
        KnownAttribute(name="inverter/battery_voltage", label="Inverter battery voltage", unit="V", rounding=1),
        KnownAttribute(name="inverter/power", label="Inverter power", unit="W", rounding=0),
        KnownAttribute(name="inverter/power_grid", label="Grid power", unit="W", rounding=0),
        KnownAttribute(name="inverter/power_load", label="Load power", unit="W", rounding=0),
    ]

    @classmethod
    async def probe(cls, config: dict) -> bool:
        port = config.get("port", "")
        slave_address = int(config.get("slave_address", 4))
        if not port:
            return False
        try:
            instrument = await asyncio.to_thread(_open_instrument, port, slave_address, 0.5)
            try:
                await asyncio.to_thread(instrument.read_register, 15205, 1)
                return True
            finally:
                with contextlib.suppress(Exception):
                    instrument.serial.close()
        except Exception:
            return False

    async def run(self) -> None:
        port = self.get_config_option("port", "")
        slave_address = int(self.get_config_option("slave_address", 4))
        interval = int(self.get_config_option("interval", 10))
        auto_reconnect = self.get_config_option("auto_reconnect", True)

        while self.is_active:
            instrument: minimalmodbus.Instrument | None = None
            try:
                instrument = await asyncio.to_thread(_open_instrument, port, slave_address, 0.1)
                self._connected = True
                logger.info("Handler %s: connected to %s (addr=%s)", self.handler_id, port, slave_address)

                while self.is_active:
                    data = await _read_all_registers(instrument)
                    self.add_message(data)
                    await self.wait_for_interval(interval)

            except (OSError, minimalmodbus.NoResponseError, minimalmodbus.InvalidResponseError) as e:
                logger.warning("Handler %s: modbus error on %s: %s", self.handler_id, port, e)
                self._connected = False
            finally:
                if instrument:
                    with contextlib.suppress(Exception):
                        instrument.serial.close()
                self._connected = False

            if not self.is_active:
                break

            if auto_reconnect:
                logger.info("Handler %s: reconnecting in 1s ...", self.handler_id)
                await asyncio.sleep(1)
            else:
                return
