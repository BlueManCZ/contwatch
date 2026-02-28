from .abstract_port import AbstractPort
from .utils import RELATIONAL_OPERATIONS
from ..controls import Select


class RelationalOperator(AbstractPort):
    label = "Operator"
    hide = True

    def __init__(self, *args):
        super().__init__(*args)
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
