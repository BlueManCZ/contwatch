from .abstract_port import AbstractPort
from ..controls import Select


class HandlerPort(AbstractPort):
    name = "handler"
    label = "Handler"

    def __init__(self, context):
        super().__init__(context)
        self.controls = [
            Select(
                [
                    {
                        "label": handler.get_name(),
                        "value": handler_id,
                    }
                    for handler_id, handler in self.context.manager.registered_handlers.items()
                ]
            )
        ]
