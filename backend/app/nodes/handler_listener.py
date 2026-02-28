from app.nodes.base import AbstractNode
from app.nodes.ports import event_port, handler_port


class HandlerListener(AbstractNode):
    label = "Handler Listener"
    description = "Triggers when a handler receives data"
    input_ports = (handler_port(),)
    output_ports = (event_port(),)

    async def execute(self) -> None:
        for node in self.output_connections.get("event", []):
            await node.execute()
