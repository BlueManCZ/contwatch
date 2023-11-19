from .abstract_control import AbstractControl


class Select(AbstractControl):
    name = "select"
    label = "Select"

    def __init__(self, options):
        super().__init__()
        self.options = options

    def get_definition(self):
        return {
            "type": self.type,
            "name": self.name,
            "label": self.label,
            "options": [
                {
                    "label": option["label"],
                    "value": option["value"],
                }
                for option in self.options
            ],
        }
