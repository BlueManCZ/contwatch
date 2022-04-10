from modules.engine.actions.routines.helpers.conditions import check_condition
from modules.engine.actions.routines.routine_interface import RoutineInterface


class Barrier(RoutineInterface):
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
