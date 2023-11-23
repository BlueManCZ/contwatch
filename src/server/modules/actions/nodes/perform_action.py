from pony import orm

from modules.models.action import Action
from .abstract_node import AbstractNode
from ..ports import ActionPort, EventPort, HandlerPort


class PerformAction(AbstractNode):
    label = "Perform Action"
    description = "Performs an action"

    input_ports = [EventPort, HandlerPort, ActionPort]

    @orm.db_session
    def execute(self):
        print("Performing action")
        handler_id = self.node_settings.get("inputData", {}).get("handler", {}).get("select")
        action_id = self.node_settings.get("inputData", {}).get("action", {}).get("select")
        if handler_id and action_id:
            handler = self.context.manager.registered_handlers.get(handler_id)
            action = Action.select(lambda a: a.id == action_id).first()
            if handler and action:
                handler.send_message({"label": action.message})
