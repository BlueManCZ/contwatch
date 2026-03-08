from __future__ import annotations

import asyncio
import re
from dataclasses import asdict
from typing import TYPE_CHECKING, ClassVar

from app.nodes.ports import PortDef

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.services.handler_manager import HandlerManager

_PASCAL_TO_SNAKE_RE = re.compile(r"(?<=[a-z0-9])([A-Z])")


class AbstractNode:
    node_type: ClassVar[str]
    label: ClassVar[str] = ""
    description: ClassVar[str] = ""
    input_ports: ClassVar[tuple[PortDef, ...]] = ()
    output_ports: ClassVar[tuple[PortDef, ...]] = ()
    edge_debug: ClassVar[bool] = False

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.node_type = _PASCAL_TO_SNAKE_RE.sub(r"_\1", cls.__name__).lower()

    def __init__(
        self,
        node_id: str,
        data: dict,
        *,
        manager: HandlerManager | None = None,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
    ):
        self.node_id = node_id
        self.data = data
        self.manager = manager
        self.session_factory = session_factory
        self.input_connections: dict[str, list[AbstractNode]] = {}
        self.output_connections: dict[str, list[AbstractNode]] = {}
        self.edge_sources: dict[str, tuple[str, str]] = {}

    def get_input(self, port_name: str):
        """Get value: from connected node's evaluate(), or from self.data[port_name]."""
        conns = self.input_connections.get(port_name)
        if conns:
            edge_info = self.edge_sources.get(port_name)
            source_handle = edge_info[1] if edge_info else None
            value = conns[0].evaluate(source_handle)
            if AbstractNode.edge_debug and edge_info:
                self._emit_edge_value(edge_info, port_name, value)
            return value
        return self.data.get(port_name)

    def _emit_edge_value(
        self,
        edge_info: tuple[str, str],
        target_handle: str,
        value: object,
    ) -> None:
        from app.socketio_app import sio

        source_id, source_handle = edge_info
        type_name = type(value).__name__ if value is not None else "NoneType"
        asyncio.get_running_loop().create_task(
            sio.emit(
                "workflow_edge_value",
                {
                    "source": source_id,
                    "source_handle": source_handle,
                    "target": self.node_id,
                    "target_handle": target_handle,
                    "value": str(value),
                    "type": type_name,
                },
            )
        )

    def get_state(self) -> dict | None:
        """Return serializable runtime state to preserve across graph rebuilds."""
        return None

    def restore_state(self, state: dict) -> None:
        """Restore runtime state from a previous graph instance."""

    async def execute(self) -> None:
        """Execute this node's action (event-driven nodes)."""
        raise NotImplementedError

    def evaluate(self, source_handle: str | None = None):
        """Evaluate this node's value (data-pull nodes).

        Args:
            source_handle: The output port being pulled, for multi-output nodes.
        """
        raise NotImplementedError

    @classmethod
    def get_definition(cls) -> dict:
        """Return serializable metadata for API/frontend."""
        return {
            "type": cls.node_type,
            "label": cls.label,
            "description": cls.description,
            "input_ports": [
                asdict(p) | {"options": [{"value": o, "label": o} for o in p.options]} for p in cls.input_ports
            ],
            "output_ports": [
                asdict(p) | {"options": [{"value": o, "label": o} for o in p.options]} for p in cls.output_ports
            ],
        }
