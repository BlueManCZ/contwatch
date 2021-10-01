from modules.devices.serial_device import SerialDevice
from modules.devices.http_device import HttpDevice

loaded_devices = [SerialDevice, HttpDevice]


def get_device_class(device_type):
    for device in loaded_devices:
        if device.type == device_type:
            return device
    return False
