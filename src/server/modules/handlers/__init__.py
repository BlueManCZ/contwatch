from .abstract_handler import AbstractHandler
from .http_handler import HttpHandler

available_handlers = [HttpHandler]


def get_handler_class(handler_type):
    for handler in available_handlers:
        if handler.type == handler_type:
            return handler
    return None
