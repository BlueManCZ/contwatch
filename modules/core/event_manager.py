from modules.core.actions import EventListener, get_routine_class
from modules.core.actions.workflow import Workflow


class EventManager:
    """Handles event processing and workflows. It is a subpart of DeviceManager"""

    def __init__(self, database, manager):
        self.database = database
        self.manager = manager
        self.event_listeners = []
        self.workflows = {}

        db_workflows = database.get_workflows()
        db_listeners = database.get_event_listeners()

        for workflow in db_workflows:
            new_workflow = Workflow()
            new_workflow.set_id(workflow.id)
            self.workflows[workflow.id] = new_workflow

        for workflow_id in self.workflows:
            routines = database.get_routines_for_workflow(workflow_id)
            for routine in routines:
                routine_class = get_routine_class(routine.type)
                routine_instance = routine_class(routine.settings, manager)
                routine_instance.set_id(routine.id)
                routine_instance.set_position(routine.position)
                routine_instance.set_workflow(self.get_workflow(routine.workflow))
                self.workflows[workflow_id].add_routine(routine_instance)

        for listener in db_listeners:
            new_listener = EventListener(listener.handler_id, listener.label)
            new_listener.set_id(listener.id)
            if listener.workflow_id in self.workflows:
                new_listener.set_workflow(self.workflows[listener.workflow_id])
            new_listener.set_data_listener_status(listener.data_listener_status)
            self.add_event_listener(new_listener)

    def add_event_listener(self, event_listener: EventListener):
        if not self.contains_event_listener(event_listener):
            self.event_listeners.append(event_listener)
            return event_listener
        return False

    def get_event_listener(self, listener_id):
        for listener in self.event_listeners:
            if listener.id == listener_id:
                return listener
        return None

    def get_event_listeners(self):
        return self.event_listeners

    def contains_event_listener(self, event_listener: EventListener):
        return list(filter(lambda e: e.get_label() == event_listener.get_label(), self.event_listeners))

    def delete_event_listener(self, event_listener: EventListener):
        self.event_listeners = list(filter(lambda e: e.get_label() != event_listener.get_label(), self.event_listeners))

    def trigger_event(self, handler_id, event, data_listener=False):
        payload = event.get_payload().copy()
        for listener in self.event_listeners:
            if listener.get_label() == event.get_label() \
                    and listener.get_handler_id() == handler_id \
                    and data_listener == listener.get_data_listener_status():
                listener.trigger(payload)
                self.manager.data_manager.add_event_unit(event, handler_id)

    def add_workflow(self, workflow: Workflow):
        self.workflows[workflow.id] = workflow

    def get_workflow(self, workflow_id):
        if workflow_id in self.workflows:
            return self.workflows[workflow_id]
        return None

    def get_workflows(self):
        return self.workflows.values()

    def delete_workflow(self, workflow_id):
        self.workflows.pop(workflow_id)

    def get_routine(self, routine_id):
        for workflow in self.get_workflows():
            for routine in workflow.routines:
                if routine.id == routine_id:
                    return routine
        return None

    def move_routine(self, workflow_id, routine_id, index):
        routines = self.get_workflow(workflow_id).routines
        routine_index = 0
        for routine in routines:
            if routine.id == routine_id:
                break
            routine_index += 1

        routines[routine_index].position += index
        routines[routine_index + index].position -= index
        self.database.update_routine(routines[routine_index])
        self.database.update_routine(routines[routine_index + index])
        routines.sort(key=lambda r: r.position)
        self.manager.add_changed("actions")

    def delete_routine(self, routine_id):
        for workflow in self.get_workflows():
            for routine in workflow.routines:
                if routine.id == routine_id:
                    workflow.routines.remove(routine)
                    self.database.delete_routine(routine_id)
                    self.manager.add_changed("actions")

                    for i in range(len(workflow.routines)):
                        workflow.routines[i].position = i
                        self.database.update_routine(workflow.routines[i])

    def get_storage_events_names(self, handler_id):
        return {
            "in": self.database.get_handler_stored_events_in_names(handler_id),
            "out": self.database.get_handler_stored_events_out_names(handler_id),
        }
