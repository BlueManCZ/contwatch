from pony import orm
from datetime import date, datetime, time

from modules.database import db


class DataUnit(db.Entity):
    """Database entity representing data"""

    handler = orm.Required("Handler")
    # name = orm.Required(str, index=True)
    attribute = orm.Required("Attribute", index=True)
    value = orm.Required(float)
    date = orm.Required(date, index=True)
    time = orm.Required(time)

    # def to_json(self):
    #     return {}


def add(handler, attribute, value, timestamp) -> DataUnit:
    """Adds DataUnit to database"""
    return DataUnit(
        handler=handler,
        attribute=attribute,
        value=value,
        date=timestamp.date(),
        time=timestamp.time(),
    )
