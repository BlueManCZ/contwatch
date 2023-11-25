from .action_performer import ActionPerformer
from .attribute_reader import AttributeReader
from .listener import Listener
from .logger import Logger

NODES = [ActionPerformer, AttributeReader, Listener, Logger]

NODES_MAP = {node.__name__.lower(): node for node in NODES}
