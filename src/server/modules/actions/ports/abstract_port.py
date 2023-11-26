class AbstractPort:
    type = None
    name = None
    label = None
    color = None
    hide = False
    controls = []

    def __init__(self, context, name=None, label=None):
        self.type = type(self).__name__.lower()
        self.context = context
        self.name = name or self.name
        self.label = label or self.label

    def get_definition(self):
        return {
            "type": self.type,
            "name": self.name,
            "label": self.label,
            "hidePort": self.hide,
            "color": self.color,
            "controls": [control.get_definition() for control in self.controls],
        }
