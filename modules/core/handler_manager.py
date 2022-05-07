from modules import tools
from modules.core import DataManager, EventManager, Workflow, get_routine_class, EventListener
from modules.core.helpers import EventMessage, create_event
from modules.handlers import *
from modules.logging.logger import logger
from modules.tools import get_nested_attribute

from threading import Thread
from time import localtime, sleep, strftime


class HandlerManager:
    """Handles registration and communication of handlers"""

    def _handler_watcher(self):
        sleep(2)
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
        self.message_queue_index = 0
        self.active = True
        self.changed = ["overview", "inspector", "actions", "data", "handlers", "details"]

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

    def delete_all(self):
        for handler in self.registered_handlers.values():
            handler.exit()
        self.registered_handlers = {}
        self.event_manager.event_listeners = []
        self.event_manager.workflows = {}
        self.last_messages = {}
        self.message_queue = []

    def register_handler(self, handler_id, handler):
        self.registered_handlers[handler_id] = handler
        for p in ["overview", "handlers"]:
            self.add_changed(p)

    def get_handler(self, handler_id):
        if handler_id in self.registered_handlers:
            return self.registered_handlers[handler_id]
        return None

    def get_handlers(self):
        return self.registered_handlers

    def delete_handler(self, handler_id):
        self.registered_handlers.pop(handler_id)
        for p in ["overview", "handlers"]:
            self.add_changed(p)

    def export_config(self):
        result = {
            "handlers": {},
            "chart-views": [],
            "event-listeners": [],
            "workflows": {},
        }

        db_handlers = self.database.get_handlers()
        for db_handler in db_handlers:
            handler_dict = {
                "type": db_handler.type,
                "settings": db_handler.settings,
            }
            result["handlers"][db_handler.id] = handler_dict

        db_views = self.database.get_chart_views()
        for db_view in db_views:
            chart_view = {
                "label": db_view.label,
                "settings": db_view.settings,
            }
            result["chart-views"].append(chart_view)

        db_event_listeners = self.database.get_event_listeners()
        for db_listener in db_event_listeners:
            event_listener = {
                "handler-id": db_listener.handler_id,
                "event-name": db_listener.label,
                "workflow-id": db_listener.workflow_id,
                "data-listener": db_listener.data_listener_status,
            }
            result["event-listeners"].append(event_listener)

        db_workflows = self.database.get_workflows()
        for db_workflow in db_workflows:
            db_routines = self.database.get_routines_for_workflow(db_workflow.id)
            routines = []
            for db_routine in db_routines:
                routine = {
                    "type": db_routine.type,
                    "settings": db_routine.settings,
                }
                routines.append(routine)
            result["workflows"][db_workflow.id] = {"routines": routines}

        return result

    def import_config(self, json):
        handlers = json["handlers"]
        for handler_id in handlers:
            handler = handlers[handler_id]
            handler_id = int(handler_id)
            handler_class = get_handler_class(handler["type"])
            handler_instance = handler_class(handler["settings"])
            self.database.add_handler(handler_instance, handler_id)
            self.register_handler(handler_id, handler_instance)

        for chart_view in json["chart-views"]:
            self.database.add_chart_view(chart_view["label"], chart_view["settings"])

        workflows = json["workflows"]
        for workflow_id in workflows:
            workflow = workflows[workflow_id]
            workflow_id = int(workflow_id)
            db_workflow = self.database.add_workflow(workflow_id)
            new_workflow = Workflow(self.event_manager)
            new_workflow.set_id(db_workflow.id)
            self.event_manager.add_workflow(new_workflow)

            for routine in workflow["routines"]:
                routine_class = get_routine_class(routine["type"])
                target_workflow = self.event_manager.get_workflow(workflow_id)
                routine_settings = routine["settings"]
                new_routine = routine_class(routine_settings, self)
                new_routine.workflow = target_workflow
                new_routine.position = len(target_workflow.routines)
                target_workflow.add_routine(new_routine)
                database_routine = self.database.add_routine(new_routine)
                new_routine.set_id(database_routine.id)

        for event_listener in json["event-listeners"]:
            handler_id = event_listener["handler-id"]
            listener = EventListener(handler_id, event_listener["event-name"])
            workflow_id = event_listener["workflow-id"]
            if workflow_id:
                workflow_id = int(workflow_id)
                listener.set_workflow(self.event_manager.get_workflow(workflow_id))
            data_listener_status = event_listener["data-listener"] if "data-listener" in event_listener else False
            listener.set_data_listener_status(data_listener_status)
            db_listener = self.database.add_event_listener(listener)
            listener.set_id(db_listener.id)

        print("Configuration successfully imported.")

    def add_changed(self, value):
        if value not in self.changed:
            self.changed.append(value)

    def process_message(self, handler_id, message):
        self.last_messages[handler_id] = strftime("%H:%M:%S", localtime()), message

        message_type = "text"

        if isinstance(message, dict):
            if EventMessage(message).is_valid():
                message_type = "event"
            else:
                message_type = "json"

        self.message_queue.append({
            "type": message_type,
            "handler_id": handler_id,
            "handler": self.get_handler(handler_id),
            "time": strftime("%H:%M:%S", localtime()),
            "data": message,
            "incoming": True
        })

        self.add_changed("overview")

        if message_type == "event":
            # Save event to database
            event = EventMessage(message)
            self.event_manager.trigger_event(
                handler_id,
                event
            )

        elif message_type == "json":
            linearized_attributes = []
            tools.linearize_json(message, linearized_attributes)

            for attributes_row in linearized_attributes:
                result = get_nested_attribute(message, attributes_row)

                if attributes_row in self.get_handler(handler_id).get_storage_attributes():
                    self.data_manager.add_data_unit(attributes_row, result, handler_id)

                self.event_manager.trigger_event(
                    handler_id,
                    create_event(attributes_row, []),
                    True
                )

        else:
            # print("TEXT:", message)
            pass

        while len(self.message_queue) > 50:
            self.message_queue.pop(0)

    def _send_message_agent(self, handler_id, message):
        handler = self.get_handler(handler_id)
        status = handler.send_message(message)

        if status:
            message_type = "event" if isinstance(message, EventMessage) else "json"

            self.message_queue.append({
                "type": message_type,
                "handler_id": handler_id,
                "handler": handler,
                "time": strftime("%H:%M:%S", localtime()),
                "data": message.json(),
                "incoming": False,
                "routine_log": self.event_manager.routine_log.copy(),
                "queue_index": self.message_queue_index,
            })
            self.add_changed("overview")

            self.message_queue_index += 1

            if message_type == "event":
                self.data_manager.add_event_unit(message, handler_id, False)

    def send_message(self, handler_id, message):
        thread = Thread(target=self._send_message_agent, args=(handler_id, message))
        thread.start()

    def exit(self):
        for handler in self.registered_handlers:
            self.registered_handlers[handler].exit()
        self.active = False
        self.log.info(f"Terminating")
