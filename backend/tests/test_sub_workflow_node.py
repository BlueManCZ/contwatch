"""Tests for SubWorkflowNode execution, binding, and event routing.

Covers: _bind_inputs, execute, evaluate — verifying that the correct
SubWorkflowInput node is triggered and that value bindings map to the
right ports.
"""

import pytest

from app.nodes.sub_workflow_node import SubWorkflowNode

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_sub_graph(nodes: list[dict], edges: list[dict] | None = None) -> dict:
    """Build a minimal ReactFlow-compatible graph JSON."""
    for n in nodes:
        n.setdefault("position", {"x": 0, "y": 0})
    return {"nodes": nodes, "edges": edges or []}


def _make_sw_node(
    sub_graph: dict,
    *,
    sw_id: int = 1,
    node_id: str = "sw1",
    data: dict | None = None,
) -> SubWorkflowNode:
    registry = {sw_id: {"graph": sub_graph}}
    return SubWorkflowNode(
        node_id=node_id,
        data=data or {},
        sub_workflow_registry=registry,
        sub_workflow_id=sw_id,
    )


class _DummyValueNode:
    """Minimal node that returns a fixed value on evaluate()."""

    def __init__(self, value: object):
        self._value = value

    def evaluate(self, source_handle: str | None = None):
        return self._value


# ---------------------------------------------------------------------------
# _bind_inputs
# ---------------------------------------------------------------------------


class TestBindInputs:
    """Tests for SubWorkflowNode._bind_inputs."""

    def test_skips_event_only_inputs(self):
        """Event-only SubWorkflowInputs (no value output connections) should not be bound."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "cond", "type": "condition", "data": {}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "event", "target": "cond", "targetHandle": "event"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        _, input_nodes, _ = sw._build_sub_graph()

        # Even if parent has a connection for "A", binding should be skipped
        sw.input_connections["A"] = [_DummyValueNode(99)]
        sw.edge_sources["A"] = ("up", "value")

        sw._bind_inputs(input_nodes)
        assert input_nodes[0]._binding is None

    def test_binds_value_inputs(self):
        """SubWorkflowInputs with value output connections should get bound."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "disp", "type": "display", "data": {}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "disp", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        _, input_nodes, _ = sw._build_sub_graph()

        sw.input_connections["A"] = [_DummyValueNode(42)]
        sw.edge_sources["A"] = ("up", "value")

        sw._bind_inputs(input_nodes)
        assert input_nodes[0]._binding == 42

    def test_binds_multiple_value_inputs_correctly(self):
        """Each value input should get the value from its own parent port, not another's."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "in_b", "type": "sub_workflow_input", "data": {"name": "B"}},
                {"id": "disp_a", "type": "display", "data": {}},
                {"id": "disp_b", "type": "display", "data": {}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "disp_a", "targetHandle": "value"},
                {"source": "in_b", "sourceHandle": "value", "target": "disp_b", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        _, input_nodes, _ = sw._build_sub_graph()

        sw.input_connections["A"] = [_DummyValueNode(10)]
        sw.input_connections["B"] = [_DummyValueNode(20)]
        sw.edge_sources["A"] = ("up_a", "value")
        sw.edge_sources["B"] = ("up_b", "value")

        sw._bind_inputs(input_nodes)
        bindings = {n.data["name"]: n._binding for n in input_nodes}
        assert bindings["A"] == 10
        assert bindings["B"] == 20

    def test_no_parent_connection_binds_none(self):
        """If parent has no connection for the port, binding should be None (from data fallback)."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "disp", "type": "display", "data": {}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "disp", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        _, input_nodes, _ = sw._build_sub_graph()
        # No input_connections set on parent
        sw._bind_inputs(input_nodes)
        assert input_nodes[0]._binding is None


# ---------------------------------------------------------------------------
# execute
# ---------------------------------------------------------------------------


