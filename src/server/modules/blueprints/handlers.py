from flask import Blueprint, request
from pony import orm

from modules.handlers import get_handler_class, available_handlers
from modules.models import attribute as attribute_model
from modules.models import handler as handler_model
from modules.models.data_stat import DataStat
from modules.models.data_unit import DataUnit
from modules.utils import this_name, Context, parse_config, StatusCode, get_current_seconds


def handlers_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    def get_status(handler):
        """Returns 1 if handler is connected and communication. Returns 2 if handler is connected but not communicating. Returns 0 if handler is not connected."""
        return 2 if handler.is_connected() and not handler.is_communicating() else 1 if handler.is_connected() else 0

    @blueprint.route("/available-handlers")
    def get_available_handlers():
        return [
            {
                "type": handler.type,
                "name": handler.name,
                "icon": handler.icon,
                "configFields": handler.config_fields,
            }
            for handler in available_handlers
        ], StatusCode.OK

    @blueprint.route("/")
    @orm.db_session
    def handlers():
        return [
            {
                "id": handler_id,
                "type": handler.type,
                "name": handler.get_name(),
                "icon": handler.icon,
                "description": handler.get_description(),
                "status": get_status(handler),
                "attributes": [
                    attribute.id
                    for attribute in handler.get_db_instance().attributes.order_by(attribute_model.Attribute.order)
                ],
                "last_message": (
                    get_current_seconds() - handler.get_last_message_seconds()
                    if handler.get_last_message_seconds()
                    else None
                ),
                "availableAttributes": [
                    {
                        "name": attribute_name,
                        "value": attribute_value,
                    }
                    for attribute_name, attribute_value in _context.manager.last_messages.get(handler_id, {}).items()
                ],
            }
            for handler_id, handler in _context.manager.registered_handlers.items()
        ], StatusCode.OK

    @blueprint.route("/<int:handler_id>")
    @orm.db_session
    def handler_info(handler_id):
        handler = _context.manager.registered_handlers.get(handler_id, None)
        if handler:
            return {
                "id": handler.get_id(),
                "type": handler.type,
                "name": handler.get_name(),
                "icon": handler.icon,
                "description": handler.get_description(),
                "status": 1 if handler.is_connected() else 0,
                "attributes": [
                    attribute.id
                    for attribute in handler.get_db_instance().attributes.order_by(attribute_model.Attribute.order)
                ],
                "options": handler.get_options(),
                "availableAttributes": [
                    {
                        "name": attribute_name,
                        "value": attribute_value,
                    }
                    for attribute_name, attribute_value in _context.manager.last_messages.get(handler_id, {}).items()
                ],
            }, StatusCode.OK
        return {"status": "not found"}, StatusCode.NOT_FOUND

    @blueprint.route("/<int:handler_id>/last")
    def handler_last_message(handler_id):
        handler = _context.manager.last_messages.get(handler_id, None)
        if handler:
            return _context.manager.last_messages.get(handler_id), StatusCode.OK
        return {"status": "not found"}, StatusCode.NOT_FOUND

    @blueprint.route("/add-handler", methods=["POST"])
    @orm.db_session
    def add_handler():
        handler_class = get_handler_class(request.json["type"])
        options: dict = request.json["options"]
        options["config"] = parse_config(options.get("config", {}), handler_class)
        handler = handler_class(options)
        handler_db = handler_model.add(handler)
        handler_db.flush()
        handler.set_db_instance(handler_db)
        _context.manager.register_handler(handler)
        return {"status": "ok"}, StatusCode.CREATED

    @blueprint.route("/add-attribute", methods=["POST"])
    @orm.db_session
    def add_handler_attribute():
        handler_id = request.json["handler_id"]
        handler = handler_model.get_by_id(handler_id)
        if handler:
            attribute = request.json["attribute"]
            db_attribute = attribute_model.modify(handler, attribute)
            db_attribute.flush()
            handler.attributes.add(db_attribute)
            _context.manager.register_attribute(db_attribute)
            return {"status": "ok"}, StatusCode.CREATED
        return {"status": "not found"}, StatusCode.NOT_FOUND

    @blueprint.route("/delete-attribute", methods=["POST"])
    @orm.db_session
    def remove_handler_attribute():
        attribute_id = request.json["attribute_id"]
        db_attribute = attribute_model.get_by_id(attribute_id)

        if db_attribute:
            _context.manager.registered_attributes[db_attribute.handler.id].pop(db_attribute.name)
            db_attribute.delete()
            DataUnit.select(lambda d: d.attribute == db_attribute).delete()
            DataStat.select(lambda d: d.attribute == db_attribute).delete()
            return {"status": "ok"}, StatusCode.OK

        return {"status": "not found"}, StatusCode.NOT_FOUND

    return blueprint
