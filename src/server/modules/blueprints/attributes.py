from flask import Blueprint, request
from pony import orm

from modules.models.attribute import Attribute
from modules.utils import Context, this_name, StatusCode


def attributes_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    def registered_attribute(attribute):
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
            "rounding": attribute.rounding,
            "data": {
                "value": registered_attribute(attribute).get_current_value(),
                "trend": registered_attribute(attribute).get_trend(),
            },
        }

    @blueprint.route("/")
    @orm.db_session
    def get_attributes():
        handler = request.args.get("handler", None)
        return [
            attribute_serializer(attribute)
            for attribute in (Attribute.select(lambda a: a.handler.id == handler) if handler else Attribute.select())
        ], StatusCode.OK

    @blueprint.route("/<int:attribute_id>")
    @orm.db_session
    def get_attribute(attribute_id):
        try:
            attribute = Attribute[attribute_id]
            if attribute:
                return attribute_serializer(attribute), StatusCode.OK
            else:
                return {"message": "Attribute not found."}, StatusCode.NOT_FOUND
        except orm.ObjectNotFound:
            return {"message": "Attribute not found."}, StatusCode.NOT_FOUND

    @blueprint.route("/<int:attribute_id>", methods=["PUT"])
    @orm.db_session
    def put_attribute(attribute_id):
        db_attribute = Attribute[attribute_id]

        label = request.json.get("label")
        db_attribute.label = label if label else None

        unit = request.json.get("unit")
        db_attribute.unit = unit if unit else None

        rounding = request.json.get("rounding")
        db_attribute.rounding = rounding if rounding is not None else 2

        icon = request.json.get("icon")
        db_attribute.icon = icon if icon else None

        attribute = registered_attribute(db_attribute)
        attribute.refresh_config(db_attribute)

        _context.socketio.emit("mutate", f"core/attributes/{attribute_id}")

        return {"message": "Attribute updated successfully."}, StatusCode.OK

    return blueprint
