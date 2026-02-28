import logging

import jwt
import socketio

from app.config import settings

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=[])


@sio.event
async def connect(sid, environ, auth):
    token = auth.get("token") if auth else None
    if not token:
        raise ConnectionRefusedError("Missing token")
    try:
        jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError as err:
        raise ConnectionRefusedError("Invalid token") from err
    logger.info("Socket.IO client connected: %s", sid)


@sio.event
async def disconnect(sid):
    logger.info("Socket.IO client disconnected: %s", sid)
