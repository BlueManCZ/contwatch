from flask import Blueprint, request
from pony import orm

from modules.models.attribute import Attribute
from modules.utils import Context, this_name, StatusCode


def attributes_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    def get_attribute(attribute):
        return _context.manager.registered_attributes.get(attribute.handler.id, {}).get(attribute.name)

    def attribute_serializer(attribute):
        return {
            "id": attribute.id,
            "name": attribute.name,
            "handler": attribute.handler.id,
            "enabled": attribute.enabled,
            "unit": attribute.unit,
            "label": attribute.label,
            "icon": attribute.icon,
            "order": attribute.order,
            "data": {
                "value": get_attribute(attribute).get_current_value(),
                "trend": get_attribute(attribute).get_trend(),
            },
        }

    @blueprint.route("/")
    @orm.db_session
    def attributes():
        handler = request.args.get("handler", None)
        return [
            attribute_serializer(attribute)
            for attribute in (Attribute.select(lambda a: a.handler.id == handler) if handler else Attribute.select())
        ], StatusCode.OK

    @blueprint.route("/<int:attribute_id>")
    @orm.db_session
    def attribute(attribute_id):
        try:
            attribute = Attribute[attribute_id]
            return attribute_serializer(attribute), StatusCode.OK
        except orm.ObjectNotFound:
            return {"message": "Attribute not found."}, StatusCode.NOT_FOUND

    @blueprint.route("/set-order", methods=["POST"])
    @orm.db_session
    def set_order():
        order = request.json
        for index, attribute_id in enumerate(order):
            Attribute[attribute_id].order = index
        return {"message": "Order set successfully."}, StatusCode.OK

    @blueprint.route("/update", methods=["POST"])
    @orm.db_session
    def update():
        attribute_id = request.json.get("id")
        attribute = Attribute[attribute_id]

        label = request.json.get("label")
        attribute.label = label if label else None

        unit = request.json.get("unit")
        attribute.unit = unit if unit else None

        icon = request.json.get("icon")
        attribute.icon = icon if icon else None

        return {"message": "Attribute updated successfully."}, StatusCode.OK

    return blueprint
