from . import AttributeReader
from ..ports import Event, Value


class AttributeReaderListener(AttributeReader):
    label = "Attribute Change Listener"
    description = "Triggers when attribute value changes"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.output_ports = [Event(context), Value(context)]

    def execute(self):
        for connection in self.output_connections.get("Event", []):
            connection.execute()
