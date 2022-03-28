class EventListener:
    """Class for binding workflows to specific events"""

    def __init__(self, event_label):
        self.id = 0
        self.label = event_label
        self.workflow = None

    def set_id(self, listener_id):
        self.id = listener_id

    def set_label(self, label):
        self.label = label

    def set_workflow(self, workflow):
        self.workflow = workflow

    def delete_workflow(self):
        self.workflow = None

    def trigger(self, payload=None):
        print(f"{self.label} triggered")

        if payload is None:
            payload = []

        if self.workflow:
            self.workflow.perform(payload)
