from app.handlers.base import Indicator


def is_on(value: object) -> bool:
    """Coerce a Shelly relay/output value to bool."""
    return str(value).lower() == "true"


def wifi_indicator(rssi: int) -> Indicator:
    """Build a WiFi signal indicator from RSSI (dBm)."""
    params = {"rssi": str(rssi)}
    if rssi >= -50:
        return Indicator(icon="wifi", color="success", tooltip_key="indicators.wifi", tooltip_params=params)
    if rssi >= -70:
        return Indicator(icon="wifi-high", color="warning", tooltip_key="indicators.wifi", tooltip_params=params)
    return Indicator(icon="wifi-low", color="destructive", tooltip_key="indicators.wifi", tooltip_params=params)


def wifi_disconnected_indicator() -> Indicator:
    """Indicator shown when a Shelly device loses connection."""
    return Indicator(icon="wifi-off", color="destructive", tooltip_key="indicators.disconnected")
