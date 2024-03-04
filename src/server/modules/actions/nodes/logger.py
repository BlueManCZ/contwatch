from .abstract_node import AbstractNode
from ..ports import Value, Event


class Logger(AbstractNode):
    label = "Logger"
    description = "Logs value to console and system log"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [Event(context), Value(context)]

    def execute(self):
        value = self.get_input("Value")
        print(value)
