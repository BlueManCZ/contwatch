from flask import Blueprint, request
from pony import orm

from modules.handlers import get_handler_class, available_handlers
from modules.models import attribute as attribute_model
from modules.models import handler as handler_model
from modules.utils import this_name, BlueprintInit, parse_config, StatusCode


def handlers_blueprint(_init: BlueprintInit):
    blueprint = Blueprint(this_name(), __name__)

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
                "id": h_id,
                "type": handler.type,
                "name": handler.get_name(),
                "icon": handler.icon,
                "description": handler.get_description(),
                "status": 1 if handler.is_connected() else 0,
                "attributes": [
                    {
                        "id": attribute_manager.get_id(),
                        "name": attribute_name,
                        "value": attribute_manager.get_current_value(),
                    }
                    for attribute_name, attribute_manager in _init.manager.registered_attributes.get(h_id, {}).items()
                ],
            }
            for h_id, handler in _init.manager.registered_handlers.items()
        ], StatusCode.OK

    @blueprint.route("/<int:handler_id>")
    def handler_info(handler_id):
        handler = _init.manager.registered_handlers.get(handler_id, None)
        if handler:
            return {
                "id": handler.get_id(),
                "type": handler.type,
                "name": handler.get_name(),
                "icon": handler.icon,
                "description": handler.get_description(),
                "status": 1 if handler.is_connected() else 0,
                "options": handler.get_options(),
                "attributes": [
                    {
                        "id": attribute_manager.get_id(),
                        "name": attribute_name,
                        "value": attribute_manager.get_current_value(),
                    }
                    for attribute_name, attribute_manager in _init.manager.registered_attributes.get(
                        handler_id, {}
                    ).items()
                ],
                "availableAttributes": [
                    {
                        "name": attribute_name,
                        "value": attribute_value,
                    }
                    for attribute_name, attribute_value in _init.manager.last_messages.get(handler_id, {}).items()
                ],
            }, StatusCode.OK
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
        handler.set_id(handler_db.id)
        _init.manager.register_handler(handler)
        return {"status": "ok"}, StatusCode.CREATED

    @blueprint.route("/add-handler-attribute", methods=["POST"])
    @orm.db_session
    def add_handler_attribute():
        handler_id = request.json["handler_id"]
        handler = handler_model.get_by_id(handler_id)
        if handler:
            attribute = request.json["attribute"]
            db_attribute = attribute_model.modify(handler, attribute)
            handler.attributes.add(db_attribute)
            return {"status": "ok"}, StatusCode.CREATED
        return {"status": "not found"}, StatusCode.NOT_FOUND

    return blueprint
