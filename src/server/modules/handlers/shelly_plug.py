from modules.handlers import HttpHandler


class ShellyPlugHandler(HttpHandler):
    """Handler for Shelly Plug"""

    type = "shelly_plug"
    icon = "powerplug"
    name = "Shelly Plug"
    handler_actions = {
        "turn_on": {
            "description": "Turn on",
            "destination": "/relay/0",
            "params": {"turn": "on"},
        },
        "turn_off": {
            "description": "Turn off",
            "destination": "/relay/0",
            "params": {"turn": "off"},
        },
    }
