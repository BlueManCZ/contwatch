from .helpers.conditions import check_condition
from .abstract_routine import AbstractRoutine


class Condition(AbstractRoutine):
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

    def perform(self, payload):
        state = check_condition(self.config("condition"), payload, self.manager)
        if not self.config("once-in-row") or state != self.last_state:
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
        return self.manager.event_manager.get_workflow(self.config("if-workflow"))

    def get_else_workflow(self):
        return self.manager.event_manager.get_workflow(self.config("else-workflow"))

    def get_description(self):
        return self.get_config()["condition"]
