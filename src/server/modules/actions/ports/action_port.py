from pony import orm

from modules.models.action import Action
from .abstract_port import AbstractPort
from ..controls import Select


class ActionPort(AbstractPort):
    name = "action"
    label = "Action"
    hide = True

    @orm.db_session
    def __init__(self, context, *args):
        super().__init__(context, *args)
        self.controls = [
            Select(
                [
                    {
                        "label": action.name,
                        "value": action.id,
                    }
                    for action in Action.select()
                ]
            )
        ]
