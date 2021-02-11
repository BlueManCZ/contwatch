from .device_interface import DeviceInterface
from ..log import logger

from threading import Thread
from time import sleep
from os import path

import serial


class SerialDevice(DeviceInterface):
    """Class representing device connected by serial port."""

    active = False
    connected = False
    connection = None
    auto_reconnect = False
    message_queue = []  # TODO: The list will be used in multiple threads

    def _message_watcher(self):
        self.log.debug(f'Starting message watcher for {self.port}')
        while self.active:
            if path.exists(self.port):
                try:
                    data = self.connection.readline()
                    if data:
                        self.message_queue.append(data)
                except serial.SerialException:
                    self.log.warning(f'Failed to read from device {self.port}')
            else:
                self.log.warning(f'Lost connection with device {self.port}')
                self.connection.close()
                self.connected = False
                if self.auto_reconnect:
                    Thread(target=self._reconnect_watcher).start()
                break
        self.log.debug(f'Stopping message watcher for {self.port}')

    def _reconnect_watcher(self):
        self.log.debug(f'Starting reconnect watcher for {self.port}')
        while self.active:
            if path.exists(self.port):
                if self.reconnect():
                    Thread(target=self._message_watcher).start()
                break
            else:
                sleep(0.1)
        self.log.debug(f'Stopping reconnect watcher for {self.port}')

    def __init__(self, *_, port, baudrate=9600, timeout=.1, auto_reconnect=False):
        self.log = logger('SerialDevice')
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.auto_reconnect = auto_reconnect
        if self.reconnect():
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

    def is_connected(self):
        return self.connected

    def reconnect(self):
        try:
            self.connection = serial.Serial(port=self.port, baudrate=self.baudrate, timeout=self.timeout)
            self.connected = True
            self.log.info(f'Established connection with {self.port}')
            return True
        except serial.SerialException:
            if path.exists(self.port):
                self.log.error(f'Failed to establish connection with {self.port} - Permission denied')
                self.log.info(f'Repeating action in 1 sec')
                sleep(1)
                return self.reconnect()
            else:
                self.log.error(f'Failed to establish connection with {self.port} - Device does not exist')
            self.connected = False
            return False

    def exit(self):
        self.active = False
        if self.connection:
            self.log.info('Closing connection')
            self.connection.close()
