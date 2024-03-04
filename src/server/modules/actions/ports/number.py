from .abstract_port import AbstractPort
from ..controls import Number as NumberControl


class Number(AbstractPort):
    label = "Number"

    controls = [NumberControl()]
