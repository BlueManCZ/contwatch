from .listener import Listener
from .perform_action import PerformAction

NODES = [Listener, PerformAction]

NODES_MAP = {node.__name__.lower(): node for node in NODES}
