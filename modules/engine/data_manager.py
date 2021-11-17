class DataManager:
    """Handles data processing. It is a subpart of DeviceManager"""

    def __init__(self, database):
        self.database = database

    def add_data_unit(self, label, data, device_id):
        self.database.add_data_unit(label, float(data), device_id)
