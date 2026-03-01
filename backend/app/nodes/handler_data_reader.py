from app.nodes.base import AbstractNode
from app.nodes.ports import handler_data_key_port, handler_port, value_port


class HandlerDataReader(AbstractNode):
    label = "Handler Data Reader"
    description = "Reads a raw value from handler data by key"
    input_ports = (handler_port(), handler_data_key_port())
    output_ports = (value_port(),)

    def evaluate(self):
        handler_id = self.get_input("handler_id")
        key = self.get_input("key")
        if handler_id is not None and key and self.manager:
            return self.manager.get_handler_data_value(int(handler_id), key)
        return None
