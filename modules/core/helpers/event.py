from modules.core.helpers.message import Message


def create_event(label, payload):
    message = {
        "type": "event",
        "label": label,
        "payload": payload,
    }
    return EventMessage(message)


class EventMessage(Message):
    """Class representing event message received or sent to handlers"""

    def __init__(self, json):
        super().__init__(json)

    def is_valid(self):
        json = self.json()
        return (
            "type" in json
            and json["type"] == "event"
            and "label" in json
            and "payload" in json
        )

    def get_label(self):
        return self.json()["label"]

    def get_payload(self):
        return self.json()["payload"]
