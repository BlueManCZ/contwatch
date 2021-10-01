from modules.devices.device_interface import DeviceInterface
from modules.logging.logger import logger

from pony import orm

import json


class Database:
    """Class representing database instance"""

    db = orm.Database()

    class Device(db.Entity):
        """Database entity device"""

        type = orm.Required(str)
        config = orm.Required(str)

    def __init__(self):
        log = logger("Database")

        self.db.bind(provider="sqlite", filename="database.sqlite", create_db=True)
        self.db.generate_mapping(create_tables=True)

        log.info("Database initialized")

    @orm.db_session
    def add_device(self, device: DeviceInterface):
        json_config = json.dumps(device.config)
        return self.Device(type=device.type, config=json_config)

    @orm.db_session
    def get_devices(self):
        return orm.select(d for d in self.Device)[:]
