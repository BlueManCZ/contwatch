#!/usr/bin/env python3

import modules.devices.serial_device

from signal import signal, SIGINT
from time import sleep

active = True
arduino = modules.devices.serial_device.SerialDevice(port='/dev/ttyUSB0')


def _quit_handler(_, __):
    """Handler for exit signal."""
    global active, arduino
    active = False
    arduino.exit()
    quit()


if __name__ == '__main__':

    signal(SIGINT, _quit_handler)

    while True:
        if arduino.ready_to_read():
            print(arduino.read_message())
        sleep(0.1)
