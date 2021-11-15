from modules import settings
from modules.devices.device_interface import DeviceInterface
from modules.logging.logger import logger

from datetime import datetime
from pony import orm


db = orm.Database()


class Device(db.Entity):
    """Database entity for storing device configuration"""

    type = orm.Required(str)
    settings = orm.Required(orm.Json)
    data = orm.Set("DataUnit")


class DataUnit(db.Entity):
    """Database entity for storing data"""

    device = orm.Required(Device)
    label = orm.Required(str)
    value = orm.Required(float)
    datetime = orm.Required(datetime)


class ChartView(db.Entity):
    """Database entity for saving user defined charts"""

    label = orm.Required(str)
    settings = orm.Required(orm.Json)


class Database:
    """Class representing database instance"""

    def __init__(self):
        log = logger("Database")

        db.bind(provider="sqlite", filename=settings.DATABASE_FILE, create_db=True)
        db.generate_mapping(create_tables=True)

        log.info("Database initialized")

    ##################
    # DEVICE queries #
    ##################

    @orm.db_session
    def add_device(self, device: DeviceInterface):
        return Device(type=device.type, settings=device.settings)

    @orm.db_session
    def get_devices(self):
        return Device.select(lambda d: d)[:]

    @orm.db_session
    def get_device_by_id(self, device_id):
        return Device.select(lambda d: d.id == device_id)[:][0]

    @orm.db_session
    def update_device_settings(self, device_id, device_settings):
        device = self.get_device_by_id(device_id)
        device.settings = device_settings

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

    @orm.db_session
    def get_all_stored_attributes(self, device_id):
        return orm.select(d.label for d in DataUnit if d.device.id == device_id)[:]

    @orm.db_session
    def get_device_attribute_data(self, device_id, attribute, datetime_from: datetime, datetime_to: datetime, *_,
                                  smartround=0):
        result = orm.select(
            (d.datetime, d.value) for d in DataUnit
            if d.device.id == device_id and d.label == attribute
            and d.datetime >= datetime_from and d.datetime <= datetime_to
        )[:]

        if smartround:
            ratio = len(result) / smartround
            index = 0
            if ratio > 1:
                rounded_result = []
                while int(index) < len(result):
                    sublist = result[int(index):int(index+ratio)]
                    rounded_result.append(_smartround_avg(*sublist))
                    index += ratio
                result = rounded_result[:smartround]

        return result

    @orm.db_session
    def get_device_attribute_dates(self, device_id, attribute):
        return DataUnit.select(lambda d: d.device.id == device_id and d.label == attribute)

    ######################
    # CHART VIEW queries #
    ######################

    @orm.db_session
    def add_chart_view(self, label, view_settings):
        return ChartView(label=label, settings=view_settings)

    @orm.db_session
    def get_chart_views(self):
        return ChartView.select(lambda v: v)[:]

    @orm.db_session
    def get_chart_view_by_id(self, view_id):
        return ChartView.select(lambda v: v.id == view_id)[:][0]

    @orm.db_session
    def update_chart_view(self, view_id, label, view_settings):
        view = self.get_chart_view_by_id(view_id)
        view.label = label
        view.settings = view_settings

    @orm.db_session
    def delete_chart_view(self, view_id):
        view = self.get_chart_view_by_id(view_id)
        view.delete()

    def exit(self):
        pass


def _smartround_avg(*items):
    return items[-1][0], round(sum(map(lambda x: x[1], items)) / len(items), 1)
