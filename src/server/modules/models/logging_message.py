from datetime import date, datetime, time

from pony import orm

from modules.database import db


class LoggingMessage(db.Entity):
    """Logging message entity"""

    source = orm.Required(str)
    level = orm.Required(int)
    message = orm.Required(str)
    payload = orm.Optional(orm.Json)
    date = orm.Required(date, index=True)
    time = orm.Required(time)


def add(source, level, message, payload) -> LoggingMessage:
    """Adds message to database"""
    now = datetime.now()
    return LoggingMessage(
        source=source, level=level, message=message, payload=payload, date=now.date(), time=now.time()
    )
