"""Tests for workflow graph utility functions.

Covers: _find_cycle, detect_sub_workflow_recursion, _extract_sub_workflow_refs,
derive_sub_workflow_ports, _detect_port_type.
"""

import pytest

from app.nodes.graph import (
    PortTypeMismatchError,
    SubWorkflowRecursionError,
    _detect_port_type,
    _extract_sub_workflow_refs,
    _find_cycle,
    derive_sub_workflow_ports,
    detect_sub_workflow_recursion,
)

# ---------------------------------------------------------------------------
# _find_cycle
# ---------------------------------------------------------------------------


class TestFindCycle:
    def test_no_edges(self):
        assert _find_cycle({}, {"a", "b"}) is None

    def test_linear_chain(self):
        adj = {"a": ["b"], "b": ["c"]}
        assert _find_cycle(adj, {"a", "b", "c"}) is None

    def test_simple_cycle(self):
        adj = {"a": ["b"], "b": ["a"]}
        result = _find_cycle(adj, {"a", "b"})
        assert result in ("a", "b")

    def test_self_loop(self):
        adj = {"a": ["a"]}
        assert _find_cycle(adj, {"a"}) == "a"

    def test_diamond_no_cycle(self):
        adj = {"a": ["b", "c"], "b": ["d"], "c": ["d"]}
        assert _find_cycle(adj, {"a", "b", "c", "d"}) is None

    def test_cycle_in_subgraph(self):
        adj = {"a": ["b"], "b": ["c"], "c": ["b"], "d": ["e"]}
        result = _find_cycle(adj, {"a", "b", "c", "d", "e"})
        assert result in ("b", "c")

    def test_disconnected_components_no_cycle(self):
        adj = {"a": ["b"], "c": ["d"]}
        assert _find_cycle(adj, {"a", "b", "c", "d"}) is None

    def test_empty_start_nodes(self):
        adj = {"a": ["b"]}
        assert _find_cycle(adj, set()) is None

    def test_three_node_cycle(self):
        adj = {"a": ["b"], "b": ["c"], "c": ["a"]}
        result = _find_cycle(adj, {"a", "b", "c"})
        assert result in ("a", "b", "c")


# ---------------------------------------------------------------------------
# _extract_sub_workflow_refs
# ---------------------------------------------------------------------------


class TestExtractSubWorkflowRefs:
    def test_no_nodes(self):
        assert _extract_sub_workflow_refs({"nodes": []}) == []

    def test_no_sub_workflow_nodes(self):
        graph = {"nodes": [{"type": "handler_listener"}, {"type": "logger"}]}
        assert _extract_sub_workflow_refs(graph) == []

    def test_extracts_ids(self):
        graph = {
            "nodes": [
                {"type": "sub_workflow_1"},
                {"type": "handler_listener"},
                {"type": "sub_workflow_42"},
            ]
        }
        assert _extract_sub_workflow_refs(graph) == [1, 42]

    def test_missing_nodes_key(self):
        assert _extract_sub_workflow_refs({}) == []


# ---------------------------------------------------------------------------
# detect_sub_workflow_recursion
# ---------------------------------------------------------------------------


