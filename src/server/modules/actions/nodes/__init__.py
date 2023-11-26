from .action_performer import ActionPerformer
from .aggregator import Aggregator
from .attribute_reader import AttributeReader
from .condition import Condition
from .evaluator import Evaluator
from .listener import Listener
from .logger import Logger
from .negation import Negation

NODES = [
    ActionPerformer,
    Aggregator,
    AttributeReader,
    Condition,
    Evaluator,
    Listener,
    Logger,
    Negation,
]

NODES_MAP = {node.__name__.lower(): node for node in NODES}
