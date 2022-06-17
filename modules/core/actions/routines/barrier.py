from .abstract_routine import AbstractRoutine
from .helpers.conditions import check_condition


class Barrier(AbstractRoutine):
    """Routine for stopping workflow on condition"""

    type = "barrier"
    name = "Barrier"
    config_fields = {
        "condition": ["condition", "Stop workflow if"],
    }

    def perform(self, payload):
        condition = self.config("condition")
        return not check_condition(condition, payload, self.manager)

    def get_description(self):
        return self.config("condition")
