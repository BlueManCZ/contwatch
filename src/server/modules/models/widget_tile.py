from pony import orm

from modules.database import db


class WidgetTile(db.Entity):
    """Database entity representing widget tile"""

    name = orm.Optional(str, index=True)
    icon = orm.Optional(str)
    attribute = orm.Required("Attribute")


def get_by_id(w_id) -> WidgetTile | None:
    """Returns widget tile by id"""
    return WidgetTile.get(id=w_id)


def get_all() -> list[WidgetTile]:
    """Returns all widget tiles"""
    return list(WidgetTile.select())
