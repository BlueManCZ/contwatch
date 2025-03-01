from pony import orm

from modules.database import db


class Unit(db.Entity):
    """Database entity representing unit"""

    name = orm.Required(str, index=True)
    base_unit = orm.Optional(str, index=True, nullable=True)
    base_ratio = orm.Optional(float, nullable=True)
