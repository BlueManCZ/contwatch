class DeviceInterface:
    """Interface which specifies methods each device module should implement."""

    config = {}  # Dictionary containing device configuration.
    changed = False  # Set this to True if there is a need to refresh GUI.

    # Each device module should have these variables configured.

    type = ""  # Represents type of the device. For example for determining correct icon in GUI.
    fields = {}  # Dictionary of arguments required for initialization from GUI.

    # Do not touch these variables.

    label = ""  # Device label configurable via GUI.

    def update_config(self, new_config):
        """Update device configuration accordingly."""
        self.config = new_config

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
