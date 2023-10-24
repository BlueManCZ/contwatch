from simplejson import JSONDecodeError
from requests import get
from requests.exceptions import ConnectionError, ReadTimeout, MissingSchema
from ssl import SSLError
from threading import Thread
from time import sleep

from modules.logging import Logger
from .abstract_handler import AbstractHandler


class HttpHandler(AbstractHandler):
    """Class for handling HTTP targets."""

    def _fetcher(self):
        self.log.debug("Starting data fetcher")
        self.success = False
        # self.add_changed("handlers")
        while self.active:
            response = None
            if self.success:
                self.wait_for_interval(self.get_config_option("interval"))
            try:
                response = get(self.get_url(), timeout=self.get_config_option("timeout"))
                if response.status_code == 200:
                    self.last_response = response
                    self.add_message(response.json())
                    if not self.success:
                        pass
                        # self.add_changed("handlers")
                    self.success = True
                elif response.status_code == 404:
                    # message = response.text
                    # if self.get_config_option("json"):
                    message = response.json()
                    print(response.url, message)
                    self.success = True
                else:
                    self.success = False
                    # self.add_changed("handlers")
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
                response = get(self.get_url(), timeout=self.get_config_option("timeout"))
                if response.status_code == 200:
                    # if self.get_config_option("json"):
                    response.json()
                    Thread(target=self._fetcher).start()
                    # self.add_changed("handlers")
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
        self.success = False
        self.log.error(message, {"error": error})
        # self.add_changed("handlers")
        Thread(target=self._reconnect_watcher).start()

    type = "http"
    icon = type
    name = "HTTP API"
    config_fields = {
        "url": ["string", "URL address"],
        "interval": ["int", "Fetching interval in seconds", 10],
        "timeout": ["float", "Timeout in seconds", 3],
        # "json": ["bool", "Parse as a JSON", False],
    }

    def __init__(self, settings):
        super().__init__(settings)
        self.log = Logger(f"{self.name} {self.get_url()}")
        self.success = False
        self.active = True
        self.last_response = None
        # self.add_changed("handlers")
        Thread(target=self._fetcher).start()

    def get_url(self):
        url = self.get_config_option("url")
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
            # for arg in message.json()["payload"]:
            #     args[f"arg{index}"] = arg
            #     index += 1
            base_url = self.get_base_url()
            # TODO: Implement proper message class?
            target = f"{base_url}{'/' if base_url[-1] != '/' else ''}{message.get('label', None)}"
            response = get(target, params=args, timeout=self.get_config_option("timeout"))
            # TODO: Maybe use response.ok instead?
            if response.status_code:
                if self.last_response:
                    response_keys = list(response.json().keys())
                    response_keys.sort()
                    last_message_keys = list(self.last_response.json().keys())
                    last_message_keys.sort()
                    if response_keys == last_message_keys:
                        self.add_message(response.json())
                    else:
                        response = get(self.get_url(), timeout=self.get_config_option("timeout"))
                        if response.status_code == 200:
                            self.last_response = response
                            self.add_message(response.json())
                else:
                    response = get(self.get_url(), timeout=self.get_config_option("timeout"))
                    if response.status_code == 200:
                        self.last_response = response
                        self.add_message(response.json())
                return True
        except ConnectionError as error:
            print(error)
        except ReadTimeout as error:
            print(error)
        except MissingSchema as error:
            print(error)

    def is_connected(self):
        return self.success
