from modules.handlers.serial_handler import SerialHandler
from modules.handlers.http_handler import HttpHandler
from modules.handlers.bms_serial_handler import BmsSerialHandler

loaded_handlers = [SerialHandler, HttpHandler, BmsSerialHandler]


def get_handler_class(handler_type):
    for handler in loaded_handlers:
        if handler.type == handler_type:
            return handler
    return False
