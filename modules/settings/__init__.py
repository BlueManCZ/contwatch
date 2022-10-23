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
        info.append(f"Settings file: {module_path}")
        return load_settings(module_path)

    module_path = path.abspath(REAL_PATH + "/../../settings.py")

    if path.isfile(module_path):
        info.append(f"Settings file: {module_path}")
        return load_settings(module_path)

    return


def print_info():
    print("\n".join(info) + "\n")


info = []

REAL_PATH = path.dirname(path.realpath(__file__))

# Read user settings

user_settings = import_settings()
if user_settings:
    globals().update(user_settings.__dict__)
else:
    info.append("Settings file: Not found. Using default settings.")

# Tweaks
if not path.isabs(DB_SQLITE_FILE):
    DB_SQLITE_FILE = path.abspath(REAL_PATH + "/../../" + DB_SQLITE_FILE)

info.append(f"Database type: {DB_TYPE}")
if DB_TYPE == "sqlite":
    info.append(f"Database file: {DB_SQLITE_FILE}")
info.append(f"Log file: {LOG_FILE}")
info.append(f"Web server: http://{WEB_SERVER_ADDRESS}:{WEB_SERVER_PORT}")
info.append(f"Async cache: {CACHING_ASYNC}")
