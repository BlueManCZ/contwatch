from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.utils.network import get_lan_ip

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/ip")
async def get_host_ip(_current_user: CurrentUser) -> dict[str, str]:
    return {"ip": get_lan_ip()}
