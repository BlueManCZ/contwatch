from modules.engine.actions.routines.routine_interface import RoutineInterface
from modules.engine.helpers import create_event


class SendEvent(RoutineInterface):
    """Routine for sending events to handlers"""

    type = "send_event"
    name = "Send event"
    config_fields = {
        "handler": ["handlerInstance", "Target handler"],
        "event_label": ["string", "Event label"],
    }

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def perform(self, payload):
        event = create_event(self.get_event_name(), payload)
        self.manager.send_message(self.get_config()["handler"], event)

    def get_handler(self):
        return self.manager.get_handler(self.get_config()["handler"])

    def get_event_name(self):
        return self.get_config()["event_label"]

    def get_description(self):
        return f"{self.get_handler().get_name()} - \"{self.get_event_name()}\""
