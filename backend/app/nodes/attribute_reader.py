from app.nodes.base import AbstractNode
from app.nodes.ports import attribute_port, event_port, value_port


class AttributeReader(AbstractNode):
    label = "Attribute Reader"
    description = "Reads the current value of an attribute and optionally triggers on change"
    input_ports = (attribute_port(),)
    output_ports = (event_port(), value_port())

    async def execute(self) -> None:
        for node in self.output_connections.get("event", []):
            await node.execute()

    def evaluate(self):
        attr_id = self.data.get("attribute_id")
        if attr_id is not None and self.manager:
            result = self.manager.get_attribute_value(int(attr_id))
            if result:
                return result["value"]
        return None
