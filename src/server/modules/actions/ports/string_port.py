from .abstract_port import AbstractPort
from ..controls import Text


class StringPort(AbstractPort):
    name = "string"
    label = "String"

    controls = [Text()]
