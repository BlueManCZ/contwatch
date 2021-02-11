import logging.handlers
import os


class SyslogBOMFormatter(logging.Formatter):
    def format(self, record):
        result = super().format(record)
        return result


handler = logging.handlers.SysLogHandler('/dev/log')
formatter = SyslogBOMFormatter(logging.BASIC_FORMAT)
handler.setFormatter(formatter)
root = logging.getLogger()
root.setLevel(os.environ.get('LOGLEVEL', 'INFO'))
root.addHandler(handler)

logging.info('Some info message to /var/log/syslog')
