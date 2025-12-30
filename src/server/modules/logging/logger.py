import logging

from modules.utils import color_print, Color


class LoggingLevel:
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class Logger:
    """Class for application-wide logging"""

    level_colors = {
        LoggingLevel.DEBUG: Color.PINK,
        LoggingLevel.INFO: Color.GREEN,
        LoggingLevel.WARNING: Color.ORANGE,
        LoggingLevel.ERROR: Color.RED,
        LoggingLevel.CRITICAL: Color.BOLD + Color.RED,
    }

    def __init__(self, source: str, log_file: str = "app.log"):
        self.source = source
        self.log_file = log_file

        # Setup standard logging for file output
        self._file_logger = logging.getLogger(source)
        if not self._file_logger.handlers:
            self._file_logger.setLevel(logging.DEBUG)
            handler = logging.FileHandler(self.log_file)
            formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
            handler.setFormatter(formatter)
            self._file_logger.addHandler(handler)

        self.info = self._generic_msg(LoggingLevel.INFO)
        self.debug = self._generic_msg(LoggingLevel.DEBUG)
        self.warning = self._generic_msg(LoggingLevel.WARNING)
        self.error = self._generic_msg(LoggingLevel.ERROR)
        self.critical = self._generic_msg(LoggingLevel.CRITICAL)

    def _generic_msg(self, level: str):
        def function(message: str, payload: dict = None):
            color = self.level_colors[level]
            color_print(f"[{level.upper()}] {self.source}: {message}", color)

            log_method = getattr(self._file_logger, level.lower())
            log_msg = f"{message} | Payload: {payload}" if payload else message
            log_method(log_msg)

            if payload:
                for title, payload in payload.items():
                    color_print(f"payload.{title}: {payload}", Color.GREY)

        return function