class TestDetectSubWorkflowRecursion:
    def test_no_sub_workflows(self):
        detect_sub_workflow_recursion({})  # should not raise

    def test_no_recursion(self):
        registry = {
            1: {"graph": {"nodes": [{"type": "handler_listener"}]}},
            2: {"graph": {"nodes": [{"type": "sub_workflow_1"}]}},
        }
        detect_sub_workflow_recursion(registry)  # should not raise

    def test_direct_self_recursion(self):
        registry = {
            1: {"graph": {"nodes": [{"type": "sub_workflow_1"}]}},
        }
        with pytest.raises(SubWorkflowRecursionError):
            detect_sub_workflow_recursion(registry)

    def test_indirect_recursion(self):
        registry = {
            1: {"graph": {"nodes": [{"type": "sub_workflow_2"}]}},
            2: {"graph": {"nodes": [{"type": "sub_workflow_1"}]}},
        }
        with pytest.raises(SubWorkflowRecursionError):
            detect_sub_workflow_recursion(registry)

    def test_three_level_recursion(self):
        registry = {
            1: {"graph": {"nodes": [{"type": "sub_workflow_2"}]}},
            2: {"graph": {"nodes": [{"type": "sub_workflow_3"}]}},
            3: {"graph": {"nodes": [{"type": "sub_workflow_1"}]}},
        }
        with pytest.raises(SubWorkflowRecursionError):
            detect_sub_workflow_recursion(registry)

    def test_main_graph_references_sub_workflow(self):
        registry = {
            1: {"graph": {"nodes": [{"type": "logger"}]}},
        }
        main_graph = {"nodes": [{"type": "sub_workflow_1"}]}
        detect_sub_workflow_recursion(registry, main_graph)  # should not raise

    def test_main_graph_causes_cycle(self):
        registry = {
            1: {"graph": {"nodes": [{"type": "sub_workflow_2"}]}},
            2: {"graph": {"nodes": [{"type": "sub_workflow_1"}]}},
        }
        main_graph = {"nodes": [{"type": "sub_workflow_1"}]}
        with pytest.raises(SubWorkflowRecursionError):
            detect_sub_workflow_recursion(registry, main_graph)

    def test_empty_graphs(self):
        registry = {
            1: {"graph": {"nodes": []}},
            2: {"graph": None},
            3: {},
        }
        detect_sub_workflow_recursion(registry)  # should not raise


# ---------------------------------------------------------------------------
# _detect_port_type
# ---------------------------------------------------------------------------


class TestDetectPortType:
    def test_no_edges(self):
        assert _detect_port_type("n1", "source", []) is None

    def test_no_matching_edges(self):
        edges = [{"source": "other", "sourceHandle": "event"}]
        assert _detect_port_type("n1", "source", edges) is None

    def test_event_source(self):
        edges = [{"source": "n1", "sourceHandle": "event"}]
        assert _detect_port_type("n1", "source", edges) == "event"

    def test_value_source(self):
        edges = [{"source": "n1", "sourceHandle": "value"}]
        assert _detect_port_type("n1", "source", edges) == "value"

    def test_event_target(self):
        edges = [{"target": "n1", "targetHandle": "event"}]
        assert _detect_port_type("n1", "target", edges) == "event"

    def test_value_target(self):
        edges = [{"target": "n1", "targetHandle": "value"}]
        assert _detect_port_type("n1", "target", edges) == "value"

    def test_multiple_same_type(self):
        edges = [
            {"source": "n1", "sourceHandle": "event"},
            {"source": "n1", "sourceHandle": "event"},
        ]
        assert _detect_port_type("n1", "source", edges) == "event"

    def test_mixed_types_raises(self):
        edges = [
            {"source": "n1", "sourceHandle": "event"},
            {"source": "n1", "sourceHandle": "value"},
        ]
        with pytest.raises(PortTypeMismatchError) as exc_info:
            _detect_port_type("n1", "source", edges)
        assert exc_info.value.node_id == "n1"

    def test_unknown_handle_ignored(self):
        edges = [{"source": "n1", "sourceHandle": "unknown"}]
        assert _detect_port_type("n1", "source", edges) is None

    def test_unknown_handle_with_known(self):
        edges = [
            {"source": "n1", "sourceHandle": "unknown"},
            {"source": "n1", "sourceHandle": "event"},
        ]
        assert _detect_port_type("n1", "source", edges) == "event"


# ---------------------------------------------------------------------------
# derive_sub_workflow_ports
# ---------------------------------------------------------------------------


def _make_graph(nodes: list[dict], edges: list[dict] | None = None) -> dict:
    return {"nodes": nodes, "edges": edges or []}


