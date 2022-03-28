from modules.engine.helpers import EventMessage
from modules.handlers import *
from modules.logging.logger import logger
from modules.engine import DataManager, EventManager

from threading import Thread
from time import localtime, sleep, strftime


class HandlerManager:
    """Handles registration and communication of handlers"""

    def _handler_watcher(self):
        while self.active:
            for handler_id in self.registered_handlers:
                handler = self.registered_handlers[handler_id]
                if handler.ready_to_read():
                    message = handler.read_message()
                    self.process_message(handler_id, message)

            sleep(0.01)

    def __init__(self, database):
        self.database = database
        self.data_manager = DataManager(database)
        self.registered_handlers = {}
        self.last_messages = {}
        self.message_queue = []
        self.active = True
        self.changed = []

        self.log = logger(f"Handler manager")

        handlers = database.get_handlers()

        self.log.info(f"Loaded {len(handlers)} handlers from database")

        for handler in handlers:
            handler_class = get_handler_class(handler.type)
            handler_instance = handler_class(handler.settings)
            self.register_handler(handler.id, handler_instance)

        self.event_manager = EventManager(database, self)

        self.thread = Thread(target=self._handler_watcher)
        self.thread.start()

    def register_handler(self, handler_id, handler):
        self.registered_handlers[handler_id] = handler
        for p in ["overview", "handlers"]:
            self.add_changed(p)

    def get_handler(self, handler_id):
        return self.registered_handlers[handler_id]

    def get_handlers(self):
        return self.registered_handlers

    def delete_handler(self, handler_id):
        self.registered_handlers.pop(handler_id)
        for p in ["overview", "handlers"]:
            self.add_changed(p)

    def export(self):
        result = {}
        handlers = self.database.get_handlers()
        for handler in handlers:
            handler_dict = {
                "type": handler.type,
                "settings": handler.settings,
            }
            result[handler.id] = handler_dict
        return result

    def import_handlers(self, handlers):
        for handler_id in handlers:
            handler = handlers[handler_id]
            handler_id = int(handler_id)
            handler_class = get_handler_class(handler["type"])
            handler_instance = handler_class(handler["settings"])
            if int(handler_id) in self.registered_handlers:
                print(f"Handler with ID: {handler_id} already exists")
                continue
            self.database.add_handler(handler_instance, handler_id)
            self.register_handler(handler_id, handler_instance)
            print(f"Successfully imported handler with ID: {handler_id} - \"{handler['settings']['label']}\"")

    def add_changed(self, value):
        if value not in self.changed:
            self.changed.append(value)

    def process_message(self, handler_id, message):
        # TODO: Message handling here

        self.last_messages[handler_id] = strftime("%H:%M:%S", localtime()), message
        self.add_changed("overview")

        message_type = "text"

        if isinstance(message, dict):
            # JSON
            if "type" in message and message["type"] == "event":
                print("EVENT:", message)
                message_type = "event"
                self.event_manager.trigger_event(message["label"], message["payload"] if "payload" in message else [])
            else:
                print("JSON:", message)
                message_type = "json"
                for attribute in self.get_handler(handler_id).get_storage_attributes():
                    if attribute in message:
                        self.data_manager.add_data_unit(attribute, message[attribute], handler_id)
        else:
            # String
            print("TEXT:", message)

        self.message_queue.append([message_type, handler_id, self.get_handler(handler_id), strftime("%H:%M:%S", localtime()), message, 0])

        while len(self.message_queue) > 50:
            self.message_queue.pop(0)

    def send_message(self, handler_id, message):
        message_type = "text"
        message_to_send = message

        if isinstance(message, EventMessage):
            message_type = "event"
            message_to_send = message.text()
            message = message.json()

        handler = self.get_handler(handler_id)
        self.message_queue.append([message_type, handler_id, handler, strftime("%H:%M:%S", localtime()), message, 1])
        handler.send_message(message_to_send)

    def exit(self):
        for handler in self.registered_handlers:
            self.registered_handlers[handler].exit()
        self.active = False
        self.log.info(f"Terminating")
