import asyncio
import contextlib
import json
import logging
from typing import ClassVar

import minimalmodbus

from app.handlers.base import AbstractHandler, ConfigField, Indicator, KnownAction, KnownAttribute
from app.handlers.registry import register_handler_type

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Charger workstate labels (register 15201)
# ---------------------------------------------------------------------------
_CHARGER_WORKSTATE = {
    0: "Initialization",
    1: "Self-test",
    2: "Work",
    3: "Stop",
}

# ---------------------------------------------------------------------------
# Charger MPPT state labels (register 15202)
# ---------------------------------------------------------------------------
_CHARGER_MPPT_STATE = {
    0: "Stop",
    1: "MPPT",
    2: "Current limiting",
}

# ---------------------------------------------------------------------------
# Charger charging state labels (register 15203)
# ---------------------------------------------------------------------------
_CHARGER_CHARGING_STATE = {
    0: "Stop",
    1: "Absorb charge",
    2: "Float charge",
    3: "EQ charge",
}

# ---------------------------------------------------------------------------
# Inverter workstate labels (register 25201)
# ---------------------------------------------------------------------------
_INVERTER_WORKSTATE = {
    0: "Power on",
    1: "Standby",
    2: "Initialization",
    3: "Soft start",
    4: "Grid running",
    5: "Grid generation",
    6: "Grid charge",
    7: "Off-grid running",
    8: "Off-grid charge",
    9: "Fault",
    10: "Bypass running",
}

# ---------------------------------------------------------------------------
# Error / warning bitmask label maps
# ---------------------------------------------------------------------------
_CHARGER_ERROR_BITS: dict[int, str] = {
    0: "Fan error",
    1: "Over temperature",
    2: "Battery overvoltage",
    3: "Battery undervoltage",
    4: "PV overvoltage",
    5: "Charge overcurrent",
    6: "Charge short circuit",
    7: "PV overcurrent",
}

_CHARGER_WARNING_BITS: dict[int, str] = {
    0: "Fan warning",
    1: "Temperature high",
    2: "Battery voltage high",
    3: "Battery voltage low",
}

_INVERTER_ERROR1_BITS: dict[int, str] = {
    0: "Fan error",
    1: "Over temperature",
    2: "Battery overvoltage",
    3: "Battery undervoltage",
    4: "Output short circuit",
    5: "Inverter output overvoltage",
    6: "Overload timeout",
    7: "Bus overvoltage",
    8: "Bus soft-start fail",
    9: "Main relay fail",
    10: "Output overcurrent",
    11: "Inverter output undervoltage",
    12: "PV insulation fail",
    13: "Leakage current high",
    14: "Ground I high",
}

_INVERTER_ERROR2_BITS: dict[int, str] = {
    0: "DC injection high",
    1: "PV overvoltage",
    2: "PV overcurrent",
    3: "AC input overcurrent",
}

_INVERTER_WARNING_BITS: dict[int, str] = {
    0: "Fan warning",
    1: "Temperature high",
    2: "Battery voltage high",
    3: "Battery voltage low",
    4: "Overload warning",
}


def _signed(value: int) -> int:
    """Convert unsigned 16-bit register to signed int16."""
    return value - 65536 if value >= 32768 else value


def _decode_bitmask(value: int, bit_labels: dict[int, str]) -> list[str]:
    """Return list of active label strings for set bits in *value*."""
    return [label for bit, label in bit_labels.items() if value & (1 << bit)]


def _open_instrument(port: str, slave_address: int, timeout: float) -> minimalmodbus.Instrument:
    """Create and configure a minimalmodbus Instrument (blocking)."""
    instrument = minimalmodbus.Instrument(port, slave_address)
    instrument.serial.timeout = timeout
    return instrument


