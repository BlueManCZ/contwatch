from modules.core.actions.routines.helpers.conditions import check_condition
from modules.core.actions.routines.abstract_routine import AbstractRoutine


class Barrier(AbstractRoutine):
    """Routine for stopping workflow on condition"""

    type = "barrier"
    name = "Barrier"
    config_fields = {
        "condition": ["condition", "Stop workflow if"],
    }

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def perform(self, payload):
        condition = self.get_config()["condition"]
        return not check_condition(condition, payload, self.manager)

    def get_description(self):
        return self.get_config()["condition"]
