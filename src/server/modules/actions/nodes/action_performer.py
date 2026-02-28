from pony import orm

from modules.models.action import Action as ActionModel
from .abstract_node import AbstractNode
from ..ports import Action, Event, Handler


class ActionPerformer(AbstractNode):
    label = "Action Performer"
    description = "Performs an action"

    def __init__(self, context, node_settings=None):
        super().__init__(context, node_settings)
        self.input_ports = [Event(context), Handler(context), Action(context)]

    @orm.db_session
    def execute(self):
        print("Performing action")
        handler_id = self.get_input("Handler")
        action_id = self.get_input("Action")
        if handler_id and action_id:
            handler = self.context.manager.registered_handlers.get(handler_id)
            action = ActionModel.select(lambda a: a.id == action_id).first()
            if handler and action:
                handler.send_message({"label": action.message})
