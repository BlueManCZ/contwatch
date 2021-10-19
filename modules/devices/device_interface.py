class DeviceInterface:
    """Interface which specifies methods each device module should implement."""

    settings = {}  # Dictionary containing device configuration. It is serialized as a JSON to the database.

    # Contains appropriate string if there is a need to refresh GUI.
    # Use add_changed() to append here.
    changed = []

    # Each device module should have these variables configured.

    type = ""  # Represents type of the device. For example for determining correct icon in GUI.
    config_fields = {}  # Dictionary of arguments required for initialization from GUI.

    def update_config(self, new_config):
        """Update device configuration accordingly."""
        if "configuration" not in self.settings:
            self.settings["configuration"] = {}
        for attribute in new_config:
            self.settings["configuration"][attribute] = new_config[attribute]

    def get_config(self):
        if "configuration" in self.settings:
            return self.settings["configuration"]
        return {}

    def set_config_attribute(self, attribute, value):
        if "configuration" not in self.settings:
            self.settings["configuration"] = {}
        self.settings["configuration"][attribute] = value

    def get_config_attribute(self, attribute):
        if "configuration" in self.settings and attribute in self.settings["configuration"]:
            return self.settings["configuration"][attribute]
        return ""

    def add_changed(self, value):
        """
        Add appropriate string if there is a need to refresh GUI.
        ["overview", "devices", "data", "details"]
        """
        if value not in self.changed:
            self.changed.append(value)

    def add_storage_attribute(self, attribute):
        if "storage_attributes" not in self.settings:
            self.settings["storage_attributes"] = []
        if attribute not in self.settings["storage_attributes"]:
            self.settings["storage_attributes"].append(attribute)

    def get_storage_attributes(self):
        if "storage_attributes" in self.settings:
            return self.settings["storage_attributes"]
        return []

    def clear_storage_attributes(self):
        self.settings["storage_attributes"] = []

    def set_label(self, label):
        self.settings["label"] = label

    def get_label(self):
        if "label" in self.settings:
            return self.settings["label"]
        return ""

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
