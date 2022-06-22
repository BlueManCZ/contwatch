class AbstractHandler:
    """Abstract class which specifies methods each handler class should implement."""

    # Each handler class should have the following variables configured:

    type = ""
    """Type of the handler"""

    name = "Unknown"
    """Name of the handler"""

    icon = "default"
    """Iconname of handler displayed in GUI"""

    config_fields = {}
    """Configuration form definition for initialization from GUI"""

    # Each handler class should implement the following methods:

    def get_description(self):
        """Returns description of the handler displayed in GUI."""
        return f"{self.type} handler"

    def send_message(self, message):
        """Send a message to the target."""
        pass

    def is_connected(self):
        """Returns True if the target is connected and can communicate."""
        return False

    def exit(self):
        """Signal to disconnect from target and exit all threads."""
        pass

    # Default attributes and methods of each handler instance:

    settings = {}
    """Dictionary containing handler configuration.
    It is serialized as a JSON to the database."""

    changed = []
    """Contains appropriate string if there is a need to refresh GUI.
    Use add_changed() to append here."""

    def __init__(self, settings):
        self.settings = settings
        self.message_queue = []

    def update_config(self, new_config):
        """Update handler configuration accordingly."""
        if "configuration" not in self.settings:
            self.settings["configuration"] = {}
        for attribute in new_config:
            self.settings["configuration"][attribute] = new_config[attribute]
        self.add_changed("handlers")

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

    def add_changed(self, value):
        """
        Add appropriate string if there is a need to refresh GUI.
        ["overview", "inspector", "actions", "data", "handlers", "details"]
        """
        if value not in self.changed:
            self.changed.append(value)

    def add_storage_attribute(self, attribute):
        if "storage-attributes" not in self.settings:
            self.settings["storage-attributes"] = []
        if attribute not in self.settings["storage-attributes"]:
            self.settings["storage-attributes"].append(attribute)

    def get_storage_attributes(self):
        if "storage-attributes" in self.settings:
            return self.settings["storage-attributes"]
        return []

    def clear_storage_attributes(self):
        self.settings["storage-attributes"] = []

    def set_label(self, label):
        self.settings["label"] = label

    def get_name(self):
        """Returns the standardized name of the handler for GUI."""
        if "label" in self.settings and self.settings["label"]:
            return self.settings["label"]
        return self.name

    def add_message(self, message):
        """Appends message to the message queue."""
        self.message_queue.append(message)

    def ready_to_read(self):
        """Returns True if there is a message ready to read."""
        return len(self.message_queue) > 0

    def read_message(self):
        """Returns the oldest message from the message queue."""
        if self.ready_to_read():
            return self.message_queue.pop(0)
        return None
