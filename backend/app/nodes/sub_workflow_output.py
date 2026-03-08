from __future__ import annotations

from app.nodes.base import AbstractNode
from app.nodes.ports import PortDef


class SubWorkflowOutput(AbstractNode):
    label = "Output"
    description = "Exit point for sub-workflow — collects an output value"
    input_ports = (
        PortDef(name="name", type="text", label="Name", control="text"),
        PortDef(name="input", type="value", label="Input", color="blue"),
    )
    output_ports = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._event_fired = False

    def evaluate(self, source_handle: str | None = None):
        return self.get_input("input")

    async def execute(self) -> None:
        self._event_fired = True
