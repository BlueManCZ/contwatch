from modules.engine.actions.routines.helpers.conversions import replace_variables
from modules.engine.actions.routines.helpers.evaluation import eval_expr
from modules.engine.actions.routines.routine_interface import RoutineInterface


class PayloadModifier(RoutineInterface):
    """Routine for modifying workflow payload"""

    type = "payload_modifier"
    name = "Payload modifier"
    config_fields = {
        "configuration": ["configuration", "Payload configuration"],
    }

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def parse_configuration(self, payload):
        rows = self.get_config()["configuration"].splitlines()

        for row in rows:
            left, right = row.split(" = ")
            index = int(left)

            right = replace_variables(right, payload, self.manager)

            if right[0] == "\"" and right[-1] == "\"":
                value = right[1:-1]
            else:
                try:
                    value = eval_expr(right)
                except SyntaxError as error:
                    print(error)
                    return False
                except TypeError as error:
                    print(error)
                    return False

            if value:
                while len(payload) <= index:
                    payload.append(None)
                payload[index] = value

        print(payload)
        return True

    def perform(self, payload):
        return self.parse_configuration(payload)

    def get_description(self):
        return "Payload modifier"
