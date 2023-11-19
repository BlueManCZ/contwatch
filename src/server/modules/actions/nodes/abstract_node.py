class AbstractNode:
    type = None
    label = None
    description = None

    inputs = []
    outputs = []

    def __init__(self, context):
        self.type = type(self).__name__.lower()
        self.context = context

    def get_definition(self):
        return {
            "type": self.type,
            "label": self.label,
            "description": self.description,
            "inputs": [input_port(self.context).type for input_port in self.inputs],
            "outputs": [output_port(self.context).type for output_port in self.outputs],
        }
