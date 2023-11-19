from .abstract_control import AbstractControl


class Number(AbstractControl):
    name = "number"
    label = "Number"

    def get_definition(self):
        return {
            "type": self.type,
            "name": self.name,
            "label": self.label,
        }
