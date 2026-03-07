import socket


def get_lan_ip() -> str:
    """Return the LAN IP address of this machine, or 127.0.0.1 on failure."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
