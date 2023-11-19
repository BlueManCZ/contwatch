from .abstract_node import AbstractNode
from ..ports import EventPort, HandlerPort


class Listener(AbstractNode):
    label = "Event Listener"
    description = "Triggers when an event is received"

    inputs = [HandlerPort]
    outputs = [EventPort]
