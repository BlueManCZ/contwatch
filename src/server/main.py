#!/usr/bin/env python3
import json
from signal import signal, SIGINT

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

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
    print("Starting Contwatch...")

    signal(SIGINT, _quit_handler)

    app = Flask(__name__)
    app.config.from_object(ApplicationConfig)
    app.url_map.converters["int_list"] = IntListConverter
    app.url_map.strict_slashes = False
    cors = CORS(app, supports_credentials=True)
    socketio = SocketIO(app, cors_allowed_origins="*")

    config = {}
    # Try to load the configuration from the file
    try:
        with open("config.json", "r") as file:
            config = json.load(file)
    except FileNotFoundError:
        print("Configuration file not found. Using default configuration.")

    # Database initialization
    print("Initializing database...")
    init_database(config.get("database", {}))

    # HandlerManager initialization
    manager = HandlerManager(socketio)
    registered_modules.add(manager)

    # Blueprints registration
    print("Registering blueprints...")
    for name, blueprint in blueprints.items():
        app.register_blueprint(blueprint(Context(manager, socketio)), url_prefix=f"/api/core/{name}")

    print("Starting Socketio server...")
    socketio.run(app, host="0.0.0.0", debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
