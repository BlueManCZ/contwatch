from .abstract_node import AbstractNode
from ..ports import EventPort, HandlerPort


class Listener(AbstractNode):
    label = "Event Listener"
    description = "Triggers when an event is received"

    input_ports = [HandlerPort]
    output_ports = [EventPort]

    def execute(self):
        """Execute the node."""
        for connection in self.output_connections.get("event", []):
            connection.execute()
