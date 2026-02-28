from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, ClassVar

from app.nodes.ports import PortDef

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.services.handler_manager import HandlerManager


class AbstractNode:
    node_type: ClassVar[str]
    label: ClassVar[str] = ""
    description: ClassVar[str] = ""
    input_ports: ClassVar[tuple[PortDef, ...]] = ()
    output_ports: ClassVar[tuple[PortDef, ...]] = ()

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.node_type = cls.__name__

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

    def get_input(self, port_name: str):
        """Get value: from connected node's evaluate(), or from self.data[port_name]."""
        conns = self.input_connections.get(port_name)
        if conns:
            return conns[0].evaluate()
        return self.data.get(port_name)

    async def execute(self) -> None:
        """Execute this node's action (event-driven nodes)."""
        raise NotImplementedError

    def evaluate(self):
        """Evaluate this node's value (data-pull nodes)."""
        raise NotImplementedError

    @classmethod
    def get_definition(cls) -> dict:
        """Return serializable metadata for API/frontend."""
        return {
            "type": cls.node_type,
            "label": cls.label,
            "description": cls.description,
            "input_ports": [asdict(p) for p in cls.input_ports],
            "output_ports": [asdict(p) for p in cls.output_ports],
        }
