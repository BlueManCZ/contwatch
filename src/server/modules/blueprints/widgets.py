from flask import Blueprint
from pony import orm

from modules.blueprints.enums import StatusCode
from modules.models.widget_tile import WidgetTile
from modules.tools import BlueprintInit, this_name


def widgets_blueprint(_init: BlueprintInit):
    blueprint = Blueprint(this_name(), __name__)

    @blueprint.route("/")
    @orm.db_session
    def widget_tiles():
        return [
            {
                "id": tile.id,
                "name": tile.name,
                "handler": tile.handler.id,
                "icon": tile.icon,
                "attribute": tile.attribute.name,
                "unit": tile.attribute.unit,
                "value": _init.manager.registered_attributes.get(tile.handler.id, {})
                .get(tile.attribute.name, {})
                .get_current_value(),
            }
            for tile in WidgetTile.select()
        ], StatusCode.OK

    return blueprint
