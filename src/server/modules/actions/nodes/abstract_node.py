class AbstractNode:
    type = None
    label = None
    description = None

    input_ports = []
    output_ports = []

    def __init__(self, context, node_settings=None):
        self.type = type(self).__name__.lower()
        self.context = context

        self.node_settings = {}
        self.input_connections = {}
        self.output_connections = {}

        if node_settings:
            self.load_node_settings(node_settings)

    def get_definition(self):
        return {
            "type": self.type,
            "label": self.label,
            "description": self.description,
            "inputs": [input_port(self.context).type for input_port in self.input_ports],
            "outputs": [output_port(self.context).type for output_port in self.output_ports],
        }

    def load_node_settings(self, node_settings):
        """Load node settings from a dictionary provided by Flume."""
        self.node_settings = node_settings

    def add_input_connection(self, port, connection):
        """Add an input connection to the node."""
        if not self.input_connections.get(port):
            self.input_connections[port] = []
        self.input_connections[port].append(connection)

    def add_output_connection(self, port, connection):
        """Add an output connection to the node."""
        if not self.output_connections.get(port):
            self.output_connections[port] = []
        self.output_connections[port].append(connection)

    def execute(self):
        """Execute the node."""
        pass

    def evaluate(self):
        """Evaluate the node."""
        pass
