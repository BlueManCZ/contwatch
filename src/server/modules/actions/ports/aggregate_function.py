from .abstract_port import AbstractPort
from .utils.aggregate_functions import AGGREGATE_FUNCTIONS
from ..controls import Select


class AggregateFunction(AbstractPort):
    label = "Function"
    hide = True

    def __init__(self, context, *args):
        super().__init__(context, *args)
        self.controls = [
            Select(
                [
                    {
                        "label": function,
                        "value": function,
                    }
                    for function in AGGREGATE_FUNCTIONS
                ]
            )
        ]
