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

        value = None
        if db_instance.data_units:
            last_unit = list(db_instance.data_units.select().order_by(lambda u: desc(u.id)).limit(1))
            if last_unit:
                value = last_unit[-1].value

        self.value = value
        self.last_datetime = None

        self.stats = {
            "max": None,
            "min": None,
        }

        self.stat_predicates = {
            "max": lambda value: value > self.stats["max"],
            "min": lambda value: value < self.stats["min"],
        }

    def get_id(self):
        return self.id

    def get_name(self):
        return self.name

    def get_current_value(self):
        return self.value

    def get_instance(self):
        return attribute_model.get_by_id(self.id)

    def check_value_change(self, value):
        return value != self.value

    @orm.db_session
    def add_data_unit(self, value):
        if self.check_value_change(value):
            if self.value is not None and self.last_datetime is not None:
                print("Value changed")
                data_unit_model.add(self.handler_id, self.id, self.value, self.last_datetime)
            self.value = value
            data_unit_model.add(self.handler_id, self.id, value, datetime.now())
            self.check_and_add_stat_units(value)
        else:
            print("Value didn't change")
        self.last_datetime = datetime.now()

    def check_and_add_stat_units(self, value):
        now = datetime.now()
        for predicate_name, stat_predicate in self.stat_predicates.items():
            if self.stats[predicate_name] is None:
                # If stat is not found, it may not be loaded from DB yet. Try to load it.
                db_stat = data_stat_model.get_by_type_and_date(self.handler_id, self.id, predicate_name, now.date())
                self.stats[predicate_name] = db_stat.value if db_stat else None

            if self.stats[predicate_name] is not None and stat_predicate(value):
                # If stat is found in db and predicate is true, update stat in db.
                print("Updating", predicate_name, "stat in DB")
                db_stat = data_stat_model.get_by_type_and_date(self.handler_id, self.id, predicate_name, now.date())
                self.stats[predicate_name] = db_stat.value if db_stat else None
                db_stat.time = now.time()
                db_stat.value = value
            elif self.stats[predicate_name] is None:
                # If stat is still not in db, add it.
                print("Writing", predicate_name, "stat to DB")
                data_stat_model.add(self.handler_id, self.id, predicate_name, value)
