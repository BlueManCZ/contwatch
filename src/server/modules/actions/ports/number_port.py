from .abstract_port import AbstractPort
from ..controls import Number


class NumberPort(AbstractPort):
    name = "number"
    label = "Number"

    controls = [Number()]
