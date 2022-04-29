#!/usr/bin/env python3

from eventlet import monkey_patch
monkey_patch()

from modules import settings
from modules.logging.logger import logger
from modules.core import HandlerManager, database
from modules.web_server.flask_web_server import FlaskWebServer

from json import dumps, load
from optparse import OptionParser
from signal import signal, SIGINT

registered_modules = []


def register_modules(*modules):
    for module in modules:
        registered_modules.append(module)


def _quit_handler(_, __):
    """Handler for exit signal."""
    print("\nSIGINT signal detected. Exiting")
    _quit()


def _quit():
    for module in registered_modules:
        module.exit()
    quit()


if __name__ == "__main__":
    signal(SIGINT, _quit_handler)

    parser = OptionParser()

    parser.add_option("-e", "--export-config",
                      action="store_true", dest="export_config", default=False,
                      help="export configuration in JSON format")

    parser.add_option("-i", "--import-config", dest="import_config",
                      help="import configuration from JSON_FILE",
                      metavar="JSON_FILE")

    (options, args) = parser.parse_args()

    log = logger("Main")
    log.info("Starting application")

    # Initialize main modules
    db = database.Database()
    manager = HandlerManager(db)

    # Register modules for SIGINT handler
    register_modules(db, manager)

    if options.export_config:
        data = manager.export_config()
        print(dumps(data, indent=4, ensure_ascii=False))
        _quit()

    if options.import_config:
        manager.delete_all()
        database.delete_tables()
        database.create_tables()
        file = open(options.import_file, "r")
        manager.import_config(load(file))
        _quit()

    settings.print_info()

    if settings.WEB_SERVER:
        web = FlaskWebServer(manager, db)
        register_modules(web)

    # Wait for the manager thread to end
    manager.thread.join()
