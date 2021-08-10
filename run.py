#!/usr/bin/env python3

from modules.devices import *
from modules.logging.logger import logger
from modules.managers.device_manager import DeviceManager
from modules.web_frontend.flask_frontend import FlaskFrontend

from signal import signal, SIGINT
from time import sleep, time
from os import path, remove


def _quit_handler(_, __):
    """Handler for exit signal."""
    global active
    active = False
    manager.exit()
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
    # url = 'https://api.openweathermap.org/data/2.5/weather'
    # url = 'http://10.0.0.57/temp'
    # params = {'id': '3069011', 'appid': '4c824bb19071dddfe8159caff73162a8', 'units': 'metric'}
    # http_device = HttpDevice(url=url, params=params, interval=3, json=True)
    # http_device = HttpDevice(url=url, interval=5, timeout=10)
    # arduino = SerialDevice(port='/dev/ttyUSB0', auto_reconnect=True)

    # saved_time = time()

    manager = DeviceManager()

    # manager.register_device(http_device, 1)
    # manager.register_device(arduino, 2)

    manager.register_device(arduino_uno, 1)
    manager.register_device(arduino_nano, 2)

    web = FlaskFrontend("0.0.0.0", 5000, manager)

    # while active:
    #     if json_fetcher.ready_to_read():
    #         print(json_fetcher.read_message())
    #
    #     if arduino_uno.ready_to_read():
    #         message = arduino_uno.read_message()
    #         arduino_nano.send_message(message)
    #         print(message, end='')
    #     else:
    #         sleep(0.01)
    #         if saved_time != int(time()):
    #             saved_time = int(time())
    #             status = ['ON', 'OFF'][saved_time % 2]
    #             # arduino_nano.send_message(f'LED,{status},5\0')
