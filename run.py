#!/usr/bin/env python3

from modules.database import database
from modules.logging.logger import logger
from modules.managers.device_manager import DeviceManager
from modules.web_frontend.flask_frontend import FlaskFrontend

from signal import signal, SIGINT
from os import path, remove

registered_modules = []


def register_module(module):
    registered_modules.append(module)


def _quit_handler(_, __):
    """Handler for exit signal."""
    for module in registered_modules:
        module.exit()
    log.info("Quiting application")


if __name__ == "__main__":

    signal(SIGINT, _quit_handler)

    # TODO: For temporary debug clarity only
    if path.isfile("contwatch.log"):
        remove("contwatch.log")

    log = logger("Main")
    log.info("Starting application")

    # Initialize main modules
    db = database.Database()
    manager = DeviceManager(db)
    web = FlaskFrontend("0.0.0.0", 5000, manager, db)

    register_module(db)
    register_module(manager)
    register_module(web)
