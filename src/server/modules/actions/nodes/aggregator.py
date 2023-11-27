from .abstract_node import AbstractNode
from ..ports import Value, AggregateFunction
from ..ports.utils import AGGREGATE_FUNCTIONS


class Aggregator(AbstractNode):
    label = "Aggregator"
    description = "Aggregates input values and returns value"
    repeatable_input = "value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [
            AggregateFunction(context),
            Value(context),
        ]
        self.output_ports = [Value(context)]

    def evaluate(self):
        try:
            result = map(lambda x: float(x), self.get_repeatable_inputs("Value"))
            return AGGREGATE_FUNCTIONS[self.get_input("AggregateFunction")](*result)
        except ValueError as error:
            print(error)
            return None
