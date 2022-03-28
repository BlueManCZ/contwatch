class Workflow:
    """Class representing workflow object"""

    def __init__(self):
        self.id = 0
        self.routines = []

    def set_id(self, workflow_id):
        self.id = workflow_id

    def add_routine(self, action):
        self.routines.append(action)

    def perform(self, payload=None):
        if payload is None:
            payload = []

        for routine in self.routines:
            routine.perform(payload)
