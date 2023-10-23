from flask import Blueprint
from pony import orm

from modules.blueprints.enums import StatusCode
from modules.models.widget_switch import WidgetSwitch
from modules.models.widget_tile import WidgetTile
from modules.tools import BlueprintInit, this_name


def widgets_blueprint(_init: BlueprintInit):
    blueprint = Blueprint(this_name(), __name__)

    def get_handler(widget):
        return _init.manager.registered_handlers.get(widget.attribute.handler.id, None)

    def get_attribute(widget):
        return _init.manager.registered_attributes.get(widget.attribute.handler.id, {}).get(widget.attribute.name)

    def evaluate_attribute(widget):
        return (
            (
                get_attribute(widget).get_current_value() == widget.attribute_compare
                if widget.attribute_compare
                else bool(get_attribute(widget).get_current_value())
            )
            if get_attribute(widget)
            else False
        )

    @blueprint.route("/tiles")
    @orm.db_session
    def widget_tiles():
        return [
            {
                "id": tile.id,
                "name": tile.name,
                "description": get_handler(tile).get_name(),
                "handler": tile.attribute.handler.id,
                "icon": tile.icon,
                "attribute": tile.attribute.name,
                "unit": tile.attribute.unit,
                "value": get_attribute(tile).get_current_value() if get_attribute(tile) else None,
            }
            for tile in WidgetTile.select()
        ], StatusCode.OK

    @blueprint.route("/switches")
    @orm.db_session
    def widget_switches():
        return [
            {
                "id": switch.id,
                "name": switch.name,
                "description": get_handler(switch).get_name(),
                "handler": switch.attribute.handler.id,
                "icon": switch.icon,
                "attribute": switch.attribute.name,
                "active": evaluate_attribute(switch),
            }
            for switch in WidgetSwitch.select()
        ], StatusCode.OK

    return blueprint
