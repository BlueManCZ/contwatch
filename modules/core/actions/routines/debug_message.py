from .abstract_routine import AbstractRoutine


class DebugMessage(AbstractRoutine):
    """Routine for printing user message into terminal"""

    type = "debug_message"
    name = "Debug message"
    config_fields = {
        "message": ["string", "Message to print into terminal"],
    }

    def perform(self, payload):
        print(self.config("message"))
        return True

    def get_description(self):
        return f"\"{self.config('message')}\""
