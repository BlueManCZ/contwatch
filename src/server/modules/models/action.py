from pony import orm

from modules.database import db


class Action(db.Entity):
    """Database entity representing action configuration"""

    name = orm.Required(str, index=True)
    message = orm.Required(str)
    widget_switches_on = orm.Set("WidgetSwitch", reverse="action_on")
    widget_switches_off = orm.Set("WidgetSwitch", reverse="action_off")
