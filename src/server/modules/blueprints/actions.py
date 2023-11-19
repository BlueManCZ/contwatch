from flask import Blueprint

from modules.actions import NODES, PORTS
from modules.utils import Context, this_name, StatusCode


def actions_blueprint(context: Context):
    blueprint = Blueprint(this_name(), __name__)

    @blueprint.route("/available-ports")
    def ports():
        return [port(context).get_definition() for port in PORTS], StatusCode.OK

    @blueprint.route("/available-nodes")
    def nodes():
        return [node(context).get_definition() for node in NODES], StatusCode.OK

    return blueprint
