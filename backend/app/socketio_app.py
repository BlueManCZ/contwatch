import logging

import jwt
import socketio
from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.user import User

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=[])


async def emit_mutate(*entities: str) -> None:
    """Emit mutation invalidation events for one or more entity types."""
    for entity in entities:
        await sio.emit("mutate", {"entity": entity})


@sio.event
async def connect(sid, environ, auth):
    token = auth.get("token") if auth else None
    if not token:
        raise ConnectionRefusedError("Missing token")
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as err:
        raise ConnectionRefusedError("Invalid token") from err

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise ConnectionRefusedError("User not found or inactive")

    await sio.save_session(sid, {"user_id": user_id})
    logger.info("Socket.IO client connected: %s (user_id=%s)", sid, user_id)
    await emit_mutate("system")


@sio.event
async def disconnect(sid):
    logger.info("Socket.IO client disconnected: %s", sid)
    await emit_mutate("system")


@sio.event
async def workflow_edge_debug(sid, data):
    from app.nodes.base import AbstractNode

    enabled = bool(data.get("enabled")) if isinstance(data, dict) else False
    AbstractNode.edge_debug = enabled
    logger.info("Workflow edge debug %s by %s", "enabled" if enabled else "disabled", sid)
