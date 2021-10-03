from modules.devices import *
from modules.logging.logger import logger

from threading import Thread

import json
import time


class DeviceManager:
    """Handles registration and communication of devices or fetchers"""

    def _device_watcher(self):
        while self.active:
            for device_id in self.registered_devices:
                device = self.registered_devices[device_id]
                if device.ready_to_read():
                    message = device.read_message()
                    print(message)
                    self.last_messages[device_id] = (time.strftime("%H:%M:%S", time.localtime())), message
                    self.changed = True
                    # if device_id == 1:
                    #     self.registered_devices[2].send_message(message + ' C\n')
                    # TODO: Message handling here
            time.sleep(0.1)

    def __init__(self, database):
        self.registered_devices = {}
        self.last_messages = {}
        self.active = True
        self.changed = False

        self.log = logger(f"Device manager")

        devices = database.get_devices()

        self.log.info(f"Loaded {len(devices)} devices from database")

        for device in devices:
            device_class = get_device_class(device.type)
            device_config = json.loads(device.config)
            device_instance = device_class(device_config)
            device_instance.label = device.label
            self.register_device(device_instance, device.id)

        Thread(target=self._device_watcher).start()

    def register_device(self, device, device_id):
        self.registered_devices[device_id] = device

    def get_device(self, device_id):
        return self.registered_devices[device_id]

    def get_devices(self):
        return self.registered_devices

    def delete_device(self, device_id):
        self.registered_devices.pop(device_id)

    def exit(self):
        for device in self.registered_devices:
            self.registered_devices[device].exit()
        self.active = False
        self.log.info(f"Terminating")
