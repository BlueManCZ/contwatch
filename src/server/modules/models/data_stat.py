from datetime import date, datetime, time

from pony import orm

from modules.database import db


class DataStat(db.Entity):
    """Database entity representing data statistics"""

    handler = orm.Required("Handler")
    attribute = orm.Required("Attribute", index=True)
    type = orm.Required(str)
    value = orm.Required(float)
    date = orm.Required(date, index=True)
    time = orm.Required(time)

    # def to_json(self):
    #     return {}


def add(handler, attribute, stat_type, value) -> DataStat:
    """Adds DataStat to database"""
    now = datetime.now()
    return DataStat(
        handler=handler,
        attribute=attribute,
        type=stat_type,
        value=value,
        date=now.date(),
        time=now.time(),
    )


def get_by_type_and_date(handler, attribute, stat_type, stat_date) -> DataStat | None:
    """Return DataStat by handler, attribute and date"""
    return DataStat.get(handler=handler, attribute=attribute, type=stat_type, date=stat_date)
