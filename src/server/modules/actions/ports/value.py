from .abstract_port import AbstractPort
from .utils import Color
from ..controls import Text


class Value(AbstractPort):
    label = "Value"
    color = Color.BLUE

    controls = [Text()]
