class Message:
    """Class representing message received or sent to handlers"""

    def __init__(self, json):
        self._json = json

    def text(self):
        return str(self._json)

    def json(self):
        return self._json
