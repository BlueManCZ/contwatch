from .abstract_routine import AbstractRoutine
from modules.core.helpers import create_event


class SendEvent(AbstractRoutine):
    """Routine for sending events to handlers"""

    type = "send_event"
    name = "Send event"
    config_fields = {
        "handler": ["handlerInstance", "Target handler"],
        "event-label": ["string", "Event label"],
        "unique-payload": ["bool", "Send only if payload changes", False]
    }
    last_payload = None

    def perform(self, payload):
        event = create_event(self.config("event-label"), payload)
        if not self.config("unique-payload") or self.last_payload != payload:
            if self.get_handler():
                self.last_payload = payload
                self.manager.send_message(self.config("handler"), event)
            else:
                return False
        return True

    def get_handler(self):
        return self.manager.get_handler(self.config("handler"))

    def get_description(self):
        if self.get_handler():
            return f"{self.get_handler().get_name()} - \"{self.config('event-label')}\""
        else:
            return "Please update routine configuration"
