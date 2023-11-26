from .abstract_node import AbstractNode
from ..ports import ValuePort, AggregateFunctionPort
from ..ports.utils import AGGREGATE_FUNCTIONS


class Aggregator(AbstractNode):
    label = "Aggregator"
    description = "Aggregates input values and returns value"
    repeatable_input = "value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [
            AggregateFunctionPort(context),
            ValuePort(context),
        ]
        self.output_ports = [ValuePort(context)]

    def evaluate(self):
        try:
            result = map(lambda x: float(x), self.get_repeatable_inputs("value"))
            return AGGREGATE_FUNCTIONS[self.get_input("aggregate_function")](*result)
        except ValueError as error:
            print(error)
            return None
