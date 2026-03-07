from app.nodes.base import AbstractNode
from app.nodes.ports import value_port


class Negation(AbstractNode):
    label = "Negation"
    description = "Inverts a boolean value"
    input_ports = (value_port(),)
    output_ports = (value_port(),)

    def evaluate(self):
        value = self.get_input("value")
        if value is None:
            return True
        if isinstance(value, (int, float)):
            return not bool(value)
        if isinstance(value, str):
            return value.lower() in ("", "0", "false", "none", "null")
        return not bool(value)
