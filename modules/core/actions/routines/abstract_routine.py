class AbstractRoutine:
    """Abstract class which specifies methods each routine class should implement."""

    # Each routine class should have the following variables configured:

    type = ""
    """Type of the routine"""

    name = "Routine"
    """Name of the routine"""

    description = ""
    """Description of the routine"""

    config_fields = {}
    """Dictionary of arguments required for initialization from GUI"""

    # Each routine class should implement the following methods:

    def perform(self, payload):
        """Perform the routine on payload and return True if workflow should continue."""
        pass

    def get_description(self):
        """Returns description of the routine displayed in GUI."""
        return self.description

    # Default attributes and methods of each routine instance:

    settings = {}
    """Dictionary containing handler configuration.
    It is serialized as a JSON to the database."""

    workflow = None
    """Workflow parent"""

    position = 0
    """Position in workflow"""

    id = 0

    def __init__(self, settings, manager):
        self.settings = settings
        self.manager = manager

    def update_config(self, new_config):
        """Update routine configuration accordingly."""
        if "configuration" not in self.settings:
            self.settings["configuration"] = {}
        for attribute in new_config:
            self.settings["configuration"][attribute] = new_config[attribute]

    def get_config(self):
        """Returns configuration form values"""
        if "configuration" in self.settings:
            return self.settings["configuration"]
        return {}

    def config(self, attribute):
        """Returns single configuration form value"""
        if "configuration" in self.settings and attribute in self.get_config():
            return self.get_config()[attribute]
        return None

    def get_name(self):
        """Returns name of the routine displayed in GUI."""
        return self.name

    def set_id(self, database_id):
        self.id = database_id

    def set_position(self, position):
        self.position = position

    def set_workflow(self, workflow):
        self.workflow = workflow
