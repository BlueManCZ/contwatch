from .handler_interface import HandlerInterface
from modules.logging.logger import logger

from json.decoder import JSONDecodeError
from requests import get
from requests.exceptions import ConnectionError, ReadTimeout, MissingSchema
from threading import Thread
from time import sleep, time


class HttpHandler(HandlerInterface):
    """Class for handling HTTP targets."""

    def _fetcher(self):
        self.log.debug("Starting HTTP data fetcher")
        self.success = True
        last_secs = int(time())
        self.add_changed("handlers")
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
                        self.add_changed("handlers")
                except ConnectionError as error:
                    print(error)
                    self.log.warning("Failed to establish a connection")
                    self.log.error(error)
                    self.success = False
                    self.add_changed("handlers")
                    Thread(target=self._reconnect_watcher).start()
                    break
                except ReadTimeout as error:
                    print(error)
                    self.log.warning("Connection timeout")
                    self.log.error(error)
                    self.success = False
                    self.add_changed("handlers")
                    Thread(target=self._reconnect_watcher).start()
                    break
                except MissingSchema as error:
                    print(error)
                    self.log.warning("Invalid URL address")
                    self.log.error(error)
                    self.success = False
                    self.active = False
                    self.add_changed("handlers")
                except JSONDecodeError as error:
                    print(error)
                    self.log.warning("Json decode error")
                    self.log.error(error)
                    self.success = False
                    self.active = False
                    self.add_changed("handlers")
            sleep(0.1)
        self.log.debug("Stopping fetcher")

    def _reconnect_watcher(self):
        self.log.debug("Starting reconnect watcher")
        while self.active:
            try:
                response = get(self.url, params=self.params, timeout=self.timeout)
                if response.status_code == 200:
                    Thread(target=self._fetcher).start()
                    self.add_changed("handlers")
                    break
            except ConnectionError:
                pass
            except ReadTimeout:
                pass
            sleep(1)
        self.log.debug("Stopping reconnect watcher")

    type = "http"
    config_fields = {
        "url": ["string", "URL address"],
        "interval": ["int", "Fetching interval in seconds", 10],
        "timeout": ["float", "Timeout in seconds", 3],
        "json": ["bool", "Parse as a JSON", False]
    }

    # def __init__(self, *_, url, params=None, interval=10, timeout=3, json=False):
    def __init__(self, settings):
        self.settings = settings
        device_config = self.get_config()

        self.log = logger(f"Plaintext fetcher {device_config['url']}")

        self.url = device_config["url"]
        self.interval = device_config["interval"]
        self.timeout = device_config["timeout"]
        self.json = device_config["json"]

        self.params = None
        self.message_queue = []
        self.success = False
        self.active = True
        self.add_changed("handlers")

        Thread(target=self._fetcher).start()

    def update_config(self, new_config):
        super(HttpHandler, self).update_config(new_config)

        self.url = new_config["url"]
        self.interval = new_config["interval"]
        self.timeout = new_config["timeout"]
        self.json = new_config["json"]
        self.add_changed("handlers")

        self.active = False
        sleep(2)
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
