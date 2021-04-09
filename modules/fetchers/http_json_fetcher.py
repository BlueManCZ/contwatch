from modules.devices.device_interface import DeviceInterface
from modules.logging.logger import logger

from time import sleep, time
from threading import Thread
from requests import get
from requests.exceptions import ConnectionError


class HttpJsonDevice(DeviceInterface):
    """Class representing HTTP JSON API data fetcher."""

    def _fetcher(self):
        self.log.debug(f'Starting fetcher')
        success = True
        last_secs = int(time())
        while self.active:
            # TODO: Timing needs improvement
            secs = int(time())
            if ((secs % self.interval == 0) or not success) and secs != last_secs:
                try:
                    response = get(self.url, params=self.params, timeout=self.timeout)
                    if response.status_code == 200:
                        self.message_queue.append(response.json())
                        last_secs = secs
                        success = True
                    elif response.status_code == 404:
                        print(response.url, response.json())
                        last_secs = secs
                        success = True
                    else:
                        success = False
                except ConnectionError as error:
                    self.log.warning(f'Failed to establish a new connection')
                    self.log.error(error)
                    print(error)
                    Thread(target=self._reconnect_watcher).start()
                    break
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

    def __init__(self, *_, url, params=None, interval=10, timeout=3):
        self.log = logger(f'JSON fetcher {url}')
        self.url = url
        self.params = params
        self.interval = interval
        self.timeout = timeout
        self.message_queue = []
        self.active = True
        Thread(target=self._fetcher).start()

    def ready_to_read(self):
        return len(self.message_queue) > 0

    def read_message(self):
        if len(self.message_queue) > 0:
            return self.message_queue.pop(0)
        return None

    def exit(self):
        self.active = False
