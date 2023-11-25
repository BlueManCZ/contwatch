from .abstract_port import AbstractPort
from .utils import Color
from ..controls import Text


class ValuePort(AbstractPort):
    name = "value"
    label = "Value"
    color = Color.BLUE

    controls = [Text()]
