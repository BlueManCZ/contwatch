from minimalmodbus import Instrument
from os import path
from serial import SerialException
from threading import Thread
from time import sleep

from modules.logging.logger import logger
from .abstract_handler import AbstractHandler


class MustPVPHInverterModbusHandler(AbstractHandler):
    """Class for handling MUST PV/PH solar system inverters."""

    type = "must_pv_ph_modbus"
    icon = "inverter"
    name = "MUST PV/PH solar system inverter"
    config_fields = {
        "port": ["string", "Device port (e.g., /dev/ttyUSB0)"],
        "slave-address": ["int", "Device slave address", 4],
        "interval": ["int", "Fetching interval in seconds", 10],
        "timeout": ["float", "Timeout in seconds", 0.1],
        "auto-reconnect": ["bool", "Auto reconnect", True],
    }

    registers = {
        "charger": {
            "pv-voltage": [15205, 1],
            "battery-voltage": [15206, 1],
            "current": [15207, 1],
            "power": [15208, 0],
        },
        "inverter": {
            "battery-voltage": [25205, 1],
            "power": [25213, 0],
            "power-grid": [25214, 0],
            "power-load": [25215, 0],
        },
    }

    def _read_message(self):
        result = {"charger": {}, "inverter": {}}

        for section_type in self.registers.keys():
            for key, data in self.registers[section_type].items():
                print(result)
                result[section_type][key] = self.connection.read_register(
                    data[0], data[1]
                )

        return result

    def _message_watcher(self):
        self.log.debug("Starting message watcher")
        while self.active:
            if path.exists(self.connection.serial.port):
                try:
                    message = self._read_message()
                    if message:
                        self.add_message(message)
                except SerialException:
                    self.log.warning("Failed to read from device")
                    self._reconnect()
                    sleep(0.1)
                except UnicodeDecodeError as error:
                    self.log.warning(error)
                    sleep(0.1)
            else:
                self.log.info("Lost connection with device")
                self.connection.serial.close()
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
            if path.exists(self.connection.serial.port):
                if self._reconnect():
                    Thread(target=self._message_watcher).start()
                    break
            sleep(1)
        self.log.debug("Stopping reconnect watcher")

    def _reconnect(self):
        try:
            self.connection.serial.open()
            self.log.info("Established connection with device")
            self.add_changed("handlers")
            return True
        except SerialException:
            if path.exists(self.connection.serial.port):
                self.log.warning("Failed to establish connection - Permission denied")
            else:
                self.log.warning(
                    "Failed to establish connection - Device does not exist"
                )
            self.connection.serial.close()
            return False

    def __init__(self, settings):
        super().__init__(settings)
        self.log = logger(
            f"SerialDevice {self.config('port')}:{self.config('slave-address')}"
        )

        self.connection = Instrument(self.config("port"), self.config("slave-address"))
        self.connection.serial.timeout = self.config("timeout")

        self.active = True
        self.suspended = False
        print(self.connection)
        self.add_changed("handlers")

        Thread(target=self._reconnect_watcher).start()

    def update_config(self, new_config):
        super().update_config(new_config)

        # TODO: Semaphore may be required

        self.connection.serial.close()
        self.connection.serial.port = self.config("port")
        self.connection.serial.timeout = self.config("timeout")
        self.connection.address = self.config("slave-address")
        self.connection.serial.close()
        print(self.connection)

        if self.suspended:
            Thread(target=self._reconnect_watcher).start()

        self.add_changed("handlers")

    def is_connected(self):
        return self.connection.serial.is_open
