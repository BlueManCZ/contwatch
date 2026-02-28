from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.nodes import NODES_MAP

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.nodes.base import AbstractNode
    from app.services.handler_manager import HandlerManager

logger = logging.getLogger(__name__)

MAX_EXECUTION_DEPTH = 100


class CycleDetectedError(Exception):
    pass


class NodeGraph:
    """Builds and executes a workflow graph from ReactFlow-compatible JSON."""

    def __init__(
        self,
        data: dict,
        *,
        manager: HandlerManager | None = None,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
    ):
        self._manager = manager
        self._session_factory = session_factory
        self._nodes: dict[str, AbstractNode] = {}
        self._handler_listeners: dict[int, list[AbstractNode]] = {}  # handler_id -> listeners
        self._attribute_listeners: dict[int, list[AbstractNode]] = {}  # attribute_id -> listeners
        self._build(data)

    def _build(self, data: dict) -> None:
        nodes_data = data.get("nodes", [])
        edges_data = data.get("edges", [])

        # Instantiate nodes
        for node_data in nodes_data:
            node_type = node_data.get("type")
            node_id = node_data.get("id")
            node_payload = node_data.get("data", {})

            cls = NODES_MAP.get(node_type)
            if not cls:
                logger.warning("Unknown node type '%s' for node '%s', skipping", node_type, node_id)
                continue

            node = cls(
                node_id=node_id,
                data=node_payload,
                manager=self._manager,
                session_factory=self._session_factory,
            )
            self._nodes[node_id] = node

        # Wire connections from edges
        for edge in edges_data:
            source_id = edge.get("source")
            target_id = edge.get("target")
            source_handle = edge.get("sourceHandle", "")
            target_handle = edge.get("targetHandle", "")

            source_node = self._nodes.get(source_id)
            target_node = self._nodes.get(target_id)

            if not source_node or not target_node:
                continue

            # Output connection: source_node.output_connections[source_handle] -> target_node
            source_node.output_connections.setdefault(source_handle, []).append(target_node)
            # Input connection: target_node.input_connections[target_handle] -> source_node
            target_node.input_connections.setdefault(target_handle, []).append(source_node)

        # Index listener nodes by their configured ID
        from app.nodes.attribute_reader_listener import AttributeReaderListener
        from app.nodes.handler_listener import HandlerListener

        for node in self._nodes.values():
            if isinstance(node, HandlerListener):
                handler_id = node.data.get("handler_id")
                if handler_id is not None:
                    self._handler_listeners.setdefault(int(handler_id), []).append(node)
            elif isinstance(node, AttributeReaderListener):
                attr_id = node.data.get("attribute_id")
                if attr_id is not None:
                    self._attribute_listeners.setdefault(int(attr_id), []).append(node)

        # Validate no cycles in event edges
        self._detect_cycles(edges_data)

        logger.info(
            "Workflow graph built: %d nodes, %d edges, %d handler listeners, %d attribute listeners",
            len(self._nodes),
            len(edges_data),
            sum(len(v) for v in self._handler_listeners.values()),
            sum(len(v) for v in self._attribute_listeners.values()),
        )

    def _detect_cycles(self, edges_data: list[dict]) -> None:
        """Detect cycles using DFS on all edges (event and value)."""
        adj: dict[str, list[str]] = {}
        for edge in edges_data:
            source = edge.get("source")
            target = edge.get("target")
            if source and target and source in self._nodes and target in self._nodes:
                adj.setdefault(source, []).append(target)

        visited: set[str] = set()
        in_stack: set[str] = set()

        def dfs(node_id: str) -> None:
            visited.add(node_id)
            in_stack.add(node_id)
            for neighbor in adj.get(node_id, []):
                if neighbor in in_stack:
                    raise CycleDetectedError(f"Cycle detected involving node '{neighbor}'")
                if neighbor not in visited:
                    dfs(neighbor)
            in_stack.discard(node_id)

        for node_id in self._nodes:
            if node_id not in visited:
                dfs(node_id)

    async def execute_handler_listeners(self, handler_id: int) -> None:
        """Execute all HandlerListener nodes matching the given handler_id."""
        listeners = self._handler_listeners.get(handler_id, [])
        for listener in listeners:
            try:
                await listener.execute()
            except Exception:
                logger.exception("[Workflow] Error executing HandlerListener '%s'", listener.node_id)

    async def execute_attribute_listeners(self, attribute_id: int) -> None:
        """Execute all AttributeReaderListener nodes matching the given attribute_id."""
        listeners = self._attribute_listeners.get(attribute_id, [])
        for listener in listeners:
            try:
                await listener.execute()
            except Exception:
                logger.exception("[Workflow] Error executing AttributeReaderListener '%s'", listener.node_id)
