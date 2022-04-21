class RoutineInterface:
    """Interface which specifies methods each routine module should implement."""

    settings = {}  # Dictionary containing handler configuration. It is serialized as a JSON to the database.
    workflow = None  # Workflow parent
    position = 0  # Position in workflow
    id = 0

    # Each routine module should have these variables configured.

    type = ""  # Type of the routine.
    name = "Routine"  # Name of the routine.
    description = ""  # Description of the routine.
    config_fields = {}  # Dictionary of arguments required for initialization from GUI.

    def get_config(self):
        if "configuration" in self.settings:
            return self.settings["configuration"]
        return {}

    def update_config(self, new_config):
        """Update routine configuration accordingly."""
        if "configuration" not in self.settings:
            self.settings["configuration"] = {}
        for attribute in new_config:
            self.settings["configuration"][attribute] = new_config[attribute]

    def perform(self, payload):
        """Perform the routine on payload and return True if workflow should continue."""
        pass

    def get_name(self):
        """Returns name of the routine displayed in GUI."""
        return self.name

    def get_description(self):
        """Returns description of the routine displayed in GUI."""
        return self.description

    def set_id(self, database_id):
        self.id = database_id

    def set_position(self, position):
        self.position = position

    def set_workflow(self, workflow):
        self.workflow = workflow
