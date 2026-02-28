from .abstract_node import AbstractNode
from ..ports import Event, Handler


class HandlerListener(AbstractNode):
    label = "Handler Listener"
    description = "Triggers when handler data is received"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [Handler(context)]
        self.output_ports = [Event(context)]

    def execute(self):
        """Execute the node."""
        for connection in self.output_connections.get("Event", []):
            connection.execute()
