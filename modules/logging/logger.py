import modules.logging.logger_settings as settings

import logging
import logging.handlers


def logger(name=None):
    formatter = logging.Formatter(
        '%(asctime)s - %(threadName)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S')

    handler = logging.handlers.RotatingFileHandler(
        filename=settings.LOG_FILE,
        mode='a',
        maxBytes=settings.MAX_BYTES,
        backupCount=settings.MAX_BACKUP_COUNT
    )

    handler.setFormatter(formatter)

    logger_object = logging.getLogger(name)
    logger_object.setLevel(settings.LEVEL)
    logger_object.addHandler(handler)

    return logger_object
