class DataManager:
    """Handles data processing. It is a subpart of DeviceManager"""

    def __init__(self, database):
        self.database = database

    def add_data_unit(self, label, data, handler):
        self.database.add_data_unit(label, float(data), handler)

    def add_event_unit(self, event, handler, incoming=True):
        self.database.add_event_unit(event, handler, incoming)
