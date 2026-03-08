from __future__ import annotations

from app.nodes.base import AbstractNode
from app.nodes.ports import PortDef


class SubWorkflowInput(AbstractNode):
    label = "Input"
    description = "Entry point for sub-workflow — exposes an input port"
    input_ports = (PortDef(name="name", type="text", label="Name", control="text"),)
    output_ports = (PortDef(name="output", type="value", label="Output", color="blue"),)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._binding: object = None

    def set_binding(self, value: object) -> None:
        """Set the value provided by the parent SubWorkflowNode."""
        self._binding = value

    def evaluate(self, source_handle: str | None = None):
        return self._binding

    async def execute(self) -> None:
        """Propagate event to connected nodes."""
        for node in self.output_connections.get("output", []):
            await node.execute()
