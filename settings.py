# ContWatch configuration settings file

# File lookup takes place in the following order:
#  1) ~/.config/contwatch/settings.py
#  2) project-root/settings.py


# ----| LOGGING |----

# Absolute or relative path to log file
# Relative path is relative to the project root.
# Default: "contwatch.log"
LOG_FILE = "contwatch.log"

# Maximum log file size in bytes
# Default: 51200
LOG_FILE_MAX_BYTES = 51200

# Number of maximum backup log files
# Default: 5
LOG_FILE_BACKUP_COUNT = 5

# Logging level
# For more information see: https://docs.python.org/3/library/logging.html#logging-levels
# Default: "DEBUG"
LOG_LEVEL = "DEBUG"


# ----| DATABASE |----

# Absolute or relative path to database file
# Relative path is relative to the project root.
# Default: "database.sqlite"
DATABASE_FILE = "database.sqlite"


# ----| WEB SERVER |----

# Web server address
# Default: "0.0.0.0"
WEB_SERVER_ADDRESS = "0.0.0.0"

# Web server port
# Default: 80
WEB_SERVER_PORT = 80

# Enable debug mode for web server. Do not use it in a production deployment.
# Default: False
WEB_SERVER_DEBUG = False


# ----| CACHING | ----

# Caching interval in minutes
# Cache is stored in RAM.
# 0 means caching is disabled.
# Default: 10
CACHING_INTERVAL = 10

# Asynchronous caching
# Cache data will be refreshed asynchronously every CACHING_INTERVAL minutes.
# With async caching enabled you can get better response time on slower hardware.
# Default: False
CACHING_ASYNC = False
