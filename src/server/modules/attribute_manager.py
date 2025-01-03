from collections import deque
from datetime import datetime

from pony import orm
from pony.orm import desc

from modules.models import attribute as attribute_model
from modules.models import data_stat as data_stat_model
from modules.models import data_unit as data_unit_model


class AttributeManager:
    """Handles work with attributes and data"""

    def __init__(self, db_instance):
        self.id = db_instance.id
        self.handler_id = db_instance.handler.id
        self.name = db_instance.name
        self.label = db_instance.label
        self.last_value_save_skipped = False
        self.last_date = datetime.now().date()

        last_values = [
            unit.value
            for unit in reversed(
                db_instance.data_units.select(
                    lambda unit: unit.attribute.id == self.id and unit.date == datetime.now().date()
                )
                .order_by(lambda u: desc(u.id))
                .limit(6)
            )
        ]
        self.trend_queue = deque(maxlen=3)

        last_added = None
        for value in last_values:
            if last_added != value:
                self.trend_queue.append(value)
                last_added = value

        value = None
        if db_instance.data_units:
            last_unit = list(db_instance.data_units.select().order_by(lambda u: desc(u.id)).limit(1))
            if last_unit:
                value = last_unit[-1].value

        self.value = value
        self.last_datetime = None

        self.stats = {}
        self.init_stats()

        self.stat_predicates = {
            "max": lambda val: val > self.stats["max"],
            "min": lambda val: val < self.stats["min"],
        }

    def init_stats(self):
        self.stats = {
            "max": None,
            "min": None,
        }

    def get_id(self):
        return self.id

    def get_name(self):
        return self.name

    def get_current_value(self):
        return self.value

    def get_instance(self):
        return attribute_model.get_by_id(self.id)

    def get_trend(self):
        if len(self.trend_queue) < 3:
            return 0
        if self.trend_queue[0] < self.trend_queue[1] < self.trend_queue[2]:
            return 1
        if self.trend_queue[0] > self.trend_queue[1] > self.trend_queue[2]:
            return -1
        return 0

    def check_value_change(self, value):
        return value != self.value

    @orm.db_session
    def add_data_unit(self, value):
        value_changed = False
        # TODO: We need to create two new data units when the day changes.
        if self.check_value_change(value):
            # Value has changed
            if self.value is not None and self.last_datetime is not None and self.last_value_save_skipped:
                data_unit_model.add(self.handler_id, self.id, self.value, self.last_datetime)
                self.last_value_save_skipped = False
            self.value = value
            data_unit_model.add(self.handler_id, self.id, value, datetime.now())
            self.trend_queue.append(self.value)
            self.check_and_add_stat_units(value)
            value_changed = True
        else:
            # Value hasn't changed
            self.last_value_save_skipped = True
        self.last_datetime = datetime.now()
        return value_changed

    def check_and_add_stat_units(self, value):
        now = datetime.now()
        if now.date() > self.last_date:
            # New day has started, reset stats
            self.init_stats()
            self.last_date = now.date()
        for predicate_name, stat_predicate in self.stat_predicates.items():
            if self.stats[predicate_name] is None:
                # If stat is not found, it may not be loaded from DB yet. Try to load it.
                db_stat = data_stat_model.get_by_type_and_date(self.id, predicate_name, now.date())
                self.stats[predicate_name] = db_stat.value if db_stat else None

            if self.stats[predicate_name] is not None and stat_predicate(value):
                # If stat is found in db and predicate is true, update stat in db.
                db_stat = data_stat_model.get_by_type_and_date(self.id, predicate_name, now.date())
                self.stats[predicate_name] = db_stat.value if db_stat else None
                db_stat.time = now.time()
                db_stat.value = value
            elif self.stats[predicate_name] is None:
                # If stat is still not in db, add it.
                data_stat_model.add(self.handler_id, self.id, predicate_name, value)
