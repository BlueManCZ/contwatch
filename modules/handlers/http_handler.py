from .abstract_handler import AbstractHandler
from modules.logging.logger import logger

from json.decoder import JSONDecodeError
from requests import get
from requests.exceptions import ConnectionError, ReadTimeout, MissingSchema
from ssl import SSLError
from threading import Thread
from time import sleep, time


class HttpHandler(AbstractHandler):
    """Class for handling HTTP targets."""

    def _fetcher(self):
        self.log.debug("Starting HTTP data fetcher")
        self.success = False
        last_secs = int(time())
        self.add_changed("handlers")
        while self.active:
            # TODO: Timing needs improvement
            secs = int(time())
            if ((secs % self.config("interval") == 0) or not self.success) and secs != last_secs:
                try:
                    response = get(self.get_url(), timeout=self.config("timeout"))
                    if response.status_code == 200:
                        message = response.text
                        if self.config("json"):
                            message = response.json()
                        self.add_message(message)
                        last_secs = secs
                        if not self.success:
                            self.add_changed("handlers")
                        self.success = True
                    elif response.status_code == 404:
                        message = response.text
                        if self.config("json"):
                            message = response.json()
                        print(response.url, message)
                        last_secs = secs
                        self.success = True
                    else:
                        self.success = False
                        self.add_changed("handlers")
                        Thread(target=self._reconnect_watcher).start()
                        break
                except ConnectionError as error:
                    self._handle_error(error, "Failed to establish a connection")
                    break
                except ReadTimeout as error:
                    self._handle_error(error, "Connection timeout")
                    break
                except MissingSchema as error:
                    self._handle_error(error, "Invalid URL address")
                    break
                except JSONDecodeError as error:
                    self._handle_error(error, "Json decode error")
                    break
                except SSLError as error:
                    self._handle_error(error, "SSL error")
                    break
            sleep(0.1)
        self.log.debug("Stopping fetcher")

    def _reconnect_watcher(self):
        self.log.debug("Starting reconnect watcher")
        while self.active:
            try:
                response = get(self.get_url(), timeout=self.config("timeout"))
                if response.status_code == 200:
                    if self.config("json"):
                        response.json()
                    Thread(target=self._fetcher).start()
                    self.add_changed("handlers")
                    break
            except ConnectionError:
                pass
            except ReadTimeout:
                pass
            except MissingSchema:
                pass
            except JSONDecodeError:
                pass
            except SSLError:
                pass
            sleep(1)
        self.log.debug("Stopping reconnect watcher")

    def _handle_error(self, error, message):
        # print(error)
        self.log.warning(message)
        self.log.error(error)
        self.success = False
        self.add_changed("handlers")
        Thread(target=self._reconnect_watcher).start()

    type = "http"
    icon = type
    config_fields = {
        "url": ["string", "URL address"],
        "interval": ["int", "Fetching interval in seconds", 10],
        "timeout": ["float", "Timeout in seconds", 3],
        "json": ["bool", "Parse as a JSON", False]
    }

    def __init__(self, settings):
        super().__init__(settings)
        self.log = logger(f"Plaintext fetcher {self.get_url()}")
        self.success = False
        self.active = True
        self.add_changed("handlers")
        Thread(target=self._fetcher).start()

    def get_url(self):
        url = self.config("url")
        if "http://" not in url and "https://" not in url:
            return "http://" + url
        return url

    def get_base_url(self):
        url = self.get_url()
        return url.split("?")[0]

    def get_description(self):
        return self.get_base_url()

    def send_message(self, message):
        try:
            args = {}
            index = 0
            for arg in message.json()["payload"]:
                args[f"arg{index}"] = arg
                index += 1
            base_url = self.get_base_url()
            target = f"{base_url}{'/' if base_url[-1] != '/' else ''}{message.get_label()}"
            response = get(target, params=args, timeout=self.config("timeout"))
            # TODO: Maybe use response.ok instead?
            if response.status_code:
                return True
        except ConnectionError as error:
            print(error)
        except ReadTimeout as error:
            print(error)
        except MissingSchema as error:
            print(error)

    def is_connected(self):
        return self.success

    def exit(self):
        self.active = False
