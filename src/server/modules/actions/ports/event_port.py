from .abstract_port import AbstractPort
from .utils import Color


class EventPort(AbstractPort):
    name = "event"
    label = "Event"
    color = Color.YELLOW
