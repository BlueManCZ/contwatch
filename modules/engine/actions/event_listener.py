class EventListener:
    """Class for binding workflows to specific events"""

    def __init__(self, handler_id, event_label):
        self.id = 0
        self.handler_id = handler_id
        self.label = event_label
        self.workflow = None
        self.data_listener_status = False

    def get_id(self):
        return self.id

    def set_id(self, listener_id):
        self.id = listener_id

    def get_handler_id(self):
        return self.handler_id

    def set_handler_id(self, handler_id):
        self.handler_id = handler_id

    def get_label(self):
        return self.label

    def set_label(self, label):
        self.label = label

    def set_workflow(self, workflow):
        self.workflow = workflow

    def delete_workflow(self):
        self.workflow = None

    def get_data_listener_status(self):
        return self.data_listener_status

    def set_data_listener_status(self, status):
        self.data_listener_status = status

    def trigger(self, payload=None):
        print(f"{self.label} triggered")

        if payload is None:
            payload = []

        if self.workflow:
            self.workflow.perform(payload)
