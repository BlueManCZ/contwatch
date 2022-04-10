from modules.engine.actions.routines.helpers.conditions import check_condition
from modules.engine.actions.routines.routine_interface import RoutineInterface


class Condition(RoutineInterface):
    """Routine for testing condition and performing one of two branches"""

    type = "condition"
    name = "Condition"
    config_fields = {
        "condition": ["condition", "Condition"],
        "if-workflow": ["workflowInstance", "If true"],
        "else-workflow": ["workflowInstance", "Else"],
        "once-in-row": ["bool", "Trigger each branch once in a row", False]
    }
    last_state = None

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def perform(self, payload):
        condition = self.get_config()["condition"]

        state = check_condition(condition, payload, self.manager)
        if not self.get_once_in_row() or state != self.last_state:
            self.last_state = state
            if state:
                workflow = self.get_if_workflow()
                if workflow:
                    workflow.perform(payload)
            else:
                workflow = self.get_else_workflow()
                if workflow:
                    workflow.perform(payload)
        return True

    def get_if_workflow(self):
        return self.manager.event_manager.get_workflow(self.get_config()["if-workflow"])

    def get_else_workflow(self):
        return self.manager.event_manager.get_workflow(self.get_config()["else-workflow"])

    def get_once_in_row(self):
        return self.get_config()["once-in-row"]

    def get_description(self):
        return self.get_config()["condition"]
