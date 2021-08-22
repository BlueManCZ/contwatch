from modules.devices.device_interface import DeviceInterface
from modules.logging.logger import logger

from threading import Thread
from time import sleep, time

from requests import get
from requests.exceptions import ConnectionError, ReadTimeout


class HttpDevice(DeviceInterface):
    """Class representing HTTP device."""

    def _fetcher(self):
        self.log.debug(f'Starting HTTP data fetcher')
        self.success = True
        last_secs = int(time())
        while self.active:
            # TODO: Timing needs improvement
            secs = int(time())
            if ((secs % self.interval == 0) or not self.success) and secs != last_secs:
                try:
                    response = get(self.url, params=self.params, timeout=self.timeout)
                    if response.status_code == 200:
                        message = response.text
                        if self.json:
                            message = response.json()
                        self.message_queue.append(message)
                        last_secs = secs
                        self.success = True
                    elif response.status_code == 404:
                        message = response.text
                        if self.json:
                            message = response.json()
                        print(response.url, message)
                        last_secs = secs
                        self.success = True
                    else:
                        self.success = False
                except ConnectionError as error:
                    self.log.warning(f'Failed to establish a connection')
                    self.log.error(error)
                    print(error)
                    self.success = False
                    Thread(target=self._reconnect_watcher).start()
                    break
                except ReadTimeout as error:
                    self.log.warning(f'Connection timeout')
                    self.log.error(error)
                    print(error)
                    self.success = False
            sleep(0.1)
        self.log.debug(f'Stopping fetcher')

    def _reconnect_watcher(self):
        self.log.debug(f'Starting reconnect watcher')
        while self.active:
            try:
                response = get(self.url, params=self.params, timeout=self.timeout)
                if response.status_code == 200:
                    Thread(target=self._fetcher).start()
                    break
            except ConnectionError:
                pass
        self.log.debug(f'Stopping reconnect watcher')

    type = "http"
    fields = {
        "url": ["string", "URL address"],
        "interval": ["int", "Fetching interval in seconds", 10],
        "timeout": ["float", "Timeout in seconds", 3],
        "json": ["bool", "Parse as a JSON", False]
    }

    # def __init__(self, *_, url, params=None, interval=10, timeout=3, json=False):
    def __init__(self, *_, device_config):
        self.log = logger(f'Plaintext fetcher {device_config.url}')
        self.url = device_config.url
        self.params = None
        self.interval = device_config.interval
        self.timeout = device_config.timeout
        self.json = device_config.json
        self.message_queue = []
        self.success = False
        self.active = True
        Thread(target=self._fetcher).start()

    def ready_to_read(self):
        return len(self.message_queue) > 0

    def read_message(self):
        if len(self.message_queue) > 0:
            return self.message_queue.pop(0)
        return None

    def is_connected(self):
        return self.success

    def exit(self):
        self.active = False
