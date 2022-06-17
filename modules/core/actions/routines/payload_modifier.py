from .abstract_routine import AbstractRoutine
from .helpers.conversions import replace_variables
from .helpers.evaluation import eval_expr


class PayloadModifier(AbstractRoutine):
    """Routine for modifying workflow payload"""

    type = "payload_modifier"
    name = "Payload modifier"
    config_fields = {
        "configuration": ["configuration", "Payload configuration"],
    }

    def parse_configuration(self, payload):
        rows = self.config("configuration").splitlines()

        for row in rows:
            parts = row.split(" = ")
            right = " = ".join(parts[1:])
            index = int(parts[0])

            right = replace_variables(right, payload, self.manager)

            if right[0] == '"' and right[-1] == '"':
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

            if value is not None:
                while len(payload) <= index:
                    payload.append(None)
                payload[index] = value

        return True

    def perform(self, payload):
        return self.parse_configuration(payload)

    def get_description(self):
        config = self.config("configuration")
        return config.splitlines()[0] if config else "Empty"
