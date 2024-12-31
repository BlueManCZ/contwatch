from flask import Blueprint
from pony import orm

from modules.models.attribute import Attribute
from modules.utils import Context, this_name, StatusCode


def attributes_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    def get_handler(attribute):
        return _context.manager.registered_handlers.get(attribute.handler.id, None)

    def get_attribute(attribute):
        return _context.manager.registered_attributes.get(attribute.handler.id, {}).get(attribute.name)

    @blueprint.route("/")
    @orm.db_session
    def attributes():
        return [
            {
                "id": attribute.id,
                "name": attribute.name,
                "handler": attribute.handler.id,
                "enabled": attribute.enabled,
                "unit": attribute.unit,
                "label": attribute.label,
                "icon": attribute.icon,
                "data": {
                    # TODO: Add disabled status
                    "status": 1 if get_handler(attribute).is_connected() else 0,
                    "handler_name": get_handler(attribute).get_name(),
                    "value": get_attribute(attribute).get_current_value(),
                }
            }
            for attribute in Attribute.select()
        ], StatusCode.OK

    return blueprint
