from modules.engine.actions.routines.helpers.evaluation import eval_expr
from modules.engine.actions.routines.routine_interface import RoutineInterface

import re


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

    def replace_variables(self, string):
        result = string
        search = re.search(r"(\bhandler\..*\.[A-Z,a-z]*\b)", string)
        if search:
            for group in search.groups():
                _, handler_id, attribute = group.split(".")
                last_message = self.manager.last_messages[int(handler_id)]
                result = result.replace(group, str(last_message[1][attribute]))
        return result

    def parse_configuration(self, payload):
        rows = self.get_config()["configuration"].splitlines()

        for row in rows:
            left, right = row.split(" = ")
            index = int(left)

            right = self.replace_variables(right)

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
