from datetime import date, datetime, time

from pony import orm

from modules.database import db


class DataStat(db.Entity):
    """Database entity representing data statistics"""

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
        attribute=attribute,
        type=stat_type,
        value=value,
        date=now.date(),
        time=now.time(),
    )


def get_by_type_and_date(attribute, stat_type, stat_date) -> DataStat | None:
    """Return DataStat by attribute and date"""
    return DataStat.get(attribute=attribute, type=stat_type, date=stat_date)
