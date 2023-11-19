#!/usr/bin/env python3

from signal import signal, SIGINT

from flask import Flask
from flask_cors import CORS

from config import ApplicationConfig
from modules.blueprints import blueprints
from modules.database import init_database
from modules.handler_manager import HandlerManager
from modules.utils import Context, ModulesRegistrator, IntListConverter

registered_modules = ModulesRegistrator()


def _quit_handler(_, __):
    """Handler for exit signal."""
    print("\nSIGINT signal detected. Exiting")
    _quit()


def _quit():
    registered_modules.exit()
    quit()


if __name__ == "__main__":
    signal(SIGINT, _quit_handler)

    app = Flask(__name__)
    app.config.from_object(ApplicationConfig)
    app.url_map.converters["int_list"] = IntListConverter
    cors = CORS(app, supports_credentials=True)

    # Database initialization
    init_database()
    # HandlerManager initialization
    manager = HandlerManager()
    registered_modules.add(manager)

    # Blueprints registration
    for name, blueprint in blueprints.items():
        app.register_blueprint(blueprint(Context(manager)), url_prefix=f"/api/core/{name}")
    app.run(host="0.0.0.0", debug=True, use_reloader=False)
