from modules.engine.actions.routines.send_event import SendEvent
from modules.engine.actions.routines.perform_workflow import PerformWorkflow

available_routines = [SendEvent, PerformWorkflow]


def get_routine_class(routine_type):
    for routine in available_routines:
        if routine.type == routine_type:
            return routine
    return False
