from .abstract_node import AbstractNode
from ..ports import EventPort, HandlerPort


class Listener(AbstractNode):
    label = "Event Listener"
    description = "Triggers when an event is received"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [HandlerPort(context)]
        self.output_ports = [EventPort(context)]

    def execute(self):
        """Execute the node."""
        for connection in self.output_connections.get("event", []):
            connection.execute()
