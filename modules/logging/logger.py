import logging
import logging.handlers

from modules import settings


def logger(name=None):
    formatter = logging.Formatter(
        "%(asctime)s - %(threadName)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.handlers.RotatingFileHandler(
        filename=settings.LOG_FILE,
        mode="a",
        maxBytes=settings.LOG_FILE_MAX_BYTES,
        backupCount=settings.LOG_FILE_BACKUP_COUNT,
    )

    handler.setFormatter(formatter)

    logger_object = logging.getLogger(name)
    logger_object.setLevel(settings.LOG_LEVEL)
    logger_object.addHandler(handler)

    return logger_object
