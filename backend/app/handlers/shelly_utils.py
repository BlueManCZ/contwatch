from app.handlers.base import Indicator


def is_on(value: object) -> bool:
    """Coerce a Shelly relay/output value to bool."""
    return str(value).lower() == "true"


def wifi_indicator(rssi: int) -> Indicator:
    """Build a WiFi signal indicator from RSSI (dBm)."""
    if rssi >= -50:
        return Indicator(icon="wifi", color="success", tooltip=f"WiFi: {rssi} dBm")
    if rssi >= -70:
        return Indicator(icon="wifi-high", color="warning", tooltip=f"WiFi: {rssi} dBm")
    return Indicator(icon="wifi-low", color="destructive", tooltip=f"WiFi: {rssi} dBm")


def wifi_disconnected_indicator() -> Indicator:
    """Indicator shown when a Shelly device loses connection."""
    return Indicator(icon="wifi-off", color="destructive", tooltip="Disconnected")
