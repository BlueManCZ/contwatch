class AbstractControl:
    type = None
    name = None
    label = None

    def __init__(self):
        self.type = type(self).__name__.lower()

    def get_definition(self):
        pass
