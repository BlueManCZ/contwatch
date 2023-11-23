from flask import Blueprint, request
from pony import orm

from modules.actions import NODES, PORTS
from modules.models.settings import set_settings, get_settings
from modules.utils import Context, this_name, StatusCode


def actions_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    @blueprint.route("/available-ports")
    def ports():
        return [port(_context).get_definition() for port in PORTS], StatusCode.OK

    @blueprint.route("/available-nodes")
    def nodes():
        return [node(_context).get_definition() for node in NODES], StatusCode.OK

    @blueprint.route("/node-map")
    @orm.db_session
    def node_map():
        settings = get_settings(1)
        if settings:
            return settings.actions_node_map, StatusCode.OK
        else:
            return {}, StatusCode.NOT_FOUND

    @blueprint.route("/save-node-map", methods=["POST"])
    @orm.db_session
    def save_node_map():
        actions_node_map = request.json
        if (not actions_node_map) or (not isinstance(actions_node_map, dict)):
            return {"status": "error", "message": "Invalid request body"}, StatusCode.BAD_REQUEST
        _context.manager.set_actions_node_map(actions_node_map)
        set_settings(1, actions_node_map)
        return {"status": "ok"}, StatusCode.OK

    return blueprint
