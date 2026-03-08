from app.nodes.action_performer import ActionPerformer
from app.nodes.aggregator import Aggregator
from app.nodes.attribute_reader import AttributeReader
from app.nodes.base import AbstractNode
from app.nodes.condition import Condition
from app.nodes.display import Display
from app.nodes.evaluator import Evaluator
from app.nodes.handler_data_reader import HandlerDataReader
from app.nodes.handler_listener import HandlerListener
from app.nodes.logger_node import Logger
from app.nodes.negation import Negation
from app.nodes.sub_workflow_input import SubWorkflowInput
from app.nodes.sub_workflow_node import SubWorkflowNode
from app.nodes.sub_workflow_output import SubWorkflowOutput

# Standard nodes available in the main workflow
NODES: list[type[AbstractNode]] = [
    HandlerListener,
    AttributeReader,
    HandlerDataReader,
    Evaluator,
    Aggregator,
    Condition,
    Negation,
    Logger,
    Display,
    ActionPerformer,
]

# Nodes only available inside sub-workflows
SUB_WORKFLOW_NODES: list[type[AbstractNode]] = [
    SubWorkflowInput,
    SubWorkflowOutput,
]

# Nodes available in both contexts
SHARED_NODES: list[type[AbstractNode]] = [
    SubWorkflowNode,
]

NODES_MAP: dict[str, type[AbstractNode]] = {cls.node_type: cls for cls in NODES + SUB_WORKFLOW_NODES + SHARED_NODES}
