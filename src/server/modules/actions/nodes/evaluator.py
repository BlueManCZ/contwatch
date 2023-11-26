from .abstract_node import AbstractNode
from ..ports import RelationalOperatorPort, ValuePort
from ..ports.utils import RELATIONAL_OPERATIONS


class Evaluator(AbstractNode):
    label = "Evaluator"
    description = "Evaluates a condition and returns value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [
            ValuePort(context, "first_value"),
            RelationalOperatorPort(context, "condition"),
            ValuePort(context, "second_value"),
        ]
        self.output_ports = [ValuePort(context)]

    def evaluate(self):
        condition = self.get_input("condition")
        try:
            first_value = float(self.get_input("first_value"))
            second_value = float(self.get_input("second_value"))
            return RELATIONAL_OPERATIONS[condition](first_value, second_value)
        except ValueError as error:
            print(error)
            return False
