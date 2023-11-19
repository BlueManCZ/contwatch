from .abstract_control import AbstractControl


class Text(AbstractControl):
    name = "text"
    label = "Text"

    def get_definition(self):
        return {
            "type": self.type,
            "name": self.name,
            "label": self.label,
        }
