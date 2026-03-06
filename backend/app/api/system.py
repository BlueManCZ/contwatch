import platform
import socket
from datetime import UTC, datetime
from pathlib import Path

import psutil
from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.dependencies import CurrentUser, DbSession, HandlerManagerDep
from app.socketio_app import sio
from app.utils.network import get_lan_ip

router = APIRouter(prefix="/system", tags=["system"])

_process = psutil.Process()
_is_docker = Path("/.dockerenv").exists()
_host_hostname_file = Path("/etc/host_hostname")


def _get_hostname() -> str:
    if _is_docker and _host_hostname_file.is_file():
        name = _host_hostname_file.read_text().strip()
        if name:
            return name
    return socket.gethostname()


class SystemStats(BaseModel):
    started_at: datetime
    uptime_seconds: int
    version: str
    host_ip: str
    hostname: str
    is_docker: bool
    os_info: str
    arch: str
    python_version: str
    cpu_percent: float
    memory_bytes: int
    db_size_bytes: int
    socketio_clients: int
    data_points_total: int
    data_points_today: int
    oldest_data_point: datetime | None
    handlers_running: int
    handlers_connected: int
    handlers_total: int
    attributes_total: int
    last_message_at: datetime | None


@router.get("/ip")
async def get_host_ip(_current_user: CurrentUser) -> dict[str, str]:
    return {"ip": get_lan_ip()}


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    request: Request,
    db: DbSession,
    manager: HandlerManagerDep,
    _current_user: CurrentUser,
) -> SystemStats:
    now = datetime.now(UTC)
    started_at: datetime = request.app.state.started_at
    uptime = now - started_at

    mem_info = _process.memory_info()
    cpu = _process.cpu_percent()

    row = (
        await db.execute(
            text("""
                SELECT
                    pg_database_size(current_database()) AS db_size,
                    (SELECT approximate_row_count('data_units')) AS total,
                    (SELECT count(*) FROM data_units WHERE timestamp >= :today) AS today,
                    (SELECT min(timestamp) FROM data_units) AS oldest,
                    (SELECT count(*) FROM handlers) AS handlers_total,
                    (SELECT count(*) FROM attributes) AS attrs_total
            """),
            {"today": now.replace(hour=0, minute=0, second=0, microsecond=0)},
        )
    ).one()

    # Handler runtime stats from in-memory state
    statuses = manager.get_all_handler_statuses()
    handlers_running = sum(1 for s in statuses.values() if s["running"])
    handlers_connected = sum(1 for s in statuses.values() if s["connected"])

    # Find most recent message across all handlers
    last_message: datetime | None = None
    for status in statuses.values():
        if status["last_active"] and (last_message is None or status["last_active"] > last_message):
            last_message = status["last_active"]

    return SystemStats(
        started_at=started_at,
        uptime_seconds=int(uptime.total_seconds()),
        version=request.app.version,
        host_ip=get_lan_ip(),
        hostname=_get_hostname(),
        is_docker=_is_docker,
        os_info=f"{platform.system()} {platform.release()}",
        arch=platform.machine(),
        python_version=platform.python_version(),
        cpu_percent=round(cpu, 1),
        memory_bytes=mem_info.rss,
        db_size_bytes=row.db_size,
        socketio_clients=len(sio.manager.rooms.get("/", {}).get(None, {})),
        data_points_total=row.total or 0,
        data_points_today=row.today or 0,
        oldest_data_point=row.oldest,
        handlers_running=handlers_running,
        handlers_connected=handlers_connected,
        handlers_total=row.handlers_total,
        attributes_total=row.attrs_total,
        last_message_at=last_message,
    )
