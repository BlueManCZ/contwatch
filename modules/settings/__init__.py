from importlib.util import module_from_spec, spec_from_file_location
from os import getenv, path


def load_settings(filename):
    spec = spec_from_file_location("settings", filename)
    settings_var = module_from_spec(spec)
    spec.loader.exec_module(settings_var)
    return settings_var


def import_settings():
    home = getenv("HOME")

    module_path = home + "/.config/contwatch/settings.py"

    if path.isfile(module_path):
        print("Settings file:\t", module_path)
        return load_settings(module_path)

    module_path = path.abspath(REAL_PATH + "/../../settings.py")

    if path.isfile(module_path):
        print("Settings file:\t", module_path)
        return load_settings(module_path)

    return


def get_setting(name, default):
    if "settings" in globals():
        return getattr(settings, name) if hasattr(settings, name) else default
    else:
        return default


REAL_PATH = path.dirname(path.realpath(__file__))

# Read settings or set default values

settings = import_settings()

if not settings:
    print("Settings file:\t Not found")


# Logging
LOG_FILE = path.abspath(get_setting("LOG_FILE", "contwatch.log"))
LOG_FILE_MAX_BYTES = get_setting("LOG_FILE_MAX_BYTES", 51200)
LOG_FILE_BACKUP_COUNT = get_setting("LOG_FILE_BACKUP_COUNT", 5)
LOG_LEVEL = get_setting("LOG_LEVEL", "DEBUG")

# Database
DATABASE_FILE = get_setting("DATABASE_FILE", "database.sqlite")

# Web server
WEB_SERVER_ADDRESS = get_setting("WEB_SERVER_ADDRESS", "0.0.0.0")
WEB_SERVER_PORT = get_setting("WEB_SERVER_PORT", 80)

# Cache
CACHE_INTERVAL_MINUTES = get_setting("CACHE_INTERVAL_MINUTES", 10)
CACHE_ASYNC = get_setting("CACHE_ASYNC", False)

# Tweaks
if not path.isabs(DATABASE_FILE):
    DATABASE_FILE = path.abspath(REAL_PATH + "/../../" + DATABASE_FILE)

print("Database file:\t", DATABASE_FILE)
print("Log file:\t\t", LOG_FILE)
print()
