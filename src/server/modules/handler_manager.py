from threading import Thread
from time import sleep

from pony import orm

from modules.actions.nodes import NODES_MAP
from modules.actions.nodes.abstract_node import AbstractNode
from modules.attribute_manager import AttributeManager
from modules.handlers import get_handler_class
from modules.handlers.abstract_handler import AbstractHandler
from modules.logging import Logger
from modules.models import handler as handler_model
from modules.models.settings import get_settings
from modules.utils import linearize, Context


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

    @orm.db_session
    def __init__(self):
        self.active = True
        self.log = Logger("HandlerManager")

        settings = get_settings(1)

        # Dictionary for handler instances
        self.registered_handlers: dict = {}
        # Dictionary for last received messages from handlers
        self.last_messages: dict = {}
        # Dictionary for attribute instances
        self.registered_attributes = {}

        self.initialize_handlers()

        # NodeMap for actions from database
        self.actions_node_map = settings.actions_node_map if settings else {}
        # Actual node instances
        self.actions_node_instances_map = {}

        self.rebuild_nodes()

        self.thread = Thread(target=self._handler_watcher)
        self.thread.start()

    @orm.db_session
    def initialize_handlers(self):
        """Load handlers from database and initialize them"""
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
        self.registered_attributes[handler_id][db_attribute.name] = AttributeManager(db_attribute)

    def process_message(self, handler_id: AbstractHandler, message):
        linearized_json = linearize(message)
        self.last_messages[handler_id] = linearized_json
        print(linearized_json)

        for attribute in self.registered_attributes.get(handler_id, []):
            if attribute in linearized_json:
                self.registered_attributes.get(handler_id).get(attribute).add_data_unit(linearized_json.get(attribute))

        # Find listeners for this handler and execute them
        for node_id, node in self.actions_node_instances_map.items():
            node: AbstractNode
            if node.node_settings.get("type") == "listener":
                if node.node_settings.get("inputData", {}).get("handler", {}).get("select") == handler_id:
                    node.execute()

    def set_actions_node_map(self, actions_node_map):
        self.actions_node_map = actions_node_map
        self.rebuild_nodes()

    def rebuild_nodes(self):
        """Parse actions_node_map and create node instances"""
        self.actions_node_instances_map.clear()
        for node_id, node in self.actions_node_map.items():
            node: dict

            new_node_instance = self.actions_node_instances_map.get(node_id)
            if not new_node_instance:
                new_node_instance = NODES_MAP.get(node.get("type"))(Context(self), node)
                self.actions_node_instances_map[node_id] = new_node_instance
            else:
                new_node_instance.load_node_settings(node)

            # Add input connections to the node
            for port_name, connection_list in node.get("connections", {}).get("inputs", {}).items():
                for connection in connection_list:
                    connection: dict
                    connection_id = connection.get("nodeId")
                    connection_name = self.actions_node_map.get(connection_id).get("type")

                    input_node_instance = self.actions_node_instances_map.get(connection_id)
                    # If node instance is not created yet, create it
                    if not input_node_instance:
                        input_node_instance = NODES_MAP.get(connection_name)(Context(self))
                        self.actions_node_instances_map[connection_id] = input_node_instance

                    new_node_instance.add_input_connection(port_name, input_node_instance)

            # Add output connections to the node
            for port_name, connection_list in node.get("connections", {}).get("outputs", {}).items():
                for connection in connection_list:
                    connection: dict
                    connection_id = connection.get("nodeId")
                    connection_name = self.actions_node_map.get(connection_id).get("type")

                    output_node_instance = self.actions_node_instances_map.get(connection_id)
                    # If node instance is not created yet, create it
                    if not output_node_instance:
                        output_node_instance = NODES_MAP.get(connection_name)(Context(self))
                        self.actions_node_instances_map[connection_id] = output_node_instance

                    new_node_instance.add_output_connection(port_name, output_node_instance)

    def exit(self):
        for handler in self.registered_handlers:
            self.registered_handlers[handler].exit()
        self.active = False
        self.log.debug(f"Terminating")
