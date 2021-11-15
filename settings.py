# ContWatch configuration settings file

# File lookup takes place in the following order:
#  1) ~/.config/contwatch/settings.py
#  2) project-root/settings.py


# ----| LOGGING |----

# Absolute or relative path to log file
# Relative path is relative to project root
# Default: "contwatch.log"
LOG_FILE = "contwatch.log"

# Maximum log file size in bytes
# Default: 51200
LOG_FILE_MAX_BYTES = 51200

# Number of maximum backup log files
# Default: 5
LOG_FILE_BACKUP_COUNT = 5

# Logging level
# Default: "DEBUG"
# For more information see: https://docs.python.org/3/library/logging.html#logging-levels
LOG_LEVEL = "DEBUG"


# ----| DATABASE |----

# Absolute or relative path to database file
# Relative path is relative to project root
# Default: "database.sqlite"
DATABASE_FILE = "database.sqlite"


# ----| WEB SERVER |----

# Web server address
# Default: "0.0.0.0"
WEB_SERVER_ADDRESS = "0.0.0.0"

# Web server port
# Default: 80
WEB_SERVER_PORT = 80
