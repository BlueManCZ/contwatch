from .abstract_node import AbstractNode
from ..ports import ValuePort


class Negation(AbstractNode):
    label = "Negation"
    description = "Negates an input value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [ValuePort(context)]
        self.output_ports = [ValuePort(context)]

    def evaluate(self):
        """Return the negated value."""
        return not self.get_input("value")
