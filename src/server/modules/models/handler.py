from pony import orm

from modules.database import db
from modules.handlers.abstract_handler import AbstractHandler
from modules.models.attribute import Attribute
from modules.models.data_unit import DataUnit
from modules.models.data_stat import DataStat
from modules.models.widget_tile import WidgetTile


class Handler(db.Entity):
    """Database entity representing handler configuration"""

    type = orm.Required(str)
    options = orm.Required(orm.Json)
    enabled = orm.Required(bool)
    data = orm.Set(DataUnit)
    stats = orm.Set(DataStat)
    attributes = orm.Set(Attribute)
    # events = orm.Set("EventUnit")


def get_all() -> list[Handler]:
    """Returns all handlers"""
    return Handler.select()


def add(handler: AbstractHandler, h_id=0) -> Handler:
    """Adds handler to database"""
    return Handler(
        id=h_id if h_id else None,
        type=handler.type,
        options=handler.options,
        enabled=True,
    )


def get_by_id(h_id) -> Handler | None:
    """Returns handler by id"""
    return Handler.get(id=h_id)
