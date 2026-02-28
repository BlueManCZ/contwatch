import contextlib
import statistics

from app.nodes.base import AbstractNode
from app.nodes.ports import aggregate_port, value_port

FUNCTIONS = {
    "Minimum": min,
    "Maximum": max,
    "Summation": sum,
    "Average": statistics.mean,
    "Median": statistics.median,
}


class Aggregator(AbstractNode):
    label = "Aggregator"
    description = "Applies an aggregate function to multiple values"
    input_ports = (aggregate_port(), value_port())
    output_ports = (value_port(),)

    def evaluate(self):
        func_name = self.get_input("function")
        if not func_name or func_name not in FUNCTIONS:
            return None

        # Collect values from all connected value nodes
        conns = self.input_connections.get("value", [])
        if not conns:
            return None

        values = []
        for node in conns:
            val = node.evaluate()
            if val is not None:
                with contextlib.suppress(ValueError, TypeError):
                    values.append(float(val))

        if not values:
            return None

        return FUNCTIONS[func_name](values)
