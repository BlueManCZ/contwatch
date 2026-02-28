from .abstract_node import AbstractNode
from ..ports import Event, Value


class Condition(AbstractNode):
    label = "Condition"
    description = "Triggers event on according branch based on a input value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [Event(context), Value(context)]
        self.output_ports = [
            Event(context, "TrueEvent", "True Event"),
            Event(context, "FalseEvent", "False Event"),
        ]

    def execute(self):
        if self.get_input("Value"):
            for connection in self.output_connections.get("TrueEvent", []):
                connection.execute()
        else:
            for connection in self.output_connections.get("FalseEvent", []):
                connection.execute()
