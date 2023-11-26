from .abstract_port import AbstractPort
from .utils import RELATIONAL_OPERATIONS
from ..controls import Select


class RelationalOperatorPort(AbstractPort):
    name = "relational_operator"
    label = "Operator"
    hide = True

    def __init__(self, context, *args):
        super().__init__(context, *args)
        self.controls = [
            Select(
                [
                    {
                        "label": operator,
                        "value": operator,
                    }
                    for operator in RELATIONAL_OPERATIONS
                ]
            )
        ]
