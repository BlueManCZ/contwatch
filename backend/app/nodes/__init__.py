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

NODES_MAP: dict[str, type[AbstractNode]] = {cls.node_type: cls for cls in NODES}
