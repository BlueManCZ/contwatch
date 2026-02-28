from app.nodes.base import AbstractNode
from app.nodes.ports import attribute_port, value_port


class AttributeReader(AbstractNode):
    label = "Attribute Reader"
    description = "Reads the current value of an attribute"
    input_ports = (attribute_port(),)
    output_ports = (value_port(),)

    def evaluate(self):
        attr_id = self.data.get("attribute_id")
        if attr_id is not None and self.manager:
            result = self.manager.get_attribute_value(int(attr_id))
            if result:
                return result["value"]
        return None
