class DeviceInterface:
    """Interface which specifies methods each device module should implement."""

    config = {}  # Dictionary containing device configuration.

    # Contains appropriate string if there is a need to refresh GUI.
    # Use add_changed() to append here.
    changed = []

    # Each device module should have these variables configured.

    type = ""  # Represents type of the device. For example for determining correct icon in GUI.
    config_fields = {}  # Dictionary of arguments required for initialization from GUI.

    # Don't touch these variables in code without serious reason. They are configurable through GUI.

    _label = ""  # Device label configurable via GUI.

    def update_config(self, new_config):
        """Update device configuration accordingly."""
        for attribute in new_config:
            self.config[attribute] = new_config[attribute]

    def add_changed(self, value):
        """
        Add appropriate string if there is a need to refresh GUI.
        ["overview", "devices", "data", "details"]
        """
        if value not in self.changed:
            self.changed.append(value)

    def add_storage_attribute(self, attribute):
        if "storage_attributes" not in self.config:
            self.config["storage_attributes"] = []
        if attribute not in self.config["storage_attributes"]:
            self.config["storage_attributes"].append(attribute)

    def get_storage_attributes(self):
        if "storage_attributes" in self.config:
            return self.config["storage_attributes"]
        return []

    def clear_storage_attributes(self):
        self.config["storage_attributes"] = []

    def set_label(self, label):
        self._label = label

    def get_label(self):
        return self._label

    def send_message(self, message):
        """Send the message to the device."""
        pass

    def ready_to_read(self):
        """Returns True if there is a message ready to read."""
        pass

    def read_message(self):
        """Read the oldest message from the message queue."""
        pass

    def is_connected(self):
        """Returns True if the device is connected and can communicate."""
        pass

    def reconnect(self):
        """Try to reconnect the device."""
        pass

    def exit(self):
        """Signal to disconnect from device and exit all threads."""
        pass
