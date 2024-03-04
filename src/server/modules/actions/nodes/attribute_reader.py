from pony import orm

from .abstract_node import AbstractNode
from ..ports import Attribute, Value


class AttributeReader(AbstractNode):
    label = "Attribute Reader"
    description = "Reads an attribute from a handler"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [Attribute(context)]
        self.output_ports = [Value(context)]

    @orm.db_session
    def evaluate(self):
        attribute_id = self.get_input("Attribute")
        if attribute_id:
            for attributes in self.context.manager.registered_attributes.values():
                for attribute in attributes.values():
                    if attribute.get_id() == attribute_id:
                        return attribute.get_current_value()
        return None