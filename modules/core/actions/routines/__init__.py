from modules.core.actions.routines.send_event import SendEvent
from modules.core.actions.routines.perform_workflow import PerformWorkflow
from modules.core.actions.routines.condition import Condition
from modules.core.actions.routines.barrier import Barrier
from modules.core.actions.routines.payload_modifier import PayloadModifier

available_routines = [SendEvent, PerformWorkflow, Condition, Barrier, PayloadModifier]


def get_routine_class(routine_type):
    for routine in available_routines:
        if routine.type == routine_type:
            return routine
    return False