def _read_all_data(instrument: minimalmodbus.Instrument) -> dict:
    """Read charger + inverter registers in small batch calls (blocking).

    Splits reads into <=20 register chunks — many MUST inverters reject
    larger Modbus frames.
    """
    instrument.serial.reset_input_buffer()

    # --- Charger: 15201-15217 (17 registers) ---
    ch = instrument.read_registers(15201, 17)

    # --- Inverter block 1: 25201-25216 (16 registers) ---
    inv1 = instrument.read_registers(25201, 16)
    # --- Inverter block 2: 25225-25236 (12 registers) ---
    inv2 = instrument.read_registers(25225, 12)
    # --- Inverter block 3: 25261-25265 (5 registers) ---
    inv3 = instrument.read_registers(25261, 5)
    # --- Inverter block 4: 25273-25274 (2 registers) ---
    inv4 = instrument.read_registers(25273, 2)

    # --- Charger decoding (offsets from 15201) ---
    charger: dict[str, object] = {
        "workstate": ch[0],  # 15201
        "mppt_state": ch[1],  # 15202
        "charging_state": ch[2],  # 15203
        "pv_voltage": ch[4] / 10,  # 15205
        "battery_voltage": ch[5] / 10,  # 15206
        "current": ch[6] / 10,  # 15207
        "power": ch[7],  # 15208
        "radiator_temp": _signed(ch[9]),  # 15210
        "external_temp": _signed(ch[10]),  # 15211
        "accumulated_energy": ch[15] * 1000 + ch[16] / 10,  # 15216 high + 15217 low
        "_error": ch[12],  # 15213
        "_warning": ch[13],  # 15214
    }

    # --- Inverter decoding ---
    inverter: dict[str, object] = {
        # Block 1 (offsets from 25201)
        "workstate": inv1[0],  # 25201
        "battery_voltage": inv1[4] / 10,  # 25205
        "inverter_voltage": inv1[5] / 10,  # 25206
        "grid_voltage": inv1[6] / 10,  # 25207
        "bus_voltage": inv1[7] / 10,  # 25208
        "control_current": inv1[8] / 10,  # 25209
        "inverter_current": inv1[9] / 10,  # 25210
        "grid_current": inv1[10] / 10,  # 25211
        "load_current": inv1[11] / 10,  # 25212
        "power": inv1[12],  # 25213
        "power_grid": _signed(inv1[13]),  # 25214
        "power_load": inv1[14],  # 25215
        "load_percent": inv1[15],  # 25216
        # Block 2 (offsets from 25225)
        "frequency": inv2[0] / 100,  # 25225
        "grid_frequency": inv2[1] / 100,  # 25226
        "inverter_dc_temp": _signed(inv2[9]),  # 25234
        "inverter_ac_temp": _signed(inv2[10]),  # 25235
        "transformer_temp": _signed(inv2[11]),  # 25236
        # Block 3 (offsets from 25261)
        "_error1": inv3[0],  # 25261
        "_error2": inv3[1],  # 25262
        "_warning": inv3[4],  # 25265
        # Block 4 (offsets from 25273)
        "battery_current": _signed(inv4[0]) / 10,  # 25273
        "battery_power": _signed(inv4[1]),  # 25274
    }

    return {"charger": charger, "inverter": inverter}


