from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

from app.nodes import NODES_MAP

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.nodes.base import AbstractNode
    from app.services.handler_manager import HandlerManager

_PASCAL_TO_SNAKE_RE = re.compile(r"(?<=[a-z0-9])([A-Z])")
_SUB_WORKFLOW_TYPE_RE = re.compile(r"^sub_workflow_(\d+)$")

logger = logging.getLogger(__name__)


class CycleDetectedError(Exception):
    def __init__(self, message: str, node_id: str):
        super().__init__(message)
        self.node_id = node_id


class SubWorkflowRecursionError(Exception):
    pass


class PortTypeMismatchError(Exception):
    """Raised when a SubWorkflowInput/Output node has conflicting connection types."""

    def __init__(self, message: str, node_id: str):
        super().__init__(message)
        self.node_id = node_id


class NodeGraph:
    """Builds and executes a workflow graph from ReactFlow-compatible JSON."""

    def __init__(
        self,
        data: dict,
        *,
        manager: HandlerManager | None = None,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
        sub_workflow_registry: dict[int, dict] | None = None,
        is_sub_workflow: bool = False,
    ):
        self._manager = manager
        self._session_factory = session_factory
        self._sub_workflow_registry = sub_workflow_registry or {}
        self._is_sub_workflow = is_sub_workflow
        self._nodes: dict[str, AbstractNode] = {}
        self._handler_listeners: dict[int, list[AbstractNode]] = {}  # handler_id -> listeners
        self._attribute_listeners: dict[int, list[AbstractNode]] = {}  # attribute_id -> listeners
        self._build(data)

    @property
    def nodes(self) -> dict[str, AbstractNode]:
        return self._nodes

    def _build(self, data: dict) -> None:
        nodes_data = data.get("nodes", [])
        edges_data = data.get("edges", [])

        # Instantiate nodes
        for node_data in nodes_data:
            node_type = node_data.get("type")
            node_id = node_data.get("id")
            node_payload = node_data.get("data", {})

            # Check for sub_workflow_{id} pattern
            sub_wf_match = _SUB_WORKFLOW_TYPE_RE.match(node_type) if node_type else None
            if sub_wf_match:
                from app.nodes.sub_workflow_node import SubWorkflowNode

                sub_wf_id = int(sub_wf_match.group(1))
                node = SubWorkflowNode(
                    node_id=node_id,
                    data=node_payload,
                    manager=self._manager,
                    session_factory=self._session_factory,
                    sub_workflow_registry=self._sub_workflow_registry,
                    sub_workflow_id=sub_wf_id,
                )
                self._nodes[node_id] = node
                continue

            # Normalize PascalCase types from legacy stored workflows
            if node_type and node_type not in NODES_MAP:
                node_type = _PASCAL_TO_SNAKE_RE.sub(r"_\1", node_type).lower()
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
            # Edge source metadata for debug display
            target_node.edge_sources[target_handle] = (source_id, source_handle)

        # Index listener nodes by their configured ID (only for main graphs)
        if not self._is_sub_workflow:
            from app.nodes.attribute_reader import AttributeReader
            from app.nodes.handler_listener import HandlerListener

            for node in self._nodes.values():
                if isinstance(node, HandlerListener):
                    handler_id = node.data.get("handler_id")
                    if handler_id is not None:
                        self._handler_listeners.setdefault(int(handler_id), []).append(node)
                elif isinstance(node, AttributeReader):
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

        for start in self._nodes:
            if start in visited:
                continue
            stack: list[tuple[str, int]] = [(start, 0)]
            while stack:
                node_id, idx = stack[-1]
                if idx == 0:
                    visited.add(node_id)
                    in_stack.add(node_id)
                neighbors = adj.get(node_id, [])
                if idx < len(neighbors):
                    stack[-1] = (node_id, idx + 1)
                    neighbor = neighbors[idx]
                    if neighbor in in_stack:
                        raise CycleDetectedError(f"Cycle detected involving node '{neighbor}'", node_id=neighbor)
                    if neighbor not in visited:
                        stack.append((neighbor, 0))
                else:
                    in_stack.discard(node_id)
                    stack.pop()

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


