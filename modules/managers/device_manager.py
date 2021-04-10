from threading import Thread


class DeviceManager:
    """Handles registration and communication of devices or fetchers"""

    def _device_watcher(self):
        while self.active:
            for device in self.registered_devices:
                if device.ready_to_read():
                    print(device.read_message())
                    # TODO: Message handling here

    def __init__(self):
        self.registered_devices = []
        self.active = True
        Thread(target=self._device_watcher).start()

    def register_device(self, device):
        self.registered_devices.append(device)

    def exit(self):
        for device in self.registered_devices:
            device.exit()
        self.active = False
