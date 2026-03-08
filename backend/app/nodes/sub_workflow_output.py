from __future__ import annotations

from app.nodes.base import AbstractNode
from app.nodes.ports import PortDef


class SubWorkflowOutput(AbstractNode):
    label = "Output"
    description = "Exit point for sub-workflow — collects an output value"
    input_ports = (
        PortDef(name="name", type="text", label="Name", control="text"),
        PortDef(name="event", type="event", label="Event", color="yellow"),
        PortDef(name="value", type="value", label="Value", color="blue"),
    )
    output_ports = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._event_fired = False

    def evaluate(self, source_handle: str | None = None):
        return self.get_input("value")

    async def execute(self) -> None:
        self._event_fired = True
