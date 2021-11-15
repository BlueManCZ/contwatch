#!/usr/bin/env python3

from modules import settings
from modules.database import database
from modules.logging.logger import logger
from modules.managers.device_manager import DeviceManager
from modules.web_server.flask_web_server import FlaskWebServer

from signal import signal, SIGINT
from os import path, remove

registered_modules = []


def register_modules(*modules):
    for module in modules:
        registered_modules.append(module)


def _quit_handler(_, __):
    """Handler for exit signal."""
    for module in registered_modules:
        module.exit()
    log.info("Quiting application")


if __name__ == "__main__":

    signal(SIGINT, _quit_handler)

    # TODO: For temporary debug clarity only
    if path.isfile(settings.LOG_FILE):
        remove(settings.LOG_FILE)

    log = logger("Main")
    log.info("Starting application")

    # Initialize main modules
    db = database.Database()
    manager = DeviceManager(db)
    web = FlaskWebServer(manager, db)

    register_modules(db, manager, web)
