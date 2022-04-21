from modules.core.actions.routines.routine_interface import RoutineInterface


class PerformWorkflow(RoutineInterface):
    """Routine for performing workflow"""

    type = "perform_workflow"
    name = "Workflow"
    config_fields = {
        "workflow": ["workflowInstance", "Target workflow"],
    }

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def perform(self, payload):
        self.get_workflow().perform(payload)
        return True

    def get_workflow(self):
        return self.manager.event_manager.get_workflow(self.get_config()["workflow"])

    def get_event_name(self):
        return self.get_config()["event_label"]

    def get_description(self):
        return f"Perform workflow {self.get_workflow().id}"
