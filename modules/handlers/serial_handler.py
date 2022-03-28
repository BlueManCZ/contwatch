from .handler_interface import HandlerInterface
from modules.logging.logger import logger

from json import loads
from json.decoder import JSONDecodeError
from threading import Thread
from time import sleep
from os import path

import serial


class SerialHandler(HandlerInterface):
    """Class for handling devices connected by serial port."""

    def _message_watcher(self):
        self.log.debug("Starting message watcher")
        while self.active:
            if path.exists(self.connection.port):
                try:
                    data = self.connection.readline()
                    if data:
                        try:
                            data_json = loads(data)
                            self.message_queue.append(data_json)
                        except JSONDecodeError:
                            data = bytes.decode(data)
                            data = data.replace("\n", "")
                            self.message_queue.append(data)
                except serial.SerialException:
                    self.log.warning("Failed to read from device")
                    sleep(0.1)
            else:
                self.log.info("Lost connection with device")
                self.connection.close()
                self.add_changed("handlers")
                if self.auto_reconnect:
                    Thread(target=self._reconnect_watcher).start()
                break
        self.log.debug("Stopping message watcher")

    def _reconnect_watcher(self):
        self.log.debug("Starting reconnect watcher")
        while self.active:
            if path.exists(self.connection.port):
                if self.reconnect():
                    Thread(target=self._message_watcher).start()
                break
            else:
                sleep(0.1)
        self.log.debug("Stopping reconnect watcher")

    type = "serial"
    config_fields = {
        "port": ["string", "Device port (e.g., /dev/ttyUSB0)"],
        "baudrate": ["int", "Baudrate", 9600],
        "timeout": ["float", "Timeout in seconds", .1],
        "auto_reconnect": ["bool", "Auto reconnect", True]
    }

    # def __init__(self, *_, port, baudrate=9600, timeout=.1, auto_reconnect=False):
    def __init__(self, settings):
        self.settings = settings
        device_config = self.get_config()

        self.log = logger(f"SerialDevice {device_config['port']}")
        self.connection = serial.Serial()

        self.connection.port = device_config["port"]
        self.connection.baudrate = device_config["baudrate"]
        self.connection.timeout = device_config["timeout"]
        self.auto_reconnect = device_config["auto_reconnect"]

        self.message_queue = []  # TODO: The list will be used in multiple threads

        self.active = False
        self.add_changed("handlers")

        if self.reconnect():
            self.active = True
            Thread(target=self._message_watcher).start()
        else:
            if self.auto_reconnect:
                self.active = True
                Thread(target=self._reconnect_watcher).start()

    def update_config(self, new_config):
        super(SerialHandler, self).update_config(new_config)

        # TODO: Semaphore may be required

        self.connection.port = new_config["port"]
        self.connection.baudrate = new_config["baudrate"]
        self.connection.timeout = new_config["timeout"]
        self.auto_reconnect = new_config["auto_reconnect"]

        self.connection.close()

        self.add_changed("handlers")

    def send_message(self, message):
        if self.is_connected():
            self.connection.write(bytes(message, "utf-8"))

    def ready_to_read(self):
        return len(self.message_queue) > 0

    def read_message(self):
        if len(self.message_queue) > 0:
            return self.message_queue.pop(0)
        return None

    def is_connected(self):
        return self.connection.is_open

    def reconnect(self):
        try:
            self.connection.open()
            self.log.info("Established connection with device")
            self.add_changed("handlers")
            return True
        except serial.SerialException:
            if path.exists(self.connection.port):
                self.log.warning("Failed to establish connection - Permission denied")
                self.log.info("Repeating action in 1 sec")
                sleep(1)
                return self.reconnect()
            else:
                self.log.warning("Failed to establish connection - Device does not exist")
            self.connection.close()
            return False

    def exit(self):
        self.active = False
        if self.connection:
            self.log.info("Closing connection")
            self.connection.close()
