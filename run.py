#!/usr/bin/env python3

from eventlet import monkey_patch
monkey_patch()

from modules import settings
from modules.database import database
from modules.logging.logger import logger
from modules.engine.handler_manager import HandlerManager
from modules.web_server.flask_web_server import FlaskWebServer

from os import path, remove
from signal import signal, SIGINT

registered_modules = []


def register_modules(*modules):
    for module in modules:
        registered_modules.append(module)


def _quit_handler(_, __):
    """Handler for exit signal."""
    print("\nSIGINT signal detected. Exiting")
    for module in registered_modules:
        module.exit()


if __name__ == "__main__":

    signal(SIGINT, _quit_handler)

    # TODO: For temporary debug clarity only
    if path.isfile(settings.LOG_FILE):
        remove(settings.LOG_FILE)

    log = logger("Main")
    log.info("Starting application")

    # Initialize main modules
    db = database.Database()
    manager = HandlerManager(db)
    web = FlaskWebServer(manager, db)

    # Register modules for SIGINT handler
    register_modules(db, manager, web)

    # Wait for the manager thread to end
    manager.thread.join()
