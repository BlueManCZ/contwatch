import datetime
import logging

from app.models.logging_message import LoggingMessage
from app.nodes.base import AbstractNode
from app.nodes.ports import event_port, value_port
from app.socketio_app import sio

logger = logging.getLogger(__name__)


class Logger(AbstractNode):
    label = "Logger"
    description = "Logs a value for debugging"
    input_ports = (event_port(), value_port())
    output_ports = ()

    async def execute(self) -> None:
        value = self.get_input("value")
        logger.info("[Workflow] Node %s: %s", self.node_id, value)

        if self.session_factory:
            now = datetime.datetime.now()
            record = LoggingMessage(
                source="workflow",
                level=logging.INFO,
                message=f"Node {self.node_id}: {value}",
                date=now.date(),
                time=now.time(),
            )
            async with self.session_factory() as session:
                session.add(record)
                await session.commit()
            await sio.emit("mutate", {"entity": "logs"})
