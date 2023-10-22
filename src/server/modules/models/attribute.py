from pony import orm

from modules.database import db


class Attribute(db.Entity):
    """Database entity representing data attribute"""

    name = orm.Required(str, index=True)
    handler = orm.Required("Handler")
    data_units = orm.Set("DataUnit")
    data_stats = orm.Set("DataStat")
    widgets = orm.Set("WidgetTile")
    enabled = orm.Required(bool)
    unit = orm.Optional(str)

    # def to_json(self):
    #     return {}


def get_by_id(a_id) -> Attribute | None:
    """Returns attribute by id"""
    return Attribute.get(id=a_id)


def get_by_handler_and_name(handler, name) -> Attribute | None:
    """Returns attribute by handler and name"""
    return Attribute.get(handler=handler, name=name)


def modify(handler, name, enabled=True) -> Attribute:
    """Adds or modifies DataAttribute in database"""
    existing_attribute = get_by_handler_and_name(handler, name)
    if existing_attribute:
        existing_attribute.enabled = enabled
        return existing_attribute
    return Attribute(handler=handler, name=name, enabled=enabled)
