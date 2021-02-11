import logging
import logging.handlers

LOG_FILE = 'contwatch.log'  # TODO: Implement settings module
LEVEL = 'DEBUG'
MAX_BYTES = 50*1024
MAX_BACKUP_COUNT = 3


def logger(name=None):
    formatter = logging.Formatter(
        '%(asctime)s - %(threadName)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S')

    handler = logging.handlers.RotatingFileHandler(
        filename=LOG_FILE,
        mode='a',
        maxBytes=MAX_BYTES,
        backupCount=MAX_BACKUP_COUNT
    )

    handler.setFormatter(formatter)

    logger_object = logging.getLogger(name)
    logger_object.setLevel(LEVEL)
    logger_object.addHandler(handler)

    return logger_object
