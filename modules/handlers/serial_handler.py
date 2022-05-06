from .abstract_handler import AbstractHandler
from modules.logging.logger import logger

from json import loads
from json.decoder import JSONDecodeError
from threading import Thread
from time import sleep
from os import path

import serial


class SerialHandler(AbstractHandler):
    """Class for handling devices connected by serial port."""

    def _message_watcher(self):
        self.log.debug("Starting message watcher")
        while self.active:
            if path.exists(self.connection.port):
                try:
                    data = self.connection.readline()
                    if data:
                        try:
                            # Try load as a JSON
                            data_json = loads(data)
                            self.add_message(data_json)
                        except JSONDecodeError:
                            # If this fails, decode as a plain text
                            data = bytes.decode(data)
                            data = data.replace("\n", "")
                            self.add_message(data)
                except serial.SerialException:
                    self.log.warning("Failed to read from device")
                    self._reconnect()
                    sleep(0.1)
                except UnicodeDecodeError as error:
                    self.log.warning(error)
                    sleep(0.1)
            else:
                self.log.info("Lost connection with device")
                self.connection.close()
                self.add_changed("handlers")
                if self.config("auto-reconnect"):
                    Thread(target=self._reconnect_watcher).start()
                else:
                    self.suspended = True
                break
        self.log.debug("Stopping message watcher")

    def _reconnect_watcher(self):
        self.log.debug("Starting reconnect watcher")
        while self.active:
            if path.exists(self.connection.port):
                if self._reconnect():
                    Thread(target=self._message_watcher).start()
                    break
            sleep(1)
        self.log.debug("Stopping reconnect watcher")

    def _reconnect(self):
        try:
            self.connection.open()
            self.log.info("Established connection with device")
            self.add_changed("handlers")
            return True
        except serial.SerialException:
            if path.exists(self.connection.port):
                self.log.warning("Failed to establish connection - Permission denied")
            else:
                self.log.warning("Failed to establish connection - Device does not exist")
            self.connection.close()
            return False

    type = "serial"
    icon = type
    config_fields = {
        "port": ["string", "Device port (e.g., /dev/ttyUSB0)"],
        "baudrate": ["int", "Baudrate", 9600],
        "timeout": ["float", "Timeout in seconds", .1],
        "auto-reconnect": ["bool", "Auto reconnect", True]
    }

    def __init__(self, settings):
        super().__init__(settings)
        self.log = logger(f"SerialDevice {self.config('port')}")

        self.connection = serial.Serial()
        self.connection.port = self.config("port")
        self.connection.baudrate = self.config("baudrate")
        self.connection.timeout = self.config("timeout")

        self.active = True
        self.suspended = False
        self.add_changed("handlers")

        Thread(target=self._reconnect_watcher).start()

    def update_config(self, new_config):
        super().update_config(new_config)

        # TODO: Semaphore may be required

        self.connection.close()
        self.connection.port = self.config("port")
        self.connection.baudrate = self.config("baudrate")
        self.connection.timeout = self.config("timeout")
        self.connection.close()

        if self.suspended:
            Thread(target=self._reconnect_watcher).start()

        self.add_changed("handlers")

    def get_description(self):
        return self.connection.port

    def send_message(self, message):
        if self.is_connected():
            try:
                self.connection.write(bytes(message.text(), "utf-8"))
                return True
            except serial.SerialException:
                pass

    def is_connected(self):
        return self.connection.is_open

    def exit(self):
        self.active = False
        if self.connection:
            self.log.info("Closing connection")
            self.connection.close()
