from modules.handlers import *
from modules.logging.logger import logger
from modules.engine.data_manager import DataManager

from threading import Thread

import time


class HandlerManager:
    """Handles registration and communication of handlers"""

    def _handler_watcher(self):
        while self.active:
            for handler_id in self.registered_handlers:
                handler = self.registered_handlers[handler_id]
                if handler.ready_to_read():
                    message = handler.read_message()
                    # TODO: Maybe create a DataManager for advanced data processing
                    self.last_messages[handler_id] = time.strftime("%H:%M:%S", time.localtime()), message
                    self.process_message(handler_id, message)

                    # self.database.add_data_unit()

                    self.add_changed("overview")
                    # if handler_id == 1:
                    #     self.registered_handlers[2].send_message(message + ' C\n')
                    # TODO: Message handling here

            time.sleep(0.1)

    def __init__(self, database):
        self.database = database
        self.data_manager = DataManager(database)
        self.registered_handlers = {}
        self.last_messages = {}
        self.active = True
        self.changed = []

        self.log = logger(f"Handler manager")

        handlers = database.get_handlers()

        self.log.info(f"Loaded {len(handlers)} handlers from database")

        for handler in handlers:
            handler_class = get_handler_class(handler.type)
            handler_instance = handler_class(handler.settings)
            self.register_handler(handler.id, handler_instance)

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

    def add_changed(self, value):
        if value not in self.changed:
            self.changed.append(value)

    def process_message(self, handler_id, message):
        if isinstance(message, dict):
            # JSON
            print(message)
            for attribute in self.get_handler(handler_id).get_storage_attributes():
                if attribute in message:
                    self.data_manager.add_data_unit(attribute, message[attribute], handler_id)
        else:
            # String
            print(message)

    def exit(self):
        for handler in self.registered_handlers:
            self.registered_handlers[handler].exit()
        self.active = False
        self.log.info(f"Terminating")