@register_handler_type
class MustPVPHInverterModbusHandler(AbstractHandler):
    """Handler for MUST PV/PH solar system inverters via Modbus RTU."""

    handler_type = "must_pv_ph_modbus"
    handler_name = "MUST PV/PH solar inverter"
    handler_icon = "solar-panel"
    handler_category = "serial"
    probe_priority: ClassVar[int] = 10
    config_fields: ClassVar[list[ConfigField]] = [
        {"key": "port", "type": "string", "label": "Device port (e.g. /dev/ttyUSB0)", "default": ""},
        {"key": "slave_address", "type": "int", "label": "Slave address", "default": 4},
        {"key": "interval", "type": "int", "label": "Polling interval (s)", "default": 10},
        {"key": "auto_reconnect", "type": "bool", "label": "Auto reconnect", "default": True},
    ]

    @classmethod
    def describe(cls, options: dict) -> str:
        port = options.get("config", {}).get("port", "")
        return port or cls.handler_name

    # ------------------------------------------------------------------
    # Known attributes (~30, grouped by charger / inverter)
    # ------------------------------------------------------------------
    known_attributes: ClassVar[list[KnownAttribute]] = [
        # Charger
        KnownAttribute(name="charger/workstate", label="Charger workstate"),
        KnownAttribute(name="charger/mppt_state", label="MPPT state"),
        KnownAttribute(name="charger/charging_state", label="Charging state"),
        KnownAttribute(name="charger/pv_voltage", label="PV voltage", unit="V", rounding=1),
        KnownAttribute(name="charger/battery_voltage", label="Charger battery voltage", unit="V", rounding=1),
        KnownAttribute(name="charger/current", label="Charge current", unit="A", rounding=1),
        KnownAttribute(name="charger/power", label="Charge power", unit="W", rounding=0),
        KnownAttribute(name="charger/radiator_temp", label="Charger radiator temp", unit="\u00b0C", rounding=0),
        KnownAttribute(name="charger/external_temp", label="Charger external temp", unit="\u00b0C", rounding=0),
        KnownAttribute(name="charger/accumulated_energy", label="Charger accumulated energy", unit="kWh", rounding=1),
        # Inverter
        KnownAttribute(name="inverter/workstate", label="Inverter workstate"),
        KnownAttribute(name="inverter/battery_voltage", label="Inverter battery voltage", unit="V", rounding=1),
        KnownAttribute(name="inverter/inverter_voltage", label="Inverter output voltage", unit="V", rounding=1),
        KnownAttribute(name="inverter/grid_voltage", label="Grid voltage", unit="V", rounding=1),
        KnownAttribute(name="inverter/bus_voltage", label="Bus voltage", unit="V", rounding=1),
        KnownAttribute(name="inverter/control_current", label="Control current", unit="A", rounding=1),
        KnownAttribute(name="inverter/inverter_current", label="Inverter current", unit="A", rounding=1),
        KnownAttribute(name="inverter/grid_current", label="Grid current", unit="A", rounding=1),
        KnownAttribute(name="inverter/load_current", label="Load current", unit="A", rounding=1),
        KnownAttribute(name="inverter/power", label="Inverter power", unit="W", rounding=0),
        KnownAttribute(name="inverter/power_grid", label="Grid power", unit="W", rounding=0),
        KnownAttribute(name="inverter/power_load", label="Load power", unit="W", rounding=0),
        KnownAttribute(name="inverter/load_percent", label="Load percent", unit="%", rounding=0),
        KnownAttribute(name="inverter/frequency", label="Inverter frequency", unit="Hz", rounding=2),
        KnownAttribute(name="inverter/grid_frequency", label="Grid frequency", unit="Hz", rounding=2),
        KnownAttribute(name="inverter/inverter_dc_temp", label="Inverter DC temp", unit="\u00b0C", rounding=0),
        KnownAttribute(name="inverter/inverter_ac_temp", label="Inverter AC temp", unit="\u00b0C", rounding=0),
        KnownAttribute(name="inverter/transformer_temp", label="Transformer temp", unit="\u00b0C", rounding=0),
        KnownAttribute(name="inverter/battery_power", label="Battery power", unit="W", rounding=0),
        KnownAttribute(name="inverter/battery_current", label="Battery current", unit="A", rounding=1),
    ]

    # ------------------------------------------------------------------
    # Known actions (writable Modbus registers)
    # ------------------------------------------------------------------
    known_actions: ClassVar[list[KnownAction]] = [
        # Charger control
        KnownAction(name="Charger ON", message='{"register": 10101, "value": 0}'),
        KnownAction(name="Charger OFF", message='{"register": 10101, "value": 1}'),
        # Inverter off-grid
        KnownAction(name="Off-grid inverter ON", message='{"register": 20101, "value": 1}'),
        KnownAction(name="Off-grid inverter OFF", message='{"register": 20101, "value": 0}'),
        # Inverter on-grid
        KnownAction(name="On-grid inverter ON", message='{"register": 20105, "value": 1}'),
        KnownAction(name="On-grid inverter OFF", message='{"register": 20105, "value": 0}'),
        # Grid charge
        KnownAction(name="Grid charge ON", message='{"register": 20106, "value": 1}'),
        KnownAction(name="Grid charge OFF", message='{"register": 20106, "value": 0}'),
        # Battery discharge
        KnownAction(name="Battery discharge ON", message='{"register": 20107, "value": 1}'),
        KnownAction(name="Battery discharge OFF", message='{"register": 20107, "value": 0}'),
        # Discharge to grid
        KnownAction(name="Discharge to grid ON", message='{"register": 20108, "value": 1}'),
        KnownAction(name="Discharge to grid OFF", message='{"register": 20108, "value": 0}'),
        # Energy use mode (20109): 0=SUB, 1=SBU, 2=UTI
        KnownAction(name="Energy use: SUB (Solar-Utility-Battery)", message='{"register": 20109, "value": 0}'),
        KnownAction(name="Energy use: SBU (Solar-Battery-Utility)", message='{"register": 20109, "value": 1}'),
        KnownAction(name="Energy use: UTI (Utility only)", message='{"register": 20109, "value": 2}'),
        # Charger source priority (20143): 0=Solar first, 1=Solar+Utility, 2=Only Solar
        KnownAction(name="Charger priority: Solar first", message='{"register": 20143, "value": 0}'),
        KnownAction(name="Charger priority: Solar+Utility", message='{"register": 20143, "value": 1}'),
        KnownAction(name="Charger priority: Only Solar", message='{"register": 20143, "value": 2}'),
    ]

    # ------------------------------------------------------------------
    # Instance state
    # ------------------------------------------------------------------

    def __init__(self, handler_id: int, options: dict) -> None:
        super().__init__(handler_id, options)
        self._instrument: minimalmodbus.Instrument | None = None
        self._serial_lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Probe
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Indicators
    # ------------------------------------------------------------------

    def extract_indicators(self, data: dict) -> list[Indicator]:
        indicators: list[Indicator] = []

        charger = data.get("charger", {})
        inverter = data.get("inverter", {})

        # Charger workstate
        ch_ws = charger.get("workstate")
        if ch_ws is not None:
            label = _CHARGER_WORKSTATE.get(int(ch_ws), f"Unknown ({ch_ws})")
            color = "success" if int(ch_ws) == 2 else "muted"
            indicators.append(Indicator(icon="sun", color=color, tooltip=f"Charger: {label}"))

        # Inverter workstate
        inv_ws = inverter.get("workstate")
        if inv_ws is not None:
            ws_int = int(inv_ws)
            label = _INVERTER_WORKSTATE.get(ws_int, f"Unknown ({inv_ws})")
            color = "success" if ws_int in (4, 5, 6, 7, 8) else ("destructive" if ws_int == 9 else "muted")
            indicators.append(Indicator(icon="zap", color=color, tooltip=f"Inverter: {label}"))

        # Charger errors / warnings
        # Charger errors / warnings
        for msg in _decode_bitmask(int(charger.get("_error", 0)), _CHARGER_ERROR_BITS):
            indicators.append(
                Indicator(icon="alert-triangle", color="destructive", tooltip=f"Charger error: {msg}")
            )
        for msg in _decode_bitmask(int(charger.get("_warning", 0)), _CHARGER_WARNING_BITS):
            indicators.append(
                Indicator(icon="alert-triangle", color="warning", tooltip=f"Charger warning: {msg}")
            )

        # Inverter errors / warnings
        for msg in _decode_bitmask(int(inverter.get("_error1", 0)), _INVERTER_ERROR1_BITS):
            indicators.append(
                Indicator(icon="alert-triangle", color="destructive", tooltip=f"Inverter error: {msg}")
            )
        for msg in _decode_bitmask(int(inverter.get("_error2", 0)), _INVERTER_ERROR2_BITS):
            indicators.append(
                Indicator(icon="alert-triangle", color="destructive", tooltip=f"Inverter error: {msg}")
            )
        for msg in _decode_bitmask(int(inverter.get("_warning", 0)), _INVERTER_WARNING_BITS):
            indicators.append(
                Indicator(icon="alert-triangle", color="warning", tooltip=f"Inverter warning: {msg}")
            )

        return indicators

    def disconnected_indicators(self) -> list[Indicator]:
        return [Indicator(icon="unplug", color="destructive", tooltip="Modbus disconnected")]

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    async def execute_action(self, message: str) -> bool:
        try:
            parsed = json.loads(message)
        except (json.JSONDecodeError, TypeError):
            logger.error("Handler %s: invalid action JSON: %s", self.handler_id, message)
            return False

        register = parsed.get("register")
        value = parsed.get("value")
        if register is None or value is None:
            logger.error("Handler %s: action missing register/value: %s", self.handler_id, message)
            return False

        async with self._serial_lock:
            if self._instrument is None:
                logger.error("Handler %s: no instrument available for action", self.handler_id)
                return False
            try:
                await asyncio.to_thread(self._instrument.write_register, int(register), int(value))
                logger.info("Handler %s: wrote register %s = %s", self.handler_id, register, value)
                return True
            except (OSError, minimalmodbus.NoResponseError, minimalmodbus.InvalidResponseError) as e:
                logger.warning("Handler %s: action write error: %s", self.handler_id, e)
                return False

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def run(self) -> None:
        port = self.get_config_option("port", "")
        slave_address = int(self.get_config_option("slave_address", 4))
        interval = int(self.get_config_option("interval", 10))
        auto_reconnect = self.get_config_option("auto_reconnect", True)

        while self.is_active:
            try:
                instrument = await asyncio.to_thread(_open_instrument, port, slave_address, 0.5)
                async with self._serial_lock:
                    self._instrument = instrument
                self._connected = True
                logger.info("Handler %s: connected to %s (addr=%s)", self.handler_id, port, slave_address)

                while self.is_active:
                    async with self._serial_lock:
                        data = await asyncio.to_thread(_read_all_data, instrument)
                    self.add_message(data)
                    await self.wait_for_interval(interval)

            except (OSError, minimalmodbus.NoResponseError, minimalmodbus.InvalidResponseError) as e:
                logger.warning("Handler %s: modbus error on %s: %s", self.handler_id, port, e)
                self._connected = False
            finally:
                async with self._serial_lock:
                    if self._instrument is not None:
                        with contextlib.suppress(Exception):
                            self._instrument.serial.close()
                        self._instrument = None
                self._connected = False

            if not self.is_active:
                break

            if auto_reconnect:
                logger.info("Handler %s: reconnecting in 1s ...", self.handler_id)
                await asyncio.sleep(1)
            else:
                return
