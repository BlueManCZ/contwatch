from .barrier import Barrier
from .condition import Condition
from .debug_message import DebugMessage
from .payload_modifier import PayloadModifier
from .perform_workflow import PerformWorkflow
from .send_event import SendEvent

available_routines = [
    Condition,
    SendEvent,
    PayloadModifier,
    PerformWorkflow,
    Barrier,
    DebugMessage,
]


def get_routine_class(routine_type):
    for routine in available_routines:
        if routine.type == routine_type:
            return routine
    return False
