class Workflow:
    """Class representing workflow object"""

    def __init__(self, event_manager):
        self.id = 0
        self.routines = []
        self.event_manager = event_manager

    def get_id(self):
        return self.id

    def set_id(self, workflow_id):
        self.id = workflow_id

    def add_routine(self, action):
        self.routines.append(action)

    def perform(self, payload=None):
        if payload is None:
            payload = []

        for routine in self.routines:
            self.event_manager.routine_log.append([routine.id, payload.copy()])
            result = routine.perform(payload)
            if not result:
                return False
        return True
