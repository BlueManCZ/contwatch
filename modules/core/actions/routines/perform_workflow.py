from .abstract_routine import AbstractRoutine


class PerformWorkflow(AbstractRoutine):
    """Routine for performing workflow"""

    type = "perform_workflow"
    name = "Workflow"
    config_fields = {
        "workflow": ["workflowInstance", "Target workflow"],
    }

    def perform(self, payload):
        self.get_workflow().perform(payload)
        return True

    def get_workflow(self):
        return self.manager.event_manager.get_workflow(self.config("workflow"))

    def get_event_name(self):
        return self.config("event_label")

    def get_description(self):
        return f"Perform workflow {self.get_workflow().id}"
