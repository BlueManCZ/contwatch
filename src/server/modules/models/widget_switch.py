from pony import orm

from modules.database import db
from modules.models.action import Action


class WidgetSwitch(db.Entity):
    """Database entity representing widget switch"""

    name = orm.Optional(str, index=True)
    icon = orm.Optional(str)
    attribute = orm.Required("Attribute")
    attribute_compare = orm.Optional(str, nullable=True)
    action_on = orm.Optional(Action)
    action_off = orm.Optional(Action)
