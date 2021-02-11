#!/usr/bin/env python3

import modules.devices.serial_device
from modules.log import logger

from signal import signal, SIGINT
from time import sleep
from os import path, remove


def _quit_handler(_, __):
    """Handler for exit signal."""
    global active, arduino
    active = False
    arduino.exit()
    log.info('Quiting application')


if __name__ == '__main__':

    signal(SIGINT, _quit_handler)

    # TODO: For temporary debug clarity only
    if path.isfile('contwatch.log'):
        remove('contwatch.log')

    log = logger('Main')

    log.info('Starting application')

    active = True
    arduino = modules.devices.serial_device.SerialDevice(port='/dev/ttyUSB0', auto_reconnect=True)

    while active:
        if arduino.ready_to_read():
            print(arduino.read_message())
        sleep(0.1)
