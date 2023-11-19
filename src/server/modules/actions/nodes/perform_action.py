from .abstract_node import AbstractNode
from ..ports import ActionPort, EventPort


class PerformAction(AbstractNode):
    label = "Perform Action"
    description = "Performs an action"

    inputs = [EventPort, ActionPort]
