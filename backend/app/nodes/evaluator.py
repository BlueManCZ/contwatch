import operator as op

from app.nodes.base import AbstractNode
from app.nodes.ports import operator_port, value_port

OPERATORS = {
    ">=": op.ge,
    "<=": op.le,
    ">": op.gt,
    "<": op.lt,
    "==": op.eq,
    "<>": op.ne,
}


class Evaluator(AbstractNode):
    label = "Evaluator"
    description = "Compares two values using an operator"
    input_ports = (
        value_port(name="first_value", label="First Value"),
        operator_port(),
        value_port(name="second_value", label="Second Value"),
    )
    output_ports = (value_port(),)

    def evaluate(self, source_handle: str | None = None):
        first = self.get_input("first_value")
        operator_str = self.get_input("operator")
        second = self.get_input("second_value")

        if first is None or operator_str is None or second is None:
            return None

        func = OPERATORS.get(operator_str)
        if not func:
            return None

        try:
            return func(float(str(first).replace(",", ".")), float(str(second).replace(",", ".")))
        except (ValueError, TypeError):
            if operator_str in ("==", "<>"):
                return func(first, second)
            return None
