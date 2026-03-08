import contextlib
import statistics

from app.nodes.base import AbstractNode
from app.nodes.ports import PortDef, aggregate_port, value_port

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
    input_ports = (
        aggregate_port(),
        PortDef(name="value", type="value", label="Value", color="blue", control="text", dynamic=True),
    )
    output_ports = (value_port(),)

    def evaluate(self, source_handle: str | None = None):
        func_name = self.get_input("function")
        if not func_name or func_name not in FUNCTIONS:
            return None

        values = []
        # Collect from all value-related input connections (value, value_0, value_1, ...)
        for key in sorted(self.input_connections):
            if key != "value" and not key.startswith("value_"):
                continue
            val = self.get_input(key)
            if val is not None:
                with contextlib.suppress(ValueError, TypeError):
                    values.append(float(str(val).replace(",", ".")))

        # Also collect manually entered values from data (for unconnected ports)
        for key in sorted(self.data):
            if not key.startswith("value_") or key in self.input_connections:
                continue
            val = self.data[key]
            if val:
                with contextlib.suppress(ValueError, TypeError):
                    values.append(float(str(val).replace(",", ".")))

        if not values:
            return None

        result = FUNCTIONS[func_name](values)
        # Clean up floating point artifacts (e.g. 18.099999999999998 -> 18.1)
        return round(result, 10)
