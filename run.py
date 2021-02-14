#!/usr/bin/env python3

from modules.devices.serial_device import SerialDevice
from modules.logging.logger import logger

from signal import signal, SIGINT
from time import sleep
from os import path, remove


def _quit_handler(_, __):
    """Handler for exit signal."""
    global active
    active = False
    arduino_uno.exit()
    arduino_nano.exit()
    log.info('Quiting application')


if __name__ == '__main__':

    signal(SIGINT, _quit_handler)

    # TODO: For temporary debug clarity only
    if path.isfile('contwatch.log'):
        remove('contwatch.log')

    log = logger('Main')

    log.info('Starting application')

    active = True
    arduino_uno = SerialDevice(port='/dev/ttyUSB0', auto_reconnect=True)
    arduino_nano = SerialDevice(port='/dev/ttyUSB1', auto_reconnect=True)

    while active:
        if arduino_uno.ready_to_read():
            message = arduino_uno.read_message()
            arduino_nano.send_message(message)
            print(message, end='')
        else:
            sleep(0.01)
