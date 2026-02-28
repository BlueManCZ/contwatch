from .abstract_handler import AbstractHandler
from .http_handler import HttpHandler
from .jiabaida_bms_serial_handler import JiabaidaBmsSerialHandler
from .must_pv_ph_inverter_modbus_handler import MustPVPHInverterModbusHandler
from .serial_handler import SerialHandler
from .shelly_plug import ShellyPlugHandler

available_handlers = [
    HttpHandler,
    SerialHandler,
    JiabaidaBmsSerialHandler,
    MustPVPHInverterModbusHandler,
    ShellyPlugHandler,
]


def get_handler_class(handler_type):
    for handler in available_handlers:
        if handler.type == handler_type:
            return handler
    return None
