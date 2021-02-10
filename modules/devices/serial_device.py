from modules.devices.device_interface import DeviceInterface

from threading import Thread
from time import sleep

import serial


class SerialDevice(DeviceInterface):
    """Class representing device connected by serial port."""

    active = False
    connection = None
    message_queue = []  # TODO: The list will be used in multiple threads

    def _message_watcher(self):
        while self.active:
            data = self.connection.readline()
            if data:
                self.message_queue.append(data)
            sleep(0.1)  # TODO: Probably not the best solution

    def __init__(self, *_, port, baudrate=9600, timeout=.1):
        self.connection = serial.Serial(port=port, baudrate=baudrate, timeout=timeout)
        self.active = True
        Thread(target=self._message_watcher).start()

    def send_message(self, message):
        self.connection.write(bytes(message))

    def ready_to_read(self):
        return len(self.message_queue) > 0

    def read_message(self):
        if len(self.message_queue) > 0:
            return bytes.decode(self.message_queue.pop(0))
        return None

    def exit(self):
        self.active = False
        self.connection.close()