def detect_sub_workflow_recursion(
    sub_workflow_registry: dict[int, dict],
    main_graph_data: dict | None = None,
) -> None:
    """Detect recursive sub-workflow references across all graphs.

    Raises SubWorkflowRecursionError if a cycle is found.
    """
    # Build adjacency: node_key -> [referenced sub-workflow IDs]
    adj: dict[str, list[str]] = {}

    if main_graph_data:
        refs = _extract_sub_workflow_refs(main_graph_data)
        if refs:
            adj["__main__"] = [f"sw_{r}" for r in refs]

    for sw_id, sw_data in sub_workflow_registry.items():
        key = f"sw_{sw_id}"
        graph = sw_data.get("graph")
        if graph:
            refs = _extract_sub_workflow_refs(graph)
            if refs:
                adj[key] = [f"sw_{r}" for r in refs]

    # DFS cycle detection
    all_keys = set(adj.keys())
    for targets in adj.values():
        all_keys.update(targets)

    visited: set[str] = set()
    in_stack: set[str] = set()

    for start in all_keys:
        if start in visited:
            continue
        stack: list[tuple[str, int]] = [(start, 0)]
        while stack:
            key, idx = stack[-1]
            if idx == 0:
                visited.add(key)
                in_stack.add(key)
            neighbors = adj.get(key, [])
            if idx < len(neighbors):
                stack[-1] = (key, idx + 1)
                neighbor = neighbors[idx]
                if neighbor in in_stack:
                    raise SubWorkflowRecursionError(f"Recursive sub-workflow reference detected: {neighbor}")
                if neighbor not in visited:
                    stack.append((neighbor, 0))
            else:
                in_stack.discard(key)
                stack.pop()


def _extract_sub_workflow_refs(graph_data: dict) -> list[int]:
    """Extract sub-workflow IDs referenced by SubWorkflowNode instances in a graph."""
    refs = []
    for node in graph_data.get("nodes", []):
        node_type = node.get("type", "")
        match = _SUB_WORKFLOW_TYPE_RE.match(node_type)
        if match:
            refs.append(int(match.group(1)))
    return refs


def derive_sub_workflow_ports(
    graph_data: dict,
    edges_data: list[dict] | None = None,
) -> tuple[list[dict], list[dict]]:
    """Derive input/output port definitions from SubWorkflowInput/Output nodes.

    Returns (input_ports, output_ports) where each port is
    {"name": str, "type": "event"|"value"} derived from connected edge types.
    Only connected nodes are included.
    """
    if edges_data is None:
        edges_data = graph_data.get("edges", [])
    nodes_data = graph_data.get("nodes", [])

    # Map node_id -> node data
    node_map = {n["id"]: n for n in nodes_data}

    input_ports = []
    output_ports = []

    for node_data in nodes_data:
        node_type = node_data.get("type", "")
        node_id = node_data.get("id")
        name = node_data.get("data", {}).get("name", "")

        if not name:
            continue

        if node_type == "sub_workflow_input":
            # Find edges where this node is the source
            port_type = _infer_port_type_from_edges(node_id, "source", edges_data, node_map)
            if port_type:
                input_ports.append({"name": name, "type": port_type})

        elif node_type == "sub_workflow_output":
            # Find edges where this node is the target
            port_type = _infer_port_type_from_edges(node_id, "target", edges_data, node_map)
            if port_type:
                output_ports.append({"name": name, "type": port_type})

    return input_ports, output_ports


def _infer_port_type_from_edges(
    node_id: str,
    role: str,  # "source" or "target"
    edges_data: list[dict],
    node_map: dict[str, dict],
) -> str | None:
    """Infer port type (event/value) from what the Input/Output node is connected to.

    Returns None if not connected, raises PortTypeMismatchError if mixed types.
    """
    from app.nodes import NODES_MAP

    inferred: set[str] = set()

    for edge in edges_data:
        if edge.get(role) != node_id:
            continue

        # The other side of the connection
        other_role = "target" if role == "source" else "source"
        other_id = edge.get(other_role)
        other_handle = edge.get(f"{other_role}Handle", "")
        other_node_data = node_map.get(other_id)

        if not other_node_data:
            continue

        other_type = other_node_data.get("type", "")

        # Look up port definition from the other node's class
        # Handle sub_workflow_{id} types
        if _SUB_WORKFLOW_TYPE_RE.match(other_type):
            # Can't determine port type from dynamic sub-workflow nodes statically
            # Default to value
            inferred.add("value")
            continue

        cls = NODES_MAP.get(other_type)
        if not cls:
            continue

        # Find the port definition matching the handle
        ports = cls.input_ports if other_role == "target" else cls.output_ports
        for port_def in ports:
            if port_def.name == other_handle:
                # Map port type to event or value
                if port_def.type == "event":
                    inferred.add("event")
                else:
                    inferred.add("value")
                break

    if not inferred:
        return None

    if len(inferred) > 1:
        raise PortTypeMismatchError(
            f"Node '{node_id}' has connections to both event and value ports",
            node_id=node_id,
        )

    return inferred.pop()