class TestExecute:
    """Tests for SubWorkflowNode.execute."""

    @pytest.mark.asyncio
    async def test_triggers_only_matching_input(self):
        """Only the SubWorkflowInput matching _triggered_port should fire."""
        executed: list[str] = []

        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "in_b", "type": "sub_workflow_input", "data": {"name": "B"}},
            ],
            edges=[],
        )
        sw = _make_sw_node(sub_graph)
        sw._triggered_port = "A"

        # Patch _build_sub_graph to return nodes we can spy on
        original_build = sw._build_sub_graph

        def patched_build():
            graph, input_nodes, output_nodes = original_build()
            for n in input_nodes:
                name = n.data.get("name", "")
                original_exec = n.execute

                async def spy(n=name, orig=original_exec):
                    executed.append(n)
                    await orig()

                n.execute = spy
            return graph, input_nodes, output_nodes

        sw._build_sub_graph = patched_build
        await sw.execute()

        assert executed == ["A"]

    @pytest.mark.asyncio
    async def test_no_triggered_port_fires_nothing(self):
        """If _triggered_port is None, no SubWorkflowInput should fire."""
        executed: list[str] = []

        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
            ],
            edges=[],
        )
        sw = _make_sw_node(sub_graph)
        sw._triggered_port = None

        original_build = sw._build_sub_graph

        def patched_build():
            graph, input_nodes, output_nodes = original_build()
            for n in input_nodes:
                name = n.data.get("name", "")

                async def spy(n=name):
                    executed.append(n)

                n.execute = spy
            return graph, input_nodes, output_nodes

        sw._build_sub_graph = patched_build
        await sw.execute()

        assert executed == []

    @pytest.mark.asyncio
    async def test_output_event_propagation(self):
        """Output events from the sub-graph should propagate to downstream connections."""
        downstream_executed = False

        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "out_x", "type": "sub_workflow_output", "data": {"name": "X"}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "event", "target": "out_x", "targetHandle": "event"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        sw._triggered_port = "A"

        class FakeDownstream:
            async def execute(self):
                nonlocal downstream_executed
                downstream_executed = True

        sw.output_connections["X"] = [FakeDownstream()]
        await sw.execute()

        assert downstream_executed

    @pytest.mark.asyncio
    async def test_binds_values_before_executing(self):
        """Value bindings should be set before the triggered input executes."""
        captured_binding = [None]

        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "disp", "type": "display", "data": {}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "disp", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        sw._triggered_port = "A"
        sw.input_connections["A"] = [_DummyValueNode(99)]
        sw.edge_sources["A"] = ("up", "value")

        original_build = sw._build_sub_graph

        def patched_build():
            graph, input_nodes, output_nodes = original_build()
            for n in input_nodes:
                original_exec = n.execute

                async def spy(node=n, orig=original_exec):
                    captured_binding[0] = node._binding
                    await orig()

                n.execute = spy
            return graph, input_nodes, output_nodes

        sw._build_sub_graph = patched_build
        await sw.execute()

        assert captured_binding[0] == 99


# ---------------------------------------------------------------------------
# evaluate
# ---------------------------------------------------------------------------


