import settings
from modules import settings
from modules.engine.actions.routines.routine_interface import RoutineInterface
from modules.handlers.handler_interface import HandlerInterface
from modules.logging.logger import logger

from datetime import datetime
from pony import orm


db = orm.Database()


class Handler(db.Entity):
    """Database entity representing handler configuration"""

    type = orm.Required(str)
    settings = orm.Required(orm.Json)
    data = orm.Set("DataUnit")
    events = orm.Set("EventUnit")


class DataUnit(db.Entity):
    """Database entity representing data"""

    handler = orm.Required(Handler)
    label = orm.Required(str)
    value = orm.Required(float)
    datetime = orm.Required(datetime)


class EventUnit(db.Entity):
    """Database entity for storing events"""

    handler = orm.Required(Handler)
    label = orm.Required(str)
    payload = orm.Optional(orm.Json)
    incoming = orm.Required(bool)
    datetime = orm.Required(datetime)


class EventListener(db.Entity):
    """Database entity representing event listener"""

    handler_id = orm.Required(int)
    label = orm.Required(str)
    workflow_id = orm.Optional(int)
    data_listener_status = orm.Optional(bool)


class Workflow(db.Entity):
    """Database entity representing workflow"""


class Routine(db.Entity):
    """Database entity representing routine"""

    type = orm.Required(str)
    workflow = orm.Required(int)
    position = orm.Required(int)
    settings = orm.Required(orm.Json)


class ChartView(db.Entity):
    """Database entity for saving user defined charts"""

    label = orm.Required(str)
    settings = orm.Required(orm.Json)


def delete_tables():
    db.drop_all_tables(with_all_data=True)


def create_tables():
    db.create_tables()


