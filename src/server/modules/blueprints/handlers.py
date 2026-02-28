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

    def handler_serializer(handler):
        return {
            "id": handler.get_id(),
            "type": handler.type,
            "name": handler.get_name(),
            "icon": handler.icon,
            "description": handler.get_description(),
            "status": get_status(handler),
            "options": handler.get_options(),
            "attributes": [
                {"id": attribute.id, "name": attribute.name}
                for attribute in handler.get_db_instance().attributes.order_by(attribute_model.Attribute.order)
            ],
            "availableAttributes": [
                {
                    "name": attribute_name,
                    "value": attribute_value,
                }
                for attribute_name, attribute_value in {
                    k: v
                    for k, v in _context.manager.last_messages.get(handler.get_id(), {}).items()
                    if k not in _context.manager.registered_attributes.get(handler.get_id(), {}).keys()
                }.items()
            ],
            "last_message": (
                get_current_seconds() - handler.get_last_message_seconds()
                if handler.get_last_message_seconds()
                else None
            ),
            "actions": handler.get_actions(),
        }

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
        return sorted([handler.get_id() for handler in _context.manager.registered_handlers.values()]), StatusCode.OK

    @blueprint.route("/<int:handler_id>")
    @orm.db_session
    def handler_info(handler_id):
        handler = _context.manager.registered_handlers.get(handler_id, None)
        if handler:
            return handler_serializer(handler), StatusCode.OK
        return {"status": "not found"}, StatusCode.NOT_FOUND

    @blueprint.route("/<int:handler_id>", methods=["PUT"])
    @orm.db_session
    def update_handler(handler_id):
        handler_db = handler_model.get_by_id(handler_id)
        if handler_db:
            attributes = request.json["attributes"]

            # Set attributes order
            for index, attribute in enumerate(attributes):
                if attribute["id"] in [a.id for a in handler_db.attributes]:
                    print("Setting order")
                    db_attribute = attribute_model.Attribute[attribute["id"]]
                    db_attribute.order = index
                    db_attribute.flush()

            # TODO: This should be probably moved to post_attribute
            # If attribute list contains attributes that are not in the handler, add them
            for attribute in attributes:
                if attribute["id"] not in [a.id for a in handler_db.attributes]:
                    db_attribute = attribute_model.modify(handler_db, attribute["name"])
                    db_attribute.flush()
                    handler_db.attributes.add(db_attribute)
                    _context.manager.register_attribute(db_attribute)

            # TODO: This should be probably moved to delete_attribute
            # If attribute list does not contain attributes that are in the handler, remove them
            for attribute in [{"id": a.id, "name": a.name} for a in handler_db.attributes]:
                if attribute["name"] not in [a["name"] for a in attributes]:
                    _context.manager.registered_attributes[handler_id].pop(attribute["name"])
                    db_attribute = attribute_model.get_by_id(attribute["id"])
                    DataUnit.select(lambda d: d.attribute == db_attribute).delete()
                    DataStat.select(lambda d: d.attribute == db_attribute).delete()
                    db_attribute.delete()
                    db_attribute.flush()

            _context.socketio.emit("mutate", f"core/handlers/{handler_id}")

            return {"status": "ok"}, StatusCode.OK
        return {"status": "not found"}, StatusCode.NOT_FOUND

    @blueprint.route("/<int:handler_id>/last")
    def handler_last_message(handler_id):
        last_message = _context.manager.last_messages.get(handler_id, None)
        if last_message:
            return last_message, StatusCode.OK
        return {"status": "not found"}, StatusCode.NOT_FOUND

    @blueprint.route("/<int:handler_id>/action/<string:action_name>", methods=["PUT"])
    def handler_action(handler_id, action_name):
        handler = _context.manager.registered_handlers.get(handler_id, None)
        if handler:
            if handler.get_actions and action_name in handler.get_actions():
                action = handler.get_actions()[action_name]
                handler.execute_action(action.get("destination"), action.get("params"))

                return {"status": "ok"}, StatusCode.OK
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

    return blueprint
