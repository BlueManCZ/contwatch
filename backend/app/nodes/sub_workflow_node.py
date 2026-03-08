from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from app.nodes.base import AbstractNode

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.services.handler_manager import HandlerManager

logger = logging.getLogger(__name__)


class SubWorkflowNode(AbstractNode):
    label = "Sub-Workflow"
    description = "Executes a reusable sub-workflow"
    # Ports are dynamic — set per-instance based on referenced sub-workflow
    input_ports = ()
    output_ports = ()

    def __init__(
        self,
        node_id: str,
        data: dict,
        *,
        manager: HandlerManager | None = None,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
        sub_workflow_registry: dict[int, dict] | None = None,
        sub_workflow_id: int | None = None,
    ):
        super().__init__(node_id, data, manager=manager, session_factory=session_factory)
        self._sub_workflow_registry = sub_workflow_registry or {}
        self._sub_workflow_id = sub_workflow_id
        self._triggered_port: str | None = None

    def _get_sub_workflow_data(self) -> dict | None:
        if self._sub_workflow_id is None:
            return None
        return self._sub_workflow_registry.get(self._sub_workflow_id)

    def _build_sub_graph(self) -> tuple[Any, list[Any], list[Any]]:
        """Build a sub-graph and return (graph, input_nodes, output_nodes)."""
        from app.nodes.graph import NodeGraph
        from app.nodes.sub_workflow_input import SubWorkflowInput
        from app.nodes.sub_workflow_output import SubWorkflowOutput

        sw_data = self._get_sub_workflow_data()
        if not sw_data or not sw_data.get("graph"):
            raise RuntimeError(f"Sub-workflow {self._sub_workflow_id} has no graph")

        graph = NodeGraph(
            sw_data["graph"],
            manager=self.manager,
            session_factory=self.session_factory,
            sub_workflow_registry=self._sub_workflow_registry,
            is_sub_workflow=True,
        )

        input_nodes = [n for n in graph.nodes.values() if isinstance(n, SubWorkflowInput)]
        output_nodes = [n for n in graph.nodes.values() if isinstance(n, SubWorkflowOutput)]

        return graph, input_nodes, output_nodes

    def _bind_inputs(self, input_nodes: list) -> None:
        """Bind values from this node's input connections to sub-graph input nodes."""
        for input_node in input_nodes:
            port_name = input_node.data.get("name", "")
            if not port_name:
                continue
            # Only bind data inputs — skip event-only inputs whose upstream
            # nodes don't produce a value (they are handled in execute()).
            has_value_connection = bool(input_node.output_connections.get("value"))
            if not has_value_connection:
                continue
            # Pull value from our input connection matching this port name
            value = self.get_input(port_name)
            input_node.set_binding(value)

    def evaluate(self, source_handle: str | None = None):
        try:
            _, input_nodes, output_nodes = self._build_sub_graph()
        except RuntimeError:
            return None

        self._bind_inputs(input_nodes)

        # Find the output node matching the requested port name
        if source_handle:
            for output_node in output_nodes:
                if output_node.data.get("name") == source_handle:
                    return output_node.evaluate()

        # Fallback: return first output
        if output_nodes:
            return output_nodes[0].evaluate()
        return None

    async def execute(self) -> None:
        triggered = self._triggered_port
        self._triggered_port = None

        try:
            _, input_nodes, output_nodes = self._build_sub_graph()
        except RuntimeError:
            logger.warning("SubWorkflowNode %s: cannot build sub-graph", self.node_id)
            return

        self._bind_inputs(input_nodes)

        # Execute only the input node matching the triggered port
        for input_node in input_nodes:
            port_name = input_node.data.get("name", "")
            if port_name and port_name == triggered:
                await input_node.execute()

        # Propagate output events to our downstream connections
        for output_node in output_nodes:
            if output_node._event_fired:
                out_name = output_node.data.get("name", "")
                if out_name:
                    for downstream in self.output_connections.get(out_name, []):
                        await downstream.execute()
