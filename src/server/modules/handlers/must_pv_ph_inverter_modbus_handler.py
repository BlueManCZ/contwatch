from os import path
from threading import Thread
from time import sleep

from minimalmodbus import Instrument, NoResponseError, InvalidResponseError
from serial import SerialException

from modules.logging.logger import Logger
from .abstract_handler import AbstractHandler
from ..utils import get_current_seconds


class MustPVPHInverterModbusHandler(AbstractHandler):
    """Class for handling MUST PV/PH solar system inverters."""

    type = "must_pv_ph_modbus"
    icon = "inverter"
    name = "MUST PV/PH solar inverter"
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
        if not self.first_tick():
            self.wait_for_interval(self.get_config_option("interval"))

        result = {"charger": {}, "inverter": {}}

        for section_type in self.registers.keys():
            for key, data in self.registers[section_type].items():
                result[section_type][key] = self.connection.read_register(data[0], data[1])
                sleep(0.05)

        return result

    def _message_watcher(self):
        self.log.debug("Starting message watcher")
        while self.active:
            if path.exists(self.connection.serial.port):
                try:
                    message = self._read_message()
                    if message:
                        self.add_message(message)
                except SerialException as error:
                    self._handle_error(error, "Failed to read from device")
                    if path.exists(self.get_config_option("port")):
                        self._handle_error(error, "Failed to establish connection - Permission denied")
                    else:
                        self._handle_error(error, "Failed to establish connection - Device does not exist")
                    break
                except UnicodeDecodeError as error:
                    self.log.warning(error)
                    sleep(0.1)
                except NoResponseError as error:
                    self._handle_error(error, "Communication error")
                    break
                except InvalidResponseError as error:
                    self._handle_error(error, "Invalid response error")
                    break
            else:
                self.log.info("Lost connection with device")
                self.connection.serial.close()
                self.connection = None
                # self.add_changed("handlers")
                if self.get_config_option("auto-reconnect"):
                    Thread(target=self._reconnect_watcher).start()
                else:
                    self.suspended = True
                break
        self.log.debug("Stopping message watcher")

    def _handle_error(self, error, message):
        # print(error)
        self.log.warning(message)
        self.log.error(error)
        # self.add_changed("handlers")
        Thread(target=self._reconnect_watcher).start()

    def _reconnect_watcher(self):
        self.log.debug("Starting reconnect watcher")
        while self.active:
            if self._reconnect():
                Thread(target=self._message_watcher).start()
                break
            sleep(1)
        self.log.debug("Stopping reconnect watcher")

    def _reconnect(self):
        try:
            if self.connection:
                self.connection.serial.close()
                self.connection = None
            self.connection = Instrument(self.get_config_option("port"), self.get_config_option("slave-address"))
            self.connection.serial.timeout = self.get_config_option("timeout")
            if not self.connection.serial.is_open:
                self.connection.serial.open()
            self._read_message()
            self.log.info("Established connection with device")
            # self.add_changed("handlers")
            return True
        except SerialException:
            return False
        except NoResponseError:
            return False
        except InvalidResponseError:
            return False

    def __init__(self, settings):
        super().__init__(settings)
        self.log = Logger(f"{self.name} {self.get_config_option('port')}:{self.get_config_option('slave-address')}")

        self.connection = None
        self.active = True
        self.suspended = False
        # self.add_changed("handlers")

        Thread(target=self._reconnect_watcher).start()

    def set_config(self, new_config):
        super().set_config(new_config)

        # TODO: Semaphore may be required

        self.connection.serial.close()
        self.connection = None

        if self.suspended:
            Thread(target=self._reconnect_watcher).start()

        # self.add_changed("handlers")

    def get_description(self):
        return self.get_config_option("port")

    def is_connected(self):
        return self.connection and self.connection.serial.is_open

    def is_communicating(self):
        return self.get_last_message_seconds() > (
            get_current_seconds() - self.get_config_option("interval") - self.get_config_option("timeout")
        )
