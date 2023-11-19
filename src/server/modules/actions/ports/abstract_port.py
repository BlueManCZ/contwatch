class AbstractPort:
    type = None
    name = None
    label = None
    hide = False

    controls = []

    def __init__(self, context):
        self.type = type(self).__name__.lower()
        self.context = context

    def get_definition(self):
        return {
            "type": self.type,
            "name": self.name,
            "label": self.label,
            "hidePort": self.hide,
            "color": "red",
            "controls": [control.get_definition() for control in self.controls],
        }