class TestEvaluate:
    """Tests for SubWorkflowNode.evaluate (value pull path)."""

    def test_returns_matching_output(self):
        """evaluate(source_handle) should return the correct output node's value."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "out_x", "type": "sub_workflow_output", "data": {"name": "X"}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "out_x", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        sw.input_connections["A"] = [_DummyValueNode(42)]
        sw.edge_sources["A"] = ("up", "value")

        result = sw.evaluate("X")
        assert result == 42

    def test_returns_correct_output_with_multiple(self):
        """With multiple outputs, the right one should be selected by source_handle."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "in_b", "type": "sub_workflow_input", "data": {"name": "B"}},
                {"id": "out_x", "type": "sub_workflow_output", "data": {"name": "X"}},
                {"id": "out_y", "type": "sub_workflow_output", "data": {"name": "Y"}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "out_x", "targetHandle": "value"},
                {"source": "in_b", "sourceHandle": "value", "target": "out_y", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        sw.input_connections["A"] = [_DummyValueNode(10)]
        sw.input_connections["B"] = [_DummyValueNode(20)]
        sw.edge_sources["A"] = ("up_a", "value")
        sw.edge_sources["B"] = ("up_b", "value")

        assert sw.evaluate("X") == 10
        assert sw.evaluate("Y") == 20

    def test_fallback_to_first_output(self):
        """Without source_handle, should return the first output."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "out_x", "type": "sub_workflow_output", "data": {"name": "X"}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "out_x", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        sw.input_connections["A"] = [_DummyValueNode(7)]
        sw.edge_sources["A"] = ("up", "value")

        result = sw.evaluate(None)
        assert result == 7

    def test_no_graph_returns_none(self):
        """If sub-workflow has no graph, evaluate returns None."""
        registry = {1: {}}
        sw = SubWorkflowNode("sw1", {}, sub_workflow_registry=registry, sub_workflow_id=1)
        assert sw.evaluate("X") is None

    def test_evaluate_chains_through_evaluator(self):
        """Values bound via _bind_inputs should flow through internal evaluator nodes."""
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "in_b", "type": "sub_workflow_input", "data": {"name": "B"}},
                {"id": "eval", "type": "evaluator", "data": {"operator": ">"}},
                {"id": "out_r", "type": "sub_workflow_output", "data": {"name": "result"}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "eval", "targetHandle": "first_value"},
                {"source": "in_b", "sourceHandle": "value", "target": "eval", "targetHandle": "second_value"},
                {"source": "eval", "sourceHandle": "value", "target": "out_r", "targetHandle": "value"},
            ],
        )
        sw = _make_sw_node(sub_graph)
        sw.input_connections["A"] = [_DummyValueNode(10)]
        sw.input_connections["B"] = [_DummyValueNode(5)]
        sw.edge_sources["A"] = ("up_a", "value")
        sw.edge_sources["B"] = ("up_b", "value")

        # 10 > 5 → True
        assert sw.evaluate("result") is True


# ---------------------------------------------------------------------------
# Full integration: main graph with sub-workflow node
# ---------------------------------------------------------------------------


class TestMainGraphWithSubWorkflow:
    """Integration tests using NodeGraph to build a main graph containing a sub-workflow node."""

    @pytest.mark.asyncio
    async def test_two_event_inputs_correct_routing(self):
        """Two separate event edges to different sub-workflow inputs should each
        trigger only their respective internal path."""
        from app.nodes.graph import NodeGraph

        # Sub-workflow: two inputs leading to two separate condition nodes
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_enable", "type": "sub_workflow_input", "data": {"name": "enable"}},
                {"id": "in_disable", "type": "sub_workflow_input", "data": {"name": "disable"}},
                {"id": "cond_en", "type": "condition", "data": {}},
                {"id": "cond_dis", "type": "condition", "data": {}},
            ],
            edges=[
                {"source": "in_enable", "sourceHandle": "event", "target": "cond_en", "targetHandle": "event"},
                {"source": "in_disable", "sourceHandle": "event", "target": "cond_dis", "targetHandle": "event"},
            ],
        )

        sub_workflow_registry = {1: {"graph": sub_graph}}

        # Main graph: two listeners → sub_workflow (different ports)
        main_graph = _make_sub_graph(
            nodes=[
                {"id": "hl1", "type": "handler_listener", "data": {"handler_id": 1}},
                {"id": "hl2", "type": "handler_listener", "data": {"handler_id": 2}},
                {"id": "sw", "type": "sub_workflow_1", "data": {}},
            ],
            edges=[
                {"source": "hl1", "sourceHandle": "event", "target": "sw", "targetHandle": "enable"},
                {"source": "hl2", "sourceHandle": "event", "target": "sw", "targetHandle": "disable"},
            ],
        )

        graph = NodeGraph(main_graph, sub_workflow_registry=sub_workflow_registry)

        # Verify proxy wiring

        hl1_targets = graph.nodes["hl1"].output_connections["event"]
        hl2_targets = graph.nodes["hl2"].output_connections["event"]
        assert hl1_targets[0].port == "enable"
        assert hl2_targets[0].port == "disable"

    def test_value_binding_full_chain(self):
        """Two value inputs in main graph → sub-workflow → two outputs. Verify values don't swap."""
        from app.nodes.graph import NodeGraph

        # Sub-workflow: passthrough A→X and B→Y
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_a", "type": "sub_workflow_input", "data": {"name": "A"}},
                {"id": "in_b", "type": "sub_workflow_input", "data": {"name": "B"}},
                {"id": "out_x", "type": "sub_workflow_output", "data": {"name": "X"}},
                {"id": "out_y", "type": "sub_workflow_output", "data": {"name": "Y"}},
            ],
            edges=[
                {"source": "in_a", "sourceHandle": "value", "target": "out_x", "targetHandle": "value"},
                {"source": "in_b", "sourceHandle": "value", "target": "out_y", "targetHandle": "value"},
            ],
        )

        sub_workflow_registry = {1: {"graph": sub_graph}}

        # Main graph: two evaluators (producing known values) → sub_workflow → two displays
        main_graph = _make_sub_graph(
            nodes=[
                {
                    "id": "eval_a",
                    "type": "evaluator",
                    "data": {"first_value": "10", "operator": ">", "second_value": "5"},
                },
                {
                    "id": "eval_b",
                    "type": "evaluator",
                    "data": {"first_value": "3", "operator": ">", "second_value": "7"},
                },
                {"id": "sw", "type": "sub_workflow_1", "data": {}},
                {"id": "disp_x", "type": "display", "data": {}},
                {"id": "disp_y", "type": "display", "data": {}},
            ],
            edges=[
                {"source": "eval_a", "sourceHandle": "value", "target": "sw", "targetHandle": "A"},
                {"source": "eval_b", "sourceHandle": "value", "target": "sw", "targetHandle": "B"},
                {"source": "sw", "sourceHandle": "X", "target": "disp_x", "targetHandle": "value"},
                {"source": "sw", "sourceHandle": "Y", "target": "disp_y", "targetHandle": "value"},
            ],
        )

        graph = NodeGraph(main_graph, sub_workflow_registry=sub_workflow_registry)

        # Pull values through the chain
        val_x = graph.nodes["disp_x"].get_input("value")
        val_y = graph.nodes["disp_y"].get_input("value")

        # A (10>5=True) → X, B (3>7=False) → Y
        assert val_x is True, f"Expected True for X (from A=10>5), got {val_x}"
        assert val_y is False, f"Expected False for Y (from B=3>7), got {val_y}"

    @pytest.mark.asyncio
    async def test_mixed_event_and_value_inputs(self):
        """Event input triggers execution; separate value input provides data to internal nodes.

        Sub-workflow:
            trigger_A (event) ──event──▶ Condition ──true_event──▶ Output "fired"
            data_A    (value) ──value──▶ Condition
            trigger_B (event) ──event──▶ Condition2 ──true_event──▶ Output "fired_b"
            data_B    (value) ──value──▶ Condition2

        When trigger_A fires and data_A=True, only the top Condition fires true_event.
        """

        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_trig_a", "type": "sub_workflow_input", "data": {"name": "trigger_A"}},
                {"id": "in_data_a", "type": "sub_workflow_input", "data": {"name": "data_A"}},
                {"id": "cond_a", "type": "condition", "data": {}},
                {"id": "out_a", "type": "sub_workflow_output", "data": {"name": "fired_A"}},
                {"id": "in_trig_b", "type": "sub_workflow_input", "data": {"name": "trigger_B"}},
                {"id": "in_data_b", "type": "sub_workflow_input", "data": {"name": "data_B"}},
                {"id": "cond_b", "type": "condition", "data": {}},
                {"id": "out_b", "type": "sub_workflow_output", "data": {"name": "fired_B"}},
            ],
            edges=[
                # Path A: trigger_A event → cond_a, data_A value → cond_a
                {"source": "in_trig_a", "sourceHandle": "event", "target": "cond_a", "targetHandle": "event"},
                {"source": "in_data_a", "sourceHandle": "value", "target": "cond_a", "targetHandle": "value"},
                {"source": "cond_a", "sourceHandle": "true_event", "target": "out_a", "targetHandle": "event"},
                # Path B: trigger_B event → cond_b, data_B value → cond_b
                {"source": "in_trig_b", "sourceHandle": "event", "target": "cond_b", "targetHandle": "event"},
                {"source": "in_data_b", "sourceHandle": "value", "target": "cond_b", "targetHandle": "value"},
                {"source": "cond_b", "sourceHandle": "true_event", "target": "out_b", "targetHandle": "event"},
            ],
        )

        sub_workflow_registry = {1: {"graph": sub_graph}}

        # Build SubWorkflowNode manually (outside a full main graph) to control inputs
        sw = SubWorkflowNode(
            "sw1",
            {},
            sub_workflow_registry=sub_workflow_registry,
            sub_workflow_id=1,
        )

        # Parent connections: event inputs from conditions, value inputs from evaluators
        sw.input_connections["data_A"] = [_DummyValueNode(True)]
        sw.input_connections["data_B"] = [_DummyValueNode(False)]
        sw.edge_sources["data_A"] = ("eval_a", "value")
        sw.edge_sources["data_B"] = ("eval_b", "value")

        # Track which outputs fire
        fired_outputs: list[str] = []

        class OutputTracker:
            def __init__(self, name: str):
                self._name = name

            async def execute(self):
                fired_outputs.append(self._name)

        sw.output_connections["fired_A"] = [OutputTracker("fired_A")]
        sw.output_connections["fired_B"] = [OutputTracker("fired_B")]

        # Trigger A — data_A=True so condition should fire true_event → output fired_A
        sw._triggered_port = "trigger_A"
        await sw.execute()

        assert fired_outputs == ["fired_A"], (
            f"Expected only fired_A, got {fired_outputs}. data_A binding may not have been set correctly."
        )

    @pytest.mark.asyncio
    async def test_both_conditions_fire_to_same_sub_workflow(self):
        """When two conditions both fire events to different ports of the same
        sub-workflow node, both internal paths execute (second overwrites first)."""
        from app.nodes.graph import NodeGraph

        fired: list[str] = []

        # Sub-workflow with two event inputs, each connected to its own output
        sub_graph = _make_sub_graph(
            nodes=[
                {"id": "in_enable", "type": "sub_workflow_input", "data": {"name": "enable"}},
                {"id": "in_disable", "type": "sub_workflow_input", "data": {"name": "disable"}},
                {"id": "out_en", "type": "sub_workflow_output", "data": {"name": "enabled"}},
                {"id": "out_dis", "type": "sub_workflow_output", "data": {"name": "disabled"}},
            ],
            edges=[
                {"source": "in_enable", "sourceHandle": "event", "target": "out_en", "targetHandle": "event"},
                {"source": "in_disable", "sourceHandle": "event", "target": "out_dis", "targetHandle": "event"},
            ],
        )

        sub_workflow_registry = {1: {"graph": sub_graph}}

        # Main graph: handler_listener → two conditions → same sub_workflow (different ports)
        # Top condition always fires true_event (value=True, no switch)
        # Bottom condition fires false_event (value=False, switch=first fire)
        main_graph = _make_sub_graph(
            nodes=[
                {"id": "hl", "type": "handler_listener", "data": {"handler_id": 1}},
                {
                    "id": "eval_true",
                    "type": "evaluator",
                    "data": {"first_value": "1", "operator": ">", "second_value": "0"},
                },
                {
                    "id": "eval_false",
                    "type": "evaluator",
                    "data": {"first_value": "0", "operator": ">", "second_value": "1"},
                },
                {"id": "cond_top", "type": "condition", "data": {}},
                {"id": "cond_bot", "type": "condition", "data": {}},
                {"id": "sw", "type": "sub_workflow_1", "data": {}},
            ],
            edges=[
                # Handler listener fires both conditions
                {"source": "hl", "sourceHandle": "event", "target": "cond_top", "targetHandle": "event"},
                {"source": "hl", "sourceHandle": "event", "target": "cond_bot", "targetHandle": "event"},
                # Evaluators provide values
                {"source": "eval_true", "sourceHandle": "value", "target": "cond_top", "targetHandle": "value"},
                {"source": "eval_false", "sourceHandle": "value", "target": "cond_bot", "targetHandle": "value"},
                # Top condition true → enable, Bottom condition false → disable
                {"source": "cond_top", "sourceHandle": "true_event", "target": "sw", "targetHandle": "enable"},
                {"source": "cond_bot", "sourceHandle": "false_event", "target": "sw", "targetHandle": "disable"},
            ],
        )

        graph = NodeGraph(main_graph, sub_workflow_registry=sub_workflow_registry)

        # Track which sub-workflow outputs fire
        sw_node = graph.nodes["sw"]

        class Tracker:
            def __init__(self, name: str):
                self._name = name

            async def execute(self):
                fired.append(self._name)

        sw_node.output_connections["enabled"] = [Tracker("enabled")]
        sw_node.output_connections["disabled"] = [Tracker("disabled")]

        # Fire the handler listener
        await graph.execute_handler_listeners(1)

        # BOTH conditions fire: top=True→true_event→enable, bottom=False→false_event→disable
        # So BOTH sub-workflow paths execute!
        assert "enabled" in fired, "Expected 'enable' path to fire"
        assert "disabled" in fired, "Expected 'disable' path to also fire (both conditions active)"
        assert len(fired) == 2, f"Expected exactly 2 fires, got {fired}"
