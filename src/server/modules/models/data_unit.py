from datetime import date, time

from pony import orm
from pony.orm import composite_index

from modules.database import db


class DataUnit(db.Entity):
    """Database entity representing data"""

    handler = orm.Required("Handler")
    # name = orm.Required(str, index=True)
    attribute = orm.Required("Attribute", index=True)
    value = orm.Required(float)
    date = orm.Required(date, index=True)
    time = orm.Required(time)
    composite_index(attribute, date)

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


def get_by_handler_id(handler_id) -> DataUnit | None:
    """Returns DataUnit by handler id"""
    return (
        DataUnit.select(lambda unit: unit.handler.id == handler_id)
        .order_by(orm.desc(DataUnit.date), orm.desc(DataUnit.time))
        .limit(1)
    )
