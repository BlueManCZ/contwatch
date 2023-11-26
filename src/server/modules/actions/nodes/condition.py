from .abstract_node import AbstractNode
from ..ports import EventPort, ValuePort


class Condition(AbstractNode):
    label = "Condition"
    description = "Triggers event on according branch based on a input value"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [EventPort(context), ValuePort(context)]
        self.output_ports = [
            EventPort(context, "true_event", "True Event"),
            EventPort(context, "false_event", "False Event"),
        ]

    def execute(self):
        if self.get_input("value"):
            for connection in self.output_connections.get("true_event", []):
                connection.execute()
        else:
            for connection in self.output_connections.get("false_event", []):
                connection.execute()
