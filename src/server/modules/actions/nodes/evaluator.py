from .abstract_node import AbstractNode
from ..ports import RelationalOperator, Value
from ..ports.utils import RELATIONAL_OPERATIONS


class Evaluator(AbstractNode):
    label = "Evaluator"
    description = "Evaluates a condition and returns value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [
            Value(context, "FirstValue"),
            RelationalOperator(context, "Condition"),
            Value(context, "SecondValue"),
        ]
        self.output_ports = [Value(context)]

    def evaluate(self):
        condition = self.get_input("Condition")
        try:
            first_value = float(self.get_input("FirstValue")) if self.get_input("FirstValue") else None
            second_value = float(self.get_input("SecondValue")) if self.get_input("SecondValue") else None
            return (
                RELATIONAL_OPERATIONS[condition](first_value, second_value)
                if first_value is not None and second_value is not None
                else None
            )
        except ValueError as error:
            print(error)
            return False
