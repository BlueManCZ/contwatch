from .abstract_port import AbstractPort
from .utils import Color


class Event(AbstractPort):
    label = "Event"
    color = Color.YELLOW
