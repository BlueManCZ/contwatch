from modules.devices.device_interface import DeviceInterface
from modules.logging.logger import logger

from datetime import datetime
from pony import orm


db = orm.Database()


class Device(db.Entity):
    """Database entity for storing device configuration"""

    type = orm.Required(str)
    label = orm.Optional(str)
    config = orm.Required(orm.Json)
    data = orm.Set('DataUnit')


class DataUnit(db.Entity):
    """Database entity for storing data"""

    device = orm.Required(Device)
    label = orm.Required(str)
    value = orm.Required(float)
    datetime = orm.Required(datetime)


class Database:
    """Class representing database instance"""

    def __init__(self):
        log = logger("Database")

        db.bind(provider="sqlite", filename="database.sqlite", create_db=True)
        db.generate_mapping(create_tables=True)

        log.info("Database initialized")

    ##################
    # DEVICE queries #
    ##################

    @orm.db_session
    def add_device(self, device: DeviceInterface):
        return Device(type=device.type, label=device.label, config=device.config)

    @orm.db_session
    def get_devices(self):
        return Device.select(lambda d: d)[:]

    @orm.db_session
    def get_device_by_id(self, device_id):
        return Device.select(lambda d: d.id == device_id)[:][0]

    @orm.db_session
    def update_device(self, device_id, *_, label="", config=""):
        device = self.get_device_by_id(device_id)
        if config:
            device.config = config
        device.label = label

    @orm.db_session
    def delete_device(self, device_id):
        device = self.get_device_by_id(device_id)
        device.delete()

    ################
    # DATA queries #
    ################

    @orm.db_session
    def add_data_unit(self, label, value, device: Device):
        return DataUnit(label=label, value=value, device=device, datetime=datetime.now())
