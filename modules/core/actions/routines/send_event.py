from modules.core.actions.routines.routine_interface import RoutineInterface
from modules.core.helpers import create_event


class SendEvent(RoutineInterface):
    """Routine for sending events to handlers"""

    type = "send_event"
    name = "Send event"
    config_fields = {
        "handler": ["handlerInstance", "Target handler"],
        "event-label": ["string", "Event label"],
        "unique-payload": ["bool", "Send only if payload changes", True]
    }
    last_payload = None

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def perform(self, payload):
        event = create_event(self.get_event_name(), payload)
        if not self.get_unique_payload() or self.last_payload != payload:
            self.last_payload = payload
            self.manager.send_message(self.get_config()["handler"], event)
        return True

    def get_handler(self):
        return self.manager.get_handler(self.get_config()["handler"])

    def get_event_name(self):
        return self.get_config()["event-label"]

    def get_unique_payload(self):
        return self.get_config()["unique-payload"]

    def get_description(self):
        return f"{self.get_handler().get_name()} - \"{self.get_event_name()}\""
