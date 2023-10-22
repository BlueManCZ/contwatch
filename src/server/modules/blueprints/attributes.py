from flask import Blueprint
from pony import orm

from modules.blueprints.enums import StatusCode
from modules.models.attribute import Attribute
from modules.tools import BlueprintInit, this_name


def attributes_blueprint(_init: BlueprintInit):
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
