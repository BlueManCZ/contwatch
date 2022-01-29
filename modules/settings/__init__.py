from importlib.util import module_from_spec, spec_from_file_location
from os import getenv, path
from .defaults import *


def load_settings(filename):
    spec = spec_from_file_location("settings", filename)
    settings_var = module_from_spec(spec)
    spec.loader.exec_module(settings_var)
    return settings_var


def import_settings():
    home = getenv("HOME")

    module_path = home + "/.config/contwatch/settings.py"

    if path.isfile(module_path):
        print("Settings file:", module_path)
        return load_settings(module_path)

    module_path = path.abspath(REAL_PATH + "/../../settings.py")

    if path.isfile(module_path):
        print("Settings file:", module_path)
        return load_settings(module_path)

    return


REAL_PATH = path.dirname(path.realpath(__file__))

# Read user settings

user_settings = import_settings()
if user_settings:
    globals().update(user_settings.__dict__)
else:
    print("Settings file: Not found. Using default settings.")

# Tweaks
if not path.isabs(DB_SQLITE_FILE):
    DB_SQLITE_FILE = path.abspath(REAL_PATH + "/../../" + DB_SQLITE_FILE)

print("Database type:", DB_TYPE)
if DB_TYPE == "sqlite":
    print("Database file:", DB_SQLITE_FILE)
print("Log file:", LOG_FILE)
print("Web server:", f"{WEB_SERVER_ADDRESS}:{WEB_SERVER_PORT}")
print("Async cache:", CACHING_ASYNC)
print()
