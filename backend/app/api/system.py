import socket

from fastapi import APIRouter

from app.dependencies import CurrentUser

router = APIRouter(prefix="/system", tags=["system"])


def _get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


@router.get("/ip")
async def get_host_ip(_current_user: CurrentUser) -> dict[str, str]:
    return {"ip": _get_lan_ip()}
