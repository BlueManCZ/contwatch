from threading import Thread
from time import sleep


class DeviceManager:
    """Handles registration and communication of devices or fetchers"""

    def _device_watcher(self):
        while self.active:
            for device_id in self.registered_devices:
                device = self.registered_devices[device_id]
                if device.ready_to_read():
                    message = device.read_message()
                    print(message)
                    if device_id == 1:
                        self.registered_devices[2].send_message(message + ' C\n')
                    # TODO: Message handling here
            sleep(0.1)

    def __init__(self):
        self.registered_devices = {}
        self.active = True
        Thread(target=self._device_watcher).start()

    def register_device(self, device, device_id):
        # TODO: device_id should be generated automatically
        self.registered_devices[device_id] = device

    def exit(self):
        for device in self.registered_devices:
            self.registered_devices[device].exit()
        self.active = False
