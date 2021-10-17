from modules.devices import *
from modules.logging.logger import logger
from modules.managers.data_manager import DataManager

from threading import Thread

import time


class DeviceManager:
    """Handles registration and communication of devices or fetchers"""

    def _device_watcher(self):
        while self.active:
            for device_id in self.registered_devices:
                device = self.registered_devices[device_id]
                if device.ready_to_read():
                    message = device.read_message()
                    # TODO: Maybe create a DataManager for advanced data processing
                    self.last_messages[device_id] = time.strftime("%H:%M:%S", time.localtime()), message
                    self.process_message(device_id, message)

                    # self.database.add_data_unit()

                    self.add_changed("overview")
                    # if device_id == 1:
                    #     self.registered_devices[2].send_message(message + ' C\n')
                    # TODO: Message handling here

            time.sleep(0.1)

    def __init__(self, database):
        self.database = database
        self.data_manager = DataManager(database)
        self.registered_devices = {}
        self.last_messages = {}
        self.active = True
        self.changed = []

        self.log = logger(f"Device manager")

        devices = database.get_devices()

        self.log.info(f"Loaded {len(devices)} devices from database")

        for device in devices:
            device_class = get_device_class(device.type)
            device_instance = device_class(device.config)
            device_instance.set_label(device.label)
            self.register_device(device_instance, device.id)

        Thread(target=self._device_watcher).start()

    def register_device(self, device, device_id):
        self.registered_devices[device_id] = device
        for p in ["overview", "devices"]:
            self.add_changed(p)

    def get_device(self, device_id):
        return self.registered_devices[device_id]

    def get_devices(self):
        return self.registered_devices

    def delete_device(self, device_id):
        self.registered_devices.pop(device_id)
        for p in ["overview", "devices"]:
            self.add_changed(p)

    def add_changed(self, value):
        if value not in self.changed:
            self.changed.append(value)

    def process_message(self, device_id, message):
        if isinstance(message, dict):
            # JSON
            print("JSON")
            print(message)
            for attribute in self.get_device(device_id).get_storage_attributes():
                if attribute in message:
                    self.data_manager.add_data_unit(attribute, message[attribute], device_id)
        else:
            # String
            print("String")
            print(message)

    def exit(self):
        for device in self.registered_devices:
            self.registered_devices[device].exit()
        self.active = False
        self.log.info(f"Terminating")
