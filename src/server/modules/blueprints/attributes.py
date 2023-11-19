from flask import Blueprint
from pony import orm

from modules.models.attribute import Attribute
from modules.utils import Context, this_name, StatusCode


def attributes_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

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
            }
            for attribute in Attribute.select()
        ], StatusCode.OK

    return blueprint
