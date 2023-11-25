from pony import orm

from modules.models.action import Action
from .abstract_node import AbstractNode
from ..ports import ActionPort, EventPort, HandlerPort


class ActionPerformer(AbstractNode):
    label = "Action Performer"
    description = "Performs an action"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [EventPort(context), HandlerPort(context), ActionPort(context)]

    @orm.db_session
    def execute(self):
        print("Performing action")
        handler_id = self.get_input("handler")
        action_id = self.get_input("action")
        if handler_id and action_id:
            handler = self.context.manager.registered_handlers.get(handler_id)
            action = Action.select(lambda a: a.id == action_id).first()
            if handler and action:
                handler.send_message({"label": action.message})
