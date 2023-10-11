from threading import Thread
from time import sleep
from pony import orm

from modules.attribute_manager import AttributeManager
from modules.handlers import get_handler_class
from modules.handlers.abstract_handler import AbstractHandler
from modules.logging import Logger
from modules.models import handler as handler_model
from modules.tools import linearize


class HandlerManager:
    """Handles registration and communication of handlers"""

    def _handler_watcher(self):
        sleep(2)
        while self.active:
            for h_id, handler in self.registered_handlers.items():
                if handler.ready_to_read():
                    message = handler.read_message()
                    self.process_message(h_id, message)
            sleep(0.01)

    def __init__(self):
        self.active = True
        self.log = Logger("HandlerManager")

        # Dictionary for handler instances
        self.registered_handlers: dict = {}
        # Dictionary for last received messages from handlers
        self.last_messages: dict = {}
        # Dictionary for attribute instances
        self.registered_attributes = {}

        self.initialize_handlers()

        self.thread = Thread(target=self._handler_watcher)
        self.thread.start()

    @orm.db_session
    def initialize_handlers(self):
        db_handlers = handler_model.get_all()
        self.log.info(f"Loaded {len(db_handlers)} handlers from database")
        for db_handler in db_handlers:
            handler = get_handler_class(db_handler.type)(db_handler.options)
            handler.set_id(db_handler.id)
            self.register_handler(handler)
            for db_attribute in db_handler.attributes:
                self.register_attribute(db_attribute)

    def register_handler(self, handler):
        """Add handler instance to the dictionary"""
        handler_id = handler.get_id()
        self.registered_handlers[handler_id] = handler

    def register_attribute(self, db_attribute):
        """Add attribute instance to the dictionary"""
        handler_id = db_attribute.handler.id
        if handler_id not in self.registered_attributes:
            self.registered_attributes[handler_id] = {}
        self.registered_attributes[handler_id][db_attribute.name] = AttributeManager(
            db_attribute
        )

    def process_message(self, handler_id: AbstractHandler, message):
        linearized_json = linearize(message)
        self.last_messages[handler_id] = linearized_json
        print(linearized_json)

        for attribute in self.registered_attributes.get(handler_id, []):
            print(attribute, linearized_json[attribute])
            if attribute in linearized_json:
                self.registered_attributes.get(handler_id).get(attribute).add_data_unit(
                    linearized_json.get(attribute)
                )

    def exit(self):
        for handler in self.registered_handlers:
            self.registered_handlers[handler].exit()
        self.active = False
        self.log.debug(f"Terminating")
