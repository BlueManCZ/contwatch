from .send_event import SendEvent
from .perform_workflow import PerformWorkflow
from .condition import Condition
from .barrier import Barrier
from .payload_modifier import PayloadModifier
from .debug_message import DebugMessage

available_routines = [SendEvent, PerformWorkflow, Condition, Barrier, PayloadModifier, DebugMessage]


def get_routine_class(routine_type):
    for routine in available_routines:
        if routine.type == routine_type:
            return routine
    return False
