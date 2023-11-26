from .action_port import ActionPort
from .aggregate_function import AggregateFunctionPort
from .attribute_port import AttributePort
from .event_port import EventPort
from .handler_port import HandlerPort
from .number_port import NumberPort
from .relational_operator import RelationalOperatorPort
from .value_port import ValuePort

PORTS = [
    ActionPort,
    AggregateFunctionPort,
    AttributePort,
    EventPort,
    HandlerPort,
    NumberPort,
    RelationalOperatorPort,
    ValuePort,
]
