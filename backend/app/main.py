import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import app.handlers
from app.api.router import api_router
from app.config import settings
from app.database import async_session_factory
from app.limiter import limiter
from app.services.handler_manager import HandlerManager
from app.socketio_app import sio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start handler manager
    manager = HandlerManager(async_session_factory)
    app.state.handler_manager = manager
    await manager.startup()

    yield

    await manager.shutdown()


def create_app() -> FastAPI:
    app = FastAPI(
        title="ContWatch API",
        version="2.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.include_router(api_router, prefix="/api")

    if not settings.debug and not settings.turnstile_secret_key:
        logger.warning("TURNSTILE_SECRET_KEY is not set — login CAPTCHA verification is disabled")

    return app


app = create_app()
sio_asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
