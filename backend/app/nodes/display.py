import asyncio
import logging

from app.nodes.base import AbstractNode
from app.nodes.ports import event_port, value_port
from app.socketio_app import sio

logger = logging.getLogger(__name__)


class Display(AbstractNode):
    label = "Display"
    description = "Displays the current value and its type (pass-through)"
    input_ports = (event_port(), value_port())
    output_ports = (event_port(), value_port())

    def _emit_display(self, value: object) -> None:
        type_name = type(value).__name__ if value is not None else "NoneType"
        logger.info("[Workflow] Display %s: %r (%s)", self.node_id, value, type_name)
        asyncio.get_running_loop().create_task(
            sio.emit(
                "workflow_display",
                {"node_id": self.node_id, "value": str(value), "type": type_name},
            )
        )

    async def execute(self) -> None:
        value = self.get_input("value")
        self._emit_display(value)

        for node in self.output_connections.get("event", []):
            await node.execute()

    def evaluate(self):
        value = self.get_input("value")
        self._emit_display(value)
        return value