class TestDeriveSubWorkflowPorts:
    def test_empty_graph(self):
        inputs, outputs = derive_sub_workflow_ports(_make_graph([]))
        assert inputs == []
        assert outputs == []

    def test_input_port_event(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_input", "data": {"name": "trigger"}}],
            edges=[{"source": "n1", "sourceHandle": "event", "target": "n2", "targetHandle": "event"}],
        )
        inputs, outputs = derive_sub_workflow_ports(graph)
        assert inputs == [{"name": "trigger", "type": "event"}]
        assert outputs == []

    def test_output_port_value(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_output", "data": {"name": "result"}}],
            edges=[{"source": "n2", "sourceHandle": "value", "target": "n1", "targetHandle": "value"}],
        )
        inputs, outputs = derive_sub_workflow_ports(graph)
        assert inputs == []
        assert outputs == [{"name": "result", "type": "value"}]

    def test_mixed_input_output(self):
        graph = _make_graph(
            nodes=[
                {"id": "in1", "type": "sub_workflow_input", "data": {"name": "trigger"}},
                {"id": "out1", "type": "sub_workflow_output", "data": {"name": "result"}},
                {"id": "n3", "type": "logger", "data": {}},
            ],
            edges=[
                {"source": "in1", "sourceHandle": "event", "target": "n3", "targetHandle": "event"},
                {"source": "n3", "sourceHandle": "value", "target": "out1", "targetHandle": "value"},
            ],
        )
        inputs, outputs = derive_sub_workflow_ports(graph)
        assert inputs == [{"name": "trigger", "type": "event"}]
        assert outputs == [{"name": "result", "type": "value"}]

    def test_unconnected_input_excluded(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_input", "data": {"name": "unused"}}],
            edges=[],
        )
        inputs, _outputs = derive_sub_workflow_ports(graph)
        assert inputs == []

    def test_unnamed_input_excluded(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_input", "data": {"name": ""}}],
            edges=[{"source": "n1", "sourceHandle": "event", "target": "n2", "targetHandle": "event"}],
        )
        inputs, _outputs = derive_sub_workflow_ports(graph)
        assert inputs == []

    def test_no_name_key_excluded(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_input", "data": {}}],
            edges=[{"source": "n1", "sourceHandle": "event", "target": "n2", "targetHandle": "event"}],
        )
        inputs, _outputs = derive_sub_workflow_ports(graph)
        assert inputs == []

    def test_regular_nodes_ignored(self):
        graph = _make_graph(
            nodes=[
                {"id": "n1", "type": "handler_listener", "data": {"name": "should_ignore"}},
                {"id": "n2", "type": "logger", "data": {"name": "also_ignore"}},
            ],
            edges=[{"source": "n1", "sourceHandle": "event", "target": "n2", "targetHandle": "event"}],
        )
        inputs, outputs = derive_sub_workflow_ports(graph)
        assert inputs == []
        assert outputs == []

    def test_explicit_edges_data_parameter(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_input", "data": {"name": "in"}}],
            edges=[],  # graph has no edges
        )
        # But we pass edges explicitly
        explicit_edges = [{"source": "n1", "sourceHandle": "value", "target": "n2", "targetHandle": "value"}]
        inputs, _outputs = derive_sub_workflow_ports(graph, edges_data=explicit_edges)
        assert inputs == [{"name": "in", "type": "value"}]

    def test_mixed_types_raises(self):
        graph = _make_graph(
            nodes=[{"id": "n1", "type": "sub_workflow_input", "data": {"name": "bad"}}],
            edges=[
                {"source": "n1", "sourceHandle": "event", "target": "n2", "targetHandle": "event"},
                {"source": "n1", "sourceHandle": "value", "target": "n3", "targetHandle": "value"},
            ],
        )
        with pytest.raises(PortTypeMismatchError):
            derive_sub_workflow_ports(graph)