class Database:
    """Class representing database instance"""

    def __init__(self):
        log = logger("Database")

        if settings.DB_TYPE == "sqlite":
            db.bind("sqlite", filename=settings.DB_SQLITE_FILE, create_db=True)
        elif settings.DB_TYPE == "mysql":
            db.bind("mysql",
                    host=settings.DB_HOST, db=settings.DB_DATABASE,
                    user=settings.DB_USER, passwd=settings.DB_PASSWORD)
        else:
            error_text = f"Unsupported database type '{settings.DB_TYPE}' in settings."
            log.error(error_text)
            print(error_text)
            quit()
        db.generate_mapping(create_tables=True)

        log.info("Database initialized")

    ###################
    # HANDLER queries #
    ###################

    @orm.db_session
    def add_handler(self, handler: HandlerInterface, handler_id=0):
        return Handler(
            id=handler_id if handler_id else None,
            type=handler.type,
            settings=handler.settings,
        )

    @orm.db_session
    def get_handlers(self):
        return Handler.select(lambda d: d)[:]

    @orm.db_session
    def get_handler_by_id(self, handler_id):
        return Handler.select(lambda d: d.id == handler_id)[:][0]

    @orm.db_session
    def update_handler_settings(self, handler_id, handler_settings):
        handler = self.get_handler_by_id(handler_id)
        handler.settings = handler_settings

    @orm.db_session
    def delete_handler(self, handler_id):
        handler = self.get_handler_by_id(handler_id)
        handler.delete()

    ################
    # DATA queries #
    ################

    @orm.db_session
    def add_data_unit(self, label, value, handler: Handler):
        return DataUnit(label=label, value=value, handler=handler, datetime=datetime.now())

    @orm.db_session
    def add_event_unit(self, event, handler, incoming=True):
        return EventUnit(label=event.get_label(), payload=event.get_payload(), handler=handler, incoming=incoming, datetime=datetime.now())

    @orm.db_session
    def get_handler_attribute_data(self, handler_id, attribute, datetime_from: datetime, datetime_to: datetime, *_,
                                   smartround=0):
        result = orm.select(
            (d.datetime, d.value) for d in DataUnit
            if d.handler.id == handler_id and d.label == attribute
            and d.datetime >= datetime_from and d.datetime <= datetime_to
        )[:]

        if smartround:
            ratio = len(result) / smartround
            index = 0
            if ratio > 1:
                rounded_result = []
                while int(index) < len(result):
                    sublist = result[int(index):int(index+ratio)]
                    rounded_result.append(_smartround_avg(*sublist))
                    index += ratio
                result = rounded_result[:smartround]

        return result

    @orm.db_session
    def get_handler_attribute_dates(self, handler_id, attribute):
        return DataUnit.select(lambda d: d.handler.id == handler_id and d.label == attribute)

    @orm.db_session
    def get_handler_stored_events(self, handler_id):
        return EventUnit.select(lambda e: e.handler.id == handler_id)[:]

    @orm.db_session
    def get_handler_stored_events_in_names(self, handler_id):
        return orm.select(e.label for e in EventUnit if e.handler.id == handler_id and e.incoming)[:]

    @orm.db_session
    def get_handler_stored_events_out_names(self, handler_id):
        return orm.select(e.label for e in EventUnit if e.handler.id == handler_id and not e.incoming)[:]

    @orm.db_session
    def get_handler_stored_event_data(self, handler_id, event, incoming, datetime_from: datetime, datetime_to: datetime):
        return orm.select(
            (e.datetime, e.payload) for e in EventUnit
            if e.handler.id == handler_id and e.label == event and e.incoming == incoming
            and e.datetime >= datetime_from and e.datetime <= datetime_to
        )[:]

    ######################
    # CHART VIEW queries #
    ######################

    @orm.db_session
    def add_chart_view(self, label, view_settings):
        return ChartView(
            label=label,
            settings=view_settings,
        )

    @orm.db_session
    def get_chart_views(self):
        return ChartView.select(lambda v: v)[:]

    @orm.db_session
    def get_chart_view_by_id(self, view_id):
        return ChartView.select(lambda v: v.id == view_id)[:][0]

    @orm.db_session
    def update_chart_view(self, view_id, label, view_settings):
        view = self.get_chart_view_by_id(view_id)
        view.label = label
        view.settings = view_settings

    @orm.db_session
    def delete_chart_view(self, view_id):
        view = self.get_chart_view_by_id(view_id)
        view.delete()

    ###################
    # ACTIONS queries #
    ###################

    @orm.db_session
    def add_event_listener(self, event_listener):
        return EventListener(
            handler_id=event_listener.get_handler_id(),
            label=event_listener.get_label(),
            workflow_id=event_listener.workflow.get_id() if event_listener.workflow else None,
            data_listener_status=event_listener.get_data_listener_status(),
        )

    @orm.db_session
    def update_event_listener(self, event_listener):
        listener = self.get_event_listener_by_id(event_listener.get_id())
        listener.handler_id = event_listener.get_handler_id()
        listener.label = event_listener.get_label()
        listener.workflow_id = event_listener.workflow.get_id() if event_listener.workflow else None
        listener.data_listener_status = event_listener.get_data_listener_status()

    @orm.db_session
    def get_event_listeners(self):
        return EventListener.select(lambda l: l)[:]

    @orm.db_session
    def get_event_listener_by_id(self, listener_id):
        return EventListener.select(lambda l: l.id == listener_id)[:][0]

    @orm.db_session
    def delete_event_listener(self, listener_id):
        listener = self.get_event_listener_by_id(listener_id)
        listener.delete()

    @orm.db_session
    def add_workflow(self, workflow_id=0):
        return Workflow(
            id=workflow_id if workflow_id else None,
        )

    @orm.db_session
    def get_workflows(self):
        return Workflow.select(lambda w: w)[:]

    @orm.db_session
    def get_workflow_by_id(self, workflow_id):
        return Workflow.select(lambda w: w.id == workflow_id)[:][0]

    @orm.db_session
    def delete_workflow(self, workflow_id):
        workflow = self.get_workflow_by_id(workflow_id)
        workflow.delete()

    @orm.db_session
    def add_routine(self, routine: RoutineInterface, routine_id=0):
        return Routine(
            id=routine_id if routine_id else None,
            type=routine.type,
            settings=routine.settings,
            workflow=routine.workflow.get_id(),
            position=routine.position,
        )

    @orm.db_session
    def update_routine(self, routine: RoutineInterface):
        db_routine = self.get_routine_by_id(routine.id)
        db_routine.type = routine.type
        db_routine.settings = routine.settings
        db_routine.workflow = routine.workflow.id
        db_routine.position = routine.position

    @orm.db_session
    def get_routines(self):
        return Routine.select(lambda r: r)[:]

    @orm.db_session
    def get_routines_for_workflow(self, workflow_id):
        result = Routine.select(lambda r: r.workflow == workflow_id)[:]
        result.sort(key=lambda r: r.position)
        return result

    @orm.db_session
    def get_routine_by_id(self, routine_id):
        return Routine.select(lambda r: r.id == routine_id)[:][0]

    @orm.db_session
    def delete_routine(self, routine_id):
        routine = self.get_routine_by_id(routine_id)
        routine.delete()

    def exit(self):
        pass


def _smartround_avg(*items):
    return items[-1][0], round(sum(map(lambda x: x[1], items)) / len(items), 1)
