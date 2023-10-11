from time import sleep

from modules.tools import get_current_seconds


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

    # Each handler class can and should implement the following methods:

    def get_name(self):
        """Returns the standardized name of the handler for GUI."""
        return self.get_option("label", self.name)

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
        self.active = False

    # Default attributes and methods of each handler instance:

    options = {}
    """Dictionary containing handler settings options.
    It is serialized as a JSON to the database."""

    # changed = []
    # """Contains appropriate string if there is a need to refresh GUI.
    # Use add_changed() to append here."""

    def __init__(self, options):
        self.active = False
        self.options = options or {}
        self.message_queue = []
        self._id = None
        self._first_tick = True
        self._current_seconds = get_current_seconds()
        self._last_seconds = 0

    def get_options(self):
        return self.options

    def get_option(self, attribute, default=None):
        """Returns single setting option attribute value"""
        return self.get_options().get(attribute, default)

    def set_option(self, attribute, value):
        """Sets single setting option attribute value"""
        self.get_options()[attribute] = value

    def get_config(self):
        """Returns configuration form values"""
        return self.get_option("config", {})

    def set_config(self, new_config):
        """Update handler configuration accordingly."""
        if "config" not in self.get_options():
            self.set_option("config", {})
        for attribute in new_config:
            self.get_option("config")[attribute] = new_config[attribute]
        # self.add_changed("handlers")

    def get_config_option(self, attribute):
        """Returns single form configuration option value"""
        return self.get_config().get(attribute, None)

    # def add_changed(self, value):
    #     """
    #     Add appropriate string if there is a need to refresh GUI.
    #     ["overview", "inspector", "actions", "data", "handlers", "details"]
    #     """
    #     if value not in self.changed:
    #         self.changed.append(value)

    # def add_storage_attribute(self, attribute):
    #     if "storage-attributes" not in self.settings:
    #         self.settings["storage-attributes"] = []
    #     if attribute not in self.settings["storage-attributes"]:
    #         self.settings["storage-attributes"].append(attribute)

    # def get_storage_attributes(self):
    #     if "storage-attributes" in self.settings:
    #         return self.settings["storage-attributes"]
    #     return []
    #
    # def clear_storage_attributes(self):
    #     self.settings["storage-attributes"] = []

    # def set_label(self, label):
    #     self.set_option("label", label)

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

    def first_tick(self) -> bool:
        """Returns True only when called for the first time."""
        result = self._first_tick
        self._first_tick = False
        return result

    def wait_for_interval(self, interval):
        """Wait until current seconds % interval equals 0."""
        self._current_seconds = get_current_seconds()
        while self.active and (self._current_seconds % interval != 0 or self._current_seconds == self._last_seconds):
            self._current_seconds = get_current_seconds()
            sleep(0.1)

        self._last_seconds = self._current_seconds

    def get_id(self) -> int:
        return self._id

    def set_id(self, db_id: int):
        self._id = db_id
