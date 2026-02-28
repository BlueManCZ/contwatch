from .abstract_node import AbstractNode
from ..ports import Value


class Negation(AbstractNode):
    label = "Negation"
    description = "Negates an input value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [Value(context)]
        self.output_ports = [Value(context)]

    def evaluate(self):
        """Return the negated value."""
        return not self.get_input("Value")
