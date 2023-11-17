from flask import Blueprint, request
from pony import orm

from modules.models.widget_switch import WidgetSwitch
from modules.models.widget_tile import WidgetTile
from modules.utils import BlueprintInit, this_name, StatusCode


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
                "status": 1 if get_handler(tile).is_connected() else 0,
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
                "status": 1 if get_handler(switch).is_connected() else 0,
                "icon": switch.icon,
                "attribute": switch.attribute.name,
                "active": evaluate_attribute(switch),
            }
            for switch in WidgetSwitch.select()
        ], StatusCode.OK

    @blueprint.route("/switches/toggle/<int:switch_id>", methods=["POST"])
    @orm.db_session
    def widget_switches_toggle(switch_id):
        value = request.json.get("value", None)
        for switch in WidgetSwitch.select(lambda s: s.id == switch_id):
            handler = get_handler(switch)
            if value:
                handler.send_message({"label": switch.action_on.message})
            else:
                handler.send_message({"label": switch.action_off.message})
            return {
                "id": switch.id,
                "name": switch.name,
                "description": get_handler(switch).get_name(),
                "handler": switch.attribute.handler.id,
                "icon": switch.icon,
                "attribute": switch.attribute.name,
                "active": evaluate_attribute(switch),
            }, StatusCode.OK
        return {"status": "not found"}, StatusCode.NOT_FOUND

    return blueprint
